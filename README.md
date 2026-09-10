# Aplikasi Baca Alkitab (Multi Google Sheet, multi-bahasa, rencana baca)

Aplikasi web statis (tanpa build/backend) untuk membaca Alkitab, mencari ayat
(mis. `kejadian 1:1`), mencari kata di seluruh isi Alkitab, membaca satu pasal
penuh, mengikuti **rencana baca**, dan login dengan **username & password
dari Google Sheet terpisah** — semua dari **data lokal di HP/komputer**
setelah pengambilan pertama.

## Cara kerja singkat

1. **Multi Google Sheet berbeda:**
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

Kolom opsional tambahan yang dikenali aplikasi (boleh ditambahkan kapan
saja tanpa mengganggu kolom yang sudah ada):

- **Level** — jenjang pengguna (administrator, penatua, dst.), lihat
  bagian "Update terbaru: level pengguna…" di bawah.
- **Tipe** — (BARU, lihat "tahap 12" di bawah) isi `premium` untuk
  pengguna yang boleh membuka tab "🕘 Riwayat" di dalam AI Chat. Kosong
  atau nilai lain = pengguna biasa. Kolom ini **ditambahkan ke Sheet
  Pengguna yang sama** (bukan Sheet terpisah), supaya status premium
  tidak tersebar di 2 tempat berbeda.

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

## Catatan ayat — tekan DUA KALI nomor ayat (sejak Agustus 2026: sebaris, bukan jendela lagi)

Setiap **nomor ayat** sekarang tombol bulat — **tekan dua kali** untuk buka/tutup
panel catatannya. Sekali tekan sengaja **tidak** melakukan apa-apa (supaya
tidak "salah tekan" cuma karena menggulir/scroll dekat nomor ayat). Panel
catatan muncul **di bawah ayat itu sendiri** (sebaris, mendorong ayat di
bawahnya turun) — BUKAN lagi jendela/modal terapung yang menutupi ayat lain.
Lebarnya otomatis sama persis dengan lebar teks ayat, di HP maupun komputer.

Isi panelnya:
- **Catatan dari Sheet Alkitab** (kolom `Note`), kalau kolom itu diisi untuk
  ayat tersebut — ditandai ikon 📝 kecil pada ayat yang punya catatan.
- **Kotak catatan pribadi** — setiap pengguna bisa menulis renungan/catatan
  sendiri untuk ayat mana pun, lalu tekan **💾 Simpan Catatan**. Catatan ini
  tersimpan lokal secara instan, dan (kalau sinkronisasi Google Sheet
  dikonfigurasi) juga tersimpan ke Google Sheet supaya bisa dibaca lagi dari
  perangkat lain.
- Tombol salin ayat, salin catatan, dan simpan ke Kumpulan Ayat.

Kalau datang dari menu "🗒️ Catatan Saya" (ayat yang sudah punya catatan),
panel catatannya langsung terbuka otomatis — tidak perlu tekan dua kali lagi.

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
pribadi per ayat**, **progres rencana baca**, **pengaturan pribadi**
(mis. nyala/mati animasi progres membaca), dan **📚 Kumpulan Ayat**,
supaya semuanya bisa dibuka sama persis dari HP maupun komputer lain
(bukan cuma tersimpan di satu perangkat).

> **Kumpulan Ayat & link 🎵MP3/🎬MP4/▶️YouTube**: yang disinkronkan untuk
> tiap kumpulan hanyalah NAMA kumpulan + daftar ayatnya. Link
> MP3/MP4/YouTube-nya sendiri TIDAK ikut disimpan di kumpulan — setiap
> kali kumpulan dibuka, aplikasi mencocokkan kitab+pasal tiap ayat ke
> sheet **Bacaan Bersuara** (`CONFIG.READING_MEDIA_SHEETS`, lihat bagian
> di bawah) dan menampilkan tombolnya kalau ketemu. Jadi: (1) kumpulan
> ayat ikut sama di HP lain manapun selama Apps Script di bawah sudah
> diisi, dan (2) kalau link di sheet Bacaan Bersuara diganti/diperbarui,
> kumpulan yang sudah ada otomatis ikut memakai link terbaru itu, tanpa
> perlu diedit ulang.

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

## Bacaan Bersuara harian (MP3/MP4/YouTube — sejak Agustus 2026 tergabung di menu 📅 Rencana Baca)

> ⚠️ **Bagian ini sudah usang** — sebelumnya ikon 🎧 terpisah di header
> membuka panel sendiri; sejak update di bawah (poin 8), fitur ini
> **digabung menjadi salah satu pilihan di menu 📅 Rencana Baca**. Lihat
> poin 8 di bagian "Update terbaru" untuk cara pakainya yang sekarang.
> Bagian ini dibiarkan untuk referensi kolom sheet-nya saja.

Menampilkan daftar rentang bacaan harian beserta link dengar (MP3), tonton
(MP4), dan YouTube — diambil dari sheet **terpisah** dari sheet Alkitab
utama (kolom: `No/Nomor | Pembacaan | Link MP3 | Link MP4 | Youtube`).
**Teks Alkitab yang dibaca tetap dari sheet Alkitab utama seperti biasa**
— sheet ini hanya menyumbang rentang referensi + link dengar/tonton untuk
tiap rentang itu.

Atur di `js/config.js` bagian `READING_MEDIA_SHEETS` — 4 slot sudah
disediakan (PL Indonesia, PB Indonesia, PB Mandarin, PB Inggris), isi
`csvUrl` untuk tiap tab yang sudah dipublikasikan (kosongkan yang belum
ada; sheet yang belum diisi otomatis tidak muncul sebagai pilihan rencana
baca). Saat ini baru **PL Indonesia** yang terisi.

## Update terbaru: level pengguna, log aktivitas, pengumuman, pencarian, catatan (Agustus 2026)

Lima hal di bawah ini baru ditambahkan. Ringkasan **di file mana saja
perubahannya**, supaya mudah dilacak:

1. **Jenjang level pengguna** (administrator, penatua, gembala distrik,
   gembala, pra gembala, inti, atau kosong = "Kaum Saleh"; satu akun boleh
   punya 1-2 level sekaligus, dipisah koma di Sheet Pengguna kolom `Level`).
   - `js/config.js` → `CONFIG.LEVEL_DEFINITIONS` (urutan & rank jenjang).
   - `js/csv.js` → `normalizeUserRecord()` + `parseLevelsField()` (membaca
     kolom `Level` dari Sheet Pengguna).
   - `js/levels.js` (**berkas baru**) → helper level (`isAdministrator()`,
     `levelDisplayLabel()`, `canViewLevel()` untuk fitur pemantauan nanti).
   - `sample-users.csv` → contoh kolom `Level`.
   - Tampil di menu ⋮ (status "Masuk sebagai…").
   - **Cara pakai**: tambahkan kolom `Level` di Sheet Pengguna Anda, isi
     mis. `administrator` atau `gembala distrik, inti`, publikasikan ulang
     ke web (Sheet Pengguna sudah dipublikasikan sebagai CSV, jadi cukup
     re-publish/republish setelah menambah kolom), lalu di aplikasi tekan
     menu ⋮ → **👥 Sinkronkan ulang daftar pengguna**.

2. **Log aktivitas** (menu yang dibuka, kata yang dicari, tanggal, jam, OS,
   IP perkiraan) — tersimpan ke Google Sheet lewat Apps Script yang sama
   dengan catatan/rencana baca.
   - `js/activitylog.js` (**berkas baru**) → deteksi OS, ambil IP publik
     (lewat layanan gratis `api.ipify.org`, dipanggil dari browser
     pengguna — **BUKAN** dari server, karena Google Apps Script tidak
     memberi tahu IP pengunjung web app-nya; baca catatan jujur di bagian
     atas berkas ini soal batasan IP: bisa sama untuk 1 jaringan/rumah, dan
     bisa gagal/kosong kalau offline).
   - `js/sync.js` → `Sync.pushLog()`.
   - `apps-script/Code.gs` → tab baru **ActivityLog**, `doPost type=log`.
   - Dipanggil otomatis saat: login, buka pasal, pencarian, buka Rencana
     Baca, buka Bacaan Bersuara, buka Pengumuman, buka Catatan Saya.
   - ✅ **Update Agustus 2026 (tahap 2)**: sekarang sudah ada tampilannya —
     lihat poin 6 & 7 di bawah (📊 Log Aktivitas & 👀 Pantau Pembacaan).

3. **Pengumuman** — hanya administrator yang bisa menulis, tampil otomatis
   ke semua orang saat pertama login (kalau ada yang belum dibaca), dan
   bisa dibuka lagi kapan saja lewat menu ⋮ → **📢 Pengumuman**.
   - `apps-script/Code.gs` → tab baru **Announcements**,
     `doGet type=announcements`, `doPost type=announcement` /
     `announcement_delete`.
   - `js/sync.js` → `pullAnnouncements()`, `pushAnnouncement()`,
     `deleteAnnouncement()`.
   - `js/app.js` → `showAnnouncementPanel()`, `renderAnnouncementPanel()`,
     `checkAnnouncementsAtStart()` (dipanggil dari `startApp()`).
   - `index.html` → `#announcementPanel`, tombol `#announcementBtn` di
     menu ⋮. `css/style.css` → gaya `.announcement-*`.
   - Tombol "Tulis pengumuman" & "Hapus" hanya muncul kalau level akun
     yang login mengandung `administrator`.

4. **Pencarian ditingkatkan**: pilih bahasa (termasuk "Semua Bahasa"), cari
   di Ayat / Catatan Saya / keduanya, jumlah hasil ditampilkan persis, dan
   **semua** kemunculan kata yang cocok di-highlight (sebelumnya cuma
   kemunculan pertama).
   - `js/app.js` → `highlightAllMatches()`, `runKeywordSearch()`,
     `searchInPersonalNotes()`, `initSearchOptions()`, `handleSearch()`
     dirombak.
   - `index.html` → `#searchOptionsRow` (pilihan bahasa & cakupan) di
     dalam panel `#searchResults`. `css/style.css` → `.search-options-row`.

5. **Menu Catatan Saya** — daftar semua catatan pribadi (yang sebelumnya
   cuma bisa dilihat satu-satu lewat klik ayat) sekarang punya menu
   tersendiri: ⋮ → **🗒️ Catatan Saya**, urut dari yang terakhir diubah,
   klik untuk langsung lompat ke ayatnya.
   - `js/app.js` → `showNotesMenuPanel()`, `renderNotesMenuPanel()`,
     `verseById` (index baru di `buildIndexes()` untuk mencari ayat dari
     ID catatan).
   - `index.html` → `#notesPanel`, tombol `#notesMenuBtn` di menu ⋮.
     `css/style.css` → `.notes-panel`, `.notes-menu-*`.
   - Catatan tetap tersimpan di tempat yang **sama seperti sebelumnya**
     (lokal di perangkat + Google Sheet tab `Notes` lewat Apps Script) —
     ini cuma menambah **cara melihatnya**, bukan lokasi penyimpanan baru.

6. **📊 Log Aktivitas (khusus administrator)** — panel baru lewat menu
   ⋮ → **📊 Log Aktivitas**, menampilkan SEMUA baris log yang sudah
   terkumpul (Tanggal, Jam, Pengguna, OS, IP, Menu, Pencarian), dengan:
   - Filter rentang tanggal (Hari ini / 7 / 30 / 90 hari / Semua), filter
     nama pengguna, dan filter kata di kolom Menu/Pencarian — tombol
     **Terapkan**.
   - Jumlah baris hasil ditampilkan persis (sesuai filter yang aktif).
   - Tombol **💾 Simpan sebagai CSV** — mengunduh hasil yang sedang
     tampil (sesuai filter) sebagai berkas `.csv` ke perangkat, bisa
     dibuka di Excel/Google Sheets.
   - Tabel di layar dibatasi 500 baris terbaru supaya browser tetap
     ringan (kalau hasil lebih banyak, ada catatan untuk mempersempit
     filter atau langsung memakai tombol Simpan CSV yang mengambil
     semuanya sesuai filter tanggal/pengguna/kata yang dipilih).
   - Berkas yang berubah: `apps-script/Code.gs` (`readLogs_()`,
     `doGet type=logs`), `js/sync.js` (`Sync.pullLogs()`), `js/app.js`
     (`showLogPanel()`, `loadAndRenderLogPanel()`, `saveLogAsCsv()`,
     `escapeHtml()`), `index.html` (`#logPanel`, tombol `#logViewerBtn`
     — otomatis disembunyikan kalau bukan administrator, lihat
     `updateLevelGatedMenus()` di `js/app.js`), `css/style.css`
     (`.log-*`).

7. **👀 Pantau Pembacaan (7 hari, level gembala ke atas)** — panel baru
   lewat menu ⋮ → **👀 Pantau Pembacaan** (tombol otomatis tersembunyi
   untuk akun tanpa level / "Kaum Saleh"). Pilih satu orang dari dropdown
   (daftar berisi hanya orang yang **boleh** dipantau akun Anda, memakai
   aturan bertingkat `canViewLevel()` di `js/levels.js` — administrator
   lihat semua, level lain hanya lihat rank sama/di bawahnya, termasuk
   "Kaum Saleh"), lalu tampil tabel 7 hari terakhir (hari ini mundur ke
   belakang) dengan kolom: Tanggal, **Baca? (V/X)**, Jam Awal, Jam Akhir,
   Jumlah Pasal. "Sudah membaca" dihitung dari log yang menunya diawali
   `"Baca: "` (dicatat otomatis tiap kali membuka satu pasal) — kalau
   perhitungan ini ingin diubah (mis. minimal 2 pasal, atau hanya
   menghitung Rencana Baca yang ditandai selesai), tinggal ganti syarat
   di `renderMonitorPanel()`.
   - Berkas yang berubah: `js/app.js` (`getMonitorableUsers()`,
     `showMonitorPanel()`, `renderMonitorPanel()`), `index.html`
     (`#monitorPanel`, tombol `#monitorBtn`), `css/style.css`
     (`.monitor-*`). Memakai endpoint `logs` yang sama dengan poin 6 di
     atas (tidak ada tab Sheet baru).

8. **🎧 Bacaan Bersuara digabung ke 📅 Rencana Baca (jadi satu menu)** —
   sebelumnya dua menu terpisah (ikon 📅 dan ikon 🎧 di header). Sekarang
   ikon 🎧 & panelnya **dihapus**; tiap sheet Bacaan Bersuara yang sudah
   diisi URL-nya di `CONFIG.READING_MEDIA_SHEETS` (`js/config.js`) muncul
   sebagai **satu pilihan rencana baca tambahan** (kartu "🎧 …") di layar
   pemilihan menu ⋮ → **📅 Rencana Baca**, di samping paket-paket biasa
   (Seluruh Alkitab 1 bulan, dst).
   - Kalau dipilih: tiap "hari" dalam rencana itu = satu baris di sheet
     Bacaan Bersuara-nya, labelnya **persis** teks kolom Pembacaan (mis.
     "Kejadian 1:1-2:3"), dan link **🎵 MP3 / 🎬 MP4 / ▶️ YouTube**-nya
     (kalau ada) tampil menempel langsung di bawah baris hari itu — klik
     baris untuk membuka pasalnya di pembaca (ditebak dari kitab/pasal
     AWAL rentang bacaan, sama seperti sebelumnya), klik tombol
     🎵/🎬/▶️ untuk dengar/tonton di tab baru.
   - Progres (centang selesai/belum) jalan sama seperti rencana baca
     biasa — tersimpan lokal + tersinkron ke Google Sheet.
   - Ada tombol **🔄 Sinkronkan ulang link audio/video** khusus di rencana
     jenis ini (di layar detail rencana), untuk menarik link terbaru dari
     Google Sheet kalau ada yang ditambah/diperbaiki — progres centang
     yang sudah ada TIDAK terhapus (dicocokkan berdasar urutan hari).
   - Ganti ke rencana lain (dan balik lagi) tetap lewat tombol **Ganti
     Rencana** yang sudah ada — sama seperti pindah rencana biasa.
   - **Masih terisi baru PL Indonesia** (di `READING_MEDIA_SHEETS`); 3
     sheet lainnya (PB Indonesia/Mandarin/Inggris) baru muncul sebagai
     pilihan begitu URL CSV-nya diisi di `js/config.js` (setelah
     dipublikasikan ke web dari Google Sheet Anda).
   - Berkas yang berubah: `js/media.js` (fungsi UI panel lama
     `showMediaPanel()`/`renderMediaPanelShell()`/`loadAndRenderMediaList()`/
     `renderMediaRows()`/`initMediaControl()` **dihapus**; fungsi baru
     `buildMediaScheduleFromRows()`, `buildMediaPlan()`,
     `resyncMediaPlan()`; fungsi lama yang dipakai ulang tetap ada:
     `fetchMediaSheet()`, `loadMediaFromCache()`, `guessReferenceFromPembacaan()`,
     `availableMediaSheets()`, `mediaLinkButton()`, `driveOpenUrl()`).
     `js/app.js` → `renderPlanChooser()` (tambah kartu rencana dari
     `availableMediaSheets()`), `renderPlanDetail()` (tampilkan label +
     link media per hari, tombol sinkron ulang khusus rencana media).
     `index.html` → tombol `#mediaToggle` & `<div id="mediaPanel">`
     **dihapus**. `css/style.css` → `.plan-day-row` diubah jadi 2 baris
     (`.plan-day-row-main` + `.plan-day-row-media`); gaya lama
     `.media-panel`/`.media-controls`/`.media-list`/dst dibiarkan ada
     (tidak dipakai lagi, tidak mengganggu) kalau-kalau masih dipakai di
     pengembangan lain nanti.

**Setelah update ini, jangan lupa**: TIDAK perlu apa-apa di Apps Script
untuk poin 8 ini (tidak ada tab Sheet baru, tidak ada endpoint baru) —
cukup unggah ulang berkas web statisnya (index.html, css/, js/) ke
hosting Anda (Vercel dsb).

## Update lanjutan (Agustus 2026, tahap 3)

1. **Perbaikan: Pengumuman tidak tampil di HP** — permintaan GET ke Apps
   Script sekarang selalu memakai `cache: "no-store"` + parameter acak
   `_ts=` (cache-buster), karena kemungkinan besar penyebabnya HP/jaringan
   operator seluler menyimpan cache respons GET yang URL-nya identik.
   Panel Pengumuman sekarang juga membedakan **"gagal memuat"** (tombol
   🔄 Coba Lagi muncul) dari **"memang belum ada pengumuman"** — sebelumnya
   dua situasi ini terlihat sama persis di layar.
   - Berkas: `js/sync.js` (`_get()`, `pullAnnouncementsChecked()` baru),
     `js/app.js` (`showAnnouncementPanel()` dirombak, `markAnnouncementsSeen()` baru).
   - **Kalau setelah update ini masih tidak muncul di HP tertentu**: coba
     hapus cache browser HP itu / buka di jendela penyamaran (incognito)
     untuk memastikan bukan cache LAMA yang tersimpan dari sebelum
     perbaikan ini, lalu beri tahu saya detail browser & HP-nya (kadang
     ada browser bawaan pabrikan HP tertentu yang perilakunya beda).

2. **Filter Perjanjian Lama / Perjanjian Baru / Semua** ditambahkan di
   panel hasil pencarian (di samping pilihan bahasa & cakupan Ayat/Ayat &
   Catatan/Catatan Saya yang sudah ada sebelumnya).
   - Berkas: `js/app.js` (`runKeywordSearch()`, `initSearchOptions()`,
     `handleSearch()`), `index.html` (`#searchTestamentSelect`). Memakai
     field `testament` ("PL"/"PB") yang sudah ada di `js/books.js`.

3. **"⭐ Pilih Domba-domba yang Dipantau"** di panel 👀 Pantau Pembacaan —
   tiap pemantau (administrator/gembala dst.) sekarang bisa mencentang
   sebagian orang saja dari daftar yang **boleh** ia pantau, supaya
   dropdown-nya lebih ringkas/fokus (mis. gembala distrik yang hanya mau
   fokus ke jemaat wilayahnya). Ini murni penyaring tampilan di atas hak
   akses `canViewLevel()` yang sudah ada — tidak pernah menambah orang di
   luar aturan jenjang level. Tersimpan per akun di perangkat itu
   (localStorage), kosongkan semua centang untuk kembali melihat semua
   yang boleh dipantau.
   - Berkas: `js/app.js` (`loadMonitorPins()`, `saveMonitorPins()`,
     `renderMonitorPanel()` dirombak), `css/style.css` (`.monitor-pin-*`).

4. **Pemutar media SEBARIS (tombol bulat 🎵🎬▶️), tanpa tab baru** —
   sebelumnya tombol MP3/MP4/YouTube membuka **tab baru**
   (`target="_blank"`), yang di HP sering tertutup sendiri / suaranya
   berhenti begitu berpindah aplikasi atau layar dikunci (tab baru gampang
   dihentikan paksa oleh sistem HP untuk hemat baterai). Sekarang
   tombolnya **bulat**, dan begitu ditekan, pemutarnya (audio/video/
   YouTube) langsung muncul **di halaman yang sama** — jadi ayat & catatan
   tetap kelihatan sambil mendengarkan/menonton, plus MediaSession API
   dipasang (metadata judul + kontrol) supaya diperlakukan sistem sebagai
   "sedang memutar media" (kontrol muncul di layar kunci).
   - Dipasang di **3 tempat**: baris hari di 📅 Rencana Baca (rencana
     Bacaan Bersuara), panel 📚 Kumpulan Ayat, dan **layar baca pasal**
     (tombol muncul otomatis di atas ayat kalau pasal yang sedang dibuka
     kebetulan ada di salah satu sheet Bacaan Bersuara — dicari di latar
     belakang, tidak memperlambat tampilnya ayat).
   - Berkas: `js/media.js` (`roundMediaButton()`, `wireMediaSession()`,
     `buildInlineMediaBlock()`, `youTubeEmbedUrl()` — semuanya baru; fungsi
     lama `mediaLinkButton()` dibiarkan ada untuk kompatibilitas tapi
     sudah tidak dipakai), `js/app.js` (`renderPlanDetail()`,
     `renderCollectionDetailInto()`, `renderChapter()` dirombak bagian
     medianya), `index.html` (`#readerMediaSlot` baru di layar baca
     pasal), `css/style.css` (`.round-media-btn`, `.inline-media-*`).
   - **Catatan jujur soal "suara tetap jalan walau layar dikunci total"**:
     ini batasan sistem operasi HP, bukan sesuatu yang bisa dijamin 100%
     dari sisi web biasa (beda dengan aplikasi native). Yang paling andal
     tetap berjalan di latar belakang adalah **audio MP3** (elemen
     `<audio>` asli) selama tab/aplikasi browsernya tidak ditutup total —
     MediaSession API di atas membantu, tapi bukan jaminan mutlak,
     terutama untuk pembacaan suara robot (Google Voice/TTS) yang memang
     punya batasan lebih ketat lagi di kebanyakan browser HP (belum
     dikerjakan di tahap ini — lihat "Belum termasuk" di bawah).

## Update lanjutan (Agustus 2026, tahap 4)

1. **5 fitur kecil-menengah**: 4 tema warna baru (biru pastel muda/tua, merah
   tua-putih, hijau tua pastel-kuning pastel, kuning-oranye pastel — total 17
   tema), tombol 🔗 Bagikan link MP3/MP4/YouTube, opsi TTS "ikut baca
   Catatan", ukuran huruf Catatan (Note) di layar baca mengikuti A+/A- ayat +
   lebar panel dilebarkan di komputer, dan mode pencarian Normal/⚡ Maks
   (Normal dibatasi 1.000 hasil biar cepat, Maks sampai 100.000 hasil).
   - Berkas: `js/app.js`, `js/media.js`, `index.html`, `css/style.css`.

2. **Notifikasi unduh data lewat WiFi (di awal, sebelum unduh data Alkitab
   pertama kali)** — kunjungan PERTAMA KALI (belum ada data Alkitab
   tersimpan lokal sama sekali) tidak lagi langsung menyedot data besar dari
   server begitu saja:
   - Kalau browser bisa memastikan sedang WiFi/kabel (Network Information
     API — hanya didukung sebagian browser, terutama Chrome/Android):
     langsung unduh otomatis seperti sebelumnya, tidak ada dialog tambahan.
   - Kalau terdeteksi data seluler, ATAU jenis koneksi tidak bisa dipastikan
     sama sekali (mis. kebanyakan browser di iPhone tidak mendukung API
     ini): muncul dialog "📶 Belum terdeteksi WiFi" dengan dua pilihan —
     **📥 Unduh Sekarang Juga** (lanjut seperti biasa, dengan info progres),
     atau **⏭️ Masuk Dulu (hemat kuota)** — tetap bisa masuk ke aplikasi
     walau data Alkitab belum ada, dengan pesan jelas + tombol unduh besar
     di tengah layar.
   - Kalau perangkat sedang benar-benar offline (`navigator.onLine === false`),
     dialog di atas dilewati — langsung tampil pesan "belum ada sambungan
     internet" (tidak ada gunanya menawarkan unduh sekarang).
   - Unduhan bisa dipicu kapan saja setelahnya lewat tombol menu baru
     **⋮ → 📥 Unduh Data Alkitab** (progres ditampilkan sama seperti sinkron
     ulang biasa — teks & bar persentase di `loadingOverlay`).
   - **Catatan jujur**: Network Information API (`navigator.connection`)
     tidak bisa membedakan WiFi vs seluler di semua browser/HP — terutama
     Safari/iPhone tidak mendukungnya sama sekali, jadi di situ dialog akan
     selalu muncul (tidak bisa dipastikan otomatis "aman", jadi tetap
     bertanya dulu demi jaga-jaga kuota pengguna).
   - Berkas: `js/app.js` (`handleInitialBibleDownload()`,
     `detectConnectionType()`, `showWifiDownloadPrompt()`,
     `showBibleNotDownloadedState()` — semuanya baru; `startApp()` diubah
     bagian pengecekan data lokal kosong), `index.html` (tombol
     `#downloadBibleBtn` baru di menu ⋮), `css/style.css`
     (`.empty-state .chip-btn`).

## Update lanjutan (Agustus 2026, tahap 5)

