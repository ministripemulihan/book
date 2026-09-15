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
  const rows = await fetchMediaSheetRows_(sheet);
  saveMediaToCache(sheet.key, rows);
  return rows;
}

// PENTING (diperbaiki 11 Sep 2026) -- SEBELUMNYA data Bacaan Bersuara
// (mp3/mp4/YouTube) SELALU diambil lewat link "Publish to Web" (CSV)
// Google Sheets (sheet.csvUrl). Link itu adalah SNAPSHOT yang disimpan
// terpisah oleh server Google sendiri: (1) baru ter-update beberapa
// saat setelah Sheet aslinya diedit (delay publikasi ulang), dan (2)
// kalau publikasinya sempat "Dihentikan" lalu diterbitkan ulang, Google
// memberi ID publikasi BARU -- link LAMA yang tertanam di
// CONFIG.READING_MEDIA_SHEETS jadi basi SELAMANYA walau isi Sheet
// aslinya sudah diedit berkali-kali (persis laporan operator: "sudah
// ditambah dari 2 jadi 4 link YouTube, tapi tidak muncul-muncul").
// SEKARANG: kalau Apps Script sudah dikonfigurasi (CONFIG.APPS_SCRIPT_URL,
// lihat js/sync.js), diutamakan mengambil data LANGSUNG dari
// spreadsheet-nya lewat Code.gs (readReadingMediaRows_(), type=
// "reading_media") -- ini SELALU membaca isi sel TERBARU apa adanya
// (SpreadsheetApp, bukan snapshot publikasi), tidak ada delay/basi sama
// sekali, dan ID spreadsheet-nya (beda dari link publikasi) tidak
// pernah berubah sendiri. sheet.csvUrl TETAP dipertahankan sebagai
// CADANGAN best-effort -- kalau Apps Script gagal/belum dikonfigurasi,
// jatuh balik ke cara lama supaya proyek yang belum sempat mengisi
// CONFIG.APPS_SCRIPT_URL tetap bisa jalan seperti sebelumnya.
async function fetchMediaSheetRows_(sheet) {
  if (typeof Sync !== "undefined" && Sync.enabled()) {
    try {
      const data = await Sync._get({ type: "reading_media", sheetKey: sheet.key });
      if (data && data.ok && Array.isArray(data.rows)) {
        return data.rows.map((r) => ({
          no: "",
          pembacaan: r.pembacaan || "",
          bagian: (r.bagian || "").trim(),
          mp3: (r.mp3 || "").trim(),
          mp4: (r.mp4 || "").trim(),
          youtube: (r.youtube || "").trim(),
        }));
      }
      // data.ok === false (mis. tab tidak ditemukan / ID spreadsheet
      // salah) -- tetap coba CSV cadangan di bawah, best-effort.
    } catch (e) {
      // Apps Script gagal terhubung (offline dst) -- coba CSV cadangan di bawah.
    }
  }
  if (!sheet.csvUrl) throw new Error("Gagal mengambil data Bacaan Bersuara (Apps Script gagal & csvUrl cadangan belum diisi untuk sheet ini).");
  const res = await fetch(sheet.csvUrl, { cache: "no-store" });
  if (!res.ok) throw new Error("Gagal mengambil data (" + res.status + ")");
  const text = await res.text();
  const records = parseCSV(text);
  // Normalisasi nama kolom (huruf besar/kecil & "no"/"nomor" bebas).
  // Kolom "Pembacaan"/nama kitab SENGAJA dicek dengan beberapa nama
  // header yang sudah diketahui DULU (Indonesia/Mandarin/Inggris) --
  // tapi kalau sheet-nya ternyata pakai header lain lagi (mis. typo,
  // spasi ekstra, atau bahasa lain), fallback ke KOLOM KE-2 apa adanya
  // (Object.values mengikuti urutan kolom asli sheet, terlepas dari
  // apa pun nama headernya) -- supaya tidak perlu menyeragamkan nama
  // header di Google Sheet-nya sama sekali, urutan kolom (No | [nama
  // kitab/pembacaan] | Link MP3 | Link MP4 | Youtube) sudah cukup.
  return records.map((r) => {
    const values = Object.values(r);
    return {
      no: r["no"] || r["nomor"] || values[0] || "",
      pembacaan:
        r["pembacaan"] ||
        r["kitab perjanjian baru (nama kitab)"] ||
        r["新约圣经书卷 (nama kitab)"] ||
        r["new testament book (nama kitab)"] ||
        values[1] ||
        "",
      // BARU -- kolom "Bagian" OPSIONAL (boleh kosong/tidak ada sama
      // sekali, sheet lama tetap jalan seperti biasa). Diisi kalau satu
      // bacaan (Pembacaan sama, ditulis di BEBERAPA BARIS BERURUTAN)
      // punya lebih dari satu voice note, mis. "Matius 5" bagian 1 & 2
      // -- lihat buildMediaScheduleFromRows() di bawah untuk cara
      // baris-baris itu digabung jadi satu hari dengan beberapa segmen.
      bagian: (r["bagian"] || r["part"] || "").trim(),
      mp3: (r["link mp3"] || "").trim(),
      mp4: (r["link mp4"] || "").trim(),
      youtube: (r["youtube"] || "").trim(),
    };
  });
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

  // BARU -- rentang PASAL (lintas pasal), mis. "Matius 6-7" atau
  // "Yohanes 14-16": kalau tepat setelah angka pasal pertama langsung ada
  // "-<angka>" TANPA titik dua di antaranya, itu rentang PASAL. Ini beda
  // dari rentang AYAT dalam pasal yang sama seperti "Kejadian 1:1-2:3"
  // atau "Amsal 27:1-27" -- di situ ada ":" sebelum tanda "-", jadi tidak
  // kena pola ini dan tetap diperlakukan seperti sebelumnya (endChapter =
  // chapter awal saja, best-effort seperti dulu).
  const rest = text.slice(m[0].length);
  const rangeMatch = rest.match(/^\s*-\s*(\d+)\b/);
  const endChapter = rangeMatch ? parseInt(rangeMatch[1], 10) : chapter;

  return { book, chapter, endChapter: endChapter >= chapter ? endChapter : chapter };
}

