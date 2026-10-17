// Uji menu sidebar "🎬 Media" (book163): semua media ber-BibleRef per kitab, putar di menu + ayat di bawah video,
// tombol "Buka di Alkitab", pencarian. Butuh: npm i jsdom@26 fake-indexeddb ; node tests/media-menu.jsdom.test.js
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
const need = (m) => { try { return require(m); } catch (e) { return require(require.resolve(m, { paths: [process.cwd(), "/tmp/jt2/node_modules", "/tmp/jsd/node_modules"] })); } };
const { JSDOM, VirtualConsole, ResourceLoader } = need("jsdom");
const fi = need("fake-indexeddb");
let ok = true;
function expect(name, cond, extra) { console.log((cond ? "PASS" : "FAIL") + " - " + name + (cond ? "" : " :: " + JSON.stringify(extra))); if (!cond) ok = false; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ITEMS = [
  { id: "m1", jenis: "youtube", sumber: "youtube", nama: "PPKMA Markus", channel: "@pkkma", kategori: "PPKMA", link: "https://www.youtube.com/watch?v=abcdefghijk", bibleRef: "Markus 12:30-31", diuploadOleh: "x" },
  { id: "m2", jenis: "youtube", sumber: "youtube", nama: "10 Perintah", channel: "@pemulihan", kategori: "Animasi Anak", link: "https://www.youtube.com/watch?v=bbbbbbbbbbb", bibleRef: "Keluaran 20", diuploadOleh: "x" },
  { id: "m3", jenis: "youtube", sumber: "youtube", nama: "Menara Babel", channel: "@pemulihan", kategori: "Animasi Anak", link: "https://www.youtube.com/watch?v=ccccccccccc", bibleRef: "Kejadian 11", diuploadOleh: "x" },
  { id: "m5", jenis: "youtube", sumber: "soundcloud", nama: "Mazmur 23 SC", channel: "Pemulihan Music", kategori: "Bebas", link: "https://on.soundcloud.com/PWEgnDR4ORPTjWRctr", bibleRef: "Mazmur 23", diuploadOleh: "x" },
  { id: "m4", jenis: "youtube", sumber: "youtube", nama: "Tanpa BibleRef", channel: "", kategori: "Bebas", link: "https://www.youtube.com/watch?v=ddddddddddd", bibleRef: "", diuploadOleh: "x" },
];

const root = process.cwd();
const mime = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css" };
const srv = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/$/, "/index.html")); fs.readFile(p, (e, d) => { if (e) { res.statusCode = 404; return res.end(); } res.setHeader("content-type", mime[path.extname(p)] || "application/octet-stream"); res.end(d); }); });

srv.listen(0, async () => {
  const port = srv.address().port, errors = [];
  const vc = new VirtualConsole(); vc.on("jsdomError", (e) => errors.push(((e.detail && e.detail.message) || e.message).split("\n")[0]));
  class L extends ResourceLoader { fetch(url, o) { return url.startsWith("http://localhost:" + port) ? super.fetch(url, o) : Promise.resolve(Buffer.from("")); } }
  const dom = await JSDOM.fromURL("http://localhost:" + port + "/index.html", {
    runScripts: "dangerously", resources: new L(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.indexedDB = fi.indexedDB; w.IDBKeyRange = fi.IDBKeyRange;
      w.fetch = (url) => /soundcloud\.com\/oembed/.test(String(url)) ? Promise.resolve({ ok: true, json: () => Promise.resolve({ html: '<iframe src="https://w.soundcloud.com/player/?visual=true&url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F123456&show_artwork=true"></iframe>' }) }) : /script\.google\.com/.test(String(url)) && /media_list/.test(String(url)) ? Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, items: ITEMS }) }) : Promise.reject(new Error("no network"));
      w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.HTMLMediaElement.prototype.pause = () => {}; w.HTMLMediaElement.prototype.load = () => {};
      w.open = () => null;
    },
  });
  await sleep(2500);
  try { await run(dom, errors); } catch (e) { console.log("FAIL - exception", e && e.stack); ok = false; }
  finally { srv.close(); console.log(ok ? "\nALL PASS" : "\nSOME FAIL"); process.exit(ok ? 0 : 1); }
});

