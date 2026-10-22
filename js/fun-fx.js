// ============================================================
//  🎉 EFEK LAYAR RIA (book184) -- dipakai bersama oleh:
//    • Pustaka Media (index.html)  : tombol 🧸 di pinggir kiri bawah (+ menu ⋯)
//    • Studio Presentasi           : tombol di tab Efek -> dikirim ke Layar 2
//                                    ({type:"funfx"} -> present.html)
//  Efek: 🎉 Pesta dari bawah / dari atas (topi, terompet, konfeti, pita),
//        🏆 Golden Buzzer (emas turun + lagu), 🧸 Boneka bengong/berpikir
//        berjalan, 🤫 Boneka orang tua "Ssst" lalu menunjuk jam.
//  MANDIRI: semua gambar = SVG/emoji, semua suara disintesis (tanpa file).
//  Lagu bisa diganti dengan link MP3 sendiri (setSoundUrl). Modul ini tidak
//  menyentuh Alkitab/Kidung -- hanya menambah satu lapisan sementara di atas
//  layar (pointer-events: none) yang dihapus otomatis setelah selesai.
// ============================================================
const FunFX = (function () {
  "use strict";

  const LIST = [
    { id: "party-bottom", icon: "🎉", label: "Pesta dari bawah", song: "party" },
    { id: "party-top", icon: "🎊", label: "Pesta dari atas", song: "party" },
    { id: "golden", icon: "🏆", label: "Golden Buzzer", song: "golden" },
    { id: "walker", icon: "🧸", label: "Boneka bengong", song: null },
    { id: "shush", icon: "🤫", label: "Boneka orang tua: Ssst!", song: null },
  ];
  const SONG_LABEL = { party: "Lagu Pesta", golden: "Lagu Golden Buzzer" };
  const LS_PREFIX = "funfx_song_";

  let cfg = {};
  let ownCtx = null;
  let running = []; // fungsi pembersih efek yang sedang jalan

  // ------------------------------------------------------------
  //  Util
  // ------------------------------------------------------------
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const vw = () => window.innerWidth || document.documentElement.clientWidth || 800;
  const vh = () => window.innerHeight || document.documentElement.clientHeight || 600;
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function animate(el, frames, opts) {
    if (!el || typeof el.animate !== "function") return Promise.resolve();
    try {
      const a = el.animate(frames, opts);
      return a.finished ? a.finished.catch(() => {}) : sleep((opts && opts.duration) || 0);
    } catch (e) { return Promise.resolve(); }
  }

  // ------------------------------------------------------------
  //  Lapisan tampilan (ikut elemen layar-penuh bila sedang layar penuh)
  // ------------------------------------------------------------
  function host() {
    return document.fullscreenElement || document.webkitFullscreenElement || document.body;
  }
  function ensureStyle() {
    if (document.getElementById("funfxStyle")) return;
    const st = document.createElement("style");
    st.id = "funfxStyle";
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  function makeLayer() {
    ensureStyle();
    const l = document.createElement("div");
    l.className = "ff-layer";
    host().appendChild(l);
    return l;
  }
  function register(layer, extraCleanup) {
    const clean = () => {
      try { if (extraCleanup) extraCleanup(); } catch (e) { /* abaikan */ }
      if (layer.parentNode) layer.parentNode.removeChild(layer);
      running = running.filter((f) => f !== clean);
    };
    running.push(clean);
    return clean;
  }
  function stopAll() { running.slice().forEach((f) => f()); stopSong(); }

  // ------------------------------------------------------------
  //  Audio (disintesis) + lagu kustom
  // ------------------------------------------------------------
  function ctx() {
    if (cfg.getAudioContext) return cfg.getAudioContext();
    if (!ownCtx) ownCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (ownCtx.state === "suspended" && ownCtx.resume) ownCtx.resume();
    return ownCtx;
  }
  function dest() { return cfg.getDestination ? cfg.getDestination() : ctx().destination; }
  function tone(freq, t0, dur, type, vol, glideTo) {
    const c = ctx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, c.currentTime + t0);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, c.currentTime + t0 + dur);
    g.gain.setValueAtTime(0.0001, c.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, c.currentTime + t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur);
    o.connect(g); g.connect(dest());
    o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.05);
  }
  function noise(t0, dur, vol, freq, q, mod) {
    const c = ctx();
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q || 1;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, c.currentTime + t0);
    if (mod) { // tepuk tangan: naik-turun acak
      for (let t = 0; t < dur; t += 0.06) g.gain.linearRampToValueAtTime(vol * rnd(0.2, 1), c.currentTime + t0 + t);
      g.gain.linearRampToValueAtTime(0.0001, c.currentTime + t0 + dur);
    } else {
      g.gain.exponentialRampToValueAtTime(vol, c.currentTime + t0 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur);
    }
    src.connect(f); f.connect(g); g.connect(dest());
    src.start(c.currentTime + t0); src.stop(c.currentTime + t0 + dur + 0.05);
  }
  const SOUNDS = {
    party() {
      noise(0, 0.12, 0.5, 900, 0.7);                 // pop
      noise(0.05, 0.12, 0.4, 2500, 0.7);
      tone(420, 0.1, 0.5, "sawtooth", 0.12, 760);    // terompet
      tone(520, 0.7, 0.5, "sawtooth", 0.12, 900);
      [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 1.2 + i * 0.13, 0.25, "triangle", 0.14));
      noise(1.2, 2.2, 0.12, 1800, 0.6, true);        // sorak/tepuk
    },
    golden() {
      [392, 523, 659, 784, 1047].forEach((f, i) => { tone(f, i * 0.12, 0.9, "triangle", 0.16); tone(f * 2, i * 0.12, 0.7, "sine", 0.06); });
      [1047, 1319, 1568].forEach((f) => tone(f, 0.7, 2.4, "sine", 0.1));
      for (let i = 0; i < 14; i++) tone(rnd(2200, 4200), 0.8 + i * 0.12, 0.18, "sine", 0.05); // gemerlap
      noise(0.8, 4.2, 0.18, 1800, 0.6, true);        // tepuk tangan meriah
    },
    walker() { // langkah kecil + "hmm?"
      [0, 0.45, 0.9, 1.35].forEach((t) => tone(180, t, 0.08, "sine", 0.18, 120));
      tone(260, 3.4, 0.5, "sine", 0.1, 340);
      tone(300, 4.3, 0.4, "triangle", 0.08, 420);
    },
    shush() { // "ssssst" + tik-tik jam
      noise(0, 0.9, 0.35, 6000, 1.2);
      noise(4.6, 0.7, 0.22, 6000, 1.2);
      [8.2, 8.7, 9.2, 9.7].forEach((t) => tone(1500, t - 3.0, 0.04, "square", 0.05));
    },
  };
  let songEl = null;
  function stopSong() {
    if (songEl) { try { songEl.pause(); } catch (e) { /* abaikan */ } songEl = null; }
  }
  function getSongUrl(song) { try { return localStorage.getItem(LS_PREFIX + song) || ""; } catch (e) { return ""; } }
  function setSongUrl(song, url) {
    try { if (url) localStorage.setItem(LS_PREFIX + song, url); else localStorage.removeItem(LS_PREFIX + song); } catch (e) { /* abaikan */ }
  }
  // Link Google Drive -> link unduh langsung (sama pola dengan efek suara lain di proyek ini)
  function normalizeUrl(u) {
    const m = String(u || "").match(/drive\.google\.com\/file\/d\/([^/]+)/) || String(u || "").match(/drive\.google\.com\/open\?id=([^&]+)/);
    return m ? "https://drive.google.com/uc?export=download&id=" + m[1] : String(u || "");
  }
  function playSound(effect, srcOverride) {
    try {
      const url = srcOverride || (effect.song ? getSongUrl(effect.song) : "");
      if (url) {
        stopSong();
        if (cfg.playUrl) { cfg.playUrl(normalizeUrl(url)); return; }
        songEl = new Audio(normalizeUrl(url));
        songEl.volume = 1;
        const p = songEl.play();
        if (p && p.catch) p.catch(() => {});
        return;
      }
      const key = effect.id.indexOf("party") === 0 ? "party" : effect.id;
      if (SOUNDS[key]) SOUNDS[key]();
    } catch (e) { /* suara gagal tidak boleh menghentikan tampilan */ }
  }

  // ------------------------------------------------------------
  //  🎉 Pesta: konfeti, topi, terompet, pita dari pojok
  // ------------------------------------------------------------
  const CONFETTI = ["#ff4d6d", "#ffd23f", "#3bceac", "#4ea8de", "#a45cf0", "#ff9f1c", "#ffffff"];
  const EMOJI = ["🎩", "🥳", "🎺", "🎈", "🎉", "🎊", "🪅", "🎁"];
  function parabola(x0, y0, vx, vy, g, T) {
    const frames = [];
    const n = 16;
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * T;
      frames.push({ x: x0 + vx * t, y: y0 + vy * t + 0.5 * g * t * t });
    }
    return frames;
  }
  async function party(fromTop, text) {
    const layer = makeLayer();
    const clean = register(layer);
    const W = vw(), H = vh();
    const corners = fromTop ? [[0, 0, 1], [W, 0, -1]] : [[0, H, 1], [W, H, -1]];
    const jobs = [];
    corners.forEach(([cx, cy, dir]) => {
      const total = 46;
      for (let i = 0; i < total; i++) {
        const el = document.createElement("div");
        const kind = i < 9 ? "emoji" : i < 15 ? "streamer" : "confetti";
        el.className = "ff-p";
        let size;
        if (kind === "emoji") { el.textContent = pick(EMOJI); size = rnd(30, 52); el.style.fontSize = size + "px"; }
        else if (kind === "streamer") { size = rnd(60, 110); el.style.width = "6px"; el.style.height = size + "px"; el.style.background = pick(CONFETTI); el.style.borderRadius = "3px"; }
        else { size = rnd(8, 14); el.style.width = size + "px"; el.style.height = size * rnd(0.5, 1.2) + "px"; el.style.background = pick(CONFETTI); }
        layer.appendChild(el);
        const spread = rnd(0.25, 1);
        const speed = rnd(0.55, 1.15) * Math.max(W, H) * (fromTop ? 0.55 : 0.95);
        let vx, vy;
        if (fromTop) { const ang = rnd(15, 75) * Math.PI / 180; vx = dir * Math.cos(ang) * speed * spread; vy = Math.sin(ang) * speed * 0.35; }
        else { const ang = rnd(50, 82) * Math.PI / 180; vx = dir * Math.cos(ang) * speed; vy = -Math.sin(ang) * speed; }
        const T = rnd(2.4, 3.8);
        const g = H * (fromTop ? 0.9 : 1.15) / 1.0;
        const f = parabola(cx, cy, vx, vy, g, T).map((p, k, a) => ({
          transform: `translate(${p.x}px, ${p.y}px) rotate(${k * rnd(30, 70) * (dir)}deg)`,
          opacity: k > a.length - 3 ? 0.2 : 1,
        }));
        jobs.push(animate(el, f, { duration: T * 1000, delay: rnd(0, fromTop ? 500 : 250), easing: "linear", fill: "forwards" }));
      }
    });
    if (text) {
      const b = document.createElement("div");
      b.className = "ff-banner";
      b.textContent = text;
      layer.appendChild(b);
      animate(b, [{ opacity: 0, transform: "translate(-50%,-50%) scale(.4)" }, { opacity: 1, transform: "translate(-50%,-50%) scale(1.08)", offset: 0.25 }, { opacity: 1, transform: "translate(-50%,-50%) scale(1)", offset: 0.85 }, { opacity: 0, transform: "translate(-50%,-50%) scale(1)" }], { duration: 4200, fill: "forwards" });
    }
    await Promise.all(jobs);
    clean();
  }

  // ------------------------------------------------------------
  //  🏆 Golden Buzzer
  // ------------------------------------------------------------
  const BUZZER_SVG = `<svg viewBox="0 0 220 200" class="ff-buzzer-svg" aria-hidden="true">
    <defs>
      <radialGradient id="ffGold" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#fff6b0"/><stop offset=".45" stop-color="#ffd23f"/><stop offset="1" stop-color="#b8860b"/></radialGradient>
      <linearGradient id="ffGoldBase" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5c542"/><stop offset="1" stop-color="#8a6508"/></linearGradient>
    </defs>
    <ellipse cx="110" cy="178" rx="92" ry="16" fill="#00000055"/>
    <path d="M24 150 Q24 176 110 176 Q196 176 196 150 L196 126 L24 126Z" fill="url(#ffGoldBase)" stroke="#6b4c06" stroke-width="3"/>
    <ellipse cx="110" cy="126" rx="86" ry="22" fill="#e0a916" stroke="#6b4c06" stroke-width="3"/>
    <path d="M44 124 Q44 40 110 40 Q176 40 176 124 Q110 146 44 124Z" fill="url(#ffGold)" stroke="#6b4c06" stroke-width="3"/>
    <ellipse cx="86" cy="76" rx="22" ry="12" fill="#ffffffaa" transform="rotate(-25 86 76)"/>
  </svg>`;
  async function golden(text) {
    const layer = makeLayer();
    const clean = register(layer);
    const W = vw(), H = vh();
    const glow = document.createElement("div");
    glow.className = "ff-gold-glow";
    layer.appendChild(glow);
    const rays = document.createElement("div");
    rays.className = "ff-gold-rays";
    layer.appendChild(rays);
    const stage = document.createElement("div");
    stage.className = "ff-gold-stage";
    stage.innerHTML = BUZZER_SVG + `<div class="ff-gold-text">${esc(text || "GOLDEN BUZZER!")}</div>`;
    layer.appendChild(stage);
    const jobs = [];
    jobs.push(animate(glow, [{ opacity: 0 }, { opacity: 0.95, offset: 0.08 }, { opacity: 0.45, offset: 0.4 }, { opacity: 0 }], { duration: 7500, fill: "forwards" }));
    jobs.push(animate(rays, [{ opacity: 0, transform: "translate(-50%,-50%) rotate(0deg)" }, { opacity: 0.8, offset: 0.12 }, { opacity: 0.6, offset: 0.8 }, { opacity: 0, transform: "translate(-50%,-50%) rotate(120deg)" }], { duration: 7500, fill: "forwards", easing: "linear" }));
    jobs.push(animate(stage, [
      { opacity: 0, transform: `translate(-50%, ${-H}px) scale(.6)` },
      { opacity: 1, transform: "translate(-50%, 20px) scale(1.05)", offset: 0.14 },
      { transform: "translate(-50%, -6px) scale(.98)", offset: 0.2 },
      { transform: "translate(-50%, 0) scale(1)", offset: 0.26 },
      { opacity: 1, transform: "translate(-50%, 0) scale(1.06)", offset: 0.5 },
      { opacity: 1, transform: "translate(-50%, 0) scale(1)", offset: 0.85 },
      { opacity: 0, transform: "translate(-50%, 0) scale(1.1)" },
    ], { duration: 7500, fill: "forwards" }));
    // hujan emas
    const golds = ["#ffd23f", "#f5b800", "#ffe680", "#d4a017", "#fff1a8"];
    for (let i = 0; i < 130; i++) {
      const el = document.createElement("div");
      el.className = "ff-p";
      const s = rnd(7, 16);
      if (Math.random() < 0.25) { el.textContent = pick(["✦", "★", "✨"]); el.style.color = pick(golds); el.style.fontSize = s * 1.8 + "px"; }
      else { el.style.width = s + "px"; el.style.height = s * rnd(0.5, 1.4) + "px"; el.style.background = `linear-gradient(135deg, ${pick(golds)}, #b8860b)`; }
      layer.appendChild(el);
      const x0 = rnd(0, W), sway = rnd(-90, 90), T = rnd(3.2, 5.8);
      const fr = [];
      for (let k = 0; k <= 12; k++) {
        const p = k / 12;
        fr.push({ transform: `translate(${x0 + Math.sin(p * 6 + i) * sway}px, ${-40 + p * (H + 90)}px) rotate(${p * rnd(360, 900)}deg)`, opacity: p > 0.92 ? 0.1 : 1 });
      }
      jobs.push(animate(el, fr, { duration: T * 1000, delay: rnd(300, 3200), easing: "linear", fill: "forwards" }));
    }
    await Promise.all(jobs);
    clean();
  }

  // ------------------------------------------------------------
  //  🧸 Boneka bengong / berpikir berjalan
  // ------------------------------------------------------------
  const WALKER_SVG = `<svg viewBox="0 0 140 190" class="ff-doll-svg" aria-hidden="true">
    <g class="ff-w-all">
      <g class="ff-leg ff-leg-l" style="transform-origin:58px 130px"><rect x="51" y="128" width="14" height="40" rx="7" fill="#3b4a8c"/><ellipse cx="55" cy="172" rx="13" ry="6.5" fill="#e04e4e"/></g>
      <g class="ff-leg ff-leg-r" style="transform-origin:82px 130px"><rect x="75" y="128" width="14" height="40" rx="7" fill="#3b4a8c"/><ellipse cx="85" cy="172" rx="13" ry="6.5" fill="#e04e4e"/></g>
      <g class="ff-arm ff-arm-l" style="transform-origin:46px 94px"><rect x="38" y="90" width="12" height="38" rx="6" fill="#4aa3df"/><circle cx="44" cy="130" r="7" fill="#ffd9b3"/></g>
      <rect x="44" y="84" width="52" height="52" rx="18" fill="#4aa3df"/>
      <rect x="44" y="116" width="52" height="8" fill="#2f86bd"/>
      <g class="ff-arm ff-arm-r" style="transform-origin:94px 94px"><rect x="90" y="90" width="12" height="38" rx="6" fill="#4aa3df"/><circle cx="96" cy="130" r="7" fill="#ffd9b3"/></g>
      <g class="ff-w-head" style="transform-origin:70px 80px">
        <circle cx="70" cy="50" r="36" fill="#ffd9b3"/>
        <path d="M33 48 Q34 11 70 11 Q106 11 107 48 Q92 30 70 33 Q48 30 33 48Z" fill="#6b3f1d"/>
        <circle cx="48" cy="62" r="6" fill="#ff9aa2" opacity=".6"/><circle cx="92" cy="62" r="6" fill="#ff9aa2" opacity=".6"/>
        <circle cx="56" cy="52" r="8" fill="#fff"/><circle cx="84" cy="52" r="8" fill="#fff"/>
        <circle class="ff-pupil" cx="56" cy="53" r="4" fill="#2b2118"/><circle class="ff-pupil" cx="84" cy="53" r="4" fill="#2b2118"/>
        <ellipse class="ff-mouth" cx="70" cy="72" rx="4.5" ry="3.5" fill="#c0504d"/>
      </g>
    </g>
  </svg>`;
  async function walker() {
    const layer = makeLayer();
    const doll = document.createElement("div");
    doll.className = "ff-walker ff-walking";
    doll.innerHTML = `<div class="ff-bubble" hidden></div>${WALKER_SVG}`;
    layer.appendChild(doll);
    doll.style.pointerEvents = "auto";
    let dead = false;
    const clean = register(layer, () => { dead = true; });
    doll.addEventListener("click", () => clean()); // ketuk bonekanya = pergi
    const bubble = doll.querySelector(".ff-bubble");
    const say = (t) => { if (t) { bubble.hidden = false; bubble.textContent = t; } else bubble.hidden = true; };
    const W = vw();
    const dw = doll.offsetWidth || 120;
    const move = async (x1, ms, flip) => {
      if (dead) return;
      doll.classList.add("ff-walking"); doll.classList.remove("ff-bengong", "ff-think");
      say("");
      const x0 = parseFloat(doll.dataset.x || String(-dw - 20));
      const svg = doll.querySelector(".ff-doll-svg");
      if (svg) svg.style.transform = `scaleX(${flip})`;
      await animate(doll, [{ transform: `translateX(${x0}px)` }, { transform: `translateX(${x1}px)` }], { duration: ms, easing: "linear", fill: "forwards" });
      doll.dataset.x = String(x1);
    };
    const stand = async (mode, texts, ms) => {
      if (dead) return;
      doll.classList.remove("ff-walking"); doll.classList.add(mode);
      for (let i = 0; i < texts.length; i++) { if (dead) return; say(texts[i]); await sleep(ms / texts.length); }
    };
    await move(W * 0.22, 3200, 1);
    await stand("ff-bengong", ["…", "💭", "..."], 2700);
    await move(W * 0.5, 3000, 1);
    await stand("ff-think", ["🤔", "hmm…?", "💡"], 3000);
    await move(W * 0.2, 3600, -1);        // balik arah sebentar, seperti bingung
    await stand("ff-bengong", ["💭", "…"], 2000);
    await move(W + dw + 40, 5200, 1);
    clean();
  }

  // ------------------------------------------------------------
  //  🤫 Boneka orang tua: "Ssst" -> menoleh -> menunjuk jam
  // ------------------------------------------------------------
  const ELDER_SVG = `<svg viewBox="0 0 260 300" class="ff-elder-svg" aria-hidden="true">
    <path d="M18 300 Q20 214 130 204 Q240 214 242 300Z" fill="#2f7f7a"/>
    <path d="M104 206 L130 246 L156 206 Q130 196 104 206Z" fill="#fff"/>
    <rect x="112" y="170" width="36" height="44" rx="14" fill="#e8b88a"/>
    <g class="ff-e-larm">
      <path d="M214 300 L204 206" stroke="#2f7f7a" stroke-width="40" stroke-linecap="round" fill="none"/>
      <rect x="190" y="176" width="30" height="34" rx="9" fill="#2f7f7a"/>
      <g class="ff-e-watch" transform="translate(205 168)">
        <rect x="-8" y="2" width="16" height="26" rx="4" fill="#5a3a22"/>
        <circle r="24" fill="#d4af37" stroke="#8a6508" stroke-width="3"/>
        <circle r="19" fill="#fffdf2"/>
        <g stroke="#444" stroke-width="2" stroke-linecap="round"><path d="M0 -17 V-13"/><path d="M0 17 V13"/><path d="M-17 0 H-13"/><path d="M17 0 H13"/></g>
        <path class="ff-e-hand-h" d="M0 0 V-9" stroke="#222" stroke-width="3" stroke-linecap="round"/>
        <path class="ff-e-hand-m" d="M0 0 V-14" stroke="#c0392b" stroke-width="2" stroke-linecap="round"/>
      </g>
    </g>
    <g class="ff-e-head" style="transform-origin:130px 170px">
      <path d="M50 118 Q40 80 70 62 Q76 100 70 140Z" fill="#f2f2f2"/>
      <path d="M210 118 Q220 80 190 62 Q184 100 190 140Z" fill="#f2f2f2"/>
      <ellipse cx="62" cy="122" rx="11" ry="17" fill="#e8b88a"/><ellipse cx="198" cy="122" rx="11" ry="17" fill="#e8b88a"/>
      <ellipse cx="130" cy="116" rx="70" ry="84" fill="#f3c9a0"/>
      <path d="M62 78 Q130 26 198 78 Q170 56 130 58 Q92 56 62 78Z" fill="#f2f2f2"/>
      <g class="ff-e-feat">
        <g stroke="#d9a679" stroke-width="2.5" fill="none" stroke-linecap="round"><path d="M92 80 Q130 70 168 80"/><path d="M96 90 Q130 82 164 90"/><path d="M74 118 l-9 3"/><path d="M186 118 l9 3"/></g>
        <path d="M82 98 Q100 86 118 98 Q100 94 82 98Z" fill="#e6e6e6" stroke="#bdbdbd" stroke-width="2"/>
        <path d="M142 98 Q160 86 178 98 Q160 94 142 98Z" fill="#e6e6e6" stroke="#bdbdbd" stroke-width="2"/>
        <ellipse cx="100" cy="114" rx="11" ry="8" fill="#fff"/><ellipse cx="160" cy="114" rx="11" ry="8" fill="#fff"/>
        <circle class="ff-e-pupil" cx="100" cy="114" r="4.5" fill="#3a2a1c"/><circle class="ff-e-pupil" cx="160" cy="114" r="4.5" fill="#3a2a1c"/>
        <g stroke="#444" stroke-width="3" fill="none"><circle cx="100" cy="114" r="20"/><circle cx="160" cy="114" r="20"/><path d="M120 112 Q130 106 140 112"/><path d="M80 112 L66 108"/><path d="M180 112 L194 108"/></g>
        <path d="M130 120 Q122 142 130 146 Q140 146 138 140" stroke="#d09a6c" stroke-width="3" fill="none" stroke-linecap="round"/>
        <circle cx="86" cy="144" r="9" fill="#f29c9c" opacity=".5"/><circle cx="174" cy="144" r="9" fill="#f29c9c" opacity=".5"/>
        <path d="M100 156 Q116 146 130 154 Q144 146 160 156 Q146 166 130 160 Q114 166 100 156Z" fill="#f4f4f4" stroke="#cfcfcf" stroke-width="2"/>
        <path class="ff-e-mouth" d="M114 172 Q130 180 146 172" stroke="#b5555a" stroke-width="4" fill="none" stroke-linecap="round" opacity="0"/>
      </g>
    </g>
    <path d="M52 300 L104 222" stroke="#2f7f7a" stroke-width="40" stroke-linecap="round" fill="none"/>
    <g class="ff-e-rhand" style="transform-origin:112px 214px">
      <ellipse cx="116" cy="204" rx="25" ry="21" fill="#f3c9a0" stroke="#d9a679" stroke-width="2"/>
      <rect class="ff-e-finger" x="122" y="132" width="18" height="76" rx="9" fill="#f3c9a0" stroke="#d9a679" stroke-width="2"/>
      <ellipse cx="131" cy="140" rx="6" ry="8" fill="#f9dcc0"/>
      <ellipse cx="98" cy="200" rx="9" ry="14" fill="#f3c9a0" stroke="#d9a679" stroke-width="2" transform="rotate(-30 98 200)"/>
    </g>
  </svg>`;
  async function shush() {
    const layer = makeLayer();
    const wrap = document.createElement("div");
    wrap.className = "ff-elder";
    wrap.innerHTML = ELDER_SVG + `<div class="ff-bubble ff-bubble-elder" hidden></div>`;
    layer.appendChild(wrap);
    wrap.style.pointerEvents = "auto";
    let dead = false;
    const clean = register(layer, () => { dead = true; });
    wrap.addEventListener("click", () => clean());
    const bubble = wrap.querySelector(".ff-bubble");
    const say = (t) => { bubble.hidden = !t; bubble.textContent = t || ""; };
    const set = (cls) => { wrap.classList.remove("ff-e-s0", "ff-e-s1", "ff-e-s2", "ff-e-s3"); wrap.classList.add(cls); };
    await animate(wrap, [{ transform: "translate(-50%, 105%)" }, { transform: "translate(-50%, 0)" }], { duration: 650, easing: "cubic-bezier(.2,1.2,.4,1)", fill: "forwards" });
    if (dead) return;
    set("ff-e-s0"); say("Ssssst…! 🤫");           // jari di bibir
    await sleep(3000); if (dead) return;
    set("ff-e-s1"); say("Mohon tenang ya… 🤫");   // menoleh ke kanannya
    await sleep(1900); if (dead) return;
    set("ff-e-s2"); say("");                       // menoleh ke kiri, tangan kiri naik
    await sleep(900); if (dead) return;
    set("ff-e-s3"); say("Sedang jam ibadah 🙏");  // jari kanan menunjuk jam di tangan kiri
    await sleep(4200); if (dead) return;
    await animate(wrap, [{ transform: "translate(-50%, 0)" }, { transform: "translate(-50%, 105%)" }], { duration: 550, easing: "ease-in", fill: "forwards" });
    clean();
  }

  // ------------------------------------------------------------
  //  API
  // ------------------------------------------------------------
  function play(id, opts) {
    const o = opts || {};
    if (id === "stop") { stopAll(); return Promise.resolve(); }
    const effect = LIST.filter((e) => e.id === id)[0];
    if (!effect) return Promise.resolve();
    stopAll();
    playSound(effect, o.src);
    if (id === "party-bottom") return party(false, o.text);
    if (id === "party-top") return party(true, o.text);
    if (id === "golden") return golden(o.text);
    if (id === "walker") return walker();
    if (id === "shush") return shush();
    return Promise.resolve();
  }

  // Tombol untuk Studio: onPick(id, {src, text}) dipanggil saat tombol ditekan.
  function renderStudioControls(container, onPick) {
    if (!container) return;
    container.innerHTML = "";
    const row = document.createElement("div");
    row.className = "ps-btn-row";
    const textIn = document.createElement("input");
    textIn.type = "text"; textIn.className = "ps-input"; textIn.placeholder = "Teks di layar (opsional), mis. Selamat Ulang Tahun!";
    textIn.style.cssText = "width:100%; margin:6px 0;";
    LIST.forEach((e) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip-btn small";
      b.textContent = e.icon + " " + e.label;
      b.addEventListener("click", () => {
        const withText = e.id === "golden" || e.id.indexOf("party") === 0;
        onPick(e.id, { src: e.song ? getSongUrl(e.song) : "", text: withText ? textIn.value.trim() : "" });
      });
      row.appendChild(b);
    });
    const stop = document.createElement("button");
    stop.type = "button"; stop.className = "chip-btn small"; stop.textContent = "⏹ Hentikan";
    stop.addEventListener("click", () => onPick("stop", {}));
    row.appendChild(stop);
    container.appendChild(row);
    container.appendChild(textIn);
    container.appendChild(songEditor());
  }
  function songEditor() {
    const box = document.createElement("div");
    box.className = "ff-songs";
    Object.keys(SONG_LABEL).forEach((k) => {
      const line = document.createElement("div");
      line.style.cssText = "display:flex; gap:6px; align-items:center; margin:4px 0; flex-wrap:wrap;";
      const lab = document.createElement("label");
      lab.textContent = "🎵 " + SONG_LABEL[k] + ":";
      lab.style.cssText = "font-size:.85em; min-width:150px;";
      const inp = document.createElement("input");
      inp.type = "text"; inp.className = "ps-input"; inp.style.cssText = "flex:1; min-width:140px;";
      inp.placeholder = "Link MP3 / Google Drive (kosong = suara bawaan)";
      inp.value = getSongUrl(k);
      inp.addEventListener("change", () => setSongUrl(k, inp.value.trim()));
      line.appendChild(lab); line.appendChild(inp);
      box.appendChild(line);
    });
    return box;
  }

  // ------------------------------------------------------------
  //  Peluncur di Pustaka Media: 🧸 (boneka jalan) + ⋯ (menu semua efek)
  // ------------------------------------------------------------
  function mountMediaLibraryLauncher() {
    const target = document.getElementById("mediaLibraryOverlay");
    if (!target || document.getElementById("ffLauncher")) return;
    ensureStyle();
    const box = document.createElement("div");
    box.id = "ffLauncher";
    box.className = "ff-launcher";
    box.hidden = true;
    box.innerHTML = `
      <div class="ff-menu" hidden></div>
      <button type="button" class="ff-l-btn ff-l-more" aria-label="Menu efek layar" title="Menu efek layar">⋯</button>
      <button type="button" class="ff-l-btn ff-l-doll" aria-label="Boneka jalan-jalan" title="Boneka jalan-jalan (bengong/berpikir)">🧸</button>`;
    document.body.appendChild(box);
    const menu = box.querySelector(".ff-menu");
    LIST.forEach((e) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip-btn small ff-menu-item";
      b.textContent = e.icon + " " + e.label;
      b.addEventListener("click", () => { menu.hidden = true; play(e.id); });
      menu.appendChild(b);
    });
    const stop = document.createElement("button");
    stop.type = "button"; stop.className = "chip-btn small ff-menu-item"; stop.textContent = "⏹ Hentikan efek";
    stop.addEventListener("click", () => { menu.hidden = true; stopAll(); });
    menu.appendChild(stop);
    menu.appendChild(songEditor());
    box.querySelector(".ff-l-more").addEventListener("click", () => { menu.hidden = !menu.hidden; });
    box.querySelector(".ff-l-doll").addEventListener("click", () => { menu.hidden = true; play("walker"); });
    const sync = () => {
      const open = !target.hidden;
      box.hidden = !open;
      if (!open) { menu.hidden = true; stopAll(); }
    };
    sync();
    try { new MutationObserver(sync).observe(target, { attributes: true, attributeFilter: ["hidden"] }); } catch (e) { setInterval(sync, 700); }
    // layar penuh: pindahkan peluncur ke elemen layar penuh supaya tetap kelihatan
    const reparent = () => { const h = host(); if (box.parentNode !== h) h.appendChild(box); };
    document.addEventListener("fullscreenchange", reparent);
    document.addEventListener("webkitfullscreenchange", reparent);
  }

  function configure(c) { cfg = Object.assign(cfg, c || {}); }

  const CSS = `
.ff-layer{position:fixed;inset:0;z-index:2147483000;pointer-events:none;overflow:hidden}
.ff-p{position:absolute;left:0;top:0;will-change:transform;line-height:1}
.ff-banner{position:absolute;left:50%;top:30%;transform:translate(-50%,-50%);font:800 clamp(28px,7vw,84px)/1.1 system-ui,sans-serif;color:#fff;text-align:center;max-width:92vw;text-shadow:0 3px 0 #e0457b,0 0 24px #ffd23f,0 6px 20px #0008;opacity:0}
.ff-gold-glow{position:absolute;inset:0;background:radial-gradient(circle at 50% 45%,#fff3a8 0%,#ffd23fcc 30%,#b8860b66 65%,#0000 100%);opacity:0}
.ff-gold-rays{position:absolute;left:50%;top:45%;width:230vmax;height:230vmax;transform:translate(-50%,-50%);opacity:0;background:repeating-conic-gradient(from 0deg,#ffe58a55 0deg 8deg,#0000 8deg 20deg);-webkit-mask-image:radial-gradient(circle,#000 0,#0000 55%);mask-image:radial-gradient(circle,#000 0,#0000 55%)}
.ff-gold-stage{position:absolute;left:50%;top:45%;margin-top:-26vmin;width:min(60vmin,420px);opacity:0;transform:translate(-50%,0);text-align:center}
.ff-buzzer-svg{width:100%;filter:drop-shadow(0 0 24px #ffd23f)}
.ff-gold-text{margin-top:8px;font:900 clamp(26px,6.5vw,72px)/1.05 system-ui,sans-serif;letter-spacing:.04em;background:linear-gradient(180deg,#fffbe0,#ffd23f 45%,#b8860b);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:2px #6b4c06;filter:drop-shadow(0 4px 10px #0009);white-space:nowrap}
.ff-walker{position:absolute;left:0;bottom:6px;width:clamp(90px,16vmin,150px);transform:translateX(-200px)}
.ff-doll-svg{width:100%;display:block;overflow:visible}
.ff-bubble{position:absolute;left:50%;bottom:100%;transform:translateX(-30%);margin-bottom:4px;background:#fff;color:#222;border:2px solid #333;border-radius:16px;padding:5px 12px;font:600 clamp(14px,2.4vmin,22px)/1.2 system-ui,sans-serif;white-space:nowrap;box-shadow:0 3px 10px #0004;animation:ffBub .9s ease-in-out infinite alternate}
.ff-walker .ff-bubble{left:30%}
@keyframes ffBub{from{transform:translateX(-30%) translateY(0)}to{transform:translateX(-30%) translateY(-4px)}}
.ff-leg-l,.ff-leg-r,.ff-arm-l,.ff-arm-r{transform-box:view-box}
.ff-walking .ff-leg-l{animation:ffLegA .5s ease-in-out infinite alternate}
.ff-walking .ff-leg-r{animation:ffLegB .5s ease-in-out infinite alternate}
.ff-walking .ff-arm-l{animation:ffLegB .5s ease-in-out infinite alternate}
.ff-walking .ff-arm-r{animation:ffLegA .5s ease-in-out infinite alternate}
.ff-walking .ff-w-all{animation:ffBob .25s ease-in-out infinite alternate}
@keyframes ffLegA{from{transform:rotate(-26deg)}to{transform:rotate(26deg)}}
@keyframes ffLegB{from{transform:rotate(26deg)}to{transform:rotate(-26deg)}}
@keyframes ffBob{from{transform:translateY(0)}to{transform:translateY(-3px)}}
.ff-bengong .ff-pupil{transform:translateY(-3px);transition:transform .6s}
.ff-bengong .ff-w-head{animation:ffTilt 1.6s ease-in-out infinite alternate}
.ff-bengong .ff-mouth{rx:6px;ry:5px}
@keyframes ffTilt{from{transform:rotate(-6deg)}to{transform:rotate(6deg)}}
.ff-think .ff-arm-r{transform:rotate(150deg);transition:transform .5s}
.ff-think .ff-pupil{transform:translate(-3px,-3px)}
.ff-think .ff-w-head{transform:rotate(-8deg);transition:transform .5s}
.ff-elder{position:absolute;left:50%;bottom:0;height:min(62vh,420px);aspect-ratio:260/300;transform:translate(-50%,105%)}
.ff-elder-svg{height:100%;width:100%;display:block;overflow:visible;filter:drop-shadow(0 6px 14px #0006)}
.ff-bubble-elder{left:78%;bottom:78%;transform:none;animation:none;font-size:clamp(15px,3vmin,26px)}
.ff-e-larm{opacity:0;transform:translateY(120px);transition:transform .7s ease,opacity .4s}
.ff-e-head,.ff-e-feat,.ff-e-rhand,.ff-e-pupil{transition:transform .7s ease}
.ff-e-s1 .ff-e-head{transform:rotate(-9deg)}
.ff-e-s1 .ff-e-feat{transform:translateX(-14px)}
.ff-e-s1 .ff-e-pupil{transform:translateX(-5px)}
.ff-e-s2 .ff-e-head,.ff-e-s3 .ff-e-head{transform:rotate(9deg)}
.ff-e-s2 .ff-e-feat,.ff-e-s3 .ff-e-feat{transform:translateX(14px)}
.ff-e-s2 .ff-e-pupil,.ff-e-s3 .ff-e-pupil{transform:translateX(5px)}
.ff-e-s2 .ff-e-larm,.ff-e-s3 .ff-e-larm{opacity:1;transform:translateY(0)}
.ff-e-s2 .ff-e-mouth,.ff-e-s3 .ff-e-mouth{opacity:1}
.ff-e-s3 .ff-e-rhand{transform:rotate(62deg)}
.ff-e-s3 .ff-e-hand-m{animation:ffTick 2s linear infinite;transform-origin:0 0}
@keyframes ffTick{to{transform:rotate(360deg)}}
.ff-launcher{position:fixed;left:0;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:2147482000;display:flex;flex-direction:column;align-items:flex-start;gap:6px}
.ff-launcher[hidden]{display:none}
.ff-l-btn{width:40px;height:40px;border:0;border-radius:0 20px 20px 0;background:#ffffffee;box-shadow:0 2px 10px #0004;font-size:21px;line-height:1;cursor:pointer;opacity:.85;padding:0 4px 0 0}
.ff-l-btn:active{transform:scale(.94)}
.ff-menu{display:flex;flex-direction:column;gap:6px;align-items:stretch;background:#fffffff2;color:#222;padding:10px;border-radius:0 14px 14px 0;box-shadow:0 4px 16px #0005;max-width:min(88vw,340px)}
.ff-menu[hidden]{display:none}
.ff-menu .ff-songs input{width:100%;font-size:12px}
.ff-menu .ff-songs label{min-width:0}
@media (prefers-reduced-motion:reduce){.ff-walking .ff-leg-l,.ff-walking .ff-leg-r,.ff-bengong .ff-w-head{animation:none}}
`;

  return { LIST, play, stopAll, configure, renderStudioControls, mountMediaLibraryLauncher, getSongUrl, setSongUrl };
})();

if (typeof window !== "undefined") {
  window.FunFX = FunFX;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => FunFX.mountMediaLibraryLauncher());
  else FunFX.mountMediaLibraryLauncher();
}
