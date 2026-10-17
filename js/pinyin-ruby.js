// MODE "NEMPEL" (17 Okt 2026, book168) -- menyejajarkan TIAP karakter Mandarin dengan
// SATU suku kata pinyin tepat di bawahnya (satu karakter di atas, satu suku kata di bawahnya).
// Fungsi MURNI (tanpa DOM) supaya bisa diuji di Node: node tests/pinyin-ruby.test.js
"use strict";
const PinyinRuby = (function () {
  // Pasangan kode bahasa: teks Mandarin -> pinyin-nya (lihat CONFIG.LANGUAGES di js/config.js)
  const PAIRS = { chs: "chs_pinyin", chssmp: "chssmp_pinyin" };
  const HAN = /\p{Script=Han}/u;
  // Tanda baca pembuka: ikut karakter BERIKUTNYA (supaya tidak pernah tertinggal sendirian di ujung baris)
  const OPEN = /[“‘「『（《〈【〔(\[]/;

  function pairCode(code) { return PAIRS[code] || ""; }
  function isPinyinCode(code) { return Object.keys(PAIRS).some((k) => PAIRS[k] === code); }

  // "wǒ suǒ qīn ài, suǒ xiǎng" -> ["wǒ","suǒ","qīn","ài","suǒ","xiǎng"] (tanda baca dibuang, huruf bernada dipertahankan)
  function syllables(py) {
    return (String(py || "").match(/[\p{L}\p{M}]+/gu) || []);
  }

  // Mengembalikan [{han:"我", py:"wǒ"}, ...] atau null kalau jumlah karakter Mandarin
  // TIDAK sama dengan jumlah suku kata pinyin (tidak boleh menebak -> pemanggil memakai tampilan atas-bawah biasa).
  function align(han, pinyin) {
    const chars = Array.from(String(han || "").replace(/\s+/g, ""));
    const hanCount = chars.filter((c) => HAN.test(c)).length;
    const syl = syllables(pinyin);
    if (!hanCount || syl.length !== hanCount) return null;
    const cells = [];
    let prefix = "", si = 0;
    chars.forEach((ch) => {
      if (HAN.test(ch)) { cells.push({ han: prefix + ch, py: syl[si++] }); prefix = ""; }
      else if (OPEN.test(ch)) prefix += ch;
      else if (cells.length) cells[cells.length - 1].han += ch;
      else prefix += ch;
    });
    if (prefix) cells[cells.length - 1].han += prefix;
    return cells;
  }


  // BARU (17 Okt 2026, book169) -- versi untuk TEKS AYAT SLIDE Studio Presentasi: teks bisa memuat
  // nomor ayat ("1 亞伯拉罕… 2 以撒…") yang tidak boleh ikut dihitung sebagai karakter/suku kata.
  // Nomor ayat jadi `num` pada sel karakter BERIKUTNYA. Sisanya sama dengan align().
  function alignVerseText(han, pinyin) {
    const syl = syllables(String(pinyin || "").replace(/\d+/g, " "));
    const src = Array.from(String(han || ""));
    const hanCount = src.filter((c) => HAN.test(c)).length;
    if (!hanCount || syl.length !== hanCount) return null;
    const cells = [];
    let prefix = "", si = 0, num = "", digits = "";
    const flushDigits = () => { if (digits) { num = digits; digits = ""; } };
    src.forEach((ch) => {
      if (/\d/.test(ch)) { digits += ch; return; }
      if (/\s/.test(ch)) { flushDigits(); return; }
      flushDigits();
      if (HAN.test(ch)) {
        const cell = { han: prefix + ch, py: syl[si++] };
        if (num) { cell.num = num; num = ""; }
        cells.push(cell); prefix = "";
      } else if (OPEN.test(ch)) prefix += ch;
      else if (cells.length) cells[cells.length - 1].han += ch;
      else prefix += ch;
    });
    if (prefix && cells.length) cells[cells.length - 1].han += prefix;
    return cells;
  }

  // Menggabungkan daftar [{code,label,text}] : tiap teks Mandarin yang pinyin-nya JUGA ada di daftar
  // jadi 1 entri {code,label:"MDR + MDR-PINYIN",text,ruby:[{han,py,num?}]} di posisi entri Mandarin;
  // entri pinyin-nya dibuang. Kalau jumlah karakter != jumlah suku kata -> TIDAK digabung (tidak menebak).
  function mergeTexts(texts) {
    const list = Array.isArray(texts) ? texts : [];
    const used = new Set();
    const out = [];
    list.forEach((t, i) => {
      if (used.has(i)) return;
      const pc = pairCode(t && t.code);
      const j = pc ? list.findIndex((x, k) => k !== i && !used.has(k) && x && x.code === pc) : -1;
      if (j >= 0) {
        const cells = alignVerseText(t.text, list[j].text);
        if (cells) {
          used.add(j);
          out.push({ code: t.code, label: [t.label, list[j].label].filter(Boolean).join(" + "), text: t.text, ruby: cells });
          return;
        }
      }
      out.push(t);
    });
    return out;
  }

  // Untuk slide gabungan beberapa ayat (groups): label "MDR + MDR-PINYIN" cukup di kelompok PERTAMA
  // yang memuatnya (permintaan operator: tidak diulang di ayat di bawahnya).
  function mergeGroups(groups) {
    let shown = false;
    return (groups || []).map((g) => {
      const texts = mergeTexts(g.texts).map((t) => {
        if (!t.ruby) return t;
        if (shown) return Object.assign({}, t, { label: "" });
        shown = true; return t;
      });
      return Object.assign({}, g, { texts });
    });
  }

  return { pairCode, isPinyinCode, syllables, align, alignVerseText, mergeTexts, mergeGroups };
})();
if (typeof module !== "undefined" && module.exports) module.exports = PinyinRuby;
