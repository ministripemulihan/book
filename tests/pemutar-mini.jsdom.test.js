// Uji PEMUTAR MINI (book166, 16 Okt 2026): lagu SoundCloud/MP3 langsung mini (syair di belakang tetap terlihat),
// video YouTube bisa dikecilkan tanpa memuat ulang iframe, layar-tetap-menyala (Wake Lock) di HP.
// Butuh: npm i jsdom fake-indexeddb ;  node tests/pemutar-mini.jsdom.test.js
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
      w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
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
  const w = dom.window, doc = w.document;
  const $ = (s) => doc.querySelector(s), $$ = (s) => Array.from(doc.querySelectorAll(s));
  const click = (n) => n.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  const card = (t) => $$("#mlBody .ml-grid .ml-card").find((c) => c.textContent.includes(t));
  const play = (t) => click(card(t).querySelector(".ml-card-playable"));

  // CSS statis
  expect("CSS: overlay mini tidak menangkap klik (pointer-events:none)", /\.ml-player-overlay\.ml-player-mini\s*\{[^}]*pointer-events:\s*none/.test(css), null);
  expect("CSS: halaman diberi ruang bawah (body.ml-player-mini-open)", /body\.ml-player-mini-open\s*\{[^}]*padding-bottom/.test(css), null);

  w.eval("MediaLibrary.open()"); await sleep(600);
  click($$("#mlTabs .ml-tab").find((b) => /YouTube/.test(b.textContent))); await sleep(200);
  const ov = () => doc.getElementById("mlPlayerOverlay");

  // 1) SoundCloud -> langsung mini + mode audio, tanpa latar gelap
  play("Lagu SC"); await sleep(150);
  expect("SoundCloud: pemutar terbuka langsung dalam MODE MINI (audio)", !ov().hidden && ov().classList.contains("ml-player-mini") && ov().classList.contains("ml-player-mini-audio"), ov().className);
  expect("SoundCloud: body diberi kelas ml-player-mini-open (ruang bawah halaman)", doc.body.classList.contains("ml-player-mini-open"), doc.body.className);
  const ifr = ov().querySelector("iframe");
  expect("SoundCloud: widget w.soundcloud.com + auto_play + visual=false", !!ifr && /w\.soundcloud\.com\/player\/\?url=/.test(ifr.src) && /auto_play=true/.test(ifr.src) && /visual=false/.test(ifr.src), ifr && ifr.src);
  expect("SoundCloud: tombol Layar Penuh disembunyikan lewat CSS audio (tombol Kecil/Besar ada)", !!$("#mlPlayerMiniBtn") && /Besar/.test($("#mlPlayerMiniBtn").textContent), $("#mlPlayerMiniBtn") && $("#mlPlayerMiniBtn").textContent);
  expect("Layar tetap menyala: tombol tampil (browser punya Wake Lock)", !$("#mlPlayerWakeBtn").hidden, null);
  expect("Layar tetap menyala: perangkat non-sentuh & belum pernah dipilih -> tidak otomatis", w.__wl.req === 0, w.__wl);

  // 2) tombol Layar nyala -> minta Wake Lock; matikan -> dilepas
  click($("#mlPlayerWakeBtn")); await sleep(30);
  expect("klik 🔆 -> Wake Lock diminta, label 'Layar nyala'", w.__wl.req === 1 && /Layar nyala/.test($("#mlPlayerWakeBtn").textContent) && $("#mlPlayerWakeBtn").getAttribute("aria-pressed") === "true", [w.__wl, $("#mlPlayerWakeBtn").textContent]);
  click($("#mlPlayerWakeBtn")); await sleep(30);
  expect("klik lagi -> Wake Lock dilepas", w.__wl.rel === 1 && /boleh mati/.test($("#mlPlayerWakeBtn").textContent), [w.__wl, $("#mlPlayerWakeBtn").textContent]);
  click($("#mlPlayerWakeBtn")); await sleep(30); // nyalakan lagi, lalu tutup -> harus dilepas
  const relBefore = w.__wl.rel;

  // 3) Besar <-> Kecil memakai iframe YANG SAMA (tidak dimuat ulang)
  click($("#mlPlayerMiniBtn"));
  expect("klik Besar -> mode mini dilepas, iframe sama", !ov().classList.contains("ml-player-mini") && ov().querySelector("iframe") === ifr && !doc.body.classList.contains("ml-player-mini-open"), ov().className);
  click($("#mlPlayerMiniBtn"));
  expect("klik Kecil -> mini lagi, iframe sama", ov().classList.contains("ml-player-mini") && ov().querySelector("iframe") === ifr, ov().className);

  // 4) tutup -> semua dibersihkan + Wake Lock dilepas
  click($("#mlPlayerCloseBtn"));
  expect("tutup: kelas mini hilang, body bersih, iframe kosong", ov().hidden && !ov().classList.contains("ml-player-mini") && !doc.body.classList.contains("ml-player-mini-open") && !ov().querySelector("iframe"), ov().className);
  expect("tutup: Wake Lock dilepas", w.__wl.rel === relBefore + 1, w.__wl);

  // 5) YouTube mulai BESAR, bisa dikecilkan (jendela kecil, bukan bar audio)
  play("Lagu A"); await sleep(100);
  expect("YouTube: mulai normal (bukan mini)", !ov().hidden && !ov().classList.contains("ml-player-mini"), ov().className);
  const yt = ov().querySelector("iframe");
  click($("#mlPlayerMiniBtn"));
  expect("YouTube: dikecilkan -> mini video (bukan audio), iframe sama tidak dimuat ulang", ov().classList.contains("ml-player-mini") && !ov().classList.contains("ml-player-mini-audio") && ov().querySelector("iframe") === yt, ov().className);
  click($("#mlPlayerFsBtn"));
  expect("YouTube: Layar Penuh dari mini -> keluar dari mini", ov().classList.contains("ml-player-full") && !ov().classList.contains("ml-player-mini"), ov().className);
  click($("#mlPlayerCloseBtn"));

  // 6) MP3 -> mini audio
  play("Suara C"); await sleep(60);
  expect("MP3: langsung mini audio, elemen <audio> ada", ov().classList.contains("ml-player-mini-audio") && !!ov().querySelector("audio"), ov().className);
  click($("#mlPlayerCloseBtn"));

  // 7) HP (layar sentuh): Wake Lock otomatis, kecuali pernah dimatikan
  w.matchMedia = (q) => ({ matches: /pointer:\s*coarse/.test(q), addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  try { w.localStorage.removeItem("ml_player_wake"); } catch (e) {}
  const before = w.__wl.req;
  play("Lagu SC"); await sleep(150);
  expect("HP (pointer: coarse), belum pernah memilih -> Wake Lock otomatis diminta", w.__wl.req === before + 1, w.__wl);
  click($("#mlPlayerCloseBtn"));

  expect("tidak ada error skrip", errors.filter((e) => !/Not implemented|navigation|resource/i.test(e)).length === 0, errors);
}
