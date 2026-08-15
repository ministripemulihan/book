// ============================================================
//  💬 CURHAT DOMBA & GEMBALA — panel BARU, memakai Apps Script &
//  Google Sheet TERPISAH (lihat apps-script/CurhatCode.gs +
//  CONFIG.CURHAT_APPS_SCRIPT_URL di js/config.js).
//
//  - Semua orang yang login boleh menulis curhat ("Curhat Saya").
//  - Hanya level di CONFIG.CURHAT_GEMBALA_LEVELS (administrator/
//    penatua/gembala distrik/gembala) yang melihat tab "Balas Curhat
//    Jemaat" dan yang dikirimi umur penulis curhat oleh server.
//  - Status (⏳ Tertunda / ✅ Selesai / ➡️ Lewat) HANYA diubah oleh
//    domba pemilik curhat itu sendiri -- gembala tidak bisa mengubahnya,
//    supaya benar-benar mencerminkan perasaan domba itu sendiri.
// ============================================================

const CurhatSync = {
  enabled() {
    return !!(CONFIG.CURHAT_APPS_SCRIPT_URL && CONFIG.CURHAT_APPS_SCRIPT_URL.indexOf("http") === 0);
  },
  async _get(params) {
    if (!this.enabled()) return null;
    const withBuster = Object.assign({}, params, { _ts: String(Date.now()) });
    const url = CONFIG.CURHAT_APPS_SCRIPT_URL + "?" + new URLSearchParams(withBuster).toString();
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  },
  async _post(payload) {
    if (!this.enabled()) return null;
    const res = await fetch(CONFIG.CURHAT_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  },
  async listMine(username) {
    const data = await this._get({ type: "curhat_list", username, scope: "mine" });
    return (data && data.ok && data.items) || [];
  },
  async listAllForGembala(username) {
    const data = await this._get({ type: "curhat_list", username, scope: "all", asGembala: "1" });
    return (data && data.ok && data.items) || [];
  },
  async submit(payload) {
    return this._post(Object.assign({ type: "curhat_submit" }, payload));
  },
  async respond(payload) {
    return this._post(Object.assign({ type: "curhat_respond" }, payload));
  },
  async setStatus(id, username, status) {
    return this._post({ type: "curhat_status", id, username, status });
  },
  async requestPublic(id, username, mintaPublik, namaPublikDomba) {
    return this._post({ type: "curhat_minta_publik", id, username, mintaPublik, namaPublikDomba });
  },
  async listPublic(sortBy, rater) {
    return this._get({ type: "curhat_public", sortBy: sortBy || "terbaru", rater: rater || "", limit: "10" });
  },
  async rate(id, raterUsername, bintang) {
    return this._post({ type: "curhat_rate", id, raterUsername, bintang });
  },
};

// ------------------------------------------------------------
// 🔠 Mode baca layar penuh (A+ / A-) -- dipakai untuk isi curhat &
// balasan gembala supaya enak dibaca di HP maupun laptop. Ukuran
// huruf tersimpan di perangkat (localStorage) sehingga tetap dipakai
// di kunjungan berikutnya.
// ------------------------------------------------------------
const CURHAT_FONT_SIZE_KEY = "bible_app_curhat_font_size_v1";
function getCurhatFontSize() {
  const v = parseInt(localStorage.getItem(CURHAT_FONT_SIZE_KEY) || "19", 10);
  return isNaN(v) ? 19 : Math.min(34, Math.max(14, v));
}
function setCurhatFontSize(v) {
  const clamped = Math.min(34, Math.max(14, v));
  localStorage.setItem(CURHAT_FONT_SIZE_KEY, String(clamped));
  return clamped;
}
function openCurhatFullscreen(title, htmlContent) {
  const overlay = document.createElement("div");
  overlay.className = "curhat-fullscreen-overlay";
  overlay.innerHTML = `
    <div class="curhat-fullscreen-bar">
      <strong class="curhat-fullscreen-title">${escapeHtml(title || "Baca")}</strong>
      <div class="curhat-fullscreen-controls">
        <button type="button" class="chip-btn" data-act="minus" title="Perkecil huruf">A-</button>
        <button type="button" class="chip-btn" data-act="plus" title="Perbesar huruf">A+</button>
        <button type="button" class="chip-btn curhat-fullscreen-close" data-act="close">✕ Tutup</button>
      </div>
    </div>
    <div class="curhat-fullscreen-content"></div>
  `;
  const contentEl = overlay.querySelector(".curhat-fullscreen-content");
  contentEl.innerHTML = htmlContent;
  document.body.appendChild(overlay);
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  let size = getCurhatFontSize();
  contentEl.style.fontSize = size + "px";

  function onClick(e) {
    const act = e.target && e.target.getAttribute && e.target.getAttribute("data-act");
    if (act === "plus") {
      size = setCurhatFontSize(size + 2);
      contentEl.style.fontSize = size + "px";
    } else if (act === "minus") {
      size = setCurhatFontSize(size - 2);
      contentEl.style.fontSize = size + "px";
    } else if (act === "close") {
      closeOverlay();
    }
  }
  function onKey(e) {
    if (e.key === "Escape") closeOverlay();
  }
  function closeOverlay() {
    overlay.removeEventListener("click", onClick);
    document.removeEventListener("keydown", onKey);
    overlay.remove();
    document.body.style.overflow = prevOverflow;
  }
  overlay.addEventListener("click", onClick);
  document.addEventListener("keydown", onKey);
}

// ------------------------------------------------------------
// ⭐ Widget bintang 1-5 untuk menu publik "Semua Orang". Siapa saja
// yang login boleh menilai; satu orang = satu suara per topik (menilai
// ulang mengganti suara lamanya). Dipakai bersama rata-rata, jumlah
// penilai, dan total bintang yang tersimpan di server.
// ------------------------------------------------------------
function curhatStarWidget(item, onRated) {
  const wrap = document.createElement("div");
  wrap.className = "curhat-stars";
  const row = document.createElement("div");
  row.className = "curhat-stars-row";
  const mine = item.ratingSaya || 0;
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement("button");
    star.type = "button";
    star.className = "curhat-star" + (i <= mine ? " active" : "");
    star.textContent = i <= mine ? "★" : "☆";
    star.title = `Beri ${i} bintang`;
    star.addEventListener("click", async () => {
      row.querySelectorAll(".curhat-star").forEach((b) => (b.disabled = true));
      try {
        const res = await CurhatSync.rate(item.id, currentUser, i);
        if (res && res.ok) {
          item.ratingSaya = res.ratingSaya;
          item.jumlahRating = res.jumlahRating;
          item.totalBintang = res.totalBintang;
          item.rataBintang = res.rataBintang;
          if (onRated) onRated();
        } else {
          alert("Gagal mengirim bintang: " + ((res && res.error) || "tidak diketahui"));
        }
      } catch (err) {
        alert("Gagal mengirim bintang: " + err);
      } finally {
        row.querySelectorAll(".curhat-star").forEach((b) => (b.disabled = false));
      }
    });
    row.appendChild(star);
  }
  wrap.appendChild(row);
  const info = document.createElement("span");
  info.className = "curhat-stars-info";
  const avg = item.rataBintang || 0;
  const count = item.jumlahRating || 0;
  const total = item.totalBintang || 0;
  info.textContent = count
    ? `${avg.toFixed(1)}★ dari ${count} orang (total ${total} bintang)`
    : `Belum ada yang menilai`;
  wrap.appendChild(info);
  return wrap;
}

