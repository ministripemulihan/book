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
const CACHE_NAME = "book-vp-shell-v81"; // v81 (17 Okt 2026, book168: arah baru "Nempel" di Tampilan kolom -- tiap karakter Mandarin dengan pinyin-nya tepat di bawahnya -- js/pinyin-ruby.js BARU, js/app.js, css/style.css, index.html, sw.js). Sebelumnya v80 (16 Okt 2026, book167: MODE BACA PENUH di HP -- tombol ⛶ menyembunyikan header & toolbar, ketuk 3x/2x di pinggir untuk memunculkan; pemutar lagu mini bisa disembunyikan (🙈 / 🎵) tanpa menghentikan lagu -- js/app.js, js/media-library.js, css/style.css, index.html, sw.js). Sebelumnya v79 (16 Okt 2026, book166: pemutar MINI di bawah layar (syair kidung tetap terlihat saat lagu SoundCloud/MP3 main) + layar tetap menyala di HP -- js/media-library.js, css/style.css, index.html, sw.js). Sebelumnya v78 (16 Okt 2026, book165: daftar video Studio -- filter "Semua BibleRef" per kitab + label BibleRef, urutan bawaan ID Z-A (ID terbesar/terbaru dulu), baris SoundCloud dari Sheet ikut tampil -- js/presentation-studio.js, css/style.css, index.html, sw.js). Sebelumnya v77 (16 Okt 2026, book164: tulisan "Ayat 30, 31" di kotak Media terkait pasal ini bisa ditekan -> ayatnya tampil langsung di bawah video, Alkitab tetap tampil -- js/media-library.js, css/style.css, index.html, sw.js). Sebelumnya v76 (16 Okt 2026, book163: menu sidebar "🎬 Media" -- semua media ber-BibleRef per kitab, diputar di menu dengan ayat di bawah video -- js/media-library.js, js/app.js, css/style.css, index.html, sw.js). Sebelumnya v75 (16 Okt 2026, book162: ayat yang dirujuk video tampil di bawah video pada jendela pemutar -- js/media-library.js, css/style.css, index.html, sw.js). Sebelumnya v74 (16 Okt 2026: link MP3/MP4/YouTube bacaan Alkitab otomatis diambil ulang dari server kalau cache lebih tua 10 menit -- MP3 pertama & Link MP3 2 yang diedit di Sheet langsung tampil tanpa hapus cache -- js/media.js, index.html, sw.js). Sebelumnya v73 (16 Okt 2026: kolom BibleRef (teks "Kejadian 1:1-3; Yohanes 1:1") menggantikan AyatRef, media terkait pasal dicocokkan LOKAL dari daftar tersimpan (offline), grup "Tema pasal ini", cek link ganda, menu Cek BibleRef -- js/media-bibleref.js BARU, js/media-library.js, js/app.js, js/config.js, index.html, sw.js, apps-script/MediaLibraryCode.gs). Sebelumnya v72 (16 Okt 2026: "Media terkait pasal ini" di layar baca Alkitab jadi akordion per jenis/kategori -- js/media-library.js, css/style.css, index.html, sw.js). Sebelumnya v71 (16 Okt 2026: kolom Awal_Lagu di Daftar/Cari Kidung, daftar kidung & daftar YouTube Studio tampil 50 dulu lalu bertahap + info progres, "Referensi Media Lain" kosong diperkecil, MP3 ke-2 untuk bacaan Alkitab -- js/csv.js, js/kidung.js, js/kidung-ui.js, js/media.js, js/presentation-studio.js, css/style.css, index.html, sw.js, apps-script/Code.gs). Sebelumnya v70 (15 Okt 2026: warna kode kata kerja (H8802) beda dari nomor Strong (H430); pencarian per KELOMPOK kitab (Taurat, Injil, Nabi Kecil, Jantung Alkitab, dst) + Pilih kitab sendiri + satu kitab; versi cache CSS/JS dinaikkan supaya tampilan Strong baru terpakai -- js/footnotes.js, js/app.js, css/style.css, present.html, index.html, sw.js). Sebelumnya v69 (15 Okt 2026: nomor Strong KJV ({H3117}, {(H8802)}) tampil berwarna di layar baca, bisa dicari (ketik H3117), ikut tayang di Studio Presentasi & Layar 2 -- js/footnotes.js, js/csv.js, js/app.js, js/presentation.js, js/presentation-studio.js, js/bible-edit.js, present.html, css/style.css, index.html, sw.js). Sebelumnya v68 (15 Okt 2026: kolom Alkitab Bebas + Sync, 2 & 3 kolom -- tinggi ayat bernomor sama DIRATAKAN antar kolom sehingga SETIAP ayat sejajar (bukan cuma di tepi atas) -- js/app.js, index.html, sw.js). Sebelumnya v67 (15 Okt 2026: ☑️ Centang semua di dialog 🔄 Sinkronkan ulang const CACHE_NAME = "book-vp-shell-v66"; // v66 ( dialog unduhan pertama kali login -- js/sync-checklist.js, js/app.js, index.html, sw.js). Sebelumnya v66 (15 Okt 2026: pemilih bahasa (header const CACHE_NAME = "book-vp-shell-v65"; // v65 ( Kolom 1/2/3) menampilkan SEMUA bahasa terdaftar termasuk Pinyin yang belum diunduh + tawaran sinkron; kode bahasa Sheet dicocokkan longgar -- js/csv.js, js/app.js, index.html, sw.js). Sebelumnya v65 (15 Okt 2026: tombol "Centang semua" + petunjuk bahasa baru (Pinyin) di Bahasa yang Diunduh & Disimpan, peringatan versi belum terunduh di Studio -- js/app.js, js/presentation-studio.js, index.html, sw.js). Sebelumnya v64 (15 Okt 2026: nomor ayat Layar 2 diubah dari subscript ke SUPERSCRIPT (di atas baris) -- present.html, sw.js). Sebelumnya v63 (15 Okt 2026: nomor ayat di teks ayat gabungan Layar 2 jadi subscript berwarna (gelap=kuning, terang=biru kontras) -- present.html, sw.js). Sebelumnya v62 (15 Okt 2026: nama di atas blok ayat digabung per rentang, mis. Matius 28:19-20, bukan per ayat -- js/app.js, js/presentation-studio.js, index.html, sw.js). Sebelumnya v61 (15 Okt 2026: nama gabungan di paling atas Layar 2 disembunyikan kalau tiap ayat sudah punya nama sendiri -- present.html, js/presentation-studio.js, index.html, sw.js). Sebelumnya v60 (15 Okt 2026: 2 versi baru chs_pinyin & chssmp_pinyin di daftar bahasa Alkitab + Studio Presentasi, perkiraan ukuran data 55 -> 70 MB -- js/config.js, js/app.js, js/presentation-studio.js, js/collections.js, js/media.js, js/langcheck.js, index.html, sw.js). Sebelumnya v59 (15 Okt 2026: opsi "Notes saja" di Layar 2 -- js/presentation-studio.js, present.html, index.html, sw.js). Sebelumnya v58 (15 Okt 2026: pilihan Ayat/Notes per kolom di menu ⋮ > Tampilan kolom tidak lagi terpotong di sisi kanan panel -- css/style.css, index.html, sw.js). Sebelumnya v57 (15 Okt 2026: NOTES ayat tampil di Layar 2, bahasa notes Indonesia/Inggris dipilih di Studio > Alkitab -- js/presentation-studio.js, js/presentation.js, present.html, index.html, sw.js). Sebelumnya v56 (15 Okt 2026: tombol ➕ Daftar menyimpan item ayat MULTI-BAHASA (it.langs) + nama ayat di atas tiap ayat untuk item gabungan -- js/collections.js, js/app.js, js/presentation-studio.js, index.html, sw.js). Sebelumnya v55 (15 Okt 2026: kolom Alkitab bisa berisi AYAT atau NOTES per kolom, mis. ayat Indonesia | notes Inggris -- js/app.js, index.html, css/style.css, sw.js). Sebelumnya v54 (15 Okt 2026: kolom Alkitab Sync sejajar per NOMOR AYAT, multi-bahasa dalam 1 slide + nama ayat tiap ayat, nama kitab Layar 2 lebih besar + 24 warna -- js/app.js, js/presentation-studio.js, present.html, index.html, css/style.css, sw.js). Sebelumnya v53 (5 Okt 2026: tombol nomor ayat Alkitab selalu menuju ayat yang dipilih di semua mode 1/2/3 kolom & atas-bawah -- js/app.js, index.html, sw.js). Sebelumnya v52 (4 Okt 2026: chip ▶️ YouTube di Daftar Kidung ikut menghitung video Pustaka Media ber-KidungRef K51/S1/A1/T1/Y1 -- js/kidung-ui.js, index.html, sw.js). Sebelumnya v51 (4 Okt 2026: volume & kecepatan YouTube bisa diketik, thumbnail Kumpulan Ayat sampai 500px, video ber-KidungRef (K51/S1/T1/A1/KA1) tampil di layar baca kidung tanpa deploy ulang Apps Script -- index.html, css/style.css, js/presentation-studio.js, js/kidung-ui.js, js/kidung-ref.js, sw.js). Sebelumnya v50 (4 Okt 2026: teks/CC YouTube tidak muncul lagi saat video diulang + slider kecepatan 0,25x-2x di kontrol utama -- present.html, js/presentation-studio.js, js/presentation.js, index.html, css/style.css). Sebelumnya v49 (3 Okt 2026, tahap 3: thumbnail YouTube tersimpan otomatis untuk offline (komputer saja, maks 500, gambar pengganti kalau belum tersimpan) -- js/yt-thumb-cache.js BARU, js/media-library.js, index.html, sw.js; cache gambar \"book-vp-ytthumbs-v1\" TIDAK dihapus saat versi naik). Sebelumnya v48 (3 Okt 2026: panel Pustaka Media + efek suara Studio memakai daftar tersimpan saat offline (komputer saja) -- js/media-library.js, js/presentation-studio.js, css/style.css, index.html). Sebelumnya v47 (2 Okt 2026: Layar 2 (present.html) & Studio bisa dibuka OFFLINE -- semua berkas dicache sekaligus saat pemasangan (precache), tidak lagi menunggu dibuka online dulu; halaman tidak menggantung kalau jaringan lemot; daftar YouTube tersimpan offline -- sw.js, js/media-library.js, js/presentation-studio.js, index.html). Sebelumnya v46 (2 Okt 2026: pemutar YouTube Pustaka Media tampil lagi (z-index di belakang panel) + tombol Layar Penuh & Buka di YouTube -- css/style.css, js/media-library.js, index.html). Sebelumnya v45 (1 Okt 2026: tombol Play/Pause/Stop Audio Latar diseragamkan + badge "Tekan panah lagi" hilang saat Manual -- js/bg-audio.js, js/bg-audio-dialog.js, js/presentation-studio.js, index.html). Sebelumnya v44 v44 (1 Okt 2026: tampilan Kidung Layar 2 -- jarak seragam bait/koor, label KOOR lebih besar, nomor bait berwarna, slider di tab Tampilan -- present.html, index.html, js/presentation-studio.js). Sebelumnya v43 (30 Sep 2026 e: dialog (Audio Latar, Edit Syair, Sinkronkan ulang) z-index 1300 tidak lagi di belakang Studio + legenda warna tombol Audio Latar -- css/style.css, index.html). Sebelumnya v42 v42 (30 Sep 2026 d: progress bar + geser posisi lagu latar, tombol Audio Latar berwarna per status -- present.html, index.html, css/style.css, js/bg-audio.js, js/presentation-studio.js). Sebelumnya v41 v41 (30 Sep 2026 c: menu 🔄 Sinkronkan ulang jadi 1 checklist + cek pembaruan + mode di belakang layar -- js/sync-checklist.js baru, js/app.js, js/kidung-anak.js, index.html). Sebelumnya v40 v40 (30 Sep 2026 b: pilihan kecepatan lagu YouTube 0,25x-2x -- index.html, present.html, js/bg-audio.js, js/presentation-studio.js). Sebelumnya v39 (30 Sep 2026: Ubah Tanggal Mulai rencana baca menghitung ulang centang; 📺 Teks langsung memutar YouTube + teks tampil; notifikasi tombol audio -- js/app.js, js/bg-audio.js, js/presentation-studio.js, index.html). Sebelumnya v38 (28 Sep 2026: KidungRef + kode T/Y/A, tombol 📺 Teks di daftar YouTube Studio, pencarian ketik kode kidung, daftar bertahap -- js/kidung-ref.js, js/presentation-studio.js, css/style.css, index.html). Sebelumnya v37 (28 Sep 2026: Pustaka Media tab YouTube -- 5 filter (Sumber/Channel/Kategori/Keterangan/KidungRef) + total + tombol kidung di kartu (lihat isi / buka menu Kidung) -- js/media-library.js, css/style.css, index.html). Sebelumnya v36 (28 Sep 2026: kolom KidungRef di Video YouTube Studio -- K130/S130/KA13 jadi tombol yang membuka kidung -- js/kidung-ref.js baru, js/presentation-studio.js, css/style.css, index.html). Sebelumnya v35 (28 Sep 2026: animasi ikan/burung Layar 2 tetap bergerak walau sistem memakai "kurangi gerakan" + orang hari 7 di Layar Masuk dirapatkan -- css/book-scene.css, js/book-scene.js, present.html, index.html). Sebelumnya v34 (27 Sep 2026: tombol ▶ Play/⏸ Pause Audio Latar YouTube digabung jadi 1 toggle -- dulu tidak pernah berubah tampilan sendiri, lihat FILE-YANG-DIUBAH-TOGGLE-PLAY-LATAR-YOUTUBE.md -- index.html, js/presentation-studio.js). Sebelumnya v33 (26 Sep 2026, lanjutan: (a) Pen Studio index.html/presentation-studio.js -- disamakan dgn Layar 2: tombol ujung Bulat/Kuas, swatch warna kustom 24-bit; (b) Layar 2 present.html -- Latar Belakang (Gelap/Putih/kustom 24-bit/Asli) di belakang coretan + tombol 💾 Simpan Gambar (PNG, nama file otomatis dari Kumpulan Ayat yang sedang tayang atau book-vp-tanggal-jam kalau tidak ada) -- js/ink-engine.js, present.html, js/presentation-studio.js, index.html, css/style.css). Sebelumnya v32 (24 Sep 2026: perbaikan CSS present.html -- posisi kamera mode Kiri/Kanan & Atas/Bawah tidak lagi ditimpa bubble-pos-*). Sebelumnya v29 (23 Sep 2026: 🌄 Latar Master -- js/bg-master.js + assets/backgrounds/, hook kecil di present.html & index.html). Sebelumnya v28: v28 (21 Sep 2026: Cache offline (IndexedDB) untuk Kidung Anak + tombol "Sinkronkan ulang Kidung Anak" di menu ⋮ -- js/db.js store baru "kidungAnak", DB_VERSION 8->9). Sebelumnya v27 (21 Sep 2026: Pen Studio -- Penghapus, preset ketebalan Tipis/Tebal/Super Tebal, Undo/Redo; + Coret-coret LANGSUNG di present.html -- js/ink-engine.js baru, protokol pesan "pen" berubah). Sebelumnya v26 (21 Sep 2026: Penanda berkategori + Edit Ayat Administrator -- js/annotations.js, js/bible-edit.js, css/annotations.css baru; hook kecil di js/app.js). Sebelumnya v25 (21 Sep 2026: AI Chat Riset Tema & Mode Khotbah -- js/aichat-riset.js + css/aichat-riset.css baru, hook kecil di js/aichat.js). Sebelumnya v24 (20 Sep 2026: Rencana Baca Multi-Jalur -- js/plans-multi.js + css/plans-multi.css baru, hook kecil di js/app.js). Sebelumnya v23 (20 Sep 2026: perbaikan "Studio & notifikasi tidak bisa dibuka" -- Studio tahan berkas modul hilang, app.js init terpisah, semua ?v= dinaikkan). Sebelumnya v22 (tahap 3: pustaka upload audio, js/bg-audio-library.js + js/bg-audio-source-upload.js, present.html blob). Sebelumnya v21 (tahap 2: js/bg-audio-source-kidung.js + kolom link_soundcloud). Sebelumnya v20 (20 Sep 2026): js/bg-audio-dialog.js baru + tahap-tahap "Sumber audio"

