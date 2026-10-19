// ============================================================
// js/media-date.js  (BARU 18 Okt 2026, book179)
// Pembaca & penulis TANGGAL untuk Pustaka Media (kolom Tanggal / TanggalAsli di Google Sheet).
// Cara menulis yang PRAKTIS di Sheet:  ddmmyy  ->  181026  = 18 Okt 2026.
// Yang juga dikenali (tidak perlu diubah dulu):
//   181026 | 18102026 | 18/10/26 | 18-10-2026 | 18.10.26 | 2026-10-18 | 2026-10-18T03:12:44Z (isi lama dari server)
//   "18 Oktober 2026" | "18 Okt 26" | angka seri tanggal Google Sheet (mis. 46313)
// Angka 5 digit (Sheet membuang angka nol di depan: 051026 -> 51026) dikembalikan jadi 051026 otomatis.
// Tampilan di app selalu ddmmyy (kecil). Dipakai js/media-library.js & js/presentation-studio.js.
// ============================================================
(function (root) {
  "use strict";
  var MONTHS = { jan: 1, januari: 1, feb: 2, februari: 2, mar: 3, maret: 3, apr: 4, april: 4, mei: 5, may: 5, jun: 6, juni: 6,
    jul: 7, juli: 7, agu: 8, agt: 8, agustus: 8, aug: 8, sep: 9, sept: 9, september: 9, okt: 10, oktober: 10, oct: 10,
    nov: 11, nop: 11, november: 11, des: 12, desember: 12, dec: 12 };
  var MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  function year4_(y) { y = Number(y); if (y >= 100) return y; return y < 70 ? 2000 + y : 1900 + y; }
  function make_(d, m, y) {
    d = Number(d); m = Number(m); y = year4_(y);
    if (!(m >= 1 && m <= 12) || !(d >= 1 && d <= 31) || y < 1990 || y > 2100) return null;
    var dt = new Date(y, m - 1, d, 12, 0, 0);
    return dt.getMonth() === m - 1 && dt.getDate() === d ? dt : null; // tolak 31/02 dst
  }
  function pad_(n, w) { n = String(n); while (n.length < w) n = "0" + n; return n; }

  function parse(v) {
    if (v == null) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    var s = String(v).trim();
    if (!s) return null;
    var m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/))) { // ISO (isi lama dari server) -- hari mengikuti jam setempat
      if (/[T\s]/.test(s) && /(Z|[+-]\d\d:?\d\d)$/.test(s)) { var iso = new Date(s); if (!isNaN(iso.getTime())) return iso; }
      return make_(m[3], m[2], m[1]);
    }
    if ((m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/))) return make_(m[1], m[2], m[3]);
    if (/^\d+$/.test(s)) {
      var n = s.length;
      if (n === 8 || n === 7) { s = pad_(s, 8); return make_(s.slice(0, 2), s.slice(2, 4), s.slice(4)); }
      if (n === 6 || n === 5) {
        var p = pad_(s, 6), dt = make_(p.slice(0, 2), p.slice(2, 4), p.slice(4));
        if (dt) return dt;
        if (n === 5) { var ser = new Date(Date.UTC(1899, 11, 30) + Number(s) * 86400000); return ser.getFullYear() >= 1990 ? new Date(ser.getUTCFullYear(), ser.getUTCMonth(), ser.getUTCDate(), 12) : null; }
        return null;
      }
      return null;
    }
    if ((m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{2}|\d{4})$/))) { var mo = MONTHS[m[2].toLowerCase()]; return mo ? make_(m[1], mo, m[3]) : null; }
    var f = new Date(s);
    return isNaN(f.getTime()) ? null : f;
  }
  function ddmmyy(v) { var d = parse(v); return d ? pad_(d.getDate(), 2) + pad_(d.getMonth() + 1, 2) + pad_(d.getFullYear() % 100, 2) : ""; }
  function monthKey(v) { var d = parse(v); return d ? d.getFullYear() + "-" + pad_(d.getMonth() + 1, 2) : ""; }
  function monthLabel(key) { var m = String(key || "").match(/^(\d{4})-(\d{2})$/); return m ? MONTH_SHORT[Number(m[2]) - 1] + " " + m[1] : ""; }

  root.MediaDate = { parse: parse, ddmmyy: ddmmyy, monthKey: monthKey, monthLabel: monthLabel };
  if (typeof module !== "undefined" && module.exports) module.exports = root.MediaDate;
})(typeof window !== "undefined" ? window : globalThis);
