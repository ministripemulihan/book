// ============================================================
//  APLIKASI UTAMA
// ============================================================ 
let bibleData = [];       // seluruh ayat (semua bahasa), dimuat sekali ke memori dari IndexedDB
let verseIndex = {};      // lang -> bookNumber -> chapter -> [ayat...] (terurut), untuk akses instan
let chaptersByBook = {};  // lang -> bookNumber -> [nomor pasal...] (terurut)
let currentLang = null;
let currentBookNum = null;
let currentChapter = null;
let highlightVerse = null;
// true kalau catatan ayat yang di-highlight harus LANGSUNG dibuka otomatis
// (mis. dari menu "Catatan Saya" / hasil pencarian catatan) -- false untuk
// navigasi biasa (pencarian ayat, strip lompat ayat, dst) supaya tidak
// membuka catatan tanpa diminta & membingungkan pembaca. Lihat
// buildVerseBlock() & renderChapter().
let highlightVerseOpenNote = false;
// Ayat yang sedang ditampilkan sendirian di mode "🔎 1 Ayat Saja" (lihat
// initVerseModeControl() & renderChapter()) -- null kalau mode "📖 Seluruh
// Pasal" sedang aktif.
let currentSingleVerse = null;
let currentUser = null;        // username (huruf kecil) yang sedang login
let currentUserDisplay = null; // nama tampilan
let currentUserSaudara = null; // "Saudara"/"Saudari" dari kolom "Saudara/i" di Sheet Pengguna (dipakai AI Chat Gembala menyapa pengguna, lihat js/aichat.js)
// Bahasa DEFAULT milik pengguna yang sedang login, dari kolom "Language"
// (atau "Bahasa" kalau "Language" kosong) di Sheet Pengguna -- lihat
// normalizeUserRecord() di js/csv.js (extra.language / extra.bahasa) dan
// initLanguageSelector() di bawah. Kosong ("") = tidak diatur admin, jadi
// pemilihan bahasa jatuh balik ke default aplikasi (Indonesia).
let currentUserExtraLanguage = "";
let currentChapterVerses = []; // ayat-ayat pasal yang sedang ditampilkan (dipakai TTS & modal catatan)
let verseById = {};            // id ayat ("lang_verseId") -> objek ayat, dipakai menu "Catatan Saya"

const el = (id) => document.getElementById(id);

// ------------------------------------------------------------
// 0b) UTIL: catatan HTML aman (whitelist tag) + salin ke clipboard
// ------------------------------------------------------------
// Beberapa versi (mis. rvind/rveng) menyimpan catatan kaki panjang berisi
// markup HTML dasar (<p>, <sup>, <b>, dst). Fungsi ini merender markup itu
// apa adanya (bukan teks mentah "<p>...</p>"), tapi tetap membuang tag/atribut
// yang tidak ada dalam daftar putih supaya aman (tidak ada <script>, event
// handler, dsb).
const NOTE_HTML_ALLOWED_TAGS = new Set([
  "P", "BR", "B", "STRONG", "I", "EM", "U", "SUP", "SUB", "SPAN", "DIV", "A",
]);
function sanitizeNoteHtml(html) {
  if (!html) return "";
  const template = document.createElement("template");
  template.innerHTML = html;
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (!NOTE_HTML_ALLOWED_TAGS.has(child.tagName)) {
          // ganti elemen yang tidak diizinkan dengan isi teksnya saja
          const text = document.createTextNode(child.textContent);
          child.replaceWith(text);
          return;
        }
        [...child.attributes].forEach((attr) => {
          const name = attr.name.toLowerCase();
          const isSafeHref = child.tagName === "A" && name === "href" && /^https?:\/\//i.test(attr.value);
          if (!isSafeHref) child.removeAttribute(attr.name);
        });
        if (child.tagName === "A") child.setAttribute("target", "_blank");
        walk(child);
      }
    });
  };
  walk(template.content);
  return template.innerHTML;
}

// Ubah catatan (yang mungkin berisi tag HTML dasar) menjadi teks polos —
// dipakai saat menyalin catatan ke clipboard.
function noteHtmlToPlainText(html) {
  if (!html) return "";
  const template = document.createElement("template");
  template.innerHTML = sanitizeNoteHtml(html).replace(/<\/p>/gi, "\n\n").replace(/<br\s*\/?>/gi, "\n");
  return (template.content.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
}

// Mengubah referensi silang di dalam teks Catatan menjadi TOMBOL yang bisa
// diklik -- saat diklik, ayat yang dirujuk langsung tampil SEBARIS di
// bawahnya (lihat toggleInlineVerseRefPreview()), TIDAK membuka tab/jendela
// baru. Dijalankan SETELAH sanitizeNoteHtml() supaya hanya beroperasi pada
// HTML yang sudah aman (tag & atribut liar sudah dibuang).
//
// Dua pola dikenali, DALAM SATU KALI JALAN (kiri ke kanan) supaya urutan
// kemunculannya di teks ikut menentukan konteks kitab/pasal yang benar:
//
//   1) Referensi OSIS penuh -- "Psa_74:16", "Gen_1:8", atau rentang ayat
//      "Luk_3:23-28" (rentang -28 ikut ditangkap lewat grup opsional
//      `(?:-(\d+))?`, jadi tombolnya menampilkan SEMUA ayat 23 s.d. 28,
//      bukan cuma ayat pertamanya). Juga menangani referensi PASAL SAJA
//      tanpa ":ayat" (mis. "Luk_3", umum dipakai di footnote seperti
//      "lihat note 382 di Luk_3") -- ini tidak jadi tombol ayat spesifik,
//      tapi TETAP memindahkan konteks untuk pola (2) di bawah.
//
//   2) Referensi RELATIF gaya "(ay. 4, 10, 12, 21, 25)" / "(vv. 11-12, 21)"
//      / "(cf. vv. 4, 10)" -- ini TIDAK menyebut kitab/pasal sama sekali,
//      karena maksudnya adalah "ayat-ayat lain DI PASAL YANG SAMA sedang
//      dibicarakan". Pasal itu adalah pasal ayat catatan ini sendiri
//      (ownBookNum/ownChapter) SECARA DEFAULT, TAPI begitu ada referensi
//      OSIS eksplisit (pola 1) muncul lebih dulu di dalam teks yang sama,
//      konteksnya BERPINDAH ke situ -- persis cara pembaca manusia
//      menafsirkannya (mis. "...berdasarkan Gen_1:3 membuktikan sesuatu
//      (ay. 10)" -> ay. 10 di sini artinya Kejadian 1:10, BUKAN pasal
//      ayat catatan ini). Setiap angka dalam daftarnya (boleh rentang
//      "11-12" & boleh berhuruf seperti "2b") jadi tombol tersendiri.
function linkifyOsisReferences(safeHtml, ownBookNum, ownChapter) {
  if (!safeHtml) return safeHtml;

  // Konteks kitab/pasal AKTIF -- lihat penjelasan pola (2) di atas.
  let ctxBook = ownBookNum || null;
  let ctxChapter = ownChapter || null;

  const OSIS_PART = "\\b([1-3]?[A-Za-z]{2,4})_(\\d+)(?::(\\d+)(?:-(\\d+))?)?\\b";
  const AY_PART = "\\((?:cf\\.?\\s+)?(ay\\.|vv?\\.)\\s*([0-9][0-9a-z,\\-\\s]*[0-9a-z]?)\\)";
  const combined = new RegExp(OSIS_PART + "|" + AY_PART, "gi");

  return safeHtml.replace(combined, (m, abbr, chapter, verseStart, verseEnd, ayPrefix, ayList) => {
    if (abbr) {
      // --- pola (1): referensi OSIS ---
      const book = OSIS_ABBR_INDEX[abbr.toLowerCase()];
      if (!book) return m; // singkatan tidak dikenal -- biarkan sbg teks biasa, jangan ubah konteks
      ctxBook = book.num;
      ctxChapter = parseInt(chapter, 10);
      if (!verseStart) {
        // Referensi PASAL SAJA (mis. "Luk_3", tanpa ":ayat") -- konteks
        // sudah dipindah di atas; tombolnya sendiri buka pasal itu di
        // ayat 1 (tidak ada ayat spesifik yang bisa dirujuk).
        return `<button type="button" class="note-verse-ref" data-book="${book.num}" data-chapter="${chapter}" data-verse="1">📖 ${book.name} ${chapter}</button>`;
      }
      const label = verseEnd
        ? `${book.name} ${chapter}:${verseStart}-${verseEnd}`
        : `${book.name} ${chapter}:${verseStart}`;
      const endAttr = verseEnd ? ` data-verse-end="${verseEnd}"` : "";
      return `<button type="button" class="note-verse-ref" data-book="${book.num}" data-chapter="${chapter}" data-verse="${verseStart}"${endAttr}>📖 ${label}</button>`;
    }

    // --- pola (2): "(ay. 4, 10, 12, 21, 25)" dst, relatif ke konteks aktif ---
    if (!ctxBook || !ctxChapter) return m; // tidak ada konteks kitab/pasal sama sekali -- biarkan teks biasa
    const items = ayList.split(",").map((tokRaw) => {
      const tok = tokRaw.trim();
      const rangeMatch = tok.match(/^(\d+)[a-z]?(?:-(\d+)[a-z]?)?$/i);
      if (!rangeMatch) return escapeHtml(tok); // token aneh (bukan angka) -- biarkan apa adanya, jangan jadi tombol
      const vs = rangeMatch[1];
      const ve = rangeMatch[2] || null;
      const endAttr = ve ? ` data-verse-end="${ve}"` : "";
      return `<button type="button" class="note-verse-ref note-verse-ref-inline" data-book="${ctxBook}" data-chapter="${ctxChapter}" data-verse="${vs}"${endAttr}>${escapeHtml(tok)}</button>`;
    }).join(", ");
    return `(${ayPrefix} ${items})`;
  });
}

// Menampilkan/menyembunyikan ayat yang dirujuk TEPAT DI BAWAH tombol
// referensinya (di dalam panel catatan yang sama) -- bahasanya SAMA dengan
// bahasa ayat/catatan yang sedang dibuka (`lang`), bukan bahasa lain, dan
// TIDAK membuka tab/jendela/pembaca baru. Kalau tombolnya berupa RENTANG
// ayat (mis. "Lukas 3:23-28"), SEMUA ayat dalam rentang itu ditampilkan
// berurutan (bukan cuma ayat pertamanya saja).
function toggleInlineVerseRefPreview(btn, lang) {
  const existing = btn.nextElementSibling;
  if (existing && existing.classList && existing.classList.contains("note-verse-ref-preview")) {
    existing.remove();
    btn.classList.remove("active");
    return;
  }
  const bookNum = parseInt(btn.dataset.book, 10);
  const chapter = parseInt(btn.dataset.chapter, 10);
  const verseStart = parseInt(btn.dataset.verse, 10);
  const verseEnd = btn.dataset.verseEnd ? parseInt(btn.dataset.verseEnd, 10) : verseStart;
  const chapterVerses = getChapterVerses(lang, bookNum, chapter);
  const found = chapterVerses.filter((x) => x.verse >= verseStart && x.verse <= verseEnd);
  const book = BOOKS.find((b) => b.num === bookNum);
  const bookLabel = book ? book.name : bookNum;

  const preview = document.createElement("div");
  preview.className = "note-verse-ref-preview";

  if (!found.length) {
    const refEl = document.createElement("div");
    refEl.className = "note-verse-ref-preview-ref";
    refEl.textContent = verseEnd > verseStart
      ? `${bookLabel} ${chapter}:${verseStart}-${verseEnd}`
      : `${bookLabel} ${chapter}:${verseStart}`;
    preview.appendChild(refEl);
    const textEl = document.createElement("div");
    textEl.className = "note-verse-ref-preview-text";
    textEl.textContent = `(ayat tidak ditemukan di bahasa ini — ${langLabelFor(lang)})`;
    preview.appendChild(textEl);
  } else {
    // Rentang > 1 ayat: setiap ayat ditampilkan dengan nomornya masing-
    // masing (mirip tampilan baca normal), bukan digabung jadi satu
    // paragraf tanpa nomor -- supaya tetap jelas ayat mana yang mana.
    found.forEach((v) => {
      const refEl = document.createElement("div");
      refEl.className = "note-verse-ref-preview-ref";
      refEl.textContent = `${bookLabel} ${chapter}:${v.verse}`;
      preview.appendChild(refEl);
      const textEl = document.createElement("div");
      textEl.className = "note-verse-ref-preview-text";
      textEl.textContent = v.text;
      preview.appendChild(textEl);
    });
  }

  btn.classList.add("active");
  btn.insertAdjacentElement("afterend", preview);
}

// Salin teks ke clipboard, lalu beri umpan-balik singkat pada tombol (ikon
// berubah jadi ✓ sesaat) supaya pengguna tahu penyalinan berhasil.
function copyTextWithFeedback(text, btn) {
  const done = () => {
    if (!btn) return;
    const original = btn.textContent;
    btn.textContent = "✓";
    btn.classList.add("copied");
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove("copied");
    }, 1200);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}
function fallbackCopy(text, done) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); } catch (e) { /* diabaikan */ }
  document.body.removeChild(ta);
  if (done) done();
}

// ------------------------------------------------------------
// 1) AUTENTIKASI — dua Google Sheet berbeda:
//    Sheet #1 = teks Alkitab, Sheet #2 = daftar username/password.
//    Login hanya diminta sekali; tersimpan sampai logout.
// ------------------------------------------------------------
function normalizeUserRecordSafe(rec) {
  return typeof normalizeUserRecord === "function" ? normalizeUserRecord(rec) : rec;
}

async function syncUsersFromServer() {
  const res = await fetch(CONFIG.USERS_SHEET_CSV_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Gagal mengambil daftar pengguna (" + res.status + ")");
  const csvText = await res.text();
  const records = parseCSV(csvText).map(normalizeUserRecordSafe).filter((u) => u.username);
  await LocalDB.clearUsers();
  await LocalDB.putUsers(records);
  await LocalDB.setMeta("lastUserSync", new Date().toISOString());
  return records;
}

// Kunci localStorage tempat menyimpan CADANGAN LOKAL password pengganti
// (kalau pernah diganti lewat menu ⋮ > Ganti Password) -- dipakai supaya
// login tetap bisa dilakukan OFFLINE dengan password terbaru di perangkat
// yang sama, walau tidak sedang tersambung internet untuk mengeceknya ke
// Google Sheet. Lihat readPasswordOverride_()/setPasswordOverride_() di
// apps-script/Code.gs untuk sisi servernya.
function passwordOverrideCacheKey(uname) {
  return "bible_app_pw_override_v1_" + uname;
}

// Password yang SEHARUSNYA dipakai untuk login: kalau pengguna ini pernah
// ganti password lewat aplikasi, itu yang dipakai (dicoba ambil dari
// server dulu supaya selalu yang terbaru walau ganti dari HP lain;
// kalau gagal/offline, pakai cadangan lokal di perangkat ini); kalau belum
// pernah ganti sama sekali, password dari Sheet Pengguna (Sheet #2) yang
// tetap dipakai apa adanya seperti sebelumnya.
async function getEffectivePassword(uname, sheetPassword) {
  const cacheKey = passwordOverrideCacheKey(uname);
  let override = localStorage.getItem(cacheKey) || "";
  if (typeof Sync !== "undefined" && Sync.enabled()) {
    try {
      const remote = await Sync.pullPasswordOverride(uname);
      if (remote) {
        override = remote;
        localStorage.setItem(cacheKey, remote);
      }
    } catch (e) {
      /* offline -- tetap pakai cadangan lokal (override) kalau ada */
    }
  }
  return override || sheetPassword;
}

async function validateLogin(usernameRaw, password) {
  const uname = (usernameRaw || "").trim().toLowerCase();
  if (!uname || !password) return null;

  let users = await LocalDB.getAllUsers();
  let match = users.find((u) => u.username === uname);
  if (!match) {
    // Belum ada di data lokal -> coba sinkron ulang (mungkin akun baru / belum pernah sinkron)
    try {
      users = await syncUsersFromServer();
      match = users.find((u) => u.username === uname);
    } catch (e) {
      return null; // kemungkinan sedang offline dan akun belum ada di cache lokal
    }
  }
  if (!match) return null;

  const effectivePassword = await getEffectivePassword(uname, match.password);
  if (password !== effectivePassword) return null;

  // BARU -- akun hasil "📝 Daftar Akun Baru" (js/signup.js) ditandai
  // approved=false sampai administrator menyetujuinya lewat panel
  // "Kelola Pengguna". Akun LAMA (kolom "Approved" kosong/tidak ada)
  // tetap approved=true, lihat parseApprovedField() di js/csv.js -- jadi
  // pengecekan ini TIDAK mengunci siapa pun yang sudah bisa login sebelum
  // pembaruan ini.
  if (match.approved === false) {
    // Barangkali baru saja disetujui administrator tapi data lokal di
    // perangkat ini belum sempat diperbarui -- coba sinkron ulang sekali
    // sebelum benar-benar menolak.
    try {
      const fresh = await syncUsersFromServer();
      const freshMatch = fresh.find((u) => u.username === uname);
      if (freshMatch && freshMatch.approved !== false) return freshMatch;
    } catch (e) { /* tetap dianggap pending di bawah */ }
    return { pendingApproval: true, username: uname };
  }

  return match;
}

function initAuth() {
  const savedUser = localStorage.getItem(CONFIG.AUTH_STORAGE_KEY);
  if (savedUser) {
    currentUser = savedUser;
    currentUserDisplay = localStorage.getItem(CONFIG.AUTH_DISPLAY_KEY) || savedUser;
    currentUserSaudara = localStorage.getItem(CONFIG.AUTH_SAUDARA_KEY) || "";
    if (typeof Guest !== "undefined") Guest.exit(); // akun asli menang atas sisa status tamu lama
    // BARU -- pengguna yang SUDAH login dari kunjungan sebelumnya (bukan baru
    // mengisi form login) tidak punya objek `match` di sini, jadi kolom
    // "Language"/"Bahasa"-nya perlu dicari ulang dari data pengguna lokal
    // sebelum startApp() memilih bahasa awal (lihat initLanguageSelector()).
    // Kalau pencarian gagal (mis. offline & belum pernah sinkron pengguna),
    // tetap lanjut masuk apa adanya (currentUserExtraLanguage tetap "").
    LocalDB.getAllUsers()
      .then((users) => {
        const rec = users.find((u) => u.username === savedUser);
        currentUserExtraLanguage = (rec && rec.extra && (rec.extra.language || rec.extra.bahasa)) || "";
      })
      .catch(() => {})
      .then(() => startApp());
    return;
  }

  // Sudah pernah pilih "Coba Tanpa Daftar" sebelumnya di perangkat ini ->
  // langsung masuk ke aplikasi sebagai tamu lagi, tidak perlu pilih ulang
  // tiap buka aplikasi (perilaku sama seperti savedUser di atas).
  if (CONFIG.GUEST_MODE_ENABLED && typeof Guest !== "undefined" && Guest.isGuest()) {
    currentUser = null;
    currentUserDisplay = null;
    currentUserSaudara = null;
    startApp();
    return;
  }

  el("loginScreen").hidden = false;
  if (CONFIG.GUEST_MODE_ENABLED && el("guestEnterBtn")) {
    el("guestEnterBtn").hidden = false;
    el("guestEnterBtn").addEventListener("click", () => {
      Guest.enter();
      currentUser = null;
      currentUserDisplay = null;
      currentUserSaudara = null;
      currentUserExtraLanguage = ""; // tamu tidak punya kolom Language -- default Indonesia
      el("loginScreen").hidden = true;
      startApp();
    });
  }
  el("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const uname = el("loginUsername").value;
    const pass = el("loginPassword").value;
    const btn = el("loginSubmitBtn");
    el("loginError").hidden = true;
    btn.disabled = true;
    btn.textContent = "Memeriksa…";

    const match = await validateLogin(uname, pass);

    btn.disabled = false;
    btn.textContent = "Masuk";

    if (match && match.pendingApproval) {
      // Akun ditemukan & password benar, tapi belum disetujui
      // administrator (lihat js/signup.js & panel "Kelola Pengguna").
      el("loginError").textContent =
        "Akun Anda sudah terdaftar tapi BELUM disetujui administrator. Silakan hubungi administrator, atau coba masuk lagi nanti setelah disetujui.";
      el("loginError").hidden = false;
    } else if (match) {
      currentUser = match.username;
      currentUserDisplay = match.displayName || match.username;
      // "Saudara"/"Saudari" dari kolom "Saudara/i" Sheet Pengguna (kosong
      // kalau belum diisi admin -> AI Chat jatuh balik ke sapaan netral,
      // lihat buildAiChatSapaan() di js/aichat.js).
      currentUserSaudara = match.saudara || "";
      // BARU -- kolom "Language" (atau "Bahasa" kalau "Language" kosong) di
      // Sheet Pengguna dipakai sebagai bahasa AWAL Alkitab untuk pengguna ini
      // (lihat initLanguageSelector()). Kosong = tetap default Indonesia.
      currentUserExtraLanguage = (match.extra && (match.extra.language || match.extra.bahasa)) || "";
      localStorage.setItem(CONFIG.AUTH_STORAGE_KEY, currentUser);
      localStorage.setItem(CONFIG.AUTH_DISPLAY_KEY, currentUserDisplay);
      localStorage.setItem(CONFIG.AUTH_SAUDARA_KEY, currentUserSaudara);
      if (typeof Guest !== "undefined") Guest.exit();
      el("loginScreen").hidden = true;
      startApp();
    } else {
      el("loginError").textContent = "Username atau password salah.";
      el("loginError").hidden = false;
    }
  });

  // BARU -- tombol "📝 Daftar Akun Baru" di layar Masuk (lihat js/signup.js).
  if (el("signupOpenBtn") && typeof Signup !== "undefined") {
    el("signupOpenBtn").addEventListener("click", () => Signup.openModal());
  }
}

function logout() {
  if (typeof stopTTS === "function") stopTTS();
  // (catatan ayat sekarang sebaris, tidak ada lagi modal terpisah untuk ditutup)
  localStorage.removeItem(CONFIG.AUTH_STORAGE_KEY);
  localStorage.removeItem(CONFIG.AUTH_DISPLAY_KEY);
  localStorage.removeItem(CONFIG.AUTH_SAUDARA_KEY);
  if (typeof Guest !== "undefined") Guest.exit();
  location.reload();
}

// ------------------------------------------------------------
// 2) MEMUAT DATA ALKITAB — dari IndexedDB (lokal) bila ada, kalau tidak
//    ambil sekali dari Google Sheet Alkitab lalu simpan lokal.
// ------------------------------------------------------------
async function startApp() {
  el("appTitle").textContent = CONFIG.APP_TITLE;
  document.title = CONFIG.APP_TITLE;

  // pastikan daftar pengguna juga tersimpan lokal untuk login berikutnya (termasuk saat offline)
  const userCount = await LocalDB.countUsers();
  if (userCount === 0) {
    try { await syncUsersFromServer(); } catch (e) { /* diamkan, tidak menghalangi baca Alkitab */ }
  }

  const localCount = await LocalDB.count();
  if (localCount > 0) {
    setLoadingText("Memuat data dari penyimpanan lokal…");
    el("loadingOverlay").hidden = false;
    bibleData = await LocalDB.getAll();
    el("loadingOverlay").hidden = true;
    afterDataReady();
  } else {
    await handleInitialBibleDownload();
  }

  // MODE TAMU -- tidak ada username sama sekali, jadi blok sinkron di
  // bawah (catatan/rencana baca/dst, semuanya butuh username) dilewati,
  // tapi status panel & menu tetap perlu digambar ulang supaya pita
  // "Mode Tamu" & menu abu-abu langsung tampil begitu masuk aplikasi.
  if (!currentUser && typeof Guest !== "undefined" && Guest.isGuest()) {
    if (typeof updateStatusPanel === "function") updateStatusPanel();
  }

  // Tarik catatan pribadi & progres rencana baca dari Google Sheet (kalau
  // sudah dikonfigurasi) di latar belakang — tidak menunggu/menghalangi UI.
  if (currentUser) {
    await resolveCurrentUserLevels(currentUser);
    if (typeof updateStatusPanel === "function") updateStatusPanel();
    refreshNotesFromRemote(currentUser);
    refreshPlanFromRemote(currentUser);
    refreshSettingsFromRemote(currentUser).then(() => {
      if (el("readingAnimToggle")) el("readingAnimToggle").checked = isReadingProgressEnabled();
      initFootnoteAccentControl();
    });
    refreshCollectionsFromRemote(currentUser).then((changed) => {
      // Kalau panel Kumpulan Ayat sedang terbuka & ada perubahan dari
      // perangkat lain, gambar ulang supaya langsung terlihat tanpa
      // perlu menutup/buka panelnya lagi.
      if (changed && el("collectionsPanel") && !el("collectionsPanel").hidden) {
        renderCollectionsPanel();
      }
    });
    logActivity("Login");
    // sedikit jeda supaya tidak "berebut" dengan showEmptyState() yang
    // dipanggil di akhir afterDataReady() (terutama saat sinkron pertama kali)
    setTimeout(() => checkAnnouncementsAtStart(), 400);
  }
}

// ------------------------------------------------------------
// 2b) NOTIFIKASI UNDUH DATA LEWAT WIFI — kunjungan PERTAMA KALI (belum ada
//     data Alkitab tersimpan lokal sama sekali) TIDAK langsung menyedot data
//     besar dari server begitu saja kalau kemungkinan sedang memakai data
//     seluler (kuota) — hanya langsung unduh otomatis kalau TERDETEKSI WiFi/
//     Ethernet. Selain itu (data seluler terdeteksi, ATAU browser tidak bisa
//     mendeteksi jenis koneksi sama sekali -- mis. kebanyakan browser di
//     iPhone), pengguna ditanya dulu lewat dialog, dan tetap boleh MASUK
//     tanpa mengunduh (data diunduh belakangan dari menu ⋮ → Unduh Data
//     Alkitab, lengkap dengan info progres yang sama seperti sinkron biasa).
// ------------------------------------------------------------

// Network Information API -- HANYA didukung sebagian browser (terutama
// Chrome/Android). Kalau tidak didukung (mis. Safari/iOS), fungsi ini
// mengembalikan null (artinya: "tidak diketahui", BUKAN "bukan wifi").
function detectConnectionType() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return null;
  if (conn.type) return conn.type; // "wifi" | "ethernet" | "cellular" | "none" | "unknown" | dst
  return null;
}

async function handleInitialBibleDownload() {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    showBibleNotDownloadedState(
      "Tidak ada sambungan internet saat ini. Data Alkitab belum bisa diunduh — silakan sambungkan internet lalu buka menu ⋮ → 📥 Unduh Data Alkitab."
    );
    return;
  }
  // Selalu tampilkan info dulu untuk unduhan PERTAMA KALI (walaupun sudah
  // pasti WiFi) -- supaya pengguna baru tahu SEBELUM loading panjang
  // dimulai bahwa ini memang wajar (data ~51 MB, sekali saja), bukan
  // aplikasi macet/lambat. Ini yang membedakan dari sinkron ulang biasa
  // (lihat confirmAndSync()), yang tidak perlu info sepanjang ini karena
  // penggunanya sendiri yang menekan tombolnya dengan sadar.
  await showBibleSyncPrompt({ isFirstTime: true });
}

// Dipakai tombol menu ⋮ → 🔄/📥 Sinkronkan ulang / Unduh Data Alkitab
// (satu tombol, teks berubah otomatis -- lihat updateResyncBtnLabel())
// -- tetap diberi info kalau sedang TIDAK terdeteksi WiFi (supaya
// tidak tiba-tiba menyedot kuota data seluler tanpa sadar), tapi kalau
// terdeteksi WiFi/kabel dengan pasti, langsung jalan tanpa dialog
// tambahan (penggunanya sendiri yang memilih untuk sinkron).
async function confirmAndSync(isFirstTime) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    alert("Tidak ada sambungan internet saat ini. Coba lagi setelah tersambung.");
    return;
  }
  const connType = detectConnectionType();
  if (connType === "wifi" || connType === "ethernet") {
    syncFromServer(isFirstTime);
    return;
  }
  await showBibleSyncPrompt({ isFirstTime, connType });
}

// Network Information API -- HANYA didukung sebagian browser (terutama
// Chrome/Android). Kalau tidak didukung (mis. Safari/iOS), fungsi ini
// mengembalikan null (artinya: "tidak diketahui", BUKAN "bukan wifi").
function detectConnectionType() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return null;
  if (conn.type) return conn.type; // "wifi" | "ethernet" | "cellular" | "none" | "unknown" | dst
  return null;
}

// Dialog gabungan: dipakai baik untuk unduhan PERTAMA KALI (opts.isFirstTime
// true, selalu muncul supaya tidak membingungkan) maupun sinkron ulang biasa
// saat WiFi tidak/tidak-bisa dipastikan (opts.isFirstTime false).
async function showBibleSyncPrompt(opts) {
  const { isFirstTime, connType } = opts || {};
  // Dipakai untuk teks (Alkitab saja untuk tamu, Alkitab+Kidung untuk yang
  // sudah login) -- SAMA seperti yang dipakai syncFromServer(), supaya
  // angka MB yang tampil DI SINI (sebelum sinkron dimulai) konsisten
  // dengan yang tampil nanti selama proses unduh berjalan.
  const dlInfo = await getInitialDownloadInfo();
  const sizeMB = dlInfo.bibleMb;
  let overlay = el("wifiPromptOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "wifiPromptOverlay";
    overlay.className = "announcement-big-overlay";
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = "";
  const box = document.createElement("div");
  box.className = "announcement-big-box";

  const title = document.createElement("div");
  title.className = "announcement-big-title";
  title.textContent = isFirstTime && (connType === "wifi" || connType === "ethernet" || !connType && navigator.onLine)
    ? "📥 Unduh Data Alkitab (Pertama Kali)"
    : "📶 Belum terdeteksi WiFi";
  box.appendChild(title);

  const msg = document.createElement("div");
  msg.className = "announcement-big-text";
  if (isFirstTime) {
    msg.textContent =
      `Aplikasi ini perlu mengunduh seluruh teks Alkitab (semua bahasa) ke perangkat Anda — sekitar ${sizeMB} MB, HANYA SEKALI ini saja. ` +
      `Setelah selesai, semua bacaan tersimpan di perangkat dan bisa dibuka lagi kapan pun tanpa perlu unduh ulang / tanpa internet — jadi loading panjang di awal ini WAJAR, bukan aplikasi macet. ` +
      `Prosesnya bisa memakan waktu beberapa menit tergantung kecepatan internet.` +
      (connType === "cellular" ? " Perangkat ini sepertinya sedang memakai DATA SELULER — unduhan sebesar ini bisa memakai banyak kuota." : "");
  } else {
    // Sinkron ulang, WiFi/kabel tidak/tidak-bisa dipastikan -- SEKARANG
    // ikut menyebutkan perkiraan ukurannya (dlInfo.label, mis. "~62 MB
    // (Alkitab ~58 MB + Kidung ~4 MB)"), sebelumnya cuma peringatan
    // polos tanpa angka MB sama sekali.
    msg.textContent = connType === "cellular"
      ? `Perangkat ini sepertinya sedang memakai data seluler. Data yang akan diunduh ulang sekitar ${dlInfo.label} — melanjutkan sekarang bisa memakai banyak kuota.`
      : `Aplikasi tidak bisa memastikan Anda sedang tersambung WiFi atau data seluler. Data yang akan diunduh ulang sekitar ${dlInfo.label} — kalau sedang memakai data seluler, melanjutkan sekarang bisa memakai banyak kuota.`;
  }
  box.appendChild(msg);

  if (!isFirstTime || connType === "cellular" || !connType) {
    const msg2 = document.createElement("div");
    msg2.className = "announcement-big-meta";
    msg2.textContent = isFirstTime
      ? "Anda tetap bisa masuk dulu; data Alkitab belum tersedia sampai diunduh (nanti dari menu ⋮ → 📥 Unduh Data Alkitab, ada info progresnya)."
      : "Sebaiknya tunggu sampai tersambung WiFi, atau lanjutkan sekarang kalau memang tidak masalah memakai kuota.";
    box.appendChild(msg2);
  }

  const btnRow = document.createElement("div");
  btnRow.className = "round-media-row";
  btnRow.style.marginTop = "12px";

  if (isFirstTime) {
    const laterBtn = document.createElement("button");
    laterBtn.className = "chip-btn small";
    laterBtn.textContent = "⏭️ Masuk Dulu (unduh nanti)";
    laterBtn.addEventListener("click", () => {
      overlay.hidden = true;
      showBibleNotDownloadedState(
        "Data Alkitab belum diunduh. Buka menu ⋮ → 📥 Unduh Data Alkitab kapan saja untuk mulai mengunduh."
      );
    });
    btnRow.appendChild(laterBtn);
  } else {
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "chip-btn small";
    cancelBtn.textContent = "Batal";
    cancelBtn.addEventListener("click", () => { overlay.hidden = true; });
    btnRow.appendChild(cancelBtn);
  }

  const nowBtn = document.createElement("button");
  nowBtn.className = "chip-btn primary";
  nowBtn.textContent = isFirstTime ? `📥 Mulai Unduh (~${sizeMB} MB)` : `📥 Lanjutkan Sekarang (~${dlInfo.totalMb} MB)`;
  nowBtn.addEventListener("click", () => {
    overlay.hidden = true;
    syncFromServer(!!isFirstTime);
  });
  btnRow.appendChild(nowBtn);

  box.appendChild(btnRow);
  overlay.appendChild(box);
  overlay.hidden = false;
}

// Dipakai kalau pengguna memilih masuk dulu tanpa mengunduh -- aplikasi tetap
// terbuka (kosong, belum ada ayat sama sekali) dengan info jelas + tombol
// unduh langsung di tengah layar, bukan cuma disembunyikan di menu ⋮ saja.
function showBibleNotDownloadedState(message) {
  bibleData = [];
  afterDataReady();
  const empty = el("emptyState");
  empty.innerHTML = "";
  const p1 = document.createElement("p");
  p1.textContent = "📭 Data Alkitab belum ada di perangkat ini.";
  p1.style.fontWeight = "700";
  empty.appendChild(p1);
  const p2 = document.createElement("p");
  p2.textContent = message;
  empty.appendChild(p2);
  const btn = document.createElement("button");
  btn.className = "chip-btn primary";
  btn.textContent = "📥 Unduh Data Alkitab Sekarang";
  btn.addEventListener("click", () => syncFromServer(true));
  empty.appendChild(btn);
  empty.hidden = false;
}

function setLoadingText(t) {
  el("loadingText").textContent = t;
}
function setLoadingProgress(pct) {
  el("loadingProgress").style.width = pct + "%";
}

// fetch() biasa yang menunggu tanpa batas kalau server tidak pernah merespons.
// Untuk file Alkitab yang besar, kalau server Google benar-benar macet/lambat
// sekali, lebih baik tampilkan pesan error yang jelas setelah beberapa saat
// daripada layar loading diam selamanya tanpa keterangan apa-apa.
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error(
        `Waktu tunggu habis (lebih dari ${Math.round(timeoutMs / 1000)} detik) saat mengambil data dari server. ` +
        `Periksa koneksi internet Anda, atau coba lagi.`
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// ------------------------------------------------------------
// PENGATURAN APLIKASI DARI GOOGLE SHEET (tab "Setup", BARU) -- dipakai
// supaya beberapa angka (mis. perkiraan ukuran total unduhan data
// Alkitab) bisa diubah administrator langsung dari Google Sheet, TANPA
// perlu ubah js/config.js atau deploy ulang apa pun. Lihat endpoint
// "app_setup" & getSetupNumber_() di apps-script/Code.gs. Hasilnya
// di-cache di memori (bukan disimpan permanen) supaya tidak memanggil
// server berkali-kali dalam satu sesi, tapi tetap segar tiap kali
// aplikasi dibuka ulang / dimuat ulang.
// ------------------------------------------------------------
let _remoteAppSetupCache = null;
let _remoteAppSetupPromise = null;

async function fetchRemoteAppSetup_() {
  if (_remoteAppSetupCache) return _remoteAppSetupCache;
  if (!CONFIG.APPS_SCRIPT_URL) return null;
  if (!_remoteAppSetupPromise) {
    _remoteAppSetupPromise = fetch(`${CONFIG.APPS_SCRIPT_URL}?type=app_setup`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d.ok && d.setup) {
          _remoteAppSetupCache = d.setup;
          return _remoteAppSetupCache;
        }
        return null;
      })
      .catch(() => null); // offline / Apps Script belum dikonfigurasi -> null, pemanggil jatuh balik ke CONFIG.*
  }
  return _remoteAppSetupPromise;
}

// Perkiraan ukuran (MB) TOTAL unduhan data Alkitab (+ Pokok Kitab/Garis
// Besar/Peta) -- SEKARANG DIHITUNG OTOMATIS OLEH PROGRAM dari unduhan
// nyata (lihat saveMeasuredBibleSizeMb_() di bawah), BUKAN diketik manual.
// Urutan sumber:
//  1. Tab "Setup" Google Sheet (key bible_data_approx_size_mb) -- angka di
//     sini sekarang DITULIS OTOMATIS oleh apps-script/Code.gs
//     (updateMeasuredBibleSizeMb_()) setiap ada perangkat mana pun yang
//     baru saja selesai mengunduh, jadi berlaku juga untuk perangkat LAIN
//     yang belum pernah mengunduh sama sekali.
//  2. Kalau tab Setup belum pernah diisi ATAU Apps Script tidak
//     dikonfigurasi/tidak bisa dihubungi: angka hasil ukur TERAKHIR di
//     PERANGKAT INI SENDIRI (localStorage, lihat loadMeasuredBibleSizeMbLocal_()).
//  3. Kalau perangkat ini pun belum pernah sama sekali mengukur (baru
//     pertama kali dibuka di HP mana pun, dan Apps Script kosong): baru
//     jatuh balik ke CONFIG.BIBLE_DATA_APPROX_SIZE_MB (js/config.js),
//     lalu 60 sebagai jaga-jaga terakhir -- ini HANYA dipakai sekali di
//     awal sebelum ada pengukuran nyata sama sekali.
async function getEffectiveBibleSizeMb() {
  const remote = await fetchRemoteAppSetup_();
  const remoteVal = remote && Number(remote.bible_data_approx_size_mb);
  if (Number.isFinite(remoteVal) && remoteVal > 0) return remoteVal;
  const local = loadMeasuredBibleSizeMbLocal_();
  if (local) return local;
  return (typeof CONFIG !== "undefined" && CONFIG.BIBLE_DATA_APPROX_SIZE_MB) || 60;
}

