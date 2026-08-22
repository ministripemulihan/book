// ============================================================
//  UI "🎵 Kidung" — MENU UTAMA (bukan Studio Presentasi), dibuka dari
//  menu ☰ / "Lainnya" seperti "📚 Kumpulan Ayat" dkk, supaya bisa
//  langsung dipakai di HP maupun komputer. Lapisan data (sinkron, 
//  parsing, ambil bait+koor, teks bagikan) SUDAH ada semua di
//  js/kidung.js -- file ini KHUSUS tampilan & alur klik saja, pola
//  penulisannya sama seperti js/collections.js (renderCollectionsPanel
//  dkk) supaya konsisten dengan bagian app yang lain.
//
//  VERSI PERTAMA (20 Agu 2026) -- sengaja hanya bagian INTI dulu
//  sesuai permintaan ("yang penting dulu... bisa muncul & dipakai"):
//    - Layar depan: pilih buku (Kidung/Suplemen/dst, otomatis dari
//      data), ketik nomor lalu "Buka", atau tombol pintas Cari &
//      Daftar Semua.
//    - Layar baca: header (No/judul/pengarang/birama), semua bait
//      berselang koor (kalau ada), tombol "🔗 Bagikan" (sudah jadi,
//      dari js/kidung.js), & navigasi nomor sebelum/sesudah.
//  UPDATE (20 Agu 2026): layar baca sekarang punya toolbar bawah bisa
//  disembunyikan/ditampilkan (buildKidungToolbar()) berisi panah
//  ⬅️/➡️ pindah nomor, "🔗 Bagikan", & pemutar sebaris MP3(x2)/MP4/
//  YouTube + unduh MIDI (pakai buildInlineMediaBlock() dari
//  js/media.js, sama seperti Rencana Baca). Juga tombol "📖 Alkitab" di
//  SETIAP layar Kidung (kidungTopRow()) supaya pindah balik ke bacaan
//  Alkitab 1 sentuh, pasangan dari #kidungHeaderBtn di header (index.html)
//  yang membawa dari Alkitab masuk ke Kidung.
//  BELUM ada (menyusul, lihat referensi tangkapan layar app "Kidung"
//  yang dikirim -- 4 ikon: 🔍 cari, 📋 daftar, ❤️ favorit, ⚙️
//  pengaturan):
//    - ❤️ Favorit (perlu tempat penyimpanan per pengguna, mis. pola
//      sama seperti js/highlights.js).
//    - ⚙️ Pengaturan tampilan (ukuran huruf, dst -- pola sama seperti
//      pengaturan Kumpulan Ayat mode Layar Penuh di js/app.js).
//    - Filter tag (SPR/Pemuda/Remaja/dst) & kategori di layar Daftar.
// ============================================================

let kidungCurrentBuku = "Kidung";

// FIX (20 Agu 2026) — bug "Kidung No. 95 tidak ditemukan" di HP padahal
// di komputer ketemu: data Kidung di IndexedDB tiap perangkat SEBELUMNYA
// cuma disinkron 1x (saat unduh awal Alkitab pertama kali, lihat
// resyncKidungSheet() di js/app.js syncFromServer()), lalu di sini di
// renderKidungHome() HANYA disinkron ulang kalau datanya BENAR-BENAR
// KOSONG sama sekali (`if (!count)`). Begitu kidung baru ditambah admin
// di Google Sheet SETELAH sebuah HP sinkron pertama kalinya, HP itu
// tidak akan pernah tahu ada kidung baru -- refresh browser/logout-login
// TIDAK membantu karena IndexedDB memang persisten & tidak disentuh oleh
// keduanya (beda perangkat = beda IndexedDB = beda "kapan terakhir
// sinkron", makanya bisa beda antara komputer & 2 HP walau akun sama).
// Timestamp (ms) sinkron LATAR BELAKANG terakhir dalam sesi ini -- dipakai
// throttle di renderKidungHome() supaya tidak menyinkron ulang tiap kali
// panel Kidung dibuka berturut-turut (datanya kecil ~800 KB jadi murah,
// tapi tetap tidak perlu diulang tiap beberapa detik).
let kidungLastBgSyncAt = 0;

// ⌨️ Navigasi kidung sebelumnya/selanjutnya PAKAI KEYBOARD (BARU, 21 Agu
// 2026) -- tombol ◀/▶ di buildKidungToolbar() sekarang juga bisa ditekan
// lewat tombol panah kiri/kanan papan ketik, tidak cuma diklik/disentuh.
// Listener-nya dipasang cuma SAAT pembaca kidung (openKidungReader) lagi
// tampil, dan WAJIB dicopot lagi begitu pindah ke tampilan Kidung LAIN
// (Beranda/Cari/Daftar -- semuanya berbagi elemen <div id="kidungPanel">
// yang sama, cuma innerHTML-nya diganti-ganti) supaya tidak menumpuk
// beberapa listener sekaligus atau tetap aktif padahal pembaca sudah
// tidak kelihatan lagi.
let _kidungReaderKeyHandler = null;
function teardownKidungReaderKeyNav() {
  if (_kidungReaderKeyHandler) {
    document.removeEventListener("keydown", _kidungReaderKeyHandler);
    _kidungReaderKeyHandler = null;
  }
}
function setupKidungReaderKeyNav(prevBtn, nextBtn) {
  teardownKidungReaderKeyNav();
  _kidungReaderKeyHandler = (e) => {
    // Dikecualikan kalau fokus sedang di kotak isian (mis. sedang
    // mengetik di kotak nomor/pencarian) supaya panah kiri/kanan di
    // situ tetap berfungsi normal (pindah kursor teks), bukan malah
    // pindah kidung.
    const tag = (document.activeElement && document.activeElement.tagName) || "";
    if (tag === "SELECT" || tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.key === "ArrowLeft") {
      if (!prevBtn.disabled) { e.preventDefault(); prevBtn.click(); }
    } else if (e.key === "ArrowRight") {
      if (!nextBtn.disabled) { e.preventDefault(); nextBtn.click(); }
    }
  };
  document.addEventListener("keydown", _kidungReaderKeyHandler);
}

