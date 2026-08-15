// ============================================================
//  🤖 AI CHAT GEMBALA — panel BARU, khusus level administrator/
//  penatua/gembala distrik/gembala (lihat CONFIG.AI_CHAT_LEVELS).
//
//  Cara kerja singkat:
//   1) Pertanyaan gembala dipakai untuk MENCARI ayat & catatan yang
//      relevan dari data Alkitab yang SUDAH tersimpan lokal di
//      perangkat (pakai fungsi pencarian yang sama dengan kotak cari
//      utama, js/app.js -> runKeywordSearch()).
//   2) Ayat/catatan yang ketemu itu dikirim sebagai "konteks" ke
//      backend (apps-script/AiChatCode.gs), BUKAN seluruh Alkitab.
//   3) Backend memberi instruksi ke AI: jawab HANYA dari konteks itu,
//      KECUALI kalau tombol "🌐 Izinkan referensi luar" dinyalakan.
//   4) Jawaban tampil di layar dengan tombol salin untuk pertanyaan
//      maupun jawaban.
// ============================================================

const AiChatSync = {
  enabled() {
    return !!(CONFIG.AI_CHAT_APPS_SCRIPT_URL && CONFIG.AI_CHAT_APPS_SCRIPT_URL.indexOf("http") === 0);
  },
  async ask({ username, question, context, allowExternal, history }) {
    const res = await fetch(CONFIG.AI_CHAT_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ type: "ai_chat", username, question, context, allowExternal, history }),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  },
};

function isAiChatAllowed() {
  const allowed = CONFIG.AI_CHAT_LEVELS || CONFIG.CURHAT_GEMBALA_LEVELS || [];
  return (currentUserLevels || []).some((l) => allowed.includes(l));
}

// Pisah pertanyaan jadi kata kunci (buang kata sambung pendek yang umum
// dalam Bahasa Indonesia supaya pencarian tidak "kebanjiran" hasil yang
// tidak relevan), lalu cari ayat & catatan yang cocok dengan tiap kata
// kunci memakai mesin pencari yang SAMA dengan kotak cari utama aplikasi.
const AI_CHAT_STOPWORDS = new Set([
  "yang", "dan", "atau", "di", "ke", "dari", "untuk", "dengan", "apa", "apa itu",
  "bagaimana", "kenapa", "mengapa", "adalah", "itu", "ini", "saya", "aku", "kita",
  "tentang", "bisa", "boleh", "tolong", "coba", "jelaskan", "apakah", "dalam", "pada",
  "seperti", "juga", "akan", "sudah", "belum", "tidak", "bukan", "kalau", "jika",
]);

function extractAiChatKeywords(question) {
  return question
    .toLowerCase()
    .replace(/[?.,!;:"'()]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !AI_CHAT_STOPWORDS.has(w))
    .slice(0, 6); // maksimal 6 kata kunci supaya tidak terlalu banyak panggilan pencarian
}

function gatherAiChatContext(question) {
  const keywords = extractAiChatKeywords(question);
  if (!keywords.length) return { verses: [], notes: [] };

  const seenVerse = new Set();
  const seenNote = new Set();
  const verses = [];
  const notes = [];

  keywords.forEach((kw) => {
    if (verses.length >= 10 && notes.length >= 6) return;
    const { verseResults, noteResults } = runKeywordSearch(kw, currentLang || "__all__", "both", "__all__", "normal");
    verseResults.forEach((v) => {
      if (verses.length >= 10) return;
      const key = v.lang + "_" + v.id;
      if (seenVerse.has(key)) return;
      seenVerse.add(key);
      const book = BOOKS.find((b) => b.num === v.bookNumber);
      verses.push({ ref: `${v.bookName || (book ? book.name : "")} ${v.chapter}:${v.verse}`, text: v.text });
    });
    noteResults.forEach((n) => {
      if (notes.length >= 6) return;
      if (seenNote.has(n.verseId)) return;
      seenNote.add(n.verseId);
      const ref = n.verse ? `${n.verse.bookName} ${n.verse.chapter}:${n.verse.verse}` : n.verseId;
      notes.push({ ref, text: n.note });
    });
  });

  return { verses, notes };
}

const _aiChatState = { allowExternal: false, history: [], busy: false };

async function showAiChatPanel() {
  hideAllPanels();
  el("aiChatPanel").hidden = false;
  logActivity("AI Chat Gembala");
  renderAiChatPanel();
}

function renderAiChatPanel() {
  const container = el("aiChatPanel");
  container.innerHTML = "";

  const title = document.createElement("h2");
  title.textContent = "🤖 AI Chat Gembala";
  container.appendChild(title);

  if (!isAiChatAllowed()) {
    const p = document.createElement("p");
    p.className = "media-empty";
    p.textContent = "Menu ini hanya untuk level administrator/penatua/gembala distrik/gembala.";
    container.appendChild(p);
    return;
  }
  if (!AiChatSync.enabled()) {
    const p = document.createElement("p");
    p.className = "media-empty";
    p.textContent = "Fitur ini belum diaktifkan. Isi dulu CONFIG.AI_CHAT_APPS_SCRIPT_URL di js/config.js (lihat cara pasang di apps-script/AiChatCode.gs).";
    container.appendChild(p);
    return;
  }

  const intro = document.createElement("p");
  intro.className = "media-empty";
  intro.textContent = "Bertanya seputar ayat/kebenaran firman. Sumber jawaban diambil dari ayat & catatan di aplikasi ini terlebih dahulu.";
  container.appendChild(intro);

  const toggleRow = document.createElement("label");
  toggleRow.className = "curhat-public-toggle ai-chat-toggle";
  toggleRow.innerHTML = `<input type="checkbox" id="aiChatExternalToggle" ${_aiChatState.allowExternal ? "checked" : ""} /> 🌐 Izinkan AI memakai referensi dari luar Alkitab/catatan aplikasi (mis. sejarah, budaya)`;
  container.appendChild(toggleRow);
  toggleRow.querySelector("input").addEventListener("change", (e) => {
    _aiChatState.allowExternal = e.target.checked;
  });

  const thread = document.createElement("div");
  thread.className = "ai-chat-thread";
  thread.id = "aiChatThread";
  container.appendChild(thread);
  renderAiChatThread(thread);

  const form = document.createElement("form");
  form.className = "ai-chat-input-row";
  form.innerHTML = `
    <textarea id="aiChatInput" rows="2" placeholder="Tulis pertanyaan Anda, mis. 'Apa kata Alkitab tentang menghadapi kekhawatiran?'" required></textarea>
    <button type="submit" class="chip-btn primary" id="aiChatSendBtn">📤 Tanya</button>
  `;
  container.appendChild(form);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (_aiChatState.busy) return;
    const textarea = el("aiChatInput");
    const question = textarea.value.trim();
    if (!question) return;
    textarea.value = "";
    await handleAiChatAsk(question);
  });
}

