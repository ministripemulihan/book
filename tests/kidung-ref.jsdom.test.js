// Uji kolom KidungRef di daftar Video YouTube Studio (K130 / S130 / KA13),
// memuat index.html ASLI di jsdom.  Butuh: npm i jsdom fake-indexeddb
// Jalankan: node tests/kidung-ref.jsdom.test.js
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
const need = (m) => { try { return require(m); } catch (e) { return require(require.resolve(m, { paths: [process.cwd(), "/tmp/jt2/node_modules", "/tmp/jt/node_modules"] })); } };
const { JSDOM, VirtualConsole, ResourceLoader } = need("jsdom");
const fi = need("fake-indexeddb");

let ok = true;
function expect(name, cond, extra) { console.log((cond ? "PASS" : "FAIL") + " - " + name + (cond ? "" : " :: " + JSON.stringify(extra))); if (!cond) ok = false; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Jalur PRODUKSI: Pustaka Media (apps-script/MediaLibraryCode.gs) -> media_list
const ITEMS = [
  { id: "1", jenis: "youtube", nama: "Lagu A", channel: "Ch1", kategori: "Bebas", link: "https://youtu.be/AAAAAAAAAAA", kidungRef: "K130, S5" },
  { id: "2", jenis: "youtube", nama: "Lagu B", channel: "Ch1", kategori: "Anak", link: "https://youtu.be/BBBBBBBBBBB", kidungRef: "KA13" },
  { id: "3", jenis: "youtube", nama: "Lagu C", channel: "Ch2", kategori: "Bebas", link: "https://youtu.be/CCCCCCCCCCC", kidungRef: "Doa pembuka" },
  { id: "4", jenis: "youtube", nama: "Lagu D", channel: "Ch2", kategori: "Bebas", link: "https://youtu.be/DDDDDDDDDDD", kidungRef: "Kidung|130" },
  { id: "5", jenis: "youtube", nama: "Lagu E", channel: "Ch2", kategori: "Bebas", link: "https://youtu.be/EEEEEEEEEEE", kidungRef: "" },
];

const root = process.cwd();
const mime = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css" };
const srv = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/$/, "/index.html"));
  fs.readFile(p, (e, d) => { if (e) { res.statusCode = 404; return res.end(); } res.setHeader("content-type", mime[path.extname(p)] || "application/octet-stream"); res.end(d); });
});

srv.listen(0, async () => {
  const port = srv.address().port;
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(((e.detail && e.detail.message) || e.message).split("\n")[0]));
  class L extends ResourceLoader { fetch(url, o) { return url.startsWith("http://localhost:" + port) ? super.fetch(url, o) : Promise.resolve(Buffer.from("")); } }
  const dom = await JSDOM.fromURL("http://localhost:" + port + "/index.html", {
    runScripts: "dangerously", resources: new L(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.indexedDB = fi.indexedDB; w.IDBKeyRange = fi.IDBKeyRange;
      w.fetch = (url) => /script\.google\.com/.test(String(url)) && /media_list/.test(String(url))
        ? Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, items: ITEMS }) })
        : Promise.reject(new Error("no network"));
      w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.HTMLMediaElement.prototype.pause = () => {}; w.HTMLMediaElement.prototype.load = () => {};
    },
  });
  await sleep(3000);
  try { await run(dom, errors); } catch (e) { console.log("FAIL - exception", e && e.stack); ok = false; }
  finally { srv.close(); console.log(ok ? "\nALL PASS" : "\nSOME FAIL"); process.exit(ok ? 0 : 1); }
});

