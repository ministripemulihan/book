// Uji sumber "📁 Dari upload" di dialog.  node tests/source-upload.jsdom.test.js  (butuh jsdom)
process.env.BG_EXTRA_SCRIPTS = "js/bg-audio-library.js,js/bg-audio-source-upload.js";
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "dialog.jsdom.test.js"), "utf8");
const helpers = src.slice(0, src.indexOf("(function run()"));
const mod = new Function("require", "__dirname", "process", helpers + "\nreturn { newWindow, openDialog, expect, getOk: () => ok };");
const { newWindow, openDialog, expect, getOk } = mod(require, __dirname, process);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const w = newWindow();
  const mem = new Map();
  w.BgAudioLibrary.useStore({ get: async (k) => (mem.has(k) ? mem.get(k) : null), set: async (k, v) => { mem.set(k, v); }, del: async (k) => { mem.delete(k); } });
  w.confirm = () => true;
  // 1) daftar kosong -> pilih tanpa berkas ditolak
  let d = openDialog(w, { existing: null, username: "u" });
  expect("sumber upload muncul", d.sources().includes("upload"), d.sources());
  d.pick("psBgSource_", "upload"); await sleep(20);
  d.save();
  expect("tanpa berkas: peringatan & dialog tetap terbuka", d.saved === "NOT_CALLED" && w.alerts.length === 1 && !!w.document.getElementById("simpleDialogOverlay"), { s: d.saved, a: w.alerts });
  // 2) unggah berkas lewat <input type=file>
  const fileInput = w.document.querySelector("input[type=file]");
  const blob = new w.Blob([new Uint8Array(2048)], { type: "audio/mpeg" });
  const file = new w.File([blob], "Tenang 3.mp3", { type: "audio/mpeg" });
  Object.defineProperty(fileInput, "files", { value: [file], configurable: true });
  fileInput.dispatchEvent(new w.Event("change", { bubbles: true }));
  await sleep(50);
  const radios = d.radios("psBgUploadPick_");
  expect("berkas terunggah muncul & otomatis terpilih", radios.length === 1 && radios[0].checked, radios.length);
  d.save();
  const v = d.saved;
  expect("hasil: url upload:<id>, source upload, mediaId, label nama berkas, managed", v && /^upload:bga_/.test(v.url) && v.source === "upload" && v.mediaId && v.url === "upload:" + v.mediaId && v.label === "Tenang 3" && v.kind === "mp3" && v.managed, v);
  // 3) buka lagi item yang sama: sumber upload aktif & berkas terpilih
  const d2 = openDialog(w, { existing: v, username: "u" }); await sleep(20);
  expect("dibuka lagi: sumber upload aktif & berkas terpilih", d2.radios("psBgSource_").find((r) => r.checked).value === "upload" && d2.radios("psBgUploadPick_").find((r) => r.checked).value === v.mediaId, null);
  // 4) file salah format ditolak dengan pesan
  const bad = new w.File([new w.Blob([new Uint8Array(5)])], "dokumen.pdf", { type: "application/pdf" });
  Object.defineProperty(w.document.querySelectorAll("input[type=file]")[w.document.querySelectorAll("input[type=file]").length - 1], "files", { value: [bad], configurable: true });
  w.document.querySelectorAll("input[type=file]")[w.document.querySelectorAll("input[type=file]").length - 1].dispatchEvent(new w.Event("change", { bubbles: true })); await sleep(30);
  expect("format asing: pesan penolakan tampil", /tidak dikenali/.test(w.document.body.textContent), null);
  // 5) berkas hilang di perangkat ini -> peringatan
  const d3 = openDialog(w, { existing: { kind: "mp3", url: "upload:bga_hilang", source: "upload", mediaId: "bga_hilang", managed: true }, username: "u" }); await sleep(20);
  expect("berkas hilang: peringatan 'tidak ada di perangkat ini'", /tidak ada di perangkat ini/.test(w.document.body.textContent), null);
  // 6) hapus berkas dari pustaka
  const delBtn = Array.from(w.document.querySelectorAll("button")).find((b) => b.textContent === "🗑");
  delBtn.click(); await sleep(30);
  expect("hapus: berkas hilang dari pustaka", (await w.BgAudioLibrary.list("u")).length === 0, null);
  console.log(getOk() ? "\nALL PASS" : "\nSOME FAIL"); process.exit(getOk() ? 0 : 1);
})();