function isCurhatGembala() {
  const allowed = (CONFIG.CURHAT_GEMBALA_LEVELS || []);
  return (currentUserLevels || []).some((l) => allowed.includes(l));
}

function curhatStatusLabel(key) {
  const found = (CONFIG.CURHAT_STATUSES || []).find((s) => s.key === key);
  return found ? found.label : key;
}

// Ubah link biasa (YouTube / file mp3 / mp4) jadi elemen yang bisa
// diputar LANGSUNG di halaman -- bukan cuma tautan biru.
function curhatRenderMediaLink(link) {
  if (!link) return "";
  const safe = escapeHtml(link);
  const yt = link.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  if (yt) {
    return `<div class="curhat-media"><iframe width="100%" height="220" src="https://www.youtube.com/embed/${yt[1]}" title="Video" frameborder="0" allowfullscreen loading="lazy"></iframe></div>`;
  }
  if (/\.mp3(\?.*)?$/i.test(link)) {
    return `<div class="curhat-media"><audio controls preload="none" style="width:100%"><source src="${safe}"></audio></div>`;
  }
  if (/\.mp4(\?.*)?$/i.test(link)) {
    return `<div class="curhat-media"><video controls preload="none" style="width:100%;max-height:320px"><source src="${safe}"></video></div>`;
  }
  return `<p><a href="${safe}" target="_blank" rel="noopener">🔗 Buka bacaan/tautan</a></p>`;
}

