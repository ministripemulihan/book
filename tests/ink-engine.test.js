// Uji mesin riwayat coretan (js/ink-engine.js) -- Node murni, tanpa DOM/jsdom.
"use strict";
const InkEngine = require("../js/ink-engine.js");
let ok = true;
function expect(name, cond, extra) { console.log((cond ? "PASS" : "FAIL") + " - " + name + (cond ? "" : " :: " + JSON.stringify(extra))); if (!cond) ok = false; }

function fakeCtx() {
  const calls = [];
  return {
    calls,
    save() { calls.push(["save"]); },
    restore() { calls.push(["restore"]); },
    beginPath() { calls.push(["beginPath"]); },
    moveTo(x, y) { calls.push(["moveTo", x, y]); },
    lineTo(x, y) { calls.push(["lineTo", x, y]); },
    stroke() { calls.push(["stroke"]); },
    clearRect(x, y, w, h) { calls.push(["clearRect", x, y, w, h]); },
    set strokeStyle(v) { calls.push(["strokeStyle", v]); },
    set lineWidth(v) { calls.push(["lineWidth", v]); },
    set lineCap(v) { calls.push(["lineCap", v]); },
    set lineJoin(v) { calls.push(["lineJoin", v]); },
    set globalCompositeOperation(v) { calls.push(["gco", v]); },
  };
}
const canvas100 = { width: 100, height: 200 };

// ---------- 1) begin/append/end ----------
{
  const e = InkEngine.create();
  expect("belum begin() -> end() aman, tidak error", e.end() === null);
  expect("belum ada aksi -> canUndo/canRedo false", !e.canUndo() && !e.canRedo());
  e.begin("s1", "draw", "#ff0000", 10);
  expect("begin() menghasilkan current dengan pts kosong", e.getCurrent().mode === "draw" && e.getCurrent().pts.length === 0);
  e.append([{ x: 0, y: 0 }]);
  expect("append() 1 titik -> end() diabaikan (klik tanpa gerak)", e.end() === null && e.historyLength() === 0);
  e.begin("s2", "draw", "#00ff00", 5);
  e.append([{ x: 0, y: 0 }, { x: 0.5, y: 0.5 }]);
  const done = e.end();
  expect("goresan >=2 titik -> tercatat sebagai aksi", done && done.mode === "draw" && e.historyLength() === 1 && e.canUndo());
  expect("mode tak dikenal default ke 'draw'", InkEngine.create().begin("x", "apa saja", "#000", 3).mode === "draw");
  expect("ukuran negatif dijepit minimal 1", InkEngine.create().begin("x", "draw", "#000", -5).size === 1);
  expect("ukuran 0/kosong -> bawaan 4", InkEngine.create().begin("x", "draw", "#000", 0).size === 4);
}

// ---------- 2) undo/redo seperti Ctrl+Z Word ----------
{
  const e = InkEngine.create();
  const stroke = (id, mode) => { e.begin(id, mode, "#000", 4); e.append([{ x: 0, y: 0 }, { x: 1, y: 1 }]); return e.end(); };
  stroke("a", "draw"); stroke("b", "draw"); stroke("c", "erase");
  expect("3 goresan tercatat, semuanya aktif", e.getActiveActions().length === 3 && e.getActiveActions().map((x) => x.id).join() === "a,b,c");
  expect("undo mengurangi 1 aksi aktif (bukan menghapus riwayat)", e.undo() && e.getActiveActions().length === 2 && e.historyLength() === 3);
  expect("undo lagi -> 1 aksi aktif", e.undo() && e.getActiveActions().length === 1);
  expect("redo mengembalikan aksi yang di-undo", e.redo() && e.getActiveActions().map((x) => x.id).join() === "a,b");
  expect("redo lagi -> kembali ke 3 aksi", e.redo() && e.getActiveActions().length === 3);
  expect("redo saat sudah paling depan -> gagal, tidak berubah", !e.redo() && e.getActiveActions().length === 3);
  e.undo(); e.undo();
  expect("aksi BARU setelah undo membuang riwayat redo (seperti Word)", (() => { stroke("d", "draw"); return e.getActiveActions().map((x) => x.id).join() === "a,d" && e.historyLength() === 2 && !e.canRedo(); })());
  const e2 = InkEngine.create();
  expect("undo tanpa riwayat -> gagal, tidak error", !e2.undo());
  expect("clear() mengosongkan semuanya termasuk redo", (() => { const e3 = InkEngine.create(); stroke; e3.begin("z", "draw", "#000", 4); e3.append([{ x: 0, y: 0 }, { x: 1, y: 1 }]); e3.end(); e3.undo(); e3.clear(); return e3.historyLength() === 0 && !e3.canUndo() && !e3.canRedo(); })());
}

