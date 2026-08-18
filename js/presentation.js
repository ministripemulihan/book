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
  }

  function startPolling() {
    stopPolling();
    pollTimer = setInterval(() => {
      if (winRef && winRef.closed) {
        winRef = null;
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
    if (winRef && !winRef.closed) {
      winRef.postMessage({ source: "bibleAppPresenter", payload }, location.origin);
    }
  }

  function sendVerse(v, bookLabel) {
    if (!isTwoScreenMode()) return;
    if (!winRef || winRef.closed) openWindow();
    const ref = `${bookLabel || v.bookName || ""} ${v.chapter}:${v.verse}`.trim();
    post({ type: "verse", ref, text: v.text });
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
    const refHtml = payload.type === "verse" && payload.ref
      ? `<div class="present-preview-ref">${escapeHtmlLocal(payload.ref)}</div>` : "";
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
        updateStatusUi();
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

  return { init, refreshGuestGate, sendVerse, sendFreeText, clearScreen, isTwoScreenMode, openWindow, closeWindow };
})();