1. **Wake Lock (layar tidak mati sendiri) selama TTS atau pemutar
   sebaris MP3/MP4 sedang jalan** — sebelumnya kalau layar HP mati
   sendiri (timeout), suara TTS (Google Voice) maupun audio/video
   sebaris ikut berhenti. Sekarang selama salah satunya sedang
   memutar, aplikasi meminta layar tetap menyala (Wake Lock API),
   dan otomatis diminta ulang begitu tab terlihat lagi kalau sempat
   terlepas (mis. sempat pindah aplikasi sebentar).
   - Berkas: `js/app.js` (`requestWakeLock()`, `releaseWakeLock()`
     baru, dipasang di `playTTS()`/`pauseTTS()`/`stopTTS()`),
     `js/media.js` (`wireWakeLockToMediaEl()` baru, dipasang di
     pemutar MP3/MP4 sebaris).
   - **Catatan jujur (batasan yang TIDAK bisa dijamin dari sisi web)**:
     Wake Lock hanya mencegah layar mati **karena timeout otomatis**
     selama tab ini aktif di depan. Kalau pengguna **sendiri** menekan
     tombol kunci layar HP, atau benar-benar pindah/menutup
     aplikasi/browser, sistem operasi HP tetap bisa menghentikan
     suara — ini batasan OS, bukan sesuatu yang bisa "diperbaiki"
     penuh dari web biasa (beda dari aplikasi native). Yang paling
     tahan tetap audio MP3 murni. Wake Lock juga belum didukung
     semua browser HP lama — di situ fiturnya otomatis dilewati
     tanpa error, perilaku sama seperti sebelumnya.

## Update lanjutan (Agustus 2026, tahap 6)