async function run(dom, errors) {
  const w = dom.window, doc = w.document;
  const $ = (s) => doc.querySelector(s), $$ = (s) => Array.from(doc.querySelectorAll(s));
  const click = (n) => n.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));

  const btn = doc.getElementById("allMediaBtn");
  expect("tombol sidebar '🎬 Media' ada & tidak tersembunyi", !!btn && !btn.hidden && /Media/.test(btn.textContent), btn && [btn.hidden, btn.textContent]);

  // data Alkitab palsu (Markus 12:29-32, Keluaran 20:1-3) supaya teks ayat bisa ditampilkan di bawah video
  w.eval(`currentLang = "ind"; verseIndex = { ind: {
    41: { 12: [29,30,31,32].map(function(n){return {verse:n,chapter:12,bookName:"Markus",text:"Teks Markus ayat "+n};}) },
    2:  { 20: [1,2,3].map(function(n){return {verse:n,chapter:20,bookName:"Keluaran",text:"Teks Keluaran ayat "+n};}) } } };`);
  w.eval(`window.__opened = []; renderChapter = function(b,c,v){ window.__opened.push([b,c,v]); };`);

  click(btn); await sleep(600);
  const panel = doc.getElementById("allMediaPanel");
  expect("panel Media terbuka", !!panel && !panel.hidden, null);
  expect("panel lain tertutup (daftar pasal/pembaca)", doc.getElementById("reader").hidden, null);
  const sums = $$("#allMediaPanel details > summary").map((s) => s.textContent.trim());
  expect("dikelompokkan per kitab: Kejadian, Keluaran, Mazmur, Markus (tanpa item tanpa BibleRef)", sums.length === 4 && /Kejadian \(1\)/.test(sums[0]) && /Keluaran \(1\)/.test(sums[1]) && /Mazmur \(1\)/.test(sums[2]) && /Markus \(1\)/.test(sums[3]), sums);
  expect("urutan PL lalu PB (judul grup)", $$("#allMediaPanel h3").map((h) => h.textContent).join("|") === "Perjanjian Lama|Perjanjian Baru", $$("#allMediaPanel h3").map((h) => h.textContent));
  expect("jumlah media di status = 4", /4 media di 4 kitab/.test(panel.textContent), panel.textContent.slice(0, 200));
  expect("item tanpa BibleRef tidak ikut", !/Tanpa BibleRef/.test(panel.textContent), null);

  // buka akordion Markus -> kartu digambar
  const mk = $$("#allMediaPanel details").find((d) => /Markus/.test(d.querySelector("summary").textContent));
  mk.open = true; mk.dispatchEvent(new w.Event("toggle")); await sleep(150);
  const card = mk.querySelector(".ml-card");
  expect("kartu Markus tampil + label rujukan", !!card && /Markus 12:30-31/.test(mk.textContent) && /PPKMA Markus/.test(mk.textContent), mk.textContent);

  // putar di menu -> ayat di bawah video
  click(card.querySelector(".ml-card-playable")); await sleep(120);
  const pv = doc.getElementById("mlPlayerVerses");
  expect("pemutar terbuka dari menu Media", !doc.getElementById("mlPlayerOverlay").hidden, null);
  expect("ayat 30 & 31 tampil di bawah video, ayat 29/32 tidak", !pv.hidden && /Teks Markus ayat 30/.test(pv.textContent) && /Teks Markus ayat 31/.test(pv.textContent) && !/ayat 29/.test(pv.textContent) && !/ayat 32/.test(pv.textContent), pv.textContent);
  expect("judul rujukan 📖 Markus 12:30,31", /Markus 12:30,31/.test(pv.textContent), pv.textContent);
  click($("#mlPlayerCloseBtn"));

  // seluruh pasal (Keluaran 20) -> di menu TETAP tampil ayatnya (tidak ada layar baca di belakang)
  const kl = $$("#allMediaPanel details").find((d) => /Keluaran/.test(d.querySelector("summary").textContent));
  kl.open = true; kl.dispatchEvent(new w.Event("toggle")); await sleep(150);
  click(kl.querySelector(".ml-card-playable")); await sleep(120);
  expect("referensi seluruh pasal di menu Media: ayat pasal tampil", !pv.hidden && /Teks Keluaran ayat 1/.test(pv.textContent) && /Teks Keluaran ayat 3/.test(pv.textContent), pv.textContent);
  click($("#mlPlayerCloseBtn"));

  // SoundCloud link pendek (on.soundcloud.com) -> diselesaikan lewat oEmbed sebelum widget dibuka
  const mz = $$("#allMediaPanel details").find((d) => /Mazmur/.test(d.querySelector("summary").textContent));
  mz.open = true; mz.dispatchEvent(new w.Event("toggle")); await sleep(150);
  click(mz.querySelector(".ml-card-playable")); await sleep(250);
  const ifr = doc.querySelector("#mlPlayerOverlay iframe");
  expect("SoundCloud link pendek: widget memakai link kanonik hasil oEmbed (bukan on.soundcloud.com)", !!ifr && /w\.soundcloud\.com\/player\/\?url=https%3A%2F%2Fapi\.soundcloud\.com%2Ftracks%2F123456/.test(ifr.getAttribute("src")) && !/on\.soundcloud/.test(ifr.getAttribute("src")), ifr && ifr.getAttribute("src"));
  click($("#mlPlayerCloseBtn"));

  // tombol Buka di Alkitab
  click(mk.querySelector(".ml-allmedia-open")); await sleep(50);
  click(kl.querySelector(".ml-allmedia-open")); await sleep(50);
  const op = w.eval("JSON.stringify(window.__opened)");
  expect("Buka di Alkitab: Markus 12 ayat 30; Keluaran 20 tanpa ayat (seluruh pasal)", op === JSON.stringify([[41, 12, 30], [2, 20, null]]) || op === '[[41,12,30],[2,20,null]]', op);

  // pencarian
  const q = $("#allMediaPanel .ml-allmedia-search");
  q.value = "menara"; q.dispatchEvent(new w.Event("input")); await sleep(400);
  const sums2 = $$("#allMediaPanel details > summary").map((s) => s.textContent.trim());
  expect("cari 'menara' -> hanya Kejadian, akordion terbuka & kartu langsung tampil", sums2.length === 1 && /Kejadian/.test(sums2[0]) && $$("#allMediaPanel details[open] .ml-card").length === 1, sums2);
  q.value = "zzzz"; q.dispatchEvent(new w.Event("input")); await sleep(400);
  expect("cari tanpa hasil -> pesan", /Tidak ada media yang cocok/.test(panel.textContent), panel.textContent.slice(0, 200));

  const bad = errors.filter((e) => !/Could not load|not implemented|Not implemented|navigation/i.test(e));
  expect("tidak ada error skrip", bad.length === 0, bad);
}
