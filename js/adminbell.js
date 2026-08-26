// ============================================================
//  🔔 LONCENG NOTIFIKASI ADMINISTRATOR
// ============================================================
//  Menggantikan posisi ikon "+" yang sebelumnya tidak berfungsi di
//  header -- sekarang jadi tombol 🔔 yang HANYA tampil untuk
//  administrator (lihat updateLevelGatedMenus() di js/app.js, memanggil
//  refreshVisibility()). Menampilkan jumlah PENCARIAN AYAT hari ini,
//  gabungan pengguna yang sudah login (dihitung dari tab "ActivityLog",
//  Menu="Pencarian") + Mode Tamu (dihitung dari tab "GuestUsage") --
//  lihat readSearchStatsToday_() di apps-script/Code.gs, endpoint
//  type=search_stats_today.
//
//  Badge angka di atas lonceng = total hari ini. Klik lonceng membuka
//  panel kecil berisi rincian (login vs tamu). Disegarkan otomatis tiap
//  5 menit selama administrator sedang login (tidak perlu refresh
//  halaman) + tiap kali panelnya dibuka.
// ============================================================

const AdminBell = (() => {
  function el(id) { return document.getElementById(id); }
  let pollTimer = null;

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function refreshVisibility(isAdmin) {
    const btn = el("adminBellBtn");
    if (!btn) return;
    btn.hidden = !isAdmin;
    if (!isAdmin) {
      if (el("adminBellPanel")) el("adminBellPanel").hidden = true;
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      return;
    }
    refresh();
    if (!pollTimer) pollTimer = setInterval(refresh, 5 * 60 * 1000); // tiap 5 menit
  }

  async function refresh() {
    if (typeof Sync === "undefined" || !Sync.enabled()) return;
    try {
      const res = await Sync._get({ type: "search_stats_today", username: (typeof currentUser !== "undefined" && currentUser) || "" });
      if (res && res.ok) render(res);
    } catch (e) {
      // diamkan -- dicoba lagi di polling berikutnya, tidak boleh sampai
      // mengganggu menu lain hanya karena lonceng gagal memuat sesaat.
    }
  }

  function render(stats) {
    const badge = el("adminBellBadge");
    if (badge) {
      const total = stats.total || 0;
      badge.hidden = !total;
      badge.textContent = total > 99 ? "99+" : String(total);
    }
    const body = el("adminBellPanelBody");
    if (body) {
      body.innerHTML =
        `<p class="admin-bell-total">🔎 <strong>${stats.total || 0}</strong> pencarian ayat hari ini` +
        (stats.date ? ` (${escapeHtml(stats.date)})` : "") + `</p>` +
        `<ul class="admin-bell-breakdown">` +
        `<li>Pengguna masuk (login): <strong>${stats.loggedInCount || 0}</strong></li>` +
        `<li>Mode Tamu (belum login): <strong>${stats.guestCount || 0}</strong></li>` +
        `</ul>`;
    }
  }

  // PERBAIKAN (laporan: notifikasi tidak kelihatan di HP): panel ini
  // sebelumnya position:absolute relatif ke .admin-bell-wrap, yang ada
  // DI DALAM .header-actions -- di layar sempit (<=640px) .header-actions
  // punya overflow-x:auto (baris ikon header yang bisa digeser ke
  // samping), dan CSS overflow pada 1 sumbu otomatis ikut meng-clip
  // sumbu yang lain juga. Akibatnya panel yang muncul ke BAWAH tombol
  // lonceng ikut "terpotong tak terlihat" oleh area geser itu, padahal
  // tombolnya sendiri tetap kelihatan & bisa ditekan -- jadi terkesan
  // "notifikasi tidak keluar" padahal sebenarnya kepotong.
  // Sekarang posisi panel dihitung ULANG tiap dibuka lewat
  // getBoundingClientRect() lalu dipasang position:fixed (relatif ke
  // viewport, BUKAN ke .header-actions) -- otomatis lolos dari overflow
  // apa pun ancestor-nya, di HP maupun komputer.
  function positionPanel(panel, btn) {
    if (!panel || !btn) return;
    const r = btn.getBoundingClientRect();
    const margin = 8;
    panel.style.position = "fixed";
    panel.style.top = Math.round(r.bottom + margin) + "px";
    // Rapatkan ke tepi kanan tombol, tapi jangan sampai keluar layar (HP sempit).
    const panelWidth = panel.offsetWidth || 260;
    let left = Math.round(r.right - panelWidth);
    left = Math.max(margin, Math.min(left, window.innerWidth - panelWidth - margin));
    panel.style.left = left + "px";
    panel.style.right = "auto";
  }

  function togglePanel() {
    const panel = el("adminBellPanel");
    const btn = el("adminBellBtn");
    if (!panel) return;
    const willOpen = panel.hidden;
    panel.hidden = !willOpen;
    if (willOpen) {
      // Dihitung 2x: sebelum & sesudah refresh() -- lebar panel bisa
      // sedikit berubah begitu isinya (rincian login/tamu) selesai
      // dimuat, jadi posisinya disegarkan lagi supaya tetap presisi
      // (bukan cuma nebak lebar dari saat masih "Memuat…").
      positionPanel(panel, btn);
      refresh().then(() => positionPanel(panel, btn));
    }
  }

  // Posisi ikut disegarkan kalau jendela di-resize / diputar (rotasi
  // HP) SELAGI panelnya sedang terbuka, supaya tidak "nyangkut" di
  // posisi lama.
  window.addEventListener("resize", () => {
    const panel = el("adminBellPanel");
    const btn = el("adminBellBtn");
    if (panel && !panel.hidden) positionPanel(panel, btn);
  });

  function init() {
    if (el("adminBellBtn")) el("adminBellBtn").addEventListener("click", (e) => { e.stopPropagation(); togglePanel(); });
    // Klik di luar panel -> tutup (sama seperti pola menuToggle/#moreMenu yang sudah ada).
    document.addEventListener("click", (e) => {
      const panel = el("adminBellPanel");
      const btn = el("adminBellBtn");
      if (!panel || panel.hidden) return;
      if (panel.contains(e.target) || (btn && btn.contains(e.target))) return;
      panel.hidden = true;
    });
  }

  return { init, refreshVisibility, refresh };
})();
