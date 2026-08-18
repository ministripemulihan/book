// ============================================================
//  📝 DAFTAR AKUN BARU (mandiri) + 🗂️ KELOLA PENGGUNA (administrator)
// ============================================================
//  Dua bagian dalam satu file karena saling berkaitan langsung (sama-sama
//  memutar data di kolom "Approved"/"TanggalDaftar" pada Sheet Pengguna):
//
//  1) Signup -- panel "📝 Daftar Akun Baru" di layar Masuk (belum login).
//     Siapa saja bisa mengisi Username/Nama/Password (default "123",
//     boleh diganti) lalu kirim -- akun langsung ditulis ke Sheet
//     Pengguna asli lewat Apps Script (endpoint type=signup, lihat
//     signupUser_() di apps-script/Code.gs), TAPI kolom "Approved"
//     otomatis "FALSE" -- BELUM bisa dipakai untuk masuk sampai
//     administrator menyetujuinya (lihat validateLogin() di js/app.js,
//     mengembalikan { pendingApproval:true } kalau password benar tapi
//     belum disetujui).
//
//  2) UserApproval -- panel "🗂️ Kelola Pengguna" di menu ⋮, HANYA
//     tampil untuk administrator (lihat updateLevelGatedMenus() di
//     js/app.js). Menampilkan SEMUA akun + status Approved & tanggal
//     daftar, administrator tinggal tekan "✅ Setujui" / "Batalkan"
//     (endpoint type=user_approve).
//
//  Keduanya lewat Sync._get()/Sync._post() yang sudah ada (js/sync.js) --
//  tidak menambah cara komunikasi baru ke Apps Script.
// ============================================================

const Signup = (() => {
  function el(id) { return document.getElementById(id); }

  function openModal() {
    if (!el("signupOverlay")) return;
    resetForm();
    el("signupOverlay").hidden = false;
  }

  function closeModal() {
    if (el("signupOverlay")) el("signupOverlay").hidden = true;
  }

  function resetForm() {
    if (el("signupUsername")) el("signupUsername").value = "";
    if (el("signupNama")) el("signupNama").value = "";
    if (el("signupPassword")) el("signupPassword").value = "123";
    if (el("signupWhatsapp")) el("signupWhatsapp").value = "";
    if (el("signupGereja")) el("signupGereja").value = "";
    if (el("signupCabang")) el("signupCabang").value = "";
    if (el("signupKota")) el("signupKota").value = "";
    if (el("signupGender")) el("signupGender").value = "";
    if (el("signupUmur")) el("signupUmur").value = "";
    hideResult();
    const btn = el("signupSubmitBtn");
    if (btn) { btn.disabled = false; btn.textContent = "📝 Kirim Pendaftaran"; }
  }

  function showResult(msg, isError) {
    const box = el("signupResult");
    if (!box) return;
    box.hidden = false;
    box.textContent = msg;
    box.classList.toggle("signup-result-error", !!isError);
    box.classList.toggle("signup-result-ok", !isError);
  }

  function hideResult() {
    const box = el("signupResult");
    if (box) { box.hidden = true; box.textContent = ""; box.className = "signup-result"; }
  }

  async function submit() {
    const username = (el("signupUsername").value || "").trim();
    const nama = (el("signupNama").value || "").trim();
    const password = (el("signupPassword").value || "").trim() || "123";
    const whatsapp = (el("signupWhatsapp") && el("signupWhatsapp").value || "").trim();
    const gereja = (el("signupGereja") && el("signupGereja").value || "").trim();
    const cabang = (el("signupCabang") && el("signupCabang").value || "").trim();
    const kota = (el("signupKota") && el("signupKota").value || "").trim();
    const gender = (el("signupGender") && el("signupGender").value || "").trim();
    const umur = (el("signupUmur") && el("signupUmur").value || "").trim();
    const btn = el("signupSubmitBtn");

    hideResult();
    if (!username) { showResult("❌ Username wajib diisi.", true); return; }
    if (/\s/.test(username)) { showResult("❌ Username tidak boleh mengandung spasi.", true); return; }
    if (typeof Sync === "undefined" || !Sync.enabled()) {
      showResult("❌ Pendaftaran mandiri belum aktif (administrator belum mengisi APPS_SCRIPT_URL di js/config.js).", true);
      return;
    }

    btn.disabled = true;
    btn.textContent = "Mengirim…";
    try {
      const res = await Sync._post({ type: "signup", username, password, nama, whatsapp, gereja, cabang, kota, gender, umur });
      if (res && res.ok) {
        showResult(
          "✅ Pendaftaran terkirim! Akun \"" + username + "\" menunggu PERSETUJUAN administrator " +
          "sebelum bisa dipakai untuk masuk. Silakan hubungi administrator, atau coba masuk lagi nanti.",
          false
        );
        btn.textContent = "📝 Kirim Pendaftaran";
      } else {
        showResult("❌ " + ((res && res.error) || "Gagal mendaftar, coba lagi."), true);
        btn.textContent = "📝 Kirim Pendaftaran";
      }
    } catch (e) {
      showResult("❌ Gagal menghubungi server. Periksa koneksi internet Anda.", true);
      btn.textContent = "📝 Kirim Pendaftaran";
    }
    btn.disabled = false;
  }

  function init() {
    if (el("signupOpenBtn")) el("signupOpenBtn").addEventListener("click", openModal);
    if (el("signupCloseBtn")) el("signupCloseBtn").addEventListener("click", closeModal);
    if (el("signupOverlay")) {
      el("signupOverlay").addEventListener("click", (e) => {
        if (e.target === el("signupOverlay")) closeModal();
      });
    }
    if (el("signupForm")) {
      el("signupForm").addEventListener("submit", (e) => { e.preventDefault(); submit(); });
    }
  }

  return { init, openModal, closeModal };
})();