1. **Tag @username / @all di Pengumuman** — administrator sekarang bisa
   menandai pengumuman supaya hanya tampil ke orang tertentu. Ketik `@`
   lalu nama, atau lebih mudah: pilih dari dropdown **"Tandai (@tag)
   untuk"** di form Kirim Pengumuman lalu klik **+ Tambah Tag** (dropdown
   otomatis berisi semua username aktif + pilihan **🌐 Semua Pengguna
   (@all)** paling atas). Tulisan `@nama` **TIDAK ikut tampil** di
   pengumuman yang jadi — hanya dipakai untuk menyaring siapa yang boleh
   melihat, lalu dibuang dari teksnya sebelum disimpan. Kalau tidak ditag
   sama sekali (atau ditag `@all`), pengumuman tampil ke semua orang
   seperti biasa.
   - **Penting**: karena `all` dipakai sebagai kata kunci "semua orang",
     jangan sampai ada username asli bernama persis `all` di Sheet
     Pengguna (Sheet #2) — kalau ada, akan selalu dianggap tag broadcast,
     bukan username itu. Pastikan juga semua username di sana **unik**
     (tidak ada yang kembar) supaya tag @username tidak salah sasaran.
   - Berkas: `apps-script/Code.gs` (kolom `VisibleTo` baru di tab
     Announcements), `js/sync.js` (`pushAnnouncement()` kirim
     `visibleTo`), `js/app.js` (`parseAnnouncementTags()`,
     `announcementVisibleToMe()`, `announcementShouldShow()` — semuanya
     baru; form compose & daftar pengumuman dirombak), `css/style.css`
     (`.announcement-tag-row`).

2. **Ganti Password** (menu ⋮ → **🔑 Ganti Password**) — dua kolom
   "Password baru" & "Ulangi password baru". **Kosongkan keduanya = tidak
   ada perubahan sama sekali** (bukan error, cuma pesan info). Kalau
   diisi, harus diisi **keduanya** dan **harus sama persis**, minimal 4
   karakter, baru disimpan. Password baru berlaku untuk login berikutnya
   di HP/komputer MANA PUN (disimpan lewat Apps Script, terpisah dari
   Sheet Pengguna aslinya supaya Sheet itu tidak perlu diedit manual
   tiap kali ada yang ganti password), dan juga dicadangkan secara lokal
   di perangkat ini supaya tetap bisa login walau lagi offline.
   - **Catatan keamanan** — SAMA seperti password di Sheet Pengguna
     (Sheet #2): disimpan apa adanya (teks biasa), BUKAN keamanan tingkat
     server. Cocok untuk keperluan pribadi/keluarga/jemaat; jangan pakai
     password yang juga dipakai di akun penting lain.
   - Berkas: `apps-script/Code.gs` (tab `PasswordOverrides` baru,
     `readPasswordOverride_()`/`setPasswordOverride_()`), `js/sync.js`
     (`pullPasswordOverride()`/`pushPasswordOverride()`), `js/app.js`
     (`validateLogin()` dirombak supaya cek password pengganti ini
     duluan, `getEffectivePassword()`/`initChangePasswordUI()` baru),
     `index.html` (bagian baru di menu ⋮).
   - **Setelah update ini, JANGAN LUPA**: deploy ulang `Code.gs` (Deploy
     → Manage deployments → ikon pensil → Version: **New version** →
     Deploy) supaya tab `PasswordOverrides` & endpoint barunya aktif —
     kalau lupa, tombol Ganti Password akan selalu gagal menyimpan.

## Update lanjutan (Agustus 2026, tahap 7)

1. **4 URL Rencana Baca (PL 2 Tahun & PB 1 Tahun x 3 bahasa) sudah diisi
   semua** — sebelumnya cuma `pl_ind` yang terisi (lihat "Belum termasuk"
   versi README sebelumnya). Sekarang keempat `gid=` yang dikirim sudah
   dicek satu-satu (fetch langsung ke tiap URL, dicocokkan nama kolomnya)
   dan cocok persis dengan yang sudah dikenali `js/media.js` sebelumnya:
   - `pl_ind` → "Perjanjian Lama 2 Tahun (Indonesia)" — sekarang memakai
     URL `gid=441167880` (tab PL Bahasa Indonesia yang benar; sebelumnya
     memakai URL default tanpa `gid`, yang kebetulan sama karena itu tab
     pertama, tapi sekarang eksplisit).
   - `pb_ind` → "Perjanjian Baru 1 Tahun (Indonesia)" — `gid=1009569139`.
   - `pb_mandarin` → "Perjanjian Baru 1 Tahun (Mandarin)" — `gid=346929572`
     (kolom rentang bacaannya memakai nama kitab Inggris seperti "Matthew
     1:1 - 25", bukan aksara Mandarin — ini otomatis tetap terbaca oleh
     `guessReferenceFromPembacaan()` untuk buka pasalnya, karena fungsi
     itu memang mencari pola huruf Latin + nomor pasal).
   - `pb_inggris` → "Perjanjian Baru 1 Tahun (Inggris)" — `gid=1522606854`.
   - Berkas yang berubah: **`js/config.js`** saja (bagian
     `READING_MEDIA_SHEETS`, label juga dirapikan jadi konsisten
     "... 1/2 Tahun (Bahasa)").
   - **Tidak perlu** ubah `apps-script/Code.gs` atau file lain — cukup
     unggah ulang `js/config.js` (atau seluruh paket) ke hosting Anda.
   - Semua fitur yang Anda minta terkait tombol MP3/MP4/YouTube bulat,
     tombol 🔗 Bagikan link, tampilan ayat+catatan sebaris, dan opsi TTS
     ikut membaca Catatan — **sudah ada semua** dari update-update
     sebelumnya (lihat tahap 3 & 4 di atas), otomatis berlaku juga untuk
     3 rencana baru ini begitu dipilih dari menu 📅 Rencana Baca, tidak
     perlu kerjaan tambahan.

2. **Fitur "Garis Besar / Pokok Alkitab" + 2 baris tambahan di menu
   kitab (Pokok, Peta+Gambar) — lihat "Update lanjutan tahap 8" di
   bawah, SEBAGIAN sudah dikerjakan** (bagian tampil/baca sudah jalan;
   bagian edit-dari-dalam-aplikasi khusus administrator belum).

## Update lanjutan (Agustus 2026, tahap 8) — Pokok Kitab / Garis Besar / Peta+Gambar

Bagian **tampil/baca** dari fitur ini **sudah dikerjakan** (5 fitur utama
di bawah). Bagian **edit dari dalam aplikasi khusus administrator**
**belum** — lihat poin "Belum dikerjakan" di akhir bagian ini.

### 5 fitur utama yang sudah dikerjakan

1. **`js/outlines.js` (berkas BARU)** — fetch + cache (localStorage,
   pola sama seperti `js/media.js`) untuk 3 sheet baru: Pokok Kitab,
   Garis Besar Ayat, Peta+Gambar. Otomatis disembunyikan kalau URL
   sheet-nya kosong, tidak bikin error.
2. **"📌 Pokok Kitab"** — tampil sebagai kotak khusus di **pasal 1**
   tiap kitab (awal mula pembacaan kitab itu), dan ada tombol "📌
   Pokok" tersendiri di daftar pasal (`chapterPickerExtra`, sebelum
   tombol nomor pasal) untuk membukanya kapan saja tanpa harus di
   pasal 1.
3. **"📋 Garis Besar" berjenjang di layar baca** — ringkasan level 1
   (besar) sampai level 3+ (kecil) disisipkan **tepat sebelum ayat
   pertama** dari rentangnya, ditumpuk besar→kecil, persis seperti
   contoh yang diminta:
   ```
   Tentang Penciptaan (Kejadian 1:1-1:20)
   Cerita awal penciptaan (Kejadian 1:1-1:3)
   1  Pada mulanya Allah menciptakan langit dan bumi.
   Ciptaan Pertama (Kejadian 1:2)
   2  Bumi belum berbentuk dan kosong...
   ```
   **Catatan**: untuk saat ini hanya berlaku di tampilan **satu kolom**
   (bukan tampilan berdampingan/multi-bahasa) — cukup wajar karena
   ringkasan per rentang ayat memang 1 alur per bahasa.
4. **"📋 Garis Besar Kitab" (tombol tersendiri sebelum tombol pasal 1)**
   — membuka panel daftar-isi seluruh kitab (semua level ditumpuk
   berjenjang), tiap barisnya bisa diklik untuk langsung lompat ke
   pasal:ayat itu di layar baca.
5. **"🗺️ Peta+Gambar"** — tombol tersendiri di daftar pasal, membuka
   galeri yang bisa digulir berisi semua peta/gambar kitab itu dari
   Google Drive, tiap gambar ada tombol "⬇️ Unduh" sendiri.

Berkas yang **baru dibuat**: `js/outlines.js`.
Berkas yang **diupdate**: `js/config.js` (bagian `OUTLINE_SHEETS` baru),
`js/app.js` (`renderChapterPickerExtra()`, `openBookInfoPanel()`,
`insertOutlineHeaders()`, `renderChapter()`/`renderSingleColumn()`
dirombak sedikit, `hideAllPanels()`), `index.html` (`#chapterPickerExtra`,
`#bookInfoPanel`, `#readerPokokSlot` baru + tag `<script>` untuk
`js/outlines.js`), `css/style.css` (gaya untuk semua elemen baru di
atas).

### Skema 3 Google Sheet yang dipakai (field per sheet)

Nama kolom **tidak peduli huruf besar/kecil**; boleh pakai salah satu
nama alternatif di bawah (aplikasi mengecek semuanya).

**Sheet A — "Pokok Kitab"** (1 baris = 1 kitab + 1 bahasa):

| Book Number | Book Name | Bahasa | Pokok Kitab |
|---|---|---|---|
| 1 | Kejadian | ind | Allah Menciptakan, iblis merusak, manusia Jatuh, dan Tuhan menjanjikan keselamatan |
| 1 | Genesis | eng | God creates, the devil corrupts, man falls, and God promises salvation |

- **Status: URL CSV-nya BELUM ada** (`OUTLINE_SHEETS.pokokKitabCsvUrl`
  di `js/config.js` masih dikosongkan `""`) — sheet baru yang Anda
  buat belum dikirim link publikasi CSV-nya. Setelah dipublikasikan
  ke web (format CSV, sama caranya seperti sheet lain), tempel URL-nya
  ke `pokokKitabCsvUrl` di `js/config.js` (atau kirim ke saya URL-nya).
  Sampai saat itu, tombol "📌 Pokok" otomatis tidak muncul di aplikasi
  (tidak error).

**Sheet B — "Garis Besar Ayat"** (1 baris = 1 rentang ayat + 1
ringkasan, BOLEH bersarang/tumpang tindih untuk level besar vs kecil)
— **sudah diisi URL-nya** (`gid` dari link yang Anda kirim):

| Book Number | Bahasa | Chapter Start | Verse Start | Chapter End | Verse End | Level | Ringkasan |
|---|---|---|---|---|---|---|---|
| 1 | ind | 1 | 1 | 1 | 20 | 1 | Tentang Penciptaan |
| 1 | ind | 1 | 1 | 1 | 3 | 2 | Cerita awal penciptaan |
| 1 | ind | 1 | 2 | 1 | 2 | 3 | Ciptaan Pertama |

- `Level` = 1 (paling besar) → makin besar angkanya makin kecil/detail
  cakupannya. Bebas tambah level 4, 5, dst.
- Sheet ini **kosong saat dicek** (belum ada baris data) — silakan
  mulai isi barisnya kapan saja, aplikasi akan otomatis membacanya
  begitu sheet-nya berisi (cukup sinkron ulang / buka lagi di HP,
  tidak perlu update kode apa pun).

**Sheet C — "Info Kitab" (Peta & Gambar)** (1 kitab boleh > 1 baris)
— **sudah diisi URL-nya**:

| Book Number | Book Name | Link Peta/Gambar (Google Drive) |
|---|---|---|
| 1 | Kejadian | https://drive.google.com/file/d/xxxxx/view |
| 1 | Kejadian | https://drive.google.com/file/d/yyyyy/view |

- Link **harus** link berbagi Google Drive biasa (`.../file/d/ID/...`
  atau `...?id=ID`) — aplikasi otomatis mengubahnya jadi link
  pratinjau gambar & link unduh langsung.
- Sheet ini juga **kosong saat dicek** — silakan mulai isi.

### Belum dikerjakan (perlu tahap terpisah berikutnya)

- **Edit dari DALAM APLIKASI, khusus level administrator** (menyimpan
  langsung ke sheet lewat aplikasi, bukan buka Google Sheet manual) —
  ini perlu tab + endpoint baru di `apps-script/Code.gs` (pola sama
  seperti Pengumuman/Ganti Password yang sudah ada) plus form edit
  yang cuma muncul kalau `isAdministrator()` true. **Untuk sekarang**,
  isi/ubah ketiga sheet di atas langsung di Google Sheet-nya masing-
  masing (sama seperti cara mengisi sheet Alkitab utama) — perubahan
  otomatis muncul di aplikasi setelah sinkron ulang.
- Kalau ingin lanjut ke tahap edit-dari-aplikasi ini, kabari saya,
  sudah ada rancangannya (mengikuti pola Pengumuman yang sudah ada).

## Sudah dikerjakan sebelumnya (jangan dikerjakan ulang)

Supaya tidak dobel, ini daftar hal yang **SUDAH ADA** di paket ini walau
sempat ditanyakan ulang:
- Tombol bulat 🎵/🎬/▶️ MP3/MP4/YouTube yang main **di halaman yang sama**
  (bukan tab baru) — di Rencana Baca, panel Kumpulan Ayat, dan layar baca
  pasal. Lihat "Update lanjutan tahap 3" di atas.
- Tombol 🔗 Bagikan link MP3/MP4/YouTube — Lihat "Update lanjutan tahap 4".
- Opsi TTS "ikut baca Catatan" (`#ttsReadNotesToggle`) — sudah aktif.
- Tombol kecepatan TTS **+ / −**, naik-turun **0.1** (bukan 0.2) — sudah
  sesuai permintaan (`ttsRateDown`/`ttsRateUp` di `js/app.js`).
- Pengumuman hanya tampil ke status **Done** (+ dalam rentang tanggal
  aktif/berakhir) — lihat "Update lanjutan tahap 3".
- Tag **@username / @all** & **Ganti Password** — lihat "Update lanjutan
  tahap 6" di atas.

## Update lanjutan (Agustus 2026, tahap 9) — perbaikan MP3/MP4 Drive, Pokok/Garis Besar tidak tampil, loading awal, & catatan ayat sebaris

1. **MP3/MP4 dari Google Drive akhirnya bisa diputar langsung di halaman**
   — sebelumnya link Drive (`open?id=...`, `file/d/.../view`, dst) dipasang
   LANGSUNG sebagai `src` elemen `<audio>`/`<video>`, padahal itu halaman
   HTML Drive, bukan berkas mentah, jadi browser gagal memutarnya (diam
   saja, tanpa pesan error). Sekarang link Drive ditanam lewat **iframe
   pratinjau resmi Drive** (`.../preview`), yang memang didukung Google
   untuk ditanam di halaman lain dan langsung memutar audio/videonya.
   Link BUKAN Drive (dihosting sendiri/tempat lain) tetap memakai elemen
   `<audio>`/`<video>` asli seperti sebelumnya.
   - Berkas: `js/media.js`, `css/style.css`.

2. **Pokok Kitab / Garis Besar / Peta+Gambar tidak tampil** — dugaan kuat
   penyebabnya: pencocokan kolom & kode bahasa yang sebelumnya HARUS PERSIS
   SAMA (termasuk spasi/tanda baca di judul kolom, dan kode bahasa harus
   persis "ind"/"eng"/dst, bukan "Indonesia"/"Inggris"). Sekarang:
   - Nama kolom dicocokkan LONGGAR (dibuang semua spasi/tanda baca, huruf
     kecil semua) — `findFieldLoose()`.
   - Nilai kolom "Bahasa" diterjemahkan lewat kamus alias umum
     ("Indonesia"/"ID"/"Indo" → `ind`, "Inggris"/"English" → `eng`, dst) —
     `normalizeLangValue()` & `LANG_NAME_ALIASES`.
   - Ada fallback bertingkat: bahasa aktif → bahasa Indonesia → bahasa
     apa saja yang tersedia untuk kitab itu (lebih baik tampil salah
     bahasa daripada tidak tampil sama sekali).
   - **Catatan jujur**: ini perbaikan berdasar dugaan paling mungkin (tidak
     bisa memastikan 100% tanpa mengakses sheet Anda langsung) — kalau
     masih belum tampil setelah update ini, kemungkinan ada sebab lain
     (mis. sheet belum dipublikasikan ulang, atau kolom Book Number kosong).
   - Berkas: `js/outlines.js`.

3. **Loading awal yang membingungkan** — sekarang SETIAP unduhan data
   Alkitab pertama kali (termasuk saat WiFi) menampilkan info singkat dulu
   sebelum loading dimulai: ukuran perkiraan (~51 MB, bisa diubah di
   `CONFIG.BIBLE_DATA_APPROX_SIZE_MB`), kenapa cuma sekali, dan kira-kira
   berapa lama. Tombol menu ⋮ → 🔄 Sinkronkan ulang Alkitab / 📥 Unduh Data
   Alkitab sekarang juga sadar WiFi vs data seluler (`confirmAndSync()`),
   jadi kalau ada data baru di sheet nanti dan Anda sinkron ulang saat
   tidak yakin sedang WiFi, tetap akan diberi tahu dulu.
   - Berkas: `js/app.js`, `js/config.js`.

4. **Catatan ayat: dari jendela/modal → sebaris di bawah ayatnya sendiri**
   — sebelumnya klik ayat (di mana saja pada bloknya) membuka jendela
   melayang yang menutupi ayat-ayat lain ("ketumpuk-tumpuk"), dan lebarnya
   di komputer cuma sebagian layar. Sekarang:
   - **Nomor ayat** jadi tombol bulat — **tekan SEKALI tidak melakukan
     apa-apa** (supaya tidak "salah tekan" waktu menggulir/scroll), **tekan
     DUA KALI** untuk buka/tutup panel catatannya.
   - Panel catatan muncul **sebaris di bawah ayat itu sendiri** (mendorong
     ayat di bawahnya, bukan menutupi) — lebarnya otomatis sama persis
     dengan lebar teks ayat, di HP maupun komputer, tidak perlu diatur
     lebar terpisah lagi.
   - Jendela/modal lama (`#noteModalBackdrop` dkk di `index.html`, dan
     `openNoteModal()`/`closeNoteModal()`/`saveNoteFromModal()`/
     `initNoteModalEvents()` di `js/app.js`) sudah dilepas total, diganti
     `buildInlineNoteCardEl()` / `toggleInlineNote()` /
     `updateVerseNoteBadge()`.
   - Kalau datang dari menu "🗒️ Catatan Saya", panel catatan ayat yang
     dituju langsung terbuka otomatis (tidak perlu tekan dua kali lagi).
   - Berkas: `js/app.js`, `index.html`, `css/style.css`.

## Belum termasuk / perlu info tambahan dari Anda dulu

- ✅ **Data Rencana Baca "PB 1 Tahun" & "PL 2 Tahun" 4 bahasa/tab** —
  SUDAH SELESAI, lihat "Update lanjutan tahap 7" poin 1 di atas.
- ✅ **Fitur "Garis Besar"/Pokok Alkitab per kitab + 2 baris tambahan di
  menu kitab (Pokok, Peta+Gambar)** — bagian TAMPIL/BACA sudah
  dikerjakan, lihat "Update lanjutan tahap 8" di atas. Yang **masih
  belum**: (1) sheet "Pokok Kitab" belum ada URL CSV-nya (perlu
  dipublikasikan & dikirim linknya), (2) edit dari DALAM APLIKASI
  khusus administrator (untuk sekarang, edit ketiga sheet langsung di
  Google Sheet-nya).
- **Notifikasi awal soal unduh data lewat WiFi** — SUDAH ada (lihat
  "Update lanjutan tahap 4", poin 2) — sebelumnya salah tercatat belum
  dikerjakan di versi README ini, sudah diperbaiki.

## Update lanjutan (Agustus 2026, tahap 16) — perbaikan tanda catatan kaki per-kata

Perbaikan atas fitur "catatan kaki per-kata" (`js/footnotes.js`) yang sudah
ada sebelumnya, sesuai contoh tampilan aplikasi Recovery Version resmi yang
dikirim untuk dibandingkan:

1. **Warna biru + area tekan sekarang ikut 1 kata SETELAH tanda**, bukan
   cuma superskrip kecilnya sendiri. Misalnya pada `¹ᵃdaftar`, sebelumnya
   hanya "1a" yang biru & bisa ditekan; sekarang kata "daftar" (sampai
   spasi berikutnya) ikut biru & bisa ditekan juga, tanda maupun katanya
   sama-sama membuka catatan yang sama. Ukuran teks kata itu **tetap
   normal** (bukan ikut mengecil seperti superskrip) supaya gampang
   disentuh di HP. Berlaku otomatis untuk **semua bahasa** yang memakai
   markup `<FR><sup>..</sup><Fr>` di kolom Text — termasuk `rvind` DAN
   `rveng` sekaligus (kode ini tidak dibedakan per bahasa).
   - Berkas: `js/footnotes.js` (`renderVerseTextWithFootnotes()` dirombak），
     `css/style.css` (`.footnote-marker-word` baru).
2. **Catatan yang keluar saat tanda ditekan TIDAK DOBEL lagi.** Sebelumnya,
   menekan satu tanda (mis. "3b") membuka kotak ringkasan kecil TERPISAH
   berisi catatan untuk tanda itu SAJA, padahal di bawahnya sudah ada
   catatan LENGKAP ayat itu (semua nomor & huruf sekaligus) — jadi isinya
   terasa dobel/berulang. Sekarang: catatan LENGKAP ayat langsung tampil
   semua (seperti sebelumnya, tidak dipotong-potong), dan menekan salah
   satu tanda hanya **menggulir & menyorot sebentar** bagian yang cocok
   di dalam catatan lengkap itu — tidak ada kotak isi dobel lagi. Tekan
   tanda yang sama lagi untuk menghapus sorotannya (panel & catatan
   lengkapnya tetap terbuka).
   - Berkas: `js/footnotes.js` (`buildFootnoteEntriesHtml()` baru — tiap
     entri nomor/huruf dibungkus `<div class="footnote-entry"
     data-fn-num=".." data-fn-letter="..">` supaya bisa dituju;
     `setupFootnoteMarkerHandlers()` dirombak total, kotak
     `.inline-note-footnote-focus` yang lama **dihapus**), `js/app.js`
     (`buildInlineNoteCardEl()` — bagian `adminText.innerHTML` sekarang
     memanggil `buildFootnoteEntriesHtml()`), `css/style.css`
     (`.footnote-entry`, `.footnote-entry-highlight` baru, aturan
     `.inline-note-footnote-focus` lama dihapus).
3. **Soal pembacaan suara (Google Voice/TTS) tidak ikut membaca tanda
   ini** — ini **memang disengaja**, bukan bug: TTS selalu membaca
   `v.text` (versi ayat yang SUDAH dibersihkan total dari tanda
   `<FR>...<Fr>`), sedangkan tanda + kata biru yang bisa ditekan itu
   hanya ada di jalur tampilan KEDUA (`v.markedText`) yang terpisah —
   lihat komentar di bagian atas `js/footnotes.js`. Jadi kalau
   dibacakan, "1a" dkk. TIDAK akan terdengar dieja aneh ("satu a") —
   ini sudah berjalan seperti itu sejak `markedText` pertama dibuat,
   tidak ada yang perlu diubah untuk ini.
4. Perlu unggah ulang `js/footnotes.js`, `js/app.js`, `css/style.css`,
   `index.html` (nomor versi `?v=` pada tag `<script>`/`<link>` di
   `index.html` sudah dinaikkan supaya HP/browser tidak memakai
   berkas lama dari cache).

## Update lanjutan (Agustus 2026, tahap 17) — tekan tanda catatan kaki kedua kali sekarang MENUTUP catatan

Perubahan kecil atas perilaku dari tahap 16 di atas, sesuai permintaan
lanjutan setelah dicoba: sebelumnya menekan tanda/kata yang SAMA untuk
kedua kalinya hanya menghapus SOROTANNYA saja (panel catatan lengkap tetap
terbuka). Sekarang menekan tanda/kata yang sama untuk kedua kalinya
**menutup panel catatannya sepenuhnya** (persis seperti menekan dua kali
nomor ayat lalu menekannya dua kali lagi) — jadi: tekan sekali = buka +
lompat ke bagian itu, tekan lagi pada tanda yang sama = tutup. Menekan
tanda LAIN selagi panel terbuka tidak menutup apa-apa, hanya berpindah
sorotan ke bagian catatan yang baru (tidak tutup-buka dari awal).

- Berkas yang diubah: `js/footnotes.js` (`setupFootnoteMarkerHandlers()` —
  `closeJump()` diganti jadi `closePanel()` yang juga menyembunyikan
  `notePanel` & melepas class `note-open`; ditambah `MutationObserver`
  kecil supaya kalau panel ditutup lewat jalur lain — tekan dua kali nomor
  ayat lagi — status "aktif" tandanya ikut disetel ulang, supaya tekan
  tanda yang sama sesudahnya membuka lagi dari awal, bukan malah dianggap
  "tekan kedua kali").
- Berkas lain **tidak berubah isi fiturnya** — `js/app.js`, `css/style.css`
  dari tahap 16 sudah benar dan tetap dipakai apa adanya (blue accent per
  kata, setting ⋮ → "🔵 Warna biru…", parsing `<FR><sup>..</sup><Fr>` dari
  kolom Text, dan TTS yang otomatis melewati tanda ini — semua ini SUDAH
  berfungsi, bukan baru).
- `index.html`: nomor versi `?v=` dinaikkan dari `20260826b` jadi
  `20260826c` supaya HP/browser tidak memakai `js/footnotes.js` versi lama
  dari cache.

### Soal pertanyaan "warna biru dinyalakan terus atau boleh dimatikan?"

Sudah tersedia KEDUANYA sejak tahap 16 — bukan salah satu saja:
- **Default: NYALA** (`footnoteAccentBlue: true` di `js/settings.js`),
  supaya pembaca langsung tahu kata mana yang punya catatan tanpa perlu
  menekan-nekan coba-coba dulu.
- Bisa dimatikan per-pengguna lewat menu ⋮ → "🔵 Warna biru pada tanda
  catatan kaki + kata setelahnya" (`index.html` baris ~371,
  `footnoteAccentToggle`) — kalau dimatikan, tanda & kata itu jadi warna
  teks biasa (`body.footnote-accent-off`, lihat `css/style.css`), tapi
  tetap bisa ditekan seperti biasa (cuma warnanya yang berubah).

Rekomendasi: **biarkan default NYALA.** Alasannya persis seperti yang
Anda amati sendiri — tanpa warna, pembaca tidak akan tahu kata mana saja
yang sebenarnya punya catatan penjelasan, jadi fitur catatan kaki jadi
nyaris tak berguna kalau warnanya dimatikan dari awal. Opsi mematikannya
tetap disediakan untuk pembaca yang merasa warna biru mengganggu fokus
membaca teks utama, tapi bukan sebagai pengaturan bawaan.

## Struktur berkas

```
bible-app/
├── index.html           struktur halaman
├── css/style.css         tampilan (tema, responsif, kontrol lebar, animasi ayat, modal catatan, toast progres)
├── js/config.js          URL Google Sheet, Apps Script, bahasa, ukuran huruf — EDIT INI
├── js/books.js           daftar 66 kitab + alias singkatan
├── js/csv.js             pengubah CSV → objek ayat / objek pengguna
├── js/db.js              lapisan penyimpanan lokal (IndexedDB): ayat + pengguna
├── js/sync.js            komunikasi ke Google Apps Script (simpan/ambil catatan, progres, pengaturan, log, pengumuman)
├── js/levels.js          jenjang level pengguna (administrator…inti) + helper hak akses
├── js/activitylog.js     pencatat log aktivitas (menu, pencarian, OS, IP perkiraan)
├── js/notes.js           catatan pribadi per ayat (lokal + gabung dengan data server)
├── js/settings.js        pengaturan pribadi per pengguna, mis. animasi progres membaca (lokal + server)
├── js/plans.js           definisi rencana baca, pembuatan jadwal, penyimpanan progres
├── js/media.js           bacaan bersuara harian (MP3/MP4/YouTube per rentang ayat) + rencana baca darinya
├── js/outlines.js        Pokok Kitab / Garis Besar berjenjang / Peta+Gambar per kitab (fetch+cache+helper tampilan)
├── js/curhat.js          Curhat Domba & Gembala (panel terpisah)
├── js/aichat.js          AI Chat Gembala + tab "🕘 Riwayat" khusus premium (panel terpisah)
├── js/app.js             logika utama aplikasi (login, baca, cari, rencana baca, TTS, progres membaca, dll)
├── apps-script/Code.gs         backend Google Apps Script untuk sinkronisasi (opsional, lihat di atas)
├── apps-script/CurhatCode.gs   backend TERPISAH untuk Curhat Domba & Gembala (Sheet & deployment sendiri)
├── apps-script/AiChatCode.gs   backend TERPISAH untuk AI Chat Gembala + Riwayat premium (Sheet & deployment sendiri)
├── sample-data.csv       contoh data Alkitab untuk uji coba lokal
├── sample-users.csv      contoh data pengguna untuk uji coba lokal
└── vercel.json           konfigurasi hosting Vercel
```

## Update lanjutan (Agustus 2026, tahap 10) — pencarian catatan, ganti password terpusat, Last_Read_Day

1. **Pencarian "Ayat & Catatan" sekarang benar-benar mencari di kolom Note
   Sheet Alkitab** — sebelumnya opsi "2. Ayat & Catatan" salah memakai
   fungsi pencarian **catatan pribadi** (padahal itu seharusnya untuk
   opsi "3. Catatan Saya"), jadi hasil catatannya kosong/salah kalau
   belum pernah menulis catatan pribadi. Sekarang "Ayat & Catatan"
   mencari di field **Note** yang datang dari Sheet Alkitab sendiri
   (kolom terakhir: `Bahasa;Verse ID;Book Name;Book Number;Chapter;
   Verse;Text;Note` — yang tampil sebagai badge 📝 saat membaca), ikut
   disaring bahasa & Perjanjian Lama/Baru sama seperti pencarian ayat.
   "3. Catatan Saya" TIDAK berubah — tetap mencari catatan pribadi Anda
   sendiri seperti sebelumnya.
   - Berkas: `js/app.js` (`runKeywordSearch()` dirombak, `searchInBibleNotes()`
     baru), `index.html` (label opsi diperjelas jadi "Ayat & Catatan (Alkitab)").

2. **"Kumpulan Ayat" — sudah lebih dulu ada, dicek ulang & dikonfirmasi
   sesuai permintaan**: daftar kumpulan sudah terurut terbaru dulu
   (`renderCollectionsPanel()`, diurutkan dari `createdAt`), dan tombol
   hapus (🗑️) per kumpulan sudah ada (`deleteCollection()`). Tidak ada
   perubahan kode di bagian ini — tidak dikerjakan ulang.

3. **Ganti Password sekarang menyimpan LANGSUNG ke Sheet Pengguna asli
   (satu sumber data yang sama dengan login)** — sebelumnya password baru
   disimpan di tab terpisah "PasswordOverrides" pada Sheet Sinkron. Sesuai
   permintaan, `apps-script/Code.gs` sekarang punya `USER_DB_ID` (ID
   Spreadsheet Sheet Pengguna) di bagian atas file — begitu diisi, Ganti
   Password langsung membaca/menulis kolom **Password** pada Sheet
   Pengguna itu sendiri (dicari lewat nama header & baris username,
   longgar terhadap variasi spasi/huruf besar-kecil). Kalau `USER_DB_ID`
   dikosongkan atau gagal dibuka (mis. sheet dihapus/izin beda akun),
   otomatis kembali memakai tab "PasswordOverrides" lama supaya fitur
   tetap jalan.
   - Berkas: `apps-script/Code.gs` (`USER_DB_ID`, `BIBLE_DB_ID`,
     `getUserSheet_()`, `findUserColumn_()`, `findUserRow_()` baru;
     `readPasswordOverride_()`/`setPasswordOverride_()` dirombak).
   - **PENTING — WAJIB DILAKUKAN AGAR INI AKTIF**: buka
     `apps-script/Code.gs` di Apps Script editor Anda, deploy ulang
     lewat **Deploy → Manage deployments → ikon pensil → Version: New
     version → Deploy** (URL tetap sama, tidak perlu ganti di
     `config.js`). Skrip Apps Script Anda (akun yang menjalankan "Execute
     as: Me") juga harus punya akses EDIT ke Spreadsheet `USER_DB_ID` itu
     (biasanya otomatis kalau pemilik sheet-nya akun yang sama).

4. **Kolom tambahan Sheet Pengguna ("Login awal") mulai dikenali
   aplikasi**, mengikuti contoh xlsx yang dikirim: `Plan, Start_Date,
   Last_Read_Day, Bahasa, Language, No Efata ID, Saudara/i,
   Digembalakan, PB_Aktif, PB_Tanggal_Mulai, PB_Bahasa, PB_History,
   PL_Aktif, PL_Tanggal_Mulai, PL_Bahasa, PL_History` — semuanya
   opsional, dibaca longgar (nama kolom boleh pakai spasi atau
   underscore), disimpan di `user.extra.*` untuk dipakai fitur
   berikutnya (belum ada tampilan UI khusus untuk field ini, hanya
   dibaca/disiapkan dulu — beri tahu field mana yang mau ditampilkan
   di mana kalau mau dilanjutkan).
   - **Pembacaan terakhir (Last_Read_Day) SUDAH aktif**: setiap kali
     membuka pasal baru, aplikasi mengirim label ringkas (mis.
     "Kejadian 1") ke kolom `Last_Read_Day` pada Sheet Pengguna asli
     (lewat endpoint baru `last_read` di Code.gs) — best-effort, diam-diam
     diabaikan kalau offline/kolom belum ada di sheet Anda.
   - Berkas: `js/csv.js` (`normalizeUserRecord()` dirombak), `js/app.js`
     (`pushLastReadPosition()` baru, dipanggil dari `renderChapter()`),
     `js/sync.js` (`pushLastRead()` baru), `apps-script/Code.gs`
     (`saveLastRead_()` baru, tipe `last_read` di `doPost()`),
     `sample-users.csv` (header diperbarui jadi contoh lengkap).
   - **Catatan**: kolom `Username` pada Sheet Pengguna Anda **harus ada di
     kolom paling kiri yang dikenali sebagai header "Username"** (posisi
     kolom bebas, dicari lewat nama header, bukan harus kolom A) —
     kalau Sheet Anda memakai nama header persis seperti daftar di atas,
     semuanya otomatis ketemu tanpa perlu ubah apa pun lagi.

## Update lanjutan (Agustus 2026, tahap 11) — gabung tombol unduh/sinkron, Pokok Kitab & Garis Besar ikut sinkron

1. **Tombol menu ⋮ "🔄 Sinkronkan ulang Alkitab" & "📥 Unduh Data Alkitab"
   digabung jadi SATU tombol.** Sebelumnya dua tombol ini memanggil fungsi
   yang persis sama begitu ada data lokal (kondisi normal) — hanya beda
   teks dialog kalau data lokal benar-benar kosong. Sekarang cuma ada satu
   tombol `#resyncBtn`, teksnya otomatis berganti antara "🔄 Sinkronkan
   ulang Alkitab" (kalau sudah ada data) dan "📥 Unduh Data Alkitab" (kalau
   belum ada data sama sekali) lewat `updateResyncBtnLabel()`.
   - Berkas: `index.html` (tombol `#downloadBibleBtn` dihapus), `js/app.js`
     (`updateResyncBtnLabel()` baru dipanggil dari `afterDataReady()`;
     handler klik `#resyncBtn` disatukan).
2. **Pokok Kitab / Garis Besar / Peta+Gambar sekarang ikut disinkronkan**
   setiap kali tombol sinkron/unduh Alkitab di atas ditekan — sebelumnya
   fungsi `resyncAllOutlineSheets()` di `js/outlines.js` sudah ada tapi
   belum dipanggil dari mana pun (ketiga sheet ini hanya diambil sekali
   lalu di-cache permanen, tidak pernah otomatis diperbarui). Kalau salah
   satu dari ketiga sheet gagal diambil, sinkron Alkitab utama tetap
   dianggap berhasil (tidak saling menggagalkan).
   - Berkas: `js/app.js` (`syncFromServer()` memanggil
     `resyncAllOutlineSheets()` di akhir proses).
3. **Perkiraan ukuran unduhan di dialog dinaikkan dari 51 MB → 60 MB**
   (`CONFIG.BIBLE_DATA_APPROX_SIZE_MB`) untuk memperhitungkan gabungan
   ketiga sheet Pokok Kitab/Garis Besar/Peta&Gambar yang sekarang ikut
   disinkronkan dan bisa terus bertambah isinya. Naikkan lagi angka ini
   di `js/config.js` kalau total ukurannya membengkak jauh dari itu.
   - Berkas: `js/config.js`.

## Update lanjutan (Agustus 2026, tahap 12) — Riwayat AI Chat khusus pengguna Premium

1. **Kolom BARU "Tipe" di Sheet Pengguna (Sheet #2)** — dipakai untuk
   menandai pengguna sebagai `premium` atau biasa. SENGAJA ditambahkan
   sebagai kolom baru di Sheet Pengguna yang **sudah ada**, bukan Sheet
   terpisah, supaya status premium tidak tersebar di 2 tempat berbeda.
   Kosong/nilai lain = pengguna biasa (tidak error).
   - Berkas: `js/csv.js` (`parseUserTypeField()`, dipanggil dari
     `normalizeUserRecord()` — hasilnya disimpan sebagai `userType` di
     objek akun lokal), `js/levels.js` (`currentUserType`,
     `isPremiumUser()` — diisi dari `resolveCurrentUserLevels()`, sama
     seperti `currentUserLevels`), `sample-users.csv` (contoh kolom
     `Tipe`, akun `admin` dicontohkan sebagai `premium`).
2. **Tab BARU "🕘 Riwayat" di dalam panel AI Chat Gembala — HANYA
   tampil untuk pengguna premium.** Menampilkan daftar sesi percakapan
   lama (sesi terbaru di atas), tiap sesi bisa dibuka/tutup dan berisi
   daftar pasangan pertanyaan-jawaban lengkap dengan referensi/sumber
   yang dipakai tiap jawaban (ayat, catatan kaki, Pokok Kitab/Garis
   Besar, atau pengetahuan tambahan AI) — persis format sumber yang
   sudah ada di layar percakapan biasa. Read-only (tidak bisa
   melanjutkan percakapan lama dari sini).
   - Berkas: `js/aichat.js` (`renderAiChatHistoryView()`,
     `AI_CHAT_SOURCE_KIND_LABEL` dipindah ke lingkup modul supaya
     dipakai bersama oleh layar percakapan & Riwayat).
3. **Tombol BARU "🆕 Percakapan Baru"** di header panel AI Chat —
   tersedia untuk SEMUA pengguna yang boleh membuka AI Chat (bukan cuma
   premium). Mengosongkan layar percakapan yang sedang tampil & memulai
   SessionID baru untuk giliran tanya-jawab berikutnya. Riwayat LAMA
   yang sudah tersimpan **tidak ikut terhapus** — kalau ingin benar-benar
   memulai dari nol tanpa riwayat menumpuk di satu sesi panjang, tinggal
   tekan tombol ini kapan saja; kalau tidak ingin menyimpan riwayat sama
   sekali, cukup jangan berstatus premium (lihat poin 4).
   - Berkas: `js/aichat.js` (`startNewAiChat()`, `genAiChatSessionId()`).
4. **Sheet BARU & TERPISAH "AiChatHistory"** — dibuat OTOMATIS oleh
   `apps-script/AiChatCode.gs` di Spreadsheet yang sama tempat skrip itu
   terpasang (pola yang sama seperti tab `Curhat`/`CurhatRatings` di
   `apps-script/CurhatCode.gs`), TIDAK perlu dibuat manual. Kolom: `ID |
   Username | SessionID | Waktu | Pertanyaan | Jawaban | Sumber` (kolom
   Sumber berisi teks JSON daftar referensi). Pengguna **biasa (bukan
   premium) TIDAK disimpan riwayatnya sama sekali** — dicek ULANG di
   server (bukan cuma di aplikasi) sebelum menulis ke Sheet ini, supaya
   tidak bisa "diakali" dari sisi browser.
   - Berkas: `apps-script/AiChatCode.gs` (`getAiChatHistorySheet_()`,
     `isPremiumUser_()`, endpoint baru `ai_chat_save` &
     `ai_chat_history`, dipanggil lewat `AiChatSync.saveHistory()` /
     `AiChatSync.getHistory()` di `js/aichat.js`).
   - **Kalau AiChatCode.gs sudah pernah di-deploy sebelumnya**: tempel
     ulang SELURUH isi file terbaru ke editor Apps Script Anda, lalu
     "Deploy" → "Manage deployments" → ikon pensil → Version: "New
     version" → Deploy (JANGAN buat deployment baru, supaya URL yang
     sudah ada di `CONFIG.AI_CHAT_APPS_SCRIPT_URL` tetap berlaku). Tab
     `AiChatHistory` akan otomatis dibuat sendiri saat pertama kali ada
     yang menyimpan riwayat — tidak perlu dibuat manual.

## Update lanjutan (Agustus 2026, tahap 13) — progres unduhan pakai MB asli & batas Mode Tamu diatur dari Sheet

1. **Progres unduhan data Alkitab sekarang pakai MB SUNGGUHAN** (mis.
   "📥 Mengunduh data Alkitab… 12.4 MB dari ~60 MB"), bukan cuma
   persentase buta seperti sebelumnya. Diambil dari byte ASLI yang
   sudah diterima browser saat mengunduh (streaming), bukan tebakan.
   Kalau server tidak mengirim `Content-Length` (jarang), aplikasi
   jatuh balik memakai perkiraan ukuran (lihat poin 3 di bawah) sebagai
   pembagi, supaya angka "dari ... MB"-nya tetap masuk akal. Tahapan
   progress bar sekarang: 0–40% unduh mentah, 40–95% baca+simpan ke
   perangkat, 95–100% sinkron Pokok Kitab/Garis Besar/Peta.
   - Berkas: `js/app.js` (`fetchTextWithProgress()` — fungsi baru,
     `syncFromServer()` — diubah untuk pakai fungsi ini alih-alih
     `fetchWithTimeout()` + `res.text()`).
2. **Batas Mode Tamu (10x/perangkat/hari, 100x gabungan/hari) sekarang
   diatur dari Google Sheet, bukan hardcode di `js/config.js` lagi.**
   Administrator tinggal buka tab **"Setup"** di Google Sheet sinkron
   (Sheet yang sama tempat `apps-script/Code.gs` terpasang), cari 2
   baris key `guest_daily_limit_per_device` & `guest_total_daily_limit`
   (dibuat otomatis dengan isi 10 & 100 saat tab Setup pertama kali
   dipakai), lalu **ubah angka di kolom "Isi" langsung** — TIDAK perlu
   ubah kode apa pun atau deploy ulang. Angka baru langsung berlaku di
   pemakaian berikutnya (dibaca server tiap kali endpoint
   `guest_search` dipanggil).
   - Kolom `Tampil` kedua baris ini sengaja diisi `FALSE` supaya TIDAK
     ikut muncul di panel "ℹ️ Info Kami" pengunjung (yang memang khusus
     info publik) — tapi tetap terbaca sebagai pengaturan aplikasi.
   - **Keamanan diperketat**: sebelumnya batas dikirim dari BROWSER ke
     Apps Script lewat parameter URL (bisa saja diubah orang yang iseng
     lewat DevTools). Sekarang Apps Script SELALU membaca angka dari
     tab Setup sebagai sumber utama (`getSetupNumber_()`); nilai dari
     browser hanya dipakai sebagai cadangan kalau tab Setup entah kenapa
     tidak terbaca sama sekali.
   - Berkas: `apps-script/Code.gs` (baris default baru di `getSheet_()`
     untuk tab Setup, `readSetupRaw_()`, `getSetupNumber_()`, endpoint
     `guest_search` diubah untuk memakai keduanya, endpoint BARU
     `app_setup`), `js/config.js` (komentar diperbarui — nilai
     `GUEST_DAILY_LIMIT_PER_DEVICE`/`GUEST_TOTAL_DAILY_LIMIT` sekarang
     status CADANGAN saja), `js/guest.js` (komentar diperbarui,
     perilaku pengecekan/pencatatan tidak berubah — tetap lewat endpoint
     `guest_search` yang sama).
3. **Perkiraan ukuran unduhan (60 MB) juga bisa diubah dari Sheet yang
   sama** — key `bible_data_approx_size_mb` di tab Setup (dibuat
   otomatis, isi awal `60`), dipakai di dialog "Unduh Data Alkitab
   (Pertama Kali)" DAN sebagai pembagi progres MB di poin 1 kalau
   server tidak mengirim `Content-Length`. `CONFIG.BIBLE_DATA_APPROX_SIZE_MB`
   di `js/config.js` sekarang juga status CADANGAN saja (dipakai kalau
   Apps Script tidak bisa dihubungi).
   - Berkas: `js/app.js` (`getEffectiveBibleSizeMb()`,
     `fetchRemoteAppSetup_()` — fungsi baru, dipanggil dari
     `syncFromServer()` & `showBibleSyncPrompt()` yang sekarang `async`).
4. **Kalau Code.gs sudah pernah di-deploy sebelumnya**: tempel ulang
   SELURUH isi file terbaru ke editor Apps Script Anda, lalu "Deploy" →
   "Manage deployments" → ikon pensil → Version: "New version" → Deploy
   (JANGAN buat deployment baru). Tab "Setup" yang sudah ada akan
   otomatis ditambah baris pengaturan baru di atas HANYA kalau tab itu
   belum pernah ada sama sekali (tab yang sudah ada isinya TIDAK
   ditimpa) — kalau tab "Setup" Anda sudah ada dari update sebelumnya
   (fitur "Info Kami"), tambahkan 3 baris baru itu SENDIRI secara manual
   di Sheet (Key | Label | Isi | Tampil):
   - `guest_daily_limit_per_device` | (bebas) | `10` | `FALSE`
   - `guest_total_daily_limit` | (bebas) | `100` | `FALSE`
   - `bible_data_approx_size_mb` | (bebas) | `60` | `FALSE`

## Update lanjutan (Agustus 2026, tahap 14) — Daftar Akun Baru + persetujuan administrator, dan lonceng notifikasi pencarian harian

1. **Tombol BARU "📝 Daftar Akun Baru" di layar Masuk** — siapa saja
   (tanpa login) bisa mendaftar sendiri: Username (wajib), Nama
   (opsional), Password (default terisi `123`, boleh diganti sendiri).
   Ada peringatan tertulis di formulir bahwa password **terlihat oleh
   administrator** (sama seperti semua password di Sheet Pengguna ini
   apa adanya, lihat catatan keamanan di bagian awal README) — jangan
   pakai password yang sama dengan akun bank/email.
   - Akun BARU **langsung ditulis ke Sheet Pengguna asli** lewat Apps
     Script (endpoint baru `type=signup`), TAPI kolom **"Approved"**
     otomatis terisi `FALSE` — akun ini **BELUM BISA dipakai untuk
     masuk** sampai administrator menyetujuinya (lihat poin 2). Kalau
     password benar tapi akun belum disetujui, layar Masuk menampilkan
     pesan khusus ("...menunggu persetujuan administrator..."), BUKAN
     pesan generik "Username/password salah" — supaya orangnya tahu
     harus menunggu, bukan mengira lupa password.
   - Kolom **"Approved"** & **"TanggalDaftar"** dibuat OTOMATIS di
     Sheet Pengguna kalau belum ada sama sekali (dicari lewat nama
     header, longgar terhadap variasi penulisan, sama seperti kolom
     lain di aplikasi ini) — **tidak perlu menambah kolom manual**.
     Akun LAMA (sebelum kolom ini ada / selnya kosong) **otomatis
     tetap dianggap disetujui** (approved=true) — pembaruan ini TIDAK
     mengunci siapa pun yang sudah bisa login sebelumnya.
   - Berkas: `apps-script/Code.gs` (`signupUser_()`, `ensureUserColumn_()`,
     `parseApprovedField_()`, endpoint `type=signup` di `doPost()`),
     `js/csv.js` (`normalizeUserRecord()` — field baru `approved` &
     `signupDate`, `parseApprovedField()`), `js/app.js`
     (`validateLogin()` — mengembalikan `{pendingApproval:true}` kalau
     password benar tapi belum disetujui; kalau ditemukan status belum
     disetujui, sekali coba sinkron ulang dulu — barangkali baru saja
     disetujui admin tapi data lokal di HP itu belum sempat
     diperbarui), `js/signup.js` (BARU — modul `Signup`, panel/form-nya
     di `index.html` `#signupOverlay`), `css/style.css` (`.signup-*`).

2. **Panel BARU "🗂️ Kelola Pengguna" di menu ⋮ — khusus administrator**
   (sama pola gating-nya dengan "📊 Log Aktivitas": `hidden` di HTML,
   ditampilkan lewat `updateLevelGatedMenus()` kalau `isAdministrator()`).
   Menampilkan SEMUA akun dari Sheet Pengguna (Username, Nama, Level,
   status Approved, TanggalDaftar) — yang **belum disetujui ditaruh
   paling atas** supaya cepat ditindaklanjuti. Administrator tinggal
   tekan tombol **"✅ Setujui"** (atau "Batalkan" untuk mencabut
   persetujuan kapan saja) di baris akun yang dimaksud.
   - Berkas: `apps-script/Code.gs` (`setUserApproved_()`,
     `readAllUsersForAdmin_()`, endpoint `type=admin_users_list` di
     `doGet()` & `type=user_approve` di `doPost()`), `js/signup.js`
     (BARU — modul `UserApproval`, panelnya di `index.html`
     `#userApprovalOverlay`), `index.html` (tombol `#userManageBtn` di
     `#moreMenu`), `js/app.js` (`updateLevelGatedMenus()` mengatur
     `hidden` tombol ini), `css/style.css` (`.user-approval-*`).
   - **Catatan keamanan yang sama seperti fitur admin lain di aplikasi
     ini** (Log Aktivitas dkk.): siapa yang BOLEH membuka panel ini
     dicek di SISI APLIKASI (`isAdministrator()`), bukan otentikasi
     tingkat server — cukup untuk keperluan pribadi/keluarga/jemaat,
     bukan untuk data benar-benar rahasia.

3. **Lonceng BARU "🔔" di header — pengganti ikon "+" yang sebelumnya
   tidak berfungsi** — HANYA tampil untuk administrator. Menunjukkan
   badge angka = jumlah PENCARIAN AYAT hari ini (gabungan pengguna yang
   sudah login, dihitung dari tab "ActivityLog" Menu="Pencarian", +
   Mode Tamu, dihitung dari tab "GuestUsage"). Klik lonceng membuka
   panel kecil berisi rincian (jumlah login vs jumlah tamu). Disegarkan
   otomatis tiap 5 menit selagi administrator sedang login, dan tiap
   kali panelnya dibuka.
   - Berkas: `apps-script/Code.gs` (`readSearchStatsToday_()`, endpoint
     `type=search_stats_today` di `doGet()`), `js/adminbell.js` (BARU —
     modul `AdminBell`), `index.html` (`#adminBellBtn`,
     `#adminBellBadge`, `#adminBellPanel` di header), `js/app.js`
     (`updateLevelGatedMenus()` memanggil `AdminBell.refreshVisibility()`),
     `css/style.css` (`.admin-bell-*`).

4. **Kalau Code.gs sudah pernah di-deploy sebelumnya**: tempel ulang
   SELURUH isi file terbaru ke editor Apps Script Anda, lalu "Deploy" →
   "Manage deployments" → ikon pensil → Version: "New version" →
   Deploy (JANGAN buat deployment baru). Kolom "Approved" &
   "TanggalDaftar" di Sheet Pengguna akan ditambahkan OTOMATIS sendiri
   saat pertama kali ada yang mendaftar lewat "📝 Daftar Akun Baru" atau
   saat administrator pertama kali menekan "✅ Setujui"/"Batalkan" di
   panel "🗂️ Kelola Pengguna" — **tidak perlu menambah kolom manual**.
5. **Catatan soal kecepatan tampil akun baru**: Sheet Pengguna
   dipublikasikan sebagai CSV publik (`USERS_SHEET_CSV_URL` di
   `js/config.js`) yang Google perbarui otomatis beberapa saat setelah
   Sheet-nya berubah (biasanya dalam hitungan menit, bukan instan). Jadi
   setelah administrator menekan "✅ Setujui", pengguna yang bersangkutan
   mungkin perlu **coba masuk lagi sesaat kemudian**, atau administrator
   bisa memintanya menekan menu ⋮ → "👥 Sinkronkan ulang daftar
   pengguna" di HP-nya supaya langsung ketemu tanpa menunggu.

## Update lanjutan (Agustus 2026, tahap 15) — AI Chat: sapaan nama pengguna (bukan "Gembala") + kutip data Kidung

1. **AI Chat Gembala sekarang menyapa pengguna dengan NAMANYA SENDIRI**,
   bukan selalu "Gembala". Dipakai kolom **"Nama"** (displayName) +
   kolom **"Saudara/i"** yang SUDAH ADA di Sheet Pengguna (isi persis
   `Saudara` atau `Saudari` per akun) — kalau kolom itu masih kosong
   untuk akun tertentu, AI jatuh balik ke sapaan netral "Saudara/i
   {Nama}" (tetap pakai nama, tidak menebak jenis kelamin sembarangan).
   Nama fitur tetap "AI Chat Gembala" (karena memang ditujukan untuk
   membantu gembala/pemimpin jemaat menyiapkan jawaban), tapi sapaan ke
   pengguna yang sedang login sekarang pribadi.
   - **Supaya sapaan ini muncul**: isi kolom **Saudara/i** di Sheet
     Pengguna untuk tiap akun (`Saudara` untuk pengguna pria, `Saudari`
     untuk pengguna wanita). Kolom ini TIDAK wajib diisi — akun yang
     belum diisi tetap jalan, hanya sapaannya netral "Saudara/i".
   - Berkas: `js/config.js` (`AUTH_SAUDARA_KEY` — BARU), `js/app.js`
     (`currentUserSaudara` — variabel BARU, diisi dari `match.saudara`
     saat login/kunjungan berikutnya, dihapus saat logout — pola sama
     persis seperti `currentUserDisplay`), `js/aichat.js`
     (`AiChatSync.ask()` & `handleAiChatAsk()` sekarang mengirim
     `displayName`+`saudara` ke backend), `apps-script/AiChatCode.gs`
     (`sapaanInstruction` — BARU, disisipkan ke `systemInstruction`
     yang dikirim ke Gemini; label `PERTANYAAN GEMBALA:` diganti jadi
     `PERTANYAAN:` supaya tidak ikut "menyugesti" model memanggil
     penanya "Gembala").

2. **AI Chat sekarang IKUT membaca data Kidung/Nyanyian Pujian**
   (Sheet yang sama dipakai fitur "🎵 Kidung", lihat `js/kidung.js`),
   bukan cuma Alkitab. Pertanyaan yang menyinggung judul/isi syair
   kidung akan otomatis mencari kidung yang cocok (pakai
   `searchKidungFull()` yang sudah ada — SAMA fungsi yang dipakai
   kotak cari kidung biasa) dan menyertakan **nomor kidung/suplemen
   ASLI-nya persis apa adanya** (mis. "Kidung No. 095" / "Suplemen No.
   12") sebagai bagian konteks yang dikirim ke AI, dengan instruksi
   tegas supaya AI **menyebut nomor itu APA ADANYA** (tidak boleh
   mengarang nomor sendiri) ketika kidung itu relevan dengan jawaban.
   Maksimal 5 kidung paling relevan per pertanyaan disertakan, sama
   seperti pembatasan jumlah ayat/catatan yang sudah ada, supaya
   konteks yang dikirim ke Gemini tidak membengkak.
   - Kidung yang disertakan juga otomatis ikut muncul di daftar
     "sumber" di bawah jawaban AI (sama seperti sumber ayat/catatan
     lain), jadi pengguna bisa lihat kidung mana saja yang dipakai AI.
   - Berkas: `js/aichat.js` (`gatherAiChatContext()` — blok BARU
     memanggil `searchKidungFull()`, menghasilkan `context.kidung` &
     `context.kidungSources`), `apps-script/AiChatCode.gs` (destructure
     `context.kidung`, ditambahkan ke `contextText` sebagai blok
     "KIDUNG/NYANYIAN PUJIAN YANG DITEMUKAN", `systemInstruction`
     diperbarui menyebut sumber ini juga).
   - **Prasyarat**: `CONFIG.KIDUNG_SHEET_CSV_URL` di `js/config.js`
     harus sudah diisi & data Kidung sudah pernah disinkron ke
     perangkat (menu 🎵 Kidung) — kalau belum, blok ini otomatis kosong
     dan AI Chat tetap jalan seperti biasa (Alkitab saja), TIDAK error.

3. **Kalau AiChatCode.gs sudah pernah di-deploy sebelumnya**: tempel
   ulang SELURUH isi file terbaru ke editor Apps Script, lalu "Deploy"
   → "Manage deployments" → ikon pensil → Version: "New version" →
   Deploy (JANGAN buat deployment baru). Tidak ada kolom Sheet baru
   yang WAJIB ditambahkan untuk update ini — kolom "Saudara/i" memang
   sudah ada di rancangan Sheet Pengguna dari awal.

### Belum dikerjakan (di luar cakupan update ini) — usul submenu baru "Cek Referensi Ayat Kidung"

Menu **"🔎 Verifikasi Bahasa Ayat"** yang SUDAH ADA (khusus
administrator, lihat `js/langcheck.js`) tujuannya BEDA dari yang
diminta: menu itu mengecek apakah teks ayat Alkitab sudah sesuai
kode bahasanya (mis. baris berkode "ind" ternyata isinya Inggris) —
bukan mencari ayat Alkitab yang paling mendekati isi syair kidung.

Permintaan "cek isi kidung ini paling mendekati ayat Alkitab mana"
(mis. potongan syair yang sudah dibersihkan dari tanda pemisah suku
kata, seperti `Mu-lia ba-gi Al-lah` → `Mulia bagi Allah`, lalu dicari
ayat Alkitab yang paling relevan) BELUM dikerjakan di update ini —
ini pekerjaan terpisah & lebih besar karena:
- Pembersihan tanda hubung suku kata di kolom `teks` (mis.
  `Mu-lia ba-gi Al-lah` → `Mulia bagi Allah`) — bagian termudah,
  tinggal fungsi teks biasa.
- Pencarian ayat "paling mendekati" makna (bukan sekadar kata yang
  sama persis) baru bisa akurat kalau dibantu AI (Gemini), karena
  syair kidung jarang mengutip ayat kata-per-kata — jadi perlu
  endpoint Apps Script baru yang memanggil Gemini per potongan syair
  (maks. 1 bait dibagi 2, sesuai permintaan), lalu hasilnya
  ditampilkan ke administrator untuk DIKONFIRMASI manual (bukan
  otomatis ditulis ke Sheet), supaya tidak ada referensi ayat yang
  salah tersimpan tanpa dicek.
- Perlu panel/submenu BARU di dalam "🔎 Verifikasi Bahasa Ayat" (atau
  panel admin terpisah) untuk memilih kidung → tampilkan tiap
  potongan syair → tombol "🤖 Cari Ayat Terdekat" → tampil usulan ayat
  dari AI + tingkat keyakinan, mengikuti pola tombol "🤖 Tanya AI"
  yang sudah ada di `js/langcheck.js` untuk kasus serupa (konfirmasi
  AI per baris, bukan otomatis).

---

## 🆕 UPDATE 29 Agu 2026 — Menu "👶 Kidung Anak" (versi pertama/MVP)

### Apa yang ditambahkan
Menu **🎵 Kidung** yang sudah ada sekarang punya 1 tombol baru:
**"👶 Kidung Anak"**, disebelah tombol "🔍 Cari" / "📋 Daftar Semua" di
layar depan Kidung (`renderKidungHome()`). Menekannya membuka daftar
lagu anak-anak (kartu accordion: Syair, Kunci+Lirik, Notasi Angka,
Kunci+Notasi+Lirik, Video, MP3, Pengarang, Gambar Referensi — sama
persis modelnya dengan app standalone "Kidung Anak-Anak" yang sudah
jalan di kidungindo.blogspot.com/p/lagu-anak-anak.html), lengkap
dengan transpose kunci, ukuran teks, cari + kategori, dan tombol
**"← Kembali ke Kidung"** untuk balik ke menu Kidung Umum (nomor
bernomor) seperti semula.

### Filosofi perubahan: SEMUA ADITIF, TIDAK ADA YANG DIROMBAK
- `js/kidung.js`, `js/kidung-ui.js` (KECUALI 1 blok kecil di bawah),
  `css/style.css`, dan `apps-script/Code.gs` **TIDAK DIUBAH SAMA SEKALI**
  bentuk/kodenya — supaya tampilan & perilaku menu Kidung yang sudah
  bagus (HP maupun komputer) tetap 100% sama seperti sebelumnya.
- File **BARU** (tidak pernah ada sebelumnya):
  - `js/kidung-anak.js` — seluruh mesin (fetch Sheet, parser CSV,
    transpose kunci, render notasi angka, kunci+lirik, kunci+notasi+
    lirik gabungan, kartu accordion) dibungkus di `window.KidungAnak`
    (IIFE) supaya nama fungsi seperti `parseCSV`/`escapeHtml` (yang
    juga dipakai `js/csv.js` & `js/app.js`) **tidak bentrok sama
    sekali**, walau kebetulan sama persis namanya.
  - `css/kidung-anak.css` — semua kelas diberi awalan `ka-` dan
    dibungkus `.ka-root` (class yang ditaruh di `#kidungPanel` cuma
    saat menu ini aktif) supaya tidak pernah bentrok dengan kelas apa
    pun di `css/style.css` (sudah dicek: 0 bentrok untuk `.chip`,
    `.badge`, `.song`, `.panel`, `.lyrics`, `.tabbtn`, dll — makanya
    aman dipakai ulang, tapi tetap diberi awalan `ka-` sebagai jaring
    pengaman kalau nanti style.css berkembang dan kebetulan pakai
    nama yang sama).
- **HANYA 3 SUNTINGAN KECIL** ke file lama, semuanya nambah baris
  (bukan mengganti/menghapus logika lama):
  1. `index.html` — 1 baris `<link>` (css baru) + 1 baris `<script>`
     (js baru), keduanya SETELAH baris lama, tidak menyentuh baris lama.
  2. `js/kidung-ui.js` — di dalam `renderKidungHome()`, menambah 1
     tombol baru ke `iconsRow` yang sudah ada (`if (typeof KidungAnak
     !== "undefined" ...)`) — kalau modul baru gagal dimuat karena
     sebab apa pun, tombolnya otomatis tidak muncul, jadi menu Kidung
     lama tidak pernah rusak gara-gara fitur baru ini.
  3. Tidak ada suntingan ke `apps-script/Code.gs` — sengaja, karena
     sifatnya baca-saja (lihat di bawah).

### Sumber data: 2 Google Sheet terpisah, TANPA Apps Script
- **Kidung Umum** (sudah ada): `CONFIG.KIDUNG_SHEET_CSV_URL` di
  `js/config.js`, di-fetch oleh `resyncKidungSheet()` di `js/kidung.js`.
- **Kidung Anak** (baru): SHEET_ID `1tC9iSgQB34X94dBp8ZjB0PqP2mjVyWUdCGNB8DglfVg`
  (tab `KidungAnakIndo`), di-fetch langsung oleh `loadData()` di
  `js/kidung-anak.js` lewat URL publish-to-web CSV — pola PERSIS sama
  dengan `resyncKidungSheet()`, cuma sheet-nya beda. **Sudah dicek
  ulang**: `apps-script/Code.gs` (2180+ baris) tidak punya satu pun
  endpoint baca/tulis data Kidung — jadi menambah/mengedit lagu anak
  = edit langsung di Google Sheet-nya, sama seperti workflow Kidung
  Umum yang sekarang. Tidak perlu deploy Apps Script apa pun.
- Kedua sheet **tidak digabung jadi satu** karena bentuk datanya beda
  (Kidung Umum: 1 baris = 1 bait/koor; Kidung Anak: 1 baris = 1 lagu
  utuh dengan kolom notasi angka & kunci gitar) — memaksa gabung akan
  menghilangkan fitur notasi/kunci/transpose yang jadi ciri khas app
  anak. Lihat riwayat percakapan pembuatan fitur ini untuk detail
  pertimbangannya.

### 🚧 BELUM DIKERJAKAN (sengaja disederhanakan dulu untuk versi pertama)
Ini poin-poin yang PERLU DIPERHATIKAN & rencana lanjutannya — dikerjakan
bertahap sesuai kesepakatan ("pelan-pelan, pilah-pilah fungsi"):

1. **Lightbox penuh untuk Gambar Referensi/Video/MP3** — versi
   standalone (index.html Kidung Anak-Anak asli) punya lightbox layar
   penuh dengan pinch-zoom, geser gambar, mode putar berantai (loop/
   lanjut lagu berikutnya), dan tombol "layar tetap menyala" (Wake
   Lock API). Versi MVP ini baru pakai iframe/audio/gambar polos di
   dalam kartu (tetap BISA diputar/dilihat, cuma belum "mewah").
   → Rencana: port `openImgLightbox`/`openVideoLightbox`/
   `openMp3Lightbox` dari index.html asli ke `js/kidung-anak.js`,
   pakai id yang diberi awalan `ka` (mis. `#kaImgLightbox`) supaya
   tidak bentrok id apa pun di `index.html` (sudah dicek: 0 bentrok).
2. **Layar Penuh per-tab (⛶)** dan **Pratinjau/Cetak PDF** — ada di
   app asli, belum diport. Kegunaannya besar untuk dipakai pemimpin
   pujian saat tampil (font besar) atau dicetak jadi buku fisik.
   → Rencana: port `openFullscreen()`, `previewPDF()`, `printSong()`
   dengan cara sama seperti notasi angka (fungsi baru di
   `kidung-anak.js`, tidak sentuh CSS print yang mungkin sudah dipakai
   fitur lain di app besar — perlu dicek dulu apakah app besar sudah
   punya `@media print` sendiri untuk fitur lain, supaya tidak tabrakan).
3. **Cache offline (IndexedDB)** — Kidung Umum tersimpan offline di
   IndexedDB (`LocalDB`), jadi tetap bisa dibuka tanpa internet. Kidung
   Anak versi MVP ini SELALU fetch ulang tiap dibuka menu-nya (seperti
   app standalone aslinya) — kalau app besar ini dipakai sebagai PWA
   offline-first, ini perlu disamakan (tambah object store baru di
   `js/db.js`, mis. `kidungAnakCache`, tanpa mengubah store yang sudah
   ada untuk Kidung Umum).
4. **"Bisa mengedit & menyimpan lagu anak" dari dalam app** — saat ini
   BELUM ada UI edit/simpan di dalam aplikasi (edit = langsung ke
   Google Sheet, sama seperti Kidung Umum). Kalau yang dimaksud adalah
   form tambah/edit lagu LANGSUNG dari HP/komputer tanpa buka Google
   Sheet, ini perlu keputusan tambahan:
   - Opsi ringan: tombol "✏️ Edit di Google Sheet" yang buka tab baru
     langsung ke baris lagu terkait (tidak perlu Apps Script).
   - Opsi penuh: form edit di dalam app + Apps Script baru untuk
     tulis-balik ke Sheet (ini BARU butuh sentuh `Code.gs`, kontras
     dengan keputusan "tidak perlu Code.gs" di atas — perlu
     dikonfirmasi dulu ke pengguna mana yang dimaksud sebelum
     dikerjakan, supaya tidak salah arah).
5. **Toggle "Kidung Umum ⇄ Kidung Anak" masih 1 tombol biasa**, belum
   berupa switch/segmented-control yang lebih rapi secara visual
   menyatu dengan `.kidung-book-toggle` yang sudah ada untuk buku
   Kidung Umum (Kidung/Suplemen/dst). Sengaja dipisah dulu karena
   skema datanya beda (lihat penjelasan di atas) — bisa dirapikan
   visualnya belakangan tanpa mengubah cara kerja intinya.
6. **Belum ada uji coba nyata di perangkat** (HP Android/iOS & desktop
   browser berbeda-beda) — baru dicek sintaks JS valid & tidak ada
   bentrok id/nama kelas/nama fungsi secara statis (grep). Perlu
   dicoba langsung sebelum dipakai jemaat/anak-anak sungguhan.

### File yang berubah/ditambah pada update ini
```
BARU     js/kidung-anak.js
BARU     css/kidung-anak.css
UBAH     index.html            (+2 baris: link css baru, script js baru)
UBAH     js/kidung-ui.js       (+±10 baris: 1 tombol baru di renderKidungHome())
TIDAK BERUBAH  js/kidung.js, css/style.css, apps-script/Code.gs, js/db.js,
               dan semua file lain di luar 4 baris di atas.
```

---

## 🆕 UPDATE 29 Agu 2026 (lanjutan, hari sama) — Salin lengkap + Layar Penuh

Melanjutkan poin TODO nomor 1–2 di update sebelumnya, dikerjakan yang
paling mudah & risikonya paling kecil dulu:

### Yang ditambahkan
1. **Tombol salin yang tadinya belum lengkap, sekarang lengkap** —
   sama seperti index.html asli:
   - Tab Notasi Angka: **📋 Salin Notasi Angka** (format sama persis
     tampilan layar, lengkap angka posisi ketukan di bawahnya).
   - Tab Kunci+Notasi+Lirik: **📋 Salin Lirik Saja**, **📋 Salin Kode
     Asli** (persis kolom mentah di Google Sheet, siap ditempel balik),
     **📋 Salin untuk Notasi Angka** (menyaring notnya saja, siap
     ditempel ke kolom `NotAngka` kalau mau lagu yang sama tampil juga
     di tab Notasi Angka biasa).
2. **⛶ Layar Penuh** untuk 4 tab berbasis teks (Syair, Kunci+Lirik,
   Notasi Angka, Kunci+Notasi+Lirik) — buka tampilan baca besar 1 layar
   penuh, ada tombol ganti kunci (kecuali tab Syair) dan ukuran teks
   (A−/A+), tombol ✕ atau tombol Esc untuk menutup.

### Kenapa ini yang dipilih duluan
Keduanya murni **memakai ulang** fungsi render yang sudah ada
(`renderPlainLyrics`, `renderLyricsWithChords`, `renderNotasiAngka`,
`renderComboSheet`) — tidak ada logika baru yang rawan salah, tidak
ada gestur sentuh (pinch/geser) atau API browser yang butuh izin
(Wake Lock, dst) seperti lightbox gambar/video/MP3 — jadi risiko
lebih kecil dibanding poin TODO lain.

### Detail teknis (tetap aditif, tidak ada file lama yang disentuh)
- Semua tambahan ada di **file yang sama seperti sebelumnya**:
  `js/kidung-anak.js` (+fungsi `buildComboLyricsOnly`,
  `buildComboRawCode`, `buildComboNotasiOnly`, `buildNotasiFrontendText`,
  `openFullscreen`, `closeFullscreen`, `ensureFsOverlay`) dan
  `css/kidung-anak.css` (+blok `.ka-fs-*`).
- Overlay Layar Penuh (`#kaFsOverlay`) ditempel ke `<body>` secara
  dinamis lewat JS (bukan ditulis di index.html), dibuat sekali saat
  pertama kali tombol ⛶ ditekan — jadi **tidak nambah baris apa pun**
  ke index.html untuk fitur ini.
- z-index overlay ini `10000` — sudah dicek lebih tinggi dari z-index
  tertinggi yang dipakai `css/style.css` (9999), supaya Layar Penuh
  selalu tampil paling depan tanpa ketiban modal/overlay app besar
  yang lain.
- Sudah dicek ulang: tidak ada id `kaFs...` yang bentrok di manapun
  di `index.html`/`js/app.js`.

### Yang masih di TODO (belum berubah dari update sebelumnya)
- Lightbox penuh Gambar Referensi/Video/MP3 (pinch-zoom, wake lock,
  mode putar berantai)
- Pratinjau & Cetak PDF
- Cache offline (IndexedDB) untuk data Kidung Anak
- Keputusan soal "edit & simpan langsung dari app" (lihat penjelasan
  2 opsi di update sebelumnya)
- Uji coba langsung di perangkat nyata

---

## 🆕 UPDATE 29 Agu 2026 (lanjutan ke-2) — Bilah ikon kecil di bawah + tombol Edit

### Yang berubah
- **Tabbar teks di atas** ("📜 Syair", "🎸 Kunci + Lirik", dst) **dipindah
  ke BAWAH kartu lagu** dan diubah jadi **ikon bulat kecil tanpa teks**
  (📜 🎸 🎼 🎹 🎥 🎶 👤 🖼️), meniru gaya bilah kontrol di layar Kidung
  Umum yang sudah ada (lihat screenshot yang Anda kirim — tombol ◀ ▶
  musik ↻ gambar dst). Nama tab tetap muncul lewat tooltip (ketuk & tahan
  di HP, arahkan mouse di komputer) supaya tidak bingung ikon mana untuk
  apa. Ikon yang datanya belum ada otomatis pudar/tidak bisa ditekan
  (sama seperti tabbar teks sebelumnya).
- **Tombol baru "✏️" (Edit)** ditambahkan di ujung bilah ikon — untuk
  sekarang cara kerjanya SEDERHANA: cuma membuka Google Sheet sumber
  data (`KidungAnakIndo`) di tab baru, administrator tinggal cari
  sendiri judul lagunya di sana lalu edit seperti biasa. **Belum**
  langsung loncat ke baris pastinya (perlu tahu nomor baris/gid tab
  yang pasti — lihat poin TODO di bawah).

### Kenapa dipindah ke bawah
Ini konsisten dengan pola yang sudah dipakai di layar Kidung Umum
(`buildKidungToolbar()`), supaya kalau nanti kedua menu ini dilihat
berdampingan, rasanya "satu keluarga" — bukan dua gaya UI yang beda.

### Detail teknis (tetap aditif)
- Semua perubahan di `js/kidung-anak.js` (markup tabbar dipindah +
  ditambah tombol edit) dan `css/kidung-anak.css` (+`.ka-bottombar`,
  `.ka-iconbtn`, `.ka-bottombar-sep`). **index.html dan kidung-ui.js
  tidak disentuh** di update ini.
- Class lama `.ka-tabbtn` sengaja DIPERTAHANKAN di tombol ikon baru
  (ditambah class `.ka-iconbtn` di sampingnya) supaya fungsi
  `activateTab()` yang sudah ada tetap jalan tanpa perlu ditulis ulang.

### 🚧 Perlu diperhatikan / diputuskan untuk versi Edit yang lebih lengkap
Tombol ✏️ Edit versi sekarang baru "pintu masuk" ke Sheet-nya secara
umum. Untuk bisa langsung loncat ke baris lagu yang tepat (apalagi kalau
mau ada FORM edit di dalam app, bukan buka Google Sheet), perlu
diputuskan salah satu:
1. **Tetap edit di Google Sheet**, tapi loncat presisi ke barisnya —
   butuh tahu `gid` tab `KidungAnakIndo` yang pasti (bisa dilihat dari
   URL Sheet saat tab itu dibuka) supaya link `#gid=...&range=A5` bisa
   dibuat otomatis per lagu.
2. **Form edit + simpan LANGSUNG di dalam app** (tanpa buka Google
   Sheet sama sekali) — ini BARU butuh Apps Script baru (`Code.gs`)
   untuk terima data dari app lalu menulis ke Sheet, KONTRAS dengan
   keputusan "tidak perlu Code.gs" di update pertama. Kalau ini yang
   dimaksud, mohon dikonfirmasi dulu supaya saya kerjakan Code.gs-nya
   dengan hati-hati (harus ada validasi siapa yang boleh edit, supaya
   sembarang orang tidak bisa mengubah data lagu).

### Yang masih di TODO (belum berubah)
- Lightbox penuh Gambar Referensi/Video/MP3
- Pratinjau & Cetak PDF
- Cache offline (IndexedDB)
- Uji coba langsung di perangkat nyata

---

## 🆕 UPDATE 29 Agu 2026 (lanjutan ke-3) — Tombol Edit dihapus (dikonfirmasi tidak perlu)

Sesuai arahan: **tombol "✏️ Edit" dan pintu masuk ke Google Sheet dari
dalam kartu lagu DIHAPUS** — dikembalikan seperti sebelumnya (edit lagu
= edit langsung di Google Sheet dari luar app, seperti Kidung Umum,
TANPA sentuh `apps-script/Code.gs` sama sekali). Ini menegaskan ulang
keputusan di update pertama: modul Kidung Anak murni baca-saja dari
app.

Fokus kembali ke **tampilan musiknya** (notasi angka, kunci+lirik,
kunci+notasi+lirik) supaya konsisten & sesuai contoh index.html asli —
mesin render (`renderNotasiAngka`, `renderComboSheet`,
`renderLyricsWithChords`, `transposeChordSymbol`) memang dipindah APA
ADANYA dari index.html itu (cuma nama kelas CSS diberi awalan `ka-`),
jadi bentuk visualnya (titik oktaf, garis birama, kunci di atas kata,
dst) sudah sama persis, bukan ditulis ulang dari nol.

### File yang berubah
`js/kidung-anak.js` saja (hapus markup & wiring tombol Edit). Tidak ada
file lain yang disentuh.

---

## 🆕 UPDATE 29 Agu 2026 (lanjutan ke-4) — Navigasi ◀ ▶ menyatu + geser (swipe) di HP

### Yang ditambahkan
1. **◀ ▶ Kidung Umum sekarang "tembus" ke Kidung Anak.** Kalau sedang
   membaca kidung nomor terakhir di buku terakhir (mis. Suplemen No.
   terakhir) lalu tekan ▶, otomatis pindah ke lagu anak pertama. Kalau
   sedang di lagu anak TERAKHIR lalu tekan ▶ (atau geser kiri), otomatis
   kembali ke No. 1 buku Kidung Umum yang pertama. Arah mundur (◀ /
   geser kanan) juga berlaku sebaliknya.
2. **Setiap kartu lagu anak sekarang punya baris ◀ ▶ sendiri** (di
   bawah bilah ikon), untuk lompat ke lagu anak sebelumnya/berikutnya
   tanpa harus tutup-buka manual satu-satu dari daftar.
3. **Geser kiri/kanan (swipe) di HP** pada bagian isi kartu yang sedang
   terbuka = sama seperti menekan ▶/◀ — geser ke kiri untuk lanjut,
   geser ke kanan untuk kembali.

### Cara kerja teknis (PENTING — tetap tanpa mengedit file lama)
Fitur ini butuh "menyisipkan" Kidung Anak ke dalam alur ◀ ▶ yang
sebelumnya cuma tahu soal buku-buku Kidung Umum. Alih-alih mengedit
`js/kidung.js`/`js/kidung-ui.js` langsung, dipakai cara **timpa fungsi
saat runtime** (dari `js/kidung-anak.js`, dijalankan otomatis begitu
halaman dimuat):
- `findAdjacentKidungCrossBook()` — replika PERSIS logika round-robin
  aslinya, cuma daftar bukunya ditambah 1 (`"Kidung Anak"`) di paling
  akhir urutan. Fungsi pendukungnya (`findAdjacentKidungNo`,
  `getKidungBooksOrdered`, `getKidungList`) dipakai APA ADANYA, tidak
  diduplikasi ulang.
- `openKidungReader()` — kalau tujuannya buku `"Kidung Anak"`, dialihkan
  ke fungsi baru `openReaderInList()` di `js/kidung-anak.js` (buka
  daftar lagu anak, cari & scroll ke kartu yang tepat). Kalau bukan,
  diteruskan ke fungsi ASLINYA (disimpan lebih dulu sebelum ditimpa)
  tanpa perubahan perilaku sama sekali.
- Kedua timpaan ini dibungkus `if (typeof ... === "function" && !window.__kaXxxPatched)`
  — kalau fungsi aslinya (karena sebab apa pun) tidak ada, penimpaan
  dilewati begitu saja dan TIDAK PERNAH melempar error; paling buruk
  cuma fitur loncat-antar-buku ini yang tidak aktif, menu Kidung Umum
  & Kidung Anak yang sudah ada tetap jalan normal sendiri-sendiri.
- **File `js/kidung.js` dan `js/kidung-ui.js` sendiri: 0 baris berubah.**
  Semua kode baru ada di `js/kidung-anak.js` (fungsi
  `findAdjacentInKidungAnakOrJumpOut`, `openReaderInList`, `stepSong`,
  `attachSwipeNav`, `getSortedSongs`) + `css/kidung-anak.css`
  (`.ka-nav-row`, `.ka-nav-btn`, `.ka-nav-label`).

### ⚠️ Catatan yang perlu diperhatikan
- "Kembali ke No. 1 Kidung Umum" ini **mengandalkan urutan buku** yang
  dikembalikan `getKidungBooksOrdered()` (fungsi asli, tidak diubah) —
  diasumsikan buku utama "Kidung" ada di urutan PERTAMA seperti
  lazimnya. Kalau ternyata urutannya beda (mis. "Suplemen" duluan),
  loncatan "kembali ke awal" akan mendarat di buku itu, bukan "Kidung"
  No.1. Perlu dicek langsung saat uji coba nyata.
- Navigasi ◀ ▶ & geser ini urutannya berdasar **nomor lagu (`No`) di
  Sheet Kidung Anak**, bukan urutan tampil di layar (yang bisa berubah
  kalau ada pencarian/filter kategori aktif) — saat lompat, filter
  otomatis direset ke "Semua" & pencarian dikosongkan supaya lagu
  tujuan pasti ketemu.
- Belum diuji di perangkat sungguhan (HP Android/iOS, berbagai ukuran
  layar) — kombinasi swipe + scroll vertikal perlu dicek tidak saling
  mengganggu saat isi lagu panjang.

---

## 🆕 UPDATE 29 Agu 2026 — MODE TAMU: Batasi Kitab yang Boleh Dibuka

### Yang ditambahkan
Sekarang administrator bisa membatasi **Mode Tamu** (pengunjung yang
belum login) supaya cuma boleh membuka kitab-kitab TERTENTU dari 66
kitab Alkitab — diatur langsung dari Google Sheet, **tanpa perlu ubah
kode atau deploy ulang Apps Script**. Kalau setting ini tidak diisi
sama sekali, perilakunya SAMA seperti sebelumnya (tamu boleh buka
semua 66 kitab) — jadi aman ditambahkan, tidak mengubah apa pun untuk
yang belum memakainya.

### 📋 CARA MENGATUR DI GOOGLE SHEET (langkah-langkah)
1. Buka Google Sheet yang sama dengan yang dipakai untuk pengaturan
   aplikasi lain (tab **"Setup"** — tab yang sama tempat baris
   `guest_daily_limit_per_device` dan `guest_total_daily_limit` berada).
   Kalau tab "Setup" belum pernah ada/terlihat, cek dulu dengan tim
   teknis yang mengelola Apps Script-nya.
2. Tab "Setup" punya 4 kolom: **Key | Label | Isi | Tampil**.
3. Tambah 1 baris baru PERSIS seperti ini:

   | Key | Label | Isi | Tampil |
   |---|---|---|---|
   | `guest_allowed_books` | `(Pengaturan) Kitab yang Boleh Dibuka Tamu` | *(lihat langkah 4)* | `FALSE` |

   - Kolom **Key**: ketik persis `guest_allowed_books` (huruf kecil semua,
     pakai garis bawah `_`, bukan spasi).
   - Kolom **Tampil**: isi `FALSE` — supaya baris ini TIDAK ikut muncul
     di panel publik "Info Kami" (sama seperti baris pengaturan lain).
4. Kolom **Isi**: ketik nama-nama kitab yang BOLEH dibuka tamu, **dipisah
   koma**, ejaannya harus **PERSIS SAMA** dengan daftar resmi di bawah
   (besar-kecil huruf tidak masalah, tapi ejaan & spasi harus sama).
   Contoh isi kalau tamu cuma boleh buka Kejadian, Mazmur, Matius, dan
   Yohanes:
   ```
   Kejadian, Mazmur, Matius, Yohanes
   ```
5. Simpan Sheet-nya. Perubahan akan otomatis terbaca aplikasi paling
   lambat saat pengunjung berikutnya membuka/memuat ulang halaman (data
   Setup diambil sekali per sesi, bukan disimpan permanen di sisi
   aplikasi).
6. **Kosongkan kolom Isi** (atau hapus barisnya) kapan saja untuk
   mengembalikan ke keadaan semula: tamu boleh buka SEMUA kitab lagi.

### 📖 DAFTAR RESMI 66 NAMA KITAB (salin dari sini supaya tidak salah ketik)
Sesuai `js/books.js` — urutan kanon standar:

**Perjanjian Lama (39 kitab):**
```
Kejadian, Keluaran, Imamat, Bilangan, Ulangan, Yosua, Hakim-hakim, Rut,
1 Samuel, 2 Samuel, 1 Raja-raja, 2 Raja-raja, 1 Tawarikh, 2 Tawarikh,
Ezra, Nehemia, Ester, Ayub, Mazmur, Amsal, Pengkhotbah, Kidung Agung,
Yesaya, Yeremia, Ratapan, Yehezkiel, Daniel, Hosea, Yoel, Amos, Obaja,
Yunus, Mikha, Nahum, Habakuk, Zefanya, Hagai, Zakharia, Maleakhi
```

**Perjanjian Baru (27 kitab):**
```
Matius, Markus, Lukas, Yohanes, Kisah Para Rasul, Roma, 1 Korintus,
2 Korintus, Galatia, Efesus, Filipi, Kolose, 1 Tesalonika,
2 Tesalonika, 1 Timotius, 2 Timotius, Titus, Filemon, Ibrani, Yakobus,
1 Petrus, 2 Petrus, 1 Yohanes, 2 Yohanes, 3 Yohanes, Yudas, Wahyu
```

⚠️ Penulisan yang PERLU DIPERHATIKAN (sering salah ketik):
- `1 Samuel`, `2 Raja-raja`, dst → pakai **angka + spasi**, BUKAN
  "I Samuel" atau "Kitab 1 Samuel". Tanda hubung pada "Raja-raja"/
  "Hakim-hakim" WAJIB ada.
- `Kisah Para Rasul` → nama lengkap, bukan "Kisah Rasul" saja.
- `Kidung Agung` → 2 kata, jangan sampai tertukar dengan menu "Kidung"
  (fitur lagu) yang beda sama sekali di aplikasi ini.

### Bagaimana tampilannya untuk tamu
Kitab yang TIDAK ada di daftar akan tetap KELIHATAN di sidebar (supaya
tamu tahu kitab itu ada), tapi diberi tanda gembok 🔒 kecil di sebelah
namanya dan tidak bisa dibuka — kalau diketuk, muncul pesan singkat
("Kitab ini belum dibuka untuk tamu") dengan tombol untuk masuk pakai
akun. Kitab yang BOLEH dibuka tetap tampil & berfungsi normal seperti
biasa.

### Detail teknis (untuk yang ingin tahu/merawat kodenya nanti)
- **TIDAK ADA endpoint Apps Script baru** yang dibuat — fitur ini
  memakai ulang endpoint `type=app_setup` yang SUDAH ADA di
  `apps-script/Code.gs` (mengirim semua baris tab Setup apa adanya),
  dan fungsi `fetchRemoteAppSetup_()` yang SUDAH ADA di `js/app.js`
  (dipakai juga untuk baca `guest_daily_limit_per_device` dkk). Jadi
  **`apps-script/Code.gs` di paket ini 0 baris berubah**.
- Semua logika baru ada di `js/guest.js` (fungsi baru: `loadAllowedBooks`,
  `isBookAllowedSync`, `showBookLocked`, `applyBookGate`).
- `js/app.js` HANYA nambah **1 baris** di akhir `buildSidebar()`:
  `if (typeof Guest !== "undefined" && Guest.applyBookGate) Guest.applyBookGate();`
  — dibungkus `typeof` supaya kalau `guest.js` gagal dimuat, sidebar
  tetap jalan normal seperti sebelumnya.
- `css/style.css` cuma DITAMBAH di paling akhir file (`.book-guest-locked`
  dkk) — tidak ada aturan lama yang diubah/dihapus.

### ⚠️ Catatan jujur soal batasan cara ini
Karena data Alkitab (semua 66 kitab, semua bahasa) sudah diunduh PENUH
ke perangkat pengguna sejak awal (tersimpan di IndexedDB browser untuk
kebutuhan baca offline), pembatasan ini sifatnya **"sopan-sopanan" di
tampilan** — mengarahkan tamu awam supaya tidak sengaja/tidak sengaja
membuka kitab yang belum ingin ditampilkan ke publik. Ini **BUKAN**
perlindungan data tingkat server yang mustahil ditembus — orang yang
paham cara buka "DevTools" di browser tetap bisa mengakses data mentah
yang sudah terunduh di perangkatnya sendiri. Untuk kebutuhan gereja/
keluarga biasa ini biasanya lebih dari cukup, tapi perlu diketahui
batasannya kalau isi kitab yang disembunyikan itu sifatnya benar-benar
sensitif.

### 🚧 Belum diuji
Fitur ini baru dicek sintaksnya valid, belum dicoba langsung dengan
Google Sheet & Apps Script sungguhan. Mohon dicoba: isi baris
`guest_allowed_books`, masuk sebagai tamu, dan pastikan kitab di luar
daftar benar-benar terkunci sementara yang di dalam daftar tetap normal.

## Rencana fitur berikutnya: "AI Presentation" + embed Canva/SoundCloud

Sedang direncanakan (belum dikerjakan): 1 kotak ketik untuk memasukkan
banyak item sekaligus (mis. `matius 11:28, K24, markus 16:16, pengumuman
..., S120`), langsung tersusun jadi rangkaian slide siap tayang urut &
bisa disimpan ke Kumpulan Ayat sekaligus — plus rencana menampilkan
presentasi Canva & memutar audio SoundCloud (Play/Pause, masuk Kumpulan
Ayat). Lihat rencana teknis lengkap (termasuk batasan jujur soal Canva &
SoundCloud) di **`ROADMAP-ai-presentation.md`**.

## 🆕 UPDATE 8 Sep 2026 — Logo, syair ganda No.388, badge birama/pola suku kata, panel ℹ️ Sejarah & Cara Baca, swipe ◀/▶ HP

1. **Logo header** — ikon pojok kiri-atas (`.brand-mark`) sekarang pakai
   logo asli "IN CHRIST · Living Stream Ministry" (`assets/logo-inchrist.png`),
   menggantikan avatar bulat "k" lama.
2. **Kidung ber-syair-ganda (mis. No.388 "Mengalami Kristus")** — dulu
   bait syair 1 & syair 2 tertarik jadi berselang-seling/dobel di layar
   baca. Sekarang dipecah otomatis per grup (deteksi dari `no_bait` yang
   balik ke 1) — lihat komentar panjang `getKidungBaitsWithKoor()` (js/kidung.js).
   **Data di Sheet TIDAK perlu diubah** — pola "1 baris koor judul syair
   tepat sebelum bait pertama syair itu" yang sudah ada sekarang justru
   yang dipakai untuk mendeteksi batas antar-syair.
3. **2 kolom baru (opsional) di Sheet Kidung:**
   - `pola_suku_kata` — pola jumlah suku kata per baris syair, mis.
     `8 8 8 8` / `7 7 7 7`. **Beda dari `birama`** (yang isinya nada
     dasar + ketukan, mis. `D 3/4`) — sengaja kolom terpisah supaya tidak
     menimpa data birama yang sudah ada.
   - `sejarah` — cerita/latar belakang kidung itu SAJA. `pengarang`
     sekarang sebaiknya HANYA diisi nama penulis (pendek), bukan lagi
     dicampur dengan cerita panjang.
   Kedua kolom kosong = otomatis tidak tampil di layar baca (aman untuk
   kidung yang belum diisi).
4. **Sejarah umum buku Kidung & panduan "Cara Membaca Kidung"** (berlaku
   utk semua kidung, BUKAN per lagu) — ditaruh di tab **Setup** (sumber
   data panel ℹ️ Info Kami yang sudah ada, `js/infokami.js`), baris baru
   dengan `Key` = `sejarah_kidung` dan `cara_baca_kidung`. Admin bisa isi/
   ubah kapan saja langsung dari Sheet, tanpa ubah kode.
5. **Tombol ℹ️ di layar baca Kidung** — buka panel "Sejarah & Cara Baca"
   (isi: sejarah kidung yang sedang dibuka + panduan cara baca umum di
   atas). Badge kecil birama & pola suku kata juga ditampilkan di header
   (lihat `.kidung-reader-badges` di css/style.css).
6. **Swipe kiri/kanan di HP di layar baca** — pindah nomor kidung
   selanjutnya/sebelumnya, lewat jalur yang SAMA dengan tombol ◀/▶ yang
   sudah ada (`findAdjacentKidungCrossBook()`, js/kidung.js) — jadi kalau
   sedang di nomor TERAKHIR suatu buku, swipe otomatis lompat ke nomor
   PERTAMA buku berikutnya sesuai `CONFIG.KIDUNG_BOOK_ORDER`
   (js/config.js), bukan `+1` mentah. Arah: geser ke KANAN = selanjutnya,
   ke KIRI = sebelumnya (gampang ditukar, lihat komentar
   `attachKidungSwipeNav()` di js/kidung-ui.js kalau ternyata dirasa
   kebalik).

**Belum diuji** end-to-end di HP/browser sungguhan — baru lolos
`node --check` untuk semua file JS yang diubah (`js/csv.js`, `js/kidung.js`,
`js/kidung-ui.js`, `js/infokami.js`) + tinjauan manual struktur CSS.

## 🆕 UPDATE 9 Sep 2026 — 🖥️ Mode Layar, 🗺️ Peta Interaktif & Split Screen Kiri-Kanan (fondasi)

Fondasi untuk kebutuhan acara besar (200 layar/1000 orang): layar sambutan,
layar "selanjutnya" di antara sesi, peta lokasi interaktif, dan tata letak
kamera kiri-konten kanan. Ditambahkan **tanpa mengubah** struktur Kumpulan
Ayat yang sudah ada — semuanya numpang pola "item generik" yang sama
(`verse`/`kidung`/`announcement`/dst di `js/collections.js`).

1. **◧ Split Screen Kiri-Kanan** (tab "🎥 Kamera") — tata letak kamera baru
   `body.cam-split-lr` (present.html), beda dari "split" lama yang
   atas-bawah. Numpang slider "Ukuran Zona Kamera" yang sudah ada (dibaca
   sebagai LEBAR di mode ini) + checkbox baru "🔁 Balik Sisi"
   (`theme.camSplitReverse`) untuk menukar kamera ke kanan/konten ke kiri.

2. **🖥️ Mode Layar (Welcome & Next Up)** — tab baru "🖥️ Mode & Peta".
   Komponen tunggal `#modeScreenView` (present.html) dipakai untuk 2 jenis:
   - **Welcome** — layar sambutan sebelum acara mulai: judul, subjudul,
     poin-poin penting (bullets), opsional hitung mundur ke jam mulai.
   - **Next Up** — layar "SELANJUTNYA" di antara sesi: eyebrow otomatis +
     judul sesi berikutnya.
   Payload: `{ type:"modescreen", kind:"welcome"|"nextup", title, subtitle,
   bullets, endAt }`, dikirim lewat `rawPost()` seperti Timer/Stopwatch.
   Bisa langsung "▶️ Tampilkan" (sekali pakai) ATAU "💾 Simpan ke Kumpulan
   Ayat" (diselipkan sebagai item `type:"modescreen"` — **sengaja tanpa**
   `endAt`, supaya tidak basi kalau kumpulan dipakai ulang di acara lain).
   > Untuk **Jam Istirahat/Break screen**, TIDAK perlu fitur baru — pakai
   > fitur lama "🎯 Countdown ke Jam Target" (tab "🎨 Tampilan") yang sudah
   > punya kolom **Caption** untuk menulis acara berikutnya.

3. **🗺️ Peta Interaktif** — di tab yang sama, dibuat **reusable lintas
   acara** (bukan cuma 1 lokasi):
   - Kelola banyak peta ("➕ Peta Baru" / ganti nama / hapus), tersimpan di
     `localStorage` perangkat ini (`bible_app_studio_maps_v1`, BELUM
     sinkron Drive/Sheet — lihat "Belum dikerjakan" di bawah).
   - Unggah gambar peta apa saja (venue/kota/negara) → **klik langsung di
     atas gambar** untuk taruh pin + nama titik (operator yang menaruh,
     BUKAN ditebak otomatis dari file PDF/gambar aslinya).
   - Klik "🎯 Fokus" per pin → Layar 2 zoom & geser mulus ke titik itu
     (`focusMapPin()`, present.html — dihitung dari piksel nyata lewat
     `getBoundingClientRect()`, bukan persentase CSS murni, supaya tetap
     akurat di rasio layar apa pun).
   - "💾 Simpan ke Kumpulan Ayat" — menyimpan **referensi** (`mapId`) ke
     Map Library, pola sama seperti item `media` (referensi ke Media
     Tersimpan, bukan salinan gambarnya).

### File yang berubah
`present.html` (CSS+HTML+JS: `#modeScreenView`, `#mapView`,
`showModeScreen()`/`stopModeScreen()`, `showMap()`/`focusMapPin()`/
`stopMap()`, saling-eksklusif dengan Timer/Stopwatch/Countdown Jam
Target/Video Lokal yang sudah ada), `index.html` (tab "🖥️ Mode & Peta" +
tombol layout kamera baru), `js/presentation-studio.js`
(`wireModeScreenTab()`, `wireMapTab()`, `getStoredMapById()`, pratinjau
Studio untuk 2 tipe baru), `js/collections.js`
(`addModeScreenToCollection()`, `addMapToCollection()`), `js/app.js`
(`collectionItemRef()`/`collectionItemBodyText()` untuk 2 tipe baru).

Semua lolos `node --check` (JS) & cek struktur `<script>` embedded di
`present.html`/`index.html`. **Belum diuji** end-to-end di browser/monitor
sungguhan.

### 🚧 Belum dikerjakan (foundation lanjutan, di luar cakupan sesi ini)
- Map Library **belum sinkron** ke Drive/Sheet (baru `localStorage`
  per-perangkat) — kalau dibuka di perangkat lain, peta yang tersimpan
  tidak ikut, dan item "map" di Kumpulan Ayat yang dibagikan ke akun lain
  tidak akan tayang (sama seperti keterbatasan item `media` untuk kasus
  serupa).
- Belum ada shortcut/tombol cepat khusus untuk Welcome/Next Up favorit
  (seperti pola "🔔 Bel Cepat"/"⚡ Mode Cepat" yang sudah ada).

## 🆕 UPDATE 9 Sep 2026 (lanjutan, hari sama) — 📋 Titik Peta dari Tabel, Kalibrasi 2-Titik & Kategori/Checklist (Kaki Dian, Pos Injil, dst)

Lanjutan langsung dari fitur 🗺️ Peta Interaktif di atas — untuk kasus
**ratusan titik se-Indonesia** (bukan cuma belasan titik 1 venue), klik
satu-satu jelas tidak praktis. Sekarang bisa ketik **daftar kota + kategori
+ tahun** (mirip tabel Excel), posisinya dihitung OTOMATIS.

1. **Data koordinat 514 kabupaten/kota** — `js/indonesia-regencies.js`
   (BARU), berisi `{n:nama, lat, lng}` untuk semua kabupaten/kota
   Indonesia. Sumber: data wilayah Indonesia publik dari GitHub
   (`yusufsyaifudin/wilayah-indonesia`, turunan Kemendagri/BPS), diunduh &
   disusun ulang 9 Sep 2026 — **koordinat PUSAT wilayah**, cukup akurat
   untuk menaruh pin di peta, bukan untuk navigasi presisi.

2. **📍 Kalibrasi Peta (2 titik acuan)** — sekali per peta: operator pilih
   2 kota yang tahu persis posisinya di gambar peta itu (mis. kota paling
   barat & paling timur pada gambar), tekan "🎯 Tandai", klik posisinya di
   gambar. Dari 2 titik itu, `latLngToPct()` (js/presentation-studio.js)
   menghitung transformasi linear sederhana (x dari longitude, y dari
   latitude) untuk mengubah lat/long kota MANAPUN jadi posisi pin di
   gambar itu — **tidak memperhitungkan proyeksi/rotasi peta yang aneh**,
   tapi cukup akurat untuk peta Indonesia yang digambar hampir lurus
   utara-atas (kebanyakan peta cetak/ilustrasi acara).

3. **📋 Daftar Titik dari Tabel** — baris `Kota/Kabupaten | Kategori |
   Tahun` (autocomplete nama kota dari 514 daftar di atas), disimpan
   terpisah dari pin (`map.cityRows`) supaya bisa diedit ulang kapan saja.
   Tombol **"🧮 Terapkan ke Peta"** memproses SEMUA baris sekaligus →
   1 pin per baris, id pin STABIL dari kota+kategori (menjalankan ulang
   tombol ini, mis. setelah perbaiki tahun, MEMPERBARUI pin yang sama,
   tidak menduplikasi).

4. **☑️ Kategori yang Ditampilkan** — checklist otomatis dari semua
   kategori yang dipakai di peta itu (mis. "Kaki Dian", "Pos Injil"),
   **jumlah titik per kategori dihitung otomatis** di sebelah nama
   kategorinya. Centang/hilangkan kategori → `visiblePins()`
   (js/presentation-studio.js) memfilter pin mana yang ikut dikirim ke
   Layar 2 saat "▶️ Tampilkan Peta" ditekan.

5. **🎨 Warna otomatis per kategori** — dihitung dari NAMA kategorinya
   sendiri (hash sederhana ke 1 dari 8 warna tetap), konsisten antara dot
   pin di panel Studio, dot di Layar 2, dan badge legenda — TIDAK berubah
   walau kategori ditambah/dihapus dari urutan manapun.

6. **🏷️ Badge legenda di Layar 2 (TAMPIL KE PENONTON)** — pojok
   kanan-atas peta menunjukkan `● Kaki Dian 12` / `● Pos Injil 8` dst
   (`#mapLegend`, present.html) — dikirim sebagai `categoryCounts` dalam
   payload `{type:"map", action:"show", ...}`. Pin BERKATEGORI (kota,
   bisa ratusan) SENGAJA tanpa label teks permanen di Layar 2 (supaya
   peta tidak penuh sesak tulisan) — cukup titik warna + badge hitungan;
   nama kota tetap terlihat operator lewat tooltip di panel Studio. Pin
   MANUAL (venue, biasanya cuma belasan) tetap punya label teks permanen
   seperti sebelumnya.

### File yang berubah/ditambah
`js/indonesia-regencies.js` (BARU, data 514 kabupaten/kota),
`js/presentation-studio.js` (`findRegencyByName()`, `latLngToPct()`,
`categoryColor()`, `renderCityRows()`, `renderCategoryChecklist()`,
`renderCalibStatus()`, `visiblePins()`/`visibleMapPins_()`, wiring
kalibrasi & tombol tabel di `wireMapTab()`), `index.html` (markup
Kalibrasi + Daftar Titik dari Tabel + Checklist Kategori + 2 `<datalist>`
baru), `present.html` (`#mapLegend`, `categoryColor_()`,
`renderMapLegend_()`, pin berkategori diwarnai & tanpa label permanen).

Semua lolos `node --check` (JS) & cek struktur `<script>` embedded di
`present.html`/`index.html`. **Belum diuji** end-to-end di browser
sungguhan — terutama akurasi kalibrasi 2-titik di atas gambar peta
Indonesia yang sesungguhnya (bentuk kepulauan bisa membuat beberapa kota
di pulau kecil/terpencil sedikit meleset dari posisi visual "benar" di
gambar, karena rumus yang dipakai linear sederhana, bukan proyeksi peta
sungguhan).

### 🚧 Belum dikerjakan (lanjutan)
- Tombol untuk MEMINDAHKAN pin hasil tabel secara manual (mis. kalau
  posisi hasil hitung meleset sedikit di pulau kecil) — sekarang cuma
  bisa hapus & atur ulang lewat kalibrasi/tabel.
- Import massal dari file CSV/Excel yang diunggah (sekarang: ketik/tempel
  baris satu-satu di tabel dalam aplikasi).
- Sinkron Map Library (termasuk `cityRows` & kalibrasi) ke Drive/Sheet —
  lihat catatan "Belum dikerjakan" fitur Peta Interaktif di atas, masih
  berlaku sama untuk data kategori ini.

---

# 🧭 MASTER PRODUCT ROADMAP & CHECKLIST — YOUTH FLOW / COMMUNITY SYSTEM

> **Tujuan bagian ini:** menjadi satu sumber kebenaran (single source of truth) untuk mengetahui apa yang **sudah benar-benar ada**, apa yang **sebagian sudah ada**, dan apa yang **belum dibuat**.
>
> Roadmap ini menggabungkan kemampuan aplikasi yang sudah terlihat di project saat ini dengan pengembangan yang diperlukan agar aplikasi dapat dipakai **setiap hari, setiap minggu, untuk 200+ lokal/tempat, penjengukan, penguatan, fellowship, acara 3 jam, acara 1 hari, sampai acara 3 hari 3 malam ±1.000 pemuda**.

## 🔑 Aturan status

- `[x]` **SELESAI** — fitur ditemukan di project dan dinyatakan sudah berjalan berdasarkan dokumentasi/status project.
- `[~]` **SEBAGIAN** — fondasi/versi awal sudah ada, tetapi workflow lengkap belum selesai.
- `[ ]` **BELUM** — belum dibuat atau belum ada bukti implementasi.
- `[!]` **PERLU UJI/PERBAIKAN** — sudah ada tetapi belum diuji end-to-end atau ada masalah yang sudah diketahui.

**Jangan mengubah `[ ]` menjadi `[x]` hanya karena fitur sudah direncanakan. Status harus mengikuti kode dan hasil pengujian nyata.**

---

---

## 📌 STATUS SESI TERKINI (baca ini duluan)

> Bagian ini SENGAJA ditaruh paling atas roadmap supaya siapa pun (termasuk AI
> coding agent) langsung tahu sedang di tahap mana, tanpa harus menelusuri
> seluruh dokumen dulu. Diperbarui tiap sesi -- lihat juga bagian 34
> "CATATAN PEMBARUAN STATUS" untuk log rinci per tanggal, dan bagian 35
> "ARSIP LOG DETAIL" untuk riwayat lengkap sebelum README ini digabung jadi 1.

Permintaan fitur "efek panggung" (Presentation Studio, roda undian, dll) yang
sedang berjalan **saat ini** dipecah jadi 3 bagian besar, dikerjakan berurutan:

- **C — Tata Letak Kamera/Teks (split-screen, bulat, dll)** → ✅ **SELESAI**
- **B — Gamifikasi/Reaksi Offline (Efek Panggung diperluas)** → ✅ **SELESAI**
- **A — Menu Cepat ⚡ (wadah Offline/Online 1 layout)** → 🔶 **SEDANG DIKERJAKAN**
  (bagian *Offline* sudah lengkap: Tata Letak/Efek/Bel/pintasan lain di 1 panel;
  bagian *Online* masih pintasan sederhana ke tab "Mode & Peta", belum ada UI
  tersendiri di panel ini)

Selain itu, di sesi yang sama juga sudah ditambahkan (di luar urutan
C→B→A di atas, sebagai perbaikan/permintaan terpisah):

- Tombol pintasan keyboard **M** (mute/unmute YouTube + hentikan bel yang
  sedang bunyi) dan **Alt+H** (sembunyikan/tampilkan scrollbar Studio)
- Perbaikan bug: toolbar bawah 🎵 Kidung sekarang mengingat status buka/tutup
  lintas swipe/navigasi (sebelumnya selalu ke-reset terbuka)
- Perbaikan bug: kolom Alkitab mode sync (2/3-kolom) tidak lagi "kegeser ke
  atas" saat digulir dalam mode fullscreen (tinggi kotak sekarang dihitung
  lewat JS `window.visualViewport`, bukan cuma andalkan `vh`/`dvh`)