async function showKidungPanel() {
  hideAllPanels();
  const panel = el("kidungPanel");
  if (!panel) return;
  panel.hidden = false;
  // Tandai <body> "lagi di Kidung" -- dipakai css/style.css untuk
  // menyembunyikan kotak "Cari Alkitab" di header KHUSUS di lebar HP
  // (lihat body.kidung-active .search-form), supaya di layar sempit
  // tidak berebut tempat dengan syair yang sedang dibaca. Ditaruh di
  // <body> (bukan panel Kidung sendiri) karena kotak carinya ada di
  // <header>, di LUAR panel-panel konten. Dilepas lagi otomatis begitu
  // panel LAIN dibuka, lewat hideAllPanels() di js/app.js.
  document.body.classList.add("kidung-active");
  syncKidungHeaderToggle();
  logActivity && typeof logActivity === "function" && logActivity("Kidung");
  await renderKidungHome();
}

// Menyamakan tampilan #kidungHeaderBtn (index.html, di baris ikon header)
// dengan mode saat ini -- lihat catatan panjang di js/app.js dekat
// pemasangan event click-nya. Dipanggil setiap kali body.kidung-active
// berubah (showKidungPanel() di atas + hideAllPanels() di js/app.js),
// jadi TIDAK PERNAH keliru walau berpindah panel lewat jalan lain
// (mis. "← Kembali" berkali-kali, atau klik menu lain langsung).
function syncKidungHeaderToggle() {
  const btn = el("kidungHeaderBtn");
  if (!btn) return;
  const inKidung = document.body.classList.contains("kidung-active");
  btn.textContent = inKidung ? "📖" : "🎵";
  btn.title = inKidung ? "Kembali ke Alkitab (pasal terakhir dibaca)" : "Buka Kidung";
  btn.setAttribute("aria-label", btn.title);
  btn.classList.toggle("kidung-header-btn-active", inKidung);
}

function kidungBackButton(onClick) {
  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "chip-btn small";
  backBtn.textContent = "← Kembali";
  backBtn.addEventListener("click", onClick);
  return backBtn;
}

// CATATAN (21 Agu 2026): tombol pill "📖 Alkitab" yang dulu ada di sini
// SUDAH DIHAPUS -- fungsinya sekarang diambil alih #kidungHeaderBtn di
// header (jadi tombol toggle 🎵⇄📖, lihat syncKidungHeaderToggle() di
// atas + wiring click-nya di js/app.js), supaya tidak ada 2 tombol
// berbeda untuk 1 fungsi yang sama. goToAlkitabFromKidung() di bawah
// tetap dipertahankan, dipanggil dari #kidungHeaderBtn.

// Tombol "🎨" -- pemilih tema tampilan, jalan pintas dari DALAM Kidung
// supaya tidak perlu buka menu "⋮" -> gulung ke bagian "Tema tampilan"
// dulu. Memakai DAFTAR TEMA & applyTheme() yang SAMA PERSIS dengan
// #themePicker di menu "⋮" (lihat THEMES/applyTheme() di js/app.js) --
// tema itu dipasang di <html> jadi otomatis berlaku juga untuk panel
// Kidung, cukup tombol ini membuka pop-up kecil berisi swatch yang sama.
function kidungThemeButton() {
  const wrap = document.createElement("div");
  wrap.className = "kidung-theme-btn-wrap";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "chip-btn small round kidung-theme-btn";
  btn.textContent = "🎨";
  btn.title = "Ganti tema tampilan";
  btn.setAttribute("aria-label", "Ganti tema tampilan");

  const popover = document.createElement("div");
  popover.className = "kidung-theme-popover theme-picker";
  popover.hidden = true;

  function renderSwatches() {
    popover.innerHTML = "";
    if (typeof THEMES === "undefined") return;
    const saved = parseInt(localStorage.getItem(THEME_STORAGE_KEY), 10) || 1;
    THEMES.forEach((t) => {
      const swatch = document.createElement("button");
      swatch.type = "button";
      swatch.className = "theme-swatch";
      if (t.id === saved) swatch.classList.add("active");
      swatch.title = t.name;
      swatch.setAttribute("aria-label", "Tema " + t.name);
      swatch.style.background = t.swatch;
      swatch.style.color = t.ink;
      swatch.addEventListener("click", () => {
        if (typeof applyTheme === "function") applyTheme(t.id);
        renderSwatches();
      });
      popover.appendChild(swatch);
    });
  }

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const willShow = popover.hidden;
    document.querySelectorAll(".kidung-theme-popover").forEach((p) => (p.hidden = true));
    if (willShow) { renderSwatches(); popover.hidden = false; }
  });
  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) popover.hidden = true;
  });

  wrap.appendChild(btn);
  wrap.appendChild(popover);
  return wrap;
}

// Baris atas standar tiap layar Kidung: "← Kembali" (opsional, kosongkan
// `onBack` untuk layar paling depan yang tidak punya "atas"-nya lagi di
// dalam Kidung) + "🎨" ganti tema (selalu ada, di SEMUA layar Kidung).
// (Tombol "📖 Alkitab" yang dulu ada di sini sudah pindah jadi toggle di
// #kidungHeaderBtn -- lihat catatan di atas.)
function kidungTopRow(onBack) {
  const row = document.createElement("div");
  row.className = "kidung-top-row";
  if (onBack) row.appendChild(kidungBackButton(onBack));
  row.appendChild(kidungThemeButton());
  return row;
}