// Cache thumbnail YouTube (dikelola js/yt-thumb-cache.js) -- harus lolos dari penghapusan cache versi lama.
const KEEP_CACHE_THUMBS = "book-vp-ytthumbs-v1";

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

// ------------------------------------------------------------
// BARU (2 Okt 2026) -- PRECACHE: begitu versi baru terpasang (online),
// index.html + present.html + SEMUA css/js/gambar yang mereka muat
// langsung disimpan. Daftar berkasnya DIBACA OTOMATIS dari kedua HTML itu
// (termasuk "?v=" terbarunya), jadi tidak perlu daftar manual yang bisa
// ketinggalan tiap kali versi dinaikkan.
// PENYEBAB LAMA "Layar 2 tidak bisa dibuka offline": cache lama baru terisi
// kalau halaman itu SUDAH PERNAH dibuka online setelah versi terbaru; padahal
// tiap deploy (CACHE_NAME naik) cache lama dihapus -> kosong lagi, dan
// present.html + js-nya sendiri (ink-engine, soundfx, book-scene, dst) belum
// sempat tersimpan.
// ------------------------------------------------------------
const PRECACHE_PAGES = ["index.html", "present.html"];
const PRECACHE_EXTRA = [
  "assets/logo-inchrist.png",
  "assets/backgrounds/alam_1-thumb.jpg",
  "assets/backgrounds/alam_3-thumb.jpg",
];
const NAV_TIMEOUT_MS = 4000; // jaringan "ada tapi macet" -> pakai salinan tersimpan setelah ini
const PRECACHE_TIMEOUT_MS = 20000; // 1 berkas precache yang menggantung tidak boleh menahan pemasangan SW selamanya

