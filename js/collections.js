// ============================================================
//  KUMPULAN AYAT (generik: ayat / kidung / pengumuman / teks bebas)
//  & MEDIA TERSIMPAN (Studio Presentasi)
// ============================================================
//  File ini SEBELUMNYA HILANG TOTAL dari proyek -- disebut di banyak
//  komentar (js/app.js, js/presentation-studio.js, js/db.js, index.html)
//  sebagai "lihat js/collections.js", tapi filenya sendiri tidak ada
//  sama sekali & tidak dimuat index.html. Akibatnya semua fungsi di
//  bawah ini dulu undefined -- Kumpulan Ayat & Media Tersimpan diam-
//  diam gagal (tombol "Simpan ke Kumpulan Ayat" dsb tidak melakukan
//  apa-apa, tanpa pesan error yang jelas ke pengguna).
//
//  Dibuat ulang di sini berdasarkan SELURUH titik pemanggilnya di
//  js/app.js & js/presentation-studio.js, ditambah kontrak yang
//  TERNYATA sudah lengkap di js/sync.js (pullCollections/pushCollection/
//  deleteCollectionRemote) & apps-script/Code.gs (readCollections_/
//  saveCollection_/deleteCollection_) -- jadi sisi server TIDAK perlu
//  diubah untuk bagian ayat.
//
//  ------------------------------------------------------------------
//  BAGIAN A) KUMPULAN AYAT
//  ------------------------------------------------------------------
//  Tersimpan lokal (localStorage, instan) + disinkron ke Google Sheet
//  (lewat js/sync.js) di latar belakang -- pola SAMA PERSIS seperti
//  js/notes.js (simpan lokal dulu, kirim ke server best-effort, tarik
//  balik & gabung pakai updatedAt terbaru saat refreshCollectionsFromRemote()).
//
//  Struktur 1 kumpulan (per id):
//    {
//      name: string,
//      items: [
//        { type: "verse", verseId },                     // ayat asli
//        { type: "text", text },                          // teks bebas
//        { type: "announcement", text, title? },           // pengumuman (snapshot teks)
//        { type: "kidung", buku, kidungNo, title,            // kidung -- 1 item = 1 SLIDE
//          bait: [{noBait,teks}], koorTeks },                // (bukan 1 lagu penuh), lihat
//                                                              // catatan di bawah & tab Kidung
//                                                              // Studio Presentasi (js/presentation-
//                                                              // studio.js, wireKidungTab()).
//      ],
//      verseIds: [verseId, ...],   // TURUNAN otomatis dari items (hanya
//                                  // yang type:"verse") -- disimpan JUGA
//                                  // supaya kode yang sudah ADA & masih
//                                  // baca col.verseIds langsung (Studio
//                                  // Presentasi, js/presentation-studio.js
//                                  // renderCollectionSelect/renderCollectionList,
//                                  // dan js/sync.js pushCollection) TETAP
//                                  // JALAN tanpa perlu diubah sama sekali.
//                                  // Studio baru akan disambungkan ke
//                                  // "items" generik di tahap terpisah
//                                  // (lihat poin 4 di rencana kerja).
//      createdAt, updatedAt: ISO string,
//    }
//
//  Kumpulan LAMA (format sebelum file ini ada: cuma { name, verseIds,
//  createdAt, updatedAt }, tanpa "items") otomatis dimigrasi ke bentuk
//  di atas begitu dibaca (lihat _migrateCollection() di bawah) -- tidak
//  ada tombol/migrasi manual, dan tidak menghapus data apa pun.
//
//  SELESAI 27 Agu 2026 -- sinkron item non-ayat: Sheet "Collections" di
//  server (apps-script/Code.gs) sekarang punya kolom "ItemsJson" (kolom
//  G, ditambah BELAKANGAN dari kolom lain yang sudah ada -- lihat
//  fixCollectionsItemsColumn_() -- supaya baris lama tidak bergeser),
//  jadi SEMUA jenis item (ayat/kidung/pengumuman/teks bebas) sekarang
//  ikut tersinkron lintas perangkat lewat 1 akun, sama seperti ayat.
//  Item PDF/gambar (Media Tersimpan) TETAP tidak ikut -- itu penyimpanan
//  terpisah (lihat Bagian B di bawah), ukurannya jauh lebih besar
//  daripada muat di sel Google Sheets. VerseIdsJson & ItemsJson DIJAGA
//  TERPISAH (bukan digabung 1 sel) supaya kalau salah satunya kepanjangan
//  (lewat batas KERAS 50.000 karakter/sel Google Sheets), cuma yang itu
//  saja yang dikosongkan server (lihat safeCellJson_() di Code.gs) --
//  yang satunya tetap utuh.
//
//  BARU (tab Kidung Studio Presentasi tersambung ke js/kidung.js):
//  item type "kidung" sekarang menyimpan SNAPSHOT 1 slide (bukan cuma
//  {kidungNo,title} seperti sebelumnya) -- `buku`, `bait` (1 atau
//  beberapa bait, sesuai mode pemecah slide yang dipilih operator saat
//  itu -- lihat splitKidungIntoSlides() di js/kidung.js), & `koorTeks`
//  (teks koor yang menempel di slide itu, atau null kalau slide ini
//  tidak pakai koor). Disimpan sebagai snapshot (bukan hanya nomor
//  lalu diambil ulang tiap kali dibuka) supaya: (a) tetap tampil benar
//  walau operator OFFLINE / belum sinkron ulang data Kidung, dan (b)
//  urutan/pemecahan slide yang sudah dipilih operator untuk ACARA ini
//  tidak berubah sendiri kalau suatu saat isi Sheet Kidung diedit.
//  Kalau syairnya sendiri memang perlu diperbarui (typo dibetulkan di
//  Sheet dsb), operator tinggal buka lagi lewat tab Kidung & timpa
//  ulang item lama (belum ada tombol "segarkan" otomatis per item).
// ============================================================

function collectionsStorageKey(username) {
  return "bible_collections_v1_" + (username || "guest");
}