// ------------------------------------------------------------
// BARU (15 Sep 2026, permintaan operator: "saat dijalankan voice note
// itu, bisa ada info itu voice note mulai baca dari kitab mana dan
// sampai lintas pasal ke berapa?") -- parser rentang referensi LENGKAP
// (kitab + pasal AWAL + ayat awal + pasal AKHIR + ayat akhir), bukan
// cuma "kitab & pasal awal" seperti guessReferenceFromPembacaan() di
// atas. Dipakai supaya TIAP voice note (segmen) bisa menampilkan
// sendiri rentang bacaannya, mis.:
//     "Matius 5"        -> Matius 5
//     "Matius 5-7"      -> Matius 5–7            (lintas pasal)
//     "Matius 5:1-26"   -> Matius 5:1–26         (sebagian pasal)
//     "Matius 5:27-6:4" -> Matius 5:27–6:4       (lintas pasal, sebagian)
//     "Kejadian 1:1-2:3"-> Kejadian 1:1–2:3
// guessReferenceFromPembacaan() SENGAJA dibiarkan apa adanya (masih
// dipakai kode lain) -- fungsi ini tambahan di sebelahnya, tidak
// menggantikan.
// ------------------------------------------------------------
function matchBookFromAliasText_(bookPart) {
  if (!bookPart) return null;
  const key = bookPart.trim().toLowerCase().replace(/\.$/, "");
  let book = BOOK_ALIAS_INDEX[key];
  if (!book) {
    const candidates = Object.keys(BOOK_ALIAS_INDEX).filter((a) => a.startsWith(key) || key.startsWith(a));
    if (candidates.length) book = BOOK_ALIAS_INDEX[candidates[0]];
  }
  return book || null;
}

function parseReferenceRange(text) {
  if (!text) return null;
  const head = String(text).match(/^([1-3]?\s?[A-Za-z\u00C0-\u024F.\- ]+?)\s*(\d+)/);
  if (!head) return null;
  const book = matchBookFromAliasText_(head[1]);
  if (!book) return null;

  const startChapter = parseInt(head[2], 10);
  const rest = String(text).slice(head[0].length);

  // ":<ayat>" tepat setelah pasal awal (mis. "5:1..."), kalau ada.
  const vm = rest.match(/^\s*:\s*(\d+)/);
  const startVerse = vm ? parseInt(vm[1], 10) : null;
  const afterStart = vm ? rest.slice(vm[0].length) : rest;

  // Bagian setelah tanda hubung: bisa "-26" (ayat/pasal akhir saja)
  // atau "-6:4" (pasal:ayat akhir).
  const tail = afterStart.match(/^\s*[-\u2013\u2014]\s*(\d+)\s*(?::\s*(\d+))?/);
  let endChapter = startChapter;
  let endVerse = startVerse;
  if (tail) {
    const n1 = parseInt(tail[1], 10);
    const n2 = tail[2] != null ? parseInt(tail[2], 10) : null;
    if (n2 != null) {
      endChapter = n1;          // "5:27-6:4" -> pasal akhir 6, ayat akhir 4
      endVerse = n2;
    } else if (startVerse != null) {
      endChapter = startChapter; // "5:1-26" -> masih pasal 5, ayat akhir 26
      endVerse = n1;
    } else {
      endChapter = n1;           // "5-7" -> lintas pasal 5 s/d 7
      endVerse = null;
    }
  }
  if (endChapter < startChapter) endChapter = startChapter;

  return { book, startChapter, startVerse, endChapter, endVerse };
}

// Mengubah hasil parseReferenceRange() jadi teks rapi untuk ditampilkan,
// mis. "Matius 5:27–6:4". Memakai tanda pisah en-dash (–) supaya beda
// jelas dari tanda hubung nama kitab ("Hakim-hakim").
function formatReferenceRange(ref) {
  if (!ref || !ref.book) return "";
  const name = ref.book.name;
  const start = ref.startVerse != null
    ? `${name} ${ref.startChapter}:${ref.startVerse}`
    : `${name} ${ref.startChapter}`;
  const sameChapter = ref.endChapter === ref.startChapter;
  const sameVerse = (ref.endVerse || null) === (ref.startVerse || null);
  if (sameChapter && sameVerse) return start;
  if (sameChapter) return `${start}\u2013${ref.endVerse}`;
  return ref.endVerse != null
    ? `${start}\u2013${ref.endChapter}:${ref.endVerse}`
    : `${start}\u2013${ref.endChapter}`;
}

// Menggabungkan beberapa rentang (dari beberapa voice note/segmen dalam
// SATU bacaan) jadi satu rentang menyeluruh: dari yang PALING AWAL
// sampai yang PALING AKHIR. Dipakai untuk judul hari di Rencana Baca,
// mis. 2 voice note "Matius 5:1-26" + "Matius 5:27-6:4" ditampilkan
// sebagai "Matius 5:1–6:4 (2 voice note)".
function combineReferenceRanges(refs) {
  const valid = (refs || []).filter(Boolean);
  if (!valid.length) return null;
  const bookNum = valid[0].book.num;
  if (valid.some((r) => r.book.num !== bookNum)) return null; // beda kitab -- tidak digabung
  let out = {
    book: valid[0].book,
    startChapter: valid[0].startChapter,
    startVerse: valid[0].startVerse,
    endChapter: valid[0].endChapter,
    endVerse: valid[0].endVerse,
  };
  valid.forEach((r) => {
    if (r.startChapter < out.startChapter ||
        (r.startChapter === out.startChapter && (r.startVerse || 1) < (out.startVerse || 1))) {
      out.startChapter = r.startChapter;
      out.startVerse = r.startVerse;
    }
    if (r.endChapter > out.endChapter ||
        (r.endChapter === out.endChapter && (r.endVerse || 9999) > (out.endVerse || 9999))) {
      out.endChapter = r.endChapter;
      out.endVerse = r.endVerse;
    }
  });
  return out;
}

let mediaCurrentSheetKey = null;

