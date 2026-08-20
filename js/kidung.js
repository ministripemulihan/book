// ============================================================
//  KIDUNG / HYMN — sinkron dari Google Sheet terpisah (CONFIG.
//  KIDUNG_SHEET_CSV_URL di js/config.js), disimpan lokal di IndexedDB
//  (store "kidung", lihat js/db.js), lalu dibaca ulang dari sini
//  tanpa perlu internet lagi -- pola SAMA PERSIS seperti Alkitab
//  (js/csv.js: normalizeVerseRecord + js/app.js: syncFromServer()),
//  hanya jauh lebih ringan karena datanya jauh lebih kecil.
//
//  STATUS (20 Agu 2026): loader + parser SELESAI, DIPERLUAS hari ini
//  mengikuti kolom final di rancangan_Kidung.xlsx -- sekarang menangkap
//  `buku` (Kidung/Suplemen, 1 sheet sama), `tags` (SPR/Pemuda/Remaja/
//  Anak/Gugus/Injil/Sehari-hari), & 5 link media (mp3×2/video/youtube/
//  midi) per kidung. Mesin pemecah bait->slide (splitKidungIntoSlides)
//  & ringkasan per kategori juga sudah ada.
//  BELUM ada:
//   - Tab "🎵 Kidung/Hymn" di Studio Presentasi (UI pemilihan kidung +
//     mode tampilan slide) -- lihat rencana di komentar bawah.
//   - Endpoint Apps Script untuk EDIT langsung dari dalam app (mis.
//     benerin typo tanpa buka Sheet). Untuk sekarang, penyuntingan
//     kidung dilakukan LANGSUNG di Google Sheet-nya (sama seperti
//     Alkitab/Pokok Kitab/Garis Besar) -- app hanya BACA (read-only).
//     Kalau nanti dibuat, pola yang disarankan:
//       1. Sheet Kidung TETAP sumber utama (Publish-to-web CSV, seperti
//          sekarang) -- Apps Script HANYA menjadi "pintu tulis" opsional
//          di atasnya (mis. Code.gs nambah action editKidungRow_()),
//          supaya app tetap bisa baca walau Apps Script sedang mati.
//       2. Hak akses: pengguna dengan level di CONFIG-array baru (mis.
//          KIDUNG_EDIT_LEVELS: ["administrator", "gembala"]) boleh
//          submit perubahan -- ikut pola isCurhatGembala()/AI_CHAT_LEVELS
//          di js/curhat.js & js/aichat.js (currentUserLevels dari
//          js/levels.js). "Gembala" SUDAH ada di CONFIG.LEVEL_DEFINITIONS
//          jadi tidak perlu level baru, tinggal didaftarkan ke array ini.
//       3. Setelah submit, Apps Script UPDATE baris di Sheet asli (bukan
//          database terpisah) supaya CSV publik & hasil edit tetap 1
//          sumber yang sama, lalu app resyncKidungSheet() ulang baris
//          kidung itu saja (atau semuanya, datanya kecil) supaya
//          perubahan langsung kelihatan di perangkat yang mengedit.
// ============================================================

// Nama field IndexedDB (lihat CONFIG.KIDUNG_STORE_NAME di js/db.js):
// { id, buku, noKidung, judul, pengarang, birama, kategori, tags, urutan,
//   jenis, noBait, teks, koorGroup, linkMp3_1, linkMp3_2, linkVideo,
//   linkYoutube, linkMidi }
// `id` = buku + "_" + noKidung + "_" + urutan (unik per baris, termasuk
// lintas-buku -- Kidung No.95 & Suplemen No.95 tidak akan bentrok).

