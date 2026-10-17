// Uji MODE BACA PENUH + pemutar lagu bisa disembunyikan (book167, 16 Okt 2026).
// Butuh: npm i jsdom@22 fake-indexeddb ;  node tests/baca-penuh.jsdom.test.js
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
const need = (m) => { try { return require(m); } catch (e) { return require(require.resolve(m, { paths: [process.cwd(), "/tmp/jt2/node_modules"] })); } };
const { JSDOM, VirtualConsole, ResourceLoader } = need("jsdom");
const fi = need("fake-indexeddb");
let ok = true;
function expect(name, cond, extra) { console.log((cond ? "PASS" : "FAIL") + " - " + name + (cond ? "" : " :: " + JSON.stringify(extra))); if (!cond) ok = false; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ITEMS = [
  { id: "a1", jenis: "youtube", sumber: "youtube", nama: "Lagu A", channel: "Ch1", keterangan: "", kategori: "Bebas", link: "https://youtu.be/abcdefghijk", kidungRef: "", diuploadOleh: "x" },
  { id: "a2", jenis: "youtube", sumber: "soundcloud", nama: "Lagu SC", channel: "Pemulihan Music", keterangan: "", kategori: "Bebas", link: "https://soundcloud.com/pemulihan/lagu-sc", kidungRef: "", diuploadOleh: "x" },
  { id: "a3", jenis: "youtube", sumber: "mp3", nama: "Suara C", channel: "", keterangan: "", kategori: "Bebas", link: "https://example.com/c.mp3", kidungRef: "", diuploadOleh: "x" },
];

const css = fs.readFileSync(path.join(process.cwd(), "css/style.css"), "utf8");
const root = process.cwd();
const mime = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css" };
const srv = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/$/, "/index.html")); fs.readFile(p, (e, d) => { if (e) { res.statusCode = 404; return res.end(); } res.setHeader("content-type", mime[path.extname(p)] || "application/octet-stream"); res.end(d); }); });

srv.listen(0, async () => {
  const port = srv.address().port, errors = [], opened = [];
  const vc = new VirtualConsole(); vc.on("jsdomError", (e) => errors.push(((e.detail && e.detail.message) || e.message).split("\n")[0]));
  class L extends ResourceLoader { fetch(url, o) { return url.startsWith("http://localhost:" + port) ? super.fetch(url, o) : Promise.resolve(Buffer.from("")); } }
  const dom = await JSDOM.fromURL("http://localhost:" + port + "/index.html", {
    runScripts: "dangerously", resources: new L(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.indexedDB = fi.indexedDB; w.IDBKeyRange = fi.IDBKeyRange;
      w.fetch = (url) => /script\.google\.com/.test(String(url)) && /media_list/.test(String(url)) ? Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, items: ITEMS }) }) : Promise.reject(new Error("no network"));
      w.matchMedia = (q) => ({ matches: /max-width|pointer/.test(String(q)), addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.HTMLMediaElement.prototype.pause = () => {}; w.HTMLMediaElement.prototype.load = () => {};
      w.open = (u) => { opened.push(u); return null; };
      w.__wl = { req: 0, rel: 0 };
      Object.defineProperty(w.navigator, "wakeLock", { configurable: true, value: { request: () => { w.__wl.req++; const l = { release() { w.__wl.rel++; return Promise.resolve(); }, addEventListener() {} }; return Promise.resolve(l); } } });
    },
  });
  await sleep(2500);
  try { await run(dom, errors, opened); } catch (e) { console.log("FAIL - exception", e && e.stack); ok = false; }
  finally { srv.close(); console.log(ok ? "\nALL PASS" : "\nSOME FAIL"); process.exit(ok ? 0 : 1); }
});

