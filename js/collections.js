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

// Mengganti nama kumpulan yang sudah ada (mis. kalau salah ketik).
function renameCollection(username, collectionId, newName) {
  const collections = loadCollections(username);
  if (!collections[collectionId]) return false;
  const trimmed = (newName || "").trim();
  if (!trimmed) return false;
  collections[collectionId].name = trimmed;
  collections[collectionId].updatedAt = new Date().toISOString();
  saveCollections(username, collections);
  pushCollectionToRemote(username, collectionId, collections[collectionId]);
  return true;
}

function removeVerseFromCollection(username, collectionId, verseId) {
  const collections = loadCollections(username);
  if (!collections[collectionId]) return;
  collections[collectionId].verseIds = collections[collectionId].verseIds.filter((v) => v !== verseId);
  collections[collectionId].updatedAt = new Date().toISOString();
  saveCollections(username, collections);
  pushCollectionToRemote(username, collectionId, collections[collectionId]);
}

// Menggeser urutan satu ayat di dalam kumpulan (dipakai tombol ⬆️/⬇️ di
// panel Kumpulan Ayat) -- `direction` -1 = naik/lebih awal, +1 = turun/
// lebih akhir. Kalau sudah di ujung (paling atas/bawah), tidak ngapa-apain.
function moveVerseInCollection(username, collectionId, verseId, direction) {
  const collections = loadCollections(username);
  const col = collections[collectionId];
  if (!col) return false;
  const idx = col.verseIds.indexOf(verseId);
  if (idx === -1) return false;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= col.verseIds.length) return false;
  const tmp = col.verseIds[idx];
  col.verseIds[idx] = col.verseIds[newIdx];
  col.verseIds[newIdx] = tmp;
  col.updatedAt = new Date().toISOString();
  saveCollections(username, collections);
  pushCollectionToRemote(username, collectionId, col);
  return true;
}

function deleteCollection(username, collectionId) {
  const collections = loadCollections(username);
  delete collections[collectionId];
  saveCollections(username, collections);
  if (typeof Sync !== "undefined") Sync.deleteCollectionRemote(username, collectionId);
}

// Daftar NAMA kumpulan yang sudah ada, diurutkan dari yang PALING BARU
// dipakai/diubah (updatedAt) ke yang paling lama -- dipakai untuk kasih
// rekomendasi/autocomplete saat menyimpan sesuatu ke Kumpulan Ayat, supaya
// operator tidak perlu ingat-ingat & ketik ulang nama persis sama tiap kali
// (mis. "SPR 17 Agustus 2026") -- lihat promptCollectionName() di
// js/presentation-studio.js.
function getRecentCollectionNames(username, limit) {
  const collections = loadCollections(username);
  return Object.values(collections)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
    .slice(0, limit || 8)
    .map((c) => c.name);
}

