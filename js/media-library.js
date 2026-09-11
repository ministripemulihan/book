// ============================================================
//  🎵 PUSTAKA MEDIA -- menu BARU, MENGGANTIKAN js/effectpreview.js.
//
//  Lihat "RENCANA-PUSTAKA-MEDIA-FAVORIT.md" (bagian 3a, 4, 4b, 6, 7,
//  13) & "STATUS-PUSTAKA-MEDIA.md" untuk latar belakang lengkap.
//
//  SESI INI (11 Sep 2026) -- dikerjakan bagian yang PALING PENTING dulu
//  sesuai arahan operator ("yang mudah dulu, paling penting model list
//  YouTube & Efek Suara yang baru"):
//    ✅ Sambungan ke backend (apps-script/MediaLibraryCode.gs) --
//       media_list / media_add / media_update / media_delete.
//    ✅ Tab "Semua" / "🎬 YouTube" / "🔊 Efek Suara*" / "⭐ Favorit"
//       penuh: kartu grid, tebak-sumber-dari-link, form tambah dengan
//       checkbox 6 kategori baku + "kategori lain" + pengecekan typo,
//       gating level (MEDIA_LIBRARY_ADD_LEVELS/MEDIA_LIBRARY_SOUND_LEVELS),
//       ❤️ favorit (lewat js/favorites.js), menu "⋮" edit/hapus
//       bersyarat pemilik/admin.
//    ✅ Tab "🎆 Layar Publik*" -- DIPINDAHKAN UTUH dari js/effectpreview.js
//       (confetti/balon/reaksi emoji/seruan teks + efek suara, 100%
//       lokal di HP ini, tidak menyentuh Layar 2 sungguhan) supaya
//       effectpreview.js bisa dihapus.
//    ✅ (11 Sep 2026, sesi lanjutan) API publik `openAddForm`/
//       `renderItemCard` (+ opsi `onSaved` di `openAddForm`) ditambah di
//       bawah supaya bisa dipakai ULANG dari js/kidung-ui.js, bagian
//       "🔗 Referensi Media Lain" di layar baca kidung -- SUDAH SELESAI,
//       lihat js/kidung-ui.js (buildKidungMediaRefSection()).
//    🔜 BELUM (menyusul, lihat STATUS-PUSTAKA-MEDIA.md):
//       - Tab "Kidung" DI MENU INI (mlBody) masih versi SEDERHANA
//         (daftar semua media yang sudah punya kidungRef terisi, lintas
//         SEMUA kidung) -- ini beda dari & TIDAK menggantikan bagian
//         "🔗 Referensi Media Lain" di layar baca kidung (yang sudah
//         difilter per-kidung, sudah selesai di atas). Boleh dibiarkan
//         apa adanya (bukan prioritas).
//       - Efek Suara: metode "📤 Upload file dari HP" (IndexedDB lokal)
//         BELUM ada -- yang sudah jalan baru "🔗 Tempel Link Drive"
//         (satu-satunya yang bisa dibagikan ke gembala lain, sesuai
//         bagian 5 rencana).
//       - presentation-studio.js (tombol "➕ Tambah" di tab Efek
//         Panggung & YouTube, ganti sumber data YouTube) -- langkah 4,
//         belum dikerjakan, TIDAK disentuh sama sekali oleh file ini.
// ============================================================

