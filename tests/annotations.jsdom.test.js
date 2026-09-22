// Uji Penanda/Stabilo berkategori (js/annotations.js) di DOM tiruan.
// Butuh jsdom:  npm i jsdom  lalu  node tests/annotations.jsdom.test.js
"use strict";
const fs = require("fs"), path = require("path");
let JSDOM;
try { ({ JSDOM } = require("jsdom")); } catch (e) { ({ JSDOM } = require(require.resolve("jsdom", { paths: [process.cwd(), "/tmp/jt2/node_modules", "/tmp/jt/node_modules"] }))); }
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
let ok = true;
function expect(name, cond, extra) { console.log((cond ? "PASS" : "FAIL") + " - " + name + (cond ? "" : " :: " + JSON.stringify(extra))); if (!cond) ok = false; }

const T1 = "Pada mulanya Allah menciptakan langit dan bumi.";
const T2 = "Tetapi oleh kasih karunia-Nya kita diselamatkan.";

function newWindow() {
  const dom = new JSDOM(`<!doctype html><body>
    <div id="moreMenu"></div><button id="annoMenuBtn"></button>
    <div id="notesPanel"></div>
    <article id="reader"><div id="readerVerses"></div></article></body>`, { runScripts: "outside-only", pretendToBeVisual: true, url: "https://example.test/" });
  const w = dom.window;
  w.confirmAnswer = true; w.confirm = () => w.confirmAnswer;
  w.eval(read("js/books.js") + "\nwindow.BOOKS = BOOKS;");
  w.eval(`
    var CONFIG = { LANGUAGES: [{ code: "ind", label: "Indonesia" }, { code: "eng", label: "Inggris" }] };
    var currentUser = "budi", currentLang = "ind", currentBookNum = 1, currentChapter = 1;
    var Guest = { isGuest: () => false, showFeatureLocked: (n) => { window.lockedFor = n; } };
    var verseById = {}, verseIndex = { ind: { 1: { 1: [] }, 43: { 3: [] } }, eng: { 1: { 1: [] } } };
    function addVerse(id, lang, b, c, v, text) { const o = { id, lang, bookNumber: b, chapter: c, verse: v, bookName: BOOKS.find((x) => x.num === b).name, text }; verseById[id] = o; ((verseIndex[lang] = verseIndex[lang] || {})[b] = verseIndex[lang][b] || {})[c] = (verseIndex[lang][b][c] || []).concat(o); return o; }
    addVerse("ind_1", "ind", 1, 1, 1, ${JSON.stringify(T1)});
    addVerse("ind_2", "ind", 1, 1, 2, ${JSON.stringify(T2)});
    addVerse("eng_1", "eng", 1, 1, 1, "In the beginning God created the heavens and the earth.");
    addVerse("ind_j", "ind", 43, 3, 16, "Karena begitu besar kasih Allah akan dunia ini.");
    function getChapterVerses(l, b, c) { return (verseIndex[l] && verseIndex[l][b] && verseIndex[l][b][c]) || []; }
    var rendered = [], panelsHidden = 0;
    function renderChapter(b, c, v) { rendered.push({ b, c, v, lang: currentLang }); }
    function hideAllPanels() { panelsHidden++; ["annoPanel", "notesPanel"].forEach((i) => { const e = document.getElementById(i); if (e) e.hidden = true; }); }
    function logActivity() {}
    function closeSidebarOnMobile() {}
    var posted = [], remote = { items: [] }, syncOn = true, postFail = false;
    var Sync = { enabled: () => syncOn,
      _post: async (p) => { if (postFail) throw new Error("offline"); posted.push(p); return { ok: true, saved: p.items.length }; },
      _get: async (p) => ({ ok: true, items: remote.items, serverTime: "2026-09-21T10:00:00.000Z", _p: p }) };
    function buildBlock(v, opts) {
      opts = opts || {};
      const d = document.createElement("div"); d.className = "verse-block"; d.id = "v-" + v.id;
      d.innerHTML = '<button class="verse-num verse-num-btn">' + v.verse + '</button><div class="verse-text-wrap"></div><div class="verse-inline-note"><div class="note-modal-admin-text"></div></div>';
      const tw = d.querySelector(".verse-text-wrap");
      if (opts.marker) { tw.appendChild(document.createTextNode("Tetapi oleh ")); const s = document.createElement("span"); s.className = "footnote-marker-word"; s.textContent = "kasih"; tw.appendChild(s); tw.appendChild(document.createTextNode(" karunia-Nya kita diselamatkan.")); }
      else tw.appendChild(document.createTextNode(v.text));
      const badge = document.createElement("span"); badge.className = "verse-note-badge"; badge.textContent = "📝"; tw.appendChild(badge);
      d.querySelector(".note-modal-admin-text").innerHTML = '<div class="footnote-entry"><b>1a</b> Catatan pertama tentang penciptaan.</div><div class="footnote-entry"><b>2</b> Catatan kedua tentang bumi.</div>';
      document.getElementById("readerVerses").appendChild(d);
      return d;
    }
  `);
  w.eval(read("js/annotations.js"));
  if (!w.Range.prototype.getBoundingClientRect) w.Range.prototype.getBoundingClientRect = () => ({ left: 20, top: 100, right: 120, bottom: 120, width: 100, height: 20 });
  w.Anno.init();
  return w;
}
const blockOf = (w, id) => w.document.getElementById("v-" + id);
const textOf = (el) => Array.from(el.childNodes).filter((n) => !(n.nodeType === 1 && n.classList.contains("verse-note-badge"))).map((n) => n.textContent).join("");
const selectText = (w, container, str, from) => {
  const doc = w.document;
  const walker = doc.createTreeWalker(container, 4);
  let node, base = 0; const full = [];
  while ((node = walker.nextNode())) { full.push(node); }
  const all = full.map((n) => n.nodeValue).join("");
  const at = all.indexOf(str, from || 0);
  let pos = 0, sn, so, en, eo;
  for (const n of full) {
    const len = n.nodeValue.length;
    if (sn == null && at < pos + len) { sn = n; so = at - pos; }
    if (en == null && at + str.length <= pos + len) { en = n; eo = at + str.length - pos; break; }
    pos += len;
  }
  const r = doc.createRange(); r.setStart(sn, so); r.setEnd(en, eo);
  const sel = w.getSelection(); sel.removeAllRanges(); sel.addRange(r);
  return r;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  // ---------- 1) kategori ----------
  {
    const w = newWindow(); const A = w.Anno;
    const cats = A.getCategories();
    expect("kategori bawaan: 8 kategori bernama + ikon", cats.length === 8 && cats[0].name === "Penting" && cats[1].icon === "🤝", cats.map((c) => c.name));
    const nc = A.addCategory("Renungan Pagi", "gray", "☀️");
    expect("tambah kategori baru", A.getCategories().length === 9 && nc.color === "gray");
    A.updateCategory(nc.id, { name: "Renungan", color: "cream" });
    expect("ubah nama & warna kategori", A.getCategories().find((c) => c.id === nc.id).name === "Renungan" && A.getCategories().find((c) => c.id === nc.id).color === "cream");
    expect("nama kosong ditolak", A.addCategory("   ", "gray") === null);
    A.toggleVerseCat(1, 1, 1, nc.id);
    A.deleteCategory(nc.id);
    expect("hapus kategori -> tanda yang hanya memakainya ikut terlepas", A.getCategories().length === 8 && A.verseCategories(1, 1, 1).length === 0);
  }

  // ---------- 2) tanda ayat: banyak kategori, titik, warna, sembunyikan ----------
  {
    const w = newWindow(); const A = w.Anno;
    const b1 = w.eval('buildBlock(verseById["ind_1"])'); const b2 = w.eval('buildBlock(verseById["ind_2"])');
    A.toggleVerseCat(1, 1, 1, "c_green"); A.toggleVerseCat(1, 1, 1, "c_blue");
    expect("satu ayat boleh punya beberapa kategori", A.verseCategories(1, 1, 1).join() === "c_green,c_blue");
    expect("warna ayat = kategori pertama (hijau)", b1.classList.contains("hl-green") && !b1.classList.contains("hl-blue"));
    expect("titik kategori di bawah nomor ayat (2 titik)", b1.querySelectorAll(".anno-dot").length === 2 && b2.querySelectorAll(".anno-dot").length === 0);
    expect("teks nomor ayat tetap hanya angkanya (lompat-ayat tidak rusak)", b1.querySelector(".verse-num").textContent.trim() === "1");
    A.toggleVerseCat(1, 1, 1, "c_green");
    expect("lepas satu kategori -> warna pindah ke kategori berikutnya", b1.classList.contains("hl-blue") && !b1.classList.contains("hl-green"));
    A.toggleHidden("c_blue");
    expect("kategori disembunyikan -> warna hilang, titik redup", !b1.classList.contains("hl-blue") && b1.querySelector(".anno-dot.off"));
    A.toggleHidden("c_blue");
    A.setOnly(true);
    expect("'Hanya yang ditandai' menyembunyikan ayat tanpa tanda", b2.classList.contains("anno-hidden") && !b1.classList.contains("anno-hidden"));
    A.setOnly(false);
    A.toggleVerseCat(1, 1, 1, "c_blue"); // lepas yang terakhir
    expect("lepas semua kategori -> tanda ayat hilang", A.verseCategories(1, 1, 1).length === 0 && !/hl-/.test(b1.className));
    // tanda tanpa bahasa: ayat yang sama di kolom Inggris ikut bertanda
    A.toggleVerseCat(1, 1, 1, "c_pink");
    const be = w.eval('buildBlock(verseById["eng_1"])'); A.decorate(true);
    expect("tanda ayat berlaku lintas bahasa (kitab:pasal:ayat)", be.classList.contains("hl-pink"));
  }

  // ---------- 3) migrasi highlight lama ----------
  {
    const w = newWindow(); const A = w.Anno;
    w.localStorage.setItem("bible_highlights_v1_budi", JSON.stringify({ ind_2: { color: "yellow" }, ind_j: { color: "gray" }, ind_zzz: { color: "blue" } }));
    A._test.reset(); A._test.migrateLegacy_();
    expect("highlight lama dipindahkan jadi kategori berwarna sama", A.verseCategories(1, 1, 2).join() === "c_yellow" && A.verseCategories(43, 3, 16).join() === "c_gray");
    expect("warna tanpa kategori bawaan (abu-abu) dibuatkan kategorinya", A.getCategories().some((c) => c.id === "c_gray" && c.name === "Abu-abu"));
    expect("id ayat yang tidak ada dilewati", Object.keys(A._test.marks()).length === 2);
    A.clearVerse(1, 1, 2);
    A._test.migrateLegacy_();
    expect("migrasi hanya SEKALI (tanda yang dihapus tidak muncul lagi)", A.verseCategories(1, 1, 2).length === 0);
    expect("data lama di localStorage tidak dihapus", !!w.localStorage.getItem("bible_highlights_v1_budi"));
  }

  // ---------- 4) tanda sebagian teks di ayat ----------
  {
    const w = newWindow(); const A = w.Anno; const T = A._test;
    const b1 = w.eval('buildBlock(verseById["ind_1"])');
    const cont = b1.querySelector(".verse-text-wrap");
    const range = selectText(w, cont, "Allah menciptakan");
    const info = T.rangeInfo_(range);
    expect("posisi sorotan dihitung tanpa lencana 📝", info && info.on === "text" && info.q === "Allah menciptakan" && info.s === T1.indexOf("Allah"), info && { s: info.s, q: info.q });
    T.addRange_(info, "c_pink");
    const marks = cont.querySelectorAll("mark.anno-mark");
    expect("teks disorot dengan <mark> berwarna kategori", marks.length === 1 && marks[0].textContent === "Allah menciptakan" && marks[0].classList.contains("mk-pink"), cont.innerHTML);
    expect("teks ayat tidak berubah (salin/cari/TTS aman)", textOf(cont) === T1);
    // ditandai kedua kali + tumpang tindih
    const r2 = selectText(w, cont, "menciptakan langit"); T.addRange_(T.rangeInfo_(r2), "c_green");
    expect("dua sorotan tumpang tindih tetap utuh", textOf(cont) === T1 && cont.querySelectorAll("mark.anno-mark").length >= 2);
    T.unwrapMarks_(cont);
    expect("melepas semua <mark> mengembalikan teks persis semula", cont.querySelectorAll("mark").length === 0 && textOf(cont) === T1);
    // pengaitan ulang setelah teks ayat diedit administrator
    const v = w.eval('verseById["ind_1"]');
    cont.textContent = "Di awal segala sesuatu, " + T1.replace("Pada mulanya ", "");
    A.decorate(true);
    const still = cont.querySelectorAll("mark.anno-mark");
    expect("teks berubah tapi kutipan masih ada -> tanda dikaitkan ulang", still.length >= 1 && Array.from(still).some((m) => /Allah menciptakan|menciptakan langit/.test(m.textContent)), cont.innerHTML);
    cont.textContent = "Teks yang sama sekali berbeda.";
    A.decorate(true);
    expect("kutipan hilang dari teks -> tidak digambar & tidak error", cont.querySelectorAll("mark.anno-mark").length === 0);
    expect("tanda tetap tersimpan (muncul lagi kalau teks kembali)", Object.values(A._test.marks()).filter((m) => m.t === "r" && !m.d).length === 2);
  }

  // ---------- 5) tanda di catatan kaki + ayat dengan penanda catatan ----------
  {
    const w = newWindow(); const A = w.Anno; const T = A._test;
    const b2 = w.eval('buildBlock(verseById["ind_2"], { marker: true })');
    const note = b2.querySelector(".note-modal-admin-text");
    const r = selectText(w, note, "tentang penciptaan");
    const info = T.rangeInfo_(r);
    expect("sorotan di catatan kaki dikenali (on=note) & entri terdeteksi", info && info.on === "note" && !!info.entry && info.q === "tentang penciptaan", info && info.on);
    T.addRange_(info, "c_teal");
    expect("catatan kaki tersorot", note.querySelectorAll("mark.mk-teal").length === 1 && note.textContent.includes("Catatan pertama tentang penciptaan."));
    const tw = b2.querySelector(".verse-text-wrap");
    const r2 = selectText(w, tw, "karunia-Nya kita");
    T.addRange_(T.rangeInfo_(r2), "c_orange");
    expect("sorotan di ayat yang punya kata bertanda catatan kaki", tw.querySelectorAll("mark.mk-orange").length >= 1 && textOf(tw).includes("kasih") && tw.querySelector(".footnote-marker-word").textContent === "kasih");
    // ketuk tanda -> popup; tanda di dalam kata catatan kaki -> abaikan
    const mk = note.querySelector("mark.anno-mark");
    w.getSelection().removeAllRanges();
    mk.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    expect("mengetuk tanda membuka popup kategori", !!w.document.querySelector(".anno-popup .anno-cat-row"));
    w.document.querySelectorAll(".anno-popup").forEach((p) => p.remove());
  }

  // ---------- 6) toolbar sorotan ----------
  {
    const w = newWindow(); const A = w.Anno; const T = A._test;
    const b1 = w.eval('buildBlock(verseById["ind_1"])');
    const cont = b1.querySelector(".verse-text-wrap");
    selectText(w, cont, "langit dan bumi");
    T.updateSelBar_();
    const bar = w.document.querySelector(".anno-seltool");
    expect("teks disorot -> toolbar kategori muncul (8 tombol)", bar && bar.querySelectorAll(".anno-selbtn").length === 8, bar && bar.children.length);
    bar.querySelectorAll(".anno-selbtn")[1].click();
    expect("memilih kategori pada toolbar menandai teks & toolbar hilang", cont.querySelectorAll("mark.mk-green").length === 1 && !w.document.querySelector(".anno-seltool") && w.getSelection().isCollapsed);
    // sorotan di luar ayat/catatan -> tidak ada toolbar
    const outside = w.document.getElementById("moreMenu"); outside.textContent = "menu";
    const r = w.document.createRange(); r.selectNodeContents(outside); w.getSelection().removeAllRanges(); w.getSelection().addRange(r);
    T.updateSelBar_();
    expect("sorotan di luar area baca tidak memunculkan toolbar", !w.document.querySelector(".anno-seltool"));
    // seluruh catatan kaki
    const note = b1.querySelector(".note-modal-admin-text");
    selectText(w, note, "pertama");
    T.updateSelBar_();
    const bar2 = w.document.querySelector(".anno-seltool");
    expect("di catatan kaki ada tombol 'sorot seluruh catatan' (▣)", bar2 && !!bar2.querySelector(".anno-selbtn-all"));
    bar2.querySelector(".anno-selbtn-all").click();
    bar2.querySelectorAll(".anno-selbtn")[4].click(); // [0] = ▣, [1..8] = kategori -> [4] = Kasih (pink)
    const pinkText = Array.from(note.querySelectorAll("mark.mk-pink")).map((m) => m.textContent).join("");
    expect("▣ menandai seluruh entri catatan kaki", /^1a\s*Catatan pertama tentang penciptaan\.$/.test(pinkText.trim()) && !/kedua/.test(pinkText), pinkText);
  }

  // ---------- 7) bilah kategori di atas pasal ----------
  {
    const w = newWindow(); const A = w.Anno;
    w.eval('buildBlock(verseById["ind_1"]); buildBlock(verseById["ind_2"]);');
    A.renderFilterBar();
    expect("tanpa tanda -> bilah tidak muncul", !w.document.getElementById("annoFilterBar"));
    A.toggleVerseCat(1, 1, 1, "c_green"); A.toggleVerseCat(1, 1, 2, "c_green"); A.toggleVerseCat(1, 1, 2, "c_blue");
    const bar = w.document.getElementById("annoFilterBar");
    const chips = Array.from(bar.querySelectorAll(".anno-chip-green, .anno-chip-blue"));
    expect("bilah menampilkan kategori yang dipakai + jumlahnya", chips.length === 2 && chips[0].textContent.includes("2") && chips[1].textContent.includes("1"), chips.map((c) => c.textContent));
    chips[0].click();
    expect("mengetuk kategori menyembunyikannya di pasal", w.document.getElementById("v-ind_1").className.indexOf("hl-green") === -1 && w.document.querySelector(".anno-chip.off"));
    w.document.querySelector(".anno-chip-only").click();
    expect("'Hanya yang ditandai' + catatan jumlah", w.document.getElementById("v-ind_1").classList.contains("anno-hidden") && /Menampilkan 1 dari 2 ayat/.test(w.document.getElementById("annoFilterBar").textContent), w.document.getElementById("annoFilterBar").textContent);
    expect("pilihan sembunyikan/hanya-ditandai diingat", A._test.prefs_().hidden.join() === "c_green" && A._test.prefs_().only === true);
  }

  // ---------- 8) popup nomor ayat ----------
  {
    const w = newWindow(); const A = w.Anno;
    const b1 = w.eval('buildBlock(verseById["ind_1"])');
    A.registerVerseAction((v) => v.verse === 1 ? { label: "✏️ Edit ayat", onClick: () => { w.editCalled = v.id; } } : null);
    A.openVersePopup(b1.querySelector(".verse-num"), b1, w.eval('verseById["ind_1"]'));
    const pop = w.document.querySelector(".anno-popup");
    expect("popup menampilkan semua kategori", pop.querySelectorAll(".anno-cat-row").length === 8);
    pop.querySelectorAll(".anno-cat-row")[0].click(); pop.querySelectorAll(".anno-cat-row")[3].click();
    expect("memilih beberapa kategori di popup (popup tetap terbuka)", A.verseCategories(1, 1, 1).join() === "c_yellow,c_pink" && !!w.document.querySelector(".anno-popup"));
    expect("baris kategori menunjukkan status aktif", pop.querySelectorAll(".anno-cat-row.active").length === 2);
    const extra = Array.from(pop.querySelectorAll(".anno-popup-foot button")).find((b) => /Edit ayat/.test(b.textContent));
    expect("aksi tambahan (Edit ayat admin) muncul lewat registerVerseAction", !!extra);
    extra.click();
    expect("aksi tambahan dipanggil & popup tertutup", w.editCalled === "ind_1" && !w.document.querySelector(".anno-popup"));
    // tamu
    w.eval("Guest.isGuest = () => true;");
    A.openVersePopup(b1.querySelector(".verse-num"), b1, w.eval('verseById["ind_1"]'));
    expect("Tamu: popup tidak dibuka, fitur dikunci", !w.document.querySelector(".anno-popup") && w.lockedFor === "Penanda & Stabilo");
  }

  // ---------- 9) sinkron ----------
  {
    const w = newWindow(); const A = w.Anno; const T = A._test;
    A.toggleVerseCat(1, 1, 1, "c_green");
    A.addCategory("Baru", "gray", "🆕");
    expect("perubahan masuk antrean kirim", T.pending_().length === 2, T.pending_());
    const ok1 = await A.flush();
    const p = w.eval("posted")[0];
    expect("flush mengirim 'anno_push' berisi kategori & tanda", ok1 && p.type === "anno_push" && p.username === "budi" && p.items.length === 2 && p.items.some((i) => i.id === "v:1:1:1") && p.items.some((i) => /^cat:/.test(i.id)), p);
    expect("antrean kosong setelah terkirim", T.pending_().length === 0);
    w.eval("postFail = true;");
    A.toggleVerseCat(1, 1, 2, "c_blue");
    expect("offline: gagal terkirim tapi tetap antre", (await A.flush()) === false && T.pending_().length === 1);
    w.eval("postFail = false;");
    await A.flush();
    expect("kembali online: antrean terkirim", T.pending_().length === 0);
    // tarik dari server: yang lebih baru menang, batu nisan menghapus
    const mineNew = JSON.parse(JSON.stringify(T.marks()["v:1:1:1"])); mineNew.cats = ["c_teal"]; mineNew.u = "2099-01-01T00:00:00.000Z";
    const other = { id: "v:43:3:16", t: "v", b: 43, c: 3, v: 16, cats: ["c_coral"], u: "2026-09-20T00:00:00.000Z" };
    const old = JSON.parse(JSON.stringify(T.marks()["v:1:1:2"])); old.cats = ["c_orange"]; old.u = "2000-01-01T00:00:00.000Z";
    const tomb = { id: "v:9:9:9", t: "v", b: 9, c: 9, v: 9, cats: [], u: "2026-09-20T00:00:00.000Z" };
    w.eval("remote.items = " + JSON.stringify([
      { id: "v:1:1:1", json: JSON.stringify(mineNew), updatedAt: mineNew.u, deleted: false },
      { id: "v:43:3:16", json: JSON.stringify(other), updatedAt: other.u, deleted: false },
      { id: "v:1:1:2", json: JSON.stringify(old), updatedAt: old.u, deleted: false },
      { id: "v:9:9:9", json: JSON.stringify(tomb), updatedAt: tomb.u, deleted: true },
      { id: "cat:c_remote", json: JSON.stringify({ id: "c_remote", name: "Dari HP lain", color: "teal", icon: "📱", u: "2026-09-20T00:00:00.000Z" }), updatedAt: "2026-09-20T00:00:00.000Z", deleted: false },
    ]));
    const changed = await A.pullRemote();
    expect("tarik dari server: yang lebih baru menang", changed && A.verseCategories(1, 1, 1).join() === "c_teal");
    expect("tarik dari server: tanda baru & kategori baru masuk", A.verseCategories(43, 3, 16).join() === "c_coral" && A.getCategories().some((c) => c.id === "c_remote"));
    expect("tarik dari server: yang lebih lama diabaikan", A.verseCategories(1, 1, 2).join() === "c_blue");
    expect("tarik dari server: batu nisan tidak menampilkan tanda", A.verseCategories(9, 9, 9).length === 0);
    expect("titik awal tarikan berikutnya tersimpan", !!A._test.st_().syncedAt);
    w.eval("syncOn = false;");
    expect("server tidak dikonfigurasi -> tidak error", (await A.flush()) === false && (await A.pullRemote()) === false);
  }

  // ---------- 10) panel Penanda Saya ----------
  {
    const w = newWindow(); const A = w.Anno; const T = A._test;
    w.eval('buildBlock(verseById["ind_1"]);');
    A.toggleVerseCat(1, 1, 1, "c_green"); A.toggleVerseCat(43, 3, 16, "c_pink"); A.toggleVerseCat(43, 3, 16, "c_green");
    T.addRange_(T.rangeInfo_(selectText(w, w.document.querySelector("#v-ind_1 .verse-text-wrap"), "Allah")), "c_blue");
    T.addRange_(T.rangeInfo_(selectText(w, w.document.querySelector("#v-ind_1 .note-modal-admin-text"), "bumi")), "c_blue");
    w.document.getElementById("annoMenuBtn").click();
    const panel = w.document.getElementById("annoPanel");
    expect("menu membuka panel Penanda Saya & menyembunyikan panel lain", panel && !panel.hidden && w.document.getElementById("notesPanel").hidden);
    expect("panel mendaftar semua tanda (2 ayat + 2 teks)", panel.querySelectorAll(".anno-row").length === 4, panel.querySelectorAll(".anno-row").length);
    const refs = Array.from(panel.querySelectorAll(".result-ref")).map((e) => e.textContent);
    expect("urut menurut kitab-pasal-ayat, jenis tanda tertulis", /^Kejadian 1:1/.test(refs[0]) && refs.some((r) => /Catatan kaki/.test(r)) && /Yohanes 3:16/.test(refs[3]), refs);
    // saring per kategori
    Array.from(panel.querySelectorAll(".anno-panel-chips .anno-chip")).find((c) => /Perintah/.test(c.textContent)).click();
    expect("saringan kategori 'Perintah' -> hanya 2 tanda teks", w.document.querySelectorAll("#annoPanel .anno-row").length === 2, w.document.querySelectorAll("#annoPanel .anno-row").length);
    const sel = w.document.querySelector("#annoPanel select"); sel.value = "note"; sel.dispatchEvent(new w.Event("change"));
    expect("saringan jenis 'Catatan kaki'", w.document.querySelectorAll("#annoPanel .anno-row").length === 1 && /bumi/.test(w.document.querySelector("#annoPanel .result-text").textContent));
    Array.from(w.document.querySelectorAll("#annoPanel .anno-panel-chips .anno-chip")).find((c) => /Semua/.test(c.textContent)).click();
    const s2 = w.document.querySelector("#annoPanel select"); s2.value = "all"; s2.dispatchEvent(new w.Event("change"));
    const search = w.document.querySelector("#annoPanel .anno-panel-search"); search.value = "yohanes"; search.dispatchEvent(new w.Event("input"));
    expect("pencarian teks di panel", w.document.querySelectorAll("#annoPanel .anno-row").length === 1);
    w.document.querySelector("#annoPanel .anno-row-open").click();
    const rd = w.eval("rendered");
    expect("mengetuk baris membuka pasal & ayatnya", rd.length === 1 && rd[0].b === 43 && rd[0].c === 3 && rd[0].v === 16, rd);
    // hapus dari panel
    search.value = ""; search.dispatchEvent(new w.Event("input"));
    const before = w.document.querySelectorAll("#annoPanel .anno-row").length;
    Array.from(w.document.querySelectorAll("#annoPanel .anno-row-actions button")).find((b) => /Hapus/.test(b.textContent)).click();
    expect("hapus dari panel", w.document.querySelectorAll("#annoPanel .anno-row").length === before - 1);
    // buka tanda teks berbahasa lain -> pindah bahasa
    const w2 = newWindow(); const T2 = w2.Anno._test;
    w2.eval('buildBlock(verseById["eng_1"]);');
    T2.addRange_(T2.rangeInfo_(selectText(w2, w2.document.querySelector("#v-eng_1 .verse-text-wrap"), "God")), "c_pink");
    w2.eval("function bookAvailableInLang() { return true; } function langSelectEl() { return { value: '' }; } function buildSidebar() {}");
    w2.Anno.showPanel();
    w2.document.querySelector("#annoPanel .anno-row-open").click();
    expect("tanda teks Inggris dibuka dalam bahasa Inggris", w2.eval("currentLang") === "eng" && w2.eval("rendered")[0].lang === "eng");
    // tamu
    const w3 = newWindow(); w3.eval("Guest.isGuest = () => true;"); w3.Anno.showPanel();
    expect("Tamu: panel dikunci", w3.lockedFor === "Penanda & Stabilo" && !w3.document.getElementById("annoPanel"));
  }

  // ---------- 11) kelola kategori ----------
  {
    const w = newWindow(); const A = w.Anno;
    A.openCategoryManager();
    const box = w.document.querySelector(".anno-cat-box");
    expect("dialog kelola kategori: 8 baris + baris tambah", box.querySelectorAll(".anno-cat-edit").length === 9);
    const first = box.querySelector(".anno-cat-edit");
    const name = first.querySelector(".anno-name-input"); name.value = "Sangat Penting"; name.dispatchEvent(new w.Event("change"));
    const color = first.querySelector("select"); color.value = "orange"; color.dispatchEvent(new w.Event("change"));
    expect("ubah nama & warna lewat dialog langsung tersimpan", A.getCategories()[0].name === "Sangat Penting" && A.getCategories()[0].color === "orange");
    const nn = box.querySelector(".anno-cat-new"); nn.querySelector(".anno-name-input").value = "Pelayanan"; nn.querySelector(".anno-icon-input").value = "🎯";
    nn.querySelector("button").click();
    expect("tambah kategori lewat dialog", A.getCategories().some((c) => c.name === "Pelayanan" && c.icon === "🎯"));
    A.toggleVerseCat(1, 1, 1, "c_blue");
    box.querySelectorAll(".anno-cat-edit")[2].querySelector("button.danger").click();
    expect("hapus kategori lewat dialog (dengan konfirmasi)", !A.getCategories().some((c) => c.id === "c_blue") && A.verseCategories(1, 1, 1).length === 0);
    w.document.querySelector(".anno-cat-box .simple-dialog-actions button").click();
    expect("dialog tertutup", !w.document.getElementById("annoCatOverlay"));
  }

  // ---------- 12) pengamat DOM: pasal baru langsung tergambar ----------
  {
    const w = newWindow(); const A = w.Anno;
    A.toggleVerseCat(1, 1, 1, "c_green");
    w.eval('buildBlock(verseById["ind_1"]);');
    await wait(60);
    expect("blok ayat baru (render pasal) otomatis digambari tanda", w.document.getElementById("v-ind_1").classList.contains("hl-green"));
    A.toggleVerseCat(1, 1, 2, "c_blue");
    w.eval('document.getElementById("readerVerses").innerHTML = ""; buildBlock(verseById["ind_2"]);');
    await wait(60);
    expect("render ulang pasal: tanda dipasang lagi + bilah kategori diperbarui", w.document.getElementById("v-ind_2").classList.contains("hl-blue") && !!w.document.getElementById("annoFilterBar"));
  }

  console.log(ok ? "\nSEMUA LULUS" : "\nADA YANG GAGAL");
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