const MEASURED_SIZE_KEY = "bible_app_measured_size_mb_v1";

// Baca hasil ukur TERAKHIR yang tersimpan di perangkat ini sendiri (dari
// unduhan penuh sebelumnya di perangkat yang sama).
function loadMeasuredBibleSizeMbLocal_() {
  try {
    const v = Number(localStorage.getItem(MEASURED_SIZE_KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch (e) {
    return null;
  }
}

// Dipanggil OTOMATIS setiap kali unduhan/sinkron PENUH selesai (lihat
// syncFromServer() di bawah) dengan ukuran byte SUNGGUHAN yang baru saja
// diterima -- BUKAN pernah diketik siapa pun. Menyimpan ke perangkat ini
// (instan, langsung dipakai lagi kalau perlu di perangkat yang sama), dan
// (kalau Apps Script dikonfigurasi) mengirimkannya ke server supaya tab
// "Setup" ikut ter-update otomatis untuk SEMUA perangkat/pengguna lain --
// best-effort, diam-diam diabaikan kalau offline / Apps Script belum ada.
function saveMeasuredBibleSizeMb_(mb) {
  if (!Number.isFinite(mb) || mb <= 0) return;
  try { localStorage.setItem(MEASURED_SIZE_KEY, String(mb)); } catch (e) {}
  if (CONFIG.APPS_SCRIPT_URL) {
    fetch(CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ type: "report_bible_size", mb }),
    }).catch(() => {});
  }
  // Buang cache pengaturan lama supaya panggilan getEffectiveBibleSizeMb()
  // BERIKUTNYA (mis. kalau nanti dialog unduh dibuka lagi di sesi yang
  // sama) tidak memakai angka lama yang sudah kadaluarsa.
  _remoteAppSetupCache = null;
}

// ------------------------------------------------------------
// Unduh isi URL sebagai teks, SAMBIL melaporkan progres unduhan dalam
// BYTE ASLI yang sudah diterima (bukan tebakan) -- dipakai supaya layar
// unduhan bisa menampilkan "X MB dari Y MB" yang sungguhan mengikuti
// unduhan, bukan cuma persentase buta. `total` dari Content-Length
// respons kalau server mengirimkannya (Google Sheets publish-to-web
// biasanya iya); kalau tidak ada, `onProgress` tetap dipanggil dengan
// total=null dan pemanggilnya memakai perkiraan (getEffectiveBibleSizeMb())
// sebagai gantinya. Browser lama yang tidak mendukung streaming body
// (jarang sekali di 2026) jatuh balik ke fetch biasa tanpa progres MB
// bertahap -- tetap jalan, hanya progresnya melompat sekali di akhir.
// ------------------------------------------------------------
async function fetchTextWithProgress(url, timeoutMs, onProgress) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!res.ok) throw new Error("Gagal mengambil data (" + res.status + ")");
    const totalHeader = res.headers.get("content-length");
    const total = totalHeader ? Number(totalHeader) : null;

    if (!res.body || !res.body.getReader) {
      // Fallback: browser tidak mendukung streaming ReadableStream body.
      const text = await res.text();
      onProgress(text.length, total || text.length);
      return text;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let received = 0;
    let result = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      result += decoder.decode(value, { stream: true });
      onProgress(received, total);
    }
    result += decoder.decode(); // selesaikan sisa buffer decoder multi-byte
    return result;
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error(
        `Waktu tunggu habis (lebih dari ${Math.round(timeoutMs / 1000)} detik) saat mengambil data dari server. ` +
        `Periksa koneksi internet Anda, atau coba lagi.`
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// Tamu ("Coba Tanpa Daftar") HANYA berhak dapat data Alkitab -- Kidung
// (dan nanti Pengumuman/File/YouTube kalau ikut disinkron massal suatu
// saat) memang sudah disembunyikan dari UI tamu lewat gate di
// js/presentation-studio.js (refreshGuestGate/refreshDeviceGate), tapi
// TANPA cek di sini juga, resyncKidungSheet() tadinya tetap dipanggil
// untuk tamu -- diam-diam mengunduh & menyimpan data yang toh tidak
// akan pernah bisa mereka pakai (buang-buang kuota + storage perangkat
// tamu). Dipakai oleh syncFromServer() & getInitialDownloadInfo() di
// bawah supaya KEDUANYA (proses unduh sungguhan & teks info sebelum
// unduh) selalu sinkron/konsisten satu sama lain.
function currentUserHasFullAccess_() {
  return !(CONFIG.GUEST_MODE_ENABLED && typeof Guest !== "undefined" && Guest.isGuest());
}

// Info ringkas ukuran unduhan AWAL, dibedakan per level akses -- dipakai
// utk teks di layar unduhan (syncFromServer) MAUPUN kalau mau ditampilkan
// duluan sebelum orang menekan "Unduh" (mis. di layar login/tamu).
// Tamu: cuma Alkitab. Yang sudah punya akses (login): Alkitab + Kidung.
// Pengumuman/File PDF-gambar/link YouTube SENGAJA tidak dihitung di sini
// -- itu bukan data yang di-"unduh massal" ke tiap perangkat, melainkan
// dibuat langsung oleh operator per-sesi di Studio Presentasi & hanya
// tersimpan di perangkat operator itu sendiri (lihat js/collections.js).
async function getInitialDownloadInfo() {
  const bibleMb = await getEffectiveBibleSizeMb();
  const hasAccess = currentUserHasFullAccess_();
  const kidungMb = hasAccess ? (CONFIG.KIDUNG_DATA_APPROX_KB || 0) / 1024 : 0;
  const totalMb = Math.round((bibleMb + kidungMb) * 10) / 10;
  return {
    hasAccess,
    bibleMb,
    kidungMb: Math.round(kidungMb * 10) / 10,
    totalMb,
    label: hasAccess
      ? `~${totalMb} MB (Alkitab ~${bibleMb} MB + Kidung ~${(Math.round(kidungMb * 100) / 100)} MB)`
      : `~${bibleMb} MB (Alkitab saja -- Kidung/Pengumuman/File/YouTube perlu akses login)`,
  };
}

async function syncFromServer(isFirstTime) {
  const overlay = el("loadingOverlay");
  overlay.hidden = false;
  const dlInfo = await getInitialDownloadInfo();
  const sizeMB = dlInfo.bibleMb;
  setLoadingText(
    isFirstTime
      ? `Mengunduh data awal (${dlInfo.label}) dari server — hanya sekali ini saja, mohon tunggu…`
      : `Menyinkronkan ulang data Alkitab dari server… (${dlInfo.label})`
  );
  setLoadingProgress(1);

  try {
    // Ambil file CSV SAMBIL melaporkan progres dalam MB ASLI yang sudah
    // diterima (bukan tebakan) -- lihat fetchTextWithProgress() di atas.
    // Kalau server tidak mengirim Content-Length, `total` di bawah null
    // dan dipakai perkiraan (sizeMB dari tab Setup / config.js) sebagai
    // gantinya, supaya angka "dari ... MB"-nya tetap masuk akal.
    // Timeout 2 menit — cukup longgar untuk file besar (puluhan MB), tapi
    // tetap menampilkan pesan error jelas kalau server benar-benar macet.
    const approxTotalBytes = sizeMB * 1024 * 1024;
    const csvText = await fetchTextWithProgress(CONFIG.BIBLE_SHEET_CSV_URL, 120000, (received, total) => {
      const totalForDisplay = total || approxTotalBytes;
      const mbDone = (received / 1024 / 1024).toFixed(1);
      const mbTotal = (totalForDisplay / 1024 / 1024).toFixed(1);
      setLoadingText(`📥 Mengunduh data Alkitab… ${mbDone} MB dari ~${mbTotal} MB`);
      // 1%–40% dialokasikan untuk tahap UNDUH mentah (paling lama & paling
      // besar porsinya), sisanya (40%–95%) untuk baca+simpan di bawah.
      const pct = 1 + Math.min(39, Math.round((received / totalForDisplay) * 39));
      setLoadingProgress(pct);
    });
    setLoadingProgress(40);

    if (!isFirstTime) await LocalDB.clearAll();

    // Baca & simpan bertahap (per ~3000 baris), supaya browser tidak membeku dan
    // progress bar benar-benar mengikuti proses asli — bukan lompat tiba-tiba.
    const allRecords = [];
    let savedCount = 0;

    await parseCSVChunked(csvText, {
      batchSize: 3000,
      onProgress: (done, total) => {
        // 40%–95% dialokasikan untuk tahap membaca + menyimpan data
        const pct = 40 + Math.round((done / total) * 55);
        setLoadingProgress(pct);
      },
      onBatch: async (rawBatch) => {
        const normalized = rawBatch.map(normalizeVerseRecord).filter((v) => v.verseId);
        allRecords.push(...normalized);
        await LocalDB.bulkPut(normalized);
        savedCount += normalized.length;
        setLoadingText(`Membaca & menyimpan data Alkitab… (${savedCount.toLocaleString("id-ID")} ayat)`);
      },
    });

    await LocalDB.setMeta("lastSync", new Date().toISOString());
    setLoadingProgress(97);

    // Ikut sinkronkan Pokok Kitab / Garis Besar / Peta+Gambar (3 sheet
    // terpisah, lihat js/outlines.js) supaya tidak perlu tombol/menu
    // terpisah lagi -- kalau salah satu sheet gagal diambil (mis. sheet-nya
    // belum ada isinya), tetap lanjut, tidak sampai menggagalkan sinkron
    // Alkitab utama yang sudah berhasil.
    if (typeof resyncAllOutlineSheets === "function") {
      setLoadingText("Menyinkronkan Pokok Kitab, Garis Besar & Peta/Gambar…");
      await resyncAllOutlineSheets().catch(() => {});
    }

    // Kidung/Hymn (opsional -- lihat js/kidung.js). Diam-diam dilewati
    // kalau CONFIG.KIDUNG_SHEET_CSV_URL masih kosong (fitur belum
    // diaktifkan admin), atau kalau gagal (mis. sheet belum ada isinya)
    // -- tidak sampai menggagalkan sinkron Alkitab yang sudah berhasil.
    // JUGA dilewati untuk TAMU (dlInfo.hasAccess === false) -- fiturnya
    // toh sudah disembunyikan dari UI tamu (Studio Presentasi), jadi
    // tidak perlu diam-diam mengunduh & menyimpan data yang tidak akan
    // pernah dipakai (hemat kuota + storage perangkat tamu). Kalau
    // tamu ini nanti LOGIN (jadi bukan tamu lagi), sinkron berikutnya
    // otomatis ikut mengambil Kidung seperti biasa.
    if (typeof resyncKidungSheet === "function" && dlInfo.hasAccess) {
      setLoadingText("Menyinkronkan data Kidung…");
      await resyncKidungSheet().catch(() => {});
    }
    setLoadingProgress(100);

    // UKURAN ASLI TOTAL yang baru saja diunduh (Alkitab utama + ketiga
    // sheet outline) -- dihitung dari byte SUNGGUHAN (Blob), lalu disimpan
    // otomatis lewat saveMeasuredBibleSizeMb_() di atas. Ini yang membuat
    // perkiraan "~X MB" di dialog unduhan berikutnya SELALU angka nyata
    // hasil kalkulasi program, bukan angka yang diketik manual di Sheet.
    try {
      const bibleBytes = new Blob([csvText]).size;
      const outlineBytes = typeof totalOutlineBytesLastSync === "function" ? totalOutlineBytesLastSync() : 0;
      const measuredMb = Math.round(((bibleBytes + outlineBytes) / 1024 / 1024) * 10) / 10;
      saveMeasuredBibleSizeMb_(measuredMb);
    } catch (e) { /* pengukuran gagal -- tidak menggagalkan sinkron yang sudah berhasil */ }

    bibleData = allRecords;
    setTimeout(() => {
      overlay.hidden = true;
      afterDataReady();
    }, 250);
  } catch (err) {
    setLoadingText("Gagal mengambil data: " + err.message + ". Periksa URL Google Sheet Alkitab di config.js, lalu muat ulang halaman.");
    setLoadingProgress(0);
  }
}

function afterDataReady() {
  buildIndexes();
  initLanguageSelector();
  el("appRoot").hidden = false;
  buildSidebar();
  initWidthControl();
  initFontSizeControl();
  initThemeControl();
  initFontFamilyControl();
  initNoteFontFamilyControl();
  initFullscreenControl();
  initTTS();
  initReadingProgressControl();
  initFootnoteAccentControl();
  initColumnsControl();
  initVerseModeControl();
  updateStatusPanel();
  updateResyncBtnLabel();
  showEmptyState();
}

// Teks tombol menu ⋮ disesuaikan: kalau data lokal masih kosong sama
// sekali, tombolnya jelas mengarah ke "unduh pertama kali"; kalau sudah
// ada data, jadi "sinkron ulang" biasa. Satu tombol, dua konteks.
function updateResyncBtnLabel() {
  const btn = el("resyncBtn");
  if (!btn) return;
  btn.textContent = bibleData.length
    ? "🔄 Sinkronkan ulang Alkitab"
    : "📥 Unduh Data Alkitab";
}

async function updateStatusPanel() {
  const lastBible = await LocalDB.getMeta("lastSync");
  const lastUsers = await LocalDB.getMeta("lastUserSync");
  const n = bibleData.length;
  const levelText = typeof levelDisplayLabel === "function" ? levelDisplayLabel() : "";
  el("userStatus").textContent =
    typeof Guest !== "undefined" && Guest.isGuest()
      ? "👤 Mode Tamu (belum masuk)"
      : `Masuk sebagai: ${currentUserDisplay || currentUser}` + (levelText ? ` · ${levelText}` : "");
  el("syncStatus").textContent =
    `${n.toLocaleString("id-ID")} baris Alkitab tersimpan lokal` +
    (lastBible ? ` — sinkron ${new Date(lastBible).toLocaleString("id-ID")}` : "") +
    (lastUsers ? ` · pengguna sinkron ${new Date(lastUsers).toLocaleString("id-ID")}` : "");
  updateLevelGatedMenus();
}

// Tombol menu yang hanya boleh tampil untuk level tertentu:
//  - "📊 Log Aktivitas": khusus administrator.
//  - "👀 Pantau Pembacaan": administrator/penatua/gembala distrik/gembala/
//    pra gembala/inti (bukan "Kaum Saleh"/tanpa level) -- lihat hasAnyLevel().
function updateLevelGatedMenus() {
  if (el("logViewerBtn")) el("logViewerBtn").hidden = !isAdministrator();
  if (el("monitorBtn")) el("monitorBtn").hidden = !hasAnyLevel();
  // aiChatBtn: untuk TAMU jangan disembunyikan sama sekali -- biar tetap
  // kelihatan tapi "diabu-abukan" (lihat GUEST_GATED_MENU_IDS di bawah,
  // yang menangani abu-abu + kunci klik-nya). Disembunyikan HANYA untuk
  // pengguna yang SUDAH LOGIN tapi levelnya memang tidak diizinkan.
  if (el("aiChatBtn")) {
    const allowedNow = typeof isAiChatAllowed === "function" ? isAiChatAllowed() : false;
    const guestNow = !!(CONFIG.GUEST_MODE_ENABLED && typeof Guest !== "undefined" && Guest.isGuest());
    el("aiChatBtn").hidden = !allowedNow && !guestNow;
  }
  if (el("langCheckBtn")) el("langCheckBtn").hidden = typeof isLangCheckAllowed === "function" ? !isLangCheckAllowed() : true;
  // BARU -- "🗂️ Kelola Pengguna" (persetujuan akun baru) & lonceng 🔔
  // notifikasi jumlah pencarian hari ini, khusus administrator.
  if (el("userManageBtn")) el("userManageBtn").hidden = !isAdministrator();
  if (typeof AdminBell !== "undefined") AdminBell.refreshVisibility(isAdministrator());
  applyGuestModeUi();
}

// ------------------------------------------------------------
// MODE TAMU -- menu yang TIDAK dibuka untuk tamu tetap TERLIHAT tapi
// "diabu-abukan" (bukan disembunyikan), klik-nya ditangkap dan
// menampilkan modal penjelasan (lihat js/guest.js showFeatureLocked()).
// Yang tetap PENUH untuk tamu: pencarian ayat (1/2/3 kolom), salin
// (copy) ayat, unduh/sinkron Alkitab, pengaturan tampilan (huruf,
// lebar, bahasa), Pengumuman & Info Kami.
// Yang DIKUNCI untuk tamu: Rencana Baca, Kumpulan Ayat, Catatan Saya,
// Curhat, AI Chat, serta highlight/catatan per-ayat (tombol nomor ayat) --
// lihat buildVerseBlock().
// ------------------------------------------------------------
const GUEST_GATED_MENU_IDS = ["planToggle", "collectionsMenuBtn", "notesMenuBtn", "curhatBtn", "aiChatBtn", "kidungMenuBtn"];

function applyGuestModeUi() {
  const guest = !!(CONFIG.GUEST_MODE_ENABLED && typeof Guest !== "undefined" && Guest.isGuest());

  GUEST_GATED_MENU_IDS.forEach((id) => {
    const node = el(id);
    if (!node) return;
    node.classList.toggle("menu-disabled", guest);
    node.setAttribute("aria-disabled", guest ? "true" : "false");
    if (guest && !node.dataset.guestGated) {
      node.dataset.guestGated = "1";
      node.addEventListener(
        "click",
        (e) => {
          if (!(CONFIG.GUEST_MODE_ENABLED && typeof Guest !== "undefined" && Guest.isGuest())) return;
          e.preventDefault();
          e.stopImmediatePropagation();
          Guest.showFeatureLocked(node.textContent.trim());
        },
        true // capture -- supaya tertangkap SEBELUM listener asli tombolnya jalan
      );
    }
  });

  // Sinkron ulang daftar pengguna tidak relevan untuk tamu (tidak login).
  if (el("resyncUsersBtn")) el("resyncUsersBtn").hidden = guest;

  if (el("logoutBtn")) el("logoutBtn").textContent = guest ? "🚪 Keluar dari Mode Tamu" : "🚪 Keluar (logout)";
  if (el("guestBanner")) el("guestBanner").hidden = !guest;

  // Mode Presentasi 2 Layar (js/presentation.js) khusus pengguna login.
  if (typeof Presentation !== "undefined") Presentation.refreshGuestGate();
  if (typeof PresentationStudio !== "undefined") PresentationStudio.refreshGuestGate();
}

// ------------------------------------------------------------
// 3) INDEX DI MEMORI — dibangun sekali agar pembacaan & pencarian instan
//    walau datanya ratusan ribu baris / banyak bahasa
// ------------------------------------------------------------
function buildIndexes() {
  verseIndex = {};
  verseById = {};
  bibleData.forEach((v) => {
    if (!verseIndex[v.lang]) verseIndex[v.lang] = {};
    if (!verseIndex[v.lang][v.bookNumber]) verseIndex[v.lang][v.bookNumber] = {};
    if (!verseIndex[v.lang][v.bookNumber][v.chapter]) verseIndex[v.lang][v.bookNumber][v.chapter] = [];
    verseIndex[v.lang][v.bookNumber][v.chapter].push(v);
    verseById[v.id] = v;
  });

  chaptersByBook = {};
  Object.keys(verseIndex).forEach((lang) => {
    chaptersByBook[lang] = {};
    Object.keys(verseIndex[lang]).forEach((bookNum) => {
      const chObj = verseIndex[lang][bookNum];
      Object.keys(chObj).forEach((ch) => chObj[ch].sort((a, b) => a.verse - b.verse));
      chaptersByBook[lang][bookNum] = Object.keys(chObj).map(Number).sort((a, b) => a - b);
    });
  });
}

function getChapterVerses(lang, bookNum, chapter) {
  return (verseIndex[lang] && verseIndex[lang][bookNum] && verseIndex[lang][bookNum][chapter]) || [];
}
function getChaptersForBook(lang, bookNum) {
  return (chaptersByBook[lang] && chaptersByBook[lang][bookNum]) || [];
}
function bookAvailableInLang(lang, bookNum) {
  return getChaptersForBook(lang, bookNum).length > 0;
}

// Bahasa acuan untuk menyusun jadwal rencana baca (dipakai untuk menentukan
// pasal mana saja yang ada), memakai bahasa default bila tersedia, kalau
// tidak memakai bahasa yang sedang aktif.
function referenceLangForPlans() {
  if (chaptersByBook[CONFIG.DEFAULT_LANGUAGE]) return CONFIG.DEFAULT_LANGUAGE;
  return currentLang;
}

function buildScheduleForScope(scope) {
  const lang = referenceLangForPlans();
  const items = [];
  BOOKS.forEach((b) => {
    if (scope !== "ALL" && b.testament !== scope) return;
    getChaptersForBook(lang, b.num).forEach((ch) => items.push({ bookNum: b.num, chapter: ch }));
  });
  return items;
}

// ------------------------------------------------------------
// 4) PEMILIH BAHASA
// ------------------------------------------------------------
// Kunci localStorage bahasa PILIHAN MANUAL sekarang per-pengguna (BARU --
// sebelumnya satu kunci global "bible_app_lang" dipakai bersama oleh semua
// akun di perangkat yang sama). Tamu (currentUser kosong) tetap memakai
// kunci global lama supaya tidak kehilangan preferensi yang sudah ada.
function languageStorageKey_() {
  return currentUser ? "bible_app_lang:" + currentUser : "bible_app_lang";
}

// Mencocokkan isi kolom "Language"/"Bahasa" Sheet Pengguna (bebas huruf
// besar/kecil & spasi di sekitarnya, mis. "RVIND", " rvind ") ke salah satu
// kode di CONFIG.LANGUAGES -- "" kalau kosong atau kodenya tidak dikenal
// (supaya tidak salah ketik admin membuat aplikasi macet, cukup diabaikan).
function resolveSheetDefaultLanguage_(raw) {
  const v = String(raw || "").trim().toLowerCase();
  if (!v) return "";
  const found = CONFIG.LANGUAGES.find((l) => l.code.toLowerCase() === v);
  return found ? found.code : "";
}

function initLanguageSelector() {
  const langKey = languageStorageKey_();
  // Sudah pernah pilih bahasa SECARA MANUAL di perangkat ini (dropdown
  // bahasa) -> preferensi manual itu SELALU menang, tidak pernah ditimpa
  // ulang oleh kolom Language di Sheet supaya pengguna bebas ganti-ganti
  // bahasa kapan saja tanpa "ditarik paksa" balik ke default tiap masuk.
  const saved = localStorage.getItem(langKey);
  // BARU -- kalau BELUM PERNAH pilih manual di perangkat ini, bahasa AWAL
  // Alkitab dituntun oleh kolom "Language" (atau "Bahasa" kalau "Language"
  // kosong) di Sheet Pengguna, lihat currentUserExtraLanguage (diisi saat
  // login, lihat initAuth() & submit form login di atas). Kosong / kode
  // tidak dikenal = tetap jatuh balik ke CONFIG.DEFAULT_LANGUAGE (Indonesia).
  const sheetDefault = resolveSheetDefaultLanguage_(currentUserExtraLanguage);
  const available = CONFIG.LANGUAGES.filter((l) => verseIndex[l.code]);
  currentLang =
    (saved && verseIndex[saved] && saved) ||
    (sheetDefault && verseIndex[sheetDefault] && sheetDefault) ||
    (verseIndex[CONFIG.DEFAULT_LANGUAGE] && CONFIG.DEFAULT_LANGUAGE) ||
    (available[0] && available[0].code);

  const sel = el("langSelect");
  sel.innerHTML = "";
  (available.length ? available : CONFIG.LANGUAGES).forEach((l) => {
    const opt = document.createElement("option");
    opt.value = l.code;
    opt.textContent = l.label;
    sel.appendChild(opt);
  });
  sel.value = currentLang;

  sel.addEventListener("change", () => {
    currentLang = sel.value;
    localStorage.setItem(langKey, currentLang);
    if (el("columnLang1")) el("columnLang1").value = currentLang;
    buildSidebar();
    if (currentBookNum && currentChapter) {
      if (bookAvailableInLang(currentLang, currentBookNum)) {
        renderChapter(currentBookNum, currentChapter, highlightVerse, { openNote: highlightVerseOpenNote });
      } else {
        showLangUnavailable();
      }
    } else {
      showEmptyState();
    }
  });
}

// ------------------------------------------------------------
// 4b) TAMPILAN KOLOM (1/2/3 bahasa berdampingan) — menu ⋮
// ------------------------------------------------------------
function initColumnsControl() {
  const available = CONFIG.LANGUAGES.filter((l) => verseIndex[l.code]);
  const langOptionsHtml = available.map((l) => `<option value="${l.code}">${l.label}</option>`).join("");

  const sel1 = el("columnLang1");
  const sel2 = el("columnLang2");
  const sel3 = el("columnLang3");
  if (!sel1 || !sel2 || !sel3) return; // menu belum ada di halaman (seharusnya selalu ada)

  const settings = loadLocalSettings(currentUser);
  const savedLangs = settings.columnLangs || [];
  sel1.innerHTML = langOptionsHtml;
  sel2.innerHTML = langOptionsHtml;
  sel3.innerHTML = langOptionsHtml;
  // Kolom 1 selalu mengikuti bahasa aktif (sama seperti dropdown bahasa di
  // header) — dropdown ini adalah cara lain untuk mengganti bahasa yang
  // sama, supaya konsisten letaknya dengan Kolom 2/3.
  sel1.value = currentLang;
  sel1.addEventListener("change", () => {
    el("langSelect").value = sel1.value;
    el("langSelect").dispatchEvent(new Event("change"));
  });

  if (savedLangs[0] && available.some((l) => l.code === savedLangs[0])) sel2.value = savedLangs[0];
  else if (available[1]) sel2.value = available[1].code;
  if (savedLangs[1] && available.some((l) => l.code === savedLangs[1])) sel3.value = savedLangs[1];
  else if (available[2]) sel3.value = available[2].code;

  // PENTING: tombol jumlah kolom ("1/2/3 Kolom") dan tombol arah
  // ("Menyamping"/"Atas-bawah") SAMA-SAMA memakai class ".columns-btn"
  // (dipakai bersama hanya untuk styling tombol). Kalau di-query lewat
  // "document.querySelectorAll(\".columns-btn\")" begitu saja, listener klik
  // untuk tombol jumlah kolom ikut terpasang ke tombol arah juga (dan
  // sebaliknya) -- akibatnya klik tombol arah ikut memicu handler jumlah
  // kolom dengan btn.dataset.cols = undefined -> Number(undefined) = NaN,
  // lalu NaN itu tersimpan sebagai pengaturan "columns". Karena NaN falsy,
  // baris render (`getSetting(...,"columns") || 1`) jatuh balik ke 1 kolom
  // -- itulah sebabnya tampilan 3-kolom langsung hilang begitu tombol arah
  // (menyamping ATAU atas-bawah, dua-duanya) diklik. Perbaikannya: query
  // masing-masing SELALU dibatasi ke grup tombolnya sendiri (#columnsBtnGroup
  // vs #columnDirectionBtnGroup), bukan ke seluruh dokumen.
  const colsGroup = el("columnsBtnGroup");
  const colsBtns = colsGroup ? colsGroup.querySelectorAll(".columns-btn") : document.querySelectorAll(".columns-btn");

  function applyColumnsUI(count) {
    colsBtns.forEach((b) => {
      b.classList.toggle("active", Number(b.dataset.cols) === count);
    });
    el("columnLangRow2").hidden = count < 2;
    el("columnLangRow3").hidden = count < 3;
    const dirRow = el("columnDirectionRow");
    if (dirRow) dirRow.hidden = count < 2;
  }
  applyColumnsUI(settings.columns || 1);

  const dirGroup = el("columnDirectionBtnGroup");
  function applyDirectionUI(direction) {
    if (!dirGroup) return;
    dirGroup.querySelectorAll(".columns-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.dir === direction);
    });
  }
  applyDirectionUI(settings.columnDirection || "side");
  if (dirGroup) {
    dirGroup.querySelectorAll(".columns-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        applyDirectionUI(btn.dataset.dir);
        setSetting(currentUser, "columnDirection", btn.dataset.dir);
        rerenderIfReading();
      });
    });
  }

  function rerenderIfReading() {
    if (currentBookNum && currentChapter) renderChapter(currentBookNum, currentChapter, highlightVerse, { openNote: highlightVerseOpenNote });
  }

  colsBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const count = Number(btn.dataset.cols);
      applyColumnsUI(count);
      setSetting(currentUser, "columns", count);
      rerenderIfReading();
    });
  });

  function saveLangsAndRerender() {
    setSetting(currentUser, "columnLangs", [sel2.value, sel3.value]);
    rerenderIfReading();
  }
  sel2.addEventListener("change", saveLangsAndRerender);
  sel3.addEventListener("change", saveLangsAndRerender);
}

function showLangUnavailable() {
  hideAllPanels();
  el("emptyState").hidden = false;
  el("emptyState").querySelector("p").textContent =
    "Kitab ini belum tersedia dalam bahasa yang dipilih. Coba pilih kitab atau bahasa lain.";
}

// ------------------------------------------------------------
// 5) SIDEBAR — daftar kitab & pemilih pasal
// ------------------------------------------------------------
function buildSidebar() {
  const plWrap = el("bookListPL");
  const pbWrap = el("bookListPB");
  plWrap.innerHTML = "";
  pbWrap.innerHTML = "";

  BOOKS.forEach((b) => {
    const available = bookAvailableInLang(currentLang, b.num);
    const btn = document.createElement("button");
    btn.className = "book-item" + (available ? "" : " unavailable");
    btn.textContent = b.name;
    btn.dataset.book = b.num;
    btn.disabled = !available;
    if (available) {
      btn.addEventListener("click", () => {
        openChapterPicker(b.num);
        closeSidebarOnMobile();
      });
    }
    (b.testament === "PL" ? plWrap : pbWrap).appendChild(btn);
  });
}

function setActiveBookButton(bookNum) {
  document.querySelectorAll(".book-item").forEach((btn) => {
    btn.classList.toggle("active", parseInt(btn.dataset.book, 10) === bookNum);
  });
}

function openChapterPicker(bookNum) {
  const book = BOOKS.find((b) => b.num === bookNum);
  if (!book) return;
  setActiveBookButton(bookNum);

  const sorted = getChaptersForBook(currentLang, bookNum);
  if (sorted.length === 0) {
    showLangUnavailable();
    return;
  }

  hideAllPanels();
  el("chapterPickerTitle").textContent = book.name;

  // PERUBAHAN: nomor pasal SEKARANG SELALU langsung ditampilkan di sini,
  // seketika, TANPA menunggu apa pun -- termasuk tidak menunggu baris
  // "📌 Pokok"/"📋 Garis Besar Kitab"/"🗺️ Peta+Gambar". Begitu nama
  // kitab dipencet, nomor pasal langsung kelihatan (tidak ada jeda
  // tunggu sama sekali, walau data pokok/garis besar/peta belum siap).
  //
  // Baris tombol "📌 Pokok" dkk BOLEH menyusul belakangan (baik dari
  // cache -- praktis instan -- maupun dari fallback ambil ke server,
  // yang jarang terjadi). Yang menjamin baris itu TIDAK ikut mendorong
  // nomor pasal turun saat menyusul BUKAN LAGI urutan render (seperti
  // sebelumnya), melainkan ruang tetap yang sudah dicadangkan lewat
  // CSS -- lihat kelas "chapter-picker-extra--reserved" di
  // style.css (.chapter-picker-extra--reserved) yang dipasang di bawah
  // SEBELUM tahu baris itu akhirnya terisi tombol atau kosong. Jadi
  // tinggi baris itu sudah pasti sejak awal, dan nomor pasal di
  // bawahnya tidak pernah bergeser posisi.
  fillChapterGrid(bookNum, sorted);
  el("chapterPicker").hidden = false;

  renderChapterPickerExtraReserved(bookNum, book);
}

function fillChapterGrid(bookNum, sorted) {
  const grid = el("chapterGrid");
  grid.innerHTML = "";
  sorted.forEach((ch) => {
    const btn = document.createElement("button");
    btn.textContent = ch;
    btn.addEventListener("click", () => renderChapter(bookNum, ch));
    grid.appendChild(btn);
  });
}

// ------------------------------------------------------------
//  Baris tombol tambahan di atas daftar nomor pasal: "📌 Pokok",
//  "📋 Garis Besar Kitab" & "🗺️ Peta+Gambar" -- masing² tetap berupa
//  TOMBOL (diklik dulu baru bukan panel-nya sendiri, posisinya tetap
//  sama seperti semula), hanya muncul kalau sheet-nya sudah diisi
//  URL & ada datanya untuk kitab ini.
//
//  KENAPA ADA DUA VERSI (SYNC vs ASYNC) DI BAWAH INI:
//  Dulu baris tombol ini SELALU dirender async (nunggu fetch/cache
//  dulu, BARU disisipkan) SETELAH grid nomor pasal sudah muncul
//  duluan. Akibatnya baris tombol nongol belakangan, mendorong
//  nomor-nomor pasal di bawahnya turun -- kalau pengguna sudah
//  keburu mengarahkan/menekan ke posisi nomor pasal, jarinya malah
//  kena tombol yang baru muncul itu. Perbaikannya:
//   1) renderChapterPickerExtra() (SYNC, di bawah) dipanggil DULU dari
//      openChapterPicker() SEBELUM grid nomor pasal ditampilkan --
//      kalau datanya sudah ada di cache localStorage (kasus normal
//      sehari-hari, karena Pokok Kitab dkk disinkron otomatis di latar
//      belakang saat app dibuka), baris tombol & grid nomor pasal
//      muncul BERSAMAAN dalam satu kali cat layar, tidak ada apa pun
//      yang "menyusul belakangan" lagi -- posisi tombol & nomor pasal
//      tetap seperti semula, sudah pasti dari awal.
//   2) Kalau cache-nya benar² belum ada (baru pertama kali pakai app,
//      belum pernah sinkron sama sekali) -- baru jatuh balik ke
//      renderChapterPickerExtraAsync() (async, sama seperti versi lama),
//      tapi ini kasus langka & cuma terjadi sekali.
// ------------------------------------------------------------
function buildOutlineButtonIfAny(box, book, bookNum, outline) {
  if (!outline.length) return;
  const b = document.createElement("button");
  b.type = "button";
  b.className = "chip-btn small book-info-btn";
  b.textContent = "📋 Garis Besar Kitab";
  b.title = "Lihat daftar isi/garis besar seluruh kitab " + book.name;
  b.addEventListener("click", () => openBookInfoPanel(bookNum, "outline"));
  box.appendChild(b);
}
function buildPokokButtonIfAny(box, book, bookNum, pokokHtml) {
  if (!pokokHtml) return;
  const b = document.createElement("button");
  b.type = "button";
  b.className = "chip-btn small book-info-btn";
  b.textContent = "📌 Pokok";
  b.title = "Lihat pokok/inti kitab " + book.name;
  b.addEventListener("click", () => openBookInfoPanel(bookNum, "pokok"));
  box.appendChild(b);
}
function buildMapsButtonIfAny(box, book, bookNum, maps) {
  if (!maps.length) return;
  const b = document.createElement("button");
  b.type = "button";
  b.className = "chip-btn small book-info-btn";
  b.textContent = "🗺️ Peta+Gambar";
  b.title = "Lihat peta/gambar kitab " + book.name;
  b.addEventListener("click", () => openBookInfoPanel(bookNum, "maps"));
  box.appendChild(b);
}

// Mengisi baris tombol "📌 Pokok" dkk TANPA membuat grid nomor pasal
// (yang sudah tampil duluan, lihat openChapterPicker) ikut bergeser --
// baik saat baris ini terisi cepat dari cache (kasus normal, praktis
// instan) maupun saat harus ambil ke server dulu (fallback langka,
// hanya kalau cache belum ada sama sekali, mis. pertama kali pakai
// app). Triknya: box langsung diberi kelas "chapter-picker-extra--
// reserved" (mencadangkan tinggi satu baris tombol lewat CSS) SEBELUM
// tahu isinya nanti ada tombol atau kosong sama sekali -- jadi tinggi
// box sudah pasti dari awal, grid pasal di bawahnya tidak pernah
// tergeser walau baris tombol ini menyusul belakangan.
function renderChapterPickerExtraReserved(bookNum, book) {
  const box = el("chapterPickerExtra");
  if (!box) return;
  box.innerHTML = "";
  box.hidden = false;
  box.classList.add("chapter-picker-extra--reserved");

  if (typeof anyOutlineFeatureAvailable !== "function" || !anyOutlineFeatureAvailable()) {
    box.classList.remove("chapter-picker-extra--reserved");
    box.hidden = true;
    return;
  }

  const fillFrom = (outline, pokokHtml, maps) => {
    // Kalau pengguna sudah keburu pindah ke kitab lain selama menunggu
    // (hanya relevan untuk jalur ambil-ke-server di bawah), jangan isi
    // baris tombol punya kitab yang lama ini lagi.
    if (!el("chapterPicker") || el("chapterPicker").hidden) return;
    if (el("chapterPickerTitle").textContent !== book.name) return;
    box.innerHTML = "";
    buildPokokButtonIfAny(box, book, bookNum, pokokHtml);
    buildOutlineButtonIfAny(box, book, bookNum, outline);
    buildMapsButtonIfAny(box, book, bookNum, maps);
    box.classList.remove("chapter-picker-extra--reserved");
    box.hidden = box.children.length === 0;
  };

  const outlineRows = (typeof garisBesarRowsFromCacheOnly === "function") ? garisBesarRowsFromCacheOnly() : null;
  const pokokRows = (typeof pokokKitabRowsFromCacheOnly === "function") ? pokokKitabRowsFromCacheOnly() : null;
  const mapRows = (typeof petaGambarRowsFromCacheOnly === "function") ? petaGambarRowsFromCacheOnly() : null;

  if (outlineRows !== null && pokokRows !== null && mapRows !== null) {
    // Cache sudah ada (kasus normal sehari-hari) -> isi sinkron, praktis instan.
    const outline = pickOutlineRowsForBook(outlineRows, bookNum, currentLang);
    const pokokHit = pickPokokRowFor(pokokRows, bookNum, currentLang);
    const maps = mapRows.filter((r) => r.bookNum === bookNum);
    fillFrom(outline, pokokHit ? pokokHit.pokok : null, maps);
    return;
  }

  // Cache belum ada sama sekali (jarang) -> ambil ke server; ruang baris
  // tombol SUDAH dicadangkan dari awal (lihat kelas --reserved di atas)
  // jadi grid pasal tidak ikut bergeser walau ini makan waktu.
  Promise.all([
    getOutlineForBook(bookNum, currentLang).catch(() => []),
    getPokokKitabFor(bookNum, currentLang).catch(() => null),
    getMapImagesForBook(bookNum).catch(() => []),
  ]).then(([outline, pokokHtml, maps]) => fillFrom(outline, pokokHtml, maps));
}

