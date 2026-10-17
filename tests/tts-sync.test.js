// Uji penanda PER KATA pembacaan suara (book168): NODE_PATH=/tmp/jt2/node_modules node tests/tts-sync.test.js
"use strict";
const need = (m) => { try { return require(m); } catch (e) { return require(require.resolve(m, { paths: [process.cwd(), "/tmp/jt2/node_modules"] })); } };
const { JSDOM } = need("jsdom");
const T = require("../js/tts-sync.js");
let ok = true;
const expect = (n, c, x) => { console.log((c ? "PASS" : "FAIL") + " - " + n + (c ? "" : " :: " + JSON.stringify(x))); if (!c) ok = false; };

// potong kalimat
const z = "亞伯拉罕的後裔，大衛的子孫（後裔子孫原文都作兒子下同），耶穌基督的家譜：";
const sz = T.splitSegments(z);
expect("Mandarin dipotong di tanda kuat (：) & utuh", sz.length === 2 && sz.map((s) => s.text).join("") === z, sz);
expect("offset potongan cocok dengan teks asli", sz.every((s) => z.slice(s.start, s.end) === s.text), sz);
const l = "Inilah silsilah Yesus Kristus, anak Daud, anak Abraham. Abraham mempunyai anak Ishak; Ishak mempunyai anak Yakub.";
const sl = T.splitSegments(l);
expect("Latin dipotong di . dan ;", sl.length >= 2 && sl.every((s) => l.slice(s.start, s.end) === s.text), sl);
expect("angka Yoh 3:16 tidak dipotong di titik dua", T.splitSegments("Lihat Yoh 3:16 sekarang juga ya.").length === 1, null);
const long = "一二三四五六七八，九十一二三四五六，七八九十一二三四，五六七八九十一二，三四五六七八九十。";
expect("potongan terlalu panjang dibelah di koma", T.splitSegments(long).length >= 2 && T.splitSegments(long).every((s) => s.text.length <= 30), T.splitSegments(long).map((s) => s.text));
expect("teks kosong -> tanpa potongan", T.splitSegments("   ").length === 0, null);

// kata
expect("Han: tiap karakter 1 unit", T.tokenize("我所親愛、所想念").length === 7, T.tokenize("我所親愛、所想念"));
expect("Latin: per kata", T.tokenize("Kasih itu sabar").length === 3, null);

// bobot & pilih unit
const units = T.tokenize("我所親愛、所想念").map((w) => ({ cs: w.cs, ce: w.ce }));
const su = T.segmentUnits(units, "我所親愛、所想念", { start: 0, end: 8 });
expect("bobot: tanda baca menambah jeda pada unit sebelumnya", su.weights[3] > su.weights[0], su.weights);
expect("pickIndex awal/tengah/akhir", T.pickIndex(su.weights, 0) === 0 && T.pickIndex(su.weights, su.total + 5) === su.weights.length - 1 && T.pickIndex(su.weights, su.weights[0] + 0.1) === 1, null);
expect("unitAtChar (boundary)", T.unitAtChar(units, 0) === 0 && T.unitAtChar(units, 4) === 3 && T.unitAtChar(units, 5) === 4, null);

// DOM: teks biasa dengan catatan kaki + badge (tidak ikut dihitung)
const dom = new JSDOM('<div id="a" class="verse-text-wrap">Kasih <sup class="footnote-marker">1a</sup><span class="footnote-marker-word">itu</span> sabar<span class="verse-note-badge">📝</span></div>');
const root = dom.window.document.getElementById("a");
const us = T.domUnits(root, "Kasih itu sabar");
expect("3 unit kata", us.length === 3, us.length);
expect("range kata ke-2 = 'itu' (marker 1a dilewati)", us[1].makeRange().toString() === "itu", us[1].makeRange().toString());
expect("range kata ke-3 = 'sabar'", us[2].makeRange().toString() === "sabar", us[2].makeRange().toString());
// DOM: mode Nempel
const d2 = new JSDOM('<div id="b" class="verse-text-wrap verse-ruby"><span class="rb-cell"><span class="rb-han">我</span><span class="rb-py">wǒ</span></span><span class="rb-cell"><span class="rb-han">愛、</span><span class="rb-py">ài</span></span><span class="rb-cell"><span class="rb-han">你</span><span class="rb-py">nǐ</span></span></div>');
const u2 = T.domUnits(d2.window.document.getElementById("b"), "我愛、你");
expect("Nempel: 1 unit per kotak, cs/ce cocok karakter", u2.length === 3 && u2[0].cs === 0 && u2[1].cs === 1 && u2[2].cs === 3 && u2[1].el, u2.map((u) => [u.cs, u.ce]));
console.log(ok ? "\nALL PASS" : "\nSOME FAIL"); process.exit(ok ? 0 : 1);