- Perbaikan tampilan header saat fullscreen (ruang vertikal benar-benar
  dihemat, bukan cuma logo disembunyikan tanpa manfaat)
- **Monitor 3 (Monitor Pembicara)** -- jendela ke-3 baru (`monitor.html`),
  menampilkan "Sekarang"/"Selanjutnya" dari Kumpulan Ayat untuk pembicara,
  layar hitam "END OF SLIDE" kalau item terakhir sudah tayang

**Belum dikerjakan / masih tertunda:**
- Bagian *Online* dari Menu Cepat ⚡ belum punya UI sendiri (playlist YouTube
  berurutan untuk layar besar, dll -- masih sebatas catatan rencana)
- Perluasan pintasan keyboard ke huruf q-w-e-r-t-y-u-i-o-p (direncanakan,
  belum ditugaskan ke aksi apa pun)
- Konsolidasi README ini masih terbatas pada README.md +
  ROADMAP-STATUS-TERKINI.md -- `ROADMAP-ai-presentation.md` &
  `ROADMAP-drive-sync.md` BELUM ikut digabung (dokumen teknis terpisah,
  sengaja tidak disentuh dulu sampai ada konfirmasi apakah perlu ikut
  digabung juga)

---

# 1. 🧱 CORE APLIKASI

- [x] Aplikasi web statis/PWA tanpa build/backend utama
- [x] Membaca Alkitab dari data lokal browser setelah sinkronisasi awal
- [x] IndexedDB untuk penyimpanan lokal
- [x] Login berbasis data Google Sheet yang pernah tersinkron
- [x] LocalStorage untuk status login
- [x] Multi-bahasa Alkitab
- [x] Pencarian ayat/referensi
- [x] Pencarian kata di seluruh Alkitab
- [x] Membaca satu pasal penuh
- [x] Rencana baca
- [x] Catatan ayat
- [x] Pembacaan suara
- [x] Tema tampilan
- [x] Ukuran teks
- [x] Full screen
- [x] Sinkronisasi data tertentu ke Google Sheet
- [x] Log aktivitas
- [x] Level pengguna
- [x] Pengumuman
- [x] AI Chat
- [x] Mode Tamu
- [x] Akun baru + persetujuan administrator
- [x] Notifikasi/lonceng dasar
- [x] Pengaturan
- [x] Media
- [x] Kidung
- [x] Kidung Anak
- [x] Kumpulan Ayat / collections
- [x] Presentation Studio
- [x] Present screen
- [x] Peta
- [~] Arsitektur community management yang menyatukan semua fungsi
- [ ] Dashboard utama yang secara eksplisit menggabungkan Daily + Weekly + Community + Visitation + Event
- [ ] Role/permission komunitas yang lebih granular untuk data pelayanan

