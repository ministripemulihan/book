// Uji panel 🎵 Pustaka Media memakai daftar tersimpan (3 Okt 2026): tampil duluan / offline, hanya di KOMPUTER.
// Butuh: npm i jsdom@26 fake-indexeddb ;  node tests/pustaka-offline-list.jsdom.test.js
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
const need = (m) => { try { return require(m); } catch (e) { return require(require.resolve(m, { paths: [process.cwd(), "/tmp/jt2/node_modules"] })); } };
const { JSDOM, VirtualConsole, ResourceLoader } = need("jsdom");
const fi = need("fake-indexeddb");
let ok = true;
function expect(name, cond, extra) { console.log((cond ? "PASS" : "FAIL") + " - " + name + (cond ? "" : " :: " + JSON.stringify(extra))); if (!cond) ok = false; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const N = 300;
const ITEMS = Array.from({ length: N }, (_, i) => ({ id: "m" + i, jenis: i % 5 === 0 ? "sound" : "youtube", sumber: i % 5 === 0 ? "drive" : "youtube", nama: "Item " + i, channel: "Ch" + (i % 7), keterangan: "", kategori: "Anak", link: i % 5 === 0 ? "https://example.com/a" + i + ".mp3" : "https://youtu.be/" + ("v" + i).padEnd(11, "x"), kidungRef: "", diuploadOleh: "x" }));
const root = process.cwd();
const mime = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css" };
const srv = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/$/, "/index.html")); fs.readFile(p, (e, d) => { if (e) { res.statusCode = 404; return res.end(); } res.setHeader("content-type", mime[path.extname(p)] || "application/octet-stream"); res.end(d); }); });
let IDB = fi;
const DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36";
const MOBILE_UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) Chrome/120 Mobile Safari/537.36";
async function boot(port, mode, ua) {
  const vc = new VirtualConsole(); vc.on("jsdomError", () => {});
  class L extends ResourceLoader { fetch(url, o) { return url.startsWith("http://localhost:" + port) ? super.fetch(url, o) : Promise.resolve(Buffer.from("")); } }
  return JSDOM.fromURL("http://localhost:" + port + "/index.html", {
    runScripts: "dangerously", resources: new L({ userAgent: ua }), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.indexedDB = IDB.indexedDB; w.IDBKeyRange = IDB.IDBKeyRange;
      w.fetch = (url) => {
        const isList = /script\.google\.com/.test(String(url)) && /media_list/.test(String(url));
        if (!isList) return Promise.reject(new Error("no network"));
        if (mode === "online") return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, items: ITEMS }) });
        if (mode === "hang") return new Promise(() => {});
        return Promise.reject(new TypeError("Failed to fetch"));
      };
      w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.HTMLMediaElement.prototype.pause = () => {}; w.HTMLMediaElement.prototype.load = () => {};
    },
  }).then(async (dom) => { await sleep(800); dom.window.eval("MediaLibrary.open()"); return dom; });
}
const cards = (dom) => dom.window.document.querySelectorAll("#mlBody .ml-card").length;
const notice = (dom) => { const e = dom.window.document.getElementById("mlNotice"); return e ? e.textContent : ""; };
const body = (dom) => dom.window.document.getElementById("mlBody").textContent;

srv.listen(0, async () => {
  const port = srv.address().port;
  try {
    let dom = await boot(port, "online", DESKTOP_UA); await sleep(2500);
    expect("komputer online: kartu tampil", cards(dom) > 0, cards(dom));
    const all = await dom.window.eval("MediaLibrary.Sync.cachedList({})");
    expect("komputer: daftar SEMUA jenis tersimpan (" + N + ")", all && all.items.length === N, all && all.items && all.items.length);
    dom.window.close();

    dom = await boot(port, "offline", DESKTOP_UA); await sleep(2500);
    expect("komputer offline: kartu tetap tampil", cards(dom) > 0, [cards(dom), body(dom).slice(0, 80)]);
    expect("komputer offline: bar 📴 tampil", /📴/.test(notice(dom)), notice(dom));
    dom.window.close();

    dom = await boot(port, "hang", DESKTOP_UA); await sleep(2500);
    expect("jaringan macet: daftar tersimpan tampil duluan (📂)", cards(dom) > 0 && /📂/.test(notice(dom)), [cards(dom), notice(dom)]);
    dom.window.close();

    // HP: cache tidak dipakai (perilaku lama) -> offline = gagal
    IDB = { indexedDB: new fi.IDBFactory(), IDBKeyRange: fi.IDBKeyRange };
    dom = await boot(port, "online", MOBILE_UA); await sleep(2500);
    const mob = await dom.window.eval("MediaLibrary.Sync.cachedList({})");
    expect("HP: daftar TIDAK disimpan", mob === null, mob && mob.items && mob.items.length);
    dom.window.close();
    dom = await boot(port, "offline", MOBILE_UA); await sleep(2500);
    expect("HP offline: pesan gagal (tidak ada daftar tersimpan)", /Gagal memuat/.test(body(dom)) && cards(dom) === 0, body(dom).slice(0, 100));
    dom.window.close();

    // Komputer baru, belum pernah online, offline
    IDB = { indexedDB: new fi.IDBFactory(), IDBKeyRange: fi.IDBKeyRange };
    dom = await boot(port, "offline", DESKTOP_UA); await sleep(2500);
    expect("komputer tanpa cache & offline: pesan + petunjuk buka sekali online", /Gagal memuat/.test(body(dom)) && /online/i.test(body(dom)), body(dom).slice(0, 160));
    dom.window.close();
  } catch (e) { console.log("FAIL - exception", e && e.stack); ok = false; }
  finally { srv.close(); console.log(ok ? "\nALL PASS" : "\nSOME FAIL"); process.exit(ok ? 0 : 1); }
});
