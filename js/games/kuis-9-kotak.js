// ============================================================
// 🧩 Kuis 9 Kotak & 🎲 Tak Tik Boom -- modul "Game Offline" ke-2
// (BARU 16 Sep 2026, permintaan operator, lihat file rancangan
// USULAN-KUIS-9-KOTAK.md untuk spesifikasi lengkap & alasan tiap
// aturan). SATU MESIN dua mode -- dipilih operator lewat dropdown
// #psQuiz9Mode SEBELUM menekan "🎲 Acak & Mulai":
//   - "tictactoe"  = Kuis 9 Kotak biasa: 9 kotak, poin bebas per kotak
//                    (operator isi manual, boleh negatif).
//   - "taktikboom" = Tak Tik Boom: sama seperti di atas, TAPI 3 dari
//                    9 kotak diacak jadi TAK/TIK/BOOM oleh MESIN INI
//                    SENDIRI (Math.random()) begitu "Acak & Mulai"
//                    ditekan -- posisinya TIDAK PERNAH diberitahukan
//                    ke panel Studio dalam bentuk apa pun sampai kotak
//                    itu benar-benar dipilih & dibuka (lihat openBox_()
//                    & publicState_() -- field `specialTrue` di `state`
//                    ini sendiri TIDAK PERNAH dikirim, hanya
//                    `specialRevealed` yang boleh null selamanya
//                    sampai kotak itu dibuka).
//
// Mengikuti pola window.PSCore/window.GameOffline PERSIS seperti
// js/games/roda-putar.js -- lihat catatan panjang di dekat deklarasi
// window.PSCore (awal js/presentation-studio.js) untuk kontraknya.
//
// ------------------------------------------------------------
// ATURAN MAIN (ringkasan -- lihat USULAN-KUIS-9-KOTAK.md untuk detail
// & contoh alur lengkap):
//
// 1. 9 kotak, 2 kelompok (X/O). Kotak dipilih bergiliran oleh
//    `activeGroup` (kelompok yang SEDANG gilirannya MEMILIH kotak).
// 2. Kotak dengan poin NEGATIF (mis. -10) & kotak BOOM yang jawabannya
//    SALAH -> LANGSUNG FINAL ke kelompok yang membukanya (tidak pernah
//    dilempar ke lawan) -- lihat openBox_()/judge_().
// 3. Kotak lain (poin >=0, TAK, TIK) -- jawaban SALAH pertama kali
//    DILEMPAR ke kelompok lawan (giliran MENJAWAB pindah, giliran
//    MEMILIH kotak berikutnya tetap ditentukan dari kelompok yang
//    PERTAMA KALI membuka kotak itu, lihat `pickerGroup`). Kalau lawan
//    JUGA salah, kotak jadi NETRAL (tidak ada yang dapat tanda).
// 4. TAK Kotak & TIK Kotak: jawaban benar = 0 poin (poin kotak
//    diabaikan) -- HANYA dapat bonus (default 500, bisa diubah
//    operator) kalau SATU kelompok yang sama memiliki KEDUA kotak itu.
// 5. Menang INSTAN kalau 3 tanda sejajar (garis manapun) -- poin sama
//    sekali tidak berpengaruh ke syarat ini. Kalau 9 kotak habis tanpa
//    garis, poin TERTINGGI menang; seri poin = seri (operator putuskan
//    manual, mis. soal tambahan sudden-death di luar sistem ini).
// ------------------------------------------------------------
(function () {
  const { el, rawPost, renderStudioPreview } = window.PSCore;

  const SETUP_KEY = "bible_app_quiz9_setup_v1"; // topik/soal/poin 9 kotak + mode + nilai bonus, per perangkat

  // 8 kombinasi garis menang: 3 baris, 3 kolom, 2 diagonal (indeks 0-8,
  // dibaca kiri-atas ke kanan-bawah seperti nomor telepon).
  const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  let state = null; // null = belum "Acak & Mulai" (editor masih terbuka)

  function other_(g) { return g === "X" ? "O" : "X"; }

  // ------------------------------------------------------------
  // Editor 9 kotak (dipulihkan/disimpan per perangkat lewat
  // localStorage, pola SAMA seperti ENTRIES_KEY di roda-putar.js).
  // ------------------------------------------------------------
  function loadSetup_() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(SETUP_KEY) || "null"); } catch (e) {}
    if (!saved) return;
    if (el("psQuiz9Mode") && saved.mode) el("psQuiz9Mode").value = saved.mode;
    if (el("psQuiz9Bonus") && saved.bonusValue != null) el("psQuiz9Bonus").value = saved.bonusValue;
    (saved.boxes || []).forEach((b, i) => {
      const n = i + 1;
      if (el("psQuiz9Topik" + n)) el("psQuiz9Topik" + n).value = b.topik || "";
      if (el("psQuiz9Soal" + n)) el("psQuiz9Soal" + n).value = b.soal || "";
      if (el("psQuiz9Poin" + n)) el("psQuiz9Poin" + n).value = b.poin != null ? b.poin : "";
    });
    syncBonusFieldVisibility_();
  }

  function readSetupFromInputs_() {
    const mode = el("psQuiz9Mode") ? el("psQuiz9Mode").value : "tictactoe";
    const bonusValue = parseInt(el("psQuiz9Bonus") ? el("psQuiz9Bonus").value : "500", 10) || 500;
    const boxes = [];
    for (let i = 1; i <= 9; i++) {
      const topikEl = el("psQuiz9Topik" + i);
      const soalEl = el("psQuiz9Soal" + i);
      const poinEl = el("psQuiz9Poin" + i);
      boxes.push({
        topik: topikEl ? topikEl.value.trim() : "",
        soal: soalEl ? soalEl.value.trim() : "",
        poin: poinEl ? (parseInt(poinEl.value, 10) || 0) : 0,
      });
    }
    return { mode, bonusValue, boxes };
  }

  function saveSetup_(setup) {
    try { localStorage.setItem(SETUP_KEY, JSON.stringify(setup)); } catch (e) {}
  }

  function syncBonusFieldVisibility_() {
    const wrap = el("psQuiz9BonusWrap");
    if (!wrap) return;
    const mode = el("psQuiz9Mode") ? el("psQuiz9Mode").value : "tictactoe";
    wrap.hidden = mode !== "taktikboom";
  }

  function setEditorLocked_(locked) {
    for (let i = 1; i <= 9; i++) {
      ["psQuiz9Topik" + i, "psQuiz9Soal" + i, "psQuiz9Poin" + i].forEach((id) => {
        if (el(id)) el(id).disabled = locked;
      });
    }
    if (el("psQuiz9Mode")) el("psQuiz9Mode").disabled = locked;
    if (el("psQuiz9Bonus")) el("psQuiz9Bonus").disabled = locked;
    if (el("psQuiz9StartBtn")) el("psQuiz9StartBtn").hidden = locked;
    if (el("psQuiz9ResetBtn")) el("psQuiz9ResetBtn").hidden = !locked;
    if (el("psQuiz9GameArea")) el("psQuiz9GameArea").hidden = !locked;
  }

  // ------------------------------------------------------------
  // Mesin permainan
  // ------------------------------------------------------------
  function startGame_() {
    const setup = readSetupFromInputs_();
    for (let i = 0; i < 9; i++) {
      if (!setup.boxes[i].topik) {
        alert("Isi Topik kotak " + (i + 1) + " dulu sebelum mulai.");
        return;
      }
    }
    saveSetup_(setup);

    const boxes = setup.boxes.map((b) => ({
      topik: b.topik, soal: b.soal, poin: b.poin,
      status: "empty", // "empty" | "X" | "O" | "neutral"
      specialTrue: null, // PRIVATE -- "tak" | "tik" | "boom" | null, TIDAK PERNAH dikirim mentah-mentah
      specialRevealed: null, // boleh dikirim -- null sampai kotak ini dibuka
    }));

    if (setup.mode === "taktikboom") {
      const pool = [0, 1, 2, 3, 4, 5, 6, 7, 8];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      boxes[pool[0]].specialTrue = "tak";
      boxes[pool[1]].specialTrue = "tik";
      boxes[pool[2]].specialTrue = "boom";
    }

    state = {
      mode: setup.mode,
      boxes,
      activeGroup: "X",
      pickerGroup: "X", // kelompok yang PERTAMA KALI membuka kotak yang sedang aktif -- dipakai menentukan giliran BERIKUTNYA (lihat finishBox_())
      phase: "picking", // "picking" | "asking" | "stealing"
      activeBoxIndex: null,
      scores: { X: 0, O: 0 },
      bonusValue: setup.bonusValue,
      tikTakOwner: { tak: null, tik: null },
      bonusAwardedTo: null,
      gameOver: false,
      winner: null,
    };
    setEditorLocked_(true);
    broadcast_();
  }

  function resetGame_() {
    state = null;
    setEditorLocked_(false);
    rawPost({ type: "quiz9", action: "reset" });
    renderStudioPreview({ type: "quiz9" });
    renderPanel_();
  }

  function checkLine_() {
    for (const line of LINES) {
      const [a, b, c] = line.map((i) => state.boxes[i].status);
      if (a !== "empty" && a !== "neutral" && a === b && b === c) return a;
    }
    return null;
  }

  function isBoardFull_() {
    return state.boxes.every((b) => b.status !== "empty");
  }

  // Dipanggil setiap kali 1 kotak SELESAI diputuskan (final, apa pun
  // hasilnya -- milik X, milik O, atau netral) -- mengecek menang &
  // memindahkan giliran MEMILIH kotak ke kelompok berikutnya
  // (`other(pickerGroup)`, BUKAN `other(activeGroup)`, supaya giliran
  // tidak "nyangkut" di kelompok yang cuma sempat MENJAWAB lewat
  // rebutan/steal -- lihat catatan Bagian 2 USULAN-KUIS-9-KOTAK.md).
  function finishBox_() {
    const picker = state.pickerGroup;
    state.activeBoxIndex = null;
    state.phase = "picking";
    const lineWinner = checkLine_();
    if (lineWinner) {
      state.gameOver = true;
      state.winner = { by: "line", group: lineWinner };
    } else if (isBoardFull_()) {
      state.gameOver = true;
      if (state.scores.X === state.scores.O) state.winner = { by: "tie", group: null };
      else state.winner = { by: "points", group: state.scores.X > state.scores.O ? "X" : "O" };
    } else {
      state.activeGroup = other_(picker);
    }
    broadcast_();
  }

  function openBox_(idx) {
    if (!state || state.gameOver) return;
    const box = state.boxes[idx];
    if (!box || box.status !== "empty" || state.phase !== "picking") return;
    const picker = state.activeGroup;
    state.pickerGroup = picker;
    state.activeBoxIndex = idx;
    // Kotak BOOM SELALU ditanya (poin manualnya diabaikan, override
    // tetap +1000/-200 -- lihat judge_()). Kotak lain dengan poin
    // NEGATIF final instan TANPA pertanyaan (lihat Bagian 3
    // USULAN-KUIS-9-KOTAK.md, berlaku utk kedua mode).
    if (box.specialTrue !== "boom" && box.poin < 0) {
      box.status = picker;
      box.specialRevealed = box.specialTrue; // kalau kebetulan ini kotak TAK/TIK bernilai negatif -- tetap terungkap begitu dibuka
      state.scores[picker] += box.poin;
      finishBox_();
      return;
    }
    box.specialRevealed = box.specialTrue; // terungkap SAAT DIBUKA, bukan sebelumnya
    state.phase = "asking";
    broadcast_();
  }

  function judge_(idx, correct) {
    if (!state || state.gameOver || state.activeBoxIndex !== idx) return;
    const box = state.boxes[idx];
    const answerer = state.activeGroup;

    if (box.specialTrue === "boom") {
      // BOOM selalu final ke kelompok yang membukanya -- TIDAK PERNAH
      // dilempar ke lawan, poin TETAP +1000/-200 (mengabaikan field
      // poin manual operator untuk kotak ini).
      box.status = answerer;
      state.scores[answerer] += correct ? 1000 : -200;
      finishBox_();
      return;
    }

    if (correct) {
      box.status = answerer;
      const isTakTik = box.specialTrue === "tak" || box.specialTrue === "tik";
      state.scores[answerer] += isTakTik ? 0 : box.poin;
      if (isTakTik) {
        state.tikTakOwner[box.specialTrue] = answerer;
        const { tak, tik } = state.tikTakOwner;
        if (tak && tik && tak === tik && !state.bonusAwardedTo) {
          state.bonusAwardedTo = answerer;
          state.scores[answerer] += state.bonusValue;
        }
      }
      finishBox_();
      return;
    }

    // Jawaban salah:
    if (state.phase === "asking") {
      // Percobaan pertama salah -> lempar ke lawan (soal SAMA, giliran
      // MENJAWAB pindah -- giliran MEMILIH kotak berikutnya tetap
      // ditentukan dari `pickerGroup`, tidak berubah di sini).
      state.phase = "stealing";
      state.activeGroup = other_(answerer);
      broadcast_();
      return;
    }
    // Percobaan kedua (lawan) JUGA salah -> kotak netral, tidak ada yg dapat tanda.
    box.status = "neutral";
    finishBox_();
  }

  function publicBoxes_() {
    return state.boxes.map((b) => ({
      topik: b.topik, poin: b.poin, status: b.status,
      special: b.specialRevealed, // null sampai kotak ini dibuka -- lihat catatan panjang di atas file
    }));
  }

  function publicState_() {
    const hasQuestion = (state.phase === "asking" || state.phase === "stealing") && state.activeBoxIndex != null;
    const box = hasQuestion ? state.boxes[state.activeBoxIndex] : null;
    return {
      mode: state.mode,
      boxes: publicBoxes_(),
      activeGroup: state.activeGroup,
      scores: state.scores,
      gameOver: state.gameOver,
      winner: state.winner,
      activeQuestion: hasQuestion
        ? { boxIndex: state.activeBoxIndex, topik: box.topik, soal: box.soal, answeringGroup: state.activeGroup, isSteal: state.phase === "stealing" }
        : null,
    };
  }

  function broadcast_() {
    rawPost({ type: "quiz9", action: "state", state: publicState_() });
    renderStudioPreview({ type: "quiz9" });
    renderPanel_();
  }

  // ------------------------------------------------------------
  // Panel Studio (mini papan 3x3 + skor + tombol ✅/❌)
  // ------------------------------------------------------------
  function renderPanel_() {
    const boardEl = el("psQuiz9MiniBoard");
    const scoreEl = el("psQuiz9ScoreLine");
    const qEl = el("psQuiz9CurrentQ");
    const correctBtn = el("psQuiz9CorrectBtn");
    const wrongBtn = el("psQuiz9WrongBtn");
    const winnerEl = el("psQuiz9WinnerBox");
    if (!boardEl) return; // markup belum ada di halaman ini -- diam saja (pola sama seperti roda-putar.js)

    if (!state) {
      boardEl.innerHTML = "";
      if (scoreEl) scoreEl.textContent = "";
      if (qEl) qEl.hidden = true;
      if (correctBtn) correctBtn.disabled = true;
      if (wrongBtn) wrongBtn.disabled = true;
      if (winnerEl) { winnerEl.hidden = true; winnerEl.textContent = ""; }
      return;
    }

    boardEl.innerHTML = "";
    state.boxes.forEach((b, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip-btn small";
      btn.style.cssText = "aspect-ratio:1; padding:4px; font-size:11px; line-height:1.2; white-space:normal; overflow:hidden;"
        + (b.status === "X" ? " background:rgba(61,142,226,.35);" : b.status === "O" ? " background:rgba(226,72,61,.35);" : b.status === "neutral" ? " opacity:.4;" : "");
      btn.textContent = b.status === "empty" ? (b.topik || "(kotak " + (i + 1) + ")") : b.status === "neutral" ? "— (netral)" : b.status + " -- " + b.topik;
      btn.disabled = state.gameOver || state.phase !== "picking" || b.status !== "empty";
      btn.addEventListener("click", () => openBox_(i));
      boardEl.appendChild(btn);
    });

    if (scoreEl) scoreEl.textContent = "Skor -- X: " + state.scores.X + "  |  O: " + state.scores.O + "  |  Giliran memilih: Kelompok " + state.activeGroup;

    const hasQuestion = (state.phase === "asking" || state.phase === "stealing") && state.activeBoxIndex != null;
    if (qEl) {
      if (hasQuestion) {
        const box = state.boxes[state.activeBoxIndex];
        qEl.hidden = false;
        qEl.textContent = (state.phase === "stealing" ? "🔁 Rebutan -- " : "") + "Kelompok " + state.activeGroup + " menjawab: [" + box.topik + "] " + box.soal
          + (box.specialRevealed ? "  (" + box.specialRevealed.toUpperCase() + "!)" : "");
      } else {
        qEl.hidden = true;
      }
    }
    if (correctBtn) correctBtn.disabled = !hasQuestion;
    if (wrongBtn) wrongBtn.disabled = !hasQuestion;

    if (winnerEl) {
      if (state.gameOver) {
        winnerEl.hidden = false;
        const w = state.winner;
        winnerEl.textContent = (!w || w.by === "tie") ? "🤝 Seri! Skor sama." : "🏆 Kelompok " + w.group + " menang (" + (w.by === "line" ? "3 sejajar" : "poin tertinggi") + ")";
      } else {
        winnerEl.hidden = true;
        winnerEl.textContent = "";
      }
    }
  }

  function wireTab() {
    const modeEl = el("psQuiz9Mode");
    const startBtn = el("psQuiz9StartBtn");
    const resetBtn = el("psQuiz9ResetBtn");
    const correctBtn = el("psQuiz9CorrectBtn");
    const wrongBtn = el("psQuiz9WrongBtn");
    if (!startBtn || !resetBtn) return; // markup belum ada di halaman ini -- diam saja

    loadSetup_();
    setEditorLocked_(false);
    renderPanel_();

    if (modeEl) modeEl.addEventListener("change", syncBonusFieldVisibility_);
    startBtn.addEventListener("click", startGame_);
    resetBtn.addEventListener("click", () => {
      if (state && !state.gameOver && !confirm("Reset game yang sedang berjalan?")) return;
      resetGame_();
    });
    if (correctBtn) correctBtn.addEventListener("click", () => { if (state && state.activeBoxIndex != null) judge_(state.activeBoxIndex, true); });
    if (wrongBtn) wrongBtn.addEventListener("click", () => { if (state && state.activeBoxIndex != null) judge_(state.activeBoxIndex, false); });
  }

  // Balasan dari Layar 2 (tombol ✅/❌ versi present.html) -- lihat
  // q9SendJudge_() di present.html untuk bentuk payload lengkapnya.
  function handleMessage(data) {
    if (!data || data.type !== "present_quiz9_judge") return;
    if (!state || state.activeBoxIndex !== data.boxIndex) return; // sudah tidak relevan (kotak lain / game sudah direset)
    judge_(data.boxIndex, !!data.correct);
  }

  window.GameOffline.register({ id: "kuis-9-kotak", label: "🧩 Kuis 9 Kotak", wireTab, handleMessage });
})();
