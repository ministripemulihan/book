// Uji Pustaka Media tab YouTube: total, 5 filter, pencarian, tombol kidung (lihat isi / buka menu Kidung).
// Butuh: npm i jsdom@26 fake-indexeddb ;  node tests/pustaka-kidungref.jsdom.test.js
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
const need = (m) => { try { return require(m); } catch (e) { return require(require.resolve(m, { paths: [process.cwd(), "/tmp/jt2/node_modules"] })); } };
const { JSDOM, VirtualConsole, ResourceLoader } = need("jsdom");
const fi = need("fake-indexeddb");
let ok = true;
function expect(name, cond, extra) { console.log((cond ? "PASS" : "FAIL") + " - " + name + (cond ? "" : " :: " + JSON.stringify(extra))); if (!cond) ok = false; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const yt = (id, nama, channel, kategori, kidungRef, sumber, ket) => ({ id, jenis: "youtube", sumber: sumber || "youtube", nama, channel, keterangan: ket || "", kategori, link: "https://youtu.be/" + id.padEnd(11, "x"), kidungRef, diuploadOleh: "x" });
const ITEMS = [
  yt("a1", "Lagu A", "Ch1", "Bebas", "K130, S5", "youtube", "Latihan"),
  yt("a2", "Lagu B", "Ch1", "Anak,Remaja", "KA13", "youtube", "Latihan"),
  Object.assign(yt("a3", "Lagu C", "Ch2", "Bebas", "Doa pembuka", "soundcloud", ""), { link: "https://soundcloud.com/x/lagu-c" }),
  yt("a4", "Lagu D", "Ch2", "Bebas", "Kidung|130", "youtube", "Pujian"),
  yt("a5", "Lagu E", "Ch2", "SPR", "", "youtube", "Pujian"),
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
  try { await run(dom, errors); } catch (e) { console.log("FAIL - exception", e && e.stack); ok = false; }
  finally { srv.close(); console.log(ok ? "\nALL PASS" : "\nSOME FAIL"); process.exit(ok ? 0 : 1); }
});

