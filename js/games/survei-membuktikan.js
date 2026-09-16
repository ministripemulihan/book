// ============================================================
// 📊 Survei Membuktikan (Family 100) -- modul "Game Offline".
// VERSI MANUAL (16 Sep 2026) -- operator ketik sendiri 6 jawaban+poin
// per survei ke dalam bank (disiapkan jauh-jauh hari). Sistem
// pengumpulan survei ONLINE sungguhan (link publik, ketik-bebas jadi
// pilihan-ganda otomatis, dst -- "Bagian B") BELUM dikerjakan, lihat
// USULAN-SURVEI-ONLINE-BAGIAN-B.md -- rancangan itu MENUNGGU
// konfirmasi final & direncanakan proyek terpisah (SurveiCode.gs
// sendiri, TIDAK menyentuh Code.gs Alkitab). File ini murni permainan
// dengan bank yang diisi manual, sesuai urutan prioritas operator:
// "manual dulu" sebelum online.
//
// ------------------------------------------------------------
// SESI 1 -- Papan Utama (sama seperti sebelumnya + BARU: ronde/x2/200)
//
// 1. 1 survei = topik + 6 jawaban (label+poin, total poin <=100).
// 2. Operator pilih survei dari bank -> "🔔 X duluan"/"🔔 O duluan".
// 3. Kelompok Aktif menjawab lisan berkali-kali: cocok -> operator
//    klik kotak yang sesuai (poin masuk POT ronde); tidak cocok ->
//    klik "❌ Salah" (strike bertambah).
// 4. 3x salah -> giliran pindah ke LAWAN, 1x kesempatan "Curi Poin":
//    benar = SELURUH pot pindah ke pencuri; salah juga = pot tetap
//    milik kelompok yang kena 3 strike. Papan habis sebelum 3x salah
//    -> pot otomatis milik Kelompok Aktif.
// 5. BARU -- pot masuk skor total DIKALI pengali ronde: ronde ke-1,2,3
//    nilai normal (x1), ronde ke-4 dst nilai GANDA (x2, TIDAK naik
//    lagi jadi x3 dst -- tetap x2 sampai ada yang menang). Pengecekan
//    tembus 200 dilakukan di sini (finalizeRound_(), akhir ronde).
// 6. BARU -- begitu totalScores salah satu kelompok >= 200 di akhir
//    ronde -> `sesiSelesai=true`, kelompok itu & lawannya maju ber-2
//    orang (bukan tim) ke Sesi 2 (Babak Cepat). Tombol "🏁 Sesi Baru"
//    (BEDA dari "🔄 Reset Skor Acara" yang sudah ada) mereset nomor
//    ronde + skor + status sesi untuk acara BERIKUTNYA (bank survei
//    TIDAK ikut terhapus).
// 7. ↩️ Undo -- membatalkan 1 aksi terakhir, TERMASUK aksi yang
//    mengakhiri ronde (poin & status sesi ikut dikembalikan).
//
// ------------------------------------------------------------
// SESI 2 -- Babak Cepat / "Fast Money" (BARU total, 2 peserta individu)
//
// 1. Operator pilih 5 survei dari bank yang SAMA (checklist manual atau
//    "🎲 Acak 5") -- rancangan awal (Bagian B) membagi bank jadi 🎯/⚡
//    otomatis dari hasil survei online; karena versi ini manual, bank
//    cuma satu, jadi operator/1x klik acak yang memilih 5-nya.
// 2. Peserta 1 menjawab lisan 5 pertanyaan (waktu tampilan 20 detik/
//    pertanyaan, MURNI visual+bunyi di Layar 2 -- TIDAK mengunci panel
//    panitia sama sekali, panitia boleh ambil waktu berapa pun).
//    Panitia (Studio) yang mengklik jawaban survei yang cocok dari
//    daftar, atau "❌ Tidak ada di daftar" (0 poin).
// 3. Peserta 2 menjawab 5 pertanyaan YANG SAMA (waktu tampil 25 detik).
//    Jawaban yang sudah dipakai Peserta 1 OTOMATIS TERKUNCI (tidak
//    bisa diklik lagi) -- kalau Peserta 2 menjawab sama persis secara
//    lisan, panitia klik "❌ Tidak ada" (dianggap tidak sah).
// 4. Jawaban+poin Peserta 1 TERTUTUP di Layar 2 selama Peserta 2 main
//    -- baru dibuka SATU-SATU di akhir (fase "reveal") untuk efek
//    dramatis, lewat tombol "🔓 Buka Jawaban #N" berurutan.
// 5. Total gabungan kedua peserta >= 200 -> MENANG (juara acara).
//    Kalau kurang, skor tetap ditampilkan, tidak ada babak tambahan.
//
// Daftar KEMUNGKINAN JAWABAN tiap pertanyaan Babak Cepat TIDAK PERNAH
// dikirim ke Layar 2 sama sekali (beda dari Sesi 1 yang setidaknya
// kirim status revealed:true/false per kotak) -- karena di sini
// operator/panitia PERLU melihat daftar itu untuk mencocokkan jawaban
// lisan, jadi kalau ikut dikirim ke Layar 2, penonton yang duduk dekat
// proyektor Layar 2 fisik bisa mengintip. Pencocokan jawaban HANYA
// terjadi di panel Studio -- present.html untuk Babak Cepat murni
// tampilan (nama peserta, timer visual, status terjawab/tertutup) +
// bunyi timer, tidak ada tombol klik jawaban di sana sama sekali.
// ============================================================
(function () {
  const { el, rawPost, renderStudioPreview } = window.PSCore;

  const SURVEYS_KEY = "bible_app_survei_bank_v1";
  const SCORES_KEY = "bible_app_survei_scores_v1"; // sekarang menyimpan {X,O,roundNumber,sesiSelesai,finalWinnerSesi1}

  function other_(g) { return g === "X" ? "O" : "X"; }

  let surveys = [];
  let totalScores = { X: 0, O: 0 };
  let roundNumber = 0;       // BARU -- jumlah ronde Sesi 1 yang SUDAH DIMULAI acara ini
  let sesiSelesai = false;   // BARU -- true begitu ada yg tembus 200, sampai "🏁 Sesi Baru" ditekan
  let finalWinnerSesi1 = null; // BARU -- "X" | "O", siapa yg tembus 200 (maju ke Sesi 2 bareng lawannya)
  let round = null;
  let history = [];
  let editingId = null;
  let fastMoney = null;      // BARU -- null = belum masuk Babak Cepat, lihat startFastMoneySetup_() dst

  function multiplierForRound_(n) { return n >= 4 ? 2 : 1; } // BARU

  // ------------------------------------------------------------
  // Penyimpanan
  // ------------------------------------------------------------
  function loadSurveys_() {
    try { surveys = JSON.parse(localStorage.getItem(SURVEYS_KEY) || "[]"); } catch (e) { surveys = []; }
  }
  function saveSurveys_() {
    try { localStorage.setItem(SURVEYS_KEY, JSON.stringify(surveys)); } catch (e) {}
  }
  function loadScores_() {
    try {
      const saved = JSON.parse(localStorage.getItem(SCORES_KEY) || "null");
      totalScores = (saved && saved.X != null) ? { X: saved.X, O: saved.O } : { X: 0, O: 0 };
      roundNumber = (saved && saved.roundNumber) || 0;
      sesiSelesai = !!(saved && saved.sesiSelesai);
      finalWinnerSesi1 = (saved && saved.finalWinnerSesi1) || null;
    } catch (e) { totalScores = { X: 0, O: 0 }; roundNumber = 0; sesiSelesai = false; finalWinnerSesi1 = null; }
  }
  function saveScores_() {
    try { localStorage.setItem(SCORES_KEY, JSON.stringify({ X: totalScores.X, O: totalScores.O, roundNumber, sesiSelesai, finalWinnerSesi1 })); } catch (e) {}
  }

  // ------------------------------------------------------------
  // Form tambah/edit survei (TIDAK berubah dari versi sebelumnya)
  // ------------------------------------------------------------
  function readFormAnswers_() {
    const answers = [];
    for (let i = 1; i <= 6; i++) {
      const labelEl = el("psSurveiLabel" + i);
      const poinEl = el("psSurveiPoin" + i);
      answers.push({
        label: labelEl ? labelEl.value.trim() : "",
        poin: poinEl ? (parseInt(poinEl.value, 10) || 0) : 0,
      });
    }
    return answers;
  }

  function updateFormTotal_() {
    const totalEl = el("psSurveiFormTotal");
    if (!totalEl) return;
    const total = readFormAnswers_().reduce((sum, a) => sum + (a.poin || 0), 0);
    totalEl.textContent = "Total poin: " + total + " / 100";
    totalEl.style.color = total > 100 ? "#d13b3b" : "#2fae66";
    if (el("psSurveiAddBtn")) el("psSurveiAddBtn").disabled = total > 100;
  }

  function clearForm_() {
    editingId = null;
    if (el("psSurveiTopik")) el("psSurveiTopik").value = "";
    for (let i = 1; i <= 6; i++) {
      if (el("psSurveiLabel" + i)) el("psSurveiLabel" + i).value = "";
      if (el("psSurveiPoin" + i)) el("psSurveiPoin" + i).value = "";
    }
    if (el("psSurveiAddBtn")) el("psSurveiAddBtn").textContent = "+ Tambah ke Bank";
    updateFormTotal_();
  }

  function submitForm_() {
    const topik = el("psSurveiTopik") ? el("psSurveiTopik").value.trim() : "";
    if (!topik) { alert("Isi topik/pertanyaan survei dulu."); return; }
    const answersRaw = readFormAnswers_();
    if (answersRaw.some((a) => !a.label)) { alert("Isi ke-6 label jawaban dulu."); return; }
    const total = answersRaw.reduce((s, a) => s + a.poin, 0);
    if (total > 100) { alert("Total poin tidak boleh lebih dari 100 (sekarang: " + total + ")."); return; }
    const answers = answersRaw.slice().sort((a, b) => b.poin - a.poin);
    if (editingId != null) {
      const idx = surveys.findIndex((s) => s.id === editingId);
      if (idx !== -1) surveys[idx] = { id: editingId, topik, answers };
    } else {
      surveys.push({ id: Date.now() + Math.random(), topik, answers });
    }
    saveSurveys_();
    clearForm_();
    renderPanel_();
  }

  function editSurvey_(id) {
    const s = surveys.find((s) => s.id === id);
    if (!s) return;
    editingId = id;
    if (el("psSurveiTopik")) el("psSurveiTopik").value = s.topik;
    s.answers.forEach((a, i) => {
      if (el("psSurveiLabel" + (i + 1))) el("psSurveiLabel" + (i + 1)).value = a.label;
      if (el("psSurveiPoin" + (i + 1))) el("psSurveiPoin" + (i + 1)).value = a.poin;
    });
    if (el("psSurveiAddBtn")) el("psSurveiAddBtn").textContent = "💾 Simpan Perubahan";
    updateFormTotal_();
  }

  function deleteSurvey_(id) {
    if (!confirm("Hapus survei ini dari bank?")) return;
    surveys = surveys.filter((s) => s.id !== id);
    saveSurveys_();
    renderPanel_();
  }

  // ------------------------------------------------------------
  // Mesin ronde Sesi 1
  // ------------------------------------------------------------
  function snapshotBeforeChange_() {
    if (!round) return;
    history.push({
      round: JSON.parse(JSON.stringify(round)),
      totalScores: JSON.parse(JSON.stringify(totalScores)),
      roundNumber, sesiSelesai, finalWinnerSesi1, // BARU -- ikut di-undo kalau aksi ini yg mengakhiri ronde & sesi
    });
    if (history.length > 50) history.shift();
  }

  function startRound_(id) {
    if (sesiSelesai) { alert('Sesi 1 sudah selesai (ada yg tembus 200) -- tekan "🏁 Sesi Baru" dulu kalau mau main Sesi 1 lagi, atau lanjut ke Babak Cepat di bawah.'); return; }
    const s = surveys.find((s) => s.id === id);
    if (!s) return;
    roundNumber += 1; // BARU
    round = {
      surveyId: s.id,
      topik: s.topik,
      answers: s.answers.map((a) => ({ label: a.label, poin: a.poin, revealed: false })),
      pot: 0,
      controllingTeam: null,
      activeTeam: null,
      phase: "buzzer",
      strikes: 0,
      winner: null,
    };
    history = [];
    broadcast_();
  }

  function setBuzzer_(team) {
    if (!round || round.phase !== "buzzer") return;
    snapshotBeforeChange_();
    round.controllingTeam = team;
    round.activeTeam = team;
    round.phase = "playing";
    broadcast_();
  }

  function finalizeRound_() {
    round.phase = "roundOver";
    const mult = multiplierForRound_(roundNumber); // BARU
    round.multiplierApplied = mult;
    const gained = round.pot * mult;
    totalScores[round.winner] += gained;
    if (!sesiSelesai && totalScores[round.winner] >= 200) { // BARU
      sesiSelesai = true;
      finalWinnerSesi1 = round.winner;
    }
    saveScores_();
    broadcast_();
  }

  function revealBox_(idx) {
    if (!round || (round.phase !== "playing" && round.phase !== "stealing")) return;
    const box = round.answers[idx];
    if (!box || box.revealed) return;
    snapshotBeforeChange_();
    box.revealed = true;
    round.pot += box.poin;
    if (round.phase === "stealing") {
      round.winner = round.activeTeam;
      finalizeRound_();
      return;
    }
    if (round.answers.every((a) => a.revealed)) {
      round.winner = round.controllingTeam;
      finalizeRound_();
      return;
    }
    broadcast_();
  }

  function wrongAnswer_() {
    if (!round) return;
    if (round.phase === "playing") {
      snapshotBeforeChange_();
      round.strikes++;
      if (round.strikes >= 3) {
        round.phase = "stealing";
        round.activeTeam = other_(round.controllingTeam);
      }
      broadcast_();
      return;
    }
    if (round.phase === "stealing") {
      snapshotBeforeChange_();
      round.winner = round.controllingTeam;
      finalizeRound_();
      return;
    }
  }

  function undo_() {
    if (!history.length) return;
    const snap = history.pop();
    round = snap.round;
    totalScores = snap.totalScores;
    roundNumber = snap.roundNumber;         // BARU
    sesiSelesai = snap.sesiSelesai;         // BARU
    finalWinnerSesi1 = snap.finalWinnerSesi1; // BARU
    saveScores_();
    broadcast_();
  }

  function finishRoundReturn_() {
    round = null;
    history = [];
    rawPost({ type: "survei", action: "reset" });
    renderStudioPreview({ type: "survei" });
    renderPanel_();
  }

  function resetScores_() {
    if (!confirm("Reset skor total acara (X & O kembali ke 0)? Nomor ronde & status sesi TIDAK ikut direset (pakai \"🏁 Sesi Baru\" untuk itu). Tidak bisa dibatalkan.")) return;
    totalScores = { X: 0, O: 0 };
    saveScores_();
    renderPanel_();
    if (round) broadcast_();
  }

  // BARU -- reset PENUH untuk acara/sesi berikutnya: skor, nomor ronde,
  // status sesi, DAN Babak Cepat kalau sedang berjalan. Bank survei
  // (daftar topik+jawaban tersimpan) SENGAJA TIDAK ikut terhapus.
  function sesiBaru_() {
    if (!confirm('Mulai "Sesi Baru"? Skor total, nomor ronde, status Sesi 1/Babak Cepat semua direset ke awal (bank survei TIDAK terhapus). Tidak bisa dibatalkan.')) return;
    totalScores = { X: 0, O: 0 };
    roundNumber = 0;
    sesiSelesai = false;
    finalWinnerSesi1 = null;
    round = null;
    history = [];
    fastMoney = null;
    saveScores_();
    rawPost({ type: "survei", action: "reset" });
    renderStudioPreview({ type: "clear" });
    renderPanel_();
  }

  // ------------------------------------------------------------
  // BARU -- Sesi 2: Babak Cepat / "Fast Money"
  // ------------------------------------------------------------
  function pickRandom5_() {
    const pool = surveys.slice();
    const picked = [];
    while (pool.length && picked.length < 5) {
      const i = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(i, 1)[0]);
    }
    return picked.map((s) => s.id);
  }

  function startFastMoneySetup_() {
    if (surveys.length < 5) { alert("Bank survei minimal butuh 5 topik untuk Babak Cepat (sekarang: " + surveys.length + ")."); return; }
    fastMoney = { phase: "setup", pickedIds: pickRandom5_(), p1Name: "Peserta 1", p2Name: "Peserta 2" };
    renderPanel_();
  }

  function fmTogglePick_(id) {
    if (!fastMoney || fastMoney.phase !== "setup") return;
    const i = fastMoney.pickedIds.indexOf(id);
    if (i !== -1) fastMoney.pickedIds.splice(i, 1);
    else if (fastMoney.pickedIds.length < 5) fastMoney.pickedIds.push(id);
    renderPanel_();
  }

  function fmStartPlaying_() {
    if (!fastMoney || fastMoney.phase !== "setup") return;
    if (fastMoney.pickedIds.length !== 5) { alert("Pilih PERSIS 5 survei dulu (sekarang: " + fastMoney.pickedIds.length + ")."); return; }
    const questions = fastMoney.pickedIds.map((id) => surveys.find((s) => s.id === id)).filter(Boolean);
    if (questions.length !== 5) { alert("Ada survei yang terpilih tapi sudah tidak ada di bank -- ulangi pemilihan."); return; }
    const p1Name = (el("psFmP1Name") && el("psFmP1Name").value.trim()) || "Peserta 1";
    const p2Name = (el("psFmP2Name") && el("psFmP2Name").value.trim()) || "Peserta 2";
    fastMoney = {
      phase: "playing",
      questions, // [{id,topik,answers:[{label,poin}] x6}] x5, TIDAK PERNAH dikirim penuh ke Layar 2
      participants: [
        { name: p1Name, timeSeconds: 20, answers: Array(5).fill(null), total: 0 },
        { name: p2Name, timeSeconds: 25, answers: Array(5).fill(null), total: 0 },
      ],
      usedAnswerKeys: [], // ["qIdx:answerIdx", ...] dikunci Peserta 1, tidak bisa dipakai Peserta 2
      currentParticipant: 0,
      currentQ: 0,
      timerDeadline: null,
      revealCount: 0, // BARU -- berapa jawaban Peserta 1 yg sudah dibuka di fase "reveal"
    };
    fmStartTimerForCurrentQuestion_();
    broadcastFastMoney_();
  }

  function fmStartTimerForCurrentQuestion_() {
    if (!fastMoney) return;
    const p = fastMoney.participants[fastMoney.currentParticipant];
    fastMoney.timerDeadline = Date.now() + p.timeSeconds * 1000;
  }

  function fmRestartTimer_() {
    if (!fastMoney || fastMoney.phase !== "playing") return;
    fmStartTimerForCurrentQuestion_();
    broadcastFastMoney_();
  }

  // `answerIdx` = indeks jawaban (0-5) dari 6 opsi survei pertanyaan
  // ini yang dianggap panitia cocok dgn jawaban lisan peserta, ATAU
  // null kalau panitia klik "❌ Tidak ada di daftar" (0 poin, TIDAK
  // mengunci apa pun -- peserta 2 tetap boleh coba jawaban itu juga,
  // karena ini bukan jawaban yg SAH dipakai peserta 1).
  function fmAnswer_(answerIdx) {
    if (!fastMoney || fastMoney.phase !== "playing") return;
    const pIdx = fastMoney.currentParticipant;
    const p = fastMoney.participants[pIdx];
    const q = fastMoney.questions[fastMoney.currentQ];
    let entry;
    if (answerIdx == null) {
      entry = { label: null, poin: 0 };
    } else {
      const key = fastMoney.currentQ + ":" + answerIdx;
      if (pIdx === 1 && fastMoney.usedAnswerKeys.indexOf(key) !== -1) { alert("Jawaban ini sudah dipakai Peserta 1 -- kalau Peserta 2 menjawab sama persis, klik \"Tidak ada di daftar\"."); return; }
      const a = q.answers[answerIdx];
      entry = { label: a.label, poin: a.poin };
      if (pIdx === 0) fastMoney.usedAnswerKeys.push(key);
    }
    p.answers[fastMoney.currentQ] = entry;
    p.total += entry.poin;

    if (fastMoney.currentQ < 4) {
      fastMoney.currentQ += 1;
      fmStartTimerForCurrentQuestion_();
    } else if (pIdx === 0) {
      // Peserta 1 selesai 5 pertanyaan -> giliran Peserta 2.
      fastMoney.currentParticipant = 1;
      fastMoney.currentQ = 0;
      fmStartTimerForCurrentQuestion_();
    } else {
      // Peserta 2 selesai -> masuk fase buka jawaban Peserta 1 satu-satu.
      fastMoney.phase = "reveal";
      fastMoney.timerDeadline = null;
    }
    broadcastFastMoney_();
  }

  function fmRevealNext_() {
    if (!fastMoney || fastMoney.phase !== "reveal") return;
    if (fastMoney.revealCount >= 5) return;
    fastMoney.revealCount += 1;
    if (fastMoney.revealCount >= 5) fastMoney.phase = "done";
    broadcastFastMoney_();
  }

  function fmFinish_() {
    fastMoney = null;
    rawPost({ type: "survei", action: "reset" });
    renderStudioPreview({ type: "clear" });
    renderPanel_();
  }

  function broadcastFastMoney_() {
    rawPost({ type: "survei", action: "state", state: publicState_() });
    renderStudioPreview({ type: "survei" });
    renderPanel_();
  }

  // ------------------------------------------------------------
  // Broadcast ke Layar 2 -- label/poin kotak yang BELUM terbuka SENGAJA
  // tidak dikirim, begitu juga SELURUH daftar opsi jawaban Babak Cepat
  // (lihat catatan panjang di atas) -- supaya tidak ada yang bisa
  // mengintip lewat devtools/network tab di Layar 2.
  // ------------------------------------------------------------
  function publicFastMoney_() {
    if (!fastMoney) return null;
    return {
      phase: fastMoney.phase,
      p1Name: fastMoney.participants ? fastMoney.participants[0].name : (fastMoney.p1Name || ""),
      p2Name: fastMoney.participants ? fastMoney.participants[1].name : (fastMoney.p2Name || ""),
      currentParticipant: fastMoney.currentParticipant,
      currentQ: fastMoney.currentQ,
      timerDeadline: fastMoney.timerDeadline,
      timeSeconds: fastMoney.participants ? fastMoney.participants[fastMoney.currentParticipant].timeSeconds : null,
      topik: (fastMoney.phase === "playing" && fastMoney.questions) ? fastMoney.questions[fastMoney.currentQ].topik : null,
      // Peserta 2 -- tampil LANGSUNG begitu dijawab (khas Fast Money).
      p2Answers: fastMoney.participants ? fastMoney.participants[1].answers.map((a) => a ? { label: a.label, poin: a.poin } : null) : null,
      p2Total: fastMoney.participants ? fastMoney.participants[1].total : 0,
      p1Total: fastMoney.participants ? fastMoney.participants[0].total : 0,
      // Peserta 1 -- TERTUTUP sampai fase "reveal"/"done", dibuka
      // SATU-SATU sesuai `revealCount` (indeks < revealCount = terbuka).
      p1Answers: fastMoney.participants ? fastMoney.participants[0].answers.map((a, i) =>
        (fastMoney.revealCount > i && a) ? { label: a.label, poin: a.poin } : null
      ) : null,
      revealCount: fastMoney.revealCount || 0,
      grandTotal: fastMoney.phase === "done" ? (fastMoney.participants[0].total + fastMoney.participants[1].total) : null,
      won: fastMoney.phase === "done" ? ((fastMoney.participants[0].total + fastMoney.participants[1].total) >= 200) : null,
    };
  }

  function publicState_() {
    if (fastMoney) {
      return {
        mode: "fastmoney",
        totalScores,
        fastMoney: publicFastMoney_(),
      };
    }
    if (!round) return { mode: "idle" };
    return {
      mode: "sesi1",
      topik: round.topik,
      answers: round.answers.map((a) => a.revealed ? { label: a.label, poin: a.poin, revealed: true } : { revealed: false }),
      pot: round.pot,
      strikes: round.strikes,
      phase: round.phase,
      activeTeam: round.activeTeam,
      controllingTeam: round.controllingTeam,
      totalScores: totalScores,
      winner: round.winner,
      canUndo: history.length > 0,
      roundNumber,                         // BARU
      multiplier: multiplierForRound_(roundNumber), // BARU
      multiplierApplied: round.multiplierApplied || null, // BARU -- cuma terisi begitu phase "roundOver"
      sesiSelesai,                         // BARU
      finalWinnerSesi1,                    // BARU
    };
  }

  function broadcast_() {
    rawPost({ type: "survei", action: "state", state: publicState_() });
    renderStudioPreview({ type: "survei" });
    renderPanel_();
  }

  // ------------------------------------------------------------
  // Panel Studio
  // ------------------------------------------------------------
  function renderPanel_() {
    const bankListEl = el("psSurveiBankList");
    const roundAreaEl = el("psSurveiRoundArea");
    const formAreaEl = el("psSurveiFormArea");
    if (!bankListEl) return; // markup belum ada -- diam saja

    const scoreLineEl = el("psSurveiScoreLine");
    if (scoreLineEl) {
      const mult = multiplierForRound_(roundNumber);
      scoreLineEl.textContent = "Skor total acara -- X: " + totalScores.X + "  |  O: " + totalScores.O
        + (roundNumber > 0 ? `  |  Ronde ke-${roundNumber}${mult > 1 ? " (nilai x2)" : ""}  |  Target: 200` : "");
    }

    const sesiSelesaiBoxEl = el("psSurveiSesiSelesaiBox");
    if (sesiSelesaiBoxEl) {
      sesiSelesaiBoxEl.hidden = !sesiSelesai || !!fastMoney;
      if (sesiSelesai) sesiSelesaiBoxEl.textContent = `🎉 Kelompok ${finalWinnerSesi1} tembus 200! Panggil 2 orang (dari Kelompok ${finalWinnerSesi1} & Kelompok ${other_(finalWinnerSesi1)}) maju ke Babak Cepat di bawah.`;
    }

    // -------- Babak Cepat (Sesi 2) --------
    const fmAreaEl = el("psFmArea");
    if (fmAreaEl) fmAreaEl.hidden = !fastMoney;
    if (fastMoney) {
      if (formAreaEl) formAreaEl.hidden = true;
      if (roundAreaEl) roundAreaEl.hidden = true;
      renderFastMoneyPanel_();
      return;
    }

    if (!round) {
      if (formAreaEl) formAreaEl.hidden = false;
      if (roundAreaEl) roundAreaEl.hidden = true;
      bankListEl.innerHTML = "";
      if (!surveys.length) {
        bankListEl.innerHTML = '<div class="ps-pointer-hint">Belum ada survei di bank -- isi form di atas dulu.</div>';
      }
      surveys.forEach((s) => {
        const row = document.createElement("div");
        row.style.cssText = "display:flex; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,.08);";
        const total = s.answers.reduce((sum, a) => sum + a.poin, 0);
        row.innerHTML = `<div style="flex:1;"><b>${escapeHtml_(s.topik)}</b> <span class="ps-pointer-hint">(total ${total})</span></div>`;
        const playBtn = document.createElement("button");
        playBtn.type = "button"; playBtn.className = "chip-btn small"; playBtn.textContent = "▶️ Mainkan";
        playBtn.addEventListener("click", () => startRound_(s.id));
        const editBtn = document.createElement("button");
        editBtn.type = "button"; editBtn.className = "chip-btn small"; editBtn.textContent = "✏️ Edit";
        editBtn.addEventListener("click", () => editSurvey_(s.id));
        const delBtn = document.createElement("button");
        delBtn.type = "button"; delBtn.className = "chip-btn small"; delBtn.textContent = "🗑️";
        delBtn.addEventListener("click", () => deleteSurvey_(s.id));
        row.appendChild(playBtn); row.appendChild(editBtn); row.appendChild(delBtn);
        bankListEl.appendChild(row);
      });
      return;
    }

    if (formAreaEl) formAreaEl.hidden = true;
    if (roundAreaEl) roundAreaEl.hidden = false;

    const topikEl = el("psSurveiRoundTopik");
    if (topikEl) topikEl.textContent = round.topik;

    const buzzerWrap = el("psSurveiBuzzerWrap");
    if (buzzerWrap) buzzerWrap.hidden = round.phase !== "buzzer";

    const boardEl = el("psSurveiMiniBoard");
    if (boardEl) {
      boardEl.innerHTML = "";
      round.answers.forEach((a, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chip-btn small";
        btn.style.cssText = "padding:6px; font-size:12px; line-height:1.25;" + (a.revealed ? " background:rgba(47,174,102,.3);" : "");
        btn.textContent = a.revealed ? (a.label + " (" + a.poin + ")") : "Kotak " + (i + 1) + " (tertutup)";
        btn.disabled = a.revealed || (round.phase !== "playing" && round.phase !== "stealing");
        btn.addEventListener("click", () => revealBox_(i));
        boardEl.appendChild(btn);
      });
    }

    const potEl = el("psSurveiPotLine");
    if (potEl) {
      const mult = multiplierForRound_(roundNumber);
      potEl.textContent = "POT ronde ini: " + round.pot + (mult > 1 ? ` (akan dikali x2 = ${round.pot * 2} saat masuk skor total)` : "")
        + " | Strike: " + "❌".repeat(round.strikes) + "░".repeat(3 - round.strikes);
    }

    const turnEl = el("psSurveiTurnLine");
    if (turnEl) {
      if (round.phase === "buzzer") turnEl.textContent = "Menunggu siapa duluan...";
      else if (round.phase === "playing") turnEl.textContent = "Menjawab: Kelompok " + round.activeTeam;
      else if (round.phase === "stealing") turnEl.textContent = "🔁 KESEMPATAN MENCURI -- Kelompok " + round.activeTeam;
      else turnEl.textContent = "";
    }

    const wrongBtn = el("psSurveiWrongBtn");
    if (wrongBtn) wrongBtn.disabled = round.phase !== "playing" && round.phase !== "stealing";

    const undoBtn = el("psSurveiUndoBtn");
    if (undoBtn) undoBtn.disabled = !history.length;

    const winnerBox = el("psSurveiWinnerBox");
    const finishBtn = el("psSurveiFinishBtn");
    if (winnerBox) {
      if (round.phase === "roundOver") {
        winnerBox.hidden = false;
        const mult = round.multiplierApplied || 1;
        winnerBox.textContent = "🏆 Kelompok " + round.winner + " dapat pot ronde ini: +" + (round.pot * mult) + " poin!" + (mult > 1 ? ` (${round.pot} x2)` : "")
          + (sesiSelesai ? ` -- TEMBUS 200! Lanjut ke Babak Cepat di bawah.` : "");
        if (finishBtn) finishBtn.hidden = false;
      } else {
        winnerBox.hidden = true; winnerBox.textContent = "";
        if (finishBtn) finishBtn.hidden = true;
      }
    }
  }

  function renderFastMoneyPanel_() {
    const setupEl = el("psFmSetupArea");
    const playEl = el("psFmPlayArea");
    const revealEl = el("psFmRevealArea");
    if (!setupEl) return;

    setupEl.hidden = fastMoney.phase !== "setup";
    playEl.hidden = fastMoney.phase !== "playing";
    revealEl.hidden = (fastMoney.phase !== "reveal" && fastMoney.phase !== "done");

    if (fastMoney.phase === "setup") {
      const listEl = el("psFmPickList");
      if (listEl) {
        listEl.innerHTML = "";
        surveys.forEach((s) => {
          const row = document.createElement("label");
          row.style.cssText = "display:flex; align-items:center; gap:8px; padding:4px 0; cursor:pointer;";
          const chk = document.createElement("input");
          chk.type = "checkbox";
          chk.checked = fastMoney.pickedIds.indexOf(s.id) !== -1;
          chk.addEventListener("change", () => fmTogglePick_(s.id));
          row.appendChild(chk);
          const span = document.createElement("span");
          span.textContent = s.topik;
          row.appendChild(span);
          listEl.appendChild(row);
        });
      }
      if (el("psFmPickCount")) el("psFmPickCount").textContent = `Terpilih: ${fastMoney.pickedIds.length} / 5`;
      return;
    }

    if (fastMoney.phase === "playing") {
      const pIdx = fastMoney.currentParticipant;
      const p = fastMoney.participants[pIdx];
      const q = fastMoney.questions[fastMoney.currentQ];
      if (el("psFmPlayerLabel")) el("psFmPlayerLabel").textContent = `${p.name} -- Pertanyaan ${fastMoney.currentQ + 1} dari 5 (waktu tampil: ${p.timeSeconds} detik)`;
      if (el("psFmQuestionTopik")) el("psFmQuestionTopik").textContent = q.topik;
      const answersWrapEl = el("psFmAnswersWrap");
      if (answersWrapEl) {
        answersWrapEl.innerHTML = "";
        q.answers.forEach((a, i) => {
          const key = fastMoney.currentQ + ":" + i;
          const locked = pIdx === 1 && fastMoney.usedAnswerKeys.indexOf(key) !== -1;
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "chip-btn small";
          btn.style.cssText = "padding:6px; font-size:12px;" + (locked ? " opacity:.4;" : "");
          btn.textContent = a.label + " (" + a.poin + ")" + (locked ? " 🔒 dipakai Peserta 1" : "");
          btn.disabled = locked;
          btn.addEventListener("click", () => fmAnswer_(i));
          answersWrapEl.appendChild(btn);
        });
      }
      return;
    }

    // "reveal" / "done"
    const revealListEl = el("psFmRevealList");
    if (revealListEl) {
      revealListEl.innerHTML = "";
      fastMoney.participants[0].answers.forEach((a, i) => {
        const row = document.createElement("div");
        row.style.cssText = "display:flex; justify-content:space-between; gap:8px; padding:4px 0; border-bottom:1px solid rgba(255,255,255,.08);";
        const opened = fastMoney.revealCount > i;
        row.innerHTML = `<span>#${i + 1} ${opened ? escapeHtml_(a && a.label ? a.label : "(tidak ada)") : "🔒 tertutup"}</span><span>${opened ? (a ? a.poin : 0) : "?"}</span>`;
        revealListEl.appendChild(row);
      });
    }
    if (el("psFmRevealNextBtn")) el("psFmRevealNextBtn").disabled = fastMoney.phase !== "reveal" || fastMoney.revealCount >= 5;
    if (el("psFmP2Summary")) {
      el("psFmP2Summary").textContent = `${fastMoney.participants[1].name}: ${fastMoney.participants[1].total} poin (sudah tampil semua)`;
    }
    const doneBoxEl = el("psFmDoneBox");
    if (doneBoxEl) {
      if (fastMoney.phase === "done") {
        const total = fastMoney.participants[0].total + fastMoney.participants[1].total;
        doneBoxEl.hidden = false;
        doneBoxEl.textContent = (total >= 200 ? "🏆 MENANG! " : "Belum tembus 200. ") + `Total gabungan: ${total} poin.`;
      } else {
        doneBoxEl.hidden = true;
      }
    }
  }

  function escapeHtml_(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function wireTab() {
    const addBtn = el("psSurveiAddBtn");
    if (!addBtn) return; // markup belum ada -- diam saja

    loadSurveys_();
    loadScores_();

    addBtn.addEventListener("click", submitForm_);
    for (let i = 1; i <= 6; i++) {
      if (el("psSurveiPoin" + i)) el("psSurveiPoin" + i).addEventListener("input", updateFormTotal_);
    }
    if (el("psSurveiCancelEditBtn")) el("psSurveiCancelEditBtn").addEventListener("click", clearForm_);

    if (el("psSurveiBuzzerX")) el("psSurveiBuzzerX").addEventListener("click", () => setBuzzer_("X"));
    if (el("psSurveiBuzzerO")) el("psSurveiBuzzerO").addEventListener("click", () => setBuzzer_("O"));
    if (el("psSurveiWrongBtn")) el("psSurveiWrongBtn").addEventListener("click", wrongAnswer_);
    if (el("psSurveiUndoBtn")) el("psSurveiUndoBtn").addEventListener("click", undo_);
    if (el("psSurveiFinishBtn")) el("psSurveiFinishBtn").addEventListener("click", finishRoundReturn_);
    if (el("psSurveiResetScoreBtn")) el("psSurveiResetScoreBtn").addEventListener("click", resetScores_);
    if (el("psSurveiSesiBaruBtn")) el("psSurveiSesiBaruBtn").addEventListener("click", sesiBaru_); // BARU

    // BARU -- Babak Cepat
    if (el("psFmStartSetupBtn")) el("psFmStartSetupBtn").addEventListener("click", startFastMoneySetup_);
    if (el("psFmRerollBtn")) el("psFmRerollBtn").addEventListener("click", () => { if (fastMoney) { fastMoney.pickedIds = pickRandom5_(); renderPanel_(); } });
    if (el("psFmStartPlayBtn")) el("psFmStartPlayBtn").addEventListener("click", fmStartPlaying_);
    if (el("psFmNotFoundBtn")) el("psFmNotFoundBtn").addEventListener("click", () => fmAnswer_(null));
    if (el("psFmRestartTimerBtn")) el("psFmRestartTimerBtn").addEventListener("click", fmRestartTimer_);
    if (el("psFmRevealNextBtn")) el("psFmRevealNextBtn").addEventListener("click", fmRevealNext_);
    if (el("psFmFinishBtn")) el("psFmFinishBtn").addEventListener("click", fmFinish_);
    if (el("psFmCancelSetupBtn")) el("psFmCancelSetupBtn").addEventListener("click", () => { fastMoney = null; renderPanel_(); });

    updateFormTotal_();
    renderPanel_();
  }

  // Balasan dari Layar 2 -- HANYA dipakai Sesi 1 (kotak/❌/↩️). Babak
  // Cepat SENGAJA tidak punya jalur balik dari Layar 2 sama sekali
  // (lihat catatan panjang di atas kenapa).
  function handleMessage(data) {
    if (!data || data.type !== "present_survei_action") return;
    if (!round) return;
    if (data.action === "reveal" && typeof data.boxIndex === "number") revealBox_(data.boxIndex);
    else if (data.action === "wrong") wrongAnswer_();
    else if (data.action === "undo") undo_();
  }

  window.GameOffline.register({ id: "survei-membuktikan", label: "📊 Survei Membuktikan", wireTab, handleMessage });
})();
