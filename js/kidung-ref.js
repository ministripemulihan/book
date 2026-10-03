// ============================================================
//  KidungRef -- pembaca kolom "KidungRef" (Pustaka Media / Google Sheet)
//  BARU (28 Sep 2026, permintaan operator) -- operator boleh mengetik
//  kode singkat langsung di Sheet:
//     K130   -> Kidung No. 130
//     S130   -> Suplemen No. 130
//     KA13   -> Kidung Anak No. 13 (modul Kidung Anak dari web lain)
//     T5     -> Tambahan No. 5
//     Y7     -> Young People No. 7
//     A3     -> Anak-anak No. 3 (buku "Anak-anak" di Sheet kidung utama)
//  Beberapa referensi dipisah koma (atau titik-koma / baris baru):
//     "K130, S5, KA13"
//  Token yang TIDAK diawali K / S / KA + angka dianggap TULISAN BIASA
//  (mis. "Doa pembuka") -- tetap ditampilkan apa adanya, tapi TIDAK
//  dihubungkan ke mana pun.
//
//  Format LAMA "{buku}|{noKidung}" (mis. "Kidung|169", "Kidung Anak|5",
//  yang ditulis form Pustaka Media & dipakai layar baca kidung) TETAP
//  dikenali, jadi data lama tidak perlu diubah.
//
//  Huruf besar/kecil tidak dibedakan; spasi/titik/strip antara huruf
//  dan angka boleh ("K 130", "k-130"); nol di depan dibuang ("K007").
// ============================================================
(function (root) {
  "use strict";

  // Urutan PENTING: "KA"/"Kidung Anak" dicek SEBELUM "K"/"Kidung".
  // DIPERBARUI (28 Sep 2026): + T (Tambahan), Y (Young People), A (Anak-anak).
  const RULES = [
    { re: /^(?:ka|kidung\s*anak)\s*[-.:]?\s*0*(\d+)$/i, buku: "Kidung Anak" },
    { re: /^(?:k|kidung)\s*[-.:]?\s*0*(\d+)$/i, buku: "Kidung" },
    { re: /^(?:s|suplemen|supplemen)\s*[-.:]?\s*0*(\d+)$/i, buku: "Suplemen" },
    { re: /^(?:t|tambahan)\s*[-.:]?\s*0*(\d+)$/i, buku: "Tambahan" },
    { re: /^(?:y|young\s*people)\s*[-.:]?\s*0*(\d+)$/i, buku: "Young People" },
    { re: /^(?:a|anak[\s-]*anak)\s*[-.:]?\s*0*(\d+)$/i, buku: "Anak-anak" },
  ];
  const KNOWN_BUKU = {
    "kidung": "Kidung", "suplemen": "Suplemen", "supplemen": "Suplemen", "kidung anak": "Kidung Anak",
    "tambahan": "Tambahan", "young people": "Young People",
    "anak-anak": "Anak-anak", "anak anak": "Anak-anak", "anakanak": "Anak-anak",
  };
  const SHORT = { "Kidung": "K", "Suplemen": "S", "Kidung Anak": "KA", "Tambahan": "T", "Young People": "Y", "Anak-anak": "A" };

  function normBuku_(name) {
    const k = String(name || "").trim().toLowerCase().replace(/\s+/g, " ");
    return KNOWN_BUKU[k] || String(name || "").trim();
  }

  function shortLabel_(buku, no) {
    if (SHORT[buku]) return SHORT[buku] + no;
    return buku + " " + no; // buku lain dari format lama
  }

  // 1 token -> { raw, kind: "kidung"|"text", buku, no, label, key }
  function parseToken(tok) {
    const raw = String(tok == null ? "" : tok).trim();
    if (!raw) return null;
    for (let i = 0; i < RULES.length; i++) {
      const m = raw.match(RULES[i].re);
      if (m) return make_(raw, RULES[i].buku, m[1]);
    }
    const legacy = raw.match(/^(.+?)\s*\|\s*0*(\d+)$/); // format lama "Kidung|169"
    if (legacy) return make_(raw, normBuku_(legacy[1]), legacy[2]);
    return { raw, kind: "text", buku: "", no: "", label: raw, key: "text:" + raw.toLowerCase() };
  }
  function make_(raw, buku, no) {
    no = String(parseInt(no, 10)); // buang nol di depan; "0" tetap "0"
    return { raw, kind: "kidung", buku, no, label: shortLabel_(buku, no), key: buku.toLowerCase() + "|" + no };
  }

  // string kolom -> array token (urutan asli, duplikat kunci yang sama dibuang)
  function parse(str) {
    const seen = new Set();
    const out = [];
    String(str == null ? "" : str).split(/[,;\n]+/).forEach((piece) => {
      const t = parseToken(piece);
      if (!t || seen.has(t.key)) return;
      seen.add(t.key);
      out.push(t);
    });
    return out;
  }

  // Apakah kolom `str` menunjuk ke kidung {buku, no}? (untuk pencarian dua arah)
  // DIPERBARUI (4 Okt 2026): nama buku dibandingkan LONGGAR (Suplemen = Supplemen,
  // Anak-anak = Anak anak, dst) & nomor boleh "051" / 51 / "51".
  function refersTo(str, buku, no) {
    const n = parseInt(no, 10);
    if (!Number.isFinite(n)) return false;
    const want = bukuLooseKey(normBuku_(buku));
    return parse(str).some((t) => t.kind === "kidung" && t.no === String(n) && bukuLooseKey(t.buku) === want);
  }

  // Bentuk KANONIK untuk disimpan/dicari di backend: token kidung ditulis
  // "Buku|No" (SAMA seperti kidungFavoriteKey() js/kidung-ui.js), tulisan
  // biasa dibiarkan apa adanya. "K130, S5, Doa" -> "Kidung|130,Suplemen|5,Doa"
  function toCanonical(str) {
    return parse(str).map((t) => (t.kind === "kidung" ? t.buku + "|" + t.no : t.raw)).join(",");
  }

  // Bandingkan nama buku dari kode dengan nama buku SUNGGUHAN di data
  // (mis. kode "Suplemen" vs Sheet "Supplemen"): huruf kecil, tanpa spasi/strip/
  // huruf ganda "pp". Dipakai app untuk menemukan buku yang benar.
  function bukuLooseKey(name) {
    return String(name || "").toLowerCase().replace(/[\s-]+/g, "").replace(/pp/g, "p");
  }
  function findBuku(name, available) {
    const want = bukuLooseKey(name);
    return (available || []).find((b) => bukuLooseKey(b) === want) || null;
  }

  const api = { parse, parseToken, refersTo, toCanonical, normBuku: normBuku_, bukuLooseKey, findBuku };
  root.KidungRef = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