function withTimeout_(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

function scopeUrl_(rel) {
  return new URL(rel, self.registration.scope).href;
}
// Kunci cache halaman = alamat TANPA "?query" supaya present.html?x=1 tetap ketemu.
function pageKey_(urlStr) {
  const u = new URL(urlStr);
  u.search = "";
  u.hash = "";
  return u.href;
}
function localAssetsFromHtml_(html, baseUrl) {
  const out = new Set();
  const re = /<(?:script|link|img)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const u = new URL(m[1], baseUrl);
      if (u.origin !== self.location.origin) continue;
      if (!/\.(js|css|png|jpe?g|webp|svg|ico|json|webmanifest|woff2?)$/i.test(u.pathname)) continue;
      u.hash = "";
      out.add(u.href);
    } catch (e) { /* abaikan */ }
  }
  return Array.from(out);
}
async function precacheShell_() {
  const cache = await caches.open(CACHE_NAME);
  const assets = new Set(PRECACHE_EXTRA.map(scopeUrl_));
  for (const page of PRECACHE_PAGES) {
    try {
      const url = scopeUrl_(page);
      const res = await withTimeout_(fetch(new Request(url, { cache: "reload" })), PRECACHE_TIMEOUT_MS);
      if (!res || !res.ok) continue;
      const html = await res.clone().text();
      await cache.put(pageKey_(url), res.clone());
      if (page === "index.html") await cache.put(pageKey_(self.registration.scope), res.clone()); // alamat akar "/"
      localAssetsFromHtml_(html, url).forEach((a) => assets.add(a));
    } catch (e) { /* offline saat memasang -- lewati */ }
  }
  await Promise.allSettled(Array.from(assets).map(async (a) => {
    const res = await withTimeout_(fetch(a), PRECACHE_TIMEOUT_MS);
    if (res && res.ok) await cache.put(a, res);
  }));
}