// Baris ke-2 dst tiap kidung sengaja mengosongkan judul/pengarang/
// kategori di Sheet (lihat contoh rancangan_Kidung.xlsx) -- fungsi ini
// "meneruskan" nilai terakhir yang terisi ke baris-baris kosong
// berikutnya YANG MASIH no_kidung SAMA. Dipanggil SEKALI setelah semua
// baris CSV selesai di-parse (urutan baris CSV harus apa adanya, belum
// diacak) -- lihat resyncKidungSheet() di bawah.
// Ikut diperluas untuk `buku`, `tags`, & 5 kolom link media -- di contoh
// rancangan_Kidung.xlsx kolom tag (SPR/Pemuda/dst) diisi di SETIAP baris
// (bukan cuma baris pertama), jadi forward-fill di sini murni JAGA-JAGA
// kalau suatu saat operator sheet cuma mengisi baris pertama saja seperti
// judul/pengarang/kategori -- tidak menimpa nilai yang memang sudah diisi.
function forwardFillKidungRows(rows) {
  let last = { noKidung: null, buku: "Kidung", judul: "", pengarang: "", birama: "", kategori: "", tags: [], linkMp3_1: "", linkMp3_2: "", linkVideo: "", linkYoutube: "", linkMidi: "" };
  return rows.map((r) => {
    if (r.noKidung !== last.noKidung || r.buku !== last.buku) {
      // Kidung baru mulai -- reset "ingatan" forward-fill supaya tidak
      // ketularan metadata kidung sebelumnya kalau baris pertama kidung
      // baru ini entah kenapa kosong juga.
      last = { noKidung: r.noKidung, buku: r.buku, judul: r.judul, pengarang: r.pengarang, birama: r.birama, kategori: r.kategori, tags: r.tags, linkMp3_1: r.linkMp3_1, linkMp3_2: r.linkMp3_2, linkVideo: r.linkVideo, linkYoutube: r.linkYoutube, linkMidi: r.linkMidi };
    } else {
      if (!r.buku || r.buku === "Kidung") r.buku = last.buku; else last.buku = r.buku;
      if (!r.judul) r.judul = last.judul; else last.judul = r.judul;
      if (!r.pengarang) r.pengarang = last.pengarang; else last.pengarang = r.pengarang;
      if (!r.birama) r.birama = last.birama; else last.birama = r.birama;
      if (!r.kategori) r.kategori = last.kategori; else last.kategori = r.kategori;
      if (!r.tags || !r.tags.length) r.tags = last.tags; else last.tags = r.tags;
      if (!r.linkMp3_1) r.linkMp3_1 = last.linkMp3_1; else last.linkMp3_1 = r.linkMp3_1;
      if (!r.linkMp3_2) r.linkMp3_2 = last.linkMp3_2; else last.linkMp3_2 = r.linkMp3_2;
      if (!r.linkVideo) r.linkVideo = last.linkVideo; else last.linkVideo = r.linkVideo;
      if (!r.linkYoutube) r.linkYoutube = last.linkYoutube; else last.linkYoutube = r.linkYoutube;
      if (!r.linkMidi) r.linkMidi = last.linkMidi; else last.linkMidi = r.linkMidi;
    }
    return r;
  });
}

// Sinkronkan seluruh data Kidung dari CONFIG.KIDUNG_SHEET_CSV_URL ke
// IndexedDB lokal. Aman dipanggil berkali-kali (replace total tiap
// kali, datanya kecil jadi tidak perlu strategi "chunk" seperti
// Alkitab). Tidak melempar error kalau URL belum diisi -- cukup
// kembalikan false diam-diam, supaya fitur ini otomatis "tidak aktif"
// sampai admin mengisi Sheet-nya (sama seperti OUTLINE_SHEETS).
async function resyncKidungSheet() {
  const url = (typeof CONFIG !== "undefined" && CONFIG.KIDUNG_SHEET_CSV_URL) || "";
  if (!url) return false;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Gagal mengambil data Kidung (" + res.status + ")");
  const csvText = await res.text();

  const rawRows = parseCSV(csvText).map(normalizeKidungRecord).filter((r) => r.noKidung);
  const rows = forwardFillKidungRows(rawRows).map((r) => ({
    ...r,
    id: r.buku + "_" + r.noKidung + "_" + r.urutan,
  }));

  await LocalDB.clearKidung();
  if (rows.length) await LocalDB.bulkPutKidung(rows);
  await LocalDB.setMeta("kidungLastSync", new Date().toISOString());
  return rows.length;
}

