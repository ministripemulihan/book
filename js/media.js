// ============================================================
//  BACAAN BERSUARA HARIAN — daftar rentang bacaan + link MP3/MP4/
//  YouTube, diambil dari sheet TERPISAH (lihat CONFIG.READING_MEDIA_SHEETS
//  di js/config.js). Ini BUKAN sumber teks Alkitab (teks tetap dari sheet
//  Alkitab utama seperti biasa) — sheet ini hanya berisi rentang referensi
//  ayat + link dengar/tonton untuk tiap rentang itu.
//
//  Data di-cache di localStorage (bukan IndexedDB, karena ukurannya kecil)
//  supaya kunjungan berikutnya instan; ada tombol sinkron ulang per sheet.
// ============================================================
const MEDIA_CACHE_PREFIX = "bible_app_media_v1_";

function mediaCacheKey(sheetKey) {
  return MEDIA_CACHE_PREFIX + sheetKey;
}

function loadMediaFromCache(sheetKey) {
  try {
    const raw = localStorage.getItem(mediaCacheKey(sheetKey));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveMediaToCache(sheetKey, rows) {
  try {
    localStorage.setItem(
      mediaCacheKey(sheetKey),
      JSON.stringify({ rows, fetchedAt: new Date().toISOString() })
    );
  } catch (e) {
    /* kalau localStorage penuh, cukup diabaikan -- fitur tetap jalan, hanya tidak ter-cache */
  }
}

async function fetchMediaSheet(sheet) {
  const res = await fetch(sheet.csvUrl, { cache: "no-store" });
  if (!res.ok) throw new Error("Gagal mengambil data (" + res.status + ")");
  const text = await res.text();
  const records = parseCSV(text);
  // Normalisasi nama kolom (huruf besar/kecil & "no"/"nomor" bebas).
  // Kolom "Pembacaan"/nama kitab SENGAJA dicek dengan beberapa nama
  // header yang sudah diketahui DULU (Indonesia/Mandarin/Inggris) --
  // tapi kalau sheet-nya ternyata pakai header lain lagi (mis. typo,
  // spasi ekstra, atau bahasa lain), fallback ke KOLOM KE-2 apa adanya
  // (Object.values mengikuti urutan kolom asli sheet, terlepas dari
  // apa pun nama headernya) -- supaya tidak perlu menyeragamkan nama
  // header di Google Sheet-nya sama sekali, urutan kolom (No | [nama
  // kitab/pembacaan] | Link MP3 | Link MP4 | Youtube) sudah cukup.
  const rows = records.map((r) => {
    const values = Object.values(r);
    return {
      no: r["no"] || r["nomor"] || values[0] || "",
      pembacaan:
        r["pembacaan"] ||
        r["kitab perjanjian baru (nama kitab)"] ||
        r["新约圣经书卷 (nama kitab)"] ||
        r["new testament book (nama kitab)"] ||
        values[1] ||
        "",
      mp3: (r["link mp3"] || "").trim(),
      mp4: (r["link mp4"] || "").trim(),
      youtube: (r["youtube"] || "").trim(),
    };
  });
  saveMediaToCache(sheet.key, rows);
  return rows;
}

// Menebak kitab & pasal dari teks rentang bacaan (mis. "Kejadian 1:1-2:3",
// "Ratapan1:1-22" [tanpa spasi], "Amsal 27:1-27") supaya bisa dibuka
// langsung di pembaca. Best-effort: hanya mengambil kitab & pasal AWAL,
// tidak mencoba menafsirkan rentang ayat/pasal penuh.
function guessReferenceFromPembacaan(text) {
  if (!text) return null;
  const m = text.match(/^([1-3]?\s?[A-Za-z\u00C0-\u024F.\- ]+?)\s*(\d+)/);
  if (!m) return null;
  const bookPart = m[1].trim().toLowerCase().replace(/\.$/, "");
  const chapter = parseInt(m[2], 10);
  let book = BOOK_ALIAS_INDEX[bookPart];
  if (!book) {
    const candidates = Object.keys(BOOK_ALIAS_INDEX).filter((a) => a.startsWith(bookPart) || bookPart.startsWith(a));
    if (candidates.length) book = BOOK_ALIAS_INDEX[candidates[0]];
  }
  if (!book) return null;
  return { book, chapter };
}

let mediaCurrentSheetKey = null;

function availableMediaSheets() {
  return (CONFIG.READING_MEDIA_SHEETS || []).filter((s) => s.csvUrl && s.csvUrl.trim());
}

// ------------------------------------------------------------
//  Mencari link 🎵MP3/🎬MP4/▶️YouTube untuk SATU kitab+pasal tertentu,
//  dengan mengecek SEMUA sheet Bacaan Bersuara yang sudah diisi di
//  CONFIG.READING_MEDIA_SHEETS. Dipakai oleh panel "📚 Kumpulan Ayat"
//  (js/app.js renderCollectionDetailInto()) supaya ayat yang disimpan ke
//  kumpulan tetap tersambung ke link dengar/tonton terbaru dari Google
//  Sheet -- di perangkat MANA PUN, tanpa perlu link itu ikut disimpan di
//  data kumpulannya sendiri (kalau linknya diganti di Sheet, kumpulan
//  lama otomatis ikut memakai yang terbaru).
//  Memakai cache lokal dulu kalau ada (instan); kalau sheet itu belum
//  pernah di-cache di perangkat ini, ambil sekali dari server.
// ------------------------------------------------------------
// ------------------------------------------------------------
//  Memetakan kode bahasa TEKS Alkitab (CONFIG.LANGUAGES, mis. "ind",
//  "eng", "chs" -- lihat js/config.js) ke KEY sheet Bacaan Bersuara
//  yang sesuai (CONFIG.READING_MEDIA_SHEETS). Dipakai supaya saat
//  sedang membaca dalam bahasa Mandarin/Inggris, tombol 🎵MP3 dsb.
//  mengambil link dari sheet BAHASA YANG SAMA -- sebelumnya
//  findMediaLinkForReference() mengecek SEMUA sheet berurutan dan
//  berhenti di kecocokan PERTAMA (selalu sheet Indonesia lebih dulu di
//  CONFIG.READING_MEDIA_SHEETS), jadi walau sedang membaca versi
//  Mandarin/Inggris, link yang muncul selalu link BAHASA INDONESIA --
//  itulah sebab laporan "link MP3 Mandarin/Inggris kok tidak sama".
// ------------------------------------------------------------
const MEDIA_LANG_SHEET_KEYS = {
  ind: ["pl_ind", "pb_ind"],
  rvind: ["pl_ind", "pb_ind"],
  jawa: ["pl_ind", "pb_ind"],
  kjv: ["pb_inggris"],
  eng: ["pb_inggris"],
  rveng: ["pb_inggris"],
  chs: ["pb_mandarin"],
  chssmp: ["pb_mandarin"],
};

// Susun ulang urutan sheet yang akan dicek: sheet yang cocok dengan
// `lang` (bahasa teks yang sedang dibaca) DIDAHULUKAN, sisanya tetap
// jadi cadangan (kalau sheet bahasa itu belum ada linknya untuk pasal
// ini, tetap coba bahasa lain daripada tidak menampilkan apa-apa).
function orderedMediaSheetsForLang(lang) {
  const all = availableMediaSheets();
  const preferredKeys = MEDIA_LANG_SHEET_KEYS[lang] || [];
  if (!preferredKeys.length) return all;
  const preferred = [];
  const rest = [];
  all.forEach((s) => {
    (preferredKeys.includes(s.key) ? preferred : rest).push(s);
  });
  return preferred.concat(rest);
}

async function findMediaLinkForReference(bookNumber, chapter, lang) {
  if (!bookNumber || !chapter) return null;
  for (const sheet of orderedMediaSheetsForLang(lang)) {
    let cached = loadMediaFromCache(sheet.key);
    let rows = cached && cached.rows;
    if (!rows || !rows.length) {
      try {
        rows = await fetchMediaSheet(sheet);
      } catch (e) {
        continue; // sheet ini gagal diambil (offline/URL salah) -- coba sheet berikutnya
      }
    }
    const hit = (rows || []).find((row) => {
      const guess = guessReferenceFromPembacaan(row.pembacaan);
      return guess && guess.book.num === bookNumber && guess.chapter === chapter;
    });
    if (hit && (hit.mp3 || hit.mp4 || hit.youtube)) {
      return { mp3: hit.mp3, mp4: hit.mp4, youtube: hit.youtube, label: hit.pembacaan };
    }
  }
  return null;
}

function mediaLinkButton(label, url) {
  const a = document.createElement("a");
  a.href = driveOpenUrl(url);
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.className = "chip-btn small media-link-btn";
  a.textContent = label;
  return a;
}

// Versi BULAT (ikon saja, tanpa tulisan) dari mediaLinkButton() di atas --
// dipakai di tempat yang butuh baris tombol padat berisi ikon-ikon saja
// (mis. toolbar bawah layar baca Kidung), sama gayanya dengan
// roundMediaButton() tapi ini <a> (buka/unduh link apa adanya), bukan
// <button> (buka pemutar sebaris).
function roundMediaLinkButton(icon, title, url) {
  const a = document.createElement("a");
  a.href = driveOpenUrl(url);
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.className = "round-media-btn";
  a.textContent = icon;
  a.title = title;
  a.setAttribute("aria-label", title);
  return a;
}

// ------------------------------------------------------------
//  PEMUTAR MEDIA "SEBARIS" (inline) -- dulu tombol MP3/MP4/YouTube
//  membuka TAB BARU (target="_blank"), yang di HP suka tertutup sendiri
//  atau suaranya berhenti begitu berpindah aplikasi/kunci layar (tab
//  baru gampang dihentikan paksa oleh sistem HP untuk hemat baterai).
//  Sekarang tombolnya BULAT (mis. 🎵/🎬/▶️) dan saat ditekan, pemutarnya
//  langsung muncul DI HALAMAN YANG SAMA (tanpa tab baru) -- supaya ayat
//  & catatan tetap kelihatan sambil mendengarkan/menonton. MediaSession
//  API juga dipasang (lihat wireMediaSession()) supaya pemutaran audio/
//  video lebih tahan saat layar dikunci.
// ------------------------------------------------------------
// ------------------------------------------------------------
//  GOOGLE DRIVE — helper mengenali & membangun link Drive.
//  Link yang dipakai pengguna di sheet bisa dalam beberapa bentuk:
//    - https://drive.google.com/open?id=FILE_ID
//    - https://drive.google.com/file/d/FILE_ID/view
//    - https://drive.google.com/uc?id=FILE_ID&export=download
//  Semuanya berisi FILE_ID yang sama, hanya bentuk URL-nya beda.
// ------------------------------------------------------------
function driveFileIdFromUrl(url) {
  if (!url) return null;
  let m = String(url).match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1];
  m = String(url).match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1];
  return null;
}
function isDriveUrl(url) {
  return /drive\.google\.com/.test(String(url || ""));
}