---

# 2. 💾 LOCAL-FIRST / OFFLINE ENGINE

## Sudah ada

- [x] IndexedDB untuk data Alkitab
- [x] Data lokal untuk penggunaan setelah sinkronisasi
- [x] Login offline setelah data pengguna pernah tersinkron
- [x] Sinkronisasi ulang Alkitab
- [x] Sinkronisasi ulang pengguna
- [x] Antrean upload media ketika offline/gagal
- [x] Cache/local media workflow yang sudah dibangun
- [x] Drive sync
- [x] Link publik Drive opt-in
- [x] Pemakaian Drive

## Yang masih perlu dibuat/ditingkatkan

- [ ] Offline queue generik untuk seluruh modul Community
- [ ] Status `LOCAL / SYNCING / SYNCED / CONFLICT / ERROR`
- [ ] Retry queue untuk semua operasi
- [ ] Conflict detection
- [ ] Conflict resolution
- [ ] `last_synced_at` per record
- [ ] Version/revision per record
- [ ] Audit trail perubahan
- [ ] Export/import seluruh Community data
- [ ] Backup lokal satu paket
- [ ] Restore dengan validasi
- [ ] Recovery setelah browser storage dibersihkan

**Prinsip:** internet mati tidak boleh menghentikan pembacaan, presentasi, jadwal acara, game, map lokal, atau data yang sudah tersimpan secara lokal.

