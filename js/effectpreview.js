// ============================================================
//  🔊 COBA EFEK SUARA & VISUAL -- khusus level administrator.
//
//  Latar: MC/operator ingin bisa MENDENGAR & MELIHAT LEBIH DULU semua
//  efek suara & efek visual yang ada di tab "🎉 Efek Panggung" (Studio
//  Presentasi, js/presentation-studio.js) LANGSUNG DI HP-NYA SENDIRI,
//  supaya bisa memilih mana yang cocok SEBELUM presentasi sungguhan --
//  tanpa risiko "kepencet" ke Layar 2 yang dilihat jemaat.
//
//  Panel ini (dibuka dari menu ⋮ -> "🔊 Coba Efek Suara & Visual",
//  tombol #effectPreviewBtn, HANYA tampil untuk administrator -- lihat
//  updateLevelGatedMenus() di js/app.js) SENGAJA 100% LOKAL:
//   - Efek suara disintesis LANGSUNG lewat Web Audio API (oscillator +
//     noise), BUKAN file audio -- kode & karakter suaranya SAMA PERSIS
//     dengan playEffectSound_() di present.html (Layar 2), cuma dipakai
//     ulang di sini dengan AudioContext-nya sendiri.
//   - Efek visual (confetti/emoji terbang/balon/teks seruan) dianimasikan
//     di dalam kotak "Pratinjau layar" (#effectPreviewScreen) di panel
//     ini saja -- BUKAN di Layar 2 sungguhan, meniru gaya CSS
//     #effectsLayer/.ms-effect-* di present.html tapi dengan prefiks
//     "epv-" & ukuran diperkecil supaya pas di kotak pratinjau.
//   - TIDAK memanggil rawPost()/BroadcastChannel apa pun ke Layar 2.
//
//  Karena tombolnya di sini DIKLIK LANGSUNG oleh pengguna di jendela ini
//  sendiri, kebijakan autoplay browser otomatis terpenuhi (beda dari
//  present.html yang perlu "gerbang klik" #activateOverlay karena
//  perintahnya datang dari jendela lain).
// ============================================================

