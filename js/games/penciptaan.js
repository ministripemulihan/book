// ============================================================
// 🌱 Penciptaan -- modul "Game Offline" ke-4 (lihat window.PSCore &
// window.GameOffline di js/presentation-studio.js untuk kontrak
// lengkapnya, dan js/games/roda-putar.js untuk contoh paling ringkas).
//
// Ini BUKAN game tanya-jawab seperti 🧩 Kuis 9 Kotak / 📊 Survei
// Membuktikan -- ini "game tayang": operator menekan Hari 1..7, dan
// Layar 2 menggambar ulang pemandangan penciptaan hari itu (terang ->
// cakrawala & air -> darat & tumbuhan -> matahari/bulan/bintang ->
// ikan & burung -> binatang & manusia -> hari perhentian di sawah).
// Cocok untuk cerita anak/Sekolah Minggu, ice breaker "tebak hari
// keberapa", atau latar diam saat pembicara bercerita.
//
// SEMUA gambarnya SVG murni di js/book-scene.js -- tidak ada file
// gambar/video yang perlu diunduh, jadi tetap jalan 100% OFFLINE
// persis seperti game-game lain di folder ini.
//
// KHUSUS HARI 7 (sawah): pemandangannya HIDUP mengikuti JAM ASLI
// PERANGKAT Layar 2 -- langit pagi/siang/sore/malam, dan dua anak yang
// berganti baju sendiri:
//   05.00-07.00 kaos rumah (baru bangun), tanpa alas kaki
//   07.00-10.00 seragam sekolah (atas putih, bawahan merah) + sepatu
//   10.00-13.00 baju pergi + sepatu
//   13.00-18.00 kaos rumah sore + sandal
//   18.00-21.00 baju tidur, tanpa alas kaki
//   21.00-05.00 menghilang (sedang tidur)
//   05.00-06.00 seekor ayam jago muncul di samping & berkokok
// Penggeser "Pratinjau jam" di panel ini HANYA untuk mencoba-coba
// (mis. mau menunjukkan suasana malam di acara siang hari); tombol
// "🕒 Ikuti jam perangkat" mengembalikannya ke jam sungguhan.
//
// KONTRAK PAYLOAD (SAMA PERSIS dgn komentar di present.html, JANGAN
// diubah tanpa mengubah present.html juga):
//   { type:"penciptaan", action:"show",  hari:1..7, teks:true|false }
//   { type:"penciptaan", action:"jam",   jam:0..23.99 }   // pratinjau jam (hari 7)
//   { type:"penciptaan", action:"jamauto" }               // kembali ke jam perangkat
//   { type:"penciptaan", action:"reset" }                 // sembunyikan, kembali idle
// Modul ini TIDAK menunggu balasan apa pun dari Layar 2 (beda dari 🎡
// Roda Undian yang perlu tahu pemenangnya), jadi handleMessage() cukup
// dipakai untuk menyelaraskan tombol kalau Layar 2 baru dibuka.
// ============================================================
(function () {
  const { el, rawPost, renderStudioPreview } = window.PSCore;

  const HARI_KEY = "bible_app_penciptaan_hari_v1";
  const TEKS_KEY = "bible_app_penciptaan_teks_v1";
  const PUTAR_MS = 4500; // jeda "putar otomatis" antar hari

  // Judul & rujukan tiap hari. Sengaja hanya JUDUL + ALAMAT AYAT (bukan
  // kutipan panjang) -- kalau operator mau menayangkan bunyi ayatnya,
  // itu sudah ada jalurnya sendiri lewat tab "📖 Alkitab"/"📚 Kumpulan
  // Ayat" yang bisa dipakai bergantian dengan game ini.
  const HARI = [
    { n: 1, ikon: "✨", nama: "Terang", ayat: "Kejadian 1:3-5" },
    { n: 2, ikon: "🌊", nama: "Cakrawala & air", ayat: "Kejadian 1:6-8" },
    { n: 3, ikon: "🌿", nama: "Darat, laut & tumbuhan", ayat: "Kejadian 1:9-13" },
    { n: 4, ikon: "🌗", nama: "Matahari, bulan & bintang", ayat: "Kejadian 1:14-19" },
    { n: 5, ikon: "🐟", nama: "Ikan & burung", ayat: "Kejadian 1:20-23" },
    { n: 6, ikon: "🦁", nama: "Binatang darat & manusia", ayat: "Kejadian 1:24-31" },
    { n: 7, ikon: "🌾", nama: "Hari perhentian di sawah", ayat: "Kejadian 2:1-3" }
  ];

  let hariAktif_ = 1;
  let putarTimer_ = null;
  let tayang_ = false;

  function pakaiTeks_() {
    const chk = el("psPenciptaanTeksChk");
    return chk ? !!chk.checked : true;
  }

  function tandaiTombol_() {
    const bar = el("psPenciptaanDays");
    if (!bar) return;
    bar.querySelectorAll("button[data-hari]").forEach((b) => {
      b.setAttribute("aria-selected", String(Number(b.dataset.hari) === hariAktif_));
    });
    const lbl = el("psPenciptaanLabel");
    if (lbl) {
      const d = HARI[hariAktif_ - 1];
      lbl.textContent = "Hari " + d.n + " · " + d.nama + " (" + d.ayat + ")";
    }
  }

  function kirim_(hari) {
    hariAktif_ = Math.max(1, Math.min(7, hari));
    tayang_ = true;
    try { localStorage.setItem(HARI_KEY, String(hariAktif_)); } catch (e) {}
    rawPost({ type: "penciptaan", action: "show", hari: hariAktif_, teks: pakaiTeks_() });
    renderStudioPreview({ type: "penciptaan" });
    tandaiTombol_();
    perbaruiJamUi_();
  }

  // Penggeser jam hanya masuk akal di hari 7 -- di hari lain
  // pemandangannya memang tidak mengikuti jam sama sekali.
  function perbaruiJamUi_() {
    const wrap = el("psPenciptaanJamWrap");
    if (wrap) wrap.hidden = hariAktif_ !== 7;
  }

  function setPutar_(on) {
    const btn = el("psPenciptaanPutarBtn");
    if (on) {
      if (putarTimer_) return;
      putarTimer_ = setInterval(() => { kirim_((hariAktif_ % 7) + 1); }, PUTAR_MS);
      if (btn) { btn.setAttribute("aria-pressed", "true"); btn.textContent = "⏸️ Berhenti"; }
    } else {
      if (putarTimer_) { clearInterval(putarTimer_); putarTimer_ = null; }
      if (btn) { btn.setAttribute("aria-pressed", "false"); btn.textContent = "▶️ Putar otomatis"; }
    }
  }

  function wireTab() {
    const bar = el("psPenciptaanDays");
    const resetBtn = el("psPenciptaanResetBtn");
    const putarBtn = el("psPenciptaanPutarBtn");
    if (!bar || !resetBtn) return; // markup belum ada di halaman ini -- diam saja

    // Pulihkan pilihan terakhir di perangkat ini (tidak langsung
    // ditayangkan -- hanya menandai tombolnya, supaya membuka Studio
    // tidak pernah tiba-tiba mengubah apa yang sedang tampil di Layar 2).
    try {
      const h = parseInt(localStorage.getItem(HARI_KEY), 10);
      if (h >= 1 && h <= 7) hariAktif_ = h;
    } catch (e) {}
    try {
      const t = localStorage.getItem(TEKS_KEY);
      const chk = el("psPenciptaanTeksChk");
      if (chk && t != null) chk.checked = t === "1";
    } catch (e) {}

    HARI.forEach((d) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "bk-day";
      b.dataset.hari = String(d.n);
      b.title = "Hari " + d.n + ": " + d.nama + " (" + d.ayat + ")";
      b.setAttribute("aria-label", b.title);
      b.setAttribute("aria-selected", "false");
      b.innerHTML = '<em aria-hidden="true">' + d.ikon + "</em><span>" + d.n + "</span>";
      b.addEventListener("click", () => { setPutar_(false); kirim_(d.n); });
      bar.appendChild(b);
    });
    tandaiTombol_();
    perbaruiJamUi_();

    if (putarBtn) {
      putarBtn.addEventListener("click", () => {
        if (putarTimer_) { setPutar_(false); return; }
        if (!tayang_) kirim_(hariAktif_); // hidupkan dulu kalau Layar 2 masih idle
        setPutar_(true);
      });
    }

    resetBtn.addEventListener("click", () => {
      setPutar_(false);
      tayang_ = false;
      rawPost({ type: "penciptaan", action: "reset" });
    });

    const teksChk = el("psPenciptaanTeksChk");
    if (teksChk) {
      teksChk.addEventListener("change", () => {
        try { localStorage.setItem(TEKS_KEY, teksChk.checked ? "1" : "0"); } catch (e) {}
        if (tayang_) kirim_(hariAktif_); // langsung terlihat, tanpa perlu klik hari lagi
      });
    }

    const jamGeser = el("psPenciptaanJam");
    const jamLabel = el("psPenciptaanJamLabel");
    function tulisJam_(menitTotal) {
      if (!jamLabel) return;
      const j = Math.floor(menitTotal / 60), m = Math.floor(menitTotal % 60);
      jamLabel.textContent = (j < 10 ? "0" : "") + j + ":" + (m < 10 ? "0" : "") + m;
    }
    if (jamGeser) {
      jamGeser.addEventListener("input", () => {
        tulisJam_(Number(jamGeser.value));
        rawPost({ type: "penciptaan", action: "jam", jam: Number(jamGeser.value) / 60 });
      });
      tulisJam_(Number(jamGeser.value));
    }
    const jamAutoBtn = el("psPenciptaanJamAutoBtn");
    if (jamAutoBtn) {
      jamAutoBtn.addEventListener("click", () => {
        const d = new Date();
        if (jamGeser) {
          jamGeser.value = String(d.getHours() * 60 + d.getMinutes());
          tulisJam_(Number(jamGeser.value));
        }
        rawPost({ type: "penciptaan", action: "jamauto" });
      });
    }
  }

  // Layar 2 baru dibuka/dimuat ulang saat game ini sedang dipakai ->
  // kirim ulang hari yang aktif, supaya operator tidak perlu klik lagi.
  function handleMessage(data) {
    if (!data || data.type !== "present_ready") return;
    if (!tayang_) return;
    rawPost({ type: "penciptaan", action: "show", hari: hariAktif_, teks: pakaiTeks_() });
  }

  window.GameOffline.register({ id: "penciptaan", label: "🌱 Penciptaan", wireTab, handleMessage });
})();