function _genCollectionId() {
  return "col_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

// Migrasi 1 kumpulan lama (cuma verseIds) -> bentuk generik (items +
// verseIds turunan). Aman dipanggil berkali-kali (idempotent).
function _migrateCollection(col) {
  if (!col || typeof col !== "object") return col;
  if (!Array.isArray(col.items)) {
    col.items = (Array.isArray(col.verseIds) ? col.verseIds : []).map((verseId) => ({ type: "verse", verseId }));
  }
  // verseIds selalu dihitung ulang dari items supaya 2 sumber ini TIDAK
  // pernah beda isi (single source of truth = items).
  col.verseIds = col.items.filter((it) => it && it.type === "verse").map((it) => it.verseId);
  return col;
}

function loadCollections(username) {
  try {
    const raw = localStorage.getItem(collectionsStorageKey(username));
    const parsed = raw ? JSON.parse(raw) : {};
    Object.keys(parsed).forEach((id) => _migrateCollection(parsed[id]));
    return parsed;
  } catch (e) {
    return {};
  }
}

function saveCollections(username, collectionsObj) {
  localStorage.setItem(collectionsStorageKey(username), JSON.stringify(collectionsObj));
}

function _findCollectionIdByName(collections, name) {
  const norm = (name || "").trim().toLowerCase();
  if (!norm) return null;
  return Object.keys(collections).find((id) => (collections[id].name || "").trim().toLowerCase() === norm) || null;
}

// Kirim ke Google Sheet di latar belakang (best-effort, tidak memblokir
// UI) -- HANYA verseIds yang ikut dikirim (lihat catatan sinkron di atas).
function _pushCollectionRemote(username, id, col) {
  if (typeof Sync !== "undefined") Sync.pushCollection(username, id, col);
}

// Cari-atau-buat kumpulan berdasarkan NAMA (bukan id) -- sesuai pola
// yang sudah dipakai handleAddToCollection()/psQuickAddBtn di js/app.js
// & js/presentation-studio.js (keduanya mengoper NAMA kumpulan, bukan id).
function _getOrCreateCollectionByName(collections, name) {
  const trimmedName = (name || "").trim();
  if (!trimmedName) return null;
  let id = _findCollectionIdByName(collections, trimmedName);
  if (!id) {
    id = _genCollectionId();
    const now = new Date().toISOString();
    collections[id] = { name: trimmedName, items: [], verseIds: [], createdAt: now, updatedAt: now };
  }
  return id;
}

// Fungsi generik: tambah 1 item (ayat/teks/pengumuman/kidung) ke
// kumpulan bernama `name` (dibuat kalau belum ada). Item bertipe
// "verse" tidak diduplikasi (verseId yang sama tidak ditambah 2x);
// jenis lain (teks/pengumuman/kidung) boleh berulang (mis. pengumuman
// yang sama mau ditayangkan 2x di urutan berbeda).
function addItemToCollection(username, name, item) {
  if (!item || !item.type) return null;
  const collections = loadCollections(username);
  const id = _getOrCreateCollectionByName(collections, name);
  if (!id) return null;
  const col = collections[id];
  const isDupVerse = item.type === "verse" && col.items.some((it) => it.type === "verse" && it.verseId === item.verseId);
  if (!isDupVerse) col.items.push(item);
  _migrateCollection(col); // hitung ulang verseIds turunan
  col.updatedAt = new Date().toISOString();
  saveCollections(username, collections);
  _pushCollectionRemote(username, id, col);
  return id;
}

// BARU (28 Agu 2026) -- buat kumpulan KOSONG secara langsung, tanpa
// perlu menambah 1 item dulu. Sebelumnya kumpulan HANYA bisa tercipta
// sebagai efek samping menambah item pertama (addItemToCollection() ->
// _getOrCreateCollectionByName()) lewat tab lain (Alkitab/Kidung/File/
// Pengumuman) -- tidak ada jalan untuk membuat kumpulan baru langsung
// dari tab "📚 Kumpulan Ayat" itu sendiri. Dipakai tombol "＋ Buat Baru"
// di panel Kumpulan Ayat Studio Presentasi (js/presentation-studio.js,
// wireCollectionNewButton()). Kalau nama yang sama SUDAH ada, TIDAK
// membuat duplikat -- balik id yang sudah ada itu (sama seperti
// addItemToCollection), supaya operator yang tidak sengaja mengetik
// nama yang sama tidak berakhir dengan 2 kumpulan kembar.
function createEmptyCollection(username, name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return null;
  const collections = loadCollections(username);
  const id = _getOrCreateCollectionByName(collections, trimmed);
  if (!id) return null;
  const col = collections[id];
  // Sentuh updatedAt supaya kumpulan baru ini langsung naik ke paling
  // atas dropdown (diurutkan terbaru-dulu, lihat renderCollectionSelect()
  // di js/presentation-studio.js) -- sama seperti kumpulan yang baru
  // ditambahi item lewat jalur lama.
  col.updatedAt = new Date().toISOString();
  saveCollections(username, collections);
  _pushCollectionRemote(username, id, col);
  return id;
}

// Nama lama dipertahankan (dipakai handleAddToCollection() di js/app.js
// & tombol "➕ Daftar" cepat di js/presentation-studio.js) -- sekarang
// tinggal pembungkus tipis addItemToCollection().
function addVerseToCollection(username, name, verseId) {
  if (!verseId) return null;
  return addItemToCollection(username, name, { type: "verse", verseId });
}

function addTextToCollection(username, name, text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return null;
  return addItemToCollection(username, name, { type: "text", text: trimmed });
}

function addAnnouncementToCollection(username, name, text, title) {
  const trimmed = (text || "").trim();
  if (!trimmed) return null;
  return addItemToCollection(username, name, { type: "announcement", text: trimmed, title: title || "" });
}

// BARU (4 Sep 2026) -- item Canva (roadmap ROADMAP-ai-presentation.md
// Bagian 3, tab "🔗 Link" Studio Presentasi). `embedUrl` SUDAH dalam
// bentuk resmi Canva "...view?embed" (dinormalisasi oleh
// normalizeCanvaLink() di js/presentation-studio.js SEBELUM disimpan --
// bukan link mentah apa pun yang ditempel operator) -- supaya kalau
// nanti item ini dibuka lagi dari Kumpulan Ayat, iframe-nya langsung
// jalan tanpa perlu menormalisasi ulang. `title` opsional, sekadar
// label tampilan di daftar Kumpulan Ayat (Canva tidak mengirim judul
// desainnya lewat link biasa).
function addCanvaToCollection(username, name, canvaItem) {
  if (!canvaItem || !canvaItem.embedUrl) return null;
  return addItemToCollection(username, name, {
    type: "canva",
    embedUrl: canvaItem.embedUrl,
    title: canvaItem.title || "",
  });
}

// BARU (4 Sep 2026) -- item SoundCloud (roadmap Bagian 4). `trackUrl`
// disimpan APA ADANYA (link biasa soundcloud.com/... atau on.soundcloud.com/...,
// TIDAK perlu dinormalisasi seperti Canva -- widget SoundCloud menerima
// link biasa langsung lewat parameter ?url=). `title` opsional, sekadar
// label tampilan.
function addSoundCloudToCollection(username, name, scItem) {
  if (!scItem || !scItem.trackUrl) return null;
  return addItemToCollection(username, name, {
    type: "soundcloud",
    trackUrl: scItem.trackUrl,
    title: scItem.title || "",
  });
}

// `kidungItem`: { buku, kidungNo, title, bait: [{noBait,teks}], koorTeks }
// -- 1 panggilan = 1 SLIDE ditambahkan (lihat catatan bentuk item di
// atas). Dipanggil per-slide dari tab Kidung Studio Presentasi
// (js/presentation-studio.js, wireKidungTab()) -- untuk menambah 1 lagu
// penuh sekaligus (semua slide hasil pemecahan), tab itu cukup
// memanggil fungsi ini berkali-kali (1x per slide), tidak perlu bentuk
// data baru.
function addKidungToCollection(username, name, kidungItem) {
  if (!kidungItem || !kidungItem.kidungNo) return null;
  return addItemToCollection(username, name, {
    type: "kidung",
    buku: kidungItem.buku || "Kidung",
    kidungNo: String(kidungItem.kidungNo),
    title: kidungItem.title || "",
    ikon: kidungItem.ikon || "",
    bait: Array.isArray(kidungItem.bait) ? kidungItem.bait.map((b) => ({ noBait: b.noBait, teks: b.teks })) : [],
    koorTeks: kidungItem.koorTeks || null,
    // BARU (4 Sep 2026) -- ikut disimpan supaya kidung yang ditambahkan ke
    // Kumpulan Ayat tetap membawa baris kecil "Pengarang Birama (N Bait)"
    // saat nanti ditayangkan lagi dari Kumpulan Ayat (lihat kidungSubLine()
    // di js/presentation-studio.js). Item Kumpulan Ayat LAMA (disimpan
    // sebelum kolom ini ada) otomatis jatuh ke "" / 0 -- baris kecilnya
    // sekadar tidak muncul, tidak ada error apa pun.
    pengarang: kidungItem.pengarang || "",
    birama: kidungItem.birama || "",
    jumlahBait: kidungItem.jumlahBait || 0,
  });
}

// `mediaItem`: hasil loadMediaItems() (js/collections.js) -- SATU baris
// Media Tersimpan (PDF/gambar yang sudah diunggah lewat tab File Studio
// Presentasi). `pageIndex`: halaman mana dari `mediaItem.images` yang
// mau disimpan sebagai item ini (0 = halaman pertama).
//
// BARU (27 Agu 2026) -- SEBELUM INI, "➕ Daftar" di tab File Studio Presentasi
// cuma menyimpan berkas ke "🖼️ Media Tersimpan" (perpustakaan pribadi,
// TERPISAH dari Kumpulan Ayat) -- tidak ada jalan sama sekali untuk
// memasukkan PDF/gambar ke dalam Kumpulan Ayat (daftar tayang berurutan
// di kolom kiri), padahal Kidung & Alkitab sudah bisa langsung lewat
// addKidungToCollection()/addVerseToCollection(). Fungsi ini menutup
// celah itu, dipanggil dari renderMediaList() (js/presentation-studio.js).
//
// SENGAJA cuma menyimpan REFERENSI (mediaItemId + pageIndex), BUKAN
// menyalin data gambarnya (data-URL) langsung ke dalam kumpulan --
// gambar hasil render PDF bisa besar (ratusan KB per halaman), kalau
// disalin ke SETIAP kumpulan yang memakainya, localStorage (tempat
// Kumpulan Ayat disimpan) bisa cepat penuh. Konsekuensinya: kalau
// mediaItemId aslinya dihapus dari Media Tersimpan, item ini akan
// tampil "media tidak ditemukan" saat ditayangkan (lihat sendGenericItemLive
// di js/presentation-studio.js) -- itu risiko yang disengaja diambil demi
// hemat ruang, sama seperti item "verse" yang juga cuma simpan verseId,
// bukan salinan teks ayatnya.
function addMediaToCollection(username, name, mediaItem, pageIndex) {
  if (!mediaItem || !mediaItem.id) return null;
  return addItemToCollection(username, name, {
    type: "media",
    mediaItemId: mediaItem.id,
    name: mediaItem.name || mediaItem.sourceFileName || "Berkas",
    pageIndex: pageIndex || 0,
    pageCount: (mediaItem.images || []).length || 1,
    // BARU (Tahap 5 peta jalan Drive, ROADMAP-drive-sync.md) -- kalau
    // berkas ASLI item ini pernah disinkron ke Drive (Tahap 3, lihat
    // `driveFileId` di catatan bentuk item Media Tersimpan di atas),
    // id-nya ikut disimpan di sini juga (dikirim ke server lewat
    // ItemsJson saat pushCollection). SATU-SATUNYA gunanya: kalau
    // kumpulan ini nanti di-🔗Bagikan ke akun lain, shareCollectionToUser_()
    // di apps-script/Code.gs bisa MENYALIN berkas Drive-nya (makeCopy())
    // ke akun penerima, supaya file media ikut terbagikan, bukan cuma
    // teks referensinya. null kalau item ini belum pernah disinkron ke
    // Drive -- tetap dibagikan seperti biasa, cuma tanpa berkas medianya.
    driveFileId: mediaItem.driveFileId || null,
  });
}

// Hapus/pindah item berdasarkan INDEX di array items (bukan verseId --
// item teks/pengumuman/kidung tidak punya id unik alami). Dipakai oleh
// panel Kumpulan Ayat generik di js/app.js.
function removeItemFromCollection(username, id, index) {
  const collections = loadCollections(username);
  const col = collections[id];
  if (!col || !col.items[index]) return false;
  col.items.splice(index, 1);
  _migrateCollection(col);
  col.updatedAt = new Date().toISOString();
  saveCollections(username, collections);
  _pushCollectionRemote(username, id, col);
  return true;
}

// BARU (4 Sep 2026, permintaan operator) -- kidung yang ditambahkan lewat
// "➕ Semua" (addAllBtn, lihat wireKidungTab() di js/presentation-studio.js)
// tersimpan sebagai BANYAK item TERPISAH di kumpulan (1 item per bait/
// slide -- supaya bisa ditayangkan & dilangkahi 1 bait per 1 bait lewat
// panah/clicker, sama seperti ayat Alkitab biasa, lihat renderSlides() &
// sendGenericItemLive() di js/presentation-studio.js). Konsekuensinya:
// menghapus 1 kidung yang isinya mis. 10 bait berarti menekan "Hapus" 10
// KALI SATU PER SATU (laporan operator: "sampai pusing, terlalu banyak").
// Fungsi ini menghapus SEMUA item kidung yang buku & nomornya SAMA dalam
// 1 kumpulan sekaligus lewat SATU panggilan -- dipakai tombol baru
// "🗑️ Hapus Semua Bait Kidung Ini" (lihat js/presentation-studio.js
// renderCollectionList() & js/app.js buildCollectionItemRow()).
// Mengembalikan JUMLAH item yang terhapus (0 kalau tidak ada yang cocok /
// kumpulan tidak ditemukan) -- dipakai pemanggil utk pesan konfirmasi.
function removeKidungGroupFromCollection(username, id, buku, kidungNo) {
  const collections = loadCollections(username);
  const col = collections[id];
  if (!col || !Array.isArray(col.items)) return 0;
  const before = col.items.length;
  col.items = col.items.filter((it) => !(it && it.type === "kidung" && it.buku === buku && String(it.kidungNo) === String(kidungNo)));
  const removed = before - col.items.length;
  if (removed > 0) {
    _migrateCollection(col);
    col.updatedAt = new Date().toISOString();
    saveCollections(username, collections);
    _pushCollectionRemote(username, id, col);
  }
  return removed;
}

function moveItemInCollection(username, id, index, direction) {
  const collections = loadCollections(username);
  const col = collections[id];
  if (!col || !col.items[index]) return false;
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= col.items.length) return false;
  const tmp = col.items[index];
  col.items[index] = col.items[newIndex];
  col.items[newIndex] = tmp;
  _migrateCollection(col);
  col.updatedAt = new Date().toISOString();
  saveCollections(username, collections);
  _pushCollectionRemote(username, id, col);
  return true;
}

