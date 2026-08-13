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

  // ---------------- Log aktivitas (lihat js/activitylog.js) ----------------
  async pushLog(entry) {
    try {
      await this._post(Object.assign({ type: "log" }, entry));
      return true;
    } catch (e) {
      return false; // log tidak boleh sampai mengganggu pemakaian aplikasi
    }
  },

  // ---------------- Pengumuman (hanya administrator yang menulis) ----------------
  async pullAnnouncements() {
    try {
      const data = await this._get({ type: "announcements" });
      return (data && data.ok && data.announcements) || [];
    } catch (e) {
      return [];
    }
  },

  async pushAnnouncement(username, text) {
    try {
      const data = await this._post({ type: "announcement", username, text, updatedAt: new Date().toISOString() });
      return (data && data.ok) || false;
    } catch (e) {
      return false;
    }
  },

  async deleteAnnouncement(username, id) {
    try {
      const data = await this._post({ type: "announcement_delete", username, id: String(id) });
      return (data && data.ok) || false;
    } catch (e) {
      return false;
    }
  },

  // ---------------- Log aktivitas: MEMBACA kembali ----------------
  // Dipakai oleh panel "Log Aktivitas" (administrator) dan "Pantau
  // Pembacaan" (gembala dst). `days` opsional: 0/kosong = semua baris yang
  // tersimpan (dibatasi 5000 baris terbaru di sisi server), atau isi angka
  // (mis. 8) untuk hanya mengambil beberapa hari terakhir supaya lebih
  // ringan -- dipakai panel Pantau Pembacaan yang hanya butuh 7 hari.
  async pullLogs(username, days) {
    try {
      const params = { type: "logs", username };
      if (days) params.days = String(days);
      const data = await this._get(params);
      return (data && data.ok && data.logs) || [];
    } catch (e) {
      return [];
    }
  },

  // ---------------- Kumpulan Ayat (lihat js/collections.js) ----------------
  async pullCollections(username) {
    try {
      const data = await this._get({ type: "collections", username });
      return (data && data.ok && data.collections) || {};
    } catch (e) {
      return {};
    }
  },

  async pushCollection(username, id, col) {
    try {
      await this._post({
        type: "collection",
        username,
        id,
        name: col.name,
        verseIds: col.verseIds || [],
        createdAt: col.createdAt || new Date().toISOString(),
        updatedAt: col.updatedAt || new Date().toISOString(),
      });
      return true;
    } catch (e) {
      return false; // offline / belum dikonfigurasi -- tetap tersimpan lokal
    }
  },

  async deleteCollectionRemote(username, id) {
    try {
      await this._post({ type: "collection_delete", username, id: String(id) });
      return true;
    } catch (e) {
      return false;
    }
  },
};