// ------------------------------------------------------------
// 📋 Tombol "Salin" untuk topik publik -- menyalin ringkasan lengkap
// (nama domba/anonim, tanggal, isi, jawaban & nama gembala/anonim,
// status, rata-rata bintang) ke clipboard, format teks polos supaya
// gampang ditempel ke mana saja (WA, dokumen, dsb). Tanggal terakhir
// disalin disimpan per-topik di perangkat (localStorage) dan
// ditampilkan di bawah tombol.
// ------------------------------------------------------------
const CURHAT_LAST_COPY_KEY = "bible_app_curhat_last_copy_v1";
function getCurhatLastCopyMap() {
  try { return JSON.parse(localStorage.getItem(CURHAT_LAST_COPY_KEY) || "{}"); } catch (e) { return {}; }
}
function setCurhatLastCopy(id, iso) {
  const map = getCurhatLastCopyMap();
  map[id] = iso;
  localStorage.setItem(CURHAT_LAST_COPY_KEY, JSON.stringify(map));
}
function buildCurhatCopyText(item) {
  const tanggal = item.tanggal ? new Date(item.tanggal).toLocaleString("id-ID") : "-";
  const namaDomba = item.namaPublikDomba && item.namaPublikDomba.trim() ? item.namaPublikDomba.trim() : "Anonim";
  const namaGembala = item.namaPublik && item.namaPublik.trim() ? item.namaPublik.trim() : "Gembala (Anonim)";
  const avg = (item.rataBintang || 0).toFixed(1);
  const count = item.jumlahRating || 0;
  const lines = [
    `📋 ${item.judulTopik} (${item.jenisTopik})`,
    `Dari: ${namaDomba}`,
    `Tanggal: ${tanggal}`,
    `Status: ${curhatStatusLabel(item.status)}`,
    "",
    item.isiTopik || "",
    "",
    `💬 Jawaban Gembala (${namaGembala}):`,
    item.respon || "(belum ada jawaban)",
    "",
    `⭐ Rating rata-rata: ${avg} dari ${count} orang`,
    `📅 Disalin pada: ${new Date().toLocaleString("id-ID")}`,
  ];
  return lines.join("\n");
}
function curhatCopyButton(item) {
  const wrap = document.createElement("div");
  wrap.className = "curhat-copy-wrap";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "chip-btn";
  btn.textContent = "📋 Salin";
  const info = document.createElement("span");
  info.className = "curhat-meta curhat-copy-info";
  function refreshInfo() {
    const map = getCurhatLastCopyMap();
    const last = map[item.id];
    info.textContent = last ? `Terakhir disalin: ${new Date(last).toLocaleString("id-ID")}` : "";
  }
  refreshInfo();
  btn.addEventListener("click", async () => {
    const text = buildCurhatCopyText(item);
    try {
      await navigator.clipboard.writeText(text);
      const now = new Date().toISOString();
      setCurhatLastCopy(item.id, now);
      refreshInfo();
      btn.textContent = "✅ Tersalin";
      setTimeout(() => { btn.textContent = "📋 Salin"; }, 1500);
    } catch (err) {
      alert("Gagal menyalin ke clipboard: " + err);
    }
  });
  wrap.appendChild(btn);
  wrap.appendChild(info);
  return wrap;
}

async function showCurhatPanel() {
  hideAllPanels();
  el("curhatPanel").hidden = false;
  logActivity("Curhat");
  _curhatState.view = _curhatState.view || "mine";
  await renderCurhatPanel();
}

const _curhatState = { view: "mine" };

