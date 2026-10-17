// Uji v69 -- nomor Strong KJV: parsing, pencarian, tampilan, Layar 2, kontras warna semua tema.
// Jalankan:  NODE_PATH=$(npm root -g) node tests/strong-numbers.browser.test.js
"use strict";
const fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const root = path.join(__dirname, "..");
const foot = fs.readFileSync(path.join(root, "js/footnotes.js"), "utf8");
const strongSrc = foot.slice(foot.indexOf("const STRONG_TAG_RE_"));
const csvSrc = fs.readFileSync(path.join(root, "js/csv.js"), "utf8");
const cvStart = csvSrc.indexOf("function cleanVerseText(t)");
const cleanSrc = csvSrc.slice(cvStart, csvSrc.indexOf("\n}\n", cvStart) + 3);
const appSrc = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
const rs0 = appSrc.indexOf("function runKeywordSearch(query, lang, scope, testament, mode) {");
const searchSrc = appSrc.slice(rs0, appSrc.indexOf("\n}\n", rs0) + 3);
const fb0 = appSrc.indexOf("// ==== FILTER KITAB PENCARIAN (v70) ====");
const filterSrc = appSrc.slice(fb0, appSrc.indexOf("// ==== /FILTER KITAB PENCARIAN ====", fb0));
const sh0 = appSrc.indexOf("function strongResultHtml_(v, strongId) {");
const strongResSrc = appSrc.slice(sh0, appSrc.indexOf("\n}\n", sh0) + 3);
const pres = fs.readFileSync(path.join(root, "present.html"), "utf8");
const pa = pres.indexOf("function verseNumHtmlBase_(raw) {");
const pb = pres.indexOf("// v69 -- warna nomor Strong");
const presSrc = pres.slice(pa, pb);
let ok = true;
const expect = (n, c, x) => { console.log((c ? "PASS" : "FAIL") + " - " + n + (c ? "" : " :: " + JSON.stringify(x))); if (!c) ok = false; };

