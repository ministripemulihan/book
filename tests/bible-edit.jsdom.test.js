// Uji Edit Ayat oleh administrator: sisi aplikasi (js/bible-edit.js) di DOM tiruan
// + sisi server (apps-script/Code.gs: tab Annotations & BibleEdits) di vm dengan Sheet TIRUAN.
// Butuh jsdom:  npm i jsdom  lalu  node tests/bible-edit.jsdom.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
let JSDOM;
try { ({ JSDOM } = require("jsdom")); } catch (e) { ({ JSDOM } = require(require.resolve("jsdom", { paths: [process.cwd(), "/tmp/jt2/node_modules", "/tmp/jt/node_modules"] }))); }
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
let ok = true;
function expect(name, cond, extra) { console.log((cond ? "PASS" : "FAIL") + " - " + name + (cond ? "" : " :: " + JSON.stringify(extra))); if (!cond) ok = false; }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Teks mentah seperti di CSV (dengan tanda catatan kaki) + versi Inggris.
const RAW_IND = "Inilah <FR><sup>1a</sup><Fr>daftar nenek moyang <FR><sup>2</sup><Fr>Yesus Kristus.";

function newWindow(opts) {
  opts = opts || {};
  const dom = new JSDOM(`<!doctype html><body><div id="moreMenu"></div><button id="bibleEditMenuBtn" hidden></button>
    <div id="notesPanel"></div><article id="reader"><div id="readerVerses"></div></article></body>`, { runScripts: "outside-only", pretendToBeVisual: true, url: "https://example.test/" });
  const w = dom.window;
  w.alerts = []; w.alert = (m) => w.alerts.push(m);
  w.confirmAnswer = true; w.confirm = () => w.confirmAnswer;
  w.eval(read("js/books.js") + "\nwindow.BOOKS = BOOKS;");
  w.eval(read("js/csv.js").replace(/^const /gm, "var ") );
  w.eval(read("js/footnotes.js").replace(/^const /gm, "var "));
  w.eval(`
    var CONFIG = { LANGUAGES: [{ code: "rvind", label: "Indonesia (Recovery)" }, { code: "rveng", label: "Inggris (Recovery)" }] };
    var currentUser = ${JSON.stringify(opts.user || "admin1")}, currentUserLevels = ${JSON.stringify(opts.levels || ["administrator"])};
    function isAdministrator() { return currentUserLevels.includes("administrator"); }
    var currentLang = "rvind", currentBookNum = 40, currentChapter = 1, highlightVerse = null;
    function makeVerse(lang, verseId, b, c, v, raw, note) {
      const o = normalizeVerseRecord({ bahasa: lang, "verse id": verseId, "book name": BOOKS.find((x) => x.num === b).name, "book number": String(b), chapter: String(c), verse: String(v), text: raw, note: note || "" });
      return o;
    }
    var bibleData, verseById;
    function freshData() {
      bibleData = [
        makeVerse("rvind", "40001001", 40, 1, 1, ${JSON.stringify(RAW_IND)}, "<p>catatan</p>"),
        makeVerse("rvind", "40001002", 40, 1, 2, "Abraham memperanakkan Ishak.", ""),
        makeVerse("rveng", "40001001", 40, 1, 1, "The book of the genealogy of Jesus Christ.", ""),
      ];
      verseById = {}; bibleData.forEach((v) => { verseById[v.id] = v; });
    }
    freshData();
    var rerenders = 0;
    function renderChapter() { rerenders++; }
    function hideAllPanels() { ["bibleEditPanel", "notesPanel"].forEach((i) => { const e = document.getElementById(i); if (e) e.hidden = true; }); }
    function closeSidebarOnMobile() {}
    var idbPuts = [], idbMeta = { lastSync: "t1" };
    var LocalDB = { bulkPut: async (arr) => { idbPuts.push(arr.map((v) => v.id + "|" + v.text)); }, getMeta: async (k) => idbMeta[k] };
    var calls = [], serverEdits = [], serverTime = "2026-09-21T09:00:00.000Z", syncOn = ${opts.syncOff ? "false" : "true"}, postReply = null;
    var Sync = { enabled: () => syncOn,
      _get: async (p) => { calls.push({ get: p }); const since = p.since || ""; return { ok: true, edits: serverEdits.filter((e) => !since || e.at > since), serverTime }; },
      _post: async (p) => { calls.push({ post: p }); if (postReply === "throw") throw new Error("offline"); return postReply || { ok: true, editedAt: "2026-09-21T09:30:00.000Z", orig: p.orig }; } };
  `);
  w.eval(read("js/bible-edit.js"));
  return w;
}
const V1 = 'bibleData[0]';

