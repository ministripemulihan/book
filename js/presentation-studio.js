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
//   3) Checklist 8 versi Alkitab (IND/ITB, IND-RC, ENG, ENG-RC, MDR,
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
    if (payload.type === "youtube") { box.innerHTML = '<div class="present-preview-idle">▶️ Video YouTube diputar</div>'; return; }
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
    refreshStatusUi();
    renderCollectionSelect();
    renderMediaList();
    applyStoredTheme();
    watchDualLayout();
  }

  function closeStudio() {
    if (el("presentStudio")) el("presentStudio").hidden = true;
    document.body.classList.remove("ps-open");
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
          <button type="button" class="chip-btn small danger" data-act="del">✖️</button>
        </span>`;
      const countEl = row.querySelector('[data-role="count"]');
      function updateCount() { if (countEl) countEl.textContent = `${idx + 1}/${images.length}`; }
      function doSend() {
        const url = images[idx];
        if (!url) return;
        if (isYt) { rawPost({ type: "youtube", embedUrl: url }); renderStudioPreview({ type: "youtube" }); }
        else { rawPost({ type: "slide", imageUrl: url }); renderStudioPreview({ type: "slide", imageUrl: url }); }
      }
      row.querySelector('[data-act="play"]').addEventListener("click", () => stageOrSend(item.name, item.name, doSend));
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
    ind: "ITB", rvind: "IND-RC", eng: "ENG", rveng: "ENG-RC",
    chs: "MDR", chssmp: "MDR-S", kjv: "KJV", jawa: "JAWA",
  };

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

    // Untuk tiap referensi (dipisah ";"), kumpulkan teks dari SEMUA versi
    // tercentang yang punya data untuk pasal itu -- hasilnya dipakai baik
    // untuk pratinjau ketik-cepat maupun untuk ditayangkan ke Layar 2.
    function resolveRefBlocks() {
      if (!input || typeof parseReference !== "function" || typeof getChapterVerses !== "function") return [];
      const parts = input.value.split(/[;\n]+/).map((p) => p.trim()).filter(Boolean);
      const versions = getCheckedVersions();
      const out = [];
      parts.forEach((p) => {
        const ref = parseReference(p);
        if (!ref) return;
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
        const bookName = (versionBlocks[0].verses[0] && versionBlocks[0].verses[0].bookName) || ref.book.name || p;
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
  // Tab YouTube -- tempel link video, langsung tayang penuh 1 layar
  // di Layar 2 lewat <iframe> (present.html). KHUSUS laptop/komputer
  // seperti fitur Studio lainnya (lihat refreshDeviceGate()); tidak
  // pernah muncul di HP karena seluruh #presentStudio disembunyikan
  // di layar sempit.
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
    // gambar/embed-URL, baru addMediaItem() sekali di akhir.
    let queue = []; // [{ id, embedUrl, label }]

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
        row.innerHTML = `<span class="ps-file-name">${i + 1}. ${escapeHtml(q.label)}</span>
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
      const embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
      const doSend = () => { rawPost({ type: "youtube", embedUrl }); renderStudioPreview({ type: "youtube" }); };
      stageOrSend(`▶️ YouTube: ${id}`, embedUrl, doSend);
    }
    showBtn.addEventListener("click", doShow);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); doShow(); } });

    if (addBtn) addBtn.addEventListener("click", () => {
      const id = extractYoutubeId(input.value);
      if (!id) { alert("Link YouTube tidak dikenali."); return; }
      const embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
      queue.push({ id: "q_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6), embedUrl, label: id });
      input.value = "";
      renderQueue();
    });

    if (saveBtn) saveBtn.addEventListener("click", () => {
      if (!queue.length || typeof addMediaItem !== "function") return;
      const name = prompt("Nama untuk daftar video ini di Media Tersimpan:", "Video YouTube");
      if (name === null) return; // dibatalkan
      const username = typeof currentUser !== "undefined" ? currentUser : null;
      const embedUrls = queue.map((q) => q.embedUrl);
      const id = addMediaItem(username, name, embedUrls, name, "youtube");
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
  // Kanan: Aksi Cepat, Warta, FootNote, Penunjuk & Pen, Tema
  // ------------------------------------------------------------
  function wireQuickActions() {
    if (el("psActBlack")) el("psActBlack").addEventListener("click", () => { rawPost({ type: "black" }); renderStudioPreview({ type: "black" }); });
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
    if (el("psPointerToggle")) el("psPointerToggle").addEventListener("click", () => {
      pointerActive = !pointerActive;
      penActive = false;
      el("psPointerToggle").classList.toggle("active", pointerActive);
      if (el("psPenToggle")) el("psPenToggle").classList.remove("active");
      if (!pointerActive) { rawPost({ type: "pointer", on: false }); if (dot) dot.style.display = "none"; }
      updateMode();
    });
    if (el("psPenToggle")) el("psPenToggle").addEventListener("click", () => {
      penActive = !penActive;
      pointerActive = false;
      el("psPenToggle").classList.toggle("active", penActive);
      if (el("psPointerToggle")) el("psPointerToggle").classList.remove("active");
      if (!penActive) { rawPost({ type: "pointer", on: false }); if (dot) dot.style.display = "none"; }
      updateMode();
    });
    if (el("psPenClear")) el("psPenClear").addEventListener("click", () => {
      rawPost({ type: "pen", clear: true });
      if (ctx && canvas) { ctx.clearRect(0, 0, canvas.width, canvas.height); canvas.style.display = "none"; }
    });
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

  function applyStoredTheme() {
    const raw = localStorage.getItem(THEME_KEY);
    let theme = { ...DEFAULT_STAGE_THEME };
    if (raw) { try { theme = { ...theme, ...JSON.parse(raw) }; } catch (e) {} }
    document.querySelectorAll("#psThemeGrid [data-theme]").forEach((b) => b.classList.toggle("active", b.dataset.theme === theme.swatch));
    if (el("psFontSelect")) el("psFontSelect").value = theme.font;
    if (el("psBgColor")) el("psBgColor").value = theme.bgColor;
    if (el("psFontScale")) el("psFontScale").value = String(Math.round(theme.scale * 100));
    rawPost({ type: "theme", theme: { font: theme.font, bgColor: theme.bgColor, ink: theme.ink, scale: theme.scale } });
  }

  function saveAndSendTheme(partial) {
    const raw = localStorage.getItem(THEME_KEY);
    let theme = { ...DEFAULT_STAGE_THEME };
    if (raw) { try { theme = { ...theme, ...JSON.parse(raw) }; } catch (e) {} }
    theme = { ...theme, ...partial };
    localStorage.setItem(THEME_KEY, JSON.stringify(theme));
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
  }

  // ------------------------------------------------------------
  // Deteksi ukuran layar (khusus laptop/komputer) + gate mode tamu
  // ------------------------------------------------------------
  function refreshDeviceGate() {
    const desktop = isDesktop();
    if (el("presentOpenStudioBtn")) el("presentOpenStudioBtn").hidden = !desktop;
    if (el("presentStudioMobileHint")) el("presentStudioMobileHint").hidden = desktop;
    if (!desktop) closeStudio();
  }

  function refreshGuestGate() {
    const isGuestNow = typeof Guest !== "undefined" && Guest.isGuest();
    if (isGuestNow) closeStudio();
  }

  function init() {
    wireTabs("[data-ps-left-tab]", "data-ps-left-panel", "data-ps-left-tab");
    wireTabs("[data-ps-mid-tab]", "data-ps-mid-panel", "data-ps-mid-tab");
    wireAnnouncement();
    wireMessage();
    wireTimer();
    wireQuickVerse();
    wireFileTab();
    wireQuickActions();
    wireTicker("psWarta", "warta");
    wireTicker("psFoot", "footnote");
    wirePointerPen();
    wireTheme();
    wireNextBox();
    wireUiTheme();
    wireClock();
    wireYoutubeTab();

    if (el("presentOpenStudioBtn")) el("presentOpenStudioBtn").addEventListener("click", openStudio);
    if (el("psOpenWindowBtn")) el("psOpenWindowBtn").addEventListener("click", () => { if (typeof Presentation !== "undefined") { Presentation.openWindow(); refreshStatusUi(); } });
    if (el("psCloseStudioBtn")) el("psCloseStudioBtn").addEventListener("click", closeStudio);

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
