// ============================================================
// 📖 LIFE-STUDY OF THE BIBLE / PELAJARAN HAYAT (BARU, 6 Sep 2026)
// ============================================================
// "Ide 1" yang disepakati sebelumnya: KITA TIDAK menyalin atau
// menerjemahkan isi Life-Study sama sekali -- isinya berhak cipta milik
// Living Stream Ministry, dan terjemahan Indonesia resminya ("Pelajaran-
// Hayat") malah dijual berbayar (Google Play Books / Yasperin.com), jadi
// menyediakan salinan gratis di app ini berisiko melanggar hak
// penerbitnya. Yang kita lakukan cuma:
//   1. Membuka LINK ASLI bibleread.online (Inggris, gratis) di tab baru.
//   2. Mengarahkan pengguna memakai fitur BAWAAN Chrome (Terjemahkan /
//      Dengarkan halaman ini) untuk versi Indonesia/Mandarin & suara --
//      ini legal (kontennya tetap di server aslinya) & gratis.
//   3. Mencatat SENDIRI "terakhir dibaca sampai pesan keberapa" di app
//      ini (fitur yang TIDAK ada di situs aslinya).
//
// Jumlah pesan (`total`) per kitab diambil dari 500lifestudies.org
// (dikelola Living Stream Ministry sendiri, totalnya cocok dengan angka
// resmi 1.984 pesan). Kitab-kitab kecil yang ASLINYA diterbitkan
// DIGABUNG dalam 1 volume (mis. 1 & 2 Tesalonika jadi 1 buku, 12 Nabi
// Kecil jadi 1 buku) ditandai `grouped:true` -- `total` di situ adalah
// TOTAL GABUNGAN semua kitab dalam volume itu, BUKAN pasti angka persis
// kitab itu SENDIRI (situsnya tetap punya halaman terpisah per kitab,
// cuma kita belum sempat mengecek satu-satu batas pesan tiap kitab di
// dalam volume gabungan itu -- lihat `groupLabel` untuk keterangannya).
// ------------------------------------------------------------
const LIFE_STUDY_BOOKS = [
  // --- Perjanjian Baru ---
  { slug: "matthew", num: 40, name: "Matius", total: 72, testament: "PB" },
  { slug: "mark", num: 41, name: "Markus", total: 70, testament: "PB" },
  { slug: "luke", num: 42, name: "Lukas", total: 79, testament: "PB" },
  { slug: "john", num: 43, name: "Yohanes", total: 51, testament: "PB" },
  { slug: "acts", num: 44, name: "Kisah Para Rasul", total: 72, testament: "PB" },
  { slug: "romans", num: 45, name: "Roma", total: 69, testament: "PB" },
  { slug: "1-corinthians", num: 46, name: "1 Korintus", total: 69, testament: "PB" },
  { slug: "2-corinthians", num: 47, name: "2 Korintus", total: 59, testament: "PB" },
  { slug: "galatians", num: 48, name: "Galatia", total: 46, testament: "PB" },
  { slug: "ephesians", num: 49, name: "Efesus", total: 97, testament: "PB" },
  { slug: "philippians", num: 50, name: "Filipi", total: 62, testament: "PB" },
  { slug: "colossians", num: 51, name: "Kolose", total: 65, testament: "PB" },
  { slug: "1-thessalonians", num: 52, name: "1 Tesalonika", total: 31, testament: "PB", grouped: true, groupLabel: "gabungan dengan 2 Tesalonika" },
  { slug: "2-thessalonians", num: 53, name: "2 Tesalonika", total: 31, testament: "PB", grouped: true, groupLabel: "gabungan dengan 1 Tesalonika" },
  { slug: "1-timothy", num: 54, name: "1 Timotius", total: 28, testament: "PB", grouped: true, groupLabel: "gabungan dengan 2 Timotius, Titus, Filemon" },
  { slug: "2-timothy", num: 55, name: "2 Timotius", total: 28, testament: "PB", grouped: true, groupLabel: "gabungan dengan 1 Timotius, Titus, Filemon" },
  { slug: "titus", num: 56, name: "Titus", total: 28, testament: "PB", grouped: true, groupLabel: "gabungan dengan 1&2 Timotius, Filemon" },
  { slug: "philemon", num: 57, name: "Filemon", total: 28, testament: "PB", grouped: true, groupLabel: "gabungan dengan 1&2 Timotius, Titus" },
  { slug: "hebrews", num: 58, name: "Ibrani", total: 69, testament: "PB" },
  { slug: "james", num: 59, name: "Yakobus", total: 14, testament: "PB" },
  { slug: "1-peter", num: 60, name: "1 Petrus", total: 34, testament: "PB" },
  { slug: "2-peter", num: 61, name: "2 Petrus", total: 13, testament: "PB" },
  { slug: "1-john", num: 62, name: "1 Yohanes", total: 44, testament: "PB", grouped: true, groupLabel: "gabungan dengan 2&3 Yohanes" },
  { slug: "2-john", num: 63, name: "2 Yohanes", total: 44, testament: "PB", grouped: true, groupLabel: "gabungan dengan 1&3 Yohanes" },
  { slug: "3-john", num: 64, name: "3 Yohanes", total: 44, testament: "PB", grouped: true, groupLabel: "gabungan dengan 1&2 Yohanes" },
  { slug: "jude", num: 65, name: "Yudas", total: 5, testament: "PB" },
  { slug: "revelation", num: 66, name: "Wahyu", total: 68, testament: "PB" },
  // --- Perjanjian Lama ---
  { slug: "genesis", num: 1, name: "Kejadian", total: 120, testament: "PL" },
  { slug: "exodus", num: 2, name: "Keluaran", total: 185, testament: "PL" },
  { slug: "leviticus", num: 3, name: "Imamat", total: 64, testament: "PL" },
  { slug: "numbers", num: 4, name: "Bilangan", total: 53, testament: "PL" },
  { slug: "deuteronomy", num: 5, name: "Ulangan", total: 30, testament: "PL" },
  { slug: "joshua", num: 6, name: "Yosua", total: 15, testament: "PL" },
  { slug: "judges", num: 7, name: "Hakim-hakim", total: 10, testament: "PL" },
  { slug: "ruth", num: 8, name: "Rut", total: 8, testament: "PL" },
  { slug: "1-samuel", num: 9, name: "1 Samuel", total: 38, testament: "PL", grouped: true, groupLabel: "gabungan dengan 2 Samuel" },
  { slug: "2-samuel", num: 10, name: "2 Samuel", total: 38, testament: "PL", grouped: true, groupLabel: "gabungan dengan 1 Samuel" },
  { slug: "1-kings", num: 11, name: "1 Raja-raja", total: 23, testament: "PL", grouped: true, groupLabel: "gabungan dengan 2 Raja-raja" },
  { slug: "2-kings", num: 12, name: "2 Raja-raja", total: 23, testament: "PL", grouped: true, groupLabel: "gabungan dengan 1 Raja-raja" },
  { slug: "1-chronicles", num: 13, name: "1 Tawarikh", total: 26, testament: "PL", grouped: true, groupLabel: "gabungan dengan 2 Tawarikh, Ezra, Nehemia, Ester" },
  { slug: "2-chronicles", num: 14, name: "2 Tawarikh", total: 26, testament: "PL", grouped: true, groupLabel: "gabungan dengan 1 Tawarikh, Ezra, Nehemia, Ester" },
  { slug: "ezra", num: 15, name: "Ezra", total: 26, testament: "PL", grouped: true, groupLabel: "gabungan dengan 1&2 Tawarikh, Nehemia, Ester" },
  { slug: "nehemiah", num: 16, name: "Nehemia", total: 26, testament: "PL", grouped: true, groupLabel: "gabungan dengan 1&2 Tawarikh, Ezra, Ester" },
  { slug: "esther", num: 17, name: "Ester", total: 26, testament: "PL", grouped: true, groupLabel: "gabungan dengan 1&2 Tawarikh, Ezra, Nehemia" },
  { slug: "job", num: 18, name: "Ayub", total: 38, testament: "PL" },
  { slug: "psalms", num: 19, name: "Mazmur", total: 45, testament: "PL" },
  { slug: "proverbs", num: 20, name: "Amsal", total: 20, testament: "PL", grouped: true, groupLabel: "gabungan dengan Pengkhotbah, Kidung Agung" },
  { slug: "ecclesiastes", num: 21, name: "Pengkhotbah", total: 20, testament: "PL", grouped: true, groupLabel: "gabungan dengan Amsal, Kidung Agung" },
  { slug: "song-of-songs", num: 22, name: "Kidung Agung", total: 20, testament: "PL", grouped: true, groupLabel: "gabungan dengan Amsal, Pengkhotbah" },
  { slug: "isaiah", num: 23, name: "Yesaya", total: 54, testament: "PL" },
  { slug: "jeremiah", num: 24, name: "Yeremia", total: 44, testament: "PL", grouped: true, groupLabel: "gabungan dengan Ratapan" },
  { slug: "lamentations", num: 25, name: "Ratapan", total: 44, testament: "PL", grouped: true, groupLabel: "gabungan dengan Yeremia" },
  { slug: "ezekiel", num: 26, name: "Yehezkiel", total: 27, testament: "PL" },
  { slug: "daniel", num: 27, name: "Daniel", total: 17, testament: "PL" },
  { slug: "hosea", num: 28, name: "Hosea", total: 35, testament: "PL", grouped: true, groupLabel: "gabungan Nabi-nabi Kecil (Hosea s/d Maleakhi kecuali Zakharia)" },
  { slug: "joel", num: 29, name: "Yoel", total: 35, testament: "PL", grouped: true, groupLabel: "gabungan Nabi-nabi Kecil" },
  { slug: "amos", num: 30, name: "Amos", total: 35, testament: "PL", grouped: true, groupLabel: "gabungan Nabi-nabi Kecil" },
  { slug: "obadiah", num: 31, name: "Obaja", total: 35, testament: "PL", grouped: true, groupLabel: "gabungan Nabi-nabi Kecil" },
  { slug: "jonah", num: 32, name: "Yunus", total: 35, testament: "PL", grouped: true, groupLabel: "gabungan Nabi-nabi Kecil" },
  { slug: "micah", num: 33, name: "Mikha", total: 35, testament: "PL", grouped: true, groupLabel: "gabungan Nabi-nabi Kecil" },
  { slug: "nahum", num: 34, name: "Nahum", total: 35, testament: "PL", grouped: true, groupLabel: "gabungan Nabi-nabi Kecil" },
  { slug: "habakkuk", num: 35, name: "Habakuk", total: 35, testament: "PL", grouped: true, groupLabel: "gabungan Nabi-nabi Kecil" },
  { slug: "zephaniah", num: 36, name: "Zefanya", total: 35, testament: "PL", grouped: true, groupLabel: "gabungan Nabi-nabi Kecil" },
  { slug: "haggai", num: 37, name: "Hagai", total: 35, testament: "PL", grouped: true, groupLabel: "gabungan Nabi-nabi Kecil" },
  { slug: "zechariah", num: 38, name: "Zakharia", total: 15, testament: "PL" },
  { slug: "malachi", num: 39, name: "Maleakhi", total: 35, testament: "PL", grouped: true, groupLabel: "gabungan Nabi-nabi Kecil" },
];

