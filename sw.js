// ============================================================
//  SERVICE WORKER -- app shell offline (BARU 7 Sep 2026, permintaan
//  operator: "coba dibuat offline semua"). TIDAK menyimpan daftar file
//  tetap (supaya tidak perlu diperbarui manual tiap kali "?v=..." di
//  index.html/present.html berubah) -- sebagai gantinya, file APA SAJA
//  yang berhasil diambil dari server (index.html, present.html,
//  css/js, font Google, pdf.js/mammoth dari CDN) OTOMATIS disimpan ke
//  cache begitu pertama kali dipakai (lihat fetch handler di bawah) --
//  kunjungan BERIKUTNYA tanpa internet tinggal dibaca dari cache itu.
//
//  YANG SENGAJA TIDAK PERNAH DICACHE (harus tetap online, atau gagal
//  apa adanya kalau offline -- BUKAN bug, lihat NEVER_CACHE_HOSTS):
//    - script.google.com / macros (Apps Script backend -- data live:
//      login, sinkron, AI chat, curhat, dst. Datanya BASAH/berubah-ubah,
//      tidak boleh "basi" dari cache).
//    - biblereader.online -- sesuai permintaan operator, TETAP online.
//    - docs.google.com / drive.google.com (Sheet CSV publik dipakai
//      sinkron Kidung/Alkitab/dll) -- selalu coba online dulu supaya
//      data terbaru; TAPI kalau gagal (offline), app SUDAH otomatis
//      pakai salinan lokal IndexedDB yang lama (lihat js/kidung.js dst,
//      itu logika APLIKASI, bukan Service Worker ini) -- jadi baris ini
//      cuma memastikan SW tidak ikut campur/menahan permintaan itu.
//    - youtube.com/ytimg.com/googlevideo.com (video YouTube -- streaming,
//      tidak mungkin & tidak perlu di-cache).
//    - soundcloud.com (widget SoundCloud, sama alasannya dengan YouTube).
//
//  CATATAN PENTING: Service Worker ini HANYA mem-percepat/meng-offline-
//  kan APLIKASINYA SENDIRI (HTML/CSS/JS/font) supaya bisa DIBUKA tanpa
//  internet. Ia TIDAK membuat fitur yang memang butuh server (login,
//  sinkron Drive, AI Chat, sinkron Kidung/Alkitab TERBARU, video
//  YouTube) tiba-tiba bisa jalan tanpa internet -- itu di luar
//  kemampuan apa pun (data live tetap perlu server live).
// ============================================================

const CACHE_NAME = "book-vp-shell-v1";

const NEVER_CACHE_HOSTS = [
  "script.google.com",
  "script.googleusercontent.com",
  "biblereader.online",
  "www.youtube.com",
  "youtube.com",
  "youtube-nocookie.com",
  "ytimg.com",
  "i.ytimg.com",
  "googlevideo.com",
  "docs.google.com",
  "drive.google.com",
  "spreadsheets.google.com",
  "w.soundcloud.com",
  "api.soundcloud.com",
  "soundcloud.com",
  "api-v2.soundcloud.com",
];

function isNeverCacheUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    return NEVER_CACHE_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith("." + h));
  } catch (e) {
    return false;
  }
}

self.addEventListener("install", () => {
  // Aktif secepatnya begitu terpasang -- tidak perlu menunggu semua tab
  // lama ditutup dulu, supaya offline-shell langsung berlaku bagi
  // kunjungan berikutnya secepat mungkin.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Cuma GET yang aman/masuk akal untuk dicache -- POST/PUT dst (mis.
  // ke Apps Script) dibiarkan lewat apa adanya, tidak pernah disentuh.
  if (req.method !== "GET") return;
  if (isNeverCacheUrl(req.url)) return; // biarkan browser tangani langsung (selalu perlu online, lihat catatan panjang di atas)

  // Dokumen HTML utama (index.html/present.html, dibuka lewat navigasi
  // browser atau window.open) -- NETWORK DULU (supaya selalu dapat
  // versi terbaru saat online), baru jatuh ke salinan cache kalau
  // offline/gagal. Ini beda dari aset statis di bawah (cache dulu)
  // karena halaman utama paling penting untuk SELALU terbaru saat ada
  // internet, tapi tetap WAJIB bisa dibuka sama sekali saat tidak ada.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match(new URL("index.html", self.registration.scope).href))
        )
    );
    return;
  }

  // Aset statis (css/js/font Google/CDN pdf.js-mammoth, dst) -- CACHE
  // DULU (cepat + tetap kerja offline), lalu diam-diam diperbarui di
  // latar belakang kalau online (stale-while-revalidate) supaya tidak
  // "nyangkut" versi lama selamanya begitu operator online lagi --
  // URL yang mengandung "?v=..." (lihat index.html) otomatis jadi kunci
  // cache BARU tiap kali versinya dinaikkan, jadi pembaruan versi tetap
  // langsung kepakai begitu online, tanpa perlu menunggu apa pun di sini.
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => null);
      if (cached) return cached; // networkFetch tetap jalan di latar belakang untuk perbarui cache, hasilnya tidak ditunggu di sini
      return networkFetch.then((res) => res || new Response("", { status: 504, statusText: "Offline & belum pernah dimuat sebelumnya" }));
    })
  );
});
