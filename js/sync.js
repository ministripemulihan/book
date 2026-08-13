// ============================================================
//  SINKRONISASI KE GOOGLE SHEET (lewat Google Apps Script)
// ============================================================
//  Menyimpan CATATAN PRIBADI per ayat & PROGRES RENCANA BACA ke
//  Google Sheet, supaya bisa dibuka dan tetap sama persis dari
//  HP maupun komputer lain. Lihat "apps-script/Code.gs" untuk kode
//  backend & cara deploy-nya, lalu isi URL-nya di js/config.js
//  pada CONFIG.APPS_SCRIPT_URL.
//
//  Selalu menyimpan ke penyimpanan lokal dulu (instan, tetap jalan
//  walau offline), lalu mengirim ke Google Sheet di latar belakang.
//  Kalau gagal (offline / URL belum diisi), aplikasi tetap berjalan
//  normal — hanya belum tersinkron ke perangkat lain.
// ============================================================
const Sync = {
  enabled() {
    return !!(CONFIG.APPS_SCRIPT_URL && CONFIG.APPS_SCRIPT_URL.indexOf("http") === 0);
  },

  async _get(params) {
    if (!this.enabled()) return null;
    const url = CONFIG.APPS_SCRIPT_URL + "?" + new URLSearchParams(params).toString();
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  },

  async _post(payload) {
    if (!this.enabled()) return null;
    // Sengaja pakai Content-Type text/plain: Apps Script Web App tidak
    // mendukung preflight OPTIONS untuk CORS, jadi kita hindari memicunya
    // dengan mengirim sebagai "simple request".
    const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  },

  async pullNotes(username) {
    try {
      const data = await this._get({ type: "notes", username });
      return (data && data.ok && data.notes) || {};
    } catch (e) {
      return {};
    }
  },

  async pushNote(username, verseId, note) {
    try {
      await this._post({ type: "note", username, verseId, note, updatedAt: new Date().toISOString() });
      return true;
    } catch (e) {
      return false;
    }
  },

  async pullProgress(username) {
    try {
      const data = await this._get({ type: "progress", username });
      return (data && data.ok) ? data.progress : null;
    } catch (e) {
      return null;
    }
  },

  async pushProgress(username, plan) {
    try {
      await this._post({ type: "progress", username, plan, updatedAt: plan.updatedAt || new Date().toISOString() });
      return true;
    } catch (e) {
      return false;
    }
  },

  async pullSettings(username) {
    try {
      const data = await this._get({ type: "settings", username });
      return (data && data.ok) ? data.settings : null;
    } catch (e) {
      return null;
    }
  },

  async pushSettings(username, settingsObj) {
    try {
      await this._post({ type: "settings", username, settings: settingsObj, updatedAt: new Date().toISOString() });
      return true;
    } catch (e) {
      return false;
    }
  },
};
