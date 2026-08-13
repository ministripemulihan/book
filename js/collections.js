// ============================================================
//  KUMPULAN AYAT (mis. "SPR 17 Agustus 2026") — sekumpulan ayat
//  pilihan yang disimpan bersama dalam satu nama, supaya bisa
//  dibuka lagi & dibaca satu-per-satu kapan pun.
// ============================================================
//  CATATAN: untuk sekarang disimpan LOKAL saja (localStorage per
//  akun di perangkat ini), sama seperti pola bible_notes_v1_ /
//  bible_plan_v1_ sebelum disinkronkan. BELUM disinkronkan ke
//  Google Sheet lintas perangkat — lihat catatan di pesan balasan
//  soal ini (bisa ditambahkan menyusul, mengikuti pola js/sync.js
//  yang sudah ada untuk catatan/progres/pengumuman).
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
// ke situ; kalau belum ada, kumpulan baru otomatis dibuat.
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
  saveCollections(username, collections);
  return targetId;
}

function removeVerseFromCollection(username, collectionId, verseId) {
  const collections = loadCollections(username);
  if (!collections[collectionId]) return;
  collections[collectionId].verseIds = collections[collectionId].verseIds.filter((v) => v !== verseId);
  saveCollections(username, collections);
}

function deleteCollection(username, collectionId) {
  const collections = loadCollections(username);
  delete collections[collectionId];
  saveCollections(username, collections);
}