// Daftar ringkas SEMUA kidung (1 entri per buku+no_kidung, bukan per baris)
// -- buat menu pemilihan/pencarian nanti di tab Kidung Studio Presentasi.
// `bukuFilter` opsional ("Kidung"/"Suplemen"/dst) -- kosongkan untuk semua
// buku sekaligus (dipakai pencarian/ringkasan lintas buku).
// { buku, noKidung, judul, pengarang, kategori, tags, jumlahBait,
//   linkMp3_1, linkMp3_2, linkVideo, linkYoutube, linkMidi }
async function getKidungList(bukuFilter) {
  const all = await LocalDB.getAllKidungRows();
  const map = new Map();
  all.forEach((r) => {
    if (bukuFilter && r.buku !== bukuFilter) return;
    const key = r.buku + "_" + r.noKidung;
    if (!map.has(key)) {
      map.set(key, {
        buku: r.buku, noKidung: r.noKidung, judul: r.judul, pengarang: r.pengarang, birama: r.birama || "",
        kategori: r.kategori, tags: r.tags || [], jumlahBait: 0,
        linkMp3_1: r.linkMp3_1 || "", linkMp3_2: r.linkMp3_2 || "", linkVideo: r.linkVideo || "",
        linkYoutube: r.linkYoutube || "", linkMidi: r.linkMidi || "",
      });
    }
    if (r.jenis === "bait") map.get(key).jumlahBait++;
  });
  // Urut oleh buku dulu, baru nomor kidung secara numerik kalau bisa
  // ("10" tidak boleh muncul sebelum "2").
  return Array.from(map.values()).sort((a, b) => {
    if (a.buku !== b.buku) return String(a.buku).localeCompare(String(b.buku));
    const na = parseInt(a.noKidung, 10), nb = parseInt(b.noKidung, 10);
    if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
    return String(a.noKidung).localeCompare(String(b.noKidung));
  });
}

// Semua daftar BUKU yang sungguh dipakai di Sheet (mis. ["Kidung"] saja
// selama Suplemen belum ditambahkan, otomatis jadi ["Kidung","Suplemen"]
// begitu kolom `buku` diisi "Suplemen" di baris manapun) -- dipakai
// tombol pilih Kidung/Suplemen di keypad, TIDAK di-hardcode supaya
// otomatis ikut kalau nanti ditambah buku lain (mis. "Kidung Anak").
async function getKidungBooks() {
  const list = await getKidungList();
  const set = new Set();
  list.forEach((k) => set.add(k.buku || "Kidung"));
  return Array.from(set).sort();
}

// Semua tag pemakaian yang sungguh dipakai (SPR/Pemuda/Remaja/Anak/
// Gugus/Injil/Sehari-hari, atau tag baru apa pun yang ditambah di Sheet)
// -- dipakai untuk daftar filter, dihitung dari data supaya otomatis
// ikut kalau nanti ada tag baru.
async function getKidungTags() {
  const list = await getKidungList();
  const set = new Set();
  list.forEach((k) => (k.tags || []).forEach((t) => set.add(t)));
  return Array.from(set).sort();
}

// Semua baris 1 kidung, TERURUT sesuai `urutan` -- bentuk paling
// "mentah" (apa adanya seperti di Sheet, bait & koor berselang-seling).
// `buku` WAJIB diisi (mis. "Kidung"/"Suplemen") supaya nomor yang sama
// di buku berbeda tidak tertukar.
async function getKidungRows(buku, noKidung) {
  const rows = await LocalDB.getKidungRowsByBukuNo(buku || "Kidung", String(noKidung));
  return rows.sort((a, b) => a.urutan - b.urutan);
}

