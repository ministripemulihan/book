// node tests/bg-audio-library.test.js
"use strict";
require("../js/bg-audio-library.js");
const L = globalThis.BgAudioLibrary;
const mem = new Map();
L.useStore({ get: async (k) => (mem.has(k) ? mem.get(k) : null), set: async (k, v) => { mem.set(k, v); }, del: async (k) => { mem.delete(k); } });
let ok = true;
function expect(n, c, e) { console.log((c ? "PASS" : "FAIL") + " - " + n + (c ? "" : " :: " + JSON.stringify(e))); if (!c) ok = false; }
const mkFile = (name, size, type) => Object.assign(new Blob([new Uint8Array(size)], { type: type || "" }), { name });
(async () => {
  expect("daftar awal kosong", (await L.list("a")).length === 0, null);
  const e1 = await L.add("a", mkFile("Tenang.mp3", 1000, "audio/mpeg"));
  expect("tambah mp3 -> entri lengkap", e1.id && e1.name === "Tenang" && e1.kind === "mp3" && e1.size === 1000, e1);
  const e2 = await L.add("a", mkFile("lagu.m4a", 500, ""));
  expect("ekstensi m4a dikenali walau mime kosong", e2.kind === "mp3", e2);
  expect("daftar per pengguna", (await L.list("a")).length === 2 && (await L.list("b")).length === 0, null);
  const b = await L.getBlob(e1.id);
  expect("blob bisa diambil kembali", b && b.size === 1000, null);
  expect("blob id tak dikenal -> null", (await L.getBlob("zzz")) === null, null);
  let err = null; try { await L.add("a", mkFile("x.pdf", 10, "application/pdf")); } catch (e) { err = e; }
  expect("format asing ditolak (pesan Indonesia)", err && /tidak dikenali/.test(err.message), err && err.message);
  err = null; try { await L.add("a", mkFile("k.mid", 10, "audio/midi")); } catch (e) { err = e; }
  expect("MIDI ditolak selama pemutar MIDI belum aktif", err && /MIDI belum didukung/.test(err.message), err && err.message);
  const m = await L.add("a", mkFile("k.mid", 10, "audio/midi"), { allowMidi: true });
  expect("MIDI diterima kalau allowMidi", m.kind === "midi", m);
  err = null; try { await L.add("a", mkFile("besar.mp3", L.MAX_BYTES + 1, "audio/mpeg")); } catch (e) { err = e; }
  expect("terlalu besar ditolak", err && /terlalu besar/.test(err.message), err && err.message);
  err = null; try { await L.add("a", mkFile("kosong.mp3", 0, "audio/mpeg")); } catch (e) { err = e; }
  expect("berkas kosong ditolak", err && /kosong/.test(err.message), err && err.message);
  expect("total ukuran", (await L.totalBytes("a")) === 1510, await L.totalBytes("a"));
  await L.remove("a", e1.id);
  expect("hapus: hilang dari daftar & blob", (await L.list("a")).every((x) => x.id !== e1.id) && (await L.getBlob(e1.id)) === null, null);
  // kuota penuh
  L.useStore({ get: async () => null, set: async () => { const e = new Error("full"); e.name = "QuotaExceededError"; throw e; }, del: async () => {} });
  err = null; try { await L.add("a", mkFile("q.mp3", 10, "audio/mpeg")); } catch (e) { err = e; }
  expect("kuota penuh -> pesan jelas", err && /penuh/.test(err.message), err && err.message);
  expect("pseudo-URL upload", L.uploadUrl("x1") === "upload:x1" && L.isUploadUrl("upload:x1") && !L.isUploadUrl("https://a") && L.idFromUploadUrl("upload:x1") === "x1", null);
  console.log(ok ? "\nALL PASS" : "\nSOME FAIL"); process.exit(ok ? 0 : 1);
})();
