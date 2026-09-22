// Uji cepat logika Audio Latar TANPA browser:  node tests/bg-audio.test.js
// Menjalankan js/bg-audio.js dengan Layar 2 "pura-pura" (rawPost mencatat pesan).
"use strict";
// "document" pura-pura secukupnya untuk banner error (showBgAudioErrorToast_)
const toasts = [];
globalThis.document = {
  createElement: () => ({ style: {}, querySelector: () => ({ addEventListener() {} }), remove() {}, set innerHTML(v) { toasts.push(v); } }),
  body: { appendChild() {} },
};
require("../js/bg-audio.js");
const posts = [];
const BG = globalThis.BgAudioModule.create({
  rawPost: (m) => posts.push(m),
  el: () => null,
  escapeHtml: (s) => String(s),
  extractYoutubeId: (u) => { const m = /youtu\.be\/([\w-]+)|v=([\w-]+)/.exec(u || ""); return m ? (m[1] || m[2]) : null; },
  buildYoutubeEmbedUrl: (id) => "https://yt/" + id,
});
const F = BG.fn;
const types = (from) => posts.slice(from).map((m) => m.type + (m.action ? ":" + m.action : "") + (m.fade ? ":fade" : "") + (m.armed !== undefined ? ":" + m.armed : ""));
let ok = true;
function expect(name, cond, extra) { console.log((cond ? "PASS" : "FAIL") + " - " + name + (cond ? "" : " :: " + JSON.stringify(extra))); if (!cond) ok = false; }
// meniru playlistNext() di Studio: klik panah pertama "diserap" kalau ada bait yang siap
function arrowNext() { if (BG.pendingArrow) { F.startBgForItem_(BG.pendingArrow.it); return "absorbed"; } return "moved"; }
const SC = "https://on.soundcloud.com/kB2yzAz7fR37xuYo2a";
let n;

// 1) centang "panah kanan": SoundCloud dimuat, bait 1 siap, panah 1x menyalakan, bait berikutnya tidak memutus
const armed = { kind: "sc", url: SC, label: "SoundCloud", autoplay: false, armStart: true };
const baits = [{ bgAudio: armed }, { bgAudio: armed }, { bgAudio: armed }];
F.loadSharedBgAudio_("sc", SC, "SoundCloud");
expect("muat sc -> hanya sc_bg, belum main", JSON.stringify(types(0)) === '["sc_bg"]', types(0));
n = posts.length; F.handleBgForActiveItem_(baits[0]);
expect("bait 1 tayang -> SIAP (badge nyala), belum main", !!BG.pendingArrow && !types(n).includes("sc_bg_control:play"), types(n));
expect("status = armed", F.bgNowState_().key === "armed", F.bgNowState_());
n = posts.length;
expect("panah #1 diserap", arrowNext() === "absorbed", null);
expect("panah #1 kirim play tanpa muat ulang", JSON.stringify(types(n)) === '["sc_bg_control:play","yt_bg_armed:false"]', types(n));
expect("status = connecting sampai Layar 2 lapor bunyi", F.bgNowState_().key === "connecting", F.bgNowState_());
BG.handlePresenterMessage({ source: "bibleAppPresenter", type: "present_bgaudio_state", kind: "sc", playing: true });
expect("laporan sungguhan -> playing", F.bgNowState_().key === "playing" && !F.bgNowState_().guess, F.bgNowState_());
n = posts.length;
expect("panah #2 pindah bait", arrowNext() === "moved", null);
F.handleBgForActiveItem_(baits[1]); F.handleBgForActiveItem_(baits[2]);
expect("bait 2 & 3: lagu tidak disentuh", types(n).every((t) => t === "yt_bg_armed:false") && BG.shared.started, types(n));
n = posts.length; F.handleBgForActiveItem_({});
expect("slide tanpa lagu -> fade-out & berhenti", types(n).includes("sc_bg_clear:fade") && BG.shared === null, types(n));

