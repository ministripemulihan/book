// Uji daftar YouTube Studio (2 Okt 2026): tersimpan untuk offline & tampil duluan.
// Butuh: npm i jsdom@26 fake-indexeddb ;  node tests/studio-youtube-offline.jsdom.test.js
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
const need = (m) => { try { return require(m); } catch (e) { return require(require.resolve(m, { paths: [process.cwd(), "/tmp/jt2/node_modules"] })); } };
const { JSDOM, VirtualConsole, ResourceLoader } = need("jsdom");
const fi = need("fake-indexeddb");
let ok = true;
function expect(name, cond, extra) { console.log((cond ? "PASS" : "FAIL") + " - " + name + (cond ? "" : " :: " + JSON.stringify(extra))); if (!cond) ok = false; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const N = 900; // mendekati 800+ baris sungguhan
const ITEMS = Array.from({ length: N }, (_, i) => ({ id: "m" + i, jenis: "youtube", sumber: "youtube", nama: "Lagu " + i, channel: "Ch" + (i % 7), keterangan: "", kategori: i % 2 ? "Anak" : "Bebas", link: "https://youtu.be/" + ("v" + i).padEnd(11, "x"), kidungRef: "", diuploadOleh: "x" }));

const root = process.cwd();
const mime = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css" };
const srv = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/$/, "/index.html")); fs.readFile(p, (e, d) => { if (e) { res.statusCode = 404; return res.end(); } res.setHeader("content-type", mime[path.extname(p)] || "application/octet-stream"); res.end(d); }); });

let IDB = fi; // bisa diganti dengan peramban "baru" (tanpa cache)
async function boot(port, mode) {
  const errors = [];
  const vc = new VirtualConsole(); vc.on("jsdomError", (e) => errors.push(((e.detail && e.detail.message) || e.message).split("\n")[0]));
  class L extends ResourceLoader { fetch(url, o) { return url.startsWith("http://localhost:" + port) ? super.fetch(url, o) : Promise.resolve(Buffer.from("")); } }
  const dom = await JSDOM.fromURL("http://localhost:" + port + "/index.html", {
    runScripts: "dangerously", resources: new L(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.indexedDB = IDB.indexedDB; w.IDBKeyRange = IDB.IDBKeyRange; // dibagi antar "kunjungan" = IndexedDB perangkat yang sama
      w.fetch = (url) => {
        const isList = /script\.google\.com/.test(String(url)) && /media_list/.test(String(url));
        if (!isList) return Promise.reject(new Error("no network"));
        if (mode === "online") return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, items: ITEMS }) });
        if (mode === "hang") return new Promise(() => {});
        return Promise.reject(new TypeError("Failed to fetch")); // offline
      };
      w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.HTMLMediaElement.prototype.pause = () => {}; w.HTMLMediaElement.prototype.load = () => {};
    },
  });
  return { dom, errors };
}
const rows = (dom) => dom.window.document.querySelectorAll("#psYtPlaylistList .ps-yt-playlist-row, .ps-yt-playlist-row").length;
const status = (dom) => { const e = dom.window.document.getElementById("psYtPlaylistStatus"); return e ? e.textContent : ""; };

srv.listen(0, async () => {
  const port = srv.address().port;
  try {
    // 1) Kunjungan ONLINE pertama -> daftar tampil + tersimpan
    let { dom } = await boot(port, "online"); await sleep(3000);
    expect("online: daftar tampil (halaman pertama)", rows(dom) > 0, rows(dom));
    expect("online: status ✅ jumlah video", new RegExp("✅ " + N + " video").test(status(dom)), status(dom));
    const cached = await dom.window.eval("MediaLibrary.Sync.cachedList({jenis:'youtube'})");
    expect("cache IndexedDB terisi " + N + " baris", cached && cached.items.length === N && cached.savedAt > 0, cached && cached.items && cached.items.length);
    dom.window.close();

    // 2) Kunjungan OFFLINE -> daftar tetap tampil dari cache
    ({ dom } = await boot(port, "offline")); await sleep(3000);
    expect("offline: daftar tetap tampil", rows(dom) > 0, [rows(dom), status(dom)]);
    expect("offline: status 📴 + jumlah " + N, /📴/.test(status(dom)) && new RegExp(N + " video").test(status(dom)), status(dom));
    expect("offline: tombol kategori (Anak/Bebas) tetap ada dari cache", /Anak/.test(dom.window.document.getElementById("psYtPlaylistFilters") ? dom.window.document.getElementById("psYtPlaylistFilters").textContent : dom.window.document.body.textContent), null);
    dom.window.close();

    // 3) Jaringan MACET (tidak pernah menjawab) -> daftar tersimpan tampil DULUAN
    ({ dom } = await boot(port, "hang")); await sleep(3000);
    expect("jaringan macet: daftar sudah tampil duluan dari cache", rows(dom) > 0 && /📂/.test(status(dom)), [rows(dom), status(dom)]);
    dom.window.close();

    // 4) Tanpa cache & offline -> pesan jelas (tidak error)
    IDB = { indexedDB: new fi.IDBFactory(), IDBKeyRange: fi.IDBKeyRange }; // perangkat baru, belum ada cache
    ({ dom } = await boot(port, "offline")); await sleep(3000);
    expect("tanpa cache & offline: pesan gagal + petunjuk buka sekali saat online", /❌/.test(status(dom)) && /online/i.test(status(dom)) && rows(dom) === 0, status(dom));
    dom.window.close();
  } catch (e) { console.log("FAIL - exception", e && e.stack); ok = false; }
  finally { srv.close(); console.log(ok ? "\nALL PASS" : "\nSOME FAIL"); process.exit(ok ? 0 : 1); }
});
