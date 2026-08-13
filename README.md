# Aplikasi Baca Alkitab (2 Google Sheet, multi-bahasa, rencana baca)

Aplikasi web statis (tanpa build/backend) untuk membaca Alkitab, mencari ayat
(mis. `kejadian 1:1`), mencari kata di seluruh isi Alkitab, membaca satu pasal
penuh, mengikuti **rencana baca**, dan login dengan **username & password
dari Google Sheet terpisah** — semua dari **data lokal di HP/komputer**
setelah pengambilan pertama.

## Cara kerja singkat

1. **Dua Google Sheet berbeda:**
   - **Sheet Alkitab** — isi teks Alkitab (bisa banyak bahasa sekaligus).
   - **Sheet Pengguna** — daftar akun (username, password, nama).
2. **Kunjungan pertama**: aplikasi mengambil kedua data itu (CSV publik),
   menyimpannya di `IndexedDB` (penyimpanan lokal browser).
3. **Kunjungan berikutnya**: aplikasi langsung membaca dari `IndexedDB` —
   tidak memanggil server sama sekali untuk baca/cari Alkitab, sehingga
   instan dan tetap bisa dibuka walau koneksi lambat setelah data tersimpan.
4. **Login**: username & password dicocokkan ke data pengguna yang sudah
   tersimpan lokal (jadi tetap bisa login walau sedang offline, asal pernah
   sinkron sebelumnya). Setelah berhasil, status login disimpan di
   `localStorage` — besok-besoknya langsung masuk tanpa mengetik ulang,
   sampai menekan **Keluar (logout)**.
5. Menu ⋮ di kanan atas punya dua tombol sinkron terpisah: **Sinkronkan ulang
   Alkitab** (kalau isi Sheet Alkitab berubah) dan **Sinkronkan ulang daftar
   pengguna** (kalau ada akun baru ditambahkan/diubah).
6. **Rencana baca** (ikon 📅 di header): setiap pengguna yang login bisa
   memilih satu rencana baca, progresnya (hari mana yang sudah ditandai
   selesai) tersimpan di perangkat itu, terikat ke akunnya. Bisa ganti
   rencana kapan saja, dan tidak terikat tanggal — checklist manual sesuai
   kesiapan masing-masing.

## 1. Siapkan Sheet Alkitab (Sheet #1)

Kolom yang didukung (nama boleh huruf besar/kecil bebas):
`Bahasa | Verse ID | Book Name | Book Number | Chapter | Verse | Text | Note`

Kolom **Bahasa** boleh berisi banyak kode berbeda dalam satu sheet yang sama
(mis. `ind`, `kjv`, `eng`, `chs`, `jawa`, `rvind`, `rveng`, `chssmp` — satu
baris = satu ayat dalam satu bahasa). Aplikasi otomatis mengelompokkannya dan
menampilkan dropdown pemilih bahasa berisi semua kode yang ditemukan.

> Sheet besar (ratusan ribu baris, banyak bahasa) tetap didukung — data
> disimpan bertahap ke penyimpanan lokal (per beberapa ribu baris) sambil
> menampilkan progres, supaya browser tidak macet saat sinkronisasi pertama.

### Tentang teks yang mengandung markup teknis

Beberapa versi menyisipkan markup teknis di dalam teks ayat, misalnya nomor
Strong `{H430}` pada `kjv`, atau penanda catatan kaki `<FR><sup>1a</sup><Fr>`
pada `rvind`/`rveng`. Aplikasi ini **otomatis membersihkan markup tersebut**
sebelum ditampilkan, supaya ayat tetap enak dibaca.

### Nama kitab & label bahasa

Nama kitab di kolom **Book Name** dipakai untuk ditampilkan di layar baca
(mengikuti bahasa aktif, mis. "Genesis" untuk kjv/eng). Untuk **navigasi
sidebar dan pencarian referensi** (`kejadian 1:1`), aplikasi selalu memakai
nama kitab bahasa Indonesia dari `js/books.js` — jadi ketik referensi dalam
bahasa Indonesia walau bahasa tampilan sedang bahasa lain.

Label dropdown bahasa diatur di `js/config.js` bagian `LANGUAGES` — sesuaikan
jika kurang tepat.

## 2. Siapkan Sheet Pengguna (Sheet #2 — TERPISAH dari Sheet Alkitab)

Buat **Google Sheet baru yang berbeda**, dengan kolom:

`Username | Password | Nama`

- **Nama** boleh dikosongkan (kalau kosong, Username yang ditampilkan).
- Satu baris = satu akun.

