// Uji AI Chat: Riset Tema & Mode Khotbah (js/aichat-riset.js), hook di js/aichat.js,
// dan backend baru di apps-script/AiChatCode.gs (dijalankan di vm dengan Gemini TIRUAN).
// Butuh jsdom:  npm i jsdom  lalu  node tests/aichat-riset.jsdom.test.js
// Data Alkitab TIRUAN (12 kitab x 3 pasal x 25 ayat, Recovery Indonesia + Inggris), dengan
// kata umum "berkata" di ~50% ayat -- persis pola yang membuat pencarian lama gagal.
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
let JSDOM;
try { ({ JSDOM } = require("jsdom")); } catch (e) { ({ JSDOM } = require(require.resolve("jsdom", { paths: [process.cwd(), "/tmp/jt2/node_modules", "/tmp/jt/node_modules"] }))); }
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

let ok = true;
function expect(name, cond, extra) { console.log((cond ? "PASS" : "FAIL") + " - " + name + (cond ? "" : " :: " + JSON.stringify(extra))); if (!cond) ok = false; }

// =====================================================================
//  A. Modul riset di DOM tiruan
// =====================================================================
function newWindow() {
  const dom = new JSDOM('<!doctype html><body><div id="aiChatThread"></div></body>', { runScripts: "outside-only", pretendToBeVisual: true, url: "https://example.test/" });
  const w = dom.window;
  w.eval(read("js/books.js") + "\nwindow.BOOKS = BOOKS; if (typeof BOOK_ALIAS_INDEX !== 'undefined') window.BOOK_ALIAS_INDEX = BOOK_ALIAS_INDEX;");
  w.eval(`
    var CONFIG = { AI_CHAT_APPS_SCRIPT_URL: "https://script.test/exec", AI_CHAT_LEVELS: ["gembala"], LANGUAGES: [
      { code: "ind", label: "Indonesia (TB)" }, { code: "rvind", label: "Indonesia (Recovery)" },
      { code: "kjv", label: "Inggris (King James)" }, { code: "rveng", label: "Inggris (Recovery)" } ] };
    var currentUser = "budi", currentUserDisplay = "Budi", currentUserSaudara = "Saudara", currentLang = "ind";
    var bibleData = [], verseIndex = { ind: {}, rvind: {}, kjv: {}, rveng: {} };
    function noteHtmlToPlainText(h) { return String(h || "").replace(/<[^>]+>/g, " ").replace(/\\s+/g, " ").trim(); }
    function getChapterVerses(lang, book, ch) { return bibleData.filter((v) => v.lang === lang && v.bookNumber === book && v.chapter === ch); }
    function bookAvailableInLang(lang, book) { return bibleData.some((v) => v.lang === lang && v.bookNumber === book); }
    function parseReference(q) {
      const m = /^(.+?)\\s+(\\d+)(?::(\\d+)(?:-(\\d+))?)?$/.exec(String(q).trim());
      if (!m) return null;
      const b = BOOKS.find((x) => x.name.toLowerCase() === m[1].toLowerCase());
      if (!b) return null;
      return { book: b, chapter: Number(m[2]), verseStart: m[3] ? Number(m[3]) : null, verseEnd: m[4] ? Number(m[4]) : null };
    }
    var _aiChatState = { history: [], allowExternal: false, busy: false };
    var threadRenders = 0;
    function renderAiChatThread() { threadRenders++; }
    function el(id) { return document.getElementById(id); }
    var saved = [];
    function maybeSaveAiChatTurn(q, t) { saved.push({ q, text: t.text, sources: t.sources }); }
    var askCalls = [];
    var AiChatSync = { ask: async (p) => { askCalls.push(p); return { ok: true, answer: "JAWABAN-AI" }; } };
  `);
  // ---- data tiruan ----
  w.eval(`
    (function () {
      const books = BOOKS.slice(0, 12);
      let n = 0;
      books.forEach((b) => { for (let c = 1; c <= 3; c++) for (let v = 1; v <= 25; v++) {
        n++;
        const said = n % 2 === 0;
        const kasih = n % 37 === 0, jodoh = n % 53 === 0;
        let id = b.num + "_" + c + "_" + v;
        let ind = (said ? "Lalu berkata TUHAN kepada dia, " : "Maka pergilah dia ke sana, ") + "ayat nomor " + n + "." + (kasih ? " Kasihilah sesamamu." : "") + (jodoh ? " Carilah jodoh yang seiman." : "");
        let eng = (said ? "And the LORD said to him, " : "So he went there, ") + "verse number " + n + "." + (kasih ? " Love your neighbor." : "") + (jodoh ? " Seek a spouse of the same faith." : "");
        let noteInd = "", noteEng = "";
        if (n % 11 === 0) { noteInd = "<p>Catatan umum nomor " + n + " tentang perjalanan.</p>"; noteEng = "<p>General note " + n + " about the journey.</p>"; }
        if (n % 22 === 0) { noteInd = "<p>" + "Latar panjang. ".repeat(150) + "Kasih Allah adalah hakikat-Nya." + " Penutup.".repeat(5) + "</p>"; noteEng = "<p>" + "Long background. ".repeat(150) + "The love of God is His very nature." + "</p>"; }
        const base = { id: id, bookName: b.name, bookNumber: b.num, chapter: c, verse: v };
        bibleData.push(Object.assign({ lang: "rvind", text: ind, note: noteInd }, base));
        bibleData.push(Object.assign({ lang: "rveng", text: eng, note: noteEng }, base));
        bibleData.push(Object.assign({ lang: "ind", text: ind, note: "" }, base));
      } });
      // ayat dengan 3 kata topik sekaligus (untuk uji peringkat)
      const target = bibleData.find((x) => x.lang === "rvind" && x.bookNumber === books[3].num && x.chapter === 2 && x.verse === 7);
      target.text = "Kasih dan jodoh dipersatukan dalam pernikahan yang kudus.";
      const targetEn = bibleData.find((x) => x.lang === "rveng" && x.bookNumber === books[3].num && x.chapter === 2 && x.verse === 7);
      targetEn.text = "Love and a spouse are joined in a holy marriage.";
      ["ind", "rvind", "kjv", "rveng"].forEach((l) => { verseIndex[l] = bibleData.some((x) => x.lang === l) ? { loaded: 1 } : undefined; });
    })();
  `);
  // ---- fetch tiruan (backend) ----
  w.eval(`
    var backendCalls = [];
    var failSectionIdx = null; // nomor bagian (1..8) yang selalu gagal
    var EXPANSIONS = {
      exact: { topik: "kasih", audiens: "", jenis: "pencarian", judul: "", tesis: "", kata_ind: ["kasih", "mengasihi", "dikasihi"], kata_eng: ["love", "loved", "beloved"], kata_chs: [], kisah: [], ayat_kunci: [] },
      broad: { topik: "pacaran", audiens: "anak muda usia 17-24 tahun", jenis: "khotbah", judul: "Kasih yang Menuntun pada Jodoh", tesis: "Pacaran yang kudus dimulai dari kasih kepada Tuhan.",
               kata_ind: ["kasih", "jodoh", "pernikahan", "kekudusan"], kata_eng: ["love", "spouse", "marriage", "holy"], kata_chs: [],
               kisah: [{ tokoh: "Kisah pertama", rujukan: BOOKS[0].name + " 1" }, { tokoh: "Tak ada", rujukan: "Kitab Palsu 9" }], ayat_kunci: [BOOKS[3].name + " 2:7-8"] },
    };
    window.fetch = async function (url, opts) {
      const body = JSON.parse(opts.body);
      backendCalls.push(body);
      const reply = (o) => ({ ok: true, json: async () => o });
      if (body.type === "ai_riset_expand") return reply({ ok: true, expansion: EXPANSIONS[body.breadth] });
      if (body.type === "ai_khotbah_section") {
        if (failSectionIdx && body.section.index === failSectionIdx) return reply({ ok: false, error: "kuota habis" });
        const paras = []; for (let i = 0; i < body.section.paragraphs; i++) paras.push("Isi " + body.section.key + " paragraf " + (i + 1) + ".");
        return reply({ ok: true, text: paras.join("\\n\\n") });
      }
      return reply({ ok: false, error: "type tidak dikenal" });
    };
  `);
  w.eval(read("js/aichat-riset.js"));
  return w;
}
const ev = (w, code) => w.eval(code);
const langsDefault = (w) => w.AiRiset.getPrefs().langs;

