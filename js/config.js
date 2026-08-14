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
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzk0Lyh_JSPHRVjYD9t5dd7CBAZTz--QyYXbUOz1F1v-lwJd3NKKpM2Z5JvEsilVF1j/exec",

  // Daftar bahasa yang ada di kolom "Bahasa" pada sheet Alkitab, dengan label yang
  // tampil di tombol pemilih bahasa. Sesuaikan "label" jika kurang tepat — kode
  // ("code") HARUS SAMA PERSIS dengan nilai di kolom Bahasa pada Google Sheet Anda.
  LANGUAGES: [
    { code: "ind", label: "Indonesia (TB)" },
    { code: "rvind", label: "Indonesia (Recovery)" },
    { code: "kjv", label: "Inggris (King James)" },
    { code: "eng", label: "Inggris (English)" },
    { code: "rveng", label: "Inggris (Recovery)" },
    { code: "chs", label: "Tionghoa (中文)" },
    { code: "chssmp", label: "Tionghoa Sederhana" },
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

  // Nama database IndexedDB & object store tempat menyimpan data secara lokal.
  // DB_VERSION dinaikkan (dari versi sebelumnya) supaya store "users" baru
  // otomatis ditambahkan tanpa menghapus data Alkitab yang sudah tersimpan.
  DB_NAME: "bible_local_db",
  DB_VERSION: 2,
  STORE_NAME: "verses",
  USERS_STORE_NAME: "users",

  // ----------------------------------------------------------
  // 4) UKURAN HURUF AYAT (tombol A- / A+ di header)
  // ----------------------------------------------------------
  FONT_SIZE_STORAGE_KEY: "bible_app_font_size_v1",
  FONT_SIZE_MIN: 5,
  FONT_SIZE_MAX: 200,
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
      label: "Perjanjian Lama (Indonesia)",
      csvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQGlRBfxjNK7R_kRLUo9pnf4OnGQQJHlUn-MuJWBCX5V2ekrT4MqHAvVfmvNfgWfw/pub?output=csv",
    },
    {
      key: "pb_ind",
      label: "Perjanjian Baru (Indonesia)",
      csvUrl: "",
    },
    {
      key: "pb_mandarin",
      label: "Perjanjian Baru (Mandarin)",
      csvUrl: "",
    },
    {
      key: "pb_inggris",
      label: "Perjanjian Baru (Inggris)",
      csvUrl: "",
    },
  ],
};