// 2) tanpa centang (manual): dimuat, bait tayang tidak mematikan, tidak siap
const manual = { kind: "sc", url: SC, label: "SoundCloud", autoplay: false, armStart: false };
F.loadSharedBgAudio_("sc", SC, "SoundCloud");
n = posts.length; F.handleBgForActiveItem_({ bgAudio: manual });
expect("manual: tidak siap & tidak dimatikan", !BG.pendingArrow && BG.shared && !types(n).some((t) => t.includes("_bg_clear")), types(n));
F.controlSharedBgAudio_("play");
n = posts.length; F.handleBgForActiveItem_({ bgAudio: manual });
expect("manual: sesudah Play, bait berikut tetap main", BG.shared.started && types(n).every((t) => !t.startsWith("sc_bg")), types(n));
F.controlSharedBgAudio_("stop");

// 3) siap tapi belum dimuat -> panah memuat lalu memutar
n = posts.length; F.handleBgForActiveItem_({ bgAudio: armed });
expect("belum dimuat + siap", !!BG.pendingArrow && BG.shared === null, null);
n = posts.length; arrowNext();
expect("panah memuat lalu memutar", JSON.stringify(types(n)) === '["sc_bg","sc_bg_control:play","yt_bg_armed:false"]', types(n));
F.controlSharedBgAudio_("stop");

// 4) Play manual saat siap -> panah berikutnya tidak diserap
F.loadSharedBgAudio_("sc", SC, "SoundCloud"); F.handleBgForActiveItem_({ bgAudio: armed });
F.controlSharedBgAudio_("play");
expect("Play manual membatalkan status siap", !BG.pendingArrow, BG.pendingArrow);
F.controlSharedBgAudio_("stop");

// 5) YouTube dari Kumpulan (armStart + loop) tetap jalan; fade saat slide tanpa lagu
const yt = { bgAudio: { kind: "yt", url: "https://youtu.be/abc12345", label: "x", armStart: true, autoplay: false, loopFile: true } };
F.handleBgForActiveItem_(yt);
n = posts.length; arrowNext();
expect("yt: panah memuat (loop) + play", types(n).includes("yt_bg") && types(n).includes("yt_bg_control:play"), types(n));
n = posts.length; F.handleBgForActiveItem_({});
expect("yt: fade-out di slide tanpa lagu", types(n).includes("yt_bg_clear:fade"), types(n));

// 6) lanjutkan / ulang / MP3 lama
F.loadSharedBgAudio_("sc", SC, "SoundCloud"); F.controlSharedBgAudio_("play");
n = posts.length; F.handleBgForActiveItem_({ bgAudio: { kind: "sc", url: "", continuePrev: true } });
expect("continuePrev: tidak disentuh", BG.shared && types(n).every((t) => !t.startsWith("sc_bg")), types(n));
n = posts.length; F.controlSharedBgAudio_("toggleloop");
expect("toggleloop sc -> loop_on", JSON.stringify(types(n)) === '["sc_bg_control:loop_on"]', types(n));
F.controlSharedBgAudio_("stop");
F.loadSharedBgAudio_("mp3", "http://x/a.mp3", "a"); F.controlSharedBgAudio_("play");
n = posts.length; F.handleBgForActiveItem_({});
expect("mp3 manual (perilaku lama) tidak dimatikan slide lain", BG.shared && BG.shared.kind === "mp3", types(n));
F.controlSharedBgAudio_("stop");

