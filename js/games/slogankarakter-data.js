// ============================================================
// 🔤 Slogan Karakter -- DATA TERPUSAT (satu-satunya tempat isi
// karakter perlu diedit; dipakai BARENG oleh:
//   - js/games/slogankarakter.js   (Studio, mode 2 Layar)
//   - js/media-library.js          (tab Pustaka Media, mode 1 Layar)
// keduanya baca dari window.SLOGAN_KARAKTER_DATA /
// window.SLOGAN_KARAKTER_FIELDS_FOR() di bawah -- JADI KALAU MAU
// NAMBAH/UBAH ISI KARAKTER, CUKUP EDIT FILE INI SAJA, otomatis
// muncul di kedua tempat.
//
// Skema tiap karakter (lihat objek CHARS di bawah): sengaja
// SIAP-TAMBAH lebih dari sekadar short/long -- kolom "arti",
// "contoh", "ayat" sudah disediakan tapi masih string kosong "" untuk
// SEMUA karakter (isinya belum disiapkan operator). Checklist kolom
// di Studio & Pustaka Media OTOMATIS hanya menampilkan pilihan untuk
// kolom yang ISINYA TIDAK KOSONG per karakter (lihat
// SLOGAN_KARAKTER_FIELDS_FOR di bawah) -- jadi begitu salah satu
// kolom itu diisi untuk suatu karakter, pilihannya langsung muncul
// sendiri di kedua mode tanpa ubah kode APA PUN, cukup isi teksnya
// di sini.
//
// Load order WAJIB: file ini SEBELUM slogankarakter.js DAN SEBELUM
// media-library.js di index.html.
// ============================================================
(function () {
  const CHARS = {
    "Benar": { short: "Bicara harus benar, menjadi orang harus benar.", long: "Bicara harus benar, riil, tidak berpura-pura, menjadi orang yang berperilaku tulus, tidak hanya dilakukan di permukaan saja.", arti: "", contoh: "", ayat: "" },
    "Tepat": { short: "Waktu harus tepat, bicara harus tepat.", long: "Tepat waktu tidak menyebabkan pekerjaan tertunda, tepat dalam berbicara pasti dapat diandalkan.", arti: "", contoh: "", ayat: "" },
    "Ketat": { short: "Ketat mengikuti Tuhan, ketat dalam kehidupan.", long: "Ketat mengikuti Tuhan, tidak pernah kendor, jadwal kehidupan sehari-hari perlu ketat.", arti: "", contoh: "", ayat: "" },
    "Rajin": { short: "Rajin berdoa, rajin melayani.", long: "Rajin berdoa tidak malas, menyala-nyala dalam roh, rajin melayani.", arti: "", contoh: "", ayat: "" },
    "Lapang": { short: "Hati harus lapang, kapasitas harus besar.", long: "Kristus tinggal dalam hati yang lapang, bermurah hati kepada orang, memiliki kapasitas besar.", arti: "", contoh: "", ayat: "" },
    "Cermat": { short: "Perasaan peka, penghidupan cermat.", long: "Balik dalam Roh, perasaan peka; perilaku lembut, penghidupan cermat.", arti: "", contoh: "", ayat: "" },
    "Stabil": { short: "Sifat stabil, tekad stabil.", long: "Sifat stabil, tidak panik; tekad stabil, kokoh tidak berubah.", arti: "", contoh: "", ayat: "" },
    "Sabar": { short: "Sabar menanti, sabar berbuah.", long: "Panjang sabar menanti, tidak gelisah; sabar berbuah, tidak kendur.", arti: "", contoh: "", ayat: "" },
    "Dalam": { short: "Kebenaran dalam, pengalaman dalam.", long: "Menggali kedalaman kebenaran, tak hanya di permukaan; mencari kedalaman pengalaman, tak dangkal.", arti: "", contoh: "", ayat: "" },
    "Murni": { short: "Motivasi murni, tutur kata murni.", long: "Motivasi murni tidak campur aduk; tutur kata murni tidak berbelok-belok.", arti: "", contoh: "", ayat: "" },
    "Adil/Seimbang": { short: "Dengan seimbang menghadapi orang, dengan seimbang menangani perkara.", long: "Dengan seimbang menghadapi orang, tidak pilih kasih; dengan seimbang menangani perkara, tidak berat sebelah.", arti: "", contoh: "", ayat: "" },
    "Tenang": { short: "Roh tenang, hati teduh.", long: "Roh tenang, bersandar Allah; hati teduh, mendapatkan perhentian.", arti: "", contoh: "", ayat: "" },
    "Tulus": { short: "Bersasaran satu, tidak menyimpang.", long: "Belajar tulus (khusus, sepenuh hati), bersasaran satu, tidak menyimpang; tidak berserakan tanpa tujuan.", arti: "", contoh: "", ayat: "" },
    "Umum": { short: "Terhadap orang perlu umum, menangani perkara perlu umum.", long: "Saling memperhatikan, berperilaku umum untuk kepentingan bersama kepada orang; sehati sepikir menangani perkara secara umum.", arti: "", contoh: "", ayat: "" },
    "Terbuka": { short: "Terbuka kepada Tuhan, terbuka kepada orang lain.", long: "Terbuka kepada Tuhan untuk mendapatkan suplai; terbuka kepada orang lain untuk mendapatkan bantuan.", arti: "", contoh: "", ayat: "" },
    "Akrab": { short: "Akrab mendekati Allah, akrab dengan manusia.", long: "Bersekutu dengan Allah, mendekati Allah; bersimpati, memperhatikan, dan sayang kepada manusia.", arti: "", contoh: "", ayat: "" },
    "Gairah": { short: "Roh bergairah, mengasihi orang dengan gairah.", long: "Bergairah dalam roh, melayani Tuhan; memberitakan Injil, mengasihi orang dengan gairah.", arti: "", contoh: "", ayat: "" },
    "Luwes": { short: "Mendekati orang, merendahkan diri untuk mendekati orang.", long: "Menyeru dan berdoa mendekati Tuhan; rendah hati, bersimpati kepada orang, mendekati orang.", arti: "", contoh: "", ayat: "" },
    "Teguh": { short: "Roh teguh, tekad teguh.", long: "Teguh dalam roh, tidak kecil hati; tekad teguh, tidak goyah.", arti: "", contoh: "", ayat: "" },
    "Lembut": { short: "Hati lembut, perkataan lembut.", long: "Motivasi hati lembut, tidak mempertahankan diri; perkataan lembut, membangun orang.", arti: "", contoh: "", ayat: "" },
    "Taat": { short: "Taat kepada Allah, menurut kepada orang.", long: "Percaya dan taat, pasti disenangi oleh Allah; menuruti otoritas, pasti tidak melanggarnya.", arti: "", contoh: "", ayat: "" },
    "Derita": { short: "Tidak takut menderita, mau menerima penderitaan.", long: "Menderita bersama Tuhan, belajar taat; dengan tekad menderita sebagai senjata.", arti: "", contoh: "", ayat: "" },
    "Rendah": { short: "Hati merendah, menempatkan diri pada kedudukan yang rendah.", long: "Merendahkan hati dan diri, sering melayani Tuhan; menempatkan diri pada kedudukan yang rendah, tidak sombong.", arti: "", contoh: "", ayat: "" },
    "Miskin": { short: "Miskin dalam roh, hati senang miskin.", long: "Miskin dalam roh, menikmati Allah; hati senang miskin, mau memberi kepada orang.", arti: "", contoh: "", ayat: "" },
    "Tekun": { short: "Tekun, mempunyai ketetapan hati, bisa bertahan lama.", long: "Tekun terhadap Tuhan, tidak putus asa; tekun maju mengarah kepada sasaran.", arti: "", contoh: "", ayat: "" },
    "Sulit": { short: "Tidak menghindari kesulitan, mau menerima kesulitan.", long: "Menikmati anugerah Tuhan, tidak menghindari kesulitan; dengan sukarela mempersembahkan diri menerima kesulitan.", arti: "", contoh: "", ayat: "" },
    "Tekan": { short: "Mau menerima tekanan, bisa menahan tekanan.", long: "Untuk kemuliaan mau menerima tekanan; bejana yang mulia bisa tahan tekanan.", arti: "", contoh: "", ayat: "" },
    "Jernih": { short: "Pikiran jernih, mengerti Alkitab.", long: "Pikiran jernih hingga mendapatkan pembaruan; mengerti Alkitab, mendapatkan hikmat.", arti: "", contoh: "", ayat: "" },
    "Murah Hati": { short: "Hati besar, baik hati terhadap orang.", long: "Mendapatkan kebaikan dan kasih yang besar dari Allah, sehingga hati menjadi besar; mau menurut perkenan Allah, berlaku baik kepada orang.", arti: "", contoh: "", ayat: "" },
    "Bobot": { short: "Perkataan berbobot, orangnya juga berbobot.", long: "Perkataan berbobot dihargai orang; bejana yang mulia, berbobot, cocok dipakai oleh Tuhan.", arti: "", contoh: "", ayat: "" }
  };

  const GROUPS = [
    { num: 1, icon: "target", chars: ["Benar", "Tepat", "Ketat"] },
    { num: 2, icon: "search", chars: ["Rajin", "Lapang", "Cermat"] },
    { num: 3, icon: "anchor", chars: ["Stabil", "Sabar", "Dalam"] },
    { num: 4, icon: "scale", chars: ["Murni", "Adil/Seimbang", "Tenang"] },
    { num: 5, icon: "door", chars: ["Tulus", "Umum", "Terbuka"] },
    { num: 6, icon: "heart", chars: ["Akrab", "Gairah", "Luwes"] },
    { num: 7, icon: "shield", chars: ["Teguh", "Lembut", "Taat"] },
    { num: 8, icon: "cross", chars: ["Derita", "Rendah", "Miskin"] },
    { num: 9, icon: "arm", chars: ["Tekun", "Sulit", "Tekan"] },
    { num: 10, icon: "drop", chars: ["Jernih", "Murah Hati", "Bobot"] }
  ];

  // Ikon dekoratif untuk kotak kelompok -- PERSIS diambil dari app
  // "Karakter Pekerja Kristus" yang asli, supaya tampilan kotak
  // kelompok (10 kotak, tiap kotak 3 karakter) di Studio (2 Layar)
  // dan Pustaka Media (1 Layar) sama persis dengan contoh aslinya.
  const ICONS = {
    target: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.5"/><path d="M20 20l-4.5-4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    anchor: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="2" stroke="currentColor" stroke-width="1.5"/><path d="M12 7v14M6 12H4a8 8 0 0 0 16 0h-2M7 15l-3-1M17 15l3-1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    scale: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3v18M6 7h12M4 7l3 6a3 3 0 0 0 6 0L10 7M14 7l3 6a3 3 0 0 0 6 0l-3-6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    door: '<svg viewBox="0 0 24 24" fill="none"><path d="M6 3h9v18H6z" stroke="currentColor" stroke-width="1.5"/><path d="M12 12h6l-3-3m3 3l-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 20s-7-4.6-9.5-9C.7 7.3 3 4 6.3 4 8.4 4 10 5.2 12 7.4 14 5.2 15.6 4 17.7 4 21 4 23.3 7.3 21.5 11 19 15.4 12 20 12 20Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v6c0 5-3.4 7.9-7 9-3.6-1.1-7-4-7-9V6l7-3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    cross: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 4v16M6 10h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    arm: '<svg viewBox="0 0 24 24" fill="none"><path d="M6 20V9a3 3 0 0 1 6 0v5m0-5a3 3 0 0 1 6 0v3m-6-3v6m6-3v3a5 5 0 0 1-5 5h-1a6 6 0 0 1-6-6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    drop: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3s6.5 7.2 6.5 11.5A6.5 6.5 0 1 1 5.5 14.5C5.5 10.2 12 3 12 3Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>'
  };

  // Daftar RESMI semua KOLOM yang bisa ditampilkan di layar, sebagai
  // CHECKLIST (bukan tombol pilih-satu lagi -- permintaan operator 19
  // Sep 2026): operator bisa centang lebih dari satu sekaligus (mis.
  // Slogan Pendek + Slogan Panjang bareng), dan urutan tayang di layar
  // mengikuti urutan array ini. "short"/"long" SELALU ada (always) --
  // checklist-nya otomatis DEFAULT TERCENTANG SEMUA (lihat wireTab()
  // di slogankarakter.js / renderSkFields_ di media-library.js), jadi
  // begitu karakter dipilih langsung tayang lengkap; kalau operator
  // uncek sebagian, hanya yang masih tercentang yang tayang -- kalau
  // cuma 1 yang dibiarkan tercentang, cuma itu saja yang tampil.
  // "arti"/"contoh"/"ayat" adalah 3 RENCANA KE DEPAN (isi kolomnya di
  // CHARS di atas, checklist-nya OTOMATIS muncul sendiri -- lihat
  // SLOGAN_KARAKTER_FIELDS_FOR di bawah). Menambah kolom BARU LAGI di
  // masa depan tinggal tambah 1 baris di sini + isi kolom yg sama
  // namanya di CHARS -- TIDAK PERLU ubah kode Studio/Pustaka Media.
  const FIELDS = [
    { key: "short", label: "Slogan Pendek", displayLabel: "SLOGAN PENDEK", always: true },
    { key: "long", label: "Slogan Panjang", displayLabel: "SLOGAN PANJANG", always: true },
    { key: "arti", label: "Apa Artinya", displayLabel: "APA ARTINYA" },
    { key: "contoh", label: "Contoh Karakter", displayLabel: "CONTOH KARAKTER" },
    { key: "ayat", label: "Ayat Firman Tuhan", displayLabel: "AYAT FIRMAN TUHAN" }
  ];

  // Daftar kolom yang BOLEH dicentang untuk 1 karakter tertentu:
  // "always" (short/long) selalu ikut; sisanya (arti/contoh/ayat/
  // kolom baru nanti) HANYA ikut kalau isinya di CHARS untuk karakter
  // itu berisi teks (bukan "" / kosong).
  function fieldsFor(karakter) {
    const data = CHARS[karakter];
    if (!data) return [];
    return FIELDS.filter((f) => f.always || (data[f.key] && String(data[f.key]).trim() !== ""));
  }

  window.SLOGAN_KARAKTER_DATA = { GROUPS, CHARS, FIELDS, ICONS };
  window.SLOGAN_KARAKTER_FIELDS_FOR = fieldsFor;
})();
