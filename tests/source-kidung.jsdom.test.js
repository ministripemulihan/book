// Uji sumber "🎼 Dari kidung ini".  node tests/source-kidung.jsdom.test.js  (butuh jsdom, lihat dialog.jsdom.test.js)
process.env.BG_EXTRA_SCRIPTS = "js/bg-audio-source-kidung.js";
const { execFileSync } = require("child_process");
// memakai helper yang sama dengan uji dialog: muat ulang modul ini di jendela baru
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "dialog.jsdom.test.js"), "utf8");
// ambil hanya helper (newWindow/openDialog) sampai baris "(function run"
const helpers = src.slice(0, src.indexOf("(function run()"));
const mod = new Function("require", "__dirname", "process", helpers + "\nreturn { newWindow, openDialog, expect, getOk: () => ok };");
const { newWindow, openDialog, expect, getOk } = mod(require, __dirname, process);

const META = { buku: "Kidung", noKidung: "516", judul: "Hiburan dalam Pencobaan", linkMp3_1: "https://drive.google.com/file/d/AAA/view", linkMp3_2: "", linkYoutube: "https://youtu.be/abc12345", linkSoundcloud: "https://on.soundcloud.com/kB2yzAz7fR37xuYo2a", linkMidi: "https://x.test/k516.mid", linkVideo: "" };
const guess = (u) => /soundcloud\.com/.test(u) ? "sc" : (/youtu/.test(u) ? "yt" : (/\.midi?($|\?)/i.test(u) ? "midi" : "mp3"));

// 1) tanpa meta -> sumber tidak muncul
{ const w = newWindow(); const d = openDialog(w, { existing: null, kidungMeta: null, guessKind: guess });
  expect("tanpa data kidung: sumber 'kidung' tidak muncul", !d.sources().includes("kidung"), d.sources()); }
// 2) dengan meta: MIDI belum bisa diputar (tahap 4) -> disembunyikan; sisanya tampil
{ const w = newWindow(); const d = openDialog(w, { existing: null, kidungMeta: META, groupCount: 4, guessKind: guess });
  expect("sumber 'kidung' muncul", d.sources().includes("kidung"), d.sources());
  d.pick("psBgSource_", "kidung");
  const opts = d.radios("psBgKidungPick_").map((r) => r.value);
  expect("opsi: mp3_1, yt, sc (tanpa mp3_2 kosong & tanpa midi karena belum playable)", JSON.stringify(opts) === '["mp3_1","yt","sc"]', opts);
  d.pick("psBgKidungPick_", "sc"); d.save();
  const v = d.saved;
  expect("pilih SoundCloud kidung: source kidung + applyToGroup default centang + tunggu panah", v && v.kind === "sc" && v.source === "kidung" && v.applyToGroup === true && v.armStart === true && v.url === META.linkSoundcloud && /Hiburan/.test(v.label), v); }
// 3) groupCount 1 -> tidak ada kotak terapkan-semua; existing kidung dipilih otomatis
{ const w = newWindow(); const d = openDialog(w, { existing: { kind: "yt", url: META.linkYoutube, source: "kidung", managed: true }, kidungMeta: META, groupCount: 1, guessKind: guess });
  expect("existing source kidung: sumber aktif 'kidung' & opsi yt terpilih", d.radios("psBgSource_").find((r) => r.checked).value === "kidung" && d.radios("psBgKidungPick_").find((r) => r.checked).value === "yt", null);
  d.save();
  expect("groupCount 1: applyToGroup false", d.saved && d.saved.applyToGroup === false, d.saved); }
// 4) MIDI tampil kalau playable
{ const w = newWindow(); w.BgAudioDialog.playableKinds.push("midi");
  const d = openDialog(w, { existing: null, kidungMeta: META, guessKind: guess }); d.pick("psBgSource_", "kidung");
  expect("midi muncul setelah jenis 'midi' playable", d.radios("psBgKidungPick_").map((r) => r.value).includes("midi"), null); }
// 5) kolom MP3 berisi link SoundCloud -> jenisnya ikut bentuk link
{ const w = newWindow(); const d = openDialog(w, { existing: null, kidungMeta: Object.assign({}, META, { linkMp3_1: "https://soundcloud.com/a/b" }), guessKind: guess }); d.pick("psBgSource_", "kidung"); d.pick("psBgKidungPick_", "mp3_1"); d.save();
  expect("link SoundCloud di kolom MP3 -> kind sc", d.saved && d.saved.kind === "sc", d.saved); }
console.log(getOk() ? "\nALL PASS" : "\nSOME FAIL"); process.exit(getOk() ? 0 : 1);