function availableMediaSheets() {
  const appsScriptReady = typeof Sync !== "undefined" && Sync.enabled();
  return (CONFIG.READING_MEDIA_SHEETS || []).filter((s) => (s.csvUrl && s.csvUrl.trim()) || appsScriptReady);
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
// ------------------------------------------------------------
//  Memetakan kode bahasa TEKS Alkitab (CONFIG.LANGUAGES, mis. "ind",
//  "eng", "chs" -- lihat js/config.js) ke KEY sheet Bacaan Bersuara
//  yang sesuai (CONFIG.READING_MEDIA_SHEETS). Dipakai supaya saat
//  sedang membaca dalam bahasa Mandarin/Inggris, tombol 🎵MP3 dsb.
//  mengambil link dari sheet BAHASA YANG SAMA -- sebelumnya
//  findMediaLinkForReference() mengecek SEMUA sheet berurutan dan
//  berhenti di kecocokan PERTAMA (selalu sheet Indonesia lebih dulu di
//  CONFIG.READING_MEDIA_SHEETS), jadi walau sedang membaca versi
//  Mandarin/Inggris, link yang muncul selalu link BAHASA INDONESIA --
//  itulah sebab laporan "link MP3 Mandarin/Inggris kok tidak sama".
// ------------------------------------------------------------
const MEDIA_LANG_SHEET_KEYS = {
  ind: ["pl_ind", "pb_ind"],
  rvind: ["pl_ind", "pb_ind"],
  jawa: ["pl_ind", "pb_ind"],
  kjv: ["pb_inggris"],
  eng: ["pb_inggris"],
  rveng: ["pb_inggris"],
  chs: ["pb_mandarin"],
  chssmp: ["pb_mandarin"],
};

// Susun ulang urutan sheet yang akan dicek: sheet yang cocok dengan
// `lang` (bahasa teks yang sedang dibaca) DIDAHULUKAN, sisanya tetap
// jadi cadangan (kalau sheet bahasa itu belum ada linknya untuk pasal
// ini, tetap coba bahasa lain daripada tidak menampilkan apa-apa).
function orderedMediaSheetsForLang(lang) {
  const all = availableMediaSheets();
  const preferredKeys = MEDIA_LANG_SHEET_KEYS[lang] || [];
  if (!preferredKeys.length) return all;
  const preferred = [];
  const rest = [];
  all.forEach((s) => {
    (preferredKeys.includes(s.key) ? preferred : rest).push(s);
  });
  return preferred.concat(rest);
}

async function findMediaLinkForReference(bookNumber, chapter, lang) {
  if (!bookNumber || !chapter) return null;
  for (const sheet of orderedMediaSheetsForLang(lang)) {
    let cached = loadMediaFromCache(sheet.key);
    let rows = cached && cached.rows;
    if (!rows || !rows.length) {
      try {
        rows = await fetchMediaSheet(sheet);
      } catch (e) {
        continue; // sheet ini gagal diambil (offline/URL salah) -- coba sheet berikutnya
      }
    }
    // Dibangun lewat buildMediaScheduleFromRows() (bukan mengecek row
    // mentah satu-satu) supaya baris yang sudah digabung jadi beberapa
    // segmen (voice note multi-bagian) DAN rentang lintas pasal
    // (endChapter) ikut diperhitungkan di sini juga -- pasal 7 dari
    // "Matius 6-7" tetap ketemu voice note-nya, bukan cuma pasal 6.
    const schedule = buildMediaScheduleFromRows(rows || []);
    const hitDay = schedule.find((dayItems) => {
      const it = dayItems[0];
      if (!it || it.bookNum !== bookNumber || it.chapter == null) return false;
      const end = it.endChapter != null ? it.endChapter : it.chapter;
      return chapter >= it.chapter && chapter <= end;
    });
    const it = hitDay && hitDay[0];
    if (it && mediaBlockHasContent(it)) {
      return { segments: it.segments, label: it.label, mp3: it.mp3, mp4: it.mp4, youtube: it.youtube };
    }
  }
  return null;
}

// Helper: apakah suatu objek media (item jadwal ATAU hasil
// findMediaLinkForReference) punya isi (mp3/mp4/youtube) di SALAH SATU
// segmennya. Dipakai supaya pemanggil tidak perlu tahu bedanya bentuk
// lama ({mp3,mp4,youtube}) vs bentuk baru ({segments:[...]}).
function mediaBlockHasContent(media) {
  if (!media) return false;
  if (media.segments && media.segments.length) {
    return media.segments.some((s) => s && (s.mp3 || s.mp4 || s.youtube));
  }
  return !!(media.mp3 || media.mp4 || media.youtube);
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

// Versi BULAT (ikon saja, tanpa tulisan) dari mediaLinkButton() di atas --
// dipakai di tempat yang butuh baris tombol padat berisi ikon-ikon saja
// (mis. toolbar bawah layar baca Kidung), sama gayanya dengan
// roundMediaButton() tapi ini <a> (buka/unduh link apa adanya), bukan
// <button> (buka pemutar sebaris).
function roundMediaLinkButton(icon, title, url) {
  const a = document.createElement("a");
  a.href = driveOpenUrl(url);
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.className = "round-media-btn";
  a.textContent = icon;
  a.title = title;
  a.setAttribute("aria-label", title);
  return a;
}

// ------------------------------------------------------------
//  PEMUTAR MEDIA "SEBARIS" (inline) -- dulu tombol MP3/MP4/YouTube
//  membuka TAB BARU (target="_blank"), yang di HP suka tertutup sendiri
//  atau suaranya berhenti begitu berpindah aplikasi/kunci layar (tab
//  baru gampang dihentikan paksa oleh sistem HP untuk hemat baterai).
//  Sekarang tombolnya BULAT (mis. 🎵/🎬/▶️) dan saat ditekan, pemutarnya
//  langsung muncul DI HALAMAN YANG SAMA (tanpa tab baru) -- supaya ayat
//  & catatan tetap kelihatan sambil mendengarkan/menonton. MediaSession
//  API juga dipasang (lihat wireMediaSession()) supaya pemutaran audio/
//  video lebih tahan saat layar dikunci.
// ------------------------------------------------------------
// ------------------------------------------------------------
//  GOOGLE DRIVE — helper mengenali & membangun link Drive.
//  Link yang dipakai pengguna di sheet bisa dalam beberapa bentuk:
//    - https://drive.google.com/open?id=FILE_ID
//    - https://drive.google.com/file/d/FILE_ID/view
//    - https://drive.google.com/uc?id=FILE_ID&export=download
//  Semuanya berisi FILE_ID yang sama, hanya bentuk URL-nya beda.
// ------------------------------------------------------------
function driveFileIdFromUrl(url) {
  if (!url) return null;
  let m = String(url).match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1];
  m = String(url).match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1];
  return null;
}
function isDriveUrl(url) {
  return /drive\.google\.com/.test(String(url || ""));
}

function driveOpenUrl(url) {
  if (!url) return "";
  // Selalu arahkan ke halaman "/view" resmi Drive (paling andal dibuka
  // manual di tab baru / dibagikan), dari FILE_ID-nya berapa pun bentuk
  // link aslinya (…/open?id=, …/uc?id=, …/file/d/…).
  const id = driveFileIdFromUrl(url);
  if (id) return `https://drive.google.com/file/d/${id}/view`;
  return url;
}

// URL "preview" Drive -- INI yang bisa ditanam (embed) di <iframe> dan
// benar-benar memutar audio/video-nya langsung di halaman, TIDAK seperti
// "/view" atau "/open?id=" yang cuma bisa dibuka penuh satu halaman
// (dan TIDAK BISA dipasang sebagai src <audio>/<video> biasa -- itulah
// sebab MP3/MP4 dari Drive sebelumnya gagal diputar sama sekali: kode lama
// memasang link halaman Drive itu langsung ke `<audio src="...">`, padahal
// itu halaman HTML, bukan berkas suara/video mentah, jadi browser tidak
// bisa memutarnya).
function driveEmbedPreviewUrl(url) {
  const id = driveFileIdFromUrl(url);
  return id ? `https://drive.google.com/file/d/${id}/preview` : null;
}

function roundMediaButton(icon, title) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "round-media-btn";
  b.textContent = icon;
  b.title = title;
  b.setAttribute("aria-label", title);
  return b;
}