const EffectPreview = (() => {
  let audioCtx = null;
  let masterGain_ = null;
  let noiseBuffer_ = null;
  let confettiRAF_ = null;

  function getMasterGain_() {
    if (!masterGain_) {
      masterGain_ = audioCtx.createGain();
      masterGain_.gain.value = 1;
      masterGain_.connect(audioCtx.destination);
    }
    return masterGain_;
  }

  function ensureCtx_() {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    // Kalau sempat "suspended" (mis. panel dibuka tapi belum ada
    // interaksi lain di halaman ini), kebangkitkan lagi -- klik tombol
    // efek yang memanggil ini SENDIRI sudah termasuk gestur pengguna
    // yang sah untuk browser.
    if (audioCtx.state === "suspended") audioCtx.resume();
  }

  // ---- "Bahan dasar" sintesis suara -- SAMA seperti present.html ----
  function playNote_(freq, when, dur, type, peakGain) {
    try {
      ensureCtx_();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type || "sine"; o.frequency.value = freq;
      const t0 = audioCtx.currentTime + when;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peakGain || 0.3, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(getMasterGain_());
      o.start(t0); o.stop(t0 + dur + 0.05);
    } catch (e) { /* diamkan -- pratinjau saja, tidak boleh sampai mengganggu UI */ }
  }
  function playNoiseBurst_(when, dur, peakGain) {
    try {
      ensureCtx_();
      if (!noiseBuffer_) {
        const len = audioCtx.sampleRate * 1;
        noiseBuffer_ = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
        const d = noiseBuffer_.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      const src = audioCtx.createBufferSource();
      src.buffer = noiseBuffer_;
      const bp = audioCtx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = 1200; bp.Q.value = 0.7;
      const g = audioCtx.createGain();
      const t0 = audioCtx.currentTime + when;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peakGain || 0.28, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(bp); bp.connect(g); g.connect(getMasterGain_());
      src.start(t0); src.stop(t0 + dur + 0.05);
    } catch (e) {}
  }
  function playSweep_(fromFreq, toFreq, when, dur, type, peakGain) {
    try {
      ensureCtx_();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type || "sine";
      const t0 = audioCtx.currentTime + when;
      o.frequency.setValueAtTime(fromFreq, t0);
      o.frequency.linearRampToValueAtTime(toFreq, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peakGain || 0.3, t0 + Math.min(0.05, dur / 4));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(getMasterGain_());
      o.start(t0); o.stop(t0 + dur + 0.05);
    } catch (e) {}
  }
  function playFilteredNoise_(when, dur, peakGain, filterType, freq, Q) {
    try {
      ensureCtx_();
      if (!noiseBuffer_) {
        const len = audioCtx.sampleRate * 1;
        noiseBuffer_ = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
        const d = noiseBuffer_.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      const src = audioCtx.createBufferSource();
      src.buffer = noiseBuffer_; src.loop = dur > 1;
      const filt = audioCtx.createBiquadFilter();
      filt.type = filterType || "lowpass"; filt.frequency.value = freq || 400; filt.Q.value = Q || 0.7;
      const g = audioCtx.createGain();
      const t0 = audioCtx.currentTime + when;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peakGain || 0.2, t0 + Math.min(0.15, dur / 4));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(filt); filt.connect(g); g.connect(getMasterGain_());
      src.start(t0); src.stop(t0 + dur + 0.05);
    } catch (e) {}
  }

  // ---- Efek suara -- SAMA PERSIS karakter/nada dengan playEffectSound_()
  //      di present.html (lihat komentar aslinya di sana untuk penjelasan
  //      tiap efek). ----
  function playEffectSound(soundKey) {
    if (soundKey === "ding") {
      playNote_(1318.5, 0, 0.9, "sine", 0.32);
      playNote_(1975.5, 0.05, 0.7, "sine", 0.14);
    } else if (soundKey === "tada") {
      playNote_(523.25, 0, 0.18, "triangle", 0.3);
      playNote_(783.99, 0.12, 0.5, "triangle", 0.3);
    } else if (soundKey === "fanfare") {
      [392.0, 523.25, 659.25, 783.99].forEach((f, i) => playNote_(f, i * 0.14, 0.35, "square", 0.22));
      playNote_(783.99, 0.56, 0.6, "square", 0.26);
    } else if (soundKey === "drumroll") {
      for (let i = 0; i < 18; i++) playNoiseBurst_(i * 0.09, 0.12, 0.22);
      playNoiseBurst_(1.65, 0.5, 0.4);
      playNote_(110, 1.65, 0.5, "sawtooth", 0.2);
    } else if (soundKey === "applause") {
      let t = 0;
      for (let i = 0; i < 30; i++) { t += 0.03 + Math.random() * 0.08; playNoiseBurst_(t, 0.06 + Math.random() * 0.05, 0.14 + Math.random() * 0.1); }
    } else if (soundKey === "cheer") {
      [523.25, 659.25, 783.99, 987.77, 1174.66].forEach((f, i) => playNote_(f, i * 0.06, 0.3, "square", 0.2));
      playFilteredNoise_(0.05, 0.9, 0.22, "bandpass", 2000, 0.6);
    } else if (soundKey === "laugh") {
      [523.25, 659.25, 523.25, 659.25, 523.25].forEach((f, i) => playNote_(f, i * 0.16, 0.13, "triangle", 0.26));
    } else if (soundKey === "kiss") {
      playSweep_(900, 250, 0, 0.12, "sine", 0.28);
      playNoiseBurst_(0.11, 0.05, 0.2);
    } else if (soundKey === "boing") {
      playSweep_(180, 700, 0, 0.12, "sine", 0.3);
      playSweep_(700, 220, 0.12, 0.22, "sine", 0.26);
    } else if (soundKey === "heartbeat") {
      [0, 0.32].forEach((base) => {
        playNote_(90, base, 0.12, "sine", 0.32);
        playNote_(70, base + 0.16, 0.14, "sine", 0.24);
      });
    } else if (soundKey === "wow") {
      playSweep_(400, 1100, 0, 0.35, "sine", 0.3);
    } else if (soundKey === "scream") {
      playSweep_(500, 1800, 0, 0.35, "sawtooth", 0.22);
      playFilteredNoise_(0, 0.35, 0.16, "highpass", 2500, 0.8);
    } else if (soundKey === "magic") {
      [1046.5, 1318.5, 1568.0, 2093.0, 2637.0].forEach((f, i) => playNote_(f, i * 0.07, 0.4, "sine", 0.18));
    } else if (soundKey === "victory") {
      [392.0, 493.88, 587.33, 783.99, 987.77].forEach((f, i) => playNote_(f, i * 0.09, 0.3, "square", 0.22));
      [783.99, 987.77, 1174.66].forEach((f) => playNote_(f, 0.5, 0.8, "square", 0.22));
    } else if (soundKey === "fail") {
      [0, 0.42, 0.84].forEach((t, i) => playSweep_(392 - i * 40, 300 - i * 40, t, 0.4, "sawtooth", 0.24));
    } else if (soundKey === "awkward") {
      playSweep_(300, 120, 0, 0.9, "triangle", 0.16);
    } else if (soundKey === "whistle") {
      playNote_(2600, 0, 0.5, "sine", 0.22);
      playNote_(2680, 0.05, 0.4, "sine", 0.14);
    } else if (soundKey === "drum") {
      playNote_(100, 0, 0.28, "sine", 0.34);
      playNoiseBurst_(0, 0.08, 0.18);
    } else if (soundKey === "thunder") {
      playFilteredNoise_(0, 2.2, 0.28, "lowpass", 220, 0.9);
      playFilteredNoise_(0.4, 0.35, 0.3, "bandpass", 500, 1.2);
      playNote_(55, 0.4, 1.2, "sawtooth", 0.18);
    } else if (soundKey === "rain") {
      playFilteredNoise_(0, 3, 0.1, "highpass", 3500, 0.5);
    } else {
      playNote_(880, 0, 0.15, "sine", 0.3); // fallback (mirip beep())
    }
  }

  // ---- Efek visual -- animasi yang sama gayanya dengan #effectsLayer di
  //      present.html, tapi dikunci di dalam #effectPreviewScreen saja. ----
  const CONFETTI_COLORS_ = ["#e2483d", "#3d8ee2", "#3de27a", "#e2c23d", "#a83de2", "#e2793d", "#3de2d4", "#e23d9e", "#ffffff"];
  const BALLOON_EMOJIS_ = ["🎈", "🎈", "🎈", "🎈"];
  const HAPPY_EMOJIS_ = ["🎉", "😄", "🥳", "✨"];

  function screenEl_() { return document.getElementById("effectPreviewScreen"); }
  function layerEl_() { return document.getElementById("effectPreviewLayer"); }
  function canvasEl_() { return document.getElementById("effectPreviewConfettiCanvas"); }

  function playConfettiPreview() {
    const canvas = canvasEl_();
    const box = screenEl_();
    if (!canvas || !box) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const W = box.clientWidth, H = box.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Lebih sedikit keping (60 vs 150 di present.html) -- kotak
    // pratinjau jauh lebih kecil dari layar sungguhan.
    const pieces = Array.from({ length: 60 }, () => ({
      x: Math.random() * W,
      y: -20 - Math.random() * H * 0.5,
      w: 5 + Math.random() * 5,
      h: 8 + Math.random() * 6,
      color: CONFETTI_COLORS_[Math.floor(Math.random() * CONFETTI_COLORS_.length)],
      vy: 1.6 + Math.random() * 1.8,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.04 + Math.random() * 0.06,
      rot: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
    }));
    if (confettiRAF_) cancelAnimationFrame(confettiRAF_);
    const start = performance.now();
    function tick(now) {
      const elapsed = now - start;
      ctx.clearRect(0, 0, W, H);
      pieces.forEach((p) => {
        p.y += p.vy; p.wobble += p.wobbleSpeed; p.rot += p.rotSpeed;
        const x = p.x + Math.sin(p.wobble) * 14;
        ctx.save();
        ctx.translate(x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (elapsed < 3800 && pieces.some((p) => p.y < H + 20)) {
        confettiRAF_ = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, W, H);
        confettiRAF_ = null;
      }
    }
    confettiRAF_ = requestAnimationFrame(tick);
  }

  function playEmojiReactionPreview(emoji) {
    const layer = layerEl_();
    if (!layer) return;
    const count = 9; // lebih sedikit dari 14 di present.html -- kotak kecil
    for (let i = 0; i < count; i++) {
      const span = document.createElement("span");
      span.className = "epv-effect-emoji";
      span.textContent = emoji || "👏";
      span.style.left = (6 + Math.random() * 84) + "%";
      span.style.setProperty("--epv-drift", (Math.random() * 60 - 30) + "px");
      span.style.setProperty("--epv-spin", (Math.random() * 50 - 25) + "deg");
      span.style.animationDelay = (Math.random() * 0.5) + "s";
      span.style.fontSize = (18 + Math.random() * 14) + "px";
      span.addEventListener("animationend", () => span.remove());
      layer.appendChild(span);
    }
  }

  function playBalloonPreview() {
    const layer = layerEl_();
    if (!layer) return;
    const count = 8;
    for (let i = 0; i < count; i++) {
      const span = document.createElement("span");
      span.className = "epv-effect-balloon";
      span.textContent = BALLOON_EMOJIS_[i % BALLOON_EMOJIS_.length];
      span.style.left = (6 + Math.random() * 84) + "%";
      span.style.setProperty("--epv-balloon-drift1", (Math.random() * 40 - 20) + "px");
      span.style.setProperty("--epv-balloon-drift2", (Math.random() * 40 - 20) + "px");
      span.style.animationDelay = (Math.random() * 1) + "s";
      span.style.fontSize = (22 + Math.random() * 12) + "px";
      span.addEventListener("animationend", () => span.remove());
      layer.appendChild(span);
    }
  }

  function playHappyBurstPreview() {
    playConfettiPreview();
    HAPPY_EMOJIS_.forEach((emoji, i) => setTimeout(() => playEmojiReactionPreview(emoji), i * 200));
  }

  function playShoutPreview(text) {
    const layer = layerEl_();
    if (!layer || !text) return;
    const span = document.createElement("span");
    span.className = "epv-shout-text";
    span.textContent = text;
    span.addEventListener("animationend", (e) => {
      if (e.animationName === "epvShoutPop") span.remove();
    });
    layer.appendChild(span);
  }

  function playVisualEffect(effect, emoji) {
    if (effect === "emoji") playEmojiReactionPreview(emoji);
    else if (effect === "balon") playBalloonPreview();
    else if (effect === "happy") playHappyBurstPreview();
    else playConfettiPreview();
  }

  // ---- Buka/tutup panel + pasang listener tombol ----
  let wired_ = false;
  function wireButtonsOnce_() {
    if (wired_) return;
    wired_ = true;
    document.querySelectorAll("[data-preview-sound]").forEach((btn) => {
      btn.addEventListener("click", () => playEffectSound(btn.dataset.previewSound));
    });
    document.querySelectorAll("[data-preview-effect]").forEach((btn) => {
      btn.addEventListener("click", () => playVisualEffect(btn.dataset.previewEffect));
    });
    document.querySelectorAll("[data-preview-emoji]").forEach((btn) => {
      btn.addEventListener("click", () => playVisualEffect("emoji", btn.dataset.previewEmoji));
    });
    document.querySelectorAll("[data-preview-shout]").forEach((btn) => {
      btn.addEventListener("click", () => playShoutPreview(btn.dataset.previewShout));
    });
  }

  function open() {
    wireButtonsOnce_();
    const overlay = document.getElementById("effectPreviewOverlay");
    if (overlay) overlay.hidden = false;
  }
  function close() {
    const overlay = document.getElementById("effectPreviewOverlay");
    if (overlay) overlay.hidden = true;
    // Bersihkan animasi yang mungkin masih berjalan supaya panel bersih
    // lagi kalau dibuka ulang nanti.
    if (confettiRAF_) { cancelAnimationFrame(confettiRAF_); confettiRAF_ = null; }
    const canvas = canvasEl_();
    if (canvas) { const ctx = canvas.getContext("2d"); ctx && ctx.clearRect(0, 0, canvas.width, canvas.height); }
    const layer = layerEl_();
    if (layer) layer.innerHTML = "";
  }

  return { open, close };
})();

document.addEventListener("DOMContentLoaded", () => {
  const closeBtn = document.getElementById("effectPreviewCloseBtn");
  if (closeBtn) closeBtn.addEventListener("click", () => EffectPreview.close());

  const overlay = document.getElementById("effectPreviewOverlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) EffectPreview.close();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const ov = document.getElementById("effectPreviewOverlay");
    if (ov && !ov.hidden) EffectPreview.close();
  });
  // Tombol menu "🔊 Coba Efek Suara & Visual" DI DALAM aplikasi dipasang
  // di js/app.js (initUIEvents) supaya bisa ikut menutup menu ⋮ & sidebar
  // HP seperti tombol menu lain -- lihat "effectPreviewBtn" di sana.
});
