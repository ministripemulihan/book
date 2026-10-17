// Uji ringan (16 Okt 2026): kolom Awal_Lagu terbaca + diteruskan ke baris bait berikutnya,
// dan MP3 ke-2 (mp3_2) ikut terbawa ke jadwal bacaan. Jalankan: node tests/awal-lagu-mp3-2.test.js
"use strict";
const fs = require("fs"), vm = require("vm");
let ok = true;
const expect = (n, c, x) => { console.log((c ? "PASS" : "FAIL") + " - " + n + (c ? "" : " :: " + JSON.stringify(x))); if (!c) ok = false; };
const ctx = vm.createContext({ console, CONFIG: {}, window: {}, document: {} });
for (const f of ["js/books.js", "js/csv.js", "js/kidung.js"]) vm.runInContext(fs.readFileSync(f, "utf8"), ctx, { filename: f });
const csv = [
  "no_kidung,Buku,judul,urutan,jenis,no_bait,teks,Awal_Lagu",
  '3,Kidung,Mulia bagi Sang Bapa,1,bait,1,"baris 1",K003 Mulia bagi Sang',
  '3,Kidung,,2,bait,2,"baris 2",',
].join("\n");
const rows = vm.runInContext("(function(t){return forwardFillKidungRows(parseCSV(t).map(normalizeKidungRecord).filter(r=>r.noKidung));})", ctx)(csv);
expect("Awal_Lagu terbaca di baris 1", rows[0].awalLagu === "K003 Mulia bagi Sang", rows[0]);
expect("Awal_Lagu diteruskan ke baris 2 (forward-fill)", rows[1].awalLagu === "K003 Mulia bagi Sang", rows[1]);
// MP3 2 di jadwal bacaan
try {
  vm.runInContext(fs.readFileSync("js/media.js", "utf8"), ctx, { filename: "js/media.js" });
  const sched = vm.runInContext("(function(r){return buildMediaScheduleFromRows(r);})", ctx)([{ pembacaan: "Kejadian 1:1-2:3", mp3: "http://a/1.mp3", mp3_2: "http://a/2.mp3", mp4: "", youtube: "" }]);
  const it = sched[0][0];
  expect("mp3_2 terbawa ke segmen & item", it.segments[0].mp3_2 === "http://a/2.mp3" && it.mp3_2 === "http://a/2.mp3", it);
  expect("mediaBlockHasContent: hanya mp3_2 pun dianggap ada isi", vm.runInContext("mediaBlockHasContent({mp3_2:'x'})", ctx) === true, null);
} catch (e) { expect("media.js termuat di vm (butuh dependensi lain?)", false, String(e)); }
process.exit(ok ? 0 : 1);