// Bentuk yang lebih siap pakai untuk mesin pemecah slide (BELUM dibuat,
// lihat catatan STATUS di atas): daftar bait TERURUT sesuai no_bait,
// masing-masing SUDAH ditempeli teks koor yang berlaku untuknya lewat
// koorGroup (null kalau bait itu memang tidak pakai koor sama sekali --
// lihat contoh kidung 201 di rancangan_Kidung.xlsx). Dipisah dari
// getKidungRows() supaya pemanggil bisa pilih mau bentuk "mentah" (ikut
// urutan Sheet) atau bentuk "siap pakai" (ikut no_bait + koor terpasang)
// tanpa perlu menghitung ulang pemetaan koorGroup di banyak tempat.
async function getKidungBaitsWithKoor(buku, noKidung) {
  const rows = await getKidungRows(buku, noKidung);
  const koorByGroup = {};
  rows.forEach((r) => { if (r.jenis === "koor" && r.koorGroup) koorByGroup[r.koorGroup] = r.teks; });
  return rows
    .filter((r) => r.jenis === "bait")
    .sort((a, b) => (a.noBait || 0) - (b.noBait || 0))
    .map((r) => ({
      noBait: r.noBait,
      teks: r.teks,
      koorGroup: r.koorGroup || null,
      koorTeks: r.koorGroup ? (koorByGroup[r.koorGroup] || null) : null,
    }));
}

// Semua kategori yang benar-benar dipakai (buat filter/menu nanti) --
// dihitung dari data yang sudah tersimpan, BUKAN daftar tetap, supaya
// otomatis ikut kalau admin menambah kategori baru di Sheet.
// `bukuFilter` opsional, sama seperti getKidungList().
async function getKidungCategories(bukuFilter) {
  const list = await getKidungList(bukuFilter);
  const set = new Set();
  list.forEach((k) => { if (k.kategori) set.add(k.kategori); });
  return Array.from(set).sort();
}