---

# 3. 📖 BIBLE ENGINE

- [x] Database/Sheet Alkitab multi-bahasa
- [x] Pembersihan markup teknis ayat
- [x] Nama kitab untuk navigasi
- [x] Search referensi
- [x] Search kata
- [x] Baca pasal penuh
- [x] Rencana baca
- [x] Bacaan bersuara
- [x] Tampilan paralel/kolom
- [x] Pencarian banyak referensi sekaligus
- [x] Catatan ayat
- [x] Footnote handling
- [x] Kumpulan Ayat
- [x] Pokok Kitab
- [x] Garis Besar
- [x] Sinkron Pokok/Garis Besar
- [x] Pembatasan kitab Mode Tamu dari Sheet
- [x] Bible dapat dipakai sebagai sumber presentation
- [ ] Search semantik/offline berdasarkan makna/topik
- [ ] Quick verse search khusus operator presentasi
- [ ] Riwayat ayat yang baru ditayangkan
- [ ] Favorites operator presentation
- [ ] Paket Bible offline yang dapat diekspor/import antar laptop

---

# 4. 🎵 KIDUNG / SONG ENGINE

- [x] Database Kidung
- [x] Kidung presentation
- [x] Kidung Anak MVP
- [x] Salin teks
- [x] Full screen
- [x] Swipe HP
- [x] Navigasi ◀/▶
- [x] Syair ganda No. 388
- [x] Badge birama/pola suku kata
- [x] Sejarah & Cara Baca
- [x] Ukuran/jenis huruf Kidung
- [x] Kidung masuk ke workflow presentation
- [x] Link media dari HP
- [ ] Song setlist lengkap untuk satu event
- [ ] Auto-follow verse/chorus/bridge saat presentation
- [ ] Riwayat lagu yang pernah ditayangkan
- [ ] Export/import song pack offline

---

# 5. 📚 COLLECTION / CONTENT ENGINE

- [x] Kumpulan Ayat
- [x] Kumpulan dapat memuat berbagai tipe konten
- [x] Mode Layar dapat disimpan ke Kumpulan Ayat
- [x] Media
- [x] PDF/gambar/Word/PPT sebagai media presentation
- [x] Link YouTube/Canva/SoundCloud
- [x] Drive media
- [x] Share workflow yang sudah tersedia
- [x] Ownership tracking media
- [x] Approval penghapusan file tertentu
- [ ] Satu format Event Pack untuk seluruh konten
- [ ] Template event yang dapat di-clone
- [ ] Validasi semua asset sebelum acara
- [ ] Laporan asset yang hilang
- [ ] Preload/prepare media sebelum event

---

# 6. 🖥️ PRESENTATION STUDIO

## Sudah ada

- [x] Studio Presentasi
- [x] Layar 2 / present.html
- [x] Timer
- [x] Stopwatch
- [x] Lap/penanda Stopwatch
- [x] Ukuran timer terpisah
- [x] Ukuran teks sampai 480%
- [x] Pen/stylus
- [x] Warna pastel pen
- [x] Ukuran pen
- [x] Pointer
- [x] Kaca pembesar
- [x] Mode layar
- [x] Welcome
- [x] Next Up
- [x] Istirahat
- [x] Ice Breaker
- [x] Olahraga
- [x] Renungan Malam
- [x] Label acara berikutnya
- [x] Peta interaktif
- [x] Titik peta dari tabel
- [x] Kalibrasi 2 titik
- [x] Kategori/checklist peta
- [x] Kartu info lokasi
- [x] Data luas/penduduk manual
- [x] Peta penuh/batal fokus
- [x] Split-screen camera/news foundation
- [x] Efek panggung confetti
- [x] Reaksi emoji
- [x] Drumroll
- [x] Tepuk tangan
- [x] Ding
- [x] Fanfare
- [x] Ta-da

## Masih kurang

- [ ] Menu Cepat ⚡ yang benar-benar menyatukan semua mode
- [ ] Event timeline satu klik
- [ ] LIVE / NEXT / AFTER yang selalu terlihat operator
- [ ] Stage timer khusus pembicara
- [ ] Video bumper/loop pembuka
- [ ] Logo breathing/glow
- [ ] Split-screen Kamera + Berita terhubung penuh ke workflow
- [ ] Split-screen dapat tukar kiri/kanan dari workflow utama
- [ ] Live polling
- [ ] Live Q&A
- [ ] Kuis interaktif
- [ ] Social wall
- [ ] Caption otomatis
- [ ] Multi-screen routing yang lengkap
- [ ] Emergency mode terpusat
- [ ] Fallback media otomatis

---

# 7. 🎨 ATMOSPHERE ENGINE

Tujuan: layar 200 inch untuk ±1.000 pemuda harus terasa modern, tetapi tidak mengganggu doa/Firman.

- [x] Preset Welcome
- [x] Preset Next Up
- [x] Preset Istirahat
- [x] Preset Ice Breaker
- [x] Preset Olahraga
- [x] Preset Renungan Malam
- [~] Perbedaan nuansa tiap jenis layar
- [ ] Preset Morning
- [ ] Preset Prayer khusus 05:30
- [ ] Preset Word
- [ ] Preset Worship
- [ ] Preset Message
- [ ] Preset Meal
- [ ] Preset Night Reflection
- [ ] Pengaturan brightness/opacity/motion per preset
- [ ] Motion level: very low / low / medium / high
- [ ] Auto atmosphere berdasarkan jam
- [ ] Auto atmosphere berdasarkan jenis acara

### Prinsip visual

- [ ] Typography sangat besar
- [ ] Safe area
- [ ] High readability dari belakang ruangan
- [ ] Animasi lambat untuk doa
- [ ] Background tidak terlalu ramai saat Firman
- [ ] Motion lebih aktif hanya saat ice breaking/worship
- [ ] Fallback ke background statis

---

# 8. ⏰ EVENT ENGINE — 3 JAM / 1 HARI / 3 HARI 3 MALAM

## Template event

- [ ] Event 3 jam
- [ ] Event 1 hari
- [ ] Event 3 hari
- [ ] Event 3 hari 3 malam
- [ ] Custom event
- [ ] Duplicate event
- [ ] Save event template
- [ ] Clone event

## Timeline

- [ ] Timeline visual
- [ ] Start/end time
- [ ] Current event
- [ ] Next event
- [ ] After-next event
- [ ] Auto-start
- [ ] Manual override
- [ ] Delay event
- [ ] Skip event
- [ ] Extend event
- [ ] Emergency break

## Contoh event 3 jam

- [ ] Welcome
- [ ] Worship
- [ ] Bible
- [ ] Message
- [ ] Break
- [ ] Ice breaker
- [ ] Prayer
- [ ] Closing

## Event 3 hari 3 malam

### Day 1
- [ ] Arrival
- [ ] Registration
- [ ] Welcome
- [ ] Morning/prayer jika diperlukan
- [ ] Session 1
- [ ] Session 2
- [ ] Meal
- [ ] Break
- [ ] Ice breaker
- [ ] Big meeting
- [ ] Night prayer

### Day 2
- [ ] Morning prayer
- [ ] Bible reading
- [ ] Breakfast
- [ ] Sessions
- [ ] Lunch
- [ ] Rest
- [ ] Games
- [ ] Fellowship
- [ ] Big meeting
- [ ] Night reflection

### Day 3
- [ ] Morning prayer
- [ ] Breakfast
- [ ] Final sessions
- [ ] Sharing
- [ ] Prayer
- [ ] Follow-up
- [ ] Closing
- [ ] Departure

---

# 9. 🌅 MORNING / PRAYER / NIGHT EXPERIENCE

## 05:30 Morning Prayer

- [ ] Automatic Morning Prayer mode
- [ ] Soft sunrise background
- [ ] Very slow motion
- [ ] Low brightness
- [ ] Large simple typography
- [ ] "O LORD JESUS" / prayer phrase screen
- [ ] Scripture screen
- [ ] Quiet timer
- [ ] No distracting effects

## Night

- [ ] Night atmosphere
- [ ] Reflection prompt
- [ ] Prayer
- [ ] Tomorrow preview
- [ ] Quiet countdown

---

# 10. 🍽️ MEAL / BREAK ENGINE

- [ ] Breakfast mode
- [ ] Lunch mode
- [ ] Dinner mode
- [ ] Coffee break mode
- [ ] Tea break mode
- [ ] Countdown to next session
- [ ] Next location
- [ ] Announcement
- [ ] Menu/meal information
- [ ] Safety/emergency information
- [ ] Automatic schedule transition

---

# 11. 🎮 ICE BREAKING & YOUTH ENGINE

## Database

- [ ] Game database
- [ ] Game categories
- [ ] Duration
- [ ] Difficulty
- [ ] Number of players
- [ ] Indoor/outdoor
- [ ] Required equipment
- [ ] Instructions

## Games

- [ ] This or That
- [ ] Find Someone Who
- [ ] Bible Quiz
- [ ] True/False
- [ ] Emoji Bible
- [ ] Guess the Song
- [ ] Guess Bible Character
- [ ] 30 Second Challenge
- [ ] Group Challenge
- [ ] Random Question

## Runtime

- [ ] Random game
- [ ] Surprise Me
- [ ] Duration filter
- [ ] Countdown
- [ ] Score/vote if needed
- [ ] Reset
- [ ] Offline operation

---

# 12. 🗺️ COMMUNITY MAP — 200+ LOKAL

## Fondasi yang sudah ada

- [x] Peta
- [x] Kalibrasi
- [x] Daftar titik dari tabel
- [x] Kategori/checklist
- [x] Pin lokasi
- [x] Fokus lokasi
- [x] Peta penuh
- [x] Kartu informasi lokasi
- [x] Data luas
- [x] Data penduduk
- [x] 514 kabupaten/kota sebagai data referensi

## Pengembangan berikutnya

- [ ] Database resmi 200+ lokal
- [ ] ID unik setiap lokal
- [ ] Nama lokal
- [ ] Kota/kabupaten
- [ ] Provinsi
- [ ] Koordinat
- [ ] Alamat umum
- [ ] Jadwal pertemuan
- [ ] Kontak umum
- [ ] Kategori lokal
- [ ] Status aktif
- [ ] Foto lokasi
- [ ] Catatan umum
- [ ] Filter wilayah
- [ ] Search lokal
- [ ] Statistik lokasi
- [ ] Import CSV
- [ ] Import Excel
- [ ] Export CSV
- [ ] Export Excel
- [ ] Route/open external map
- [ ] Map presentation mode
- [ ] Map community mode

---

# 13. 🤝 COMMUNITY — SALING MENGUATKAN

Buat modul yang fokus pada hubungan, bukan social media umum.

- [ ] Send encouragement
- [ ] Share verse
- [ ] Share prayer
- [ ] Thank you
- [ ] Short update
- [ ] Prayer request
- [ ] Mark "I prayed"
- [ ] Follow-up
- [ ] Private message jika memang diperlukan
- [ ] Group message
- [ ] Local announcement
- [ ] Regional announcement
- [ ] Expiration
- [ ] Permission

Contoh:

```text
🤝 ENCOURAGE

Terus maju dalam Tuhan.
Kami mendoakanmu.

📖 Scripture

[ SEND ]
```

---

# 14. 🙏 PRAYER NETWORK

- [ ] Prayer request
- [ ] Private prayer request
- [ ] Group prayer request
- [ ] Mark as prayed
- [ ] Prayer count
- [ ] Prayer reminder
- [ ] Answered prayer
- [ ] Archive
- [ ] Expiration
- [ ] Visibility control
- [ ] Follow-up

**Privacy:** data doa yang bersifat pribadi tidak boleh otomatis terlihat oleh semua orang.

---

# 15. 🚶 PENJENGUKAN / VISITATION

Ini adalah salah satu modul terpenting untuk penggunaan nyata setiap minggu.

## Workflow

```text
NEED FOLLOW-UP
      ↓
ASSIGN
      ↓
CONTACT
      ↓
VISIT
      ↓
RECORD
      ↓
FOLLOW-UP
      ↓
COMPLETED
```

Checklist:

- [ ] Daftar perlu dijenguk
- [ ] Prioritas
- [ ] Assignment kepada pelayan
- [ ] Jadwal kunjungan
- [ ] Status planned
- [ ] Status contacted
- [ ] Status visited
- [ ] Status follow-up
- [ ] Status completed
- [ ] Catatan singkat
- [ ] Next follow-up date
- [ ] Reminder
- [ ] Riwayat kunjungan
- [ ] Privacy per role

Jangan menyimpan atau menampilkan detail pribadi yang tidak diperlukan.

---

# 16. 💛 FOLLOW-UP ENGINE

- [ ] Today's follow-up
- [ ] Overdue follow-up
- [ ] Upcoming follow-up
- [ ] Assigned person
- [ ] Contact method
- [ ] Last contact
- [ ] Next contact
- [ ] Reminder
- [ ] Completed
- [ ] History
- [ ] Archive

Tujuan: **tidak ada orang yang hilang dari perhatian hanya karena acara sudah selesai.**

---

# 17. 👥 FELLOWSHIP / GROUP

- [ ] Group database
- [ ] Group leader
- [ ] Members
- [ ] Meeting schedule
- [ ] Attendance
- [ ] Prayer
- [ ] Bible reading
- [ ] Follow-up
- [ ] Announcement
- [ ] Group location
- [ ] Group history

---

# 18. 🧑‍🤝‍🧑 YOUTH 17–24

Dashboard youth sebaiknya tidak terasa seperti software administrasi.

- [ ] Today's Word
- [ ] Pray
- [ ] Connect
- [ ] Serve
- [ ] Grow
- [ ] Fellowship
- [ ] Challenge
- [ ] Bible reading
- [ ] Games
- [ ] Event
- [ ] Service/ministry
- [ ] Follow-up
- [ ] Encouragement

---

# 19. 📅 DAILY DASHBOARD

Contoh:

```text
TODAY

📖 WORD
🙏 PRAY
🤝 CONNECT
🚶 VISIT
💛 FOLLOW-UP
👥 FELLOWSHIP
📢 ANNOUNCEMENT
📅 EVENTS
```

Checklist:

- [ ] Today's Word
- [ ] Today's prayer
- [ ] Today's reading
- [ ] Today's events
- [ ] Today's follow-up
- [ ] Today's visitation
- [ ] Today's announcements
- [ ] Today's fellowship
- [ ] Today's service

---

# 20. 📆 WEEKLY DASHBOARD

Contoh:

```text
THIS WEEK

MON  📖 Reading
TUE  🙏 Prayer
WED  👥 Fellowship
THU  📖 Reading
FRI  🤝 Encouragement
SAT  🏠 Preparation
SUN  ⛪ Meeting
```

Checklist:

- [ ] Weekly schedule
- [ ] Weekly meeting
- [ ] Weekly Bible reading
- [ ] Weekly prayer
- [ ] Weekly fellowship
- [ ] Weekly service
- [ ] Weekly attendance
- [ ] Weekly follow-up
- [ ] Weekly encouragement
- [ ] Weekly summary

---

# 21. 📢 ANNOUNCEMENT / NEWS

- [x] Announcement dasar sudah ada
- [ ] Local announcement
- [ ] Group announcement
- [ ] Regional announcement
- [ ] Event announcement
- [ ] Priority
- [ ] Start date
- [ ] Expiration date
- [ ] Target audience
- [ ] Offline cache
- [ ] Online update
- [ ] Presentation mode

---

# 22. 📱 WEB REMOTE

Fondasi remote perlu dikembangkan menjadi remote operator yang lengkap.

- [ ] Local web server
- [ ] QR connect
- [ ] PIN pairing
- [ ] Device name
- [ ] Multiple operators
- [ ] LIVE
- [ ] NEXT
- [ ] PREVIOUS
- [ ] BLACK
- [ ] BIBLE
- [ ] SONG
- [ ] VIDEO
- [ ] GAME
- [ ] COUNTDOWN
- [ ] ANNOUNCEMENT
- [ ] EMERGENCY
- [ ] Connection status
- [ ] Reconnect
- [ ] Permission per operator

Target arsitektur:

```text
Laptop / Presentation PC
          │
       Wi-Fi LAN
          │
 ┌────────┼─────────┐
 ▼        ▼         ▼
Phone 1  Phone 2   Tablet
```

Internet tidak wajib.

---

# 23. 📺 MULTI-SCREEN

- [ ] Main projector
- [ ] Operator preview
- [ ] Stage monitor
- [ ] News screen
- [ ] Break screen
- [ ] Map screen
- [ ] QR interaction screen
- [ ] Camera screen
- [ ] Independent screen content
- [ ] Screen routing

---

# 24. 🚨 EMERGENCY / FALLBACK

- [ ] Emergency button
- [ ] Black screen
- [ ] Safe background
- [ ] Stop video
- [ ] Reload current
- [ ] Restart current
- [ ] Offline mode
- [ ] Media fallback
- [ ] Network fallback
- [ ] Database fallback
- [ ] Recovery after app restart

Prinsip:

> **Peserta tidak boleh melihat error teknis.**

---

# 25. ☁️ ONLINE + OFFLINE SYNC

Internet hanya menjadi akselerator.

```text
ONLINE
   ↓
SYNC
   ↓
LOCAL COPY
   ↓
EVENT / DAILY USE
```

Jika internet mati:

```text
OFFLINE
   ↓
LOCAL COPY
   ↓
CONTINUE
```

Checklist:

- [ ] Generic sync engine
- [ ] Offline queue
- [ ] Retry
- [ ] Conflict detection
- [ ] Conflict resolution
- [ ] Sync status
- [ ] Last sync
- [ ] Manual sync
- [ ] Automatic sync
- [ ] Backup
- [ ] Restore

---

# 26. 🔐 PRIVACY / PERMISSION

Karena aplikasi mulai menyimpan data komunitas, jangan gunakan prinsip "semua orang melihat semuanya".

Model yang disarankan:

```text
ADMIN
  ↓
REGIONAL / AREA
  ↓
LOCAL
  ↓
GROUP
  ↓
PERSONAL
```

Checklist:

- [ ] Role permission
- [ ] Data visibility
- [ ] Private notes
- [ ] Private prayer request
- [ ] Visitation privacy
- [ ] Follow-up privacy
- [ ] Audit log
- [ ] Delete policy
- [ ] Export policy
- [ ] Data retention policy

---

# 27. 📦 EVENT PACK / BACKUP

- [ ] Export event
- [ ] Import event
- [ ] Export schedule
- [ ] Import schedule
- [ ] Export Bible references
- [ ] Export song setlist
- [ ] Export games
- [ ] Export themes
- [ ] Validate missing assets
- [ ] Media checksum
- [ ] Version number
- [ ] Backup before event
- [ ] Restore test before event

---

# 28. 🧪 TESTING — WAJIB SEBELUM ACARA BESAR

## Offline

