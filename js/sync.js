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
    // "_ts" cache-buster + "cache: no-store": beberapa browser HP (terutama
    // dalam mode PWA/"Add to Home Screen") dan sebagian jaringan operator
    // seluler di Indonesia suka menyimpan cache respons GET yang URL-nya
    // identik -- akibatnya HP bisa terus menampilkan hasil LAMA (mis. daftar
    // pengumuman kosong) walau di Sheet datanya sudah ada & di komputer
    // sudah muncul. Parameter acak ini memaksa permintaan selalu baru.
    const withBuster = Object.assign({}, params, { _ts: String(Date.now()) });
    const url = CONFIG.APPS_SCRIPT_URL + "?" + new URLSearchParams(withBuster).toString();
    const res = await fetch(url, { method: "GET", cache: "no-store" });
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

  // Sama seperti pullAnnouncements(), tapi TIDAK menyamarkan kegagalan
  // jaringan sebagai "daftar kosong" -- dipakai saat panel Pengumuman
  // dibuka secara eksplisit oleh pengguna, supaya kalau gagal ambil data
  // (mis. tidak ada sinyal saat itu), pesannya jelas "gagal memuat" +
  // tombol coba lagi, BUKAN diam-diam menampilkan "belum ada pengumuman"
  // padahal sebenarnya di Sheet sudah ada isinya.
  async pullAnnouncementsChecked() {
    try {
      const data = await this._get({ type: "announcements" });
      if (data && data.ok) return { ok: true, list: data.announcements || [] };
      return { ok: false, list: [] };
    } catch (e) {
      return { ok: false, list: [] };
    }
  },

  // activeFrom/activeUntil: teks "yyyy-MM-dd" (boleh kosong = tanpa batas
  // tanggal). status: "draft" (belum tayang, hanya kelihatan administrator)
  // / "done" (aktif, siap tayang sesuai tanggal) / "expired" (ditutup manual).
  // visibleTo: "all" (semua orang, default) ATAU daftar username dipisah
  // koma hasil tag @username di teksnya (lihat parseAnnouncementTags() di
  // js/app.js) -- kalau ada tag @all di teksnya, tetap dianggap "all".
  async pushAnnouncement(username, text, activeFrom, activeUntil, status, visibleTo) {
    try {
      const data = await this._post({
        type: "announcement",
        username,
        text,
        activeFrom: activeFrom || "",
        activeUntil: activeUntil || "",
        status: status || "draft",
        visibleTo: visibleTo || "all",
        updatedAt: new Date().toISOString(),
      });
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

  // ---------------- Ganti Password (lihat js/app.js showChangePasswordPanel()) ----------------
  // Mengambil password PENGGANTI kalau pengguna ini pernah mengganti
  // password lewat menu Setting -- "" (kosong) berarti belum pernah ganti,
  // jadi password dari Sheet Pengguna (Sheet #2) yang tetap dipakai.
  async pullPasswordOverride(username) {
    try {
      const data = await this._get({ type: "password_override", username });
      return (data && data.ok) ? (data.password || "") : "";
    } catch (e) {
      return ""; // offline -- pemanggil (validateLogin) sudah punya cadangan lokal sendiri
    }
  },

  async pushPasswordOverride(username, newPassword) {
    try {
      const data = await this._post({
        type: "password_override_set",
        username,
        password: newPassword,
        updatedAt: new Date().toISOString(),
      });
      return (data && data.ok) || false;
    } catch (e) {
      return false;
    }
  },

  // ---------------- Pembacaan terakhir (Last_Read_Day) ----------------
  // Mengirim posisi bacaan terakhir (label ringkas, mis. "Kejadian 1") ke
  // kolom "Last_Read_Day" pada Sheet Pengguna asli -- best-effort, tidak
  // memblokir tampilan (dipanggil dari js/app.js pushLastReadPosition()
  // setiap kali pasal baru dibuka, sudah dibatasi supaya tidak terlalu
  // sering lewat throttle di sisi pemanggil).
  async pushLastRead(username, label) {
    try {
      const data = await this._post({
        type: "last_read",
        username,
        label,
        updatedAt: new Date().toISOString(),
      });
      return (data && data.ok) || false;
    } catch (e) {
      return false; // offline -- diam-diam diabaikan, bukan fitur penting
    }
  },
};