const UserApproval = (() => {
  function el(id) { return document.getElementById(id); }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  async function open() {
    if (!el("userApprovalOverlay")) return;
    el("userApprovalOverlay").hidden = false;
    if (typeof logActivity === "function") logActivity("Kelola Pengguna (Admin)");
    await refresh();
  }

  function close() {
    if (el("userApprovalOverlay")) el("userApprovalOverlay").hidden = true;
  }

  async function refresh() {
    const body = el("userApprovalBody");
    if (!body) return;
    body.innerHTML = '<p class="user-approval-loading">Memuat daftar pengguna…</p>';
    if (typeof Sync === "undefined" || !Sync.enabled()) {
      body.innerHTML = '<p class="user-approval-empty">Fitur ini butuh CONFIG.APPS_SCRIPT_URL diisi (lihat js/config.js).</p>';
      return;
    }
    try {
      const res = await Sync._get({ type: "admin_users_list", username: (typeof currentUser !== "undefined" && currentUser) || "" });
      const users = (res && res.ok && res.users) || [];
      render(users);
    } catch (e) {
      body.innerHTML = '<p class="user-approval-empty">Gagal memuat daftar pengguna. Periksa koneksi internet Anda.</p>';
    }
  }

  function render(users) {
    const body = el("userApprovalBody");
    if (!body) return;
    if (!users.length) {
      body.innerHTML = '<p class="user-approval-empty">Belum ada data pengguna.</p>';
      return;
    }
    // Yang BELUM disetujui ditaruh paling atas supaya cepat ditindaklanjuti.
    const sorted = users.slice().sort((a, b) => (a.approved === b.approved ? 0 : a.approved ? 1 : -1));
    body.innerHTML = "";
    sorted.forEach((u) => {
      const row = document.createElement("div");
      row.className = "user-approval-row" + (u.approved ? "" : " user-approval-pending");
      row.innerHTML = `
        <div class="user-approval-info">
          <div class="user-approval-name">${escapeHtml(u.nama || u.username)} <span class="user-approval-username">(${escapeHtml(u.username)})</span></div>
          <div class="user-approval-meta">${u.level ? "Level: " + escapeHtml(u.level) + " · " : ""}Tanggal daftar: ${escapeHtml(u.tanggalDaftar || "-")}</div>
          <div class="user-approval-meta">${[
            u.whatsapp ? "📱 " + escapeHtml(u.whatsapp) : "",
            u.gereja ? "⛪ " + escapeHtml(u.gereja) : "",
            u.cabang ? "🏢 " + escapeHtml(u.cabang) : "",
            u.kota ? "📍 " + escapeHtml(u.kota) : "",
            u.gender ? "🚻 " + escapeHtml(u.gender) : "",
            u.umur ? "🎂 " + escapeHtml(u.umur) + " th" : "",
          ].filter(Boolean).join(" · ") || "-"}</div>
        </div>
        <div class="user-approval-actions">
          <span class="user-approval-status ${u.approved ? "ok" : "pending"}">${u.approved ? "✅ Disetujui" : "⏳ Menunggu"}</span>
          <button type="button" class="chip-btn small${u.approved ? "" : " primary"}" data-act="toggle">${u.approved ? "Batalkan" : "✅ Setujui"}</button>
        </div>`;
      row.querySelector('[data-act="toggle"]').addEventListener("click", () => toggleApproval(u.username, !u.approved));
      body.appendChild(row);
    });
  }

  async function toggleApproval(username, approved) {
    try {
      const res = await Sync._post({
        type: "user_approve",
        username: (typeof currentUser !== "undefined" && currentUser) || "",
        targetUsername: username,
        approved,
      });
      if (res && res.ok) {
        refresh();
      } else {
        alert("Gagal menyimpan: " + ((res && res.error) || "tidak diketahui"));
      }
    } catch (e) {
      alert("Gagal menghubungi server. Periksa koneksi internet Anda.");
    }
  }

  function init() {
    if (el("userManageBtn")) el("userManageBtn").addEventListener("click", open);
    if (el("userApprovalCloseBtn")) el("userApprovalCloseBtn").addEventListener("click", close);
    if (el("userApprovalRefreshBtn")) el("userApprovalRefreshBtn").addEventListener("click", refresh);
    if (el("userApprovalOverlay")) {
      el("userApprovalOverlay").addEventListener("click", (e) => {
        if (e.target === el("userApprovalOverlay")) close();
      });
    }
  }

  return { init, open, close, refresh };
})();
