// Uji item Kumpulan Ayat multi-bahasa (v56): addVerseGroupToCollection(..., {langs}) di js/collections.js
// + resolveMultiLangVerseItem_() di js/app.js. Fungsi diekstrak lewat penanda teks lalu dijalankan dengan data tiruan.
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const col = fs.readFileSync(path.join(root, "js/collections.js"), "utf8");
const app = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
const cut = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error("penanda tidak ketemu: " + a); return src.slice(i, j); };
const colSrc = cut(col, "const BIBLE_VERSION_SHORT_LABELS", "function addTextToCollection");
const appSrc = cut(app, "function isMultiLangVerseItem_(it) {", "function collectionItemRef(it) {") + "\n" + cut(app, "function combineVerseGroupForSlide(verseIds) {", "function collectionItemRef(it) {");
let ok = true;
const expect = (n, c, x) => { console.log((c ? "PASS" : "FAIL") + " - " + n + (c ? "" : " :: " + JSON.stringify(x))); if (!c) ok = false; };

const mk = (lang, bk, ch, v, t) => ({ id: lang + "_" + bk + "_" + ch + "_" + v, lang, bookNumber: bk, bookName: bk === 66 ? "Wahyu" : bk === 52 ? "1 Tesalonika" : "Matius", chapter: ch, verse: v, text: t });
const data = {
  rvind: [mk("rvind", 66, 2, 5, "Sebab itu ingatlah"), mk("rvind", 52, 2, 5, "Karena seperti"), mk("rvind", 40, 28, 19, "Karena itu, pergilah")],
  rveng: [mk("rveng", 66, 2, 5, "Remember therefore"), mk("rveng", 52, 2, 5, "For neither"), mk("rveng", 40, 28, 19, "Go therefore")],
};
const verseById = {}; Object.values(data).flat().forEach((v) => { verseById[v.id] = v; });
const added = [];
const ctx = {
  verseById,
  getChapterVerses: (lang, bk, ch) => (data[lang] || []).filter((v) => v.bookNumber === bk && v.chapter === ch),
  addItemToCollection: (u, n, item) => { added.push(item); return "id"; },
};
vm.createContext(ctx);
vm.runInContext(colSrc + "\n" + appSrc, ctx);
const ids = data.rvind.map((v) => v.id);

// --- penyimpanan
ctx.addVerseGroupToCollection("u", "K", ids, { langs: ["rvind", "rveng"], eachRef: true });
expect("multi-bahasa 3 ayat -> 1 item dengan langs + verseIds", added[0].langs.join() === "rvind,rveng" && added[0].verseIds.length === 3 && added[0].verseId === ids[0] && added[0].eachRef === true, added[0]);
added.length = 0;
ctx.addVerseGroupToCollection("u", "K", [ids[0]], { langs: ["rvind", "rveng"], eachRef: true });
expect("multi-bahasa 1 ayat -> item dengan langs, tanpa verseIds", added[0].langs.length === 2 && !added[0].verseIds, added[0]);
added.length = 0;
ctx.addVerseGroupToCollection("u", "K", ids);
expect("tanpa opts = format LAMA persis (tanpa langs/eachRef)", added[0].verseIds.length === 3 && !("langs" in added[0]) && !("eachRef" in added[0]), added[0]);
added.length = 0;
ctx.addVerseGroupToCollection("u", "K", ids, { eachRef: true });
expect("1 bahasa + eachRef -> eachRef tersimpan", added[0].eachRef === true && !added[0].langs, added[0]);

// --- penyusunan slide
const ml = ctx.resolveMultiLangVerseItem_({ type: "verse", verseId: ids[0], verseIds: ids, langs: ["rvind", "rveng"], eachRef: true });
expect("3 kelompok, tiap ayat IND lalu ENG", ml && ml.groups.length === 3 && ml.groups.every((g) => g.texts[0].code === "rvind" && g.texts[1].code === "rveng"), ml);
expect("ayat sama di semua bahasa (Matius 28:19 IND+ENG)", ml.groups[2].texts[1].text === "Go therefore" && ml.groups[2].ref === "Matius 28:19", ml.groups[2]);
expect("nama gabungan di atas", ml.ref === "Wahyu 2:5; 1 Tesalonika 2:5; Matius 28:19", ml.ref);
expect("teks daftar memuat kedua bahasa", /\[IND-RCV\] Sebab itu ingatlah\n\[ENG-RCV\] Remember therefore/.test(ml.plainText), ml.plainText);
const one = ctx.resolveMultiLangVerseItem_({ type: "verse", verseId: ids[0], langs: ["rvind", "rveng"] });
expect("1 ayat: nama ayat tidak diulang di blok", one.groups.length === 1 && one.groups[0].ref === "" && one.ref === "Wahyu 2:5" && one.flatTexts[1].text === "Remember therefore", one);
const mono = ctx.resolveMultiLangVerseItem_({ type: "verse", verseId: ids[0], verseIds: ids, eachRef: true });
expect("gabungan 1 bahasa + eachRef: nama per ayat, tanpa tag bahasa", mono.groups.length === 3 && mono.groups[1].ref === "1 Tesalonika 2:5" && mono.groups[1].texts.length === 1 && mono.groups[1].texts[0].label === "", mono);
expect("item lama (tanpa langs/eachRef) -> null (jalur lama)", ctx.resolveMultiLangVerseItem_({ type: "verse", verseId: ids[0], verseIds: ids }) === null, null);
const noEng = ctx.resolveMultiLangVerseItem_({ type: "verse", verseId: ids[0], langs: ["rvind", "kjv"] });
expect("bahasa tanpa data dilewati, tidak error", noEng && noEng.groups[0].texts.length === 1, noEng);
console.log(ok ? "SEMUA LULUS" : "ADA YANG GAGAL");
process.exit(ok ? 0 : 1);