function driveOpenUrl(url) {
  if (!url) return "";
  // Selalu arahkan ke halaman "/view" resmi Drive (paling andal dibuka
  // manual di tab baru / dibagikan), dari FILE_ID-nya berapa pun bentuk
  // link aslinya (…/open?id=, …/uc?id=, …/file/d/…).
  const id = driveFileIdFromUrl(url);
  if (id) return `https://drive.google.com/file/d/${id}/view`;
  return url;
}

// URL "preview" Drive -- INI yang bisa ditanam (embed) di <iframe> dan
// benar-benar memutar audio/video-nya langsung di halaman, TIDAK seperti
// "/view" atau "/open?id=" yang cuma bisa dibuka penuh satu halaman
// (dan TIDAK BISA dipasang sebagai src <audio>/<video> biasa -- itulah
// sebab MP3/MP4 dari Drive sebelumnya gagal diputar sama sekali: kode lama
// memasang link halaman Drive itu langsung ke `<audio src="...">`, padahal
// itu halaman HTML, bukan berkas suara/video mentah, jadi browser tidak
// bisa memutarnya).
function driveEmbedPreviewUrl(url) {
  const id = driveFileIdFromUrl(url);
  return id ? `https://drive.google.com/file/d/${id}/preview` : null;
}

function roundMediaButton(icon, title) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "round-media-btn";
  b.textContent = icon;
  b.title = title;
  b.setAttribute("aria-label", title);
  return b;
}

