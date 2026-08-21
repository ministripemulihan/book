// ============================================================
//  🤖 AI CHAT GEMBALA — panel BARU, khusus level administrator/
//  penatua/gembala distrik/gembala (lihat CONFIG.AI_CHAT_LEVELS).
//
//  Cara kerja singkat:
//   1) Pertanyaan gembala dipakai untuk MENCARI ayat & catatan yang
//      relevan dari data Alkitab yang SUDAH tersimpan lokal di
//      perangkat (pakai fungsi pencarian yang sama dengan kotak cari
//      utama, js/app.js -> runKeywordSearch()).
//   2) Ayat/catatan yang ketemu itu dikirim sebagai "konteks" ke
//      backend (apps-script/AiChatCode.gs), BUKAN seluruh Alkitab.
//   3) Backend memberi instruksi ke AI: jawab HANYA dari konteks itu,
//      KECUALI kalau tombol "🌐 Izinkan referensi luar" dinyalakan.
//   4) Jawaban tampil di layar dengan tombol salin untuk pertanyaan
//      maupun jawaban.
//
//  🕘 RIWAYAT AI CHAT (BARU, khusus pengguna "premium" -- lihat kolom
//  "Tipe" di Sheet Pengguna & isPremiumUser() di js/levels.js):
//   - Menu ⋮ di dalam panel AI Chat sekarang punya tab TAMBAHAN
//     "🕘 Riwayat" (HANYA muncul untuk pengguna premium) yang menampilkan
//     daftar pertanyaan & jawaban AI sebelumnya, LENGKAP dengan
//     referensi/sumber yang dipakai tiap jawaban -- disimpan di Sheet
//     BARU & TERPISAH ("AiChatHistory", dibuat otomatis oleh
//     apps-script/AiChatCode.gs di Spreadsheet yang sama tempat skrip
//     itu terpasang), BUKAN di Sheet Alkitab maupun Sheet Pengguna.
//   - Tombol "🆕 Percakapan Baru" mengosongkan layar percakapan yang
//     sedang tampil (mulai sesi/SessionID baru) -- riwayat LAMA yang
//     sudah tersimpan TIDAK terhapus, cuma layar depannya yang bersih,
//     supaya orang yang tidak ingin percakapannya "menumpuk" di satu
//     sesi panjang bisa mulai dari nol kapan saja.
//   - Pengguna BUKAN premium: percakapannya tetap berjalan normal
//     seperti biasa, HANYA saja tidak ada yang tersimpan ke Sheet
//     Riwayat sama sekali (tidak ada tab "Riwayat", tidak ada
//     permintaan simpan dikirim ke server) -- percakapan hilang begitu
//     panel ditutup/dimuat ulang, persis seperti sebelum fitur ini ada.
// ============================================================

const AiChatSync = {
  enabled() {
    return !!(CONFIG.AI_CHAT_APPS_SCRIPT_URL && CONFIG.AI_CHAT_APPS_SCRIPT_URL.indexOf("http") === 0);
  },
  async ask({ username, displayName, saudara, question, context, allowExternal, history }) {
    const res = await fetch(CONFIG.AI_CHAT_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      // displayName/saudara -- BARU, dipakai backend supaya AI Chat
      // menyapa pengguna dengan nama aslinya ("Saudara"/"Saudari {Nama}")
      // alih-alih selalu "Gembala", lihat AiChatCode.gs.
      body: JSON.stringify({ type: "ai_chat", username, displayName, saudara, question, context, allowExternal, history }),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  },
  // Simpan SATU giliran tanya-jawab (+ sumber) ke Sheet Riwayat -- HANYA
  // berpengaruh kalau pengguna ini "premium" (dicek ULANG di server,
  // lihat isPremiumUser_() di apps-script/AiChatCode.gs); dipanggil
  // "fire-and-forget" (lihat handleAiChatAsk() di bawah) supaya gagal
  // simpan tidak pernah mengganggu jawaban yang sudah tampil di layar.
  async saveHistory({ username, sessionId, question, answer, sources }) {
    const res = await fetch(CONFIG.AI_CHAT_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ type: "ai_chat_save", username, sessionId, question, answer, sources }),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  },
  // Ambil seluruh riwayat (dikelompokkan per sesi) milik pengguna ini.
  async getHistory({ username }) {
    const res = await fetch(CONFIG.AI_CHAT_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ type: "ai_chat_history", username }),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  },
};

// Nomor sesi percakapan BARU (dipakai untuk mengelompokkan giliran
// tanya-jawab yang tersimpan ke Riwayat -- lihat AiChatSync.saveHistory()
// di atas & startNewAiChat() di bawah). Formatnya sengaja tidak perlu unik
// sekali secara global, cukup unik per perangkat/waktu.
function genAiChatSessionId() {
  return "sesi_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
}

function isAiChatAllowed() {
  const allowed = CONFIG.AI_CHAT_LEVELS || CONFIG.CURHAT_GEMBALA_LEVELS || [];
  return (currentUserLevels || []).some((l) => allowed.includes(l));
}

// Pisah pertanyaan jadi kata kunci (buang kata sambung pendek yang umum
// dalam Bahasa Indonesia supaya pencarian tidak "kebanjiran" hasil yang
// tidak relevan), lalu cari ayat & catatan yang cocok dengan tiap kata
// kunci memakai mesin pencari yang SAMA dengan kotak cari utama aplikasi.
const AI_CHAT_STOPWORDS = new Set([
  "yang", "dan", "atau", "di", "ke", "dari", "untuk", "dengan", "apa", "apa itu",
  "bagaimana", "kenapa", "mengapa", "adalah", "itu", "ini", "saya", "aku", "kita",
  "tentang", "bisa", "boleh", "tolong", "coba", "jelaskan", "apakah", "dalam", "pada",
  "seperti", "juga", "akan", "sudah", "belum", "tidak", "bukan", "kalau", "jika",
]);