- [ ] Internet dicabut
- [ ] Bible tetap jalan
- [ ] Kidung tetap jalan
- [ ] Collection tetap jalan
- [ ] Schedule tetap jalan
- [ ] Timer tetap jalan
- [ ] Game tetap jalan
- [ ] Map tetap jalan
- [ ] Presentation tetap jalan
- [ ] Remote LAN tetap jalan

## Hardware

- [ ] Projector 200 inch
- [ ] 16:9
- [ ] HDMI
- [ ] Sound system
- [ ] Laptop lama
- [ ] Laptop utama
- [ ] Second display

## Event stress test

- [ ] 3-hour event simulation
- [ ] 1-day event simulation
- [ ] 3-day event simulation
- [ ] 1,000-person presentation simulation
- [ ] 200+ locations loaded
- [ ] Large Bible database
- [ ] Large media library
- [ ] Multiple remote devices

## Failure test

- [ ] Internet disconnected
- [ ] Wi-Fi disconnected
- [ ] Video missing
- [ ] Image missing
- [ ] Browser refresh
- [ ] App restart
- [ ] Laptop restart
- [ ] Projector reconnect
- [ ] Second screen reconnect
- [ ] Remote reconnect

---

# 29. 🏗️ PRIORITAS PEMBANGUNAN

## PHASE 0 — AUDIT

- [x] Existing project inspected/documented
- [ ] Automated feature inventory
- [ ] Confirm every checklist item against source code
- [ ] Identify duplicate systems
- [ ] Identify technical debt

## PHASE 1 — STABILKAN PRESENTATION

- [ ] End-to-end browser test
- [ ] Multi-screen
- [ ] Emergency
- [ ] Fallback
- [ ] Event timeline

## PHASE 2 — COMMUNITY FOUNDATION

- [ ] Location database
- [ ] 200+ local records
- [ ] Group structure
- [ ] Search
- [ ] Permission

## PHASE 3 — DAILY

- [ ] Today's Word
- [ ] Daily Prayer
- [ ] Reading
- [ ] Encouragement
- [ ] Daily Dashboard

## PHASE 4 — WEEKLY

- [ ] Weekly schedule
- [ ] Attendance
- [ ] Fellowship
- [ ] Follow-up
- [ ] Weekly Dashboard

## PHASE 5 — VISITATION

- [ ] Visitation queue
- [ ] Assignment
- [ ] Visit record
- [ ] Follow-up
- [ ] Reminder

## PHASE 6 — EVENT ENGINE

- [ ] 3-hour event
- [ ] 1-day event
- [ ] 3-day event
- [ ] Event template
- [ ] Schedule engine

## PHASE 7 — YOUTH EXPERIENCE

- [ ] Ice breaking
- [ ] Games
- [ ] Quiz
- [ ] Voting
- [ ] QR interaction

## PHASE 8 — REMOTE & PROFESSIONAL AV

- [ ] Web remote
- [ ] Stage monitor
- [ ] Multi-screen
- [ ] Atmosphere engine
- [ ] Emergency
- [ ] Fallback

## PHASE 9 — SYNC

- [ ] Offline queue
- [ ] Central sync
- [ ] Conflict handling
- [ ] Multi-device

## PHASE 10 — ADVANCED

- [ ] AI
- [ ] Speech-to-Bible
- [ ] Live caption
- [ ] OBS
- [ ] NDI
- [ ] Camera
- [ ] Analytics

---

# 30. 📊 MASTER STATUS — KONDISI PROJECT SAAT INI

Berdasarkan dokumentasi project yang ada saat ini, gambaran kasarnya:

| Area | Status | Keterangan |
|---|---|---|
| Alkitab | [x] | Fondasi sangat kuat |
| Kidung | [x] | Sudah terintegrasi |
| Kidung Anak | [x] | MVP sudah ada |
| Kumpulan Ayat | [x] | Sudah ada |
| Media | [x] | Sudah ada + Drive |
| Drive Sync | [x] | Sudah cukup maju |
| AI Chat | [x] | Sudah ada |
| Presentation Studio | [x] | Sudah maju -- Mode Cepat 11 tata letak, Menu Cepat ⚡ (offline), Efek Panggung (confetti/seruan/bel), Monitor 3 speaker |
| Timer | [x] | Sudah ada |
| Stopwatch | [x] | Sudah ada |
| Pen/Pointer | [x] | Sudah ada |
| Magnifier | [x] | Sudah ada |
| Mode Layar | [x] | Sudah ada beberapa preset |
| Peta | [x] | Fondasi kuat |
| 514 Kab/Kota | [x] | Data referensi sudah ada |
| 200+ Lokal | [~] | Peta/fondasi ada, community database belum lengkap |
| Split Camera/News | [x] | 8 orientasi kamera/teks + kamera-bulat & teks-bulat (5 posisi, ukuran 200-1200px) sudah bisa dipakai dari Mode Cepat |
| Effects | [x] | Confetti/reaksi emoji/seruan teks besar/bel + pintasan Break Time, semua bisa lewat Menu Cepat ⚡ |
| Daily | [~] | Komponen dasar ada, dashboard terpadu belum ada |
| Weekly | [ ] | Belum menjadi workflow terpadu |
| Prayer Network | [ ] | Belum |
| Encouragement | [ ] | Belum |
| Visitation | [ ] | Belum |
| Follow-up | [ ] | Belum |
| Fellowship/Group | [ ] | Belum |
| Community Dashboard | [ ] | Belum |
| Event 3 Jam | [~] | Komponen presentasi ada, event engine terpadu belum ada |
| Event 1 Hari | [ ] | Belum menjadi template engine |
| Event 3 Hari 3 Malam | [~] | Komponen tersedia, timeline engine belum lengkap |
| Ice Breaking Engine | [~] | Preset sudah ada, database/runtime game belum lengkap |
| Web Remote | [~] | Perlu audit fondasi aktual dan dilanjutkan |
| Multi-screen | [~] | Layar 2 (jemaat) matang; Monitor 3 (Monitor Pembicara, Sekarang/Selanjutnya) baru ditambahkan; belum ada routing multi-Layar-2 (beberapa proyektor berbeda konten) |
| Emergency | [ ] | Belum lengkap |
| Offline Core | [x] | Sudah menjadi prinsip aplikasi |
| Generic Sync | [~] | Drive sync sudah kuat, community sync belum ada |
| Permission | [~] | Level pengguna ada, granular community permission belum |
| Backup/Restore | [~] | Sebagian ada melalui data/sync, event pack belum |
| Testing E2E | [!] | Banyak fitur baru belum diuji browser/hardware nyata |

---

# 31. 🚦 ATURAN UNTUK AI CODING AGENT

AI coding agent yang bekerja di project ini **WAJIB** mengikuti aturan berikut.

### Sebelum coding

1. Baca `README.md`.
2. Baca `ROADMAP-STATUS-TERKINI.md`.
3. Audit source code terkait.
4. Cari apakah fitur sudah ada.
5. Jangan membuat fungsi duplikat.
6. Jangan membuat database baru jika database existing dapat diperluas.
7. Jangan menghapus fitur existing.
8. Jangan merombak architecture tanpa alasan teknis.
9. Jika schema database berubah, buat migration/compatibility strategy.
10. Tentukan status fitur sebelum dan sesudah pekerjaan.

### Saat coding

- Kerjakan satu phase/sub-feature pada satu waktu.
- Gunakan komponen yang sudah ada.
- Pertahankan backward compatibility.
- Jangan mengubah data lama tanpa migration.
- Jangan mengandalkan internet untuk core functionality.
- Jangan menambahkan dependency besar tanpa alasan.
- Pastikan error handling dan fallback.

### Setelah coding

Laporkan:

```text
## AUDIT
...

## CHANGES
...

## COMPLETED
[x] ...

## IN PROGRESS
[~] ...

## TODO
[ ] ...

## BUGS
[!] ...

## TEST
...

## NEXT STEP
...
```

**Jangan mengatakan `[x] COMPLETED` jika hanya kode sudah ditulis tetapi belum diuji.**

---

# 32. 🏆 DEFINISI SOFTWARE YANG SUDAH MATANG

Software dianggap matang apabila dapat dipakai untuk:

### SETIAP HARI

`📖 WORD → 🙏 PRAY → 🤝 CONNECT → 🌱 GROW`

### SETIAP MINGGU

`📅 SCHEDULE → 👥 FELLOWSHIP → 🚶 VISIT → 💛 FOLLOW-UP`

### 200+ LOKAL

`🗺️ MAP → 📍 LOCAL → 👥 GROUP → 🤝 CONNECT`

### ACARA 3 JAM

`WELCOME → WORSHIP → WORD → BREAK → ICE BREAK → PRAYER → CLOSING`

### ACARA 3 HARI 3 MALAM

`DAY 1 → DAY 2 → DAY 3 → FOLLOW-UP`

### INTERNET MATI

`OFFLINE → CONTINUE`

### PERANGKAT BERMASALAH

`FALLBACK → RECOVER → CONTINUE`

---

# 33. ❤️ PRINSIP TERAKHIR

Aplikasi ini bukan untuk menggantikan fellowship.

Aplikasi ini bukan untuk menggantikan shepherding.

Aplikasi ini bukan untuk menggantikan doa.

Aplikasi ini bukan untuk menggantikan pembacaan Firman.

Aplikasi ini adalah **alat untuk membantu orang saling memperhatikan, saling menguatkan, saling mengunjungi, membaca Firman, berdoa, berkumpul, dan melayani.**

### CORE EXPERIENCE

```text
             📖 WORD
                │
                ▼
             🙏 PRAY
                │
                ▼
          🤝 CONNECT
                │
                ▼
           🚶 VISIT
                │
                ▼
          💛 ENCOURAGE
                │
                ▼
           👥 FELLOWSHIP
                │
                ▼
             🔥 SERVE
                │
                ▼
             🌱 GROW
```

**Build once. Reuse everywhere. Offline first. People first.**

---

# 34. 📝 CATATAN PEMBARUAN STATUS

Setiap kali development berlangsung, tambahkan tanggal dan perubahan di sini.

Format:

```text
## YYYY-MM-DD — [FITUR]

[x] Selesai
[~] Sebagian
[ ] Belum
[!] Perlu perbaikan

Files changed:
- ...

Test:
- ...

Known issues:
- ...

Next:
- ...
```

Dengan demikian README ini dapat menjadi **dokumen hidup** dan selalu menunjukkan posisi project yang sebenarnya.

---

## 2026-09-09 — Presentation Studio: Tata Letak (C), Gamifikasi Offline (B)

[x] Selesai

Files changed:
- present.html, index.html, js/presentation-studio.js, js/collections.js, css/style.css

Test:
- node --check semua file JS lolos; semua blok <script> di index.html/present.html
  divalidasi lolos parse. BELUM diuji di browser/perangkat proyektor sungguhan.

Known issues:
- Bug lama "Balik Sisi" (camSplitReverse tidak pernah terkirim live ke Layar 2)
  ditemukan & diperbaiki sekalian saat menambah orientasi baru.

Next:
- Lanjut ke Fitur A (Menu Cepat ⚡).

## 2026-09-09/10 — Presentation Studio: Menu Cepat ⚡ (A, sebagian), pintasan M/Alt+H, Monitor 3

[~] Sebagian (bagian Offline Menu Cepat ⚡ selesai, bagian Online baru pintasan tab)

Files changed:
- index.html, css/style.css, js/presentation-studio.js, js/presentation.js,
  js/app.js, js/kidung-ui.js, monitor.html (baru)

Test:
- node --check semua file JS lolos; validasi <script> index.html/present.html/
  monitor.html lolos; brace-balance css/style.css diverifikasi (1114=1114).
  BELUM diuji end-to-end di browser/perangkat proyektor sungguhan, BELUM diuji
  di komputer non-laptop sungguhan (laporan awal soal scroll macet).

Known issues:
- Bagian Online Menu Cepat ⚡ belum punya UI sendiri (baru pintasan ke tab
  Mode & Peta).
- Perluasan shortcut q-w-e-r-t-y-u-i-o-p belum ditugaskan ke aksi apa pun.

Next:
- Selesaikan bagian Online Menu Cepat ⚡.
- Uji Monitor 3 & perbaikan scroll/fullscreen di perangkat sungguhan (laptop
  DAN komputer non-laptop dengan mouse biasa).

## 2026-09-10 — Perbaikan bug Alkitab & Kidung (dari laporan operator)

[x] Selesai (kode), [!] belum diuji perangkat sungguhan

Files changed:
- js/kidung-ui.js, js/app.js, css/style.css

Test:
- node --check lolos. BELUM diuji manual di HP/komputer sungguhan.

Known issues:
- Perbaikan tinggi kolom mode sync (vh/dvh -> JS visualViewport) mengandalkan
  asumsi soal timing browser HP yang belum bisa diverifikasi tanpa perangkat
  sungguhan -- perlu dikonfirmasi operator apakah masalah "kegeser ke atas"
  benar-benar hilang.

Next:
- Konfirmasi dari operator setelah dicoba di perangkat sungguhan.

## 2026-09-10 (lanjutan) — Monitor Pembicara: cuplikan VIDEO tanpa suara + offline, klarifikasi status Peta 3D

[x] Selesai (kode), [!] belum diuji perangkat sungguhan

1. **Monitor Pembicara (Monitor 3, monitor.html) sekarang juga bisa
   menampilkan CUPLIKAN VIDEO** (YouTube/Video Lokal) dari yang sedang
   tayang di Layar 2 -- SELALU TANPA SUARA (video/iframe di monitor.html
   dipaksa `muted` + param `mute=1`, apa pun status mute/unmute Layar 2).
   **Suara sesungguhnya untuk jemaat TIDAK berubah sama sekali** -- tetap
   100% lewat Layar 2/sound system venue seperti logika lama.
   - Konten NON-video (ayat, kidung, teks, slide gambar/PDF, peta, mode
     layar, canva, soundcloud, dll) otomatis menyembunyikan area video
     di Monitor 3, balik ke tampilan teks Sekarang/Selanjutnya biasa.
   - Video Lokal (MP4) dikirim sebagai Blob lewat postMessage (jendela
     satu origin) -- tetap 100% offline, tidak butuh internet.
   - Play/Pause/Stop Video Lokal diteruskan supaya posisi pemutaran di
     Monitor 3 ikut sinkron; Mute/Unmute Layar 2 SENGAJA TIDAK
     diteruskan (Monitor 3 memang selalu senyap).
2. **Menu/tombol pembuka Monitor Pembicara dipastikan HANYA ada di
   `js/presentation-studio.js`** (tombol "🖥️③ Monitor Pembicara"),
   tidak diduplikasi ke berkas lain mana pun -- dicek ulang sesuai
   permintaan.
3. **monitor.html sekarang mendaftarkan Service Worker (sw.js) sendiri**
   (pola sama seperti index.html/present.html), supaya jendela ini
   tetap bisa DIBUKA walau sedang offline. Halaman ini sudah 100%
   mandiri (CSS/JS inline, tidak memuat berkas lain), jadi begitu
   HTML-nya sendiri pernah tersimpan di cache (1x dibuka saat online),
   seluruh tampilan & logikanya ikut tersedia offline.
4. **Klarifikasi status "Peta 3D bisa rotasi" (ditanyakan operator)** --
   **BELUM ada** globe 3D sungguhan yang bisa diputar. Yang sudah ada
   cuma "🔮 Gaya Pin: 3D Berputar" (efek CSS gradient+animasi pada pin,
   peta dasarnya TETAP gambar 2D datar) -- lihat catatan keputusan
   operator 9 Sep 2026 di bagian 35 (arsip log, sesi ke-8): globe 3D
   sungguhan (bisa diputar, per-provinsi timbul, pakai data GeoJSON +
   Three.js) SENGAJA DITUNDA dulu sampai mode 2D yang sudah jadi dicoba
   di acara sungguhan -- ini pekerjaan besar terpisah (perlu data batas
   wilayah + library 3D baru), belum dikerjakan di sesi ini. Default
   tetap peta gambar 2D seperti sekarang; kalau operator ingin
   melanjutkan globe 3D (dengan saklar 2D/3D, 2D tetap default, 3D bisa
   diaktifkan tergantung kekuatan komputer), mohon konfirmasi supaya
   dikerjakan di sesi terpisah (bukan pekerjaan kecil).

Files changed:
- js/presentation.js (`postMonitorRaw()`, `postMonitorVideo()`,
  `postMonitorVideoControl()` -- infra pengiriman generik ke Monitor 3),
  js/presentation-studio.js (`syncMonitorVideoForPayload_()` disadap di
  `rawPost()`/`post()` -- 2 jalur TUNGGAL semua pengiriman ke Layar 2 --
  plus `clearMonitorVideo_()` di titik-titik yang memanggil
  Presentation.sendVerse/sendVerseMulti/sendKidung/sendFreeText
  LANGSUNG), monitor.html (area `#monVideoWrap`, penanganan pesan
  `speaker_video`/`speaker_video_control`, registrasi sw.js sendiri).

Test:
- node --check lolos untuk js/presentation.js & js/presentation-studio.js.
  Semua blok `<script>` embedded (index.html/present.html/monitor.html)
  lolos parse. BELUM diuji ujung-ke-ujung dengan monitor.html sungguhan
  di jendela ke-3 (terutama: mirroring Video Lokal berukuran besar lewat
  Blob postMessage, dan perilaku offline monitor.html setelah sw.js
  benar-benar meng-cache-nya).

Known issues:
- Belum diuji: apakah mengirim Blob Video Lokal ke 2 jendela sekaligus
  (Layar 2 + Monitor 3) terasa berat di laptop yang lebih tua/berkas
  video sangat besar -- kalau terasa berat, bisa dipertimbangkan opsi
  "jangan kirim video ke Monitor 3" sebagai toggle terpisah nanti.

Next:
- Uji end-to-end di perangkat sungguhan (buka Monitor Pembicara di
  jendela ke-3, coba tayangkan YouTube & Video Lokal, pastikan benar-
  benar tanpa suara & Layar 2 tidak terpengaruh).
- Tunggu konfirmasi operator soal lanjut/tidaknya globe 3D Peta
  Interaktif (poin 4 di atas).

---

# 35. 📜 ARSIP LOG DETAIL — Presentation Studio (sesi 1-8, sebelum README ini digabung jadi 1)

> Ini isi ASLI `ROADMAP-STATUS-TERKINI.md` (file terpisah sebelumnya),
> dipindahkan ke sini APA ADANYA (cuma level heading diturunkan 1 tingkat
> supaya masuk struktur dokumen ini) supaya tidak ada riwayat yang hilang saat
> digabung jadi 1 README. Sesi ke-9 & ke-10 (Fitur C/B/A Menu Cepat, Monitor 3,
> perbaikan bug Alkitab/Kidung) sudah dicatat ringkas di bagian 34 di atas,
> bukan di sini (arsip ini cuma sampai sesi ke-8).

## 📋 Status Terkini — 27 Agustus 2026

