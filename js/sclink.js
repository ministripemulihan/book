// =====================================================================
// js/sclink.js  (BARU book200, laporan operator: di HP pemutar SoundCloud menampilkan
// "You have not provided a valid SoundCloud URL")
// Widget SoundCloud (w.soundcloud.com/player) HANYA menerima link LENGKAP bentuk soundcloud.com/<artis>/<judul>. Dulu hanya link pendek
// "on.soundcloud.com/..." yang diterjemahkan (media-library.js); bentuk lain langsung dilempar ke widget -> pesan error di atas:
//   * link dari tombol Bagikan HP: teks + link ("Dengarkan X di #SoundCloud https://on.soundcloud.com/abc");
//   * m.soundcloud.com / mobile.soundcloud.com / www.soundcloud.com, ujung "?si=..&utm_source=.."; spasi/baris baru ikut tersalin;
//   * soundcloud.app.goo.gl / snd.sc (link pendek lama);
//   * halaman yang BUKAN lagu (soundcloud.com/search, /discover, /you, ...).
// SCLink.resolve() membersihkan + menerjemahkan link pendek lewat oEmbed resmi (dengan batas waktu), dan MELAPORKAN dengan jujur kalau
// tidak bisa (alasannya: offline / gagal / bukan link lagu) supaya pemanggil menampilkan petunjuk + tombol "Buka di SoundCloud"
// -- bukan pesan error widget yang membingungkan.
// Berkas ini mandiri (tidak bergantung berkas lain) dan aman dimuat di mana saja.
// =====================================================================
(function (root) {
  "use strict";
  const SHORT_HOSTS = /^(on\.soundcloud\.com|soundcloud\.app\.goo\.gl|snd\.sc)$/i;
  const NOT_TRACK = /^\/(search|discover|you|stream|charts|upload|pages|jobs|terms-of-use|settings|messages|notifications|people|popular|stations|mobile|feed|logout|login|signin)(\/|$)/i;
  const TRACKING = /^(si|utm_[a-z]+|ref|app|fbclid|p|c|gclid)$/i;

  // Ambil link pertama dari teks apa pun; buang tanda baca di ujung; tambah https:// bila hilang.
  function extract(raw) {
    const t = String(raw == null ? "" : raw).trim();
    if (!t) return "";
    let m = /https?:\/\/[^\s<>"']+/i.exec(t);
    if (!m) m = /\b((?:[a-z0-9-]+\.)?(?:soundcloud\.com|soundcloud\.app\.goo\.gl|snd\.sc)\/[^\s<>"']+)/i.exec(t);
    if (!m) return "";
    let u = m[0];
    if (!/^https?:\/\//i.test(u)) u = "https://" + (m[1] || u);
    return u.replace(/[)\].,;:!?]+$/, "");
  }

  // Bentuk baku: host utama, tanpa parameter pelacak/fragmen. Link pendek dibiarkan (diterjemahkan oleh resolve()).
  function clean(raw) {
    const u0 = extract(raw);
    if (!u0) return "";
    let u;
    try { u = new URL(u0); } catch (e) { return ""; }
    let host = u.hostname.toLowerCase();
    if (/^(m|mobile|www|open)\.soundcloud\.com$/.test(host)) host = "soundcloud.com";
    u.hostname = host;
    u.protocol = "https:";
    u.hash = "";
    Array.from(u.searchParams.keys()).forEach((k) => { if (TRACKING.test(k)) u.searchParams.delete(k); });
    let out = u.toString();
    if (out.endsWith("/") && u.pathname.length > 1) out = out.slice(0, -1);
    return out;
  }

  function isShort(url) {
    try { return SHORT_HOSTS.test(new URL(url).hostname); } catch (e) { return false; }
  }

  // Apakah ini link yang BISA diterima widget? (artis/judul, artis/sets/nama, api.soundcloud.com/tracks/ID, profil artis)
  function looksPlayable(url) {
    let u; try { u = new URL(url); } catch (e) { return false; }
    const host = u.hostname.toLowerCase();
    // angka biasa (/tracks/123) ATAU bentuk URN yang kini dipakai SoundCloud (/tracks/soundcloud%3Atracks%3A123 atau soundcloud:tracks:123)
    if (host === "api.soundcloud.com") return /^\/(tracks|playlists|users)\/((soundcloud(%3A|:)(tracks|playlists|users)(%3A|:))?)\d+/i.test(u.pathname);
    if (host !== "soundcloud.com") return false;
    if (NOT_TRACK.test(u.pathname)) return false;
    return u.pathname.split("/").filter(Boolean).length >= 1;
  }

  async function fetchJsonWithTimeout(url, ms) {
    const ctl = typeof AbortController === "function" ? new AbortController() : null;
    let timer = null;
    // Promise.race: batas waktu tetap bekerja walau implementasi fetch mengabaikan abort (jaringan "menggantung" tanpa jawaban).
    const timeout = new Promise((_, rej) => { timer = setTimeout(() => { try { if (ctl) ctl.abort(); } catch (e) { /* abaikan */ } rej(new Error("timeout")); }, ms); });
    try {
      return await Promise.race([
        (async () => {
          const res = await fetch(url, ctl ? { signal: ctl.signal } : undefined);
          if (!res || !res.ok) throw new Error("http " + (res && res.status));
          return await res.json();
        })(),
        timeout,
      ]);
    } finally { clearTimeout(timer); }
  }

  // Ambil link lagu dari jawaban oEmbed. Tahan terhadap: "&amp;" di dalam html, bentuk URN, urutan parameter berbeda.
  function trackFromOembed(json) {
    const html = String((json && json.html) || "").replace(/&amp;/g, "&");
    let inner = "";
    const sm = /src="([^"]+)"/.exec(html);
    if (sm) { try { inner = new URL(sm[1]).searchParams.get("url") || ""; } catch (e) { inner = ""; } }
    if (!inner) { const m = /[?&]url=([^&"]+)/.exec(html); if (m) { try { inner = decodeURIComponent(m[1]); } catch (e) { inner = m[1]; } } }
    return /^https?:\/\/([a-z0-9-]+\.)*soundcloud\.com\//i.test(inner) ? inner : ""; // dipercaya apa adanya (jangan dinormalkan: bentuk URN harus utuh)
  }

  // book205 -- 3 lapis TAMBAHAN supaya link pendek tetap bisa diputar walau penerjemahan oEmbed dari browser gagal
  // (laporan operator: on.soundcloud.com/... tidak mau Play, widget menampilkan "You have not provided a valid SoundCloud URL"):
  //   (1) ALIAS manual  : CONFIG.SOUNDCLOUD_ALIASES = { "<kode link pendek>": "https://soundcloud.com/artis/judul" } (js/config.js) -- tanpa internet, tanpa server;
  //   (2) CACHE perangkat: hasil terjemahan yang pernah berhasil disimpan di localStorage -> berikutnya langsung, bahkan offline;
  //   (3) Apps Script   : CONFIG.MEDIA_LIBRARY_APPS_SCRIPT_URL ?type=sc_resolve&url=... (server yang mengikuti pengalihan; tidak kena aturan CORS browser).
  const CACHE_KEY = "sc_resolved_v1";
  // CONFIG dideklarasikan "const" di js/config.js (bukan properti window) -> dibaca lewat nama global, bukan root.CONFIG.
  function cfg() { try { return (typeof CONFIG !== "undefined" && CONFIG) || root.CONFIG || null; } catch (e) { return root.CONFIG || null; } }
  function shortKey(url) { try { return new URL(url).pathname.split("/").filter(Boolean).pop() || ""; } catch (e) { return ""; } }
  function readCache() { try { return JSON.parse(root.localStorage.getItem(CACHE_KEY) || "{}") || {}; } catch (e) { return {}; } }
  function writeCache(url, track) { try { const c = readCache(); c[url] = track; root.localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch (e) { /* abaikan */ } }
  function aliasFor(url) {
    const A = cfg() && cfg().SOUNDCLOUD_ALIASES;
    if (!A) return "";
    const key = shortKey(url);
    const hit = A[url] || A[url.replace(/^https:\/\//, "")] || (key && A[key]) || "";
    return hit ? clean(hit) : "";
  }
  async function resolveViaAppsScript(url, ms) {
    const base = cfg() && cfg().MEDIA_LIBRARY_APPS_SCRIPT_URL;
    if (!base || String(base).indexOf("http") !== 0) return "";
    const j = await fetchJsonWithTimeout(base + (base.indexOf("?") < 0 ? "?" : "&") + "type=sc_resolve&url=" + encodeURIComponent(url), ms);
    const t = j && j.ok && j.url ? clean(j.url) : "";
    return t && looksPlayable(t) ? t : "";
  }
  // URL untuk iframe widget dari link lengkap hasil resolve() (parameter url= di-encode SEKALI di sini).
  function playerSrc(trackUrl, tail) { return "https://w.soundcloud.com/player/?url=" + encodeURIComponent(trackUrl) + (tail || ""); }

  // -> { ok, url, reason, short, debug }   url = link lengkap siap dipasang ke widget (kalau ok)
  async function resolve(raw, opts) {
    const timeoutMs = (opts && opts.timeoutMs) || 8000;
    const url = clean(raw);
    if (!url) return { ok: false, url: "", reason: "kosong", short: false, debug: "link kosong / tidak ada alamat di teks" };
    if (!isShort(url)) {
      return looksPlayable(url) ? { ok: true, url, reason: "", short: false } : { ok: false, url, reason: "bukan-lagu", short: false, debug: "bentuk link tidak dikenali: " + url };
    }
    const al = aliasFor(url);
    if (al && looksPlayable(al)) return { ok: true, url: al, reason: "", short: true, via: "alias" };
    const cached = readCache()[url];
    if (cached && looksPlayable(cached)) return { ok: true, url: cached, reason: "", short: true, via: "cache" };
    if (typeof navigator !== "undefined" && navigator.onLine === false) return { ok: false, url, reason: "offline", short: true, debug: "navigator.onLine = false" };
    let why = "";
    try {
      const json = await fetchJsonWithTimeout("https://soundcloud.com/oembed?format=json&iframe=true&url=" + encodeURIComponent(url), timeoutMs);
      const track = trackFromOembed(json);
      if (track) { writeCache(url, track); return { ok: true, url: track, reason: "", short: true, via: "oembed" }; }
      why = "oEmbed menjawab tetapi tanpa link lagu. html=" + String((json && json.html) || "(kosong)").slice(0, 220);
    } catch (e) { why = "oEmbed gagal: " + (e && e.message ? e.message : e); }
    try {
      const t = await resolveViaAppsScript(url, timeoutMs);
      if (t) { writeCache(url, t); return { ok: true, url: t, reason: "", short: true, via: "appsscript" }; }
      why += " | Apps Script: tidak ada jawaban/ belum dipasang";
    } catch (e) { why += " | Apps Script gagal: " + (e && e.message ? e.message : e); }
    return { ok: false, url, reason: /oEmbed gagal/.test(why) ? ((typeof navigator !== "undefined" && navigator.onLine === false) ? "offline" : "gagal-jaringan") : "tidak-diterjemahkan", short: true, debug: why };
  }

  // Teks petunjuk untuk pengguna (bahasa Indonesia) menurut alasan gagal.
  function explain(reason) {
    switch (reason) {
      case "kosong": return "Link SoundCloud kosong.";
      case "bukan-lagu": return "Link ini bukan halaman lagu SoundCloud (bentuk yang benar: soundcloud.com/nama-artis/judul-lagu).";
      case "offline": return "Link pendek SoundCloud (on.soundcloud.com) perlu internet untuk diterjemahkan ke link lengkap, dan perangkat sedang offline.";
      case "gagal-jaringan": return "Link pendek SoundCloud (on.soundcloud.com) gagal diterjemahkan ke link lengkap (jaringan lambat / diblokir).";
      default: return "Link SoundCloud ini tidak bisa diterjemahkan ke link lengkap. Solusi: pakai link LENGKAP (soundcloud.com/nama-artis/judul-lagu) di Sheet, atau daftarkan di CONFIG.SOUNDCLOUD_ALIASES (js/config.js).";
    }
  }

  root.SCLink = { extract, clean, isShort, looksPlayable, resolve, explain, trackFromOembed, playerSrc, aliasFor };
})(typeof window !== "undefined" ? window : globalThis);
