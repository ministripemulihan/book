// Uji Daftar Kidung: chip ▶️ YouTube ikut menghitung video Pustaka Media ber-KidungRef (K51, S1, A1, T1, Y1).
// Butuh: npm i jsdom@22 fake-indexeddb ;  node tests/kidung-ref-daftar.jsdom.test.js
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
const need = (m) => { try { return require(m); } catch (e) { return require(require.resolve(m, { paths: [process.cwd(), "/tmp/jt2/node_modules"] })); } };
const { JSDOM, VirtualConsole, ResourceLoader } = need("jsdom");
const fi = need("fake-indexeddb");
let ok = true;
function expect(name, cond, extra) { console.log((cond ? "PASS" : "FAIL") + " - " + name + (cond ? "" : " :: " + JSON.stringify(extra))); if (!cond) ok = false; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const yt = (id, nama, kidungRef) => ({ id, jenis: "youtube", sumber: "youtube", nama, channel: "Ch", keterangan: "", kategori: "Bebas", link: "https://youtu.be/" + id, kidungRef, gambar: "", durasiDetik: "", tanggalAsli: "", visibility: "all", diuploadOleh: "x", tanggal: "", updatedAt: "" });
const ITEMS = [
  yt("v1", "Video K51", "K51"),
  yt("v2", "Video S1", "S1"),
  yt("v3", "Video A1", "A1"),
  yt("v4", "Video T1", "T1"),
  yt("v5", "Video Y1", "Y1"),
  yt("v6", "Video K510 salah", "Doa K 5 10"),
  Object.assign(yt("v7", "Sound K130", "K130"), { jenis: "sound", sumber: "soundcloud", link: "https://soundcloud.com/a/b" }),
];
const root = process.cwd();
const mime = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css" };
const srv = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/$/, "/index.html")); fs.readFile(p, (e, d) => { if (e) { res.statusCode = 404; res.end(); return; } res.setHeader("Content-Type", mime[path.extname(p)] || "application/octet-stream"); res.end(d); }); });

srv.listen(0, async () => {
  const port = srv.address().port, errors = [];
  const vc = new VirtualConsole(); vc.on("jsdomError", (e) => errors.push(((e.detail && e.detail.message) || e.message).split("\n")[0]));
  class L extends ResourceLoader { fetch(url, o) { return url.startsWith("http://localhost:" + port) ? super.fetch(url, o) : Promise.resolve(Buffer.from("")); } }
  const dom = await JSDOM.fromURL("http://localhost:" + port + "/index.html", {
    runScripts: "dangerously", resources: new L(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.indexedDB = fi.indexedDB; w.IDBKeyRange = fi.IDBKeyRange;
      // Apps Script LAMA: filter ?kidungRef= cuma cocok PERSIS dengan isi kolom (K51 tidak ketemu).
      w.fetch = (url) => {
        const u = String(url);
        if (/script\.google\.com/.test(u) && /media_list/.test(u)) {
          const f = new URL(u).searchParams.get("kidungRef");
          const items = f ? ITEMS.filter((it) => it.kidungRef.split(",").map((x) => x.trim()).indexOf(f) !== -1) : ITEMS;
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, items }) });
        }
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve("") });
      };
      w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.HTMLMediaElement.prototype.pause = () => {}; w.HTMLMediaElement.prototype.load = () => {};
    },
  });
  await sleep(2500);
  try { await run(dom); } catch (e) { console.log("FAIL - exception", e && e.stack); ok = false; }
  finally { srv.close(); console.log(ok ? "\nALL PASS" : "\nSOME FAIL"); process.exit(ok ? 0 : 1); }
});

async function run(dom) {
  const w = dom.window, doc = w.document;
  const click = (n) => n.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  const row = (buku, no, yt) => ({ buku, noKidung: no, judul: "Judul " + buku + " " + no, pengarang: "", kategori: "", tags: [], jumlahBait: 1, linkMp3_1: "", linkMp3_2: "", linkVideo: "", linkYoutube: yt || "", linkMidi: "" });
  function setList(list) { w.__list = list; w.eval("window.getKidungList = async function (b) { return window.__list.filter(function (r) { return !b || r.buku === b; }); }"); }
  const items = () => Array.from(doc.querySelectorAll("#kidungPanel .kidung-list-item")).map((n) => n.textContent.replace(/\s+/g, " ").trim());
  const count = () => doc.querySelector("#kidungPanel .kidung-search-count").textContent.replace(/\s+/g, " ");
  const ytChip = () => Array.from(doc.querySelectorAll("#kidungPanel .kidung-book-toggle button")).find((b) => /YouTube/.test(b.textContent));

  // Buku Kidung: 51 (hanya Pustaka Media), 3 (link_youtube di Sheet), 5 & 510 (tidak boleh ikut), 130 (tanpa video)
  setList([row("Kidung", "3", "https://youtu.be/xyz"), row("Kidung", "5"), row("Kidung", "51"), row("Kidung", "130"), row("Kidung", "510")]);
  w.eval('renderKidungList("Kidung")'); await sleep(900);
  expect("daftar awal: 5 kidung", /^5 kidung$/.test(count()) && items().length === 5, [count(), items()]);
  click(ytChip()); await sleep(100);
  expect("chip YouTube: 3 (link Sheet) + 51 (K51 Pustaka Media) = 2 kidung, 5 & 510 tidak ikut", items().length === 2 && /003|^3 /.test(items()[0]) && /51 /.test(items()[1]) , [count(), items()]);
  expect("penghitung '2 dari 5 kidung yang punya YouTube'", /^2 dari 5 kidung yang punya/.test(count()), count());

  // Suplemen: S1 -> kidung 1; juga ejaan Supplemen di data
  setList([row("Supplemen", "1"), row("Supplemen", "2")]);
  w.eval("kidungListMediaFilter = '__all__'"); w.eval('renderKidungList("Supplemen")'); await sleep(900);
  click(ytChip()); await sleep(100);
  expect("Supplemen: S1 -> hanya nomor 1", items().length === 1 && /1 /.test(items()[0]), [count(), items()]);

  setList([row("Anak-anak", "1"), row("Anak-anak", "2")]);
  w.eval("kidungListMediaFilter = '__all__'"); w.eval('renderKidungList("Anak-anak")'); await sleep(900);
  click(ytChip()); await sleep(100);
  expect("Anak-anak: A1 -> hanya nomor 1 (bukan KA1)", items().length === 1 && /1 /.test(items()[0]), [count(), items()]);

  setList([row("Tambahan", "1"), row("Young People", "1"), row("Young People", "9")]);
  w.eval("kidungListMediaFilter = '__all__'"); w.eval('renderKidungList("Tambahan")'); await sleep(900);
  click(ytChip()); await sleep(100);
  expect("Tambahan: T1 tampil", items().length === 1, [count(), items()]);
  w.eval("kidungListMediaFilter = '__all__'"); w.eval('renderKidungList("Young People")'); await sleep(900);
  click(ytChip()); await sleep(100);
  expect("Young People: Y1 tampil, Y9 tidak", items().length === 1 && /1 /.test(items()[0]), [count(), items()]);

  // Soundcloud / non-YouTube tidak dihitung sebagai YouTube
  expect("item SoundCloud ber-KidungRef tidak dihitung YouTube", w.eval("isYoutubeMediaItem_({ jenis:'sound', sumber:'soundcloud', link:'https://soundcloud.com/a/b' })") === false, null);
  expect("item YouTube dikenali dari link", w.eval("isYoutubeMediaItem_({ jenis:'youtube', sumber:'', link:'https://youtu.be/abc' })") === true, null);
}
