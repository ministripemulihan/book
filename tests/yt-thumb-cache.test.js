// Uji js/yt-thumb-cache.js (3 Okt 2026) tanpa peramban: node tests/yt-thumb-cache.test.js
"use strict";
const fs = require("fs"), vm = require("vm");
let ok = true;
const expect = (n, c, x) => { console.log((c ? "PASS" : "FAIL") + " - " + n + (c ? "" : " :: " + JSON.stringify(x))); if (!c) ok = false; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function make(ua, corsMode) {
  const store = new Map(), ls = {}, listeners = {};
  const cacheObj = { put: async (k, r) => { store.set(k, r); }, match: async (k) => store.get(k), delete: async (k) => store.delete(k) };
  const win = {
    navigator: { userAgent: ua, onLine: true, maxTouchPoints: 0 },
    localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: (k) => { delete ls[k]; } },
    caches: { open: async () => cacheObj, delete: async () => true },
    document: { addEventListener: (t, f) => { listeners[t] = f; } },
    URL: { createObjectURL: () => "blob:fake" },
    fetch: async () => {
      if (corsMode === "opaque") return { type: "opaque", ok: false, headers: { get: () => "" } };
      return { type: "cors", ok: true, headers: { get: () => "image/jpeg" }, blob: async () => ({}) };
    },
    setTimeout, clearTimeout, console, Image: function () {},
  };
  win.window = win; win.matchMedia = () => ({ matches: false });
  vm.createContext(win);
  vm.runInContext(fs.readFileSync("js/yt-thumb-cache.js", "utf8"), win);
  return { win, store, ls, listeners };
}
const img = (src) => ({ tagName: "IMG", src, currentSrc: src, dataset: {} });
(async () => {
  let t = make("Mozilla/5.0 (Windows NT 10.0) Chrome/120", "cors");
  const Y = t.win.YtThumbCache;
  expect("aktif di komputer", Y.enabled() === true);
  expect("kunci seragam", Y._canonical("https://img.youtube.com/vi/abcdefghijk/hqdefault.jpg") === "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg");
  t.listeners.load({ target: img("https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg") });
  await sleep(30);
  expect("gambar yang tampil tersimpan", t.store.has("https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg"));
  expect("status cors ok", Y.status().cors === "ok" && Y.status().tersimpan === 1, Y.status());
  const bad = img("https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg");
  t.listeners.error({ target: bad }); await sleep(30);
  expect("error -> pakai salinan tersimpan", bad.src === "blob:fake", bad.src);
  const miss = img("https://i.ytimg.com/vi/zzzzzzzzzzz/mqdefault.jpg");
  t.listeners.error({ target: miss }); await sleep(30);
  expect("tidak tersimpan -> gambar pengganti", miss.src === Y.PLACEHOLDER);
  expect("gambar bukan YouTube diabaikan", (() => { const o = img("https://example.com/a.jpg"); t.listeners.error({ target: o }); return o.src === "https://example.com/a.jpg"; })());

  // LRU: isi 505 -> sisa 450, yang terlama terbuang
  t = make("Mozilla/5.0 (Windows NT 10.0) Chrome/120", "cors");
  const idx = {};
  for (let i = 0; i < 500; i++) { const k = "https://i.ytimg.com/vi/id" + String(i).padStart(9, "0") + "/mqdefault.jpg"; idx[k] = 1000 + i; t.store.set(k, {}); }
  t.ls.bookVpYtThumbIdx = JSON.stringify(idx);
  t.listeners.load({ target: img("https://i.ytimg.com/vi/newvideo001/mqdefault.jpg") }); await sleep(50);
  const left = Object.keys(JSON.parse(t.ls.bookVpYtThumbIdx));
  expect("LRU membuang yang terlama", left.length === 450 && !left.includes("https://i.ytimg.com/vi/id000000000/mqdefault.jpg") && left.includes("https://i.ytimg.com/vi/newvideo001/mqdefault.jpg"), left.length);
  expect("cache ikut berkurang", t.store.size === 450, t.store.size);

  // opaque -> TIDAK disimpan
  t = make("Mozilla/5.0 (Windows NT 10.0) Chrome/120", "opaque");
  t.listeners.load({ target: img("https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg") }); await sleep(30);
  expect("opaque tidak disimpan", t.store.size === 0 && t.win.YtThumbCache.status().cors === "blocked");

  // HP -> tidak aktif
  t = make("Mozilla/5.0 (Linux; Android 13) Chrome/120 Mobile", "cors");
  t.listeners.load({ target: img("https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg") }); await sleep(30);
  expect("HP tidak menyimpan", t.store.size === 0 && t.win.YtThumbCache.enabled() === false);
  console.log(ok ? "SEMUA LULUS" : "ADA YANG GAGAL"); process.exit(ok ? 0 : 1);
})();
