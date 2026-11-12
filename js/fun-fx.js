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
    { id: "icecream", icon: "🍦", label: "Es Krim Tenang (hadiah duduk diam)", song: null },
    { id: "aquarium", icon: "🐠", label: "Akuarium Tenang", song: null },
    { id: "count", icon: "🔢", label: "Hitung Hewan (kuda, gajah, ayam, anak, logo)", song: null },
    { id: "amen-all", icon: "🙏", label: "Amin bersama", song: "amen_all" },
    { id: "amen-male", icon: "👨", label: "Amin pria", song: "amen_male" },
    { id: "amen-female", icon: "👩", label: "Amin wanita", song: "amen_female" },
    { id: "amen-kids", icon: "🧒", label: "Amin anak-anak", song: "amen_kids" },
    { id: "call-lord", icon: "🙌", label: "Seru nama Tuhan", song: "call_lord" },
    { id: "sun", icon: "☀️", label: "Matahari (kilauan, tanpa suara)", song: null },
    { id: "word-amen", icon: "✨", label: "Tulisan AMIN timbul (silau 3D)", song: null },
    { id: "word-haleluya", icon: "✨", label: "Tulisan HALELUYA timbul (silau 3D)", song: null },
    { id: "word-lord", icon: "✨", label: "Tulisan O TUHAN YESUS timbul (silau 3D)", song: null },
  ];
  const SONG_LABEL = { party: "Lagu Pesta", golden: "Lagu Golden Buzzer", amen_all: "Suara Amin Bersama", amen_male: "Suara Amin Pria", amen_female: "Suara Amin Wanita", amen_kids: "Suara Amin Anak-anak", call_lord: "Suara Seru Nama Tuhan" };
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
    // book193: suara bawaan (sintesis) Amin & Seru Nama Tuhan -- dipakai kalau operator belum memasukkan suara sendiri.
    "amen-all"() { [196, 247, 330].forEach((f) => { tone(f, 0, 0.35, "triangle", 0.08); tone(f * 0.99, 0.4, 0.8, "triangle", 0.08); }); },
    "amen-male"() { tone(130, 0, 0.3, "triangle", 0.12); tone(110, 0.38, 0.8, "triangle", 0.12); },
    "amen-female"() { tone(260, 0, 0.3, "triangle", 0.1); tone(220, 0.38, 0.8, "triangle", 0.1); },
    "amen-kids"() { tone(440, 0, 0.25, "sine", 0.1); tone(392, 0.3, 0.6, "sine", 0.1); },
    "call-lord"() { [262, 330, 392, 523].forEach((f, i) => tone(f, i * 0.25, 1.2, "sine", 0.08)); },
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
        if (effect.id.indexOf("amen") !== 0) stopSong(); // book193: Amin singkat tidak memotong lagu/efek lain yang sedang jalan
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
    stage.innerHTML = BUZZER_SVG + `<div class="ff-gold-text"><span>${esc(text || "GOLDEN BUZZER!")}</span></div>`;
    layer.appendChild(stage);
    // book191 -- teks panjang (mis. "Selamat Ulang Tahun ...") dikecilkan otomatis sampai seluruh piala + teks muat di layar.
    try {
      const gt = stage.querySelector(".ff-gold-text");
      let fs = Math.min(72, W * 0.065);
      gt.style.fontSize = fs + "px";
      const bottomOf = () => H * 0.45 - 0.26 * Math.min(W, H) + stage.offsetHeight;
      while (bottomOf() > H * 0.96 && fs > 20) { fs -= 2; gt.style.fontSize = fs + "px"; }
    } catch (e) { /* ukuran bawaan CSS tetap dipakai */ }
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
  //  BARU (book191, permintaan operator "anak kecil yang suka jalan-jalan bisa diam duduk tenang")
  //  🍦 Es Krim Tenang: tantangan duduk diam bersama -- tiap N detik (bawaan 12) SATU scoop es krim jatuh pelan ke cone;
  //     sesudah 6 scoop tampil "Hebat! ... ambil hadiahmu" (bagikan stiker/permen sesudahnya). Operator bisa menekan ⏹ kapan saja
  //     (mis. kalau ribut lagi: tayangkan ulang supaya mulai dari nol).
  //  🐠 Akuarium Tenang: ikan-ikan berenang pelan + gelembung naik, terus tampil sampai ⏹ Hentikan -- pemandangan yang
  //     menenangkan untuk ditonton (tidak ada suara/kilat).
  // ------------------------------------------------------------
  const IC_FLAVORS = ["#ff9ec4", "#fff1d6", "#9be8c8", "#a9724f", "#ff6b81", "#9ec5ff", "#ffb35c", "#b9e27a", "#c9a0f0", "#fff08a"];
  let icUid = 0;
  const ri = (a, b) => Math.floor(rnd(a, b + 1)); // bilangan bulat acak a..b
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  // 1 scoop berbentuk "lumer": kubah + rok bergelombang + tetesan acak; bisa 2 warna (kiri-kanan / atas-bawah); topping meses opsional.
  function icScoopSvg(c1, c2, mode, sprinkles) {
    const id = "icg" + (++icUid);
    const grad = c2 ? `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" ${mode === "v" ? 'x1="0" y1="0" x2="0" y2="92" ' : 'x1="0" y1="0" x2="100" y2="0" '}><stop offset="${mode === "v" ? ".38" : ".5"}" stop-color="${c1}"/><stop offset="${mode === "v" ? ".38" : ".5"}" stop-color="${c2}"/></linearGradient>` : "";
    const f = c2 ? `url(#${id})` : c1;
    let drips = "";
    const n = ri(2, 3);
    for (let k = 0; k < n; k++) { const x = 14 + k * 28 + ri(0, 10), len = ri(16, 30); drips += `<rect x="${x}" y="58" width="9" height="${len}" rx="4.5" fill="${f}"/>`; }
    let spr = "";
    if (sprinkles) { const cols = ["#ff4d6d", "#4dabf7", "#ffd43b", "#51cf66", "#fff"]; for (let k = 0; k < 11; k++) { const x = ri(22, 76), y = ri(12, 44), r = ri(0, 160); spr += `<rect x="${x}" y="${y}" width="9" height="3" rx="1.5" fill="${pick(cols)}" transform="rotate(${r} ${x} ${y})"/>`; } }
    return `<svg viewBox="0 0 100 92" aria-hidden="true"><defs>${grad}</defs>
      <path d="M4 56 C4 22 24 4 50 4 C76 4 96 22 96 56Z" fill="${f}"/>
      <path d="M2 54 Q2 68 14 66 Q26 66 28 57 Q36 72 48 66 Q58 63 60 57 Q70 72 82 66 Q98 64 98 54Z" fill="${f}"/>
      ${drips}<ellipse cx="33" cy="22" rx="12" ry="6.5" fill="#fff" opacity=".38" transform="rotate(-25 33 22)"/>${spr}</svg>`;
  }
  function icVesselSvg(kind) {
    if (kind === "cup") return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M6 0 H94 L82 86 Q50 100 18 86Z" fill="#fdf6ec" stroke="#d9c7ad" stroke-width="3"/><path d="M26 0 L30 90 M50 0 V96 M74 0 L70 90" stroke="#f08ca8" stroke-width="5" fill="none"/></svg>`;
    return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M6 0 H94 L50 100Z" fill="#e8b36a" stroke="#b9823d" stroke-width="3"/><path d="M22 0 L50 62 M50 0 V100 M78 0 L50 62 M14 30 H86 M30 62 H70" stroke="#c98f45" stroke-width="2" fill="none"/></svg>`;
  }
  const CHERRY_SVG = `<svg viewBox="0 0 40 52" aria-hidden="true"><path d="M20 30 C20 14 28 6 36 4" stroke="#3f7d2c" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="20" cy="36" r="14" fill="#d62839"/><ellipse cx="15" cy="31" rx="4" ry="3" fill="#fff" opacity=".55"/></svg>`;
  const WAFER_SVG = `<svg viewBox="0 0 30 90" aria-hidden="true"><rect x="3" y="2" width="24" height="86" rx="3" fill="#efcf8e" stroke="#b98b45" stroke-width="2"/><path d="M3 24 H27 M3 46 H27 M3 68 H27 M15 2 V88" stroke="#c99a52" stroke-width="2"/></svg>`;

  // ------------------------------------------------------------
  //  🍦 Es Krim Tenang (book192): KECIL di pojok kanan bawah (setinggi boneka bengong), latar TRANSPARAN supaya tulisan di belakang tetap
  //  terbaca. BERULANG sampai ⏹ Hentikan: tiap putaran jumlah scoop ACAK (2-7), model ACAK (cone wafel / cup bergaris; scoop lumer
  //  1 warna atau 2 warna kiri-kanan/atas-bawah; meses; ceri; biskuit wafer kotak). Selesai 1 putaran -> "Hebat! ambil hadiahmu", lalu putaran baru.
  // ------------------------------------------------------------
  async function iceCream(text, seconds) {
    const layer = makeLayer();
    let dead = false;
    const clean = register(layer, () => { dead = true; });
    const W = vw(), H = vh(), vm = Math.min(W, H);
    const gap = Math.max(3, Math.min(120, Number(seconds) || 12)) * 1000;
    const pill = document.createElement("div"); pill.className = "ff-pill"; pill.style.bottom = "3vh"; pill.style.opacity = "0"; layer.appendChild(pill);
    const setPill = (t, right) => { pill.textContent = t; pill.style.right = right + "px"; animate(pill, [{ opacity: 0 }, { opacity: 1 }], { duration: 400, fill: "forwards" }); };
    while (!dead) {
      const n = ri(2, 6);
      const units = 1.3 + 1 + 0.46 * (n - 1) + 0.5;             // tinggi total dalam satuan lebar scoop (cone + scoop + ceri)
      const w = Math.min(vm * 0.17, (vm * 0.40) / units);       // tinggi total <= ~40% sisi layar (kecil, kira-kira 2x tinggi boneka bengong untuk 6 scoop)
      const coneH = w * 1.3, step = w * 0.46, scoopH = w * 0.92;
      const box = document.createElement("div"); box.className = "ff-ic2";
      box.style.width = w + "px"; box.style.height = (coneH + step * (n - 1) + scoopH + w * 0.6) + "px";
      layer.appendChild(box);
      const vessel = document.createElement("div");
      vessel.innerHTML = icVesselSvg(Math.random() < 0.7 ? "cone" : "cup");
      const vs = vessel.firstChild; vs.style.cssText = `left:${w * 0.04}px;bottom:0;width:${w * 0.92}px;height:${coneH}px`; box.appendChild(vs);
      const rightPx = W * 0.03 + w + 14;
      const flavors = shuffle(IC_FLAVORS.slice());
      for (let i = 0; i < n; i++) {
        setPill(i === 0 ? (text || "Duduk tenang yuk… 🍦") : `${i} dari ${n} es krim — hebat, terus duduk tenang!`, rightPx);
        await sleep(i === 0 ? Math.min(gap, 3000) : gap); if (dead) return;
        const two = Math.random() < 0.4;
        const holder = document.createElement("div");
        holder.innerHTML = icScoopSvg(flavors[i], two ? flavors[(i + 5) % flavors.length] : null, Math.random() < 0.5 ? "h" : "v", i === n - 1 && Math.random() < 0.5);
        const sv = holder.firstChild;
        sv.style.cssText = `left:0;bottom:${coneH - w * 0.2 + i * step}px;width:${w}px;height:${scoopH}px;z-index:${i + 1}`;
        box.appendChild(sv);
        try { tone(523 + i * 66, 0, 0.5, "sine", 0.06); } catch (e) { /* suara opsional */ }
        await animate(sv, [{ transform: `translateY(${-H * 0.5}px)`, opacity: 0 }, { transform: "translateY(0)", opacity: 1, offset: 0.7 }, { transform: "translateY(-3%)", offset: 0.85 }, { transform: "translateY(0)" }], { duration: 1300, easing: "cubic-bezier(.3,.7,.4,1)", fill: "forwards" });
        if (dead) return;
      }
      const topBottom = coneH - w * 0.2 + (n - 1) * step;
      if (Math.random() < 0.6) { const c = document.createElement("div"); c.innerHTML = CHERRY_SVG; const cs = c.firstChild; cs.style.cssText = `left:${w * 0.34}px;bottom:${topBottom + scoopH * 0.74}px;width:${w * 0.32}px;height:${w * 0.42}px;z-index:99`; box.appendChild(cs); animate(cs, [{ transform: "scale(0)" }, { transform: "scale(1.2)" }, { transform: "scale(1)" }], { duration: 500 }); }
      if (Math.random() < 0.5) { const c = document.createElement("div"); c.innerHTML = WAFER_SVG; const ws = c.firstChild; ws.style.cssText = `left:${w * 0.58}px;bottom:${topBottom + scoopH * 0.45}px;width:${w * 0.26}px;height:${w * 0.78}px;z-index:98;transform:rotate(22deg);transform-origin:50% 90%`; box.appendChild(ws); }
      setPill("🎉 Hebat! Semua duduk tenang — ambil hadiahmu ya! 🎁", rightPx);
      const sp = ["✨", "⭐", "💖"];
      for (let i = 0; i < 10; i++) {
        const e = document.createElement("div"); e.className = "ff-p"; e.textContent = pick(sp); e.style.fontSize = ri(16, 28) + "px"; layer.appendChild(e);
        const x0 = W - w * 1.5 - rnd(0, W * 0.2);
        animate(e, [{ transform: `translate(${x0}px,${H * 0.45}px)`, opacity: 1 }, { transform: `translate(${x0 + rnd(-40, 40)}px,${H}px)`, opacity: 0 }], { duration: rnd(3500, 6000), delay: rnd(0, 1500), easing: "ease-in", fill: "forwards" });
      }
      await sleep(7000); if (dead) return;
      await animate(box, [{ opacity: 1 }, { opacity: 0 }], { duration: 900, fill: "forwards" });
      box.remove(); pill.style.opacity = "0";
      await sleep(1500);
    }
    clean();
  }

  // ------------------------------------------------------------
  //  🐠 Akuarium Tenang (book192): latar TRANSPARAN, ikan kecil + gelembung kecil berenang terus (berulang sampai ⏹).
  // ------------------------------------------------------------
  function aquarium(text) {
    const layer = makeLayer();
    register(layer);
    const W = vw(), H = vh();
    const pill = document.createElement("div"); pill.className = "ff-pill"; pill.style.left = "3vw"; pill.style.bottom = "3vh";
    pill.textContent = text || "Ssst… lihat ikan-ikan berenang 🐠"; layer.appendChild(pill);
    animate(pill, [{ opacity: 0 }, { opacity: 1 }], { duration: 800, fill: "forwards" });
    const fishes = shuffle(["🐠", "🐟", "🐡", "🐠", "🐙", "🐢", "🐟", "🐬", "🦀", "🐳"]).slice(0, 7);
    fishes.forEach((f, i) => {
      const el = document.createElement("div"); el.className = "ff-aq-fish"; el.textContent = f; layer.appendChild(el);
      const y = H * (0.12 + 0.76 * (i / fishes.length)) + rnd(-15, 15), dur = rnd(22000, 38000), ltr = Math.random() < 0.5;
      const x0 = ltr ? -120 : W + 40, x1 = ltr ? W + 40 : -120, flip = ltr ? " scaleX(-1)" : "";
      const fr = [];
      for (let k = 0; k <= 10; k++) { const q = k / 10; fr.push({ transform: `translate(${x0 + (x1 - x0) * q}px, ${y + Math.sin(q * 9 + i) * 18}px)${flip}` }); }
      try { el.animate(fr, { duration: dur, iterations: Infinity, delay: -rnd(0, dur), easing: "linear" }); } catch (e) { /* abaikan */ }
    });
    for (let i = 0; i < 12; i++) {
      const b = document.createElement("div"); b.className = "ff-aq-bub"; const sz = rnd(6, 16); b.style.width = b.style.height = sz + "px"; layer.appendChild(b);
      const x = rnd(0, W), dur = rnd(8000, 15000);
      try { b.animate([{ transform: `translate(${x}px,${H + 20}px)`, opacity: 0.9 }, { transform: `translate(${x + rnd(-30, 30)}px,-30px)`, opacity: 0 }], { duration: dur, iterations: Infinity, delay: -rnd(0, dur), easing: "ease-in" }); } catch (e) { /* abaikan */ }
    }
    return Promise.resolve();
  }

  // ------------------------------------------------------------
  //  🔢 Hitung Hewan (book192): "Coba hitung jumlahnya ya!" -> kuda, gajah, ayam, anak (cowok/cewek ACAK) dan logo pojok kiri atas
  //  muncul satu-satu di tempat ACAK (kecil, tulisan di belakang tetap terbaca). Jumlah tiap jenis ACAK 1-8 (beda tiap kali).
  //  Di akhir: "Sudah tahu jumlahnya?" -> tiap jenis + jumlahnya diumumkan satu per satu di bawah.
  // ------------------------------------------------------------
  async function countGame(text) {
    const layer = makeLayer();
    let dead = false;
    const clean = register(layer, () => { dead = true; });
    const W = vw(), H = vh(), vm = Math.min(W, H);
    const size = Math.max(40, Math.min(84, vm * 0.085));
    const logoEl = document.getElementById("cornerLogo");
    const logoSrc = logoEl && logoEl.getAttribute("src") ? logoEl.src : "";
    const boy = Math.random() < 0.5;
    const cats = [
      { html: "🐴", name: "kuda" }, { html: "🐘", name: "gajah" }, { html: "🐔", name: "ayam" },
      { html: boy ? "👦" : "👧", name: boy ? "anak laki-laki" : "anak perempuan" },
    ];
    if (logoSrc.length > 30) cats.push({ img: logoSrc, name: "logo" });
    let counts; do { counts = cats.map(() => ri(1, 8)); } while (new Set(counts).size < 2);
    const mk = (c, px) => { const d = document.createElement("div"); d.className = "ff-cnt-item"; if (c.img) { const im = document.createElement("img"); im.src = c.img; im.style.width = px * 2 + "px"; im.style.height = "auto"; im.style.maxHeight = px * 1.2 + "px"; d.appendChild(im); } else { d.textContent = c.html; d.style.fontSize = px + "px"; } return d; };
    const pill = document.createElement("div"); pill.className = "ff-pill"; pill.style.left = "50%"; pill.style.top = "3vh"; pill.style.transform = "translateX(-50%)"; layer.appendChild(pill);
    const say = (t) => { pill.textContent = t; animate(pill, [{ opacity: 0 }, { opacity: 1 }], { duration: 400, fill: "forwards" }); };
    say(text || "🔎 Coba hitung jumlahnya ya!");
    await sleep(3500); if (dead) return;
    say("👀 Hitung dalam hati… jangan bilang dulu ya!");
    const order = [];
    cats.forEach((c, ci) => { for (let k = 0; k < counts[ci]; k++) order.push(c); });
    shuffle(order);
    const placed = [];
    for (const c of order) {
      let x = 0, y = 0;
      for (let t = 0; t < 60; t++) {
        x = rnd(W * 0.03, W * 0.97 - size * 2); y = rnd(H * 0.14, H * 0.76 - size); // sisakan pita bawah untuk jawaban
        const inText = y + size > H * 0.34 && y < H * 0.68; // pita tengah = tempat tulisan -- dihindari dulu (40 percobaan pertama), baru boleh bila penuh
        if (inText && t < 30) continue;
        if (placed.every((q) => Math.hypot(q.x - x, q.y - y) > size * 0.95)) break;
      }
      placed.push({ x, y });
      const it = mk(c, size); it.style.left = x + "px"; it.style.top = y + "px"; layer.appendChild(it);
      try { tone(380 + rnd(0, 320), 0, 0.15, "sine", 0.05); } catch (e) { /* suara opsional */ }
      await animate(it, [{ transform: "scale(0) rotate(-20deg)", opacity: 0 }, { transform: "scale(1.2) rotate(6deg)", opacity: 1, offset: 0.7 }, { transform: "scale(1) rotate(0)", opacity: 1 }], { duration: 450, easing: "ease-out", fill: "forwards" });
      if (dead) return;
      try { it.animate([{ translate: "0 0" }, { translate: `0 ${rnd(-6, 6)}px` }, { translate: "0 0" }], { duration: rnd(2500, 4000), iterations: Infinity }); } catch (e) { /* abaikan */ }
      await sleep(550); if (dead) return;
    }
    await sleep(2500); if (dead) return;
    say("🤔 Sudah tahu jumlahnya? Ini jawabannya!");
    await sleep(2500); if (dead) return;
    const res = document.createElement("div"); res.className = "ff-cnt-res"; layer.appendChild(res);
    for (let ci = 0; ci < cats.length; ci++) {
      const chip = document.createElement("div"); chip.className = "ff-cnt-chip";
      const ic = mk(cats[ci], 40); ic.style.position = "static"; ic.style.filter = "none"; ic.style.fontSize = "1em"; if (cats[ci].img) { ic.firstChild.style.width = "2.4em"; ic.firstChild.style.height = "auto"; ic.firstChild.style.maxHeight = "1.2em"; }
      chip.appendChild(ic); chip.appendChild(document.createTextNode(" × " + counts[ci])); res.appendChild(chip);
      try { tone(587 + ci * 70, 0, 0.3, "triangle", 0.07); } catch (e) { /* suara opsional */ }
      await animate(chip, [{ transform: "scale(0)", opacity: 0 }, { transform: "scale(1.15)", opacity: 1, offset: 0.7 }, { transform: "scale(1)", opacity: 1 }], { duration: 500, fill: "forwards" });
      await sleep(2200); if (dead) return;
    }
    say("🎉 Hebat! Cocok dengan hitunganmu?");
    await sleep(15000); if (dead) return;
    await animate(layer, [{ opacity: 1 }, { opacity: 0 }], { duration: 1000, fill: "forwards" });
    clean();
  }

  // ------------------------------------------------------------
  //  🙏 Amin (book193): 4 varian singkat -- bersama (3 orang), pria, wanita, anak-anak. Gambar kecil (sebesar boneka bengong) muncul di bawah,
  //  mengangguk sambil berdoa + gelembung "Amin!", ~2,5 detik lalu hilang. TIDAK menghentikan efek/lagu lain; menekan lagi mengganti Amin sebelumnya.
  //  Suara: link/berkas milik operator (Panel Efek > bagian "Suara", kunci amen_all/male/female/kids); kosong = suara sintesis bawaan.
  // ------------------------------------------------------------
  let amenClean = null;
  async function amen(id) {
    if (amenClean) amenClean();
    const layer = makeLayer();
    let dead = false;
    const clean = register(layer, () => { dead = true; });
    amenClean = clean;
    const kids = ["👦", "👧", "🧒"];
    const people = id === "amen-male" ? ["👨"] : id === "amen-female" ? ["👩"] : id === "amen-kids" ? [pick(kids), pick(kids)] : ["👨", "👩", pick(kids)];
    const fig = document.createElement("div"); fig.className = "ff-amen-fig";
    fig.style.left = rnd(vw() * 0.12, vw() * 0.7) + "px";
    const bub = document.createElement("div"); bub.className = "ff-amen-bub"; bub.textContent = "Amin!";
    const row = document.createElement("div"); row.className = "ff-amen-row";
    const els = people.map((e) => { const d = document.createElement("div"); d.className = "ff-amen-p"; d.innerHTML = `<div>${e}</div><div class="ff-amen-hands">🙏</div>`; row.appendChild(d); return d; });
    fig.appendChild(bub); fig.appendChild(row); layer.appendChild(fig);
    await animate(fig, [{ transform: "translateY(120%)", opacity: 0 }, { transform: "translateY(-6%)", opacity: 1, offset: 0.7 }, { transform: "translateY(0)", opacity: 1 }], { duration: 380, easing: "ease-out", fill: "forwards" });
    if (dead) return;
    animate(bub, [{ transform: "scale(0)" }, { transform: "scale(1.15)" }, { transform: "scale(1)" }], { duration: 300, fill: "backwards" });
    els.forEach((d, i) => animate(d, [{ transform: "rotate(0)" }, { transform: "rotate(7deg) translateY(4%)" }, { transform: "rotate(0)" }, { transform: "rotate(-6deg) translateY(3%)" }, { transform: "rotate(0)" }], { duration: 1500, delay: i * 90 }));
    for (let i = 0; i < 6; i++) { const e = document.createElement("div"); e.className = "ff-p"; e.textContent = "✨"; e.style.fontSize = ri(16, 26) + "px"; layer.appendChild(e); const x0 = parseFloat(fig.style.left) + rnd(0, 140); animate(e, [{ transform: `translate(${x0}px,${vh() * 0.8}px)`, opacity: 1 }, { transform: `translate(${x0 + rnd(-30, 30)}px,${vh() * 0.5}px)`, opacity: 0 }], { duration: rnd(1200, 2000), delay: rnd(0, 600), fill: "forwards" }); }
    await sleep(2200); if (dead) return;
    await animate(layer, [{ opacity: 1 }, { opacity: 0 }], { duration: 450, fill: "forwards" });
    if (amenClean === clean) amenClean = null;
    clean();
  }

  // ------------------------------------------------------------
  //  🙌 Seru Nama Tuhan (book193): beberapa orang (pria/wanita/tua/anak) mengangkat tangan di bawah layar, gelembung "O Tuhan Yesus!" bergantian
  //  (kolom teks efek = kalimat serunya), cahaya keemasan lembut + kilau naik. ~9 detik. Kecil & transparan, tulisan di belakang tetap terbaca.
  // ------------------------------------------------------------
  async function callLord(text) {
    const layer = makeLayer();
    let dead = false;
    const clean = register(layer, () => { dead = true; });
    const W = vw(), H = vh();
    const label = text || "O Tuhan Yesus!";
    const glow = document.createElement("div"); glow.className = "ff-cl-glow"; layer.appendChild(glow);
    animate(glow, [{ opacity: 0 }, { opacity: 1 }], { duration: 1200, fill: "forwards" });
    const pool = shuffle(["👨", "👩", "👴", "👵", "🧒", "👧", "👦", "🧑"]);
    const n = 6;
    const els = [];
    for (let i = 0; i < n; i++) {
      const d = document.createElement("div"); d.className = "ff-cl-p";
      d.style.left = (W * (0.07 + (0.86 * i) / (n - 1)) - 40 + rnd(-12, 12)) + "px";
      d.innerHTML = `<div class="ff-cl-hands">🙌</div><div>${pool[i]}</div>`;
      layer.appendChild(d); els.push(d);
      animate(d, [{ transform: "translateY(120%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], { duration: 500, delay: i * 220, easing: "ease-out", fill: "both" });
      try { d.firstChild.animate([{ transform: "translateY(0)" }, { transform: "translateY(-8%)" }, { transform: "translateY(0)" }], { duration: rnd(1100, 1600), iterations: Infinity, delay: 1200 + i * 120 }); } catch (e) { /* abaikan */ }
    }
    await sleep(1500); if (dead) return;
    const order = shuffle(els.slice());
    for (let k = 0; k < 4; k++) {
      const who = order[k % order.length];
      const b = document.createElement("div"); b.className = "ff-amen-bub"; b.textContent = label; b.style.cssText = `position:absolute;white-space:nowrap;left:${parseFloat(who.style.left) - 20}px;bottom:${vh() * 0.02 + Math.min(vw(), vh()) * 0.17}px`;
      layer.appendChild(b);
      b.style.left = Math.max(4, Math.min(vw() - b.offsetWidth - 4, parseFloat(who.style.left) + 40 - b.offsetWidth / 2)) + "px"; // pusatkan di atas orangnya
      animate(b, [{ transform: "scale(0)", opacity: 0 }, { transform: "scale(1.1)", opacity: 1, offset: 0.3 }, { transform: "scale(1)", opacity: 1, offset: 0.85 }, { transform: "scale(1)", opacity: 0 }], { duration: 2000, fill: "forwards" });
      for (let q = 0; q < 4; q++) { const e = document.createElement("div"); e.className = "ff-p"; e.textContent = pick(["✨", "⭐", "🌟"]); e.style.fontSize = ri(16, 28) + "px"; layer.appendChild(e); const x0 = parseFloat(who.style.left) + rnd(0, 60); animate(e, [{ transform: `translate(${x0}px,${H * 0.85}px)`, opacity: 1 }, { transform: `translate(${x0 + rnd(-40, 40)}px,${H * 0.45}px)`, opacity: 0 }], { duration: rnd(1800, 2800), delay: rnd(0, 800), fill: "forwards" }); }
      await sleep(1500); if (dead) return;
    }
    await sleep(1200); if (dead) return;
    await animate(layer, [{ opacity: 1 }, { opacity: 0 }], { duration: 900, fill: "forwards" });
    clean();
  }

  // ------------------------------------------------------------
  //  ☀️ Matahari (book193): TANPA SUARA. Bagian atas layar menjadi lebih terang -- cahaya matahari bergeser pelan, sinar berayun, kilauan
  //  berkedip -- dan tulisan tampak TIMBUL 3D keemasan (hanya warna & bayangan; isi tulisan tidak berubah). Sekilas (~10 detik) lalu kembali normal.
  // ------------------------------------------------------------
  async function sun() {
    const layer = makeLayer();
    layer.style.mixBlendMode = "screen"; // book194: benar-benar MENERANGKAN isi layar (ayat/kidung/PDF/YouTube) di belakangnya
    let dead = false;
    const clean = register(layer, () => { dead = true; document.body.classList.remove("fx-sun", "fx-sun-out"); });
    document.body.classList.add("fx-sun");
    const W = vw(), H = vh();
    const glow = document.createElement("div"); glow.className = "ff-sun-glow"; layer.appendChild(glow);
    const rays = document.createElement("div"); rays.className = "ff-sun-rays"; layer.appendChild(rays);
    animate(glow, [{ opacity: 0 }, { opacity: 1 }], { duration: 1200, fill: "forwards" });
    animate(rays, [{ opacity: 0 }, { opacity: 0.9 }], { duration: 1500, fill: "forwards" });
    try { glow.animate([{ transform: "translateX(0)" }, { transform: `translateX(${W * 0.75}px)` }], { duration: 5500, direction: "alternate", iterations: Infinity, easing: "ease-in-out" }); } catch (e) { /* abaikan */ }
    try { rays.animate([{ transform: "rotate(-5deg)" }, { transform: "rotate(5deg)" }], { duration: 4000, direction: "alternate", iterations: Infinity, easing: "ease-in-out" }); } catch (e) { /* abaikan */ }
    for (let i = 0; i < 16; i++) {
      const g = document.createElement("div"); g.className = "ff-sun-glint"; g.style.setProperty("--s", ri(12, 30) + "px");
      g.style.left = rnd(0, W) + "px"; g.style.top = rnd(0, H * 0.5) + "px"; layer.appendChild(g);
      try { g.animate([{ opacity: 0, transform: "scale(.3) rotate(0)" }, { opacity: 1, transform: "scale(1) rotate(45deg)" }, { opacity: 0, transform: "scale(.3) rotate(90deg)" }], { duration: rnd(1400, 2600), iterations: Infinity, delay: rnd(0, 2500) }); } catch (e) { /* abaikan */ }
    }
    await sleep(10000); if (dead) return;
    document.body.classList.remove("fx-sun"); document.body.classList.add("fx-sun-out");
    await animate(layer, [{ opacity: 1 }, { opacity: 0 }], { duration: 1200, fill: "forwards" });
    clean();
  }

  // ------------------------------------------------------------
  //  ✨ Tulisan TIMBUL (book194): kata besar (AMIN / HALELUYA / O TUHAN YESUS) yang menumpang DI ATAS isi layar apa pun -- ayat, kidung, PDF,
  //  video YouTube -- tanpa menutupinya:
  //   (1) lapisan WARNA (mix-blend-mode: multiply): huruf-huruf yang kena bentuk kata itu berubah warna (putih -> emas/biru/merah muda),
  //       sehingga kalau dibaca tampak tulisan besar "AMIN" dari perbedaan warna, sementara tulisan aslinya tetap terbaca;
  //   (2) lapisan SILAU 3D: kata timbul bertumpuk bayangan + kilat cahaya yang menyapu (seperti efek Matahari), samar tapi terlihat
  //       juga di latar gelap. Tanpa suara. ~5 detik. Kolom teks efek (Studio) bisa mengganti katanya.
  // ------------------------------------------------------------
  const WORDS = {
    "word-amen": { t: "AMIN", a: "#fff3b0", b: "#ffc83d", c: "#e08a00", sh: "#b36b00", glow: "#ffd23f" },
    "word-haleluya": { t: "HALELUYA", a: "#e8f8ff", b: "#7fd0ff", c: "#2f8fe0", sh: "#1d5fa8", glow: "#8fd8ff" },
    "word-lord": { t: "O TUHAN YESUS", a: "#ffe3dc", b: "#ff9d8a", c: "#e0584a", sh: "#a8332a", glow: "#ffb3a3" },
  };
  async function wordGlow(id, text) {
    const P = WORDS[id]; if (!P) return;
    const word = String(text || P.t).toUpperCase().trim();
    const W = vw(), H = vh();
    let lines = [word];
    if (word.length > 8 && word.indexOf(" ") > 0) { // dua baris di spasi yang paling dekat tengah
      let best = -1; for (let i = 0; i < word.length; i++) if (word[i] === " " && (best < 0 || Math.abs(i - word.length / 2) < Math.abs(best - word.length / 2))) best = i;
      if (best > 0) lines = [word.slice(0, best), word.slice(best + 1)];
    }
    const FONT = '900 100px/1.02 "Arial Black","Impact",system-ui,sans-serif';
    const probe = document.createElement("span"); probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;letter-spacing:.04em;font:${FONT}`; document.body.appendChild(probe);
    let maxW = 1; lines.forEach((l) => { probe.textContent = l; maxW = Math.max(maxW, probe.getBoundingClientRect().width); }); probe.remove();
    const fs = Math.max(30, Math.min((W * 0.9) / maxW * 100, (H * 0.55) / (lines.length * 1.02)));
    const tint = makeLayer(); tint.style.mixBlendMode = "multiply"; tint.style.opacity = "0";
    const glare = makeLayer(); glare.style.opacity = "0";
    let dead = false;
    const c1 = register(tint, () => { dead = true; });
    const c2 = register(glare);
    const mk = (layer, css) => { const d = document.createElement("div"); d.style.cssText = `position:absolute;left:50%;top:47%;transform:translate(-50%,-50%);text-align:center;white-space:nowrap;letter-spacing:.04em;font:900 ${fs}px/1.02 "Arial Black","Impact",system-ui,sans-serif;${css}`; d.innerHTML = lines.map(esc).join("<br>"); layer.appendChild(d); return d; };
    mk(tint, `background:linear-gradient(180deg,${P.a},${P.b} 50%,${P.c});-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:${P.b}`);
    const ex = mk(glare, `color:transparent;text-shadow:.012em .012em 0 ${P.b}cc,.024em .024em 0 ${P.c}cc,.036em .036em 0 ${P.sh}cc,.06em .07em .06em #0008;filter:drop-shadow(0 0 .05em ${P.glow})`);
    const sh = mk(glare, `background:linear-gradient(105deg,transparent 38%,#fff 50%,transparent 62%) 130% 0/300% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent`);
    animate(tint, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, fill: "forwards" });
    animate(glare, [{ opacity: 0 }, { opacity: 0.6 }], { duration: 500, fill: "forwards" });
    [ex, sh].forEach((el) => animate(el, [{ transform: "translate(-50%,-50%) scale(.94)" }, { transform: "translate(-50%,-50%) scale(1.02)" }, { transform: "translate(-50%,-50%) scale(1)" }], { duration: 900, easing: "ease-out" }));
    animate(tint.firstChild, [{ transform: "translate(-50%,-50%) scale(.94)" }, { transform: "translate(-50%,-50%) scale(1.02)" }, { transform: "translate(-50%,-50%) scale(1)" }], { duration: 900, easing: "ease-out" });
    const sweep = () => { try { sh.animate([{ backgroundPosition: "130% 0" }, { backgroundPosition: "-30% 0" }], { duration: 1500, easing: "ease-in-out" }); } catch (e) { /* abaikan */ } };
    await sleep(500); if (dead) return;
    sweep(); await sleep(1900); if (dead) return;
    sweep(); await sleep(1700); if (dead) return;
    await Promise.all([animate(tint, [{ opacity: 1 }, { opacity: 0 }], { duration: 800, fill: "forwards" }), animate(glare, [{ opacity: 0.6 }, { opacity: 0 }], { duration: 800, fill: "forwards" })]);
    c1(); c2();
  }

  // ------------------------------------------------------------
  //  API
  // ------------------------------------------------------------
  function play(id, opts) {
    const o = opts || {};
    if (id === "stop") { stopAll(); return Promise.resolve(); }
    const effect = LIST.filter((e) => e.id === id)[0];
    if (!effect) return Promise.resolve();
    if (id.indexOf("amen") !== 0) stopAll(); // book193: Amin singkat tidak menghentikan efek lain
    playSound(effect, o.src);
    if (id.indexOf("amen") === 0) return amen(id);
    if (id === "call-lord") return callLord(o.text);
    if (id.indexOf("word-") === 0) return wordGlow(id, o.text);
    if (id === "sun") return sun();
    if (id === "party-bottom") return party(false, o.text);
    if (id === "party-top") return party(true, o.text);
    if (id === "golden") return golden(o.text);
    if (id === "walker") return walker();
    if (id === "shush") return shush();
    if (id === "icecream") return iceCream(o.text, o.seconds);
    if (id === "aquarium") return aquarium(o.text);
    if (id === "count") return countGame(o.text);
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
    const secIn = document.createElement("input");
    secIn.type = "number"; secIn.min = "3"; secIn.max = "120"; secIn.value = "12"; secIn.className = "ps-input";
    secIn.title = "Es Krim Tenang: berapa DETIK jeda tiap scoop es krim (6 scoop total)";
    secIn.style.cssText = "width:70px; margin:6px 6px 6px 0;";
    LIST.forEach((e) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip-btn small";
      b.textContent = e.icon + " " + e.label;
      b.addEventListener("click", () => {
        const withText = e.id === "golden" || e.id.indexOf("party") === 0 || e.id === "icecream" || e.id === "aquarium" || e.id === "count" || e.id === "call-lord" || e.id.indexOf("word-") === 0;
        onPick(e.id, { src: e.song ? getSongUrl(e.song) : "", text: withText ? textIn.value.trim() : "", seconds: Number(secIn.value) || 12 });
      });
      row.appendChild(b);
    });
    const stop = document.createElement("button");
    stop.type = "button"; stop.className = "chip-btn small"; stop.textContent = "⏹ Hentikan";
    stop.addEventListener("click", () => onPick("stop", {}));
    row.appendChild(stop);
    container.appendChild(row);
    container.appendChild(textIn);
    const secLbl = document.createElement("div"); secLbl.className = "ps-pointer-hint"; secLbl.appendChild(secIn); secLbl.appendChild(document.createTextNode("detik per scoop (🍦 Es Krim Tenang, 6 scoop). Teks di atas dipakai sebagai judul efek 🍦/🐠 juga."));
    container.appendChild(secLbl);
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
      const cur = getSongUrl(k);
      inp.value = cur.indexOf("data:") === 0 ? "(berkas tersimpan di perangkat ini -- kosongkan untuk menghapus)" : cur;
      inp.addEventListener("change", () => { const v = inp.value.trim(); if (v.indexOf("(berkas") === 0) return; setSongUrl(k, v); });
      // book193 -- 📁 pilih berkas suara langsung dari komputer (disimpan di perangkat ini, <= ~1,5 MB; untuk yang lebih besar pakai link MP3/Drive).
      const pickBtn = document.createElement("button");
      pickBtn.type = "button"; pickBtn.className = "chip-btn small"; pickBtn.textContent = "📁 Pilih berkas"; pickBtn.title = "Pilih berkas suara (MP3/WAV/M4A) dari komputer";
      const fileIn = document.createElement("input"); fileIn.type = "file"; fileIn.accept = "audio/*"; fileIn.style.display = "none";
      pickBtn.addEventListener("click", () => fileIn.click());
      fileIn.addEventListener("change", () => {
        const f = fileIn.files && fileIn.files[0]; if (!f) return;
        if (f.size > 1.5 * 1024 * 1024) { alert("Berkas terlalu besar (" + (f.size / 1048576).toFixed(1) + " MB). Batas ±1,5 MB supaya muat di penyimpanan browser.\nPakai berkas yang lebih pendek/kecil, atau isi kolom dengan link MP3 / Google Drive."); fileIn.value = ""; return; }
        const rd = new FileReader();
        rd.onload = () => { try { localStorage.setItem(LS_PREFIX + k, String(rd.result)); inp.value = "(berkas tersimpan di perangkat ini -- kosongkan untuk menghapus)"; } catch (e) { alert("Penyimpanan browser penuh -- berkas tidak tersimpan. Coba berkas yang lebih kecil atau pakai link."); } };
        rd.readAsDataURL(f); fileIn.value = "";
      });
      line.appendChild(lab); line.appendChild(inp); line.appendChild(pickBtn); line.appendChild(fileIn);
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
/* book191: teks Golden Buzzer -- dulu lebar kotaknya cuma selebar piala (<=420px) + nowrap, jadi teks panjang meluber ke kanan (tidak di tengah)
   & gradien emas cuma menutup kotak itu (sisanya transparan/tampak putih). Sekarang kotak selebar layar, teks membungkus, dan gradien emas
   dipasang per BARIS (box-decoration-break: clone) supaya SEMUA huruf emas. */
.ff-gold-text{width:92vw;margin:10px 0 0 calc(50% - 46vw);text-align:center;font:900 clamp(26px,6.5vw,72px)/1.12 system-ui,sans-serif;letter-spacing:.04em;white-space:normal;overflow-wrap:anywhere;filter:drop-shadow(0 4px 10px #0009)}
.ff-gold-text span{display:inline;-webkit-box-decoration-break:clone;box-decoration-break:clone;background:linear-gradient(180deg,#fff6b0,#ffd23f 50%,#e8b020);-webkit-background-clip:text;background-clip:text;color:#ffd23f;-webkit-text-fill-color:transparent;-webkit-text-stroke:2px #6b4c06;paint-order:stroke fill}
/* book191/192: efek penenang anak -- TRANSPARAN & KECIL (tulisan di belakang tetap terbaca) */
.ff-pill{position:absolute;width:max-content;max-width:34vw;padding:.3em .8em;border-radius:999px;background:#ffffffd9;color:#7a3556;font:800 clamp(13px,1.8vw,22px)/1.2 system-ui,sans-serif;box-shadow:0 2px 10px #0003;text-align:center}
.ff-ic2{position:absolute;right:3vw;bottom:2vh;pointer-events:none}
.ff-ic2 svg{position:absolute;overflow:visible;filter:drop-shadow(0 2px 3px #0003)}
.ff-aq-fish{position:absolute;left:0;top:0;font-size:clamp(34px,6.5vmin,72px);will-change:transform;opacity:.92;filter:drop-shadow(0 2px 4px #0003)}
.ff-aq-bub{position:absolute;left:0;top:0;border-radius:50%;border:2px solid #ffffffcc;background:#ffffff33}
.ff-cnt-item{position:absolute;line-height:1;opacity:.92;will-change:transform;filter:drop-shadow(0 2px 4px #0003)}
.ff-cnt-item img{display:block;object-fit:contain}
.ff-cnt-res{position:absolute;left:50%;bottom:2.5vh;transform:translateX(-50%);display:flex;flex-wrap:wrap;gap:10px;justify-content:center;width:max-content;max-width:94vw}
.ff-cnt-chip{display:flex;align-items:center;gap:.3em;padding:.15em .6em;border-radius:999px;background:#ffffffe6;color:#3b2a14;font:900 clamp(18px,2.8vw,34px)/1.1 system-ui,sans-serif;box-shadow:0 2px 10px #0004}
.ff-cnt-chip img{height:1.1em;width:auto}
/* book193: Amin, Seru Nama Tuhan, Matahari */
.ff-amen-fig{position:absolute;bottom:3vh;display:flex;flex-direction:column;align-items:center;will-change:transform}
.ff-amen-row{display:flex;align-items:flex-end;gap:.08em;font-size:clamp(70px,13vmin,130px);line-height:1}
.ff-amen-p{display:flex;flex-direction:column;align-items:center;transform-origin:50% 100%}
.ff-amen-hands{margin-top:-.5em;font-size:.45em;line-height:1}
.ff-amen-bub{position:relative;padding:.12em .7em;margin-bottom:.35em;border-radius:999px;background:#fffffff2;color:#6a3d1f;font:900 clamp(20px,3.2vw,40px)/1.1 system-ui,sans-serif;box-shadow:0 2px 10px #0004}
.ff-amen-bub::after{content:"";position:absolute;left:50%;bottom:-7px;width:14px;height:14px;background:#fffffff2;transform:translateX(-50%) rotate(45deg)}
.ff-cl-glow{position:absolute;left:0;right:0;bottom:0;height:38vh;background:radial-gradient(ellipse at 50% 100%,#ffe9a8aa,#ffd86b44 45%,transparent 72%);opacity:0}
.ff-cl-p{position:absolute;bottom:2vh;display:flex;flex-direction:column;align-items:center;font-size:clamp(50px,9.5vmin,96px);line-height:1}
.ff-cl-hands{font-size:.5em;margin-bottom:-.12em}
.ff-sun-glow{position:absolute;top:-26vh;left:-20vw;width:70vw;height:80vh;background:radial-gradient(ellipse at 50% 30%,#fff7d0cc,#ffe08a66 38%,transparent 72%);mix-blend-mode:screen;opacity:0}
.ff-sun-rays{position:absolute;left:0;right:0;top:0;height:75vh;background:repeating-conic-gradient(from -30deg at 30% -12%,#fff3b04d 0 5deg,transparent 5deg 13deg);-webkit-mask-image:linear-gradient(#000,transparent 78%);mask-image:linear-gradient(#000,transparent 78%);mix-blend-mode:screen;opacity:0}
.ff-sun-glint{position:absolute;width:var(--s,16px);height:var(--s,16px);opacity:0;background:radial-gradient(circle,#fff 0 18%,#fff7c8aa 30%,transparent 62%);clip-path:polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%)}
body.fx-sun #text,body.fx-sun #ref,body.fx-sun #refSub{transition:color 1s,text-shadow 1s}
body.fx-sun-out #text,body.fx-sun-out #ref,body.fx-sun-out #refSub{transition:color 1.1s,text-shadow 1.1s}
/* teks tampak 3D (timbul keemasan) selama Matahari menyala -- isi tulisan TIDAK berubah, hanya warna & bayangan */
body.fx-sun #text,body.fx-sun #text .verse-version-block{color:#fff0b8 !important}
body.fx-sun #text,body.fx-sun #ref,body.fx-sun #refSub,body.fx-sun #text .verse-version-block{animation:ffSun3d 3.2s ease-in-out infinite alternate;text-shadow:.02em .02em 0 #d9a21b,.04em .04em 0 #c58f12,.06em .06em 0 #b07c0c,.08em .09em .08em #000a,0 0 .35em #ffd86b99}
@keyframes ffSun3d{from{text-shadow:.02em .02em 0 #d9a21b,.04em .04em 0 #c58f12,.06em .06em 0 #b07c0c,.08em .09em .08em #000a,-.05em -.04em .3em #ffe9a8aa}to{text-shadow:.02em .02em 0 #e6b02a,.04em .04em 0 #d19a1a,.06em .06em 0 #bb8814,.08em .09em .08em #000a,.08em -.04em .5em #fff3c8}}
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

    // book193: dipakai tombol cepat F5-F8 di Studio -- mengembalikan {name, src} untuk dikirim ke Layar 2.
  function quick(id) { const e = LIST.filter((x) => x.id === id)[0]; return e ? { name: e.id, src: e.song ? getSongUrl(e.song) : "" } : null; }
  return { LIST, quick, play, stopAll, configure, renderStudioControls, mountMediaLibraryLauncher, getSongUrl, setSongUrl };
})();

if (typeof window !== "undefined") {
  window.FunFX = FunFX;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => FunFX.mountMediaLibraryLauncher());
  else FunFX.mountMediaLibraryLauncher();
}