// Tombol kecil "🔗 Share" di sebelah tombol bulat MP3/MP4/YouTube -- memakai
// Web Share API kalau didukung (muncul pilihan WhatsApp/Telegram dst bawaan
// HP), atau fallback menyalin link ke clipboard di komputer/browser yang
// tidak mendukung Web Share.
function shareMediaButton(url, label) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "round-media-btn share-variant";
  b.textContent = "🔗";
  b.title = "Bagikan link " + label;
  b.setAttribute("aria-label", "Bagikan link " + label);
  b.addEventListener("click", async () => {
    const shareUrl = driveOpenUrl(url);
    if (navigator.share) {
      try {
        await navigator.share({ title: label, url: shareUrl });
        return;
      } catch (e) {
        /* dibatalkan pengguna atau tidak didukung -- lanjut ke fallback salin */
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      b.textContent = "✅";
      setTimeout(() => { b.textContent = "🔗"; }, 1500);
    } catch (e) {
      window.prompt("Salin link ini:", shareUrl);
    }
  });
  return b;
}

// Memasang metadata & tombol kontrol MediaSession (kalau didukung browser)
// supaya OS memperlakukan halaman ini sebagai "sedang memutar media" --
// muncul di kontrol layar kunci, dan cenderung TIDAK dihentikan paksa saat
// layar dikunci / berpindah aplikasi sebentar. CATATAN JUJUR: ini bukan
// jaminan mutlak -- kalau HP benar-benar dikunci dalam-dalam atau aplikasi
// ditutup total (bukan cuma dikunci layarnya), sebagian besar browser HP
// tetap akan menghentikan audio/video biasa (ini batasan sistem operasi,
// bukan sesuatu yang bisa "diperbaiki" penuh dari sisi web biasa). Yang
// paling andal tetap terus jalan walau layar dikunci adalah audio MP3
// (elemen <audio> asli) selama TAB/APLIKASI-nya tidak ditutup total.
function wireMediaSession(mediaEl, title) {
  if (!("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: title || "Bacaan Alkitab",
      artist: (typeof CONFIG !== "undefined" && CONFIG.APP_TITLE) || "Alkitab",
    });
    navigator.mediaSession.setActionHandler("play", () => mediaEl.play());
    navigator.mediaSession.setActionHandler("pause", () => mediaEl.pause());
    navigator.mediaSession.setActionHandler("stop", () => { mediaEl.pause(); });
    mediaEl.addEventListener("play", () => { try { navigator.mediaSession.playbackState = "playing"; } catch (e) {} });
    mediaEl.addEventListener("pause", () => { try { navigator.mediaSession.playbackState = "paused"; } catch (e) {} });
  } catch (e) {
    /* browser lama/tidak mendukung -- diabaikan, tombol putar tetap jalan normal */
  }
}

