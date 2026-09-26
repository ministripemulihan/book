// ============================================================
//  🖊️ MESIN RIWAYAT CORETAN (INK ENGINE)  (BARU 21 Sep 2026, permintaan operator)
//
//  Dipakai BERSAMA oleh js/presentation-studio.js (kanvas pratinjau kecil di
//  Studio + pengirim perintah) dan present.html (kanvas Layar 2 yang
//  dikendalikan dari Studio, DAN kanvas coret-coret LANGSUNG yang berdiri
//  sendiri di present.html -- 2 cara coret-coret sesuai permintaan operator).
//
//  Sebelumnya: setiap segmen coretan Pen langsung digambar permanen di
//  kanvas, tidak ada cara menghapus SEBAGIAN atau membatalkan (Undo). Mesin
//  ini menyimpan coretan sebagai daftar AKSI ({mode:"draw"|"erase", pts,
//  color, size}) dengan penunjuk "cursor" -- persis pola Undo/Redo yang
//  dipakai editor seperti Microsoft Word: Undo memundurkan cursor (aksi
//  tetap tersimpan, cuma tidak digambar), aksi BARU setelah Undo membuang
//  semua yang ada di depan cursor (riwayat Redo hilang, sama seperti Word).
//
//  "Menghapus seperti mencoret" (Penghapus) memakai komposit kanvas
//  `destination-out`: goresan Penghapus membuat bagian yang dilewatinya
//  transparan, apa pun warna coretan di bawahnya -- bukan menghapus 1 objek
//  coretan utuh, tapi benar-benar seperti mencoret dengan karet penghapus.
//  Supaya urutan tindih-menindih (coret lalu hapus lalu coret lagi) selalu
//  benar walau di-Undo/Redo bolak-balik, render() SELALU menggambar ULANG
//  dari kosong sesuai urutan aksi -- bukan mengurangi/menambah di atas
//  kanvas yang sudah ada.
//
//  API murni (tanpa DOM) sehingga mudah diuji: begin/append/end/undo/redo/
//  clear/canUndo/canRedo/getCurrent/getActiveActions. Bagian yang menyentuh
//  <canvas> (drawAction/render/drawSegmentLive) menerima canvas & ctx dari
//  luar, jadi satu berkas ini bekerja sama di Node (tanpa DOM, untuk
//  pengujian) maupun di browser.
// ============================================================
(function () {
  "use strict";

  function createInkEngine() {
    let actions = [];   // seluruh aksi yang PERNAH dibuat (termasuk yang di-Undo, sampai ditimpa aksi baru)
    let cursor = 0;      // actions.slice(0, cursor) = yang SEDANG terlihat/aktif
    let current = null;  // aksi yang sedang digambar (antara begin() dan end())

    function begin(id, mode, color, size, tip) {
      current = {
        id: id != null ? String(id) : "",
        mode: mode === "erase" ? "erase" : "draw",
        color: color || "#ff3b30",
        size: Math.max(1, Number(size) || 4),
        // BARU (26 Sep 2026, permintaan operator "ujungnya bulat, atau ujungnya
        // garis miring seperti kuas") -- bentuk ujung goresan: "round" (bulat,
        // BAWAAN, sama seperti sebelumnya -- lineCap bulat biasa) atau "chisel"
        // (miring ala kuas kaligrafi: nib DIAM di sudut tetap 45 derajat apa pun
        // arah goresan, jadi ketebalan tampak berubah sendiri tergantung arah
        // tarikan tangan, persis spidol/kuas pipih sungguhan -- lihat
        // drawChiselAction() di bawah). Parameter opsional -- kalau tidak
        // diisi, sama sekali tidak mengubah perilaku lama (tetap "round").
        tip: tip === "chisel" ? "chisel" : "round",
        pts: [],
      };
      return current;
    }
    function append(pts) {
      if (!current || !pts || !pts.length) return;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (p && typeof p.x === "number" && typeof p.y === "number") current.pts.push({ x: p.x, y: p.y });
      }
    }
    // Selesai satu goresan (mouseup/mouseleave/touchend). Coretan tanpa
    // gerakan (klik saja, <2 titik) DIABAIKAN -- bukan aksi yang berarti,
    // jadi tidak masuk riwayat Undo (klik "kosong" tidak seharusnya bisa
    // di-Undo, sama seperti Word tidak mencatat "Undo" untuk klik biasa).
    function end() {
      if (!current) return null;
      if (current.pts.length < 2) { current = null; return null; }
      actions = actions.slice(0, cursor);
      actions.push(current);
      cursor = actions.length;
      const done = current;
      current = null;
      return done;
    }
    // Batalkan goresan yang sedang berjalan TANPA mencatatnya (dipakai kalau
    // sambungan terputus di tengah menggambar, dsb) -- beda dari end(): sama
    // sekali tidak masuk riwayat, bukan sekadar diabaikan karena terlalu pendek.
    function cancelCurrent() { current = null; }

    function undo() {
      if (cursor <= 0) return false;
      cursor -= 1;
      current = null;
      return true;
    }
    function redo() {
      if (cursor >= actions.length) return false;
      cursor += 1;
      return true;
    }
    function clear() {
      actions = [];
      cursor = 0;
      current = null;
    }
    function canUndo() { return cursor > 0; }
    function canRedo() { return cursor < actions.length; }
    function getCurrent() { return current; }
    function getActiveActions() { return actions.slice(0, cursor); }
    function historyLength() { return actions.length; }

    // Menggambar SATU aksi (goresan draw ATAU sapuan erase) ke kanvas.
    // Koordinat titik disimpan sebagai PECAHAN 0..1 (bukan piksel) supaya
    // tetap akurat digambar ulang berapa pun kali kanvas berganti ukuran
    // (resize jendela, pindah 1 <-> 2 monitor, dst).
    function drawAction(canvas, ctx, a) {
      if (!canvas || !ctx || !a || !a.pts || a.pts.length < 2) return;
      // BARU (26 Sep 2026) -- ujung "chisel" (miring ala kuas) dirender lewat
      // jalur TERPISAH (drawChiselAction) supaya jalur "round" lama di bawah
      // ini SAMA SEKALI TIDAK BERUBAH (tetap lineCap/lineJoin bulat + stroke()
      // polos) -- goresan lama & pengujian yang sudah ada tidak terpengaruh.
      if (a.tip === "chisel") { drawChiselAction(canvas, ctx, a); return; }
      ctx.save();
      ctx.globalCompositeOperation = a.mode === "erase" ? "destination-out" : "source-over";
      ctx.strokeStyle = a.color || "#ff3b30";
      ctx.lineWidth = a.size || 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (let i = 0; i < a.pts.length; i++) {
        const pt = a.pts[i];
        const x = pt.x * canvas.width, y = pt.y * canvas.height;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // "Kuas kaligrafi" -- nib (mata pena) berbentuk PERSEGI PANJANG PIPIH yang
    // sudutnya TETAP (nibAngle, tidak ikut berputar mengikuti arah goresan,
    // persis kuas/spidol chisel-tip sungguhan) -- makanya tarikan SEARAH sudut
    // nib terlihat TIPIS, tarikan TEGAK LURUS sudut nib terlihat TEBAL PENUH.
    // Digambar sebagai rangkaian jajaran genjang (1 per segmen) + lingkaran
    // kecil di tiap sambungan titik supaya tidak ada celah -- diisi (fill),
    // bukan stroke(), karena lineWidth/lineCap bawaan canvas tidak bisa
    // membuat efek nib bersudut tetap seperti ini.
    function drawChiselAction(canvas, ctx, a) {
      const NIB_ANGLE = -45 * Math.PI / 180; // sudut nib TETAP (kaligrafi klasik)
      const halfW = Math.max(0.5, (a.size || 4) / 2);
      const dx = Math.cos(NIB_ANGLE) * halfW, dy = Math.sin(NIB_ANGLE) * halfW;
      ctx.save();
      ctx.globalCompositeOperation = a.mode === "erase" ? "destination-out" : "source-over";
      ctx.fillStyle = a.color || "#ff3b30";
      const stampAt = (x, y) => { ctx.beginPath(); ctx.arc(x, y, halfW * 0.92, 0, Math.PI * 2); ctx.fill(); };
      const p0 = a.pts[0];
      stampAt(p0.x * canvas.width, p0.y * canvas.height);
      for (let i = 1; i < a.pts.length; i++) {
        const pa = a.pts[i - 1], pb = a.pts[i];
        const x0 = pa.x * canvas.width, y0 = pa.y * canvas.height;
        const x1 = pb.x * canvas.width, y1 = pb.y * canvas.height;
        ctx.beginPath();
        ctx.moveTo(x0 - dx, y0 - dy);
        ctx.lineTo(x0 + dx, y0 + dy);
        ctx.lineTo(x1 + dx, y1 + dy);
        ctx.lineTo(x1 - dx, y1 - dy);
        ctx.closePath();
        ctx.fill();
        stampAt(x1, y1);
      }
      ctx.restore();
    }
    // Gambar ULANG semua aksi yang aktif (cursor) dari kanvas kosong --
    // dipakai setelah Undo/Redo/Clear atau kanvas berganti ukuran, karena
    // urutan tindih draw/erase harus benar (lihat catatan di atas berkas ini).
    function render(canvas, ctx) {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const list = getActiveActions();
      for (let i = 0; i < list.length; i++) drawAction(canvas, ctx, list[i]);
    }
    // Menggambar HANYA segmen terbaru (2 titik terakhir) SELAGI goresan
    // masih berjalan -- dipakai supaya menggambar tetap ringan/cepat saat
    // kursor/jari bergerak (tidak render() ulang semuanya tiap gerakan).
    function drawSegmentLive(canvas, ctx, pts) {
      if (!current || !pts || pts.length < 2) return;
      drawAction(canvas, ctx, { mode: current.mode, color: current.color, size: current.size, tip: current.tip, pts: pts });
    }

    return {
      begin, append, end, cancelCurrent, undo, redo, clear,
      canUndo, canRedo, getCurrent, getActiveActions, historyLength,
      drawAction, render, drawSegmentLive,
    };
  }

  const api = { create: createInkEngine };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.InkEngine = api;
  else if (typeof globalThis !== "undefined") globalThis.InkEngine = api;
})();