// Balik dari panel Kidung ke bacaan Alkitab: buka lagi pasal Alkitab
// TERAKHIR dibaca (currentBookNum/currentChapter, variabel global di
// js/app.js -- ikut ter-update tiap kali renderChapter() dipanggil),
// atau tampilan kosong (showEmptyState()) kalau sesi ini belum pernah
// buka pasal apa pun (mis. app baru dibuka lalu langsung ke Kidung).
function goToAlkitabFromKidung() {
  if (typeof currentBookNum !== "undefined" && typeof currentChapter !== "undefined" && currentBookNum && currentChapter) {
    renderChapter(currentBookNum, currentChapter, typeof highlightVerse !== "undefined" ? highlightVerse : null);
  } else if (typeof showEmptyState === "function") {
    showEmptyState();
  }
  if (typeof closeSidebarOnMobile === "function") closeSidebarOnMobile();
}

async function renderKidungHome() {
  const panel = el("kidungPanel");
  if (!panel) return;
  teardownKidungReaderKeyNav(); // keluar dari pembaca (kalau lagi aktif) -- lihat catatan di atas
  panel.innerHTML = "";

  panel.appendChild(kidungTopRow(null)); // layar paling depan Kidung -- tanpa "← Kembali"

  const title = document.createElement("h2");
  title.textContent = "🎵 Kidung";
  panel.appendChild(title);

  // Pastikan datanya sudah ada di HP ini -- kalau IndexedDB masih
  // kosong (mis. app baru pertama kali dibuka & sinkron latar
  // belakang belum sempat selesai / belum ada koneksi saat itu),
  // coba sinkron sekali lagi di sini supaya panel ini tidak nampak
  // kosong melompong padahal datanya sebenarnya ada di Sheet.
  let count = 0;
  try { count = await LocalDB.countKidungRows(); } catch (e) { count = 0; }
  if (!count) {
    const loading = document.createElement("p");
    loading.className = "chapter-picker-loading";
    loading.textContent = "Memuat data kidung…";
    panel.appendChild(loading);
    try {
      await resyncKidungSheet();
    } catch (e) {
      loading.textContent = "Gagal memuat data kidung (periksa koneksi internet), lalu buka menu ini lagi.";
      return;
    }
    try { count = await LocalDB.countKidungRows(); } catch (e) { count = 0; }
    if (!count) {
      loading.textContent = "Data kidung belum tersedia. Hubungi administrator.";
      return;
    }
    loading.remove();
  } else {
    // FIX: data SUDAH ada (count > 0) -- tapi belum tentu TERBARU (lihat
    // catatan kidungLastBgSyncAt di atas). Sinkron ulang diam-diam di
    // LATAR BELAKANG (tidak menghalangi tampilan yang sudah ada) tiap kali
    // panel ini dibuka, dibatasi maksimal 1x/10 menit per sesi supaya
    // hemat kuota kalau panel dibuka-tutup berkali-kali. Render ulang
    // panel HANYA kalau jumlah baris berubah (ada kidung baru/terhapus)
    // supaya tidak mengganggu kalau pengguna sedang mengetik di kotak
    // nomor/pencarian saat sinkron ini selesai.
    const now = Date.now();
    if (!kidungLastBgSyncAt || now - kidungLastBgSyncAt > 10 * 60 * 1000) {
      kidungLastBgSyncAt = now;
      resyncKidungSheet()
        .then(async () => {
          const newCount = await LocalDB.countKidungRows().catch(() => count);
          if (newCount !== count && el("kidungPanel") && !el("kidungPanel").hidden) {
            renderKidungHome();
          }
        })
        .catch(() => {});
    }
  }

  const books = (await getKidungBooks().catch(() => [])) || [];
  if (!books.length) books.push("Kidung");
  if (!books.includes(kidungCurrentBuku)) kidungCurrentBuku = books[0];

  // Toggle buku (Kidung / Suplemen / dst -- otomatis mengikuti data,
  // sama seperti disebutkan di js/kidung.js getKidungBooks()).
  if (books.length > 1) {
    const toggleRow = document.createElement("div");
    toggleRow.className = "kidung-book-toggle";
    books.forEach((b) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = b;
      btn.className = "kidung-book-toggle-btn" + (b === kidungCurrentBuku ? " active" : "");
      btn.addEventListener("click", () => {
        kidungCurrentBuku = b;
        renderKidungHome();
      });
      toggleRow.appendChild(btn);
    });
    panel.appendChild(toggleRow);
  }

  // Input nomor + tombol Buka -- ini bagian INTI yang diminta duluan.
  const form = document.createElement("form");
  form.className = "kidung-number-form";
  const numInput = document.createElement("input");
  numInput.type = "number";
  numInput.inputMode = "numeric";
  numInput.min = "1";
  numInput.autocomplete = "off";
  numInput.placeholder = "No. " + kidungCurrentBuku;
  numInput.className = "kidung-number-input";
  numInput.id = "kidungNoInput";
  const goBtn = document.createElement("button");
  goBtn.type = "submit";
  goBtn.className = "chip-btn primary";
  goBtn.textContent = "Buka";
  form.appendChild(numInput);
  form.appendChild(goBtn);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const no = (numInput.value || "").trim();
    if (!no) return;
    openKidungReader(kidungCurrentBuku, no);
  });
  panel.appendChild(form);

  // Jalan pintas Cari & Daftar Semua (❤️ Favorit & ⚙️ Pengaturan
  // menyusul -- lihat catatan TODO di kepala file).
  const iconsRow = document.createElement("div");
  iconsRow.className = "kidung-icons-row";
  const searchBtn = document.createElement("button");
  searchBtn.type = "button";
  searchBtn.className = "chip-btn small";
  searchBtn.textContent = "🔍 Cari";
  searchBtn.addEventListener("click", () => renderKidungSearch());
  const listBtn = document.createElement("button");
  listBtn.type = "button";
  listBtn.className = "chip-btn small";
  listBtn.textContent = "📋 Daftar Semua";
  listBtn.addEventListener("click", () => renderKidungList(kidungCurrentBuku));
  iconsRow.appendChild(searchBtn);
  iconsRow.appendChild(listBtn);
  panel.appendChild(iconsRow);

  numInput.focus();
}