const LIFE_STUDY_BASE_URL = "https://bibleread.online/life-study-of-the-bible/life-study-of-";

// ------------------------------------------------------------
// Penyimpanan progres -- localStorage dipakai sebagai CACHE INSTAN
// (supaya panel tetap responsif & tetap jalan offline), TAPI SEKARANG
// (6 Sep 2026, permintaan operator: "minta bisa sinkron di perangkat
// lain") juga dikirim ke Google Sheet lewat Sync.saveLifeStudyProgress()/
// Sync.setLifeStudyMode() (js/sync.js -> apps-script/Code.gs,
// saveLifeStudyProgress_()/saveLifeStudyMode_()) di LATAR BELAKANG
// (fire-and-forget, tidak menunggu/tidak memblokir UI -- pola sama
// seperti kebanyakan sinkron lain di app ini). Saat panel dibuka,
// refreshLifeStudyFromServer() menarik versi server & MENIMPA cache
// lokal (server dianggap sumber kebenaran, supaya progres yang dicatat
// dari perangkat LAIN ikut kelihatan) baru merender ulang.
// Best-effort: kalau kolom "LifeStudyProgressJson"/"LifeStudyMode" belum
// ditambahkan ke Sheet Pengguna, permintaan sinkron akan gagal diam-diam
// dari sisi server (dikembalikan {ok:false,error:...}) -- fitur TETAP
// jalan normal secara lokal saja, cuma tidak ikut lintas perangkat.
// ------------------------------------------------------------
const LIFESTUDY_PROGRESS_KEY = "bible_app_lifestudy_progress_v1";
const LIFESTUDY_MODE_KEY = "bible_app_lifestudy_mode_v1"; // "auto" | "manual" -- GLOBAL, bukan per-kitab

