// Uji Layar 2 (present.html) mode NEMPEL Mandarin + Pinyin -- book169 (17 Okt 2026)
// Jalankan: NODE_PATH=$(npm root -g) node tests/present-nempel.browser.test.js (butuh playwright + chromium)
"use strict";
const path = require("path");
const { chromium } = require("playwright");
const P = require("../js/pinyin-ruby.js");
const root = path.join(__dirname, "..");
let ok = true;
function expect(name, cond, extra) { console.log((cond ? "PASS" : "FAIL") + " - " + name + (cond ? "" : " :: " + JSON.stringify(extra))); if (!cond) ok = false; }
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto("file://" + path.join(root, "present.html"));
  await page.waitForTimeout(500);
  const han = "亞伯拉罕的後裔，大衛的子孫（後裔子孫原文都作兒子下同），耶穌基督的家譜：";
  const py = "yà bó lā hǎn de hòu yì, dà wèi de zǐ sūn (hòu yì zǐ sūn yuán wén dōu zuò ér zi xià tóng), yē sū jī dū de jiā pǔ:";
  const mk = (n) => P.mergeGroups(Array.from({ length: n }, (_, i) => ({ ref: "Matius 1:" + (i + 1), texts: [
    { code: "ind", label: "IND", text: "Silsilah Yesus Kristus " + (i + 1) },
    { code: "chs", label: "MDR", text: han }, { code: "chs_pinyin", label: "MDR-PINYIN", text: py }] })));
  // 1) beberapa ayat (groups)
  const r = await page.evaluate((groups) => {
    render({ type: "verse", ref: "Matius 1:1-3", texts: [], groups });
    const g = Array.from(document.querySelectorAll("#text .verse-group"));
    const cells = g[0].querySelectorAll(".rb-cell");
    const c0 = cells[0].getBoundingClientRect(), han0 = cells[0].querySelector(".rb-han").getBoundingClientRect(), py0 = cells[0].querySelector(".rb-py").getBoundingClientRect();
    return {
      groups: g.length, cells: cells.length,
      tagsPerGroup: g.map((x) => Array.from(x.querySelectorAll(".verse-version-tag")).map((t) => t.textContent)),
      first: [cells[0].querySelector(".rb-han").textContent, cells[0].querySelector(".rb-py").textContent],
      pyBelowHan: py0.top >= han0.bottom - 1, sameCenter: Math.abs((py0.left + py0.width / 2) - (han0.left + han0.width / 2)) < 2,
      overflowX: document.documentElement.scrollWidth > innerWidth, bottom: document.getElementById("text").getBoundingClientRect().bottom, vh: innerHeight,
    };
  }, mk(3));
  expect("3 ayat tampil", r.groups === 3, r);
  expect("tiap karakter jadi 1 sel (39 sel pada ayat 1)", r.cells === Array.from(han).filter((c) => /\p{Script=Han}/u.test(c)).length, r.cells);
  expect("sel pertama = 亞 di atas, yà di bawah", r.first[0] === "亞" && r.first[1] === "yà", r.first);
  expect("pinyin tepat di BAWAH karakter & sejajar tengah", r.pyBelowHan && r.sameCenter, r);
  expect("label 'MDR + MDR-PINYIN' hanya di ayat paling atas; IND tetap tiap ayat", JSON.stringify(r.tagsPerGroup) === JSON.stringify([["IND", "MDR + MDR-PINYIN"], ["IND"], ["IND"]]), r.tagsPerGroup);
  expect("tidak ada scroll samping", !r.overflowX, r);
  // 2) 1 ayat (texts), ada nomor ayat
  const r2 = await page.evaluate((texts) => {
    render({ type: "verse", ref: "Filipi 4:1-2", texts });
    return { cells: document.querySelectorAll("#text .rb-cell").length, nums: Array.from(document.querySelectorAll("#text .rb-num")).map((n) => n.textContent), tags: Array.from(document.querySelectorAll("#text .verse-version-tag")).map((t) => t.textContent) };
  }, P.mergeTexts([{ code: "chs", label: "MDR", text: "1 我所愛 2 你們好。" }, { code: "chs_pinyin", label: "MDR-PINYIN", text: "1 wǒ suǒ ài 2 nǐ men hǎo." }]));
  expect("1 slide: 6 sel, nomor ayat 1 & 2 terpisah dari karakter", r2.cells === 6 && JSON.stringify(r2.nums) === '["1","2"]', r2);
  expect("label gabungan tampil sekali", JSON.stringify(r2.tags) === '["MDR + MDR-PINYIN"]', r2);
  // 3) tanpa ruby = tampilan lama tidak berubah
  const r3 = await page.evaluate(() => { render({ type: "verse", ref: "Yoh 1:1", texts: [{ label: "MDR", text: "太初" }, { label: "MDR-PINYIN", text: "tài chū" }] }); return { rb: document.querySelectorAll("#text .rb-cell").length, blocks: document.querySelectorAll("#text .verse-version-block").length }; });
  expect("tanpa ruby: 2 blok atas-bawah seperti biasa", r3.rb === 0 && r3.blocks === 2, r3);
  await page.screenshot({ path: "/tmp/nempel.png" });
  await page.evaluate((groups) => render({ type: "verse", ref: "Matius 1:1-3", texts: [], groups }), mk(2));
  await page.waitForTimeout(1200); await page.screenshot({ path: "/tmp/nempel2.png" });
  await browser.close();
  console.log(ok ? "\nALL PASS" : "\nSOME FAIL"); process.exit(ok ? 0 : 1);
})();