(async () => {
  // ---------- 1) teks mentah <-> kotak edit ----------
  {
    const w = newWindow(); const T = w.BibleEdit._test;
    const v = w.eval(V1);
    expect("ayat Recovery: teks bersih tanpa tanda, markedText berisi penanda", v.text === "Inilah daftar nenek moyang Yesus Kristus." && v.markedText.includes("\u0001"), { t: v.text });
    const ed = T.editorTextFromRaw_(T.rawFromVerse_(v));
    expect("kotak edit menampilkan tanda catatan kaki sebagai [[1a]] [[2]]", ed === "Inilah [[1a]]daftar nenek moyang [[2]]Yesus Kristus.", ed);
    expect("bolak-balik [[..]] <-> mentah tanpa kehilangan tanda", T.toRaw_(ed) === RAW_IND, T.toRaw_(ed));
    expect("ayat tanpa tanda: apa adanya", T.rawFromVerse_(w.eval("bibleData[1]")) === "Abraham memperanakkan Ishak.");
  }

  // ---------- 2) menerapkan edit ke data + tetap ada setelah unduh ulang ----------
  {
    const w = newWindow(); const B = w.BibleEdit; const T = B._test;
    const newRaw = "Inilah <FR><sup>1a</sup><Fr>silsilah nenek moyang <FR><sup>2</sup><Fr>Yesus Kristus.";
    T.cache_get().edits["rvind_40001001"] = { id: "rvind_40001001", lang: "rvind", bookNumber: 40, chapter: 1, verse: 1, raw: newRaw, orig: RAW_IND, by: "admin1", at: "2026-09-21T08:00:00.000Z", reverted: false };
    const changed = B.applyToBibleData();
    const v = w.eval(V1);
    expect("edit diterapkan: teks bersih & teks bertanda ikut berubah", changed.length === 1 && v.text === "Inilah silsilah nenek moyang Yesus Kristus." && v.markedText.includes("silsilah") && v.markedText.includes("\u0001"), { t: v.text });
    expect("hanya ayat & bahasa yang diedit yang berubah", w.eval("bibleData[2].text") === "The book of the genealogy of Jesus Christ." && w.eval("bibleData[1].text") === "Abraham memperanakkan Ishak.");
    expect("diterapkan dua kali: tidak ada perubahan lagi (idempoten)", B.applyToBibleData().length === 0);
    // "unduh ulang Alkitab": data segar dari CSV asli -> onDataReady (dipanggil buildIndexes) menerapkan edit lagi
    w.eval("freshData();");
    expect("data hasil unduh ulang kembali ke teks ASLI dulu", w.eval(V1 + ".text") === "Inilah daftar nenek moyang Yesus Kristus.");
    B.onDataReady();
    expect("setelah data dimuat, edit administrator diterapkan lagi (offline pun)", w.eval(V1 + ".text") === "Inilah silsilah nenek moyang Yesus Kristus.");
    expect("ayat yang diedit ikut disimpan ke IndexedDB", w.eval("idbPuts").some((p) => p.some((x) => /^rvind_40001001\|Inilah silsilah/.test(x))), w.eval("idbPuts"));
  }

  // ---------- 3) kembali ke asli & pengaman ----------
  {
    const w = newWindow(); const B = w.BibleEdit; const T = B._test;
    const e = { id: "rvind_40001002", lang: "rvind", bookNumber: 40, chapter: 1, verse: 2, raw: "Abraham melahirkan Ishak.", orig: "Abraham memperanakkan Ishak.", by: "a", at: "2026-09-21T08:00:00.000Z", reverted: false };
    T.cache_get().edits[e.id] = e;
    B.applyToBibleData();
    expect("edit terpasang", w.eval("bibleData[1].text") === "Abraham melahirkan Ishak.");
    e.reverted = true;
    B.applyToBibleData();
    expect("dikembalikan ke asli", w.eval("bibleData[1].text") === "Abraham memperanakkan Ishak." && !w.eval("bibleData[1]._edited"));
    // Sheet Alkitab dikoreksi belakangan (teks di data BUKAN hasil edit) -> jangan ditimpa teks asli lama
    w.eval('bibleData[1].text = "Abraham memperanakkan Ishak (koreksi Sheet)."; delete bibleData[1]._edited;');
    B.applyToBibleData();
    expect("koreksi terbaru di Sheet tidak ditimpa oleh 'asli' yang sudah basi", w.eval("bibleData[1].text") === "Abraham memperanakkan Ishak (koreksi Sheet).");
  }

  // ---------- 4) tarik daftar edit dari server ----------
  {
    const w = newWindow(); const B = w.BibleEdit; const T = B._test;
    w.eval(`serverEdits = [{ id: "rvind_40001002", lang: "rvind", bookNumber: 40, chapter: 1, verse: 2, raw: "Abraham melahirkan Ishak.", orig: "Abraham memperanakkan Ishak.", by: "admin1", at: "2026-09-21T07:00:00.000Z", reverted: false }];`);
    expect("refresh pertama menarik SEMUA edit (since kosong) & menerapkannya", (await B.refresh(false)) === true && w.eval("calls")[0].get.since === "" && w.eval("bibleData[1].text") === "Abraham melahirkan Ishak.");
    expect("refresh dibatasi (10 menit) supaya tidak membebani server", (await B.refresh(false)) === false);
    w.eval(`serverEdits.push({ id: "rvind_40001001", lang: "rvind", bookNumber: 40, chapter: 1, verse: 1, raw: "Kitab silsilah Yesus Kristus.", orig: ${JSON.stringify(RAW_IND)}, by: "admin1", at: "2026-09-21T08:30:00.000Z", reverted: false });`);
    expect("refresh paksa menarik yang baru saja (since = waktu server terakhir)", (await B.refresh(true)) === true && w.eval("bibleData[0].text") === "Kitab silsilah Yesus Kristus." && w.eval("rerenders") >= 1, w.eval("calls").map((c) => c.get && c.get.since));
    // setelah "unduh ulang" (penanda lastSync di IndexedDB berubah) -> tarik LENGKAP lagi
    w.eval('idbMeta.lastSync = "t2"; calls.length = 0;');
    await B.refresh(false);
    expect("setelah unduh ulang Alkitab: daftar edit ditarik lengkap dari server", w.eval("calls")[0].get.since === "", w.eval("calls"));
    // edit dengan waktu lebih lama tidak menimpa yang lebih baru
    w.eval(`serverEdits = [{ id: "rvind_40001002", lang: "rvind", bookNumber: 40, chapter: 1, verse: 2, raw: "VERSI LAMA", orig: "x", by: "z", at: "2020-01-01T00:00:00.000Z", reverted: false }];`);
    await B.refresh(true);
    expect("edit lama tidak menimpa edit yang lebih baru", T.cache_get().edits["rvind_40001002"].raw === "Abraham melahirkan Ishak.");
    // tanpa server
    const wOff = newWindow({ syncOff: true });
    expect("tanpa APPS_SCRIPT_URL: tidak error, tidak menarik", (await wOff.BibleEdit.refresh(true)) === false);
  }

  // ---------- 5) kotak edit: hanya admin, password, simpan, kembalikan ----------
  {
    const w = newWindow({ user: "budi", levels: [] });
    w.BibleEdit.openEditor(w.eval(V1));
    expect("bukan administrator: kotak edit tidak terbuka", !w.document.getElementById("bibleEditOverlay") && w.alerts.length === 1);
  }
  {
    const w = newWindow(); const B = w.BibleEdit; const d = w.document;
    B.openEditor(w.eval(V1));
    const ta = d.querySelector(".bedit-textarea");
    expect("kotak edit: berisi teks dengan tanda [[..]] + teks asli terlipat", ta.value === "Inilah [[1a]]daftar nenek moyang [[2]]Yesus Kristus." && /daftar/.test(d.querySelector(".bedit-orig-text").textContent));
    const saveBtn = () => Array.from(d.querySelectorAll(".bedit-actions button")).find((b) => /Simpan/.test(b.textContent));
    saveBtn().click(); await wait(5);
    expect("tanpa perubahan -> pesan, tidak kirim", /Belum ada perubahan/.test(d.querySelector(".bedit-msg").textContent) && w.eval("calls.filter(c=>c.post).length") === 0);
    ta.value = "Inilah [[1a]]silsilah nenek moyang [[2]]Yesus Kristus."; saveBtn().click(); await wait(5);
    expect("tanpa password -> diminta password, tidak kirim", /password/i.test(d.querySelector(".bedit-msg").textContent) && w.eval("calls.filter(c=>c.post).length") === 0);
    d.querySelector(".bedit-pw input").value = "rahasia"; ta.value = ""; saveBtn().click(); await wait(5);
    expect("teks kosong ditolak", /tidak boleh kosong/.test(d.querySelector(".bedit-msg").textContent));
    ta.value = "Inilah [[1a]]silsilah nenek moyang [[2]]Yesus Kristus.";
    w.eval('postReply = { ok: false, error: "Password salah." };');
    saveBtn().click(); await wait(10);
    expect("password salah dari server -> pesan tampil, kotak tetap terbuka, ayat tidak berubah", /Password salah/.test(d.querySelector(".bedit-msg").textContent) && !!d.getElementById("bibleEditOverlay") && w.eval(V1 + ".text") === "Inilah daftar nenek moyang Yesus Kristus.");
    w.eval("postReply = null;");
    saveBtn().click(); await wait(10);
    const post = w.eval("calls.filter(c=>c.post).slice(-1)[0].post");
    expect("kirim ke server: jenis, akun, password, ayat, teks mentah & teks asli", post.type === "bible_edit" && post.username === "admin1" && post.password === "rahasia" && post.verseId === "rvind_40001001" && post.raw === "Inilah <FR><sup>1a</sup><Fr>silsilah nenek moyang <FR><sup>2</sup><Fr>Yesus Kristus." && post.orig === RAW_IND, post);
    expect("berhasil: kotak tertutup, ayat berubah, IndexedDB diperbarui, pasal digambar ulang", !d.getElementById("bibleEditOverlay") && w.eval(V1 + ".text") === "Inilah silsilah nenek moyang Yesus Kristus." && w.eval("idbPuts.length") >= 1 && w.eval("rerenders") >= 1);
    expect("edit tercatat di cadangan lokal", B._test.cache_get().edits["rvind_40001001"].by === "admin1");
    // password dipakai ulang di sesi ini (tidak ditanya lagi)
    B.openEditor(w.eval(V1));
    expect("password sesi diingat di memori (tidak diminta lagi)", !d.querySelector(".bedit-pw"));
    // kembalikan ke asli
    const rev = Array.from(d.querySelectorAll(".bedit-actions button")).find((b) => /Kembalikan/.test(b.textContent));
    expect("ayat yang sudah diedit punya tombol 'Kembalikan ke asli'", !!rev);
    rev.click(); await wait(10);
    const rpost = w.eval("calls.filter(c=>c.post).slice(-1)[0].post");
    expect("kembalikan: kirim bible_edit_revert & teks kembali ke asli", rpost.type === "bible_edit_revert" && w.eval(V1 + ".text") === "Inilah daftar nenek moyang Yesus Kristus." && !d.getElementById("bibleEditOverlay"), rpost);
    // server tak terjangkau
    B.openEditor(w.eval("bibleData[1]"));
    d.querySelector(".bedit-textarea").value = "Teks baru."; w.eval('postReply = "throw";');
    Array.from(d.querySelectorAll(".bedit-actions button")).find((b) => /Simpan/.test(b.textContent)).click(); await wait(10);
    expect("server tak terjangkau -> pesan jelas, ayat tidak berubah", /Tidak bisa menghubungi server/.test(d.querySelector(".bedit-msg").textContent) && w.eval("bibleData[1].text") === "Abraham memperanakkan Ishak.");
  }

  // ---------- 6) tombol di ayat, popup penanda, panel riwayat ----------
  {
    const w = newWindow(); const d = w.document;
    const block = d.createElement("div"); const tw = d.createElement("div"); block.appendChild(tw);
    w.BibleEdit.decorateBlock(block, w.eval(V1), tw);
    expect("administrator: tombol ✏️ muncul di ayat", !!block.querySelector(".verse-edit-btn"));
    const w2 = newWindow({ user: "budi", levels: [] }); const b2 = w2.document.createElement("div");
    w2.BibleEdit.decorateBlock(b2, w2.eval(V1), null);
    expect("bukan administrator: tidak ada tombol ✏️", !b2.querySelector(".verse-edit-btn"));
    // tanda ayat yang diedit (admin)
    w.eval(V1 + "._edited = 1;");
    const b3 = d.createElement("div"); w.BibleEdit.decorateBlock(b3, w.eval(V1), d.createElement("div"));
    expect("ayat hasil edit ditandai (garis titik) untuk admin", b3.classList.contains("verse-edited"));
    // panel riwayat
    w.eval(`serverEdits = [
      { id: "rvind_40001001", lang: "rvind", bookNumber: 40, chapter: 1, verse: 1, raw: "Kitab silsilah Yesus Kristus.", orig: ${JSON.stringify(RAW_IND)}, by: "admin1", at: "2026-09-21T08:00:00.000Z", reverted: false },
      { id: "rvind_40001002", lang: "rvind", bookNumber: 40, chapter: 1, verse: 2, raw: "X", orig: "Abraham memperanakkan Ishak.", by: "admin2", at: "2026-09-20T08:00:00.000Z", reverted: true }];`);
    w.document.getElementById("bibleEditMenuBtn").hidden = false;
    w.BibleEdit.init();
    w.document.getElementById("bibleEditMenuBtn").click();
    await wait(30);
    const panel = w.document.getElementById("bibleEditPanel");
    const rows = panel.querySelectorAll(".bedit-row");
    expect("panel riwayat: 2 edit, terbaru di atas, yang dikembalikan diberi tanda", panel && !panel.hidden && rows.length === 2 && /1:1/.test(rows[0].textContent) && rows[1].classList.contains("reverted"), rows.length);
    expect("panel riwayat: teks asli vs sekarang tanpa tanda catatan kaki", /Asli: Inilah daftar nenek moyang Yesus Kristus\./.test(rows[0].textContent) && /Sekarang: Kitab silsilah Yesus Kristus\./.test(rows[0].textContent), rows[0].textContent);
    expect("panel riwayat menutup panel lain & memuat edit terbaru dari server", w.document.getElementById("notesPanel").hidden && w.eval("calls.some(c=>c.get)"));
    const w3 = newWindow({ user: "budi", levels: [] }); w3.BibleEdit.showHistoryPanel(); await wait(5);
    expect("bukan administrator: panel riwayat tidak dibuka", !w3.document.getElementById("bibleEditPanel"));
  }

  // ---------- 7) popup Penanda menampilkan "Edit ayat" untuk administrator ----------
  {
    const w = newWindow(); const d = w.document;
    w.eval(`var verseIndex = {}; var Guest = { isGuest: () => false, showFeatureLocked() {} }; function getChapterVerses() { return []; }`);
    w.eval(read("js/annotations.js"));
    w.BibleEdit.init();
    const blk = d.createElement("div"); blk.className = "verse-block"; blk.id = "v-rvind_40001001";
    blk.innerHTML = '<button class="verse-num">1</button><div class="verse-text-wrap">x</div>'; d.getElementById("readerVerses").appendChild(blk);
    w.Anno.openVersePopup(blk.querySelector(".verse-num"), blk, w.eval(V1));
    const btn = Array.from(d.querySelectorAll(".anno-popup-foot button")).find((b) => /Edit ayat/.test(b.textContent));
    expect("popup penanda: tombol 'Edit ayat' ada untuk administrator", !!btn);
    btn.click();
    expect("tombol itu membuka kotak edit", !!d.getElementById("bibleEditOverlay"));
    const w2 = newWindow({ user: "budi", levels: [] }); w2.eval(`var verseIndex = {}; var Guest = { isGuest: () => false, showFeatureLocked() {} }; function getChapterVerses() { return []; }`);
    w2.eval(read("js/annotations.js")); w2.BibleEdit.init();
    const b2 = w2.document.createElement("div"); b2.className = "verse-block"; b2.id = "v-rvind_40001001"; b2.innerHTML = '<button class="verse-num">1</button><div class="verse-text-wrap">x</div>'; w2.document.getElementById("readerVerses").appendChild(b2);
    w2.Anno.openVersePopup(b2.querySelector(".verse-num"), b2, w2.eval(V1));
    expect("popup penanda: pengguna biasa tidak melihat 'Edit ayat'", !Array.from(w2.document.querySelectorAll(".anno-popup-foot button")).some((b) => /Edit ayat/.test(b.textContent)));
  }

  // =====================================================================
  //  Sisi server: apps-script/Code.gs di vm dengan Sheet & layanan TIRUAN
  // =====================================================================
  {
    class Sheet {
      constructor(name) { this.name = name; this.rows = []; this.maxRows = 1000; this.fmt = null; }
      appendRow(r) { this.rows.push(r.slice()); }
      setFrozenRows() {}
      getMaxRows() { return this.maxRows; }
      insertRowsAfter(a, n) { this.maxRows += n; }
      getLastRow() { return this.rows.length; }
      getRange(r, c, nr, nc) {
        const self = this; nr = nr || 1; nc = nc || 1;
        return {
          getValues() { const out = []; for (let i = 0; i < nr; i++) { const row = self.rows[r - 1 + i] || []; out.push(Array.from({ length: nc }, (_, j) => (row[c - 1 + j] === undefined ? "" : row[c - 1 + j]))); } return out; },
          setValues(vals) { vals.forEach((vr, i) => { const idx = r - 1 + i; while (self.rows.length <= idx) self.rows.push([]); vr.forEach((v, j) => { self.rows[idx][c - 1 + j] = v; }); }); },
          setNumberFormat(f) { self.fmt = f; },
        };
      }
    }
    const sheets = {};
    const ss = { getSheetByName: (n) => sheets[n] || null, insertSheet: (n) => (sheets[n] = new Sheet(n)) };
    const cacheStore = {};
    const sandbox = {
      console, JSON, Math, Date, String, Number, Array, Object, Error, parseInt, parseFloat, Set, Map, RegExp, isNaN,
      ContentService: { MimeType: { JSON: "json" }, createTextOutput: (t) => ({ text: t, setMimeType() { return this; } }) },
      SpreadsheetApp: { openById: () => ss, getActiveSpreadsheet: () => ss },
      LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
      CacheService: { getScriptCache: () => ({ get: (k) => (k in cacheStore ? cacheStore[k] : null), put: (k, v) => { cacheStore[k] = v; }, remove: (k) => { delete cacheStore[k]; } }) },
      PropertiesService: { getScriptProperties: () => ({ getProperty: () => "" }) },
    };
    vm.createContext(sandbox);
    vm.runInContext(read("apps-script/Code.gs"), sandbox);
    sandbox.__users = [
      { username: "admin1", level: "administrator, gembala", nama: "A" },
      { username: "gembala1", level: "gembala", nama: "G" },
      { username: "budi", level: "", nama: "B" },
    ];
    sandbox.__pw = { admin1: "rahasia", gembala1: "pw2", budi: "pw3" };
    vm.runInContext("readAllUsersForAdmin_ = function () { return __users; }; readPasswordOverride_ = function (u) { return __pw[u] || ''; };", sandbox);
    const post = (o) => JSON.parse(sandbox.doPost({ postData: { contents: JSON.stringify(o) } }).text);
    const get = (o) => JSON.parse(sandbox.doGet({ parameter: o }).text);
    const edit = (o) => post(Object.assign({ type: "bible_edit", username: "admin1", password: "rahasia", verseId: "rvind_40001001", lang: "rvind", bookNumber: 40, chapter: 1, verse: 1, raw: "Teks baru.", orig: RAW_IND }, o));

    expect("server: password salah ditolak", edit({ password: "salah" }).ok === false && get({ type: "bible_edits" }).edits.length === 0);
    expect("server: gembala (bukan administrator) ditolak walau password benar", /administrator/i.test(edit({ username: "gembala1", password: "pw2" }).error));
    expect("server: akun tak dikenal ditolak", edit({ username: "hantu", password: "x" }).ok === false);
    expect("server: password kosong ditolak", edit({ password: "" }).ok === false);
    expect("server: teks kosong & terlalu panjang ditolak", edit({ raw: "   " }).ok === false && /terlalu panjang/.test(edit({ raw: "x".repeat(6001) }).error));
    const r1 = edit({});
    expect("server: administrator dengan password benar -> edit tersimpan", r1.ok === true && !!r1.editedAt && r1.orig === RAW_IND, r1);
    let list = get({ type: "bible_edits" });
    expect("server: GET bible_edits (tanpa login) mengembalikan edit + waktu server", list.ok && list.edits.length === 1 && list.edits[0].raw === "Teks baru." && list.edits[0].by === "admin1" && !!list.serverTime, list);
    const r2 = edit({ raw: "Teks revisi kedua.", orig: "SEHARUSNYA DIABAIKAN" });
    list = get({ type: "bible_edits" });
    expect("server: edit kedua menimpa baris yang sama tapi TEKS ASLI pertama tetap terjaga", r2.ok && list.edits.length === 1 && list.edits[0].raw === "Teks revisi kedua." && list.edits[0].orig === RAW_IND, list.edits);
    edit({ verseId: "rveng_40001001", lang: "rveng", raw: "English edit." });
    expect("server: filter 'since' hanya mengembalikan yang lebih baru", get({ type: "bible_edits", since: "2999-01-01T00:00:00.000Z" }).edits.length === 0 && get({ type: "bible_edits", since: "2000-01-01T00:00:00.000Z" }).edits.length === 2);
    const rev = post({ type: "bible_edit_revert", username: "admin1", password: "rahasia", verseId: "rvind_40001001" });
    list = get({ type: "bible_edits" });
    expect("server: revert menandai 'reverted' tanpa menghapus riwayat", rev.ok && list.edits.find((e) => e.id === "rvind_40001001").reverted === true && list.edits.length === 2);
    expect("server: revert ayat yang belum pernah diedit ditolak", post({ type: "bible_edit_revert", username: "admin1", password: "rahasia", verseId: "rvind_999" }).ok === false);
    expect("server: revert wajib administrator juga", post({ type: "bible_edit_revert", username: "budi", password: "pw3", verseId: "rveng_40001001" }).ok === false);
    // kunci percobaan password
    for (let i = 0; i < 8; i++) edit({ password: "salah" + i });
    expect("server: terlalu banyak password salah -> dikunci (bahkan password benar ditolak)", /Terlalu banyak/.test(edit({}).error), edit({}));
    expect("server: sheet BibleEdits berformat teks (tanggal ISO tidak diubah Sheets)", sheets["BibleEdits"].fmt === "@");

    // --- Annotations ---
    const push = (u, items) => post({ type: "anno_push", username: u, items });
    const pull = (u, since) => get({ type: "anno_pull", username: u, since: since || "" });
    const it = (id, json, updatedAt, deleted) => ({ id, json: JSON.stringify(json), updatedAt, deleted: !!deleted });
    let r = push("budi", [it("v:1:1:1", { cats: ["c_green"] }, "2026-09-21T01:00:00.000Z"), it("cat:c_x", { id: "c_x", name: "X" }, "2026-09-21T01:00:00.000Z")]);
    expect("anno_push: simpan baris baru", r.ok && r.saved === 2);
    push("siti", [it("v:1:1:1", { cats: ["c_pink"] }, "2026-09-21T01:00:00.000Z")]);
    expect("anno_pull: hanya milik pengguna itu", pull("budi").items.length === 2 && pull("siti").items.length === 1 && JSON.parse(pull("siti").items[0].json).cats[0] === "c_pink");
    push("budi", [it("v:1:1:1", { cats: ["c_blue"] }, "2026-09-21T02:00:00.000Z")]);
    expect("anno_push: baris yang sama diperbarui (bukan dobel)", pull("budi").items.length === 2 && JSON.parse(pull("budi").items.find((x) => x.id === "v:1:1:1").json).cats[0] === "c_blue");
    r = push("budi", [it("v:1:1:1", { cats: ["c_OLD"] }, "2026-09-20T00:00:00.000Z")]);
    expect("anno_push: kiriman yang lebih LAMA dari server diabaikan", r.skipped === 1 && JSON.parse(pull("budi").items.find((x) => x.id === "v:1:1:1").json).cats[0] === "c_blue");
    push("budi", [it("v:1:1:1", { cats: [] }, "2026-09-21T03:00:00.000Z", true)]);
    expect("anno_push: batu nisan (hapus) ikut tersimpan", pull("budi").items.find((x) => x.id === "v:1:1:1").deleted === true);
    expect("anno_pull: filter since", pull("budi", "2026-09-21T02:30:00.000Z").items.length === 1);
    expect("anno: sheet Annotations berformat teks", sheets["Annotations"].fmt === "@");
    expect("anno_push tanpa username ditolak (aturan lama)", post({ type: "anno_push", items: [] }).ok === false);
  }

  console.log(ok ? "\nSEMUA LULUS" : "\nADA YANG GAGAL");
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