async function renderCurhatPanel() {
  const container = el("curhatPanel");
  container.innerHTML = "";

  const title = document.createElement("h2");
  title.textContent = "💬 Curhat";
  container.appendChild(title);

  if (!CurhatSync.enabled()) {
    const p = document.createElement("p");
    p.className = "media-empty";
    p.textContent = "Fitur ini belum diaktifkan. Isi dulu CONFIG.CURHAT_APPS_SCRIPT_URL di js/config.js (lihat cara pasang di apps-script/CurhatCode.gs).";
    container.appendChild(p);
    return;
  }

  const tabs = document.createElement("div");
  tabs.className = "curhat-tabs";
  const mineTab = document.createElement("button");
  mineTab.type = "button";
  mineTab.className = "chip-btn" + (_curhatState.view === "mine" ? " active" : "");
  mineTab.textContent = "📝 Curhat Saya";
  mineTab.addEventListener("click", () => { _curhatState.view = "mine"; renderCurhatPanel(); });
  tabs.appendChild(mineTab);

  // Menu "Semua Orang" terbuka untuk SIAPA SAJA yang login -- berisi
  // hanya topik Alkitab / Kebenaran Firman Tuhan yang sengaja
  // ditampilkan publik oleh gembala (TampilPublik = Y).
  const publicTab = document.createElement("button");
  publicTab.type = "button";
  publicTab.className = "chip-btn" + (_curhatState.view === "public" ? " active" : "");
  publicTab.textContent = "🌐 Semua Orang";
  publicTab.addEventListener("click", () => { _curhatState.view = "public"; renderCurhatPanel(); });
  tabs.appendChild(publicTab);

  if (isCurhatGembala()) {
    const gembalaTab = document.createElement("button");
    gembalaTab.type = "button";
    gembalaTab.className = "chip-btn" + (_curhatState.view === "gembala" ? " active" : "");
    gembalaTab.textContent = "📥 Balas Curhat Jemaat";
    gembalaTab.addEventListener("click", () => { _curhatState.view = "gembala"; renderCurhatPanel(); });
    tabs.appendChild(gembalaTab);
  }
  container.appendChild(tabs);

  const body = document.createElement("div");
  body.className = "curhat-body";
  container.appendChild(body);
  body.innerHTML = `<p class="media-empty">Memuat…</p>`;

  if (_curhatState.view === "gembala" && isCurhatGembala()) {
    await renderCurhatGembalaView(body);
  } else if (_curhatState.view === "public") {
    await renderCurhatPublicView(body);
  } else {
    await renderCurhatMineView(body);
  }
}

// ------------------------------------------------------------
// 🌐 MENU "SEMUA ORANG" -- topik Alkitab / Kebenaran Firman Tuhan
// yang ditampilkan gembala ke publik. Bisa diurutkan (terbaru,
// rating tertinggi, judul, jenis topik), defaultnya topik terbaru di
// paling atas, dan hanya menampilkan 10 topik utama (server yang
// membatasi, lihat CurhatCode.gs).
// ------------------------------------------------------------
async function renderCurhatPublicView(body) {
  body.innerHTML = "";

  const intro = document.createElement("p");
  intro.className = "media-empty";
  intro.textContent = "Topik Alkitab & Kebenaran Firman Tuhan yang dijawab gembala dan ditampilkan untuk semua orang. Beri bintang kalau jawabannya membantu Anda.";
  body.appendChild(intro);

  const controls = document.createElement("div");
  controls.className = "curhat-public-controls";
  controls.innerHTML = `
    <label>Urutkan
      <select id="curhatPublicSort">
        <option value="terbaru">Terbaru lebih dulu</option>
        <option value="bintang">Rating tertinggi</option>
        <option value="judul">Judul Topik (A-Z)</option>
        <option value="jenis">Jenis Topik (A-Z)</option>
      </select>
    </label>
  `;
  body.appendChild(controls);

  const listWrap = document.createElement("div");
  listWrap.className = "curhat-list curhat-public-list";
  body.appendChild(listWrap);

  const sortSelect = controls.querySelector("#curhatPublicSort");
  sortSelect.value = _curhatState.publicSort || "terbaru";
  sortSelect.addEventListener("change", () => {
    _curhatState.publicSort = sortSelect.value;
    loadPublicList();
  });

  async function loadPublicList() {
    listWrap.innerHTML = `<p class="media-empty">Memuat…</p>`;
    let data;
    try {
      data = await CurhatSync.listPublic(sortSelect.value, currentUser);
    } catch (err) {
      listWrap.innerHTML = `<p class="media-empty">Gagal memuat: ${escapeHtml(String(err))}</p>`;
      return;
    }
    const items = (data && data.ok && data.items) || [];
    const totalCount = (data && data.totalCount) || items.length;
    listWrap.innerHTML = "";
    if (!items.length) {
      listWrap.innerHTML = `<p class="media-empty">Belum ada topik Alkitab / Kebenaran Firman Tuhan yang ditampilkan gembala.</p>`;
      return;
    }
    const info = document.createElement("p");
    info.className = "media-empty";
    info.textContent = totalCount > items.length
      ? `Menampilkan ${items.length} topik utama dari total ${totalCount} topik publik.`
      : `Menampilkan ${items.length} topik.`;
    listWrap.appendChild(info);
    items.forEach((item) => listWrap.appendChild(renderCurhatPublicCard(item, loadPublicList)));
  }

  await loadPublicList();
}