function youTubeEmbedUrl(url) {
  if (!url) return null;
  let id = null;
  let m = url.match(/[?&]v=([^&]+)/);
  if (m) id = m[1];
  if (!id) { m = url.match(/youtu\.be\/([^?&]+)/); if (m) id = m[1]; }
  if (!id) { m = url.match(/youtube\.com\/embed\/([^?&]+)/); if (m) id = m[1]; }
  if (!id) { m = url.match(/youtube\.com\/shorts\/([^?&]+)/); if (m) id = m[1]; }
  return id ? "https://www.youtube.com/embed/" + id : null;
}

// ------------------------------------------------------------
//  PEMUTAR MP3 "TOGGLE BULAT" -- khusus dipakai toolbar Kidung, gayanya
//  mengikuti contoh app "Kidung" yang dikirim (1 tombol bulat ▶️/⏸️ +
//  progress bar tipis di sampingnya, BUKAN elemen <audio controls> biasa
//  seperti buildInlineMediaBlock() di atas). Beda perilaku dari MP3 di
//  buildInlineMediaBlock():
//    - SATU tombol bulat saja: sekali tekan main, tekan lagi jeda (murni
//      toggle play/pause, bukan buka pemutar baru tiap kali).
//    - loop = true -- begitu selesai, otomatis mengulang dari awal terus
//      menerus, BERHENTI hanya kalau tombolnya ditekan lagi (sesuai
//      permintaan "terus berulang mainnya sampai ditekan kembali").
//    - Progress bar tipis di sebelah tombol menunjukan posisi lagu
//      berjalan (bisa disentuh/digeser untuk lompat ke bagian tertentu).
// ------------------------------------------------------------
function formatMediaTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ":" + (s < 10 ? "0" : "") + s;
}

