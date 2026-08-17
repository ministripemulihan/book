// ============================================================
//  JENJANG LEVEL PENGGUNA (administrator, penatua, gembala distrik,
//  gembala, pra gembala, inti, atau kosong = "Kaum Saleh")
// ============================================================
//  Satu akun boleh punya 1-2 level sekaligus (mis. "administrator,
//  gembala distrik"). Fungsi di sini dipakai di seluruh app.js untuk
//  menentukan menu apa yang boleh dilihat, dan (untuk pengembangan
//  selanjutnya) siapa yang boleh dipantau siapa.
// ============================================================

// Diisi setelah login berhasil / setelah data pengguna lokal dibaca ulang.
let currentUserLevels = []; // larik key level, mis. ["gembala distrik", "inti"]

// Tipe akun (BARU) -- "premium" atau "" (biasa). Diambil dari kolom "Tipe"
// di Sheet Pengguna (lihat parseUserTypeField() di js/csv.js). Dipakai
// khusus untuk menentukan siapa yang boleh melihat menu "🕘 Riwayat" di
// dalam AI Chat (lihat js/aichat.js) -- BUKAN untuk hak akses level
// gembala/administrator, yang tetap diatur lewat currentUserLevels di atas.
let currentUserType = "";

function levelDefs() {
  return (typeof CONFIG !== "undefined" && CONFIG.LEVEL_DEFINITIONS) || [];
}

function levelDef(key) {
  return levelDefs().find((d) => d.key === key) || null;
}

function levelLabel(key) {
  const d = levelDef(key);
  return d ? d.label : key;
}

// rank terkecil (paling berwenang) di antara level-level yang dimiliki.
// Tidak punya level sama sekali -> Infinity (setara "Kaum Saleh", paling bawah).
function ranksOf(levels) {
  const defs = levelDefs();
  const ranks = (levels || [])
    .map((k) => {
      const d = defs.find((x) => x.key === k);
      return d ? d.rank : null;
    })
    .filter((r) => r !== null);
  return ranks;
}

function bestRank(levels) {
  const ranks = ranksOf(levels);
  return ranks.length ? Math.min(...ranks) : Infinity;
}

function isAdministrator(levels) {
  return (levels || currentUserLevels).includes("administrator");
}

// Apakah pengguna punya level apa pun (bukan "Kaum Saleh")
function hasAnyLevel(levels) {
  return (levels || currentUserLevels).length > 0;
}

function hasLevel(key, levels) {
  return (levels || currentUserLevels).includes(key);
}

// Label tampilan gabungan, mis. "Gembala Distrik, Inti" atau "Kaum Saleh"
function levelDisplayLabel(levels) {
  const l = levels || currentUserLevels;
  if (!l || !l.length) return CONFIG.NO_LEVEL_LABEL || "Kaum Saleh";
  return l.map(levelLabel).join(", ");
}

// Apakah `viewerLevels` (level orang yang sedang login) boleh memantau/
// melihat seseorang dengan `targetLevels`. Aturan bertingkat: administrator
// bisa melihat semua; selain itu hanya bisa melihat rank SAMA atau LEBIH
// RENDAH (angka rank lebih besar / kewenangan lebih kecil) dari rank
// terbaik miliknya sendiri. (Dipakai oleh fitur pemantauan pembacaan.)
function canViewLevel(viewerLevels, targetLevels) {
  if (isAdministrator(viewerLevels)) return true;
  const viewerBest = bestRank(viewerLevels);
  const targetBest = bestRank(targetLevels);
  return targetBest >= viewerBest;
}

// Menyegarkan currentUserLevels dari data pengguna yang tersimpan lokal
// (IndexedDB) -- dipanggil setelah login / setiap kali app dibuka, supaya
// tetap berfungsi walau offline (levels ikut tersimpan lokal bersama akun).
async function resolveCurrentUserLevels(username) {
  try {
    const users = await LocalDB.getAllUsers();
    const match = users.find((u) => u.username === (username || "").toLowerCase());
    currentUserLevels = (match && match.levels) || [];
    currentUserType = (match && match.userType) || "";
  } catch (e) {
    currentUserLevels = [];
    currentUserType = "";
  }
  return currentUserLevels;
}

// Apakah pengguna yang sedang login berstatus "premium" (kolom "Tipe" di
// Sheet Pengguna). Dipakai untuk menampilkan/menyembunyikan menu "🕘
// Riwayat" di dalam AI Chat -- lihat js/aichat.js.
function isPremiumUser() {
  return currentUserType === "premium";
}
