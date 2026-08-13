// ============================================================
//  LOG AKTIVITAS PENGGUNA
// ============================================================
//  Mencatat: username, tanggal, jam, sistem operasi (perkiraan dari
//  browser), alamat IP (perkiraan, lewat layanan publik ipify —
//  lihat catatan di bawah), menu yang dibuka, dan kata yang dicari.
//  Dikirim ke Google Sheet (tab "ActivityLog") lewat Apps Script,
//  sama seperti catatan & progres rencana baca (lihat js/sync.js).
//
//  CATATAN JUJUR soal IP address: Google Apps Script (backend gratis
//  yang dipakai aplikasi ini) TIDAK diberi tahu oleh Google alamat IP
//  asli pengunjung web app-nya (ini pembatasan dari Google sendiri,
//  bukan aplikasi ini). Sebagai gantinya, browser pengguna sendiri
//  yang bertanya ke layanan publik gratis (api.ipify.org) "IP publik
//  saya berapa?", lalu hasilnya disertakan di log. Ini akurat untuk
//  kebanyakan kasus, TAPI: (1) beberapa jaringan kantor/rumah memakai
//  satu IP publik yang sama untuk banyak orang/perangkat (NAT), (2) di
//  HP yang berpindah dari WiFi ke data seluler IP-nya bisa berubah,
//  dan (3) kalau permintaan ke ipify gagal/lambat (offline dsb), log
//  tetap terkirim tanpa IP (kosong) — tidak sampai menghalangi menu
//  lain untuk dipakai.
// ============================================================
let _cachedClientIp = null;
let _clientIpPromise = null;

async function getClientIp() {
  if (_cachedClientIp) return _cachedClientIp;
  if (!_clientIpPromise) {
    _clientIpPromise = fetch("https://api.ipify.org?format=json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        _cachedClientIp = (d && d.ip) || "";
        return _cachedClientIp;
      })
      .catch(() => "");
  }
  return _clientIpPromise;
}

// Perkiraan sistem operasi dari User-Agent / platform browser. Tidak 100%
// presisi (browser modern makin menyamarkan detail versi), tapi cukup
// untuk membedakan Windows / Mac(Apple) / Linux / Android / iPhone-iPad.
function detectOS() {
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  if (/android/i.test(ua)) return "Android (HP)";
  if (/iphone|ipad|ipod/i.test(ua)) return "Apple iOS (HP/Tablet)";
  if (/mac os x|macintosh/i.test(ua) || /^mac/i.test(platform)) return "Apple macOS (Komputer)";
  if (/windows/i.test(ua)) return "Windows (Komputer)";
  if (/linux/i.test(ua) && !/android/i.test(ua)) return "Linux (Komputer)";
  return "Lainnya/Tidak diketahui";
}

function activityLogEnabled() {
  return typeof Sync !== "undefined" && Sync.enabled();
}

// Mencatat satu aktivitas. `menu` = nama menu/aksi yang dibuka (mis. "Baca:
// Kejadian 1", "Rencana Baca", "Pencarian"). `searchQuery` opsional, diisi
// khusus saat aktivitasnya adalah pencarian. Selalu "fire-and-forget" —
// tidak pernah menunggu/menghalangi tampilan aplikasi.
async function logActivity(menu, searchQuery) {
  if (!activityLogEnabled() || !currentUser) return;
  try {
    const now = new Date();
    const ip = await getClientIp();
    Sync.pushLog({
      username: currentUser,
      date: now.toLocaleDateString("id-ID"),
      time: now.toLocaleTimeString("id-ID"),
      os: detectOS(),
      ip,
      menu: menu || "",
      search: searchQuery || "",
      userAgent: navigator.userAgent || "",
      updatedAt: now.toISOString(),
    });
  } catch (e) {
    /* log tidak boleh sampai mengganggu pemakaian aplikasi */
  }
}
