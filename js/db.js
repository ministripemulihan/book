// ============================================================
//  LAPISAN PENYIMPANAN LOKAL (IndexedDB)
//  Menyimpan secara lokal:
//   1) Seluruh teks Alkitab (store "verses") — dari Google Sheet #1
//   2) Daftar akun pengguna (store "users") — dari Google Sheet #2
//   3) Media Tersimpan Studio Presentasi (store "studioMedia")
//   4) Teks Kidung/Hymn (store "kidung") — dari Google Sheet Kidung,
//      lihat js/kidung.js
//  Setelah tersimpan, aplikasi TIDAK perlu memanggil server lagi
//  untuk membaca Alkitab/Kidung maupun untuk login berikutnya.
// ============================================================
const LocalDB = {
  _db: null,

  open() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(CONFIG.STORE_NAME)) {
          // keyPath "id" = bahasa + verse id, karena verse id bisa berulang antar bahasa
          const store = db.createObjectStore(CONFIG.STORE_NAME, { keyPath: "id" });
          store.createIndex("byLangBookChapter", ["lang", "bookNumber", "chapter"], { unique: false });
          store.createIndex("byLang", "lang", { unique: false });
        }
        if (!db.objectStoreNames.contains(CONFIG.USERS_STORE_NAME)) {
          db.createObjectStore(CONFIG.USERS_STORE_NAME, { keyPath: "username" });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
        // v3: "Media Tersimpan" (gambar/PDF-jadi-gambar/daftar YouTube) --
        // dulu di localStorage (lihat js/collections.js), dipindah ke sini
        // karena localStorage terlalu kecil untuk PDF hasil render jadi
        // gambar. Diindeks per `username` supaya tiap akun/perangkat cuma
        // melihat medianya sendiri, dan per `addedAt` untuk urutan terbaru.
        if (!db.objectStoreNames.contains(CONFIG.MEDIA_STORE_NAME)) {
          const mediaStore = db.createObjectStore(CONFIG.MEDIA_STORE_NAME, { keyPath: "id" });
          mediaStore.createIndex("byUsername", "username", { unique: false });
          mediaStore.createIndex("byAddedAt", "addedAt", { unique: false });
        }
        // v4: teks Kidung/Hymn (lihat js/kidung.js) -- keyPath "id" =
        // noKidung + "_" + urutan (unik per baris di dalam 1 kidung).
        // Diindeks per `noKidung` supaya semua baris 1 kidung bisa
        // diambil cepat (lihat getKidungRows() di bawah), dan per
        // `kategori` untuk nanti daftar per kategori (Memuji Tuhan,
        // Pemecahan Roti, dst.) di tab Kidung Studio Presentasi.
        // v5: ditambah kolom `buku` (Kidung/Suplemen, 1 sheet yang sama --
        // lihat catatan normalizeKidungRecord() di js/csv.js) supaya
        // nomor yang SAMA di 2 buku berbeda (mis. Kidung No.95 vs
        // Suplemen No.95) tidak bentrok satu sama lain. keyPath "id"
        // sekarang buku + "_" + noKidung + "_" + urutan, dan ditambah
        // index komposit "byBukuNo" ([buku, noKidung]) untuk pencarian
        // langsung per buku (dipakai alur keypad "ketik angka -> tekan
        // tombol Kidung/Suplemen"). Index lama "byNoKidung" TETAP
        // dipertahankan (tidak menghalangi apa pun, berguna kalau nanti
        // perlu cari lintas-buku berdasar nomor saja).
        // FIX (21 Agu 2026) — bug INTI penyebab "Kidung No. X tidak
        // ditemukan" yang HANYA muncul di sebagian HP (bukan di komputer):
        // dulu index "byBukuNo" cuma dibuat di cabang UPGRADE (kalau store
        // "kidung" SUDAH ada dari versi lama), TIDAK PERNAH dibuat di
        // cabang CREATE (kalau store ini baru pertama kali dibuat, mis. di
        // perangkat yang baru pertama kali membuka app / IndexedDB-nya
        // baru). Komputer yang sudah lama dipakai biasanya sudah melewati
        // riwayat versi 3->4->5->6 secara bertahap sehingga lolos cabang
        // upgrade & dapat index-nya; sebagian HP (baru instal / cache
        // pernah dibersihkan / dibuka pertama kali setelah versi ini
        // dirilis) membuat store "kidung" LANGSUNG di versi terbaru lewat
        // cabang CREATE, jadi index "byBukuNo" tidak pernah tercipta.
        // Akibatnya getKidungRowsByBukuNo() (dipakai membuka 1 kidung utk
        // dibaca) SELALU gagal (index tidak ditemukan) di HP itu -- daftar
        // judul tetap muncul (tidak butuh index ini) tapi begitu 1 kidung
        // dibuka, syairnya tidak pernah ketemu, walau sinkron ulang
        // berkali-kali (sinkron cuma mengisi ULANG DATA baris, bukan
        // membuat index yang memang belum pernah ada). Perbaikan: KEDUA
        // cabang sekarang SELALU memastikan index "byBukuNo" (dan
        // index lain) ada, dan CONFIG.DB_VERSION dinaikkan (lihat
        // js/config.js) supaya onupgradeneeded ini SUNGGUH terpicu lagi
        // di HP yang sudah kadung punya store versi lama tanpa index ini.
        let kidungStore;
        if (!db.objectStoreNames.contains(CONFIG.KIDUNG_STORE_NAME)) {
          kidungStore = db.createObjectStore(CONFIG.KIDUNG_STORE_NAME, { keyPath: "id" });
        } else {
          kidungStore = e.target.transaction.objectStore(CONFIG.KIDUNG_STORE_NAME);
        }
        if (!kidungStore.indexNames.contains("byNoKidung")) {
          kidungStore.createIndex("byNoKidung", "noKidung", { unique: false });
        }
        if (!kidungStore.indexNames.contains("byKategori")) {
          kidungStore.createIndex("byKategori", "kategori", { unique: false });
        }
        if (!kidungStore.indexNames.contains("byBukuNo")) {
          kidungStore.createIndex("byBukuNo", ["buku", "noKidung"], { unique: false });
        }
      };
      req.onsuccess = (e) => {
        this._db = e.target.result;
        resolve(this._db);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  },

  _tx(storeName, mode) {
    return this.open().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction([storeName], mode);
          resolve(tx);
        })
    );
  },

  // ---------------- Ayat Alkitab ----------------
  async clearAll() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([CONFIG.STORE_NAME], "readwrite");
      tx.objectStore(CONFIG.STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  },

  async bulkPut(verses) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([CONFIG.STORE_NAME], "readwrite");
      const store = tx.objectStore(CONFIG.STORE_NAME);
      verses.forEach((v) => store.put(v));
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  },

  async getAll() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([CONFIG.STORE_NAME], "readonly");
      const req = tx.objectStore(CONFIG.STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async count() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([CONFIG.STORE_NAME], "readonly");
      const req = tx.objectStore(CONFIG.STORE_NAME).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  // ---------------- Pengguna (login) ----------------
  async clearUsers() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([CONFIG.USERS_STORE_NAME], "readwrite");
      tx.objectStore(CONFIG.USERS_STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  },

  async putUsers(users) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([CONFIG.USERS_STORE_NAME], "readwrite");
      const store = tx.objectStore(CONFIG.USERS_STORE_NAME);
      users.forEach((u) => store.put(u));
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  },

  async getAllUsers() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([CONFIG.USERS_STORE_NAME], "readonly");
      const req = tx.objectStore(CONFIG.USERS_STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async countUsers() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([CONFIG.USERS_STORE_NAME], "readonly");
      const req = tx.objectStore(CONFIG.USERS_STORE_NAME).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  // ---------------- Info tambahan (waktu sinkron dll) ----------------
  async setMeta(key, value) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["meta"], "readwrite");
      tx.objectStore("meta").put({ key, value });
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  },

  async getMeta(key) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["meta"], "readonly");
      const req = tx.objectStore("meta").get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  // ---------------- Media Tersimpan (Studio Presentasi) ----------------
  // Lihat js/collections.js (loadMediaItems/addMediaItem/removeMediaItem)
  // untuk lapisan yang dipakai oleh UI -- fungsi di sini murni akses IndexedDB.
  async putMediaItem(item) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([CONFIG.MEDIA_STORE_NAME], "readwrite");
      tx.objectStore(CONFIG.MEDIA_STORE_NAME).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  },

  async getMediaItemsByUsername(username) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([CONFIG.MEDIA_STORE_NAME], "readonly");
      const idx = tx.objectStore(CONFIG.MEDIA_STORE_NAME).index("byUsername");
      const req = idx.getAll(IDBKeyRange.only(username || "guest"));
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async deleteMediaItem(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([CONFIG.MEDIA_STORE_NAME], "readwrite");
      tx.objectStore(CONFIG.MEDIA_STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  },

  // ---------------- Kidung / Hymn ----------------
  // Lihat js/kidung.js (resyncKidungSheet/getKidungList/getKidungRows)
  // untuk lapisan yang dipakai UI -- fungsi di sini murni akses IndexedDB,
  // pola sama persis seperti store "verses" di atas.
  async clearKidung() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([CONFIG.KIDUNG_STORE_NAME], "readwrite");
      tx.objectStore(CONFIG.KIDUNG_STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  },

  async bulkPutKidung(rows) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([CONFIG.KIDUNG_STORE_NAME], "readwrite");
      const store = tx.objectStore(CONFIG.KIDUNG_STORE_NAME);
      rows.forEach((r) => store.put(r));
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  },

  async getAllKidungRows() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([CONFIG.KIDUNG_STORE_NAME], "readonly");
      const req = tx.objectStore(CONFIG.KIDUNG_STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  // Semua baris (bait+koor) milik 1 no_kidung, TIDAK diurutkan di sini --
  // pemanggil (getKidungRows() di js/kidung.js) yang mengurutkan pakai
  // field `urutan` supaya logikanya di 1 tempat saja.
  async getKidungRowsByNo(noKidung) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([CONFIG.KIDUNG_STORE_NAME], "readonly");
      const idx = tx.objectStore(CONFIG.KIDUNG_STORE_NAME).index("byNoKidung");
      const req = idx.getAll(IDBKeyRange.only(noKidung));
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  // Sama seperti di atas, tapi dipersempit per BUKU juga (Kidung vs
  // Suplemen) -- dipakai supaya nomor yang sama di 2 buku berbeda tidak
  // ikut tercampur (lihat catatan index "byBukuNo" di open() di atas).
  async getKidungRowsByBukuNo(buku, noKidung) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([CONFIG.KIDUNG_STORE_NAME], "readonly");
      const idx = tx.objectStore(CONFIG.KIDUNG_STORE_NAME).index("byBukuNo");
      const req = idx.getAll(IDBKeyRange.only([buku, noKidung]));
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async countKidungRows() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([CONFIG.KIDUNG_STORE_NAME], "readonly");
      const req = tx.objectStore(CONFIG.KIDUNG_STORE_NAME).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  },
};