// BARU -- pindah LANGSUNG ke posisi mana pun (bukan cuma naik/turun 1
// langkah lewat moveItemInCollection() di atas) -- dipakai tombol
// "⏮️ Awal" / "⏭️ Akhir" & kotak "Pindah ke urutan #..." di panel
// Kumpulan Ayat (js/app.js: buildCollectionItemRow()) MAUPUN kontrol
// urutan ringkas di Studio Presentasi (js/presentation-studio.js) --
// supaya menaruh 1 item ke awal/tengah/akhir daftar yang panjang tidak
// perlu klik ⬆️/⬇️ berkali-kali satu per satu.
function moveItemToPosition(username, id, index, newIndex) {
  const collections = loadCollections(username);
  const col = collections[id];
  if (!col || !col.items[index]) return false;
  const max = col.items.length - 1;
  const clamped = Math.max(0, Math.min(Number(newIndex) || 0, max));
  if (clamped === index) return false;
  const [moved] = col.items.splice(index, 1);
  col.items.splice(clamped, 0, moved);
  _migrateCollection(col);
  col.updatedAt = new Date().toISOString();
  saveCollections(username, collections);
  _pushCollectionRemote(username, id, col);
  return true;
}
function moveItemToStart(username, id, index) {
  return moveItemToPosition(username, id, index, 0);
}
function moveItemToEnd(username, id, index) {
  const collections = loadCollections(username);
  const col = collections[id];
  if (!col || !col.items[index]) return false;
  return moveItemToPosition(username, id, index, col.items.length - 1);
}

