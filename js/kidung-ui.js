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

// FIX (20 Agu 2026, permintaan lanjutan) — "di komputer sudah bagus,
// kenapa di HP tidak bisa tampil?": sampai sekarang, KALAU ada error
// JavaScript yang tidak tertangkap di dalam renderKidungHome() (mis.
// IndexedDB gagal dibuka -- ini beda-beda perilakunya antar browser,
// beberapa browser HP/mode Penyamaran/kuota penyimpanan penuh bisa
// menolak IndexedDB diam-diam), panel Kidung akan tampak KOSONG
// MELOMPONG tanpa pesan apa pun -- tidak ada cara bagi pengguna di HP
// untuk tahu APA yang gagal, jadi "refresh"/"logout-login" kelihatan
// tidak membantu padahal penyebabnya belum ketahuan sama sekali.
// Sekarang showKidungPanel() membungkus renderKidungHome() dengan
// try/catch: kalau ADA error, panel menampilkan kotak pesan jelas +
// tombol "🔄 Coba Lagi" + baris kecil detail teknis error-nya (supaya
// bisa di-screenshot & dikirim untuk didiagnosis lebih lanjut), alih-
// alih diam-diam kosong. Ini TIDAK memperbaiki penyebab error itu
// sendiri (penyebabnya bisa macam-macam per perangkat) -- tapi
// membuat penyebabnya KELIHATAN, yang sebelumnya sama sekali tidak.
async function showKidungPanel() {
  hideAllPanels();
  const panel = el("kidungPanel");
  if (!panel) return;
  panel.hidden = false;
  logActivity && typeof logActivity === "function" && logActivity("Kidung");
  try {
    await renderKidungHome();
  } catch (e) {
    console.error("Kidung: renderKidungHome() gagal:", e);
    showKidungFatalError(e);
  }
}

// Kotak error terlihat (dipakai showKidungPanel() di atas) -- dibuat
// fungsi terpisah supaya bisa dipanggil ulang dari tombol "Coba Lagi".
function showKidungFatalError(e) {
  const panel = el("kidungPanel");
  if (!panel) return;
  panel.innerHTML = "";
  panel.appendChild(kidungTopRow(null));
  const box = document.createElement("div");
  box.className = "kidung-fatal-error";
  const p1 = document.createElement("p");
  p1.textContent = "⚠️ Kidung gagal dimuat di perangkat ini.";
  const p2 = document.createElement("p");
  p2.className = "kidung-fatal-error-detail";
  p2.textContent = "Detail teknis: " + (e && (e.message || String(e)) || "(tidak ada pesan error)");
  const retryBtn = document.createElement("button");
  retryBtn.type = "button";
  retryBtn.className = "chip-btn small";
  retryBtn.textContent = "🔄 Coba Lagi";
  retryBtn.addEventListener("click", () => showKidungPanel());
  box.appendChild(p1);
  box.appendChild(p2);
  box.appendChild(retryBtn);
  panel.appendChild(box);
}

function kidungBackButton(onClick) {
  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "chip-btn small";
  backBtn.textContent = "← Kembali";
  backBtn.addEventListener("click", onClick);
  return backBtn;
}

// Tombol "📖 Alkitab" -- pasangan dari #kidungHeaderBtn di index.html
// (yang membawa dari Alkitab MASUK ke Kidung). Tombol ini yang membawa
// KELUAR dari Kidung, dari layar Kidung MANA PUN (depan/daftar/cari/
// baca), balik ke bacaan Alkitab tanpa perlu mundur langkah demi
// langkah lewat "← Kembali" dulu. Dipasang lewat kidungTopRow() di
// bawah supaya konsisten muncul di semua layar Kidung.
function kidungAlkitabButton() {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "chip-btn small kidung-alkitab-btn";
  btn.textContent = "📖 Alkitab";
  btn.title = "Kembali ke bacaan Alkitab (pasal terakhir dibaca)";
  btn.addEventListener("click", () => {
    if (typeof goToAlkitabFromKidung === "function") goToAlkitabFromKidung();
  });
  return btn;
}

