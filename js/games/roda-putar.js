// ============================================================
// 🎡 Roda Undian -- modul "Game Offline" (lihat window.PSCore &
// window.GameOffline di js/presentation-studio.js untuk kontrak
// lengkapnya). File ini DIBANGUN ULANG (16 Sep 2026) karena versi
// sebelumnya sempat "dipindah ke sini" tapi filenya sendiri tidak
// pernah benar-benar dibuat -- akibatnya tombol "🎡 Tampilkan Roda"
// di panel Studio tidak bisa diklik sama sekali (elemen ada di
// index.html, tapi tidak ada script yang memasang event listener-nya).
//
// SISI LAYAR 2 (present.html: showWheel()/spinWheel()/stopWheel(),
// #wheelView/#wheelCanvas) TIDAK PERNAH hilang & TIDAK disentuh sama
// sekali di sini -- itu penggambaran roda + animasi putarnya, sudah
// lengkap dari sesi 9 Sep 2026. File ini HANYA sisi PENGONTROL di
// panel Studio (baca nama dari textarea, kirim perintah show/spin/stop,
// terima hasil pemenang balik, urus mode "buang pemenang").
//
// Kontrak payload (SAMA PERSIS dgn komentar di present.html, JANGAN
// diubah tanpa mengubah present.html juga):
//   { type:"wheel", action:"show"|"spin"|"stop", entries, winnerIndex, spinId }
//   - "show": gambar ulang roda dari daftar nama TANPA memutar.
//   - "spin": winnerIndex DITENTUKAN DI SINI (Math.random()), bukan di
//             Layar 2 -- supaya Studio langsung tahu pemenangnya untuk
//             mode "buang pemenang" tanpa menunggu animasi 4+ detik.
//   - "stop": sembunyikan roda, kembali idle.
// Balasan dari Layar 2 lewat window "message":
//   { source:"bibleAppPresenter", type:"present_wheel_result", spinId, winnerIndex }
// ============================================================
(function () {
  const { el, rawPost, renderStudioPreview } = window.PSCore;

  const ENTRIES_KEY = "bible_app_wheel_entries_v1";
  const REMOVE_WINNER_KEY = "bible_app_wheel_remove_winner_v1";

  let lastSpinId_ = null; // dipakai menyaring balasan "present_wheel_result" -- abaikan kalau bukan balasan spin TERAKHIR (jaga-jaga kalau ada balasan "telat"/dobel)
  let spinning_ = false;

  function parseEntries_(raw) {
    return String(raw || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function setSpinEnabled_(entriesCount) {
    const spinBtn = el("psWheelSpinBtn");
    if (!spinBtn) return;
    spinBtn.disabled = spinning_ || entriesCount < 2;
  }

  function showWinner_(name) {
    const box = el("psWheelWinnerBox");
    if (!box) return;
    box.hidden = false;
    box.textContent = "🏆 Pemenang: " + name;
  }

  function hideWinner_() {
    const box = el("psWheelWinnerBox");
    if (!box) return;
    box.hidden = true;
    box.textContent = "";
  }

  function wireTab() {
    const applyBtn = el("psWheelApplyBtn");
    const spinBtn = el("psWheelSpinBtn");
    const resetBtn = el("psWheelResetBtn");
    const entriesEl = el("psWheelEntries");
    const removeWinnerChk = el("psWheelRemoveWinnerChk");
    if (!applyBtn || !spinBtn || !resetBtn || !entriesEl) return; // markup belum ada di halaman ini -- diam saja

    // Pulihkan daftar nama & pilihan "mode gugur" terakhir dari
    // perangkat ini (localStorage) -- supaya operator tidak perlu
    // ketik ulang tiap kali membuka Studio lagi.
    try {
      const savedEntries = localStorage.getItem(ENTRIES_KEY);
      if (savedEntries != null) entriesEl.value = savedEntries;
    } catch (e) {}
    try {
      if (removeWinnerChk) removeWinnerChk.checked = localStorage.getItem(REMOVE_WINNER_KEY) === "1";
    } catch (e) {}

    setSpinEnabled_(parseEntries_(entriesEl.value).length);

    applyBtn.addEventListener("click", () => {
      const entries = parseEntries_(entriesEl.value);
      try { localStorage.setItem(ENTRIES_KEY, entriesEl.value); } catch (e) {}
      hideWinner_();
      if (entries.length < 2) {
        alert("Isi minimal 2 nama dulu (1 nama per baris) sebelum menampilkan roda.");
        setSpinEnabled_(entries.length);
        return;
      }
      rawPost({ type: "wheel", action: "show", entries });
      renderStudioPreview({ type: "wheel" });
      setSpinEnabled_(entries.length);
    });

    spinBtn.addEventListener("click", () => {
      const entries = parseEntries_(entriesEl.value);
      if (entries.length < 2 || spinning_) return;
      spinning_ = true;
      setSpinEnabled_(entries.length);
      hideWinner_();
      const winnerIndex = Math.floor(Math.random() * entries.length);
      const spinId = "wheel_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
      lastSpinId_ = spinId;
      rawPost({ type: "wheel", action: "spin", winnerIndex, spinId });
    });

    resetBtn.addEventListener("click", () => {
      spinning_ = false;
      lastSpinId_ = null;
      hideWinner_();
      rawPost({ type: "wheel", action: "stop" });
      setSpinEnabled_(parseEntries_(entriesEl.value).length);
    });

    if (removeWinnerChk) {
      removeWinnerChk.addEventListener("change", () => {
        try { localStorage.setItem(REMOVE_WINNER_KEY, removeWinnerChk.checked ? "1" : "0"); } catch (e) {}
      });
    }

    entriesEl.addEventListener("input", () => {
      setSpinEnabled_(parseEntries_(entriesEl.value).length);
    });
  }

  function handleMessage(data) {
    if (!data || data.type !== "present_wheel_result") return; // bukan buat modul ini
    if (data.spinId !== lastSpinId_) return; // balasan "telat"/dobel dari putaran sebelumnya -- abaikan
    spinning_ = false;
    const entriesEl = el("psWheelEntries");
    const removeWinnerChk = el("psWheelRemoveWinnerChk");
    const entries = entriesEl ? parseEntries_(entriesEl.value) : [];
    const winnerName = entries[data.winnerIndex] != null ? entries[data.winnerIndex] : "(tidak diketahui)";
    showWinner_(winnerName);

    // Mode "buang pemenang" -- hapus nama pemenang dari daftar &
    // gambar ulang roda TANPA nama itu, supaya undian berikutnya tidak
    // bisa menang 2x. Kalau sisa nama < 2, tombol "Putar!" otomatis
    // nonaktif lagi lewat setSpinEnabled_() di bawah (tidak perlu
    // penanganan khusus).
    if (removeWinnerChk && removeWinnerChk.checked && entriesEl) {
      const remaining = entries.filter((_, i) => i !== data.winnerIndex);
      entriesEl.value = remaining.join("\n");
      try { localStorage.setItem(ENTRIES_KEY, entriesEl.value); } catch (e) {}
      if (remaining.length >= 1) {
        rawPost({ type: "wheel", action: "show", entries: remaining });
      }
    }
    setSpinEnabled_(entriesEl ? parseEntries_(entriesEl.value).length : 0);
  }

  window.GameOffline.register({ id: "roda-undian", label: "🎡 Roda Undian", wireTab, handleMessage });
})();
