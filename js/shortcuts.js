// =====================================================================
// js/shortcuts.js  (BARU book194, permintaan operator)
// ★ CARI KATA "SHORTCUT" (Ctrl+F / Ctrl+Shift+F di editor) di seluruh proyek: setiap pintasan keyboard diberi komentar "// SHORTCUT: ..." + "// SHORTCUT-GANTI: ..." (cara mengganti manual).
//   SHORTCUT-DAFTAR = daftar bawaan di berkas ini; SHORTCUT-DAFTAR-EFEK = daftar efek di js/presentation-studio.js.
// SATU tempat untuk SEMUA pintasan keyboard Studio Presentasi + dialog pengaturannya (ikon ⚙️ di bar atas Studio).
//
//  * Daftar BAWAAN ada di bagian "DAFTAR PINTASAN BAWAAN" di bawah (cari tulisan itu) -- itu "tempat mengganti manual" kalau mau
//    mengubah default lewat kode. Tapi cara biasa: klik ⚙️ di Studio -> klik tombol pintasan -> tekan kombinasi baru -> 💾 Simpan.
//    Pilihan operator disimpan di localStorage ("ps_shortcuts_v1") dan berlaku langsung, tanpa refresh.
//  * Pintasan LAMA (yang masih "tertanam" di js/presentation-studio.js: panah, P, M, Alt+C, Alt+H, 1-9, Alt+1-9, Ctrl+Z/Y) TIDAK
//    ditulis ulang. Berkas ini menyadapnya di fase capture: kalau operator memindahkan pintasannya, kombinasi BARU diterjemahkan menjadi
//    kejadian tombol LAMA (dispatch sintetis) dan kombinasi LAMA diblokir -- jadi seluruh logika & penjagaan lama tetap dipakai.
//  * Pintasan BARU (efek Amin, Seru Nama Tuhan, Matahari, tulisan timbul, dst) didaftarkan dari js/presentation-studio.js lewat
//    PSShortcuts.registerAction({...}) dan dijalankan langsung.
//  * Semua pintasan hanya aktif saat jendela Studio (#presentStudio) terbuka. Tombol polos (tanpa Ctrl/Alt/F) diabaikan saat kursor
//    sedang di kolom ketik -- jadi tidak ada suara/aksi yang tiba-tiba muncul waktu mengetik.
// =====================================================================
(function () {
  "use strict";
  if (window.PSShortcuts) return;

  // SHORTCUT: pilihan operator dari dialog ⚙️ disimpan di localStorage "ps_shortcuts_v1" (hapus kunci ini = kembali ke semua bawaan).
  const LS_KEY = "ps_shortcuts_v1";
  const SYNTH = "__psSynth";
  const ACTIONS = [];

  // ---------- util kombinasi tombol ----------
  const KEYMAP = { arrowright: "ArrowRight", arrowleft: "ArrowLeft", arrowup: "ArrowUp", arrowdown: "ArrowDown", pagedown: "PageDown", pageup: "PageUp", space: " ", escape: "Escape", enter: "Enter", tab: "Tab", home: "Home", end: "End", delete: "Delete", backspace: "Backspace" };
  function keyToken(e) {
    const c = e.code || "";
    if (/^Key[A-Z]$/.test(c)) return c.slice(3).toLowerCase();
    if (/^Digit[0-9]$/.test(c)) return c.slice(5);
    if (/^Numpad[0-9]$/.test(c)) return c.slice(6);
    const k = String(e.key || "");
    if (k === " ") return "space";
    return k.toLowerCase();
  }
  function comboOf(e) {
    const k = keyToken(e);
    if (!k || k === "control" || k === "alt" || k === "shift" || k === "meta" || k === "altgraph") return "";
    return [e.ctrlKey ? "ctrl" : "", e.altKey ? "alt" : "", e.shiftKey ? "shift" : "", e.metaKey ? "meta" : "", k].filter(Boolean).join("+");
  }
  function pretty(c) {
    if (!c) return "(kosong)";
    const NAMES = { ctrl: "Ctrl", alt: "Alt", shift: "Shift", meta: "Win", arrowright: "→", arrowleft: "←", arrowup: "↑", arrowdown: "↓", pagedown: "PageDown", pageup: "PageUp", space: "Space", escape: "Esc" };
    return c.split("+").map((t) => NAMES[t] || (t.length === 1 ? t.toUpperCase() : /^f\d+$/.test(t) ? t.toUpperCase() : t.charAt(0).toUpperCase() + t.slice(1))).join("+");
  }
  function isSafeAnywhere(c) { return /(^|\+)(ctrl|alt|meta)(\+|$)/.test(c) || /(^|\+)f\d{1,2}$/.test(c); }
  function isTyping() {
    const a = document.activeElement, t = (a && a.tagName) || "";
    return t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || !!(a && a.isContentEditable);
  }
  // Kombinasi yang dipakai browser sendiri -- tidak boleh dipakai (F5 = refresh dll). Dipakai juga menolak Esc (penutup dialog).
  // SHORTCUT: daftar kombinasi yang DITOLAK karena dipakai browser (F5 = refresh dll). Tambah/kurangi di sini bila perlu.
  const RESERVED = new Set(["f5", "ctrl+f5", "ctrl+r", "ctrl+shift+r", "f11", "f12", "f1", "ctrl+w", "ctrl+t", "ctrl+n", "ctrl+shift+n", "ctrl+shift+t", "ctrl+shift+w", "ctrl+tab", "ctrl+l", "alt+f4", "alt+arrowleft", "alt+arrowright", "ctrl+p", "ctrl+s", "ctrl+f", "ctrl+h", "ctrl+j", "ctrl+u", "ctrl+d", "escape", "tab", "enter"]);

  // ---------- penyimpanan ----------
  function loadOverrides() { try { const o = JSON.parse(localStorage.getItem(LS_KEY) || "{}"); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; } }
  function saveOverrides(o) { try { localStorage.setItem(LS_KEY, JSON.stringify(o)); } catch (e) { /* abaikan */ } }
  let overrides = loadOverrides();
  const bindingOf = (a, src) => { const o = src || overrides; return Object.prototype.hasOwnProperty.call(o, a.id) ? o[a.id] : a.def; };

  // ---------- peta aktif ----------
  let map = Object.create(null);      // kombinasi -> aksi
  let blocked = Object.create(null);  // kombinasi LAMA yang sudah dipindahkan (diblokir supaya tidak memicu logika lama)
  function rebuild() {
    map = Object.create(null); blocked = Object.create(null);
    ACTIONS.forEach((a) => { const b = bindingOf(a); if (b) map[b] = a; });
    ACTIONS.forEach((a) => { if (a.legacy && bindingOf(a) !== a.legacy && !map[a.legacy]) blocked[a.legacy] = true; });
  }

  // ---------- jalankan pintasan LAMA lewat kejadian sintetis ----------
  function dispatchLegacy(combo) {
    const toks = combo.split("+"), k = toks[toks.length - 1];
    const key = KEYMAP[k] || (/^f\d+$/.test(k) ? k.toUpperCase() : k);
    const code = /^[a-z]$/.test(k) ? "Key" + k.toUpperCase() : /^[0-9]$/.test(k) ? "Digit" + k : key;
    const ev = new KeyboardEvent("keydown", { key, code, ctrlKey: toks.includes("ctrl"), altKey: toks.includes("alt"), shiftKey: toks.includes("shift"), metaKey: toks.includes("meta"), bubbles: true, cancelable: true });
    ev[SYNTH] = true;
    document.dispatchEvent(ev);
  }

  // ---------- dialog pengaturan ----------
  let overlay = null, draft = null, capturingId = null, filterText = "", noteEl = null;
  function studioOpen() { const st = document.getElementById("presentStudio"); return !!st && !st.hidden; }
  function labelOf(a) { try { return a.labelFn ? a.labelFn() : a.label; } catch (e) { return a.label; } }

  function ensureStyle() {
    if (document.getElementById("psShortcutStyle")) return;
    const st = document.createElement("style"); st.id = "psShortcutStyle";
    st.textContent = `
#psShortcutOverlay{position:fixed;inset:0;z-index:100000;background:#000a;display:flex;align-items:center;justify-content:center;padding:12px}
#psShortcutOverlay .pss-panel{width:min(780px,100%);max-height:90vh;display:flex;flex-direction:column;background:#fffaf0;color:#3b2a14;border-radius:14px;box-shadow:0 10px 40px #0008;font:14px/1.35 system-ui,sans-serif}
#psShortcutOverlay .pss-head{padding:12px 16px;border-bottom:1px solid #e6d6b0;display:flex;gap:10px;align-items:center}
#psShortcutOverlay .pss-head strong{font-size:17px;flex:1}
#psShortcutOverlay .pss-note{padding:8px 16px;font-size:12.5px;color:#6b5a3a;background:#fff3d6}
#psShortcutOverlay .pss-body{overflow:auto;padding:6px 16px 10px}
#psShortcutOverlay .pss-grp{margin:12px 0 4px;font-weight:800;color:#8a5a00;font-size:13px;text-transform:uppercase;letter-spacing:.04em}
#psShortcutOverlay .pss-row{display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px dashed #ead9b5}
#psShortcutOverlay .pss-lab{flex:1}
#psShortcutOverlay .pss-key{min-width:130px;padding:5px 10px;border-radius:8px;border:1px solid #c9a95a;background:#fff;font-weight:700;cursor:pointer;color:#3b2a14}
#psShortcutOverlay .pss-key.cap{background:#ffe9a8;border-color:#b8860b}
#psShortcutOverlay .pss-key.chg{border-color:#2a8f3a;color:#1b6b28}
#psShortcutOverlay .pss-mini{padding:4px 8px;border-radius:8px;border:1px solid #d9c590;background:#fff8e6;cursor:pointer}
#psShortcutOverlay .pss-foot{padding:10px 16px;border-top:1px solid #e6d6b0;display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
#psShortcutOverlay .pss-btn{padding:7px 14px;border-radius:9px;border:1px solid #b8860b;background:#fff3d6;cursor:pointer;font-weight:700}
#psShortcutOverlay .pss-btn.pri{background:#b8860b;color:#fff}
#psShortcutOverlay input.pss-search{padding:5px 10px;border:1px solid #c9a95a;border-radius:8px;min-width:150px}
#psShortcutOverlay .pss-def{font-size:11.5px;color:#8a7a5a;min-width:92px;text-align:right}
`;
    document.head.appendChild(st);
  }
  function setNote(t) { if (noteEl) noteEl.textContent = t; }
  function render() {
    if (!overlay) return;
    const body = overlay.querySelector(".pss-body"); body.innerHTML = "";
    const groups = [];
    ACTIONS.forEach((a) => { if (groups.indexOf(a.group) < 0) groups.push(a.group); });
    const q = filterText.trim().toLowerCase();
    groups.forEach((g) => {
      const rows = ACTIONS.filter((a) => a.group === g && (!q || (labelOf(a) + " " + pretty(bindingOf(a, draft))).toLowerCase().indexOf(q) >= 0));
      if (!rows.length) return;
      const h = document.createElement("div"); h.className = "pss-grp"; h.textContent = g; body.appendChild(h);
      rows.forEach((a) => {
        const row = document.createElement("div"); row.className = "pss-row";
        const lab = document.createElement("div"); lab.className = "pss-lab"; lab.textContent = labelOf(a) + (a.extra ? "  (" + a.extra + ")" : "");
        const def = document.createElement("div"); def.className = "pss-def"; def.textContent = "bawaan: " + pretty(a.def);
        const key = document.createElement("button"); key.type = "button"; key.className = "pss-key";
        const cur = bindingOf(a, draft);
        key.textContent = capturingId === a.id ? "Tekan tombol…" : pretty(cur);
        if (capturingId === a.id) key.classList.add("cap");
        if (cur !== a.def) key.classList.add("chg");
        key.addEventListener("click", () => { capturingId = capturingId === a.id ? null : a.id; setNote(capturingId ? "Tekan kombinasi tombol baru untuk \"" + labelOf(a) + "\"  (Esc = batal)." : ""); render(); });
        const rs = document.createElement("button"); rs.type = "button"; rs.className = "pss-mini"; rs.textContent = "↺"; rs.title = "Kembalikan ke bawaan";
        rs.addEventListener("click", () => { delete draft[a.id]; resolveDupes(a.id); render(); });
        const cl = document.createElement("button"); cl.type = "button"; cl.className = "pss-mini"; cl.textContent = "✖"; cl.title = "Kosongkan (tidak ada pintasan)";
        cl.addEventListener("click", () => { draft[a.id] = ""; render(); });
        row.appendChild(lab); row.appendChild(def); row.appendChild(key); row.appendChild(rs); row.appendChild(cl); body.appendChild(row);
      });
    });
  }
  // Setelah "kembalikan bawaan": kalau kombinasi bawaan itu kini dipakai aksi lain, aksi lain itu dikosongkan.
  function resolveDupes(id) {
    const me = ACTIONS.find((a) => a.id === id); if (!me) return;
    const c = bindingOf(me, draft); if (!c) return;
    ACTIONS.forEach((a) => { if (a.id !== id && bindingOf(a, draft) === c) draft[a.id] = ""; });
  }
  function handleCapture(e) {
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.key === "Escape") { capturingId = null; setNote(""); render(); return; }
    const c = comboOf(e); if (!c) return; // baru menekan Ctrl/Alt/Shift saja -- tunggu tombol utamanya
    if (RESERVED.has(c)) { setNote("\"" + pretty(c) + "\" dipakai browser (mis. F5 = refresh) -- pilih kombinasi lain, misalnya dengan Alt+Shift."); return; }
    const me = ACTIONS.find((a) => a.id === capturingId); if (!me) return;
    const other = ACTIONS.find((a) => a.id !== capturingId && bindingOf(a, draft) === c);
    if (other && !confirm("\"" + pretty(c) + "\" sudah dipakai untuk \"" + labelOf(other) + "\".\nPindahkan ke \"" + labelOf(me) + "\"? (yang lama dikosongkan)")) return;
    if (other) draft[other.id] = "";
    draft[capturingId] = c;
    capturingId = null;
    setNote(!isSafeAnywhere(c) ? "Catatan: tombol polos (tanpa Ctrl/Alt/F) hanya aktif saat kursor TIDAK sedang di kolom ketik." : "");
    render();
  }
  function close() { if (overlay) { overlay.remove(); overlay = null; } capturingId = null; draft = null; }
  function commit() {
    const next = {};
    ACTIONS.forEach((a) => { const b = bindingOf(a, draft); if (b !== a.def) next[a.id] = b; });
    overrides = next; saveOverrides(next); rebuild();
    close();
    toast("Pintasan disimpan");
  }
  function toast(t) {
    const d = document.createElement("div"); d.textContent = "⌨️ " + t;
    d.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:100001;background:#2b2b2b;color:#fff;padding:8px 14px;border-radius:10px;font:600 14px system-ui,sans-serif;box-shadow:0 4px 16px #0006";
    document.body.appendChild(d); setTimeout(() => d.remove(), 1800);
  }
  function open() {
    if (overlay) return;
    ensureStyle();
    draft = Object.assign({}, overrides);
    filterText = ""; capturingId = null;
    overlay = document.createElement("div"); overlay.id = "psShortcutOverlay";
    overlay.innerHTML = `<div class="pss-panel" role="dialog" aria-label="Pintasan Keyboard">
      <div class="pss-head"><strong>⚙️ Pintasan Keyboard Studio</strong><input class="pss-search" type="search" placeholder="Cari aksi / tombol…" /><button type="button" class="pss-mini pss-x" aria-label="Tutup">✕</button></div>
      <div class="pss-note"></div>
      <div class="pss-body"></div>
      <div class="pss-foot"><button type="button" class="pss-btn pss-all">↺ Semua ke bawaan</button><button type="button" class="pss-btn pss-cancel">Batal</button><button type="button" class="pss-btn pri pss-save">💾 Simpan &amp; Tutup</button></div>
    </div>`;
    document.body.appendChild(overlay);
    noteEl = overlay.querySelector(".pss-note");
    setNote("Klik tombol pintasan, lalu tekan kombinasi baru. F5/Ctrl+R dipakai browser (refresh) sehingga ditolak. Disimpan di perangkat ini.");
    overlay.querySelector(".pss-search").addEventListener("input", (e) => { filterText = e.target.value; render(); });
    overlay.querySelector(".pss-x").addEventListener("click", close);
    overlay.querySelector(".pss-cancel").addEventListener("click", close);
    overlay.querySelector(".pss-save").addEventListener("click", commit);
    overlay.querySelector(".pss-all").addEventListener("click", () => { if (confirm("Kembalikan SEMUA pintasan ke bawaan?")) { draft = {}; render(); } });
    overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) close(); });
    render();
  }

  // ---------- penyadap tombol (fase capture) ----------
  function onKey(e) {
    if (e[SYNTH]) return;
    if (overlay) { // dialog terbuka: menangkap kombinasi baru / menutup; tombol lain tidak boleh memicu aksi Studio
      if (capturingId) { handleCapture(e); return; }
      if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); close(); return; }
      const t = (e.target && e.target.tagName) || "";
      if (t !== "INPUT") e.stopImmediatePropagation();
      return;
    }
    if (!studioOpen()) return;
    const c = comboOf(e); if (!c) return;
    const a = map[c];
    if (a) {
      if (a.legacy && c === a.legacy) return; // tidak dipindah: biarkan logika lama berjalan apa adanya
      if (isTyping() && !isSafeAnywhere(c)) return; // sedang mengetik -- abaikan tombol polos
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.repeat) return;
      if (a.legacy) dispatchLegacy(a.legacy);
      else { try { a.run(e); } catch (err) { console.error("PSShortcuts:", err); } }
      return;
    }
    if (blocked[c]) e.stopImmediatePropagation(); // kombinasi lama yang sudah dipindahkan
  }
  document.addEventListener("keydown", onKey, true);

  // ---------- API ----------
  function registerAction(a) {
    const i = ACTIONS.findIndex((x) => x.id === a.id);
    if (i >= 0) ACTIONS[i] = a; else ACTIONS.push(a);
    rebuild();
  }

  // =====================================================================
  //  DAFTAR PINTASAN BAWAAN  (pintasan LAMA yang logikanya masih di js/presentation-studio.js)
  //  def = kombinasi bawaan; legacy = kombinasi yang dikenali logika lama (sama dengan def).
  //  Formatnya: huruf kecil, digabung "+" dengan urutan ctrl, alt, shift, meta, tombol  (mis. "alt+shift+z", "ctrl+z", "p", "arrowright")
  // =====================================================================
  // SHORTCUT-DAFTAR: DAFTAR PINTASAN BAWAAN (lama). Tiap baris LEG(id, grup, nama di ⚙️, kombinasi bawaan, keterangan).
  // SHORTCUT-GANTI: kombinasi di baris ini = yang dikenali logika lama di js/presentation-studio.js (cari "SHORTCUT:" di sana). Kalau mengganti manual, ubah di KEDUA tempat. Cara mudah: ⚙️ di Studio.
  const LEG = (id, group, label, def, extra) => registerAction({ id, group, label, def, legacy: def, extra });
  // SHORTCUT: → = slide berikutnya (alias ↓ PageDown tetap).
  LEG("next", "Navigasi Slide", "Slide berikutnya (Kumpulan Ayat / playlist)", "arrowright", "↓ dan PageDown tetap ikut");
  // SHORTCUT: ← = slide sebelumnya (alias ↑ PageUp tetap).
  LEG("prev", "Navigasi Slide", "Slide sebelumnya", "arrowleft", "↑ dan PageUp tetap ikut");
  // SHORTCUT: P = Play/Pause YouTube.
  LEG("yt-playpause", "YouTube & Suara", "Play / Pause video YouTube", "p");
  // SHORTCUT: M = Mute YouTube + hentikan bel.
  LEG("yt-mute", "YouTube & Suara", "Mute / suarakan YouTube + hentikan bel", "m");
  // SHORTCUT: Alt+C = CC YouTube.
  LEG("yt-captions", "YouTube & Suara", "Tulisan (CC) YouTube nyala/mati", "alt+c");
  // SHORTCUT: Alt+H = scrollbar Studio.
  LEG("scrollbars", "Tampilan", "Sembunyikan / tampilkan scrollbar", "alt+h");
  for (let n = 1; n <= 9; n++) {
    // SHORTCUT: 1..9 = Mode Cepat ke-N.
    registerAction({ id: "mode-" + n, group: "Mode Cepat (tata letak)", label: "Mode Cepat ke-" + n, def: String(n), legacy: String(n),
      labelFn: () => { try { const f = window.__psModePresets; const p = f && f()[n - 1]; return "Mode Cepat ke-" + n + (p && p.label ? " — " + p.label : ""); } catch (e) { return "Mode Cepat ke-" + n; } } });
  }
  // SHORTCUT: Alt+1..9 = Bel Cepat ke-N.
  for (let n = 1; n <= 9; n++) registerAction({ id: "bell-" + n, group: "Bel Cepat", label: "Bel Cepat ke-" + n, def: "alt+" + n, legacy: "alt+" + n });
  // SHORTCUT: Ctrl+Z = Undo coretan.
  LEG("pen-undo", "Coretan (Pen)", "Urungkan coretan (Undo) -- saat Pen/Penghapus aktif", "ctrl+z");
  // SHORTCUT: Ctrl+Y = Redo coretan.
  LEG("pen-redo", "Coretan (Pen)", "Ulangi coretan (Redo)", "ctrl+y");

  window.PSShortcuts = { registerAction, open, close, comboOf, pretty, getCombo: (id) => { const a = ACTIONS.find((x) => x.id === id); return a ? bindingOf(a) : ""; }, actions: ACTIONS, rebuild };
  const gear = document.getElementById("psShortcutBtn");
  if (gear) gear.addEventListener("click", open);
  rebuild();
})();