// ============================================================
//  SALIN SEMUA (Kumpulan Ayat) — 22 Agu 2026, atas permintaan: tombol
//  📋 di panel detail kumpulan (lihat renderCollectionDetailInto() di
//  js/app.js) yang menyalin SEMUA ayat di kumpulan itu sekaligus ke
//  clipboard, urut dari yang PERTAMA sampai yang TERAKHIR persis
//  seperti urutan tampil di layar (col.verseIds -- urutan yang sama
//  yang bisa diatur pakai ⬆️/⬇️ di tiap butir), BUKAN diurutkan ulang
//  alfabetis/per-kitab. Tiap ayat ditulis "{kitab} {pasal}:{ayat}"
//  lalu isi ayatnya di baris berikutnya, dipisah 1 baris kosong antar
//  ayat (beda dari format Kidung -- buildKidungShareText() di
//  js/kidung.js -- yang rapat tanpa baris kosong, karena di sana
//  semua bait memang 1 kidung yang sama; di sini tiap butir ayat
//  berdiri sendiri-sendiri, bisa dari kitab/pasal manapun).
//  `verseById` = variabel global dari js/app.js (id ayat -> objek
//  ayat {bookName, chapter, verse, text, ...}), diisi saat Alkitab
//  sudah disinkron -- kalau suatu ayat kebetulan belum ada di situ
//  (mis. beda bahasa dari yang sedang aktif saat ini), butir itu
//  dilewati saja (tidak bikin baris kosong/error), sama seperti
//  tampilan panel Kumpulan sendiri sudah menangani ("ayat tidak
//  ditemukan di bahasa saat ini").
// ============================================================
function buildCollectionShareText(col) {
  if (!col || !col.verseIds || !col.verseIds.length) return "";
  const lines = [];
  let n = 0;
  col.verseIds.forEach((verseId) => {
    const v = typeof verseById !== "undefined" ? verseById[verseId] : null;
    if (!v) return;
    n += 1;
    lines.push(n + ". " + v.bookName + " " + v.chapter + ":" + v.verse);
    lines.push(v.text);
    lines.push("");
  });
  if (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n");
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

// ============================================================
//  MEDIA TERSIMPAN (File/PPTX/PDF/Gambar yang di-"+ Daftar"-kan dari
//  tab File Studio Presentasi) — sengaja terpisah dari Kumpulan Ayat
//  di atas: item di sini berisi gambar (data-URL) yang bisa besar,
//  jadi HANYA disimpan lokal di perangkat ini, TIDAK disinkronkan ke
//  Google Sheet (beda dari Kumpulan Ayat/verseIds -- lihat catatan di
//  bawah soal kenapa keduanya TIDAK digabung jadi satu tempat).
//  Tampil sebagai tab "🖼️ Media Tersimpan" di kolom kiri Studio,
//  bisa dibuka & ditayangkan lagi di mode 1 monitor maupun dual
//  monitor (sama seperti item ayat di Kumpulan Ayat).
//
//  RIWAYAT PENYIMPANAN (20 Agu 2026): sebelumnya semua item di sini
//  ditulis sebagai SATU blob JSON raksasa ke localStorage
//  ("bible_app_studio_media_v1_<user>"). localStorage per origin di
//  browser cuma punya jatah TOTAL sekitar 5-10MB (SEMUA key gabung,
//  bukan per-file) -- padahal 1 PDF hasil di-render jadi gambar
//  (skala 2x + base64) gampang lebih besar dari itu walau file PDF
//  aslinya cuma beberapa MB. Itu sebab error "Gagal menyimpan
//  (penyimpanan perangkat penuh?)" muncul meski file di bawah batas
//  25MB yang ditulis di UI -- batas 25MB itu cuma mengecek ukuran
//  file ASLI yang diunggah (lihat handleFiles() di
//  js/presentation-studio.js), bukan ukuran hasil render+encode yang
//  sebenarnya disimpan.
//  SEKARANG dipindah ke IndexedDB (lewat LocalDB di js/db.js, store
//  "studioMedia") -- kuotanya jauh lebih besar (umumnya ratusan MB
//  sampai beberapa GB, tergantung sisa disk), dan tiap item disimpan
//  sebagai RECORD TERPISAH (bukan 1 blob gabungan), jadi 1 file besar
//  tidak lagi mengancam menghabiskan jatah semua item lain.
//  Semua fungsi di bawah sekarang ASYNC (kembalikan Promise) --
//  pemanggilnya (js/presentation-studio.js) sudah disesuaikan pakai
//  `await`.
// ============================================================
const LEGACY_MEDIA_KEY_PREFIX = "bible_app_studio_media_v1_";
function legacyMediaStorageKey(username) {
  return LEGACY_MEDIA_KEY_PREFIX + (username || "guest");
}

// Migrasi SEKALI SAJA per akun: kalau masih ada data lama di
// localStorage (dari sebelum 20 Agu 2026), pindahkan tiap itemnya ke
// IndexedDB lalu hapus key localStorage-nya. Aman dipanggil berkali-
// kali (setelah migrasi pertama, key lama sudah tidak ada lagi jadi
// langsung skip).
async function migrateLegacyMediaItemsIfNeeded(username) {
  let raw;
  try {
    raw = localStorage.getItem(legacyMediaStorageKey(username));
  } catch (e) {
    return;
  }
  if (!raw) return;
  try {
    const items = JSON.parse(raw) || [];
    for (const item of items) {
      item.username = username || "guest";
      try {
        await LocalDB.putMediaItem(item);
      } catch (e) {
        // 1 item gagal (jarang terjadi) -- lanjut item lain, jangan
        // sampai seluruh migrasi batal gara-gara 1 item bermasalah.
      }
    }
  } catch (e) {
    /* JSON rusak -- lewati saja, tidak bisa diselamatkan */
  } finally {
    try { localStorage.removeItem(legacyMediaStorageKey(username)); } catch (e) {}
  }
}

// Mengembalikan Promise<array> semua item Media Tersimpan milik
// `username`, diurutkan dari yang paling LAMA ke paling BARU (sama
// seperti urutan lama, supaya tampilan daftar tidak tiba-tiba
// berubah urutan).
async function loadMediaItems(username) {
  await migrateLegacyMediaItemsIfNeeded(username);
  try {
    const items = await LocalDB.getMediaItemsByUsername(username || "guest");
    return items.sort((a, b) => new Date(a.addedAt || 0) - new Date(b.addedAt || 0));
  } catch (e) {
    return [];
  }
}

// Menambah 1 file (bisa multi-halaman/slide) ke Media Tersimpan.
// `images`: array data-URL (untuk type "image", dari gambar/PDF) ATAU
// array embed-URL YouTube (untuk type "youtube") -- lihat wireYoutubeTab()
// di js/presentation-studio.js. `type` opsional, default "image" supaya
// pemanggil lama (gambar/PDF) tidak perlu berubah.
// `labels` OPSIONAL: array sejajar dengan `images`, khusus type "youtube"
// -- [{ title, durationLabel }, ...] per video, supaya panel "Media
// Tersimpan" bisa menampilkan judul & durasi tiap video di dalam daftar,
// bukan cuma nama gabungan + hitungan slide. Diisi dari queue di
// wireYoutubeTab(); untuk gambar/PDF cukup dibiarkan undefined.
// Mengembalikan Promise<id> item baru, atau Promise<null> kalau gagal
// (mis. disk benar-benar penuh -- jauh lebih jarang terjadi sekarang
// karena kuota IndexedDB jauh lebih besar dari localStorage).
async function addMediaItem(username, name, images, fileName, type, labels) {
  const trimmedName = (name || fileName || "Media").trim();
  if (!images || !images.length) return null;
  const item = {
    id: "media_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    username: username || "guest",
    name: trimmedName,
    fileName: fileName || trimmedName,
    images,
    type: type || "image",
    addedAt: new Date().toISOString(),
  };
  if (labels && labels.length) item.videoLabels = labels;
  try {
    await LocalDB.putMediaItem(item);
    return item.id;
  } catch (e) {
    return null;
  }
}

async function removeMediaItem(username, id) {
  try {
    await LocalDB.deleteMediaItem(id);
  } catch (e) {
    /* item mungkin sudah tidak ada -- abaikan */
  }
}

// Nama-nama Media Tersimpan yang PALING BARU dipakai, untuk rekomendasi
// klik-langsung saat menyimpan item baru (dropzone File & daftar
// YouTube) -- pola sama seperti getRecentCollectionNames() di atas,
// dipakai oleh promptSaveName() (js/presentation-studio.js). Nama bisa
// berulang antar item (tidak digabung jadi 1 seperti Kumpulan Ayat),
// jadi di sini di-dedup dulu sebelum dipotong ke `limit`.
async function getRecentMediaNames(username, limit) {
  const items = await loadMediaItems(username);
  const sorted = items.slice().sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0));
  const seen = new Set();
  const names = [];
  for (const it of sorted) {
    const n = (it.name || "").trim();
    if (!n || seen.has(n.toLowerCase())) continue;
    seen.add(n.toLowerCase());
    names.push(n);
    if (names.length >= (limit || 8)) break;
  }
  return names;
}
