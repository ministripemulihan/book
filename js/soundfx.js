// ============================================================
//  🔊 SOUNDFX -- SATU SUMBER KEBENARAN untuk semua efek suara
//  "🎉 Efek Panggung".
//
//  KENAPA FILE INI ADA (10 Sep 2026, permintaan operator "kalau ada
//  usulan tambahan efek audio, bisa nyambung otomatis ke effectpreview.js
//  dan sebaliknya"): sebelum file ini dibuat, daftar + kode sintesis
//  tiap efek suara harus DITULIS ULANG di 3 tempat berbeda supaya semua
//  konsisten:
//    1. present.html (Layar 2 sungguhan) -- yang benar-benar
//       memutar suaranya untuk jemaat.
//    2. presentation-studio.js (tombol di tab "🎉 Efek Panggung") --
//       yang mengirim perintah ke Layar 2.
//    3. effectpreview.js (menu "🔊 Coba Efek Suara & Visual" khusus
//       administrator) -- pratinjau LOKAL di HP sebelum dipakai.
//  Kalau ditulis manual di 3 tempat, mudah lupa/salah ketik salah satu
//  (mis. lupa update effectpreview.js pas nambah efek baru).
//
//  SEKARANG: cukup edit SOUND_FX_LIST + fungsi play() DI FILE INI SAJA.
//  present.html & index.html (yang memuat presentation-studio.js &
//  effectpreview.js) SAMA-SAMA memuat file ini lewat <script
//  src="js/soundfx.js">, jadi efek baru otomatis muncul sebagai tombol
//  di tab Studio (lewat SoundFX.renderButtons(), dipanggil dari
//  wireEffectsTab() di presentation-studio.js) DAN di menu pratinjau
//  admin (lewat SoundFX.renderButtons() juga, dipanggil dari
//  effectpreview.js) DAN langsung bisa diputar sungguhan di Layar 2
//  (lewat SoundFX.play(), dipanggil dari listener "message" di
//  present.html) -- TANPA perlu sentuh 2 file lain itu sama sekali,
//  KECUALI kalau efek barunya butuh "bahan dasar" sintesis yang belum
//  ada (lihat playNote_/playNoiseBurst_/playSweep_/playFilteredNoise_
//  di bawah -- 4 bahan dasar ini biasanya sudah cukup untuk hampir
//  semua efek baru, tinggal digabung dengan angka/waktu yang berbeda).
//
//  100% OFFLINE: semua efek disintesis LANGSUNG lewat Web Audio API
//  (oscillator + noise sederhana), BUKAN file MP3/audio -- tidak
//  butuh koneksi internet maupun aset tambahan, sama seperti beep()
//  bawaan present.html.
//
//  CARA MENAMBAH EFEK SUARA BARU (untuk developer berikutnya):
//   1. Tambah 1 baris baru di SOUND_FX_LIST di bawah: { key, label, emoji }.
//      "key" HARUS unik & sebaiknya 1 kata huruf kecil (mis. "gong").
//   2. Tambah 1 "else if (soundKey === "gong") { ... }" baru di dalam
//      fungsi play() di bawah, isi dengan kombinasi playNote_()/
//      playNoiseBurst_()/playSweep_()/playFilteredNoise_() (lihat
//      contoh-contoh yang sudah ada, & komentar tiap "bahan dasar" di
//      bawah untuk kapan pakai yang mana).
//   3. SELESAI -- tombolnya otomatis muncul di tab Studio ("🎉 Efek
//      Panggung") & di menu pratinjau admin begitu halaman dimuat
//      ulang, TANPA edit presentation-studio.js maupun
//      effectpreview.js sama sekali.
// ============================================================

