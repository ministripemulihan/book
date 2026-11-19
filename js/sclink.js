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
    if (host === "api.soundcloud.com") return /^\/(tracks|playlists|users)\/\d+/.test(u.pathname);
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

  // -> { ok, url, reason, short }   url = link lengkap siap dipasang ke widget (kalau ok)
  async function resolve(raw, opts) {
    const timeoutMs = (opts && opts.timeoutMs) || 8000;
    const url = clean(raw);
    if (!url) return { ok: false, url: "", reason: "kosong", short: false };
    if (!isShort(url)) {
      return looksPlayable(url) ? { ok: true, url, reason: "", short: false } : { ok: false, url, reason: "bukan-lagu", short: false };
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) return { ok: false, url, reason: "offline", short: true };
    try {
      const json = await fetchJsonWithTimeout("https://soundcloud.com/oembed?format=json&iframe=true&url=" + encodeURIComponent(url), timeoutMs);
      const m = /[?&]url=([^&"]+)/.exec((json && json.html) || "");
      if (m && m[1]) {
        const full = clean(decodeURIComponent(m[1]));
        if (full && looksPlayable(full)) return { ok: true, url: full, reason: "", short: true };
      }
      return { ok: false, url, reason: "tidak-diterjemahkan", short: true };
    } catch (e) {
      return { ok: false, url, reason: (typeof navigator !== "undefined" && navigator.onLine === false) ? "offline" : "gagal-jaringan", short: true };
    }
  }

  // Teks petunjuk untuk pengguna (bahasa Indonesia) menurut alasan gagal.
  function explain(reason) {
    switch (reason) {
      case "kosong": return "Link SoundCloud kosong.";
      case "bukan-lagu": return "Link ini bukan halaman lagu SoundCloud (bentuk yang benar: soundcloud.com/nama-artis/judul-lagu).";
      case "offline": return "Link pendek SoundCloud (on.soundcloud.com) perlu internet untuk diterjemahkan ke link lengkap, dan perangkat sedang offline.";
      case "gagal-jaringan": return "Link pendek SoundCloud (on.soundcloud.com) gagal diterjemahkan ke link lengkap (jaringan lambat / diblokir).";
      default: return "Link SoundCloud ini tidak bisa diterjemahkan ke link lengkap.";
    }
  }

  root.SCLink = { extract, clean, isShort, looksPlayable, resolve, explain };
})(typeof window !== "undefined" ? window : globalThis);