(async () => {
  // ---------- 1) kata kunci ----------
  {
    const w = newWindow();
    const K = w.AiRiset.extractKeywords;
    const a = K("coba cari kata kasih di catatan kaki");
    expect("kata kunci 'cari kata kasih di catatan kaki' = [kasih]", JSON.stringify(a) === JSON.stringify(["kasih"]), a);
    const b = K("buatkan khotbah untuk anak muda usia 17-24 tahun tentang pacaran");
    expect("kalimat khotbah: 'pacaran' TIDAK terpotong; tidak ada kata perintah/umur", b.includes("pacaran") && !b.some((x) => ["buatkan", "khotbah", "usia", "17-24", "tahun", "untuk"].includes(x)), b);
    const c = K('apa kata Alkitab tentang "kasih karunia" dan pengampunan');
    expect("frasa dalam tanda kutip dipertahankan utuh", c.includes("kasih karunia") && c.includes("pengampunan"), c);
    expect("kata kunci tidak dibatasi 6 kata", K("kasih sukacita damai sejahtera kesabaran kemurahan kebaikan kesetiaan kelemahlembutan penguasaan").length >= 8);
    expect("varian imbuhan: kasih -> mengasih/pengasih", w.AiRiset._test.indoVariants("kasih").join() === "kasih,mengasih,pengasih", w.AiRiset._test.indoVariants("kasih"));
    expect("varian imbuhan: sesat -> menyesat.. (meny)", w.AiRiset._test.indoVariants("sesat").includes("menyesat"));
  }

  // ---------- 2) maksud pertanyaan ----------
  {
    const w = newWindow();
    const D = w.AiRiset.detectIntent;
    expect("intent: 'cari kata kasih di catatan kaki' = search", D("coba cari kata kasih di catatan kaki", "auto") === "search");
    expect("intent: khotbah pacaran = khotbah", D("buatkan khotbah untuk anak muda usia 17-24 tahun tentang pacaran", "auto") === "khotbah");
    expect("intent: pertanyaan biasa = qa", D("apa kata Alkitab tentang kekhawatiran?", "auto") === "qa");
    expect("intent: mode dipaksa khotbah / qa", D("halo", "khotbah") === "khotbah" && D("buatkan khotbah", "qa") === "qa");
    expect("scope: catatan kaki saja / ayat saja / keduanya", w.AiRiset.detectScope("cari di catatan kaki") === "notes" && w.AiRiset.detectScope("carikan ayat tentang kasih") === "verse" && w.AiRiset.detectScope("cari ayat dan catatan kaki") === "both");
  }

  // ---------- 3) pencarian ber-skor ----------
  {
    const w = newWindow();
    const T = w.AiRiset._test;
    const prefs = w.AiRiset.getPrefs();
    expect("bahasa bawaan = Recovery Indonesia + Recovery Inggris", JSON.stringify(prefs.langs) === JSON.stringify(["rvind", "rveng"]), prefs.langs);

    // kata umum "berkata" (~50% ayat) dibuang otomatis; "kasih" tetap dipakai
    const s = T.scanLang_("rvind", ["berkata", "kasih"], "both");
    expect("kata terlalu umum ('berkata') dibuang dari pencarian", s.dropped.includes("berkata") && s.used.includes("kasih"), { dropped: s.dropped, used: s.used });

    // semua kata ternyata umum -> jangan kosong, pakai yang paling jarang (maks 3)
    const s2 = T.scanLang_("rvind", ["berkata", "ayat", "dia"], "both");
    expect("semua kata umum -> tetap ada hasil (kata paling jarang dipakai)", s2.used.length >= 1 && s2.used.length <= 3 && s2.items.size > 0, { used: s2.used, dropped: s2.dropped });

    const r = await T.retrieve_({ question: "coba cari kata kasih di catatan kaki", intent: "search", prefs, scope: "notes" });
    // kebenaran-dasar (brute force independen) memakai kata yang benar-benar dipakai pencarian
    const truth = (lang, terms) => w.eval(`(function(){ const t=${JSON.stringify(terms)}; const set=new Set(); bibleData.filter(v=>v.lang==="${lang}").forEach(v=>{ if(!v.note) return; const n=noteHtmlToPlainText(v.note).toLowerCase(); if(t.some(x=>n.includes(x))) set.add(v.bookNumber+":"+v.chapter+":"+v.verse); }); return Array.from(set); })()`);
    const indSet = truth("rvind", r.terms.ind), engSet = truth("rveng", r.terms.eng);
    const union = new Set(indSet.concat(engSet));
    expect("kata kunci hasil: tidak mengandung kata perintah; ada padanan Inggris", !r.terms.ind.includes("cari") && !r.terms.ind.includes("kata") && r.terms.eng.includes("love"), r.terms);
    expect("jumlah catatan kaki dihitung tepat (gabungan lintas bahasa per ayat)", r.totals.note === union.size && union.size > 0, { got: r.totals.note, want: union.size });
    expect("rinci per bahasa cocok kebenaran-dasar", r.perLang.rvind.note === indSet.length && r.perLang.rveng.note === engSet.length, { perLang: r.perLang, ind: indSet.length, eng: engSet.length });
    expect("scope 'notes' -> tidak ada ayat, ada catatan", r.verses.length === 0 && r.notes.length > 0 && r.notes.length <= 40);
    expect("catatan berisi kata yang dicari (kutipan di sekitar kata)", r.notes.every((n) => /kasih|love/i.test(n.text)), r.notes.slice(0, 2));
    expect("kutipan catatan dipotong (<= ~500 karakter) walau catatan aslinya panjang", r.notes.every((n) => n.text.length <= 520), r.notes.map((n) => n.text.length));
    expect("tiap ayat hanya sekali (gabung lintas bahasa)", new Set(r.notes.map((n) => n.ref.replace(/ \(.*\)$/, ""))).size === r.notes.length);
    const summary = T.buildSearchSummary_(r);
    expect("ringkasan memuat angka pasti dari aplikasi", summary.includes("*" + r.totals.note + "*") && summary.includes("Indonesia (Recovery)") && summary.includes("Inggris (Recovery)"), summary);
  }

  // ---------- 4) peringkat & ayat kunci ----------
  {
    const w = newWindow();
    const T = w.AiRiset._test;
    const prefs = w.AiRiset.getPrefs();
    const r = await T.retrieve_({ question: "buatkan khotbah untuk anak muda usia 17-24 tahun tentang pacaran", intent: "khotbah", prefs, scope: "both" });
    expect("khotbah: pakai perluasan AI (bukan kata 'anak muda')", r.terms.ind.includes("jodoh") && !r.terms.ind.includes("anak") && !r.terms.ind.includes("muda"), r.terms.ind);
    expect("ayat yang memuat 3 kata topik (kasih+jodoh+pernikahan) peringkat 1", r.verses[0].ref.startsWith(w.BOOKS[3].name + " 2:7 (") && /pernikahan|marriage/.test(r.verses[0].text), r.verses[0]);
    expect("ayat kunci usulan AI diambil dari data lokal (bukan ingatan AI)", r.keyVerses.length > 0 && r.keyVerses.every((k) => /Kasih dan jodoh|Love and a spouse|verse number|ayat nomor/i.test(k.text)), r.keyVerses.slice(0, 2));
    expect("kisah: rujukan valid ikut, rujukan palsu dibuang", r.kisah.length === 1 && /Kisah pertama/.test(r.kisah[0].ref) && r.kisah[0].text.length > 50, r.kisah.map((k) => k.ref));
    // tanya-jawab biasa: batas jumlah bahan
    const chat = await w.AiRiset.searchForChat("apa kata Alkitab tentang kasih dan jodoh?");
    expect("searchForChat: <= 16 ayat & <= 8 catatan, ada isi", chat.verses.length > 0 && chat.verses.length <= 16 && chat.notes.length <= 8, { v: chat.verses.length, n: chat.notes.length });
  }

  // ---------- 5) alur pencarian ("cari kata kasih di catatan kaki") ----------
  {
    const w = newWindow();
    const handled = await w.AiRiset.maybeHandle("coba cari kata kasih di catatan kaki");
    const history = w.eval("_aiChatState.history");
    const turn = history[history.length - 1];
    const ask = w.eval("askCalls");
    expect("pertanyaan pencarian ditangani modul riset", handled === true && history.length === 1);
    expect("teks: angka pasti aplikasi di atas + jawaban AI", turn.text.includes("Hasil pencarian di data lokal") && turn.text.includes("JAWABAN-AI"), turn.text.slice(0, 200));
    expect("AI dipanggil dengan bahan + ringkasan + mode search + panjang sedang", ask.length === 1 && ask[0].mode === "search" && ask[0].length === "medium" && ask[0].context.notes.length > 0 && /Hasil pencarian/.test(ask[0].context.searchSummary), ask[0] && { mode: ask[0].mode, length: ask[0].length });
    expect("sumber tiap catatan <= 500 karakter", turn.sources.length > 0 && turn.sources.every((s) => s.text.length <= 500));
    expect("riwayat disimpan", w.eval("saved").length === 1);

    // tanpa hasil -> tidak memanggil AI, jujur
    const w2 = newWindow();
    w2.eval('EXPANSIONS.exact = { topik: "zzz", kata_ind: ["zzzqqq"], kata_eng: ["zzzqqq"], kata_chs: [], kisah: [], ayat_kunci: [] };');
    await w2.AiRiset.maybeHandle("cari kata zzzqqq di catatan kaki");
    const t2 = w2.eval("_aiChatState.history")[0];
    expect("tidak ada hasil -> jujur & AI tidak dipanggil", /Tidak ada ayat maupun catatan kaki/.test(t2.text) && w2.eval("askCalls").length === 0, t2.text);
  }

  // ---------- 6) alur khotbah bagian demi bagian ----------
  {
    const w = newWindow();
    w.AiRiset._test.setRetryDelay(1);
    const q = "buatkan khotbah untuk anak muda usia 17-24 tahun tentang pacaran";
    const handled = await w.AiRiset.maybeHandle(q);
    const turn = w.eval("_aiChatState.history")[0];
    const calls = w.eval("backendCalls").filter((c) => c.type === "ai_khotbah_section");
    expect("khotbah ditangani modul riset", handled === true);
    expect("8 bagian, tiap bagian satu panggilan AI", calls.length === 8, calls.length);
    const total = calls.reduce((a, c) => a + c.section.paragraphs, 0);
    expect("panjang otomatis untuk khotbah = 20 paragraf", total === 20, total);
    const titles = calls.map((c) => c.section.key).join(",");
    expect("urutan bagian: pembuka, ayat awal, isi, dampak, contoh, menarik, berlawanan, kesimpulan", titles === "pembuka,ayat_awal,isi,dampak,contoh,menarik,berlawanan,kesimpulan", titles);
    expect("topik/audiens/judul dari perluasan AI diteruskan", calls[0].topik === "pacaran" && /17-24/.test(calls[0].audiens) && calls[0].judul === "Kasih yang Menuntun pada Jodoh");
    expect("bagian berikutnya menerima ringkasan bagian sebelumnya", calls[0].previous.length === 0 && calls[4].previous.length === 4 && calls[7].previous.length === 7);
    expect("teks kisah hanya dikirim untuk bagian 'contoh'", calls.filter((c) => c.context.kisah.length).map((c) => c.section.key).join() === "contoh");
    expect("cerita dari luar data aktif (bawaan)", calls.every((c) => c.allowExternal === true));
    expect("judul bagian memuat topik", /Hal yang Menarik tentang pacaran/.test(turn.text) && /Konsep pacaran Masa Kini|Konsep pacaran/.test(turn.text), turn.text.slice(0, 400));
    const idx = ["Pembuka", "Ayat Awal", "Isi: Pokok-pokok Firman", "Dampak", "Contoh dari Alkitab", "Hal yang Menarik", "Hal yang Berlawanan", "Kesimpulan"].map((t) => turn.text.indexOf(t));
    expect("8 judul bagian ada & berurutan di teks akhir", idx.every((i, k) => i >= 0 && (k === 0 || i > idx[k - 1])), idx);
    expect("teks akhir berisi 20 paragraf isi", (turn.text.match(/paragraf \d\./g) || []).length === 20);
    expect("tidak ada penanda '⏳' tersisa & judul khotbah di atas", !/⏳/.test(turn.text) && turn.text.startsWith("*🎤 Kasih yang Menuntun pada Jodoh*"), turn.text.slice(0, 80));
    expect("sumber ada, tiap teks <= 500 karakter", turn.sources.length > 5 && turn.sources.every((s) => s.text.length <= 500));
    expect("riwayat disimpan sekali", w.eval("saved").length === 1);
  }

  // ---------- 7) khotbah: berhenti di tengah lalu "lanjutkan" ----------
  {
    const w = newWindow();
    w.AiRiset._test.setRetryDelay(1);
    w.eval("failSectionIdx = 4;");
    await w.AiRiset.maybeHandle("buatkan khotbah tentang pacaran");
    let hist = w.eval("_aiChatState.history");
    expect("gagal di bagian 4 -> tampil sebagian + petunjuk 'lanjutkan'", /Berhenti di bagian 4/.test(hist[0].text) && /lanjutkan/.test(hist[0].text) && /Pembuka/.test(hist[0].text) && !/Dampak\*/.test(hist[0].text) && w.AiRiset.hasPending(), hist[0].text.slice(-200));
    const tries = w.eval("backendCalls").filter((c) => c.type === "ai_khotbah_section" && c.section.index === 4).length;
    expect("bagian yang gagal dicoba ulang sekali (2 percobaan)", tries === 2, tries);
    w.eval("failSectionIdx = null;");
    const handled = await w.AiRiset.maybeHandle("lanjutkan");
    hist = w.eval("_aiChatState.history");
    const cont = hist[hist.length - 1];
    expect("'lanjutkan' meneruskan mulai bagian 4 sampai 8", handled === true && /\(lanjutan\)/.test(cont.text) && /Dampak/.test(cont.text) && /Kesimpulan/.test(cont.text) && !/Pembuka\*/.test(cont.text) && !w.AiRiset.hasPending(), cont.text.slice(0, 200));
    const secCalls = w.eval("backendCalls").filter((c) => c.type === "ai_khotbah_section" && !c.section.failed);
    expect("bagian 1-3 tidak dibuat ulang", secCalls.filter((c) => c.section.index === 1).length === 1);
  }

  // ---------- 7b) data belum dimuat ----------
  {
    const w = newWindow();
    w.eval("bibleData.length = 0;");
    await w.AiRiset.maybeHandle("cari kata kasih di catatan kaki");
    await w.AiRiset.maybeHandle("buatkan khotbah tentang kasih");
    const h = w.eval("_aiChatState.history");
    expect("data Alkitab belum dimuat -> pesan jelas (bukan 'tidak ada'), AI tidak dipanggil", h.length === 2 && h.every((x) => /belum dimuat/.test(x.text)) && w.eval("askCalls").length === 0 && w.eval("backendCalls").length === 0, h.map((x) => x.text.slice(0, 60)));
  }

  // ---------- 8) panel pengaturan & pilihan ----------
  {
    const w = newWindow();
    const host = w.document.createElement("div");
    w.document.body.appendChild(host);
    w.AiRiset.renderControls(host);
    const boxes = Array.from(host.querySelectorAll(".ai-riset-langs input"));
    expect("pengaturan: hanya bahasa yang datanya ada (3), hanya Recovery Indonesia & Inggris tercentang", boxes.length === 3 && boxes.filter((b) => b.checked).map((b) => b.value).join() === "rvind,rveng", boxes.map((b) => b.value + b.checked));
    boxes.find((b) => b.value === "ind").checked = true;
    boxes.find((b) => b.value === "ind").dispatchEvent(new w.Event("change"));
    expect("mencentang bahasa tersimpan; Recovery tetap didahulukan", w.AiRiset.getPrefs().langs.join() === "rvind,rveng,ind", w.AiRiset.getPrefs().langs);
    const selects = host.querySelectorAll("select");
    selects[1].value = "short"; selects[1].dispatchEvent(new w.Event("change"));
    expect("panjang jawaban 'Ringkas' tersimpan & terbaca aichat", w.AiRiset.lengthFor() === "short");
    selects[0].value = "qa"; selects[0].dispatchEvent(new w.Event("change"));
    expect("mode 'Tanya-jawab' memaksa jalur biasa", (await w.AiRiset.maybeHandle("buatkan khotbah tentang kasih")) === false);
    // panjang ringkas = 8 paragraf
    w.eval('localStorage.setItem("ai_riset_prefs_v1", JSON.stringify({ mode: "khotbah", length: "short", langs: ["rvind"] }))');
    w.AiRiset._test.setRetryDelay(1);
    await w.AiRiset.maybeHandle("khotbah pacaran");
    const cs = w.eval("backendCalls").filter((c) => c.type === "ai_khotbah_section");
    expect("khotbah 'Ringkas' = 8 paragraf", cs.reduce((a, c) => a + c.section.paragraphs, 0) === 8);
    // bahasa yang datanya tidak ada -> jatuh ke bahasa aktif
    const w3 = newWindow();
    w3.eval('localStorage.setItem("ai_riset_prefs_v1", JSON.stringify({ langs: ["chs"] }))');
    expect("bahasa pilihan tak ada datanya -> jatuh ke bahasa yang sedang aktif", w3.AiRiset.getPrefs().langs.join() === "ind", w3.AiRiset.getPrefs().langs);
  }

  // =====================================================================
  //  B. Hook di js/aichat.js (berkas ASLI dimuat dengan stub minimal)
  // =====================================================================
  {
    const w = newWindow();
    w.eval(`
      var currentUserLevels = ["gembala"]; function isPremiumUser() { return false; }
      function escapeHtml(s) { return String(s); } function hideAllPanels() {} function logActivity() {}
      function detectBookInQuestion() { return null; } async function getAllPokokRows() { return []; }
      var maybeSaveCalls = 0;
    `);
    // pakai aichat.js asli: buang definisi yang bentrok dengan stub di atas
    w.eval(read("js/aichat.js").replace(/^const _aiChatState = \{[\s\S]*?\n\};\n/m, "").replace("const AiChatSync = {", "window.__RealSync = {"));
    w.eval("var AiChatSync = { ask: async (p) => { askCalls.push(p); return { ok: true, answer: 'JAWABAN-QA' }; } };");
    expect("aichat.js: extractAiChatKeywords mendelegasikan ke modul riset", JSON.stringify(w.extractAiChatKeywords("coba cari kata kasih di catatan kaki")) === '["kasih"]');
    const realAsk = w.__RealSync.ask.toString();
    expect("aichat.js: AiChatSync.ask meneruskan 'length' & 'mode' ke backend", /length, mode/.test(realAsk) || /allowExternal, history, length, mode/.test(realAsk), realAsk.slice(0, 200));
    // tanya-jawab biasa: bahan dari riset + panjang jawaban dikirim
    w.eval("_aiChatState.history = [];");
    w.eval('localStorage.setItem("ai_riset_prefs_v1", JSON.stringify({ mode: "qa", length: "long" }))');
    w.document.body.innerHTML += '<div id="aiChatThread"></div><button id="aiChatSendBtn"></button>';
    await w.eval('handleAiChatAsk("apa kata Alkitab tentang kasih dan jodoh?")');
    const ask = w.eval("askCalls");
    if (!ask.length) console.log("DEBUG riwayat:", JSON.stringify(w.eval("_aiChatState.history")).slice(0, 400));
    expect("tanya-jawab biasa: bahan hasil riset (Recovery) + length 'long' dikirim ke AI", ask.length === 1 && ask[0].length === "long" && ask[0].context.verses.length > 0 && /Recovery/.test(ask[0].context.verses[0].ref), ask[0] && { length: ask[0].length, v: ask[0].context.verses.length });
    // panel AI Chat asli memasang pengaturan riset di bawah kotak "Izinkan referensi luar"
    w.eval("AiChatSync.enabled = () => true;");
    w.document.body.innerHTML = '<div id="aiChatPanel"></div><div id="aiChatThread"></div>';
    w.eval("renderAiChatPanel()");
    const panelEl = w.document.getElementById("aiChatPanel");
    const kids = Array.from(panelEl.children).map((c) => c.className);
    const iTog = kids.findIndex((c) => /ai-chat-toggle/.test(c)), iCtl = kids.findIndex((c) => /ai-riset-controls/.test(c)), iThr = kids.findIndex((c) => /ai-chat-thread/.test(c));
    expect("panel AI Chat: pengaturan riset muncul tepat di bawah kotak referensi luar, sebelum percakapan", iTog >= 0 && iCtl === iTog + 1 && iThr === iCtl + 1, kids);
    // pertanyaan pencarian lewat handleAiChatAsk asli -> modul riset
    w.eval("askCalls.length = 0; _aiChatState.history = [];");
    w.eval('localStorage.setItem("ai_riset_prefs_v1", "{}")');
    await w.eval('handleAiChatAsk("coba cari kata kasih di catatan kaki")');
    const h = w.eval("_aiChatState.history");
    expect("handleAiChatAsk: 'cari kata kasih di catatan kaki' -> ringkasan pasti + jawaban (tidak lagi 'tidak ada')", h.length === 2 && /Hasil pencarian di data lokal/.test(h[1].text) && !/tidak ada/i.test(h[1].text.split("\n")[0]), h.map((x) => x.text.slice(0, 80)));
  }

  // =====================================================================
  //  C. Backend AiChatCode.gs di vm (Gemini TIRUAN)
  // =====================================================================
  {
    const gs = read("apps-script/AiChatCode.gs");
    const geminiCalls = [];
    let nextGemini = null;
    const rows = [];
    const sandbox = {
      console, JSON, Math, Date, String, Number, Array, Object, Error, parseInt, parseFloat,
      ContentService: { MimeType: { JSON: "json" }, createTextOutput: (t) => ({ text: t, setMimeType() { return this; } }) },
      PropertiesService: { getScriptProperties: () => ({ getProperty: () => "KEY" }) },
      SpreadsheetApp: {},
      UrlFetchApp: { fetch: (url, opts) => { geminiCalls.push(JSON.parse(opts.payload)); const r = nextGemini || { text: "ok" }; return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ candidates: [{ content: { parts: [{ text: r.text }] }, finishReason: r.finishReason || "STOP" }] }) }; } },
    };
    vm.createContext(sandbox);
    vm.runInContext(gs, sandbox);
    vm.runInContext("isPastoralUser_ = function () { return true; }; isPremiumUser_ = function () { return true; }; getAiChatHistorySheet_ = function () { return { appendRow: function (r) { __rows.push(r); } }; };", Object.assign(sandbox, { __rows: rows }));
    const post = (o) => JSON.parse(sandbox.doPost({ postData: { contents: JSON.stringify(o) } }).text);
    const base = { username: "budi", question: "apa itu kasih?" };

    nextGemini = { text: "jawaban" };
    let r = post(Object.assign({ type: "ai_chat", length: "long" }, base));
    let p = geminiCalls[geminiCalls.length - 1];
    expect("ai_chat panjang 'long': 8192 token & instruksi 15-20 paragraf, tanpa 'singkat, jelas'", r.ok && p.generationConfig.maxOutputTokens === 8192 && /15 sampai 20 paragraf/.test(p.systemInstruction.parts[0].text) && !/singkat, jelas/.test(p.systemInstruction.parts[0].text));
    post(Object.assign({ type: "ai_chat", length: "short" }, base));
    p = geminiCalls[geminiCalls.length - 1];
    expect("ai_chat 'short': 1536 token", p.generationConfig.maxOutputTokens === 1536);
    post(Object.assign({ type: "ai_chat" }, base));
    p = geminiCalls[geminiCalls.length - 1];
    expect("ai_chat tanpa pilihan (auto): 4096 token (dulu 1024) & 'sesuaikan dengan pertanyaan'", p.generationConfig.maxOutputTokens === 4096 && /sesuaikan dengan pertanyaan/.test(p.systemInstruction.parts[0].text));
    post(Object.assign({ type: "ai_chat", mode: "search", context: { searchSummary: "Ditemukan 12 catatan", notes: [{ ref: "Roma 5:5", text: "kasih Allah" }] } }, base));
    p = geminiCalls[geminiCalls.length - 1];
    expect("ai_chat mode search: ringkasan lokal masuk bahan & AI dilarang bilang 'tidak ada'", /RINGKASAN PENCARIAN LOKAL/.test(p.contents[0].parts[0].text) && /Ditemukan 12 catatan/.test(p.contents[0].parts[0].text) && /JANGAN pernah menjawab bahwa tidak ada/.test(p.systemInstruction.parts[0].text));
    nextGemini = { text: "jawaban panjang", finishReason: "MAX_TOKENS" };
    r = post(Object.assign({ type: "ai_chat" }, base));
    expect("jawaban terpotong (MAX_TOKENS) diberi catatan 'lanjutkan'", /terpotong/.test(r.answer) && /lanjutkan/.test(r.answer), r.answer);

    // perluasan kata kunci
    nextGemini = { text: "```json\n" + JSON.stringify({ topik: "pacaran", audiens: "anak muda", jenis: "khotbah", judul: "J", tesis: "T", kata_ind: ["Kasih", "JODOH", "x".repeat(80)], kata_eng: ["love"], kata_chs: [], kisah: [{ tokoh: "Ishak", rujukan: "Kejadian 24" }, { tokoh: "", rujukan: "" }], ayat_kunci: ["kejadian 2:18-24"] }) + "\n```" };
    r = post({ type: "ai_riset_expand", username: "budi", question: "khotbah pacaran", breadth: "broad", wantLangs: ["ind", "eng"] });
    p = geminiCalls[geminiCalls.length - 1];
    expect("ai_riset_expand: JSON berpagar ``` tetap terbaca & dibersihkan", r.ok && r.expansion.kata_ind.join() === "kasih,jodoh" && r.expansion.kata_eng.join() === "love" && r.expansion.kisah.length === 1 && r.expansion.ayat_kunci[0] === "Kejadian 2:18-24", r);
    expect("ai_riset_expand: minta padanan Inggris hanya kalau bahasanya dipilih, mode luas", /kata_eng/.test(p.systemInstruction.parts[0].text) && !/kata_chs/.test(p.systemInstruction.parts[0].text) && /MODE LUAS/.test(p.systemInstruction.parts[0].text));
    post({ type: "ai_riset_expand", username: "budi", question: "cari kasih", breadth: "exact", wantLangs: ["ind"] });
    p = geminiCalls[geminiCalls.length - 1];
    expect("ai_riset_expand mode tepat: tanpa sinonim", /MODE TEPAT/.test(p.systemInstruction.parts[0].text) && !/kata_eng/.test(p.systemInstruction.parts[0].text));
    nextGemini = { text: "bukan json sama sekali" };
    r = post({ type: "ai_riset_expand", username: "budi", question: "x", breadth: "broad", wantLangs: ["ind"] });
    expect("ai_riset_expand: balasan bukan JSON -> galat rapi (aplikasi jatuh ke kata kunci lokal)", r.ok === false && /JSON/.test(r.error), r);

    // bagian khotbah
    nextGemini = { text: "Paragraf satu.\n\nParagraf dua." };
    r = post({ type: "ai_khotbah_section", username: "budi", topik: "pacaran", audiens: "anak muda", judul: "J", tesis: "T", allowExternal: true,
      section: { key: "isi", title: "Isi", paragraphs: 3, guidance: "Uraikan pokok.", index: 3, total: 8 },
      context: { verses: [{ ref: "Roma 5:8", text: "Kasih Allah..." }], notes: [{ ref: "Roma 5:5", text: "catatan" }], kisah: [{ ref: "Ishak, Kejadian 24", text: "1. ..." }] },
      previous: [{ title: "Pembuka", text: "Buka." }] });
    p = geminiCalls[geminiCalls.length - 1];
    const sys = p.systemInstruction.parts[0].text, usr = p.contents[0].parts[0].text;
    expect("ai_khotbah_section: TEPAT 3 paragraf, cerita luar boleh (ditandai), bahan & bagian sebelumnya masuk", r.ok && /TEPAT 3 paragraf/.test(sys) && /latar di luar data/.test(sys) && /Roma 5:8/.test(usr) && /CATATAN KAKI RECOVERY/.test(usr) && /TEKS KISAH ALKITAB/.test(usr) && /## Pembuka/.test(usr) && p.generationConfig.maxOutputTokens === 4096, { r });
    post({ type: "ai_khotbah_section", username: "budi", topik: "x", allowExternal: false, section: { key: "isi", title: "Isi", paragraphs: 2 }, context: {}, previous: [] });
    p = geminiCalls[geminiCalls.length - 1];
    expect("ai_khotbah_section: cerita luar dimatikan -> dilarang memakai pengetahuan di luar bahan", /JANGAN memakai pengetahuan di luar BAHAN/.test(p.systemInstruction.parts[0].text));
    nextGemini = { text: "" };
    r = post({ type: "ai_khotbah_section", username: "budi", topik: "x", section: { key: "isi", title: "Isi", paragraphs: 2 }, context: {} });
    expect("ai_khotbah_section: balasan kosong -> galat rapi", r.ok === false, r);

    // simpan riwayat tidak boleh melewati batas 50.000 karakter/sel
    const bigSources = []; for (let i = 0; i < 200; i++) bigSources.push({ kind: "note", ref: "Roma 5:" + i, text: "x".repeat(2000) });
    r = post({ type: "ai_chat_save", username: "budi", sessionId: "s1", question: "q".repeat(9000), answer: "a".repeat(80000), sources: bigSources });
    const row = rows[rows.length - 1];
    expect("simpan riwayat: khotbah sangat panjang + 200 sumber tetap muat (semua sel <= 50.000)", r.ok && r.saved && row.every((c) => String(c).length <= 50000) && JSON.parse(row[6]).length >= 1 && JSON.parse(row[6]).every((s) => s.text.length <= 400), row.map((c) => String(c).length));
  }

  console.log(ok ? "\nSEMUA LULUS" : "\nADA YANG GAGAL");
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