async function run(dom, errors) {
  const w = dom.window, doc = w.document;
  const $ = (s) => doc.querySelector(s), $$ = (s) => Array.from(doc.querySelectorAll(s));
  const click = (n) => n.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  expect("js/kidung-ref.js dimuat index.html", typeof w.KidungRef === "object");

  click(doc.getElementById("psYtPlaylistReloadBtn"));
  await sleep(600);

  const rows = $$("#psYtPlaylistList .ps-yt-playlist-row");
  expect("5 video termuat", rows.length === 5, rows.length);
  const rowOf = (title) => rows.find((r) => r.textContent.includes(title));
  const chips = (r) => Array.from(r.querySelectorAll(".ps-yt-ref-chip")).map((c) => c.textContent.replace("🎵", "").trim());
  expect("Lagu A: chip K130 + S5", JSON.stringify(chips(rowOf("Lagu A"))) === '["K130","S5"]', chips(rowOf("Lagu A")));
  expect("Lagu B: chip KA13", JSON.stringify(chips(rowOf("Lagu B"))) === '["KA13"]', chips(rowOf("Lagu B")));
  expect("Lagu C: tulisan biasa, TANPA tombol", chips(rowOf("Lagu C")).length === 0 && !!rowOf("Lagu C").querySelector(".ps-yt-ref-text") && rowOf("Lagu C").querySelector(".ps-yt-ref-text").textContent === "Doa pembuka", null);
  expect("Lagu D (format lama Kidung|130) tampil sebagai K130", JSON.stringify(chips(rowOf("Lagu D"))) === '["K130"]', chips(rowOf("Lagu D")));
  expect("Lagu E (kosong): tidak ada baris referensi", !rowOf("Lagu E").querySelector(".ps-yt-playlist-refs"), null);

  // dropdown filter per kode
  const sel = doc.getElementById("psYtPlaylistFilterKidungRef");
  const opts = Array.from(sel.options).map((o) => o.textContent);
  expect("dropdown KidungRef: 1 pilihan per kode, jumlah benar (K130 = 2 video)", ["K130 (2)", "KA13 (1)", "S5 (1)", "Doa pembuka (1)"].every((x) => opts.includes(x)), opts);
  sel.value = "kidung|130"; sel.dispatchEvent(new w.Event("change", { bubbles: true }));
  const filtered = $$("#psYtPlaylistList .ps-yt-playlist-row");
  expect("filter K130 -> Lagu A & D saja", filtered.length === 2 && filtered.every((r) => /Lagu [AD]/.test(r.textContent)), filtered.map((r) => r.textContent.slice(0, 20)));
  click(doc.getElementById("psYtPlaylistFilterClear"));
  expect("bersihkan filter -> 5 video lagi", $$("#psYtPlaylistList .ps-yt-playlist-row").length === 5, null);

  // stub sumber data kidung
  w.eval("window.__calls = []; window.__alerts = [];");
  w.alert = (m) => w.eval("window.__alerts.push(" + JSON.stringify(String(m)) + ")");
  w.eval(`openKidungByKeypad = async function (buku, no) {
    window.__calls.push(buku + "|" + no);
    if (no === "999") return null;
    return { meta: { buku: buku, noKidung: String(no), judul: "Judul Uji " + buku + " " + no, pengarang: "", birama: "", jumlahBait: 1 },
             baits: [{ noBait: "1", teks: "Bait satu", koorGroup: null, koorTeks: null }] };
  };`);
  w.KidungAnak.getBaitsForPresentation = async (no) => {
    w.eval("window.__calls.push('KA|" + no + "')");
    return String(no) === "999" ? null : { song: { No: no, Judul: "Anak Uji", Syair: "x" }, baits: [{ noBait: "1", teks: "Bait anak", koorGroup: null, koorTeks: null }] };
  };
  const calls = () => w.eval("window.__calls.slice()");
  const midPanelVisible = () => !$('[data-ps-mid-panel="kidung"]').hidden;
  const detailTitle = () => doc.getElementById("psKidungDetailTitle").textContent;
  const chipOf = (title, label) => Array.from(rowOf2(title).querySelectorAll(".ps-yt-ref-chip")).find((c) => c.textContent.includes(label));
  const rowOf2 = (title) => $$("#psYtPlaylistList .ps-yt-playlist-row").find((r) => r.textContent.includes(title));

  expect("awal: tab Kidung belum aktif", !midPanelVisible(), null);
  click(chipOf("Lagu A", "K130")); await sleep(300);
  expect("klik K130 -> openKidungByKeypad('Kidung','130')", calls().slice(-1)[0] === "Kidung|130", calls());
  expect("klik K130 -> pindah ke tab Kidung, detail tampil, judul memuat No. 130", midPanelVisible() && !doc.getElementById("psKidungDetail").hidden && /130/.test(detailTitle()) && /Judul Uji Kidung 130/.test(detailTitle()), { visible: midPanelVisible(), title: detailTitle() });
  expect("slide bait muncul di daftar", $$("#psKidungSlideList .ps-verse-row").length >= 1, $$("#psKidungSlideList .ps-verse-row").length);

  click(chipOf("Lagu A", "S5")); await sleep(300);
  expect("klik S5 -> openKidungByKeypad('Suplemen','5')", calls().slice(-1)[0] === "Suplemen|5", calls());

  click(chipOf("Lagu B", "KA13")); await sleep(300);
  expect("klik KA13 -> lewat jembatan Kidung Anak (bukan openKidungByKeypad)", calls().slice(-1)[0] === "KA|13", calls());
  expect("judul detail = Kidung Anak 13 — Anak Uji", /Kidung Anak 13/.test(detailTitle()) && /Anak Uji/.test(detailTitle()), detailTitle());
  expect("slide Kidung Anak muncul", $$("#psKidungSlideList .ps-verse-row").length >= 1, null);

  const before = calls().length;
  click(rowOf2("Lagu C").querySelector(".ps-yt-ref-text"));
  await sleep(100);
  expect("klik tulisan biasa -> tidak membuka apa pun", calls().length === before, calls());

  // nomor tidak ada -> pesan jelas, tidak crash
  w.eval("window.__alerts.length = 0");
  click(rowOf2("Lagu A").querySelector('.ps-yt-ref-chip[data-buku="Kidung"]')); // K130 ada -> tidak ada alert
  await sleep(200);
  expect("kidung yang ada -> tidak ada peringatan", w.eval("window.__alerts.length") === 0, w.eval("window.__alerts"));
  w.eval("openKidungByKeypad = async function () { return null; }");
  click(rowOf2("Lagu D").querySelector(".ps-yt-ref-chip")); await sleep(200);
  expect("kidung tidak ditemukan -> alert 'tidak ditemukan' (bukan diam / crash)", /tidak ditemukan/.test(w.eval("window.__alerts.join(' ')")), w.eval("window.__alerts"));

  const realErrors = [...new Set(errors)].filter((e) => !/canvas|getContext|Not implemented|navigation/i.test(e));
  expect("tidak ada error JS tak terduga saat semua interaksi", realErrors.length === 0, realErrors);
}
