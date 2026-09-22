// ============================================================
//  🖍️ PENANDA / STABILO BERKATEGORI  (BARU 21 Sep 2026, permintaan operator)
//
//  Menambah di atas highlight warna lama (js/highlights.js -- satu warna per
//  ayat, hanya di perangkat ini):
//   1) KATEGORI pencatatan buatan sendiri: nama + warna + ikon (mis. ⭐ Penting,
//      🤝 Janji Tuhan, 📜 Perintah). Satu ayat boleh punya BEBERAPA kategori.
//   2) Tanda sebagian teks (stabilo per kata/kalimat): blok teks di AYAT atau
//      di CATATAN KAKI, lalu pilih kategorinya. Ketuk teks yang sudah ditandai
//      untuk mengganti kategori / menghapus.
//   3) Mudah dibedakan: tiap kategori punya warna + ikon + nama; titik-titik
//      warna kecil di bawah nomor ayat; bilah kategori di atas tiap pasal
//      (ketuk kategori = sembunyikan/tampilkan; "Hanya yang ditandai" = tampilkan
//      cuma ayat yang punya tanda).
//   4) Panel "🖍️ Penanda Saya": semua tanda, disaring per kategori/jenis/kata,
//      langsung lompat ke ayatnya.
//   5) Tersinkron ke Google Sheet (tab "Annotations", lihat apps-script/Code.gs)
//      supaya sama di HP & komputer lain -- highlight lama HANYA di perangkat.
//
//  Highlight lama otomatis DIPINDAHKAN (sekali) jadi kategori berwarna sama
//  (kuning -> "Penting", hijau -> "Janji Tuhan", dst; nama bisa diubah).
//  Data lama di localStorage tidak dihapus.
//
//  Penyimpanan: localStorage "bible_anno_v1_<username>". Tanda ayat-penuh
//  memakai kunci "kitab:pasal:ayat" TANPA bahasa (ditandai di Indonesia, ikut
//  muncul di kolom Inggris); tanda sebagian teks terikat ke bahasa (offset
//  karakter + kutipan + konteks, jadi tetap ketemu walau teksnya diedit admin).
//  Catatan pribadi (kotak tulis/textarea) TIDAK bisa disorot per kata karena
//  memang kotak tulis biasa; tandai ayatnya dengan kategori.
//
//  Modul ini memakai global app.js hanya saat DIPANGGIL: currentUser, verseById,
//  verseIndex, currentLang, currentBookNum, currentChapter, renderChapter, el,
//  hideAllPanels, closeSidebarOnMobile, BOOKS, CONFIG, Guest, Sync.
// ============================================================
(function () {
  "use strict";

  const KEY_PREFIX = "bible_anno_v1_";
  const PENDING_PREFIX = "bible_anno_pending_v1_";
  const PREFS_PREFIX = "bible_anno_prefs_v1_";
  const LEGACY_PREFIX = "bible_highlights_v1_";
  const EPOCH = "1970-01-01T00:00:00.000Z";
  const TOMBSTONE_DAYS = 45;
  const PANEL_PAGE = 60;

  const COLORS = [
    { key: "yellow", label: "Kuning" }, { key: "green", label: "Hijau" }, { key: "blue", label: "Biru" },
    { key: "pink", label: "Pink" }, { key: "purple", label: "Ungu" }, { key: "orange", label: "Oranye" },
    { key: "teal", label: "Tosca" }, { key: "coral", label: "Salem" }, { key: "gray", label: "Abu-abu" },
    { key: "cream", label: "Krem" },
  ];
  const COLOR_KEYS = COLORS.map((c) => c.key);
  const DEFAULT_CATS = [
    { id: "c_yellow", name: "Penting", color: "yellow", icon: "⭐" },
    { id: "c_green", name: "Janji Tuhan", color: "green", icon: "🤝" },
    { id: "c_blue", name: "Perintah", color: "blue", icon: "📜" },
    { id: "c_pink", name: "Kasih", color: "pink", icon: "❤️" },
    { id: "c_purple", name: "Doa & Pujian", color: "purple", icon: "🙏" },
    { id: "c_orange", name: "Peringatan", color: "orange", icon: "⚠️" },
    { id: "c_teal", name: "Nubuat", color: "teal", icon: "🔭" },
    { id: "c_coral", name: "Kristus", color: "coral", icon: "✝️" },
  ];

  // ------------------------------------------------------------
  //  Utilitas kecil
  // ------------------------------------------------------------
  function h(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  const nowIso_ = () => new Date().toISOString();
  const uid_ = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const user_ = () => (typeof currentUser !== "undefined" && currentUser) ? currentUser : "";
  function isGuest_() {
    return !user_() || (typeof Guest !== "undefined" && Guest.isGuest && Guest.isGuest());
  }
  function langLabel_(code) {
    const f = ((typeof CONFIG !== "undefined" && CONFIG.LANGUAGES) || []).find((l) => l.code === code);
    return f ? f.label : code;
  }
  function bookName_(num) {
    const b = (typeof BOOKS !== "undefined") ? BOOKS.find((x) => x.num === num) : null;
    return b ? b.name : "Kitab " + num;
  }
  function elById_(id) { return document.getElementById(id); }

  // ------------------------------------------------------------
  //  State: kategori + tanda (localStorage per pengguna)
  // ------------------------------------------------------------
  let S = null, SU = null;
  let rev_ = 1; // naik tiap ada perubahan -> blok ayat tahu harus digambar ulang

  function st_() {
    const u = user_() || "guest";
    if (S && SU === u) return S;
    SU = u;
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY_PREFIX + u) || "null"); } catch (e) { raw = null; }
    S = (raw && raw.v === 1 && raw.marks) ? raw : { v: 1, cats: null, marks: {}, syncedAt: "", legacyDone: false };
    if (!Array.isArray(S.cats)) S.cats = DEFAULT_CATS.map((c) => Object.assign({ u: EPOCH }, c));
    rev_++;
    return S;
  }
  function save_() {
    try { localStorage.setItem(KEY_PREFIX + (SU || "guest"), JSON.stringify(S)); } catch (e) { /* penyimpanan penuh -- tetap tampil di sesi ini */ }
  }
  function prefs_() {
    const u = user_() || "guest";
    let p = {};
    try { p = JSON.parse(localStorage.getItem(PREFS_PREFIX + u) || "{}") || {}; } catch (e) { p = {}; }
    return { hidden: Array.isArray(p.hidden) ? p.hidden : [], only: !!p.only };
  }
  function savePrefs_(p) {
    try { localStorage.setItem(PREFS_PREFIX + (user_() || "guest"), JSON.stringify(p)); } catch (e) { /* diabaikan */ }
  }
  function pending_() {
    try { return JSON.parse(localStorage.getItem(PENDING_PREFIX + (user_() || "guest")) || "[]") || []; } catch (e) { return []; }
  }
  function savePending_(list) {
    try { localStorage.setItem(PENDING_PREFIX + (user_() || "guest"), JSON.stringify(list)); } catch (e) { /* diabaikan */ }
  }

  // ------------------------------------------------------------
  //  Kategori
  // ------------------------------------------------------------
  function liveCats_() { return st_().cats.filter((c) => !c.d); }
  function catMap_() { const m = {}; liveCats_().forEach((c) => { m[c.id] = c; }); return m; }
  function cat_(id) { return catMap_()[id] || null; }
  function colorOf_(id) { const c = cat_(id); return c ? c.color : "gray"; }
  function keepLive_(ids) { const m = catMap_(); return (ids || []).filter((id) => m[id]); }

  function addCategory(name, color, icon) {
    const s = st_();
    const nm = String(name || "").trim().slice(0, 40);
    if (!nm) return null;
    const cat = { id: "c_" + uid_(), name: nm, color: COLOR_KEYS.includes(color) ? color : "gray", icon: String(icon || "").trim().slice(0, 4), u: nowIso_() };
    s.cats.push(cat);
    changed_(["cat:" + cat.id]);
    return cat;
  }
  function updateCategory(id, patch) {
    const c = st_().cats.find((x) => x.id === id && !x.d);
    if (!c) return false;
    if (patch.name != null) { const nm = String(patch.name).trim().slice(0, 40); if (nm) c.name = nm; }
    if (patch.color != null && COLOR_KEYS.includes(patch.color)) c.color = patch.color;
    if (patch.icon != null) c.icon = String(patch.icon).trim().slice(0, 4);
    c.u = nowIso_();
    changed_(["cat:" + id]);
    return true;
  }
  function deleteCategory(id) {
    const s = st_();
    const c = s.cats.find((x) => x.id === id && !x.d);
    if (!c) return false;
    const ids = ["cat:" + id];
    c.d = 1; c.u = nowIso_();
    Object.keys(s.marks).forEach((mid) => {
      const m = s.marks[mid];
      if (m.d || !(m.cats || []).includes(id)) return;
      m.cats = m.cats.filter((x) => x !== id);
      if (!keepLive_(m.cats).length) m.d = 1;
      m.u = nowIso_();
      ids.push(mid);
    });
    const p = prefs_();
    if (p.hidden.includes(id)) { p.hidden = p.hidden.filter((x) => x !== id); savePrefs_(p); }
    changed_(ids);
    return true;
  }
  function categoryUsage_(id) {
    let n = 0;
    Object.values(st_().marks).forEach((m) => { if (!m.d && (m.cats || []).includes(id)) n++; });
    return n;
  }

  // ------------------------------------------------------------
  //  Tanda ayat penuh & tanda sebagian teks
  // ------------------------------------------------------------
  const vKey_ = (b, c, v) => "v:" + b + ":" + c + ":" + v;
  function verseMark_(b, c, v) { const m = st_().marks[vKey_(b, c, v)]; return m && !m.d ? m : null; }
  function verseCatIds(b, c, v) { const m = verseMark_(b, c, v); return m ? keepLive_(m.cats) : []; }

  function toggleVerseCat(b, c, v, catId, forceOn) {
    const s = st_();
    const key = vKey_(b, c, v);
    let m = s.marks[key];
    if (!m) { m = { id: key, t: "v", b, c, v, cats: [], u: nowIso_() }; s.marks[key] = m; }
    if (m.d) { m.d = 0; m.cats = []; }
    const has = m.cats.includes(catId);
    const on = forceOn == null ? !has : !!forceOn;
    if (on && !has) m.cats.push(catId);
    if (!on && has) m.cats = m.cats.filter((x) => x !== catId);
    if (!keepLive_(m.cats).length) m.d = 1;
    m.u = nowIso_();
    changed_([key]);
    return on;
  }
  function clearVerse(b, c, v) {
    const m = st_().marks[vKey_(b, c, v)];
    if (!m || m.d) return;
    m.d = 1; m.cats = []; m.u = nowIso_();
    changed_([m.id]);
  }

  function rangesFor_(v, on) {
    return Object.values(st_().marks).filter((m) => m.t === "r" && !m.d && m.b === v.bookNumber && m.c === v.chapter && m.v === v.verse && m.lang === v.lang && m.on === on);
  }
  function addRange_(info, catId) {
    const m = {
      id: "r:" + uid_(), t: "r", b: info.v.bookNumber, c: info.v.chapter, v: info.v.verse, lang: info.v.lang,
      on: info.on, s: info.s, e: info.e, q: info.q, p: info.p, x: info.x, cats: [catId], u: nowIso_(),
    };
    st_().marks[m.id] = m;
    changed_([m.id]);
    return m;
  }
  function toggleRangeCat_(id, catId) {
    const m = st_().marks[id];
    if (!m || m.d) return;
    const has = m.cats.includes(catId);
    m.cats = has ? m.cats.filter((x) => x !== catId) : m.cats.concat(catId);
    if (!keepLive_(m.cats).length) m.d = 1;
    m.u = nowIso_();
    changed_([id]);
  }
  function removeMark_(id) {
    const m = st_().marks[id];
    if (!m || m.d) return;
    m.d = 1; m.u = nowIso_();
    changed_([id]);
  }

  // Mengubah tanda yang berubah: simpan, antre kirim ke server, gambar ulang.
  function changed_(ids) {
    rev_++;
    save_();
    if (ids && ids.length) {
      const p = pending_();
      ids.forEach((id) => { if (!p.includes(id)) p.push(id); });
      savePending_(p);
      scheduleFlush_();
    }
    decorateAll_();
    renderFilterBar_();
    if (panelOpen_()) renderPanel_();
  }

  // Buang batu nisan yang sudah lama (sudah pasti tersinkron ke semua perangkat).
  function pruneTombstones_() {
    const s = st_();
    const limit = Date.now() - TOMBSTONE_DAYS * 86400000;
    const pend = new Set(pending_());
    Object.keys(s.marks).forEach((id) => { const m = s.marks[id]; if (m.d && !pend.has(id) && new Date(m.u).getTime() < limit) delete s.marks[id]; });
    s.cats = s.cats.filter((c) => !(c.d && !pend.has("cat:" + c.id) && new Date(c.u).getTime() < limit));
  }

  // ------------------------------------------------------------
  //  Highlight lama -> kategori (sekali saja, kalau data ayat sudah dimuat)
  // ------------------------------------------------------------
  function migrateLegacy_() {
    const s = st_();
    if (s.legacyDone || typeof verseById === "undefined" || !Object.keys(verseById).length) return;
    let legacy = {};
    try { legacy = JSON.parse(localStorage.getItem(LEGACY_PREFIX + (user_() || "guest")) || "{}") || {}; } catch (e) { legacy = {}; }
    const ids = [];
    Object.keys(legacy).forEach((verseId) => {
      const v = verseById[verseId];
      const color = legacy[verseId] && legacy[verseId].color;
      if (!v || !COLOR_KEYS.includes(color)) return;
      let cat = s.cats.find((c) => c.id === "c_" + color && !c.d);
      if (!cat) {
        cat = { id: "c_" + color, name: (COLORS.find((x) => x.key === color) || {}).label || color, color, icon: "", u: nowIso_() };
        s.cats.push(cat);
        ids.push("cat:" + cat.id);
      }
      const key = vKey_(v.bookNumber, v.chapter, v.verse);
      const m = s.marks[key] && !s.marks[key].d ? s.marks[key] : (s.marks[key] = { id: key, t: "v", b: v.bookNumber, c: v.chapter, v: v.verse, cats: [], u: nowIso_() });
      if (!m.cats.includes(cat.id)) m.cats.push(cat.id);
      m.u = nowIso_();
      ids.push(key);
    });
    s.legacyDone = true;
    save_();
    if (ids.length) {
      const p = pending_();
      ids.forEach((id) => { if (!p.includes(id)) p.push(id); });
      savePending_(p);
      scheduleFlush_();
    }
  }

  // ------------------------------------------------------------
  //  Teks <-> posisi karakter (untuk tanda sebagian teks)
  //  Teks yang dihitung = teks yang TAMPIL di kotak itu, tanpa lencana 📝.
  // ------------------------------------------------------------
  function counted_(n, container) {
    for (let p = n.parentNode; p && p !== container; p = p.parentNode) {
      if (p.nodeType === 1 && p.classList && (p.classList.contains("verse-note-badge") || p.classList.contains("anno-ignore"))) return false;
    }
    return true;
  }
  function textNodes_(container) {
    const out = [];
    const w = document.createTreeWalker(container, 4 /* SHOW_TEXT */, null);
    while (w.nextNode()) { const n = w.currentNode; if (counted_(n, container)) out.push(n); }
    return out;
  }
  function containerText_(container) { return textNodes_(container).map((n) => n.nodeValue).join(""); }

  // Posisi karakter untuk titik (node, offset) di dalam container.
  function offsetOf_(container, node, offset) {
    const pos = document.createRange();
    pos.setStart(node, offset);
    pos.collapse(true);
    let sum = 0;
    for (const t of textNodes_(container)) {
      if (t === node) return sum + Math.min(offset, t.nodeValue.length);
      // t seluruhnya sebelum titik?
      if (pos.comparePoint(t, t.nodeValue.length) < 0) { sum += t.nodeValue.length; continue; }
      if (pos.comparePoint(t, 0) > 0) return sum; // t sesudah titik
      sum += t.nodeValue.length; // titik ada di dalam elemen induk t -- hitung utuh
    }
    return sum;
  }

  function unwrapMarks_(container) {
    container.querySelectorAll("mark.anno-mark").forEach((m) => {
      const parent = m.parentNode;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
    });
    container.normalize();
  }

  function wrapRange_(container, start, end, attrs) {
    let pos = 0;
    textNodes_(container).forEach((n) => {
      const len = n.nodeValue.length;
      const a = Math.max(start, pos), b = Math.min(end, pos + len);
      if (a < b) {
        let target = n;
        if (b - pos < len) n.splitText(b - pos);
        if (a - pos > 0) target = n.splitText(a - pos);
        const mk = document.createElement("mark");
        mk.className = "anno-mark " + attrs.cls;
        mk.dataset.mark = attrs.id;
        mk.dataset.cats = attrs.catsText;
        mk.title = attrs.title;
        target.parentNode.replaceChild(mk, target);
        mk.appendChild(target);
      }
      pos += len;
    });
  }

  // Cari lagi posisi kutipan (offset bisa geser kalau teks diedit admin).
  function resolve_(text, m) {
    const q = m.q || "";
    if (!q) return null;
    if (text.substr(m.s, q.length) === q) return [m.s, m.s + q.length];
    let best = -1, bestScore = -Infinity;
    for (let i = text.indexOf(q); i !== -1; i = text.indexOf(q, i + 1)) {
      let score = -Math.abs(i - (m.s || 0));
      if (m.p && text.slice(Math.max(0, i - m.p.length), i) === m.p) score += 1000;
      if (m.x && text.substr(i + q.length, m.x.length) === m.x) score += 1000;
      if (score > bestScore) { bestScore = score; best = i; }
    }
    return best >= 0 ? [best, best + q.length] : null;
  }

  // ------------------------------------------------------------
  //  Menggambar tanda di blok ayat
  // ------------------------------------------------------------
  function containerFor_(block, on) {
    return block.querySelector(on === "note" ? ".note-modal-admin-text" : ".verse-text-wrap");
  }

  function decorateBlock_(block, force) {
    if (!block || !block.id || block.id.indexOf("v-") !== 0) return;
    const v = typeof verseById !== "undefined" ? verseById[block.id.slice(2)] : null;
    if (!v) return;
    if (!force && block.dataset.annoRev === String(rev_)) return;
    block.dataset.annoRev = String(rev_);
    const hidden = new Set(prefs_().hidden);

    const cats = verseCatIds(v.bookNumber, v.chapter, v.verse);
    const visible = cats.filter((id) => !hidden.has(id));
    COLOR_KEYS.forEach((k) => block.classList.remove("hl-" + k));
    if (visible.length) block.classList.add("hl-" + colorOf_(visible[0]));

    const num = block.querySelector(".verse-num");
    if (num) {
      const old = num.querySelector(".anno-dots");
      if (old) old.remove();
      if (cats.length) {
        const dots = h("span", "anno-dots");
        dots.setAttribute("aria-hidden", "true");
        cats.slice(0, 5).forEach((id) => {
          const d = h("i", "anno-dot anno-dot-" + colorOf_(id));
          if (hidden.has(id)) d.classList.add("off");
          dots.appendChild(d);
        });
        num.appendChild(dots);
      }
      num.title = cats.length
        ? "Kategori: " + cats.map((id) => cat_(id).name).join(", ") + " — tekan untuk mengubah, dua kali untuk catatan"
        : "Tekan sekali untuk menandai (kategori), dua kali untuk catatan";
    }

    ["text", "note"].forEach((on) => {
      const cont = containerFor_(block, on);
      if (!cont) return;
      unwrapMarks_(cont);
      const text = containerText_(cont);
      rangesFor_(v, on).forEach((m) => {
        const pos = resolve_(text, m);
        if (!pos) return;
        const live = keepLive_(m.cats);
        const vis = live.filter((id) => !hidden.has(id));
        wrapRange_(cont, pos[0], pos[1], {
          id: m.id,
          cls: vis.length ? "mk-" + colorOf_(vis[0]) : "anno-off",
          catsText: live.join(" "),
          title: live.map((id) => cat_(id).name).join(", "),
        });
      });
    });

    const only = prefs_().only;
    const hasVisible = visible.length > 0 || !!block.querySelector("mark.anno-mark:not(.anno-off)");
    block.classList.toggle("anno-hidden", only && !hasVisible);
  }

  let decorating_ = false;
  function decorateAll_(force) {
    const root = elById_("readerVerses");
    if (!root) return;
    decorating_ = true;
    try {
      root.querySelectorAll(".verse-block").forEach((b) => decorateBlock_(b, !!force));
    } finally {
      decorating_ = false;
      if (observer_) observer_.takeRecords();
    }
  }

  // ------------------------------------------------------------
  //  Bilah kategori di atas pasal (sembunyikan/tampilkan per kategori)
  // ------------------------------------------------------------
  function countsFor_(b, c) {
    const counts = {};
    Object.values(st_().marks).forEach((m) => {
      if (m.d || m.b !== b || m.c !== c) return;
      keepLive_(m.cats).forEach((id) => { counts[id] = (counts[id] || 0) + 1; });
    });
    return counts;
  }

  function renderFilterBar_() {
    const verses = elById_("readerVerses");
    let bar = elById_("annoFilterBar");
    if (!verses || isGuest_() || typeof currentBookNum === "undefined" || !currentBookNum) { if (bar) bar.remove(); return; }
    const counts = countsFor_(currentBookNum, currentChapter);
    const p = prefs_();
    const total = Object.keys(counts).length;
    if (!total && !p.only && !p.hidden.length) { if (bar) bar.remove(); return; }
    if (!bar) {
      bar = h("div", "anno-filter-bar");
      bar.id = "annoFilterBar";
      verses.parentNode.insertBefore(bar, verses);
    }
    bar.innerHTML = "";
    bar.appendChild(h("span", "anno-filter-title", "🖍️ Tanda di pasal ini"));
    liveCats_().forEach((c) => {
      const n = counts[c.id] || 0;
      if (!n && !p.hidden.includes(c.id)) return;
      const off = p.hidden.includes(c.id);
      const chip = h("button", "anno-chip anno-chip-" + c.color + (off ? " off" : ""));
      chip.type = "button";
      chip.setAttribute("aria-pressed", off ? "false" : "true");
      chip.title = (off ? "Tampilkan" : "Sembunyikan") + " kategori " + c.name;
      chip.appendChild(h("span", "anno-chip-ico", c.icon || "●"));
      chip.appendChild(h("span", "anno-chip-name", c.name));
      chip.appendChild(h("span", "anno-chip-count", String(n)));
      chip.addEventListener("click", () => toggleHidden(c.id));
      bar.appendChild(chip);
    });
    const only = h("button", "anno-chip anno-chip-only" + (p.only ? " on" : ""));
    only.type = "button";
    only.setAttribute("aria-pressed", p.only ? "true" : "false");
    only.textContent = p.only ? "✔ Hanya yang ditandai" : "Hanya yang ditandai";
    only.title = "Tampilkan hanya ayat yang punya tanda (kategori yang sedang ditampilkan)";
    only.addEventListener("click", () => setOnly(!prefs_().only));
    bar.appendChild(only);
    const open = h("button", "anno-chip anno-chip-open", "Semua tanda ›");
    open.type = "button";
    open.addEventListener("click", showPanel);
    bar.appendChild(open);
    if (p.only) {
      const shown = verses.querySelectorAll(".verse-block:not(.anno-hidden)").length;
      const all = verses.querySelectorAll(".verse-block").length;
      bar.appendChild(h("span", "anno-filter-note", shown ? "Menampilkan " + shown + " dari " + all + " ayat." : "Tidak ada ayat bertanda pada kategori yang ditampilkan."));
    }
  }

  function toggleHidden(catId) {
    const p = prefs_();
    p.hidden = p.hidden.includes(catId) ? p.hidden.filter((x) => x !== catId) : p.hidden.concat(catId);
    savePrefs_(p);
    rev_++;
    decorateAll_();
    renderFilterBar_();
  }
  function setOnly(on) {
    const p = prefs_();
    p.only = !!on;
    savePrefs_(p);
    rev_++;
    decorateAll_();
    renderFilterBar_();
  }

  // ------------------------------------------------------------
  //  Popup melayang (kategori ayat / kategori tanda teks)
  // ------------------------------------------------------------
  let popup_ = null;
  function closePopup_() {
    if (!popup_) return;
    popup_.remove();
    popup_ = null;
    document.removeEventListener("click", onDocClick_, true);
    document.removeEventListener("keydown", onEsc_, true);
  }
  function onDocClick_(e) { if (popup_ && !popup_.contains(e.target)) closePopup_(); }
  function onEsc_(e) { if (e.key === "Escape") closePopup_(); }

  function placePopup_(pop, anchorRect) {
    document.body.appendChild(pop);
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const w = pop.offsetWidth || 260, hgt = pop.offsetHeight || 200;
    let left = Math.min(Math.max(8, anchorRect.left), Math.max(8, vw - w - 8));
    let top = anchorRect.bottom + 6;
    if (top + hgt > vh - 8) top = Math.max(8, anchorRect.top - hgt - 6);
    pop.style.left = left + "px";
    pop.style.top = top + "px";
  }

  function catRow_(c, active, onClick) {
    const row = h("button", "anno-cat-row" + (active ? " active" : ""));
    row.type = "button";
    row.setAttribute("aria-pressed", active ? "true" : "false");
    row.appendChild(h("span", "anno-swatch hl-swatch-" + c.color));
    row.appendChild(h("span", "anno-cat-ico", c.icon || ""));
    row.appendChild(h("span", "anno-cat-name", c.name));
    row.appendChild(h("span", "anno-cat-check", active ? "✓" : ""));
    row.addEventListener("click", (e) => {
      e.stopPropagation();
      const now = onClick();
      row.classList.toggle("active", now);
      row.setAttribute("aria-pressed", now ? "true" : "false");
      row.lastChild.textContent = now ? "✓" : "";
    });
    return row;
  }

  const verseActions_ = []; // fungsi(v) -> { label, onClick } | null (dipakai js/bible-edit.js)
  function registerVerseAction(fn) { if (typeof fn === "function") verseActions_.push(fn); }

  function openVersePopup(anchorEl, block, v) {
    if (isGuest_()) {
      if (typeof Guest !== "undefined" && Guest.showFeatureLocked) Guest.showFeatureLocked("Penanda & Stabilo");
      return;
    }
    migrateLegacy_();
    closePopup_();
    const pop = h("div", "anno-popup");
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", "Kategori tanda ayat " + v.verse);
    pop.appendChild(h("div", "anno-popup-title", "🖍️ Tandai ayat " + v.verse));
    const list = h("div", "anno-cat-list");
    const active = new Set(verseCatIds(v.bookNumber, v.chapter, v.verse));
    liveCats_().forEach((c) => list.appendChild(catRow_(c, active.has(c.id), () => toggleVerseCat(v.bookNumber, v.chapter, v.verse, c.id))));
    pop.appendChild(list);
    pop.appendChild(h("div", "anno-popup-hint", "Tandai sebagian kata: blok teks di ayat atau catatan kaki, lalu pilih kategori."));
    const foot = h("div", "anno-popup-foot");
    const add = h("button", "chip-btn small", "＋ Kategori");
    add.type = "button";
    add.addEventListener("click", (e) => { e.stopPropagation(); closePopup_(); openCategoryManager(); });
    foot.appendChild(add);
    const clr = h("button", "chip-btn small", "🗑 Lepas tanda ayat");
    clr.type = "button";
    clr.addEventListener("click", (e) => { e.stopPropagation(); clearVerse(v.bookNumber, v.chapter, v.verse); closePopup_(); });
    foot.appendChild(clr);
    verseActions_.forEach((fn) => {
      let act = null;
      try { act = fn(v, block); } catch (e) { act = null; }
      if (!act) return;
      const b = h("button", "chip-btn small", act.label);
      b.type = "button";
      b.addEventListener("click", (e) => { e.stopPropagation(); closePopup_(); act.onClick(); });
      foot.appendChild(b);
    });
    pop.appendChild(foot);
    placePopup_(pop, anchorEl.getBoundingClientRect());
    popup_ = pop;
    setTimeout(() => {
      document.addEventListener("click", onDocClick_, true);
      document.addEventListener("keydown", onEsc_, true);
    }, 0);
  }

  function openMarkPopup(markEl) {
    const id = markEl.dataset.mark;
    const m = st_().marks[id];
    if (!m || m.d) return;
    closePopup_();
    const pop = h("div", "anno-popup");
    pop.setAttribute("role", "dialog");
    pop.appendChild(h("div", "anno-popup-title", "🖍️ Tanda teks"));
    pop.appendChild(h("div", "anno-popup-quote", "“" + (m.q.length > 90 ? m.q.slice(0, 90) + "…" : m.q) + "”"));
    const list = h("div", "anno-cat-list");
    const active = new Set(keepLive_(m.cats));
    liveCats_().forEach((c) => list.appendChild(catRow_(c, active.has(c.id), () => { toggleRangeCat_(id, c.id); return keepLive_((st_().marks[id] || {}).cats).includes(c.id); })));
    pop.appendChild(list);
    const foot = h("div", "anno-popup-foot");
    const del = h("button", "chip-btn small", "🗑 Hapus tanda ini");
    del.type = "button";
    del.addEventListener("click", (e) => { e.stopPropagation(); removeMark_(id); closePopup_(); });
    foot.appendChild(del);
    pop.appendChild(foot);
    placePopup_(pop, markEl.getBoundingClientRect());
    popup_ = pop;
    setTimeout(() => {
      document.addEventListener("click", onDocClick_, true);
      document.addEventListener("keydown", onEsc_, true);
    }, 0);
  }

  // ------------------------------------------------------------
  //  Toolbar melayang saat teks disorot (blok teks -> pilih kategori)
  // ------------------------------------------------------------
  let selBar_ = null, selInfo_ = null;
  function hideSelBar_() {
    if (selBar_) { selBar_.remove(); selBar_ = null; }
    selInfo_ = null;
  }
  function elOf_(node) { return node && node.nodeType === 1 ? node : (node ? node.parentElement : null); }

  function rangeInfo_(range) {
    const startEl = elOf_(range.startContainer);
    if (!startEl || !startEl.closest) return null;
    const cont = startEl.closest(".verse-text-wrap, .note-modal-admin-text");
    if (!cont || !cont.contains(range.endContainer)) return null;
    const block = cont.closest(".verse-block");
    const v = block && block.id ? (typeof verseById !== "undefined" ? verseById[block.id.slice(2)] : null) : null;
    if (!v) return null;
    const text = containerText_(cont);
    let s = offsetOf_(cont, range.startContainer, range.startOffset);
    let e = offsetOf_(cont, range.endContainer, range.endOffset);
    if (e < s) { const t = s; s = e; e = t; }
    while (s < e && /\s/.test(text.charAt(s))) s++;
    while (e > s && /\s/.test(text.charAt(e - 1))) e--;
    if (e - s < 1) return null;
    if (e - s > 300) e = s + 300;
    const entryEl = startEl.closest(".footnote-entry");
    return {
      v, block, cont, on: cont.classList.contains("verse-text-wrap") ? "text" : "note",
      s, e, q: text.slice(s, e), p: text.slice(Math.max(0, s - 24), s), x: text.slice(e, e + 24),
      entry: entryEl && cont.contains(entryEl) ? entryEl : null,
    };
  }

  function showSelBar_(info, rect) {
    hideSelBar_();
    selInfo_ = info;
    const bar = h("div", "anno-seltool");
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", "Tandai teks terpilih dengan kategori");
    // pointerdown/mousedown dicegah supaya sorotan teks TIDAK hilang sebelum tombol ditekan
    ["pointerdown", "mousedown", "touchstart"].forEach((ev) => bar.addEventListener(ev, (e) => e.preventDefault()));
    liveCats_().forEach((c) => {
      const b = h("button", "anno-selbtn hl-swatch-" + c.color, c.icon || "");
      b.type = "button";
      b.title = "Tandai: " + c.name;
      b.setAttribute("aria-label", "Tandai sebagai " + c.name);
      b.addEventListener("click", () => applySelection_(c.id));
      bar.appendChild(b);
    });
    if (info.entry) {
      const all = h("button", "anno-selbtn anno-selbtn-all", "▣");
      all.type = "button";
      all.title = "Sorot seluruh catatan kaki ini";
      all.addEventListener("click", () => {
        const text = containerText_(info.cont);
        const s = offsetOf_(info.cont, info.entry, 0);
        const e = offsetOf_(info.cont, info.entry, info.entry.childNodes.length);
        const q = text.slice(s, e).trim();
        if (!q) return;
        const st = s + (text.slice(s, e).length - text.slice(s, e).trimStart().length);
        selInfo_ = Object.assign({}, info, { s: st, e: st + Math.min(q.length, 300), q: q.slice(0, 300), p: text.slice(Math.max(0, st - 24), st), x: text.slice(st + q.length, st + q.length + 24) });
        all.classList.add("on");
      });
      bar.insertBefore(all, bar.firstChild);
    }
    document.body.appendChild(bar);
    const vw = document.documentElement.clientWidth;
    const w = bar.offsetWidth || 200;
    bar.style.left = Math.min(Math.max(8, rect.left), Math.max(8, vw - w - 8)) + "px";
    bar.style.top = (rect.bottom + 10) + "px";
    selBar_ = bar;
  }

  function applySelection_(catId) {
    const info = selInfo_;
    if (!info) return;
    addRange_(info, catId);
    try { const sel = window.getSelection(); if (sel) sel.removeAllRanges(); } catch (e) { /* diabaikan */ }
    hideSelBar_();
  }

  function updateSelBar_() {
    let sel = null;
    try { sel = window.getSelection(); } catch (e) { sel = null; }
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed || isGuest_()) { hideSelBar_(); return; }
    const range = sel.getRangeAt(0);
    const info = rangeInfo_(range);
    if (!info) { hideSelBar_(); return; }
    let rect = typeof range.getBoundingClientRect === "function" ? range.getBoundingClientRect() : null;
    if (!rect || (!rect.width && !rect.height)) {
      const r2 = typeof range.getClientRects === "function" ? range.getClientRects() : null;
      rect = r2 && r2[0] ? r2[0] : (info.cont.getBoundingClientRect ? info.cont.getBoundingClientRect() : { left: 8, bottom: 40, top: 8 });
    }
    showSelBar_(info, rect);
  }

  // ------------------------------------------------------------
  //  Kelola kategori (dialog)
  // ------------------------------------------------------------
  function closeCatManager_() { const o = elById_("annoCatOverlay"); if (o) o.remove(); }

  function openCategoryManager() {
    if (isGuest_()) { if (typeof Guest !== "undefined" && Guest.showFeatureLocked) Guest.showFeatureLocked("Penanda & Stabilo"); return; }
    closePopup_();
    closeCatManager_();
    const overlay = h("div", "simple-dialog-overlay anno-overlay");
    overlay.id = "annoCatOverlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    const box = h("div", "simple-dialog-box anno-cat-box");
    box.appendChild(h("h3", "", "🏷️ Kategori Penanda"));
    box.appendChild(h("p", "anno-popup-hint", "Nama, ikon, dan warna tiap kategori. Perubahan langsung tersimpan."));
    const rows = h("div", "anno-cat-rows");
    box.appendChild(rows);

    const colorSelect = (value) => {
      const sel = document.createElement("select");
      sel.className = "chip-select";
      COLORS.forEach((c) => { const o = h("option", "", c.label); o.value = c.key; sel.appendChild(o); });
      sel.value = value;
      return sel;
    };

    function renderRows() {
      rows.innerHTML = "";
      liveCats_().forEach((c) => {
        const row = h("div", "anno-cat-edit");
        const sw = h("span", "anno-swatch hl-swatch-" + c.color);
        const icon = document.createElement("input");
        icon.className = "anno-icon-input";
        icon.maxLength = 4;
        icon.value = c.icon || "";
        icon.placeholder = "🙂";
        icon.setAttribute("aria-label", "Ikon kategori " + c.name);
        const name = document.createElement("input");
        name.className = "anno-name-input";
        name.maxLength = 40;
        name.value = c.name;
        name.setAttribute("aria-label", "Nama kategori");
        const color = colorSelect(c.color);
        color.setAttribute("aria-label", "Warna kategori " + c.name);
        const used = categoryUsage_(c.id);
        const del = h("button", "chip-btn small danger", "🗑");
        del.type = "button";
        del.title = "Hapus kategori (" + used + " tanda memakainya)";
        icon.addEventListener("change", () => updateCategory(c.id, { icon: icon.value }));
        name.addEventListener("change", () => { if (!name.value.trim()) { name.value = c.name; return; } updateCategory(c.id, { name: name.value }); });
        color.addEventListener("change", () => { updateCategory(c.id, { color: color.value }); sw.className = "anno-swatch hl-swatch-" + color.value; });
        del.addEventListener("click", () => {
          if (!confirm("Hapus kategori \"" + c.name + "\"?" + (used ? "\n" + used + " tanda yang memakainya akan dilepas dari kategori ini." : ""))) return;
          deleteCategory(c.id);
          renderRows();
        });
        row.appendChild(sw); row.appendChild(icon); row.appendChild(name); row.appendChild(color); row.appendChild(del);
        rows.appendChild(row);
      });
    }
    renderRows();

    const addRow = h("div", "anno-cat-edit anno-cat-new");
    const nIcon = document.createElement("input");
    nIcon.className = "anno-icon-input"; nIcon.maxLength = 4; nIcon.placeholder = "🙂";
    const nName = document.createElement("input");
    nName.className = "anno-name-input"; nName.maxLength = 40; nName.placeholder = "Nama kategori baru";
    const nColor = colorSelect("gray");
    const nBtn = h("button", "chip-btn small primary", "＋ Tambah");
    nBtn.type = "button";
    nBtn.addEventListener("click", () => {
      if (!nName.value.trim()) { nName.focus(); return; }
      addCategory(nName.value, nColor.value, nIcon.value);
      nName.value = ""; nIcon.value = "";
      renderRows();
    });
    addRow.appendChild(nIcon); addRow.appendChild(nName); addRow.appendChild(nColor); addRow.appendChild(nBtn);
    box.appendChild(addRow);

    const actions = h("div", "simple-dialog-actions");
    const close = h("button", "chip-btn small primary", "Selesai");
    close.type = "button";
    close.addEventListener("click", closeCatManager_);
    actions.appendChild(close);
    box.appendChild(actions);
    overlay.appendChild(box);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeCatManager_(); });
    document.body.appendChild(overlay);
  }

  // ------------------------------------------------------------
  //  Panel "🖍️ Penanda Saya"
  // ------------------------------------------------------------
  const ui_ = { cats: new Set(), type: "all", q: "", shown: PANEL_PAGE };
  function panelEl_() {
    let p = elById_("annoPanel");
    if (!p) {
      p = h("div", "notes-panel anno-panel");
      p.id = "annoPanel";
      p.hidden = true;
      const anchor = elById_("notesPanel");
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(p, anchor.nextSibling);
      else document.body.appendChild(p);
    }
    return p;
  }
  function panelOpen_() { const p = elById_("annoPanel"); return !!(p && !p.hidden); }

  function showPanel() {
    if (isGuest_()) { if (typeof Guest !== "undefined" && Guest.showFeatureLocked) Guest.showFeatureLocked("Penanda & Stabilo"); return; }
    migrateLegacy_();
    if (typeof hideAllPanels === "function") hideAllPanels();
    panelEl_().hidden = false;
    if (typeof logActivity === "function") logActivity("Penanda Saya");
    renderPanel_();
  }

  function findVerse_(b, c, v, prefLang) {
    const langs = [prefLang, typeof currentLang !== "undefined" ? currentLang : null].filter(Boolean)
      .concat(Object.keys(typeof verseIndex !== "undefined" ? verseIndex : {}));
    for (const l of langs) {
      const arr = typeof getChapterVerses === "function" ? getChapterVerses(l, b, c) : [];
      const hit = arr.find((x) => x.verse === v);
      if (hit) return hit;
    }
    return null;
  }

  function openMark_(m) {
    let lang = m.t === "r" ? m.lang : null;
    const v = findVerse_(m.b, m.c, m.v, lang);
    if (!v) return;
    if (lang && typeof currentLang !== "undefined" && lang !== currentLang && typeof bookAvailableInLang === "function" && bookAvailableInLang(lang, m.b)) {
      currentLang = lang;
      const sel = typeof langSelectEl === "function" ? langSelectEl() : null;
      if (sel) sel.value = lang;
      try { buildSidebar(); } catch (e) { /* daftar kitab samping tidak wajib */ }
    }
    renderChapter(m.b, m.c, m.v);
  }

  function renderPanel_() {
    const panel = panelEl_();
    panel.innerHTML = "";
    panel.appendChild(h("h2", "", "🖍️ Penanda Saya"));
    const s = st_();
    const marks = Object.values(s.marks).filter((m) => !m.d && keepLive_(m.cats).length);
    const counts = {};
    marks.forEach((m) => keepLive_(m.cats).forEach((id) => { counts[id] = (counts[id] || 0) + 1; }));

    const bar = h("div", "anno-panel-bar");
    const search = document.createElement("input");
    search.type = "search";
    search.className = "anno-panel-search";
    search.placeholder = "Cari di tanda…";
    search.value = ui_.q;
    search.addEventListener("input", () => { ui_.q = search.value; ui_.shown = PANEL_PAGE; renderList(); });
    bar.appendChild(search);
    const typeSel = document.createElement("select");
    typeSel.className = "chip-select";
    [["all", "Semua jenis"], ["v", "Ayat penuh"], ["text", "Teks ayat"], ["note", "Catatan kaki"]].forEach(([v, l]) => { const o = h("option", "", l); o.value = v; typeSel.appendChild(o); });
    typeSel.value = ui_.type;
    typeSel.addEventListener("change", () => { ui_.type = typeSel.value; ui_.shown = PANEL_PAGE; renderList(); });
    bar.appendChild(typeSel);
    const manage = h("button", "chip-btn small", "🏷️ Kelola kategori");
    manage.type = "button";
    manage.addEventListener("click", openCategoryManager);
    bar.appendChild(manage);
    panel.appendChild(bar);

    const chips = h("div", "anno-panel-chips");
    const all = h("button", "anno-chip" + (ui_.cats.size ? "" : " on"), "Semua (" + marks.length + ")");
    all.type = "button";
    all.addEventListener("click", () => { ui_.cats.clear(); ui_.shown = PANEL_PAGE; renderPanel_(); });
    chips.appendChild(all);
    liveCats_().forEach((c) => {
      const on = ui_.cats.has(c.id);
      const chip = h("button", "anno-chip anno-chip-" + c.color + (on ? " on" : ""));
      chip.type = "button";
      chip.setAttribute("aria-pressed", on ? "true" : "false");
      chip.appendChild(h("span", "anno-chip-ico", c.icon || "●"));
      chip.appendChild(h("span", "anno-chip-name", c.name));
      chip.appendChild(h("span", "anno-chip-count", String(counts[c.id] || 0)));
      chip.addEventListener("click", () => { if (on) ui_.cats.delete(c.id); else ui_.cats.add(c.id); ui_.shown = PANEL_PAGE; renderPanel_(); });
      chips.appendChild(chip);
    });
    panel.appendChild(chips);

    const listWrap = h("div", "anno-panel-list");
    panel.appendChild(listWrap);

    function renderList() {
      listWrap.innerHTML = "";
      const q = ui_.q.trim().toLowerCase();
      let items = marks.filter((m) => {
        if (ui_.cats.size && !keepLive_(m.cats).some((id) => ui_.cats.has(id))) return false;
        if (ui_.type === "v" && m.t !== "v") return false;
        if (ui_.type === "text" && !(m.t === "r" && m.on === "text")) return false;
        if (ui_.type === "note" && !(m.t === "r" && m.on === "note")) return false;
        if (q) {
          const v = findVerse_(m.b, m.c, m.v, m.lang);
          const hay = ((m.t === "r" ? m.q : (v ? v.text : "")) + " " + bookName_(m.b)).toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
      items.sort((a, b) => a.b - b.b || a.c - b.c || a.v - b.v || (a.t === b.t ? 0 : (a.t === "v" ? -1 : 1)) || (a.s || 0) - (b.s || 0));
      if (!items.length) {
        listWrap.appendChild(h("p", "media-empty", marks.length ? "Tidak ada tanda yang cocok dengan saringan ini." : "Belum ada tanda. Ketuk nomor ayat saat membaca untuk memilih kategori, atau blok teks di ayat/catatan kaki."));
        return;
      }
      items.slice(0, ui_.shown).forEach((m) => {
        const v = findVerse_(m.b, m.c, m.v, m.lang);
        const row = h("div", "anno-row");
        const open = h("button", "result-item anno-row-open");
        open.type = "button";
        const ref = h("div", "result-ref", bookName_(m.b) + " " + m.c + ":" + m.v + (m.t === "r" ? "  ·  " + (m.on === "note" ? "Catatan kaki" : "Teks") + " (" + langLabel_(m.lang) + ")" : ""));
        const text = h("div", "result-text", m.t === "r" ? "“" + m.q + "”" : (v ? v.text : ""));
        open.appendChild(ref);
        open.appendChild(text);
        open.addEventListener("click", () => openMark_(m));
        row.appendChild(open);
        const tags = h("div", "anno-row-tags");
        keepLive_(m.cats).forEach((id) => {
          const c = cat_(id);
          const t = h("span", "anno-tag anno-chip-" + c.color, (c.icon ? c.icon + " " : "") + c.name);
          tags.appendChild(t);
        });
        row.appendChild(tags);
        const acts = h("div", "anno-row-actions");
        const edit = h("button", "chip-btn small", "🏷️ Kategori");
        edit.type = "button";
        edit.addEventListener("click", (e) => {
          e.stopPropagation();
          openRowPopup_(m, edit);
        });
        const del = h("button", "chip-btn small", "🗑 Hapus");
        del.type = "button";
        del.addEventListener("click", () => { if (confirm("Hapus tanda ini?")) removeMark_(m.id); });
        acts.appendChild(edit);
        acts.appendChild(del);
        row.appendChild(acts);
        listWrap.appendChild(row);
      });
      if (items.length > ui_.shown) {
        const more = h("button", "chip-btn small", "Tampilkan " + Math.min(PANEL_PAGE, items.length - ui_.shown) + " lagi (" + (items.length - ui_.shown) + " tersisa)");
        more.type = "button";
        more.addEventListener("click", () => { ui_.shown += PANEL_PAGE; renderList(); });
        listWrap.appendChild(more);
      }
    }
    renderList();
  }

  // Popup kategori untuk satu baris di panel (ayat penuh atau tanda teks).
  function openRowPopup_(m, anchor) {
    closePopup_();
    const pop = h("div", "anno-popup");
    pop.setAttribute("role", "dialog");
    pop.appendChild(h("div", "anno-popup-title", "🏷️ Kategori tanda"));
    const list = h("div", "anno-cat-list");
    const active = new Set(keepLive_(m.cats));
    liveCats_().forEach((c) => list.appendChild(catRow_(c, active.has(c.id), () => {
      if (m.t === "v") return toggleVerseCat(m.b, m.c, m.v, c.id);
      toggleRangeCat_(m.id, c.id);
      return keepLive_((st_().marks[m.id] || {}).cats).includes(c.id);
    })));
    pop.appendChild(list);
    placePopup_(pop, anchor.getBoundingClientRect());
    popup_ = pop;
    setTimeout(() => {
      document.addEventListener("click", onDocClick_, true);
      document.addEventListener("keydown", onEsc_, true);
    }, 0);
  }

  // ------------------------------------------------------------
  //  Sinkron ke server (tab "Annotations" di Code.gs)
  // ------------------------------------------------------------
  let flushTimer_ = null;
  function scheduleFlush_() {
    clearTimeout(flushTimer_);
    flushTimer_ = setTimeout(() => { flush(); }, 2500);
  }
  function toItem_(id) {
    const s = st_();
    if (id.indexOf("cat:") === 0) {
      const c = s.cats.find((x) => "cat:" + x.id === id);
      return c ? { id, json: JSON.stringify(c), updatedAt: c.u, deleted: !!c.d } : null;
    }
    const m = s.marks[id];
    return m ? { id, json: JSON.stringify(m), updatedAt: m.u, deleted: !!m.d } : null;
  }
  async function flush() {
    if (!user_() || typeof Sync === "undefined" || typeof Sync.enabled !== "function" || !Sync.enabled()) return false;
    const ids = pending_();
    if (!ids.length) return true;
    const batch = ids.slice(0, 200);
    const items = batch.map(toItem_).filter(Boolean);
    try {
      const r = await Sync._post({ type: "anno_push", username: user_(), items });
      if (r && r.ok) {
        const left = pending_().filter((id) => !batch.includes(id));
        savePending_(left);
        if (left.length) scheduleFlush_();
        return true;
      }
    } catch (e) { /* offline: tetap antre, dicoba lagi nanti */ }
    return false;
  }

  function mergeRemote_(items) {
    const s = st_();
    let changedAny = false;
    items.forEach((it) => {
      let obj = null;
      try { obj = JSON.parse(it.json); } catch (e) { obj = null; }
      if (!obj || !it.id) return;
      obj.u = it.updatedAt || obj.u || EPOCH;
      obj.d = it.deleted ? 1 : 0;
      if (it.id.indexOf("cat:") === 0) {
        const i = s.cats.findIndex((c) => "cat:" + c.id === it.id);
        if (i === -1) { s.cats.push(obj); changedAny = true; }
        else if (new Date(obj.u) > new Date(s.cats[i].u || EPOCH)) { s.cats[i] = obj; changedAny = true; }
      } else {
        const cur = s.marks[it.id];
        if (!cur || new Date(obj.u) > new Date(cur.u || EPOCH)) { s.marks[it.id] = obj; changedAny = true; }
      }
    });
    return changedAny;
  }

  // Tarik dari server, gabungkan (yang UpdatedAt-nya lebih baru menang).
  async function pullRemote() {
    if (!user_() || typeof Sync === "undefined" || typeof Sync.enabled !== "function" || !Sync.enabled()) return false;
    try {
      const s = st_();
      const r = await Sync._get({ type: "anno_pull", username: user_(), since: s.syncedAt || "" });
      if (!r || !r.ok || !Array.isArray(r.items)) return false;
      const changedAny = mergeRemote_(r.items);
      // Titik awal tarikan berikutnya = UpdatedAt terbaru yang terlihat, mundur 10 menit
      // (jam perangkat bisa beda tipis dengan server; memproses ulang aman karena hasilnya sama).
      let maxU = s.syncedAt || "";
      r.items.forEach((it) => { if (it.updatedAt && it.updatedAt > maxU) maxU = it.updatedAt; });
      if (maxU) s.syncedAt = new Date(new Date(maxU).getTime() - 600000).toISOString();
      pruneTombstones_();
      save_();
      if (changedAny) { rev_++; decorateAll_(); renderFilterBar_(); if (panelOpen_()) renderPanel_(); }
      return changedAny;
    } catch (e) {
      return false;
    }
  }

  // ------------------------------------------------------------
  //  Pemasangan: pengamat DOM, klik pada tanda, menu
  // ------------------------------------------------------------
  let observer_ = null;
  function init() {
    const verses = elById_("readerVerses");
    if (verses && typeof MutationObserver !== "undefined" && !observer_) {
      observer_ = new MutationObserver((muts) => {
        if (decorating_) return;
        const added = muts.some((m) => Array.from(m.addedNodes).some((n) => n.nodeType === 1 && (n.classList.contains("verse-block") || (n.querySelector && n.querySelector(".verse-block")))));
        if (!added) return;
        if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => { migrateLegacy_(); decorateAll_(); renderFilterBar_(); });
        else { migrateLegacy_(); decorateAll_(); renderFilterBar_(); }
      });
      observer_.observe(verses, { childList: true, subtree: true });
      verses.addEventListener("click", (e) => {
        const mk = e.target.closest && e.target.closest("mark.anno-mark");
        if (!mk || isGuest_()) return;
        if (mk.closest(".footnote-marker, .footnote-marker-word")) return; // biarkan buka/tutup catatan kaki
        let sel = null;
        try { sel = window.getSelection(); } catch (err) { sel = null; }
        if (sel && !sel.isCollapsed) return;
        e.stopPropagation();
        openMarkPopup(mk);
      }, true);
    }
    let selTimer = null;
    document.addEventListener("selectionchange", () => { clearTimeout(selTimer); selTimer = setTimeout(updateSelBar_, 220); });
    const btn = elById_("annoMenuBtn");
    if (btn) {
      btn.addEventListener("click", () => {
        const mm = elById_("moreMenu");
        if (mm) mm.hidden = true;
        showPanel();
        if (typeof closeSidebarOnMobile === "function") closeSidebarOnMobile();
      });
    }
  }

  const api = {
    init, showPanel, openVersePopup, openCategoryManager, decorate: decorateAll_, renderFilterBar: renderFilterBar_,
    pullRemote, flush, registerVerseAction,
    getCategories: () => liveCats_().slice(),
    addCategory, updateCategory, deleteCategory,
    verseCategories: verseCatIds, toggleVerseCat, clearVerse,
    toggleHidden, setOnly,
    _test: {
      st_, prefs_, pending_, resolve_, containerText_, offsetOf_, wrapRange_, unwrapMarks_, decorateBlock_, addRange_, rangeInfo_,
      mergeRemote_, migrateLegacy_, toItem_, countsFor_, removeMark_, toggleRangeCat_, updateSelBar_, applySelection_, openMarkPopup,
      reset() { S = null; SU = null; rev_++; }, marks: () => st_().marks,
    },
  };
  if (typeof window !== "undefined") window.Anno = api;
  else if (typeof globalThis !== "undefined") globalThis.Anno = api;
})();
