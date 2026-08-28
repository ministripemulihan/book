// ============================================================
//  🔔 LONCENG NOTIFIKASI
// ============================================================
//  Menggantikan posisi ikon "+" yang sebelumnya tidak berfungsi di
//  header -- sekarang jadi tombol 🔔 yang tampil untuk SEMUA pengguna
//  yang sudah login (bukan lagi khusus administrator, lihat
//  refreshVisibility() di bawah & updateLevelGatedMenus() di js/app.js),
//  isinya BEDA menurut level:
//   - Administrator: jumlah PENCARIAN AYAT hari ini (gabungan pengguna
//     yang sudah login, dihitung dari tab "ActivityLog", Menu="Pencarian",
//     + Mode Tamu, dihitung dari tab "GuestUsage") -- lihat
//     readSearchStatsToday_() di apps-script/Code.gs, endpoint
//     type=search_stats_today. Badge angka di atas lonceng = total hari
//     ini.
//   - Selain administrator: waktu LOGIN TERAKHIR akun ini sendiri --
//     lihat readLastLogin_() di apps-script/Code.gs, endpoint
//     type=last_login (dicari dari baris ActivityLog Menu="Login" milik
//     username ini, yang paling baru). Tidak ada badge angka (tidak ada
//     "jumlah" yang relevan untuk ditampilkan).
//  Mode Tamu (belum login sama sekali) TETAP tidak melihat lonceng ini
//  sama sekali -- tidak ada username untuk dicari riwayat login/statistik-
//  nya.
//
//  Klik lonceng membuka panel kecil berisi rincian. Disegarkan otomatis
//  tiap 5 menit KHUSUS administrator (angkanya berubah-ubah sepanjang
//  hari) -- untuk pengguna biasa cukup disegarkan saat login/dibuka saja
//  (waktu login terakhir jarang berubah dalam 1 sesi) + tiap kali
//  panelnya dibuka.
//
//  PERBAIKAN (panel tidak tampil di HP): lihat catatan panjang di
//  index.html (dekat #adminBellBtn) & positionPanel() di bawah.
// ============================================================