// ============================================================
//  PEMECAH BAIT -> SLIDE (mesin mode tampilan, dipilih OPERATOR saat
//  presentasi -- BUKAN disimpan di Sheet, lihat diskusi soal fleksibel
//  per-acara). Input: hasil getKidungBaitsWithKoor() (array bait yang
//  tiap itemnya sudah tahu koorTeks & koorGroup miliknya sendiri --
//  jadi kalau di tengah kidung koor-nya ganti (mis. bait 1-4 pakai
//  koor A, bait 5-7 pakai koor B), atau ada bait yang memang TIDAK
//  pakai koor sama sekali (koorGroup null), itu semua otomatis ikut
//  terbawa per-bait tanpa perlu logic khusus di sini.
//
//  MODE bawaan (dipetakan dari pilihan tombol di UI nanti):
//   "1"        -> 1 bait / slide, TANPA koor sama sekali.
//   "1+koor"   -> 1 bait / slide, ditempeli koor bait itu (kalau ada).
//   "2+koor"   -> 2 bait / slide, ditempeli koor bait TERAKHIR di slide.
//   "3+koor"   -> 3 bait / slide, sama seperti atas tapi 3 bait.
//   "koor"     -> slide isi koor SAJA (semua koor unik dalam kidung
//                 itu, deduplikasi -- 1 kidung 2 koor jadi 2 slide).
//  Custom (mis. [1,2+koor1],[3+koor],[4] seperti dicontohkan) tinggal
//  panggil splitKidungIntoSlides() dengan `groupSizes` custom -- lihat
//  parameter opsional di bawah -- jadi tidak perlu mode baru per kasus.
//
//  Aturan pas 1 slide berisi >1 bait tapi koor-nya BEDA per bait (mis.
//  slide [4,5] sedangkan bait 4 pakai koor A dan bait 5 sudah pindah
//  ke koor B): koor yang ditampilkan cuma milik bait TERAKHIR di slide
//  itu (koor dinyanyikan sesudah bait terakhir, jadi itu yang relevan)
//  -- sisanya (koor A) tetap otomatis muncul di slide-slide sebelumnya
//  yang masih full berisi bait-bait ber-koor A.
// ============================================================
function splitKidungIntoSlides(baits, mode, groupSizes) {
  if (!baits || !baits.length) return [];

  if (mode === "koor") {
    // 1 slide per koor UNIK (urut kemunculan pertama), tanpa teks bait --
    // dipakai buat "diulang-ulang" tanpa geser lewat semua bait.
    const seen = new Set();
    const slides = [];
    baits.forEach((b) => {
      if (!b.koorGroup || seen.has(b.koorGroup)) return;
      seen.add(b.koorGroup);
      slides.push({ baits: [], koorTeks: b.koorTeks, koorGroup: b.koorGroup, onlyKoor: true });
    });
    return slides;
  }

  // Tentukan ukuran tiap grup: pakai groupSizes custom kalau diberi
  // (mis. [2,2,1,1] buat pola [1,2+koor1],[3,4+koor1],[5,6+koor2],
  // [7+koor2]); kalau tidak, hitung otomatis dari mode "N+koor"/"N".
  let sizes = groupSizes;
  if (!sizes || !sizes.length) {
    const n = mode === "1" || mode === "1+koor" ? 1
      : mode === "2+koor" ? 2
      : mode === "3+koor" ? 3
      : 1;
    sizes = [];
    let remaining = baits.length;
    while (remaining > 0) { sizes.push(Math.min(n, remaining)); remaining -= Math.min(n, remaining); }
  }

  const withKoor = mode !== "1"; // mode "1" murni = tanpa koor sama sekali
  const slides = [];
  let idx = 0;
  sizes.forEach((size) => {
    const group = baits.slice(idx, idx + size);
    idx += size;
    if (!group.length) return;
    const last = group[group.length - 1];
    slides.push({
      baits: group.map((b) => ({ noBait: b.noBait, teks: b.teks })),
      koorTeks: withKoor ? (last.koorTeks || null) : null,
      koorGroup: withKoor ? (last.koorGroup || null) : null,
      onlyKoor: false,
    });
  });
  return slides;
}

// ------------------------------------------------------------
// Alur keypad: operator ketik angka, lalu tekan tombol "Kidung" atau
// "Suplemen" -- baru saat itu nomornya dikunci ke buku yang ditekan
// (bukan otomatis dari format angka). Fungsi ini 1 pintu masuk untuk
// alur itu: kembalikan bait+koor siap pakai, atau null kalau nomor itu
// tidak ada di buku yang dipilih.
async function openKidungByKeypad(buku, noRaw) {
  const no = String(noRaw || "").trim().replace(/^0+(?=\d)/, ""); // buang nol di depan input mentah
  if (!no) return null;
  const baits = await getKidungBaitsWithKoor(buku, no);
  if (!baits.length) return null;
  const list = await getKidungList(buku);
  const meta = list.find((k) => String(k.noKidung) === no) || null;
  return { meta, baits };
}

// Format nomor untuk TAMPILAN saja (bukan untuk disimpan/dicari) --
// keputusan final: Kidung selalu 3 digit dengan nol di depan (No. 095),
// Suplemen TANPA nol di depan (apa adanya, mis. No. 200).
function formatKidungNo(buku, no) {
  const n = String(no || "").trim();
  if (buku === "Kidung") return n.padStart(3, "0");
  return n; // Suplemen & buku lain: polos, tanpa padding
}

