// Uji layar baca kidung: video ber-KidungRef (K51, S1, A1, T1, KA1, Kidung|51) harus tampil
// walau Apps Script LAMA (yang hanya cocok persis "Kidung|51") belum di-deploy ulang.
// Butuh: npm i jsdom@22 fake-indexeddb ;  node tests/kidung-ref-front.jsdom.test.js
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
  yt("v2", "Video lama", "Kidung|51"),
  yt("v3", "Video K51 nol", "k 051, S1"),
  yt("v4", "Video Suplemen 1", "S1"),
  yt("v5", "Video Anak 1", "A1"),
  yt("v6", "Video Tambahan 1", "T1"),
  yt("v7", "Video KA1", "KA1"),
  yt("v8", "Video K510", "K510"),
  yt("v9", "Video tanpa ref", ""),
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
  async function titlesFor(meta) {
    w.__m = meta;
    w.eval("window.__sec = buildKidungMediaRefSection(window.__m); document.body.appendChild(window.__sec);");
    await sleep(500);
    const t = Array.from(w.__sec.querySelectorAll(".ml-card-title")).map((n) => n.textContent).sort().join(",");
    const empty = !!w.__sec.querySelector(".ml-empty");
    w.__sec.remove();
    return { t, empty };
  }
  expect("fungsi buildKidungMediaRefSection ada", typeof w.buildKidungMediaRefSection === "function", null);
  expect("MediaLibrary aktif (URL Apps Script terisi)", w.eval("MediaLibrary.Sync.enabled()") === true, null);

  let r = await titlesFor({ buku: "Kidung", noKidung: "51", judul: "x" });
  expect("Kidung 51: K51, Kidung|51, 'k 051' tampil (Apps Script lama tidak mengenal K51)", r.t === "Video K51,Video K51 nol,Video lama", r);
  r = await titlesFor({ buku: "Kidung", noKidung: "051", judul: "x" });
  expect("Nomor '051' sama dengan 51", r.t === "Video K51,Video K51 nol,Video lama", r);
  r = await titlesFor({ buku: "Suplemen", noKidung: "1", judul: "x" });
  expect("Suplemen 1: S1 (2 video)", r.t === "Video K51 nol,Video Suplemen 1", r);
  r = await titlesFor({ buku: "Supplemen", noKidung: "1", judul: "x" });
  expect("Nama buku 'Supplemen' (ejaan Sheet) tetap cocok S1", r.t === "Video K51 nol,Video Suplemen 1", r);
  r = await titlesFor({ buku: "Anak-anak", noKidung: "1", judul: "x" });
  expect("Anak-anak 1: A1", r.t === "Video Anak 1", r);
  r = await titlesFor({ buku: "Tambahan", noKidung: "1", judul: "x" });
  expect("Tambahan 1: T1", r.t === "Video Tambahan 1", r);
  r = await titlesFor({ buku: "Kidung", noKidung: "5", judul: "x" });
  expect("Kidung 5 tidak ikut K51 / K510", r.empty && r.t === "", r);
  r = await titlesFor({ buku: "Kidung", noKidung: "1", judul: "x" });
  expect("Kidung 1 tidak ikut KA1 (Kidung Anak berbeda)", r.empty && r.t === "", r);
  const KR = w.KidungRef;
  expect("refersTo: KA1 hanya untuk Kidung Anak", KR.refersTo("KA1", "Kidung Anak", 1) && !KR.refersTo("KA1", "Kidung", 1), null);
}