Contoh (lihat juga `sample-users.csv` di dalam paket ini):

| Username | Password      | Nama          |
|----------|----------------|---------------|
| budi     | rahasia123     | Budi Santoso  |
| sari     | katakunci456   | Sari Wijaya   |

⚠️ **Catatan keamanan**: ini BUKAN otentikasi tingkat server. Username &
password disimpan apa adanya (teks biasa) di Google Sheet dan di
penyimpanan lokal browser pengguna. Cocok untuk keperluan
pribadi/keluarga/jemaat supaya tidak sembarang orang membuka, **tapi jangan
gunakan password yang sama dengan akun penting lain**, dan jangan andalkan
untuk melindungi data rahasia.

## 3. Publikasikan kedua Sheet sebagai CSV

Untuk **masing-masing** Sheet (Alkitab & Pengguna), lakukan:
1. **File → Bagikan → Publikasikan ke web**
2. Pilih sheet yang sesuai, format **Comma-separated values (.csv)**
3. Klik **Publikasikan**, salin URL yang diberikan
   (bentuknya seperti `https://docs.google.com/spreadsheets/d/e/xxxxxxx/pub?output=csv`)

## 4. Atur konfigurasi

Buka `js/config.js`, isi dua URL CSV:

```js
BIBLE_SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/xxxxx/pub?output=csv",
USERS_SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/yyyyy/pub?output=csv",
```

## 5. Coba di komputer sebelum deploy

Karena aplikasi memakai `fetch()`, buka lewat server lokal (bukan
klik-dobel `index.html`):

```bash
cd bible-app
npx serve .
# atau
python3 -m http.server 8080
```

Lalu buka `http://localhost:8080` (atau port yang muncul). Untuk uji cepat
tanpa Google Sheet asli, Anda bisa sementara arahkan kedua URL di
`config.js` ke berkas `sample-data.csv` / `sample-users.csv` yang disediakan
(unggah dulu ke hosting statis mana pun, atau jalankan lewat server lokal
lalu pakai path relatif `sample-data.csv`).

## 6. Deploy ke Vercel

