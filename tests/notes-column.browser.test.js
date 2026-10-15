// Uji kolom "Notes" di samping kolom "Ayat" (v55) -- js/app.js: buildNoteColumnBlock / buildColumnBlock_ / columnHeadLabel_
// + penyejajaran Sync per nomor ayat antara kolom Ayat (Indonesia) dan kolom Notes (Inggris).
// Jalankan:  NODE_PATH=$(npm root -g) node tests/notes-column.browser.test.js
"use strict";
const fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const root = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
const a = src.indexOf("function columnKindOf_(col)");
const b = src.indexOf("// Tampilan beberapa kolom berdampingan", a);
const noteSrc = src.slice(a, b);
const h0 = src.indexOf("function paneVerseNum_(block) {");
const s0 = src.indexOf("function wireColumnPaneSync(wrap) {");
const syncSrc = src.slice(h0, src.indexOf("\n}\n", s0) + 3);
let ok = true;
const expect = (n, c, x) => { console.log((c ? "PASS" : "FAIL") + " - " + n + (c ? "" : " :: " + JSON.stringify(x))); if (!c) ok = false; };

const harness = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="../css/style.css"></head><body>
<div id="readerVerses" class="reader-verses"></div><script>
let highlightVerse = null, currentUser = "u";
const verseIndex = { ind: {}, eng: {} };
const CONFIG = { LANGUAGES: [{code:"ind",label:"Indonesia"},{code:"eng",label:"Inggris"}] };
function langLabelFor(c){ const f = CONFIG.LANGUAGES.find(l=>l.code===c); return f?f.label:c; }
function getPersonalNote(){ return ""; }
function linkifyOsisReferences(h){ return h; } function sanitizeNoteHtml(h){ return h; } function toggleInlineVerseRefPreview(){}
function wireColumnPaneFullscreenEsc(){}
function buildVerseBlock(v){ const b=document.createElement("div"); b.className="verse-block"; const n=document.createElement("button"); n.className="verse-num verse-num-btn"; n.textContent=v.verse; const t=document.createElement("div"); t.className="verse-text-wrap"; t.textContent=v.text; b.appendChild(n); b.appendChild(t); return b; }
${noteSrc}
${syncSrc}
const N = 30;
const ind = [], eng = [];
for (let i = 1; i <= N; i++) {
  ind.push({ id: "ind_"+i, lang:"ind", verse:i, bookNumber:4, chapter:8, text: "ayat " + i + " " + "kata ".repeat(8 + (i%5)*6) });
  eng.push({ id: "eng_"+i, lang:"eng", verse:i, bookNumber:4, chapter:8, text: "verse " + i, note: (i % 3 === 0) ? "" : "<div>note " + i + " " + "isi ".repeat(30 + (i%7)*25) + "</div>" });
}
window.cols = [{ lang:"ind", verses: ind, kind:"verse" }, { lang:"eng", verses: eng, kind:"note" }];
window.run = function(){
  const wrap = document.getElementById("readerVerses"); wrap.className = "reader-verses reader-columns reader-columns-panes"; wrap.style.cssText = "display:flex;height:500px;gap:8px";
  cols.forEach((col) => { const pane = document.createElement("div"); pane.className = "reader-col-pane"; pane.style.cssText="flex:1;min-width:0;display:flex;flex-direction:column";
    const body = document.createElement("div"); body.className = "reader-col-pane-body"; body.style.cssText="flex:1;overflow-y:auto";
    const cb = document.createElement("input"); cb.type="checkbox"; cb.checked = true; cb.style.display="none"; pane.appendChild(cb);
    col.verses.forEach((v, i) => body.appendChild(buildColumnBlock_(col, v, i, "Bilangan")));
    pane.appendChild(body); wrap.appendChild(pane); });
  wireColumnPaneSync(wrap);
};
</script></body></html>`;

(async () => {
  const hp = path.join(root, "tests", "_notes-harness.html");
  fs.writeFileSync(hp, harness);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 700, height: 800 } });
  const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto("file://" + hp);
  await page.evaluate(() => run());
  const lab = await page.evaluate(() => [columnHeadLabel_(cols[0]), columnHeadLabel_(cols[1])]);
  expect("label kolom Ayat polos", lab[0] === "Indonesia", lab);
  expect("label kolom Notes ditandai", /Inggris/.test(lab[1]) && /Notes/.test(lab[1]), lab);
  const info = await page.evaluate(() => ({
    verseBlocks: document.querySelectorAll(".reader-col-pane:nth-child(1) .verse-block").length,
    noteBlocks: document.querySelectorAll(".verse-note-block").length,
    emptyNotes: document.querySelectorAll(".verse-note-col-empty").length,
    noteHasText: document.querySelector("#n-eng_1 .note-modal-admin-text") ? document.querySelector("#n-eng_1 .note-modal-admin-text").textContent.indexOf("note 1") >= 0 : false
  }));
  expect("30 blok ayat di kolom kiri", info.verseBlocks === 30, info);
  expect("30 blok notes di kolom kanan", info.noteBlocks === 30, info);
  expect("ayat kelipatan 3 tanpa notes = 10 placeholder", info.emptyNotes === 10, info);
  expect("isi notes tampil", info.noteHasText, info);
  for (const target of [8, 15, 19, 23]) {
    const res = await page.evaluate((t) => {
      const bodies = Array.from(document.querySelectorAll(".reader-col-pane-body"));
      const blk = bodies[0].querySelectorAll(".verse-block")[t - 1];
      bodies[0].scrollTop += blk.getBoundingClientRect().top - bodies[0].getBoundingClientRect().top;
      return new Promise((r) => setTimeout(() => {
        const top = (bd) => { const tp = bd.getBoundingClientRect().top; const bl = Array.from(bd.querySelectorAll(".verse-block")).find((x) => x.getBoundingClientRect().bottom > tp + 1); return paneVerseNum_(bl); };
        const atMax = (bd) => bd.scrollTop >= bd.scrollHeight - bd.clientHeight - 1;
        // kolom yang sudah mentok di dasar tidak bisa digulir lagi (isi ayat terakhir lebih pendek dari kotak) -- itu bukan salah sejajar
        r([top(bodies[0]), top(bodies[1]), atMax(bodies[0]) || atMax(bodies[1])]);
      }, 400));
    }, target);
    expect("scroll ke ayat " + target + " -> Ayat & Notes di nomor yang sama (atau mentok di dasar)", (res[0] === res[1] && res[0] === String(target)) || res[2], res);
  }
  expect("tanpa error JS", errs.length === 0, errs);
  await browser.close(); fs.unlinkSync(hp);
  console.log(ok ? "SEMUA LULUS" : "ADA YANG GAGAL");
  process.exit(ok ? 0 : 1);
})();
