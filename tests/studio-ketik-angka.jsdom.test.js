// Uji Studio: volume & kecepatan YouTube bisa DIKETIK, thumbnail Kumpulan Ayat sampai 500px.
// Butuh: npm i jsdom@22 fake-indexeddb ;  node tests/studio-ketik-angka.jsdom.test.js
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
const need = (m) => { try { return require(m); } catch (e) { return require(require.resolve(m, { paths: [process.cwd(), "/tmp/jt2/node_modules"] })); } };
const { JSDOM, VirtualConsole, ResourceLoader } = need("jsdom");
const fi = need("fake-indexeddb");
let ok = true;
function expect(name, cond, extra) { console.log((cond ? "PASS" : "FAIL") + " - " + name + (cond ? "" : " :: " + JSON.stringify(extra))); if (!cond) ok = false; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const root = process.cwd();
const mime = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css" };
const srv = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/$/, "/index.html")); fs.readFile(p, (e, d) => { if (e) { res.statusCode = 404; res.end(); return; } res.setHeader("Content-Type", mime[path.extname(p)] || "application/octet-stream"); res.end(d); }); });
srv.listen(0, async () => {
  const port = srv.address().port;
  const vc = new VirtualConsole(); vc.on("jsdomError", () => {});
  class L extends ResourceLoader { fetch(url, o) { return url.startsWith("http://localhost:" + port) ? super.fetch(url, o) : Promise.resolve(Buffer.from("")); } }
  const dom = await JSDOM.fromURL("http://localhost:" + port + "/index.html", {
    runScripts: "dangerously", resources: new L(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.indexedDB = fi.indexedDB; w.IDBKeyRange = fi.IDBKeyRange;
      w.fetch = () => Promise.reject(new Error("no network"));
      w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.HTMLMediaElement.prototype.pause = () => {}; w.HTMLMediaElement.prototype.load = () => {};
    },
  });
  await sleep(2500);
  try { await run(dom); } catch (e) { console.log("FAIL - exception", e && e.stack); ok = false; }
  finally { srv.close(); console.log(ok ? "\nALL PASS" : "\nSOME FAIL"); process.exit(ok ? 0 : 1); }
});
async function run(dom) {
  const w = dom.window, doc = w.document, g = (id) => doc.getElementById(id);
  const typeIn = (id, v) => { const i = g(id); i.value = v; i.dispatchEvent(new w.Event("change", { bubbles: true })); };
  const posted = [];
  // Volume
  expect("kotak angka volume ada, awal 70", g("psYtVolumeValue") && g("psYtVolumeValue").value === "70", g("psYtVolumeValue") && g("psYtVolumeValue").value);
  typeIn("psYtVolumeValue", "35");
  expect("ketik 35 -> slider 35 & tersimpan", g("psYtVolumeRange").value === "35" && w.localStorage.getItem("bible_app_yt_volume_v1") === "35", [g("psYtVolumeRange").value, w.localStorage.getItem("bible_app_yt_volume_v1")]);
  typeIn("psYtVolumeValue", "250");
  expect("ketik 250 -> dibatasi 100", g("psYtVolumeValue").value === "100" && g("psYtVolumeRange").value === "100", g("psYtVolumeValue").value);
  typeIn("psYtVolumeValue", "abc");
  expect("ketik huruf -> kembali ke nilai terakhir (100)", g("psYtVolumeValue").value === "100", g("psYtVolumeValue").value);
  g("psYtVolumeRange").value = "20"; g("psYtVolumeRange").dispatchEvent(new w.Event("input", { bubbles: true }));
  expect("geser slider 20 -> kotak angka 20", g("psYtVolumeValue").value === "20", g("psYtVolumeValue").value);
  // Kecepatan
  expect("kotak kecepatan ada, awal 1", g("psYtSpeedValue") && g("psYtSpeedValue").value === "1", g("psYtSpeedValue") && g("psYtSpeedValue").value);
  typeIn("psYtSpeedValue", "1,5");
  expect("ketik 1,5 -> slider langkah 5 (1,5x)", g("psYtSpeedRange").value === "5" && g("psYtSpeedValue").value === "1,5", [g("psYtSpeedRange").value, g("psYtSpeedValue").value]);
  typeIn("psYtSpeedValue", "0.25");
  expect("ketik 0.25 (titik) -> slider langkah 0", g("psYtSpeedRange").value === "0" && g("psYtSpeedValue").value === "0,25", [g("psYtSpeedRange").value, g("psYtSpeedValue").value]);
  typeIn("psYtSpeedValue", "1.3");
  expect("ketik 1.3 -> dibulatkan ke 1,25", g("psYtSpeedValue").value === "1,25", g("psYtSpeedValue").value);
  typeIn("psYtSpeedValue", "9");
  expect("ketik 9 -> dibatasi 2", g("psYtSpeedValue").value === "2", g("psYtSpeedValue").value);
  g("psYtSpeedValue").dispatchEvent(new w.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
  expect("panah bawah -> 1,75", g("psYtSpeedValue").value === "1,75", g("psYtSpeedValue").value);
  g("psYtSpeedLabel").dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  expect("klik 'x' -> kembali 1x", g("psYtSpeedValue").value === "1" && g("psYtSpeedRange").value === "3", g("psYtSpeedValue").value);
  // Thumbnail
  expect("slider & kotak thumbnail maks 500", g("psCollectionThumbSizeSlider").max === "500" && g("psCollectionThumbSizeValue").max === "500", [g("psCollectionThumbSizeSlider").max, g("psCollectionThumbSizeValue").max]);
  typeIn("psCollectionThumbSizeValue", "500");
  expect("ketik 500 -> berlaku (var CSS 500px, tersimpan)", w.document.documentElement.style.getPropertyValue("--ps-thumb-size") === "500px" && w.localStorage.getItem("ps_collection_thumb_size_v1") === "500", [w.document.documentElement.style.getPropertyValue("--ps-thumb-size"), w.localStorage.getItem("ps_collection_thumb_size_v1")]);
  typeIn("psCollectionThumbSizeValue", "900");
  expect("ketik 900 -> dibatasi 500", g("psCollectionThumbSizeValue").value === "500", g("psCollectionThumbSizeValue").value);
  const maks = doc.querySelector('[data-thumb-size-preset="500"]');
  expect("tombol preset 'Maks 500' ada", !!maks, null);
}