function loadLifeStudyProgress(username) {
  try {
    const all = JSON.parse(localStorage.getItem(LIFESTUDY_PROGRESS_KEY) || "{}");
    return all[username] || {};
  } catch (e) { return {}; }
}
function saveLifeStudyProgressLocal_(username, slug, messageNum) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(LIFESTUDY_PROGRESS_KEY) || "{}"); } catch (e) {}
  if (!all[username]) all[username] = {};
  all[username][slug] = messageNum;
  try { localStorage.setItem(LIFESTUDY_PROGRESS_KEY, JSON.stringify(all)); } catch (e) {}
}
// Dipanggil dari UI (tombol "▶️ Buka" mode otomatis & tombol "📍 Tandai")
// -- simpan lokal DULU (instan), baru kirim ke server di latar belakang.
function saveLifeStudyProgress(username, slug, messageNum) {
  saveLifeStudyProgressLocal_(username, slug, messageNum);
  if (typeof Sync !== "undefined" && Sync.enabled()) {
    Sync.saveLifeStudyProgress(username, slug, messageNum).catch(() => {});
  }
}
// BAWAAN "auto" -- permintaan operator persis: "settingkan defaultnya
// dibuat otomatis, tetapi kalau tidak mau maka bisa ganti manual".
function getLifeStudyMode() {
  return localStorage.getItem(LIFESTUDY_MODE_KEY) === "manual" ? "manual" : "auto";
}
function setLifeStudyMode(mode) {
  const val = mode === "manual" ? "manual" : "auto";
  try { localStorage.setItem(LIFESTUDY_MODE_KEY, val); } catch (e) {}
  if (typeof Sync !== "undefined" && Sync.enabled() && typeof currentUser !== "undefined" && currentUser) {
    Sync.setLifeStudyMode(currentUser, val).catch(() => {});
  }
}