// ---- Kompatibilitas lama (dipakai js/app.js versi sebelumnya) --------
// Sekarang tinggal pembungkus tipis di atas item bertipe "verse", dicari
// lewat verseId (dipertahankan kalau ada kode lain yang masih memanggil
// dengan cara lama).
function removeVerseFromCollection(username, id, verseId) {
  const collections = loadCollections(username);
  const col = collections[id];
  if (!col) return false;
  const index = col.items.findIndex((it) => it.type === "verse" && it.verseId === verseId);
  if (index === -1) return false;
  return removeItemFromCollection(username, id, index);
}

function moveVerseInCollection(username, id, verseId, direction) {
  const collections = loadCollections(username);
  const col = collections[id];
  if (!col) return false;
  const index = col.items.findIndex((it) => it.type === "verse" && it.verseId === verseId);
  if (index === -1) return false;
  return moveItemInCollection(username, id, index, direction);
}

function renameCollection(username, id, newName) {
  const trimmed = (newName || "").trim();
  if (!trimmed) return false;
  const collections = loadCollections(username);
  const col = collections[id];
  if (!col) return false;
  col.name = trimmed;
  col.updatedAt = new Date().toISOString();
  saveCollections(username, collections);
  _pushCollectionRemote(username, id, col);
  return true;
}

function deleteCollection(username, id) {
  const collections = loadCollections(username);
  if (!collections[id]) return false;
  delete collections[id];
  saveCollections(username, collections);
  if (typeof Sync !== "undefined") Sync.deleteCollectionRemote(username, id);
  return true;
}

// Teks siap-salin (📋 di panel Kumpulan Ayat) -- urut 1..N sesuai urutan
// kumpulan, SEMUA jenis item (bukan cuma ayat).
function buildCollectionShareText(col) {
  if (!col || !col.items || !col.items.length) return "";
  const lines = [];
  col.items.forEach((it, i) => {
    if (it.type === "verse") {
      const v = typeof verseById !== "undefined" ? verseById[it.verseId] : null;
      if (!v) return; // ayat tidak ada di bahasa saat ini -- dilewati, bukan gagal semua
      lines.push(`${i + 1}. ${v.bookName} ${v.chapter}:${v.verse}\n${v.text}`);
    } else if (it.type === "text") {
      lines.push(`${i + 1}. ${it.text}`);
    } else if (it.type === "announcement") {
      lines.push(`${i + 1}. 📢 ${it.title ? it.title + " — " : ""}${it.text}`);
    } else if (it.type === "kidung") {
      lines.push(`${i + 1}. 🎵 Kidung No. ${it.kidungNo}${it.title ? " — " + it.title : ""}`);
    }
  });
  return lines.join("\n\n");
}

// ------------------------------------------------------------
// 🔗 BAGIKAN KUMPULAN KE PENGGUNA LAIN -- operator mengetik username
// tujuan, tekan "Bagikan" (js/app.js: handleShareCollection() / tab
// Kumpulan Ayat Studio: js/presentation-studio.js), kirim ke
// Sync.shareCollection() -> shareCollectionToUser_() di
// apps-script/Code.gs, yang MENYALIN (bukan memindah) semua item
// kumpulan itu jadi kumpulan baru milik akun tujuan. Ikut menyertakan
// TEMA Layar Proyeksi yang sedang dipakai pengirim SAAT INI (dibaca
// langsung dari localStorage, kuncinya harus SAMA PERSIS dengan
// THEME_KEY di js/presentation-studio.js -- disalin literalnya di sini
// supaya file ini tetap berdiri sendiri tanpa perlu presentation-
// studio.js dimuat) -- penerima TIDAK otomatis memakainya, cuma
// tersimpan sebagai info yang bisa mereka terapkan sendiri kalau mau.
// ------------------------------------------------------------
const STUDIO_THEME_KEY_FOR_SHARE_ = "bible_app_studio_theme_v1";

async function shareCollectionToUser(username, id, targetUsername) {
  if (typeof Sync === "undefined" || !Sync.enabled()) {
    return { ok: false, error: "Sinkronisasi ke server belum aktif." };
  }
  const target = String(targetUsername || "").trim().toLowerCase();
  if (!target) return { ok: false, error: "Username tujuan kosong." };
  let theme = null;
  try {
    const raw = localStorage.getItem(STUDIO_THEME_KEY_FOR_SHARE_);
    if (raw) theme = JSON.parse(raw);
  } catch (e) { /* diamkan -- berbagi tetap jalan tanpa tema */ }
  return Sync.shareCollection(username, id, target, theme);
}

// ------------------------------------------------------------
// BARU -- 🔔 KIRIMAN MENUNGGU PERSETUJUAN. Sebelumnya 🔗 Bagikan
// langsung menyalin kumpulan ke akun tujuan tanpa persetujuan; sekarang
// kumpulan itu disimpan server sebagai "pending" (lihat
// shareCollectionToUser_() di apps-script/Code.gs) sampai penerima
// menekan Terima/Tolak lewat 2 fungsi berikut.
// ------------------------------------------------------------
async function checkPendingCollectionShares(username) {
  if (typeof Sync === "undefined" || !Sync.enabled()) return [];
  return Sync.pullPendingShares(username);
}

async function respondToCollectionShare(username, id, action) {
  if (typeof Sync === "undefined" || !Sync.enabled()) {
    return { ok: false, error: "Sinkronisasi ke server belum aktif." };
  }
  const res = await Sync.respondShare(username, id, action);
  // Kalau diterima, tarik ulang Kumpulan Ayat dari server supaya kumpulan
  // yang baru saja "lolos" jadi normal itu langsung muncul di HP ini juga
  // (tidak perlu tunggu sinkron berkala berikutnya).
  if (res && res.ok && action === "accept") {
    try { await refreshCollectionsFromRemote(username); } catch (e) { /* diamkan, sinkron berkala akan menyusul */ }
  }
  return res;
}

