// ============================================================
// js/media-bibleref.js  (BARU 16 Okt 2026)
// Pembaca kolom `BibleRef` Pustaka Media -- teks biasa dipisah titik-koma:
//
//     Kejadian 1:1-3; Yohanes 1:1; Mazmur 23
//
// Bentuk yang dikenal (per bagian, dipisah ";"):
//   Kejadian 1            seluruh pasal
//   Kejadian 1-2          beberapa pasal penuh
//   Kejadian 1:1          1 ayat
//   Kejadian 1:1-3        rentang ayat
//   Kejadian 1:1,3,5-7    campuran
//   Kejadian 1:1-2:3      lintas pasal
// Nama kitab dikenali oleh BOOK_ALIAS_INDEX (js/books.js) -- aturan SAMA
// dengan kotak cari Alkitab. Modul ini TIDAK butuh data ayat Alkitab untuk
// membaca teks; data ayat hanya dipakai untuk (a) memvalidasi nomor ayat,
// (b) mengubah AyatRef lama (Verse ID mentah) menjadi teks BibleRef.
// ============================================================
(function (root) {
  "use strict";

  var WHOLE_MAX = 9999;     // "sampai ayat terakhir"
  var WIDE_MIN_VERSES = 8;  // >= 8 ayat di 1 pasal dianggap "tema pasal" (rentang lebar)

  function bookIndex_() {
    return (typeof BOOK_ALIAS_INDEX !== "undefined" && BOOK_ALIAS_INDEX) || (root.BOOK_ALIAS_INDEX) || {};
  }

  function findBook_(namePart) {
    var idx = bookIndex_();
    var key = String(namePart || "").trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
    if (!key) return null;
    if (idx[key]) return idx[key];
    var noSpace = key.replace(/\s+/g, "");
    if (idx[noSpace]) return idx[noSpace];
    var cands = Object.keys(idx).filter(function (a) { return a.indexOf(key) === 0; });
    return cands.length ? idx[cands[0]] : null;
  }

  // Satu bagian (tanpa ";") -> { ok, raw, book, intervals:[{ch,from,to,whole}], error }
  function parseOne_(raw) {
    var s = String(raw || "").trim();
    var res = { ok: false, raw: s, book: null, intervals: [], error: "" };
    if (!s) { res.error = "kosong"; return res; }
    s = s.replace(/[–—]/g, "-").replace(/\s+/g, " ");
    var m = s.match(/^(.*?)(\d+)(?:\s*-\s*(\d+))?(?:\s*:\s*(.+))?$/);
    if (!m || !m[1].trim()) { res.error = "format tidak dikenali (contoh: Kejadian 1:1-3)"; return res; }
    var book = findBook_(m[1]);
    if (!book) { res.error = "nama kitab \"" + m[1].trim() + "\" tidak dikenali"; return res; }
    res.book = book;
    var ch = parseInt(m[2], 10);
    var chEnd = m[3] ? parseInt(m[3], 10) : null;
    var rest = m[4] ? m[4].trim() : "";
    var iv = res.intervals;
    if (ch < 1) { res.error = "nomor pasal harus 1 atau lebih"; return res; }

    if (!rest) {
      if (chEnd != null) {
        if (chEnd < ch) { res.error = "pasal akhir lebih kecil dari pasal awal"; return res; }
        if (chEnd - ch > 150) { res.error = "rentang pasal terlalu besar"; return res; }
        for (var c = ch; c <= chEnd; c++) iv.push({ ch: c, from: 1, to: WHOLE_MAX, whole: true });
      } else {
        iv.push({ ch: ch, from: 1, to: WHOLE_MAX, whole: true });
      }
      res.ok = true;
      return res;
    }
    if (chEnd != null) { res.error = "campuran rentang pasal & ayat tidak didukung (pakai 1:1-2:3)"; return res; }

    var pieces = rest.split(",");
    for (var i = 0; i < pieces.length; i++) {
      var p = pieces[i].trim();
      var a, b, c2, pm;
      if ((pm = p.match(/^(\d+)$/))) {
        a = parseInt(pm[1], 10);
        if (a < 1) { res.error = "nomor ayat harus 1 atau lebih"; return res; }
        iv.push({ ch: ch, from: a, to: a, whole: false });
      } else if ((pm = p.match(/^(\d+)\s*-\s*(\d+)$/))) {
        a = parseInt(pm[1], 10); b = parseInt(pm[2], 10);
        if (a < 1 || b < a) { res.error = "rentang ayat \"" + p + "\" terbalik"; return res; }
        iv.push({ ch: ch, from: a, to: b, whole: false });
      } else if ((pm = p.match(/^(\d+)\s*-\s*(\d+)\s*:\s*(\d+)$/))) {
        if (i !== pieces.length - 1 || pieces.length > 1) { res.error = "rentang lintas pasal harus berdiri sendiri"; return res; }
        a = parseInt(pm[1], 10); c2 = parseInt(pm[2], 10); b = parseInt(pm[3], 10);
        if (c2 <= ch) { res.error = "pasal akhir harus lebih besar dari pasal awal"; return res; }
        if (c2 - ch > 150) { res.error = "rentang pasal terlalu besar"; return res; }
        iv.push({ ch: ch, from: a, to: WHOLE_MAX, whole: false });
        for (var cc = ch + 1; cc < c2; cc++) iv.push({ ch: cc, from: 1, to: WHOLE_MAX, whole: true });
        iv.push({ ch: c2, from: 1, to: b, whole: false });
      } else {
        res.error = "bagian \"" + p + "\" tidak terbaca"; return res;
      }
    }
    res.ok = true;
    return res;
  }

  // Teks BibleRef -> [ hasil parseOne_ ... ] (pemisah ";" atau baris baru)
  function parse(str) {
    return String(str || "").split(/[;\n]+/).map(function (t) { return t.trim(); }).filter(Boolean).map(parseOne_);
  }

  // Rapikan: "kejadian 1:1-3;yohanes 1:1" -> "Kejadian 1:1-3; Yohanes 1:1" (nama kitab resmi).
  // Bagian yang tidak terbaca dibiarkan apa adanya.
  function normalize(str) {
    return parse(str).map(function (r) {
      if (!r.ok) return r.raw;
      return formatRef_(r);
    }).join("; ");
  }
  function formatRef_(r) {
    var iv = r.intervals, name = r.book.name;
    if (!iv.length) return r.raw;
    var first = iv[0], last = iv[iv.length - 1];
    if (iv.every(function (x) { return x.whole; })) {
      return first.ch === last.ch ? name + " " + first.ch : name + " " + first.ch + "-" + last.ch;
    }
    if (iv.length > 1 && last.ch !== first.ch) {
      return name + " " + first.ch + ":" + first.from + "-" + last.ch + ":" + last.to;
    }
    var parts = iv.map(function (x) { return x.from === x.to ? String(x.from) : x.from + "-" + x.to; });
    return name + " " + first.ch + ":" + parts.join(",");
  }

  // ---------- nomor ayat -> teks ringkas ("1, 3, 5-7") ----------
  function compactNums(nums) {
    var a = Array.from(new Set(nums || [])).sort(function (x, y) { return x - y; });
    var out = [], i = 0;
    while (i < a.length) {
      var j = i;
      while (j + 1 < a.length && a[j + 1] === a[j] + 1) j++;
      out.push(j - i >= 2 ? a[i] + "-" + a[j] : (j > i ? a[i] + ", " + a[j] : String(a[i])));
      i = j + 1;
    }
    return out.join(", ");
  }

  // ---------- AyatRef lama (Verse ID mentah) -> teks BibleRef ----------
  function langForLookup_() {
    var def = (typeof CONFIG !== "undefined" && CONFIG && CONFIG.DEFAULT_LANGUAGE) || "ind";
    var cur = (typeof currentLang !== "undefined" && currentLang) || def;
    return [cur, def];
  }
  function verseOfId_(id) {
    if (typeof verseById === "undefined" || !verseById) return null;
    var langs = langForLookup_();
    for (var i = 0; i < langs.length; i++) {
      var v = verseById[langs[i] + "_" + id];
      if (v) return v;
    }
    return null;
  }
  // -> { text:"Kejadian 1:1-3; Yohanes 3:16", unresolved:["id yang tidak ketemu"] }
  function fromVerseIds(idsStr) {
    var ids = String(idsStr || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    var byKey = {}, order = [], unresolved = [];
    ids.forEach(function (id) {
      var v = verseOfId_(id);
      if (!v) { unresolved.push(id); return; }
      var k = v.bookNumber + ":" + v.chapter;
      if (!byKey[k]) { byKey[k] = { name: v.bookName, ch: v.chapter, nums: [] }; order.push(k); }
      byKey[k].nums.push(v.verse);
    });
    var text = order.map(function (k) {
      var g = byKey[k];
      return g.name + " " + g.ch + ":" + compactNums(g.nums).replace(/, /g, ",");
    }).join("; ");
    return { text: text, unresolved: unresolved };
  }

  // ---------- INDEKS per pasal ----------
  // entries: Map("bookNum:chapter" -> [{ item, from, to, whole }])
  function buildIndex(items) {
    var map = new Map();
    function put(book, iv, item) {
      var k = book + ":" + iv.ch;
      var list = map.get(k);
      if (!list) { list = []; map.set(k, list); }
      list.push({ item: item, from: iv.from, to: iv.to, whole: !!iv.whole });
    }
    (items || []).forEach(function (it) {
      parse(it.bibleRef).forEach(function (r) {
        if (!r.ok) return;
        r.intervals.forEach(function (iv) { put(r.book.num, iv, it); });
      });
      // AyatRef lama tetap dihormati (selama belum dimigrasi)
      if (it.ayatRef) {
        String(it.ayatRef).split(",").forEach(function (id) {
          var v = verseOfId_(id.trim());
          if (v) put(v.bookNumber, { ch: v.chapter, from: v.verse, to: v.verse, whole: false }, it);
        });
      }
    });
    return map;
  }

  // Cocokkan indeks ke 1 pasal yang sedang dibuka.
  // verses = ayat pasal itu (tiap ayat punya .verse). Hasil:
  //  [{ item, verseNums:[...], whole, wide }]
  //   whole = mencakup SELURUH pasal;  wide = rentang lebar (>= 8 ayat) -> grup "Tema pasal ini"
  function forChapter(index, bookNum, chapter, verses) {
    var list = index.get(bookNum + ":" + chapter) || [];
    var nums = (verses || []).map(function (v) { return v.verse; });
    var byId = new Map(), order = [];
    list.forEach(function (e) {
      var hit = nums.filter(function (n) { return n >= e.from && n <= e.to; });
      if (!hit.length) return;
      var id = e.item.id;
      var g = byId.get(id);
      if (!g) { g = { item: e.item, set: new Set(), whole: false }; byId.set(id, g); order.push(id); }
      hit.forEach(function (n) { g.set.add(n); });
      if (e.whole) g.whole = true;
    });
    return order.map(function (id) {
      var g = byId.get(id);
      var verseNums = Array.from(g.set).sort(function (a, b) { return a - b; });
      var whole = g.whole || (nums.length > 0 && verseNums.length >= nums.length);
      return { item: g.item, verseNums: verseNums, whole: whole, wide: whole || verseNums.length >= WIDE_MIN_VERSES };
    });
  }

  // ---------- link ganda ----------
  // SAMA dengan mlLinkKey_() di apps-script/MediaLibraryCode.gs
  function linkKey(link) {
    var l = String(link || "").trim();
    if (!l) return "";
    var m = l.match(/[?&]v=([A-Za-z0-9_-]{6,})/) || l.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/) || l.match(/youtube\.com\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{6,})/);
    if (m && /youtube\.com|youtu\.be/i.test(l)) return "yt:" + m[1];
    return l.toLowerCase().replace(/#.*$/, "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "");
  }
  // -> [{ key, items:[item,...] }] hanya kelompok yang isinya > 1
  function findDuplicates(items) {
    var g = new Map();
    (items || []).forEach(function (it) {
      var k = linkKey(it.link);
      if (!k) return;
      if (!g.has(k)) g.set(k, []);
      g.get(k).push(it);
    });
    var out = [];
    g.forEach(function (arr, k) { if (arr.length > 1) out.push({ key: k, items: arr }); });
    return out;
  }
  function findByLink(items, link) {
    var k = linkKey(link);
    if (!k) return null;
    return (items || []).filter(function (it) { return linkKey(it.link) === k; })[0] || null;
  }

  // ---------- laporan pemeriksaan ----------
  // Memeriksa SEMUA item: bagian BibleRef yang tidak terbaca / pasal-ayat yang
  // tidak ada, AyatRef lama yang bisa dimigrasi, dan link ganda.
  function checkAll(items) {
    var report = { total: (items || []).length, withRef: 0, errors: [], migratable: [], duplicates: [] };
    (items || []).forEach(function (it) {
      var parsed = parse(it.bibleRef);
      if (parsed.length || it.ayatRef) report.withRef++;
      parsed.forEach(function (r) {
        if (!r.ok) { report.errors.push({ item: it, raw: r.raw, error: r.error }); return; }
        var err = validateAgainstBible_(r);
        if (err) report.errors.push({ item: it, raw: r.raw, error: err });
      });
      if (it.ayatRef && !String(it.bibleRef || "").trim()) {
        var conv = fromVerseIds(it.ayatRef);
        if (conv.text) report.migratable.push({ item: it, text: conv.text, unresolved: conv.unresolved });
      }
    });
    report.duplicates = findDuplicates(items);
    return report;
  }
  function validateAgainstBible_(r) {
    if (typeof getChapterVerses !== "function") return "";
    var lang = langForLookup_()[1];
    for (var i = 0; i < r.intervals.length; i++) {
      var iv = r.intervals[i];
      var vs = getChapterVerses(lang, r.book.num, iv.ch);
      if (!vs || !vs.length) {
        // data bahasa bawaan belum termuat -> jangan menuduh salah
        if (typeof bibleData !== "undefined" && bibleData && bibleData.length) return r.book.name + " tidak punya pasal " + iv.ch;
        return "";
      }
      var max = vs[vs.length - 1].verse;
      if (!iv.whole && iv.from > max) return r.book.name + " " + iv.ch + " hanya sampai ayat " + max;
      if (!iv.whole && iv.to !== WHOLE_MAX && iv.to > max) return r.book.name + " " + iv.ch + " hanya sampai ayat " + max;
    }
    return "";
  }

  root.MediaBibleRef = {
    parse: parse,
    normalize: normalize,
    compactNums: compactNums,
    fromVerseIds: fromVerseIds,
    buildIndex: buildIndex,
    forChapter: forChapter,
    linkKey: linkKey,
    findDuplicates: findDuplicates,
    findByLink: findByLink,
    checkAll: checkAll,
    WIDE_MIN_VERSES: WIDE_MIN_VERSES,
  };
})(typeof window !== "undefined" ? window : globalThis);
