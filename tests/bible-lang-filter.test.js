// Uji v65: "Bahasa yang Diunduh & Disimpan" -- tombol Centang semua + petunjuk bahasa baru yang belum dicentang.
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const { JSDOM } = require("jsdom");
const src = fs.readFileSync(path.join(__dirname, "../js/app.js"), "utf8");
const a = src.indexOf("function wireBibleLangFilterUi() {");
const b = src.indexOf("// ------------------------------------------------------------\n// BARU (10 Sep 2026", a);
const fn = src.slice(a, b);
let ok = true;
const expect = (n, c, x) => { console.log((c ? "PASS" : "FAIL") + " - " + n + (c ? "" : " :: " + JSON.stringify(x))); if (!c) ok = false; };

const dom = new JSDOM('<div id="bibleLangFilterList"></div><button id="bibleLangCheckAllBtn"></button><p id="bibleLangNewHint" hidden></p><button id="resyncBtn"></button>');
const { document } = dom.window;
let saved = null, confirms = 0, resyncs = 0;
document.getElementById("resyncBtn").addEventListener("click", () => resyncs++);
const ctx = {
  document, alert() {}, confirm() { confirms++; return true; }, currentUser: "u",
  el: (id) => document.getElementById(id),
  CONFIG: { LANGUAGES: [{ code: "ind", label: "Indonesia" }, { code: "kjv", label: "KJV" }, { code: "chs_pinyin", label: "Mandarin Pinyin" }, { code: "chssmp_pinyin", label: "Sederhana Pinyin" }] },
  getSetting: () => ["ind", "kjv"], // filter lama: pinyin TIDAK tercentang
  setSetting: (u, k, v) => { saved = v; },
  bibleData: [1], verseIndex: { ind: {}, kjv: {} }
};
vm.createContext(ctx);
vm.runInContext(fn + "\nthis.run = wireBibleLangFilterUi;", ctx);
ctx.run();
const boxes = () => Array.from(document.querySelectorAll("#bibleLangFilterList input"));
expect("4 baris bahasa, pinyin belum tercentang", boxes().length === 4 && !boxes()[2].checked && !boxes()[3].checked);
const hint = document.getElementById("bibleLangNewHint");
expect("petunjuk muncul & menyebut Pinyin", !hint.hidden && /Pinyin/.test(hint.textContent) && /Centang semua/.test(hint.textContent), hint.textContent);
document.getElementById("bibleLangCheckAllBtn").click();
expect("semua tercentang", boxes().every((x) => x.checked));
expect("disimpan sebagai [] (= semua bahasa, termasuk bahasa baru nanti)", Array.isArray(saved) && saved.length === 0, saved);
expect("menawarkan sinkron ulang & menekan tombol sinkron", confirms === 1 && resyncs === 1, { confirms, resyncs });
expect("petunjuk berubah: sudah dicentang tapi belum terunduh", !hint.hidden && /belum ada di perangkat/.test(hint.textContent), hint.textContent);
console.log(ok ? "SEMUA LULUS" : "ADA YANG GAGAL");
process.exit(ok ? 0 : 1);
