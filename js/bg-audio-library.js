/* global LocalDB */
// ============================================================
//  PUSTAKA AUDIO LATAR (BARU 20 Sep 2026, tahap 3 "Dari upload")
//  window.BgAudioLibrary -- menyimpan berkas audio yang DIUNGGAH operator
//  (mp3/m4a/aac/ogg/wav/flac/webm; .mid/.midi kalau pemutar MIDI aktif)
//  di IndexedDB perangkat ini, supaya bisa dipilih sebagai audio latar
//  sebuah slide TANPA harus punya link.
//
//  Kenapa TIDAK memakai daftar "Media Tersimpan": daftar itu rumit (sinkron
//  Drive, halaman PDF, thumbnail) & belum mengenal audio -- menambah jenis
//  di sana berisiko merusak daftar yang sudah jalan. Di sini disimpan di
//  toko "meta" IndexedDB yang sudah ada (LocalDB.getMeta/setMeta/deleteMeta,
//  js/db.js) dengan 2 macam kunci:
//     bgaudio:index:<username>  -> [{ id, name, size, mime, kind, createdAt }]
//     bgaudio:file:<id>         -> { blob, mime, name }
//  Berkas ditulis DULU, baru indeks -- kalau gagal di tengah, tidak ada
//  entri indeks yang menunjuk berkas kosong.
//
//  BATASAN (disengaja, sudah dicatat di TAHAP-SUMBER-AUDIO.md):
//   - HANYA lokal per perangkat (tidak ikut sinkron akun/Drive). Item
//     Kumpulan yang menunjuk berkas upload, kalau dibuka di perangkat lain,
//     tidak akan bunyi (muncul peringatan "berkas tidak ditemukan").
//   - Batas ukuran MAX_BYTES per berkas; kuota IndexedDB browser bisa
//     habis lebih dulu (add() melempar pesan yang jelas).
//
//  Pengujian tanpa browser: BgAudioLibrary.useStore({get,set,del}) mengganti
//  penyimpanan dengan Map di memori (lihat tests/bg-audio-library.test.js).
// ============================================================
(function (global) {
  "use strict";

  const MAX_BYTES = 25 * 1024 * 1024;
  const AUDIO_EXT = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm|weba)$/i;
  const MIDI_EXT = /\.(mid|midi)$/i;
  let store = null;

  function defaultStore() {
    const db = () => (typeof LocalDB !== "undefined" ? LocalDB : null);
    return {
      get: async (k) => { const d = db(); if (!d) throw new Error("Penyimpanan perangkat (IndexedDB) tidak tersedia."); return d.getMeta(k); },
      set: async (k, v) => { const d = db(); if (!d) throw new Error("Penyimpanan perangkat (IndexedDB) tidak tersedia."); return d.setMeta(k, v); },
      del: async (k) => { const d = db(); if (!d) return; return d.deleteMeta ? d.deleteMeta(k) : d.setMeta(k, null); },
    };
  }
  function st() { return store || (store = defaultStore()); }
  function useStore(s) { store = s; }

  const idxKey = (username) => "bgaudio:index:" + (username || "guest");
  const fileKey = (id) => "bgaudio:file:" + id;
  const genId = () => "bga_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // "audio" | "midi" | null (tidak dikenali)
  function detectKind(file) {
    const name = (file && file.name) || "";
    const type = ((file && file.type) || "").toLowerCase();
    if (MIDI_EXT.test(name) || type === "audio/midi" || type === "audio/x-midi" || type === "audio/mid") return "midi";
    if (AUDIO_EXT.test(name) || type.indexOf("audio/") === 0) return "audio";
    return null;
  }
  function fmtSize(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }

  async function list(username) {
    let arr = null;
    try { arr = await st().get(idxKey(username)); } catch (e) { return []; }
    return Array.isArray(arr) ? arr.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))) : [];
  }

  // opts.allowMidi: true kalau pemutar MIDI tersedia. Melempar Error berpesan Indonesia kalau ditolak.
  async function add(username, file, opts) {
    if (!file) throw new Error("Tidak ada berkas.");
    const kind = detectKind(file);
    if (!kind) throw new Error(`Format "${file.name || "?"}" tidak dikenali. Pakai mp3, m4a, aac, ogg, wav, flac${opts && opts.allowMidi ? ", atau mid/midi" : ""}.`);
    if (kind === "midi" && !(opts && opts.allowMidi)) throw new Error("Berkas MIDI belum didukung di versi ini.");
    if (!file.size) throw new Error("Berkas kosong (0 byte).");
    if (file.size > MAX_BYTES) throw new Error(`Berkas terlalu besar (${fmtSize(file.size)}). Batas ${fmtSize(MAX_BYTES)} per berkas -- kompres dulu, atau unggah ke Google Drive lalu tempel link-nya.`);
    const id = genId();
    const entry = { id, name: String(file.name || "audio").replace(/\.[^.]+$/, ""), size: file.size, mime: file.type || "", kind: kind === "midi" ? "midi" : "mp3", createdAt: new Date().toISOString() };
    try {
      await st().set(fileKey(id), { blob: file, mime: entry.mime, name: file.name || entry.name });
    } catch (e) {
      const quota = e && (e.name === "QuotaExceededError" || /quota/i.test(String(e.message)));
      throw new Error(quota ? "Penyimpanan perangkat penuh. Hapus berkas audio/media lain dulu, lalu coba lagi." : "Gagal menyimpan berkas: " + ((e && e.message) || e));
    }
    const cur = await list(username);
    cur.push(entry);
    await st().set(idxKey(username), cur);
    return entry;
  }

  async function getBlob(id) {
    if (!id) return null;
    let rec = null;
    try { rec = await st().get(fileKey(id)); } catch (e) { return null; }
    return rec && rec.blob ? rec.blob : null;
  }

  async function remove(username, id) {
    const cur = await list(username);
    await st().set(idxKey(username), cur.filter((x) => x.id !== id));
    await st().del(fileKey(id));
  }

  async function totalBytes(username) {
    return (await list(username)).reduce((a, x) => a + (x.size || 0), 0);
  }

  // Pseudo-URL yang disimpan di bgAudio.url untuk berkas upload: "upload:<id>"
  const UPLOAD_PREFIX = "upload:";
  const isUploadUrl = (u) => typeof u === "string" && u.indexOf(UPLOAD_PREFIX) === 0;
  const idFromUploadUrl = (u) => (isUploadUrl(u) ? u.slice(UPLOAD_PREFIX.length) : "");
  const uploadUrl = (id) => UPLOAD_PREFIX + id;

  global.BgAudioLibrary = { MAX_BYTES, list, add, getBlob, remove, totalBytes, detectKind, fmtSize, useStore, isUploadUrl, idFromUploadUrl, uploadUrl };
})(typeof window !== "undefined" ? window : globalThis);
