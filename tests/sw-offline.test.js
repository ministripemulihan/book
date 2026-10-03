// Uji sw.js (2 Okt 2026): precache saat install, buka halaman offline, fallback present.html, timeout jaringan macet.
// Jalankan: node tests/sw-offline.test.js   (tanpa dependensi -- semua API browser ditiru)
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
let ok = true;
function expect(name, cond, extra) { console.log((cond ? "PASS" : "FAIL") + " - " + name + (cond ? "" : " :: " + JSON.stringify(extra))); if (!cond) ok = false; }

const ROOT = process.cwd(), ORIGIN = "https://app.test", SCOPE = ORIGIN + "/";
const code = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8").replace("const CACHE_NAME", "var CACHE_NAME").replace("const PRECACHE_TIMEOUT_MS = 20000", "const PRECACHE_TIMEOUT_MS = 400").replace("const NAV_TIMEOUT_MS = 4000", "const NAV_TIMEOUT_MS = 600");

function makeEnv(online, opts) {
  opts = opts || {};
  const store = new Map(); // nama cache -> Map(url -> Response)
  const listeners = {};
  const fetchLog = [];
  class FakeResponse {
    constructor(body, init) { this.body = body; this.status = (init && init.status) || 200; this.ok = this.status >= 200 && this.status < 300; this.type = (init && init.type) || "basic"; this.headers = (init && init.headers) || {}; }
    clone() { return new FakeResponse(this.body, { status: this.status, type: this.type, headers: this.headers }); }
    async text() { return String(this.body); }
  }
  class FakeRequest { constructor(url, init) { this.url = typeof url === "string" ? url : url.url; this.method = "GET"; this.mode = (init && init.mode) || "cors"; } }
  const net = async (reqOrUrl) => {
    const url = typeof reqOrUrl === "string" ? reqOrUrl : reqOrUrl.url;
    fetchLog.push(url);
    if (!online.value) throw new TypeError("Failed to fetch");
    if (opts.hang && /present\.html/.test(url)) return new Promise(() => {});
    const u = new URL(url);
    const f = path.join(ROOT, decodeURIComponent(u.pathname === "/" ? "/index.html" : u.pathname));
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return new FakeResponse("", { status: 404 });
    return new FakeResponse(fs.readFileSync(f, "utf8"));
  };
  const caches = {
    async open(n) { if (!store.has(n)) store.set(n, new Map()); const m = store.get(n); return { async put(k, r) { m.set(typeof k === "string" ? k : k.url, r); }, async match(k) { return m.get(typeof k === "string" ? k : k.url); } }; },
    async keys() { return Array.from(store.keys()); },
    async delete(n) { return store.delete(n); },
    async match(k) { const key = typeof k === "string" ? k : k.url; for (const m of store.values()) if (m.has(key)) return m.get(key); return undefined; },
  };
  const self = {
    registration: { scope: SCOPE }, location: new URL(ORIGIN + "/sw.js"), clients: { claim: async () => {} }, skipWaiting() { self.skipped = true; },
    addEventListener(t, fn) { listeners[t] = fn; },
  };
  const ctx = { self, caches, fetch: net, Request: FakeRequest, Response: FakeResponse, URL, Promise, setTimeout, clearTimeout, console, Set, Map, RegExp };
  vm.createContext(ctx); vm.runInContext(code, ctx);
  const waits = [];
  const ev = (extra) => Object.assign({ waitUntil(p) { waits.push(p); }, respondWith(p) { this.resp = p; } }, extra);
  return {
    store, self, fetchLog, FakeResponse, FakeRequest,
    async install() { const e = ev(); listeners.install(e); await Promise.all(waits); return e; },
    async nav(url) { const e = ev({ request: new FakeRequest(url, { mode: "navigate" }) }); listeners.fetch(e); const r = await e.resp; await Promise.race([Promise.all(waits), new Promise((res) => setTimeout(res, 150))]); return r; },
    async asset(url) { const e = ev({ request: new FakeRequest(url) }); listeners.fetch(e); return e.resp ? await e.resp : null; },
  };
}

