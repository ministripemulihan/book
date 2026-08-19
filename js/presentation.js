// ============================================================
//  MODE PRESENTASI 2 LAYAR (baru)
// ============================================================
// Fitur:
//  1. Toggle "1 Layar" (biasa, seperti sekarang) <-> "2 Layar" (menu ⋮ ->
//     panel "🖥️ Mode Presentasi"). Saat diaktifkan, membuka jendela BARU
//     (present.html) yang isinya bisa dikendalikan dari jendela utama.
//     Jendela utama TETAP bebas mencari/membaca seperti biasa -- kirim ke
//     Layar 2 hanya terjadi saat tombol kirim ditekan (bukan otomatis
//     tiap pindah ayat), supaya bisa "menyiapkan" tayangan berikutnya
//     tanpa mengganggu apa yang sedang tampil di layar proyektor.
//  2. Tombol "📤" kecil di tiap ayat (muncul HANYA saat mode 2 Layar
//     aktif, di sebelah tombol salin 📋) -- kirim ayat itu ke Layar 2.
//  3. Kotak "Tulisan Bebas" di panel Mode Presentasi -- ketik apa saja,
//     kirim ke Layar 2, dan bisa DISIMPAN untuk dipakai lagi kapan saja
//     (disimpan lokal di perangkat ini, localStorage).
//  4. Kotak pratinjau (preview) di jendela utama yang mencerminkan persis
//     apa yang sedang tampil di Layar 2, supaya operator tidak perlu
//     bolak-balik lihat proyektor.
//
// Khusus pengguna yang SUDAH LOGIN (bukan Mode Tamu) -- lihat
// refreshGuestGate(), dipanggil dari applyGuestModeUi() di js/app.js.
// ============================================================

