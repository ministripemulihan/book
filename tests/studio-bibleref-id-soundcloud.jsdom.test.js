// Uji daftar video Studio (book165): filter BibleRef, urutan bawaan ID Z-A, baris SoundCloud.
// Butuh: npm i jsdom@26 fake-indexeddb ; node tests/studio-bibleref-id-soundcloud.jsdom.test.js
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
const need = (m) => { try { return require(m); } catch (e) { return require(require.resolve(m, { paths: [process.cwd(), "/tmp/jt2/node_modules", "/tmp/jsd/node_modules"] })); } };
const { JSDOM, VirtualConsole, ResourceLoader } = need("jsdom");
const fi = need("fake-indexeddb");
let ok = true;
function expect(name, cond, extra) { console.log((cond ? "PASS" : "FAIL") + " - " + name + (cond ? "" : " :: " + JSON.stringify(extra))); if (!cond) ok = false; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const yt = (n) => "https://www.youtube.com/watch?v=" + (String(n) + "xxxxxxxxxxx").slice(0, 11);
// ID sengaja dibuat panjang BEDA (kasus "string compare" yang salah urut): "9" vs "1789123527700"
const ITEMS = [
  { id: "1789123527681", jenis: "youtube", sumber: "youtube", nama: "Daud dan Goliat", channel: "C1", kategori: "Anak", link: yt("a1"), bibleRef: "", diuploadOleh: "x" },
  { id: "1789123527684", jenis: "youtube", sumber: "youtube", nama: "10 Perintah Allah", channel: "C1", kategori: "Anak", link: yt("a2"), bibleRef: "Keluaran 20", diuploadOleh: "x" },
  { id: "1789123527700", jenis: "youtube", sumber: "youtube", nama: "Markus Kasih", channel: "C2", kategori: "PPKMA", link: yt("a3"), bibleRef: "Markus 12:30-31", diuploadOleh: "x" },
  { id: "9", jenis: "youtube", sumber: "youtube", nama: "ID pendek 9", channel: "C2", kategori: "Bebas", link: yt("a4"), bibleRef: "", diuploadOleh: "x" },
  { id: "1789123527999", jenis: "youtube", sumber: "soundcloud", nama: "Lagu SoundCloud Baru", channel: "Pemulihan Music", kategori: "Bebas", link: "https://on.soundcloud.com/PWEgnDR4ORPTjWRctr", bibleRef: "Mazmur 23", diuploadOleh: "x" },
  { id: "1789123527690", jenis: "youtube", sumber: "youtube", nama: "Menara Babel", channel: "C1", kategori: "Anak", link: yt("a5"), bibleRef: "Kejadian 11", diuploadOleh: "x" },
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
      w.open = () => null;
    },
  });
  await sleep(3500);
  try { await run(dom, errors); } catch (e) { console.log("FAIL - exception", e && e.stack); ok = false; }
  finally { srv.close(); console.log(ok ? "\nALL PASS" : "\nSOME FAIL"); process.exit(ok ? 0 : 1); }
});

