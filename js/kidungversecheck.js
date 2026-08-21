// ============================================================
//  🎵 CEK REFERENSI AYAT KIDUNG — sub-menu DI DALAM panel
//  "🔎 Verifikasi Bahasa Ayat" (lihat tombol yang ditambahkan di
//  renderLangCheckPanel(), js/langcheck.js), KHUSUS level di
//  CONFIG.KIDUNG_VERSE_REF_LEVELS (default: administrator saja).
//
//  Yang dikerjakan menu ini:
//   1) Ambil syair kidung yang TERSIMPAN DENGAN TANDA SUKU KATA
//      (mis. "Bi-a-sa se-la-lu ...", sesuai format Kidung__6_.xlsx),
//      lalu SAMBUNG jadi kata utuh ("Biasa selalu ...") -- lihat
//      dehyphenateKidungSyllables().
//   2) Pecah teks itu per BAIT (1 bait penuh), dan kalau 1 bait
//      terlalu panjang, dibagi maksimal 2 bagian (lihat
//      splitKidungTextForVerseCheck()) -- SESUAI permintaan: "isi
//      tulisan di syair kidung yang utuh lengkap atau maksimal 1
//      bait dibagi 2".
//   3) Untuk tiap potongan, TANYA AI (lewat AiChatSync.ask(), backend
//      Apps Script yang SAMA dengan AI Chat Gembala & tombol "🤖 Tanya
//      AI" di Verifikasi Bahasa Ayat -- lihat apps-script/AiChatCode.gs)
//      ayat Alkitab MANA yang PALING MENDEKATI maknanya (mis. "Markus
//      5:10"), lalu tampilkan hasilnya per potongan.
//
//  CATATAN PENTING: ini PERKIRAAN dari AI (bisa saja tidak ada ayat
//  yang benar-benar cocok, terutama untuk syair yang memang bukan
//  parafrase langsung dari 1 ayat tertentu) -- SELALU tandai ke
//  pengguna untuk diperiksa manual, jangan ditampilkan seolah 100%
//  pasti. Tidak ada apa pun di sini yang mengubah data Sheet Kidung
//  -- murni tampilan bantu di layar.
// ============================================================

function isKidungVerseRefAllowed() {
  if (typeof isAdministrator === "function" && isAdministrator()) return true;
  const allowed = (typeof CONFIG !== "undefined" && CONFIG.KIDUNG_VERSE_REF_LEVELS) || ["administrator"];
  return (typeof currentUserLevels !== "undefined" ? currentUserLevels : []).some((l) => allowed.includes(l));
}

// "Bi-a-sa se-la-lu" -> "Biasa selalu". Aturan: dalam format syair
// kidung ini, TIAP tanda "-" yang menempel langsung ke huruf di kedua
// sisinya adalah tanda pemenggalan suku kata (bukan tanda hubung
// beneran) -- jadi cukup dibuang semua "-" YANG ADA DI DALAM 1 kata
// (dipisah oleh spasi), tanpa menyentuh spasi/tanda baca lain.
function dehyphenateKidungSyllables(text) {
  return String(text || "")
    .split(/(\s+)/)
    .map((part) => (/\s/.test(part) ? part : part.replace(/-/g, "")))
    .join("");
}

// Pecah teks 1 bait (sudah disambung dehyphenateKidungSyllables) jadi
// maksimal 2 bagian kalau terlalu panjang, supaya tiap pertanyaan ke AI
// tetap fokus ke penggalan pendek (lebih akurat) -- bukan 1 bait penuh
// yang bisa menyinggung beberapa ayat sekaligus. Batasnya kira-kira
// setengah panjang kalau lebih dari ~70 karakter (baru dibelah di batas
// kata terdekat, bukan mutilasi tengah kata).
function splitKidungTextForVerseCheck(text) {
  const clean = text.trim();
  if (clean.length <= 70) return [clean];
  const mid = Math.floor(clean.length / 2);
  let splitAt = clean.indexOf(" ", mid);
  if (splitAt === -1) splitAt = clean.lastIndexOf(" ", mid);
  if (splitAt === -1) return [clean]; // 1 kata sangat panjang tanpa spasi -- jangan dipaksa dibelah
  return [clean.slice(0, splitAt).trim(), clean.slice(splitAt + 1).trim()].filter(Boolean);
}

