// Uji Pen di present.html (Layar 2): (1) protokol goresan dari Studio yang
// dikendalikan lewat js/ink-engine.js (draw/erase/undo/redo/clear), dan
// (2) 🖊️ Coret-coret LANGSUNG di layar ini, sepenuhnya independen dari (1)
// -- "2 macam" sesuai permintaan operator. Memuat present.html ASLI di
// jsdom (bukan potongan kode).
// Catatan: window.postMessage lintas-jendela tidak stabil di jsdom, jadi
// bagian (1) memanggil render(payload) langsung -- fungsi yang SAMA yang
// dipakai listener "message" asli setelah membuka bungkusnya
// (lihat window.addEventListener("message", ...) -> render(data.payload)).
// Butuh jsdom:  npm i jsdom
// Jalankan:  node tests/pen-present.jsdom.test.js
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
const need = (m) => { try { return require(m); } catch (e) { return require(require.resolve(m, { paths: [process.cwd(), "/tmp/jt2/node_modules", "/tmp/jt/node_modules", "/tmp/lint/node_modules"] })); } };
const { JSDOM, VirtualConsole, ResourceLoader } = need("jsdom");

let ok = true;
function expect(name, cond, extra) { console.log((cond ? "PASS" : "FAIL") + " - " + name + (cond ? "" : " :: " + JSON.stringify(extra))); if (!cond) ok = false; }

const root = process.cwd();
const mime = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css" };
const srv = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
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
  const dom = await JSDOM.fromURL("http://localhost:" + port + "/present.html", {
    runScripts: "dangerously", resources: new L(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.fetch = () => Promise.reject(new Error("no network"));
      w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.HTMLMediaElement.prototype.pause = () => {};
      w.HTMLMediaElement.prototype.load = () => {};
    },
  });

  setTimeout(async () => {
    try { await run(dom, errors); } finally { srv.close(); process.exit(ok ? 0 : 1); }
  }, 3000);
});

async function run(dom, errors) {
  const w = dom.window, doc = w.document;
  const r = (o) => w.eval("render(" + JSON.stringify(o) + ")");
  const penCanvas = doc.getElementById("penCanvas");

  expect("present.html memuat js/ink-engine.js", typeof w.InkEngine === "object");
  expect("#penCanvas (Studio) & #localPenCanvas (langsung) ada, TERPISAH", !!penCanvas && !!doc.getElementById("localPenCanvas") && penCanvas !== doc.getElementById("localPenCanvas"));

  // ---------- (1) Pen dikendalikan dari Studio ----------
  r({ type: "pen", action: "begin", id: "1", mode: "draw", color: "#ff0000", size: 20 });
  r({ type: "pen", action: "append", pts: [{ x: 0.1, y: 0.1 }] });
  r({ type: "pen", action: "append", pts: [{ x: 0.5, y: 0.5 }] });
  r({ type: "pen", action: "end" });
  expect("goresan draw dari Studio: kanvas tampil, 1 aksi tercatat", penCanvas.style.display === "block" && w.eval("remoteInk.getActiveActions().length") === 1);

  r({ type: "pen", action: "begin", id: "2", mode: "erase", color: "#000", size: 30 });
  r({ type: "pen", action: "append", pts: [{ x: 0.2, y: 0.2 }] });
  r({ type: "pen", action: "append", pts: [{ x: 0.3, y: 0.3 }] });
  r({ type: "pen", action: "end" });
  expect("🧹 Penghapus dari Studio: 2 aksi tercatat, aksi ke-2 bermode erase", w.eval("remoteInk.getActiveActions().length") === 2 && w.eval("remoteInk.getActiveActions()[1].mode") === "erase");

  r({ type: "pen", action: "undo" });
  expect("Undo dari Studio: kembali ke 1 aksi aktif", w.eval("remoteInk.getActiveActions().length") === 1);
  r({ type: "pen", action: "redo" });
  expect("Redo dari Studio: kembali ke 2 aksi aktif", w.eval("remoteInk.getActiveActions().length") === 2);

  r({ type: "pen", clear: true });
  expect("🗑️ Hapus Semua dari Studio: kanvas disembunyikan & riwayat kosong", penCanvas.style.display === "none" && w.eval("remoteInk.getActiveActions().length") === 0);

  // ---------- (2) Coret-coret LANGSUNG di present.html (independen) ----------
  const toggle = doc.getElementById("localInkToggle");
  const bar = doc.getElementById("localInkBar");
  const localCanvas = doc.getElementById("localPenCanvas");
  expect("kanvas lokal TIDAK menangkap klik sebelum toolbar dibuka", localCanvas.style.pointerEvents !== "auto");

  toggle.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  expect("ketuk tombol 🖊️ membuka toolbar coret lokal & kanvas mulai menangkap klik", bar.hidden === false && localCanvas.style.pointerEvents === "auto");

  localCanvas.dispatchEvent(new w.MouseEvent("mousedown", { bubbles: true, clientX: 10, clientY: 10 }));
  localCanvas.dispatchEvent(new w.MouseEvent("mousemove", { bubbles: true, clientX: 100, clientY: 100 }));
  w.dispatchEvent(new w.MouseEvent("mouseup", { bubbles: true, clientX: 100, clientY: 100 }));
  await new Promise((res) => setTimeout(res, 20));
  const undoBtn = doc.getElementById("localInkUndo"), redoBtn = doc.getElementById("localInkRedo");
  expect("menggambar lokal (mousedown+mousemove+mouseup) mengaktifkan tombol Undo lokal", !undoBtn.disabled);

  undoBtn.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  expect("Undo lokal menonaktifkan dirinya sendiri lagi (riwayat lokal kosong)", undoBtn.disabled);
  redoBtn.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  expect("Redo lokal mengembalikan goresan (Undo aktif lagi)", !undoBtn.disabled);

  const eraseBtn = Array.from(bar.querySelectorAll("[data-local-ink-mode]")).find((b) => b.dataset.localInkMode === "erase");
  eraseBtn.click();
  expect("mode 🧹 Penghapus lokal bisa dipilih terpisah dari Pen", eraseBtn.classList.contains("active"));
  const superTebalBtn = Array.from(bar.querySelectorAll("[data-local-ink-size]")).find((b) => b.dataset.localInkSize === "40");
  superTebalBtn.click();
  expect("preset Super Tebal lokal (40px) bisa dipilih", superTebalBtn.classList.contains("active"));
  const tipisBtn = Array.from(bar.querySelectorAll("[data-local-ink-size]")).find((b) => b.dataset.localInkSize === "4");
  expect("preset Super Tebal & Tipis lokal saling eksklusif", superTebalBtn.classList.contains("active") && !tipisBtn.classList.contains("active"));

  doc.getElementById("localInkClearAll").click();
  expect("🗑️ lokal mengosongkan riwayat lokal (Undo nonaktif lagi)", undoBtn.disabled);

  expect("goresan Studio (remoteInk) TIDAK terpengaruh sama sekali oleh aksi lokal barusan", w.eval("remoteInk.getActiveActions().length") === 0);

  doc.getElementById("localInkClose").click();
  expect("✕ menutup toolbar lokal & kanvas lokal berhenti menangkap klik", bar.hidden === true && localCanvas.style.pointerEvents !== "auto");

  const realErrors = [...new Set(errors)].filter((e) => !/canvas|getContext/i.test(e));
  expect("tidak ada galat skrip lain saat present.html asli dimuat & dipakai", realErrors.length === 0, realErrors);

  console.log(ok ? "\nSEMUA LULUS" : "\nADA YANG GAGAL");
}