function renderCurhatPublicCard(item, reload) {
  const card = document.createElement("div");
  card.className = "curhat-card curhat-card-public";
  const tanggalRespon = item.tanggalDibaca ? new Date(item.tanggalDibaca).toLocaleString("id-ID") : "-";

  card.innerHTML = `
    <div class="curhat-card-head">
      <strong>${escapeHtml(item.judulTopik)}</strong>
      <span class="curhat-badge">${escapeHtml(item.jenisTopik)}</span>
      <span class="curhat-badge curhat-badge-status">${escapeHtml(curhatStatusLabel(item.status))}</span>
    </div>
    <p class="curhat-meta">Dari: ${escapeHtml(item.namaPublikDomba && item.namaPublikDomba.trim() ? item.namaPublikDomba : "Anonim")} · ${escapeHtml(tanggalRespon)}</p>
    <p class="curhat-isi">${escapeHtml(item.isiTopik)}</p>
    ${curhatRenderMediaLink(item.linkMediaDomba)}
    ${item.respon ? `<p class="curhat-isi curhat-response-text">💬 Jawaban Gembala (${escapeHtml(item.namaPublik || "Gembala")}): ${escapeHtml(item.respon)}</p>` : ""}
    ${curhatRenderMediaLink(item.linkMedia)}
  `;

  const actionsRow = document.createElement("div");
  actionsRow.className = "curhat-card-actions";
  const fsBtn = document.createElement("button");
  fsBtn.type = "button";
  fsBtn.className = "chip-btn";
  fsBtn.textContent = "⛶ Baca Layar Penuh";
  fsBtn.addEventListener("click", () => {
    const html = `<p>${escapeHtml(item.isiTopik)}</p>` +
      curhatRenderMediaLink(item.linkMediaDomba) +
      (item.respon ? `<hr/><p><strong>💬 Jawaban Gembala (${escapeHtml(item.namaPublik || "Gembala")}):</strong></p><p>${escapeHtml(item.respon)}</p>` : "") +
      curhatRenderMediaLink(item.linkMedia);
    openCurhatFullscreen(item.judulTopik, html);
  });
  actionsRow.appendChild(fsBtn);
  actionsRow.appendChild(curhatCopyButton(item));
  card.appendChild(actionsRow);

  const starsWrap = document.createElement("div");
  card.appendChild(starsWrap);
  function refreshStars() {
    starsWrap.innerHTML = "";
    starsWrap.appendChild(curhatStarWidget(item, refreshStars));
  }
  refreshStars();

  return card;
}

