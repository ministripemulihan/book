// ============================================================
//  📲 PASANG APLIKASI DI HP (book183)
//  Tombol di menu kiri (sidebar) untuk menjadikan situs ini aplikasi di
//  layar utama HP -- Android (Chrome: dialog pasang bawaan) maupun iPhone
//  (Safari: petunjuk "Tambah ke Layar Utama").
//  Modul ini MANDIRI: hanya menambah satu tombol + satu dialog kecil.
//  Tidak menyentuh daftar kitab, teks Alkitab, maupun Kidung.
//  Tombol disembunyikan bila: sudah berjalan sebagai aplikasi terpasang,
//  atau bukan perangkat HP/tablet.
// ============================================================
(function () {
  "use strict";
  let deferredPrompt = null;

  const isStandalone = () =>
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    window.navigator.standalone === true;
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isMobile = isIOS || isAndroid;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    const b = document.getElementById("pwaInstallBtn");
    if (b) b.hidden = true;
  });

  function showHelp(html) {
    let ov = document.getElementById("pwaHelpOverlay");
    if (!ov) {
      ov = document.createElement("div");
      ov.id = "pwaHelpOverlay";
      ov.className = "pwa-help-overlay";
      ov.innerHTML = '<div class="pwa-help-card" role="dialog" aria-modal="true"><div class="pwa-help-body"></div>' +
        '<button type="button" class="chip-btn primary pwa-help-close">Mengerti</button></div>';
      ov.addEventListener("click", (e) => { if (e.target === ov || e.target.classList.contains("pwa-help-close")) ov.hidden = true; });
      document.body.appendChild(ov);
    }
    ov.querySelector(".pwa-help-body").innerHTML = html;
    ov.hidden = false;
  }

  async function onClick() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try { await deferredPrompt.userChoice; } catch (e) { /* diamkan */ }
      deferredPrompt = null;
      return;
    }
    if (isIOS) {
      showHelp('<h3>Pasang di iPhone / iPad</h3><ol>' +
        '<li>Buka halaman ini di <b>Safari</b> (bukan di dalam aplikasi lain).</li>' +
        '<li>Ketuk tombol <b>Bagikan</b> (kotak dengan panah ke atas) di bawah layar.</li>' +
        '<li>Pilih <b>Tambah ke Layar Utama</b>, lalu ketuk <b>Tambah</b>.</li></ol>');
    } else {
      showHelp('<h3>Pasang di Android</h3><ol>' +
        '<li>Buka halaman ini di <b>Chrome</b>.</li>' +
        '<li>Ketuk menu <b>⋮</b> di pojok kanan atas.</li>' +
        '<li>Pilih <b>Instal aplikasi</b> atau <b>Tambahkan ke layar utama</b>.</li></ol>');
    }
  }

  function init() {
    const btn = document.getElementById("pwaInstallBtn");
    if (!btn) return;
    if (isStandalone() || !isMobile) { btn.hidden = true; return; }
    btn.hidden = false;
    btn.addEventListener("click", onClick);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
