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

  function togglePanel() {
    const panel = el("adminBellPanel");
    if (!panel) return;
    const willOpen = panel.hidden;
    panel.hidden = !willOpen;
    if (willOpen) refresh();
  }

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