// Baris atas standar tiap layar Kidung: "← Kembali" (opsional, kosongkan
// `onBack` untuk layar paling depan yang tidak punya "atas"-nya lagi di
// dalam Kidung) + "📖 Alkitab" (selalu ada, di SEMUA layar Kidung).
function kidungTopRow(onBack) {
  const row = document.createElement("div");
  row.className = "kidung-top-row";
  if (onBack) row.appendChild(kidungBackButton(onBack));
  row.appendChild(kidungAlkitabButton());
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

async function renderKidungList(bukuFilter) {
  const panel = el("kidungPanel");
  if (!panel) return;
  panel.innerHTML = "";
  panel.appendChild(kidungTopRow(() => renderKidungHome()));

  const title = document.createElement("h2");
  title.textContent = "📋 Daftar " + bukuFilter;
  panel.appendChild(title);

  const list = await getKidungList(bukuFilter).catch(() => []);
  if (!list.length) {
    const p = document.createElement("p");
    p.textContent = "Belum ada data untuk buku ini.";
    panel.appendChild(p);
    return;
  }

  const box = document.createElement("div");
  box.className = "kidung-list";
  list.forEach((k) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "kidung-list-item";
    item.textContent = formatKidungNo(k.buku, k.noKidung) + " — " + k.judul;
    item.addEventListener("click", () => openKidungReader(k.buku, k.noKidung));
    box.appendChild(item);
  });
  panel.appendChild(box);
}

