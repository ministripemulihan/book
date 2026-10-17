// Uji v68 -- ayat bernomor sama SEJAJAR (tinggi diratakan) di mode "Bebas + Sync", 2 & 3 kolom.
// Jalankan:  NODE_PATH=$(npm root -g) node tests/pane-equal-height.browser.test.js
"use strict";
const fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const root = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
const h0 = src.indexOf("function paneVerseNum_(block) {");
const s0 = src.indexOf("function wireColumnPaneSync(wrap) {");
const syncSrc = src.slice(h0, src.indexOf("\n}\n", s0) + 3);
const e0 = src.indexOf("function equalizePaneVerseHeights_(wrap) {");
const e1 = src.indexOf("// (Catatan 6 Sep 2026: renderColumnsGridAligned()");
const eqSrc = src.slice(e0, e1);
let ok = true;
const expect = (n, c, x) => { console.log((c ? "PASS" : "FAIL") + " - " + n + (c ? "" : " :: " + JSON.stringify(x))); if (!c) ok = false; };

const harness = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="../css/style.css"></head><body>
<div id="readerVerses"></div><script>
function wireColumnPaneFullscreenEsc(){}
function buildVerseBlock(v){ const b=document.createElement("div"); b.className="verse-block"; const n=document.createElement("button"); n.className="verse-num verse-num-btn"; n.textContent=v.verse; const t=document.createElement("div"); t.className="verse-text-wrap"; t.textContent=v.text; b.appendChild(n); b.appendChild(t); return b; }
${syncSrc}
${eqSrc}
window.build = function(nCols){
  const N = 25, lens = [[3,4,6,2],[10,12,9,14],[20,25,18,30]];
  const wrap = document.getElementById("readerVerses"); wrap.innerHTML=""; wrap.className="reader-verses reader-columns reader-columns-panes"; wrap.style.cssText="display:flex;height:500px;gap:8px";
  for (let c=0;c<nCols;c++){
    const pane=document.createElement("div"); pane.className="reader-col-pane"; pane.style.cssText="flex:1;min-width:0;display:flex;flex-direction:column";
    const cb=document.createElement("input"); cb.type="checkbox"; cb.checked=true; cb.style.display="none"; pane.appendChild(cb);
    const body=document.createElement("div"); body.className="reader-col-pane-body"; body.style.cssText="flex:1;overflow-y:auto";
    for(let i=1;i<=N;i++){ const L=lens[c][i%4]+ (i%7)*3; body.appendChild(buildVerseBlock({verse:i,text:"kata ".repeat(L)})); }
    pane.appendChild(body); wrap.appendChild(pane);
  }
  wireColumnPaneSync(wrap); wireColumnPaneEqualHeights_(wrap);
};
window.report = function(){
  const bodies=[...document.querySelectorAll(".reader-col-pane-body")];
  let maxTopDiff=0, maxHDiff=0;
  for(let i=1;i<=25;i++){
    const bl=bodies.map(b=>[...b.querySelectorAll(".verse-block")].find(x=>paneVerseNum_(x)===String(i)));
    const tops=bl.map((x,k)=>x.getBoundingClientRect().top-bodies[k].getBoundingClientRect().top+bodies[k].scrollTop);
    const hs=bl.map(x=>x.getBoundingClientRect().height);
    maxTopDiff=Math.max(maxTopDiff,Math.max(...tops)-Math.min(...tops));
    maxHDiff=Math.max(maxHDiff,Math.max(...hs)-Math.min(...hs));
  }
  return {maxTopDiff,maxHDiff};
};
</script></body></html>`;

(async () => {
  const hp = path.join(root, "tests", "_pane-eq-harness.html");
  fs.writeFileSync(hp, harness);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto("file://" + hp);
  for (const n of [3, 2]) {
    await page.evaluate((k) => build(k), n);
    await page.waitForTimeout(800);
    let r = await page.evaluate(() => report());
    expect(n + " kolom: semua ayat mulai di garis yang sama (selisih top <= 1px)", r.maxTopDiff <= 1, r);
    expect(n + " kolom: tinggi tiap ayat sama (selisih <= 1px)", r.maxHDiff <= 1, r);
    // geser ke ayat 15 di kolom 1 -> kolom lain ikut, tetap sejajar
    await page.evaluate(() => { const b = document.querySelector(".reader-col-pane-body"); const bl = [...b.querySelectorAll(".verse-block")][14]; b.scrollTop += bl.getBoundingClientRect().top - b.getBoundingClientRect().top; });
    await page.waitForTimeout(400);
    const tops = await page.evaluate(() => [...document.querySelectorAll(".reader-col-pane-body")].map((b) => { const tp = b.getBoundingClientRect().top; const bl = [...b.querySelectorAll(".verse-block")].find((x) => x.getBoundingClientRect().bottom > tp + 1); return paneVerseNum_(bl); }));
    expect(n + " kolom: setelah gulir, ayat di tepi atas sama", new Set(tops).size === 1, tops);
    // ganti ukuran huruf lewat variabel root -> diratakan ulang
    await page.evaluate(() => { document.documentElement.style.setProperty("--verse-font-size", "30px"); });
    await page.waitForTimeout(900);
    r = await page.evaluate(() => report());
    expect(n + " kolom: setelah A+ tetap sejajar", r.maxTopDiff <= 1 && r.maxHDiff <= 1, r);
    await page.evaluate(() => { document.documentElement.style.setProperty("--verse-font-size", "14px"); });
    await page.waitForTimeout(900);
    r = await page.evaluate(() => report());
    expect(n + " kolom: setelah A- tetap sejajar", r.maxTopDiff <= 1 && r.maxHDiff <= 1, r);
    // ubah lebar jendela
    await page.setViewportSize({ width: 700, height: 800 });
    await page.waitForTimeout(900);
    r = await page.evaluate(() => report());
    expect(n + " kolom: setelah resize tetap sejajar", r.maxTopDiff <= 1 && r.maxHDiff <= 1, r);
    await page.setViewportSize({ width: 1000, height: 800 });
  }
  expect("tanpa error JS", errs.length === 0, errs);
  await browser.close();
  fs.unlinkSync(hp);
  process.exit(ok ? 0 : 1);
})();
