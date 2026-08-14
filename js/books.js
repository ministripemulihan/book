// ============================================================
//  DAFTAR KITAB ALKITAB (Terjemahan Baru / LAI) + alias/singkatan
//  Jika nama kitab pada Google Sheet Anda berbeda ejaannya,
//  ubah nilai "name" di bawah supaya SAMA PERSIS dengan kolom
//  "Book Name" pada sheet Anda.
// ============================================================
const BOOKS = [
  // Perjanjian Lama
  { num: 1, name: "Kejadian", testament: "PL", aliases: ["kejadian", "kej"] },
  { num: 2, name: "Keluaran", testament: "PL", aliases: ["keluaran", "kel"] },
  { num: 3, name: "Imamat", testament: "PL", aliases: ["imamat", "im"] },
  { num: 4, name: "Bilangan", testament: "PL", aliases: ["bilangan", "bil"] },
  { num: 5, name: "Ulangan", testament: "PL", aliases: ["ulangan", "ul"] },
  { num: 6, name: "Yosua", testament: "PL", aliases: ["yosua", "yos"] },
  { num: 7, name: "Hakim-hakim", testament: "PL", aliases: ["hakim-hakim", "hakim hakim", "hakimhakim", "hak"] },
  { num: 8, name: "Rut", testament: "PL", aliases: ["rut"] },
  { num: 9, name: "1 Samuel", testament: "PL", aliases: ["1 samuel", "1samuel", "1 sam", "1sam", "i samuel"] },
  { num: 10, name: "2 Samuel", testament: "PL", aliases: ["2 samuel", "2samuel", "2 sam", "2sam", "ii samuel"] },
  { num: 11, name: "1 Raja-raja", testament: "PL", aliases: ["1 raja-raja", "1raja-raja", "1 raja raja", "1 raj", "1raj"] },
  { num: 12, name: "2 Raja-raja", testament: "PL", aliases: ["2 raja-raja", "2raja-raja", "2 raja raja", "2 raj", "2raj"] },
  { num: 13, name: "1 Tawarikh", testament: "PL", aliases: ["1 tawarikh", "1tawarikh", "1 taw", "1taw"] },
  { num: 14, name: "2 Tawarikh", testament: "PL", aliases: ["2 tawarikh", "2tawarikh", "2 taw", "2taw"] },
  { num: 15, name: "Ezra", testament: "PL", aliases: ["ezra", "ezr"] },
  { num: 16, name: "Nehemia", testament: "PL", aliases: ["nehemia", "neh"] },
  { num: 17, name: "Ester", testament: "PL", aliases: ["ester", "est"] },
  { num: 18, name: "Ayub", testament: "PL", aliases: ["ayub", "ayb"] },
  { num: 19, name: "Mazmur", testament: "PL", aliases: ["mazmur", "mzm"] },
  { num: 20, name: "Amsal", testament: "PL", aliases: ["amsal", "ams"] },
  { num: 21, name: "Pengkhotbah", testament: "PL", aliases: ["pengkhotbah", "pkh"] },
  { num: 22, name: "Kidung Agung", testament: "PL", aliases: ["kidung agung", "kidungagung", "kid"] },
  { num: 23, name: "Yesaya", testament: "PL", aliases: ["yesaya", "yes"] },
  { num: 24, name: "Yeremia", testament: "PL", aliases: ["yeremia", "yer"] },
  { num: 25, name: "Ratapan", testament: "PL", aliases: ["ratapan", "rat"] },
  { num: 26, name: "Yehezkiel", testament: "PL", aliases: ["yehezkiel", "yeh"] },
  { num: 27, name: "Daniel", testament: "PL", aliases: ["daniel", "dan"] },
  { num: 28, name: "Hosea", testament: "PL", aliases: ["hosea", "hos"] },
  { num: 29, name: "Yoel", testament: "PL", aliases: ["yoel", "yl"] },
  { num: 30, name: "Amos", testament: "PL", aliases: ["amos", "am"] },
  { num: 31, name: "Obaja", testament: "PL", aliases: ["obaja", "ob"] },
  { num: 32, name: "Yunus", testament: "PL", aliases: ["yunus", "yun"] },
  { num: 33, name: "Mikha", testament: "PL", aliases: ["mikha", "mi"] },
  { num: 34, name: "Nahum", testament: "PL", aliases: ["nahum", "nah"] },
  { num: 35, name: "Habakuk", testament: "PL", aliases: ["habakuk", "hab"] },
  { num: 36, name: "Zefanya", testament: "PL", aliases: ["zefanya", "zef"] },
  { num: 37, name: "Hagai", testament: "PL", aliases: ["hagai", "hag"] },
  { num: 38, name: "Zakharia", testament: "PL", aliases: ["zakharia", "za"] },
  { num: 39, name: "Maleakhi", testament: "PL", aliases: ["maleakhi", "mal"] },
  // Perjanjian Baru
  { num: 40, name: "Matius", testament: "PB", aliases: ["matius", "mat"] },
  { num: 41, name: "Markus", testament: "PB", aliases: ["markus", "mrk", "mark"] },
  { num: 42, name: "Lukas", testament: "PB", aliases: ["lukas", "luk"] },
  { num: 43, name: "Yohanes", testament: "PB", aliases: ["yohanes", "yoh"] },
  { num: 44, name: "Kisah Para Rasul", testament: "PB", aliases: ["kisah para rasul", "kisah rasul", "kisah", "kis"] },
  { num: 45, name: "Roma", testament: "PB", aliases: ["roma", "rm"] },
  { num: 46, name: "1 Korintus", testament: "PB", aliases: ["1 korintus", "1korintus", "1 kor", "1kor"] },
  { num: 47, name: "2 Korintus", testament: "PB", aliases: ["2 korintus", "2korintus", "2 kor", "2kor"] },
  { num: 48, name: "Galatia", testament: "PB", aliases: ["galatia", "gal"] },
  { num: 49, name: "Efesus", testament: "PB", aliases: ["efesus", "ef"] },
  { num: 50, name: "Filipi", testament: "PB", aliases: ["filipi", "flp", "fil"] },
  { num: 51, name: "Kolose", testament: "PB", aliases: ["kolose", "kol"] },
  { num: 52, name: "1 Tesalonika", testament: "PB", aliases: ["1 tesalonika", "1tesalonika", "1 tes", "1tes"] },
  { num: 53, name: "2 Tesalonika", testament: "PB", aliases: ["2 tesalonika", "2tesalonika", "2 tes", "2tes"] },
  { num: 54, name: "1 Timotius", testament: "PB", aliases: ["1 timotius", "1timotius", "1 tim", "1tim"] },
  { num: 55, name: "2 Timotius", testament: "PB", aliases: ["2 timotius", "2timotius", "2 tim", "2tim"] },
  { num: 56, name: "Titus", testament: "PB", aliases: ["titus", "tit"] },
  { num: 57, name: "Filemon", testament: "PB", aliases: ["filemon", "flm"] },
  { num: 58, name: "Ibrani", testament: "PB", aliases: ["ibrani", "ibr"] },
  { num: 59, name: "Yakobus", testament: "PB", aliases: ["yakobus", "yak"] },
  { num: 60, name: "1 Petrus", testament: "PB", aliases: ["1 petrus", "1petrus", "1 ptr", "1ptr", "1 pet"] },
  { num: 61, name: "2 Petrus", testament: "PB", aliases: ["2 petrus", "2petrus", "2 ptr", "2ptr", "2 pet"] },
  { num: 62, name: "1 Yohanes", testament: "PB", aliases: ["1 yohanes", "1yohanes", "1 yoh", "1yoh"] },
  { num: 63, name: "2 Yohanes", testament: "PB", aliases: ["2 yohanes", "2yohanes", "2 yoh", "2yoh"] },
  { num: 64, name: "3 Yohanes", testament: "PB", aliases: ["3 yohanes", "3yohanes", "3 yoh", "3yoh"] },
  { num: 65, name: "Yudas", testament: "PB", aliases: ["yudas", "yud"] },
  { num: 66, name: "Wahyu", testament: "PB", aliases: ["wahyu", "why"] },
];