// Tombol kecil "🔗 Share" di sebelah tombol bulat MP3/MP4/YouTube -- memakai
// Web Share API kalau didukung (muncul pilihan WhatsApp/Telegram dst bawaan
// HP), atau fallback menyalin link ke clipboard di komputer/browser yang
// tidak mendukung Web Share.
function shareMediaButton(url, label) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "round-media-btn share-variant";
  b.textContent = "🔗";
  b.title = "Bagikan link " + label;
  b.setAttribute("aria-label", "Bagikan link " + label);
  b.addEventListener("click", async () => {
    const shareUrl = driveOpenUrl(url);
    if (navigator.share) {
      try {
        await navigator.share({ title: label, url: shareUrl });
        return;
      } catch (e) {
        /* dibatalkan pengguna atau tidak didukung -- lanjut ke fallback salin */
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      b.textContent = "✅";
      setTimeout(() => { b.textContent = "🔗"; }, 1500);
    } catch (e) {
      window.prompt("Salin link ini:", shareUrl);
    }
  });
  return b;
}

// Memasang metadata & tombol kontrol MediaSession (kalau didukung browser)
// supaya OS memperlakukan halaman ini sebagai "sedang memutar media" --
// muncul di kontrol layar kunci, dan cenderung TIDAK dihentikan paksa saat
// layar dikunci / berpindah aplikasi sebentar. CATATAN JUJUR: ini bukan
// jaminan mutlak -- kalau HP benar-benar dikunci dalam-dalam atau aplikasi
// ditutup total (bukan cuma dikunci layarnya), sebagian besar browser HP
// tetap akan menghentikan audio/video biasa (ini batasan sistem operasi,
// bukan sesuatu yang bisa "diperbaiki" penuh dari sisi web biasa). Yang
// paling andal tetap terus jalan walau layar dikunci adalah audio MP3
// (elemen <audio> asli) selama TAB/APLIKASI-nya tidak ditutup total.
function wireMediaSession(mediaEl, title) {
  if (!("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: title || "Bacaan Alkitab",
      artist: (typeof CONFIG !== "undefined" && CONFIG.APP_TITLE) || "Alkitab",
    });
    navigator.mediaSession.setActionHandler("play", () => mediaEl.play());
    navigator.mediaSession.setActionHandler("pause", () => mediaEl.pause());
    navigator.mediaSession.setActionHandler("stop", () => { mediaEl.pause(); });
    mediaEl.addEventListener("play", () => { try { navigator.mediaSession.playbackState = "playing"; } catch (e) {} });
    mediaEl.addEventListener("pause", () => { try { navigator.mediaSession.playbackState = "paused"; } catch (e) {} });
  } catch (e) {
    /* browser lama/tidak mendukung -- diabaikan, tombol putar tetap jalan normal */
  }
}

function youTubeEmbedUrl(url) {
  if (!url) return null;
  let id = null;
  let m = url.match(/[?&]v=([^&]+)/);
  if (m) id = m[1];
  if (!id) { m = url.match(/youtu\.be\/([^?&]+)/); if (m) id = m[1]; }
  if (!id) { m = url.match(/youtube\.com\/embed\/([^?&]+)/); if (m) id = m[1]; }
  if (!id) { m = url.match(/youtube\.com\/shorts\/([^?&]+)/); if (m) id = m[1]; }
  return id ? "https://www.youtube.com/embed/" + id : null;
}

// ------------------------------------------------------------
//  PEMUTAR MP3 "TOGGLE BULAT" -- khusus dipakai toolbar Kidung, gayanya
//  mengikuti contoh app "Kidung" yang dikirim (1 tombol bulat ▶️/⏸️ +
//  progress bar tipis di sampingnya, BUKAN elemen <audio controls> biasa
//  seperti buildInlineMediaBlock() di atas). Beda perilaku dari MP3 di
//  buildInlineMediaBlock():
//    - SATU tombol bulat saja: sekali tekan main, tekan lagi jeda (murni
//      toggle play/pause, bukan buka pemutar baru tiap kali).
//    - loop = true -- begitu selesai, otomatis mengulang dari awal terus
//      menerus, BERHENTI hanya kalau tombolnya ditekan lagi (sesuai
//      permintaan "terus berulang mainnya sampai ditekan kembali").
//    - Progress bar tipis di sebelah tombol menunjukan posisi lagu
//      berjalan (bisa disentuh/digeser untuk lompat ke bagian tertentu).
// ------------------------------------------------------------
function formatMediaTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ":" + (s < 10 ? "0" : "") + s;
}

function buildLoopingMp3Player(url, titleForSession, label) {
  const wrap = document.createElement("div");
  wrap.className = "kidung-mp3-player";

  const audio = document.createElement("audio");
  audio.loop = true; // "terus berulang mainnya sampai ditekan kembali"
  audio.preload = "none";
  audio.setAttribute("playsinline", "");
  audio.src = url;
  wrap.appendChild(audio);

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "round-media-btn kidung-mp3-toggle";
  toggleBtn.textContent = "▶️";
  toggleBtn.title = "Putar " + (label || "MP3") + " (berulang, tekan lagi untuk jeda)";
  toggleBtn.setAttribute("aria-label", toggleBtn.title);
  wrap.appendChild(toggleBtn);

  const progressWrap = document.createElement("div");
  progressWrap.className = "kidung-mp3-progress-wrap";

  const progress = document.createElement("input");
  progress.type = "range";
  progress.className = "kidung-mp3-progress";
  progress.min = "0";
  progress.max = "100";
  progress.value = "0";
  progress.setAttribute("aria-label", "Posisi " + (label || "MP3"));
  progressWrap.appendChild(progress);

  const timeLabel = document.createElement("span");
  timeLabel.className = "kidung-mp3-time";
  timeLabel.textContent = "0:00";
  progressWrap.appendChild(timeLabel);

  wrap.appendChild(progressWrap);

  let seeking = false;

  toggleBtn.addEventListener("click", () => {
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  });
  audio.addEventListener("play", () => {
    toggleBtn.textContent = "⏸️";
    toggleBtn.classList.add("playing");
    if (typeof requestWakeLock === "function") requestWakeLock();
    if (typeof wireMediaSession === "function") wireMediaSession(audio, titleForSession);
  });
  audio.addEventListener("pause", () => {
    toggleBtn.textContent = "▶️";
    toggleBtn.classList.remove("playing");
    if (typeof releaseWakeLock === "function") releaseWakeLock();
  });
  audio.addEventListener("timeupdate", () => {
    if (seeking || !audio.duration) return;
    progress.value = String((audio.currentTime / audio.duration) * 100);
    timeLabel.textContent = formatMediaTime(audio.currentTime);
  });
  progress.addEventListener("input", () => {
    seeking = true;
    if (audio.duration) timeLabel.textContent = formatMediaTime((progress.value / 100) * audio.duration);
  });
  progress.addEventListener("change", () => {
    if (audio.duration) audio.currentTime = (progress.value / 100) * audio.duration;
    seeking = false;
  });

  return wrap;
}

