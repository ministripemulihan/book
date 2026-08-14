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

// Ambil field apa pun namanya dari kolom Book Number / BookNumber / no kitab
function rowNum(r, keys) {
  for (const k of keys) {
    if (r[k] !== undefined && r[k] !== "") return parseInt(String(r[k]).trim(), 10);
  }
  return NaN;
}
function rowStr(r, keys) {
  for (const k of keys) {
    if (r[k] !== undefined && String(r[k]).trim() !== "") return String(r[k]).trim();
  }
  return "";
}

// ---------------- Sheet A: Pokok Kitab ----------------
async function fetchPokokKitabSheet() {
  const url = outlineSheetsConfig().pokokKitabCsvUrl;
  if (!url || !url.trim()) return [];
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Gagal mengambil Pokok Kitab (" + res.status + ")");
  const records = parseCSV(await res.text());
  const rows = records.map((r) => ({
    bookNum: rowNum(r, ["book number", "booknumber", "no kitab"]),
    bookName: rowStr(r, ["book name", "bookname"]),
    lang: rowStr(r, ["bahasa", "language", "lang"]).toLowerCase(),
    pokok: rowStr(r, ["pokok kitab", "pokok"]),
  })).filter((r) => r.bookNum && r.pokok);
  saveOutlineToCache("pokok", rows);
  return rows;
}

// ---------------- Sheet B: Garis Besar (nested) ----------------
async function fetchGarisBesarSheet() {
  const url = outlineSheetsConfig().garisBesarCsvUrl;
  if (!url || !url.trim()) return [];
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Gagal mengambil Garis Besar (" + res.status + ")");
  const records = parseCSV(await res.text());
  const rows = records.map((r) => ({
    bookNum: rowNum(r, ["book number", "booknumber", "no kitab"]),
    lang: rowStr(r, ["bahasa", "language", "lang"]).toLowerCase(),
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
  if (!url || !url.trim()) return [];
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Gagal mengambil Peta+Gambar (" + res.status + ")");
  const records = parseCSV(await res.text());
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

// Sinkron ulang ketiganya langsung dari server (tombol "sinkron ulang").
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

// Teks "Pokok Kitab" untuk satu kitab+bahasa tertentu (fallback ke
// bahasa Indonesia kalau bahasa aktif belum diisi).
async function getPokokKitabFor(bookNum, lang) {
  const rows = await pokokKitabRows();
  if (!rows.length) return null;
  const hit = rows.find((r) => r.bookNum === bookNum && r.lang === (lang || "").toLowerCase())
    || rows.find((r) => r.bookNum === bookNum && r.lang === "ind");
  return hit ? hit.pokok : null;
}

// Semua entri Garis Besar untuk satu kitab+bahasa, terurut level besar->kecil
// lalu urutan pasal:ayat -- dipakai untuk panel "📋 Garis Besar Kitab" (TOC).
async function getOutlineForBook(bookNum, lang) {
  const rows = await garisBesarRows();
  const filtered = rows.filter((r) => r.bookNum === bookNum && r.lang === (lang || "").toLowerCase());
  filtered.sort((a, b) => {
    if (a.chapterStart !== b.chapterStart) return a.chapterStart - b.chapterStart;
    if (a.verseStart !== b.verseStart) return a.verseStart - b.verseStart;
    return a.level - b.level;
  });
  return filtered;
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
