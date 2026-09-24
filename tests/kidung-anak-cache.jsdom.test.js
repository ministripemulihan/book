// Uji cache offline (IndexedDB) untuk Kidung Anak (js/kidung-anak.js +
// js/db.js store baru "kidungAnak") dan tombol menu ⋮ "👶 Sinkronkan ulang
// Kidung Anak" (index.html). Memuat index.html ASLI di jsdom dengan
// fake-indexeddb (bukan potongan kode) + fetch tiruan untuk Sheet Kidung Anak.
// Butuh jsdom + fake-indexeddb:  npm i jsdom fake-indexeddb
// Jalankan:  node tests/kidung-anak-cache.jsdom.test.js
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
const need = (m) => { try { return require(m); } catch (e) { return require(require.resolve(m, { paths: [process.cwd(), "/tmp/jt2/node_modules", "/tmp/jt/node_modules", "/tmp/lint/node_modules"] })); } };
const { JSDOM, VirtualConsole, ResourceLoader } = need("jsdom");
const fi = need("fake-indexeddb");

let ok = true;
function expect(name, cond, extra) { console.log((cond ? "PASS" : "FAIL") + " - " + name + (cond ? "" : " :: " + JSON.stringify(extra))); if (!cond) ok = false; }

const root = process.cwd();
const mime = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css" };
const srv = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/$/, "/index.html"));
  fs.readFile(p, (e, d) => {
    if (e) { res.statusCode = 404; return res.end(); }
    res.setHeader("content-type", mime[path.extname(p)] || "application/octet-stream");
    res.end(d);
  });
});

const SHEET_V1 = "No,Judul\n1,Lagu Satu\n2,Lagu Dua\n3,Lagu Tiga\n";
const SHEET_V2 = "No,Judul\n1,Lagu Satu (revisi)\n2,Lagu Dua\n3,Lagu Tiga\n4,Lagu Empat Baru\n";

srv.listen(0, async () => {
  const port = srv.address().port;
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(((e.detail && e.detail.message) || e.message).split("\n")[0]));
  class L extends ResourceLoader {
    fetch(url, o) { return url.startsWith("http://localhost:" + port) ? super.fetch(url, o) : Promise.resolve(Buffer.from("")); }
  }
  let sheetText = SHEET_V1;
  let fetchShouldFail = false;
  const dom = await JSDOM.fromURL("http://localhost:" + port + "/index.html", {
    runScripts: "dangerously", resources: new L(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.indexedDB = fi.indexedDB; w.IDBKeyRange = fi.IDBKeyRange;
      w.fetch = (url) => {
        if (String(url).includes("gviz/tq")) {
          if (fetchShouldFail) return Promise.reject(new Error("network down"));
          return Promise.resolve({ ok: true, text: () => Promise.resolve(sheetText) });
        }
        return Promise.reject(new Error("no network"));
      };
      w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.HTMLMediaElement.prototype.pause = () => {};
      w.HTMLMediaElement.prototype.load = () => {};
    },
  });

  setTimeout(async () => {
    try { await run(dom, errors, { setSheet: (t) => (sheetText = t), setFail: (b) => (fetchShouldFail = b) }); }
    finally { srv.close(); process.exit(ok ? 0 : 1); }
  }, 3000);
});