async function renderCurhatMineView(body) {
  body.innerHTML = "";

  // ---- form tulis curhat baru ----
  const form = document.createElement("form");
  form.className = "curhat-form";
  const typeOptions = (CONFIG.CURHAT_TOPIC_TYPES || [])
    .map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
  form.innerHTML = `
    <h3>✍️ Tulis Curhat Baru</h3>
    <label>Jenis Topik
      <select name="jenisTopik">${typeOptions}</select>
    </label>
    <label id="curhatCustomTypeWrap" hidden>Jenis topik lainnya (tulis sendiri)
      <input type="text" name="jenisTopikLain" placeholder="mis. Persahabatan" />
    </label>
    <label>Umur Anda saat ini (hanya gembala yang bisa melihat ini)
      <input type="number" name="umur" min="1" max="120" placeholder="mis. 23" />
    </label>
    <label>Judul Topik (bebas)
      <input type="text" name="judulTopik" placeholder="mis. Bingung soal masa depan" required />
    </label>
    <label>Isi Curhat
      <textarea name="isiTopik" rows="5" placeholder="Ceritakan yang mengganjal di hati Anda…" required></textarea>
    </label>
    <label>Link bacaan/audio/video Anda (opsional) — mp3, mp4, atau YouTube
      <input type="text" name="linkMediaDomba" placeholder="mis. https://youtu.be/..." />
    </label>
    <button type="submit" class="chip-btn">📤 Kirim ke Gembala</button>
    <p class="curhat-form-note media-empty">Curhat ini hanya bisa dibaca oleh gembala yang berhak memantau Anda (aturan yang sama seperti panel Pantau Pembacaan) -- kecuali jenis topik Alkitab / Kebenaran Firman Tuhan yang boleh ditampilkan ke semua orang oleh gembala.</p>
  `;
  body.appendChild(form);

  const typeSelect = form.querySelector('select[name="jenisTopik"]');
  const customWrap = el("curhatCustomTypeWrap");
  typeSelect.addEventListener("change", () => {
    customWrap.hidden = typeSelect.value !== "Lainnya";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    let jenisTopik = String(fd.get("jenisTopik") || "Lainnya");
    if (jenisTopik === "Lainnya" && String(fd.get("jenisTopikLain") || "").trim()) {
      jenisTopik = String(fd.get("jenisTopikLain")).trim();
    }
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Mengirim…";
    try {
      await CurhatSync.submit({
        username: currentUser,
        umur: fd.get("umur") || "",
        jenisTopik,
        judulTopik: String(fd.get("judulTopik") || "").trim(),
        isiTopik: String(fd.get("isiTopik") || "").trim(),
        linkMediaDomba: String(fd.get("linkMediaDomba") || "").trim(),
      });
      form.reset();
      customWrap.hidden = true;
      await renderCurhatPanel();
    } catch (err) {
      alert("Gagal mengirim curhat: " + err);
      submitBtn.disabled = false;
      submitBtn.textContent = "📤 Kirim ke Gembala";
    }
  });

  // ---- daftar curhat milik sendiri ----
  const listWrap = document.createElement("div");
  listWrap.className = "curhat-list";
  const listTitle = document.createElement("h3");
  listTitle.textContent = "📜 Riwayat Curhat Saya";
  body.appendChild(listTitle);
  body.appendChild(listWrap);
  listWrap.innerHTML = `<p class="media-empty">Memuat…</p>`;

  let items = [];
  try {
    items = await CurhatSync.listMine(currentUser);
  } catch (err) {
    listWrap.innerHTML = `<p class="media-empty">Gagal memuat: ${escapeHtml(String(err))}</p>`;
    return;
  }
  if (!items.length) {
    listWrap.innerHTML = `<p class="media-empty">Belum ada curhat yang dikirim.</p>`;
    return;
  }
  listWrap.innerHTML = "";
  items.forEach((item) => listWrap.appendChild(renderCurhatMineCard(item)));
}