// BARU -- "🎨 Terapkan tema kiriman": dipanggil dari tombol di panel
// Kumpulan Ayat (js/app.js) saat kumpulan yang sedang dilihat punya
// col.theme terisi (artinya kumpulan ini hasil BAGIKAN dari akun lain
// yang menyertakan tema Layar Proyeksi mereka, lihat
// shareCollectionToUser() di atas & shareCollectionToUser_() di
// apps-script/Code.gs). Sebelumnya tema itu cuma tersimpan sebagai
// data (lihat catatan di readCollections_()/refreshCollectionsFromRemote()
// di atas) tanpa ada cara menerapkannya -- sekarang tinggal delegasikan
// ke PresentationStudio.applySharedTheme() (js/presentation-studio.js),
// yang menimpa tema Layar Proyeksi milik PENERIMA dengan tema kiriman
// ini (aktif untuk Studio & Layar 2 penerima, TIDAK mengubah apa pun
// di akun pengirim).
function applyCollectionTheme(username, id) {
  const collections = loadCollections(username);
  const col = collections[id];
  if (!col || !col.theme) return { ok: false, error: "Kumpulan ini tidak membawa tema kiriman." };
  if (typeof PresentationStudio === "undefined" || !PresentationStudio.applySharedTheme) {
    return { ok: false, error: "Studio Presentasi belum siap." };
  }
  const applied = PresentationStudio.applySharedTheme(col.theme);
  return applied ? { ok: true } : { ok: false, error: "Format tema tidak valid." };
}

// Nama kumpulan yang PALING BARU dipakai (updatedAt/createdAt terbaru
// duluan) -- dipakai dialog "Simpan ke Kumpulan Ayat" (promptCollectionName()
// di js/presentation-studio.js) supaya operator tinggal klik, tidak perlu
// ketik ulang nama yang sudah ada.
function getRecentCollectionNames(username, limit) {
  const collections = loadCollections(username);
  const ids = Object.keys(collections).sort(
    (a, b) => new Date(collections[b].updatedAt || collections[b].createdAt || 0)
      - new Date(collections[a].updatedAt || collections[a].createdAt || 0)
  );
  return ids.slice(0, limit || 8).map((id) => collections[id].name);
}

// Tarik Kumpulan Ayat dari Google Sheet & gabung dengan yang lokal --
// per-kumpulan (per id), yang updatedAt-nya PALING BARU yang menang,
// dipanggil sekali diam-diam setelah login (lihat js/app.js startApp()).
// Mengembalikan true kalau ada perubahan (dipakai app.js untuk gambar
// ulang panel Kumpulan Ayat kalau sedang terbuka).
async function refreshCollectionsFromRemote(username) {
  if (typeof Sync === "undefined" || !Sync.enabled()) return false;
  const remote = await Sync.pullCollections(username);
  if (!remote || !Object.keys(remote).length) return false;
  const local = loadCollections(username);
  let changed = false;
  Object.keys(remote).forEach((id) => {
    const r = remote[id];
    const l = local[id];
    if (!l || new Date(r.updatedAt || 0) > new Date(l.updatedAt || 0)) {
      // BARU -- Sheet sekarang JUGA menyimpan "items" generik (kolom
      // ItemsJson, lihat readCollections_()/saveCollection_() di
      // apps-script/Code.gs) -- kalau ada isinya, itu yang dipakai APA
      // ADANYA (sudah lengkap, sudah termasuk ayat/kidung/teks/pengumuman
      // dalam urutan yang benar). Kalau kosong (baris LAMA dari sebelum
      // kolom ini ada, atau memang overflow lewat 50.000 karakter &
      // sengaja dikosongkan server -- lihat safeCellJson_()), jatuh ke
      // cara lama: rekonstruksi dari verseIds + pertahankan item non-ayat
      // LOKAL yang sudah ada (kalau ada), supaya tidak ada yang hilang
      // tertimpa versi Sheet yang kosong.
      // BARU -- "theme" (metadata tema Layar Proyeksi pengirim, lihat
      // shareCollectionToUser_() di apps-script/Code.gs) sekarang IKUT
      // disimpan lokal juga -- sebelumnya field ini dibuang begitu saja
      // di sini, jadi walau server sudah menyimpannya, penerima tidak
      // pernah punya cara mengaksesnya sama sekali. TIDAK diterapkan
      // otomatis (tetap perlu tombol "🎨 Terapkan tema kiriman" di
      // panel, lihat renderCollectionsPanel() di js/app.js).
      if (Array.isArray(r.items) && r.items.length) {
        local[id] = {
          name: r.name,
          items: r.items,
          verseIds: [],
          theme: r.theme || null,
          createdAt: r.createdAt || r.updatedAt || new Date().toISOString(),
          updatedAt: r.updatedAt || new Date().toISOString(),
        };
      } else {
        const keepNonVerseItems = (l && Array.isArray(l.items)) ? l.items.filter((it) => it.type !== "verse") : [];
        const verseItems = (r.verseIds || []).map((verseId) => ({ type: "verse", verseId }));
        local[id] = {
          name: r.name,
          items: verseItems.concat(keepNonVerseItems),
          verseIds: [],
          theme: r.theme || null,
          createdAt: r.createdAt || r.updatedAt || new Date().toISOString(),
          updatedAt: r.updatedAt || new Date().toISOString(),
        };
      }
      _migrateCollection(local[id]);
      changed = true;
    }
  });
  if (changed) saveCollections(username, local);
  return changed;
}

// ============================================================
//  BAGIAN B) MEDIA TERSIMPAN (Studio Presentasi)
// ============================================================
//  Lapisan tipis di atas LocalDB.putMediaItem/getMediaItemsByUsername/
//  deleteMediaItem (js/db.js, IndexedDB store "studioMedia") -- lokal
//  per perangkat saja, TIDAK disinkron ke Sheet (data-URL gambar/PDF-
//  jadi-gambar terlalu besar untuk itu -- lihat catatan STATUS di
//  js/presentation-studio.js poin 8).
//
//  Bentuk 1 item media (disimpan apa adanya di IndexedDB):
//    {
//      id, username, name,
//      images: [dataUrlOrEmbedUrl, ...],   // >1 = PDF multi-halaman /
//                                          // daftar video YouTube
//      sourceFileName: string,
//      type: "image" | "youtube",
//      videoLabels: [{ title, durationLabel }, ...] | null,  // khusus type "youtube"
//      createdAt, updatedAt: ISO string,
//      driveFileId: string | null,   // BARU (Tahap 3 peta jalan Drive,
//                                    // lihat ROADMAP-drive-sync.md) --
//                                    // terisi kalau operator mencentang
//                                    // "☁️ Sinkron ke akun" saat
//                                    // mengunggah DAN unggahan ke Drive
//                                    // berhasil (diisi belakangan, lihat
//                                    // catatan di addMediaItem() di
//                                    // bawah -- TIDAK memblokir
//                                    // penyimpanan lokal yang sudah
//                                    // terjadi duluan). null berarti
//                                    // belum/tidak disinkron -- item
//                                    // TETAP jalan seperti biasa (cuma
//                                    // lokal), sama seperti sebelum
//                                    // Tahap 3 ada.
//    }
// ============================================================

