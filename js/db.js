// ============================================================
//  LAPISAN PENYIMPANAN LOKAL (IndexedDB)
//  Menyimpan dua hal secara lokal:
//   1) Seluruh teks Alkitab (store "verses") — dari Google Sheet #1
//   2) Daftar akun pengguna (store "users") — dari Google Sheet #2
//  Setelah tersimpan, aplikasi TIDAK perlu memanggil server lagi
//  untuk membaca Alkitab maupun untuk login berikutnya.
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
};