async function run(dom, errors) {
  const w = dom.window, doc = w.document;
  const $ = (s) => doc.querySelector(s), $$ = (s) => Array.from(doc.querySelectorAll(s));
  const click = (n) => n.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  const change = (id, v) => { const s = doc.getElementById(id); s.value = v; s.dispatchEvent(new w.Event("change", { bubbles: true })); };
  const titles = () => $$("#mlBody .ml-grid .ml-card-title").map((n) => n.textContent).sort().join(",");
  const count = () => doc.getElementById("mlYtCount").textContent.replace(/\s+/g, " ");
  const opts = (id) => Array.from(doc.getElementById(id).options).map((o) => o.textContent.replace(/\s+/g, " ").trim());

  w.eval("MediaLibrary.open()"); await sleep(600);
  click($$("#mlTabs .ml-tab").find((b) => /YouTube/.test(b.textContent))); await sleep(200);

  expect("total: 5 video, tampil 5, 3 punya referensi kidung", /Total 5 video/.test(count()) && /tampil 5/.test(count()) && /3 punya referensi kidung/.test(count()), count());
  expect("5 kartu tampil", $$("#mlBody .ml-grid .ml-card").length === 5, titles());
  expect("ada 5 dropdown filter berlabel", ["mlFilterSumber", "mlFilterChannel", "mlFilterKategori", "mlFilterKeterangan", "mlFilterKidungRef"].every((id) => !!doc.getElementById(id)), null);
  expect("dropdown Sumber berisi jumlah (youtube 4, soundcloud 1)", opts("mlFilterSumber").some((o) => /^youtube \(4\)$/i.test(o)) && opts("mlFilterSumber").some((o) => /^soundcloud \(1\)$/i.test(o)), opts("mlFilterSumber"));
  expect("dropdown Channel: Ch1 (2), Ch2 (3)", opts("mlFilterChannel").includes("Ch1 (2)") && opts("mlFilterChannel").includes("Ch2 (3)"), opts("mlFilterChannel"));
  expect("dropdown Kategori multi-nilai: Bebas (3), Anak (1), Remaja (1)", ["Bebas (3)", "Anak (1)", "Remaja (1)"].every((x) => opts("mlFilterKategori").includes(x)), opts("mlFilterKategori"));
  expect("dropdown Keterangan: Latihan (2), Pujian (2)", opts("mlFilterKeterangan").includes("Latihan (2)") && opts("mlFilterKeterangan").includes("Pujian (2)"), opts("mlFilterKeterangan"));
  const kr = opts("mlFilterKidungRef");
  expect("dropdown KidungRef: K130 (2) [K130 & Kidung|130 digabung], S5, KA13, tulisan biasa, ada/tanpa", ["K130 (2)", "S5 (1)", "KA13 (1)", "✎ Doa pembuka (1)", "✅ Punya referensi kidung (3)", "— Tanpa referensi (1)"].every((x) => kr.includes(x)), kr);
  expect("urutan KidungRef: K, lalu S, lalu KA, tulisan biasa terakhir", kr.indexOf("K130 (2)") < kr.indexOf("S5 (1)") && kr.indexOf("S5 (1)") < kr.indexOf("KA13 (1)") && kr.indexOf("KA13 (1)") < kr.indexOf("✎ Doa pembuka (1)"), kr);

  change("mlFilterKidungRef", "kidung|130");
  expect("filter K130 -> Lagu A, Lagu D; total menunjukkan terfilter", titles() === "Lagu A,Lagu D" && /tampil 2/.test(count()) && /terfilter/.test(count()), [titles(), count()]);
  expect("angka dropdown lain mengikuti filter aktif (Channel: Ch1 (1), Ch2 (1))", opts("mlFilterChannel").includes("Ch1 (1)") && opts("mlFilterChannel").includes("Ch2 (1)"), opts("mlFilterChannel"));
  change("mlFilterChannel", "Ch2");
  expect("K130 + Ch2 digabung -> Lagu D saja", titles() === "Lagu D", titles());
  click(doc.getElementById("mlFilterClear"));
  expect("Bersihkan filter -> 5 lagi", $$("#mlBody .ml-grid .ml-card").length === 5 && /tampil 5/.test(count()), count());
  change("mlFilterKidungRef", "__tanpa"); expect("filter 'Tanpa referensi' -> Lagu E", titles() === "Lagu E", titles());
  change("mlFilterKidungRef", "__ada"); expect("filter 'Punya referensi kidung' -> A, B, D (tulisan biasa tidak dihitung)", titles() === "Lagu A,Lagu B,Lagu D", titles());
  change("mlFilterKidungRef", ""); change("mlFilterSumber", "soundcloud"); expect("filter Sumber soundcloud -> Lagu C", titles() === "Lagu C", titles());
  click(doc.getElementById("mlFilterClear"));
  change("mlFilterKategori", "Anak"); expect("filter Kategori Anak -> Lagu B", titles() === "Lagu B", titles());
  click(doc.getElementById("mlFilterClear"));
  change("mlFilterKeterangan", "Pujian"); expect("filter Keterangan Pujian -> D, E", titles() === "Lagu D,Lagu E", titles());
  click(doc.getElementById("mlFilterClear"));

  // pencarian
  const search = doc.getElementById("mlSearchInput");
  const type = (v) => { search.value = v; search.dispatchEvent(new w.Event("input", { bubbles: true })); };
  type("k130"); expect("cari 'k130' -> A, D; total & dropdown ikut menyesuaikan", titles() === "Lagu A,Lagu D" && /tampil 2/.test(count()), [titles(), count()]);
  expect("kotak cari tidak ter-reset saat mengetik", doc.getElementById("mlSearchInput") === search && search.value === "k130", null);
  type("Kidung 5"); expect("cari 'Kidung 5' (bentuk panjang) -> ketemu S5? tidak, itu Suplemen", titles() === "", titles());
  type("suplemen 5"); expect("cari 'Suplemen 5' -> Lagu A", titles() === "Lagu A", titles());
  type("pujian"); expect("cari Keterangan 'pujian' -> D, E", titles() === "Lagu D,Lagu E", titles());
  type("soundcloud"); expect("cari Sumber -> Lagu C", titles() === "Lagu C", titles());
  type("");

  // tombol di kartu
  const card = (t) => $$("#mlBody .ml-grid .ml-card").find((c) => c.textContent.includes(t));
  const btns = (t) => Array.from(card(t).querySelectorAll(".ml-kref-btn")).map((b) => b.textContent.trim());
  expect("Lagu A punya tombol 📖 K130, ➡️, 📖 S5, ➡️", JSON.stringify(btns("Lagu A")) === JSON.stringify(["📖 K130", "➡️", "📖 S5", "➡️"]), btns("Lagu A"));
  expect("Lagu B punya 📖 KA13", btns("Lagu B")[0] === "📖 KA13", btns("Lagu B"));
  expect("Lagu C (tulisan biasa) tanpa tombol, teks tampil", btns("Lagu C").length === 0 && card("Lagu C").querySelector(".ml-kref-text").textContent === "Doa pembuka", null);
  expect("Lagu E (kosong) tanpa baris referensi", !card("Lagu E").querySelector(".ml-kref-row"), null);

  // stub data kidung
  w.eval(`window.__calls = []; window.__alerts = [];
    openKidungByKeypad = async function (buku, no) { window.__calls.push("open:" + buku + "|" + no);
      if (String(no) === "999") return null;
      return { meta: { buku: buku, noKidung: String(no), judul: "Judul " + buku + " " + no },
        baits: [ { noBait: "1", teks: "Baris satu\\nBaris dua", koorGroup: "k", koorTeks: "Ini koor" }, { noBait: "2", teks: "Bait dua", koorGroup: "k", koorTeks: "Ini koor" } ] }; };
    resyncKidungSheet = async function () {};
    showKidungPanel = async function () { window.__calls.push("panel"); };
    openKidungReader = async function (b, n) { window.__calls.push("reader:" + b + "|" + n); };
    KidungAnak.getBaitsForPresentation = async function (no) { return { song: { No: no, Judul: "Anak Uji", Syair: "x" }, baits: [{ noBait: "1", teks: "Syair anak", koorGroup: null, koorTeks: null }] }; };
    KidungAnak.findSongByNo = async function (no) { return { No: no, Judul: "Anak Uji" }; };
    KidungAnak.renderHome = async function (panel) { window.__calls.push("kaHome"); panel.innerHTML = '<input id="kaSearchInput">'; };`);
  w.alert = (m) => w.eval("window.__alerts.push(" + JSON.stringify(String(m)) + ")");
  const calls = () => w.eval("window.__calls.slice()");

  click(card("Lagu A").querySelectorAll(".ml-kref-btn")[0]); await sleep(300);
  const kv = doc.getElementById("mlKidungViewOverlay");
  expect("📖 K130 membuka kotak isi kidung", kv && !kv.hidden, null);
  expect("judul kotak: 'K130 — Judul Kidung 130'", /K130 — Judul Kidung 130/.test(doc.getElementById("mlKvTitle").textContent), doc.getElementById("mlKvTitle").textContent);
  const bodyTxt = doc.getElementById("mlKvBody").textContent;
  expect("isi bait tampil, koor tampil SEKALI (tidak diulang tiap bait)", /Baris satu/.test(bodyTxt) && /Bait dua/.test(bodyTxt) && (bodyTxt.match(/Ini koor/g) || []).length === 1, bodyTxt);
  click(doc.getElementById("mlKvGoBtn")); await sleep(300);
  expect("'Buka di menu Kidung' dari kotak -> tutup Pustaka Media, panel Kidung, reader Kidung|130", doc.getElementById("mediaLibraryOverlay").hidden && calls().includes("panel") && calls().slice(-1)[0] === "reader:Kidung|130", calls());
  expect("kotak isi ikut tertutup", kv.hidden, null);

  w.eval("MediaLibrary.open()"); await sleep(400);
  click($$("#mlTabs .ml-tab").find((b) => /YouTube/.test(b.textContent))); await sleep(200);
  w.eval("window.__calls.length = 0");
  click(card("Lagu A").querySelectorAll(".ml-kref-btn")[3]); await sleep(300); // ➡️ S5
  expect("➡️ S5 langsung ke menu Kidung: reader Suplemen|5", calls().includes("panel") && calls().slice(-1)[0] === "reader:Suplemen|5" && doc.getElementById("mediaLibraryOverlay").hidden, calls());

  w.eval("MediaLibrary.open()"); await sleep(400);
  click($$("#mlTabs .ml-tab").find((b) => /YouTube/.test(b.textContent))); await sleep(200);
  w.eval("window.__calls.length = 0");
  click(card("Lagu B").querySelectorAll(".ml-kref-btn")[1]); await sleep(400); // ➡️ KA13
  const ka = doc.getElementById("kidungPanel").querySelector("#kaSearchInput");
  expect("➡️ KA13 -> Kidung Anak: panel dibuka, daftar dicari ke judul lagunya", calls().includes("kaHome") && !calls().some((c) => c.indexOf("reader:") === 0) && ka && ka.value === "Anak Uji", [calls(), ka && ka.value]);

  w.eval("MediaLibrary.open()"); await sleep(400);
  click($$("#mlTabs .ml-tab").find((b) => /YouTube/.test(b.textContent))); await sleep(200);
  click(card("Lagu B").querySelectorAll(".ml-kref-btn")[0]); await sleep(300);
  expect("📖 KA13 menampilkan syair Kidung Anak", /Syair anak/.test(doc.getElementById("mlKvBody").textContent) && /Anak Uji/.test(doc.getElementById("mlKvTitle").textContent), doc.getElementById("mlKvTitle").textContent);
  doc.getElementById("mlKvCloseBtn").dispatchEvent(new w.MouseEvent("click", { bubbles: true }));

  // nomor tidak ada
  w.eval(`openKidungByKeypad = async function () { return null; }`);
  click(card("Lagu D").querySelectorAll(".ml-kref-btn")[0]); await sleep(300);
  expect("kidung tidak ada -> pesan 'tidak ditemukan' di kotak", /tidak ditemukan/.test(doc.getElementById("mlKvBody").textContent), doc.getElementById("mlKvBody").textContent);

  // tab lain tidak rusak + reset filter saat pindah tab
  change("mlFilterChannel", "Ch1");
  click($$("#mlTabs .ml-tab").find((b) => /Kidung/.test(b.textContent) && !/Anak/.test(b.textContent))); await sleep(200);
  expect("tab Kidung menampilkan video ber-kidungRef (A, B, C, D) dengan tombolnya", $$("#mlBody .ml-grid .ml-card").length === 4 && $$("#mlBody .ml-kref-btn").length > 0, $$("#mlBody .ml-grid .ml-card").length);
  click($$("#mlTabs .ml-tab").find((b) => /YouTube/.test(b.textContent))); await sleep(200);
  expect("kembali ke YouTube: filter sudah bersih (5 video)", $$("#mlBody .ml-grid .ml-card").length === 5, null);
  expect("renderItemCard (layar baca kidung) TANPA tombol kidung", (() => { const c = w.eval("MediaLibrary").renderItemCard(ITEMS[0]); return !c.querySelector(".ml-kref-row"); })(), null);

  const realErrors = [...new Set(errors)].filter((e) => !/canvas|getContext|Not implemented|navigation/i.test(e));
  expect("tidak ada error JS tak terduga", realErrors.length === 0, realErrors);
}