async function run(dom, errors) {
  const w = dom.window, doc = w.document;
  const $ = (s) => doc.querySelector(s), $$ = (s) => Array.from(doc.querySelectorAll(s));
  const titles = () => $$("#psYtPlaylistList .ps-yt-playlist-row .ps-yt-playlist-title").map((e) => e.textContent.trim());
  const setSel = (sel, v) => { sel.value = v; sel.dispatchEvent(new w.Event("change")); };

  // --- urutan bawaan: ID Z-A ---
  expect("opsi urutan bawaan = ID Z-A + ada ID A-Z", /ID Z-A/.test($('#psYtPlaylistSort option[value="terbaru"]').textContent) && !!$('#psYtPlaylistSort option[value="id_az"]'), null);
  const t0 = titles();
  expect("6 baris tampil (YouTube + SoundCloud)", t0.length === 6, t0);
  expect("ID Z-A: terbesar dulu (SoundCloud ...999, Markus ...700, Menara ...690, 10 Perintah ...684, Daud ...681), ID pendek '9' PALING bawah",
    JSON.stringify(t0) === JSON.stringify(["Lagu SoundCloud Baru", "Markus Kasih", "Menara Babel", "10 Perintah Allah", "Daud dan Goliat", "ID pendek 9"]), t0);
  setSel($("#psYtPlaylistSort"), "id_az"); await sleep(150);
  const t1 = titles();
  expect("ID A-Z: kebalikannya (ID pendek '9' dulu)", t1[0] === "ID pendek 9" && t1[5] === "Lagu SoundCloud Baru", t1);
  setSel($("#psYtPlaylistSort"), "terbaru"); await sleep(150);

  // --- SoundCloud masuk daftar ---
  const scRow = $$("#psYtPlaylistList .ps-yt-playlist-row").find((r) => /Lagu SoundCloud Baru/.test(r.textContent));
  expect("baris SoundCloud: ikon 🎧, label SoundCloud + channel, tombol Tampilkan/Pratinjau/Kumpulan, tanpa Latar",
    !!scRow && !!scRow.querySelector(".ps-yt-playlist-thumb-sc") && /SoundCloud · Pemulihan Music/.test(scRow.textContent) && !!scRow.querySelector('[data-act="show"]') && !!scRow.querySelector('[data-act="preview"]') && !!scRow.querySelector('[data-act="addcol"]') && !scRow.querySelector('[data-act="bg"]'), scRow && scRow.textContent);
  scRow.querySelector('[data-act="show"]').dispatchEvent(new w.MouseEvent("click", { bubbles: true })); await sleep(150);
  expect("Tampilkan SoundCloud -> pratinjau Studio menyebut SoundCloud + judul", /SoundCloud: Lagu SoundCloud Baru/.test(doc.body.textContent), null);

  // --- label BibleRef di baris ---
  const mk = $$("#psYtPlaylistList .ps-yt-playlist-row").find((r) => /Markus Kasih/.test(r.textContent));
  expect("label BibleRef tampil di baris (📖 Markus 12:30-31)", !!mk && /📖 Markus 12:30-31/.test(mk.textContent), mk && mk.textContent);

  // --- filter BibleRef ---
  const fb = $("#psYtPlaylistFilterBibleRef");
  expect("dropdown 'Semua BibleRef' ada", !!fb && /Semua BibleRef/.test(fb.options[0].textContent), fb && fb.options[0].textContent);
  const opts = Array.from(fb.options).map((o) => o.textContent.trim());
  expect("opsi: Ada (4) / Tanpa (2) / per kitab urut Alkitab (Kejadian, Keluaran, Mazmur, Markus)",
    /Ada BibleRef \(4\)/.test(opts[1]) && /Tanpa BibleRef \(2\)/.test(opts[2]) && /Kejadian \(1\)/.test(opts[3]) && /Keluaran \(1\)/.test(opts[4]) && /Mazmur \(1\)/.test(opts[5]) && /Markus \(1\)/.test(opts[6]), opts);
  setSel(fb, Array.from(fb.options).find((o) => /^Keluaran/.test(o.textContent.trim())).value); await sleep(200);
  expect("pilih Keluaran -> hanya '10 Perintah Allah'", JSON.stringify(titles()) === JSON.stringify(["10 Perintah Allah"]), titles());
  setSel(fb, "__none"); await sleep(200);
  expect("Tanpa BibleRef -> Daud dan Goliat & ID pendek 9", JSON.stringify(titles().sort()) === JSON.stringify(["Daud dan Goliat", "ID pendek 9"]), titles());
  setSel(fb, "__any"); await sleep(200);
  expect("Ada BibleRef -> 4 baris (termasuk SoundCloud Mazmur 23)", titles().length === 4 && titles().indexOf("Lagu SoundCloud Baru") !== -1, titles());
  $("#psYtPlaylistFilterClear").dispatchEvent(new w.MouseEvent("click", { bubbles: true })); await sleep(200);
  expect("Bersihkan Semua Filter -> BibleRef kembali & 6 baris", fb.value === "" && titles().length === 6, [fb.value, titles().length]);

  // --- pencarian ketik ikut BibleRef ---
  const q = $("#psYtPlaylistSearch"); q.value = "markus 12"; q.dispatchEvent(new w.Event("input")); await sleep(200);
  expect("cari 'markus 12' -> ketemu lewat BibleRef", JSON.stringify(titles()) === JSON.stringify(["Markus Kasih"]), titles());
  q.value = ""; q.dispatchEvent(new w.Event("input")); await sleep(150);

  // --- antrean "Ulang Semua" tidak memuat SoundCloud: klik Tampilkan YouTube tidak error ---
  const ytRow = $$("#psYtPlaylistList .ps-yt-playlist-row").find((r) => /Markus Kasih/.test(r.textContent));
  ytRow.querySelector('[data-act="show"]').dispatchEvent(new w.MouseEvent("click", { bubbles: true })); await sleep(150);

  const bad = errors.filter((e) => !/Could not load|not implemented|Not implemented|navigation/i.test(e));
  expect("tidak ada error skrip", bad.length === 0, bad);
}
