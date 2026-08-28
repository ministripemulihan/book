// ============================================================
//  MODE TAMU (akses tanpa login/daftar)
// ============================================================
// File ini SATU tempat untuk semua logika mode tamu:
//   - Identitas perangkat (device-id acak, tersimpan di browser)
//   - Cek + catat setiap kali tombol PENCARIAN ditekan, ditegakkan
//     PUSAT lewat Apps Script (lihat apps-script/Code.gs, endpoint
//     type=guest_search, tab Sheet "GuestUsage") supaya batas
//     10x/perangkat/hari & 100x gabungan semua tamu/hari tidak bisa 
//     diakali cuma dengan hapus data browser di 1 HP.
//   - Modal kecil kalau batas tercapai / kalau tamu menekan menu
//     yang memang tidak dibuka untuk tamu (lihat applyGuestModeUi()
//     & guestGateClickInterceptor() di js/app.js).
//
// CATATAN JUJUR soal "per IP": Google Apps Script TIDAK menyediakan
// alamat IP asli pengunjung ke script (keterbatasan resmi Google),
// jadi yang dipakai di sini adalah ID PERANGKAT/BROWSER (device-id
// acak yang disimpan di localStorage), bukan IP sungguhan. Ini cukup
// akurat untuk 1 orang di 1 perangkat/browser, tapi bisa "reset"
// kalau orang tsb membersihkan data browser atau memakai browser
// lain di HP yang sama. Kalau suatu saat perlu benar-benar berbasis
// IP asli, itu perlu backend sungguhan (bukan Apps Script) -- di
// luar cakupan versi ini.
// ============================================================

