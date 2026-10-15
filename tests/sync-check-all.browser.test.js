// Uji ☑️ Centang semua di dialog "🔄 Sinkronkan ulang" (js/sync-checklist.js) -- v67
// Jalankan: NODE_PATH=$(npm root -g) node tests/sync-check-all.browser.test.js
"use strict";
const fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const root = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(root, "js/sync-checklist.js"), "utf8");
let ok = true;
const expect = (n, c, x) => { console.log((c ? "PASS" : "FAIL") + " - " + n + (c ? "" : " :: " + JSON.stringify(x))); if (!c) ok = false; };
const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><button id="syncAllBtn"></button><div id="moreMenu"></div><script>
window.__synced = null; window.__users = 0; window.__ka = 0;
const store = { lastSync: new Date().toISOString(), kidungLastSync: new Date().toISOString() };
const LocalDB = { getMeta: async (k) => store[k] || null, setMeta: async (k, v) => { store[k] = v; } };
const CONFIG = { USERS_SHEET_CSV_URL: "http://x/users" };
const SoundFX = { LIST: [{ src: "a.mp3" }] };
const Guest = { isGuest: () => false };
window.KidungAnak = { sheetUrl: "http://x/ka", resyncQuiet: async () => { window.__ka++; return { ok: true }; } };
function resyncKidungSheet() {}
let bibleData = [1];
const _aiChatState = {}; function updateStatusPanel() {} function resolveCurrentUserLevels() {} let currentUser = null;
async function syncUsersFromServer() { window.__users++; }
function bgSyncPillShow_() {} let _bgSync = false;
async function syncFromServer(first, parts, opts) { window.__synced = { first, parts, opts }; }
function el(id) { return document.getElementById(id); }
const _f = window.fetch; window.fetch = async () => ({ ok: true, text: async () => "csv" });
Object.defineProperty(navigator, "onLine", { get: () => true });
</script><script>${src}</script></body></html>`;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
  const hp = path.join(root, "tests", "_sync-harness.html");
  fs.writeFileSync(hp, html);
  await page.goto("file://" + hp);
  await page.evaluate(() => SyncChecklist.open());
  await page.waitForSelector("#syncCheckAll:not([disabled])", { timeout: 5000 });
  const st = () => page.evaluate(() => ({
    all: document.getElementById("syncCheckAll").checked, ind: document.getElementById("syncCheckAll").indeterminate,
    boxes: Array.from(document.querySelectorAll("#syncChecklistOverlay .more-menu-checkbox-list input")).map((c) => c.checked),
    go: Array.from(document.querySelectorAll("#syncChecklistOverlay button")).pop().textContent
  }));
  let s = await st();
  expect("ada baris Centang semua + 5 bagian", s.boxes.length === 5, s);
  expect("awal: semua kosong atau sebagian (belum 'semua')", !s.all, s);
  await page.click("#syncCheckAll");
  s = await st();
  expect("klik Centang semua -> kelima bagian tercentang (Alkitab, Kidung, Kidung Anak, Pengguna, Efek Suara)", s.all && s.boxes.every(Boolean), s);
  expect("tombol menyebut 5 bagian", /5 bagian/.test(s.go), s);
  await page.click("#syncCheckAll");
  s = await st();
  expect("klik lagi -> semua kosong, tombol mati", !s.all && s.boxes.every((b) => !b) && /Belum ada/.test(s.go), s);
  await page.evaluate(() => document.querySelector("#syncChecklistOverlay .more-menu-checkbox-list input").click());
  s = await st();
  expect("centang 1 saja -> Centang semua setengah (indeterminate)", s.ind && !s.all, s);
  await page.click("#syncCheckAll");
  s = await st();
  expect("dari setengah, klik -> jadi semua", s.all && s.boxes.every(Boolean), s);
  await page.evaluate(() => document.querySelector('#syncChecklistOverlay input[name="syncMode"][value="fg"]').click());
  await page.evaluate(() => Array.from(document.querySelectorAll("#syncChecklistOverlay button")).pop().click());
  await page.waitForTimeout(600);
  const res = await page.evaluate(() => ({ synced: window.__synced, users: window.__users, ka: window.__ka }));
  expect("sinkron jalan untuk Alkitab+Kidung+Efek Suara", res.synced && res.synced.parts.bible && res.synced.parts.kidung && res.synced.parts.sounds, res);
  expect("daftar pengguna & Kidung Anak ikut disinkronkan", res.users === 1 && res.ka === 1, res);
  expect("tanpa error JS", errs.length === 0, errs);
  await browser.close(); fs.unlinkSync(hp);
  console.log(ok ? "SEMUA LULUS" : "ADA YANG GAGAL"); process.exit(ok ? 0 : 1);
})();
