// ============================================================
//  PENGATURAN PRIBADI PENGGUNA
// ============================================================
//  Saat ini baru satu pengaturan: nyala/mati animasi progres
//  membaca (notifikasi "sudah separuh / tiga perempat / selesai
//  membaca" + kembang api). Disimpan PER PENGGUNA (bukan satu
//  pengaturan untuk semua orang), karena tiap orang bisa berbeda
//  selera -- tersimpan lokal secara instan, dan disinkronkan ke
//  Google Sheet (tab "Settings", lewat js/sync.js) di latar
//  belakang supaya pilihan yang sama ikut terbawa saat dibuka
//  dari perangkat lain dengan akun yang sama.
//
//  Defaultnya animasi ini AKTIF untuk semua pengguna baru.
// ============================================================
const DEFAULT_SETTINGS = {
  readingProgressAnimation: true,
  // Tampilan kolom paralel (1 = satu bahasa seperti biasa, 2/3 = beberapa
  // bahasa berdampingan). columnLangs menyimpan kode bahasa untuk kolom
  // ke-2 dan ke-3 (kolom pertama selalu memakai bahasa aktif / langSelect).
  columns: 1,
  columnLangs: [],
  // Arah tampilan kolom paralel saat columns > 1: "side" = berdampingan
  // (menyamping, kiri-kanan), "stacked" = atas-bawah (satu di atas yang
  // lain). Tidak berpengaruh saat columns = 1.
  columnDirection: "side",
  // Mode tampilan ayat: "chapter" = seluruh pasal (perilaku lama/default),
  // "verse" = cuma 1 ayat yang ditampilkan (lihat menu ⋮ → 👁️ Tampilan
  // Ayat, dan renderChapter()/renderVerseJumpBar() di js/app.js).
  verseDisplayMode: "chapter",
  // Warna biru pada tanda catatan kaki di dalam teks ayat (mis. "1a",
  // "2", "3b" -- lihat js/footnotes.js). Defaultnya AKTIF (biru);
  // dimatikan lewat menu ⋮ -> "🔵 Warna biru pada tanda catatan kaki".
  footnoteAccentBlue: true,
  // BARU (7 Sep 2026, permintaan operator: "download alkitab tertentu
  // yang tidak aktif" / hemat penyimpanan perangkat) -- daftar KODE
  // bahasa (cocok dengan CONFIG.LANGUAGES, mis. "ind","kjv") yang MAU
  // disimpan ke IndexedDB perangkat ini saat sinkron. Array KOSONG =
  // SEMUA bahasa (perilaku lama/default, tidak ada yang berubah untuk
  // siapa pun yang belum pernah mengatur ini). Kalau diisi (mis.
  // ["ind","rvind"]), baris CSV berbahasa LAIN dari yang dipilih
  // dilewati (tidak ikut disimpan) saat syncFromServer() (js/app.js) --
  // lihat catatan panjang di sana. CATATAN PENTING: ini MENGURANGI
  // pemakaian penyimpanan & waktu proses di perangkat, TAPI TIDAK
  // mengurangi ukuran UNDUHAN itu sendiri -- server (Google Sheet CSV)
  // mengirim SEMUA baris sekaligus (1 sheet, banyak bahasa jadi satu),
  // jadi kuota data yang terpakai saat unduh tetap sama besar. Karena
  // ini pengaturan PER AKUN (bukan per perangkat), otomatis ikut sama
  // di HP lain yang login dengan akun yang sama (lihat setSetting()/
  // refreshSettingsFromRemote() di file ini).
  bibleLangFilter: [],
};

function settingsStorageKey(username) {
  return "bible_settings_v1_" + (username || "guest");
}

function loadLocalSettings(username) {
  try {
    const raw = localStorage.getItem(settingsStorageKey(username));
    const saved = raw ? JSON.parse(raw) : {};
    return Object.assign({}, DEFAULT_SETTINGS, saved);
  } catch (e) {
    return Object.assign({}, DEFAULT_SETTINGS);
  }
}

function saveLocalSettings(username, settingsObj) {
  const updatedAt = new Date().toISOString();
  const withMeta = Object.assign({}, settingsObj, { updatedAt });
  localStorage.setItem(settingsStorageKey(username), JSON.stringify(withMeta));
  return withMeta;
}

function getSetting(username, key) {
  const settings = loadLocalSettings(username);
  return settings[key];
}

// Menyimpan satu pengaturan: langsung ke lokal (instan), lalu kirim ke
// Google Sheet di latar belakang (best-effort, tidak memblokir UI).
function setSetting(username, key, value) {
  const settings = loadLocalSettings(username);
  settings[key] = value;
  const saved = saveLocalSettings(username, settings);
  if (typeof Sync !== "undefined") Sync.pushSettings(username, saved);
  return saved;
}

// Menarik pengaturan dari Google Sheet dan menggabungkannya dengan yang
// tersimpan lokal -- yang paling baru (updatedAt) yang dipakai. Dipanggil
// diam-diam sekali setelah login / setiap kali app dibuka.
async function refreshSettingsFromRemote(username) {
  if (typeof Sync === "undefined" || !Sync.enabled()) return;
  const remote = await Sync.pullSettings(username);
  if (!remote) return;
  const local = loadLocalSettings(username);
  if (!local.updatedAt || (remote.updatedAt && new Date(remote.updatedAt) > new Date(local.updatedAt))) {
    saveLocalSettings(username, Object.assign({}, DEFAULT_SETTINGS, remote));
  }
}
