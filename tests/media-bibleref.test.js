// Uji pembaca BibleRef (tanpa DOM). Jalankan: node tests/media-bibleref.test.js
const fs = require("fs");
const vm = require("vm");
const ctx = { console, globalThis: null };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + "/../js/books.js", "utf8") + "\nglobalThis.BOOK_ALIAS_INDEX = BOOK_ALIAS_INDEX;", ctx);
vm.runInContext(fs.readFileSync(__dirname + "/../js/media-bibleref.js", "utf8"), ctx);
const B = ctx.MediaBibleRef;
let fail = 0;
function eq(a, b, msg) { const A = JSON.stringify(a), Bs = JSON.stringify(b); if (A !== Bs) { fail++; console.log("GAGAL:", msg, "\n  dapat :", A, "\n  harap :", Bs); } else console.log("ok  ", msg); }

eq(B.normalize("kejadian 1:1-3;yohanes 1:1"), "Kejadian 1:1-3; Yohanes 1:1", "normalisasi dasar");
eq(B.normalize("Kejadian 1"), "Kejadian 1", "seluruh pasal");
eq(B.normalize("Kejadian 1-2"), "Kejadian 1-2", "rentang pasal");
eq(B.normalize("Kejadian 1:1,3,5-7"), "Kejadian 1:1,3,5-7", "campuran ayat");
eq(B.normalize("Kejadian 1:1-2:3"), "Kejadian 1:1-2:3", "lintas pasal");
eq(B.normalize("1 Samuel 3:4"), "1 Samuel 3:4", "kitab berangka");
eq(B.parse("Kejadan 1:1")[0].ok, false, "salah ketik ditolak");
eq(B.parse("Kejadian 1:5-2")[0].ok, false, "rentang terbalik ditolak");

// lintas pasal: Kejadian 1:1-2:3
const r = B.parse("Kejadian 1:1-2:3")[0];
eq(r.intervals.map(x => [x.ch, x.from, x.to > 100 ? "end" : x.to]), [[1, 1, "end"], [2, 1, 3]], "interval lintas pasal");

// indeks + forChapter
const items = [
  { id: "a", bibleRef: "Kejadian 1:1-2:3" },
  { id: "b", bibleRef: "Kejadian 1:1; Yohanes 1:1" },
  { id: "c", bibleRef: "Kejadian 1" },
  { id: "d", bibleRef: "Kejadian 1:3,5-6" },
];
const idx = B.buildIndex(items);
const gen = ctx.BOOK_ALIAS_INDEX["kejadian"].num;
const verses = Array.from({ length: 31 }, (_, i) => ({ verse: i + 1 }));
const res = B.forChapter(idx, gen, 1, verses);
eq(res.map(x => [x.item.id, x.wide, x.whole, B.compactNums(x.verseNums)]),
  [["a", true, true, "1-31"], ["b", false, false, "1"], ["c", true, true, "1-31"], ["d", false, false, "3, 5, 6"]],
  "pencocokan pasal & ayat (a,c = tema pasal; b,d = per ayat)");
const res2 = B.forChapter(idx, gen, 2, Array.from({ length: 25 }, (_, i) => ({ verse: i + 1 })));
eq(res2.map(x => [x.item.id, B.compactNums(x.verseNums)]), [["a", "1-3"]], "pasal 2 hanya ayat 1-3");

// link ganda
eq(B.linkKey("https://youtu.be/abcDEF12345?t=5"), B.linkKey("https://www.youtube.com/watch?v=abcDEF12345&list=XYZ"), "youtu.be = watch?v=");
const d = B.findDuplicates([{ id: 1, link: "https://youtu.be/abcDEF12345" }, { id: 2, link: "https://www.youtube.com/watch?v=abcDEF12345" }, { id: 3, link: "https://youtu.be/zzzzzzzzzzz" }]);
eq(d.length === 1 && d[0].items.length === 2, true, "deteksi link ganda");
eq(B.compactNums([1, 2, 3, 5, 7, 8]), "1-3, 5, 7, 8", "ringkas nomor ayat");
console.log(fail ? "\n" + fail + " GAGAL" : "\nSEMUA LULUS");
process.exit(fail ? 1 : 0);