// index cepat: alias (huruf kecil, tanpa titik) -> data kitab
const BOOK_ALIAS_INDEX = {};
BOOKS.forEach((b) => {
  b.aliases.forEach((a) => (BOOK_ALIAS_INDEX[a] = b));
  BOOK_ALIAS_INDEX[b.name.toLowerCase()] = b;
});

// Singkatan 3-huruf gaya OSIS/e-Sword (Inggris) yang biasa dipakai di
// referensi silang pada kolom Note sheet Alkitab, mis. "Psa_74:16",
// "Gen_1:8" -- urutannya SAMA PERSIS dengan urutan BOOKS di atas (66 kitab,
// urutan kanon standar), dipakai khusus supaya pembacaan suara (TTS) bisa
// membacakan referensi itu dengan wajar (mis. "Mazmur 74:16") -- lihat
// cleanArticulationForSpeech() di js/app.js.
const OSIS_ABBR_3 = [
  "Gen", "Exo", "Lev", "Num", "Deu", "Jos", "Jdg", "Rut", "1Sa", "2Sa",
  "1Ki", "2Ki", "1Ch", "2Ch", "Ezr", "Neh", "Est", "Job", "Psa", "Pro",
  "Ecc", "Sng", "Isa", "Jer", "Lam", "Eze", "Dan", "Hos", "Joe", "Amo",
  "Oba", "Jon", "Mic", "Nah", "Hab", "Zep", "Hag", "Zec", "Mal",
  "Mat", "Mar", "Luk", "Joh", "Act", "Rom", "1Co", "2Co", "Gal", "Eph",
  "Phi", "Col", "1Th", "2Th", "1Ti", "2Ti", "Tit", "Phm", "Heb", "Jam",
  "1Pe", "2Pe", "1Jo", "2Jo", "3Jo", "Jud", "Rev",
];
const OSIS_ABBR_INDEX = {};
OSIS_ABBR_3.forEach((abbr, i) => {
  if (BOOKS[i]) OSIS_ABBR_INDEX[abbr.toLowerCase()] = BOOKS[i]; // simpan objek kitab (perlu .num & .name)
});
