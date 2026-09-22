// Uji dialog "🎧 Audio Latar" (sumber audio) di DOM tiruan.
// Butuh jsdom (tidak ikut proyek):  npm i jsdom  lalu  node tests/dialog.jsdom.test.js
"use strict";
const fs = require("fs"), path = require("path");
let JSDOM;
try { ({ JSDOM } = require("jsdom")); } catch (e) { ({ JSDOM } = require(require.resolve("jsdom", { paths: [process.cwd(), "/tmp/lint/node_modules"] }))); }
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

function newWindow() {
  const dom = new JSDOM("<!doctype html><body></body>", { runScripts: "outside-only", pretendToBeVisual: true });
  const w = dom.window;
  w.alerts = [];
  w.alert = (m) => w.alerts.push(m);
  // showSimpleDialog / closeSimpleDialog ASLI dari js/app.js
  const app = read("js/app.js");
  const grab = (name) => { const i = app.indexOf("function " + name + "("); let d = 0, j = app.indexOf("{", i); const st = j; for (; j < app.length; j++) { if (app[j] === "{") d++; else if (app[j] === "}") { d--; if (d === 0) break; } } return app.slice(i, j + 1); };
  w.eval("function el(id){return document.getElementById(id);}\n" + grab("closeSimpleDialog") + "\n" + grab("showSimpleDialog") + "\nwindow.showSimpleDialog = showSimpleDialog; window.closeSimpleDialog = closeSimpleDialog;");
  w.eval(read("js/bg-audio.js"));
  w.eval(read("js/bg-audio-dialog.js"));
  for (const extra of (process.env.BG_EXTRA_SCRIPTS || "").split(",").filter(Boolean)) w.eval(read(extra));
  return w;
}
let ok = true;
function expect(name, cond, extra) { console.log((cond ? "PASS" : "FAIL") + " - " + name + (cond ? "" : " :: " + JSON.stringify(extra))); if (!cond) ok = false; }

function openDialog(w, opts) {
  let saved = "NOT_CALLED";
  w.BgAudioDialog.open(Object.assign({ title: "T", onSave: (v) => { saved = v; }, guessKind: (u) => /soundcloud\.com/.test(u) ? "sc" : (/youtu/.test(u) ? "yt" : (/\.midi?($|\?)/i.test(u) ? "midi" : "mp3")), extractYoutubeId: (u) => { const m = /youtu\.be\/([\w-]+)/.exec(u); return m ? m[1] : null; } }, opts));
  const d = w.document;
  const api = {
    get saved() { return saved; },
    radios: (nameStart) => Array.from(d.querySelectorAll("input[type=radio]")).filter((r) => r.name.startsWith(nameStart)),
    pick(nameStart, value) { const r = api.radios(nameStart).find((x) => x.value === value); if (!r) throw new Error("radio tidak ada: " + nameStart + "/" + value); r.checked = true; r.dispatchEvent(new w.Event("change", { bubbles: true })); },
    type(placeholderPart, v) { const i = Array.from(d.querySelectorAll("input[type=text]")).find((x) => (x.placeholder || "").includes(placeholderPart)); i.value = v; i.dispatchEvent(new w.Event("input", { bubbles: true })); return i; },
    save() { Array.from(d.querySelectorAll("button")).find((b) => b.textContent.trim() === "Simpan").click(); },
    sources: () => api.radios("psBgSource_").map((r) => r.value),
    isVisible: (el) => !!el && !el.closest("[hidden]"),
  };
  return api;
}