// Ringkasan SEMUA kidung dikelompokkan per kategori -- buat "slide
// ringkasan" (semua nomor kidung tampil, tinggal cari mana yang mau
// dinyanyikan) yang diminta: kategori tetap "Memuji Tuhan",
// "Pemecahan Roti", "Menyembah Bapa", "Apresiasi Kidung" (atau apa pun
// yang ternyata dipakai di Sheet -- lihat getKidungCategories(), TIDAK
// dihardcode di sini supaya otomatis ikut kalau ditambah/diganti).
// Balikannya: [{ kategori, kidungs: [{noKidung, judul}, ...] }, ...]
async function getKidungSummaryByCategory(bukuFilter) {
  const list = await getKidungList(bukuFilter);
  const map = new Map();
  list.forEach((k) => {
    const kat = k.kategori || "(Tanpa Kategori)";
    if (!map.has(kat)) map.set(kat, []);
    map.get(kat).push({ buku: k.buku, noKidung: k.noKidung, judul: k.judul });
  });
  return Array.from(map.entries()).map(([kategori, kidungs]) => ({ kategori, kidungs }));
}

// ============================================================
//  PENCARIAN LENGKAP (judul + ISI SYAIR/koor) — ditambahkan 20 Agu 2026
//  atas permintaan: sebelumnya "🔍 Cari Judul" di js/kidung-ui.js cuma
//  mencocokkan field `judul`, jadi cari kata seperti "kasih" yang ada DI
//  DALAM syair (bukan di judul) tidak ketemu apa-apa. Fungsi ini
//  mencocokkan query ke judul, pengarang, MAUPUN ke teks tiap baris
//  bait/koor kidung tsb -- dipakai renderKidungSearch() di kidung-ui.js.
//
//  Kenapa TIDAK butuh index/struktur data baru: data Kidung sengaja
//  kecil (~800 KB, lihat CONFIG.KIDUNG_DATA_APPROX_KB) dan SUDAH semua
//  ada di IndexedDB lokal (LocalDB.getAllKidungRows(), tanpa perlu
//  network sama sekali) -- jadi scan penuh semua baris tiap kali cari
//  tetap instan (ribuan baris, bukan jutaan). Tiap baris SUDAH punya id
//  unik (`buku + "_" + noKidung + "_" + urutan`, lihat forwardFillKidungRows/
//  resyncKidungSheet di atas & LocalDB.open() di js/db.js) yang dipakai
//  sebagai primary key IndexedDB + index "byBukuNo" -- itu SUDAH cukup
//  cepat untuk kebutuhan ini, jadi TIDAK perlu nomor unik tambahan di
//  Sheet-nya sendiri.
//
//  Balikan: { matches: [...meta kidung yang cocok, bentuk sama seperti
//  getKidungList()...], total: jumlah SEMUA kidung buku ini (buat
//  tampilan "ketemu X/Y kidung") }.
//
//  UPDATE (20 Agu 2026, permintaan lanjutan): query KOSONG sekarang
//  mengembalikan SEMUA kidung buku ini (matches = list lengkap, urut
//  nomor -- sudah begitu dari getKidungList()) alih-alih daftar kosong
//  seperti sebelumnya. Ini supaya layar "🔍 Cari" bisa langsung
//  menampilkan SEMUA kidung dulu (list panjang ke bawah) sebelum
//  pengguna mengetik apa pun -- diminta karena sebelumnya layar
//  pencarian tampak kosong melompong sampai ada ketikan.
async function searchKidungFull(query, bukuFilter) {
  const q = String(query || "").trim().toLowerCase();
  const list = await getKidungList(bukuFilter);
  const total = list.length;
  if (!q) return { matches: list, total };

  const allRows = await LocalDB.getAllKidungRows();
  // Kelompokkan baris per kidung (kunci buku+noKidung) supaya gampang
  // dicek "ada baris yang cocok" tanpa query IndexedDB terpisah per
  // kidung (yang lebih lambat untuk pencarian lintas semua kidung).
  const rowsByKey = new Map();
  allRows.forEach((r) => {
    if (bukuFilter && r.buku !== bukuFilter) return;
    const key = r.buku + "_" + r.noKidung;
    if (!rowsByKey.has(key)) rowsByKey.set(key, []);
    rowsByKey.get(key).push(r);
  });

  const matches = list.filter((k) => {
    if ((k.judul || "").toLowerCase().includes(q)) return true;
    if ((k.pengarang || "").toLowerCase().includes(q)) return true;
    const rows = rowsByKey.get(k.buku + "_" + k.noKidung) || [];
    return rows.some((r) => (r.teks || "").toLowerCase().includes(q));
  });

  return { matches, total };
}

