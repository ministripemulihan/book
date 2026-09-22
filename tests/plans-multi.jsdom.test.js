// Uji Rencana Baca Multi-Jalur (js/plans-multi.js) di DOM tiruan.
// Butuh jsdom (tidak ikut proyek):  npm i jsdom  lalu  node tests/plans-multi.jsdom.test.js
// Data Alkitab TIRUAN: jumlah pasal per kitab NYATA (PL 929 pasal, PB 260 pasal),
// jumlah ayat per pasal dibuat berpola tetap (10-39) -- cukup untuk menguji
// pembagian & label, bukan isi ayatnya.
"use strict";
const fs = require("fs"), path = require("path");
let JSDOM;
try { ({ JSDOM } = require("jsdom")); } catch (e) { ({ JSDOM } = require(require.resolve("jsdom", { paths: [process.cwd(), "/tmp/lint/node_modules", "/tmp/jt/node_modules"] }))); }
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

const CH = [50,40,27,36,34,24,21,4,31,24,22,25,29,36,10,13,10,42,150,31,12,8,66,52,5,48,12,14,3,9,1,4,7,3,3,3,2,14,4,
            28,16,24,21,28,16,16,13,6,6,4,4,5,3,6,4,3,1,13,5,5,3,5,1,1,1,22];

let ok = true;
function expect(name, cond, extra) { console.log((cond ? "PASS" : "FAIL") + " - " + name + (cond ? "" : " :: " + JSON.stringify(extra))); if (!cond) ok = false; }

function newWindow() {
  const dom = new JSDOM('<!doctype html><body><div id="planPanel"></div><div id="reader"></div><select id="langSelect"></select></body>', { runScripts: "outside-only", pretendToBeVisual: true, url: "https://example.test/" });
  const w = dom.window;
  w.alerts = []; w.alert = (m) => w.alerts.push(m);
  w.confirmAnswer = true; w.confirm = () => w.confirmAnswer;
  w.eval(read("js/books.js") + "\nwindow.BOOKS = BOOKS;");
  w.eval(`
    const CH = ${JSON.stringify(CH)};
    var CONFIG = { DEFAULT_LANGUAGE: "ind", LANGUAGES: [
      { code: "ind", label: "Indonesia (TB)" }, { code: "rveng", label: "Inggris (Recovery)" },
      { code: "chs", label: "Mandarin" }, { code: "jawa", label: "Jawa (Perjanjian Baru)" } ] };
    var verseIndex = {}; var chaptersByBook = {};
    function vcount(book, ch) { return 10 + ((book * 7 + ch * 13) % 30); }
    ["ind", "rveng", "chs", "jawa"].forEach((lang) => {
      verseIndex[lang] = {}; chaptersByBook[lang] = {};
      BOOKS.forEach((b) => {
        if (lang === "jawa" && b.testament !== "PB") return;
        verseIndex[lang][b.num] = {}; chaptersByBook[lang][b.num] = [];
        for (let c = 1; c <= CH[b.num - 1]; c++) {
          const arr = []; for (let v = 1; v <= vcount(b.num, c); v++) arr.push({ verse: v, bookName: b.name, chapter: c });
          verseIndex[lang][b.num][c] = arr; chaptersByBook[lang][b.num].push(c);
        }
      });
    });
    function getChaptersForBook(l, b) { return (chaptersByBook[l] && chaptersByBook[l][b]) || []; }
    function getChapterVerses(l, b, c) { return (verseIndex[l] && verseIndex[l][b] && verseIndex[l][b][c]) || []; }
    function bookAvailableInLang(l, b) { return getChaptersForBook(l, b).length > 0; }
    function referenceLangForPlans() { return "ind"; }
    var currentLang = "ind"; var currentUser = "budi";
    var rendered = []; var unavailable = 0; var sidebarBuilt = 0;
    function renderChapter(b, c, v) { rendered.push({ b, c, v, lang: currentLang }); }
    function showLangUnavailable() { unavailable++; }
    function buildSidebar() { sidebarBuilt++; }
    function langSelectEl() { return document.getElementById("langSelect"); }
    function closeSidebarOnMobile() {}
    var pushed = []; var remoteStore = null;
    var Sync = { enabled: () => true, pushProgress: async (u, p) => { pushed.push({ u, p }); return true; }, pullProgress: async () => remoteStore };
    function renderPlanPanel() { const c = document.getElementById("planPanel"); c.innerHTML = ""; if (!PlansMulti.renderDetail(c)) c.textContent = "CHOOSER"; }
  `);
  w.eval(read("js/plans-multi.js"));
  const sel = w.document.getElementById("langSelect");
  ["ind", "rveng", "chs", "jawa"].forEach((c) => { const o = w.document.createElement("option"); o.value = c; sel.appendChild(o); });
  return w;
}