// BARU (6 Sep 2026) -- tarik progres+mode dari server (kalau sinkron
// aktif) & timpa cache lokal, dipanggil SEKALI setiap panel dibuka
// (showLifeStudyPanel() di bawah) SEBELUM render pertama, supaya
// progres dari perangkat lain langsung kelihatan tanpa perlu apa-apa
// lagi dari pengguna.
async function refreshLifeStudyFromServer_(username) {
  if (typeof Sync === "undefined" || !Sync.enabled()) return;
  try {
    const res = await Sync.getLifeStudyProgress(username);
    if (!res || !res.ok) return;
    if (res.progress && typeof res.progress === "object") {
      let all = {};
      try { all = JSON.parse(localStorage.getItem(LIFESTUDY_PROGRESS_KEY) || "{}"); } catch (e) {}
      all[username] = res.progress;
      try { localStorage.setItem(LIFESTUDY_PROGRESS_KEY, JSON.stringify(all)); } catch (e) {}
    }
    if (res.mode === "auto" || res.mode === "manual") {
      try { localStorage.setItem(LIFESTUDY_MODE_KEY, res.mode); } catch (e) {}
    }
  } catch (e) {
    // offline / server belum di-deploy ulang -- diamkan, pakai cache lokal apa adanya
  }
}

function lifeStudyUrlFor(slug, messageNum) {
  const n = Math.max(1, Math.round(Number(messageNum) || 1));
  return `${LIFE_STUDY_BASE_URL}${slug}/${n}/`;
}

function showLifeStudyPanel() {
  hideAllPanels();
  el("lifeStudyPanel").hidden = false;
  if (typeof logActivity === "function") logActivity("Life-Study / Pelajaran Hayat");
  renderLifeStudyPanel();
  // BARU (6 Sep 2026) -- tarik progres terbaru dari server (kalau ada
  // progres yang dicatat dari perangkat LAIN) baru render ULANG. Panel
  // sudah tampil duluan dengan data lokal (instan, di atas) supaya tidak
  // terasa nge-lag menunggu jaringan -- begitu hasil server datang,
  // tampilan diperbarui diam-diam tanpa mengganggu (kecuali panel sudah
  // ditutup lagi sebelum jawaban server datang -- dicek `el("lifeStudyPanel").hidden`).
  if (typeof currentUser !== "undefined" && currentUser) {
    refreshLifeStudyFromServer_(currentUser).then(() => {
      if (!el("lifeStudyPanel").hidden) renderLifeStudyPanel();
    });
  }
}

