// ============================================================
//  AUDIO LATAR (background audio) -- MODUL TERPISAH
//  Dipindah keluar dari js/presentation-studio.js pada 19 Sep 2026
//  (permintaan operator: "setting audio di dalam presentation-studio.js
//  jadi agak sulit"). Berkas ini DIMUAT SEBELUM presentation-studio.js
//  (lihat urutan <script> di index.html) dan hanya menyediakan
//  window.BgAudioModule.create(deps).
//
//  PETA: mau ubah apa -> cari fungsi ini
//  ------------------------------------------------------------
//  jenis sumber (mp3 / yt / sc)  normBgKind_, isManagedBgKind_, guessBgKindFromUrl_
//  muat & kendali (play/jeda/    loadSharedBgAudio_, controlSharedBgAudio_
//    ulang/berhenti)
//  aturan per-slide (siap-arm,   handleBgForActiveItem_, startBgForItem_,
//    otomatis, lanjutkan, fade)    autoplayBgAudioIfEnabled_
//  status "SEDANG MAIN" dst      bgNowState_, BG_STATE_TEXT_, refreshBgRowBadges_
//  ikon 🎧 di baris Kumpulan     bgAudioRowIconHtml_
//  tombol mini di kotak "Tayang" bgAudioControlsHtml_, wireBgAudioControlsInBox_
//  dialog "🎧 Audio Latar"       openBgAudioDialog_
//  laporan dari Layar 2          handlePresenterMessage
//
//  Yang SENGAJA tetap di js/presentation-studio.js (terlalu terikat dengan
//  data Kidung/Kumpulan): panel "Audio Latar" di tab 🎵 Kidung
//  (wireKidungTab -> renderBgNowBar_, loadLinkAsBg_, checkbox panah kanan),
//  pemanggilan handle/autoplay dari sendGenericItemLive() & playlistNext(),
//  dan pembungkus openBgAudioDialog_(username, colId, index, it) yang
//  menyimpan hasilnya ke Kumpulan Ayat.
//  Sisi Layar 2: present.html (#ytBg, #scBg, #kidungBgAudio).
//  Gaya kotak status gelap: css/style.css (.ps-bg-now, .ps-bg-state).
//  Mode Layar Penuh 1 layar/HP punya versi ringkas sendiri di js/app.js
//  (handleFsBgAudioForItem_ dkk) -- BELUM memakai modul ini.
//
//  Ketergantungan (deps) yang diberikan Studio: rawPost, el, escapeHtml,
//  extractYoutubeId, buildYoutubeEmbedUrl. Global lain yang dipakai:
//  showSimpleDialog (js/app.js), document, window.
//  Uji cepat tanpa browser: lihat tests/bg-audio.test.js.
// ============================================================
(function (global) {
  "use strict";

  function create(deps) {
    // ------------------------------------------------------------
    // Semua pesan ke Layar 2 lewat rawPost() LOKAL ini (bukan deps.rawPost
    // langsung). Kalau tidak ada muat-berkas yang sedang menunggu, pesan
    // dikirim SEKETIKA (perilaku lama, sinkron). Kalau ada (berkas upload
    // yang harus dibaca dari IndexedDB dulu -- async), pesan berikutnya
    // (play, ulang, berhenti...) DIANTRE di belakangnya, supaya urutannya
    // tetap "muat -> play" dan "play" tidak tiba di Layar 2 sebelum
    // berkasnya sampai.
    // ------------------------------------------------------------
    const rawPostNow_ = deps.rawPost;
    let bgQueue_ = null;
    function trackQueue_(p) {
      bgQueue_ = p;
      const clear = () => { if (bgQueue_ === p) bgQueue_ = null; };
      p.then(clear, clear);
    }
    function rawPost(msg) {
      if (!bgQueue_) { rawPostNow_(msg); return; }
      trackQueue_(bgQueue_.then(() => rawPostNow_(msg)).catch((e) => console.error("bg-audio: gagal mengirim pesan", e)));
    }
    // `promiseOfMsg` = Promise yang menghasilkan pesan (atau null = batal).
    function rawPostAsync_(promiseOfMsg) {
      const base = bgQueue_ || Promise.resolve();
      trackQueue_(base.then(() => promiseOfMsg).then((m) => { if (m) rawPostNow_(m); }).catch((e) => console.error("bg-audio: gagal memuat audio", e)));
    }
    const el = deps.el;
    const escapeHtml = deps.escapeHtml;
    const extractYoutubeId = deps.extractYoutubeId;
    const buildYoutubeEmbedUrl = deps.buildYoutubeEmbedUrl;

    // ------------------------------------------------------------
    // BARU (18 Sep 2026 v3, permintaan operator "link mp3/youtube/mp4
    // kidung nempel di 1 syair, ada tombol ulang") -- status Audio Latar
    // BERSAMA, dipakai baik oleh panel tab "🎵 Kidung" (browsing kidung
    // langsung, sudah ada sejak 18 Sep 2026 v2) MAUPUN baris "📋 Kumpulan
    // Ayat" (kidung yang SUDAH tersimpan, bgAudio-nya lihat
    // addKidungToCollection() js/collections.js) -- SATU status supaya
    // tidak ada 2 audio latar nyala bertabrakan kalau operator berpindah
    // panel. Channel pengiriman ke Layar 2 (mp3_bg/yt_bg/dst) SAMA PERSIS
    // seperti sebelumnya, TIDAK menyentuh navigasi panah kiri/kanan
    // (wirePlaylistKeyNav()) sama sekali -- audio ini murni "nempel di
    // belakang layar", slide teks kidung/ayat/dll tetap dikendalikan
    // terpisah oleh sendGenericItemLive()/playlistGoTo() seperti biasa.
    // ------------------------------------------------------------
    let sharedBgAudio_ = null; // null ATAU { kind:"mp3"|"yt", url, label, loop }
    // BARU (18 Sep 2026 v5) -- lihat catatan panjang di reportBgAudioStatus_()/
    // kidungBgAudioEl "error" listener, present.html. null = belum ada
    // laporan gagal (atau sudah berhasil lagi), ATAU { url, message }
    // kalau link yg SEDANG dimuat (sharedBgAudio_.url) ternyata gagal
    // diputar di Layar 2.
    let sharedBgAudioError_ = null;
    const sharedBgAudioListeners_ = []; // dipanggil ulang tiap status berubah -- HANYA utk listener yang HIDUP SELAMA Studio terbuka (mis. panel tab "🎵 Kidung", didaftarkan SEKALI saat wireKidungTab() jalan), BUKAN utk elemen yang dibuat ulang tiap render (lihat previewBgAudioRefresh_ di bawah -- kalau dipakai array ini malah bocor memori, nambah terus tiap ganti slide)
    function onSharedBgAudioChange_(fn) { sharedBgAudioListeners_.push(fn); }
    // Slot TUNGGAL (bukan array) khusus mini-kontrol Audio Latar di kotak
    // "Tayang" (#psPreviewBox) -- ditimpa ulang tiap kali renderStudioPreview()
    // menggambar slide kidung baru (lihat sana), supaya tidak menumpuk
    // referensi ke elemen lama yang sudah dibuang dari DOM.
    let previewBgAudioRefresh_ = null;
    function notifySharedBgAudioChange_() {
      sharedBgAudioListeners_.forEach((fn) => { try { fn(); } catch (e) {} });
      if (previewBgAudioRefresh_) { try { previewBgAudioRefresh_(); } catch (e) {} }
      try { refreshBgRowBadges_(); } catch (e) {}
    }
    // ------------------------------------------------------------
    // BARU (19 Sep 2026, permintaan operator "gambar/ikon 🎧 semuanya sama,
    // tidak kelihatan lagunya sudah nyala atau belum -- buat latarnya gelap")
    // -- STATUS Audio Latar yang JELAS, dipakai 3 tempat sekaligus: kotak gelap
    // di panel Kidung (renderBgNowBar_), penanda di tiap baris Kumpulan Ayat
    // (refreshBgRowBadges_) dan tombol mini di kotak "Tayang". Latar SELALU
    // gelap, bedanya di WARNA garis + titik + tulisan:
    //   none        abu-abu    ⚪ belum ada lagu dimuat
    //   loaded      slate      ⏸ dimuat, belum main
    //   armed       kuning     🎬 SIAP -- tekan panah kanan sekali, lagu mulai
    //   connecting  biru       ⏳ perintah play terkirim, menunggu bunyi
    //   playing     HIJAU      🔊 SEDANG MAIN (titik berdenyut)
    //   paused      ungu       ⏸ dijeda
    //   error       merah      ⚠️ gagal
    // "playing" berasal dari laporan SUNGGUHAN Layar 2 (present_bgaudio_state:
    // event PLAY/PAUSE SoundCloud, <audio> MP3, playerState YouTube), BUKAN
    // dari "perintah play sudah dikirim" -- jadi kalau browser memblokir suara
    // otomatis, kotaknya TIDAK bohong bilang sudah main.
    // Cadangan: kalau sampai 5 detik tidak ada laporan status sama sekali
    // (mis. pemutar YouTube tidak menjawab), status diperkirakan dari perintah
    // terakhir dan diberi tanda "(perkiraan)".
    // ------------------------------------------------------------
    function bgNowState_(filterUrl, filterKind) {
      const a = sharedBgAudio_;
      const armedIt = pendingBgArrowStart_ && pendingBgArrowStart_.it && pendingBgArrowStart_.it.bgAudio;
      const label = (a && a.label) || (armedIt && armedIt.label) || "Audio latar";
      const kind = a ? a.kind : (armedIt ? normBgKind_(armedIt.kind) : "");
      if (filterUrl) { // dipakai baris Kumpulan: hanya relevan kalau lagu yang dimuat/di-arm = lagu baris ini
        const matchLoaded = !!(a && a.url === filterUrl && a.kind === filterKind);
        const matchArmed = !!(armedIt && armedIt.url === filterUrl && normBgKind_(armedIt.kind) === filterKind);
        if (!matchLoaded && !matchArmed) return { key: "none", label, kind };
      }
      if (a && sharedBgAudioError_ && sharedBgAudioError_.url === a.url) return { key: "error", label, kind, message: sharedBgAudioError_.message };
      if (a && a.playing) return { key: "playing", label, kind };
      if (armedIt && (!a || armedIt.url === a.url)) return { key: "armed", label, kind };
      if (!a) return { key: "none", label, kind };
      if (a.started) {
        if (a.everPlayed) return { key: "paused", label, kind };
        if (!a.stateSeen && Date.now() - (a.playRequestedAt || 0) > 5000) { // tidak ada laporan status sama sekali -> perkiraan dari perintah terakhir
          return a.wantPlay ? { key: "playing", label, kind, guess: true } : { key: "paused", label, kind, guess: true };
        }
        return { key: a.wantPlay ? "connecting" : "paused", label, kind };
      }
      return { key: "loaded", label, kind };
    }
    const BG_STATE_TEXT_ = {
      none: ["⚪", "BELUM ADA LAGU DIMUAT"],
      loaded: ["⏸", "DIMUAT — belum main"],
      armed: ["🎬", "SIAP — tekan panah kanan ▶ sekali, lagu mulai"],
      connecting: ["⏳", "MENYALAKAN… menunggu bunyi"],
      playing: ["🔊", "SEDANG MAIN"],
      paused: ["⏸", "DIJEDA"],
      error: ["⚠️", "GAGAL DIPUTAR"],
    };
    function bgKindName_(kind) { return kind === "sc" ? "SoundCloud" : (kind === "yt" ? "YouTube" : "MP3"); }
    // Baris-baris Kumpulan Ayat: kotak kecil gelap di tiap item yang membawa
    // lagu yang SAMA dengan lagu yang sedang dimuat/di-arm. Item lain dibiarkan polos.
    function refreshBgRowBadges_() {
      const wrap = el("psCollectionList");
      if (!wrap) return;
      wrap.querySelectorAll(".ps-verse-row-bgaudio[data-bgurl]").forEach((box) => {
        const st = bgNowState_(box.getAttribute("data-bgurl"), box.getAttribute("data-bgkind"));
        const badge = box.querySelector(".ps-bg-state");
        if (!badge) return;
        if (st.key === "none") { badge.hidden = true; badge.removeAttribute("data-state"); badge.textContent = ""; return; }
        const [icon, text] = BG_STATE_TEXT_[st.key];
        badge.hidden = false;
        badge.setAttribute("data-state", st.key);
        badge.textContent = `${icon} ${text.split(" — ")[0]}${st.guess ? " (perkiraan)" : ""}`;
        badge.title = `${bgKindName_(st.kind)}: ${st.label} -- ${text}`;
      });
    }
    // BARU (18 Sep 2026 v5) -- banner kecil melayang di pojok Studio,
    // dipakai kalau Layar 2 melaporkan Audio Latar GAGAL diputar
    // (present_bgaudio_status ok:false, lihat handler window message di
    // paling bawah file ini). Ditaruh di document.body (BUKAN di dalam
    // panel tab tertentu) supaya tetap kelihatan operator MESKI dia sudah
    // pindah dari tab "🎵 Kidung" ke tab lain saat pesan gagal ini tiba.
    function showBgAudioErrorToast_(message) {
      let box = el("psBgAudioErrorToast");
      if (!box) {
        box = document.createElement("div");
        box.id = "psBgAudioErrorToast";
        box.style.cssText = "position:fixed; left:50%; bottom:24px; transform:translateX(-50%); max-width:560px; background:#3a1414; color:#fff; border:1px solid #b91c1c; border-radius:10px; padding:12px 16px; font-size:13px; line-height:1.5; z-index:99999; box-shadow:0 6px 18px rgba(0,0,0,.4);";
        document.body.appendChild(box);
      }
      box.innerHTML = `⚠️ <b>Audio Latar gagal diputar.</b> ${escapeHtml(message || "")} <button type="button" style="margin-left:8px; background:none; border:1px solid #fff; color:#fff; border-radius:6px; padding:2px 8px; cursor:pointer;">Tutup</button>`;
      box.querySelector("button").addEventListener("click", () => box.remove());
      clearTimeout(box._autoHideTimer);
      box._autoHideTimer = setTimeout(() => { if (box && box.parentNode) box.remove(); }, 12000);
    }

    // BARU (19 Sep 2026, permintaan operator "tambahkan link SoundCloud yang
    // bisa berjalan di belakang layar") -- Audio Latar sekarang punya 3 JENIS
    // sumber: "yt" (iframe YouTube), "sc" (widget SoundCloud, BARU) dan "mp3"
    // (elemen <audio>, juga dipakai "mp4" Drive). "yt" & "sc" disebut jenis
    // "stream" (isManagedBgKind_): keduanya lewat iframe pihak ketiga, dan
    // keduanya ikut alur "klik panah SEKALI LAGI baru mulai" + redup otomatis
    // saat pindah slide (lihat handleBgForActiveItem_() di bawah).
    function normBgKind_(kind) { return kind === "yt" ? "yt" : (kind === "sc" ? "sc" : "mp3"); }
    // "Jenis yang dikelola": yt & sc (iframe pihak ketiga) -- SELALU memakai
    // alur baru (siap-tunggu-panah, fade-out saat pindah slide, lanjutkan,
    // status sungguhan). MP3/MP4 lama tetap "perilaku lama" KECUALI item-nya
    // ditandai `managed: true` (diset dialog baru, lihat isManagedBg_()).
    function isManagedBgKind_(kind) { return kind === "yt" || kind === "sc"; }
    // BARU (20 Sep 2026, tahap 1 "Sumber audio") -- versi per-ITEM: item yang
    // disimpan lewat dialog baru membawa `managed: true`, sehingga MP3/MP4
    // (termasuk dari upload / isi kidung) ikut aturan yang sama dengan
    // YouTube/SoundCloud: lagu sama tidak putus antar slide, berhenti halus
    // saat pindah ke slide tanpa audio, ada "Lanjutkan", ada "tunggu panah".
    // Item LAMA (tanpa flag ini) BERPERILAKU PERSIS SEPERTI DULU.
    function isManagedBg_(bg) { return !!bg && (isManagedBgKind_(bg.kind) || bg.managed === true); }
    // Awalan nama pesan ke Layar 2: "yt_bg" | "sc_bg" | "mp3_bg" (+ "_control"/"_clear").
    function bgMsgPrefix_(kind) { return normBgKind_(kind) + "_bg"; }
    // Tebak jenis dari bentuk link -- dipakai kotak link manual (tab Kidung) &
    // dialog "🎧 Audio Latar" supaya operator tidak perlu memilih jenis sendiri.
    function guessBgKindFromUrl_(url) {
      const u = String(url || "");
      if (/youtube\.com|youtu\.be/i.test(u)) return "yt";
      if (/soundcloud\.com|snd\.sc/i.test(u)) return "sc";
      return "mp3";
    }
    // DIUBAH (18 Sep 2026 v6, permintaan operator "YouTube latar per-slide,
    // klik panah ke-2 baru mulai") -- `loop` (param ke-4, OPSIONAL) dipakai
    // supaya startBgForItem_() di bawah bisa langsung memuat video dengan
    // "Ulang terus" (loopFile) sudah aktif SEJAK AWAL, tanpa perlu klik
    // 🔁 Ulang manual terpisah sesudahnya. Panggilan LAMA (3 argumen, mis.
    // dari panel tab "🎵 Kidung") tetap jalan apa adanya -- `loop` kosong =
    // false, sama seperti perilaku sebelum ini.
    // DIUBAH (18 Sep 2026 v7, permintaan operator "Ulang Semua" -- 1 paket
    // isi beberapa video YouTube BERBEDA, bukan cuma 1 video diulang) --
    // `extraIds` (param ke-5, OPSIONAL, array id video YouTube LAIN, sudah
    // diekstrak lebih dulu oleh pemanggil lewat extractYoutubeId()). Kalau
    // diisi DAN `loop` juga true, video-video ini ditambahkan ke parameter
    // resmi YouTube "playlist=id1,id2,id3..." di belakang video utama --
    // YouTube SENDIRI yang akan main berurutan lalu balik ke video utama
    // lagi selama loop=1 aktif (murni fitur bawaan YouTube, TIDAK perlu
    // kode kita mendeteksi "video sudah habis" satu-satu). Kosong/tidak
    // diisi = perilaku LAMA (playlist cuma berisi 1 id, video itu sendiri).
    // Berkas upload tidak ada di IndexedDB perangkat ini (diunggah dari perangkat
    // lain / sudah dihapus): tandai sebagai GAGAL (kotak status merah + banner).
    function markUploadMissing_(url) {
      const message = "Berkas audio upload tidak ditemukan di perangkat ini (mungkin diunggah dari perangkat lain atau sudah dihapus). Pilih ulang audionya lewat tombol 🎧.";
      if (sharedBgAudio_ && sharedBgAudio_.url === url) sharedBgAudioError_ = { url, message };
      showBgAudioErrorToast_(message);
      notifySharedBgAudioChange_();
    }
    function loadSharedBgAudio_(kind, url, label, loop, extraIds) {
      if (!url) return;
      let queueIds = null; // dipakai lagi oleh toggleloop di bawah, biar konsisten kalau operator pencet 🔁 manual sesudahnya
      if (kind === "yt") {
        const id = typeof extractYoutubeId === "function" ? extractYoutubeId(url) : null;
        if (!id) { alert("Link YouTube ini tidak dikenali -- periksa lagi linknya."); return; }
        queueIds = [id].concat(Array.isArray(extraIds) ? extraIds : []);
        let embedUrl = buildYoutubeEmbedUrl(id, 0);
        if (loop) embedUrl += `&loop=1&playlist=${queueIds.join(",")}`;
        rawPost({ type: "yt_bg", embedUrl });
      } else if (kind === "sc") {
        // BARU (19 Sep 2026) -- SoundCloud: cuma DIMUAT (auto_play=false di
        // present.html), tidak main sampai "play" dikirim. Link pendek
        // on.soundcloud.com/xxx boleh -- diselesaikan di sisi Layar 2.
        rawPost({ type: "sc_bg", trackUrl: url });
      } else if (global.BgAudioLibrary && global.BgAudioLibrary.isUploadUrl(url)) {
        // BARU (20 Sep 2026, tahap 3) -- berkas UPLOAD (bgAudio.url = "upload:<id>",
        // lihat js/bg-audio-library.js): isinya dibaca dari IndexedDB perangkat ini
        // lalu DIKIRIM sebagai Blob ke Layar 2 (Layar 2 membuat URL-nya sendiri).
        // Async -> pesan sesudahnya diantre oleh rawPost() di atas.
        const lib = global.BgAudioLibrary;
        const uploadId = lib.idFromUploadUrl(url);
        rawPostAsync_(lib.getBlob(uploadId).then((blob) => {
          if (!blob) { markUploadMissing_(url); return null; }
          return { type: "mp3_bg", url, blob };
        }));
      } else {
        rawPost({ type: "mp3_bg", url });
      }
      // `started` = perintah play SUDAH pernah dikirim untuk audio ini (dipakai
      // handleBgForActiveItem_() utk membedakan "sudah main, biarkan" dari
      // "baru dimuat, belum dimulai"). `viaArm` = audio ini dimulai lewat alur
      // panah/otomatis per-slide (bukan tombol Play manual di panel).
      sharedBgAudio_ = { kind: normBgKind_(kind), url, label: label || "", loop: !!loop, queueIds, started: false, viaArm: false, playing: false, everPlayed: false, stateSeen: false, wantPlay: false, playRequestedAt: 0 };
      if (loop && kind !== "yt") rawPost({ type: bgMsgPrefix_(kind) + "_control", action: "loop_on" }); // MP3 lewat elemen <audio> asli, SoundCloud lewat event FINISH -- lihat toggleloop di bawah
      notifySharedBgAudioChange_();
    }
    // action: "play" | "pause" | "stop" | "toggleloop"
    // DIUBAH (18 Sep 2026 v6) -- `opts.fade` (opsional, dipakai action
    // "stop") membuat present.html meredupkan volume dulu (~1 detik) SEBELUM
    // benar-benar menghentikan, supaya perpindahan slide yang menghentikan
    // audio latar YouTube (lihat handleBgForActiveItem_() di bawah) tidak
    // putus mendadak/kasar. Panggilan LAMA (tanpa opts, mis. tombol "⏹
    // Berhenti" manual) tetap berhenti SEKETIKA seperti sebelumnya.
    function controlSharedBgAudio_(action, opts) {
      if (!sharedBgAudio_) return;
      if (action === "play" || action === "pause") {
        rawPost({ type: bgMsgPrefix_(sharedBgAudio_.kind) + "_control", action });
        if (action === "pause") { sharedBgAudio_.wantPlay = false; sharedBgAudio_.playing = false; }
        if (action === "play") {
          sharedBgAudio_.started = true;
          sharedBgAudio_.wantPlay = true;
          sharedBgAudio_.playRequestedAt = Date.now();
          setTimeout(() => { try { notifySharedBgAudioChange_(); } catch (e) {} }, 5200); // jendela 5 detik utk laporan status sungguhan, lihat bgNowState_()
          // Operator menekan ▶ Play manual selagi slide "menunggu panah" untuk lagu
          // yang SAMA -> anggap sudah terpenuhi, JANGAN biarkan panah berikutnya
          // "diserap" lagi sebagai tombol mulai (harusnya langsung pindah bait).
          if (pendingBgArrowStart_ && pendingBgArrowStart_.it && pendingBgArrowStart_.it.bgAudio && pendingBgArrowStart_.it.bgAudio.url === sharedBgAudio_.url) {
            pendingBgArrowStart_ = null;
            setYtArmedIndicator_(false);
          }
        }
      } else if (action === "stop") {
        rawPost({ type: bgMsgPrefix_(sharedBgAudio_.kind) + "_clear", fade: !!(opts && opts.fade) });
        sharedBgAudio_ = null;
      } else if (action === "toggleloop") {
        sharedBgAudio_.loop = !sharedBgAudio_.loop;
        if (sharedBgAudio_.kind !== "yt") {
          // MP3/MP4/Drive lewat elemen <audio> asli (#kidungBgAudio) --
          // BARU (18 Sep 2026) -- kind "mp4" numpang jalur audio yang SAMA
          // (cek "bukan yt" alih-alih "persis mp3") supaya video Drive
          // yang dipakai sekedar suara latar juga dapat 🔁 Ulang mulus.
          // `.loop = true/false` bawaan browser, berulang MULUS tanpa
          // putus sama sekali.
          // BARU (19 Sep 2026) -- SoundCloud ("sc") juga lewat jalur ini
          // (bgMsgPrefix_ memilih "sc_bg_control"): ulang lewat event
          // FINISH di present.html, TIDAK memuat ulang widget, jadi lagu yang
          // sedang main tidak terputus saat 🔁 ditekan.
          rawPost({ type: bgMsgPrefix_(sharedBgAudio_.kind) + "_control", action: sharedBgAudio_.loop ? "loop_on" : "loop_off" });
        } else {
          // YouTube lewat iframe (#ytBg) -- TIDAK ada API resmi utk
          // menyalakan loop di tengah jalan tanpa memuat ulang embed-nya
          // (parameter resmi YouTube "loop=1&playlist=<id video yang
          // sama>"), jadi videonya akan mulai dari awal lagi SETIAP kali
          // 🔁 ditekan (nyala ATAU mati) -- operator perlu tahu ini,
          // beda dari MP3 yang mulus.
          const id = typeof extractYoutubeId === "function" ? extractYoutubeId(sharedBgAudio_.url) : null;
          if (id) {
            // DIUBAH (18 Sep 2026 v7) -- kalau video ini sebelumnya dimuat
            // sebagai bagian dari paket "Ulang Semua" (sharedBgAudio_.queueIds
            // sudah berisi beberapa id, lihat loadSharedBgAudio_()), toggle
            // manual ini TETAP memutar seluruh paketnya, bukan cuma video
            // yang sedang tayang saja.
            const queueIds = (Array.isArray(sharedBgAudio_.queueIds) && sharedBgAudio_.queueIds.length) ? sharedBgAudio_.queueIds : [id];
            let url2 = buildYoutubeEmbedUrl(id, 0);
            if (sharedBgAudio_.loop) url2 += `&loop=1&playlist=${queueIds.join(",")}`;
            rawPost({ type: "yt_bg", embedUrl: url2 });
          }
        }
      }
      notifySharedBgAudioChange_();
    }

    // BARU (18 Sep 2026, permintaan operator "checklist mainkan lagu
    // otomatis, pilih 1 saja yang aktif (mp3 unggahan/mp4/YouTube)") --
    // dipanggil oleh sendGenericItemLive() (lihat catatan panjang di sana)
    // setiap kali item APA SAJA (ayat/teks/kidung/media halaman PDF-gambar/
    // dst) menjadi slide aktif. `it.bgAudio` sekarang bisa dilampirkan ke
    // item APA SAJA lewat updateItemBgAudioInCollection() (js/collections.js)
    // -- BUKAN cuma kidung lagi. Karena sharedBgAudio_ itu SATU status
    // BERSAMA (lihat catatan panjang dekat deklarasinya), otomatis "cuma 1
    // yang aktif": memuat audio baru di sini menggantikan/menghentikan
    // audio latar sebelumnya dengan sendirinya (loadSharedBgAudio_ menimpa
    // sharedBgAudio_ & src elemen <audio>/iframe -- yang lama otomatis
    // berhenti begitu src-nya diganti) -- itulah "checklist, pilih 1 saja
    // yang aktif" yang diminta: operator cukup mencentang ▶️ Otomatis di
    // SATU item yang audionya mau jalan, item lain (kalau ada bgAudio-nya
    // tapi tidak dicentang) tetap diam sampai ditekan manual.
    // DIUBAH (18 Sep 2026 v6, permintaan operator "YouTube latar per-slide,
    // klik panah ke-2 baru mulai, next lagi default mati, kecuali dicentang
    // lanjutkan") -- item ber-bgAudio.kind "yt" SEKARANG dilempar ke
    // handleBgForActiveItem_() (fungsi baru di bawah), yang punya alur
    // SENDIRI (arm/mulai lewat klik panah ke-2, stop+fade default saat
    // pindah slide, kecuali bgAudio.continuePrev dicentang). Item mp3/mp4
    // (atau yt LAMA yang belum punya armStart/continuePrev sama sekali --
    // otomatis dianggap `armStart:false, continuePrev:false`, sama seperti
    // sebelum fitur ini ada) TIDAK berubah perilakunya sama sekali di sini.
    function autoplayBgAudioIfEnabled_(it) {
      handleBgForActiveItem_(it); // SELALU dipanggil (bukan cuma kalau it.bgAudio ada) -- lihat catatan di fungsi itu, perlu "lupakan status menunggu klik" tiap kali slide aktif berganti, apa pun jenis item barunya
      const bg = it && it.bgAudio;
      if (!bg || isManagedBg_(bg) || bg.armStart || !bg.url || !bg.autoplay) return; // "yt"/"sc" (dan jenis apa pun yang "tunggu panah") SUDAH ditangani lengkap oleh handleBgForActiveItem_() di atas
      loadSharedBgAudio_(bg.kind || "mp3", bg.url, bg.label || "Audio Latar");
      controlSharedBgAudio_("play");
    }

    // ------------------------------------------------------------
    // BARU (18 Sep 2026 v6, permintaan operator, lihat catatan panjang di
    // autoplayBgAudioIfEnabled_() di atas) -- "Audio Latar YouTube per-
    // slide" dengan alur:
    //   1) Slide dengan bgAudio.kind "yt" + armStart TERCENTANG: begitu
    //      slide ini masuk (panah/klik baris/stylus), musik BELUM main --
    //      cuma "diarm" (menunggu). Operator perlu tekan panah MAJU SEKALI
    //      LAGI (tanpa berpindah slide -- klik itu "diserap" oleh
    //      playlistNext(), lihat di sana) baru musiknya sungguh mulai.
    //      Badge kecil "🎵 Tekan panah lagi" muncul di Layar 2 selama
    //      menunggu (setYtArmedIndicator_()).
    //   2) Slide dengan bgAudio.kind "yt" + autoplay TERCENTANG (armStart
    //      TIDAK dicentang): perilaku LAMA -- langsung main begitu masuk
    //      slide, tanpa perlu klik tambahan.
    //   3) Berpindah ke slide APA PUN (maju/mundur) yang TIDAK mencentang
    //      "↩️ Lanjutkan audio sebelumnya" (bgAudio.continuePrev): kalau
    //      ADA audio YouTube latar yang sedang main, otomatis dihentikan
    //      dengan fade-out halus (~1 detik) dulu -- "defaultnya mati
    //      suaranya" persis seperti diminta.
    //   4) Berpindah ke slide yang MENCENTANG "↩️ Lanjutkan" -- audio yang
    //      sedang main (dari slide manapun sebelumnya) DIBIARKAN APA
    //      ADANYA, tidak dihentikan maupun dimuat ulang -- itulah cara 1
    //      lagu YouTube "menembus" beberapa slide berturut-turut (mis.
    //      bait 1-4 kidung yang sama) tanpa klik ekstra & tanpa jeda.
    // CATATAN keterbatasan (disengaja, versi "mudah dulu" -- lihat pesan
    // balasan ke operator): melompat MUNDUR dari LUAR sebuah grup
    // "Lanjutkan" langsung ke TENGAH grup itu (mis. dari slide 9 balik ke
    // slide 6 yang bercentang "Lanjutkan") tidak otomatis menyalakan lagi
    // audio grup itu -- "Lanjutkan" cuma berarti "jangan sentuh apa pun",
    // bukan "putar ulang milik grup ini". Navigasi maju berurutan (alur
    // paling umum dipakai) & navigasi mundur SEKUENSIAL di dalam grup yang
    // sama bekerja seperti diharapkan.
    // ------------------------------------------------------------
    let pendingBgArrowStart_ = null; // null ATAU { it } -- item aktif SEKARANG yang audio YouTube latarnya sudah "diarm" tapi BELUM dimulai, menunggu 1x klik panah maju lagi
    function setYtArmedIndicator_(on) {
      // Badge "🎵 Tekan panah lagi" di Layar 2 (present.html, elemen
      // #ytBgArmedBadge) -- SENGAJA lewat rawPost() (type "yt_bg_armed",
      // sudah didaftarkan di OVERLAY_TYPES js/presentation.js) supaya
      // TIDAK ikut menimpa `lastPayload`/pratinjau slide utama, sama
      // seperti yt_bg_control/mp3_bg_control dkk.
      rawPost({ type: "yt_bg_armed", armed: !!on });
      notifySharedBgAudioChange_(); // BARU (19 Sep 2026) -- kotak status gelap ikut berubah jadi "SIAP"/kembali
    }
    function handleBgForActiveItem_(it) {
      pendingBgArrowStart_ = null; // slide aktif baru saja berganti -- lupakan status "menunggu klik" milik slide SEBELUMNYA (kalau ada & belum sempat dikonfirmasi, batal begitu saja, TIDAK otomatis mulai)
      setYtArmedIndicator_(false);
      const bg = it && it.bgAudio;
      if (bg && isManagedBg_(bg) && bg.continuePrev) return; // "↩️ Lanjutkan" -- JANGAN sentuh apa pun, biarkan audio yang sedang main (kalau ada) tetap jalan apa adanya
      // BARU (19 Sep 2026) -- LAGU YANG SAMA sudah dimuat di Layar 2 (mis. semua
      // bait 1 kidung memakai link yang sama, lihat applyPendingBgAudioToGenericItems_()
      // di tab Kidung): JANGAN dihentikan/dimuat ulang tiap pindah bait, kalau
      // tidak lagu akan putus & mulai dari awal di tiap bait.
      //   - sudah pernah dimulai (main/dijeda)  -> biarkan apa adanya;
      //   - baru dimuat tapi BELUM dimulai      -> ikuti pengaturan slide ini
      //     (tunggu panah / otomatis / manual);
      const sameLoaded = !!(bg && bg.url && sharedBgAudio_ && sharedBgAudio_.kind === normBgKind_(bg.kind) && sharedBgAudio_.url === bg.url);
      if (sameLoaded) {
        if (sharedBgAudio_.started) return;
        if (bg.armStart) { pendingBgArrowStart_ = { it }; setYtArmedIndicator_(true); return; }
        if (bg.autoplay && isManagedBg_(bg)) startBgForItem_(it);
        return; // manual saja: biarkan termuat, operator tekan ▶ Play sendiri
      }
      // Audio yang sedang termuat BUKAN milik slide ini -> default: hentikan
      // (fade halus). Berlaku untuk audio YouTube/SoundCloud (perilaku LAMA
      // untuk YouTube) DAN audio jenis apa pun yang dimulai lewat alur panah
      // (viaArm) -- MP3 yang diputar manual dari panel tetap dibiarkan seperti dulu.
      if (sharedBgAudio_ && (isManagedBgKind_(sharedBgAudio_.kind) || sharedBgAudio_.viaArm)) controlSharedBgAudio_("stop", { fade: true });
      if (!bg || !bg.url) return; // slide ini sendiri tidak punya audio latar -> selesai, tetap diam (sesuai "defaultnya mati suaranya")
      if (bg.armStart) { pendingBgArrowStart_ = { it }; setYtArmedIndicator_(true); return; } // perlu 1x klik panah lagi -- lihat playlistNext()
      if (isManagedBg_(bg) && bg.autoplay) startBgForItem_(it); // otomatis LAMA, tanpa perlu konfirmasi klik tambahan
    }
    // Sungguh memuat + memutar audio latar milik `it` SEKARANG JUGA
    // -- dipanggil baik oleh handleBgForActiveItem_() (kalau autoplay
    // tercentang) MAUPUN playlistNext() (kalau operator menekan panah
    // konfirmasi ke-2 utk item yang armStart-nya tercentang).
    // DIUBAH (19 Sep 2026) -- berlaku untuk "yt", "sc" DAN "mp3"/"mp4".
    function startBgForItem_(it) {
      const bg = it && it.bgAudio;
      if (!bg || !bg.url) return;
      const kind = normBgKind_(bg.kind);
      const alreadyLoaded = !!(sharedBgAudio_ && sharedBgAudio_.kind === kind && sharedBgAudio_.url === bg.url);
      // BARU (18 Sep 2026 v7, permintaan operator "Ulang Semua" -- 1 paket
      // beberapa video YouTube berbeda, bukan cuma 1 video diulang) --
      // `bg.loopAll` + `bg.extraUrls` (diisi lewat openBgAudioDialog_() di
      // atas). Link yang tidak dikenali di paket ini DILEWATI SAJA (bukan
      // membatalkan semuanya) supaya 1 link salah tidak mematikan seluruh
      // audio latar slide ini -- operator sudah diperingatkan lewat alert()
      // begitu link itu ditempel/disimpan (lihat openBgAudioDialog_()),
      // jadi di sini cukup diam & lanjut dengan yang valid saja.
      let extraIds = [];
      if (kind === "yt" && bg.loopAll && Array.isArray(bg.extraUrls) && bg.extraUrls.length) {
        extraIds = bg.extraUrls
          .map((u) => (typeof extractYoutubeId === "function" ? extractYoutubeId(u) : null))
          .filter(Boolean);
      }
      const loop = !!bg.loopFile || (kind === "yt" && !!bg.loopAll); // DIUBAH (20 Sep 2026) -- MP3 bertanda managed juga boleh diulang (loopFile)
      // Sudah dimuat lebih dulu (mis. operator memuat link di panel, lalu
      // mencentang "tunggu panah") -> cukup PLAY, jangan dimuat ulang. Khusus
      // YouTube yang butuh parameter ulang (loop) tetap dimuat ulang seperti dulu.
      if (!alreadyLoaded || (kind === "yt" && loop)) {
        loadSharedBgAudio_(kind, bg.url, bg.label || "Audio Latar", loop, extraIds);
      } else if (loop !== !!sharedBgAudio_.loop && kind !== "yt") {
        controlSharedBgAudio_("toggleloop"); // SoundCloud/MP3: ulang cukup diselaraskan lewat pesan, tanpa memuat ulang
      }
      pendingBgArrowStart_ = null; // dikosongkan SEBELUM play supaya controlSharedBgAudio_() tidak mengirim badge "mati" dobel
      controlSharedBgAudio_("play");
      if (sharedBgAudio_) sharedBgAudio_.viaArm = true;
      setYtArmedIndicator_(false);
    }


    // BARU (18 Sep 2026 v6) -- ikon kecil "🎧" di depan ref/judul baris
    // Kumpulan Ayat, DIPISAH dari HTML baris (renderCollectionList()) supaya
    // gampang dipetakan ke kondisi baru (armStart/continuePrev), tanpa bikin
    // satu baris template literal tambah panjang & susah dibaca. `it.bgAudio`
    // dianggap "ada" kalau punya `url` (mp3/mp4/yt biasa) ATAU `continuePrev`
    // tercentang (marker "lanjutkan", boleh tanpa url sendiri -- lihat
    // catatan panjang di openBgAudioDialog_()).
    function bgAudioRowIconHtml_(it) {
      const bg = it && it.bgAudio;
      if (!bg || !(bg.url || bg.continuePrev)) return "";
      let icon = "🎧", note = "tayangkan item ini untuk kontrol ▶/⏸/🔁/⏹";
      // BARU (18 Sep 2026 v7) -- keterangan "Ulang" 3 kemungkinan sekarang:
      // tidak diulang sama sekali, 1 video diulang terus (loopFile), atau
      // 1 PAKET beberapa video berbeda diulang terus (loopAll+extraUrls).
      const loopNote_ = bg.kind === "yt" && bg.loopAll
        ? `, Ulang Semua (${1 + (Array.isArray(bg.extraUrls) ? bg.extraUrls.length : 0)} video)`
        : (bg.loopFile ? ", Ulang Terus" : "");
      const streamName_ = bg.kind === "sc" ? "SoundCloud" : (bg.kind === "yt" ? "YouTube" : "Audio");
      if (bg.continuePrev) { icon = "🎧↩️"; note = `Lanjutkan audio ${streamName_} dari slide sebelumnya (tidak mulai/hentikan apa pun sendiri)`; }
      else if (bg.armStart) { icon = "🎧🎬"; note = `${streamName_} latar -- perlu 1x klik panah LAGI (tanpa pindah slide) baru mulai main` + loopNote_; }
      else if (bg.autoplay) { icon = "🎧▶️"; note = "OTOMATIS diputar begitu item ini masuk slide" + loopNote_; }
      const srcNote_ = bg.source === "upload" ? " [upload di perangkat ini]" : (bg.source === "kidung" ? " [dari data kidung]" : "");
      return ` <span title="Punya Audio Latar (${escapeHtml(bg.label || "")})${escapeHtml(srcNote_)} -- ${escapeHtml(note)}">${icon}</span>`;
    }


    function bgAudioControlsHtml_(bgAudio) {
      if (!bgAudio || !bgAudio.url) return "";
      return `<div class="ps-btn-row ps-preview-bg-audio" style="margin-top:8px; flex-wrap:wrap;">
        <span class="ps-bg-state" data-bgpv="state" hidden></span>
        <button type="button" class="chip-btn small" data-bgpv="load">🎧 ${escapeHtml(bgAudio.label || "Audio Latar")}</button>
        <button type="button" class="chip-btn small" data-bgpv="pause" hidden>⏸ Jeda</button>
        <button type="button" class="chip-btn small" data-bgpv="loop" hidden>🔁 Ulang</button>
        <button type="button" class="chip-btn small danger" data-bgpv="stop" hidden>⏹ Berhenti</button>
      </div>`;
    }
    // `box`: elemen #psPreviewBox (innerHTML SUDAH berisi bgAudioControlsHtml_()
    // di atas). Dipanggil ULANG tiap kali renderStudioPreview() menggambar
    // slide kidung -- previewBgAudioRefresh_ (slot tunggal) sengaja
    // ditimpa di sini, bukan ditambah ke array, lihat catatan di atas.
    function wireBgAudioControlsInBox_(box, bgAudio) {
      previewBgAudioRefresh_ = null;
      if (!bgAudio || !bgAudio.url) return;
      const row = box.querySelector(".ps-preview-bg-audio");
      if (!row) return;
      const loadBtn = row.querySelector('[data-bgpv="load"]');
      const pauseBtn = row.querySelector('[data-bgpv="pause"]');
      const loopBtn = row.querySelector('[data-bgpv="loop"]');
      const stopBtn = row.querySelector('[data-bgpv="stop"]');
      function isThisOneLoaded_() {
        return !!(sharedBgAudio_ && sharedBgAudio_.url === bgAudio.url && sharedBgAudio_.kind === normBgKind_(bgAudio.kind));
      }
      function refresh() {
        const on = isThisOneLoaded_();
        if (loadBtn) loadBtn.textContent = on ? "▶ Play" : `🎧 ${bgAudio.label || "Audio Latar"}`;
        if (pauseBtn) pauseBtn.hidden = !on;
        if (loopBtn) { loopBtn.hidden = !on; loopBtn.classList.toggle("active", !!(on && sharedBgAudio_.loop)); }
        if (stopBtn) stopBtn.hidden = !on;
        // BARU (19 Sep 2026) -- kotak status gelap kecil di sebelah tombol (lihat bgNowState_())
        const stBadge = row.querySelector('[data-bgpv="state"]');
        if (stBadge) {
          const st = bgNowState_(bgAudio.url, normBgKind_(bgAudio.kind));
          if (st.key === "none") { stBadge.hidden = true; stBadge.removeAttribute("data-state"); }
          else { stBadge.hidden = false; stBadge.setAttribute("data-state", st.key); stBadge.textContent = `${BG_STATE_TEXT_[st.key][0]} ${BG_STATE_TEXT_[st.key][1].split(" — ")[0]}${st.guess ? " (perkiraan)" : ""}`; }
        }
      }
      if (loadBtn) loadBtn.addEventListener("click", () => {
        if (isThisOneLoaded_()) controlSharedBgAudio_("play");
        else loadSharedBgAudio_(bgAudio.kind || "mp3", bgAudio.url, bgAudio.label || "Audio Latar");
      });
      if (pauseBtn) pauseBtn.addEventListener("click", () => controlSharedBgAudio_("pause"));
      if (loopBtn) loopBtn.addEventListener("click", () => controlSharedBgAudio_("toggleloop"));
      if (stopBtn) stopBtn.addEventListener("click", () => controlSharedBgAudio_("stop"));
      previewBgAudioRefresh_ = refresh;
      refresh();
    }

    // DIUBAH (20 Sep 2026, tahap 1) -- formulir dialog "🎧 Audio Latar" SEKARANG
    // ada di berkasnya sendiri: js/bg-audio-dialog.js (window.BgAudioDialog),
    // dengan pilihan "Sumber audio" (Link / Dari kidung / Dari upload /
    // Lanjutkan / Tanpa audio). Di sini tinggal penerusnya, supaya pemanggil
    // lama (Studio) tidak berubah. `opts` = { existing, title, onSave,
    // item, kidungMeta } -- lihat BgAudioDialog.open().
    function openBgAudioDialog_(opts) {
      if (!global.BgAudioDialog) {
        console.error("js/bg-audio-dialog.js belum dimuat -- cek urutan <script> di index.html");
        alert("Dialog Audio Latar tidak bisa dibuka: berkas js/bg-audio-dialog.js belum termuat.\nPastikan berkas itu ter-upload ke folder js/ lalu muat ulang (Ctrl+Shift+R).");
        return;
      }
      global.BgAudioDialog.open(Object.assign({}, opts, {
        guessKind: guessBgKindFromUrl_,
        isManagedKind: isManagedBgKind_,
        extractYoutubeId,
      }));
    }

    // ------------------------------------------------------------
    // Laporan dari Layar 2 (present.html) lewat window.postMessage -- dipanggil
    // Studio dari listener "message"-nya. Mengembalikan true kalau pesannya
    // milik Audio Latar (sudah ditangani di sini).
    //   present_bgaudio_status  : berhasil / GAGAL diputar (+ pesan alasannya)
    //   present_bgaudio_state   : status SUNGGUHAN sedang main / tidak
    // ------------------------------------------------------------
    function handlePresenterMessage(data) {
      if (!data || data.source !== "bibleAppPresenter") return false;
      if (data.type === "present_bgaudio_state") {
        if (sharedBgAudio_ && sharedBgAudio_.kind === data.kind) {
          sharedBgAudio_.stateSeen = true;
          sharedBgAudio_.playing = !!data.playing;
          if (data.playing) { sharedBgAudio_.everPlayed = true; sharedBgAudioError_ = null; }
          notifySharedBgAudioChange_();
        }
        return true;
      }
      if (data.type === "present_bgaudio_status") {
        if (!data.ok) {
          if (sharedBgAudio_ && sharedBgAudio_.url === data.url) sharedBgAudioError_ = { url: data.url, message: data.message };
          showBgAudioErrorToast_(data.message);
        } else if (sharedBgAudioError_ && sharedBgAudioError_.url === data.url) {
          sharedBgAudioError_ = null; // link yg sama ternyata sudah berhasil jalan (mis. operator ganti/coba ulang) -- bersihkan status gagal yg lama
        }
        notifySharedBgAudioChange_();
        return true;
      }
      return false;
    }


    return {
      // --- status yang dibaca/ditulis Studio (getter/setter, BUKAN salinan) ---
      get shared() { return sharedBgAudio_; },
      get error() { return sharedBgAudioError_; },
      set error(v) { sharedBgAudioError_ = v; },
      get pendingArrow() { return pendingBgArrowStart_; },
      set pendingArrow(v) { pendingBgArrowStart_ = v; },
      clearPreviewRefresh() { previewBgAudioRefresh_ = null; },
      onChange: onSharedBgAudioChange_,
      handlePresenterMessage,
      // --- fungsi bernama sama persis dengan aslinya di presentation-studio.js ---
      fn: {
        normBgKind_, isManagedBgKind_, bgMsgPrefix_, guessBgKindFromUrl_,
        loadSharedBgAudio_, controlSharedBgAudio_, autoplayBgAudioIfEnabled_,
        setYtArmedIndicator_, handleBgForActiveItem_, startBgForItem_,
        notifySharedBgAudioChange_, onSharedBgAudioChange_,
        bgNowState_, bgKindName_, refreshBgRowBadges_, showBgAudioErrorToast_,
        bgAudioRowIconHtml_, bgAudioControlsHtml_, wireBgAudioControlsInBox_,
        openBgAudioDialog_, isManagedBg_, isManagedBgKind_,
      },
      BG_STATE_TEXT_,
    };
  }

  // VERSION dipakai untuk mendiagnosis "berkas campuran" (lihat tests & catatan di presentation-studio.js).
  global.BgAudioModule = { create, VERSION: "2026-09-20.4" };
})(typeof window !== "undefined" ? window : globalThis);