// ---------- 3) draw vs erase: komposit kanvas ----------
{
  const e = InkEngine.create();
  const ctx = fakeCtx();
  e.drawAction(canvas100, ctx, { mode: "draw", color: "#123456", size: 9, pts: [{ x: 0, y: 0 }, { x: 1, y: 1 }] });
  expect("draw: globalCompositeOperation = source-over", ctx.calls.some((c) => c[0] === "gco" && c[1] === "source-over"));
  expect("draw: warna & ketebalan diteruskan", ctx.calls.some((c) => c[0] === "strokeStyle" && c[1] === "#123456") && ctx.calls.some((c) => c[0] === "lineWidth" && c[1] === 9));
  expect("koordinat pecahan dikalikan ukuran kanvas (100x200)", ctx.calls.some((c) => c[0] === "moveTo" && c[1] === 0 && c[2] === 0) && ctx.calls.some((c) => c[0] === "lineTo" && c[1] === 100 && c[2] === 200));
  const ctx2 = fakeCtx();
  e.drawAction(canvas100, ctx2, { mode: "erase", color: "#ffffff", size: 30, pts: [{ x: 0, y: 0 }, { x: 0.5, y: 0.5 }] });
  expect("erase (Penghapus): globalCompositeOperation = destination-out (mencoret utk menghapus)", ctx2.calls.some((c) => c[0] === "gco" && c[1] === "destination-out"));
  expect("<2 titik atau tanpa canvas -> tidak digambar (tidak error)", (() => { const c3 = fakeCtx(); e.drawAction(canvas100, c3, { mode: "draw", pts: [{ x: 0, y: 0 }] }); e.drawAction(null, null, { mode: "draw", pts: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }); return c3.calls.length === 0; })());
}

// ---------- 4) render(): urutan draw/erase & Undo/Redo tergambar benar ----------
{
  const e = InkEngine.create();
  const stroke = (id, mode, pts) => { e.begin(id, mode, "#111", 8); e.append(pts); e.end(); };
  stroke("a", "draw", [{ x: 0, y: 0 }, { x: 1, y: 1 }]);
  stroke("b", "erase", [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.8 }]);
  let ctx = fakeCtx();
  e.render(canvas100, ctx);
  expect("render(): clearRect dulu, lalu gambar draw & erase SESUAI URUTAN dibuat", ctx.calls[0][0] === "clearRect" && ctx.calls.filter((c) => c[0] === "gco").map((c) => c[1]).join() === "source-over,destination-out");
  e.undo();
  ctx = fakeCtx();
  e.render(canvas100, ctx);
  expect("render() setelah Undo: sapuan erase tidak lagi digambar (hanya draw)", ctx.calls.filter((c) => c[0] === "gco").length === 1 && ctx.calls.some((c) => c[0] === "gco" && c[1] === "source-over"));
  e.redo();
  ctx = fakeCtx();
  e.render(canvas100, ctx);
  expect("render() setelah Redo: sapuan erase kembali digambar dalam urutan yang sama", ctx.calls.filter((c) => c[0] === "gco").map((c) => c[1]).join() === "source-over,destination-out");
}

// ---------- 5) menggambar segmen langsung (live) selama goresan berjalan ----------
{
  const e = InkEngine.create();
  const ctx = fakeCtx();
  expect("drawSegmentLive tanpa goresan berjalan (current null) -> tidak digambar", (() => { e.drawSegmentLive(canvas100, ctx, [{ x: 0, y: 0 }, { x: 1, y: 1 }]); return ctx.calls.length === 0; })());
  e.begin("s", "erase", "#000", 20);
  e.append([{ x: 0, y: 0 }]);
  e.append([{ x: 0.5, y: 0 }]);
  e.drawSegmentLive(canvas100, ctx, e.getCurrent().pts.slice(-2));
  expect("drawSegmentLive menggambar HANYA segmen 2 titik terakhir (mode goresan berjalan)", ctx.calls.some((c) => c[0] === "gco" && c[1] === "destination-out") && ctx.calls.some((c) => c[0] === "moveTo" && c[1] === 0) && ctx.calls.some((c) => c[0] === "lineTo" && c[1] === 50));
}

// ---------- 6) modul bisa dimuat sebagai window.InkEngine (browser) juga ----------
{
  const src = require("fs").readFileSync(require("path").join(__dirname, "..", "js", "ink-engine.js"), "utf8");
  expect("berkas memasang window.InkEngine untuk browser", /window\.InkEngine\s*=\s*api/.test(src) && /module\.exports\s*=\s*api/.test(src));
}

console.log(ok ? "\nSEMUA LULUS" : "\nADA YANG GAGAL");
process.exit(ok ? 0 : 1);
