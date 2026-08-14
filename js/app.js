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
let currentUser = null;        // username (huruf kecil) yang sedang login
let currentUserDisplay = null; // nama tampilan
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
  return password === effectivePassword ? match : null;
}

function initAuth() {
  const savedUser = localStorage.getItem(CONFIG.AUTH_STORAGE_KEY);
  if (savedUser) {
    currentUser = savedUser;
    currentUserDisplay = localStorage.getItem(CONFIG.AUTH_DISPLAY_KEY) || savedUser;
    startApp();
    return;
  }

  el("loginScreen").hidden = false;
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

    if (match) {
      currentUser = match.username;
      currentUserDisplay = match.displayName || match.username;
      localStorage.setItem(CONFIG.AUTH_STORAGE_KEY, currentUser);
      localStorage.setItem(CONFIG.AUTH_DISPLAY_KEY, currentUserDisplay);
      el("loginScreen").hidden = true;
      startApp();
    } else {
      el("loginError").hidden = false;
    }
  });
}

function logout() {
  if (typeof stopTTS === "function") stopTTS();
  if (typeof closeNoteModal === "function") closeNoteModal();
  localStorage.removeItem(CONFIG.AUTH_STORAGE_KEY);
  localStorage.removeItem(CONFIG.AUTH_DISPLAY_KEY);
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

  // Tarik catatan pribadi & progres rencana baca dari Google Sheet (kalau
  // sudah dikonfigurasi) di latar belakang — tidak menunggu/menghalangi UI.
  if (currentUser) {
    await resolveCurrentUserLevels(currentUser);
    if (typeof updateStatusPanel === "function") updateStatusPanel();
    refreshNotesFromRemote(currentUser);
    refreshPlanFromRemote(currentUser);
    refreshSettingsFromRemote(currentUser).then(() => {
      if (el("readingAnimToggle")) el("readingAnimToggle").checked = isReadingProgressEnabled();
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
  const connType = detectConnectionType();
  if (connType === "wifi" || connType === "ethernet") {
    // Terdeteksi WiFi/kabel dengan pasti -- langsung unduh seperti biasa,
    // tidak perlu mengganggu dengan dialog tambahan.
    await syncFromServer(true);
    return;
  }
  // connType === "cellular"/"none"/dst, ATAU tidak diketahui sama sekali
  // (null) -- tanya dulu supaya tidak menyedot kuota data seluler tanpa izin.
  showWifiDownloadPrompt(connType);
}

function showWifiDownloadPrompt(connType) {
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
  title.textContent = "📶 Belum terdeteksi WiFi";
  box.appendChild(title);

  const msg = document.createElement("div");
  msg.className = "announcement-big-text";
  msg.textContent = connType === "cellular"
    ? "Perangkat ini sepertinya sedang memakai data seluler. Data Alkitab (semua bahasa) cukup besar — unduh sekarang bisa memakai banyak kuota."
    : "Aplikasi tidak bisa memastikan Anda sedang tersambung WiFi atau data seluler. Data Alkitab (semua bahasa) cukup besar — kalau sedang memakai data seluler, unduh sekarang bisa memakai banyak kuota.";
  box.appendChild(msg);

  const msg2 = document.createElement("div");
  msg2.className = "announcement-big-meta";
  msg2.textContent = "Anda tetap bisa masuk dulu; data Alkitab belum tersedia sampai diunduh (nanti dari menu ⋮ → 📥 Unduh Data Alkitab, ada info progresnya).";
  box.appendChild(msg2);

  const btnRow = document.createElement("div");
  btnRow.className = "round-media-row";
  btnRow.style.marginTop = "12px";

  const laterBtn = document.createElement("button");
  laterBtn.className = "chip-btn small";
  laterBtn.textContent = "⏭️ Masuk Dulu (hemat kuota)";
  laterBtn.addEventListener("click", () => {
    overlay.hidden = true;
    showBibleNotDownloadedState(
      "Data Alkitab belum diunduh (supaya tidak memakai kuota data seluler tanpa izin). Buka menu ⋮ → 📥 Unduh Data Alkitab kapan saja, idealnya saat sudah tersambung WiFi."
    );
  });
  btnRow.appendChild(laterBtn);

  const nowBtn = document.createElement("button");
  nowBtn.className = "chip-btn primary";
  nowBtn.textContent = "📥 Unduh Sekarang Juga";
  nowBtn.addEventListener("click", () => {
    overlay.hidden = true;
    syncFromServer(true);
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

async function syncFromServer(isFirstTime) {
  const overlay = el("loadingOverlay");
  overlay.hidden = false;
  setLoadingText(
    isFirstTime
      ? "Mengambil seluruh data Alkitab (semua bahasa) dari server — hanya sekali ini saja, mungkin perlu waktu karena datanya besar…"
      : "Menyinkronkan ulang data Alkitab dari server…"
  );
  setLoadingProgress(3);

  try {
    // Ambil file CSV. Timeout 2 menit — cukup longgar untuk file besar (puluhan MB),
    // tapi tetap akan menampilkan pesan error yang jelas kalau server benar-benar macet,
    // bukan layar loading diam tanpa penjelasan.
    const res = await fetchWithTimeout(CONFIG.BIBLE_SHEET_CSV_URL, { cache: "no-store" }, 120000);
    if (!res.ok) throw new Error("Gagal mengambil data (" + res.status + ")");
    setLoadingProgress(10);
    const csvText = await res.text();
    setLoadingProgress(18);

    if (!isFirstTime) await LocalDB.clearAll();

    // Baca & simpan bertahap (per ~3000 baris), supaya browser tidak membeku dan
    // progress bar benar-benar mengikuti proses asli — bukan lompat tiba-tiba.
    const allRecords = [];
    let savedCount = 0;

    await parseCSVChunked(csvText, {
      batchSize: 3000,
      onProgress: (done, total) => {
        // 18%–95% dialokasikan untuk tahap membaca + menyimpan data
        const pct = 18 + Math.round((done / total) * 77);
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
    setLoadingProgress(100);

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
  initFullscreenControl();
  initTTS();
  initReadingProgressControl();
  initColumnsControl();
  updateStatusPanel();
  showEmptyState();
}

async function updateStatusPanel() {
  const lastBible = await LocalDB.getMeta("lastSync");
  const lastUsers = await LocalDB.getMeta("lastUserSync");
  const n = bibleData.length;
  const levelText = typeof levelDisplayLabel === "function" ? levelDisplayLabel() : "";
  el("userStatus").textContent = `Masuk sebagai: ${currentUserDisplay || currentUser}` + (levelText ? ` · ${levelText}` : "");
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
function initLanguageSelector() {
  const saved = localStorage.getItem("bible_app_lang");
  const available = CONFIG.LANGUAGES.filter((l) => verseIndex[l.code]);
  currentLang =
    (saved && verseIndex[saved] && saved) ||
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
    localStorage.setItem("bible_app_lang", currentLang);
    if (el("columnLang1")) el("columnLang1").value = currentLang;
    buildSidebar();
    if (currentBookNum && currentChapter) {
      if (bookAvailableInLang(currentLang, currentBookNum)) {
        renderChapter(currentBookNum, currentChapter, highlightVerse);
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

  function applyColumnsUI(count) {
    document.querySelectorAll(".columns-btn").forEach((b) => {
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
    if (currentBookNum && currentChapter) renderChapter(currentBookNum, currentChapter, highlightVerse);
  }

  document.querySelectorAll(".columns-btn").forEach((btn) => {
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
  el("chapterPicker").hidden = false;
  el("chapterPickerTitle").textContent = book.name;
  const grid = el("chapterGrid");
  grid.innerHTML = "";
  sorted.forEach((ch) => {
    const btn = document.createElement("button");
    btn.textContent = ch;
    btn.addEventListener("click", () => renderChapter(bookNum, ch));
    grid.appendChild(btn);
  });
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

  const num = document.createElement("div");
  num.className = "verse-num";
  num.textContent = v.verse;

  const textWrap = document.createElement("div");
  textWrap.className = "verse-text-wrap";
  textWrap.textContent = v.text;

  const hasAdminNote = !!(v.note && v.note.trim());
  const hasPersonalNote = !!getPersonalNote(currentUser, v.id);
  if (hasAdminNote || hasPersonalNote) {
    const badge = document.createElement("span");
    badge.className = "verse-note-badge";
    badge.title = "Ada catatan pada ayat ini — klik ayat untuk membaca";
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

  block.appendChild(num);
  block.appendChild(textWrap);
  block.appendChild(copyBtn);
  block.addEventListener("click", () => openNoteModal(v));
  return block;
}

// Label bahasa untuk judul kolom (mis. "Indonesia (Recovery)"), dipakai di
// tampilan kolom paralel.
function langLabelFor(code) {
  const found = (CONFIG.LANGUAGES || []).find((l) => l.code === code);
  return found ? found.label : code;
}

// Tampilan kolom tunggal (perilaku lama / default).
function renderSingleColumn(wrap, verses, displayName) {
  wrap.classList.remove("reader-columns");
  wrap.removeAttribute("data-cols");
  wrap.innerHTML = "";
  verses.forEach((v, idx) => wrap.appendChild(buildVerseBlock(v, idx, displayName)));
}

// Tampilan beberapa kolom berdampingan (bahasa berbeda per kolom), untuk
// membaca beberapa terjemahan sekaligus. Kolom 1 selalu memakai bahasa
// aktif (langSelect); kolom 2 & 3 memakai bahasa yang dipilih di menu ⋮.
function renderColumnsView(wrap, bookNum, chapter, primaryVerses, displayName, columnsCount, extraLangs) {
  wrap.classList.add("reader-columns");
  wrap.setAttribute("data-cols", String(columnsCount));
  const direction = getSetting(currentUser, "columnDirection") || "side";
  wrap.setAttribute("data-direction", direction);
  wrap.innerHTML = "";

  const columns = [{ lang: currentLang, verses: primaryVerses }];
  for (let i = 0; i < columnsCount - 1; i++) {
    const lang = extraLangs[i];
    const verses = lang ? getChapterVerses(lang, bookNum, chapter) : [];
    columns.push({ lang, verses });
  }

  // Tampilan "menyamping" (side-by-side) dengan >1 kolom: dirender sebagai
  // baris grid per nomor ayat, supaya ayat yang sama sejajar tingginya di
  // semua kolom (tinggi baris grid otomatis mengikuti kolom yang teksnya
  // paling panjang). Tampilan "atas-bawah" (stacked) dan 1 kolom tetap
  // memakai blok kolom independen seperti sebelumnya (tidak perlu sejajar).
  if (direction === "side" && columnsCount > 1) {
    renderColumnsGridAligned(wrap, columns, displayName, columnsCount);
    return;
  }

  columns.forEach((col) => {
    const colEl = document.createElement("div");
    colEl.className = "reader-column";

    const head = document.createElement("div");
    head.className = "reader-column-head";
    head.textContent = col.lang ? langLabelFor(col.lang) : "— pilih bahasa —";
    colEl.appendChild(head);

    const versesWrap = document.createElement("div");
    versesWrap.className = "reader-verses";
    if (col.verses.length === 0) {
      const empty = document.createElement("p");
      empty.style.fontSize = "13px";
      empty.style.color = "var(--ink-soft)";
      empty.textContent = col.lang ? "Pasal ini belum tersedia dalam bahasa ini." : "Pilih bahasa di menu ⋮.";
      versesWrap.appendChild(empty);
    } else {
      col.verses.forEach((v, idx) => versesWrap.appendChild(buildVerseBlock(v, idx, displayName)));
    }
    colEl.appendChild(versesWrap);
    wrap.appendChild(colEl);
  });
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

// ------------------------------------------------------------
// 6) MEMBACA PASAL / AYAT (dari index di memori — instan)
// ------------------------------------------------------------
function renderChapter(bookNum, chapter, verseToHighlight) {
  const book = BOOKS.find((b) => b.num === bookNum);
  const verses = getChapterVerses(currentLang, bookNum, chapter);
  if (!book || verses.length === 0) {
    showLangUnavailable();
    return;
  }

  stopTTS(); // pindah pasal -> hentikan pembacaan suara yang mungkin sedang berjalan

  currentBookNum = bookNum;
  currentChapter = chapter;
  currentChapterVerses = verses;
  highlightVerse = verseToHighlight || null;
  setActiveBookButton(bookNum);

  hideAllPanels();
  el("reader").hidden = false;
  const displayName = verses[0].bookName || book.name;
  el("readerTitle").textContent = `${displayName} ${chapter}`;
  if (el("readerTitleBottom")) el("readerTitleBottom").textContent = `${displayName} ${chapter}`;
  updateCurrentReadingIndicator(`${displayName} ${chapter}`);
  logActivity(`Baca: ${displayName} ${chapter}`);

  const wrap = el("readerVerses");
  const columnsCount = getSetting(currentUser, "columns") || 1;
  const columnLangs = getSetting(currentUser, "columnLangs") || [];
  if (columnsCount > 1) {
    renderColumnsView(wrap, bookNum, chapter, verses, displayName, columnsCount, columnLangs);
  } else {
    renderSingleColumn(wrap, verses, displayName);
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
      findMediaLinkForReference(bookNum, chapter).then((media) => {
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
// Lama/Baru kitabnya (lihat BOOKS di js/books.js, field "testament"); tidak berlaku
// untuk hasil catatan pribadi (catatan tidak selalu terikat satu kitab tertentu).
function runKeywordSearch(query, lang, scope, testament, mode) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return { verseResults: [], noteResults: [] };
  const useLang = lang || currentLang;
  const useScope = scope || "verse";
  const useTestament = testament || "__all__";
  const cap = mode === "max" ? SEARCH_CAP_MAX : SEARCH_CAP_NORMAL;

  let verseResults = [];
  if (useScope === "verse" || useScope === "both") {
    let pool = useLang === "__all__" ? bibleData : bibleData.filter((v) => v.lang === useLang);
    if (useTestament === "PL" || useTestament === "PB") {
      pool = pool.filter((v) => {
        const book = BOOKS.find((b) => b.num === v.bookNumber);
        return book && book.testament === useTestament;
      });
    }
    verseResults = pool.filter((v) => v.text.toLowerCase().includes(q)).slice(0, cap);
  }

  let noteResults = [];
  if (useScope === "notes" || useScope === "both") {
    noteResults = searchInPersonalNotes(q, cap);
  }
  return { verseResults, noteResults, cap };
}

// Mencari di catatan pribadi milik pengguna yang sedang login (js/notes.js).
function searchInPersonalNotes(q, cap) {
  const notes = loadLocalNotes(currentUser);
  const out = [];
  Object.keys(notes).forEach((verseId) => {
    const entry = notes[verseId];
    if (entry && entry.note && entry.note.toLowerCase().includes(q)) {
      out.push({ verseId, note: entry.note, verse: verseById[verseId] || null });
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
    (scope === "both" ? ` (${verseResults.length} di ayat, ${noteResults.length} di catatan)` : "") +
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
    btn.innerHTML = `
      <div class="result-ref">📝 ${ref} <span class="result-note-tag">(catatan Anda)</span></div>
      <div class="result-text">${highlightAllMatches(n.note, query)}</div>
    `;
    btn.addEventListener("click", () => {
      if (n.verse) {
        currentLang = n.verse.lang;
        if (langSelectEl()) langSelectEl().value = n.verse.lang;
        renderChapter(n.verse.bookNumber, n.verse.chapter, n.verse.verse);
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

// Apakah pengumuman ini SEDANG BERLAKU untuk pengguna biasa (bukan administrator):
// status harus "done" (siap tayang, bukan draft/expired), DAN hari ini ada di
// antara ActiveFrom..ActiveUntil (kosong = tidak dibatasi ke arah itu).
function announcementIsLive(a) {
  const status = a.status || "done"; // baris lama (sebelum kolom Status ada) dianggap aktif
  if (status !== "done") return false;
  const today = todayDateStr();
  if (a.activeFrom && today < a.activeFrom) return false;
  if (a.activeUntil && today > a.activeUntil) return false;
  return true;
}

function announcementStatusLabel(a) {
  const status = a.status || "done";
  if (status === "draft") return "📝 Draft";
  if (status === "expired") return "⛔ Expired (ditutup manual)";
  if (announcementIsLive(a)) return "🟢 Aktif sekarang";
  const today = todayDateStr();
  if (a.activeFrom && today < a.activeFrom) return "⏳ Belum waktunya (dijadwalkan)";
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
  const list = await Sync.pullAnnouncements();
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
  const { ok, list } = await Sync.pullAnnouncementsChecked();
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

  if (isAdministrator()) {
    const composeWrap = document.createElement("div");
    composeWrap.className = "announcement-compose";
    composeWrap.innerHTML = `
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
      <button id="announcementComposeBtn" class="chip-btn primary">Kirim Pengumuman</button>
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
      btn.textContent = "Mengirim…";
      const ok = await Sync.pushAnnouncement(currentUser, cleanText, activeFrom, activeUntil, status, visibleTo);
      btn.disabled = false;
      btn.textContent = "Kirim Pengumuman";
      if (ok) {
        ta.value = "";
        showAnnouncementPanel();
      } else {
        alert("Gagal mengirim pengumuman. Pastikan Apps Script sudah dikonfigurasi.");
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
      ? `📅 ${a.activeFrom || "…"} s/d ${a.activeUntil || "…"}`
      : "📅 Tanpa batas tanggal";
    const targetTxt = (!a.visibleTo || a.visibleTo === "all") ? "🌐 Semua pengguna" : `🎯 ${a.visibleTo}`;
    item.innerHTML = `
      <div class="announcement-text"></div>
      <div class="announcement-meta">${a.createdBy || ""}${when ? " · " + when : ""}</div>
      ${isAdministrator() ? `<div class="announcement-meta">${rangeTxt} · ${announcementStatusLabel(a)} · ${targetTxt}</div>` : ""}
    `;
    item.querySelector(".announcement-text").textContent = a.text; // textContent -> aman dari HTML asing
    if (isAdministrator()) {
      const delBtn = document.createElement("button");
      delBtn.className = "chip-btn small danger-outline";
      delBtn.textContent = "Hapus";
      delBtn.addEventListener("click", async () => {
        if (!confirm("Hapus pengumuman ini?")) return;
        await Sync.deleteAnnouncement(currentUser, a.id);
        showAnnouncementPanel();
      });
      item.appendChild(delBtn);
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
        renderChapter(entryItem.verse.bookNumber, entryItem.verse.chapter, entryItem.verse.verse);
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
function handleAddToCollection(verse) {
  if (!verse) return;
  const collections = loadCollections(currentUser);
  const names = Object.values(collections).map((c) => c.name);
  const hint = names.length
    ? `Kumpulan yang sudah ada: ${names.join(", ")}.\n\nKetik salah satu nama di atas untuk menambah ke situ, atau ketik nama baru untuk membuat kumpulan baru:`
    : 'Nama kumpulan ayat (mis. "SPR 17 Agustus 2026"):';
  const name = prompt(hint);
  if (!name || !name.trim()) return;
  addVerseToCollection(currentUser, name.trim(), verse.id);
  logActivity("Simpan ke Kumpulan Ayat");
  alert(`Ayat disimpan ke kumpulan "${name.trim()}".`);
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
      row.appendChild(delBtn);
      list.appendChild(row);
    });
  container.appendChild(list);
}

function renderCollectionDetailInto(container, id, col) {
  const backBtn = document.createElement("button");
  backBtn.className = "chip-btn";
  backBtn.textContent = "← Semua Kumpulan";
  backBtn.addEventListener("click", () => renderCollectionsPanel());
  container.appendChild(backBtn);

  const titleRow = document.createElement("div");
  titleRow.className = "collection-title-row";
  const title = document.createElement("h2");
  title.textContent = "📚 " + col.name;
  titleRow.appendChild(title);
  if (col.verseIds.length) {
    const fsBtn = document.createElement("button");
    fsBtn.className = "chip-btn primary";
    fsBtn.textContent = "⛶ Mode Layar Penuh";
    fsBtn.addEventListener("click", () => openCollectionFullscreen(col, 0));
    titleRow.appendChild(fsBtn);
  }
  container.appendChild(titleRow);

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
      currentLang = v.lang;
      if (el("langSelect")) el("langSelect").value = v.lang;
      renderChapter(v.bookNumber, v.chapter, v.verse);
    });
    item.querySelector(".col-remove-btn").addEventListener("click", () => {
      removeVerseFromCollection(currentUser, id, verseId);
      renderCollectionsPanel(id);
    });

    // Tombol BULAT 🎵MP3/🎬MP4/▶️YouTube (kalau kitab+pasal ayat ini ada di
    // salah satu sheet Bacaan Bersuara) -- dicari di latar belakang supaya
    // daftar kumpulan tetap tampil instan, tombolnya menyusul begitu
    // ketemu. Lihat findMediaLinkForReference()/buildInlineMediaBlock() di
    // js/media.js -- pemutarnya muncul LANGSUNG di sini, bukan tab baru.
    if (v && typeof findMediaLinkForReference === "function") {
      findMediaLinkForReference(v.bookNumber, v.chapter).then((media) => {
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

  function render() {
    overlay.innerHTML = "";
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
    overlay.appendChild(fontRow);

    const box = document.createElement("div");
    box.className = "collection-fs-box";

    const refEl = document.createElement("div");
    refEl.className = "collection-fs-ref";
    refEl.textContent = `${ref}  ·  ${idx + 1} / ${total}`;
    box.appendChild(refEl);

    const textEl = document.createElement("div");
    textEl.className = "collection-fs-text";
    textEl.style.fontSize = currentFontSize() + "px";
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
    hint.textContent = "Gunakan tombol panah kiri/kanan di papan ketik untuk pindah ayat.";
    overlay.appendChild(hint);
  }

  function goPrev() {
    if (idx > 0) { idx -= 1; render(); }
  }
  function goNext() {
    if (idx < total - 1) { idx += 1; render(); }
  }
  function onKeyDown(e) {
    if (e.key === "ArrowLeft") goPrev();
    else if (e.key === "ArrowRight") goNext();
    else if (e.key === "Escape") closeOverlay();
  }
  function closeOverlay() {
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
  const header = ["Username", "Tanggal", "Jam", "OS", "IP", "Menu", "Pencarian"];
  const escCsv = (v) => {
    const s = String(v == null ? "" : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [header.join(",")].concat(
    rows.map((l) => [l.username, l.date, l.time, l.os, l.ip, l.menu, l.search].map(escCsv).join(","))
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

// state filter panel log disimpan di luar fungsi supaya tetap diingat
// selama sesi ini kalau panel dibuka-tutup berkali-kali
const _logPanelState = { days: "30", userFilter: "", textFilter: "", rows: [] };

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
    <button id="logApplyBtn" class="chip-btn primary" type="button">Terapkan</button>
    <button id="logSaveBtn" class="chip-btn" type="button">💾 Simpan sebagai CSV</button>
  `;
  container.appendChild(controls);
  controls.querySelector("#logDaysSelect").value = _logPanelState.days;
  controls.querySelector("#logUserFilter").value = _logPanelState.userFilter;
  controls.querySelector("#logTextFilter").value = _logPanelState.textFilter;

  const tableWrap = document.createElement("div");
  tableWrap.className = "log-table-wrap";
  tableWrap.innerHTML = `<p class="media-empty">Memuat log…</p>`;
  container.appendChild(tableWrap);

  controls.querySelector("#logApplyBtn").addEventListener("click", () => {
    _logPanelState.userFilter = controls.querySelector("#logUserFilter").value.trim().toLowerCase();
    _logPanelState.textFilter = controls.querySelector("#logTextFilter").value.trim().toLowerCase();
    loadAndRenderLogPanel(controls.querySelector("#logDaysSelect").value);
  });
  controls.querySelector("#logSaveBtn").addEventListener("click", () => saveLogAsCsv(_logPanelState.rows));

  const daysNum = Number(_logPanelState.days) || 0;
  const logs = await Sync.pullLogs(currentUser, daysNum);
  let filtered = logs;
  if (_logPanelState.userFilter) {
    filtered = filtered.filter((l) => (l.username || "").toLowerCase().indexOf(_logPanelState.userFilter) !== -1);
  }
  if (_logPanelState.textFilter) {
    filtered = filtered.filter((l) =>
      (String(l.menu || "") + " " + String(l.search || "")).toLowerCase().indexOf(_logPanelState.textFilter) !== -1
    );
  }
  _logPanelState.rows = filtered;

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

  const shown = filtered.slice(0, 500);
  const table = document.createElement("table");
  table.className = "log-table";
  table.innerHTML =
    "<thead><tr><th>Tanggal</th><th>Jam</th><th>Pengguna</th><th>OS</th><th>IP</th><th>Menu</th><th>Pencarian</th></tr></thead>" +
    "<tbody>" +
    shown.map((l) => `
      <tr>
        <td>${escapeHtml(l.date)}</td>
        <td>${escapeHtml(l.time)}</td>
        <td>${escapeHtml(l.username)}</td>
        <td>${escapeHtml(l.os)}</td>
        <td>${escapeHtml(l.ip)}</td>
        <td>${escapeHtml(l.menu)}</td>
        <td>${escapeHtml(l.search)}</td>
      </tr>`).join("") +
    "</tbody>";
  tableWrap.appendChild(table);

  if (filtered.length > shown.length) {
    const note = document.createElement("p");
    note.className = "media-empty";
    note.textContent = `Menampilkan ${shown.length} baris terbaru dari ${filtered.length}. Persempit dengan filter pengguna/kata, atau tekan "💾 Simpan sebagai CSV" untuk mendapat semuanya.`;
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

async function renderMonitorPanel(selectedUsername, showPinEditor) {
  const container = el("monitorPanel");
  container.innerHTML = "";
  const title = document.createElement("h2");
  title.textContent = "👀 Pantau Pembacaan Alkitab (7 Hari)";
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

  // Daftar yang ditampilkan di dropdown: daftar pilihan (domba-domba) kalau
  // ada isinya, atau semua orang yang boleh dipantau kalau belum memilih.
  const users = pins.length ? allUsers.filter((u) => pins.includes(u.username) || u.username === currentUser) : allUsers;

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
  container.appendChild(controls);

  const tableWrap = document.createElement("div");
  tableWrap.className = "monitor-table-wrap";
  tableWrap.innerHTML = `<p class="media-empty">Memuat…</p>`;
  container.appendChild(tableWrap);

  const logs = await Sync.pullLogs(currentUser, 8); // buffer 8 hari supaya aman dari selisih jam/zona
  const targetUser = users.find((u) => u.username === target);
  const readLogs = logs.filter(
    (l) => (l.username || "").toLowerCase() === target && String(l.menu || "").indexOf("Baca: ") === 0
  );

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      key: d.toLocaleDateString("id-ID"),
      label: d.toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short" }),
    });
  }

  const rows = days.map((day) => {
    const entries = readLogs.filter((l) => l.date === day.key);
    if (!entries.length) return { label: day.label, read: false, start: "-", end: "-", count: 0 };
    const times = entries
      .map((e) => new Date(e.updatedAt))
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a - b);
    const fmt = (d) => d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    return {
      label: day.label,
      read: true,
      start: times.length ? fmt(times[0]) : "-",
      end: times.length ? fmt(times[times.length - 1]) : "-",
      count: entries.length,
    };
  });
  const readCount = rows.filter((r) => r.read).length;

  tableWrap.innerHTML = "";
  const summary = document.createElement("p");
  summary.className = "monitor-summary";
  summary.textContent = `${targetUser ? (targetUser.displayName || targetUser.username) : target}: membaca ${readCount} dari 7 hari terakhir.`;
  tableWrap.appendChild(summary);

  const table = document.createElement("table");
  table.className = "monitor-table";
  table.innerHTML =
    "<thead><tr><th>Tanggal</th><th>Baca?</th><th>Jam Awal</th><th>Jam Akhir</th><th>Jml Pasal</th></tr></thead>" +
    "<tbody>" +
    rows.map((r) => `
      <tr class="${r.read ? "monitor-row-read" : "monitor-row-unread"}">
        <td>${escapeHtml(r.label)}</td>
        <td class="monitor-symbol">${r.read ? "V" : "X"}</td>
        <td>${escapeHtml(r.start)}</td>
        <td>${escapeHtml(r.end)}</td>
        <td>${r.count || ""}</td>
      </tr>`).join("") +
    "</tbody>";
  tableWrap.appendChild(table);

  const note = document.createElement("p");
  note.className = "media-empty";
  note.textContent = `Dihitung dari log "Baca: …" (minimal membuka 1 pasal pada hari itu). Jam mengikuti waktu perangkat yang dipakai membaca.`;
  tableWrap.appendChild(note);
}

// ------------------------------------------------------------
// 9) TAMPILAN / PANEL
// ------------------------------------------------------------
function hideAllPanels() {
  el("chapterPicker").hidden = true;
  el("searchResults").hidden = true;
  el("reader").hidden = true;
  el("emptyState").hidden = true;
  el("planPanel").hidden = true;
  if (el("announcementPanel")) el("announcementPanel").hidden = true;
  if (el("notesPanel")) el("notesPanel").hidden = true;
  if (el("collectionsPanel")) el("collectionsPanel").hidden = true;
  if (el("logPanel")) el("logPanel").hidden = true;
  if (el("monitorPanel")) el("monitorPanel").hidden = true;
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
  for (let i = 2; i <= 17; i++) document.body.classList.remove("theme-" + i);
  if (id && id !== 1) document.body.classList.add("theme-" + id);
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
    };
  } catch (e) {
    return { lang: CONFIG.TTS_LANG || "id-ID", gender: "any", rate: 1.0, readNotes: false };
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
      spoken += ` Catatan. ${noteHtmlToPlainText(v.note)}`;
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
// 14) MODAL CATATAN AYAT — muncul saat sebuah ayat diklik.
//     Menampilkan catatan dari Sheet Alkitab (kalau ada) DAN
//     catatan pribadi milik pengguna (bisa ditulis & disimpan,
//     tersinkron ke Google Sheet lewat js/sync.js + js/notes.js).
// ------------------------------------------------------------
let noteModalCurrentVerse = null;

function openNoteModal(verse) {
  noteModalCurrentVerse = verse;
  const book = BOOKS.find((b) => b.num === verse.bookNumber);
  const displayName = verse.bookName || (book ? book.name : "");
  const refLabel = `${displayName} ${verse.chapter}:${verse.verse}`;
  el("noteModalRef").textContent = refLabel;
  el("noteModalVerseText").textContent = verse.text;

  const hasAdminNote = !!(verse.note && verse.note.trim());
  el("noteModalAdminNoteWrap").hidden = !hasAdminNote;
  // Catatan bisa berisi markup HTML dasar (mis. <p>, <sup>) dari sumbernya
  // (mis. rvind/rveng) — dirender sebagai HTML (disaring dulu supaya aman),
  // bukan ditampilkan sebagai teks tag mentah.
  el("noteModalAdminNote").innerHTML = hasAdminNote ? sanitizeNoteHtml(verse.note) : "";

  el("noteModalTextarea").value = getPersonalNote(currentUser, verse.id);
  el("noteModalSavedHint").hidden = true;

  const copyVerseBtn = el("noteModalCopyVerseBtn");
  if (copyVerseBtn) {
    copyVerseBtn.onclick = () => copyTextWithFeedback(`${refLabel}\n${verse.text}`, copyVerseBtn);
  }
  const copyNoteBtn = el("noteModalCopyNoteBtn");
  if (copyNoteBtn) {
    copyNoteBtn.hidden = !hasAdminNote;
    copyNoteBtn.onclick = () => copyTextWithFeedback(`${refLabel} — Catatan:\n${noteHtmlToPlainText(verse.note)}`, copyNoteBtn);
  }

  el("noteModalBackdrop").hidden = false;
}

function closeNoteModal() {
  el("noteModalBackdrop").hidden = true;
  noteModalCurrentVerse = null;
}

function saveNoteFromModal() {
  if (!noteModalCurrentVerse) return;
  const text = el("noteModalTextarea").value;
  setPersonalNote(currentUser, noteModalCurrentVerse.id, text);

  // perbarui badge 📝 pada ayat yang sedang tampil, kalau ada
  const block = el("v-" + noteModalCurrentVerse.id);
  if (block) {
    const textWrap = block.querySelector(".verse-text-wrap");
    const existingBadge = textWrap.querySelector(".verse-note-badge");
    const hasAnyNote = !!(noteModalCurrentVerse.note && noteModalCurrentVerse.note.trim()) || !!text.trim();
    if (hasAnyNote && !existingBadge) {
      const badge = document.createElement("span");
      badge.className = "verse-note-badge";
      badge.title = "Ada catatan pada ayat ini — klik ayat untuk membaca";
      badge.textContent = "📝";
      textWrap.appendChild(badge);
    } else if (!hasAnyNote && existingBadge) {
      existingBadge.remove();
    }
  }

  el("noteModalSavedHint").hidden = false;
  setTimeout(() => { el("noteModalSavedHint").hidden = true; }, 2000);
}

function initNoteModalEvents() {
  el("noteModalClose").addEventListener("click", closeNoteModal);
  el("noteModalBackdrop").addEventListener("click", (e) => {
    if (e.target === el("noteModalBackdrop")) closeNoteModal();
  });
  el("noteModalSaveBtn").addEventListener("click", saveNoteFromModal);
  if (el("noteModalAddCollectionBtn")) {
    el("noteModalAddCollectionBtn").addEventListener("click", () => handleAddToCollection(noteModalCurrentVerse));
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !el("noteModalBackdrop").hidden) closeNoteModal();
  });
}

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
  initNoteModalEvents();
  initSidebarCollapsedState();

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

  el("searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    handleSearch(el("searchInput").value);
    closeSidebarOnMobile();
  });

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
  if (el("collectionsMenuBtn")) {
    el("collectionsMenuBtn").addEventListener("click", () => {
      el("moreMenu").hidden = true;
      showCollectionsPanel();
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
  if (el("logViewerBtn")) {
    el("logViewerBtn").addEventListener("click", () => {
      el("moreMenu").hidden = true;
      showLogPanel();
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

  el("resyncBtn").addEventListener("click", () => {
    el("moreMenu").hidden = true;
    syncFromServer(false);
  });
  el("downloadBibleBtn").addEventListener("click", () => {
    el("moreMenu").hidden = true;
    // Kalau memang belum ada data sama sekali (baru saja "masuk dulu" tanpa
    // unduh), perlakukan sebagai unduhan PERTAMA (pesan & progres sesuai);
    // kalau sudah ada data, ini jadi sinkron ulang biasa.
    syncFromServer(!bibleData.length);
  });
  el("resyncUsersBtn").addEventListener("click", async () => {
    el("moreMenu").hidden = true;
    try {
      await syncUsersFromServer();
      updateStatusPanel();
      alert("Daftar pengguna berhasil disinkronkan ulang.");
    } catch (e) {
      alert("Gagal menyinkronkan daftar pengguna: " + e.message);
    }
  });
  el("readingAnimToggle").addEventListener("change", (e) => {
    setSetting(currentUser, "readingProgressAnimation", e.target.checked);
    resetReadingProgressFlags(); // supaya tidak langsung "nembak" toast kalau baru dinyalakan lagi
  });
  initChangePasswordUI();
  el("logoutBtn").addEventListener("click", () => {
    if (confirm("Keluar dari aplikasi? Anda perlu memasukkan username & password lagi saat kembali.")) logout();
  });
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
// MULAI
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  initUIEvents();
  initAuth();
});