// 🎛️ Filter media -- BARU. Tiap filter mengecek 1 (atau beberapa) kolom
// link yang sudah ada di getKidungList() (lihat js/kidung.js): "mp3"
// mencakup link_mp3_1 ATAU link_mp3_2 (dianggap "punya MP3" kalau salah
// satunya terisi), "video" = link_video (mp4/rekaman video), "youtube" =
// link_youtube, "midi" = link_midi. Ini FILTER TAMPILAN saja (mempersempit
// baris mana yang MUNCUL di daftar) -- begitu ditekan, tetap membuka
// pembaca/tampilan kidung yang SAMA PERSIS seperti biasa (openKidungReader),
// isi syairnya tetap ditampilkan lengkap seperti biasa, bukan cuma linknya.
const KIDUNG_MEDIA_FILTERS = [
  { key: "__all__", label: "Semua" },
  { key: "mp3", label: "🎵 MP3", test: (k) => !!(k.linkMp3_1 || k.linkMp3_2) },
  { key: "video", label: "🎬 Video/MP4", test: (k) => !!k.linkVideo },
  { key: "youtube", label: "▶️ YouTube", test: (k) => !!k.linkYoutube },
  { key: "midi", label: "🎹 MIDI", test: (k) => !!k.linkMidi },
];
let kidungListMediaFilter = "__all__";

async function renderKidungList(bukuFilter) {
  const panel = el("kidungPanel");
  if (!panel) return;
  teardownKidungReaderKeyNav(); // keluar dari pembaca (kalau lagi aktif) -- lihat catatan di atas
  panel.innerHTML = "";
  panel.appendChild(kidungTopRow(() => renderKidungHome()));

  const title = document.createElement("h2");
  title.textContent = "📋 Daftar " + bukuFilter;
  panel.appendChild(title);

  const fullList = await getKidungList(bukuFilter).catch(() => []);
  if (!fullList.length) {
    const p = document.createElement("p");
    p.textContent = "Belum ada data untuk buku ini.";
    panel.appendChild(p);
    return;
  }

  // Baris chip filter media -- hanya tampil kalau memang ada kidung yang
  // punya minimal 1 link media di buku ini (kalau tidak ada satupun, chip
  // ini cuma bikin bingung karena semua akan kosong).
  const anyHasMedia = fullList.some((k) => k.linkMp3_1 || k.linkMp3_2 || k.linkVideo || k.linkYoutube || k.linkMidi);
  const countLabel = document.createElement("p");
  countLabel.className = "kidung-search-count";
  const box = document.createElement("div");
  box.className = "kidung-list";

  function renderFilteredList() {
    const active = KIDUNG_MEDIA_FILTERS.find((f) => f.key === kidungListMediaFilter) || KIDUNG_MEDIA_FILTERS[0];
    const filtered = active.test ? fullList.filter(active.test) : fullList;
    countLabel.textContent =
      kidungListMediaFilter === "__all__"
        ? fullList.length.toLocaleString("id-ID") + " kidung"
        : filtered.length.toLocaleString("id-ID") + " dari " + fullList.length.toLocaleString("id-ID") + " kidung yang punya " + active.label;
    box.innerHTML = "";
    if (!filtered.length) {
      const p = document.createElement("p");
      p.className = "media-empty";
      p.textContent = "Tidak ada kidung dengan jenis media ini.";
      box.appendChild(p);
      return;
    }
    // Tetap SAMA PERSIS seperti tampilan daftar biasa (nomor + judul),
    // isi syair lengkapnya baru muncul di openKidungReader seperti biasa.
    filtered.forEach((k) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "kidung-list-item";
      item.textContent = formatKidungNo(k.buku, k.noKidung) + " — " + k.judul;
      item.addEventListener("click", () => openKidungReader(k.buku, k.noKidung));
      box.appendChild(item);
    });
  }

  if (anyHasMedia) {
    const filterRow = document.createElement("div");
    filterRow.className = "kidung-book-toggle";
    KIDUNG_MEDIA_FILTERS.forEach((f) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = f.label;
      btn.className = "chip-btn small" + (f.key === kidungListMediaFilter ? " active" : "");
      btn.addEventListener("click", () => {
        kidungListMediaFilter = f.key;
        filterRow.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        renderFilteredList();
      });
      filterRow.appendChild(btn);
    });
    panel.appendChild(filterRow);
  } else {
    kidungListMediaFilter = "__all__";
  }

  panel.appendChild(countLabel);
  panel.appendChild(box);
  renderFilteredList();
}

// Berapa hasil ditampilkan per "halaman" -- dulu di-hardcode 100 lalu
// SISANYA DIBUANG BEGITU SAJA (kalau ketemu 262, yang ke-101 sampai
// ke-262 tidak akan PERNAH bisa dibuka lewat pencarian sama sekali,
// padahal mungkin justru itu yang dicari). Sekarang jadi pagination
// betulan: batch pertama ini yang langsung tampil, batch berikutnya
// nambah lewat tombol "Muat X lagi" di bawah (lihat renderResultsBatch()),
// sampai semuanya tertampil -- tidak ada hasil yang hilang/tidak
// terjangkau lagi.
const KIDUNG_SEARCH_PAGE_SIZE = 40;

