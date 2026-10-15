// Uji NOTES ayat di Layar 2 -- v57 (15 Okt 2026):
//   (a) present.html: payload `notes` tampil di bawah ayat, ter-escape, judul sesuai bahasa; tanpa notes = tidak ada blok
//   (b) Studio: buildVerseNotesExtra_() memilih bahasa notes (Indonesia/Inggris) BEBAS dari bahasa ayat, mengubah HTML jadi teks polos
// Jalankan: NODE_PATH=$(npm root -g) node tests/present-notes.browser.test.js (butuh playwright + chromium)
"use strict";
const fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const root = path.join(__dirname, "..");
let ok = true;
function expect(name, cond, extra) { console.log((cond ? "PASS" : "FAIL") + " - " + name + (cond ? "" : " :: " + JSON.stringify(extra))); if (!cond) ok = false; }
const src = fs.readFileSync(path.join(root, "js/presentation-studio.js"), "utf8");
const a = src.indexOf('const NOTES_PREF_KEY');
const b = src.indexOf("  // Kirim 1 item generik ke Layar 2 SEKARANG JUGA", a);
const studioSrc = src.slice(a, b);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto("file://" + path.join(root, "present.html"));
  await page.waitForTimeout(500);
  // (a) present.html
  const r = await page.evaluate(() => {
    render({ type: "verse", ref: "Wahyu 2:5; Matius 28:19", texts: [{ label: "IND-RCV", text: "a" }],
      notes: [{ ref: "Wahyu 2:5", text: "Catatan <b>satu</b>\nbaris dua" }, { ref: "Matius 28:19", text: "Catatan dua" }], notesLang: "ind" });
    const w = document.querySelector("#text .verse-notes");
    const items = Array.from(document.querySelectorAll("#text .verse-note-item"));
    const out = { has: !!w, title: w && w.querySelector(".verse-notes-title").textContent, n: items.length,
      refs: items.map((i) => i.querySelector(".verse-note-ref") && i.querySelector(".verse-note-ref").textContent),
      escaped: items[0].textContent.indexOf("<b>satu</b>") >= 0 && !items[0].querySelector("b"),
      belowVerse: w && document.querySelector("#text .verse-version-block").getBoundingClientRect().bottom <= w.getBoundingClientRect().top + 1 };
    render({ type: "verse", ref: "Yoh 3:16", notes: [{ ref: "Yoh 3:16", text: "n" }], notesLang: "eng", text: "x" });
    out.titleEng = document.querySelector("#text .verse-notes-title").textContent;
    out.singleNoRef = document.querySelectorAll("#text .verse-note-ref").length;
    render({ type: "verse", ref: "Yoh 3:16", text: "x" });
    out.noNotes = document.querySelectorAll("#text .verse-notes").length;
    render({ type: "verse", ref: "Yoh 3:16", text: "x", notes: [{ ref: "Yoh 3:16", text: "n" }] });
    render({ type: "text", text: "Pengumuman" });
    out.afterText = document.querySelectorAll("#text .verse-notes").length;
    return out;
  });
  const ro = await page.evaluate(() => { render({ type: "verse", ref: "Wahyu 2:5", text: "TEKS AYAT", notes: [{ ref: "Wahyu 2:5", text: "isi notes" }], notesLang: "ind", notesOnly: true });
    const t = document.getElementById("text"); return { hasVerse: /TEKS AYAT/.test(t.textContent), hasNote: /isi notes/.test(t.textContent), ref: document.getElementById("ref").textContent }; });
  expect("Notes saja: teks ayat tidak tampil, notes & nama ayat tampil", !ro.hasVerse && ro.hasNote && ro.ref === "Wahyu 2:5", ro);
  expect("blok notes tampil", r.has, r);
  expect("judul notes Indonesia = Catatan", r.title && /Catatan/.test(r.title), r.title);
  expect("2 notes dengan nama ayat masing-masing", r.n === 2 && r.refs[0] === "Wahyu 2:5" && r.refs[1] === "Matius 28:19", r.refs);
  expect("teks notes di-escape (tidak jadi HTML)", r.escaped, r);
  expect("notes di BAWAH ayat", r.belowVerse, r);
  expect("judul notes Inggris = Notes", /Notes/.test(r.titleEng), r.titleEng);
  expect("1 notes saja: nama ayat tidak diulang", r.singleNoRef === 0, r.singleNoRef);
  expect("tanpa notes = tidak ada blok notes", r.noNotes === 0, r.noNotes);
  expect("pindah ke teks bebas: notes hilang", r.afterText === 0, r.afterText);

  // (b) Studio helper
  const page2 = await browser.newPage();
  await page2.setContent(`<!doctype html><html><body>
    <input type="checkbox" id="psQuickShowNotes"><select id="psQuickNotesLang"><option value="ind">i</option><option value="eng">e</option></select>
    <script>
    const el = (id) => document.getElementById(id);
    const DATA = {
      rvind: [{ verse: 5, bookName: "Wahyu", note: "<p>(1) Catatan RCV Indonesia</p><p>baris dua</p>" }, { verse: 6, bookName: "Wahyu", note: "" }],
      ind:   [{ verse: 5, bookName: "Wahyu", note: "TB catatan" }, { verse: 6, bookName: "Wahyu", note: "TB enam" }],
      rveng: [{ verse: 5, bookName: "Revelation", note: "<b>English</b> note&nbsp;five<br>line two" }],
      chs:   [{ verse: 5, bookName: "启示录", note: "" }]
    };
    function getChapterVerses(code) { return DATA[code] || []; }
    ${studioSrc}
    </script></body></html>`);
  const s = await page2.evaluate(() => {
    const V = (v) => ({ bookNumber: 66, chapter: 2, verse: v, bookName: "Wahyu" });
    const o = {};
    o.off = buildVerseNotesExtra_([V(5)]);
    el("psQuickShowNotes").checked = true; window.onlyCb = document.createElement("input"); window.onlyCb.type="checkbox"; window.onlyCb.id="psQuickNotesOnly"; document.body.appendChild(window.onlyCb);
    o.ind = buildVerseNotesExtra_([V(5)]);
    o.indFallbackTB = buildVerseNotesExtra_([V(6)]);
    el("psQuickNotesLang").value = "eng";
    o.eng = buildVerseNotesExtra_([V(5)]);
    o.engMissing = buildVerseNotesExtra_([V(6)]);
    o.dedupe = buildVerseNotesExtra_([V(5), V(5)]).notes.length;
    el("psQuickNotesLang").value = "ind";
    o.two = buildVerseNotesExtra_([V(5), V(6)]).notes.map((n) => n.ref);
    DATA.rvind[0].note = "x".repeat(2000);
    window.onlyCb.checked = true; o.only = buildVerseNotesExtra_([V(5)]).notesOnly === true; window.onlyCb.checked = false;
    o.long = buildVerseNotesExtra_([V(5)]).notes[0].text.length;
    return o;
  });
  expect("checkbox mati = tidak ada notes (payload lama)", Object.keys(s.off).length === 0, s.off);
  expect("notes Indonesia (Recovery) jadi teks polos", s.ind.notes && /Catatan RCV Indonesia/.test(s.ind.notes[0].text) && !/<p>/.test(s.ind.notes[0].text) && s.ind.notesLang === "ind", s.ind);
  expect("Indonesia: kalau Recovery kosong pakai TB", s.indFallbackTB.notes && s.indFallbackTB.notes[0].text === "TB enam", s.indFallbackTB);
  expect("notes Inggris dipakai walau ayat Indonesia/Mandarin", s.eng.notes && /English note\u00a0five|English note five/.test(s.eng.notes[0].text.replace(/\u00a0/g, " ")) && s.eng.notes[0].ref === "Revelation 2:5" && s.eng.notesLang === "eng", s.eng);
  expect("<br> jadi baris baru", s.eng.notes[0].text.indexOf("\n") > 0, s.eng);
  expect("ayat tanpa notes di bahasa itu = tidak ada notes", Object.keys(s.engMissing).length === 0, s.engMissing);
  expect("ayat kembar tidak dobel", s.dedupe === 1, s.dedupe);
  expect("2 ayat = 2 notes berurutan", JSON.stringify(s.two) === JSON.stringify(["Wahyu 2:5", "Wahyu 2:6"]), s.two);
  expect("pilihan Notes saja ikut ke payload", s.only === true, s.only);
  expect("notes panjang dipotong (<= ~810 huruf)", s.long <= 810, s.long);
  await browser.close();
  console.log(ok ? "SEMUA LULUS" : "ADA YANG GAGAL");
  process.exit(ok ? 0 : 1);
})();