(function run() {
  // 1) baru: sumber default link, tempel SoundCloud -> jenis sc otomatis, default "tunggu panah", managed
  {
    const w = newWindow(); const dlg = openDialog(w, { existing: null });
    expect("sumber bawaan ada: link, lanjutkan, tanpa", ["link", "continue", "none"].every((k) => dlg.sources().includes(k)), dlg.sources());
    dlg.type("SoundCloud / YouTube", "https://on.soundcloud.com/kB2yzAz7fR37xuYo2a");
    expect("jenis sc terpilih otomatis", dlg.radios("psBgKind_").find((r) => r.checked).value === "sc", null);
    dlg.save();
    const v = dlg.saved;
    expect("hasil: sc + arrow + managed + source link", v && v.kind === "sc" && v.armStart === true && v.autoplay === false && v.managed === true && v.source === "link", v);
  }
  // 2) MP3 manual + ulang + nama
  {
    const w = newWindow(); const dlg = openDialog(w, { existing: null });
    dlg.type("SoundCloud / YouTube", "https://x.test/a.mp3");
    dlg.pick("psBgStart_", "manual");
    const sel = w.document.querySelector("select"); sel.value = "one"; sel.dispatchEvent(new w.Event("change"));
    Array.from(w.document.querySelectorAll("input[type=text]")).find((i) => i.placeholder.includes("Instrumen")).value = "Pembuka";
    dlg.save();
    const v = dlg.saved;
    expect("mp3 manual + ulang + nama", v && v.kind === "mp3" && !v.armStart && !v.autoplay && v.loopFile && v.label === "Pembuka" && v.managed, v);
  }
  // 3) "Ulang Semua" hanya YouTube
  {
    const w = newWindow(); const dlg = openDialog(w, { existing: null });
    dlg.type("SoundCloud / YouTube", "https://youtu.be/abc12345");
    const sel = w.document.querySelector("select");
    const allOpt = Array.from(sel.options).find((o) => o.value === "all");
    expect("YouTube: pilihan Ulang Semua tersedia", !allOpt.hidden && !allOpt.disabled, null);
    sel.value = "all"; sel.dispatchEvent(new w.Event("change"));
    const ta = w.document.querySelector("textarea");
    expect("kotak paket tampil", !ta.closest("[hidden]"), null);
    ta.value = "https://youtu.be/kedua123\nbukan-link";
    dlg.save();
    expect("paket dengan link salah ditolak, dialog tetap terbuka", dlg.saved === "NOT_CALLED" && w.alerts.length === 1 && !!w.document.getElementById("simpleDialogOverlay"), { saved: dlg.saved, alerts: w.alerts });
    ta.value = "https://youtu.be/kedua123";
    dlg.save();
    expect("paket valid tersimpan", dlg.saved && dlg.saved.loopAll && dlg.saved.extraUrls.length === 1, dlg.saved);
    // ganti ke SoundCloud -> "all" turun ke "one"
    const w2 = newWindow(); const d2 = openDialog(w2, { existing: { kind: "yt", url: "https://youtu.be/abc12345", loopAll: true, extraUrls: ["https://youtu.be/kedua123"], managed: true } });
    d2.type("SoundCloud / YouTube", "https://soundcloud.com/a/b");
    const sel2 = w2.document.querySelector("select");
    expect("ganti ke sc: 'all' turun jadi 'one'", sel2.value === "one", sel2.value);
  }
  // 4) Lanjutkan & Tanpa audio
  {
    const w = newWindow(); const dlg = openDialog(w, { existing: null });
    dlg.pick("psBgSource_", "continue"); dlg.save();
    expect("lanjutkan -> continuePrev", dlg.saved && dlg.saved.continuePrev === true && !dlg.saved.url && dlg.saved.managed, dlg.saved);
    const w2 = newWindow(); const d2 = openDialog(w2, { existing: { kind: "sc", url: "https://soundcloud.com/a/b", managed: true } });
    d2.pick("psBgSource_", "none"); d2.save();
    expect("tanpa audio -> onSave(null)", d2.saved === null, d2.saved);
    const w3 = newWindow(); const d3 = openDialog(w3, { existing: { kind: "mp3", url: "https://x/a.mp3", continuePrev: false } });
    d3.type("SoundCloud / YouTube", ""); d3.save();
    expect("link dikosongkan -> onSave(null)", d3.saved === null, d3.saved);
  }
  // 5) data LAMA terbaca benar
  {
    const w = newWindow();
    let dlg = openDialog(w, { existing: { kind: "mp3", url: "https://x/a.mp3", autoplay: true } });
    expect("lama: autoplay -> mode 'auto'", dlg.radios("psBgStart_").find((r) => r.checked).value === "auto", null);
    w.closeSimpleDialog();
    dlg = openDialog(w, { existing: { kind: "yt", url: "https://youtu.be/abc12345", armStart: true, loopFile: true } });
    expect("lama: armStart -> 'arrow', loopFile -> 'one'", dlg.radios("psBgStart_").find((r) => r.checked).value === "arrow" && w.document.querySelector("select").value === "one", null);
    w.closeSimpleDialog();
    dlg = openDialog(w, { existing: { kind: "mp3", url: "", continuePrev: true } });
    expect("lama: continuePrev -> sumber 'continue'", dlg.radios("psBgSource_").find((r) => r.checked).value === "continue", null);
  }
  // 6) sumber terdaftar muncul & dipakai
  {
    const w = newWindow();
    w.BgAudioDialog.registerSource({ key: "demo", label: "Demo", order: 30, isAvailable: () => true, build: () => { const el = w.document.createElement("div"); el.textContent = "demo"; return { el, getKind: () => "mp3", getValue: () => ({ url: "demo:1", kind: "mp3", label: "Lagu Demo", source: "upload", mediaId: "m1" }) }; } });
    w.BgAudioDialog.registerSource({ key: "hidden", label: "Tersembunyi", order: 31, isAvailable: () => false, build: () => ({ el: w.document.createElement("div") }) });
    const dlg = openDialog(w, { existing: null });
    expect("sumber terdaftar tampil, yg tidak tersedia disembunyikan", dlg.sources().includes("demo") && !dlg.sources().includes("hidden"), dlg.sources());
    dlg.pick("psBgSource_", "demo"); dlg.save();
    expect("hasil sumber terdaftar (source/mediaId/label)", dlg.saved && dlg.saved.url === "demo:1" && dlg.saved.source === "upload" && dlg.saved.mediaId === "m1" && dlg.saved.label === "Lagu Demo", dlg.saved);
  }
  console.log(ok ? "\nALL PASS" : "\nSOME FAIL");
  process.exit(ok ? 0 : 1);
})();
