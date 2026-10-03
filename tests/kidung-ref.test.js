// Uji parser KidungRef (js/kidung-ref.js).  node tests/kidung-ref.test.js
"use strict";
const KR = require("../js/kidung-ref.js");
let ok = true;
function expect(name, cond, extra) { console.log((cond ? "PASS" : "FAIL") + " - " + name + (cond ? "" : " :: " + JSON.stringify(extra))); if (!cond) ok = false; }
const one = (s) => KR.parse(s)[0];

// aturan dari operator
expect("K130 -> Kidung 130", one("K130").buku === "Kidung" && one("K130").no === "130", one("K130"));
expect("S130 -> Suplemen 130", one("S130").buku === "Suplemen" && one("S130").no === "130", one("S130"));
expect("KA13 -> Kidung Anak 13", one("KA13").buku === "Kidung Anak" && one("KA13").no === "13", one("KA13"));
expect("KA13 BUKAN dibaca K + 'A13'", one("KA13").kind === "kidung" && one("KA13").label === "KA13", one("KA13"));
expect("tanpa K/S/KA -> tulisan biasa", KR.parse("Doa pembuka")[0].kind === "text" && KR.parse("130")[0].kind === "text", KR.parse("Doa pembuka"));
expect("huruf lain (SA5, X9, Z3) -> tulisan biasa", ["SA5", "X9", "Z3"].every((x) => one(x).kind === "text"), ["SA5", "X9", "Z3"].map(one));
// 3 buku tambahan: T / Y / A
expect("T5 -> Tambahan 5", one("T5").buku === "Tambahan" && one("T5").no === "5" && one("T5").label === "T5", one("T5"));
expect("Y7 -> Young People 7", one("Y7").buku === "Young People" && one("Y7").no === "7" && one("Y7").label === "Y7", one("Y7"));
expect("A3 -> Anak-anak 3 (BUKAN Kidung Anak)", one("A3").buku === "Anak-anak" && one("A3").no === "3" && one("A3").label === "A3", one("A3"));
expect("KA3 tetap Kidung Anak (bukan K + A3)", one("KA3").buku === "Kidung Anak", one("KA3"));
expect("kata penuh Tambahan 5 / Young People 7 / Anak-anak 3 / Anak anak 3", one("Tambahan 5").key === "tambahan|5" && one("Young People 7").key === "young people|7" && one("Anak-anak 3").key === "anak-anak|3" && one("anak anak 3").key === "anak-anak|3", null);
expect("huruf kecil & spasi t 5, y-7, a.3", one("t 5").key === "tambahan|5" && one("y-7").key === "young people|7" && one("a.3").key === "anak-anak|3", null);
expect("6 kode enam tempat, semua label singkat", KR.parse("K1,S2,T3,Y4,A5,KA6").map((t) => t.label).join(",") === "K1,S2,T3,Y4,A5,KA6", KR.parse("K1,S2,T3,Y4,A5,KA6"));
expect("findBuku: Suplemen cocok dengan Supplemen di data", KR.findBuku("Suplemen", ["Kidung", "Supplemen", "Tambahan"]) === "Supplemen", null);
expect("findBuku: Anak-anak / Young People cocok longgar", KR.findBuku("Anak-anak", ["Anak anak"]) === "Anak anak" && KR.findBuku("Young People", ["young people"]) === "young people", null);
expect("findBuku: tidak ada -> null", KR.findBuku("Tambahan", ["Kidung"]) === null, null);
// variasi penulisan
expect("huruf kecil & spasi: 'k 130', 'ka-13', 's.5'", one("k 130").key === "kidung|130" && one("ka-13").key === "kidung anak|13" && one("s.5").key === "suplemen|5", [one("k 130"), one("ka-13"), one("s.5")]);
expect("nol di depan dibuang: K007", one("K007").no === "7", one("K007"));
expect("kata penuh: Kidung 130 / Suplemen 5 / Kidung Anak 13", one("Kidung 130").key === "kidung|130" && one("Suplemen 5").key === "suplemen|5" && one("Kidung Anak 13").key === "kidung anak|13", null);
expect("kata 'Kidung' tanpa angka -> tulisan biasa", one("Kidung pujian").kind === "text" && one("K").kind === "text", null);
expect("K130a / K1-3 -> tulisan biasa (bukan angka murni)", one("K130a").kind === "text" && one("K1-3").kind === "text", [one("K130a"), one("K1-3")]);
// format lama tetap jalan
expect("format lama Kidung|169", one("Kidung|169").key === "kidung|169", one("Kidung|169"));
expect("format lama Kidung Anak|5 & kecil-besar", one("kidung anak|5").key === "kidung anak|5" && one("KIDUNG|7").buku === "Kidung", null);
expect("format lama Tambahan|5 tetap kidung (label singkat T5)", one("Tambahan|5").kind === "kidung" && one("Tambahan|5").label === "T5", one("Tambahan|5"));
// banyak referensi
const multi = KR.parse("K130, S5;KA13\nDoa, k130");
expect("banyak token: koma / titik-koma / baris baru + duplikat dibuang", multi.map((t) => t.label).join("|") === "K130|S5|KA13|Doa", multi.map((t) => t.label));
expect("kolom kosong / null -> []", KR.parse("").length === 0 && KR.parse(null).length === 0 && KR.parse(undefined).length === 0, null);
expect("K130 dan Kidung|130 sama kunci", one("K130").key === one("Kidung|130").key, null);
expect("refersTo", KR.refersTo("K130, S5", "Suplemen", "005") === true && KR.refersTo("K130", "Suplemen", "130") === false, null);
expect("toCanonical", KR.toCanonical("K130, S5, KA13, Doa") === "Kidung|130,Suplemen|5,Kidung Anak|13,Doa", KR.toCanonical("K130, S5, KA13, Doa"));
console.log(ok ? "\nALL PASS" : "\nSOME FAIL"); process.exit(ok ? 0 : 1);