// ------------------------------------------------------------
//  Panel "Garis Besar Kitab" (daftar isi berjenjang, bisa diklik utk
//  langsung buka pasal:ayat) / "Pokok Kitab" / "Peta+Gambar" (galeri
//  bisa digulir + tombol unduh per gambar).
// ------------------------------------------------------------
async function openBookInfoPanel(bookNum, mode) {
  const book = BOOKS.find((b) => b.num === bookNum);
  if (!book) return;
  hideAllPanels();
  const panel = el("bookInfoPanel");
  panel.hidden = false;
  panel.innerHTML = "<p>Memuat…</p>";

  if (mode === "pokok") {
    const pokok = await getPokokKitabFor(bookNum, currentLang);
    panel.innerHTML = "";
    const back = backToChapterPickerBtn(bookNum);
    const h = document.createElement("h2");
    h.textContent = "📌 Pokok Kitab " + book.name;
    const box = document.createElement("div");
    box.className = "pokok-box pokok-box-html";
    box.innerHTML = pokok || "Belum ada isinya untuk kitab ini.";
    panel.appendChild(back);
    panel.appendChild(h);
    panel.appendChild(box);
    return;
  }

  if (mode === "maps") {
    const rows = await getMapImagesForBook(bookNum);
    panel.innerHTML = "";
    const back = backToChapterPickerBtn(bookNum);
    const h = document.createElement("h2");
    h.textContent = "🗺️ Peta+Gambar " + book.name;
    panel.appendChild(back);
    panel.appendChild(h);
    const gallery = document.createElement("div");
    gallery.className = "map-gallery";
    if (!rows.length) {
      const p = document.createElement("p");
      p.textContent = "Belum ada peta/gambar untuk kitab ini.";
      gallery.appendChild(p);
    } else {
      rows.forEach((r) => {
        const item = document.createElement("div");
        item.className = "map-gallery-item";
        const img = document.createElement("img");
        img.src = driveImagePreviewUrl(r.link);
        img.alt = "Peta/gambar " + book.name;
        img.loading = "lazy";
        const dl = document.createElement("a");
        dl.className = "chip-btn small";
        dl.href = driveDownloadUrl(r.link);
        dl.target = "_blank";
        dl.rel = "noopener noreferrer";
        dl.textContent = "⬇️ Unduh";
        item.appendChild(img);
        item.appendChild(dl);
        gallery.appendChild(item);
      });
    }
    panel.appendChild(gallery);
    return;
  }

  // mode === "outline" -> daftar isi berjenjang, klik = langsung buka pasal
  const entries = await getOutlineForBook(bookNum, currentLang);
  panel.innerHTML = "";
  const back = backToChapterPickerBtn(bookNum);
  const h = document.createElement("h2");
  h.textContent = "📋 Garis Besar Kitab " + book.name;
  panel.appendChild(back);
  panel.appendChild(h);
  const list = document.createElement("div");
  list.className = "outline-toc-list";
  if (!entries.length) {
    const p = document.createElement("p");
    p.textContent = "Belum ada garis besar untuk kitab ini.";
    list.appendChild(p);
  } else {
    entries.forEach((entry) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "outline-toc-item level-" + entry.level;
      item.innerHTML = `<span class="outline-toc-ref">${outlineRangeLabel(book.name, entry)}</span> ${escapeHtml(entry.ringkasan)}`;
      item.addEventListener("click", () => renderChapter(bookNum, entry.chapterStart, entry.verseStart));
      list.appendChild(item);
    });
  }
  panel.appendChild(list);
}

// ------------------------------------------------------------
//  PANEL GLOBAL "📌 Pokok Alkitab" -- dibuka dari tombol sidebar (bukan
//  per-kitab lagi), menampilkan Pokok Kitab dari SEMUA kitab yang punya
//  isinya sekaligus dalam satu layar yang bisa digulir, dikelompokkan
//  Perjanjian Lama / Perjanjian Baru, urut sesuai urutan kitab di Alkitab.
// ------------------------------------------------------------
async function showAllPokokPanel() {
  hideAllPanels();
  logActivity("Pokok Alkitab (Semua Kitab)");
  const panel = el("allPokokPanel");
  if (!panel) return;
  panel.hidden = false;
  panel.innerHTML = "<p>Memuat…</p>";

  const results = await Promise.all(
    BOOKS.map((b) => getPokokKitabFor(b.num, currentLang).then((pokok) => ({ book: b, pokok })).catch(() => ({ book: b, pokok: null })))
  );
  const withPokok = results.filter((r) => r.pokok);

  panel.innerHTML = "";
  const h = document.createElement("h2");
  h.textContent = "📌 Pokok Alkitab — Semua Kitab";
  panel.appendChild(h);

  if (!withPokok.length) {
    const p = document.createElement("p");
    p.className = "media-empty";
    p.textContent = "Belum ada isi Pokok Kitab sama sekali (sheet-nya masih kosong / belum disinkron).";
    panel.appendChild(p);
    return;
  }

  ["PL", "PB"].forEach((testament) => {
    const group = withPokok.filter((r) => r.book.testament === testament);
    if (!group.length) return;
    const groupTitle = document.createElement("h3");
    groupTitle.className = "all-pokok-group-title";
    groupTitle.textContent = testament === "PL" ? "Perjanjian Lama" : "Perjanjian Baru";
    panel.appendChild(groupTitle);
    group.forEach(({ book, pokok }) => {
      const box = document.createElement("div");
      box.className = "pokok-box pokok-box-list-item";
      const label = document.createElement("div");
      label.className = "pokok-box-label";
      label.textContent = book.name;
      const text = document.createElement("div");
      text.className = "pokok-box-html";
      text.innerHTML = pokok;
      const openBtn = document.createElement("button");
      openBtn.type = "button";
      openBtn.className = "chip-btn small";
      openBtn.textContent = "Buka kitab ini →";
      openBtn.addEventListener("click", () => renderChapter(book.num, 1));
      box.appendChild(label);
      box.appendChild(text);
      box.appendChild(openBtn);
      panel.appendChild(box);
    });
  });
}

// ------------------------------------------------------------
//  PANEL GLOBAL "🗺️ Peta + Gambar" -- dibuka dari tombol sidebar (bukan
//  per-kitab lagi), menampilkan SEMUA peta/gambar dari SELURUH kitab
//  sekaligus, dikelompokkan per kitab, dengan tombol unduh per gambar
//  (sama seperti galeri per-kitab yang sudah ada).
// ------------------------------------------------------------
async function showAllMapsPanel() {
  hideAllPanels();
  logActivity("Peta + Gambar (Semua Kitab)");
  const panel = el("allMapsPanel");
  if (!panel) return;
  panel.hidden = false;
  panel.innerHTML = "<p>Memuat…</p>";

  const results = await Promise.all(
    BOOKS.map((b) => getMapImagesForBook(b.num).then((rows) => ({ book: b, rows })).catch(() => ({ book: b, rows: [] })))
  );
  const withMaps = results.filter((r) => r.rows.length);

  panel.innerHTML = "";
  const h = document.createElement("h2");
  h.textContent = "🗺️ Peta + Gambar — Semua Kitab";
  panel.appendChild(h);

  if (!withMaps.length) {
    const p = document.createElement("p");
    p.className = "media-empty";
    p.textContent = "Belum ada peta/gambar sama sekali (sheet-nya masih kosong / belum disinkron).";
    panel.appendChild(p);
    return;
  }

  withMaps.forEach(({ book, rows }) => {
    const groupTitle = document.createElement("h3");
    groupTitle.className = "all-pokok-group-title";
    groupTitle.textContent = book.name;
    panel.appendChild(groupTitle);
    const gallery = document.createElement("div");
    gallery.className = "map-gallery";
    rows.forEach((r) => {
      const item = document.createElement("div");
      item.className = "map-gallery-item";
      const img = document.createElement("img");
      img.src = driveImagePreviewUrl(r.link);
      img.alt = "Peta/gambar " + book.name;
      img.loading = "lazy";
      const dl = document.createElement("a");
      dl.className = "chip-btn small";
      dl.href = driveDownloadUrl(r.link);
      dl.target = "_blank";
      dl.rel = "noopener noreferrer";
      dl.textContent = "⬇️ Unduh";
      item.appendChild(img);
      item.appendChild(dl);
      gallery.appendChild(item);
    });
    panel.appendChild(gallery);
  });
}

// Tombol sidebar "📌 Pokok Alkitab" / "🗺️ Peta + Gambar" otomatis
// disembunyikan kalau sheet yang bersangkutan belum diisi URL-nya di
// CONFIG.OUTLINE_SHEETS -- konsisten dengan perilaku fitur per-kitab.
function initGlobalOutlineSidebarButtons() {
  const cfg = (typeof CONFIG !== "undefined" && CONFIG.OUTLINE_SHEETS) || {};
  const pokokBtn = el("allPokokBtn");
  const mapsBtn = el("allMapsBtn");
  if (pokokBtn) {
    pokokBtn.hidden = !(cfg.pokokKitabCsvUrl && cfg.pokokKitabCsvUrl.trim());
    pokokBtn.addEventListener("click", () => { closeSidebarOnMobile(); showAllPokokPanel(); });
  }
  if (mapsBtn) {
    mapsBtn.hidden = !(cfg.petaGambarCsvUrl && cfg.petaGambarCsvUrl.trim());
    mapsBtn.addEventListener("click", () => { closeSidebarOnMobile(); showAllMapsPanel(); });
  }
}

function backToChapterPickerBtn(bookNum) {
  const back = document.createElement("button");
  back.type = "button";
  back.className = "chip-btn small";
  back.textContent = "← Kembali ke daftar pasal";
  back.addEventListener("click", () => openChapterPicker(bookNum));
  return back;
}

// Link Google Drive "…/file/d/ID/…" -> URL pratinjau gambar langsung
// (bisa dipakai sebagai src <img>, beda dari driveOpenUrl() di media.js
// yang untuk dibuka/diputar, bukan ditampilkan sebagai gambar).
function driveImagePreviewUrl(url) {
  if (!url) return "";
  const m = url.match(/\/file\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
  if (m) return "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w1000";
  return url;
}
function driveDownloadUrl(url) {
  if (!url) return url;
  const m = url.match(/\/file\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
  if (m) return "https://drive.google.com/uc?export=download&id=" + m[1];
  return url;
}

// ------------------------------------------------------------
//  CATATAN AYAT — TAMPIL SEBARIS (inline) di bawah teks ayatnya sendiri,
//  BUKAN sebagai jendela/modal terapung menutupi ayat lain (dulu begitu,
//  dan bikin tampilan "ketumpuk-tumpuk"). Cara buka/tutup: TEKAN DUA KALI
//  nomor ayatnya (bukan sekali -- supaya tidak "salah tekan" cuma karena
//  menggulir/scroll biasa di dekat nomor ayat).
// ------------------------------------------------------------

// Menambah/menghapus lencana 📝 kecil di ayat, sesuai ada-tidaknya catatan
// (admin ATAU pribadi) setelah catatan pribadi disimpan/dihapus.
function updateVerseNoteBadge(v, block, personalText) {
  const textWrap = block.querySelector(".verse-text-wrap");
  if (!textWrap) return;
  const existingBadge = textWrap.querySelector(".verse-note-badge");
  const hasAnyNote = !!(v.note && v.note.trim()) || !!(personalText || "").trim();
  if (hasAnyNote && !existingBadge) {
    const badge = document.createElement("span");
    badge.className = "verse-note-badge";
    badge.title = "Ada catatan pada ayat ini — tekan dua kali nomor ayat untuk membaca";
    badge.textContent = "📝";
    textWrap.appendChild(badge);
  } else if (!hasAnyNote && existingBadge) {
    existingBadge.remove();
  }
}

// Membuat SATU baris tombol "📋 Salin Ayat" / "📋 Salin Catatan" (kalau ada
// catatan Alkitab DAN/ATAU catatan pribadi) / "📚 Kumpulan" -- dipakai DUA
// KALI oleh buildInlineNoteCardEl() (sekali di atas panel, sekali di
// bawah), supaya kode tombolnya tidak dobel-tulis. Setiap panggilan
// membuat elemen <button> BARU (elemen DOM tidak bisa dipasang di dua
// tempat sekaligus).
//
// PERBAIKAN: sebelumnya tombol ini HANYA menyalin catatan Alkitab/admin
// (v.note) dan bahkan TIDAK MUNCUL SAMA SEKALI kalau ayat itu cuma punya
// catatan PRIBADI (tulisan sendiri) tanpa catatan Alkitab -- padahal
// justru catatan pribadi itulah yang paling sering ingin disalin.
// Sekarang tombolnya muncul kalau SALAH SATU (atau keduanya) ada, dan
// menyalin KEDUANYA sekaligus (diberi label masing-masing) kalau memang
// keduanya terisi.
function buildNoteQuickActionsRow(v, refLabel, hasAdminNote, liveDraftEl) {
  const row = document.createElement("div");
  row.className = "inline-note-actions";

  const copyVerseBtn = document.createElement("button");
  copyVerseBtn.type = "button";
  copyVerseBtn.className = "chip-btn small";
  copyVerseBtn.textContent = "📋 Salin Ayat";
  copyVerseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    copyTextWithFeedback(`${refLabel}\n${v.text}`, copyVerseBtn);
  });
  row.appendChild(copyVerseBtn);

  // PERBAIKAN: dulu tombol "Salin Catatan" HANYA dibuat kalau SUDAH ADA
  // catatan admin atau catatan pribadi YANG SUDAH TERSIMPAN saat panel ini
  // pertama kali dibangun -- jadi kalau ayatnya belum punya catatan sama
  // sekali, tombolnya TIDAK PERNAH muncul, walau pengguna lalu mengetik
  // catatan baru di kotak di bawahnya (baru muncul kalau panel ditutup lalu
  // dibuka lagi dari awal). Sekarang tombolnya SELALU dibuat, tapi
  // tampil/sembunyinya diperbarui langsung (live) lewat
  // refreshCopyNoteVisibility() setiap kali kotak catatan pribadi diketik --
  // lihat pemanggilannya di buildInlineNoteCardEl().
  const copyNoteBtn = document.createElement("button");
  copyNoteBtn.type = "button";
  copyNoteBtn.className = "chip-btn small";
  copyNoteBtn.textContent = "📋 Salin Catatan";
  const currentDraftText = () => (liveDraftEl
    ? (liveDraftEl.value || "").trim()
    : (getPersonalNote(currentUser, v.id) || "").trim());
  const refreshCopyNoteVisibility = () => {
    copyNoteBtn.hidden = !(hasAdminNote || currentDraftText());
  };
  refreshCopyNoteVisibility();
  copyNoteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const parts = [refLabel];
    if (hasAdminNote) parts.push(`— Catatan Alkitab:\n${noteHtmlToPlainText(v.note)}`);
    // Kalau tombol ini punya akses ke kotak tulis LANGSUNG (liveDraftEl --
    // dipakai khusus untuk baris tombol BAWAH, yang memang bersebelahan
    // dengan kotak catatan pribadi), pakai isi kotak itu APA ADANYA saat
    // ini juga -- termasuk tulisan yang BELUM ditekan "Simpan Catatan"
    // sekalipun -- supaya tidak perlu simpan dulu baru bisa disalin.
    // Kalau tidak ada (baris tombol ATAS), pakai catatan pribadi yang
    // SUDAH tersimpan.
    const latestPersonal = currentDraftText();
    if (latestPersonal) parts.push(`— Catatan Pribadi Anda:\n${latestPersonal}`);
    copyTextWithFeedback(parts.join("\n"), copyNoteBtn);
  });
  row.appendChild(copyNoteBtn);
  // Diekspos supaya pemanggil (buildInlineNoteCardEl) bisa memperbarui
  // tampil/sembunyi tombol ini setiap kali kotak catatan diketik.
  row.refreshCopyNoteVisibility = refreshCopyNoteVisibility;

  const addCollBtn = document.createElement("button");
  addCollBtn.type = "button";
  addCollBtn.className = "chip-btn small";
  addCollBtn.textContent = "📚 Kumpulan";
  addCollBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    handleAddToCollection(v);
  });
  row.appendChild(addCollBtn);

  return row;
}


// Membangun panel catatan SEBARIS untuk satu ayat (catatan dari sheet/admin
// kalau ada, + kotak catatan pribadi + tombol aksi) -- ditaruh sebagai anak
// TERAKHIR di dalam blok ayat itu sendiri, jadi lebarnya otomatis SAMA
// PERSIS dengan lebar teks ayat (tidak perlu diatur lebar terpisah lagi).
function buildInlineNoteCardEl(v, block) {
  const wrap = document.createElement("div");
  wrap.className = "verse-inline-note";
  wrap.hidden = true;

  const hasAdminNote = !!(v.note && v.note.trim());
  const book = BOOKS.find((b) => b.num === v.bookNumber);
  const displayName = v.bookName || (book ? book.name : "");
  const refLabel = `${displayName} ${v.chapter}:${v.verse}`;

  // Kotak catatan pribadi DIBUAT DULUAN di sini (elemennya saja, belum
  // ditempel ke DOM -- baru ditempel di bawah, di posisi tampilnya yang
  // benar) supaya baris tombol ATAS (topActions, ditempel duluan) BISA
  // ikut membaca isinya secara langsung (live) juga -- persis seperti
  // baris tombol BAWAH -- bukan cuma catatan yang SUDAH tersimpan.
  const textarea = document.createElement("textarea");
  textarea.className = "inline-note-textarea";
  textarea.rows = 3;
  textarea.placeholder = "Tulis renungan atau catatan pribadi Anda untuk ayat ini…";
  textarea.value = getPersonalNote(currentUser, v.id);
  textarea.addEventListener("click", (e) => e.stopPropagation());

  // Tombol "Salin Ayat" / "Salin Catatan" / "Kumpulan" DIULANG di ATAS
  // panel (sebelum catatan admin & kotak catatan pribadi yang bisa
  // panjang), supaya tidak perlu gulir ke paling bawah dulu hanya untuk
  // menyalin ayat/catatan atau memasukkannya ke Kumpulan Ayat. Tombol
  // "💾 Simpan Catatan" TETAP hanya di bawah (dekat kotak catatan
  // pribadinya) karena aksi itu memang terikat ke kotak tulis di bawah.
  const topActions = buildNoteQuickActionsRow(v, refLabel, hasAdminNote, textarea);
  topActions.classList.add("inline-note-actions-top");
  wrap.appendChild(topActions);

  if (hasAdminNote) {
    const adminWrap = document.createElement("div");
    adminWrap.className = "inline-note-admin";
    const label = document.createElement("div");
    label.className = "note-modal-label";
    label.textContent = "📝 Catatan pada ayat ini";
    adminWrap.appendChild(label);
    const adminText = document.createElement("div");
    adminText.className = "note-modal-admin-text";
    // buildFootnoteEntriesHtml() (js/footnotes.js) membungkus tiap entri
    // nomor/huruf dalam <div class="footnote-entry" data-fn-num/letter>
    // supaya tanda "1a" dkk. di teks ayat bisa MELOMPAT & MENYOROT bagian
    // ini langsung, tanpa perlu kotak ringkasan terpisah yang isinya dobel.
    adminText.innerHTML = typeof buildFootnoteEntriesHtml === "function"
      ? buildFootnoteEntriesHtml(v.note, v.bookNumber, v.chapter)
      : linkifyOsisReferences(sanitizeNoteHtml(v.note), v.bookNumber, v.chapter);
    adminText.addEventListener("click", (e) => {
      const btn = e.target.closest(".note-verse-ref");
      if (!btn) return;
      e.stopPropagation();
      toggleInlineVerseRefPreview(btn, v.lang);
    });
    adminWrap.appendChild(adminText);
    wrap.appendChild(adminWrap);
  }

  const personalLabel = document.createElement("div");
  personalLabel.className = "note-modal-label inline-note-personal-label";
  personalLabel.textContent = "🖊️ Catatan pribadi Anda";
  wrap.appendChild(personalLabel);

  wrap.appendChild(textarea);

  const actions = document.createElement("div");
  actions.className = "inline-note-actions";

  const savedHint = document.createElement("span");
  savedHint.className = "note-modal-hint";
  savedHint.textContent = "Tersimpan ✓";
  savedHint.hidden = true;

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "chip-btn small primary";
  saveBtn.textContent = "💾 Simpan Catatan";
  saveBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    setPersonalNote(currentUser, v.id, textarea.value);
    updateVerseNoteBadge(v, block, textarea.value);
    savedHint.hidden = false;
    setTimeout(() => { savedHint.hidden = true; }, 2000);
  });
  actions.appendChild(saveBtn);

  const bottomQuickActions = buildNoteQuickActionsRow(v, refLabel, hasAdminNote, textarea);
  // Digabung ke baris "actions" yang sama (bukan <div> terpisah) supaya
  // tata letak bawah tetap seperti sebelumnya: Simpan Catatan lalu tombol
  // salin/kumpulan sebaris.
  Array.from(bottomQuickActions.children).forEach((btn) => actions.appendChild(btn));
  actions.appendChild(savedHint);

  wrap.appendChild(actions);

  // PERBAIKAN "Salin Catatan" separuh jalan: setiap kali kotak catatan
  // pribadi diketik (BELUM tentu sudah ditekan "Simpan Catatan"), tombol
  // "📋 Salin Catatan" di baris ATAS *dan* BAWAH langsung dimunculkan/
  // disembunyikan sesuai ada-tidaknya isi -- tidak perlu simpan dulu atau
  // tutup-buka panel dulu supaya tombolnya muncul.
  textarea.addEventListener("input", () => {
    topActions.refreshCopyNoteVisibility();
    bottomQuickActions.refreshCopyNoteVisibility();
  });

  return wrap;
}


// Buka/tutup panel catatan sebaris milik satu ayat. Panel ayat LAIN yang
// mungkin sedang terbuka TIDAK ikut ditutup otomatis -- boleh lebih dari
// satu terbuka sekaligus, sesuai ayat mana saja yang ditekan dua kali.
function toggleInlineNote(block) {
  const panel = block.querySelector(".verse-inline-note");
  if (!panel) return;
  panel.hidden = !panel.hidden;
  block.classList.toggle("note-open", !panel.hidden);
  if (!panel.hidden) {
    panel.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

// ============================================================
//  POPUP MELAYANG: PILIH WARNA HIGHLIGHT AYAT
// ============================================================
//  Muncul di dekat nomor ayat begitu nomornya ditekan sekali. Berisi
//  3 lingkaran warna pastel (kuning/hijau/biru) + satu tombol hapus.
//  Highlight berlaku untuk SATU AYAT PENUH (seluruh blok ayat berubah
//  warna latar), bukan sebagian teks yang diseleksi.
// ============================================================
let activeHighlightPopup = null;

function closeHighlightPopup() {
  if (!activeHighlightPopup) return;
  activeHighlightPopup.remove();
  activeHighlightPopup = null;
  document.removeEventListener("click", onDocClickCloseHighlightPopup, true);
  window.removeEventListener("scroll", closeHighlightPopup, true);
  window.removeEventListener("resize", closeHighlightPopup, true);
}

function onDocClickCloseHighlightPopup(e) {
  if (activeHighlightPopup && !activeHighlightPopup.contains(e.target)) closeHighlightPopup();
}

// Menerapkan (atau menghapus, kalau color = null) warna highlight ke
// blok ayat + menyimpannya secara lokal lewat js/highlights.js.
const HIGHLIGHT_COLORS = [
  { key: "yellow", label: "Kuning" },
  { key: "green", label: "Hijau" },
  { key: "blue", label: "Biru" },
  { key: "pink", label: "Pink" },
  { key: "purple", label: "Ungu" },
  { key: "orange", label: "Oranye" },
  { key: "teal", label: "Tosca" },
  { key: "coral", label: "Salem" },
  { key: "gray", label: "Abu-abu" },
  { key: "cream", label: "Krem" },
];

function applyVerseHighlight(block, v, color) {
  HIGHLIGHT_COLORS.forEach((c) => block.classList.remove("hl-" + c.key));
  if (color) block.classList.add("hl-" + color);
  setVerseHighlight(currentUser, v.id, color);
}

function openHighlightPopup(anchorEl, block, v) {
  closeHighlightPopup();

  const popup = document.createElement("div");
  popup.className = "verse-highlight-popup";
  popup.setAttribute("role", "menu");
  popup.setAttribute("aria-label", "Pilih warna highlight ayat " + v.verse);

  const current = getVerseHighlight(currentUser, v.id);

  HIGHLIGHT_COLORS.forEach((c) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "hl-swatch hl-swatch-" + c.key + (current === c.key ? " hl-swatch-active" : "");
    btn.title = "Highlight " + c.label;
    btn.setAttribute("aria-label", "Highlight warna " + c.label);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      applyVerseHighlight(block, v, c.key);
      closeHighlightPopup();
    });
    popup.appendChild(btn);
  });

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "hl-swatch hl-swatch-clear";
  clearBtn.title = "Hapus highlight ayat ini";
  clearBtn.setAttribute("aria-label", "Hapus highlight ayat ini");
  clearBtn.textContent = "✕";
  clearBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    applyVerseHighlight(block, v, null);
    closeHighlightPopup();
  });
  popup.appendChild(clearBtn);

  document.body.appendChild(popup);

  // Posisikan tepat di bawah nomor ayat yang ditekan, jaga supaya tidak
  // keluar dari tepi kanan layar.
  const r = anchorEl.getBoundingClientRect();
  const top = r.bottom + window.scrollY + 6;
  let left = r.left + window.scrollX;
  const maxLeft = window.scrollX + document.documentElement.clientWidth - popup.offsetWidth - 12;
  if (left > maxLeft) left = Math.max(8, maxLeft);
  popup.style.top = top + "px";
  popup.style.left = left + "px";

  activeHighlightPopup = popup;
  // Ditunda satu tick supaya klik yang baru saja membuka popup ini tidak
  // langsung dianggap "klik di luar popup" dan menutupnya lagi.
  setTimeout(() => {
    document.addEventListener("click", onDocClickCloseHighlightPopup, true);
    window.addEventListener("scroll", closeHighlightPopup, true);
    window.addEventListener("resize", closeHighlightPopup, true);
  }, 0);
}

// Membuat satu blok ayat (nomor, teks, badge catatan, tombol salin) —
// dipakai baik untuk tampilan satu kolom (biasa) maupun tampilan
// beberapa-kolom-berdampingan (lihat renderColumnsView).
function buildVerseBlock(v, idx, fallbackBookName) {
  const block = document.createElement("div");
  block.className = "verse-block";
  block.id = "v-" + v.id;
  block.style.animationDelay = Math.min(idx * 35, 700) + "ms";
  if (highlightVerse && v.verse === highlightVerse) block.classList.add("highlight");

  // Nomor ayat sekarang TOMBOL sungguhan (bukan cuma teks):
  //  - SEKALI tekan  -> buka popup melayang untuk memilih warna highlight
  //    ayat ini (lihat openHighlightPopup() di bawah).
  //  - DUA KALI tekan -> buka/tutup catatan ayat ini (perilaku lama).
  // Klik pertama sengaja ditunda sebentar (lihat verseNumClickTimer) supaya
  // bisa dibedakan dari klik kedua pada gestur tekan-dua-kali.
  const num = document.createElement("button");
  num.type = "button";
  num.className = "verse-num verse-num-btn";
  num.textContent = v.verse;
  num.title = "Tekan sekali untuk warna highlight, dua kali untuk catatan";
  num.setAttribute("aria-label", "Ayat " + v.verse + " — tekan sekali untuk highlight, dua kali untuk catatan");
  let verseNumClickTimer = null;
  num.addEventListener("click", (e) => {
    e.stopPropagation();
    // MODE TAMU -- highlight warna & catatan per-ayat perlu login (data
    // pribadi per pengguna), jadi nomor ayat untuk tamu HANYA jadi
    // penanda, tidak membuka popup highlight sama sekali.
    if (typeof Guest !== "undefined" && Guest.isGuest()) {
      Guest.showFeatureLocked("Highlight & Catatan Ayat");
      return;
    }
    if (verseNumClickTimer) {
      // Ini klik kedua dari gestur tekan-dua-kali -- biarkan dblclick yang menangani.
      clearTimeout(verseNumClickTimer);
      verseNumClickTimer = null;
      return;
    }
    verseNumClickTimer = setTimeout(() => {
      verseNumClickTimer = null;
      openHighlightPopup(num, block, v);
    }, 260);
  });
  num.addEventListener("dblclick", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof Guest !== "undefined" && Guest.isGuest()) return; // sudah ditangani di listener "click" di atas
    if (verseNumClickTimer) {
      clearTimeout(verseNumClickTimer);
      verseNumClickTimer = null;
    }
    closeHighlightPopup();
    toggleInlineNote(block);
  });

  // Highlight warna pastel yang tersimpan (kalau ada) langsung dipasang
  // ke seluruh blok ayat ini saat dirender.
  const savedHighlight = getVerseHighlight(currentUser, v.id);
  if (savedHighlight) block.classList.add("hl-" + savedHighlight);

  const textWrap = document.createElement("div");
  textWrap.className = "verse-text-wrap";
  // v.markedText (kalau ada -- lihat js/footnotes.js) menyimpan tanda
  // catatan kaki ("1a", "2", "3b" dst) sebagai elemen <sup> yang bisa
  // ditekan. Bahasa yang tidak punya tanda ini (markedText kosong/tanpa
  // penanda) tampil PERSIS seperti sebelumnya (teks polos v.text).
  if (typeof renderVerseTextWithFootnotes === "function" && v.markedText) {
    renderVerseTextWithFootnotes(textWrap, v.markedText);
  } else {
    textWrap.textContent = v.text;
  }

  const hasAdminNote = !!(v.note && v.note.trim());
  const hasPersonalNote = !!getPersonalNote(currentUser, v.id);
  if (hasAdminNote || hasPersonalNote) {
    const badge = document.createElement("span");
    badge.className = "verse-note-badge";
    badge.title = "Ada catatan pada ayat ini — tekan dua kali nomor ayat untuk membaca";
    badge.textContent = "📝";
    textWrap.appendChild(badge);
  }

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "verse-copy-btn";
  copyBtn.title = "Salin ayat (kitab, pasal:ayat, teks)";
  copyBtn.setAttribute("aria-label", "Salin ayat");
  copyBtn.textContent = "📋";
  copyBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const bookLabel = v.bookName || fallbackBookName;
    const refText = `${bookLabel} ${v.chapter}:${v.verse}\n${v.text}`;
    copyTextWithFeedback(refText, copyBtn);
  });

  // Tombol "kirim ke Layar 2" -- ada di DOM untuk setiap ayat, tapi hanya
  // TERLIHAT saat Mode Presentasi 2 Layar aktif (lihat body.present-mode-on
  // di css/style.css & js/presentation.js). Tidak tampil untuk Mode Tamu
  // (menu Mode Presentasi sendiri disembunyikan untuk tamu).
  const presentBtn = document.createElement("button");
  presentBtn.type = "button";
  presentBtn.className = "verse-present-btn";
  presentBtn.title = "Tampilkan ayat ini di Layar 2";
  presentBtn.setAttribute("aria-label", "Tampilkan ayat ini di Layar 2");
  presentBtn.textContent = "📤";
  presentBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const bookLabel = v.bookName || fallbackBookName;
    if (typeof Presentation !== "undefined") Presentation.sendVerse(v, bookLabel);
  });

  block.appendChild(num);
  block.appendChild(textWrap);
  block.appendChild(copyBtn);
  block.appendChild(presentBtn);
  const notePanel = buildInlineNoteCardEl(v, block);
  block.appendChild(notePanel);
  if (typeof setupFootnoteMarkerHandlers === "function") {
    setupFootnoteMarkerHandlers(textWrap, v, block, notePanel);
  }

  // Kalau ayat ini sedang di-highlight (mis. datang dari menu "Catatan
  // Saya" atau hasil pencarian CATATAN) DAN memang punya catatan, langsung
  // buka panel catatannya supaya tidak perlu tekan dua kali lagi. HANYA
  // kalau highlightVerseOpenNote true -- untuk navigasi biasa (pencarian
  // AYAT, strip lompat ayat) sengaja TIDAK dibuka otomatis, supaya
  // pembaca tidak bingung tiba-tiba muncul kotak catatan padahal cuma
  // mau membaca ayatnya.
  if (highlightVerse && v.verse === highlightVerse && highlightVerseOpenNote && (hasAdminNote || hasPersonalNote)) {
    notePanel.hidden = false;
    block.classList.add("note-open");
  }

  return block;
}

// Label bahasa untuk judul kolom (mis. "Indonesia (Recovery)"), dipakai di
// tampilan kolom paralel.
function langLabelFor(code) {
  const found = (CONFIG.LANGUAGES || []).find((l) => l.code === code);
  return found ? found.label : code;
}

// Tampilan kolom tunggal (perilaku lama / default).
function renderSingleColumn(wrap, verses, displayName, bookNum, chapter) {
  wrap.classList.remove("reader-columns");
  wrap.removeAttribute("data-cols");
  wrap.innerHTML = "";
  verses.forEach((v, idx) => wrap.appendChild(buildVerseBlock(v, idx, displayName)));
  insertOutlineHeaders(wrap, bookNum, chapter, verses);
}

// ------------------------------------------------------------
//  Menyisipkan judul "Garis Besar" berjenjang (level 1 = besar, 2 =
//  sedang, 3 = kecil, dst) TEPAT SEBELUM blok ayat pertama dari
//  rentangnya, mis. sebelum Kejadian 1:1:
//    Tentang Penciptaan (Kejadian 1:1-1:20)
//    Cerita awal penciptaan (Kejadian 1:1-1:3)
//  lalu baru teks ayat 1:1 -- level besar ditulis lebih dulu (di
//  atas), level kecil di bawahnya, tepat seperti contoh yang diminta.
//  Dikerjakan ASYNC (data outline dari cache/server) supaya ayat tetap
//  tampil instan; judul menyusul begitu siap. Dibatalkan otomatis kalau
//  pasal sudah berpindah lagi sebelum selesai (lihat token).
// ------------------------------------------------------------
async function insertOutlineHeaders(wrap, bookNum, chapter, verses) {
  if (!bookNum || !chapter || typeof getOutlineForBook !== "function") return;
  const token = (insertOutlineHeaders._token = (insertOutlineHeaders._token || 0) + 1);
  const all = await getOutlineForBook(bookNum, currentLang).catch(() => []);
  if (insertOutlineHeaders._token !== token || !all.length || !wrap.isConnected) return;
  const book = BOOKS.find((b) => b.num === bookNum);
  const bookName = book ? book.name : "";
  verses.forEach((v) => {
    const entries = all
      .filter((e) => e.chapterStart === chapter && e.verseStart === v.verse)
      .sort((a, b) => a.level - b.level);
    if (!entries.length) return;
    const verseBlock = document.getElementById("v-" + v.id);
    if (!verseBlock || verseBlock.parentNode !== wrap) return;
    entries.forEach((entry) => {
      const h = document.createElement("div");
      h.className = "outline-heading level-" + entry.level;
      h.innerHTML = `${escapeHtml(entry.ringkasan)} <span class="outline-heading-ref">(${outlineRangeLabel(bookName, entry)})</span>`;
      wrap.insertBefore(h, verseBlock);
    });
  });
}

// Tampilan beberapa kolom berdampingan (bahasa berbeda per kolom), untuk
// membaca beberapa terjemahan sekaligus. Kolom 1 selalu memakai bahasa
// aktif (langSelect); kolom 2 & 3 memakai bahasa yang dipilih di menu ⋮.
// `singleVerseNum`: kalau diisi (mode "🔎 1 Ayat Saja" aktif), SETIAP
// kolom difilter supaya cuma menampilkan ayat itu saja, bukan satu pasal
// penuh (lihat renderChapter()).
function renderColumnsView(wrap, bookNum, chapter, primaryVerses, displayName, columnsCount, extraLangs, singleVerseNum) {
  wrap.classList.add("reader-columns");
  wrap.setAttribute("data-cols", String(columnsCount));
  const direction = getSetting(currentUser, "columnDirection") || "side";
  wrap.setAttribute("data-direction", direction);
  wrap.innerHTML = "";

  const columns = [{ lang: currentLang, verses: primaryVerses }];
  for (let i = 0; i < columnsCount - 1; i++) {
    const lang = extraLangs[i];
    let verses = lang ? getChapterVerses(lang, bookNum, chapter) : [];
    if (singleVerseNum) verses = verses.filter((v) => v.verse === singleVerseNum);
    columns.push({ lang, verses });
  }

  // Tampilan "menyamping" (side-by-side) dengan >1 kolom: dirender sebagai
  // baris grid per nomor ayat, supaya ayat yang sama sejajar tingginya di
  // semua kolom (tinggi baris grid otomatis mengikuti kolom yang teksnya
  // paling panjang).
  if (direction === "side" && columnsCount > 1) {
    renderColumnsGridAligned(wrap, columns, displayName, columnsCount);
    return;
  }

  // Tampilan "atas-bawah" (stacked): DIKELOMPOKKAN PER AYAT, bukan per
  // bahasa -- urutan barisnya persis seperti diminta: bahasa 1 ayat N,
  // bahasa 2 ayat N, bahasa 3 ayat N, baru pindah ke bahasa 1 ayat N+1,
  // bahasa 2 ayat N+1, dst. Lihat renderColumnsStacked() di bawah.
  renderColumnsStacked(wrap, columns, displayName);
}