(async () => {
  // ---------- 1) Install online: precache lengkap ----------
  const online = { value: true };
  const E = makeEnv(online);
  await E.install();
  const cacheName = Array.from(E.store.keys())[0];
  const C = E.store.get(cacheName);
  expect("nama cache v51", /v51$/.test(cacheName), cacheName);
  expect("skipWaiting dipanggil", E.self.skipped === true, null);
  expect("index.html tersimpan", C.has(SCOPE + "index.html"), Array.from(C.keys()).slice(0, 5));
  expect("present.html tersimpan", C.has(SCOPE + "present.html"), null);
  expect("alamat akar '/' tersimpan", C.has(SCOPE), null);

  // setiap <script src>/<link href> lokal di present.html & index.html (dengan ?v=) ikut tersimpan
  const need = [];
  for (const page of ["present.html", "index.html"]) {
    const html = fs.readFileSync(path.join(ROOT, page), "utf8");
    const re = /<(?:script|link)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["']/gi; let m;
    while ((m = re.exec(html))) { if (/^https?:|^data:|^#/.test(m[1])) continue; if (!/\.(js|css)(\?|$)/i.test(m[1])) continue; need.push(new URL(m[1], SCOPE + page).href); }
  }
  const missing = need.filter((u) => !C.has(u) && fs.existsSync(path.join(ROOT, new URL(u).pathname)));
  expect("semua css/js lokal (versi ?v= terbaru) di kedua halaman tersimpan (" + need.length + " berkas)", missing.length === 0 && need.length > 40, missing.slice(0, 5));
  expect("js khusus Layar 2 tersimpan (ink-engine, soundfx, book-scene, slogankarakter-data, config)", ["js/ink-engine.js", "js/soundfx.js", "js/book-scene.js", "js/games/slogankarakter-data.js", "js/config.js", "css/book-scene.css"].every((f) => Array.from(C.keys()).some((k) => k.includes(f))), null);
  expect("tidak ada URL luar (soundcloud/google) ikut tersimpan", Array.from(C.keys()).every((k) => k.startsWith(ORIGIN)), Array.from(C.keys()).filter((k) => !k.startsWith(ORIGIN)));
  expect("logo & thumbnail ikut tersimpan", C.has(SCOPE + "assets/logo-inchrist.png") || !fs.existsSync(path.join(ROOT, "assets/logo-inchrist.png")), null);

  // ---------- 2) OFFLINE: buka halaman ----------
  online.value = false;
  const rp = await E.nav(SCOPE + "present.html");
  expect("OFFLINE present.html -> isi present.html asli (bukan index)", rp && /Layar 2/.test(rp.body) && !/id="mediaLibraryOverlay"/.test(rp.body), rp && String(rp.body).slice(0, 80));
  const rq = await E.nav(SCOPE + "present.html?x=1&y=2");
  expect("OFFLINE present.html?query tetap ketemu", rq && /Layar 2/.test(rq.body), rq && String(rq.body).slice(0, 80));
  const ri = await E.nav(SCOPE + "index.html");
  expect("OFFLINE index.html tampil", ri && /mediaLibraryOverlay/.test(ri.body), null);
  const rr = await E.nav(SCOPE);
  expect("OFFLINE alamat akar '/' tampil", rr && /mediaLibraryOverlay/.test(rr.body), null);
  const sub = Array.from(C.keys()).find((k) => /\/js\/ink-engine\.js/.test(k));
  const ra = await E.asset(sub);
  expect("OFFLINE js/ink-engine.js dilayani dari cache", ra && ra.ok, ra && ra.status);
  const rf = await E.asset("https://app.test/js/belum-pernah-ada.js?v=1");
  expect("OFFLINE berkas yang belum tersimpan -> 504 (tidak crash)", rf && rf.status === 504, rf && rf.status);

  // ---------- 3) OFFLINE tanpa cache: present.html -> pesan, bukan index.html ----------
  const E2 = makeEnv({ value: false });
  const rn = await E2.nav(SCOPE + "present.html");
  expect("tanpa cache: present.html -> halaman petunjuk (503), BUKAN aplikasi utama", rn && rn.status === 503 && /belum tersimpan/i.test(rn.body), rn && rn.status);

  // ---------- 4) Jaringan macet (WiFi tanpa internet): jangan menggantung ----------
  const online3 = { value: true };
  const E3 = makeEnv(online3, {});
  await E3.install();                       // isi cache dulu (online normal)
  const hung = makeEnv({ value: true }, { hang: true });
  const t0 = Date.now();
  await hung.install();                     // present.html menggantung -> install TETAP selesai (timeout)
  expect("install tidak macet walau 1 berkas menggantung", Date.now() - t0 < 5000 && hung.self.skipped === true, Date.now() - t0);
  // halaman sudah tersimpan, lalu jaringan "ada tapi tidak menjawab" untuk present.html
  const warm = makeEnv({ value: true }, { hang: false });
  await warm.install();
  const hangFetch = makeEnv({ value: true }, { hang: true });
  hangFetch.store.set("book-vp-shell-v50", warm.store.get(Array.from(warm.store.keys())[0]));
  const t1 = Date.now();
  const rh = await hangFetch.nav(SCOPE + "present.html");
  const dt = Date.now() - t1;
  expect("jaringan macet + ada salinan -> present.html tampil dari salinan setelah batas waktu (bukan menunggu terus)", rh && /Layar 2/.test(rh.body) && dt < 3000, [dt, rh && String(rh.body).slice(0, 40)]);
  console.log(ok ? "\nALL PASS" : "\nSOME FAIL");
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.log("FAIL - exception", e && e.stack); process.exit(1); });
