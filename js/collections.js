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
//        { type: "kidung", kidungNo, title },               // kidung (lihat catatan di bawah)
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
//  CATATAN PENTING soal sinkron item non-ayat: Sheet "Collections" di
//  server (apps-script/Code.gs) baru punya kolom VerseIdsJson -- BELUM
//  ada kolom untuk item kidung/pengumuman/teks bebas. Jadi untuk saat
//  ini, item type "verse" ikut sinkron lintas perangkat seperti biasa,
//  sedangkan item "text"/"announcement"/"kidung" HANYA tersimpan lokal
//  per perangkat (belum ikut ke Sheet). Ini didokumentasikan supaya
//  tidak mengejutkan -- langkah lanjutan (kolom "ItemsJson" baru di
//  Sheet + Code.gs) dicatat sebagai pekerjaan susulan, bukan bug.
//
//  Item type "kidung" sengaja hanya menyimpan { kidungNo, title } (bukan
//  seluruh syairnya) -- karena tab Kidung di Studio Presentasi BELUM
//  tersambung ke sumber data kidung (lihat catatan STATUS di
//  js/presentation-studio.js, poin 7) -- begitu itu tersambung, syair
//  lengkapnya tinggal diambil ulang lewat js/kidung.js pakai kidungNo
//  ini, tidak perlu ubah struktur item.
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

function addKidungToCollection(username, name, kidungNo, title) {
  if (!kidungNo) return null;
  return addItemToCollection(username, name, { type: "kidung", kidungNo: String(kidungNo), title: title || "" });
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
      // Hasil dari Sheet hanya berisi verseIds (lihat catatan sinkron di
      // atas) -- item non-ayat milik kumpulan LOKAL yang sudah ada (kalau
      // ada) TETAP dipertahankan supaya tidak hilang tertimpa versi Sheet
      // yang belum tahu bentuk item generik.
      const keepNonVerseItems = (l && Array.isArray(l.items)) ? l.items.filter((it) => it.type !== "verse") : [];
      const verseItems = (r.verseIds || []).map((verseId) => ({ type: "verse", verseId }));
      local[id] = {
        name: r.name,
        items: verseItems.concat(keepNonVerseItems),
        verseIds: [],
        createdAt: r.createdAt || r.updatedAt || new Date().toISOString(),
        updatedAt: r.updatedAt || new Date().toISOString(),
      };
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
//    }
// ============================================================

function _genMediaId() {
  return "media_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

async function addMediaItem(username, name, images, sourceFileName, type, videoLabels) {
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
  };
  try {
    if (typeof LocalDB === "undefined") return null;
    await LocalDB.putMediaItem(item);
    return item.id;
  } catch (e) {
    return null; // penyimpanan perangkat penuh / IndexedDB tidak tersedia
  }
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

async function removeMediaItem(username, id) {
  try {
    if (typeof LocalDB === "undefined") return false;
    await LocalDB.deleteMediaItem(id);
    return true;
  } catch (e) {
    return false;
  }
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