function renderCurhatMineCard(item) {
  const card = document.createElement("div");
  card.className = "curhat-card";
  const tanggal = item.tanggal ? new Date(item.tanggal).toLocaleString("id-ID") : "-";
  const dibaca = item.tanggalDibaca ? new Date(item.tanggalDibaca).toLocaleString("id-ID") : null;
  const statusOptions = (CONFIG.CURHAT_STATUSES || [])
    .map((s) => `<option value="${s.key}" ${s.key === item.status ? "selected" : ""}>${escapeHtml(s.label)}</option>`).join("");
  card.innerHTML = `
    <div class="curhat-card-head">
      <strong>${escapeHtml(item.judulTopik)}</strong>
      <span class="curhat-badge">${escapeHtml(item.jenisTopik)}</span>
    </div>
    <p class="curhat-meta">${escapeHtml(tanggal)}</p>
    <p class="curhat-isi">${escapeHtml(item.isiTopik)}</p>
    ${curhatRenderMediaLink(item.linkMediaDomba)}
    ${dibaca ? `
      <div class="curhat-response">
        <p class="curhat-meta">Dibaca gembala: ${escapeHtml(dibaca)}</p>
        ${item.respon ? `<p class="curhat-isi curhat-response-text">💬 ${escapeHtml(item.respon)}</p>` : ""}
        ${curhatRenderMediaLink(item.linkMedia)}
      </div>
    ` : `<p class="media-empty">Belum dibaca/dibalas gembala.</p>`}
    <div class="curhat-card-actions">
      <button type="button" class="chip-btn curhat-fullscreen-btn">⛶ Baca Layar Penuh</button>
    </div>
    <label class="curhat-status-label">Status saya:
      <select class="curhat-status-select" data-id="${escapeHtml(item.id)}">${statusOptions}</select>
    </label>
    <div class="curhat-request-public">
      <label class="curhat-public-toggle">
        <input type="checkbox" class="curhat-minta-publik-check" ${item.mintaPublik ? "checked" : ""} />
        Tampilkan curhat ini di menu "Semua Orang" (masih perlu persetujuan gembala)
      </label>
      <input type="text" class="curhat-minta-publik-nama" placeholder="Nama Anda yang tampil publik (kosongkan = Anonim)" value="${escapeHtml(item.namaPublikDomba || "")}" />
      <button type="button" class="chip-btn curhat-minta-publik-save">💾 Simpan Pilihan</button>
      <p class="curhat-meta curhat-minta-publik-status">${item.mintaPublik ? (item.tampilPublik ? "✅ Disetujui gembala & tampil publik." : "⏳ Menunggu persetujuan gembala.") : "Belum diminta tampil publik."}</p>
    </div>
  `;
  card.querySelector(".curhat-fullscreen-btn").addEventListener("click", () => {
    const html = `<p><strong>📝 Curhat Saya:</strong></p><p>${escapeHtml(item.isiTopik)}</p>` +
      curhatRenderMediaLink(item.linkMediaDomba) +
      (item.respon ? `<hr/><p><strong>💬 Balasan Gembala:</strong></p><p>${escapeHtml(item.respon)}</p>` : "") +
      curhatRenderMediaLink(item.linkMedia);
    openCurhatFullscreen(item.judulTopik, html);
  });
  card.querySelector(".curhat-status-select").addEventListener("change", async (e) => {
    const select = e.target;
    const prev = item.status;
    try {
      await CurhatSync.setStatus(item.id, currentUser, select.value);
      item.status = select.value;
    } catch (err) {
      alert("Gagal mengubah status: " + err);
      select.value = prev;
    }
  });
  card.querySelector(".curhat-minta-publik-save").addEventListener("click", async (e) => {
    const btn = e.target;
    const checked = card.querySelector(".curhat-minta-publik-check").checked;
    const nama = card.querySelector(".curhat-minta-publik-nama").value.trim();
    btn.disabled = true;
    btn.textContent = "Menyimpan…";
    try {
      await CurhatSync.requestPublic(item.id, currentUser, checked, nama);
      item.mintaPublik = checked;
      item.namaPublikDomba = nama;
      if (!checked) item.tampilPublik = false;
      card.querySelector(".curhat-minta-publik-status").textContent = checked
        ? (item.tampilPublik ? "✅ Disetujui gembala & tampil publik." : "⏳ Menunggu persetujuan gembala.")
        : "Belum diminta tampil publik.";
      btn.textContent = "✅ Tersimpan";
      setTimeout(() => { btn.disabled = false; btn.textContent = "💾 Simpan Pilihan"; }, 1200);
    } catch (err) {
      alert("Gagal menyimpan: " + err);
      btn.disabled = false;
      btn.textContent = "💾 Simpan Pilihan";
    }
  });
  return card;
}

async function renderCurhatGembalaView(body) {
  body.innerHTML = `<p class="media-empty">Memuat…</p>`;
  let items = [];
  try {
    items = await CurhatSync.listAllForGembala(currentUser);
  } catch (err) {
    body.innerHTML = `<p class="media-empty">Gagal memuat: ${escapeHtml(String(err))}</p>`;
    return;
  }

  // Saring: gembala hanya boleh melihat curhat dari domba yang boleh ia
  // pantau -- pakai aturan bertingkat yang SAMA seperti panel Pantau
  // Pembacaan (canViewLevel), supaya konsisten satu aplikasi.
  const monitorable = await getMonitorableUsers();
  const monitorableUsernames = new Set(monitorable.map((u) => u.username));
  items = items.filter((it) => monitorableUsernames.has(it.username) || it.username === currentUser);

  body.innerHTML = "";
  if (!items.length) {
    body.innerHTML = `<p class="media-empty">Belum ada curhat dari jemaat yang boleh Anda pantau.</p>`;
    return;
  }

  const info = document.createElement("p");
  info.className = "media-empty";
  info.textContent = `Menampilkan ${items.length} curhat dari jemaat yang boleh Anda pantau.`;
  body.appendChild(info);

  items.forEach((item) => body.appendChild(renderCurhatGembalaCard(item)));
}

