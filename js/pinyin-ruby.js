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

  return { pairCode, isPinyinCode, syllables, align };
})();
if (typeof module !== "undefined" && module.exports) module.exports = PinyinRuby;
