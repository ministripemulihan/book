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

  // ---------------- Info Kami (tab "Setup" di Sheet Sinkron) ----------------
  // SENGAJA TIDAK mengirim "username" -- beda dari endpoint lain, jenis
  // permintaan "appinfo" ini memang tidak mewajibkan username di doGet()
  // (apps-script/Code.gs), supaya bisa dipanggil dari layar Masuk SEBELUM
  // pengguna login sama sekali (lihat js/infokami.js).
  async pullAppInfo() {
    try {
      const data = await this._get({ type: "appinfo" });
      return (data && data.ok && data.info) || [];
    } catch (e) {
      return [];
    }
  },

  // ---------------- Pengumuman (hanya administrator yang menulis) ----------------
  // PENTING -- kenapa dulu selalu muncul "Gagal memuat pengumuman" dengan
  // detail teknis "username wajib diisi": doGet() di apps-script/Code.gs
  // MEWAJIBKAN parameter "username" di SEMUA jenis permintaan (?type=...),
  // termasuk "announcements" -- lihat baris paling atas doGet() ("if
  // (!username) return ... username wajib diisi"). Tapi fungsi ini
  // (dan pullAnnouncementsChecked() di bawah) TIDAK PERNAH mengirim
  // "username" sama sekali, beda dari pullNotes/pullProgress/pullSettings
  // yang semuanya sudah benar mengirim username. Akibatnya server SELALU
  // menolak permintaan pengumuman lebih dulu sebelum sempat membaca isi
  // Sheet-nya sama sekali -- apa pun isi Sheet Announcements-nya, pesan
  // "Gagal memuat pengumuman" akan selalu muncul. Perbaikannya: kirim
  // "username" juga di sini, sama seperti endpoint lain (nilainya tidak
  // dipakai untuk menyaring ISI daftar pengumuman -- server tetap
  // mengirim semua pengumuman ke siapa pun yang login -- hanya supaya
  // lolos pengecekan wajib di doGet()).
  async pullAnnouncements(username) {
    try {
      const data = await this._get({ type: "announcements", username: username || "" });
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
  // padahal sebenarnya di Sheet sudah ada isinya. Pesan error ASLI dari
  // server (mis. "Sheet Sinkron tidak ditemukan") ikut dikembalikan
  // (bukan dibuang) supaya lebih mudah didiagnosa daripada pesan
  // generik "periksa sambungan internet" yang bisa menyesatkan kalau
  // penyebabnya sebenarnya bukan soal internet sama sekali.
  async pullAnnouncementsChecked(username) {
    try {
      const data = await this._get({ type: "announcements", username: username || "" });
      if (data && data.ok) return { ok: true, list: data.announcements || [] };
      return { ok: false, list: [], error: (data && data.error) || "" };
    } catch (e) {
      return { ok: false, list: [], error: String((e && e.message) || e) };
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

  // Ubah pengumuman yang sudah ada (dicari lewat id-nya) -- dipakai tombol
  // "Edit" administrator, supaya tidak perlu hapus+buat baru lagi.
  async updateAnnouncement(username, id, text, activeFrom, activeUntil, status, visibleTo) {
    try {
      const data = await this._post({
        type: "announcement_update",
        username,
        id: String(id),
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
        // BARU -- item generik (kidung/teks/pengumuman/ayat) ikut dikirim
        // apa adanya, disimpan server di kolom terpisah "ItemsJson" (lihat
        // saveCollection_() di apps-script/Code.gs) supaya benar-benar
        // tersinkron lintas perangkat, bukan cuma verseIds seperti
        // sebelumnya. Item PDF/gambar (Media Tersimpan) SENGAJA TIDAK ikut
        // di sini -- itu penyimpanan terpisah, lihat catatan di
        // js/collections.js. Kalau kumpulan besar (60+ slide) melewati
        // 50.000 karakter/sel, server otomatis memecahnya jadi beberapa
        // baris "Part 2/3/dst" -- klien di sini tidak perlu tahu soal itu.
        items: col.items || [],
        createdAt: col.createdAt || new Date().toISOString(),
        updatedAt: col.updatedAt || new Date().toISOString(),
      });
      return true;
    } catch (e) {
      return false; // offline / belum dikonfigurasi -- tetap tersimpan lokal
    }
  },

  // Bagikan 1 kumpulan (apa adanya, termasuk item & tema kalau disertakan)
  // ke akun `targetUsername` -- lihat shareCollectionToUser_() di
  // apps-script/Code.gs & shareCollectionToUser() di js/collections.js.
  async shareCollection(username, id, targetUsername, theme) {
    try {
      const res = await this._post({ type: "collection_share", username, id, targetUsername, theme: theme || null });
      return res || { ok: false, error: "Tidak ada balasan dari server." };
    } catch (e) {
      return { ok: false, error: "Gagal terhubung ke server (periksa sambungan internet)." };
    }
  },

  // BARU -- 🔔 kiriman 🔗Bagikan dari akun lain yang masih menunggu
  // "Terima"/"Tolak" milik `username` ini. Lihat readPendingShares_()
  // di apps-script/Code.gs.
  async pullPendingShares(username) {
    try {
      const data = await this._get({ type: "collection_shares_pending", username });
      return (data && data.ok && data.shares) || [];
    } catch (e) {
      return [];
    }
  },

  // action: "accept" atau "reject". Lihat respondToShare_() di
  // apps-script/Code.gs.
  async respondShare(username, id, action) {
    try {
      const res = await this._post({ type: "collection_share_respond", username, id, action });
      return res || { ok: false, error: "Tidak ada balasan dari server." };
    } catch (e) {
      return { ok: false, error: "Gagal terhubung ke server (periksa sambungan internet)." };
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

  // ---------------- Sinkron Media (PDF/gambar) ke Drive -- Tahap 2 & 3 ----------------
  // Lihat uploadToDrive_()/getDriveFileForUser_() di apps-script/Code.gs
  // & checkbox "☁️ Sinkron ke akun" di js/presentation-studio.js
  // (wireFileTab() -> addBtn). `dataUrl` = 1 data-URL apa adanya (mis.
  // dari originalFileDataUrl atau images[0]) -- prefix "data:mime;base64,"
  // DIPOTONG di sini dulu sebelum dikirim, server cuma menerima base64
  // murni. Mengembalikan `fileId` (string) kalau berhasil, atau `null`
  // kalau gagal/offline -- SELALU best-effort, TIDAK PERNAH menggagalkan
  // penyimpanan lokal yang sudah terjadi duluan (lihat pemanggilnya).
  async uploadMedia(username, fileName, dataUrl) {
    try {
      const m = /^data:([^;]+);base64,(.*)$/.exec(String(dataUrl || ""));
      if (!m) return null;
      const data = await this._post({
        type: "media_upload",
        username,
        fileName: fileName || "berkas",
        mimeType: m[1],
        dataBase64: m[2],
      });
      return (data && data.ok && data.fileId) || null;
    } catch (e) {
      return null; // offline / belum dikonfigurasi -- tetap tersimpan lokal
    }
  },

  // Ambil 1 file media balik dari Drive sebagai data-URL (dipakai Tahap 4,
  // saat menarik Media Tersimpan di perangkat lain -- belum dipanggil di
  // mana pun sampai Tahap 4 dikerjakan, disiapkan sekalian di sini supaya
  // Tahap 4 nanti tinggal pakai, tidak perlu balik lagi ke Code.gs).
  async fetchMediaFile(username, fileId) {
    try {
      const data = await this._get({ type: "media_file", username, fileId });
      if (!data || !data.ok) return null;
      return "data:" + data.mimeType + ";base64," + data.dataBase64;
    } catch (e) {
      return null;
    }
  },
};
