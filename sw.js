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

// DINAIKKAN LAGI (10 Sep 2026, sesi ke-16 -- perbaikan bug efek suara
// baru "hanya bunyi cling" di komputer [present.html sekarang pakai
// ?v= juga], + dukungan efek dari link luar/Google Drive, + panel
// mandiri "🔊 Efek Suara Offline" di menu ⋮).
// DINAIKKAN LAGI (10 Sep 2026, sesi ke-15 -- opsi centang "🔊 Sertakan
// juga efek suara" di dialog Unduh Data Alkitab, js/app.js/js/soundfx.js).
// DINAIKKAN LAGI (10 Sep 2026, sesi ke-14 -- 14 efek suara MP3 rekaman
// baru ditambahkan ke js/soundfx.js + folder assets/sounds/ baru).
// DINAIKKAN LAGI (10 Sep 2026, dropdown pilihan peta online "Peta polos"
// vs "Peta + nama pulau" di tab 🗺️ Peta Interaktif -- index.html/
// css/style.css/js/presentation-studio.js). Wajib dinaikkan tiap ada
// perubahan css/js supaya perangkat yang sudah pernah buka versi LAMA
// offline-first (css/js dicache dengan strategi "cache dulu, perbarui
// diam-diam di latar belakang" -- lihat fetch handler di bawah) tidak
// "nyangkut" 1 kali muat lagi menampilkan berkas lama -- menaikkan angka
// ini membuat SEMUA cache versi lama otomatis dihapus (lihat blok
// "activate" di bawah) sehingga versi baru wajib diambil dari server
// begitu online, bukan menunggu revalidasi latar belakang. CATATAN buat
// operator: ini JUGA jalan keluar kalau ada laporan "fitur X sudah
// diperbaiki di kode tapi masih belum kelihatan di HP" -- itu 9 dari 10
// kali karena Service Worker/cache lama, BUKAN kodenya salah; menaikkan
// angka ini tiap deploy baru adalah cara memaksa HP ambil versi terbaru.
// DINAIKKAN LAGI (tambahan -- tombol "💾 Unduh Efek Suara ke HP Ini" baru
// di bagian bawah panel admin "🔊 Coba Efek Suara & Visual", index.html/
// js/effectpreview.js).
// DINAIKKAN LAGI (tambahan -- unduh efek suara satu-satu di
// js/soundfx.js downloadOne()/renderDownloadList(), dipakai dari
// index.html/js/effectpreview.js).
// DINAIKKAN LAGI (17 Sep 2026 -- game "🌱 Penciptaan" + latar animasi
// Layar Masuk: file BARU js/book-scene.js, css/book-scene.css,
// js/games/penciptaan.js, plus perubahan index.html/present.html/
// js/presentation-studio.js).
// DINAIKKAN LAGI (19 Sep 2026 -- perbaikan Slogan Karakter & Penciptaan tidak
// tampil di Layar 2 [present.html kurang memuat slogankarakter-data.js + kotak
// Slogan Karakter tidak pernah bisa disembunyikan], + tombol "Tampilan Awal"
// di kedua game: present.html, index.html, js/presentation-studio.js,
// js/games/penciptaan.js, js/games/slogankarakter.js).
// DINAIKKAN LAGI (19 Sep 2026 -- Audio Latar SoundCloud: present.html, index.html,
// js/presentation-studio.js, js/presentation.js, js/collections.js, js/app.js).
// DINAIKKAN LAGI (19 Sep 2026 -- Audio Latar dipindah ke js/bg-audio.js BARU, dimuat sebelum
// js/presentation-studio.js di index.html).
const CACHE_NAME = "book-vp-shell-v33"; // v33 (26 Sep 2026, lanjutan: (a) Pen Studio index.html/presentation-studio.js -- disamakan dgn Layar 2: tombol ujung Bulat/Kuas, swatch warna kustom 24-bit; (b) Layar 2 present.html -- Latar Belakang (Gelap/Putih/kustom 24-bit/Asli) di belakang coretan + tombol 💾 Simpan Gambar (PNG, nama file otomatis dari Kumpulan Ayat yang sedang tayang atau book-vp-tanggal-jam kalau tidak ada) -- js/ink-engine.js, present.html, js/presentation-studio.js, index.html, css/style.css). Sebelumnya v32 (24 Sep 2026: perbaikan CSS present.html -- posisi kamera mode Kiri/Kanan & Atas/Bawah tidak lagi ditimpa bubble-pos-*). Sebelumnya v29 (23 Sep 2026: 🌄 Latar Master -- js/bg-master.js + assets/backgrounds/, hook kecil di present.html & index.html). Sebelumnya v28: v28 (21 Sep 2026: Cache offline (IndexedDB) untuk Kidung Anak + tombol "Sinkronkan ulang Kidung Anak" di menu ⋮ -- js/db.js store baru "kidungAnak", DB_VERSION 8->9). Sebelumnya v27 (21 Sep 2026: Pen Studio -- Penghapus, preset ketebalan Tipis/Tebal/Super Tebal, Undo/Redo; + Coret-coret LANGSUNG di present.html -- js/ink-engine.js baru, protokol pesan "pen" berubah). Sebelumnya v26 (21 Sep 2026: Penanda berkategori + Edit Ayat Administrator -- js/annotations.js, js/bible-edit.js, css/annotations.css baru; hook kecil di js/app.js). Sebelumnya v25 (21 Sep 2026: AI Chat Riset Tema & Mode Khotbah -- js/aichat-riset.js + css/aichat-riset.css baru, hook kecil di js/aichat.js). Sebelumnya v24 (20 Sep 2026: Rencana Baca Multi-Jalur -- js/plans-multi.js + css/plans-multi.css baru, hook kecil di js/app.js). Sebelumnya v23 (20 Sep 2026: perbaikan "Studio & notifikasi tidak bisa dibuka" -- Studio tahan berkas modul hilang, app.js init terpisah, semua ?v= dinaikkan). Sebelumnya v22 (tahap 3: pustaka upload audio, js/bg-audio-library.js + js/bg-audio-source-upload.js, present.html blob). Sebelumnya v21 (tahap 2: js/bg-audio-source-kidung.js + kolom link_soundcloud). Sebelumnya v20 (20 Sep 2026): js/bg-audio-dialog.js baru + tahap-tahap "Sumber audio"

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
