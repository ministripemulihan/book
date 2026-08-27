// ============================================================
//  KONFIGURASI  —  ubah bagian ini sesuai kebutuhan Anda
// ============================================================
const CONFIG = {
  // Judul yang muncul di header aplikasi
  APP_TITLE: "Alkitab",

  // ----------------------------------------------------------
  // 1) SUMBER DATA ALKITAB — Google Sheet #1
  // ----------------------------------------------------------
  // URL CSV publik dari Google Sheet berisi TEKS ALKITAB.
  // Cara mendapatkan:
  //  1. Buka Google Sheet Alkitab Anda
  //  2. File > Bagikan > Publikasikan ke web (Publish to web)
  //  3. Pilih sheet "Alkitab" (atau nama sheet Anda), format "Comma-separated values (.csv)"
  //  4. Klik "Publikasikan", salin URL yang muncul, tempel di bawah ini
  BIBLE_SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQokT8ny0sgFBuYfzBAMBBNJDhcH6Mif31q3oBRM_pFPBQq-qXg3xiiy1A_5nApeSow_1bn1WExHOrk/pub?output=csv",

  // Perkiraan ukuran file data Alkitab (semua bahasa), dalam MB -- dipakai
  // untuk teks info di layar unduhan pertama kali ("Data ini sekitar ...
  // MB") DAN sebagai perkiraan pembagi progres unduhan real-time ("X MB
  // dari ~Y MB", lihat syncFromServer() & fetchTextWithProgress() di
  // js/app.js), untuk kasus server tidak mengirim Content-Length.
  // Mencakup teks Alkitab utama + 3 sheet Pokok Kitab/Garis Besar/Peta&
  // Gambar yang ikut disinkronkan bersamaan (lihat resyncAllOutlineSheets()
  // di js/outlines.js).
  //
  // PENTING (BARU): angka di bawah ini HANYA "tebakan awal" sebelum ADA
  // SATU PUN perangkat yang pernah menyelesaikan unduhan penuh -- setelah
  // itu, angka ini TIDAK PERNAH dipakai lagi. Sumber yang sesungguhnya
  // dipakai aplikasi SEKARANG DIHITUNG OTOMATIS OLEH PROGRAM dari byte
  // ASLI yang baru saja diunduh (Alkitab + Pokok Kitab/Garis Besar/Peta),
  // lalu disimpan sendiri ke tab "Setup" Google Sheet (key
  // `bible_data_approx_size_mb`) DAN ke perangkat itu -- TIDAK ADA lagi
  // yang perlu diketik manual oleh administrator. Lihat
  // saveMeasuredBibleSizeMb_() & getEffectiveBibleSizeMb() di js/app.js,
  // dan updateMeasuredBibleSizeMb_() di apps-script/Code.gs.
  BIBLE_DATA_APPROX_SIZE_MB: 57,

  // ----------------------------------------------------------
  // 2) SUMBER DATA PENGGUNA — Google Sheet #2 (BERBEDA dari sheet Alkitab)
  // ----------------------------------------------------------
  // Buat Google Sheet terpisah khusus daftar akun, dengan kolom:
  //   Username | Password | Nama
  // ("Nama" opsional — nama tampilan pengguna; kalau kosong, Username yang dipakai)
  // Publikasikan dengan cara yang sama seperti di atas (Publish to web > CSV),
  // lalu tempel URL CSV-nya di sini.
  //
  // PENTING: ini BUKAN keamanan tingkat server. Username & password disimpan
  // apa adanya (teks biasa) di Google Sheet dan di penyimpanan lokal browser.
  // Cocok untuk keperluan pribadi/keluarga/jemaat, JANGAN dipakai untuk data rahasia,
  // dan jangan pakai password yang juga dipakai di akun penting lain.
  USERS_SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQZjIx2UlpNYullJPAjYBD-32FAX0FZyARGCE-PfEwTArW4GESHyyXqXqutkhL4GqSsTfUD2AyhqH_i/pub?output=csv",
                        
  // ----------------------------------------------------------
  // 3) SINKRONISASI CATATAN & PROGRES RENCANA BACA — Google Apps Script
  // ----------------------------------------------------------
  // URL Web App dari Google Apps Script (lihat folder "apps-script/Code.gs"
  // di paket ini untuk kode & cara deploy-nya). Setelah diisi, catatan
  // pribadi per ayat dan progres rencana baca akan otomatis tersimpan ke
  // Google Sheet dan bisa dibuka sama persis dari HP maupun komputer lain.
  // Kosongkan / biarkan seperti ini kalau tidak ingin memakai fitur ini
  // (aplikasi tetap jalan normal, hanya tersimpan lokal di perangkat saja).
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbztneFm1ReefFFlO6KUC_vprmBNA6hm1rNCNOOj91qTp9TooegPXUwiuop5UY6Vxz0XnQ/exec",

  // ----------------------------------------------------------
  // 3b) CURHAT DOMBA & GEMBALA — Google Apps Script BARU & TERPISAH
  // ----------------------------------------------------------
  // URL Web App dari "apps-script/CurhatCode.gs" (BUKAN file Code.gs yang
  // lama -- ini Sheet & deployment baru sendiri, lihat catatan cara pasang
  // di dalam file itu). Kosongkan untuk mematikan menu "💬 Curhat".
  CURHAT_APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwaWd_bSNY4zgRAK3N9KOrMBsG10t43OfEN80kb_jzn6xzNaWvtDcJAqcQmCm4pVobKWw/exec",

  // Jenis topik pilihan (domba boleh juga mengetik jenis sendiri kalau
  // memilih "Lainnya…"). Silakan tambah/ubah sesuai kebutuhan jemaat.
  CURHAT_TOPIC_TYPES: [
    "Pacar", "Galau", "Ekonomi", "Pendidikan", "Harta", "Keluarga",
    "Orang Tua", "Ayah", "Ibu", "Anak", "Cucu", "Pekerjaan",
    "Kerohanian", "Alkitab", "Kebenaran Firman Tuhan",
    "Kesehatan", "Pernikahan", "Persahabatan", "Pelayanan", "Lainnya",
  ],
  CURHAT_STATUSES: [
    { key: "tertunda", label: "⏳ Tertunda" },
    { key: "selesai", label: "✅ Selesai" },
    { key: "lewat", label: "➡️ Lewat" },
  ],
  // level (key dari LEVEL_DEFINITIONS di bawah) yang dianggap "gembala" --
  // hanya level inilah yang boleh melihat & membalas curhat + tahu umur.
  CURHAT_GEMBALA_LEVELS: ["administrator", "penatua", "gembala distrik", "gembala"],

  // ----------------------------------------------------------
  // 3c) AI CHAT GEMBALA — Google Apps Script BARU & TERPISAH lagi
  // ----------------------------------------------------------
  // URL Web App dari "apps-script/AiChatCode.gs" (lihat cara pasang di
  // dalam file itu, termasuk cara mengisi API key Gemini dengan aman).
  // Kosongkan untuk mematikan menu "🤖 AI Chat Gembala".
  AI_CHAT_APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwrCuSNhnz_zrAW8MGGyYHLYcdkkXW-wglW6jaeKOk08074vSspt7L9bOdt0SOofEPH/exec",
  // Level yang boleh membuka menu AI Chat -- default sama dengan
  // CURHAT_GEMBALA_LEVELS, boleh dipersempit/diperluas sendiri di sini.
  AI_CHAT_LEVELS: ["administrator", "penatua", "gembala distrik", "gembala"],

  // ----------------------------------------------------------
  // 3d) VERIFIKASI BAHASA AYAT — alat bantu ADMIN (lihat js/langcheck.js)
  // ----------------------------------------------------------
  // Memindai SEMUA ayat yang tersimpan lokal untuk mendeteksi baris yang
  // kode bahasanya (kolom "Bahasa" di Sheet) tidak cocok dengan teks yang
  // sesungguhnya (mis. kolom "ind" tapi isinya Inggris). Berjalan 100% di
  // perangkat (tidak perlu internet). "administrator" SELALU boleh (lihat
  // isLangCheckAllowed()); level lain di sini boleh ditambah/dikurangi.
  LANG_CHECK_LEVELS: ["administrator", "penatua", "gembala distrik", "gembala"],

  // Sub-menu "🎵 Cek Referensi Ayat Kidung" DI DALAM panel Verifikasi
  // Bahasa Ayat (lihat js/kidungversecheck.js) -- mencocokkan syair
  // kidung ke ayat Alkitab yang paling mendekati lewat AI. SENGAJA
  // khusus "administrator" saja (tidak ikut LANG_CHECK_LEVELS di atas)
  // karena ini memakai kuota AI per baris/bait & hasilnya baru berupa
  // PERKIRAAN yang harus diverifikasi manual sebelum dipakai resmi.
  KIDUNG_VERSE_REF_LEVELS: ["administrator"],

  // Batas MAKS berapa kidung boleh dicek sekaligus dalam 1 rentang
  // ("dari No. ... sampai No. ...") -- tiap kidung bisa berisi banyak
  // bait, dan tiap bait = 1 panggilan AI, jadi rentang terlalu lebar
  // bisa sangat lambat/boros kuota Gemini. Naikkan angka ini sendiri
  // kalau kuota Anda longgar; admin akan diberi tahu di layar kalau
  // rentang yang diketik melebihi batas ini.
  KIDUNG_VERSE_REF_MAX_RANGE: 10,

  // Daftar bahasa yang ada di kolom "Bahasa" pada sheet Alkitab, dengan label yang
  // tampil di tombol pemilih bahasa. Sesuaikan "label" jika kurang tepat — kode
  // ("code") HARUS SAMA PERSIS dengan nilai di kolom Bahasa pada Google Sheet Anda.
  LANGUAGES: [
    { code: "ind", label: "Indonesia (TB)" },
    { code: "rvind", label: "Indonesia (Recovery)" },
    { code: "kjv", label: "Inggris (King James)" },
    { code: "eng", label: "Inggris (English)" },
    { code: "rveng", label: "Inggris (Recovery)" },
    { code: "chs", label: "Mandarin (中文)" },
    { code: "chssmp", label: "Mandarin Sederhana (简体中文)" },
    { code: "jawa", label: "Jawa (Perjanjian Baru)" },
  ],
  DEFAULT_LANGUAGE: "ind",

  // ----------------------------------------------------------
  // 6) JENJANG LEVEL PENGGUNA (opsional, kolom "Level" di Sheet Pengguna)
  // ----------------------------------------------------------
  // Tambahkan kolom "Level" di Sheet Pengguna (Sheet #2). Satu akun boleh
  // punya LEBIH DARI SATU level, dipisah koma/titik koma, mis isi kolom:
  //   "administrator, gembala distrik"
  // Kalau kolom kosong / tidak ada levelnya sama sekali -> dianggap
  // "Kaum Saleh" (level paling dasar, tanpa hak akses menu tingkat gembala).
  //
  // Urutan array di bawah = URUTAN JENJANG (dari paling tinggi wewenangnya
  // ke paling bawah). "rank" dipakai untuk aturan bertingkat: seseorang
  // hanya bisa melihat/memantau orang dengan rank SAMA atau LEBIH RENDAH
  // (angka rank lebih besar) dari rank tertinggi yang ia punya sendiri.
  // administrator (rank 0) selalu bisa melihat semua level.
  LEVEL_DEFINITIONS: [
    { key: "administrator", label: "Administrator", rank: 0 },
    { key: "penatua", label: "Penatua", rank: 1 },
    { key: "gembala distrik", label: "Gembala Distrik", rank: 2 },
    { key: "gembala", label: "Gembala", rank: 3 },
    { key: "pra gembala", label: "Pra Gembala", rank: 4 },
    { key: "inti", label: "Inti", rank: 5 },
  ],
  // Label untuk akun tanpa level sama sekali (kolom Level kosong)
  NO_LEVEL_LABEL: "Kaum Saleh",

  // localStorage key tempat menyimpan username yang sedang login, supaya
  // besok-besoknya langsung masuk tanpa mengetik ulang, sampai tekan Keluar.
  AUTH_STORAGE_KEY: "bible_app_auth_user_v1",
  AUTH_DISPLAY_KEY: "bible_app_auth_display_v1",
  // BARU -- sebutan "Saudara"/"Saudari" dari kolom "Saudara/i" di Sheet
  // Pengguna (lihat js/csv.js normalizeUserRecord() -> field `saudara`),
  // disimpan lokal SAMA POLA seperti AUTH_DISPLAY_KEY, supaya AI Chat
  // Gembala bisa menyapa pengguna dengan namanya sendiri (BUKAN "Gembala")
  // begitu login, tanpa perlu tanya ulang tiap sesi. Lihat js/aichat.js.
  AUTH_SAUDARA_KEY: "bible_app_auth_saudara_v1",

  // Nama database IndexedDB & object store tempat menyimpan data secara lokal.
  // DB_VERSION dinaikkan (dari versi sebelumnya) supaya store "users" baru
  // otomatis ditambahkan tanpa menghapus data Alkitab yang sudah tersimpan.
  DB_NAME: "bible_local_db",
  // v3 (20 Agu 2026): menambah store "studioMedia" -- pindahan "Media
  // Tersimpan" (gambar/PDF-jadi-gambar/daftar YouTube) dari localStorage
  // ke IndexedDB. Sebabnya: localStorage total per origin biasanya cuma
  // ~5-10MB (SEMUA key digabung), sedangkan 1 file PDF hasil render jadi
  // gambar (skala 2x, base64) gampang > 10MB walau file aslinya cuma
  // beberapa MB -- itu kenapa muncul "penyimpanan perangkat penuh" padahal
  // batas upload di UI ditulis 25MB (itu cuma batas ukuran file ASLI yang
  // diunggah, bukan batas hasil render/penyimpanannya). IndexedDB tidak
  // punya batas sekecil itu (umumnya ratusan MB - beberapa GB tergantung
  // browser/disk kosong), jadi masalah ini hilang dengan pindah ke sini.
  // v6 (20 Agu 2026): menaikkan versi supaya migrasi index "byBukuNo" pada
  // store kidung (lihat js/db.js) BENAR-BENAR jalan di perangkat yang sudah
  // pernah sinkron sebelum index ini ditambahkan ke kode. onupgradeneeded
  // cuma terpicu kalau DB_VERSION naik -- tanpa ini, perangkat lama tetap
  // memakai skema versi 5 selamanya (index byBukuNo tidak pernah terbentuk),
  // sehingga getKidungRowsByBukuNo() gagal untuk SEMUA nomor kidung (bukan
  // cuma satu nomor tertentu) -- persis gejala "judul kidung muncul di
  // daftar, tapi isi bait selalu 'tidak ditemukan' saat dibuka).
  // v7 (21 Agu 2026): v6 di atas TERNYATA belum benar-benar menutup
  // celahnya -- js/db.js masih hanya membuat index "byBukuNo" di cabang
  // UPGRADE (store "kidung" sudah ada dari versi lama), bukan di cabang
  // CREATE (store baru dibuat langsung di versi terbaru, mis. di HP yang
  // baru pertama kali buka app SETELAH v6 dirilis, atau yang cache/data
  // situsnya pernah dibersihkan). HP seperti itu tetap kehilangan index
  // ini walau sudah di DB_VERSION 6, persis gejala yang dilaporkan (daftar
  // kidung muncul, tapi buka 1 kidung -> "tidak ditemukan" terus walau
  // sudah "sinkronkan ulang" berkali-kali, khusus di sebagian HP, TIDAK di
  // komputer). js/db.js sekarang membuat index ini (dicek dulu belum ada)
  // di KEDUA cabang, dan versi dinaikkan lagi ke 7 di sini supaya
  // onupgradeneeded benar-benar terpicu ulang & menambal HP yang sudah
  // kadung rusak skemanya di versi 6.
  DB_VERSION: 7,
  STORE_NAME: "verses",
  USERS_STORE_NAME: "users",
  MEDIA_STORE_NAME: "studioMedia",
  // v4 (20 Agu 2026): menambah store "kidung" -- teks Kidung/Hymn (lihat
  // js/kidung.js). Dipilih IndexedDB juga (bukan localStorage seperti
  // js/outlines.js) supaya bisa diindeks per no_kidung untuk pencarian
  // cepat & konsisten dengan pola store lain di sini.
  KIDUNG_STORE_NAME: "kidung",

  // ----------------------------------------------------------
  // 4) UKURAN HURUF AYAT (tombol A- / A+ di header)
  // ----------------------------------------------------------
  FONT_SIZE_STORAGE_KEY: "bible_app_font_size_v1",
  FONT_SIZE_MIN: 5,
  FONT_SIZE_MAX: 500,
  FONT_SIZE_STEP: 2,
  FONT_SIZE_DEFAULT: 19,

  // Kode bahasa suara untuk pembacaan otomatis (Web Speech API — memakai
  // suara Google bawaan browser/Android bila tersedia). Aplikasi akan
  // otomatis mencoba mencari suara dengan kode ini dulu.
  TTS_LANG: "id-ID",

  // ----------------------------------------------------------
  // 5) BACAAN BERSUARA HARIAN (MP3 / MP4 / YouTube per rentang ayat)
  // ----------------------------------------------------------
  // Sheet TERPISAH dari sheet Alkitab utama — isinya bukan teks ayat,
  // tapi daftar rentang bacaan + link (kolom: No/Nomor | Pembacaan |
  // Link MP3 | Link MP4 | Youtube). Publikasikan tiap TAB sheet ke web
  // sebagai CSV (sama caranya seperti sheet Alkitab di atas — tiap tab
  // menghasilkan URL berbeda), lalu tempel URL-nya di bawah ini.
  // Kosongkan csvUrl ("") kalau salah satu belum ada / belum ingin dipakai
  // — sheet itu otomatis disembunyikan dari menu, aplikasi tidak error.
  READING_MEDIA_SHEETS: [
    {
      key: "pl_ind",
      label: "Perjanjian Lama 2 Tahun (Indonesia)",
      csvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQGlRBfxjNK7R_kRLUo9pnf4OnGQQJHlUn-MuJWBCX5V2ekrT4MqHAvVfmvNfgWfw/pub?gid=441167880&single=true&output=csv",
    },
    {
      key: "pb_ind",
      label: "Perjanjian Baru 1 Tahun (Indonesia)",
      csvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQGlRBfxjNK7R_kRLUo9pnf4OnGQQJHlUn-MuJWBCX5V2ekrT4MqHAvVfmvNfgWfw/pub?gid=1009569139&single=true&output=csv",
    },
    {
      key: "pb_mandarin",
      label: "Perjanjian Baru 1 Tahun (Mandarin)",
      csvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQGlRBfxjNK7R_kRLUo9pnf4OnGQQJHlUn-MuJWBCX5V2ekrT4MqHAvVfmvNfgWfw/pub?gid=346929572&single=true&output=csv",
    },
    {
      key: "pb_inggris",
      label: "Perjanjian Baru 1 Tahun (Inggris)",
      csvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQGlRBfxjNK7R_kRLUo9pnf4OnGQQJHlUn-MuJWBCX5V2ekrT4MqHAvVfmvNfgWfw/pub?gid=1522606854&single=true&output=csv",
    },
  ],

  // ----------------------------------------------------------
  // 7) POKOK KITAB / GARIS BESAR / PETA+GAMBAR (per kitab)
  // ----------------------------------------------------------
  // TIGA sheet TERPISAH (lagi) dari semua sheet di atas -- lihat
  // README.md bagian "Pokok Kitab / Garis Besar / Peta+Gambar" untuk
  // format kolom yang harus dipakai di tiap sheet. Publikasikan tiap
  // sheet ke web sebagai CSV (sama caranya seperti sheet lain), lalu
  // tempel URL-nya di sini. Kosongkan ("") kalau belum ada -- fitur
  // itu otomatis disembunyikan, aplikasi tidak error.
  OUTLINE_SHEETS: {
    // Sheet A -- "Pokok Kitab": 1 baris = 1 kitab + 1 bahasa.
    // Kolom: Book Number | Book Name | Bahasa | Pokok Kitab
    pokokKitabCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQV8rxG6tlAEuFC_OViDoKe6cQFW188PLwVUlxNfvOMu-1vTv0FeYxsRaGI_DBguBL1Q-aLBs6ei68s/pub?output=csv",

    // Sheet B -- "Garis Besar Ayat": 1 baris = 1 rentang ayat + 1
    // ringkasan (boleh bersarang/tumpang tindih rentang untuk level
    // besar vs kecil).
    // Kolom: Book Number | Bahasa | Chapter Start | Verse Start |
    //        Chapter End | Verse End | Level | Ringkasan
    garisBesarCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnTDjBiw0g0E2UCwtvJaUdb2Orj5Szwk09NCJKGfNqUvvlAu4VugLs4ATvnnLvtHETk7Ig0IQ-MFIJ/pub?output=csv",

    // Sheet C -- "Info Kitab (Peta & Gambar)": 1 kitab boleh punya
    // lebih dari 1 baris (lebih dari 1 peta/gambar).
    // Kolom: Book Number | Book Name | Link Peta/Gambar (Google Drive)
    petaGambarCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSl5CNXQb3q5wMaTF7egAzlAhYtyvX30x2NtlsWiT4mtOfvpKimM61RYWHK81jgwjJZ0oy-Mbrwbv8v/pub?output=csv",
  },

  // ----------------------------------------------------------
  // 7b) KIDUNG / HYMN — Google Sheet TERPISAH (bukan sheet Alkitab)
  // ----------------------------------------------------------
  // Sama pola-nya dengan BIBLE_SHEET_CSV_URL di atas -- Publish to web >
  // CSV, dibaca read-only oleh app (BUKAN Apps Script -- data ini
  // diisi/diedit admin langsung di Sheet-nya, app cuma baca & cache
  // lokal). Kalau nanti butuh fitur EDIT LANGSUNG dari dalam app (mis.
  // benerin typo tanpa buka Sheet), itu perlu endpoint Apps Script
  // terpisah (pola sama seperti apps-script/Code.gs) -- BELUM dibuat,
  // lihat catatan di js/kidung.js.
  //
  // Format kolom (1 baris = 1 bait ATAU 1 koor):
  //   no_kidung | judul | pengarang | kategori | urutan | jenis | no_bait | teks | koor_group
  // - no_kidung : nomor kidung, WAJIB diisi di SETIAP baris (bahkan yang
  //               judul/pengarang/kategori-nya dikosongkan karena sudah
  //               ditulis di baris pertama kidung itu).
  // - judul/pengarang/kategori : cukup diisi di baris PERTAMA tiap
  //               kidung; baris berikutnya boleh dikosongkan (otomatis
  //               "ikut" nilai terakhir yang terisi -- lihat
  //               forwardFillKidungRows() di js/kidung.js).
  // - urutan    : urutan baris DI DALAM kidung itu (1, 2, 3, ... apa
  //               adanya sesuai baris di Sheet -- termasuk baris koor).
  // - jenis     : "bait" atau "koor".
  // - no_bait   : nomor bait (1, 2, 3, ...) -- KOSONGKAN untuk baris
  //               jenis "koor".
  // - teks      : isi bait/koor.
  // - koor_group: penanda kelompok koor (mis. "K1", "K2") -- baris bait
  //               & baris koor yang SATU KELOMPOK dikasih kode yang
  //               SAMA, supaya kidung yang punya lebih dari 1 koor (mis.
  //               bait 1-4 pakai koor pertama, bait 5-7 pakai koor
  //               kedua) tetap bisa dipetakan dengan benar. Bait yang
  //               TIDAK pakai koor sama sekali -> kosongkan kolom ini.
  // - SPR	Pemuda	Remaja	Anak	Gugus	Injil	Sehari-hari	Link_midi	link_mp3_1	Link_mp3_2	link_video	link_youtube: adalah penanda kalau ada data dipakai
  //               SPR, Pemuda, remaja, anak, gugus, injil, sehari-hari adalah penanda yang dipakai untuk acara khusus
  //               Link_midi	link_mp3_1	Link_mp3_2	link_video	link_youtube  adalah link yang bisa diputar di dalam kidung dan bisa di share
  
  KIDUNG_SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vT7oBVFEnqPn9ipvycG0zuFO4DVwo1tuRpV4EO-zuDfinFAyXtDOBIFzIEvd_GtKXRJBLqKoH3CpaTe/pub?output=csv",

  // Perkiraan ukuran (KB) data Kidung -- HANYA untuk teks info di layar
  // sinkron, tidak wajib akurat (beda dengan BIBLE_DATA_APPROX_SIZE_MB
  // yang punya mekanisme ukur-otomatis; data Kidung jauh lebih kecil
  // jadi tidak perlu progress bar rumit).
  KIDUNG_DATA_APPROX_KB: 1300,

  // Urutan buku Kidung untuk navigasi ◀/▶ LINTAS BUKU (22 Agu 2026) --
  // dipakai findAdjacentKidungCrossBook() di js/kidung.js supaya waktu
  // pengguna tekan ▶ di nomor TERAKHIR sebuah buku, otomatis lompat ke
  // nomor PERTAMA buku berikutnya dalam daftar ini (begitu juga ◀ di
  // nomor pertama -> lompat ke nomor TERAKHIR buku sebelumnya), lalu di
  // ujung daftar berputar balik ke awal (Tambahan habis -> balik ke
  // Kidung No.1, bukan berhenti).
  // - Buku yang namanya TIDAK ada di daftar ini (mis. baru ditambah di
  //   Sheet tapi belum sempat didaftarkan di sini, misalnya nanti
  //   "Remaja"/"Pemuda") TETAP otomatis ikut ketambahan sebagai buku
  //   baru (list buku sendiri masih 100% otomatis dari data, lihat
  //   getKidungBooks()) -- hanya URUTANNYA yang default taruh di
  //   PALING BELAKANG (urut abjad), supaya navigasi tidak pernah
  //   "kehilangan" buku baru itu sama sekali walau lupa didaftarkan di
  //   sini. Begitu mau posisinya dipastikan (mis. "Remaja" maunya
  //   sebelum "Tambahan"), tinggal masukkan namanya ke array ini di
  //   posisi yang diinginkan -- ejaannya HARUS SAMA PERSIS dengan isi
  //   kolom "Buku" di Sheet Kidung (termasuk besar/kecil huruf).
  KIDUNG_BOOK_ORDER: ["Kidung", "Supplemen", "Tambahan"],

  // ----------------------------------------------------------
  // 8) PENGETAHUAN TAMBAHAN AI CHAT (istilah/kategori & topik) -- OPSIONAL
  // ----------------------------------------------------------
  // Sebagian pengetahuan sudah tertanam LANGSUNG di kode (lihat
  // AI_KNOWLEDGE_BUILTIN di js/aichat.js: Perjanjian Baru, Jantung
  // Alkitab, Kitab Taurat, Kitab tentang Wahyu, Baptisan, Pemecahan
  // Roti) -- JALAN OTOMATIS tanpa perlu isi apa pun di sini.
  //
  // Isi URL di bawah HANYA kalau suatu saat mau MENAMBAH istilah/topik
  // baru TANPA perlu minta bantuan ubah kode lagi -- caranya:
  //   1. Buat Google Sheet baru, isi kolom (baris pertama = judul
  //      kolom, PERSIS salah satu nama di bawah -- boleh pilih salah
  //      satu variasi, tidak harus semua):
  //        Istilah        (WAJIB) -- kata/frasa pemicu. Boleh lebih
  //                          dari satu alias untuk baris yang sama,
  //                          dipisah "|", mis. "kitab nubuat|nubuatan"
  //        Kitab Terkait  -- daftar nama kitab, dipisah koma
  //        Ayat Terkait   -- daftar referensi ayat, dipisah koma (mis.
  //                          "Markus 16:16, Yohanes 3:5") -- CUKUP
  //                          referensinya saja, teks lengkap ayatnya
  //                          otomatis dicari sendiri oleh aplikasi dari
  //                          data Alkitab yang sudah ada, TIDAK perlu
  //                          disalin manual ke Sheet ini
  //        Keterangan     -- penjelasan bebas (opsional)
  //   2. File -> Share -> Publish to web -> pilih sheet ini -> format
  //      CSV -> Publish. Salin link-nya, tempel di bawah ini.
  //   3. Muat ulang aplikasi (data disegarkan otomatis tiap 24 jam,
  //      atau langsung kalau baru pertama kali diisi/dikosongkan).
  // Kosongkan ("") kalau tidak dipakai -- fitur bawaan (builtin) di
  // atas tetap jalan seperti biasa tanpa ini.
  AI_KNOWLEDGE_CSV_URL: "1zlZcLeAwB7cmdkP8vjSZpaxZM7yGnUneB-_SaGz2yX4",

  // ----------------------------------------------------------
  // 9) MODE TAMU (bisa langsung dipakai TANPA login/daftar dulu)
  // ----------------------------------------------------------
  // Lihat js/guest.js untuk logikanya. Yang bisa diatur di sini:
  //  - GUEST_MODE_ENABLED: nyala/matikan tombol "Coba Tanpa Daftar"
  //    di layar Masuk. Set `false` kalau tidak mau ada akses tamu
  //    sama sekali (semua orang WAJIB login seperti sebelumnya).
  //  - GUEST_DAILY_LIMIT_PER_DEVICE: maksimal PENCARIAN per hari
  //    untuk SATU perangkat/browser yang belum login.
  //  - GUEST_TOTAL_DAILY_LIMIT: maksimal PENCARIAN gabungan dari
  //    SEMUA tamu (semua perangkat) per hari -- begitu tercapai,
  //    SEMUA tamu (termasuk yang belum habis jatah pribadinya)
  //    tidak bisa mencari lagi sampai besok. Naikkan angka ini kalau
  //    jemaat/pengunjung tanpa login makin ramai.
  // PENTING (BARU): kedua angka di bawah ini SEKARANG HANYA CADANGAN
  // (dipakai kalau tab "Setup" di Google Sheet belum sempat terbaca, mis.
  // Apps Script benar-benar baru pertama dipasang). Sumber UTAMA & yang
  // SUNGGUHAN ditegakkan sekarang tab "Setup" di Google Sheet sinkron
  // Anda, dua baris key: `guest_daily_limit_per_device` &
  // `guest_total_daily_limit` (dibuat otomatis dengan isi 10 & 100 saat
  // pertama kali dipakai -- lihat getSheet_() di apps-script/Code.gs).
  // Administrator TINGGAL UBAH ANGKANYA LANGSUNG DI SHEET kapan saja,
  // TIDAK perlu ubah file ini atau deploy ulang apa pun -- ditegakkan
  // lewat Apps Script (endpoint type=guest_search, dibaca lewat
  // getSetupNumber_(), tab Sheet "GuestUsage" untuk pencatatan
  // pemakaiannya). Kalau APPS_SCRIPT_URL masih kosong / sedang offline,
  // aplikasi jatuh balik ke hitungan LOKAL per perangkat saja (tidak
  // terpusat, bisa diakali dengan hapus data browser) memakai angka
  // cadangan di bawah -- batas totalnya (gabungan semua tamu) TIDAK bisa
  // ditegakkan tanpa APPS_SCRIPT_URL terisi & bisa dihubungi.
  GUEST_MODE_ENABLED: true,
  GUEST_DAILY_LIMIT_PER_DEVICE: 10,
  GUEST_TOTAL_DAILY_LIMIT: 100,
};
