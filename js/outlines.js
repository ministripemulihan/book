// ============================================================
//  POKOK KITAB / GARIS BESAR (nested) / PETA+GAMBAR -- per kitab.
//  TIGA sheet TERPISAH lagi (lihat CONFIG.OUTLINE_SHEETS di
//  js/config.js) -- BUKAN sumber teks Alkitab, hanya info tambahan
//  yang ditampilkan sebelum/di sekitar ayat saat membaca.
//
//  Data di-cache di localStorage (kecil, bukan IndexedDB) supaya
//  kunjungan berikutnya instan -- pola & gaya sama persis dengan
//  js/media.js supaya konsisten.
//
//  CATATAN: penyuntingan isi ketiga sheet ini untuk saat ini dilakukan
//  LANGSUNG di Google Sheet-nya (sama seperti sheet Alkitab utama),
//  BUKAN lewat menu di dalam aplikasi -- lihat README.md bagian
//  "Pokok Kitab / Garis Besar / Peta+Gambar" untuk rencana tahap
//  berikutnya (form edit khusus administrator di dalam aplikasi).
// ============================================================
const OUTLINE_CACHE_PREFIX = "bible_app_outline_v1_";

function outlineCacheKey(name) {
  return OUTLINE_CACHE_PREFIX + name;
}