async function renderKidungSearch() {
  const panel = el("kidungPanel");
  if (!panel) return;
  teardownKidungReaderKeyNav(); // keluar dari pembaca (kalau lagi aktif) -- lihat catatan di atas
  panel.innerHTML = "";
  panel.appendChild(kidungTopRow(() => renderKidungHome()));

  const title = document.createElement("h2");
  title.textContent = "🔍 Cari Kidung";
  panel.appendChild(title);

  // UPDATE (20 Agu 2026): sebelumnya pencarian ini HANYA mencocokkan
  // field judul ("Cari Judul") -- kata yang ada di DALAM syair (mis.
  // "kasih") tidak akan ketemu apa-apa walau kata itu muncul di puluhan
  // kidung. Sekarang pakai searchKidungFull() (js/kidung.js) yang ikut
  // mencocokkan ke pengarang & ke SETIAP baris teks bait/koor, plus
  // menampilkan penghitung "ketemu X/Y kidung" seperti diminta.
  //
  // UPDATE (21 Agu 2026) atas permintaan:
  //  1) SATU pencarian saja lintas SEMUA buku (Kidung/Suplemen/Tambahan/
  //     dst) -- tidak lagi dibatasi ke buku yang sedang aktif di toggle
  //     (kidungCurrentBuku), karena datanya memang 1 sheet/1 sumber yang
  //     sama, jadi tidak masuk akal dipisah-pisah kotak pencariannya.
  //  2) Yang ditampilkan per hasil bukan cuma judul, tapi CUPLIKAN SYAIR
  //     yang cocok (kalau yang cocok bukan judul/pengarang, lihat
  //     matchExcerpt dari searchKidungFull()), dengan kata yang dicari
  //     ikut disorot -- sama seperti pencarian Alkitab.
  //  3) Tidak ada lagi hasil yang "hilang" kalau ketemu >100 -- lihat
  //     renderResultsBatch()/KIDUNG_SEARCH_PAGE_SIZE di atas.
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Ketik judul atau kata dalam syair (mis. \"kasih\")…";
  input.className = "kidung-search-input";
  panel.appendChild(input);

  const countLabel = document.createElement("p");
  countLabel.className = "kidung-search-count";
  panel.appendChild(countLabel);

  const resultsBox = document.createElement("div");
  resultsBox.className = "kidung-list";
  panel.appendChild(resultsBox);

  const moreRow = document.createElement("div");
  moreRow.className = "kidung-search-more-row";
  panel.appendChild(moreRow);

  let searchSeq = 0; // penanda supaya hasil pencarian LAMA yang telat selesai tidak menimpa hasil BARU (ketik cepat berturut-turut)
  let currentMatches = [];
  let currentQuery = "";
  let shownCount = 0;

  function appendResultItem(k) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "kidung-list-item kidung-search-result-item";

    const titleLine = document.createElement("div");
    titleLine.className = "kidung-search-result-title";
    titleLine.textContent = k.buku + " " + formatKidungNo(k.buku, k.noKidung) + " — " + k.judul;
    item.appendChild(titleLine);

    // Cuplikan syair yang cocok (kalau ada) -- kalau yang cocok cuma
    // judul/pengarang (matchExcerpt null), baris ini dilewati saja.
    if (k.matchExcerpt) {
      const excerptLine = document.createElement("div");
      excerptLine.className = "kidung-search-result-excerpt";
      const safeLabel = escapeHtml("(" + k.matchExcerpt.label + ") ");
      const safeSnippet = escapeHtml(k.matchExcerpt.snippet);
      const highlighted = typeof highlightAllMatches === "function" ? highlightAllMatches(safeSnippet, currentQuery) : safeSnippet;
      excerptLine.innerHTML = safeLabel + highlighted;
      item.appendChild(excerptLine);
    }

    item.addEventListener("click", () => openKidungReader(k.buku, k.noKidung));
    resultsBox.appendChild(item);
  }

  function renderResultsBatch() {
    const nextSlice = currentMatches.slice(shownCount, shownCount + KIDUNG_SEARCH_PAGE_SIZE);
    nextSlice.forEach(appendResultItem);
    shownCount += nextSlice.length;

    moreRow.innerHTML = "";
    if (shownCount < currentMatches.length) {
      const remaining = currentMatches.length - shownCount;
      const moreBtn = document.createElement("button");
      moreBtn.type = "button";
      moreBtn.className = "chip-btn small";
      moreBtn.textContent = "Muat " + Math.min(KIDUNG_SEARCH_PAGE_SIZE, remaining) + " lagi (" + remaining + " tersisa)";
      moreBtn.addEventListener("click", renderResultsBatch);
      moreRow.appendChild(moreBtn);

      const allBtn = document.createElement("button");
      allBtn.type = "button";
      allBtn.className = "chip-btn small";
      allBtn.textContent = "Tampilkan semua (" + currentMatches.length + ")";
      allBtn.addEventListener("click", () => {
        currentMatches.slice(shownCount).forEach(appendResultItem);
        shownCount = currentMatches.length;
        moreRow.innerHTML = "";
      });
      moreRow.appendChild(allBtn);
    }
  }

  async function runSearch() {
    const q = input.value.trim();
    const mySeq = ++searchSeq;
    if (!q) {
      resultsBox.innerHTML = "";
      moreRow.innerHTML = "";
      countLabel.textContent = "";
      return;
    }
    // bukuFilter sengaja dikosongkan (undefined) -- cari lintas SEMUA
    // buku sekaligus, lihat catatan di atas.
    const { matches, total } = await searchKidungFull(q).catch(() => ({ matches: [], total: 0 }));
    if (mySeq !== searchSeq) return; // sudah ada pencarian lebih baru, buang hasil ini

    currentMatches = matches;
    currentQuery = q;
    shownCount = 0;
    countLabel.textContent = "Ketemu " + matches.length + "/" + total + " kidung";
    resultsBox.innerHTML = "";
    moreRow.innerHTML = "";
    if (!matches.length) {
      const p = document.createElement("p");
      p.textContent = "Tidak ditemukan.";
      resultsBox.appendChild(p);
      return;
    }
    renderResultsBatch();
  }
  input.addEventListener("input", runSearch);
  input.focus();
}