// Susun daftar potongan { kidungLabel, label, text } dari SEMUA baris
// (bait & koor) 1 kidung, siap dicek satu-satu. `label` mis. "Bait 2" /
// "Bait 2 (bag. 2/2)" / "Koor". `kidungLabel` mis. "Kidung No. 095 —
// Judulnya" supaya kalau dicek banyak kidung sekaligus (rentang), hasil
// tabel tetap jelas ini baris siapa.
async function buildKidungVerseCheckChunks(buku, noKidung, kidungLabel) {
  const rows = (await LocalDB.getAllKidungRows().catch(() => [])).filter(
    (r) => r.buku === buku && String(r.noKidung) === String(noKidung)
  );
  rows.sort((a, b) => (a.urutan || 0) - (b.urutan || 0));

  const chunks = [];
  rows.forEach((r) => {
    const joined = dehyphenateKidungSyllables(r.teks);
    if (!joined) return;
    const baseLabel = r.jenis === "koor" ? "Koor" : "Bait " + (r.noBait || "?");
    const parts = splitKidungTextForVerseCheck(joined);
    parts.forEach((p, i) => {
      chunks.push({
        kidungLabel: kidungLabel || "",
        label: parts.length > 1 ? baseLabel + " (bag. " + (i + 1) + "/" + parts.length + ")" : baseLabel,
        text: p,
      });
    });
  });
  return chunks;
}

let _kidungVerseCheckState = { buku: "Kidung", dari: "", sampai: "", results: [] };

async function showKidungVerseRefPanel() {
  hideAllPanels();
  if (!el("kidungVerseRefPanel")) return;
  el("kidungVerseRefPanel").hidden = false;
  if (typeof logActivity === "function") logActivity("Cek Referensi Ayat Kidung (Admin)");
  await renderKidungVerseRefPanel();
}