function buildLoopingMp3Player(url, titleForSession, label) {
  const wrap = document.createElement("div");
  wrap.className = "kidung-mp3-player";

  const audio = document.createElement("audio");
  audio.loop = true; // "terus berulang mainnya sampai ditekan kembali"
  audio.preload = "none";
  audio.setAttribute("playsinline", "");
  audio.src = url;
  wrap.appendChild(audio);

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "round-media-btn kidung-mp3-toggle";
  toggleBtn.textContent = "▶️";
  toggleBtn.title = "Putar " + (label || "MP3") + " (berulang, tekan lagi untuk jeda)";
  toggleBtn.setAttribute("aria-label", toggleBtn.title);
  wrap.appendChild(toggleBtn);

  const progressWrap = document.createElement("div");
  progressWrap.className = "kidung-mp3-progress-wrap";

  const progress = document.createElement("input");
  progress.type = "range";
  progress.className = "kidung-mp3-progress";
  progress.min = "0";
  progress.max = "100";
  progress.value = "0";
  progress.setAttribute("aria-label", "Posisi " + (label || "MP3"));
  progressWrap.appendChild(progress);

  const timeLabel = document.createElement("span");
  timeLabel.className = "kidung-mp3-time";
  timeLabel.textContent = "0:00";
  progressWrap.appendChild(timeLabel);

  wrap.appendChild(progressWrap);

  let seeking = false;

  toggleBtn.addEventListener("click", () => {
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  });
  audio.addEventListener("play", () => {
    toggleBtn.textContent = "⏸️";
    toggleBtn.classList.add("playing");
    if (typeof requestWakeLock === "function") requestWakeLock();
    if (typeof wireMediaSession === "function") wireMediaSession(audio, titleForSession);
  });
  audio.addEventListener("pause", () => {
    toggleBtn.textContent = "▶️";
    toggleBtn.classList.remove("playing");
    if (typeof releaseWakeLock === "function") releaseWakeLock();
  });
  audio.addEventListener("timeupdate", () => {
    if (seeking || !audio.duration) return;
    progress.value = String((audio.currentTime / audio.duration) * 100);
    timeLabel.textContent = formatMediaTime(audio.currentTime);
  });
  progress.addEventListener("input", () => {
    seeking = true;
    if (audio.duration) timeLabel.textContent = formatMediaTime((progress.value / 100) * audio.duration);
  });
  progress.addEventListener("change", () => {
    if (audio.duration) audio.currentTime = (progress.value / 100) * audio.duration;
    seeking = false;
  });

  return wrap;
}

