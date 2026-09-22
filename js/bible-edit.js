// ============================================================
//  ✏️ EDIT AYAT ALKITAB OLEH ADMINISTRATOR  (BARU 21 Sep 2026, permintaan operator)
//
//  Administrator bisa mengedit teks ayat langsung dari aplikasi. Bagaimana
//  edit itu tetap ada setelah "Sinkronkan ulang / unduh Alkitab" lagi:
//   - Sheet Alkitab (CSV publik) TIDAK diubah sama sekali. Edit disimpan di
//     tab "BibleEdits" (apps-script/Code.gs, type "bible_edit").
//   - Setiap kali data Alkitab dimuat/diunduh (buildIndexes() di js/app.js
//     memanggil BibleEdit.onDataReady()), daftar edit DITERAPKAN di atas teks
//     hasil unduhan -- dari cadangan lokal seketika (juga saat offline), lalu
//     dimutakhirkan dari server. Setelah unduh ulang penuh, daftar edit
//     ditarik LENGKAP dari server, jadi hasilnya selalu sesuai edit administrator
//     terbaru, di semua perangkat (termasuk Tamu).
//   - Edit tersimpan di IndexedDB juga (LocalDB.bulkPut) supaya bagian aplikasi
//     yang membaca langsung dari penyimpanan lokal ikut melihatnya.
//   - Bisa DIKEMBALIKAN ke teks asli kapan saja (kolom OrigRaw di server).
//
//  Keamanan: server (verifyAdmin_ di Code.gs) memeriksa ULANG username +
//  password + level "administrator" -- bukan cuma tombolnya yang disembunyikan
//  di aplikasi -- karena edit ini terlihat oleh SEMUA pengguna. Password
//  diminta di kotak edit (disimpan di memori selama aplikasi terbuka saja,
//  tidak ditulis ke penyimpanan).
//
//  Yang bisa diedit: TEKS ayat (satu bahasa per baris data; mengedit ayat
//  Indonesia tidak mengubah ayat Inggrisnya). Tanda catatan kaki di dalam ayat
//  ditulis [[1a]], [[2]] dst di kotak edit -- biarkan tetap di tempatnya
//  supaya kata bercatatan kaki tetap bisa ditekan. ISI catatan kaki (kolom
//  Note, berupa HTML) belum bisa diedit dari aplikasi.
//
//  Memakai global app.js hanya saat DIPANGGIL: bibleData, verseById, LocalDB,
//  Sync, isAdministrator, currentUser, currentBookNum/currentChapter, renderChapter,
//  hideAllPanels, cleanVerseText (csv.js), extractFootnoteMarkedText (footnotes.js).
// ============================================================
(function () {
  "use strict";

  const CACHE_KEY = "bible_edits_v1";
  const REFRESH_MIN_MS = 10 * 60 * 1000;
  const MAX_RAW = 6000;

  let sessionPw_ = "";     // hanya di memori
  let lastRefreshAt_ = 0;
  let cache_ = null;

  function h(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  const elById_ = (id) => document.getElementById(id);
  const user_ = () => (typeof currentUser !== "undefined" && currentUser) ? currentUser : "";
  function isAdmin_() {
    return !!user_() && typeof isAdministrator === "function" && isAdministrator();
  }
  function syncOn_() {
    return typeof Sync !== "undefined" && typeof Sync.enabled === "function" && Sync.enabled();
  }
  function langLabel_(code) {
    const f = ((typeof CONFIG !== "undefined" && CONFIG.LANGUAGES) || []).find((l) => l.code === code);
    return f ? f.label : code;
  }
  function bookName_(num) {
    const b = (typeof BOOKS !== "undefined") ? BOOKS.find((x) => x.num === num) : null;
    return b ? b.name : "Kitab " + num;
  }

  // ------------------------------------------------------------
  //  Cadangan lokal daftar edit
  // ------------------------------------------------------------
  function cache_get() {
    if (cache_) return cache_;
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); } catch (e) { raw = null; }
    cache_ = (raw && raw.v === 1 && raw.edits) ? raw : { v: 1, edits: {}, syncedAt: "", lastSyncMeta: "" };
    return cache_;
  }
  function cache_save() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache_)); } catch (e) { /* penyimpanan penuh -- edit tetap ada di server */ }
  }

  // ------------------------------------------------------------
  //  Teks mentah <-> teks yang tampil di kotak edit
  //  Mentah = format sumber CSV: tanda catatan kaki  <FR><sup>1a</sup><Fr>
  //  Kotak edit = tanda ditulis [[1a]] supaya mudah dilihat & dijaga.
  // ------------------------------------------------------------
  function toRaw_(edited) {
    return String(edited).replace(/\[\[([^\]\[]{1,12})\]\]/g, "<FR><sup>$1</sup><Fr>");
  }
  function rawFromVerse_(v) {
    if (v.markedText && v.markedText.indexOf("\u0001") !== -1) {
      return v.markedText.replace(/\u0001([^\u0001]*)\u0001/g, "<FR><sup>$1</sup><Fr>");
    }
    return String(v.text || "");
  }
  function editorTextFromRaw_(raw) {
    return String(raw).replace(/<FR>\s*<sup>([^<]*)<\/sup>\s*<Fr>/gi, "[[$1]]");
  }
  function cleanOf_(raw) {
    return typeof cleanVerseText === "function" ? cleanVerseText(raw) : String(raw).replace(/<[^>]+>/g, " ").trim();
  }
  function markedOf_(raw) {
    return typeof extractFootnoteMarkedText === "function" ? extractFootnoteMarkedText(raw) : cleanOf_(raw);
  }

  // ------------------------------------------------------------
  //  Menerapkan edit ke data yang ada di memori
  // ------------------------------------------------------------
  function applyToBibleData(list) {
    const data = list || (typeof bibleData !== "undefined" ? bibleData : []);
    const edits = cache_get().edits;
    const ids = Object.keys(edits);
    if (!ids.length || !data.length) return [];
    const changed = [];
    data.forEach((v) => {
      const e = edits[v.id];
      if (!e) return;
      if (!e.reverted) {
        const t = cleanOf_(e.raw), m = markedOf_(e.raw);
        if (v.text !== t || v.markedText !== m) { v.text = t; v.markedText = m; changed.push(v); }
        v._edited = 1;
      } else if (e.orig && (v._edited || v.text === cleanOf_(e.raw))) {
        // Dikembalikan ke asli: hanya kalau teks sekarang memang hasil edit itu
        // (kalau Sheet Alkitab sendiri sudah dikoreksi belakangan, jangan ditimpa).
        const t = cleanOf_(e.orig), m = markedOf_(e.orig);
        if (v.text !== t || v.markedText !== m) { v.text = t; v.markedText = m; changed.push(v); }
        delete v._edited;
      }
    });
    return changed;
  }

  function persist_(changed) {
    if (!changed.length || typeof LocalDB === "undefined" || typeof LocalDB.bulkPut !== "function") return;
    try { Promise.resolve(LocalDB.bulkPut(changed)).catch(() => {}); } catch (e) { /* diabaikan */ }
  }

  function rerenderReader_() {
    try {
      const reader = elById_("reader");
      if (!reader || reader.hidden || typeof renderChapter !== "function" || !currentBookNum) return;
      renderChapter(currentBookNum, currentChapter, typeof highlightVerse !== "undefined" ? highlightVerse : null);
    } catch (e) { /* tampilan akan segar di pembukaan pasal berikutnya */ }
  }

  // Dipanggil buildIndexes() (js/app.js) setiap data Alkitab selesai dimuat/diunduh.
  function onDataReady() {
    const changed = applyToBibleData();
    persist_(changed);
    // Jangan menahan pemuatan: tarik daftar edit terbaru di latar belakang.
    Promise.resolve().then(() => refresh(false)).catch(() => {});
  }

  // Tarik daftar edit dari server. Setelah unduh ulang penuh (penanda "lastSync"
  // di IndexedDB berubah) yang ditarik SEMUANYA, bukan cuma yang baru.
  async function refresh(force) {
    if (!syncOn_()) return false;
    const c = cache_get();
    let meta = "";
    try { if (typeof LocalDB !== "undefined" && LocalDB.getMeta) meta = (await LocalDB.getMeta("lastSync")) || ""; } catch (e) { meta = ""; }
    const full = !!force || (meta && meta !== c.lastSyncMeta) || !c.syncedAt;
    if (!full && Date.now() - lastRefreshAt_ < REFRESH_MIN_MS) return false;
    lastRefreshAt_ = Date.now();
    let r = null;
    try { r = await Sync._get({ type: "bible_edits", since: full ? "" : c.syncedAt }); } catch (e) { return false; }
    if (!r || !r.ok || !Array.isArray(r.edits)) return false;
    r.edits.forEach((e) => {
      if (!e || !e.id) return;
      const cur = c.edits[e.id];
      if (!cur || String(e.at) >= String(cur.at)) c.edits[e.id] = e;
    });
    c.syncedAt = r.serverTime || c.syncedAt;
    c.lastSyncMeta = meta;
    cache_save();
    const changed = applyToBibleData();
    persist_(changed);
    if (changed.length) rerenderReader_();
    return true;
  }

  // ------------------------------------------------------------
  //  Kotak edit ayat
  // ------------------------------------------------------------
  function closeEditor_() { const o = elById_("bibleEditOverlay"); if (o) o.remove(); }

  function openEditor(v) {
    if (!isAdmin_()) { alert("Hanya administrator yang boleh mengedit ayat."); return; }
    closeEditor_();
    const c = cache_get();
    const existing = c.edits[v.id] && !c.edits[v.id].reverted ? c.edits[v.id] : null;
    const overlay = h("div", "simple-dialog-overlay bedit-overlay");
    overlay.id = "bibleEditOverlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    const box = h("div", "simple-dialog-box bedit-box");
    box.appendChild(h("h3", "", "✏️ Edit Ayat (Administrator)"));
    box.appendChild(h("div", "bedit-ref", bookName_(v.bookNumber) + " " + v.chapter + ":" + v.verse + "  ·  " + langLabel_(v.lang)));
    box.appendChild(h("p", "bedit-hint",
      "Perubahan berlaku untuk SEMUA pengguna dan tetap ada walau data Alkitab diunduh ulang. " +
      "Tanda catatan kaki ditulis [[1a]], [[2]] dst — biarkan di tempatnya supaya kata bercatatan kaki tetap bisa ditekan."));

    const ta = document.createElement("textarea");
    ta.className = "bedit-textarea";
    ta.rows = 6;
    ta.value = editorTextFromRaw_(rawFromVerse_(v));
    ta.setAttribute("aria-label", "Teks ayat");
    box.appendChild(ta);

    const origRaw = existing ? existing.orig : rawFromVerse_(v);
    const det = h("details", "bedit-orig");
    det.appendChild(h("summary", "", "Teks asli (sebelum diedit)"));
    det.appendChild(h("div", "bedit-orig-text", editorTextFromRaw_(origRaw)));
    box.appendChild(det);

    let pwInput = null;
    if (!sessionPw_) {
      const lab = h("label", "bedit-pw");
      lab.appendChild(h("span", "", "Password Anda (untuk konfirmasi)"));
      pwInput = document.createElement("input");
      pwInput.type = "password";
      pwInput.autocomplete = "current-password";
      lab.appendChild(pwInput);
      box.appendChild(lab);
    }
    const msg = h("div", "bedit-msg");
    msg.setAttribute("role", "status");
    box.appendChild(msg);

    const actions = h("div", "simple-dialog-actions bedit-actions");
    const cancel = h("button", "chip-btn small", "Batal");
    cancel.type = "button";
    cancel.addEventListener("click", closeEditor_);
    const save = h("button", "chip-btn small primary", "💾 Simpan");
    save.type = "button";
    actions.appendChild(cancel);
    if (existing) {
      const rev = h("button", "chip-btn small", "↩️ Kembalikan ke asli");
      rev.type = "button";
      rev.addEventListener("click", async () => {
        if (!confirm("Kembalikan ayat ini ke teks aslinya untuk semua pengguna?")) return;
        const pw = sessionPw_ || (pwInput && pwInput.value);
        if (!pw) { msg.textContent = "Isi password Anda dulu."; return; }
        rev.disabled = true;
        const res = await revert_(v, pw);
        rev.disabled = false;
        if (res.ok) { closeEditor_(); rerenderReader_(); } else msg.textContent = res.error;
      });
      actions.appendChild(rev);
    }
    actions.appendChild(save);
    box.appendChild(actions);

    save.addEventListener("click", async () => {
      const raw = toRaw_(ta.value).trim();
      if (!raw) { msg.textContent = "Teks ayat tidak boleh kosong."; return; }
      if (raw.length > MAX_RAW) { msg.textContent = "Teks terlalu panjang (maksimal " + MAX_RAW + " karakter)."; return; }
      if (raw.indexOf("\u0001") !== -1) { msg.textContent = "Teks mengandung karakter yang tidak diizinkan."; return; }
      if (raw === rawFromVerse_(v)) { msg.textContent = "Belum ada perubahan."; return; }
      const pw = sessionPw_ || (pwInput && pwInput.value);
      if (!pw) { msg.textContent = "Isi password Anda dulu."; return; }
      save.disabled = true;
      msg.textContent = "Menyimpan ke server…";
      const res = await saveEdit_(v, raw, pw, origRaw);
      save.disabled = false;
      if (res.ok) { closeEditor_(); rerenderReader_(); } else msg.textContent = res.error;
    });

    overlay.appendChild(box);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeEditor_(); });
    document.body.appendChild(overlay);
    ta.focus();
  }

  async function saveEdit_(v, raw, pw, origRaw) {
    if (!syncOn_()) return { ok: false, error: "Server sinkron belum dikonfigurasi (APPS_SCRIPT_URL), edit tidak bisa disimpan." };
    let r = null;
    try {
      r = await Sync._post({
        type: "bible_edit", username: user_(), password: pw,
        verseId: v.id, lang: v.lang, bookNumber: v.bookNumber, chapter: v.chapter, verse: v.verse,
        raw, orig: origRaw,
      });
    } catch (e) {
      return { ok: false, error: "Tidak bisa menghubungi server. Periksa sambungan internet lalu coba lagi." };
    }
    if (!r || !r.ok) {
      if (r && /password/i.test(String(r.error || ""))) sessionPw_ = "";
      return { ok: false, error: (r && r.error) || "Server menolak edit ini." };
    }
    sessionPw_ = pw;
    const c = cache_get();
    c.edits[v.id] = {
      id: v.id, lang: v.lang, bookNumber: v.bookNumber, chapter: v.chapter, verse: v.verse,
      raw, orig: r.orig || origRaw, by: user_(), at: r.editedAt || new Date().toISOString(), reverted: false,
    };
    cache_save();
    persist_(applyToBibleData());
    return { ok: true };
  }

  async function revert_(v, pw) {
    if (!syncOn_()) return { ok: false, error: "Server sinkron belum dikonfigurasi (APPS_SCRIPT_URL)." };
    let r = null;
    try {
      r = await Sync._post({ type: "bible_edit_revert", username: user_(), password: pw, verseId: v.id });
    } catch (e) {
      return { ok: false, error: "Tidak bisa menghubungi server. Periksa sambungan internet lalu coba lagi." };
    }
    if (!r || !r.ok) {
      if (r && /password/i.test(String(r.error || ""))) sessionPw_ = "";
      return { ok: false, error: (r && r.error) || "Server menolak." };
    }
    sessionPw_ = pw;
    const c = cache_get();
    const e = c.edits[v.id];
    if (e) { e.reverted = true; e.at = r.editedAt || new Date().toISOString(); e.by = user_(); }
    cache_save();
    persist_(applyToBibleData());
    return { ok: true };
  }

  // ------------------------------------------------------------
  //  Tombol ✏️ di tiap ayat (hanya administrator) + penanda ayat yang diedit
  // ------------------------------------------------------------
  function decorateBlock(block, v, textWrap) {
    if (!isAdmin_() || !block) return;
    const btn = h("button", "verse-copy-btn verse-edit-btn", "✏️");
    btn.type = "button";
    btn.title = "Edit ayat ini (administrator)";
    btn.setAttribute("aria-label", "Edit ayat ini (administrator)");
    btn.addEventListener("click", (e) => { e.stopPropagation(); openEditor(v); });
    block.appendChild(btn);
    if (v._edited) {
      block.classList.add("verse-edited");
      if (textWrap) textWrap.title = "Ayat ini sudah diedit administrator";
    }
  }

  // ------------------------------------------------------------
  //  Panel riwayat edit (administrator)
  // ------------------------------------------------------------
  function panelEl_() {
    let p = elById_("bibleEditPanel");
    if (!p) {
      p = h("div", "notes-panel bedit-panel");
      p.id = "bibleEditPanel";
      p.hidden = true;
      const anchor = elById_("annoPanel") || elById_("notesPanel");
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(p, anchor.nextSibling);
      else document.body.appendChild(p);
    }
    return p;
  }

  async function showHistoryPanel() {
    if (!isAdmin_()) return;
    if (typeof hideAllPanels === "function") hideAllPanels();
    const panel = panelEl_();
    panel.hidden = false;
    panel.innerHTML = "";
    panel.appendChild(h("h2", "", "✏️ Riwayat Edit Ayat"));
    panel.appendChild(h("p", "bedit-hint", "Semua ayat yang pernah diedit administrator. Sheet Alkitab asli tidak diubah; edit ini diterapkan di atas data unduhan."));
    const status = h("p", "media-empty", "Memuat daftar edit terbaru dari server…");
    panel.appendChild(status);
    await refresh(true).catch(() => {});
    status.remove();
    renderHistory_(panel);
  }

  function renderHistory_(panel) {
    const list = Object.values(cache_get().edits).sort((a, b) => String(b.at).localeCompare(String(a.at)));
    if (!list.length) {
      panel.appendChild(h("p", "media-empty", "Belum ada ayat yang diedit."));
      return;
    }
    const wrap = h("div", "bedit-list");
    list.forEach((e) => {
      const row = h("div", "bedit-row" + (e.reverted ? " reverted" : ""));
      row.appendChild(h("div", "result-ref", bookName_(e.bookNumber) + " " + e.chapter + ":" + e.verse + "  ·  " + langLabel_(e.lang) + (e.reverted ? "  ·  dikembalikan ke asli" : "")));
      row.appendChild(h("div", "announcement-meta", (e.by || "?") + " · " + (e.at ? new Date(e.at).toLocaleString("id-ID") : "")));
      const before = h("div", "bedit-before");
      before.appendChild(h("strong", "", "Asli: "));
      before.appendChild(document.createTextNode(cleanOf_(e.orig || "")));
      const after = h("div", "bedit-after");
      after.appendChild(h("strong", "", e.reverted ? "Sebelum dikembalikan: " : "Sekarang: "));
      after.appendChild(document.createTextNode(cleanOf_(e.raw || "")));
      row.appendChild(before);
      row.appendChild(after);
      const acts = h("div", "bedit-row-actions");
      const open = h("button", "chip-btn small", "📖 Buka");
      open.type = "button";
      open.addEventListener("click", () => {
        if (typeof currentLang !== "undefined" && e.lang && e.lang !== currentLang && typeof bookAvailableInLang === "function" && bookAvailableInLang(e.lang, e.bookNumber)) {
          currentLang = e.lang;
          const sel = typeof langSelectEl === "function" ? langSelectEl() : null;
          if (sel) sel.value = e.lang;
          try { buildSidebar(); } catch (err) { /* daftar kitab samping tidak wajib */ }
        }
        renderChapter(e.bookNumber, e.chapter, e.verse);
      });
      acts.appendChild(open);
      const v = typeof verseById !== "undefined" ? verseById[e.id] : null;
      if (v) {
        const edit = h("button", "chip-btn small", "✏️ Edit lagi");
        edit.type = "button";
        edit.addEventListener("click", () => openEditor(v));
        acts.appendChild(edit);
      }
      row.appendChild(acts);
      wrap.appendChild(row);
    });
    panel.appendChild(wrap);
  }

  // ------------------------------------------------------------
  //  Pemasangan
  // ------------------------------------------------------------
  function init() {
    const btn = elById_("bibleEditMenuBtn");
    if (btn) {
      btn.addEventListener("click", () => {
        const mm = elById_("moreMenu");
        if (mm) mm.hidden = true;
        showHistoryPanel();
        if (typeof closeSidebarOnMobile === "function") closeSidebarOnMobile();
      });
    }
    // Popup penanda (js/annotations.js) ikut menampilkan "✏️ Edit ayat" untuk administrator.
    if (typeof window !== "undefined" && window.Anno && typeof window.Anno.registerVerseAction === "function") {
      window.Anno.registerVerseAction((v) => (isAdmin_() ? { label: "✏️ Edit ayat", onClick: () => openEditor(v) } : null));
    }
  }

  const api = {
    init, onDataReady, refresh, openEditor, decorateBlock, showHistoryPanel, applyToBibleData,
    _test: {
      toRaw_, rawFromVerse_, editorTextFromRaw_, cache_get,
      reset() { cache_ = null; sessionPw_ = ""; lastRefreshAt_ = 0; },
      setSessionPw(p) { sessionPw_ = p; },
    },
  };
  if (typeof window !== "undefined") window.BibleEdit = api;
  else if (typeof globalThis !== "undefined") globalThis.BibleEdit = api;
})();
