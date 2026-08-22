// ============================================================
//  🔎 VERIFIKASI BAHASA AYAT — alat bantu untuk memindai SELURUH data 
//  Alkitab yang sudah tersimpan lokal di perangkat (semua 8 kode bahasa
//  di CONFIG.LANGUAGES: ind, rvind, kjv, eng, rveng, chs, chssmp, jawa),
//  lalu mengecek apakah teks pada kolom "Text" tiap baris memang cocok
//  dengan bahasa yang seharusnya sesuai kolom "Bahasa"-nya.
//
//  Contoh kasus yang ditangkap:
//   - Baris berkode "ind" (Indonesia) tapi isi teksnya ternyata Inggris.
//   - Baris berkode "eng"/"kjv"/"rveng" (Inggris) tapi isinya Indonesia.
//   - Baris berkode "chs" (Mandarin asli/tradisional) tapi aksaranya
//     ternyata Mandarin sederhana ("chssmp"), atau sebaliknya.
//   - Baris berkode "jawa" tapi isinya Indonesia biasa (atau sebaliknya).
//
//  Cara kerja: SEMUA pemindaian jalan di perangkat sendiri (tidak perlu
//  internet, tidak menyentuh server), berdasarkan:
//   1) Untuk Mandarin: hitung karakter Han (aksara) yang HANYA dipakai di
//      Mandarin sederhana vs yang HANYA dipakai di Mandarin tradisional.
//   2) Untuk Indonesia / Inggris / Jawa (sama-sama huruf Latin): hitung
//      kemunculan kata-kata umum ("kata sambung/fungsi") khas tiap bahasa.
//  Ini heuristik (perkiraan berdasar pola), BUKAN 100% akurat -- makanya
//  tiap hasil yang ditandai punya tingkat keyakinan ("sedang"/"tinggi"),
//  dan disediakan tombol "🤖 Tanya AI" per-ayat untuk minta konfirmasi
//  kedua dari Gemini (lewat backend AiChatCode.gs yang sudah ada) sebelum
//  Anda memperbaiki datanya di Google Sheet.
// ============================================================

// Kode bahasa (kolom "Bahasa" di Sheet) -> RUMPUN bahasa yang seharusnya.
// kjv/eng/rveng semua rumpun "en" (Inggris), ind/rvind semua rumpun "id"
// (Indonesia) -- karena yang mau dicek di sini adalah BAHASA-nya, bukan
// versi terjemahannya (KJV vs standar, TB vs Recovery, dst tetap dianggap
// sama-sama sah selama bahasanya benar).
const LANG_CHECK_EXPECTED_FAMILY = {
  ind: "id",
  rvind: "id",
  kjv: "en",
  eng: "en",
  rveng: "en",
  jawa: "jv",
  chs: "zh-trad",
  chssmp: "zh-simp",
};

const LANG_CHECK_FAMILY_LABEL = {
  id: "Bahasa Indonesia",
  en: "Bahasa Inggris",
  jv: "Bahasa Jawa",
  "zh-trad": "Mandarin (aksara tradisional/asli)",
  "zh-simp": "Mandarin (aksara sederhana)",
  "zh-unknown": "Mandarin (aksara sama di keduanya, tidak bisa dipastikan)",
  unknown: "tidak terdeteksi jelas",
};

// ---------------- Kata umum per bahasa (heuristik, bukan kamus lengkap) ----------------
const LC_STOP_ID = new Set([
  "yang", "dan", "itu", "ini", "untuk", "dengan", "adalah", "tidak", "akan",
  "dari", "atau", "juga", "kepada", "pada", "oleh", "allah", "tuhan", "kata",
  "seperti", "supaya", "tetapi", "karena", "maka", "sebab", "kamu", "aku",
  "engkau", "kami", "mereka", "telah", "sudah", "bukan", "jika", "kalau",
  "hendaklah", "berkata", "anak", "hari", "orang", "sebagai", "sampai",
  "sekalian", "segala", "demikian", "sesungguhnya", "berfirman", "firman",
  "kepadanya", "olehnya", "mereka", "seorang", "berkat", "dosa", "hamba",
  "raja", "negeri", "bangsa", "umat", "roh", "kudus",
]);

