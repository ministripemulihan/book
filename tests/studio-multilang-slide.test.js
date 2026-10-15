// Uji logika buildMultiLangGroupSlide_() (js/presentation-studio.js) -- v54.
// Fungsi ini ada di dalam closure, jadi diekstrak lewat penanda teks lalu dijalankan dengan data tiruan.
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const src = fs.readFileSync(path.join(__dirname, "../js/presentation-studio.js"), "utf8");
const a = src.indexOf("    function buildMultiLangGroupSlide_(blocks, groupSize) {");
const b = src.indexOf("    function updatePreview() {", a);
if (a < 0 || b < 0) throw new Error("fungsi tidak ketemu");
const fnSrc = src.slice(a, b);
let ok = true;
const expect = (n, c, x) => { console.log((c ? "PASS" : "FAIL") + " - " + n + (c ? "" : " :: " + JSON.stringify(x))); if (!c) ok = false; };

const VERSION_LABELS = { rvind: "IND-RCV", rveng: "ENG-RCV" };
const mk = (lang, bk, ch, v, t) => ({ id: lang + "_" + bk + ch + v, lang, bookNumber: bk, bookName: bk === 66 ? "Wahyu" : bk === 52 ? "1 Tesalonika" : "Matius", chapter: ch, verse: v, text: t });
const data = {
  rvind: [mk("rvind", 66, 2, 5, "Sebab itu ingatlah"), mk("rvind", 52, 2, 5, "Karena seperti"), mk("rvind", 40, 28, 19, "Karena itu, pergilah")],
  rveng: [mk("rveng", 66, 2, 5, "Remember therefore"), mk("rveng", 52, 2, 5, "For neither"), mk("rveng", 40, 28, 19, "Go therefore")]
};
function run(checked, eachRef) {
  const ctx = {
    VERSION_LABELS,
    buildVerseNotesExtra_: () => ({}), // v57: notes tidak diuji di sini (lihat present-notes.browser.test.js)
    getCheckedVersions: () => checked,
    getChapterVerses: (lang, bk, ch) => (data[lang] || []).filter((v) => v.bookNumber === bk && v.chapter === ch),
    el: (id) => (id === "psQuickEachRef" ? { checked: eachRef } : null),
    buildVerseNotesExtra_: () => ({})
  };
  vm.createContext(ctx);
  const appSrc = fs.readFileSync(path.join(__dirname, "../js/app.js"), "utf8");
  const h0 = appSrc.indexOf("function mergeSlideGroupsByRange_(groups) {");
  const h1 = appSrc.indexOf("function resolveMultiLangVerseItem_", h0);
  vm.runInContext(appSrc.slice(h0, h1), ctx);
  vm.runInContext(fnSrc.replace("function buildMultiLangGroupSlide_", "var buildMultiLangGroupSlide_ = function"), ctx);
  const blocks = data.rvind.map((v) => ({ refLabel: v.bookName + " " + v.chapter + ":" + v.verse, versions: [{ code: "rvind", verses: [v] }, { code: "rveng", verses: [data.rveng.find((x) => x.bookNumber === v.bookNumber)] }] }));
  return ctx.buildMultiLangGroupSlide_(blocks, 3);
}
const r = run(["rvind", "rveng"], true);
expect("3 kelompok", r && r.groups.length === 3, r);
expect("nama gabungan dipisah ; antar kitab", r.ref === "Wahyu 2:5; 1 Tesalonika 2:5; Matius 28:19", r.ref);
expect("tiap ayat: IND lalu ENG", r.groups.every((g) => g.texts[0].code === "rvind" && g.texts[1].code === "rveng"), r.groups);
expect("nama ayat per blok", r.groups[1].ref === "1 Tesalonika 2:5", r.groups[1]);
expect("cadangan datar per bahasa ada 2", r.flatTexts.length === 2 && /^5 Sebab itu/.test(r.flatTexts[0].text), r.flatTexts);
const r2 = run(["rvind", "rveng"], false);
expect("tanpa nama ayat per blok kalau dimatikan", r2.groups.every((g) => g.ref === ""), r2.groups);
const r3 = run(["rvind"], true);
expect("1 versi saja tetap jalan", r3 && r3.groups[0].texts.length === 1, r3);

// v62 -- kasus operator: matius 28:19-20; filipi 4:4 -> nama di atas blok digabung rentang
{
  const M = (lang, v, tx) => mk(lang, 40, 28, v, tx);
  const F = (lang, tx) => Object.assign(mk(lang, 50, 4, 4, tx), { bookName: "Filipi" });
  data.rvind.push(M("rvind", 20, "dan ajarlah mereka"), F("rvind", "Bersukacitalah"));
  data.rveng.push(M("rveng", 20, "Teaching them"), F("rveng", "Rejoice"));
  const ctx2 = { VERSION_LABELS, getCheckedVersions: () => ["rvind", "rveng"], buildVerseNotesExtra_: () => ({}),
    getChapterVerses: (lang, bk, ch) => (data[lang] || []).filter((v) => v.bookNumber === bk && v.chapter === ch),
    el: (id) => (id === "psQuickEachRef" ? { checked: true } : null) };
  vm.createContext(ctx2);
  const appSrc2 = fs.readFileSync(path.join(__dirname, "../js/app.js"), "utf8");
  vm.runInContext(appSrc2.slice(appSrc2.indexOf("function mergeSlideGroupsByRange_(groups) {"), appSrc2.indexOf("function resolveMultiLangVerseItem_")), ctx2);
  vm.runInContext(fnSrc.replace("function buildMultiLangGroupSlide_", "var buildMultiLangGroupSlide_ = function"), ctx2);
  const v = (lang, bk, ch, vs) => data[lang].find((x) => x.bookNumber === bk && x.chapter === ch && x.verse === vs);
  const blocks = [
    { refLabel: "Matius 28:19-20", versions: [{ code: "rvind", verses: [v("rvind", 40, 28, 19), v("rvind", 40, 28, 20)] }] },
    { refLabel: "Filipi 4:4", versions: [{ code: "rvind", verses: [v("rvind", 50, 4, 4)] }] }
  ];
  const r4 = ctx2.buildMultiLangGroupSlide_(blocks, Infinity);
  expect("digabung jadi 2 blok (bukan 3 per ayat)", r4.groups.length === 2, r4.groups);
  expect("nama blok 1 = Matius 28:19-20", r4.groups[0].ref === "Matius 28:19-20", r4.groups[0].ref);
  expect("nama blok 2 = Filipi 4:4", r4.groups[1].ref === "Filipi 4:4", r4.groups[1].ref);
  expect("blok 1: IND lalu ENG, tiap bahasa memuat ayat 19 & 20 bernomor", r4.groups[0].texts[0].code === "rvind" && r4.groups[0].texts[1].code === "rveng" && /^19 .* 20 dan ajarlah/.test(r4.groups[0].texts[0].text), r4.groups[0].texts);
  expect("blok 2: 1 ayat tanpa nomor", r4.groups[1].texts[0].text === "Bersukacitalah", r4.groups[1].texts);
}
console.log(ok ? "SEMUA LULUS" : "ADA YANG GAGAL");
process.exit(ok ? 0 : 1);
