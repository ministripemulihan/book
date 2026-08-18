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