async function renderKidungVerseRefPanel() {
  const container = el("kidungVerseRefPanel");
  if (!container) return;
  container.innerHTML = "";

  const back = kidungTopRowGeneric(() => showLangCheckPanel());
  container.appendChild(back);

  const title = document.createElement("h2");
  title.textContent = "🎵 Cek Referensi Ayat Kidung";
  container.appendChild(title);

  if (!isKidungVerseRefAllowed()) {
    const p = document.createElement("p");
    p.className = "media-empty";
    p.textContent = "Menu ini hanya untuk administrator (lihat CONFIG.KIDUNG_VERSE_REF_LEVELS di js/config.js).";
    container.appendChild(p);
    return;
  }

  const maxRange = (typeof CONFIG !== "undefined" && CONFIG.KIDUNG_VERSE_REF_MAX_RANGE) || 10;
  const info = document.createElement("p");
  info.className = "media-empty";
  info.innerHTML =
    "Pilih BUKU + rentang NOMOR kidung (boleh 1 nomor saja, isi \"Dari\" & \"Sampai\" sama) -- syairnya akan disambung " +
    "dari format suku kata (mis. <i>\"Bi-a-sa se-la-lu\"</i> → <i>\"Biasa selalu\"</i>), lalu tiap bait (maks. dibagi 2 " +
    "kalau panjang) ditanyakan ke AI: ayat Alkitab mana yang PALING MENDEKATI. Maksimal <b>" +
    maxRange +
    " kidung per rentang</b> sekali jalan (lihat CONFIG.KIDUNG_VERSE_REF_MAX_RANGE) supaya tidak terlalu lama/boros " +
    "kuota AI -- kalau butuh lebih, jalankan beberapa rentang berturut-turut. <b>Ini perkiraan AI, bukan kepastian</b> " +
    "-- selalu periksa manual sebelum dipakai resmi.";
  container.appendChild(info);

  const canAskAi =
    typeof AiChatSync !== "undefined" &&
    AiChatSync.enabled() &&
    typeof isAiChatAllowed === "function" &&
    isAiChatAllowed();
  if (!canAskAi) {
    const p = document.createElement("p");
    p.className = "media-empty";
    p.textContent = "Fitur ini butuh AI Chat aktif (lihat CONFIG.AI_CHAT_APPS_SCRIPT_URL & hak akses AI Chat Anda).";
    container.appendChild(p);
    return;
  }

  const controls = document.createElement("div");
  controls.className = "log-controls";
  container.appendChild(controls);

  const bukuSelect = document.createElement("select");
  bukuSelect.className = "columns-lang-select";
  const books = (await getKidungBooks().catch(() => [])) || ["Kidung"];
  books.forEach((b) => {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    bukuSelect.appendChild(opt);
  });
  bukuSelect.value = books.includes(_kidungVerseCheckState.buku) ? _kidungVerseCheckState.buku : books[0];

  // Info rentang nomor yang BENAR-BENAR ADA untuk buku terpilih (bukan
  // cuma "1 sampai 786" mentah -- ada nomor yang bolong di beberapa
  // buku, lihat rangeInfo di bawah), supaya admin tahu batas wajar
  // sebelum mengetik nomor.
  const rangeInfo = document.createElement("p");
  rangeInfo.className = "media-empty";
  controls.appendChild(rangeInfo);

  const dariInput = document.createElement("input");
  dariInput.type = "number";
  dariInput.min = "1";
  dariInput.className = "kidung-number-input";
  dariInput.placeholder = "Dari No.";
  const sampaiInput = document.createElement("input");
  sampaiInput.type = "number";
  sampaiInput.min = "1";
  sampaiInput.className = "kidung-number-input";
  sampaiInput.placeholder = "Sampai No.";

  let bukuNumbersCache = [];
  async function refillRangeForBuku() {
    const list = await getKidungList(bukuSelect.value).catch(() => []);
    bukuNumbersCache = list
      .map((k) => parseInt(k.noKidung, 10))
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b);
    if (bukuNumbersCache.length) {
      rangeInfo.textContent =
        `Buku "${bukuSelect.value}": ada ${bukuNumbersCache.length.toLocaleString("id-ID")} kidung, ` +
        `bernomor ${bukuNumbersCache[0]} sampai ${bukuNumbersCache[bukuNumbersCache.length - 1]} ` +
        `(nomor tidak selalu berurutan tanpa bolong -- yang dicek hanya nomor yang memang ada datanya).`;
      dariInput.value = _kidungVerseCheckState.dari || bukuNumbersCache[0];
      sampaiInput.value = _kidungVerseCheckState.sampai || bukuNumbersCache[0];
    } else {
      rangeInfo.textContent = `Buku "${bukuSelect.value}": belum ada data.`;
      dariInput.value = "";
      sampaiInput.value = "";
    }
  }
  await refillRangeForBuku();
  bukuSelect.addEventListener("change", refillRangeForBuku);

  const runBtn = document.createElement("button");
  runBtn.type = "button";
  runBtn.className = "chip-btn primary";
  runBtn.textContent = "🔍 Cek Referensi Ayat";

  const label1 = document.createElement("label");
  label1.textContent = "Buku: ";
  label1.appendChild(bukuSelect);
  const label2 = document.createElement("label");
  label2.textContent = "Dari No.: ";
  label2.appendChild(dariInput);
  const label3 = document.createElement("label");
  label3.textContent = "Sampai No.: ";
  label3.appendChild(sampaiInput);

  controls.appendChild(label1);
  controls.appendChild(label2);
  controls.appendChild(label3);
  controls.appendChild(runBtn);

  const statusMsg = document.createElement("p");
  statusMsg.className = "media-empty";
  container.appendChild(statusMsg);

  const resultsWrap = document.createElement("div");
  resultsWrap.id = "kidungVerseRefResultsWrap";
  resultsWrap.className = "log-table-wrap";
  container.appendChild(resultsWrap);

  if (_kidungVerseCheckState.results.length) {
    renderKidungVerseRefResults(resultsWrap, _kidungVerseCheckState.results);
  }

  runBtn.addEventListener("click", async () => {
    statusMsg.textContent = "";
    const dari = parseInt(dariInput.value, 10);
    const sampai = parseInt(sampaiInput.value, 10);
    if (isNaN(dari) || isNaN(sampai)) {
      statusMsg.textContent = "Isi dulu \"Dari No.\" dan \"Sampai No.\".";
      return;
    }
    const lo = Math.min(dari, sampai), hi = Math.max(dari, sampai);
    // Nomor yang BENAR-BENAR ADA datanya di rentang ini (lewati yang bolong).
    const targetNumbers = bukuNumbersCache.filter((n) => n >= lo && n <= hi);
    if (!targetNumbers.length) {
      statusMsg.textContent = `Tidak ada kidung bernomor ${lo}–${hi} di buku "${bukuSelect.value}".`;
      return;
    }
    const maxRange2 = (typeof CONFIG !== "undefined" && CONFIG.KIDUNG_VERSE_REF_MAX_RANGE) || 10;
    if (targetNumbers.length > maxRange2) {
      statusMsg.textContent =
        `Rentang ${lo}–${hi} berisi ${targetNumbers.length} kidung, melebihi batas ${maxRange2} per sekali jalan. ` +
        `Persempit rentangnya dulu (mis. jalankan beberapa kali berturut-turut).`;
      return;
    }
    _kidungVerseCheckState.buku = bukuSelect.value;
    _kidungVerseCheckState.dari = String(lo);
    _kidungVerseCheckState.sampai = String(hi);
    await runKidungVerseRefCheck(bukuSelect.value, targetNumbers, resultsWrap, statusMsg);
  });
}