function extractAiChatKeywords(question) {
  return question
    .toLowerCase()
    .replace(/[?.,!;:"'()]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !AI_CHAT_STOPWORDS.has(w))
    .slice(0, 6); // maksimal 6 kata kunci supaya tidak terlalu banyak panggilan pencarian
}

// ------------------------------------------------------------
//  📌 POKOK KITAB & 📋 GARIS BESAR sebagai sumber tambahan AI Chat
// ------------------------------------------------------------
//  Selain ayat & catatan (lihat gatherAiChatContext() di bawah), AI Chat
//  sekarang juga bisa memakai data "Pokok Kitab" & "Garis Besar" yang
//  sudah ada di aplikasi (js/outlines.js -- dua sheet TERPISAH, lihat
//  catatan di file itu), supaya bisa menjawab pertanyaan seperti "apa
//  pokok kitab Roma?" atau menampilkan SEMUA isi Pokok Kitab kalau
//  ditanya secara umum "tampilkan pokok alkitab".
// ------------------------------------------------------------

// Frasa PERSIS "pokok alkitab" (tanpa nama kitab tertentu di pertanyaan)
// -> jawaban langsung menampilkan SEMUA isi Pokok Kitab APA ADANYA, tanpa
// lewat Gemini sama sekali, supaya dijamin lengkap & tidak diringkas/
// dipotong oleh AI. Trigger yang lebih longgar (AI_CHAT_POKOK_TRIGGER) di
// bawah dipakai untuk kasus lain (mis. "garis besar kitab Roma") yang
// tetap dijawab lewat Gemini dengan data ini sebagai konteks tambahan.
const AI_CHAT_SHOW_ALL_POKOK_TRIGGER = /\bpokok\s*alkitab\b/i;
const AI_CHAT_POKOK_TRIGGER = /\bpokok\s*(alkitab|kitab)?\b|\bgaris\s*besar\b|\boutline\b/i;

// Coba temukan SATU kitab yang disebut di pertanyaan, pakai indeks alias
// yang sama dengan kotak cari referensi (lihat BOOK_ALIAS_INDEX di
// js/books.js). Dicoba kombinasi 2 kata dulu (utk alias spt "1 samuel",
// "kidung agung"), baru 1 kata. Alias super pendek (<3 huruf) sengaja
// DILEWATI supaya tidak salah tangkap kata sehari-hari yang kebetulan
// mirip (mis. "di", "ul", "ml").
function detectBookInQuestion(question) {
  const q = (question || "").toLowerCase().replace(/[?.,!;:"'()]/g, " ");
  const tokens = q.split(/\s+/).filter(Boolean);
  for (let i = 0; i < tokens.length - 1; i++) {
    const two = (tokens[i] + " " + tokens[i + 1]).trim();
    if (BOOK_ALIAS_INDEX[two]) return BOOK_ALIAS_INDEX[two];
  }
  for (let i = 0; i < tokens.length; i++) {
    const one = tokens[i];
    if (one.length < 3) continue;
    if (BOOK_ALIAS_INDEX[one]) return BOOK_ALIAS_INDEX[one];
  }
  return null;
}

// Ambil Pokok Kitab dari SEMUA kitab yang sudah terisi (sama datanya
// dengan panel "📌 Pokok Alkitab — Semua Kitab" di menu sidebar).
async function getAllPokokRows() {
  const rows = await Promise.all(
    BOOKS.map((b) =>
      getPokokKitabFor(b.num, currentLang)
        .then((pokok) => ({ bookName: b.name, testament: b.testament, pokok }))
        .catch(() => ({ bookName: b.name, testament: b.testament, pokok: null }))
    )
  );
  return rows.filter((r) => r.pokok);
}

// Format daftar Pokok Kitab semua kitab jadi teks rapi (dikelompokkan
// Perjanjian Lama / Perjanjian Baru) -- dipakai untuk jawaban LANGSUNG
// (bypass Gemini) saat pertanyaannya persis "pokok alkitab".
function formatAllPokokAsText(rows) {
  const fmtGroup = (list) => list.map((r) => `📌 ${r.bookName}\n${r.pokok}`).join("\n\n");
  const pl = rows.filter((r) => r.testament === "PL");
  const pb = rows.filter((r) => r.testament === "PB");
  const parts = [];
  if (pl.length) parts.push("PERJANJIAN LAMA\n\n" + fmtGroup(pl));
  if (pb.length) parts.push("PERJANJIAN BARU\n\n" + fmtGroup(pb));
  return parts.join("\n\n");
}

// Kumpulkan konteks Pokok Kitab / Garis Besar yang relevan dgn pertanyaan
// (dipakai untuk dikirim ke Gemini sbg konteks tambahan, BUKAN untuk
// jalur bypass "tampilkan pokok alkitab" di atas):
//  - Kalau pertanyaan menyebut satu kitab TERTENTU -> ambil Pokok Kitab +
//    Garis Besar KHUSUS kitab itu saja (lebih fokus & rinci).
//  - Kalau pertanyaan menyinggung "pokok"/"garis besar"/"outline" secara
//    umum TANPA nama kitab tertentu -> lampirkan Pokok Kitab semua kitab
//    sbg konteks tambahan (mis. pertanyaan "apa saja pokok-pokok penting
//    di alkitab tentang kasih").
async function gatherAiChatOutlineContext(question) {
  const book = detectBookInQuestion(question);
  const result = { bookPokok: null, allPokok: [] };

  if (book) {
    try {
      const [pokok, garisBesar] = await Promise.all([
        getPokokKitabFor(book.num, currentLang),
        getOutlineForBook(book.num, currentLang),
      ]);
      if (pokok || (garisBesar && garisBesar.length)) {
        result.bookPokok = {
          bookName: book.name,
          pokok: pokok || null,
          garisBesar: (garisBesar || []).slice(0, 60).map((e) => ({
            ref: outlineRangeLabel(book.name, e),
            ringkasan: e.ringkasan,
          })),
        };
      }
    } catch (e) { /* pokok/garis besar opsional -- kalau gagal, AI tetap jalan tanpanya */ }
    return result; // sudah dapat kitabnya -> tidak perlu tambahan daftar semua kitab
  }

  if (AI_CHAT_POKOK_TRIGGER.test(question || "")) {
    try {
      result.allPokok = await getAllPokokRows();
    } catch (e) { /* sama seperti di atas */ }
  }
  return result;
}

// Ubah context.bookPokok / context.allPokok jadi daftar "sumber" utk
// ditampilkan di bawah jawaban AI (tombol "📖 N sumber yang dipakai"),
// format sama dgn sumber ayat/catatan supaya tampilannya konsisten.
function outlineContextAsSources(context) {
  const out = [];
  // kind: "outline" -> dari Pokok Kitab / Garis Besar Ayat (bukan catatan
  // kaki di kolom Note, bukan juga ayat langsung) -- sheet TERPISAH,
  // lihat js/outlines.js.
  if (context.bookPokok) {
    if (context.bookPokok.pokok) {
      out.push({ kind: "outline", ref: "📌 Pokok Kitab " + context.bookPokok.bookName, text: context.bookPokok.pokok });
    }
    (context.bookPokok.garisBesar || []).forEach((g) => {
      out.push({ kind: "outline", ref: "📋 " + g.ref, text: g.ringkasan });
    });
  }
  (context.allPokok || []).forEach((r) => {
    out.push({ kind: "outline", ref: "📌 Pokok Kitab " + r.bookName, text: r.pokok });
  });
  return out;
}

// ------------------------------------------------------------
// 📚 PENGETAHUAN TAMBAHAN AI CHAT -- istilah/kategori/topik Alkitab
// yang TIDAK bisa ditemukan lewat pencarian kata kunci biasa (mis.
// "jantung alkitab" TIDAK PERNAH muncul harfiah di teks ayat mana pun
// -- itu SEBUTAN yang perlu "diketahui" duluan, bukan dicari).
//
// DUA sumber, digabung (bawaan dulu, lalu tambahan dari Sheet kalau
// ada):
//   1) AI_KNOWLEDGE_BUILTIN di bawah -- sudah berisi persis apa yang
//      diminta (Perjanjian Baru, Jantung Alkitab, Kitab Taurat, Kitab
//      tentang Wahyu, Baptisan, Pemecahan Roti). Aktif LANGSUNG, tidak
//      perlu setup apa pun.
//   2) CONFIG.AI_KNOWLEDGE_CSV_URL (js/config.js) -- OPSIONAL, Google
//      Sheet TERPISAH kalau suatu saat mau menambah istilah/topik baru
//      TANPA perlu ubah kode ini lagi -- cukup tambah baris di Sheet-
//      nya. Lihat komentar di config.js untuk format kolomnya.
// ------------------------------------------------------------
const AI_KNOWLEDGE_BUILTIN = [
  {
    terms: ["perjanjian baru", "kitab perjanjian baru", "pb (perjanjian baru)"],
    // Dihitung otomatis dari data kitab yang sudah ada (semua kitab
    // testament "PB") -- BUKAN daftar tetap, supaya kalau kelak ada
    // penyesuaian di js/books.js, ini otomatis ikut benar.
    books: () => BOOKS.filter((b) => b.testament === "PB").map((b) => b.name),
    note: "Perjanjian Baru mencakup semua kitab mulai dari Matius sampai Wahyu.",
  },
  {
    terms: ["jantung alkitab", "empat kitab jantung alkitab"],
    books: ["Galatia", "Efesus", "Filipi", "Kolose"],
    note: 'Sebutan "Jantung Alkitab" merujuk khusus pada 4 kitab: Galatia, Efesus, Filipi, dan Kolose.',
  },
  {
    terms: ["kitab taurat", "taurat", "pentateukh", "lima kitab musa", "hukum taurat"],
    books: ["Kejadian", "Keluaran", "Imamat", "Bilangan", "Ulangan"],
    note: "Kitab Taurat (Pentateukh / Lima Kitab Musa) terdiri dari: Kejadian, Keluaran, Imamat, Bilangan, dan Ulangan.",
  },
  {
    terms: ["kitab tentang wahyu", "kitab-kitab wahyu", "nubuatan wahyu"],
    books: ["Wahyu", "Daniel", "Matius", "1 Korintus", "2 Korintus", "Hagai", "Yehezkiel", "Yesaya", "Yeremia"],
    note: 'Kitab utama tentang wahyu adalah Wahyu itu sendiri. Kitab Daniel, Matius, 1 & 2 Korintus, Hagai, Yehezkiel, Yesaya, dan Yeremia juga sering dikaitkan karena sama-sama berisi nubuatan/wahyu.',
  },
  {
    terms: ["baptisan", "dibaptis", "pembaptisan"],
    // CATATAN: "Matius 3:15" persis seperti diminta -- kalau maksudnya
    // baptisan Tuhan Yesus sendiri, ayat yang lebih tepat biasanya
    // Matius 3:13-17 (bukan 3:15, yang bicara tentang orang banyak yang
    // datang dibaptis Yohanes). Silakan koreksi lewat Sheet tambahan
    // (lihat CONFIG.AI_KNOWLEDGE_CSV_URL) kalau perlu -- baris di Sheet
    // akan ditambahkan berdampingan dengan baris bawaan ini.
    verseRefs: ["Markus 16:16", "Yohanes 3:5", "Yohanes 3:15", "Matius 3:15", "Kisah Para Rasul 8:26-40"],
    note: "Kisah Para Rasul 8:26-40 adalah kisah sida-sida Etiopia dibaptis oleh Filipus.",
  },
  {
    terms: ["pemecahan roti", "perjamuan kudus", "perjamuan tuhan"],
    books: ["Matius", "1 Korintus", "2 Korintus"],
  },
];

const AI_KNOWLEDGE_CACHE_KEY = "bible_app_ai_knowledge_v1";

function loadAiKnowledgeFromCache() {
  try {
    const raw = localStorage.getItem(AI_KNOWLEDGE_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function saveAiKnowledgeToCache(rows) {
  try {
    localStorage.setItem(AI_KNOWLEDGE_CACHE_KEY, JSON.stringify({ rows, fetchedAt: new Date().toISOString() }));
  } catch (e) { /* localStorage penuh -- diabaikan, tetap jalan tanpa cache */ }
}

// Sheet TAMBAHAN (opsional) -- format kolom (nama longgar, lihat
// findFieldLoose di js/outlines.js):
//   Istilah        -- kata/frasa pemicu, boleh >1 alias dipisah "|"
//   Kitab Terkait  -- daftar nama kitab dipisah koma
//   Ayat Terkait   -- daftar referensi ayat dipisah koma (mis.
//                     "Markus 16:16, Yohanes 3:5") -- teks lengkapnya
//                     dicari OTOMATIS dari data Alkitab yang sudah ada,
//                     bukan disalin manual
//   Keterangan     -- penjelasan bebas (opsional)
async function fetchAiKnowledgeSheet() {
  const url = CONFIG.AI_KNOWLEDGE_CSV_URL;
  if (!url || !url.trim()) return [];
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Gagal mengambil Pengetahuan AI Chat (" + res.status + ")");
  const records = parseCSV(await res.text());
  return records.map((r) => ({
    terms: rowStr(r, ["istilah", "term", "alias"]).split("|").map((s) => s.trim().toLowerCase()).filter(Boolean),
    books: rowStr(r, ["kitab terkait", "kitab-kitab terkait", "kitabterkait", "books"]).split(",").map((s) => s.trim()).filter(Boolean),
    verseRefs: rowStr(r, ["ayat terkait", "ayat-ayat terkait", "ayatterkait", "verses"]).split(",").map((s) => s.trim()).filter(Boolean),
    note: rowStr(r, ["keterangan", "catatan", "note", "penjelasan"]),
  })).filter((r) => r.terms.length);
}

let _aiKnowledgeRowsPromise = null;
// Digabung: bawaan (AI_KNOWLEDGE_BUILTIN) DULU, baru tambahan dari Sheet
// (kalau CONFIG.AI_KNOWLEDGE_CSV_URL diisi) -- di-cache 24 jam supaya
// tidak fetch Sheet berulang tiap kali tanya (gagal fetch -> pakai cache
// lama kalau ada, atau bawaan saja kalau belum pernah berhasil sekali
// pun -- AI Chat tetap jalan normal).
async function getAiKnowledgeRows() {
  const builtin = AI_KNOWLEDGE_BUILTIN.map((r) => ({
    terms: r.terms.map((t) => t.toLowerCase()),
    books: typeof r.books === "function" ? r.books() : (r.books || []),
    verseRefs: r.verseRefs || [],
    note: r.note || "",
  }));
  if (!CONFIG.AI_KNOWLEDGE_CSV_URL || !CONFIG.AI_KNOWLEDGE_CSV_URL.trim()) return builtin;

  if (_aiKnowledgeRowsPromise) return _aiKnowledgeRowsPromise;
  _aiKnowledgeRowsPromise = (async () => {
    const cached = loadAiKnowledgeFromCache();
    const isFresh = cached && cached.fetchedAt && (Date.now() - new Date(cached.fetchedAt).getTime() < 24 * 60 * 60 * 1000);
    if (isFresh) return builtin.concat(cached.rows);
    try {
      const rows = await fetchAiKnowledgeSheet();
      saveAiKnowledgeToCache(rows);
      return builtin.concat(rows);
    } catch (e) {
      return builtin.concat((cached && cached.rows) || []);
    }
  })();
  return _aiKnowledgeRowsPromise;
}

// Cari baris yang istilahnya cocok (substring, tidak peka huruf
// besar/kecil) dengan pertanyaan.
function matchAiKnowledgeRows(question, rows) {
  const q = (question || "").toLowerCase();
  return rows.filter((r) => r.terms.some((t) => t && q.includes(t)));
}

// Ubah baris yang cocok jadi teks konteks utk Gemini + daftar "sumber"
// utk ditampilkan di bawah jawaban (tombol "📖 N sumber yang dipakai").
// Ayat terkait DICARI teks lengkapnya dari data Alkitab yang sudah ada
// di perangkat (lewat parseReference() & getChapterVerses(), sama
// dengan mesin kotak cari referensi utama) -- supaya AI mengutip ayat
// yang BENAR-BENAR akurat, bukan menghafal/mengarang sendiri.
function aiKnowledgeRowsToContext(matchedRows) {
  const lines = [];
  const sources = [];
  // kind: "knowledge" -> dari "kumpulan catatan/pengetahuan AI" yang
  // sudah disiapkan di dalam aplikasi (AI_KNOWLEDGE_BUILTIN + Sheet
  // tambahan CONFIG.AI_KNOWLEDGE_CSV_URL kalau diisi) -- BUKAN dari
  // kolom Note Sheet Alkitab, dan BUKAN jawaban bebas AI dari luar.
  matchedRows.forEach((r) => {
    const label = r.terms[0];
    if (r.books && r.books.length) {
      lines.push(`- Istilah "${label}" merujuk pada kitab: ${r.books.join(", ")}.`);
      sources.push({ kind: "knowledge", ref: "📚 " + label, text: "Kitab terkait: " + r.books.join(", ") });
    }
    if (r.note) {
      lines.push(`- Keterangan "${label}": ${r.note}`);
    }
    (r.verseRefs || []).forEach((refText) => {
      const parsed = typeof parseReference === "function" ? parseReference(refText) : null;
      if (!parsed || !bookAvailableInLang(currentLang, parsed.book.num)) {
        lines.push(`- Ayat terkait "${label}": ${refText}`);
        return;
      }
      const chVerses = getChapterVerses(currentLang, parsed.book.num, parsed.chapter);
      const vStart = parsed.verseStart || 1;
      const vEnd = parsed.verseEnd || vStart;
      const matched = parsed.verseStart ? chVerses.filter((v) => v.verse >= vStart && v.verse <= vEnd) : chVerses;
      matched.forEach((v) => {
        const ref = `${v.bookName || parsed.book.name} ${v.chapter}:${v.verse}`;
        lines.push(`- (${ref}) ${v.text}`);
        sources.push({ kind: "knowledge", ref, text: v.text });
      });
    });
  });
  return {
    contextText: lines.length ? "PENGETAHUAN TAMBAHAN (istilah/topik Alkitab):\n" + lines.join("\n") : "",
    sources,
  };
}

async function gatherAiChatContext(question) {
  const keywords = extractAiChatKeywords(question);

  const seenVerse = new Set();
  const seenNote = new Set();
  const verses = [];
  const notes = [];

  keywords.forEach((kw) => {
    if (verses.length >= 10 && notes.length >= 6) return;
    const { verseResults, noteResults } = runKeywordSearch(kw, currentLang || "__all__", "both", "__all__", "normal");
    verseResults.forEach((v) => {
      if (verses.length >= 10) return;
      const key = v.lang + "_" + v.id;
      if (seenVerse.has(key)) return;
      seenVerse.add(key);
      const book = BOOKS.find((b) => b.num === v.bookNumber);
      // kind: "verse" -> ditandai di daftar sumber sebagai kutipan ayat
      // Alkitab langsung (BUKAN catatan kaki/penjelasan tambahan).
      verses.push({ kind: "verse", ref: `${v.bookName || (book ? book.name : "")} ${v.chapter}:${v.verse}`, text: v.text });
    });
    noteResults.forEach((n) => {
      if (notes.length >= 6) return;
      if (seenNote.has(n.verseId)) return;
      seenNote.add(n.verseId);
      const ref = n.verse ? `${n.verse.bookName} ${n.verse.chapter}:${n.verse.verse}` : n.verseId;
      // kind: "note" -> ditandai sebagai catatan kaki (kolom Note di Sheet
      // Alkitab) supaya pembaca tahu ini PENJELASAN TAMBAHAN pada ayat
      // itu, bukan teks ayatnya sendiri.
      notes.push({ kind: "note", ref, text: n.note });
    });
  });

  const outline = await gatherAiChatOutlineContext(question);

  // 📚 Pengetahuan tambahan (istilah/kategori & topik -- lihat blok di
  // atas) -- dicocokkan TERPISAH dari pencarian kata kunci biasa, karena
  // istilah seperti "jantung alkitab" TIDAK muncul secara harfiah di
  // teks ayat mana pun (jadi tidak akan pernah ketemu lewat
  // runKeywordSearch di atas).
  let knowledgeContext = "";
  let knowledgeSources = [];
  try {
    const knowledgeRows = await getAiKnowledgeRows();
    const matched = matchAiKnowledgeRows(question, knowledgeRows);
    if (matched.length) {
      const built = aiKnowledgeRowsToContext(matched);
      knowledgeContext = built.contextText;
      knowledgeSources = built.sources;
    }
  } catch (e) { /* opsional -- AI tetap jalan tanpanya kalau gagal (mis. Sheet belum diisi) */ }

  // 🎵 Kidung/Nyanyian Pujian -- BARU, dicari lewat searchKidungFull()
  // yang SUDAH ADA di js/kidung.js (kotak cari kidung biasa memakainya
  // juga), supaya AI Chat bisa ikut menjawab pertanyaan seputar syair
  // kidung/pujian & MENYEBUT nomornya (mis. "Kidung No. 095" atau
  // "Suplemen No. 12"), bukan cuma ayat Alkitab. Query dipakai UTUH
  // (bukan per-kata seperti runKeywordSearch ayat) karena judul/potongan
  // syair biasanya berupa frasa, bukan 1 kata kunci lepas.
  let kidung = [];
  let kidungSources = [];
  try {
    if (typeof searchKidungFull === "function") {
      const { matches } = await searchKidungFull(question);
      matches.slice(0, 5).forEach((m) => {
        const noText = (typeof formatKidungNo === "function") ? formatKidungNo(m.buku, m.noKidung) : m.noKidung;
        const ref = `${m.buku} No. ${noText}${m.judul ? " - " + m.judul : ""}`;
        const cuplikan = m.matchExcerpt ? `${m.matchExcerpt.label}: "${m.matchExcerpt.snippet}"` : (m.judul || "");
        kidung.push({ kind: "kidung", ref, text: cuplikan });
        kidungSources.push({ kind: "kidung", ref, text: cuplikan });
      });
    }
  } catch (e) { /* opsional -- AI tetap jalan tanpanya kalau data Kidung belum disinkron */ }

  return {
    verses, notes,
    bookPokok: outline.bookPokok, allPokok: outline.allPokok,
    knowledgeContext, knowledgeSources,
    kidung, kidungSources,
  };
}

const _aiChatState = {
  allowExternal: false,
  history: [],
  busy: false,
  // "chat" = layar percakapan biasa, "history" = tab "🕘 Riwayat" (khusus
  // premium, lihat renderAiChatHistoryView() di bawah).
  view: "chat",
  sessionId: genAiChatSessionId(),
  // Cache hasil AiChatSync.getHistory() supaya tidak fetch ulang tiap kali
  // berpindah tab bolak-balik di panel yang sama -- dikosongkan lagi
  // (null) setiap kali panel AI Chat ditutup & dibuka ulang (lihat
  // showAiChatPanel()), supaya riwayat baru tetap ikut kebaca.
  historySessions: null,
  historyLoading: false,
  historyError: "",
};

// Mulai percakapan BARU: mengosongkan layar yang tampil & memakai
// SessionID baru untuk giliran tanya-jawab berikutnya (lihat komentar
// besar di atas file ini). Riwayat LAMA yang sudah tersimpan ke Sheet
// (khusus pengguna premium) TIDAK ikut terhapus -- tetap bisa dibuka
// lagi lewat tab "🕘 Riwayat".
function startNewAiChat() {
  if (_aiChatState.busy) return;
  _aiChatState.history = [];
  _aiChatState.sessionId = genAiChatSessionId();
  _aiChatState.view = "chat";
  renderAiChatPanel();
}

// ------------------------------------------------------------
//  Format gaya WhatsApp untuk teks chat (dipakai untuk balon AI
//  MAUPUN balon pengguna, supaya konsisten):
//    *tebal*        -> <strong>tebal</strong>
//    _miring_       -> <em>miring</em>
//    ~coret~        -> <s>coret</s>
//  Emoji/ikon (📖 🙏 ❤️ dst) TIDAK perlu diproses apa-apa -- itu karakter
//  unicode biasa, otomatis tampil apa adanya begitu di-escape ke HTML.
//  Teks di-escape ke HTML DULU (escapeHtml, fungsi umum di js/app.js)
//  sebelum tanda *_~ diubah jadi tag, supaya tetap aman dari suntikan
//  HTML asing (mis. kalau pertanyaan/jawaban kebetulan mengandung "<").
//  Aturan tanda pembuka TIDAK boleh langsung diikuti spasi (sama seperti
//  aturan asli WhatsApp) supaya "3 * 4 = 12" tidak ikut kepotong jadi tebal.
// ------------------------------------------------------------
function formatChatText(text) {
  let out = escapeHtml(text || "");
  out = out.replace(/\*([^\s*][^*]*?)\*/g, "<strong>$1</strong>");
  out = out.replace(/_([^\s_][^_]*?)_/g, "<em>$1</em>");
  out = out.replace(/~([^\s~][^~]*?)~/g, "<s>$1</s>");
  return out.replace(/\n/g, "<br>");
}

// Tinggi kotak tulis pertanyaan mengikuti panjang teks secara otomatis
// (seperti kotak chat WhatsApp) -- dikembalikan dulu ke "auto" supaya
// scrollHeight terhitung ulang dari nol, baru dibatasi ke max-height
// yang sama dengan yang diset di CSS (.ai-chat-input-row textarea).
function autoGrowAiChatTextarea(textarea) {
  textarea.style.height = "auto";
  const max = 160;
  textarea.style.height = Math.min(textarea.scrollHeight, max) + "px";
}

// ------------------------------------------------------------
// 🕘 TAB "RIWAYAT" (khusus premium): daftar pertanyaan & jawaban AI
// sebelumnya, dikelompokkan per sesi percakapan (sesi TERBARU di
// paling atas), lengkap dengan referensi/sumber tiap jawaban -- data
// diambil dari Sheet "AiChatHistory" lewat AiChatSync.getHistory().
// Read-only (tidak bisa melanjutkan percakapan lama dari sini) --
// untuk bertanya lagi, pindah ke tab "💬 Percakapan" atau tekan
// "🆕 Percakapan Baru".
// ------------------------------------------------------------
async function renderAiChatHistoryView(container) {
  const wrap = document.createElement("div");
  wrap.className = "ai-chat-history-view";
  container.appendChild(wrap);

  if (_aiChatState.historySessions === null && !_aiChatState.historyLoading) {
    _aiChatState.historyLoading = true;
    _aiChatState.historyError = "";
    AiChatSync.getHistory({ username: currentUser })
      .then((data) => {
        if (!data || !data.ok) throw new Error((data && data.error) || "Gagal mengambil riwayat");
        _aiChatState.historySessions = data.sessions || [];
      })
      .catch((err) => {
        _aiChatState.historySessions = [];
        _aiChatState.historyError = String(err.message || err);
      })
      .finally(() => {
        _aiChatState.historyLoading = false;
        // Hanya gambar ulang kalau tab "Riwayat" masih yang sedang dibuka
        // (pengguna mungkin sudah pindah tab lagi sebelum data ini datang).
        if (_aiChatState.view === "history") renderAiChatPanel();
      });
  }

  if (_aiChatState.historyLoading || _aiChatState.historySessions === null) {
    wrap.innerHTML = `<p class="media-empty">🕘 Memuat riwayat percakapan…</p>`;
    return;
  }

  if (_aiChatState.historyError) {
    wrap.innerHTML = `<p class="media-empty">⚠️ ${escapeHtml(_aiChatState.historyError)}</p>`;
    return;
  }

  const sessions = _aiChatState.historySessions;
  if (!sessions.length) {
    wrap.innerHTML = `<p class="media-empty">Belum ada riwayat percakapan tersimpan. Riwayat akan otomatis tersimpan di sini setiap kali Anda bertanya di tab "💬 Percakapan".</p>`;
    return;
  }

  const SOURCE_KIND_LABEL = AI_CHAT_SOURCE_KIND_LABEL;
  sessions.forEach((session) => {
    const box = document.createElement("details");
    box.className = "ai-chat-history-session";
    const waktu = session.lastWaktu ? formatHistoryDate_(session.lastWaktu) : "";
    box.innerHTML = `<summary>🕘 ${escapeHtml(waktu)} — ${session.turns.length} pertanyaan</summary>`;
    const turnsWrap = document.createElement("div");
    turnsWrap.className = "ai-chat-history-turns";
    session.turns.forEach((turn) => {
      const t = document.createElement("div");
      t.className = "ai-chat-history-turn";
      t.innerHTML = `
        <div class="ai-chat-history-q"><strong>🙋 Pertanyaan:</strong> ${formatChatText(turn.question)}</div>
        <div class="ai-chat-history-a"><strong>🤖 Jawaban:</strong> ${formatChatText(turn.answer)}</div>
        ${turn.sources && turn.sources.length ? `
          <details class="ai-chat-sources">
            <summary>📖 ${turn.sources.length} sumber yang dipakai</summary>
            <ul>${turn.sources.map((s) => `<li><span class="ai-chat-source-kind">${escapeHtml(SOURCE_KIND_LABEL[s.kind] || "📎 Sumber")}</span><br><strong>${escapeHtml(s.ref)}</strong> — ${escapeHtml(s.text)}</li>`).join("")}</ul>
          </details>
        ` : ""}
      `;
      turnsWrap.appendChild(t);
    });
    box.appendChild(turnsWrap);
    wrap.appendChild(box);
  });
}

// Format tanggal/waktu ISO dari Sheet jadi teks yang lebih enak dibaca,
// mengikuti format tanggal/waktu Indonesia. Kalau gagal parse (mis. isi
// sel tidak terduga), tampilkan apa adanya supaya tidak error di layar.
function formatHistoryDate_(isoOrDate) {
  try {
    const d = new Date(isoOrDate);
    if (isNaN(d.getTime())) return String(isoOrDate);
    return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return String(isoOrDate);
  }
}

async function showAiChatPanel() {
  hideAllPanels();
  el("aiChatPanel").hidden = false;
  logActivity("AI Chat Gembala");
  // Riwayat mungkin sudah bertambah sejak terakhir panel ini dibuka (mis.
  // dibuka dari perangkat lain) -- kosongkan cache supaya tab "🕘 Riwayat"
  // fetch ulang dari server saat dibuka, bukan menampilkan data basi.
  _aiChatState.historySessions = null;
  _aiChatState.historyError = "";
  renderAiChatPanel();
}

function renderAiChatPanel() {
  const container = el("aiChatPanel");
  container.innerHTML = "";

  const titleRow = document.createElement("div");
  titleRow.className = "ai-chat-title-row";
  titleRow.innerHTML = `<h2 style="margin:0;">🤖 AI Chat Gembala</h2>`;
  container.appendChild(titleRow);

  if (!isAiChatAllowed()) {
    const p = document.createElement("p");
    p.className = "media-empty";
    p.textContent = "Menu ini hanya untuk level administrator/penatua/gembala distrik/gembala.";
    container.appendChild(p);
    return;
  }
  if (!AiChatSync.enabled()) {
    const p = document.createElement("p");
    p.className = "media-empty";
    p.textContent = "Fitur ini belum diaktifkan. Isi dulu CONFIG.AI_CHAT_APPS_SCRIPT_URL di js/config.js (lihat cara pasang di apps-script/AiChatCode.gs).";
    container.appendChild(p);
    return;
  }

  // Tombol "🆕 Percakapan Baru" -- untuk SEMUA pengguna yang boleh buka AI
  // Chat (bukan cuma premium): mengosongkan layar percakapan yang sedang
  // tampil supaya bisa mulai dari nol kapan saja. Untuk pengguna premium
  // ini juga memisahkan giliran tanya-jawab berikutnya ke SessionID baru
  // di Riwayat (lihat startNewAiChat()).
  const newChatBtn = document.createElement("button");
  newChatBtn.type = "button";
  newChatBtn.className = "chip-btn small ai-chat-newchat-btn";
  newChatBtn.textContent = "🆕 Percakapan Baru";
  newChatBtn.title = "Mulai percakapan baru (layar dikosongkan)";
  newChatBtn.addEventListener("click", startNewAiChat);
  titleRow.appendChild(newChatBtn);

  // Tab "🕘 Riwayat" -- HANYA muncul untuk pengguna "premium" (kolom
  // "Tipe" di Sheet Pengguna, lihat isPremiumUser() di js/levels.js).
  // Pengguna biasa tidak pernah melihat tab ini sama sekali, dan
  // percakapannya memang tidak pernah disimpan ke Sheet Riwayat (lihat
  // handleAiChatAsk() di bawah).
  if (isPremiumUser()) {
    const tabs = document.createElement("div");
    tabs.className = "curhat-tabs ai-chat-tabs";
    const chatTab = document.createElement("button");
    chatTab.type = "button";
    chatTab.className = "chip-btn" + (_aiChatState.view === "chat" ? " active" : "");
    chatTab.textContent = "💬 Percakapan";
    chatTab.addEventListener("click", () => { _aiChatState.view = "chat"; renderAiChatPanel(); });
    tabs.appendChild(chatTab);

    const historyTab = document.createElement("button");
    historyTab.type = "button";
    historyTab.className = "chip-btn" + (_aiChatState.view === "history" ? " active" : "");
    historyTab.textContent = "🕘 Riwayat";
    historyTab.addEventListener("click", () => { _aiChatState.view = "history"; renderAiChatPanel(); });
    tabs.appendChild(historyTab);

    container.appendChild(tabs);
  }

  if (_aiChatState.view === "history" && isPremiumUser()) {
    renderAiChatHistoryView(container);
    return;
  }

  const intro = document.createElement("p");
  intro.className = "media-empty";
  intro.textContent = "Bertanya seputar ayat/kebenaran firman. Sumber jawaban diambil dari ayat, catatan, Pokok Kitab & Garis Besar di aplikasi ini terlebih dahulu. Ketik \"pokok alkitab\" untuk langsung menampilkan semua isi Pokok Kitab yang ada.";
  container.appendChild(intro);

  const toggleRow = document.createElement("label");
  toggleRow.className = "curhat-public-toggle ai-chat-toggle";
  toggleRow.innerHTML = `<input type="checkbox" id="aiChatExternalToggle" ${_aiChatState.allowExternal ? "checked" : ""} /> 🌐 Izinkan AI memakai referensi dari luar Alkitab/catatan aplikasi (mis. sejarah, budaya)`;
  container.appendChild(toggleRow);
  toggleRow.querySelector("input").addEventListener("change", (e) => {
    _aiChatState.allowExternal = e.target.checked;
  });

  const thread = document.createElement("div");
  thread.className = "ai-chat-thread";
  thread.id = "aiChatThread";
  container.appendChild(thread);
  renderAiChatThread(thread);

  const form = document.createElement("form");
  // Ditempel di bawah (position: sticky, lihat css/style.css) supaya di
  // HP tombol "Tanya" & kotak tulisnya selalu kelihatan tanpa perlu
  // menggulir ke bawah dulu -- sama seperti aplikasi chat pada umumnya.
  form.className = "ai-chat-input-row";
  // Tombol kirim: HANYA ikon ("logo enter"/kirim, ⏎), bukan lagi tombol
  // teks "📤 Tanya" -- lebih minim & ringkas, terutama di HP (lihat
  // .ai-chat-send-btn di css/style.css). Teks "Tanya" dipindah jadi
  // title/aria-label saja (tetap terbaca pembaca layar), tidak hilang
  // fungsinya, cuma tidak lagi makan tempat di layar.
  form.innerHTML = `
    <textarea id="aiChatInput" rows="1" placeholder="Tulis pertanyaan Anda, mis. 'Apa kata Alkitab tentang menghadapi kekhawatiran?'" required></textarea>
    <button type="submit" class="ai-chat-send-btn" id="aiChatSendBtn" title="Kirim pertanyaan (Tanya)" aria-label="Kirim pertanyaan">⏎</button>
  `;
  container.appendChild(form);

  const inputEl = form.querySelector("#aiChatInput");
  // Kotak tulis membesar otomatis mengikuti panjang pertanyaan (lihat
  // autoGrowAiChatTextarea() di atas), supaya nyaman dipakai mengetik
  // pertanyaan panjang di HP -- tidak lagi terpaku 2 baris kecil.
  inputEl.addEventListener("input", () => autoGrowAiChatTextarea(inputEl));
  // Enter = kirim, Shift+Enter = baris baru (kebiasaan umum aplikasi
  // chat). Di HP, tombol "Tanya" tetap ada sebagai cara utama mengirim.
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (_aiChatState.busy) return;
    const textarea = el("aiChatInput");
    const question = textarea.value.trim();
    if (!question) return;
    textarea.value = "";
    autoGrowAiChatTextarea(textarea);
    await handleAiChatAsk(question);
  });
}

// Label sumber di bawah jawaban AI, supaya pembaca langsung tahu asal
// tiap referensi (lihat "kind" yang ditandai saat sumber dikumpulkan di
// gatherAiChatContext()/aiKnowledgeRowsToContext()/
// outlineContextAsSources() di atas). Dipakai bersama oleh
// renderAiChatThread() (percakapan yang sedang berjalan) DAN
// renderAiChatHistoryView() (tab "🕘 Riwayat", khusus premium).
const AI_CHAT_SOURCE_KIND_LABEL = {
  verse: "📖 Kutipan ayat",
  note: "📝 Catatan kaki (kolom Note Sheet Alkitab)",
  outline: "📋 Pokok Kitab / Garis Besar",
  knowledge: "🤖 Referensi tambahan (kumpulan catatan AI yang di-inject)",
};

function renderAiChatThread(thread) {
  thread.innerHTML = "";
  if (!_aiChatState.history.length) {
    thread.innerHTML = `<p class="media-empty">Belum ada percakapan. Mulai dengan mengetik pertanyaan di bawah.</p>`;
    return;
  }
  const SOURCE_KIND_LABEL = AI_CHAT_SOURCE_KIND_LABEL;

  _aiChatState.history.forEach((turn, idx) => {
    const bubble = document.createElement("div");
    bubble.className = "ai-chat-bubble ai-chat-bubble-" + (turn.role === "ai" ? "ai" : "user");
    // Nama pengguna yang login ditampilkan langsung (bukan "🙋 Anda" yang
    // generik) supaya lebih enak dibaca, terutama kalau riwayat percakapan
    // ini kelak dilihat orang lain (mis. administrator).
    const label = turn.role === "ai" ? "🤖 AI" : "🙋 " + (currentUserDisplay || currentUser || "Anda");
    // Tombol "📋 Salin" sengaja dipasang DUA KALI pada balasan AI (atas &
    // bawah): jawaban AI kadang panjang, dan di HP tombol yang cuma ada
    // di atas jadi sulit dijangkau setelah membaca sampai bawah (harus
    // gulir balik ke atas dulu). Tombol bawah HANYA untuk balasan AI
    // (bukan bubble pertanyaan pengguna sendiri, yang biasanya pendek dan
    // tombol atasnya sudah cukup) supaya tidak mubazir/berulang.
    const isAi = turn.role === "ai";
    bubble.innerHTML = `
      <div class="ai-chat-bubble-head">
        <span>${label}</span>
        <button type="button" class="chip-btn small ai-chat-copy-btn" data-idx="${idx}" data-pos="top">📋 Salin</button>
      </div>
      <div class="ai-chat-bubble-text">${formatChatText(turn.text)}</div>
      ${turn.sources && turn.sources.length ? `
        <details class="ai-chat-sources">
          <summary>📖 ${turn.sources.length} sumber yang dipakai</summary>
          <ul>${turn.sources.map((s) => `<li><span class="ai-chat-source-kind">${escapeHtml(SOURCE_KIND_LABEL[s.kind] || "📎 Sumber")}</span><br><strong>${escapeHtml(s.ref)}</strong> — ${escapeHtml(s.text)}</li>`).join("")}</ul>
        </details>
      ` : ""}
      ${isAi ? `
        <div class="ai-chat-bubble-foot">
          <button type="button" class="chip-btn small ai-chat-copy-btn" data-idx="${idx}" data-pos="bottom">📋 Salin Jawaban</button>
        </div>
      ` : ""}
    `;
    const wireCopyBtn = (btn) => {
      btn.addEventListener("click", () => {
        navigator.clipboard.writeText(turn.text).then(() => {
          const old = btn.textContent;
          btn.textContent = "✅ Tersalin";
          setTimeout(() => { btn.textContent = old; }, 1200);
        }).catch(() => alert("Gagal menyalin. Salin manual dari layar."));
      });
    };
    bubble.querySelectorAll(".ai-chat-copy-btn").forEach(wireCopyBtn);
    thread.appendChild(bubble);
  });
  thread.scrollTop = thread.scrollHeight;
}

// Simpan giliran tanya-jawab ini ke Riwayat -- HANYA kalau pengguna
// sedang login berstatus premium (isPremiumUser(), lihat js/levels.js).
// Dipanggil TANPA di-`await` di handleAiChatAsk() ("fire-and-forget"):
// jawaban sudah tampil ke pengguna terlepas berhasil/gagalnya
// penyimpanan ini, supaya koneksi lambat/gagal saat menyimpan riwayat
// TIDAK PERNAH membuat jawaban yang sudah didapat terasa "nge-hang".
function maybeSaveAiChatTurn(question, aiTurn) {
  if (!isPremiumUser() || !AiChatSync.enabled()) return;
  AiChatSync.saveHistory({
    username: currentUser,
    sessionId: _aiChatState.sessionId,
    question,
    answer: aiTurn.text,
    sources: aiTurn.sources || [],
  }).catch((err) => {
    console.warn("Gagal menyimpan riwayat AI Chat:", err);
  });
}

async function handleAiChatAsk(question) {
  _aiChatState.busy = true;
  _aiChatState.history.push({ role: "user", text: question });
  const thread = el("aiChatThread");
  renderAiChatThread(thread);
  const loading = document.createElement("p");
  loading.className = "media-empty ai-chat-loading";
  loading.textContent = "🤖 Mencari ayat/catatan terkait & menyusun jawaban…";
  thread.appendChild(loading);

  const sendBtn = el("aiChatSendBtn");
  if (sendBtn) sendBtn.disabled = true;

  try {
    // Kasus khusus: pertanyaan literal minta "pokok alkitab" (tanpa
    // menyebut satu kitab tertentu) -> langsung tampilkan SEMUA isi
    // Pokok Kitab yang ada APA ADANYA, TANPA lewat Gemini sama sekali,
    // supaya dijamin lengkap & tidak diringkas/dipotong oleh AI. Datanya
    // sama persis dengan panel "📌 Pokok Alkitab — Semua Kitab" di menu.
    if (AI_CHAT_SHOW_ALL_POKOK_TRIGGER.test(question) && !detectBookInQuestion(question)) {
      const rows = await getAllPokokRows();
      let aiTurn;
      if (!rows.length) {
        aiTurn = {
          role: "ai",
          text: "Belum ada isi Pokok Kitab sama sekali (sheet Pokok Kitab masih kosong / belum disinkron).",
        };
      } else {
        aiTurn = {
          role: "ai",
          text: formatAllPokokAsText(rows),
          sources: rows.map((r) => ({ kind: "outline", ref: "📌 Pokok Kitab " + r.bookName, text: r.pokok })),
        };
      }
      _aiChatState.history.push(aiTurn);
      maybeSaveAiChatTurn(question, aiTurn);
      return; // tidak perlu memanggil Gemini sama sekali untuk kasus ini
    }

    const context = await gatherAiChatContext(question);
    const data = await AiChatSync.ask({
      username: currentUser,
      displayName: currentUserDisplay,
      saudara: currentUserSaudara,
      question,
      context,
      allowExternal: _aiChatState.allowExternal,
      history: _aiChatState.history.slice(0, -1).map((h) => ({ role: h.role, text: h.text })),
    });
    if (!data || !data.ok) {
      throw new Error((data && data.error) || "Gagal mendapat jawaban dari AI");
    }
    const aiTurn = {
      role: "ai",
      text: data.answer,
      sources: [].concat(context.verses || [], context.notes || [], outlineContextAsSources(context), context.knowledgeSources || [], context.kidungSources || []),
    };
    _aiChatState.history.push(aiTurn);
    maybeSaveAiChatTurn(question, aiTurn);
  } catch (err) {
    _aiChatState.history.push({ role: "ai", text: "⚠️ Terjadi kesalahan: " + String(err.message || err) });
  } finally {
    _aiChatState.busy = false;
    if (sendBtn) sendBtn.disabled = false;
    renderAiChatThread(el("aiChatThread"));
  }
}
