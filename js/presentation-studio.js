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
  };

  let msgColor = "#ffffff";
  let msgPos = "top";
  let msgRunning = false;

  let timerRunning = false;
  let timerDisplayInterval = null;
  let timerEndAt = null;
  let timerTotal = 0;

  let pointerActive = false;
  let penActive = false;
  let penStroke = [];
  // BARU (27 Agu 2026) -- 🔍 Kaca Pembesar, lihat wirePointerPen() di bawah.
  let magnifyActive = false;

  function el(id) { return document.getElementById(id); }
  function isDesktop() { return window.innerWidth >= DESKTOP_MIN_WIDTH; }

  function post(payload) {
    // Delegasikan pengiriman & preview-mirroring ke Presentation
    // (js/presentation.js) supaya satu sumber kebenaran untuk jendela
    // Layar 2 + status buka/tutup, sekaligus mengisi kotak pratinjau
    // milik Studio (#psPreviewBox) di sini.
    if (typeof Presentation === "undefined") return;
    if (payload.type === "text") Presentation.sendFreeText(payload.text);
    else if (payload.type === "clear") Presentation.clearScreen();
    else Presentation.postRaw ? Presentation.postRaw(payload) : rawPost(payload);
    renderStudioPreview(payload);
  }

  // Kirim tipe payload baru (theme/warta/footnote/timer/black/logo/
  // pointer/pen) lewat Presentation.postRaw() (js/presentation.js) --
  // supaya jendela Layar 2 & status buka/tutupnya tetap 1 sumber
  // kebenaran, dan supaya gerakan Penunjuk/Pen (dikirim tiap mousemove)
  // TIDAK membuka jendela baru / merebut fokus berkali-kali.
  function rawPost(payload) {
    if (typeof Presentation === "undefined" || !Presentation.postRaw) return;
    Presentation.postRaw(payload);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function renderStudioPreview(payload) {
    const box = el("psPreviewBox");
    if (!box) return;
    if (!payload || payload.type === "clear") {
      box.innerHTML = '<div class="present-preview-idle">Belum ada tayangan</div>';
      return;
    }
    if (payload.type === "black") { box.innerHTML = '<div class="present-preview-black">⬛ Layar Hitam</div>'; return; }
    if (payload.type === "logo") { box.innerHTML = '<div class="present-preview-idle">◆ Logo ditampilkan</div>'; return; }
    if (payload.type === "youtube") {
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
             <iframe id="psYtPreviewFrame" src="${escapeHtml(toStudioPreviewEmbedUrl(payload.embedUrl))}" style="position:absolute; inset:0; width:100%; height:100%; border:0; pointer-events:none;" allow="autoplay; encrypted-media" title="Pratinjau video (bisu, tidak bisa diklik)"></iframe>
             <div style="position:absolute; left:0; right:0; bottom:0; padding:3px 8px; font-size:11px; background:rgba(0,0,0,.55); color:#fff; pointer-events:none;">🔇 Pratinjau (bisu) — pakai ▶️/⏸️/🔇 di atas untuk Layar 2</div>
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
      const baitHtml = (payload.bait || []).map((b) => `<div class="present-preview-text">${escapeHtml((b.noBait ? b.noBait + ". " : "") + (b.teks || ""))}</div>`).join("");
      const koorHtml = payload.koorTeks ? `<div class="present-preview-text" style="color:#ffd84a; font-weight:600; margin-top:6px;"><b>Koor:</b> ${escapeHtml(payload.koorTeks)}</div>` : "";
      box.innerHTML = `${refHtml}${baitHtml}${koorHtml}`;
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
    slot.hidden = !isDualLive();
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
    if (!items.length) {
      wrap.innerHTML = '<p class="present-saved-empty">Belum ada item di kumpulan ini.</p>';
      return;
    }
    const reorderBtn = el("psCollectionReorderToggle");
    const reorderOn = !!(reorderBtn && reorderBtn.classList.contains("active"));
    wrap.innerHTML = "";
    items.forEach((it, i) => {
      const ref = genericItemRefText(it);
      const snippet = genericItemBodyText(it).slice(0, 50);
      const row = document.createElement("div");
      row.className = "ps-verse-row";
      row.dataset.playlistIdx = String(i);
      row.innerHTML =
        `<div class="ps-verse-row-body"><span class="ps-verse-ref">${escapeHtml(ref)}</span><span class="ps-verse-snippet">${escapeHtml(snippet)}</span></div>` +
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
    } else if (it.type === "text") {
      Presentation.sendFreeText(it.text || "");
      renderStudioPreview({ type: "text", text: it.text || "" });
    } else if (it.type === "announcement") {
      const txt = (it.title ? it.title + "\n\n" : "") + (it.text || "");
      Presentation.sendFreeText(txt);
      renderStudioPreview({ type: "text", text: txt });
    } else if (it.type === "kidung") {
      sendKidungSlide(it);
    } else if (it.type === "media") {
      sendMediaSlideFromCollection(it);
    }
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
    rawPost({ type: "slide", imageUrl: url });
    renderStudioPreview({ type: "slide", imageUrl: url });
  }

  function sendKidungSlide(it) {
    if (typeof Presentation === "undefined" || !Presentation.sendKidung) return;
    const payload = { ref: genericItemRefText(it), bait: it.bait || [], koorTeks: it.koorTeks || null };
    Presentation.sendKidung(payload);
    renderStudioPreview(Object.assign({ type: "kidung" }, payload));
  }

  function playlistGoTo(idx) {
    if (!activePlaylist) return;
    const items = activePlaylist.items;
    if (idx < 0 || idx >= items.length) return;
    activePlaylist.index = idx;
    sendGenericItemLive(items[idx]);
    highlightActivePlaylistRow();
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
            <button type="button" class="chip-btn small" data-act="add">➕ Daftar</button>
          </div>`;
        row.querySelector('[data-act="show"]').addEventListener("click", () => {
          setActivePlaylist(genericItems, i, detailTitle ? detailTitle.textContent : "");
          sendGenericItemLive(genericItems[i]);
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
      row.innerHTML = `<span class="ps-file-name">${isYt ? "▶️ " : ""}${item.driveFileId ? "☁️ " : ""}${escapeHtml(item.name)}</span>
        <span class="ps-file-actions">
          ${multi ? `<button type="button" class="chip-btn small" data-act="prev">◀</button><span class="ps-file-slide-count" data-role="count">1/${images.length}</span><button type="button" class="chip-btn small" data-act="next">▶</button>` : ""}
          ${showGrid ? `<button type="button" class="chip-btn small" data-act="grid" title="Lihat semua halaman sebagai mini-preview">🔳</button>` : ""}
          <button type="button" class="chip-btn small" data-act="play">▶️</button>
          ${isYt ? `<button type="button" class="chip-btn small" data-act="bg" title="Putar sebagai audio latar (video disembunyikan)">🎧</button>` : ""}
          ${!isYt ? `<button type="button" class="chip-btn small" data-act="copyname" title="Salin nama file ini">📋</button>` : ""}
          ${!isYt ? `<button type="button" class="chip-btn small" data-act="addcol" title="Tambahkan halaman yang sedang ditampilkan ke Kumpulan Ayat (kolom kiri)">➕ Kumpulan</button>` : ""}
          ${!isYt ? `<button type="button" class="chip-btn small" data-act="download" title="Unduh halaman yang sedang ditampilkan sebagai gambar">⬇️</button>` : ""}
          ${item.originalFile ? `<button type="button" class="chip-btn small" data-act="downloadOriginal" title="Unduh file PDF ASLI (utuh, bukan gambar per halaman)">⬇️ PDF Asli</button>` : ""}
          ${item.driveFileId ? `<button type="button" class="chip-btn small danger" data-act="deldrive" title="Hapus PERMANEN dari Drive (bukan cuma dari daftar ini)">🗑️ Hapus dari Drive</button>` : ""}
          <button type="button" class="chip-btn small danger" data-act="del">✖️</button>
        </span>`;
      itemWrap.appendChild(row);
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
        post({ type: "text", text: full });
      });
    }
  }

  // ------------------------------------------------------------
  // Pesan berjalan (kiri) -- dikirim sebagai "text" biasa (posisi &
  // warna diterapkan lewat theme minimal untuk tahap ini: warna teks
  // dikirim di dalam payload text, present.html memakai warna default
  // untuk versi awal ini).
  // ------------------------------------------------------------
  function wireMessage() {
    document.querySelectorAll("#psMsgColorRow .ps-color-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll("#psMsgColorRow .ps-color-chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        msgColor = chip.dataset.color;
      });
    });
    document.querySelectorAll("#psMsgPosRow [data-pos]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#psMsgPosRow [data-pos]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        msgPos = btn.dataset.pos;
      });
    });
    if (el("psMsgToggleBtn")) {
      el("psMsgToggleBtn").addEventListener("click", () => {
        msgRunning = !msgRunning;
        const btn = el("psMsgToggleBtn");
        const text = (el("psMsgText") && el("psMsgText").value.trim()) || "";
        if (msgRunning) {
          if (!text) { msgRunning = false; return; }
          btn.textContent = "⏹️ Stop";
          btn.classList.add("blinking");
          if (msgPos === "top") rawPost({ type: "warta", show: true, text });
          else if (msgPos === "bottom") rawPost({ type: "footnote", show: true, text });
          else post({ type: "text", text });
        } else {
          btn.textContent = "▶️ Tayangkan";
          btn.classList.remove("blinking");
          rawPost({ type: "warta", show: false, text: "" });
          rawPost({ type: "footnote", show: false, text: "" });
        }
      });
    }
  }

  // ------------------------------------------------------------
  // Timer
  // ------------------------------------------------------------
  function fmtMMSS(totalSec) {
    const s = Math.max(0, Math.round(totalSec));
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }

  function setTimerCustomSeconds(sec) {
    if (el("psTimerDisplay")) {
      el("psTimerDisplay").textContent = fmtMMSS(sec);
      el("psTimerDisplay").classList.remove("done");
      el("psTimerDisplay").classList.toggle("ps-timer-idle", sec > 0 && !timerRunning);
    }
    timerTotal = sec;
  }

  function syncTimerLabelPreview() {
    const preview = el("psTimerLabelPreview");
    if (!preview) return;
    const label = (el("psTimerLabel") && el("psTimerLabel").value.trim()) || "Sesi Bagi Nikmat";
    preview.textContent = label;
  }

  function startTimer(totalSeconds) {
    stopTimerDisplay();
    timerTotal = totalSeconds;
    timerEndAt = Date.now() + totalSeconds * 1000;
    timerRunning = true;
    const label = (el("psTimerLabel") && el("psTimerLabel").value.trim()) || "Sesi Bagi Nikmat";
    const bell = !!(el("psTimerBell") && el("psTimerBell").checked);
    syncTimerLabelPreview();
    rawPost({ type: "timer", action: "start", label, totalSeconds, endAt: timerEndAt, bell });
    const disp = el("psTimerDisplay");
    if (disp) disp.classList.remove("ps-timer-idle");
    timerDisplayInterval = setInterval(() => {
      const remain = (timerEndAt - Date.now()) / 1000;
      if (disp) {
        disp.textContent = fmtMMSS(remain);
        disp.classList.toggle("done", remain <= 0);
      }
      if (remain <= 0) { clearInterval(timerDisplayInterval); timerDisplayInterval = null; timerRunning = false; }
    }, 250);
  }

  function stopTimerDisplay() {
    if (timerDisplayInterval) { clearInterval(timerDisplayInterval); timerDisplayInterval = null; }
  }

  function stopTimer() {
    stopTimerDisplay();
    timerRunning = false;
    // Kirim "stop" WALAUPUN belum sempat "start" tersambung ke Layar 2
    // (mis. baru saja dibuka) -- lihat perbaikan antrean pesan di
    // js/presentation.js (sendToWindow/flushQueue): pesan ini akan
    // ditahan dulu lalu dikirim otomatis begitu Layar 2 siap, jadi
    // tombol "✖️" / "⏹️ Stop" tetap membuat overlay timer hilang di
    // Layar 2, bukan cuma di panel operator ini.
    rawPost({ type: "timer", action: "stop" });
    const disp = el("psTimerDisplay");
    if (disp) {
      disp.textContent = "00:00";
      disp.classList.remove("done");
      disp.classList.add("ps-timer-idle");
    }
  }

  function flashTimerNeedsDuration() {
    const disp = el("psTimerDisplay");
    if (!disp) return;
    disp.classList.add("done");
    setTimeout(() => { if (!timerRunning) disp.classList.remove("done"); }, 500);
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
    if (el("psTimerStartBtn")) el("psTimerStartBtn").addEventListener("click", () => {
      if (timerTotal > 0) startTimer(timerTotal);
      else flashTimerNeedsDuration(); // belum pilih durasi (preset/custom) -- kasih tanda, jangan diam saja
    });
    if (el("psTimerStopBtn")) el("psTimerStopBtn").addEventListener("click", () => stopTimer());
    if (el("psTimerCancelBtn")) el("psTimerCancelBtn").addEventListener("click", () => {
      stopTimer();
      setTimerCustomSeconds(0);
      document.querySelectorAll("[data-timer-preset]").forEach((b) => b.classList.remove("active"));
      if (el("psTimerCustomBtn")) el("psTimerCustomBtn").classList.remove("active");
    });
    syncTimerLabelPreview();
  }

  // ------------------------------------------------------------
  // BARU (27 Agu 2026) -- ⏱️ Stopwatch, hitung MAJU dari 0 (beda dari
  // ⏱️ Timer hitung mundur di atas). Dikendalikan dari Studio (di sini)
  // MAUPUN panel sederhana HP (js/presentation.js, wireStopwatchSimple())
  // -- keduanya kirim pesan `{type:"stopwatch", ...}` yang SAMA persis ke
  // Layar 2 (present.html, lihat showStopwatch() di sana), cuma beda
  // elemen DOM yang dipakai (prefix "ps" utk Studio, "present" utk panel
  // sederhana) -- lihat juga wireStopwatchSimple() di js/presentation.js.
  // ------------------------------------------------------------
  let swBaseStartAt = null; // Date.now() - (durasi yang sudah berjalan sejauh ini, dalam ms) -- SELAMA berjalan
  let swAccumulatedMs = 0; // durasi yang sudah terkumpul SAAT dijeda (dipakai start() berikutnya untuk melanjutkan, bukan mengulang dari 0)
  let swRunning = false;
  let swDisplayInterval = null;

  function fmtStopwatch(totalSec) {
    const s = Math.max(0, Math.floor(totalSec));
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const pad2 = (n) => String(n).padStart(2, "0");
    return hh > 0 ? `${hh}:${pad2(mm)}:${pad2(ss)}` : `${pad2(mm)}:${pad2(ss)}`;
  }

  function wireStopwatch() {
    const labelEl = el("psStopwatchLabel");
    const labelPreview = el("psStopwatchLabelPreview");
    const disp = el("psStopwatchDisplay");
    function syncLabelPreview() {
      if (labelPreview) labelPreview.textContent = (labelEl && labelEl.value.trim()) || "";
    }
    function tick() {
      if (!swRunning || swBaseStartAt == null) return;
      if (disp) disp.textContent = fmtStopwatch((Date.now() - swBaseStartAt) / 1000);
    }
    function start() {
      if (swRunning) return;
      // Melanjutkan dari jeda (swAccumulatedMs > 0) ATAU mulai murni dari
      // 0 -- baseStartAt digeser mundur sejauh durasi yang SUDAH terkumpul
      // supaya "Date.now() - baseStartAt" tetap menghasilkan total yang
      // benar tanpa perlu melacak jeda secara terpisah di Layar 2.
      swBaseStartAt = Date.now() - swAccumulatedMs;
      swRunning = true;
      const label = (labelEl && labelEl.value.trim()) || "";
      rawPost({ type: "stopwatch", action: "start", label, baseStartAt: swBaseStartAt });
      if (swDisplayInterval) clearInterval(swDisplayInterval);
      swDisplayInterval = setInterval(tick, 250);
      tick();
    }
    function pause() {
      if (!swRunning) return;
      swRunning = false;
      swAccumulatedMs = Date.now() - swBaseStartAt; // simpan durasi yang sudah berjalan sejauh ini
      if (swDisplayInterval) { clearInterval(swDisplayInterval); swDisplayInterval = null; }
      rawPost({ type: "stopwatch", action: "stop" });
    }
    function reset() {
      swRunning = false;
      swBaseStartAt = null;
      swAccumulatedMs = 0;
      if (swDisplayInterval) { clearInterval(swDisplayInterval); swDisplayInterval = null; }
      if (disp) disp.textContent = "00:00";
      rawPost({ type: "stopwatch", action: "reset" });
    }
    if (labelEl) labelEl.addEventListener("input", syncLabelPreview);
    if (el("psStopwatchStartBtn")) el("psStopwatchStartBtn").addEventListener("click", start);
    if (el("psStopwatchStopBtn")) el("psStopwatchStopBtn").addEventListener("click", pause);
    if (el("psStopwatchResetBtn")) el("psStopwatchResetBtn").addEventListener("click", reset);
    syncLabelPreview();
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
  // BARU -- Word (.docx) diunggah & diubah jadi gambar per "halaman",
  // sama pola dengan PDF di atas (pdf.js), memakai mammoth.js (dimuat
  // lazy dari CDN, hanya saat ada .docx diunggah). mammoth hanya bisa
  // membaca TEKS (extractRawText) -- gambar/tabel/format asli di dalam
  // dokumen Word TIDAK ikut tersalin, hanya teksnya -- lalu teks itu
  // kita bungkus (word-wrap) & pisah per "halaman" sendiri lewat
  // <canvas>. PENTING: Word tidak punya jumlah baris/halaman yang tetap
  // seperti PDF (mengalir bebas, tergantung ukuran kertas & font
  // aslinya) -- jadi pembagian halaman di sini PERKIRAAN saja (dipotong
  // ulang per sekitar 12 baris), bukan sama persis dengan tampilan di
  // Microsoft Word. Format lama .doc (bukan .docx) TIDAK didukung
  // mammoth -- pengguna diarahkan menyimpan ulang sebagai .docx atau PDF.
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

  function wrapTextLines(ctx, text, maxWidth) {
    const words = text.split(/\s+/).filter(Boolean);
    if (!words.length) return [""];
    const lines = [];
    let line = "";
    words.forEach((w) => {
      const test = line ? line + " " + w : w;
      if (line && ctx.measureText(test).width > maxWidth) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  async function docxFileToImages(file) {
    const mammoth = await loadMammoth();
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    const rawText = ((result && result.value) || "").trim();
    if (!rawText) throw new Error("Berkas ini tidak berisi teks yang bisa dibaca (mungkin isinya cuma gambar/tabel).");

    const W = 1280, H = 720, PAD_X = 90, PAD_Y = 80, LINE_H = 46, FONT = "30px 'Literata', Georgia, serif";
    const LINES_PER_PAGE = Math.floor((H - PAD_Y * 2) / LINE_H);

    const measureCanvas = document.createElement("canvas");
    const mctx = measureCanvas.getContext("2d");
    mctx.font = FONT;

    const allLines = [];
    rawText.split(/\n+/).map((p) => p.trim()).filter(Boolean).forEach((para) => {
      wrapTextLines(mctx, para, W - PAD_X * 2).forEach((l) => allLines.push(l));
      allLines.push(""); // baris kosong pemisah antar paragraf
    });
    while (allLines.length && allLines[allLines.length - 1] === "") allLines.pop();

    const pages = [];
    for (let i = 0; i < allLines.length; i += LINES_PER_PAGE) pages.push(allLines.slice(i, i + LINES_PER_PAGE));
    if (!pages.length) pages.push([""]);

    return pages.map((lines) => {
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#1a1a1a";
      ctx.font = FONT;
      ctx.textBaseline = "top";
      lines.forEach((line, i) => ctx.fillText(line, PAD_X, PAD_Y + i * LINE_H));
      return canvas.toDataURL("image/jpeg", 0.92);
    });
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
          const row = buildRow(file, [], "mengonversi…");
          list.appendChild(row);
          docxFileToImages(file).then((images) => {
            row.replaceWith(buildRow(file, images, `${images.length} halaman (perkiraan, teks saja)`));
          }).catch((err) => {
            row.querySelector(".ps-file-status").textContent = "gagal dikonversi";
            console.error(err);
            alert(`Gagal mengonversi ${file.name}: ${err.message || err}`);
          });
          return;
        }

        if (isOldDoc) {
          alert(`${file.name}: format .doc lama belum didukung. Buka di Word, lalu "Save As" -> pilih .docx (atau PDF), baru unggah lagi di sini.`);
          return;
        }

        if (isPptx) {
          alert(`${file.name}: konversi pptx langsung belum tersedia (perlu mesin render PowerPoint yang berat). Untuk hasil persis sama, simpan file ini sebagai PDF dari PowerPoint lalu unggah PDF-nya di sini -- akan otomatis dipecah per halaman.`);
          return;
        }

        alert(`${file.name}: jenis file ini belum didukung. Gunakan pptx, pdf, docx, jpg, png, webp, atau gif.`);
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

  function buildYoutubeEmbedUrl(id) {
    // TANPA autoplay -- video dimuat dalam keadaan siap/pause, bukan
    // langsung jalan. "enablejsapi=1" wajib ada supaya tombol
    // Play/Pause/Mute di Studio bisa mengontrolnya lewat postMessage.
    // "modestbranding=1&iv_load_policy=3" mengurangi sedikit tombol/
    // anotasi bawaan YouTube (logo & video terkait TETAP tidak bisa
    // dihilangkan total -- itu aturan YouTube, bukan batasan aplikasi
    // ini). "playsinline=1" supaya tidak fullscreen paksa di beberapa
    // browser.
    return `https://www.youtube.com/embed/${id}?rel=0&enablejsapi=1&modestbranding=1&iv_load_policy=3&playsinline=1`;
  }

  function toStudioPreviewEmbedUrl(embedUrl) {
    // Khusus untuk kotak mini "Tayang" di Studio (bukan Layar 2 asli):
    // dibuat autoplay + bisu, supaya operator langsung lihat videonya
    // "hidup" di layar kecil tanpa perlu menekan apa pun & tanpa dobel
    // suara dengan Layar 2 sungguhan.
    if (!embedUrl) return "";
    const sep = embedUrl.includes("?") ? "&" : "?";
    return embedUrl + sep + "autoplay=1&mute=1";
  }

  function formatYtDuration(totalSeconds) {
    if (!totalSeconds || !isFinite(totalSeconds) || totalSeconds <= 0) return "";
    const secs = Math.round(totalSeconds);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = String(secs % 60).padStart(2, "0");
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
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

  function wireYoutubeTab() {
    const input = el("psYtInput");
    const showBtn = el("psYtShowBtn");
    const addBtn = el("psYtAddQueueBtn");
    const saveBtn = el("psYtSaveQueueBtn");
    const queueList = el("psYtQueueList");
    if (!input || !showBtn) return;

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
      const embedUrl = buildYoutubeEmbedUrl(id);
      const bgMode = el("psYtBgMode") && el("psYtBgMode").checked;
      if (bgMode) {
        // Mode "Latar suara saja": video TIDAK menggantikan tampilan
        // ayat/pengumuman yang sedang tayang -- diputar TERSEMBUNYI di
        // #ytBg (lihat present.html), cuma suaranya yang terdengar.
        // Tidak lewat stageOrSend (itu untuk konten utama 1-layar-penuh);
        // audio latar langsung dikirim, terlepas dari mode 1/dual monitor.
        rawPost({ type: "yt_bg", embedUrl });
        setYtBgStatus(`🎧 Latar: ${id} (tekan ▶ Play di bawah untuk mulai)`);
        return;
      }
      const doSend = () => { rawPost({ type: "youtube", embedUrl }); renderStudioPreview({ type: "youtube", embedUrl }); };
      stageOrSend(`▶️ YouTube: ${id}`, embedUrl, doSend);
    }
    showBtn.addEventListener("click", doShow);
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
    const playBtn = el("psYtPlayBtn");
    const pauseBtn = el("psYtPauseBtn");
    const muteBtn = el("psYtMuteBtn");
    let muted = false;

    function sendYtCommand(action) {
      rawPost({ type: "yt_control", action }); // -> Layar 2 (present.html)
      const previewFrame = el("psYtPreviewFrame"); // -> pratinjau mini di Studio
      if (previewFrame && previewFrame.contentWindow) {
        const cmd = { play: "playVideo", pause: "pauseVideo", mute: "mute", unmute: "unMute" }[action];
        if (cmd) previewFrame.contentWindow.postMessage(JSON.stringify({ event: "command", func: cmd, args: [] }), "*");
      }
    }

    if (playBtn) playBtn.addEventListener("click", () => sendYtCommand("play"));
    if (pauseBtn) pauseBtn.addEventListener("click", () => sendYtCommand("pause"));
    if (muteBtn) muteBtn.addEventListener("click", () => {
      muted = !muted;
      sendYtCommand(muted ? "mute" : "unmute");
      muteBtn.textContent = muted ? "🔇 Bersuara" : "🔇 Mute";
      muteBtn.classList.toggle("active", muted);
    });
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
        if (sizeValueEl) sizeValueEl.textContent = penSize + "px";
      });
    }

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
        if (magnifyZoomValue) magnifyZoomValue.textContent = magnifyPercent + "%";
      });
    }
    const magnifyBtns = () => Array.from(document.querySelectorAll("[data-ps-magnify-toggle]"));

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
      if (wrap) wrap.classList.toggle("ps-pointer-mode", pointerActive || penActive || magnifyActive);
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
      pointerBtns().forEach((b) => b.classList.toggle("active", pointerActive));
      penBtns().forEach((b) => b.classList.remove("active"));
      magnifyBtns().forEach((b) => b.classList.remove("active"));
      if (!pointerActive) { rawPost({ type: "pointer", on: false }); if (dot) dot.style.display = "none"; }
      rawPost({ type: "magnify", on: false });
      updateMode();
    }));
    penBtns().forEach((btn) => btn.addEventListener("click", () => {
      penActive = !penActive;
      pointerActive = false;
      magnifyActive = false;
      penBtns().forEach((b) => b.classList.toggle("active", penActive));
      pointerBtns().forEach((b) => b.classList.remove("active"));
      magnifyBtns().forEach((b) => b.classList.remove("active"));
      if (!penActive) { rawPost({ type: "pointer", on: false }); if (dot) dot.style.display = "none"; }
      rawPost({ type: "magnify", on: false });
      updateMode();
    }));
    magnifyBtns().forEach((btn) => btn.addEventListener("click", () => {
      magnifyActive = !magnifyActive;
      pointerActive = false;
      penActive = false;
      magnifyBtns().forEach((b) => b.classList.toggle("active", magnifyActive));
      pointerBtns().forEach((b) => b.classList.remove("active"));
      penBtns().forEach((b) => b.classList.remove("active"));
      if (!magnifyActive) rawPost({ type: "magnify", on: false });
      if (dot) dot.style.display = "none";
      rawPost({ type: "pointer", on: false });
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
      });
      wrap.addEventListener("mousedown", () => { penStroke = []; });
      wrap.addEventListener("mouseleave", () => {
        if (pointerActive) { rawPost({ type: "pointer", on: false }); if (dot) dot.style.display = "none"; }
        if (magnifyActive) rawPost({ type: "magnify", on: false });
      });
      window.addEventListener("resize", syncCanvasSize);
    }
  }

  const DEFAULT_STAGE_THEME = { swatch: "gelap", font: "'Merriweather', Georgia, serif", bgColor: "#05070c", ink: "#f5f2e8", scale: 1 };

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
    applyThemeToStudioPreview(theme);
    rawPost({ type: "theme", theme: { font: theme.font, bgColor: theme.bgColor, ink: theme.ink, scale: theme.scale } });
  }

  function saveAndSendTheme(partial) {
    const raw = localStorage.getItem(THEME_KEY);
    let theme = { ...DEFAULT_STAGE_THEME };
    if (raw) { try { theme = { ...theme, ...JSON.parse(raw) }; } catch (e) {} }
    theme = { ...theme, ...partial };
    localStorage.setItem(THEME_KEY, JSON.stringify(theme));
    applyThemeToStudioPreview(theme);
    rawPost({ type: "theme", theme: { font: theme.font, bgColor: theme.bgColor, ink: theme.ink, scale: theme.scale } });
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
    function applyScale() {
      const pct = Number(el("psFontScale").value);
      saveAndSendTheme({ scale: pct / 100 });
    }
    if (el("psFontScale")) el("psFontScale").addEventListener("input", applyScale);
    if (el("psFontDec")) el("psFontDec").addEventListener("click", () => { el("psFontScale").value = Math.max(60, Number(el("psFontScale").value) - 10); applyScale(); });
    if (el("psFontInc")) el("psFontInc").addEventListener("click", () => { el("psFontScale").value = Math.min(160, Number(el("psFontScale").value) + 10); applyScale(); });
    // Duplikat A-/A+ di baris ps-preview-quicktools (selalu kelihatan di
    // atas kotak "Tayang") -- pakai fungsi applyScale() & psFontScale yang
    // SAMA (sumber kebenaran tetap 1: psFontScale), jadi kedua pasang
    // tombol (di sini & di tab "🎨 Tampilan") selalu sinkron satu sama lain.
    if (el("psFontDecTop")) el("psFontDecTop").addEventListener("click", () => { el("psFontScale").value = Math.max(60, Number(el("psFontScale").value) - 10); applyScale(); });
    if (el("psFontIncTop")) el("psFontIncTop").addEventListener("click", () => { el("psFontScale").value = Math.min(160, Number(el("psFontScale").value) + 10); applyScale(); });
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
    const LABEL_OVERHEAD = 60; // tinggi label "Berikutnya/Tayang" + padding panel
    const MIN_ROW = 130;
    // PERMINTAAN OPERATOR (28 Agu 2026): batas atas lama (82% tinggi
    // jendela) kebablasan -- kotak "Berikutnya"/"Tayang" bisa diseret
    // nyaris sebesar seluruh Studio, sampai TIDAK CUKUP ruang tersisa
    // buat panel kontrol di bawahnya (Kumpulan Ayat / Kidung / Aksi &
    // Tema) -- itulah sebab panel-panel itu jadi kepotong & butuh
    // discroll (muncul garis scrollbar vertikal di tepi kanan, lihat
    // titik No. 2 di tangkapan layar operator). Sekarang baris pratinjau
    // dikunci JAUH lebih kecil (mockup "2 monitor kecil" sungguhan,
    // bukan lagi bisa segede layar): maksimum 220px ATAU sisa tinggi
    // jendela dikurangi 460px (kira-kira tinggi minimum panel kontrol
    // supaya tidak perlu discroll) -- yang lebih kecil di antara
    // keduanya yang dipakai. Nilai lama yang mungkin sudah kepalang
    // tersimpan di localStorage (dari sebelum perbaikan ini) IKUT
    // dikecilkan otomatis lewat clamp ini setiap kali dimuat/diresize,
    // operator tidak perlu menyeret ulang secara manual.
    function maxRow() { return Math.max(MIN_ROW, Math.min(220, window.innerHeight - 460)); }
    function apply(rowPx) {
      const clamped = Math.max(MIN_ROW, Math.min(maxRow(), Math.round(rowPx)));
      studio.style.setProperty("--ps-preview-row-h", clamped + "px");
      studio.style.setProperty("--ps-preview-box-h", Math.max(90, clamped - LABEL_OVERHEAD) + "px");
      try { localStorage.setItem(STORAGE_KEY, String(clamped)); } catch (e) {}
    }
    try {
      const saved = Number(localStorage.getItem(STORAGE_KEY));
      if (saved) apply(saved);
    } catch (e) {}
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
    wireQuickText();
    wireTicker("psWarta", "warta");
    wireTicker("psFoot", "footnote");
    wirePointerPen();
    wireTheme();
    wireNextBox();
    wireUiTheme();
    wireClock();
    wireYoutubeTab();
    wireYtControls();
    wireKidungTab();
    wirePlaylistKeyNav();
    wireCollectionReorderToggle();
    wireCollectionShareButton();

    if (el("presentOpenStudioBtn")) el("presentOpenStudioBtn").addEventListener("click", openStudio);
    // Jalan pintas di header utama (index.html, ikon 🎛️ -- khusus laptop/
    // komputer, lihat refreshDeviceGate()) supaya operator tidak perlu
    // buka menu "⋮" dulu untuk sampai ke tombol "Buka Studio Presentasi".
    if (el("headerStudioBtn")) el("headerStudioBtn").addEventListener("click", openStudio);
    if (el("psOpenWindowBtn")) el("psOpenWindowBtn").addEventListener("click", () => { if (typeof Presentation !== "undefined") { Presentation.openWindow(); refreshStatusUi(); } });
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
    });
  }

  return { init, openStudio, closeStudio, refreshGuestGate, applySharedTheme };
})();
