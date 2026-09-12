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
//
//  EFEK BERBASIS FILE MP3 (BARU 10 Sep 2026, permintaan operator: upload
//  suara rekaman sendiri supaya bisa dipakai juga selain suara sintesis
//  di atas): sejak sekarang 1 entry di SOUND_FX_LIST BOLEH punya field
//  "src" (path ke file .mp3 di assets/sounds/) SEBAGAI GANTI kode
//  sintesis di play(). Kalau "src" ada, play() otomatis memutar file itu
//  (lewat Web Audio API juga -- fetch + decodeAudioData -- supaya tetap
//  lewat destination_() yang sama, jadi tetap ikut sakelar mute "M" di
//  Layar 2, SAMA seperti efek sintesis) -- TIDAK perlu tambah apa pun di
//  play() untuk efek jenis ini.
//  CARA MENAMBAH EFEK MP3 BARU: taruh file .mp3 di assets/sounds/, lalu
//  tambah 1 baris baru { key, label, emoji, src: "assets/sounds/nama.mp3" }
//  di SOUND_FX_LIST -- SELESAI, tidak perlu sentuh play().
//  OFFLINE: file mp3 di assets/sounds/ TIDAK dibundel/base64 ke JS --
//  tetap diambil sebagai file biasa lewat <script>/fetch, TAPI (sama
//  seperti semua aset statis lain di app ini -- css/js/gambar) otomatis
//  disimpan oleh Service Worker (sw.js) begitu pernah dimuat 1x, jadi
//  kunjungan berikutnya tanpa internet tetap bisa memutarnya. Buffer
//  hasil decode juga di-cache di memori (lihat audioBufferCache_ di
//  bawah) supaya file yang sama tidak di-decode ulang tiap diputar.
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

    // --------------------------------------------------------
    // Efek berbasis file MP3 rekaman sendiri (BARU 10 Sep 2026, lihat
    // komentar "EFEK BERBASIS FILE MP3" di atas). "cheer"/"drum"/
    // "whistle"/"awkward"/"magic"/"scream"/"wow" versi sintesis SUDAH
    // ADA di atas -- makanya versi rekaman ini dikasih key & label
    // berbeda (akhiran "Rekaman") supaya keduanya tetap bisa dipilih
    // terpisah, TIDAK saling menimpa.
    // --------------------------------------------------------
    { key: "cheerRekaman", label: "Bersorak (Rekaman)", emoji: "📣", src: "assets/sounds/cheer.mp3" },
    { key: "ohTuhanYesus", label: "Oh Tuhan Yesus", emoji: "🙏", src: "assets/sounds/oh-tuhan-yesus.mp3" },
    { key: "aminOhTuhanYesus", label: "Amin Oh Tuhan Yesus", emoji: "🙌", src: "assets/sounds/amin-oh-tuhan-yesus.mp3" },
    { key: "glory", label: "Glory", emoji: "✨", src: "assets/sounds/glory.mp3" },
    { key: "seram", label: "Seram", emoji: "👻", src: "assets/sounds/seram.mp3" },
    { key: "drumRekaman", label: "Drum (Rekaman)", emoji: "🥁", src: "assets/sounds/drum-rekaman.mp3" },
    { key: "peluitRekaman", label: "Peluit (Rekaman)", emoji: "📯", src: "assets/sounds/peluit-rekaman.mp3" },
    { key: "canggungRekaman", label: "Canggung (Rekaman)", emoji: "😬", src: "assets/sounds/canggung-rekaman.mp3" },
    { key: "terompet", label: "Terompet", emoji: "🎺", src: "assets/sounds/terompet.mp3" },
    { key: "magicCling", label: "Magic Cling", emoji: "🔮", src: "assets/sounds/magic-cling.mp3" },
    { key: "screamRekaman", label: "Berteriak (Rekaman)", emoji: "😱", src: "assets/sounds/scream-rekaman.mp3" },
    { key: "wowRekaman", label: "Wow (Rekaman)", emoji: "😮", src: "assets/sounds/wow-rekaman.mp3" },
    { key: "cling", label: "Cling", emoji: "🔔", src: "assets/sounds/cling.mp3" },
    { key: "cieeee", label: "Cieeee", emoji: "😏", src: "assets/sounds/cieeee.mp3" },
    { key: "bfy_jangan_skip_makan", label: "BFY Jangan Skip Makan", emoji: "🥗📖💪", src: "assets/sounds/bfy_jangan_skip_makan.mp3" },
    { key: "jangan_skip_makan", label: "Jangan Skip Makan", emoji: "🍔😋", src: "assets/sounds/bfy_jangan_skip_makan.mp3" },

    // --------------------------------------------------------
    // CONTOH efek dari LINK LUAR (Google Drive) -- SENGAJA DIKOMENTARI
    // (tidak aktif) supaya tidak muncul tombol yang gagal diputar di
    // Studio sungguhan. Lihat panduan lengkap "CARA MENAMBAH EFEK DARI
    // GOOGLE DRIVE" di komentar playAudioFile_() di bawah. Untuk
    // mengaktifkan: salin 1 baris di bawah ini KE LUAR tanda komentar,
    // ganti key/label/emoji sesukanya, dan ganti "id=" di URL dengan ID
    // file MP3 sungguhan milik operator di Google Drive.
    //
    // { key: "contohGoogleDrive", label: "Contoh dari Google Drive", emoji: "☁️", src: "https://drive.google.com/uc?export=download&id=GANTI_DENGAN_ID_FILE_DRIVE_ANDA" },
  ];

  // Lookup cepat key -> src, dibangun sekali dari SOUND_FX_LIST supaya
  // play() tidak perlu looping tiap dipanggil.
  const AUDIO_SRC_BY_KEY_ = {};
  SOUND_FX_LIST.forEach((item) => { if (item.src) AUDIO_SRC_BY_KEY_[item.key] = item.src; });

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
  // Status mute untuk efek SUMBER EKSTERNAL (link luar, mis. Google
  // Drive) -- efek jenis ini TIDAK lewat destination_()/gain Web Audio
  // (lihat komentar "SUMBER EKSTERNAL" di playAudioFile_() di bawah),
  // jadi mute-nya harus diatur manual lewat SoundFX.setMuted(), dipanggil
  // present.html bersamaan dengan setEffectsMuted_() supaya sakelar "M"
  // tetap membisukan SEMUA jenis efek, lokal maupun link luar.
  let externalMuted_ = false;
  const activeExternalAudios_ = []; // <audio> yang lagi jalan, utk mute/stop langsung

  function configure(opts) {
    if (!opts) return;
    if (typeof opts.getAudioContext === "function") getAudioContext_ = opts.getAudioContext;
    if (typeof opts.getDestination === "function") getDestination_ = opts.getDestination;
  }

  // Dipanggil dari luar (present.html, bersamaan dengan setEffectsMuted_())
  // supaya efek dari link luar (yang tidak lewat gain Web Audio) ikut
  // dibisukan/dibunyikan lagi seperti efek lokal.
  function setMuted(muted) {
    externalMuted_ = !!muted;
    activeExternalAudios_.forEach((a) => { try { a.volume = externalMuted_ ? 0 : 1; } catch (e) {} });
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
  // Pemutar efek berbasis file MP3 (lihat komentar "EFEK BERBASIS FILE
  // MP3" di atas file). audioBufferCache_ menyimpan Promise<AudioBuffer>
  // per src, supaya file yang sama HANYA di-fetch+decode SEKALI selama
  // halaman terbuka -- klik berikutnya ke efek yang sama langsung pakai
  // buffer yang sudah ada di memori (instan, tidak fetch ulang).
  //
  // DUA JENIS SUMBER (BARU 10 Sep 2026, permintaan operator: "mau update
  // sendiri, dari GitHub sendiri atau dari link Google Drive, boleh
  // beda-beda tiap efek"):
  //
  //  1) FILE LOKAL (path relatif, mis. "assets/sounds/nama.mp3") -- file
  //     yang operator sendiri upload ke folder assets/sounds/ di
  //     repo GitHub-nya. Diputar lewat Web Audio (fetch+decodeAudioData
  //     +AudioBufferSourceNode) -- BISA di-cache offline penuh (lihat
  //     predownloadAll()/tombol "Unduh Semua Efek Suara") & tetap ikut
  //     sakelar mute "M" Layar 2 karena lewat destination_() yang sama.
  //
  //  2) LINK LUAR (URL lengkap diawali "http://" atau "https://", mis.
  //     link Google Drive) -- diputar lewat elemen <audio> BIASA, BUKAN
  //     Web Audio, karena hampir semua penyedia file luar (termasuk
  //     Google Drive) TIDAK mengizinkan situs lain "membaca" isi file-nya
  //     lewat fetch() (aturan CORS) -- <audio> tag biasa TIDAK kena
  //     aturan itu (sama seperti <img>), jadi cara ini yang paling
  //     andal untuk link luar. Konsekuensinya:
  //       - TIDAK BISA disiapkan offline di muka (harus online tiap
  //         dipakai) -- makanya predownloadAll() di bawah SENGAJA
  //         melewati jenis ini.
  //       - Tetap ikut sakelar mute "M" Layar 2, tapi caranya beda
  //         (lihat setMuted() & activeExternalAudios_ di atas, BUKAN
  //         lewat destination_()).
  //     CARA MENAMBAH EFEK DARI GOOGLE DRIVE:
  //       a. Upload file MP3 ke Google Drive, klik kanan -> Bagikan ->
  //          ubah akses jadi "Siapa saja yang memiliki link".
  //       b. Link yang didapat biasanya seperti:
  //          https://drive.google.com/file/d/ID_FILE_DI_SINI/view?usp=sharing
  //          Salin bagian ID_FILE_DI_SINI saja, lalu tempel ke format:
  //          https://drive.google.com/uc?export=download&id=ID_FILE_DI_SINI
  //       c. Tempel URL hasil langkah (b) itu ke field "src" entry baru
  //          di SOUND_FX_LIST (lihat contoh key "contohGoogleDrive" di
  //          bawah -- GANTI id-nya dengan file MP3 milik operator
  //          sendiri, atau hapus baris contoh itu kalau tidak dipakai).
  //       d. Sebaiknya file MP3-nya TIDAK terlalu besar (di bawah ±15 MB)
  //          -- file Google Drive yang besar kadang menampilkan halaman
  //          konfirmasi "pindai virus" alih-alih file-nya langsung, yang
  //          bikin efeknya gagal diputar.
  // --------------------------------------------------------
  const audioBufferCache_ = {};
  function isExternalUrl_(src) {
    return /^https?:\/\//i.test(src);
  }
  function loadAudioBuffer_(src) {
    if (!audioBufferCache_[src]) {
      audioBufferCache_[src] = fetch(src)
        .then((res) => res.arrayBuffer())
        .then((buf) => ctx_().decodeAudioData(buf));
    }
    return audioBufferCache_[src];
  }
  function playExternalAudio_(src) {
    try {
      const a = new Audio(src);
      a.volume = externalMuted_ ? 0 : 1;
      activeExternalAudios_.push(a);
      const cleanup = () => {
        const i = activeExternalAudios_.indexOf(a);
        if (i !== -1) activeExternalAudios_.splice(i, 1);
      };
      a.addEventListener("ended", cleanup);
      a.addEventListener("error", cleanup);
      a.play().catch(() => cleanup()); // diamkan -- efek suara TIDAK BOLEH sampai mengganggu UI kalau gagal
    } catch (e) { /* diamkan, sama alasannya */ }
  }
  function playAudioFile_(src) {
    if (isExternalUrl_(src)) { playExternalAudio_(src); return; }
    loadAudioBuffer_(src)
      .then((buffer) => {
        try {
          const c = ctx_();
          const src_ = c.createBufferSource();
          src_.buffer = buffer;
          src_.connect(destination_()); // sama-sama lewat gain "M" mute Layar 2
          src_.start(0);
        } catch (e) { /* diamkan -- efek suara TIDAK BOLEH sampai mengganggu UI kalau gagal */ }
      })
      .catch((e) => {
        // Gagal ambil/decode file (mis. offline & belum pernah dicache
        // Service Worker sama sekali) -- diamkan saja, jangan sampai
        // melempar error yang mengganggu tombol lain.
      });
  }

  // --------------------------------------------------------
  // play(key) -- dispatcher utama. Dipanggil oleh:
  //   - present.html, saat menerima payload {type:"sound", sound:key}
  //     dari Studio (Layar 2 sungguhan).
  //   - effectpreview.js, saat tombol pratinjau admin dipencet
  //     (lokal, di HP saja).
  // --------------------------------------------------------
  function play(soundKey) {
    if (AUDIO_SRC_BY_KEY_[soundKey]) {
      playAudioFile_(AUDIO_SRC_BY_KEY_[soundKey]);
      return;
    }
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

  // --------------------------------------------------------
  // downloadOne(key) -- BARU (tambahan, permintaan operator: "bisa
  // satu-satu", jadi masing-masing efek diunduh sendiri-sendiri, BUKAN
  // digabung jadi 1 file/aksi). Berbeda dari predownloadAll() di atas:
  // predownloadAll() hanya MENYIAPKAN efek agar siap diputar OFFLINE
  // lewat Cache API (tidak menghasilkan file di HP), sedangkan
  // downloadOne() benar-benar MENYIMPAN 1 file MP3 ke folder Unduhan
  // HP/laptop operator.
  //   - File LOKAL (assets/sounds/...): di-fetch sebagai blob supaya
  //     nama file unduhannya bisa dipaksa rapi (mis. "cheerRekaman.mp3"),
  //     bukan nama acak dari browser.
  //   - Link LUAR (Google Drive dst, lihat isExternalUrl_() di atas):
  //     TIDAK bisa di-fetch sebagai blob (kena CORS, sama seperti alasan
  //     predownloadAll() melewatinya) -- jadi cukup dibuka di tab baru;
  //     Google Drive sendiri yang akan memicu dialog unduh di browser.
  // --------------------------------------------------------
  function downloadOne(key) {
    const item = SOUND_FX_LIST.find((it) => it.key === key && it.src);
    if (!item) return Promise.reject(new Error("Efek suara tidak ditemukan / tidak punya file: " + key));
    if (isExternalUrl_(item.src)) {
      window.open(item.src, "_blank");
      return Promise.resolve();
    }
    return fetch(item.src)
      .then((res) => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const ext = (item.src.split(".").pop() || "mp3").split("?")[0];
        a.href = url;
        a.download = item.key + "." + ext;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      });
  }

  // --------------------------------------------------------
  // renderDownloadList(container) -- BARU (tambahan, pasangan
  // downloadOne() di atas). Membangun daftar unduh SATU PER SATU
  // langsung dari SOUND_FX_LIST -- SAMA seperti renderButtons() di
  // bawah, jadi begitu ada entry baru ditambahkan di SOUND_FX_LIST
  // (baik file baru yang di-push ke assets/sounds/ lewat GitHub, MAUPUN
  // link Google Drive baru yang sudah "anyone with the link"), baris
  // unduhnya OTOMATIS muncul di sini juga tanpa perlu edit kode lain
  // sama sekali -- cukup reload halaman. Efek sintesis murni (tidak
  // punya "src") dilewati karena tidak ada file untuk diunduh.
  // --------------------------------------------------------
  function renderDownloadList(container) {
    if (!container) return;
    container.innerHTML = "";
    const items = SOUND_FX_LIST.filter((it) => it.src);
    if (items.length === 0) {
      container.innerHTML = '<p class="effect-preview-hint">Belum ada efek suara berbasis file (semua masih sintesis).</p>';
      return;
    }
    items.forEach((item) => {
      const external = isExternalUrl_(item.src);
      const row = document.createElement("div");
      row.className = "soundfx-dl-row";
      const label = document.createElement("span");
      label.className = "soundfx-dl-row-label";
      label.textContent = `${item.emoji} ${item.label}`;
      const source = document.createElement("span");
      source.className = "soundfx-dl-row-source";
      source.textContent = external ? "☁️ Google Drive" : "📱 Lokal";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip-btn small soundfx-dl-row-btn";
      btn.textContent = "⬇";
      btn.title = "Unduh " + item.label;
      btn.addEventListener("click", () => {
        btn.disabled = true;
        btn.textContent = "…";
        downloadOne(item.key)
          .catch(() => { btn.title = "Gagal mengunduh " + item.label + " -- coba lagi"; })
          .then(() => { btn.disabled = false; btn.textContent = "⬇"; });
      });
      row.appendChild(label);
      row.appendChild(source);
      row.appendChild(btn);
      container.appendChild(row);
    });
  }

  // --------------------------------------------------------
  // predownloadAll(onProgress) -- BARU (10 Sep 2026, permintaan operator:
  // opsi centang "sertakan juga efek suara MP3" di dialog "📥 Unduh Data
  // Alkitab", js/app.js showBibleSyncPrompt()/syncFromServer()). TIDAK
  // dipanggil otomatis oleh SoundFX sendiri -- defaultnya efek MP3 HANYA
  // di-fetch+cache SATU PER SATU secara "malas" (lihat playAudioFile_())
  // begitu tombolnya benar-benar dipencet, BUKAN diunduh semua di muka.
  // Fungsi ini dipanggil HANYA kalau operator secara sadar mencentang
  // opsi itu -- mem-fetch+decode SEMUA file MP3 di SOUND_FX_LIST
  // sekaligus (lewat loadAudioBuffer_() yang sama dipakai play(), jadi
  // hasilnya juga otomatis ke-cache oleh Service Worker & buffer-nya
  // langsung siap di memori, TIDAK di-fetch ulang) supaya semuanya siap
  // dipakai offline sejak awal, tanpa perlu menunggu jeda pertama kali
  // tiap tombol dipencet nanti.
  //   onProgress(doneCount, totalCount) -- opsional, dipanggil tiap 1
  //   file selesai (berhasil ATAU gagal) supaya pemanggil bisa
  //   menampilkan progres "X dari Y efek suara".
  // 1 file gagal (mis. koneksi putus di tengah) TIDAK menggagalkan file
  // lain -- diam-diam dilewati, konsisten dengan playAudioFile_().
  // --------------------------------------------------------
  function predownloadAll(onProgress) {
    // Hanya file LOKAL (assets/sounds/...) yang bisa disiapkan offline --
    // link luar (Google Drive dst) TIDAK mungkin di-cache dengan cara ini
    // (lihat komentar "LINK LUAR" di playAudioFile_() di atas), jadi
    // dilewati di sini supaya tidak dihitung sebagai "gagal".
    const items = SOUND_FX_LIST.filter((it) => it.src && !isExternalUrl_(it.src));
    const total = items.length;
    let done = 0;
    if (typeof onProgress === "function") onProgress(0, total);
    return Promise.all(
      items.map((it) =>
        loadAudioBuffer_(it.src)
          .catch(() => {})
          .then(() => {
            done++;
            if (typeof onProgress === "function") onProgress(done, total);
          })
      )
    );
  }

  // BARU (11 Sep 2026, langkah 4 STATUS-PUSTAKA-MEDIA.md) -- playUrl(src)
  // memutar file audio dari URL APA SAJA (link mp3/wav/Drive milik
  // "Efek Suara" kontribusi di Pustaka Media, js/media-library.js),
  // BUKAN dari SOUND_FX_LIST bawaan. Numpang playAudioFile_() yang
  // SAMA persis dipakai efek ber-"src" di SOUND_FX_LIST -- otomatis
  // ikut lewat destination_() (jadi tetap kena sakelar mute "M" Layar
  // 2) & ikut dicache di audioBufferCache_ seperti efek mp3 bawaan.
  // Dipanggil dari present.html saat menerima payload
  // {type:"sound", src:"..."} (lihat wireEffectsTab(),
  // js/presentation-studio.js, & listener "message" di present.html).

  // ============================================================
  // 🔔 BARU (12 Sep 2026, permintaan operator "bisa ambil dari suara
  // effect yang ada sekarang di sound effect semua, jadi defaultnya
  // sudah benar, tetapi bisa diganti jadi suara yang lainnya yang
  // sudah dimasukkan, jadi suara itu bisa terus update selama
  // soundfx.js ada seberapa banyak") --
  //
  // Sebelum ini, dropdown "🔔 Suara Bel" (Timer/Countdown) HANYA diisi
  // dari CONFIG.BELL_SOUNDS (js/config.js) -- daftar terpisah yang
  // harus diisi manual 1-per-1 (link Google Drive) kalau operator mau
  // bel selain "Bel 1 (Bawaan)". SEKARANG bellChoices() di bawah
  // MENGGABUNGKAN 2 sumber jadi 1 daftar dropdown:
  //   1. "🔔 Bel 1 (Bawaan)" (bunyi "denting" bawaan, key "bell1",
  //      TETAP paling atas & bawaan/default -- TIDAK berubah sama
  //      sekali dari sebelumnya) + bel custom link Drive lain kalau
  //      operator pernah menambah sendiri di CONFIG.BELL_SOUNDS (cara
  //      lama, tetap didukung).
  //   2. SEMUA efek di SOUND_FX_LIST di atas ("🎉 Efek Panggung" yang
  //      sudah ada -- Drumroll, Tepuk Tangan, Ding, dst, termasuk yang
  //      berbasis file mp3 di assets/sounds/) -- ditambahkan OTOMATIS
  //      sebagai pilihan bel tambahan, ditandai `isFx:true` supaya
  //      pemanggil (present.html) tahu harus memutarnya lewat
  //      SoundFX.play(key) (BUKAN lewat link Drive).
  // Karena daftar ini dibaca LANGSUNG dari SOUND_FX_LIST tiap dipanggil
  // (bukan disalin sekali saja), menambah/mengurangi baris di
  // SOUND_FX_LIST di atas OTOMATIS ikut menambah/mengurangi pilihan
  // bel di sini juga -- tidak perlu sentuh fungsi ini sama sekali,
  // TIDAK PEDULI SUDAH JADI BERAPA BANYAK baris di SOUND_FX_LIST.
  // Dipakai oleh: js/presentation-studio.js (dropdown & grid "Bel
  // Cepat" tab Studio + jalan pintas Alt+1..9), js/presentation.js
  // (dropdown panel sederhana HP), present.html (ringBell() saat
  // benar-benar membunyikannya).
  // ------------------------------------------------------------
  function bellChoices() {
    const out = [];
    const custom = (typeof CONFIG !== "undefined" && Array.isArray(CONFIG.BELL_SOUNDS) && CONFIG.BELL_SOUNDS.length) ? CONFIG.BELL_SOUNDS : [{ key: "bell1", label: "🔔 Bel 1 (Bawaan)", url: "" }];
    custom.forEach((b) => { if (b && b.key) out.push({ key: b.key, label: b.label || b.key, url: b.url || "" }); });
    SOUND_FX_LIST.forEach((fx) => {
      // Jaga-jaga supaya tidak dobel kalau suatu saat ada key yang
      // kebetulan sama persis antara CONFIG.BELL_SOUNDS & SOUND_FX_LIST.
      if (out.some((o) => o.key === fx.key)) return;
      out.push({ key: fx.key, label: (fx.emoji ? fx.emoji + " " : "🔊 ") + fx.label, isFx: true });
    });
    return out;
  }

  return { LIST: SOUND_FX_LIST, configure, play, playUrl: playAudioFile_, renderButtons, renderDownloadList, downloadOne, predownloadAll, setMuted, bellChoices };
})();