function renderCurhatGembalaCard(item) {
  const card = document.createElement("div");
  card.className = "curhat-card curhat-card-gembala";
  const tanggal = item.tanggal ? new Date(item.tanggal).toLocaleString("id-ID") : "-";
  const isBibleTopic = /alkitab|kebenaran firman/i.test(item.jenisTopik || "");
  // Toggle "tampil publik" muncul kalau ini topik Alkitab/Kebenaran
  // Firman Tuhan (perilaku lama) ATAU domba pemiliknya sendiri sudah
  // MEMINTA supaya curhatnya ditampilkan ke publik -- publikasi tetap
  // butuh gembala mencentang & menyimpan di sini sebagai persetujuan akhir.
  const canOfferPublic = isBibleTopic || item.mintaPublik;
  card.innerHTML = `
    <div class="curhat-card-head">
      <strong>${escapeHtml(item.judulTopik)}</strong>
      <span class="curhat-badge">${escapeHtml(item.jenisTopik)}</span>
      <span class="curhat-badge curhat-badge-status">${escapeHtml(curhatStatusLabel(item.status))}</span>
    </div>
    <p class="curhat-meta">${escapeHtml(item.username)}${item.umur ? " · " + escapeHtml(String(item.umur)) + " tahun" : ""} · ${escapeHtml(tanggal)}</p>
    <p class="curhat-isi">${escapeHtml(item.isiTopik)}</p>
    ${curhatRenderMediaLink(item.linkMediaDomba)}
    ${item.mintaPublik ? `<p class="curhat-meta">🙋 Domba meminta tampil publik${item.namaPublikDomba ? ", nama pilihan: " + escapeHtml(item.namaPublikDomba) : " (Anonim)"}.</p>` : ""}
    <form class="curhat-respond-form">
      <textarea name="respon" rows="3" placeholder="Tulis balasan Anda…">${escapeHtml(item.respon || "")}</textarea>
      <input type="text" name="linkMedia" placeholder="Link bacaan/audio/video (opsional) — mp3, mp4, atau YouTube" value="${escapeHtml(item.linkMedia || "")}" />
      ${canOfferPublic ? `
      <label class="curhat-public-toggle">
        <input type="checkbox" name="tampilPublik" ${item.tampilPublik ? "checked" : ""} />
        Setujui tampil di menu "Semua Orang"
      </label>
      <input type="text" name="namaPublik" placeholder="Nama Anda (gembala) yang tampil ke publik (boleh 'Anonim')" value="${escapeHtml(item.namaPublik || "")}" />
      ` : `<p class="curhat-meta">Menu "tampil publik" hanya muncul untuk topik Alkitab/Kebenaran Firman Tuhan, atau kalau domba sudah meminta sendiri.</p>`}
      <button type="submit" class="chip-btn">💬 Simpan Balasan</button>
    </form>
  `;
  card.querySelector(".curhat-respond-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "Menyimpan…";
    try {
      await CurhatSync.respond({
        id: item.id,
        gembalaUsername: currentUser,
        respon: String(fd.get("respon") || ""),
        linkMedia: String(fd.get("linkMedia") || ""),
        tampilPublik: fd.get("tampilPublik") === "on",
        namaPublik: String(fd.get("namaPublik") || ""),
      });
      btn.textContent = "✅ Tersimpan";
      setTimeout(() => { btn.disabled = false; btn.textContent = "💬 Simpan Balasan"; }, 1500);
    } catch (err) {
      alert("Gagal menyimpan balasan: " + err);
      btn.disabled = false;
      btn.textContent = "💬 Simpan Balasan";
    }
  });
  return card;
}
