// ============================================================
//  📚 RENCANA BACA MULTI-JALUR  (BARU 20 Sep 2026, permintaan operator)
//
//  Latar belakang: Rencana Baca lama (js/plans.js + renderPlanDetail() di
//  js/app.js) cuma bisa SATU rencana per pengguna, centangnya per hari,
//  dan tombol hari hanya membuka pasal PERTAMA. Akibatnya tidak bisa
//  membuat "Perjanjian Lama 1 tahun + Perjanjian Baru 1 tahun" sekaligus
//  dalam satu hari, dan hari yang isinya beberapa pasal tidak punya cara
//  membuka pasal ke-2 dst.
//
//  Modul ini MENAMBAH (tidak mengubah/menghapus rencana lama):
//   - Satu rencana = beberapa JALUR. Tiap jalur punya cakupan (PL / PB /
//     Seluruh Alkitab), durasi, tanggal mulai, pembagian (per ayat / per
//     pasal utuh), dan BAHASA sendiri.
//   - Tiap jalur menampilkan bacaan hari ini sebagai kartu; tiap potongan
//     bacaan adalah tombol yang LANGSUNG membuka bacaannya (dalam bahasa
//     jalur itu). Centang cukup PER HARI PER JALUR (bukan per potongan).
//   - Pilihan "bacaan lama mau diselesaikan atau tidak" tetap ada, PER
//     JALUR: kalau tidak diselesaikan, hari yang terlewat masuk daftar
//     "⏳ Belum dibaca" dan bisa dicentang sendiri-sendiri.
//
//  Penyimpanan: yang disimpan hanya DEFINISI jalur + centang (string
//  "0"/"1" per hari, sangat kecil). JADWAL bacaan tidak disimpan -- dibangun
//  ulang dari definisi (lihat buildSchedule_), jadi tidak mungkin menabrak
//  batas 50.000 karakter/sel Google Sheets (pelajaran dari bug lama, lihat
//  toRemoteSafePlan_() di js/plans.js).
//    - Lokal : localStorage "bible_plan_multi_v1_<username>"
//    - Server: dikirim lewat Sync.pushProgress() yang SUDAH ADA, memakai
//              "<username>#multi" sebagai kunci baris di sheet Progress ->
//              TIDAK PERLU mengubah/deploy ulang apps-script/Code.gs, dan
//              TIDAK menyentuh baris rencana lama milik username yang sama.
//
//  Modul ini sengaja memakai fungsi/variabel global app.js hanya saat
//  DIPANGGIL (bukan saat dimuat), jadi urutan <script> tidak menjadi
//  masalah: renderChapter, bookAvailableInLang, showLangUnavailable,
//  getChaptersForBook, getChapterVerses, referenceLangForPlans,
//  renderPlanPanel, closeSidebarOnMobile, buildSidebar, langSelectEl,
//  currentLang, currentUser, verseIndex, BOOKS, CONFIG.
// ============================================================
(function () {
  "use strict";

  const STORAGE_PREFIX = "bible_plan_multi_v1_";
  const REMOTE_SUFFIX = "#multi";
  const REMOTE_PLAN_ID = "multi_v1";
  const MS_PER_DAY = 86400000;
  const ALL_DAYS_INITIAL_EXTRA = 14; // "Semua hari": tampil sampai hari ini + sekian hari ke depan dulu
  const BACKLOG_PAGE = 20;
  // Tombol melayang "✅ Tandai selesai" di layar baca (muncul setelah membuka
  // bacaan dari rencana). Ubah ke false kalau ingin dimatikan.
  const READ_BAR_ENABLED = true;

  const SCOPE_LABELS = { PL: "Perjanjian Lama", PB: "Perjanjian Baru", ALL: "Seluruh Alkitab" };
  const DURATION_OPTIONS = [
    { days: 30, label: "1 bulan (30 hari)" },
    { days: 90, label: "3 bulan (90 hari)" },
    { days: 180, label: "6 bulan (180 hari)" },
    { days: 365, label: "1 tahun (365 hari)" },
    { days: 730, label: "2 tahun (730 hari)" },
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

  function midnight_(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function fmtDate_(d) {
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  }
  function fmtDateLong_(d) {
    return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  function toInputDate_(d) {
    const p = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }
  function fromInputDate_(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  function durLabel_(days) {
    if (days === 30) return "1 bulan";
    if (days === 90) return "3 bulan";
    if (days === 180) return "6 bulan";
    if (days === 365) return "1 tahun";
    if (days === 730) return "2 tahun";
    return days + " hari";
  }
  function trackLabel_(scope, days) {
    return (SCOPE_LABELS[scope] || SCOPE_LABELS.ALL) + " dalam " + durLabel_(days);
  }
  function langLabel_(code) {
    const list = (typeof CONFIG !== "undefined" && CONFIG.LANGUAGES) || [];
    const f = list.find((l) => l.code === code);
    return f ? f.label : code;
  }

  // ------------------------------------------------------------
  //  Centang per hari: string "0"/"1" sepanjang jumlah hari
  // ------------------------------------------------------------
  function normalizeTrack_(t) {
    t.days = Math.max(1, Math.floor(Number(t.days) || 1));
    if (!SCOPE_LABELS[t.scope]) t.scope = "ALL";
    if (t.mode !== "pasal") t.mode = "ayat";
    if (typeof t.lang !== "string") t.lang = "";
    if (!t.label) t.label = trackLabel_(t.scope, t.days);
    if (!t.id) t.id = "t_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    let d = typeof t.done === "string" ? t.done.replace(/[^01]/g, "0") : "";
    if (d.length < t.days) d += "0".repeat(t.days - d.length);
    if (d.length > t.days) d = d.slice(0, t.days);
    t.done = d;
    return t;
  }
  function doneGet_(t, i) {
    return t.done.charAt(i) === "1";
  }
  function doneSet_(t, i, v) {
    if (i < 0 || i >= t.days) return;
    t.done = t.done.slice(0, i) + (v ? "1" : "0") + t.done.slice(i + 1);
  }
  function doneCount_(t) {
    let c = 0;
    for (let i = 0; i < t.done.length; i++) if (t.done.charAt(i) === "1") c++;
    return c;
  }

  // ------------------------------------------------------------
  //  Hari ke-berapa "hari ini" untuk sebuah jalur
  // ------------------------------------------------------------
  function startOf_(t) {
    const d = new Date(t.startDate);
    return midnight_(isNaN(d.getTime()) ? new Date() : d);
  }
  function dayDiff_(t, now) {
    const today = midnight_(now || new Date());
    return Math.round((today - startOf_(t)) / MS_PER_DAY);
  }
  // notStarted: tanggal mulai masih di depan. pastEnd: masa jadwal sudah lewat.
  function todayInfo_(t, now) {
    const diff = dayDiff_(t, now);
    return {
      diff,
      idx: Math.min(Math.max(diff, 0), t.days - 1),
      notStarted: diff < 0,
      pastEnd: diff >= t.days,
    };
  }
  function dateForIdx_(t, idx) {
    const s = startOf_(t);
    return new Date(s.getFullYear(), s.getMonth(), s.getDate() + idx);
  }
  // Berapa hari yang sudah lewat (dipotong maksimal days-1 supaya selalu
  // tersisa 1 hari yang belum tercentang) -- SAMA seperti elapsedPlanDays_()
  // di js/app.js untuk rencana lama.
  function elapsedDays_(days, startDate, now) {
    const a = midnight_(startDate);
    const b = midnight_(now || new Date());
    const elapsed = Math.max(0, Math.round((b - a) / MS_PER_DAY));
    return Math.min(elapsed, Math.max(0, days - 1));
  }
  function catchupDone_(days, startDate, mark, now) {
    const n = mark ? elapsedDays_(days, startDate, now) : 0;
    return "1".repeat(n) + "0".repeat(days - n);
  }

  // ------------------------------------------------------------
  //  JADWAL: dibangun ulang dari definisi jalur (tidak disimpan)
  // ------------------------------------------------------------
  // chapters: [{ bookNum, chapter, verses: [nomor ayat, ...] }] berurutan.
  // Hasil: array sepanjang `days`, tiap elemen = daftar potongan
  // { bookNum, chapter, vStart, vEnd, fullStart, fullEnd } (vStart/vEnd = null
  // untuk mode "pasal").
  function buildSchedule_(chapters, days, mode) {
    const schedule = [];
    if (!chapters.length) {
      for (let d = 0; d < days; d++) schedule.push([]);
      return schedule;
    }
    if (mode === "pasal") {
      const n = chapters.length;
      for (let d = 0; d < days; d++) {
        const a = Math.floor((d * n) / days);
        const b = Math.floor(((d + 1) * n) / days);
        schedule.push(chapters.slice(a, b).map((c) => ({
          bookNum: c.bookNum, chapter: c.chapter, vStart: null, vEnd: null, fullStart: true, fullEnd: true,
        })));
      }
      return schedule;
    }
    // Mode "ayat": bagi RATA berdasarkan jumlah ayat, sehingga tiap hari
    // hampir sama banyak dan tidak ada hari kosong (kecuali durasi lebih
    // banyak dari jumlah ayat).
    const counts = chapters.map((c) => c.verses.length);
    const starts = [];
    let total = 0;
    counts.forEach((c) => { starts.push(total); total += c; });
    let ci = 0;
    for (let d = 0; d < days; d++) {
      const a = Math.floor((d * total) / days);
      const b = Math.floor(((d + 1) * total) / days);
      const segs = [];
      while (ci < chapters.length && starts[ci] + counts[ci] <= a) ci++;
      let pos = a;
      let j = ci;
      while (pos < b && j < chapters.length) {
        const chStart = starts[j];
        const chEnd = chStart + counts[j];
        const takeEnd = Math.min(b, chEnd);
        const i1 = pos - chStart;
        const i2 = takeEnd - chStart - 1;
        const c = chapters[j];
        segs.push({
          bookNum: c.bookNum, chapter: c.chapter,
          vStart: c.verses[i1], vEnd: c.verses[i2],
          fullStart: i1 === 0, fullEnd: i2 === counts[j] - 1,
        });
        pos = takeEnd;
        if (pos >= chEnd) j++;
      }
      schedule.push(segs);
    }
    return schedule;
  }

  function refLang_() {
    try {
      if (typeof referenceLangForPlans === "function") return referenceLangForPlans();
    } catch (e) { /* jatuh ke bawah */ }
    return typeof currentLang !== "undefined" ? currentLang : null;
  }

  function collectChapters_(scope, lang) {
    const out = [];
    if (!lang || typeof BOOKS === "undefined") return out;
    BOOKS.forEach((b) => {
      if (scope !== "ALL" && b.testament !== scope) return;
      getChaptersForBook(lang, b.num).forEach((ch) => {
        const vs = getChapterVerses(lang, b.num, ch).map((v) => v.verse);
        if (vs.length) out.push({ bookNum: b.num, chapter: ch, verses: vs });
      });
    });
    return out;
  }

  const scheduleCache_ = new Map();
  function getSchedule_(t) {
    const lang = refLang_();
    const key = [t.scope, t.days, t.mode, lang].join("|");
    if (scheduleCache_.has(key)) return scheduleCache_.get(key);
    const chapters = collectChapters_(t.scope, lang);
    const sched = buildSchedule_(chapters, t.days, t.mode);
    if (chapters.length) scheduleCache_.set(key, sched); // data belum dimuat -> jangan di-cache
    return sched;
  }

  function bookName_(num) {
    const b = (typeof BOOKS !== "undefined") ? BOOKS.find((x) => x.num === num) : null;
    return b ? b.name : "";
  }
  // Label SATU potongan (tombol), mis. "Pengkotbah 1:1–18" atau "Pengkotbah 1".
  function segLabel_(seg) {
    const n = bookName_(seg.bookNum);
    if (seg.vStart == null) return n + " " + seg.chapter;
    return seg.vStart === seg.vEnd
      ? n + " " + seg.chapter + ":" + seg.vStart
      : n + " " + seg.chapter + ":" + seg.vStart + "\u2013" + seg.vEnd;
  }
  // Label RINGKAS satu hari, mis. "Pengkotbah 1–5:9" atau "Galatia 5:16–6:18".
  function dayLabel_(segs) {
    if (!segs || !segs.length) return "Tidak ada bacaan (hari istirahat)";
    const groups = [];
    segs.forEach((s) => {
      const g = groups[groups.length - 1];
      if (g && g[0].bookNum === s.bookNum) g.push(s); else groups.push([s]);
    });
    return groups.map((g) => {
      const f = g[0];
      const l = g[g.length - 1];
      const n = bookName_(f.bookNum);
      if (f.vStart == null) {
        return f.chapter === l.chapter ? n + " " + f.chapter : n + " " + f.chapter + "\u2013" + l.chapter;
      }
      if (f.chapter === l.chapter) {
        return (f.fullStart && l.fullEnd) ? n + " " + f.chapter : segLabel_({ bookNum: f.bookNum, chapter: f.chapter, vStart: f.vStart, vEnd: l.vEnd });
      }
      const left = f.fullStart ? String(f.chapter) : f.chapter + ":" + f.vStart;
      const right = l.fullEnd ? String(l.chapter) : l.chapter + ":" + l.vEnd;
      return n + " " + left + "\u2013" + right;
    }).join("; ");
  }

  // ------------------------------------------------------------
  //  Penyimpanan (lokal + sinkron lewat Sync.pushProgress yang sudah ada)
  // ------------------------------------------------------------
  function storageKey_(username) {
    return STORAGE_PREFIX + (username || "guest");
  }
  function load(username) {
    try {
      const raw = localStorage.getItem(storageKey_(username));
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (!p || !Array.isArray(p.tracks) || !p.tracks.length) return null;
      p.tracks.forEach(normalizeTrack_);
      return p;
    } catch (e) {
      return null;
    }
  }
  function pushRemote_(username, plan) {
    if (!username || typeof Sync === "undefined" || typeof Sync.enabled !== "function" || !Sync.enabled()) return;
    try {
      Sync.pushProgress(username + REMOTE_SUFFIX, {
        planId: REMOTE_PLAN_ID,
        label: "Rencana Multi-Jalur",
        days: 0,
        startDate: "",
        schedule: plan.tracks, // definisi + string centang: kecil, aman dari batas 50.000 karakter
        completed: [],
        updatedAt: plan.updatedAt,
      });
    } catch (e) { /* sinkron gagal tidak boleh mengganggu pemakaian */ }
  }
  function save(username, plan) {
    plan.v = 1;
    plan.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(storageKey_(username), JSON.stringify(plan));
    } catch (e) {
      toast_("Gagal menyimpan rencana di perangkat ini (penyimpanan penuh?).");
    }
    pushRemote_(username, plan);
  }
  function clear(username) {
    localStorage.removeItem(storageKey_(username));
    if (username && typeof Sync !== "undefined" && typeof Sync.enabled === "function" && Sync.enabled()) {
      try {
        Sync.pushProgress(username + REMOTE_SUFFIX, { planId: "", label: "", days: 0, startDate: "", schedule: [], completed: [], updatedAt: new Date().toISOString() });
      } catch (e) { /* diabaikan */ }
    }
  }
  // Tarik versi terbaru dari server; yang paling baru (updatedAt) dipakai.
  async function refreshFromRemote(username) {
    if (!username || typeof Sync === "undefined" || typeof Sync.enabled !== "function" || !Sync.enabled()) return false;
    const remote = await Sync.pullProgress(username + REMOTE_SUFFIX);
    if (!remote || remote.planId !== REMOTE_PLAN_ID || !Array.isArray(remote.schedule) || !remote.schedule.length) return false;
    const local = load(username);
    if (!local || !local.updatedAt || new Date(remote.updatedAt) > new Date(local.updatedAt)) {
      const plan = { v: 1, updatedAt: remote.updatedAt, tracks: remote.schedule };
      plan.tracks.forEach(normalizeTrack_);
      localStorage.setItem(storageKey_(username), JSON.stringify(plan));
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------
  //  Notifikasi kecil & gambar ulang panel
  // ------------------------------------------------------------
  let toastTimer_ = null;
  function toast_(msg) {
    let t = document.getElementById("pmToast");
    if (!t) {
      t = h("div", "pm-toast");
      t.id = "pmToast";
      t.setAttribute("role", "status");
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer_);
    toastTimer_ = setTimeout(() => t.classList.remove("show"), 3500);
  }

  function scrollParent_(node) {
    let p = node && node.parentElement;
    while (p && p !== document.body) {
      const cs = getComputedStyle(p);
      if (/(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight) return p;
      p = p.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  }
  // Gambar ulang panel Rencana Baca TANPA loncat ke atas.
  function rerender_() {
    const panel = document.getElementById("planPanel");
    const sp = scrollParent_(panel);
    const top = sp ? sp.scrollTop : 0;
    renderPlanPanel();
    if (sp) sp.scrollTop = top;
  }
  function commit_(plan) {
    save(currentUser, plan);
    rerender_();
  }

  // Status buka/tutup <details> supaya tidak menutup sendiri tiap ada centang.
  const uiOpen_ = {};
  function bindDetails_(d, key, onFirstOpen) {
    d.open = !!uiOpen_[key];
    let built = false;
    const build = () => { if (!built && onFirstOpen) { built = true; onFirstOpen(); } };
    if (d.open) build();
    d.addEventListener("toggle", () => {
      uiOpen_[key] = d.open;
      if (d.open) build();
    });
  }

  // ------------------------------------------------------------
  //  Membuka bacaan (bahasa mengikuti jalur)
  // ------------------------------------------------------------
  function pickLang_(track, bookNum) {
    let lang = track.lang || currentLang;
    if (!bookAvailableInLang(lang, bookNum)) {
      if (lang !== currentLang && bookAvailableInLang(currentLang, bookNum)) {
        toast_("Kitab " + bookName_(bookNum) + " belum ada di " + langLabel_(lang) + ", dibuka dalam " + langLabel_(currentLang) + ".");
        lang = currentLang;
      } else {
        showLangUnavailable();
        return null;
      }
    }
    if (lang !== currentLang) {
      // Sengaja TIDAK menyimpan ke localStorage bahasa pilihan manual (lihat
      // initLanguageSelector() di js/app.js) -- ini perpindahan sementara
      // demi bacaan jalur ini saja, pilihan manual pengguna tidak tertimpa.
      currentLang = lang;
      const sel = typeof langSelectEl === "function" ? langSelectEl() : null;
      if (sel) sel.value = lang;
      const c1 = document.getElementById("columnLang1");
      if (c1) c1.value = lang;
      try { buildSidebar(); } catch (e) { /* daftar kitab samping tidak wajib */ }
    }
    return lang;
  }

  function openSegment_(track, idx, seg) {
    if (!pickLang_(track, seg.bookNum)) return;
    renderChapter(seg.bookNum, seg.chapter, seg.vStart == null ? undefined : seg.vStart);
    if (typeof closeSidebarOnMobile === "function") closeSidebarOnMobile();
    showReadBar_(track.id, idx);
  }

  // Bilah kecil "✅ Tandai selesai" di layar baca -- supaya alurnya baca ->
  // centang -> lanjut, tanpa harus kembali ke panel Rencana Baca.
  let readBarObserver_ = null;
  function removeReadBar_() {
    const b = document.getElementById("pmReadBar");
    if (b) b.remove();
    if (readBarObserver_) { readBarObserver_.disconnect(); readBarObserver_ = null; }
  }
  function showReadBar_(trackId, idx) {
    removeReadBar_();
    if (!READ_BAR_ENABLED) return;
    const plan = load(currentUser);
    const track = plan && plan.tracks.find((t) => t.id === trackId);
    if (!track || doneGet_(track, idx)) return;
    const bar = h("div", "pm-readbar");
    bar.id = "pmReadBar";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Tandai bacaan rencana selesai");
    bar.appendChild(h("span", "pm-readbar-text", track.label + ", Hari " + (idx + 1)));
    const ok = h("button", "chip-btn primary small", "✅ Tandai selesai");
    ok.type = "button";
    ok.addEventListener("click", () => {
      const fresh = load(currentUser);
      const t = fresh && fresh.tracks.find((x) => x.id === trackId);
      if (t) {
        doneSet_(t, idx, true);
        save(currentUser, fresh);
        toast_("Hari " + (idx + 1) + " (" + t.label + ") ditandai selesai.");
      }
      removeReadBar_();
    });
    const close = h("button", "pm-readbar-close", "✕");
    close.type = "button";
    close.setAttribute("aria-label", "Tutup");
    close.addEventListener("click", removeReadBar_);
    bar.appendChild(ok);
    bar.appendChild(close);
    document.body.appendChild(bar);
    const reader = document.getElementById("reader");
    if (reader && typeof MutationObserver !== "undefined") {
      readBarObserver_ = new MutationObserver(() => { if (reader.hidden) removeReadBar_(); });
      readBarObserver_.observe(reader, { attributes: true, attributeFilter: ["hidden"] });
    }
  }

  // ------------------------------------------------------------
  //  TAMPILAN: panel rencana
  // ------------------------------------------------------------
  function buildSegButtons_(track, idx, segs, small) {
    const wrap = h("div", "pm-segs" + (small ? " small" : ""));
    if (!segs.length) {
      wrap.appendChild(h("div", "pm-rest", "Tidak ada bacaan hari ini (hari istirahat)."));
      return wrap;
    }
    segs.forEach((seg) => {
      const b = h("button", "pm-seg");
      b.type = "button";
      b.appendChild(h("span", "pm-seg-ico", "📖"));
      b.appendChild(h("span", "pm-seg-txt", segLabel_(seg)));
      b.title = "Buka bacaan" + (track.lang ? " (" + langLabel_(track.lang) + ")" : "");
      b.addEventListener("click", () => openSegment_(track, idx, seg));
      wrap.appendChild(b);
    });
    return wrap;
  }

  function buildDayCheckbox_(plan, track, idx, disabled) {
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = doneGet_(track, idx);
    cb.disabled = !!disabled;
    cb.setAttribute("aria-label", "Sudah baca: " + track.label + ", Hari " + (idx + 1));
    cb.addEventListener("change", () => {
      doneSet_(track, idx, cb.checked);
      commit_(plan);
    });
    return cb;
  }

  function buildDayRow_(plan, track, idx, schedule, info) {
    const isToday = !info.notStarted && !info.pastEnd && idx === info.idx;
    const row = h("div", "pm-day-row" + (doneGet_(track, idx) ? " done" : "") + (isToday ? " is-today" : ""));
    const main = h("div", "pm-day-row-main");
    main.appendChild(buildDayCheckbox_(plan, track, idx, false));
    const meta = h("div", "pm-day-row-meta");
    const dt = dateForIdx_(track, idx);
    const line = h("div", "pm-day-row-line");
    line.appendChild(h("span", "pm-day-num", "Hari " + (idx + 1)));
    line.appendChild(h("span", "pm-day-date", fmtDate_(dt)));
    if (isToday) line.appendChild(h("span", "pm-today-tag", "Hari Ini"));
    meta.appendChild(line);
    meta.appendChild(h("div", "pm-day-reading", dayLabel_(schedule[idx])));
    main.appendChild(meta);
    row.appendChild(main);
    row.appendChild(buildSegButtons_(track, idx, schedule[idx] || [], true));
    return row;
  }

  function buildTrackCard_(plan, track) {
    const schedule = getSchedule_(track);
    const info = todayInfo_(track);
    const idx = info.idx;
    const done = doneCount_(track);
    const pct = Math.round((done / track.days) * 100);

    const card = h("section", "pm-card");

    // ---- kepala kartu (mirip contoh: judul + kotak centang hari ini) ----
    const head = h("div", "pm-card-head");
    const titleBox = h("div", "pm-card-titlebox");
    titleBox.appendChild(h("div", "pm-card-title", track.label));
    let metaText;
    if (info.notStarted) metaText = "Mulai " + fmtDate_(startOf_(track));
    else if (info.pastEnd) metaText = "Masa jadwal berakhir " + fmtDate_(dateForIdx_(track, track.days - 1));
    else metaText = "Hari " + (idx + 1) + " dari " + track.days.toLocaleString("id-ID") + " \u00b7 " + fmtDate_(dateForIdx_(track, idx));
    titleBox.appendChild(h("div", "pm-card-meta", metaText));
    head.appendChild(titleBox);
    if (!info.pastEnd) {
      const cb = buildDayCheckbox_(plan, track, idx, info.notStarted);
      cb.className = "pm-card-check";
      cb.setAttribute("aria-label", "Sudah baca hari ini: " + track.label);
      head.appendChild(cb);
    }
    card.appendChild(head);

    // ---- isi kartu: bacaan hari ini ----
    const body = h("div", "pm-card-body");
    if (info.pastEnd) {
      body.appendChild(h("div", "pm-reading", done >= track.days ? "🎉 Semua hari pada jalur ini sudah selesai dibaca." : "Masa jadwal sudah berakhir. Yang belum dibaca ada di daftar di bawah."));
    } else {
      if (info.notStarted) body.appendChild(h("div", "pm-note", "Belum dimulai. Ini pratinjau Hari 1."));
      body.appendChild(h("div", "pm-reading", dayLabel_(schedule[idx])));
      body.appendChild(buildSegButtons_(track, idx, schedule[idx] || [], false));
    }
    const chips = h("div", "pm-chips");
    chips.appendChild(h("span", "pm-chip", "🌐 " + (track.lang ? langLabel_(track.lang) : "Bahasa yang sedang aktif")));
    chips.appendChild(h("span", "pm-chip", track.mode === "pasal" ? "Per pasal utuh" : "Dibagi rata per ayat"));
    body.appendChild(chips);
    const bar = h("div", "plan-progress-track");
    const fill = h("div", "plan-progress-fill");
    fill.style.width = pct + "%";
    bar.appendChild(fill);
    body.appendChild(bar);
    body.appendChild(h("div", "plan-progress-text", done + " dari " + track.days + " hari selesai (" + pct + "%)"));

    // ---- ⏳ Belum dibaca (hari terlewat yang belum dicentang) ----
    const pastCount = info.notStarted ? 0 : Math.min(info.diff, track.days);
    const missed = [];
    for (let i = 0; i < pastCount; i++) if (!doneGet_(track, i)) missed.push(i);
    if (missed.length) {
      const d = h("details", "pm-details pm-backlog");
      const sum = h("summary", "", "⏳ Belum dibaca: " + missed.length.toLocaleString("id-ID") + " hari");
      d.appendChild(sum);
      const inner = h("div", "pm-details-body");
      d.appendChild(inner);
      let shown = 0;
      const more = h("button", "chip-btn small", "");
      more.type = "button";
      const listEl = h("div", "pm-day-list");
      const renderMore = () => {
        const next = Math.min(missed.length, shown + BACKLOG_PAGE);
        for (let k = shown; k < next; k++) listEl.appendChild(buildDayRow_(plan, track, missed[k], schedule, info));
        shown = next;
        more.hidden = shown >= missed.length;
        more.textContent = "Tampilkan " + Math.min(BACKLOG_PAGE, missed.length - shown) + " berikutnya";
      };
      const acts = h("div", "pm-actions-row");
      const markAll = h("button", "chip-btn small", "✅ Tandai semua yang terlewat sebagai selesai");
      markAll.type = "button";
      markAll.addEventListener("click", () => {
        if (!confirm("Tandai " + missed.length + " hari yang terlewat pada jalur ini sebagai selesai?")) return;
        missed.forEach((i) => doneSet_(track, i, true));
        commit_(plan);
      });
      acts.appendChild(markAll);
      inner.appendChild(acts);
      inner.appendChild(listEl);
      inner.appendChild(more);
      more.addEventListener("click", renderMore);
      bindDetails_(d, track.id + ":backlog", renderMore);
      body.appendChild(d);
    }

    // ---- 📅 Semua hari ----
    const all = h("details", "pm-details");
    all.appendChild(h("summary", "", "📅 Semua hari (" + track.days.toLocaleString("id-ID") + ")"));
    const allBody = h("div", "pm-details-body");
    all.appendChild(allBody);
    bindDetails_(all, track.id + ":all", () => {
      const limit = Math.min(track.days, (info.notStarted ? 0 : info.idx) + ALL_DAYS_INITIAL_EXTRA);
      const list = h("div", "pm-day-list");
      for (let i = 0; i < limit; i++) list.appendChild(buildDayRow_(plan, track, i, schedule, info));
      allBody.appendChild(list);
      if (limit < track.days) {
        const rest = h("button", "chip-btn small", "Tampilkan " + (track.days - limit).toLocaleString("id-ID") + " hari sisanya");
        rest.type = "button";
        rest.addEventListener("click", () => {
          for (let i = limit; i < track.days; i++) list.appendChild(buildDayRow_(plan, track, i, schedule, info));
          rest.remove();
        });
        allBody.appendChild(rest);
      }
    });
    body.appendChild(all);

    // ---- ⚙️ Atur jalur ----
    body.appendChild(buildTrackSettings_(plan, track));
    card.appendChild(body);
    return card;
  }

  function buildTrackSettings_(plan, track) {
    const d = h("details", "pm-details");
    d.appendChild(h("summary", "", "⚙️ Atur jalur ini"));
    const inner = h("div", "pm-details-body");
    d.appendChild(inner);

    // Bahasa (langsung tersimpan)
    const langField = h("label", "pm-field");
    langField.appendChild(h("span", "pm-field-label", "Bahasa bacaan"));
    const langSel = document.createElement("select");
    langSel.className = "chip-select";
    fillLangSelect_(langSel, track.lang);
    langSel.addEventListener("change", () => {
      track.lang = langSel.value;
      commit_(plan);
    });
    langField.appendChild(langSel);
    inner.appendChild(langField);

    // Tanggal mulai
    const dateField = h("label", "pm-field");
    dateField.appendChild(h("span", "pm-field-label", "Tanggal mulai"));
    const dateIn = document.createElement("input");
    dateIn.type = "date";
    dateIn.className = "plan-start-date-input";
    dateIn.value = toInputDate_(startOf_(track));
    dateField.appendChild(dateIn);
    inner.appendChild(dateField);
    const saveDate = h("button", "chip-btn small", "📅 Simpan tanggal mulai");
    saveDate.type = "button";
    saveDate.addEventListener("click", () => {
      const nd = fromInputDate_(dateIn.value);
      if (!nd) { alert("Pilih tanggal yang valid dulu."); return; }
      track.startDate = nd.toISOString();
      const n = elapsedDays_(track.days, nd);
      if (n > 0 && confirm("Tanggal ini sudah lewat " + n + " hari. Tandai hari-hari yang terlewat itu sebagai SELESAI?\n\nOK = tandai selesai (langsung lanjut dari hari ini)\nBatal = biarkan kosong (masuk daftar \"Belum dibaca\")")) {
        for (let i = 0; i < n; i++) doneSet_(track, i, true);
      }
      commit_(plan);
    });
    inner.appendChild(saveDate);

    const row = h("div", "pm-actions-row");
    const reset = h("button", "chip-btn small", "↩️ Kosongkan semua centang");
    reset.type = "button";
    reset.addEventListener("click", () => {
      if (!confirm("Kosongkan SEMUA centang jalur \"" + track.label + "\"? Tanggal mulai tidak berubah.")) return;
      track.done = "0".repeat(track.days);
      commit_(plan);
    });
    row.appendChild(reset);
    const del = h("button", "chip-btn small danger", "🗑️ Hapus jalur ini");
    del.type = "button";
    del.addEventListener("click", () => {
      if (!confirm("Hapus jalur \"" + track.label + "\" beserta centangnya?")) return;
      plan.tracks = plan.tracks.filter((t) => t.id !== track.id);
      if (!plan.tracks.length) { clear(currentUser); rerender_(); return; }
      commit_(plan);
    });
    row.appendChild(del);
    inner.appendChild(row);

    bindDetails_(d, track.id + ":more", null);
    return d;
  }

  function langOptions_() {
    const all = (typeof CONFIG !== "undefined" && CONFIG.LANGUAGES) || [];
    const avail = all.filter((l) => typeof verseIndex !== "undefined" && verseIndex[l.code]);
    return avail.length ? avail : all;
  }
  function fillLangSelect_(sel, current) {
    sel.innerHTML = "";
    const first = h("option", "", "Ikut bahasa yang sedang aktif");
    first.value = "";
    sel.appendChild(first);
    const opts = langOptions_().slice();
    if (current && !opts.some((l) => l.code === current)) opts.push({ code: current, label: langLabel_(current) });
    opts.forEach((l) => {
      const o = h("option", "", l.label);
      o.value = l.code;
      sel.appendChild(o);
    });
    sel.value = current || "";
  }

  // Titik masuk dari js/app.js -> renderPlanPanel()
  function renderDetail(container) {
    const plan = load(currentUser);
    if (!plan) return false;
    const now = new Date();

    const head = h("div", "plan-head pm-head");
    head.appendChild(h("div", "plan-head-title", "Rencana Multi-Jalur"));
    head.appendChild(h("div", "plan-head-meta", "📅 " + fmtDateLong_(now)));
    const active = plan.tracks.filter((t) => !todayInfo_(t, now).notStarted && !todayInfo_(t, now).pastEnd);
    const doneToday = active.filter((t) => doneGet_(t, todayInfo_(t, now).idx)).length;
    if (active.length) {
      const pct = Math.round((doneToday / active.length) * 100);
      const bar = h("div", "plan-progress-track");
      const fill = h("div", "plan-progress-fill");
      fill.style.width = pct + "%";
      bar.appendChild(fill);
      head.appendChild(bar);
      head.appendChild(h("div", "plan-progress-text",
        doneToday >= active.length
          ? "🎉 Semua bacaan hari ini sudah selesai (" + doneToday + " dari " + active.length + " jadwal)."
          : doneToday + " dari " + active.length + " jadwal hari ini selesai."));
    }
    container.appendChild(head);

    const actions = h("div", "plan-actions");
    const add = h("button", "chip-btn primary", "＋ Tambah jalur");
    add.type = "button";
    add.addEventListener("click", () => openCreator({ addTo: plan }));
    actions.appendChild(add);
    const change = h("button", "chip-btn", "Ganti Rencana");
    change.type = "button";
    change.addEventListener("click", () => {
      if (confirm("Ganti rencana baca? Semua jalur dan centang pada Rencana Multi-Jalur ini akan dihapus.")) {
        clear(currentUser);
        removeReadBar_();
        rerender_();
      }
    });
    actions.appendChild(change);
    container.appendChild(actions);

    plan.tracks.forEach((t) => container.appendChild(buildTrackCard_(plan, t)));
    return true;
  }

  // ------------------------------------------------------------
  //  DIALOG: buat rencana / tambah jalur
  // ------------------------------------------------------------
  function selectEl_(pairs, value) {
    const s = document.createElement("select");
    s.className = "chip-select";
    pairs.forEach(([v, label]) => {
      const o = h("option", "", label);
      o.value = v;
      s.appendChild(o);
    });
    s.value = value;
    return s;
  }
  function field_(label, control) {
    const w = h("label", "pm-field");
    w.appendChild(h("span", "pm-field-label", label));
    w.appendChild(control);
    return w;
  }

  function buildCreatorRow_(def, onRemove) {
    const row = h("div", "pm-row");
    const scopeSel = selectEl_([["PL", "Perjanjian Lama (PL)"], ["PB", "Perjanjian Baru (PB)"], ["ALL", "Seluruh Alkitab"]], def.scope);
    const daysSel = selectEl_(
      DURATION_OPTIONS.map((d) => [String(d.days), d.label]).concat([["custom", "Atur sendiri (jumlah hari)\u2026"]]),
      DURATION_OPTIONS.some((d) => d.days === def.days) ? String(def.days) : "custom"
    );
    const daysCustom = document.createElement("input");
    daysCustom.type = "number";
    daysCustom.min = "1";
    daysCustom.max = "3650";
    daysCustom.className = "plan-start-date-input";
    daysCustom.placeholder = "Jumlah hari";
    daysCustom.value = DURATION_OPTIONS.some((d) => d.days === def.days) ? "" : String(def.days);
    daysCustom.hidden = daysSel.value !== "custom";
    const modeSel = selectEl_([["ayat", "Dibagi rata per ayat (bisa berhenti di tengah pasal)"], ["pasal", "Per pasal utuh"]], def.mode);
    const langSel = document.createElement("select");
    langSel.className = "chip-select";
    fillLangSelect_(langSel, def.lang);
    const dateIn = document.createElement("input");
    dateIn.type = "date";
    dateIn.className = "plan-start-date-input";
    dateIn.value = toInputDate_(def.start);

    const catchWrap = h("label", "plan-start-catchup-label pm-catch");
    const catchChk = document.createElement("input");
    catchChk.type = "checkbox";
    catchChk.checked = true;
    const catchTxt = h("span", "");
    catchWrap.appendChild(catchChk);
    catchWrap.appendChild(catchTxt);

    const readDays = () => (daysSel.value === "custom" ? Math.floor(Number(daysCustom.value) || 0) : Number(daysSel.value));
    const refresh = () => {
      daysCustom.hidden = daysSel.value !== "custom";
      const d = fromInputDate_(dateIn.value);
      const days = readDays();
      const n = d && days > 0 ? elapsedDays_(days, d) : 0;
      catchWrap.hidden = n <= 0;
      catchTxt.textContent = "Bacaan yang sudah lewat (" + n.toLocaleString("id-ID") + " hari) langsung ditandai selesai, jadi mulai dari hari ini. " +
        "Kalau TIDAK dicentang, semuanya tetap kosong dan masuk daftar \"Belum dibaca\" yang bisa dicentang sendiri.";
    };
    [daysSel, dateIn, daysCustom].forEach((c) => c.addEventListener("input", refresh));
    daysSel.addEventListener("change", refresh);
    refresh();

    row.appendChild(field_("Bacaan", scopeSel));
    row.appendChild(field_("Durasi", daysSel));
    row.appendChild(daysCustom);
    row.appendChild(field_("Pembagian", modeSel));
    row.appendChild(field_("Bahasa", langSel));
    row.appendChild(field_("Tanggal mulai", dateIn));
    row.appendChild(catchWrap);
    if (onRemove) {
      const rm = h("button", "chip-btn small danger", "Hapus jalur ini");
      rm.type = "button";
      rm.addEventListener("click", () => onRemove(row));
      row.appendChild(rm);
    }
    return {
      el: row,
      setDate(d) { dateIn.value = toInputDate_(d); refresh(); },
      read() {
        const days = readDays();
        const start = fromInputDate_(dateIn.value);
        return { scope: scopeSel.value, days, mode: modeSel.value, lang: langSel.value, start, catchup: !catchWrap.hidden && catchChk.checked };
      },
    };
  }

  function closeCreator_() {
    const o = document.getElementById("pmCreateOverlay");
    if (o) o.remove();
  }

  function openCreator(opts) {
    opts = opts || {};
    const addTo = opts.addTo || null;
    closeCreator_();
    const today = midnight_(new Date());

    const overlay = h("div", "guest-modal-overlay pm-overlay");
    overlay.id = "pmCreateOverlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    const box = h("div", "guest-modal-box pm-create-box");
    box.appendChild(h("h2", "", addTo ? "Tambah Jalur Baca" : "📚 Rencana Baca Multi-Jalur"));
    box.appendChild(h("p", "pm-create-hint", "Satu hari bisa punya beberapa jadwal (jalur), masing-masing dengan durasi, tanggal mulai, dan bahasa sendiri. Centangnya per hari untuk tiap jalur."));

    const rows = [];
    const rowsBox = h("div", "pm-rows");
    const addRow = (def) => {
      const r = buildCreatorRow_(def, rows.length >= 1 || def.removable ? (rowEl) => {
        const i = rows.findIndex((x) => x.el === rowEl);
        if (i >= 0) rows.splice(i, 1);
        rowEl.remove();
      } : null);
      rows.push(r);
      rowsBox.appendChild(r.el);
    };
    const defaults = { mode: "ayat", lang: "", start: today };
    const clearRows = () => { rows.splice(0, rows.length); rowsBox.innerHTML = ""; };

    if (!addTo) {
      const presets = h("div", "plan-start-quick-row");
      const p1 = h("button", "chip-btn small", "📖 PL + PB, masing-masing 1 tahun");
      p1.type = "button";
      p1.addEventListener("click", () => {
        clearRows();
        addRow(Object.assign({}, defaults, { scope: "PL", days: 365 }));
        addRow(Object.assign({}, defaults, { scope: "PB", days: 365, removable: true }));
      });
      const p2 = h("button", "chip-btn small", "🗓️ Seluruh Alkitab 1 tahun (1 jalur)");
      p2.type = "button";
      p2.addEventListener("click", () => {
        clearRows();
        addRow(Object.assign({}, defaults, { scope: "ALL", days: 365 }));
      });
      presets.appendChild(p1);
      presets.appendChild(p2);
      box.appendChild(presets);
    }

    const quick = h("div", "plan-start-quick-row");
    const qToday = h("button", "chip-btn small", "📆 Semua mulai Hari Ini");
    qToday.type = "button";
    qToday.addEventListener("click", () => rows.forEach((r) => r.setDate(today)));
    const qJan = h("button", "chip-btn small", "🎊 Semua mulai 1 Januari Tahun Ini");
    qJan.type = "button";
    qJan.addEventListener("click", () => rows.forEach((r) => r.setDate(new Date(today.getFullYear(), 0, 1))));
    quick.appendChild(qToday);
    quick.appendChild(qJan);
    box.appendChild(quick);
    box.appendChild(rowsBox);

    if (addTo) addRow(Object.assign({}, defaults, { scope: "PL", days: 365 }));
    else {
      addRow(Object.assign({}, defaults, { scope: "PL", days: 365 }));
      addRow(Object.assign({}, defaults, { scope: "PB", days: 365, removable: true }));
    }

    const addMore = h("button", "chip-btn small", "＋ Tambah jalur lain");
    addMore.type = "button";
    addMore.addEventListener("click", () => addRow(Object.assign({}, defaults, { scope: "ALL", days: 365, removable: true })));
    box.appendChild(addMore);

    const btns = h("div", "pm-create-btns");
    const create = h("button", "guest-modal-btn primary", addTo ? "✅ Tambahkan" : "✅ Buat Rencana");
    create.type = "button";
    const cancel = h("button", "guest-modal-btn", "Batal");
    cancel.type = "button";
    cancel.addEventListener("click", closeCreator_);
    create.addEventListener("click", () => {
      const tracks = [];
      for (const r of rows) {
        const v = r.read();
        if (!v.start) { alert("Pilih tanggal mulai untuk semua jalur."); return; }
        if (!(v.days >= 1 && v.days <= 3650)) { alert("Jumlah hari harus antara 1 dan 3650."); return; }
        tracks.push(normalizeTrack_({
          scope: v.scope, days: v.days, mode: v.mode, lang: v.lang,
          startDate: v.start.toISOString(),
          done: catchupDone_(v.days, v.start, v.catchup),
        }));
      }
      if (!tracks.length) { alert("Tambahkan minimal satu jalur."); return; }
      const plan = addTo ? (load(currentUser) || { v: 1, tracks: [] }) : { v: 1, tracks: [] };
      tracks.forEach((t) => plan.tracks.push(t));
      save(currentUser, plan);
      closeCreator_();
      rerender_();
    });
    btns.appendChild(create);
    btns.appendChild(cancel);
    box.appendChild(btns);

    overlay.appendChild(box);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeCreator_(); });
    document.body.appendChild(overlay);
  }

  // ------------------------------------------------------------
  //  API publik (dipakai js/app.js) + bagian yang diuji di tests/
  // ------------------------------------------------------------
  const api = {
    load,
    save,
    clear,
    refreshFromRemote,
    renderDetail,
    openCreator,
    hasPlan(username) { return !!load(username); },
    _test: { buildSchedule_, dayLabel_, segLabel_, catchupDone_, normalizeTrack_, elapsedDays_, todayInfo_, doneGet_, doneSet_, doneCount_ },
  };
  if (typeof window !== "undefined") window.PlansMulti = api;
  else if (typeof globalThis !== "undefined") globalThis.PlansMulti = api;
})();
