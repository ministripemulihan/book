// Uji 28 Sep 2026: kode T/Y/A, tombol "📺 Teks" (teks kidung + video jadi audio
// latar), pencarian ketik kode kidung, dan daftar bertahap (60 per halaman).
// memuat index.html ASLI di jsdom.  Butuh: npm i jsdom@22 fake-indexeddb
// Jalankan: node tests/kidung-ref-show.jsdom.test.js
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
const need = (m) => { try { return require(m); } catch (e) { return require(require.resolve(m, { paths: [process.cwd(), "/tmp/jt2/node_modules", "/tmp/jt/node_modules"] })); } };
const { JSDOM, VirtualConsole, ResourceLoader } = need("jsdom");
const fi = need("fake-indexeddb");

let ok = true;
function expect(name, cond, extra) { console.log((cond ? "PASS" : "FAIL") + " - " + name + (cond ? "" : " :: " + JSON.stringify(extra))); if (!cond) ok = false; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Jalur PRODUKSI: Pustaka Media (apps-script/MediaLibraryCode.gs) -> media_list
const ITEMS = [
  { id: "1", jenis: "youtube", nama: "Lagu Tambahan", channel: "Ch1", kategori: "Bebas", link: "https://youtu.be/AAAAAAAAAAA", kidungRef: "T5" },
  { id: "2", jenis: "youtube", nama: "Lagu Muda", channel: "Ch1", kategori: "Bebas", link: "https://youtu.be/BBBBBBBBBBB", kidungRef: "Y7, A3" },
  { id: "3", jenis: "youtube", nama: "Lagu Suplemen", channel: "Ch2", kategori: "Bebas", link: "https://youtu.be/CCCCCCCCCCC", kidungRef: "S5, K13" },
  { id: "4", jenis: "youtube", nama: "Lagu Kidung 130", channel: "Ch2", kategori: "Bebas", link: "https://youtu.be/DDDDDDDDDDD", kidungRef: "K130", sumber: "Gereja", keterangan: "Paduan suara" },
];
for (let n = 0; n < 70; n++) ITEMS.push({ id: "f" + n, jenis: "youtube", nama: "Filler " + n, channel: "ChF", kategori: "Bebas", link: "https://youtu.be/F" + String(n).padStart(10, "0"), kidungRef: "" });

const root = process.cwd();
const mime = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css" };
const srv = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/$/, "/index.html"));
  fs.readFile(p, (e, d) => { if (e) { res.statusCode = 404; return res.end(); } res.setHeader("content-type", mime[path.extname(p)] || "application/octet-stream"); res.end(d); });
});

srv.listen(0, async () => {
  const port = srv.address().port;
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(((e.detail && e.detail.message) || e.message).split("\n")[0]));
  class L extends ResourceLoader { fetch(url, o) { return url.startsWith("http://localhost:" + port) ? super.fetch(url, o) : Promise.resolve(Buffer.from("")); } }
  const dom = await JSDOM.fromURL("http://localhost:" + port + "/index.html", {
    runScripts: "dangerously", resources: new L(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.indexedDB = fi.indexedDB; w.IDBKeyRange = fi.IDBKeyRange;
      w.fetch = (url) => /script\.google\.com/.test(String(url)) && /media_list/.test(String(url))
        ? Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, items: ITEMS }) })
        : Promise.reject(new Error("no network"));
      w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.HTMLMediaElement.prototype.pause = () => {}; w.HTMLMediaElement.prototype.load = () => {};
    },
  });
  await sleep(3000);
  try { await run(dom, errors); } catch (e) { console.log("FAIL - exception", e && e.stack); ok = false; }
  finally { srv.close(); console.log(ok ? "\nALL PASS" : "\nSOME FAIL"); process.exit(ok ? 0 : 1); }
});