async function renderKidungSearch() {
  const panel = el("kidungPanel");
  if (!panel) return;
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
  // menampilkan penghitung "ketemu X/Y kidung" (Y = total kidung buku
  // yang sedang aktif) seperti diminta.
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

  // Batasi ke buku yang sedang aktif (kidungCurrentBuku) supaya angka
  // "X/Y" konsisten dengan konteks yang sedang dilihat pengguna (sama
  // seperti toggle buku di renderKidungHome()) -- bukan digabung semua
  // buku sekaligus, yang bisa membingungkan artinya "Y".
  const bukuFilter = kidungCurrentBuku;
  let searchSeq = 0; // penanda supaya hasil pencarian LAMA yang telat selesai tidak menimpa hasil BARU (ketik cepat berturut-turut)

  // UPDATE (20 Agu 2026, permintaan lanjutan): dulu kotak input kosong
  // = daftar hasil KOSONG (harus ketik dulu baru kelihatan apa-apa).
  // Sekarang `runSearch()` dipanggil SEKALI begitu layar ini dibuka
  // (lihat pemanggilan di bawah fungsi ini), dan searchKidungFull()
  // (js/kidung.js) sudah diubah supaya query kosong = SEMUA kidung buku
  // ini -- jadi begitu layar "🔍 Cari" dibuka, daftar PANJANG semua
  // kidung (No. 1, 2, 3, ... urut ke bawah) langsung kelihatan duluan,
  // baru pengguna mempersempitnya dengan mengetik. Label penghitung
  // dibedakan: "Menampilkan semua X kidung" (query kosong) vs "Ketemu
  // X/Y kidung" (ada ketikan) seperti diminta.
  async function runSearch() {
    const q = input.value.trim();
    const mySeq = ++searchSeq;

    const { matches, total } = await searchKidungFull(q, bukuFilter).catch(() => ({ matches: [], total: 0 }));
    if (mySeq !== searchSeq) return; // sudah ada pencarian lebih baru, buang hasil ini

    countLabel.textContent = q
      ? "Ketemu " + matches.length + "/" + total + " kidung"
      : "Menampilkan semua " + total + " kidung — ketik untuk mencari judul/isi syair";
    resultsBox.innerHTML = "";
    if (!matches.length) {
      const p = document.createElement("p");
      p.textContent = "Tidak ditemukan.";
      resultsBox.appendChild(p);
      return;
    }
    matches.slice(0, 100).forEach((k) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "kidung-list-item";
      item.textContent = k.buku + " " + formatKidungNo(k.buku, k.noKidung) + " — " + k.judul;
      item.addEventListener("click", () => openKidungReader(k.buku, k.noKidung));
      resultsBox.appendChild(item);
    });
    if (matches.length > 100) {
      const more = document.createElement("p");
      more.textContent = "(menampilkan 100 pertama dari " + matches.length + " -- ketik kata lebih spesifik untuk mempersempit)";
      resultsBox.appendChild(more);
    }
  }
  input.addEventListener("input", runSearch);
  runSearch(); // tampilkan daftar semua kidung dulu, sebelum ada ketikan
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
function buildKidungToolbar(meta, baits) {
  const wrap = document.createElement("div");
  wrap.className = "kidung-toolbar";

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "kidung-toolbar-toggle";
  toggleBtn.textContent = "▾ Tombol";
  toggleBtn.title = "Sembunyikan/tampilkan tombol navigasi, bagikan, & pemutar";
  toggleBtn.setAttribute("aria-label", "Sembunyikan/tampilkan tombol kidung");
  wrap.appendChild(toggleBtn);

  const body = document.createElement("div");
  body.className = "kidung-toolbar-body";
  wrap.appendChild(body);

  // Baris navigasi: ⬅️ [🔗 Bagikan] ➡️ -- tidak wajib nomornya
  // berurutan tanpa celah, tinggal dicoba buka; kalau kosong akan
  // tampil pesan "tidak ditemukan" seperti di openKidungReader() di
  // atas, operator tinggal geser lagi ke arah yang sama.
  const navRow = document.createElement("div");
  navRow.className = "kidung-toolbar-nav";
  const noInt = parseInt(meta.noKidung, 10);

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "round-media-btn kidung-nav-btn";
  prevBtn.textContent = "⬅️";
  prevBtn.title = "Kidung nomor sebelumnya";
  prevBtn.setAttribute("aria-label", "Kidung nomor sebelumnya");
  prevBtn.disabled = isNaN(noInt) || noInt <= 1;
  prevBtn.addEventListener("click", () => openKidungReader(meta.buku, String(noInt - 1)));

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "round-media-btn kidung-nav-btn";
  nextBtn.textContent = "➡️";
  nextBtn.title = "Kidung nomor selanjutnya";
  nextBtn.setAttribute("aria-label", "Kidung nomor selanjutnya");
  nextBtn.disabled = isNaN(noInt);
  nextBtn.addEventListener("click", () => openKidungReader(meta.buku, String(noInt + 1)));

  navRow.appendChild(prevBtn);
  navRow.appendChild(buildKidungCopyButton(meta, baits));
  navRow.appendChild(buildKidungShareButton(meta, baits));
  navRow.appendChild(nextBtn);
  body.appendChild(navRow);

  // Pemutar MP3 (bisa 2 rekaman)/MP4/YouTube/unduh MIDI -- link-nya
  // ambil apa adanya dari data kidung (kosong = tombolnya otomatis
  // tidak dipasang, lewat cek if() masing-masing di bawah).
  if (typeof buildInlineMediaBlock === "function") {
    const sessionTitle = (meta.judul && meta.judul.trim()) || ("Kidung No. " + formatKidungNo(meta.buku, meta.noKidung));
    if (meta.linkMp3_1) body.appendChild(buildInlineMediaBlock({ mp3: meta.linkMp3_1 }, sessionTitle));
    if (meta.linkMp3_2) body.appendChild(buildInlineMediaBlock({ mp3: meta.linkMp3_2 }, sessionTitle + " (versi 2)"));
    if (meta.linkVideo) body.appendChild(buildInlineMediaBlock({ mp4: meta.linkVideo }, sessionTitle));
    if (meta.linkYoutube) body.appendChild(buildInlineMediaBlock({ youtube: meta.linkYoutube }, sessionTitle));
  }
  if (meta.linkMidi && typeof mediaLinkButton === "function") {
    const midiRow = document.createElement("div");
    midiRow.className = "kidung-toolbar-midi";
    midiRow.appendChild(mediaLinkButton("⬇️ Unduh MIDI", meta.linkMidi));
    body.appendChild(midiRow);
  }

  toggleBtn.addEventListener("click", () => {
    const collapsed = wrap.classList.toggle("collapsed");
    toggleBtn.textContent = collapsed ? "▸ Tombol" : "▾ Tombol";
  });

  return wrap;
}