// Versi "TELANJANG" dari pemutar sebaris di atas -- HANYA elemen
// pemutarnya saja (iframe/video/audio + catatan Drive kalau perlu),
// TANPA baris tombol bulat + tombol bagikan bawaan buildInlineMediaBlock().
// Dipakai di toolbar layar baca Kidung (js/kidung-ui.js) yang sudah
// punya tombol kotak sendiri (🎬/📺) -- supaya tidak dobel tombol
// (dulu: tombol kotak DITEKAN, lalu buildInlineMediaBlock() menaruh LAGI
// 1 baris tombol bulat + bagikan sendiri di bawahnya, jadi kelihatan
// berantakan/dobel). Wake lock diurus sendiri lewat elemen medianya.
// `kind`: "mp3" | "mp4" | "youtube". `rawUrl`: link mentahnya.
function buildStandaloneMediaPlayer(kind, rawUrl, titleForSession) {
  const wrap = document.createElement("div");
  wrap.className = "standalone-media-player";

  function wireWakeLockToMediaEl(mediaEl) {
    if (typeof requestWakeLock !== "function") return;
    mediaEl.addEventListener("play", () => requestWakeLock());
    mediaEl.addEventListener("pause", () => { if (typeof releaseWakeLock === "function") releaseWakeLock(); });
    mediaEl.addEventListener("ended", () => { if (typeof releaseWakeLock === "function") releaseWakeLock(); });
  }

  if (kind === "mp3" || kind === "mp4") {
    if (isDriveUrl(rawUrl)) {
      const embedUrl = driveEmbedPreviewUrl(rawUrl);
      if (embedUrl) {
        const iframe = document.createElement("iframe");
        iframe.className = "inline-media-player " + (kind === "mp4" ? "inline-media-drive-video" : "inline-media-drive-audio");
        iframe.src = embedUrl;
        iframe.allow = "autoplay";
        iframe.allowFullscreen = true;
        wrap.appendChild(iframe);
        const hint = document.createElement("div");
        hint.className = "inline-media-drive-hint";
        hint.innerHTML = 'Tidak muncul / minta izin? Pastikan file di Google Drive dibagikan sebagai "Siapa saja yang memiliki link" (Anyone with the link), lalu <a href="' + driveOpenUrl(rawUrl) + '" target="_blank" rel="noopener noreferrer">buka langsung di sini</a>.';
        wrap.appendChild(hint);
        if (typeof requestWakeLock === "function") requestWakeLock();
      } else {
        window.open(driveOpenUrl(rawUrl), "_blank", "noopener,noreferrer");
        return null;
      }
    } else if (kind === "mp3") {
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.autoplay = true;
      audio.setAttribute("playsinline", "");
      audio.className = "inline-media-player";
      audio.src = rawUrl;
      wrap.appendChild(audio);
      if (typeof wireMediaSession === "function") wireMediaSession(audio, titleForSession);
      wireWakeLockToMediaEl(audio);
    } else {
      const video = document.createElement("video");
      video.controls = true;
      video.autoplay = true;
      video.setAttribute("playsinline", "");
      video.className = "inline-media-player";
      video.src = rawUrl;
      wrap.appendChild(video);
      if (typeof wireMediaSession === "function") wireMediaSession(video, titleForSession);
      wireWakeLockToMediaEl(video);
    }
  } else if (kind === "youtube") {
    const embedUrl = youTubeEmbedUrl(rawUrl);
    if (embedUrl) {
      const iframe = document.createElement("iframe");
      iframe.className = "inline-media-player inline-media-youtube";
      iframe.src = embedUrl + (embedUrl.indexOf("?") === -1 ? "?" : "&") + "autoplay=1&playsinline=1";
      iframe.allow = "autoplay; encrypted-media; picture-in-picture";
      iframe.allowFullscreen = true;
      wrap.appendChild(iframe);
    } else {
      window.open(rawUrl, "_blank", "noopener,noreferrer");
      return null;
    }
  }
  return wrap;
}

