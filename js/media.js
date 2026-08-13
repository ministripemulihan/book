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

// ------------------------------------------------------------
//  Mencari link 🎵MP3/🎬MP4/▶️YouTube untuk SATU kitab+pasal tertentu,
//  dengan mengecek SEMUA sheet Bacaan Bersuara yang sudah diisi di
//  CONFIG.READING_MEDIA_SHEETS. Dipakai oleh panel "📚 Kumpulan Ayat"
//  (js/app.js renderCollectionDetailInto()) supaya ayat yang disimpan ke
//  kumpulan tetap tersambung ke link dengar/tonton terbaru dari Google
//  Sheet -- di perangkat MANA PUN, tanpa perlu link itu ikut disimpan di
//  data kumpulannya sendiri (kalau linknya diganti di Sheet, kumpulan
//  lama otomatis ikut memakai yang terbaru).
//  Memakai cache lokal dulu kalau ada (instan); kalau sheet itu belum
//  pernah di-cache di perangkat ini, ambil sekali dari server.
// ------------------------------------------------------------
async function findMediaLinkForReference(bookNumber, chapter) {
  if (!bookNumber || !chapter) return null;
  for (const sheet of availableMediaSheets()) {
    let cached = loadMediaFromCache(sheet.key);
    let rows = cached && cached.rows;
    if (!rows || !rows.length) {
      try {
        rows = await fetchMediaSheet(sheet);
      } catch (e) {
        continue; // sheet ini gagal diambil (offline/URL salah) -- coba sheet berikutnya
      }
    }
    const hit = (rows || []).find((row) => {
      const guess = guessReferenceFromPembacaan(row.pembacaan);
      return guess && guess.book.num === bookNumber && guess.chapter === chapter;
    });
    if (hit && (hit.mp3 || hit.mp4 || hit.youtube)) {
      return { mp3: hit.mp3, mp4: hit.mp4, youtube: hit.youtube, label: hit.pembacaan };
    }
  }
  return null;
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

// ------------------------------------------------------------
//  RENCANA BACA BERBASIS BACAAN BERSUARA (digabung ke menu 📅 Rencana
//  Baca -- lihat js/app.js renderPlanChooser()/renderPlanDetail()).
//  Sebelumnya ini adalah panel/menu 🎧 terpisah; sekarang tiap sheet di
//  CONFIG.READING_MEDIA_SHEETS yang sudah diisi URL-nya muncul sebagai
//  SATU PILIHAN rencana baca, di mana tiap "hari" = satu baris di sheet
//  itu (label bacaan apa adanya dari kolom Pembacaan, + link MP3/MP4/
//  YouTube menempel di hari itu).
// ------------------------------------------------------------

function buildMediaScheduleFromRows(rows) {
  return rows.map((row) => {
    const guess = guessReferenceFromPembacaan(row.pembacaan);
    return [{
      bookNum: guess ? guess.book.num : null,
      chapter: guess ? guess.chapter : null,
      label: row.pembacaan,
      mp3: row.mp3 || "",
      mp4: row.mp4 || "",
      youtube: row.youtube || "",
    }];
  });
}

// Menyusun objek "plan" (struktur sama seperti rencana baca biasa, lihat
// js/plans.js) dari satu sheet Bacaan Bersuara. Memakai data cache lokal
// dulu kalau ada (instan), baru ambil dari server kalau belum pernah.
async function buildMediaPlan(sheet) {
  const cached = loadMediaFromCache(sheet.key);
  const rows = (cached && cached.rows && cached.rows.length) ? cached.rows : await fetchMediaSheet(sheet);
  const schedule = buildMediaScheduleFromRows(rows);
  return {
    planId: "media_" + sheet.key,
    label: "🎧 " + sheet.label,
    days: schedule.length,
    startDate: new Date().toISOString(),
    schedule,
    completed: new Array(schedule.length).fill(false),
    mediaSheetKey: sheet.key,
  };
}

// Menarik ulang data TERBARU dari Google Sheet untuk rencana yang sedang
// aktif (kalau rencana itu berbasis Bacaan Bersuara), lalu memasang
// kembali link/labelnya -- progres centang yang sudah ada TETAP dijaga
// (dicocokkan berdasar urutan/index hari, bukan dihapus dan mulai dari 0).
async function resyncMediaPlan(plan) {
  const sheet = (CONFIG.READING_MEDIA_SHEETS || []).find((s) => s.key === plan.mediaSheetKey);
  if (!sheet || !sheet.csvUrl) throw new Error("Sheet Bacaan Bersuara ini sudah tidak ada di konfigurasi.");
  const rows = await fetchMediaSheet(sheet); // selalu dari server (bukan cache), ini memang tombol "sinkron ulang"
  const schedule = buildMediaScheduleFromRows(rows);
  const oldCompleted = plan.completed || [];
  plan.schedule = schedule;
  plan.days = schedule.length;
  plan.completed = schedule.map((_, i) => !!oldCompleted[i]);
  return plan;
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