const KJV = "In the beginning{H7225} God{H430} created{H1254}{(H8804)}{H853} the heaven{H8064} and{H853} the earth{H776}.";
const harness = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="../css/style.css"></head><body>
<div id="host"><div class="verse-block"><div class="verse-text-wrap" id="w"></div></div></div>
<script>${strongSrc}\n${cleanSrc}\n${presSrc}
window.KJV = ${JSON.stringify(KJV)};
const SEARCH_CAP_NORMAL = 1000, SEARCH_CAP_MAX = 100000;
const BOOKS = [{ num: 1, testament: "PL" }, { num: 40, testament: "PB" }];
function noteHtmlToPlainText(h){ return h; } function searchInBibleNotes(){ return []; }
${filterSrc}
${searchSrc}
${strongResSrc}
window.bibleData = [
  { id: "kjv_1", lang: "kjv", bookNumber: 1, text: "God created", strongText: extractStrongText("God{H430} created{H1254}{(H8804)}") },
  { id: "kjv_2", lang: "kjv", bookNumber: 40, text: "the day", strongText: extractStrongText("the day{H3117} and day{H3117}") },
  { id: "kjv_3", lang: "kjv", bookNumber: 1, text: "a day", strongText: extractStrongText("a day{H31170}") },
  { id: "ind_1", lang: "ind", bookNumber: 1, text: "Allah menciptakan" },
];
</script></body></html>`;

const lum = (rgb) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]); };
const contrast = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
const parse = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);

(async () => {
  const hp = path.join(root, "tests", "_strong-harness.html");
  fs.writeFileSync(hp, harness);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto("file://" + hp);

  const r = await page.evaluate(() => {
    const st = extractStrongText(KJV);
    return {
      st, clean: cleanVerseText(KJV),
      none: extractStrongText("In the beginning God created"),
      html: strongTextToHtml(st),
      stripped: stripStrongMarkers(st),
      q: ["H3117", "{H3117}", "(H8802)", "{(H8802)}", "h 3117", "g5590", "hosea", "H", "H123456", "genesis 1:1"].map(parseStrongQuery),
      has: [verseHasStrong({ strongText: st }, "H8804"), verseHasStrong({ strongText: st }, "H880"), verseHasStrong({ strongText: st }, "H43"), verseHasStrong({ strongText: st }, "H430"), verseHasStrong({}, "H430")],
      pres: verseNumHtml_("1 In the" + String.fromCharCode(2) + "H7225" + String.fromCharCode(2) + " beginning 2 God<b>" + String.fromCharCode(2) + "H430" + String.fromCharCode(2)),
      presPlain: verseNumHtml_("Tanpa nomor <b>"),
    };
  });
  expect("penanda Strong dibuat untuk {H430} & {(H8804)}", r.st.includes("\u0002H430\u0002") && r.st.includes("\u0002(H8804)\u0002"), r.st);
  expect("teks bersih tetap tanpa tag (v.text tidak berubah)", !/\{|H\d/.test(r.clean) && r.clean.startsWith("In the beginning God created"), r.clean);
  expect("ayat tanpa Strong -> undefined", r.none === undefined, r.none);
  expect("HTML: 8 nomor tampil sebagai <sup class=strong-tag>", (r.html.match(/class="strong-tag( strong-tense)?"/g) || []).length === 8, r.html);
  expect("v70: kode kata kerja (H8804) punya class strong-tense, nomor biasa tidak", /class="strong-tag strong-tense" data-strong="H8804">\(H8804\)/.test(r.html) && !/class="strong-tag strong-tense" data-strong="H430"/.test(r.html), r.html);
  expect("HTML: kode bentuk kata kerja tampil dengan kurung (H8804)", r.html.includes(">(H8804)</sup>") && r.html.includes('data-strong="H8804"'), r.html);
  expect("strip kembali ke teks bersih", r.stripped === r.clean || r.stripped.replace(/\s+/g, " ") === r.clean.replace(/\s+/g, " "), [r.stripped, r.clean]);
  expect("parseStrongQuery: semua format dikenali", JSON.stringify(r.q) === JSON.stringify(["H3117", "H3117", "H8802", "H8802", "H3117", "G5590", null, null, null, null]), r.q);
  expect("verseHasStrong: tepat (H880/H43 tidak ikut), (H8804) ikut", JSON.stringify(r.has) === JSON.stringify([true, false, false, true, false]), r.has);
  expect("Layar 2: penanda -> <sup class=vstrong>, nomor ayat tetap", r.pres.includes('<sup class="vstrong">H7225</sup>') && r.pres.includes('<sup class="vstrong">H430</sup>') && r.pres.includes('class="vnum"') && !r.pres.includes("\u0002"), r.pres);
  expect("Layar 2: teks tanpa penanda tetap di-escape", r.presPlain === "Tanpa nomor &lt;b&gt;", r.presPlain);

  const sr = await page.evaluate(() => ({
    h3117: runKeywordSearch("H3117", "ind", "verse", "__all__", "normal").verseResults.map((v) => v.id),
    brace: runKeywordSearch("{H3117}", "kjv", "verse", "__all__", "normal").verseResults.map((v) => v.id),
    tense: runKeywordSearch("(H8804)", "ind", "verse", "__all__", "normal").verseResults.map((v) => v.id),
    pl: runKeywordSearch("H430", "ind", "verse", "PL", "normal").verseResults.map((v) => v.id),
    pb: runKeywordSearch("H3117", "ind", "verse", "PB", "normal").verseResults.map((v) => v.id),
    word: runKeywordSearch("created", "kjv", "verse", "__all__", "normal").verseResults.map((v) => v.id),
    hit: strongResultHtml_(bibleData[1], "H3117"),
  }));
  expect("cari H3117 -> hanya ayat yang punya (H31170 tidak ikut), bahasa pilihan diabaikan", JSON.stringify(sr.h3117) === '["kjv_2"]', sr.h3117);
  expect("cari {H3117} dikenali", JSON.stringify(sr.brace) === '["kjv_2"]', sr.brace);
  expect("cari (H8804) menemukan kode bentuk kata kerja", JSON.stringify(sr.tense) === '["kjv_1"]', sr.tense);
  expect("filter Perjanjian Lama/Baru jalan", JSON.stringify(sr.pl) === '["kjv_1"]' && JSON.stringify(sr.pb) === '["kjv_2"]', [sr.pl, sr.pb]);
  expect("pencarian kata biasa tidak berubah", JSON.stringify(sr.word) === '["kjv_1"]', sr.word);
  expect("hasil: nomor yang dicari disorot (2x), tanpa error", (sr.hit.match(/strong-hit/g) || []).length === 2, sr.hit);

  // render + kontras di semua tema
  await page.evaluate(() => { document.getElementById("w").innerHTML = strongTextToHtml(extractStrongText(KJV)); });
  const themes = ["", 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  for (const t of themes) {
    const info = await page.evaluate((th) => {
      document.documentElement.className = th ? "theme-" + th : "";
      const cs = getComputedStyle(document.documentElement);
      const sup = document.querySelector(".strong-tag");
      const body = document.querySelector(".verse-block");
      return { paper: cs.getPropertyValue("--paper").trim(), ink: cs.getPropertyValue("--ink").trim(), strong: getComputedStyle(sup).color, ink2: getComputedStyle(body).color, display: getComputedStyle(sup).display };
    }, t);
    const hex = (h) => { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map((c) => c + c).join(""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
    const paper = hex(info.paper), strong = parse(info.strong), ink = hex(info.ink);
    const c = contrast(strong, paper);
    const dist = Math.sqrt(strong.reduce((s, v, i) => s + Math.pow(v - ink[i], 2), 0));
    const name = t ? "tema " + t : "tema bawaan";
    expect(name + ": nomor Strong kontras terhadap latar (>= 4.0)", c >= 4.0, { c: c.toFixed(2), strong: info.strong, paper: info.paper });
    expect(name + ": warna BEDA jelas dari tulisan ayat", dist >= 90, { dist: Math.round(dist), strong: info.strong, ink: info.ink });
  }
  // saklar mati
  await page.evaluate(() => document.body.classList.add("strong-off"));
  expect("saklar mati -> nomor disembunyikan", (await page.evaluate(() => getComputedStyle(document.querySelector(".strong-tag")).display)) === "none");
  expect("tanpa error JS", errs.length === 0, errs);
  // v70 -- filter kelompok kitab + warna tense berbeda
  const g = await page.evaluate(() => {
    window.bibleData.push(
      { id: "kjv_m", lang: "kjv", bookNumber: 43, text: "day", strongText: extractStrongText("day{H3117}") },
      { id: "kjv_g", lang: "kjv", bookNumber: 49, text: "day", strongText: extractStrongText("day{H3117}") },
      { id: "kjv_h", lang: "kjv", bookNumber: 35, text: "day", strongText: extractStrongText("day{H3117}") });
    const ids = (k) => runKeywordSearch("H3117", "kjv", "verse", k, "normal").verseResults.map((v) => v.id).sort();
    localStorage.setItem(SEARCH_CUSTOM_BOOKS_KEY, JSON.stringify([35, 49]));
    const w = document.getElementById("w"); w.innerHTML = strongTextToHtml(extractStrongText("a{H430}{(H8802)}"));
    const cs = (sel) => getComputedStyle(w.querySelector(sel)).color;
    return {
      injil: ids("grp:injil"), jantung: ids("grp:jantung"), nabiKecil: ids("grp:nabiKecil"), single: ids("book:49"), custom: ids("custom"),
      all: ids("__all__"), taurat: SEARCH_BOOK_GROUPS.find((x) => x.key === "taurat").nums.join(","), jantungNums: SEARCH_BOOK_GROUPS.find((x) => x.key === "jantung").nums.join(","),
      label: searchBookLabel_("grp:injil"), numColor: cs('.strong-tag[data-strong="H430"]'), tenseColor: cs(".strong-tense"),
    };
  });
  expect("v70: kelompok Injil (40-43) = Matius (40) + Yohanes (43)", JSON.stringify(g.injil) === JSON.stringify(["kjv_2", "kjv_m"]), g.injil);
  expect("v70: kelompok Jantung Alkitab (48-51) -> Efesus", JSON.stringify(g.jantung) === JSON.stringify(["kjv_g"]), g.jantung);
  expect("v70: kelompok Nabi Kecil -> Habakuk (35)", JSON.stringify(g.nabiKecil) === JSON.stringify(["kjv_h"]), g.nabiKecil);
  expect("v70: satu kitab (book:49)", JSON.stringify(g.single) === JSON.stringify(["kjv_g"]), g.single);
  expect("v70: pilih sendiri (35 & 49)", JSON.stringify(g.custom) === JSON.stringify(["kjv_g", "kjv_h"]), g.custom);
  expect("v70: semua Alkitab tidak disaring", g.all.length >= 4, g.all);
  expect("v70: Taurat = 1-5, Jantung = 48-51", g.taurat === "1,2,3,4,5" && g.jantungNums === "48,49,50,51", g);
  expect("v70: warna nomor Strong BEDA dari warna kode kata kerja", g.numColor !== g.tenseColor, g);
  await browser.close(); fs.unlinkSync(hp);
  process.exit(ok ? 0 : 1);
})();
