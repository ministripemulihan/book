// ============================================================
//  KIDUNG / HYMN — sinkron dari Google Sheet terpisah (CONFIG.
//  KIDUNG_SHEET_CSV_URL di js/config.js), disimpan lokal di IndexedDB
//  (store "kidung", lihat js/db.js), lalu dibaca ulang dari sini
//  tanpa perlu internet lagi -- pola SAMA PERSIS seperti Alkitab
//  (js/csv.js: normalizeVerseRecord + js/app.js: syncFromServer()),
//  hanya jauh lebih ringan karena datanya jauh lebih kecil.
//
//  STATUS (20 Agu 2026): loader + parser SELESAI (file ini + fungsi
//  normalizeKidungRecord() di js/csv.js + store "kidung" di js/db.js).
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
// { id, noKidung, judul, pengarang, kategori, urutan, jenis, noBait, teks, koorGroup }
// `id` = noKidung + "_" + urutan (unik per baris di dalam 1 kidung).

// Baris ke-2 dst tiap kidung sengaja mengosongkan judul/pengarang/
// kategori di Sheet (lihat contoh rancangan_Kidung.xlsx) -- fungsi ini
// "meneruskan" nilai terakhir yang terisi ke baris-baris kosong
// berikutnya YANG MASIH no_kidung SAMA. Dipanggil SEKALI setelah semua
// baris CSV selesai di-parse (urutan baris CSV harus apa adanya, belum
// diacak) -- lihat resyncKidungSheet() di bawah.
function forwardFillKidungRows(rows) {
  let last = { noKidung: null, judul: "", pengarang: "", kategori: "" };
  return rows.map((r) => {
    if (r.noKidung !== last.noKidung) {
      // Kidung baru mulai -- reset "ingatan" forward-fill supaya tidak
      // ketularan judul/pengarang/kategori kidung sebelumnya kalau baris
      // pertama kidung baru ini entah kenapa kosong juga.
      last = { noKidung: r.noKidung, judul: r.judul, pengarang: r.pengarang, kategori: r.kategori };
    } else {
      if (!r.judul) r.judul = last.judul; else last.judul = r.judul;
      if (!r.pengarang) r.pengarang = last.pengarang; else last.pengarang = r.pengarang;
      if (!r.kategori) r.kategori = last.kategori; else last.kategori = r.kategori;
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
    id: r.noKidung + "_" + r.urutan,
  }));

  await LocalDB.clearKidung();
  if (rows.length) await LocalDB.bulkPutKidung(rows);
  await LocalDB.setMeta("kidungLastSync", new Date().toISOString());
  return rows.length;
}

// Daftar ringkas SEMUA kidung (1 entri per no_kidung, bukan per baris) --
// buat menu pemilihan/pencarian nanti di tab Kidung Studio Presentasi.
// { noKidung, judul, pengarang, kategori, jumlahBait }
async function getKidungList() {
  const all = await LocalDB.getAllKidungRows();
  const map = new Map();
  all.forEach((r) => {
    if (!map.has(r.noKidung)) {
      map.set(r.noKidung, { noKidung: r.noKidung, judul: r.judul, pengarang: r.pengarang, kategori: r.kategori, jumlahBait: 0 });
    }
    if (r.jenis === "bait") map.get(r.noKidung).jumlahBait++;
  });
  // Urut oleh nomor kidung secara numerik kalau bisa (bukan alfabetis --
  // "10" tidak boleh muncul sebelum "2").
  return Array.from(map.values()).sort((a, b) => {
    const na = parseInt(a.noKidung, 10), nb = parseInt(b.noKidung, 10);
    if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
    return String(a.noKidung).localeCompare(String(b.noKidung));
  });
}

// Semua baris 1 kidung, TERURUT sesuai `urutan` -- bentuk paling
// "mentah" (apa adanya seperti di Sheet, bait & koor berselang-seling).
async function getKidungRows(noKidung) {
  const rows = await LocalDB.getKidungRowsByNo(String(noKidung));
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
async function getKidungBaitsWithKoor(noKidung) {
  const rows = await getKidungRows(noKidung);
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
async function getKidungCategories() {
  const list = await getKidungList();
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

// Ringkasan SEMUA kidung dikelompokkan per kategori -- buat "slide
// ringkasan" (semua nomor kidung tampil, tinggal cari mana yang mau
// dinyanyikan) yang diminta: kategori tetap "Memuji Tuhan",
// "Pemecahan Roti", "Menyembah Bapa", "Apresiasi Kidung" (atau apa pun
// yang ternyata dipakai di Sheet -- lihat getKidungCategories(), TIDAK
// dihardcode di sini supaya otomatis ikut kalau ditambah/diganti).
// Balikannya: [{ kategori, kidungs: [{noKidung, judul}, ...] }, ...]
async function getKidungSummaryByCategory() {
  const list = await getKidungList();
  const map = new Map();
  list.forEach((k) => {
    const kat = k.kategori || "(Tanpa Kategori)";
    if (!map.has(kat)) map.set(kat, []);
    map.get(kat).push({ noKidung: k.noKidung, judul: k.judul });
  });
  return Array.from(map.entries()).map(([kategori, kidungs]) => ({ kategori, kidungs }));
}
