// Uji ☑️ Centang semua di dialog unduhan PERTAMA KALI login (showBibleSyncPrompt di js/app.js) -- v67
// Jalankan: NODE_PATH=$(npm root -g) node tests/first-login-check-all.browser.test.js
"use strict";
const fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
const a = app.indexOf("async function showBibleSyncPrompt(opts) {");
const b = app.indexOf("// Dipakai kalau pengguna memilih masuk dulu", a);
const fn = app.slice(a, b);
let ok = true;
const expect = (n, c, x) => { console.log((c ? "PASS" : "FAIL") + " - " + n + (c ? "" : " :: " + JSON.stringify(x))); if (!c) ok = false; };
const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><script>
window.__sync = null;
function el(id) { return document.getElementById(id); }
async function getInitialDownloadInfo() { return { bibleMb: 64, kidungMb: 4, hasAccess: true, label: "~68 MB" }; }
function resyncKidungSheet() {}
const SoundFX = { LIST: [{ src: "a.mp3" }, { src: "b.mp3" }] };
function syncFromServer(first, parts) { window.__sync = { first, parts }; }
function showBibleNotDownloadedState() {}
${fn}
</script></body></html>`;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
  const hp = path.join(root, "tests", "_first-harness.html");
  fs.writeFileSync(hp, html);
  await page.goto("file://" + hp);
  await page.evaluate(() => showBibleSyncPrompt({ isFirstTime: true, connType: null }));
  const st = () => page.evaluate(() => ({
    all: document.getElementById("dlPickAll").checked, ind: document.getElementById("dlPickAll").indeterminate,
    bible: document.getElementById("dlPickBible").checked, kidung: document.getElementById("dlPickKidung").checked, sounds: document.getElementById("dlPickSounds").checked,
    btn: document.querySelector("#wifiPromptOverlay .chip-btn.primary").textContent, dis: document.querySelector("#wifiPromptOverlay .chip-btn.primary").disabled,
    firstInList: document.querySelector("#wifiPromptOverlay .more-menu-checkbox-list label:first-child input").id
  }));
  let s = await st();
  expect("baris Centang semua di paling atas daftar", s.firstInList === "dlPickAll", s);
  expect("awal (Alkitab+Kidung, Efek Suara belum) -> setengah tercentang", s.bible && s.kidung && !s.sounds && s.ind && !s.all, s);
  await page.click("#dlPickAll");
  s = await st();
  expect("klik -> Alkitab + Kidung + Efek Suara tercentang semua", s.all && s.bible && s.kidung && s.sounds, s);
  expect("tombol Mulai Unduh menghitung ~69,1 MB", /69\.1|69,1/.test(s.btn), s.btn);
  await page.click("#dlPickAll");
  s = await st();
  expect("klik lagi -> semua kosong & tombol mati", !s.all && !s.bible && !s.kidung && !s.sounds && s.dis, s);
  await page.click("#dlPickSounds");
  s = await st();
  expect("centang 1 -> Centang semua setengah", s.ind && !s.all, s);
  await page.click("#dlPickAll");
  await page.evaluate(() => document.querySelector("#wifiPromptOverlay .chip-btn.primary").click());
  const r = await page.evaluate(() => window.__sync);
  expect("Mulai Unduh mengirim bible+kidung+sounds sekaligus (pertama kali)", r && r.first === true && r.parts.bible && r.parts.kidung && r.parts.sounds, r);
  expect("tanpa error JS", errs.length === 0, errs);
  await browser.close(); fs.unlinkSync(hp);
  console.log(ok ? "SEMUA LULUS" : "ADA YANG GAGAL"); process.exit(ok ? 0 : 1);
})();