// Versi "TELANJANG" dari pemutar sebaris di atas -- HANYA elemen
// pemutarnya saja (iframe/video/audio + catatan Drive kalau perlu),
// TANPA baris tombol bulat + tombol bagikan bawaan buildInlineMediaBlock().
// Dipakai di toolbar layar baca Kidung (js/kidung-ui.js) yang sudah
// punya tombol kotak sendiri (🎬/📺) -- supaya tidak dobel tombol
// (dulu: tombol kotak DITEKAN, lalu buildInlineMediaBlock() menaruh LAGI
// 1 baris tombol bulat + bagikan sendiri di bawahnya, jadi kelihatan
// berantakan/dobel). Wake lock diurus sendiri lewat elemen medianya.
// `kind`: "mp3" | "mp4" | "youtube". `rawUrl`: link mentahnya.
function buildStandaloneMediaPlayer(kind, rawUrl, titleForSession) {
  const wrap = document.createElement("div");
  wrap.className = "standalone-media-player";

  function wireWakeLockToMediaEl(mediaEl) {
    if (typeof requestWakeLock !== "function") return;
    mediaEl.addEventListener("play", () => requestWakeLock());
    mediaEl.addEventListener("pause", () => { if (typeof releaseWakeLock === "function") releaseWakeLock(); });
    mediaEl.addEventListener("ended", () => { if (typeof releaseWakeLock === "function") releaseWakeLock(); });
  }

  if (kind === "mp3" || kind === "mp4") {
    if (isDriveUrl(rawUrl)) {
      const embedUrl = driveEmbedPreviewUrl(rawUrl);
      if (embedUrl) {
        const iframe = document.createElement("iframe");
        iframe.className = "inline-media-player " + (kind === "mp4" ? "inline-media-drive-video" : "inline-media-drive-audio");
        iframe.src = embedUrl;
        iframe.allow = "autoplay";
        iframe.allowFullscreen = true;
        wrap.appendChild(iframe);
        const hint = document.createElement("div");
        hint.className = "inline-media-drive-hint";
        hint.innerHTML = 'Tidak muncul / minta izin? Pastikan file di Google Drive dibagikan sebagai "Siapa saja yang memiliki link" (Anyone with the link), lalu <a href="' + driveOpenUrl(rawUrl) + '" target="_blank" rel="noopener noreferrer">buka langsung di sini</a>.';
        wrap.appendChild(hint);
        if (typeof requestWakeLock === "function") requestWakeLock();
      } else {
        window.open(driveOpenUrl(rawUrl), "_blank", "noopener,noreferrer");
        return null;
      }
    } else if (kind === "mp3") {
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.autoplay = true;
      audio.setAttribute("playsinline", "");
      audio.className = "inline-media-player";
      audio.src = rawUrl;
      wrap.appendChild(audio);
      if (typeof wireMediaSession === "function") wireMediaSession(audio, titleForSession);
      wireWakeLockToMediaEl(audio);
    } else {
      const video = document.createElement("video");
      video.controls = true;
      video.autoplay = true;
      video.setAttribute("playsinline", "");
      video.className = "inline-media-player";
      video.src = rawUrl;
      wrap.appendChild(video);
      if (typeof wireMediaSession === "function") wireMediaSession(video, titleForSession);
      wireWakeLockToMediaEl(video);
    }
  } else if (kind === "youtube") {
    const embedUrl = youTubeEmbedUrl(rawUrl);
    if (embedUrl) {
      const iframe = document.createElement("iframe");
      iframe.className = "inline-media-player inline-media-youtube";
      iframe.src = embedUrl + (embedUrl.indexOf("?") === -1 ? "?" : "&") + "autoplay=1&playsinline=1";
      iframe.allow = "autoplay; encrypted-media; picture-in-picture";
      iframe.allowFullscreen = true;
      wrap.appendChild(iframe);
    } else {
      window.open(rawUrl, "_blank", "noopener,noreferrer");
      return null;
    }
  }
  return wrap;
}

