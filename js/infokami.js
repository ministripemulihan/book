// ============================================================
//  INFO KAMI — panel info aplikasi (Versi, Amanat Kami, Misi Kami,
//  Donasi, Dibuat dari, Sumber Alkitab, AI Chat, dst).
//
//  Bisa dibuka SEBELUM login (tombol "ℹ️ Info Kami" di layar Masuk)
//  MAUPUN SETELAH login (menu ⋮ -> "ℹ️ Info Kami") -- pakai overlay
//  YANG SAMA (#infoKamiOverlay), tidak mengganggu tampilan yang sudah
//  ada karena elemen ini baru & tersembunyi (hidden) sampai dibuka.
//
//  Isinya diambil dari tab "Setup" di Sheet Sinkron (dibuat otomatis
//  pertama kali dipakai, sama seperti tab Notes/Progress/dll -- lihat
//  getSheet_() di apps-script/Code.gs) lewat endpoint
//  ?type=appinfo -- SENGAJA TIDAK mewajibkan "username" (beda dari
//  jenis permintaan lain) supaya tetap bisa diambil walau pengguna
//  belum login sama sekali.
//
//  Setiap baris di tab Setup = satu bagian info (Key, Label, Isi,
//  Tampil) -- administrator boleh menambah baris baru kapan saja
//  langsung dari Google Sheet, tidak perlu ubah kode ini lagi.
//
//  Offline / URL Apps Script belum diisi: dipakai cache lokal terakhir
//  (localStorage), atau kalau belum pernah berhasil sama sekali,
//  daftar bawaan INFO_KAMI_FALLBACK di bawah -- supaya panel ini
//  tidak pernah tampil kosong total.
// ============================================================
const INFO_KAMI_CACHE_KEY = "bible_app_infokami_cache_v1";
const INFO_KAMI_FONT_KEY = "bible_app_infokami_font_scale_v1";
const INFO_KAMI_FONT_MIN = 0.8;
const INFO_KAMI_FONT_MAX = 1.8;

const INFO_KAMI_FALLBACK = [
  { key: "versi", label: "Versi Aplikasi", value: "2026.08.17" },
  { key: "amanat_kami", label: "Amanat Kami", value: "Firman Tuhan menyebar ke Seluruh Indonesia" },
  { key: "misi_kami", label: "Misi Kami", value: "Misi Kami membuat Firman Tuhan hidup  di dalam hidup orang Kristen" },
  { key: "harapan_kami", label: "Harapan Kami", value: "Harapan Kami membuat Firman Tuhan terus bertumbuh di dalam hidup orang Kristen" },
  { key: "donasi", label: "Anda Bisa Donasi di", value: "Persembahan Anda bisa mencantumkan biaya keperluan Pembuatan Website ke BCA 0108387800 an Gereja Sidang Jemaat Kristus dengan isi: pembuatan Website AI" },
  { key: "dibuat_dari", label: "Dibuat oleh", value: "Para Aktivis Pencinta Tuhan" },
  { key: "sumber_alkitab", label: "Sumber Alkitab diambil dari", value: "Alkitab Versi Pemulihan TB1, dan seterusnya" },
  { key: "ai_chat", label: "AI Chat", value: "Ditenagai oleh Gemini AI.\n\nVersi Gratis (Free): untuk pengguna dengan Plan reguler.\nVersi Premium (Pro): untuk pengguna dengan Plan Premium, kemampuan AI Chat lebih tinggi." },
];