self.addEventListener("install", (event) => {
  // Aktif secepatnya begitu terpasang -- tidak perlu menunggu semua tab
  // lama ditutup dulu. Precache gagal TIDAK boleh menggagalkan pemasangan.
  event.waitUntil(precacheShell_().catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== KEEP_CACHE_THUMBS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// BARU (2 Okt 2026) -- jawaban untuk membuka halaman: NETWORK DULU (selalu
// terbaru saat online), tapi kalau jaringan gagal ATAU tidak menjawab dalam
// NAV_TIMEOUT_MS dan salinan tersimpan ada -> pakai salinan itu (dulu
// menunggu tanpa batas kalau WiFi tersambung tapi tanpa internet).
// Kalau halaman yang diminta present.html tapi belum tersimpan, JANGAN
// diganti index.html (dulu jendela Layar 2 malah menampilkan aplikasi
// utama) -- tampilkan petunjuk singkat.
const OFFLINE_PAGE_HTML_ = '<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Belum tersimpan offline</title></head><body style="font-family:sans-serif;background:#05070c;color:#f5f2e8;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center"><div><h2>Halaman ini belum tersimpan untuk offline</h2><p>Sambungkan internet sekali, buka aplikasi sampai terbuka penuh, tutup semua tab, lalu buka lagi. Setelah itu halaman ini bisa dibuka tanpa internet.</p></div></body></html>';

async function navigateResponse_(event, req) {
  const key = pageKey_(req.url);
  const lookup = () => caches.match(key);
  const net = fetch(req).then((res) => {
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((c) => c.put(key, copy));
    }
    return res;
  });
  event.waitUntil(net.catch(() => {})); // biarkan pembaruan cache selesai walau jawaban sudah dikirim dari salinan
  const slow = new Promise((resolve) => {
    setTimeout(() => { lookup().then((c) => { if (c) resolve(c); }); }, NAV_TIMEOUT_MS);
  });
  try {
    return await Promise.race([net, slow]);
  } catch (e) {
    const cached = await lookup();
    if (cached) return cached;
    if (/present\.html$/i.test(new URL(req.url).pathname)) {
      return new Response(OFFLINE_PAGE_HTML_, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
    const home = await caches.match(pageKey_(scopeUrl_("index.html")));
    return home || new Response(OFFLINE_PAGE_HTML_, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

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
    event.respondWith(navigateResponse_(event, req));
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
          // BARU (2 Okt 2026): respons "opaque" (CSS Google Fonts lewat <link>) ikut
          // disimpan supaya huruf Literata/Inter tidak hilang saat offline.
          if (res && (res.ok || res.type === "opaque")) {
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
