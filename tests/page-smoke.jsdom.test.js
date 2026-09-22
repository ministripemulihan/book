// Uji "halaman sungguhan": memuat index.html + semua skrip lokal di jsdom (server lokal),
// lalu memeriksa integrasi Audio Latar.  Jalankan:  node tests/page-smoke.jsdom.test.js
// Butuh:  npm i jsdom fake-indexeddb
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
const need = (m) => { try { return require(m); } catch (e) { return require(require.resolve(m, { paths: [process.cwd(), "/tmp/lint/node_modules"] })); } };
const { JSDOM, VirtualConsole, ResourceLoader } = need("jsdom");
const fi = need("fake-indexeddb");
const root = path.join(__dirname, "..");
const mime = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json" };
process.on("unhandledRejection", () => {});
let ok = true;
function expect(name, cond, extra) { console.log((cond ? "PASS" : "FAIL") + " - " + name + (cond ? "" : " :: " + JSON.stringify(extra))); if (!cond) ok = false; }

const srv = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/$/, "/index.html"));
  fs.readFile(p, (e, d) => { if (e) { res.statusCode = 404; return res.end(); } res.setHeader("content-type", mime[path.extname(p)] || "application/octet-stream"); res.end(d); });
}).listen(0, async () => {
  const port = srv.address().port; const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(((e.detail && e.detail.message) || e.message).split("\n")[0]));
  class Loader extends ResourceLoader { fetch(url, o) { return url.startsWith("http://localhost:" + port) ? super.fetch(url, o) : Promise.resolve(Buffer.from("")); } }
  const dom = await JSDOM.fromURL("http://localhost:" + port + "/index.html", { runScripts: "dangerously", resources: new Loader(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) { w.indexedDB = fi.indexedDB; w.IDBKeyRange = fi.IDBKeyRange; w.fetch = () => Promise.reject(new Error("no network")); w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }); w.HTMLCanvasElement.prototype.getContext = () => null; w.scrollTo = () => {}; w.IntersectionObserver = class { observe() {} disconnect() {} }; w.ResizeObserver = class { observe() {} disconnect() {} }; w.HTMLMediaElement.prototype.play = () => Promise.resolve(); w.HTMLMediaElement.prototype.pause = () => {}; } });
  setTimeout(async () => {
    const w = dom.window;
    expect("halaman termuat tanpa galat skrip", errors.length === 0, errors.slice(0, 5));
    expect("modul & dialog & sumber terdaftar", typeof w.BgAudioModule === "object" && typeof w.BgAudioDialog === "object" && w.eval("BgAudioDialog.open.length >= 0"), null);
    // ---- kolom Sheet link_soundcloud sampai ke data kidung ----
    const rec = w.eval(`(function(){
      const rows = parseCSV("buku,no_kidung,judul,urutan,jenis,no_bait,teks,link_mp3_1,link_soundcloud\\nKidung,516,Hiburan,1,bait,1,Sandar Yesus,http://a/x.mp3,https://on.soundcloud.com/abc\\nKidung,516,,2,bait,2,Asal Tuhan,,\\n").map(normalizeKidungRecord).filter(r => r.noKidung);
      const f = forwardFillKidungRows(rows);
      return JSON.stringify(f.map(r => [r.noKidung, r.linkSoundcloud, r.linkMp3_1]));
    })()`);
    expect("kolom link_soundcloud terbaca & diteruskan ke baris bait berikutnya", rec === '[["516","https://on.soundcloud.com/abc","http://a/x.mp3"],["516","https://on.soundcloud.com/abc","http://a/x.mp3"]]', rec);
    const noCol = w.eval(`JSON.stringify(parseCSV("buku,no_kidung,judul,urutan,jenis,no_bait,teks\\nKidung,1,A,1,bait,1,x\\n").map(normalizeKidungRecord).map(r=>r.linkSoundcloud))`);
    expect("tanpa kolom link_soundcloud -> kosong, tidak error", noCol === '[""]', noCol);
    // ---- simpan audio: satu item & banyak item (satu kali tulis) ----
    const res = w.eval(`(function(){
      const u = "uji"; const name = "Kumpulan Uji";
      const mk = (no, i) => ({ buku: "Kidung", kidungNo: String(no), title: "K" + no, bait: [{ noBait: i, teks: "t" + i }] });
      addKidungToCollection(u, name, mk(516, 1)); addKidungToCollection(u, name, mk(516, 2)); addKidungToCollection(u, name, mk(516, 3)); addKidungToCollection(u, name, mk(7, 1));
      const cols = loadCollections(u); const id = Object.keys(cols)[0];
      const bg = { kind: "sc", url: "https://on.soundcloud.com/abc", source: "kidung", managed: true, armStart: true, applyToGroup: true };
      const changes = cols[id].items.map((x, i) => x.kidungNo === "516" ? { index: i, bgAudio: bg } : null).filter(Boolean);
      const n = updateItemsBgAudioInCollection(u, id, changes);
      const after = loadCollections(u)[id].items.map(x => x.bgAudio);
      updateItemBgAudioInCollection(u, id, 0, { kind: "midi", url: "upload:abc", source: "upload", mediaId: "abc", managed: true });
      const one = loadCollections(u)[id].items[0].bgAudio;
      return JSON.stringify({ n, kinds: after.map(a => a && a.kind), managed: after.map(a => a && a.managed), noExtra: after.every(a => !a || !("applyToGroup" in a)), one });
    })()`);
    const r = JSON.parse(res);
    expect("simpan massal: 3 slide kidung yang sama berubah, kidung lain tidak", r.n === 3 && JSON.stringify(r.kinds) === '["sc","sc","sc",null]', r);
    expect("tersimpan sebagai managed & tanpa properti sementara", r.managed.slice(0, 3).every(Boolean) && r.noExtra, r);
    expect("upload/midi tersimpan lengkap (source, mediaId, kind)", r.one.kind === "midi" && r.one.source === "upload" && r.one.mediaId === "abc" && r.one.url === "upload:abc", r.one);
    // ---- pustaka upload memakai LocalDB (IndexedDB) sungguhan (fake-indexeddb): tulis, daftar, hapus ----
    const lib = await w.eval(`(async () => {
      const L = BgAudioLibrary;
      const fake = (name, size, type) => ({ name, size, type }); // objek biasa (Blob jsdom tidak bisa di-clone fake-indexeddb); alur IndexedDB yang diuji
      const e1 = await L.add("uji", fake("Tenang.mp3", 1234, "audio/mpeg"));
      const e2 = await L.add("uji", fake("Lain.ogg", 10, "audio/ogg"));
      const daftar = (await L.list("uji")).map((x) => x.name).sort();
      const lain = (await L.list("orang-lain")).length;
      const got = await LocalDB.getMeta("bgaudio:file:" + e1.id);
      await L.remove("uji", e1.id);
      const after = (await L.list("uji")).map((x) => x.name);
      const gone = await LocalDB.getMeta("bgaudio:file:" + e1.id);
      return JSON.stringify({ daftar, lain, ada: !!got, after, gone, total: await L.totalBytes("uji") });
    })()`);
    const lb = JSON.parse(lib);
    expect("pustaka upload di IndexedDB: tulis & daftar per pengguna", JSON.stringify(lb.daftar) === '["Lain","Tenang"]' && lb.lain === 0 && lb.ada, lb);
    expect("pustaka upload: hapus benar-benar menghapus berkas & indeks (deleteMeta)", JSON.stringify(lb.after) === '["Lain"]' && lb.gone === null && lb.total === 10, lb);
    srv.close(); console.log(ok ? "\nALL PASS" : "\nSOME FAIL"); process.exit(ok ? 0 : 1);
  }, 4500);
});
