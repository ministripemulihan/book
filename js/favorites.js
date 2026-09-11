/**
 * ============================================================
 *  js/favorites.js -- Utilitas Favorit GENERIK lintas jenis
 *  (sound / youtube / kidung), dipakai oleh menu "Pustaka Media"
 *  yang baru (js/media-library.js).
 * ============================================================
 *  Lihat "RENCANA-PUSTAKA-MEDIA-FAVORIT.md" bagian 2 & 13d untuk
 *  latar belakang lengkap.
 *
 *  Kenapa file terpisah, bukan pakai ulang KIDUNG_FAVORITES_KEY yang
 *  sudah ada di js/kidung-ui.js: favorit Kidung LAMA (kunci
 *  `kidung_favorites_v1`) SENGAJA TIDAK diubah/dipindah supaya favorit
 *  kidung operator yang sudah jalan sekarang tidak hilang. Utilitas di
 *  file ini HANYA dipakai untuk Efek Suara & YouTube yang baru --
 *  Kidung BOLEH ikut ditandai lewat sini juga (opsional, lihat
 *  `FAVORITES_INCLUDES_KIDUNG` di bawah), tapi itu TIDAK
 *  menggantikan/menghapus sistem lama, hanya menambah 1 cara pandang
 *  gabungan untuk tab "⭐ Favorit" di menu Pustaka Media.
 *
 *  Disimpan 100% di localStorage per perangkat (MVP, sama seperti
 *  favorit Kidung lama) -- TIDAK butuh Apps Script, TIDAK sinkron
 *  antar perangkat/akun.
 *
 *  Struktur penyimpanan (bagian 13d -- diurutkan by "terakhir
 *  difavoritkan", bukan urutan aslinya):
 *    {
 *      "sound:cheerRekaman": 1757564400000,
 *      "youtube:abc123":     1757564500000,
 *      "kidung:Kidung|169":  1757564600000
 *    }
 *  Key gabungan "{type}:{id}" (bukan objek bersarang per type) supaya
 *  gampang di-iterasi & diurutkan lintas jenis sekaligus untuk tab
 *  "⭐ Favorit Saya" yang menampilkan campuran ketiganya dalam 1 daftar.
 *
 *  Dipakai sebagai <script src="js/favorites.js"></script> biasa (bukan
 *  module) -- expose lewat `window.Favorites`, konsisten dengan pola
 *  `window.KidungAnak`/`window.SoundFX` yang sudah ada di proyek ini.
 * ============================================================
 */
(function (global) {
  "use strict";

  const FAVORITES_KEY = "media_favorites_v1";
  // Jenis yang dikenal -- dipakai untuk validasi ringan saja (tidak
  // memblokir jenis lain kalau suatu saat ditambah, hanya dipakai
  // listFavorites() saat memfilter per jenis lewat startsWith).
  const KNOWN_TYPES = ["sound", "youtube", "kidung"];

  function readStore_() {
    try {
      const raw = global.localStorage.getItem(FAVORITES_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) {
      // localStorage rusak/berisi data lama tidak valid -- jangan
      // sampai melempar error ke seluruh menu Pustaka Media, cukup
      // anggap kosong (sama pola aman seperti loadKidungFavorites()).
      return {};
    }
  }

  function writeStore_(store) {
    try {
      global.localStorage.setItem(FAVORITES_KEY, JSON.stringify(store));
      return true;
    } catch (err) {
      // Kemungkinan localStorage penuh/diblokir browser -- gagal diam-
      // diam, UI pemanggil boleh cek nilai balik kalau mau tahu.
      return false;
    }
  }

  function keyOf_(type, id) {
    return String(type || "") + ":" + String(id || "");
  }

  // isFavorite(type, id) -> boolean
  function isFavorite(type, id) {
    const store = readStore_();
    return Object.prototype.hasOwnProperty.call(store, keyOf_(type, id));
  }

  // toggleFavorite(type, id) -> boolean (true = SEKARANG jadi favorit,
  // false = SEKARANG dilepas). Menyimpan Date.now() saat ditambahkan
  // supaya tab "⭐ Favorit" bisa urutkan "terbaru difavoritkan dulu"
  // (bagian 13d).
  function toggleFavorite(type, id) {
    const store = readStore_();
    const k = keyOf_(type, id);
    const nowFavorite = !Object.prototype.hasOwnProperty.call(store, k);
    if (nowFavorite) {
      store[k] = Date.now();
    } else {
      delete store[k];
    }
    writeStore_(store);
    return nowFavorite;
  }

  // listFavorites(type?) -> [{ type, id, favoritedAt }, ...]
  // Urut MENURUN berdasarkan favoritedAt (paling baru ditandai favorit
  // tampil paling atas). type opsional -- kosongkan untuk semua jenis
  // sekaligus (dipakai tab "⭐ Favorit Saya" yang menggabungkan
  // sound+youtube+kidung dalam 1 daftar campur).
  function listFavorites(type) {
    const store = readStore_();
    const out = [];
    Object.keys(store).forEach((k) => {
      const sep = k.indexOf(":");
      if (sep === -1) return; // data tidak dikenal -- lewati diam-diam
      const itemType = k.slice(0, sep);
      const itemId = k.slice(sep + 1);
      if (type && itemType !== type) return;
      out.push({ type: itemType, id: itemId, favoritedAt: store[k] });
    });
    out.sort((a, b) => (b.favoritedAt || 0) - (a.favoritedAt || 0));
    return out;
  }

  // countFavorites(type?) -> number -- dipakai untuk badge angka kecil
  // di tab "⭐ Favorit" kalau media-library.js mau menampilkannya.
  function countFavorites(type) {
    return listFavorites(type).length;
  }

  global.Favorites = {
    KNOWN_TYPES: KNOWN_TYPES.slice(),
    isFavorite,
    toggleFavorite,
    listFavorites,
    countFavorites,
  };
})(typeof window !== "undefined" ? window : this);