function renderLifeStudyPanel() {
  const container = el("lifeStudyPanel");
  container.innerHTML = "";

  const header = document.createElement("div");
  header.className = "collection-title-row";
  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "chip-btn";
  backBtn.textContent = "← Kembali";
  backBtn.addEventListener("click", () => { container.hidden = true; });
  const title = document.createElement("h2");
  title.textContent = "📖 Life-Study / Pelajaran Hayat";
  header.appendChild(title);
  container.appendChild(backBtn);
  container.appendChild(header);

  const intro = document.createElement("p");
  intro.className = "lifestudy-intro";
  intro.innerHTML = 'Daftar ini membuka LINK ASLI <a href="https://bibleread.online/life-study-of-the-bible/" target="_blank" rel="noopener">bibleread.online</a> (Bahasa Inggris, gratis, terbitan Living Stream Ministry) di tab baru — BUKAN salinan. Untuk terjemahan ke Bahasa Indonesia/Mandarin dan dibacakan suara, pakai fitur BAWAAN Chrome setelah link terbuka: ketuk ⋮ (titik tiga) → <b>Terjemahkan</b>, dan ⋮ → <b>Dengarkan halaman ini</b>.';
  container.appendChild(intro);

  // Toggle mode otomatis/manual.
  const modeRow = document.createElement("label");
  modeRow.className = "more-menu-toggle lifestudy-mode-toggle";
  const modeText = document.createElement("span");
  modeText.textContent = "🔄 Catat otomatis saat tombol \"Buka\" ditekan";
  const modeSwitchWrap = document.createElement("span");
  modeSwitchWrap.className = "toggle-switch";
  const modeInput = document.createElement("input");
  modeInput.type = "checkbox";
  modeInput.checked = getLifeStudyMode() === "auto";
  const modeSlider = document.createElement("span");
  modeSlider.className = "toggle-slider";
  modeInput.addEventListener("change", () => {
    setLifeStudyMode(modeInput.checked ? "auto" : "manual");
    renderLifeStudyPanel(); // render ulang supaya hint & tombol per-baris ikut menyesuaikan
  });
  modeSwitchWrap.appendChild(modeInput);
  modeSwitchWrap.appendChild(modeSlider);
  modeRow.appendChild(modeText);
  modeRow.appendChild(modeSwitchWrap);
  container.appendChild(modeRow);

  const modeHint = document.createElement("p");
  modeHint.className = "lifestudy-mode-hint";
  modeHint.textContent = getLifeStudyMode() === "auto"
    ? "AKTIF: setiap kali tombol \"▶️ Buka\" ditekan, nomor itu LANGSUNG tercatat sebagai posisi terakhir dibaca."
    : "NONAKTIF (manual): tombol \"▶️ Buka\" TIDAK mencatat apa-apa -- pakai tombol \"📍 Tandai\" di sebelahnya untuk mencatat posisi sendiri, kapan saja, tanpa harus membuka link.";
  container.appendChild(modeHint);

  const noteWarn = document.createElement("p");
  noteWarn.className = "lifestudy-note-warn";
  noteWarn.textContent = "Catatan disimpan di PERANGKAT INI SAJA (belum ikut tersinkron ke akun di perangkat lain) — kabari kalau ini perlu ditambahkan juga.";
  container.appendChild(noteWarn);

  const progress = loadLifeStudyProgress(currentUser);

  ["PB", "PL"].forEach((testament) => {
    const sectionTitle = document.createElement("h3");
    sectionTitle.className = "lifestudy-section-title";
    sectionTitle.textContent = testament === "PB" ? "Perjanjian Baru" : "Perjanjian Lama";
    container.appendChild(sectionTitle);
    LIFE_STUDY_BOOKS.filter((b) => b.testament === testament).forEach((book) => {
      container.appendChild(renderLifeStudyBookRow(book, progress[book.slug]));
    });
  });
}