### 🗓️ Keputusan operator (9 Sep 2026) — Mode 3D globe DITUNDA
Operator minta 2 model tersedia (2D & 3D, lewat saklar "🖥️ Mode Peta:
2D/3D" yang 2D-nya tidak berubah dari yang sudah ada), TAPI diputuskan
**ditunda dulu** -- mau coba & pakai mode 2D yang sudah jadi di acara
sungguhan dulu sebelum invest waktu ke globe 3D (pekerjaan besar).
Kalau nanti dilanjut: pin di mode 3D **harus tetap gaya "3D Berputar"**
yang sudah ada (sudah dikonfirmasi operator), globe-nya pakai data
GeoJSON batas wilayah + Three.js, pin dari lintang/bujur asli (data
514 kota yang sudah ada bisa dipakai ulang tanpa kalibrasi manual).
Tidak ada perubahan kode di sesi ini -- catatan keputusan saja.

### 🆕 Tambahan 9 Sep 2026 (sesi ke-8) — 🌐 Peta dari Online + 🎨 Gaya Peta (Komik/Artistik/Teritorial) + 🔮 Pin 3D Berputar
Tahap PERTAMA dari usulan "peta 3D/gaya artistik" operator (dikerjakan
bertahap sesuai pilihan operator: mulai dari yang paling cepat dulu,
globe 3D sungguhan BELUM dikerjakan -- lihat catatan di bawah):
- **🌐 "Ambil Peta Dasar dari Online (Wikimedia)"** -- tombol baru di
  atas dropzone unggah manual, cari & unduh gambar peta Indonesia polos
  dari **Wikimedia Commons** (API publik, bebas lisensi, CORS terbuka,
  tanpa API key) lewat `fetchOnlineBaseMap_()`. Hasilnya disimpan
  sebagai `map.imageDataUrl` PERSIS seperti unggah manual -- jadi cuma
  butuh internet SEKALI saat tombolnya ditekan, setelah itu tersimpan
  di localStorage & dipakai offline seperti biasa (kalibrasi/pin/dst
  semua tetap jalan tanpa perubahan).
- **🎨 "Gaya Peta Dasar"** -- dropdown baru: Biasa / Komik / Artistik /
  Teritorial (atlas tua). Diproses langsung di perangkat lewat Canvas
  (`generateMapStyleVariant_()`, filter warna + compositing bawaan
  browser) -- **BUKAN gambar AI baru**, cuma efek visual dari gambar
  yang sudah ada (hasil unggah manual ATAU ambil online di atas).
  Diproses SEKALI per gaya lalu di-cache (`map.styleVariants`), pindah
  gaya berikutnya instan & tetap offline.
- **🔮 "Gaya Pin: 3D Berputar"** -- dropdown baru di samping Gaya Peta:
  Standar (bulat datar, seperti sebelumnya) atau 3D Berputar. Efeknya
  gradient bulat mengkilap + sorot cahaya yang bergeser bolak-balik
  (dipadu animasi denyut yang sudah ada) memberi kesan bola/kelereng
  berputar -- **BUKAN model 3D sungguhan** (div CSS datar tidak punya
  sisi belakang) dan **BUKAN foto 360°** (operator konfirmasi maksud
  "360°" cuma animasi ikon, bukan foto panorama).
- Baik Gaya Peta maupun Gaya Pin **TIDAK otomatis dorong ke Layar 2**
  saat dipilih -- operator tetap tekan "▶️ Tampilkan Peta"/"🎯 Fokus"
  seperti biasa (konsisten dengan unggah gambar baru yang juga tidak
  auto-dorong), supaya penonton tidak kaget lihat operator sedang
  coba-coba gaya.
- Lolos `node --check` (JS) & semua blok `<script>` embedded di
  `index.html`/`present.html`.
- **Belum dikerjakan** (tahap berikutnya, kalau operator mau lanjut):
  Peta 3D globe sungguhan (bisa diputar, per-provinsi timbul) --
  operator sudah setuju ini boleh menyusul setelah tahap cepat ini;
  akan butuh data batas wilayah (GeoJSON) + Three.js, pekerjaan jauh
  lebih besar dari sesi ini.
- Berkas yang berubah: `index.html` (kontrol baru: tombol Ambil Online,
  dropdown Gaya Peta & Gaya Pin), `js/presentation-studio.js`
  (`fetchOnlineBaseMap_()`, `generateMapStyleVariant_()`,
  `effectiveMapImage_()`, wiring dropdown/tombol baru, `pinStyle`
  disertakan di semua payload `action:"show"/"focus"`), `css/style.css`
  (`.ps-pin-3d` + keyframes, dipakai pratinjau Studio),
  `present.html` (`.map-pin-dot.pin-3d` + keyframes, dipakai Layar 2).

### 🆕 Tambahan 9 Sep 2026 (sesi ke-7) — 🔄 Penduduk & Luas PER-KOTA otomatis (Wikidata), bukan manual lagi
Sebelumnya (sesi ke-3) luas/penduduk per kota SENGAJA manual (tidak ada
database bawaan). Operator sekarang minta ini otomatis, jadi ditambah
tanpa menghapus jalur manualnya (tetap ada sebagai cadangan):
- **Tombol "🔄 Wikidata" baru di tiap panel "📊 Data" pin** (Studio,
  tab "🖥️ Mode & Peta") -- ambil penduduk (properti Wikidata P1082) &
  luas (P2046) kota itu otomatis, isi ke 2 kotak di atasnya + catat
  sumber & tahun datanya.
- **Tombol massal baru "🔄 Perbarui Semua Populasi/Luas (Wikidata)"**
  di atas daftar Pin -- proses SEMUA pin yang sedang tampil (sesuai
  checklist kategori aktif) satu-satu dengan jeda ~0.4 detik antar-kota
  (bukan sekaligus paralel, supaya tidak membebani/di-*rate-limit*
  server Wikidata), status berjalan "(12/514) Kabupaten Sidoarjo... ✅11
  ⚠️1" ditulis live di bawah tombol. Untuk 514 kota bisa makan waktu
  beberapa menit -- ini wajar, bukan macet.
- **Cara kerja**: cari nama pin (mis. "Kabupaten Sidoarjo") lewat API
  publik `wbsearchentities` Wikidata (CORS terbuka, tanpa API key),
  cocokkan ke entitas Wikidata kota itu, lalu ambil klaim P1082/P2046
  paling baru/`preferred`, termasuk tahun datanya (qualifier "point in
  time") & referensi asalnya kalau tercatat di Wikidata (biasanya
  mengutip BPS/sumber resmi lain).
- **Sumber & tahun ikut tampil ke penonton** di kartu info Layar 2
  (baris kecil "Sumber: Wikidata (ref: ...)" di bawah baris
  Luas/Penduduk, `present.html` -> `renderMapInfoCard_()`) -- HANYA
  muncul kalau datanya memang dari Wikidata; kalau operator koreksi
  manual, baris sumber otomatis hilang lagi (tidak mengarang sumber
  untuk angka manual).
- **BPS tetap tidak dipakai langsung** (alasan sama seperti banner
  nasional sesi ke-6: API resminya butuh key & kemungkinan besar tidak
  mendukung CORS dari browser tanpa server perantara). Wikidata dipilih
  karena satu-satunya yang bisa diakses langsung, dan biasanya
  mengutip BPS sebagai sumber aslinya lewat referensi.
- **Isian manual TETAP ada** sebagai cadangan (kalau kota tidak
  ditemukan di Wikidata, operator offline, atau mau pakai angka dari
  sumber lain yang lebih dipercaya) -- tinggal ketik langsung di 2
  kotak yang sama, sumber otomatis dikosongkan supaya tidak salah
  atribusi.
- ⚠️ **BELUM diuji ujung-ke-ujung di jaringan sungguhan**, terutama:
  (1) akurasi pencocokan nama untuk kota yang labelnya di Wikidata beda
  dari nama resmi Kemendagri (kemungkinan ada beberapa dari 514 yang
  tidak ketemu/ketemu entitas yang salah -- makanya nama hasil
  pencocokan ("matchedLabel") ikut ditulis di status supaya operator
  bisa cek), dan (2) apakah rate-limit Wikidata cukup longgar untuk 500+
  panggilan berurutan dalam sekali proses massal.
- Lolos `node --check` (JS) & semua blok `<script>` embedded di
  `index.html`/`present.html`.
- Berkas yang berubah: `index.html` (tombol massal baru), 
  `js/presentation-studio.js` (`extractBestWikidataClaim_()`,
  `searchWikidataEntity_()`, `fetchCityDataAuto_()`, wiring tombol
  per-pin & massal), `present.html` (baris "Sumber:" di kartu info).

### 🆕 Tambahan 9 Sep 2026 (sesi ke-6) — 🌏 Banner Total Penduduk Indonesia (Nasional, auto-update)

Berbeda dari data penduduk PER-KOTA (di kartu info "🎯 Fokus", sudah ada
sebelumnya) — ini angka **nasional total Indonesia**, tampil sebagai
banner terpisah di Layar 2 pojok kiri-atas, independen dari zoom/fokus.

- **Tab "🖥️ Mode & Peta" → bagian baru "🌏 Total Penduduk Indonesia
  (Nasional)"** (di bawah "☑️ Kategori yang Ditampilkan"): status angka
  saat ini, toggle **"Tampilkan di Layar 2"**, tombol **"🔄 Perbarui
  Otomatis (Wikidata)"**, dan 3 kolom isian manual (Jumlah/Tahun/Sumber)
  + tombol **"💾 Simpan Manual"** sebagai cadangan.
- **Perbarui Otomatis** mengambil dari **Wikidata** (entitas Q252 =
  Indonesia, properti P1082 = populasi) — dipilih karena satu-satunya
  sumber terbuka yang mendukung diakses LANGSUNG dari browser (CORS
  terbuka) tanpa server tambahan (situs ini statis). Wikidata biasanya
  mengutip BPS/PBB sebagai referensi aslinya, dan link referensi itu
  ikut disalin sebagai "Sumber". BPS (`bps.go.id`) sendiri **tidak
  dipakai langsung** karena API resminya butuh API key + kemungkinan
  besar tidak mendukung CORS untuk dipanggil dari browser tanpa server
  perantara (di luar cakupan situs statis ini).
- **Toggle tampil/sembunyi & update angka dikirim LIVE** lewat action
  `"natpop"` yang TERPISAH dari action `"show"`/`"focus"`/`"zoom"` —
  supaya tidak ikut mereset zoom/posisi fokus kota yang sedang tayang
  saat operator sekadar menyembunyikan/menampilkan banner ini.
  Gambar peta Indonesia SENDIRI **tidak pernah ikut hilang** saat
  banner ini disembunyikan (elemen terpisah, bukan bagian dari gambar
  peta) — persis seperti diminta.
- Disimpan per-peta (`map.nationalPopulation`), ikut tersimpan di
  `localStorage` yang sama seperti data peta lain — belum ikut sinkron
  Drive/Sheet (batasan yang sama seperti data peta lain, lihat catatan
  "Belum dikerjakan" di fitur Peta Interaktif).
- Berkas yang berubah: `index.html` (markup baru di tab "🖥️ Mode &
  Peta"), `js/presentation-studio.js` (`fetchNationalPopulationAuto_()`,
  `renderNatPopStatus()`, `pushNatPopLive_()`, wiring 3 tombol/toggle
  baru di `wireMapTab()`, `nationalPopulation` disertakan di payload
  `action:"show"`), `present.html` (`#mapNationalPop` + CSS,
  `renderNationalPop_()`, dipanggil dari `showMap()`, dibersihkan di
  `stopMap()`, routing baru `action==="natpop"`).
- Lolos `node --check` (JS) & seluruh blok `<script>` embedded di
  `index.html`/`present.html`.
- ⚠️ **BELUM diuji ujung-ke-ujung di jaringan sungguhan** — terutama
  apakah Wikidata benar-benar mengizinkan CORS dari domain hosting
  Anda saat ini (biasanya ya, tapi bisa berubah kapan saja karena ini
  layanan pihak ketiga di luar kendali kita) dan apakah format
  JSON-nya masih persis sama. Kalau tombol "Perbarui Otomatis" gagal,
  pesan error akan tampil apa adanya di bawah tombol — isian manual di
  bawahnya tetap berfungsi sebagai cadangan tanpa perlu internet.

### 🆕 Tambahan 9 Sep 2026 (sesi ke-5) — 🎨 Warna Tetap + 📷 Foto Kota + Pin Berdenyut
- **Warna pin TETAP** untuk 2 kategori paling umum: **"Kaki Dian" =
  emas** (`#d4af37`), **"Pos Injil" = merah** (`#c0392b`) -- persis nama
  itu (tidak peka besar-kecil huruf), tidak lagi ikut hash acak.
  Kategori LAIN yang operator tambah sendiri (apa pun namanya) tetap
  dapat warna otomatis dari palet seperti sebelumnya.
- **Pin berdenyut pelan terus-menerus** (animasi CSS, bukan sekali saat
  muncul) di Layar 2 -- "hidup", ala penanda lokasi Google Maps, dengan
  jeda antar-pin sedikit diacak supaya tidak berdenyut serentak semua.
- **📷 Foto per kota (1-5 foto)** -- tombol baru "📷 Foto" di tiap pin
  (Studio, tab "🖥️ Mode & Peta"), buka panel unggah dengan pratinjau
  thumbnail + tombol hapus per foto. Berlaku untuk pin manual MAUPUN
  pin kota berkategori (jadi bisa dipakai di semua 514 kabupaten/kota).
  Foto otomatis dikecilkan (maks lebar 900px, JPEG 72%) sebelum
  disimpan supaya hemat penyimpanan perangkat.
  ⚠️ **Catatan jujur soal batas penyimpanan**: semua ini tersimpan di
  `localStorage` perangkat, yang total kuotanya cuma sekitar 5-10MB di
  kebanyakan browser (dipakai BERSAMA fitur lain: gambar peta, Kumpulan
  Ayat, dst). Walau sudah dikompres (~50-150KB/foto), kalau SEMUA 514
  kota diisi 5 foto sekaligus itu bisa 130-380MB -- jauh melebihi
  kuota & akan gagal simpan/mengganggu fitur lain. **Disarankan cuma isi
  foto untuk kota yang memang mau ditonjolkan** (biasanya puluhan, bukan
  ratusan), bukan seluruh 514 kota sekaligus.
- **Kartu info Layar 2 kini menampilkan foto** (strip sampai 5 gambar)
  di bawah nama kota/luas/penduduk saat "🎯 Fokus" ditekan.
- Label "Tahun Data" penduduk ditulis ulang jadi "sensus terakhir ..."
  di kartu Layar 2 supaya jelas maksudnya data sensus, bukan tahun
  sekarang.
- **Sudah bisa (dikonfirmasi, bukan fitur baru)**: klik "🎯 Fokus" pada
  pin TETAP menampilkan info kota itu walau kategorinya sedang TIDAK
  dicentang di "☑️ Kategori yang Ditampilkan" -- daftar Pin di Studio
  menampilkan SEMUA pin apa pun status centangnya.
- Lolos `node --check`; BELUM diuji ujung-ke-ujung di browser
  sungguhan, dan BELUM diuji soal batas nyata kuota localStorage kalau
  diisi banyak foto sekaligus (lihat catatan ⚠️ di atas).
- **Belum dikerjakan** (menunggu giliran): Menu Cepat ⚡ online/offline,
  split-screen Kamera+Berita disambungkan ke workflow, gamifikasi/
  reward anak muda 17-24 thn, video bumper, logo bernapas, stage timer
  pembicara, live polling/Q&A, kuis interaktif, social wall, caption
  otomatis.

### 🆕 Tambahan 9 Sep 2026 (sesi ke-4) — 📏 Ukuran Pin & 🔍 Zoom Interaktif
- **Peta pin SUDAH otomatis tersimpan & bisa dimuat ulang** (ini
  pertanyaan operator, bukan fitur baru) -- lewat `localStorage` di
  perangkat, dropdown "Peta Baru/Ganti Nama/Hapus Peta" (`psMapSelect`).
  Tiap perubahan (pin, kalibrasi, kategori, dst) langsung tersimpan;
  buka lagi besok/minggu depan di perangkat yang sama, datanya masih
  ada. Catatan: tersimpan PER PERANGKAT (bukan otomatis sinkron ke HP
  lain) -- kalau perlu dipakai di laptop berbeda, pakai "💾 Simpan ke
  Kumpulan Ayat" supaya ikut fitur sinkron Drive yang sudah ada.
- **Ukuran pin BESAR-KECIL sesuai jumlah penduduk** (kalau sudah diisi
  lewat "📊 Data") -- pakai skala akar (sqrt), bukan linear, supaya kota
  besar tidak menutupi separuh peta dibanding kota kecil. Pin tanpa data
  penduduk tetap ukuran standar. Berlaku di pratinjau Studio DAN Layar 2
  (`renderMapPins_()`, `present.html`).
- **🔍 Zoom Peta interaktif** -- slider baru + tombol ➖/➕ di tab "🖥️
  Mode & Peta" (100%–600%), bisa digeser KAPAN SAJA (baik sedang lihat
  peta penuh maupun sedang fokus ke 1 kota) untuk memperbesar/
  memperkecil tampilan di Layar 2 secara halus, TANPA perlu klik ulang
  "🎯 Fokus" tiap mau ubah level zoom. Titik pusat zoom mengikuti kota
  yang sedang difokuskan (atau tengah peta kalau belum fokus kemanapun).
  Slider otomatis balik ke 100% saat "▶️ Tampilkan Peta"/"↩️ Peta Penuh"
  ditekan, dan ke 260% saat "🎯 Fokus" ditekan (menyamai zoom bawaan
  fitur itu).
- Lolos `node --check`; BELUM diuji ujung-ke-ujung di browser
  sungguhan.
- **Belum dikerjakan** (menunggu giliran): Menu Cepat ⚡ online/offline,
  split-screen Kamera+Berita disambungkan ke workflow, gamifikasi/
  reward anak muda 17-24 thn, video bumper, logo bernapas, stage timer
  pembicara, live polling/Q&A, kuis interaktif, social wall, caption
  otomatis.

### 🆕 Tambahan 9 Sep 2026 (sesi ke-3) — 📇 Kartu Info + 📊 Luas/Penduduk saat Fokus Peta
- **Klik "🎯 Fokus" sekarang memunculkan kartu info** di pojok kiri-bawah
  Layar 2 (`#mapInfoCard`, `present.html`): nama kota, kategori + tahun
  (kalau pin berasal dari "📋 Daftar Titik dari Tabel"), lalu opsional
  **Luas (km²)** & **Jumlah Penduduk (+ tahun datanya)** kalau sudah
  diisi operator. Baris yang kosong TIDAK ditampilkan (bukan "0"/"-").
- **Tombol "📊 Data" baru** di tiap baris daftar Pin (Studio Presentasi,
  tab "🖥️ Mode & Peta") -- buka panel kecil 3 kotak: Luas (km²), Jumlah
  Penduduk, Tahun Data. **Sengaja tidak ada database luas/penduduk
  bawaan** untuk 514 kabupaten/kota -- angka itu berubah tiap tahun &
  kalau salah isi bisa menyesatkan penonton, jadi operator mengisi
  sendiri dari sumber yang mereka percaya (mis. BPS terbaru). Berlaku
  untuk pin manual maupun pin berkategori (Kaki Dian/Pos Injil/dst).
- **Tombol baru "↩️ Peta Penuh (batal fokus)"** di sebelah "▶️ Tampilkan
  Peta" -- zoom keluar dari fokus 1 pin, balik ke peta penuh semua
  pin+legenda yang sedang aktif, tanpa perlu menutup peta.
- Lolos `node --check` (`js/presentation-studio.js` & `<script>`
  embedded di `present.html`/`index.html`); BELUM diuji ujung-ke-ujung
  di browser sungguhan.
- **Belum dikerjakan** (dari daftar usulan "acara 1000 orang" yang
  sama, menunggu giliran sesuai pilihan operator): Menu Cepat ⚡
  online/offline, split-screen Kamera+Berita disambungkan ke workflow,
  gamifikasi/reward untuk anak muda 17-24 thn, video bumper, logo
  bernapas, stage timer pembicara, live polling/Q&A, kuis interaktif,
  social wall, caption otomatis.

### 🆕 Tambahan 9 Sep 2026 (sesi lanjutan) — Layar Istirahat Lengkap + 🎉 Efek Panggung
- **Layar Istirahat Lengkap** — field baru "Acara berikutnya setelah ini"
  di tab "🖥️ Mode & Peta" (`psModeScreenNextLabel`), digabung dalam SATU
  layar bersama judul/poin-poin/hitung mundur yang sudah ada (bukan
  layar terpisah) -- tampil sebagai baris "➡️ Selanjutnya: ..." di bagian
  bawah (`#msNextLabel`, `present.html`). Berlaku untuk semua jenis,
  paling relevan untuk ☕ Istirahat/🏃 Olahraga. Ikut tersimpan kalau item
  Mode Layar diselipkan ke Kumpulan Ayat (`addModeScreenToCollection()`).
- **🎉 Efek Panggung** (tab baru di Studio Presentasi) — 2 kelompok:
  - Reaksi visual: **Confetti** (canvas, ~150 keping jatuh ~4.5 detik)
    & 4 reaksi emoji terbang (👏❤️🙌🔥) -- tampil sebagai OVERLAY di atas
    apa pun yang sedang tayang, TIDAK menghentikan/mengganti tayangan
    yang berjalan, hilang otomatis.
  - Efek suara: 🥁 Drumroll, 👏 Tepuk Tangan, 🔔 Ding, 📯 Fanfare, 🎊
    Ta-da! -- SEMUA disintesis langsung lewat Web Audio API (oscillator
    + white noise), BUKAN file MP3, jadi tidak perlu aset tambahan &
    tetap 100% offline. Diputar dari perangkat Layar 2 (biasanya
    tersambung sound system venue).
  - Keduanya "tembak dan lupa" (fire-and-forget) -- tidak ada tombol
    "Hentikan" terpisah, operator bisa pencet berkali-kali beruntun.
- Lolos `node --check` (3 file .js) & semua `<script>` embedded di
  `index.html`/`present.html`; BELUM diuji ujung-ke-ujung di browser
  sungguhan (terutama volume/latency efek suara di sound system venue
  sungguhan, dan performa confetti di laptop presentasi yang lebih tua).
- **Belum dikerjakan** (dari daftar usulan "acara 1000 orang" yang
  sama, menunggu giliran): Video Bumper/Loop pembuka acara, Logo
  bernapas/glow, Stage timer khusus pembicara, live polling/Q&A, kuis
  interaktif, social wall, caption otomatis, split-screen Kamera+Berita
  yang bisa ditukar sisi kapan saja (fondasi `cam-split-lr` sudah ada).

### 🆕 Tambahan 9 Sep 2026 (sesi terpisah) — 4 preset baru "🖥️ Jenis Layar"
Sebelumnya tab "🖥️ Mode & Peta" cuma punya 2 jenis layar (👋 Welcome & ➡️ Next
Up). Ditambah 4 preset lagi supaya operator tidak perlu menyusun ulang
judul/gaya sendiri tiap acara: **☕ Istirahat**, **🎉 Ice Breaker**, **🏃
Olahraga**, **🙏 Renungan Malam**.
- Judul & placeholder subjudul terisi otomatis saat ganti tombol jenis
  (mis. pilih "☕ Istirahat" -> judul otomatis "JAM ISTIRAHAT") -- tetap
  bisa diedit bebas, dan TIDAK menimpa tulisan operator kalau sudah
  diketik manual (lihat `lastAutoTitle` di `wireModeScreenTab()`).
- Hitung mundur ke jam target hanya ditawarkan untuk jenis yang punya
  "durasi" wajar: Welcome, ☕ Istirahat, 🏃 Olahraga. Next Up/Ice
  Breaker/Renungan Malam sengaja tanpa hitung mundur.
- Layar 2 (`present.html`) dapat nuansa warna/gaya kecil per jenis
  (eyebrow, ketebalan judul, dsb) TANPA mengganti latar tema pilihan
  operator -- lihat komentar panjang di CSS `#modeScreenView` &
  `MODE_SCREEN_KIND_META` (`js/presentation-studio.js`).
- Item "Mode Layar" yang sudah tersimpan di Kumpulan Ayat manapun (jenis
  lama Welcome/Next Up) TIDAK terpengaruh -- cuma menambah pilihan baru
  di daftar tombol, bukan mengubah data yang sudah ada.
- Peta Interaktif (📍 Kalibrasi, 📋 Daftar Titik dari Tabel, ☑️ Kategori)
  yang sudah dibangun sebelumnya TIDAK diubah sama sekali sesi ini.
- **Belum dikerjakan** (menunggu giliran, sesuai permintaan operator):
  split-screen Kamera + Berita bisa ditukar sisi kapan saja -- catatan:
  fondasinya SUDAH ADA (`body.cam-split-lr` + tombol "Balik Sisi", lihat
  `present.html`), jadi kemungkinan besar cukup dipastikan/disambungkan
  ke workflow ini, bukan dibuat dari nol.
- Lolos `node --check` (3 file .js) & semua `<script>` embedded di
  `index.html`/`present.html`; BELUM diuji ujung-ke-ujung di browser
  sungguhan.

### 🆕 Tambahan 6 Sep 2026 (sesi terpisah, di luar cakupan ringkasan 27 Agu di bawah)
- **🔗 Link Publik Drive** (opt-in per file, PDF/gambar tetap privat secara
  default) -- detail lengkap & catatan keamanan di `ROADMAP-drive-sync.md`.
- **🔗 Tambah Link dari HP** (YouTube/Canva/SoundCloud langsung dari panel
  Kumpulan Ayat biasa, tanpa Studio Presentasi) -- detail di
  `ROADMAP-ai-presentation.md`.
- **Timer & Stopwatch (Studio Presentasi) dirombak total**: state machine
  standby (angka berkedip) → berjalan → dijeda/selesai, tombol "▶️ Mulai/
  Lanjut" dibuat besar, Stopwatch dapat "🚩 Penanda" (lap), Timer sekarang
  bisa jeda/lanjut (sebelumnya cuma bisa stop total). Lihat komentar
  panjang di `wireTimer()`/`wireStopwatch()` (js/presentation-studio.js).
- **Ukuran Teks** (ayat/kidung/dst) dinaikkan batas atasnya 160% → 480%.
- **Ukuran Timer/Stopwatch** -- slider BARU, terpisah dari Ukuran Teks di
  atas, rentang 50%-1000% (10x), khusus memperbesar angka Timer/Stopwatch
  di Layar 2 (`--p-timer-scale`, present.html) tanpa ikut membesarkan
  ayat/teks lain.
- Semua lolos `node --check` (JS) & cek struktur `<script>` embedded di
  `present.html`; BELUM diuji ujung-ke-ujung di browser sungguhan.

---

## 📋 Status Terkini — 27 Agustus 2026

Ringkasan SATU HALAMAN dari semua yang dikerjakan/belum dikerjakan sepanjang sesi
27 Agu 2026 (roadmap sinkron Drive yang lebih panjang & mendetail ada di
`ROADMAP-drive-sync.md` -- file ini cuma ringkasannya + fitur-fitur TAMBAHAN di
luar sinkron Drive yang diminta belakangan di sesi yang sama).

---

### ✅ SUDAH SELESAI (siap dipakai, semua lolos `node --check`)

#### 1. Sinkron Drive (Tahap 4–7 dari roadmap awal)
| # | Fitur | Ringkas |
|---|---|---|
| 4 | Tarik media dari Drive di perangkat lain | Buka Media Tersimpan di HP/komputer baru → otomatis tahu file yang sudah disinkron dari perangkat lain, tombol "☁️ Muat dari Drive" untuk unduh on-demand |
| 5 | 🔗 Bagikan ikut membagikan file media | Pakai Drive `makeCopy()`, penerima dapat salinan independen |
| 6 | Panel admin "📦 Pemakaian Drive" | Total & rincian per-akun/per-file, bisa dibuka dari menu ⋮ |
| 7 | Antrean offline/gagal-kirim | Upload gagal (offline dll) otomatis diantre & dicoba lagi saat online |
| — | ⚙️ Pengaturan tampilan Kidung | Ukuran & jenis huruf, tersimpan per perangkat |

#### 2. Housekeeping Drive lanjutan
- Pelacakan **rantai kepemilikan** file (`MediaOwnership` sheet) -- tahu siapa pengunggah PERTAMA suatu file walau sudah dibagikan berkali-kali.
- **Hapus permanen dari Drive** butuh persetujuan: kalau yang minta hapus BUKAN pengunggah pertama, jadi PERMINTAAN tertunda (bukan langsung terhapus) -- pengunggah pertama yang memutuskan Setuju/Tolak. Berlaku sama untuk admin (tidak diistimewakan).
- Indikator "⏳N menunggu sinkron" di tab Media Tersimpan (badge + spanduk + tombol "🔄 Coba sekarang").

#### 3. 🔔 Lonceng notifikasi bisa dilihat di HP
- Sebelumnya kartu 🔔 persetujuan (Kiriman Kumpulan Ayat & Permintaan Hapus Media) HANYA muncul di dalam Studio Presentasi yang memang desktop-only.
- Sekarang digabung ke lonceng header (`js/adminbell.js`) yang SUDAH tampil di HP maupun komputer -- badge angka & isi panel sekarang mencakup semua jenis notifikasi, bukan cuma statistik admin/login terakhir.

#### 4. 🖊️ Warna & ukuran Pen/Stylus
- 5 warna pastel baru: pink, biru muda, hijau muda, ungu, oranye (sebelumnya cuma merah/kuning/putih).
- Ukuran lewat progress bar (slider) 2px–40px, default 17px, dikirim juga ke Layar 2 supaya ketebalan coretan benar-benar berubah di sana.

#### 5. ⏱️ Stopwatch (fitur baru)
- Hitung MAJU dari 0 (beda dari ⏱️ Timer yang sudah ada, yang hitung MUNDUR).
- Dikendalikan dari Controller — tersedia di **Studio Presentasi (desktop)** *dan* **panel sederhana di HP** (⋮ → Mode Presentasi).
- Tombol ▶️ Mulai / ⏸️ Jeda / 🔄 Ulang, kotak judul bisa diisi bebas (sama seperti Timer), tampil di Layar 2, format otomatis MM:SS atau H:MM:SS untuk sesi panjang. Tidak akan tayang berbarengan dengan Timer (keduanya berbagi 1 area tengah layar).

#### 6. 🔍 Kaca Pembesar / Magnifier (fitur baru, diminta di pesan ini)
- **Khusus untuk file yang diunggah** (PDF/gambar/Word/PPT — semuanya ditayangkan sebagai gambar per halaman di Layar 2).
- Rentang zoom **10% – 10.000%** lewat slider di tab "Penunjuk & Pen" (Studio Presentasi), default 100%.
- Cara pakai: aktifkan tombol "🔍 Kaca Pembesar", lalu gerakkan kursor di atas kotak pratinjau "Tayang" — posisi kursor itu jadi titik tengah lensa pembesar di Layar 2 (sama seperti cara kerja 🔴 Penunjuk yang sudah ada).
- **Kotak/badge kecil** di atas lensa menunjukkan besar zoom saat ini (mis. "🔍 250%") — inilah "layer tambahan berupa kotak" yang diminta.
- Lensa otomatis disembunyikan kalau bukan gambar yang sedang tayang (mis. pas ayat Alkitab/Kidung/Timer tampil), dan disegarkan lagi otomatis saat kursor digerakkan lagi di kotak pratinjau.

---

### ⏳ BELUM SELESAI / BELUM DIKERJAKAN

Ditulis jujur, dengan alasannya masing-masing:

#### A. Pengujian 2–3 pengguna mengakses 1 Apps Script bersamaan
**Belum dijawab sesi ini.** Ini pertanyaan yang butuh jawaban tertulis (bukan kode) soal cara kerja Google Apps Script Web App + Google Sheets saat diakses banyak orang sekaligus, termasu soal "3 Apps Script yang aktif" yang disebutkan. Akan dijawab di pesan terpisah supaya tidak tercampur dengan daftar fitur di sini.

#### B. Cek tampilan Alkitab 1/2/3 kolom + kompatibilitas dengan Playlist All
**Belum diinvestigasi.** Perlu dicek: apakah mode kolom (1/2/3, atau berbaris ke bawah) yang ada sekarang tetap bisa disimpan bersama Kidung/Pengumuman/Word/PDF/PPT/gambar dalam 1 Playlist ("Kumpulan Ayat" gabungan). Akan dijawab/diperbaiki di pesan terpisah.

#### C. Pan (geser) saat Kaca Pembesar di-zoom sangat besar
Saat ini lensa selalu mengikuti **posisi kursor** operator secara real-time (jadi geser dilakukan dengan menggerakkan mouse di kotak pratinjau) — ini sudah cukup untuk kebanyakan pemakaian. **Belum ada** mode "kunci lensa di 1 titik lalu geser terpisah dari kursor" untuk zoom ekstrem (mis. 5000%+) di mana area yang mau dilihat sangat sempit — kalau dibutuhkan, ini pekerjaan tambahan.

#### D. Housekeeping Drive — pembersihan otomatis file yatim
Panel admin "📦 Pemakaian Drive" baru **melaporkan** pemakaian, belum ada tombol "bersihkan semua file yatim sekaligus" (harus hapus manual satu-satu lewat tombol 🗑️ per file, yang sudah melalui alur persetujuan).

#### E. Notifikasi real-time (push) untuk 🔔
Lonceng sekarang disegarkan tiap dibuka + polling berkala (5 menit admin / 10 menit pengguna biasa) — BUKAN notifikasi push instan begitu ada kiriman baru. Untuk notifikasi instan dibutuhkan infrastruktur tambahan (mis. Web Push) yang di luar cakupan Google Apps Script murni.

---

### 📁 File yang berubah sesi ini (kumulatif, dari awal sampai fitur Kaca Pembesar)
`apps-script/Code.gs`, `index.html`, `css/style.css`, `js/app.js`, `js/adminbell.js`,
`js/collections.js`, `js/config.js`, `js/db.js`, `js/kidung-ui.js`,
`js/presentation-studio.js`, `js/presentation.js`, `js/sync.js`, `present.html`,
`ROADMAP-drive-sync.md`, `ROADMAP-STATUS-TERKINI.md` (file ini).


---

# END — MASTER ROADMAP