// Membangun blok tombol BULAT + pemutar sebaris untuk SATU segmen
// ({mp3,mp4,youtube,bagian}). Dipakai di dalam buildInlineMediaBlock()
// di bawah -- satu blok bisa berisi beberapa pemanggilan fungsi ini kalau
// bacaan itu punya lebih dari satu voice note (segmen).
function buildInlineMediaSegment_(media, titleForSession, info) {
  const wrap = document.createElement("div");
  wrap.className = "inline-media-segment";

  // BARU (15 Sep 2026) -- baris info "sedang diputar" yang muncul TEPAT
  // di atas pemutar begitu tombol ▶️/🎵/🎬 ditekan, berisi rentang
  // bacaan voice note ini (mis. "Matius 5:27–6:4") + posisinya ("Bagian
  // 2 dari 3"). Jadi saat sedang mendengarkan, selalu jelas voice note
  // ini mulai dari kitab/pasal/ayat mana dan berhenti di mana --
  // termasuk kalau satu voice note melintasi lebih dari satu pasal.
  function buildNowPlayingBar_() {
    if (!info || !info.rangeText) return null;
    const bar = document.createElement("div");
    bar.className = "inline-media-nowplaying";
    const main = document.createElement("span");
    main.className = "inline-media-nowplaying-range";
    main.textContent = "📖 " + info.rangeText;
    bar.appendChild(main);
    if (info.positionText) {
      const sub = document.createElement("span");
      sub.className = "inline-media-nowplaying-part";
      sub.textContent = info.positionText;
      bar.appendChild(sub);
    }
    return bar;
  }

  const btnRow = document.createElement("div");
  btnRow.className = "round-media-row";
  wrap.appendChild(btnRow);

  const playerSlot = document.createElement("div");
  playerSlot.className = "inline-media-slot";
  wrap.appendChild(playerSlot);

  let holdingWakeLock = false;
  function closePlayer() {
    if (holdingWakeLock && typeof releaseWakeLock === "function") { releaseWakeLock(); holdingWakeLock = false; }
    playerSlot.innerHTML = "";
  }
  // Menjaga layar tetap menyala selama audio/video ini sedang diputar --
  // pakai helper yang sama dengan pembacaan suara (TTS), lihat js/app.js.
  function wireWakeLockToMediaEl(mediaEl) {
    if (typeof requestWakeLock !== "function") return;
    mediaEl.addEventListener("play", () => { if (!holdingWakeLock) { requestWakeLock(); holdingWakeLock = true; } });
    mediaEl.addEventListener("pause", () => { if (holdingWakeLock) { releaseWakeLock(); holdingWakeLock = false; } });
    mediaEl.addEventListener("ended", () => { if (holdingWakeLock) { releaseWakeLock(); holdingWakeLock = false; } });
  }

  function openPlayer(kind) {
    closePlayer();
    const nowBar = buildNowPlayingBar_();
    if (nowBar) playerSlot.appendChild(nowBar);
    if (kind === "mp3" || kind === "mp4") {
      const rawUrl = kind === "mp3" ? media.mp3 : media.mp4;
      if (isDriveUrl(rawUrl)) {
        // Link Google Drive -- TIDAK BISA dipasang langsung sebagai
        // src <audio>/<video> (itu bukan berkas mentah, tapi halaman
        // Drive). Satu-satunya cara resmi Drive bisa ditanam & langsung
        // memutar di halaman yang sama adalah lewat iframe "/preview".
        const embedUrl = driveEmbedPreviewUrl(rawUrl);
        if (embedUrl) {
          const iframe = document.createElement("iframe");
          iframe.className = "inline-media-player " + (kind === "mp4" ? "inline-media-drive-video" : "inline-media-drive-audio");
          iframe.src = embedUrl;
          iframe.allow = "autoplay";
          iframe.allowFullscreen = true;
          playerSlot.appendChild(iframe);
          // Penyebab #1 kalau pemutarnya muncul tapi isinya kosong / minta
          // izin ("You need permission") adalah file Drive-nya BELUM di-
          // share sebagai "Anyone with the link" (masih private/terbatas).
          // Kita tidak bisa mendeteksi ini secara otomatis dari sisi web
          // (beda origin, iframe-nya sendiri yang menampilkan pesan itu),
          // jadi cukup tampilkan pengingat + link buka langsung sebagai
          // jalan pintas untuk mengecek/membetulkan share setting-nya.
          const hint = document.createElement("div");
          hint.className = "inline-media-drive-hint";
          hint.innerHTML = 'Tidak muncul / minta izin? Pastikan file di Google Drive dibagikan sebagai "Siapa saja yang memiliki link" (Anyone with the link), lalu <a href="' + driveOpenUrl(rawUrl) + '" target="_blank" rel="noopener noreferrer">buka langsung di sini</a>.';
          playerSlot.appendChild(hint);
          // Kita tidak bisa "mendengar" event play/pause dari isi iframe
          // Drive (beda origin), jadi layar dijaga tetap menyala selama
          // pemutarnya terbuka (bukan hanya saat benar-benar sedang play).
          if (typeof requestWakeLock === "function") { requestWakeLock(); holdingWakeLock = true; }
        } else {
          // ID file tidak terbaca dari link-nya -- fallback: buka Drive
          // apa adanya di tab baru (lebih baik daripada tidak berbuat apa-apa).
          window.open(driveOpenUrl(rawUrl), "_blank", "noopener,noreferrer");
          return;
        }
      } else if (kind === "mp3") {
        // Bukan link Drive (file MP3 dihosting sendiri/tempat lain) --
        // tetap pakai elemen <audio> asli seperti sebelumnya.
        const audio = document.createElement("audio");
        audio.controls = true;
        audio.autoplay = true;
        audio.setAttribute("playsinline", "");
        audio.className = "inline-media-player";
        audio.src = rawUrl;
        playerSlot.appendChild(audio);
        wireMediaSession(audio, titleForSession);
        wireWakeLockToMediaEl(audio);
      } else {
        const video = document.createElement("video");
        video.controls = true;
        video.autoplay = true;
        video.setAttribute("playsinline", "");
        video.className = "inline-media-player";
        video.src = rawUrl;
        playerSlot.appendChild(video);
        wireMediaSession(video, titleForSession);
        wireWakeLockToMediaEl(video);
      }
    } else if (kind === "youtube") {
      const embedUrl = youTubeEmbedUrl(media.youtube);
      if (embedUrl) {
        const iframe = document.createElement("iframe");
        iframe.className = "inline-media-player inline-media-youtube";
        iframe.src = embedUrl + (embedUrl.indexOf("?") === -1 ? "?" : "&") + "autoplay=1&playsinline=1";
        iframe.allow = "autoplay; encrypted-media; picture-in-picture";
        iframe.allowFullscreen = true;
        playerSlot.appendChild(iframe);
      } else {
        // Bukan URL YouTube yang dikenali -- tetap buka apa adanya (fallback tab baru)
        window.open(media.youtube, "_blank", "noopener,noreferrer");
        return;
      }
    }
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "chip-btn small inline-media-close";
    closeBtn.textContent = "✕ Tutup pemutar";
    closeBtn.addEventListener("click", closePlayer);
    playerSlot.appendChild(closeBtn);
  }

  if (media.mp3) {
    const b = roundMediaButton("🎵", "Dengar MP3 (langsung di halaman ini, tanpa tab baru)");
    b.addEventListener("click", () => openPlayer("mp3"));
    btnRow.appendChild(b);
    btnRow.appendChild(shareMediaButton(media.mp3, "MP3"));
  }
  if (media.mp4) {
    const b = roundMediaButton("🎬", "Tonton MP4 (langsung di halaman ini, tanpa tab baru)");
    b.addEventListener("click", () => openPlayer("mp4"));
    btnRow.appendChild(b);
    btnRow.appendChild(shareMediaButton(media.mp4, "MP4"));
  }
  if (media.youtube) {
    const b = roundMediaButton("▶️", "Tonton YouTube (langsung di halaman ini, tanpa tab baru)");
    b.addEventListener("click", () => openPlayer("youtube"));
    btnRow.appendChild(b);
    btnRow.appendChild(shareMediaButton(media.youtube, "YouTube"));
  }
  return wrap;
}