// Merender kolom paralel sebagai grid asli (bukan kolom independen),
// dengan satu "baris" grid per nomor ayat lintas semua bahasa, supaya
// ayat 1 selalu sejajar dengan ayat 1 di kolom lain, ayat 2 sejajar
// dengan ayat 2, dst — walau panjang teksnya beda-beda antar bahasa.
function renderColumnsGridAligned(wrap, columns, displayName, columnsCount) {
  wrap.classList.add("reader-columns-grid");

  columns.forEach((col) => {
    const head = document.createElement("div");
    head.className = "reader-column-head grid-head";
    head.textContent = col.lang ? langLabelFor(col.lang) : "— pilih bahasa —";
    wrap.appendChild(head);
  });

  // Gabungan semua nomor ayat yang ada di salah satu kolom, diurutkan —
  // supaya tetap sejajar walau ada bahasa yang kebetulan tidak punya ayat
  // tertentu (kolom itu akan tampak kosong di baris tersebut).
  const verseNumSet = new Set();
  columns.forEach((col) => col.verses.forEach((v) => verseNumSet.add(v.verse)));
  const verseNums = Array.from(verseNumSet).sort((a, b) => a - b);

  if (verseNums.length === 0) {
    const empty = document.createElement("p");
    empty.style.gridColumn = "1 / -1";
    empty.style.fontSize = "13px";
    empty.style.color = "var(--ink-soft)";
    empty.textContent = "Pasal ini belum tersedia.";
    wrap.appendChild(empty);
    return;
  }

  verseNums.forEach((vnum) => {
    columns.forEach((col) => {
      const cell = document.createElement("div");
      cell.className = "reader-grid-cell";
      const v = col.verses.find((vv) => vv.verse === vnum);
      if (v) {
        cell.appendChild(buildVerseBlock(v, vnum - 1, displayName));
      } else {
        cell.classList.add("reader-grid-cell-empty");
      }
      wrap.appendChild(cell);
    });
  });
}

// Merender kolom paralel dalam arah "atas-bawah" (stacked), DIKELOMPOKKAN
// PER AYAT -- untuk tiap nomor ayat (berurutan), tampilkan versi bahasa 1
// dulu, lalu bahasa 2, lalu bahasa 3 (kalau ada) tepat di bawahnya, baru
// lanjut ke nomor ayat berikutnya dengan urutan bahasa yang sama. Contoh
// untuk pasal 10 ayat & 3 bahasa: baris 1=bhs1 ay1, baris 2=bhs2 ay1,
// baris 3=bhs3 ay1, baris 4=bhs1 ay2, baris 5=bhs2 ay2, dst. Setiap baris
// diberi label bahasa kecil di depan nomor ayat (tidak ada judul kolom
// terpisah seperti mode menyamping, karena semuanya satu kolom lebar
// penuh yang ditumpuk vertikal).
function renderColumnsStacked(wrap, columns, displayName) {
  wrap.classList.add("reader-columns-stacked");

  const verseNumSet = new Set();
  columns.forEach((col) => col.verses.forEach((v) => verseNumSet.add(v.verse)));
  const verseNums = Array.from(verseNumSet).sort((a, b) => a - b);

  if (verseNums.length === 0) {
    const empty = document.createElement("p");
    empty.style.fontSize = "13px";
    empty.style.color = "var(--ink-soft)";
    empty.textContent = "Pasal ini belum tersedia.";
    wrap.appendChild(empty);
    return;
  }

  verseNums.forEach((vnum, groupIdx) => {
    const langsWithVerse = columns.filter((col) => col.verses.some((vv) => vv.verse === vnum));
    langsWithVerse.forEach((col, colIdxInGroup) => {
      const v = col.verses.find((vv) => vv.verse === vnum);
      const block = buildVerseBlock(v, groupIdx, displayName);
      const langTag = document.createElement("span");
      langTag.className = "reader-stacked-lang-tag";
      langTag.textContent = col.lang ? langLabelFor(col.lang) : "?";
      block.insertBefore(langTag, block.firstChild);
      // Garis pemisah SETELAH baris bahasa TERAKHIR dalam kelompok ayat
      // ini (bukan setelah tiap baris), supaya kelompok per-ayat tetap
      // terlihat jelas sebagai satu unit.
      if (colIdxInGroup === langsWithVerse.length - 1) block.classList.add("verse-group-end");
      wrap.appendChild(block);
    });
  });
}

// ------------------------------------------------------------
// 6) MEMBACA PASAL / AYAT (dari index di memori — instan)
// ------------------------------------------------------------
// Mengirim posisi bacaan terakhir ("Kejadian 1" dst) ke kolom
// "Last_Read_Day" pada Sheet Pengguna asli (lihat saveLastRead_() di
// apps-script/Code.gs) -- best-effort, tidak memblokir tampilan, dan
// tidak dikirim ulang kalau labelnya sama persis dengan pengiriman
// terakhir (mis. pasal yang sama dibuka ulang).
let lastPushedReadLabel = "";
function pushLastReadPosition(label) {
  if (!currentUser || !label || label === lastPushedReadLabel) return;
  lastPushedReadLabel = label;
  if (typeof Sync !== "undefined" && Sync.enabled()) {
    Sync.pushLastRead(currentUser, label).catch(() => {});
  }
}

function renderChapter(bookNum, chapter, verseToHighlight, opts) {
  const book = BOOKS.find((b) => b.num === bookNum);
  const verses = getChapterVerses(currentLang, bookNum, chapter); // SELALU satu pasal penuh -- dipakai strip lompat ayat, navigasi per-ayat, & garis besar, terlepas dari mode tampilan di bawah
  if (!book || verses.length === 0) {
    showLangUnavailable();
    return;
  }

  stopTTS(); // pindah pasal -> hentikan pembacaan suara yang mungkin sedang berjalan

  currentBookNum = bookNum;
  currentChapter = chapter;
  highlightVerse = verseToHighlight || null;
  highlightVerseOpenNote = !!(opts && opts.openNote);
  setActiveBookButton(bookNum);

  hideAllPanels();
  el("reader").hidden = false;
  const displayName = verses[0].bookName || book.name;
  el("readerTitle").textContent = `${displayName} ${chapter}`;
  if (el("readerTitleBottom")) el("readerTitleBottom").textContent = `${displayName} ${chapter}`;
  updateCurrentReadingIndicator(`${displayName} ${chapter}`);
  logActivity(`Baca: ${displayName} ${chapter}`);
  pushLastReadPosition(`${displayName} ${chapter}`);

  // ------------------------------------------------------------
  // Mode tampilan ayat: "chapter" (default, seluruh pasal seperti biasa)
  // atau "verse" (cuma 1 ayat yang ditampilkan -- lihat menu ⋮ → 👁️
  // Tampilan Ayat). Di mode "verse", `versesToRender` cuma berisi SATU
  // ayat (dipakai untuk apa yang benar-benar dirender ke layar & dibaca
  // TTS), sedangkan `verses` di atas tetap satu pasal penuh (dipakai
  // untuk strip lompat ayat & navigasi Ayat Sebelumnya/Berikutnya).
  // ------------------------------------------------------------
  const verseMode = getSetting(currentUser, "verseDisplayMode") || "chapter";
  let versesToRender = verses;
  if (verseMode === "verse") {
    let target = verseToHighlight;
    if (!target || !verses.some((v) => v.verse === target)) {
      target = (currentSingleVerse && verses.some((v) => v.verse === currentSingleVerse))
        ? currentSingleVerse
        : verses[0].verse;
    }
    currentSingleVerse = target;
    highlightVerse = target;
    versesToRender = verses.filter((v) => v.verse === target);
  }
  currentChapterVerses = versesToRender; // dipakai TTS/rekam MP3 -- supaya yang dibacakan = yang tampil di layar

  const wrap = el("readerVerses");
  const columnsCount = getSetting(currentUser, "columns") || 1;
  const columnLangs = getSetting(currentUser, "columnLangs") || [];
  if (columnsCount > 1) {
    renderColumnsView(wrap, bookNum, chapter, versesToRender, displayName, columnsCount, columnLangs, verseMode === "verse" ? currentSingleVerse : null);
  } else {
    renderSingleColumn(wrap, versesToRender, displayName, bookNum, chapter);
  }

  renderVerseJumpBar(verses, verseMode);
  updateVerseNavRow(verses, verseMode);

  // "📌 Pokok Kitab" -- hanya di pasal 1 (awal mula pembacaan kitab ini),
  // & "📋 Garis Besar" berjenjang disisipkan langsung di dalam
  // renderSingleColumn() di atas (per rentang ayat, lihat insertOutlineHeaders()).
  const pokokSlot = el("readerPokokSlot");
  if (pokokSlot) {
    pokokSlot.hidden = true;
    pokokSlot.innerHTML = "";
    if (chapter === 1 && typeof getPokokKitabFor === "function") {
      const buildPokokBox = (pokok) => {
        const box = document.createElement("div");
        box.className = "pokok-box pokok-box-inline pokok-box-html";
        const label = document.createElement("div");
        label.className = "pokok-box-label";
        label.textContent = "📌 Pokok Kitab " + displayName;
        const text = document.createElement("div");
        text.innerHTML = pokok;
        box.appendChild(label);
        box.appendChild(text);
        return box;
      };
      // Coba SEKETIKA dari cache (tanpa await) dulu supaya tidak ada jeda
      // "nongol belakangan" yang menggeser ayat-ayat di bawahnya kalau
      // pembaca sudah mulai menggulir/membaca.
      const cachedRows = (typeof pokokKitabRowsFromCacheOnly === "function") ? pokokKitabRowsFromCacheOnly() : null;
      if (cachedRows !== null) {
        const hit = pickPokokRowFor(cachedRows, bookNum, currentLang);
        if (hit && hit.pokok) {
          pokokSlot.appendChild(buildPokokBox(hit.pokok));
          pokokSlot.hidden = false;
        }
      } else {
        const pokokToken = (renderChapter._pokokToken = (renderChapter._pokokToken || 0) + 1);
        getPokokKitabFor(bookNum, currentLang).then((pokok) => {
          if (renderChapter._pokokToken !== pokokToken || !pokok) return;
          pokokSlot.appendChild(buildPokokBox(pokok));
          pokokSlot.hidden = false;
        }).catch(() => {});
      }
    }
  }

  const chapters = getChaptersForBook(currentLang, bookNum);
  const idx = chapters.indexOf(chapter);
  const atStart = idx <= 0;
  const atEnd = idx === -1 || idx >= chapters.length - 1;
  el("prevChapter").disabled = atStart;
  el("nextChapter").disabled = atEnd;
  el("prevChapter").onclick = () => renderChapter(bookNum, chapters[idx - 1]);
  el("nextChapter").onclick = () => renderChapter(bookNum, chapters[idx + 1]);
  // Tombol yang sama, diulang di bagian bawah pasal (supaya tidak perlu
  // gulir ke atas untuk pindah pasal setelah selesai membaca).
  if (el("prevChapterBottom")) {
    el("prevChapterBottom").disabled = atStart;
    el("prevChapterBottom").onclick = () => renderChapter(bookNum, chapters[idx - 1]);
  }
  if (el("nextChapterBottom")) {
    el("nextChapterBottom").disabled = atEnd;
    el("nextChapterBottom").onclick = () => renderChapter(bookNum, chapters[idx + 1]);
  }

  // Tombol BULAT 🎵MP3/🎬MP4/▶️YouTube kalau pasal ini ada di salah satu
  // sheet Bacaan Bersuara (CONFIG.READING_MEDIA_SHEETS) -- pemutarnya
  // muncul LANGSUNG di halaman baca ini (bukan tab baru), jadi ayat &
  // catatan tetap kelihatan sambil didengarkan/ditonton. Dicari di latar
  // belakang supaya pasal tetap tampil instan; disembunyikan lagi kalau
  // pindah pasal sebelum hasil pencarian media selesai (lihat token di
  // bawah, mencegah pemutar pasal LAMA nempel di pasal yang baru dibuka).
  const mediaSlot = el("readerMediaSlot");
  if (mediaSlot) {
    mediaSlot.hidden = true;
    mediaSlot.innerHTML = "";
    const requestToken = (renderChapter._mediaToken = (renderChapter._mediaToken || 0) + 1);
    if (typeof findMediaLinkForReference === "function") {
      findMediaLinkForReference(bookNum, chapter, currentLang).then((media) => {
        if (renderChapter._mediaToken !== requestToken) return; // pasal sudah berpindah lagi
        if (!media || (!media.mp3 && !media.mp4 && !media.youtube)) return;
        mediaSlot.appendChild(buildInlineMediaBlock(media, `${displayName} ${chapter}`));
        mediaSlot.hidden = false;
      }).catch(() => {});
    }
  }

  window.scrollTo({ top: 0 });
  if (highlightVerse) {
    setTimeout(() => {
      const found = verses.find((v) => v.verse === highlightVerse);
      const target = found && el("v-" + found.id);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
  }
  initReadingProgressForChapter();
}

// ------------------------------------------------------------
// 6b) STRIP LOMPAT AYAT ("1 ··· 5 ··· 10 ··· 15 ··· 18") & NAVIGASI
//     PER AYAT (mode "🔎 1 Ayat Saja")
// ------------------------------------------------------------
// Memilih nomor-nomor ayat "landmark" yang ditampilkan di strip, supaya
// tetap ringkas untuk pasal yang panjang (mis. Mazmur 119 = 176 ayat)
// tapi tetap menampilkan SEMUA nomor untuk pasal pendek. Selalu
// menyertakan ayat pertama & terakhir, ditambah kelipatan `step` di
// antaranya -- contoh pasal 18 ayat -> step 5 -> [1, 5, 10, 15, 18],
// persis seperti contoh "1 ··· 5 ··· 10 ··· 15 ··· 18".
function computeVerseLandmarks(verseNums) {
  if (verseNums.length <= 12) return verseNums.slice();
  // Selalu kelipatan 5, berapa pun panjang pasalnya (termasuk Mazmur 119
  // yang 176 ayat) -- contoh: 1 ··· 5 ··· 10 ··· 15 ··· ... ··· 175 ··· 176.
  const step = 5;
  const first = verseNums[0];
  const last = verseNums[verseNums.length - 1];
  const set = new Set([first, last]);
  verseNums.forEach((v) => { if (v % step === 0) set.add(v); });
  return Array.from(set).sort((a, b) => a - b);
}

// `fullChapterVerses`: SELALU satu pasal penuh (bukan versesToRender),
// supaya stripnya tetap menampilkan semua nomor ayat pasal ini walau
// yang sedang dirender di layar cuma 1 ayat (mode "verse").
//
// Setiap ayat di antara nomor "besar" (landmark, mis. 1/5/10/15/18)
// TETAP ditampilkan sebagai titik "•" TERSENDIRI (bukan satu tanda
// "···" gabungan) -- supaya tiap titik bisa DIKLIK LANGSUNG menuju
// ayat aslinya (mis. di antara "1" dan "5" ada 3 titik utk ayat 2, 3,
// 4 -- tap titik yang mewakili ayat 4 langsung ke ayat 4, bukan cuma
// lompat ke 1 atau 5 terdekat).
function renderVerseJumpBar(fullChapterVerses, verseMode) {
  const bar = el("verseJumpBar");
  if (!bar) return;
  const verseNums = fullChapterVerses.map((v) => v.verse).sort((a, b) => a - b);
  if (verseNums.length <= 1) {
    bar.hidden = true;
    bar.innerHTML = "";
    return;
  }
  const landmarkSet = new Set(computeVerseLandmarks(verseNums));
  const activeVerse = verseMode === "verse" ? currentSingleVerse : highlightVerse;
  bar.innerHTML = "";
  // Flex-wrap alami (bukan dipaksa pindah baris tiap N item seperti
  // sebelumnya) -- sekarang jumlah elemennya sudah SATU PER AYAT
  // (bukan cuma landmark), jadi lebih rapi dibiarkan membungkus sendiri
  // mengikuti lebar layar, apa pun panjang pasalnya.
  verseNums.forEach((vnum) => {
    const isLandmark = landmarkSet.has(vnum);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = isLandmark ? "verse-jump-num" : "verse-jump-dot";
    btn.textContent = isLandmark ? String(vnum) : "•";
    btn.title = "Menuju ayat " + vnum;
    btn.setAttribute("aria-label", "Menuju ayat " + vnum);
    if (activeVerse === vnum) btn.classList.add("active");
    btn.addEventListener("click", () => jumpToVerse(vnum));
    bar.appendChild(btn);
  });
  bar.hidden = false;
}

// Dipakai baik oleh strip lompat ayat MAUPUN navigasi Ayat
// Sebelumnya/Berikutnya -- navigasi biasa (BUKAN dari "Catatan Saya" /
// hasil pencarian catatan), jadi catatan TIDAK dibuka otomatis (lihat
// highlightVerseOpenNote di buildVerseBlock()).
function jumpToVerse(vnum) {
  if (!currentBookNum || !currentChapter) return;
  renderChapter(currentBookNum, currentChapter, vnum);
}

// Menampilkan/menyembunyikan & mengisi baris "◀ Ayat Sebelumnya / Ayat
// Berikutnya ▶" -- HANYA terlihat di mode "🔎 1 Ayat Saja". Di batas
// pasal (ayat pertama/terakhir), otomatis lanjut ke ayat TERAKHIR pasal
// sebelumnya / ayat PERTAMA pasal berikutnya (kalau pasal itu ada),
// supaya bisa terus membaca maju/mundur tanpa harus kembali ke menu
// kitab dulu.
function updateVerseNavRow(fullChapterVerses, verseMode) {
  const row = el("verseNavRow");
  if (!row) return;
  if (verseMode !== "verse") {
    row.hidden = true;
    return;
  }
  row.hidden = false;

  const verseNums = fullChapterVerses.map((v) => v.verse).sort((a, b) => a - b);
  const idx = verseNums.indexOf(currentSingleVerse);
  const chapters = getChaptersForBook(currentLang, currentBookNum);
  const chapterIdx = chapters.indexOf(currentChapter);

  const label = el("verseNavLabel");
  if (label) label.textContent = `Ayat ${currentSingleVerse} dari ${verseNums.length}`;

  const prevBtn = el("prevVerseBtn");
  const nextBtn = el("nextVerseBtn");
  const hasPrevChapter = chapterIdx > 0;
  const hasNextChapter = chapterIdx !== -1 && chapterIdx < chapters.length - 1;

  if (prevBtn) {
    prevBtn.disabled = idx <= 0 && !hasPrevChapter;
    prevBtn.onclick = () => {
      if (idx > 0) {
        jumpToVerse(verseNums[idx - 1]);
      } else if (hasPrevChapter) {
        // Ke pasal sebelumnya, mulai dari ayat TERAKHIRnya
        const prevChapterVerses = getChapterVerses(currentLang, currentBookNum, chapters[chapterIdx - 1]);
        const lastVerse = prevChapterVerses.length ? prevChapterVerses[prevChapterVerses.length - 1].verse : 1;
        renderChapter(currentBookNum, chapters[chapterIdx - 1], lastVerse);
      }
    };
  }
  if (nextBtn) {
    nextBtn.disabled = idx === -1 || (idx >= verseNums.length - 1 && !hasNextChapter);
    nextBtn.onclick = () => {
      if (idx !== -1 && idx < verseNums.length - 1) {
        jumpToVerse(verseNums[idx + 1]);
      } else if (hasNextChapter) {
        // Ke pasal berikutnya, mulai dari ayat PERTAMAnya
        renderChapter(currentBookNum, chapters[chapterIdx + 1], null);
      }
    };
  }
}

// Kontrol mode tampilan ayat (menu ⋮ → 👁️ Tampilan Ayat): "📖 Seluruh
// Pasal" (default, perilaku lama) atau "🔎 1 Ayat Saja". Dipanggil sekali
// dari afterDataReady(), sama seperti initColumnsControl().
function initVerseModeControl() {
  const group = el("verseModeBtnGroup");
  if (!group) return;
  const btns = group.querySelectorAll(".columns-btn");

  function applyUI(mode) {
    btns.forEach((b) => b.classList.toggle("active", b.dataset.verseMode === mode));
  }
  applyUI(getSetting(currentUser, "verseDisplayMode") || "chapter");

  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.verseMode;
      applyUI(mode);
      setSetting(currentUser, "verseDisplayMode", mode);
      if (mode === "verse" && !currentSingleVerse && highlightVerse) currentSingleVerse = highlightVerse;
      if (currentBookNum && currentChapter) {
        renderChapter(currentBookNum, currentChapter, mode === "verse" ? currentSingleVerse : highlightVerse);
      }
    });
  });
}

// ------------------------------------------------------------
// 7) PENCARIAN — referensi ayat ATAU kata, sepenuhnya di lokal
// ------------------------------------------------------------
function parseReference(query) {
  const q = query.trim().toLowerCase().replace(/\./g, "");
  const m = q.match(/^(.*?)(\d+)(?::(\d+)(?:-(\d+))?)?$/);
  if (!m) return null;
  const bookPart = m[1].trim().replace(/\s+/g, " ");
  const chapter = parseInt(m[2], 10);
  const verseStart = m[3] ? parseInt(m[3], 10) : null;
  const verseEnd = m[4] ? parseInt(m[4], 10) : null;
  if (!bookPart) return null;

  let book = BOOK_ALIAS_INDEX[bookPart];
  if (!book) {
    const candidates = Object.keys(BOOK_ALIAS_INDEX).filter((a) => a.startsWith(bookPart));
    if (candidates.length) book = BOOK_ALIAS_INDEX[candidates[0]];
  }
  if (!book) return null;

  return { book, chapter, verseStart, verseEnd };
}

// Menyorot SEMUA kemunculan kata/frasa yang ditemukan (bukan cuma yang
// pertama), supaya sesuai permintaan "kata yang ditemukan di-highlight".
function highlightAllMatches(text, query) {
  const q = query.trim();
  if (!q) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped, "gi");
  return text.replace(re, (m) => "<mark>" + m + "</mark>");
}

// Menghitung berapa kali `query` PERSIS muncul di dalam `text` (bisa lebih
// dari satu kali dalam satu ayat/catatan yang sama) -- dipakai supaya hasil
// pencarian bisa menampilkan "jumlah kata persis ditemukan", bukan cuma
// jumlah ayat/baris yang mengandungnya.
function countExactOccurrences(text, query) {
  const q = query.trim();
  if (!q || !text) return 0;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped, "gi");
  const m = text.match(re);
  return m ? m.length : 0;
}
// (dipertahankan sebagai alias supaya kode lama yang masih memanggil
// highlightMatch tidak rusak)
function highlightMatch(text, query) {
  return highlightAllMatches(text, query);
}

let lastKeywordQuery = ""; // dipakai saat opsi bahasa/cakupan pencarian diubah

// Mode pencarian: "normal" (cepat, dibatasi) atau "max" (semua hasil, bisa
// lambat kalau katanya sangat umum -- ada kata yang bisa ketemu sampai
// ratusan ribu kali). Default selalu "normal" tiap kali dibuka; tidak
// disimpan permanen supaya orang tidak lupa sedang di mode lambat.
let searchResultMode = "normal";
const SEARCH_CAP_NORMAL = 1000;
const SEARCH_CAP_MAX = 100000;

// scope: "verse" | "notes" | "both". lang: kode bahasa, atau "__all__" untuk semua bahasa.
// testament: "__all__" | "PL" | "PB" -- menyaring hasil AYAT saja berdasar Perjanjian
// Lama/Baru kitabnya (lihat BOOKS di js/books.js, field "testament").
//
// PENTING (diperbaiki): field pencarian "catatan" di sini SELALU mengacu ke
// kolom Note pada SHEET ALKITAB -- field TERAKHIR dari 8 kolom sheet "Isi
// Alkitab" (Bahasa; Verse ID; Book Name; Book Number; Chapter; Verse; Text;
// Note) -- yaitu catatan kaki bawaan Alkitab itu sendiri, BUKAN catatan
// pribadi pengguna (catatan pribadi punya menu & pencarian sendiri lewat
// "🗒️ Catatan Saya"). Dulu opsi ke-3 keliru mencari di catatan pribadi
// (searchInPersonalNotes), sehingga kata yang jelas ADA di kolom Note sheet
// tidak pernah ketemu -- sekarang dibetulkan supaya ketiga opsi konsisten:
//   1. Ayat                -> hanya teks ayat
//   2. Ayat + Catatan Kaki -> teks ayat DAN kolom Note
//   3. Catatan Kaki        -> hanya kolom Note
function runKeywordSearch(query, lang, scope, testament, mode) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return { verseResults: [], noteResults: [] };
  const useLang = lang || currentLang;
  const useScope = scope || "verse";
  const useTestament = testament || "__all__";
  const cap = mode === "max" ? SEARCH_CAP_MAX : SEARCH_CAP_NORMAL;

  function filteredPool() {
    let pool = useLang === "__all__" ? bibleData : bibleData.filter((v) => v.lang === useLang);
    if (useTestament === "PL" || useTestament === "PB") {
      pool = pool.filter((v) => {
        const book = BOOKS.find((b) => b.num === v.bookNumber);
        return book && book.testament === useTestament;
      });
    }
    return pool;
  }

  let verseResults = [];
  if (useScope === "verse" || useScope === "both") {
    verseResults = filteredPool().filter((v) => v.text.toLowerCase().includes(q)).slice(0, cap);
  }

  let noteResults = [];
  if (useScope === "both" || useScope === "notes") {
    // Dicari di teks polosnya (tag HTML dibuang dulu) supaya markup <p>/<FR>
    // dst dari kolom Note tidak mengganggu pencocokan kata.
    noteResults = searchInBibleNotes(filteredPool(), q, cap);
  }
  return { verseResults, noteResults, cap };
}

// Mencari di kolom Note pada SHEET ALKITAB (catatan/penjelasan per ayat yang
// datang dari Google Sheet, field terakhir: Bahasa;Verse ID;Book Name;
// Book Number;Chapter;Verse;Text;Note) -- ini yang tampil sebagai badge 📝
// di layar baca pasal. `pool` sudah difilter bahasa & Perjanjian sesuai opsi
// pencarian yang aktif.
function searchInBibleNotes(pool, q, cap) {
  const out = [];
  for (const v of pool) {
    if (!v.note || !v.note.trim()) continue;
    const plain = noteHtmlToPlainText(v.note);
    if (plain.toLowerCase().includes(q)) {
      out.push({ verseId: v.id, note: plain, verse: v, isPersonal: false });
      if (out.length >= (cap || SEARCH_CAP_NORMAL)) break;
    }
  }
  return out;
}

// Mencari di catatan pribadi milik pengguna yang sedang login (js/notes.js).
// Catatan: TIDAK dipakai lagi oleh kotak pencarian utama (lihat penjelasan
// di runKeywordSearch() di atas) -- catatan pribadi sudah punya tempatnya
// sendiri di menu "🗒️ Catatan Saya" (semua catatan langsung terlihat di
// sana tanpa perlu dicari). Fungsi ini dibiarkan ada kalau-kalau dibutuhkan lagi nanti.
function searchInPersonalNotes(q, cap) {
  const notes = loadLocalNotes(currentUser);
  const out = [];
  Object.keys(notes).forEach((verseId) => {
    const entry = notes[verseId];
    if (entry && entry.note && entry.note.toLowerCase().includes(q)) {
      out.push({ verseId, note: entry.note, verse: verseById[verseId] || null, isPersonal: true });
    }
  });
  return out.slice(0, cap || SEARCH_CAP_NORMAL);
}

function setSearchMode(mode) {
  searchResultMode = mode === "max" ? "max" : "normal";
  if (el("searchModeNormal")) el("searchModeNormal").classList.toggle("active", searchResultMode === "normal");
  if (el("searchModeMax")) el("searchModeMax").classList.toggle("active", searchResultMode === "max");
  if (lastKeywordQuery) handleSearch(lastKeywordQuery, true);
}

function initSearchOptions() {
  const langSel = el("searchLangSelect");
  const scopeSel = el("searchScopeSelect");
  const testamentSel = el("searchTestamentSelect");
  if (!langSel || !scopeSel) return;
  langSel.innerHTML = '<option value="__all__">Semua Bahasa</option>' +
    CONFIG.LANGUAGES.filter((l) => verseIndex[l.code])
      .map((l) => `<option value="${l.code}">${l.label}</option>`)
      .join("");
  langSel.value = currentLang || "__all__";
  scopeSel.value = "verse";
  if (testamentSel) testamentSel.value = "__all__";
  searchResultMode = "normal";
  const rerun = () => {
    if (lastKeywordQuery) handleSearch(lastKeywordQuery, true);
  };
  langSel.addEventListener("change", rerun);
  scopeSel.addEventListener("change", rerun);
  if (testamentSel) testamentSel.addEventListener("change", rerun);
  if (el("searchModeNormal") && !el("searchModeNormal").dataset.wired) {
    el("searchModeNormal").dataset.wired = "1";
    el("searchModeNormal").addEventListener("click", () => setSearchMode("normal"));
  }
  if (el("searchModeMax") && !el("searchModeMax").dataset.wired) {
    el("searchModeMax").dataset.wired = "1";
    el("searchModeMax").addEventListener("click", () => setSearchMode("max"));
  }
  if (el("searchModeNormal")) el("searchModeNormal").classList.toggle("active", searchResultMode === "normal");
  if (el("searchModeMax")) el("searchModeMax").classList.toggle("active", searchResultMode === "max");
}