// ---------- 1) Penjadwalan murni ----------
{
  const w = newWindow();
  const T = w.PlansMulti._test;
  const chapters = (scope) => w.eval(`(function(){ const out=[]; BOOKS.forEach(b=>{ if ("${scope}"!=="ALL" && b.testament!=="${scope}") return; getChaptersForBook("ind", b.num).forEach(ch=>out.push({bookNum:b.num,chapter:ch,verses:getChapterVerses("ind",b.num,ch).map(v=>v.verse)})); }); return out; })()`);

  for (const scope of ["PL", "PB", "ALL"]) {
    const chs = chapters(scope);
    const total = chs.reduce((a, c) => a + c.verses.length, 0);
    const sched = T.buildSchedule_(chs, 365, "ayat");
    expect(`ayat/${scope}: 365 hari`, sched.length === 365, sched.length);
    // setiap ayat muncul tepat sekali & berurutan
    const flat = [];
    sched.forEach((day) => day.forEach((s) => { for (let v = s.vStart; v <= s.vEnd; v++) flat.push(s.bookNum + ":" + s.chapter + ":" + v); }));
    const expected = [];
    chs.forEach((c) => c.verses.forEach((v) => expected.push(c.bookNum + ":" + c.chapter + ":" + v)));
    expect(`ayat/${scope}: semua ${total} ayat tepat sekali & berurutan`, flat.length === expected.length && flat.every((x, i) => x === expected[i]), { flat: flat.length, exp: expected.length });
    const sizes = sched.map((day) => day.reduce((a, s) => a + (s.vEnd - s.vStart + 1), 0));
    expect(`ayat/${scope}: tidak ada hari kosong`, sizes.every((n) => n > 0), sizes.filter((n) => n === 0).length);
    expect(`ayat/${scope}: selisih ukuran antar hari <= 1 ayat`, Math.max(...sizes) - Math.min(...sizes) <= 1, [Math.min(...sizes), Math.max(...sizes)]);
  }
  {
    const chs = chapters("PB");
    const old = T.buildSchedule_(chs, 365, "pasal");
    expect("pasal/PB: perilaku lama = 105 hari kosong (260 pasal / 365 hari)", old.filter((d) => d.length === 0).length === 105, old.filter((d) => d.length === 0).length);
    const flat = []; old.forEach((d) => d.forEach((s) => flat.push(s.bookNum + ":" + s.chapter)));
    expect("pasal/PB: 260 pasal tepat sekali", flat.length === 260 && new Set(flat).size === 260, flat.length);
  }
  // label
  const b = (name) => w.BOOKS.find((x) => x.name === name).num;
  const galatia = b("Galatia");
  expect("label potongan ayat", T.segLabel_({ bookNum: galatia, chapter: 5, vStart: 16, vEnd: 26 }) === "Galatia 5:16\u201326");
  expect("label 1 ayat", T.segLabel_({ bookNum: galatia, chapter: 5, vStart: 16, vEnd: 16 }) === "Galatia 5:16");
  expect("label hari lintas pasal (mulai di tengah)", T.dayLabel_([
    { bookNum: galatia, chapter: 5, vStart: 16, vEnd: 26, fullStart: false, fullEnd: true },
    { bookNum: galatia, chapter: 6, vStart: 1, vEnd: 18, fullStart: true, fullEnd: true }]) === "Galatia 5:16\u20136", T.dayLabel_([
    { bookNum: galatia, chapter: 5, vStart: 16, vEnd: 26, fullStart: false, fullEnd: true },
    { bookNum: galatia, chapter: 6, vStart: 1, vEnd: 18, fullStart: true, fullEnd: true }]));
  expect("label hari: pasal penuh lalu berhenti di tengah", T.dayLabel_([
    { bookNum: b("Pengkhotbah"), chapter: 1, vStart: 1, vEnd: 18, fullStart: true, fullEnd: true },
    { bookNum: b("Pengkhotbah"), chapter: 2, vStart: 1, vEnd: 26, fullStart: true, fullEnd: true },
    { bookNum: b("Pengkhotbah"), chapter: 5, vStart: 1, vEnd: 9, fullStart: true, fullEnd: false }]) === "Pengkhotbah 1\u20135:9");
  expect("label hari kosong", T.dayLabel_([]).includes("istirahat"));
  expect("label lintas kitab", T.dayLabel_([
    { bookNum: galatia, chapter: 6, vStart: 10, vEnd: 18, fullStart: false, fullEnd: true },
    { bookNum: b("Efesus"), chapter: 1, vStart: 1, vEnd: 5, fullStart: true, fullEnd: false }]) === "Galatia 6:10\u201318; Efesus 1:1\u20135");

  // catch-up & hari ini
  const now = new Date(2026, 8, 20); // 20 Sep 2026
  const jan1 = new Date(2026, 0, 1);
  expect("catch-up: 1 Jan -> 20 Sep = 262 hari selesai", T.catchupDone_(365, jan1, true, now).split("").filter((c) => c === "1").length === 262);
  expect("catch-up mati: semua kosong", !T.catchupDone_(365, jan1, false, now).includes("1"));
  expect("catch-up dipotong days-1", T.catchupDone_(30, jan1, true, now).split("").filter((c) => c === "1").length === 29);
  const tr = T.normalizeTrack_({ scope: "PL", days: 365, startDate: jan1.toISOString(), done: "" });
  const ti = T.todayInfo_(tr, now);
  expect("hari ini = Hari 263 (index 262)", ti.idx === 262 && !ti.notStarted && !ti.pastEnd, ti);
  const future = T.normalizeTrack_({ scope: "PL", days: 30, startDate: new Date(2026, 9, 1).toISOString() });
  expect("tanggal mulai di depan = notStarted", T.todayInfo_(future, now).notStarted === true);
  const over = T.normalizeTrack_({ scope: "PL", days: 30, startDate: new Date(2026, 0, 1).toISOString() });
  expect("masa jadwal lewat = pastEnd", T.todayInfo_(over, now).pastEnd === true);
  const dn = T.normalizeTrack_({ scope: "PL", days: 5, done: "1x1" });
  expect("normalisasi string centang (isi & panjang)", dn.done === "10100", dn.done);
}