async function openKidungReader(buku, no) {
  const panel = el("kidungPanel");
  if (!panel) return;
  panel.hidden = false;
  panel.innerHTML = '<p class="chapter-picker-loading">Memuat kidung…</p>';

  let result = await openKidungByKeypad(buku, no).catch((e) => {
    console.error("openKidungReader gagal:", e);
    return null;
  });

  // FIX (20 Agu 2026): dulu langsung nyerah & bilang "tidak ditemukan"
  // begitu tidak ketemu di data LOKAL (IndexedDB) -- padahal kemungkinan
  // besar kidung itu memang ADA di Sheet tapi HP ini belum sempat
  // sinkron ulang sejak kidung itu ditambahkan (lihat catatan panjang di
  // kidungLastBgSyncAt/renderKidungHome di atas soal kenapa ini bisa
  // "macet" berbeda antar perangkat & tidak sembuh sendiri walau
  // refresh/logout-login). Sebelum benar-benar bilang tidak ditemukan,
  // coba SEKALI sinkron ulang LANGSUNG (data Kidung kecil, ~800 KB,
  // lihat CONFIG.KIDUNG_DATA_APPROX_KB, jadi cepat & murah), lalu cari
  // lagi -- baru kalau MASIH tidak ketemu setelah itu, tampilkan pesan
  // tidak ditemukan (berarti sungguh belum ada / salah nomor).
  if ((!result || !result.baits || !result.baits.length) && typeof resyncKidungSheet === "function") {
    panel.innerHTML = '<p class="chapter-picker-loading">Belum ketemu di data tersimpan, menyinkronkan ulang data kidung…</p>';
    try {
      await resyncKidungSheet();
      result = await openKidungByKeypad(buku, no).catch(() => null);
    } catch (e) {
      // Gagal sinkron (mis. tidak ada internet) -- biarkan, di bawah
      // tetap akan tampil pesan "tidak ditemukan" seperti sebelumnya.
    }
  }

  if (!result || !result.baits || !result.baits.length) {
    panel.innerHTML = "";
    panel.appendChild(kidungTopRow(() => renderKidungHome()));
    const p = document.createElement("p");
    p.textContent = buku + " No. " + no + " tidak ditemukan.";
    panel.appendChild(p);
    return;
  }

  kidungCurrentBuku = buku;
  renderKidungReader(result.meta || { buku, noKidung: no, judul: "" }, result.baits);
}

function renderKidungReader(meta, baits) {
  const panel = el("kidungPanel");
  if (!panel) return;
  panel.innerHTML = "";

  panel.appendChild(kidungTopRow(() => renderKidungHome()));

  const header = document.createElement("div");
  header.className = "kidung-reader-header";
  const lines = [];
  lines.push("No. " + formatKidungNo(meta.buku, meta.noKidung));
  let titleLine = (meta.judul || "").trim();
  if (meta.pengarang && meta.pengarang.trim()) titleLine += (titleLine ? " " : "") + "(" + meta.pengarang.trim() + ")";
  if (titleLine) lines.push(titleLine);
  if (meta.birama && meta.birama.trim()) lines.push(meta.birama.trim());
  header.innerHTML = lines.map((l) => "<div>" + escapeHtml(l) + "</div>").join("");
  panel.appendChild(header);

  const body = document.createElement("div");
  body.className = "kidung-reader-body";
  baits.forEach((b) => {
    const verseP = document.createElement("p");
    verseP.className = "kidung-verse";
    verseP.innerHTML = "<strong>" + b.noBait + ".</strong> " + escapeHtml(b.teks || "").replace(/\n/g, "<br>");
    body.appendChild(verseP);
    if (b.koorTeks && b.koorTeks.trim()) {
      const koorP = document.createElement("p");
      koorP.className = "kidung-koor";
      koorP.innerHTML = "<strong>Koor:</strong> " + escapeHtml(b.koorTeks).replace(/\n/g, "<br>");
      body.appendChild(koorP);
    }
  });
  panel.appendChild(body);

  panel.appendChild(buildKidungToolbar(meta, baits));
}

// ------------------------------------------------------------
// Toolbar bawah layar baca: panah ⬅️/➡️ pindah nomor kidung
// sebelumnya/sesudahnya, tombol "🔗 Bagikan" (buildKidungShareText(),
// dari js/kidung.js), & pemutar MP3/MP4/YouTube sebaris (kalau link-nya
// diisi di Sheet -- lihat buildInlineMediaBlock() di js/media.js, pola
// SAMA seperti Rencana Baca/Kumpulan Ayat supaya perilakunya konsisten:
// diputar LANGSUNG di halaman ini, bukan buka tab baru). Semuanya
// dibungkus 1 tombol "▾/▸ Tombol" yang bisa MENYEMBUNYIKAN /
// MENAMPILKAN lagi seluruh baris ini sekali tekan -- berguna terutama
// di HP layar sempit supaya tombol-tombol ini tidak terus menutupi
// syair saat sedang dibaca/dinyanyikan (lihat .kidung-toolbar di
// css/style.css, jadi sticky di bagian bawah layar khusus di lebar HP).
// ------------------------------------------------------------
//  FAVORIT (❤️) -- MVP per PERANGKAT lewat localStorage (BELUM per akun/
//  sinkron server, itu perlu tempat penyimpanan baru pola highlights.js,
//  lihat catatan di kepala file). Cukup untuk "tandai kidung favorit di
//  HP/komputer ini" dulu; gampang ditingkatkan jadi per akun nanti tanpa
//  mengubah cara tombolnya dipakai.
// ------------------------------------------------------------
const KIDUNG_FAVORITES_KEY = "kidung_favorites_v1";
function kidungFavoriteKey(meta) { return (meta.buku || "Kidung") + "|" + meta.noKidung; }
function loadKidungFavorites() {
  try { return JSON.parse(localStorage.getItem(KIDUNG_FAVORITES_KEY) || "[]"); }
  catch (e) { return []; }
}
function isKidungFavorite(meta) { return loadKidungFavorites().includes(kidungFavoriteKey(meta)); }
function toggleKidungFavorite(meta) {
  const list = loadKidungFavorites();
  const key = kidungFavoriteKey(meta);
  const idx = list.indexOf(key);
  if (idx === -1) list.push(key); else list.splice(idx, 1);
  localStorage.setItem(KIDUNG_FAVORITES_KEY, JSON.stringify(list));
  return idx === -1; // true = baru ditambahkan
}
function kidungFavoriteButton(meta) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "square-media-btn kidung-fav-btn";
  const paint = () => {
    const fav = isKidungFavorite(meta);
    btn.textContent = fav ? "❤️" : "🤍";
    btn.title = fav ? "Hapus dari favorit" : "Tandai favorit";
    btn.setAttribute("aria-label", btn.title);
    btn.classList.toggle("active", fav);
  };
  paint();
  btn.addEventListener("click", () => { toggleKidungFavorite(meta); paint(); });
  return btn;
}