**Cara termudah (tanpa command line):**
1. Buat repo GitHub baru, unggah semua isi folder `bible-app/`
2. Di [vercel.com](https://vercel.com) → **Add New Project** → pilih repo tsb
3. Framework preset pilih **Other** (situs statis) — tidak perlu build command
4. Deploy

**Lewat CLI:**
```bash
npm i -g vercel
cd bible-app
vercel --prod
```

## Fitur tampilan

- Tombol lebar tampilan di kanan atas (📱 HP / 📓 Tablet / 🖥️ Komputer / ⛶ Penuh)
  plus penggeser (slider) untuk mengatur lebar bebas — berguna baik di HP
  maupun di layar komputer besar.
- Dropdown pemilih bahasa di header — ganti bahasa kapan saja, pilihan
  tersimpan untuk kunjungan berikutnya.
- Sidebar daftar 66 kitab (Perjanjian Lama & Baru); kitab yang belum tersedia
  dalam bahasa terpilih otomatis dinonaktifkan (mis. `jawa` yang baru berisi
  Perjanjian Baru).
- Ayat yang punya isi di kolom **Note** menampilkan catatan/penjelasan kecil
  di bawah teksnya (ditandai 📝).
- Kotak pencarian di atas menerima:
  - Referensi ayat: `kejadian 1:1`, `yeh 26:1`, `1 korintus 13:4-7`
  - Referensi pasal penuh: `kejadian 1`, `mazmur 23`
  - Kata/frasa bebas: `kasih`, `terang` → menampilkan semua ayat (dalam bahasa
    yang sedang aktif) yang mengandung kata tersebut, dengan kata dicetak sorot

## Rencana baca (ikon 📅)

Empat paket sudah disediakan (bisa diubah/ditambah di `js/plans.js` bagian
`PLAN_DEFINITIONS`):

- Seluruh Alkitab dalam 1 bulan (30 hari)
- Perjanjian Baru dalam 1 bulan (30 hari)
- Perjanjian Lama dalam 2 tahun (730 hari)
- Perjanjian Baru dalam 1 tahun (365 hari)

Saat sebuah paket dipilih, aplikasi otomatis membagi rata seluruh pasal dalam
cakupan itu (Alkitab penuh / hanya PL / hanya PB) ke jumlah hari yang
ditentukan, lalu menampilkan daftar per hari (mis. "Hari 1 — Kejadian 1-39").
Pengguna menandai (centang) hari yang sudah dibaca; ada tombol **▶ Lanjutkan**
yang langsung membuka pasal pertama dari hari belum selesai berikutnya, dan
tombol **Ganti Rencana** untuk beralih ke paket lain kapan saja (progres
paket lama akan dihapus).

> Progres rencana baca tersimpan **lokal di perangkat** (instan, tetap jalan
> walau offline), dan otomatis dikirim ke Google Sheet di latar belakang
> lewat Apps Script (lihat bagian "Sinkronisasi ke Google Sheet" di bawah) —
> jadi kalau dikonfigurasi, progres yang sama akan muncul saat dibuka dari
> HP maupun komputer lain dengan akun yang sama.

## Klik ayat untuk melihat & menulis catatan

Setiap ayat sekarang **bisa diklik** — akan muncul jendela kecil (mirip
aplikasi catatan) berisi:

- Teks ayat yang dipilih.
- **Catatan dari Sheet Alkitab** (kolom `Note`), kalau kolom itu diisi
  untuk ayat tersebut — ditandai ikon 📝 kecil pada ayat yang punya catatan.
- **Kotak catatan pribadi** — setiap pengguna bisa menulis renungan/catatan
  sendiri untuk ayat mana pun, lalu klik **Simpan Catatan**. Catatan ini
  tersimpan lokal secara instan, dan (kalau sinkronisasi Google Sheet
  dikonfigurasi) juga tersimpan ke Google Sheet supaya bisa dibaca lagi dari
  perangkat lain.

## Pembacaan suara (▶️ / ⏸ di header)

Tombol ▶️ akan membacakan seluruh pasal yang sedang dibuka, ayat demi ayat,
sambil menyorot ayat yang sedang dibacakan (otomatis mengikuti gulir layar).
Tombol yang sama berubah jadi ⏸ untuk **menjeda**, dan bisa ditekan lagi
untuk **melanjutkan** dari ayat yang sama.

Fitur ini memakai **Web Speech API** bawaan browser (`speechSynthesis`) —
di Chrome/Android biasanya otomatis memakai suara Google. Tidak perlu API
key atau biaya tambahan. Kalau browser/perangkat tidak mendukungnya, tombol
akan otomatis nonaktif. Kualitas & pilihan suara Indonesia tergantung
browser/OS masing-masing perangkat.

## Ukuran huruf (A- / A+) & Layar Penuh (⛶)

- Tombol **A-** / **A+** di header memperkecil/memperbesar ukuran huruf
  ayat secara bertahap; pilihan tersimpan untuk kunjungan berikutnya.
- Tombol **⛶** mengaktifkan mode layar penuh sungguhan (Fullscreen API),
  menyembunyikan bagian yang tidak perlu supaya fokus membaca. Tombol ini
  berbeda dari kontrol lebar tampilan (📱/📓/🖥️/↔️) yang sudah ada
  sebelumnya, yang hanya mengatur lebar kolom teks.

## Sinkronisasi ke Google Sheet (catatan & progres rencana baca)

Selain dua Sheet utama (Alkitab & Pengguna), Anda bisa **opsional**
menambahkan satu Google Sheet lagi khusus untuk menyimpan **catatan
pribadi per ayat**, **progres rencana baca**, dan **pengaturan pribadi**
(mis. nyala/mati animasi progres membaca), supaya semuanya bisa dibuka
sama persis dari HP maupun komputer lain (bukan cuma tersimpan di satu
perangkat).

> **Kenapa bukan di Sheet Pengguna (login/password)?** Sheet Pengguna
> dipublikasikan sebagai CSV read-only supaya bisa dibaca aplikasi untuk
> validasi login — bentuknya tidak dirancang untuk ditulisi balik oleh
> aplikasi. Jadi catatan, progres, dan pengaturan pribadi disimpan di
> Google Sheet **terpisah** (lewat Apps Script di bawah), tapi tetap
> terikat ke username yang sama persis dengan yang dipakai login, jadi
> hasilnya sama saja: tiap orang punya datanya sendiri, dan otomatis
> "ketemu" lagi saat mereka login dari perangkat lain.

Ini dilakukan lewat **Google Apps Script** (gratis, bawaan Google Sheet,
tidak perlu server tambahan):

1. Buat Google Sheet **baru** (nama bebas, mis. "Data Sinkron Alkitab").
   Tidak perlu bikin tab/kolom manual — skrip di bawah akan membuatnya
   sendiri (3 tab: `Notes`, `Progress`, `Settings`).
2. Di Sheet itu: menu **Ekstensi → Apps Script**.
3. Hapus kode contoh yang ada, lalu salin-tempel **seluruh isi** file
   `apps-script/Code.gs` (ada di paket ini) ke sana. Simpan.
4. Klik **Deploy → New deployment** → ikon gerigi di "Select type" →
   pilih **Web app**.
   - **Execute as**: Me (akun Anda)
   - **Who has access**: **Anyone** (wajib "Anyone", bukan yang perlu akun
     Google, supaya aplikasi web bisa memanggilnya)
   - Klik **Deploy**. Google akan minta otorisasi — klik **Authorize
     access**, pilih akun Anda, lalu (kalau muncul peringatan) klik
     **Advanced** → **Go to (nama project) (unsafe)** → **Allow**. Ini
     aman karena ini skrip milik Anda sendiri.
5. Salin URL yang muncul (berakhiran `/exec`).
6. Tempel URL itu ke `js/config.js` pada `CONFIG.APPS_SCRIPT_URL`.

Setelah itu, aplikasi otomatis:
- Menarik catatan, progres, & pengaturan tersimpan setiap kali dibuka/login.
- Mengirim perubahan ke Google Sheet setiap kali disimpan.
- Kalau ada perbedaan antara data lokal & data di Sheet (mis. dibuka dari
  2 perangkat), yang **paling baru diubah** yang dipakai.

Kalau `APPS_SCRIPT_URL` dibiarkan seperti bawaan (belum diisi URL asli),
fitur ini otomatis nonaktif — semuanya tetap tersimpan lokal di perangkat
seperti biasa, aplikasi tidak error atau melambat.

⚠️ Sama seperti Sheet Pengguna, ini bukan sistem tingkat enterprise —
cocok untuk pemakaian pribadi/keluarga/jemaat.

## Animasi progres membaca (📖 → 🌟 → 🎉)

Saat membaca sebuah pasal, aplikasi diam-diam memperhatikan seberapa jauh
Anda sudah menggulir (scroll) layar, lalu menampilkan tulisan singkat yang
muncul sendiri di bagian atas layar (tidak perlu diklik/ditekan apa pun):

- Sudah menggulir **~50%** pasal → "📖 Sudah separuh pasal ini terbaca…"
- Sudah menggulir **~75%** pasal → "🌟 Tiga perempat lagi, sedikit lagi selesai!"
- Sudah menggulir **sampai akhir** pasal → "🎉 Selamat! Anda sudah
  menyelesaikan pembacaan pasal ini." — disertai **animasi kembang api**
  singkat di layar, lalu hilang sendiri.

Untuk pasal yang pendek (muat semua di satu layar, tidak perlu digulir),
aplikasi tetap menganggapnya selesai dibaca setelah beberapa detik.
Notifikasi ini dihitung ulang dari awal setiap kali pindah pasal.

**Bisa dimatikan** lewat menu **⋮ (pojok kanan atas) → 🎉 Animasi progres
membaca** (tombol geser). **Default-nya aktif** untuk semua pengguna baru.
Pilihan ini disimpan **per pengguna** (bukan satu pengaturan untuk semua
orang yang memakai aplikasi) — tersimpan lokal secara instan, dan kalau
sinkronisasi Google Sheet dikonfigurasi (lihat bagian di atas), pilihan
yang sama ikut terbawa saat login dari perangkat lain.

## Tema tampilan (menu ⋮ → 🎨 Tema tampilan)

10 tema warna siap pilih (terang & gelap), tersimpan otomatis untuk kunjungan
berikutnya: Manuskrip (bawaan), Terang Klasik, Malam Gelap, Sepia Hangat,
Hitam Pekat (OLED), Hijau Zaitun, Biru Malam, Merah Marun, Abu-abu Lembut,
Ungu Senja. Tambah/ubah lewat blok `body.theme-N` di `css/style.css` dan
larik `THEMES` di `js/app.js`.

## Pengaturan suara pembacaan (menu ⋮ → 🔊)

Selain tombol ▶️/⏸ di header, sekarang ada kontrol tambahan:
- **Bahasa suara**: Indonesia / Inggris / Mandarin (memilih suara `speechSynthesis`
  yang sesuai kode bahasa itu di perangkat Anda).
- **Jenis suara**: Otomatis / Wanita / Pria — ditebak dari nama suara yang
  tersedia di perangkat (tergantung suara apa yang terpasang di HP/komputer,
  hasil bisa berbeda-beda).
- **Kecepatan**: tombol − Lambat / + Cepat, dengan info kecepatan saat ini
  (mis. "1.2x"), tersimpan untuk kunjungan berikutnya.

## Pencarian banyak referensi sekaligus

Kotak pencarian sekarang menerima beberapa referensi ayat dipisah titik-koma,
mis. `matius 1:1; wahyu 2:2; kejadian 1:1-3` — menampilkan tiap ayat yang
ditemukan sebagai daftar hasil yang bisa diklik untuk membuka pasal lengkap.

## Tampilan kolom paralel — arah menyamping atau atas-bawah

Saat memakai 2 atau 3 kolom bahasa berdampingan (menu ⋮ → 📐 Tampilan
kolom), sekarang ada pilihan **arah**: **↔️ Menyamping** (kolom berjejer
kiri-kanan, seperti sebelumnya) atau **↕️ Atas-bawah** (tiap bahasa
ditumpuk vertikal, dipisah garis putus-putus) — sesuai selera masing-masing.
Tetap bisa kembali ke **1 Kolom** biasa kapan saja lewat tombol yang sama.

## Bacaan Bersuara harian (ikon 🎧 di header — MP3/MP4/YouTube)

Panel terpisah yang menampilkan daftar rentang bacaan harian beserta link
dengar (MP3), tonton (MP4), dan YouTube — diambil dari sheet **terpisah**
dari sheet Alkitab utama (kolom: `No/Nomor | Pembacaan | Link MP3 | Link MP4
| Youtube`). **Teks Alkitab yang dibaca tetap dari sheet Alkitab utama
seperti biasa** — sheet ini hanya menyumbang rentang referensi + link
dengar/tonton untuk tiap rentang itu.

Atur di `js/config.js` bagian `READING_MEDIA_SHEETS` — 4 slot sudah
disediakan (PL Indonesia, PB Indonesia, PB Mandarin, PB Inggris), isi
`csvUrl` untuk tiap tab yang sudah dipublikasikan (kosongkan yang belum ada;
otomatis disembunyikan, ikon 🎧 di header ikut tersembunyi kalau belum ada
satupun yang terisi). Saat ini baru **PL Indonesia** yang terisi (dari link
yang Anda kirim). Klik nomor/rentang bacaan untuk membuka pasalnya di
pembaca; klik 🎵/🎬/▶️ untuk membuka link dengar/tontonnya di tab baru.
Data di-cache di perangkat, ada tombol "🔄 Sinkronkan ulang" per sheet kalau
isinya berubah di Google Sheet.

## Belum termasuk (bisa ditambahkan lain waktu)

- URL CSV untuk 3 sheet **Bacaan Bersuara** lainnya (PB Indonesia, PB
  Mandarin, PB Inggris) — publikasikan tiap tab itu ke web sebagai CSV
  (sama seperti sheet Alkitab), lalu kirim URL-nya untuk diisi ke
  `READING_MEDIA_SHEETS`.
- Leaderboard dari sheet asli — belum dimasukkan (beri tahu jika masih
  diperlukan, dan jelaskan seperti apa tampilannya).

## Struktur berkas

```
bible-app/
├── index.html           struktur halaman
├── css/style.css         tampilan (tema, responsif, kontrol lebar, animasi ayat, modal catatan, toast progres)
├── js/config.js          URL Google Sheet, Apps Script, bahasa, ukuran huruf — EDIT INI
├── js/books.js           daftar 66 kitab + alias singkatan
├── js/csv.js             pengubah CSV → objek ayat / objek pengguna
├── js/db.js              lapisan penyimpanan lokal (IndexedDB): ayat + pengguna
├── js/sync.js            komunikasi ke Google Apps Script (simpan/ambil catatan, progres, pengaturan)
├── js/notes.js           catatan pribadi per ayat (lokal + gabung dengan data server)
├── js/settings.js        pengaturan pribadi per pengguna, mis. animasi progres membaca (lokal + server)
├── js/plans.js           definisi rencana baca, pembuatan jadwal, penyimpanan progres
├── js/app.js             logika utama aplikasi (login, baca, cari, rencana baca, TTS, progres membaca, dll)
├── apps-script/Code.gs   backend Google Apps Script untuk sinkronisasi (opsional, lihat di atas)
├── sample-data.csv       contoh data Alkitab untuk uji coba lokal
├── sample-users.csv      contoh data pengguna untuk uji coba lokal
└── vercel.json           konfigurasi hosting Vercel
```