async function run(dom, errors) {
  const w = dom.window, doc = w.document;
  const $ = (s) => doc.querySelector(s), $$ = (s) => Array.from(doc.querySelectorAll(s));
  const click = (n) => n.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  const rowsNow = () => $$("#psYtPlaylistList .ps-yt-playlist-row");
  const rowOf = (title) => rowsNow().find((r) => r.textContent.includes(title));
  const type = (q) => { const i = doc.getElementById("psYtPlaylistSearch"); i.value = q; i.dispatchEvent(new w.Event("input", { bubbles: true })); };

  click(doc.getElementById("psYtPlaylistReloadBtn"));
  await sleep(800);

  // ---- daftar bertahap ----
  expect("awal: hanya 60 baris dirender dari 74 video", rowsNow().length === 60, rowsNow().length);
  const moreBtn = () => $("#psYtPlaylistList .ps-yt-more-row button");
  expect("tombol 'Tampilkan ... lagi' ada & menyebut 60 dari 74", !!moreBtn() && /60 dari 74/.test(moreBtn().textContent), moreBtn() && moreBtn().textContent);
  const firstRow = rowsNow()[0];
  click(moreBtn());
  expect("klik 'lagi' -> semua 74 baris, baris lama TIDAK digambar ulang", rowsNow().length === 74 && rowsNow()[0] === firstRow && !moreBtn(), rowsNow().length);

  // ---- chip T / Y / A ----
  const chips = (r) => Array.from(r.querySelectorAll(".ps-yt-ref-chip")).map((c) => c.textContent.replace("🎵", "").trim());
  expect("Lagu Tambahan: chip T5", JSON.stringify(chips(rowOf("Lagu Tambahan"))) === '["T5"]', chips(rowOf("Lagu Tambahan")));
  expect("Lagu Muda: chip Y7 + A3", JSON.stringify(chips(rowOf("Lagu Muda"))) === '["Y7","A3"]', chips(rowOf("Lagu Muda")));
  expect("tiap kode punya tombol 📺 Teks (Lagu Muda = 2)", rowOf("Lagu Muda").querySelectorAll(".ps-yt-ref-show").length === 2, null);
  expect("video tanpa kode: tidak ada tombol 📺", rowOf("Filler 3").querySelectorAll(".ps-yt-ref-show").length === 0, null);

  // ---- pencarian ketik ----
  const titles = () => rowsNow().map((r) => r.querySelector(".ps-yt-playlist-title").textContent);
  type("t5");
  expect("ketik 't5' -> Lagu Tambahan saja", JSON.stringify(titles()) === '["Lagu Tambahan"]', titles());
  type("y 7");
  expect("ketik 'y 7' -> Lagu Muda", JSON.stringify(titles()) === '["Lagu Muda"]', titles());
  type("A3");
  expect("ketik 'A3' -> Lagu Muda (bukan Kidung Anak / K)", JSON.stringify(titles()) === '["Lagu Muda"]', titles());
  type("k13");
  expect("ketik 'k13' cocok PERSIS K13 (bukan K130)", JSON.stringify(titles()) === '["Lagu Suplemen"]', titles());
  type("kidung 130");
  expect("ketik 'kidung 130' -> Lagu Kidung 130", JSON.stringify(titles()) === '["Lagu Kidung 130"]', titles());
  type("paduan");
  expect("ketik kata di keterangan -> ketemu", JSON.stringify(titles()) === '["Lagu Kidung 130"]', titles());
  type("gereja");
  expect("ketik kata di sumber -> ketemu", JSON.stringify(titles()) === '["Lagu Kidung 130"]', titles());
  type("filler 6");
  expect("ketik judul biasa -> 'Filler 6' & 'Filler 60'..'Filler 69' (11 baris)", rowsNow().length === 11, rowsNow().length);
  type("");
  expect("kosongkan pencarian -> mulai dari 60 lagi", rowsNow().length === 60, rowsNow().length);

  // ---- 📺 Teks ----
  w.eval("window.__calls = []; window.__alerts = [];");
  w.alert = (m) => w.eval("window.__alerts.push(" + JSON.stringify(String(m)) + ")");
  w.eval(`getKidungBooksOrdered = async function () { return ["Kidung", "Supplemen", "Tambahan", "Young People", "Anak-anak"]; };
  openKidungByKeypad = async function (buku, no) {
    window.__calls.push(buku + "|" + no);
    return { meta: { buku: buku, noKidung: String(no), judul: "Judul Uji " + buku + " " + no, pengarang: "", birama: "", jumlahBait: 2 },
             baits: [{ noBait: "1", teks: "Bait satu", koorGroup: null, koorTeks: null }, { noBait: "2", teks: "Bait dua", koorGroup: null, koorTeks: null }] };
  };`);
  const calls = () => w.eval("window.__calls.slice()");
  const showBtn = (title, no) => Array.from(rowOf(title).querySelectorAll(".ps-yt-ref-show")).find((b) => b.dataset.no === no);
  type("");
  click(showBtn("Lagu Suplemen", "5")); await sleep(400);
  expect("📺 S5 -> buku dicocokkan ke nama di data: 'Supplemen' (bukan 'Suplemen')", calls().slice(-1)[0] === "Supplemen|5", calls());
  expect("pindah ke tab Kidung & judul memuat No. 5", !$('[data-ps-mid-panel="kidung"]').hidden && /Judul Uji Supplemen 5/.test(doc.getElementById("psKidungDetailTitle").textContent), doc.getElementById("psKidungDetailTitle").textContent);
  const st = doc.getElementById("psKidungBgStatus").textContent;
  expect("video YouTube dimuat sebagai Audio Latar (status 'Dimuat (YouTube)' + judul video)", /Dimuat \(YouTube\)/.test(st) && /Lagu Suplemen/.test(st), st);
  expect("daftar bait tampil (2 bait) untuk diatur operator", $$("#psKidungSlideList .ps-verse-row").length >= 1, $$("#psKidungSlideList .ps-verse-row").length);
  expect("kontrol atur bait per slide & koor tetap ada", !!doc.getElementById("psKidungModeSelect") && !!doc.getElementById("psKidungKoorMidToggle"), null);

  click(showBtn("Lagu Tambahan", "5")); await sleep(400);
  expect("📺 T5 -> openKidungByKeypad('Tambahan','5')", calls().slice(-1)[0] === "Tambahan|5", calls());
  click(showBtn("Lagu Muda", "7")); await sleep(400);
  expect("📺 Y7 -> 'Young People' 7", calls().slice(-1)[0] === "Young People|7", calls());
  click(showBtn("Lagu Muda", "3")); await sleep(400);
  expect("📺 A3 -> 'Anak-anak' 3", calls().slice(-1)[0] === "Anak-anak|3", calls());
  const st2 = doc.getElementById("psKidungBgStatus").textContent;
  expect("audio latar sekarang = video 'Lagu Muda'", /Lagu Muda/.test(st2), st2);

  // tombol 🎵 (tanpa audio) TIDAK memuat audio latar baru
  click(Array.from(rowOf("Lagu Kidung 130").querySelectorAll(".ps-yt-ref-chip"))[0]); await sleep(400);
  expect("🎵 K130 -> buka teks saja", calls().slice(-1)[0] === "Kidung|130", calls());
  expect("🎵 tidak memuat audio latar (status tidak menyebut 'Lagu Kidung 130')", !/Lagu Kidung 130/.test(doc.getElementById("psKidungBgStatus").textContent), doc.getElementById("psKidungBgStatus").textContent);

  // kidung tidak ada -> alert & audio TIDAK dimuat
  w.eval("openKidungByKeypad = async function () { return null; }; window.__alerts.length = 0;");
  click(showBtn("Lagu Suplemen", "5")); await sleep(300);
  expect("kidung tidak ditemukan -> alert", /tidak ditemukan/.test(w.eval("window.__alerts.join(' ')")), w.eval("window.__alerts"));
  expect("kidung tidak ditemukan -> audio latar TIDAK diganti", !/Lagu Suplemen/.test(doc.getElementById("psKidungBgStatus").textContent), doc.getElementById("psKidungBgStatus").textContent);

  const realErrors = [...new Set(errors)].filter((e) => !/canvas|getContext|Not implemented|navigation/i.test(e));
  expect("tidak ada error JS tak terduga", realErrors.length === 0, realErrors);
}
