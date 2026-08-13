// ============================================================
//  KUMPULAN AYAT (mis. "SPR 17 Agustus 2026") — sekumpulan ayat
//  pilihan yang disimpan bersama dalam satu nama, supaya bisa
//  dibuka lagi & dibaca satu-per-satu kapan pun.
// ============================================================
//  Tersimpan lokal secara instan (localStorage per akun di perangkat
//  ini, jadi tetap jalan walau offline), lalu disinkronkan ke Google
//  Sheet di latar belakang (lewat js/sync.js, tab "Collections") --
//  sama persis dengan pola bible_notes_v1_ / bible_plan_v1_ -- supaya
//  kumpulan yang dibuat di satu HP juga muncul saat login dari HP/
//  komputer lain. Link 🎵MP3/🎬MP4/▶️YouTube TIDAK ikut disimpan di
//  sini -- itu selalu diambil langsung dari sheet Bacaan Bersuara
//  (js/media.js) tiap kali kumpulan dibuka, supaya kalau linknya
//  diganti di Sheet, kumpulan lama otomatis ikut memakai link terbaru
//  di perangkat mana pun (lihat renderCollectionDetailInto() di app.js).
// ============================================================
function collectionsStorageKey(username) {
  return "bible_collections_v1_" + (username || "guest");
}

function loadCollections(username) {
  try {
    const raw = localStorage.getItem(collectionsStorageKey(username));
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveCollections(username, collectionsObj) {
  localStorage.setItem(collectionsStorageKey(username), JSON.stringify(collectionsObj));
}

// Menambah satu ayat ke kumpulan bernama `collectionName`. Kalau nama itu
// sudah ada (dicocokkan tanpa peduli huruf besar/kecil), ayat ditambahkan
// ke situ; kalau belum ada, kumpulan baru otomatis dibuat. Langsung
// tersimpan lokal, lalu dikirim ke Google Sheet di latar belakang
// (best-effort, tidak memblokir UI -- sama seperti catatan pribadi).
function addVerseToCollection(username, collectionName, verseId) {
  const collections = loadCollections(username);
  const trimmedName = (collectionName || "").trim();
  if (!trimmedName || !verseId) return null;

  let targetId = Object.keys(collections).find(
    (id) => collections[id].name.toLowerCase() === trimmedName.toLowerCase()
  );
  if (!targetId) {
    targetId = "col_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    collections[targetId] = { name: trimmedName, createdAt: new Date().toISOString(), verseIds: [] };
  }
  if (!collections[targetId].verseIds.includes(verseId)) {
    collections[targetId].verseIds.push(verseId);
  }
  collections[targetId].updatedAt = new Date().toISOString();
  saveCollections(username, collections);
  pushCollectionToRemote(username, targetId, collections[targetId]);
  return targetId;
}

function removeVerseFromCollection(username, collectionId, verseId) {
  const collections = loadCollections(username);
  if (!collections[collectionId]) return;
  collections[collectionId].verseIds = collections[collectionId].verseIds.filter((v) => v !== verseId);
  collections[collectionId].updatedAt = new Date().toISOString();
  saveCollections(username, collections);
  pushCollectionToRemote(username, collectionId, collections[collectionId]);
}

function deleteCollection(username, collectionId) {
  const collections = loadCollections(username);
  delete collections[collectionId];
  saveCollections(username, collections);
  if (typeof Sync !== "undefined") Sync.deleteCollectionRemote(username, collectionId);
}

function pushCollectionToRemote(username, id, col) {
  if (typeof Sync !== "undefined") Sync.pushCollection(username, id, col);
}

// Menarik Kumpulan Ayat dari Google Sheet dan menggabungkannya dengan yang
// ada di perangkat ini: per kumpulan (bukan ditimpa semua sekaligus), yang
// UpdatedAt-nya lebih baru yang dipakai -- supaya kumpulan yang baru saja
// dibuat/diubah secara offline di HP ini TIDAK hilang tertimpa data lama
// dari Sheet, dan kumpulan baru dari HP lain tetap ikut muncul di sini.
// Kumpulan lokal yang belum pernah sampai ke Sheet (mis. dibuat saat
// offline) otomatis dikirim ulang di akhir proses ini.
// Dipanggil sekali secara diam-diam setelah login / setiap kali app dibuka.
async function refreshCollectionsFromRemote(username) {
  if (typeof Sync === "undefined" || !Sync.enabled()) return false;
  const remote = await Sync.pullCollections(username);
  const local = loadCollections(username);
  let changed = false;

  Object.keys(remote || {}).forEach((id) => {
    const r = remote[id];
    const l = local[id];
    if (!l || new Date(r.updatedAt || 0) > new Date(l.updatedAt || 0)) {
      local[id] = { name: r.name, verseIds: r.verseIds || [], createdAt: r.createdAt, updatedAt: r.updatedAt };
      changed = true;
    }
  });
  if (changed) saveCollections(username, local);

  // Kumpulan lokal yang belum ada di Sheet sama sekali (mis. dibuat waktu
  // offline / sebelum sinkronisasi ini ada) -- kirim susulan sekarang.
  Object.keys(local).forEach((id) => {
    if (!remote || !remote[id]) pushCollectionToRemote(username, id, local[id]);
  });

  return changed;
}