async function run(dom, errors, opened) {
  const w = dom.window, doc = w.document, b = doc.body;
  const $ = (s) => doc.querySelector(s), $$ = (s) => Array.from(doc.querySelectorAll(s));
  const click = (n) => n.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
  const tap = (n, y) => n.dispatchEvent(new w.MouseEvent("pointerup", { bubbles: true, cancelable: true, clientX: 100, clientY: y == null ? 300 : y }));
  const card = (t) => $$("#mlBody .ml-grid .ml-card").find((c) => c.textContent.includes(t));
  const ov = () => doc.getElementById("mlPlayerOverlay");
  const pill = () => doc.getElementById("mlPlayerPill");

  // CSS statis
  expect("CSS: body.reader-clean menyembunyikan header (translateY) & toolbar", /body\.reader-clean \.app-header\s*\{[^}]*translateY\(-115%\)/.test(css) && /reader-clean:not\(\.reader-chrome-show\) \.kidung-toolbar/.test(css), null);
  expect("CSS: pemutar tersembunyi dipindah keluar layar (tetap dirender)", /ml-player-collapsed \.ml-player-box\s*\{[^}]*left:\s*-200vw/.test(css), null);

  // A) pemutar lagu: sembunyikan / tampilkan, lagu (iframe) tetap hidup
  w.eval("MediaLibrary.open()"); await sleep(600);
  click($$("#mlTabs .ml-tab").find((x) => /YouTube/.test(x.textContent))); await sleep(200);
  click(card("Lagu SC").querySelector(".ml-card-playable")); await sleep(150);
  const ifr = ov().querySelector("iframe");
  expect("tombol 🙈 Sembunyikan ada di header pemutar", !!$("#mlPlayerHideBtn"), null);
  expect("awal: pemutar mini tampil, tombol bulat 🎵 tersembunyi", ov().classList.contains("ml-player-mini") && !ov().classList.contains("ml-player-collapsed") && pill().hidden && b.classList.contains("ml-player-mini-open"), ov().className);
  click($("#mlPlayerHideBtn"));
  expect("klik 🙈 -> collapsed, tombol 🎵 muncul, iframe SAMA (lagu tetap main), ruang bawah halaman dilepas", ov().classList.contains("ml-player-collapsed") && !pill().hidden && ov().querySelector("iframe") === ifr && !b.classList.contains("ml-player-mini-open") && w.document.documentElement.style.getPropertyValue("--ml-mini-pad") === "0px", [ov().className, b.className]);
  click(pill());
  expect("klik 🎵 -> pemutar mini muncul lagi, iframe SAMA", !ov().classList.contains("ml-player-collapsed") && ov().classList.contains("ml-player-mini") && pill().hidden && ov().querySelector("iframe") === ifr && b.classList.contains("ml-player-mini-open"), ov().className);
  click($("#mlPlayerHideBtn")); click($("#mlPlayerCloseBtn"));
  expect("tutup saat tersembunyi -> semua bersih (tombol 🎵 hilang)", ov().hidden && pill().hidden && !ov().classList.contains("ml-player-collapsed"), ov().className);
  click(card("Lagu SC").querySelector(".ml-card-playable")); await sleep(120);
  expect("buka lagu baru -> tampil mini lagi (bukan tersembunyi)", !ov().classList.contains("ml-player-collapsed") && pill().hidden && !ov().hidden, ov().className);

  const ifr2 = ov().querySelector("iframe");
  // B) mode baca penuh: tombol ⛶ -> reader-clean; pemutar mini ikut disembunyikan
  w.eval("initFullscreenControl()"); // di tes ini data Alkitab tidak dimuat, jadi init dipanggil manual
  const fs = $("#fullscreenToggle");
  expect("tombol ⛶ aktif (tidak disabled) di layar sempit", !fs.disabled, null);
  click(fs);
  expect("klik ⛶ -> body.reader-clean, tombol berubah ⤢", b.classList.contains("reader-clean") && !b.classList.contains("reader-chrome-show") && fs.textContent === "⤢", [b.className, fs.textContent]);
  expect("mode baca penuh -> pemutar mini ikut disembunyikan, lagu tetap hidup", ov().classList.contains("ml-player-collapsed") && !pill().hidden && ov().querySelector("iframe") === ifr2, ov().className);

  // C) ketuk berulang memunculkan / menyembunyikan tombol
  const target = $("#reader") || $(".content-inner") || b;
  tap(target); tap(target);
  expect("2 ketukan di tengah layar -> belum apa-apa", !b.classList.contains("reader-chrome-show"), b.className);
  let extraClicks = 0; const cnt = () => { extraClicks++; }; b.addEventListener("click", cnt);
  tap(target); click(target);
  b.removeEventListener("click", cnt);
  expect("3 ketukan cepat -> tombol-tombol muncul (reader-chrome-show)", b.classList.contains("reader-chrome-show"), b.className);
  expect("klik ketukan ke-3 ditahan (tidak memilih ayat/membuka apa pun)", extraClicks === 0, extraClicks);
  await sleep(450);
  tap(target); tap(target); tap(target);
  expect("3 ketukan lagi -> tombol-tombol hilang lagi", !b.classList.contains("reader-chrome-show"), b.className);
  await sleep(450);
  tap(target, 5); tap(target, 5);
  expect("2 ketukan di pinggir ATAS layar -> tombol muncul", b.classList.contains("reader-chrome-show"), b.className);
  await sleep(450);
  const aPlus = $("#fontIncrease");
  tap(aPlus, 5); tap(aPlus, 5); tap(aPlus, 5);
  expect("ketukan pada tombol (A+) tidak dihitung -> tombol tetap tampil", b.classList.contains("reader-chrome-show"), b.className);
  await sleep(450);
  tap(target, 5); tap(target, 5);
  expect("2 ketukan di pinggir atas -> menyembunyikan lagi", !b.classList.contains("reader-chrome-show"), b.className);
  await sleep(450);
  tap(target, 400); await sleep(600); tap(target, 400); await sleep(600); tap(target, 400);
  expect("ketukan lambat (lewat jeda) tidak dihitung sebagai 3x", !b.classList.contains("reader-chrome-show"), b.className);

  // D) keluar
  click(fs);
  expect("klik ⤢ -> kembali normal (reader-clean & reader-chrome-show hilang)", !b.classList.contains("reader-clean") && !b.classList.contains("reader-chrome-show") && fs.textContent === "⛶", [b.className, fs.textContent]);
  tap(target); tap(target); tap(target);
  expect("di luar mode baca penuh, ketuk 3x tidak melakukan apa-apa", !b.classList.contains("reader-chrome-show"), b.className);
  click(pill());
  expect("tombol 🎵 setelah keluar mode -> pemutar muncul lagi", !ov().classList.contains("ml-player-collapsed"), ov().className);
  click($("#mlPlayerCloseBtn"));

  expect("tidak ada error skrip", errors.filter((e) => !/Not implemented|navigation|resource/i.test(e)).length === 0, errors);
}