// Kotak toggle SEDERHANA (SERAGAM gaya dengan kotak lain di baris ini,
// BUKAN pemutar dengan progress bar seperti buildLoopingMp3Player() --
// itu dipakai di tempat lain, mis. Rencana Baca. Di toolbar Kidung ini
// sengaja disederhanakan jadi 1 kotak ▶️/⏸️ saja supaya rapi 1 baris
// sama seperti kotak MIDI/video/dst, sesuai permintaan 21 Agu 2026).
function kidungSquareLoopToggle(url, titleForSession, label) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "square-media-btn kidung-loop-toggle";
  btn.textContent = "▶️";
  btn.title = "Putar " + (label || "MP3") + " (berulang, tekan lagi untuk jeda)";
  btn.setAttribute("aria-label", btn.title);

  const audio = document.createElement("audio");
  audio.loop = true;
  audio.preload = "none";
  audio.setAttribute("playsinline", "");
  audio.src = url;
  btn.appendChild(audio);

  btn.addEventListener("click", () => {
    if (audio.paused) audio.play().catch(() => {}); else audio.pause();
  });
  audio.addEventListener("play", () => {
    btn.textContent = "⏸️";
    btn.classList.add("active");
    if (typeof requestWakeLock === "function") requestWakeLock();
    if (typeof wireMediaSession === "function") wireMediaSession(audio, titleForSession);
  });
  audio.addEventListener("pause", () => {
    btn.textContent = "▶️";
    btn.classList.remove("active");
    if (typeof releaseWakeLock === "function") releaseWakeLock();
  });
  return btn;
}