function _genMediaId() {
  return "media_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

// `onSyncResult(ok, errorMessage)` -- BARU (27 Agu 2026), OPSIONAL --
// dipanggil belakangan (setelah addMediaItem() sendiri sudah selesai
// & mengembalikan id-nya) begitu upload ke Drive di latar belakang
// SELESAI, entah berhasil atau gagal. Sebelum ini, kalau "☁️ Sinkron
// ke akun" dicentang tapi upload gagal (mis. deployment Apps Script
// belum di-redeploy ulang setelah DriveApp ditambahkan, sehingga izin
// akses Drive belum disetujui -- kesalahan paling umum), pemanggil
// (presentation-studio.js) TIDAK PERNAH tahu -- "✅ Tersimpan" tetap
// muncul (itu benar, penyimpanan LOKAL memang berhasil) tapi tidak ada
// petunjuk sama sekali kenapa filenya tidak pernah muncul di folder
// "BookApp Media" di Drive. Callback ini TIDAK mengubah alur/hasil
// penyimpanan lokal sama sekali (tetap best-effort seperti sebelumnya,
// lihat catatan di bawah) -- cuma tambahan jalur untuk MELAPORKAN hasil
// akhirnya ke UI, supaya kegagalan tidak lagi diam-diam tak terlihat.
async function addMediaItem(username, name, images, sourceFileName, type, videoLabels, originalFileDataUrl, syncToDrive, onSyncResult) {
  const trimmedName = (name || "").trim();
  if (!trimmedName || !images || !images.length) return null;
  const now = new Date().toISOString();
  const item = {
    id: _genMediaId(),
    username: username || "guest",
    name: trimmedName,
    images: images.slice(),
    sourceFileName: sourceFileName || "",
    type: type || "image",
    videoLabels: videoLabels || null,
    createdAt: now,
    updatedAt: now,
    // BARU -- kalau ini PDF & operator mencentang "Simpan juga file PDF
    // asli" saat mengunggah (lihat wireFileTab() di
    // js/presentation-studio.js), berkas mentahnya (data-URL) disimpan di
    // sini SELAIN gambar hasil render per halaman -- supaya bisa diunduh
    // utuh sebagai .pdf, bukan cuma gambar. null kalau tidak dicentang
    // (perilaku lama, tidak boros ruang IndexedDB). Ini SELALU lokal per
    // perangkat (IndexedDB), tidak ikut tersinkron/dibagikan ke akun lain
    // -- sama seperti "images" lainnya.
    originalFile: originalFileDataUrl || null,
    driveFileId: null, // diisi belakangan kalau syncToDrive -- lihat di bawah
  };
  try {
    if (typeof LocalDB === "undefined") return null;
    await LocalDB.putMediaItem(item);
  } catch (e) {
    return null; // penyimpanan perangkat penuh / IndexedDB tidak tersedia
  }
  // BARU (Tahap 3) -- kalau dicentang "☁️ Sinkron ke akun", unggah SATU
  // berkas (originalFile PDF asli kalau ada, kalau tidak gambar pertama)
  // ke Drive di LATAR BELAKANG lewat Sync.uploadMedia() (js/sync.js) --
  // SENGAJA tidak di-`await` di sini supaya "✅ Tersimpan" (yang sudah
  // terjadi lewat penyimpanan lokal di atas) tidak menunggu upload besar
  // selesai dulu. Kalau berhasil, item yang SUDAH tersimpan itu ditimpa
  // ulang (put() dengan id sama = update) untuk menambahkan driveFileId.
  // Kalau offline/gagal, dibiarkan begitu saja -- item tetap 100% jalan
  // secara lokal, sama seperti sebelum Tahap 3 ada (lihat catatan
  // keamanan/fallback yang sama di js/sync.js pushCollection dkk).
  if (syncToDrive && typeof Sync !== "undefined" && typeof Sync.uploadMedia === "function") {
    const uploadSource = originalFileDataUrl || images[0] || null;
    if (!uploadSource) {
      if (typeof onSyncResult === "function") onSyncResult(false, "Tidak ada berkas untuk diunggah.");
    } else if (!Sync.enabled()) {
      // CONFIG.APPS_SCRIPT_URL belum diisi sama sekali -- beda dari
      // "gagal karena offline", jadi dilaporkan beda pesannya supaya
      // tidak membingungkan (pengguna tidak akan mengira internetnya
      // yang bermasalah, padahal memang belum dikonfigurasi). TIDAK
      // diantre (Tahap 7) -- mencoba lagi tidak akan pernah berhasil
      // selama CONFIG.APPS_SCRIPT_URL tetap kosong.
      if (typeof onSyncResult === "function") onSyncResult(false, "Sinkron belum dikonfigurasi (CONFIG.APPS_SCRIPT_URL kosong).");
    } else if (typeof navigator !== "undefined" && navigator.onLine === false) {
      // BARU (Tahap 7, ROADMAP-drive-sync.md) -- HP/komputer SEDANG
      // offline saat ini: jangan buang waktu mencoba fetch() yang sudah
      // pasti gagal (browser biasanya tetap menunggu timeout dulu) --
      // langsung diantre lewat queueMediaUpload() di bawah, dicoba lagi
      // otomatis nanti (lihat processMediaUploadQueue(), dipanggil saat
      // event "online" & saat Media Tersimpan dibuka lagi, lihat
      // wireMediaUploadQueueAutoRetry() di bawah). Penyimpanan LOKAL
      // (di atas) sudah 100% berhasil terlepas dari ini -- media tetap
      // bisa dipakai/ditayangkan seperti biasa di perangkat ini, cuma
      // salinan Drive-nya yang menyusul belakangan.
      queueMediaUpload(username, item.id, sourceFileName || trimmedName, uploadSource);
      if (typeof onSyncResult === "function") onSyncResult(false, "☁️ Sedang offline -- diantre, akan otomatis dicoba lagi saat online.");
    } else {
      Sync.uploadMedia(username, sourceFileName || trimmedName, uploadSource)
        .then((fileId) => {
          if (!fileId) {
            // BARU (Tahap 7) -- server menolak/tidak membalas (mis.
            // deployment belum di-redeploy ulang, ATAU jaringan sempat
            // putus di tengah jalan walau navigator.onLine masih true
            // saat awal dicoba) -- diantre juga supaya otomatis dicoba
            // lagi, alih-alih operator harus mengunggah ulang manual
            // dari awal begitu penyebabnya (mis. deployment) sudah
            // diperbaiki.
            queueMediaUpload(username, item.id, sourceFileName || trimmedName, uploadSource);
            if (typeof onSyncResult === "function") {
              onSyncResult(false, "Server menolak/tidak membalas fileId (cek deployment Apps Script sudah versi terbaru & izin akses Drive sudah disetujui) -- diantre untuk dicoba lagi otomatis.");
            }
            return;
          }
          if (typeof LocalDB !== "undefined") {
            item.driveFileId = fileId;
            item.updatedAt = new Date().toISOString();
            LocalDB.putMediaItem(item).catch(() => {});
          }
          if (typeof onSyncResult === "function") onSyncResult(true, null);
        })
        .catch((e) => {
          // BARU (Tahap 7) -- gagal jaringan di tengah jalan (mis.
          // sinyal hilang pas sedang mengunggah) -- diantre, sama
          // seperti 2 cabang gagal di atas.
          queueMediaUpload(username, item.id, sourceFileName || trimmedName, uploadSource);
          if (typeof onSyncResult === "function") onSyncResult(false, "Jaringan/permintaan gagal: " + String((e && e.message) || e) + " -- diantre untuk dicoba lagi otomatis.");
        });
    }
  }
  return item.id;
}

// ------------------------------------------------------------
// TAHAP 7 (ROADMAP-drive-sync.md) -- "Penanganan offline/gagal-kirim
// (antrean 'menunggu sinkron')". Sebelum ini, kalau unggahan ke Drive
// gagal (offline / server tidak terjangkau saat itu), item tersebut
// SELAMANYA tidak akan ikut ke Drive kecuali diunggah ULANG SECARA
// MANUAL dari awal (hapus dari Media Tersimpan, unggah lagi) -- tidak
// ada mekanisme coba-lagi otomatis sama sekali. Fungsi-fungsi di bawah
// menutup celah itu: entri antrean disimpan di IndexedDB (store
// "mediaUploadQueue", lihat js/db.js), dicoba lagi otomatis:
//   (a) begitu koneksi kembali online (event "online" di window), &
//   (b) setiap kali Media Tersimpan dibuka/disegarkan (renderMediaList(),
//       js/presentation-studio.js) -- jaring pengaman kalau event
//       "online" tidak sempat terpasang/terlewat (mis. app baru dibuka
//       lagi setelah offline).
// SELALU best-effort & tidak pernah memblokir apa pun -- kalau gagal
// lagi, entri tetap di antrean untuk dicoba lagi nanti, TIDAK
// menampilkan error yang mengganggu di tengah pemakaian normal.
// ------------------------------------------------------------

// 1 entri antrean = 1 percobaan unggah yang tertunda. `id` dibuat dari
// `mediaItemId` (bukan acak) SUPAYA idempotent -- kalau addMediaItem()
// gagal berkali-kali untuk item yang SAMA (mis. offline lama), entrinya
// cuma DITIMPA ulang (put() dengan id sama), tidak menumpuk jadi banyak
// salinan antrean untuk 1 item yang sama.
function _mediaQueueId(mediaItemId) { return "q_" + mediaItemId; }

async function queueMediaUpload(username, mediaItemId, fileName, dataUrl) {
  try {
    if (typeof LocalDB === "undefined") return false;
    const now = new Date().toISOString();
    await LocalDB.putQueuedMediaUpload({
      id: _mediaQueueId(mediaItemId),
      username: username || "guest",
      mediaItemId,
      fileName: fileName || "berkas",
      dataUrl,
      attempts: 0,
      queuedAt: now,
    });
    // Perbarui badge "⏳N" SEKETIKA (jangan menunggu renderMediaList()
    // berikutnya dibuka) -- lihat updateMediaQueueBadge() di
    // js/presentation-studio.js.
    if (typeof window.updateMediaQueueBadge === "function") window.updateMediaQueueBadge(username);
    return true;
  } catch (e) {
    return false; // penyimpanan penuh -- diamkan, item tetap jalan lokal
  }
}

// Dipanggil saat online lagi / Media Tersimpan dibuka -- mencoba SEMUA
// entri antrean milik `username` ini satu-per-satu (berurutan, BUKAN
// paralel, supaya tidak membanjiri Apps Script dengan banyak permintaan
// besar sekaligus kalau antreannya panjang). Mengembalikan jumlah yang
// BERHASIL disinkronkan (dipakai UI untuk menampilkan notifikasi
// singkat kalau > 0, lihat wireMediaUploadQueueAutoRetry() di bawah).
async function processMediaUploadQueue(username) {
  try {
    if (typeof Sync === "undefined" || !Sync.enabled() || typeof LocalDB === "undefined") return 0;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return 0;
    const queue = await LocalDB.getQueuedMediaUploadsByUsername(username || "guest");
    if (!queue.length) return 0;
    let successCount = 0;
    for (const entry of queue) {
      try {
        const fileId = await Sync.uploadMedia(entry.username, entry.fileName, entry.dataUrl);
        if (!fileId) continue; // masih gagal -- biarkan di antrean, coba lagi lain kali
        // Berhasil -- perbarui item Media Tersimpan aslinya (kalau masih
        // ada -- operator mungkin sudah menghapusnya duluan sebelum
        // sempat tersinkron, itu bukan masalah, cukup buang entri
        // antreannya saja tanpa error) dengan driveFileId barunya.
        const item = await LocalDB.getMediaItem(entry.mediaItemId).catch(() => null);
        if (item) {
          item.driveFileId = fileId;
          item.updatedAt = new Date().toISOString();
          await LocalDB.putMediaItem(item).catch(() => {});
        }
        await LocalDB.deleteQueuedMediaUpload(entry.id).catch(() => {});
        successCount++;
      } catch (e) {
        // masih gagal (jaringan putus lagi di tengah antrean, dst) --
        // biarkan entri ini di antrean, lanjut ke entri berikutnya
        // (bukan langsung berhenti semua, siapa tahu sisanya berhasil).
      }
    }
    return successCount;
  } catch (e) {
    return 0;
  }
}

// Dipasang SEKALI saja (dipanggil dari app.js setelah login berhasil) --
// pasang listener "online" & langsung coba proses antrean sekali di
// awal (jaring pengaman kalau app dibuka sudah dalam keadaan online
// setelah sempat ditutup saat offline dengan antrean tertunda).
let _mediaQueueAutoRetryWired = false;
function wireMediaUploadQueueAutoRetry(username) {
  if (typeof window === "undefined") return;
  const tryNow = async () => {
    const n = await processMediaUploadQueue(username);
    if (typeof window.updateMediaQueueBadge === "function") window.updateMediaQueueBadge(username);
    if (n > 0 && typeof renderMediaList === "function") renderMediaList();
  };
  if (!_mediaQueueAutoRetryWired) {
    _mediaQueueAutoRetryWired = true;
    window.addEventListener("online", tryNow);
  }
  tryNow(); // coba sekali langsung juga, tidak menunggu event "online"
}

async function loadMediaItems(username) {
  try {
    if (typeof LocalDB === "undefined") return [];
    const items = await LocalDB.getMediaItemsByUsername(username || "guest");
    return (items || []).sort(
      (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
    );
  } catch (e) {
    return [];
  }
}

// ------------------------------------------------------------
// TAHAP 4 (ROADMAP-drive-sync.md) -- "Tarik media dari Drive di
// perangkat lain". Dipanggil dari renderMediaList() (js/presentation-
// studio.js) SETIAP KALI panel "🖼️ Media Tersimpan" dibuka/disegarkan --
// membandingkan daftar file yang sudah ada di Drive milik akun ini
// (Sync.listMediaFiles(), metadata ringan saja) dengan `driveFileId`
// yang SUDAH dikenal secara lokal (IndexedDB perangkat ini). File Drive
// yang belum punya padanan lokal berarti diunggah dari PERANGKAT LAIN
// (mis. PDF disinkron dari komputer, sekarang dibuka lewat HP) --
// untuk itu dibuatkan item "stub" lokal (`images: []`, `driveOnly:
// true`) supaya MUNCUL di daftar Media Tersimpan perangkat ini juga,
// TAPI isi gambarnya belum diunduh sama sekali (hemat kuota HP, sesuai
// permintaan "baru diunduh saat mau ditayangkan, bukan auto-download
// semua sekaligus") -- baru benar-benar diunduh saat operator menekan
// tombol "☁️ Muat dari Drive" (loadDriveMediaOnDemand(), di
// js/presentation-studio.js).
//
// Best-effort & SEPENUHNYA aman dipanggil berulang kali: kalau offline/
// Sync belum dikonfigurasi, langsung kembali tanpa melakukan apa-apa
// (daftar lokal yang sudah ada tetap seperti biasa, sama seperti
// sebelum Tahap 4 ada). TIDAK PERNAH menghapus/menimpa item lokal yang
// sudah punya gambarnya sendiri -- hanya MENAMBAH stub untuk file yang
// benar-benar belum dikenal perangkat ini.
async function syncMediaFromDrive(username) {
  try {
    if (typeof Sync === "undefined" || !Sync.enabled() || typeof Sync.listMediaFiles !== "function") return false;
    if (typeof LocalDB === "undefined") return false;
    const remoteFiles = await Sync.listMediaFiles(username);
    if (!remoteFiles || !remoteFiles.length) return false;

    const localItems = await loadMediaItems(username);
    const knownFileIds = {};
    localItems.forEach((it) => { if (it.driveFileId) knownFileIds[it.driveFileId] = true; });

    const newOnes = remoteFiles.filter((f) => f.fileId && !knownFileIds[f.fileId]);
    if (!newOnes.length) return false;

    const now = new Date().toISOString();
    for (const f of newOnes) {
      const item = {
        id: _genMediaId(),
        username: username || "guest",
        name: f.name || "Berkas dari Drive",
        images: [], // BELUM diunduh -- lihat loadDriveMediaOnDemand()
        sourceFileName: f.name || "",
        type: "image", // ditentukan ulang saat diunduh (bisa jadi PDF)
        videoLabels: null,
        createdAt: f.createdAt || now,
        updatedAt: f.createdAt || now,
        originalFile: null,
        driveFileId: f.fileId,
        driveMimeType: f.mimeType || "",
        driveOnly: true, // BARU -- ditandai belum diunduh isinya sama sekali
      };
      await LocalDB.putMediaItem(item).catch(() => {});
    }
    return true;
  } catch (e) {
    return false; // offline / gagal -- daftar lokal tetap seperti biasa
  }
}

async function removeMediaItem(username, id) {
  try {
    if (typeof LocalDB === "undefined") return false;
    await LocalDB.deleteMediaItem(id);
    return true;
  } catch (e) {
    return false;
  }
}

// ------------------------------------------------------------
// BARU (27 Agu 2026) -- penghapusan PERMANEN dari Drive (bukan cuma
// menyembunyikan dari daftar lokal seperti removeMediaItem() di atas),
// dengan aturan yang diminta secara eksplisit: hanya pengunggah PERTAMA
// yang boleh menyetujui. Lihat catatan panjang di konstanta
// MEDIA_OWNERSHIP_SHEET/MEDIA_DELETE_REQUESTS_SHEET di
// apps-script/Code.gs untuk latar belakang lengkapnya. Fungsi-fungsi di
// sini murni membungkus Sync.* (js/sync.js) supaya UI (js/presentation-
// studio.js & js/app.js) tidak perlu tahu soal Sync langsung, pola sama
// seperti checkPendingCollectionShares()/respondToCollectionShare() di
// atas untuk 🔗 Bagikan Kumpulan Ayat.
// ------------------------------------------------------------

// "Siapa saja yang pakai file ini?" -- dipanggil SEBELUM dialog
// konfirmasi hapus ditampilkan, supaya operator melihat daftar pemakai
// dulu sebelum menekan "Ya, hapus" (permintaan eksplisit: "ada
// persetujuan apa yakin mau dihapus").
async function getMediaFileUsers(fileId) {
  if (typeof Sync === "undefined" || !Sync.enabled()) return { ok: false, users: [] };
  return Sync.mediaOwners(fileId);
}

// Mengajukan hapus permanen. Kalau `username` adalah pengunggah pertama,
// server langsung menghapusnya (res.deleted === true). Kalau bukan,
// server membuat permintaan tertunda (res.pending === true) yang harus
// disetujui `res.originalOwner` dulu (lihat checkPendingMediaDeleteRequests()
// di bawah, dicek saat pemilik pertama itu login).
async function requestDeleteMediaFromDrive(username, fileId, fileName, reason) {
  if (typeof Sync === "undefined" || !Sync.enabled()) {
    return { ok: false, error: "Sinkronisasi ke server belum aktif." };
  }
  return Sync.requestMediaDelete(username, fileId, fileName, reason);
}

// Dipanggil saat login (js/app.js, mirip checkPendingCollectionShares) --
// daftar permintaan hapus yang MENUNGGU keputusan `username` ini sebagai
// pemilik pertama.
async function checkPendingMediaDeleteRequests(username) {
  if (typeof Sync === "undefined" || !Sync.enabled()) return [];
  return Sync.pendingMediaDeleteRequests(username);
}

async function respondToMediaDeleteRequest(username, requestId, approve) {
  if (typeof Sync === "undefined" || !Sync.enabled()) {
    return { ok: false, error: "Sinkronisasi ke server belum aktif." };
  }
  return Sync.respondMediaDelete(username, requestId, approve);
}

// Nama item Media Tersimpan yang PALING BARU dipakai, sama pola seperti
// getRecentCollectionNames() di atas -- dipakai promptSaveName("media", ...)
// di js/presentation-studio.js.
async function getRecentMediaNames(username, limit) {
  const items = await loadMediaItems(username); // sudah terurut terbaru dulu
  const seen = {};
  const names = [];
  items.forEach((it) => {
    const n = (it.name || "").trim();
    if (!n || seen[n]) return;
    seen[n] = true;
    names.push(n);
  });
  return names.slice(0, limit || 8);
}

// ------------------------------------------------------------
// Migrasi Media Tersimpan LAMA (sebelum 20 Agu 2026, tersimpan di
// localStorage) -> IndexedDB (store "studioMedia", lihat js/db.js).
// Kunci localStorage lama TIDAK tercatat di kode yang tersisa (file ini
// sendiri yang hilang) -- beberapa kemungkinan nama kunci lama dicoba
// di sini secara aman (idempotent: kalau tidak ketemu, tidak melakukan
// apa-apa, tidak error). Kalau ternyata perangkat Anda masih punya Media
// Tersimpan lama yang tidak ikut termigrasi otomatis, kunci aslinya bisa
// dicari manual lewat DevTools -> Application -> Local Storage, lalu
// tambahkan ke daftar `LEGACY_MEDIA_KEYS` di bawah.
// ------------------------------------------------------------
const LEGACY_MEDIA_KEYS = [
  "bible_app_studio_media_v1",
  "bible_studio_media_v1",
  "presentation_studio_media_v1",
];

async function migrateLegacyMediaItemsIfNeeded() {
  if (typeof LocalDB === "undefined") return;
  for (const key of LEGACY_MEDIA_KEYS) {
    let raw;
    try {
      raw = localStorage.getItem(key);
    } catch (e) {
      continue;
    }
    if (!raw) continue;
    let legacy;
    try {
      legacy = JSON.parse(raw);
    } catch (e) {
      localStorage.removeItem(key);
      continue;
    }
    // Dua bentuk lama yang mungkin: array item langsung, ATAU objek
    // { username: [item, ...] } (dipisah per pengguna).
    const legacyItems = Array.isArray(legacy)
      ? legacy
      : Object.keys(legacy || {}).reduce((acc, u) => acc.concat((legacy[u] || []).map((it) => Object.assign({ username: u }, it))), []);
    for (const it of legacyItems) {
      if (!it || !it.images || !it.images.length) continue;
      const item = {
        id: it.id || _genMediaId(),
        username: it.username || "guest",
        name: it.name || "(tanpa nama)",
        images: it.images,
        sourceFileName: it.sourceFileName || "",
        type: it.type || "image",
        videoLabels: it.videoLabels || null,
        createdAt: it.createdAt || new Date().toISOString(),
        updatedAt: it.updatedAt || it.createdAt || new Date().toISOString(),
      };
      try { await LocalDB.putMediaItem(item); } catch (e) { /* lewati item ini, lanjut yang lain */ }
    }
    localStorage.removeItem(key); // sudah dipindah, jangan dobel lain kali
  }
}