async function runKidungVerseRefCheck(buku, noKidungList, resultsWrap, statusMsg) {
  // Ambil judul tiap kidung (buat label kolom "Kidung" di tabel hasil)
  // sekali saja lewat getKidungList(), lalu susun SEMUA potongan dari
  // SELURUH kidung dalam rentang jadi 1 antrean panjang.
  const listMeta = await getKidungList(buku).catch(() => []);
  const metaByNo = new Map(listMeta.map((k) => [String(k.noKidung), k]));

  let allChunks = [];
  for (const no of noKidungList) {
    const meta = metaByNo.get(String(no));
    const kidungLabel = formatKidungNo(buku, no) + (meta && meta.judul ? " — " + meta.judul : "");
    const chunks = await buildKidungVerseCheckChunks(buku, no, kidungLabel);
    allChunks = allChunks.concat(chunks);
  }

  if (!allChunks.length) {
    resultsWrap.innerHTML = `<p class="media-empty">Tidak ada syair untuk kidung-kidung ini.</p>`;
    return;
  }

  const results = allChunks.map((c) => ({ ...c, status: "menunggu", ref: "" }));
  _kidungVerseCheckState.results = results;
  renderKidungVerseRefResults(resultsWrap, results);

  for (let i = 0; i < results.length; i++) {
    if (statusMsg) statusMsg.textContent = `Memeriksa ${i + 1} dari ${results.length} bagian…`;
    results[i].status = "mencari…";
    renderKidungVerseRefResults(resultsWrap, results);
    try {
      const question =
        "Ini adalah penggalan syair sebuah kidung/nyanyian pujian Kristen (bukan ayat Alkitab, tapi mungkin " +
        "terinspirasi/parafrase dari 1 ayat tertentu):\n\n\"" +
        results[i].text +
        '"\n\nSebutkan SATU referensi ayat Alkitab (kitab, pasal, ayat, mis. "Markus 5:10") yang PALING MENDEKATI ' +
        "makna/kata-kata penggalan syair ini. Kalau tidak ada satupun ayat yang cukup dekat, jawab persis: " +
        '"Tidak ada ayat yang cukup mendekati". Jawab HANYA referensinya saja (atau kalimat itu), tanpa penjelasan lain.';
      const res = await AiChatSync.ask({
        username: currentUser,
        question,
        context: {},
        allowExternal: true,
        history: [],
      });
      results[i].status = "selesai";
      results[i].ref = res && res.ok ? res.answer.trim() : "Gagal: " + ((res && res.error) || "tidak diketahui");
    } catch (err) {
      results[i].status = "selesai";
      results[i].ref = "Gagal: " + String(err);
    }
    renderKidungVerseRefResults(resultsWrap, results);
  }
  if (statusMsg) statusMsg.textContent = `Selesai -- ${results.length} bagian diperiksa dari ${noKidungList.length} kidung.`;
}

function renderKidungVerseRefResults(wrap, results) {
  wrap.innerHTML = "";
  const table = document.createElement("table");
  table.className = "log-table";
  const showKidungCol = results.some((r) => r.kidungLabel);
  table.innerHTML =
    "<thead><tr>" +
    (showKidungCol ? "<th>Kidung</th>" : "") +
    "<th>Bagian</th><th>Syair (sudah disambung)</th><th>Referensi ayat perkiraan AI</th></tr></thead>" +
    "<tbody>" +
    results
      .map(
        (r) =>
          `<tr>${showKidungCol ? "<td>" + escapeHtml(r.kidungLabel) + "</td>" : ""}<td>${escapeHtml(r.label)}</td><td>${escapeHtml(r.text)}</td><td>${
            r.status === "selesai" ? escapeHtml(r.ref) : "<i>" + escapeHtml(r.status) + "</i>"
          }</td></tr>`
      )
      .join("") +
    "</tbody>";
  wrap.appendChild(table);

  const note = document.createElement("p");
  note.className = "media-empty";
  note.textContent = "⚠️ Perkiraan AI, bukan kepastian -- selalu periksa manual ke Alkitab sebelum dipakai resmi.";
  wrap.appendChild(note);
}

// Tombol "← Kembali" generik (sama gayanya dengan kidungTopRow() di
// js/kidung-ui.js, tapi tanpa bergantung ke state khusus Kidung karena
// panel ini bukan bagian dari showKidungPanel()).
function kidungTopRowGeneric(onBack) {
  const row = document.createElement("div");
  row.className = "kidung-top-row";
  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "chip-btn small";
  backBtn.textContent = "← Kembali";
  backBtn.addEventListener("click", onBack);
  row.appendChild(backBtn);
  return row;
}