const LC_STOP_EN = new Set([
  "the", "and", "of", "to", "that", "in", "is", "for", "unto", "shall",
  "thou", "thy", "thee", "he", "him", "his", "lord", "god", "said", "will",
  "not", "but", "with", "was", "were", "have", "had", "hath", "which",
  "who", "them", "they", "you", "your", "this", "from", "all", "when",
  "then", "come", "came", "into", "upon", "man", "men", "son", "sons",
  "people", "land", "words", "spirit", "holy", "behold", "because", "if",
  "so", "as", "be", "are", "an", "it", "we", "i",
]);

const LC_STOP_JV = new Set([
  "lan", "kang", "iku", "ora", "wong", "iki", "ana", "kanggo", "marang",
  "supaya", "dhewe", "panjenengane", "gusti", "kabeh", "yen", "sing",
  "padha", "kaya", "saka", "menyang", "banjur", "tembung", "dina", "wektu",
  "kang", "wus", "wis", "ora", "iya", "aku", "kowe", "sira", "ingsun",
  "para", "putra", "putrane", "kagem", "amrih", "manungsa", "bapa", "anake",
  "kabeh", "sabanjure", "nadyan", "sarta", "mangkono",
]);

// Pasangan karakter Han: HANYA muncul di Mandarin sederhana / HANYA di
// tradisional (huruf indeks ke-n di kedua deret berpasangan satu sama lain).
const LC_ZH_SIMP_CHARS = "国学说门会时义万爱无来为这个们让见觉听读写语话谁对错过还从东车马鱼鸟虫树叶阳阴电气开关问应现实动静灵圣祷赐恶荣权归复远医药乐观网络图书馆华汉众兴长头页风飞龙凤亲历轻严压尽显阶际际际难验";
const LC_ZH_TRAD_CHARS = "國學說門會時義萬愛無來為這個們讓見覺聽讀寫語話誰對錯過還從東車馬魚鳥蟲樹葉陽陰電氣開關問應現實動靜靈聖禱賜惡榮權歸復遠醫藥樂觀網絡圖書館華漢眾興長頭頁風飛龍鳳親歷輕嚴壓盡顯階際際際難驗";
const LC_ZH_SIMP_ONLY = new Set(LC_ZH_SIMP_CHARS.split(""));
const LC_ZH_TRAD_ONLY = new Set(LC_ZH_TRAD_CHARS.split(""));

