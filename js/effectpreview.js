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
//   - Efek suara diputar lewat js/soundfx.js (SATU SUMBER KEBENARAN
//     yang dipakai bersama present.html & presentation-studio.js --
//     disintesis lewat Web Audio API, BUKAN file audio, jadi 100%
//     OFFLINE, tidak perlu koneksi internet sama sekali).
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
  let confettiRAF_ = null;

  // ---- Efek suara -- SEKARANG dipusatkan di js/soundfx.js (SATU SUMBER
  //      KEBENARAN yang dipakai bersama present.html & presentation-
  //      studio.js -- lihat komentar panjang di js/soundfx.js). Modul ini
  //      TIDAK PUNYA lagi kode sintesis suaranya sendiri -- cukup panggil
  //      SoundFX.play(key). Menambah efek suara baru cukup dilakukan SATU
  //      KALI di js/soundfx.js, otomatis nyambung ke sini juga TANPA
  //      perlu ubah file ini sama sekali. ----
  function playSoundPreview(key) {
    if (typeof SoundFX !== "undefined") SoundFX.play(key);
  }

  // ---- Efek visual -- animasi yang sama gayanya dengan #effectsLayer di
  //      present.html, tapi dikunci di dalam #effectPreviewScreen saja.
  //      (Efek visual jumlahnya sedikit & jarang berubah, jadi belum
  //      dipusatkan seperti efek suara -- bisa disamakan nanti kalau
  //      daftarnya mulai berkembang juga.) ----
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

  // ---- "Contoh tulisan" -- live-preview teks bebas yang diketik admin ke
  //      #effectPreviewSampleInput, ditampilkan di #effectPreviewSampleText
  //      DI BELAKANG canvas confetti & layer efek (lihat urutan HTML di
  //      index.html + z-order via DOM order di CSS), supaya efek terlihat
  //      tampil DI ATAS teks -- sama seperti tampilan sungguhan Layar 2. ----
  function wireSampleTextInput_() {
    const input = document.getElementById("effectPreviewSampleInput");
    const sample = document.getElementById("effectPreviewSampleText");
    if (!input || !sample) return;
    input.addEventListener("input", () => { sample.textContent = input.value; });
  }

  // ---- Buka/tutup panel + pasang listener tombol ----
  let wired_ = false;
  function wireButtonsOnce_() {
    if (wired_) return;
    wired_ = true;
    wireSampleTextInput_();
    refreshEpvSoundFxDl_();
    // BARU (10 Sep 2026, sesi ke-13) -- tombol "🔊 Efek Suara" dibangun
    // otomatis dari SoundFX.LIST (js/soundfx.js) ke dalam
    // #effectPreviewSoundGrid, dengan onClick langsung memanggil
    // SoundFX.play() -- lihat komentar panjang di js/soundfx.js untuk
    // kenapa ini dipusatkan (supaya efek baru otomatis nyambung ke
    // tab Studio & Layar 2 juga, tanpa edit file ini).
    const soundGrid = document.getElementById("effectPreviewSoundGrid");
    if (typeof SoundFX !== "undefined" && soundGrid) {
      SoundFX.renderButtons(soundGrid, {
        className: "chip-btn small",
        dataAttr: "previewSound",
        onClick: (key) => playSoundPreview(key),
      });
    }
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

// ------------------------------------------------------------
// BARU (tambahan, permintaan operator: unduh efek suara SATU-SATU,
// bukan digabung jadi 1 tombol/aksi, dan OTOMATIS bertambah kalau
// SOUND_FX_LIST di js/soundfx.js bertambah -- baik file baru yang
// di-push ke assets/sounds/ lewat GitHub, MAUPUN link Google Drive
// baru yang sudah dibagikan "siapa saja yang memiliki link". TIDAK
// ada logika unduh yang ditulis di sini -- cukup panggil
// SoundFX.renderDownloadList(), 1 sumber kebenaran yang sama dipakai
// di mana pun daftar ini perlu ditampilkan.
// ------------------------------------------------------------
function refreshEpvSoundFxDl_() {
  const container = document.getElementById("effectPreviewDlList");
  if (!container || typeof SoundFX === "undefined" || typeof SoundFX.renderDownloadList !== "function") return;
  SoundFX.renderDownloadList(container);
}

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