const InfoKami = {
  async open() {
    const overlay = document.getElementById("infoKamiOverlay");
    if (!overlay) return;
    overlay.hidden = false;
    document.body.classList.add("info-kami-open");
    this._applyFontScale();
    this._renderLoading();
    const items = await this._load();
    // panel bisa saja sudah ditutup lagi sebelum data selesai diambil
    if (!overlay.hidden) this._render(items);
  },

  close() {
    const overlay = document.getElementById("infoKamiOverlay");
    if (overlay) overlay.hidden = true;
    document.body.classList.remove("info-kami-open");
  },

  async _load() {
    let cached = null;
    try {
      const raw = localStorage.getItem(INFO_KAMI_CACHE_KEY);
      if (raw) cached = JSON.parse(raw);
    } catch (e) { /* diamkan, jatuh ke fallback */ }

    try {
      if (typeof Sync !== "undefined" && Sync.pullAppInfo) {
        const items = await Sync.pullAppInfo();
        if (items && items.length) {
          try { localStorage.setItem(INFO_KAMI_CACHE_KEY, JSON.stringify(items)); } catch (e) { /* diamkan */ }
          return items;
        }
      }
    } catch (e) { /* jatuh ke cache/fallback di bawah */ }

    return (cached && cached.length) ? cached : INFO_KAMI_FALLBACK;
  },

  _renderLoading() {
    const body = document.getElementById("infoKamiBody");
    if (body) body.innerHTML = '<p class="info-kami-loading">Memuat…</p>';
  },

  _render(items) {
    const body = document.getElementById("infoKamiBody");
    if (!body) return;
    const rows = (items || []).filter((it) => (it.label || it.key) || it.value);
    if (!rows.length) {
      body.innerHTML = '<p class="info-kami-loading">Belum ada info untuk ditampilkan.</p>';
      return;
    }
    body.innerHTML = rows.map((it) => {
      const label = this._escape(it.label || it.key || "");
      const rawValue = it.value == null ? "" : String(it.value);
      const value = this._escape(rawValue).replace(/\n/g, "<br>");
      return (
        '<section class="info-kami-item">' +
          (label ? '<h3 class="info-kami-item-title">' + label + '</h3>' : '') +
          '<div class="info-kami-item-body">' +
            (value || '<span class="info-kami-empty">(belum diisi)</span>') +
          '</div>' +
        '</section>'
      );
    }).join("");
  },

  _escape(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  },

  // ---------------- Ukuran huruf (A+ / A-) ----------------
  _getFontScale() {
    const v = parseFloat(localStorage.getItem(INFO_KAMI_FONT_KEY));
    if (isNaN(v)) return 1;
    return Math.min(INFO_KAMI_FONT_MAX, Math.max(INFO_KAMI_FONT_MIN, v));
  },

  _applyFontScale() {
    const box = document.getElementById("infoKamiBox");
    if (box) box.style.setProperty("--info-kami-font-scale", String(this._getFontScale()));
  },

  changeFontSize(delta) {
    const next = Math.min(
      INFO_KAMI_FONT_MAX,
      Math.max(INFO_KAMI_FONT_MIN, Math.round((this._getFontScale() + delta) * 10) / 10)
    );
    localStorage.setItem(INFO_KAMI_FONT_KEY, String(next));
    this._applyFontScale();
  },
};

document.addEventListener("DOMContentLoaded", () => {
  const openFromLogin = document.getElementById("loginInfoKamiBtn");
  if (openFromLogin) openFromLogin.addEventListener("click", () => InfoKami.open());

  const closeBtn = document.getElementById("infoKamiCloseBtn");
  if (closeBtn) closeBtn.addEventListener("click", () => InfoKami.close());

  const overlay = document.getElementById("infoKamiOverlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) InfoKami.close();
    });
  }

  const decBtn = document.getElementById("infoKamiFontDecrease");
  if (decBtn) decBtn.addEventListener("click", () => InfoKami.changeFontSize(-0.1));
  const incBtn = document.getElementById("infoKamiFontIncrease");
  if (incBtn) incBtn.addEventListener("click", () => InfoKami.changeFontSize(0.1));

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const ov = document.getElementById("infoKamiOverlay");
    if (ov && !ov.hidden) InfoKami.close();
  });
  // Tombol menu "ℹ️ Info Kami" DI DALAM aplikasi (setelah login) dipasang
  // di js/app.js (initUIEvents) supaya bisa ikut menutup menu ⋮ &
  // sidebar HP seperti tombol menu lain -- lihat "infoKamiBtn" di sana.
});
