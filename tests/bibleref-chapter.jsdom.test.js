// Uji "Media terkait pasal ini" memakai BibleRef: pencocokan lokal, grup "Tema pasal ini", akordion.
// Butuh: npm i jsdom@26 fake-indexeddb ;  node tests/bibleref-chapter.jsdom.test.js
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
const need = (m) => { try { return require(m); } catch (e) { return require(require.resolve(m, { paths: [process.cwd(), "/tmp/jt2/node_modules"] })); } };
const { JSDOM, VirtualConsole, ResourceLoader } = need("jsdom");
const fi = need("fake-indexeddb");
let ok = true;
function expect(name, cond, extra) { console.log((cond ? "PASS" : "FAIL") + " - " + name + (cond ? "" : " :: " + JSON.stringify(extra))); if (!cond) ok = false; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mk = (id, nama, kat, bibleRef, extra) => Object.assign({ id, jenis: "youtube", sumber: "youtube", nama, channel: "c", keterangan: "", kategori: kat, link: "https://youtu.be/" + id.padEnd(11, "x"), kidungRef: "", bibleRef, visibility: "all", diuploadOleh: "x", updatedAt: "2026-10-16" }, extra || {});
const ITEMS = [
  mk("k1", "Kidung 684", "Kidung", "Kejadian 1:1", { kidungRef: "K684" }),
  mk("k2", "Kidung 668", "Kidung", "Kejadian 1:3; Yohanes 1:1", { kidungRef: "K668" }),
  mk("a1", "Menara Babel", "Animasi Anak", "Kejadian 11"),
  mk("a2", "Penciptaan", "Animasi Anak", "Kejadian 1:1-2:3"),
  mk("a3", "Seluruh pasal", "Berita Pengembalaan", "Kejadian 1"),
  mk("a4", "Ayat 26", "Animasi Anak", "Kejadian 1:26,27"),
  mk("x1", "Salah ketik", "Bebas", "Kejadan 1:1"),
];
const root = process.cwd();
const mime = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css" };
const srv = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/$/, "/index.html")); fs.readFile(p, (e, d) => { if (e) { res.statusCode = 404; return res.end(); } res.setHeader("content-type", mime[path.extname(p)] || "application/octet-stream"); res.end(d); }); });
srv.listen(0, async () => {
  const port = srv.address().port, errors = [];
  const vc = new VirtualConsole(); vc.on("jsdomError", (e) => errors.push(((e.detail && e.detail.message) || e.message).split("\n")[0]));
  class L extends ResourceLoader { fetch(url, o) { return url.startsWith("http://localhost:" + port) ? super.fetch(url, o) : Promise.resolve(Buffer.from("")); } }
  const dom = await JSDOM.fromURL("http://localhost:" + port + "/index.html", {
    runScripts: "dangerously", resources: new L(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.indexedDB = fi.indexedDB; w.IDBKeyRange = fi.IDBKeyRange;
      w.fetch = (url) => /script\.google\.com/.test(String(url)) && /media_list/.test(String(url)) ? Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, items: ITEMS }) }) : Promise.reject(new Error("no network"));
      w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.HTMLMediaElement.prototype.pause = () => {}; w.HTMLMediaElement.prototype.load = () => {};
    },
  });
  await sleep(2500);
  try {
    const w = dom.window;
    const ML = w.eval("MediaLibrary"), BAI = w.eval("BOOK_ALIAS_INDEX");
    expect("MediaLibrary.watchChapter ada", typeof ML.watchChapter === "function");
    expect("MediaBibleRef ada", !!w.MediaBibleRef);
    const gen = BAI["kejadian"].num;
    const verses = Array.from({ length: 31 }, (_, i) => ({ verse: i + 1, verseId: "v" + (i + 1) }));
    let calls = 0, last = null;
    await ML.watchChapter(gen, 1, verses, (res) => { calls++; last = res; });
    expect("render dipanggil", calls >= 1, calls);
    const ids = last.items.map((i) => i.id).sort();
    expect("hanya yang cocok pasal 1 (k1,k2,a2,a3,a4)", JSON.stringify(ids) === JSON.stringify(["a2", "a3", "a4", "k1", "k2"]), ids);
    expect("Menara Babel (Kejadian 11) & salah-ketik tidak ikut", ids.indexOf("a1") === -1 && ids.indexOf("x1") === -1);
    const sec = ML.buildVerseRefSection(last.items, verses, last.matches);
    const sums = Array.from(sec.querySelectorAll("details.ml-acc-group > summary")).map((s) => s.textContent);
    console.log("   grup:", sums);
    expect("ada grup Kidung (2)", sums.some((t) => /Kidung \(2\)/.test(t)), sums);
    expect("ada grup Tema pasal ini (2: a2,a3)", sums.some((t) => /Tema pasal ini \(2\)/.test(t)), sums);
    expect("Tema pasal ini paling akhir", /Tema pasal ini/.test(sums[sums.length - 1]), sums);
    expect("kotak luar tertutup tidak wajib: ada ringkasan total", /Media terkait pasal ini \(5\)/.test(sec.querySelector("summary").textContent), sec.querySelector("summary").textContent);
    // Pemeriksa
    const rep = w.MediaBibleRef.checkAll(ITEMS);
    expect("pemeriksa menandai 'Kejadan'", rep.errors.length === 1 && rep.errors[0].item.id === "x1", rep.errors.map((e) => e.raw));
    expect("tidak ada galat skrip", errors.filter((e) => !/not implemented|Could not load|navigation/i.test(e)).length === 0, errors);
  } catch (e) { console.log("FAIL - exception", e && e.stack); ok = false; }
  finally { srv.close(); console.log(ok ? "\nALL PASS" : "\nSOME FAIL"); process.exit(ok ? 0 : 1); }
});
