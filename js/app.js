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

const el = (id) => document.getElementById(id);

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

async function validateLogin(usernameRaw, password) {
  const uname = (usernameRaw || "").trim().toLowerCase();
  if (!uname || !password) return null;

  let users = await LocalDB.getAllUsers();
  let match = users.find((u) => u.username === uname && u.password === password);
  if (match) return match;

  // Belum cocok di data lokal -> coba sinkron ulang (mungkin akun baru / belum pernah sinkron)
  try {
    users = await syncUsersFromServer();
    match = users.find((u) => u.username === uname && u.password === password);
    return match || null;
  } catch (e) {
    return null; // kemungkinan sedang offline dan akun belum ada di cache lokal
  }
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
    await syncFromServer(true);
  }

  // Tarik catatan pribadi & progres rencana baca dari Google Sheet (kalau
  // sudah dikonfigurasi) di latar belakang — tidak menunggu/menghalangi UI.
  if (currentUser) {
    refreshNotesFromRemote(currentUser);
    refreshPlanFromRemote(currentUser);
    refreshSettingsFromRemote(currentUser).then(() => {
      if (el("readingAnimToggle")) el("readingAnimToggle").checked = isReadingProgressEnabled();
    });
  }
}

function setLoadingText(t) {
  el("loadingText").textContent = t;
}
function setLoadingProgress(pct) {
  el("loadingProgress").style.width = pct + "%";
}