const Presentation = (() => {
  const MODE_KEY = "bible_app_present_mode_v1"; // "1" | "2"
  const SAVED_KEY = "bible_app_present_saved_texts_v1";
  const WIN_NAME = "bibleAppPresentWindow2";

  let winRef = null;
  let lastPayload = null; // { type: "verse"|"text"|"clear", ref, text }
  let pollTimer = null;
  // Layar 2 (present.html) butuh waktu untuk memuat skripnya sendiri
  // setelah window.open() -- kirim pesan SEBELUM itu selesai membuat
  // pesan hilang begitu saja (contoh nyata: timer "Mulai"/"X" tidak
  // pernah sampai kalau Layar 2 baru saja dibuka). winReady jadi true
  // hanya setelah present.html mengabari "present_ready"; sebelum itu,
  // semua pesan ditahan dulu di msgQueue lalu dikirim berurutan begitu
  // siap -- jadi tidak ada perintah timer/warta/dll yang hilang.
  let winReady = false;
  let msgQueue = [];

  function sendToWindow(payload) {
    if (!winRef || winRef.closed) return;
    if (winReady) {
      winRef.postMessage({ source: "bibleAppPresenter", payload }, location.origin);
    } else {
      msgQueue.push(payload);
    }
  }

  function flushQueue() {
    if (!winRef || winRef.closed) { msgQueue = []; return; }
    while (msgQueue.length) {
      winRef.postMessage({ source: "bibleAppPresenter", payload: msgQueue.shift() }, location.origin);
    }
  }

  function isTwoScreenMode() {
    return localStorage.getItem(MODE_KEY) === "2";
  }

  function el(id) {
    return document.getElementById(id);
  }

  // ------------------------------------------------------------
  // Buka / tutup Layar 2
  // ------------------------------------------------------------
  function openWindow() {
    if (winRef && !winRef.closed) {
      winRef.focus();
      return;
    }
    winReady = false;
    msgQueue = [];
    winRef = window.open(
      "present.html",
      WIN_NAME,
      "width=1024,height=640,menubar=no,toolbar=no,location=no,status=no"
    );
    startPolling();
  }

  function closeWindow() {
    stopPolling();
    if (winRef && !winRef.closed) {
      try { winRef.close(); } catch (e) {}
    }
    winRef = null;
    winReady = false;
    msgQueue = [];
  }

  function startPolling() {
    stopPolling();
    pollTimer = setInterval(() => {
      if (winRef && winRef.closed) {
        winRef = null;
        winReady = false;
        msgQueue = [];
        updateStatusUi();
      }
    }, 1000);
  }
  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  // ------------------------------------------------------------
  // Kirim konten ke Layar 2 + perbarui pratinjau di jendela utama
  // ------------------------------------------------------------
  function post(payload) {
    lastPayload = payload;
    renderPreview(payload);
    sendToWindow(payload);
  }

  function sendVerse(v, bookLabel) {
    if (!isTwoScreenMode()) return;
    if (!winRef || winRef.closed) openWindow();
    const ref = `${bookLabel || v.bookName || ""} ${v.chapter}:${v.verse}`.trim();
    post({ type: "verse", ref, text: v.text });
    flashSendFeedback();
  }

  // Sama seperti sendVerse(), tapi untuk beberapa versi/terjemahan
  // sekaligus (checklist versi di Studio Presentasi) -- `versions` adalah
  // [{ code, label, text }, ...]. present.html menyusunnya sebagai
  // beberapa blok bertumpuk, masing-masing dengan label singkat versi
  // (mis. "ITB", "ENG-RCV") di depan teksnya, mirip 1 pasal berbahasa
  // ganda di aplikasi Alkitab pada umumnya.
  function sendVerseMulti(ref, versions) {
    if (!isTwoScreenMode()) return;
    if (!winRef || winRef.closed) openWindow();
    post({ type: "verse", ref, texts: versions });
    flashSendFeedback();
  }

  function sendFreeText(text) {
    if (!text || !text.trim()) return;
    if (!isTwoScreenMode()) return;
    if (!winRef || winRef.closed) openWindow();
    post({ type: "text", text: text.trim() });
    flashSendFeedback();
  }

  function clearScreen() {
    post({ type: "clear" });
  }

  // Kirim payload APA SAJA ke Layar 2 (dipakai js/presentation-studio.js
  // untuk tipe baru: theme/warta/footnote/timer/black/logo/pointer/pen).
  // Tidak menimpa `lastPayload` untuk tipe "overlay" (theme/warta/
  // footnote/timer/pointer/pen) supaya "kirim ulang konten terakhir"
  // saat Layar 2 dibuka ulang tetap berupa konten utama (verse/text/
  // black/logo), bukan overlay sesaat.
  const OVERLAY_TYPES = ["theme", "warta", "footnote", "timer", "pointer", "pen"];
  function postRaw(payload) {
    if (!isTwoScreenMode()) return;
    if (!winRef || winRef.closed) {
      // Overlay (pointer/pen/tick timer) tidak perlu memaksa buka jendela
      // baru berkali-kali; hanya buka untuk aksi yang jelas disengaja.
      if (OVERLAY_TYPES.indexOf(payload.type) === -1 || payload.type === "theme" || payload.type === "timer" || payload.type === "warta" || payload.type === "footnote") {
        openWindow();
      } else {
        return;
      }
    }
    if (OVERLAY_TYPES.indexOf(payload.type) === -1) {
      lastPayload = payload;
      renderPreview(payload);
    }
    sendToWindow(payload);
  }

  function flashSendFeedback() {
    const status = el("presentStatusText");
    if (!status) return;
    const old = status.textContent;
    status.textContent = "✅ Terkirim ke Layar 2";
    setTimeout(() => { updateStatusUi(); }, 1200);
  }

  // ------------------------------------------------------------
  // Pratinjau (mini) di jendela utama -- mencerminkan Layar 2
  // ------------------------------------------------------------
  function renderPreview(payload) {
    const box = el("presentPreviewBox");
    if (!box) return;
    if (!payload || payload.type === "clear") {
      box.innerHTML = '<div class="present-preview-idle">Belum ada tayangan</div>';
      return;
    }
    if (payload.type === "slide") {
      box.innerHTML = payload.imageUrl
        ? `<img src="${payload.imageUrl}" style="max-width:100%; max-height:100%; object-fit:contain; display:block;" />`
        : '<div class="present-preview-idle">🖼️ Slide</div>';
      return;
    }
    const refHtml = payload.type === "verse" && payload.ref
      ? `<div class="present-preview-ref">${escapeHtmlLocal(payload.ref)}</div>` : "";
    if (payload.type === "verse" && Array.isArray(payload.texts) && payload.texts.length) {
      const versionsHtml = payload.texts.map((t) => `<div class="present-preview-version"><span class="present-preview-version-tag">${escapeHtmlLocal(t.label || "")}</span> ${escapeHtmlLocal(t.text || "")}</div>`).join("");
      box.innerHTML = `${refHtml}${versionsHtml}`;
      return;
    }
    box.innerHTML = `${refHtml}<div class="present-preview-text">${escapeHtmlLocal(payload.text || "")}</div>`;
  }

  function escapeHtmlLocal(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ------------------------------------------------------------
  // Simpan & tarik kembali tulisan bebas
  // ------------------------------------------------------------
  function loadSavedTexts() {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); } catch (e) { return []; }
  }
  function storeSavedTexts(list) {
    localStorage.setItem(SAVED_KEY, JSON.stringify(list));
  }
  function saveCurrentText() {
    const ta = el("presentFreeText");
    if (!ta || !ta.value.trim()) return;
    const list = loadSavedTexts();
    list.unshift({ id: "pt_" + Date.now().toString(36), text: ta.value.trim(), savedAt: new Date().toISOString() });
    storeSavedTexts(list.slice(0, 100)); // batasi 100 biar tidak menumpuk
    renderSavedList();
  }
  function deleteSavedText(id) {
    storeSavedTexts(loadSavedTexts().filter((it) => it.id !== id));
    renderSavedList();
  }
  function renderSavedList() {
    const wrap = el("presentSavedList");
    if (!wrap) return;
    const list = loadSavedTexts();
    if (!list.length) {
      wrap.innerHTML = '<p class="present-saved-empty">Belum ada tulisan yang disimpan.</p>';
      return;
    }
    wrap.innerHTML = "";
    list.forEach((item) => {
      const row = document.createElement("div");
      row.className = "present-saved-row";
      const preview = item.text.length > 60 ? item.text.slice(0, 60) + "…" : item.text;
      row.innerHTML = `
        <span class="present-saved-text" title="${escapeHtmlLocal(item.text)}">${escapeHtmlLocal(preview)}</span>
        <span class="present-saved-actions">
          <button type="button" class="chip-btn small" data-act="send">📤 Kirim</button>
          <button type="button" class="chip-btn small" data-act="load">✏️ Muat</button>
          <button type="button" class="chip-btn small danger" data-act="del">🗑️</button>
        </span>`;
      row.querySelector('[data-act="send"]').addEventListener("click", () => sendFreeText(item.text));
      row.querySelector('[data-act="load"]').addEventListener("click", () => {
        if (el("presentFreeText")) el("presentFreeText").value = item.text;
      });
      row.querySelector('[data-act="del"]').addEventListener("click", () => deleteSavedText(item.id));
      wrap.appendChild(row);
    });
  }

  // ------------------------------------------------------------
  // Pengumuman & Timer sederhana -- versi ringkas dari kontrol yang
  // sama di Studio Presentasi (js/presentation-studio.js), supaya
  // tetap bisa dipakai dari panel ⋮ biasa (HP / layar sempit) tanpa
  // wajib buka Studio (yang khusus laptop/komputer, layar ≥1100px).
  // Payload yang dikirim SAMA PERSIS formatnya dengan punya Studio
  // (type "text" utk pengumuman, type "timer" utk timer) supaya
  // present.html tidak perlu logic tambahan sama sekali.
  // ------------------------------------------------------------
  let simpleTimerTotal = 0;
  let simpleTimerEndAt = null;
  let simpleTimerInterval = null;

  function fmtMMSSLocal(totalSec) {
    const s = Math.max(0, Math.round(totalSec));
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }

  function wireAnnouncementSimple() {
    if (el("presentAnnClearBtn")) {
      el("presentAnnClearBtn").addEventListener("click", () => {
        if (el("presentAnnTitle")) el("presentAnnTitle").value = "";
        if (el("presentAnnBody")) el("presentAnnBody").value = "";
      });
    }
    if (el("presentAnnShowBtn")) {
      el("presentAnnShowBtn").addEventListener("click", () => {
        const title = (el("presentAnnTitle") && el("presentAnnTitle").value.trim()) || "";
        const body = (el("presentAnnBody") && el("presentAnnBody").value.trim()) || "";
        if (!title && !body) return;
        const full = title ? `${title}\n\n${body}` : body;
        sendFreeText(full);
      });
    }
  }

  function wireTimerSimple() {
    const presetBtns = Array.from(document.querySelectorAll("[data-present-timer-preset]"));
    function setDisplay(sec) {
      simpleTimerTotal = sec;
      const disp = el("presentTimerDisplay");
      if (disp) {
        disp.textContent = fmtMMSSLocal(sec);
        disp.classList.remove("done");
        disp.classList.toggle("ps-timer-idle", sec > 0);
      }
    }
    function markActivePreset(activeBtn) {
      presetBtns.forEach((b) => b.classList.toggle("active", b === activeBtn));
    }
    presetBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        setDisplay(Number(btn.dataset.presentTimerPreset));
        markActivePreset(btn);
      });
    });
    function applyCustom() {
      const v = Number(el("presentTimerCustom") && el("presentTimerCustom").value);
      if (v > 0) { setDisplay(v); markActivePreset(null); }
    }
    if (el("presentTimerCustomBtn")) el("presentTimerCustomBtn").addEventListener("click", applyCustom);
    if (el("presentTimerCustom")) el("presentTimerCustom").addEventListener("keydown", (e) => { if (e.key === "Enter") applyCustom(); });

    function stopDisplayLoop() {
      if (simpleTimerInterval) { clearInterval(simpleTimerInterval); simpleTimerInterval = null; }
    }
    function startTimer() {
      if (!(simpleTimerTotal > 0)) return;
      stopDisplayLoop();
      simpleTimerEndAt = Date.now() + simpleTimerTotal * 1000;
      const label = (el("presentTimerLabel") && el("presentTimerLabel").value.trim()) || "Sesi Bagi Nikmat";
      const bell = !!(el("presentTimerBell") && el("presentTimerBell").checked);
      postRaw({ type: "timer", action: "start", label, totalSeconds: simpleTimerTotal, endAt: simpleTimerEndAt, bell });
      const disp = el("presentTimerDisplay");
      if (disp) disp.classList.remove("ps-timer-idle");
      simpleTimerInterval = setInterval(() => {
        const remain = (simpleTimerEndAt - Date.now()) / 1000;
        if (disp) { disp.textContent = fmtMMSSLocal(remain); disp.classList.toggle("done", remain <= 0); }
        if (remain <= 0) stopDisplayLoop();
      }, 250);
    }
    function stopTimer() {
      stopDisplayLoop();
      postRaw({ type: "timer", action: "stop" });
      const disp = el("presentTimerDisplay");
      if (disp) { disp.textContent = "00:00"; disp.classList.remove("done"); disp.classList.add("ps-timer-idle"); }
    }
    if (el("presentTimerStartBtn")) el("presentTimerStartBtn").addEventListener("click", startTimer);
    if (el("presentTimerStopBtn")) el("presentTimerStopBtn").addEventListener("click", stopTimer);
  }

  // ------------------------------------------------------------
  // UI: toggle 1/2 Layar + wiring tombol panel
  // ------------------------------------------------------------
  function updateStatusUi() {
    document.body.classList.toggle("present-mode-on", isTwoScreenMode());
    const status = el("presentStatusText");
    if (status) {
      if (!isTwoScreenMode()) {
        status.textContent = "Mode 1 Layar aktif.";
      } else if (winRef && !winRef.closed) {
        status.textContent = "🟢 Layar 2 terbuka.";
      } else {
        status.textContent = "⚪ Layar 2 belum dibuka — tekan tombol di bawah.";
      }
    }
    if (el("presentModeToggle")) el("presentModeToggle").checked = isTwoScreenMode();
    if (el("presentOpenWindowBtn")) el("presentOpenWindowBtn").hidden = !isTwoScreenMode();
    if (el("presentControlsBody")) el("presentControlsBody").hidden = !isTwoScreenMode();
  }

  function setMode(twoScreen) {
    localStorage.setItem(MODE_KEY, twoScreen ? "2" : "1");
    if (twoScreen) {
      openWindow();
    } else {
      closeWindow();
    }
    updateStatusUi();
  }

  // Disembunyikan total untuk Mode Tamu (fitur ini butuh login) --
  // dipanggil dari applyGuestModeUi() di js/app.js tiap status login berubah.
  function refreshGuestGate() {
    const isGuestNow = typeof Guest !== "undefined" && Guest.isGuest();
    const row = el("presentModeRow");
    if (row) row.hidden = isGuestNow;
    if (isGuestNow && isTwoScreenMode()) {
      // Kalau entah bagaimana sempat aktif lalu masuk sebagai tamu, matikan.
      setMode(false);
    }
  }

  function initUi() {
    updateStatusUi();
    renderSavedList();
    renderPreview(lastPayload);
    wireAnnouncementSimple();
    wireTimerSimple();

    if (el("presentModeToggle")) {
      el("presentModeToggle").addEventListener("change", (e) => setMode(e.target.checked));
    }
    if (el("presentOpenWindowBtn")) {
      el("presentOpenWindowBtn").addEventListener("click", () => openWindow());
    }
    if (el("presentClearBtn")) {
      el("presentClearBtn").addEventListener("click", () => clearScreen());
    }
    if (el("presentSendFreeTextBtn")) {
      el("presentSendFreeTextBtn").addEventListener("click", () => {
        const ta = el("presentFreeText");
        sendFreeText(ta ? ta.value : "");
      });
    }
    if (el("presentSaveFreeTextBtn")) {
      el("presentSaveFreeTextBtn").addEventListener("click", () => saveCurrentText());
    }

    // Begitu Layar 2 memberi tahu sudah siap (script di present.html),
    // kirim ulang konten TERAKHIR (kalau ada) supaya operator tidak perlu
    // menekan kirim lagi kalau Layar 2 sempat dimuat ulang / baru dibuka.
    window.addEventListener("message", (e) => {
      if (e.origin !== location.origin) return;
      const data = e.data || {};
      if (data.source === "bibleAppPresenter" && data.type === "present_ready") {
        winReady = true;
        updateStatusUi();
        // Kirim dulu semua pesan yang tertahan (mis. perintah timer
        // "Mulai"/"Stop" yang terkirim SEBELUM Layar 2 selesai dimuat --
        // itu penyebab timer "tidak jalan" / "tidak hilang saat X").
        flushQueue();
        if (lastPayload) post(lastPayload);
      }
    });
  }

  function init() {
    initUi();
    refreshGuestGate();
    // Kalau mode 2 Layar tersimpan dari kunjungan sebelumnya, jangan
    // otomatis membuka jendela baru sendiri (browser akan memblokir
    // popup yang tidak berasal dari aksi klik pengguna) -- cukup
    // tampilkan tombol "Buka Layar 2" supaya pengguna yang menekannya.
  }

  return { init, refreshGuestGate, sendVerse, sendVerseMulti, sendFreeText, clearScreen, isTwoScreenMode, openWindow, closeWindow, postRaw };
})();