function buildKidungToolbar(meta, baits) {
  const wrap = document.createElement("div");
  wrap.className = "kidung-toolbar";

  const body = document.createElement("div");
  body.className = "kidung-toolbar-body";
  wrap.appendChild(body);

  const noInt = parseInt(meta.noKidung, 10);
  const sessionTitle = (meta.judul && meta.judul.trim()) || ("Kidung No. " + formatKidungNo(meta.buku, meta.noKidung));

  // ---- ◀ [kelompok tengah, boleh melipat ke baris berikut] ▶ ----
  // ◀/▶ SENGAJA elemen TERPISAH dari kelompok tengah (bukan ikut
  // di-flex-wrap bareng) -- supaya kalau ikon tengah kepanjangan dan
  // melipat ke baris ke-2 di HP, ◀ tetap nempel di kiri & ▶ tetap
  // nempel di KANAN toolbar (bukan ikut lompat ke pojok kiri baris ke-2
  // seperti sebelumnya, permintaan 21 Agu 2026).
  const grid = document.createElement("div");
  grid.className = "kidung-toolbar-grid";

  const middle = document.createElement("div");
  middle.className = "kidung-toolbar-middle";

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "kidung-nav-plain kidung-nav-btn";
  prevBtn.textContent = "◀";
  prevBtn.title = "Kidung nomor sebelumnya";
  prevBtn.setAttribute("aria-label", "Kidung nomor sebelumnya");
  prevBtn.disabled = true;

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "kidung-nav-plain kidung-nav-btn";
  nextBtn.textContent = "▶";
  nextBtn.title = "Kidung nomor selanjutnya";
  nextBtn.setAttribute("aria-label", "Kidung nomor selanjutnya");
  nextBtn.disabled = true;

  if (typeof findAdjacentKidungNo === "function" && !isNaN(noInt)) {
    findAdjacentKidungNo(meta.buku, noInt, -1).then((prevNo) => {
      if (prevNo != null) { prevBtn.disabled = false; prevBtn.addEventListener("click", () => openKidungReader(meta.buku, String(prevNo))); }
    });
    findAdjacentKidungNo(meta.buku, noInt, 1).then((nextNo) => {
      if (nextNo != null) { nextBtn.disabled = false; nextBtn.addEventListener("click", () => openKidungReader(meta.buku, String(nextNo))); }
    });
  }

  // Pasang navigasi keyboard panah kiri/kanan untuk pembaca ini (lihat
  // setupKidungReaderKeyNav() di atas) -- prevBtn/nextBtn dicek LIVE
  // setiap tombol ditekan, jadi tidak masalah kalaupun status disabled-nya
  // baru berubah belakangan (setelah findAdjacentKidungNo() di atas selesai).
  setupKidungReaderKeyNav(prevBtn, nextBtn);

  grid.appendChild(prevBtn);

  if (meta.linkMidi && typeof roundMediaLinkButton === "function") {
    const a = roundMediaLinkButton("🎼", "Unduh MIDI", meta.linkMidi);
    a.classList.add("square-media-btn");
    a.classList.remove("round-media-btn");
    middle.appendChild(a);
  } else {
    middle.appendChild(kidungDisabledSquare("🎼", "Belum ada MIDI"));
  }

  // MP3 -- BARU (21 Agu 2026): kalau link-nya dari Google Drive (mis.
  // ".../file/d/FILE_ID/view?usp=drive_link"), tombol loop-toggle
  // `<audio src="...">` yang dipakai untuk MP3 biasa TIDAK akan bunyi
  // sama sekali. Sebabnya: link "/view" itu halaman HTML Drive (yang
  // menampilkan tombol putar SENDIRI), bukan berkas .mp3 mentah -- tag
  // <audio> hanya bisa memutar berkas mentah, jadi ia gagal DIAM-DIAM
  // (tidak ada pesan error yang kelihatan, cuma tidak bersuara). Untuk
  // link Drive, dipakai jalur yang SAMA seperti tombol Video/YouTube di
  // bawah (kidungInlineMediaSquareButton + buildStandaloneMediaPlayer,
  // js/media.js) yang SUDAH BENAR menangani Drive lewat <iframe src=
  // ".../preview">) -- lihat isDriveUrl()/driveEmbedPreviewUrl() di
  // js/media.js. Bedanya: pemutar Drive punya kontrol/loop BAWAAN Drive
  // sendiri (bukan lagi tombol ▶️/⏸️ kotak yang otomatis mengulang).
  // Link MP3 di luar Drive (mis. hymnal.net, link .mp3 langsung) TETAP
  // pakai kidungSquareLoopToggle seperti sebelumnya, tidak berubah.
  function kidungMp3Square(url, sessionTitleForThis, label, icon) {
    if (typeof isDriveUrl === "function" && isDriveUrl(url)) {
      return kidungInlineMediaSquareButton(
        icon,
        "Putar " + label + " (Google Drive)",
        () => buildStandaloneMediaPlayer("mp3", url, sessionTitleForThis),
        body
      );
    }
    return kidungSquareLoopToggle(url, sessionTitleForThis, label);
  }

  if (meta.linkMp3_1) {
    middle.appendChild(kidungMp3Square(meta.linkMp3_1, sessionTitle, "MP3", "🎵"));
  } else {
    middle.appendChild(kidungDisabledSquare("🎵", "Belum ada MP3"));
  }

  if (meta.linkMp3_2) {
    middle.appendChild(kidungMp3Square(meta.linkMp3_2, sessionTitle + " (versi 2)", "MP3 versi 2", "🎧"));
  } else {
    middle.appendChild(kidungDisabledSquare("🎧", "Belum ada MP3 versi 2"));
  }

  if (meta.linkVideo && typeof buildStandaloneMediaPlayer === "function") {
    middle.appendChild(kidungInlineMediaSquareButton("🎬", "Tonton video", () => buildStandaloneMediaPlayer("mp4", meta.linkVideo, sessionTitle), body));
  } else {
    middle.appendChild(kidungDisabledSquare("🎬", "Belum ada video"));
  }

  if (meta.linkYoutube && typeof buildStandaloneMediaPlayer === "function") {
    middle.appendChild(kidungInlineMediaSquareButton("📺", "Tonton YouTube", () => buildStandaloneMediaPlayer("youtube", meta.linkYoutube, sessionTitle), body));
  } else {
    middle.appendChild(kidungDisabledSquare("📺", "Belum ada YouTube"));
  }

  middle.appendChild(kidungFavoriteButton(meta));

  const copyBtn = buildKidungCopyButton(meta, baits);
  copyBtn.classList.add("square-media-btn");
  copyBtn.classList.remove("round-media-btn");
  middle.appendChild(copyBtn);

  const shareBtn = buildKidungShareButton(meta, baits);
  shareBtn.classList.add("square-media-btn");
  shareBtn.classList.remove("round-media-btn");
  middle.appendChild(shareBtn);

  grid.appendChild(middle);
  grid.appendChild(nextBtn);
  body.appendChild(grid);

  // ---- Pemicu sembunyikan/tampilkan: garis tipis + ^ / v kecil & transparan ----
  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "kidung-toolbar-toggle";
  toggleBtn.innerHTML = '<span class="kidung-toolbar-toggle-arrow">v</span>';
  toggleBtn.title = "Sembunyikan/tampilkan tombol navigasi, bagikan, & pemutar";
  toggleBtn.setAttribute("aria-label", "Sembunyikan/tampilkan tombol kidung");
  toggleBtn.addEventListener("click", () => {
    const collapsed = wrap.classList.toggle("collapsed");
    toggleBtn.querySelector(".kidung-toolbar-toggle-arrow").textContent = collapsed ? "^" : "v";
  });
  wrap.appendChild(toggleBtn);
  wrap.insertBefore(body, toggleBtn); // body di ATAS, tombol toggle di bawahnya

  return wrap;
}

// Kotak abu-abu redup, tidak bisa ditekan -- dipakai supaya grid tetap
// RAPI (jumlah & posisi kotak selalu sama) walau sebagian link media
// kidung ini kosong, daripada baris-nya "lompat-lompat" tiap nomor.
function kidungDisabledSquare(icon, title) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "square-media-btn kidung-square-disabled";
  btn.textContent = icon;
  btn.title = title;
  btn.disabled = true;
  return btn;
}

// Kotak yang MEMBUKA pemutar sebaris (buildStandaloneMediaPlayer, HANYA
// elemen pemutarnya -- tanpa baris tombol bulat + bagikan bawaan, itu
// sudah ada sendiri di baris ini) langsung di `body` (bawah grid) begitu
// ditekan; ditekan lagi -> tertutup lagi (hide), sesuai permintaan
// 21 Agu 2026 ("kalau tidak ditekan tombol, maka hide saja").
function kidungInlineMediaSquareButton(icon, title, buildPlayerFn, body) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "square-media-btn";
  btn.textContent = icon;
  btn.title = title;
  btn.setAttribute("aria-label", title);
  let slot = null;
  btn.addEventListener("click", () => {
    if (slot) { slot.remove(); slot = null; btn.classList.remove("active"); return; }
    slot = buildPlayerFn();
    if (!slot) return; // fallback (mis. buka tab baru) sudah terjadi di dalam buildPlayerFn
    slot.classList.add("kidung-inline-media-slot");
    body.appendChild(slot);
    btn.classList.add("active");
  });
  return btn;
}
