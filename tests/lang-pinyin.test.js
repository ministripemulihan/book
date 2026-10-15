// Uji v60: dua bahasa baru chs_pinyin & chssmp_pinyin terdaftar di Alkitab, Studio, label, audio.
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const rd = (f) => fs.readFileSync(path.join(root, f), "utf8");
let ok = true;
const expect = (n, c, x) => { console.log((c ? "PASS" : "FAIL") + " - " + n + (c ? "" : " :: " + JSON.stringify(x))); if (!c) ok = false; };

const cfgCtx = {}; vm.createContext(cfgCtx);
vm.runInContext(rd("js/config.js") + "\nthis.CONFIG = CONFIG;", cfgCtx);
const codes = cfgCtx.CONFIG.LANGUAGES.map((l) => l.code);
expect("CONFIG.LANGUAGES punya chs_pinyin & chssmp_pinyin", codes.includes("chs_pinyin") && codes.includes("chssmp_pinyin"), codes);
expect("10 bahasa, tanpa kode ganda", codes.length === 10 && new Set(codes).size === 10, codes);
expect("perkiraan ukuran data >= 64 MB", cfgCtx.CONFIG.BIBLE_DATA_APPROX_SIZE_MB >= 64, cfgCtx.CONFIG.BIBLE_DATA_APPROX_SIZE_MB);

const html = rd("index.html");
expect("grid versi Studio punya 2 kotak pinyin", /value="chs_pinyin"/.test(html) && /value="chssmp_pinyin"/.test(html));
expect("label Studio ada", /chs_pinyin: "MDR-PINYIN"/.test(rd("js/presentation-studio.js")) && /chssmp_pinyin: "MDR-S-PINYIN"/.test(rd("js/presentation-studio.js")));
expect("label Kumpulan Ayat ada", /chs_pinyin: "MDR-PINYIN"/.test(rd("js/collections.js")));
expect("audio Mandarin untuk pinyin", /chs_pinyin: \["pb_mandarin"\]/.test(rd("js/media.js")));

// Parser CSV aplikasi: baris pinyin dari Excel asli
const csvSrc = rd("js/csv.js");
const ctx = { console }; vm.createContext(ctx);
vm.runInContext(csvSrc + "\nthis.__fn = typeof normalizeVerseRecord === 'function' ? normalizeVerseRecord : null; this.__cv = typeof cleanVerseText === 'function';", ctx);
if (ctx.__fn) {
  const r = ctx.__fn({ bahasa: "chs_pinyin", "verse id": "1", "book name": "创世记", "book number": "1", chapter: "1", verse: "1", text: "qǐ chū, shén chuàng zào tiān dì.", note: "" });
  expect("parser: kode bahasa pinyin utuh, id unik per bahasa", r && r.lang === "chs_pinyin" && r.id === "chs_pinyin_1", r);
  expect("parser: teks pinyin (diakritik) utuh", r && r.text === "qǐ chū, shén chuàng zào tiān dì.", r && r.text);
} else console.log("(parser tidak diekstrak, dilewati)");
console.log(ok ? "SEMUA LULUS" : "ADA YANG GAGAL");
process.exit(ok ? 0 : 1);