const SoundFX = (() => {
  // --------------------------------------------------------
  // Daftar efek -- SATU-SATUNYA tempat nama & label Indonesia efek
  // suara didefinisikan. Urutan di sini = urutan tombol ditampilkan.
  // --------------------------------------------------------
  const SOUND_FX_LIST = [
    { key: "drumroll", label: "Drumroll", emoji: "🥁" },
    { key: "applause", label: "Tepuk Tangan", emoji: "👏" },
    { key: "ding", label: "Ding", emoji: "🔔" },
    { key: "fanfare", label: "Fanfare", emoji: "📯" },
    { key: "tada", label: "Ta-da!", emoji: "🎊" },
    { key: "cheer", label: "Bersorak", emoji: "📣" },
    { key: "laugh", label: "Tawa", emoji: "😂" },
    { key: "kiss", label: "Ciuman", emoji: "😘" },
    { key: "boing", label: "Boing", emoji: "🤪" },
    { key: "heartbeat", label: "Detak Jantung", emoji: "💓" },
    { key: "wow", label: "Wow", emoji: "😮" },
    { key: "scream", label: "Berteriak", emoji: "😱" },
    { key: "magic", label: "Ajaib", emoji: "✨" },
    { key: "victory", label: "Kemenangan", emoji: "🏆" },
    { key: "fail", label: "Gagal", emoji: "😅" },
    { key: "awkward", label: "Canggung", emoji: "😬" },
    { key: "whistle", label: "Peluit", emoji: "📯" },
    { key: "drum", label: "Drum", emoji: "🥁" },
    { key: "thunder", label: "Guntur", emoji: "⛈️" },
    { key: "rain", label: "Hujan", emoji: "🌧️" },
    // ↑ Tambah baris baru DI SINI untuk efek suara baru (lihat
    // panduan "CARA MENAMBAH EFEK SUARA BARU" di komentar atas file).
  ];

  // --------------------------------------------------------
  // Sumber audio -- BISA DIPASANG ULANG (configure()) oleh halaman
  // yang memuatnya, supaya ikut nyambung ke pengaturan volume/mute
  // yang SUDAH ADA di halaman itu (mis. present.html punya sakelar
  // "M" mute-semua lewat getEffectsMasterGain_() -- lihat
  // SoundFX.configure() dipanggil di present.html). Kalau TIDAK
  // dikonfigurasi (mis. dipakai di effectpreview.js/index.html),
  // SoundFX otomatis membuat AudioContext + GainNode sendiri yang
  // berdiri sendiri -- cukup untuk pratinjau lokal di HP.
  // --------------------------------------------------------
  let ownAudioCtx_ = null;
  let ownGain_ = null;
  let getAudioContext_ = null; // override opsional, lihat configure()
  let getDestination_ = null; // override opsional, lihat configure()
  let noiseBuffer_ = null;

  function configure(opts) {
    if (!opts) return;
    if (typeof opts.getAudioContext === "function") getAudioContext_ = opts.getAudioContext;
    if (typeof opts.getDestination === "function") getDestination_ = opts.getDestination;
  }

  function ctx_() {
    if (getAudioContext_) return getAudioContext_();
    ownAudioCtx_ = ownAudioCtx_ || new (window.AudioContext || window.webkitAudioContext)();
    return ownAudioCtx_;
  }
  function destination_() {
    if (getDestination_) return getDestination_();
    if (!ownGain_) {
      ownGain_ = ctx_().createGain();
      ownGain_.gain.value = 1;
      ownGain_.connect(ctx_().destination);
    }
    return ownGain_;
  }
  function noiseBuffer_get_() {
    const c = ctx_();
    if (!noiseBuffer_) {
      const len = c.sampleRate * 1; // 1 detik noise, cukup untuk dipotong-potong
      noiseBuffer_ = c.createBuffer(1, len, c.sampleRate);
      const d = noiseBuffer_.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer_;
  }

  // --------------------------------------------------------
  // 4 "bahan dasar" sintesis -- dipakai gabung-gabung untuk meracik
  // tiap efek di play() di bawah:
  //  - playNote_(): 1 nada dengan frekuensi TETAP (nada musik biasa).
  //  - playNoiseBurst_(): 1 ledakan noise pendek band-pass ~1200Hz
  //    (kesan "tepuk"/"ketuk").
  //  - playSweep_(): 1 nada yang MELUNCUR dari 1 frekuensi ke
  //    frekuensi lain (dipakai utk efek yang nadanya naik/turun, mis.
  //    boing/wow/berteriak/gagal/canggung).
  //  - playFilteredNoise_(): sama seperti playNoiseBurst_() tapi jenis
  //    & frekuensi filter-nya BISA DIATUR per panggilan (dipakai utk
  //    guntur/hujan/desis panjang lainnya).
  // --------------------------------------------------------
  function playNote_(freq, when, dur, type, peakGain) {
    try {
      const c = ctx_();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || "sine"; o.frequency.value = freq;
      const t0 = c.currentTime + when;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peakGain || 0.3, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(destination_());
      o.start(t0); o.stop(t0 + dur + 0.05);
    } catch (e) { /* diamkan -- efek suara TIDAK BOLEH sampai mengganggu UI kalau gagal */ }
  }
  function playNoiseBurst_(when, dur, peakGain) {
    try {
      const c = ctx_();
      const src = c.createBufferSource();
      src.buffer = noiseBuffer_get_();
      const bp = c.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = 1200; bp.Q.value = 0.7;
      const g = c.createGain();
      const t0 = c.currentTime + when;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peakGain || 0.28, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(bp); bp.connect(g); g.connect(destination_());
      src.start(t0); src.stop(t0 + dur + 0.05);
    } catch (e) {}
  }
  function playSweep_(fromFreq, toFreq, when, dur, type, peakGain) {
    try {
      const c = ctx_();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || "sine";
      const t0 = c.currentTime + when;
      o.frequency.setValueAtTime(fromFreq, t0);
      o.frequency.linearRampToValueAtTime(toFreq, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peakGain || 0.3, t0 + Math.min(0.05, dur / 4));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(destination_());
      o.start(t0); o.stop(t0 + dur + 0.05);
    } catch (e) {}
  }
  function playFilteredNoise_(when, dur, peakGain, filterType, freq, Q) {
    try {
      const c = ctx_();
      const src = c.createBufferSource();
      src.buffer = noiseBuffer_get_(); src.loop = dur > 1;
      const filt = c.createBiquadFilter();
      filt.type = filterType || "lowpass"; filt.frequency.value = freq || 400; filt.Q.value = Q || 0.7;
      const g = c.createGain();
      const t0 = c.currentTime + when;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peakGain || 0.2, t0 + Math.min(0.15, dur / 4));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(filt); filt.connect(g); g.connect(destination_());
      src.start(t0); src.stop(t0 + dur + 0.05);
    } catch (e) {}
  }

  // --------------------------------------------------------
  // play(key) -- dispatcher utama. Dipanggil oleh:
  //   - present.html, saat menerima payload {type:"sound", sound:key}
  //     dari Studio (Layar 2 sungguhan).
  //   - effectpreview.js, saat tombol pratinjau admin dipencet
  //     (lokal, di HP saja).
  // --------------------------------------------------------
  function play(soundKey) {
    if (soundKey === "ding") {
      playNote_(1318.5, 0, 0.9, "sine", 0.32); // E6, lembut -- mirip beep() tapi nada lebih tinggi/ceria
      playNote_(1975.5, 0.05, 0.7, "sine", 0.14); // B6 tipis di atasnya, kesan "kristal"
    } else if (soundKey === "tada") {
      playNote_(523.25, 0, 0.18, "triangle", 0.3); // C5
      playNote_(783.99, 0.12, 0.5, "triangle", 0.3); // G5, menahan -- kesan "ta-DA!"
    } else if (soundKey === "fanfare") {
      [392.0, 523.25, 659.25, 783.99].forEach((f, i) => playNote_(f, i * 0.14, 0.35, "square", 0.22)); // G4-C5-E5-G5 naik
      playNote_(783.99, 0.56, 0.6, "square", 0.26); // nada penutup ditahan
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
      playNote_(880, 0, 0.15, "sine", 0.3); // fallback (mirip beep() bawaan)
    }
  }

  // --------------------------------------------------------
  // renderButtons(container, opts) -- bangun tombol UNTUK SEMUA efek
  // di SOUND_FX_LIST ke dalam 1 elemen (biasanya <div>), supaya
  // presentation-studio.js & effectpreview.js TIDAK PERLU menulis
  // ulang daftar tombolnya sendiri-sendiri di HTML.
  //   opts.className   -- class CSS tiap tombol (default "chip-btn small")
  //   opts.dataAttr     -- nama dataset yang diisi key efek (default
  //                        "sound", jadi hasilnya atribut data-sound=
  //                        "..." -- dipakai listener [data-sound] yang
  //                        SUDAH ADA di wireEffectsTab()/
  //                        presentation-studio.js, jadi tombol hasil
  //                        render otomatis "kepasang" tanpa kode
  //                        tambahan). effectpreview.js memakai
  //                        dataAttr:"previewSound" supaya cocok dengan
  //                        listener [data-preview-sound] di sana.
  //   opts.onClick(key,btn) -- opsional, dipanggil langsung saat
  //                        tombol diklik (kalau tidak diisi, tombol
  //                        tetap punya atribut data-*, tinggal
  //                        diwiring lewat querySelectorAll seperti
  //                        biasa oleh kode pemanggil).
  // --------------------------------------------------------
  function renderButtons(container, opts) {
    if (!container) return;
    const o = opts || {};
    const className = o.className || "chip-btn small";
    const dataAttr = o.dataAttr || "sound";
    container.innerHTML = "";
    SOUND_FX_LIST.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = className;
      btn.textContent = `${item.emoji} ${item.label}`;
      btn.dataset[dataAttr] = item.key;
      if (typeof o.onClick === "function") {
        btn.addEventListener("click", () => o.onClick(item.key, btn));
      }
      container.appendChild(btn);
    });
  }

  return { LIST: SOUND_FX_LIST, configure, play, renderButtons };
})();