const Guest = (() => {
  const DEVICE_KEY = "bible_app_device_id_v1";
  const FLAG_KEY = "bible_app_is_guest_v1";
  const LOCAL_FALLBACK_KEY = "bible_app_guest_local_count_v1";

  // ID acak & tetap untuk perangkat/browser ini -- dibuat sekali,
  // dipakai terus selama data browser tidak dihapus.
  function getDeviceId() {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = "dev_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  }

  function isGuest() {
    return localStorage.getItem(FLAG_KEY) === "1";
  }

  function enter() {
    localStorage.setItem(FLAG_KEY, "1");
  }

  // Dipanggil saat tamu berhasil login sungguhan ATAU menekan
  // "Keluar dari Mode Tamu" -- supaya lain kali kembali ke layar Masuk
  // biasa, bukan otomatis masuk mode tamu lagi.
  function exit() {
    localStorage.removeItem(FLAG_KEY);
  }

  // Cek + langsung CATAT satu kali pemakaian pencarian ke server.
  // Mengembalikan: { allowed, reason ("daily"|"total"|null),
  //                   usedToday, dailyLimit, totalToday, totalLimit,
  //                   offline (true kalau jatuh ke hitungan lokal) }
  // CATATAN (BARU): dailyLimit/totalLimit di CONFIG.* sekarang HANYA
  // dipakai sebagai (a) fallback OFFLINE kalau Apps Script tidak bisa
  // dihubungi sama sekali, dan (b) angka cadangan yang dikirim ke server
  // untuk jaga-jaga kalau tab "Setup" di Google Sheet-nya entah kenapa
  // belum kebaca. Batas SESUNGGUHNYA yang ditegakkan sekarang diatur
  // langsung dari tab "Setup" di Google Sheet (kolom
  // guest_daily_limit_per_device / guest_total_daily_limit) -- lihat
  // getSetupNumber_() & endpoint "guest_search" di apps-script/Code.gs.
  // Jadi administrator TINGGAL UBAH ANGKA DI SHEET, tidak perlu ubah
  // js/config.js atau deploy ulang apa pun. Nilai yang benar-benar
  // ditegakkan server SELALU dikirim balik di field dailyLimit/totalLimit
  // pada hasil di bawah (dipakai oleh showLimitReached()), jadi tampilan
  // ke pengguna otomatis ikut angka Sheet, bukan angka lokal ini.
  async function checkAndLog() {
    const dailyLimit = CONFIG.GUEST_DAILY_LIMIT_PER_DEVICE || 10;
    const totalLimit = CONFIG.GUEST_TOTAL_DAILY_LIMIT || 100;

    if (CONFIG.APPS_SCRIPT_URL) {
      try {
        const url =
          `${CONFIG.APPS_SCRIPT_URL}?type=guest_search` +
          `&device=${encodeURIComponent(getDeviceId())}` +
          `&dailyLimit=${encodeURIComponent(dailyLimit)}` +
          `&totalLimit=${encodeURIComponent(totalLimit)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data && data.ok !== false) return data;
      } catch (e) {
        // offline / Apps Script belum dikonfigurasi -> jatuh ke fallback lokal di bawah
      }
    }
    return checkAndLogLocalFallback_(dailyLimit, totalLimit);
  }

  // Fallback SEMENTARA (tidak terpusat) -- dipakai HANYA kalau
  // APPS_SCRIPT_URL kosong atau sedang tidak bisa dihubungi, supaya
  // mode tamu tetap bisa dicoba secara offline. Batas total gabungan
  // (100x) TIDAK bisa ditegakkan lewat jalur ini -- hanya batas
  // per-perangkat yang dihitung, secara lokal saja di browser ini.
  function checkAndLogLocalFallback_(dailyLimit, totalLimit) {
    const today = new Date().toISOString().slice(0, 10);
    let store;
    try {
      store = JSON.parse(localStorage.getItem(LOCAL_FALLBACK_KEY) || "{}");
    } catch (e) {
      store = {};
    }
    if (store.date !== today) store = { date: today, count: 0 };
    if (store.count >= dailyLimit) {
      return { allowed: false, reason: "daily", usedToday: store.count, dailyLimit, totalToday: null, totalLimit, offline: true };
    }
    store.count += 1;
    localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(store));
    return { allowed: true, usedToday: store.count, dailyLimit, totalToday: null, totalLimit, offline: true };
  }

  // ------------------------------------------------------------
  // Modal kecil (dibuat lewat JS, tidak perlu HTML tambahan) --
  // dipakai baik untuk "batas pencarian tercapai" maupun "menu ini
  // perlu login" (lihat guestGateClickInterceptor() di js/app.js).
  // ------------------------------------------------------------
  function showModal(title, message, opts) {
    opts = opts || {};
    const old = document.getElementById("guestModalOverlay");
    if (old) old.remove();

    const overlay = document.createElement("div");
    overlay.id = "guestModalOverlay";
    overlay.className = "guest-modal-overlay";
    overlay.innerHTML = `
      <div class="guest-modal-box">
        <div class="guest-modal-icon">${opts.icon || "🔒"}</div>
        <h2>${title}</h2>
        <p>${message}</p>
        <div class="guest-modal-actions">
          <button type="button" class="guest-modal-btn primary" id="guestModalLoginBtn">🔑 Masuk / Sudah Punya Akun</button>
          <button type="button" class="guest-modal-btn" id="guestModalCloseBtn">Tutup</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
    document.getElementById("guestModalCloseBtn").addEventListener("click", () => overlay.remove());
    document.getElementById("guestModalLoginBtn").addEventListener("click", () => {
      overlay.remove();
      exit();
      location.reload();
    });
  }

  function showLimitReached(result) {
    const isTotal = result && result.reason === "total";
    const title = isTotal ? "Kuota tamu hari ini sudah penuh" : "Batas pencarian tamu hari ini tercapai";
    const message = isTotal
      ? `Jatah pencarian gabungan untuk SEMUA pengunjung tanpa login hari ini (maks. ${result.totalLimit}x) sudah penuh. Silakan coba lagi besok, atau masuk dengan akun supaya bisa mencari tanpa batas.`
      : `Perangkat ini sudah memakai jatah pencarian gratis hari ini (maks. ${result.dailyLimit}x/hari). Silakan coba lagi besok, atau masuk dengan akun supaya bisa mencari tanpa batas.`;
    showModal(title, message, { icon: "⏳" });
  }

  function showFeatureLocked(label) {
    showModal(
      "Fitur ini khusus pengguna yang sudah masuk",
      `"${label}" tidak tersedia untuk mode tamu. Sebagai tamu, Anda tetap bisa mencari & membaca ayat (1/2/3 kolom) serta menyalin (copy) ayatnya. Masuk dengan akun untuk membuka fitur ini.`,
      { icon: "🔒" }
    );
  }

  return { getDeviceId, isGuest, enter, exit, checkAndLog, showLimitReached, showFeatureLocked, showModal };
})();