// 7) status: error, dijeda, perkiraan (YouTube tak melapor), jangan bohong "main" kalau diblokir
F.loadSharedBgAudio_("sc", SC, "L"); F.controlSharedBgAudio_("play");
BG.handlePresenterMessage({ source: "bibleAppPresenter", type: "present_bgaudio_status", ok: false, url: SC, message: "diblokir" });
expect("laporan gagal -> status error", F.bgNowState_().key === "error", F.bgNowState_());
BG.handlePresenterMessage({ source: "bibleAppPresenter", type: "present_bgaudio_state", kind: "sc", playing: true });
expect("lalu bunyi -> error hilang, playing", F.bgNowState_().key === "playing", F.bgNowState_());
BG.handlePresenterMessage({ source: "bibleAppPresenter", type: "present_bgaudio_state", kind: "sc", playing: false });
expect("dijeda", F.bgNowState_().key === "paused", F.bgNowState_());
expect("filter baris: lagu lain -> none", F.bgNowState_("https://lain", "sc").key === "none", null);
F.controlSharedBgAudio_("stop");
F.loadSharedBgAudio_("sc", SC, "L"); F.controlSharedBgAudio_("play");
expect("play terkirim tapi belum ada laporan -> BUKAN playing", F.bgNowState_().key === "connecting", F.bgNowState_());
BG.shared.playRequestedAt = Date.now() - 6000;
expect("5 detik tanpa laporan apa pun -> perkiraan playing", F.bgNowState_().key === "playing" && F.bgNowState_().guess, F.bgNowState_());
F.controlSharedBgAudio_("stop");
expect("pesan bukan milik Audio Latar diabaikan", BG.handlePresenterMessage({ source: "bibleAppPresenter", type: "present_yt_progress" }) === false, null);
expect("guessBgKindFromUrl_", F.guessBgKindFromUrl_("https://on.soundcloud.com/x") === "sc" && F.guessBgKindFromUrl_("https://youtu.be/a") === "yt" && F.guessBgKindFromUrl_("https://drive.google.com/x") === "mp3", null);


// 8) [tahap 1] MP3 bertanda managed ikut aturan baru; MP3 lama TIDAK berubah
{
  const MP3 = "https://x.test/lagu.mp3";
  const managedArm = { kind: "mp3", url: MP3, label: "m", armStart: true, managed: true };
  const baitsM = [{ bgAudio: managedArm }, { bgAudio: managedArm }];
  F.handleBgForActiveItem_(baitsM[0]);
  expect("mp3 managed: siap menunggu panah", !!BG.pendingArrow, null);
  n = posts.length; arrowNext();
  expect("mp3 managed: panah memuat + play", types(n).includes("mp3_bg") && types(n).includes("mp3_bg_control:play"), types(n));
  n = posts.length; F.handleBgForActiveItem_(baitsM[1]);
  expect("mp3 managed: bait berikut, lagu sama tidak diputus", types(n).every((t) => t === "yt_bg_armed:false") && BG.shared.started, types(n));
  n = posts.length; F.handleBgForActiveItem_({});
  expect("mp3 managed: slide tanpa audio -> fade-out", types(n).includes("mp3_bg_clear:fade") && BG.shared === null, types(n));
  // managed + continuePrev
  F.loadSharedBgAudio_("mp3", MP3, "m"); F.controlSharedBgAudio_("play");
  n = posts.length; F.handleBgForActiveItem_({ bgAudio: { kind: "mp3", url: "", continuePrev: true, managed: true } });
  expect("mp3 managed: lanjutkan tidak menyentuh", BG.shared && types(n).every((t) => !t.startsWith("mp3_bg")), types(n));
  F.controlSharedBgAudio_("stop");
  // managed + autoplay -> mulai sendiri; loop diteruskan
  n = posts.length; F.handleBgForActiveItem_({ bgAudio: { kind: "mp3", url: MP3, label: "m", autoplay: true, loopFile: true, managed: true } });
  expect("mp3 managed autoplay: muat, ulang, play", types(n).includes("mp3_bg") && types(n).includes("mp3_bg_control:loop_on") && types(n).includes("mp3_bg_control:play"), types(n));
  F.controlSharedBgAudio_("stop");
  // LAMA (tanpa managed): autoplay lewat jalur lama & tidak dimatikan slide lain
  n = posts.length; F.autoplayBgAudioIfEnabled_ && F.autoplayBgAudioIfEnabled_({ bgAudio: { kind: "mp3", url: MP3, label: "old", autoplay: true } });
  expect("mp3 LAMA autoplay tetap jalur lama", types(n).includes("mp3_bg") && types(n).includes("mp3_bg_control:play"), types(n));
  n = posts.length; F.handleBgForActiveItem_({});
  expect("mp3 LAMA tidak dimatikan slide lain (perilaku dulu)", BG.shared && BG.shared.kind === "mp3" && !types(n).some((t) => t.endsWith("_clear:fade")), types(n));
  F.controlSharedBgAudio_("stop");
  expect("isManagedBg_", F.isManagedBg_({ kind: "mp3", managed: true }) && !F.isManagedBg_({ kind: "mp3" }) && F.isManagedBg_({ kind: "sc" }), null);
}