// Membangun blok tombol BULAT + pemutar sebaris untuk satu bacaan --
// menerima BENTUK LAMA ({mp3,mp4,youtube,label}, satu voice note) MAUPUN
// BENTUK BARU ({segments:[{mp3,mp4,youtube,bagian}, ...], label}, bisa
// lebih dari satu voice note untuk bacaan yang sama, mis. "Matius 5"
// bagian 1 & 2). Dipakai di Rencana Baca, layar baca pasal, dan panel
// Kumpulan Ayat -- SATU implementasi dipakai di mana-mana supaya
// perilakunya konsisten. Kalau segmennya lebih dari satu, tiap segmen
// diberi label "Bagian N" (dari kolom Bagian kalau diisi, atau urutan
// otomatis kalau tidak) dan pemutarnya masing-masing berdiri sendiri.
function buildInlineMediaBlock(media, titleForSession) {
  const segments = (media && media.segments && media.segments.length)
    ? media.segments
    : [{ mp3: media && media.mp3, mp4: media && media.mp4, youtube: media && media.youtube }];

  const wrap = document.createElement("div");
  wrap.className = "inline-media-block";

  const withContent = segments.filter((s) => s && (s.mp3 || s.mp4 || s.youtube));
  const showBagianLabel = withContent.length > 1;

  withContent.forEach((seg, idx) => {
    const bagianNo = seg.bagian || String(idx + 1);
    // Rentang bacaan voice note INI sendiri (bukan rentang hari/bacaan
    // keseluruhan) -- dari kolom Pembacaan baris itu, sudah dirapikan
    // oleh buildMediaScheduleFromRows(). Untuk data LAMA yang belum
    // punya `rangeText` (mis. rencana yang tersimpan di perangkat
    // sebelum pembaruan ini), jatuh balik ke judul sesi apa adanya
    // supaya tetap ada keterangan, bukan kosong.
    const rangeText = seg.rangeText || seg.label || "";
    const positionText = showBagianLabel ? `Bagian ${bagianNo} dari ${withContent.length}` : "";

    if (showBagianLabel) {
      const bagianLabel = document.createElement("div");
      bagianLabel.className = "inline-media-segment-label";
      const left = document.createElement("span");
      left.className = "inline-media-segment-no";
      left.textContent = "🔊 Bagian " + bagianNo;
      bagianLabel.appendChild(left);
      if (rangeText) {
        const right = document.createElement("span");
        right.className = "inline-media-segment-range";
        right.textContent = rangeText;
        bagianLabel.appendChild(right);
      }
      wrap.appendChild(bagianLabel);
    }

    // Judul yang muncul di kontrol media OS / layar kunci HP -- ikut
    // menyebut rentangnya supaya tetap kelihatan walau layar terkunci.
    const segTitle = showBagianLabel
      ? `${rangeText || titleForSession} — Bagian ${bagianNo} dari ${withContent.length}`
      : (rangeText || titleForSession);
    const segEl = buildInlineMediaSegment_(seg, segTitle, { rangeText, positionText });
    // BARU (15 Sep 2026, permintaan operator "jump langsung ke bagian
    // yang dibaca") -- simpan rentang pasal/ayat segmen ini sebagai
    // data-attribute di elemen DOM-nya sendiri, supaya
    // scrollToMediaSegmentForVerse() di bawah bisa mencari elemen yang
    // TEPAT cocok dengan ayat yang sedang dibaca TANPA perlu menyimpan
    // state terpisah di tempat lain (elemen ini yang jadi "sumber
    // kebenaran"-nya, dibuat ulang tiap kali pasal dibuka lagi).
    if (seg.ref) {
      segEl.dataset.startChapter = String(seg.ref.startChapter);
      segEl.dataset.endChapter = String(seg.ref.endChapter);
      if (seg.ref.startVerse != null) segEl.dataset.startVerse = String(seg.ref.startVerse);
      if (seg.ref.endVerse != null) segEl.dataset.endVerse = String(seg.ref.endVerse);
    }
    wrap.appendChild(segEl);
  });

  return wrap;
}