// ============================================================
//  BAGIKAN (SHARE) 1 KIDUNG UTUH — §8 Rancangan_Fitur_Kidung.docx.
//  Beda dari mode tampil slide (splitKidungIntoSlides di atas, yang
//  hanya menampilkan koor bait TERAKHIR per slide supaya tidak
//  berulang-ulang di layar): teks yang DIBAGIKAN/DI-SALIN justru
//  SENGAJA menuliskan ulang koornya lengkap SETIAP SELESAI 1 bait --
//  supaya begitu ditempel ke WhatsApp/dokumen lain, orang yang
//  membaca tidak perlu bolak-balik cari "Koor" di atas, dan hasilnya
//  langsung siap dipakai/dicetak apa adanya (persis seperti contoh
//  yang diminta: kidung No. 095, 3 bait, 3x tulisan koor lengkap).
// ============================================================

// Susun teks 1 kidung LENGKAP siap bagikan/salin:
//   No. {nomor}
//   {judul}{ (pengarang)}
//   {birama}
//   1. {baris 1 bait 1}
//   {baris 2 bait 1}
//   ...
//   Koor: {baris 1 koor}
//   {baris 2 koor}
//   ...
//   2. {baris 1 bait 2}
//   ...
// PENTING: baris baru DI DALAM `teks`/`koorTeks` (mis. tiap baris syair
// ditulis di baris terpisah dalam 1 sel Sheet, pakai Alt+Enter di Excel/
// Google Sheets) TIDAK digabung jadi 1 paragraf -- ditulis ulang APA
// ADANYA persis seperti tersimpan di sel, karena itulah yang diminta:
// baris syairnya sendiri-sendiri, "Koor:" di baris barunya sendiri,
// lalu baris-baris koor menyusul di bawahnya juga apa adanya. Tidak ada
// baris kosong pemisah antar bait -- langsung sambung ke nomor bait
// berikutnya, sesuai contoh yang diberikan.
// `meta`  = 1 entri dari getKidungList() / openKidungByKeypad().meta
//           ({ buku, noKidung, judul, pengarang, birama, ... }).
// `baits` = hasil getKidungBaitsWithKoor(buku, noKidung) (array
//           { noBait, teks, koorGroup, koorTeks }, koorTeks sudah
//           ditempel otomatis per bait -- bait tanpa koor otomatis
//           koorTeks-nya null & baris "Koor:" ikut dilewati; bait 1-4
//           pakai koor A & bait 5-7 pakai koor B otomatis ikut benar
//           juga, tinggal dari koor_group di Sheet).
// Baris judul/pengarang/birama otomatis dilewati kalau memang kosong
// (mis. birama belum diisi di Sheet), supaya tidak ada baris kosong
// aneh nempel di hasil salinan.
function buildKidungShareText(meta, baits) {
  if (!meta || !baits || !baits.length) return "";

  const headerLines = [];
  headerLines.push("No. " + formatKidungNo(meta.buku, meta.noKidung));
  let titleLine = (meta.judul || "").trim();
  if (meta.pengarang && meta.pengarang.trim()) titleLine += (titleLine ? " " : "") + "(" + meta.pengarang.trim() + ")";
  if (titleLine) headerLines.push(titleLine);
  if (meta.birama && meta.birama.trim()) headerLines.push(meta.birama.trim());

  const verseBlocks = baits.map((b) => {
    let block = `${b.noBait}. ${b.teks}`;
    if (b.koorTeks && b.koorTeks.trim()) block += `\nKoor: ${b.koorTeks}`;
    return block;
  });

  return headerLines.join("\n") + "\n" + verseBlocks.join("\n");
}