// ------------------------------------------------------------
// BARU (7 Sep 2026, permintaan operator) -- "🔖 Rujukan Pelajaran Hayat"
// di dalam CATATAN PRIBADI ayat (js/app.js, buildInlineNoteCardEl()).
// PENTING soal batas yang SENGAJA dijaga di sini: ini CUMA menyisipkan
// TEKS RUJUKAN (nama kitab + nomor pesan + link asli bibleread.online)
// ke kotak catatan pribadi milik USER SENDIRI -- SAMA SEKALI TIDAK
// mengambil/menyalin ISI Life-Study yang sebenarnya dari mana pun.
// Warna pastel highlight ayatnya sendiri sudah ada fiturnya (ketuk nomor
// ayat -> openHighlightPopup(), js/app.js) -- tidak perlu diubah apa-apa
// di sana, tinggal dipakai bersamaan dengan catatan ini.
// ------------------------------------------------------------
function openInsertLifeStudyRefDialog(bookNum, onInsert) {
  const defaultBook = LIFE_STUDY_BOOKS.find((b) => b.num === bookNum) || LIFE_STUDY_BOOKS[0];
  showSimpleDialog("📖 Sisipkan Rujukan Pelajaran Hayat", (box) => {
    const hint = document.createElement("p");
    hint.className = "simple-dialog-hint";
    hint.textContent = "Ini cuma menyisipkan RUJUKAN (nama kitab + nomor pesan + link asli) ke catatan pribadi Anda -- bukan menyalin isi Pelajaran Hayat itu sendiri.";
    box.appendChild(hint);

    const field1 = document.createElement("div");
    field1.className = "simple-dialog-field";
    const label1 = document.createElement("label");
    label1.textContent = "Kitab:";
    field1.appendChild(label1);
    const bookSel = document.createElement("select");
    ["PB", "PL"].forEach((testament) => {
      const group = document.createElement("optgroup");
      group.label = testament === "PB" ? "Perjanjian Baru" : "Perjanjian Lama";
      LIFE_STUDY_BOOKS.filter((b) => b.testament === testament).forEach((b) => {
        const opt = document.createElement("option");
        opt.value = b.slug;
        opt.textContent = b.name + " (" + b.total + " pesan)";
        if (b.slug === defaultBook.slug) opt.selected = true;
        group.appendChild(opt);
      });
      bookSel.appendChild(group);
    });
    field1.appendChild(bookSel);
    box.appendChild(field1);

    const field2 = document.createElement("div");
    field2.className = "simple-dialog-field";
    const label2 = document.createElement("label");
    label2.textContent = "Nomor pesan:";
    field2.appendChild(label2);
    const msgInput = document.createElement("input");
    msgInput.type = "number";
    msgInput.min = "1";
    msgInput.value = "1";
    field2.appendChild(msgInput);
    box.appendChild(field2);

    const field3 = document.createElement("div");
    field3.className = "simple-dialog-field";
    const label3 = document.createElement("label");
    label3.textContent = "Keterangan (opsional, mis. \"¶3\" atau \"bagian ttg iman\"):";
    field3.appendChild(label3);
    const detailInput = document.createElement("input");
    detailInput.type = "text";
    detailInput.placeholder = "mis. paragraf ke-3";
    field3.appendChild(detailInput);
    box.appendChild(field3);

    setTimeout(() => msgInput.focus(), 0);

    return () => {
      const book = LIFE_STUDY_BOOKS.find((b) => b.slug === bookSel.value);
      const n = Math.max(1, Math.round(Number(msgInput.value) || 1));
      const detail = detailInput.value.trim();
      const url = lifeStudyUrlFor(book.slug, n);
      const label = `📖 Pelajaran Hayat ${book.name}, Pesan ${n}${detail ? " (" + detail + ")" : ""} — ${url}`;
      return label;
    };
  }, (refText) => onInsert(refText), "Sisipkan");
}