// Pencarian gabungan beberapa referensi sekaligus, dipisah titik-koma atau
// baris baru, mis. "matius 1:1; wahyu 2:2" — menampilkan tiap ayat yang
// ditemukan sebagai daftar hasil (bukan pasal penuh).
function handleMultiReferenceSearch(query) {
  const parts = query.split(/[;\n]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return false;

  const refs = parts.map((p) => ({ raw: p, ref: parseReference(p) }));
  const validCount = refs.filter((r) => r.ref).length;
  if (validCount < 2) return false; // bukan daftar referensi -> biarkan pencarian biasa yang menangani

  hideAllPanels();
  el("searchResults").hidden = false;
  if (el("searchOptionsRow")) el("searchOptionsRow").hidden = true;
  el("searchResultsTitle").textContent = `Hasil untuk ${validCount} referensi (${parts.length - validCount ? (parts.length - validCount) + " tidak dikenali" : "semua ditemukan"})`;
  const list = el("searchResultsList");
  list.innerHTML = "";

  refs.forEach(({ raw, ref }) => {
    if (!ref) {
      const p = document.createElement("div");
      p.className = "result-item";
      p.innerHTML = `<div class="result-ref">“${raw}”</div><div class="result-text">Referensi tidak dikenali.</div>`;
      list.appendChild(p);
      return;
    }
    if (!bookAvailableInLang(currentLang, ref.book.num)) {
      const p = document.createElement("div");
      p.className = "result-item";
      p.innerHTML = `<div class="result-ref">${ref.book.name} ${ref.chapter}${ref.verseStart ? ":" + ref.verseStart : ""}</div><div class="result-text">Tidak tersedia dalam bahasa yang aktif.</div>`;
      list.appendChild(p);
      return;
    }
    const verses = getChapterVerses(currentLang, ref.book.num, ref.chapter);
    const vStart = ref.verseStart || 1;
    const vEnd = ref.verseEnd || vStart;
    const matched = ref.verseStart
      ? verses.filter((v) => v.verse >= vStart && v.verse <= vEnd)
      : verses; // tanpa nomor ayat -> seluruh pasal

    if (!matched.length) {
      const p = document.createElement("div");
      p.className = "result-item";
      p.innerHTML = `<div class="result-ref">${ref.book.name} ${ref.chapter}${ref.verseStart ? ":" + ref.verseStart : ""}</div><div class="result-text">Ayat tidak ditemukan.</div>`;
      list.appendChild(p);
      return;
    }
    const displayName = matched[0].bookName || ref.book.name;
    const btn = document.createElement("button");
    btn.className = "result-item";
    btn.innerHTML = `
      <div class="result-ref">${displayName} ${ref.chapter}:${matched.map((v) => v.verse).join(",")}</div>
      <div class="result-text">${matched.map((v) => v.text).join(" ")}</div>
    `;
    btn.addEventListener("click", () => renderChapter(ref.book.num, ref.chapter, matched[0].verse));
    list.appendChild(btn);
  });

  return true;
}

// `isOptionChange` = true kalau dipanggil ulang gara-gara opsi bahasa/cakupan
// diubah (supaya tidak dianggap query referensi/multi-referensi baru lagi).
function handleSearch(rawQuery, isOptionChange) {
  const query = rawQuery.trim();
  if (!query) return;

  if (!isOptionChange) {
    if (handleMultiReferenceSearch(query)) return;

    const ref = parseReference(query);
    if (ref) {
      if (!bookAvailableInLang(currentLang, ref.book.num)) {
        showLangUnavailable();
        return;
      }
      renderChapter(ref.book.num, ref.chapter, ref.verseStart || null);
      logActivity("Pencarian", query);
      return;
    }
  }

  lastKeywordQuery = query;
  const langSel = el("searchLangSelect");
  const scopeSel = el("searchScopeSelect");
  const testamentSel = el("searchTestamentSelect");
  const lang = (langSel && langSel.value) || currentLang;
  const scope = (scopeSel && scopeSel.value) || "verse";
  const testament = (testamentSel && testamentSel.value) || "__all__";

  const { verseResults, noteResults, cap } = runKeywordSearch(query, lang, scope, testament, searchResultMode);
  const total = verseResults.length + noteResults.length;

  hideAllPanels();
  el("searchResults").hidden = false;
  if (el("searchOptionsRow")) el("searchOptionsRow").hidden = false;
  if (!isOptionChange) initSearchOptions(); // isi ulang pilihan bahasa (baru diketahui setelah data siap)
  if (langSel) langSel.value = lang;
  if (scopeSel) scopeSel.value = scope;
  if (testamentSel) testamentSel.value = testament;
  if (el("searchModeNormal")) el("searchModeNormal").classList.toggle("active", searchResultMode === "normal");
  if (el("searchModeMax")) el("searchModeMax").classList.toggle("active", searchResultMode === "max");

  const isCapped = verseResults.length === cap || noteResults.length === cap;
  const cappedNote = isCapped ? "+" : "";
  // Jumlah kata PERSIS "query" muncul, dijumlahkan dari semua ayat + catatan
  // yang ketemu (satu ayat/catatan bisa mengandung kata itu lebih dari sekali).
  const exactWordCount =
    verseResults.reduce((sum, v) => sum + countExactOccurrences(v.text, query), 0) +
    noteResults.reduce((sum, n) => sum + countExactOccurrences(n.note, query), 0);
  const modeHint = isCapped && searchResultMode === "normal"
    ? ` — tekan tombol ⚡ Maks di atas untuk melihat semua hasil (bisa lebih lambat)`
    : "";
  el("searchResultsTitle").textContent =
    `Hasil pencarian “${query}” — ${total}${cappedNote} ditemukan` +
    (scope === "both" ? ` (${verseResults.length} di ayat, ${noteResults.length} di catatan kaki)` : "") +
    ` · kata "${query}" muncul persis ${exactWordCount}${cappedNote} kali` + modeHint;
  const list = el("searchResultsList");
  list.innerHTML = "";

  if (!isOptionChange) logActivity("Pencarian", query);

  if (total === 0) {
    const p = document.createElement("p");
    p.textContent = "Tidak ditemukan. Coba kata lain, atau gunakan format referensi seperti “kejadian 1:1”.";
    list.appendChild(p);
    return;
  }

  verseResults.forEach((v) => {
    const book = BOOKS.find((b) => b.num === v.bookNumber);
    const langLabel = lang === "__all__" ? ` · ${langLabelFor(v.lang)}` : "";
    const btn = document.createElement("button");
    btn.className = "result-item";
    btn.innerHTML = `
      <div class="result-ref">${v.bookName || (book ? book.name : "")} ${v.chapter}:${v.verse}${langLabel}</div>
      <div class="result-text">${highlightAllMatches(v.text, query)}</div>
    `;
    btn.addEventListener("click", () => {
      currentLang = v.lang;
      if (langSelectEl()) langSelectEl().value = v.lang;
      renderChapter(v.bookNumber, v.chapter, v.verse);
    });
    list.appendChild(btn);
  });

  noteResults.forEach((n) => {
    const btn = document.createElement("button");
    btn.className = "result-item";
    const ref = n.verse ? `${n.verse.bookName} ${n.verse.chapter}:${n.verse.verse}` : n.verseId;
    const tag = "(catatan kaki)";
    btn.innerHTML = `
      <div class="result-ref">📝 ${ref} <span class="result-note-tag">${tag}</span></div>
      <div class="result-text">${highlightAllMatches(n.note, query)}</div>
    `;
    btn.addEventListener("click", () => {
      if (n.verse) {
        currentLang = n.verse.lang;
        if (langSelectEl()) langSelectEl().value = n.verse.lang;
        renderChapter(n.verse.bookNumber, n.verse.chapter, n.verse.verse, { openNote: true }); // hasil pencarian CATATAN -- memang diminta buka catatannya
      }
    });
    list.appendChild(btn);
  });
}

function langSelectEl() {
  return el("langSelect");
}

// ------------------------------------------------------------
// 8) RENCANA BACA
// ------------------------------------------------------------
async function showPlanPanel() {
  hideAllPanels();
  el("planPanel").hidden = false;
  logActivity("Rencana Baca");
  renderPlanPanel();
  // tarik progres terbaru dari Google Sheet (kalau dikonfigurasi) lalu
  // gambar ulang panel kalau ternyata ada versi lebih baru dari perangkat lain
  await refreshPlanFromRemote(currentUser);
  if (!el("planPanel").hidden) renderPlanPanel();
}

function renderPlanPanel() {
  const plan = loadPlan(currentUser);
  const container = el("planPanel");
  container.innerHTML = "";

  const title = document.createElement("h2");
  title.textContent = "Rencana Baca";
  container.appendChild(title);

  if (!plan) {
    renderPlanChooser(container);
  } else {
    renderPlanDetail(container, plan);
  }
}

function renderPlanChooser(container) {
  const intro = document.createElement("p");
  intro.className = "plan-intro";
  intro.textContent = "Pilih rencana baca yang ingin diikuti. Anda bisa menggantinya kapan saja.";
  container.appendChild(intro);

  const grid = document.createElement("div");
  grid.className = "plan-options";
  PLAN_DEFINITIONS.forEach((def) => {
    const card = document.createElement("button");
    card.className = "plan-option-card";
    card.innerHTML = `<div class="plan-option-title">${def.label}</div><div class="plan-option-sub">${def.days.toLocaleString("id-ID")} hari bacaan</div>`;
    card.addEventListener("click", () => {
      const items = buildScheduleForScope(def.scope);
      const schedule = distributeIntoDays(items, def.days);
      const plan = {
        planId: def.id,
        label: def.label,
        days: def.days,
        startDate: new Date().toISOString(),
        schedule,
        completed: new Array(def.days).fill(false),
      };
      savePlan(currentUser, plan);
      renderPlanPanel();
    });
    grid.appendChild(card);
  });

  // Rencana berbasis Bacaan Bersuara (audio/video) -- digabungkan ke sini
  // supaya cuma ada SATU menu "Rencana Baca" (sebelumnya 🎧 Bacaan Bersuara
  // adalah menu terpisah). Tiap sheet yang sudah diisi URL-nya di
  // CONFIG.READING_MEDIA_SHEETS (js/config.js) muncul sebagai satu pilihan
  // rencana di sini; kalau dipilih, tiap "hari" dalam rencana mengikuti
  // persis satu baris di sheet itu (label bacaan APA ADANYA dari kolom
  // Pembacaan), dan link 🎵 MP3 / 🎬 MP4 / ▶️ YouTube-nya tampil menempel
  // di baris hari itu.
  const mediaSheets = typeof availableMediaSheets === "function" ? availableMediaSheets() : [];
  mediaSheets.forEach((sheet) => {
    const card = document.createElement("button");
    card.className = "plan-option-card";
    card.innerHTML = `<div class="plan-option-title">🎧 ${sheet.label}</div><div class="plan-option-sub">Bacaan Bersuara (MP3/MP4/YouTube)</div>`;
    card.addEventListener("click", async () => {
      card.disabled = true;
      const originalHtml = card.innerHTML;
      card.innerHTML = `<div class="plan-option-title">Memuat…</div>`;
      try {
        const plan = await buildMediaPlan(sheet);
        savePlan(currentUser, plan);
        renderPlanPanel();
      } catch (e) {
        alert("Gagal mengambil data Bacaan Bersuara: " + e.message);
        card.disabled = false;
        card.innerHTML = originalHtml;
      }
    });
    grid.appendChild(card);
  });

  container.appendChild(grid);

  if (typeof availableMediaSheets === "function" && !mediaSheets.length && (CONFIG.READING_MEDIA_SHEETS || []).length) {
    const note = document.createElement("p");
    note.className = "media-empty";
    note.textContent = "Belum ada sheet Bacaan Bersuara yang terisi URL-nya (lihat CONFIG.READING_MEDIA_SHEETS di js/config.js).";
    container.appendChild(note);
  }
}

function renderPlanDetail(container, plan) {
  const doneCount = plan.completed.filter(Boolean).length;
  const pct = plan.days ? Math.round((doneCount / plan.days) * 100) : 0;
  const nextIdx = plan.completed.findIndex((c) => !c);

  const head = document.createElement("div");
  head.className = "plan-head";
  head.innerHTML = `
    <div class="plan-head-title">${plan.label}</div>
    <div class="plan-progress-track"><div class="plan-progress-fill" style="width:${pct}%"></div></div>
    <div class="plan-progress-text">${doneCount} dari ${plan.days} hari selesai (${pct}%)</div>
  `;
  container.appendChild(head);

  const actions = document.createElement("div");
  actions.className = "plan-actions";

  const nextFirst = nextIdx !== -1 && plan.schedule[nextIdx] && plan.schedule[nextIdx][0];
  if (nextFirst && nextFirst.bookNum && nextFirst.chapter) {
    const continueBtn = document.createElement("button");
    continueBtn.className = "chip-btn primary";
    continueBtn.textContent = `▶ Lanjutkan — Hari ${nextIdx + 1}`;
    continueBtn.addEventListener("click", () => {
      if (!bookAvailableInLang(currentLang, nextFirst.bookNum)) { showLangUnavailable(); return; }
      renderChapter(nextFirst.bookNum, nextFirst.chapter);
    });
    actions.appendChild(continueBtn);
  }

  const changeBtn = document.createElement("button");
  changeBtn.className = "chip-btn";
  changeBtn.textContent = "Ganti Rencana";
  changeBtn.addEventListener("click", () => {
    if (confirm("Ganti rencana baca? Progres rencana yang sedang berjalan akan dihapus.")) {
      clearPlan(currentUser);
      renderPlanPanel();
    }
  });
  actions.appendChild(changeBtn);

  // Rencana berbasis Bacaan Bersuara: tombol untuk menarik ulang link
  // MP3/MP4/YouTube terbaru dari Google Sheet (mis. kalau ada link yang
  // baru ditambahkan/diperbaiki) TANPA menghapus progres centang yang
  // sudah ada (dicocokkan berdasar urutan hari).
  if (plan.mediaSheetKey) {
    const resyncBtn = document.createElement("button");
    resyncBtn.className = "chip-btn small";
    resyncBtn.textContent = "🔄 Sinkronkan ulang link audio/video";
    resyncBtn.addEventListener("click", async () => {
      resyncBtn.disabled = true;
      const original = resyncBtn.textContent;
      resyncBtn.textContent = "Menyinkronkan…";
      try {
        await resyncMediaPlan(plan);
        savePlan(currentUser, plan);
        renderPlanPanel();
      } catch (e) {
        alert("Gagal menyinkronkan: " + e.message);
        resyncBtn.disabled = false;
        resyncBtn.textContent = original;
      }
    });
    actions.appendChild(resyncBtn);
  }
  container.appendChild(actions);

  const list = document.createElement("div");
  list.className = "plan-day-list";
  plan.schedule.forEach((dayItems, idx) => {
    const row = document.createElement("div");
    row.className = "plan-day-row" + (plan.completed[idx] ? " done" : "");

    const first = dayItems[0] || {};
    const readingLabel = first.label ? first.label : formatDayReading(dayItems);

    const mainRow = document.createElement("div");
    mainRow.className = "plan-day-row-main";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!plan.completed[idx];
    cb.addEventListener("change", () => {
      plan.completed[idx] = cb.checked;
      savePlan(currentUser, plan);
      renderPlanPanel();
    });

    const label = document.createElement("button");
    label.className = "plan-day-label";
    label.innerHTML = `<span class="plan-day-num">Hari ${idx + 1}</span><span class="plan-day-reading">${readingLabel}</span>`;
    label.addEventListener("click", () => {
      if (first.bookNum && first.chapter) {
        if (!bookAvailableInLang(currentLang, first.bookNum)) { showLangUnavailable(); return; }
        renderChapter(first.bookNum, first.chapter);
        closeSidebarOnMobile();
      } else if (plan.mediaSheetKey) {
        alert("Tidak bisa menebak kitab/pasal dari: " + readingLabel);
      }
    });

    mainRow.appendChild(cb);
    mainRow.appendChild(label);
    row.appendChild(mainRow);

    // Link dengar/tonton (kalau rencana ini berbasis Bacaan Bersuara dan
    // baris ini punya link) -- ditempel langsung di bawah baris harinya,
    // memakai tombol yang sama seperti bekas menu 🎧 Bacaan Bersuara.
    if (first.mp3 || first.mp4 || first.youtube) {
      const mediaRow = document.createElement("div");
      mediaRow.className = "plan-day-row-media";
      mediaRow.appendChild(buildInlineMediaBlock(first, `${plan.label} — Hari ${idx + 1}: ${readingLabel}`));
      row.appendChild(mediaRow);
    }

    list.appendChild(row);
  });
  container.appendChild(list);
}

// ------------------------------------------------------------
// 8b) PENGUMUMAN — hanya administrator yang bisa menulis, tampil ke
//     semua orang yang login (di awal, dan bisa dibuka lagi kapan saja
//     lewat menu ⋮ → 📢 Pengumuman).
//
//     Setiap pengumuman punya: tanggal dibuat (otomatis), tanggal AKTIF
//     & tanggal BERAKHIR (diisi administrator), dan STATUS:
//       - "draft"   : belum ditayangkan -- HANYA administrator yang
//                     melihatnya (dipakai sebelum siap disebar).
//       - "done"    : siap tayang -- akan tampil ke SEMUA pengguna,
//                     tapi HANYA pada rentang tanggal aktif s/d berakhir
//                     (di luar rentang itu, otomatis tidak tampil sama
//                     sekali buat pengguna biasa, walau datanya tetap ada).
//       - "expired" : ditutup manual oleh administrator (tidak tampil
//                     lagi ke siapa pun walau tanggalnya masih berlaku).
//     Saat pengumuman sedang berlaku (live), ditampilkan BESAR & mencolok
//     otomatis begitu pengguna masuk (lihat renderBigAnnouncementBanner).
// ------------------------------------------------------------
const ANNOUNCEMENT_SEEN_KEY_PREFIX = "bible_app_announcement_last_seen_v1_";

function announcementSeenKey() {
  return ANNOUNCEMENT_SEEN_KEY_PREFIX + (currentUser || "guest");
}

// yyyy-MM-dd hari ini, dipakai untuk membandingkan tanggal aktif/berakhir
// (dibandingkan sebagai teks, bukan objek Date, supaya tidak terpengaruh zona waktu jam).
function todayDateStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Ambil hanya bagian "yyyy-MM-dd" dari sebuah nilai tanggal, walau nilainya
// kebetulan berupa timestamp lengkap (mis. "2026-08-13T12:04:05.424Z", ada
// jam/menit/detik & huruf "Z" di belakangnya -- pernah terjadi pada baris
// yang ditambahkan langsung di Sheet, bukan lewat form aplikasi). Server
// (apps-script/Code.gs, lihat normalizeDateOnly_()) sudah membersihkan ini
// sebelum dikirim ke aplikasi, TAPI dibersihkan juga di sini sebagai jaga-
// jaga kedua (mis. data lama yang sempat tersimpan di cache/localStorage
// sebelum pembaruan backend ini) supaya perbandingan teks di bawah selalu
// benar apa pun sumbernya.
function dateOnlyStr(v) {
  if (!v) return "";
  const s = String(v);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s;
}

// Jaga-jaga KEDUA (server -- apps-script/Code.gs, fmtLogDateCell_() /
// fmtLogTimeCell_() -- sudah membersihkan ini duluan) khusus untuk kolom
// Date/Time di panel "📊 Log Aktivitas": buang huruf "Z" & bagian jam
// ISO ("T12:04:05.424Z") kalau entah kenapa masih kebawa (mis. baris lama
// yang sempat tersimpan di cache/localStorage sebelum pembaruan backend
// ini) -- supaya yang tampil di layar SELALU tanggal/jam bersih, apa pun
// sumbernya.
function cleanLogDateTimeStr(v) {
  if (!v) return "";
  const s = String(v).trim();
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  return s.replace(/Z$/i, "");
}

// Apakah pengumuman ini SEDANG BERLAKU untuk pengguna biasa (bukan administrator):
// status harus "done" (siap tayang, bukan draft/expired), DAN hari ini ada di
// antara ActiveFrom..ActiveUntil (kosong = tidak dibatasi ke arah itu).
function announcementIsLive(a) {
  const status = a.status || "done"; // baris lama (sebelum kolom Status ada) dianggap aktif
  if (status !== "done") return false;
  const today = todayDateStr();
  const activeFrom = dateOnlyStr(a.activeFrom);
  const activeUntil = dateOnlyStr(a.activeUntil);
  if (activeFrom && today < activeFrom) return false;
  if (activeUntil && today > activeUntil) return false;
  return true;
}

function announcementStatusLabel(a) {
  const status = a.status || "done";
  if (status === "draft") return "📝 Draft";
  if (status === "expired") return "⛔ Expired (ditutup manual)";
  if (announcementIsLive(a)) return "🟢 Aktif sekarang";
  const today = todayDateStr();
  const activeFrom = dateOnlyStr(a.activeFrom);
  if (activeFrom && today < activeFrom) return "⏳ Belum waktunya (dijadwalkan)";
  return "⌛ Expired (lewat tanggal berakhir)";
}

// Apakah pengumuman ini ditujukan untuk PENGGUNA YANG SEDANG LOGIN (bukan
// soal tanggal/status -- itu urusan announcementIsLive()). "all" (atau
// kosong, untuk baris lama sebelum kolom ini ada) = semua orang. Kalau
// diisi tag @username tertentu (lihat parseAnnouncementTags()), hanya
// username yang disebut yang bisa melihatnya.
function announcementVisibleToMe(a) {
  const vt = (a.visibleTo || "all").trim().toLowerCase();
  if (!vt || vt === "all") return true;
  const list = vt.split(",").map((s) => s.trim()).filter(Boolean);
  return list.includes((currentUser || "").toLowerCase());
}

// Gabungan syarat lengkap supaya tampil ke PENGGUNA BIASA: sedang berlaku
// (tanggal + status) DAN memang ditujukan untuk dia (tag @username / @all).
function announcementShouldShow(a) {
  return announcementIsLive(a) && announcementVisibleToMe(a);
}

// ------------------------------------------------------------
// Tag @username / @all di teks pengumuman -- ditulis administrator
// dengan mengetik "@" lalu memilih dari daftar (lihat buildAnnouncementTagPicker()),
// atau ketik manual. Fungsi ini memisahkan teks BERSIH (tanpa tulisan
// "@nama" sama sekali, supaya "tidak bisa tampil tulisan @" seperti
// diminta) dari daftar username yang dituju (`visibleTo`, dipakai
// announcementVisibleToMe() di atas). Token yang TIDAK cocok dengan
// username asli mana pun (dan bukan "all") dibiarkan apa adanya di teks
// (supaya "@" yang kebetulan dipakai untuk hal lain, mis. alamat e-mail,
// tidak ikut terpotong).
function parseAnnouncementTags(rawText, knownUsernamesLower) {
  const found = new Set();
  let sawAll = false;
  const cleanText = rawText.replace(/@([a-zA-Z0-9_.-]+)/g, (whole, name) => {
    const lower = name.toLowerCase();
    if (lower === "all") { sawAll = true; return ""; }
    if (knownUsernamesLower.has(lower)) { found.add(lower); return ""; }
    return whole; // bukan tag yang dikenal -- biarkan apa adanya
  }).replace(/[ \t]{2,}/g, " ").replace(/\s+\n/g, "\n").trim();

  const visibleTo = sawAll || found.size === 0 ? "all" : Array.from(found).join(",");
  return { cleanText, visibleTo };
}

async function checkAnnouncementsAtStart() {
  if (typeof Sync === "undefined" || !Sync.enabled()) return;
  const list = await Sync.pullAnnouncements(currentUser);
  const live = list.filter(announcementShouldShow);
  if (!live.length) return;
  const lastSeen = localStorage.getItem(announcementSeenKey()) || "0";
  const hasUnseen = live.some((a) => String(a.id) > lastSeen);
  if (hasUnseen && el("appRoot") && !el("appRoot").hidden) {
    showBigAnnouncementBanner(live);
    markAnnouncementsSeen(live);
  }
}

// Tampilan BESAR & mencolok yang otomatis muncul begitu ada pengumuman
// sedang berlaku yang belum pernah dilihat pengguna ini -- terpisah dari
// panel Pengumuman biasa (menu ⋮) supaya benar-benar tidak terlewat.
function showBigAnnouncementBanner(liveList) {
  let overlay = el("announcementBigOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "announcementBigOverlay";
    overlay.className = "announcement-big-overlay";
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = "";
  const box = document.createElement("div");
  box.className = "announcement-big-box";
  const closeBtn = document.createElement("button");
  closeBtn.className = "announcement-big-close";
  closeBtn.textContent = "✕";
  closeBtn.setAttribute("aria-label", "Tutup pengumuman");
  closeBtn.addEventListener("click", () => { overlay.hidden = true; });
  box.appendChild(closeBtn);

  const title = document.createElement("div");
  title.className = "announcement-big-title";
  title.textContent = "📢 Pengumuman";
  box.appendChild(title);

  liveList.forEach((a) => {
    const item = document.createElement("div");
    item.className = "announcement-big-text";
    item.textContent = a.text;
    box.appendChild(item);
    const meta = document.createElement("div");
    meta.className = "announcement-big-meta";
    const when = a.createdAt ? new Date(a.createdAt).toLocaleDateString("id-ID") : "";
    meta.textContent = [a.createdBy, when].filter(Boolean).join(" · ");
    box.appendChild(meta);
  });

  const okBtn = document.createElement("button");
  okBtn.className = "chip-btn primary";
  okBtn.textContent = "Mengerti";
  okBtn.addEventListener("click", () => { overlay.hidden = true; });
  box.appendChild(okBtn);

  overlay.appendChild(box);
  overlay.hidden = false;
}

async function showAnnouncementPanel(preloaded) {
  hideAllPanels();
  el("announcementPanel").hidden = false;
  logActivity("Pengumuman");
  if (preloaded) {
    renderAnnouncementPanel(preloaded);
    markAnnouncementsSeen(preloaded.filter(announcementShouldShow));
    return;
  }
  if (!Sync.enabled()) {
    renderAnnouncementPanel([]);
    return;
  }
  const container = el("announcementPanel");
  container.innerHTML = `<h2>📢 Pengumuman</h2><p class="media-empty">Memuat…</p>`;
  const { ok, list, error } = await Sync.pullAnnouncementsChecked(currentUser);
  if (!ok) {
    // GAGAL mengambil data (bukan berarti kosong!) -- tampilkan jelas +
    // tombol coba lagi, supaya tidak disangka "memang belum ada pengumuman"
    // padahal sebenarnya cuma gagal tersambung (lihat catatan di js/sync.js).
    container.innerHTML = "";
    const title = document.createElement("h2");
    title.textContent = "📢 Pengumuman";
    container.appendChild(title);
    const p = document.createElement("p");
    p.className = "media-empty";
    p.textContent = "Gagal memuat pengumuman. Periksa sambungan internet Anda, lalu coba lagi.";
    container.appendChild(p);
    // Pesan error ASLI dari server (kalau ada) ditampilkan terpisah --
    // supaya administrator bisa langsung tahu penyebab sebenarnya (mis.
    // "Sheet Sinkron tidak ditemukan") daripada cuma dugaan "internet",
    // yang seringnya BUKAN penyebab sesungguhnya. Pengguna biasa cukup
    // membaca pesan di atas & tombol coba lagi.
    if (error && isAdministrator()) {
      const errP = document.createElement("p");
      errP.className = "media-empty";
      errP.style.fontSize = "12px";
      errP.textContent = "Detail teknis (khusus administrator): " + error;
      container.appendChild(errP);
    }
    const retryBtn = document.createElement("button");
    retryBtn.className = "chip-btn primary";
    retryBtn.textContent = "🔄 Coba Lagi";
    retryBtn.addEventListener("click", () => showAnnouncementPanel());
    container.appendChild(retryBtn);
    return;
  }
  renderAnnouncementPanel(list);
  markAnnouncementsSeen(list.filter(announcementShouldShow));
}

function markAnnouncementsSeen(list) {
  if (!list || !list.length) return;
  const maxId = list.reduce((m, a) => (String(a.id) > m ? String(a.id) : m), "0");
  localStorage.setItem(announcementSeenKey(), maxId);
}

function renderAnnouncementPanel(list) {
  const container = el("announcementPanel");
  container.innerHTML = "";

  const title = document.createElement("h2");
  title.textContent = "📢 Pengumuman";
  container.appendChild(title);

  // Dideklarasikan di luar blok if() di bawah supaya bisa dipakai lagi oleh
  // tombol "Edit" di daftar pengumuman (visibleList.forEach() di bawah),
  // yang berada di luar blok if(isAdministrator()) ini.
  let enterAnnouncementEditMode = null;
  if (isAdministrator()) {
    const composeWrap = document.createElement("div");
    composeWrap.className = "announcement-compose";
    // editingId: null = mode "tambah baru" (default). Diisi id pengumuman
    // saat tombol "Edit" salah satu item di bawah diklik -- lihat tombol
    // Edit di dalam visibleList.forEach() -- supaya form yang SAMA ini
    // dipakai ulang untuk menyimpan PERUBAHAN (bukan membuat baris baru).
    let editingId = null;
    composeWrap.innerHTML = `
      <h3 id="announcementComposeTitle" class="announcement-compose-title">Tulis Pengumuman Baru</h3>
      <textarea id="announcementComposeText" rows="3" placeholder="Tulis pengumuman baru untuk semua pengguna… (opsional: tag @username tertentu supaya hanya dia yang lihat)"></textarea>
      <div class="announcement-tag-row">
        <label>Tandai (@tag) untuk:<br>
          <select id="announcementTagSelect"><option value="">Memuat daftar pengguna…</option></select>
        </label>
        <button type="button" id="announcementTagAddBtn" class="chip-btn small">+ Tambah Tag</button>
      </div>
      <p class="announcement-compose-hint">Kosongkan tag (atau pilih "Semua Pengguna (@all)") supaya pengumuman tampil ke semua orang. Tulisan "@nama" TIDAK ikut tampil di pengumuman jadinya -- hanya dipakai untuk menyaring siapa yang boleh melihat.</p>
      <div class="announcement-compose-dates">
        <label>Tanggal aktif<br><input type="date" id="announcementActiveFrom"></label>
        <label>Tanggal berakhir<br><input type="date" id="announcementActiveUntil"></label>
        <label>Status<br>
          <select id="announcementStatus">
            <option value="draft">Draft (belum tayang)</option>
            <option value="done" selected>Done (siap tayang sesuai tanggal)</option>
            <option value="expired">Expired (tutup sekarang)</option>
          </select>
        </label>
      </div>
      <p class="announcement-compose-hint">Pengumuman hanya tampil ke pengguna lain kalau Status = "Done" DAN hari ini ada di antara tanggal aktif s/d tanggal berakhir. Kosongkan tanggal kalau tidak ingin dibatasi.</p>
      <div class="announcement-compose-actions">
        <button id="announcementComposeBtn" class="chip-btn primary">Kirim Pengumuman</button>
        <button id="announcementCancelEditBtn" class="chip-btn small" hidden>Batal Edit</button>
      </div>
    `;
    container.appendChild(composeWrap);

    // Isi dropdown tag dengan semua username AKTIF (dari cache lokal daftar
    // pengguna) + pilihan "Semua Pengguna (@all)" paling atas. "all" adalah
    // kata terlarang dipakai sebagai username asli (lihat catatan di
    // js/config.js) supaya tidak pernah bentrok dengan tag broadcast ini.
    const tagSelect = composeWrap.querySelector("#announcementTagSelect");
    let knownUsernamesLower = new Set();
    LocalDB.getAllUsers().then((users) => {
      knownUsernamesLower = new Set(users.map((u) => u.username.toLowerCase()));
      const sorted = users.slice().sort((a, b) => (a.displayName || a.username).localeCompare(b.displayName || b.username, "id"));
      tagSelect.innerHTML = '<option value="all">🌐 Semua Pengguna (@all)</option>' +
        sorted.map((u) => `<option value="${u.username}">${u.displayName || u.username} (@${u.username})</option>`).join("");
    });
    composeWrap.querySelector("#announcementTagAddBtn").addEventListener("click", () => {
      const uname = tagSelect.value;
      if (!uname) return;
      const ta = composeWrap.querySelector("#announcementComposeText");
      const insertion = `@${uname} `;
      const pos = ta.selectionStart != null ? ta.selectionStart : ta.value.length;
      ta.value = ta.value.slice(0, pos) + insertion + ta.value.slice(pos);
      ta.focus();
      ta.selectionStart = ta.selectionEnd = pos + insertion.length;
    });

    // Dipanggil tombol "Edit" di bawah -- pindah ke mode edit: isi ulang
    // form dengan data pengumuman yang dipilih & ubah label tombol.
    function enterEditMode(a) {
      editingId = a.id;
      composeWrap.querySelector("#announcementComposeTitle").textContent = "Edit Pengumuman";
      const ta = composeWrap.querySelector("#announcementComposeText");
      // Tag @username lama tidak disimpan di teks (sudah dibersihkan saat
      // dibuat, lihat parseAnnouncementTags()) -- munculkan lagi di kotak
      // teks supaya kelihatan & bisa diubah, biar konsisten dengan alur
      // "tulis @tag lalu dibersihkan lagi saat disimpan" yang sama.
      const vt = (a.visibleTo || "all").trim().toLowerCase();
      const tagPrefix = (vt && vt !== "all") ? vt.split(",").map((u) => `@${u.trim()}`).join(" ") + " " : "";
      ta.value = tagPrefix + (a.text || "");
      composeWrap.querySelector("#announcementActiveFrom").value = dateOnlyStr(a.activeFrom);
      composeWrap.querySelector("#announcementActiveUntil").value = dateOnlyStr(a.activeUntil);
      composeWrap.querySelector("#announcementStatus").value = a.status || "draft";
      composeWrap.querySelector("#announcementComposeBtn").textContent = "Simpan Perubahan";
      composeWrap.querySelector("#announcementCancelEditBtn").hidden = false;
      composeWrap.scrollIntoView({ behavior: "smooth", block: "start" });
      ta.focus();
    }

    function exitEditMode() {
      editingId = null;
      composeWrap.querySelector("#announcementComposeTitle").textContent = "Tulis Pengumuman Baru";
      composeWrap.querySelector("#announcementComposeText").value = "";
      composeWrap.querySelector("#announcementActiveFrom").value = "";
      composeWrap.querySelector("#announcementActiveUntil").value = "";
      composeWrap.querySelector("#announcementStatus").value = "done";
      composeWrap.querySelector("#announcementComposeBtn").textContent = "Kirim Pengumuman";
      composeWrap.querySelector("#announcementCancelEditBtn").hidden = true;
    }
    composeWrap.querySelector("#announcementCancelEditBtn").addEventListener("click", exitEditMode);
    // simpan referensi supaya tombol "Edit" di daftar (dibuat di bawah,
    // setelah blok ini) bisa memanggilnya.
    enterAnnouncementEditMode = enterEditMode;

    composeWrap.querySelector("#announcementComposeBtn").addEventListener("click", async () => {
      const ta = composeWrap.querySelector("#announcementComposeText");
      const rawText = ta.value.trim();
      if (!rawText) return;
      const activeFrom = composeWrap.querySelector("#announcementActiveFrom").value || "";
      const activeUntil = composeWrap.querySelector("#announcementActiveUntil").value || "";
      const status = composeWrap.querySelector("#announcementStatus").value || "draft";
      if (activeFrom && activeUntil && activeFrom > activeUntil) {
        alert("Tanggal aktif tidak boleh setelah tanggal berakhir.");
        return;
      }
      const { cleanText, visibleTo } = parseAnnouncementTags(rawText, knownUsernamesLower);
      if (!cleanText) {
        alert("Isi pengumuman kosong setelah tag @ dihapus -- tulis pesannya juga, bukan cuma tag.");
        return;
      }
      const btn = composeWrap.querySelector("#announcementComposeBtn");
      btn.disabled = true;
      btn.textContent = editingId ? "Menyimpan…" : "Mengirim…";
      const ok = editingId
        ? await Sync.updateAnnouncement(currentUser, editingId, cleanText, activeFrom, activeUntil, status, visibleTo)
        : await Sync.pushAnnouncement(currentUser, cleanText, activeFrom, activeUntil, status, visibleTo);
      btn.disabled = false;
      btn.textContent = editingId ? "Simpan Perubahan" : "Kirim Pengumuman";
      if (ok) {
        exitEditMode();
        showAnnouncementPanel();
      } else {
        alert(editingId ? "Gagal menyimpan perubahan. Pastikan Apps Script sudah dikonfigurasi." : "Gagal mengirim pengumuman. Pastikan Apps Script sudah dikonfigurasi.");
      }
    });
  }

  // Pengguna biasa (bukan administrator) hanya boleh melihat pengumuman
  // yang SEDANG BERLAKU (live) DAN memang ditujukan untuknya (tag @username/
  // @all, lihat announcementShouldShow()) -- draft, yang belum/sudah lewat
  // tanggal, dan yang ditujukan untuk orang lain semuanya disembunyikan
  // total supaya tidak membingungkan. Administrator melihat SEMUANYA
  // (termasuk draft, terjadwal, & yang ditujukan ke orang lain) supaya bisa
  // mengelola dari satu tempat.
  const visibleList = isAdministrator() ? list : list.filter(announcementShouldShow);

  const listWrap = document.createElement("div");
  listWrap.className = "announcement-list";
  if (!visibleList.length) {
    listWrap.innerHTML = `<p class="media-empty">Belum ada pengumuman.</p>`;
  }
  visibleList.forEach((a) => {
    const item = document.createElement("div");
    item.className = "announcement-item" + (announcementIsLive(a) ? " is-live" : "");
    const when = a.createdAt ? new Date(a.createdAt).toLocaleString("id-ID") : "";
    const rangeTxt = (a.activeFrom || a.activeUntil)
      ? `📅 ${dateOnlyStr(a.activeFrom) || "…"} s/d ${dateOnlyStr(a.activeUntil) || "…"}`
      : "📅 Tanpa batas tanggal";
    const targetTxt = (!a.visibleTo || a.visibleTo === "all") ? "🌐 Semua pengguna" : `🎯 ${a.visibleTo}`;
    item.innerHTML = `
      <div class="announcement-text"></div>
      <div class="announcement-meta">${a.createdBy || ""}${when ? " · " + when : ""}</div>
      ${isAdministrator() ? `<div class="announcement-meta">${rangeTxt} · ${announcementStatusLabel(a)} · ${targetTxt}</div>` : ""}
    `;
    item.querySelector(".announcement-text").textContent = a.text; // textContent -> aman dari HTML asing
    if (isAdministrator()) {
      const actionsRow = document.createElement("div");
      actionsRow.className = "announcement-item-actions";
      const editBtn = document.createElement("button");
      editBtn.className = "chip-btn small";
      editBtn.textContent = "✏️ Edit";
      editBtn.addEventListener("click", () => {
        if (enterAnnouncementEditMode) enterAnnouncementEditMode(a);
      });
      actionsRow.appendChild(editBtn);
      const delBtn = document.createElement("button");
      delBtn.className = "chip-btn small danger-outline";
      delBtn.textContent = "🗑️ Hapus";
      delBtn.addEventListener("click", async () => {
        if (!confirm("Hapus pengumuman ini?")) return;
        await Sync.deleteAnnouncement(currentUser, a.id);
        showAnnouncementPanel();
      });
      actionsRow.appendChild(delBtn);
      item.appendChild(actionsRow);
    }
    listWrap.appendChild(item);
  });
  container.appendChild(listWrap);
}

// ------------------------------------------------------------
// 8c) CATATAN SAYA — menu tersendiri berisi semua catatan pribadi milik
//     pengguna yang sedang login (data sama seperti yang tersimpan lewat
//     modal klik-ayat, lihat js/notes.js — sekarang ada tempat khusus
//     untuk melihat semuanya sekaligus).
// ------------------------------------------------------------
function showNotesMenuPanel() {
  hideAllPanels();
  el("notesPanel").hidden = false;
  logActivity("Catatan Saya");
  renderNotesMenuPanel();
}

function renderNotesMenuPanel() {
  const container = el("notesPanel");
  container.innerHTML = "";
  const title = document.createElement("h2");
  title.textContent = "🗒️ Catatan Saya";
  container.appendChild(title);

  const notes = loadLocalNotes(currentUser);
  const entries = Object.keys(notes)
    .map((verseId) => ({ verseId, ...notes[verseId], verse: verseById[verseId] || null }))
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

  if (!entries.length) {
    const p = document.createElement("p");
    p.className = "media-empty";
    p.textContent = "Anda belum menulis catatan pribadi apa pun. Klik ayat mana pun saat membaca untuk menulis catatan.";
    container.appendChild(p);
    return;
  }

  const list = document.createElement("div");
  list.className = "notes-menu-list";
  entries.forEach((entryItem) => {
    const row = document.createElement("div");
    row.className = "notes-menu-item";
    const ref = entryItem.verse
      ? `${entryItem.verse.bookName} ${entryItem.verse.chapter}:${entryItem.verse.verse}`
      : entryItem.verseId;
    const when = entryItem.updatedAt ? new Date(entryItem.updatedAt).toLocaleString("id-ID") : "";

    const openBtn = document.createElement("button");
    openBtn.className = "result-item";
    openBtn.innerHTML = `
      <div class="result-ref">${ref}</div>
      <div class="result-text"></div>
      <div class="announcement-meta">${when}</div>
    `;
    openBtn.querySelector(".result-text").textContent = entryItem.note;
    openBtn.addEventListener("click", () => {
      if (entryItem.verse) {
        currentLang = entryItem.verse.lang;
        if (el("langSelect")) el("langSelect").value = entryItem.verse.lang;
        renderChapter(entryItem.verse.bookNumber, entryItem.verse.chapter, entryItem.verse.verse, { openNote: true }); // dari menu "Catatan Saya" -- memang diminta buka catatannya
      }
    });
    row.appendChild(openBtn);
    list.appendChild(row);
  });
  container.appendChild(list);
}

// ------------------------------------------------------------
// 8c-2) KUMPULAN AYAT — sekumpulan ayat pilihan disimpan dengan satu
//     nama (mis. "SPR 17 Agustus 2026"), ditambahkan dari modal catatan
//     (tombol "📚 Simpan ke Kumpulan Ayat"), dibuka lagi dari menu ini.
// ------------------------------------------------------------
// ------------------------------------------------------------
// Dialog kecil generik (pengganti prompt()/confirm() bawaan browser yang
// polos) -- dipakai untuk memilih/menambah Kumpulan Ayat & mengganti
// namanya, supaya kumpulan yang sudah ada bisa langsung DIPILIH dari daftar
// (bukan diketik ulang manual & rawan salah ketik/beda kapital).
// ------------------------------------------------------------
function closeSimpleDialog() {
  const existing = el("simpleDialogOverlay");
  if (existing) existing.remove();
}
// bodyBuilderFn(box) -> harus mengembalikan fungsi getValue() yang dipanggil
// saat tombol konfirmasi ditekan; getValue() mengembalikan null/undefined
// untuk membatalkan penutupan (mis. validasi belum lolos), atau nilai apa
// pun untuk diteruskan ke onConfirm(value).
function showSimpleDialog(title, bodyBuilderFn, onConfirm, confirmLabel) {
  closeSimpleDialog();
  const overlay = document.createElement("div");
  overlay.id = "simpleDialogOverlay";
  overlay.className = "simple-dialog-overlay";
  const box = document.createElement("div");
  box.className = "simple-dialog-box";
  const h = document.createElement("h3");
  h.textContent = title;
  box.appendChild(h);

  const getValue = bodyBuilderFn(box);

  const actions = document.createElement("div");
  actions.className = "simple-dialog-actions";
  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "chip-btn small";
  cancelBtn.textContent = "Batal";
  cancelBtn.addEventListener("click", closeSimpleDialog);
  const okBtn = document.createElement("button");
  okBtn.type = "button";
  okBtn.className = "chip-btn small primary";
  okBtn.textContent = confirmLabel || "Simpan";
  okBtn.addEventListener("click", () => {
    const val = getValue();
    if (val === null || val === undefined) return;
    closeSimpleDialog();
    onConfirm(val);
  });
  actions.appendChild(cancelBtn);
  actions.appendChild(okBtn);
  box.appendChild(actions);

  overlay.appendChild(box);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeSimpleDialog(); });
  document.addEventListener("keydown", function escHandler(e) {
    if (e.key === "Escape") { closeSimpleDialog(); document.removeEventListener("keydown", escHandler); }
  });
  document.body.appendChild(overlay);
  return box;
}

// Dulu pakai prompt() polos (ketik nama, rawan salah ketik/beda kapital
// dari kumpulan yang sudah ada). Sekarang: kumpulan yang sudah ada tampil
// sebagai KUMPULAN YANG BISA DIPILIH (dropdown) -- kalau mau kumpulan lain,
// tinggal pilih dari daftar; kalau memang beda/baru, pilih "Buat kumpulan
// baru…" lalu ketik namanya.
function handleAddToCollection(verse) {
  if (!verse) return;
  const collections = loadCollections(currentUser);
  // Diurutkan TERBARU DI ATAS (pakai updatedAt, jatuh ke createdAt kalau
  // belum pernah diupdate) -- dulu sempat alfabetis nama (localeCompare),
  // makanya "17 agustus" nongol di atas "23 Agustus" walau yang terakhir
  // itu yang lebih baru dipakai/diisi.
  const ids = Object.keys(collections).sort(
    (a, b) => new Date(collections[b].updatedAt || collections[b].createdAt || 0)
      - new Date(collections[a].updatedAt || collections[a].createdAt || 0)
  );

  showSimpleDialog("📚 Simpan ke Kumpulan Ayat", (box) => {
    const field1 = document.createElement("div");
    field1.className = "simple-dialog-field";
    const label1 = document.createElement("label");
    label1.textContent = "Kumpulan ayat:";
    field1.appendChild(label1);
    const select = document.createElement("select");
    ids.forEach((id) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = `${collections[id].name} (${collections[id].verseIds.length} ayat)`;
      select.appendChild(opt);
    });
    const newOpt = document.createElement("option");
    newOpt.value = "__new__";
    newOpt.textContent = "+ Buat kumpulan baru…";
    select.appendChild(newOpt);
    field1.appendChild(select);
    box.appendChild(field1);

    const field2 = document.createElement("div");
    field2.className = "simple-dialog-field";
    const label2 = document.createElement("label");
    label2.textContent = "Nama kumpulan baru:";
    field2.appendChild(label2);
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = 'mis. "SPR 17 Agustus 2026"';
    field2.appendChild(input);
    box.appendChild(field2);

    function syncFieldVisibility() {
      field2.hidden = select.value !== "__new__";
      if (!field2.hidden) input.focus();
    }
    if (!ids.length) select.value = "__new__";
    select.addEventListener("change", syncFieldVisibility);
    syncFieldVisibility();

    return () => {
      if (select.value === "__new__") {
        const name = input.value.trim();
        if (!name) { input.focus(); return null; }
        return name;
      }
      return collections[select.value].name;
    };
  }, (name) => {
    addVerseToCollection(currentUser, name, verse.id);
    logActivity("Simpan ke Kumpulan Ayat");
    alert(`Ayat disimpan ke kumpulan "${name}".`);
  }, "Simpan");
}

// Mengganti nama kumpulan (mis. kalau salah ketik) lewat dialog kecil,
// bukan prompt() polos, supaya nama lama tetap terlihat sebagai isian awal.
function handleRenameCollection(id, col) {
  showSimpleDialog("✏️ Ganti Nama Kumpulan", (box) => {
    const field = document.createElement("div");
    field.className = "simple-dialog-field";
    const label = document.createElement("label");
    label.textContent = "Nama baru:";
    field.appendChild(label);
    const input = document.createElement("input");
    input.type = "text";
    input.value = col.name;
    field.appendChild(input);
    box.appendChild(field);
    setTimeout(() => { input.focus(); input.select(); }, 0);
    return () => {
      const val = input.value.trim();
      return val ? val : null;
    };
  }, (newName) => {
    renameCollection(currentUser, id, newName);
    renderCollectionsPanel(id);
  }, "Ganti Nama");
}

function showCollectionsPanel() {
  hideAllPanels();
  el("collectionsPanel").hidden = false;
  logActivity("Kumpulan Ayat");
  renderCollectionsPanel();
}