function loadOutlineFromCache(name) {
  try {
    const raw = localStorage.getItem(outlineCacheKey(name));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveOutlineToCache(name, rows) {
  try {
    localStorage.setItem(
      outlineCacheKey(name),
      JSON.stringify({ rows, fetchedAt: new Date().toISOString() })
    );
  } catch (e) {
    /* localStorage penuh -- diabaikan, fitur tetap jalan tanpa cache */
  }
}

function outlineSheetsConfig() {
  return (typeof CONFIG !== "undefined" && CONFIG.OUTLINE_SHEETS) || {};
}

// Ambil field apa pun namanya dari kolom Book Number / BookNumber / no kitab.
// Dicocokkan secara LONGGAR (dibuang semua spasi/tanda baca, huruf kecil
// semua) supaya tidak gagal cuma gara-gara beda spasi/tanda "/" dst di judul
// kolom Google Sheet (mis. "Link Peta / Gambar" vs "Link Peta/Gambar").
function normalizeHeaderKey(k) {
  return String(k || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}
function findFieldLoose(r, candidateKeys) {
  const wanted = candidateKeys.map(normalizeHeaderKey);
  for (const key of Object.keys(r)) {
    if (wanted.includes(normalizeHeaderKey(key))) return r[key];
  }
  return "";
}
function rowNum(r, keys) {
  const v = findFieldLoose(r, keys);
  if (v === undefined || v === "") return NaN;
  return parseInt(String(v).trim(), 10);
}
function rowStr(r, keys) {
  const v = findFieldLoose(r, keys);
  return v === undefined ? "" : String(v).trim();
}

// Alias nama bahasa -> kode bahasa yang dipakai CONFIG.LANGUAGES (lihat
// js/config.js). Kolom "Bahasa" di sheet Pokok Kitab / Garis Besar sering
// diisi orang dengan kata biasa ("Indonesia", "Inggris", dst), BUKAN kode
// singkatnya persis ("ind", "eng") -- kalau dicocokkan APA ADANYA (persis),
// baris itu tidak akan pernah ketemu sama sekali walau datanya sudah benar.
// Alias di bawah ini menerjemahkan variasi umum itu ke kode yang benar.
const LANG_NAME_ALIASES = {
  "indonesia": "ind", "bahasaindonesia": "ind", "id": "ind", "indo": "ind", "ind": "ind", "tb": "ind",
  "indonesiarecovery": "rvind", "recoveryindonesia": "rvind", "rvind": "rvind",
  "inggris": "eng", "english": "eng", "en": "eng", "eng": "eng",
  "kingjames": "kjv", "kjv": "kjv", "inggriskjv": "kjv",
  "inggrisrecovery": "rveng", "recoveryenglish": "rveng", "rveng": "rveng",
  "tionghoa": "chs", "mandarin": "chs", "chinese": "chs", "chs": "chs", "中文": "chs",
  "tionghoasederhana": "chssmp", "simplifiedchinese": "chssmp", "chssmp": "chssmp",
  "jawa": "jawa", "javanese": "jawa",
};
function normalizeLangValue(raw) {
  const key = normalizeHeaderKey(raw);
  return LANG_NAME_ALIASES[key] || String(raw || "").trim().toLowerCase();
}

// Ukuran (byte) ASLI dari unduhan TERAKHIR tiap sheet outline -- dipakai
// supaya total ukuran unduhan data (Alkitab + ketiga sheet ini) bisa
// DIHITUNG OTOMATIS OLEH PROGRAM (lihat totalOutlineBytesLastSync() di
// bawah & syncFromServer() di js/app.js), BUKAN diketik manual siapa pun.
let _lastOutlineFetchBytes = { pokok: 0, garisBesar: 0, peta: 0 };
function totalOutlineBytesLastSync() {
  return (_lastOutlineFetchBytes.pokok || 0) + (_lastOutlineFetchBytes.garisBesar || 0) + (_lastOutlineFetchBytes.peta || 0);
}

// ------------------------------------------------------------
//  Bersihkan teks "Pokok Kitab" jadi HTML yang AMAN & RAPI, siap
//  dipasang langsung lewat innerHTML (bukan lagi ditampilkan sebagai
//  teks mentah yang isinya kelihatan tanda "<p>", "<strong>" dst apa
//  adanya). Dipakai terutama untuk kolom Inggris, yang di sheet-nya
//  sering berisi markup HTML yang agak "rusak" hasil salin-tempel
//  (mis. <strong> dibuka di satu <p> tapi baru ditutup 1-2 <p>
//  KEMUDIAN, harusnya ditutup di <p> yang sama). Kolom Indonesia &
//  Mandarin biasanya teks polos tanpa tag sama sekali -- itu dilewatkan
//  sebagai teks biasa (di-escape, baris baru jadi <br>).
// ------------------------------------------------------------
const POKOK_HTML_ALLOWED_TAGS = new Set(["P", "BR", "B", "STRONG", "I", "EM", "SUP", "SUB"]);

function escapeHtmlForPokok(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function cleanPokokKitabHtml(raw) {
  const str = String(raw == null ? "" : raw).trim();
  if (!str) return "";

  // Tidak ada tag HTML sama sekali (kasus paling umum utk Indonesia &
  // Mandarin) -- escape saja & ubah baris baru jadi <br>.
  if (!/<[a-z][^>]*>/i.test(str)) {
    return escapeHtmlForPokok(str).replace(/\r\n|\r|\n/g, "<br>");
  }

  let html = str;

  // Rapikan pola paling sering rusak: "<p> <strong> X1 </p><p> X2 </p>
  // ...<p> Xn </p><p></strong></p>" -- strong dibuka di paragraf
  // PERTAMA tapi baru ditutup di paragraf TERAKHIR (kosong, cuma
  // berisi tag penutup), padahal seharusnya ditutup per-paragraf
  // sendiri². Dua-tiga baris judul kitab (mis. "The Epistle of Paul" /
  // "to the" / "ROMANS") maupun label satu baris (mis. "Subject:")
  // sama-sama memakai pola ini.
  //  - Kalau baris pertama berupa LABEL yang diakhiri ":" DAN cuma ada
  //    persis 2 baris (mis. "Subject:" + isinya) -> gabung jadi SATU
  //    baris "Label: isi" (label tebal, isi menyusul di baris yang sama).
  //  - Selain itu (judul kitab 2-3 baris) -> setiap baris jadi
  //    paragraf sendiri, semuanya tetap tebal.
  html = html.replace(
    /<p>\s*<strong>\s*([\s\S]*?)\s*<p>\s*<\/strong>\s*<\/p>/gi,
    (m, inner) => {
      const lines = inner.split(/<\/p>\s*<p>/i).map((s) => s.trim()).filter(Boolean);
      if (!lines.length) return "";
      if (lines.length === 2 && /:\s*$/.test(lines[0])) {
        return `<p><strong>${lines[0]}</strong> ${lines[1]}</p>`;
      }
      return lines.map((line) => `<p><strong>${line}</strong></p>`).join("");
    }
  );

  // Buang paragraf kosong (cuma spasi/&nbsp;, atau cuma tag stray
  // seperti "</strong>" yatim yang tersisa) yang tersisa.
  html = html.replace(/<p>\s*(?:&nbsp;|<\/?strong>|<\/?b>)*\s*<\/p>/gi, "");

  if (typeof document === "undefined") return html; // (mis. dites di Node tanpa DOM)

  // Tahap terakhir: whitelist tag -- parse ke elemen sementara, buang
  // tag/atribut apa pun DI LUAR daftar putih (tapi teksnya tetap
  // disimpan), supaya aman dari <script>/<img onerror=...> dst kalau
  // suatu saat isi sheet-nya ditulis sembarangan.
  const holder = document.createElement("div");
  holder.innerHTML = html;
  (function walk(node) {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 1) {
        if (!POKOK_HTML_ALLOWED_TAGS.has(child.tagName)) {
          child.replaceWith(document.createTextNode(child.textContent));
          return;
        }
        [...child.attributes].forEach((a) => child.removeAttribute(a.name));
        walk(child);
      } else if (child.nodeType !== 3) {
        child.remove();
      }
    });
  })(holder);
  // Sapu terakhir: buang <p> yang ternyata kosong (mis. sisa dari tag
  // yatim seperti "</strong>" yang tidak menghasilkan apa-apa setelah
  // di-parse browser) supaya tidak ada baris kosong aneh saat tampil.
  holder.querySelectorAll("p").forEach((p) => {
    if (!p.textContent.trim()) p.remove();
  });
  return holder.innerHTML;
}

// ---------------- Sheet A: Pokok Kitab ----------------
async function fetchPokokKitabSheet() {
  const url = outlineSheetsConfig().pokokKitabCsvUrl;
  if (!url || !url.trim()) { _lastOutlineFetchBytes.pokok = 0; return []; }
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Gagal mengambil Pokok Kitab (" + res.status + ")");
  const csvText = await res.text();
  _lastOutlineFetchBytes.pokok = new Blob([csvText]).size;
  const records = parseCSV(csvText);
  const rows = records.map((r) => ({
    bookNum: rowNum(r, ["book number", "booknumber", "no kitab"]),
    bookName: rowStr(r, ["book name", "bookname"]),
    lang: normalizeLangValue(rowStr(r, ["bahasa", "language", "lang"])),
    pokok: cleanPokokKitabHtml(rowStr(r, ["pokok kitab", "pokok"])),
  })).filter((r) => r.bookNum && r.pokok);
  saveOutlineToCache("pokok", rows);
  return rows;
}

// ---------------- Sheet B: Garis Besar (nested) ----------------
async function fetchGarisBesarSheet() {
  const url = outlineSheetsConfig().garisBesarCsvUrl;
  if (!url || !url.trim()) { _lastOutlineFetchBytes.garisBesar = 0; return []; }
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Gagal mengambil Garis Besar (" + res.status + ")");
  const csvText = await res.text();
  _lastOutlineFetchBytes.garisBesar = new Blob([csvText]).size;
  const records = parseCSV(csvText);
  const rows = records.map((r) => ({
    bookNum: rowNum(r, ["book number", "booknumber", "no kitab"]),
    lang: normalizeLangValue(rowStr(r, ["bahasa", "language", "lang"])),
    chapterStart: rowNum(r, ["chapter start", "chapterstart", "pasal awal"]),
    verseStart: rowNum(r, ["verse start", "versestart", "ayat awal"]),
    chapterEnd: rowNum(r, ["chapter end", "chapterend", "pasal akhir"]),
    verseEnd: rowNum(r, ["verse end", "verseend", "ayat akhir"]),
    level: rowNum(r, ["level"]) || 1,
    ringkasan: rowStr(r, ["ringkasan", "summary", "garis besar"]),
  })).filter((r) => r.bookNum && r.chapterStart && r.verseStart && r.ringkasan);
  saveOutlineToCache("garis_besar", rows);
  return rows;
}

// ---------------- Sheet C: Peta & Gambar ----------------
async function fetchPetaGambarSheet() {
  const url = outlineSheetsConfig().petaGambarCsvUrl;
  if (!url || !url.trim()) { _lastOutlineFetchBytes.peta = 0; return []; }
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Gagal mengambil Peta+Gambar (" + res.status + ")");
  const csvText = await res.text();
  _lastOutlineFetchBytes.peta = new Blob([csvText]).size;
  const records = parseCSV(csvText);
  const rows = records.map((r) => ({
    bookNum: rowNum(r, ["book number", "booknumber", "no kitab"]),
    bookName: rowStr(r, ["book name", "bookname"]),
    link: rowStr(r, ["link peta/gambar (google drive)", "link peta gambar", "link", "url"]),
  })).filter((r) => r.bookNum && r.link);
  saveOutlineToCache("peta_gambar", rows);
  return rows;
}

// Ambil rows dari cache kalau ada, kalau belum pernah, ambil dari server sekali.
async function getRowsCachedOrFetch(name, fetchFn) {
  const cached = loadOutlineFromCache(name);
  if (cached && cached.rows && cached.rows.length) return cached.rows;
  try {
    return await fetchFn();
  } catch (e) {
    return [];
  }
}

async function pokokKitabRows() { return getRowsCachedOrFetch("pokok", fetchPokokKitabSheet); }
async function garisBesarRows() { return getRowsCachedOrFetch("garis_besar", fetchGarisBesarSheet); }
async function petaGambarRows() { return getRowsCachedOrFetch("peta_gambar", fetchPetaGambarSheet); }

// ------------------------------------------------------------
//  VERSI "SYNC-DARI-CACHE-SAJA" (tanpa await/network) -- dipakai supaya
//  baris "📌 Pokok / 📋 Garis Besar / 🗺️ Peta+Gambar" di atas grid nomor
//  pasal bisa dirender BERSAMAAN dengan grid-nya sendiri (satu kali cat
//  layar saja), BUKAN disisipkan belakangan setelah fetch async selesai.
//  Itulah penyebab bug lama: baris info nongol belakangan -> nomor pasal
//  di bawahnya ikut turun -> jari yang sudah menyasar ke nomor pasal
//  malah kena tombol yang baru muncul. Kalau cache belum ada sama sekali
//  (pengguna belum pernah sinkron), fungsi ini mengembalikan null supaya
//  pemanggilnya tahu harus jatuh balik ke cara lama (async, hanya terjadi
//  SEKALI di percobaan pertama sebelum ada cache).
// ------------------------------------------------------------
function pokokKitabRowsFromCacheOnly() {
  const c = loadOutlineFromCache("pokok");
  return c && c.rows ? c.rows : null;
}
function garisBesarRowsFromCacheOnly() {
  const c = loadOutlineFromCache("garis_besar");
  return c && c.rows ? c.rows : null;
}
function petaGambarRowsFromCacheOnly() {
  const c = loadOutlineFromCache("peta_gambar");
  return c && c.rows ? c.rows : null;
}

// Sinkron ulang ketiganya langsung dari server -- dipanggil otomatis dari
// syncFromServer() di js/app.js setiap kali tombol menu ⋮ → "Sinkronkan
// ulang Alkitab" / "Unduh Data Alkitab" ditekan, jadi tidak perlu tombol
// terpisah lagi.
async function resyncAllOutlineSheets() {
  const [pokok, garisBesar, peta] = await Promise.all([
    fetchPokokKitabSheet().catch(() => []),
    fetchGarisBesarSheet().catch(() => []),
    fetchPetaGambarSheet().catch(() => []),
  ]);
  return { pokok, garisBesar, peta };
}

// ------------------------------------------------------------
//  HELPER TAMPILAN
// ------------------------------------------------------------

// Cari satu baris Pokok Kitab yang cocok dari daftar `rows` (fallback ke
// bahasa Indonesia kalau bahasa aktif belum diisi, lalu fallback ke
// bahasa APA SAJA yang tersedia untuk kitab itu -- lebih baik tampil
// dalam bahasa lain daripada tidak tampil sama sekali). Fungsi MURNI
// (tidak fetch apa-apa) supaya bisa dipakai baik oleh versi async
// (getPokokKitabFor) maupun versi sync-dari-cache (dipakai renderChapterPickerExtra
// di js/app.js supaya tidak ada jeda yang menggeser tombol pasal).
function pickPokokRowFor(rows, bookNum, lang) {
  if (!rows || !rows.length) return null;
  const wanted = normalizeLangValue(lang);
  return rows.find((r) => r.bookNum === bookNum && r.lang === wanted)
    || rows.find((r) => r.bookNum === bookNum && r.lang === "ind")
    || rows.find((r) => r.bookNum === bookNum)
    || null;
}

// Teks (HTML aman, sudah dibersihkan -- lihat cleanPokokKitabHtml di
// fetchPokokKitabSheet) "Pokok Kitab" untuk satu kitab+bahasa tertentu.
async function getPokokKitabFor(bookNum, lang) {
  const rows = await pokokKitabRows();
  const hit = pickPokokRowFor(rows, bookNum, lang);
  return hit ? hit.pokok : null;
}

// Semua entri Garis Besar untuk satu kitab+bahasa, terurut level besar->kecil
// lalu urutan pasal:ayat -- dipakai untuk panel "📋 Garis Besar Kitab" (TOC).
// Sama seperti Pokok Kitab: fallback ke bahasa Indonesia lalu ke bahasa
// apa saja yang tersedia, supaya tidak "hilang" hanya karena kode bahasa
// tidak persis cocok.
// Fungsi MURNI (tidak fetch) -- lihat catatan di pickPokokRowFor di atas,
// alasan sama: dipakai ulang oleh versi async & versi sync-dari-cache.
function pickOutlineRowsForBook(rows, bookNum, lang) {
  const forBook = (rows || []).filter((r) => r.bookNum === bookNum);
  const wanted = normalizeLangValue(lang);
  let filtered = forBook.filter((r) => r.lang === wanted);
  if (!filtered.length) filtered = forBook.filter((r) => r.lang === "ind");
  if (!filtered.length) filtered = forBook;
  filtered.sort((a, b) => {
    if (a.chapterStart !== b.chapterStart) return a.chapterStart - b.chapterStart;
    if (a.verseStart !== b.verseStart) return a.verseStart - b.verseStart;
    return a.level - b.level;
  });
  return filtered;
}

async function getOutlineForBook(bookNum, lang) {
  const rows = await garisBesarRows();
  return pickOutlineRowsForBook(rows, bookNum, lang);
}

// Entri Garis Besar yang MULAI PERSIS di ayat ini (chapter:verse) --
// dipakai untuk disisipkan sebagai judul sebelum blok ayat tsb saat
// membaca pasal. Diurutkan level 1 (besar) dulu, baru level 2, 3, dst.
async function getOutlineHeadersForVerse(bookNum, lang, chapter, verse) {
  const all = await getOutlineForBook(bookNum, lang);
  return all
    .filter((r) => r.chapterStart === chapter && r.verseStart === verse)
    .sort((a, b) => a.level - b.level);
}

// Label rentang ayat, mis. "Kejadian 1:1-1:20" atau "Kejadian 1:2" kalau
// rentangnya cuma 1 ayat.
function outlineRangeLabel(bookName, entry) {
  const start = `${entry.chapterStart}:${entry.verseStart}`;
  const end = `${entry.chapterEnd}:${entry.verseEnd}`;
  const range = start === end ? start : `${start}-${end}`;
  return `${bookName} ${range}`;
}

// Semua link Peta/Gambar untuk satu kitab.
async function getMapImagesForBook(bookNum) {
  const rows = await petaGambarRows();
  return rows.filter((r) => r.bookNum === bookNum);
}

function anyOutlineFeatureAvailable() {
  const cfg = outlineSheetsConfig();
  return !!((cfg.pokokKitabCsvUrl && cfg.pokokKitabCsvUrl.trim()) ||
    (cfg.garisBesarCsvUrl && cfg.garisBesarCsvUrl.trim()) ||
    (cfg.petaGambarCsvUrl && cfg.petaGambarCsvUrl.trim()));
}
