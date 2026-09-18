// ============================================================
// 🔤 Slogan Karakter -- modul "Game Offline" (lihat window.PSCore &
// window.GameOffline di js/presentation-studio.js untuk kontrak
// lengkapnya, contoh: js/games/roda-putar.js).
//
// Data (GROUPS/CHARS/ICONS) & daftar kolom (FIELDS) datang dari
// js/games/slogankarakter-data.js (window.SLOGAN_KARAKTER_DATA /
// window.SLOGAN_KARAKTER_FIELDS_FOR) -- SATU file itu jugalah yang
// dipakai js/media-library.js (mode 1 Layar). File ini TIDAK ADA
// data karakter, cuma logika kontrol.
//
// VERSI CHECKLIST (19 Sep 2026, permintaan operator): dulu operator
// pilih SATU mode (tombol Pendek/Panjang/Keduanya). Sekarang tiap
// kolom yang tersedia untuk karakter itu (short/long selalu ada;
// arti/contoh/ayat kalau sudah diisi) muncul sebagai CHECKBOX,
// DEFAULT TERCENTANG SEMUA -- jadi begitu karakter dipilih, semua
// kolom yang ada langsung tayang. Operator boleh uncek yang tidak
// mau ditayangkan; kalau cuma 1 yang dibiarkan tercentang, cuma itu
// saja yang tampil di Layar 2. Tiap centang/uncek langsung
// menayangkan ulang (live), tidak perlu tombol "Tayangkan" terpisah.
//
// Kelompok, karakter, dan kolom yang tercentang terakhir diingat di
// localStorage supaya operator tidak mulai dari nol tiap buka tab.
//
// Sisi LAYAR 2 (present.html: showSloganKarakter()/stopSloganKarakter(),
// #sloganKarakterView) ada di present.html -- lihat catatan kontrak
// payload di sana, JANGAN diubah tanpa mengubah present.html juga.
//
// Kontrak payload (SAMA PERSIS dgn komentar di present.html):
//   { type:"slogankarakter", action:"show", karakter, fields }
//   - fields: array key kolom yang dicentang & mau tayang, urut
//     sesuai urutan tampil, mis. ["short","long"] atau ["arti"] saja.
//   { type:"slogankarakter", action:"reset" }
//   { type:"slogankarakter", action:"grid", kelompok }   -- BARU (19 Sep 2026)
//     TAMPILAN AWAL: judul "30 Karakter untuk Generasi Muda" + 10 kotak
//     kelompok di Layar 2 (kelompok 1..10 opsional = kotak yang disorot).
// Modul ini murni SATU ARAH (Studio -> Layar 2), tidak ada balasan
// dari Layar 2 -- handleMessage() sengaja kosong (dibiarkan ada,
// mengikuti kontrak window.GameOffline). Kalau Layar 2 baru dibuka/
// dimuat ulang, Presentation.postRaw() (js/presentation.js) sudah
// otomatis mengirim ulang payload terakhir, jadi tidak perlu ditangani.
//
// ALUR "ENAK" (19 Sep 2026): 🏠 Tampilan Awal (10 kotak) -> klik kotak
// kelompok (kotaknya disorot di Layar 2) -> klik karakter (slogan
// tayang). Klik kotak kelompok TIDAK menimpa slogan yang sedang tayang
// (supaya operator bebas menyiapkan kelompok berikutnya) -- pakai
// tombol 🏠 Tampilan Awal untuk kembali ke 10 kotak kapan saja.
// ============================================================
(function () {
  const { el, rawPost, renderStudioPreview } = window.PSCore;

  const LAST_KELOMPOK_KEY = "bible_app_sk_last_kelompok_v1";
  const LAST_KARAKTER_KEY = "bible_app_sk_last_karakter_v1";
  const LAST_FIELDS_KEY = "bible_app_sk_last_fields_v1"; // JSON array

  let currentKelompok_ = null; // objek { num, icon, chars }
  let currentKarakter_ = null; // string, key di CHARS
  let checkedFields_ = null;   // Set<string> -- null = belum diatur (dianggap "semua")
  let tayangMode_ = null;      // "grid" (Tampilan Awal) | "detail" (slogan 1 karakter) | null (belum ada dari modul ini)

  function data_() { return window.SLOGAN_KARAKTER_DATA; }

  function saveLast_() {
    try {
      if (currentKelompok_) localStorage.setItem(LAST_KELOMPOK_KEY, String(currentKelompok_.num));
      if (currentKarakter_) localStorage.setItem(LAST_KARAKTER_KEY, currentKarakter_);
    } catch (e) {}
  }

  function saveLastFields_() {
    try { localStorage.setItem(LAST_FIELDS_KEY, JSON.stringify(Array.from(checkedFields_))); } catch (e) {}
  }

  // ---------------- Layar "30 Karakter" (kotak kelompok) ----------------
  function buildGroupGrid_(container) {
    container.innerHTML = "";
    data_().GROUPS.forEach((g) => {
      const active = currentKelompok_ && currentKelompok_.num === g.num;
      const card = document.createElement("button");
      card.type = "button";
      card.style.cssText = "text-align:left; display:flex; flex-direction:column; gap:8px; border:1px solid " + (active ? "#C79A46" : "rgba(24,43,77,0.15)") + "; border-radius:14px; padding:12px; background:" + (active ? "#FBF4E6" : "#fff") + "; cursor:pointer; font-family:inherit; color:#182B4D;";
      const icon = data_().ICONS[g.icon] || "";
      card.innerHTML =
        '<div style="display:flex; align-items:center; justify-content:space-between;">' +
          '<span style="font-family:Georgia,\'Times New Roman\',serif; font-weight:700; font-size:13px; color:#C79A46; border:1.5px solid #C79A46; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">' + g.num + '</span>' +
          '<span style="width:18px; height:18px; color:#233B63; opacity:.75; flex-shrink:0;">' + icon + '</span>' +
        '</div>' +
        '<div style="font-family:Georgia,\'Times New Roman\',serif; font-weight:700; font-size:14px; line-height:1.3;">' + g.chars.join(", ") + '</div>';
      card.addEventListener("click", () => selectKelompok_(g));
      container.appendChild(card);
    });
  }

  // BARU (19 Sep 2026) -- TAMPILAN AWAL: 10 kotak di Layar 2. nomorKelompok
  // (opsional) = kotak yang disorot.
  function tampilkanAwal_(nomorKelompok) {
    const payload = { type: "slogankarakter", action: "grid", kelompok: nomorKelompok || null };
    tayangMode_ = "grid";
    rawPost(payload);
    renderStudioPreview(payload);
    const status = el("skStatus");
    if (status) status.textContent = nomorKelompok
      ? "Tayang: Tampilan Awal — kotak " + nomorKelompok + " disorot. Pilih karakternya di bawah."
      : "Tayang: Tampilan Awal (10 kotak kelompok)";
  }

  function selectKelompok_(g) {
    if (!currentKelompok_ || currentKelompok_.num !== g.num) currentKarakter_ = null;
    currentKelompok_ = g;
    saveLast_();
    buildGroupGrid_(el("skGroupArea"));
    renderCharsArea_();
    renderFieldsArea_();
    // Sorot kotak ini di Layar 2 -- KECUALI sedang ada slogan karakter yang
    // tayang (jangan ditimpa; operator mungkin cuma menyiapkan berikutnya).
    if (tayangMode_ !== "detail") tampilkanAwal_(g.num);
    else {
      const status = el("skStatus");
      if (status) status.textContent = "Slogan sedang tayang. Pilih karakter untuk menggantinya, atau tekan 🏠 Tampilan Awal untuk kembali ke 10 kotak.";
    }
  }

  function renderCharsArea_() {
    const wrap = el("skCharsArea");
    if (!wrap) return;
    wrap.innerHTML = "";
    if (!currentKelompok_) {
      wrap.innerHTML = '<span class="ps-pointer-hint">Pilih salah satu dari 10 kotak kelompok di atas dulu.</span>';
      return;
    }
    currentKelompok_.chars.forEach((name) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip-btn small" + (currentKarakter_ === name ? " primary" : "");
      btn.textContent = name;
      btn.addEventListener("click", () => {
        currentKarakter_ = name;
        checkedFields_ = null; // reset ke "default semua tercentang" tiap ganti karakter
        saveLast_();
        renderCharsArea_();
        renderFieldsArea_();
        tayangkan_(); // langsung tayang begitu karakter dipilih (semua kolom, default)
      });
      wrap.appendChild(btn);
    });
  }

  function lastFieldsSet_() {
    try {
      const raw = localStorage.getItem(LAST_FIELDS_KEY);
      if (raw) return new Set(JSON.parse(raw));
    } catch (e) {}
    return null;
  }

  // Checklist kolom -- DEFAULT TERCENTANG SEMUA kolom yang tersedia
  // untuk karakter ini (lihat SLOGAN_KARAKTER_FIELDS_FOR). Kalau ada
  // pilihan terakhir tersimpan (localStorage) DAN masih relevan untuk
  // karakter ini, pakai itu; kalau tidak, default semua tercentang.
  function renderFieldsArea_() {
    const wrap = el("skFieldsArea");
    if (!wrap) return;
    wrap.innerHTML = "";
    if (!currentKarakter_) {
      wrap.hidden = true;
      return;
    }
    wrap.hidden = false;
    const available = window.SLOGAN_KARAKTER_FIELDS_FOR(currentKarakter_);
    if (checkedFields_ === null) {
      const saved = lastFieldsSet_();
      if (saved && available.some((f) => saved.has(f.key))) {
        checkedFields_ = new Set(available.map((f) => f.key).filter((k) => saved.has(k)));
      } else {
        checkedFields_ = new Set(available.map((f) => f.key)); // default: semua tercentang
      }
    }
    available.forEach((f) => {
      const row = document.createElement("label");
      row.style.cssText = "display:flex; align-items:center; gap:8px; padding:6px 2px; font-size:13px; cursor:pointer;";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = checkedFields_.has(f.key);
      cb.addEventListener("change", () => {
        if (cb.checked) checkedFields_.add(f.key); else checkedFields_.delete(f.key);
        saveLastFields_();
        tayangkan_();
      });
      const span = document.createElement("span");
      span.textContent = f.label;
      row.appendChild(cb);
      row.appendChild(span);
      wrap.appendChild(row);
    });
  }

  function tayangkan_() {
    if (!currentKarakter_) return;
    const available = window.SLOGAN_KARAKTER_FIELDS_FOR(currentKarakter_).map((f) => f.key);
    const fields = available.filter((k) => checkedFields_.has(k));
    const status = el("skStatus");
    if (!fields.length) {
      if (status) status.textContent = "Pilih minimal 1 kolom untuk ditayangkan.";
      return;
    }
    tayangMode_ = "detail";
    rawPost({ type: "slogankarakter", action: "show", karakter: currentKarakter_, fields });
    renderStudioPreview({ type: "slogankarakter", action: "show", karakter: currentKarakter_, fields });
    if (status) status.textContent = "Tayang: " + currentKarakter_ + " (" + fields.length + " kolom)";
  }

  // Pulihkan kelompok/karakter terakhir (TANPA langsung menayangkan)
  // supaya operator lanjut dari terakhir kali dia buka tab ini.
  function restoreLast_() {
    let savedKelompokNum = null;
    let savedKarakter = null;
    try {
      savedKelompokNum = parseInt(localStorage.getItem(LAST_KELOMPOK_KEY), 10);
      savedKarakter = localStorage.getItem(LAST_KARAKTER_KEY);
    } catch (e) {}
    if (!savedKelompokNum) return;
    const g = data_().GROUPS.find((x) => x.num === savedKelompokNum);
    if (!g) return;
    currentKelompok_ = g;
    if (savedKarakter && g.chars.includes(savedKarakter)) currentKarakter_ = savedKarakter;
  }

  function wireTab() {
    const groupWrap = el("skGroupArea");
    const resetBtn = el("skResetBtn");
    if (!groupWrap || !resetBtn || !data_()) return; // markup/data belum ada di halaman ini -- diam saja

    restoreLast_();
    buildGroupGrid_(groupWrap);
    renderCharsArea_();
    renderFieldsArea_();

    const awalBtn = el("skAwalBtn");
    if (awalBtn) awalBtn.addEventListener("click", () => tampilkanAwal_(currentKelompok_ ? currentKelompok_.num : null));

    resetBtn.addEventListener("click", () => {
      tayangMode_ = null;
      rawPost({ type: "slogankarakter", action: "reset" });
      const status = el("skStatus");
      if (status) status.textContent = "";
    });
  }

  function handleMessage(_data) {
    // Satu arah (Studio -> Layar 2), tidak ada balasan yang perlu
    // ditangani di sini. Fungsi ini sengaja dibiarkan ada supaya
    // mengikuti kontrak window.GameOffline.register().
  }

  window.GameOffline.register({ id: "slogan-karakter", label: "🔤 Slogan Karakter", wireTab, handleMessage });
})();
