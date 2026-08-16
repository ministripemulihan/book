// ============================================================
//  LOG AKTIVITAS PENGGUNA
// ============================================================
//  Mencatat: username, tanggal, jam, sistem operasi (perkiraan dari
//  browser), alamat IP + kota + negara (perkiraan, lewat layanan publik
//  ipwho.is — lihat catatan di bawah), menu yang dibuka, dan kata yang
//  dicari. Dikirim ke Google Sheet (tab "ActivityLog") lewat Apps
//  Script, sama seperti catatan & progres rencana baca (lihat js/sync.js).
//
//  CATATAN JUJUR soal IP/kota/negara: Google Apps Script (backend gratis
//  yang dipakai aplikasi ini) TIDAK diberi tahu oleh Google alamat IP
//  asli pengunjung web app-nya (ini pembatasan dari Google sendiri,
//  bukan aplikasi ini). Sebagai gantinya, browser pengguna sendiri yang
//  bertanya ke layanan publik gratis (ipwho.is) "IP publik saya berapa,
//  dan kira-kira kota/negara mana", lalu hasilnya disertakan di log. Ini
//  akurat untuk kebanyakan kasus, TAPI: (1) beberapa jaringan kantor/
//  rumah memakai satu IP publik yang sama untuk banyak orang/perangkat
//  (NAT), (2) IP publik biasanya dipetakan ke lokasi ISP/menara seluler
//  terdekat, BUKAN alamat persis orangnya, (3) di HP yang berpindah dari
//  WiFi ke data seluler IP-nya (dan kota terdeteksi) bisa berubah, dan
//  (4) kalau permintaan ke ipwho.is gagal/lambat (offline dsb), aplikasi
//  jatuh ke cadangan api.ipify.org supaya IP-nya sendiri tetap tercatat
//  walau kota/negara jadi kosong — log tidak boleh sampai menghalangi
//  menu lain untuk dipakai.
// ============================================================
let _cachedClientGeo = null;
let _clientGeoPromise = null;

async function getClientGeo() {
  if (_cachedClientGeo) return _cachedClientGeo;
  if (!_clientGeoPromise) {
    _clientGeoPromise = fetch("https://ipwho.is/", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || d.success === false || !d.ip) throw new Error("ipwho.is gagal/kosong");
        _cachedClientGeo = {
          ip: d.ip || "",
          city: d.city || "",
          country: d.country || "",
        };
        return _cachedClientGeo;
      })
      .catch(async () => {
        // Cadangan: kalau ipwho.is gagal (offline, diblokir jaringan
        // tertentu, dsb.), setidaknya IP publiknya tetap dicoba lewat
        // ipify -- kota/negara dikosongkan saja daripada log gagal total.
        try {
          const r = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
          const d = r.ok ? await r.json() : null;
          _cachedClientGeo = { ip: (d && d.ip) || "", city: "", country: "" };
        } catch (e) {
          _cachedClientGeo = { ip: "", city: "", country: "" };
        }
        return _cachedClientGeo;
      });
  }
  return _clientGeoPromise;
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
// Format jam manual "HH:mm:ss" pakai TITIK DUA -- SENGAJA tidak pakai
// now.toLocaleTimeString("id-ID") lagi (yang menghasilkan "18.10.15" pakai
// TITIK). Akar masalah bug "Jam tampil 00.00.00": format id-ID kebetulan
// memakai titik untuk jam, PERSIS sama dengan pemisah yang dipakai gaya
// tanggal "dd.mm.yy" -- jadi kalau proteksi format kolom "Plain text" di
// Code.gs (fixActivityLogColumnFormat_) telat/gagal menempel sesaat SAAT
// baris baru ditambahkan (bisa terjadi kalau ada beberapa pengguna
// menyimpan log berbarengan), Google Sheets diam-diam MENGIRA teks jam itu
// tanggal "18 Okt 2015" & membuang info jamnya (jadi tengah malam).
// Titik dua ("18:10:15") TIDAK PERNAH ambigu dengan pola tanggal apa pun,
// jadi walau Sheets sempat salah mengenali sel ini sebagai tipe "Jam"
// (bukan "Tanggal") sekalipun, jam aslinya tetap tersimpan utuh -- bug ini
// jadi kebal terhadap race condition di atas, bukan cuma "dicegah kalau
// sempat").
function pad2(n) {
  return (n < 10 ? "0" : "") + n;
}
function localTimeStrColon(d) {
  return pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds());
}

async function logActivity(menu, searchQuery) {
  if (!activityLogEnabled() || !currentUser) return;
  try {
    const now = new Date();
    const geo = await getClientGeo();
    Sync.pushLog({
      username: currentUser,
      date: now.toLocaleDateString("id-ID"),
      time: localTimeStrColon(now),
      os: detectOS(),
      ip: geo.ip,
      city: geo.city,
      country: geo.country,
      menu: menu || "",
      search: searchQuery || "",
      userAgent: navigator.userAgent || "",
      updatedAt: now.toISOString(),
    });
  } catch (e) {
    /* log tidak boleh sampai mengganggu pemakaian aplikasi */
  }
}
