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

console.log(ok ? "\nALL PASS" : "\nSOME FAIL");
process.exit(ok ? 0 : 1);