// ---------- 2) Alur UI: buat rencana, baca, centang, belum dibaca, sinkron ----------
(async () => {
  const w = newWindow();
  const d = w.document;
  const P = w.PlansMulti;
  const click = (el) => el.dispatchEvent(new w.Event("click", { bubbles: true }));
  const change = (el) => el.dispatchEvent(new w.Event("change", { bubbles: true }));

  expect("belum ada rencana -> renderDetail false", P.renderDetail(d.createElement("div")) === false);

  // buka dialog: default 2 jalur (PL + PB, 365 hari); mulai 1 Januari; catch-up MATI
  P.openCreator();
  const ov = d.getElementById("pmCreateOverlay");
  expect("dialog terbuka dengan 2 jalur", ov && ov.querySelectorAll(".pm-row").length === 2, ov && ov.querySelectorAll(".pm-row").length);
  const quickJan = Array.from(ov.querySelectorAll("button")).find((b) => b.textContent.includes("1 Januari"));
  click(quickJan);
  const catchBoxes = ov.querySelectorAll(".pm-catch input[type=checkbox]");
  expect("kotak catch-up muncul untuk tanggal yang sudah lewat", catchBoxes.length === 2 && !ov.querySelector(".pm-catch").hidden);
  catchBoxes[0].checked = false; // PL: JANGAN diselesaikan
  // jalur PB: bahasa Mandarin; jalur PL: bahasa Inggris Recovery
  const langSels = ov.querySelectorAll(".pm-row")[0].querySelectorAll("select");
  const rowSelects = (i) => Array.from(ov.querySelectorAll(".pm-row")[i].querySelectorAll("select"));
  const langOf = (i) => rowSelects(i)[3];
  langOf(0).value = "rveng"; langOf(1).value = "chs";
  click(Array.from(ov.querySelectorAll("button")).find((b) => b.textContent.includes("Buat Rencana")));

  expect("dialog tertutup setelah dibuat", !d.getElementById("pmCreateOverlay"));
  const plan = P.load("budi");
  expect("rencana tersimpan dengan 2 jalur", plan && plan.tracks.length === 2, plan);
  expect("jalur PL: bahasa rveng, catch-up mati (semua kosong)", plan.tracks[0].scope === "PL" && plan.tracks[0].lang === "rveng" && !plan.tracks[0].done.includes("1"), plan.tracks[0]);
  expect("jalur PB: bahasa chs, catch-up hidup (sisa lewat sudah tercentang)", plan.tracks[1].scope === "PB" && plan.tracks[1].lang === "chs" && plan.tracks[1].done.includes("1"), plan.tracks[1].done.length);
  expect("data lokal kecil (string centang, bukan jadwal)", JSON.stringify(plan).length < 3000, JSON.stringify(plan).length);
  expect("sinkron ke server memakai kunci 'budi#multi' (tanpa ubah Code.gs)", w.eval("pushed").some((x) => x.u === "budi#multi" && x.p.planId === "multi_v1" && Array.isArray(x.p.schedule)), w.eval("pushed").map((x) => x.u));
  expect("payload server tidak berisi jadwal bacaan", JSON.stringify(w.eval("pushed")[0].p).length < 3000);

  // tampilan panel
  const panel = d.getElementById("planPanel");
  w.eval("renderPlanPanel()");
  const cards = panel.querySelectorAll(".pm-card");
  expect("2 kartu jalur tampil", cards.length === 2, cards.length);
  expect("tiap kartu punya tombol potongan bacaan", Array.from(cards).every((c) => c.querySelectorAll(".pm-seg").length >= 1));
  expect("PL punya daftar '⏳ Belum dibaca' (catch-up mati)", !!cards[0].querySelector(".pm-backlog"), cards[0].innerHTML.slice(0, 200));
  expect("PB tidak punya daftar belum dibaca (sudah dikejar)", !cards[1].querySelector(".pm-backlog"));

  // klik potongan PL -> langsung buka, bahasa pindah ke Inggris Recovery
  const firstSeg = cards[0].querySelector(".pm-card-body > .pm-segs .pm-seg");
  click(firstSeg);
  const r = w.eval("rendered");
  expect("klik potongan membuka pasal di bahasa jalur (rveng)", r.length === 1 && r[0].lang === "rveng" && r[0].v >= 1, r);
  expect("dropdown bahasa ikut berpindah & sidebar dibangun ulang", d.getElementById("langSelect").value === "rveng" && w.eval("sidebarBuilt") === 1);
  expect("bilah 'Tandai selesai' muncul di layar baca", !!d.getElementById("pmReadBar"));
  // klik potongan PB -> Mandarin
  click(cards[1].querySelector(".pm-card-body > .pm-segs .pm-seg"));
  expect("klik potongan PB membuka bahasa Mandarin (chs)", w.eval("rendered").slice(-1)[0].lang === "chs");
  // tandai selesai lewat bilah
  const barBtn = d.querySelector("#pmReadBar .chip-btn");
  click(barBtn);
  const afterBar = P.load("budi");
  const pbIdx = w.eval("PlansMulti._test.todayInfo_(PlansMulti.load('budi').tracks[1]).idx");
  expect("bilah menandai hari ini jalur PB selesai", afterBar.tracks[1].done.charAt(pbIdx) === "1");
  expect("bilah hilang setelah dipakai", !d.getElementById("pmReadBar"));

  // centang hari ini di kartu PL
  w.eval("renderPlanPanel()");
  const cb = panel.querySelectorAll(".pm-card")[0].querySelector(".pm-card-check");
  cb.checked = true; change(cb);
  const plIdx = w.eval("PlansMulti._test.todayInfo_(PlansMulti.load('budi').tracks[0]).idx");
  expect("centang kartu PL tersimpan per hari", P.load("budi").tracks[0].done.charAt(plIdx) === "1");

  // daftar belum dibaca: centang satu hari terlewat
  const backlog = panel.querySelector(".pm-backlog");
  backlog.open = true; backlog.dispatchEvent(new w.Event("toggle"));
  const rows = backlog.querySelectorAll(".pm-day-row");
  expect("belum dibaca menampilkan 20 hari pertama", rows.length === 20, rows.length);
  const before = P.load("budi").tracks[0].done.split("").filter((c) => c === "1").length;
  const rcb = rows[0].querySelector("input[type=checkbox]"); rcb.checked = true; change(rcb);
  expect("centang satu hari terlewat menambah 1 centang", P.load("budi").tracks[0].done.split("").filter((c) => c === "1").length === before + 1);

  // fallback bahasa: kitab PL tidak ada di 'jawa'
  const t0 = P.load("budi"); t0.tracks[0].lang = "jawa"; P.save("budi", t0);
  w.eval("currentLang = 'ind'; rendered.length = 0; unavailable = 0;");
  w.eval("renderPlanPanel()");
  click(panel.querySelectorAll(".pm-card")[0].querySelector(".pm-card-body > .pm-segs .pm-seg"));
  expect("kitab tak ada di bahasa jalur -> jatuh ke bahasa aktif + pemberitahuan", w.eval("rendered").length === 1 && w.eval("rendered")[0].lang === "ind" && /belum ada/.test(d.getElementById("pmToast").textContent), d.getElementById("pmToast") && d.getElementById("pmToast").textContent);

  // pilihan manual bahasa tidak ditimpa (tidak menulis localStorage bahasa)
  expect("perpindahan bahasa dari rencana tidak menulis localStorage bahasa manual", !Object.keys(w.localStorage).some((k) => /bible_app_lang/.test(k)));

  // tambah jalur
  P.openCreator({ addTo: P.load("budi") });
  click(Array.from(d.querySelectorAll("#pmCreateOverlay button")).find((b) => b.textContent.includes("Tambahkan")));
  expect("tambah jalur -> 3 jalur", P.load("budi").tracks.length === 3);

  // hapus jalur & ganti rencana
  const t1 = P.load("budi");
  w.eval("renderPlanPanel()");
  const delBtn = Array.from(panel.querySelectorAll(".pm-card")[2].querySelectorAll("button")).find((b) => b.textContent.includes("Hapus jalur"));
  click(delBtn);
  expect("hapus jalur -> 2 jalur", P.load("budi").tracks.length === 2);

  // sinkron dari server: versi lebih baru menang, lebih lama diabaikan
  const cur = P.load("budi");
  const newer = JSON.parse(JSON.stringify(cur.tracks)); newer[0].done = "1".repeat(365);
  w.eval("remoteStore = " + JSON.stringify({ planId: "multi_v1", schedule: newer, updatedAt: new Date(Date.now() + 60000).toISOString() }));
  expect("tarik dari server (lebih baru) dipakai", (await P.refreshFromRemote("budi")) === true && P.load("budi").tracks[0].done === "1".repeat(365));
  const older = JSON.parse(JSON.stringify(cur.tracks));
  w.eval("remoteStore = " + JSON.stringify({ planId: "multi_v1", schedule: older, updatedAt: new Date(2020, 0, 1).toISOString() }));
  expect("tarik dari server (lebih lama) diabaikan", (await P.refreshFromRemote("budi")) === false && P.load("budi").tracks[0].done === "1".repeat(365));
  w.eval("remoteStore = { planId: '', schedule: [] }");
  expect("server kosong tidak menghapus data lokal", (await P.refreshFromRemote("budi")) === false && !!P.load("budi"));

  P.clear("budi");
  expect("clear menghapus rencana multi", P.load("budi") === null && P.renderDetail(d.createElement("div")) === false);

  console.log(ok ? "\nSEMUA LULUS" : "\nADA YANG GAGAL");
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