const MediaLibrary = (() => {
  "use strict";

  // ------------------------------------------------------------
  // 1) DATA SYNC -- bicara ke apps-script/MediaLibraryCode.gs
  // ------------------------------------------------------------
  const Sync = {
    enabled() {
      return !!(CONFIG.MEDIA_LIBRARY_APPS_SCRIPT_URL && CONFIG.MEDIA_LIBRARY_APPS_SCRIPT_URL.indexOf("http") === 0);
    },
    // list({jenis, kidungRef}) -> Promise<items[]>. Tanpa jenis = semua
    // (sound+youtube) yang boleh dilihat username ini (difilter server).
    async list(opts) {
      const o = opts || {};
      const params = new URLSearchParams({ type: "media_list", username: currentUser || "" });
      if (o.jenis) params.set("jenis", o.jenis);
      if (o.kidungRef) params.set("kidungRef", o.kidungRef);
      const res = await fetch(CONFIG.MEDIA_LIBRARY_APPS_SCRIPT_URL + "?" + params.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (!data || !data.ok) throw new Error((data && data.error) || "Gagal memuat Pustaka Media");
      return data.items || [];
    },
    async add(fields) {
      const res = await fetch(CONFIG.MEDIA_LIBRARY_APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(Object.assign({ type: "media_add", username: currentUser || "" }, fields)),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (!data || !data.ok) throw new Error((data && data.error) || "Gagal menambah item");
      return data;
    },
    async update(id, fields) {
      const res = await fetch(CONFIG.MEDIA_LIBRARY_APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(Object.assign({ type: "media_update", id, username: currentUser || "", isAdmin: isAdministrator() }, fields)),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (!data || !data.ok) throw new Error((data && data.error) || "Gagal mengubah item");
      return data;
    },
    async remove(id) {
      const res = await fetch(CONFIG.MEDIA_LIBRARY_APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ type: "media_delete", id, username: currentUser || "", isAdmin: isAdministrator() }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (!data || !data.ok) throw new Error((data && data.error) || "Gagal menghapus item");
      return data;
    },
  };

  // ------------------------------------------------------------
  // 2) LEVEL / HAK AKSES (bagian 3a rencana)
  // ------------------------------------------------------------
  function levelsIntersect_(allowedList) {
    const allowed = allowedList || [];
    return (currentUserLevels || []).some((l) => allowed.includes(l));
  }
  function canAddMedia() { return levelsIntersect_(CONFIG.MEDIA_LIBRARY_ADD_LEVELS); }
  function canSeeSound() { return levelsIntersect_(CONFIG.MEDIA_LIBRARY_SOUND_LEVELS); }

  // ------------------------------------------------------------
  // 3) KATEGORI -- 6 baku + "kategori lain" dgn pengecekan typo/mirip
  //    (lihat "Aturan pengisian Kategori" di STATUS-PUSTAKA-MEDIA.md)
  // ------------------------------------------------------------
  const KATEGORI_BAKU = ["Anak", "Remaja", "Pemuda", "SPR", "Injil", "Bebas"];

  function normKategori_(s) {
    return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  }
  function parseKategoriString(str) {
    return String(str || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  function joinKategori(arr) {
    return (arr || []).filter(Boolean).join(", ");
  }
  // Bandingkan 1 kategori baru ke SEMUA kategori yang sudah pernah
  // dipakai (dari item yang sudah dimuat) -- kalau mirip/sama (tanpa
  // peduli besar/kecil huruf & spasi), sarankan yang sudah ada supaya
  // typo tidak lolos jadi kategori baru terpisah.
  function findSimilarKategori_(newName, allKnown) {
    const n = normKategori_(newName);
    if (!n) return null;
    let best = null;
    allKnown.forEach((k) => {
      const kn = normKategori_(k);
      if (!kn || kn === n) { if (kn === n) best = k; return; }
      // kemiripan sederhana: 1 typo huruf (jarak Levenshtein <= 1) atau
      // salah satu adalah substring dari yang lain (>= 3 huruf).
      if (!best && (levenshteinLE1_(kn, n) || (kn.length >= 3 && (kn.includes(n) || n.includes(kn))))) {
        best = k;
      }
    });
    return best;
  }
  function levenshteinLE1_(a, b) {
    if (Math.abs(a.length - b.length) > 1) return false;
    if (a === b) return true;
    let i = 0, j = 0, diff = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      diff++;
      if (diff > 1) return false;
      if (a.length === b.length) { i++; j++; }
      else if (a.length > b.length) i++;
      else j++;
    }
    return true;
  }

  // ------------------------------------------------------------
  // 4) TEBAK `sumber` DARI BENTUK LINK (bagian 14.3 rencana, sudah
  //    dikonfirmasi operator -- lihat STATUS-PUSTAKA-MEDIA.md)
  // ------------------------------------------------------------
  function guessSumberFromLink(link) {
    const l = String(link || "").trim().toLowerCase();
    if (!l) return "";
    if (l.includes("youtube.com") || l.includes("youtu.be")) return "youtube";
    if (l.includes("soundcloud.com")) return "soundcloud";
    if (l.includes("suno.com") || l.includes("suno.ai")) return "suno";
    if (l.includes("drive.google.com")) return "google_drive";
    if (/\.(mp3|wav|m4a)(\?|$)/.test(l)) return "mp3";
    if (/\.(mp4|mov)(\?|$)/.test(l)) return "google_drive";
    return "lainnya";
  }

  // ID video YouTube dari berbagai bentuk link (watch?v=, youtu.be/,
  // shorts/, embed/).
  function youtubeIdFromLink(link) {
    const l = String(link || "").trim();
    let m = l.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
    if (m) return m[1];
    m = l.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
    if (m) return m[1];
    m = l.match(/youtube\.com\/(?:shorts|embed)\/([A-Za-z0-9_-]{6,})/);
    if (m) return m[1];
    return "";
  }
  function youtubeThumbnail(link) {
    const id = youtubeIdFromLink(link);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
  }

  // ------------------------------------------------------------
  // BARU (12 Sep 2026, sesi perbaikan bug pemutaran) -- link Google
  // Drive yang ditempel operator biasanya bentuk "share" biasa
  // (.../file/d/ID/view?usp=sharing atau ...?id=ID), BUKAN link
  // unduhan langsung -- kalau dipasang apa adanya ke <audio src="...">
  // atau <video src="...">, browser dapat HALAMAN HTML (bukan berkas
  // audio/video), jadi GAGAL DIPUTAR (dan `.play()` gagalnya lewat
  // Promise, TIDAK melempar error yang bisa ditangkap try/catch biasa
  // -- ini penyebab efek suara kontribusi & video Drive "diam saja"
  // tanpa pesan error apa pun). Fungsi ini menebak ID file dari
  // berbagai bentuk link Drive & mengubahnya ke bentuk unduhan
  // langsung yang bisa diputar <audio>/<video> (berlaku untuk file
  // yang cukup kecil -- file besar tetap kena halaman "pindai virus"
  // Google, di luar kendali kode ini).
  // ------------------------------------------------------------
  function driveFileId_(link) {
    const s = String(link || "");
    let m = s.match(/drive\.google\.com\/file\/d\/([\w-]{10,})/);
    if (m) return m[1];
    m = s.match(/[?&]id=([\w-]{10,})/);
    if (m) return m[1];
    return "";
  }
  function resolvePlayableUrl_(link) {
    const id = driveFileId_(link);
    return id ? `https://drive.google.com/uc?export=download&id=${id}` : String(link || "");
  }
  // Judul otomatis lewat oEmbed YouTube (gratis, tanpa API key) --
  // dipakai form tambah supaya operator tidak wajib ketik nama manual
  // (bagian 9 rencana). Gagal diam-diam (mis. offline) -- form tetap
  // bisa dikirim dengan nama manual.
  async function fetchYoutubeOEmbedTitle_(link) {
    try {
      const res = await fetch("https://www.youtube.com/oembed?url=" + encodeURIComponent(link) + "&format=json");
      if (!res.ok) return "";
      const data = await res.json();
      return (data && data.title) || "";
    } catch (err) {
      return "";
    }
  }

  // Warna latar ikon otomatis (efek suara tanpa gambar) -- dipilih
  // konsisten dari nama/key, murni CSS/kode sendiri, 100% offline
  // (bagian 4 rencana).
  const ICON_COLORS_ = ["#2F6F63", "#A9812F", "#7C2A2A", "#4E7A34", "#2554C7", "#8A5A2E", "#57C7B0", "#B08900"];
  function colorForKey_(key) {
    const s = String(key || "");
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return ICON_COLORS_[h % ICON_COLORS_.length];
  }

  // ------------------------------------------------------------
  // 5) STATE
  // ------------------------------------------------------------
  const state = {
    loaded: false,
    loading: false,
    items: [],          // seluruh baris MediaLibrary yang boleh dilihat
    activeTab: "semua",
    search: "",
    error: "",
  };

  function el_(id) { return document.getElementById(id); }

  async function loadItems_(force) {
    if (state.loading) return;
    if (state.loaded && !force) return;
    if (!Sync.enabled()) {
      state.error = "Fitur ini belum diaktifkan. Isi dulu CONFIG.MEDIA_LIBRARY_APPS_SCRIPT_URL di js/config.js.";
      state.loaded = true;
      renderActiveTab_();
      return;
    }
    state.loading = true;
    state.error = "";
    renderActiveTab_();
    try {
      state.items = await Sync.list({});
      state.loaded = true;
    } catch (err) {
      state.error = "Gagal memuat Pustaka Media: " + (err && err.message ? err.message : String(err));
    } finally {
      state.loading = false;
      renderActiveTab_();
    }
  }

  // ------------------------------------------------------------
  // 6) KARTU (bagian 7 rencana -- foto/ikon + ❤️ pojok + ▶️ tengah +
  //    menu "⋮" edit/hapus bersyarat pemilik/admin)
  // ------------------------------------------------------------
  // spec: { id, favType, favId, jenis, sumber, nama, channel, keterangan,
  //         kategori, link, gambar, durasiDetik, diuploadOleh, isOwner,
  //         canManage, onPlay, onEdit, onDelete }
  function buildCard_(spec) {
    const card = document.createElement("div");
    card.className = "ml-card";

    const thumb = document.createElement("div");
    thumb.className = "ml-card-thumb";
    // PERBAIKAN (12 Sep 2026) -- sebelumnya thumbnail YouTube HANYA
    // muncul kalau kolom `Sumber` di Sheet persis berisi "youtube".
    // Untuk item hasil migrasi manual (Cara A) kolom itu sering kosong
    // walau link-nya YouTube asli, jadi gambar asli tidak pernah
    // muncul -- selalu jatuh ke kotak warna + ikon. Sekarang dicoba
    // tebak dari bentuk link juga (`guessSumberFromLink`), bukan cuma
    // mengandalkan kolom Sumber yang mungkin belum terisi.
    const sumberUntukGambar_ = spec.sumber || guessSumberFromLink(spec.link);
    if (spec.gambar) {
      thumb.style.backgroundImage = `url("${spec.gambar.replace(/"/g, "")}")`;
    } else if (sumberUntukGambar_ === "youtube") {
      const thumbUrl = youtubeThumbnail(spec.link);
      if (thumbUrl) thumb.style.backgroundImage = `url("${thumbUrl}")`;
      else thumb.style.background = colorForKey_(spec.id || spec.nama);
    } else {
      thumb.style.background = colorForKey_(spec.id || spec.nama);
      const emoji = document.createElement("span");
      emoji.className = "ml-card-emoji";
      emoji.textContent = spec.emoji || (spec.jenis === "sound" ? "🔊" : "🎬");
      thumb.appendChild(emoji);
    }

    // PERBAIKAN (12 Sep 2026, permintaan operator) -- tombol lingkaran
    // "▶️" terpisah DIHAPUS (terlalu kecil, malah menutupi gambar
    // thumbnail YouTube yang sudah kecil). Sekarang SELURUH kotak
    // gambar yang bisa ditekan untuk memutar, supaya gambar aslinya
    // tetap kelihatan penuh tanpa ikon menutupi.
    if (spec.onPlay) {
      thumb.classList.add("ml-card-playable");
      thumb.setAttribute("role", "button");
      thumb.setAttribute("aria-label", "Putar " + (spec.nama || ""));
      thumb.addEventListener("click", () => spec.onPlay());
    }

    const favBtn = document.createElement("button");
    favBtn.type = "button";
    favBtn.className = "ml-card-fav";
    const isFav = typeof Favorites !== "undefined" && Favorites.isFavorite(spec.favType, spec.favId);
    favBtn.textContent = isFav ? "❤️" : "🤍";
    favBtn.setAttribute("aria-label", "Favorit");
    favBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (typeof Favorites === "undefined") return;
      const nowFav = Favorites.toggleFavorite(spec.favType, spec.favId);
      favBtn.textContent = nowFav ? "❤️" : "🤍";
      if (state.activeTab === "favorit") renderActiveTab_();
    });
    thumb.appendChild(favBtn);

    if (spec.canManage) {
      const menuWrap = document.createElement("div");
      menuWrap.className = "ml-card-menu-wrap";
      const menuBtn = document.createElement("button");
      menuBtn.type = "button";
      menuBtn.className = "ml-card-menu-btn";
      menuBtn.textContent = "⋮";
      menuBtn.setAttribute("aria-label", "Menu");
      const menuDd = document.createElement("div");
      menuDd.className = "ml-card-menu-dd";
      menuDd.hidden = true;
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.textContent = "✏️ Edit";
      editBtn.addEventListener("click", (e) => { e.stopPropagation(); menuDd.hidden = true; spec.onEdit && spec.onEdit(); });
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.textContent = "🗑️ Hapus";
      delBtn.className = "ml-danger";
      delBtn.addEventListener("click", (e) => { e.stopPropagation(); menuDd.hidden = true; spec.onDelete && spec.onDelete(); });
      menuDd.appendChild(editBtn);
      menuDd.appendChild(delBtn);
      menuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelectorAll(".ml-card-menu-dd").forEach((d) => { if (d !== menuDd) d.hidden = true; });
        menuDd.hidden = !menuDd.hidden;
      });
      menuWrap.appendChild(menuBtn);
      menuWrap.appendChild(menuDd);
      thumb.appendChild(menuWrap);
    }

    card.appendChild(thumb);

    const body = document.createElement("div");
    body.className = "ml-card-body";
    const title = document.createElement("div");
    title.className = "ml-card-title";
    title.textContent = spec.nama || "(tanpa nama)";
    body.appendChild(title);
    if (spec.channel) {
      const ch = document.createElement("div");
      ch.className = "ml-card-sub";
      ch.textContent = spec.channel;
      body.appendChild(ch);
    }
    const metaBits = [];
    if (spec.kategori) metaBits.push(spec.kategori);
    if (spec.durasiDetik) metaBits.push(formatDurasi_(spec.durasiDetik));
    if (metaBits.length) {
      const meta = document.createElement("div");
      meta.className = "ml-card-meta";
      meta.textContent = metaBits.join(" · ");
      body.appendChild(meta);
    }
    card.appendChild(body);
    return card;
  }

  function formatDurasi_(detik) {
    const n = parseInt(detik, 10);
    if (!n || n <= 0) return "";
    const m = Math.floor(n / 60), s = n % 60;
    return m + ":" + String(s).padStart(2, "0");
  }

  // ------------------------------------------------------------
  // 7) PEMUTARAN per sumber (bagian 4b rencana)
  // ------------------------------------------------------------
  function playItem_(item) {
    if (item.jenis === "sound" && !item.sumber) {
      // Efek suara kontribusi (link Drive/mp3) -- putar langsung.
      // PERBAIKAN (12 Sep 2026): (1) link Drive "share" biasa ditebak
      // & diubah dulu ke bentuk unduhan langsung lewat
      // resolvePlayableUrl_(), (2) `.play()` mengembalikan Promise --
      // kalau gagal (mis. link ternyata tetap bukan berkas audio
      // langsung), errornya ASYNC dan TIDAK tertangkap try/catch biasa
      // seperti kode lama, jadi sebelumnya efek "diam saja" tanpa
      // fallback apa pun. Sekarang errornya ditangkap lewat
      // `.catch()` & barulah jatuh ke buka tab baru.
      const url = resolvePlayableUrl_(item.link);
      try {
        const audio = new Audio(url);
        const p = audio.play();
        if (p && typeof p.catch === "function") {
          p.catch(() => window.open(item.link, "_blank"));
        }
      } catch (err) {
        window.open(item.link, "_blank");
      }
      return;
    }
    const sumber = item.sumber || guessSumberFromLink(item.link);
    if (sumber === "youtube") {
      // PERBAIKAN (12 Sep 2026): `autoplay=1` DIHAPUS -- banyak
      // browser (terutama Safari/HP) MEMBLOKIR autoplay video BER-
      // SUARA sama sekali (video jadi diam/tidak jalan, kelihatan
      // seperti "videonya tidak keluar suara") kalau dipicu dari luar
      // iframe YouTube itu sendiri. Tanpa `autoplay`, video langsung
      // tampil dengan tombol ▶️ bawaan YouTube -- sekali ditekan
      // operator DIJAMIN keluar suara (itu klik langsung di dalam
      // pemutarnya sendiri, bukan trik autoplay).
      openPlayerOverlay_(`<iframe src="https://www.youtube.com/embed/${youtubeIdFromLink(item.link)}?playsinline=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`, item.nama, item.link);
    } else if (sumber === "soundcloud") {
      openPlayerOverlay_(`<iframe scrolling="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(item.link)}&auto_play=true"></iframe>`, item.nama, item.link);
    } else if (sumber === "mp3" || (sumber === "google_drive" && /\.(mp3|wav|m4a)(\?|$)/i.test(item.link))) {
      openPlayerOverlay_(`<audio controls autoplay src="${resolvePlayableUrl_(item.link)}"></audio>`, item.nama, item.link);
    } else if (sumber === "google_drive") {
      // PERBAIKAN (12 Sep 2026) -- dulu SEMUA link Drive selain
      // .mp3/.wav/.m4a (termasuk kebanyakan link "share" biasa tanpa
      // akhiran jelas, video ATAU audio) langsung dibuka tab baru
      // (tidak pernah dicoba diputar di dalam aplikasi). Sekarang
      // dicoba dulu lewat <video> (bisa memutar berkas video MAUPUN
      // audio-saja) dengan link yang sudah diubah ke bentuk unduhan
      // langsung -- fallback tombol buka link tetap ada di bawah video
      // kalau linknya ternyata tidak bisa diputar langsung (mis. file
      // besar kena halaman "pindai virus" Google).
      const resolved = resolvePlayableUrl_(item.link);
      openPlayerOverlay_(`<video controls autoplay playsinline src="${resolved}" style="width:100%;height:100%;background:#000;"></video>`, item.nama, item.link);
    } else {
      // suno / lainnya -- tidak ada cara embed yang bisa diandalkan,
      // buka tab baru saja (sesuai bagian 4b).
      window.open(item.link, "_blank");
    }
  }

  // PERBAIKAN (12 Sep 2026) -- parameter baru `fallbackLink` (opsional):
  // tombol "🔗 Buka" di header pemutar, jalan pintas kalau embed di
  // dalam kotak ternyata tidak keluar suara/gambar sama sekali
  // (mis. link Drive file besar kena halaman "pindai virus" Google) --
  // operator tinggal tekan ini untuk buka link aslinya di tab baru,
  // tidak perlu menebak-nebak kenapa gagal.
  function openPlayerOverlay_(innerHtml, title, fallbackLink) {
    let ov = el_("mlPlayerOverlay");
    if (!ov) {
      ov = document.createElement("div");
      ov.id = "mlPlayerOverlay";
      ov.className = "ml-player-overlay";
      ov.innerHTML = `
        <div class="ml-player-box">
          <div class="ml-player-header">
            <span id="mlPlayerTitle"></span>
            <div class="ml-player-header-actions">
              <a id="mlPlayerOpenLink" class="icon-btn" href="#" target="_blank" rel="noopener" title="Buka link aslinya" aria-label="Buka link aslinya" hidden>🔗</a>
              <button type="button" id="mlPlayerCloseBtn" class="icon-btn" aria-label="Tutup">✕</button>
            </div>
          </div>
          <div class="ml-player-body" id="mlPlayerBody"></div>
        </div>`;
      document.body.appendChild(ov);
      ov.addEventListener("click", (e) => { if (e.target === ov) closePlayerOverlay_(); });
      el_("mlPlayerCloseBtn").addEventListener("click", closePlayerOverlay_);
    }
    el_("mlPlayerTitle").textContent = title || "";
    el_("mlPlayerBody").innerHTML = innerHtml;
    const openLink = el_("mlPlayerOpenLink");
    if (openLink) {
      if (fallbackLink) { openLink.href = fallbackLink; openLink.hidden = false; }
      else { openLink.hidden = true; openLink.removeAttribute("href"); }
    }
    ov.hidden = false;
  }
  function closePlayerOverlay_() {
    const ov = el_("mlPlayerOverlay");
    if (!ov) return;
    el_("mlPlayerBody").innerHTML = "";
    ov.hidden = true;
  }

  // ------------------------------------------------------------
  // 8) TAB "Semua" / "🎬 YouTube" / "🔊 Efek Suara" / "Kidung"
  // ------------------------------------------------------------
  function itemToCard_(item) {
    const isOwner = String(item.diuploadOleh || "").toLowerCase() === String(currentUser || "").toLowerCase();
    const canManage = isOwner || isAdministrator();
    return buildCard_({
      id: item.id,
      favType: item.jenis === "sound" ? "sound" : "youtube",
      favId: item.id,
      jenis: item.jenis,
      sumber: item.sumber,
      nama: item.nama,
      channel: item.channel,
      kategori: item.kategori,
      link: item.link,
      gambar: item.gambar,
      durasiDetik: item.durasiDetik,
      canManage,
      onPlay: () => playItem_(item),
      onEdit: () => openAddForm_({ jenis: item.jenis, editItem: item }),
      onDelete: () => confirmDelete_(item),
    });
  }

  function builtinSoundToCard_(fx) {
    return buildCard_({
      id: "builtin:" + fx.key,
      favType: "sound",
      favId: "builtin:" + fx.key,
      jenis: "sound",
      nama: fx.label,
      emoji: fx.emoji,
      canManage: false,
      onPlay: () => { if (typeof SoundFX !== "undefined") SoundFX.play(fx.key); },
    });
  }

  async function confirmDelete_(item) {
    if (!window.confirm(`Hapus "${item.nama}" dari Pustaka Media? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      await Sync.remove(item.id);
      state.items = state.items.filter((it) => it.id !== item.id);
      renderActiveTab_();
    } catch (err) {
      alert("Gagal menghapus: " + (err && err.message ? err.message : String(err)));
    }
  }

  function matchesSearch_(item) {
    if (!state.search) return true;
    const q = state.search.toLowerCase();
    return [item.nama, item.channel, item.kategori, item.keterangan].filter(Boolean).some((s) => String(s).toLowerCase().includes(q));
  }

  function renderGrid_(container, cards, emptyMsg) {
    container.innerHTML = "";
    if (!cards.length) {
      const p = document.createElement("p");
      p.className = "ml-empty";
      p.textContent = emptyMsg || "Belum ada item.";
      container.appendChild(p);
      return;
    }
    cards.forEach((c) => container.appendChild(c));
  }

  function renderActiveTab_() {
    const body = el_("mlBody");
    if (!body) return;

    if (state.error) {
      body.innerHTML = `<p class="ml-error">${escapeHtml_(state.error)}</p>`;
      return;
    }
    if (state.loading && !state.loaded) {
      body.innerHTML = `<p class="ml-loading">Memuat Pustaka Media…</p>`;
      return;
    }

    body.innerHTML = "";

    if (state.activeTab === "layar-publik") {
      renderLayarPublikTab_(body);
      updateAddButtonVisibility_();
      return;
    }

    // Kotak cari (semua tab isi, kecuali Layar Publik)
    const searchRow = document.createElement("div");
    searchRow.className = "ml-search-row";
    searchRow.innerHTML = `<input type="search" id="mlSearchInput" placeholder="Cari nama, channel, atau kategori…" value="${escapeAttr_(state.search)}" />`;
    body.appendChild(searchRow);
    searchRow.querySelector("#mlSearchInput").addEventListener("input", (e) => {
      state.search = e.target.value;
      renderGridForTab_(grid);
    });

    const grid = document.createElement("div");
    grid.className = "ml-grid";
    body.appendChild(grid);

    renderGridForTab_(grid);
    updateAddButtonVisibility_();
  }

  function renderGridForTab_(grid) {
    const tab = state.activeTab;
    if (tab === "semua") {
      const cards = [];
      state.items.filter((it) => it.jenis === "youtube" || (it.jenis === "sound" && canSeeSound())).filter(matchesSearch_).forEach((it) => cards.push(itemToCard_(it)));
      renderGrid_(grid, cards, "Belum ada media. Tekan \"➕ Tambah\" untuk menambah yang pertama.");
    } else if (tab === "youtube") {
      const cards = state.items.filter((it) => it.jenis === "youtube").filter(matchesSearch_).map(itemToCard_);
      renderGrid_(grid, cards, "Belum ada video/audio YouTube. Tekan \"➕ Tambah\" untuk menambah.");
    } else if (tab === "sound") {
      const cards = [];
      if (typeof SoundFX !== "undefined") {
        SoundFX.LIST.filter((fx) => matchesSearch_({ nama: fx.label })).forEach((fx) => cards.push(builtinSoundToCard_(fx)));
      }
      state.items.filter((it) => it.jenis === "sound").filter(matchesSearch_).forEach((it) => cards.push(itemToCard_(it)));
      renderGrid_(grid, cards, "Belum ada efek suara.");
    } else if (tab === "kidung") {
      const cards = state.items.filter((it) => !!it.kidungRef).filter(matchesSearch_).map(itemToCard_);
      renderGrid_(grid, cards, "Belum ada referensi media untuk kidung (lihat catatan integrasi penuh di STATUS-PUSTAKA-MEDIA.md).");
    } else if (tab === "favorit") {
      const cards = [];
      if (typeof Favorites !== "undefined") {
        Favorites.listFavorites().forEach((fav) => {
          if (fav.type === "kidung") return; // sistem favorit kidung lama, terpisah
          if (fav.type === "sound" && String(fav.id).indexOf("builtin:") === 0) {
            const key = String(fav.id).slice("builtin:".length);
            const fx = typeof SoundFX !== "undefined" ? SoundFX.LIST.find((s) => s.key === key) : null;
            if (fx && matchesSearch_({ nama: fx.label })) cards.push(builtinSoundToCard_(fx));
            return;
          }
          const item = state.items.find((it) => it.id === fav.id);
          if (item && matchesSearch_(item)) cards.push(itemToCard_(item));
        });
      }
      renderGrid_(grid, cards, "Belum ada favorit. Tekan 🤍 di kartu mana pun untuk menambah.");
    }
  }

  function escapeHtml_(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function escapeAttr_(s) { return escapeHtml_(s); }

  // ------------------------------------------------------------
  // 9) TAB "🎆 Layar Publik" -- dipindahkan UTUH dari js/effectpreview.js
  //    (bagian 13a: nama baru untuk bekas menu "Coba Efek Suara &
  //    Visual", supaya effectpreview.js bisa dihapus).
  // ------------------------------------------------------------
  let confettiRAF_ = null;
  const CONFETTI_COLORS_ = ["#e2483d", "#3d8ee2", "#3de27a", "#e2c23d", "#a83de2", "#e2793d", "#3de2d4", "#e23d9e", "#ffffff"];
  const BALLOON_EMOJIS_ = ["🎈", "🎈", "🎈", "🎈"];
  const HAPPY_EMOJIS_ = ["🎉", "😄", "🥳", "✨"];

  // BARU (12 Sep 2026, permintaan operator "background Layar Publik
  // bisa ganti-ganti theme yang ada, dibuat persis theme yang sudah
  // ada sekarang") -- SENGAJA DISALIN PERSIS (bukan dipakai bareng)
  // dari `const THEMES` di js/presentation-studio.js (baris ~110),
  // supaya file ini tidak perlu bergantung ke modul Studio (yang tidak
  // selalu ikut termuat di semua halaman) hanya untuk 7 pasang warna.
  // PENTING: kalau operator menambah/mengubah tema di Studio Presentasi
  // nanti, salin juga perubahannya ke sini secara MANUAL supaya kedua
  // tempat tetap sinkron/sama persis.
  const LP_THEMES_ = [
    { key: "gelap", label: "Gelap", bg: "#05070c", ink: "#f5f2e8" },
    { key: "terang", label: "Terang", bg: "#fdfaf3", ink: "#1a1a1a" },
    { key: "emas", label: "Emas", bg: "#1a1206", ink: "#e9c977" },
    { key: "biru", label: "Biru Malam", bg: "#0b1730", ink: "#ffffff" },
    { key: "sepia", label: "Sepia", bg: "#f4e8d0", ink: "#3a2c17" },
    { key: "putih", label: "Putih", bg: "#ffffff", ink: "#173f91" },
    { key: "krem", label: "Krem", bg: "#fdf1cf", ink: "#2f6fb3" },
  ];
  const LP_THEME_KEY_ = "bible_app_ml_lp_theme_v1";
  function lpSavedThemeKey_() {
    try { return localStorage.getItem(LP_THEME_KEY_) || "terang"; } catch (e) { return "terang"; }
  }
  function lpApplyTheme_(key) {
    const t = LP_THEMES_.find((x) => x.key === key) || LP_THEMES_[1];
    const screen = lpScreenEl_();
    if (screen) { screen.style.background = t.bg; screen.style.color = t.ink; }
    document.querySelectorAll("#mlLpThemeGrid [data-lp-theme]").forEach((b) => {
      b.classList.toggle("active", b.dataset.lpTheme === t.key);
    });
    try { localStorage.setItem(LP_THEME_KEY_, t.key); } catch (e) {}
  }

  function lpScreenEl_() { return el_("mlLpScreen"); }
  function lpLayerEl_() { return el_("mlLpLayer"); }
  function lpCanvasEl_() { return el_("mlLpConfettiCanvas"); }

  function lpPlayConfetti_() {
    const canvas = lpCanvasEl_();
    const box = lpScreenEl_();
    if (!canvas || !box) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const W = box.clientWidth, H = box.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

  function lpPlayEmoji_(emoji) {
    const layer = lpLayerEl_();
    if (!layer) return;
    for (let i = 0; i < 9; i++) {
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

  function lpPlayBalloon_() {
    const layer = lpLayerEl_();
    if (!layer) return;
    for (let i = 0; i < 8; i++) {
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
  function lpPlayHappy_() {
    lpPlayConfetti_();
    HAPPY_EMOJIS_.forEach((emoji, i) => setTimeout(() => lpPlayEmoji_(emoji), i * 200));
  }
  function lpPlayShout_(text) {
    const layer = lpLayerEl_();
    if (!layer || !text) return;
    const span = document.createElement("span");
    span.className = "epv-shout-text";
    span.textContent = text;
    span.addEventListener("animationend", (e) => { if (e.animationName === "epvShoutPop") span.remove(); });
    layer.appendChild(span);
  }
  function lpPlayVisual_(effect, emoji) {
    if (effect === "emoji") lpPlayEmoji_(emoji);
    else if (effect === "balon") lpPlayBalloon_();
    else if (effect === "happy") lpPlayHappy_();
    else lpPlayConfetti_();
  }

  function renderLayarPublikTab_(body) {
    body.innerHTML = `
      <p class="ml-hint">
        Coba dulu suara &amp; efek visual di HP ini SEBELUM presentasi. Efek yang dipencet di sini
        <strong>hanya terdengar/terlihat di HP ini</strong> — <strong>tidak</strong> dikirim ke Layar 2 jemaat.
      </p>
      <div class="ml-lp-theme-row">
        <span>🎨 Tema latar (persis tema Layar Proyeksi di Studio Presentasi)</span>
        <div class="ps-theme-grid ps-theme-grid-inline" id="mlLpThemeGrid">
          ${LP_THEMES_.map((t) => `<button type="button" class="ps-theme-swatch" data-lp-theme="${t.key}" style="background:${t.bg}; color:${t.ink};${t.key === "putih" ? " border:1px solid #d8d8d8;" : ""}">${t.label}</button>`).join("")}
        </div>
      </div>
      <div class="ml-lp-sample-row">
        <label for="mlLpSampleInput">Contoh tulisan di layar (opsional)</label>
        <input type="text" id="mlLpSampleInput" class="ml-lp-sample-input" value="Yohanes 3:16 — Karena begitu besar kasih Allah akan dunia ini..." />
      </div>
      <div class="ml-lp-screen" id="mlLpScreen">
        <div class="ml-lp-sampletext" id="mlLpSampleText">Yohanes 3:16 — Karena begitu besar kasih Allah akan dunia ini...</div>
        <canvas id="mlLpConfettiCanvas" class="effect-preview-confetti-canvas"></canvas>
        <div id="mlLpLayer" class="effect-preview-layer"></div>
        <span class="effect-preview-screen-label">Pratinjau layar</span>
      </div>
      <div class="effect-preview-section">
        <h3>🎬 Efek Visual</h3>
        <div class="effect-preview-grid">
          <button type="button" class="chip-btn small" data-ml-effect="confetti">🎉 Confetti</button>
          <button type="button" class="chip-btn small" data-ml-effect="balon">🎈 Balon</button>
          <button type="button" class="chip-btn small" data-ml-effect="happy">🥳 Bahagia</button>
          <button type="button" class="chip-btn small" data-ml-emoji="👏">👏 Tepuk Tangan</button>
          <button type="button" class="chip-btn small" data-ml-emoji="❤️">❤️ Cinta</button>
          <button type="button" class="chip-btn small" data-ml-emoji="🙌">🙌 Semangat</button>
          <button type="button" class="chip-btn small" data-ml-emoji="🔥">🔥 Api</button>
          <button type="button" class="chip-btn small" data-ml-emoji="😂">😂 Tertawa</button>
          <button type="button" class="chip-btn small" data-ml-emoji="👍">👍 Jempol</button>
        </div>
      </div>
      <div class="effect-preview-section">
        <h3>📣 Seruan Teks</h3>
        <div class="effect-preview-grid">
          <button type="button" class="chip-btn small" data-ml-shout="PUJI TUHAN!">🙌 Puji Tuhan!</button>
          <button type="button" class="chip-btn small" data-ml-shout="HALELUYA!">🙌 Haleluya!</button>
          <button type="button" class="chip-btn small" data-ml-shout="AMIN!">🙌 Amin!</button>
        </div>
      </div>
      <div class="effect-preview-section">
        <h3>🔊 Efek Suara</h3>
        <div class="effect-preview-grid" id="mlLpSoundGrid"></div>
      </div>
      <div class="effect-preview-section">
        <h3>💾 Unduh Efek Suara (Satu-Satu)</h3>
        <p class="ml-hint">Sudah dengar-dengar di atas dan cocok? Unduh file MP3-nya satu per satu di sini.</p>
        <div class="soundfx-dl-list" id="mlLpDlList"></div>
      </div>`;

    body.querySelectorAll("#mlLpThemeGrid [data-lp-theme]").forEach((btn) => {
      btn.addEventListener("click", () => lpApplyTheme_(btn.dataset.lpTheme));
    });
    lpApplyTheme_(lpSavedThemeKey_());

    const input = el_("mlLpSampleInput");
    const sample = el_("mlLpSampleText");
    if (input && sample) input.addEventListener("input", () => { sample.textContent = input.value; });

    const soundGrid = el_("mlLpSoundGrid");
    if (typeof SoundFX !== "undefined" && soundGrid) {
      SoundFX.renderButtons(soundGrid, { className: "chip-btn small", dataAttr: "mlPreviewSound", onClick: (key) => SoundFX.play(key) });
    }
    const dlList = el_("mlLpDlList");
    if (typeof SoundFX !== "undefined" && dlList && typeof SoundFX.renderDownloadList === "function") {
      SoundFX.renderDownloadList(dlList);
    }

    body.querySelectorAll("[data-ml-effect]").forEach((btn) => btn.addEventListener("click", () => lpPlayVisual_(btn.dataset.mlEffect)));
    body.querySelectorAll("[data-ml-emoji]").forEach((btn) => btn.addEventListener("click", () => lpPlayVisual_("emoji", btn.dataset.mlEmoji)));
    body.querySelectorAll("[data-ml-shout]").forEach((btn) => btn.addEventListener("click", () => lpPlayShout_(btn.dataset.mlShout)));
  }

  function resetLayarPublikAnim_() {
    if (confettiRAF_) { cancelAnimationFrame(confettiRAF_); confettiRAF_ = null; }
    const canvas = lpCanvasEl_();
    if (canvas) { const ctx = canvas.getContext("2d"); ctx && ctx.clearRect(0, 0, canvas.width, canvas.height); }
    const layer = lpLayerEl_();
    if (layer) layer.innerHTML = "";
  }

  // ------------------------------------------------------------
  // 10) FORM TAMBAH/EDIT (bagian 8, 9, "Aturan pengisian Kategori")
  // ------------------------------------------------------------
  function knownKategoriList_() {
    const set = new Set(KATEGORI_BAKU);
    state.items.forEach((it) => parseKategoriString(it.kategori).forEach((k) => set.add(k)));
    return Array.from(set);
  }

  function openAddForm_(opts) {
    const o = opts || {};
    const jenis = o.jenis || "youtube"; // tab tempat tombol "+" ditekan menentukan jenis (bagian 14.3)
    const editItem = o.editItem || null;
    const kategoriTerpilih = editItem ? parseKategoriString(editItem.kategori) : [];
    const kategoriLainAwal = kategoriTerpilih.filter((k) => KATEGORI_BAKU.indexOf(k) === -1);
    // BARU (11 Sep 2026, langkah 4 STATUS-PUSTAKA-MEDIA.md) -- 2 opsi
    // TAMBAHAN dipakai pemanggil LUAR (js/presentation-studio.js):
    //   o.prefill = { link, nama, channel } -- isi awal form (mis. link
    //     yang SUDAH ditempel operator di kotak "➕ Tambah ke Pustaka"
    //     tab YouTube), diabaikan kalau sedang EDIT (editItem menang).
    //   o.defaultVisibility = "me" -- bawaan dropdown Visibilitas jadi
    //     "🔒 Hanya saya" (bukan "🌐 Semua" seperti bawaan form biasa) --
    //     dipakai tombol "➕ Tambah" di tab "🎉 Efek Panggung" (bagian
    //     12.2 RENCANA-PUSTAKA-MEDIA-FAVORIT.md: efek suara baru yang
    //     ditambah dari Studio bawaannya PRIBADI, operator ganti manual
    //     kalau memang mau dibagikan). Tidak berlaku saat EDIT (visibility
    //     lama tetap dipakai).
    const prefill = o.prefill || {};
    const defaultVisAll = editItem ? editItem.visibility === "all" : o.defaultVisibility !== "me";

    let ov = el_("mlFormOverlay");
    if (!ov) {
      ov = document.createElement("div");
      ov.id = "mlFormOverlay";
      ov.className = "info-kami-overlay ml-form-overlay";
      ov.hidden = true;
      document.body.appendChild(ov);
      ov.addEventListener("click", (e) => { if (e.target === ov) closeAddForm_(); });
    }

    const sumberOptions = (CONFIG.MEDIA_LIBRARY_SOURCES || [])
      .map((s) => `<option value="${s.key}">${s.emoji} ${s.label}</option>`).join("");

    ov.innerHTML = `
      <div class="info-kami-box ml-form-box">
        <div class="info-kami-header">
          <h2>${editItem ? "✏️ Edit" : "➕ Tambah"} ${jenis === "sound" ? "Efek Suara" : "YouTube / Link Media"}</h2>
          <div class="info-kami-header-actions">
            <button type="button" id="mlFormCloseBtn" class="icon-btn" aria-label="Tutup">✕</button>
          </div>
        </div>
        <form id="mlForm" class="ml-form">
          <label>Link
            <input type="url" id="mlFormLink" required placeholder="https://..." value="${escapeAttr_(editItem ? editItem.link : (prefill.link || ""))}" />
          </label>
          ${jenis === "youtube" ? `
          <label>Sumber
            <select id="mlFormSumber">${sumberOptions}</select>
          </label>` : ""}
          <label>Nama
            <input type="text" id="mlFormNama" required placeholder="Nama tampil" value="${escapeAttr_(editItem ? editItem.nama : (prefill.nama || ""))}" />
          </label>
          ${jenis === "youtube" ? `
          <label>Channel (opsional)
            <input type="text" id="mlFormChannel" value="${escapeAttr_(editItem ? editItem.channel : (prefill.channel || ""))}" />
          </label>` : ""}
          <label>Keterangan (opsional)
            <textarea id="mlFormKeterangan" rows="2">${escapeHtml_(editItem ? editItem.keterangan : "")}</textarea>
          </label>
          <fieldset class="ml-kategori-fieldset">
            <legend>Kategori</legend>
            <div class="ml-kategori-checks">
              ${KATEGORI_BAKU.map((k) => `<label class="ml-kategori-chk"><input type="checkbox" value="${k}" ${kategoriTerpilih.includes(k) ? "checked" : ""}/> ${k}</label>`).join("")}
            </div>
            <label>+ Kategori lain (pisah koma kalau lebih dari 1)
              <input type="text" id="mlFormKategoriLain" placeholder="mis. Lansia" value="${escapeAttr_(kategoriLainAwal.join(", "))}" />
            </label>
            <p id="mlFormKategoriSaran" class="ml-hint" hidden></p>
          </fieldset>
          <label>Visibilitas
            <select id="mlFormVisibility">
              <option value="all" ${defaultVisAll ? "selected" : ""}>🌐 Semua gembala boleh tahu</option>
              <option value="me" ${!defaultVisAll ? "selected" : ""}>🔒 Hanya saya yang tahu</option>
            </select>
          </label>
          <p id="mlFormError" class="ml-error" hidden></p>
          <div class="ml-form-actions">
            <button type="button" id="mlFormCancelBtn" class="chip-btn">Batal</button>
            <button type="submit" id="mlFormSubmitBtn" class="chip-btn primary">${editItem ? "Simpan Perubahan" : "Tambah"}</button>
          </div>
        </form>
      </div>`;
    ov.hidden = false;

    el_("mlFormCloseBtn").addEventListener("click", closeAddForm_);
    el_("mlFormCancelBtn").addEventListener("click", closeAddForm_);

    const linkInput = el_("mlFormLink");
    const sumberSelect = el_("mlFormSumber");
    const namaInput = el_("mlFormNama");
    if (sumberSelect && editItem) sumberSelect.value = editItem.sumber || guessSumberFromLink(editItem.link);
    // BARU (11 Sep 2026) -- prefill.link (dari "➕ Tambah ke Pustaka" tab
    // YouTube Studio) juga ikut ditebak sumbernya begitu form dibuka,
    // sama seperti kalau operator ketik/tempel manual di kotak Link
    // (listener "change" di bawah) -- supaya dropdown Sumber sudah benar
    // dari awal tanpa perlu operator sentuh dulu kotak Link-nya.
    if (sumberSelect && !editItem && prefill.link) {
      const guessedPrefill = guessSumberFromLink(prefill.link);
      if (guessedPrefill) sumberSelect.value = guessedPrefill;
    }
    if (linkInput) {
      linkInput.addEventListener("change", async () => {
        const guessed = guessSumberFromLink(linkInput.value);
        if (sumberSelect && guessed) sumberSelect.value = guessed;
        if (jenis === "youtube" && guessed === "youtube" && namaInput && !namaInput.value) {
          const title = await fetchYoutubeOEmbedTitle_(linkInput.value);
          if (title) namaInput.value = title;
        }
      });
    }

    const kategoriLainInput = el_("mlFormKategoriLain");
    const saranEl = el_("mlFormKategoriSaran");
    if (kategoriLainInput) {
      kategoriLainInput.addEventListener("blur", () => {
        const known = knownKategoriList_();
        const parts = parseKategoriString(kategoriLainInput.value);
        const realSaran = parts.map((p) => {
          const s = findSimilarKategori_(p, known);
          return s && normKategori_(s) !== normKategori_(p) ? { typed: p, suggest: s } : null;
        }).filter(Boolean);
        if (realSaran.length) {
          saranEl.hidden = false;
          saranEl.textContent = "Maksud Anda: " + realSaran.map((s) => `"${s.typed}" → "${s.suggest}"`).join(", ") + "? (kalau ya, ganti manual di kotak di atas)";
        } else {
          saranEl.hidden = true;
        }
      });
    }

    el_("mlForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const errEl = el_("mlFormError");
      errEl.hidden = true;
      const link = linkInput.value.trim();
      const nama = namaInput.value.trim();
      if (!link || !nama) return;
      const checked = Array.from(document.querySelectorAll(".ml-kategori-chk input:checked")).map((c) => c.value);
      const lain = parseKategoriString(kategoriLainInput ? kategoriLainInput.value : "");
      const kategori = joinKategori(checked.concat(lain));
      const visibility = el_("mlFormVisibility").value === "all" ? "all" : (currentUser || "");
      const fields = {
        jenis,
        sumber: jenis === "youtube" ? (sumberSelect ? sumberSelect.value : guessSumberFromLink(link)) : "",
        nama,
        channel: jenis === "youtube" ? (el_("mlFormChannel") ? el_("mlFormChannel").value.trim() : "") : "",
        keterangan: el_("mlFormKeterangan").value.trim(),
        kategori,
        link,
        kidungRef: (editItem && editItem.kidungRef) || o.kidungRef || "",
        visibility,
      };
      const submitBtn = el_("mlFormSubmitBtn");
      submitBtn.disabled = true;
      try {
        let savedItem = null;
        if (editItem) {
          await Sync.update(editItem.id, fields);
          const idx = state.items.findIndex((it) => it.id === editItem.id);
          savedItem = Object.assign({}, editItem, fields);
          if (idx !== -1) state.items[idx] = savedItem;
        } else {
          const res = await Sync.add(fields);
          savedItem = Object.assign({ id: res.id, diuploadOleh: currentUser || "" }, fields);
          state.items.unshift(savedItem);
        }
        closeAddForm_();
        // Kalau overlay "Pustaka Media" (mlBody) sedang tidak terbuka --
        // mis. form ini dibuka dari LUAR (js/kidung-ui.js, bagian "🔗
        // Referensi Media Lain") -- renderActiveTab_() di bawah aman
        // dipanggil tetap (no-op kalau elemennya tidak ada, lihat
        // penjagaan `if (!body) return;` di dalamnya). o.onSaved BARU
        // (11 Sep 2026) dipakai pemanggil LUAR itu supaya bisa me-refresh
        // daftar kartu miliknya sendiri setelah tambah/edit berhasil.
        renderActiveTab_();
        if (typeof o.onSaved === "function") o.onSaved(savedItem);
      } catch (err) {
        errEl.hidden = false;
        errEl.textContent = err && err.message ? err.message : String(err);
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
  function closeAddForm_() {
    const ov = el_("mlFormOverlay");
    if (ov) ov.hidden = true;
  }

  // ------------------------------------------------------------
  // 11) TABS + BUKA/TUTUP PANEL
  // ------------------------------------------------------------
  const TABS = [
    { key: "semua", label: "Semua" },
    { key: "youtube", label: "🎬 YouTube" },
    { key: "sound", label: "🔊 Efek Suara", gated: true },
    { key: "layar-publik", label: "🎆 Layar Publik", gated: true },
    { key: "kidung", label: "Kidung" },
    { key: "favorit", label: "⭐ Favorit" },
  ];

  function updateAddButtonVisibility_() {
    const addBtn = el_("mlAddBtn");
    if (!addBtn) return;
    const tab = state.activeTab;
    const showable = (tab === "youtube" || tab === "sound") && canAddMedia();
    addBtn.hidden = !showable;
    addBtn.textContent = tab === "sound" ? "➕ Tambah Efek Suara" : "➕ Tambah YouTube/Link";
  }

  function renderTabs_() {
    const bar = el_("mlTabs");
    if (!bar) return;
    bar.innerHTML = "";
    TABS.forEach((t) => {
      if (t.gated && !canSeeSound()) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ml-tab" + (state.activeTab === t.key ? " active" : "");
      btn.textContent = t.label;
      btn.addEventListener("click", () => {
        state.activeTab = t.key;
        state.search = "";
        renderTabs_();
        renderActiveTab_();
      });
      bar.appendChild(btn);
    });
  }

  function wireOnce_() {
    const addBtn = el_("mlAddBtn");
    if (addBtn && !addBtn.dataset.wired) {
      addBtn.dataset.wired = "1";
      addBtn.addEventListener("click", () => openAddForm_({ jenis: state.activeTab === "sound" ? "sound" : "youtube" }));
    }
    const refreshBtn = el_("mlRefreshBtn");
    if (refreshBtn && !refreshBtn.dataset.wired) {
      refreshBtn.dataset.wired = "1";
      refreshBtn.addEventListener("click", () => loadItems_(true));
    }
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".ml-card-menu-wrap")) {
        document.querySelectorAll(".ml-card-menu-dd").forEach((d) => { d.hidden = true; });
      }
    });
  }

  function open() {
    const overlay = el_("mediaLibraryOverlay");
    if (!overlay) return;
    overlay.hidden = false;
    wireOnce_();
    renderTabs_();
    updateAddButtonVisibility_();
    loadItems_(false);
  }
  function close() {
    const overlay = el_("mediaLibraryOverlay");
    if (overlay) overlay.hidden = true;
    closePlayerOverlay_();
    resetLayarPublikAnim_();
  }

  document.addEventListener("DOMContentLoaded", () => {
    const closeBtn = el_("mediaLibraryCloseBtn");
    if (closeBtn) closeBtn.addEventListener("click", close);
    const overlay = el_("mediaLibraryOverlay");
    if (overlay) overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const ov = el_("mediaLibraryOverlay");
      if (ov && !ov.hidden) close();
    });
  });

  return {
    open,
    close,
    Sync,
    guessSumberFromLink,
    canAddMedia,
    canSeeSound,
    // BARU (11 Sep 2026, langkah 3 STATUS-PUSTAKA-MEDIA.md) -- dipakai
    // js/kidung-ui.js (bagian "🔗 Referensi Media Lain") supaya kartu &
    // form tambah di layar baca kidung persis sama dengan yang dipakai
    // di menu "🎵 Pustaka Media" ini, tidak ada kode/tampilan duplikat.
    // openAddForm menerima opsi TAMBAHAN `kidungRef` (sudah didukung
    // openAddForm_ dari awal) & `onSaved(item)` (callback opsional,
    // dipanggil setelah tambah/edit berhasil disimpan).
    openAddForm: openAddForm_,
    renderItemCard: itemToCard_,
    // BARU (12 Sep 2026, sesi perbaikan bug pemutaran) -- dipakai ulang
    // js/presentation-studio.js (tombol efek suara kontribusi di tab
    // "🎉 Efek Panggung") supaya link Drive "share" biasa juga diubah
    // ke bentuk unduhan langsung SEBELUM dikirim ke Layar 2 sungguhan,
    // konsisten dengan pemutaran pratinjau di menu ini.
    resolvePlayableUrl: resolvePlayableUrl_,
  };
})();