function renderLifeStudyBookRow(book, lastRead) {
  const row = document.createElement("div");
  row.className = "lifestudy-book-row";
  row.id = "lifestudy-row-" + book.slug; // BARU (6 Sep 2026) -- target scroll/sorot dari openLifeStudyForBook()

  const info = document.createElement("div");
  info.className = "lifestudy-book-info";
  const nameEl = document.createElement("span");
  nameEl.className = "lifestudy-book-name";
  nameEl.textContent = book.name;
  info.appendChild(nameEl);
  const totalEl = document.createElement("span");
  totalEl.className = "lifestudy-book-total";
  totalEl.textContent = book.grouped ? `(≈${book.total} pesan — ${book.groupLabel})` : `(${book.total} pesan)`;
  info.appendChild(totalEl);
  const progressEl = document.createElement("span");
  progressEl.className = "lifestudy-book-progress";
  progressEl.textContent = lastRead ? `Terakhir: pesan ${lastRead}` : "Belum dibaca";
  info.appendChild(progressEl);
  row.appendChild(info);

  const controls = document.createElement("div");
  controls.className = "lifestudy-book-controls";
  const input = document.createElement("input");
  input.type = "number";
  input.min = "1";
  input.className = "lifestudy-msg-input";
  input.value = lastRead ? Math.min(lastRead + 1, book.total) : 1;
  controls.appendChild(input);

  const openBtn = document.createElement("button");
  openBtn.type = "button";
  openBtn.className = "chip-btn small primary";
  openBtn.textContent = "▶️ Buka";
  openBtn.title = "Buka pesan ini di tab baru (bibleread.online, link asli)";
  openBtn.addEventListener("click", () => {
    const n = Math.max(1, Math.round(Number(input.value) || 1));
    window.open(lifeStudyUrlFor(book.slug, n), "_blank", "noopener");
    if (getLifeStudyMode() === "auto") {
      saveLifeStudyProgress(currentUser, book.slug, n);
      progressEl.textContent = `Terakhir: pesan ${n}`;
    }
  });
  controls.appendChild(openBtn);

  const markBtn = document.createElement("button");
  markBtn.type = "button";
  markBtn.className = "chip-btn small";
  markBtn.textContent = "📍 Tandai";
  markBtn.title = "Catat nomor ini sebagai posisi terakhir dibaca, TANPA membuka link";
  markBtn.addEventListener("click", () => {
    const n = Math.max(1, Math.round(Number(input.value) || 1));
    saveLifeStudyProgress(currentUser, book.slug, n);
    progressEl.textContent = `Terakhir: pesan ${n}`;
  });
  controls.appendChild(markBtn);

  row.appendChild(controls);
  return row;
}

// ------------------------------------------------------------
// BARU (6 Sep 2026, permintaan operator: "bisa dibuka lewat alkitab,
// seperti pokok alkitab") -- akses Life-Study LANGSUNG dari halaman
// pemilih pasal (sidebar), persis di sebelah tombol "📌 Pokok"/
// "📋 Garis Besar Kitab"/"🗺️ Peta+Gambar" yang sudah ada -- lihat
// renderChapterPickerExtraReserved() (js/app.js), dipanggil dari sana.
// BEDA dari 3 tombol itu (yang cuma muncul kalau sheet-nya ADA datanya
// untuk kitab itu): tombol ini SELALU muncul untuk SEMUA 66 kitab, jadi
// dicek lewat LIFE_STUDY_BOOKS (data statis di atas), bukan sheet.
// ------------------------------------------------------------
function buildLifeStudyButtonIfAny(box, book, bookNum) {
  const ls = LIFE_STUDY_BOOKS.find((b) => b.num === bookNum);
  if (!ls) return; // seharusnya tidak pernah terjadi (66 kitab semua ada), jaga-jaga saja
  const b = document.createElement("button");
  b.type = "button";
  b.className = "chip-btn small book-info-btn lifestudy-book-info-btn";
  b.textContent = "📖 Pelajaran Hayat";
  b.title = "Buka Life-Study / Pelajaran Hayat kitab " + book.name;
  b.addEventListener("click", () => openLifeStudyForBook(bookNum));
  box.appendChild(b);
}

// Buka panel Life-Study, lalu gulir & sorot sebentar baris kitab yang
// sedang dibaca -- supaya operator tidak perlu mencari sendiri di
// antara 66 baris.
function openLifeStudyForBook(bookNum) {
  const book = LIFE_STUDY_BOOKS.find((b) => b.num === bookNum);
  if (!book) return;
  showLifeStudyPanel();
  requestAnimationFrame(() => {
    const rowEl = document.getElementById("lifestudy-row-" + book.slug);
    if (!rowEl) return;
    rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
    rowEl.classList.add("lifestudy-row-highlight");
    setTimeout(() => rowEl.classList.remove("lifestudy-row-highlight"), 2200);
  });
}
