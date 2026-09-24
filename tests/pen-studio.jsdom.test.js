// Uji 🖊️ Pen/🧹 Penghapus/↩️ Undo/↪️ Redo/preset ketebalan di Studio
// (js/presentation-studio.js: wirePointerPen()), memuat index.html ASLI di
// jsdom (bukan potongan kode) supaya markup index.html & wiring JS diuji
// bersamaan, persis seperti yang dipakai operator.
// Butuh jsdom + fake-indexeddb:  npm i jsdom fake-indexeddb
// Jalankan:  node tests/pen-studio.jsdom.test.js
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

srv.listen(0, async () => {
  const port = srv.address().port;
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(((e.detail && e.detail.message) || e.message).split("\n")[0]));
  class L extends ResourceLoader {
    fetch(url, o) { return url.startsWith("http://localhost:" + port) ? super.fetch(url, o) : Promise.resolve(Buffer.from("")); }
  }
  const dom = await JSDOM.fromURL("http://localhost:" + port + "/index.html", {
    runScripts: "dangerously", resources: new L(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.indexedDB = fi.indexedDB; w.IDBKeyRange = fi.IDBKeyRange;
      w.fetch = () => Promise.reject(new Error("no network"));
      w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.HTMLMediaElement.prototype.pause = () => {};
      w.HTMLMediaElement.prototype.load = () => {};
    },
  });

  setTimeout(() => {
    try { run(dom, errors); } finally { srv.close(); process.exit(ok ? 0 : 1); }
  }, 3000);
});

function run(dom, errors) {
  const w = dom.window, doc = w.document;
  expect("index.html memuat js/ink-engine.js", typeof w.InkEngine === "object");

  w.eval("window.__posted = []; Presentation.postRaw = function (p) { window.__posted.push(p); };");
  const click = (id) => doc.getElementById(id).dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  const penBtn = doc.getElementById("psPenToggle"), eraserBtn = doc.getElementById("psEraserToggle"), pointerBtn = doc.getElementById("psPointerToggle");
  const undoBtn = doc.getElementById("psPenUndo"), redoBtn = doc.getElementById("psPenRedo"), clearBtn = doc.getElementById("psPenClear");
  expect("tombol Pen/Penghapus/Undo/Redo/preset ada di markup", !!penBtn && !!eraserBtn && !!undoBtn && !!redoBtn && !!doc.querySelector('[data-ps-pen-size-preset="40"]'));

  click("psPenToggle");
  expect("Pen menyala sendirian", penBtn.classList.contains("active") && !eraserBtn.classList.contains("active"));
  click("psEraserToggle");
  expect("🧹 Penghapus saling eksklusif dengan Pen (Pen mati begitu Penghapus dipilih)", eraserBtn.classList.contains("active") && !penBtn.classList.contains("active"));
  click("psPointerToggle");
  expect("🔴 Penunjuk saling eksklusif dengan Penghapus juga", pointerBtn.classList.contains("active") && !eraserBtn.classList.contains("active"));
  click("psPointerToggle");
  click("psPenToggle");

  doc.querySelector('[data-ps-pen-size-preset="40"]').dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  expect("preset Super Tebal mengisi slider ke 40px", doc.getElementById("psPenSizeSlider").value === "40");
  doc.querySelector('[data-ps-pen-size-preset="4"]').dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  expect("preset Tipis mengisi slider ke 4px", doc.getElementById("psPenSizeSlider").value === "4");

  const wrap = doc.getElementById("psPreviewBoxWrap");
  wrap.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 300 });
  wrap.dispatchEvent(new w.MouseEvent("mousedown", { bubbles: true }));
  wrap.dispatchEvent(new w.MouseEvent("mousemove", { bubbles: true, buttons: 1, clientX: 40, clientY: 30 }));
  wrap.dispatchEvent(new w.MouseEvent("mousemove", { bubbles: true, buttons: 1, clientX: 200, clientY: 150 }));
  w.dispatchEvent(new w.MouseEvent("mouseup", { bubbles: true }));
  let posted = w.eval("window.__posted");
  const penMsgs = posted.filter((p) => p.type === "pen");
  expect("satu goresan terkirim ke Layar 2 sebagai begin -> append -> append -> end (bukan segmen lepas seperti dulu)",
    penMsgs.map((p) => p.action).join(",") === "begin,append,append,end", penMsgs.map((p) => p.action));
  expect("ketebalan goresan yang terkirim = preset Tipis terakhir (4px)", penMsgs[0].size === 4);
  expect("Undo aktif & Redo TIDAK aktif setelah 1 goresan", !undoBtn.disabled && redoBtn.disabled);

  undoBtn.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  posted = w.eval("window.__posted");
  expect("klik Undo mengirim {type:'pen', action:'undo'} ke Layar 2", posted[posted.length - 1].type === "pen" && posted[posted.length - 1].action === "undo");
  expect("setelah Undo: Undo nonaktif, Redo aktif (seperti Word)", undoBtn.disabled && !redoBtn.disabled);

  redoBtn.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  expect("klik Redo mengirim {action:'redo'}", w.eval("window.__posted").slice(-1)[0].action === "redo");

  doc.dispatchEvent(new w.KeyboardEvent("keydown", { bubbles: true, key: "z", ctrlKey: true }));
  expect("Ctrl+Z (Pen sedang aktif) mengirim {action:'undo'}", w.eval("window.__posted").slice(-1)[0].action === "undo");

  click("psPenToggle"); // matikan Pen
  const beforeLen = w.eval("window.__posted.length");
  doc.dispatchEvent(new w.KeyboardEvent("keydown", { bubbles: true, key: "z", ctrlKey: true }));
  expect("Ctrl+Z TIDAK berlaku selagi Pen & Penghapus mati (tidak membajak Ctrl+Z global)", w.eval("window.__posted.length") === beforeLen);

  click("psPenToggle");
  clearBtn.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  posted = w.eval("window.__posted");
  expect("🗑️ Hapus Semua mengirim {clear:true} & menonaktifkan Undo/Redo (riwayat ikut kosong)",
    posted[posted.length - 1].type === "pen" && posted[posted.length - 1].clear === true && undoBtn.disabled && redoBtn.disabled);

  const realErrors = [...new Set(errors)].filter((e) => !/canvas|getContext/i.test(e));
  expect("tidak ada galat skrip lain saat index.html asli dimuat & dipakai", realErrors.length === 0, realErrors);

  console.log(ok ? "\nSEMUA LULUS" : "\nADA YANG GAGAL");
}