// 9) [tahap 3] berkas UPLOAD: dibaca async dari pustaka, urutan pesan tetap "muat -> play"
(async () => {
  require("../js/bg-audio-library.js");
  const L = globalThis.BgAudioLibrary;
  const mem = new Map();
  L.useStore({ get: async (k) => (mem.has(k) ? mem.get(k) : null), set: async (k, v) => { mem.set(k, v); }, del: async (k) => { mem.delete(k); } });
  const blob = Object.assign(new Blob([new Uint8Array(100)], { type: "audio/mpeg" }), { name: "Tenang.mp3" });
  const entry = await L.add("u", blob);
  const url = L.uploadUrl(entry.id);
  const item = { bgAudio: { kind: "mp3", url, label: "Tenang", source: "upload", mediaId: entry.id, armStart: true, managed: true } };
  F.handleBgForActiveItem_(item);
  let m = posts.length;
  arrowNext(); // muat (async) + play langsung sesudahnya
  expect("upload: pesan muat BELUM terkirim sinkron, play juga menunggu (urutan dijaga)", !types(m).includes("mp3_bg") && !types(m).includes("mp3_bg_control:play"), types(m));
  await new Promise((r) => setTimeout(r, 30));
  const t2 = posts.slice(m);
  const iLoad = t2.findIndex((x) => x.type === "mp3_bg"), iPlay = t2.findIndex((x) => x.type === "mp3_bg_control" && x.action === "play");
  expect("upload: mp3_bg membawa Blob & url pseudo, lalu play SESUDAHNYA", iLoad >= 0 && iPlay > iLoad && t2[iLoad].blob && t2[iLoad].blob.size === 100 && t2[iLoad].url === url, t2.map((x) => x.type + ":" + (x.action || "")));
  expect("upload: status = connecting (menunggu laporan bunyi)", F.bgNowState_().key === "connecting", F.bgNowState_());
  F.controlSharedBgAudio_("stop");
  // berkas hilang
  const before = toasts.length;
  const ghost = { bgAudio: { kind: "mp3", url: L.uploadUrl("tidak-ada"), label: "Hilang", source: "upload", armStart: true, managed: true } };
  F.handleBgForActiveItem_(ghost); m = posts.length; arrowNext();
  await new Promise((r) => setTimeout(r, 30));
  expect("upload hilang: tidak ada mp3_bg dikirim, status error merah + banner", !posts.slice(m).some((x) => x.type === "mp3_bg") && F.bgNowState_().key === "error" && /tidak ditemukan/.test(F.bgNowState_().message) && toasts.length > before, F.bgNowState_());
  F.controlSharedBgAudio_("stop");
  // pesan biasa tetap sinkron setelah antrean kosong
  await new Promise((r) => setTimeout(r, 10));
  m = posts.length; F.loadSharedBgAudio_("mp3", "http://x/a.mp3", "a");
  expect("setelah antrean kosong, pesan kembali sinkron", types(m).join() === "mp3_bg", types(m));
  F.controlSharedBgAudio_("stop");
  console.log(ok ? "\nALL PASS" : "\nSOME FAIL"); process.exit(ok ? 0 : 1);
})();