const AdminBell = (() => {
  function el(id) { return document.getElementById(id); }
  let pollTimer = null;
  let isAdminMode = false;

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function refreshVisibility(isAdmin) {
    const btn = el("adminBellBtn");
    if (!btn) return;
    isAdminMode = !!isAdmin;
    // Tampil untuk SIAPA PUN yang sudah login (administrator atau
    // bukan) -- hanya Mode Tamu (belum login) yang tidak melihatnya
    // sama sekali, lihat catatan di atas.
    const loggedIn = !!(typeof currentUser !== "undefined" && currentUser) && !(typeof Guest !== "undefined" && Guest.isGuest());
    btn.hidden = !loggedIn;
    btn.title = isAdminMode ? "Notifikasi pencarian hari ini" : "Login terakhir Anda";
    btn.setAttribute("aria-label", isAdminMode ? "Notifikasi administrator" : "Info login terakhir");
    const panelTitleEl = el("adminBellPanelTitle");
    if (panelTitleEl) panelTitleEl.textContent = isAdminMode ? "🔔 Notifikasi Administrator" : "🔔 Login Terakhir Anda";
    if (!loggedIn) {
      if (el("adminBellPanel")) el("adminBellPanel").hidden = true;
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      return;
    }
    refresh();
    // BARU -- polling sekarang dipasang untuk SEMUA pengguna yang login
    // (bukan cuma administrator lagi), supaya badge 🔔 kiriman Kumpulan
    // Ayat/permintaan hapus media yang baru masuk dari akun lain ikut
    // terlihat tanpa perlu membuka ulang aplikasi. Administrator tetap
    // disegarkan tiap 5 menit (statistik pencarian berubah cepat);
    // pengguna biasa tiap 10 menit (cukup jarang, supaya tidak
    // membebani server, tapi tetap otomatis tanpa perlu dibuka manual).
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    pollTimer = setInterval(refresh, isAdminMode ? 5 * 60 * 1000 : 10 * 60 * 1000);
  }

  async function refresh() {
    if (typeof Sync === "undefined" || !Sync.enabled()) return;
    try {
      const username = (typeof currentUser !== "undefined" && currentUser) || "";
      // BARU (27 Agu 2026) -- PERBAIKAN "lonceng hanya bisa di komputer":
      // sebelumnya 🔔 Kiriman Kumpulan Ayat Menunggu Persetujuan & 🔔
      // Permintaan Hapus Media Menunggu Persetujuan HANYA muncul di
      // dalam panel Kumpulan Ayat / Studio Presentasi -- Studio Presentasi
      // sendiri memang SENGAJA disembunyikan total di HP (lihat
      // refreshDeviceGate() di js/presentation-studio.js, ini fitur
      // "Layar 2" khusus laptop/komputer), jadi operator yang cuma
      // pegang HP TIDAK PERNAH melihat notifikasi itu sama sekali.
      // Sekarang keduanya JUGA digabung ke lonceng 🔔 ini (tombolnya
      // sendiri sudah tampil di HP maupun komputer, lihat catatan
      // panjang di index.html dekat #adminBellBtn) -- supaya siapa pun
      // yang login, di perangkat apa pun, tetap bisa melihat & merespons
      // permintaan yang butuh persetujuannya.
      const [pendingShares, pendingMediaDeletes] = await Promise.all([
        (typeof checkPendingCollectionShares === "function") ? checkPendingCollectionShares(username).catch(() => []) : [],
        (typeof checkPendingMediaDeleteRequests === "function") ? checkPendingMediaDeleteRequests(username).catch(() => []) : [],
      ]);
      lastPendingShares = pendingShares || [];
      lastPendingMediaDeletes = pendingMediaDeletes || [];
      if (isAdminMode) {
        const res = await Sync._get({ type: "search_stats_today", username });
        if (res && res.ok) renderAdmin(res);
      } else {
        const res = await Sync._get({ type: "last_login", username });
        if (res && res.ok) renderUser(res);
      }
    } catch (e) {
      // diamkan -- dicoba lagi di polling/klik berikutnya, tidak boleh sampai
      // mengganggu menu lain hanya karena lonceng gagal memuat sesaat.
    }
  }

  // Menyusun potongan HTML "🔔 Perlu Persetujuan Anda" (kiriman Kumpulan
  // Ayat & permintaan hapus media) -- dipanggil dari renderAdmin()/
  // renderUser() supaya muncul di ATAS isi lonceng yang sudah ada (statistik
  // admin / login terakhir), bukan menggantikannya.
  let lastPendingShares = [];
  let lastPendingMediaDeletes = [];
  function pendingApprovalsHtml() {
    const total = lastPendingShares.length + lastPendingMediaDeletes.length;
    if (!total) return "";
    let html = `<div class="admin-bell-pending"><p class="admin-bell-total">🔔 <strong>${total}</strong> perlu persetujuan Anda:</p><ul class="admin-bell-breakdown">`;
    lastPendingShares.forEach((s) => {
      html += `<li>📚 Kiriman Kumpulan Ayat <strong>"${escapeHtml(s.name)}"</strong> dari ${escapeHtml(s.fromUsername)} -- buka menu 📚 Kumpulan Ayat untuk Terima/Tolak.</li>`;
    });
    lastPendingMediaDeletes.forEach((r) => {
      html += `<li>🗑️ Permintaan hapus berkas <strong>"${escapeHtml(r.fileName || "(tanpa nama)")}"</strong> dari ${escapeHtml(r.requestedBy)} -- buka 🖥️ Studio Presentasi &rarr; 🖼️ Media Tersimpan untuk Setujui/Tolak.</li>`;
    });
    html += `</ul></div>`;
    return html;
  }

  function totalBadgeCount(base) {
    return (base || 0) + lastPendingShares.length + lastPendingMediaDeletes.length;
  }

  function renderAdmin(stats) {
    const badge = el("adminBellBadge");
    if (badge) {
      const total = totalBadgeCount(stats.total || 0);
      badge.hidden = !total;
      badge.textContent = total > 99 ? "99+" : String(total);
    }
    const body = el("adminBellPanelBody");
    if (body) {
      body.innerHTML =
        pendingApprovalsHtml() +
        `<p class="admin-bell-total">🔎 <strong>${stats.total || 0}</strong> pencarian ayat hari ini` +
        (stats.date ? ` (${escapeHtml(stats.date)})` : "") + `</p>` +
        `<ul class="admin-bell-breakdown">` +
        `<li>Pengguna masuk (login): <strong>${stats.loggedInCount || 0}</strong></li>` +
        `<li>Mode Tamu (belum login): <strong>${stats.guestCount || 0}</strong></li>` +
        `</ul>`;
    }
  }

  function formatLastLogin(iso) {
    if (!iso) return "Belum tercatat";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Belum tercatat";
    return d.toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" });
  }

  function renderUser(data) {
    // BARU -- badge angka SEKARANG dipakai juga untuk jumlah permintaan
    // yang perlu persetujuan (sebelumnya selalu disembunyikan untuk
    // pengguna biasa karena tidak ada "jumlah" apa pun yang relevan).
    const badge = el("adminBellBadge");
    if (badge) {
      const total = totalBadgeCount(0);
      badge.hidden = !total;
      badge.textContent = total > 99 ? "99+" : String(total);
    }
    const body = el("adminBellPanelBody");
    if (body) {
      body.innerHTML =
        pendingApprovalsHtml() +
        `<p class="admin-bell-total">🕒 Login terakhir Anda:</p>` +
        `<p class="admin-bell-total"><strong>${escapeHtml(formatLastLogin(data.lastLogin))}</strong></p>`;
    }
  }

  // Hitung posisi panel (position:fixed, lihat catatan CSS) berdasarkan
  // letak tombol 🔔 saat ini di layar -- dipanggil tiap panel dibuka &
  // tiap ukuran layar/scroll berubah selagi panel masih terbuka, supaya
  // TIDAK tergantung di mana #adminBellBtn kebetulan berada di dalam DOM
  // (termasuk saat header sedang digeser horizontal di HP).
  function positionPanel() {
    const btn = el("adminBellBtn");
    const panel = el("adminBellPanel");
    if (!btn || !panel || panel.hidden) return;
    const r = btn.getBoundingClientRect();
    const margin = 8;
    const panelWidth = panel.offsetWidth || 260;
    let left = r.right - panelWidth; // rata kanan dengan tombol, seperti sebelumnya
    left = Math.max(margin, Math.min(left, window.innerWidth - panelWidth - margin));
    const top = Math.min(r.bottom + margin, window.innerHeight - margin);
    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
  }

  function togglePanel() {
    const panel = el("adminBellPanel");
    if (!panel) return;
    const willOpen = panel.hidden;
    if (willOpen) {
      panel.hidden = false;
      positionPanel();
      refresh();
    } else {
      panel.hidden = true;
    }
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
    // Panel position:fixed dihitung dari posisi tombol di LAYAR -- perlu
    // dihitung ulang kalau layar diputar/di-resize, atau kalau halaman
    // (atau kotak ikon header yang bisa digeser di HP) di-scroll selagi
    // panel masih terbuka.
    window.addEventListener("resize", positionPanel);
    window.addEventListener("scroll", positionPanel, true); // capture -- ikut menangkap scroll di kontainer dalam (mis. .header-actions), bukan cuma window
  }

  return { init, refreshVisibility, refresh };
})();
