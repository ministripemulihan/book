// PENANDA PER KATA saat pembacaan suara (17 Okt 2026, book168).
// Bagian MURNI (potong kalimat, pecah kata, bobot waktu) + pemetaan ke DOM (kotak .rb-cell mode Nempel,
// atau Range di teks biasa). Bisa diuji di Node: node tests/tts-sync.test.js
"use strict";
const TtsSync = (function () {
  const HAN = /\p{Script=Han}/u;
  const STRONG_CJK = /[。？！；：]/;
  const WEAK_CJK = /[，、]/;
  const PUNCT = /[\p{P}\p{S}]/u;
  const SKIP_SEL = ".footnote-marker, .verse-note-badge, .strong-tag, .rb-py, sup";

  function isCjk(t) { return HAN.test(String(t || "")); }

  // Memotong teks ayat jadi potongan kalimat (1 potongan = 1 ucapan suara) supaya posisi bisa dicek tiap
  // beberapa detik, bukan sekali per ayat. Potong di tanda baca kuat (。！？；： . ! ? ; :), dan di koma
  // hanya kalau potongan terlalu panjang. Mengembalikan [{start,end,text}] (offset di teks asli).
  function splitSegments(text) {
    text = String(text || "");
    const cjk = isCjk(text), maxLen = cjk ? 28 : 140, minLen = cjk ? 8 : 30;
    const strong = [], weak = [];
    for (let i = 0; i < text.length; i++) {
      const c = text[i], nx = text[i + 1], pv = text[i - 1] || "";
      const endOrSpace = i === text.length - 1 || /\s/.test(nx);
      if (STRONG_CJK.test(c)) strong.push(i + 1);
      else if (WEAK_CJK.test(c)) weak.push(i + 1);
      else if (/[.!?;:]/.test(c) && endOrSpace && !(/\d/.test(pv) && /\d/.test(nx || ""))) strong.push(i + 1);
      else if (c === "," && endOrSpace) weak.push(i + 1);
    }
    // 1) potong di tanda kuat; potongan pendek digabung ke berikutnya
    let pieces = [], start = 0;
    strong.forEach((cut) => { if (cut - start >= minLen) { pieces.push([start, cut]); start = cut; } });
    if (start < text.length) {
      if (pieces.length && text.slice(start).replace(/\s/g, "").length < Math.max(2, minLen / 2)) pieces[pieces.length - 1][1] = text.length;
      else pieces.push([start, text.length]);
    }
    // 2) potongan terlalu panjang -> potong di koma terdekat sebelum batas
    const out = [];
    pieces.forEach(([a, b]) => {
      let s = a;
      while (b - s > maxLen) {
        const cands = weak.filter((w) => w > s && w < b);
        const within = cands.filter((w) => w - s <= maxLen);
        const cut = within.length ? within[within.length - 1] : (cands.find((w) => w - s > maxLen) || 0);
        if (!cut || cut >= b) break;
        out.push([s, cut]); s = cut;
      }
      out.push([s, b]);
    });
    return out.map(([a, b]) => {
      let s = a, e = b;
      while (s < e && /\s/.test(text[s])) s++;
      while (e > s && /\s/.test(text[e - 1])) e--;
      return { start: s, end: e, text: text.slice(s, e) };
    }).filter((x) => x.text.length);
  }

  // Kata-kata (satu "unit" sorot): teks Mandarin = TIAP karakter Han; selain itu kata biasa.
  function tokenize(text) {
    text = String(text || "");
    const out = [];
    if (isCjk(text)) {
      const re = /\p{Script=Han}|[\p{Script=Latin}\p{N}]+/gu; let m;
      while ((m = re.exec(text))) out.push({ cs: m.index, ce: m.index + m[0].length });
      return out;
    }
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      try {
        for (const s of new Intl.Segmenter(undefined, { granularity: "word" }).segment(text)) if (s.isWordLike) out.push({ cs: s.index, ce: s.index + s.segment.length });
        return out;
      } catch (e) { /* jatuh ke regex */ }
    }
    const re = /[\p{L}\p{N}][\p{L}\p{N}'’]*/gu; let m;
    while ((m = re.exec(text))) out.push({ cs: m.index, ce: m.index + m[0].length });
    return out;
  }

  // Bobot waktu bacaan sepotong teks: huruf 1, tanda baca 1.5 (jeda), spasi 0.
  function spanWeight(text, a, b) {
    let w = 0;
    for (let i = Math.max(0, a); i < Math.min(text.length, b); i++) {
      const c = text[i];
      if (/\s/.test(c)) continue;
      w += PUNCT.test(c) ? 1.5 : 1;
    }
    return w;
  }

  // Unit-unit milik satu potongan + bobotnya.
  function segmentUnits(units, text, seg) {
    const list = [], weights = [];
    units.forEach((u, i) => {
      if (u.ce <= seg.start || u.cs >= seg.end) return;
      const next = i + 1 < units.length ? units[i + 1].cs : text.length;
      list.push(u);
      weights.push(Math.max(0.5, spanWeight(text, u.cs, Math.min(next, seg.end))));
    });
    return { units: list, weights, total: weights.reduce((a, b) => a + b, 0) };
  }

  // Unit ke berapa yang sedang dibaca kalau sudah `target` bobot berlalu.
  function pickIndex(weights, target) {
    let cum = 0;
    for (let i = 0; i < weights.length; i++) { cum += weights[i]; if (target < cum) return i; }
    return Math.max(0, weights.length - 1);
  }

  // Unit yang memuat posisi karakter `abs` (dari onboundary), atau yang terdekat sebelumnya.
  function unitAtChar(units, abs) {
    let best = -1;
    for (let i = 0; i < units.length; i++) { if (units[i].cs <= abs) best = i; else break; }
    return best;
  }

  // Semua karakter bukan-spasi yang tampil di elemen teks ayat (tanpa penanda catatan kaki/nomor Strong/pinyin).
  function collectDomChars(root) {
    const doc = root.ownerDocument, chars = [];
    const walker = doc.createTreeWalker(root, 4 /* SHOW_TEXT */, {
      acceptNode(n) {
        for (let p = n.parentNode; p && p !== root; p = p.parentNode) if (p.nodeType === 1 && p.matches && p.matches(SKIP_SEL)) return 3; // FILTER_SKIP
        return 1;
      },
    });
    let n;
    while ((n = walker.nextNode())) {
      const v = n.nodeValue;
      for (let o = 0; o < v.length; o++) if (!/\s/.test(v[o])) chars.push({ n, o });
    }
    return chars;
  }

  // Unit sorot untuk satu ayat. Mode Nempel: tiap .rb-cell. Teks biasa: tiap kata, lewat Range.
  function domUnits(root, text) {
    text = String(text || "");
    const words = tokenize(text);
    const cells = root.querySelectorAll ? Array.from(root.querySelectorAll(".rb-cell")) : [];
    if (cells.length) {
      const len = text.length;
      const exact = words.length === cells.length;
      return cells.map((el, j) => ({
        cs: exact ? words[j].cs : Math.floor(j * len / cells.length),
        ce: exact ? words[j].ce : Math.floor((j + 1) * len / cells.length),
        el, makeRange: null,
      }));
    }
    const chars = collectDomChars(root);
    if (!chars.length || !words.length) return [];
    const nsIdx = []; // indeks teks -> urutan bukan-spasi
    let k = 0;
    for (let i = 0; i < text.length; i++) nsIdx[i] = /\s/.test(text[i]) ? -1 : k++;
    const total = k, m = chars.length;
    const dom = (ci) => { let o = nsIdx[ci]; if (o < 0) o = nsIdx.slice(ci).find((x) => x >= 0); if (o == null) o = total - 1; return chars[total === m ? o : Math.min(m - 1, Math.floor(o * m / total))]; };
    return words.map((w) => ({
      cs: w.cs, ce: w.ce, el: null,
      makeRange() {
        const a = dom(w.cs), b = dom(w.ce - 1), r = root.ownerDocument.createRange();
        r.setStart(a.n, a.o); r.setEnd(b.n, b.o + 1);
        return r;
      },
    }));
  }

  return { splitSegments, tokenize, spanWeight, segmentUnits, pickIndex, unitAtChar, domUnits, isCjk };
})();
if (typeof module !== "undefined" && module.exports) module.exports = TtsSync;