function renderCollectionsPanel(openId) {
  const container = el("collectionsPanel");
  container.innerHTML = "";
  const collections = loadCollections(currentUser);

  if (openId && collections[openId]) {
    renderCollectionDetailInto(container, openId, collections[openId]);
    return;
  }

  const title = document.createElement("h2");
  title.textContent = "📚 Kumpulan Ayat Saya";
  container.appendChild(title);

  const ids = Object.keys(collections);
  if (!ids.length) {
    const p = document.createElement("p");
    p.className = "media-empty";
    p.textContent = 'Belum ada kumpulan ayat. Buka catatan pada ayat mana pun (klik ayatnya saat membaca), lalu tekan "📚 Simpan ke Kumpulan Ayat".';
    container.appendChild(p);
    return;
  }

  const list = document.createElement("div");
  list.className = "collections-list";
  ids
    .sort((a, b) => new Date(collections[b].createdAt || 0) - new Date(collections[a].createdAt || 0))
    .forEach((id) => {
      const col = collections[id];
      const row = document.createElement("div");
      row.className = "collection-card";

      const openBtn = document.createElement("button");
      openBtn.className = "collection-card-open";
      openBtn.innerHTML = `<div class="plan-option-title">${escapeHtml(col.name)}</div><div class="plan-option-sub">${col.verseIds.length} ayat</div>`;
      openBtn.addEventListener("click", () => renderCollectionsPanel(id));

      const renameBtn = document.createElement("button");
      renameBtn.className = "icon-btn";
      renameBtn.title = "Ganti nama kumpulan ini";
      renameBtn.textContent = "✏️";
      renameBtn.addEventListener("click", () => handleRenameCollection(id, col));

      const delBtn = document.createElement("button");
      delBtn.className = "icon-btn";
      delBtn.title = "Hapus kumpulan ini";
      delBtn.textContent = "🗑️";
      delBtn.addEventListener("click", () => {
        if (confirm(`Hapus kumpulan "${col.name}"? Tidak bisa dibatalkan.`)) {
          deleteCollection(currentUser, id);
          renderCollectionsPanel();
        }
      });

      row.appendChild(openBtn);
      row.appendChild(renameBtn);
      row.appendChild(delBtn);
      list.appendChild(row);
    });
  container.appendChild(list);
}

function renderCollectionDetailInto(container, id, col) {
  const backBtn = document.createElement("button");
  backBtn.className = "chip-btn";
  backBtn.textContent = "← Semua Kumpulan";
  backBtn.addEventListener("click", () => { stopCollectionVersePlayback(); renderCollectionsPanel(); });
  container.appendChild(backBtn);

  const titleRow = document.createElement("div");
  titleRow.className = "collection-title-row";
  const title = document.createElement("h2");
  title.textContent = "📚 " + col.name;
  titleRow.appendChild(title);
  const titleBtns = document.createElement("div");
  titleBtns.className = "collection-title-row-btns";
  const renameBtn = document.createElement("button");
  renameBtn.className = "chip-btn small";
  renameBtn.textContent = "✏️ Ganti Nama";
  renameBtn.addEventListener("click", () => handleRenameCollection(id, col));
  titleBtns.appendChild(renameBtn);
  // Tombol "Salin Semua" -- 22 Agu 2026, atas permintaan: bentuk kotak
  // (bukan bulat) disamakan dengan tombol 📋 di layar Kidung, yang
  // sengaja diganti dari .round-media-btn ke .square-media-btn (lihat
  // buildKidungCopyButton() di js/kidung.js, dipakai di js/kidung-ui.js)
  // -- itulah "gambar kotak yang cantik" yang dimaksud (kotak bersudut
  // tumpul, border tipis, bayangan halus). Teksnya sendiri dibangun oleh
  // buildCollectionShareText() di js/collections.js (urut ayat 1..N
  // sesuai urutan kumpulan, bukan format kidung). Disembunyikan kalau
  // kumpulannya masih kosong.
  if (col.verseIds.length) {
    const copyAllBtn = document.createElement("button");
    copyAllBtn.type = "button";
    copyAllBtn.className = "square-media-btn collection-copy-btn";
    copyAllBtn.textContent = "📋";
    copyAllBtn.title = "Salin semua ayat di kumpulan ini ke clipboard (urut 1 sampai terakhir)";
    copyAllBtn.setAttribute("aria-label", "Salin semua ayat di kumpulan ini");
    copyAllBtn.addEventListener("click", () => {
      const text = buildCollectionShareText(col);
      if (!text) { alert("Tidak ada ayat yang bisa disalin (mungkin belum ada ayat yang cocok di bahasa saat ini)."); return; }
      copyTextWithFeedback(text, copyAllBtn);
    });
    titleBtns.appendChild(copyAllBtn);
  }
  if (col.verseIds.length) {
    const fsBtn = document.createElement("button");
    fsBtn.className = "chip-btn primary";
    fsBtn.textContent = "⛶ Mode Layar Penuh";
    fsBtn.addEventListener("click", () => openCollectionFullscreen(col, 0));
    titleBtns.appendChild(fsBtn);
  }
  titleRow.appendChild(titleBtns);
  container.appendChild(titleRow);

  // Baris pilihan "Bahasa suara" (Google Voice) khusus panel Kumpulan Ayat --
  // dipakai oleh tombol ▶️ Putar di tiap ayat & di Mode Layar Penuh di bawah.
  // Memakai pengaturan TTS yang SAMA (ttsSettings/pickVoice() dari bagian 13
  // di atas) supaya pilihan suara konsisten dengan menu Pembaca biasa --
  // hanya saja di sini kotak pilihnya ditaruh langsung di panel ini supaya
  // tidak perlu pindah ke menu Pembaca dulu hanya untuk ganti bahasa suara.
  if (col.verseIds.length && ttsSupported) {
    const voiceRow = document.createElement("div");
    voiceRow.className = "collection-voice-row";
    const voiceLabel = document.createElement("label");
    voiceLabel.textContent = "🔊 Bahasa suara: ";
    voiceLabel.htmlFor = "colTtsLangSelect";
    const voiceSel = document.createElement("select");
    voiceSel.id = "colTtsLangSelect";
    voiceSel.className = "columns-lang-select";
    [
      { value: "id-ID", label: "Indonesia" },
      { value: "en-US", label: "Inggris" },
      { value: "zh-CN", label: "Mandarin" },
    ].forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o.value;
      opt.textContent = o.label;
      voiceSel.appendChild(opt);
    });
    voiceSel.value = ttsSettings.lang;
    voiceSel.addEventListener("change", () => {
      ttsSettings.lang = voiceSel.value;
      saveTTSSettings(ttsSettings);
      stopCollectionVersePlayback();
      const readerSel = el("ttsLangSelect");
      if (readerSel) readerSel.value = voiceSel.value; // ikut disamakan di menu Pembaca
    });
    voiceLabel.appendChild(voiceSel);
    voiceRow.appendChild(voiceLabel);
    container.appendChild(voiceRow);
  } else if (col.verseIds.length && !ttsSupported) {
    const warn = document.createElement("p");
    warn.className = "media-empty";
    warn.textContent = "Perangkat/browser ini tidak mendukung pembacaan suara (Google Voice).";
    container.appendChild(warn);
  }

  if (!col.verseIds.length) {
    const p = document.createElement("p");
    p.className = "media-empty";
    p.textContent = "Kumpulan ini masih kosong.";
    container.appendChild(p);
    return;
  }

  const list = document.createElement("div");
  list.className = "collection-verse-list";
  col.verseIds.forEach((verseId, i) => {
    const v = verseById[verseId];
    const noteText = v ? getPersonalNote(currentUser, verseId) : "";
    const ref = v ? `${v.bookName} ${v.chapter}:${v.verse}` : verseId;

    const item = document.createElement("div");
    item.className = "collection-verse-item";
    item.innerHTML = `
      <div class="collection-verse-num">${i + 1}</div>
      <div class="collection-verse-body">
        <div class="result-ref">${escapeHtml(ref)}</div>
        <div class="result-text"></div>
        <div class="collection-verse-actions">
          ${ttsSupported ? '<button type="button" class="chip-btn small col-play-btn">▶️ Putar</button>' : ""}
          <button type="button" class="chip-btn small col-move-up-btn" title="Naikkan urutan">⬆️</button>
          <button type="button" class="chip-btn small col-move-down-btn" title="Turunkan urutan">⬇️</button>
          ${noteText ? '<button type="button" class="chip-btn small col-note-toggle">📝 Lihat Catatan</button>' : ""}
          <button type="button" class="chip-btn small col-open-btn">📖 Buka di Pembaca</button>
          <button type="button" class="chip-btn small danger col-remove-btn">Hapus</button>
        </div>
        ${noteText ? '<div class="collection-verse-note" hidden></div>' : ""}
      </div>
    `;
    item.querySelector(".result-text").textContent = v ? v.text : "(ayat tidak ditemukan di bahasa saat ini)";
    if (noteText) item.querySelector(".collection-verse-note").textContent = noteText;

    const toggleBtn = item.querySelector(".col-note-toggle");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        const noteEl = item.querySelector(".collection-verse-note");
        noteEl.hidden = !noteEl.hidden;
        toggleBtn.textContent = noteEl.hidden ? "📝 Lihat Catatan" : "📝 Sembunyikan Catatan";
      });
    }
    item.querySelector(".col-open-btn").addEventListener("click", () => {
      if (!v) return;
      stopCollectionVersePlayback();
      currentLang = v.lang;
      if (el("langSelect")) el("langSelect").value = v.lang;
      renderChapter(v.bookNumber, v.chapter, v.verse);
    });
    item.querySelector(".col-remove-btn").addEventListener("click", () => {
      removeVerseFromCollection(currentUser, id, verseId);
      renderCollectionsPanel(id);
    });
    const moveUpBtn = item.querySelector(".col-move-up-btn");
    const moveDownBtn = item.querySelector(".col-move-down-btn");
    if (i === 0) moveUpBtn.disabled = true;
    if (i === col.verseIds.length - 1) moveDownBtn.disabled = true;
    moveUpBtn.addEventListener("click", () => {
      if (moveVerseInCollection(currentUser, id, verseId, -1)) renderCollectionsPanel(id);
    });
    moveDownBtn.addEventListener("click", () => {
      if (moveVerseInCollection(currentUser, id, verseId, 1)) renderCollectionsPanel(id);
    });
    const playBtn = item.querySelector(".col-play-btn");
    if (playBtn && v) {
      playBtn.addEventListener("click", () => toggleCollectionVersePlayback(v, playBtn));
    }

    // Tombol BULAT 🎵MP3/🎬MP4/▶️YouTube (kalau kitab+pasal ayat ini ada di
    // salah satu sheet Bacaan Bersuara) -- dicari di latar belakang supaya
    // daftar kumpulan tetap tampil instan, tombolnya menyusul begitu
    // ketemu. Lihat findMediaLinkForReference()/buildInlineMediaBlock() di
    // js/media.js -- pemutarnya muncul LANGSUNG di sini, bukan tab baru.
    if (v && typeof findMediaLinkForReference === "function") {
      findMediaLinkForReference(v.bookNumber, v.chapter, v.lang).then((media) => {
        if (!media || (!media.mp3 && !media.mp4 && !media.youtube)) return;
        const actions = item.querySelector(".collection-verse-actions");
        if (!actions) return;
        actions.appendChild(buildInlineMediaBlock(media, `${v.bookName} ${v.chapter}:${v.verse}`));
      }).catch(() => {});
    }

    list.appendChild(item);
  });
  container.appendChild(list);
}

// ------------------------------------------------------------
// 8c-3) MODE LAYAR PENUH — KUMPULAN AYAT
//     Membuka satu ayat per layar (besar & fokus), dengan:
//       - tombol A+/A- sendiri (tidak ikut ukuran huruf pembaca biasa,
//         supaya bisa dibuat jauh lebih besar khusus di sini)
//       - navigasi panah ⬅️➡️ di layar, ATAU tombol panah kiri/kanan
//         di papan ketik (keyboard) untuk pindah ke ayat berikutnya/
//         sebelumnya di kumpulan yang sama
//       - catatan pribadi (kalau ada) ikut ditampilkan di bawah ayatnya
// ------------------------------------------------------------
const COLLECTION_FS_FONT_KEY = "bible_app_collection_fs_font_v1";
const COLLECTION_FS_FONT_MIN = 16;
const COLLECTION_FS_FONT_MAX = 96;
const COLLECTION_FS_FONT_STEP = 4;
const COLLECTION_FS_FONT_DEFAULT = 32;
// Lebar mode layar penuh: "narrow" (lebar HP, teks di tengah, nyaman
// dibaca) atau "wide" (memakai lebar penuh layar komputer). Tersimpan
// supaya pilihan terakhir tetap dipakai lain kali dibuka.
const COLLECTION_FS_WIDTH_KEY = "bible_app_collection_fs_width_v1";
// Jenis huruf khusus mode layar penuh Kumpulan Ayat -- terpisah dari jenis
// huruf pembaca biasa (FONT_FAMILIES di bagian 11), supaya bisa diganti
// bebas di sini tanpa mengubah tampilan baca pasal biasa.
const COLLECTION_FS_FONT_FAMILY_KEY = "bible_app_collection_fs_font_family_v1";

