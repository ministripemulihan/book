// ============================================================
//  BARU (3 Okt 2026, tahap 3 offline) -- Thumbnail YouTube "simpan yang pernah dilihat".
//
//  Cara kerja:
//   1. Hanya di KOMPUTER (HP/tablet tidak menyimpan -- sama dgn daftar offline).
//   2. Setiap gambar thumbnail YouTube (i.ytimg.com / img.youtube.com) yang BERHASIL tampil
//      di layar otomatis disimpan ke Cache Storage "book-vp-ytthumbs-v1".
//   3. Maksimal MAX_ITEMS gambar; yang paling lama tidak dipakai dibuang dulu (LRU).
//   4. Kalau gambar gagal dimuat (offline) -> pakai salinan tersimpan; kalau tidak ada ->
//      gambar pengganti "▶ offline" (SVG kecil), jadi daftar teks tetap rapi.
//
//  KEAMANAN KUOTA: gambar diambil dengan mode "cors". Kalau YouTube TIDAK mengizinkan (hasil
//  "opaque"), gambar TIDAK disimpan sama sekali -- respons opaque dihitung ~7 MB per gambar
//  oleh peramban dan bisa menghabiskan kuota. Dalam kasus itu offline tetap jalan, hanya
//  saja thumbnail diganti gambar pengganti. Cek hasilnya di Console: YtThumbCache.selfTest()
//
//  Tidak perlu mengubah kode pemanggil: satu pendengar "error"/"load" global menangani semua
//  <img> thumbnail YouTube yang sudah ada (Studio, Kumpulan Ayat, dst). Khusus kartu
//  Pustaka Media (background-image) pakai YtThumbCache.bindBackground(el, url).
// ============================================================
(function () {
  "use strict";
  if (typeof window === "undefined") return;

  var CACHE_NAME = "book-vp-ytthumbs-v1"; // JANGAN diubah sembarangan; sw.js tidak menghapus nama ini
  var IDX_KEY = "bookVpYtThumbIdx";
  var CORS_KEY = "bookVpYtThumbCors"; // "ok" | "blocked"
  var MAX_ITEMS = 500;
  var EVICT_TO = 450; // begitu lewat MAX_ITEMS, buang sampai tinggal sekian
  var URL_RE = /^https?:\/\/(?:i\.ytimg\.com|img\.youtube\.com)\/vi\/([A-Za-z0-9_-]{6,})\/([A-Za-z0-9_]+)\.jpg/i;

  var PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"><rect width="160" height="90" fill="#1b1f2a"/>' +
    '<rect x="52" y="27" width="56" height="36" rx="10" fill="#c4302b"/><path d="M73 36l18 9-18 9z" fill="#fff"/>' +
    '<text x="80" y="80" font-family="sans-serif" font-size="9" fill="#9aa3b5" text-anchor="middle">offline</text></svg>'
  );

  function desktopOnly_() {
    try {
      if (typeof CONFIG !== "undefined" && CONFIG && CONFIG.MEDIA_LIBRARY_OFFLINE_LIST === "semua") return true;
      var ua = (navigator && navigator.userAgent) || "";
      if (/Android|iPhone|iPad|iPod|Mobile|Silk|Opera Mini/i.test(ua)) return false;
      if (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua)) return false;
      if (typeof matchMedia === "function" && matchMedia("(pointer: coarse) and (hover: none)").matches) return false;
      return true;
    } catch (e) { return true; }
  }
  function cachesOk_() { try { return typeof caches !== "undefined" && !!caches.open; } catch (e) { return false; } }
  function enabled() { return desktopOnly_() && cachesOk_(); }

  // Kunci seragam: semua variasi host -> https://i.ytimg.com/vi/<id>/<kualitas>.jpg
  function canonical_(url) {
    var m = URL_RE.exec(String(url || ""));
    return m ? "https://i.ytimg.com/vi/" + m[1] + "/" + m[2] + ".jpg" : "";
  }

  // ---------- indeks LRU (localStorage kecil: {kunci: waktuTerakhirDipakai}) ----------
  function readIdx_() {
    try { var o = JSON.parse(localStorage.getItem(IDX_KEY) || "{}"); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; }
  }
  function writeIdx_(o) { try { localStorage.setItem(IDX_KEY, JSON.stringify(o)); } catch (e) { /* penuh/diblokir -- abaikan */ } }
  var touchPending_ = {}, touchTimer_ = null;
  function touch_(key) {
    touchPending_[key] = Date.now();
    if (touchTimer_) return;
    touchTimer_ = setTimeout(function () { // gabungkan banyak sentuhan jadi 1 tulisan
      var idx = readIdx_(), p = touchPending_;
      touchPending_ = {}; touchTimer_ = null;
      for (var k in p) if (idx[k]) idx[k] = p[k];
      writeIdx_(idx);
    }, 1500);
  }
  async function evictIfNeeded_(cache) {
    var idx = readIdx_(), keys = Object.keys(idx);
    if (keys.length <= MAX_ITEMS) return;
    keys.sort(function (a, b) { return (idx[a] || 0) - (idx[b] || 0); }); // paling lama dulu
    var drop = keys.slice(0, keys.length - EVICT_TO);
    for (var i = 0; i < drop.length; i++) {
      try { await cache.delete(drop[i]); } catch (e) { /* abaikan */ }
      delete idx[drop[i]];
    }
    writeIdx_(idx);
  }

  // ---------- simpan ----------
  var inflight_ = {};
  async function store_(key) {
    if (!enabled() || !key || inflight_[key]) return;
    if (localStorage.getItem(CORS_KEY) === "blocked") return; // YouTube tidak mengizinkan -> jangan simpan opaque
    var idx = readIdx_();
    if (idx[key]) { touch_(key); return; } // sudah tersimpan
    inflight_[key] = true;
    try {
      var res = await fetch(key, { mode: "cors", credentials: "omit" });
      if (!res || res.type === "opaque" || !res.ok) {
        if (res && res.type === "opaque") localStorage.setItem(CORS_KEY, "blocked");
        return;
      }
      var ct = res.headers.get("content-type") || "";
      if (ct && ct.indexOf("image") !== 0) return;
      var cache = await caches.open(CACHE_NAME);
      await cache.put(key, res);
      idx = readIdx_(); idx[key] = Date.now(); writeIdx_(idx);
      localStorage.setItem(CORS_KEY, "ok");
      await evictIfNeeded_(cache);
    } catch (e) {
      // TypeError = diblokir CORS ATAU memang offline. Hanya tandai "blocked" kalau sedang online.
      if (navigator.onLine !== false && e && e.name === "TypeError" && localStorage.getItem(CORS_KEY) !== "ok") {
        corsFailCount_++;
        if (corsFailCount_ >= 3) localStorage.setItem(CORS_KEY, "blocked");
      }
    } finally { delete inflight_[key]; }
  }
  var corsFailCount_ = 0;

  // ---------- baca ----------
  // Mengembalikan alamat blob: dari salinan tersimpan, atau "" kalau tidak ada.
  async function lookup_(key) {
    if (!enabled() || !key) return "";
    try {
      var cache = await caches.open(CACHE_NAME);
      var res = await cache.match(key);
      if (!res) return "";
      var blob = await res.blob();
      touch_(key);
      return URL.createObjectURL(blob);
    } catch (e) { return ""; }
  }

  // ---------- <img>: pendengar global (fase capture, karena error/load tidak bubble) ----------
  function isThumbImg_(el) {
    return el && el.tagName === "IMG" && !el.dataset.ytFallbackDone && canonical_(el.currentSrc || el.src);
  }
  document.addEventListener("load", function (ev) {
    var el = ev.target;
    if (!el || el.tagName !== "IMG") return;
    var key = canonical_(el.currentSrc || el.src);
    if (!key) return;
    delete el.dataset.ytFallbackDone; // gambar asli berhasil -> fallback boleh dipakai lagi kalau nanti gagal
    store_(key);
  }, true);
  document.addEventListener("error", function (ev) {
    var el = ev.target;
    if (!isThumbImg_(el)) return;
    var key = canonical_(el.currentSrc || el.src);
    el.dataset.ytFallbackDone = "1"; // cegah perulangan
    lookup_(key).then(function (blobUrl) { el.src = blobUrl || PLACEHOLDER; });
  }, true);

  // ---------- background-image (kartu Pustaka Media) ----------
  function bindBackground(el, url) {
    var key = canonical_(url);
    if (!el || !key) { if (el) el.style.backgroundImage = 'url("' + url + '")'; return; }
    function setBg(u) { el.style.backgroundImage = 'url("' + u + '")'; }
    function fallback() { lookup_(key).then(function (b) { setBg(b || PLACEHOLDER); }); }
    if (navigator.onLine === false) { fallback(); return; } // jelas offline: langsung salinan tersimpan
    var probe = new Image();
    probe.onload = function () { setBg(url); store_(key); };
    probe.onerror = fallback;
    probe.src = url;
  }

  // ---------- info & uji ----------
  function status() {
    var idx = readIdx_();
    return { aktif: enabled(), tersimpan: Object.keys(idx).length, maksimal: MAX_ITEMS, cors: localStorage.getItem(CORS_KEY) || "belum diuji" };
  }
  // Jalankan di Console situs sungguhan (online): YtThumbCache.selfTest().then(console.log)
  async function selfTest(videoId) {
    var url = "https://i.ytimg.com/vi/" + (videoId || "dQw4w9WgXcQ") + "/mqdefault.jpg";
    var out = { url: url, aktif: enabled() };
    try {
      var res = await fetch(url, { mode: "cors", credentials: "omit" });
      out.type = res.type; out.ok = res.ok;
      out.hasil = res.type === "cors" && res.ok ? "AMAN: YouTube mengizinkan, thumbnail akan disimpan" : "TIDAK AMAN disimpan (opaque) -> offline pakai gambar pengganti";
      if (res.type === "cors") localStorage.setItem(CORS_KEY, "ok"); else if (res.type === "opaque") localStorage.setItem(CORS_KEY, "blocked");
    } catch (e) {
      out.hasil = "GAGAL (kemungkinan diblokir CORS atau offline): " + (e && e.message);
    }
    out.status = status();
    return out;
  }
  async function clear() {
    try { await caches.delete(CACHE_NAME); } catch (e) { /* abaikan */ }
    try { localStorage.removeItem(IDX_KEY); localStorage.removeItem(CORS_KEY); } catch (e) { /* abaikan */ }
  }

  window.YtThumbCache = {
    enabled: enabled, bindBackground: bindBackground, status: status, selfTest: selfTest, clear: clear,
    PLACEHOLDER: PLACEHOLDER, MAX_ITEMS: MAX_ITEMS, _canonical: canonical_, _lookup: lookup_, _store: store_,
  };
})();
