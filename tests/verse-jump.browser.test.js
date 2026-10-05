// Uji lompat nomor ayat Alkitab (js/app.js: startVerseJump_/applyVerseJump_/wireColumnPaneSync)
// di BROWSER SUNGGUHAN (layout nyata) untuk semua mode tampilan:
//   1 kolom, grid sejajar 2/3 kolom, kolom bebas+Sync 2/3 kolom, atas-bawah 2/3 baris.
// Jalankan:  NODE_PATH=$(npm root -g) node tests/verse-jump.browser.test.js   (butuh playwright + chromium)
"use strict";
const fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const root = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(root, "js/app.js"), "utf8");

function between(startMarker, endMarker) {
  const a = src.indexOf(startMarker), b = src.indexOf(endMarker, a);
  if (a < 0 || b < 0) throw new Error("marker tidak ketemu: " + startMarker);
  return src.slice(a, b);
}
const jumpSrc = between("let _verseJump = null;", "// Dipakai baik oleh strip lompat ayat");
const syncStart = src.indexOf("function wireColumnPaneSync(wrap) {");
const syncSrc = src.slice(syncStart, src.indexOf("\n}\n", syncStart) + 3);

const harness = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="../css/style.css"></head><body>
<header class="app-header" style="position:sticky;top:0;z-index:50;height:57px;background:#eee">HEADER</header>
<div id="reader"><div id="slotAtas"></div><div id="readerVerses" class="reader-verses"></div></div>
<script>
const el = (id) => document.getElementById(id);
function wireColumnPaneFullscreenEsc() {}
${jumpSrc}
${syncSrc}
const LANGS = 3, N = 40;
function textFor(lang, v) { const rep = [1, 3, 6][lang] * (1 + (v % 4)); return ("Ayat " + v + " bahasa " + lang + " ").concat("kata ".repeat(rep * 6)); }
function block(lang, v) {
  const b = document.createElement("div"); b.className = "verse-block"; b.id = "v-" + lang + "_" + v;
  const n = document.createElement("button"); n.className = "verse-num verse-num-btn"; n.textContent = v;
  const t = document.createElement("div"); t.className = "verse-text-wrap"; t.textContent = textFor(lang, v);
  b.appendChild(n); b.appendChild(t); return b;
}
// mode: single | grid | panes | stacked ; cols: 1..3
function render(mode, cols) {
  const wrap = el("readerVerses"); wrap.innerHTML = ""; wrap.className = "reader-verses";
  window.scrollTo(0, 0); el("slotAtas").innerHTML = ""; _verseJump = null;
  if (mode === "single" || cols === 1) { for (let v = 1; v <= N; v++) wrap.appendChild(block(0, v)); return; }
  wrap.classList.add("reader-columns"); wrap.setAttribute("data-cols", String(cols));
  if (mode === "grid") {
    wrap.classList.add("reader-columns-grid");
    for (let v = 1; v <= N; v++) for (let l = 0; l < cols; l++) { const c = document.createElement("div"); c.className = "reader-grid-cell"; c.appendChild(block(l, v)); wrap.appendChild(c); }
  } else if (mode === "panes") {
    wrap.classList.add("reader-columns-panes");
    for (let l = 0; l < cols; l++) {
      const pane = document.createElement("div"); pane.className = "reader-col-pane";
      pane.innerHTML = '<div class="reader-col-pane-head"><label><input type="checkbox" checked></label></div>';
      const body = document.createElement("div"); body.className = "reader-col-pane-body";
      for (let v = 1; v <= N; v++) body.appendChild(block(l, v));
      pane.appendChild(body); wrap.appendChild(pane);
    }
    wireColumnPaneSync(wrap);
  } else {
    wrap.classList.add("reader-columns-stacked");
    for (let v = 1; v <= N; v++) for (let l = 0; l < cols; l++) wrap.appendChild(block(l, v));
  }
}
</script></body></html>`;
const hp = path.join(root, "tests", "_verse-jump-harness.html");
fs.writeFileSync(hp, harness);

let ok = true;
function expect(name, cond, extra) { console.log((cond ? "PASS" : "FAIL") + " - " + name + (cond ? "" : " :: " + JSON.stringify(extra))); if (!cond) ok = false; }

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await page.goto("file://" + hp);
  const modes = [["single", 1], ["grid", 2], ["grid", 3], ["panes", 2], ["panes", 3], ["stacked", 2], ["stacked", 3]];
  const targets = [7, 22, 35, 3, 40];
  for (const [mode, cols] of modes) {
    await page.evaluate(([m, c]) => render(m, c), [mode, cols]);
    for (const vnum of targets) {
      await page.evaluate((v) => startVerseJump_(v), vnum);
      await page.waitForTimeout(700);
      const res = await page.evaluate((v) => {
        const hH = document.querySelector(".app-header").offsetHeight;
        return findVerseBlocksInReader_(v).map((b) => {
          const r = b.getBoundingClientRect();
          const body = b.closest(".reader-col-pane-body");
          const top = body ? body.getBoundingClientRect().top : hH;
          const bottom = body ? body.getBoundingClientRect().bottom : innerHeight;
          return { top: Math.round(r.top), bottom: Math.round(r.bottom), visTop: Math.round(top), visBottom: Math.round(bottom), pane: !!body };
        });
      }, vnum);
      const allVisible = res.length > 0 && res.every((x) => x.top >= x.visTop - 3 && x.bottom <= x.visBottom + 3);
      expect(`${mode} ${cols}x -> ayat ${vnum} terlihat di semua kolom/baris`, allVisible, res);
    }
  }
  // Tata letak bergeser SESUDAH render (judul Garis Besar/kotak media async) -> harus dikoreksi.
  for (const [mode, cols] of [["single", 1], ["panes", 3], ["stacked", 3]]) {
    await page.evaluate(([m, c]) => render(m, c), [mode, cols]);
    await page.evaluate(() => startVerseJump_(25));
    await page.waitForTimeout(150);
    await page.evaluate(() => { const d = document.createElement("div"); d.style.height = "420px"; d.textContent = "kotak media menyusul"; el("slotAtas").appendChild(d); });
    await page.waitForTimeout(900);
    const ok2 = await page.evaluate(() => findVerseBlocksInReader_(25).every((b) => { const r = b.getBoundingClientRect(); const body = b.closest(".reader-col-pane-body"); const t = body ? body.getBoundingClientRect().top : 57; const bt = body ? body.getBoundingClientRect().bottom : innerHeight; return r.top >= t - 3 && r.bottom <= bt + 3; }));
    expect(`${mode} ${cols}x -> koreksi setelah tata letak bergeser`, ok2);
  }
  // Mode kolom bebas: kolom lain TIDAK boleh diseret persentase oleh Sync.
  await page.evaluate(() => render("panes", 3));
  await page.evaluate(() => startVerseJump_(30));
  await page.waitForTimeout(900);
  const aligned = await page.evaluate(() => Array.from(document.querySelectorAll(".reader-col-pane-body")).map((body) => { const b = Array.from(body.querySelectorAll(".verse-block")).find((x) => x.querySelector(".verse-num-btn").textContent === "30"); return b.getBoundingClientRect().top - body.getBoundingClientRect().top; }));
  expect("panes 3x -> awal ayat 30 sejajar di ketiga kolom (selisih <= 6px)", Math.max(...aligned) - Math.min(...aligned) <= 6, aligned);
  await browser.close();
  fs.unlinkSync(hp);
  console.log(ok ? "SEMUA LULUS" : "ADA YANG GAGAL");
  process.exit(ok ? 0 : 1);
})();