// Membangun blok tombol BULAT + pemutar sebaris untuk satu `media`
// ({mp3,mp4,youtube,label}). Dipakai di Rencana Baca, layar baca pasal,
// dan panel Kumpulan Ayat -- SATU implementasi dipakai di mana-mana
// supaya perilakunya konsisten.
function buildInlineMediaBlock(media, titleForSession) {
  const wrap = document.createElement("div");
  wrap.className = "inline-media-block";

  const btnRow = document.createElement("div");
  btnRow.className = "round-media-row";
  wrap.appendChild(btnRow);

  const playerSlot = document.createElement("div");
  playerSlot.className = "inline-media-slot";
  wrap.appendChild(playerSlot);

  let holdingWakeLock = false;
  function closePlayer() {
    if (holdingWakeLock && typeof releaseWakeLock === "function") { releaseWakeLock(); holdingWakeLock = false; }
    playerSlot.innerHTML = "";
  }
  // Menjaga layar tetap menyala selama audio/video ini sedang diputar --
  // pakai helper yang sama dengan pembacaan suara (TTS), lihat js/app.js.
  function wireWakeLockToMediaEl(mediaEl) {
    if (typeof requestWakeLock !== "function") return;
    mediaEl.addEventListener("play", () => { if (!holdingWakeLock) { requestWakeLock(); holdingWakeLock = true; } });
    mediaEl.addEventListener("pause", () => { if (holdingWakeLock) { releaseWakeLock(); holdingWakeLock = false; } });
    mediaEl.addEventListener("ended", () => { if (holdingWakeLock) { releaseWakeLock(); holdingWakeLock = false; } });
  }

  function openPlayer(kind) {
    closePlayer();
    if (kind === "mp3" || kind === "mp4") {
      const rawUrl = kind === "mp3" ? media.mp3 : media.mp4;
      if (isDriveUrl(rawUrl)) {
        // Link Google Drive -- TIDAK BISA dipasang langsung sebagai
        // src <audio>/<video> (itu bukan berkas mentah, tapi halaman
        // Drive). Satu-satunya cara resmi Drive bisa ditanam & langsung
        // memutar di halaman yang sama adalah lewat iframe "/preview".
        const embedUrl = driveEmbedPreviewUrl(rawUrl);
        if (embedUrl) {
          const iframe = document.createElement("iframe");
          iframe.className = "inline-media-player " + (kind === "mp4" ? "inline-media-drive-video" : "inline-media-drive-audio");
          iframe.src = embedUrl;
          iframe.allow = "autoplay";
          iframe.allowFullscreen = true;
          playerSlot.appendChild(iframe);
          // Penyebab #1 kalau pemutarnya muncul tapi isinya kosong / minta
          // izin ("You need permission") adalah file Drive-nya BELUM di-
          // share sebagai "Anyone with the link" (masih private/terbatas).
          // Kita tidak bisa mendeteksi ini secara otomatis dari sisi web
          // (beda origin, iframe-nya sendiri yang menampilkan pesan itu),
          // jadi cukup tampilkan pengingat + link buka langsung sebagai
          // jalan pintas untuk mengecek/membetulkan share setting-nya.
          const hint = document.createElement("div");
          hint.className = "inline-media-drive-hint";
          hint.innerHTML = 'Tidak muncul / minta izin? Pastikan file di Google Drive dibagikan sebagai "Siapa saja yang memiliki link" (Anyone with the link), lalu <a href="' + driveOpenUrl(rawUrl) + '" target="_blank" rel="noopener noreferrer">buka langsung di sini</a>.';
          playerSlot.appendChild(hint);
          // Kita tidak bisa "mendengar" event play/pause dari isi iframe
          // Drive (beda origin), jadi layar dijaga tetap menyala selama
          // pemutarnya terbuka (bukan hanya saat benar-benar sedang play).
          if (typeof requestWakeLock === "function") { requestWakeLock(); holdingWakeLock = true; }
        } else {
          // ID file tidak terbaca dari link-nya -- fallback: buka Drive
          // apa adanya di tab baru (lebih baik daripada tidak berbuat apa-apa).
          window.open(driveOpenUrl(rawUrl), "_blank", "noopener,noreferrer");
          return;
        }
      } else if (kind === "mp3") {
        // Bukan link Drive (file MP3 dihosting sendiri/tempat lain) --
        // tetap pakai elemen <audio> asli seperti sebelumnya.
        const audio = document.createElement("audio");
        audio.controls = true;
        audio.autoplay = true;
        audio.setAttribute("playsinline", "");
        audio.className = "inline-media-player";
        audio.src = rawUrl;
        playerSlot.appendChild(audio);
        wireMediaSession(audio, titleForSession);
        wireWakeLockToMediaEl(audio);
      } else {
        const video = document.createElement("video");
        video.controls = true;
        video.autoplay = true;
        video.setAttribute("playsinline", "");
        video.className = "inline-media-player";
        video.src = rawUrl;
        playerSlot.appendChild(video);
        wireMediaSession(video, titleForSession);
        wireWakeLockToMediaEl(video);
      }
    } else if (kind === "youtube") {
      const embedUrl = youTubeEmbedUrl(media.youtube);
      if (embedUrl) {
        const iframe = document.createElement("iframe");
        iframe.className = "inline-media-player inline-media-youtube";
        iframe.src = embedUrl + (embedUrl.indexOf("?") === -1 ? "?" : "&") + "autoplay=1&playsinline=1";
        iframe.allow = "autoplay; encrypted-media; picture-in-picture";
        iframe.allowFullscreen = true;
        playerSlot.appendChild(iframe);
      } else {
        // Bukan URL YouTube yang dikenali -- tetap buka apa adanya (fallback tab baru)
        window.open(media.youtube, "_blank", "noopener,noreferrer");
        return;
      }
    }
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "chip-btn small inline-media-close";
    closeBtn.textContent = "✕ Tutup pemutar";
    closeBtn.addEventListener("click", closePlayer);
    playerSlot.appendChild(closeBtn);
  }

  if (media.mp3) {
    const b = roundMediaButton("🎵", "Dengar MP3 (langsung di halaman ini, tanpa tab baru)");
    b.addEventListener("click", () => openPlayer("mp3"));
    btnRow.appendChild(b);
    btnRow.appendChild(shareMediaButton(media.mp3, "MP3"));
  }
  if (media.mp4) {
    const b = roundMediaButton("🎬", "Tonton MP4 (langsung di halaman ini, tanpa tab baru)");
    b.addEventListener("click", () => openPlayer("mp4"));
    btnRow.appendChild(b);
    btnRow.appendChild(shareMediaButton(media.mp4, "MP4"));
  }
  if (media.youtube) {
    const b = roundMediaButton("▶️", "Tonton YouTube (langsung di halaman ini, tanpa tab baru)");
    b.addEventListener("click", () => openPlayer("youtube"));
    btnRow.appendChild(b);
    btnRow.appendChild(shareMediaButton(media.youtube, "YouTube"));
  }
  return wrap;
}

