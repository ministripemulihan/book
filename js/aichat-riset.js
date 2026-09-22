// ============================================================
//  🔎 AI CHAT: RISET TEMA & MODE KHOTBAH  (BARU 21 Sep 2026, permintaan operator)
//
//  Masalah yang diperbaiki (lihat juga js/aichat.js, apps-script/AiChatCode.gs):
//   1) Pertanyaan "coba cari kata kasih di catatan kaki" selalu dijawab
//      "tidak ada". Penyebab (semua di tahap PENGUMPULAN BAHAN, bukan di AI):
//        - kata perintah ("cari", "kata", "catatan", "kaki", "buatkan",
//          "khotbah") ikut jadi kata kunci, dan hanya 6 kata pertama yang
//          dipakai -- "pacaran" pada kalimat khotbah bahkan terpotong;
//        - jatah total cuma 10 ayat + 6 catatan, diambil dari hit PERTAMA
//          menurut urutan Alkitab tanpa peringkat, sehingga kata umum
//          ("kata" cocok dengan ribuan ayat, mis. "berkata") menghabiskan
//          jatah sebelum "kasih" sempat dicari;
//        - hanya bahasa yang sedang aktif yang dicari.
//   2) Jawaban terlalu pendek (3 paragraf): instruksi "singkat" + batas
//      1024 token di backend.
//
//  Modul ini MENAMBAH (js/aichat.js hanya diberi hook kecil, lihat
//  "Riset" di sana):
//   - extractKeywords(): kata kunci bersih (tanpa kata perintah/umur),
//     tanpa batas 6 kata, dengan varian imbuhan Indonesia (kasih ->
//     mengasihi, pengasih, ...).
//   - retrieve_(): pencarian LOKAL ber-SKOR (bobot IDF: kata langka lebih
//     berharga, kata yang terlalu umum dibuang otomatis) di SEMUA bahasa
//     yang dipilih (bawaan: Recovery Indonesia + Recovery Inggris), pada
//     teks ayat DAN catatan kaki, digabung per ayat lintas bahasa, dengan
//     kutipan catatan kaki dipotong di sekitar kata yang cocok.
//   - Perluasan kata kunci oleh AI (satu panggilan kecil, ai_riset_expand):
//     topik seperti "pacaran" -> kasih/jodoh/pernikahan/kekudusan/...
//     dan padanan Inggris/Mandarin, karena kata "pacaran" mungkin tidak
//     pernah tertulis di ayat/catatan, dan data Inggris tidak akan cocok
//     dengan kata kunci Indonesia.
//   - Mode "search" (mis. "cari kata kasih di catatan kaki"): angka hasil
//     pencarian dihitung APLIKASI (pasti), ditempel di atas jawaban AI.
//   - Mode Khotbah: khotbah disusun BAGIAN DEMI BAGIAN (pembuka, ayat
//     awal, isi, dampak, contoh Alkitab, hal menarik, hal yang berlawanan,
//     kesimpulan) 8-20 paragraf, tiap bagian satu panggilan AI (ai_khotbah_
//     section) dengan bahan hasil riset. Kalau berhenti di tengah (mis.
//     kuota AI habis), ketik "lanjutkan".
//   - Panel pengaturan (bahasa yang dicari, mode, panjang jawaban).
//
//  Semua bergantung pada global app.js/aichat.js hanya saat DIPANGGIL:
//  bibleData, verseIndex, BOOKS, CONFIG, currentLang, currentUser,
//  currentUserDisplay, currentUserSaudara, noteHtmlToPlainText,
//  parseReference, getChapterVerses, bookAvailableInLang, el,
//  _aiChatState, renderAiChatThread, AiChatSync, maybeSaveAiChatTurn.
// ============================================================
(function () {
  "use strict";

  const PREFS_KEY = "ai_riset_prefs_v1";
  const DEFAULT_LANGS = ["rvind", "rveng"]; // Recovery Indonesia + Recovery Inggris (permintaan operator)
  const MODES = { auto: "Otomatis", qa: "Tanya-jawab biasa", khotbah: "Khotbah / Riset Tema" };
  const LENGTHS = { auto: "Otomatis", short: "Ringkas", medium: "Sedang", long: "Panjang (15–20 paragraf)" };

  // Berapa banyak bahan yang dikirim ke AI menurut jenis permintaan.
  const LIMITS = {
    qa: { verses: 12, notes: 8, noteChars: 700 },
    search: { verses: 20, notes: 40, noteChars: 500 },
    khotbah: { verses: 30, notes: 24, noteChars: 600 },
  };
  const SOURCE_TEXT_MAX = 500; // teks tiap sumber yang ditampilkan/disimpan ke Riwayat dipotong (batas 50.000 karakter/sel Sheet)
  const DF_MAX_RATIO = 0.3;    // kata yang muncul di >30% ayat dianggap terlalu umum -> dibuang dari pencarian

  // ------------------------------------------------------------
  //  Bagian khotbah. n = jumlah paragraf per bagian menurut panjang:
  //  ringkas 8 / sedang 15 / panjang 20 paragraf.
  // ------------------------------------------------------------
  const SECTIONS = [
    { key: "pembuka", icon: "🎤", title: "Pembuka", n: { short: 1, medium: 2, long: 3 },
      guidance: "Buka dengan kalimat yang langsung menarik perhatian {audiens} (pertanyaan, situasi sehari-hari, atau cerita singkat). Ceritakan LATAR dan ASAL-USUL topik \"{topik}\": bagaimana konsep ini muncul dan dipahami orang zaman ini, lalu bagaimana Alkitab memandangnya. Tutup dengan kalimat yang mengantar ke ayat awal." },
    { key: "ayat_awal", icon: "📖", title: "Ayat Awal", n: { short: 1, medium: 2, long: 2 },
      guidance: "Pilih 1-2 ayat dari BAHAN yang paling cocok sebagai landasan khotbah. Kutip teksnya sesuai BAHAN dengan rujukan persis, jelaskan konteks singkatnya dan maksudnya. Kalau ada catatan kaki yang relevan, sampaikan intinya." },
    { key: "isi", icon: "🧭", title: "Isi: Pokok-pokok Firman", n: { short: 1, medium: 3, long: 3 },
      guidance: "Uraikan 3-4 pokok utama tentang \"{topik}\" menurut Alkitab. Tiap pokok didukung ayat/catatan kaki dari BAHAN (sebut rujukannya) dan dihubungkan dengan kehidupan {audiens} (kampus, pekerjaan, media sosial, pergaulan)." },
    { key: "dampak", icon: "⚖️", title: "Dampak", n: { short: 1, medium: 2, long: 2 },
      guidance: "Jelaskan DAMPAK nyata: kalau hidup selaras dengan firman (rohani, emosi, relasi, masa depan) dan kalau melanggarnya. Dukung dengan ayat dari BAHAN. Jujur dan seimbang, tidak menakut-nakuti." },
    { key: "contoh", icon: "👥", title: "Contoh dari Alkitab", n: { short: 1, medium: 2, long: 3 },
      guidance: "Ceritakan 2-3 tokoh/kisah Alkitab yang relevan (utamakan KISAH ALKITAB dan BAHAN di bawah; alurnya harus setia pada teks). Untuk tiap kisah: apa yang terjadi, keputusan tokohnya, dan pelajaran untuk {audiens}." },
    { key: "menarik", icon: "✨", title: "Hal yang Menarik tentang {topik}", n: { short: 1, medium: 1, long: 2 },
      guidance: "Sampaikan 2-3 temuan menarik/mengejutkan dari Alkitab terkait \"{topik}\": mis. penjelasan dalam catatan kaki Recovery, arti kata asli, kebiasaan zaman itu, atau sudut pandang yang jarang dibahas." },
    { key: "berlawanan", icon: "⚠️", title: "Hal yang Berlawanan dengan Konsep {topik} Masa Kini", n: { short: 1, medium: 2, long: 3 },
      guidance: "Sampaikan dengan jujur bagian-bagian firman yang BERBEDA, menyinggung, atau bertentangan dengan konsep \"{topik}\" yang populer saat ini. Bersikap penuh kasih, tidak menghakimi, dan tunjukkan alternatif yang Alkitab tawarkan. Dukung dengan ayat/catatan dari BAHAN." },
    { key: "kesimpulan", icon: "🙏", title: "Kesimpulan & Ajakan", n: { short: 1, medium: 1, long: 2 },
      guidance: "Rangkum benang merah khotbah dalam beberapa kalimat, beri 3 langkah konkret yang bisa dilakukan {audiens} minggu ini, dan tutup dengan doa singkat." },
  ];

  // ------------------------------------------------------------
  //  Pengaturan (localStorage)
  // ------------------------------------------------------------
  function loadPrefs_() {
    let p = {};
    try { p = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") || {}; } catch (e) { p = {}; }
    return {
      langs: Array.isArray(p.langs) ? p.langs : null,
      mode: MODES[p.mode] ? p.mode : "auto",
      length: LENGTHS[p.length] ? p.length : "auto",
      externalStory: p.externalStory !== false, // bawaan: boleh menambah cerita/latar dari luar data (ditandai)
    };
  }
  function savePrefs_(p) {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch (e) { /* diabaikan */ }
  }
  function availableLangs_() {
    const all = (typeof CONFIG !== "undefined" && CONFIG.LANGUAGES) || [];
    const loaded = all.filter((l) => typeof verseIndex !== "undefined" && verseIndex[l.code]);
    return loaded.length ? loaded : all;
  }
  function langLabel_(code) {
    const f = ((typeof CONFIG !== "undefined" && CONFIG.LANGUAGES) || []).find((l) => l.code === code);
    return f ? f.label : code;
  }
  // Bahasa yang akan dicari: pilihan pengguna (bawaan Recovery Indonesia +
  // Recovery Inggris) yang datanya ADA di perangkat; kalau tidak ada satu
  // pun, jatuh ke bahasa yang sedang aktif.
  function getPrefs() {
    const p = loadPrefs_();
    const avail = availableLangs_().map((l) => l.code);
    let langs = (p.langs || DEFAULT_LANGS).filter((c) => avail.includes(c));
    // Urutan = prioritas saat teks ayat dua bahasa sama-sama cocok dengan skor
    // sama: Recovery Indonesia & Recovery Inggris didahulukan, sisanya menyusul.
    const rank = (c) => { const i = DEFAULT_LANGS.indexOf(c); return i === -1 ? DEFAULT_LANGS.length : i; };
    langs = langs.map((c, i) => ({ c, i })).sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i).map((x) => x.c);
    if (!langs.length) {
      const cur = typeof currentLang !== "undefined" ? currentLang : null;
      langs = cur && avail.includes(cur) ? [cur] : avail.slice(0, 1);
    }
    return Object.assign({}, p, { langs });
  }
  // "ind" (Indonesia/Jawa), "eng" (semua Inggris), "chs" (Mandarin)
  function familyOf_(lang) {
    if (lang === "kjv" || lang === "eng" || lang === "rveng") return "eng";
    if (lang === "chs" || lang === "chssmp") return "chs";
    return "ind";
  }

  // ------------------------------------------------------------
  //  Kata kunci bersih
  // ------------------------------------------------------------
  const STOP = new Set([
    // dari daftar lama js/aichat.js
    "yang", "dan", "atau", "di", "ke", "dari", "untuk", "dengan", "apa", "bagaimana", "kenapa", "mengapa",
    "adalah", "itu", "ini", "saya", "aku", "kita", "tentang", "bisa", "boleh", "tolong", "coba", "jelaskan",
    "apakah", "dalam", "pada", "seperti", "juga", "akan", "sudah", "belum", "tidak", "bukan", "kalau", "jika",
    // BARU: kata perintah & pengisi yang tadinya ikut jadi kata kunci
    "cari", "carikan", "mencari", "temukan", "tampilkan", "buatkan", "buat", "bikin", "bikinkan", "berikan",
    "sebutkan", "ceritakan", "mohon", "kata", "kalimat", "catatan", "kaki", "footnote", "footnotes", "notes", "note",
    "ayat", "alkitab", "semua", "seluruh", "setiap", "khotbah", "kotbah", "ceramah", "renungan", "bahan", "materi",
    "mengenai", "seputar", "soal", "kepada", "bagi", "oleh", "menyinggung", "menyangkut", "berkaitan", "terkait",
    "hal", "lebih", "banyak", "sekali", "saja", "lagi", "ada", "siapa", "dimana", "kapan", "berapa", "serta",
    "lalu", "kemudian", "dapat", "harus", "perlu", "mau", "ingin", "minta", "sebuah", "suatu", "para", "saat",
    "ketika", "masih", "sedang", "sebagai", "antara", "sampai", "hingga", "agar", "supaya", "sehingga",
    "karena", "sebab", "namun", "tetapi", "tapi", "hanya", "paling", "sangat", "pun", "yaitu", "yakni",
    "usia", "umur", "sekitar", "secara", "lengkap", "beserta",
  ]);
  // Catatan: "tahun", "muda", "remaja", "pemuda" SENGAJA tidak dibuang di sini
  // (bisa kata kunci sah, mis. "tahun Yobel"). Angka umur "17-24 tahun" dibuang
  // lewat regex di extractKeywords(); untuk KHOTBAH, penonton ("anak muda")
  // dipisah oleh perluasan AI ("audiens") dan kata kunci lokal tidak dipakai
  // untuk menilai kecocokan kalau perluasan AI tersedia (lihat retrieve_()).

  function extractKeywords(question) {
    let q = String(question || "").toLowerCase();
    const phrases = [];
    q = q.replace(/["“”']([^"“”']{3,60})["“”']/g, (m, p) => { phrases.push(p.trim()); return " "; });
    // umur/angka (mis. "usia 17-24 tahun") bukan kata kunci
    q = q.replace(/\b(usia|umur)?\s*\d+\s*([-–]\s*\d+)?\s*(tahun|thn|th)?\b/g, " ");
    const out = [];
    const seen = new Set();
    const add = (t) => { if (t && !seen.has(t)) { seen.add(t); out.push(t); } };
    phrases.forEach((p) => add(p));
    (q.match(/[\u4e00-\u9fff]{2,}/g) || []).forEach(add);
    q.replace(/[^\p{L}\p{N}\s-]/gu, " ").split(/\s+/).forEach((w) => {
      w = w.replace(/^-+|-+$/g, "");
      if (w.length < 3 || /^\d+$/.test(w) || STOP.has(w) || /[\u4e00-\u9fff]/.test(w)) return;
      add(w);
    });
    return out.slice(0, 12);
  }

  // Varian imbuhan Indonesia yang HILANG di awal kata: kasih -> mengasihi,
  // pengasih; pilih -> memilih; tulis -> menulis; sesat -> menyesatkan.
  // (Untuk yang lain, pencocokan potongan kata sudah cukup: "kasih" ada
  // di dalam "dikasihi", "kekasih".)
  function indoVariants(term) {
    const t = String(term || "").toLowerCase();
    const out = [t];
    if (t.length < 4 || /[^a-z]/.test(t)) return out;
    const rest = t.slice(1);
    if (/^k[aeiou]/.test(t)) out.push("meng" + rest, "peng" + rest);
    else if (/^p[aeiou]/.test(t)) out.push("mem" + rest, "pem" + rest);
    else if (/^t[aeiou]/.test(t)) out.push("men" + rest, "pen" + rest);
    else if (/^s[aeiou]/.test(t)) out.push("meny" + rest, "peny" + rest);
    return out;
  }

  function uniqueTerms_(list, cap) {
    const seen = new Set();
    const out = [];
    (list || []).forEach((x) => {
      const t = String(x || "").toLowerCase().trim();
      if (!t || seen.has(t)) return;
      if (/[\u4e00-\u9fff]/.test(t) ? t.length < 2 : t.length < 3) return;
      seen.add(t);
      out.push(t);
    });
    return out.slice(0, cap || 60);
  }

  // Kata kunci per keluarga bahasa: Indonesia (kata lokal + varian + hasil
  // perluasan AI), Inggris & Mandarin (HANYA dari perluasan AI, karena
  // kata kunci Indonesia tidak akan cocok dengan teks Inggris/Mandarin).
  function buildTerms_(localKw, expansion) {
    const ex = expansion || {};
    const ind = [];
    localKw.concat(ex.kata_ind || []).forEach((k) => indoVariants(k).forEach((v) => ind.push(v)));
    return {
      ind: uniqueTerms_(ind, 60),
      eng: uniqueTerms_((ex.kata_eng || []).concat(expansion ? [] : localKw), 40),
      chs: uniqueTerms_(ex.kata_chs || [], 30),
    };
  }

  // ------------------------------------------------------------
  //  Deteksi maksud pertanyaan
  // ------------------------------------------------------------
  const KHOTBAH_RE = /\b(khotbah|kotbah|kothbah|ceramah|sermon|renungan|bahan\s+(pengajaran|khotbah|kotbah|pemahaman)|pesan\s+(pemuda|natal|paskah))\b/i;
  const SEARCH_VERB_RE = /\b(cari|carikan|mencari|temukan|tampilkan|daftar|kumpulkan|ada\s+berapa)\b/i;
  const NOTE_RE = /\b(catatan\s*kaki|catatan|footnotes?|notes?)\b/i;
  const VERSE_RE = /\b(ayat|firman)\b/i;

  function detectIntent(question, mode) {
    if (mode === "khotbah") return "khotbah";
    if (mode === "qa") return "qa";
    if (KHOTBAH_RE.test(question)) return "khotbah";
    if (SEARCH_VERB_RE.test(question) && (NOTE_RE.test(question) || VERSE_RE.test(question))) return "search";
    return "qa";
  }
  function detectScope(question) {
    const n = NOTE_RE.test(question);
    const v = VERSE_RE.test(question);
    if (n && !v) return "notes";
    if (v && !n) return "verse";
    return "both";
  }

  // ------------------------------------------------------------
  //  Pencarian lokal ber-skor
  // ------------------------------------------------------------
  const _cache = new WeakMap(); // objek ayat -> { t, n, np }
  function cacheOf_(v) {
    let c = _cache.get(v);
    // Ayat bisa diedit administrator (js/bible-edit.js) -> cache dibuang kalau teks/catatannya berubah.
    if (c && (c.srcT !== v.text || c.srcN !== v.note)) c = null;
    if (!c) {
      let np = "";
      if (v.note && String(v.note).trim()) {
        try { np = noteHtmlToPlainText(v.note) || ""; } catch (e) { np = String(v.note); }
      }
      c = { t: String(v.text || "").toLowerCase(), n: np.toLowerCase(), np, srcT: v.text, srcN: v.note };
      _cache.set(v, c);
    }
    return c;
  }
  let _pools = { src: null, len: -1, byLang: {} };
  function poolFor_(lang) {
    if (_pools.src !== bibleData || _pools.len !== bibleData.length) _pools = { src: bibleData, len: bibleData.length, byLang: {} };
    if (!_pools.byLang[lang]) _pools.byLang[lang] = bibleData.filter((v) => v.lang === lang);
    return _pools.byLang[lang];
  }

  function scanLang_(lang, terms, scope) {
    const pool = poolFor_(lang);
    const N = pool.length || 1;
    const T = terms.length;
    const textHits = terms.map(() => []);
    const noteHits = terms.map(() => []);
    for (let i = 0; i < pool.length; i++) {
      const c = cacheOf_(pool[i]);
      for (let t = 0; t < T; t++) {
        if (scope !== "notes" && c.t.includes(terms[t])) textHits[t].push(i);
        if (scope !== "verse" && c.n && c.n.includes(terms[t])) noteHits[t].push(i);
      }
    }
    const items = new Map();
    const used = [];
    const dropped = [];
    const stats = [];
    terms.forEach((term, t) => {
      const df = Math.max(textHits[t].length, noteHits[t].length);
      if (df > 0) stats.push({ term, t, df });
    });
    // Kata yang muncul di >30% ayat dianggap terlalu umum dan dibuang. Kalau
    // SEMUA kata ternyata umum, jangan pulang dengan tangan kosong: pakai
    // maksimal 3 kata yang paling jarang.
    let keep = stats.filter((x) => !(T > 1 && x.df / N > DF_MAX_RATIO));
    if (!keep.length && stats.length) keep = stats.slice().sort((a, b) => a.df - b.df).slice(0, 3);
    const keepSet = new Set(keep.map((x) => x.t));
    stats.forEach((x) => { if (!keepSet.has(x.t)) dropped.push(x.term); });
    keep.forEach(({ term, t, df }) => {
      used.push(term);
      const idf = Math.log((N + 1) / (df + 1));
      const bump = (idx, key) => {
        let it = items.get(idx);
        if (!it) { it = { ts: 0, ns: 0, tt: [], nt: [] }; items.set(idx, it); }
        if (key === "t") { it.ts += idf; it.tt.push(term); } else { it.ns += idf; it.nt.push(term); }
      };
      textHits[t].forEach((i) => bump(i, "t"));
      noteHits[t].forEach((i) => bump(i, "n"));
    });
    let verseCount = 0, noteCount = 0;
    items.forEach((it) => { if (it.ts > 0) verseCount++; if (it.ns > 0) noteCount++; });
    return { lang, pool, items, used, dropped, totals: { verse: verseCount, note: noteCount, N } };
  }

  function excerpt_(plain, lower, terms, maxChars) {
    if (plain.length <= maxChars) return plain;
    let at = -1;
    for (const t of terms) {
      const i = lower.indexOf(t);
      if (i !== -1 && (at === -1 || i < at)) at = i;
    }
    if (at === -1) return plain.slice(0, maxChars) + "…";
    const start = Math.max(0, at - Math.floor(maxChars * 0.35));
    const end = Math.min(plain.length, start + maxChars);
    return (start > 0 ? "…" : "") + plain.slice(start, end).trim() + (end < plain.length ? "…" : "");
  }

  function refOf_(v, lang) {
    const b = typeof BOOKS !== "undefined" ? BOOKS.find((x) => x.num === v.bookNumber) : null;
    return (v.bookName || (b ? b.name : "")) + " " + v.chapter + ":" + v.verse + " (" + langLabel_(lang) + ")";
  }

  // Ayat kunci / kisah yang diusulkan AI -> teks ayatnya diambil dari data
  // lokal (BUKAN dikutip dari ingatan AI).
  function resolveRef_(refText, langs, maxVerses, maxChars) {
    if (typeof parseReference !== "function") return null;
    let parsed = null;
    try { parsed = parseReference(String(refText || "")); } catch (e) { parsed = null; }
    if (!parsed || !parsed.book) return null;
    for (const lang of langs) {
      if (typeof bookAvailableInLang === "function" && !bookAvailableInLang(lang, parsed.book.num)) continue;
      const chVerses = getChapterVerses(lang, parsed.book.num, parsed.chapter) || [];
      if (!chVerses.length) continue;
      const vs = parsed.verseStart ? Math.max(1, parsed.verseStart) : 1;
      const ve = parsed.verseEnd || (parsed.verseStart ? parsed.verseStart : chVerses.length);
      let picked = chVerses.filter((v) => v.verse >= vs && v.verse <= ve).slice(0, maxVerses || 14);
      if (!picked.length) continue;
      let total = 0;
      picked = picked.filter((v) => { total += String(v.text || "").length; return total <= (maxChars || 2200); });
      return {
        bookName: parsed.book.name,
        chapter: parsed.chapter,
        range: parsed.verseStart ? vs + (ve !== vs ? "-" + ve : "") : "",
        verses: picked.map((v) => ({ verse: v.verse, text: v.text })),
        lang,
      };
    }
    return null;
  }

  // ------------------------------------------------------------
  //  Panggilan ke backend (apps-script/AiChatCode.gs)
  // ------------------------------------------------------------
  async function callBackend_(payload, timeoutMs) {
    const url = CONFIG.AI_CHAT_APPS_SCRIPT_URL;
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs || 90000) : null;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        signal: ctrl ? ctrl.signal : undefined,
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (!data || !data.ok) throw new Error((data && data.error) || "Gagal mendapat jawaban dari AI");
      return data;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  const _expandCache = new Map();
  async function expand_(question, breadth, families) {
    const key = breadth + "|" + families.join(",") + "|" + question;
    if (_expandCache.has(key)) return _expandCache.get(key);
    try {
      const data = await callBackend_({ type: "ai_riset_expand", username: currentUser, question, breadth, wantLangs: families }, 30000);
      const ex = data.expansion || null;
      if (ex) _expandCache.set(key, ex);
      return ex;
    } catch (e) {
      console.warn("Perluasan kata kunci AI gagal, memakai kata kunci lokal saja:", e);
      return null; // tetap jalan dengan kata kunci lokal
    }
  }

  // ------------------------------------------------------------
  //  retrieve_(): inti pengumpulan bahan
  // ------------------------------------------------------------
  async function retrieve_(opts) {
    const { question, intent, prefs } = opts;
    const scope = opts.scope || "both";
    const limits = Object.assign({}, LIMITS[intent] || LIMITS.qa, opts.limits || {});
    const breadth = intent === "search" ? "exact" : "broad";
    const langs = prefs.langs;
    const families = Array.from(new Set(langs.map(familyOf_)));
    const localKw = extractKeywords(question);

    // Perluasan AI: dibutuhkan kalau ada bahasa non-Indonesia (kata kunci
    // Indonesia tidak akan cocok), atau untuk khotbah/pencarian, atau kalau
    // kata kunci lokal kosong.
    const needExpand = intent !== "qa" || families.some((f) => f !== "ind") || !localKw.length;
    const expansion = needExpand ? await expand_(question, breadth, families) : null;
    // Khotbah: kalau perluasan AI ada, PAKAI ITU SAJA (kata kunci lokal masih
    // membawa kata penonton seperti "anak muda" yang mengotori peringkat).
    const baseKw = (intent === "khotbah" && expansion) ? [] : localKw;
    const terms = buildTerms_(baseKw, expansion);

    const scans = {};
    const perLang = {};
    langs.forEach((lang) => {
      const fam = familyOf_(lang);
      const t = terms[fam] || [];
      scans[lang] = t.length ? scanLang_(lang, t, scope) : { lang, pool: poolFor_(lang), items: new Map(), used: [], dropped: [], totals: { verse: 0, note: 0, N: poolFor_(lang).length } };
      perLang[lang] = { verse: scans[lang].totals.verse, note: scans[lang].totals.note, used: scans[lang].used };
    });

    // gabung per ayat lintas bahasa
    const groups = new Map();
    langs.forEach((lang, li) => {
      const s = scans[lang];
      s.items.forEach((it, idx) => {
        const v = s.pool[idx];
        const key = v.bookNumber + ":" + v.chapter + ":" + v.verse;
        let g = groups.get(key);
        if (!g) { g = { key, bookNumber: v.bookNumber, chapter: v.chapter, verse: v.verse, ts: 0, ns: 0, textBest: null, noteBest: null }; groups.set(key, g); }
        if (it.ts > 0 && (!g.textBest || it.ts > g.textBest.score || (it.ts === g.textBest.score && li < g.textBest.li))) g.textBest = { v, lang, li, score: it.ts };
        if (it.ns > 0 && (!g.noteBest || it.ns > g.noteBest.score || (it.ns === g.noteBest.score && li < g.noteBest.li))) g.noteBest = { v, lang, li, score: it.ns, terms: it.nt };
      });
    });
    const all = Array.from(groups.values());
    all.forEach((g) => { g.ts = g.textBest ? g.textBest.score : 0; g.ns = g.noteBest ? g.noteBest.score : 0; });
    const order = (a, b) => a.bookNumber - b.bookNumber || a.chapter - b.chapter || a.verse - b.verse;

    const verseGroups = all.filter((g) => g.ts > 0);
    const noteGroups = all.filter((g) => g.ns > 0);
    verseGroups.sort((a, b) => (b.ts + 0.5 * b.ns) - (a.ts + 0.5 * a.ns) || order(a, b));
    noteGroups.sort((a, b) => (b.ns + 0.5 * b.ts) - (a.ns + 0.5 * a.ts) || order(a, b));

    const verses = verseGroups.slice(0, limits.verses).map((g) => ({
      kind: "verse", ref: refOf_(g.textBest.v, g.textBest.lang), text: String(g.textBest.v.text || ""),
    }));
    const notes = noteGroups.slice(0, limits.notes).map((g) => {
      const v = g.noteBest.v;
      const c = cacheOf_(v);
      return { kind: "note", ref: refOf_(v, g.noteBest.lang), text: excerpt_(c.np, c.n, g.noteBest.terms || [], limits.noteChars) };
    });

    // ayat kunci & kisah usulan AI (khusus khotbah/tanya): teks dari data lokal
    const keyVerses = [];
    const kisah = [];
    if (expansion && intent !== "search") {
      (expansion.ayat_kunci || []).slice(0, 10).forEach((r) => {
        const got = resolveRef_(r, langs, 8, 1400);
        if (got) got.verses.forEach((v) => keyVerses.push({ kind: "verse", ref: got.bookName + " " + got.chapter + ":" + v.verse + " (" + langLabel_(got.lang) + ")", text: v.text }));
      });
      (expansion.kisah || []).slice(0, 5).forEach((k) => {
        const got = resolveRef_(k && k.rujukan, langs, 14, 2200);
        if (got) kisah.push({
          ref: (k.tokoh ? k.tokoh + ", " : "") + got.bookName + " " + got.chapter + (got.range ? ":" + got.range : "") + " (" + langLabel_(got.lang) + ")",
          text: got.verses.map((v) => v.verse + ". " + v.text).join(" "),
        });
      });
    }

    return {
      intent, scope, langs, terms, expansion, perLang,
      totals: {
        verse: verseGroups.length, note: noteGroups.length,
        any: verseGroups.length + noteGroups.length + keyVerses.length + kisah.length,
      },
      verses, notes, keyVerses, kisah,
    };
  }

  function toSource_(item) {
    return { kind: item.kind, ref: item.ref, text: String(item.text || "").slice(0, SOURCE_TEXT_MAX) };
  }

  // ------------------------------------------------------------
  //  Ringkasan hasil pencarian: angka PASTI dari aplikasi
  // ------------------------------------------------------------
  function buildSearchSummary_(r) {
    const lines = ["🔎 *Hasil pencarian di data lokal* (angka pasti dari aplikasi, bukan perkiraan AI)"];
    lines.push("• Bahasa yang dicari: " + r.langs.map(langLabel_).join(", "));
    const shown = (t) => (t && t.length ? t.slice(0, 8).join(", ") : "-");
    const fams = Array.from(new Set(r.langs.map(familyOf_)));
    fams.forEach((f) => {
      const name = f === "ind" ? "Indonesia" : (f === "eng" ? "Inggris" : "Mandarin");
      lines.push("• Kata yang dicocokkan (" + name + "): " + shown(r.terms[f]));
    });
    const perLang = r.langs.map((l) => langLabel_(l) + " " + r.perLang[l].note + " catatan / " + r.perLang[l].verse + " ayat").join("; ");
    if (r.scope !== "verse") lines.push("• Catatan kaki yang memuat: *" + r.totals.note + "* ayat berbeda");
    if (r.scope !== "notes") lines.push("• Teks ayat yang memuat: *" + r.totals.verse + "* ayat berbeda");
    if (r.langs.length > 1) lines.push("• Rinci per bahasa: " + perLang);
    lines.push("• Yang dikirim ke AI untuk disusun: " + r.notes.length + " catatan & " + r.verses.length + " ayat dengan kecocokan tertinggi.");
    return lines.join("\n");
  }

  // ------------------------------------------------------------
  //  Alur: PENCARIAN ("cari kata kasih di catatan kaki")
  // ------------------------------------------------------------
  function newAiTurn_(text) {
    const turn = { role: "ai", text, sources: [] };
    _aiChatState.history.push(turn);
    return turn;
  }
  function refresh_() {
    const th = typeof el === "function" ? el("aiChatThread") : document.getElementById("aiChatThread");
    if (th) renderAiChatThread(th);
  }
  function historyForBackend_() {
    return _aiChatState.history.slice(0, -1).map((h) => ({ role: h.role, text: h.text }));
  }

  const NO_DATA_MSG = "Data Alkitab belum dimuat di perangkat ini, jadi pencarian belum bisa dilakukan. Unduh/sinkronkan data Alkitab (dan catatan kaki) dulu dari menu pengaturan data, lalu coba lagi.";

  async function runSearch_(question, prefs) {
    const scope = detectScope(question);
    const turn = newAiTurn_("🔎 Mencari di semua bahasa yang dipilih (ayat & catatan kaki)…");
    refresh_();
    if (!bibleData || !bibleData.length) { turn.text = NO_DATA_MSG; refresh_(); return; }
    let r;
    try {
      r = await retrieve_({ question, intent: "search", prefs, scope });
    } catch (err) {
      turn.text = "⚠️ Pencarian gagal: " + String((err && err.message) || err);
      refresh_();
      return;
    }
    const summary = buildSearchSummary_(r);
    turn.sources = r.notes.concat(r.verses).map(toSource_);
    if (!r.totals.any) {
      turn.text = summary + "\n\nTidak ada ayat maupun catatan kaki yang cocok pada bahasa yang dicari. Coba tambah bahasa lain di ⚙️ Pengaturan, atau pakai kata yang berbeda.";
      refresh_();
      return;
    }
    turn.text = summary + "\n\n⏳ Menyusun temuan…";
    refresh_();
    const context = { verses: r.verses.map(toSource_), notes: r.notes.map(toSource_), searchSummary: summary.replace(/\*/g, "") };
    try {
      const data = await AiChatSync.ask({
        username: currentUser, displayName: currentUserDisplay, saudara: currentUserSaudara,
        question, context, allowExternal: false, history: historyForBackend_(),
        length: prefs.length === "auto" ? "medium" : prefs.length, mode: "search",
      });
      if (!data || !data.ok) throw new Error((data && data.error) || "Gagal mendapat jawaban dari AI");
      turn.text = summary + "\n\n" + data.answer;
    } catch (err) {
      // Angka & bahan tetap tampil walau AI gagal menyusun.
      turn.text = summary + "\n\n⚠️ AI gagal menyusun temuan: " + String(err.message || err) + "\nDaftar sumber di bawah tetap berisi semua bahan yang ditemukan.";
    }
    refresh_();
    maybeSaveAiChatTurn(question, turn);
  }

  // ------------------------------------------------------------
  //  Alur: KHOTBAH bagian demi bagian
  // ------------------------------------------------------------
  let _pending = null; // khotbah yang berhenti di tengah -> bisa "lanjutkan"
  let _retryDelayMs = 3000; // jeda sebelum mengulang SEKALI satu bagian yang gagal

  function fill_(s, topik, audiens) {
    return String(s).replace(/\{topik\}/g, topik).replace(/\{audiens\}/g, audiens);
  }
  function lengthKeyForKhotbah_(prefs) {
    return prefs.length === "auto" ? "long" : prefs.length;
  }
  // Buang tanda format WhatsApp (* _ ~) dari teks buatan AI yang dipakai di
  // judul/kepala supaya tidak merusak tebal/miring di formatChatText().
  function clean_(t) { return String(t || "").replace(/[*_~]/g, "").trim(); }
  function assembleKhotbah_(st, from) {
    from = from || 0;
    const head = "*🎤 " + st.judul + (from > 0 ? " (lanjutan)" : "") + "*\n_" + (st.audiens ? "Untuk " + st.audiens + ". " : "") + st.bahanNote + "_";
    const parts = st.done.slice(from).map((d) => "*" + d.icon + " " + d.title + "*\n" + d.text);
    let text = head + (parts.length ? "\n\n" + parts.join("\n\n") : "");
    if (st.progress) text += "\n\n" + st.progress;
    return text;
  }

  async function generateSections_(st, turn, from) {
    for (let i = st.done.length; i < st.sections.length; i++) {
      const sec = st.sections[i];
      st.progress = "⏳ Menyusun bagian " + (i + 1) + " dari " + st.sections.length + ": " + sec.title + "…";
      turn.text = assembleKhotbah_(st, from);
      refresh_();
      const payload = {
        type: "ai_khotbah_section", username: currentUser,
        topik: st.topik, audiens: st.audiens, judul: st.judul, tesis: st.tesis,
        allowExternal: st.externalStory,
        section: { key: sec.key, title: sec.title, paragraphs: sec.paragraphs, guidance: sec.guidance, index: i + 1, total: st.sections.length },
        context: {
          verses: st.pack.verses.map(toSource_), notes: st.pack.notes.map(toSource_),
          kisah: sec.key === "contoh" ? st.pack.kisah : [],
        },
        previous: st.done.map((d) => ({ title: d.title, text: d.text.length > 700 ? d.text.slice(0, 700) + "…" : d.text })),
      };
      let data = null;
      let lastErr = null;
      for (let attempt = 0; attempt < 2 && !data; attempt++) {
        try {
          data = await callBackend_(payload, 120000);
        } catch (e) {
          lastErr = e;
          if (attempt === 0) await new Promise((r) => setTimeout(r, _retryDelayMs));
        }
      }
      if (!data) {
        st.progress = "⚠️ Berhenti di bagian " + (i + 1) + " (" + sec.title + "): " + String((lastErr && lastErr.message) || lastErr) +
          "\nKetik *lanjutkan* untuk meneruskan dari bagian ini.";
        turn.text = assembleKhotbah_(st, from);
        _pending = st;
        refresh_();
        return false;
      }
      st.done.push({ key: sec.key, icon: sec.icon, title: sec.title, text: String(data.text || "").trim() });
    }
    st.progress = "";
    turn.text = assembleKhotbah_(st, from);
    _pending = null;
    refresh_();
    return true;
  }

  async function runKhotbah_(question, prefs) {
    const turn = newAiTurn_("📖 *Mode Khotbah / Riset Tema*\n🔎 Mengumpulkan bahan dari ayat & catatan kaki (" + prefs.langs.map(langLabel_).join(", ") + ")…");
    refresh_();
    if (!bibleData || !bibleData.length) { turn.text = NO_DATA_MSG; refresh_(); return; }
    let r;
    try {
      r = await retrieve_({ question, intent: "khotbah", prefs, scope: "both" });
    } catch (err) {
      turn.text = "⚠️ Pengumpulan bahan gagal: " + String((err && err.message) || err);
      refresh_();
      return;
    }
    const ex = r.expansion || {};
    const local = extractKeywords(question);
    const topik = clean_(ex.topik || local.slice(0, 3).join(" ") || "topik ini");
    const audiens = clean_(ex.audiens);
    const lenKey = lengthKeyForKhotbah_(prefs);
    const sections = SECTIONS.map((s) => ({
      key: s.key, icon: s.icon,
      title: fill_(s.title, topik, audiens || "pendengar"),
      paragraphs: s.n[lenKey] || s.n.long,
      guidance: fill_(s.guidance, topik, audiens || "pendengar"),
    }));
    const total = sections.reduce((a, s) => a + s.paragraphs, 0);
    const verses = r.keyVerses.concat(r.verses);
    const seenRef = new Set();
    const dedupVerses = verses.filter((v) => { const k = v.ref + "|" + v.text.slice(0, 30); if (seenRef.has(k)) return false; seenRef.add(k); return true; }).slice(0, LIMITS.khotbah.verses + 8);
    const st = {
      topik, audiens, tesis: clean_(ex.tesis),
      judul: clean_(ex.judul || ("Khotbah: " + topik)),
      externalStory: prefs.externalStory,
      sections, done: [], progress: "",
      pack: { verses: dedupVerses, notes: r.notes, kisah: r.kisah },
      bahanNote: "Bahan: " + dedupVerses.length + " ayat & " + r.notes.length + " catatan kaki (" + r.totals.verse + " ayat dan " + r.totals.note + " catatan kaki cocok dengan topik); sekitar " + total + " paragraf.",
    };
    st.sources = r.notes.concat(dedupVerses).map(toSource_).concat(r.kisah.map((k) => ({ kind: "verse", ref: "📜 Kisah: " + k.ref, text: k.text.slice(0, SOURCE_TEXT_MAX) })));
    turn.sources = st.sources;
    if (!r.totals.any && !st.externalStory) {
      turn.text = "Belum ada ayat/catatan kaki yang cocok dengan topik ini pada bahasa yang dicari, dan pilihan cerita dari luar data sedang dimatikan, jadi khotbah belum bisa disusun. Coba tambah bahasa di ⚙️ Pengaturan atau nyalakan “Cerita & latar dari luar data”.";
      refresh_();
      return;
    }
    const finished = await generateSections_(st, turn, 0);
    if (finished || st.done.length) maybeSaveAiChatTurn(question, turn);
  }

  async function resumeKhotbah_() {
    const st = _pending;
    if (!st) return false;
    // Giliran BARU yang hanya berisi bagian-bagian lanjutan (bagian yang
    // sudah jadi tetap di balasan sebelumnya, tidak diulang).
    const from = st.done.length;
    const turn = newAiTurn_("▶️ Melanjutkan khotbah *" + st.judul + "* dari bagian " + (from + 1) + "…");
    turn.sources = st.sources || [];
    refresh_();
    const finished = await generateSections_(st, turn, from);
    if (finished || st.done.length > from) maybeSaveAiChatTurn("(lanjutan) " + st.judul, turn);
    return true;
  }

  // ------------------------------------------------------------
  //  Pintu masuk dari js/aichat.js
  // ------------------------------------------------------------
  // true = pertanyaan ini SUDAH ditangani modul ini (giliran AI sudah
  // ditambahkan ke _aiChatState.history); false = biarkan alur lama jalan.
  async function maybeHandle(question) {
    const prefs = getPrefs();
    if (_pending && /^\s*(lanjut|lanjutkan|teruskan)\b/i.test(question)) {
      await resumeKhotbah_();
      return true;
    }
    const intent = detectIntent(question, prefs.mode);
    if (intent === "khotbah") { await runKhotbah_(question, prefs); return true; }
    if (intent === "search") { await runSearch_(question, prefs); return true; }
    return false;
  }

  // Pengganti blok pencarian lama di gatherAiChatContext() (tanya-jawab biasa).
  async function searchForChat(question) {
    const prefs = getPrefs();
    const r = await retrieve_({ question, intent: "qa", prefs, scope: detectScope(question) });
    const keyVerses = r.keyVerses.slice(0, 6);
    const verses = keyVerses.concat(r.verses).slice(0, LIMITS.qa.verses + 4);
    return { verses, notes: r.notes, terms: r.terms, totals: r.totals };
  }

  // ------------------------------------------------------------
  //  Panel pengaturan (dipasang di bawah kotak "🌐 Izinkan referensi luar")
  // ------------------------------------------------------------
  let _controlsOpen = false;
  function renderControls(container) {
    const prefs = loadPrefs_();
    const eff = getPrefs();
    const d = document.createElement("details");
    d.className = "ai-riset-controls";
    d.open = _controlsOpen;
    d.addEventListener("toggle", () => { _controlsOpen = d.open; });
    const sum = document.createElement("summary");
    sum.textContent = "⚙️ Bahasa yang dicari, mode & panjang jawaban";
    d.appendChild(sum);

    const body = document.createElement("div");
    body.className = "ai-riset-body";
    d.appendChild(body);

    const langsBox = document.createElement("fieldset");
    langsBox.className = "ai-riset-langs";
    const legend = document.createElement("legend");
    legend.textContent = "Bahasa yang dicari (ayat & catatan kaki)";
    langsBox.appendChild(legend);
    availableLangs_().forEach((l) => {
      const lab = document.createElement("label");
      lab.className = "ai-riset-lang";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = l.code;
      cb.checked = eff.langs.includes(l.code);
      cb.addEventListener("change", () => {
        const chosen = Array.from(langsBox.querySelectorAll("input:checked")).map((x) => x.value);
        const p = loadPrefs_();
        p.langs = chosen;
        savePrefs_(p);
      });
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(" " + l.label));
      langsBox.appendChild(lab);
    });
    const hint = document.createElement("p");
    hint.className = "ai-riset-hint";
    hint.textContent = "Catatan kaki hanya ada pada terjemahan yang memilikinya (mis. Recovery). Bawaan: Recovery Indonesia + Recovery Inggris.";
    langsBox.appendChild(hint);
    body.appendChild(langsBox);

    const mk = (label, key, options) => {
      const w = document.createElement("label");
      w.className = "ai-riset-field";
      const s = document.createElement("span");
      s.textContent = label;
      const sel = document.createElement("select");
      sel.className = "chip-select";
      Object.keys(options).forEach((k) => {
        const o = document.createElement("option");
        o.value = k;
        o.textContent = options[k];
        sel.appendChild(o);
      });
      sel.value = prefs[key];
      sel.addEventListener("change", () => { const p = loadPrefs_(); p[key] = sel.value; savePrefs_(p); });
      w.appendChild(s);
      w.appendChild(sel);
      return w;
    };
    body.appendChild(mk("Mode", "mode", MODES));
    body.appendChild(mk("Panjang jawaban", "length", LENGTHS));

    const ext = document.createElement("label");
    ext.className = "ai-riset-lang";
    const ecb = document.createElement("input");
    ecb.type = "checkbox";
    ecb.checked = prefs.externalStory;
    ecb.addEventListener("change", () => { const p = loadPrefs_(); p.externalStory = ecb.checked; savePrefs_(p); });
    ext.appendChild(ecb);
    ext.appendChild(document.createTextNode(" Khotbah: boleh menambah cerita/latar sejarah dari luar data (ditandai “latar di luar data”)"));
    body.appendChild(ext);

    container.appendChild(d);
  }

  const api = {
    maybeHandle, searchForChat, extractKeywords, renderControls, getPrefs,
    detectIntent, detectScope,
    lengthFor() { const l = loadPrefs_().length; return l; },
    hasPending() { return !!_pending; },
    _test: { indoVariants, buildTerms_, scanLang_, retrieve_, buildSearchSummary_, SECTIONS, resolveRef_, excerpt_, familyOf_, _reset() { _pending = null; _expandCache.clear(); _pools = { src: null, len: -1, byLang: {} }; }, setRetryDelay(ms) { _retryDelayMs = ms; } },
  };
  if (typeof window !== "undefined") window.AiRiset = api;
  else if (typeof globalThis !== "undefined") globalThis.AiRiset = api;
})();