function lcTokenizeWords(text) {
  return (text || "").toLowerCase().match(/[a-zA-ZÀ-ÿ']+/g) || [];
}

function lcCountCJK(text) {
  return ((text || "").match(/[\u4E00-\u9FFF]/g) || []).length;
}

// Mengembalikan { family, confidence } dari sepotong teks ayat.
// family: "id" | "en" | "jv" | "zh-simp" | "zh-trad" | "zh-unknown" | "unknown"
// confidence: "rendah" | "sedang" | "tinggi"
function lcDetectFamily(text) {
  const t = text || "";
  if (lcCountCJK(t) > 0) {
    let simp = 0;
    let trad = 0;
    for (const ch of t) {
      if (LC_ZH_SIMP_ONLY.has(ch)) simp++;
      else if (LC_ZH_TRAD_ONLY.has(ch)) trad++;
    }
    if (simp === 0 && trad === 0) return { family: "zh-unknown", confidence: "rendah" };
    if (simp > trad) return { family: "zh-simp", confidence: simp - trad >= 2 ? "tinggi" : "sedang" };
    if (trad > simp) return { family: "zh-trad", confidence: trad - simp >= 2 ? "tinggi" : "sedang" };
    return { family: "zh-unknown", confidence: "rendah" };
  }

  const words = lcTokenizeWords(t);
  if (!words.length) return { family: "unknown", confidence: "rendah" };

  let idScore = 0;
  let enScore = 0;
  let jvScore = 0;
  words.forEach((w) => {
    if (LC_STOP_ID.has(w)) idScore++;
    if (LC_STOP_EN.has(w)) enScore++;
    if (LC_STOP_JV.has(w)) jvScore++;
  });

  const scores = [
    ["id", idScore],
    ["en", enScore],
    ["jv", jvScore],
  ].sort((a, b) => b[1] - a[1]);
  const [bestFamily, bestScore] = scores[0];
  const secondScore = scores[1][1];

  if (bestScore === 0) return { family: "unknown", confidence: "rendah" };
  if (bestScore < 2) return { family: bestFamily, confidence: "rendah" };
  if (bestScore - secondScore >= 2) return { family: bestFamily, confidence: "tinggi" };
  return { family: bestFamily, confidence: "sedang" };
}

// Apakah rumpun yang diharapkan vs yang terdeteksi dianggap "tidak cocok"?
// Hasil deteksi yang belum yakin (unknown / zh-unknown) TIDAK pernah
// ditandai -- lebih baik lewatkan daripada memberi banyak alarm palsu.
function lcFamiliesConflict(expected, detected) {
  if (detected === "unknown" || detected === "zh-unknown") return false;
  return expected !== detected;
}

function isLangCheckAllowed() {
  if (typeof isAdministrator === "function" && isAdministrator()) return true;
  const allowed =
    (typeof CONFIG !== "undefined" && (CONFIG.LANG_CHECK_LEVELS || CONFIG.AI_CHAT_LEVELS)) || [];
  return (typeof currentUserLevels !== "undefined" ? currentUserLevels : []).some((l) => allowed.includes(l));
}

// Memindai SELURUH bibleData (array in-memory yang sudah dimuat dari
// IndexedDB) per kelompok ~4000 baris, dengan jeda sesaat antar kelompok
// supaya browser tetap responsif walau datanya ratusan ribu baris.
async function scanLanguageMismatches(onProgress) {
  const total = bibleData.length;
  const summary = {}; // kode bahasa -> { total, flagged }
  const flagged = [];
  const batchSize = 4000;

  for (let i = 0; i < total; i += batchSize) {
    const batch = bibleData.slice(i, i + batchSize);
    batch.forEach((v) => {
      if (!summary[v.lang]) summary[v.lang] = { total: 0, flagged: 0 };
      summary[v.lang].total++;

      const expected = LANG_CHECK_EXPECTED_FAMILY[v.lang];
      if (!expected || !v.text || !v.text.trim()) return; // kode bahasa di luar 8 yang dikenal, atau teks kosong -> lewati

      const det = lcDetectFamily(v.text);
      if (det.confidence === "rendah") return;
      if (!lcFamiliesConflict(expected, det.family)) return;

      summary[v.lang].flagged++;
      flagged.push({
        lang: v.lang,
        bookNumber: v.bookNumber,
        chapter: v.chapter,
        verse: v.verse,
        bookName: v.bookName,
        text: v.text,
        expectedFamily: expected,
        detectedFamily: det.family,
        confidence: det.confidence,
      });
    });

    if (onProgress) onProgress(Math.min(i + batchSize, total), total, flagged.length);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return { summary, flagged };
}

// ------------------------------------------------------------
//  PANEL UI — menu "🔎 Verifikasi Bahasa Ayat" (khusus level yang
//  diizinkan lewat isLangCheckAllowed(), lihat CONFIG.LANG_CHECK_LEVELS)
// ------------------------------------------------------------
let _langCheckState = { summary: null, flagged: [], filterLang: "__all__", filterText: "" };

async function showLangCheckPanel() {
  hideAllPanels();
  el("langCheckPanel").hidden = false;
  if (typeof logActivity === "function") logActivity("Verifikasi Bahasa Ayat (Admin)");
  renderLangCheckPanel();
}

function renderLangCheckPanel() {
  const container = el("langCheckPanel");
  container.innerHTML = "";

  const title = document.createElement("h2");
  title.textContent = "🔎 Verifikasi Bahasa Ayat";
  container.appendChild(title);

  if (!isLangCheckAllowed()) {
    const p = document.createElement("p");
    p.className = "media-empty";
    p.textContent = "Menu ini hanya untuk level tertentu (lihat CONFIG.LANG_CHECK_LEVELS di js/config.js).";
    container.appendChild(p);
    return;
  }

  const info = document.createElement("p");
  info.className = "media-empty";
  info.innerHTML =
    "Memindai SELURUH ayat yang sudah tersimpan lokal di perangkat ini (" +
    bibleData.length.toLocaleString("id-ID") +
    " baris, 8 kode bahasa: ind, rvind, kjv, eng, rveng, chs, chssmp, jawa), mengecek apakah teks pada tiap " +
    "baris memang cocok dengan bahasa yang seharusnya (mis. kolom Indonesia tapi isinya Inggris, atau kolom " +
    "Mandarin asli tapi aksaranya ternyata sederhana). <b>Catatan:</b> ini deteksi heuristik (kata umum & jenis " +
    "aksara), bukan 100% akurat — selalu periksa manual dulu (atau tekan \"🤖 Tanya AI\" per-ayat) sebelum " +
    "memperbaiki data di Google Sheet.";
  container.appendChild(info);

  const controls = document.createElement("div");
  controls.className = "log-controls";
  controls.innerHTML = `
    <button id="langCheckScanBtn" class="chip-btn primary" type="button">🔍 Mulai Pindai</button>
    <label>Filter bahasa:
      <select id="langCheckLangFilter" class="columns-lang-select"><option value="__all__">Semua bahasa</option></select>
    </label>
    <label>Cari kitab/teks: <input type="text" id="langCheckTextFilter" placeholder="mis. Kejadian, kasih" /></label>
    <button id="langCheckCsvBtn" class="chip-btn" type="button">💾 Simpan sebagai CSV</button>
  `;
  container.appendChild(controls);

  // 🎵 Sub-menu BARU, khusus administrator (lihat js/kidungversecheck.js
  // & CONFIG.KIDUNG_VERSE_REF_LEVELS) -- beda dari pemindaian di atas
  // (yang mengecek bahasa AYAT ALKITAB), sub-menu ini mengecek syair
  // KIDUNG untuk mencari referensi ayat Alkitab yang paling mendekati.
  if (typeof isKidungVerseRefAllowed === "function" && isKidungVerseRefAllowed()) {
    const kidungVerseRow = document.createElement("div");
    kidungVerseRow.className = "log-controls";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip-btn";
    btn.textContent = "🎵 Cek Referensi Ayat Kidung (khusus Admin)";
    btn.addEventListener("click", () => showKidungVerseRefPanel());
    kidungVerseRow.appendChild(btn);
    container.appendChild(kidungVerseRow);
  }

  const langFilterSel = controls.querySelector("#langCheckLangFilter");
  (CONFIG.LANGUAGES || []).forEach((l) => {
    const opt = document.createElement("option");
    opt.value = l.code;
    opt.textContent = `${l.label} (${l.code})`;
    langFilterSel.appendChild(opt);
  });
  langFilterSel.value = _langCheckState.filterLang;

  const resultsWrap = document.createElement("div");
  resultsWrap.id = "langCheckResultsWrap";
  resultsWrap.className = "log-table-wrap";
  container.appendChild(resultsWrap);

  if (!_langCheckState.summary) {
    resultsWrap.innerHTML = `<p class="media-empty">Tekan "🔍 Mulai Pindai" untuk memulai pemeriksaan.</p>`;
  } else {
    renderLangCheckResults(resultsWrap);
  }

  controls.querySelector("#langCheckScanBtn").addEventListener("click", () => runLangCheckScan(resultsWrap));
  langFilterSel.addEventListener("change", () => {
    _langCheckState.filterLang = langFilterSel.value;
    if (_langCheckState.summary) renderLangCheckResults(resultsWrap);
  });
  controls.querySelector("#langCheckTextFilter").addEventListener("input", (e) => {
    _langCheckState.filterText = e.target.value.trim().toLowerCase();
    if (_langCheckState.summary) renderLangCheckResults(resultsWrap);
  });
  controls.querySelector("#langCheckCsvBtn").addEventListener("click", () => saveLangCheckAsCsv(_langCheckState.flagged));
}

async function runLangCheckScan(resultsWrap) {
  const totalLabel = bibleData.length.toLocaleString("id-ID");
  resultsWrap.innerHTML =
    `<p class="media-empty" id="langCheckProgressText">Memindai 0 / ${totalLabel}…</p>` +
    `<div class="progress-track"><div id="langCheckProgressFill" class="progress-fill"></div></div>`;
  const progressText = el("langCheckProgressText");
  const progressFill = el("langCheckProgressFill");

  const { summary, flagged } = await scanLanguageMismatches((done, total, foundSoFar) => {
    if (progressText) {
      progressText.textContent =
        `Memindai ${done.toLocaleString("id-ID")} / ${total.toLocaleString("id-ID")} — ` +
        `${foundSoFar.toLocaleString("id-ID")} ditemukan tidak cocok sejauh ini…`;
    }
    if (progressFill) progressFill.style.width = `${total ? Math.round((done / total) * 100) : 100}%`;
  });

  _langCheckState.summary = summary;
  _langCheckState.flagged = flagged;
  renderLangCheckResults(resultsWrap);
}

function renderLangCheckResults(wrap) {
  wrap.innerHTML = "";
  const summary = _langCheckState.summary || {};
  const flagged = _langCheckState.flagged || [];

  const summaryTable = document.createElement("table");
  summaryTable.className = "log-table";
  const summaryRows = Object.keys(summary)
    .sort()
    .map((code) => {
      const s = summary[code];
      const label = ((CONFIG.LANGUAGES || []).find((l) => l.code === code) || {}).label || code;
      const pct = s.total ? ((s.flagged / s.total) * 100).toFixed(2) : "0.00";
      return `<tr><td>${escapeHtml(label)} (${escapeHtml(code)})</td><td>${s.total.toLocaleString("id-ID")}</td><td>${s.flagged.toLocaleString("id-ID")}</td><td>${pct}%</td></tr>`;
    })
    .join("");
  summaryTable.innerHTML =
    "<thead><tr><th>Bahasa</th><th>Total ayat</th><th>Ditandai tidak cocok</th><th>%</th></tr></thead>" +
    `<tbody>${summaryRows}</tbody>`;
  wrap.appendChild(summaryTable);

  const filterLang = _langCheckState.filterLang;
  const filterText = _langCheckState.filterText;
  let list = flagged;
  if (filterLang !== "__all__") list = list.filter((f) => f.lang === filterLang);
  if (filterText) {
    list = list.filter(
      (f) => `${f.bookName || ""} ${f.text || ""}`.toLowerCase().indexOf(filterText) !== -1
    );
  }

  const count = document.createElement("p");
  count.className = "log-count";
  count.textContent = `${list.length.toLocaleString("id-ID")} ayat ditandai tidak cocok (dari ${flagged.length.toLocaleString("id-ID")} total, sesuai filter di atas).`;
  wrap.appendChild(count);

  if (!list.length) {
    const p = document.createElement("p");
    p.className = "media-empty";
    p.textContent = flagged.length ? "Tidak ada yang cocok dengan filter." : "Tidak ada ketidakcocokan bahasa yang ditemukan. 🎉";
    wrap.appendChild(p);
    return;
  }

  const shown = list.slice(0, 300);
  const canAskAi =
    typeof AiChatSync !== "undefined" &&
    AiChatSync.enabled() &&
    typeof isAiChatAllowed === "function" &&
    isAiChatAllowed();

  const table = document.createElement("table");
  table.className = "log-table";
  table.innerHTML =
    "<thead><tr><th>Bahasa (seharusnya)</th><th>Ayat</th><th>Terdeteksi sebagai</th><th>Keyakinan</th><th>Cuplikan teks</th><th></th></tr></thead>" +
    "<tbody>" +
    shown
      .map((f) => {
        const langLabel = ((CONFIG.LANGUAGES || []).find((l) => l.code === f.lang) || {}).label || f.lang;
        const ref = `${escapeHtml(f.bookName || "")} ${f.chapter}:${f.verse}`;
        const snippetRaw = f.text || "";
        const snippet = escapeHtml(snippetRaw.slice(0, 140)) + (snippetRaw.length > 140 ? "…" : "");
        return `<tr>
        <td>${escapeHtml(langLabel)} (${escapeHtml(f.lang)})</td>
        <td>${ref}</td>
        <td>${escapeHtml(LANG_CHECK_FAMILY_LABEL[f.detectedFamily] || f.detectedFamily)}</td>
        <td>${escapeHtml(f.confidence)}</td>
        <td class="lc-snippet">${snippet}</td>
        <td>
          <button type="button" class="chip-btn small lc-view-btn">Lihat ayat</button>
          ${canAskAi ? `<button type="button" class="chip-btn small lc-ai-btn">🤖 Tanya AI</button>` : ""}
        </td>
      </tr>`;
      })
      .join("") +
    "</tbody>";
  wrap.appendChild(table);

  if (list.length > shown.length) {
    const note = document.createElement("p");
    note.className = "media-empty";
    note.textContent = `Menampilkan ${shown.length} dari ${list.length}. Persempit dengan filter di atas, atau tekan "💾 Simpan sebagai CSV" untuk mendapat semuanya.`;
    wrap.appendChild(note);
  }

  const rows = table.querySelectorAll("tbody tr");
  rows.forEach((tr, idx) => {
    const f = shown[idx];

    const viewBtn = tr.querySelector(".lc-view-btn");
    if (viewBtn) {
      viewBtn.addEventListener("click", () => {
        currentLang = f.lang;
        if (typeof langSelectEl === "function" && langSelectEl()) langSelectEl().value = f.lang;
        renderChapter(f.bookNumber, f.chapter, f.verse);
      });
    }

    const aiBtn = tr.querySelector(".lc-ai-btn");
    if (aiBtn) {
      aiBtn.addEventListener("click", async () => {
        aiBtn.disabled = true;
        aiBtn.textContent = "Bertanya ke AI…";
        try {
          const question =
            "Tolong beri tahu ayat berikut ini SEBENARNYA ditulis dalam bahasa apa. Jawab HANYA nama bahasanya " +
            'saja (mis. "Bahasa Indonesia", "Bahasa Inggris", "Bahasa Jawa", "Bahasa Mandarin aksara sederhana", ' +
            'atau "Bahasa Mandarin aksara tradisional"), tanpa penjelasan lain:\n\n"""' +
            f.text +
            '"""';
          const res = await AiChatSync.ask({
            username: currentUser,
            question,
            context: {},
            allowExternal: true,
            history: [],
          });
          const cell = tr.querySelector(".lc-snippet");
          const note = document.createElement("div");
          note.className = "lc-ai-answer";
          note.textContent =
            res && res.ok ? "🤖 AI: " + res.answer : "🤖 AI gagal menjawab: " + ((res && res.error) || "tidak diketahui");
          cell.appendChild(note);
          aiBtn.remove();
        } catch (err) {
          aiBtn.textContent = "🤖 Gagal, coba lagi";
          aiBtn.disabled = false;
        }
      });
    }
  });
}

function saveLangCheckAsCsv(flagged) {
  if (!flagged || !flagged.length) {
    alert('Belum ada hasil pindai untuk disimpan. Tekan "🔍 Mulai Pindai" dahulu.');
    return;
  }
  const header = ["Bahasa (kode)", "Kitab", "Pasal", "Ayat", "Rumpun Seharusnya", "Rumpun Terdeteksi", "Keyakinan", "Teks"];
  const escCsv = (v) => {
    const s = String(v == null ? "" : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [header.join(",")].concat(
    flagged.map((f) =>
      [f.lang, f.bookName, f.chapter, f.verse, f.expectedFamily, f.detectedFamily, f.confidence, f.text].map(escCsv).join(",")
    )
  );
  const csv = lines.join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `verifikasi-bahasa-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
