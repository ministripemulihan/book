// Uji modul js/sync-checklist.js secara terpisah.  Jalankan: node tests/sync-checklist.jsdom.test.js
// Butuh: npm i jsdom
"use strict";
const fs = require("fs"), path = require("path");
const need = (m) => { try { return require(m); } catch (e) { return require(require.resolve(m, { paths: [process.cwd(), "/tmp/lint/node_modules"] })); } };
const { JSDOM } = need("jsdom");
let ok = true;
const expect = (n, c, x) => { console.log((c ? "PASS" : "FAIL") + " - " + n + (c ? "" : " :: " + JSON.stringify(x))); if (!c) ok = false; };

(async () => {
  const dom = new JSDOM('<body><div id="moreMenu"><button id="syncAllBtn"></button></div></body>', { runScripts: "outside-only", url: "http://localhost/" });
  const w = dom.window;
  const meta = { lastSync: new Date(Date.now() - 3 * 86400000).toISOString(), kidungAnakHash: "old", userListHash: null, lastUserSync: new Date().toISOString() };
  const calls = [];
  w.LocalDB = { getMeta: async (k) => meta[k] || null, setMeta: async (k, v) => { meta[k] = v; } };
  w.CONFIG = { USERS_SHEET_CSV_URL: "http://x/users" };
  w.Guest = { isGuest: () => false };
  w.KidungAnak = { sheetUrl: "http://x/ka", resyncQuiet: async () => { calls.push("ka"); return { ok: true, count: 1 }; } };
  w.fetch = async (u) => ({ ok: true, text: async () => (u.endsWith("/ka") ? "baru" : "sama") });
  w.syncUsersFromServer = async () => { calls.push("users"); };
  w.resolveCurrentUserLevels = async () => {};
  w.updateStatusPanel = () => {};
  w.el = (id) => w.document.getElementById(id);
  w.currentUser = "a";
  w.bibleData = [{}];
  w.bgSyncPillShow_ = (t) => calls.push("pill:" + t);
  w.syncFromServer = async (first, parts, opts) => { calls.push("bible:" + JSON.stringify(parts) + ":" + JSON.stringify(opts)); };
  w.eval(fs.readFileSync(path.join(__dirname, "..", "js", "sync-checklist.js"), "utf8"));
  await new Promise((r) => setTimeout(r, 50)); // tunggu DOMContentLoaded
  w.document.getElementById("syncAllBtn").click();
  await new Promise((r) => setTimeout(r, 100));
  const ov = w.document.getElementById("syncChecklistOverlay");
  expect("dialog checklist muncul", !!ov);
  const cbs = [...ov.querySelectorAll('input[type=checkbox]')];
  expect("ada 3 baris (Alkitab, Kidung Anak, Pengguna)", cbs.length === 3, cbs.length);
  expect("Kidung Anak (berubah) dan Pengguna (belum ada hash) tercentang, Alkitab tidak", cbs.map((c) => c.checked).join() === "false,true,true", cbs.map((c) => c.checked));
  expect("tombol menyebut 2 bagian", /2 bagian/.test(ov.textContent), ov.textContent.slice(-80));
  cbs[0].click(); // centang Alkitab juga
  [...ov.querySelectorAll("button")].pop().click();
  await new Promise((r) => setTimeout(r, 100));
  expect("pengguna & kidung anak jalan", calls.includes("users") && calls.includes("ka"), calls);
  expect("Alkitab dipanggil mode background", calls.some((c) => c.startsWith("bible:") && c.includes('"background":true')), calls);
  expect("hash disimpan setelah sukses", meta.kidungAnakHash !== "old" && !!meta.userListHash, meta);
  expect("dialog tertutup", !w.document.getElementById("syncChecklistOverlay"));
  process.exit(ok ? 0 : 1);
})();