function renderAiChatThread(thread) {
  thread.innerHTML = "";
  if (!_aiChatState.history.length) {
    thread.innerHTML = `<p class="media-empty">Belum ada percakapan. Mulai dengan mengetik pertanyaan di bawah.</p>`;
    return;
  }
  _aiChatState.history.forEach((turn, idx) => {
    const bubble = document.createElement("div");
    bubble.className = "ai-chat-bubble ai-chat-bubble-" + (turn.role === "ai" ? "ai" : "user");
    const label = turn.role === "ai" ? "🤖 AI" : "🙋 Anda";
    bubble.innerHTML = `
      <div class="ai-chat-bubble-head">
        <span>${label}</span>
        <button type="button" class="chip-btn small ai-chat-copy-btn" data-idx="${idx}">📋 Salin</button>
      </div>
      <div class="ai-chat-bubble-text">${escapeHtml(turn.text).replace(/\n/g, "<br>")}</div>
      ${turn.sources && turn.sources.length ? `
        <details class="ai-chat-sources">
          <summary>📖 ${turn.sources.length} sumber yang dipakai</summary>
          <ul>${turn.sources.map((s) => `<li><strong>${escapeHtml(s.ref)}</strong> — ${escapeHtml(s.text)}</li>`).join("")}</ul>
        </details>
      ` : ""}
    `;
    bubble.querySelector(".ai-chat-copy-btn").addEventListener("click", () => {
      navigator.clipboard.writeText(turn.text).then(() => {
        const btn = bubble.querySelector(".ai-chat-copy-btn");
        const old = btn.textContent;
        btn.textContent = "✅ Tersalin";
        setTimeout(() => { btn.textContent = old; }, 1200);
      }).catch(() => alert("Gagal menyalin. Salin manual dari layar."));
    });
    thread.appendChild(bubble);
  });
  thread.scrollTop = thread.scrollHeight;
}

async function handleAiChatAsk(question) {
  _aiChatState.busy = true;
  _aiChatState.history.push({ role: "user", text: question });
  const thread = el("aiChatThread");
  renderAiChatThread(thread);
  const loading = document.createElement("p");
  loading.className = "media-empty ai-chat-loading";
  loading.textContent = "🤖 Mencari ayat/catatan terkait & menyusun jawaban…";
  thread.appendChild(loading);

  const sendBtn = el("aiChatSendBtn");
  if (sendBtn) sendBtn.disabled = true;

  try {
    const context = gatherAiChatContext(question);
    const data = await AiChatSync.ask({
      username: currentUser,
      question,
      context,
      allowExternal: _aiChatState.allowExternal,
      history: _aiChatState.history.slice(0, -1).map((h) => ({ role: h.role, text: h.text })),
    });
    if (!data || !data.ok) {
      throw new Error((data && data.error) || "Gagal mendapat jawaban dari AI");
    }
    _aiChatState.history.push({
      role: "ai",
      text: data.answer,
      sources: [].concat(context.verses || [], context.notes || []),
    });
  } catch (err) {
    _aiChatState.history.push({ role: "ai", text: "⚠️ Terjadi kesalahan: " + String(err.message || err) });
  } finally {
    _aiChatState.busy = false;
    if (sendBtn) sendBtn.disabled = false;
    renderAiChatThread(el("aiChatThread"));
  }
}
