// =====================================================================
// js/quickjump.js  (BARU book199, permintaan operator)
// 📖 PINDAH KITAB CEPAT di pembaca Alkitab (dan PINDAH KIDUNG CEPAT di pembaca Kidung: ketik nomor/judul, ◀ ▶, terakhir dibuka) -- terutama untuk MODE LAYAR PENUH (header tersembunyi): dulu harus ketuk bagian atas,
// gulir ke atas, baru pilih kitab. Sekarang tombol 📖 melayang selalu ada di pembaca; sekali ketuk -> kotak pilih:
//   * ketik sebagian nama kitab ("am", "1 kor", "wahyu") atau langsung "amsal 23" lalu Enter -> loncat;
//   * atau ketuk kitab di daftar -> ketuk nomor pasal;
//   * baris "Terakhir dibuka" untuk bolak-balik cepat.
// SEMUA memakai data yang SUDAH ada di perangkat (BOOKS, getChaptersForBook, renderChapter di js/app.js) -- tidak ada permintaan jaringan,
// jadi jalan juga saat OFFLINE (selama pasalnya memang sudah tersimpan offline; kitab yang belum tersedia di bahasa ini tampil redup).
// Juga memuat pilihan "Layar penuh: Sistem / Cepat" (lihat initFullscreenControl di js/app.js).
// =====================================================================
(function () {
  "use strict";
  if (window.QuickJump) return;
  const REC_KEY = "quickjump_recent_v1";
  const FS_KEY = "reader_fs_mode"; // "css" = mode baca penuh instan tanpa layar penuh sistem; selain itu = layar penuh sistem (bawaan)
  const $ = (id) => document.getElementById(id);
  let overlay = null, fab = null, view = "books", pickedBook = null, filterText = "";

  function readerOpen() { const r = $("reader"); return !!r && !r.hidden; }
  function kidungActive() { const p = $("kidungPanel"); return !!p && !p.hidden && document.body.classList.contains("kidung-active"); }
  const KREC_KEY = "quickjump_recent_kidung_v1";
  let kBuku = null, kBooks = null;
  const kListCache = {};
  function loadKRecent() { try { const a = JSON.parse(localStorage.getItem(KREC_KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function noteKidung(k) {
    if (!k || !k.buku || !k.no) return;
    const list = loadKRecent().filter((r) => !(r.buku === k.buku && String(r.no) === String(k.no)));
    list.unshift({ buku: k.buku, no: String(k.no), judul: k.judul || "" });
    try { localStorage.setItem(KREC_KEY, JSON.stringify(list.slice(0, 10))); } catch (e) { /* abaikan */ }
  }
  async function kidungListOf(buku) {
    if (kListCache[buku]) return kListCache[buku];
    let l = []; try { l = (typeof getKidungList === "function" ? await getKidungList(buku) : []) || []; } catch (e) { l = []; }
    l = l.slice().sort((a, b) => (parseInt(a.noKidung, 10) || 0) - (parseInt(b.noKidung, 10) || 0) || String(a.noKidung).localeCompare(String(b.noKidung)));
    kListCache[buku] = l; return l;
  }
  function openKidungNo(buku, no) {
    close();
    noteKidung({ buku, no, judul: "" });
    if (typeof openKidungReader === "function") openKidungReader(buku, String(no));
  }
  function norm(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
  function availableBook(b) {
    try { return typeof bookAvailableInLang === "function" ? !!bookAvailableInLang(currentLang, b.num) : true; } catch (e) { return true; }
  }
  function chaptersOf(num) {
    try { return typeof getChaptersForBook === "function" ? (getChaptersForBook(currentLang, num) || []) : []; } catch (e) { return []; }
  }
  function loadRecent() { try { const a = JSON.parse(localStorage.getItem(REC_KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function pushRecent(num, ch) {
    const list = loadRecent().filter((r) => !(r.b === num && r.c === ch));
    list.unshift({ b: num, c: ch });
    try { localStorage.setItem(REC_KEY, JSON.stringify(list.slice(0, 8))); } catch (e) { /* abaikan */ }
  }
  function bookName(num) { const b = (typeof BOOKS !== "undefined" ? BOOKS : []).find((x) => x.num === num); return b ? b.name : ("Kitab " + num); }

  function ensureStyle() {
    if ($("quickJumpStyle")) return;
    const st = document.createElement("style"); st.id = "quickJumpStyle";
    st.textContent = `
#quickJumpFab{position:fixed;right:14px;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:46;width:46px;height:46px;border-radius:50%;border:1.5px solid var(--rule,#cdbf9a);background:rgba(250,246,238,.82);color:var(--ink,#2b2418);font-size:22px;line-height:1;box-shadow:var(--shadow,0 2px 10px #0003);cursor:pointer;display:none;align-items:center;justify-content:center;padding:0;-webkit-tap-highlight-color:transparent}
#quickJumpFab.show{display:flex}
body.reader-clean #quickJumpFab{opacity:.62}
body.reader-clean #quickJumpFab:active,#quickJumpFab:active{opacity:1}
#quickJump{position:fixed;inset:0;z-index:100050;background:rgba(20,16,8,.55);display:flex;align-items:flex-end;justify-content:center}
#quickJump .qj-panel{width:min(640px,100%);max-height:92vh;max-height:92dvh;display:flex;flex-direction:column;background:var(--paper,#faf6ee);color:var(--ink,#2b2418);border-radius:18px 18px 0 0;box-shadow:0 -6px 30px #0006;font-family:var(--font-ui,system-ui,sans-serif)}
@media (min-width:700px){#quickJump{align-items:center}#quickJump .qj-panel{border-radius:18px}}
#quickJump .qj-head{display:flex;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--rule,#e3d8bb)}
#quickJump .qj-head input{flex:1;min-width:0;font-size:16px;padding:10px 12px;border:1.5px solid var(--rule,#cdbf9a);border-radius:12px;background:#fff;color:inherit}
#quickJump .qj-x{border:0;background:transparent;font-size:22px;padding:6px 10px;cursor:pointer;color:inherit}
#quickJump .qj-body{overflow:auto;padding:8px 12px 12px;-webkit-overflow-scrolling:touch}
#quickJump .qj-lab{margin:10px 0 6px;font-size:12px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#8a6a1a}
#quickJump .qj-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:6px}
#quickJump .qj-grid.ch{grid-template-columns:repeat(auto-fill,minmax(54px,1fr))}
#quickJump .qj-b{padding:10px 6px;border-radius:10px;border:1px solid var(--rule,#d8cba5);background:#fff;font-size:15px;color:inherit;cursor:pointer;text-align:center;-webkit-tap-highlight-color:transparent}
#quickJump .qj-b:active{background:#f2e6c4}
#quickJump .qj-b.cur{background:#b8860b;color:#fff;border-color:#8a640a;font-weight:800}
#quickJump .qj-b[disabled]{opacity:.35;cursor:default}
#quickJump .qj-go{width:100%;margin:6px 0;padding:12px;border-radius:12px;border:0;background:#b8860b;color:#fff;font-size:17px;font-weight:800;cursor:pointer}
#quickJump .qj-back{border:0;background:transparent;color:#8a6a1a;font-weight:800;font-size:15px;padding:6px 2px;cursor:pointer}
#quickJump .qj-foot{padding:8px 12px calc(8px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--rule,#e3d8bb);font-size:13px;display:flex;gap:6px;flex-wrap:wrap;align-items:center}
#quickJump .qj-chip{padding:6px 10px;border-radius:999px;border:1px solid var(--rule,#cdbf9a);background:#fff;cursor:pointer;font-size:13px;color:inherit}
#quickJump .qj-chip.on{background:#b8860b;color:#fff;border-color:#8a640a;font-weight:700}
#qjFsChip{position:fixed;left:12px;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:46;display:flex;gap:6px;align-items:center;max-width:calc(100vw - 84px);flex-wrap:wrap}
#qjFsChip button{border:1.5px solid #8a640a;background:rgba(255,248,226,.95);color:#2b2418;border-radius:999px;padding:7px 12px;font:700 13px system-ui,sans-serif;box-shadow:0 2px 10px #0004}
#qjToast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:100060;max-width:90vw;background:#2b2b2b;color:#fff;padding:10px 14px;border-radius:12px;font:600 14px/1.35 system-ui,sans-serif;box-shadow:0 4px 16px #0006;text-align:center}
`;
    document.head.appendChild(st);
  }

  function toast(t, ms) {
    let d = $("qjToast"); if (d) d.remove();
    d = document.createElement("div"); d.id = "qjToast"; d.textContent = t; document.body.appendChild(d);
    setTimeout(() => { if (d.parentNode) d.remove(); }, ms || 4500);
  }

  function openRef(num, ch) {
    close();
    pushRecent(num, ch);
    if (typeof renderChapter === "function") renderChapter(num, ch);
  }

  // "amsal 23" / "1 kor 13" / "mat 5:3" -> {book, chapter}
  function parseDirect(txt) {
    const m = /^(.*?[a-zA-Z].*?)\s*(\d+)(?:\s*[:.]\s*\d+)?\s*$/.exec(String(txt || "").trim());
    if (!m) return null;
    const q = norm(m[1]); if (!q) return null;
    const books = typeof BOOKS !== "undefined" ? BOOKS : [];
    const cands = books.filter((b) => availableBook(b));
    const hit = cands.find((b) => norm(b.name) === q) || cands.find((b) => norm(b.name).indexOf(q) === 0) || cands.find((b) => norm(b.name).indexOf(q) >= 0);
    if (!hit) return null;
    const ch = Number(m[2]);
    return chaptersOf(hit.num).map(Number).indexOf(ch) >= 0 ? { book: hit, chapter: ch } : null;
  }

  async function renderKidung() {
    if (!overlay) return;
    const body = overlay.querySelector(".qj-body"); body.innerHTML = "";
    const mk = (cls, text, fn) => { const b = document.createElement("button"); b.type = "button"; b.className = cls; b.textContent = text; if (fn) b.addEventListener("click", fn); return b; };
    const lab = (t) => { const d = document.createElement("div"); d.className = "qj-lab"; d.textContent = t; body.appendChild(d); };
    if (!kBooks) { try { kBooks = (typeof getKidungBooksOrdered === "function" ? await getKidungBooksOrdered() : null) || []; } catch (e) { kBooks = []; } if (!kBooks.length) kBooks = ["Kidung"]; }
    if (!kBuku) kBuku = (window.__kidungNow && window.__kidungNow.buku) || (typeof kidungCurrentBuku !== "undefined" ? kidungCurrentBuku : null) || kBooks[0];
    if (!overlay) return;
    lab("Buku");
    const bg = document.createElement("div"); bg.className = "qj-grid";
    kBooks.forEach((b) => bg.appendChild(mk("qj-b" + (b === kBuku ? " cur" : ""), b, () => { kBuku = b; renderKidung(); })));
    body.appendChild(bg);
    const txt = filterText.trim();
    const noOnly = /^\d+$/.test(txt);
    if (noOnly) body.insertBefore(mk("qj-go", "Buka " + kBuku + " No. " + txt.replace(/^0+(?=\d)/, "") + "  ↵", () => openKidungNo(kBuku, txt.replace(/^0+(?=\d)/, ""))), body.firstChild);
    const now = window.__kidungNow;
    if (!txt && now && now.no) {
      lab("Sedang dibuka: " + now.buku + " No. " + now.no);
      const list = await kidungListOf(now.buku);
      if (!overlay) return;
      const i = list.findIndex((k) => String(k.noKidung) === String(now.no));
      const row = document.createElement("div"); row.className = "qj-grid"; row.style.gridTemplateColumns = "1fr 1fr";
      const prev = list[i - 1], next = list[i + 1];
      const pb = mk("qj-b", prev ? "◀ " + prev.noKidung : "◀", prev ? () => openKidungNo(now.buku, prev.noKidung) : null); if (!prev) pb.disabled = true;
      const nb = mk("qj-b", next ? next.noKidung + " ▶" : "▶", next ? () => openKidungNo(now.buku, next.noKidung) : null); if (!next) nb.disabled = true;
      pb.style.fontWeight = nb.style.fontWeight = "800"; pb.style.fontSize = nb.style.fontSize = "18px";
      row.appendChild(pb); row.appendChild(nb); body.appendChild(row);
    }
    if (!txt) {
      const rec = loadKRecent();
      if (rec.length) { lab("Terakhir dibuka"); const g = document.createElement("div"); g.className = "qj-grid"; rec.forEach((r) => g.appendChild(mk("qj-b", (r.buku === "Kidung" ? "" : r.buku + " ") + r.no + (r.judul ? " · " + r.judul.slice(0, 14) : ""), () => openKidungNo(r.buku, r.no)))); body.appendChild(g); }
    } else if (!noOnly) { // cari judul
      const list = await kidungListOf(kBuku);
      if (!overlay) return;
      const q = norm(txt);
      const hits = list.filter((k) => norm(k.judul).indexOf(q) >= 0 || norm(k.awalLagu || "").indexOf(q) >= 0).slice(0, 40);
      lab(hits.length ? "Judul yang cocok (" + kBuku + ")" : "Tidak ada judul yang cocok");
      const g = document.createElement("div"); g.className = "qj-grid"; g.style.gridTemplateColumns = "1fr";
      hits.forEach((k) => { const b = mk("qj-b", k.noKidung + " · " + (k.judul || ""), () => openKidungNo(kBuku, k.noKidung)); b.style.textAlign = "left"; g.appendChild(b); });
      body.appendChild(g);
    }
  }
  function render() {
    if (!overlay) return;
    if (overlay.dataset.mode === "kidung") { renderKidung(); return; }
    const body = overlay.querySelector(".qj-body"); body.innerHTML = "";
    const mk = (cls, text, fn, extra) => { const b = document.createElement("button"); b.type = "button"; b.className = cls; b.textContent = text; if (fn) b.addEventListener("click", fn); if (extra) extra(b); return b; };
    const lab = (t) => { const d = document.createElement("div"); d.className = "qj-lab"; d.textContent = t; body.appendChild(d); };
    if (view === "chapters" && pickedBook) {
      body.appendChild(mk("qj-back", "← Semua kitab", () => { view = "books"; render(); }));
      lab(pickedBook.name + " — pilih pasal");
      const g = document.createElement("div"); g.className = "qj-grid ch";
      chaptersOf(pickedBook.num).forEach((ch) => g.appendChild(mk("qj-b" + (pickedBook.num === currentBookNum && Number(ch) === Number(currentChapter) ? " cur" : ""), String(ch), () => openRef(pickedBook.num, ch))));
      body.appendChild(g);
      return;
    }
    const direct = parseDirect(filterText);
    if (direct) body.appendChild(mk("qj-go", "Buka " + direct.book.name + " " + direct.chapter + "  ↵", () => openRef(direct.book.num, direct.chapter)));
    const rec = loadRecent();
    if (!filterText && rec.length) {
      lab("Terakhir dibuka");
      const g = document.createElement("div"); g.className = "qj-grid";
      rec.forEach((r) => g.appendChild(mk("qj-b", bookName(r.b) + " " + r.c, () => openRef(r.b, r.c))));
      body.appendChild(g);
    }
    const mq = /^(.*[a-zA-Z].*?)\s*\d+(?:\s*[:.]\s*\d+)?\s*$/.exec(filterText.trim());
    const q = norm(mq ? mq[1] : filterText); // "amsal 23" -> "amsal"; "1 kor" tetap "1kor"
    const books = (typeof BOOKS !== "undefined" ? BOOKS : []).filter((b) => !q || norm(b.name).indexOf(q) >= 0);
    [["PL", "Perjanjian Lama"], ["PB", "Perjanjian Baru"]].forEach(([t, label]) => {
      const list = books.filter((b) => b.testament === t);
      if (!list.length) return;
      lab(label);
      const g = document.createElement("div"); g.className = "qj-grid";
      list.forEach((b) => g.appendChild(mk("qj-b" + (b.num === currentBookNum ? " cur" : ""), b.name, () => { view = "chapters"; pickedBook = b; render(); body.scrollTop = 0; }, (btn) => { if (!availableBook(b)) btn.disabled = true; })));
      body.appendChild(g);
    });
    if (!books.length) lab("Tidak ada kitab yang cocok");
  }

  function fsChips(foot) {
    const wrap = document.createElement("span"); wrap.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;align-items:center";
    wrap.appendChild(document.createTextNode("Layar penuh:"));
    const cur = localStorage.getItem(FS_KEY) === "css" ? "css" : "system";
    [["system", "Sistem (asli)"], ["css", "⚡ Cepat (tanpa layar hitam)"]].forEach(([v, l]) => {
      const c = document.createElement("button"); c.type = "button"; c.className = "qj-chip" + (cur === v ? " on" : ""); c.textContent = l;
      c.addEventListener("click", () => { try { if (v === "css") localStorage.setItem(FS_KEY, "css"); else localStorage.removeItem(FS_KEY); } catch (e) { /* abaikan */ } wrap.parentNode.replaceChild(fsChips(foot), wrap); });
      wrap.appendChild(c);
    });
    if (foot) foot.appendChild(wrap);
    return wrap;
  }

  function open() {
    if (overlay) return;
    ensureStyle();
    view = "books"; pickedBook = null; filterText = ""; kBuku = null;
    const kidungMode = kidungActive();
    overlay = document.createElement("div"); overlay.id = "quickJump"; overlay.dataset.mode = kidungMode ? "kidung" : "bible";
    overlay.innerHTML = '<div class="qj-panel" role="dialog" aria-label="Pindah kitab cepat"><div class="qj-head"><input type="search" enterkeyhint="go" autocomplete="off" placeholder="Kitab, atau &quot;amsal 23&quot; ↵" /><button type="button" class="qj-x" aria-label="Tutup">✕</button></div><div class="qj-body"></div><div class="qj-foot"></div></div>';
    document.body.appendChild(overlay);
    const input = overlay.querySelector("input");
    if (kidungMode) { input.placeholder = "Nomor (157) atau judul ↵"; input.setAttribute("inputmode", "search"); }
    input.addEventListener("input", () => { filterText = input.value; view = "books"; render(); });
    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (overlay && overlay.dataset.mode === "kidung") { const t = filterText.trim(); if (/^\d+$/.test(t) && kBuku) openKidungNo(kBuku, t.replace(/^0+(?=\d)/, "")); return; }
      const d = parseDirect(filterText);
      if (d) { openRef(d.book.num, d.chapter); return; }
      const q = norm(filterText);
      const hits = (typeof BOOKS !== "undefined" ? BOOKS : []).filter((b) => availableBook(b) && (!q || norm(b.name).indexOf(q) >= 0));
      if (hits.length >= 1 && q) { pickedBook = hits[0]; view = "chapters"; render(); }
    });
    overlay.querySelector(".qj-x").addEventListener("click", close);
    overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) close(); });
    fsChips(overlay.querySelector(".qj-foot"));
    render();
    setTimeout(() => { try { input.focus({ preventScroll: true }); } catch (e) { /* abaikan */ } }, 50);
  }
  function close() { if (overlay) { overlay.remove(); overlay = null; } syncFab(); }

  // ------------------------------------------------------------
  // book200 (laporan operator: "kenapa mode full screen masih bisa tampil address link yang paling atas"):
  // Bilah alamat Chrome hanya hilang total kalau (a) layar penuh SISTEM aktif, atau (b) aplikasi dipasang di layar utama (PWA).
  // Mode "⚡ Cepat" TIDAK memakai layar penuh sistem (supaya tanpa layar hitam), dan layar penuh sistem bisa berakhir sendiri (mis. setelah
  // pemutar video layar penuh / geser dari atas). Jadi saat mode baca-penuh nyala TAPI bilah alamat kelihatan, muncul tombol kecil:
  //   [⛶ Sembunyikan bilah alamat] (layar penuh sistem sekali ketuk)   [📲 Pasang aplikasi] (hilang total, tanpa layar hitam)   [✕]
  // Terdeteksi dari selisih tinggi layar fisik vs tinggi halaman (> 90px = ada bilah browser).
  // ------------------------------------------------------------
  const CHIP_DISMISS = "qj_fschip_dismissed";
  function isStandalone() { try { return matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches || navigator.standalone === true; } catch (e) { return false; } }
  function isMobileUi() { try { return matchMedia("(pointer: coarse)").matches || /Android|iPhone|iPad/i.test(navigator.userAgent); } catch (e) { return false; } }
  function browserBarVisible() {
    try { const full = matchMedia("(orientation: portrait)").matches ? screen.height : screen.width; return full - window.innerHeight > 90; } catch (e) { return false; }
  }
  function inSystemFs() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  function syncChip() {
    let chip = $("qjFsChip");
    const need = isMobileUi() && document.body.classList.contains("reader-clean") && !inSystemFs() && !isStandalone() && browserBarVisible() && !sessionStorage.getItem(CHIP_DISMISS) && !overlay;
    if (!need) { if (chip) chip.remove(); return; }
    if (chip) return;
    ensureStyle();
    chip = document.createElement("div"); chip.id = "qjFsChip";
    chip.innerHTML = '<button type="button" data-a="fs">⛶ Sembunyikan bilah alamat</button><button type="button" data-a="pwa">📲 Pasang aplikasi</button><button type="button" data-a="x" aria-label="Tutup">✕</button>';
    document.body.appendChild(chip);
    chip.addEventListener("click", (e) => {
      const a = e.target && e.target.getAttribute && e.target.getAttribute("data-a");
      if (a === "x") { try { sessionStorage.setItem(CHIP_DISMISS, "1"); } catch (er) { /* abaikan */ } chip.remove(); }
      else if (a === "fs") { const el = document.documentElement; const f = el.requestFullscreen || el.webkitRequestFullscreen; if (f) { try { const p = f.call(el, { navigationUI: "hide" }); if (p && p.catch) p.catch(() => toast("Browser menolak layar penuh. Coba pasang aplikasi (📲).", 5000)); } catch (er) { toast("Browser menolak layar penuh. Coba pasang aplikasi (📲).", 5000); } } else toast("Browser ini tidak mendukung layar penuh. Pasang aplikasi (📲) untuk menghilangkan bilah alamat.", 6000); }
      else if (a === "pwa") { const b = $("pwaInstallBtn"); if (b) b.click(); toast("Untuk menghilangkan bilah alamat sepenuhnya: menu Chrome ⋮ → \"Instal aplikasi\" / \"Tambahkan ke layar utama\", lalu buka dari ikon di layar utama.", 9000); }
    });
  }

  function syncFab() {
    syncChip();
    if (!fab) return;
    fab.classList.toggle("show", (readerOpen() || kidungActive()) && !overlay);
  }
  function init() {
    ensureStyle();
    fab = document.createElement("button");
    fab.id = "quickJumpFab"; fab.type = "button"; fab.textContent = "📖"; fab.title = "Pindah kitab / pasal cepat"; fab.setAttribute("aria-label", "Pindah kitab cepat");
    fab.addEventListener("click", open);
    document.body.appendChild(fab);
    const r = $("reader");
    if (r && typeof MutationObserver === "function") new MutationObserver(syncFab).observe(r, { attributes: true, attributeFilter: ["hidden"] });
    const kp = $("kidungPanel");
    if (kp && typeof MutationObserver === "function") new MutationObserver(syncFab).observe(kp, { attributes: true, attributeFilter: ["hidden"] });
    new MutationObserver(syncFab).observe(document.body, { attributes: true, attributeFilter: ["class"] });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && overlay) { e.preventDefault(); e.stopPropagation(); close(); syncFab(); } }, true);
    ["fullscreenchange", "webkitfullscreenchange", "reader-clean-change"].forEach((ev) => document.addEventListener(ev, () => setTimeout(syncFab, 150)));
    window.addEventListener("resize", () => setTimeout(syncFab, 150));
    setInterval(syncFab, 1500); // jaring pengaman (mis. pembaca dibuka tanpa mengubah atribut yang diamati)
    syncFab();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  window.QuickJump = { open, close, toast, parseDirect, noteKidung, syncChip, FS_KEY };
})();
