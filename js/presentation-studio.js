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
//   7) Tab Kidung/Hymn — MASIH PLACEHOLDER. Belum ada sumber data
//      kidung/hymn sama sekali di proyek ini (bukan hanya belum
//      tersambung) -- perlu diputuskan dulu sumbernya (mis. Google
//      Sheet baru "Kidung" dgn kolom nomor/judul/syair, mirip pola
//      Alkitab di js/db.js) sebelum tab ini bisa diisi sungguhan.
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
    biru:   { bg: "#0b1730", ink: "#dce8ff" },
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
      // PERBAIKAN (permintaan operator): dulu cuma teks placeholder
      // "▶️ Video YouTube diputar" -- sekarang kotak "Tayang" mini ini
      // betul-betul merender video-nya (iframe TERPISAH dari yang di
      // Layar 2, sengaja dibisukan + autoplay HANYA di sini supaya
      // operator bisa lihat video jalan meski kotaknya kecil; suara
      // sungguhan tetap cuma dari Layar 2, dikontrol lewat tombol
      // ▶️/⏸️/🔇 di atas -- lihat wireYtControls()).
      box.innerHTML = payload.embedUrl
        ? `<iframe src="${escapeHtml(toStudioPreviewEmbedUrl(payload.embedUrl))}" style="position:absolute; inset:0; width:100%; height:100%; border:0;" allow="autoplay; encrypted-media" title="Pratinjau video"></iframe>`
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
    renderMediaList();
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
    const ids = Object.keys(collections);
    sel.innerHTML = ids.length
      ? ids.map((id) => `<option value="${id}">${escapeHtml(collections[id].name)} (${collections[id].verseIds.length} ayat)</option>`).join("")
      : `<option value="">Belum ada Kumpulan Ayat</option>`;
    sel.onchange = renderCollectionList;
    renderCollectionList();
  }

  function renderCollectionList() {
    const wrap = el("psCollectionList");
    const sel = el("psCollectionSelect");
    if (!wrap || !sel || typeof loadCollections !== "function") return;
    const username = typeof currentUser !== "undefined" ? currentUser : null;
    const collections = loadCollections(username);
    const col = collections[sel.value];
    if (!col || !col.verseIds.length) {
      wrap.innerHTML = '<p class="present-saved-empty">Belum ada ayat di kumpulan ini.</p>';
      return;
    }
    wrap.innerHTML = "";
    col.verseIds.forEach((verseId) => {
      const v = typeof verseById !== "undefined" ? verseById[verseId] : null;
      const ref = v ? `${v.bookName} ${v.chapter}:${v.verse}` : verseId;
      const row = document.createElement("button");
      row.type = "button";
      row.className = "ps-verse-row";
      row.innerHTML = `<span class="ps-verse-ref">${escapeHtml(ref)}</span><span class="ps-verse-snippet">${v ? escapeHtml(v.text.slice(0, 50)) : ""}</span>`;
      row.addEventListener("click", () => {
        // PERBAIKAN: sebelumnya klik di sini TIDAK memperbarui kotak
        // pratinjau "Tayang" (psPreviewBox) milik Studio sendiri --
        // Presentation.sendVerse() hanya memperbarui pratinjau mini di
        // panel ⋮ lama (presentPreviewBox), bukan punya Studio. Ayat
        // TETAP tayang ke Layar 2 seperti biasa, tapi operator tidak
        // melihat konfirmasinya di kotak "Tayang" -- jadi terasa
        // seperti "tidak tampil". Sekarang renderStudioPreview()
        // dipanggil juga di sini, sama seperti Ayat Cepat & Media.
        const doSend = () => {
          if (v && typeof Presentation !== "undefined") Presentation.sendVerse(v, v.bookName);
          else post({ type: "text", text: ref });
          renderStudioPreview({ type: "verse", ref, texts: [{ label: "", text: v ? v.text : ref }] });
        };
        stageOrSend(ref, v ? v.text : ref, doSend);
      });
      wrap.appendChild(row);
    });
  }

  // ------------------------------------------------------------
  // Media Tersimpan (kiri) -- file (gambar/PDF-jadi-gambar) yang
  // ditekan "➕ Daftar" di tab File (tengah). Lokal per perangkat,
  // lihat addMediaItem()/loadMediaItems() di js/collections.js.
  // Tayang sama seperti tab File: 1 monitor langsung tayang, dual
  // monitor diantre dulu (stageOrSend), dan ◀ ▶ pindah halaman/slide.
  // ------------------------------------------------------------
  function renderMediaList() {
    const wrap = el("psMediaList");
    if (!wrap || typeof loadMediaItems !== "function") return;
    if (typeof window.populateYtBgPicker === "function") window.populateYtBgPicker();
    const username = typeof currentUser !== "undefined" ? currentUser : null;
    const items = loadMediaItems(username);
    if (!items.length) {
      wrap.innerHTML = '<p class="present-saved-empty">Belum ada media tersimpan.</p>';
      return;
    }
    wrap.innerHTML = "";
    items.forEach((item) => {
      let idx = 0;
      const isYt = item.type === "youtube";
      const images = item.images || [];
      const multi = images.length > 1;
      const row = document.createElement("div");
      row.className = "ps-file-row";
      row.innerHTML = `<span class="ps-file-name">${isYt ? "▶️ " : ""}${escapeHtml(item.name)}</span>
        <span class="ps-file-actions">
          ${multi ? `<button type="button" class="chip-btn small" data-act="prev">◀</button><span class="ps-file-slide-count" data-role="count">1/${images.length}</span><button type="button" class="chip-btn small" data-act="next">▶</button>` : ""}
          <button type="button" class="chip-btn small" data-act="play">▶️</button>
          ${isYt ? `<button type="button" class="chip-btn small" data-act="bg" title="Putar sebagai audio latar (video disembunyikan)">🎧</button>` : ""}
          <button type="button" class="chip-btn small danger" data-act="del">✖️</button>
        </span>`;
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
      // ◀ ▶ pindah slide/video LANGSUNG (juga saat live di mode dual
      // monitor) -- ini yang dipakai untuk "geser ke video berikutnya"
      // saat presentasi sedang berjalan, sama seperti slide gambar/PDF.
      if (prevBtn) prevBtn.addEventListener("click", () => { idx = (idx - 1 + images.length) % images.length; updateCount(); doSend(); });
      if (nextBtn) nextBtn.addEventListener("click", () => { idx = (idx + 1) % images.length; updateCount(); doSend(); });
      row.querySelector('[data-act="del"]').addEventListener("click", () => {
        if (!confirm(`Hapus "${item.name}" dari Media Tersimpan?`)) return;
        removeMediaItem(username, item.id);
        renderMediaList();
      });
      wrap.appendChild(row);

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
        wrap.appendChild(sub);
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
      el("psQuickAddBtn").addEventListener("click", () => {
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
        const name = (sel && sel.value && loadCollections(username)[sel.value]) ? loadCollections(username)[sel.value].name : prompt("Nama Kumpulan Ayat:", "Kumpulan Baru");
        if (!name) return;
        verses.forEach((v) => addVerseToCollection(username, name, v.id));
        renderCollectionSelect();
      });
    }
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

    function buildRow(file, images, statusText) {
      // `images`: array data-URL (1 gambar biasa = 1 elemen; PDF = 1 per
      // halaman). `idx` = slide yang sedang aktif untuk file ini.
      const row = document.createElement("div");
      row.className = "ps-file-row";
      let idx = 0;
      const multi = images.length > 1;
      row.innerHTML = `<span class="ps-file-name">${escapeHtml(file.name)}${statusText ? ` <em class="ps-file-status">${escapeHtml(statusText)}</em>` : ""}</span>
        <span class="ps-file-actions">
          ${multi ? `<button type="button" class="chip-btn small" data-act="prev">◀</button><span class="ps-file-slide-count" data-role="count">1/${images.length}</span><button type="button" class="chip-btn small" data-act="next">▶</button>` : ""}
          <button type="button" class="chip-btn small" data-act="play">▶️</button>
          <button type="button" class="chip-btn small" data-act="add" title="Simpan ke Media Tersimpan (kolom kiri)">➕ Daftar</button>
          <button type="button" class="chip-btn small danger" data-act="del">✖️</button>
        </span>`;
      const countEl = row.querySelector('[data-role="count"]');
      function updateCount() { if (countEl) countEl.textContent = `${idx + 1}/${images.length}`; }
      const playBtn = row.querySelector('[data-act="play"]');
      if (!images.length) playBtn.disabled = true;
      playBtn.addEventListener("click", () => sendSlide(images, idx));
      const prevBtn = row.querySelector('[data-act="prev"]');
      const nextBtn = row.querySelector('[data-act="next"]');
      if (prevBtn) prevBtn.addEventListener("click", () => { idx = (idx - 1 + images.length) % images.length; updateCount(); sendSlide(images, idx); });
      if (nextBtn) nextBtn.addEventListener("click", () => { idx = (idx + 1) % images.length; updateCount(); sendSlide(images, idx); });
      const addBtn = row.querySelector('[data-act="add"]');
      if (!images.length) addBtn.disabled = true;
      addBtn.addEventListener("click", () => {
        if (typeof addMediaItem !== "function") return;
        const username = typeof currentUser !== "undefined" ? currentUser : null;
        const name = prompt("Nama untuk item ini di Media Tersimpan:", file.name.replace(/\.[^.]+$/, ""));
        if (name === null) return; // dibatalkan
        const id = addMediaItem(username, name, images, file.name);
        if (!id) { alert("Gagal menyimpan (penyimpanan perangkat penuh?). Coba hapus item Media Tersimpan lama dulu."); return; }
        renderMediaList();
        addBtn.textContent = "✅ Tersimpan";
        setTimeout(() => { addBtn.textContent = "➕ Daftar"; }, 1200);
      });
      row.querySelector('[data-act="del"]').addEventListener("click", () => row.remove());
      return row;
    }

    function handleFiles(files) {
      Array.from(files || []).forEach((file) => {
        if (file.size > 25 * 1024 * 1024) { alert(`${file.name}: melebihi 25MB.`); return; }
        const isImage = /^image\//.test(file.type);
        const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
        const isPptx = /\.pptx?$/i.test(file.name);

        if (isImage) {
          const reader = new FileReader();
          reader.onload = () => list.appendChild(buildRow(file, [reader.result], ""));
          reader.readAsDataURL(file);
          return;
        }

        if (isPdf) {
          const row = buildRow(file, [], "mengonversi…");
          list.appendChild(row);
          pdfFileToImages(file).then((images) => {
            row.replaceWith(buildRow(file, images, `${images.length} halaman`));
          }).catch((err) => {
            row.querySelector(".ps-file-status").textContent = "gagal dikonversi";
            console.error(err);
            alert(`Gagal mengonversi ${file.name} ke gambar: ${err.message || err}`);
          });
          return;
        }

        if (isPptx) {
          alert(`${file.name}: konversi pptx langsung belum tersedia (perlu mesin render PowerPoint yang berat). Untuk hasil persis sama, simpan file ini sebagai PDF dari PowerPoint lalu unggah PDF-nya di sini -- akan otomatis dipecah per halaman.`);
          return;
        }

        alert(`${file.name}: jenis file ini belum didukung. Gunakan pptx, pdf, jpg, png, webp, atau gif.`);
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
    function populateYtBgPicker() {
      const picker = el("psYtBgSavedPicker");
      if (!picker || typeof loadMediaItems !== "function") return;
      const username = typeof currentUser !== "undefined" ? currentUser : null;
      const items = loadMediaItems(username).filter((it) => it.type === "youtube");
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

    if (saveBtn) saveBtn.addEventListener("click", () => {
      if (!queue.length || typeof addMediaItem !== "function") return;
      const defaultName = queue.length === 1 ? (queue[0].title || queue[0].videoId) : "Video YouTube";
      const name = prompt("Nama untuk daftar video ini di Media Tersimpan:", defaultName);
      if (name === null) return; // dibatalkan
      const username = typeof currentUser !== "undefined" ? currentUser : null;
      const embedUrls = queue.map((q) => q.embedUrl);
      // Judul + durasi per video (kalau sempat termuat) ikut disimpan supaya
      // panel Media Tersimpan bisa menampilkan daftarnya -- lihat
      // renderMediaList() & addMediaItem() di js/collections.js.
      const labels = queue.map((q) => ({ title: q.title || q.videoId, durationLabel: q.durationLabel || "" }));
      const id = addMediaItem(username, name, embedUrls, name, "youtube", labels);
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
  // postMessage (lihat yt_control di present.html). Tidak melakukan
  // apa-apa kalau tidak ada video yang sedang tayang (present.html
  // sendiri yang menjaga/abaikan kalau ytEl kosong).
  function wireYtControls() {
    const playBtn = el("psYtPlayBtn");
    const pauseBtn = el("psYtPauseBtn");
    const muteBtn = el("psYtMuteBtn");
    let muted = false;
    if (playBtn) playBtn.addEventListener("click", () => rawPost({ type: "yt_control", action: "play" }));
    if (pauseBtn) pauseBtn.addEventListener("click", () => rawPost({ type: "yt_control", action: "pause" }));
    if (muteBtn) muteBtn.addEventListener("click", () => {
      muted = !muted;
      rawPost({ type: "yt_control", action: muted ? "mute" : "unmute" });
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

    // Tombol Penunjuk/Pen kini ADA DI 2 TEMPAT (tab "Penunjuk & Pen" +
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
      if (wrap) wrap.classList.toggle("ps-pointer-mode", pointerActive || penActive);
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
      pointerBtns().forEach((b) => b.classList.toggle("active", pointerActive));
      penBtns().forEach((b) => b.classList.remove("active"));
      if (!pointerActive) { rawPost({ type: "pointer", on: false }); if (dot) dot.style.display = "none"; }
      updateMode();
    }));
    penBtns().forEach((btn) => btn.addEventListener("click", () => {
      penActive = !penActive;
      pointerActive = false;
      penBtns().forEach((b) => b.classList.toggle("active", penActive));
      pointerBtns().forEach((b) => b.classList.remove("active"));
      if (!penActive) { rawPost({ type: "pointer", on: false }); if (dot) dot.style.display = "none"; }
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
          rawPost({ type: "pen", stroke: seg, color });
          if (ctx && canvas) {
            syncCanvasSize();
            canvas.style.display = "block";
            if (seg.length > 1) {
              ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round";
              ctx.beginPath();
              seg.forEach((pt, i) => {
                const px = pt.x * canvas.width, py = pt.y * canvas.height;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
              });
              ctx.stroke();
            }
          }
        }
      });
      wrap.addEventListener("mousedown", () => { penStroke = []; });
      wrap.addEventListener("mouseleave", () => {
        if (pointerActive) { rawPost({ type: "pointer", on: false }); if (dot) dot.style.display = "none"; }
      });
      window.addEventListener("resize", syncCanvasSize);
    }
  }

  const DEFAULT_STAGE_THEME = { swatch: "gelap", font: "'Merriweather', Georgia, serif", bgColor: "#05070c", ink: "#f5f2e8", scale: 1 };

  // Selain dikirim ke Layar 2, font & warna tema juga diterapkan ke
  // kotak pratinjau Studio sendiri (#psPreviewBoxWrap) -- supaya
  // pratinjau "Tayang" benar-benar 1:1 mirip Layar 2 (bukan cuma warna
  // gelap default), termasuk untuk akurasi posisi Penunjuk/Pen yang
  // bergantung pada baris kalimat patah di titik yang sama.
  function applyThemeToStudioPreview(theme) {
    const wrap = el("psPreviewBoxWrap");
    if (!wrap) return;
    wrap.style.setProperty("--ps-preview-bg", theme.bgColor || DEFAULT_STAGE_THEME.bgColor);
    wrap.style.setProperty("--ps-preview-ink", theme.ink || DEFAULT_STAGE_THEME.ink);
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
    const MIN_ROW = 190;
    function maxRow() { return Math.round(window.innerHeight * 0.82); }
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

  return { init, openStudio, closeStudio, refreshGuestGate };
})();