async function run(dom, errors, ctrl) {
  const w = dom.window, doc = w.document;

  expect("DB_VERSION dinaikkan ke 9 (store 'kidungAnak' baru)", w.eval("CONFIG.DB_VERSION") === 9);
  expect("LocalDB punya method Kidung Anak baru, TANPA mengubah method Kidung Umum yang sudah ada",
    w.eval("typeof LocalDB.bulkPutKidungAnak") === "function" && w.eval("typeof LocalDB.getAllKidungAnakRows") === "function" &&
    w.eval("typeof LocalDB.clearKidungAnak") === "function" && w.eval("typeof LocalDB.countKidungAnakRows") === "function" &&
    w.eval("typeof LocalDB.bulkPutKidung") === "function" && w.eval("typeof LocalDB.getAllKidungRows") === "function");

  // ---------- 1) Pemuatan pertama: belum ada cache -> ambil dari "Sheet", lalu tersimpan ----------
  const r1 = await w.eval("KidungAnak._test.loadData(null, {})");
  expect("pemuatan pertama (tanpa cache) berhasil dari Sheet, 3 lagu", r1.ok === true && r1.count === 3, r1);
  await new Promise((res) => setTimeout(res, 30));
  const cnt1 = await w.eval("LocalDB.countKidungAnakRows()");
  expect("data tersimpan ke IndexedDB store 'kidungAnak' (bukan hanya di memori)", cnt1 === 3, cnt1);
  const kidungCntUnchanged = await w.eval("LocalDB.countKidungRows()");
  expect("store 'kidung' (Kidung Umum) TIDAK ikut tersentuh", kidungCntUnchanged === 0, kidungCntUnchanged);

  // ---------- 2) Sheet berubah + offline -> cache-first tetap tampil, background gagal senyap ----------
  w.eval("KidungAnak._test.reset();"); // simulasikan sesi baru / IIFE dimuat ulang
  ctrl.setSheet(SHEET_V2);
  ctrl.setFail(true);
  const r2 = await w.eval("KidungAnak._test.loadData(null, {})");
  expect("offline: pemuatan gagal TAPI cache lama tetap terpakai (bukan kosong)", r2.ok === false && w.eval("KidungAnak._test.getSongs().length") === 3, { r2, songs: w.eval("KidungAnak._test.getSongs()") });

  // ---------- 3) Online lagi -> cache-first tampil dulu, lalu tersegarkan jadi 4 lagu ----------
  w.eval("KidungAnak._test.reset();");
  ctrl.setFail(false);
  const r3 = await w.eval("KidungAnak._test.loadData(null, {})");
  expect("online lagi: berhasil menyegarkan ke versi Sheet terbaru (4 lagu)", r3.ok === true && r3.count === 4, r3);
  const cnt3 = await w.eval("LocalDB.countKidungAnakRows()");
  expect("cache IndexedDB ikut diperbarui (4 baris, bukan 3+4 menumpuk)", cnt3 === 4, cnt3);
  const judul1 = await w.eval('LocalDB.getAllKidungAnakRows().then(rows => rows.find(r => r.No === "1").Judul)');
  expect("isi cache mencerminkan revisi terbaru (bukan data lama sisa)", judul1 === "Lagu Satu (revisi)", judul1);

  // ---------- 4) Tombol menu ⋮ "Sinkronkan ulang Kidung Anak" ----------
  const btn = doc.getElementById("kidungAnakResyncBtn");
  expect("tombol menu ada di markup index.html", !!btn);
  w.eval('window.__alerts = []; window.alert = (m) => window.__alerts.push(m);');
  ctrl.setSheet(SHEET_V2 + "5,Lagu Lima\n");
  btn.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  await new Promise((res) => setTimeout(res, 60));
  expect("klik tombol menu: tombol kembali aktif (tidak macet 'disabled')", !btn.disabled);
  const alerts = w.eval("window.__alerts");
  expect("klik tombol menu: pesan berhasil ditampilkan menyebut jumlah lagu terbaru (5)", alerts.length === 1 && /berhasil/i.test(alerts[0]) && /5 lagu/.test(alerts[0]), alerts);
  const cnt4 = await w.eval("LocalDB.countKidungAnakRows()");
  expect("klik tombol menu ikut memperbarui cache IndexedDB", cnt4 === 5, cnt4);
  const menu = doc.getElementById("moreMenu");
  expect("menu ⋮ ditutup setelah tombol resync selesai (pola sama seperti tombol resync lain)", menu.hidden === true);

  // ---------- 5) Duplikat/baris kosong pada kolom "No" tidak saling menimpa di cache ----------
  ctrl.setSheet("No,Judul\n,Lagu Tanpa Nomor A\n,Lagu Tanpa Nomor B\n7,Lagu Tujuh\n7,Lagu Tujuh Duplikat\n");
  w.eval("KidungAnak._test.reset();");
  await w.eval("KidungAnak._test.loadData(null, {})");
  await new Promise((res) => setTimeout(res, 30));
  const cnt5 = await w.eval("LocalDB.countKidungAnakRows()");
  expect("baris dengan No kosong/duplikat tetap tersimpan semua (tidak saling menimpa di IndexedDB)", cnt5 === 4, cnt5);

  const realErrors = [...new Set(errors)].filter((e) => !/canvas|getContext/i.test(e));
  expect("tidak ada galat skrip lain saat index.html asli dimuat & dipakai", realErrors.length === 0, realErrors);

  console.log(ok ? "\nSEMUA LULUS" : "\nADA YANG GAGAL");
}