async function syncFromServer(isFirstTime) {
  const overlay = el("loadingOverlay");
  overlay.hidden = false;
  setLoadingText(
    isFirstTime
      ? "Mengambil seluruh data Alkitab (semua bahasa) dari server — hanya sekali ini saja, mungkin perlu waktu karena datanya besar…"
      : "Menyinkronkan ulang data Alkitab dari server…"
  );
  setLoadingProgress(5);

  try {
    const res = await fetch(CONFIG.BIBLE_SHEET_CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Gagal mengambil data (" + res.status + ")");
    setLoadingProgress(25);
    const csvText = await res.text();
    setLoadingProgress(45);

    setLoadingText("Membaca data…");
    const records = parseCSV(csvText).map(normalizeVerseRecord).filter((v) => v.verseId);
    setLoadingProgress(55);

    if (!isFirstTime) await LocalDB.clearAll();

    const chunkSize = 4000;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      await LocalDB.bulkPut(chunk);
      const done = Math.min(i + chunkSize, records.length);
      setLoadingProgress(55 + Math.round((done / records.length) * 40));
      setLoadingText(`Menyimpan ke perangkat… (${done.toLocaleString("id-ID")} / ${records.length.toLocaleString("id-ID")} ayat)`);
    }

    await LocalDB.setMeta("lastSync", new Date().toISOString());
    setLoadingProgress(100);

    bibleData = records;
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
  initFullscreenControl();
  initTTS();
  initReadingProgressControl();
  updateStatusPanel();
  showEmptyState();
}

async function updateStatusPanel() {
  const lastBible = await LocalDB.getMeta("lastSync");
  const lastUsers = await LocalDB.getMeta("lastUserSync");
  const n = bibleData.length;
  el("userStatus").textContent = `Masuk sebagai: ${currentUserDisplay || currentUser}`;
  el("syncStatus").textContent =
    `${n.toLocaleString("id-ID")} baris Alkitab tersimpan lokal` +
    (lastBible ? ` — sinkron ${new Date(lastBible).toLocaleString("id-ID")}` : "") +
    (lastUsers ? ` · pengguna sinkron ${new Date(lastUsers).toLocaleString("id-ID")}` : "");
}

// ------------------------------------------------------------
// 3) INDEX DI MEMORI — dibangun sekali agar pembacaan & pencarian instan
//    walau datanya ratusan ribu baris / banyak bahasa
// ------------------------------------------------------------
function buildIndexes() {
  verseIndex = {};
  bibleData.forEach((v) => {
    if (!verseIndex[v.lang]) verseIndex[v.lang] = {};
    if (!verseIndex[v.lang][v.bookNumber]) verseIndex[v.lang][v.bookNumber] = {};
    if (!verseIndex[v.lang][v.bookNumber][v.chapter]) verseIndex[v.lang][v.bookNumber][v.chapter] = [];
    verseIndex[v.lang][v.bookNumber][v.chapter].push(v);
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

  const wrap = el("readerVerses");
  wrap.innerHTML = "";
  verses.forEach((v, idx) => {
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

    block.appendChild(num);
    block.appendChild(textWrap);
    block.addEventListener("click", () => openNoteModal(v));
    wrap.appendChild(block);
  });

  const chapters = getChaptersForBook(currentLang, bookNum);
  const idx = chapters.indexOf(chapter);
  el("prevChapter").disabled = idx <= 0;
  el("nextChapter").disabled = idx === -1 || idx >= chapters.length - 1;
  el("prevChapter").onclick = () => renderChapter(bookNum, chapters[idx - 1]);
  el("nextChapter").onclick = () => renderChapter(bookNum, chapters[idx + 1]);

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

function highlightMatch(text, query) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    text.slice(0, idx) +
    "<mark>" + text.slice(idx, idx + query.length) + "</mark>" +
    text.slice(idx + query.length)
  );
}

function runKeywordSearch(query) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const pool = bibleData.filter((v) => v.lang === currentLang);
  return pool.filter((v) => v.text.toLowerCase().includes(q)).slice(0, 300);
}

function handleSearch(rawQuery) {
  const query = rawQuery.trim();
  if (!query) return;

  const ref = parseReference(query);
  if (ref) {
    if (!bookAvailableInLang(currentLang, ref.book.num)) {
      showLangUnavailable();
      return;
    }
    renderChapter(ref.book.num, ref.chapter, ref.verseStart || null);
    return;
  }

  const results = runKeywordSearch(query);
  hideAllPanels();
  el("searchResults").hidden = false;
  el("searchResultsTitle").textContent = `Hasil pencarian “${query}” (${results.length}${results.length === 300 ? "+" : ""})`;
  const list = el("searchResultsList");
  list.innerHTML = "";

  if (results.length === 0) {
    const p = document.createElement("p");
    p.textContent = "Tidak ditemukan. Coba kata lain, atau gunakan format referensi seperti “kejadian 1:1”.";
    list.appendChild(p);
    return;
  }

  results.forEach((v) => {
    const book = BOOKS.find((b) => b.num === v.bookNumber);
    const btn = document.createElement("button");
    btn.className = "result-item";
    btn.innerHTML = `
      <div class="result-ref">${v.bookName || (book ? book.name : "")} ${v.chapter}:${v.verse}</div>
      <div class="result-text">${highlightMatch(v.text, query)}</div>
    `;
    btn.addEventListener("click", () => renderChapter(v.bookNumber, v.chapter, v.verse));
    list.appendChild(btn);
  });
}

// ------------------------------------------------------------
// 8) RENCANA BACA
// ------------------------------------------------------------
async function showPlanPanel() {
  hideAllPanels();
  el("planPanel").hidden = false;
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
  container.appendChild(grid);
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

  if (nextIdx !== -1 && plan.schedule[nextIdx] && plan.schedule[nextIdx].length) {
    const continueBtn = document.createElement("button");
    continueBtn.className = "chip-btn primary";
    continueBtn.textContent = `▶ Lanjutkan — Hari ${nextIdx + 1}`;
    continueBtn.addEventListener("click", () => {
      renderChapter(plan.schedule[nextIdx][0].bookNum, plan.schedule[nextIdx][0].chapter);
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
  container.appendChild(actions);

  const list = document.createElement("div");
  list.className = "plan-day-list";
  plan.schedule.forEach((dayItems, idx) => {
    const row = document.createElement("div");
    row.className = "plan-day-row" + (plan.completed[idx] ? " done" : "");

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
    label.innerHTML = `<span class="plan-day-num">Hari ${idx + 1}</span><span class="plan-day-reading">${formatDayReading(dayItems)}</span>`;
    label.addEventListener("click", () => {
      if (dayItems.length) {
        renderChapter(dayItems[0].bookNum, dayItems[0].chapter);
        closeSidebarOnMobile();
      }
    });

    row.appendChild(cb);
    row.appendChild(label);
    list.appendChild(row);
  });
  container.appendChild(list);
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
}
function showEmptyState() {
  hideAllPanels();
  el("emptyState").querySelector("p").textContent = "Pilih kitab di sebelah kiri, atau cari ayat / kata di atas.";
  el("emptyState").hidden = false;
}

// ------------------------------------------------------------
// 10) KONTROL LEBAR TAMPILAN (HP / Tablet / Komputer / Penuh / bebas)
// ------------------------------------------------------------
const WIDTH_PRESETS = { mobile: 420, tablet: 720, desktop: 1100, full: 1400 };

function applyWidth(px) {
  el("contentInner").style.setProperty("--content-width", px + "px");
  el("widthSlider").value = px;
  localStorage.setItem("bible_app_width", px);
  document.querySelectorAll(".width-btn").forEach((b) => {
    b.classList.toggle("active", WIDTH_PRESETS[b.dataset.width] === Number(px));
  });
}

function initWidthControl() {
  const saved = parseInt(localStorage.getItem("bible_app_width"), 10) || WIDTH_PRESETS.tablet;
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
// 13) PEMBACAAN SUARA (Web Speech API — memakai suara Google
//     bawaan browser/Android bila tersedia). Tombol Play/Pause
//     membacakan pasal yang sedang terbuka, ayat demi ayat, sambil
//     menyorot ayat yang sedang dibacakan.
// ------------------------------------------------------------
let ttsPlaying = false;
let ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;

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
}

function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  return (
    voices.find((v) => v.lang && v.lang.toLowerCase() === CONFIG.TTS_LANG.toLowerCase()) ||
    voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(CONFIG.TTS_LANG.slice(0, 2).toLowerCase())) ||
    voices.find((v) => /google/i.test(v.name)) ||
    voices[0]
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
    updateTTSButton();
    return;
  }

  if (!currentChapterVerses.length) return;
  window.speechSynthesis.cancel();

  const voice = pickVoice();
  currentChapterVerses.forEach((v, idx) => {
    const utter = new SpeechSynthesisUtterance(`Ayat ${v.verse}. ${v.text}`);
    if (voice) utter.voice = voice;
    utter.lang = CONFIG.TTS_LANG;
    utter.rate = 0.95;
    utter.onstart = () => setSpeakingHighlight(el("v-" + v.id));
    if (idx === currentChapterVerses.length - 1) {
      utter.onend = () => {
        ttsPlaying = false;
        setSpeakingHighlight(null);
        updateTTSButton();
      };
    }
    window.speechSynthesis.speak(utter);
  });

  ttsPlaying = true;
  updateTTSButton();
}

function pauseTTS() {
  if (!ttsSupported) return;
  if (window.speechSynthesis.speaking) window.speechSynthesis.pause();
  ttsPlaying = false;
  updateTTSButton();
}

function stopTTS() {
  if (!ttsSupported) return;
  window.speechSynthesis.cancel();
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
  el("noteModalRef").textContent = `${displayName} ${verse.chapter}:${verse.verse}`;
  el("noteModalVerseText").textContent = verse.text;

  const hasAdminNote = !!(verse.note && verse.note.trim());
  el("noteModalAdminNoteWrap").hidden = !hasAdminNote;
  el("noteModalAdminNote").textContent = hasAdminNote ? verse.note : "";

  el("noteModalTextarea").value = getPersonalNote(currentUser, verse.id);
  el("noteModalSavedHint").hidden = true;

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

// ------------------------------------------------------------
// 16) EVENT UI UMUM
// ------------------------------------------------------------
function closeSidebarOnMobile() {
  if (window.innerWidth <= 859) {
    el("sidebar").classList.remove("open");
    el("sidebarBackdrop").hidden = true;
  }
}

function initUIEvents() {
  initNoteModalEvents();

  el("sidebarToggle").addEventListener("click", () => {
    el("sidebar").classList.toggle("open");
    el("sidebarBackdrop").hidden = !el("sidebar").classList.contains("open");
  });
  el("sidebarBackdrop").addEventListener("click", closeSidebarOnMobile);

  el("searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    handleSearch(el("searchInput").value);
    closeSidebarOnMobile();
  });

  el("planToggle").addEventListener("click", () => {
    showPlanPanel();
    closeSidebarOnMobile();
  });

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
  el("logoutBtn").addEventListener("click", () => {
    if (confirm("Keluar dari aplikasi? Anda perlu memasukkan username & password lagi saat kembali.")) logout();
  });
}

// ------------------------------------------------------------
// MULAI
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  initUIEvents();
  initAuth();
});
