// Uji present.html (Layar 2) sungguhan di jsdom: audio latar dari berkas upload (Blob), kunci laporan status.
// Butuh jsdom + fake-indexeddb:  node tests/present-page.jsdom.test.js
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
const need = (m) => { try { return require(m); } catch (e) { return require(require.resolve(m, { paths: [process.cwd(), "/tmp/lint/node_modules"] })); } };
const { JSDOM, VirtualConsole, ResourceLoader } = need("jsdom");
const root = path.join(__dirname, "..");
const mime = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json" };
process.on("unhandledRejection", () => {});
let ok = true;
function expect(name, cond, extra) { console.log((cond ? "PASS" : "FAIL") + " - " + name + (cond ? "" : " :: " + JSON.stringify(extra))); if (!cond) ok = false; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const srv = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/$/, "/present.html"));
  fs.readFile(p, (e, d) => { if (e) { res.statusCode = 404; return res.end(); } res.setHeader("content-type", mime[path.extname(p)] || "application/octet-stream"); res.end(d); });
}).listen(0, async () => {
  const port = srv.address().port; const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(((e.detail && e.detail.message) || e.message).split("\n")[0]));
  class Loader extends ResourceLoader { fetch(url, o) { return url.startsWith("http://localhost:" + port) ? super.fetch(url, o) : Promise.resolve(Buffer.from("")); } }
  const reports = [], revoked = [];
  const dom = await JSDOM.fromURL("http://localhost:" + port + "/present.html", { runScripts: "dangerously", resources: new Loader(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.HTMLCanvasElement.prototype.getContext = () => null; w.scrollTo = () => {};
      w.IntersectionObserver = class { observe() {} disconnect() {} }; w.ResizeObserver = class { observe() {} disconnect() {} };
      w.HTMLMediaElement.prototype.play = function () { this._played = true; this.dispatchEvent(new w.Event("playing")); return Promise.resolve(); };
      w.HTMLMediaElement.prototype.pause = function () { this.dispatchEvent(new w.Event("pause")); };
      let n = 0; w.URL.createObjectURL = () => "blob:fake-" + (++n); w.URL.revokeObjectURL = (u) => revoked.push(u);
      Object.defineProperty(w, "opener", { value: { postMessage: (m) => reports.push(m) }, configurable: true });
    } });
  await sleep(1500);
  const w = dom.window;
  const send = (payload) => w.dispatchEvent(new w.MessageEvent("message", { data: { source: "bibleAppPresenter", payload }, origin: w.location.origin }));
  expect("present.html termuat tanpa galat skrip", errors.length === 0, errors.slice(0, 4));
  const audio = w.document.getElementById("kidungBgAudio");
  expect("elemen audio latar ada", !!audio, null);

  // --- upload: Blob -> URL milik Layar 2 ---
  send({ type: "mp3_bg", url: "upload:bga_1", blob: new w.Blob([new Uint8Array(10)], { type: "audio/mpeg" }) });
  expect("Blob dipasang sebagai blob: URL buatan Layar 2", audio.getAttribute("src") === "blob:fake-1", audio.getAttribute("src"));
  send({ type: "mp3_bg_control", action: "play" });
  await sleep(20);
  const st = reports.filter((r) => r.type === "present_bgaudio_status");
  expect("laporan status memakai KUNCI Studio (upload:bga_1), bukan blob:", st.length > 0 && st.every((r) => r.url === "upload:bga_1" && r.ok === true), st);
  expect("laporan status sungguhan mp3:true", reports.some((r) => r.type === "present_bgaudio_state" && r.kind === "mp3" && r.playing === true), reports);
  // --- ganti ke blob lain -> yang lama di-revoke ---
  send({ type: "mp3_bg", url: "upload:bga_2", blob: new w.Blob([new Uint8Array(5)]) });
  expect("blob lama di-revoke saat diganti", revoked.includes("blob:fake-1") && audio.getAttribute("src") === "blob:fake-2", { revoked, src: audio.getAttribute("src") });
  // --- link biasa sesudahnya: blob di-revoke, kunci = link ---
  send({ type: "mp3_bg", url: "https://x.test/a.mp3" });
  expect("pindah ke link biasa: blob di-revoke", revoked.includes("blob:fake-2"), revoked);
  send({ type: "mp3_bg_control", action: "play" }); await sleep(20);
  expect("kunci laporan = link biasa", reports.filter((r) => r.type === "present_bgaudio_status").pop().url === "https://x.test/a.mp3", null);
  // --- clear ---
  send({ type: "mp3_bg", url: "upload:bga_3", blob: new w.Blob([new Uint8Array(5)]) });
  send({ type: "mp3_bg_clear" });
  expect("clear: blob terakhir di-revoke", revoked.includes("blob:fake-3"), revoked);
  srv.close(); console.log(ok ? "\nALL PASS" : "\nSOME FAIL"); process.exit(ok ? 0 : 1);
});
