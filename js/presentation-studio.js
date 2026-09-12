// ============================================================
//  STUDIO PRESENTASI (Mode 2 Layar) — layout 3 kolom ala OBS,
//  KHUSUS laptop/komputer (layar lebar). Menggantikan panel kecil
//  lama yang "turun terus ke bawah" di menu ⋮ untuk kasus 2 layar --
//  panel lama (js/presentation.js) tetap dipakai apa adanya untuk
//  HP / mode 1 layar & sebagai mesin pengiriman pesan (postMessage)
//  ke present.html, supaya tidak menduplikasi logic buka/tutup
//  jendela Layar 2.
//
//  STATUS (lihat jawaban chat untuk detail per tahap):
//   0b) BARU 19 Agu 2026: saat menyimpan ayat ke Kumpulan Ayat lewat
//      tombol "➕ Daftar" di tab Alkitab (tanpa kumpulan aktif dipilih
//      di dropdown kiri), dulu pakai prompt() browser polos yang cuma
//      minta ketik nama dari nol. Sekarang muncul dialog kecil
//      (#collectionNamePicker di index.html) yang menyarankan nama
//      kumpulan yang SUDAH ADA -- diurutkan dari yang paling BARU
//      dipakai (chip paling kiri/menyala) -- tinggal diklik, atau
//      tetap bisa ketik nama baru. Lihat promptCollectionName() &
//      getRecentCollectionNames() (js/collections.js).
//   0) PERBAIKAN 19 Agu 2026: pratinjau mini video YouTube di Studio
//      (kotak "Tayang") dulu bisa diklik langsung (kontrol bawaan
//      YouTube-nya) -- operator kira menjeda di situ ikut menjeda
//      Layar 2, padahal itu iframe/pemutar TERPISAH. Sekarang
//      pratinjau itu tidak bisa diklik (pointer-events:none) + label
//      kecil, dan tombol ▶️/⏸️/🔇 di atasnya sekarang mengontrol
//      KEDUANYA (Layar 2 & pratinjau) sekaligus lewat postMessage --
//      lihat renderStudioPreview() (kasus "youtube") & wireYtControls().
//   1) Struktur & layout 3 kolom — SELESAI.
//   2) Timer/Countdown — SELESAI.
//   3) Checklist 8 versi Alkitab (IND/ITB, IND-RCV, ENG, ENG-RCV, MDR,
//      MDR-S, KJV, JAWA) tersambung ke data ayat asli, tayang
//      bertumpuk sekaligus di Layar 2 — SELESAI.
//   4) File tab: gambar (jpg/png/webp/gif) & PDF (dikonversi per
//      halaman jadi gambar lewat pdf.js, dimuat lazy dari CDN) —
//      SELESAI, termasuk navigasi ◀ ▶ antar halaman/slide per file.
//      pptx TIDAK dirender asli (butuh mesin render PowerPoint yang
//      berat) — diarahkan simpan sebagai PDF dulu untuk hasil persis.
//   5) Pengumuman/Pesan berjalan/Pointer/Pen/Warta/FootNote/Aksi
//      Cepat/Tema — sudah fungsional dari tahap sebelumnya.
//   6) Tombol "➕ Daftar" di tab File — SELESAI. Menyimpan file/slide
//      (gambar & PDF-jadi-gambar) ke tab baru "🖼️ Media Tersimpan" di
//      kolom kiri (lihat addMediaItem() dkk. di js/collections.js).
//      Lokal per-perangkat saja (tidak disinkron ke Sheet -- data-URL
//      gambar terlalu besar untuk itu).
//   7) BARU 26 Agu 2026: Tab Kidung/Hymn — SELESAI (tersambung ke
//      sumber data Kidung yang SAMA dengan menu 🎵 Kidung biasa,
//      js/kidung.js -- tidak butuh Sheet/sumber data baru, sumbernya
//      sudah ada). Operator cari buku/nomor/judul, pilih mode pemecah
//      slide (1 bait, 1+koor, 2+koor, 3+koor, koor saja -- lihat
//      splitKidungIntoSlides() di js/kidung.js), lalu per-slide bisa
//      "▶️ Tayangkan" (langsung live ke Layar 2) atau "➕ Daftar"
//      (simpan ke Kumpulan Ayat sebagai snapshot -- lihat
//      addKidungToCollection() di js/collections.js, item type
//      "kidung" sekarang menyimpan bait+koor per slide, bukan cuma
//      nomor). Lihat wireKidungTab() di bawah.
//   8) BARU 20 Agu 2026: "Media Tersimpan" (PDF/gambar/daftar YouTube)
//      dipindah dari localStorage ke IndexedDB (LocalDB di js/db.js,
//      store "studioMedia") -- ini yang memperbaiki bug "Gagal
//      menyimpan (penyimpanan perangkat penuh?)" pada PDF yang bahkan
//      di bawah 25MB: akar masalahnya BUKAN batas 25MB itu (itu cuma
//      mengecek file ASLI sebelum dirender), tapi kuota localStorage
//      per origin yang cuma ~5-10MB TOTAL, sedangkan hasil render PDF
//      jadi gambar (skala 2x + base64) gampang lebih besar dari itu.
//      Data lama otomatis dipindahkan sekali (lihat
//      migrateLegacyMediaItemsIfNeeded() di js/collections.js), tidak
//      hilang. Sekaligus tombol "➕ Daftar" (tab File) & "💾 Simpan ke
//      Media Tersimpan" (tab YouTube) sekarang JUGA pakai dialog
//      rekomendasi nama terakhir (promptSaveName("media", ...)) --
//      sebelumnya cuma tersedia di tab Alkitab (Kumpulan Ayat).
//      Kumpulan Ayat & Media Tersimpan SENGAJA TETAP 2 penyimpanan
//      terpisah (bukan digabung 1 nama) -- lihat penjelasan di
//      jawaban chat kenapa ini pilihan yang lebih aman.
//   9) BARU 26 Agu 2026: Kumpulan Ayat (kiri) & tab Kidung (tengah)
//      SEKARANG SATU PLAYLIST -- klik item mana pun di salah satu
//      daftar itu langsung tayang LIVE ke Layar 2 (bukan lagi 2 langkah
//      "Berikutnya" -> "▶ Tayangkan" khusus untuk daftar ini) sekaligus
//      menjadikannya "playlist aktif": tombol panah kiri/kanan papan
//      ketik, ATAU clicker/stylus presentasi nirkabel yang meniru
//      tombol itu, langsung menggerakkan Layar 2 dari slide pertama
//      sampai terakhir & bisa kembali dengan sempurna -- persis seperti
//      openCollectionFullscreen() (js/app.js) untuk mode 1 layar, tapi
//      sekarang berlaku juga di mode 2 Layar/Studio. Kumpulan Ayat juga
//      sudah mendaftar item GENERIK (ayat/teks/pengumuman/kidung),
//      bukan cuma ayat lagi. Lihat activePlaylist, setActivePlaylist(),
//      sendGenericItemLive(), wirePlaylistKeyNav().
// ============================================================

const PresentationStudio = (() => {
  const THEME_KEY = "bible_app_studio_theme_v1";
  const LOGO_KEY = "bible_app_studio_logo_url_v1";
  const BLANK_MSG_KEY = "bible_app_studio_blank_msg_v1";
  const UI_THEME_KEY = "bible_app_studio_ui_theme_v1"; // "dark" | "light" -- tema PANEL Studio (bukan Layar Proyeksi)
  const DESKTOP_MIN_WIDTH = 1100;

  // Catatan: bentuk (rasio) kotak pratinjau tidak lagi diatur manual di
  // sini -- js/presentation.js mengunci CSS var --ps-preview-ratio
  // secara OTOMATIS begitu Layar 2 melaporkan ukuran jendelanya yang
  // sesungguhnya (lihat applyPreviewRatio() & pesan "present_geometry"
  // di present.html). Dulu ada pemilih resolusi manual (16:9/4:3 +
  // daftar resolusi) di sini -- dihapus supaya panel tidak makin
  // panjang & supaya pratinjau selalu mengikuti kenyataan tanpa
  // operator perlu mengatur apa pun.

  // PENTING (perbaikan bug "ayat/tulisan tidak kelihatan"): setiap tema
  // Layar Proyeksi WAJIB punya pasangan `ink` (warna tulisan) yang
  // kontras dengan `bg`-nya. Sebelumnya hanya `bg` yang dikirim ke
  // present.html, jadi tema terang/sepia (latar cerah) memakai warna
  // tulisan bawaan yang juga terang -- tulisan jadi nyaris tak
  // kelihatan (bukan berarti "tidak tayang", tapi kelihatan kosong).
  const THEMES = {
    gelap:  { bg: "#05070c", ink: "#f5f2e8" },
    terang: { bg: "#fdfaf3", ink: "#1a1a1a" },
    emas:   { bg: "#1a1206", ink: "#e9c977" },
    biru:   { bg: "#0b1730", ink: "#ffffff" },
    sepia:  { bg: "#f4e8d0", ink: "#3a2c17" },
    // BARU (4 Sep 2026, permintaan operator) -- 2 tema baru:
    // "Putih" (latar putih bersih) & "Krem" (latar kuning krem lembut).
    // DIPERBAIKI (12 Sep 2026 v3, laporan operator "putih-biru kurang
    // kontras, maunya putih-hitam") -- "Putih" SEBELUMNYA pakai tulisan
    // biru tegas (#173f91); sekarang diganti hitam pekat supaya
    // kontrasnya maksimal (putih-hitam), sesuai permintaan. "Krem"
    // dibiarkan seperti semula (tulisan biru muda) karena tidak
    // disebut bermasalah.
    putih:  { bg: "#ffffff", ink: "#111111" },
    krem:   { bg: "#fdf1cf", ink: "#2f6fb3" },
  };

  let msgColor = "#ffffff";
  let msgPos = "top";
  let msgRunning = false;
  // BARU (7 Sep 2026, permintaan operator) -- stroke/kontur huruf & jenis
  // font untuk tab "💬 Pesan", lihat wireMessage() di bawah.
  let msgStrokeOn = false;
  let msgStrokeColor = "#ffffff";
  let msgStrokeWidth = 2;
  let msgFont = "'Inter', Arial, sans-serif";
  // BARU (7 Sep 2026 v2, permintaan operator) -- mode tampil pesan:
  //   "static" -- diam total (bawaan)
  //   "scroll" -- geser kanan->kiri (marquee lama, gantikan checkbox
  //               "Berjalan" yang sebelumnya berdiri sendiri)
  //   "pulse"  -- diam DI TEMPAT tapi ukurannya berdenyut 100% <-> 150%
  //               berulang terus sampai pesan ditutup/diganti.
  let msgMode = "static";
  let msgPulseSeconds = 2;
  // Border di sekeliling LATAR/BACKGROUND bar pesan (checklist warna) --
  // "" berarti tanpa border sama sekali.
  let msgBorderColor = "";
  let msgBorderWidth = 4;
  // BARU (8 Sep 2026, permintaan operator) -- LATAR/BACKGROUND bar pesan
  // bisa diwarnai PENUH SOLID (mis. Merah penuh untuk pesan darurat),
  // beda dari msgBorderColor di atas yang cuma garis tepi tipis. "" =
  // balik ke latar gelap solid bawaan (lihat applyTicker(), present.html).
  let msgBgColor = "";
  // BARU (7 Sep 2026 v3, permintaan operator) -- kecepatan mode
  // "➡️ Berjalan" (detik MINIMAL per 1 putaran, lihat #psMsgSpeedRow &
  // applyTicker() di present.html -- rumus SAMA PERSIS dipakai di dua
  // tempat supaya progress bar simulasi lokal di bawah akurat), dan
  // A+/A- ukuran huruf pesan (--p-msg-scale).
  let msgScrollBaseSec = 12;
  let msgScale = 1;
  let msgScrollProgressTimer_ = null;

  // (BARU 6 Sep 2026 -- boolean timerRunning lama digantikan timerState_,
  // dideklarasikan sendiri di dekat fmtMMSS() di bawah, supaya berdekatan
  // dengan sisa kode Timer yang memakainya.)
  let timerDisplayInterval = null;
  let timerEndAt = null;
  let timerTotal = 0;

  let pointerActive = false;
  let penActive = false;
  let penStroke = [];
  // BARU (27 Agu 2026) -- 🔍 Kaca Pembesar, lihat wirePointerPen() di bawah.
  let magnifyActive = false;
  // BARU (12 Sep 2026) -- 🎯 Efek Fokus (klik = lingkaran mengembang di
  // Layar 2), lihat wirePointerPen() di bawah & playFocusRipple_()
  // (present.html). Mode ke-4 yang saling eksklusif dengan Penunjuk/Pen/
  // Kaca Pembesar di atas (cuma 1 yang boleh aktif dalam 1 waktu, sama
  // pola-nya dengan 3 yang sudah ada).
  let focusClickActive = false;
  // BARU (12 Sep 2026, permintaan operator "kotak lebih terang, klik utk
  // mengunci perbesaran") -- 🔲 Perbesar Kotak, mode ke-5 yang sama-sama
  // saling eksklusif dengan 4 mode di atas. `boxZoomActive` = tombolnya
  // sedang dinyalakan (mode ini yang aktif dipilih operator);
  // `boxZoomLocked` = SUDAH diklik sekali & sedang mengunci perbesaran
  // (beda dari `boxZoomActive` -- bisa aktif tapi BELUM dikunci, sedang
  // "mencari" posisi kotak). Lihat wirePointerPen() di bawah.
  let boxZoomActive = false;
  let boxZoomLocked = false;

  function el(id) { return document.getElementById(id); }
  function isDesktop() { return window.innerWidth >= DESKTOP_MIN_WIDTH; }

  function post(payload) {
    // Delegasikan pengiriman & preview-mirroring ke Presentation
    // (js/presentation.js) supaya satu sumber kebenaran untuk jendela
    // Layar 2 + status buka/tutup, sekaligus mengisi kotak pratinjau
    // milik Studio (#psPreviewBox) di sini.
    if (typeof Presentation === "undefined") return;
    if (payload.type === "text") Presentation.sendFreeText(payload.text, payload.align);
    else if (payload.type === "clear") Presentation.clearScreen();
    else Presentation.postRaw ? Presentation.postRaw(payload) : rawPost(payload);
    renderStudioPreview(payload);
    syncMonitorVideoForPayload_(payload); // BARU (10 Sep 2026, lanjutan) -- lihat catatan di fungsi ini
  }

  // Kirim tipe payload baru (theme/warta/footnote/timer/black/logo/
  // pointer/pen) lewat Presentation.postRaw() (js/presentation.js) --
  // supaya jendela Layar 2 & status buka/tutupnya tetap 1 sumber
  // kebenaran, dan supaya gerakan Penunjuk/Pen (dikirim tiap mousemove)
  // TIDAK membuka jendela baru / merebut fokus berkali-kali.
  function rawPost(payload) {
    if (typeof Presentation === "undefined" || !Presentation.postRaw) return;
    Presentation.postRaw(payload);
    syncMonitorVideoForPayload_(payload); // BARU (10 Sep 2026, lanjutan) -- lihat catatan di fungsi ini
  }

  // BARU (10 Sep 2026, lanjutan permintaan operator) -- "Monitor
  // Pembicara" (Monitor 3, monitor.html) sekarang juga bisa menampilkan
  // CUPLIKAN VIDEO dari apa yang sedang tayang di Layar 2 -- HANYA
  // gambarnya, TANPA suara sama sekali (monitor.html memaksa semua
  // video/iframe di sana `muted`, apa pun status mute Layar 2). Suara
  // yang sesungguhnya untuk jemaat TETAP 100% memakai jalur/logika lama
  // (Layar 2 -> sound system venue) -- fungsi ini TIDAK pernah menyentuh
  // itu, cuma menyalin info video-nya SAJA ke jendela ke-3.
  //
  // rawPost()/post() adalah 2 jalur TUNGGAL yang dipakai SEMUA pengiriman
  // ke Layar 2 di seluruh file ini (youtube, localvideo, canva,
  // soundcloud, map, modescreen, slide gambar, teks, clear, dst) --
  // jadi cukup disadap DI SINI SAJA, tidak perlu menyisipkan kode
  // serupa di puluhan tempat lain. Pengecualian: Presentation.sendVerse/
  // sendVerseMulti/sendKidung/sendFreeText yang dipanggil LANGSUNG (tidak
  // lewat rawPost/post) di sendGenericItemLive()/sendKidungSlide()/tab
  // Ayat Cepat -- lokasi itu memanggil clearMonitorVideo_() sendiri
  // secara eksplisit (lihat catatan di situ), karena semuanya memang
  // konten NON-video.
  function syncMonitorVideoForPayload_(payload) {
    if (typeof Presentation === "undefined" || !Presentation.postMonitorVideo || !payload) return;
    if (payload.type === "youtube") {
      Presentation.postMonitorVideo({ kind: "youtube", embedUrl: payload.embedUrl || "" });
    } else if (payload.type === "localvideo") {
      if (payload.action === "stop") clearMonitorVideo_();
      else Presentation.postMonitorVideo({ kind: "localvideo", blob: payload.blob || null, name: payload.name || "" });
    } else if (payload.type === "localvideo_control") {
      // Monitor 3 selalu senyap -- hanya teruskan play/pause/stop
      // (posisi pemutaran), JANGAN mute/unmute (tidak relevan, dan
      // supaya tidak pernah tanpa sengaja membunyikan Monitor 3).
      if (payload.action === "play" || payload.action === "pause" || payload.action === "stop") {
        if (typeof Presentation.postMonitorVideoControl === "function") Presentation.postMonitorVideoControl(payload.action);
      }
    } else {
      // Semua tipe lain (teks, ayat, kidung, slide gambar/PDF, canva,
      // soundcloud, peta, mode layar, clear, black, dst) BUKAN video --
      // sembunyikan area video di Monitor 3, balik ke tampilan teks
      // Sekarang/Selanjutnya biasa.
      clearMonitorVideo_();
    }
  }
  function clearMonitorVideo_() {
    if (typeof Presentation !== "undefined" && Presentation.postMonitorVideo) Presentation.postMonitorVideo({ kind: "none" });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // BARU (4 Sep 2026 v2, permintaan operator) -- tampilkan/sembunyikan
  // progress bar + kolom waktu LIVE (#psYtLiveBar, lihat wireYtControls())
  // sesuai apakah yang SEDANG tayang video YouTube atau bukan, DAN reset
  // tampilannya ke 00:00:00/durasi belum diketahui setiap kali video yang
  // ditayangkan BERGANTI (embedUrl beda dari sebelumnya) -- supaya sisa
  // posisi/durasi video LAMA tidak nyangkut kelihatan di video BARU
  // sebelum laporan posisi pertamanya (present_yt_progress) tiba.
  let lastYtEmbedUrlForLiveBar = null;
  function syncYtLiveBarVisibility(payload) {
    const wrap = el("psYtLiveBar");
    if (!wrap) return;
    const wasHidden = wrap.hidden;
    if (payload && payload.type === "youtube") {
      wrap.hidden = false;
      if (payload.embedUrl && payload.embedUrl !== lastYtEmbedUrlForLiveBar) {
        lastYtEmbedUrlForLiveBar = payload.embedUrl;
        if (typeof window.resetYtLiveBar === "function") window.resetYtLiveBar();
      }
    } else {
      wrap.hidden = true;
      lastYtEmbedUrlForLiveBar = null;
    }
    // BARU (4 Sep 2026, permintaan operator) -- lihat catatan panjang di
    // window.refreshPreviewSplitterSpacing() (wirePreviewResize(), bawah
    // file ini): begitu livebar berganti tampil/sembunyi, kotak
    // Berikutnya/Tayang perlu langsung menyesuaikan tinggi supaya tidak
    // kepotong. requestAnimationFrame supaya diukur SETELAH `wrap.hidden`
    // di atas benar-benar diterapkan browser (getBoundingClientRect
    // livebar butuh itu sudah ter-render).
    if (wasHidden !== wrap.hidden && typeof window.refreshPreviewSplitterSpacing === "function") {
      requestAnimationFrame(() => window.refreshPreviewSplitterSpacing());
    }
  }

  function renderStudioPreview(payload) {
    const box = el("psPreviewBox");
    if (!box) return;
    syncYtLiveBarVisibility(payload);
    if (!payload || payload.type === "clear") {
      box.innerHTML = '<div class="present-preview-idle">Belum ada tayangan</div>';
      return;
    }
    if (payload.type === "black") { box.innerHTML = '<div class="present-preview-black">⬛ Layar Hitam</div>'; return; }
    if (payload.type === "logo") { box.innerHTML = '<div class="present-preview-idle">◆ Logo ditampilkan</div>'; return; }
    if (payload.type === "youtube") {
      // BARU (4 Sep 2026 v3) -- setiap kali video BARU ditayangkan (baik
      // ke Layar 2 maupun kotak pratinjau ini), tandai bahwa ▶️ Play
      // BERIKUTNYA yang ditekan operator perlu "trik" mute->play->unmute
      // otomatis (lihat wireYtControls()) supaya suara langsung terdengar
      // dari 1x tekan saja -- lihat catatan panjang di sana kenapa perlu.
      if (payload.embedUrl && typeof window.markYtNeedsSoundUnlock === "function") window.markYtNeedsSoundUnlock();
      // PERBAIKAN (laporan operator, 19 Agu 2026): kotak pratinjau ini
      // adalah iframe YouTube TERPISAH dari yang sungguh tayang di Layar 2
      // (present.html) -- 2 pemutar video yang berlainan sepenuhnya.
      // Sebelumnya iframe ini dibiarkan bisa diklik langsung (kontrol
      // bawaan YouTube-nya sendiri), jadi operator yang menekan ⏸️ pada
      // video di sini MENGIRA itu ikut menjeda Layar 2 -- padahal tidak,
      // karena 2 iframe itu tidak saling tersambung. Sekarang iframe ini
      // dibuat tidak bisa diklik (pointer-events:none) + label kecil,
      // supaya operator SELALU pakai tombol ▶️/⏸️/🔇 di atas (baris
      // wireYtControls()) -- dan tombol itu sekarang ikut mengontrol
      // pratinjau mini ini juga (lihat syncPreviewYtControl()), supaya
      // keduanya (pratinjau & Layar 2) selalu terlihat sinkron.
      box.innerHTML = payload.embedUrl
        ? `<div style="position:absolute; inset:0;">
             <iframe id="psYtPreviewFrame" src="${escapeHtml(toStudioPreviewEmbedUrl(payload.embedUrl))}" style="position:absolute; inset:0; width:100%; height:100%; border:0; pointer-events:none;" allow="autoplay; encrypted-media" title="Pratinjau video"></iframe>
             <div style="position:absolute; left:0; right:0; bottom:0; padding:3px 8px; font-size:11px; background:rgba(0,0,0,.55); color:#fff; pointer-events:none;">${ytPreviewSoundMode ? "🔊 Pratinjau (bersuara -- mode uji coba 1 laptop) — tekan ▶️/⏸️/🔇 di atas" : "🔇 Pratinjau (bisu) — pakai ▶️/⏸️/🔇 di atas untuk Layar 2"}</div>
           </div>`
        : '<div class="present-preview-idle">▶️ Video YouTube</div>';
      return;
    }
    if (payload.type === "slide") {
      box.innerHTML = payload.imageUrl
        ? `<img src="${payload.imageUrl}" style="max-width:100%; max-height:100%; object-fit:contain; display:block;" />`
        : '<div class="present-preview-idle">🖼️ Slide</div>';
      return;
    }
    // BARU (4 Sep 2026) -- pratinjau ringkas untuk Canva/SoundCloud (tab
    // "🔗 Link"). TIDAK dibuat iframe hidup di sini (beda dari pratinjau
    // YouTube di atas) -- Canva tidak boleh diklik 2x sembarangan dari
    // kotak kecil ini (bisa membingungkan mana yang "sungguh Layar 2"),
    // dan SoundCloud lebih jelas cukup 1 sumber SC.Widget (di Layar 2
    // sendiri) supaya kontrol Play/Pause Studio selalu sinkron dengan
    // 1 widget yang sama, bukan 2 widget terpisah yang bisa berbeda.
    if (payload.type === "canva") {
      box.innerHTML = `<div class="present-preview-idle">🖼️ Canva${payload.title ? ": " + escapeHtml(payload.title) : ""} — tayang di Layar 2</div>`;
      return;
    }
    if (payload.type === "soundcloud") {
      box.innerHTML = `<div class="present-preview-idle">🎧 SoundCloud${payload.title ? ": " + escapeHtml(payload.title) : ""} — putar di Layar 2</div>`;
      return;
    }
    // BARU (7 Sep 2026, permintaan operator) -- 🎬 Video Lokal (MP4).
    // TIDAK dibuat pratinjau video hidup di kotak kecil ini (beda dari
    // YouTube di atas) -- Blob-nya SUDAH dikirim ke Layar 2 lewat
    // postMessage (lihat wireLocalVideoTab()), membuat pemutar KEDUA di
    // sini cuma buang-buang memori untuk video yang sama persis.
    if (payload.type === "localvideo") {
      box.innerHTML = `<div class="present-preview-idle">🎬 Video Lokal${payload.name ? ": " + escapeHtml(payload.name) : ""} — tayang di Layar 2</div>`;
      return;
    }
    // BARU (9 Sep 2026) -- pratinjau ringkas untuk "🖥️ Mode & Peta"
    // (Welcome/Next Up & Peta Interaktif) di kotak "Tayang" Studio.
    if (payload.type === "modescreen") {
      const kindMeta = (window.MODE_SCREEN_KIND_META && window.MODE_SCREEN_KIND_META[payload.kind]) || { icon: "👋", label: "Welcome" };
      box.innerHTML = `<div class="present-preview-idle">${kindMeta.icon} ${kindMeta.label}${payload.title ? ": " + escapeHtml(payload.title) : ""} — tayang di Layar 2</div>`;
      return;
    }
    if (payload.type === "map") {
      box.innerHTML = `<div class="present-preview-idle">🗺️ Peta${payload.pin ? " — fokus: " + escapeHtml(payload.pin.label || "") : ""} — tayang di Layar 2</div>`;
      return;
    }
    // BARU (9 Sep 2026) -- pratinjau ringkas untuk "🎡 Roda Undian" di
    // kotak "Tayang" Studio (lihat wireWheelTab() untuk pemanggilnya).
    if (payload.type === "wheel") {
      box.innerHTML = `<div class="present-preview-idle">🎡 Roda Undian — tayang di Layar 2</div>`;
      return;
    }
    if (payload.type === "verse" || payload.type === "text") {
      const refHtml = payload.ref ? `<div class="present-preview-ref">${escapeHtml(payload.ref)}</div>` : "";
      if (payload.type === "verse" && Array.isArray(payload.texts) && payload.texts.length) {
        const versionsHtml = payload.texts.map((t) => `<div class="present-preview-version"><span class="present-preview-version-tag">${escapeHtml(t.label || "")}</span>${escapeHtml(t.text || "")}</div>`).join("");
        box.innerHTML = `${refHtml}${versionsHtml}`;
        return;
      }
      box.innerHTML = `${refHtml}<div class="present-preview-text">${escapeHtml(payload.text || "")}</div>`;
      return;
    }
    if (payload.type === "kidung") {
      // Pratinjau mini kidung di kotak "Tayang" Studio -- meniru persis
      // yang tampil di Layar 2 (lihat #kidungStage di present.html):
      // bait apa adanya + baris koor disorot kuning kalau ada.
      const refHtml = payload.ref ? `<div class="present-preview-ref">${escapeHtml(payload.ref)}</div>` : "";
      // BARU (4 Sep 2026) -- baris kecil kedua (pengarang + birama +
      // jumlah bait), sama persis susunannya dengan yang dibangun di
      // present.html (showMain() kind "kidung") supaya pratinjau Studio
      // benar-benar mencerminkan apa yang tayang di Layar 2.
      const subText = kidungSubLine(payload.pengarang, payload.birama, payload.jumlahBait);
      const subHtml = subText ? `<div class="present-preview-ref" style="font-size:0.65em; opacity:0.8; text-transform:none; letter-spacing:normal;">${escapeHtml(subText)}</div>` : "";
      const baitHtml = (payload.bait || []).map((b) => `<div class="present-preview-text">${escapeHtml((b.noBait ? b.noBait + ". " : "") + (b.teks || ""))}</div>`).join("");
      const koorHtml = payload.koorTeks ? `<div class="present-preview-text" style="color:#ffd84a; font-weight:600; margin-top:6px;"><b>Koor:</b> ${escapeHtml(payload.koorTeks)}</div>` : "";
      box.innerHTML = `${refHtml}${subHtml}${baitHtml}${koorHtml}`;
    }
  }

  // ------------------------------------------------------------
  // "Berikutnya" (next-up) -- HANYA aktif saat mode dual monitor
  // (Layar 2 sungguh terbuka, lihat ps-dual-live). Di 1 monitor,
  // klik ayat/kidung di daftar langsung tayang seperti sebelumnya
  // (tidak ada perubahan perilaku di situ).
  //
  // Di mode dual: klik item DI-ANTREKAN dulu ke kotak "Berikutnya",
  // operator lihat dulu isinya, baru tekan "▶ Tayangkan" untuk
  // mendorongnya ke "Tayang" (live, tampil di Layar 2).
  // ------------------------------------------------------------
  let nextItem = null; // { ref, text, send: fn() }

  function isDualLive() {
    const s = el("presentStudio");
    return !!(s && s.classList.contains("ps-dual-live"));
  }

  function renderNextPreview() {
    const slot = el("psNextSlot");
    const box = el("psNextBox");
    const btn = el("psNextShowBtn");
    if (!slot) return;
    // PERBAIKAN (4 Sep 2026, permintaan operator) -- dulu kotak
    // "Berikutnya" HANYA muncul di mode dual monitor. Sekarang tombol
    // baru "👁️ Pratinjau" (Kidung & YouTube) bisa menaruh item ke sini
    // walau Layar 2 belum/tidak dibuka terpisah (1 monitor) -- supaya
    // "standby" itu tetap kelihatan & bisa ditekan "▶ Tayangkan"-nya,
    // kotak ini SEKARANG juga ditampilkan kalau memang ada nextItem
    // yang sedang menunggu, terlepas dari mode dual atau tidak.
    slot.hidden = !isDualLive() && !nextItem;
    if (!box || !btn) return;
    if (!nextItem) {
      box.innerHTML = '<div class="present-preview-idle">Belum ada antrean</div>';
      btn.disabled = true;
      return;
    }
    const refHtml = nextItem.ref ? `<div class="present-preview-ref">${escapeHtml(nextItem.ref)}</div>` : "";
    box.innerHTML = `${refHtml}<div class="present-preview-text">${escapeHtml(nextItem.text || "")}</div>`;
    btn.disabled = false;
  }

  function stageNext(ref, text, sendFn) {
    nextItem = { ref, text, send: sendFn };
    renderNextPreview();
  }

  function pushNextLive() {
    if (!nextItem) return;
    nextItem.send();
    nextItem = null;
    renderNextPreview();
  }

  // Dipakai oleh handler klik item (Kumpulan Ayat, Alkitab cepat, dst.):
  // di 1 monitor kirim langsung seperti biasa; di dual monitor, antre dulu.
  function stageOrSend(ref, text, sendFn) {
    if (isDualLive()) stageNext(ref, text, sendFn);
    else sendFn();
  }

  function wireNextBox() {
    if (el("psNextShowBtn")) el("psNextShowBtn").addEventListener("click", pushNextLive);
  }

  // ------------------------------------------------------------
  // Buka / tutup Studio
  // ------------------------------------------------------------
  function openStudio() {
    if (!isDesktop()) {
      alert("Studio Presentasi (3 panel) khusus laptop/komputer. Di HP, gunakan kotak \"Tulisan Bebas\" seperti biasa.");
      return;
    }
    if (typeof Presentation !== "undefined" && !Presentation.isTwoScreenMode()) {
      // Aktifkan mode 2 layar dulu (ini juga yang membuka jendela Layar 2).
      if (el("presentModeToggle")) {
        el("presentModeToggle").checked = true;
        el("presentModeToggle").dispatchEvent(new Event("change"));
      } else {
        localStorage.setItem("bible_app_present_mode_v1", "2");
        Presentation.openWindow();
      }
    }
    if (el("presentStudio")) el("presentStudio").hidden = false;
    document.body.classList.add("ps-open");
    document.documentElement.classList.add("ps-open"); // jaring tambahan untuk <html>, lihat CSS body.ps-open
    refreshStatusUi();
    renderCollectionSelect();
    // PERBAIKAN: js/collections.js sebelumnya hilang total dari proyek,
    // jadi migrateLegacyMediaItemsIfNeeded() tidak pernah ada/terpanggil.
    // Sekarang dipanggil sekali tiap Studio dibuka (aman dipanggil
    // berkali-kali -- lihat komentarnya di js/collections.js), BARU
    // renderMediaList() supaya Media Tersimpan lama (kalau ada, dari versi
    // sebelum pindah ke IndexedDB) ikut tampil, bukan cuma disimpan diam-diam.
    migrateLegacyMediaItemsIfNeeded().then(() => renderMediaList());
    applyStoredTheme();
    watchDualLayout();
  }

  function closeStudio() {
    if (el("presentStudio")) el("presentStudio").hidden = true;
    document.body.classList.remove("ps-open");
    document.documentElement.classList.remove("ps-open");
    stopWatchDualLayout();
  }

  function refreshStatusUi() {
    const t = el("psStatusText");
    if (!t || typeof Presentation === "undefined") return;
    const live = Presentation.isTwoScreenMode();
    t.textContent = live ? "🟢 Layar 2 aktif." : "⚪ Layar 2 belum dibuka.";
    // Saat Layar 2 (jendela terpisah, biasanya di monitor kedua) benar-benar
    // terbuka, ubah tata letak studio ke gaya "dual monitor" (pratinjau besar
    // di atas, kontrol di bawah). Saat belum dibuka (dipakai di 1 monitor
    // saja), tetap pakai tata letak 3-kolom seperti biasa -- TIDAK berubah.
    if (el("presentStudio")) el("presentStudio").classList.toggle("ps-dual-live", live);
    renderNextPreview();
  }

  // Status Layar 2 bisa berubah tanpa lewat tombol di Studio (mis. jendela
  // ditutup langsung oleh operator / lewat menu ⋮), jadi dicek berkala
  // selama Studio terbuka supaya layout dual-monitor otomatis mengikuti.
  let dualLayoutWatcher = null;
  function watchDualLayout() {
    stopWatchDualLayout();
    dualLayoutWatcher = setInterval(refreshStatusUi, 1000);
  }
  function stopWatchDualLayout() {
    if (dualLayoutWatcher) { clearInterval(dualLayoutWatcher); dualLayoutWatcher = null; }
  }

  // ------------------------------------------------------------
  // Tabs (kiri & tengah)
  // ------------------------------------------------------------
  function wireTabs(tabSelector, panelAttr, tabAttr) {
    document.querySelectorAll(tabSelector).forEach((btn) => {
      btn.addEventListener("click", () => {
        const group = btn.parentElement;
        group.querySelectorAll(".ps-tab").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const key = btn.getAttribute(tabAttr);
        const panels = document.querySelectorAll(`[${panelAttr}]`);
        panels.forEach((p) => { p.hidden = p.getAttribute(panelAttr) !== key; });
      });
    });
  }

  // ------------------------------------------------------------
  // Kumpulan Ayat (kiri) -- pakai data js/collections.js yang sudah ada
  // ------------------------------------------------------------
  function renderCollectionSelect() {
    const sel = el("psCollectionSelect");
    if (!sel || typeof loadCollections !== "function") return;
    const username = typeof currentUser !== "undefined" ? currentUser : null;
    const collections = loadCollections(username);
    // BARU -- diurutkan updatedAt (jatuh ke createdAt) TERBARU DULUAN,
    // sama seperti panel Kumpulan Ayat biasa (js/app.js renderCollectionsPanel())
    // -- supaya kumpulan yang baru saja disimpan/diubah operator selalu
    // ada di paling atas dropdown ini, tidak perlu dicari-cari.
    const prevValue = sel.value;
    const ids = Object.keys(collections).sort((a, b) =>
      new Date(collections[b].updatedAt || collections[b].createdAt || 0)
      - new Date(collections[a].updatedAt || collections[a].createdAt || 0)
    );
    // PERBAIKAN (Kumpulan Ayat generik): jumlah item dulu selalu
    // col.verseIds.length (cuma ayat) -- sekarang pakai col.items.length
    // supaya kumpulan yang isinya campuran (teks/pengumuman/kidung) ikut
    // terhitung, bukan cuma yang jenis "verse".
    sel.innerHTML = ids.length
      ? ids.map((id) => `<option value="${id}">${escapeHtml(collections[id].name)} (${(collections[id].items || collections[id].verseIds || []).length} item)</option>`).join("")
      : `<option value="">Belum ada Kumpulan Ayat</option>`;
    // Pertahankan kumpulan yang sedang dipilih operator (kalau masih ada)
    // -- PENTING sekarang karena urutan bisa berubah tiap render (baru
    // diurutkan terbaru-dulu di atas), jadi tanpa ini operator bisa
    // "terlempar" balik ke kumpulan lain begitu urutan bergeser (mis.
    // tepat setelah menambah 1 item, yang otomatis membuat kumpulan itu
    // naik ke atas).
    if (prevValue && ids.includes(prevValue)) sel.value = prevValue;
    sel.onchange = renderCollectionList;
    renderCollectionList();
  }

  // PERBAIKAN (poin 4, Kumpulan Ayat <-> Layar 2): dulu hanya mendaftar
  // col.verseIds (ayat saja) & klik-nya memakai stageOrSend() (2 langkah
  // "Berikutnya" -> "▶ Tayangkan" di mode dual monitor). Sekarang
  // mendaftar col.items GENERIK (ayat/teks/pengumuman/kidung, sama
  // seperti panel Kumpulan Ayat biasa di js/app.js -- lihat
  // collectionItemRef()/collectionItemBodyText()), dan klik LANGSUNG
  // menayangkan LIVE ke Layar 2 sekaligus menjadikan kumpulan ini
  // "playlist aktif" (lihat setActivePlaylist() & wirePlaylistKeyNav()
  // di bawah) -- supaya panah kiri/kanan papan ketik / clicker & stylus
  // presentasi bisa langsung menggerakkan Layar 2 dari item yang baru
  // diklik ini sampai ke ujung kumpulan, dan bisa kembali dengan
  // sempurna (persis seperti openCollectionFullscreen() di js/app.js
  // untuk mode 1 layar).
  //
  // BARU -- tombol "✎ Atur Urutan" (di atas daftar, index.html) menyalakan
  // 4 tombol mini ⏮️⬆️⬇️⏭️ per baris di sini supaya urutan bisa diatur
  // TANPA meninggalkan Studio -- memanggil fungsi yang SAMA (moveItemIn
  // Collection/moveItemToStart/moveItemToEnd di js/collections.js) yang
  // dipakai panel Kumpulan Ayat biasa, jadi hasilnya juga otomatis
  // berlaku di Mode Layar Penuh 1 monitor.
  function renderCollectionList() {
    const wrap = el("psCollectionList");
    const sel = el("psCollectionSelect");
    if (!wrap || !sel || typeof loadCollections !== "function") return;
    const username = typeof currentUser !== "undefined" ? currentUser : null;
    const collections = loadCollections(username);
    const col = collections[sel.value];
    const items = col && Array.isArray(col.items) ? col.items : [];
    // BARU (4 Sep 2026 v3, permintaan operator) -- tulisan jumlah total
    // item/slide di kumpulan yang sedang dipilih (ayat, kidung/bait,
    // pengumuman, teks, file/slide -- SEMUA jenis dihitung jadi 1 angka
    // yang sama seperti di dropdown, cuma lebih kelihatan tanpa perlu
    // buka dropdown dulu). Kosong (tidak ada kumpulan dipilih) -> kosong.
    const countEl = el("psCollectionCount");
    if (countEl) {
      countEl.textContent = col ? `📄 ${items.length} slide/item di kumpulan ini.` : "";
    }
    const deleteAllBtn = el("psCollectionDeleteAllBtn");
    if (deleteAllBtn) deleteAllBtn.disabled = !col;
    if (!items.length) {
      wrap.innerHTML = '<p class="present-saved-empty">Belum ada item di kumpulan ini.</p>';
      return;
    }
    const reorderBtn = el("psCollectionReorderToggle");
    const reorderOn = !!(reorderBtn && reorderBtn.classList.contains("active"));
    // BARU (4 Sep 2026, permintaan operator) -- lihat catatan panjang di
    // removeKidungGroupFromCollection() (js/collections.js): kidung yang
    // ditambahkan lewat "➕ Semua" tersimpan sebagai BANYAK item terpisah
    // (1 per bait). Di sini dihitung dulu, per kidung (kunci buku+no),
    // berapa banyak item bait-nya & di index berapa kemunculan PERTAMA-nya
    // -- supaya tombol "🗑️ Hapus N Bait" cuma muncul SEKALI per kidung
    // (di baris pertamanya), bukan di setiap baris bait (yang akan
    // berulang/membingungkan).
    const kidungGroupCount = {};
    const kidungGroupFirstIdx = {};
    items.forEach((it, i) => {
      if (it && it.type === "kidung") {
        const key = (it.buku || "") + "|" + it.kidungNo;
        kidungGroupCount[key] = (kidungGroupCount[key] || 0) + 1;
        if (!(key in kidungGroupFirstIdx)) kidungGroupFirstIdx[key] = i;
      }
    });
    // BARU (12 Sep 2026, laporan operator "hapus 26 halaman PDF sekaligus,
    // dulu bisa sekarang tidak") -- SAMA PERSIS pola di atas (kidung), tapi
    // untuk item "media" (PDF/gambar dari "➕ Semua Halaman"), dikelompokkan
    // per mediaItemId -- lihat removeMediaGroupFromCollection() (js/collections.js).
    const mediaGroupCount = {};
    const mediaGroupFirstIdx = {};
    items.forEach((it, i) => {
      if (it && it.type === "media" && it.mediaItemId) {
        mediaGroupCount[it.mediaItemId] = (mediaGroupCount[it.mediaItemId] || 0) + 1;
        if (!(it.mediaItemId in mediaGroupFirstIdx)) mediaGroupFirstIdx[it.mediaItemId] = i;
      }
    });
    wrap.innerHTML = "";
    items.forEach((it, i) => {
      const ref = genericItemRefText(it);
      const snippet = genericItemBodyText(it).slice(0, 50);
      const row = document.createElement("div");
      row.className = "ps-verse-row";
      row.dataset.playlistIdx = String(i);
      const isKidung = it && it.type === "kidung";
      const kKey = isKidung ? (it.buku || "") + "|" + it.kidungNo : null;
      const groupN = isKidung ? kidungGroupCount[kKey] : 0;
      const showGroupDelete = isKidung && groupN > 1 && kidungGroupFirstIdx[kKey] === i;
      const isMedia = it && it.type === "media" && it.mediaItemId;
      const mediaGroupN = isMedia ? mediaGroupCount[it.mediaItemId] : 0;
      const showMediaGroupDelete = isMedia && mediaGroupN > 1 && mediaGroupFirstIdx[it.mediaItemId] === i;
      row.innerHTML =
        `<div class="ps-verse-row-body"><span class="ps-verse-ref">${escapeHtml(ref)}</span><span class="ps-verse-snippet">${escapeHtml(snippet)}</span></div>` +
        `<div class="ps-verse-row-del">
           ${showGroupDelete ? `<button type="button" class="chip-btn small danger" data-del="group" title="Hapus SEMUA ${groupN} bait kidung ini dari kumpulan, sekali klik">🗑️ Hapus ${groupN} Bait Kidung Ini</button>` : ""}
           ${showMediaGroupDelete ? `<button type="button" class="chip-btn small danger" data-del="mediagroup" title="Hapus SEMUA ${mediaGroupN} halaman berkas ini dari kumpulan, sekali klik">🗑️ Hapus Semua ${mediaGroupN} Halaman Ini</button>` : ""}
           <button type="button" class="chip-btn small danger" data-del="one" title="Hapus item ini saja dari kumpulan">🗑️ Hapus Item Ini</button>
         </div>` +
        (reorderOn
          ? `<div class="ps-verse-row-reorder">
              <button type="button" class="chip-btn small" data-mv="top" title="Ke paling awal"${i === 0 ? " disabled" : ""}>⏮️</button>
              <button type="button" class="chip-btn small" data-mv="up" title="Naikkan"${i === 0 ? " disabled" : ""}>⬆️</button>
              <button type="button" class="chip-btn small" data-mv="down" title="Turunkan"${i === items.length - 1 ? " disabled" : ""}>⬇️</button>
              <button type="button" class="chip-btn small" data-mv="bottom" title="Ke paling akhir"${i === items.length - 1 ? " disabled" : ""}>⏭️</button>
            </div>`
          : "");
      row.querySelector(".ps-verse-row-body").addEventListener("click", () => {
        setActivePlaylist(items, i, col.name);
        sendGenericItemLive(items[i]);
      });
      // "🗑️ Hapus Item Ini" -- hapus 1 item (1 bait, kalau kidung) saja.
      row.querySelector('[data-del="one"]').addEventListener("click", (e) => {
        e.stopPropagation();
        if (!confirm(`Hapus "${ref}" dari kumpulan "${col.name}"?`)) return;
        if (removeItemFromCollection(username, sel.value, i)) {
          activePlaylist = null;
          renderCollectionSelect();
        }
      });
      // "🗑️ Hapus N Bait Kidung Ini" -- hapus SEMUA bait kidung yang sama
      // sekaligus (permintaan operator: dulu harus hapus satu-satu).
      const groupBtn = row.querySelector('[data-del="group"]');
      if (groupBtn) {
        groupBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (!confirm(`Hapus SEMUA ${groupN} bait kidung "${it.title || ("No. " + it.kidungNo)}" dari kumpulan "${col.name}"?\n\nTindakan ini tidak bisa dibatalkan.`)) return;
          const removed = removeKidungGroupFromCollection(username, sel.value, it.buku, it.kidungNo);
          if (removed > 0) {
            activePlaylist = null;
            renderCollectionSelect();
          }
        });
      }
      // "🗑️ Hapus Semua N Halaman Ini" -- hapus SEMUA halaman berkas PDF/
      // gambar yang sama sekaligus (permintaan operator: dulu bisa, lalu
      // hilang -- lihat removeMediaGroupFromCollection(), js/collections.js).
      const mediaGroupBtn = row.querySelector('[data-del="mediagroup"]');
      if (mediaGroupBtn) {
        mediaGroupBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (!confirm(`Hapus SEMUA ${mediaGroupN} halaman "${it.name || "berkas ini"}" dari kumpulan "${col.name}"?\n\nTindakan ini tidak bisa dibatalkan.`)) return;
          const removed = removeMediaGroupFromCollection(username, sel.value, it.mediaItemId);
          if (removed > 0) {
            activePlaylist = null;
            renderCollectionSelect();
          }
        });
      }
      if (reorderOn) {
        row.querySelectorAll("[data-mv]").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            let changed = false;
            if (btn.dataset.mv === "top") changed = moveItemToStart(username, sel.value, i);
            else if (btn.dataset.mv === "up") changed = moveItemInCollection(username, sel.value, i, -1);
            else if (btn.dataset.mv === "down") changed = moveItemInCollection(username, sel.value, i, 1);
            else if (btn.dataset.mv === "bottom") changed = moveItemToEnd(username, sel.value, i);
            if (changed) {
              // Urutan berubah -> playlist aktif (kalau sedang menunjuk
              // ke kumpulan ini) direset supaya tidak nyasar ke index
              // lama yang sekarang menunjuk item berbeda -- operator
              // tinggal klik salah satu baris lagi untuk melanjutkan
              // dengan panah/clicker dari situ.
              activePlaylist = null;
              renderCollectionSelect();
            }
          });
        });
      }
      wrap.appendChild(row);
    });
    highlightActivePlaylistRow();
  }

  // Tombol "✎ Atur Urutan" di atas daftar Kumpulan Ayat -- cuma
  // menyalakan/mematikan tampilnya tombol mini ⏮️⬆️⬇️⏭️ (lihat
  // renderCollectionList() di atas), TIDAK mengubah data apa pun sendiri.
  function wireCollectionReorderToggle() {
    const btn = el("psCollectionReorderToggle");
    if (!btn) return;
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
      renderCollectionList();
    });
  }

  // BARU (28 Agu 2026) -- tombol "＋ Buat Baru" di panel Kumpulan Ayat:
  // buka dialog nama yang sama dipakai jalur lama (promptCollectionName(),
  // dengan daftar nama terbaru sebagai chip), lalu buat kumpulan KOSONG
  // lewat createEmptyCollection() (js/collections.js) -- TANPA perlu
  // menambah 1 item dulu lewat tab lain. Kumpulan baru langsung dipilih
  // di dropdown & naik ke paling atas (diurutkan terbaru-dulu, lihat
  // renderCollectionSelect() di atas).
  function wireCollectionNewButton() {
    const btn = el("psCollectionNewBtn");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      const username = typeof currentUser !== "undefined" ? currentUser : null;
      if (typeof promptCollectionName !== "function" || typeof createEmptyCollection !== "function") return;
      const name = await promptCollectionName(username, "");
      if (!name) return;
      const id = createEmptyCollection(username, name);
      if (!id) return;
      renderCollectionSelect();
      const sel = el("psCollectionSelect");
      if (sel) sel.value = id; // langsung pilih kumpulan baru ini
      renderCollectionList();
    });
  }

  // Tombol "🔗 Bagikan" -- membagikan SALINAN kumpulan yang sedang
  // dipilih di dropdown ke akun pengguna lain (mengetik username lewat
  // prompt() sederhana di sini -- panel Kumpulan Ayat biasa di js/app.js
  // punya dialog yang lebih rapi kalau operator sempat pindah ke situ,
  // tapi supaya tetap bisa langsung dari Studio tanpa pindah tab, di sini
  // cukup prompt() saja). Lihat shareCollectionToUser() di js/collections.js.
  function wireCollectionShareButton() {
    const btn = el("psCollectionShareBtn");
    const sel = el("psCollectionSelect");
    if (!btn || !sel) return;
    btn.addEventListener("click", async () => {
      if (!sel.value) { alert("Pilih dulu Kumpulan Ayat yang mau dibagikan."); return; }
      if (typeof Sync === "undefined" || !Sync.enabled()) {
        alert("Berbagi ke pengguna lain butuh sambungan ke server -- sinkronisasi belum aktif.");
        return;
      }
      const target = prompt("Username tujuan (kumpulan ini akan disalin + tema Layar Proyeksi yang sedang dipakai ikut disertakan):");
      if (!target || !target.trim()) return;
      const username = typeof currentUser !== "undefined" ? currentUser : null;
      const collections = loadCollections(username);
      const col = collections[sel.value];
      const res = await shareCollectionToUser(username, sel.value, target.trim());
      if (res && res.ok) alert(`Kumpulan "${col ? col.name : sel.value}" berhasil dibagikan ke "${target.trim()}".`);
      else alert("Gagal membagikan: " + ((res && res.error) || "Terjadi kesalahan tidak dikenal."));
    });
  }

  // ------------------------------------------------------------
  // BARU (4 Sep 2026 v3, permintaan operator) -- dialog konfirmasi
  // kustom untuk tindakan yang TIDAK BISA DIBATALKAN (mis. hapus
  // seluruh kumpulan) -- BUKAN confirm() bawaan browser, supaya:
  // 1. Tombolnya jelas "Ya, Hapus" vs "Tidak, Batalkan" (bukan OK/
  //    Cancel yang ambigu), dan
  // 2. Tombol "Tidak, Batalkan" yang jadi PILIHAN DEFAULT (mendapat
  //    fokus begitu dialog terbuka) -- kalau operator tidak sengaja
  //    menekan Enter/Spasi (mis. jari masih di keyboard bekas mengetik
  //    sesuatu), yang ke-klik adalah BATAL, bukan HAPUS.
  // Mengembalikan Promise<boolean> (true = operator menekan "Ya, Hapus").
  // ------------------------------------------------------------
  function confirmDangerAction(title, message, confirmLabel) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "simple-dialog-overlay";
      const box = document.createElement("div");
      box.className = "simple-dialog-box";
      const h = document.createElement("h3");
      h.textContent = title;
      box.appendChild(h);
      const p = document.createElement("p");
      p.className = "simple-dialog-hint";
      p.textContent = message;
      box.appendChild(p);
      const actions = document.createElement("div");
      actions.className = "simple-dialog-actions";
      const noBtn = document.createElement("button");
      noBtn.type = "button";
      noBtn.className = "chip-btn small";
      noBtn.textContent = "Tidak, Batalkan";
      const yesBtn = document.createElement("button");
      yesBtn.type = "button";
      yesBtn.className = "chip-btn small danger";
      yesBtn.textContent = confirmLabel || "Ya, Hapus";
      actions.appendChild(noBtn);
      actions.appendChild(yesBtn);
      box.appendChild(actions);
      overlay.appendChild(box);
      function cleanup(result) {
        overlay.remove();
        document.removeEventListener("keydown", onKeydown);
        resolve(result);
      }
      function onKeydown(e) {
        if (e.key === "Escape") cleanup(false);
        // SENGAJA Enter TIDAK dipetakan ke "Ya, Hapus" di sini -- fokus
        // sudah ada di tombol "Tidak, Batalkan" (lihat noBtn.focus() di
        // bawah), jadi Enter bawaan browser pada tombol yang fokus itu
        // sendiri yang menjalankan pembatalan -- tidak perlu ditangani
        // manual, dan tidak ada jalan Enter "meloncat" ke Hapus.
      }
      noBtn.addEventListener("click", () => cleanup(false));
      yesBtn.addEventListener("click", () => cleanup(true));
      overlay.addEventListener("click", (e) => { if (e.target === overlay) cleanup(false); });
      document.addEventListener("keydown", onKeydown);
      document.body.appendChild(overlay);
      // Default fokus ke "Tidak, Batalkan" -- lihat catatan panjang di atas.
      setTimeout(() => noBtn.focus(), 30);
    });
  }

  // Tombol "🗑️ Hapus Master" -- menghapus SELURUH kumpulan yang sedang
  // dipilih di dropdown (semua item di dalamnya sekaligus), BEDA dari
  // "🗑️ Hapus Item Ini" per baris (yang cuma hapus 1 item). Dipakai
  // kalau operator mau bersihkan/buang total 1 kumpulan (mis. sudah
  // lewat acaranya & tidak dipakai lagi).
  function wireCollectionDeleteAllButton() {
    const btn = el("psCollectionDeleteAllBtn");
    const sel = el("psCollectionSelect");
    if (!btn || !sel) return;
    btn.addEventListener("click", async () => {
      if (!sel.value || typeof loadCollections !== "function" || typeof deleteCollection !== "function") {
        alert("Pilih dulu Kumpulan Ayat yang mau dihapus.");
        return;
      }
      const username = typeof currentUser !== "undefined" ? currentUser : null;
      const collections = loadCollections(username);
      const col = collections[sel.value];
      if (!col) return;
      const n = (col.items || col.verseIds || []).length;
      const ok = await confirmDangerAction(
        "Hapus Seluruh Kumpulan?",
        `Kumpulan "${col.name}" beserta SEMUA ${n} item/slide di dalamnya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`,
        "Ya, Hapus Semua"
      );
      if (!ok) return;
      deleteCollection(username, sel.value);
      activePlaylist = null;
      renderCollectionSelect();
    });
  }

  // ------------------------------------------------------------
  // "Playlist aktif" -- dipakai BERSAMA oleh daftar Kumpulan Ayat (di
  // atas) & daftar slide Kidung (wireKidungTab() di bawah), supaya
  // panah kiri/kanan papan ketik ATAU clicker/stylus presentasi nirkabel
  // (yang meniru tombol panah, lihat catatan yang sama di
  // openCollectionFullscreen() js/app.js) selalu menggerakkan APA SAJA
  // yang TERAKHIR diklik operator -- dari item pertama yang ditampilkan
  // sampai yang terakhir, dan bisa kembali (mundur) dengan sempurna.
  // Item generik yang sama ({type, ...}) dipakai di kedua sumber ini,
  // jadi 1 mesin kirim (sendGenericItemLive) cukup untuk keduanya.
  // ------------------------------------------------------------
  let activePlaylist = null; // { items: [...item generik...], index, label }

  function setActivePlaylist(items, index, label) {
    activePlaylist = { items: items || [], index: index || 0, label: label || "" };
    highlightActivePlaylistRow();
    pushMonitorStatus_();
  }
  // BARU (10 Sep 2026, sesi ke-10, "Monitor 3 -- Monitor Pembicara") --
  // diambil jadi 1 fungsi terpisah supaya bisa dipanggil dari SEMUA
  // jalur perpindahan item aktif: setActivePlaylist() (klik baris
  // pertama kali/AI Presentation) MAUPUN playlistGoTo() (panah/clicker,
  // yang mengubah activePlaylist.index LANGSUNG tanpa lewat
  // setActivePlaylist() lagi -- lihat playlistGoTo() di bawah). `next`
  // sengaja null kalau item aktif adalah yang TERAKHIR di daftar -- itu
  // yang membuat monitor.html menampilkan layar hitam "END OF SLIDE".
  // DIPERBAIKI (10 Sep 2026, lanjutan, permintaan operator "apa bisa
  // dituliskan isinya... apalagi kalau selanjutnya adalah gambar") --
  // sebelumnya HANYA mengirim ref/judul (mis. "1 Tawarikh 16:34"), jadi
  // pembicara tidak tahu ISI ayat/syairnya tanpa membuka Alkitab sendiri
  // -- sekarang IKUT dikirim isi lengkapnya lewat genericItemBodyText()
  // (fungsi yang SAMA dipakai panel Kumpulan Ayat biasa, lihat
  // collectionItemBodyText() js/app.js) supaya konsisten. Untuk item
  // yang BUKAN teks (gambar/PDF/Canva/SoundCloud/peta/dst),
  // genericItemBodyText() sudah otomatis mengembalikan keterangan jenis
  // berkasnya (mis. "(berkas PDF/gambar -- tayangkan lewat Studio
  // Presentasi)") -- itu sendiri sudah cukup memberi tahu pembicara
  // "selanjutnya bukan teks, melainkan gambar/dst", tanpa perlu logic
  // baru terpisah.
  function pushMonitorStatus_() {
    if (typeof Presentation === "undefined" || !Presentation.postMonitorStatus || !activePlaylist) return;
    const cur = activePlaylist.items[activePlaylist.index];
    const nxt = activePlaylist.items[activePlaylist.index + 1];
    let curLabel = "", nxtLabel = null, curBody = "", nxtBody = "";
    try { curLabel = cur ? genericItemRefText(cur) : ""; } catch (e) {}
    try { nxtLabel = nxt ? genericItemRefText(nxt) : null; } catch (e) {}
    try { curBody = cur ? genericItemBodyText(cur) : ""; } catch (e) {}
    try { nxtBody = nxt ? genericItemBodyText(nxt) : ""; } catch (e) {}
    Presentation.postMonitorStatus(curLabel, nxtLabel, curBody, nxtBody);
  }

  function highlightActivePlaylistRow() {
    document.querySelectorAll("#psCollectionList .ps-verse-row.active, #psKidungSlideList .ps-verse-row.active")
      .forEach((r) => r.classList.remove("active"));
    if (!activePlaylist) return;
    const rowEl = document.querySelector(
      `#psCollectionList [data-playlist-idx="${activePlaylist.index}"], #psKidungSlideList [data-playlist-idx="${activePlaylist.index}"]`
    );
    if (rowEl) rowEl.classList.add("active");
  }

  // Ambil ref/teks 1 item generik lewat fungsi yang SAMA dipakai panel
  // Kumpulan Ayat biasa (js/app.js: collectionItemRef/collectionItemBodyText)
  // -- supaya format tampilannya (termasuk kidung: nomor+judul, bait+koor)
  // selalu konsisten di mana pun item itu muncul, tidak perlu logic ganda.
  function genericItemRefText(it) {
    return typeof collectionItemRef === "function" ? collectionItemRef(it) : (it && it.type) || "";
  }
  function genericItemBodyText(it) {
    return typeof collectionItemBodyText === "function" ? collectionItemBodyText(it) : "";
  }

  // BARU (4 Sep 2026) -- susun baris kecil "Pengarang Birama (N Bait)" di
  // bawah judul kidung (mis. "Witness Lee B 4/4 (7 Bait)", meniru mockup
  // yang diminta operator) -- dipakai baik oleh pratinjau Studio
  // (renderStudioPreview) MAUPUN dikirim ke Layar 2 lewat sendKidungSlide()
  // di bawah (present.html menyusun ulang dari field pengarang/birama/
  // jumlahBait, tapi kita pakai fungsi yang SAMA di sini supaya
  // pratinjau selalu 1:1 sama persis). Bagian yang kosong (mis. birama
  // belum diisi di Sheet) otomatis dilewati, tidak ada spasi ganda aneh.
  function kidungSubLine(pengarang, birama, jumlahBait) {
    let s = "";
    if (pengarang && String(pengarang).trim()) s += String(pengarang).trim();
    if (birama && String(birama).trim()) s += (s ? " " : "") + String(birama).trim();
    if (jumlahBait) s += (s ? " " : "") + "(" + jumlahBait + " Bait)";
    return s;
  }

  // Kirim 1 item generik ke Layar 2 SEKARANG JUGA (live langsung, TIDAK
  // lewat antrean "Berikutnya" -- lihat stageOrSend() di atas, yang
  // TETAP dipakai apa adanya oleh Ayat Cepat/File/YouTube, tidak
  // disentuh). Dipakai baik oleh klik daftar (mouse) maupun panah/
  // clicker (wirePlaylistKeyNav()) supaya klik pertama & navigasi
  // sesudahnya selalu terasa 1 alur yang sama, bukan 2 perilaku beda.
  function sendGenericItemLive(it) {
    if (!it || typeof Presentation === "undefined") return;
    if (it.type === "verse") {
      const v = typeof verseById !== "undefined" ? verseById[it.verseId] : null;
      if (v) Presentation.sendVerse(v, v.bookName);
      renderStudioPreview({ type: "verse", ref: genericItemRefText(it), texts: [{ label: "", text: v ? v.text : "" }] });
      clearMonitorVideo_(); // ayat bukan video -- sembunyikan area video Monitor 3
    } else if (it.type === "text") {
      Presentation.sendFreeText(it.text || "");
      renderStudioPreview({ type: "text", text: it.text || "" });
      clearMonitorVideo_();
    } else if (it.type === "announcement") {
      const txt = (it.title ? it.title + "\n\n" : "") + (it.text || "");
      Presentation.sendFreeText(txt);
      renderStudioPreview({ type: "text", text: txt });
      clearMonitorVideo_();
    } else if (it.type === "kidung") {
      sendKidungSlide(it);
    } else if (it.type === "media") {
      sendMediaSlideFromCollection(it);
    } else if (it.type === "canva") {
      sendCanvaSlide(it);
    } else if (it.type === "soundcloud") {
      sendSoundCloudSlide(it);
    } else if (it.type === "youtube_link") {
      // BARU (5 Sep 2026) -- item YouTube portabel yang ditambahkan dari
      // panel Kumpulan Ayat biasa/HP (addYoutubeLinkToCollection(),
      // js/collections.js) -- `embedUrl` sudah tersimpan langsung di
      // item, tinggal kirim persis seperti video YouTube lain (pola sama
      // dengan cabang it.type==="media" untuk youtube di
      // sendMediaSlideFromCollection(), cuma tanpa perlu lookup Media
      // Tersimpan sama sekali).
      rawPost({ type: "youtube", embedUrl: it.embedUrl });
      renderStudioPreview({ type: "youtube", embedUrl: it.embedUrl });
    } else if (it.type === "modescreen") {
      // BARU (9 Sep 2026) -- item "🖥️ Mode Layar" (Welcome/Next Up)
      // yang diselipkan ke Kumpulan Ayat, mis. sebelum sesi ke-2,
      // operator taruh "Next Up" di antara ayat-ayat. Payload item
      // SUDAH persis bentuk yang dipahami showModeScreen() di
      // present.html -- lihat addModeScreenToCollection() (js/collections.js).
      rawPost({ type: "modescreen", kind: it.kind, title: it.title, subtitle: it.subtitle, bullets: it.bullets, nextLabel: it.nextLabel || "", endAt: it.endAt || null });
      renderStudioPreview({ type: "modescreen", kind: it.kind, title: it.title });
    } else if (it.type === "map") {
      // BARU (9 Sep 2026) -- item "🗺️ Peta" yang diselipkan ke
      // Kumpulan Ayat -- menyimpan REFERENSI ke peta (mapId), gambar &
      // pin-nya diambil dari Map Library (localStorage, lihat
      // wireMapTab()) saat ditayangkan, pola sama seperti item "media"
      // di atas (referensi, bukan salinan).
      const map = (typeof getStoredMapById === "function") ? getStoredMapById(it.mapId) : null;
      if (map && map.imageDataUrl) {
        const pins = (typeof visibleMapPins_ === "function") ? visibleMapPins_(map) : (map.pins || []);
        const categoryCounts = {};
        pins.forEach((p) => { if (p.category) categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1; });
        rawPost({ type: "map", action: "show", imageUrl: effectiveMapImage_(map), pinStyle: map.pinStyle || "flat", pins, categoryCounts, nationalPopulation: map.nationalPopulation || null });
        map.everShown = true; // lihat catatan panjang di listener psMapPinStyleSelect di atas
        renderStudioPreview({ type: "map" });
      }
    }
  }

  // BARU (4 Sep 2026) -- kirim item Canva/SoundCloud dari Kumpulan Ayat
  // ke Layar 2 SEKARANG JUGA, pola sama seperti sendKidungSlide() di
  // bawah (rawPost langsung, karena "canva"/"soundcloud" BUKAN tipe
  // overlay -- lihat OVERLAY_TYPES di js/presentation.js -- jadi
  // Presentation.postRaw() otomatis membuka Layar 2 kalau belum
  // terbuka & menyimpannya sebagai `lastPayload`).
  function sendCanvaSlide(it) {
    if (!it || !it.embedUrl) return;
    rawPost({ type: "canva", embedUrl: it.embedUrl });
    renderStudioPreview({ type: "canva", embedUrl: it.embedUrl, title: it.title });
  }
  function sendSoundCloudSlide(it) {
    if (!it || !it.trackUrl) return;
    rawPost({ type: "soundcloud", trackUrl: it.trackUrl });
    renderStudioPreview({ type: "soundcloud", trackUrl: it.trackUrl, title: it.title });
  }

  // BARU (27 Agu 2026) -- lihat addMediaToCollection() (js/collections.js)
  // untuk alasan kenapa item "media" cuma simpan REFERENSI (mediaItemId +
  // pageIndex), bukan salinan gambarnya -- jadi di sinilah, saat mau
  // ditayangkan, gambar aslinya baru diambil dari Media Tersimpan
  // (loadMediaItems(), IndexedDB). ASYNC (beda dari cabang lain di
  // sendGenericItemLive yang semuanya sinkron) -- tidak masalah, semua
  // pemanggil (klik baris, playlistGoTo/panah-clicker) tidak menunggu
  // nilai baliknya sama sekali.
  async function sendMediaSlideFromCollection(it) {
    if (typeof loadMediaItems !== "function" || typeof Presentation === "undefined") return;
    const username = typeof currentUser !== "undefined" ? currentUser : null;
    const items = await loadMediaItems(username);
    const found = items.find((m) => m.id === it.mediaItemId);
    if (!found || !found.images || !found.images.length) {
      alert(`"${it.name || "Berkas ini"}" sudah tidak ada lagi di Media Tersimpan (mungkin terhapus) -- tidak bisa ditayangkan. Hapus item ini dari Kumpulan Ayat lalu tambahkan ulang dari Media Tersimpan yang masih ada.`);
      return;
    }
    const url = found.images[Math.min(it.pageIndex || 0, found.images.length - 1)];
    // PERBAIKAN (28 Agu 2026) -- sebelum ini SELALU dikirim sebagai
    // {type:"slide", imageUrl}, padahal untuk item Media Tersimpan
    // bertipe "youtube" isi `images` adalah embed-URL video, BUKAN URL
    // gambar -- akibatnya video YouTube yang ditambahkan ke Kumpulan
    // Ayat (lihat addMediaToCollection(), sekarang juga bisa dipakai
    // untuk video lewat tombol "➕ Kumpulan" di Media Tersimpan &
    // Playlist Video) gagal tayang (Layar 2 mencoba menampilkannya
    // sebagai <img>). Sekarang dicek dulu jenis aslinya.
    if (found.type === "youtube") {
      rawPost({ type: "youtube", embedUrl: url });
      renderStudioPreview({ type: "youtube", embedUrl: url });
    } else {
      rawPost({ type: "slide", imageUrl: url });
      renderStudioPreview({ type: "slide", imageUrl: url });
    }
  }

  function sendKidungSlide(it) {
    if (typeof Presentation === "undefined" || !Presentation.sendKidung) return;
    // BARU (4 Sep 2026) -- pengarang/birama/jumlahBait diteruskan apa
    // adanya (kosong kalau memang tidak ada di item, mis. item lama dari
    // Kumpulan Ayat yang disimpan sebelum kolom ini ada) -- present.html
    // sendiri yang menyusun baris kecilnya & melewati bagian yang kosong.
    const payload = {
      ref: genericItemRefText(it), bait: it.bait || [], koorTeks: it.koorTeks || null,
      pengarang: it.pengarang || "", birama: it.birama || "", jumlahBait: it.jumlahBait || 0,
    };
    Presentation.sendKidung(payload);
    renderStudioPreview(Object.assign({ type: "kidung" }, payload));
    clearMonitorVideo_(); // kidung bukan video -- sembunyikan area video Monitor 3
  }

  function playlistGoTo(idx) {
    if (!activePlaylist) return;
    const items = activePlaylist.items;
    if (idx < 0 || idx >= items.length) return;
    activePlaylist.index = idx;
    sendGenericItemLive(items[idx]);
    highlightActivePlaylistRow();
    pushMonitorStatus_(); // BARU (10 Sep 2026, sesi ke-10) -- lihat catatan di pushMonitorStatus_()
  }
  function playlistNext() { if (activePlaylist) playlistGoTo(activePlaylist.index + 1); }
  function playlistPrev() { if (activePlaylist) playlistGoTo(activePlaylist.index - 1); }

  // Panah kiri/kanan papan ketik (dan Page Up/Down -- sebagian
  // clicker/stylus presentasi meniru tombol ini alih-alih panah, sama
  // seperti catatan di openCollectionFullscreen() js/app.js) HANYA aktif
  // selagi Studio terbuka & sudah ada playlist aktif, dan TIDAK dipakai
  // saat fokus sedang di kotak isian (select/input/textarea) supaya
  // tidak mengganggu pemakaian normal kotak itu.
  function wirePlaylistKeyNav() {
    document.addEventListener("keydown", (e) => {
      if (!activePlaylist) return;
      const studio = el("presentStudio");
      if (!studio || studio.hidden) return;
      const tag = (document.activeElement && document.activeElement.tagName) || "";
      if (tag === "SELECT" || tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); playlistNext(); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); playlistPrev(); }
    });
  }

  // ------------------------------------------------------------
  // Tab "🎵 Kidung / Hymn" (tengah) -- tersambung ke sumber data Kidung
  // yang SAMA dengan menu Kidung biasa (js/kidung.js: getKidungBooksOrdered/
  // getKidungList/openKidungByKeypad/splitKidungIntoSlides). Operator
  // cari nomor/judul, pilih mode pemecah slide, lalu per-slide bisa
  // "▶️ Tayangkan" (langsung live + jadi playlist aktif utk panah/
  // clicker) atau "➕ Daftar" (simpan ke Kumpulan Ayat lewat
  // addKidungToCollection() di js/collections.js).
  // ------------------------------------------------------------
  function wireKidungTab() {
    const bookToggleWrap = el("psKidungBookToggle");
    const noInput = el("psKidungNoInput");
    const goBtn = el("psKidungGoBtn");
    const searchInput = el("psKidungSearchInput");
    const resultsWrap = el("psKidungSearchResults");
    const detailWrap = el("psKidungDetail");
    const detailTitle = el("psKidungDetailTitle");
    const backBtn = el("psKidungBackBtn");
    const modeSelect = el("psKidungModeSelect");
    const slideListWrap = el("psKidungSlideList");
    const addAllBtn = el("psKidungAddAllBtn");
    if (!bookToggleWrap || typeof getKidungBooksOrdered !== "function") return;

    let currentBuku = "Kidung";
    let currentMeta = null; // { buku, noKidung, judul, ... } dari getKidungList()
    let currentBaits = [];  // getKidungBaitsWithKoor()
    let currentSlides = []; // splitKidungIntoSlides()

    async function renderBookToggle() {
      const books = await getKidungBooksOrdered();
      const list = books.length ? books : ["Kidung"];
      bookToggleWrap.innerHTML = list.map((b) =>
        `<button type="button" class="kidung-book-toggle-btn${b === currentBuku ? " active" : ""}" data-buku="${escapeHtml(b)}">${escapeHtml(b)}</button>`
      ).join("");
      bookToggleWrap.querySelectorAll(".kidung-book-toggle-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          currentBuku = btn.dataset.buku;
          renderBookToggle();
          renderSearchResults(searchInput ? searchInput.value : "");
        });
      });
    }

    async function renderSearchResults(query) {
      if (!resultsWrap || typeof getKidungList !== "function") return;
      const q = (query || "").trim().toLowerCase();
      const list = await getKidungList(currentBuku);
      const filtered = q ? list.filter((k) => String(k.noKidung).includes(q) || (k.judul || "").toLowerCase().includes(q)) : list;
      resultsWrap.innerHTML = filtered.length
        ? filtered.slice(0, 60).map((k) => `<button type="button" class="kidung-list-item" data-no="${escapeHtml(k.noKidung)}">${escapeHtml(typeof formatKidungNo === "function" ? formatKidungNo(k.buku, k.noKidung) : k.noKidung)} — ${escapeHtml(k.judul || "")}</button>`).join("")
        : '<p class="present-saved-empty">Tidak ada kidung yang cocok.</p>';
      resultsWrap.querySelectorAll(".kidung-list-item").forEach((btn) => {
        btn.addEventListener("click", () => openKidung(currentBuku, btn.dataset.no));
      });
    }

    async function openKidung(buku, no) {
      const result = typeof openKidungByKeypad === "function" ? await openKidungByKeypad(buku, no) : null;
      if (!result) { alert(`Kidung No. ${no} tidak ditemukan di buku ${buku}.`); return; }
      currentMeta = Object.assign({ buku }, result.meta || { buku, noKidung: no, judul: "" });
      currentBaits = result.baits || [];
      if (detailWrap) detailWrap.hidden = false;
      if (detailTitle) detailTitle.textContent = `${typeof formatKidungNo === "function" ? formatKidungNo(currentMeta.buku, currentMeta.noKidung) : currentMeta.noKidung} — ${currentMeta.judul || ""}`;
      renderSlides();
    }

    function renderSlides() {
      if (!slideListWrap) return;
      if (!currentBaits.length) {
        slideListWrap.innerHTML = '<p class="present-saved-empty">Kidung ini belum ada syairnya.</p>';
        currentSlides = [];
        return;
      }
      currentSlides = typeof splitKidungIntoSlides === "function" ? splitKidungIntoSlides(currentBaits, modeSelect ? modeSelect.value : "1+koor") : [];
      if (!currentSlides.length) {
        slideListWrap.innerHTML = '<p class="present-saved-empty">Tidak ada slide untuk mode ini.</p>';
        return;
      }
      // Slide-slide hasil pemecahan ini SEKALIGUS jadi "item generik"
      // (bentuk yang sama seperti item kumpulan) -- dipakai langsung
      // sebagai playlist aktif saat salah satunya ditayangkan, TANPA
      // perlu disimpan ke Kumpulan Ayat dulu.
      const genericItems = currentSlides.map((s) => ({
        type: "kidung",
        buku: currentMeta.buku,
        kidungNo: currentMeta.noKidung,
        title: currentMeta.judul,
        ikon: currentMeta.ikon || "",
        bait: s.baits,
        koorTeks: s.koorTeks,
        // BARU (4 Sep 2026) -- pengarang/birama/jumlahBait ikut disimpan di
        // sini (sudah tersedia di currentMeta lewat getKidungList(), lihat
        // js/kidung.js) supaya bisa ditampilkan sebagai baris kecil kedua
        // ("Witness Lee B 4/4 (7 Bait)") di bawah judul kidung di Layar 2 --
        // lihat sendKidungSlide() di bawah & showMain() kind "kidung" di
        // present.html. Kosong ("") kalau memang belum diisi di Sheet,
        // supaya tidak ada baris aneh nempel (present.html melewatinya).
        pengarang: currentMeta.pengarang || "",
        birama: currentMeta.birama || "",
        jumlahBait: currentMeta.jumlahBait || 0,
      }));
      slideListWrap.innerHTML = "";
      currentSlides.forEach((slide, i) => {
        const label = slide.onlyKoor ? "Koor" : slide.baits.map((b) => b.noBait || "?").join(",");
        const snippet = (slide.baits.length ? slide.baits[0].teks : slide.koorTeks || "").slice(0, 60);
        const row = document.createElement("div");
        row.className = "ps-verse-row";
        row.dataset.playlistIdx = String(i);
        row.innerHTML = `<span class="ps-verse-ref">Bait ${escapeHtml(String(label))}</span><span class="ps-verse-snippet">${escapeHtml(snippet)}</span>
          <div class="ps-btn-row ps-kidung-slide-actions">
            <button type="button" class="chip-btn small" data-act="show">▶️ Tayangkan</button>
            <button type="button" class="chip-btn small" data-act="preview">👁️ Pratinjau</button>
            <button type="button" class="chip-btn small" data-act="add">➕ Daftar</button>
          </div>`;
        // "▶️ Tayangkan" -- SELALU langsung live ke Layar 2 SEKARANG JUGA
        // (perilaku LAMA, tidak diubah).
        row.querySelector('[data-act="show"]').addEventListener("click", () => {
          setActivePlaylist(genericItems, i, detailTitle ? detailTitle.textContent : "");
          sendGenericItemLive(genericItems[i]);
        });
        // BARU (4 Sep 2026, permintaan operator) -- "👁️ Pratinjau" TIDAK
        // langsung tayang, cuma menaruh slide ini "standby" di kotak
        // "Berikutnya" (stageNext(), lihat juga renderNextPreview() yang
        // sekarang ikut menampilkan kotak itu walau bukan mode dual
        // monitor) -- operator lihat dulu isinya, baru tekan "▶ Tayangkan"
        // di kotak "Berikutnya" itu kalau memang sudah siap.
        row.querySelector('[data-act="preview"]').addEventListener("click", () => {
          const it = genericItems[i];
          stageNext(genericItemRefText(it), genericItemBodyText(it), () => {
            setActivePlaylist(genericItems, i, detailTitle ? detailTitle.textContent : "");
            sendGenericItemLive(it);
          });
        });
        row.querySelector('[data-act="add"]').addEventListener("click", async () => {
          await addSlideToCollection(genericItems[i]);
        });
        slideListWrap.appendChild(row);
      });
      highlightActivePlaylistRow();
    }

    async function addSlideToCollection(genericItem) {
      if (typeof addKidungToCollection !== "function") return;
      const sel = el("psCollectionSelect");
      const username = typeof currentUser !== "undefined" ? currentUser : null;
      const name = (sel && sel.value && loadCollections(username)[sel.value]) ? loadCollections(username)[sel.value].name : await promptCollectionName(username);
      if (!name) return;
      addKidungToCollection(username, name, genericItem);
      renderCollectionSelect();
    }

    if (backBtn) backBtn.addEventListener("click", () => { if (detailWrap) detailWrap.hidden = true; });
    if (goBtn) goBtn.addEventListener("click", () => { if (noInput && noInput.value.trim()) openKidung(currentBuku, noInput.value.trim()); });
    if (noInput) noInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); goBtn.click(); } });
    if (searchInput) searchInput.addEventListener("input", () => renderSearchResults(searchInput.value));
    if (modeSelect) modeSelect.addEventListener("change", renderSlides);
    if (addAllBtn) {
      addAllBtn.addEventListener("click", async () => {
        if (!currentMeta || !currentSlides.length) return;
        const sel = el("psCollectionSelect");
        const username = typeof currentUser !== "undefined" ? currentUser : null;
        const name = (sel && sel.value && loadCollections(username)[sel.value]) ? loadCollections(username)[sel.value].name : await promptCollectionName(username);
        if (!name) return;
        currentSlides.forEach((slide) => {
          addKidungToCollection(username, name, {
            buku: currentMeta.buku, kidungNo: currentMeta.noKidung, title: currentMeta.judul,
            ikon: currentMeta.ikon || "", bait: slide.baits, koorTeks: slide.koorTeks,
          });
        });
        renderCollectionSelect();
      });
    }

    renderBookToggle();
    renderSearchResults("");
  }

  // ------------------------------------------------------------
  // Media Tersimpan (kiri) -- file (gambar/PDF-jadi-gambar) yang
  // ditekan "➕ Daftar" di tab File (tengah). Lokal per perangkat,
  // lihat addMediaItem()/loadMediaItems() di js/collections.js.
  // Tayang sama seperti tab File: 1 monitor langsung tayang, dual
  // monitor diantre dulu (stageOrSend), dan ◀ ▶ pindah halaman/slide.
  // ------------------------------------------------------------
  // ------------------------------------------------------------
  // BARU -- indikator "⏳N" di tab "🖼️ Media Tersimpan" (lihat CSS
  // .ps-tab-badge di css/style.css) supaya operator tahu ada berkas
  // yang masih menunggu sinkron ke Drive TANPA harus membuka tab itu
  // dulu. Aman dipanggil kapan pun/berkali-kali -- no-op kalau elemen
  // badge-nya belum ada di DOM (mis. dipanggil sebelum Studio dibuka).
  async function updateMediaQueueBadge(username) {
    const badge = el("psMediaQueueBadge");
    if (!badge || typeof LocalDB === "undefined") return;
    try {
      const queued = await LocalDB.getQueuedMediaUploadsByUsername(username || "guest");
      if (queued && queued.length) {
        badge.textContent = "⏳" + queued.length;
        badge.hidden = false;
      } else {
        badge.hidden = true;
      }
    } catch (e) {
      badge.hidden = true;
    }
  }

  // ------------------------------------------------------------
  // BARU (27 Agu 2026) -- lihat catatan di titik pemanggilannya
  // (renderMediaList() di bawah). Pola SAMA seperti
  // renderPendingSharesInto() di js/app.js (kartu 🔔 untuk 🔗 Bagikan
  // Kumpulan Ayat) -- `wrap` diisi ulang tiap dipanggil supaya kartu
  // yang sudah diputuskan (Setujui/Tolak) langsung hilang tanpa perlu
  // buka-tutup panel.
  async function renderPendingMediaDeleteRequestsInto(wrap, username) {
    if (typeof checkPendingMediaDeleteRequests !== "function") return;
    const requests = await checkPendingMediaDeleteRequests(username);
    if (!requests || !requests.length) return;
    const box = document.createElement("div");
    box.className = "collection-pending-box";
    const h = document.createElement("h3");
    h.className = "collection-pending-title";
    h.textContent = `🔔 ${requests.length} Permintaan Hapus Media Menunggu Persetujuan Anda`;
    box.appendChild(h);
    requests.forEach((req) => {
      const card = document.createElement("div");
      card.className = "collection-pending-card";
      const info = document.createElement("span");
      info.className = "collection-pending-info";
      info.innerHTML = `<b>${escapeHtml(req.fileName || "(berkas tanpa nama)")}</b><br>diminta hapus PERMANEN oleh <b>${escapeHtml(req.requestedBy)}</b>${req.reason ? `<br><em>Alasan: ${escapeHtml(req.reason)}</em>` : ""}`;
      card.appendChild(info);
      const btnRow = document.createElement("span");
      btnRow.className = "collection-pending-actions";
      const approveBtn = document.createElement("button");
      approveBtn.type = "button";
      approveBtn.className = "chip-btn small danger";
      approveBtn.textContent = "✅ Setujui (hapus permanen)";
      approveBtn.addEventListener("click", async () => {
        if (!confirm(`Yakin menyetujui penghapusan PERMANEN "${req.fileName}" dari Drive? Tindakan ini TIDAK BISA dibatalkan.`)) return;
        approveBtn.disabled = true;
        const res = await respondToMediaDeleteRequest(username, req.id, true);
        if (res && res.ok) renderMediaList();
        else { alert("Gagal memproses: " + ((res && res.error) || "Terjadi kesalahan.")); approveBtn.disabled = false; }
      });
      const rejectBtn = document.createElement("button");
      rejectBtn.type = "button";
      rejectBtn.className = "chip-btn small";
      rejectBtn.textContent = "❌ Tolak";
      rejectBtn.addEventListener("click", async () => {
        rejectBtn.disabled = true;
        const res = await respondToMediaDeleteRequest(username, req.id, false);
        if (res && res.ok) renderMediaList();
        else { alert("Gagal memproses: " + ((res && res.error) || "Terjadi kesalahan.")); rejectBtn.disabled = false; }
      });
      btnRow.appendChild(approveBtn);
      btnRow.appendChild(rejectBtn);
      card.appendChild(btnRow);
      box.appendChild(card);
    });
    wrap.appendChild(box);
  }

  async function renderMediaList() {
    const wrap = el("psMediaList");
    if (!wrap || typeof loadMediaItems !== "function") return;
    if (typeof window.populateYtBgPicker === "function") window.populateYtBgPicker();
    const username = typeof currentUser !== "undefined" ? currentUser : null;
    // TAHAP 4 (ROADMAP-drive-sync.md) -- sebelum menggambar daftar, coba
    // tarik dulu metadata file Drive milik akun ini yang belum dikenal
    // perangkat ini (lihat syncMediaFromDrive(), js/collections.js).
    // Best-effort & tidak memblokir lama (cuma metadata ringan, bukan
    // isi berkas) -- kalau offline/gagal, daftar lokal tetap tampil
    // seperti biasa seolah Tahap 4 tidak ada.
    if (typeof syncMediaFromDrive === "function") await syncMediaFromDrive(username);
    // TAHAP 7 -- jaring pengaman kedua (selain event "online" yang
    // dipasang wireMediaUploadQueueAutoRetry() di js/app.js): setiap
    // kali panel ini dibuka/disegarkan, coba juga proses antrean upload
    // yang tertunda -- berguna kalau event "online" sempat tidak
    // terpasang/terlewat (mis. app baru dibuka lagi setelah sempat
    // ditutup total saat offline).
    if (typeof processMediaUploadQueue === "function") await processMediaUploadQueue(username);
    await updateMediaQueueBadge(username);
    const items = await loadMediaItems(username);
    wrap.innerHTML = "";
    // BARU (27 Agu 2026) -- kartu "🔔 Permintaan Hapus Media Menunggu
    // Persetujuan" -- muncul kalau AKUN INI adalah pengunggah pertama
    // dari 1/lebih berkas yang orang lain minta hapus permanen (lihat
    // requestDeleteMediaFromDrive()/checkPendingMediaDeleteRequests() di
    // js/collections.js). Ditaruh PALING ATAS (sebelum spanduk antrean
    // sinkron) supaya tidak terlewat -- SENGAJA dicek sebelum
    // "!items.length" di bawah, supaya tetap tampil walau daftar media
    // LOKAL akun ini kosong (mis. item aslinya sudah dihapus lokal, tapi
    // berkas Drive-nya masih ada & masih dipakai orang lain).
    await renderPendingMediaDeleteRequestsInto(wrap, username);
    if (!items.length) {
      const p = document.createElement("p");
      p.className = "present-saved-empty";
      p.textContent = "Belum ada media tersimpan.";
      wrap.appendChild(p);
      return;
    }
    // BARU (indikator antrean sinkron, lihat updateMediaQueueBadge() di
    // bawah) -- spanduk kecil di ATAS daftar Media Tersimpan kalau masih
    // ada item yang menunggu disinkronkan ke Drive, supaya operator
    // langsung tahu tanpa harus menyorot satu-per-satu nama file (status
    // "⏳ menunggu sinkron" di tiap baris tetap ada juga, ini cuma
    // ringkasannya di satu tempat). Tombol "🔄 Coba sekarang" memaksa
    // percobaan ulang seketika, tidak perlu menunggu online lagi/tab
    // ditutup-buka.
    if (typeof LocalDB !== "undefined") {
      const queued = await LocalDB.getQueuedMediaUploadsByUsername(username || "guest").catch(() => []);
      if (queued && queued.length) {
        const banner = document.createElement("div");
        banner.className = "ps-media-queue-banner";
        const offline = typeof navigator !== "undefined" && navigator.onLine === false;
        banner.innerHTML = `<span>⏳ ${queued.length} berkas menunggu disinkronkan ke Drive${offline ? " (sedang offline)" : ""} -- akan dicoba otomatis.</span>
          <button type="button" class="chip-btn small" data-act="retryqueue">🔄 Coba sekarang</button>`;
        banner.querySelector('[data-act="retryqueue"]').addEventListener("click", async (ev) => {
          ev.target.disabled = true;
          ev.target.textContent = "⏳ Mencoba…";
          await processMediaUploadQueue(username);
          renderMediaList();
        });
        wrap.appendChild(banner);
      }
    }
    items.forEach((item) => {
      let idx = 0;
      const isYt = item.type === "youtube";
      const images = item.images || [];
      const multi = images.length > 1;
      const itemWrap = document.createElement("div");
      itemWrap.className = "ps-file-item";
      const row = document.createElement("div");
      row.className = "ps-file-row";

      // TAHAP 4 -- item "stub" yang baru diketahui dari Drive tapi ISINYA
      // BELUM diunduh sama sekali (lihat syncMediaFromDrive() di
      // js/collections.js) tampil dengan baris tombol yang JAUH lebih
      // sederhana: cuma "☁️ Muat dari Drive" (mengunduh isinya on-demand,
      // lihat loadDriveMediaOnDemand() di bawah) & "✖️" hapus dari daftar
      // (TIDAK menghapus file aslinya di Drive, cuma menyembunyikan dari
      // perangkat ini). Tombol lain (▶️ tayang, ⬇️ unduh, dst) baru
      // muncul SETELAH isinya diunduh -- sama seperti item biasa.
      if (item.driveOnly && !images.length) {
        row.innerHTML = `<span class="ps-file-name">☁️ ${escapeHtml(item.name)} <em>(belum diunduh)</em></span>
          <span class="ps-file-actions">
            <button type="button" class="chip-btn small primary" data-act="loaddrive">☁️ Muat dari Drive</button>
            <button type="button" class="chip-btn small danger" data-act="del">✖️</button>
          </span>`;
        itemWrap.appendChild(row);
        const loadBtn = row.querySelector('[data-act="loaddrive"]');
        loadBtn.addEventListener("click", async () => {
          loadBtn.disabled = true;
          loadBtn.textContent = "⏳ Memuat…";
          const ok = await loadDriveMediaOnDemand(item);
          if (!ok) {
            loadBtn.disabled = false;
            loadBtn.textContent = "☁️ Muat dari Drive";
            alert("Gagal memuat berkas dari Drive (periksa sambungan internet, atau berkasnya sudah dihapus di Drive).");
            return;
          }
          renderMediaList();
        });
        row.querySelector('[data-act="del"]').addEventListener("click", async () => {
          if (!confirm(`Sembunyikan "${item.name}" dari daftar perangkat ini? (Berkas aslinya TETAP ada di Drive)`)) return;
          await removeMediaItem(username, item.id);
          renderMediaList();
        });
        wrap.appendChild(itemWrap);
        return; // lewati sisa baris tombol biasa di bawah untuk item ini
      }

      // Tombol "🔳" (grid mini-preview halaman) HANYA untuk item gambar/PDF
      // bertumpuk (bukan YouTube -- video sudah punya sub-daftar judul
      // sendiri di bawah, lihat videoLabels di bawah).
      const showGrid = multi && !isYt;
      row.innerHTML = `<span class="ps-file-name">${isYt ? "▶️ " : ""}${item.driveFileId ? "☁️ " : ""}${item.publicUrl ? "🔓 " : ""}${escapeHtml(item.name)}</span>
        <span class="ps-file-actions">
          ${multi ? `<button type="button" class="chip-btn small" data-act="prev">◀</button><span class="ps-file-slide-count" data-role="count">1/${images.length}</span><button type="button" class="chip-btn small" data-act="next">▶</button>` : ""}
          ${showGrid ? `<button type="button" class="chip-btn small" data-act="grid" title="Lihat semua halaman sebagai mini-preview">🔳</button>` : ""}
          <button type="button" class="chip-btn small" data-act="play">▶️</button>
          ${isYt ? `<button type="button" class="chip-btn small" data-act="bg" title="Putar sebagai audio latar (video disembunyikan)">🎧</button>` : ""}
          ${!isYt ? `<button type="button" class="chip-btn small" data-act="copyname" title="Salin nama file ini">📋</button>` : ""}
          <button type="button" class="chip-btn small" data-act="addcol" title="${isYt ? "Tambahkan video yang sedang ditampilkan ke Kumpulan Ayat (kolom kiri)" : "Tambahkan halaman yang sedang ditampilkan ke Kumpulan Ayat (kolom kiri)"}">➕ Kumpulan</button>
          ${multi && !isYt ? `<button type="button" class="chip-btn small" data-act="addcolall" title="Tambahkan SEMUA ${images.length} halaman berkas ini ke Kumpulan Ayat sekaligus, sebagai ${images.length} item terpisah -- supaya panah/stylus bisa maju satu-per-satu lewat semua halamannya saat tayang">➕ Semua Halaman</button>` : ""}
          ${!isYt ? `<button type="button" class="chip-btn small" data-act="download" title="Unduh halaman yang sedang ditampilkan sebagai gambar">⬇️</button>` : ""}
          ${item.originalFile ? `<button type="button" class="chip-btn small" data-act="downloadOriginal" title="Unduh file PDF ASLI (utuh, bukan gambar per halaman)">⬇️ PDF Asli</button>` : ""}
          ${item.driveFileId ? `<button type="button" class="chip-btn small" data-act="publiclink" title="${item.publicUrl ? "Lihat/salin link publik, atau cabut supaya jadi privat lagi" : "Buat link Drive yang bisa dibuka SIAPA SAJA lewat browser mana pun, tanpa login ke aplikasi ini"}">${item.publicUrl ? "🔓 Link Publik" : "🔗 Buat Link Publik"}</button>` : ""}
          ${item.driveFileId ? `<button type="button" class="chip-btn small danger" data-act="deldrive" title="Hapus PERMANEN dari Drive (bukan cuma dari daftar ini)">🗑️ Hapus dari Drive</button>` : ""}
          <button type="button" class="chip-btn small danger" data-act="del">✖️</button>
        </span>`;
      itemWrap.appendChild(row);
      // BARU (5 Sep 2026) -- "🔗 Buat Link Publik" / "🔓 Link Publik".
      // Lihat catatan keamanan panjang di setDriveFileSharingForUser_()
      // (apps-script/Code.gs): sekali dibuat publik, SIAPA PUN yang tahu
      // link itu bisa membukanya lewat browser mana pun TANPA login ke
      // aplikasi ini, sampai dicabut lagi lewat tombol yang sama (ketik
      // "cabut" di kotak yang muncul). Beda dari media_file (endpoint
      // internal aplikasi) yang selalu dicek username-nya dulu.
      const publicLinkBtn = row.querySelector('[data-act="publiclink"]');
      if (publicLinkBtn) publicLinkBtn.addEventListener("click", async () => {
        if (item.publicUrl) {
          const choice = prompt(
            `Link publik "${item.name}" (bisa dibuka siapa saja lewat browser mana pun, tanpa login ke aplikasi):\n\n${item.publicUrl}\n\nKetik "cabut" lalu OK untuk menonaktifkan link ini (jadi privat lagi). Biarkan seperti ini lalu OK/Batal untuk sekadar menutup kotak ini (link tidak berubah).`,
            item.publicUrl
          );
          if (choice === null || choice.trim().toLowerCase() !== "cabut") return;
          publicLinkBtn.disabled = true;
          publicLinkBtn.textContent = "⏳ Mencabut…";
          const res = await setMediaPublicLink(username, item.driveFileId, false);
          publicLinkBtn.disabled = false;
          if (!res || !res.ok) {
            alert("Gagal mencabut link publik: " + ((res && res.error) || "Terjadi kesalahan tidak dikenal."));
            publicLinkBtn.textContent = "🔓 Link Publik";
            return;
          }
          item.publicUrl = null;
          item.updatedAt = new Date().toISOString();
          if (typeof LocalDB !== "undefined") await LocalDB.putMediaItem(item).catch(() => {});
          alert(`Link publik "${item.name}" sudah dicabut -- sekarang privat lagi (hanya bisa diakses lewat aplikasi seperti sebelumnya).`);
          renderMediaList();
          return;
        }
        if (!confirm(`Buat link publik untuk "${item.name}"?\n\nSiapa pun yang punya link ini nanti bisa membukanya LANGSUNG lewat browser apa pun (komputer/HP, tidak perlu login ke aplikasi ini) -- tidak ada kadaluarsa otomatis, tapi bisa dicabut lagi kapan saja lewat tombol yang sama.`)) return;
        publicLinkBtn.disabled = true;
        publicLinkBtn.textContent = "⏳ Membuat…";
        const res = await setMediaPublicLink(username, item.driveFileId, true);
        publicLinkBtn.disabled = false;
        if (!res || !res.ok) {
          alert("Gagal membuat link publik: " + ((res && res.error) || "Terjadi kesalahan tidak dikenal."));
          publicLinkBtn.textContent = "🔗 Buat Link Publik";
          return;
        }
        item.publicUrl = res.url;
        item.updatedAt = new Date().toISOString();
        if (typeof LocalDB !== "undefined") await LocalDB.putMediaItem(item).catch(() => {});
        if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          navigator.clipboard.writeText(res.url).catch(() => {});
          alert(`Link publik berhasil dibuat & disalin ke clipboard:\n${res.url}`);
        } else {
          alert(`Link publik berhasil dibuat:\n${res.url}`);
        }
        renderMediaList();
      });
      const deleteFromDriveBtn = row.querySelector('[data-act="deldrive"]');
      if (deleteFromDriveBtn) deleteFromDriveBtn.addEventListener("click", async () => {
        // BARU (27 Agu 2026) -- lihat catatan panjang di
        // requestDeleteMediaFromDrive()/getMediaFileUsers() (js/collections.js)
        // & MEDIA_OWNERSHIP_SHEET (apps-script/Code.gs). Alur:
        //   1. Tanya server dulu siapa saja yang masih pakai file ini
        //      (rantai salinan hasil Tahap 5), supaya operator TAHU
        //      sebelum menekan "Ya, hapus" -- bukan cuma "yakin?" polos.
        //   2. Kalau operator ADALAH pengunggah pertama: langsung
        //      terhapus dari Drive begitu dikonfirmasi.
        //   3. Kalau BUKAN: hanya jadi PERMINTAAN tertunda, menunggu
        //      pengunggah pertama menyetujui (lihat kartu 🔔 di atas).
        deleteFromDriveBtn.disabled = true;
        deleteFromDriveBtn.textContent = "⏳ Memeriksa…";
        const info = await getMediaFileUsers(item.driveFileId);
        deleteFromDriveBtn.disabled = false;
        deleteFromDriveBtn.textContent = "🗑️ Hapus dari Drive";
        const others = (info && info.users || []).filter((u) => String(u.owner).toLowerCase() !== String(username).toLowerCase());
        let msg = `Hapus PERMANEN "${item.name}" dari Drive?\n\nTindakan ini TIDAK BISA dibatalkan.`;
        if (others.length) {
          msg += `\n\nBerkas ini juga dipakai oleh: ${others.map((u) => u.owner).join(", ")}.`;
        }
        const originalOwner = info && info.originalOwner;
        const isOriginalOwner = !originalOwner || String(originalOwner).toLowerCase() === String(username).toLowerCase();
        if (!isOriginalOwner) {
          msg += `\n\nAnda BUKAN pengunggah pertama berkas ini (pengunggah pertama: ${originalOwner}) -- permintaan Anda akan MENUNGGU PERSETUJUAN mereka dulu, tidak langsung terhapus.`;
        }
        if (!confirm(msg)) return;
        let reason = "";
        if (!isOriginalOwner) reason = prompt("Alasan (opsional, akan dilihat oleh pengunggah pertama):", "") || "";
        deleteFromDriveBtn.disabled = true;
        deleteFromDriveBtn.textContent = "⏳ Mengirim…";
        const res = await requestDeleteMediaFromDrive(username, item.driveFileId, item.name, reason);
        if (!res || !res.ok) {
          alert("Gagal: " + ((res && res.error) || "Terjadi kesalahan tidak dikenal."));
          deleteFromDriveBtn.disabled = false;
          deleteFromDriveBtn.textContent = "🗑️ Hapus dari Drive";
          return;
        }
        if (res.deleted) {
          alert(`"${item.name}" sudah dihapus permanen dari Drive.`);
        } else if (res.pending) {
          alert(`Permintaan hapus sudah dikirim ke pengunggah pertama (${res.originalOwner}) -- menunggu persetujuan mereka.`);
        }
        renderMediaList();
      });
      const downloadOriginalBtn = row.querySelector('[data-act="downloadOriginal"]');
      if (downloadOriginalBtn) downloadOriginalBtn.addEventListener("click", () => {
        const a = document.createElement("a");
        a.href = item.originalFile;
        a.download = (item.sourceFileName || item.name || "berkas").replace(/\.pdf$/i, "") + ".pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
      const countEl = row.querySelector('[data-role="count"]');
      function updateCount() { if (countEl) countEl.textContent = `${idx + 1}/${images.length}`; }
      function doSend() {
        const url = images[idx];
        if (!url) return;
        if (isYt) { rawPost({ type: "youtube", embedUrl: url }); renderStudioPreview({ type: "youtube", embedUrl: url }); }
        else { rawPost({ type: "slide", imageUrl: url }); renderStudioPreview({ type: "slide", imageUrl: url }); }
      }
      row.querySelector('[data-act="play"]').addEventListener("click", () => stageOrSend(item.name, item.name, doSend));
      const bgBtn = row.querySelector('[data-act="bg"]');
      if (bgBtn) bgBtn.addEventListener("click", () => {
        const url = images[idx];
        if (url && typeof window.playAsYtBackground === "function") window.playAsYtBackground(url, item.name);
      });
      const prevBtn = row.querySelector('[data-act="prev"]');
      const nextBtn = row.querySelector('[data-act="next"]');
      let thumbApi = null;
      // ◀ ▶ pindah slide/video LANGSUNG (juga saat live di mode dual
      // monitor) -- ini yang dipakai untuk "geser ke video berikutnya"
      // saat presentasi sedang berjalan, sama seperti slide gambar/PDF.
      if (prevBtn) prevBtn.addEventListener("click", () => { idx = (idx - 1 + images.length) % images.length; updateCount(); doSend(); if (thumbApi) thumbApi.refreshActive(); });
      if (nextBtn) nextBtn.addEventListener("click", () => { idx = (idx + 1) % images.length; updateCount(); doSend(); if (thumbApi) thumbApi.refreshActive(); });
      // "📋" Salin NAMA FILE saja (bukan isinya -- PDF/gambar/Word tidak
      // punya bentuk teks yang masuk akal buat disalin, cuma namanya yang
      // berguna, mis. buat ditempel ke rundown acara). Nama yang disalin =
      // nama file ASLI saat diunggah (sourceFileName) kalau ada, jatuh ke
      // nama simpanan (item.name) kalau tidak.
      const copyNameBtn = row.querySelector('[data-act="copyname"]');
      if (copyNameBtn) copyNameBtn.addEventListener("click", () => {
        copyTextWithFeedback(item.sourceFileName || item.name, copyNameBtn);
      });
      // "➕ Kumpulan" -- BARU (27 Agu 2026), lihat addMediaToCollection()
      // (js/collections.js) & catatan panjang di atasnya untuk kenapa
      // ini dulu tidak ada sama sekali (celah yang dilaporkan pengguna:
      // "+ Daftar" di tab File cuma menyimpan ke Media Tersimpan, tidak
      // pernah masuk ke Kumpulan Ayat, beda dari Kidung yang langsung
      // bisa). Menambahkan HALAMAN YANG SEDANG AKTIF (idx saat tombol
      // diklik, sama seperti "⬇️" download halaman aktif) -- kalau mau
      // beberapa halaman PDF ini masuk semua, klik ◀ ▶ dulu ke halaman
      // lain lalu klik "➕ Kumpulan" lagi untuk tiap halaman yang diinginkan.
      const addColBtn = row.querySelector('[data-act="addcol"]');
      if (addColBtn) addColBtn.addEventListener("click", async () => {
        if (typeof addMediaToCollection !== "function") return;
        const sel = el("psCollectionSelect");
        const name = (sel && sel.value && typeof loadCollections === "function" && loadCollections(username)[sel.value])
          ? loadCollections(username)[sel.value].name
          : await promptCollectionName(username);
        if (!name) return;
        addMediaToCollection(username, name, item, idx);
        if (typeof renderCollectionSelect === "function") renderCollectionSelect();
        addColBtn.textContent = "✅ Ditambahkan";
        setTimeout(() => { addColBtn.textContent = "➕ Kumpulan"; }, 1200);
      });
      // "➕ Semua Halaman" -- BARU (12 Sep 2026). Keluhan pengguna: stylus/panah
      // presentasi cuma bisa maju-mundur SEDIKIT (sebanyak item lain di Kumpulan
      // Ayat) karena PDF banyak-halaman biasanya cuma masuk sebagai 1 item lewat
      // "➕ Kumpulan" di atas (cuma halaman aktif saat itu, lihat catatan panjang
      // di addMediaToCollection(), js/collections.js). Tombol ini memanggil
      // addMediaToCollection() BERULANG untuk SETIAP halaman (pageIndex 0..N-1)
      // sehingga tiap halaman jadi item playlist sendiri-sendiri -- setelah ini,
      // panah kanan/kiri & stylus (wirePlaylistKeyNav(), lihat catatan di sana)
      // otomatis bisa geser satu-per-satu lewat SEMUA halaman berkas ini.
      const addColAllBtn = row.querySelector('[data-act="addcolall"]');
      if (addColAllBtn) addColAllBtn.addEventListener("click", async () => {
        if (typeof addMediaToCollection !== "function") return;
        const sel = el("psCollectionSelect");
        const name = (sel && sel.value && typeof loadCollections === "function" && loadCollections(username)[sel.value])
          ? loadCollections(username)[sel.value].name
          : await promptCollectionName(username);
        if (!name) return;
        if (!confirm(`Tambahkan SEMUA ${images.length} halaman "${item.name}" ke kumpulan "${name}"?\n\nIni akan membuat ${images.length} item terpisah (satu per halaman) di kumpulan itu.`)) return;
        for (let i = 0; i < images.length; i++) {
          addMediaToCollection(username, name, item, i);
        }
        if (typeof renderCollectionSelect === "function") renderCollectionSelect();
        addColAllBtn.textContent = "✅ Ditambahkan";
        setTimeout(() => { addColAllBtn.textContent = "➕ Semua Halaman"; }, 1200);
      });
      // "⬇️" Unduh halaman/gambar yang SEDANG ditampilkan (idx saat ini).
      // PENTING: untuk PDF yang diunggah, aplikasi ini menyimpan hasil
      // RENDER tiap halaman sebagai gambar (lihat catatan "images" di
      // js/collections.js) -- BUKAN berkas .pdf aslinya (tidak disimpan
      // sama sekali, supaya tidak boros ruang IndexedDB). Jadi unduhan
      // untuk item PDF akan berbentuk gambar per halaman (.png), bukan
      // file .pdf utuh -- ini keterbatasan yang disengaja, bukan bug.
      const downloadBtn = row.querySelector('[data-act="download"]');
      if (downloadBtn) downloadBtn.addEventListener("click", () => {
        const url = images[idx];
        if (!url) return;
        const a = document.createElement("a");
        a.href = url;
        const base = (item.sourceFileName || item.name || "berkas").replace(/\.(pdf|docx?|pptx?)$/i, "");
        const ext = (url.match(/^data:image\/(\w+)/) || [, "png"])[1];
        a.download = multi ? `${base} - hal ${idx + 1}.${ext}` : `${base}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
      const gridBtn = row.querySelector('[data-act="grid"]');
      if (gridBtn && showGrid) {
        const gridWrap = document.createElement("div");
        gridWrap.className = "ps-thumbgrid";
        gridWrap.hidden = true;
        itemWrap.appendChild(gridWrap);
        thumbApi = wireThumbGrid(gridWrap, images, gridBtn, () => idx, (i) => { idx = i; updateCount(); doSend(); });
      }
      row.querySelector('[data-act="del"]').addEventListener("click", async () => {
        if (!confirm(`Hapus "${item.name}" dari Media Tersimpan?`)) return;
        await removeMediaItem(username, item.id);
        renderMediaList();
      });
      wrap.appendChild(itemWrap);

      // Daftar judul + durasi tiap video (khusus item YouTube yang disimpan
      // dengan videoLabels -- lihat addMediaItem() di js/collections.js).
      // Ditaruh sebagai sub-baris di bawah nama item, supaya operator bisa
      // langsung lihat judul & durasi TANPA harus klik ◀ ▶ satu-satu dulu.
      // Klik salah satu baris = langsung tayang video itu (sama seperti ▶ ▶).
      if (isYt && item.videoLabels && item.videoLabels.length) {
        const sub = document.createElement("div");
        sub.className = "ps-yt-sublist";
        item.videoLabels.forEach((lbl, i) => {
          const subRow = document.createElement("div");
          subRow.className = "ps-yt-subrow-wrap";
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "ps-yt-subrow";
          btn.innerHTML = `<span class="ps-yt-subrow-title">${i + 1}. ${escapeHtml(lbl.title || `Video ${i + 1}`)}</span>${lbl.durationLabel ? `<span class="ps-yt-subrow-dur">${escapeHtml(lbl.durationLabel)}</span>` : ""}`;
          btn.addEventListener("click", () => {
            idx = i;
            updateCount();
            stageOrSend(item.name, item.name, doSend);
          });
          subRow.appendChild(btn);
          const subBg = document.createElement("button");
          subBg.type = "button";
          subBg.className = "ps-yt-subrow-bg";
          subBg.title = "Putar sebagai audio latar (video disembunyikan)";
          subBg.textContent = "🎧";
          subBg.addEventListener("click", () => {
            const url = images[i];
            if (url && typeof window.playAsYtBackground === "function") window.playAsYtBackground(url, lbl.title || item.name);
          });
          subRow.appendChild(subBg);
          sub.appendChild(subRow);
        });
        itemWrap.appendChild(sub);
      }
    });
  }

  // ------------------------------------------------------------
  // Pengumuman (kiri) -- judul 1 baris + isi, sisip ke Kumpulan Ayat
  // sebagai teks bebas (disimpan lewat mekanisme "Tulisan Bebas" yang
  // sudah ada di js/presentation.js supaya muncul juga di daftar itu).
  // ------------------------------------------------------------
  // BARU (7 Sep 2026, permintaan operator) -- rata teks pengumuman
  // dipertahankan di sini (bukan cuma dibaca sekali dari tombol), supaya
  // sisa fungsi (mis. renderStudioPreview di tempat lain) bisa ikut
  // memakainya kalau perlu di kemudian hari. "center" = bawaan lama.
  let psAnnAlign_ = "center";
  function wireAnnouncement() {
    if (el("psAnnClearBtn")) {
      el("psAnnClearBtn").addEventListener("click", () => {
        if (el("psAnnTitle")) el("psAnnTitle").value = "";
        if (el("psAnnBody")) el("psAnnBody").value = "";
      });
    }
    if (el("psAnnInsertBtn")) {
      el("psAnnInsertBtn").addEventListener("click", () => {
        const title = (el("psAnnTitle") && el("psAnnTitle").value.trim()) || "";
        const body = (el("psAnnBody") && el("psAnnBody").value.trim()) || "";
        if (!title && !body) return;
        const full = title ? `${title}\n\n${body}` : body;
        // Memakai penyimpanan "Tulisan Bebas" bawaan (js/presentation.js)
        // supaya pengumuman ini otomatis masuk daftar tersimpan / Kumpulan
        // Ayat sederhana yang bisa dikirim ulang kapan saja.
        if (el("presentFreeText")) el("presentFreeText").value = full;
        if (el("presentSaveFreeTextBtn")) el("presentSaveFreeTextBtn").click();
        // BARU (7 Sep 2026) -- ikut kirim rata teks yang sedang dipilih
        // (lihat tombol data-ann-align & applyTheme-nya di present.html,
        // kind "text").
        // BARU (7 Sep 2026, permintaan operator) -- judul (kalau diisi)
        // dikirim TERPISAH lewat annTitle/annBody supaya Layar 2 bisa
        // menampilkannya lebih besar & tebal daripada isi pengumuman
        // (lihat kind "text" di present.html). `text` (gabungan lama)
        // tetap ikut dikirim sebagai cadangan untuk penerima yang belum
        // paham field baru ini. CATATAN: kalau pengumuman ini nanti
        // dikirim ULANG dari daftar "Kumpulan Ayat" tersimpan (tombol
        // 📤 Kirim), judul TIDAK ikut tebal lagi -- yang tersimpan di
        // situ cuma teks gabungan biasa (lihat sendFreeText() di js/
        // presentation.js), belum menyimpan mana bagian judulnya.
        post({ type: "text", text: full, align: psAnnAlign_, annTitle: title, annBody: body });
      });
    }
    // ---- Rata teks (kiri/tengah/kanan/justify) ----
    const alignBtns = Array.from(document.querySelectorAll("[data-ann-align]"));
    alignBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        psAnnAlign_ = btn.dataset.annAlign;
        alignBtns.forEach((b) => b.classList.toggle("active", b === btn));
      });
    });
    // ---- Grid ikon siap-pakai: buka/tutup + sisip di posisi kursor ----
    // Menyisipkan lewat document.execCommand("insertText") KALAU tersedia
    // (mempertahankan riwayat undo/redo bawaan textarea, mis. Ctrl+Z),
    // jatuh ke potong-tempel manual value kalau tidak didukung browser.
    // Fokus textarea SENGAJA dikembalikan & posisi kursor dipindah ke
    // SESUDAH ikon yang baru disisipkan supaya klik ikon berturut-turut
    // menyisip berurutan (bukan semua menumpuk di posisi yang sama).
    if (el("psAnnIconToggleBtn") && el("psAnnIconGrid")) {
      el("psAnnIconToggleBtn").addEventListener("click", () => {
        el("psAnnIconGrid").hidden = !el("psAnnIconGrid").hidden;
      });
    }
    // BARU (7 Sep 2026, permintaan operator: "bendera diperbanyak sampai
    // 250 negara") -- kotak cari KHUSUS bendera (di antara ratusan ikon
    // lain, cuma bendera yang sebanyak ini, jadi cukup filter yang ini
    // saja) -- mengetik nama negara ATAU kode 2-huruf (mis. "jp" untuk
    // Jepang) langsung menyaring `.ps-flag-btn` berdasarkan atribut
    // `title`-nya (yang sudah berisi "Nama Negara (KODE)").
    if (el("psAnnFlagSearch")) {
      el("psAnnFlagSearch").addEventListener("input", () => {
        const q = el("psAnnFlagSearch").value.trim().toLowerCase();
        document.querySelectorAll(".ps-flag-btn").forEach((btn) => {
          const title = (btn.getAttribute("title") || "").toLowerCase();
          btn.style.display = !q || title.includes(q) ? "" : "none";
        });
      });
    }
    document.querySelectorAll(".ps-ann-icon-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const body = el("psAnnBody");
        if (!body) return;
        const icon = btn.dataset.icon;
        body.focus();
        const start = body.selectionStart ?? body.value.length;
        const end = body.selectionEnd ?? body.value.length;
        if (document.execCommand && document.execCommand("insertText", false, icon)) {
          // berhasil lewat execCommand -- undo/redo bawaan tetap jalan
        } else {
          body.value = body.value.slice(0, start) + icon + body.value.slice(end);
          const pos = start + icon.length;
          body.setSelectionRange(pos, pos);
        }
      });
    });
    // ---- Salin judul+isi ke clipboard ----
    if (el("psAnnCopyBtn")) {
      el("psAnnCopyBtn").addEventListener("click", async () => {
        const title = (el("psAnnTitle") && el("psAnnTitle").value.trim()) || "";
        const body = (el("psAnnBody") && el("psAnnBody").value.trim()) || "";
        const full = title ? `${title}\n\n${body}` : body;
        if (!full) return;
        const btn = el("psAnnCopyBtn");
        const original = btn.textContent;
        try {
          await navigator.clipboard.writeText(full);
          btn.textContent = "✅ Tersalin";
        } catch (e) {
          // Fallback kalau Clipboard API diblokir (mis. bukan HTTPS/izin
          // ditolak) -- textarea sementara + execCommand("copy") lama.
          const tmp = document.createElement("textarea");
          tmp.value = full;
          tmp.style.position = "fixed";
          tmp.style.opacity = "0";
          document.body.appendChild(tmp);
          tmp.select();
          try { document.execCommand("copy"); btn.textContent = "✅ Tersalin"; }
          catch (e2) { btn.textContent = "⚠️ Gagal salin"; }
          document.body.removeChild(tmp);
        }
        setTimeout(() => { btn.textContent = original; }, 1500);
      });
    }
    wireAnnouncementQuickPhrases_();
    wireAnnouncementTemplates_();
  }

  // ------------------------------------------------------------
  // BARU (7 Sep 2026, permintaan operator) -- baris cepat siap-pakai
  // (mis. "✅ Bawa Buku") -- SAMA POLA dengan grid ikon (.ps-ann-icon-btn)
  // di atas: menyisipkan 1 baris teks ke posisi kursor di psAnnBody, TIDAK
  // menimpa isi yang sudah ada. Daftar tombolnya sendiri cukup diedit
  // langsung di index.html (elemen [data-ann-quick]) -- tidak perlu
  // disimpan/dihapus lewat UI karena ini cuma "potongan cepat", beda
  // dari Template Pengumuman (wireAnnouncementTemplates_ di bawah) yang
  // memang dirancang untuk ditambah/dihapus bebas oleh operator.
  // ------------------------------------------------------------
  function wireAnnouncementQuickPhrases_() {
    document.querySelectorAll("[data-ann-quick]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const body = el("psAnnBody");
        if (!body) return;
        const line = btn.dataset.annQuick || "";
        body.focus();
        const start = body.selectionStart ?? body.value.length;
        const end = body.selectionEnd ?? body.value.length;
        // Selalu mulai di baris baru kalau kotak isi sudah ada teks
        // sebelumnya & kursor tidak persis di awal baris kosong --
        // supaya baris cepat tidak menyambung ke tengah baris lain.
        const needsNewline = body.value.length > 0 && start > 0 && body.value[start - 1] !== "\n";
        const insert = (needsNewline ? "\n" : "") + line;
        if (document.execCommand && document.execCommand("insertText", false, insert)) {
          // berhasil lewat execCommand -- undo/redo bawaan tetap jalan
        } else {
          body.value = body.value.slice(0, start) + insert + body.value.slice(end);
          const pos = start + insert.length;
          body.setSelectionRange(pos, pos);
        }
      });
    });
  }

  // ------------------------------------------------------------
  // BARU (7 Sep 2026 v2, permintaan operator: "mau di buat bisa dibuka
  // di beda handphone") -- Template Pengumuman SEKARANG disimpan lewat
  // mekanisme Kumpulan Ayat yang SUDAH ADA (js/collections.js + js/
  // sync.js + apps-script/Code.gs) -- BUKAN localStorage terpisah lagi
  // seperti versi sebelumnya. Semua template masuk ke 1 kumpulan
  // bernama tetap ANN_TEMPLATE_COLLECTION_NAME di bawah. Karena
  // Kumpulan Ayat memang SUDAH tersinkron ke Google Sheet per akun
  // (Sync.pushCollection/pullCollections, lihat js/collections.js),
  // template ini OTOMATIS ikut muncul di HP/laptop lain -- ASAL:
  //   1) operator LOGIN dengan akun yang sama di kedua perangkat
  //      (bukan mode Tamu -- lihat js/guest.js), dan
  //   2) perangkat kedua sempat menekan sinkron ulang Kumpulan Ayat
  //      (otomatis saat buka app kalau online, sama seperti kumpulan
  //      ayat/kidung lain -- lihat refreshCollectionsFromRemote() di
  //      js/collections.js).
  // Kalau operator sedang mode Tamu, tetap tersimpan lokal saja di
  // perangkat itu (localStorage biasa) -- SAMA seperti kumpulan lain
  // saat Tamu -- baru ikut sinkron begitu login.
  //
  //  Item disimpan sebagai {type:"announcement", text, title, tplName}
  //  -- `tplName` field TAMBAHAN (di luar 3 field standar item
  //  pengumuman) khusus dipakai daftar ini sebagai label; kode LAIN
  //  yang membaca kumpulan (mis. renderCollectionList di js/app.js)
  //  otomatis mengabaikan field yang tidak dikenalnya, jadi aman.
  // ------------------------------------------------------------
  const ANN_TEMPLATE_COLLECTION_NAME = "🗂️ Template Pengumuman";

  function _annTplUsername_() {
    return typeof currentUser !== "undefined" ? currentUser : null;
  }
  function _annTplCollection_() {
    const username = _annTplUsername_();
    const collections = loadCollections(username);
    const id = _findCollectionIdByName(collections, ANN_TEMPLATE_COLLECTION_NAME);
    return { username, id, col: id ? collections[id] : null };
  }
  function escapeHtmlAnn_(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function renderAnnTemplateList_() {
    const wrap = el("psAnnTemplateList");
    if (!wrap) return;
    const { col } = _annTplCollection_();
    const items = (col && col.items) ? col.items : [];
    if (!items.length) {
      wrap.innerHTML = '<p class="present-saved-empty">Belum ada template tersimpan. Ketik judul/isi di atas, beri nama, lalu tekan "💾 Simpan sebagai Template". Login supaya template ikut tersinkron ke HP/laptop lain.</p>';
      return;
    }
    wrap.innerHTML = "";
    items.forEach((tpl, index) => {
      if (tpl.type !== "announcement") return; // jaga-jaga isi campuran kalau nama kumpulan kebetulan dipakai manual juga
      const name = tpl.tplName || tpl.title || (tpl.text || "").slice(0, 30) || "Tanpa nama";
      const row = document.createElement("div");
      row.className = "present-saved-row";
      const previewSrc = tpl.title ? `${tpl.title} — ${tpl.text}` : (tpl.text || "");
      const preview = previewSrc.length > 60 ? previewSrc.slice(0, 60) + "…" : previewSrc;
      row.innerHTML = `
        <span class="present-saved-text" title="${escapeHtmlAnn_(previewSrc)}"><b>${escapeHtmlAnn_(name)}</b> -- ${escapeHtmlAnn_(preview)}</span>
        <span class="present-saved-actions">
          <button type="button" class="chip-btn small primary" data-act="send">📤 Tayangkan</button>
          <button type="button" class="chip-btn small" data-act="load">✏️ Muat</button>
          <button type="button" class="chip-btn small danger" data-act="del">🗑️</button>
        </span>`;
      row.querySelector('[data-act="load"]').addEventListener("click", () => {
        if (el("psAnnTitle")) el("psAnnTitle").value = tpl.title || "";
        if (el("psAnnBody")) el("psAnnBody").value = tpl.text || "";
        if (el("psAnnTemplateName")) el("psAnnTemplateName").value = name;
      });
      row.querySelector('[data-act="send"]').addEventListener("click", () => {
        const full = tpl.title ? `${tpl.title}\n\n${tpl.text}` : tpl.text;
        post({ type: "text", text: full, align: psAnnAlign_, annTitle: tpl.title || "", annBody: tpl.text || "" });
      });
      row.querySelector('[data-act="del"]').addEventListener("click", () => {
        if (!confirm(`Hapus template "${name}"?`)) return;
        const { username, id } = _annTplCollection_();
        if (id) removeItemFromCollection(username, id, index);
        renderAnnTemplateList_();
      });
      wrap.appendChild(row);
    });
  }
  function wireAnnouncementTemplates_() {
    if (el("psAnnTemplateSaveBtn")) {
      el("psAnnTemplateSaveBtn").addEventListener("click", () => {
        const nameEl = el("psAnnTemplateName");
        const title = (el("psAnnTitle") && el("psAnnTitle").value.trim()) || "";
        const body = (el("psAnnBody") && el("psAnnBody").value.trim()) || "";
        let name = (nameEl && nameEl.value.trim()) || "";
        if (!title && !body) { alert("Isi judul atau isi pengumuman dulu sebelum disimpan sebagai template."); return; }
        if (!name) name = title || body.slice(0, 30) || "Tanpa nama";
        const username = _annTplUsername_();
        addItemToCollection(username, ANN_TEMPLATE_COLLECTION_NAME, { type: "announcement", text: body, title, tplName: name });
        if (nameEl) nameEl.value = "";
        renderAnnTemplateList_();
      });
    }
    renderAnnTemplateList_();
  }

  // ------------------------------------------------------------
  // Pesan berjalan (kiri) -- dikirim sebagai "text" biasa (posisi &
  // warna diterapkan lewat theme minimal untuk tahap ini: warna teks
  // dikirim di dalam payload text, present.html memakai warna default
  // untuk versi awal ini).
  // ------------------------------------------------------------
  function wireMessage() {
    // BARU (7 Sep 2026) -- ditulis ulang, lihat catatan alur lengkapnya:
    //  1) Posisi "⬆️ Atas"  -> lapisan {type:"warta"}    (bar nempel ATAS layar)
    //  2) Posisi "⬇️ Bawah" -> lapisan {type:"footnote"} (bar nempel BAWAH layar)
    //  3) Posisi "⏺️ Tengah"-> lapisan {type:"msgmid"}   (bar nempel TENGAH layar, BARU)
    // KETIGANYA murni LAPISAN MENGAMBANG di ATAS #stage (lihat present.html,
    // applyTicker() & CSS .ticker-bar) -- TIDAK PERNAH mengganti/menghapus
    // apa pun yang sedang tayang di baliknya (ayat/kidung/YouTube/
    // pengumuman/stopwatch/timer tetap utuh). SEBELUMNYA posisi "Tengah"
    // salah kirim {type:"text"} (lewat post()) yang justru MENIMPA isi
    // utama #stage -- itu sebabnya "Tengah" terasa keliru/beda dari
    // Atas & Bawah.
    // Ganti warna ATAU pindah posisi SAAT pesan sedang tayang sekarang
    // langsung ikut berubah di Layar 2 (sebelumnya harus Stop dulu baru
    // efeknya kelihatan lain kali Tayangkan ditekan).
    function hideAllMessageBars_() {
      rawPost({ type: "warta", show: false, text: "" });
      rawPost({ type: "footnote", show: false, text: "" });
      rawPost({ type: "msgmid", show: false, text: "" });
    }
    function sendMessageNow_() {
      if (!msgRunning) return;
      const text = (el("psMsgText") && el("psMsgText").value.trim()) || "";
      if (!text) return;
      // "scroll" (lama, dipakai present.html) sekarang diturunkan dari
      // msgMode supaya tetap kompatibel: mode "scroll" => scroll=true,
      // mode "static"/"pulse" => scroll=false (keduanya diam di tempat,
      // "pulse" membedakan dirinya lewat field `mode`/`pulseSeconds`
      // terpisah di bawah, dibaca applyTicker() di present.html).
      const scroll = msgMode === "scroll";
      const payloadType = msgPos === "top" ? "warta" : msgPos === "bottom" ? "footnote" : "msgmid";
      // Sembunyikan dulu SEMUA posisi (jaga-jaga kalau operator baru saja
      // memindah posisi selagi pesan tayang) supaya tidak ada 2 bar
      // nyangkut tampil bersamaan, baru tampilkan di posisi yang benar.
      hideAllMessageBars_();
      rawPost({
        type: payloadType, show: true, text, scroll, color: msgColor,
        // BARU (7 Sep 2026) -- font & stroke/kontur huruf, lihat
        // applyTicker() di present.html.
        fontFamily: msgFont,
        stroke: msgStrokeOn ? msgStrokeColor : "",
        strokeWidth: msgStrokeWidth,
        // BARU (7 Sep 2026 v2) -- mode "pulse" (membesar 100%<->150%
        // berulang, posisi tetap) & border latar bar pesan.
        mode: msgMode,
        pulseSeconds: msgPulseSeconds,
        borderColor: msgBorderColor,
        borderWidth: msgBorderWidth,
        // BARU (8 Sep 2026) -- latar/background bar PENUH SOLID, lihat
        // catatan panjang msgBgColor di atas & applyTicker() (present.html).
        bg: msgBgColor,
        // BARU (7 Sep 2026 v3) -- kecepatan "Berjalan" (lihat rumus SAMA
        // persis di applyTicker(), present.html) & A+/A- ukuran huruf.
        scrollBaseSec: msgScrollBaseSec,
        scale: msgScale,
      });
      if (scroll) startScrollProgress_(text.length);
      else stopScrollProgress_();
    }
    // BARU (7 Sep 2026 v3, permintaan operator) -- progress bar & info
    // "lama 1 putaran" untuk mode "➡️ Berjalan", disimulasikan LOKAL di
    // Studio (present.html tidak melaporkan balik posisi animasinya
    // detik-per-detik -- tidak perlu, cukup disinkronkan dari saat
    // pesan ini dikirim, dengan rumus durasi YANG SAMA PERSIS dipakai
    // applyTicker() di present.html: max(scrollBaseSec, panjang/6)).
    function scrollDurationFor_(textLen) {
      return Math.max(4, msgScrollBaseSec, textLen / 6);
    }
    function startScrollProgress_(textLen) {
      stopScrollProgress_();
      const durSec = scrollDurationFor_(textLen);
      if (el("psMsgSpeedInfo")) el("psMsgSpeedInfo").textContent = `Lama 1 putaran penuh: ~${durSec.toFixed(1)} detik.`;
      const startedAt = Date.now();
      const fill = el("psMsgSpeedProgress");
      msgScrollProgressTimer_ = setInterval(() => {
        if (!fill) return;
        const elapsed = ((Date.now() - startedAt) / 1000) % durSec;
        fill.style.width = (elapsed / durSec) * 100 + "%";
      }, 100);
    }
    function stopScrollProgress_() {
      if (msgScrollProgressTimer_) { clearInterval(msgScrollProgressTimer_); msgScrollProgressTimer_ = null; }
      if (el("psMsgSpeedProgress")) el("psMsgSpeedProgress").style.width = "0%";
    }
    // PERBAIKAN (7 Sep 2026, laporan operator "sudah ganti teks tapi tidak
    // ikut berubah di Layar 2") -- SEBELUMNYA mengetik ulang teks pesan
    // SAAT sedang tayang tidak pernah mengirim ulang apa pun (cuma tombol
    // warna/posisi yang memanggil sendMessageNow_()) -- operator harus
    // klik warna/posisi lagi (walau sudah benar) hanya supaya teks
    // terbaru ikut terkirim. Sekarang tiap ketikan (debounce ringan)
    // langsung ikut mengirim ulang, kalau pesan sedang tayang.
    let msgInputDebounce_ = null;
    if (el("psMsgText")) {
      el("psMsgText").addEventListener("input", () => {
        if (msgInputDebounce_) clearTimeout(msgInputDebounce_);
        msgInputDebounce_ = setTimeout(sendMessageNow_, 250);
      });
    }
    // BARU (7 Sep 2026 v2) -- baris "Mode tampil" (Diam/Berjalan/Berdenyut)
    // menggantikan checkbox "Berjalan" tunggal yang lama. Klik salah satu
    // langsung berubah live di Layar 2 kalau pesan sedang tayang, dan
    // menampilkan/menyembunyikan opsi kecepatan denyut sesuai mode.
    document.querySelectorAll("#psMsgModeRow [data-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#psMsgModeRow [data-mode]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        msgMode = btn.dataset.mode;
        if (el("psMsgPulseOptions")) el("psMsgPulseOptions").hidden = msgMode !== "pulse";
        if (el("psMsgSpeedOptions")) el("psMsgSpeedOptions").hidden = msgMode !== "scroll";
        sendMessageNow_();
      });
    });
    // BARU (7 Sep 2026 v3, permintaan operator "terlalu cepat") --
    // kecepatan mode "➡️ Berjalan" (Lambat/Sedang/Cepat), lihat rumus
    // scrollDurationFor_() di atas & applyTicker() (present.html, HARUS
    // tetap sama persis dengan yang di sini).
    document.querySelectorAll("#psMsgSpeedRow [data-speed-s]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#psMsgSpeedRow [data-speed-s]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        msgScrollBaseSec = Number(btn.dataset.speedS) || 12;
        sendMessageNow_();
      });
    });
    // BARU (7 Sep 2026 v3, permintaan operator) -- A+/A- KHUSUS ukuran
    // huruf 💬 Pesan (--p-msg-scale, present.html), terpisah dari A+/A-
    // ayat/kidung/pengumuman biasa (tab "🎨 Tampilan"). 50%-200%, langkah
    // 10%.
    function applyMsgScale_(next) {
      msgScale = Math.max(0.5, Math.min(2, next));
      if (el("psMsgScaleValue")) el("psMsgScaleValue").textContent = Math.round(msgScale * 100) + "%";
      sendMessageNow_();
    }
    if (el("psMsgScaleDec")) el("psMsgScaleDec").addEventListener("click", () => applyMsgScale_(msgScale - 0.1));
    if (el("psMsgScaleInc")) el("psMsgScaleInc").addEventListener("click", () => applyMsgScale_(msgScale + 0.1));
    document.querySelectorAll("#psMsgPulseSpeedRow [data-pulse-s]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#psMsgPulseSpeedRow [data-pulse-s]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        msgPulseSeconds = Number(btn.dataset.pulseS) || 2;
        if (el("psMsgPulseCustom")) el("psMsgPulseCustom").value = "";
        sendMessageNow_();
      });
    });
    if (el("psMsgPulseCustomBtn")) {
      el("psMsgPulseCustomBtn").addEventListener("click", () => {
        const v = Number(el("psMsgPulseCustom") && el("psMsgPulseCustom").value);
        if (!v || v <= 0) return;
        msgPulseSeconds = v;
        document.querySelectorAll("#psMsgPulseSpeedRow [data-pulse-s]").forEach((b) => b.classList.remove("active"));
        sendMessageNow_();
      });
    }
    // BARU (7 Sep 2026 v2) -- checklist border latar bar pesan (Tanpa/
    // Merah/Putih/Biru) -- 1 aktif pada satu waktu (dipilih lewat class
    // "active", sama pola seperti Warna Teks/Posisi di atas).
    document.querySelectorAll("#psMsgBorderRow [data-border]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#psMsgBorderRow [data-border]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        msgBorderColor = btn.dataset.border;
        if (el("psMsgBorderWidthWrap")) el("psMsgBorderWidthWrap").hidden = !msgBorderColor;
        sendMessageNow_();
      });
    });
    document.querySelectorAll("#psMsgBorderWidthRow [data-border-w]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#psMsgBorderWidthRow [data-border-w]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        msgBorderWidth = Number(btn.dataset.borderW) || 4;
        sendMessageNow_();
      });
    });
    // BARU (8 Sep 2026, permintaan operator "background pesan merah
    // semua") -- checklist LATAR/BACKGROUND bar pesan PENUH SOLID
    // (Tanpa=gelap bawaan/Merah/Putih/Biru), sama pola seperti Border di
    // atas tapi ini yang mengisi SELURUH latar bar, bukan cuma garis
    // tepi. Bisa dikombinasikan bebas dengan Border (mis. latar Merah
    // penuh + tanpa border, atau latar Merah + border Putih).
    document.querySelectorAll("#psMsgBgRow [data-msgbg]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#psMsgBgRow [data-msgbg]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        msgBgColor = btn.dataset.msgbg;
        sendMessageNow_();
      });
    });
    if (el("psMsgBgCustom")) {
      el("psMsgBgCustom").addEventListener("input", () => {
        document.querySelectorAll("#psMsgBgRow [data-msgbg]").forEach((b) => b.classList.remove("active"));
        msgBgColor = el("psMsgBgCustom").value;
        sendMessageNow_();
      });
    }
    if (el("psMsgFont")) {
      el("psMsgFont").addEventListener("change", () => {
        msgFont = el("psMsgFont").value;
        sendMessageNow_();
      });
    }
    if (el("psMsgStroke")) {
      el("psMsgStroke").addEventListener("change", () => {
        msgStrokeOn = el("psMsgStroke").checked;
        if (el("psMsgStrokeOptions")) el("psMsgStrokeOptions").hidden = !msgStrokeOn;
        sendMessageNow_();
      });
    }
    document.querySelectorAll("#psMsgStrokeColorRow .ps-color-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll("#psMsgStrokeColorRow .ps-color-chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        msgStrokeColor = chip.dataset.color;
        if (el("psMsgStrokeColorCustom")) el("psMsgStrokeColorCustom").value = msgStrokeColor;
        sendMessageNow_();
      });
    });
    document.querySelectorAll("#psMsgStrokeWidthRow [data-stroke-w]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#psMsgStrokeWidthRow [data-stroke-w]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        msgStrokeWidth = Number(btn.dataset.strokeW) || 2;
        sendMessageNow_();
      });
    });
    document.querySelectorAll("#psMsgColorRow .ps-color-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll("#psMsgColorRow .ps-color-chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        msgColor = chip.dataset.color;
        if (el("psMsgColorCustom")) el("psMsgColorCustom").value = msgColor;
        sendMessageNow_(); // no-op kalau pesan belum tayang (msgRunning masih false)
      });
    });
    // BARU (7 Sep 2026 v3, permintaan operator "warna 24K apa saja") --
    // pemilih warna BEBAS (24-bit penuh), pelengkap 7 chip preset di
    // atas -- pola SAMA dengan psCamInkColor (tab Kamera).
    if (el("psMsgColorCustom")) {
      el("psMsgColorCustom").addEventListener("input", () => {
        document.querySelectorAll("#psMsgColorRow .ps-color-chip").forEach((c) => c.classList.remove("active"));
        msgColor = el("psMsgColorCustom").value;
        sendMessageNow_();
      });
    }
    if (el("psMsgStrokeColorCustom")) {
      el("psMsgStrokeColorCustom").addEventListener("input", () => {
        document.querySelectorAll("#psMsgStrokeColorRow .ps-color-chip").forEach((c) => c.classList.remove("active"));
        msgStrokeColor = el("psMsgStrokeColorCustom").value;
        sendMessageNow_();
      });
    }
    document.querySelectorAll("#psMsgPosRow [data-pos]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#psMsgPosRow [data-pos]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        msgPos = btn.dataset.pos;
        sendMessageNow_(); // no-op kalau pesan belum tayang (msgRunning masih false)
      });
    });
    if (el("psMsgToggleBtn")) {
      el("psMsgToggleBtn").addEventListener("click", () => {
        msgRunning = !msgRunning;
        const btn = el("psMsgToggleBtn");
        const text = (el("psMsgText") && el("psMsgText").value.trim()) || "";
        if (msgRunning) {
          // PERBAIKAN (7 Sep 2026 v3, laporan operator "harus dipancing
          // Diam dulu baru Berjalan bisa muncul") -- SEBELUMNYA kalau
          // kotak teks masih kosong saat "▶️ Tayangkan" ditekan, fungsi
          // ini diam-diam GAGAL (langsung `return` tanpa tanda apa pun)
          // -- operator tidak tahu kenapa tidak ada reaksi, kadang
          // mengira mode "Berjalan" yang bermasalah padahal cuma lupa
          // isi teks. Sekarang kasih tanda kedip merah di kotak teks
          // supaya jelas.
          if (!text) {
            msgRunning = false;
            if (el("psMsgText")) {
              el("psMsgText").style.outline = "2px solid #d9463a";
              setTimeout(() => { if (el("psMsgText")) el("psMsgText").style.outline = ""; }, 500);
            }
            return;
          }
          btn.textContent = "⏹️ Stop";
          btn.classList.add("blinking");
          sendMessageNow_();
        } else {
          btn.textContent = "▶️ Tayangkan";
          btn.classList.remove("blinking");
          hideAllMessageBars_();
          stopScrollProgress_();
        }
      });
    }
  }

  // ------------------------------------------------------------
  // Timer
  // ------------------------------------------------------------
  // BARU (6 Sep 2026, permintaan operator) -- state machine standby/
  // berjalan/dijeda/selesai, gantikan boolean timerRunning lama (yang
  // cuma bisa bedakan "jalan" vs "tidak jalan", tidak cukup untuk
  // membedakan "belum pernah dimulai" vs "sempat jalan lalu dijeda").
  //   "standby" -- durasi sudah dipilih (preset/custom) TAPI belum
  //                ditekan Mulai (ATAU baru saja "🔁 Ulang" ditekan).
  //                Angka BERKEDIP (lihat .ps-timer-standby, css/style.css)
  //                supaya jelas ini status "siap, tinggal ditekan" --
  //                permintaan operator persis, lihat referensi HP.
  //   "running"  -- sedang menghitung mundur, dikirim ke Layar 2.
  //   "paused"   -- dijeda di tengah jalan ("⏸️ Jeda" ditekan) -- angka
  //                 BEKU (tidak berkedip, tidak berubah) di sisa waktu
  //                 terakhir, TIDAK dikirim "stop" ke Layar 2 (overlay
  //                 tetap kelihatan beku di sana juga, lihat action
  //                 "pause" BARU di present.html) -- operator bisa
  //                 "▶️ Lanjut" (meneruskan dari sisa waktu itu) ATAU
  //                 "🔁 Ulang" (kembali ke standby, durasi awal lagi).
  //   "done"     -- hitungan sampai 0 sendiri (lihat startTimer() di
  //                 bawah) -- angka merah solid (.done, TIDAK berkedip),
  //                 satu-satunya tombol yang tersisa "🔁 Ulang".
  // ------------------------------------------------------------
  let timerState_ = "standby";
  let timerRemainingAtPause_ = null; // detik sisa saat "⏸️ Jeda" ditekan -- null kalau tidak sedang dijeda
  // BARU (7 Sep 2026, permintaan operator) -- "👁️ Tampilkan ke Layar 2":
  // operator bisa menayangkan status "siap, belum mulai" (angka BERKEDIP
  // + label "MULAI") ke Layar 2 LEBIH DULU, sebelum menekan "▶️ Mulai" --
  // supaya jemaat sudah tahu ada timer yang akan berjalan. timerPreviewing_
  // TRUE berarti overlay standby ini SEDANG tayang di Layar 2 (dikirim
  // ulang otomatis tiap durasi/label berubah, lihat sendTimerStandbyPreview_()
  // di bawah) -- otomatis jadi FALSE lagi begitu "▶️ Mulai" ditekan (Layar 2
  // beralih dari berkedip ke menghitung beneran) ATAU "🔁 Ulang" ditekan.
  let timerPreviewing_ = false;

  // BARU (7 Sep 2026, permintaan operator) -- MODE Timer: "duration"
  // (SEPERTI SEBELUMNYA, hitung mundur dari sekian menit/detik) atau
  // "clock" (🎯 Countdown ke Jam Target -- hitung mundur ke satu titik
  // JAM DINDING tertentu, mis. "countdown sampai jam 19:00"). Variabel
  // timerState_/timerPreviewing_ di atas TETAP dipakai APA ADANYA untuk
  // kedua mode (standby/running/done -- mode "clock" SENGAJA tidak
  // pernah masuk status "paused", lihat catatan panjang startTimerClock_()
  // di bawah untuk alasannya) supaya renderTimerUi_() satu-satunya
  // tetap jadi sumber kebenaran tombol mana yang tampil.
  let timerMode_ = "duration";
  let timerClockEndAt_ = null; // epoch ms jam target -- null kalau tidak sedang berjalan
  let timerClockDisplayInterval_ = null;
  // BARU (12 Sep 2026 v2) -- mode ke-3 "🕐 Jam" (jam dinding BERJALAN,
  // beda dari "clock"/Jam Target di atas yang hitung MUNDUR ke 1 titik
  // -- mode ini TIDAK PERNAH "selesai", cuma terus menampilkan jam
  // sekarang sampai dihentikan manual). Numpang timerClockWrap/
  // timerClockDisplayInterval_ punya "clock" untuk pratinjau standby
  // (lihat syncTimerNowPreview_()), tapi START/STOP-nya sendiri
  // (rawPost type:"timerclock") lewat startTimerNow_()/stopTimerNow_()
  // di bawah, dibedakan dari mode "clock" lewat flag `isNow:true`.
  let timerNowStyle_ = "digital"; // "digital" | "analog" -- lihat psTimerNowStyleRow (index.html)
  let timerNowPreviewInterval_ = null;

  function fmtMMSS(totalSec) {
    const s = Math.max(0, Math.round(totalSec));
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }

  // Format JAM:MENIT:DETIK (dipakai KHUSUS mode "clock" -- durasi ke jam
  // target bisa berjam-jam, MM:SS di atas tidak cukup) -- pola SAMA
  // seperti fmtClockCountdown() di present.html, HARUS SAMA PERSIS supaya
  // angka yang operator lihat di Studio = angka yang jemaat lihat di
  // Layar 2.
  function fmtHMS_(totalSec) {
    const s = Math.max(0, Math.round(totalSec));
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const p2 = (n) => String(n).padStart(2, "0");
    return p2(hh) + ":" + p2(mm) + ":" + p2(ss);
  }

  // Hitung epoch ms dari <input type="time"> #psTimerClockTarget, SELALU
  // dianggap HARI INI (tanggal sekarang) -- null kalau input kosong/tidak
  // valid. TIDAK otomatis "besok" kalau ternyata jamnya sudah lewat dari
  // sekarang -- itu ditolak eksplisit di startTimerClock_() di bawah,
  // supaya operator sadar & bisa perbaiki (misalnya salah AM/PM/lupa
  // tanggal), bukan diam-diam melompat ke hari berikutnya.
  function computeTimerClockTargetMs_() {
    const inp = el("psTimerClockTarget");
    if (!inp || !inp.value) return null;
    const parts = inp.value.split(":");
    const hh = Number(parts[0]);
    const mm = Number(parts[1]);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0).getTime();
  }

  // Perbarui angka pratinjau (#psTimerDisplay) untuk mode "clock" SAAT
  // standby (belum ditekan Mulai) -- statis (tidak nge-tick tiap detik),
  // pola SAMA seperti setTimerCustomSeconds() untuk mode "duration" --
  // cukup dihitung ulang tiap kali jam target diubah.
  function syncTimerClockPreview_() {
    if (timerMode_ !== "clock") return;
    const disp = el("psTimerDisplay");
    if (!disp) return;
    const targetMs = computeTimerClockTargetMs_();
    disp.textContent = targetMs == null ? "00:00:00" : fmtHMS_(Math.max(0, (targetMs - Date.now()) / 1000));
  }

  // BARU (12 Sep 2026 v2) -- pratinjau (#psTimerDisplay) untuk mode
  // "🕐 Jam" SAAT standby -- BEDA dari syncTimerClockPreview_() di atas
  // (yang statis, cuma dihitung ulang saat jam target diubah): di sini
  // jamnya sendiri terus berjalan (jam dinding sungguhan), jadi perlu
  // interval sendiri supaya pratinjau di Studio pun ikut berdetak,
  // bukan cuma diam di angka saat mode pertama dipilih. Interval
  // DIHENTIKAN begitu timer benar-benar mulai (lihat startTimerNow_())
  // atau mode diganti (lihat setTimerMode_()).
  function stopTimerNowPreview_() {
    if (timerNowPreviewInterval_) { clearInterval(timerNowPreviewInterval_); timerNowPreviewInterval_ = null; }
  }
  function syncTimerNowPreview_() {
    if (timerMode_ !== "now") return;
    const disp = el("psTimerDisplay");
    if (!disp) return;
    const tick = () => { disp.textContent = fmtHMS_((Date.now() - new Date().setHours(0, 0, 0, 0)) / 1000); };
    tick();
    stopTimerNowPreview_();
    timerNowPreviewInterval_ = setInterval(tick, 1000);
  }

  // Menampilkan/menyembunyikan tombol Timer sesuai timerState_ SEKARANG
  // -- SATU-SATUNYA tempat yang boleh mengubah `hidden`/teks tombol,
  // supaya tidak ada 2 tempat kode yang bisa saling menimpa keputusan
  // status yang mana yang lagi aktif.
  function renderTimerUi_() {
    const startBtn = el("psTimerStartBtn");
    const pauseBtn = el("psTimerStopBtn");
    const resetBtn = el("psTimerCancelBtn");
    const previewBtn = el("psTimerPreviewBtn"); // BARU 7 Sep 2026
    const modeBtns = Array.from(document.querySelectorAll("[data-timer-mode]"));
    const disp = el("psTimerDisplay");
    const isClock = timerMode_ === "clock";
    // BARU (12 Sep 2026 v2) -- mode ke-3 "🕐 Jam" (jam dinding berjalan).
    // Diperlakukan SAMA seperti "clock" (Jam Target) untuk hal-hal yang
    // memang tidak masuk akal di kedua mode itu (Jeda/Lanjut, pratinjau
    // standby berkedip) -- lihat catatan masing-masing di bawah.
    const isNow = timerMode_ === "now";
    const isNonDuration = isClock || isNow;
    if (disp) {
      disp.classList.toggle("ps-timer-standby", timerState_ === "standby");
      disp.classList.toggle("done", timerState_ === "done");
    }
    if (startBtn) {
      startBtn.hidden = timerState_ === "running" || timerState_ === "done";
      startBtn.textContent = (!isNonDuration && timerState_ === "paused") ? "▶️ Lanjut" : "▶️ Mulai";
      startBtn.title = (!isNonDuration && timerState_ === "paused") ? "Lanjutkan dari sisa waktu" : "Mulai";
    }
    // BARU (7 Sep 2026) -- "⏸️ Jeda" TIDAK berlaku untuk mode "clock"
    // ATAU "now" (BARU 12 Sep 2026 v2): jam target sudah pasti (mis. jam
    // 19:00) atau memang jam dinding sungguhan -- "dijeda" lalu
    // "dilanjut" tidak masuk akal untuk keduanya. Lihat catatan panjang
    // startTimerClock_() di bawah.
    if (pauseBtn) pauseBtn.hidden = isNonDuration || timerState_ !== "running";
    if (resetBtn) {
      resetBtn.hidden = timerState_ === "standby";
      resetBtn.textContent = isNonDuration ? "⏹️ Hentikan" : "🔁 Ulang";
      resetBtn.title = isNonDuration ? "Hentikan & sembunyikan dari Layar 2" : "Ulang dari standby";
    }
    // BARU (7 Sep 2026) -- "👁️ Tampilkan" (preview standby berkedip) cuma
    // relevan SAAT standby & mode "duration" -- belum didukung utk
    // "clock"/"now" (jam target/jam dinding tidak butuh pratinjau
    // berkedip, jam-nya sudah jelas/langsung berjalan).
    if (previewBtn) previewBtn.hidden = isNonDuration || timerState_ !== "standby";
    // BARU (7 Sep 2026) -- ganti mode HANYA bisa saat standby (belum
    // berjalan) -- kalau sedang berjalan/dijeda/selesai, tombol mode
    // dinonaktifkan supaya operator tidak bingung ganti mode di tengah
    // sesi yang sedang tayang (harus Ulang/Hentikan dulu).
    modeBtns.forEach((b) => {
      b.classList.toggle("active", b.dataset.timerMode === timerMode_);
      b.disabled = timerState_ !== "standby";
    });
    if (el("psTimerLabelRow")) el("psTimerLabelRow").hidden = isNonDuration;
    if (el("psTimerLabelPreview")) el("psTimerLabelPreview").hidden = isNonDuration;
    if (el("psTimerDurationFields")) el("psTimerDurationFields").hidden = isNonDuration;
    if (el("psTimerClockFields")) el("psTimerClockFields").hidden = !isClock;
    if (el("psTimerNowFields")) el("psTimerNowFields").hidden = !isNow;
    if (isNow && timerState_ === "standby") syncTimerNowPreview_();
    else if (!isNow) stopTimerNowPreview_();
  }

  // BARU (7 Sep 2026) -- kirim ULANG overlay standby ke Layar 2 kalau
  // sedang ditayangkan (timerPreviewing_ true), dipanggil tiap durasi/
  // label berubah supaya Layar 2 selalu ikut durasi/label TERBARU yang
  // dipilih operator, bukan angka lama saat "👁️ Tampilkan" pertama ditekan.
  function sendTimerStandbyPreview_() {
    if (!timerPreviewing_) return;
    const label = (el("psTimerLabel") && el("psTimerLabel").value.trim()) || "Sesi Bagi Nikmat";
    rawPost({ type: "timer", action: "standby", label, totalSeconds: timerTotal });
  }

  // "👁️ Tampilkan ke Layar 2" / "🙈 Sembunyikan" -- toggle overlay standby
  // (angka berkedip + label "MULAI") di Layar 2, TANPA memulai hitungan.
  function toggleTimerPreview_() {
    const btn = el("psTimerPreviewBtn");
    if (!timerPreviewing_) {
      if (timerTotal <= 0) { flashTimerNeedsDuration(); return; } // belum pilih durasi -- sama seperti "▶️ Mulai" tanpa durasi
      timerPreviewing_ = true;
      sendTimerStandbyPreview_();
      if (btn) { btn.textContent = "🙈 Sembunyikan dari Layar 2"; btn.classList.add("blinking"); }
    } else {
      timerPreviewing_ = false;
      rawPost({ type: "timer", action: "stop" });
      if (btn) { btn.textContent = "👁️ Tampilkan ke Layar 2"; btn.classList.remove("blinking"); }
    }
  }

  function setTimerCustomSeconds(sec) {
    timerState_ = "standby";
    timerRemainingAtPause_ = null;
    if (el("psTimerDisplay")) el("psTimerDisplay").textContent = fmtMMSS(sec);
    timerTotal = sec;
    renderTimerUi_();
    sendTimerStandbyPreview_(); // BARU 7 Sep 2026 -- ikut update Layar 2 kalau sedang di-preview
  }

  function syncTimerLabelPreview() {
    const preview = el("psTimerLabelPreview");
    if (!preview) return;
    const label = (el("psTimerLabel") && el("psTimerLabel").value.trim()) || "Sesi Bagi Nikmat";
    preview.textContent = label;
    sendTimerStandbyPreview_(); // BARU 7 Sep 2026 -- ikut update Layar 2 kalau sedang di-preview
  }

  // `resumeEndAt`/`resumeTotal` (opsional) -- dipakai KHUSUS oleh
  // resumeTimer_() di bawah untuk "▶️ Lanjut": endAt BARU (dihitung dari
  // sisa waktu saat dijeda) tapi `totalSeconds` yang dikirim ke Layar 2
  // tetap DURASI ASLI (bukan sisa waktunya) -- supaya cincin progres
  // (#timerRingFg, present.html) melanjutkan dari posisi yang benar,
  // bukan terlihat "penuh lagi dari 0%" seperti mulai baru.
  function startTimer(totalSeconds, resumeEndAt, resumeTotal) {
    stopTimerDisplay();
    timerTotal = resumeTotal || totalSeconds;
    timerEndAt = resumeEndAt || (Date.now() + totalSeconds * 1000);
    timerState_ = "running";
    timerRemainingAtPause_ = null;
    // BARU (7 Sep 2026) -- overlay standby (kalau sempat ditayangkan)
    // otomatis "dikonsumsi" begitu beneran Mulai -- Layar 2 beralih dari
    // berkedip ke menghitung, tombol "👁️ Tampilkan" balik ke teks awal.
    if (timerPreviewing_) {
      timerPreviewing_ = false;
      const previewBtn = el("psTimerPreviewBtn");
      if (previewBtn) { previewBtn.textContent = "👁️ Tampilkan ke Layar 2"; previewBtn.classList.remove("blinking"); }
    }
    const label = (el("psTimerLabel") && el("psTimerLabel").value.trim()) || "Sesi Bagi Nikmat";
    const bell = !!(el("psTimerBell") && el("psTimerBell").checked);
    const bellKey = getSelectedBellKey_();
    syncTimerLabelPreview();
    rawPost({ type: "timer", action: resumeEndAt ? "resume" : "start", label, totalSeconds: timerTotal, endAt: timerEndAt, bell, bellKey });
    renderTimerUi_();
    const disp = el("psTimerDisplay");
    timerDisplayInterval = setInterval(() => {
      const remain = (timerEndAt - Date.now()) / 1000;
      if (disp) {
        disp.textContent = fmtMMSS(remain);
      }
      if (remain <= 0) {
        clearInterval(timerDisplayInterval); timerDisplayInterval = null;
        timerState_ = "done";
        renderTimerUi_();
      }
    }, 250);
  }

  // "⏸️ Jeda" -- BEDA dari stopTimer() di bawah: Layar 2 TETAP tampil,
  // beku di sisa waktu terakhir (lihat action "pause" BARU di
  // present.html, tickTimer() cukup berhenti dipanggil, state-nya TIDAK
  // di-null-kan seperti stopTimer()).
  function pauseTimer_() {
    if (timerState_ !== "running") return;
    const remain = Math.max(0, (timerEndAt - Date.now()) / 1000);
    stopTimerDisplay();
    timerRemainingAtPause_ = remain;
    timerState_ = "paused";
    rawPost({ type: "timer", action: "pause" });
    renderTimerUi_();
  }

  function resumeTimer_() {
    if (timerState_ !== "paused" || timerRemainingAtPause_ == null) return;
    const newEndAt = Date.now() + timerRemainingAtPause_ * 1000;
    startTimer(timerRemainingAtPause_, newEndAt, timerTotal);
  }

  function stopTimerDisplay() {
    if (timerDisplayInterval) { clearInterval(timerDisplayInterval); timerDisplayInterval = null; }
  }

  // "🔁 Ulang" -- kembali ke status "standby" dengan DURASI ASLI yang
  // tadi dipilih (preset/custom), siap ditekan "▶️ Mulai" lagi -- beda
  // dari psTimerCancelBtn LAMA (dulu "✖️ Batal", mengosongkan durasi ke
  // 0) -- lihat catatan HTML index.html untuk alasan tombol ini dipakai
  // ulang (bukan ditambah tombol baru).
  function resetTimerToStandby_() {
    stopTimerDisplay();
    timerRemainingAtPause_ = null;
    // BARU (7 Sep 2026) -- matikan juga status preview supaya tidak
    // nyangkut "🙈 Sembunyikan" padahal overlay-nya sudah disembunyikan
    // paksa oleh action "stop" di bawah.
    timerPreviewing_ = false;
    const previewBtn = el("psTimerPreviewBtn");
    if (previewBtn) { previewBtn.textContent = "👁️ Tampilkan ke Layar 2"; previewBtn.classList.remove("blinking"); }
    rawPost({ type: "timer", action: "stop" }); // sembunyikan overlay Layar 2 (kalau sedang tayang/dijeda)
    setTimerCustomSeconds(timerTotal); // balik ke standby, DURASI SAMA seperti sebelumnya (bukan 0)
  }

  function stopTimer() {
    // Dipertahankan untuk pemanggil lama (mis. saat panel Studio
    // ditutup) -- perilakunya SEKARANG sama seperti "🔁 Ulang".
    resetTimerToStandby_();
  }

  function flashTimerNeedsDuration() {
    const disp = el("psTimerDisplay");
    if (!disp) return;
    disp.classList.add("done");
    setTimeout(() => { if (timerState_ !== "done") disp.classList.remove("done"); }, 500);
  }

  // ------------------------------------------------------------
  // BARU (7 Sep 2026, permintaan operator) -- 🎯 Countdown ke Jam Target.
  // BEDA dari startTimer()/dst di atas (yang hitung mundur dari SATU
  // DURASI) -- ini hitung mundur ke SATU TITIK WAKTU JAM DINDING
  // tertentu (mis. "countdown sampai jam 19:00"), makanya:
  //   - `endAt` dihitung LANGSUNG dari <input type="time"> saat "▶️ Mulai"
  //     ditekan (computeTimerClockTargetMs_() di atas), BUKAN dari
  //     Date.now() + durasi seperti startTimer().
  //   - TIDAK ada Jeda/Lanjut (lihat renderTimerUi_() di atas) -- cuma
  //     Mulai & Hentikan (⏹️, pakai psTimerCancelBtn yang sama, teksnya
  //     berganti otomatis lewat renderTimerUi_()).
  //   - Dikirim ke Layar 2 lewat pesan TERPISAH `{type:"timerclock",...}`
  //     (BUKAN `{type:"timer",...}`) supaya tidak tercampur dengan Timer
  //     ring biasa -- lihat showTimerClock() (present.html) untuk
  //     tampilannya yang SENGAJA beda (polos, di tengah panggung agak ke
  //     bawah, tanpa cincin -- cocok ditumpuk di atas 🖼️ Latar Gambar).
  //   - Begitu jam target tercapai, angka berhenti diam di 00:00:00
  //     (TIDAK lanjut minus) -- baik di Studio (interval di bawah
  //     berhenti sendiri) maupun di Layar 2 (lihat tickTimerClock() di
  //     present.html) -- operator tekan "⏹️ Hentikan" manual kalau sesi
  //     dianggap sudah selesai.
  // ------------------------------------------------------------
  function stopTimerClockDisplay_() {
    if (timerClockDisplayInterval_) { clearInterval(timerClockDisplayInterval_); timerClockDisplayInterval_ = null; }
  }

  function startTimerClock_() {
    const targetMs = computeTimerClockTargetMs_();
    if (targetMs == null) { flashTimerNeedsDuration(); return; } // belum diisi jam target sama sekali
    if (targetMs <= Date.now()) {
      // Jam target sudah lewat hari ini -- SENGAJA ditolak (bukan
      // otomatis dianggap "besok"), lihat catatan panjang
      // computeTimerClockTargetMs_() di atas.
      flashTimerNeedsDuration();
      alert("Jam target sudah lewat dari sekarang -- pilih jam yang masih akan datang hari ini.");
      return;
    }
    stopTimerClockDisplay_();
    timerClockEndAt_ = targetMs;
    timerState_ = "running";
    const caption = (el("psTimerClockCaption") && el("psTimerClockCaption").value.trim()) || "";
    const bell = !!(el("psTimerBell") && el("psTimerBell").checked);
    const bellKey = getSelectedBellKey_();
    rawPost({ type: "timerclock", action: "start", caption, endAt: timerClockEndAt_, bell, bellKey });
    renderTimerUi_();
    const disp = el("psTimerDisplay");
    timerClockDisplayInterval_ = setInterval(() => {
      const remain = (timerClockEndAt_ - Date.now()) / 1000;
      if (disp) disp.textContent = fmtHMS_(remain);
      if (remain <= 0) {
        stopTimerClockDisplay_();
        timerState_ = "done";
        renderTimerUi_();
      }
    }, 250);
  }

  function stopTimerClock_() {
    stopTimerClockDisplay_();
    timerClockEndAt_ = null;
    timerState_ = "standby";
    rawPost({ type: "timerclock", action: "stop" });
    syncTimerClockPreview_();
    renderTimerUi_();
  }

  // BARU (12 Sep 2026 v2) -- mulai/hentikan mode "🕐 Jam" (jam dinding
  // BERJALAN, lihat catatan panjang timerNowStyle_/timerNowPreviewInterval_
  // di atas). Numpang rawPost type:"timerclock" SAMA seperti mode "clock"
  // (Jam Target) -- present.html membedakan lewat flag `isNow:true`
  // (lihat showTimerClock() di sana), supaya tidak perlu menambah 1 jenis
  // pesan postMessage baru lagi. TIDAK ADA validasi "sudah lewat" seperti
  // startTimerClock_() (jam dinding tidak punya konsep "lewat").
  function startTimerNow_() {
    stopTimerNowPreview_();
    timerState_ = "running";
    const caption = (el("psTimerNowCaption") && el("psTimerNowCaption").value.trim()) || "";
    rawPost({ type: "timerclock", action: "start", isNow: true, nowStyle: timerNowStyle_, caption });
    renderTimerUi_();
  }
  function stopTimerNow_() {
    timerState_ = "standby";
    rawPost({ type: "timerclock", action: "stop" });
    renderTimerUi_();
  }

  // Ganti mode "Durasi" <-> "Jam Target" <-> "Jam" -- HANYA diizinkan
  // saat standby (lihat renderTimerUi_(), tombol mode dinonaktifkan
  // selain saat itu).
  function setTimerMode_(mode) {
    if (mode !== "duration" && mode !== "clock" && mode !== "now") return;
    if (timerState_ !== "standby" || timerMode_ === mode) return;
    timerMode_ = mode;
    stopTimerNowPreview_();
    if (mode === "clock") syncTimerClockPreview_();
    else if (mode === "now") syncTimerNowPreview_();
    else if (el("psTimerDisplay")) el("psTimerDisplay").textContent = fmtMMSS(timerTotal);
    renderTimerUi_();
  }

  // ------------------------------------------------------------
  // BARU (7 Sep 2026) -- 🔔 pemilih Suara Bel (CONFIG.BELL_SOUNDS, lihat
  // js/config.js bagian "10) BEL TIMER"). Pola SAMA seperti pemilih tema
  // Warna/dst yang lain di Studio: dropdown diisi dari CONFIG saat init,
  // pilihan operator disimpan per perangkat lewat localStorage supaya
  // tidak perlu dipilih ulang tiap kali buka Studio.
  // ------------------------------------------------------------
  const TIMER_BELL_CHOICE_KEY = "ps_timer_bell_choice_v1";

  // BARU (12 Sep 2026) -- SATU sumber daftar bel dipakai di SEMUA tempat
  // di file ini (dropdown, grid "Bel Cepat", jalan pintas Alt+1..9) --
  // numpang SoundFX.bellChoices() (js/soundfx.js) yang menggabungkan
  // CONFIG.BELL_SOUNDS + SEMUA efek di SOUND_FX_LIST, lihat komentar
  // panjang di bellChoices() untuk detail lengkapnya. Fallback ke
  // CONFIG.BELL_SOUNDS/"Bel 1 (Bawaan)" saja kalau soundfx.js entah
  // kenapa belum termuat (seharusnya tidak pernah terjadi).
  function getBellChoices_() {
    if (typeof SoundFX !== "undefined" && SoundFX.bellChoices) return SoundFX.bellChoices();
    const list = (typeof CONFIG !== "undefined" && Array.isArray(CONFIG.BELL_SOUNDS) && CONFIG.BELL_SOUNDS.length) ? CONFIG.BELL_SOUNDS : [];
    return list.length ? list : [{ key: "bell1", label: "🔔 Bel 1 (Bawaan)", url: "" }];
  }

  function getSelectedBellKey_() {
    const sel = el("psTimerBellSelect");
    if (sel && sel.value) return sel.value;
    return (typeof CONFIG !== "undefined" && CONFIG.TIMER_BELL_DEFAULT_KEY) || "bell1";
  }

  function populateBellSelect_() {
    const sel = el("psTimerBellSelect");
    if (!sel) return;
    const list = getBellChoices_();
    let saved = "";
    try { saved = localStorage.getItem(TIMER_BELL_CHOICE_KEY) || ""; } catch (e) {}
    const fallback = (typeof CONFIG !== "undefined" && CONFIG.TIMER_BELL_DEFAULT_KEY) || list[0].key;
    sel.innerHTML = list.map((b) => `<option value="${escapeHtml(b.key)}">${escapeHtml(b.label)}</option>`).join("");
    sel.value = list.some((b) => b.key === saved) ? saved : fallback;
    sel.addEventListener("change", () => {
      try { localStorage.setItem(TIMER_BELL_CHOICE_KEY, sel.value); } catch (e) {}
    });
  }

  function wireTimer() {
    const presetBtns = Array.from(document.querySelectorAll("[data-timer-preset]"));
    function markActivePreset(activeBtn) {
      presetBtns.forEach((b) => b.classList.toggle("active", b === activeBtn));
      if (el("psTimerCustomBtn")) el("psTimerCustomBtn").classList.toggle("active", !activeBtn);
    }
    presetBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        setTimerCustomSeconds(Number(btn.dataset.timerPreset));
        markActivePreset(btn);
      });
    });
    function applyCustom() {
      const v = Number(el("psTimerCustom") && el("psTimerCustom").value);
      if (v > 0) { setTimerCustomSeconds(v); markActivePreset(null); }
    }
    if (el("psTimerCustomBtn")) el("psTimerCustomBtn").addEventListener("click", applyCustom);
    if (el("psTimerCustom")) {
      el("psTimerCustom").addEventListener("keydown", (e) => { if (e.key === "Enter") applyCustom(); });
    }
    if (el("psTimerLabel")) el("psTimerLabel").addEventListener("input", syncTimerLabelPreview);
    // BARU (7 Sep 2026) -- toggle mode "⏱️ Durasi" / "🎯 Jam Target".
    Array.from(document.querySelectorAll("[data-timer-mode]")).forEach((btn) => {
      btn.addEventListener("click", () => setTimerMode_(btn.dataset.timerMode));
    });
    // BARU (7 Sep 2026) -- input jam target & caption, refresh pratinjau
    // (#psTimerDisplay) tiap kali diubah, pola SAMA seperti
    // setTimerCustomSeconds()/syncTimerLabelPreview() utk mode "duration".
    if (el("psTimerClockTarget")) el("psTimerClockTarget").addEventListener("input", syncTimerClockPreview_);
    // BARU (12 Sep 2026 v2) -- pilihan Model Jam (Digital/Analog) untuk
    // mode "🕐 Jam" -- disimpan di timerNowStyle_ (lokal, dipakai saat
    // "▶️ Mulai" ditekan, lihat startTimerNow_()), TIDAK perlu ikut
    // localStorage theme (murni pilihan sesaat per tayangan, bukan
    // preferensi tampilan permanen seperti Gaya Timer/Stopwatch).
    if (el("psTimerNowStyleRow")) {
      const nowStyleBtns = Array.from(el("psTimerNowStyleRow").querySelectorAll("[data-timernow-style]"));
      nowStyleBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          timerNowStyle_ = btn.dataset.timernowStyle;
          nowStyleBtns.forEach((b) => b.classList.toggle("active", b === btn));
        });
      });
    }
    // BARU (7 Sep 2026, permintaan operator) -- warna angka Jam Target.
    // 4 tombol cepat + "Ikut Tema" (data-timerclock-color="") berbagi 1
    // sumber kebenaran dengan pemilih warna bebas (psTimerClockColorCustom)
    // -- pilih salah satu tombol MENGISI pemilih warna bebas juga (supaya
    // kalau operator lanjut buka pemilih warna, mulainya dari warna yang
    // barusan dipilih, bukan warna lama), dan sebaliknya mengetik warna
    // bebas MENGHAPUS status "active" tombol cepat (tidak ada satu pun
    // yang persis cocok lagi). Dikirim ke Layar 2 lewat theme.timerClockColor
    // (lihat applyTheme(), present.html) -- "" berarti kembali ke warna
    // aksen tema seperti sebelumnya (bawaan lama, tidak ada perubahan).
    const timerClockColorBtns = Array.from(document.querySelectorAll("[data-timerclock-color]"));
    function setTimerClockColor_(color) {
      saveAndSendTheme({ timerClockColor: color });
      timerClockColorBtns.forEach((b) => b.classList.toggle("active", b.dataset.timerclockColor === color));
      if (color && el("psTimerClockColorCustom")) el("psTimerClockColorCustom").value = color;
    }
    timerClockColorBtns.forEach((btn) => {
      btn.addEventListener("click", () => setTimerClockColor_(btn.dataset.timerclockColor));
    });
    if (el("psTimerClockColorCustom")) {
      el("psTimerClockColorCustom").addEventListener("input", () => setTimerClockColor_(el("psTimerClockColorCustom").value));
    }
    // BARU (12 Sep 2026, permintaan operator "2 model tampilan untuk
    // timer dan stopwatch") -- 2 tombol "Gaya Tampilan Timer/Stopwatch"
    // (Klasik / ⭕ Lingkaran Besar), pola SAMA persis dengan tombol-
    // tombol pilihan lain di sini (1 sumber kebenaran, dikirim via
    // theme.timerStyle -- lihat CSS body.tv-bigcircle & applyTheme() di
    // present.html). Berlaku untuk Timer & Stopwatch SEKALIGUS.
    if (el("psTimerStyleRow")) {
      const timerStyleBtns = Array.from(el("psTimerStyleRow").querySelectorAll("[data-timer-style]"));
      timerStyleBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          saveAndSendTheme({ timerStyle: btn.dataset.timerStyle });
          timerStyleBtns.forEach((b) => b.classList.toggle("active", b === btn));
        });
      });
    }
    // BARU (7 Sep 2026 v3, permintaan operator) -- WARNA STROKE (kontur
    // pinggiran) angka Jam Target, pola SAMA PERSIS dengan warna angka
    // di atas (1 sumber kebenaran + pemilih bebas), cuma dikirim lewat
    // theme.timerClockStroke/timerClockStrokeWidth (applyTheme(),
    // present.html) -- "" berarti tanpa stroke sama sekali (bawaan).
    const timerClockStrokeBtns = Array.from(document.querySelectorAll("[data-timerclock-stroke]"));
    function setTimerClockStroke_(color) {
      saveAndSendTheme({ timerClockStroke: color });
      timerClockStrokeBtns.forEach((b) => b.classList.toggle("active", b.dataset.timerclockStroke === color));
      if (color && el("psTimerClockStrokeCustom")) el("psTimerClockStrokeCustom").value = color;
    }
    timerClockStrokeBtns.forEach((btn) => {
      btn.addEventListener("click", () => setTimerClockStroke_(btn.dataset.timerclockStroke));
    });
    if (el("psTimerClockStrokeCustom")) {
      el("psTimerClockStrokeCustom").addEventListener("input", () => setTimerClockStroke_(el("psTimerClockStrokeCustom").value));
    }
    Array.from(document.querySelectorAll("[data-timerclock-stroke-w]")).forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-timerclock-stroke-w]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        saveAndSendTheme({ timerClockStrokeWidth: Number(btn.dataset.timerclockStrokeW) || 3 });
      });
    });
    // BARU (7 Sep 2026, permintaan operator) -- "Posisi di Layar" (9
    // pilihan siap-pakai) untuk kotak Jam Target -- pola SAMA seperti
    // warna di atas (satu sumber kebenaran, dikirim via theme.timerClockPos).
    // "center" (bawaan) = TIDAK mengirim apa pun berbeda dari sebelumnya
    // (present.html jatuh ke CSS default top:50%/left:50% yang sudah ada).
    const timerClockPosBtns = Array.from(document.querySelectorAll("[data-timerclock-pos]"));
    function setTimerClockPos_(pos) {
      saveAndSendTheme({ timerClockPos: pos });
      timerClockPosBtns.forEach((b) => b.classList.toggle("active", b.dataset.timerclockPos === pos));
    }
    timerClockPosBtns.forEach((btn) => {
      btn.addEventListener("click", () => setTimerClockPos_(btn.dataset.timerclockPos));
    });
    // psTimerStartBtn SEKARANG dipakai 2 fungsi (lihat renderTimerUi_()):
    // "▶️ Mulai" saat standby, "▶️ Lanjut" saat dijeda -- BARU (7 Sep
    // 2026) ditambah cabang mode "clock" (startTimerClock_(), TIDAK
    // pernah "Lanjut" -- lihat catatan panjang di sana).
    if (el("psTimerStartBtn")) el("psTimerStartBtn").addEventListener("click", () => {
      if (timerMode_ === "clock") { startTimerClock_(); return; }
      if (timerMode_ === "now") { startTimerNow_(); return; } // BARU 12 Sep 2026 v2
      if (timerState_ === "paused") { resumeTimer_(); return; }
      if (timerTotal > 0) startTimer(timerTotal);
      else flashTimerNeedsDuration(); // belum pilih durasi (preset/custom) -- kasih tanda, jangan diam saja
    });
    // psTimerStopBtn SEKARANG "⏸️ Jeda" (cuma tampil saat berjalan, DAN
    // cuma utk mode "duration" -- lihat renderTimerUi_()).
    if (el("psTimerStopBtn")) el("psTimerStopBtn").addEventListener("click", () => pauseTimer_());
    // psTimerCancelBtn SEKARANG "🔁 Ulang" (mode "duration") ATAU
    // "⏹️ Hentikan" (mode "clock", BARU 7 Sep 2026) -- teks tombolnya
    // sendiri sudah diatur di renderTimerUi_().
    if (el("psTimerCancelBtn")) el("psTimerCancelBtn").addEventListener("click", () => {
      if (timerMode_ === "clock") { stopTimerClock_(); return; }
      if (timerMode_ === "now") { stopTimerNow_(); return; } // BARU 12 Sep 2026 v2
      resetTimerToStandby_();
    });
    // BARU (7 Sep 2026) -- "👁️ Tampilkan ke Layar 2", lihat toggleTimerPreview_().
    if (el("psTimerPreviewBtn")) el("psTimerPreviewBtn").addEventListener("click", () => toggleTimerPreview_());
    // BARU (7 Sep 2026) -- "🔇 Stop Bel": hentikan SUARA bel yang sedang
    // berbunyi di Layar 2 TANPA menghentikan/menyembunyikan timer-nya
    // sendiri (beda dari psTimerCancelBtn "🔁 Ulang" di atas). Kirim ke
    // KEDUA jenis pesan ("timer" & "timerclock") supaya bekerja apa pun
    // mode yang sedang tayang di Layar 2.
    if (el("psTimerStopBellBtn")) el("psTimerStopBellBtn").addEventListener("click", () => {
      rawPost({ type: "timer", action: "stopBell" });
      rawPost({ type: "timerclock", action: "stopBell" });
    });
    populateBellSelect_();
    syncTimerLabelPreview();
    renderTimerUi_();
  }

  // ------------------------------------------------------------
  // BARU (27 Agu 2026) -- ⏱️ Stopwatch, hitung MAJU dari 0 (beda dari
  // ⏱️ Timer hitung mundur di atas). Dikendalikan dari Studio (di sini)
  // MAUPUN panel sederhana HP (js/presentation.js, wireStopwatchSimple())
  // -- keduanya kirim pesan `{type:"stopwatch", ...}` yang SAMA persis ke
  // Layar 2 (present.html, lihat showStopwatch() di sana), cuma beda
  // elemen DOM yang dipakai (prefix "ps" utk Studio, "present" utk panel
  // sederhana) -- lihat juga wireStopwatchSimple() di js/presentation.js.
  //
  // BARU (6 Sep 2026, permintaan operator) -- state machine standby/
  // berjalan/dijeda (pola SAMA seperti Timer di atas, TANPA status
  // "selesai" karena stopwatch hitung MAJU, tidak ada target akhir) +
  // "🚩 Penanda" (lap) khusus muncul saat berjalan.
  // ------------------------------------------------------------
  let swBaseStartAt = null; // Date.now() - (durasi yang sudah berjalan sejauh ini, dalam ms) -- SELAMA berjalan
  let swAccumulatedMs = 0; // durasi yang sudah terkumpul SAAT dijeda (dipakai start() berikutnya untuk melanjutkan, bukan mengulang dari 0)
  let swState_ = "standby"; // "standby" | "running" | "paused"
  let swDisplayInterval = null;
  let swLaps_ = []; // { n, splitSec, totalSec } -- operator-side saja, lihat .ps-stopwatch-laps (css/style.css)
  // BARU (7 Sep 2026) -- "👁️ Tampilkan ke Layar 2" untuk Stopwatch, pola
  // SAMA persis dengan Timer (lihat timerPreviewing_ & catatan panjangnya
  // di atas) -- overlay standby "00:00" berkedip + label "MULAI", otomatis
  // "dikonsumsi" begitu "▶️ Mulai" beneran ditekan.
  let swPreviewing_ = false;

  function fmtStopwatch(totalSec) {
    const s = Math.max(0, Math.floor(totalSec));
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const pad2 = (n) => String(n).padStart(2, "0");
    return hh > 0 ? `${hh}:${pad2(mm)}:${pad2(ss)}` : `${pad2(mm)}:${pad2(ss)}`;
  }

  function renderStopwatchUi_() {
    const startBtn = el("psStopwatchStartBtn");
    const lapBtn = el("psStopwatchLapBtn");
    const pauseBtn = el("psStopwatchStopBtn");
    const resetBtn = el("psStopwatchResetBtn");
    const previewBtn = el("psStopwatchPreviewBtn"); // BARU 7 Sep 2026
    const disp = el("psStopwatchDisplay");
    if (disp) disp.classList.toggle("ps-timer-standby", swState_ === "standby");
    if (startBtn) {
      startBtn.hidden = swState_ === "running";
      startBtn.textContent = swState_ === "paused" ? "▶️ Lanjut" : "▶️ Mulai";
      startBtn.title = swState_ === "paused" ? "Lanjutkan dari angka ini" : "Mulai";
    }
    if (lapBtn) lapBtn.hidden = swState_ !== "running";
    if (pauseBtn) pauseBtn.hidden = swState_ !== "running";
    if (resetBtn) resetBtn.hidden = swState_ !== "paused";
    // BARU (7 Sep 2026) -- "👁️ Tampilkan" cuma relevan saat standby, sama
    // seperti Timer (lihat renderTimerUi_()).
    if (previewBtn) previewBtn.hidden = swState_ !== "standby";
  }

  // BARU (7 Sep 2026) -- toggle overlay standby Stopwatch ("00:00"
  // berkedip + label) di Layar 2, pola SAMA persis dengan
  // toggleTimerPreview_() di atas.
  function toggleStopwatchPreview_() {
    const btn = el("psStopwatchPreviewBtn");
    const labelEl = el("psStopwatchLabel");
    if (!swPreviewing_) {
      swPreviewing_ = true;
      rawPost({ type: "stopwatch", action: "standby", label: (labelEl && labelEl.value.trim()) || "" });
      if (btn) { btn.textContent = "🙈 Sembunyikan dari Layar 2"; btn.classList.add("blinking"); }
    } else {
      swPreviewing_ = false;
      rawPost({ type: "stopwatch", action: "reset" });
      if (btn) { btn.textContent = "👁️ Tampilkan ke Layar 2"; btn.classList.remove("blinking"); }
    }
  }

  function renderStopwatchLaps_() {
    const box = el("psStopwatchLaps");
    if (!box) return;
    if (!swLaps_.length) { box.innerHTML = ""; return; }
    box.innerHTML = swLaps_.map((l) =>
      `<div class="ps-stopwatch-laps-row"><span>Penanda ${l.n}</span><span>+${fmtStopwatch(l.splitSec)}</span><span>${fmtStopwatch(l.totalSec)}</span></div>`
    ).reverse().join("");
  }

  function wireStopwatch() {
    const labelEl = el("psStopwatchLabel");
    const labelPreview = el("psStopwatchLabelPreview");
    const disp = el("psStopwatchDisplay");
    function syncLabelPreview() {
      if (labelPreview) labelPreview.textContent = (labelEl && labelEl.value.trim()) || "";
      // BARU (7 Sep 2026) -- ikut update Layar 2 kalau overlay standby
      // sedang ditayangkan (lihat toggleStopwatchPreview_()).
      if (swPreviewing_) rawPost({ type: "stopwatch", action: "standby", label: (labelEl && labelEl.value.trim()) || "" });
    }
    function currentElapsedSec() {
      if (swBaseStartAt == null) return 0;
      return (Date.now() - swBaseStartAt) / 1000;
    }
    function tick() {
      if (swState_ !== "running" || swBaseStartAt == null) return;
      if (disp) disp.textContent = fmtStopwatch(currentElapsedSec());
    }
    function start() {
      if (swState_ === "running") return;
      // Melanjutkan dari jeda (swAccumulatedMs > 0) ATAU mulai murni dari
      // 0 -- baseStartAt digeser mundur sejauh durasi yang SUDAH terkumpul
      // supaya "Date.now() - baseStartAt" tetap menghasilkan total yang
      // benar tanpa perlu melacak jeda secara terpisah di Layar 2.
      swBaseStartAt = Date.now() - swAccumulatedMs;
      swState_ = "running";
      const label = (labelEl && labelEl.value.trim()) || "";
      rawPost({ type: "stopwatch", action: "start", label, baseStartAt: swBaseStartAt });
      // BARU (7 Sep 2026) -- overlay standby (kalau sempat ditayangkan)
      // otomatis "dikonsumsi" begitu beneran Mulai, sama seperti Timer.
      if (swPreviewing_) {
        swPreviewing_ = false;
        if (el("psStopwatchPreviewBtn")) { el("psStopwatchPreviewBtn").textContent = "👁️ Tampilkan ke Layar 2"; el("psStopwatchPreviewBtn").classList.remove("blinking"); }
      }
      if (swDisplayInterval) clearInterval(swDisplayInterval);
      swDisplayInterval = setInterval(tick, 250);
      tick();
      renderStopwatchUi_();
    }
    // "🚩 Penanda" -- MENYALIN angka yang SEDANG tampil ke daftar kecil
    // di bawah (operator-side).
    // BARU (7 Sep 2026, permintaan operator) -- penanda TERBARU (nomor +
    // selisih) SEKARANG juga dikirim ke Layar 2 (lihat showStopwatchLap_()
    // di present.html), muncul sebentar sebagai badge kecil di bawah angka
    // stopwatch supaya jemaat/tim juga bisa melihat penanda terjadi.
    function lap() {
      if (swState_ !== "running") return;
      const totalSec = currentElapsedSec();
      const prevTotal = swLaps_.length ? swLaps_[swLaps_.length - 1].totalSec : 0;
      const entry = { n: swLaps_.length + 1, splitSec: Math.max(0, totalSec - prevTotal), totalSec };
      swLaps_.push(entry);
      renderStopwatchLaps_();
      rawPost({ type: "stopwatch", action: "lap", n: entry.n, splitSec: entry.splitSec, totalSec: entry.totalSec });
    }
    function pause() {
      if (swState_ !== "running") return;
      swState_ = "paused";
      swAccumulatedMs = Date.now() - swBaseStartAt; // simpan durasi yang sudah berjalan sejauh ini
      if (swDisplayInterval) { clearInterval(swDisplayInterval); swDisplayInterval = null; }
      rawPost({ type: "stopwatch", action: "stop" });
      renderStopwatchUi_();
    }
    // "🔁 Ulang" -- HANYA muncul saat dijeda (lihat renderStopwatchUi_()),
    // kembali ke status standby 00:00 berkedip + daftar penanda dikosongkan.
    function reset() {
      swState_ = "standby";
      swBaseStartAt = null;
      swAccumulatedMs = 0;
      swLaps_ = [];
      if (swDisplayInterval) { clearInterval(swDisplayInterval); swDisplayInterval = null; }
      if (disp) disp.textContent = "00:00";
      // BARU (7 Sep 2026) -- matikan juga status preview, sama seperti
      // resetTimerToStandby_() untuk Timer.
      swPreviewing_ = false;
      if (el("psStopwatchPreviewBtn")) { el("psStopwatchPreviewBtn").textContent = "👁️ Tampilkan ke Layar 2"; el("psStopwatchPreviewBtn").classList.remove("blinking"); }
      rawPost({ type: "stopwatch", action: "reset" });
      renderStopwatchLaps_();
      renderStopwatchUi_();
    }
    if (labelEl) labelEl.addEventListener("input", syncLabelPreview);
    // psStopwatchStartBtn dipakai 2 fungsi (lihat renderStopwatchUi_()):
    // "▶️ Mulai" saat standby, "▶️ Lanjut" saat dijeda -- keduanya sama
    // persis alurnya di start() (baseStartAt digeser dari swAccumulatedMs).
    if (el("psStopwatchStartBtn")) el("psStopwatchStartBtn").addEventListener("click", start);
    if (el("psStopwatchLapBtn")) el("psStopwatchLapBtn").addEventListener("click", lap);
    if (el("psStopwatchStopBtn")) el("psStopwatchStopBtn").addEventListener("click", pause);
    if (el("psStopwatchResetBtn")) el("psStopwatchResetBtn").addEventListener("click", reset);
    // BARU (7 Sep 2026) -- "👁️ Tampilkan ke Layar 2", lihat toggleStopwatchPreview_().
    if (el("psStopwatchPreviewBtn")) el("psStopwatchPreviewBtn").addEventListener("click", () => toggleStopwatchPreview_());
    syncLabelPreview();
    renderStopwatchUi_();
  }

  // ------------------------------------------------------------
  // Tengah: Alkitab ketik cepat (multi-referensi dipisah ";")
  // ------------------------------------------------------------
  // Singkatan yang enak dibaca untuk 8 versi Alkitab yang bisa dicentang
  // sekaligus di #psVersionGrid (harus sama persis dengan atribut value=
  // checkbox-nya di index.html & kode bahasa di js/config.js).
  const VERSION_LABELS = {
    ind: "ITB", rvind: "IND-RCV", eng: "ENG", rveng: "ENG-RCV",
    chs: "MDR", chssmp: "MDR-S", kjv: "KJV", jawa: "JAWA",
  };

  // Pecah 1 baris ketik-cepat jadi daftar referensi tunggal, dengan
  // dukungan notasi "rantai" umum ala Alkitab cetak:
  //   "wahyu 2:2,5,10, 3:10" -> Wahyu 2:2, Wahyu 2:5, Wahyu 2:10, Wahyu 3:10
  // Aturan:
  //   - ";" (titik-koma) atau baris baru = batas antar KELOMPOK, tiap
  //     kelompok WAJIB diawali nama kitab sendiri (kitab tidak
  //     "menular" lintas ";").
  //   - "," (koma) di DALAM 1 kelompok = referensi lain di kitab yang
  //     sama; kalau token setelah koma cuma "pasal:ayat" atau "ayat"
  //     saja (tanpa nama kitab), kitab (dan utk token "ayat" saja,
  //     pasal juga) dipakai dari token SEBELUMNYA dalam kelompok itu.
  function parseReferenceList(raw) {
    if (!raw || typeof parseReference !== "function") return [];
    const groups = raw.split(/[;\n]+/).map((g) => g.trim()).filter(Boolean);
    const out = [];
    groups.forEach((group) => {
      const tokens = group.split(/,+/).map((t) => t.trim()).filter(Boolean);
      let ctxBook = null;
      let ctxChapter = null;
      tokens.forEach((tok) => {
        // 1) Coba format lengkap "<kitab> <pasal>[:ayat[-ayatAkhir]]".
        const full = parseReference(tok);
        if (full) { ctxBook = full.book; ctxChapter = full.chapter; out.push(full); return; }
        // 2) "pasal:ayat[-ayatAkhir]" saja -- pakai kitab dari konteks.
        let m = tok.match(/^(\d+):(\d+)(?:-(\d+))?$/);
        if (m && ctxBook) {
          ctxChapter = parseInt(m[1], 10);
          out.push({ book: ctxBook, chapter: ctxChapter, verseStart: parseInt(m[2], 10), verseEnd: m[3] ? parseInt(m[3], 10) : null });
          return;
        }
        // 3) "ayat[-ayatAkhir]" saja -- pakai kitab & pasal dari konteks.
        m = tok.match(/^(\d+)(?:-(\d+))?$/);
        if (m && ctxBook && ctxChapter) {
          out.push({ book: ctxBook, chapter: ctxChapter, verseStart: parseInt(m[1], 10), verseEnd: m[2] ? parseInt(m[2], 10) : null });
          return;
        }
        // Token tidak bisa diartikan (mis. salah ketik) -- lewati saja.
      });
    });
    return out;
  }

  function wireQuickVerse() {
    const input = el("psQuickRef");
    const preview = el("psQuickPreview");

    // Versi mana saja yang dicentang di grid; kalau tidak ada satupun
    // dicentang, jatuh balik ke bahasa yang sedang aktif di aplikasi
    // utama supaya kotak Tampilkan tidak pernah kosong tanpa alasan.
    function getCheckedVersions() {
      const grid = el("psVersionGrid");
      const boxes = grid ? Array.from(grid.querySelectorAll("input[type=checkbox]:checked")) : [];
      const codes = boxes.map((b) => b.value);
      return codes.length ? codes : [typeof currentLang !== "undefined" ? currentLang : "ind"];
    }

    // Untuk tiap referensi (dipisah ";" antar kitab, "," dalam kitab
    // yang sama -- lihat parseReferenceList), kumpulkan teks dari SEMUA
    // versi tercentang yang punya data untuk pasal itu -- hasilnya
    // dipakai baik untuk pratinjau ketik-cepat maupun untuk ditayangkan
    // ke Layar 2.
    function resolveRefBlocks() {
      if (!input || typeof parseReference !== "function" || typeof getChapterVerses !== "function") return [];
      const refs = parseReferenceList(input.value);
      const versions = getCheckedVersions();
      const out = [];
      refs.forEach((ref) => {
        const vStart = ref.verseStart || 1;
        const vEnd = ref.verseEnd || vStart;
        const versionBlocks = [];
        versions.forEach((code) => {
          const verses = getChapterVerses(code, ref.book.num, ref.chapter);
          if (!verses.length) return;
          const matched = ref.verseStart ? verses.filter((v) => v.verse >= vStart && v.verse <= vEnd) : verses;
          if (!matched.length) return;
          const text = matched.map((v) => (matched.length > 1 ? `${v.verse} ${v.text}` : v.text)).join(" ");
          versionBlocks.push({ code, label: VERSION_LABELS[code] || code.toUpperCase(), text, verses: matched });
        });
        if (!versionBlocks.length) return;
        const bookName = (versionBlocks[0].verses[0] && versionBlocks[0].verses[0].bookName) || ref.book.name;
        const refLabel = ref.verseStart
          ? `${bookName} ${ref.chapter}:${vStart}${ref.verseEnd && ref.verseEnd !== vStart ? "-" + ref.verseEnd : ""}`
          : `${bookName} ${ref.chapter}`;
        out.push({ refLabel, versions: versionBlocks });
      });
      return out;
    }

    function updatePreview() {
      if (!preview) return;
      const blocks = resolveRefBlocks();
      if (!blocks.length) { preview.innerHTML = '<p class="present-saved-empty">Belum ada ayat cocok.</p>'; return; }
      preview.innerHTML = blocks.map((b) => `<div class="ps-quick-preview-block"><b>${escapeHtml(b.refLabel)}</b>${b.versions.map((v) => `<div class="ps-quick-preview-vrow"><span class="ps-quick-preview-vtag">${escapeHtml(v.label)}</span>${escapeHtml(v.text)}</div>`).join("")}</div>`).join("");
    }

    if (input) {
      input.addEventListener("input", updatePreview);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); el("psQuickShowBtn").click(); } });
    }
    if (el("psVersionGrid")) {
      el("psVersionGrid").querySelectorAll("input[type=checkbox]").forEach((cb) => cb.addEventListener("change", updatePreview));
    }
    if (el("psQuickShowBtn")) {
      el("psQuickShowBtn").addEventListener("click", () => {
        const blocks = resolveRefBlocks();
        if (!blocks.length) return;
        // Referensi pertama saja yang ditayangkan (kalau user ketik
        // beberapa referensi dipisah ";", sisanya tetap kelihatan di
        // pratinjau ketik-cepat untuk dipilih satu-satu / ditambah ke
        // Kumpulan Ayat), tapi SEMUA versi tercentang untuk referensi
        // itu tayang sekaligus bertumpuk di Layar 2.
        const first = blocks[0];
        // PERBAIKAN: renderStudioPreview() dipindah ke DALAM doSend()
        // (bukan hanya di cabang 1-monitor) supaya saat dipakai di mode
        // dual monitor lewat kotak "Berikutnya" -> "▶ Tayangkan", kotak
        // "Tayang" juga ikut ter-update persis saat konten itu benar-
        // benar didorong live (bukan cuma saat diketik/diantre).
        const doSend = () => {
          if (typeof Presentation !== "undefined" && Presentation.sendVerseMulti) {
            Presentation.sendVerseMulti(first.refLabel, first.versions.map((v) => ({ code: v.code, label: v.label, text: v.text })));
          }
          renderStudioPreview({ type: "verse", ref: first.refLabel, texts: first.versions });
          clearMonitorVideo_(); // ayat bukan video -- sembunyikan area video Monitor 3
        };
        const previewText = first.versions.map((v) => `[${v.label}] ${v.text}`).join("  ");
        if (isDualLive()) stageNext(first.refLabel, previewText, doSend);
        else doSend();
      });
    }
    if (el("psQuickAddBtn")) {
      el("psQuickAddBtn").addEventListener("click", async () => {
        // Kumpulan Ayat tersimpan per-ayat 1 bahasa (format lama) --
        // dipakai versi PERTAMA yang tercentang supaya format
        // penyimpanan yang sudah ada tidak berubah.
        const blocks = resolveRefBlocks();
        if (!blocks.length || typeof addVerseToCollection !== "function") return;
        const verses = [];
        blocks.forEach((b) => { if (b.versions[0]) verses.push(...b.versions[0].verses); });
        if (!verses.length) return;
        const sel = el("psCollectionSelect");
        const username = typeof currentUser !== "undefined" ? currentUser : null;
        const name = (sel && sel.value && loadCollections(username)[sel.value]) ? loadCollections(username)[sel.value].name : await promptCollectionName(username);
        if (!name) return;
        verses.forEach((v) => addVerseToCollection(username, name, v.id));
        renderCollectionSelect();
      });
    }
  }

  // ------------------------------------------------------------
  // Picker "Simpan ke Kumpulan Ayat / Media Tersimpan" (menggantikan
  // prompt() browser polos) -- menampilkan nama yang SUDAH PERNAH
  // dipakai sebagai rekomendasi klik-langsung, diurutkan dari yang
  // PALING BARU dipakai, plus kotak teks untuk ketik nama baru.
  // Dipanggil dengan `await`, mengembalikan nama yang dipilih/diketik,
  // atau null kalau Batal.
  //
  // `kind`: "collection" (default, dari getRecentCollectionNames --
  // js/collections.js, sinkron ke Sheet) ATAU "media" (dari
  // getRecentMediaNames -- js/collections.js, IndexedDB lokal per
  // perangkat). Dipisah 20 Agu 2026 supaya tombol "➕ Daftar" di tab
  // File & "💾 Simpan ke Media Tersimpan" di tab YouTube JUGA dapat
  // rekomendasi nama terakhir (sebelumnya cuma tab Alkitab yang punya
  // ini) -- 1 komponen dipakai bersama, judul dialognya menyesuaikan.
  // ------------------------------------------------------------
  function promptSaveName(kind, username, defaultName) {
    const isMedia = kind === "media";
    return new Promise((resolve) => {
      const overlay = el("collectionNamePicker");
      const titleEl = el("collectionNamePickerTitle");
      const hintEl = el("collectionNamePickerHint");
      const recentWrap = el("collectionNamePickerRecent");
      const input = el("collectionNamePickerInput");
      const saveBtn = el("collectionNamePickerSaveBtn");
      const cancelBtn = el("collectionNamePickerCancelBtn");
      const recentFn = isMedia ? getRecentMediaNames : getRecentCollectionNames;
      if (!overlay || !input || typeof recentFn !== "function") {
        // Fallback kalau markup/fungsi belum ada (mis. versi lama) --
        // tetap jalan seperti sebelumnya.
        resolve(prompt(isMedia ? "Nama untuk item ini di Media Tersimpan:" : "Nama Kumpulan Ayat:", defaultName || (isMedia ? "" : "Kumpulan Baru")));
        return;
      }
      if (titleEl) titleEl.textContent = isMedia ? "Simpan ke Media Tersimpan" : "Simpan ke Kumpulan Ayat";
      if (hintEl) hintEl.textContent = isMedia
        ? "Pilih nama yang pernah dipakai, atau ketik nama baru."
        : "Pilih kumpulan yang sudah ada, atau ketik nama baru.";
      Promise.resolve(recentFn(username, 8)).then((recent) => {
        recent = recent || [];
        recentWrap.innerHTML = recent.length
          ? recent.map((n, i) => `<button type="button" class="cnp-chip${i === 0 ? " newest" : ""}">${escapeHtml(n)}</button>`).join("")
          : `<span class="cnp-empty">${isMedia ? "Belum ada Media Tersimpan sebelumnya." : "Belum ada Kumpulan Ayat tersimpan."}</span>`;
        recentWrap.querySelectorAll(".cnp-chip").forEach((chip, i) => {
          chip.addEventListener("click", () => { input.value = recent[i]; input.focus(); });
        });
        input.value = defaultName || (isMedia ? "" : recent[0] || "");
        setTimeout(() => { input.focus(); input.select(); }, 30);
      });

      function cleanup(result) {
        overlay.hidden = true;
        saveBtn.removeEventListener("click", onSave);
        cancelBtn.removeEventListener("click", onCancel);
        input.removeEventListener("keydown", onKeydown);
        resolve(result);
      }
      function onSave() { cleanup((input.value || "").trim() || null); }
      function onCancel() { cleanup(null); }
      function onKeydown(e) { if (e.key === "Enter") onSave(); if (e.key === "Escape") onCancel(); }

      saveBtn.addEventListener("click", onSave);
      cancelBtn.addEventListener("click", onCancel);
      input.addEventListener("keydown", onKeydown);
      overlay.hidden = false;
    });
  }
  // Nama lama tetap ada (dipakai tab Alkitab) supaya tidak perlu ubah
  // pemanggil lain -- sekarang tinggal pembungkus tipis promptSaveName().
  function promptCollectionName(username, defaultName) {
    return promptSaveName("collection", username, defaultName);
  }

  // ------------------------------------------------------------
  // File tab -- gambar langsung + PDF dikonversi per-halaman (pdf.js,
  // dimuat lazy dari CDN hanya saat ada PDF diunggah). pptx TIDAK
  // dirender asli di sini (butuh mesin render PowerPoint sungguhan) --
  // tetap diarahkan untuk disimpan sebagai PDF dulu (lihat hint di
  // index.html), supaya hasilnya persis seperti PowerPoint.
  // ------------------------------------------------------------
  const PDFJS_VERSION = "3.11.174";
  let pdfjsLoadPromise = null;
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfjsLoadPromise) return pdfjsLoadPromise;
    pdfjsLoadPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
      s.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;
        resolve(window.pdfjsLib);
      };
      s.onerror = () => reject(new Error("Gagal memuat pustaka pembaca PDF (cek koneksi internet)."));
      document.head.appendChild(s);
    });
    return pdfjsLoadPromise;
  }

  // Render 1 file PDF jadi array data-URL gambar (1 per halaman), lewat
  // <canvas> tersembunyi. Skala 2x supaya cukup tajam saat ditayangkan
  // penuh 1 layar proyektor.
  async function pdfFileToImages(file) {
    const pdfjsLib = await loadPdfJs();
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const images = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      images.push(canvas.toDataURL("image/jpeg", 0.9));
    }
    return images;
  }

  // ------------------------------------------------------------
  // TAHAP 4 (ROADMAP-drive-sync.md) -- mengunduh ISI 1 item "stub" (baru
  // diketahui dari Drive, images masih kosong -- lihat syncMediaFromDrive()
  // di js/collections.js) ON-DEMAND, dipanggil dari tombol "☁️ Muat dari
  // Drive" di renderMediaList(). Mengembalikan true/false (berhasil atau
  // tidak) -- item yang sama diTIMPA ulang (put() dengan id sama) di
  // IndexedDB begitu berhasil, supaya lain kali dibuka lagi (mis. sesi
  // berikutnya) tidak perlu diunduh ulang.
  async function loadDriveMediaOnDemand(item) {
    if (!item || !item.driveFileId || typeof Sync === "undefined" || typeof Sync.fetchMediaFile !== "function") return false;
    const username = typeof currentUser !== "undefined" ? currentUser : null;
    const dataUrl = await Sync.fetchMediaFile(username, item.driveFileId);
    if (!dataUrl) return false;
    const mime = (dataUrl.match(/^data:([^;]+);/) || [, ""])[1] || item.driveMimeType || "";
    try {
      if (/^application\/pdf$/i.test(mime)) {
        // Render ulang jadi gambar per halaman (sama seperti saat PERTAMA
        // kali diunggah, lihat pdfFileToImages() di atas) -- fetchMediaFile
        // cuma mengembalikan berkas PDF MENTAH (itulah yang diunggah,
        // lihat uploadSource di addMediaItem() js/collections.js), jadi
        // perlu dirender ulang lagi di perangkat ini supaya bisa ditayangkan
        // per halaman seperti biasa, bukan cuma bisa diunduh.
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], item.sourceFileName || item.name || "berkas.pdf", { type: "application/pdf" });
        const images = await pdfFileToImages(file);
        item.images = images;
        item.originalFile = dataUrl; // simpan juga PDF aslinya, sama seperti psKeepOriginalPdf
        item.type = "image";
      } else if (/^image\//i.test(mime)) {
        item.images = [dataUrl];
        item.type = "image";
      } else {
        // Jenis lain (jarang -- uploadSource seharusnya selalu gambar/PDF)
        // -- tetap disimpan apa adanya supaya minimal bisa diunduh lewat
        // "⬇️" walau preview-nya mungkin tidak terbentuk sempurna.
        item.images = [dataUrl];
        item.originalFile = dataUrl;
      }
      item.driveOnly = false;
      item.updatedAt = new Date().toISOString();
      if (typeof LocalDB !== "undefined") await LocalDB.putMediaItem(item);
      return true;
    } catch (e) {
      console.error("loadDriveMediaOnDemand gagal:", e);
      return false;
    }
  }

  // ------------------------------------------------------------
  // BARU (28 Agu 2026, revisi total) -- Word (.docx DAN .doc lama)
  // diunggah & dijadikan TEKS BIASA (bukan lagi gambar per "halaman"
  // seperti PDF/pptx) -- dipecah jadi beberapa "halaman" teks lewat
  // paginatePlainText() di bawah. Perubahan ini PENTING karena:
  //   1. Dulu tiap halaman Word "dipanggang" jadi 1 gambar <canvas>
  //      ukuran & font TETAP -- Ukuran Teks (A-/A+) & tema Layar 2 SAMA
  //      SEKALI tidak berpengaruh ke gambar itu (huruf di gambar sudah
  //      "beku"). Sekarang teksnya dikirim ke Layar 2 lewat jalur "Teks
  //      Bebas" yang SAMA seperti tab Pesan (lihat sendGenericItemLive(),
  //      it.type === "text") -- otomatis ikut Ukuran Teks, Spasi Baris,
  //      font, & warna tema yang sedang aktif, sama seperti teks lain.
  //   2. Karena jadi item generik bertipe "text", tiap halaman bisa
  //      langsung ditambahkan ke Kumpulan Ayat lewat addTextToCollection()
  //      (js/collections.js) -- TIDAK perlu disimpan ke Media Tersimpan
  //      dulu seperti PDF/gambar (yang memang harus, karena isinya
  //      biner). Kumpulan tujuan boleh yang sudah ada ATAU nama baru
  //      (dialog "➕ Kumpulan"/"➕ Semua ke Kumpulan" di bawah memakai
  //      promptCollectionName() yang sama, yang memang sudah mendukung
  //      mengetik nama kumpulan BARU).
  //   3. Setelah semua halaman ditambahkan ke 1 kumpulan (tombol "➕
  //      Semua ke Kumpulan"), tiap halaman jadi 1 ITEM BERURUTAN di
  //      kumpulan itu -- klik salah satu di panel "Kumpulan Ayat" akan
  //      menjadikannya "playlist aktif" (lihat setActivePlaylist() &
  //      wirePlaylistKeyNav()), sehingga panah kiri/kanan papan
  //      ketik/clicker bisa menggeser maju-mundur ANTAR HALAMAN dokumen
  //      ini, dan begitu lewat halaman pertama/terakhir otomatis lanjut
  //      ke item lain di kumpulan yang sama ("keluar" dari dokumen ini).
  //
  // Catatan keterbatasan (SAMA seperti sebelumnya, cuma dipindah ke
  // sini): mammoth.js hanya membaca TEKS mentah (extractRawText) --
  // gambar/tabel/format asli di Word TIDAK ikut, dan pembagian halaman
  // di sini PERKIRAAN (dipotong ulang per sekitar 700 karakter, bukan
  // sama persis dengan halaman di Microsoft Word).
  // ------------------------------------------------------------
  const MAMMOTH_VERSION = "1.6.0";
  let mammothLoadPromise = null;
  function loadMammoth() {
    if (window.mammoth) return Promise.resolve(window.mammoth);
    if (mammothLoadPromise) return mammothLoadPromise;
    mammothLoadPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `https://cdnjs.cloudflare.com/ajax/libs/mammoth/${MAMMOTH_VERSION}/mammoth.browser.min.js`;
      s.onload = () => resolve(window.mammoth);
      s.onerror = () => reject(new Error("Gagal memuat pustaka pembaca Word (cek koneksi internet)."));
      document.head.appendChild(s);
    });
    return mammothLoadPromise;
  }

  // Pecah teks panjang jadi beberapa "halaman" (~700 karakter/halaman),
  // SEBISA MUNGKIN di batas paragraf supaya tidak memotong kalimat di
  // tengah -- kalau ada 1 paragraf yang sendirian sudah lebih panjang
  // dari itu (mis. 1 paragraf raksasa tanpa enter), baru dipotong paksa
  // di spasi terdekat. Dipakai bersama oleh docx (.docx) & doc lama
  // (.doc) di bawah, supaya perilaku "halaman"-nya konsisten.
  function paginatePlainText(rawText, charsPerPage) {
    const LIMIT = charsPerPage || 700;
    const paragraphs = String(rawText || "").split(/\n+/).map((p) => p.trim()).filter(Boolean);
    if (!paragraphs.length) return [String(rawText || "").trim()].filter(Boolean);
    const pages = [];
    let current = "";
    function flush() { if (current.trim()) pages.push(current.trim()); current = ""; }
    paragraphs.forEach((para) => {
      // Paragraf tunggal yang sudah lebih panjang dari 1 halaman -- potong
      // paksa jadi beberapa bagian di spasi terdekat sebelum diproses lagi.
      let remaining = para;
      while (remaining.length > LIMIT * 1.4) {
        let cut = remaining.lastIndexOf(" ", LIMIT);
        if (cut < LIMIT * 0.5) cut = LIMIT;
        flush();
        pages.push(remaining.slice(0, cut).trim());
        remaining = remaining.slice(cut).trim();
      }
      const candidate = current ? current + "\n\n" + remaining : remaining;
      if (candidate.length > LIMIT && current) {
        flush();
        current = remaining;
      } else {
        current = candidate;
      }
    });
    flush();
    return pages.length ? pages : [String(rawText || "").trim()];
  }

  async function docxFileToPages(file) {
    const mammoth = await loadMammoth();
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    const rawText = ((result && result.value) || "").trim();
    if (!rawText) throw new Error("Berkas ini tidak berisi teks yang bisa dibaca (mungkin isinya cuma gambar/tabel).");
    return paginatePlainText(rawText);
  }

  // ------------------------------------------------------------
  // BARU (28 Agu 2026) -- format Word LAMA (.doc biner, sebelum era
  // .docx) dulu DITOLAK MENTAH-MENTAH karena tidak ada pustaka pembaca
  // resmi yang ringan untuk browser. Sekarang dicoba dibaca lewat
  // pendekatan "usaha terbaik" (best-effort): berkas .doc lama pada
  // dasarnya berupa file biner (OLE Compound File) yang MENYELIPKAN teks
  // aslinya di antara data format/biner lain -- di sini kita cukup
  // menyisir seluruh isi berkas & mengambil rangkaian karakter tercetak
  // (huruf/angka/tanda baca) yang cukup panjang sebagai teks, membuang
  // sisanya. Ini BUKAN pembaca .doc yang sungguh mengerti strukturnya
  // (beda dari mammoth.js untuk .docx yang memang format XML resmi) --
  // hasilnya BISA berantakan tergantung isi & versi Word yang membuatnya
  // (mis. ada potongan kata aneh, urutan sedikit meleset). Kalau hasilnya
  // terlalu berantakan/kosong, operator diarahkan membuka di Word lalu
  // "Save As" -> .docx atau PDF untuk hasil yang akurat (jalur itu SUDAH
  // didukung sempurna lewat mammoth.js/pdf.js).
  // ------------------------------------------------------------
  function extractLegacyDocText(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    // Decode byte mentah jadi teks -- pakai TextDecoder (jauh lebih cepat
    // & tidak membekukan tab untuk berkas besar dibanding menyambung
    // String.fromCharCode satu-per-satu dalam loop, yang bisa sangat
    // lambat untuk file sampai puluhan MB). "windows-1252" dipilih
    // (bukan utf-8) supaya SETIAP byte tetap menghasilkan 1 karakter apa
    // adanya (fatal:false, tidak melempar error walau banyak byte biner
    // yang bukan teks sungguhan -- bagian itu nanti tersaring sendiri
    // oleh pola regex tercetak di bawah).
    let raw;
    try {
      raw = new TextDecoder("windows-1252", { fatal: false }).decode(bytes);
    } catch (e) {
      // Fallback browser lama yang belum kenal "windows-1252": latin1
      // (ISO-8859-1) hasilnya nyaris sama untuk keperluan menyisir teks.
      raw = new TextDecoder("iso-8859-1", { fatal: false }).decode(bytes);
    }
    // Ambil rangkaian karakter tercetak (spasi s/d ~) sepanjang >= 4 --
    // potongan biner/format non-teks nyaris selalu berisi byte kontrol
    // (0-31) yang memutus rangkaian ini, jadi otomatis tersaring.
    const runs = raw.match(/[\x20-\x7E]{4,}/g) || [];
    const cleaned = runs
      .map((r) => r.replace(/\s+/g, " ").trim())
      // Buang rangkaian yang tidak benar-benar berisi kata (mis. deretan
      // simbol/kode format Word seperti "HYPERLINK" mentah, garis border
      // tabel dsb) -- syaratnya minimal ada 1 potongan 3+ huruf berurutan.
      .filter((r) => /[A-Za-z]{3,}/.test(r))
      // Buang baris yang KEBANYAKAN simbol non-huruf (biasanya sisa kode
      // internal Word, bukan isi dokumen sungguhan).
      .filter((r) => {
        const letters = (r.match(/[A-Za-z]/g) || []).length;
        return letters / r.length > 0.55;
      });
    return cleaned.join("\n").trim();
  }

  async function oldDocFileToPages(file) {
    const buf = await file.arrayBuffer();
    const rawText = extractLegacyDocText(buf);
    if (!rawText || rawText.length < 20) {
      throw new Error('Tidak bisa membaca isi file .doc lama ini secara otomatis (hasil ekstraksi kosong/terlalu sedikit). Buka file ini di Word, lalu "Save As" -> pilih .docx (atau PDF), baru unggah lagi di sini untuk hasil yang akurat.');
    }
    return paginatePlainText(rawText);
  }

  // ------------------------------------------------------------
  // Grid mini-preview (thumbnail) untuk file bertumpuk halaman (PDF/
  // pptx-jadi-gambar) -- dipakai di tab File (sebelum disimpan) MAUPUN
  // di "🖼️ Media Tersimpan" (sesudah disimpan), supaya operator bisa
  // langsung KLIK halaman mana pun yang mau ditayangkan (bukan cuma
  // geser ◀ ▶ satu-satu). Dipanggil dengan array `images` (data-URL),
  // `getIdx`/`onPick(i)` untuk baca & set slide aktif punya pemanggil,
  // dan `toggleBtn` (tombol "🔳" yang sudah ada di baris) untuk
  // menunjukkan/menyembunyikan grid ini.
  // ------------------------------------------------------------
  function wireThumbGrid(container, images, toggleBtn, getIdx, onPick) {
    if (!container || !toggleBtn) return;
    let built = false;
    function build() {
      if (built) return;
      built = true;
      container.innerHTML = "";
      images.forEach((url, i) => {
        const th = document.createElement("button");
        th.type = "button";
        th.className = "ps-thumb";
        th.innerHTML = `<img src="${url}" alt="Halaman ${i + 1}" loading="lazy" /><span class="ps-thumb-num">${i + 1}</span>`;
        th.addEventListener("click", () => { onPick(i); refreshActive(); });
        container.appendChild(th);
      });
    }
    function refreshActive() {
      const cur = getIdx();
      container.querySelectorAll(".ps-thumb").forEach((th, i) => th.classList.toggle("active", i === cur));
    }
    toggleBtn.addEventListener("click", () => {
      build();
      container.hidden = !container.hidden;
      toggleBtn.classList.toggle("active", !container.hidden);
      if (!container.hidden) refreshActive();
    });
    return { refreshActive };
  }

  function wireFileTab() {
    const dz = el("psFileDropzone");
    const input = el("psFileInput");
    const list = el("psFileList");
    if (!dz || !input || !list) return;
    dz.addEventListener("click", () => input.click());
    dz.addEventListener("dragover", (e) => { e.preventDefault(); dz.classList.add("dragover"); });
    dz.addEventListener("dragleave", () => dz.classList.remove("dragover"));
    dz.addEventListener("drop", (e) => {
      e.preventDefault(); dz.classList.remove("dragover");
      handleFiles(e.dataTransfer.files);
    });
    input.addEventListener("change", () => handleFiles(input.files));

    function sendSlide(images, idx) {
      const url = images[idx];
      if (!url) return;
      rawPost({ type: "slide", imageUrl: url });
      renderStudioPreview({ type: "slide", imageUrl: url });
    }

    function buildRow(file, images, statusText, originalFileDataUrl) {
      // `images`: array data-URL (1 gambar biasa = 1 elemen; PDF/Word = 1
      // per halaman). `idx` = slide yang sedang aktif untuk file ini.
      // `originalFileDataUrl` -- BARU, hanya terisi kalau file ini PDF DAN
      // kotak centang "Simpan juga file PDF asli" (psKeepOriginalPdf)
      // dicentang saat diunggah -- disimpan APA ADANYA (bukan hasil
      // render) supaya nanti bisa diunduh utuh sebagai .pdf, bukan cuma
      // gambar per halaman (lihat tombol "⬇️ PDF Asli" di renderMediaList()).
      const wrapper = document.createElement("div");
      wrapper.className = "ps-file-item";
      const row = document.createElement("div");
      row.className = "ps-file-row";
      let idx = 0;
      const multi = images.length > 1;
      row.innerHTML = `<span class="ps-file-name">${escapeHtml(file.name)}${statusText ? ` <em class="ps-file-status">${escapeHtml(statusText)}</em>` : ""}</span>
        <span class="ps-file-actions">
          ${multi ? `<button type="button" class="chip-btn small" data-act="prev">◀</button><span class="ps-file-slide-count" data-role="count">1/${images.length}</span><button type="button" class="chip-btn small" data-act="next">▶</button><button type="button" class="chip-btn small" data-act="grid" title="Lihat semua halaman sebagai mini-preview">🔳</button>` : ""}
          <button type="button" class="chip-btn small" data-act="play">▶️</button>
          <button type="button" class="chip-btn small" data-act="add" title="Simpan ke Media Tersimpan (kolom kiri)">➕ Daftar</button>
          <button type="button" class="chip-btn small danger" data-act="del">✖️</button>
        </span>`;
      wrapper.appendChild(row);
      const countEl = row.querySelector('[data-role="count"]');
      function updateCount() { if (countEl) countEl.textContent = `${idx + 1}/${images.length}`; }
      const playBtn = row.querySelector('[data-act="play"]');
      if (!images.length) playBtn.disabled = true;
      playBtn.addEventListener("click", () => sendSlide(images, idx));
      const prevBtn = row.querySelector('[data-act="prev"]');
      const nextBtn = row.querySelector('[data-act="next"]');
      let thumbApi = null;
      if (prevBtn) prevBtn.addEventListener("click", () => { idx = (idx - 1 + images.length) % images.length; updateCount(); sendSlide(images, idx); if (thumbApi) thumbApi.refreshActive(); });
      if (nextBtn) nextBtn.addEventListener("click", () => { idx = (idx + 1) % images.length; updateCount(); sendSlide(images, idx); if (thumbApi) thumbApi.refreshActive(); });
      const gridBtn = row.querySelector('[data-act="grid"]');
      if (gridBtn && multi) {
        const gridWrap = document.createElement("div");
        gridWrap.className = "ps-thumbgrid";
        gridWrap.hidden = true;
        wrapper.appendChild(gridWrap);
        thumbApi = wireThumbGrid(gridWrap, images, gridBtn, () => idx, (i) => { idx = i; updateCount(); sendSlide(images, idx); });
      }
      const addBtn = row.querySelector('[data-act="add"]');
      if (!images.length) addBtn.disabled = true;
      addBtn.addEventListener("click", async () => {
        if (typeof addMediaItem !== "function") return;
        const username = typeof currentUser !== "undefined" ? currentUser : null;
        const name = await promptSaveName("media", username, file.name.replace(/\.[^.]+$/, ""));
        if (name === null) return; // dibatalkan
        // BARU (Tahap 3, lihat ROADMAP-drive-sync.md) -- kotak centang
        // "☁️ Sinkron ke akun" (psSyncToDrive di index.html), pola sama
        // seperti psKeepOriginalPdf di atas. Kalau dicentang, addMediaItem()
        // di js/collections.js akan mengunggah berkas ini ke Drive di
        // LATAR BELAKANG (tidak memblokir "✅ Tersimpan" di bawah).
        const syncToDriveBox = el("psSyncToDrive");
        const wantsSync = !!(syncToDriveBox && syncToDriveBox.checked);
        // BARU (27 Agu 2026) -- lihat catatan panjang di addMediaItem()
        // (js/collections.js): status sinkron Drive dulu diam-diam
        // (tidak dilaporkan ke UI sama sekali), sekarang ditampilkan di
        // sebelah nama file lewat statusEl kecil ini -- MUNCUL BELAKANGAN
        // (bukan langsung) karena memang menunggu unggahan Drive selesai
        // di latar belakang, TIDAK memblokir "✅ Tersimpan" di bawah yang
        // tetap instan seperti sebelumnya (penyimpanan lokal).
        let statusEl = wrapper.querySelector(".ps-drive-sync-status");
        if (wantsSync && !statusEl) {
          statusEl = document.createElement("em");
          statusEl.className = "ps-file-status ps-drive-sync-status";
          statusEl.textContent = " ☁️ menyinkronkan…";
          row.querySelector(".ps-file-name").appendChild(statusEl);
        }
        const id = await addMediaItem(username, name, images, file.name, null, null, originalFileDataUrl || null, wantsSync,
          wantsSync ? (ok, errorMessage) => {
            if (!statusEl) return;
            if (ok) {
              statusEl.textContent = " ☁️ tersinkron ke Drive";
              statusEl.title = "";
            } else if (errorMessage && errorMessage.indexOf("diantre") !== -1) {
              // TAHAP 7 -- dibedakan dari "gagal permanen" supaya operator
              // tahu ini akan DICOBA LAGI OTOMATIS (bukan perlu diunggah
              // ulang manual), lihat queueMediaUpload()/
              // processMediaUploadQueue() di js/collections.js.
              statusEl.textContent = " ⏳ menunggu sinkron (offline/gagal, akan dicoba lagi otomatis)";
              statusEl.title = errorMessage;
              statusEl.style.cursor = "help";
            } else {
              statusEl.textContent = " ⚠️ gagal sinkron ke Drive";
              statusEl.title = errorMessage || "Gagal, tidak diketahui sebabnya.";
              statusEl.style.cursor = "help";
            }
          } : null);
        if (!id) { alert("Gagal menyimpan (penyimpanan perangkat penuh? coba hapus item Media Tersimpan lama, atau kosongkan sedikit ruang penyimpanan perangkat -- kalau baru saja mencentang \"Simpan file PDF asli\", coba matikan centang itu, berkas PDF asli cukup boros ruang)."); return; }
        renderMediaList();
        addBtn.textContent = "✅ Tersimpan";
        setTimeout(() => { addBtn.textContent = "➕ Daftar"; }, 1200);
      });
      row.querySelector('[data-act="del"]').addEventListener("click", () => wrapper.remove());
      return wrapper;
    }

    // ------------------------------------------------------------
    // BARU (28 Agu 2026) -- baris khusus untuk file yang hasilnya TEKS
    // (bukan gambar): Word .docx & .doc lama, lihat docxFileToPages()/
    // oldDocFileToPages() di atas. Beda dari buildRow() (gambar):
    //   - "▶️ Tayangkan" mengirim TEKS halaman aktif (Presentation.sendFreeText,
    //     lewat rawPost type "text") -- otomatis ikut Ukuran Teks/Spasi
    //     Baris/tema Layar 2 yang sedang aktif, tidak seperti gambar.
    //   - "➕ Kumpulan" menambah HALAMAN AKTIF SAJA ke Kumpulan Ayat
    //     (addTextToCollection, TANPA perlu disimpan ke Media Tersimpan
    //     dulu -- teks bisa langsung disalin ke kumpulan, beda dari
    //     gambar/PDF yang harus lewat referensi Media Tersimpan).
    //   - "➕ Semua ke Kumpulan" menambah SELURUH halaman sekaligus,
    //     1 pertanyaan nama kumpulan untuk semuanya -- inilah yang
    //     dipakai supaya operator tidak perlu mengklik "➕ Kumpulan"
    //     satu per satu untuk dokumen panjang (mis. 41 halaman). Kedua
    //     tombol memakai promptCollectionName() yang sama seperti
    //     tombol "➕ Kumpulan" di Media Tersimpan -- boleh pilih kumpulan
    //     yang sudah ada ATAU mengetik nama kumpulan BARU.
    // ------------------------------------------------------------
    function buildTextRow(file, pages, statusText) {
      const wrapper = document.createElement("div");
      wrapper.className = "ps-file-item";
      const row = document.createElement("div");
      row.className = "ps-file-row";
      let idx = 0;
      const multi = pages.length > 1;
      row.innerHTML = `<span class="ps-file-name">${escapeHtml(file.name)}${statusText ? ` <em class="ps-file-status">${escapeHtml(statusText)}</em>` : ""}</span>
        <span class="ps-file-actions">
          ${multi ? `<button type="button" class="chip-btn small" data-act="prev">◀</button><span class="ps-file-slide-count" data-role="count">1/${pages.length}</span><button type="button" class="chip-btn small" data-act="next">▶</button>` : ""}
          <button type="button" class="chip-btn small" data-act="play">▶️</button>
          <button type="button" class="chip-btn small" data-act="addcol" title="Tambahkan halaman yang sedang ditampilkan ke Kumpulan Ayat (kolom kiri)">➕ Kumpulan</button>
          ${multi ? `<button type="button" class="chip-btn small" data-act="addcolall" title="Tambahkan SEMUA ${pages.length} halaman sekaligus, berurutan, ke Kumpulan Ayat">➕ Semua ke Kumpulan</button>` : ""}
          <button type="button" class="chip-btn small danger" data-act="del">✖️</button>
        </span>`;
      wrapper.appendChild(row);
      const snippetEl = document.createElement("p");
      snippetEl.className = "ps-verse-snippet ps-file-text-snippet";
      wrapper.appendChild(snippetEl);
      const countEl = row.querySelector('[data-role="count"]');
      function updateView() {
        if (countEl) countEl.textContent = `${idx + 1}/${pages.length}`;
        snippetEl.textContent = (pages[idx] || "").slice(0, 160);
      }
      updateView();
      function doSend() {
        const text = pages[idx];
        if (!text) return;
        rawPost({ type: "text", text });
        renderStudioPreview({ type: "text", text });
      }
      const playBtn = row.querySelector('[data-act="play"]');
      if (!pages.length) playBtn.disabled = true;
      playBtn.addEventListener("click", doSend);
      const prevBtn = row.querySelector('[data-act="prev"]');
      const nextBtn = row.querySelector('[data-act="next"]');
      if (prevBtn) prevBtn.addEventListener("click", () => { idx = (idx - 1 + pages.length) % pages.length; updateView(); doSend(); });
      if (nextBtn) nextBtn.addEventListener("click", () => { idx = (idx + 1) % pages.length; updateView(); doSend(); });
      const addColBtn = row.querySelector('[data-act="addcol"]');
      if (!pages.length) addColBtn.disabled = true;
      addColBtn.addEventListener("click", async () => {
        if (typeof addTextToCollection !== "function") return;
        const username = typeof currentUser !== "undefined" ? currentUser : null;
        const sel = el("psCollectionSelect");
        const name = (sel && sel.value && typeof loadCollections === "function" && loadCollections(username)[sel.value])
          ? loadCollections(username)[sel.value].name
          : await promptCollectionName(username);
        if (!name) return;
        addTextToCollection(username, name, pages[idx]);
        if (typeof renderCollectionSelect === "function") renderCollectionSelect();
        addColBtn.textContent = "✅ Ditambahkan";
        setTimeout(() => { addColBtn.textContent = "➕ Kumpulan"; }, 1200);
      });
      const addAllBtn = row.querySelector('[data-act="addcolall"]');
      if (addAllBtn) addAllBtn.addEventListener("click", async () => {
        if (typeof addTextToCollection !== "function") return;
        const username = typeof currentUser !== "undefined" ? currentUser : null;
        const name = await promptCollectionName(username, file.name.replace(/\.[^.]+$/, ""));
        if (!name) return;
        pages.forEach((p) => addTextToCollection(username, name, p));
        if (typeof renderCollectionSelect === "function") renderCollectionSelect();
        addAllBtn.textContent = `✅ ${pages.length} halaman ditambahkan`;
        setTimeout(() => { addAllBtn.textContent = `➕ Semua ke Kumpulan`; }, 1800);
      });
      row.querySelector('[data-act="del"]').addEventListener("click", () => wrapper.remove());
      return wrapper;
    }

    function handleFiles(files) {
      const keepOriginalPdfBox = el("psKeepOriginalPdf");
      Array.from(files || []).forEach((file) => {
        if (file.size > 25 * 1024 * 1024) { alert(`${file.name}: melebihi 25MB.`); return; }
        const isImage = /^image\//.test(file.type);
        const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
        const isPptx = /\.pptx?$/i.test(file.name);
        const isDocx = /\.docx$/i.test(file.name);
        const isOldDoc = /\.doc$/i.test(file.name) && !isDocx;

        if (isImage) {
          const reader = new FileReader();
          reader.onload = () => list.appendChild(buildRow(file, [reader.result], ""));
          reader.readAsDataURL(file);
          return;
        }

        if (isPdf) {
          const row = buildRow(file, [], "mengonversi…");
          list.appendChild(row);
          const wantsOriginal = !!(keepOriginalPdfBox && keepOriginalPdfBox.checked);
          const originalPromise = wantsOriginal
            ? new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => resolve(null); r.readAsDataURL(file); })
            : Promise.resolve(null);
          Promise.all([pdfFileToImages(file), originalPromise]).then(([images, originalDataUrl]) => {
            row.replaceWith(buildRow(file, images, `${images.length} halaman` + (originalDataUrl ? " (+ file asli disimpan)" : ""), originalDataUrl));
          }).catch((err) => {
            row.querySelector(".ps-file-status").textContent = "gagal dikonversi";
            console.error(err);
            alert(`Gagal mengonversi ${file.name} ke gambar: ${err.message || err}`);
          });
          return;
        }

        if (isDocx) {
          const row = buildTextRow(file, [], "mengonversi…");
          list.appendChild(row);
          docxFileToPages(file).then((pages) => {
            row.replaceWith(buildTextRow(file, pages, `${pages.length} halaman (perkiraan, teks saja)`));
          }).catch((err) => {
            row.querySelector(".ps-file-status").textContent = "gagal dikonversi";
            console.error(err);
            alert(`Gagal mengonversi ${file.name}: ${err.message || err}`);
          });
          return;
        }

        if (isOldDoc) {
          const row = buildTextRow(file, [], "membaca .doc lama…");
          list.appendChild(row);
          oldDocFileToPages(file).then((pages) => {
            row.replaceWith(buildTextRow(file, pages, `${pages.length} halaman (perkiraan, hasil baca .doc lama BISA kurang rapi -- untuk hasil akurat, simpan ulang sebagai .docx/PDF)`));
          }).catch((err) => {
            row.querySelector(".ps-file-status").textContent = "gagal dibaca";
            console.error(err);
            alert(err.message || `Gagal membaca ${file.name}.`);
          });
          return;
        }

        if (isPptx) {
          alert(`${file.name}: konversi pptx langsung belum tersedia (perlu mesin render PowerPoint yang berat). Untuk hasil persis sama, simpan file ini sebagai PDF dari PowerPoint lalu unggah PDF-nya di sini -- akan otomatis dipecah per halaman.`);
          return;
        }

        alert(`${file.name}: jenis file ini belum didukung. Gunakan pptx, pdf, docx, doc, jpg, png, webp, atau gif.`);
      });
    }
  }

  // ------------------------------------------------------------
  // Tab YouTube -- tempel link video, tayang penuh 1 layar di Layar 2
  // lewat <iframe> (present.html). KHUSUS laptop/komputer seperti
  // fitur Studio lainnya (lihat refreshDeviceGate()); tidak pernah
  // muncul di HP karena seluruh #presentStudio disembunyikan di layar
  // sempit.
  //
  // PERBAIKAN (permintaan operator):
  // 1. Video TIDAK LANGSUNG autoplay lagi begitu tayang di Layar 2 --
  //    "autoplay=1" dihapus dari embedUrl, diganti "enablejsapi=1"
  //    supaya bisa dikontrol lewat postMessage. Operator menekan
  //    sendiri tombol ▶️ Play kalau sudah siap (lihat wireYtControls()
  //    & yt_control di present.html).
  // 2. Nama di "Daftar Video" sekarang JUDUL VIDEO + NAMA CHANNEL
  //    (lewat endpoint publik oEmbed YouTube, tidak perlu API key)
  //    + DURASI (lewat YouTube IFrame Player API, juga tidak perlu API
  //    key -- video disiapkan sebentar tersembunyi off-screen cuma
  //    untuk membaca durasinya, lalu langsung dibuang). Kalau internet
  //    lambat/off, otomatis fallback tampilkan ID videonya saja.
  // ------------------------------------------------------------
  function extractYoutubeId(url) {
    if (!url) return null;
    const s = url.trim();
    const patterns = [
      /youtu\.be\/([A-Za-z0-9_-]{6,})/,
      /youtube\.com\/watch\?[^#]*v=([A-Za-z0-9_-]{6,})/,
      /youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/,
      /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/,
    ];
    for (const re of patterns) {
      const m = s.match(re);
      if (m) return m[1];
    }
    // Kalau yang ditempel sudah berupa ID video mentah (11 karakter khas)
    if (/^[A-Za-z0-9_-]{10,15}$/.test(s)) return s;
    return null;
  }

  // BARU (10 Sep 2026, sesi ke-11, permintaan operator "cara enable/
  // disable tulisan yang muncul saat YouTube diputar di Layar 2") --
  // "tulisan yang muncul" itu Closed Caption (CC) BAWAAN YouTube (beda
  // dari teks lirik/lagu yang mungkin sudah "terbakar" langsung ke
  // video itu sendiri -- yang terakhir ini TIDAK BISA dimatikan lewat
  // kode apa pun, karena sudah jadi bagian pixel videonya). Disimpan
  // lintas sesi (localStorage), diterapkan ke video BARU lewat parameter
  // resmi "cc_load_policy" di buildYoutubeEmbedUrl() di bawah, & ke
  // video yang SUDAH tayang lewat perintah live "yt_control" action
  // "cc" (lihat sendYtCommand() & present.html). BAWAAN: MATI -- video
  // yang lirik/tulisannya sudah "terbakar" di videonya sendiri (banyak
  // dipakai channel kidung anak) tidak butuh CC tambahan yang malah
  // bisa dobel/mengganggu; operator tinggal nyalakan lagi kapan videonya
  // memang butuh CC. Tombol & pintasan keyboard-nya (Alt+C) didaftarkan
  // di wireYtControls()/wireModeAndBellKeyboardShortcuts() di bawah.
  const YT_CAPTIONS_KEY = "bible_app_yt_captions_v1";
  let ytCaptionsEnabled = localStorage.getItem(YT_CAPTIONS_KEY) === "1";
  function setYtCaptionsEnabled_(on) {
    ytCaptionsEnabled = !!on;
    try { localStorage.setItem(YT_CAPTIONS_KEY, ytCaptionsEnabled ? "1" : "0"); } catch (e) {}
    document.dispatchEvent(new CustomEvent("ps-yt-captions-changed", { detail: { on: ytCaptionsEnabled } }));
    // Video yang SUDAH tayang di Layar 2 (& pratinjau mini Studio) --
    // "cc" bukan bagian dari peta `cmd` biasa (playVideo/pauseVideo/dst)
    // makanya dikirim lewat rawPost terpisah, ditangani present.html
    // sebagai loadModule/unloadModule("captions"). Video BERIKUTNYA yang
    // baru dimuat otomatis mengikuti lewat cc_load_policy di URL-nya.
    rawPost({ type: "yt_control", action: "cc", arg: ytCaptionsEnabled });
  }
  function toggleYtCaptions_() { setYtCaptionsEnabled_(!ytCaptionsEnabled); }

  function buildYoutubeEmbedUrl(id, startSeconds) {
    // TANPA autoplay -- video dimuat dalam keadaan siap/pause, bukan
    // langsung jalan. "enablejsapi=1" wajib ada supaya tombol
    // Play/Pause/Mute di Studio bisa mengontrolnya lewat postMessage.
    // "modestbranding=1&iv_load_policy=3" mengurangi sedikit tombol/
    // anotasi bawaan YouTube (logo & video terkait TETAP tidak bisa
    // dihilangkan total -- itu aturan YouTube, bukan batasan aplikasi
    // ini). "playsinline=1" supaya tidak fullscreen paksa di beberapa
    // browser.
    // BARU (4 Sep 2026, permintaan operator) -- `startSeconds` OPSIONAL,
    // dipetakan ke parameter resmi YouTube "start" (detik, bulat) supaya
    // video langsung mulai dari titik yang dipilih lewat progress bar
    // "detik mulai" (lihat createYtSeekBar() di bawah), bukan dari awal.
    // Kosong/0/undefined -> perilaku LAMA sama persis (mulai dari awal).
    let url = `https://www.youtube.com/embed/${id}?rel=0&enablejsapi=1&modestbranding=1&iv_load_policy=3&playsinline=1&cc_load_policy=${ytCaptionsEnabled ? 1 : 0}`;
    const secs = Math.round(startSeconds || 0);
    if (secs > 0) url += `&start=${secs}`;
    return url;
  }

  // BARU (28 Agu 2026) -- lihat catatan panjang di checkbox
  // "#psYtPreviewSoundMode" (index.html) & di toStudioPreviewEmbedUrl()/
  // sendYtCommand() di bawah. Mati (default) = perilaku LAMA (pratinjau
  // Studio SELALU bisu, autoplay langsung -- pas untuk pemakaian
  // sungguhan 2 layar). Nyala = pratinjau ikut bersuara, TAPI menunggu
  // ▶️ Play ditekan dulu (sama seperti Layar 2), khusus uji coba 1 laptop.
  const YT_PREVIEW_SOUND_KEY = "bible_app_yt_preview_sound_v1";
  let ytPreviewSoundMode = localStorage.getItem(YT_PREVIEW_SOUND_KEY) === "1";

  function toStudioPreviewEmbedUrl(embedUrl) {
    // Khusus untuk kotak mini "Tayang" di Studio (bukan Layar 2 asli).
    if (!embedUrl) return "";
    if (ytPreviewSoundMode) {
      // Mode "ikut bersuara" -- JANGAN autoplay & JANGAN mute, biarkan
      // sama persis seperti Layar 2 (present.html): dimuat dalam keadaan
      // siap/pause, baru mulai (dengan suara) begitu operator menekan
      // ▶️ Play di atas -- lihat sendYtCommand() di bawah, yang di mode
      // ini JUGA meneruskan play/pause/stop/mute/unmute ke pratinjau.
      return embedUrl;
    }
    // PERBAIKAN (4 Sep 2026 v3, permintaan operator) -- dulu pratinjau
    // mini ini langsung autoplay (bisu) begitu "▶️ Tampilkan" diklik,
    // sehingga operator melihat video "sudah jalan" padahal Layar 2
    // sungguhan masih diam menunggu ▶️ Play (mismatch yang membingung-
    // kan). Sekarang "autoplay=1" DIHAPUS -- pratinjau ini cuma dimuat
    // dalam keadaan siap/diam, PERSIS seperti Layar 2, sama-sama
    // menunggu ▶️ Play ditekan. "mute=1" TETAP dipertahankan permanen
    // di URL-nya (beda dari Layar 2) supaya pratinjau ini TIDAK PERNAH
    // bersuara apa pun -- termasuk begitu nanti diputar lewat tombol
    // ▶️ Play -- karena itu satu-satunya penjamin tidak ada dobel suara
    // dengan Layar 2 sungguhan (lihat sendYtCommand(), yang sengaja
    // tidak meneruskan mute/unmute ke pratinjau ini di mode bawaan).
    const sep = embedUrl.includes("?") ? "&" : "?";
    return embedUrl + sep + "mute=1";
  }

  function formatYtDuration(totalSeconds) {
    if (!totalSeconds || !isFinite(totalSeconds) || totalSeconds <= 0) return "";
    const secs = Math.round(totalSeconds);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = String(secs % 60).padStart(2, "0");
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
  }

  // ------------------------------------------------------------
  // BARU (4 Sep 2026, permintaan operator) -- format & baca-balik waktu
  // "detik mulai" video, dukung sampai satuan HARI supaya rekaman/live
  // streaming yang sangat panjang tetap bisa diberi titik mulai jauh ke
  // tengah (mis. "2:23:23:29" = 2 hari, 23 jam, 23 menit, 29 detik).
  // Dipakai bersama oleh createYtSeekBar() di bawah -- SATU fungsi yang
  // sama dipakai baik untuk menampilkan label progress bar MAUPUN
  // membaca ketikan operator lewat tombol "✏️", supaya keduanya selalu
  // konsisten (D:HH:MM:SS, atau HH:MM:SS saja kalau kurang dari 1 hari).
  // ------------------------------------------------------------
  function formatSecondsToDHMS(totalSeconds) {
    let s = Math.max(0, Math.round(totalSeconds || 0));
    const days = Math.floor(s / 86400); s -= days * 86400;
    const hours = Math.floor(s / 3600); s -= hours * 3600;
    const mins = Math.floor(s / 60); s -= mins * 60;
    const secs = s;
    const hh = String(hours).padStart(2, "0");
    const mm = String(mins).padStart(2, "0");
    const ss = String(secs).padStart(2, "0");
    return days > 0 ? `${days}:${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;
  }
  // Terima beberapa bentuk ketikan operator supaya tidak kaku: angka
  // polos = detik langsung (mis. "90"), "MM:SS", "HH:MM:SS", atau
  // "D:HH:MM:SS" (hari:jam:menit:detik, lihat formatSecondsToDHMS di
  // atas). Balik `null` kalau memang tidak bisa dibaca sama sekali,
  // supaya pemanggil (createYtSeekBar) bisa menolak dengan pesan jelas
  // alih-alih diam-diam menganggapnya 0 detik.
  function parseDHMSToSeconds(text) {
    const s = String(text == null ? "" : text).trim();
    if (!s) return null;
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    const parts = s.split(":").map((p) => parseInt(p, 10));
    if (!parts.length || parts.some((p) => isNaN(p) || p < 0)) return null;
    let days = 0, hours = 0, mins = 0, secs = 0;
    if (parts.length === 4) [days, hours, mins, secs] = parts;
    else if (parts.length === 3) [hours, mins, secs] = parts;
    else if (parts.length === 2) [mins, secs] = parts;
    else if (parts.length === 1) [secs] = parts;
    else return null;
    return days * 86400 + hours * 3600 + mins * 60 + secs;
  }

  // Progress bar horizontal + tombol "✏️" untuk memilih detik MULAI
  // pemutaran video -- SATU fungsi dipakai bersama oleh kotak tempel-
  // link manual (psYtInput, lihat wireYoutubeTab()) & tiap baris
  // Playlist Video dari Google Sheet (lihat wireYtPlaylistTab()),
  // supaya perilakunya SELALU sama persis di keduanya (permintaan
  // operator, 4 Sep 2026).
  //
  // Bawaan SELALU 00:00:00 (paling kiri/value=0). Ujung KANAN slider
  // ("max") = durasi video KALAU SUDAH DIKETAHUI (lewat
  // fetchYoutubeDuration()/kolom "Durasi" opsional di Sheet, lihat
  // pemanggilnya) -- kalau belum diketahui, dipakai `fallbackMaxSeconds`
  // (default 3 hari) supaya video/rekaman sangat panjang yang durasinya
  // belum sempat diketahui TETAP bisa digeser jauh, bukan dibatasi
  // sempit. Operator juga bisa ketik manual lewat tombol "✏️" (menerima
  // format bebas, lihat parseDHMSToSeconds) -- ketikan yang melebihi
  // slider TETAP diterima kalau durasi asli belum diketahui (durationSeconds
  // masih 0), supaya tidak menghalangi kasus seperti "2:23:23:29" di
  // atas.
  function createYtSeekBar(opts) {
    const options = opts || {};
    const fallbackMax = options.fallbackMaxSeconds || 3 * 86400; // 3 hari
    let durationSeconds = options.durationSeconds || 0;

    const wrap = document.createElement("div");
    wrap.className = "ps-yt-seek";
    wrap.innerHTML = `
      <input type="range" class="ps-yt-seek-range" min="0" max="${Math.round(durationSeconds > 0 ? durationSeconds : fallbackMax)}" value="0" step="1" title="Geser untuk memilih detik video mulai diputar (paling kiri = 00:00:00)" />
      <span class="ps-yt-seek-time" data-role="time">00:00:00</span>
      <button type="button" class="chip-btn small ps-yt-seek-edit" data-act="edittime" title="Ketik detik mulai secara manual (mis. 1:30, 01:02:30, atau 2:23:23:29 untuk 2 hari 23 jam 23 menit 29 detik)">✏️</button>
    `;
    const range = wrap.querySelector(".ps-yt-seek-range");
    const timeLabel = wrap.querySelector('[data-role="time"]');
    const editBtn = wrap.querySelector('[data-act="edittime"]');

    function refreshLabel() { timeLabel.textContent = formatSecondsToDHMS(parseInt(range.value, 10) || 0); }
    range.addEventListener("input", refreshLabel);
    editBtn.addEventListener("click", () => {
      const current = parseInt(range.value, 10) || 0;
      const typed = prompt(
        "Mulai video dari detik ke berapa?\nFormat bebas: detik saja (mis. 90), MM:SS, HH:MM:SS, atau D:HH:MM:SS (mis. 2:23:23:29 = 2 hari 23 jam 23 menit 29 detik).",
        formatSecondsToDHMS(current)
      );
      if (typed == null) return; // dibatalkan
      const secs = parseDHMSToSeconds(typed);
      if (secs == null) { alert("Format waktu tidak dikenali."); return; }
      const clamped = durationSeconds > 0 ? Math.min(secs, durationSeconds) : secs;
      if (clamped > parseInt(range.max, 10)) range.max = String(clamped); // durasi belum diketahui -- lebarkan slider mengikuti ketikan
      range.value = String(clamped);
      refreshLabel();
    });
    refreshLabel();

    return {
      el: wrap,
      getStartSeconds() { return parseInt(range.value, 10) || 0; },
      // Dipanggil begitu durasi ASLI video sudah diketahui (fetchYoutubeDuration
      // selesai / kolom Durasi Sheet terbaca) -- slider ikut disesuaikan
      // batas kanannya supaya sungguh mewakili detik terakhir video.
      setDurationSeconds(secs) {
        if (!secs || secs <= 0) return;
        durationSeconds = secs;
        range.max = String(Math.round(secs));
        if (parseInt(range.value, 10) > secs) { range.value = String(Math.round(secs)); refreshLabel(); }
      },
      reset() { range.value = "0"; refreshLabel(); },
    };
  }

  // Judul + nama channel lewat oEmbed publik YouTube (tanpa API key).
  async function fetchYoutubeTitleAuthor(id) {
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent("https://www.youtube.com/watch?v=" + id)}&format=json`);
      if (!res.ok) return null;
      const data = await res.json();
      return { title: data.title || null, author: data.author_name || null };
    } catch (e) {
      return null; // offline / diblokir jaringan -- biarkan fallback ke ID
    }
  }

  // Durasi video lewat YouTube IFrame Player API (juga tanpa API key) --
  // memuat player tersembunyi sebentar, baca getDuration(), lalu buang.
  let ytApiPromise = null;
  function loadYoutubeIframeApi() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (ytApiPromise) return ytApiPromise;
    ytApiPromise = new Promise((resolve) => {
      const prevReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (typeof prevReady === "function") prevReady(); resolve(); };
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.onerror = () => resolve(); // gagal muat skrip -- tetap resolve, pemanggil akan fallback
      document.head.appendChild(tag);
    });
    return ytApiPromise;
  }
  function fetchYoutubeDuration(id) {
    return loadYoutubeIframeApi().then(() => new Promise((resolve) => {
      if (!window.YT || !window.YT.Player) { resolve(null); return; }
      const holder = document.createElement("div");
      holder.style.cssText = "position:fixed; left:-9999px; top:-9999px; width:2px; height:2px;";
      document.body.appendChild(holder);
      let settled = false;
      const finish = (secs) => {
        if (settled) return;
        settled = true;
        try { player.destroy(); } catch (e) {}
        holder.remove();
        resolve(secs);
      };
      const timeout = setTimeout(() => finish(null), 7000);
      var player = new YT.Player(holder, {
        videoId: id,
        playerVars: { autoplay: 0, controls: 0 },
        events: {
          onReady: (e) => { clearTimeout(timeout); finish(e.target.getDuration()); },
          onError: () => { clearTimeout(timeout); finish(null); },
        },
      });
    })).catch(() => null);
  }

  // ============================================================
  //  TAB "🔗 Link" -- Embed Canva & SoundCloud
  //  (ROADMAP-ai-presentation.md, Bagian 3 & 4)
  // ============================================================

  // Canva TIDAK mengizinkan link biasa yang dibagikan operator
  // (mis. "canva.link/xxxxx" atau "canva.com/design/XXXX/view") dibuka
  // di dalam <iframe> -- X-Frame-Options/CSP dari sisi server Canva
  // sendiri memblokirnya, aplikasi ini tidak bisa mengubah itu. SATU-
  // SATUNYA pola resmi yang boleh di-iframe adalah hasil "Bagikan ->
  // Sematkan (Embed)" Canva, polanya:
  //   https://www.canva.com/design/XXXXXXXXXXX/xxxxxxxxxxx/view?embed
  // Fungsi ini TIDAK bisa "menebak" ID desain dari link pendek
  // (canva.link/...) tanpa memuatnya dulu di browser (yang berarti
  // sudah kena X-Frame-Options itu sendiri) -- jadi yang dilakukan di
  // sini terbatas pada:
  //   1. Kalau link yang ditempel SUDAH pola "view?embed" (atau
  //      mengandung "?embed"/"&embed"), dipakai APA ADANYA.
  //   2. Kalau link berpola "canva.com/design/XXXX/xxxx/view" TANPA
  //      "?embed", parameter "?embed" ditambahkan otomatis di
  //      belakangnya (kasus operator lupa mengambil link "Sematkan").
  //   3. Kalau link berpola LAIN (mis. "canva.link/..." pendek), TIDAK
  //      bisa dinormalisasi secara aman di sisi klien -- dikembalikan
  //      apa adanya, DAN wireLinkTab() di bawah menampilkan peringatan
  //      supaya operator tahu perlu mengambil link "Bagikan -> Sematkan"
  //      dari Canva-nya sendiri (bukan link "canva.link" pendek biasa).
  function normalizeCanvaLink(raw) {
    const url = String(raw || "").trim();
    if (!url) return { url: "", ok: false, needsEmbedShare: false };
    let looksLikeShortLink = /canva\.link\//i.test(url) || (/canva\.com/i.test(url) && !/\/design\//i.test(url));
    if (/canva\.com/i.test(url) && !looksLikeShortLink) {
      if (/[?&]embed(\b|=)/i.test(url)) return { url, ok: true, needsEmbedShare: false };
      const sep = url.includes("?") ? "&" : "?";
      return { url: url + sep + "embed", ok: true, needsEmbedShare: false };
    }
    // Link pendek (canva.link/...) atau bukan link Canva sama sekali --
    // tetap dikirim apa adanya (siapa tahu operator sudah tahu isinya
    // benar bisa di-iframe, mis. layanan lain), tapi ditandai perlu
    // peringatan supaya operator mengecek sendiri di Layar 2.
    return { url, ok: true, needsEmbedShare: looksLikeShortLink };
  }

  function wireLinkTab() {
    // ---------- Canva ----------
    const canvaInput = el("psCanvaInput");
    const canvaShowBtn = el("psCanvaShowBtn");
    const canvaSaveBtn = el("psCanvaSaveBtn");
    const canvaStatus = el("psCanvaStatus");
    let lastCanvaNormalized = null;

    function readCanva() {
      if (!canvaInput) return null;
      const norm = normalizeCanvaLink(canvaInput.value);
      lastCanvaNormalized = norm;
      if (canvaStatus) {
        canvaStatus.textContent = !norm.url
          ? ""
          : norm.needsEmbedShare
            ? "⚠️ Link ini kelihatan seperti link Canva biasa (bukan link \"Sematkan\"/Embed) -- Canva sering MEMBLOKIR link biasa tampil di sini. Di Canva: buka desainnya -> Bagikan -> Sematkan (Embed) -> salin link itu (polanya berakhiran \"view?embed\"), lalu tempel link itu di sini."
            : "✅ Siap ditayangkan.";
      }
      return norm;
    }
    if (canvaInput) canvaInput.addEventListener("input", readCanva);
    if (canvaShowBtn) {
      canvaShowBtn.addEventListener("click", () => {
        const norm = readCanva();
        if (!norm || !norm.url) return;
        rawPost({ type: "canva", embedUrl: norm.url });
        renderStudioPreview({ type: "canva", embedUrl: norm.url });
      });
    }
    if (canvaSaveBtn) {
      canvaSaveBtn.addEventListener("click", async () => {
        const norm = readCanva();
        if (!norm || !norm.url) return;
        if (typeof promptCollectionName !== "function" || typeof addCanvaToCollection !== "function") return;
        const name = await promptCollectionName();
        if (!name) return; // operator batal / tutup dialog tanpa nama
        const username = typeof currentUser !== "undefined" ? currentUser : null;
        const id = addCanvaToCollection(username, name, { embedUrl: norm.url, title: "" });
        renderCollectionSelect();
        // BARU (4 Sep 2026, v8) -- konfirmasi tertulis setelah simpan;
        // sebelumnya TIDAK ADA pemberitahuan sama sekali, jadi operator
        // tidak bisa memastikan berhasil/tidak dari layar ini saja.
        if (canvaStatus) {
          canvaStatus.textContent = id
            ? `✅ Tersimpan ke kumpulan "${name}".`
            : "⚠️ Gagal menyimpan (coba lagi).";
        }
      });
    }

    // ---------- SoundCloud ----------
    const scInput = el("psScInput");
    const scShowBtn = el("psScShowBtn");
    const scSaveBtn = el("psScSaveBtn");
    const scPlayBtn = el("psScPlayBtn");
    const scPauseBtn = el("psScPauseBtn");
    const scStatus = el("psScStatus");

    function scCommand(action) {
      rawPost({ type: "sc_control", action });
    }
    if (scShowBtn) {
      scShowBtn.addEventListener("click", () => {
        const url = (scInput && scInput.value || "").trim();
        if (!url) return;
        rawPost({ type: "soundcloud", trackUrl: url });
        renderStudioPreview({ type: "soundcloud", trackUrl: url });
        if (scStatus) scStatus.textContent = "▶️ Diputar di Layar 2.";
      });
    }
    if (scPlayBtn) scPlayBtn.addEventListener("click", () => scCommand("play"));
    if (scPauseBtn) scPauseBtn.addEventListener("click", () => scCommand("pause"));
    if (scSaveBtn) {
      scSaveBtn.addEventListener("click", async () => {
        const url = (scInput && scInput.value || "").trim();
        if (!url) return;
        if (typeof promptCollectionName !== "function" || typeof addSoundCloudToCollection !== "function") return;
        const name = await promptCollectionName();
        if (!name) return; // operator batal / tutup dialog tanpa nama
        const username = typeof currentUser !== "undefined" ? currentUser : null;
        const id = addSoundCloudToCollection(username, name, { trackUrl: url, title: "" });
        renderCollectionSelect();
        // BARU (4 Sep 2026, v8) -- konfirmasi tertulis, sama seperti Canva
        // di atas (sebelumnya tidak ada -- lihat catatan Canva).
        if (scStatus) {
          scStatus.textContent = id
            ? `✅ Tersimpan ke kumpulan "${name}".`
            : "⚠️ Gagal menyimpan (coba lagi).";
        }
      });
    }
    // Status main/jeda sesungguhnya dari Layar 2 (lihat reportScState()
    // di present.html + CustomEvent "ps-sc-state" di js/presentation.js)
    // -- supaya baris status tetap benar walau operator mengeklik
    // langsung tombol bawaan di bilah SoundCloud sendiri, bukan lewat
    // tombol ▶️/⏸️ di atas.
    window.addEventListener("ps-sc-state", (e) => {
      if (!scStatus) return;
      scStatus.textContent = e.detail && e.detail.isPlaying ? "▶️ Sedang diputar di Layar 2." : "⏸️ Dijeda.";
    });
  }

  // ============================================================
  // BARU (4 Sep 2026 v3) -- tab "🤖 AI Presentation" (roadmap
  // ROADMAP-ai-presentation.md Bagian 2). Operator ketik banyak
  // item (ayat/kidung/pengumuman) SEKALIGUS dipisah koma, mis:
  //   "matius 11:28, K24, markus 16:16, pengumuman ..., S120"
  // -> diurai jadi daftar "item generik" (bentuk SAMA seperti item
  // Kumpulan Ayat/js/collections.js), lalu bisa ditayangkan berurutan
  // (setActivePlaylist()+sendGenericItemLive(), SUDAH ADA -- lihat
  // wireKidungTab() di atas) ATAU disimpan sekaligus ke Kumpulan Ayat.
  //
  // DIDUKUNG sesi ini: referensi ayat (boleh dirantai ";" utk pasal/
  // ayat lain di kitab yang sama, lihat parseReferenceList() di atas --
  // catatan: KARENA koma sudah dipakai sebagai pemisah antar-ITEM di
  // sini, notasi rantai gaya "wahyu 2:2,5,10" [pakai KOMA, seperti di
  // kotak Alkitab ketik cepat] tidak bisa dipakai DI DALAM 1 item AI
  // Presentation -- pakai ";" untuk itu, mis. "wahyu 2:2; 2:5; 2:10"),
  // K/Kidung, S/Suplemen, T/Tambahan (lewat openKidungByKeypad() +
  // splitKidungIntoSlides() yang SUDAH ADA, mode pemecah slide default
  // "1+koor" -- SAMA seperti default tab 🎵 Kidung manual), dan
  // "pengumuman <isi bebas>".
  //
  // BELUM didukung (lihat ROADMAP-ai-presentation.md Bagian 5 poin 4):
  // notasi "SA"/"Sidang Anak" -- datanya ada di modul TERPISAH
  // (window.KidungAnak, js/kidung-anak.js, format notasi angka+chord),
  // BUKAN sistem bait+koor js/kidung.js yang dipakai K/S/T, jadi
  // openKidungByKeypad() TIDAK BISA langsung dipakai untuknya. Token
  // "SA..." di sini SENGAJA ditandai ⚠️ "belum didukung" (bukan
  // dilewati diam-diam, dan BUKAN dipetakan asal ke buku lain) supaya
  // operator sadar sebelum tayang, sesuai aturan "Token tidak dikenali"
  // di roadmap Bagian 1.
  // ============================================================

  // Urutan aturan di bawah PENTING: "SA"/"Sidang Anak" WAJIB dicek
  // SEBELUM "S"/"Suplemen", supaya token "SA120" tidak ketangkap
  // (salah) sebagai Suplemen "A120". `buku: null` menandai jenis yang
  // memang belum didukung.
  // PERBAIKAN (4 Sep 2026, roadmap Bagian 1 "Yang belum selesai" poin 2):
  // `buku` untuk SA sekarang diisi `"Sidang Anak"` (bukan `null` lagi) --
  // jembatan ke `window.KidungAnak` SUDAH ditulis (lihat cabang khusus
  // di parseAiPresentation() di bawah), jadi token ini tidak lagi
  // otomatis ditandai "belum didukung".
  const AI_PRESENT_BOOK_RULES = [
    { re: /^sa\s*0*(\d+)$/i, buku: "Sidang Anak", label: "Sidang Anak" },
    { re: /^sidang\s*anak\s*0*(\d+)$/i, buku: "Sidang Anak", label: "Sidang Anak" },
    { re: /^k\s*0*(\d+)$/i, buku: "Kidung", label: "Kidung" },
    { re: /^kidung\s*0*(\d+)$/i, buku: "Kidung", label: "Kidung" },
    { re: /^s\s*0*(\d+)$/i, buku: "Suplemen", label: "Suplemen" },
    { re: /^suplemen\s*0*(\d+)$/i, buku: "Suplemen", label: "Suplemen" },
    { re: /^t\s*0*(\d+)$/i, buku: "Tambahan", label: "Tambahan" },
    { re: /^tambahan\s*0*(\d+)$/i, buku: "Tambahan", label: "Tambahan" },
  ];

  function matchAiPresentKidungToken(tok) {
    const t = String(tok || "").trim();
    for (const rule of AI_PRESENT_BOOK_RULES) {
      const m = t.match(rule.re);
      if (m) return { no: m[1], buku: rule.buku, label: rule.label };
    }
    return null;
  }

  // Balikan: array item generik, DITAMBAH item khusus `{type:"warning",
  // raw, warning}` untuk token yang gagal diartikan (TIDAK dilewati
  // diam-diam -- lihat aturan "Token tidak dikenali" Bagian 1 roadmap).
  async function parseAiPresentation(text) {
    const topTokens = String(text || "").split(/,+/).map((t) => t.trim()).filter(Boolean);
    const out = [];
    for (const raw of topTokens) {
      // 1) "pengumuman <isi bebas>" -- kata "pengumuman" di awal token
      //    dibuang (boleh diikuti ":"/"-" opsional), sisanya jadi isi.
      const pengumumanMatch = raw.match(/^pengumuman\s*[:\-]?\s*(.*)$/i);
      if (pengumumanMatch && pengumumanMatch[1].trim()) {
        out.push({ type: "announcement", text: pengumumanMatch[1].trim(), title: "", raw });
        continue;
      }

      // 2) K / S / SA / T
      const kidungTok = matchAiPresentKidungToken(raw);
      if (kidungTok) {
        if (!kidungTok.buku) {
          out.push({ type: "warning", raw, warning: `${kidungTok.label} No. ${kidungTok.no} tidak dikenali.` });
          continue;
        }

        // 2a) SA (Sidang Anak) -- BARU (4 Sep 2026): data lagunya TIDAK
        // ada di sistem bait+koor js/kidung.js (beda arsitektur, lihat
        // catatan Bagian 1 roadmap), jadi dijembatani lewat
        // window.KidungAnak.getBaitsForPresentation() (js/kidung-anak.js)
        // yang MENGUBAH `song.Syair` jadi bentuk bait+koor yang PERSIS
        // sama seperti keluaran getKidungBaitsWithKoor() -- sehingga
        // splitKidungIntoSlides() di bawah tetap bisa dipakai ULANG
        // tanpa perubahan, sama seperti K/S/T.
        if (kidungTok.buku === "Sidang Anak") {
          try {
            const bridge = (typeof window !== "undefined" && window.KidungAnak && typeof window.KidungAnak.getBaitsForPresentation === "function")
              ? window.KidungAnak.getBaitsForPresentation : null;
            const result = bridge ? await bridge(kidungTok.no) : null;
            if (!result) {
              out.push({ type: "warning", raw, warning: `${kidungTok.label} No. ${kidungTok.no} tidak ditemukan di data Kidung Anak.` });
              continue;
            }
            if (!result.baits || !result.baits.length) {
              out.push({ type: "warning", raw, warning: `${kidungTok.label} No. ${kidungTok.no} tidak punya syair (kosong).` });
              continue;
            }
            const slides = typeof splitKidungIntoSlides === "function" ? splitKidungIntoSlides(result.baits, "1+koor") : [];
            if (!slides.length) {
              out.push({ type: "warning", raw, warning: `${kidungTok.label} No. ${kidungTok.no} tidak punya slide (syair kosong).` });
              continue;
            }
            slides.forEach((s) => {
              out.push({
                type: "kidung", buku: "Sidang Anak", kidungNo: String(result.song.No || kidungTok.no),
                title: result.song.Judul || "", ikon: "👶",
                bait: s.baits, koorTeks: s.koorTeks,
                pengarang: result.song.Pengarang || "", birama: result.song.Birama || "",
                jumlahBait: result.baits.filter((b) => b.noBait).length || result.baits.length,
                raw,
              });
            });
          } catch (e) {
            out.push({ type: "warning", raw, warning: `Gagal memuat ${kidungTok.label} No. ${kidungTok.no}: ${e && e.message ? e.message : e}` });
          }
          continue;
        }

        try {
          const result = typeof openKidungByKeypad === "function" ? await openKidungByKeypad(kidungTok.buku, kidungTok.no) : null;
          if (!result || !result.baits || !result.baits.length) {
            out.push({ type: "warning", raw, warning: `${kidungTok.label} No. ${kidungTok.no} tidak ditemukan.` });
            continue;
          }
          const meta = Object.assign({ buku: kidungTok.buku }, result.meta || { buku: kidungTok.buku, noKidung: kidungTok.no, judul: "" });
          // Mode pemecah slide default "1+koor" -- SAMA seperti pilihan
          // default #psKidungModeSelect di tab 🎵 Kidung manual, supaya
          // hasilnya "persis seperti kalau operator memilih kidung itu
          // manual" (sesuai janji tabel notasi Bagian 1).
          const slides = typeof splitKidungIntoSlides === "function" ? splitKidungIntoSlides(result.baits, "1+koor") : [];
          if (!slides.length) {
            out.push({ type: "warning", raw, warning: `${kidungTok.label} No. ${kidungTok.no} tidak punya slide (syair kosong).` });
            continue;
          }
          slides.forEach((s) => {
            out.push({
              type: "kidung", buku: meta.buku, kidungNo: meta.noKidung, title: meta.judul || "", ikon: meta.ikon || "",
              bait: s.baits, koorTeks: s.koorTeks,
              pengarang: meta.pengarang || "", birama: meta.birama || "", jumlahBait: meta.jumlahBait || 0,
              raw,
            });
          });
        } catch (e) {
          out.push({ type: "warning", raw, warning: `Gagal memuat ${kidungTok.label} No. ${kidungTok.no}: ${e && e.message ? e.message : e}` });
        }
        continue;
      }

      // 3) Referensi ayat -- boleh dirantai ";" utk pasal/ayat lain di
      //    kitab yang sama (lihat parseReferenceList() di atas). Bahasa
      //    ikut currentLang (jatuh ke CONFIG.DEFAULT_LANGUAGE), SAMA
      //    seperti kotak Alkitab ketik cepat.
      let matchedAnyVerse = false;
      if (typeof parseReferenceList === "function" && typeof getChapterVerses === "function") {
        const refs = parseReferenceList(raw);
        if (refs.length) {
          const lang = (typeof currentLang !== "undefined" && currentLang) ? currentLang : ((typeof CONFIG !== "undefined" && CONFIG.DEFAULT_LANGUAGE) || "ind");
          refs.forEach((ref) => {
            const vStart = ref.verseStart || 1;
            const vEnd = ref.verseEnd || vStart;
            const verses = getChapterVerses(lang, ref.book.num, ref.chapter);
            if (!verses.length) return;
            const matched = ref.verseStart ? verses.filter((v) => v.verse >= vStart && v.verse <= vEnd) : verses;
            // Konsisten dengan cara "➕ Simpan" kotak Alkitab ketik cepat
            // yang sudah ada (wireQuickVerse() di atas): 1 ayat = 1 item
            // tersendiri, walau operator menulis rentang ("28-30").
            matched.forEach((v) => { out.push({ type: "verse", verseId: v.id, raw }); matchedAnyVerse = true; });
          });
        }
      }
      if (matchedAnyVerse) continue;

      // 4) Tidak dikenali sama sekali -- TIDAK dilewati diam-diam.
      out.push({ type: "warning", raw, warning: 'Tidak dikenali -- bukan referensi ayat, K/S/T (Kidung/Suplemen/Tambahan), atau "pengumuman ...". Cek ejaan/format.' });
    }
    return out;
  }

  function wireAiPresentationTab() {
    const input = el("psAiInput");
    const previewBtn = el("psAiPreviewBtn");
    const listWrap = el("psAiPreviewList");
    const saveAllBtn = el("psAiSaveAllBtn");
    const status = el("psAiStatus");
    if (!input || !previewBtn || !listWrap) return;

    let lastItems = []; // hasil parseAiPresentation() TERAKHIR (termasuk warning)
    let validItems = []; // subset lastItems yang BUKAN warning, siap tayang/simpan

    function rowRefAndBody(it) {
      if (it.type === "warning") return { ref: `⚠️ ${it.raw}`, body: it.warning };
      if (typeof collectionItemRef === "function" && typeof collectionItemBodyText === "function") {
        return { ref: collectionItemRef(it), body: collectionItemBodyText(it) };
      }
      return { ref: it.type, body: "" };
    }

    function renderPreview() {
      if (!lastItems.length) {
        listWrap.innerHTML = '<p class="present-saved-empty">Belum ada pratinjau -- ketik di atas lalu tekan "🔎 Pratinjau".</p>';
        return;
      }
      validItems = [];
      listWrap.innerHTML = "";
      lastItems.forEach((it) => {
        const { ref, body } = rowRefAndBody(it);
        const row = document.createElement("div");
        row.className = "ps-verse-row" + (it.type === "warning" ? " ps-ai-row-warning" : "");
        const snippet = (body || "").replace(/\n+/g, " ").slice(0, 90);
        let validIdx = null;
        if (it.type !== "warning") { validIdx = validItems.length; validItems.push(it); row.dataset.playlistIdx = String(validIdx); }
        row.innerHTML = `<span class="ps-verse-ref">${escapeHtml(ref)}</span><span class="ps-verse-snippet">${escapeHtml(snippet)}</span>` +
          (validIdx !== null ? `<div class="ps-btn-row"><button type="button" class="chip-btn small" data-act="show">▶️ Mulai dari sini</button></div>` : "");
        if (validIdx !== null) {
          row.querySelector('[data-act="show"]').addEventListener("click", () => {
            setActivePlaylist(validItems, validIdx, "🤖 AI Presentation");
            sendGenericItemLive(validItems[validIdx]);
          });
        }
        listWrap.appendChild(row);
      });
      highlightActivePlaylistRow();
      const warnCount = lastItems.length - validItems.length;
      if (status) status.textContent = warnCount
        ? `${validItems.length} item siap, ${warnCount} tidak dikenali (⚠️, lihat baris terkait di atas).`
        : `${validItems.length} item siap ditayangkan/disimpan.`;
    }

    previewBtn.addEventListener("click", async () => {
      previewBtn.disabled = true;
      if (status) status.textContent = "Memproses...";
      try {
        lastItems = await parseAiPresentation(input.value);
      } catch (e) {
        lastItems = [];
        if (status) status.textContent = `Gagal memproses: ${e && e.message ? e.message : e}`;
      }
      previewBtn.disabled = false;
      renderPreview();
    });

    if (saveAllBtn) {
      saveAllBtn.addEventListener("click", async () => {
        if (!validItems.length) { if (status) status.textContent = 'Belum ada item siap -- tekan "🔎 Pratinjau" dulu.'; return; }
        if (typeof promptCollectionName !== "function") return;
        const username = typeof currentUser !== "undefined" ? currentUser : null;
        const name = await promptCollectionName(username);
        if (!name) return;
        validItems.forEach((it) => {
          if (it.type === "verse" && typeof addVerseToCollection === "function") addVerseToCollection(username, name, it.verseId);
          else if (it.type === "kidung" && typeof addKidungToCollection === "function") addKidungToCollection(username, name, it);
          else if (it.type === "announcement" && typeof addAnnouncementToCollection === "function") addAnnouncementToCollection(username, name, it.text, it.title);
        });
        renderCollectionSelect();
        if (status) status.textContent = `✅ ${validItems.length} item disimpan ke Kumpulan Ayat "${name}".`;
      });
    }
  }

  // BARU (11 Sep 2026, langkah 4 STATUS-PUSTAKA-MEDIA.md) -- diisi
  // wireYtPlaylistTab() (di bawah) begitu tab "📺 Playlist Video" selesai
  // disiapkan, dipakai tombol "➕ Tambah ke Pustaka" di wireYoutubeTab()
  // (dipanggil LEBIH DULU dari init(), lihat urutan wireYoutubeTab()/
  // wireYtPlaylistTab() di bawah file) supaya bisa menyegarkan daftar
  // Playlist begitu link baru tersimpan ke Pustaka Media -- lihat
  // catatan panjang di ujung wireYtPlaylistTab().
  let reloadYtLibraryPlaylist_ = null;

  function wireYoutubeTab() {
    const input = el("psYtInput");
    const showBtn = el("psYtShowBtn");
    const previewBtn = el("psYtPreviewBtn");
    const addBtn = el("psYtAddQueueBtn");
    const addToLibraryBtn = el("psYtAddToLibraryBtn");
    const saveBtn = el("psYtSaveQueueBtn");
    const queueList = el("psYtQueueList");
    if (!input || !showBtn) return;

    // BARU (11 Sep 2026, langkah 4 STATUS-PUSTAKA-MEDIA.md, bagian 13b
    // RENCANA-PUSTAKA-MEDIA-FAVORIT.md) -- "➕ Tambah ke Pustaka" di
    // sebelah kotak tempel-link manual (#psYtInput) yang SUDAH ADA:
    // supaya link yang ditempel operator BISA langsung tersimpan
    // PERMANEN ke Pustaka Media (dibagikan ke gembala lain/dipakai lagi
    // dari tab "📺 Playlist Video" & tab "🎬 YouTube" Pustaka Media),
    // bukan cuma dipakai sekali pakai seperti sebelumnya ("▶️
    // Tampilkan"/"👁️ Pratinjau"/"➕ Tambah ke Daftar" semuanya TIDAK
    // menyimpan apa-apa ke Pustaka Media, cuma ke Layar 2/daftar sesi
    // lokal). Tombol disembunyikan kalau Pustaka Media belum disetel
    // operator (CONFIG.MEDIA_LIBRARY_APPS_SCRIPT_URL kosong) ATAU level
    // operator ini tidak cukup (MediaLibrary.canAddMedia(), sama dengan
    // tombol "➕ Tambah" di tab YouTube Pustaka Media) -- form yang
    // dibuka (MediaLibrary.openAddForm) SUDAH menegakkan gating ini
    // sendiri, sembunyikan tombolnya juga di sini supaya tidak
    // membingungkan (tombol ada tapi tidak bisa dipakai).
    if (addToLibraryBtn) {
      const showAddToLibrary_ = typeof MediaLibrary !== "undefined" && MediaLibrary.Sync && MediaLibrary.Sync.enabled()
        && typeof MediaLibrary.canAddMedia === "function" && MediaLibrary.canAddMedia();
      addToLibraryBtn.hidden = !showAddToLibrary_;
      if (showAddToLibrary_) {
        addToLibraryBtn.addEventListener("click", async () => {
          const id = extractYoutubeId(input.value);
          if (!id) { alert("Tempel link YouTube yang valid dulu sebelum menambah ke Pustaka Media.\nContoh: https://www.youtube.com/watch?v=XXXXXXXXXXX"); return; }
          // Coba ambil judul & nama channel otomatis dulu (fungsi yang
          // SAMA dipakai "➕ Tambah ke Daftar" di bawah) supaya form
          // Pustaka Media sudah terisi begitu dibuka -- kalau gagal
          // (mis. offline), form tetap dibuka kosong, operator isi manual.
          let prefillNama = "", prefillChannel = "";
          try {
            const meta = await fetchYoutubeTitleAuthor(id);
            if (meta) { prefillNama = meta.title || ""; prefillChannel = meta.author || ""; }
          } catch (e) { /* diamkan -- lihat komentar di atas */ }
          MediaLibrary.openAddForm({
            jenis: "youtube",
            prefill: { link: input.value.trim(), nama: prefillNama, channel: prefillChannel },
            onSaved: () => { if (typeof reloadYtLibraryPlaylist_ === "function") reloadYtLibraryPlaylist_(); },
          });
        });
      }
    }

    // BARU (4 Sep 2026, permintaan operator) -- progress bar "detik
    // mulai" untuk link yang ditempel di kotak ini, lihat
    // createYtSeekBar() di atas. Durasi asli diisi otomatis begitu
    // link valid ditempel (fetchYoutubeDuration(), lewat YouTube IFrame
    // API) -- sebelum itu selesai, slider tetap bisa digeser dengan
    // batas sementara (fallbackMaxSeconds).
    const seekWrap = el("psYtSeekWrap");
    const seekBar = createYtSeekBar({});
    if (seekWrap) seekWrap.appendChild(seekBar.el);
    let lastSeekId = null;
    function refreshSeekForInput() {
      const id = extractYoutubeId(input.value);
      if (!id) { lastSeekId = null; return; }
      if (id === lastSeekId) return; // link sama seperti sebelumnya -- tidak perlu muat ulang durasi/reset slider
      lastSeekId = id;
      seekBar.reset();
      fetchYoutubeDuration(id).then((secs) => { if (secs) seekBar.setDurationSeconds(secs); });
    }
    input.addEventListener("change", refreshSeekForInput);
    input.addEventListener("blur", refreshSeekForInput);

    // BARU (28 Agu 2026) -- checkbox "🔊 Pratinjau ikut bersuara", lihat
    // ytPreviewSoundMode/toStudioPreviewEmbedUrl()/sendYtCommand() di
    // atas untuk penjelasan lengkap.
    const soundModeCb = el("psYtPreviewSoundMode");
    if (soundModeCb) {
      soundModeCb.checked = ytPreviewSoundMode;
      soundModeCb.addEventListener("change", () => {
        ytPreviewSoundMode = soundModeCb.checked;
        localStorage.setItem(YT_PREVIEW_SOUND_KEY, ytPreviewSoundMode ? "1" : "0");
      });
    }

    // Daftar sesi (di memori, belum tersimpan) -- dibangun dulu di sini
    // sebelum ditekan "💾 Simpan ke Media Tersimpan" jadi 1 item dengan
    // banyak video, persis pola PDF multi-halaman: kumpulkan dulu semua
    // embed-URL, baru addMediaItem() sekali di akhir.
    let queue = []; // [{ id, videoId, embedUrl, title, author, durationLabel, label }]

    function labelFor(entry) {
      const parts = [entry.title || entry.videoId];
      if (entry.author) parts.push(entry.author);
      if (entry.durationLabel) parts.push(entry.durationLabel);
      return parts.join(" — ");
    }

    function renderQueue() {
      if (!queueList) return;
      if (!queue.length) {
        queueList.innerHTML = '<p class="present-saved-empty">Belum ada video di daftar.</p>';
        if (saveBtn) saveBtn.disabled = true;
        return;
      }
      queueList.innerHTML = "";
      queue.forEach((q, i) => {
        const row = document.createElement("div");
        row.className = "ps-file-row";
        row.innerHTML = `<span class="ps-file-name">${i + 1}. ${escapeHtml(labelFor(q))}${q.loading ? ' <span class="ps-file-status">(memuat info…)</span>' : ""}</span>
          <span class="ps-file-actions"><button type="button" class="chip-btn small danger" data-act="del">✖️</button></span>`;
        row.querySelector('[data-act="del"]').addEventListener("click", () => {
          queue = queue.filter((x) => x.id !== q.id);
          renderQueue();
        });
        queueList.appendChild(row);
      });
      if (saveBtn) saveBtn.disabled = false;
    }

    function doShow() {
      const id = extractYoutubeId(input.value);
      if (!id) { alert("Link YouTube tidak dikenali. Contoh yang didukung:\nhttps://www.youtube.com/watch?v=XXXXXXXXXXX\nhttps://youtu.be/XXXXXXXXXXX"); return; }
      // BARU (7 Sep 2026, permintaan operator) -- video YouTube TETAP
      // butuh internet (videonya sendiri ada di server YouTube). Kalau
      // Studio ini SEDANG offline, beri tahu operator SEKARANG JUGA
      // (bukan cuma "diam" atau ketahuan belakangan di proyektor) --
      // rawPost() di bawah TETAP dikirim supaya Layar 2 menampilkan
      // pesan "Tidak ada koneksi internet" & otomatis memutar sendiri
      // begitu koneksi kembali (lihat pendingOfflineYoutube_/present.html).
      if (!navigator.onLine) {
        alert("📡 Tidak ada koneksi internet di perangkat ini.\n\nVideo YouTube belum bisa diputar sekarang -- Layar 2 akan menampilkan pesan \"Tidak ada koneksi internet\" & OTOMATIS mulai memutar sendiri begitu koneksi kembali, tanpa perlu menekan \"Tampilkan\" ulang.");
      }
      const embedUrl = buildYoutubeEmbedUrl(id, seekBar.getStartSeconds());
      const bgMode = el("psYtBgMode") && el("psYtBgMode").checked;
      if (bgMode) {
        // Mode "Latar suara saja": video TIDAK menggantikan tampilan
        // ayat/pengumuman yang sedang tayang -- diputar TERSEMBUNYI di
        // #ytBg (lihat present.html), cuma suaranya yang terdengar.
        // Audio latar langsung dikirim, terlepas dari mode 1/dual monitor
        // (tidak ada konsep "pratinjau" untuk audio latar).
        rawPost({ type: "yt_bg", embedUrl });
        setYtBgStatus(`🎧 Latar: ${id} (tekan ▶ Play di bawah untuk mulai)`);
        return;
      }
      // PERBAIKAN (4 Sep 2026, permintaan operator) -- "▶️ Tampilkan"
      // SEKARANG SELALU langsung live ke Layar 2 SAAT ITU JUGA, TIDAK
      // lagi lewat stageOrSend() (dulu, di mode dual monitor, video malah
      // diantre dulu ke kotak "Berikutnya" & operator harus klik 2x --
      // laporan operator 4 Sep 2026, gara-gara sebelumnya baru saja
      // memakai tab Kidung yang mode dual-nya sama). Yang mau diantre
      // dulu ("standby"), sekarang pakai tombol baru "👁️ Pratinjau" di
      // sebelahnya (doPreview() di bawah).
      rawPost({ type: "youtube", embedUrl });
      renderStudioPreview({ type: "youtube", embedUrl });
    }
    // BARU (4 Sep 2026) -- "👁️ Pratinjau": menaruh video ini "standby"
    // di kotak "Berikutnya" (stageNext()) tanpa langsung tayang ke Layar
    // 2, sama seperti tombol serupa di tab Kidung.
    function doPreview() {
      const id = extractYoutubeId(input.value);
      if (!id) { alert("Link YouTube tidak dikenali. Contoh yang didukung:\nhttps://www.youtube.com/watch?v=XXXXXXXXXXX\nhttps://youtu.be/XXXXXXXXXXX"); return; }
      if (!navigator.onLine) { alert("📡 Tidak ada koneksi internet di perangkat ini -- video YouTube belum bisa dimuat sekarang."); return; }
      const embedUrl = buildYoutubeEmbedUrl(id, seekBar.getStartSeconds());
      stageNext(`▶️ YouTube: ${id}`, embedUrl, () => {
        rawPost({ type: "youtube", embedUrl });
        renderStudioPreview({ type: "youtube", embedUrl });
      });
    }
    showBtn.addEventListener("click", doShow);
    if (previewBtn) previewBtn.addEventListener("click", doPreview);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); doShow(); } });

    function setYtBgStatus(text) {
      const s = el("psYtBgStatus");
      if (s) s.textContent = text;
    }
    if (el("psYtBgPlayBtn")) el("psYtBgPlayBtn").addEventListener("click", () => rawPost({ type: "yt_bg_control", action: "play" }));
    if (el("psYtBgPauseBtn")) el("psYtBgPauseBtn").addEventListener("click", () => rawPost({ type: "yt_bg_control", action: "pause" }));
    if (el("psYtBgStopBtn")) el("psYtBgStopBtn").addEventListener("click", () => {
      rawPost({ type: "yt_bg_clear" });
      setYtBgStatus("Belum ada audio latar yang diputar.");
    });
    // Dropdown "Pilih dari video yang sudah tersimpan" -- supaya operator
    // tidak perlu tempel ulang link, tinggal pilih dari Media Tersimpan
    // (kolom kiri) yang bertipe YouTube. Diisi ulang tiap kali tab ini
    // dibuka (lihat pemanggilan populateYtBgPicker() di refreshDeviceGate/
    // openStudio) supaya ikut daftar terbaru.
    async function populateYtBgPicker() {
      const picker = el("psYtBgSavedPicker");
      if (!picker || typeof loadMediaItems !== "function") return;
      const username = typeof currentUser !== "undefined" ? currentUser : null;
      const items = (await loadMediaItems(username)).filter((it) => it.type === "youtube");
      picker.innerHTML = '<option value="">-- pilih video tersimpan untuk diputar sebagai latar --</option>';
      items.forEach((item) => {
        const images = item.images || [];
        images.forEach((url, i) => {
          const lbl = (item.videoLabels && item.videoLabels[i] && item.videoLabels[i].title) || `${item.name} ${images.length > 1 ? `#${i + 1}` : ""}`;
          const opt = document.createElement("option");
          opt.value = url;
          opt.textContent = lbl;
          picker.appendChild(opt);
        });
      });
    }
    window.populateYtBgPicker = populateYtBgPicker;
    // BARU (Tahap 7, ROADMAP-drive-sync.md) -- diekspos ke window supaya
    // wireMediaUploadQueueAutoRetry() (js/collections.js, dipasang dari
    // js/app.js setelah login) bisa menyegarkan daftar Media Tersimpan
    // begitu antrean upload yang tertunda berhasil disinkronkan di latar
    // belakang (mis. koneksi baru kembali online), walau panel Studio
    // Presentasi sedang tidak terbuka sekalipun -- aman dipanggil kapan
    // pun (no-op kalau elemen psMediaList belum ada di DOM saat itu).
    window.renderMediaList = renderMediaList;
    // BARU -- lihat updateMediaQueueBadge() di atas & wireMediaUploadQueueAutoRetry()
    // (js/collections.js) / startApp() (js/app.js) yang memanggilnya
    // setelah login supaya badge sudah benar SEBELUM Studio Presentasi
    // dibuka sama sekali.
    window.updateMediaQueueBadge = updateMediaQueueBadge;
    if (el("psYtBgSavedPicker")) el("psYtBgSavedPicker").addEventListener("change", (e) => {
      const url = e.target.value;
      if (!url) return;
      const label = e.target.options[e.target.selectedIndex].textContent;
      if (typeof window.playAsYtBackground === "function") window.playAsYtBackground(url, label);
    });
    populateYtBgPicker();
    // Dipanggil dari renderMediaList() (tombol 🎧 per item Media
    // Tersimpan) supaya 1 cara yang sama dipakai baik untuk link baru
    // maupun video yang sudah tersimpan.
    window.playAsYtBackground = function playAsYtBackground(embedUrl, label) {
      rawPost({ type: "yt_bg", embedUrl });
      setYtBgStatus(`🎧 Latar: ${label || "video"} (tekan ▶ Play di bawah untuk mulai)`);
    };

    if (addBtn) addBtn.addEventListener("click", () => {
      const id = extractYoutubeId(input.value);
      if (!id) { alert("Link YouTube tidak dikenali."); return; }
      const embedUrl = buildYoutubeEmbedUrl(id);
      const entry = {
        id: "q_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        videoId: id, embedUrl, title: null, author: null, durationLabel: "", loading: true,
      };
      queue.push(entry);
      input.value = "";
      renderQueue();
      // Ambil judul/channel & durasi secara paralel, update baris begitu siap.
      fetchYoutubeTitleAuthor(id).then((meta) => {
        if (meta) { entry.title = meta.title; entry.author = meta.author; }
        entry.loading = false;
        renderQueue();
      });
      fetchYoutubeDuration(id).then((secs) => {
        entry.durationLabel = formatYtDuration(secs);
        renderQueue();
      });
    });

    if (saveBtn) saveBtn.addEventListener("click", async () => {
      if (!queue.length || typeof addMediaItem !== "function") return;
      const defaultName = queue.length === 1 ? (queue[0].title || queue[0].videoId) : "Video YouTube";
      const username = typeof currentUser !== "undefined" ? currentUser : null;
      const name = await promptSaveName("media", username, defaultName);
      if (name === null) return; // dibatalkan
      const embedUrls = queue.map((q) => q.embedUrl);
      // Judul + durasi per video (kalau sempat termuat) ikut disimpan supaya
      // panel Media Tersimpan bisa menampilkan daftarnya -- lihat
      // renderMediaList() & addMediaItem() di js/collections.js.
      const labels = queue.map((q) => ({ title: q.title || q.videoId, durationLabel: q.durationLabel || "" }));
      const id = await addMediaItem(username, name, embedUrls, name, "youtube", labels);
      if (!id) { alert("Gagal menyimpan (penyimpanan perangkat penuh?)."); return; }
      queue = [];
      renderQueue();
      renderMediaList();
      saveBtn.textContent = "✅ Tersimpan";
      setTimeout(() => { saveBtn.textContent = "💾 Simpan ke Media Tersimpan"; }, 1200);
    });

    renderQueue();
  }

  // ------------------------------------------------------------
  // BARU (28 Agu 2026) -- "📺 Playlist Video (dari Google Sheet)", tab
  // ▶️ YouTube. Operator menempel link Google Sheet yang sudah di-
  // "Publish to web" sebagai CSV (kolom: Title, Channel, URL, Anak,
  // Remaja, Pemuda, SPR, Injil, Bebas -- persis susunan yang dipakai di
  // Excel/Sheet operator sendiri, isi "1" di kolom kategori yang
  // cocok). Sheet itu TETAP milik/dikelola operator sendiri (bisa terus
  // diperbarui isinya kapan saja) -- aplikasi ini cuma membaca ulang
  // isinya tiap kali "🔄 Muat Ulang" ditekan, tidak menyimpan salinan
  // videonya. Link Sheet yang sudah dimasukkan disimpan di localStorage
  // (per perangkat/browser) supaya tidak perlu ditempel ulang tiap buka
  // Studio.
  //
  // Video dari daftar ini bisa langsung "▶️ Tampilkan" (ikut playlist
  // TERSARING/filter kategori yang sedang aktif, supaya "🔁 Ulang:
  // Semua" -- lihat wireYtControls() & present.html -- lanjut ke video
  // berikutnya DI DALAM filter yang sama, bukan lompat ke kategori
  // lain), atau "➕ Kumpulan" untuk menaruhnya ke Kumpulan Ayat (lewat
  // addMediaItem()+addMediaToCollection(), sama seperti video yang
  // ditempel manual di atas -- lihat wireYoutubeTab()).
  // ------------------------------------------------------------
  function wireYtPlaylistTab() {
    const urlInput = el("psYtPlaylistSheetUrl");
    const saveBtn = el("psYtPlaylistSaveBtn");
    const reloadBtn = el("psYtPlaylistReloadBtn");
    const statusEl = el("psYtPlaylistStatus");
    const filterWrap = el("psYtPlaylistFilters");
    const listWrap = el("psYtPlaylistList");
    if (!urlInput || !listWrap) return;

    const SHEET_KEY = "bible_app_yt_playlist_sheet_v1";
    // BARU (28 Agu 2026) -- link Google Sheet BAWAAN (dipakai kalau
    // operator belum pernah menyimpan link sendiri di perangkat ini,
    // lihat urlInput.value di bawah). UBAH NILAI INI kalau mau ganti
    // Sheet bawaan untuk SEMUA operator/perangkat -- operator sendiri
    // tetap bisa menimpanya lewat kotak input + "💾 Simpan Link" (yang
    // tersimpan di localStorage per perangkat itu SELALU menang di atas
    // nilai bawaan ini).
    // DIPERBARUI (11 Sep 2026, permintaan operator) -- link Sheet BAWAAN
    // sekarang menunjuk ke Sheet BARU "MediaLibrary" (skema 16 kolom
    // ID/Jenis/Sumber/Nama/Channel/Keterangan/Kategori/Link/KidungRef/
    // Gambar/DurasiDetik/TanggalAsli/Visibility/DiuploadOleh/Tanggal/
    // UpdatedAt -- lihat apps-script/MediaLibraryCode.gs), MENGGANTIKAN
    // Sheet 6-kolom-checkbox LAMA. Skema barunya BEDA (1 kolom "Kategori"
    // teks dipisah koma, bukan 6 kolom Anak/Remaja/.../Bebas terpisah) --
    // lihat parseSheetCsv() di bawah yang sudah disesuaikan supaya
    // mengerti KEDUA skema (baru & lama, deteksi otomatis).
    //
    // CATATAN: jalur "🔄 Muat Ulang" CSV ini HANYA dipakai sebagai
    // CADANGAN kalau Pustaka Media (CONFIG.MEDIA_LIBRARY_APPS_SCRIPT_URL)
    // belum disetel sama sekali -- lihat loadSheet() di bawah. Supaya
    // link ini benar-benar bisa dibaca sebagai CSV, Sheet BARU itu juga
    // harus sudah di-"Publish to web" (File -> Bagikan -> Publikasikan
    // ke web -> pilih tab "MediaLibrary" -> format CSV) -- kalau belum,
    // "🔄 Muat Ulang" akan gagal walau link-nya sudah benar (normal,
    // Apps Script/Sheet privat tidak bisa dibaca langsung sebagai CSV
    // publik).
    const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/13p5RpQwY3I9rXDBEQ4DQ1EXw4XJvQ-Z2bDYuOZ473I0/export?format=csv&gid=0";
    const CATS = [
      { key: "anak", label: "Anak" },
      { key: "remaja", label: "Remaja" },
      { key: "pemuda", label: "Pemuda" },
      { key: "spr", label: "SPR" },
      { key: "injil", label: "Injil" },
      { key: "bebas", label: "Bebas" },
    ];
    let allVideos = []; // [{ title, channel, url, videoId, embedUrl, categories:["Anak","PPKMA",...] }]
    let activeFilter = "all";

    urlInput.value = localStorage.getItem(SHEET_KEY) || DEFAULT_SHEET_URL;

    // Terima juga link Sheet biasa (.../edit#gid=0) selain link "Publish
    // to web" CSV -- diubah otomatis jadi bentuk export CSV supaya
    // operator tidak perlu tahu bedanya.
    //
    // PERBAIKAN: link "Publish to web" berbentuk
    // "/spreadsheets/d/e/<id-panjang>/pub?output=csv" (BUKAN "/d/<id>/edit"
    // biasa) SUDAH berupa CSV siap pakai -- sebelumnya regex di bawah ini
    // salah mengira "e" (segmen path SETELAH "/d/" pada link pub) sebagai
    // ID spreadsheet, lalu merusaknya jadi ".../d/e/export?format=csv..."
    // yang tidak pernah ada. Sekarang link yang sudah mengandung "/pub"
    // atau "output=csv" (dan link CSV lain apa pun) dibiarkan APA ADANYA;
    // hanya link "/d/<id>/edit" (Share biasa, bukan Publish to web) yang
    // dikonversi.
    function normalizeSheetUrl(raw) {
      const s = (raw || "").trim();
      if (!s) return "";
      if (/\/pub\b/.test(s) || /output=csv/i.test(s)) return s; // sudah link CSV siap pakai (Publish to web)
      const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)\/edit/);
      if (!m) return s; // bukan link "Share" biasa -- pakai apa adanya
      const gidMatch = s.match(/[?#&]gid=(\d+)/);
      const gid = gidMatch ? gidMatch[1] : "0";
      return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;
    }

    function truthy(v) {
      const s = String(v == null ? "" : v).trim().toLowerCase();
      return s === "1" || s === "true" || s === "ya" || s === "yes" || s === "x" || s === "v" || s === "✓";
    }

    // BARU (4 Sep 2026, permintaan operator) -- kolom OPSIONAL "Durasi"
    // (menit) & "Tanggal" (upload) di Sheet, dipakai kalau operator mau
    // urutkan daftar berdasarkan itu (lihat sortVideos() di bawah).
    // Kolom ini TIDAK WAJIB ada -- kalau memang belum diisi di Sheet,
    // videonya cukup jatuh ke null & otomatis ditaruh paling bawah saat
    // diurutkan berdasarkan durasi/tanggal (lihat sortVideos()), TIDAK
    // hilang dari daftar sama sekali.
    function parseDurationToMinutes(v) {
      const s = String(v == null ? "" : v).trim();
      if (!s) return null;
      if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s); // "12" / "7.5" -> langsung dianggap menit
      const parts = s.split(":").map((p) => parseInt(p, 10));
      if (!parts.length || parts.some((p) => isNaN(p))) return null;
      let seconds;
      if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]; // jam:menit:detik
      else if (parts.length === 2) seconds = parts[0] * 60 + parts[1]; // menit:detik
      else return null;
      return seconds / 60;
    }
    function parseUploadDate(v) {
      const s = String(v == null ? "" : v).trim();
      if (!s) return null;
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }

    // BARU (11 Sep 2026, langkah 4 STATUS-PUSTAKA-MEDIA.md, bagian 13b/13c
    // RENCANA-PUSTAKA-MEDIA-FAVORIT.md) -- ganti kolom checkbox 6
    // kategori CSV lama (Anak/Remaja/.../Bebas per kolom terpisah)
    // dengan 1 kolom `kategori` teks dipisah koma (skema MediaLibrary
    // baru, js/media-library.js) -- dicocokkan TANPA peduli besar/kecil
    // huruf supaya "Anak"/"anak" dst tetap kena filter tab yang sama.
    //
    // DIPERBARUI (11 Sep 2026, permintaan operator: "supaya kategori
    // yang saya ubah/tambah di Sheet ikut muncul sebagai tombol filter
    // di Studio, bukan cuma 6 yang tetap") -- dulu fungsi ini mengubah
    // kolom "Kategori" jadi objek {anak:bool, remaja:bool, ...} yang
    // HANYA mengenali 6 kunci baku di CATS (kategori lain, mis. isi
    // Sheet operator sendiri seperti "PPKMA", diam-diam DIBUANG --
    // videonya tetap kelihatan di tab "Semua" tapi tidak akan pernah
    // kena filter APA PUN karena tidak ada tombolnya). Sekarang kategori
    // APA ADANYA dari Sheet disimpan sebagai daftar teks mentah
    // (`categories`, lihat pemakaiannya di mapMediaLibraryItemsToVideos_/
    // parseSheetCsv di bawah) -- tombol filter sendiri dibangun OTOMATIS
    // dari kumpulan semua kategori yang benar-benar ada di video yang
    // termuat (lihat computeKnownCategories_()/renderFilters() di bawah),
    // jadi kategori baru yang operator ketik di Sheet langsung dapat
    // tombolnya sendiri begitu "🔄 Muat Ulang" ditekan -- TIDAK PERLU
    // ubah kode lagi tiap kali kategori baru ditambah.
    function splitKategoriRaw_(kategoriStr) {
      return String(kategoriStr || "").split(",").map((s) => s.trim()).filter(Boolean);
    }

    // Memetakan hasil `MediaLibrary.Sync.list({jenis:"youtube"})` (item
    // skema `MediaLibraryCode.gs`: id/jenis/sumber/nama/channel/
    // keterangan/kategori/link/kidungRef/gambar/durasiDetik/
    // tanggalAsli/visibility/diuploadOleh/tanggal/updatedAt) ke bentuk
    // `allVideos` yang SAMA PERSIS dipakai renderList()/sortVideos()/
    // filteredVideos() di bawah (semula dibangun parseSheetCsv() dari
    // CSV) -- supaya SEMUA tampilan/logika grid & filter di bawah ini
    // TIDAK PERLU diubah sama sekali. Baris yang link-nya BUKAN video
    // YouTube (mis. kontribusi SoundCloud/Suno/Drive lewat tab "🎬
    // YouTube" Pustaka Media -- di sana "jenis: youtube" sebenarnya
    // berarti "bukan Efek Suara", sumbernya boleh macam-macam) dilewati
    // diam-diam, PERSIS seperti baris CSV lama tanpa link YouTube yang
    // dikenali (lihat `if (!id) return;` di parseSheetCsv()).
    function mapMediaLibraryItemsToVideos_(items) {
      const out = [];
      (items || []).forEach((item) => {
        const id = typeof extractYoutubeId === "function" ? extractYoutubeId(item.link) : null;
        if (!id) return;
        out.push({
          title: item.nama || id,
          channel: item.channel || "",
          url: item.link, videoId: id,
          embedUrl: buildYoutubeEmbedUrl(id),
          categories: splitKategoriRaw_(item.kategori),
          durationMinutes: item.durasiDetik ? Number(item.durasiDetik) / 60 : null,
          uploadDate: item.tanggalAsli ? parseUploadDate(item.tanggalAsli) : null,
        });
      });
      return out;
    }

    // DIPERBAIKI (11 Sep 2026, permintaan operator) -- Sheet CSV BAWAAN
    // (DEFAULT_SHEET_URL di atas) sekarang berskema BARU (sama dengan
    // apps-script/MediaLibraryCode.gs, dibaca lewat kolom "Kategori" 1
    // teks dipisah koma & "DurasiDetik" dalam DETIK -- lihat
    // splitKategoriRaw_()/mapMediaLibraryItemsToVideos_() di atas
    // yang dipakai jalur Pustaka Media), BUKAN lagi 6 kolom checkbox
    // terpisah Anak/Remaja/.../Bebas + "Durasi" dalam MENIT seperti Sheet
    // LAMA. Fungsi ini sekarang MENDETEKSI OTOMATIS skema mana yang
    // dipakai baris CSV yang sedang dibaca (cek ada/tidaknya kolom
    // "kategori"), supaya:
    //   - Sheet BARU (DEFAULT_SHEET_URL) terbaca benar kalau operator
    //     mem-"Publish to web" -nya, DAN
    //   - link CADANGAN lama (FALLBACK_SHEET_URL, skema 6-kolom) ATAU
    //     link Sheet lama yang mungkin masih disimpan operator di
    //     perangkatnya (localStorage) TETAP jalan seperti sebelumnya --
    //     tidak ada yang tiba-tiba rusak.
    function parseSheetCsv(text) {
      // PERBAIKAN: parseCSV() (js/csv.js) SUDAH mengembalikan array
      // OBJEK per baris (kunci = nama kolom huruf kecil, mis.
      // rec.title/rec.url/rec.anak) -- bukan array-per-baris mentah
      // seperti asumsi awal. Baris header ditangani otomatis oleh
      // parseCSV() itu sendiri, jadi di sini tinggal dipetakan langsung.
      if (typeof parseCSV !== "function") return [];
      const records = parseCSV(text);
      const out = [];
      records.forEach((rec) => {
        // Skema BARU pakai kolom "Link" (bukan "URL") & "Nama" (bukan
        // "Title") -- tapi kedua nama kolom tetap diterima supaya tidak
        // peduli mana pun yang dipakai di Sheet operator.
        const url = (rec.link || rec.url || "").trim();
        const id = typeof extractYoutubeId === "function" ? extractYoutubeId(url) : null;
        if (!id) return; // baris tanpa link YouTube yang dikenali -- lewati diam-diam

        // Kolom "kategori" (huruf kecil, dari header "Kategori") HANYA
        // ada di skema BARU -- dipakai sebagai penanda skema mana yang
        // sedang dibaca.
        const pakaiSkemaBaru = rec.kategori !== undefined;
        const categories = pakaiSkemaBaru
          ? splitKategoriRaw_(rec.kategori)
          // Skema LAMA (6 kolom checkbox terpisah) -- diubah jadi daftar
          // label yang sama seperti dulu (Anak/Remaja/.../Bebas) supaya
          // tombol filter otomatis tetap kebentuk untuk video lama ini.
          : CATS.filter((cc) => truthy(rec[cc.key] || rec[cc.label.toLowerCase()])).map((cc) => cc.label);

        out.push({
          title: (rec.nama || rec.title || rec.judul || "").trim() || id,
          channel: (rec.channel || rec["channel name"] || rec.saluran || "").trim(),
          url, videoId: id,
          embedUrl: buildYoutubeEmbedUrl(id),
          categories,
          // BARU (4 Sep 2026, disesuaikan 11 Sep 2026 utk skema baru) --
          // skema baru simpan "DurasiDetik" dalam DETIK (kolom
          // "durasidetik" huruf kecil), skema lama pakai "Durasi" dalam
          // MENIT -- lihat parseDurationToMinutes()/komentar di atas.
          durationMinutes: pakaiSkemaBaru
            ? (rec.durasidetik ? Number(rec.durasidetik) / 60 : null)
            : parseDurationToMinutes(rec.durasi || rec.menit || rec.duration || rec["durasi (menit)"]),
          // Skema baru pakai "TanggalAsli" (kolom "tanggalasli"), skema
          // lama pakai "Tanggal"/"Upload Date" dsb.
          uploadDate: parseUploadDate(rec.tanggalasli || rec.tanggal || rec.upload || rec["upload date"] || rec.date || rec["tanggal upload"]),
        });
      });
      return out; // urutan APA ADANYA seperti baris di Sheet (atas -> bawah)
    }

    // BARU (4 Sep 2026, permintaan operator) -- cari judul & urutkan
    // daftar. `activeSort` disimpan juga ke localStorage (mirip pola
    // SHEET_KEY di atas) supaya pilihan operator tidak balik ke bawaan
    // tiap buka Studio lagi. Bawaan "terbaru": video yang BARU
    // ditambahkan operator ke Sheet (baris PALING BAWAH di Sheet, cara
    // wajar menambah baris baru) tampil PALING ATAS di daftar -- cukup
    // membalik urutan baris Sheet apa adanya, tidak perlu kolom
    // tambahan apa pun supaya bekerja.
    const SORT_KEY = "bible_app_yt_playlist_sort_v1";
    let activeSort = localStorage.getItem(SORT_KEY) || "terbaru";
    let searchQuery = "";

    function sortVideos(list) {
      const arr = list.slice();
      const byTitle = (a, b) => (a.title || "").localeCompare((b.title || ""), "id", { sensitivity: "base" });
      const byChannel = (a, b) => (a.channel || "").localeCompare((b.channel || ""), "id", { sensitivity: "base" });
      switch (activeSort) {
        case "judul_az": arr.sort(byTitle); break;
        case "judul_za": arr.sort((a, b) => byTitle(b, a)); break;
        case "channel_az": arr.sort(byChannel); break;
        case "channel_za": arr.sort((a, b) => byChannel(b, a)); break;
        // Video tanpa kolom Durasi (null) SELALU ditaruh paling bawah,
        // apa pun arah urutannya (dianggap "data tidak diketahui", bukan
        // "0 menit" -- supaya tidak melompat ke atas kalau diurutkan
        // dari yang terpendek).
        case "durasi_desc": arr.sort((a, b) => (b.durationMinutes ?? -1) - (a.durationMinutes ?? -1)); break;
        case "durasi_asc": arr.sort((a, b) => (a.durationMinutes ?? Infinity) - (b.durationMinutes ?? Infinity)); break;
        // Sama halnya untuk tanggal upload yang belum diisi.
        case "tanggal_desc": arr.sort((a, b) => (b.uploadDate ? b.uploadDate.getTime() : -Infinity) - (a.uploadDate ? a.uploadDate.getTime() : -Infinity)); break;
        case "tanggal_asc": arr.sort((a, b) => (a.uploadDate ? a.uploadDate.getTime() : Infinity) - (b.uploadDate ? b.uploadDate.getTime() : Infinity)); break;
        case "terbaru":
        default:
          arr.reverse(); break;
      }
      return arr;
    }

    function filteredVideos() {
      let list = activeFilter === "all"
        ? allVideos
        : allVideos.filter((v) => (v.categories || []).some((c) => c.trim().toLowerCase() === activeFilter));
      const q = searchQuery.trim().toLowerCase();
      // PERBAIKAN (4 Sep 2026 v2, permintaan operator) -- pencarian
      // SEKARANG ikut mencocokkan NAMA CHANNEL juga, tidak cuma judul
      // video (mis. ketik "TS Media" langsung ketemu semua videonya,
      // walau kata itu tidak ada di judul manapun).
      if (q) list = list.filter((v) => (v.title || "").toLowerCase().includes(q) || (v.channel || "").toLowerCase().includes(q));
      return sortVideos(list);
    }

    // BARU (11 Sep 2026, permintaan operator) -- kumpulkan SEMUA
    // kategori yang benar-benar dipakai video yang termuat sekarang
    // (huruf kecil = kunci filter/pembanding, versi apa adanya = label
    // tombol yang ditampilkan -- diambil dari kemunculan PERTAMA supaya
    // "Anak"/"anak" campur tidak jadi 2 tombol beda). Dipanggil ulang
    // tiap kali allVideos berubah (lihat renderFilters() di bawah &
    // pemanggilnya di loadFromMediaLibrary()/loadSheet()).
    function computeKnownCategories_() {
      const seen = new Map();
      allVideos.forEach((v) => {
        (v.categories || []).forEach((raw) => {
          const label = String(raw || "").trim();
          if (!label) return;
          const key = label.toLowerCase();
          if (!seen.has(key)) seen.set(key, label);
        });
      });
      return Array.from(seen.entries())
        .map(([key, label]) => ({ key, label }))
        .sort((a, b) => a.label.localeCompare(b.label, "id", { sensitivity: "base" }));
    }

    // DIPERBARUI (11 Sep 2026, permintaan operator: "kategori yang saya
    // ubah di Sheet supaya ikut muncul sebagai tombol di Studio") --
    // dulu tombol filter 100% statis dari HTML (6 tombol tetap:
    // Anak/Remaja/Pemuda/SPR/Injil/Bebas). Sekarang, selain tombol
    // "Semua" yang tetap ada, SEMUA tombol lain DIBANGUN ULANG tiap
    // renderFilters() dipanggil, mengikuti computeKnownCategories_() di
    // atas -- jadi kategori apa pun yang operator ketik/ubah di kolom
    // Kategori Sheet langsung dapat tombolnya sendiri begitu video
    // termuat, TANPA perlu ubah kode/HTML lagi.
    function renderFilters() {
      if (!filterWrap) return;
      filterWrap.querySelectorAll("[data-filter]:not([data-filter='all'])").forEach((btn) => btn.remove());
      computeKnownCategories_().forEach((c) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chip-btn small";
        btn.dataset.filter = c.key;
        btn.textContent = c.label;
        btn.addEventListener("click", () => {
          activeFilter = c.key;
          renderFilters();
          renderList();
        });
        filterWrap.appendChild(btn);
      });
      filterWrap.querySelectorAll("[data-filter]").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.filter === activeFilter);
      });
    }

    function renderList() {
      const videos = filteredVideos();
      if (!videos.length) {
        listWrap.innerHTML = `<p class="present-saved-empty">${allVideos.length ? "Tidak ada video untuk filter ini." : "Belum ada video dimuat -- tempel link Google Sheet lalu tekan \"🔄 Muat Ulang\"."}</p>`;
        return;
      }
      listWrap.innerHTML = "";
      videos.forEach((v, i) => {
        const row = document.createElement("div");
        row.className = "ps-yt-playlist-row";
        const tagsHtml = (v.categories || [])
          .map((c) => `<span class="ps-yt-playlist-tag">${escapeHtml(c)}</span>`).join("");
        row.innerHTML = `
          <img class="ps-yt-playlist-thumb" src="https://i.ytimg.com/vi/${escapeHtml(v.videoId)}/mqdefault.jpg" alt="" loading="lazy" />
          <div class="ps-yt-playlist-info">
            <span class="ps-yt-playlist-title">${escapeHtml(v.title)}</span>
            <span class="ps-yt-playlist-channel">${escapeHtml(v.channel || "")}</span>
            ${tagsHtml ? `<span class="ps-yt-playlist-tags">${tagsHtml}</span>` : ""}
          </div>
          <div class="ps-file-actions">
            <button type="button" class="chip-btn small primary" data-act="show">▶️ Tampilkan</button>
            <button type="button" class="chip-btn small" data-act="preview">👁️ Pratinjau</button>
            <button type="button" class="chip-btn small" data-act="addcol">➕ Kumpulan</button>
          </div>`;
        // BARU (4 Sep 2026, permintaan operator) -- progress bar "detik
        // mulai" per video, sama persis mekanismenya dengan kotak tempel-
        // link manual di atas (createYtSeekBar()). Kalau kolom opsional
        // "Durasi" sudah diisi di Sheet, dipakai langsung sebagai batas
        // kanan slider -- kalau belum, dipakai batas sementara (3 hari)
        // supaya rekaman/live streaming sangat panjang tetap bisa digeser
        // jauh (operator juga bisa ketik manual lewat tombol "✏️").
        const seek = createYtSeekBar({ durationSeconds: v.durationMinutes ? v.durationMinutes * 60 : 0 });
        row.appendChild(seek.el);
        // "▶️ Tampilkan" -- SELALU langsung live ke Layar 2 SEKARANG JUGA
        // (dulu lewat stageOrSend(), sehingga di mode dual monitor malah
        // diantre dulu & perlu klik 2x -- laporan operator 4 Sep 2026).
        // Yang mau diantre dulu ("standby"), pakai "👁️ Pratinjau" di bawah.
        row.querySelector('[data-act="show"]').addEventListener("click", () => {
          const embedUrl = buildYoutubeEmbedUrl(v.videoId, seek.getStartSeconds());
          const queue = videos.map((q) => ({ embedUrl: q.embedUrl }));
          rawPost({ type: "youtube", embedUrl, queue, queueIndex: i });
          renderStudioPreview({ type: "youtube", embedUrl });
        });
        row.querySelector('[data-act="preview"]').addEventListener("click", () => {
          const embedUrl = buildYoutubeEmbedUrl(v.videoId, seek.getStartSeconds());
          const queue = videos.map((q) => ({ embedUrl: q.embedUrl }));
          stageNext(v.title, v.title, () => {
            rawPost({ type: "youtube", embedUrl, queue, queueIndex: i });
            renderStudioPreview({ type: "youtube", embedUrl });
          });
        });
        row.querySelector('[data-act="addcol"]').addEventListener("click", async (e) => {
          const btn = e.currentTarget;
          if (typeof addMediaItem !== "function" || typeof addMediaToCollection !== "function") return;
          const sel = el("psCollectionSelect");
          const username = typeof currentUser !== "undefined" ? currentUser : null;
          const name = (sel && sel.value && typeof loadCollections === "function" && loadCollections(username)[sel.value])
            ? loadCollections(username)[sel.value].name
            : await promptCollectionName(username);
          if (!name) return;
          btn.disabled = true;
          const mediaId = await addMediaItem(username, v.title, [v.embedUrl], v.title, "youtube", [{ title: v.title, durationLabel: "" }]);
          btn.disabled = false;
          if (!mediaId) { alert("Gagal menyimpan (penyimpanan perangkat penuh?)."); return; }
          addMediaToCollection(username, name, { id: mediaId, name: v.title }, 0);
          if (typeof renderMediaList === "function") renderMediaList();
          if (typeof renderCollectionSelect === "function") renderCollectionSelect();
          btn.textContent = "✅ Ditambahkan";
          setTimeout(() => { btn.textContent = "➕ Kumpulan"; }, 1200);
        });
        listWrap.appendChild(row);
      });
    }

    // BARU (28 Agu 2026) -- link CADANGAN ("Publish to web" -> CSV,
    // beda bentuk dari DEFAULT_SHEET_URL di atas yang pakai
    // "/export?format=csv") -- dicoba OTOMATIS kalau link UTAMA (yang
    // dipakai operator, tersimpan di localStorage ATAU DEFAULT_SHEET_URL)
    // gagal dimuat/gagal di-fetch sama sekali. Dua bentuk link Google
    // Sheet ini biasanya menunjuk ke data yang SAMA (Sheet operator
    // sendiri, cuma diterbitkan lewat 2 cara berbeda) -- kalau salah
    // satu bentuknya diblokir/gagal (mis. gara-gara sesi Google sedang
    // bermasalah, redirect internal Google yang gagal di-fetch dari
    // browser tertentu, dst), yang satunya sering kali TETAP jalan.
    const FALLBACK_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSFnIaLTF5o2XVdXT-hivwPT4qTGB1y6VHIKFex4gKHggWIcp0f3JJusnUXvQeHw0pCGVVeMiJUhxYf/pub?output=csv";

    async function fetchAndParse(url) {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      return parseSheetCsv(text);
    }

    // BARU (11 Sep 2026, langkah 4 STATUS-PUSTAKA-MEDIA.md) -- sumber
    // data UTAMA sekarang Pustaka Media (`MediaLibraryCode.gs`, lewat
    // `js/media-library.js`), MENGGANTIKAN Sheet CSV publik lama
    // (bagian 13b RENCANA-...md: "ganti sumber data YouTube dari CSV
    // lama ke MediaLibrary"). `media_list` SUDAH terurut TERBARU DULU
    // (diurutkan mundur berdasarkan `id`, lihat komentar `mlJsonOut_`/
    // sort di `MediaLibraryCode.gs`) -- kebalikan dari baris Sheet CSV
    // lama (paling lama di atas, baris baru ditambah di BAWAH). Supaya
    // sortVideos() ("terbaru": arr.reverse()) & seluruh logika sort/
    // filter di bawah TIDAK PERLU disentuh, hasilnya di-.reverse() dulu
    // di sini supaya urutan `allVideos` tetap "lama -> baru" PERSIS
    // seperti kontrak lama dari parseSheetCsv().
    async function loadFromMediaLibrary() {
      if (statusEl) statusEl.textContent = "⏳ Memuat dari Pustaka Media…";
      try {
        const items = await MediaLibrary.Sync.list({ jenis: "youtube" });
        allVideos = mapMediaLibraryItemsToVideos_(items).reverse();
        if (statusEl) statusEl.textContent = `✅ ${allVideos.length} video dimuat dari Pustaka Media (terakhir dimuat ${new Date().toLocaleTimeString("id-ID")}).`;
        renderFilters(); // BARU (11 Sep 2026) -- tombol kategori ikut kategori Sheet terbaru
        renderList();
      } catch (err) {
        if (statusEl) statusEl.textContent = "❌ Gagal memuat dari Pustaka Media: " + (err && err.message ? err.message : String(err));
      }
    }

    async function loadSheet() {
      // Pustaka Media (MediaLibrary) sudah disetel operator (CONFIG.
      // MEDIA_LIBRARY_APPS_SCRIPT_URL terisi) -- pakai itu, BUKAN CSV
      // lagi. Kotak link Google Sheet CSV di bawah TETAP dibiarkan APA
      // ADANYA di layar (bagian 13c: Sheet lama TIDAK dihapus, operator
      // boleh pindah isinya kapan saja) tapi tidak lagi dipakai untuk
      // memuat daftar -- lihat komentar loadFromMediaLibrary() di atas.
      if (typeof MediaLibrary !== "undefined" && MediaLibrary.Sync && MediaLibrary.Sync.enabled()) {
        return loadFromMediaLibrary();
      }
      // Fallback LAMA (CSV Google Sheet publik) -- HANYA dipakai kalau
      // Pustaka Media belum disetel operator sama sekali, supaya Studio
      // versi lama/belum sempat deploy Apps Script TETAP bisa jalan
      // seperti sebelumnya (tidak ujug-ujug kosong).
      const url = normalizeSheetUrl(urlInput.value);
      if (!url) { if (statusEl) statusEl.textContent = "Tempel dulu link Google Sheet-nya (Publish to web -> CSV)."; return; }
      if (statusEl) statusEl.textContent = "⏳ Memuat…";
      try {
        allVideos = await fetchAndParse(url);
        if (statusEl) statusEl.textContent = `✅ ${allVideos.length} video dimuat (terakhir dimuat ${new Date().toLocaleTimeString("id-ID")}).`;
        renderFilters();
        renderList();
      } catch (e) {
        // Link utama gagal -- coba link cadangan sebelum benar-benar
        // menyerah, TAPI HANYA kalau link utama yang dipakai operator
        // BUKAN link cadangan itu sendiri (supaya tidak mencoba 2x link
        // yang sama persis kalau memang itu yang gagal).
        if (url !== FALLBACK_SHEET_URL) {
          try {
            allVideos = await fetchAndParse(FALLBACK_SHEET_URL);
            if (statusEl) statusEl.textContent = `✅ ${allVideos.length} video dimuat lewat link cadangan (link utama gagal dimuat -- terakhir dimuat ${new Date().toLocaleTimeString("id-ID")}).`;
            renderFilters();
            renderList();
            return;
          } catch (e2) { /* cadangan juga gagal -- lanjut tampilkan pesan gagal di bawah */ }
        }
        if (statusEl) statusEl.textContent = "❌ Gagal memuat Sheet. Pastikan link sudah \"Publish to web\" (bukan cuma \"Share\") sebagai CSV, dan koneksi internet aktif.";
      }
    }

    if (saveBtn) saveBtn.addEventListener("click", () => {
      localStorage.setItem(SHEET_KEY, urlInput.value.trim());
      loadSheet();
    });
    if (reloadBtn) reloadBtn.addEventListener("click", loadSheet);
    // DIPERBARUI (11 Sep 2026) -- tombol kategori (selain "Semua") SEKARANG
    // dibangun & dipasangi listener-nya sendiri di renderFilters() (lihat
    // komentar di sana), jadi di sini tinggal pasang untuk tombol "Semua"
    // saja yang tetap statis dari HTML.
    if (filterWrap) filterWrap.querySelectorAll("[data-filter='all']").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeFilter = btn.dataset.filter;
        renderFilters();
        renderList();
      });
    });
    // BARU (4 Sep 2026, permintaan operator) -- cari judul & pilih urutan.
    const searchInput = el("psYtPlaylistSearch");
    const sortSelect = el("psYtPlaylistSort");
    if (sortSelect) sortSelect.value = activeSort;
    if (searchInput) searchInput.addEventListener("input", () => { searchQuery = searchInput.value; renderList(); });
    if (sortSelect) sortSelect.addEventListener("change", () => {
      activeSort = sortSelect.value;
      localStorage.setItem(SORT_KEY, activeSort);
      renderList();
    });
    renderFilters();
    // BARU (11 Sep 2026) -- kalau Pustaka Media sudah disetel, langsung
    // muat OTOMATIS tiap Studio dibuka (tidak perlu menunggu operator
    // menekan "🔄 Muat Ulang" dulu, ATAU sudah pernah menyimpan link
    // Sheet CSV lama) -- fallback CSV lama TETAP hanya auto-muat kalau
    // memang sudah pernah disimpan sebelumnya (perilaku lama, tidak
    // berubah).
    const mediaLibraryReady_ = typeof MediaLibrary !== "undefined" && MediaLibrary.Sync && MediaLibrary.Sync.enabled();
    if (mediaLibraryReady_ || urlInput.value.trim()) loadSheet();

    // BARU (11 Sep 2026, langkah 4 STATUS-PUSTAKA-MEDIA.md) -- diekspos
    // ke variabel module-level (dideklarasikan dekat wireYoutubeTab())
    // supaya tombol "➕ Tambah ke Pustaka" di kotak tempel-link manual
    // (wireYoutubeTab(), dipanggil SEBELUM wireYtPlaylistTab() dari
    // init() -- lihat urutan pemanggilan di bawah file ini) bisa
    // menyegarkan daftar "📺 Playlist Video" ini begitu link baru
    // tersimpan, tanpa operator perlu pindah tab & tekan "🔄 Muat Ulang"
    // manual. Aman dipanggil kapan saja (no-op efektif kalau elemen tab
    // ini belum sempat dibuka/dibangun -- tapi wireYtPlaylistTab()
    // sendiri SELALU dijalankan sekali di init(), jadi closure ini
    // sudah selalu siap dipanggil sejak awal).
    reloadYtLibraryPlaylist_ = loadSheet;
  }

  // Tombol ▶️ Play / ⏸️ Pause / 🔇 Mute di baris ikon atas kotak "Tayang"
  // -- mengontrol video YouTube yang SEDANG tayang di Layar 2 lewat
  // postMessage (lihat yt_control di present.html), DAN skrng juga ikut
  // mengontrol iframe pratinjau mini di Studio (#psYtPreviewFrame) lewat
  // postMessage yang sama, supaya pratinjau & Layar 2 terlihat sinkron
  // (pratinjau sendiri sudah dibuat tidak bisa diklik langsung -- lihat
  // renderStudioPreview()). Tidak melakukan apa-apa kalau tidak ada video
  // yang sedang tayang (present.html sendiri yang menjaga/abaikan kalau
  // ytEl kosong; iframe pratinjau juga dicek dulu keberadaannya).
  function wireYtControls() {
    // BARU (12 Sep 2026 v3, laporan operator "tekan P jadi play-play-play
    // baru pause, tidak tentu") -- ▶️ Play & ⏸️ Pause DIGABUNG jadi SATU
    // tombol (#psYtPlayPauseBtn, lihat index.html) supaya cuma ADA SATU
    // jalur kode yang mengubah status main/jeda, dipakai SAMA PERSIS baik
    // diklik mouse MAUPUN ditekan lewat pintasan keyboard "P" -- lihat
    // doYtPlay_()/doYtPause_()/refreshPlayPauseBtnUi_() di bawah. Sebelum
    // ini, 2 tombol terpisah membuat status `ytIsPlaying` bisa TIDAK
    // SINKRON kalau operator memulai video lewat klik mouse tombol
    // ▶️ Play (yang TIDAK pernah menyentuh `ytIsPlaying`) -- giliran "P"
    // ditekan, toggle salah membaca status LAMA (masih false) sehingga
    // malah main lagi (bukan jeda) di penekanan pertama.
    const playPauseBtn = el("psYtPlayPauseBtn");
    const muteBtn = el("psYtMuteBtn");
    // BARU (28 Agu 2026) -- ⏹️ Stop & 🔁 Ulang (Repeat), lihat catatan
    // panjang di present.html (handler "yt_control" action "stop" &
    // "yt_repeat"). Repeat berputar: Mati -> Satu Video -> Semua
    // (Playlist) -> Mati, disimpan juga ke localStorage supaya tetap
    // sama kalau Studio ditutup lalu dibuka lagi.
    const stopBtn = el("psYtStopBtn");
    const repeatBtn = el("psYtRepeatBtn");
    let muted = false;

    // BARU (10 Sep 2026, sesi ke-11) -- tombol toggle CC/Teks YouTube
    // dibuat lewat JS di sini (BUKAN nambah markup baru ke index.html,
    // sesuai permintaan operator "cukup di presentation-studio.js
    // saja") -- disisipkan tepat setelah #psYtMuteBtn supaya berkumpul
    // dengan kontrol YouTube lain. Logika hidup/mati sesungguhnya ada
    // di setYtCaptionsEnabled_()/toggleYtCaptions_() (lihat di atas,
    // dekat buildYoutubeEmbedUrl()) -- di sini cuma UI-nya.
    let captionsBtn = el("psYtCaptionsBtn");
    if (!captionsBtn && muteBtn && muteBtn.parentNode) {
      captionsBtn = document.createElement("button");
      captionsBtn.type = "button";
      captionsBtn.id = "psYtCaptionsBtn";
      captionsBtn.className = "chip-btn small";
      muteBtn.insertAdjacentElement("afterend", captionsBtn);
    }
    function refreshCaptionsBtnUi_() {
      if (!captionsBtn) return;
      captionsBtn.textContent = ytCaptionsEnabled ? "📝 Teks: Nyala" : "📝 Teks: Mati";
      captionsBtn.title = "Tampilkan/sembunyikan teks (Closed Caption) bawaan YouTube di Layar 2 -- pintasan keyboard: Alt+C";
      captionsBtn.classList.toggle("active", ytCaptionsEnabled);
    }
    refreshCaptionsBtnUi_();
    document.addEventListener("ps-yt-captions-changed", refreshCaptionsBtnUi_);
    if (captionsBtn) captionsBtn.addEventListener("click", () => toggleYtCaptions_());
    // ------------------------------------------------------------
    // BARU (4 Sep 2026 v3, permintaan operator) -- laporan: "saat tekan
    // ▶️ Play pertama kali, suara tidak muncul, harus ⏹️ Stop lalu
    // 🔇 Mute, 🔇 Bersuara (unmute), baru ▶️ Play lagi -- baru suaranya
    // muncul". Sebabnya: begitu video BARU dimuat (src iframe YouTube
    // diganti), iframe itu jadi dokumen yang SAMA SEKALI BARU di mata
    // browser -- perintah "playVideo" yang dikirim lewat postMessage
    // dari Studio TIDAK dihitung sebagai "interaksi pengguna langsung"
    // di dalam iframe itu, jadi kebijakan browser (Chrome dkk) MENOLAK
    // memutar video itu DENGAN SUARA di percobaan pertama (video bisu
    // dibolehkan tanpa syarat apa pun, video bersuara yang BARU mulai
    // butuh interaksi langsung). Setelah operator memaksa lewat
    // Stop->Mute->Unmute->Play, di percobaan itu videonya SUDAH SEMPAT
    // "hidup" (walau bisu) sehingga menyalakan suara belakangan (bukan
    // memulai dari nol dengan suara) TIDAK kena aturan yang sama --
    // makanya baru bekerja.
    //
    // PERBAIKAN: begitu ada video BARU (ditandai renderStudioPreview()
    // lewat markYtNeedsSoundUnlock() di bawah), ▶️ Play SEKARANG
    // otomatis melakukan urutan yang SAMA di baliknya SENDIRI (mute ->
    // play -> tunggu videonya benar sudah main -> unmute) -- operator
    // cukup 1x tekan ▶️ Play saja, video langsung main DAN bersuara,
    // tanpa perlu 4 langkah manual lagi.
    let needsSoundUnlock = false;
    window.markYtNeedsSoundUnlock = () => { needsSoundUnlock = true; };
    const REPEAT_KEY = "bible_app_yt_repeat_mode_v1";
    const REPEAT_LABELS = { off: "🔁 Ulang: Mati", one: "🔂 Ulang: Satu Video", all: "🔁 Ulang: Semua" };
    let repeatMode = localStorage.getItem(REPEAT_KEY) || "off";
    if (!REPEAT_LABELS[repeatMode]) repeatMode = "off";

    function sendYtCommand(action, arg) {
      rawPost({ type: "yt_control", action, arg }); // -> Layar 2 (present.html) -- SATU-SATUNYA yang boleh bersuara
      const previewFrame = el("psYtPreviewFrame"); // -> pratinjau mini di Studio (SENGAJA selalu bisu)
      if (previewFrame && previewFrame.contentWindow) {
        // PERBAIKAN (laporan operator 28 Agu 2026, "suara jadi dobel saat
        // Play dari daftar YouTube"): "mute"/"unmute" TIDAK LAGI ikut
        // diteruskan ke pratinjau mini ini. Pratinjau ini SENGAJA dibuat
        // permanen bisu (lihat toStudioPreviewEmbedUrl(), parameter
        // "mute=1" saat iframe-nya dibuat) supaya operator TIDAK PERNAH
        // dengar suara dari sini -- cuma Layar 2 (`#ytView` di
        // present.html) yang boleh bersuara ke pendengar.
        //   BUG SEBELUMNYA: perintah "unmute" (dikirim tombol "🔇 Mute"
        //   di atas, dipakai untuk MENYALAKAN suara Layar 2) ikut
        //   dikirim ke pratinjau mini ini juga lewat map `cmd` di bawah
        //   -- begitu operator menekan tombol itu untuk membunyikan
        //   Layar 2, pratinjau mini di Studio JUGA ikut jadi bersuara,
        //   sehingga video yang SAMA terdengar 2x sekaligus (dobel) dari
        //   2 sumber (Layar 2 asli + pratinjau mini Studio) -- terutama
        //   kentara saat menguji coba di 1 komputer yang sama (Layar 1 &
        //   Layar 2 sama-sama kedengaran dari speaker yang sama).
        //   PERBAIKAN: "mute"/"unmute" DIHAPUS dari peta perintah ini --
        //   Play/Pause/Stop TETAP diteruskan (supaya pratinjau terlihat
        //   sinkron SECARA VISUAL dengan Layar 2), tapi status bisu/
        //   bersuara pratinjau TIDAK PERNAH lagi disamakan dengan Layar 2
        //   -- KECUALI operator SENGAJA menyalakan checkbox "🔊 Pratinjau
        //   ikut bersuara" (khusus uji coba 1 laptop, lihat
        //   ytPreviewSoundMode & toStudioPreviewEmbedUrl() di atas) --
        //   dalam mode itu, mute/unmute BOLEH ikut diteruskan lagi,
        //   karena memang itu maksudnya (operator sadar & sengaja minta
        //   pratinjau bersuara).
        //   BARU (4 Sep 2026 v2) -- "seek" (lompat detik) DITAMBAHKAN ke
        //   KEDUA peta (bukan cuma mode ytPreviewSoundMode) -- beda dari
        //   mute/unmute, melompat detik TIDAK memicu suara apa pun di
        //   pratinjau mini ini (tetap bisu, cuma posisinya yang ikut
        //   berpindah secara visual supaya tetap terlihat sinkron dengan
        //   Layar 2), jadi aman selalu diteruskan.
        const cmdMap = ytPreviewSoundMode
          ? { play: "playVideo", pause: "pauseVideo", stop: "stopVideo", mute: "mute", unmute: "unMute", seek: "seekTo" }
          : { play: "playVideo", pause: "pauseVideo", stop: "stopVideo", seek: "seekTo" };
        const cmd = cmdMap[action];
        const args = action === "seek" ? [arg || 0, true] : [];
        if (cmd) previewFrame.contentWindow.postMessage(JSON.stringify({ event: "command", func: cmd, args }), "*");
      }
    }

    function applyRepeatUi() {
      if (!repeatBtn) return;
      repeatBtn.textContent = REPEAT_LABELS[repeatMode];
      repeatBtn.classList.toggle("active", repeatMode !== "off");
    }

    // ------------------------------------------------------------
    // BARU (4 Sep 2026 v2, permintaan operator) -- progress bar + kolom
    // waktu LIVE (#psYtLiveBar) yang mengikuti video YouTube yang SUNGGUH
    // sedang tayang di Layar 2 -- BEDA dari createYtSeekBar() (itu cuma
    // menyiapkan detik MULAI, SEBELUM "Tampilkan"/"Pratinjau" ditekan).
    //
    // Posisi & durasi ASLI dilaporkan balik oleh present.html lewat
    // postMessage "present_yt_progress" (diteruskan js/presentation.js
    // sebagai CustomEvent "ps-yt-progress", lihat listener di bawah) --
    // jadi Studio TIDAK perlu memuat player YouTube-nya sendiri lagi cuma
    // untuk membaca posisi.
    //
    // Kolom waktu (#psYtLiveTimeInput) BISA DIKETIK MANUAL: begitu ▶️ Play
    // ditekan, isi kolom itu dibaca -- kalau formatnya valid (detik polos,
    // MM:SS, HH:MM:SS, atau D:HH:MM:SS, lihat parseDHMSToSeconds()), video
    // LANGSUNG dilompat (seekTo) ke detik itu SEBELUM diputar, baik di
    // Layar 2 (present.html) MAUPUN pratinjau mini Studio (sendYtCommand()
    // di atas sudah meneruskan "seek" ke keduanya). Kalau operator BELUM
    // sempat mengetik apa pun (kolom masih menampilkan posisi TERAKHIR
    // yang dilaporkan live -- mis. tempat video dijeda), melompat ke detik
    // yang SAMA itu tidak berpengaruh apa pun -- efeknya sama seperti
    // sekadar melanjutkan (resume) dari situ, jadi 1 logika ini cukup
    // untuk 2 kebutuhan (lompat ke titik pilihan ATAU lanjutkan dari jeda).
    //
    // Selagi operator SEDANG mengetik (fokus di kolom) atau SEDANG
    // menggeser slider, laporan posisi live yang masuk TIDAK menimpa
    // ketikan/geseran itu (`liveEditing`/`liveDragging`) -- baru dibaca
    // lagi normal begitu selesai (blur / lepas geser).
    // ------------------------------------------------------------
    const liveRange = el("psYtLiveRange");
    const liveTimeInput = el("psYtLiveTimeInput");
    const liveDurationLabel = el("psYtLiveDuration");
    let liveDurationSeconds = 0;
    let liveEditing = false;
    let liveDragging = false;

    function refreshLiveDurationLabel() {
      if (liveDurationLabel) liveDurationLabel.textContent = liveDurationSeconds > 0 ? formatSecondsToDHMS(liveDurationSeconds) : "--:--:--";
    }
    function resetYtLiveBar() {
      liveDurationSeconds = 0;
      if (liveRange) { liveRange.value = "0"; liveRange.max = "0"; }
      if (liveTimeInput) liveTimeInput.value = "00:00:00";
      refreshLiveDurationLabel();
    }
    resetYtLiveBar();
    // Dipanggil syncYtLiveBarVisibility() (renderStudioPreview(), atas)
    // tiap kali video BARU ditayangkan (embedUrl beda dari sebelumnya).
    window.resetYtLiveBar = resetYtLiveBar;

    // BARU (10 Sep 2026, sesi ke-11, permintaan operator "keyboard P
    // untuk toggle play/pause YouTube") -- `ytIsPlaying` dijaga tetap
    // akurat dari laporan status ASLI player (playerState 1 = playing,
    // lihat konstanta resmi YouTube IFrame API), BUKAN ditebak dari
    // tombol mana yang terakhir diklik -- supaya toggle tetap benar
    // walau video di-play/pause lewat cara lain (mis. operator sempat
    // klik langsung tombol bawaan YouTube di pratinjau mini).
    let ytIsPlaying = false;

    // BARU (12 Sep 2026 v3, laporan operator "tekan P jadi play-play-
    // play baru pause") -- tampilan tombol tunggal ini SELALU disamakan
    // dengan `ytIsPlaying` lewat 1 fungsi ini saja, dipanggil dari SETIAP
    // tempat yang mengubah status (klik tombol, pintasan "P", maupun
    // koreksi dari laporan status asli "ps-yt-progress" di bawah) --
    // supaya labelnya ("▶️ Play" / "⏸️ Pause") tidak pernah "ketinggalan"
    // dari status yang sebenarnya.
    function refreshPlayPauseBtnUi_() {
      if (!playPauseBtn) return;
      playPauseBtn.textContent = ytIsPlaying ? "⏸️ Pause" : "▶️ Play";
      playPauseBtn.title = ytIsPlaying
        ? "Jeda video YouTube di Layar 2 (pintasan: P)"
        : "Putar video YouTube di Layar 2 (pintasan: P)";
    }
    refreshPlayPauseBtnUi_();

    // BARU (4 Sep 2026 v2) -- baca kolom waktu LIVE dulu: kalau isinya
    // format waktu yang valid, lompat (seek) ke situ SEBELUM main --
    // kosong/format tidak dikenali = perilaku LAMA (main/lanjut apa
    // adanya dari posisi sekarang, tanpa melompat).
    function doYtPlay_() {
      const typed = liveTimeInput ? liveTimeInput.value : "";
      const secs = parseDHMSToSeconds(typed);
      if (secs != null) {
        sendYtCommand("seek", secs);
        if (liveRange) liveRange.value = String(secs);
      }
      // BARU (4 Sep 2026 v3) -- lihat catatan panjang "needsSoundUnlock"
      // di atas. Kalau operator SENGAJA sudah menekan 🔇 Mute (muted
      // true), jangan dipaksa bersuara -- cukup main bisu seperti biasa.
      if (needsSoundUnlock && !muted) {
        sendYtCommand("mute");
        sendYtCommand("play");
        let settled = false;
        const finishUnlock = () => {
          if (settled) return;
          settled = true;
          window.removeEventListener("ps-yt-progress", onProgress);
          clearTimeout(fallbackTimer);
          if (!muted) sendYtCommand("unmute"); // jaga-jaga kalau operator sempat menekan Mute selagi menunggu
          needsSoundUnlock = false;
        };
        // Nyalakan suara TEPAT begitu player benar-benar mulai main
        // (playerState 1) -- lebih andal daripada jeda waktu tetap,
        // karena kecepatan koneksi/buffering tiap kali bisa beda.
        const onProgress = (e) => {
          const st = e && e.detail && e.detail.state;
          if (st === 1) finishUnlock();
        };
        window.addEventListener("ps-yt-progress", onProgress);
        // Jaga-jaga kalau laporan status di atas tidak pernah datang
        // (mis. video gagal dimuat) -- tetap nyalakan suara setelah
        // waktu wajar, supaya tidak diam bisu selamanya.
        const fallbackTimer = setTimeout(finishUnlock, 1500);
      } else {
        sendYtCommand("play");
      }
      ytIsPlaying = true;
      refreshPlayPauseBtnUi_();
    }
    function doYtPause_() {
      sendYtCommand("pause");
      ytIsPlaying = false;
      refreshPlayPauseBtnUi_();
    }

    // SATU tombol, SATU fungsi toggle -- dipakai SAMA PERSIS baik diklik
    // mouse (listener di bawah) maupun ditekan lewat pintasan keyboard
    // "P" (window.toggleYtPlayPause_, dipanggil dari
    // wireModeAndBellKeyboardShortcuts()). Sebelumnya (2 tombol terpisah
    // ▶️ Play & ⏸️ Pause) status `ytIsPlaying` bisa tidak sinkron kalau
    // operator memulai video lewat klik mouse -- sekarang klik mouse pun
    // SELALU lewat toggle yang sama, jadi tidak ada lagi jalur yang
    // "lupa" memperbarui status.
    window.toggleYtPlayPause_ = function toggleYtPlayPause_() {
      if (ytIsPlaying) doYtPause_(); else doYtPlay_();
    };
    if (playPauseBtn) playPauseBtn.addEventListener("click", () => window.toggleYtPlayPause_());

    window.addEventListener("ps-yt-progress", (e) => {
      const d = (e && e.detail) || {};
      if (typeof d.duration === "number" && d.duration > 0 && Math.round(d.duration) !== liveDurationSeconds) {
        liveDurationSeconds = Math.round(d.duration);
        if (liveRange) liveRange.max = String(liveDurationSeconds);
        refreshLiveDurationLabel();
      }
      if (typeof d.currentTime === "number" && !liveEditing && !liveDragging) {
        const secs = Math.max(0, Math.round(d.currentTime));
        if (liveRange) liveRange.value = String(secs);
        if (liveTimeInput) liveTimeInput.value = formatSecondsToDHMS(secs);
      }
      if (typeof d.state === "number" && d.state !== 1 && d.state !== 2) return; // hanya playing(1)/paused(2) yang relevan utk toggle
      if (typeof d.state === "number") {
        const nowPlaying = d.state === 1;
        if (nowPlaying !== ytIsPlaying) { ytIsPlaying = nowPlaying; refreshPlayPauseBtnUi_(); }
      }
    });

    if (liveTimeInput) {
      // Selagi kolom ini difokus, JANGAN ditimpa laporan posisi live --
      // operator sedang menulis detik tujuan sendiri.
      liveTimeInput.addEventListener("focus", () => { liveEditing = true; });
      liveTimeInput.addEventListener("blur", () => { liveEditing = false; });
      // Enter = langsung sama seperti menekan ▶️ Play (lompat + main).
      liveTimeInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); liveTimeInput.blur(); doYtPlay_(); }
      });
    }
    if (liveRange) {
      const startDrag = () => { liveDragging = true; };
      liveRange.addEventListener("mousedown", startDrag);
      liveRange.addEventListener("touchstart", startDrag);
      liveRange.addEventListener("input", () => {
        if (liveTimeInput) liveTimeInput.value = formatSecondsToDHMS(parseInt(liveRange.value, 10) || 0);
      });
      const commitDrag = () => {
        liveDragging = false;
        sendYtCommand("seek", parseInt(liveRange.value, 10) || 0);
      };
      liveRange.addEventListener("change", commitDrag);
      liveRange.addEventListener("mouseup", commitDrag);
      liveRange.addEventListener("touchend", commitDrag);
    }
    if (stopBtn) stopBtn.addEventListener("click", () => {
      sendYtCommand("stop");
      // "Stop" (beda dari Pause) mengembalikan video ke keadaan belum-
      // main -- kolom waktu & slider ikut disamakan ke 00:00:00 supaya
      // tidak menampilkan posisi lama yang sudah tidak berlaku, TANPA
      // ikut menghapus durasi yang sudah diketahui (video yang sama,
      // cuma diulang dari awal).
      if (liveRange) liveRange.value = "0";
      if (liveTimeInput) liveTimeInput.value = "00:00:00";
      // Stop = video berhenti main -- tombol tunggal ikut disamakan
      // balik ke "▶️ Play" (bukan dibiarkan menampilkan "⏸️ Pause" yang
      // sudah tidak sesuai keadaan sebenarnya).
      ytIsPlaying = false;
      refreshPlayPauseBtnUi_();
    });
    if (muteBtn) muteBtn.addEventListener("click", () => {
      muted = !muted;
      sendYtCommand(muted ? "mute" : "unmute");
      muteBtn.textContent = muted ? "🔇 Bersuara" : "🔇 Mute";
      muteBtn.classList.toggle("active", muted);
      // BARU (10 Sep 2026, sesi ke-12, permintaan operator "tetap ada
      // shortcut M untuk mute SEMUA suara") -- tombol/pintasan Mute yang
      // SUDAH ADA ini (dulu cuma mengurus suara YouTube) SEKARANG ikut
      // membisukan/membunyikan efek suara 🎉 Efek Panggung (confetti/
      // reaksi/dst) juga, lewat 1 payload baru "effects_mute" -- lihat
      // setEffectsMuted_()/getEffectsMasterGain_() di present.html.
      // TIDAK dikirim ke pratinjau mini Studio (`psYtPreviewFrame`) --
      // beda dari YouTube, efek suara memang TIDAK PERNAH diputar di
      // pratinjau mini (cuma di Layar 2 sungguhan), jadi tidak ada apa
      // pun untuk dibisukan di sana.
      rawPost({ type: "effects_mute", muted });
    });
    if (repeatBtn) {
      repeatBtn.addEventListener("click", () => {
        repeatMode = repeatMode === "off" ? "one" : repeatMode === "one" ? "all" : "off";
        localStorage.setItem(REPEAT_KEY, repeatMode);
        applyRepeatUi();
        rawPost({ type: "yt_repeat", mode: repeatMode }); // -> Layar 2 (present.html)
      });
      applyRepeatUi();
      rawPost({ type: "yt_repeat", mode: repeatMode }); // beri tahu Layar 2 mode tersimpan begitu Studio dibuka
    }
    // Dipakai wireYoutubeTab()/wireYtPlaylistTab() supaya video baru yang
    // ditampilkan langsung ikut mode Ulang yang sedang aktif tanpa
    // operator perlu menekan ulang tombol Ulang tiap ganti video.
    window.getYtRepeatMode = () => repeatMode;
  }

  // ============================================================
  // BARU (7 Sep 2026, permintaan operator) -- 🎬 Video Lokal (MP4),
  // tab "🎬 Video Lokal" (tengah, sebelah "▶️ YouTube"). Lihat catatan
  // panjang di HTML tab-nya (index.html) untuk gambaran umum. Detail
  // teknis penting di sini:
  //
  // KENAPA "path" (alamat file) TIDAK dipakai langsung:
  //   Browser (demi keamanan semua pengguna internet) SENGAJA TIDAK
  //   mengizinkan halaman web membaca sembarang alamat file di komputer
  //   (mis. "C:\Video\ibadah.mp4") begitu saja -- kalau boleh, sembarang
  //   situs web bisa diam-diam membaca file pribadi siapa pun yang
  //   membukanya. Jalan resmi yang paling dekat dengan "pakai path" itu
  //   adalah File System Access API (showDirectoryPicker) di bawah --
  //   operator MEMBERI IZIN SEKALI ke SATU folder tertentu, lalu browser
  //   mengingat izin itu (tidak perlu pilih ulang tiap sesi) & aplikasi
  //   bisa membaca file APA SAJA di folder itu secepat & seringan
  //   membaca dari path asli -- BUKAN upload, videonya TIDAK PERNAH
  //   disalin ke mana pun, cuma "dipinjam" langsung dari disk.
  //
  // KENAPA BUKAN "upload": begitu file dipilih (baik lewat folder atau
  //   satu-satu), Studio TIDAK PERNAH mengirimnya ke server/internet --
  //   Blob file itu dikirim LANGSUNG dari memori jendela Studio ke
  //   memori jendela Layar 2 (present.html) lewat postMessage (sama
  //   mekanisme yang dipakai gambar Latar/dsb, lihat showLocalVideo() di
  //   present.html) -- makanya TIDAK ADA batas ukuran buatan dari kode,
  //   & TIDAK butuh internet sama sekali.
  //
  // Folder handle (izin akses folder) disimpan ke IndexedDB terpisah
  // (openLvHandleDb_() di bawah, BUKAN ikut skema LocalDB utama di js/
  // db.js supaya tidak perlu menaikkan versi skema yang sudah ada --
  // FileSystemDirectoryHandle sendiri BISA disimpan langsung ke
  // IndexedDB modern, Chrome mengizinkannya) -- begitu Studio dibuka
  // lagi lain kali, izin itu otomatis dicoba dipakai lagi tanpa perlu
  // buka dialog folder ulang (kecuali browser memang minta konfirmasi
  // ulang, tetap wajar & aman).
  // ============================================================
  // ------------------------------------------------------------
  // BARU (8 Sep 2026, permintaan operator "tombol shortcut mode & bel")
  // -- ⚡ MODE CEPAT: tombol siap-pakai yang menerapkan KOMBINASI
  // `camLayout` + `videoTextOverlay` sekaligus lewat 1 klik (operator
  // tidak perlu buka panel 🎥 Kamera lalu klik 2-3 kontrol terpisah
  // setiap kali mau ganti gaya tampilan). Daftarnya TERSIMPAN di
  // localStorage (`MODE_PRESETS_KEY`) & BISA DIKUSTOMISASI PENUH oleh
  // operator (tambah/hapus tombol sendiri lewat "➕ Tambah Mode Sendiri",
  // lihat wireModeShortcuts() di bawah) -- daftar di bawah ini HANYA
  // dipakai sebagai ISIAN AWAL (seed) sekali saat localStorage masih
  // kosong, BUKAN daftar tetap yang tidak bisa diubah.
  //
  // PENTING -- preset SENGAJA HANYA mengubah GAYA (camLayout/
  // videoTextOverlay), TIDAK ikut menyalakan Kamera/Video/File apa pun
  // sendiri -- kalau preset otomatis menyalakan Kamera, operator bisa
  // kaget tiba-tiba diminta izin kamera oleh Layar 2 padahal cuma
  // klik tombol gaya. Sumber (Kamera/Video Lokal/YouTube/File) TETAP
  // dipilih manual seperti biasa lewat tab masing-masing -- preset cuma
  // menyiapkan "wadah" tampilannya duluan.
  // ------------------------------------------------------------
  const MODE_PRESETS_KEY = "presentModePresetsV1";
  const DEFAULT_MODE_PRESETS = [
    { id: "m1", label: "🎬 Video Full", camLayout: "full", videoTextOverlay: false },
    { id: "m2", label: "📐 Video + Teks (Separuh)", camLayout: "split", videoTextOverlay: true },
    { id: "m3", label: "🎬📝 Video Full + Teks", camLayout: "subtitle", videoTextOverlay: true },
    { id: "m4", label: "🎥 Kamera Full + Teks", camLayout: "full", videoTextOverlay: false },
    { id: "m5", label: "🔵 Kamera Bulat + Teks", camLayout: "bubble", videoTextOverlay: false },
    { id: "m6", label: "📄 File/PDF + Teks", camLayout: "full", videoTextOverlay: true },
    // BARU (9 Sep 2026, sesi ke-9, permintaan operator "semua tipe
    // kamera/slide dimasukkan ke Menu Cepat, lanjut nomor berikutnya") --
    // 5 kombinasi BARU yang belum terwakili di m1-m6 di atas (kiri-kanan,
    // balik atas-bawah, subtitle atas, kamera-penuh+teks-bulat). Preset
    // m5 (bubble) & m10/m11 (textbubble) SENGAJA pakai posisi bawaan
    // "br" (kanan-bawah) -- kalau mau posisi/ukuran lain, tinggal atur
    // manual lewat "Posisi lingkaran"/slider ukuran setelah preset ini
    // ditekan (Mode Cepat cuma titik awal cepat, bukan pengganti kontrol
    // detailnya). CATATAN PENOMORAN: badge angka/keyboard shortcut cuma
    // sampai tombol ke-9 (lihat NUM_BADGES_ & wireModeAndBellKeyboardShortcuts()
    // di bawah) -- m10 & m11 di sini TETAP bisa diklik seperti biasa,
    // hanya TIDAK dapat badge angka/shortcut keyboard (tombol ke-10/11).
    { id: "m7", label: "◧ Kamera Kiri, Teks Kanan", camLayout: "split-lr", videoTextOverlay: false, camSplitReverse: false },
    { id: "m8", label: "◨ Kamera Kanan, Teks Kiri", camLayout: "split-lr", videoTextOverlay: false, camSplitReverse: true },
    { id: "m9", label: "📐 Teks Atas, Kamera Bawah", camLayout: "split", videoTextOverlay: false, camSplitReverseTB: true },
    { id: "m10", label: "🎬 Kamera Full + Subtitle Atas", camLayout: "subtitle", videoTextOverlay: true, camSubtitleTop: true },
    { id: "m11", label: "⭕ Kamera Full, Teks Bulat", camLayout: "textbubble", videoTextOverlay: false },
  ];
  function loadModePresets_() {
    try {
      const raw = localStorage.getItem(MODE_PRESETS_KEY);
      if (raw) { const list = JSON.parse(raw); if (Array.isArray(list) && list.length) return list; }
    } catch (e) {}
    return DEFAULT_MODE_PRESETS.slice();
  }
  function saveModePresets_(list) {
    try { localStorage.setItem(MODE_PRESETS_KEY, JSON.stringify(list)); } catch (e) {}
  }
  function applyModePreset_(preset) {
    // PERBAIKAN (9 Sep 2026, sesi ke-9) -- SEBELUMNYA cuma mengirim
    // camLayout+videoTextOverlay, jadi kalau operator pindah dari preset
    // "Kamera Kanan, Teks Kiri" (camSplitReverse:true) ke preset lain
    // yang camLayout-nya sama tapi tidak menyebut camSplitReverse, nilai
    // TRUE lama itu "nyangkut" (tidak pernah direset ke false). Sekarang
    // SEMUA field orientasi/posisi disertakan eksplisit dengan fallback
    // aman (false/"br") supaya tiap preset benar-benar bersih, tidak
    // mewarisi sisa preset sebelumnya.
    saveAndSendTheme({
      camLayout: preset.camLayout,
      videoTextOverlay: !!preset.videoTextOverlay,
      camSplitReverse: !!preset.camSplitReverse,
      camSplitReverseTB: !!preset.camSplitReverseTB,
      camSubtitleTop: !!preset.camSubtitleTop,
      bubblePos: preset.bubblePos || "br",
    });
    // Sinkronkan ulang SEMUA kontrol terkait (tombol Tata Letak aktif,
    // slider, centang overlay) supaya panel Studio tidak "ketinggalan"
    // menampilkan gaya lama -- applyStoredTheme() membaca ulang
    // localStorage yang baru saja ditulis saveAndSendTheme() di atas.
    if (typeof applyStoredTheme === "function") applyStoredTheme();
    renderModeShortcutRow(); // refresh status tombol "sedang aktif"
  }
  const NUM_BADGES_ = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"];
  function renderModeShortcutRow() {
    const row = el("psModeShortcutRow");
    if (!row) return;
    const list = loadModePresets_();
    let theme = {};
    try { theme = JSON.parse(localStorage.getItem(THEME_KEY) || "{}") || {}; } catch (e) {}
    row.innerHTML = list.map((p, i) => {
      // PERBAIKAN (9 Sep 2026, sesi ke-9) -- SEBELUMNYA cuma cocokkan
      // camLayout+videoTextOverlay, jadi preset "Kamera Kiri, Teks Kanan"
      // & "Kamera Kanan, Teks Kiri" (camLayout SAMA-SAMA "split-lr",
      // beda cuma camSplitReverse) akan menyala BERSAMAAN -- sekarang
      // ikut cocokkan semua field orientasi/posisi juga.
      const active = (theme.camLayout || "full") === p.camLayout
        && !!theme.videoTextOverlay === !!p.videoTextOverlay
        && !!theme.camSplitReverse === !!p.camSplitReverse
        && !!theme.camSplitReverseTB === !!p.camSplitReverseTB
        && !!theme.camSubtitleTop === !!p.camSubtitleTop
        && (theme.bubblePos || "br") === (p.bubblePos || "br");
      // BARU (8 Sep 2026 v5, permintaan operator "info tombol 1-9 apa,
      // mudah dimengerti") -- badge nomor (①②③...) ditempel LANGSUNG di
      // tombolnya (bukan cuma lewat `title`/hover, yang tidak kelihatan
      // sama sekali di HP layar sentuh) -- operator langsung tahu angka
      // berapa yang harus ditekan tanpa perlu menebak/hover dulu. Kalau
      // urutan tombol lebih dari 9 (mis. setelah nambah "Custom"),
      // sisanya TIDAK dapat badge angka karena shortcut keyboard memang
      // cuma sampai tombol ke-9 (lihat wireModeAndBellKeyboardShortcuts()).
      const badge = i < 9 ? `<span class="ps-shortcut-badge" title="Tekan angka ${i + 1} di keyboard">${NUM_BADGES_[i]}</span> ` : "";
      return `<button type="button" class="chip-btn small${active ? " active" : ""}" data-mode-preset-id="${escapeHtml(p.id)}" title="Shortcut keyboard: angka ${i + 1}">${badge}${escapeHtml(p.label)}${p.custom ? ` <span data-mode-del-id="${escapeHtml(p.id)}" title="Hapus mode ini" style="opacity:.7; cursor:pointer;">✕</span>` : ""}</button>`;
    }).join("");
    row.querySelectorAll("[data-mode-preset-id]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        if (e.target.closest("[data-mode-del-id]")) return; // klik ✕ ditangani terpisah di bawah, jangan ikut menerapkan preset
        const id = btn.dataset.modePresetId;
        const preset = loadModePresets_().find((p) => p.id === id);
        if (preset) applyModePreset_(preset);
      });
    });
    row.querySelectorAll("[data-mode-del-id]").forEach((x) => {
      x.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = x.dataset.modeDelId;
        saveModePresets_(loadModePresets_().filter((p) => p.id !== id));
        renderModeShortcutRow();
      });
    });
  }
  function wireModeShortcuts() {
    renderModeShortcutRow();
    if (el("psModeAddBtn")) {
      el("psModeAddBtn").addEventListener("click", () => {
        if (el("psModeAddForm")) el("psModeAddForm").hidden = false;
        if (el("psModeAddName")) el("psModeAddName").focus();
      });
    }
    if (el("psModeAddCancelBtn")) {
      el("psModeAddCancelBtn").addEventListener("click", () => {
        if (el("psModeAddForm")) el("psModeAddForm").hidden = true;
        if (el("psModeAddName")) el("psModeAddName").value = "";
        if (el("psModeAddOverlay")) el("psModeAddOverlay").checked = false;
      });
    }
    if (el("psModeAddSaveBtn")) {
      el("psModeAddSaveBtn").addEventListener("click", () => {
        const name = (el("psModeAddName") && el("psModeAddName").value.trim()) || "";
        if (!name) { if (el("psModeAddName")) el("psModeAddName").focus(); return; }
        const layout = (el("psModeAddLayout") && el("psModeAddLayout").value) || "full";
        const overlay = !!(el("psModeAddOverlay") && el("psModeAddOverlay").checked);
        const list = loadModePresets_();
        list.push({ id: "custom-" + Date.now(), label: name, camLayout: layout, videoTextOverlay: overlay, custom: true });
        saveModePresets_(list);
        renderModeShortcutRow();
        if (el("psModeAddForm")) el("psModeAddForm").hidden = true;
        if (el("psModeAddName")) el("psModeAddName").value = "";
        if (el("psModeAddOverlay")) el("psModeAddOverlay").checked = false;
      });
    }
  }

  // ------------------------------------------------------------
  // BARU (8 Sep 2026, permintaan operator "shortcut bel 1 2 3") -- 🔔 Bel
  // Cepat: membunyikan salah satu CONFIG.BELL_SOUNDS (js/config.js)
  // LANGSUNG lewat pesan {type:"bell", action:"ring", key}, ditangani
  // ringBell() di present.html (fungsi yang SAMA dipakai bel otomatis
  // Timer) -- terpisah total dari alur Timer, bisa dipakai kapan saja
  // (mis. tanda mulai sesi, tanda giliran bicara, dst). Daftar tombolnya
  // OTOMATIS mengikuti CONFIG.BELL_SOUNDS -- tambah bel baru di sana,
  // tombolnya otomatis muncul di sini juga tanpa perlu ubah kode ini.
  // ------------------------------------------------------------
  function renderBellShortcutRow() {
    const row = el("psBellShortcutRow");
    if (!row) return;
    const list = getBellChoices_();
    // BARU (8 Sep 2026 v5) -- badge nomor Alt+N, pola SAMA seperti
    // renderModeShortcutRow() di atas (lihat catatan panjang di sana).
    row.innerHTML = list.map((b, i) => {
      const badge = i < 9 ? `<span class="ps-shortcut-badge" title="Tekan Alt+${i + 1} di keyboard">Alt+${i + 1}</span> ` : "";
      return `<button type="button" class="chip-btn small" data-bell-key="${escapeHtml(b.key)}" title="Shortcut keyboard: Alt+${i + 1}">${badge}${escapeHtml(b.label)}</button>`;
    }).join("");
    row.querySelectorAll("[data-bell-key]").forEach((btn) => {
      btn.addEventListener("click", () => rawPost({ type: "bell", action: "ring", key: btn.dataset.bellKey }));
    });
  }
  function wireBellShortcuts() {
    renderBellShortcutRow();
    if (el("psBellStopBtn")) el("psBellStopBtn").addEventListener("click", () => rawPost({ type: "bell", action: "stop" }));
  }

  // ------------------------------------------------------------
  // BARU (9 Sep 2026, sesi ke-9, Fitur A "Menu Cepat ⚡") -- panel
  // mengambang berisi aksi 1-klik yang PALING sering dipakai, dikumpulkan
  // dari beberapa tab (Mode Cepat, Efek Panggung, Bel Cepat, Mode Layar,
  // Peta) supaya bisa dipicu tanpa pindah tab dulu. SEMUA tombol di sini
  // SENGAJA cuma memanggil ULANG fungsi/payload yang SUDAH ADA (applyModePreset_,
  // rawPost effect/shout/bell, showModeScreen "istirahat", klik tab "mode")
  // -- TIDAK ADA logika baru terpisah -- supaya perilakunya 100% konsisten
  // dengan tombol aslinya di tab masing-masing (kalau salah satu diperbaiki
  // nanti, yang di sini otomatis ikut benar juga, tidak perlu diperbaiki 2x).
  // ------------------------------------------------------------
  function wireQuickMenu() {
    const overlay = el("psQuickMenuOverlay");
    if (!overlay) return;
    if (el("psQuickMenuToggleBtn")) {
      el("psQuickMenuToggleBtn").addEventListener("click", () => {
        renderQuickMenuContents_();
        overlay.hidden = false;
      });
    }
    if (el("psQuickMenuCloseBtn")) el("psQuickMenuCloseBtn").addEventListener("click", () => { overlay.hidden = true; });
    // Klik di area gelap (BUKAN di dalam kotak panel putih/gelap-nya)
    // juga menutup -- pola sama seperti overlay konfirmasi lain di app ini.
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.hidden = true; });
    document.addEventListener("keydown", (e) => {
      if (!overlay.hidden && e.key === "Escape") overlay.hidden = true;
    });
    // PERBAIKAN (9 Sep 2026, sesi ke-9) -- 4 tombol statis di bawah
    // (BUKAN dibangun ulang tiap buka menu, beda dari modeRow/effectRow/
    // bellRow yang lewat innerHTML di renderQuickMenuContents_() --
    // ganti innerHTML otomatis membuang listener LAMA, jadi aman
    // dipasang ulang tiap render) HARUS dipasang SEKALI SAJA di sini
    // (bukan di dalam renderQuickMenuContents_(), yang jalan tiap kali
    // menu dibuka) -- kalau dipasang di sana, tiap buka-tutup-buka lagi
    // menambah 1 listener BARU menumpuk di elemen yang SAMA (elemen
    // statis tidak pernah dibuang), bikin 1 klik memicu aksi 2x, 3x,
    // dst semakin sering menu ini dibuka.
    if (el("psQuickBreakBtn2")) {
      el("psQuickBreakBtn2").addEventListener("click", () => { if (el("psQuickBreakBtn")) el("psQuickBreakBtn").click(); });
    }
    if (el("psQuickMuteBtn")) {
      el("psQuickMuteBtn").addEventListener("click", () => {
        const muteBtn = el("psYtMuteBtn");
        if (muteBtn) muteBtn.click();
      });
    }
    if (el("psQuickBellStopBtn")) {
      el("psQuickBellStopBtn").addEventListener("click", () => rawPost({ type: "bell", action: "stop" }));
    }
    if (el("psQuickMapBtn")) {
      el("psQuickMapBtn").addEventListener("click", () => {
        const mapTabBtn = document.querySelector('[data-ps-right-tab="mode"]');
        if (mapTabBtn) mapTabBtn.click();
        overlay.hidden = true;
      });
    }
  }
  function renderQuickMenuContents_() {
    // ---- Tata Letak (Mode Cepat 1-11) -- numpang applyModePreset_() ----
    const modeRow = el("psQuickModeRow");
    if (modeRow) {
      const presets = loadModePresets_();
      modeRow.innerHTML = presets.map((p, i) =>
        `<button type="button" class="chip-btn small" data-quick-mode-idx="${i}">${i < 9 ? "①②③④⑤⑥⑦⑧⑨"[i] + " " : ""}${escapeHtml(p.label)}</button>`
      ).join("");
      modeRow.querySelectorAll("[data-quick-mode-idx]").forEach((btn) => {
        btn.addEventListener("click", () => applyModePreset_(presets[Number(btn.dataset.quickModeIdx)]));
      });
    }
    // ---- Efek & Seruan -- numpang payload rawPost yang SAMA dgn tab Efek Panggung ----
    const effectRow = el("psQuickEffectRow");
    if (effectRow) {
      effectRow.innerHTML = `
        <button type="button" class="chip-btn small" data-quick-effect="confetti">🎉 Confetti</button>
        <button type="button" class="chip-btn small" data-quick-emoji="👏">👏 Tepuk</button>
        <button type="button" class="chip-btn small" data-quick-emoji="😂">😂 Tertawa</button>
        <button type="button" class="chip-btn small" data-quick-shout="PUJI TUHAN!">🙌 Puji Tuhan!</button>
        <button type="button" class="chip-btn small" data-quick-shout="HALELUYA!">🙌 Haleluya!</button>
      `;
      effectRow.querySelectorAll("[data-quick-effect]").forEach((btn) => {
        btn.addEventListener("click", () => rawPost({ type: "effect", effect: btn.dataset.quickEffect }));
      });
      effectRow.querySelectorAll("[data-quick-emoji]").forEach((btn) => {
        btn.addEventListener("click", () => rawPost({ type: "effect", effect: "emoji", emoji: btn.dataset.quickEmoji }));
      });
      effectRow.querySelectorAll("[data-quick-shout]").forEach((btn) => {
        btn.addEventListener("click", () => rawPost({ type: "shout", text: btn.dataset.quickShout }));
      });
    }
    // ---- Bel Cepat -- numpang CONFIG.BELL_SOUNDS yang SAMA dgn tab Bel Cepat ----
    const bellRow = el("psQuickBellRow");
    if (bellRow) {
      const bells = getBellChoices_();
      bellRow.innerHTML = bells.map((b, i) =>
        `<button type="button" class="chip-btn small" data-quick-bell-key="${escapeHtml(b.key)}">${escapeHtml(b.label)}</button>`
      ).join("") || '<span class="ps-pointer-hint">Belum ada bel dikonfigurasi.</span>';
      bellRow.querySelectorAll("[data-quick-bell-key]").forEach((btn) => {
        btn.addEventListener("click", () => rawPost({ type: "bell", action: "ring", key: btn.dataset.quickBellKey }));
      });
    }
    // ---- Pintasan lain (☕ Break Time / 🔇 Mute / ⏹️ Stop Bel / 🗺️ Peta)
    // -- listener-nya SUDAH dipasang SEKALI di wireQuickMenu() (elemen
    // statis, tidak perlu dipasang ulang tiap render, lihat catatan di
    // sana kenapa).
  }

  // BARU (10 Sep 2026, sesi ke-10) -- ingat pilihan tampil/sembunyi
  // scrollbar lintas sesi (localStorage), bawaan TAMPIL (key belum ada
  // = dianggap "tampil", SESUAI keputusan "defaultnya show"). Dipanggil
  // sekali saat Studio dibuka (lihat pemanggilannya di init) supaya
  // konsisten dengan pilihan terakhir operator, dan tiap kali Alt+H
  // ditekan (toggleScrollbarVisibility_()).
  const SCROLLBAR_HIDDEN_KEY = "bible_app_ps_scrollbars_hidden_v1";
  function applyScrollbarVisibilityFromStorage_() {
    let hidden = false;
    try { hidden = localStorage.getItem(SCROLLBAR_HIDDEN_KEY) === "1"; } catch (e) {}
    document.body.classList.toggle("ps-scrollbars-hidden", hidden);
  }
  function toggleScrollbarVisibility_() {
    const hidden = document.body.classList.toggle("ps-scrollbars-hidden");
    try { localStorage.setItem(SCROLLBAR_HIDDEN_KEY, hidden ? "1" : "0"); } catch (e) {}
  }

  // BARU (12 Sep 2026 v2) -- penyimpan waktu & kombinasi pintasan
  // terakhir yang DIPROSES, dipakai debounce di wireModeAndBellKeyboardShortcuts()
  // di bawah (lihat catatan panjang di sana).
  let lastShortcutKey_ = null;
  let lastShortcutAt_ = 0;

  function wireModeAndBellKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      const studio = el("presentStudio");
      if (!studio || studio.hidden) return;
      const tag = (document.activeElement && document.activeElement.tagName) || "";
      if (tag === "SELECT" || tag === "INPUT" || tag === "TEXTAREA") return;
      // BARU (12 Sep 2026, laporan operator "tekan P malah pause lalu
      // main sendiri lagi") -- `e.repeat` TRUE berarti event ini bukan
      // penekanan baru, tapi "gema" otomatis dari OS/browser karena
      // tombolnya masih tertekan sedikit lebih lama dari sepersekian
      // detik (atau keyboard yang nge-bounce, kirim keydown dobel utk
      // 1x tekan fisik). Kalau ini dibiarkan lolos, toggle Play/Pause
      // (P) bisa "gantian 2x" dalam waktu SANGAT singkat -- keydown ke-2
      // masih membaca status LAMA (laporan status baru dari Layar 2
      // belum sempat sampai lewat postMessage), sehingga malah
      // membalik toggle 2x (Pause lalu Play lagi) alih-alih 1x seperti
      // niat penekanan aslinya. Diabaikan SEKALIGUS untuk SEMUA
      // pintasan di bawah (P, M, Alt+H, Alt+C, 1-9, Alt+1-9) -- bukan
      // cuma P -- supaya semuanya konsisten aman dari gema yang sama.
      if (e.repeat) return;
      // BARU (12 Sep 2026 v2, laporan operator "masih ngaco, tekan P 1x
      // tetap kadang blip pause lalu main sendiri lagi -- ternyata pakai
      // stylus/pena, bukan keyboard fisik biasa") -- `e.repeat` di atas
      // CUMA menyaring gema tombol yang DITAHAN lama (OS auto-repeat).
      // Stylus/keyboard virtual/layar sentuh kadang mengirim BEBERAPA
      // event `keydown` yang BENAR-BENAR TERPISAH (bukan auto-repeat,
      // `e.repeat` tetap false di semuanya) untuk 1x sentuhan/ketuk --
      // lolos dari penyaring di atas, tapi efeknya SAMA PERSIS (2x
      // toggle beruntun dalam hitungan milidetik = kelihatan "ngeblip").
      // Perbaikan: debounce -- pintasan yang SAMA PERSIS (kombinasi
      // Alt + huruf/angka yang sama) diabaikan kalau baru saja diproses
      // < 350ms lalu, SIAPA PUN/APA PUN sumber keydown-nya (keyboard
      // fisik, stylus, atau event apa pun) -- 350ms jauh lebih lama
      // dari jeda antar-event dobel stylus (biasanya < 50ms), tapi
      // masih jauh lebih cepat dari kecepatan menekan tombol yang SAMA
      // 2x SENGAJA berturutan oleh operator (jarang perlu secepat itu
      // untuk pintasan yang sama -- P/M/Alt+H, dst).
      const shortcutKey_ = (e.altKey ? "alt+" : "") + e.key.toLowerCase();
      const now_ = Date.now();
      if (shortcutKey_ === lastShortcutKey_ && now_ - lastShortcutAt_ < 350) return;
      lastShortcutKey_ = shortcutKey_;
      lastShortcutAt_ = now_;
      // BARU (10 Sep 2026, sesi ke-10, permintaan operator "defaultnya
      // show, dan misalnya ditekan Alt+H maka hide semua ... vertikal
      // scroll atau horizontal scroll") -- Alt+H sengaja dipakai (bukan
      // "H" polos) supaya tidak bentrok kalau nanti operator benar-benar
      // memakai huruf "H" polos utk Menu Cepat q-w-e-r-t-y-u-i-o-p (lihat
      // rencana sebelumnya). Lihat toggleScrollbarVisibility_() &
      // body.ps-scrollbars-hidden (css/style.css).
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "h" || e.key === "H")) {
        e.preventDefault();
        toggleScrollbarVisibility_();
        return;
      }
      // BARU (9 Sep 2026, sesi ke-9, permintaan operator "tombol M utk
      // mute/unmute suara YouTube, & mematikan bel yang lagi bunyi
      // sebelum durasinya habis sendiri") -- 1 tombol untuk 2 hal
      // sekaligus, dipicu bareng setiap "M" ditekan:
      //  (1) YouTube: TOGGLE (numpang klik tombol "🔇 Mute"/"🔇 Bersuara"
      //      yang SUDAH ADA -- lihat wireYtControls() di atas -- supaya
      //      SEMUA logikanya (urutan mute->play->unmute utk video yang
      //      sempat butuh "dibangunkan" dulu, sinkron pratinjau Studio,
      //      dst) tetap terpakai APA ADANYA, tidak ada logika baru yang
      //      bisa beda/kurang lengkap). Kalau memang tidak ada video
      //      yang sedang tayang, tombol ini sudah otomatis tidak
      //      melakukan apa-apa (dijaga di wireYtControls()/present.html
      //      sendiri) -- aman ditekan kapan saja.
      //  (2) Bel Cepat: SELALU kirim "stop" (bukan toggle -- bel itu
      //      1x bunyi lalu habis sendiri, tidak ada "bunyi lagi" yang
      //      masuk akal buat ditoggle balik) -- kalau tidak ada bel
      //      yang lagi bunyi, present.html sendiri yang mengabaikan
      //      (aman, tidak menimbulkan efek apa pun).
      // Ini SENGAJA dipisah dari blok angka 1-9 di bawah (bukan angka,
      // tidak perlu Number.isInteger dst).
      if (!e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "m" || e.key === "M")) {
        e.preventDefault();
        const muteBtn = el("psYtMuteBtn");
        if (muteBtn) muteBtn.click();
        rawPost({ type: "bell", action: "stop" });
        return;
      }
      // BARU (10 Sep 2026, sesi ke-11, permintaan operator "keyword P
      // untuk toggle play/pause YouTube, biar cepat") -- "P" polos
      // (bukan Alt+P) numpang tombol ▶️ Play/⏸️ Pause yang SUDAH ADA
      // lewat window.toggleYtPlayPause_() (lihat wireYtControls() di
      // atas) supaya semua logikanya (unlock suara, baca kolom waktu
      // LIVE, dst) tetap terpakai apa adanya -- SAMA seperti pola "M"
      // di atas untuk Mute. Kalau belum ada video yang tayang, klik
      // tombol yang bersangkutan tidak melakukan apa-apa (sudah dijaga
      // sendiri oleh sendYtCommand()/present.html) -- aman ditekan
      // kapan saja.
      if (!e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        if (typeof window.toggleYtPlayPause_ === "function") window.toggleYtPlayPause_();
        return;
      }
      // BARU (10 Sep 2026, sesi ke-11, permintaan operator "cara enable/
      // disable tulisan (CC) YouTube") -- Alt+C men-toggle Closed
      // Caption bawaan YouTube, numpang logika toggleYtCaptions_()
      // (lihat dekat buildYoutubeEmbedUrl() di atas) -- 1 fungsi yang
      // sama dipakai baik oleh tombol "📝 Teks" maupun pintasan ini.
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        toggleYtCaptions_();
        return;
      }
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > 9) return;
      if (e.altKey) {
        // Alt+1..Alt+9 -> Bel Cepat ke-N
        const bells = getBellChoices_();
        const bell = bells[n - 1];
        if (bell) { e.preventDefault(); rawPost({ type: "bell", action: "ring", key: bell.key }); }
      } else {
        // 1..9 polos -> Mode Cepat ke-N
        const preset = loadModePresets_()[n - 1];
        if (preset) {
          e.preventDefault();
          applyModePreset_(preset);
          // BARU (10 Sep 2026, sesi ke-12, permintaan operator "kok
          // ditekan 1-9 sepertinya tidak terjadi apa-apa") -- preset
          // SENGAJA cuma mengubah GAYA tampilan (lihat catatan panjang
          // "PENTING" dekat DEFAULT_MODE_PRESETS di atas), TIDAK ikut
          // menyalakan Kamera/Video -- kalau belum ada sumber (Kamera/
          // Video/File) yang aktif di Layar 2, memang TIDAK ADA apa pun
          // yang kelihatan berubah walau pintasannya sudah bekerja
          // dengan benar di baliknya. Toast kecil ini SEKADAR bukti
          // visual instan di Studio (bukan di Layar 2) supaya operator
          // yakin tombolnya "kena" -- tidak mengubah logika apa pun
          // selain menampilkan label preset yang baru diterapkan.
          showPsToast_(`⚡ Mode Cepat ${n}: ${preset.label}`);
        } else {
          // Preset ke-N belum ada (mis. operator sudah menghapusnya lewat
          // "➕ Tambah Mode Sendiri" sehingga daftarnya kurang dari 9) --
          // beri tahu juga supaya tidak terlihat seperti tombolnya mati.
          showPsToast_(`⚡ Mode Cepat ${n} belum diatur (lihat tab Mode Cepat).`);
        }
      }
    });
  }

  // BARU (10 Sep 2026, sesi ke-12) -- toast kecil generik di pojok
  // Studio, dipakai memberi konfirmasi VISUAL instan untuk pintasan
  // keyboard yang efeknya tidak selalu langsung kelihatan di panel
  // (mis. Mode Cepat 1-9 di atas, yang cuma mengganti GAYA -- kalau
  // belum ada Kamera/Video aktif, tidak ada apa pun yang berubah di
  // pratinjau). Elemen dibuat SEKALI (dipakai ulang tiap panggilan),
  // dibersihkan otomatis lewat setTimeout -- aman dipanggil berkali-
  // kali beruntun (tiap panggilan baru menimpa teks & mengulang timer
  // sembunyinya, tidak menumpuk elemen baru).
  let psToastEl_ = null;
  let psToastTimer_ = null;
  function showPsToast_(text) {
    if (!psToastEl_) {
      psToastEl_ = document.createElement("div");
      psToastEl_.id = "psKeyboardToast";
      psToastEl_.style.cssText = "position:fixed; left:50%; bottom:24px; transform:translateX(-50%); background:rgba(20,16,11,0.92); color:#f5f2e8; padding:9px 16px; border-radius:999px; font-size:13px; font-weight:600; z-index:99999; box-shadow:0 4px 16px rgba(0,0,0,.35); pointer-events:none; opacity:0; transition:opacity .15s ease;";
      document.body.appendChild(psToastEl_);
    }
    psToastEl_.textContent = text;
    psToastEl_.style.opacity = "1";
    clearTimeout(psToastTimer_);
    psToastTimer_ = setTimeout(() => { if (psToastEl_) psToastEl_.style.opacity = "0"; }, 1600);
  }

  // ------------------------------------------------------------
  // BARU (9 Sep 2026, permintaan operator) -- 🖥️ Mode Layar umum:
  // Welcome (sebelum acara mulai) & Next Up ("SELANJUTNYA" di antara
  // sesi). Kirim { type:"modescreen", kind, eyebrow, title, subtitle,
  // bullets, endAt } ke Layar 2 -- lihat showModeScreen() di
  // present.html. TIDAK menyentuh Kumpulan Ayat sama sekali -- tombol
  // cepat ini berdiri sendiri, terpisah dari Collections (walau bisa
  // JUGA diselipkan ke Kumpulan Ayat lewat item type "modescreen",
  // lihat js/collections.js).
  // ------------------------------------------------------------
  // BARU (9 Sep 2026, permintaan operator) -- bawaan per "Jenis Layar"
  // (dipakai wireModeScreenTab() di bawah, DAN dijadikan acuan label
  // ikon di collectionItemRef()/js/app.js & exportCollectionAsText()/
  // js/collections.js supaya 1 daftar ini SATU-SATUNYA sumber kebenaran
  // -- kalau nanti mau nambah jenis lagi, cukup tambah di sini +
  // MODE_SCREEN_KIND_META di present.html (untuk warna Layar 2), tidak
  // perlu ubah banyak tempat lain).
  // allowCountdown = jenis yang wajar punya "durasi" (Welcome menunggu
  // jam mulai, Istirahat & Olahraga menunggu jam selesai) -- Next Up/Ice
  // Breaker/Renungan Malam sengaja TIDAK ditawari supaya form tidak
  // membingungkan untuk kasus yang durasinya biasanya cair.
  const MODE_SCREEN_KIND_META = {
    welcome: { icon: "👋", label: "Welcome", allowCountdown: true, defaultTitle: "SELAMAT DATANG", defaultSubtitlePh: "mis. Retret Pemuda 2026" },
    nextup: { icon: "➡️", label: "Next Up", allowCountdown: false, defaultTitle: "", defaultSubtitlePh: "mis. Retret Pemuda 2026" },
    istirahat: { icon: "☕", label: "Istirahat", allowCountdown: true, defaultTitle: "JAM ISTIRAHAT", defaultSubtitlePh: "mis. Kembali jam 10:30" },
    icebreaker: { icon: "🎉", label: "Ice Breaker", allowCountdown: false, defaultTitle: "ICE BREAKER", defaultSubtitlePh: "mis. Games seru sebelum lanjut" },
    olahraga: { icon: "🏃", label: "Olahraga", allowCountdown: true, defaultTitle: "WAKTUNYA GERAK", defaultSubtitlePh: "mis. Senam pagi bersama" },
    renungan: { icon: "🙏", label: "Renungan Malam", allowCountdown: false, defaultTitle: "RENUNGAN MALAM", defaultSubtitlePh: "mis. Mari hening sejenak" },
    // BARU (9 Sep 2026, sesi ke-9, permintaan operator "info waktunya
    // foto bersama") -- allowCountdown:true karena biasanya ada jeda
    // singkat sebelum semua orang siap posisi/berkumpul untuk foto.
    foto: { icon: "📸", label: "Foto Bersama", allowCountdown: true, defaultTitle: "WAKTUNYA FOTO BERSAMA!", defaultSubtitlePh: "mis. Kumpul di depan panggung" },
  };
  window.MODE_SCREEN_KIND_META = MODE_SCREEN_KIND_META; // dibaca app.js/collections.js untuk label ikon

  function wireModeScreenTab() {
    let msKind = "welcome";
    // BARU (9 Sep 2026) -- dipakai untuk tahu apakah isi kolom Judul
    // SAAT INI adalah bawaan otomatis (belum diedit operator) atau
    // sudah diketik manual -- kalau masih bawaan, boleh ditimpa dengan
    // bawaan jenis baru saat operator ganti tombol; kalau sudah diketik
    // manual, JANGAN ditimpa (operator tidak mau tulisannya hilang).
    let lastAutoTitle = "";
    if (el("psModeScreenKindRow")) {
      el("psModeScreenKindRow").querySelectorAll("[data-ms-kind]").forEach((btn) => {
        btn.addEventListener("click", () => {
          msKind = btn.dataset.msKind;
          el("psModeScreenKindRow").querySelectorAll("[data-ms-kind]").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          const meta = MODE_SCREEN_KIND_META[msKind] || MODE_SCREEN_KIND_META.welcome;
          // Hitung mundur cuma ditawarkan untuk jenis yang punya "durasi"
          // wajar (lihat allowCountdown di MODE_SCREEN_KIND_META di atas).
          const cdRow = el("psModeScreenCountdownOn");
          const cdWrap = cdRow ? cdRow.closest("label") : null;
          if (cdWrap) cdWrap.style.display = meta.allowCountdown ? "flex" : "none";
          if (el("psModeScreenCountdownTime")) el("psModeScreenCountdownTime").style.display = (meta.allowCountdown && cdRow && cdRow.checked) ? "block" : "none";
          // Isi Judul otomatis (kalau belum diedit manual) + placeholder
          // Subjudul contoh, supaya operator bisa langsung pencet
          // "▶️ Tampilkan" tanpa mengetik apa-apa untuk preset ini.
          const titleInput = el("psModeScreenTitle");
          if (titleInput && meta.defaultTitle && (titleInput.value.trim() === "" || titleInput.value === lastAutoTitle)) {
            titleInput.value = meta.defaultTitle;
            lastAutoTitle = meta.defaultTitle;
          }
          const subtitleInput = el("psModeScreenSubtitle");
          if (subtitleInput && meta.defaultSubtitlePh) subtitleInput.placeholder = meta.defaultSubtitlePh;
        });
      });
    }
    if (el("psModeScreenCountdownOn")) {
      el("psModeScreenCountdownOn").addEventListener("change", () => {
        if (el("psModeScreenCountdownTime")) el("psModeScreenCountdownTime").style.display = el("psModeScreenCountdownOn").checked ? "block" : "none";
      });
    }
    function buildModeScreenPayload() {
      const title = (el("psModeScreenTitle") && el("psModeScreenTitle").value.trim()) || "";
      const subtitle = (el("psModeScreenSubtitle") && el("psModeScreenSubtitle").value.trim()) || "";
      const bulletsRaw = (el("psModeScreenBullets") && el("psModeScreenBullets").value) || "";
      const bullets = bulletsRaw.split("\n").map((s) => s.trim()).filter(Boolean);
      // BARU (9 Sep 2026, permintaan operator) -- "Layar Istirahat
      // Lengkap": baris "➡️ Selanjutnya: ..." digabung dalam layar yang
      // SAMA (lihat #msNextLabel di present.html), bukan layar Next Up
      // terpisah -- supaya operator tidak perlu bolak-balik 2 layar
      // (jam mundur istirahat, lalu ganti manual ke Next Up) untuk 1
      // maksud yang sama.
      const nextLabel = (el("psModeScreenNextLabel") && el("psModeScreenNextLabel").value.trim()) || "";
      let endAt = null;
      const kindMeta = MODE_SCREEN_KIND_META[msKind] || MODE_SCREEN_KIND_META.welcome;
      if (kindMeta.allowCountdown && el("psModeScreenCountdownOn") && el("psModeScreenCountdownOn").checked) {
        const timeVal = el("psModeScreenCountdownTime") && el("psModeScreenCountdownTime").value; // "HH:MM"
        if (timeVal) {
          const [hh, mm] = timeVal.split(":").map(Number);
          const target = new Date();
          target.setHours(hh, mm, 0, 0);
          if (target.getTime() < Date.now()) target.setDate(target.getDate() + 1); // sudah lewat hari ini -> anggap besok
          endAt = target.getTime();
        }
      }
      return { type: "modescreen", kind: msKind, title, subtitle, bullets, nextLabel, endAt };
    }
    if (el("psModeScreenShowBtn")) {
      el("psModeScreenShowBtn").addEventListener("click", () => {
        const payload = buildModeScreenPayload();
        if (!payload.title) { alert("Isi judul dulu (mis. \"SELAMAT DATANG\" atau nama sesi berikutnya)."); return; }
        rawPost(payload);
      });
    }
    if (el("psModeScreenStopBtn")) {
      el("psModeScreenStopBtn").addEventListener("click", () => rawPost({ type: "modescreen", action: "stop" }));
    }
    // BARU (9 Sep 2026) -- selipkan Welcome/Next Up ke Kumpulan Ayat
    // (tanpa hitung mundur, lihat catatan addModeScreenToCollection()).
    if (el("psModeScreenSaveBtn")) {
      el("psModeScreenSaveBtn").addEventListener("click", async () => {
        const payload = buildModeScreenPayload();
        if (!payload.title) { alert("Isi judul dulu sebelum menyimpan."); return; }
        if (typeof promptCollectionName !== "function" || typeof addModeScreenToCollection !== "function") return;
        const name = await promptCollectionName();
        if (!name) return;
        const username = typeof currentUser !== "undefined" ? currentUser : null;
        addModeScreenToCollection(username, name, payload);
        if (typeof renderCollectionSelect === "function") renderCollectionSelect();
        if (el("psModeScreenSaveStatus")) {
          el("psModeScreenSaveStatus").textContent = `✅ Tersimpan ke kumpulan "${name}".`;
          setTimeout(() => { if (el("psModeScreenSaveStatus")) el("psModeScreenSaveStatus").textContent = ""; }, 4000);
        }
      });
    }
  }

  // ------------------------------------------------------------
  // BARU (9 Sep 2026, permintaan operator) -- 🎉 Efek Panggung: reaksi
  // visual (confetti/emoji terbang) & efek suara 1-tombol. SENGAJA
  // dibuat "tembak dan lupa" (fire-and-forget, tidak ada tombol
  // "Hentikan" terpisah seperti Timer/Mode Layar) -- Layar 2 sendiri
  // yang membersihkan animasinya setelah beberapa detik (lihat
  // playEffectVisual_()/playEffectSound_() di present.html), supaya
  // operator bisa pencet berkali-kali beruntun tanpa mikir status
  // hidup/mati. Payload: { type:"effect", effect:"confetti" } atau
  // { type:"effect", effect:"emoji", emoji:"👏" } untuk reaksi visual,
  // dan { type:"sound", sound:"drumroll" } dst untuk efek suara --
  // dipisah type-nya (bukan disatukan ke "effect") supaya nanti kalau
  // mau efek suara TANPA visual atau sebaliknya tetap gampang.
  // BARU (11 Sep 2026, langkah 4 STATUS-PUSTAKA-MEDIA.md, bagian 13b
  // RENCANA-PUSTAKA-MEDIA-FAVORIT.md) -- grid tombol "🔊 Efek Suara"
  // sekarang gabungan SoundFX.LIST (bawaan, selalu ada) + hasil
  // `media_list?jenis=sound` (kontribusi gembala+ lewat Pustaka Media,
  // js/media-library.js), DIRENDER PAKAI FUNGSI/GAYA TOMBOL YANG SAMA
  // (SoundFX.renderButtons()-style: class "chip-btn small", teks
  // "emoji label") supaya TIDAK ADA beda visual antara efek bawaan &
  // kontribusi kecuali sumber datanya -- TIDAK mendesain ulang tab ini
  // sama sekali, cuma menambah isi ke grid tombol yang SUDAH ADA
  // (#psSoundEffectsGrid) + 1 tombol "➕ Tambah" di ujungnya.
  //
  // Tombol efek KONTRIBUSI (bukan bawaan) dibedakan lewat data-sound
  // berformat "ml:<id>" (supaya tidak pernah tabrakan dengan key bawaan
  // di SOUND_FX_LIST) + data-sound-src berisi link-nya -- listener klik
  // di bawah (wireEffectsTab(), lewat delegasi 1 listener di level grid
  // supaya otomatis "kepasang" ke tombol yang dibangun ulang tiap
  // renderSoundEffectsGrid_() dipanggil, tanpa perlu re-bind manual)
  // mengirim payload TAMBAHAN `src` kalau ada -- present.html (listener
  // "message") memutar lewat SoundFX.playUrl(src) kalau `src` terisi,
  // atau SoundFX.play(sound) seperti biasa kalau tidak (lihat
  // SoundFX.playUrl(), js/soundfx.js).
  //
  // Dipanggil ULANG (bukan cuma sekali di wireEffectsTab()) tiap kali
  // "➕ Tambah" berhasil menyimpan efek baru (lewat onSaved), supaya
  // efek yang baru ditambah LANGSUNG muncul tanpa perlu tutup-buka tab.
  async function renderSoundEffectsGrid_() {
    const grid = el("psSoundEffectsGrid");
    if (!grid) return;
    grid.innerHTML = "";
    if (typeof SoundFX !== "undefined") {
      SoundFX.renderButtons(grid, { className: "chip-btn small", dataAttr: "sound" });
    }
    // Efek suara KONTRIBUSI dari Pustaka Media -- hanya dimuat kalau
    // backend sudah disetel (CONFIG.MEDIA_LIBRARY_APPS_SCRIPT_URL) &
    // operator ini memang boleh melihat tab "🔊 Efek Suara" di Pustaka
    // Media (level sama, MediaLibrary.canSeeSound()) -- kalau tidak,
    // grid tetap tampil APA ADANYA (cuma efek bawaan) seperti sebelum
    // langkah ini dikerjakan, tidak rusak/kosong.
    if (typeof MediaLibrary !== "undefined" && MediaLibrary.Sync && MediaLibrary.Sync.enabled() && MediaLibrary.canSeeSound()) {
      try {
        const items = await MediaLibrary.Sync.list({ jenis: "sound" });
        items.forEach((item) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "chip-btn small";
          btn.textContent = "🔊 " + (item.nama || "Efek");
          btn.title = "Efek suara kontribusi (Pustaka Media)" + (item.diuploadOleh ? " -- diunggah " + item.diuploadOleh : "");
          btn.dataset.sound = "ml:" + item.id;
          // PERBAIKAN (12 Sep 2026) -- item.link ditebak/diubah dulu
          // lewat MediaLibrary.resolvePlayableUrl() (link Drive "share"
          // biasa -> bentuk unduhan langsung) SEBELUM dikirim ke Layar 2,
          // supaya efek suara kontribusi dari Google Drive benar-benar
          // BERSUARA di sana, bukan cuma diam (lihat komentar lengkap di
          // js/media-library.js, playItem_() & resolvePlayableUrl_()).
          btn.dataset.soundSrc = (typeof MediaLibrary !== "undefined" && MediaLibrary.resolvePlayableUrl) ? MediaLibrary.resolvePlayableUrl(item.link) : item.link;
          grid.appendChild(btn);
        });
      } catch (err) {
        // Gagal ambil kontribusi (mis. offline) -- diamkan, efek bawaan
        // di atas TETAP tampil & tetap bisa dipakai seperti biasa.
      }
    }
    // "➕ Tambah" -- HANYA gembala+ (MediaLibrary.canAddMedia(), level
    // SAMA dengan tombol "➕ Tambah" di tab "🔊 Efek Suara" Pustaka
    // Media) -- membuka form Pustaka Media APA ADANYA (openAddForm_,
    // dipakai ulang, TIDAK ADA form/kode duplikat), jenis dikunci
    // "sound" (tab tempat tombol ini ditekan, sesuai bagian 14.3
    // RENCANA-...md), bawaan visibility "Hanya saya" (bagian 12.2).
    if (typeof MediaLibrary !== "undefined" && MediaLibrary.Sync && MediaLibrary.Sync.enabled() && MediaLibrary.canAddMedia && MediaLibrary.canAddMedia()) {
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "chip-btn small";
      addBtn.id = "psSoundEffectsAddBtn";
      addBtn.textContent = "➕ Tambah";
      addBtn.addEventListener("click", () => {
        MediaLibrary.openAddForm({ jenis: "sound", defaultVisibility: "me", onSaved: () => renderSoundEffectsGrid_() });
      });
      grid.appendChild(addBtn);
    }
  }

  function wireEffectsTab() {
    // Delegasi 1 listener di level grid (bukan per-tombol lewat
    // querySelectorAll seperti sebelumnya) -- supaya tombol efek
    // KONTRIBUSI yang baru ditambahkan (renderSoundEffectsGrid_()
    // dipanggil ulang lewat onSaved di atas, membangun ulang ISI grid)
    // tetap otomatis "kepasang" tanpa perlu re-bind manual tiap render
    // ulang. `dataset.wired` mencegah listener dobel kalau wireEffectsTab()
    // sampai terpanggil lebih dari 1x (seharusnya cuma 1x dari init(),
    // tapi aman dijaga).
    const soundGrid = el("psSoundEffectsGrid");
    if (soundGrid && !soundGrid.dataset.wired) {
      soundGrid.dataset.wired = "1";
      soundGrid.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-sound]");
        if (!btn) return;
        rawPost({ type: "sound", sound: btn.dataset.sound, src: btn.dataset.soundSrc || undefined });
      });
    }
    renderSoundEffectsGrid_();
    document.querySelectorAll("[data-effect]").forEach((btn) => {
      btn.addEventListener("click", () => rawPost({ type: "effect", effect: btn.dataset.effect }));
    });
    document.querySelectorAll("[data-effect-emoji]").forEach((btn) => {
      btn.addEventListener("click", () => rawPost({ type: "effect", effect: "emoji", emoji: btn.dataset.effectEmoji }));
    });
    // BARU (9 Sep 2026, sesi ke-9, permintaan operator "seru nama Tuhan") --
    // teks BESAR berkilau di tengah layar, "tembak dan lupa" sama seperti
    // efek lain di atas -- payload TERPISAH ("shout", bukan "effect")
    // supaya tidak tercampur alur emoji/confetti yang generiknya beda
    // (lihat playShout_() di present.html).
    document.querySelectorAll("[data-shout]").forEach((btn) => {
      btn.addEventListener("click", () => rawPost({ type: "shout", text: btn.dataset.shout }));
    });
    // BARU (9 Sep 2026, sesi ke-9, permintaan operator "break time,
    // lonceng, sebagai pintasan cepat offline") -- 2 tombol yang TIDAK
    // menyimpan state baru, cuma memicu ULANG alur yang sudah ada:
    // "☕ Break Time" mengirim payload "modescreen" langsung dengan judul
    // bawaan MODE_SCREEN_KIND_META.istirahat (TIDAK menyentuh/membaca isi
    // form di tab "🖥️ Mode & Peta" -- kalau operator sudah mengetik judul/
    // poin sendiri di sana, itu TIDAK ikut terpakai/tertimpa di sini,
    // sengaja dibuat berdiri sendiri supaya aman dipencet kapan saja
    // tanpa efek samping ke tab lain). "🔔 Bel Cepat" membunyikan bel
    // PERTAMA di CONFIG.BELL_SOUNDS (sama seperti Alt+1 di Bel Cepat).
    if (el("psQuickBreakBtn")) {
      el("psQuickBreakBtn").addEventListener("click", () => {
        const meta = (typeof MODE_SCREEN_KIND_META !== "undefined" && MODE_SCREEN_KIND_META.istirahat) || { defaultTitle: "JAM ISTIRAHAT" };
        rawPost({ type: "modescreen", kind: "istirahat", title: meta.defaultTitle, subtitle: "", bullets: [], nextLabel: "", endAt: null });
        renderStudioPreview({ type: "modescreen", kind: "istirahat", title: meta.defaultTitle });
      });
    }
    if (el("psQuickBellBtn")) {
      el("psQuickBellBtn").addEventListener("click", () => {
        const bells = getBellChoices_();
        rawPost({ type: "bell", action: "ring", key: bells[0].key });
      });
    }
  }

  // ------------------------------------------------------------
  // BARU (9 Sep 2026, permintaan operator) -- 🎡 Roda Undian (versi
  // TEKS SAJA -- versi "1 lingkaran = 1 foto orang" direncanakan tahap
  // berikutnya, lihat jawaban chat). 100% OFFLINE: daftar nama diketik
  // langsung di sini, pemenang diacak dengan Math.random() DI SISI INI
  // (bukan di Layar 2) supaya Studio langsung tahu siapa pemenangnya
  // untuk mode "buang pemenang" tanpa perlu menunggu animasi 4 detik
  // selesai dulu. Layar 2 (present.html, lihat showWheel()/spinWheel())
  // hanya menerima INDEKS pemenang & menganimasikan visual+suara ke
  // sana, lalu mengonfirmasi balik lewat postMessage
  // "present_wheel_result" (ditangani listener "message" di init(), di
  // bawah file ini) -- dipakai untuk menyalakan lagi tombol "🎲 Putar!"
  // & (kalau mode "buang pemenang" aktif) menghapus nama itu dari
  // daftar supaya tidak menang 2x di sesi undian yang sama.
  //
  // Payload ke Layar 2: { type:"wheel", action:"show", entries } saat
  // "🎡 Tampilkan Roda" ditekan, { type:"wheel", action:"spin",
  // winnerIndex, spinId } saat "🎲 Putar!" ditekan.
  // ------------------------------------------------------------
  let wheelCurrentEntries_ = []; // daftar nama yang SEDANG ditampilkan di roda (setelah "Tampilkan Roda" ditekan) -- dipakai untuk tahu indeks pemenang & untuk mode "buang pemenang"
  let wheelSpinning_ = false; // true di antara tombol "Putar!" ditekan sampai present_wheel_result balik -- mencegah operator memicu 2 putaran sekaligus (bisa membuat animasi Layar 2 saling tabrak)
  function wireWheelTab() {
    const entriesTa = el("psWheelEntries");
    const applyBtn = el("psWheelApplyBtn");
    const spinBtn = el("psWheelSpinBtn");
    const resetBtn = el("psWheelResetBtn");
    const removeWinnerChk = el("psWheelRemoveWinnerChk");
    const winnerBox = el("psWheelWinnerBox");
    if (!entriesTa || !applyBtn || !spinBtn) return; // panel belum ada di HTML (mis. versi lama index.html) -- diamkan

    function parseEntries_() {
      return String(entriesTa.value || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    applyBtn.addEventListener("click", () => {
      const entries = parseEntries_();
      if (entries.length < 2) { alert("Isi minimal 2 nama (1 nama per baris) dulu."); return; }
      wheelCurrentEntries_ = entries;
      if (winnerBox) { winnerBox.hidden = true; winnerBox.textContent = ""; }
      spinBtn.disabled = false;
      rawPost({ type: "wheel", action: "show", entries: wheelCurrentEntries_ });
      renderStudioPreview({ type: "wheel" });
    });

    spinBtn.addEventListener("click", () => {
      if (wheelSpinning_) return; // sedang berputar -- abaikan klik dobel supaya tidak memicu 2 animasi sekaligus di Layar 2
      if (!wheelCurrentEntries_.length) { alert("Tekan \"🎡 Tampilkan Roda\" dulu sebelum memutar."); return; }
      const winnerIndex = Math.floor(Math.random() * wheelCurrentEntries_.length);
      const spinId = "wh_" + Date.now();
      wheelSpinning_ = true;
      wheelPendingSpin_ = { spinId, winnerIndex, removeWinner: !!(removeWinnerChk && removeWinnerChk.checked) };
      spinBtn.disabled = true;
      if (winnerBox) { winnerBox.hidden = true; winnerBox.textContent = ""; }
      rawPost({ type: "wheel", action: "spin", winnerIndex, spinId });
    });

    resetBtn.addEventListener("click", () => {
      wheelCurrentEntries_ = [];
      wheelSpinning_ = false;
      wheelPendingSpin_ = null;
      spinBtn.disabled = true;
      if (winnerBox) { winnerBox.hidden = true; winnerBox.textContent = ""; }
      rawPost({ type: "wheel", action: "stop" });
    });
  }

  // Diisi wireWheelTab() (di atas) tiap kali "🎲 Putar!" ditekan, dibaca
  // & dikosongkan lagi oleh listener "message" (window.addEventListener
  // di init(), lihat "present_wheel_result") begitu Layar 2 selesai
  // menganimasikan & mengonfirmasi balik pemenangnya -- lihat catatan
  // panjang di wireWheelTab() di atas untuk alasan pola ini (Studio
  // yang menentukan pemenang lebih dulu, Layar 2 cuma menganimasikannya).
  let wheelPendingSpin_ = null;
  function handleWheelResult_(data) {
    if (!wheelPendingSpin_ || wheelPendingSpin_.spinId !== data.spinId) return; // hasil dari putaran LAMA (mis. Reset ditekan di tengah animasi) -- abaikan
    const { winnerIndex, removeWinner } = wheelPendingSpin_;
    const winnerName = wheelCurrentEntries_[winnerIndex] || "?";
    wheelSpinning_ = false;
    wheelPendingSpin_ = null;
    const spinBtn = el("psWheelSpinBtn");
    const winnerBox = el("psWheelWinnerBox");
    const entriesTa = el("psWheelEntries");
    if (winnerBox) { winnerBox.hidden = false; winnerBox.textContent = "🏆 Pemenang: " + winnerName; }
    if (removeWinner) {
      // Buang nama pemenang dari daftar (mode gugur) -- textarea &
      // roda yang tampil di Layar 2 ikut disegarkan TANPA memutar ulang,
      // supaya siap untuk "Putar!" berikutnya tanpa nama yang sudah
      // menang muncul lagi.
      wheelCurrentEntries_ = wheelCurrentEntries_.filter((_, i) => i !== winnerIndex);
      if (entriesTa) entriesTa.value = wheelCurrentEntries_.join("\n");
      if (wheelCurrentEntries_.length >= 2) {
        rawPost({ type: "wheel", action: "show", entries: wheelCurrentEntries_ });
      }
    }
    if (spinBtn) spinBtn.disabled = wheelCurrentEntries_.length < 2;
  }

  // ------------------------------------------------------------
  // BARU (9 Sep 2026, permintaan operator) -- 🗺️ Peta Interaktif,
  // dibuat REUSABLE lintas acara (bukan cuma 1 lokasi): operator
  // mengunggah gambar peta APA SAJA (venue, kota, negara), lalu
  // menaruh pin dengan KLIK LANGSUNG di atas gambar pratinjau (bukan
  // saya tebak koordinat dari file) -- tiap pin cuma butuh label
  // singkat. Kumpulan peta (tiap peta = { id, name, imageDataUrl,
  // pins:[{id,label,xPct,yPct}] }) disimpan di localStorage perangkat
  // ini (MAPS_KEY di bawah) supaya siap dipakai lagi acara berikutnya
  // tanpa mengunggah ulang -- lihat ROADMAP-drive-sync.md untuk
  // rencana lanjut memindahkannya ke Google Sheet/Drive (sinkron
  // lintas perangkat) seperti sync.js, BELUM dikerjakan di versi ini.
  //
  // Dikirim ke Layar 2 sebagai { type:"map", action:"show", imageUrl,
  // pins } (tampilkan peta) lalu { type:"map", action:"focus", pin }
  // per klik pin di daftar (Layar 2 melakukan animasi zoom/pan ke
  // titik itu) -- lihat showMap()/focusMapPin() di present.html.
  // ------------------------------------------------------------
  // BARU (9 Sep 2026, permintaan operator) -- 🌐 Ambil Peta Dasar dari
  // Online: cari & unduh gambar peta Indonesia POLOS dari Wikimedia
  // Commons (API publik, CORS terbuka, tanpa API key -- sumbernya
  // bebas lisensi/domain publik, BUKAN hasil AI menggambar ulang).
  // Hasilnya disimpan sebagai map.imageDataUrl PERSIS seperti hasil
  // unggah manual -- jadi cuma butuh internet SEKALI saat menekan
  // tombol ini; setelah itu tersimpan di localStorage & bisa dipakai
  // offline terus seperti gambar peta lainnya (kalibrasi, pin, dst
  // semuanya tetap jalan tanpa perubahan). Fungsi murni (module-level,
  // bukan dalam closure wireMapTab()) supaya gampang dites/dipakai ulang.
  // DIPERBAIKI (10 Sep 2026, permintaan operator "cari tidak bisa harus
  // upload") -- sebelumnya HANYA mengandalkan 1 pencarian teks bebas
  // ("Indonesia blank location map") dan langsung pakai hasil PERTAMA
  // apa adanya -- kalau hasil pertama itu bukan gambar peta polos yang
  // valid (mis. berkas SVG rusak/redirect/terlalu besar), operator
  // terjebak "gagal" tanpa tahu ada pilihan lain, jadi harus unggah
  // manual. Sekarang dicoba BERURUTAN: (1) daftar judul berkas Wikimedia
  // Commons yang SUDAH DIKETAHUI berupa peta lokasi Indonesia polos
  // (diverifikasi memang ada & dipakai luas di Commons/Wikipedia), diambil
  // LANGSUNG lewat imageinfo (tanpa pencarian teks -- lebih pasti kena),
  // lalu (2) kalau SEMUA itu gagal (mis. berkas dipindah/dihapus), baru
  // jatuh ke pencarian teks bebas seperti sebelumnya sebagai cadangan
  // terakhir. Tiap kegagalan (HTTP error, berkas kosong, dst) TIDAK
  // menghentikan proses -- lanjut coba kandidat berikutnya, baru lempar
  // error kalau semua kandidat + pencarian cadangan gagal.
  const ONLINE_BASE_MAP_CANDIDATES_ = [
    "File:Indonesia location map.svg",
    "File:Indonesia_location_map_%28more_islands%29.svg",
    "File:Blank map of Indonesia.svg",
    "File:Indonesia (plain).svg",
  ];
  // BARU (10 Sep 2026, permintaan operator) -- pilihan KE-2: peta yang
  // SUDAH ada nama pulaunya (bukan peta polos), cocok kalau mau langsung
  // ditayangkan apa adanya tanpa perlu ditempeli pin/label sendiri.
  // Diambil dari Wikimedia Commons juga (sumber terbuka, sama seperti
  // kandidat "blank" di atas) -- BUKAN dari Pinterest: 2 link Pinterest
  // yang sebelumnya dicek operator TIDAK BISA dipakai di sini karena (1)
  // Pinterest memblokir pengambilan otomatis dari luar situsnya, dan (2)
  // gambarnya adalah stock illustration/poster berbayar, bukan sumber
  // bebas lisensi seperti Wikimedia -- jadi berisiko hak cipta kalau
  // ditempel permanen ke aplikasi. Kalau operator tetap mau tampilan
  // ala Pinterest itu, unduh manual gambarnya sendiri lalu pakai tombol
  // "Unggah Peta" (drag & drop) di atas -- itu menerima gambar apa saja
  // dari perangkat, tidak lewat jalur online ini.
  const ONLINE_BASE_MAP_CANDIDATES_NAMED_ = [
    "File:Indonesia map with name of islands.png",
  ];
  // BARU (10 Sep 2026, permintaan operator) -- pilihan KE-3: peta gaya
  // "relief" (kontur gunung/warna ketinggian, MIRIP tampilan yang
  // operator suka dari referensi Pinterest/Dreamstime), TAPI diambil
  // dari Wikimedia Commons yang berlisensi bebas (CC BY-SA 3.0) --
  // BUKAN dari Dreamstime/Pinterest: gambar yang operator kirim sendiri
  // (lihat obrolan) punya watermark "dreamstime" tercetak di gambarnya
  // sendiri -- itu foto stok berbayar, TIDAK bisa dijadikan aset tetap
  // aplikasi (selain soal hak cipta, watermark-nya akan ikut tampil ke
  // jemaat di layar). File Wikimedia ini kualitas/gayanya setara, cuma
  // beda sumber saja, dan aman dipakai berulang.
  const ONLINE_BASE_MAP_CANDIDATES_RELIEF_ = [
    "File:Indonesia relief location map.jpg",
  ];
  async function fetchWikimediaFileByTitle_(title) {
    const infoUrl = "https://commons.wikimedia.org/w/api.php?action=query&titles=" +
      encodeURIComponent(title) + "&prop=imageinfo&iiprop=url&iiurlwidth=2000&format=json&origin=*";
    const infoRes = await fetch(infoUrl);
    if (!infoRes.ok) throw new Error("HTTP " + infoRes.status);
    const infoJson = await infoRes.json();
    const pages = (infoJson.query && infoJson.query.pages) || {};
    const page = Object.values(pages)[0];
    if (!page || page.missing !== undefined) throw new Error("berkas tidak ditemukan");
    const info = page.imageinfo && page.imageinfo[0];
    const fileUrl = info && (info.thumburl || info.url);
    if (!fileUrl) throw new Error("URL gambar tidak terbaca");
    const imgRes = await fetch(fileUrl);
    if (!imgRes.ok) throw new Error("gagal unduh gambar (HTTP " + imgRes.status + ")");
    const blob = await imgRes.blob();
    if (!blob || blob.size < 200) throw new Error("gambar yang diunduh kosong/rusak");
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return { dataUrl, title: page.title || title, fileUrl };
  }
  // DIPERBARUI (10 Sep 2026, permintaan operator) -- sekarang menerima
  // `choiceKey` ("blank" | "named_islands") supaya operator bisa MEMILIH
  // LEBIH DULU (lewat dropdown #psMapOnlineChoice di index.html) peta
  // yang mana yang mau diambil, bukan cuma auto-pilih hasil pertama yang
  // kebetulan berhasil dari daftar "blank" seperti sebelumnya. Kosong/
  // tidak dikenal -> tetap default ke "blank" (perilaku lama, aman untuk
  // pemanggilan lama yang belum kirim parameter ini).
  async function fetchOnlineBaseMap_(choiceKey) {
    const candidates = choiceKey === "named_islands"
      ? ONLINE_BASE_MAP_CANDIDATES_NAMED_
      : choiceKey === "relief"
      ? ONLINE_BASE_MAP_CANDIDATES_RELIEF_
      : ONLINE_BASE_MAP_CANDIDATES_;
    const attempts = [];
    for (const title of candidates) {
      try {
        return await fetchWikimediaFileByTitle_(title);
      } catch (e) {
        attempts.push(title + ": " + (e && e.message ? e.message : "gagal"));
      }
    }
    // Cadangan terakhir: pencarian teks bebas, coba SEMUA hasil (bukan
    // cuma yang pertama) sampai ada yang berhasil diunduh utuh. Kata
    // kunci pencarian ikut menyesuaikan pilihan operator.
    try {
      const searchTerm = choiceKey === "named_islands"
        ? "Indonesia map name of islands"
        : choiceKey === "relief"
        ? "Indonesia relief location map"
        : "Indonesia blank location map";
      const searchUrl = "https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=" +
        encodeURIComponent(searchTerm) + "&srnamespace=6&srlimit=5&format=json&origin=*";
      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) throw new Error("pencarian gagal (HTTP " + searchRes.status + ")");
      const searchJson = await searchRes.json();
      const hits = (searchJson.query && searchJson.query.search) || [];
      for (const hit of hits) {
        try {
          return await fetchWikimediaFileByTitle_(hit.title);
        } catch (e) {
          attempts.push(hit.title + ": " + (e && e.message ? e.message : "gagal"));
        }
      }
    } catch (e) {
      attempts.push("pencarian cadangan: " + (e && e.message ? e.message : "gagal"));
    }
    throw new Error("Semua sumber peta online gagal dicoba (" + attempts.length + " percobaan). Cek koneksi internet, atau unggah gambar peta manual di atas.");
  }
  // BARU (9 Sep 2026, permintaan operator) -- 🎨 Gaya Peta Dasar: filter
  // gambar diproses LANGSUNG di perangkat lewat Canvas
  // (CanvasRenderingContext2D.filter + compositing bawaan browser),
  // BUKAN gambar baru bikinan AI -- jadi selalu offline & instan setelah
  // pertama diproses (hasilnya di-cache di map.styleVariants). "comic"
  // meniru garis tinta dengan melapisi versi grayscale-kontras-tinggi-
  // dibalik (mendekati efek edge) di atas versi warna blok pakai blend
  // "multiply"; "artistic"/"territorial" pakai kombinasi filter warna
  // standar (sepia/saturate/contrast/blur) ala lukisan/atlas tua. Ini
  // APROKSIMASI gaya lewat filter gambar, BUKAN filter AI presisi --
  // cukup untuk suasana visual di layar besar, bukan reproduksi seni.
  function generateMapStyleVariant_(baseDataUrl, style) {
    return new Promise((resolve, reject) => {
      if (style === "normal" || !baseDataUrl) { resolve(baseDataUrl); return; }
      const img = new Image();
      img.onerror = () => reject(new Error("Gagal memuat gambar peta untuk diproses."));
      img.onload = () => {
        try {
          const w = img.naturalWidth, h = img.naturalHeight;
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (style === "comic") {
            ctx.filter = "saturate(2.3) contrast(1.4) brightness(1.04)";
            ctx.drawImage(img, 0, 0, w, h);
            ctx.filter = "grayscale(1) contrast(3.2) brightness(0.92) invert(1)";
            ctx.globalCompositeOperation = "multiply";
            ctx.globalAlpha = 0.55;
            ctx.drawImage(img, 0, 0, w, h);
            ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.filter = "none";
          } else if (style === "artistic") {
            ctx.filter = "saturate(1.35) contrast(1.08) brightness(1.03) blur(1.1px) sepia(.08)";
            ctx.drawImage(img, 0, 0, w, h);
            ctx.filter = "none";
          } else if (style === "territorial") {
            ctx.filter = "sepia(.5) contrast(1.15) saturate(1.3) brightness(.97)";
            ctx.drawImage(img, 0, 0, w, h);
            const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .35, w / 2, h / 2, Math.max(w, h) * .7);
            grad.addColorStop(0, "rgba(0,0,0,0)");
            grad.addColorStop(1, "rgba(40,25,10,.35)");
            ctx.filter = "none";
            ctx.globalCompositeOperation = "multiply";
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
            ctx.globalCompositeOperation = "source-over";
          } else {
            ctx.drawImage(img, 0, 0, w, h);
          }
          resolve(canvas.toDataURL("image/jpeg", 0.87));
        } catch (e) { reject(e); }
      };
      img.src = baseDataUrl;
    });
  }
  // BARU (9 Sep 2026) -- dipakai sendGenericItemLive() saat menayangkan
  // item "map" dari Kumpulan Ayat (referensi mapId -> cari gambar+pin
  // aktualnya di Map Library, localStorage perangkat ini). Baca
  // langsung dari localStorage (bukan lewat closure wireMapTab()) supaya
  // tetap dapat data TERBARU walau operator baru saja mengedit peta itu
  // di tab lain sejak halaman dimuat.
  function getStoredMapById(mapId) {
    if (!mapId) return null;
    try {
      const maps = JSON.parse(localStorage.getItem("bible_app_studio_maps_v1") || "[]");
      return (Array.isArray(maps) ? maps : []).find((m) => m.id === mapId) || null;
    } catch (e) { return null; }
  }
  // BARU (9 Sep 2026) -- versi standalone dari visiblePins() (di dalam
  // wireMapTab()) supaya sendGenericItemLive() (Kumpulan Ayat) juga
  // menghormati checklist kategori terakhir yang disimpan di peta itu,
  // BUKAN selalu mengirim semua pin.
  function visibleMapPins_(map) {
    const active = new Set(map.activeCategories || []);
    return (map.pins || []).filter((p) => !p.category || active.has(p.category));
  }
  // BARU (9 Sep 2026, permintaan operator) -- "🎨 Gaya Peta Dasar": kalau
  // operator sedang memilih gaya selain "normal" (Komik/Artistik/
  // Teritorial) DAN variannya sudah pernah dibuat (map.styleVariants,
  // lihat generateMapStyleVariant_() di wireMapTab()), pakai gambar
  // hasil filter itu; kalau belum ada (mis. baru dipilih tapi belum
  // sempat diproses, atau memang "normal"), tetap pakai gambar ASLI
  // (map.imageDataUrl) supaya tidak pernah kirim gambar kosong ke
  // Layar 2. Fungsi murni (bukan dalam closure wireMapTab()) supaya
  // bisa dipakai juga oleh sendGenericItemLive() (item "map" di
  // Kumpulan Ayat) di atas.
  function effectiveMapImage_(map) {
    if (!map) return "";
    const style = map.mapStyle || "normal";
    if (style !== "normal" && map.styleVariants && map.styleVariants[style]) return map.styleVariants[style];
    return map.imageDataUrl || "";
  }

  function wireMapTab() {
    const MAPS_KEY = "bible_app_studio_maps_v1";
    let maps = [];
    let activeMapId = null;
    let editingPinId = null; // sedang diedit label-nya (klik nama pin di daftar)
    // BARU (9 Sep 2026) -- state untuk 📍 Kalibrasi Peta: null = tidak
    // sedang menandai, 1/2 = menunggu operator klik gambar untuk titik
    // acuan ke-1/ke-2 (lihat listener klik gambar di bawah).
    let calibArmed = null;
    // BARU (9 Sep 2026, permintaan operator) -- id pin yang sedang
    // dibuka panel "📊 Data" (luas/penduduk)-nya di daftar Pin. Set
    // module-level (bukan direset tiap renderMapEditor()) supaya panel
    // tetap terbuka selagi operator mengetik angkanya.
    const expandedPinDetail = new Set();
    // BARU (9 Sep 2026, permintaan operator) -- id pin yang sedang
    // dibuka panel "📷 Foto"-nya (upload 1-5 foto per kota).
    const expandedPinPhotos = new Set();
    // BARU (9 Sep 2026, permintaan operator) -- teks status tombol "🔄
    // Wikidata" per pin ("Memuat...", "✅ ...", "⚠️ ...") -- Map bukan
    // Set karena butuh simpan TEKS-nya, bukan cuma id-nya. Dibersihkan
    // sendiri saat panel "📊 Data" pin itu ditutup (lihat toggle di
    // bawah) supaya tidak nyangkut status lama kalau dibuka lagi nanti.
    const pinAutoStatus = new Map();
    // BARU (9 Sep 2026) -- kompres gambar sebelum disimpan sebagai
    // dataURL (localStorage cuma muat ~5-10MB TOTAL di sebagian besar
    // browser -- kalau foto disimpan mentah dari kamera HP (3-8MB per
    // foto), 5 foto x beberapa kota saja sudah bisa bikin penyimpanan
    // penuh & fitur lain yang juga pakai localStorage/perangkat ini
    // (Kumpulan Ayat dsb) ikut gagal simpan). Diperkecil ke maks lebar
    // 900px & kualitas JPEG 72% -- cukup jelas untuk ditampilkan di
    // kartu info Layar 2, biasanya jadi 50-150KB/foto.
    function compressImageFile_(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error);
        reader.onload = () => {
          const img = new Image();
          img.onerror = () => reject(new Error("Gagal memuat gambar"));
          img.onload = () => {
            const maxW = 900;
            const scale = Math.min(1, maxW / img.width);
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", 0.72));
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    }

    // BARU (9 Sep 2026) -- cari 1 kabupaten/kota dari
    // window.INDONESIA_REGENCIES (js/indonesia-regencies.js) berdasarkan
    // nama yang diketik operator. Fleksibel: operator boleh ketik "Surabaya"
    // saja (tanpa awalan "Kota"/"Kabupaten") -- dicoba beberapa varian
    // sebelum fallback ke pencocokan sebagian (substring). Balik null
    // kalau sama sekali tidak ada yang cocok.
    function findRegencyByName(query) {
      const list = (typeof window !== "undefined" && Array.isArray(window.INDONESIA_REGENCIES)) ? window.INDONESIA_REGENCIES : [];
      const q = (query || "").trim().toLowerCase();
      if (!q || !list.length) return null;
      const exact = list.find((r) => r.n.toLowerCase() === q);
      if (exact) return exact;
      const withKota = list.find((r) => r.n.toLowerCase() === "kota " + q);
      if (withKota) return withKota;
      const withKab = list.find((r) => r.n.toLowerCase() === "kabupaten " + q);
      if (withKab) return withKab;
      // fallback: kota/kabupaten yang namanya MENGANDUNG kata yang diketik
      // (mis. "Surabaya Timur" -> tetap ketemu "Kota Surabaya" kalau ada
      // kecocokan kata utuh). Diambil yang PALING PENDEK namanya supaya
      // hasil paling spesifik/masuk akal duluan.
      const partial = list.filter((r) => r.n.toLowerCase().includes(q));
      if (!partial.length) return null;
      partial.sort((a, b) => a.n.length - b.n.length);
      return partial[0];
    }

    // BARU (9 Sep 2026) -- ubah (lat,lng) jadi (xPct,yPct) di gambar peta
    // AKTIF, pakai kalibrasi 2-titik linear SEDERHANA (x hanya bergantung
    // longitude, y hanya bergantung latitude -- cukup akurat untuk peta
    // Indonesia yang biasanya digambar hampir lurus utara-atas, TIDAK
    // memperhitungkan rotasi/proyeksi peta yang aneh-aneh). Balik null
    // kalau peta belum dikalibrasi (calibration.p1/p2 belum lengkap) atau
    // ke-2 titik acuan kebetulan segaris (pembagi nol).
    function latLngToPct(map, lat, lng) {
      const c = map && map.calibration;
      if (!c || !c.p1 || !c.p2) return null;
      const { p1, p2 } = c;
      if (p2.lng === p1.lng || p2.lat === p1.lat) return null;
      const xPct = p1.xPct + ((lng - p1.lng) * (p2.xPct - p1.xPct)) / (p2.lng - p1.lng);
      const yPct = p1.yPct + ((lat - p1.lat) * (p2.yPct - p1.yPct)) / (p2.lat - p1.lat);
      return { xPct, yPct };
    }

    // BARU (9 Sep 2026) -- 1 warna KONSISTEN per nama kategori (dihitung
    // dari teksnya sendiri, bukan urutan tambah -- supaya kalau map
    // dibuka ulang / kategori ditambah dari baris manapun, warnanya tidak
    // berubah-ubah). Dipakai titik/pin & badge legenda di Layar 2.
    // BARU (9 Sep 2026, permintaan operator) -- 2 kategori yang paling
    // sering dipakai dapat warna TETAP/khusus (bukan hash) supaya selalu
    // sama tiap acara: "Kaki Dian" = emas, "Pos Injil" = merah. Kategori
    // LAIN (apa pun namanya, operator bebas menambah) tetap pakai warna
    // hash seperti biasa supaya tidak perlu didaftarkan manual satu-satu.
    const MAP_CATEGORY_PALETTE = ["#3d8ee2", "#3de27a", "#a83de2", "#e2793d", "#3de2d4", "#e23d9e"];
    const MAP_CATEGORY_FIXED_COLORS = { "kaki dian": "#d4af37", "pos injil": "#c0392b" };
    function categoryColor(category) {
      const s = String(category || "");
      const fixed = MAP_CATEGORY_FIXED_COLORS[s.trim().toLowerCase()];
      if (fixed) return fixed;
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      return MAP_CATEGORY_PALETTE[h % MAP_CATEGORY_PALETTE.length];
    }

    // BARU (9 Sep 2026, permintaan operator) -- 🌏 Total Penduduk
    // Indonesia (angka nasional, bukan per-kota): ambil dari Wikidata
    // (entitas Q252 = Indonesia, properti P1082 = jumlah penduduk),
    // yang mendukung diakses LANGSUNG dari browser (CORS terbuka) tanpa
    // perlu server tambahan -- cocok untuk situs statis seperti ini.
    // Dipilih klaim rank "preferred" kalau ada; kalau tidak, klaim
    // dengan kualifier "titik waktu" (P585) PALING BARU. Sumber
    // ditelusuri dari referensi klaim itu (P854 = URL referensi), kalau
    // tidak ada fallback ke halaman Wikidata itu sendiri.
    // ⚠️ Catatan jujur: BELUM diuji ujung-ke-ujung di jaringan
    // sungguhan (lingkungan pembuatan kode ini tidak bisa mengakses
    // wikidata.org untuk mencoba). Kalau format data Wikidata berubah,
    // atau situs operator memblokir domain luar (CSP), fungsi ini akan
    // melempar error yang ditangkap & ditampilkan apa adanya ke
    // operator -- TIDAK pernah diam-diam gagal.
    async function fetchNationalPopulationAuto_() {
      const res = await fetch("https://www.wikidata.org/wiki/Special:EntityData/Q252.json");
      if (!res.ok) throw new Error("Gagal mengambil data (HTTP " + res.status + ")");
      const json = await res.json();
      const claims = (json.entities && json.entities.Q252 && json.entities.Q252.claims && json.entities.Q252.claims.P1082) || [];
      if (!claims.length) throw new Error("Data populasi tidak ditemukan di Wikidata.");
      function claimTimeMs_(c) {
        const q = c.qualifiers && c.qualifiers.P585 && c.qualifiers.P585[0];
        const t = q && q.datavalue && q.datavalue.value && q.datavalue.value.time;
        if (!t) return 0;
        const parsed = Date.parse(String(t).replace(/^\+/, ""));
        return isNaN(parsed) ? 0 : parsed;
      }
      let best = claims.find((c) => c.rank === "preferred");
      if (!best) best = claims.slice().sort((a, b) => claimTimeMs_(b) - claimTimeMs_(a))[0];
      const amountStr = best && best.mainsnak && best.mainsnak.datavalue && best.mainsnak.datavalue.value && best.mainsnak.datavalue.value.amount;
      const value = amountStr ? Math.round(Number(String(amountStr).replace("+", ""))) : null;
      if (!value) throw new Error("Format data populasi tidak dikenali.");
      const qTime = best.qualifiers && best.qualifiers.P585 && best.qualifiers.P585[0];
      const timeStr = qTime && qTime.datavalue && qTime.datavalue.value && qTime.datavalue.value.time;
      const year = timeStr ? String(timeStr).replace(/^\+/, "").slice(0, 4) : "";
      let source = "Wikidata (Q252)";
      let sourceUrl = "https://www.wikidata.org/wiki/Q252";
      if (Array.isArray(best.references) && best.references.length) {
        const ref = best.references.find((r) => r.snaks && (r.snaks.P854 || r.snaks.P248)) || best.references[0];
        const urlSnak = ref.snaks && ref.snaks.P854 && ref.snaks.P854[0];
        if (urlSnak && urlSnak.datavalue && urlSnak.datavalue.value) {
          sourceUrl = urlSnak.datavalue.value;
          source = "Wikidata (referensi: " + sourceUrl + ")";
        }
      }
      return { value, year, source, sourceUrl };
    }

    // BARU (9 Sep 2026, permintaan operator) -- versi UMUM dari logika
    // "ambil klaim terbaik dari Wikidata" yang tadinya cuma dipakai untuk
    // penduduk NASIONAL (fetchNationalPopulationAuto_() di atas). Dipakai
    // di sini lagi untuk data PER-KOTA (penduduk P1082 & luas P2046),
    // supaya tidak ditulis ulang. fetchNationalPopulationAuto_() sendiri
    // SENGAJA tidak diubah/disatukan ke fungsi ini (biar fitur yang sudah
    // jalan tidak ikut berisiko rusak) -- kalau nanti mau dirapikan jadi
    // benar-benar 1 fungsi, aman dikerjakan terpisah.
    function extractBestWikidataClaim_(claims) {
      if (!Array.isArray(claims) || !claims.length) return null;
      function claimTimeMs_(c) {
        const q = c.qualifiers && c.qualifiers.P585 && c.qualifiers.P585[0];
        const t = q && q.datavalue && q.datavalue.value && q.datavalue.value.time;
        if (!t) return 0;
        const parsed = Date.parse(String(t).replace(/^\+/, ""));
        return isNaN(parsed) ? 0 : parsed;
      }
      let best = claims.find((c) => c.rank === "preferred");
      if (!best) best = claims.slice().sort((a, b) => claimTimeMs_(b) - claimTimeMs_(a))[0];
      const amountStr = best && best.mainsnak && best.mainsnak.datavalue && best.mainsnak.datavalue.value && best.mainsnak.datavalue.value.amount;
      const value = amountStr ? Number(String(amountStr).replace("+", "")) : null;
      if (!value) return null;
      const qTime = best.qualifiers && best.qualifiers.P585 && best.qualifiers.P585[0];
      const timeStr = qTime && qTime.datavalue && qTime.datavalue.value && qTime.datavalue.value.time;
      const year = timeStr ? String(timeStr).replace(/^\+/, "").slice(0, 4) : "";
      let source = "Wikidata";
      if (Array.isArray(best.references) && best.references.length) {
        const ref = best.references.find((r) => r.snaks && (r.snaks.P854 || r.snaks.P248)) || best.references[0];
        const urlSnak = ref.snaks && ref.snaks.P854 && ref.snaks.P854[0];
        if (urlSnak && urlSnak.datavalue && urlSnak.datavalue.value) {
          source = "Wikidata (ref: " + urlSnak.datavalue.value + ")";
        }
      }
      return { value, year, source };
    }
    // Cari QID Wikidata dari nama kota/kabupaten (mis. "Kabupaten
    // Sidoarjo" / "Kota Surabaya") lewat wbsearchentities (API publik,
    // CORS terbuka, tidak butuh API key). Diutamakan hasil yang label-nya
    // PERSIS sama (case-insensitive); kalau tidak ada, pakai hasil
    // teratas -- disebut apa adanya di pesan error/sukses supaya operator
    // bisa cek manual kalau salah kota.
    async function searchWikidataEntity_(name) {
      const url = "https://www.wikidata.org/w/api.php?action=wbsearchentities&search=" +
        encodeURIComponent(name) + "&language=id&uselang=id&format=json&origin=*&type=item&limit=6";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Pencarian Wikidata gagal (HTTP " + res.status + ")");
      const json = await res.json();
      const list = json.search || [];
      if (!list.length) throw new Error('Tidak ditemukan di Wikidata: "' + name + '"');
      const exact = list.find((s) => (s.label || "").toLowerCase() === name.toLowerCase());
      return { id: (exact || list[0]).id, label: (exact || list[0]).label || name };
    }
    // Ambil penduduk (P1082) & luas (P2046) 1 kota dari Wikidata. Dipakai
    // baik oleh tombol "🔄 Wikidata" per-pin maupun tombol massal "🔄
    // Perbarui Semua Populasi/Luas". Sama seperti banner nasional, kalau
    // Wikidata mengubah format/menutup CORS di kemudian hari, ini akan
    // gagal dengan pesan error apa adanya -- isian manual ("📊 Data") tetap
    // berfungsi sebagai cadangan tanpa internet.
    async function fetchCityDataAuto_(cityName) {
      const found = await searchWikidataEntity_(cityName);
      const res = await fetch("https://www.wikidata.org/wiki/Special:EntityData/" + found.id + ".json");
      if (!res.ok) throw new Error("Gagal mengambil data (HTTP " + res.status + ")");
      const json = await res.json();
      const ent = json.entities && json.entities[found.id];
      const claims = (ent && ent.claims) || {};
      const population = extractBestWikidataClaim_(claims.P1082);
      const area = extractBestWikidataClaim_(claims.P2046);
      if (!population && !area) {
        throw new Error('Data penduduk/luas tidak ditemukan di Wikidata untuk "' + found.label + '" (' + found.id + ').');
      }
      return { qid: found.id, matchedLabel: found.label, population, area };
    }

    // BARU (9 Sep 2026) -- tampilkan status angka penduduk nasional yang
    // sedang tersimpan di peta aktif (map.nationalPopulation) + set
    // ulang toggle "Tampilkan di Layar 2" supaya cocok dengan datanya.
    function renderNatPopStatus() {
      const statusEl = el("psMapNatPopStatus");
      const visibleCb = el("psMapNatPopVisible");
      if (!statusEl) return;
      const map = activeMap();
      const np = map && map.nationalPopulation;
      if (!np || !np.value) {
        statusEl.textContent = "⚠️ Belum diisi.";
        if (visibleCb) visibleCb.checked = false;
        return;
      }
      const valueText = Number(np.value).toLocaleString("id-ID");
      statusEl.textContent = `✅ ${valueText} jiwa${np.year ? " (" + np.year + ")" : ""} -- ${np.source || "sumber tidak dicatat"}`;
      if (visibleCb) visibleCb.checked = !!np.visible;
    }

    // BARU (9 Sep 2026) -- kirim data penduduk nasional TERKINI (peta
    // aktif) ke Layar 2 secara LIVE lewat action "natpop" -- dipisah dari
    // action "show"/"focus"/"zoom" supaya toggle Tampilkan/Sembunyikan
    // atau update angka TIDAK ikut mereset zoom/posisi fokus kota yang
    // sedang tayang (lihat present.html -> renderNationalPop_()).
    function pushNatPopLive_() {
      const map = activeMap();
      rawPost({ type: "map", action: "natpop", nationalPopulation: (map && map.nationalPopulation) || null });
    }

    function loadMaps() {
      try { maps = JSON.parse(localStorage.getItem(MAPS_KEY) || "[]"); } catch (e) { maps = []; }
      if (!Array.isArray(maps)) maps = [];
    }
    function saveMaps() {
      try { localStorage.setItem(MAPS_KEY, JSON.stringify(maps)); } catch (e) {}
    }
    function activeMap() { return maps.find((m) => m.id === activeMapId) || null; }

    function renderMapSelect() {
      const sel = el("psMapSelect");
      if (!sel) return;
      sel.innerHTML = maps.length
        ? maps.map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join("")
        : '<option value="">(Belum ada peta -- buat "Peta Baru")</option>';
      if (activeMapId) sel.value = activeMapId;
    }
    // PERBAIKAN (10 Sep 2026, permintaan operator: "posisi pin di Studio
    // beda dengan di Layar 2") -- kotak pratinjau #psMapEditorWrap
    // sekarang dikunci 16:9 (lihat index.html) dengan gambar
    // object-fit:contain di dalamnya, PERSIS seperti #mapView di
    // present.html -- jadi kalau rasio gambar peta BUKAN 16:9, akan ada
    // "letterbox" (garis hitam) di kiri-kanan atau atas-bawah, SAMA
    // ukurannya dengan yang akan tampil di Layar 2. Fungsi ini menghitung
    // kotak gambar yang BENAR-BENAR terlihat (bukan kotak 16:9-nya) --
    // dipakai baik untuk memposisikan #psMapEditorPins maupun untuk
    // menghitung xPct/yPct saat diklik, SAMA PERSIS rumusnya dengan
    // positionMapContent_() di present.html, supaya kedua sisi selalu
    // sepakat -- pin yang ditandai di Studio dijamin jatuh di titik yang
    // SAMA PERSIS saat ditayangkan ke Layar 2, di rasio layar apa pun.
    function mapEditorImgContainRect_(imgEl) {
      const rect = imgEl.getBoundingClientRect();
      const iw = imgEl.naturalWidth, ih = imgEl.naturalHeight;
      if (!iw || !ih || !rect.width || !rect.height) return rect;
      const boxRatio = rect.width / rect.height, imgRatio = iw / ih;
      let width, height;
      if (imgRatio > boxRatio) { width = rect.width; height = width / imgRatio; }
      else { height = rect.height; width = height * imgRatio; }
      return { left: rect.left + (rect.width - width) / 2, top: rect.top + (rect.height - height) / 2, width, height };
    }
    function positionEditorPinsLayer_() {
      const wrap = el("psMapEditorWrap");
      const img = el("psMapEditorImg");
      const pinsLayer = el("psMapEditorPins");
      if (!wrap || !img || !pinsLayer || wrap.style.display === "none") return;
      const wrapRect = wrap.getBoundingClientRect();
      const cr = mapEditorImgContainRect_(img);
      pinsLayer.style.left = (cr.left - wrapRect.left) + "px";
      pinsLayer.style.top = (cr.top - wrapRect.top) + "px";
      pinsLayer.style.width = cr.width + "px";
      pinsLayer.style.height = cr.height + "px";
    }
    // Reposisi otomatis kalau jendela/panel di-resize selagi peta
    // sedang ditampilkan di editor (mis. operator melebarkan jendela
    // browser Studio).
    window.addEventListener("resize", () => positionEditorPinsLayer_());
    function renderMapEditor() {
      const map = activeMap();
      const wrap = el("psMapEditorWrap");
      const hint = el("psMapEditorHint");
      const img = el("psMapEditorImg");
      const pinsLayer = el("psMapEditorPins");
      const list = el("psMapPinList");
      if (!wrap || !img || !pinsLayer || !list) return;
      if (!map || !map.imageDataUrl) {
        wrap.style.display = "none";
        if (hint) hint.style.display = "none";
        list.innerHTML = "";
        renderCityRows();
        renderCategoryChecklist();
        renderCalibStatus();
        renderNatPopStatus();
        return;
      }
      // BARU (9 Sep 2026, permintaan operator) -- pratinjau Studio ikut
      // memakai varian "🎨 Gaya Peta Dasar" yang sedang aktif (kalau
      // sudah pernah diproses), bukan selalu gambar asli, supaya
      // operator lihat persis apa yang akan tayang di Layar 2.
      // PERBAIKAN (10 Sep 2026) -- positionEditorPinsLayer_() BUTUH
      // naturalWidth/naturalHeight gambar, yang baru pasti tersedia
      // setelah <img> selesai memuat -- dipasang lewat onload (dipanggil
      // ulang tiap renderMapEditor() supaya selalu memakai gambar yang
      // sedang aktif). requestAnimationFrame tambahan untuk kasus gambar
      // sudah ada di cache browser (onload bisa saja tidak sempat
      // terpasang sebelum event-nya lewat).
      img.onload = () => positionEditorPinsLayer_();
      img.src = effectiveMapImage_(map);
      requestAnimationFrame(() => positionEditorPinsLayer_());
      // BARU (9 Sep 2026, permintaan operator) -- sinkronkan dropdown
      // "🎨 Gaya Peta Dasar"/"🎨 Gaya Pin" dengan data peta AKTIF (penting
      // saat operator pindah-pindah peta lewat "Peta Baru/Ganti Nama",
      // supaya dropdown tidak "nyangkut" ke pilihan peta sebelumnya).
      if (el("psMapStyleSelect")) el("psMapStyleSelect").value = map.mapStyle || "normal";
      if (el("psMapPinStyleSelect")) el("psMapPinStyleSelect").value = map.pinStyle || "flat";
      wrap.style.display = "block";
      if (hint) hint.style.display = "block";
      pinsLayer.innerHTML = "";
      const pinStyle3D = map.pinStyle === "3d"; // BARU (9 Sep 2026, permintaan operator)
      (map.pins || []).forEach((pin, idx) => {
        const dot = document.createElement("div");
        const color = pin.category ? categoryColor(pin.category) : "#e2483d";
        // BARU (9 Sep 2026) -- pratinjau ukuran pin di Studio ikut
        // membesar sesuai penduduk, sama seperti di Layar 2
        // (renderMapPins_(), present.html), supaya operator lihat kira-kira
        // hasilnya sebelum ditayangkan.
        const size = pin.population ? Math.max(20, Math.min(56, 14 + Math.sqrt(Number(pin.population)) / 6)) : 20;
        dot.title = (pin.label || ("Pin " + (idx + 1))) + (pin.category ? ` (${pin.category}${pin.year ? ", " + pin.year : ""})` : "");
        // BARU (9 Sep 2026, permintaan operator) -- "🎨 Gaya Pin: 3D
        // Berputar" (map.pinStyle === "3d") pakai class .ps-pin-3d (lihat
        // css/style.css) yang menggantikan background flat dengan
        // gradient + animasi sorot berputar, warna dioper lewat custom
        // property --pin3d-color (bukan style.background) supaya
        // gradient-nya tetap jalan.
        if (pinStyle3D) {
          dot.className = "ps-pin-3d";
          dot.style.cssText = `position:absolute; left:${pin.xPct}%; top:${pin.yPct}%; width:${size}px; height:${size}px; margin:${-size / 2}px 0 0 ${-size / 2}px; border-radius:50%; --pin3d-color:${color}; border:2px solid #fff; box-shadow:0 3px 8px rgba(0,0,0,.55); font:700 11px/${size}px sans-serif; color:#fff; text-align:center; pointer-events:auto; cursor:pointer;`;
        } else {
          dot.style.cssText = `position:absolute; left:${pin.xPct}%; top:${pin.yPct}%; width:${size}px; height:${size}px; margin:${-size / 2}px 0 0 ${-size / 2}px; border-radius:50%; background:${color}; border:2px solid #fff; box-shadow:0 1px 4px rgba(0,0,0,.5); font:700 11px/${size}px sans-serif; color:#fff; text-align:center; pointer-events:auto; cursor:pointer;`;
        }
        dot.textContent = String(idx + 1);
        pinsLayer.appendChild(dot);
      });
      list.innerHTML = "";
      (map.pins || []).forEach((pin) => {
        const row = document.createElement("div");
        row.className = "ps-btn-row";
        row.style.cssText = "align-items:center; gap:6px;";
        // BARU (9 Sep 2026) -- kalau pin ini berasal dari "📋 Daftar Titik
        // dari Tabel" (punya kategori), nama & kategorinya diedit lewat
        // TABEL itu (satu sumber, supaya tidak dobel-edit di 2 tempat)
        // -- di sini cuma ditampilkan sebagai keterangan + tombol
        // Fokus/Hapus. Pin manual (tanpa kategori) tetap bisa diedit
        // langsung di sini seperti sebelumnya.
        // BARU (9 Sep 2026) -- badge kecil kalau pin ini SUDAH punya data
        // luas/penduduk, supaya operator tahu tanpa perlu buka panelnya.
        const hasDetail = !!(pin.areaKm2 || pin.population);
        const detailBtnLabel = hasDetail ? "📊 Data ✓" : "📊 Data";
        const photoCount = Array.isArray(pin.photos) ? pin.photos.length : 0;
        const photoBtnLabel = photoCount ? `📷 Foto (${photoCount})` : "📷 Foto";
        if (pin.category) {
          row.innerHTML = `
            <span style="flex:1; min-width:0; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              <span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:${categoryColor(pin.category)}; margin-right:5px;"></span>
              ${escapeHtml(pin.label || "")} <span style="opacity:.65;">— ${escapeHtml(pin.category)}${pin.year ? ", " + escapeHtml(String(pin.year)) : ""}</span>
            </span>
            <button type="button" class="chip-btn small" data-pin-detail-toggle="${pin.id}" title="Isi luas &amp; jumlah penduduk kota ini (opsional)">${detailBtnLabel}</button>
            <button type="button" class="chip-btn small" data-pin-photo-toggle="${pin.id}" title="Unggah 1-5 foto kota ini (opsional)">${photoBtnLabel}</button>
            <button type="button" class="chip-btn small" data-pin-focus="${pin.id}" title="Tampilkan &amp; zoom ke titik ini di Layar 2">🎯 Fokus</button>
            <button type="button" class="chip-btn small" data-pin-del="${pin.id}" title="Hapus pin ini">🗑️</button>
          `;
        } else {
          row.innerHTML = `
            <input type="text" value="${escapeHtml(pin.label || "")}" data-pin-label="${pin.id}" class="columns-lang-select" style="flex:1; min-width:0;" placeholder="Nama titik (mis. Gazebo Musa)" />
            <button type="button" class="chip-btn small" data-pin-detail-toggle="${pin.id}" title="Isi luas &amp; jumlah penduduk (opsional)">${detailBtnLabel}</button>
            <button type="button" class="chip-btn small" data-pin-photo-toggle="${pin.id}" title="Unggah 1-5 foto (opsional)">${photoBtnLabel}</button>
            <button type="button" class="chip-btn small" data-pin-focus="${pin.id}" title="Tampilkan &amp; zoom ke titik ini di Layar 2">🎯 Fokus</button>
            <button type="button" class="chip-btn small" data-pin-del="${pin.id}" title="Hapus pin ini">🗑️</button>
          `;
        }
        list.appendChild(row);
        // BARU (9 Sep 2026, permintaan operator) -- panel "📊 Data" (luas
        // km² & jumlah penduduk + tahun datanya), TERSEMBUNYI secara
        // default supaya daftar 500-an titik tidak penuh sesak input --
        // baru muncul kalau operator klik tombol "📊 Data" pin itu
        // (state-nya di expandedPinDetail, lihat deklarasi di atas).
        // SENGAJA tidak ada database luas/penduduk bawaan untuk 514
        // kabupaten/kota -- angka itu berubah tiap tahun & kalau salah
        // isi bisa menyesatkan penonton, jadi operator yang mengisi
        // sendiri dari sumber yang mereka percaya (mis. data BPS
        // terbaru), lengkap dengan tahun datanya supaya jelas sumbernya.
        if (expandedPinDetail.has(pin.id)) {
          const detailRow = document.createElement("div");
          detailRow.className = "ps-btn-row";
          detailRow.style.cssText = "gap:6px; align-items:center; margin:-2px 0 4px 0; padding-left:14px;";
          detailRow.innerHTML = `
            <input type="number" min="0" step="0.01" value="${pin.areaKm2 || ""}" data-pin-area="${pin.id}" class="columns-lang-select" style="flex:1; min-width:0;" placeholder="Luas (km²)" />
            <input type="number" min="0" step="1" value="${pin.population || ""}" data-pin-pop="${pin.id}" class="columns-lang-select" style="flex:1; min-width:0;" placeholder="Jumlah penduduk" />
            <input type="number" min="1900" max="2100" value="${pin.populationYear || ""}" data-pin-pop-year="${pin.id}" class="columns-lang-select" style="width:78px;" placeholder="Sensus thn" />
            <button type="button" class="chip-btn small" data-pin-auto="${pin.id}" title="Ambil ulang penduduk &amp; luas dari Wikidata (otomatis)">🔄 Wikidata</button>
          `;
          list.appendChild(detailRow);
          // BARU (9 Sep 2026, permintaan operator) -- baris sumber data,
          // dipisah dari baris input di atas supaya angkanya tetap gampang
          // diedit manual kalau operator mau koreksi setelah diisi
          // otomatis. Sama seperti banner nasional: baris ini SENGAJA
          // kosong (tidak ditampilkan) kalau belum pernah diisi apapun.
          const sourceRow = document.createElement("div");
          sourceRow.style.cssText = "padding-left:14px; margin:-4px 0 6px 0;";
          const statusText = pinAutoStatus.get(pin.id);
          const parts = [];
          if (statusText) parts.push(statusText);
          else {
            if (pin.populationSource) parts.push("👥 " + pin.populationSource + (pin.populationYear ? " (" + pin.populationYear + ")" : ""));
            if (pin.areaSource) parts.push("📐 " + pin.areaSource);
          }
          sourceRow.innerHTML = parts.length
            ? `<span class="ps-pointer-hint" style="margin:0; display:block;">${escapeHtml(parts.join(" · "))}</span>`
            : `<span class="ps-pointer-hint" style="margin:0; display:block;">Belum ada sumber tercatat -- isi manual di atas, atau tekan "🔄 Wikidata".</span>`;
          list.appendChild(sourceRow);
        }
        // BARU (9 Sep 2026, permintaan operator) -- panel "📷 Foto":
        // pratinjau thumbnail (maks 5) + tombol hapus per foto + input
        // unggah baru (disembunyikan kalau sudah 5). Berlaku untuk
        // SEMUA pin, baik pin manual maupun pin kota berkategori (Kaki
        // Dian/Pos Injil/dst) -- jadi bisa dipakai di 514 kabupaten/kota
        // sekalipun, TAPI lihat catatan penyimpanan di
        // compressImageFile_() di atas: dipakai sewajarnya (kota yang
        // memang mau ditonjolkan saja), bukan untuk semua 514 kota
        // sekaligus, supaya localStorage perangkat tidak penuh.
        if (expandedPinPhotos.has(pin.id)) {
          const photos = Array.isArray(pin.photos) ? pin.photos : [];
          const photoPanel = document.createElement("div");
          photoPanel.style.cssText = "margin:-2px 0 6px 0; padding-left:14px; display:flex; flex-direction:column; gap:6px;";
          const thumbsHtml = photos.map((src, i) => `
            <span style="position:relative; display:inline-block;">
              <img src="${src}" alt="" style="width:52px; height:52px; object-fit:cover; border-radius:6px; border:1px solid rgba(255,255,255,.25);" />
              <button type="button" data-pin-photo-del="${pin.id}" data-photo-idx="${i}" title="Hapus foto ini" style="position:absolute; top:-6px; right:-6px; width:18px; height:18px; border-radius:50%; border:none; background:#c0392b; color:#fff; font-size:11px; line-height:18px; padding:0; cursor:pointer;">✕</button>
            </span>
          `).join("");
          photoPanel.innerHTML = `
            <div style="display:flex; gap:8px; flex-wrap:wrap;">${thumbsHtml || '<span class="ps-pointer-hint" style="margin:0;">Belum ada foto.</span>'}</div>
            ${photos.length < 5 ? `<div class="ps-btn-row" style="gap:6px;">
              <input type="file" accept="image/*" multiple data-pin-photo-add="${pin.id}" style="flex:1; min-width:0; font-size:12px;" />
            </div>
            <span class="ps-pointer-hint" style="margin:0;">Maks 5 foto/kota, otomatis dikecilkan supaya hemat penyimpanan.</span>` : `<span class="ps-pointer-hint" style="margin:0;">Sudah 5 foto (maksimal). Hapus salah satu untuk unggah yang baru.</span>`}
          `;
          list.appendChild(photoPanel);
        }
      });
      list.querySelectorAll("[data-pin-label]").forEach((inp) => {
        inp.addEventListener("change", () => {
          const pin = (map.pins || []).find((p) => p.id === inp.dataset.pinLabel);
          if (pin) { pin.label = inp.value.trim(); saveMaps(); renderMapEditor(); }
        });
      });
      list.querySelectorAll("[data-pin-focus]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const pin = (map.pins || []).find((p) => p.id === btn.dataset.pinFocus);
          if (pin) {
            rawPost({ type: "map", action: "focus", pin, imageUrl: effectiveMapImage_(map), pinStyle: map.pinStyle || "flat", pins: visiblePins(map) });
            map.everShown = true; // lihat catatan panjang di listener psMapPinStyleSelect di atas
            // BARU (9 Sep 2026) -- "🎯 Fokus" pakai zoom tetap 2.6x (260%)
            // di Layar 2 (lihat focusMapPin(), present.html) -- samakan
            // posisi slider supaya operator bisa lanjut menggeser dari
            // situ, bukan dari 100% yang salah/menyesatkan.
            if (el("psMapZoomSlider")) el("psMapZoomSlider").value = 260;
            if (el("psMapZoomValue")) el("psMapZoomValue").value = "260";
          }
        });
      });
      list.querySelectorAll("[data-pin-del]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const pin = (map.pins || []).find((p) => p.id === btn.dataset.pinDel);
          map.pins = (map.pins || []).filter((p) => p.id !== btn.dataset.pinDel);
          expandedPinDetail.delete(btn.dataset.pinDel);
          // PERBAIKAN (10 Sep 2026, permintaan operator: "pin tidak bisa
          // dihapus") -- pin BERKATEGORI lahir dari baris "📋 Daftar
          // Titik dari Tabel" -- kalau baris itu dibiarkan, klik
          // "🧮 Terapkan ke Peta" berikutnya akan MELAHIRKAN LAGI pin
          // yang baru saja dihapus (bukan bug penghapusan gagal, tapi
          // baris sumbernya belum ikut dihapus) -- di sini baris
          // sumbernya ikut dikosongkan supaya penghapusan pin benar-benar
          // permanen sampai operator mengetik ulang baris itu sendiri.
          if (pin && pin.category && Array.isArray(map.cityRows)) {
            map.cityRows = map.cityRows.filter((row) => {
              const reg = findRegencyByName((row.city || "").trim());
              const rowLabel = reg ? reg.n : (row.city || "").trim();
              return !(rowLabel === pin.label && (row.category || "").trim() === pin.category);
            });
          }
          saveMaps();
          renderMapEditor();
        });
      });
      // BARU (9 Sep 2026) -- buka/tutup panel "📊 Data" per pin.
      list.querySelectorAll("[data-pin-detail-toggle]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.pinDetailToggle;
          if (expandedPinDetail.has(id)) { expandedPinDetail.delete(id); pinAutoStatus.delete(id); } else expandedPinDetail.add(id);
          renderMapEditor();
        });
      });
      // BARU (9 Sep 2026, permintaan operator) -- tombol "🔄 Wikidata"
      // per-pin: ambil penduduk+luas OTOMATIS (bukan isi manual lagi),
      // langsung isi kotak "📊 Data" di atasnya + catat sumber & tahunnya
      // supaya bisa ditampilkan ke penonton di Layar 2 (lihat
      // renderMapInfoCard_(), present.html). Nama yang dicari = label pin
      // (untuk pin dari "📋 Daftar Titik dari Tabel" ini nama kota/
      // kabupaten resmi, mis. "Kabupaten Sidoarjo" -- cocok dengan label
      // Wikidata Indonesia).
      list.querySelectorAll("[data-pin-auto]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.dataset.pinAuto;
          const pin = (map.pins || []).find((p) => p.id === id);
          if (!pin) return;
          pinAutoStatus.set(id, "⏳ Mengambil dari Wikidata…");
          renderMapEditor();
          try {
            const data = await fetchCityDataAuto_(pin.label || "");
            const gotParts = [];
            if (data.population && data.population.value) {
              pin.population = Math.round(data.population.value);
              pin.populationYear = data.population.year || "";
              pin.populationSource = data.population.source;
              gotParts.push("penduduk " + pin.population.toLocaleString("id-ID"));
            }
            if (data.area && data.area.value) {
              pin.areaKm2 = data.area.value;
              pin.areaSource = data.area.source;
              gotParts.push("luas " + pin.areaKm2.toLocaleString("id-ID") + " km²");
            }
            saveMaps();
            pinAutoStatus.set(id, gotParts.length ? "✅ Terisi: " + gotParts.join(", ") + " (" + data.matchedLabel + ")" : "⚠️ Tidak ada angka yang cocok ditemukan.");
          } catch (e) {
            pinAutoStatus.set(id, "⚠️ Gagal: " + (e && e.message ? e.message : "kesalahan tidak dikenal"));
          }
          renderMapEditor();
        });
      });
      // BARU (9 Sep 2026) -- buka/tutup panel "📷 Foto" per pin.
      list.querySelectorAll("[data-pin-photo-toggle]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.pinPhotoToggle;
          if (expandedPinPhotos.has(id)) expandedPinPhotos.delete(id); else expandedPinPhotos.add(id);
          renderMapEditor();
        });
      });
      // BARU (9 Sep 2026) -- unggah foto baru (dikompres dulu lewat
      // compressImageFile_() di atas), dibatasi total 5/pin -- kalau
      // operator pilih lebih dari sisa slot, kelebihannya dilewati saja
      // (bukan error) supaya tidak mengagetkan operator saat live.
      list.querySelectorAll("[data-pin-photo-add]").forEach((inp) => {
        inp.addEventListener("change", async () => {
          const pin = (map.pins || []).find((p) => p.id === inp.dataset.pinPhotoAdd);
          if (!pin || !inp.files || !inp.files.length) return;
          if (!Array.isArray(pin.photos)) pin.photos = [];
          const slots = Math.max(0, 5 - pin.photos.length);
          const files = Array.from(inp.files).slice(0, slots);
          for (const file of files) {
            try {
              const dataUrl = await compressImageFile_(file);
              pin.photos.push(dataUrl);
            } catch (e) {
              // Gagal kompres 1 foto (mis. file rusak) -- lewati saja,
              // tidak menggagalkan foto lain yang sedang diunggah.
            }
          }
          saveMaps();
          renderMapEditor();
        });
      });
      // BARU (9 Sep 2026) -- hapus 1 foto dari pin (index dalam array).
      list.querySelectorAll("[data-pin-photo-del]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const pin = (map.pins || []).find((p) => p.id === btn.dataset.pinPhotoDel);
          if (!pin || !Array.isArray(pin.photos)) return;
          pin.photos.splice(Number(btn.dataset.photoIdx), 1);
          saveMaps();
          renderMapEditor();
        });
      });
      // BARU (9 Sep 2026) -- simpan luas/penduduk/tahun data ke pin.
      // Field kosong disimpan sebagai "" (BUKAN 0) supaya kartu info di
      // Layar 2 tahu untuk TIDAK menampilkan baris itu (lihat
      // renderMapInfoCard_(), present.html).
      // BARU (9 Sep 2026) -- kalau operator ketik ULANG angka manual
      // (baik pertama kali maupun buat KOREKSI hasil "🔄 Wikidata"),
      // catatan "sumber: Wikidata"-nya ikut dihapus -- supaya tidak
      // salah tampil ke penonton seolah angka koreksi manual itu masih
      // dari Wikidata. Belum ada cara memberi label "sumber manual"
      // eksplisit (operator bisa isi lewat catatan lain kalau perlu).
      list.querySelectorAll("[data-pin-area]").forEach((inp) => {
        inp.addEventListener("change", () => {
          const pin = (map.pins || []).find((p) => p.id === inp.dataset.pinArea);
          if (pin) { pin.areaKm2 = inp.value ? Number(inp.value) : ""; pin.areaSource = ""; saveMaps(); renderMapEditor(); }
        });
      });
      list.querySelectorAll("[data-pin-pop]").forEach((inp) => {
        inp.addEventListener("change", () => {
          const pin = (map.pins || []).find((p) => p.id === inp.dataset.pinPop);
          if (pin) { pin.population = inp.value ? Number(inp.value) : ""; pin.populationSource = ""; saveMaps(); renderMapEditor(); }
        });
      });
      list.querySelectorAll("[data-pin-pop-year]").forEach((inp) => {
        inp.addEventListener("change", () => {
          const pin = (map.pins || []).find((p) => p.id === inp.dataset.pinPopYear);
          if (pin) { pin.populationYear = inp.value ? Number(inp.value) : ""; saveMaps(); }
        });
      });
      renderCityRows();
      renderCategoryChecklist();
      renderCalibStatus();
      renderNatPopStatus();
    }

    // BARU (9 Sep 2026) -- pin yang IKUT DIKIRIM ke Layar 2: pin TANPA
    // kategori (pin manual, selalu tampil) + pin BERKATEGORI yang
    // kategorinya sedang DICENTANG di "☑️ Kategori yang Ditampilkan".
    function visiblePins(map) {
      const active = new Set(map.activeCategories || []);
      return (map.pins || []).filter((p) => !p.category || active.has(p.category));
    }

    function renderCalibStatus() {
      const statusEl = el("psMapCalibStatus");
      if (!statusEl) return;
      const map = activeMap();
      const c = map && map.calibration;
      if (c && c.p1 && c.p2) {
        statusEl.textContent = `✅ Terkalibrasi (acuan: ${c.p1.name} & ${c.p2.name}).`;
      } else if (calibArmed) {
        statusEl.textContent = `🎯 Klik di gambar peta untuk titik acuan #${calibArmed}...`;
      } else {
        statusEl.textContent = "⚠️ Belum dikalibrasi -- \"Terapkan ke Peta\" di bawah belum bisa menghitung posisi otomatis.";
      }
    }

    // BARU (9 Sep 2026) -- ☑️ daftar kategori (dari SEMUA pin berkategori
    // di peta aktif) + jumlah titiknya, checkbox mengatur
    // map.activeCategories (dipakai visiblePins() di atas & badge legenda
    // Layar 2, lihat showMap()/present.html).
    function renderCategoryChecklist() {
      const wrap = el("psMapCategoryChecklist");
      if (!wrap) return;
      const map = activeMap();
      if (!map) { wrap.innerHTML = ""; return; }
      const counts = {};
      (map.pins || []).forEach((p) => { if (p.category) counts[p.category] = (counts[p.category] || 0) + 1; });
      const categories = Object.keys(counts).sort();
      if (!map.activeCategories) map.activeCategories = categories.slice(); // default: semua nyala
      if (!categories.length) {
        wrap.innerHTML = '<div class="ps-pointer-hint" style="margin:0;">(belum ada kategori -- isi dari "📋 Daftar Titik dari Tabel" di atas)</div>';
        return;
      }
      wrap.innerHTML = categories.map((cat) => {
        const checked = map.activeCategories.includes(cat) ? "checked" : "";
        const color = categoryColor(cat);
        return `<label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
          <input type="checkbox" data-map-cat="${escapeHtml(cat)}" ${checked} style="margin:0;" />
          <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${color};"></span>
          <span style="flex:1;">${escapeHtml(cat)}</span>
          <span style="opacity:.7;">(${counts[cat]})</span>
        </label>`;
      }).join("");
      wrap.querySelectorAll("[data-map-cat]").forEach((cb) => {
        cb.addEventListener("change", () => {
          const cat = cb.dataset.mapCat;
          const set = new Set(map.activeCategories || []);
          if (cb.checked) set.add(cat); else set.delete(cat);
          map.activeCategories = Array.from(set);
          saveMaps();
        });
      });
    }

    // BARU (9 Sep 2026) -- 📋 baris tabel "Kota/Kabupaten | Kategori |
    // Tahun" -- disimpan di map.cityRows (TERPISAH dari map.pins) supaya
    // baris yang belum sempat "🧮 Terapkan ke Peta" tidak hilang & tetap
    // bisa diedit ulang kapan saja (mis. perbaiki typo nama kota) tanpa
    // kehilangan pin yang SUDAH ditaruh dari baris lain.
    function renderCityRows() {
      const wrap = el("psMapCityRows");
      if (!wrap) return;
      const map = activeMap();
      if (!map) { wrap.innerHTML = ""; return; }
      if (!Array.isArray(map.cityRows)) map.cityRows = [];
      wrap.innerHTML = map.cityRows.map((row, i) => `
        <div class="ps-btn-row" style="gap:6px; align-items:center;" data-city-row="${i}">
          <input type="text" list="psIndonesiaCities" value="${escapeHtml(row.city || "")}" data-row-field="city" placeholder="mis. Surabaya" class="columns-lang-select" style="flex:1.4; min-width:0;" />
          <input type="text" list="psMapCategoriesList" value="${escapeHtml(row.category || "")}" data-row-field="category" placeholder="mis. Kaki Dian" class="columns-lang-select" style="flex:1; min-width:0;" />
          <input type="number" value="${row.year || ""}" data-row-field="year" placeholder="Tahun" class="columns-lang-select" style="width:64px;" />
          <button type="button" class="chip-btn small" data-row-del="${i}" title="Hapus baris">🗑️</button>
        </div>
      `).join("");
      wrap.querySelectorAll("[data-row-field]").forEach((inp) => {
        inp.addEventListener("change", () => {
          const i = Number(inp.closest("[data-city-row]").dataset.cityRow);
          if (!map.cityRows[i]) return;
          map.cityRows[i][inp.dataset.rowField] = inp.dataset.rowField === "year" ? (inp.value ? Number(inp.value) : "") : inp.value;
          saveMaps();
        });
      });
      wrap.querySelectorAll("[data-row-del]").forEach((btn) => {
        btn.addEventListener("click", () => {
          map.cityRows.splice(Number(btn.dataset.rowDel), 1);
          saveMaps();
          renderCityRows();
        });
      });
      // Perbarui daftar autocomplete kategori supaya baris BARU bisa
      // langsung memilih kategori yang SUDAH dipakai baris lain/pin lain
      // (menghindari typo -> kategori "ganda" tidak sengaja).
      const catList = el("psMapCategoriesList");
      if (catList) {
        const cats = new Set((map.pins || []).map((p) => p.category).filter(Boolean));
        (map.cityRows || []).forEach((r) => { if (r.category) cats.add(r.category); });
        catList.innerHTML = Array.from(cats).sort().map((c) => `<option value="${escapeHtml(c)}"></option>`).join("");
      }
    }


    loadMaps();
    if (maps.length) activeMapId = maps[0].id;
    renderMapSelect();
    renderMapEditor();
    // BARU (9 Sep 2026) -- isi datalist nama kota SEKALI saja (data
    // statis, tidak berubah per peta) -- lihat js/indonesia-regencies.js.
    if (el("psIndonesiaCities") && typeof window !== "undefined" && Array.isArray(window.INDONESIA_REGENCIES)) {
      el("psIndonesiaCities").innerHTML = window.INDONESIA_REGENCIES.map((r) => `<option value="${escapeHtml(r.n)}"></option>`).join("");
    }

    if (el("psMapSelect")) {
      el("psMapSelect").addEventListener("change", () => {
        activeMapId = el("psMapSelect").value;
        renderMapEditor();
      });
    }
    if (el("psMapNewBtn")) {
      el("psMapNewBtn").addEventListener("click", () => {
        const name = prompt("Nama peta baru (mis. nama acara/venue):", "Peta Baru");
        if (!name || !name.trim()) return;
        const map = { id: "map_" + Date.now().toString(36), name: name.trim(), imageDataUrl: null, pins: [] };
        maps.unshift(map);
        activeMapId = map.id;
        saveMaps();
        renderMapSelect();
        renderMapEditor();
      });
    }
    if (el("psMapRenameBtn")) {
      el("psMapRenameBtn").addEventListener("click", () => {
        const map = activeMap();
        if (!map) return;
        const name = prompt("Nama baru:", map.name);
        if (!name || !name.trim()) return;
        map.name = name.trim();
        saveMaps();
        renderMapSelect();
      });
    }
    if (el("psMapDeleteBtn")) {
      el("psMapDeleteBtn").addEventListener("click", () => {
        const map = activeMap();
        if (!map) return;
        if (!confirm(`Hapus peta "${map.name}"? Semua pin di dalamnya ikut terhapus.`)) return;
        maps = maps.filter((m) => m.id !== map.id);
        activeMapId = maps.length ? maps[0].id : null;
        saveMaps();
        renderMapSelect();
        renderMapEditor();
      });
    }
    // BARU (10 Sep 2026, permintaan operator) -- 💾 Simpan/Muat Peta.
    // "⬇️ Unduh" mengekspor peta AKTIF (gambar dataURL + pins + kalibrasi
    // + cityRows + gaya) apa adanya jadi 1 file .json -- SENGAJA tidak
    // menghitung ulang apa pun, supaya isi file = isi peta di layar
    // persis, tidak mungkin "geser" gara-gara proses ekspor/impor.
    if (el("psMapExportBtn")) {
      el("psMapExportBtn").addEventListener("click", () => {
        const map = activeMap();
        const status = el("psMapExportImportStatus");
        if (!map) { if (status) status.textContent = "⚠️ Pilih/buat peta dulu sebelum diunduh."; return; }
        const payload = { fileType: "bible-app-studio-map", fileVersion: 1, exportedAt: new Date().toISOString(), map };
        const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        const safeName = (map.name || "peta").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "peta";
        a.download = `peta-${safeName}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        if (status) status.textContent = `✅ "${map.name}" diunduh (${(blob.size / 1024).toFixed(0)} KB) -- simpan filenya, bisa diunggah lagi ke perangkat mana pun.`;
      });
    }
    // "⬆️ Unggah" membaca file .json itu kembali, MENAMBAHKAN sebagai
    // peta BARU (bukan menimpa peta yang sedang aktif) supaya operator
    // tidak sengaja kehilangan peta yang sedang dikerjakan -- kalau mau
    // mengganti peta lama, hapus manual sendiri lewat "🗑️ Hapus Peta"
    // setelah memastikan hasil unggahan benar. id peta & id tiap pin
    // DIBUAT BARU (bukan dipakai ulang dari file) supaya tidak pernah
    // bentrok dengan peta yang sudah ada di perangkat ini, TAPI
    // xPct/yPct/label/category/dst tiap pin disalin APA ADANYA -- jadi
    // posisinya di gambar tidak berubah sedikit pun dari saat diunduh.
    if (el("psMapImportBtn") && el("psMapImportInput")) {
      el("psMapImportBtn").addEventListener("click", () => el("psMapImportInput").click());
      el("psMapImportInput").addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = ""; // supaya bisa unggah file yang SAMA lagi kalau perlu (mis. setelah dibatalkan)
        if (!file) return;
        const status = el("psMapExportImportStatus");
        const reader = new FileReader();
        reader.onerror = () => { if (status) status.textContent = "⚠️ Gagal membaca file."; };
        reader.onload = () => {
          let payload;
          try { payload = JSON.parse(reader.result); } catch (err) { if (status) status.textContent = "⚠️ File bukan .json peta yang valid."; return; }
          const src = payload && payload.map ? payload.map : payload; // BARU -- tetap terima file lama tanpa pembungkus {fileType,map}
          if (!src || typeof src !== "object" || !src.imageDataUrl) { if (status) status.textContent = "⚠️ File ini bukan hasil \"⬇️ Unduh Peta\" yang dikenali."; return; }
          const newMap = JSON.parse(JSON.stringify(src)); // salinan lepas, aman diubah tanpa menyentuh objek asal
          newMap.id = "map_" + Date.now().toString(36);
          newMap.name = (newMap.name || "Peta") + " (diunggah)";
          newMap.everShown = false; // peta hasil unggahan belum pernah ditayangkan DI PERANGKAT INI -- ikuti aturan auto-dorong gaya pin yang sama seperti peta baru lainnya
          (newMap.pins || []).forEach((p) => { p.id = p.id || ("pin_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7)); });
          maps.unshift(newMap);
          activeMapId = newMap.id;
          saveMaps();
          renderMapSelect();
          renderMapEditor();
          if (status) status.textContent = `✅ "${newMap.name}" berhasil dimuat -- ${(newMap.pins || []).length} pin ada di posisi yang sama seperti saat diunduh.`;
        };
        reader.readAsText(file);
      });
    }
    const mapDz = el("psMapImageDropzone");
    const mapInput = el("psMapImageInput");
    function handleMapImageFile(file) {
      if (!file) return;
      if (!/^image\//.test(file.type)) { alert("Pilih file gambar (jpg/png/webp)."); return; }
      if (file.size > 25 * 1024 * 1024) { alert(`${file.name}: melebihi 25MB.`); return; }
      let map = activeMap();
      if (!map) {
        map = { id: "map_" + Date.now().toString(36), name: file.name.replace(/\.[a-z0-9]+$/i, ""), imageDataUrl: null, pins: [] };
        maps.unshift(map);
        activeMapId = map.id;
      }
      const reader = new FileReader();
      reader.onload = () => {
        map.imageDataUrl = reader.result;
        saveMaps();
        renderMapSelect();
        renderMapEditor();
      };
      reader.readAsDataURL(file);
    }
    if (mapDz && mapInput) {
      mapDz.addEventListener("click", () => mapInput.click());
      mapDz.addEventListener("dragover", (e) => { e.preventDefault(); mapDz.classList.add("dragover"); });
      mapDz.addEventListener("dragleave", () => mapDz.classList.remove("dragover"));
      mapDz.addEventListener("drop", (e) => { e.preventDefault(); mapDz.classList.remove("dragover"); handleMapImageFile(e.dataTransfer.files && e.dataTransfer.files[0]); });
      mapInput.addEventListener("change", () => handleMapImageFile(mapInput.files && mapInput.files[0]));
    }
    // BARU (9 Sep 2026, permintaan operator) -- 🌐 Ambil Peta Dasar dari
    // Online: pengganti unggah manual, hasilnya jadi map.imageDataUrl
    // yang sama (lihat fetchOnlineBaseMap_() di atas). Varian gaya lama
    // (map.styleVariants) DIHAPUS karena gambar dasarnya berubah --
    // kalau tidak, operator bisa lihat gaya "Komik" versi peta yang
    // LAMA menempel di gambar yang BARU (bug halus tapi membingungkan).
    if (el("psMapOnlineFetchBtn")) {
      el("psMapOnlineFetchBtn").addEventListener("click", async () => {
        const btn = el("psMapOnlineFetchBtn");
        const statusEl = el("psMapOnlineFetchStatus");
        // BARU (10 Sep 2026) -- baca pilihan dropdown #psMapOnlineChoice
        // ("blank" | "named_islands") SEBELUM mulai mengambil, supaya
        // operator sudah menentukan peta yang mana yang mau dipakai.
        const choiceEl = el("psMapOnlineChoice");
        const choiceKey = choiceEl ? choiceEl.value : "blank";
        const choiceLabel = choiceKey === "named_islands" ? "peta + nama pulau" : choiceKey === "relief" ? "peta relief" : "peta polos";
        btn.disabled = true;
        if (statusEl) statusEl.textContent = `⏳ Mencari & mengunduh ${choiceLabel} dari Wikimedia Commons...`;
        try {
          const result = await fetchOnlineBaseMap_(choiceKey);
          let map = activeMap();
          if (!map) {
            map = { id: "map_" + Date.now().toString(36), name: "Indonesia (online)", imageDataUrl: null, pins: [] };
            maps.unshift(map);
            activeMapId = map.id;
          }
          map.imageDataUrl = result.dataUrl;
          map.mapStyle = "normal";
          map.styleVariants = {};
          saveMaps();
          renderMapSelect();
          renderMapEditor();
          if (el("psMapStyleSelect")) el("psMapStyleSelect").value = "normal";
          if (statusEl) statusEl.textContent = `✅ Berhasil ambil "${result.title}" (${choiceLabel}) dari Wikimedia Commons.`;
        } catch (err) {
          if (statusEl) statusEl.textContent = "⚠️ Gagal: " + (err && err.message ? err.message : "kesalahan tidak dikenal") + " -- coba lagi, atau unggah manual di atas.";
        } finally {
          btn.disabled = false;
        }
      });
    }
    // BARU (9 Sep 2026, permintaan operator) -- 🎨 Gaya Peta Dasar: ganti
    // dropdown -> proses (kalau belum ada di cache) lewat
    // generateMapStyleVariant_(), simpan ke map.styleVariants supaya
    // pindah gaya berikutnya instan. TIDAK auto-dorong ke Layar 2 --
    // operator tetap tekan "▶️ Tampilkan Peta"/"🎯 Fokus" seperti biasa
    // supaya tidak mengagetkan penonton saat operator baru coba-coba
    // gaya (sama seperti unggah gambar baru yang juga tidak auto-dorong).
    if (el("psMapStyleSelect")) {
      el("psMapStyleSelect").addEventListener("change", async (e) => {
        const map = activeMap();
        if (!map || !map.imageDataUrl) { alert("Unggah/ambil gambar peta dulu."); e.target.value = "normal"; return; }
        const style = e.target.value;
        map.mapStyle = style;
        const statusEl = el("psMapStyleStatus");
        if (style !== "normal" && (!map.styleVariants || !map.styleVariants[style])) {
          if (statusEl) statusEl.textContent = "⏳ Memproses gaya " + style + "...";
          try {
            const variant = await generateMapStyleVariant_(map.imageDataUrl, style);
            if (!map.styleVariants) map.styleVariants = {};
            map.styleVariants[style] = variant;
            if (statusEl) statusEl.textContent = "✅ Gaya diterapkan (tersimpan, bisa dipakai offline mulai sekarang).";
          } catch (err) {
            if (statusEl) statusEl.textContent = "⚠️ Gagal memproses gaya: " + (err && err.message ? err.message : "kesalahan tidak dikenal");
            map.mapStyle = "normal"; e.target.value = "normal";
          }
        } else if (statusEl) {
          statusEl.textContent = style === "normal" ? "" : "✅ Gaya sudah tersimpan sebelumnya (instan, offline).";
        }
        saveMaps();
        renderMapEditor();
      });
    }
    // BARU (9 Sep 2026, permintaan operator) -- 🎨 Gaya Pin: flat (lama)
    // atau 3D Berputar (.pin-3d, lihat css/style.css & present.html).
    // PERBAIKAN (10 Sep 2026, permintaan operator: "gambar titik peta di
    // Studio beda dengan di Layar 2") -- SEBELUMNYA disamakan dengan
    // "Gaya Peta Dasar" (sengaja TIDAK auto-dorong, karena gaya peta
    // perlu diproses/API dulu sebelum layak dikirim). Tapi "Gaya Pin"
    // beda kasus: cuma ganti class CSS, instan, tidak ada proses berat
    // apa pun -- jadi TIDAK ada alasan menahannya manual. SEKARANG auto-
    // dorong ke Layar 2 langsung begitu diganti -- TAPI HANYA kalau peta
    // ini SUDAH PERNAH ditayangkan sebelumnya (map.everShown, ditandai
    // oleh psMapShowBtn/psMapUnfocusBtn/tombol "🎯 Fokus"/item "🗺️ Peta"
    // di Kumpulan Ayat) -- supaya peta yang MASIH DIEDIT & BELUM PERNAH
    // ditayangkan (mis. baru diunggah, belum siap) TIDAK tiba-tiba
    // muncul ke jemaat cuma gara-gara operator lagi coba-coba gaya pin.
    if (el("psMapPinStyleSelect")) {
      el("psMapPinStyleSelect").addEventListener("change", (e) => {
        const map = activeMap();
        if (!map) return;
        map.pinStyle = e.target.value;
        saveMaps();
        renderMapEditor();
        if (map.everShown && map.imageDataUrl) {
          const pins = visiblePins(map);
          const categoryCounts = {};
          pins.forEach((p) => { if (p.category) categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1; });
          rawPost({ type: "map", action: "show", imageUrl: effectiveMapImage_(map), pinStyle: map.pinStyle || "flat", pins, categoryCounts, nationalPopulation: map.nationalPopulation || null });
        }
      });
    }
    // Klik di atas gambar peta = tambah pin BARU di titik itu (persen
    // relatif terhadap ukuran gambar, supaya tetap pas walau Layar 2
    // beda resolusi/rasio dari pratinjau Studio ini) -- KECUALI sedang
    // dalam mode "🎯 Tandai" kalibrasi (calibArmed), yang menaruh titik
    // acuan BUKAN pin biasa (lihat catatan panjang latLngToPct() di atas).
    if (el("psMapEditorImg")) {
      el("psMapEditorImg").addEventListener("click", (e) => {
        const map = activeMap();
        if (!map) return;
        // PERBAIKAN (10 Sep 2026) -- xPct/yPct SEKARANG dihitung relatif
        // ke kotak gambar yang BENAR-BENAR terlihat (mapEditorImgContainRect_(),
        // bukan seluruh kotak 16:9 termasuk letterbox) -- rumus SAMA
        // PERSIS dengan positionMapContent_()/renderMapPins_() di
        // present.html, supaya titik yang diklik di sini pasti jatuh di
        // titik yang SAMA PERSIS saat ditayangkan ke Layar 2.
        const cr = mapEditorImgContainRect_(e.currentTarget);
        if (!cr.width || !cr.height) return;
        const xPct = ((e.clientX - cr.left) / cr.width) * 100;
        const yPct = ((e.clientY - cr.top) / cr.height) * 100;
        if (xPct < 0 || xPct > 100 || yPct < 0 || yPct > 100) return; // klik di area kosong (letterbox) di luar gambar -- abaikan
        if (calibArmed) {
          const cityInputId = calibArmed === 1 ? "psMapCalib1City" : "psMapCalib2City";
          const cityName = (el(cityInputId) && el(cityInputId).value.trim()) || "";
          const reg = findRegencyByName(cityName);
          if (!reg) { alert(`Kota "${cityName}" tidak ditemukan di daftar. Coba nama lain (mis. tambahkan "Kota"/"Kabupaten" di depannya).`); return; }
          map.calibration = map.calibration || {};
          map.calibration["p" + calibArmed] = { name: reg.n, lat: reg.lat, lng: reg.lng, xPct, yPct };
          calibArmed = null;
          saveMaps();
          renderMapEditor();
          return;
        }
        const label = prompt("Nama titik ini (mis. \"Gazebo Musa\", \"Toilet\", \"Pintu Masuk\"):", "");
        if (label === null) return; // dibatalkan
        map.pins = map.pins || [];
        map.pins.push({ id: "pin_" + Date.now().toString(36), label: label.trim() || ("Titik " + (map.pins.length + 1)), xPct, yPct });
        saveMaps();
        renderMapEditor();
      });
    }
    // BARU (9 Sep 2026) -- tombol "🎯 Tandai" kalibrasi: mempersenjatai
    // calibArmed, operator lanjut klik di gambar (listener di atas).
    if (el("psMapCalib1Btn")) {
      el("psMapCalib1Btn").addEventListener("click", () => {
        if (!el("psMapCalib1City") || !el("psMapCalib1City").value.trim()) { alert("Ketik nama kota acuan #1 dulu."); return; }
        calibArmed = 1;
        renderCalibStatus();
      });
    }
    if (el("psMapCalib2Btn")) {
      el("psMapCalib2Btn").addEventListener("click", () => {
        if (!el("psMapCalib2City") || !el("psMapCalib2City").value.trim()) { alert("Ketik nama kota acuan #2 dulu."); return; }
        calibArmed = 2;
        renderCalibStatus();
      });
    }
    // BARU (9 Sep 2026) -- 📋 Daftar Titik dari Tabel.
    if (el("psMapCityRowAddBtn")) {
      el("psMapCityRowAddBtn").addEventListener("click", () => {
        const map = activeMap();
        if (!map) { alert("Buat/pilih peta dulu."); return; }
        map.cityRows = map.cityRows || [];
        map.cityRows.push({ city: "", category: "", year: "" });
        saveMaps();
        renderCityRows();
      });
    }
    if (el("psMapCityRowApplyBtn")) {
      el("psMapCityRowApplyBtn").addEventListener("click", () => {
        const map = activeMap();
        if (!map) return;
        if (!map.calibration || !map.calibration.p1 || !map.calibration.p2) {
          alert("Kalibrasi peta dulu (2 titik acuan) sebelum menerapkan daftar tabel.");
          return;
        }
        const rows = map.cityRows || [];
        let applied = 0;
        const notFound = [];
        map.pins = map.pins || [];
        rows.forEach((row) => {
          const cityName = (row.city || "").trim();
          const category = (row.category || "").trim();
          if (!cityName || !category) return; // baris belum lengkap -- dilewati, bukan gagal semua
          const reg = findRegencyByName(cityName);
          if (!reg) { notFound.push(cityName); return; }
          const pos = latLngToPct(map, reg.lat, reg.lng);
          if (!pos) return;
          // BARU -- id STABIL dari kota+kategori supaya "🧮 Terapkan ke
          // Peta" yang ditekan ULANG (mis. setelah edit tahun) MEMPERBARUI
          // pin yang sama, bukan menduplikasi.
          // PERBAIKAN (10 Sep 2026, permintaan operator: "pin tidak bisa
          // dihapus"/pin dobel di titik yang sama) -- id SEBELUMNYA
          // dibuat dari TEKS MENTAH yang diketik operator (cityName,
          // row.city) -- kalau kota yang SAMA diketik beda-beda di 2
          // baris tabel (mis. "Surabaya" di satu baris & "Kota Surabaya"
          // di baris lain, keduanya cocok ke regency yang sama lewat
          // findRegencyByName()), akan lahir 2 id BERBEDA yang menaruh 2
          // pin bertumpuk PERSIS di titik yang sama -- kelihatannya "satu
          // pin tidak bisa dihapus" padahal yang terhapus cuma pin paling
          // atas, sisanya (dari baris lain) tetap ada di bawahnya.
          // SEKARANG id dibuat dari NAMA RESMI HASIL PENCARIAN (reg.n),
          // bukan teks mentahnya -- kota yang sama, seberapa pun beda
          // cara mengetiknya, selalu berakhir di id (dan pin) yang SAMA.
          const pinId = "city_" + reg.n.toLowerCase().replace(/[^a-z0-9]+/g, "_") + "_" + category.toLowerCase().replace(/[^a-z0-9]+/g, "_");
          const existing = map.pins.find((p) => p.id === pinId);
          const pinData = { id: pinId, label: reg.n, category, year: row.year || "", xPct: pos.xPct, yPct: pos.yPct };
          if (existing) Object.assign(existing, pinData); else map.pins.push(pinData);
          applied++;
        });
        // PERBAIKAN (10 Sep 2026) -- bersihkan pin DUPLIKAT LAMA yang
        // sempat kebuat dari skema id lama (teks mentah, lihat catatan
        // panjang di atas) -- kota+kategori yang SAMA (label & category
        // sama persis, keduanya sudah nama resmi/reg.n) disisakan HANYA
        // pin yang id-nya sesuai skema BARU (city_<nama resmi>_<kategori>);
        // duplikatnya (id skema lama) dibuang otomatis di sini supaya
        // operator tidak perlu hapus manual satu-satu.
        const seenCatLabel = new Set();
        map.pins = map.pins.filter((p) => {
          if (!p.category) return true; // pin manual, tidak terkait fitur tabel ini, biarkan
          const key = p.category.toLowerCase() + "|" + (p.label || "").toLowerCase();
          const expectedId = "city_" + String(p.label || "").toLowerCase().replace(/[^a-z0-9]+/g, "_") + "_" + p.category.toLowerCase().replace(/[^a-z0-9]+/g, "_");
          if (seenCatLabel.has(key)) return p.id === expectedId; // sudah ada satu -- simpan cuma kalau ini yang skema BARU
          seenCatLabel.add(key);
          return true;
        });
        saveMaps();
        renderMapEditor();
        const status = el("psMapCityRowStatus");
        if (status) {
          status.textContent = notFound.length
            ? `✅ ${applied} titik diterapkan. ⚠️ Tidak ditemukan: ${notFound.join(", ")}.`
            : `✅ ${applied} titik diterapkan ke peta.`;
        }
      });
    }
    // BARU (10 Sep 2026, permintaan operator "isi 514 kabupaten lewat
    // excel") -- ⬇️ Unduh Template Excel: CSV berisi header + SEMUA 514
    // nama kabupaten/kota dari window.INDONESIA_REGENCIES (js/indonesia-
    // regencies.js), kolom Kategori & Tahun dikosongkan supaya operator
    // tinggal isi kolom Kategori di Excel untuk kota yang relevan (baris
    // lain dibiarkan kosong, nanti dilewati saat diunggah kembali -- lihat
    // handleCityRowsUpload_() di bawah). BOM "\uFEFF" di depan supaya
    // Excel Windows langsung baca huruf non-ASCII dengan benar (pola sama
    // seperti saveLangCheckAsCsv() di js/langcheck.js).
    function downloadCityRowsTemplate_() {
      const regencies = (typeof window !== "undefined" && Array.isArray(window.INDONESIA_REGENCIES)) ? window.INDONESIA_REGENCIES : [];
      if (!regencies.length) { alert("Data 514 kabupaten/kota belum termuat (js/indonesia-regencies.js)."); return; }
      const escCsv = (v) => {
        const s = String(v == null ? "" : v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      };
      const lines = ["Kota/Kabupaten,Kategori,Tahun"].concat(
        regencies.map((r) => [r.n, "", ""].map(escCsv).join(","))
      );
      const csv = lines.join("\r\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "template-titik-peta-514-kabupaten.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
    if (el("psMapCityRowDownloadBtn")) {
      el("psMapCityRowDownloadBtn").addEventListener("click", downloadCityRowsTemplate_);
    }
    // BARU (10 Sep 2026) -- ⬆️ Unggah dari Excel/CSV: baca file lewat
    // parseCSV() (js/csv.js, sudah dipakai fitur lain di app ini, otomatis
    // kenali pemisah koma/titik-koma/tab), cocokkan header fleksibel
    // (baris pertama dilewati KALAU kolom pertamanya "Kota/Kabupaten" --
    // supaya file yang diunduh dari template di atas maupun file yang
    // operator buat sendiri tanpa header tetap terbaca), lalu baris yang
    // kolom Kategori-nya KOSONG dilewati (bukan error) -- itu memang
    // desainnya: operator cuma isi baris yang relevan di Excel, sisanya
    // dibiarkan kosong. MENGGANTI SELURUH map.cityRows (bukan menambah)
    // supaya tidak ada duplikat kalau operator unggah ulang file yang
    // sama setelah edit -- makanya diberi konfirmasi dulu.
    function handleCityRowsUpload_(file) {
      if (!file) return;
      const map = activeMap();
      if (!map) { alert("Buat/pilih peta dulu."); return; }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof parseCSV !== "function") { alert("Fitur pembaca CSV (js/csv.js) belum termuat."); return; }
        let records;
        try {
          records = parseCSV(String(reader.result || ""));
        } catch (e) {
          alert("Gagal membaca file: " + (e && e.message ? e.message : "format tidak dikenali"));
          return;
        }
        if (!Array.isArray(records) || !records.length) { alert("File kosong atau tidak terbaca."); return; }
        let rows = records;
        const firstCell = (rows[0] && rows[0][0] || "").trim().toLowerCase();
        if (firstCell === "kota/kabupaten" || firstCell === "kota" || firstCell === "kabupaten") rows = rows.slice(1);
        const newRows = [];
        let skippedEmpty = 0;
        rows.forEach((r) => {
          const city = (r[0] || "").trim();
          const category = (r[1] || "").trim();
          const year = (r[2] || "").trim();
          if (!city) return;
          if (!category) { skippedEmpty++; return; } // belum diisi di Excel -- dilewati, bukan gagal
          newRows.push({ city, category, year: year ? Number(year) || "" : "" });
        });
        if (!newRows.length) {
          alert("Tidak ada baris dengan Kategori terisi di file ini. Isi kolom \"Kategori\" dulu di Excel untuk kota yang mau dipakai.");
          return;
        }
        const existingCount = (map.cityRows || []).length;
        const msg = existingCount
          ? `Ganti ${existingCount} baris tabel saat ini dengan ${newRows.length} baris dari file? (${skippedEmpty} baris lain di file dilewati karena Kategori kosong)`
          : `Tambahkan ${newRows.length} baris dari file? (${skippedEmpty} baris lain di file dilewati karena Kategori kosong)`;
        if (!confirm(msg)) return;
        map.cityRows = newRows;
        saveMaps();
        renderCityRows();
        const status = el("psMapCityRowStatus");
        if (status) status.textContent = `✅ ${newRows.length} baris dimuat dari file. Tekan "🧮 Terapkan ke Peta" untuk menaruh pin-nya.`;
      };
      reader.onerror = () => alert("Gagal membaca file.");
      reader.readAsText(file, "UTF-8");
    }
    if (el("psMapCityRowUploadBtn") && el("psMapCityRowUploadInput")) {
      el("psMapCityRowUploadBtn").addEventListener("click", () => el("psMapCityRowUploadInput").click());
      el("psMapCityRowUploadInput").addEventListener("change", () => {
        const input = el("psMapCityRowUploadInput");
        handleCityRowsUpload_(input.files && input.files[0]);
        input.value = ""; // supaya bisa unggah file yang SAMA lagi kalau operator perbaiki isinya
      });
    }
    // BARU (9 Sep 2026, permintaan operator) -- 🔍 Zoom Peta interaktif.
    // Slider kirim {type:"map", action:"zoom", scale} tiap digeser (input
    // event, bukan cuma "change", supaya terasa langsung/live saat
    // ditayangkan). Tombol ➖/➕ = langkah 25% per klik, ikut menggerakkan
    // posisi slider supaya operator tahu persis angka zoom saat ini.
    function sendMapZoom(pct) {
      const scale = pct / 100;
      rawPost({ type: "map", action: "zoom", scale });
      if (el("psMapZoomValue")) el("psMapZoomValue").value = pct;
    }
    if (el("psMapZoomSlider")) {
      el("psMapZoomSlider").addEventListener("input", () => {
        sendMapZoom(Number(el("psMapZoomSlider").value));
      });
      wireManualValueInput("psMapZoomValue", "psMapZoomSlider");
    }
    if (el("psMapZoomOutBtn")) {
      el("psMapZoomOutBtn").addEventListener("click", () => {
        const slider = el("psMapZoomSlider");
        if (!slider) return;
        slider.value = Math.max(100, Number(slider.value) - 25);
        sendMapZoom(Number(slider.value));
      });
    }
    if (el("psMapZoomInBtn")) {
      el("psMapZoomInBtn").addEventListener("click", () => {
        const slider = el("psMapZoomSlider");
        if (!slider) return;
        slider.value = Math.min(600, Number(slider.value) + 25);
        sendMapZoom(Number(slider.value));
      });
    }
    // Kecilkan helper -- dipakai psMapShowBtn/psMapUnfocusBtn di bawah
    // supaya slider zoom selalu balik ke "100%" saat operator kembali ke
    // peta penuh (biar tidak membingungkan -- slider yang nyasar di 300%
    // padahal peta sudah di-reset ke penuh).
    function resetMapZoomSlider() {
      if (el("psMapZoomSlider")) el("psMapZoomSlider").value = 100;
      if (el("psMapZoomValue")) el("psMapZoomValue").value = "100";
    }
    if (el("psMapShowBtn")) {
      el("psMapShowBtn").addEventListener("click", () => {
        const map = activeMap();
        if (!map || !map.imageDataUrl) { alert("Unggah gambar peta dulu."); return; }
        const pins = visiblePins(map);
        // BARU (9 Sep 2026) -- hitungan per kategori yang SEDANG tampil,
        // dikirim sebagai categoryCounts supaya Layar 2 bisa menunjukkan
        // badge "Kaki Dian: 12  Pos Injil: 8" ke penonton (lihat
        // showMap()/present.html).
        const categoryCounts = {};
        pins.forEach((p) => { if (p.category) categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1; });
        rawPost({ type: "map", action: "show", imageUrl: effectiveMapImage_(map), pinStyle: map.pinStyle || "flat", pins, categoryCounts, nationalPopulation: map.nationalPopulation || null });
        map.everShown = true; // lihat catatan panjang di listener psMapPinStyleSelect di atas
        resetMapZoomSlider();
      });
    }
    // BARU (9 Sep 2026, permintaan operator) -- lawan dari "🎯 Fokus":
    // balikin Layar 2 dari mode zoom ke peta PENUH lagi (semua pin yang
    // sedang aktif tetap tampil, legenda tetap tampil), TANPA menutup
    // peta seperti "⏹ Hentikan". Sama persis payload-nya dengan
    // psMapShowBtn di atas (showMap() di present.html mereset transform
    // ke scale 1 setiap dipanggil), cuma tombolnya diletakkan berdekatan
    // dengan "🎯 Fokus" di daftar Pin supaya gampang ditemukan operator
    // saat live.
    if (el("psMapUnfocusBtn")) {
      el("psMapUnfocusBtn").addEventListener("click", () => {
        const map = activeMap();
        if (!map || !map.imageDataUrl) return;
        const pins = visiblePins(map);
        const categoryCounts = {};
        pins.forEach((p) => { if (p.category) categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1; });
        rawPost({ type: "map", action: "show", imageUrl: effectiveMapImage_(map), pinStyle: map.pinStyle || "flat", pins, categoryCounts, nationalPopulation: map.nationalPopulation || null });
        map.everShown = true; // lihat catatan panjang di listener psMapPinStyleSelect di atas
        resetMapZoomSlider();
      });
    }
    if (el("psMapStopBtn")) {
      el("psMapStopBtn").addEventListener("click", () => {
        rawPost({ type: "map", action: "stop" });
        // Reset everShown supaya kalau operator ganti "Gaya Pin" SETELAH
        // menghentikan peta (tapi SEBELUM menekan "Tampilkan" lagi),
        // perubahan gaya TIDAK auto-membuka lagi petanya ke Layar 2 --
        // lihat catatan panjang di listener psMapPinStyleSelect di atas.
        const map = activeMap();
        if (map) map.everShown = false;
      });
    }
    // BARU (9 Sep 2026) -- selipkan REFERENSI peta aktif ke Kumpulan
    // Ayat (lihat catatan addMapToCollection(), js/collections.js).
    if (el("psMapSaveBtn")) {
      el("psMapSaveBtn").addEventListener("click", async () => {
        const map = activeMap();
        if (!map || !map.imageDataUrl) { alert("Unggah gambar peta dulu."); return; }
        if (typeof promptCollectionName !== "function" || typeof addMapToCollection !== "function") return;
        const name = await promptCollectionName();
        if (!name) return;
        const username = typeof currentUser !== "undefined" ? currentUser : null;
        addMapToCollection(username, name, { mapId: map.id, mapName: map.name });
        if (typeof renderCollectionSelect === "function") renderCollectionSelect();
        if (el("psMapSaveStatus")) {
          el("psMapSaveStatus").textContent = `✅ Tersimpan ke kumpulan "${name}".`;
          setTimeout(() => { if (el("psMapSaveStatus")) el("psMapSaveStatus").textContent = ""; }, 4000);
        }
      });
    }

    // BARU (9 Sep 2026, permintaan operator) -- 🌏 Total Penduduk
    // Indonesia (Nasional): toggle tampil/sembunyi LIVE (tidak mereset
    // zoom/pin yang sedang tayang, lihat pushNatPopLive_() di atas).
    if (el("psMapNatPopVisible")) {
      el("psMapNatPopVisible").addEventListener("change", (e) => {
        const map = activeMap();
        if (!map) return;
        if (!map.nationalPopulation) map.nationalPopulation = { value: null, year: "", source: "", sourceUrl: "", visible: false };
        map.nationalPopulation.visible = !!e.target.checked;
        saveMaps();
        pushNatPopLive_();
      });
    }
    // BARU (9 Sep 2026) -- 🔄 Perbarui Otomatis: ambil angka penduduk
    // Indonesia terbaru dari Wikidata (lihat fetchNationalPopulationAuto_()
    // di atas untuk catatan sumber & batasannya), lalu simpan ke peta
    // aktif & langsung dorong ke Layar 2 kalau togglenya sedang nyala.
    if (el("psMapNatPopAutoBtn")) {
      el("psMapNatPopAutoBtn").addEventListener("click", async () => {
        const map = activeMap();
        if (!map) { alert("Pilih/buat peta dulu."); return; }
        const btn = el("psMapNatPopAutoBtn");
        const statusEl = el("psMapNatPopStatus");
        const prevLabel = btn.textContent;
        btn.disabled = true;
        btn.textContent = "⏳ Mencari...";
        try {
          const result = await fetchNationalPopulationAuto_();
          const wasVisible = map.nationalPopulation ? !!map.nationalPopulation.visible : true;
          map.nationalPopulation = {
            value: result.value, year: result.year, source: result.source, sourceUrl: result.sourceUrl,
            updatedAt: new Date().toISOString(), visible: wasVisible,
          };
          saveMaps();
          renderNatPopStatus();
          pushNatPopLive_();
        } catch (err) {
          if (statusEl) statusEl.textContent = "❌ Gagal mengambil data otomatis: " + (err && err.message ? err.message : String(err)) + " -- coba lagi atau isi manual di bawah.";
        } finally {
          btn.disabled = false;
          btn.textContent = prevLabel;
        }
      });
    }
    // BARU (9 Sep 2026, permintaan operator) -- 🔄 Perbarui Semua
    // Populasi/Luas (Wikidata): loop semua pin yang SEDANG TAMPIL (pin
    // manual + pin berkategori yang kategorinya dicentang -- sama seperti
    // visiblePins()), panggil fetchCityDataAuto_() SATU-SATU dengan jeda
    // singkat antar-panggilan (bukan sekaligus paralel) supaya sopan ke
    // server Wikidata & tidak kena rate-limit yang bikin semuanya gagal.
    // Bisa makan waktu lumayan lama kalau pin-nya ratusan (mis. 500 pin x
    // ~0.4 detik jeda = ±3-4 menit, belum termasuk waktu jaringan) --
    // status berjalan ditulis life di bawah tombol supaya operator tahu
    // ini masih bekerja, bukan macet.
    function sleep_(ms) { return new Promise((r) => setTimeout(r, ms)); }
    if (el("psMapBulkAutoBtn")) {
      el("psMapBulkAutoBtn").addEventListener("click", async () => {
        const map = activeMap();
        if (!map) { alert("Pilih/buat peta dulu."); return; }
        const btn = el("psMapBulkAutoBtn");
        const statusEl = el("psMapBulkAutoStatus");
        const pins = visiblePins(map);
        if (!pins.length) { if (statusEl) statusEl.textContent = "⚠️ Tidak ada pin yang sedang tampil (centang kategori dulu, atau tambah pin)."; return; }
        if (!confirm(`Ambil ulang penduduk & luas ${pins.length} kota dari Wikidata sekarang? Bisa makan waktu beberapa menit untuk jumlah besar.`)) return;
        btn.disabled = true;
        let ok = 0, fail = 0;
        for (let i = 0; i < pins.length; i++) {
          const pin = pins[i];
          if (statusEl) statusEl.textContent = `⏳ (${i + 1}/${pins.length}) ${pin.label || ""}…  ✅${ok} ⚠️${fail}`;
          try {
            const data = await fetchCityDataAuto_(pin.label || "");
            if (data.population && data.population.value) {
              pin.population = Math.round(data.population.value);
              pin.populationYear = data.population.year || "";
              pin.populationSource = data.population.source;
            }
            if (data.area && data.area.value) {
              pin.areaKm2 = data.area.value;
              pin.areaSource = data.area.source;
            }
            ok++;
          } catch (e) {
            fail++;
          }
          saveMaps();
          await sleep_(400); // jeda sopan antar-panggilan ke Wikidata
        }
        if (statusEl) statusEl.textContent = `✅ Selesai: ${ok} kota terisi, ${fail} gagal/tidak ditemukan (dari ${pins.length}). Cek daftar Pin di atas untuk detailnya.`;
        btn.disabled = false;
        renderMapEditor();
      });
    }
    // BARU (9 Sep 2026) -- 💾 Simpan Manual: cadangan kalau "Perbarui
    // Otomatis" gagal (offline/CORS/dsb), atau operator memang mau
    // memakai angka dari sumber lain (mis. BPS langsung).
    if (el("psMapNatPopManualSaveBtn")) {
      el("psMapNatPopManualSaveBtn").addEventListener("click", () => {
        const map = activeMap();
        if (!map) { alert("Pilih/buat peta dulu."); return; }
        const valueInp = el("psMapNatPopManualValue");
        const yearInp = el("psMapNatPopManualYear");
        const sourceInp = el("psMapNatPopManualSource");
        const value = valueInp && valueInp.value ? Math.round(Number(valueInp.value)) : null;
        if (!value) { alert("Isi jumlah penduduk dulu (angka)."); return; }
        const wasVisible = map.nationalPopulation ? !!map.nationalPopulation.visible : true;
        map.nationalPopulation = {
          value, year: (yearInp && yearInp.value) || "", source: (sourceInp && sourceInp.value) || "(manual)",
          sourceUrl: "", updatedAt: new Date().toISOString(), visible: wasVisible,
        };
        saveMaps();
        renderNatPopStatus();
        pushNatPopLive_();
        if (valueInp) valueInp.value = "";
        if (yearInp) yearInp.value = "";
        if (sourceInp) sourceInp.value = "";
      });
    }
  }

  function wireLocalVideoTab() {
    const LV_DB_NAME = "bibleAppLocalVideoFolder_v1";
    const LV_STORE = "handles";
    const LV_KEY = "folder";
    let lvFiles = []; // { name, kind: "handle"|"raw", fileHandle?, file? } -- daftar video yang sedang dikenal
    let lvNowPlayingName = "";

    function openLvHandleDb_() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(LV_DB_NAME, 1);
        req.onupgradeneeded = () => { req.result.createObjectStore(LV_STORE); };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    async function saveLvFolderHandle_(handle) {
      try {
        const db = await openLvHandleDb_();
        await new Promise((resolve, reject) => {
          const tx = db.transaction(LV_STORE, "readwrite");
          tx.objectStore(LV_STORE).put(handle, LV_KEY);
          tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
        });
      } catch (e) { /* IndexedDB tidak mendukung simpan handle (browser lama) -- diam-diam lewati, folder cukup diulang manual tiap sesi */ }
    }
    async function loadLvFolderHandle_() {
      try {
        const db = await openLvHandleDb_();
        return await new Promise((resolve) => {
          const tx = db.transaction(LV_STORE, "readonly");
          const req = tx.objectStore(LV_STORE).get(LV_KEY);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
      } catch (e) { return null; }
    }

    function fmtBytes_(n) {
      if (!n && n !== 0) return "";
      const units = ["B", "KB", "MB", "GB"];
      let i = 0, v = n;
      while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
      return v.toFixed(v >= 10 || i === 0 ? 0 : 1) + " " + units[i];
    }

    function setFolderStatus_(text) { if (el("psLvFolderStatus")) el("psLvFolderStatus").textContent = text; }
    function setNowPlaying_(name) {
      lvNowPlayingName = name || "";
      if (el("psLvNowPlaying")) el("psLvNowPlaying").textContent = name ? `🎬 ${name}` : "Belum ada video lokal yang tayang.";
    }

    async function refreshFolderList_(handle) {
      lvFiles = [];
      try {
        for await (const [name, entry] of handle.entries()) {
          if (entry.kind !== "file") continue;
          if (!/\.(mp4|webm|mov|m4v)$/i.test(name)) continue;
          lvFiles.push({ name, kind: "handle", fileHandle: entry });
        }
      } catch (e) {
        setFolderStatus_("⚠️ Gagal membaca folder (izin mungkin dicabut) -- coba \"📂 Hubungkan Folder Video\" lagi.");
        return;
      }
      lvFiles.sort((a, b) => a.name.localeCompare(b.name, "id"));
      renderLvList_();
    }

    async function connectFolder_(promptIfNeeded) {
      if (!window.showDirectoryPicker) {
        setFolderStatus_("⚠️ Browser ini tidak mendukung \"Hubungkan Folder\" (fitur khusus Chrome/Edge terbaru di komputer). Pakai \"➕ Pilih File Video\" sebagai gantinya.");
        return;
      }
      try {
        const handle = await window.showDirectoryPicker({ id: "psLocalVideoFolder", mode: "read" });
        await saveLvFolderHandle_(handle);
        setFolderStatus_(`📂 Terhubung ke folder "${handle.name}" -- daftar video di bawah otomatis mengikuti isi folder ini.`);
        await refreshFolderList_(handle);
      } catch (e) {
        if (e && e.name === "AbortError") return; // operator membatalkan dialog, tidak perlu pesan error
        setFolderStatus_("⚠️ Gagal menghubungkan folder: " + (e && e.message ? e.message : e));
      }
    }

    // Dipanggil SEKALI saat Studio dibuka -- coba pakai lagi folder yang
    // pernah dihubungkan sebelumnya (kalau ada & izinnya masih berlaku)
    // TANPA menampilkan dialog folder lagi, supaya operator tidak perlu
    // pilih ulang tiap buka Studio (lihat catatan panjang di atas fungsi
    // ini untuk kenapa ini dianggap "diingat", bukan "path" mentah).
    async function tryAutoReconnect_() {
      const handle = await loadLvFolderHandle_();
      if (!handle) return;
      try {
        let perm = await handle.queryPermission({ mode: "read" });
        if (perm !== "granted") perm = await handle.requestPermission({ mode: "read" });
        if (perm !== "granted") {
          setFolderStatus_(`📂 Folder "${handle.name}" pernah terhubung, tapi izinnya perlu dikonfirmasi ulang -- tekan "📂 Hubungkan Folder Video" untuk mengizinkan lagi.`);
          return;
        }
        setFolderStatus_(`📂 Terhubung ke folder "${handle.name}" (diingat dari sesi sebelumnya) -- daftar video di bawah otomatis mengikuti isi folder ini.`);
        await refreshFolderList_(handle);
      } catch (e) { /* handle rusak/tidak valid lagi -- diam-diam biarkan, operator tinggal hubungkan ulang manual */ }
    }

    function renderLvList_() {
      const box = el("psLvList");
      if (!box) return;
      const q = ((el("psLvSearch") && el("psLvSearch").value) || "").trim().toLowerCase();
      const filtered = q ? lvFiles.filter((f) => f.name.toLowerCase().includes(q)) : lvFiles;
      if (!filtered.length) {
        box.innerHTML = `<p class="present-saved-empty">${lvFiles.length ? "Tidak ada video yang cocok dicari." : "Belum ada video -- hubungkan folder atau pilih file di atas."}</p>`;
        return;
      }
      box.innerHTML = "";
      filtered.forEach((f) => {
        const row = document.createElement("div");
        row.className = "ps-file-row";
        row.innerHTML = `
          <span class="ps-file-name" title="${escapeHtml(f.name)}">🎬 ${escapeHtml(f.name)}</span>
          <span class="ps-file-actions">
            <button type="button" class="chip-btn small" data-lv-act="show">▶️ Tampilkan</button>
          </span>`;
        row.querySelector('[data-lv-act="show"]').addEventListener("click", async () => {
          const file = f.kind === "handle" ? await f.fileHandle.getFile() : f.file;
          if (!file) return;
          rawPost({ type: "localvideo", action: "play", blob: file, name: f.name });
          renderStudioPreview({ type: "localvideo", name: f.name });
          setNowPlaying_(f.name);
        });
        box.appendChild(row);
      });
    }

    if (el("psLvConnectFolderBtn")) el("psLvConnectFolderBtn").addEventListener("click", () => connectFolder_(true));
    if (el("psLvPickFilesBtn")) el("psLvPickFilesBtn").addEventListener("click", () => { if (el("psLvFileInput")) el("psLvFileInput").click(); });
    if (el("psLvFileInput")) {
      el("psLvFileInput").addEventListener("change", (e) => {
        const picked = Array.from(e.target.files || []).filter((f) => /\.(mp4|webm|mov|m4v)$/i.test(f.name) || f.type.startsWith("video/"));
        if (!picked.length) return;
        // File yang dipilih manual DITAMBAHKAN ke daftar (bukan mengganti
        // isi folder yang mungkin sudah terhubung), supaya keduanya bisa
        // dipakai bersamaan kalau operator mau.
        picked.forEach((file) => {
          const existingIdx = lvFiles.findIndex((f) => f.kind === "raw" && f.name === file.name);
          if (existingIdx !== -1) lvFiles[existingIdx] = { name: file.name, kind: "raw", file };
          else lvFiles.push({ name: file.name, kind: "raw", file });
        });
        lvFiles.sort((a, b) => a.name.localeCompare(b.name, "id"));
        renderLvList_();
        e.target.value = ""; // supaya file yang SAMA bisa dipilih lagi lain kali kalau perlu
      });
    }
    if (el("psLvSearch")) el("psLvSearch").addEventListener("input", renderLvList_);
    if (el("psLvPlayBtn")) el("psLvPlayBtn").addEventListener("click", () => rawPost({ type: "localvideo_control", action: "play" }));
    if (el("psLvPauseBtn")) el("psLvPauseBtn").addEventListener("click", () => rawPost({ type: "localvideo_control", action: "pause" }));
    if (el("psLvStopBtn")) el("psLvStopBtn").addEventListener("click", () => { rawPost({ type: "localvideo", action: "stop" }); setNowPlaying_(""); });
    let lvMuted_ = false;
    if (el("psLvMuteBtn")) el("psLvMuteBtn").addEventListener("click", () => {
      lvMuted_ = !lvMuted_;
      rawPost({ type: "localvideo_control", action: lvMuted_ ? "mute" : "unmute" });
      el("psLvMuteBtn").textContent = lvMuted_ ? "🔊 Bunyikan" : "🔇 Mute";
      el("psLvMuteBtn").classList.toggle("active", lvMuted_);
    });

    tryAutoReconnect_(); // coba sambung ulang folder yang pernah dipakai, TANPA dialog (lihat catatan panjang di atas)
  }

  // ------------------------------------------------------------
  // Kanan: Aksi Cepat, Warta, FootNote, Penunjuk & Pen, Tema
  // ------------------------------------------------------------
  function wireQuickActions() {
    if (el("psActBlack")) el("psActBlack").addEventListener("click", () => { rawPost({ type: "black" }); renderStudioPreview({ type: "black" }); });
    if (el("psActBlank")) el("psActBlank").addEventListener("click", () => {
      // Beda dari "Kosongkan": SELALU latar tema polos tanpa teks,
      // apa pun pesan default yang diatur untuk "Kosongkan" (lihat
      // BLANK_MSG_KEY di js/settings.js) -- tombol cepat terpisah
      // supaya operator tidak perlu ganti pengaturan dulu.
      post({ type: "clear" });
    });
    if (el("psActLogo")) el("psActLogo").addEventListener("click", () => {
      let url = localStorage.getItem(LOGO_KEY) || "";
      const entered = prompt("Link gambar logo (JPG/PNG):", url);
      if (entered === null) return;
      url = entered.trim();
      localStorage.setItem(LOGO_KEY, url);
      if (url) { rawPost({ type: "logo", logoUrl: url }); renderStudioPreview({ type: "logo" }); }
    });
    if (el("psActClear")) el("psActClear").addEventListener("click", () => {
      const blank = localStorage.getItem(BLANK_MSG_KEY) || "";
      if (blank) post({ type: "text", text: blank });
      else post({ type: "clear" });
    });
  }

  // ------------------------------------------------------------
  // BARU (28 Agu 2026) -- 🎥 KAMERA & 🖼️ GAMBAR LATAR (tab "🎥 Kamera",
  // kolom kanan). "Sumber Latar" bisa salah satu dari 3: "off" (tanpa
  // latar, tampilan biasa), "camera" (kamera perangkat yang membuka
  // LAYAR 2 -- BUKAN kamera laptop operator yang membuka Studio ini --
  // dipakai sebagai latar hidup), atau "image" (gambar diam yang
  // diunggah operator). Kamera & Gambar SALING MENIADAKAN -- memilih
  // salah satu otomatis mematikan yang lain (lihat applyLatarSource()).
  //
  // getUserMedia() SUNGGUH dipanggil di present.html (lihat catatan
  // panjang di sana), file ini cuma mengirim PERINTAH (on/off +
  // pengaturan) lewat rawPost() & menerima KEMBALI status nyatanya
  // lewat event "ps-camera-status" (dipancarkan js/presentation.js
  // dari pesan "present_camera_status", pola sama seperti
  // "ps-preview-ratio-changed" untuk present_geometry).
  //
  // Gaya tulisan (warna tulisan/border/tebal border) dipakai bersama
  // oleh Kamera & Gambar -- disimpan & dikirim TERPISAH dari payload
  // "camera"/"bgimage" itu sendiri (lewat {type:"latartext"}, lihat
  // sendLatarTextState()) supaya menggeser slider/ganti warna TIDAK
  // memicu ulang stream kamera atau kirim ulang gambar (data-URL bisa
  // besar).
  //
  // Pengaturan (arah kamera/cermin/gaya tulisan/tebal border/warna
  // kustom) DISIMPAN (localStorage, bertahan lintas sesi) -- status
  // NYALA/MATI kamera & gambar gambar itu SENDIRI SENGAJA TIDAK
  // disimpan (`camOn`/`bgImageOn` cuma variabel biasa, mulai dari
  // `false` tiap Studio dibuka ulang) supaya kamera TIDAK pernah
  // otomatis meminta izin/menyala sendiri tanpa operator menekan
  // tombol dulu di sesi itu -- baik demi privasi (kamera tidak
  // diam-diam nyala) maupun karena Layar 2-nya sendiri belum tentu
  // sudah terbuka lagi di sesi baru. Gambar yang diunggah sendiri
  // (data-URL, bisa besar) SENGAJA TIDAK ikut disimpan ke localStorage
  // (risiko kuota penuh) -- hilang begitu Studio ditutup/dimuat ulang,
  // operator perlu unggah ulang di sesi baru.
  // ------------------------------------------------------------
  const CAMERA_KEY = "bible_app_studio_camera_v1";
  const DEFAULT_CAMERA_SETTINGS = {
    facing: "user", mirror: false,
    textMode: "white-black", outlineWidth: 3,
    customInk: "#ffffff", customOutline: "#000000",
  };
  let camOn = false;
  let bgImageOn = false;
  let bgImageDataUrl = null; // BARU -- data-URL gambar latar yang sedang diunggah, tidak disimpan ke localStorage (lihat catatan di atas)

  function loadCameraSettings() {
    let s = { ...DEFAULT_CAMERA_SETTINGS };
    const raw = localStorage.getItem(CAMERA_KEY);
    if (raw) { try { s = { ...s, ...JSON.parse(raw) }; } catch (e) {} }
    return s;
  }
  function saveCameraSettings(partial) {
    const s = { ...loadCameraSettings(), ...partial };
    localStorage.setItem(CAMERA_KEY, JSON.stringify(s));
    return s;
  }
  function sendCameraState(on) {
    const s = loadCameraSettings();
    rawPost({ type: "camera", on: !!on, facingMode: s.facing, mirror: s.mirror });
  }
  // BARU -- gambar latar dikirim APA ADANYA sebagai data-URL (sama
  // pola seperti "slide" di File tab) -- hanya dikirim ULANG saat
  // benar-benar nyala/mati/ganti gambar, TIDAK setiap kali gaya
  // tulisan berubah (lihat sendLatarTextState()).
  function sendBgImageState(on) {
    rawPost({ type: "bgimage", on: !!(on && bgImageDataUrl), url: on ? bgImageDataUrl : null });
  }
  // BARU -- gaya tulisan (dipakai bersama Kamera & Gambar), dikirim
  // WALAU keduanya masih mati -- applyCamTextStyle() di present.html
  // tetap menerapkan gaya tulisannya duluan (siap dipakai begitu latar
  // dinyalakan).
  function sendLatarTextState() {
    const s = loadCameraSettings();
    rawPost({ type: "latartext", mode: s.textMode, widthPx: s.outlineWidth, ink: s.customInk, outline: s.customOutline });
  }
  function setCamStatusText(text) {
    if (el("psCamStatus")) el("psCamStatus").textContent = text;
  }
  function setCamToggleUi(on) {
    const btn = el("psCamToggle");
    if (!btn) return;
    btn.classList.toggle("active", on);
    btn.textContent = on ? "🎥 Matikan Kamera" : "🎥 Aktifkan Kamera";
  }
  function setBgImageToggleUi(on) {
    const btn = el("psBgImageToggle");
    if (!btn) return;
    btn.classList.toggle("active", on);
    btn.textContent = on ? "🖼️ Matikan Gambar Latar" : "🖼️ Pakai sebagai Latar";
  }

  // BARU -- "Sumber Latar" (off/camera/image): satu fungsi tunggal
  // yang menjaga kamera & gambar latar SALING MENIADAKAN. Dipanggil
  // dari tombol toggle Kamera & tombol toggle Gambar, bukan dari
  // event ps-camera-status (status kamera NYATA tetap dilaporkan
  // balik lewat listener terpisah di bawah).
  function setLatarSource(next) {
    if (next === "camera") {
      camOn = true;
      if (bgImageOn) { bgImageOn = false; setBgImageToggleUi(false); sendBgImageState(false); }
      setCamToggleUi(true);
      setCamStatusText("⏳ Meminta izin kamera di jendela Layar 2…");
      sendCameraState(true);
    } else if (next === "image") {
      if (!bgImageDataUrl) return; // belum ada gambar diunggah -- tombol dinonaktifkan lewat CSS/atribut disabled, ini jaga-jaga
      bgImageOn = true;
      if (camOn) { camOn = false; setCamToggleUi(false); setCamStatusText("⚪ Kamera dimatikan."); sendCameraState(false); }
      setBgImageToggleUi(true);
      sendBgImageState(true);
    } else {
      if (camOn) { camOn = false; setCamToggleUi(false); setCamStatusText("⚪ Kamera dimatikan."); sendCameraState(false); }
      if (bgImageOn) { bgImageOn = false; setBgImageToggleUi(false); sendBgImageState(false); }
    }
  }

  function wireCamera() {
    const s = loadCameraSettings();
    if (el("psCamFacingSelect")) el("psCamFacingSelect").value = s.facing;
    if (el("psCamMirror")) el("psCamMirror").checked = !!s.mirror;
    if (el("psCamOutlineSlider")) el("psCamOutlineSlider").value = String(s.outlineWidth);
    if (el("psCamOutlineValue")) el("psCamOutlineValue").value = s.outlineWidth;
    if (el("psCamInkColor")) el("psCamInkColor").value = s.customInk;
    if (el("psCamOutlineColor")) el("psCamOutlineColor").value = s.customOutline;
    document.querySelectorAll("[data-ps-cam-text]").forEach((b) => b.classList.toggle("active", b.dataset.psCamText === s.textMode));

    if (el("psCamToggle")) {
      el("psCamToggle").addEventListener("click", () => setLatarSource(camOn ? "off" : "camera"));
    }
    if (el("psBgImageToggle")) {
      el("psBgImageToggle").addEventListener("click", () => setLatarSource(bgImageOn ? "off" : "image"));
    }
    if (el("psCamFacingSelect")) {
      el("psCamFacingSelect").addEventListener("change", () => {
        saveCameraSettings({ facing: el("psCamFacingSelect").value });
        if (camOn) sendCameraState(true); // ganti arah kamera SAAT AKTIF -- present.html akan me-restart stream-nya (lihat applyCameraPayload())
      });
    }
    if (el("psCamMirror")) {
      el("psCamMirror").addEventListener("change", () => {
        saveCameraSettings({ mirror: el("psCamMirror").checked });
        if (camOn) sendCameraState(true);
      });
    }
    document.querySelectorAll("[data-ps-cam-text]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-ps-cam-text]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        saveCameraSettings({ textMode: btn.dataset.psCamText });
        sendLatarTextState();
      });
    });
    // BARU -- warna tulisan & warna border BEBAS (24-bit, dipilih
    // lewat <input type="color">, bukan cuma 2 preset hitam/putih) --
    // memilih salah satu warna otomatis memindahkan mode ke "custom".
    function activateCustomTextMode() {
      document.querySelectorAll("[data-ps-cam-text]").forEach((b) => b.classList.toggle("active", b.dataset.psCamText === "custom"));
      saveCameraSettings({ textMode: "custom" });
      sendLatarTextState();
    }
    if (el("psCamInkColor")) {
      el("psCamInkColor").addEventListener("input", () => {
        saveCameraSettings({ customInk: el("psCamInkColor").value });
        activateCustomTextMode();
      });
    }
    if (el("psCamOutlineColor")) {
      el("psCamOutlineColor").addEventListener("input", () => {
        saveCameraSettings({ customOutline: el("psCamOutlineColor").value });
        activateCustomTextMode();
      });
    }
    function applyOutline() {
      const v = Number(el("psCamOutlineSlider").value);
      if (el("psCamOutlineValue")) el("psCamOutlineValue").value = v;
      saveCameraSettings({ outlineWidth: v });
      sendLatarTextState();
    }
    if (el("psCamOutlineSlider")) el("psCamOutlineSlider").addEventListener("input", applyOutline);
    wireManualValueInput("psCamOutlineValue", "psCamOutlineSlider");
    sendLatarTextState(); // kirim gaya tersimpan sekali di awal, siap dipakai begitu Kamera/Gambar dinyalakan

    // BARU (8 Sep 2026, permintaan operator) -- toggle Tata Letak
    // "Latar Penuh" (bawaan, kamera/gambar penuh layar + teks ditimpakan
    // di tengah) vs "📐 Kamera Atas, Teks Bawah" (kamera/gambar dipepet
    // ke ATAS, ayat/kidung/pengumuman punya zona SENDIRI di bawahnya,
    // latar solid, tidak saling menimpa) vs "🎬 Latar Penuh + Subtitle"
    // (BARU v2 -- kamera/gambar MEMENUHI LAYAR PENUH seperti nonton
    // video, teks tampil sebagai bar SUBTITLE menempel di bawah) --
    // lihat theme.camLayout (DEFAULT_STAGE_THEME) & body.cam-split/
    // body.cam-subtitle (present.html). Disimpan lewat saveAndSendTheme()
    // (SAMA tempat tema lain disimpan) supaya pulih otomatis & tersinkron
    // dengan pengaturan tema lainnya.
    if (el("psCamLayoutRow")) {
      document.querySelectorAll("#psCamLayoutRow [data-cam-layout]").forEach((btn) => {
        btn.addEventListener("click", () => {
          document.querySelectorAll("#psCamLayoutRow [data-cam-layout]").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          saveAndSendTheme({ camLayout: btn.dataset.camLayout });
        });
      });
    }
    // BARU (8 Sep 2026 v2, permintaan operator "slider biar bebas
    // ukurannya") -- "Ukuran Zona Kamera" (10%-90%, bawaan 42%), khusus
    // mode "📐 Kamera Atas, Teks Bawah" -- makin besar persentasenya,
    // makin besar bagian layar yang dipakai Kamera/Gambar (sisanya
    // otomatis jadi bagian ayat/kidung/pengumuman). Lihat --p-cam-
    // split-pct (present.html).
    if (el("psCamSplitPctSlider")) {
      el("psCamSplitPctSlider").addEventListener("input", () => {
        const v = Number(el("psCamSplitPctSlider").value) || 42;
        if (el("psCamSplitPctValue")) el("psCamSplitPctValue").value = v;
        saveAndSendTheme({ camSplitPct: v });
      });
      wireManualValueInput("psCamSplitPctValue", "psCamSplitPctSlider");
    }
    // BARU (8 Sep 2026 v3, permintaan operator "kamera bulat kanan
    // bawah") -- slider "Ukuran lingkaran Kamera" (120px-420px, bawaan
    // 200px), khusus mode "🔵 Teks Penuh, Kamera Bulat".
    if (el("psCamBubbleSizeSlider")) {
      el("psCamBubbleSizeSlider").addEventListener("input", () => {
        const v = Number(el("psCamBubbleSizeSlider").value) || 200;
        if (el("psCamBubbleSizeValue")) el("psCamBubbleSizeValue").value = v;
        saveAndSendTheme({ camBubbleSize: v });
      });
      wireManualValueInput("psCamBubbleSizeValue", "psCamBubbleSizeSlider");
    }
    // BARU (9 Sep 2026, sesi ke-9, permintaan operator "lingkaran kecil
    // di 5 sisi") -- posisi bubble, berlaku untuk mode "Teks Penuh,
    // Kamera Bulat" MAUPUN "Kamera Penuh, Teks Bulat". Pola SAMA seperti
    // psCamLayoutRow di atas (1 aktif, sisanya lepas "active").
    if (el("psBubblePosRow")) {
      document.querySelectorAll("#psBubblePosRow [data-bubble-pos]").forEach((btn) => {
        btn.addEventListener("click", () => {
          document.querySelectorAll("#psBubblePosRow [data-bubble-pos]").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          saveAndSendTheme({ bubblePos: btn.dataset.bubblePos });
        });
      });
    }
    // BARU (9 Sep 2026, sesi ke-9, permintaan operator "dari kecil sampai
    // besar sekali") -- slider "Ukuran lingkaran Teks" (200px-1200px,
    // bawaan 420px), khusus mode "⭕ Kamera Penuh, Teks Bulat".
    if (el("psTextBubbleSizeSlider")) {
      el("psTextBubbleSizeSlider").addEventListener("input", () => {
        const v = Number(el("psTextBubbleSizeSlider").value) || 420;
        if (el("psTextBubbleSizeValue")) el("psTextBubbleSizeValue").value = v;
        saveAndSendTheme({ textBubbleSize: v });
      });
      wireManualValueInput("psTextBubbleSizeValue", "psTextBubbleSizeSlider");
    }
    // BARU (8 Sep 2026, permintaan operator "video ada subtitle-nya") --
    // toggle "📝 Ayat/Kidung/Pengumuman TETAP tampil di atas video".
    if (el("psVideoTextOverlay")) {
      el("psVideoTextOverlay").addEventListener("change", () => {
        saveAndSendTheme({ videoTextOverlay: el("psVideoTextOverlay").checked });
      });
    }
    // BARU (8 Sep 2026 v4, permintaan operator "latar belakang transparan
    // atau ada backgroundnya") -- zona teks di mode "📐 Kamera Atas, Teks
    // Bawah" SEBELUMNYA selalu solid warna tema (--p-bg), sekarang bisa
    // dicentang supaya TRANSPARAN (kamera/gambar tetap tembus pandang di
    // baliknya, mirip mode Subtitle tapi utk zona bawah yang solid ini).
    // Lihat theme.stageTransparent & body.cam-split #stage (present.html).
    if (el("psStageTransparent")) {
      el("psStageTransparent").addEventListener("change", () => {
        saveAndSendTheme({ stageTransparent: el("psStageTransparent").checked });
      });
    }
    // BARU (12 Sep 2026 v2, permintaan operator "jam kecil di pojok,
    // aktif di ayat/kidung/PDF/apapun") -- 🕐 Jam Pojok: pola SAMA
    // seperti toggle/tombol posisi lain di sini (1 sumber kebenaran,
    // dikirim lewat theme.cornerClockOn/cornerClockPos -- lihat
    // #cornerClockOverlay & applyTheme(), present.html).
    if (el("psCornerClockOn")) {
      el("psCornerClockOn").addEventListener("change", () => {
        saveAndSendTheme({ cornerClockOn: el("psCornerClockOn").checked });
      });
    }
    if (el("psCornerClockPosRow")) {
      const ccPosBtns = Array.from(el("psCornerClockPosRow").querySelectorAll("[data-corner-clock-pos]"));
      ccPosBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          saveAndSendTheme({ cornerClockPos: btn.dataset.cornerClockPos });
          ccPosBtns.forEach((b) => b.classList.toggle("active", b === btn));
        });
      });
    }
    // BARU (9 Sep 2026) -- "🔁 Balik sisi" khusus mode "Kamera Kiri,
    // Konten Kanan", lihat body.cam-split-lr-reverse (present.html).
    if (el("psCamSplitReverse")) {
      el("psCamSplitReverse").addEventListener("change", () => {
        saveAndSendTheme({ camSplitReverse: el("psCamSplitReverse").checked });
      });
    }
    // BARU (9 Sep 2026, sesi ke-9) -- 2 orientasi tambahan yang diminta
    // operator ("teks atas kamera bawah" & "subtitle di atas"). Lihat
    // catatan panjang body.cam-split-reverse-tb & body.cam-subtitle-top
    // di present.html.
    if (el("psCamSplitReverseTB")) {
      el("psCamSplitReverseTB").addEventListener("change", () => {
        saveAndSendTheme({ camSplitReverseTB: el("psCamSplitReverseTB").checked });
      });
    }
    if (el("psCamSubtitleTop")) {
      el("psCamSubtitleTop").addEventListener("change", () => {
        saveAndSendTheme({ camSubtitleTop: el("psCamSubtitleTop").checked });
      });
    }
    // BARU (8 Sep 2026, permintaan operator "tombol shortcut mode & bel")
    // -- lihat definisi fungsi lengkap & catatan panjang di dekat
    // MODE_PRESETS_KEY (bawah, sebelum wireLocalVideoTab()).
    wireModeShortcuts();
    wireBellShortcuts();
    wireModeAndBellKeyboardShortcuts();
    wireQuickMenu(); // BARU (9 Sep 2026, sesi ke-9) -- Fitur A "Menu Cepat ⚡"
    applyScrollbarVisibilityFromStorage_(); // BARU (10 Sep 2026, sesi ke-10)

    // BARU -- 🖼️ Unggah Gambar Latar (dropzone sama pola dengan tab
    // File, tapi 1 gambar saja -- gambar BARU menggantikan yang lama).
    const bgDz = el("psBgImageDropzone");
    const bgInput = el("psBgImageInput");
    function handleBgImageFile(file) {
      if (!file) return;
      if (!/^image\//.test(file.type)) { alert("Pilih file gambar (jpg/png/webp/gif)."); return; }
      if (file.size > 25 * 1024 * 1024) { alert(`${file.name}: melebihi 25MB.`); return; }
      const reader = new FileReader();
      reader.onload = () => {
        bgImageDataUrl = reader.result;
        if (el("psBgImagePreview")) { el("psBgImagePreview").src = bgImageDataUrl; el("psBgImagePreview").hidden = false; }
        if (el("psBgImageToggle")) el("psBgImageToggle").disabled = false;
        if (el("psBgImageName")) el("psBgImageName").textContent = file.name;
        if (bgImageOn) sendBgImageState(true); // gambar sedang tayang & diganti -- kirim ulang yang baru
      };
      reader.readAsDataURL(file);
    }
    if (bgDz && bgInput) {
      bgDz.addEventListener("click", () => bgInput.click());
      bgDz.addEventListener("dragover", (e) => { e.preventDefault(); bgDz.classList.add("dragover"); });
      bgDz.addEventListener("dragleave", () => bgDz.classList.remove("dragover"));
      bgDz.addEventListener("drop", (e) => { e.preventDefault(); bgDz.classList.remove("dragover"); handleBgImageFile(e.dataTransfer.files && e.dataTransfer.files[0]); });
      bgInput.addEventListener("change", () => handleBgImageFile(bgInput.files && bgInput.files[0]));
    }
    if (el("psBgImageRemove")) {
      el("psBgImageRemove").addEventListener("click", () => {
        bgImageDataUrl = null;
        if (bgImageOn) setLatarSource("off");
        if (el("psBgImagePreview")) { el("psBgImagePreview").hidden = true; el("psBgImagePreview").src = ""; }
        if (el("psBgImageToggle")) el("psBgImageToggle").disabled = true;
        if (el("psBgImageName")) el("psBgImageName").textContent = "";
        if (bgInput) bgInput.value = "";
      });
    }
    if (el("psBgImageToggle")) el("psBgImageToggle").disabled = true; // aktif lagi begitu 1 gambar berhasil diunggah

    // Status NYATA dari Layar 2 (berhasil/gagal -- lihat
    // present_camera_status di present.html, diteruskan sebagai event
    // ini oleh js/presentation.js) -- SUMBER KEBENARAN AKHIR, bisa beda
    // dari `camOn` lokal (mis. operator menekan tombol tapi izin
    // kamera ditolak browser -- tombol & status di sini otomatis
    // kembali ke "mati" begitu kabar itu tiba, tidak menggantung
    // menampilkan "aktif" padahal sebenarnya gagal).
    window.addEventListener("ps-camera-status", (e) => {
      const detail = (e && e.detail) || {};
      camOn = !!detail.on;
      setCamToggleUi(camOn);
      if (camOn) setCamStatusText("🟢 Kamera aktif.");
      else if (detail.error) setCamStatusText("❌ Gagal mengaktifkan kamera: " + detail.error);
      else setCamStatusText("⚪ Kamera belum aktif.");
    });
  }

  // ------------------------------------------------------------
  // "Teks Cepat" -- kalimat sekali pakai langsung tayang, tanpa perlu
  // disimpan dulu ke Pengumuman (kolom kiri). Ikut aturan antre di
  // mode dual monitor lewat stageOrSend(), sama seperti tipe konten
  // lain (ayat, YouTube, dst.).
  // ------------------------------------------------------------
  function wireQuickText() {
    const ta = el("psQuickTextArea");
    const showBtn = el("psQuickTextShowBtn");
    const clearBtn = el("psQuickTextClearBtn");
    function doShow() {
      const text = (ta && ta.value.trim()) || "";
      if (!text) return;
      stageOrSend("📝 Teks Cepat", text, () => post({ type: "text", text }));
    }
    if (showBtn) showBtn.addEventListener("click", doShow);
    if (clearBtn) clearBtn.addEventListener("click", () => { if (ta) ta.value = ""; });
  }

  function wireTicker(prefix, type) {
    const input = el(prefix + "Input");
    const count = el(prefix + "Count");
    const showBtn = el(prefix + "ShowBtn");
    const hideBtn = el(prefix + "HideBtn");
    if (input && count) input.addEventListener("input", () => { count.textContent = String(input.value.length); });
    if (showBtn) showBtn.addEventListener("click", () => {
      const text = (input && input.value.trim()) || "";
      if (!text) return;
      rawPost({ type, show: true, text });
    });
    if (hideBtn) hideBtn.addEventListener("click", () => {
      rawPost({ type, show: false, text: "" });
      if (input) input.value = "";
      if (count) count.textContent = "0";
    });
  }

  // ------------------------------------------------------------
  // Penunjuk & Pen -- digambar LANGSUNG DI ATAS kotak pratinjau
  // "Tayang" (#psPreviewBoxWrap), 1:1 sama seperti #pointerDot /
  // #penCanvas di present.html (Layar 2): ukuran titik, glow, warna,
  // dan gaya coretan sama persis, cuma diposisikan pakai % dari kotak
  // pratinjau (bukan px dari layar penuh) supaya akurat walau kotak
  // di-resize. Sebelumnya ada pad terpisah di bawah tombol -- sekarang
  // operator gerakkan kursor langsung di atas gambar pratinjau.
  // ------------------------------------------------------------
  // BARU (12 Sep 2026, permintaan operator "semua slider bisa diketik
  // manual + ada tanda 2 segitiga seperti Kaca Pembesar") -- helper
  // umum yang dipakai SEMUA kolom angka slider di panel ini (Ukuran
  // Pen, Ukuran Teks, Spasi Baris, Ukuran Konten, Ukuran Timer,
  // Ukuran Zona Kamera, Ukuran Lingkaran Kamera/Teks, Ketebalan
  // Border, Zoom Peta, dst) supaya SEMUANYA berkelakuan SAMA PERSIS
  // seperti kolom zoom 🔍 Kaca Pembesar (lihat `magnifyZoomValue` di
  // wirePointerPen() bawah): angkanya bisa DIKETIK manual (dijepit ke
  // rentang min-max slider terkait, commit lewat Enter atau klik di
  // luar kotak), DAN otomatis dapat panah atas/bawah "▲▼" (tanda 2
  // segitiga) bawaan browser untuk <input type="number"> lewat class
  // css "ps-pen-size-value-input" (lihat style.css) -- tidak perlu
  // digambar manual, itu tombol spinner NATIVE dari <input type=
  // "number">.
  //
  // Cara pakai: cukup panggil wireManualValueInput("idInputAngka",
  // "idSliderTerkait") SEKALI setelah slider terkait sudah dipasangi
  // listener "input"-nya sendiri (applyScale(), applyOutline(), dst) --
  // helper ini TIDAK mengulang logika slider tsb, cuma menyalin angka
  // yang diketik ke slider lalu memicu ulang event "input" bawaan
  // slider itu (dispatchEvent), jadi 1 sumber logika saja yang perlu
  // dijaga (di slider), bukan 2 (slider + kotak angka) yang gampang
  // beda kalau salah satu diubah tapi lupa ubah yang lain.
  function wireManualValueInput(numberInputId, sliderId) {
    const input = el(numberInputId);
    const slider = el(sliderId);
    if (!input || !slider) return;
    const min = Number(slider.min || input.min) || 0;
    const max = Number(slider.max || input.max) || 100;
    function commit() {
      let v = Math.round(Number(input.value));
      if (!Number.isFinite(v)) v = Number(slider.value) || min;
      v = Math.min(max, Math.max(min, v));
      input.value = v;
      if (Number(slider.value) !== v) {
        slider.value = v;
        // Memicu ulang listener "input" slider ini supaya semua efek
        // (kirim ke Layar 2, simpan tema, dst) berjalan SAMA PERSIS
        // seperti kalau operator menggeser slidernya langsung.
        slider.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
    input.addEventListener("change", commit);
    // Enter langsung "commit" tanpa perlu pindah fokus dulu (change
    // baru terpicu kalau kotak kehilangan fokus/blur) -- blur() di
    // sini otomatis memicu "change" di atas. Sama seperti kolom zoom
    // Kaca Pembesar.
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); input.blur(); } });
  }

  function wirePointerPen() {
    const wrap = el("psPreviewBoxWrap");
    const dot = el("psPointerDot");
    const canvas = el("psPenCanvas");
    const ctx = canvas ? canvas.getContext("2d") : null;
    let color = "#ff3b30";
    // BARU (27 Agu 2026) -- ukuran Pen lewat progress bar (#psPenSizeSlider),
    // default 17px (disamakan kira-kira dengan ukuran dasar huruf yang
    // umum dipakai di aplikasi ini, sesuai permintaan). Dikirim juga ke
    // Layar 2 (lewat rawPost({type:"pen", ..., size})) supaya coretan di
    // sana setebal yang dipilih di sini, bukan selalu 4px seperti dulu.
    let penSize = 17;
    const sizeSlider = el("psPenSizeSlider");
    const sizeValueEl = el("psPenSizeValue");
    if (sizeSlider) {
      penSize = Number(sizeSlider.value) || 17;
      sizeSlider.addEventListener("input", () => {
        penSize = Number(sizeSlider.value) || 17;
        if (sizeValueEl) sizeValueEl.value = penSize;
      });
    }
    wireManualValueInput("psPenSizeValue", "psPenSizeSlider");

    // BARU (27 Agu 2026) -- 🔍 Kaca Pembesar: zoom 10%-10000% (default
    // 100%), dikirim bersama posisi kursor tiap mousemove (lihat blok
    // wrap.addEventListener("mousemove", ...) di bawah).
    let magnifyPercent = 100;
    const magnifyZoomSlider = el("psMagnifyZoomSlider");
    const magnifyZoomValue = el("psMagnifyZoomValue");
    if (magnifyZoomSlider) {
      magnifyPercent = Number(magnifyZoomSlider.value) || 100;
      magnifyZoomSlider.addEventListener("input", () => {
        magnifyPercent = Number(magnifyZoomSlider.value) || 100;
        if (magnifyZoomValue) magnifyZoomValue.value = magnifyPercent;
      });
    }
    // BARU (12 Sep 2026, permintaan operator "kolom perbesar bisa diketik
    // manual pakai keyboard") -- `psMagnifyZoomValue` sekarang <input
    // type="number"> (lihat index.html), bukan <span> lagi. Dipakai lewat
    // "change" (jadi TIDAK mengirim apa pun tiap 1 karakter diketik --
    // baru dibaca setelah operator menekan Enter atau klik di luar kotak,
    // supaya angka setengah-jadi seperti "3" saat baru mulai mengetik
    // "350" tidak sempat dipaksa jadi 10% dulu) -- nilai DIJEPIT (clamp)
    // ke rentang 10-10000% yang sama dengan slider, lalu slider & kotak
    // sama-sama disegarkan supaya keduanya SELALU sinkron, apa pun cara
    // terakhir operator mengubah angkanya.
    if (magnifyZoomValue) {
      magnifyZoomValue.addEventListener("change", () => {
        let v = Math.round(Number(magnifyZoomValue.value));
        if (!Number.isFinite(v)) v = magnifyPercent;
        v = Math.min(10000, Math.max(10, v));
        magnifyPercent = v;
        magnifyZoomValue.value = v;
        if (magnifyZoomSlider) magnifyZoomSlider.value = v;
      });
      // Enter langsung "commit" tanpa perlu pindah fokus dulu (change
      // baru terpicu kalau kotak kehilangan fokus/blur) -- blur() di
      // sini otomatis memicu "change" di atas.
      magnifyZoomValue.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); magnifyZoomValue.blur(); } });
    }
    const magnifyBtns = () => Array.from(document.querySelectorAll("[data-ps-magnify-toggle]"));
    // BARU (12 Sep 2026, permintaan operator) -- 🔲 Perbesar Kotak: ukuran
    // kotak viewfinder 10%-80% (default 35%), dikirim bersama posisi
    // kursor tiap mousemove SELAGI belum dikunci (sama pola dengan
    // `magnifyPercent` di atas).
    let boxZoomSizePercent = 35;
    const boxZoomSizeSlider = el("psBoxZoomSizeSlider");
    const boxZoomSizeValue = el("psBoxZoomSizeValue");
    if (boxZoomSizeSlider) {
      boxZoomSizePercent = Number(boxZoomSizeSlider.value) || 35;
      boxZoomSizeSlider.addEventListener("input", () => {
        boxZoomSizePercent = Number(boxZoomSizeSlider.value) || 35;
        if (boxZoomSizeValue) boxZoomSizeValue.value = boxZoomSizePercent;
      });
    }
    if (boxZoomSizeValue) {
      boxZoomSizeValue.addEventListener("change", () => {
        let v = Math.round(Number(boxZoomSizeValue.value));
        if (!Number.isFinite(v)) v = boxZoomSizePercent;
        v = Math.min(80, Math.max(10, v));
        boxZoomSizePercent = v;
        boxZoomSizeValue.value = v;
        if (boxZoomSizeSlider) boxZoomSizeSlider.value = v;
      });
      boxZoomSizeValue.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); boxZoomSizeValue.blur(); } });
    }
    const boxZoomBtns = () => Array.from(document.querySelectorAll("[data-ps-boxzoom-toggle]"));
    // Dipakai SETIAP kali operator beralih ke mode lain (Penunjuk/Pen/
    // Kaca Pembesar/Efek Fokus) ATAU mematikan tombol Perbesar Kotak itu
    // sendiri -- mengembalikan #slideView ke ukuran normal DAN
    // menyembunyikan kotak viewfinder, apa pun keadaan sebelumnya
    // (sedang mencari posisi ATAU sudah terkunci).
    function deactivateBoxZoom_() {
      boxZoomActive = false;
      boxZoomLocked = false;
      boxZoomBtns().forEach((b) => b.classList.remove("active"));
      rawPost({ type: "boxzoom", on: false });
      rawPost({ type: "boxzoom_hover", on: false });
    }
    // BARU (12 Sep 2026) -- 🎯 Efek Fokus, lihat catatan panjang di
    // deklarasi focusClickActive di atas & blok wrap.addEventListener("click", ...)
    // di bawah untuk pengirimannya.
    const focusClickBtns = () => Array.from(document.querySelectorAll("[data-ps-focusclick-toggle]"));

    // akses cepat di atas kotak "Tayang") -- keduanya dicari lewat
    // data-attribute yang sama supaya statusnya selalu sinkron, apa pun
    // tombol mana yang diklik operator.
    const pointerBtns = () => Array.from(document.querySelectorAll("[data-ps-pointer-toggle]"));
    const penBtns = () => Array.from(document.querySelectorAll("[data-ps-pen-toggle]"));
    const penClearBtns = () => Array.from(document.querySelectorAll("[data-ps-pen-clear]"));

    function syncCanvasSize() {
      if (!wrap || !canvas) return;
      const w = wrap.clientWidth, h = wrap.clientHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
      }
    }

    function updateMode() {
      if (wrap) wrap.classList.toggle("ps-pointer-mode", pointerActive || penActive || magnifyActive || focusClickActive || boxZoomActive);
    }

    document.querySelectorAll("#psPointerColorRow .ps-color-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll("#psPointerColorRow .ps-color-chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        color = chip.dataset.color;
      });
    });
    pointerBtns().forEach((btn) => btn.addEventListener("click", () => {
      pointerActive = !pointerActive;
      penActive = false;
      magnifyActive = false;
      focusClickActive = false;
      pointerBtns().forEach((b) => b.classList.toggle("active", pointerActive));
      penBtns().forEach((b) => b.classList.remove("active"));
      magnifyBtns().forEach((b) => b.classList.remove("active"));
      focusClickBtns().forEach((b) => b.classList.remove("active"));
      deactivateBoxZoom_();
      if (!pointerActive) { rawPost({ type: "pointer", on: false }); if (dot) dot.style.display = "none"; }
      rawPost({ type: "magnify", on: false });
      updateMode();
    }));
    penBtns().forEach((btn) => btn.addEventListener("click", () => {
      penActive = !penActive;
      pointerActive = false;
      magnifyActive = false;
      focusClickActive = false;
      penBtns().forEach((b) => b.classList.toggle("active", penActive));
      pointerBtns().forEach((b) => b.classList.remove("active"));
      magnifyBtns().forEach((b) => b.classList.remove("active"));
      focusClickBtns().forEach((b) => b.classList.remove("active"));
      deactivateBoxZoom_();
      if (!penActive) { rawPost({ type: "pointer", on: false }); if (dot) dot.style.display = "none"; }
      rawPost({ type: "magnify", on: false });
      updateMode();
    }));
    magnifyBtns().forEach((btn) => btn.addEventListener("click", () => {
      magnifyActive = !magnifyActive;
      pointerActive = false;
      penActive = false;
      focusClickActive = false;
      magnifyBtns().forEach((b) => b.classList.toggle("active", magnifyActive));
      pointerBtns().forEach((b) => b.classList.remove("active"));
      penBtns().forEach((b) => b.classList.remove("active"));
      focusClickBtns().forEach((b) => b.classList.remove("active"));
      deactivateBoxZoom_();
      if (!magnifyActive) rawPost({ type: "magnify", on: false });
      if (dot) dot.style.display = "none";
      rawPost({ type: "pointer", on: false });
      updateMode();
    }));
    // BARU (12 Sep 2026) -- 🎯 Efek Fokus: BEDA dari 3 mode lain di atas
    // (yang aktif SELAMA kursor bergerak), mode ini cuma menunggu 1 KLIK
    // di kotak pratinjau "Tayang" (lihat wrap.addEventListener("click", ...)
    // di bawah) -- tiap klik mengirim 1 payload "clickfocus" yang memicu
    // 1 ring mengembang lalu hilang sendiri di Layar 2 (playFocusRipple_(),
    // present.html), TIDAK ada state "on/off" yang perlu dimatikan di
    // Layar 2 seperti Penunjuk/Kaca Pembesar (tidak ada apa pun yang
    // "menempel" di sana untuk dibersihkan).
    focusClickBtns().forEach((btn) => btn.addEventListener("click", () => {
      focusClickActive = !focusClickActive;
      pointerActive = false;
      penActive = false;
      magnifyActive = false;
      focusClickBtns().forEach((b) => b.classList.toggle("active", focusClickActive));
      pointerBtns().forEach((b) => b.classList.remove("active"));
      penBtns().forEach((b) => b.classList.remove("active"));
      magnifyBtns().forEach((b) => b.classList.remove("active"));
      deactivateBoxZoom_();
      rawPost({ type: "pointer", on: false });
      rawPost({ type: "magnify", on: false });
      if (dot) dot.style.display = "none";
      updateMode();
    }));
    // BARU (12 Sep 2026, permintaan operator "kotak lebih terang di
    // sekitar area, klik utk mengunci perbesarannya") -- 🔲 Perbesar
    // Kotak: BEDA dari 4 mode lain di atas. Menyalakan tombol ini HANYA
    // menampilkan kotak viewfinder yang mengikuti kursor (lihat blok
    // "mousemove" di bawah) -- belum ada apa pun yang membesar.
    // Mengunci/melepas perbesaran sungguhan terjadi di listener "click"
    // terpisah di bawah (mirip pola Efek Fokus di atas), BUKAN di sini --
    // supaya menyalakan tombolnya sendiri (1x klik tombol ini) tidak
    // langsung mengunci ke posisi kursor terakhir yang mungkin belum pas.
    boxZoomBtns().forEach((btn) => btn.addEventListener("click", () => {
      const turningOn = !boxZoomActive;
      boxZoomActive = turningOn;
      boxZoomLocked = false;
      pointerActive = false;
      penActive = false;
      magnifyActive = false;
      focusClickActive = false;
      boxZoomBtns().forEach((b) => b.classList.toggle("active", boxZoomActive));
      pointerBtns().forEach((b) => b.classList.remove("active"));
      penBtns().forEach((b) => b.classList.remove("active"));
      magnifyBtns().forEach((b) => b.classList.remove("active"));
      focusClickBtns().forEach((b) => b.classList.remove("active"));
      rawPost({ type: "pointer", on: false });
      rawPost({ type: "magnify", on: false });
      rawPost({ type: "boxzoom", on: false }); // matikan kunci lama (kalau ada) begitu mode diaktifkan/dimatikan ulang
      if (!turningOn) rawPost({ type: "boxzoom_hover", on: false });
      if (dot) dot.style.display = "none";
      updateMode();
    }));
    penClearBtns().forEach((btn) => btn.addEventListener("click", () => {
      rawPost({ type: "pen", clear: true });
      if (ctx && canvas) { ctx.clearRect(0, 0, canvas.width, canvas.height); canvas.style.display = "none"; }
    }));
    if (wrap) {
      wrap.addEventListener("mousemove", (e) => {
        const rect = wrap.getBoundingClientRect();
        let x = (e.clientX - rect.left) / rect.width;
        let y = (e.clientY - rect.top) / rect.height;
        x = Math.min(1, Math.max(0, x));
        y = Math.min(1, Math.max(0, y));
        if (pointerActive) {
          rawPost({ type: "pointer", on: true, x, y, color });
          if (dot) {
            dot.style.display = "block";
            dot.style.color = color;
            dot.style.background = color;
            dot.style.left = (x * 100) + "%";
            dot.style.top = (y * 100) + "%";
          }
        }
        if (penActive && e.buttons === 1) {
          penStroke.push({ x, y });
          const seg = penStroke.slice(-2);
          rawPost({ type: "pen", stroke: seg, color, size: penSize });
          if (ctx && canvas) {
            syncCanvasSize();
            canvas.style.display = "block";
            if (seg.length > 1) {
              ctx.strokeStyle = color; ctx.lineWidth = penSize; ctx.lineCap = "round"; ctx.lineJoin = "round";
              ctx.beginPath();
              seg.forEach((pt, i) => {
                const px = pt.x * canvas.width, py = pt.y * canvas.height;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
              });
              ctx.stroke();
            }
          }
        }
        if (magnifyActive) {
          rawPost({ type: "magnify", on: true, x, y, percent: magnifyPercent });
        }
        // BARU (12 Sep 2026) -- 🔲 Perbesar Kotak: SELAGI belum dikunci
        // (`!boxZoomLocked`), kotak viewfinder mengikuti kursor terus
        // (sama pola dengan Kaca Pembesar di atas) supaya operator bisa
        // "mencari" posisi yang pas SEBELUM klik utk mengunci. Begitu
        // sudah terkunci, mousemove TIDAK mengirim apa pun lagi (kotak
        // viewfinder-nya sudah disembunyikan sendiri oleh lockBoxZoom()
        // di present.html) -- posisi kursor tidak relevan lagi sampai
        // operator klik sekali lagi utk melepas kunci.
        if (boxZoomActive && !boxZoomLocked) {
          rawPost({ type: "boxzoom_hover", on: true, x, y, sizePercent: boxZoomSizePercent });
        }
      });
      wrap.addEventListener("mousedown", () => { penStroke = []; });
      // BARU (12 Sep 2026) -- 🎯 Efek Fokus: 1 klik di kotak pratinjau
      // (bukan gerak kursor, lihat blok mousemove di atas untuk 3 mode
      // lain) = 1 ring dikirim ke Layar 2 di titik itu persis. Dipasang
      // TERPISAH dari listener "mousemove" di atas supaya tidak mengirim
      // berkali-kali kalau operator cuma menggerakkan kursor tanpa klik.
      wrap.addEventListener("click", (e) => {
        if (focusClickActive) {
          const rect = wrap.getBoundingClientRect();
          let x = (e.clientX - rect.left) / rect.width;
          let y = (e.clientY - rect.top) / rect.height;
          x = Math.min(1, Math.max(0, x));
          y = Math.min(1, Math.max(0, y));
          rawPost({ type: "clickfocus", x, y });
          return;
        }
        // BARU (12 Sep 2026) -- 🔲 Perbesar Kotak: klik PERTAMA (belum
        // terkunci) = kunci & perbesar bagian kotak persis di posisi
        // klik ini. Klik KEDUA (sudah terkunci) = lepas kunci, balik ke
        // ukuran normal & kotak viewfinder mengikuti kursor lagi (siap
        // dipilih ulang) -- operator TIDAK perlu mematikan tombolnya
        // dulu hanya utk memilih bagian lain.
        if (boxZoomActive) {
          const rect = wrap.getBoundingClientRect();
          let x = (e.clientX - rect.left) / rect.width;
          let y = (e.clientY - rect.top) / rect.height;
          x = Math.min(1, Math.max(0, x));
          y = Math.min(1, Math.max(0, y));
          if (!boxZoomLocked) {
            boxZoomLocked = true;
            rawPost({ type: "boxzoom", on: true, x, y, sizePercent: boxZoomSizePercent });
          } else {
            boxZoomLocked = false;
            rawPost({ type: "boxzoom", on: false });
            // Kotak viewfinder langsung disegarkan di posisi klik ini
            // juga (bukan menunggu mousemove berikutnya) supaya tidak
            // ada "kekosongan" sesaat tanpa viewfinder maupun perbesaran.
            rawPost({ type: "boxzoom_hover", on: true, x, y, sizePercent: boxZoomSizePercent });
          }
          return;
        }
      });
      wrap.addEventListener("mouseleave", () => {
        if (pointerActive) { rawPost({ type: "pointer", on: false }); if (dot) dot.style.display = "none"; }
        if (magnifyActive) rawPost({ type: "magnify", on: false });
        // Kotak viewfinder (BELUM terkunci) ikut sembunyi saat kursor
        // keluar kotak pratinjau -- SAMA seperti Kaca Pembesar di atas.
        // Kalau SUDAH terkunci, JANGAN disentuh -- perbesaran harus tetap
        // menempel di Layar 2 walau kursor operator pindah ke tempat lain
        // (mis. mau menulis pengumuman sambil bagian itu tetap membesar).
        if (boxZoomActive && !boxZoomLocked) rawPost({ type: "boxzoom_hover", on: false });
      });
      window.addEventListener("resize", syncCanvasSize);
    }
  }

  // BARU (6 Sep 2026, permintaan operator) -- `timerScale`: SATU angka
  // TERPISAH dari `scale` (Ukuran Teks ayat/kidung/dst) -- lihat catatan
  // panjang di slider "Ukuran Timer/Stopwatch" (index.html) & --p-timer-
  // scale (present.html). Default 1 (100%), rentang jauh lebih lebar
  // (0.5x-10x) daripada `scale` karena kebutuhannya beda (angka besar
  // untuk dilihat dari jauh saat permainan/aktivitas, bukan untuk
  // kenyamanan baca ayat).
  // BARU (8 Sep 2026, permintaan operator) -- `camLayout`: tata letak
  // Kamera/Gambar Latar terhadap ayat/kidung/pengumuman -- "full"
  // (bawaan lama, latar penuh layar + teks ditimpakan di tengah),
  // "split" (kamera/gambar di ATAS, teks di zona SENDIRI di bawah,
  // lihat body.cam-split di <style> present.html), atau "subtitle"
  // (BARU v2 -- kamera/gambar MEMENUHI LAYAR PENUH seperti nonton
  // video, teks tampil sebagai BAR SUBTITLE menempel di bawah, lihat
  // body.cam-subtitle). `camSplitPct`: tinggi zona kamera (%) untuk
  // mode "split", bisa diatur bebas lewat slider (bawaan 42).
  // BARU (12 Sep 2026 v2) -- `cornerClockOn`/`cornerClockPos`: 🕐 Jam
  // Pojok (lihat #cornerClockOverlay, present.html) -- lapisan jam kecil
  // independen dari showMain()/showTimer()/dst, tetap tampil di ATAS
  // konten apa pun yang sedang tayang. Bawaan mati (cornerClockOn:
  // false) supaya operator yang belum pernah menyentuh fiturnya tidak
  // tiba-tiba melihat jam baru muncul di Layar 2.
  const DEFAULT_STAGE_THEME = { swatch: "gelap", font: "'Merriweather', Georgia, serif", bgColor: "#05070c", ink: "#f5f2e8", scale: 1, lineHeight: 1.35, contentScale: 1, bold: false, timerScale: 1, timerStyle: "classic", timerClockColor: "", timerClockPos: "center", timerClockStroke: "", timerClockStrokeWidth: 3, camLayout: "full", camSplitPct: 42, camBubbleSize: 200, videoTextOverlay: false, camSplitReverseTB: false, camSubtitleTop: false, bubblePos: "br", textBubbleSize: 420, cornerClockOn: false, cornerClockPos: "top-left" };

  // Sama seperti koorColorForBg() di present.html (Layar 2) -- kuning
  // terang kontras bagus di latar gelap tapi nyaris tak kelihatan di
  // latar terang (tema Terang/Sepia), jadi diganti emas gelap otomatis.
  function koorColorForBg(hex) {
    const h = String(hex || "").replace("#", "");
    if (h.length !== 6) return "#ffd84a";
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    return luma > 170 ? "#8a6d00" : "#ffd84a";
  }

  // Selain dikirim ke Layar 2, font & warna tema juga diterapkan ke
  // kotak pratinjau Studio sendiri (#psPreviewBoxWrap) -- supaya
  // pratinjau "Tayang" benar-benar 1:1 mirip Layar 2 (bukan cuma warna
  // gelap default), termasuk untuk akurasi posisi Penunjuk/Pen yang
  // bergantung pada baris kalimat patah di titik yang sama.
  function applyThemeToStudioPreview(theme) {
    const wrap = el("psPreviewBoxWrap");
    if (!wrap) return;
    const bg = theme.bgColor || DEFAULT_STAGE_THEME.bgColor;
    wrap.style.setProperty("--ps-preview-bg", bg);
    wrap.style.setProperty("--ps-preview-ink", theme.ink || DEFAULT_STAGE_THEME.ink);
    wrap.style.setProperty("--ps-preview-koor", koorColorForBg(bg));
    const box = el("psPreviewBox");
    if (box) box.style.fontFamily = theme.font || DEFAULT_STAGE_THEME.font;
  }

  function applyStoredTheme() {
    const raw = localStorage.getItem(THEME_KEY);
    let theme = { ...DEFAULT_STAGE_THEME };
    if (raw) { try { theme = { ...theme, ...JSON.parse(raw) }; } catch (e) {} }
    document.querySelectorAll("#psThemeGrid [data-theme]").forEach((b) => b.classList.toggle("active", b.dataset.theme === theme.swatch));
    if (el("psFontSelect")) el("psFontSelect").value = theme.font;
    if (el("psBgColor")) el("psBgColor").value = theme.bgColor;
    if (el("psFontScale")) el("psFontScale").value = String(Math.round(theme.scale * 100));
    // BARU (4 Sep 2026) -- pulihkan juga angka % yang ditampilkan di
    // samping slider Ukuran Teks/Spasi Baris saat panel dibuka ulang.
    if (el("psFontScaleValue")) el("psFontScaleValue").value = Math.round(theme.scale * 100);
    if (el("psFontScaleValueCam")) el("psFontScaleValueCam").value = Math.round(theme.scale * 100); // BARU (7 Sep 2026 v4)
    if (el("psLineHeight")) el("psLineHeight").value = String(Math.round(theme.lineHeight * 100));
    if (el("psLineHeightValue")) el("psLineHeightValue").value = Math.round(theme.lineHeight * 100);
    // BARU (28 Agu 2026) -- "Ukuran Konten" (lebar kotak teks di
    // layar), lihat catatan --p-content-scale di present.html.
    if (el("psContentScale")) el("psContentScale").value = String(Math.round((theme.contentScale || 1) * 100));
    // BARU (6 Sep 2026) -- pulihkan slider "Ukuran Timer/Stopwatch" saat
    // panel Studio dibuka ulang/dimuat ulang, pola sama seperti
    // psContentScale di atas.
    if (el("psTimerScale")) el("psTimerScale").value = String(Math.round((theme.timerScale || 1) * 100));
    if (el("psTimerScaleValue")) el("psTimerScaleValue").value = Math.round((theme.timerScale || 1) * 100);
    // BARU (12 Sep 2026) -- pulihkan tombol gaya tampilan Timer/Stopwatch
    // aktif ("Klasik"/"⭕ Lingkaran Besar") saat panel dibuka ulang, pola
    // SAMA seperti tombol posisi Jam Target di bawah.
    if (el("psTimerStyleRow")) {
      const savedStyle = theme.timerStyle || "classic";
      Array.from(el("psTimerStyleRow").querySelectorAll("[data-timer-style]")).forEach((b) => {
        b.classList.toggle("active", b.dataset.timerStyle === savedStyle);
      });
    }
    // PERBAIKAN (7 Sep 2026) -- pulihkan juga tombol aktif "WARNA ANGKA
    // COUNTDOWN" (Jam Target) saat panel dibuka ulang -- sebelumnya tidak
    // dipulihkan sama sekali di sini (beda dari kirim ke Layar 2 di atas
    // yang sudah diperbaiki juga, lihat catatan panjang di
    // saveAndSendTheme()).
    if (el("psTimerClockColorRow")) {
      const savedColor = theme.timerClockColor || "";
      Array.from(el("psTimerClockColorRow").querySelectorAll("[data-timerclock-color]")).forEach((b) => {
        b.classList.toggle("active", b.dataset.timerclockColor === savedColor);
      });
    }
    if (el("psTimerClockColorCustom") && theme.timerClockColor) el("psTimerClockColorCustom").value = theme.timerClockColor;
    // BARU (7 Sep 2026 v3) -- pulihkan juga tombol aktif WARNA STROKE
    // angka Jam Target (pola SAMA seperti warna angka di atas).
    if (el("psTimerClockStrokeRow")) {
      const savedStroke = theme.timerClockStroke || "";
      Array.from(el("psTimerClockStrokeRow").querySelectorAll("[data-timerclock-stroke]")).forEach((b) => {
        b.classList.toggle("active", b.dataset.timerclockStroke === savedStroke);
      });
    }
    if (el("psTimerClockStrokeCustom") && theme.timerClockStroke) el("psTimerClockStrokeCustom").value = theme.timerClockStroke;
    if (el("psTimerClockStrokeWidthRow")) {
      const savedW = theme.timerClockStrokeWidth || 3;
      Array.from(el("psTimerClockStrokeWidthRow").querySelectorAll("[data-timerclock-stroke-w]")).forEach((b) => {
        b.classList.toggle("active", Number(b.dataset.timerclockStrokeW) === savedW);
      });
    }
    // BARU (7 Sep 2026) -- pulihkan tombol posisi Jam Target yang aktif.
    if (el("psTimerClockPosGrid")) {
      const savedPos = theme.timerClockPos || "center";
      Array.from(el("psTimerClockPosGrid").querySelectorAll("[data-timerclock-pos]")).forEach((b) => {
        b.classList.toggle("active", b.dataset.timerclockPos === savedPos);
      });
    }
    // BARU (4 Sep 2026) -- pulihkan status centang "Tulisan Tebal" saat
    // panel Studio dibuka ulang/dimuat ulang.
    if (el("psFontBold")) el("psFontBold").checked = !!theme.bold;
    // BARU (8 Sep 2026) -- pulihkan tombol aktif Tata Letak Kamera
    // (Penuh/Split/Subtitle/Bubble) & slider "Ukuran Zona Kamera", lihat
    // catatan panjang camLayout/camSplitPct di DEFAULT_STAGE_THEME.
    if (el("psCamLayoutRow")) {
      const savedLayout = theme.camLayout || "full";
      Array.from(el("psCamLayoutRow").querySelectorAll("[data-cam-layout]")).forEach((b) => {
        b.classList.toggle("active", b.dataset.camLayout === savedLayout);
      });
    }
    if (el("psCamSplitPctSlider")) {
      const savedPct = theme.camSplitPct || 42;
      el("psCamSplitPctSlider").value = String(savedPct);
      if (el("psCamSplitPctValue")) el("psCamSplitPctValue").value = savedPct;
    }
    // BARU (9 Sep 2026) -- pulihkan centang "Balik Sisi".
    if (el("psCamSplitReverse")) el("psCamSplitReverse").checked = !!theme.camSplitReverse;
    // BARU (9 Sep 2026, sesi ke-9) -- pulihkan 2 centang orientasi baru.
    if (el("psCamSplitReverseTB")) el("psCamSplitReverseTB").checked = !!theme.camSplitReverseTB;
    if (el("psCamSubtitleTop")) el("psCamSubtitleTop").checked = !!theme.camSubtitleTop;
    // BARU (8 Sep 2026 v3) -- pulihkan slider "Ukuran lingkaran Kamera".
    if (el("psCamBubbleSizeSlider")) {
      const savedBubble = theme.camBubbleSize || 200;
      el("psCamBubbleSizeSlider").value = String(savedBubble);
      if (el("psCamBubbleSizeValue")) el("psCamBubbleSizeValue").value = savedBubble;
    }
    // BARU (9 Sep 2026, sesi ke-9) -- pulihkan tombol posisi bubble aktif
    // & slider "Ukuran lingkaran Teks" (mode textbubble).
    if (el("psBubblePosRow")) {
      const savedPos = theme.bubblePos || "br";
      Array.from(el("psBubblePosRow").querySelectorAll("[data-bubble-pos]")).forEach((b) => {
        b.classList.toggle("active", b.dataset.bubblePos === savedPos);
      });
    }
    if (el("psTextBubbleSizeSlider")) {
      const savedTextBubble = theme.textBubbleSize || 420;
      el("psTextBubbleSizeSlider").value = String(savedTextBubble);
      if (el("psTextBubbleSizeValue")) el("psTextBubbleSizeValue").value = savedTextBubble;
    }
    // BARU (8 Sep 2026) -- pulihkan status centang "Ayat/Kidung/Pengumuman
    // TETAP tampil di atas video".
    if (el("psVideoTextOverlay")) el("psVideoTextOverlay").checked = !!theme.videoTextOverlay;
    // BARU (8 Sep 2026 v4) -- pulihkan status centang "Latar teks
    // transparan" (mode "Kamera Atas, Teks Bawah").
    if (el("psStageTransparent")) el("psStageTransparent").checked = !!theme.stageTransparent;
    // BARU (12 Sep 2026 v2) -- pulihkan sakelar & posisi 🕐 Jam Pojok.
    if (el("psCornerClockOn")) el("psCornerClockOn").checked = !!theme.cornerClockOn;
    if (el("psCornerClockPosRow")) {
      const savedCcPos = theme.cornerClockPos || "top-left";
      Array.from(el("psCornerClockPosRow").querySelectorAll("[data-corner-clock-pos]")).forEach((b) => {
        b.classList.toggle("active", b.dataset.cornerClockPos === savedCcPos);
      });
    }
    applyThemeToStudioPreview(theme);
    // PERBAIKAN (9 Sep 2026, sesi ke-9) -- `camSplitReverse` ("🔁 Balik
    // Sisi" mode split kiri-kanan) SEBELUMNYA tidak pernah ikut daftar
    // field yang dikirim ke Layar 2 di sini (cuma tersimpan & dipakai
    // pratinjau Studio sendiri lewat applyThemeToStudioPreview di atas)
    // -- jadi kalau operator centang/hilangkan itu SAAT peta/kumpulan
    // ayat sudah tayang, Layar 2 (yang dilihat jemaat) tidak ikut
    // berubah sampai sesuatu yang lain memicu kirim ulang. Ditambahkan
    // di sini, sekalian dengan 2 toggle orientasi baru (camSplitReverseTB,
    // camSubtitleTop) supaya ketiganya konsisten benar-benar live.
    rawPost({ type: "theme", theme: { font: theme.font, bgColor: theme.bgColor, ink: theme.ink, scale: theme.scale, lineHeight: theme.lineHeight, contentScale: theme.contentScale, bold: theme.bold, timerScale: theme.timerScale, timerStyle: theme.timerStyle, timerClockColor: theme.timerClockColor, timerClockPos: theme.timerClockPos, timerClockStroke: theme.timerClockStroke, timerClockStrokeWidth: theme.timerClockStrokeWidth, camLayout: theme.camLayout, camSplitPct: theme.camSplitPct, camBubbleSize: theme.camBubbleSize, videoTextOverlay: theme.videoTextOverlay, stageTransparent: theme.stageTransparent, camSplitReverse: theme.camSplitReverse, camSplitReverseTB: theme.camSplitReverseTB, camSubtitleTop: theme.camSubtitleTop, bubblePos: theme.bubblePos, textBubbleSize: theme.textBubbleSize, cornerClockOn: theme.cornerClockOn, cornerClockPos: theme.cornerClockPos } });
  }

  function saveAndSendTheme(partial) {
    const raw = localStorage.getItem(THEME_KEY);
    let theme = { ...DEFAULT_STAGE_THEME };
    if (raw) { try { theme = { ...theme, ...JSON.parse(raw) }; } catch (e) {} }
    theme = { ...theme, ...partial };
    localStorage.setItem(THEME_KEY, JSON.stringify(theme));
    applyThemeToStudioPreview(theme);
    // PERBAIKAN (7 Sep 2026) -- `timerClockColor` sebelumnya TIDAK ikut
    // disertakan di sini (cuma tersimpan ke localStorage lewat baris
    // `theme = {...theme, ...partial}` di atas, TAPI tidak pernah benar-
    // benar terkirim ke Layar 2 lewat rawPost() di bawah, karena objek
    // literal ini secara eksplisit menyebutkan properti satu-satu, dan
    // `timerClockColor` waktu itu belum ditambahkan ke daftarnya) --
    // inilah sebab warna yang dipilih di "WARNA ANGKA COUNTDOWN" terlihat
    // aktif di tombolnya sendiri tapi TIDAK PERNAH benar-benar mengubah
    // warna di Layar 2 (present.html diam-diam jatuh ke warna aksen tema
    // bawaan, lihat --p-timerclock-color, karena variabelnya memang tidak
    // pernah dikirim/diset).
    // PERBAIKAN (9 Sep 2026, sesi ke-9) -- lihat catatan panjang di
    // applyThemeToStudioPreview()/rawPost pertama di atas soal
    // `camSplitReverse` yang sebelumnya tidak ikut terkirim live.
    rawPost({ type: "theme", theme: { font: theme.font, bgColor: theme.bgColor, ink: theme.ink, scale: theme.scale, lineHeight: theme.lineHeight, contentScale: theme.contentScale, bold: theme.bold, timerScale: theme.timerScale, timerStyle: theme.timerStyle, timerClockColor: theme.timerClockColor, timerClockPos: theme.timerClockPos, timerClockStroke: theme.timerClockStroke, timerClockStrokeWidth: theme.timerClockStrokeWidth, camLayout: theme.camLayout, camSplitPct: theme.camSplitPct, camBubbleSize: theme.camBubbleSize, videoTextOverlay: theme.videoTextOverlay, camSplitReverse: theme.camSplitReverse, camSplitReverseTB: theme.camSplitReverseTB, camSubtitleTop: theme.camSubtitleTop, bubblePos: theme.bubblePos, textBubbleSize: theme.textBubbleSize, cornerClockOn: theme.cornerClockOn, cornerClockPos: theme.cornerClockPos } });
  }

  // BARU -- "terapkan tema kiriman": dipanggil dari js/collections.js
  // (tombol di panel Kumpulan Ayat) saat kumpulan yang diterima dari
  // akun lain membawa metadata tema (lihat shareCollectionToUser_() di
  // apps-script/Code.gs -- tema TERSIMPAN sejak awal, cuma belum ada
  // cara menerapkannya di sisi penerima sebelum fungsi ini ada).
  // Bentuknya PERSIS sama dengan objek yang tersimpan di THEME_KEY
  // ({ swatch, bgColor, ink, font, scale }), jadi tinggal ditimpakan
  // lalu dipanggil ulang applyStoredTheme() supaya panel & Layar 2
  // (kalau sedang terbuka) langsung ikut berubah.
  function applySharedTheme(theme) {
    if (!theme || typeof theme !== "object") return false;
    const merged = { ...DEFAULT_STAGE_THEME, ...theme };
    localStorage.setItem(THEME_KEY, JSON.stringify(merged));
    applyStoredTheme();
    return true;
  }


  // ------------------------------------------------------------
  // Tema PANEL Studio (dark/light) -- terpisah total dari "Tema Layar
  // Proyeksi" di atas. Ini hanya mengubah tampilan panel kontrol
  // Studio itu sendiri (kolom kiri/tengah/kanan), lewat kelas
  // .ps-ui-light di #presentStudio (lihat css/style.css). Tombol bulat
  // ☀️/🌙 di ps-topbar.
  // ------------------------------------------------------------
  function applyUiTheme(mode) {
    const studio = el("presentStudio");
    const btn = el("psUiThemeToggle");
    const isLight = mode === "light";
    if (studio) studio.classList.toggle("ps-ui-light", isLight);
    if (btn) btn.textContent = isLight ? "🌙" : "☀️";
    if (btn) btn.title = isLight ? "Ganti ke tema gelap" : "Ganti ke tema terang";
  }

  function wireUiTheme() {
    const stored = localStorage.getItem(UI_THEME_KEY) || "dark";
    applyUiTheme(stored);
    if (el("psUiThemeToggle")) {
      el("psUiThemeToggle").addEventListener("click", () => {
        const next = (localStorage.getItem(UI_THEME_KEY) || "dark") === "dark" ? "light" : "dark";
        localStorage.setItem(UI_THEME_KEY, next);
        applyUiTheme(next);
      });
    }
  }

  // ------------------------------------------------------------
  // Jam berjalan di ps-topbar -- memakai jam PERANGKAT (client), bukan
  // permintaan khusus ke server, karena tidak ada endpoint waktu di
  // proyek ini. Selama jam komputer/laptop operator sudah benar
  // (biasanya otomatis tersinkron lewat internet/NTP), jam ini akan
  // akurat. Diperbarui tiap detik.
  // ------------------------------------------------------------
  let clockInterval = null;
  function wireClock() {
    const clockEl = el("psTopbarClock");
    if (!clockEl) return;
    function tick() {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      const tgl = now.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
      clockEl.textContent = `${tgl} — ${hh}:${mm}:${ss}`;
    }
    tick();
    if (clockInterval) clearInterval(clockInterval);
    clockInterval = setInterval(tick, 1000);
  }

  function wireTheme() {
    document.querySelectorAll("#psThemeGrid [data-theme]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#psThemeGrid [data-theme]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const t = THEMES[btn.dataset.theme];
        if (el("psBgColor")) el("psBgColor").value = t.bg;
        saveAndSendTheme({ swatch: btn.dataset.theme, bgColor: t.bg, ink: t.ink });
      });
    });
    if (el("psFontSelect")) el("psFontSelect").addEventListener("change", () => saveAndSendTheme({ font: el("psFontSelect").value }));
    if (el("psBgColor")) el("psBgColor").addEventListener("input", () => saveAndSendTheme({ bgColor: el("psBgColor").value }));
    // BARU (4 Sep 2026) -- toggle "Tulisan Tebal" (Layar 2).
    if (el("psFontBold")) el("psFontBold").addEventListener("change", () => saveAndSendTheme({ bold: el("psFontBold").checked }));
    function applyScale() {
      const pct = Number(el("psFontScale").value);
      if (el("psFontScaleValue")) el("psFontScaleValue").value = pct; // BARU (4 Sep 2026)
      // BARU (7 Sep 2026 v4) -- ikut perbarui angka % di panel gabungan
      // (tab "📷 Kamera") juga, supaya ketiga tempat A-/A+ selalu tampil
      // angka yang sama persis.
      if (el("psFontScaleValueCam")) el("psFontScaleValueCam").value = pct;
      saveAndSendTheme({ scale: pct / 100 });
    }
    if (el("psFontScale")) el("psFontScale").addEventListener("input", applyScale);
    // PERMINTAAN OPERATOR (6 Sep 2026): batas atas dinaikkan dari 160%
    // jadi 480% (3x lipat) -- lihat catatan panjang di <input id=
    // "psFontScale"> (index.html). Langkah +/- (10) TIDAK diubah, cuma
    // batas atasnya, jadi kebiasaan menekan A+ berkali-kali tetap terasa
    // sama, cuma sekarang bisa diteruskan lebih jauh.
    if (el("psFontDec")) el("psFontDec").addEventListener("click", () => { el("psFontScale").value = Math.max(60, Number(el("psFontScale").value) - 10); applyScale(); });
    if (el("psFontInc")) el("psFontInc").addEventListener("click", () => { el("psFontScale").value = Math.min(480, Number(el("psFontScale").value) + 10); applyScale(); });
    // BARU (12 Sep 2026) -- kolom angka bisa diketik manual, SAMA
    // seperti Kaca Pembesar (lihat wireManualValueInput() di atas
    // wirePointerPen()). psFontScaleValueCam TIDAK punya slider
    // sendiri (cuma duplikat tampilan di tab "📷 Kamera"), jadi
    // sengaja diarahkan ke slider psFontScale yang SAMA -- mengetik
    // angka di SALAH SATU dari 2 kotak ini (tab Tampilan atau tab
    // Kamera) otomatis menyamakan keduanya lewat applyScale().
    wireManualValueInput("psFontScaleValue", "psFontScale");
    wireManualValueInput("psFontScaleValueCam", "psFontScale");
    // Duplikat A-/A+ di baris ps-preview-quicktools (selalu kelihatan di
    // atas kotak "Tayang") -- pakai fungsi applyScale() & psFontScale yang
    // SAMA (sumber kebenaran tetap 1: psFontScale), jadi kedua pasang
    // tombol (di sini & di tab "🎨 Tampilan") selalu sinkron satu sama lain.
    if (el("psFontDecTop")) el("psFontDecTop").addEventListener("click", () => { el("psFontScale").value = Math.max(60, Number(el("psFontScale").value) - 10); applyScale(); });
    if (el("psFontIncTop")) el("psFontIncTop").addEventListener("click", () => { el("psFontScale").value = Math.min(480, Number(el("psFontScale").value) + 10); applyScale(); });
    // BARU (7 Sep 2026 v4, permintaan operator "satu tempat saja") --
    // pasangan A-/A+ KETIGA, di panel gabungan Warna/Stroke/Ukuran Huruf
    // (tab "📷 Kamera") -- SUMBER DATA SAMA (psFontScale/applyScale()),
    // cuma tampilan tombolnya digandakan supaya operator tidak perlu
    // pindah tab buat urus warna+stroke+ukuran huruf sekaligus.
    if (el("psFontDecCam")) el("psFontDecCam").addEventListener("click", () => { el("psFontScale").value = Math.max(60, Number(el("psFontScale").value) - 10); applyScale(); });
    if (el("psFontIncCam")) el("psFontIncCam").addEventListener("click", () => { el("psFontScale").value = Math.min(480, Number(el("psFontScale").value) + 10); applyScale(); });
    // BARU (6 Sep 2026, permintaan operator) -- "Ukuran Timer/Stopwatch",
    // SLIDER TERPISAH dari "Ukuran Teks" di atas (lihat catatan panjang
    // di DEFAULT_STAGE_THEME.timerScale & <input id="psTimerScale">,
    // index.html) -- rentang jauh lebih lebar (50%-1000% / 0.5x-10x)
    // karena dipakai untuk angka Timer/Stopwatch yang kadang perlu
    // terlihat dari jauh (permainan/aktivitas), bukan cuma ayat.
    function applyTimerScale() {
      const pct = Number(el("psTimerScale").value);
      if (el("psTimerScaleValue")) el("psTimerScaleValue").value = pct;
      saveAndSendTheme({ timerScale: pct / 100 });
    }
    if (el("psTimerScale")) el("psTimerScale").addEventListener("input", applyTimerScale);
    if (el("psTimerScaleDec")) el("psTimerScaleDec").addEventListener("click", () => { el("psTimerScale").value = Math.max(50, Number(el("psTimerScale").value) - 25); applyTimerScale(); });
    if (el("psTimerScaleInc")) el("psTimerScaleInc").addEventListener("click", () => { el("psTimerScale").value = Math.min(1000, Number(el("psTimerScale").value) + 25); applyTimerScale(); });
    wireManualValueInput("psTimerScaleValue", "psTimerScale");
    // BARU (28 Agu 2026) -- "Spasi Baris" (line-height Layar 2, lihat
    // --p-line-height di present.html). PERMINTAAN OPERATOR: teks
    // panjang (mis. hasil unggah file Word/.doc, lihat wireFileTab())
    // butuh bisa dirapatkan spasinya supaya lebih banyak muat di layar,
    // atau direnggangkan supaya lebih lega dibaca -- terpisah dari
    // "Ukuran Teks" (psFontScale) supaya kedua hal ini bisa diatur
    // sendiri-sendiri (font besar+spasi rapat, atau sebaliknya).
    function applyLineHeight() {
      const pct = Number(el("psLineHeight").value);
      if (el("psLineHeightValue")) el("psLineHeightValue").value = pct; // BARU (4 Sep 2026)
      saveAndSendTheme({ lineHeight: pct / 100 });
    }
    if (el("psLineHeight")) el("psLineHeight").addEventListener("input", applyLineHeight);
    // BARU (4 Sep 2026) -- batas bawah ikut diturunkan ke 60 (lihat catatan
    // di input range-nya sendiri di index.html).
    if (el("psLineHeightDec")) el("psLineHeightDec").addEventListener("click", () => { el("psLineHeight").value = Math.max(60, Number(el("psLineHeight").value) - 10); applyLineHeight(); });
    if (el("psLineHeightInc")) el("psLineHeightInc").addEventListener("click", () => { el("psLineHeight").value = Math.min(250, Number(el("psLineHeight").value) + 10); applyLineHeight(); });
    wireManualValueInput("psLineHeightValue", "psLineHeight");

    // BARU (28 Agu 2026) -- "Ukuran Konten": lebar kotak teks/jarak
    // tepi di Layar 2 (lihat --p-content-scale di present.html) --
    // dipersempit (<100%) cocok dipakai bersama 🎥 Kamera/🖼️ Gambar
    // Latar supaya latar lebih terlihat di tepi layar, atau dilebarkan
    // (>100%) supaya teks memakai hampir seluruh lebar layar.
    function applyContentScale() {
      const pct = Number(el("psContentScale").value);
      if (el("psContentScaleValue")) el("psContentScaleValue").value = pct;
      saveAndSendTheme({ contentScale: pct / 100 });
    }
    if (el("psContentScale")) el("psContentScale").addEventListener("input", applyContentScale);
    if (el("psContentScaleDec")) el("psContentScaleDec").addEventListener("click", () => { el("psContentScale").value = Math.max(60, Number(el("psContentScale").value) - 10); applyContentScale(); });
    if (el("psContentScaleInc")) el("psContentScaleInc").addEventListener("click", () => { el("psContentScale").value = Math.min(140, Number(el("psContentScale").value) + 10); applyContentScale(); });
    wireManualValueInput("psContentScaleValue", "psContentScale");
  }

  // ------------------------------------------------------------
  // Splitter kotak pratinjau dual monitor (#psPreviewResizeHandle) --
  // seret naik/turun untuk membesar/mengecilkan baris "Berikutnya" +
  // "Tayang" (permintaan operator: dulu terpotong & tidak bisa
  // diperbesar). Menyetel 2 variabel CSS di elemen #presentStudio:
  //   --ps-preview-row-h : tinggi baris grid (dipakai .ps-columns)
  //   --ps-preview-box-h : tinggi kotak Berikutnya/Tayang itu sendiri
  //                        (row dikurangi tinggi label kecil di atasnya)
  // Lebar kotak TIDAK disetel langsung -- otomatis ikut membesar lewat
  // aspect-ratio 16:9 di CSS (.ps-preview-box-wrap), jadi menyeret lebih
  // tinggi = kotak (lebar & tinggi) membesar bersama sampai sebesar
  // layar mengizinkan. Ukuran terakhir diingat lewat localStorage per
  // perangkat (bukan disinkron akun -- sama seperti Media Tersimpan).
  // ------------------------------------------------------------
  function wirePreviewResize() {
    const handle = el("psPreviewResizeHandle");
    const studio = el("presentStudio");
    if (!handle || !studio) return;
    const STORAGE_KEY = "bible_app_studio_preview_row_h_v1";
    const LABEL_OVERHEAD_FALLBACK = 60; // dipakai kalau pengukuran nyata gagal (elemen belum ada di DOM)
    const MIN_ROW = 150;
    // PERMINTAAN OPERATOR (28 Agu 2026, direvisi lagi hari yang sama, lalu
    // direvisi SEKALI LAGI di hari yang sama juga -- lihat mockup yang
    // dikirim operator): batas atas 82% tinggi jendela SEHARUSNYA sudah
    // longgar, TAPI ternyata kotak "Berikutnya"/"Tayang" tidak pernah
    // benar-benar mencapai sebesar itu -- sebabnya BUKAN batas tinggi ini,
    // melainkan LEBAR kotak yang diam-diam terpotong oleh aturan CSS
    // `max-width: 47%` di .ps-preview-slot (lihat css/style.css, blok
    // .ps-dual-live). Dulu tinggi kotak (--ps-preview-box-h) terus
    // membesar mengikuti seretan splitter TANPA PERNAH dicek apakah
    // lebar hasil rasio 16:9-nya (tinggi × 16/9) masih muat di dalam
    // batas 47% lebar panel itu -- begitu tidak muat, CSS max-width
    // "menang" & memotong lebarnya, sehingga kotak jadi PENYOK (rasio
    // rusak, bukan lagi 16:9) alih-alih membesar rapi. Splitter jadi
    // TERASA mentok jauh lebih awal daripada batas 82vh yang sebenarnya.
    //
    // Perbaikan: batas atas splitter sekarang dihitung dari DUA sisi
    // sekaligus -- (a) tinggi jendela (longgar, 92%) DAN (b) lebar panel
    // pratinjau yang sungguh tersedia untuk 1 kotak (lebar baris dikurangi
    // tombol "▶ Tayangkan" di tengah & jarak antar-elemen, dibagi 2),
    // dikonversi balik ke tinggi maksimum lewat rasio Layar 2 yang
    // sungguh aktif (--ps-preview-ratio, sama seperti present.html) --
    // lalu dipakai yang PALING KECIL di antara keduanya. Hasilnya:
    // splitter selalu bisa diseret sampai BENAR-BENAR mentok (kotak
    // sebesar mungkin, memenuhi lebar ATAU tinggi yang tersedia, mana
    // yang lebih dulu habis) TANPA PERNAH membuat kotaknya penyok --
    // bentuknya selalu identik dengan Layar 2 (present.html) sungguhan.
    // BARU (4 Sep 2026, permintaan operator) -- laporan: "saat tampilkan
    // YouTube, kotaknya turun tapi splitter tidak turun, jadi kotak
    // Berikutnya/Tayang kepotong separuh". Sebabnya: begitu video
    // YouTube tayang, progress bar + kolom waktu LIVE (#psYtLiveBar,
    // lihat syncYtLiveBarVisibility() & wireYtControls()) MUNCUL sebagai
    // baris TAMBAHAN di atas kotak Berikutnya/Tayang -- satu induk yang
    // sama (#psPreviewPanel) dengan tinggi TOTAL tetap (--ps-preview-
    // row-h). Dulu ruang untuk baris tambahan itu tidak pernah
    // diperhitungkan (LABEL_OVERHEAD selalu 60px tetap, cuma cukup utk
    // label "Berikutnya/Tayang" + padding panel) -- begitu livebar
    // muncul, dia "mencuri" ruang dari kotak tanpa kotak/splitter ikut
    // menyesuaikan, sehingga kotak (--ps-preview-box-h, tetap dihitung
    // pakai overhead lama yang lebih kecil) jadi lebih tinggi dari sisa
    // ruang yang sungguh ada & terlihat kepotong.
    // Perbaikan: overhead sekarang DIUKUR NYATA dari DOM (padding panel +
    // tinggi label + tinggi livebar KALAU sedang tampil), bukan angka
    // tetap -- otomatis ikut bertambah saat livebar muncul & berkurang
    // lagi saat disembunyikan (dipanggil ulang lewat
    // window.refreshPreviewSplitterSpacing(), dipanggil dari
    // syncYtLiveBarVisibility() tiap kali livebar berganti tampil/sembunyi).
    function currentOverhead() {
      const panel = el("psPreviewPanel");
      const head = panel ? panel.querySelector(".ps-preview-panel-head") : null;
      if (!panel || !head) return LABEL_OVERHEAD_FALLBACK;
      let h = 0;
      try {
        const cs = getComputedStyle(panel);
        h += (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
      } catch (e) {}
      h += head.getBoundingClientRect().height;
      const liveBar = el("psYtLiveBar");
      if (liveBar && !liveBar.hidden) h += liveBar.getBoundingClientRect().height + 6;
      return h > 0 ? Math.round(h) + 6 : LABEL_OVERHEAD_FALLBACK;
    }
    function currentRatio() {
      const raw = getComputedStyle(document.documentElement).getPropertyValue("--ps-preview-ratio");
      const m = raw && raw.match(/([\d.]+)\s*\/\s*([\d.]+)/);
      if (m) {
        const w = parseFloat(m[1]), h = parseFloat(m[2]);
        if (w > 0 && h > 0) return w / h;
      }
      return 16 / 9;
    }
    function maxRowByWidth() {
      const row = el("psPreviewRow");
      if (!row) return Infinity;
      const rowW = row.getBoundingClientRect().width;
      if (!(rowW > 0)) return Infinity;
      const center = el("psPreviewCenter");
      const centerW = (center && !center.hidden) ? center.getBoundingClientRect().width : 0;
      let gap = 14;
      try {
        const g = parseFloat(getComputedStyle(row).columnGap || getComputedStyle(row).gap);
        if (g >= 0) gap = g;
      } catch (e) {}
      // 2 celah (kiri & kanan tombol tengah) dikurangi dari lebar baris,
      // sisanya dibagi 2 untuk 1 kotak (Berikutnya ATAU Tayang).
      const perSlotW = Math.max(60, (rowW - centerW - gap * 2) / 2);
      const boxH = perSlotW / currentRatio();
      return Math.round(boxH + currentOverhead());
    }
    function maxRow() {
      const byHeight = Math.round(window.innerHeight * 0.92);
      const byWidth = maxRowByWidth();
      return Math.max(MIN_ROW, Math.min(byHeight, byWidth));
    }
    function apply(rowPx) {
      const clamped = Math.max(MIN_ROW, Math.min(maxRow(), Math.round(rowPx)));
      studio.style.setProperty("--ps-preview-row-h", clamped + "px");
      studio.style.setProperty("--ps-preview-box-h", Math.max(90, clamped - currentOverhead()) + "px");
      try { localStorage.setItem(STORAGE_KEY, String(clamped)); } catch (e) {}
    }
    // Dipanggil syncYtLiveBarVisibility() (atas) tiap kali #psYtLiveBar
    // berganti tampil/sembunyi, supaya kotak Berikutnya/Tayang LANGSUNG
    // menyusut/membesar mengikuti ruang yang sungguh tersisa, tanpa
    // perlu operator menyeret splitter sendiri atau me-resize jendela.
    window.refreshPreviewSplitterSpacing = () => apply(currentRowH());
    // PERBAIKAN (4 Sep 2026, permintaan operator): dulu kalau BELUM
    // PERNAH diseret sama sekali (localStorage kosong -- pemakaian
    // pertama, atau browser/perangkat baru), tidak ada apply() yang
    // dipanggil sama sekali -- --ps-preview-row-h & --ps-preview-box-h
    // dibiarkan kosong, jatuh ke nilai bawaan CSS (minmax(140px,14vh)
    // untuk tinggi BARIS, tapi 156px TETAP untuk tinggi KOTAK di
    // dalamnya) -- di banyak layar 14vh lebih PENDEK dari 156px+label,
    // jadi kotak "Berikutnya"/"Tayang" ikut TERPOTONG separuh sejak
    // awal, padahal splitter-nya sendiri sebenarnya sudah bisa
    // diseret kalau operator tahu harus menyeretnya dulu. Sekarang
    // SELALU dipanggil apply() sejak awal -- pakai ukuran tersimpan
    // kalau ada, atau ukuran bawaan yang wajar (cukup untuk kotak
    // 16:9 utuh tanpa terpotong) kalau belum pernah diseret sama
    // sekali -- supaya kotak selalu tampil UTUH sejak pertama kali
    // dibuka, splitter cuma untuk memperbesar/memperkecil dari situ.
    const DEFAULT_ROW = 260;
    try {
      const saved = Number(localStorage.getItem(STORAGE_KEY));
      apply(saved || DEFAULT_ROW);
    } catch (e) {
      apply(DEFAULT_ROW);
    }
    let dragging = false, startY = 0, startRow = 0;
    function currentRowH() {
      const panel = el("psPreviewPanel");
      return panel ? panel.getBoundingClientRect().height : 220;
    }
    function onMove(e) {
      if (!dragging) return;
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      apply(startRow + (y - startY));
      e.preventDefault();
    }
    function onUp() {
      dragging = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onUp);
    }
    function onDown(e) {
      dragging = true;
      startY = e.touches ? e.touches[0].clientY : e.clientY;
      startRow = currentRowH();
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("touchend", onUp);
      e.preventDefault();
    }
    handle.addEventListener("mousedown", onDown);
    handle.addEventListener("touchstart", onDown, { passive: false });
    window.addEventListener("resize", () => apply(currentRowH()));
    // Rasio Layar 2 sungguhan bisa berubah kapan saja (mis. jendela Layar 2
    // di-resize operator) -- lihat dispatch "ps-preview-ratio-changed" di
    // applyPreviewRatio() (js/presentation.js). Hitung ulang & terapkan
    // batas baru supaya kotak "Berikutnya"/"Tayang" tidak jadi penyok.
    window.addEventListener("ps-preview-ratio-changed", () => apply(currentRowH()));
  }

  // ------------------------------------------------------------
  // Deteksi ukuran layar (khusus laptop/komputer) + gate mode tamu
  // ------------------------------------------------------------
  function refreshDeviceGate() {
    const desktop = isDesktop();
    const isGuestNow = typeof Guest !== "undefined" && Guest.isGuest();
    if (el("presentOpenStudioBtn")) el("presentOpenStudioBtn").hidden = !desktop;
    if (el("presentStudioMobileHint")) el("presentStudioMobileHint").hidden = desktop;
    // headerStudioBtn juga digerbangi Mode Tamu (lihat refreshGuestGate() di
    // js/presentation.js) -- dicek ulang di sini juga supaya resize jendela
    // tidak diam-diam memunculkannya lagi untuk tamu.
    if (el("headerStudioBtn")) el("headerStudioBtn").hidden = !desktop || isGuestNow;
    if (!desktop) closeStudio();
  }

  function refreshGuestGate() {
    const isGuestNow = typeof Guest !== "undefined" && Guest.isGuest();
    if (isGuestNow) closeStudio();
  }

  function init() {
    wireTabs("[data-ps-left-tab]", "data-ps-left-panel", "data-ps-left-tab");
    wireTabs("[data-ps-mid-tab]", "data-ps-mid-panel", "data-ps-mid-tab");
    wireTabs("[data-ps-right-tab]", "data-ps-right-panel", "data-ps-right-tab");
    wireAnnouncement();
    wireMessage();
    wireTimer();
    wireStopwatch();
    wireQuickVerse();
    wireFileTab();
    wireQuickActions();
    wireCamera();
    wireQuickText();
    wireTicker("psWarta", "warta");
    wireTicker("psFoot", "footnote");
    wirePointerPen();
    wireTheme();
    wireNextBox();
    wireUiTheme();
    wireClock();
    wireYoutubeTab();
    wireYtPlaylistTab();
    wireYtControls();
    wireLocalVideoTab(); // BARU (7 Sep 2026) -- tab "🎬 Video Lokal" (MP4 offline, tanpa upload)
    wireModeScreenTab(); // BARU (9 Sep 2026) -- tab "🖥️ Mode & Peta": Welcome/Next Up
    wireMapTab(); // BARU (9 Sep 2026) -- tab "🖥️ Mode & Peta": Peta Interaktif
    wireEffectsTab(); // BARU (9 Sep 2026) -- tab "🎉 Efek Panggung": confetti/reaksi & efek suara
    wireWheelTab(); // BARU (9 Sep 2026) -- tab "🎡 Roda Undian" (versi teks, 100% offline)
    wireKidungTab();
    wireLinkTab(); // BARU (4 Sep 2026) -- tab "🔗 Link" (Canva & SoundCloud)
    wireAiPresentationTab(); // BARU (4 Sep 2026 v3) -- tab "🤖 AI Presentation"
    wirePlaylistKeyNav();
    wireCollectionReorderToggle();
    wireCollectionNewButton();
    wireCollectionShareButton();
    wireCollectionDeleteAllButton();

    if (el("presentOpenStudioBtn")) el("presentOpenStudioBtn").addEventListener("click", openStudio);
    // Jalan pintas di header utama (index.html, ikon 🎛️ -- khusus laptop/
    // komputer, lihat refreshDeviceGate()) supaya operator tidak perlu
    // buka menu "⋮" dulu untuk sampai ke tombol "Buka Studio Presentasi".
    if (el("headerStudioBtn")) el("headerStudioBtn").addEventListener("click", openStudio);
    if (el("psOpenWindowBtn")) el("psOpenWindowBtn").addEventListener("click", () => { if (typeof Presentation !== "undefined") { Presentation.openWindow(); refreshStatusUi(); } });
    // BARU (10 Sep 2026, sesi ke-10) -- "🖥️③ Monitor Pembicara".
    if (el("psOpenMonitorBtn")) {
      el("psOpenMonitorBtn").addEventListener("click", () => {
        if (typeof Presentation !== "undefined" && Presentation.openMonitorWindow) {
          Presentation.openMonitorWindow();
          // Kirim status TERKINI segera setelah dibuka (kalau sudah ada
          // playlist aktif SEBELUM Monitor 3 ini dibuka) -- flushMonitorQueue()
          // di presentation.js sudah menahannya sampai monitor.html
          // mengabari siap, jadi aman dipanggil langsung di sini.
          pushMonitorStatus_();
        }
      });
    }
    if (el("psCloseStudioBtn")) el("psCloseStudioBtn").addEventListener("click", closeStudio);

    wirePreviewResize();

    window.addEventListener("resize", refreshDeviceGate);
    refreshDeviceGate();

    window.addEventListener("message", (e) => {
      if (e.origin !== location.origin) return;
      const data = e.data || {};
      if (data.source === "bibleAppPresenter" && data.type === "present_ready") {
        refreshStatusUi();
        applyStoredTheme();
      }
      // BARU (9 Sep 2026) -- 🎡 Roda Undian: Layar 2 mengonfirmasi balik
      // begitu animasi putaran selesai, lihat catatan panjang
      // wireWheelTab()/handleWheelResult_() di atas.
      if (data.source === "bibleAppPresenter" && data.type === "present_wheel_result") {
        handleWheelResult_(data);
      }
    });
  }

  return { init, openStudio, closeStudio, refreshGuestGate, applySharedTheme };
})();