// ------------------------------------------------------------
// BARU (15 Sep 2026, permintaan operator: "apa bisa jump langsung ke
// bagian yang dibaca, tergantung mulai dari baca mana") -- dipanggil
// dari tombol "🎧 Dengar dari sini" (js/app.js, buildNoteQuickActionsRow())
// yang muncul di panel catatan tiap ayat. Mencari segmen (elemen
// ".inline-media-segment" hasil buildInlineMediaBlock() di atas, lihat
// data-attribute yang ditulis di sana) yang RENTANGnya mencakup
// pasal+ayat yang sedang dibaca, lalu:
//  1. gulir halaman ke situ (supaya kelihatan, tidak perlu cari manual),
//  2. beri kedipan sebentar (class "inline-media-segment-flash", lihat
//     css/style.css) supaya jelas segmen MANA yang dimaksud,
//  3. otomatis "menekan" tombol putar PERTAMA (MP3/MP4/YouTube, bukan
//     tombol share) di segmen itu -- sama seperti operator menekannya
//     sendiri.
// Kalau tidak ada segmen yang rentangnya cocok PERSIS (mis. data lama
// yang belum berupa `segments`, atau ayatnya di luar rentang yang
// tercatat), fallback membuka segmen PERTAMA saja -- tetap lebih
// berguna daripada tidak melakukan apa-apa.
// Mengembalikan true kalau berhasil menemukan & membuka sesuatu, false
// kalau memang tidak ada voice note sama sekali untuk pasal ini
// (mis. `mediaSlotEl` masih kosong -- belum selesai dicari, atau
// pasal ini memang belum ada datanya).
// ------------------------------------------------------------
function scrollToMediaSegmentForVerse(mediaSlotEl, chapter, verseNum) {
  if (!mediaSlotEl) return false;
  const segs = Array.from(mediaSlotEl.querySelectorAll(".inline-media-segment"));
  if (!segs.length) return false;
  let target = segs.find((seg) => {
    const sc = seg.dataset.startChapter ? parseInt(seg.dataset.startChapter, 10) : null;
    if (sc == null) return false;
    const ec = seg.dataset.endChapter ? parseInt(seg.dataset.endChapter, 10) : sc;
    if (chapter < sc || chapter > ec) return false;
    const sv = seg.dataset.startVerse != null && seg.dataset.startVerse !== "" ? parseInt(seg.dataset.startVerse, 10) : null;
    const ev = seg.dataset.endVerse != null && seg.dataset.endVerse !== "" ? parseInt(seg.dataset.endVerse, 10) : null;
    if (chapter === sc && sv != null && verseNum < sv) return false;
    if (chapter === ec && ev != null && verseNum > ev) return false;
    return true;
  });
  if (!target) target = segs[0]; // tidak ketemu rentang PERSIS -- buka yang pertama saja daripada diam
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.classList.add("inline-media-segment-flash");
  setTimeout(() => target.classList.remove("inline-media-segment-flash"), 1600);
  const playBtn = target.querySelector(".round-media-btn:not(.share-variant)");
  if (playBtn) playBtn.click();
  return true;
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

// BARU -- satu "hari" sekarang bisa punya LEBIH DARI SATU voice note
// (mp3/mp4/YouTube), lewat `segments`. Baris-baris di sheet yang
// BERURUTAN dan kolom Pembacaan-nya PERSIS SAMA (mis. dua baris sama-sama
// "Matius 5") digabung jadi SATU hari dengan beberapa segmen ("Bagian
// 1", "Bagian 2", dst) -- BUKAN dianggap dua hari terpisah. Baris dengan
// Pembacaan berbeda (atau tidak berurutan) tetap jadi hari sendiri
// seperti sebelumnya, jadi sheet lama yang belum pernah pakai pola ini
// tetap jalan persis seperti dulu (1 baris = 1 hari, 1 segmen).
//
// Untuk lintas pasal (mis. "Matius 6-7" satu voice note untuk 2 pasal
// sekaligus), `endChapter` dari guessReferenceFromPembacaan() disimpan
// di tiap hari -- dipakai findMediaLinkForReference() supaya voice note
// itu tetap ketemu baik saat membaca pasal 6 MAUPUN pasal 7.
// Apakah baris ini LANJUTAN dari bacaan sebelumnya (voice note ke-2,
// ke-3, dst) atau bacaan/hari BARU? Ada DUA cara menandainya di Google
// Sheet, boleh pilih salah satu:
//
//  CARA 1 -- kolom "Pembacaan" ditulis PERSIS SAMA di beberapa baris
//    berurutan (perilaku lama, tetap jalan):
//        | Matius 5 | link A |
//        | Matius 5 | link B |
//
//  CARA 2 (BARU, lebih enak dibaca) -- kolom "Bagian" diisi angka
//    berurutan 1, 2, 3 ... dan kolom "Pembacaan" boleh ditulis BEDA-BEDA
//    sesuai rentang asli tiap voice note, termasuk LINTAS PASAL:
//        | Matius 5:1-26   | 1 | link A |
//        | Matius 5:27-48  | 2 | link B |
//        | Matius 6:1-7:29 | 3 | link C |
//    Ketiganya jadi SATU hari bacaan dengan 3 voice note, dan tiap voice
//    note tetap menyimpan rentangnya sendiri untuk ditampilkan saat
//    diputar. Baris dengan Bagian kosong / kembali ke "1" = bacaan baru.
//
// Angka Bagian harus BERURUTAN (2 setelah 1, 3 setelah 2) dan kitabnya
// harus sama -- kalau tidak, dianggap bacaan baru. Ini sengaja dibuat
// ketat supaya sheet lama yang kolom Bagian-nya diisi asal-asalan (atau
// tidak ada sama sekali) tidak ikut tergabung tanpa sengaja.
// CARA 3 (BARU, 15 Sep 2026 -- laporan operator: "voice note Matius
// 5:21-48 tidak ketemu, padahal linknya sudah diisi di Sheet"). Sheet
// "Isi Alkitab"-nya menulis 1 pasal yang punya beberapa voice note
// sebagai BEBERAPA BARIS BERURUTAN dengan teks Pembacaan BERBEDA per
// baris (mis. "Matius 5:1-20" lalu "Matius 5:21-48") dan TANPA kolom
// "Bagian" diisi sama sekali -- jadi tidak kena CARA 1 (labelnya tidak
// persis sama) ataupun CARA 2 (Bagian kosong). Akibatnya baris kedua
// dianggap "hari"/bacaan BARU yang kebetulan pasalnya tumpang tindih
// dengan bacaan sebelumnya -- lalu findMediaLinkForReference() cuma
// mengembalikan kecocokan PERTAMA yang ditemukan (lihat schedule.find()
// di atas), jadi voice note baris kedua itu TIDAK PERNAH muncul sama
// sekali saat pasalnya dibuka, walau linknya sudah benar di Sheet.
// Perbaikannya: kalau baris baru ini masih KITAB YANG SAMA & pasal
// AWALnya tidak lebih jauh dari pasal AKHIR bacaan sebelumnya (artinya
// tumpang tindih/menyambung, bukan pasal baru yang terpisah), otomatis
// digabung jadi segmen tambahan -- TIDAK perlu isi kolom Bagian maupun
// menyamakan teks Pembacaan sama sekali. Baris yang pasalnya sudah
// benar-benar lebih jauh (mis. "Matius 6" setelah "Matius 5:21-48")
// tetap dianggap bacaan/hari baru seperti biasa, jadi sheet lama (1
// baris = 1 hari, tidak ada tumpang tindih pasal antar baris berurutan)
// tetap berjalan PERSIS seperti sebelumnya, tidak ada yang berubah.
function rowContinuesReading_(lastItem, row, ref, label) {
  if (!lastItem) return false;
  if (label && lastItem.label === label) return true; // CARA 1
  const bagianNum = parseInt(row.bagian, 10);
  if (Number.isFinite(bagianNum) && bagianNum >= 2) {
    const segs = lastItem.segments || [];
    const prevNum = segs.length ? parseInt(segs[segs.length - 1].bagian, 10) : NaN;
    const expected = Number.isFinite(prevNum) ? prevNum + 1 : segs.length + 1;
    if (bagianNum === expected && !(ref && lastItem.bookNum && ref.book.num !== lastItem.bookNum)) {
      return true; // CARA 2
    }
  }
  if (ref && lastItem.bookNum != null && lastItem.endChapter != null &&
      ref.book.num === lastItem.bookNum && ref.startChapter <= lastItem.endChapter) {
    return true; // CARA 3
  }
  return false;
}

function buildMediaScheduleFromRows(rows) {
  const schedule = [];
  rows.forEach((row) => {
    const label = String(row.pembacaan || "").trim();
    const ref = parseReferenceRange(label);
    const segment = {
      bagian: row.bagian || "",
      label,                                        // teks Pembacaan baris ini apa adanya
      ref,                                          // rentang hasil parsing (boleh null)
      rangeText: ref ? formatReferenceRange(ref) : label, // teks rapi utk ditampilkan saat diputar
      bookNum: ref ? ref.book.num : null,
      chapter: ref ? ref.startChapter : null,
      endChapter: ref ? ref.endChapter : null,
      mp3: row.mp3 || "",
      mp4: row.mp4 || "",
      youtube: row.youtube || "",
    };
    const lastDay = schedule[schedule.length - 1];
    const lastItem = lastDay && lastDay[0];
    if (rowContinuesReading_(lastItem, row, ref, label)) {
      lastItem.segments.push(segment);
      applySegmentsToItem_(lastItem);
      return; // digabung ke hari SEBELUMNYA sebagai voice note tambahan, bukan hari baru
    }
    const item = {
      bookNum: ref ? ref.book.num : null,
      chapter: ref ? ref.startChapter : null,
      endChapter: ref ? ref.endChapter : null,
      label,
      baseLabel: label, // label baris PERTAMA, dipakai kalau rentang tidak bisa digabung
      segments: [segment],
      // Field mp3/mp4/youtube LAMA tetap diisi (disalin dari segmen
      // PERTAMA) supaya kode lain yang masih membaca field ini langsung
      // (bukan lewat `segments`) tetap jalan tanpa perlu diubah sekaligus.
      mp3: segment.mp3,
      mp4: segment.mp4,
      youtube: segment.youtube,
    };
    schedule.push([item]);
  });
  return schedule;
}

// Menyegarkan rentang & judul SATU hari setelah segmen bertambah:
//  - `chapter`/`endChapter` diperlebar mengikuti SEMUA voice note-nya,
//    supaya findMediaLinkForReference() tetap menemukan bacaan ini saat
//    pasal MANA PUN di dalam rentang itu sedang dibuka (mis. voice note
//    ke-3 mencakup Matius 6-7, pasal 7 tetap ketemu).
//  - `label` jadi rentang MENYELURUH + jumlah voice note-nya, mis.
//    "Matius 5:1–6:4 (3 voice note)". Kalau rentangnya tidak bisa
//    ditebak (nama kitab tidak dikenali), label baris pertama dipakai
//    apa adanya seperti dulu.
function applySegmentsToItem_(item) {
  const segs = item.segments || [];
  const refs = segs.map((s) => s.ref).filter(Boolean);
  const combined = combineReferenceRanges(refs);
  if (combined) {
    item.bookNum = combined.book.num;
    item.chapter = combined.startChapter;
    item.endChapter = combined.endChapter;
    item.label = segs.length > 1
      ? `${formatReferenceRange(combined)} (${segs.length} voice note)`
      : formatReferenceRange(combined);
  } else if (segs.length > 1) {
    item.label = `${item.baseLabel || item.label} (${segs.length} voice note)`;
  }
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