// Tombol "🔗 Bagikan" siap-pasang: dipakai layar baca Kidung nanti.
// Memakai Web Share API kalau didukung (muncul kotak pilih WhatsApp/
// Telegram/dll bawaan HP, sama seperti shareMediaButton() di
// js/media.js) -- fallback SALIN ke clipboard (dengan umpan-balik ✓ di
// tombol, lewat copyTextWithFeedback() di js/app.js) kalau Web Share
// tidak didukung (mis. di komputer).
// CATATAN (belum diaktifkan di sini, lihat §6 & §9 Rancangan_Fitur_
// Kidung.docx "tamu_kidung"): begitu flag tamu 2-tingkat itu dibuat,
// tombol ini perlu disembunyikan untuk tamu (baca-saja) -- cukup jangan
// panggil fungsi ini sama sekali kalau isTamuKidungReadOnly() true,
// sama seperti pola tombol copy Alkitab yang sudah ada.
function buildKidungShareButton(meta, baits) {
  const text = buildKidungShareText(meta, baits);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "chip-btn small kidung-share-btn";
  btn.textContent = "🔗 Bagikan";
  btn.title = "Bagikan teks lengkap kidung ini (semua bait + koor ditulis ulang)";
  if (!text) { btn.disabled = true; return btn; }
  btn.addEventListener("click", async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: (meta.judul || "Kidung No. " + meta.noKidung),
          text,
        });
        return; // pengguna berhasil pilih tujuan share -- selesai
      } catch (e) {
        // dibatalkan pengguna, atau perangkat tidak sungguh mendukung --
        // lanjut ke fallback salin di bawah, jangan biarkan tombol diam saja.
      }
    }
    if (typeof copyTextWithFeedback === "function") {
      copyTextWithFeedback(text, btn);
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    } else {
      window.prompt("Salin teks kidung ini:", text);
    }
  });
  return btn;
}

// Tombol "📋 Salin Teks" -- BEDA dari buildKidungShareButton() di atas:
// tombol ini SELALU langsung salin ke clipboard, TIDAK PERNAH membuka
// kotak share bawaan OS (navigator.share). Alasan ditambahkan terpisah:
// di HP, tombol "🔗 Bagikan" langsung membuka kotak pilih aplikasi
// (WhatsApp/dll) begitu ditekan -- kalau operator cuma mau MENGETES/
// memastikan teksnya benar (mis. tempel ke editor/Notes untuk dicek),
// tidak ada cara mudah melakukannya lewat kotak share itu, jadi terasa
// seperti "tidak muncul apa-apa". Tombol ini kasih jalan pintas yang
// hasilnya bisa langsung ditempel & diperiksa, di HP maupun komputer,
// pakai mekanisme SAMA (copyTextWithFeedback -> clipboard API, fallback
// execCommand("copy") lewat fallbackCopy() di js/app.js) yang sudah
// dipakai tombol salin lain di app ini (mis. Alkitab).
function buildKidungCopyButton(meta, baits) {
  const text = buildKidungShareText(meta, baits);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "chip-btn small kidung-copy-btn";
  btn.textContent = "📋 Salin Teks";
  btn.title = "Salin teks lengkap kidung ini ke clipboard (semua bait + koor)";
  if (!text) { btn.disabled = true; return btn; }
  btn.addEventListener("click", () => {
    if (typeof copyTextWithFeedback === "function") {
      copyTextWithFeedback(text, btn);
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    } else {
      window.prompt("Salin teks kidung ini:", text);
    }
  });
  return btn;
}