// ------------------------------------------------------------
//  RENCANA BACA BERBASIS BACAAN BERSUARA (digabung ke menu 📅 Rencana
//  Baca -- lihat js/app.js renderPlanChooser()/renderPlanDetail()).
//  Sebelumnya ini adalah panel/menu 🎧 terpisah; sekarang tiap sheet di
//  CONFIG.READING_MEDIA_SHEETS yang sudah diisi URL-nya muncul sebagai
//  SATU PILIHAN rencana baca, di mana tiap "hari" = satu baris di sheet
//  itu (label bacaan apa adanya dari kolom Pembacaan, + link MP3/MP4/
//  YouTube menempel di hari itu).
// ------------------------------------------------------------

function buildMediaScheduleFromRows(rows) {
  return rows.map((row) => {
    const guess = guessReferenceFromPembacaan(row.pembacaan);
    return [{
      bookNum: guess ? guess.book.num : null,
      chapter: guess ? guess.chapter : null,
      label: row.pembacaan,
      mp3: row.mp3 || "",
      mp4: row.mp4 || "",
      youtube: row.youtube || "",
    }];
  });
}

// Menyusun objek "plan" (struktur sama seperti rencana baca biasa, lihat
// js/plans.js) dari satu sheet Bacaan Bersuara. Memakai data cache lokal
// dulu kalau ada (instan), baru ambil dari server kalau belum pernah.
async function buildMediaPlan(sheet) {
  const cached = loadMediaFromCache(sheet.key);
  const rows = (cached && cached.rows && cached.rows.length) ? cached.rows : await fetchMediaSheet(sheet);
  const schedule = buildMediaScheduleFromRows(rows);
  return {
    planId: "media_" + sheet.key,
    label: "🎧 " + sheet.label,
    days: schedule.length,
    startDate: new Date().toISOString(),
    schedule,
    completed: new Array(schedule.length).fill(false),
    mediaSheetKey: sheet.key,
  };
}

// Menarik ulang data TERBARU dari Google Sheet untuk rencana yang sedang
// aktif (kalau rencana itu berbasis Bacaan Bersuara), lalu memasang
// kembali link/labelnya -- progres centang yang sudah ada TETAP dijaga
// (dicocokkan berdasar urutan/index hari, bukan dihapus dan mulai dari 0).
async function resyncMediaPlan(plan) {
  const sheet = (CONFIG.READING_MEDIA_SHEETS || []).find((s) => s.key === plan.mediaSheetKey);
  if (!sheet || !sheet.csvUrl) throw new Error("Sheet Bacaan Bersuara ini sudah tidak ada di konfigurasi.");
  const rows = await fetchMediaSheet(sheet); // selalu dari server (bukan cache), ini memang tombol "sinkron ulang"
  const schedule = buildMediaScheduleFromRows(rows);
  const oldCompleted = plan.completed || [];
  plan.schedule = schedule;
  plan.days = schedule.length;
  plan.completed = schedule.map((_, i) => !!oldCompleted[i]);
  return plan;
}
