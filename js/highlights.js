// ============================================================
//  HIGHLIGHT WARNA PER AYAT
// ============================================================
//  Setiap pengguna bisa menandai satu ayat penuh dengan warna pastel
//  (kuning/hijau/biru). Dipicu dengan SEKALI klik pada nomor ayat di
//  sebelah kiri, yang memunculkan popup melayang berisi pilihan warna
//  (lihat openHighlightPopup() di js/app.js).
//
//  CATATAN PENTING (lihat juga penjelasan di chat):
//  Modul ini sengaja memakai localStorage saja -- SAMA seperti
//  js/notes.js -- BUKAN IndexedDB (js/db.js). Artinya highlight ini,
//  seperti catatan pribadi, HANYA tersimpan di perangkat ini dan
//  TIDAK ikut disinkronkan ke Google Sheet / perangkat lain untuk
//  saat ini. Ini keputusan sadar supaya pola penyimpanannya konsisten
//  dengan catatan pribadi yang sudah ada; kalau nanti mau disinkron
//  juga, tinggal tambahkan Sync.pushHighlight/pullHighlights dengan
//  pola yang sama seperti di notes.js.
// ============================================================
function highlightsStorageKey(username) {
  return "bible_highlights_v1_" + (username || "guest");
}

function loadLocalHighlights(username) {
  try {
    const raw = localStorage.getItem(highlightsStorageKey(username));
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveLocalHighlights(username, highlightsObj) {
  try {
    localStorage.setItem(highlightsStorageKey(username), JSON.stringify(highlightsObj));
  } catch (e) {
    // localStorage penuh atau diblokir browser -- diamkan saja, highlight
    // tetap tampil di sesi ini walau tidak berhasil disimpan permanen.
  }
}

// Mengembalikan kode warna ("yellow" | "green" | "blue") atau null kalau
// ayat ini tidak sedang di-highlight.
function getVerseHighlight(username, verseId) {
  const all = loadLocalHighlights(username);
  return all[verseId] ? all[verseId].color : null;
}

// Menyimpan/menghapus highlight satu ayat. color = null atau "" untuk
// menghapus highlight-nya.
function setVerseHighlight(username, verseId, color) {
  const all = loadLocalHighlights(username);
  if (color) {
    all[verseId] = { color, updatedAt: new Date().toISOString() };
  } else {
    delete all[verseId];
  }
  saveLocalHighlights(username, all);
}
