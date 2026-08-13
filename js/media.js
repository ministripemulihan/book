// ============================================================
//  BACAAN BERSUARA HARIAN — daftar rentang bacaan + link MP3/MP4/
//  YouTube, diambil dari sheet TERPISAH (lihat CONFIG.READING_MEDIA_SHEETS
//  di js/config.js). Ini BUKAN sumber teks Alkitab (teks tetap dari sheet
//  Alkitab utama seperti biasa) — sheet ini hanya berisi rentang referensi
//  ayat + link dengar/tonton untuk tiap rentang itu.
//
//  Data di-cache di localStorage (bukan IndexedDB, karena ukurannya kecil)
//  supaya kunjungan berikutnya instan; ada tombol sinkron ulang per sheet.
// ============================================================
const MEDIA_CACHE_PREFIX = "bible_app_media_v1_";

function mediaCacheKey(sheetKey) {
  return MEDIA_CACHE_PREFIX + sheetKey;
}

function loadMediaFromCache(sheetKey) {
  try {
    const raw = localStorage.getItem(mediaCacheKey(sheetKey));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveMediaToCache(sheetKey, rows) {
  try {
    localStorage.setItem(
      mediaCacheKey(sheetKey),
      JSON.stringify({ rows, fetchedAt: new Date().toISOString() })
    );
  } catch (e) {
    /* kalau localStorage penuh, cukup diabaikan -- fitur tetap jalan, hanya tidak ter-cache */
  }
}

async function fetchMediaSheet(sheet) {
  const res = await fetch(sheet.csvUrl, { cache: "no-store" });
  if (!res.ok) throw new Error("Gagal mengambil data (" + res.status + ")");
  const text = await res.text();
  const records = parseCSV(text);
  // Normalisasi nama kolom (huruf besar/kecil & "no"/"nomor" bebas)
  const rows = records.map((r) => ({
    no: r["no"] || r["nomor"] || "",
    pembacaan: r["pembacaan"] || r["kitab perjanjian baru (nama kitab)"] || r["新约圣经书卷 (nama kitab)"] || r["new testament book (nama kitab)"] || "",
    mp3: (r["link mp3"] || "").trim(),
    mp4: (r["link mp4"] || "").trim(),
    youtube: (r["youtube"] || "").trim(),
  }));
  saveMediaToCache(sheet.key, rows);
  return rows;
}

// Menebak kitab & pasal dari teks rentang bacaan (mis. "Kejadian 1:1-2:3",
// "Ratapan1:1-22" [tanpa spasi], "Amsal 27:1-27") supaya bisa dibuka
// langsung di pembaca. Best-effort: hanya mengambil kitab & pasal AWAL,
// tidak mencoba menafsirkan rentang ayat/pasal penuh.
function guessReferenceFromPembacaan(text) {
  if (!text) return null;
  const m = text.match(/^([1-3]?\s?[A-Za-z\u00C0-\u024F.\- ]+?)\s*(\d+)/);
  if (!m) return null;
  const bookPart = m[1].trim().toLowerCase().replace(/\.$/, "");
  const chapter = parseInt(m[2], 10);
  let book = BOOK_ALIAS_INDEX[bookPart];
  if (!book) {
    const candidates = Object.keys(BOOK_ALIAS_INDEX).filter((a) => a.startsWith(bookPart) || bookPart.startsWith(a));
    if (candidates.length) book = BOOK_ALIAS_INDEX[candidates[0]];
  }
  if (!book) return null;
  return { book, chapter };
}

let mediaCurrentSheetKey = null;

function availableMediaSheets() {
  return (CONFIG.READING_MEDIA_SHEETS || []).filter((s) => s.csvUrl && s.csvUrl.trim());
}

async function showMediaPanel() {
  const sheets = availableMediaSheets();
  hideAllPanels();
  const panel = el("mediaPanel");
  panel.hidden = false;

  if (!sheets.length) {
    panel.innerHTML = `<h2>🎧 Bacaan Bersuara</h2><p class="media-empty">Belum ada sheet bacaan bersuara yang dikonfigurasi. Tambahkan URL CSV-nya di <code>js/config.js</code> bagian <code>READING_MEDIA_SHEETS</code>.</p>`;
    return;
  }

  if (!mediaCurrentSheetKey || !sheets.some((s) => s.key === mediaCurrentSheetKey)) {
    mediaCurrentSheetKey = sheets[0].key;
  }

  renderMediaPanelShell(panel, sheets);
  await loadAndRenderMediaList(sheets.find((s) => s.key === mediaCurrentSheetKey));
}

function renderMediaPanelShell(panel, sheets) {
  panel.innerHTML = `
    <h2>🎧 Bacaan Bersuara</h2>
    <p class="media-sub">Dengarkan (MP3), tonton (MP4/YouTube), atau buka langsung pasalnya di pembaca.</p>
    <div class="media-controls">
      <select id="mediaSheetSelect" class="columns-lang-select"></select>
      <button type="button" id="mediaResyncBtn" class="chip-btn small">🔄 Sinkronkan ulang</button>
    </div>
    <div id="mediaList" class="media-list"></div>
  `;
  const sel = el("mediaSheetSelect");
  sel.innerHTML = sheets.map((s) => `<option value="${s.key}">${s.label}</option>`).join("");
  sel.value = mediaCurrentSheetKey;
  sel.addEventListener("change", async () => {
    mediaCurrentSheetKey = sel.value;
    await loadAndRenderMediaList(sheets.find((s) => s.key === mediaCurrentSheetKey));
  });
  el("mediaResyncBtn").addEventListener("click", async () => {
    const sheet = sheets.find((s) => s.key === mediaCurrentSheetKey);
    el("mediaList").innerHTML = `<p class="media-empty">Mengambil data terbaru…</p>`;
    try {
      const rows = await fetchMediaSheet(sheet);
      renderMediaRows(rows);
    } catch (e) {
      el("mediaList").innerHTML = `<p class="media-empty">Gagal mengambil data: ${e.message}</p>`;
    }
  });
}

async function loadAndRenderMediaList(sheet) {
  const listEl = el("mediaList");
  const cached = loadMediaFromCache(sheet.key);
  if (cached && cached.rows && cached.rows.length) {
    renderMediaRows(cached.rows);
  } else {
    listEl.innerHTML = `<p class="media-empty">Mengambil data…</p>`;
    try {
      const rows = await fetchMediaSheet(sheet);
      renderMediaRows(rows);
    } catch (e) {
      listEl.innerHTML = `<p class="media-empty">Gagal mengambil data: ${e.message}</p>`;
    }
  }
}

function driveOpenUrl(url) {
  if (!url) return "";
  // Link "Bagikan" Google Drive standar (…/file/d/ID) tidak selalu langsung
  // bisa diputar; "/view" membuka pratinjau Drive yang punya tombol putar.
  if (/drive\.google\.com\/file\/d\//.test(url) && !/\/(view|preview)/.test(url)) {
    return url.replace(/\/?$/, "/view");
  }
  return url;
}

function renderMediaRows(rows) {
  const listEl = el("mediaList");
  if (!rows.length) {
    listEl.innerHTML = `<p class="media-empty">Sheet ini kosong.</p>`;
    return;
  }
  listEl.innerHTML = "";
  rows.forEach((row) => {
    const item = document.createElement("div");
    item.className = "media-item";

    const refBtn = document.createElement("button");
    refBtn.type = "button";
    refBtn.className = "media-ref-btn";
    refBtn.innerHTML = `<span class="media-no">${row.no}</span><span>${row.pembacaan}</span>`;
    refBtn.addEventListener("click", () => {
      const guess = guessReferenceFromPembacaan(row.pembacaan);
      if (!guess) {
        alert("Tidak bisa menebak kitab/pasal dari: " + row.pembacaan);
        return;
      }
      if (!bookAvailableInLang(currentLang, guess.book.num)) {
        showLangUnavailable();
        return;
      }
      renderChapter(guess.book.num, guess.chapter);
    });
    item.appendChild(refBtn);

    const linksWrap = document.createElement("div");
    linksWrap.className = "media-links";
    if (row.mp3) linksWrap.appendChild(mediaLinkButton("🎵 MP3", row.mp3));
    if (row.mp4) linksWrap.appendChild(mediaLinkButton("🎬 MP4", row.mp4));
    if (row.youtube) linksWrap.appendChild(mediaLinkButton("▶️ YouTube", row.youtube));
    if (!row.mp3 && !row.mp4 && !row.youtube) {
      const span = document.createElement("span");
      span.className = "media-none";
      span.textContent = "Belum ada link";
      linksWrap.appendChild(span);
    }
    item.appendChild(linksWrap);

    listEl.appendChild(item);
  });
}

function mediaLinkButton(label, url) {
  const a = document.createElement("a");
  a.href = driveOpenUrl(url);
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.className = "chip-btn small media-link-btn";
  a.textContent = label;
  return a;
}

function initMediaControl() {
  const btn = el("mediaToggle");
  if (!btn) return;
  if (!availableMediaSheets().length) {
    btn.hidden = true; // sembunyikan tombol kalau belum ada sheet yang dikonfigurasi
    return;
  }
  btn.addEventListener("click", () => {
    showMediaPanel();
    closeSidebarOnMobile();
  });
}
