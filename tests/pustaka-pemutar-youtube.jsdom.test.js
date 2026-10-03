// Uji pemutar YouTube Pustaka Media (2 Okt 2026): jendela pemutar harus DI ATAS panel Pustaka Media,
// tombol Layar Penuh (CSS + Fullscreen API) & Buka di YouTube, link tanpa ID -> buka tab baru.
// Butuh: npm i jsdom@26 fake-indexeddb ;  node tests/pustaka-pemutar-youtube.jsdom.test.js
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
  { id: "a2", jenis: "youtube", sumber: "youtube", nama: "Playlist B", channel: "Ch1", keterangan: "", kategori: "Bebas", link: "https://www.youtube.com/playlist?list=PLxxxxxxxx", kidungRef: "", diuploadOleh: "x" },
  { id: "a3", jenis: "youtube", sumber: "mp3", nama: "Suara C", channel: "", keterangan: "", kategori: "Bebas", link: "https://example.com/c.mp3", kidungRef: "", diuploadOleh: "x" },
];

// --- Pemeriksaan CSS statis: urutan z-index ---
const css = fs.readFileSync(path.join(process.cwd(), "css/style.css"), "utf8");
function lastZ(sel) {
  const re = new RegExp("(^|\\n)\\s*" + sel.replace(/[.]/g, "\\.") + "\\s*\\{[^}]*?z-index:\\s*(\\d+)", "g");
  let m, z = null; while ((m = re.exec(css))) z = +m[2]; return z;
}
const zPanel = lastZ(".info-kami-overlay"), zPlayer = lastZ(".ml-player-overlay"), zForm = lastZ(".ml-form-overlay"), zKv = lastZ(".ml-kv-overlay");
expect("z-index pemutar > panel Pustaka Media", zPlayer > zPanel, { zPanel, zPlayer });
expect("z-index form Tambah/Edit > panel", zForm > zPanel, { zPanel, zForm });
expect("z-index kotak kidung > panel", zKv > zPanel, { zPanel, zKv });
expect("pemutar di atas form & kotak kidung", zPlayer > zForm && zPlayer > zKv, { zForm, zKv, zPlayer });

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
      w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.HTMLMediaElement.prototype.pause = () => {}; w.HTMLMediaElement.prototype.load = () => {};
      w.open = (u) => { opened.push(u); return null; };
    },
  });
  await sleep(2500);
  try { await run(dom, errors, opened); } catch (e) { console.log("FAIL - exception", e && e.stack); ok = false; }
  finally { srv.close(); console.log(ok ? "\nALL PASS" : "\nSOME FAIL"); process.exit(ok ? 0 : 1); }
});

async function run(dom, errors, opened) {
  const w = dom.window, doc = w.document;
  const $ = (s) => doc.querySelector(s), $$ = (s) => Array.from(doc.querySelectorAll(s));
  const click = (n) => n.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  const card = (t) => $$("#mlBody .ml-grid .ml-card").find((c) => c.textContent.includes(t));
  const play = (t) => click(card(t).querySelector(".ml-card-playable"));

  w.eval("MediaLibrary.open()"); await sleep(600);
  click($$("#mlTabs .ml-tab").find((b) => /YouTube/.test(b.textContent))); await sleep(200);

  // 1) video YouTube biasa
  play("Lagu A"); await sleep(100);
  const ov = doc.getElementById("mlPlayerOverlay");
  expect("jendela pemutar terbuka", !!ov && !ov.hidden, null);
  const ifr = ov && ov.querySelector("iframe");
  expect("iframe embed ID benar + playsinline", !!ifr && /youtube\.com\/embed\/abcdefghijk\?playsinline=1/.test(ifr.src), ifr && ifr.src);
  expect("iframe boleh fullscreen (allow + allowfullscreen) & referrerpolicy", !!ifr && /fullscreen/.test(ifr.getAttribute("allow")) && ifr.hasAttribute("allowfullscreen") && ifr.getAttribute("referrerpolicy") === "strict-origin-when-cross-origin", ifr && ifr.outerHTML);
  const yt = doc.getElementById("mlPlayerOpenLink");
  expect("tombol Buka di YouTube -> watch?v=ID", !yt.hidden && yt.href === "https://www.youtube.com/watch?v=abcdefghijk" && /Buka di YouTube/.test(yt.textContent), [yt.hidden, yt.href, yt.textContent]);
  expect("petunjuk 'tidak muncul' tampil untuk YouTube", !doc.getElementById("mlPlayerHint").hidden, null);
  const fs_ = doc.getElementById("mlPlayerFsBtn");
  expect("tombol Layar Penuh ada & terlihat", !!fs_ && !fs_.hidden && /Layar Penuh/.test(fs_.textContent), fs_ && fs_.textContent);

  // 2) layar penuh (jsdom tidak punya Fullscreen API -> harus tetap jalan lewat kelas CSS)
  click(fs_);
  expect("klik Layar Penuh -> kelas ml-player-full", ov.classList.contains("ml-player-full"), ov.className);
  expect("label tombol berubah jadi Kecilkan", /Kecilkan/.test(fs_.textContent), fs_.textContent);
  doc.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  expect("Esc pertama keluar dari layar penuh, pemutar tetap terbuka", !ov.classList.contains("ml-player-full") && !ov.hidden, ov.className);
  click(fs_); click(fs_);
  expect("klik 2x -> kembali normal", !ov.classList.contains("ml-player-full"), ov.className);
  click(fs_);
  doc.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true })); // keluar penuh
  doc.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true })); // tutup
  expect("Esc kedua menutup pemutar & mengosongkan iframe", ov.hidden && !ov.querySelector("iframe"), ov.hidden);

  // 3) buka lagi -> tidak 'nyangkut' dalam mode penuh
  click(fs_); click($("#mlPlayerCloseBtn")); play("Lagu A"); await sleep(50);
  expect("buka lagi -> tidak dalam mode penuh", !ov.hidden && !ov.classList.contains("ml-player-full"), ov.className);
  click($("#mlPlayerCloseBtn"));

  // 4) link YouTube tanpa ID video (playlist) -> langsung buka tab/aplikasi YouTube, bukan iframe kosong
  play("Playlist B"); await sleep(50);
  expect("link playlist tanpa ID -> window.open, pemutar tidak terbuka", opened.includes("https://www.youtube.com/playlist?list=PLxxxxxxxx") && ov.hidden, [opened, ov.hidden]);

  // 5) pemutar audio -> tombol layar penuh & petunjuk YouTube disembunyikan
  play("Suara C"); await sleep(50);
  expect("audio: tombol layar penuh tersembunyi, petunjuk YouTube tersembunyi", doc.getElementById("mlPlayerFsBtn").hidden && doc.getElementById("mlPlayerHint").hidden, null);
  click($("#mlPlayerCloseBtn"));

  // 6) Fullscreen API sungguhan dipanggil bila tersedia
  let called = 0;
  ov.requestFullscreen = function () { called++; return Promise.resolve(); };
  play("Lagu A"); await sleep(50);
  click(doc.getElementById("mlPlayerFsBtn")); await sleep(50);
  expect("Fullscreen API dipanggil di elemen pemutar", called === 1 && ov.classList.contains("ml-player-full"), called);
  click($("#mlPlayerCloseBtn"));

  const bad = errors.filter((e) => !/Could not load|not implemented|Not implemented|navigation/i.test(e));
  expect("tidak ada error skrip", bad.length === 0, bad);
}