function openCollectionFullscreen(col, startIndex) {
  let overlay = el("collectionFsOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "collectionFsOverlay";
    overlay.className = "collection-fs-overlay";
    document.body.appendChild(overlay);
  }

  let idx = startIndex || 0;
  const total = col.verseIds.length;

  function currentFontSize() {
    return parseInt(localStorage.getItem(COLLECTION_FS_FONT_KEY), 10) || COLLECTION_FS_FONT_DEFAULT;
  }

  function setFontSize(px) {
    const clamped = Math.max(COLLECTION_FS_FONT_MIN, Math.min(COLLECTION_FS_FONT_MAX, px));
    localStorage.setItem(COLLECTION_FS_FONT_KEY, String(clamped));
    const textEl = overlay.querySelector(".collection-fs-text");
    if (textEl) textEl.style.fontSize = clamped + "px";
  }

  function currentWidthMode() {
    return localStorage.getItem(COLLECTION_FS_WIDTH_KEY) === "wide" ? "wide" : "narrow";
  }
  function setWidthMode(mode) {
    localStorage.setItem(COLLECTION_FS_WIDTH_KEY, mode);
    overlay.classList.toggle("fs-wide", mode === "wide");
    if (widthBtnRef) {
      widthBtnRef.textContent = mode === "wide" ? "📱 Lebar HP" : "🖥️ Lebar Komputer";
      widthBtnRef.title = mode === "wide" ? "Pakai lebar sempit (ala HP)" : "Pakai lebar penuh layar komputer";
    }
  }
  let widthBtnRef = null;

  function currentFontFamily() {
    const id = localStorage.getItem(COLLECTION_FS_FONT_FAMILY_KEY) || "default";
    return FONT_FAMILIES.find((f) => f.id === id) || FONT_FAMILIES[0];
  }
  function setFontFamily(id) {
    localStorage.setItem(COLLECTION_FS_FONT_FAMILY_KEY, id);
    const f = FONT_FAMILIES.find((x) => x.id === id) || FONT_FAMILIES[0];
    const textEl = overlay.querySelector(".collection-fs-text");
    if (textEl) { textEl.style.fontFamily = f.body; textEl.style.fontWeight = f.weight; }
  }

  function render() {
    overlay.innerHTML = "";
    overlay.classList.toggle("fs-wide", currentWidthMode() === "wide");
    const verseId = col.verseIds[idx];
    const v = verseById[verseId];
    const noteText = v ? getPersonalNote(currentUser, verseId) : "";
    const ref = v ? `${v.bookName} ${v.chapter}:${v.verse}` : verseId;

    const closeBtn = document.createElement("button");
    closeBtn.className = "collection-fs-close";
    closeBtn.textContent = "✕ Tutup";
    closeBtn.addEventListener("click", closeOverlay);
    overlay.appendChild(closeBtn);

    const fontRow = document.createElement("div");
    fontRow.className = "collection-fs-font-row";
    const minusBtn = document.createElement("button");
    minusBtn.className = "chip-btn small";
    minusBtn.textContent = "A-";
    minusBtn.addEventListener("click", () => setFontSize(currentFontSize() - COLLECTION_FS_FONT_STEP));
    const plusBtn = document.createElement("button");
    plusBtn.className = "chip-btn small";
    plusBtn.textContent = "A+";
    plusBtn.addEventListener("click", () => setFontSize(currentFontSize() + COLLECTION_FS_FONT_STEP));
    fontRow.appendChild(minusBtn);
    fontRow.appendChild(plusBtn);

    // Toggle lebar layar penuh: lebar HP (sempit, di tengah) <-> lebar
    // penuh layar komputer -- supaya di komputer tidak lagi terlihat
    // sempit/tidak maksimal.
    const widthBtn = document.createElement("button");
    widthBtn.className = "chip-btn small";
    widthBtnRef = widthBtn;
    widthBtn.addEventListener("click", () => setWidthMode(currentWidthMode() === "wide" ? "narrow" : "wide"));
    setWidthMode(currentWidthMode());
    fontRow.appendChild(widthBtn);

    // Ganti jenis huruf khusus tampilan ini.
    const fontSel = document.createElement("select");
    fontSel.className = "columns-lang-select collection-fs-font-select";
    fontSel.title = "Ganti jenis huruf";
    FONT_FAMILIES.forEach((f) => {
      const opt = document.createElement("option");
      opt.value = f.id;
      opt.textContent = f.name;
      fontSel.appendChild(opt);
    });
    fontSel.value = currentFontFamily().id;
    fontSel.addEventListener("change", () => setFontFamily(fontSel.value));
    fontRow.appendChild(fontSel);

    overlay.appendChild(fontRow);

    const box = document.createElement("div");
    box.className = "collection-fs-box";

    const refEl = document.createElement("div");
    refEl.className = "collection-fs-ref";
    refEl.textContent = `${ref}  ·  ${idx + 1} / ${total}`;
    box.appendChild(refEl);

    if (v && ttsSupported) {
      const fsPlayBtn = document.createElement("button");
      fsPlayBtn.type = "button";
      fsPlayBtn.className = "chip-btn small col-play-btn";
      fsPlayBtn.textContent = "▶️ Putar";
      fsPlayBtn.addEventListener("click", () => toggleCollectionVersePlayback(v, fsPlayBtn));
      box.appendChild(fsPlayBtn);
    }

    const textEl = document.createElement("div");
    textEl.className = "collection-fs-text";
    textEl.style.fontSize = currentFontSize() + "px";
    textEl.style.fontFamily = currentFontFamily().body;
    textEl.style.fontWeight = currentFontFamily().weight;
    textEl.textContent = v ? v.text : "(ayat tidak ditemukan di bahasa saat ini)";
    box.appendChild(textEl);

    if (noteText) {
      const noteEl = document.createElement("div");
      noteEl.className = "collection-fs-note";
      noteEl.innerHTML = `<div class="collection-fs-note-label">📝 Catatan Anda</div>`;
      const noteBody = document.createElement("div");
      noteBody.textContent = noteText;
      noteEl.appendChild(noteBody);
      box.appendChild(noteEl);
    }
    overlay.appendChild(box);

    const navRow = document.createElement("div");
    navRow.className = "collection-fs-nav";
    const prevBtn = document.createElement("button");
    prevBtn.className = "chip-btn primary";
    prevBtn.textContent = "⬅️ Sebelumnya";
    prevBtn.disabled = idx <= 0;
    prevBtn.addEventListener("click", goPrev);
    const nextBtn = document.createElement("button");
    nextBtn.className = "chip-btn primary";
    nextBtn.textContent = "Selanjutnya ➡️";
    nextBtn.disabled = idx >= total - 1;
    nextBtn.addEventListener("click", goNext);
    navRow.appendChild(prevBtn);
    navRow.appendChild(nextBtn);
    overlay.appendChild(navRow);

    const hint = document.createElement("div");
    hint.className = "collection-fs-hint";
    hint.textContent = "Gunakan tombol panah kiri/kanan (atau Page Up/Down, atas/bawah, spasi) di papan ketik / alat pointer presentasi untuk pindah ayat.";
    overlay.appendChild(hint);
  }

  function goPrev() {
    if (idx > 0) { stopCollectionVersePlayback(); idx -= 1; render(); }
  }
  function goNext() {
    if (idx < total - 1) { stopCollectionVersePlayback(); idx += 1; render(); }
  }
  function onKeyDown(e) {
    // Tombol panah kiri/kanan SELALU aktif -- ini juga yang dipakai oleh
    // kebanyakan "clicker"/pointer presentasi nirkabel (mis. Logitech dkk),
    // karena alat itu meniru tombol panah kiri/kanan di papan ketik.
    if (e.key === "ArrowLeft") { goPrev(); return; }
    if (e.key === "ArrowRight") { goNext(); return; }
    if (e.key === "Escape") { closeOverlay(); return; }

    // Sebagian clicker/pointer lain meniru Page Up/Page Down, atau panah
    // atas/bawah, atau tombol spasi, alih-alih panah kiri/kanan -- jadi
    // semuanya didukung juga di sini supaya cocok dengan berbagai merek.
    // Dikecualikan kalau fokus sedang di kotak pilih/input (mis. jenis
    // huruf) supaya tidak mengganggu penggunaan normal kotak itu.
    const tag = (document.activeElement && document.activeElement.tagName) || "";
    if (tag === "SELECT" || tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.key === "PageDown" || e.key === "ArrowDown" || e.key === " ") { e.preventDefault(); goNext(); }
    else if (e.key === "PageUp" || e.key === "ArrowUp") { e.preventDefault(); goPrev(); }
  }
  function closeOverlay() {
    stopCollectionVersePlayback();
    overlay.hidden = true;
    overlay.innerHTML = "";
    document.removeEventListener("keydown", onKeyDown);
  }

  document.addEventListener("keydown", onKeyDown);
  overlay.hidden = false;
  render();
}
//     (menu yang dibuka, pencarian, tanggal/jam, OS, IP) yang sudah
//     dikumpulkan js/activitylog.js, dengan filter & tombol simpan (CSV).
// ------------------------------------------------------------
function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function saveLogAsCsv(rows) {
  if (!rows || !rows.length) {
    alert("Tidak ada data log untuk disimpan.");
    return;
  }
  const header = ["Username", "Tanggal", "Jam", "OS", "IP", "Kota", "Negara", "Menu", "Pencarian"];
  const escCsv = (v) => {
    const s = String(v == null ? "" : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [header.join(",")].concat(
    rows.map((l) => [l.username, cleanLogDateTimeStr(l.date), cleanLogDateTimeStr(l.time), l.os, l.ip, l.city, l.country, l.menu, l.search].map(escCsv).join(","))
  );
  const csv = lines.join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }); // BOM supaya Excel baca UTF-8 dgn benar
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `log-aktivitas-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// state filter + urutan panel log disimpan di luar fungsi supaya tetap
// diingat selama sesi ini kalau panel dibuka-tutup berkali-kali.
// sortField: "updatedAt" (jam server, paling akurat untuk urutan waktu
// asli) / "username" / "city" / "country" / "menu". sortDir: "asc"/"desc".
// Defaultnya "updatedAt" + "desc" supaya YANG PALING BARU tampil PALING
// ATAS begitu panel dibuka -- lihat _sortLogRows_() di bawah.
const _logPanelState = {
  days: "30", userFilter: "", textFilter: "", timeFilter: "",
  sortField: "updatedAt", sortDir: "desc", rows: [],
};

// Kolom tabel yang boleh diklik header-nya untuk diurutkan, beserta label
// tampilan (dipakai baik untuk <th> maupun tanda panah ▲▼ urutan aktif).
const LOG_TABLE_COLUMNS = [
  { field: "updatedAt", label: "Tanggal" },
  { field: "updatedAt", label: "Jam" }, // sengaja field sama dgn Tanggal: satu-satunya sumber waktu yang akurat urutannya adalah jam server (updatedAt), bukan teks lokal "Tanggal"/"Jam" terpisah yang formatnya bisa beda antar HP.
  { field: "username", label: "Pengguna" },
  { field: "os", label: "OS" },
  { field: "ip", label: "IP" },
  { field: "city", label: "Kota" },
  { field: "country", label: "Negara" },
  { field: "menu", label: "Menu" },
  { field: "search", label: "Pencarian" },
];

function _sortLogRows_(rows, field, dir) {
  const sorted = rows.slice();
  sorted.sort((a, b) => {
    let av, bv;
    if (field === "updatedAt") {
      av = new Date(a.updatedAt).getTime() || 0;
      bv = new Date(b.updatedAt).getTime() || 0;
    } else {
      av = String(a[field] || "").toLowerCase();
      bv = String(b[field] || "").toLowerCase();
    }
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return dir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

async function showLogPanel() {
  hideAllPanels();
  el("logPanel").hidden = false;
  logActivity("Log Aktivitas (Admin)");
  await loadAndRenderLogPanel();
}

async function loadAndRenderLogPanel(daysOverride) {
  const container = el("logPanel");
  container.innerHTML = "";
  const title = document.createElement("h2");
  title.textContent = "📊 Log Aktivitas";
  container.appendChild(title);

  // Menu ini HANYA untuk level administrator -- termasuk kolom Kota/Negara
  // dari IP di dalamnya, jadi tidak perlu pengecekan level terpisah lagi
  // untuk kolom itu; seluruh panel ini memang sudah dikunci di sini.
  if (!isAdministrator()) {
    const p = document.createElement("p");
    p.className = "media-empty";
    p.textContent = "Menu ini hanya untuk administrator.";
    container.appendChild(p);
    return;
  }
  if (!Sync.enabled()) {
    const p = document.createElement("p");
    p.className = "media-empty";
    p.textContent = "Sinkronisasi (Apps Script) belum dikonfigurasi, jadi log belum bisa diambil.";
    container.appendChild(p);
    return;
  }

  if (daysOverride !== undefined) _logPanelState.days = daysOverride;

  const controls = document.createElement("div");
  controls.className = "log-controls";
  controls.innerHTML = `
    <label>Rentang:
      <select id="logDaysSelect">
        <option value="1">Hari ini</option>
        <option value="7">7 hari terakhir</option>
        <option value="30">30 hari terakhir</option>
        <option value="90">90 hari terakhir</option>
        <option value="0">Semua</option>
      </select>
    </label>
    <label>Pengguna: <input type="text" id="logUserFilter" placeholder="mis. budi" /></label>
    <label>Cari menu/kata: <input type="text" id="logTextFilter" placeholder="mis. Kejadian, Pengumuman" /></label>
    <label>Cari waktu: <input type="text" id="logTimeFilter" placeholder="mis. 14/08/2026 atau 09:" /></label>
    <button id="logApplyBtn" class="chip-btn primary" type="button">Terapkan</button>
    <button id="logSaveBtn" class="chip-btn" type="button">💾 Simpan sebagai CSV</button>
  `;
  container.appendChild(controls);
  controls.querySelector("#logDaysSelect").value = _logPanelState.days;
  controls.querySelector("#logUserFilter").value = _logPanelState.userFilter;
  controls.querySelector("#logTextFilter").value = _logPanelState.textFilter;
  controls.querySelector("#logTimeFilter").value = _logPanelState.timeFilter;

  const tableWrap = document.createElement("div");
  tableWrap.className = "log-table-wrap";
  tableWrap.innerHTML = `<p class="media-empty">Memuat log…</p>`;
  container.appendChild(tableWrap);

  controls.querySelector("#logApplyBtn").addEventListener("click", () => {
    _logPanelState.userFilter = controls.querySelector("#logUserFilter").value.trim().toLowerCase();
    _logPanelState.textFilter = controls.querySelector("#logTextFilter").value.trim().toLowerCase();
    _logPanelState.timeFilter = controls.querySelector("#logTimeFilter").value.trim().toLowerCase();
    loadAndRenderLogPanel(controls.querySelector("#logDaysSelect").value);
  });
  controls.querySelector("#logSaveBtn").addEventListener("click", () => saveLogAsCsv(_logPanelState.rows));

  const daysNum = Number(_logPanelState.days) || 0;
  const logs = await Sync.pullLogs(currentUser, daysNum); // sudah terurut TERBARU DULU dari server (lihat readLogs_ di Code.gs)
  let filtered = logs;
  if (_logPanelState.userFilter) {
    filtered = filtered.filter((l) => (l.username || "").toLowerCase().indexOf(_logPanelState.userFilter) !== -1);
  }
  if (_logPanelState.textFilter) {
    filtered = filtered.filter((l) =>
      (String(l.menu || "") + " " + String(l.search || "")).toLowerCase().indexOf(_logPanelState.textFilter) !== -1
    );
  }
  if (_logPanelState.timeFilter) {
    filtered = filtered.filter((l) =>
      (String(l.date || "") + " " + String(l.time || "")).toLowerCase().indexOf(_logPanelState.timeFilter) !== -1
    );
  }
  _logPanelState.rows = filtered;

  renderLogTable(tableWrap);
}

// Menggambar ULANG tabel log dari _logPanelState.rows (yang sudah difilter),
// diurutkan sesuai _logPanelState.sortField/sortDir -- dipanggil ulang saat
// header kolom diklik (TANPA perlu memanggil server lagi, cukup urut ulang
// di browser supaya terasa instan).
function renderLogTable(tableWrap) {
  const filtered = _logPanelState.rows;
  tableWrap.innerHTML = "";
  const count = document.createElement("p");
  count.className = "log-count";
  count.textContent = `${filtered.length.toLocaleString("id-ID")} baris log ditemukan (jumlah persis sesuai filter di atas).`;
  tableWrap.appendChild(count);

  if (!filtered.length) {
    const p = document.createElement("p");
    p.className = "media-empty";
    p.textContent = "Tidak ada log yang cocok.";
    tableWrap.appendChild(p);
    return;
  }

  const sorted = _sortLogRows_(filtered, _logPanelState.sortField, _logPanelState.sortDir);
  const shown = sorted.slice(0, 500);

  const table = document.createElement("table");
  table.className = "log-table";
  const theadHtml =
    "<thead><tr>" +
    LOG_TABLE_COLUMNS.map((c) => {
      const isActive = c.field === _logPanelState.sortField;
      const arrow = isActive ? (_logPanelState.sortDir === "asc" ? " ▲" : " ▼") : "";
      return `<th class="log-sortable-th${isActive ? " is-sorted" : ""}" data-field="${c.field}">${escapeHtml(c.label)}${arrow}</th>`;
    }).join("") +
    "</tr></thead>";
  table.innerHTML =
    theadHtml +
    "<tbody>" +
    shown.map((l) => `
      <tr>
        <td>${escapeHtml(cleanLogDateTimeStr(l.date))}</td>
        <td>${escapeHtml(cleanLogDateTimeStr(l.time))}</td>
        <td>${escapeHtml(l.username)}</td>
        <td>${escapeHtml(l.os)}</td>
        <td>${escapeHtml(l.ip)}</td>
        <td>${escapeHtml(l.city)}</td>
        <td>${escapeHtml(l.country)}</td>
        <td>${escapeHtml(l.menu)}</td>
        <td>${escapeHtml(l.search)}</td>
      </tr>`).join("") +
    "</tbody>";
  tableWrap.appendChild(table);

  // Klik header kolom -> urutkan berdasar kolom itu (klik lagi kolom yang
  // sama untuk membalik arah naik/turun), lalu gambar ulang tabelnya saja.
  table.querySelectorAll(".log-sortable-th").forEach((th) => {
    th.addEventListener("click", () => {
      const field = th.getAttribute("data-field");
      if (_logPanelState.sortField === field) {
        _logPanelState.sortDir = _logPanelState.sortDir === "asc" ? "desc" : "asc";
      } else {
        _logPanelState.sortField = field;
        // Waktu: default TERBARU dulu (desc). Kolom teks lain: default A-Z (asc).
        _logPanelState.sortDir = field === "updatedAt" ? "desc" : "asc";
      }
      renderLogTable(tableWrap);
    });
  });

  if (filtered.length > shown.length) {
    const note = document.createElement("p");
    note.className = "media-empty";
    const sortedCol = LOG_TABLE_COLUMNS.find((c) => c.field === _logPanelState.sortField);
    note.textContent = `Menampilkan ${shown.length} baris (urutan "${sortedCol ? sortedCol.label : ""}") dari ${filtered.length}. Persempit dengan filter di atas, atau tekan "💾 Simpan sebagai CSV" untuk mendapat semuanya.`;
    tableWrap.appendChild(note);
  }
}

// ------------------------------------------------------------
// 8e) PANTAU PEMBACAAN (7 HARI) — untuk level administrator, penatua,
//     gembala distrik, gembala, pra gembala, inti (bukan Kaum Saleh).
//     Aturan bertingkat siapa-boleh-lihat-siapa memakai canViewLevel()
//     dari js/levels.js. "Sudah membaca" dihitung dari log yang menunya
//     diawali "Baca: " (dicatat tiap kali membuka satu pasal).
//
//     "Domba-domba pilihan": tiap pemantau (administrator/gembala dst.)
//     bisa memilih SEBAGIAN SAJA dari orang yang boleh ia pantau untuk
//     dijadikan daftar pendek yang lebih rapi (mis. gembala distrik yang
//     hanya mau fokus ke jemaat wilayahnya sendiri). Ini murni penyaring
//     TAMPILAN di atas hak akses yang sudah ada -- tidak pernah menambah
//     orang yang boleh dilihat di luar aturan canViewLevel().
// ------------------------------------------------------------
async function getMonitorableUsers() {
  const users = await LocalDB.getAllUsers();
  return users
    .filter((u) => u.username === currentUser || canViewLevel(currentUserLevels, u.levels))
    .sort((a, b) => (a.displayName || a.username).localeCompare(b.displayName || b.username, "id"));
}

// ------------------------------------------------------------
//  KUNCI TANGGAL KANONIS (dateKey) -- PERBAIKAN BUG "hasil pembacaan
//  tidak tampil di level atas".
//
//  Sebelumnya, hari dicocokkan dengan MEMBANDINGKAN TEKS hasil
//  `date.toLocaleDateString("id-ID")` antara log yang tersimpan (ditulis
//  dari HP/komputer orang yang membaca) dan tanggal yang dihitung ulang
//  di layar orang yang memantau. Masalahnya: format tanggal locale
//  "id-ID" TIDAK dijamin identik di semua browser/OS (mis. sebagian
//  Safari/iPhone bisa menulis "14/08/2026" sementara Chrome/Android
//  menulis "14/8/2026" -- beda satu karakter "0" saja sudah membuat
//  perbandingan teks gagal cocok), sehingga baris yang sebenarnya ADA
//  di data server jadi terlihat "belum membaca" (X) di panel pemantauan.
//
//  Perbaikannya: turunkan kunci tanggal SELALU dari `updatedAt` (jam
//  server, format ISO -- sudah pasti sama persis di semua perangkat),
//  lalu format ulang jadi "YYYY-MM-DD" dengan zona waktu TETAP
//  Asia/Jakarta (WIB) untuk SEMUA orang, siapa pun yang memantau atau
//  yang dipantau -- supaya satu hari kalender selalu berarti hari yang
//  sama untuk semua orang, tidak tergantung locale/zona waktu perangkat
//  masing-masing.
// ------------------------------------------------------------
function dateKeyFromDate(d) {
  try {
    // "en-CA" kebetulan format bawaannya persis YYYY-MM-DD -- dipakai
    // murni sebagai trik format, BUKAN berarti tanggalnya "orang Kanada".
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(d);
  } catch (e) {
    // Fallback kalau timeZone Asia/Jakarta entah kenapa tidak didukung
    // (sangat jarang) -- lebih baik tetap jalan pakai waktu lokal
    // perangkat daripada gagal total.
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }
}
function dateKeyFromLog(l) {
  const d = new Date(l.updatedAt);
  return isNaN(d.getTime()) ? null : dateKeyFromDate(d);
}
function dateKeyLabel(key) {
  // key = "YYYY-MM-DD" -> label ramah dibaca, mis. "Kam, 14 Agu"
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 12); // jam 12 siang supaya aman dari pergeseran zona waktu lokal browser saat format label
  return dt.toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short" });
}
// Menghasilkan 7 dateKey berturutan untuk satu jendela minggu, MUNDUR
// dari hari ini. weekOffset 0 = 7 hari terakhir (termasuk hari ini),
// weekOffset 1 = 7 hari sebelum itu, dst -- tidak terbatas ("unlimited"
// mundur ke belakang, sesuai permintaan tombol "berikutnya").
function monitorWindowDateKeys(weekOffset) {
  const todayKey = dateKeyFromDate(new Date());
  const [ty, tm, td] = todayKey.split("-").map(Number);
  const todayNoon = new Date(ty, tm - 1, td, 12);
  const keys = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(todayNoon);
    d.setDate(d.getDate() - (weekOffset * 7 + i));
    keys.push(dateKeyFromDate(d));
  }
  return keys; // urut dari HARI PALING BARU ke paling lama di jendela ini
}

function monitorPinsKey() {
  return "bible_app_monitor_pins_v1_" + (currentUser || "guest");
}
function loadMonitorPins() {
  try {
    return JSON.parse(localStorage.getItem(monitorPinsKey()) || "[]");
  } catch (e) {
    return [];
  }
}
function saveMonitorPins(usernames) {
  localStorage.setItem(monitorPinsKey(), JSON.stringify(usernames));
}

async function showMonitorPanel() {
  hideAllPanels();
  el("monitorPanel").hidden = false;
  logActivity("Pantau Pembacaan");
  await renderMonitorPanel();
}

// Format detik jadi teks ramah dibaca dalam JAM, MENIT, dan DETIK, mis.
// 3725 -> "1 jam 2 menit 5 detik", 125 -> "2 menit 5 detik", 40 -> "40
// detik". Dipakai untuk kolom "Total Waktu" (selisih jam akhir - jam awal
// baca pada hari itu) di panel Pantau Pembacaan.
function formatDurationSeconds(totalSec) {
  if (!totalSec || totalSec <= 0) return "-";
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.round(totalSec % 60);
  if (h > 0) {
    return `${h} jam${m ? " " + m + " menit" : ""}${s ? " " + s + " detik" : ""}`;
  }
  if (m > 0) {
    return `${m} menit${s ? " " + s + " detik" : ""}`;
  }
  return `${s} detik`;
}

// Menyusun ringkasan pembacaan (per tanggal dalam jendela minggu yang
// diminta) dari daftar log mentah SATU orang. Dipakai baik oleh tabel
// Ringkasan (hanya butuh V/X) maupun tabel Detail (butuh jam+durasi juga).
function buildReadRowsForUser(logsForUser, dateKeys) {
  return dateKeys.map((key) => {
    const entries = logsForUser.filter((l) => dateKeyFromLog(l) === key);
    if (!entries.length) return { key, read: false, start: "-", end: "-", count: 0, durationSec: 0 };
    const times = entries
      .map((e) => new Date(e.updatedAt))
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a - b);
    const fmt = (d) => d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const durationSec = times.length > 1 ? (times[times.length - 1] - times[0]) / 1000 : 0;
    return {
      key,
      read: true,
      start: times.length ? fmt(times[0]) : "-",
      end: times.length ? fmt(times[times.length - 1]) : "-",
      count: entries.length,
      durationSec,
    };
  });
}

// Judul jendela minggu yang sedang ditampilkan, mis. "8 Agu - 14 Agu 2026".
function monitorWindowTitle(dateKeys) {
  // dateKeys[0] = paling baru, dateKeys[6] = paling lama di jendela ini.
  const oldest = dateKeys[dateKeys.length - 1];
  const newest = dateKeys[0];
  const label = (key) => {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d, 12).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  };
  return `${label(oldest)} – ${label(newest)}`;
}

// state jendela minggu & mode tampilan diingat di luar fungsi supaya tetap
// sama selama panel dibuka-tutup/ganti orang (tidak balik ke minggu ini
// terus tiap kali ganti dropdown).
const _monitorState = { weekOffset: 0, view: "summary" };

async function showMonitorPanel() {
  hideAllPanels();
  el("monitorPanel").hidden = false;
  logActivity("Pantau Pembacaan");
  await renderMonitorPanel();
}

async function renderMonitorPanel(selectedUsername, showPinEditor) {
  const container = el("monitorPanel");
  container.innerHTML = "";
  const title = document.createElement("h2");
  title.textContent = "👀 Pantau Pembacaan Alkitab";
  container.appendChild(title);

  if (!hasAnyLevel()) {
    const p = document.createElement("p");
    p.className = "media-empty";
    p.textContent = "Menu ini hanya untuk level administrator/penatua/gembala distrik/gembala/pra gembala/inti.";
    container.appendChild(p);
    return;
  }
  if (!Sync.enabled()) {
    const p = document.createElement("p");
    p.className = "media-empty";
    p.textContent = "Sinkronisasi (Apps Script) belum dikonfigurasi, jadi data pembacaan belum bisa diambil.";
    container.appendChild(p);
    return;
  }

  const allUsers = await getMonitorableUsers();
  if (!allUsers.length) {
    const p = document.createElement("p");
    p.className = "media-empty";
    p.textContent = "Tidak ada pengguna yang bisa dipantau dari akun Anda.";
    container.appendChild(p);
    return;
  }

  const pins = loadMonitorPins().filter((u) => allUsers.some((au) => au.username === u));
  const pinEditorWrap = document.createElement("div");
  pinEditorWrap.className = "monitor-pin-editor";
  const pinToggleBtn = document.createElement("button");
  pinToggleBtn.className = "chip-btn small";
  pinToggleBtn.type = "button";
  pinToggleBtn.textContent = showPinEditor ? "✓ Selesai Memilih" : "⭐ Pilih Domba-domba yang Dipantau";
  pinToggleBtn.addEventListener("click", () => renderMonitorPanel(selectedUsername, !showPinEditor));
  container.appendChild(pinToggleBtn);

  if (showPinEditor) {
    pinEditorWrap.innerHTML = `<p class="media-empty">Centang siapa saja yang mau dijadikan daftar pendek pantauan Anda. Kosongkan semua centang untuk kembali menampilkan SEMUA orang yang boleh Anda pantau.</p>`;
    allUsers.forEach((u) => {
      if (u.username === currentUser) return;
      const row = document.createElement("label");
      row.className = "monitor-pin-row";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = pins.includes(u.username);
      cb.addEventListener("change", () => {
        let next = loadMonitorPins();
        if (cb.checked) {
          if (!next.includes(u.username)) next.push(u.username);
        } else {
          next = next.filter((x) => x !== u.username);
        }
        saveMonitorPins(next);
      });
      const lvl = (u.levels && u.levels.length) ? u.levels.map(levelLabel).join(", ") : (CONFIG.NO_LEVEL_LABEL || "Kaum Saleh");
      row.appendChild(cb);
      row.appendChild(document.createTextNode(` ${u.displayName || u.username} — ${lvl}`));
      pinEditorWrap.appendChild(row);
    });
    container.appendChild(pinEditorWrap);
  }

  // Daftar "domba" yang ditampilkan: daftar pilihan (kalau ada isinya),
  // atau semua orang yang boleh dipantau kalau belum memilih.
  const users = pins.length ? allUsers.filter((u) => pins.includes(u.username) || u.username === currentUser) : allUsers;

  // ---------------- Tab Ringkasan / Detail ----------------
  const viewTabs = document.createElement("div");
  viewTabs.className = "monitor-view-tabs";
  const summaryTabBtn = document.createElement("button");
  summaryTabBtn.type = "button";
  summaryTabBtn.className = "chip-btn small" + (_monitorState.view === "summary" ? " active" : "");
  summaryTabBtn.textContent = "📋 Ringkasan (Semua Domba)";
  summaryTabBtn.addEventListener("click", () => { _monitorState.view = "summary"; renderMonitorPanel(selectedUsername, showPinEditor); });
  const detailTabBtn = document.createElement("button");
  detailTabBtn.type = "button";
  detailTabBtn.className = "chip-btn small" + (_monitorState.view === "detail" ? " active" : "");
  detailTabBtn.textContent = "🔍 Detail 1 Orang";
  detailTabBtn.addEventListener("click", () => { _monitorState.view = "detail"; renderMonitorPanel(selectedUsername, showPinEditor); });
  viewTabs.appendChild(summaryTabBtn);
  viewTabs.appendChild(detailTabBtn);
  container.appendChild(viewTabs);

  // ---------------- Navigasi jendela minggu (mundur/maju, tanpa batas) ----------------
  const dateKeys = monitorWindowDateKeys(_monitorState.weekOffset);
  const nav = document.createElement("div");
  nav.className = "monitor-week-nav";
  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "chip-btn small";
  prevBtn.textContent = "◀ 7 Hari Sebelumnya";
  prevBtn.title = "Lihat 7 hari lebih lama lagi ke belakang";
  prevBtn.addEventListener("click", () => { _monitorState.weekOffset += 1; renderMonitorPanel(selectedUsername, showPinEditor); });
  const windowLabel = document.createElement("span");
  windowLabel.className = "monitor-week-label";
  windowLabel.textContent = monitorWindowTitle(dateKeys) + (_monitorState.weekOffset === 0 ? " (7 hari terakhir)" : "");
  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "chip-btn small";
  nextBtn.textContent = "7 Hari Berikutnya ▶";
  nextBtn.title = "Lihat 7 hari lebih baru (menuju hari ini)";
  nextBtn.disabled = _monitorState.weekOffset === 0;
  nextBtn.addEventListener("click", () => { _monitorState.weekOffset = Math.max(0, _monitorState.weekOffset - 1); renderMonitorPanel(selectedUsername, showPinEditor); });
  nav.appendChild(prevBtn);
  nav.appendChild(windowLabel);
  nav.appendChild(nextBtn);
  if (_monitorState.weekOffset !== 0) {
    const todayBtn = document.createElement("button");
    todayBtn.type = "button";
    todayBtn.className = "chip-btn small";
    todayBtn.textContent = "⏱️ Kembali ke Hari Ini";
    todayBtn.addEventListener("click", () => { _monitorState.weekOffset = 0; renderMonitorPanel(selectedUsername, showPinEditor); });
    nav.appendChild(todayBtn);
  }
  container.appendChild(nav);

  const tableWrap = document.createElement("div");
  tableWrap.className = "monitor-table-wrap";
  tableWrap.innerHTML = `<p class="media-empty">Memuat…</p>`;
  container.appendChild(tableWrap);

  // Ambil buffer log secukupnya dari server sesuai seberapa jauh jendela
  // minggu yang sedang dilihat (bukan selalu 8 hari tetap seperti dulu --
  // supaya tombol "7 Hari Sebelumnya" bisa terus mundur "unlimited").
  const daysNeeded = (_monitorState.weekOffset + 1) * 7 + 2; // +2 hari buffer aman
  const logs = await Sync.pullLogs(currentUser, daysNeeded);
  const readLogsByUser = {};
  users.forEach((u) => {
    readLogsByUser[u.username] = logs.filter(
      (l) => (l.username || "").toLowerCase() === u.username && String(l.menu || "").indexOf("Baca: ") === 0
    );
  });

  tableWrap.innerHTML = "";

  if (_monitorState.view === "summary") {
    // ---------------- MODE RINGKASAN: semua domba x tanggal, 1 layar ----------------
    const info = document.createElement("p");
    info.className = "media-empty";
    info.textContent = pins.length
      ? `Menampilkan ${users.length} dari ${allUsers.length} yang boleh Anda pantau — daftar pendek Anda.`
      : `Menampilkan semua ${users.length} orang yang boleh Anda pantau.`;
    tableWrap.appendChild(info);

    const table = document.createElement("table");
    table.className = "monitor-table monitor-summary-table";
    // dateKeys sudah urut dari HARI INI (paling baru) -> mundur ke paling
    // lama (lihat monitorWindowDateKeys()). Dipakai APA ADANYA (TANPA
    // reverse()) di sini supaya kolom paling KIRI = hari ini, kolom paling
    // KANAN = 7 hari yang lalu, sesuai permintaan urutan tabel ringkasan.
    const headCells = dateKeys.map((key) => `<th>${escapeHtml(dateKeyLabel(key))}</th>`).join("");
    const bodyRows = users.map((u) => {
      const rows = buildReadRowsForUser(readLogsByUser[u.username] || [], dateKeys);
      const readCount = rows.filter((r) => r.read).length;
      const cells = rows.map((r) => `<td class="monitor-symbol ${r.read ? "monitor-cell-read" : "monitor-cell-unread"}">${r.read ? "V" : "X"}</td>`).join("");
      const lvl = (u.levels && u.levels.length) ? u.levels.map(levelLabel).join(", ") : (CONFIG.NO_LEVEL_LABEL || "Kaum Saleh");
      return `<tr data-username="${escapeHtml(u.username)}" class="monitor-summary-row" title="Klik untuk lihat detail ${escapeHtml(u.displayName || u.username)}">
        <td class="monitor-summary-name">${escapeHtml(u.displayName || u.username)}<span class="monitor-summary-level">${escapeHtml(lvl)}</span></td>
        ${cells}
        <td class="monitor-summary-count">${readCount}/7</td>
      </tr>`;
    }).join("");
    table.innerHTML =
      `<thead><tr><th>Nama Domba</th>${headCells}<th>Total</th></tr></thead><tbody>${bodyRows}</tbody>`;
    tableWrap.appendChild(table);

    table.querySelectorAll("tr[data-username]").forEach((row) => {
      row.addEventListener("click", () => {
        _monitorState.view = "detail";
        renderMonitorPanel(row.getAttribute("data-username"), showPinEditor);
      });
    });

    const note = document.createElement("p");
    note.className = "media-empty";
    note.textContent = `Klik salah satu baris nama untuk melihat detail pasal, jam awal/akhir, dan total waktu baca orang itu. Dihitung dari log "Baca: …" (minimal membuka 1 pasal pada hari itu).`;
    tableWrap.appendChild(note);
    return;
  }

  // ---------------- MODE DETAIL: 1 orang, lengkap dengan jam & durasi ----------------
  const target = (selectedUsername && users.some((u) => u.username === selectedUsername))
    ? selectedUsername
    : users[0].username;

  const controls = document.createElement("div");
  controls.className = "monitor-controls";
  const select = document.createElement("select");
  select.id = "monitorUserSelect";
  users.forEach((u) => {
    const opt = document.createElement("option");
    opt.value = u.username;
    const lvl = (u.levels && u.levels.length) ? u.levels.map(levelLabel).join(", ") : (CONFIG.NO_LEVEL_LABEL || "Kaum Saleh");
    opt.textContent = `${u.displayName || u.username} — ${lvl}`;
    select.appendChild(opt);
  });
  select.value = target;
  select.addEventListener("change", () => renderMonitorPanel(select.value, showPinEditor));
  const label = document.createElement("label");
  label.textContent = "Pantau: ";
  label.appendChild(select);
  controls.appendChild(label);
  if (pins.length) {
    const countNote = document.createElement("span");
    countNote.className = "monitor-pin-count";
    countNote.textContent = ` (menampilkan ${users.length} dari ${allUsers.length} yang boleh Anda pantau — daftar pendek Anda)`;
    controls.appendChild(countNote);
  }
  tableWrap.appendChild(controls);

  const targetUser = users.find((u) => u.username === target);
  const rows = buildReadRowsForUser(readLogsByUser[target] || [], dateKeys).map((r) => ({
    ...r,
    label: dateKeyLabel(r.key),
  }));
  const readCount = rows.filter((r) => r.read).length;

  const summary = document.createElement("p");
  summary.className = "monitor-summary";
  summary.textContent = `${targetUser ? (targetUser.displayName || targetUser.username) : target}: membaca ${readCount} dari 7 hari pada jendela ini.`;
  tableWrap.appendChild(summary);

  const table = document.createElement("table");
  table.className = "monitor-table";
  table.innerHTML =
    "<thead><tr><th>Tanggal</th><th>Baca?</th><th>Jam Awal</th><th>Jam Akhir</th><th>Jml Pasal</th><th>Total Waktu</th></tr></thead>" +
    "<tbody>" +
    rows.map((r) => `
      <tr class="${r.read ? "monitor-row-read" : "monitor-row-unread"}">
        <td>${escapeHtml(r.label)}</td>
        <td class="monitor-symbol">${r.read ? "V" : "X"}</td>
        <td>${escapeHtml(r.start)}</td>
        <td>${escapeHtml(r.end)}</td>
        <td>${r.count || ""}</td>
        <td>${escapeHtml(formatDurationSeconds(r.durationSec))}</td>
      </tr>`).join("") +
    "</tbody>";
  tableWrap.appendChild(table);

  const note = document.createElement("p");
  note.className = "media-empty";
  note.textContent = `Dihitung dari log "Baca: …" (minimal membuka 1 pasal pada hari itu). "Total Waktu" = selisih jam log TERAKHIR dikurangi jam log PERTAMA pada hari itu (perkiraan lama membaca, bukan pengukuran per detik yang presisi). Jam mengikuti waktu perangkat yang dipakai membaca, tanggal sudah dicocokkan pakai zona waktu tetap (WIB) supaya tidak meleset lintas perangkat.`;
  tableWrap.appendChild(note);
}

// ------------------------------------------------------------
// 9) TAMPILAN / PANEL
// ------------------------------------------------------------
function hideAllPanels() {
  // Lepas penanda "lagi di Kidung" (lihat showKidungPanel() di
  // js/kidung-ui.js) setiap kali pindah ke panel LAIN -- supaya kotak
  // "Cari Alkitab" di header balik muncul lagi di HP begitu keluar dari
  // Kidung, apa pun jalan keluarnya (tombol "📖 Alkitab", "← Kembali"
  // berkali-kali, atau buka menu lain langsung).
  document.body.classList.remove("kidung-active");
  if (typeof syncKidungHeaderToggle === "function") syncKidungHeaderToggle();
  if (typeof teardownKidungReaderKeyNav === "function") teardownKidungReaderKeyNav();
  el("chapterPicker").hidden = true;
  el("searchResults").hidden = true;
  el("reader").hidden = true;
  el("emptyState").hidden = true;
  el("planPanel").hidden = true;
  if (el("announcementPanel")) el("announcementPanel").hidden = true;
  if (el("notesPanel")) el("notesPanel").hidden = true;
  if (el("collectionsPanel")) el("collectionsPanel").hidden = true;
  if (el("kidungPanel")) el("kidungPanel").hidden = true;
  if (el("logPanel")) el("logPanel").hidden = true;
  if (el("monitorPanel")) el("monitorPanel").hidden = true;
  if (el("curhatPanel")) el("curhatPanel").hidden = true;
  if (el("aiChatPanel")) el("aiChatPanel").hidden = true;
  if (el("langCheckPanel")) el("langCheckPanel").hidden = true;
  if (el("kidungVerseRefPanel")) el("kidungVerseRefPanel").hidden = true;
  if (el("bookInfoPanel")) el("bookInfoPanel").hidden = true;
  if (el("allPokokPanel")) el("allPokokPanel").hidden = true;
  if (el("allMapsPanel")) el("allMapsPanel").hidden = true;
}
function showEmptyState() {
  hideAllPanels();
  el("emptyState").querySelector("p").textContent = "Pilih kitab di sebelah kiri, atau cari ayat / kata di atas.";
  el("emptyState").hidden = false;
}

// ------------------------------------------------------------
// 10) KONTROL LEBAR TAMPILAN (HP / Tablet / Komputer / Penuh / bebas)
// ------------------------------------------------------------
const WIDTH_PRESETS = { mobile: "420px", tablet: "720px", desktop: "1100px", full: "100%" };

function applyWidth(value) {
  // value bisa angka piksel dari slider, atau string CSS dari tombol preset
  // (termasuk "100%" untuk tombol ↔️ Penuh — benar-benar selebar layar,
  // bukan dibatasi angka piksel tetap seperti sebelumnya).
  const cssValue = /^\d+$/.test(String(value)) ? value + "px" : String(value);
  el("contentInner").style.setProperty("--content-width", cssValue);
  localStorage.setItem("bible_app_width", cssValue);
  if (/^\d+px$/.test(cssValue)) el("widthSlider").value = parseInt(cssValue, 10);
  document.querySelectorAll(".width-btn").forEach((b) => {
    b.classList.toggle("active", WIDTH_PRESETS[b.dataset.width] === cssValue);
  });
}

function initWidthControl() {
  const saved = localStorage.getItem("bible_app_width") || WIDTH_PRESETS.tablet;
  applyWidth(saved);

  document.querySelectorAll(".width-btn").forEach((btn) => {
    btn.addEventListener("click", () => applyWidth(WIDTH_PRESETS[btn.dataset.width]));
  });
  el("widthSlider").addEventListener("input", (e) => applyWidth(e.target.value));
}

// ------------------------------------------------------------
// 11) UKURAN HURUF AYAT (tombol A- / A+)
// ------------------------------------------------------------
function applyFontSize(px) {
  const clamped = Math.max(CONFIG.FONT_SIZE_MIN, Math.min(CONFIG.FONT_SIZE_MAX, px));
  document.documentElement.style.setProperty("--verse-font-size", clamped + "px");
  localStorage.setItem(CONFIG.FONT_SIZE_STORAGE_KEY, clamped);
  return clamped;
}

function initFontSizeControl() {
  const saved = parseInt(localStorage.getItem(CONFIG.FONT_SIZE_STORAGE_KEY), 10) || CONFIG.FONT_SIZE_DEFAULT;
  applyFontSize(saved);

  el("fontIncrease").addEventListener("click", () => {
    const current = parseInt(localStorage.getItem(CONFIG.FONT_SIZE_STORAGE_KEY), 10) || CONFIG.FONT_SIZE_DEFAULT;
    applyFontSize(current + CONFIG.FONT_SIZE_STEP);
  });
  el("fontDecrease").addEventListener("click", () => {
    const current = parseInt(localStorage.getItem(CONFIG.FONT_SIZE_STORAGE_KEY), 10) || CONFIG.FONT_SIZE_DEFAULT;
    applyFontSize(current - CONFIG.FONT_SIZE_STEP);
  });

  // Tombol A-/A+ di panel hasil pencarian (lihat .search-font-size-control
  // di css/style.css) -- sama persis fungsinya dengan yang di header,
  // supaya besar/kecil huruf tetap satu pengaturan yang sama di mana pun
  // dipakai, hanya saja yang ini tetap kelihatan di HP saat sedang mencari.
  if (el("searchFontIncrease")) {
    el("searchFontIncrease").addEventListener("click", () => {
      const current = parseInt(localStorage.getItem(CONFIG.FONT_SIZE_STORAGE_KEY), 10) || CONFIG.FONT_SIZE_DEFAULT;
      applyFontSize(current + CONFIG.FONT_SIZE_STEP);
    });
  }
  if (el("searchFontDecrease")) {
    el("searchFontDecrease").addEventListener("click", () => {
      const current = parseInt(localStorage.getItem(CONFIG.FONT_SIZE_STORAGE_KEY), 10) || CONFIG.FONT_SIZE_DEFAULT;
      applyFontSize(current - CONFIG.FONT_SIZE_STEP);
    });
  }
}

// ------------------------------------------------------------
// 11b) TEMA TAMPILAN (10 pilihan, lewat menu ⋮ → Tema)
// ------------------------------------------------------------
const THEME_STORAGE_KEY = "bible_app_theme_v1";
const THEMES = [
  { id: 1, name: "Manuskrip (bawaan)", swatch: "#F7F2E7", ink: "#2B2118" },
  { id: 2, name: "Terang Klasik", swatch: "#FFFFFF", ink: "#1A1A1A" },
  { id: 3, name: "Malam Gelap", swatch: "#14161A", ink: "#EDEDEF" },
  { id: 4, name: "Sepia Hangat", swatch: "#F4ECD8", ink: "#3A2E1F" },
  { id: 5, name: "Hitam Pekat", swatch: "#000000", ink: "#F2F2F2" },
  { id: 6, name: "Hijau Zaitun", swatch: "#F3F5EC", ink: "#26301F" },
  { id: 7, name: "Biru Malam", swatch: "#0F1B2D", ink: "#E7EEF7" },
  { id: 8, name: "Merah Marun", swatch: "#FBF3F1", ink: "#2E1512" },
  { id: 9, name: "Abu-abu Lembut", swatch: "#EDEEF0", ink: "#24262B" },
  { id: 10, name: "Ungu Senja", swatch: "#17131F", ink: "#EDE7F5" },
  { id: 11, name: "Putih - Biru", swatch: "#FFFFFF", ink: "#1846C4" },
  { id: 12, name: "Hitam - Kuning", swatch: "#000000", ink: "#FFE55A" },
  { id: 13, name: "Pink Pastel", swatch: "#FFEAF3", ink: "#A3225F" },
  { id: 14, name: "Biru Pastel Muda", swatch: "#DCEBFF", ink: "#1F3E7A" },
  { id: 15, name: "Merah Tua", swatch: "#6E1414", ink: "#FFFFFF" },
  { id: 16, name: "Hijau Tua Pastel", swatch: "#1F3A28", ink: "#FFE98A" },
  { id: 17, name: "Kuning - Oranye Pastel", swatch: "#FFF3B0", ink: "#C6712B" },
];

function applyTheme(id) {
  // PENTING: class tema dipasang di <html> (document.documentElement),
  // BUKAN di <body>. Variabel CSS (--paper, --ink, dst.) cuma mengalir
  // ke bawah lewat DOM, jadi kalau class cuma di <body>, elemen <html>
  // tetap memakai warna tema lama -- itulah sebabnya dulu cuma
  // "separuh layar bagian atas" yang kelihatan berubah warna, terutama
  // di komputer/layar lebar. Dipasang di <html> supaya seluruh layar
  // (termasuk area di luar kotak <body>) ikut berubah.
  const root = document.documentElement;
  for (let i = 2; i <= 17; i++) root.classList.remove("theme-" + i);
  if (id && id !== 1) root.classList.add("theme-" + id);
  localStorage.setItem(THEME_STORAGE_KEY, id);
  document.querySelectorAll("#themePicker .theme-swatch").forEach((btn) => {
    btn.classList.toggle("active", parseInt(btn.dataset.theme, 10) === id);
  });
}

function initThemeControl() {
  const picker = el("themePicker");
  if (!picker) return;
  picker.innerHTML = "";
  THEMES.forEach((t) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-swatch";
    btn.dataset.theme = t.id;
    btn.title = t.name;
    btn.setAttribute("aria-label", "Tema " + t.name);
    btn.style.background = t.swatch;
    btn.style.color = t.ink;
    btn.addEventListener("click", () => applyTheme(t.id));
    picker.appendChild(btn);
  });
  const saved = parseInt(localStorage.getItem(THEME_STORAGE_KEY), 10) || 1;
  applyTheme(saved);
}

// ------------------------------------------------------------
// 11c) JENIS HURUF (Roboto / tebal ala Arial Black / Comic Sans anak-anak)
//     — mengubah --font-body (dipakai teks ayat) & --font-ui di seluruh
//     app, tersimpan per perangkat lewat localStorage.
// ------------------------------------------------------------
const FONT_FAMILY_STORAGE_KEY = "bible_app_font_family_v1";
const FONT_FAMILIES = [
  { id: "default", name: "Bawaan (Literata)", body: '"Literata", Georgia, serif', ui: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif', weight: "400" },
  { id: "roboto", name: "Roboto", body: '"Roboto", Arial, sans-serif', ui: '"Roboto", Arial, sans-serif', weight: "400" },
  { id: "tebal", name: "Tebal (ala Arial Black)", body: '"Arial Black", "Arial Bold", Arial, sans-serif', ui: '"Arial Black", "Arial Bold", Arial, sans-serif', weight: "900" },
  { id: "comic", name: "Comic Sans (huruf lucu anak-anak)", body: '"Comic Sans MS", "Comic Neue", cursive', ui: '"Comic Sans MS", "Comic Neue", cursive', weight: "400" },
];

function applyFontFamily(id) {
  const f = FONT_FAMILIES.find((x) => x.id === id) || FONT_FAMILIES[0];
  document.documentElement.style.setProperty("--font-body", f.body);
  document.documentElement.style.setProperty("--font-ui", f.ui);
  document.documentElement.style.setProperty("--font-body-weight", f.weight);
  localStorage.setItem(FONT_FAMILY_STORAGE_KEY, f.id);
  document.querySelectorAll("#fontFamilyPicker .font-family-option").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.font === f.id);
  });
}

function initFontFamilyControl() {
  const picker = el("fontFamilyPicker");
  if (!picker) return;
  picker.innerHTML = "";
  FONT_FAMILIES.forEach((f) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "font-family-option";
    btn.dataset.font = f.id;
    btn.style.fontFamily = f.body;
    btn.textContent = "Aa — " + f.name;
    btn.addEventListener("click", () => applyFontFamily(f.id));
    picker.appendChild(btn);
  });
  const saved = localStorage.getItem(FONT_FAMILY_STORAGE_KEY) || "default";
  applyFontFamily(saved);
}

// ------------------------------------------------------------
// 11c-2) JENIS HURUF KHUSUS CATATAN (Note) -- SEBELUMNYA font catatan
// tidak konsisten: catatan dari Sheet Alkitab (📝 Catatan pada ayat ini)
// ikut warisan font UI (--font-ui, Inter/sans) karena tidak diatur
// sendiri, sedangkan kotak catatan pribadi (🖊️) memakai font baca
// (--font-body, Literata/serif) -- dua tampilan beda dalam SATU panel
// yang sama. Sekarang KEDUANYA diseragamkan lewat SATU variabel CSS
// khusus (--font-note, lihat css/style.css: .note-modal-admin-text &
// .inline-note-textarea), dan jenis hurufnya bisa dipilih sendiri
// (terpisah dari jenis huruf ayat) lewat menu ⋮ -> "📝 Jenis huruf
// Catatan (Note)". Daftar pilihannya sama persis dengan FONT_FAMILIES di
// atas supaya konsisten, tapi tersimpan di localStorage TERPISAH
// (NOTE_FONT_FAMILY_STORAGE_KEY) -- jadi jenis huruf ayat & jenis huruf
// catatan bisa diatur beda-beda sesuai selera.
// ------------------------------------------------------------
const NOTE_FONT_FAMILY_STORAGE_KEY = "bible_app_note_font_family_v1";

function applyNoteFontFamily(id) {
  const f = FONT_FAMILIES.find((x) => x.id === id) || FONT_FAMILIES[0];
  document.documentElement.style.setProperty("--font-note", f.body);
  localStorage.setItem(NOTE_FONT_FAMILY_STORAGE_KEY, f.id);
  document.querySelectorAll("#noteFontFamilyPicker .font-family-option").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.font === f.id);
  });
}

function initNoteFontFamilyControl() {
  const picker = el("noteFontFamilyPicker");
  if (!picker) return;
  picker.innerHTML = "";
  FONT_FAMILIES.forEach((f) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "font-family-option";
    btn.dataset.font = f.id;
    btn.style.fontFamily = f.body;
    btn.textContent = "Aa — " + f.name;
    btn.addEventListener("click", () => applyNoteFontFamily(f.id));
    picker.appendChild(btn);
  });
  const saved = localStorage.getItem(NOTE_FONT_FAMILY_STORAGE_KEY) || "default";
  applyNoteFontFamily(saved);
}

// ------------------------------------------------------------
// 12) LAYAR PENUH (Fullscreen API)
// ------------------------------------------------------------
function initFullscreenControl() {
  const btn = el("fullscreenToggle");
  const requestFn = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
  const exitFn = document.exitFullscreen || document.webkitExitFullscreen;

  if (!requestFn || !exitFn) {
    btn.disabled = true;
    btn.title = "Layar penuh tidak didukung di browser ini";
    return;
  }

  btn.addEventListener("click", () => {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      requestFn.call(document.documentElement).catch(() => {});
    } else {
      exitFn.call(document);
    }
  });
  document.addEventListener("fullscreenchange", () => {
    const active = !!document.fullscreenElement;
    btn.classList.toggle("active", active);
    btn.textContent = active ? "⤢" : "⛶";
    btn.title = active ? "Keluar layar penuh" : "Layar penuh";
  });
}

// ------------------------------------------------------------
// 12b) WAKE LOCK — mencegah layar HP mati sendiri (yang otomatis
//     menghentikan suara: TTS Google Voice maupun audio/video MP3/MP4
//     sebaris) selama sedang memutar sesuatu. Dipakai bareng oleh TTS
//     (bagian 13 di bawah) dan pemutar media sebaris (js/media.js).
//     CATATAN JUJUR: Wake Lock API hanya menjaga LAYAR TETAP MENYALA
//     (tidak mengunci sendiri) selama tab ini aktif di depan -- ini
//     BUKAN solusi supaya suara tetap jalan kalau pengguna sendiri yang
//     menekan tombol kunci layar HP atau berpindah ke aplikasi lain;
//     itu tetap batasan sistem operasi HP yang tidak bisa dijamin penuh
//     dari sisi web biasa. Didukung sebagian besar Chrome/Android &
//     Safari/iOS versi baru; browser yang tidak mendukung akan otomatis
//     dilewati tanpa error.
// ------------------------------------------------------------
let activeWakeLock = null;
let wakeLockWantedCount = 0; // berapa pemutar (TTS/media) yang sedang minta layar tetap menyala

async function requestWakeLock() {
  wakeLockWantedCount++;
  if (activeWakeLock || !("wakeLock" in navigator)) return;
  try {
    activeWakeLock = await navigator.wakeLock.request("screen");
    activeWakeLock.addEventListener("release", () => { activeWakeLock = null; });
  } catch (e) {
    activeWakeLock = null; // ditolak (mis. tab tidak aktif di depan) -- diabaikan, pemutaran tetap jalan seperti biasa
  }
}

function releaseWakeLock() {
  wakeLockWantedCount = Math.max(0, wakeLockWantedCount - 1);
  if (wakeLockWantedCount === 0 && activeWakeLock) {
    activeWakeLock.release().catch(() => {});
    activeWakeLock = null;
  }
}

// Wake Lock otomatis dilepas browser saat tab disembunyikan (pindah app
// sebentar/layar dikunci) -- begitu tab terlihat lagi DAN masih ada yang
// minta (TTS/media sedang jalan), coba minta ulang otomatis.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && wakeLockWantedCount > 0 && !activeWakeLock) {
      navigator.wakeLock && navigator.wakeLock.request("screen")
        .then((wl) => { activeWakeLock = wl; wl.addEventListener("release", () => { activeWakeLock = null; }); })
        .catch(() => {});
    }
  });
}

// ------------------------------------------------------------
// 13) PEMBACAAN SUARA (Web Speech API — memakai suara Google
//     bawaan browser/Android bila tersedia). Tombol Play/Pause
//     membacakan pasal yang sedang terbuka, ayat demi ayat, sambil
//     menyorot ayat yang sedang dibacakan.
// ------------------------------------------------------------
let ttsPlaying = false;
let ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;

// Pengaturan suara pembacaan (bahasa, jenis suara, kecepatan) — tersimpan
// di localStorage supaya bertahan untuk kunjungan berikutnya.
const TTS_SETTINGS_KEY = "bible_app_tts_settings_v1";
function loadTTSSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(TTS_SETTINGS_KEY) || "{}");
    return {
      lang: raw.lang || CONFIG.TTS_LANG || "id-ID",
      gender: raw.gender || "any",
      rate: typeof raw.rate === "number" ? raw.rate : 1.0,
      readNotes: !!raw.readNotes,
      // "Rapikan artikulasi" -- membersihkan tanda kurung penanda footnote
      // (mis. "(a)") & merapikan referensi ayat gaya OSIS (mis. "Psa_74:16"
      // -> "Mazmur 74:16") supaya lebih enak didengar. Default AKTIF karena
      // tanpa ini pembacaan catatan kaki jadi aneh (huruf per huruf).
      parseArticulation: raw.parseArticulation === undefined ? true : !!raw.parseArticulation,
    };
  } catch (e) {
    return { lang: CONFIG.TTS_LANG || "id-ID", gender: "any", rate: 1.0, readNotes: false, parseArticulation: true };
  }
}
function saveTTSSettings(settings) {
  localStorage.setItem(TTS_SETTINGS_KEY, JSON.stringify(settings));
}
let ttsSettings = loadTTSSettings();

// Nama-nama suara yang umum dikenal sebagai wanita/pria pada mesin TTS
// bawaan Chrome/Android/Windows/macOS — dipakai sebagai penebak (heuristik)
// karena Web Speech API tidak selalu memberi info gender langsung.
const TTS_FEMALE_HINTS = /female|wanita|perempuan|zira|susan|samantha|siri|google.*(id|us|uk).*female|xiaoxiao|yaoyao|ting-ting|mei-jia|anna|amelie/i;
const TTS_MALE_HINTS = /male|pria|laki|david|fred|daniel|alex|yunjian|kangkang|arthur/i;

function initTTS() {
  if (!ttsSupported) {
    el("ttsToggle").disabled = true;
    el("ttsToggle").title = "Perangkat/browser ini tidak mendukung pembacaan suara";
    return;
  }
  // beberapa browser memuat daftar suara secara asinkron
  window.speechSynthesis.onvoiceschanged = () => {};
  el("ttsToggle").addEventListener("click", toggleTTS);
  window.addEventListener("beforeunload", stopTTS);
  initTTSControls();
}

function initTTSControls() {
  const langSel = el("ttsLangSelect");
  const genderSel = el("ttsGenderSelect");
  const rateVal = el("ttsRateValue");
  if (!langSel || !genderSel || !rateVal) return;

  langSel.value = ttsSettings.lang;
  genderSel.value = ttsSettings.gender;
  rateVal.textContent = ttsSettings.rate.toFixed(1) + "x";

  langSel.addEventListener("change", () => {
    ttsSettings.lang = langSel.value;
    saveTTSSettings(ttsSettings);
    if (ttsPlaying) { stopTTS(); playTTS(); }
  });
  genderSel.addEventListener("change", () => {
    ttsSettings.gender = genderSel.value;
    saveTTSSettings(ttsSettings);
    if (ttsPlaying) { stopTTS(); playTTS(); }
  });
  el("ttsRateDown").addEventListener("click", () => {
    ttsSettings.rate = Math.max(0.5, Math.round((ttsSettings.rate - 0.1) * 10) / 10);
    rateVal.textContent = ttsSettings.rate.toFixed(1) + "x";
    saveTTSSettings(ttsSettings);
    if (ttsPlaying) { stopTTS(); playTTS(); }
  });
  el("ttsRateUp").addEventListener("click", () => {
    ttsSettings.rate = Math.min(2.0, Math.round((ttsSettings.rate + 0.1) * 10) / 10);
    rateVal.textContent = ttsSettings.rate.toFixed(1) + "x";
    saveTTSSettings(ttsSettings);
    if (ttsPlaying) { stopTTS(); playTTS(); }
  });

  const readNotesToggle = el("ttsReadNotesToggle");
  if (readNotesToggle) {
    readNotesToggle.checked = !!ttsSettings.readNotes;
    readNotesToggle.addEventListener("change", () => {
      ttsSettings.readNotes = readNotesToggle.checked;
      saveTTSSettings(ttsSettings);
      if (ttsPlaying) { stopTTS(); playTTS(); }
    });
  }

  const parseToggle = el("ttsParseArticulationToggle");
  if (parseToggle) {
    parseToggle.checked = !!ttsSettings.parseArticulation;
    parseToggle.addEventListener("change", () => {
      ttsSettings.parseArticulation = parseToggle.checked;
      saveTTSSettings(ttsSettings);
      if (ttsPlaying) { stopTTS(); playTTS(); }
    });
  }

  const recordBtn = el("ttsRecordBtn");
  if (recordBtn && !recordBtn.dataset.wired) {
    recordBtn.dataset.wired = "1";
    if (!("mediaDevices" in navigator) || !navigator.mediaDevices.getDisplayMedia || typeof MediaRecorder === "undefined") {
      recordBtn.disabled = true;
      recordBtn.title = "Rekam ke MP3 tidak didukung di perangkat/browser ini (coba Chrome di komputer)";
    } else {
      recordBtn.addEventListener("click", toggleTTSRecording);
    }
  }
}

function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const langPrefix = ttsSettings.lang.slice(0, 2).toLowerCase();
  const inLang = voices.filter(
    (v) => v.lang && v.lang.toLowerCase().startsWith(langPrefix)
  );
  const pool = inLang.length ? inLang : voices;

  if (ttsSettings.gender === "female") {
    const f = pool.find((v) => TTS_FEMALE_HINTS.test(v.name));
    if (f) return f;
  } else if (ttsSettings.gender === "male") {
    const m = pool.find((v) => TTS_MALE_HINTS.test(v.name));
    if (m) return m;
  }

  return (
    pool.find((v) => v.lang && v.lang.toLowerCase() === ttsSettings.lang.toLowerCase()) ||
    pool.find((v) => /google/i.test(v.name)) ||
    pool[0]
  );
}

// "Rapikan artikulasi" -- dipakai khusus untuk teks CATATAN KAKI (kolom
// Note) sebelum dibacakan TTS, supaya markup penanda footnote & referensi
// silang gaya OSIS tidak dibaca huruf per huruf / tanda baca per tanda
// baca. Contoh isi Note asli (setelah noteHtmlToPlainText membuang tag
// <p>/<br> dst): "(a)siang,  Psa_74:16; Jer_33:20 (b)jadilah,  Gen_1:8, …"
//   - "(a)" / "(b)" dst -> dibuang (cuma penanda huruf footnote, tidak
//     berarti apa-apa kalau dibaca "buka kurung a tutup kurung").
//   - "Psa_74:16" -> "Mazmur 74:16" (nama kitab Indonesia + tanpa garis
//     bawah), dicocokkan lewat OSIS_ABBR_INDEX di js/books.js.
//   - "Luk_3:23-28" (rentang ayat) -> "Lukas 3 ayat 23 sampai 28" --
//     SEBELUMNYA akhir rentang ("-28") tidak ditangkap regex-nya sama
//     sekali, jadi terbaca aneh apa adanya ("Lukas 3 ayat 23 -28").
function cleanArticulationForSpeech(text) {
  if (!text) return text;
  let out = text.replace(/\([a-zA-Z]{1,2}\)/g, " ");
  out = out.replace(/\b([1-3]?[A-Za-z]{2,4})_(\d+):(\d+)(?:-(\d+))?\b/g, (m, abbr, chapter, verseStart, verseEnd) => {
    const book = OSIS_ABBR_INDEX[abbr.toLowerCase()];
    const name = book ? book.name : abbr;
    return verseEnd
      ? `${name} ${chapter} ayat ${verseStart} sampai ${verseEnd}`
      : `${name} ${chapter} ayat ${verseStart}`;
  });
  return out.replace(/\s{2,}/g, " ").trim();
}

function setSpeakingHighlight(block) {
  document.querySelectorAll(".verse-block.speaking").forEach((b) => b.classList.remove("speaking"));
  if (block) {
    block.classList.add("speaking");
    block.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function updateTTSButton() {
  const btn = el("ttsToggle");
  btn.textContent = ttsPlaying ? "⏸" : "▶️";
  btn.classList.toggle("playing", ttsPlaying);
  btn.title = ttsPlaying ? "Jeda pembacaan" : "Putar pembacaan ayat";
}

function playTTS() {
  if (!ttsSupported) return;

  // Kalau sebelumnya dijeda (bukan dihentikan), lanjutkan dari situ
  if (window.speechSynthesis.paused && window.speechSynthesis.pending === false && window.speechSynthesis.speaking) {
    window.speechSynthesis.resume();
    ttsPlaying = true;
    requestWakeLock();
    updateTTSButton();
    return;
  }

  if (!currentChapterVerses.length) return;
  window.speechSynthesis.cancel();

  const voice = pickVoice();
  currentChapterVerses.forEach((v, idx) => {
    let spoken = `Ayat ${v.verse}. ${v.text}`;
    if (ttsSettings.readNotes && v.note && v.note.trim()) {
      let noteSpoken = noteHtmlToPlainText(v.note);
      if (ttsSettings.parseArticulation) noteSpoken = cleanArticulationForSpeech(noteSpoken);
      spoken += ` Catatan. ${noteSpoken}`;
    }
    const utter = new SpeechSynthesisUtterance(spoken);
    if (voice) utter.voice = voice;
    utter.lang = ttsSettings.lang;
    utter.rate = ttsSettings.rate;
    utter.onstart = () => setSpeakingHighlight(el("v-" + v.id));
    if (idx === currentChapterVerses.length - 1) {
      utter.onend = () => {
        ttsPlaying = false;
        releaseWakeLock();
        setSpeakingHighlight(null);
        updateTTSButton();
      };
    }
    window.speechSynthesis.speak(utter);
  });

  ttsPlaying = true;
  requestWakeLock();
  updateTTSButton();
}

function pauseTTS() {
  if (!ttsSupported) return;
  if (window.speechSynthesis.speaking) window.speechSynthesis.pause();
  if (ttsPlaying) releaseWakeLock();
  ttsPlaying = false;
  updateTTSButton();
}

function stopTTS() {
  if (!ttsSupported) return;
  window.speechSynthesis.cancel();
  if (ttsPlaying) releaseWakeLock();
  ttsPlaying = false;
  setSpeakingHighlight(null);
  updateTTSButton();
}

function toggleTTS() {
  if (ttsPlaying) pauseTTS();
  else playTTS();
}

// ------------------------------------------------------------
// 13a-2) PUTAR SUARA 1 AYAT (dipakai di panel Kumpulan Ayat / "SPR ...")
//   Beda dari playTTS() di atas (yang membacakan SATU PASAL PENUH dari
//   currentChapterVerses): fungsi ini membacakan SATU AYAT SAJA lewat
//   tombol "▶️ Putar" di tiap kartu ayat kumpulan, sesuai suara Google
//   (id-ID/en-US/zh-CN) yang dipilih di kotak "🔊 Bahasa suara" panel itu.
//   Memakai ttsSettings & pickVoice() yang sama supaya pilihan bahasa/
//   jenis suara/kecepatan tetap konsisten dengan menu Pembaca biasa.
// ------------------------------------------------------------
let collectionVersePlayingBtn = null; // tombol yang sedang aktif memutar (kalau ada)

function stopCollectionVersePlayback() {
  if (!ttsSupported) return;
  window.speechSynthesis.cancel();
  if (collectionVersePlayingBtn) {
    collectionVersePlayingBtn.textContent = "▶️ Putar";
    collectionVersePlayingBtn.classList.remove("playing");
    collectionVersePlayingBtn = null;
  }
  releaseWakeLock();
}

function toggleCollectionVersePlayback(v, btn) {
  if (!ttsSupported || !v) return;

  // Kalau tombol yang diklik sedang jalan -> hentikan (berfungsi sebagai jeda).
  if (collectionVersePlayingBtn === btn) {
    stopCollectionVersePlayback();
    return;
  }

  // Hentikan dulu: pembacaan pasal penuh (kalau ada) & ayat lain yang
  // sedang diputar, supaya suaranya tidak bertumpuk.
  stopTTS();
  stopCollectionVersePlayback();

  const voice = pickVoice();
  const utter = new SpeechSynthesisUtterance(`Ayat ${v.verse}. ${v.text}`);
  if (voice) utter.voice = voice;
  utter.lang = ttsSettings.lang;
  utter.rate = ttsSettings.rate;
  utter.onend = () => stopCollectionVersePlayback();
  utter.onerror = () => stopCollectionVersePlayback();

  btn.textContent = "⏸ Jeda";
  btn.classList.add("playing");
  collectionVersePlayingBtn = btn;
  requestWakeLock();
  window.speechSynthesis.speak(utter);
}

// ------------------------------------------------------------
// 13b) REKAM PEMBACAAN SUARA -> MP3 (eksperimental)
//   Web Speech API TIDAK punya cara resmi memberi berkas audio mentahnya
//   (suaranya diputar langsung oleh sistem operasi/browser, bukan lewat
//   berkas yang bisa diambil). Satu-satunya cara merekamnya dari sisi web
//   adalah lewat izin "rekam audio tab ini" (getDisplayMedia) -- makanya
//   tombol ini akan memunculkan kotak pilih tab/layar dari browser; pilih
//   TAB INI dan WAJIB centang "Bagikan audio tab" supaya suaranya ikut
//   terekam. Paling didukung di Chrome versi komputer.
//   Rekaman mentahnya (webm) lalu diubah ke MP3 di perangkat sendiri
//   memakai encoder lamejs (dimuat dari CDN hanya saat tombol ini dipakai).
// ------------------------------------------------------------
let ttsRecordState = null; // { recorder, stream } selama sedang merekam

function loadLamejs() {
  if (window.lamejs) return Promise.resolve(window.lamejs);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js";
    s.onload = () => resolve(window.lamejs);
    s.onerror = () => reject(new Error("Gagal memuat encoder MP3 (perlu koneksi internet)"));
    document.head.appendChild(s);
  });
}

function floatTo16BitPCM(float32Array) {
  const out = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

async function encodeBlobToMp3(webmBlob) {
  const lamejs = await loadLamejs();
  const arrayBuffer = await webmBlob.arrayBuffer();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioCtx();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  const sampleRate = audioBuffer.sampleRate;
  const samples = floatTo16BitPCM(audioBuffer.getChannelData(0));
  const encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);
  const blockSize = 1152;
  const mp3Chunks = [];
  for (let i = 0; i < samples.length; i += blockSize) {
    const chunk = samples.subarray(i, i + blockSize);
    const buf = encoder.encodeBuffer(chunk);
    if (buf.length > 0) mp3Chunks.push(new Int8Array(buf));
  }
  const end = encoder.flush();
  if (end.length > 0) mp3Chunks.push(new Int8Array(end));
  audioCtx.close();
  return new Blob(mp3Chunks, { type: "audio/mp3" });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

function updateTTSRecordButton(recording, busy) {
  const btn = el("ttsRecordBtn");
  if (!btn) return;
  btn.classList.toggle("recording", !!recording);
  btn.textContent = busy ? "⏳" : recording ? "⏺️ Berhenti" : "🎙️ Rekam MP3";
  btn.title = busy
    ? "Sedang memproses rekaman menjadi MP3…"
    : recording
    ? "Berhenti merekam"
    : "Rekam pembacaan pasal ini & unduh sebagai MP3";
}

function toggleTTSRecording() {
  if (ttsRecordState) stopTTSRecording();
  else startTTSRecording();
}

async function startTTSRecording() {
  if (!currentChapterVerses.length) {
    alert("Buka pasal yang mau dibaca dulu.");
    return;
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
  } catch (e) {
    return; // dibatalkan pengguna di kotak pilih tab -- diamkan saja
  }
  const audioTracks = stream.getAudioTracks();
  if (!audioTracks.length) {
    alert('Tidak ada audio yang terekam. Ulangi, lalu pastikan mencentang "Bagikan audio tab/sistem" saat memilih tab.');
    stream.getTracks().forEach((t) => t.stop());
    return;
  }
  stream.getVideoTracks().forEach((t) => t.stop()); // video tidak dipakai, cukup ditutup

  const audioOnlyStream = new MediaStream(audioTracks);
  let recorder;
  try {
    recorder = new MediaRecorder(audioOnlyStream);
  } catch (e) {
    alert("Perekaman tidak didukung di browser ini.");
    stream.getTracks().forEach((t) => t.stop());
    return;
  }
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  recorder.onstop = async () => {
    stream.getTracks().forEach((t) => t.stop());
    updateTTSRecordButton(false, true);
    try {
      const webmBlob = new Blob(chunks, { type: "audio/webm" });
      const mp3Blob = await encodeBlobToMp3(webmBlob);
      downloadBlob(mp3Blob, `bacaan-${new Date().toISOString().slice(0, 10)}.mp3`);
    } catch (err) {
      alert("Gagal mengubah rekaman ke MP3: " + err.message);
    } finally {
      updateTTSRecordButton(false, false);
    }
  };
  // Kalau pengguna menutup kotak share dari UI browser (bukan tombol kita)
  audioTracks[0].addEventListener("ended", () => stopTTSRecording());

  ttsRecordState = { recorder, stream };
  recorder.start();
  updateTTSRecordButton(true);
  stopTTS();
  playTTS();

  const watchInterval = setInterval(() => {
    if (!ttsPlaying) {
      clearInterval(watchInterval);
      setTimeout(() => stopTTSRecording(), 600); // jeda kecil biar ekor suara ikut rekam
    }
  }, 300);
  ttsRecordState.watchInterval = watchInterval;
}

function stopTTSRecording() {
  if (!ttsRecordState) return;
  if (ttsRecordState.watchInterval) clearInterval(ttsRecordState.watchInterval);
  if (ttsRecordState.recorder && ttsRecordState.recorder.state !== "inactive") {
    ttsRecordState.recorder.stop();
  }
  ttsRecordState = null;
  stopTTS();
}

// ------------------------------------------------------------
// 14) MODAL CATATAN AYAT — muncul saat sebuah ayat diklik.
//     Menampilkan catatan dari Sheet Alkitab (kalau ada) DAN
//     catatan pribadi milik pengguna (bisa ditulis & disimpan,
//     tersinkron ke Google Sheet lewat js/sync.js + js/notes.js).
// ------------------------------------------------------------
// (Catatan ayat sekarang ditampilkan SEBARIS di dalam blok ayatnya --
// lihat buildInlineNoteCardEl()/toggleInlineNote() di bagian atas file
// ini. Modal/jendela terapung yang dulu dipakai untuk ini sudah dilepas.)

// ------------------------------------------------------------
// 15) ANIMASI PROGRES MEMBACA — notifikasi otomatis (tanpa perlu
//     diklik/ditekan) saat pengguna sudah membaca separuh, tiga
//     perempat, dan seluruh pasal yang sedang dibuka, ditutup
//     dengan animasi kembang api saat selesai. Bisa dimatikan lewat
//     menu ⋮ → "Animasi progres membaca" (default: aktif),
//     tersimpan per pengguna (lokal + Google Sheet tab "Settings").
// ------------------------------------------------------------
let readingProgressFlags = { half: false, threeQuarters: false, complete: false };
let readingProgressShortChapterTimer = null;
let readingToastHideTimer = null;

function resetReadingProgressFlags() {
  readingProgressFlags = { half: false, threeQuarters: false, complete: false };
  if (readingProgressShortChapterTimer) {
    clearTimeout(readingProgressShortChapterTimer);
    readingProgressShortChapterTimer = null;
  }
}

function isReadingProgressEnabled() {
  return getSetting(currentUser, "readingProgressAnimation") !== false;
}

// Dipanggil setiap kali pasal baru dibuka (dari renderChapter).
function initReadingProgressForChapter() {
  resetReadingProgressFlags();
  if (!isReadingProgressEnabled()) return;

  // Kalau seluruh pasal sudah muat di layar (tidak perlu di-scroll sama
  // sekali), anggap "terbaca" setelah jeda singkat, supaya pengguna tetap
  // dapat pengalaman yang sama walau pasalnya pendek.
  requestAnimationFrame(() => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollable <= 40) {
      readingProgressShortChapterTimer = setTimeout(() => {
        handleReadingProgressCheckpoint(100);
      }, 3500);
    }
  });
}

function computeReadingProgressPercent() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  if (scrollable <= 0) return 100;
  const percent = (window.scrollY / scrollable) * 100;
  return Math.max(0, Math.min(100, percent));
}

function handleScrollForReadingProgress() {
  if (el("reader").hidden) return;
  if (!isReadingProgressEnabled()) return;
  const percent = computeReadingProgressPercent();
  if (percent >= 50) handleReadingProgressCheckpoint(50);
  if (percent >= 75) handleReadingProgressCheckpoint(75);
  if (percent >= 99) handleReadingProgressCheckpoint(100);
}

function handleReadingProgressCheckpoint(threshold) {
  if (threshold === 50 && !readingProgressFlags.half) {
    readingProgressFlags.half = true;
    showReadingToast("📖 Sudah separuh pasal ini terbaca…");
  } else if (threshold === 75 && !readingProgressFlags.threeQuarters) {
    readingProgressFlags.threeQuarters = true;
    showReadingToast("🌟 Tiga perempat lagi, sedikit lagi selesai!");
  } else if (threshold === 100 && !readingProgressFlags.complete) {
    readingProgressFlags.complete = true;
    showReadingToast("🎉 Selamat! Anda sudah menyelesaikan pembacaan pasal ini.", true);
    launchFireworks();
    // Catat KHUSUS event "selesai membaca" (bukan cuma "dibuka") -- supaya
    // laporan Pantau Pembacaan bisa membedakan pasal yang benar-benar
    // digulir sampai akhir dari yang sekadar dibuka sebentar lalu
    // ditinggal. "Baca: " (dicatat saat pasal dibuka) tetap dipakai untuk
    // menghitung V/X harian seperti sebelumnya (README/pola lama tidak
    // diubah supaya kompatibel); ini catatan TAMBAHAN untuk detail.
    if (currentBookNum && currentChapter) {
      const book = BOOKS.find((b) => b.num === currentBookNum);
      const displayName = book ? book.name : "";
      logActivity(`Selesai Baca: ${displayName} ${currentChapter}`);
    }
  }
}

function showReadingToast(text, celebrate) {
  const toast = el("readingProgressToast");
  el("readingProgressToastText").textContent = text;
  toast.classList.toggle("celebrate", !!celebrate);
  toast.hidden = false;
  // paksa reflow supaya transisi "show" selalu jalan walau toast sebelumnya baru saja ditutup
  void toast.offsetWidth;
  toast.classList.add("show");

  if (readingToastHideTimer) clearTimeout(readingToastHideTimer);
  readingToastHideTimer = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => { toast.hidden = true; }, 400);
  }, celebrate ? 4200 : 2600);
}

// Animasi kembang api ringan pakai <canvas>, murni dekoratif & otomatis
// hilang sendiri -- tidak perlu diklik/ditekan sama sekali.
function launchFireworks() {
  const canvas = document.createElement("canvas");
  canvas.id = "fireworksCanvas";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  const colors = ["#e0b354", "#2f6f63", "#c65b4e", "#f2d98a", "#7fb3a3", "#e88a6d"];
  let particles = [];

  function spawnBurst(x, y) {
    const count = 32;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 2 + Math.random() * 3.5;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  // 4 letusan menyebar dengan sedikit jeda, seperti kembang api sungguhan
  const burstPoints = [
    [0.25, 0.35], [0.7, 0.25], [0.5, 0.5], [0.35, 0.65],
  ];
  burstPoints.forEach(([fx, fy], i) => {
    setTimeout(() => spawnBurst(canvas.width * fx, canvas.height * fy), i * 350);
  });

  const startedAt = Date.now();
  const duration = burstPoints.length * 350 + 1800;

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05; // gravitasi ringan
      p.life -= 0.015;
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    particles = particles.filter((p) => p.life > 0);

    if (Date.now() - startedAt < duration || particles.length > 0) {
      requestAnimationFrame(tick);
    } else {
      canvas.remove();
    }
  }
  requestAnimationFrame(tick);
}

function initReadingProgressControl() {
  const enabled = isReadingProgressEnabled();
  el("readingAnimToggle").checked = enabled;
  window.addEventListener("scroll", handleScrollForReadingProgress, { passive: true });
}

// Warna biru pada tanda catatan kaki ("1a", "2", dst di dalam teks ayat --
// lihat js/footnotes.js & .footnote-marker di css/style.css). Disimpan
// PER PENGGUNA seperti pengaturan lain di file ini (lihat js/settings.js).
function isFootnoteAccentBlueEnabled() {
  return getSetting(currentUser, "footnoteAccentBlue") !== false;
}

function applyFootnoteAccentSetting(enabled) {
  document.body.classList.toggle("footnote-accent-off", !enabled);
}

function initFootnoteAccentControl() {
  const enabled = isFootnoteAccentBlueEnabled();
  if (el("footnoteAccentToggle")) el("footnoteAccentToggle").checked = enabled;
  applyFootnoteAccentSetting(enabled);
}

// Header di HP bisa melipat jadi 2-3 baris (lihat @media 640px di CSS)
// tergantung lebar layar/besar huruf antarmuka, jadi tingginya TIDAK selalu
// sama. Sidebar (laci daftar kitab) dulunya diset mulai dari paling atas
// layar (top:0) padahal header ada DI ATASNYA dengan z-index lebih tinggi
// -- akibatnya kitab pertama ("Kejadian") & judul "Perjanjian Lama" suka
// ketutup header dan tidak kelihatan/tidak bisa ditekan. Perbaikannya:
// ukur tinggi header sebenarnya lewat JS, simpan sebagai CSS variable
// --header-h, lalu sidebar (khusus tampilan HP) mulai persis di bawahnya.
function updateHeaderHeightVar() {
  const header = document.querySelector(".app-header");
  if (!header) return;
  document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");
}

// ------------------------------------------------------------
// 16) EVENT UI UMUM
// ------------------------------------------------------------
function closeSidebarOnMobile() {
  if (window.innerWidth <= 859) {
    el("sidebar").classList.remove("open");
    el("sidebarBackdrop").hidden = true;
  }
}

// Tombol ☰ di header: di HP membuka/menutup laci sidebar (perilaku lama),
// di layar lebar (komputer/tablet besar) menyembunyikan/menampilkan kolom
// daftar kitab supaya area baca lebih lebar — pilihan ini diingat untuk
// kunjungan berikutnya (localStorage).
const SIDEBAR_HIDDEN_KEY = "bible_app_sidebar_hidden_v1";
function toggleSidebar() {
  if (window.innerWidth <= 859) {
    el("sidebar").classList.toggle("open");
    el("sidebarBackdrop").hidden = !el("sidebar").classList.contains("open");
  } else {
    const hidden = document.body.classList.toggle("sidebar-hidden");
    localStorage.setItem(SIDEBAR_HIDDEN_KEY, hidden ? "1" : "0");
  }
}
function initSidebarCollapsedState() {
  if (localStorage.getItem(SIDEBAR_HIDDEN_KEY) === "1") {
    document.body.classList.add("sidebar-hidden");
  }
}

// Indikator kecil yang tampil melekat (sticky) di bagian atas layar saat
// pengguna menggulir ke bawah, menunjukkan kitab & pasal yang sedang dibaca
// sekarang (berguna di pasal panjang supaya tidak lupa sedang membaca apa).
let currentReadingLabel = "";
function updateCurrentReadingIndicator(label) {
  currentReadingLabel = label || "";
  const indEl = el("currentReadingIndicator");
  if (indEl) indEl.textContent = "📖 " + currentReadingLabel;
}
function handleScrollForReadingIndicator() {
  const indEl = el("currentReadingIndicator");
  if (!indEl || !currentReadingLabel) return;
  const readerVisible = !el("reader").hidden;
  indEl.hidden = !readerVisible || window.scrollY < 260;
}

function initUIEvents() {
  initSidebarCollapsedState();
  initGlobalOutlineSidebarButtons();

  updateHeaderHeightVar();
  window.addEventListener("resize", updateHeaderHeightVar);
  window.addEventListener("orientationchange", () => setTimeout(updateHeaderHeightVar, 200));
  // Header bisa berubah tinggi setelah font antarmuka/tema diganti atau
  // sesaat setelah halaman selesai memuat gambar/font web -- ukur ulang
  // sesaat kemudian supaya --header-h selalu akurat.
  setTimeout(updateHeaderHeightVar, 500);

  el("sidebarToggle").addEventListener("click", () => {
    toggleSidebar();
    updateHeaderHeightVar();
  });
  el("sidebarBackdrop").addEventListener("click", closeSidebarOnMobile);
  window.addEventListener("scroll", handleScrollForReadingIndicator, { passive: true });

  el("searchForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const query = el("searchInput").value;
    if (!query || !query.trim()) return;

    // MODE TAMU -- setiap kali tombol pencarian ditekan dihitung 1x,
    // dicek + dicatat PUSAT lewat Apps Script (lihat js/guest.js
    // checkAndLog() & apps-script/Code.gs type=guest_search). Kalau
    // sudah kena batas (10x/perangkat/hari ATAU 100x gabungan semua
    // tamu/hari), pencarian DIBATALKAN dan modal penjelasan muncul --
    // tidak lanjut ke handleSearch().
    if (CONFIG.GUEST_MODE_ENABLED && typeof Guest !== "undefined" && Guest.isGuest()) {
      const searchBtn = el("searchForm").querySelector(".search-btn");
      if (searchBtn) searchBtn.disabled = true;
      let result;
      try {
        result = await Guest.checkAndLog();
      } finally {
        if (searchBtn) searchBtn.disabled = false;
      }
      if (!result || !result.allowed) {
        Guest.showLimitReached(result || { reason: "daily", dailyLimit: CONFIG.GUEST_DAILY_LIMIT_PER_DEVICE, totalLimit: CONFIG.GUEST_TOTAL_DAILY_LIMIT });
        return;
      }
    }

    handleSearch(query);
    closeSidebarOnMobile();
  });

  if (el("guestBannerLoginBtn")) {
    el("guestBannerLoginBtn").addEventListener("click", () => {
      if (confirm("Keluar dari Mode Tamu untuk masuk / daftar akun?")) logout();
    });
  }

  el("planToggle").addEventListener("click", () => {
    showPlanPanel();
    closeSidebarOnMobile();
  });

  if (el("announcementBtn")) {
    el("announcementBtn").addEventListener("click", () => {
      el("moreMenu").hidden = true;
      showAnnouncementPanel();
      closeSidebarOnMobile();
    });
  }
  if (el("infoKamiBtn")) {
    el("infoKamiBtn").addEventListener("click", () => {
      el("moreMenu").hidden = true;
      if (typeof InfoKami !== "undefined") InfoKami.open();
      closeSidebarOnMobile();
    });
  }
  if (el("collectionsMenuBtn")) {
    el("collectionsMenuBtn").addEventListener("click", () => {
      el("moreMenu").hidden = true;
      showCollectionsPanel();
      closeSidebarOnMobile();
    });
  }
  if (el("kidungMenuBtn")) {
    el("kidungMenuBtn").addEventListener("click", () => {
      el("moreMenu").hidden = true;
      showKidungPanel();
      closeSidebarOnMobile();
    });
  }
  // Jalan pintas header (☝️ lihat index.html #kidungHeaderBtn) -- SEKARANG
  // jadi tombol TOGGLE 2 arah (permintaan 21 Agu 2026): saat sedang di
  // Alkitab tombolnya "🎵 Buka Kidung" (masuk ke Kidung), begitu sudah di
  // dalam Kidung tombol YANG SAMA berubah jadi "📖 Alkitab" (balik keluar
  // ke bacaan Alkitab terakhir) -- jadi tombol pill "📖 Alkitab" yang
  // dulu terpisah di setiap layar Kidung (kidungAlkitabButton(), dulu di
  // kidungTopRow()) sudah TIDAK dipasang lagi, cukup 1 tombol ini saja.
  // Tampilan tombolnya disinkronkan lewat syncKidungHeaderToggle() di
  // js/kidung-ui.js, dipanggil dari sini + showKidungPanel() + tiap kali
  // hideAllPanels() dipanggil (lihat di bawah).
  if (el("kidungHeaderBtn")) {
    el("kidungHeaderBtn").addEventListener("click", () => {
      if (el("moreMenu")) el("moreMenu").hidden = true;
      if (document.body.classList.contains("kidung-active")) {
        if (typeof goToAlkitabFromKidung === "function") goToAlkitabFromKidung();
      } else {
        showKidungPanel();
      }
      closeSidebarOnMobile();
    });
  }
  if (el("notesMenuBtn")) {
    el("notesMenuBtn").addEventListener("click", () => {
      el("moreMenu").hidden = true;
      showNotesMenuPanel();
      closeSidebarOnMobile();
    });
  }
  if (el("monitorBtn")) {
    el("monitorBtn").addEventListener("click", () => {
      el("moreMenu").hidden = true;
      showMonitorPanel();
      closeSidebarOnMobile();
    });
  }
  if (el("curhatBtn")) {
    el("curhatBtn").addEventListener("click", () => {
      el("moreMenu").hidden = true;
      showCurhatPanel();
      closeSidebarOnMobile();
    });
  }
  if (el("aiChatBtn")) {
    el("aiChatBtn").addEventListener("click", () => {
      el("moreMenu").hidden = true;
      showAiChatPanel();
      closeSidebarOnMobile();
    });
  }
  if (el("logViewerBtn")) {
    el("logViewerBtn").addEventListener("click", () => {
      el("moreMenu").hidden = true;
      showLogPanel();
      closeSidebarOnMobile();
    });
  }
  if (el("langCheckBtn")) {
    el("langCheckBtn").addEventListener("click", () => {
      el("moreMenu").hidden = true;
      showLangCheckPanel();
      closeSidebarOnMobile();
    });
  }

  el("menuToggle").addEventListener("click", () => {
    el("moreMenu").hidden = !el("moreMenu").hidden;
  });
  document.addEventListener("click", (e) => {
    if (!el("moreMenu").hidden && !el("moreMenu").contains(e.target) && e.target !== el("menuToggle")) {
      el("moreMenu").hidden = true;
    }
  });

  // Dulu ada 2 tombol terpisah ("Sinkronkan ulang Alkitab" & "Unduh Data
  // Alkitab") yang ternyata memanggil fungsi persis sama begitu data lokal
  // sudah ada (kondisi normal) -- digabung jadi SATU tombol saja supaya
  // tidak membingungkan. Kalau data lokal masih kosong sama sekali,
  // otomatis diperlakukan sebagai unduhan PERTAMA KALI (pesan & progres
  // sesuai); kalau sudah ada data, ini jadi sinkron ulang biasa.
  el("resyncBtn").addEventListener("click", () => {
    el("moreMenu").hidden = true;
    confirmAndSync(!bibleData.length);
  });
  el("resyncUsersBtn").addEventListener("click", async () => {
    el("moreMenu").hidden = true;
    try {
      await syncUsersFromServer();
      // PENTING: syncUsersFromServer() cuma menulis data BARU (termasuk
      // kolom "Tipe"/premium & "Level") ke penyimpanan lokal (IndexedDB) --
      // tidak otomatis menyegarkan currentUserLevels/currentUserType milik
      // sesi yang SEDANG login di memori. Tanpa baris ini, pengguna yang
      // baru saja ditandai "premium" di Sheet TIDAK akan melihat tab
      // "🕘 Riwayat" atau perubahan level lain sampai logout-login ulang,
      // walau tombol ini sudah menarik data terbaru. Lihat isPremiumUser()
      // di js/levels.js & renderAiChatPanel() di js/aichat.js.
      if (currentUser) await resolveCurrentUserLevels(currentUser);
      updateStatusPanel();
      // Kalau panel AI Chat sedang terbuka saat resync ini ditekan, gambar
      // ulang supaya tab "🕘 Riwayat" langsung muncul/hilang sesuai status
      // premium TERBARU tanpa perlu menutup-buka panel lagi. Cache riwayat
      // lama (_aiChatState.historySessions) dikosongkan supaya kalau tab
      // Riwayat dibuka, datanya ditarik ulang dari server (bukan basi).
      if (el("aiChatPanel") && !el("aiChatPanel").hidden && typeof renderAiChatPanel === "function") {
        if (typeof _aiChatState !== "undefined") {
          _aiChatState.historySessions = null;
          _aiChatState.historyError = "";
        }
        renderAiChatPanel();
      }
      alert("Daftar pengguna berhasil disinkronkan ulang.");
    } catch (e) {
      alert("Gagal menyinkronkan daftar pengguna: " + e.message);
    }
  });
  el("readingAnimToggle").addEventListener("change", (e) => {
    setSetting(currentUser, "readingProgressAnimation", e.target.checked);
    resetReadingProgressFlags(); // supaya tidak langsung "nembak" toast kalau baru dinyalakan lagi
  });
  if (el("footnoteAccentToggle")) {
    el("footnoteAccentToggle").addEventListener("change", (e) => {
      setSetting(currentUser, "footnoteAccentBlue", e.target.checked);
      applyFootnoteAccentSetting(e.target.checked);
    });
  }
  initChangePasswordUI();
  el("logoutBtn").addEventListener("click", () => {
    const guestNow = typeof Guest !== "undefined" && Guest.isGuest();
    const msg = guestNow
      ? "Keluar dari Mode Tamu? Anda akan kembali ke layar Masuk."
      : "Keluar dari aplikasi? Anda perlu memasukkan username & password lagi saat kembali.";
    if (confirm(msg)) logout();
  });
  initScrollTopFloatButton();
}

// ------------------------------------------------------------
// GANTI PASSWORD (menu ⋮) — kosongkan kedua kolom = tidak diganti sama
// sekali (tidak melakukan apa-apa, bukan error). Kalau diisi, harus diisi
// KEDUANYA dan harus SAMA PERSIS sebelum disimpan. Password baru dikirim
// ke Apps Script (tab "PasswordOverrides") supaya berlaku di HP/komputer
// lain juga, dan sekaligus disimpan cadangannya secara lokal di perangkat
// ini supaya bisa langsung dipakai login lagi walau sedang offline.
// ------------------------------------------------------------
function initChangePasswordUI() {
  const btn = el("changePasswordBtn");
  if (!btn) return;
  const newEl = el("changePasswordNew");
  const confirmEl = el("changePasswordConfirm");
  const msgEl = el("changePasswordMsg");

  function showMsg(text, isError) {
    msgEl.hidden = false;
    msgEl.textContent = text;
    msgEl.style.color = isError ? "var(--danger)" : "var(--petrol)";
  }

  btn.addEventListener("click", async () => {
    const a = newEl.value;
    const b = confirmEl.value;
    msgEl.hidden = true;

    // Kosong semua -> tidak ada perubahan sama sekali, bukan error.
    if (!a && !b) {
      showMsg("Kolom dikosongkan, password TIDAK diganti.", false);
      return;
    }
    if (!a || !b) {
      showMsg("Isi kedua kolom (password baru & pengulangannya) untuk mengganti password.", true);
      return;
    }
    if (a !== b) {
      showMsg("Password baru dan pengulangannya tidak sama. Coba lagi.", true);
      return;
    }
    if (a.length < 4) {
      showMsg("Password baru minimal 4 karakter.", true);
      return;
    }
    if (!Sync.enabled()) {
      showMsg("Sinkronisasi (Apps Script) belum dikonfigurasi, jadi password tidak bisa diganti dari sini.", true);
      return;
    }

    btn.disabled = true;
    btn.textContent = "Menyimpan…";
    const ok = await Sync.pushPasswordOverride(currentUser, a);
    btn.disabled = false;
    btn.textContent = "Simpan Password Baru";

    if (ok) {
      // Simpan cadangan lokal juga supaya login berikutnya di perangkat ini
      // langsung bisa pakai password baru walau lagi offline.
      localStorage.setItem(passwordOverrideCacheKey(currentUser), a);
      newEl.value = "";
      confirmEl.value = "";
      showMsg("✓ Password berhasil diganti. Dipakai mulai login berikutnya.", false);
    } else {
      showMsg("Gagal menyimpan password baru. Periksa sambungan internet Anda, lalu coba lagi.", true);
    }
  });
}

// ------------------------------------------------------------
// TOMBOL MELAYANG "TOP" -- lihat #scrollTopFloatBtn di index.html.
// Muncul otomatis setelah scroll ke bawah SAAT sedang membaca pasal
// (article #reader terlihat), tap -> geser layar ke atas (sampai strip
// nomor ayat #verseJumpBar kelihatan lagi) supaya bisa langsung tap
// nomor/titik ayat tanpa scroll manual dulu. Posisi kiri/kanan-bawah
// pindah sendiri menjauhi menu yang sedang terbuka (laci daftar kitab
// di kiri / menu ⋮ di kanan) supaya tidak pernah ketutupan.
// ------------------------------------------------------------
function initScrollTopFloatButton() {
  const btn = el("scrollTopFloatBtn");
  if (!btn) return;

  // PERBAIKAN: tombol ini mulai dengan atribut HTML "hidden" di index.html
  // (supaya tidak kelihatan sekilas sebelum JS siap), tapi kode di bawah
  // ini SEBELUMNYA hanya menambah/melepas class ".visible" & TIDAK PERNAH
  // melepas atribut "hidden" itu sendiri. Karena CSS punya aturan
  // "[hidden] { display: none !important; }", !important itu SELALU
  // menang dari opacity/transform class ".visible" manapun -- akibatnya
  // tombol ini tidak akan pernah benar-benar muncul walau sudah discroll
  // sejauh apa pun. Dilepas SEKALI di sini, sesudahnya tampil/sembunyi
  // sepenuhnya diatur lewat class ".visible" saja (lihat updateVisibility()).
  btn.hidden = false;

  const SHOW_AFTER_PX = 260; // baru muncul setelah scroll turun sejauh ini

  function updatePosition() {
    const sidebarOpen = window.innerWidth <= 859 && el("sidebar") && el("sidebar").classList.contains("open");
    const moreMenuOpen = el("moreMenu") && !el("moreMenu").hidden;
    // Menu ⋮ ada di KANAN -> tombol pindah ke KIRI supaya tidak ketutupan.
    // Laci daftar kitab ada di KIRI -> tombol tetap/pindah ke KANAN.
    // Kalau kebetulan dua-duanya (jarang terjadi) -> ikut menu ⋮ (paling
    // sering dibuka saat sedang scroll baca) supaya tetap terlihat.
    const goLeft = moreMenuOpen && !sidebarOpen;
    btn.classList.toggle("pos-left", goLeft);
    btn.classList.toggle("pos-right", !goLeft);
  }

  function updateVisibility() {
    const readerVisible = el("reader") && !el("reader").hidden;
    if (!readerVisible) {
      btn.classList.remove("visible");
      return;
    }
    btn.classList.toggle("visible", window.scrollY > SHOW_AFTER_PX);
  }

  window.addEventListener("scroll", updateVisibility, { passive: true });
  window.addEventListener("resize", updatePosition);
  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Pantau buka/tutup laci & menu ⋮ lewat MutationObserver (bukan menambah
  // listener di setiap tombol yang membuka/menutupnya satu-satu, supaya
  // tetap benar walau nanti ada tombol baru yang membuka/menutup menu yang
  // sama) -- lihat toggleSidebar()/closeSidebarOnMobile() (class "open"
  // di #sidebar) & menuToggle (atribut "hidden" di #moreMenu).
  if (el("sidebar")) {
    new MutationObserver(updatePosition).observe(el("sidebar"), { attributes: true, attributeFilter: ["class"] });
  }
  if (el("moreMenu")) {
    new MutationObserver(updatePosition).observe(el("moreMenu"), { attributes: true, attributeFilter: ["hidden"] });
  }
  // #reader ganti hidden/tidak setiap pindah menu (baca <-> panel lain) --
  // pantau juga supaya tombol langsung hilang begitu keluar dari halaman baca.
  if (el("reader")) {
    new MutationObserver(updateVisibility).observe(el("reader"), { attributes: true, attributeFilter: ["hidden"] });
  }

  updatePosition();
  updateVisibility();
}

// ------------------------------------------------------------
// MULAI
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  initUIEvents();
  initAuth();
  if (typeof Presentation !== "undefined") Presentation.init();
  if (typeof PresentationStudio !== "undefined") PresentationStudio.init();
  if (typeof Signup !== "undefined") Signup.init();
  if (typeof UserApproval !== "undefined") UserApproval.init();
  if (typeof AdminBell !== "undefined") AdminBell.init();
});
