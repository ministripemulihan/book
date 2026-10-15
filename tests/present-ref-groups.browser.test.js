// Uji Layar 2 (present.html) di browser sungguhan -- v54 (15 Okt 2026):
//   - slide ayat gabungan multi-bahasa (data.groups): nama ayat per blok + pasangan bahasa berurutan
//   - tema refScale/refColor mengubah ukuran & warna nama kitab (#ref.ref-verse), kidung TIDAK ikut
// Jalankan: NODE_PATH=$(npm root -g) node tests/present-ref-groups.browser.test.js (butuh playwright + chromium)
"use strict";
const path = require("path");
const { chromium } = require("playwright");
const root = path.join(__dirname, "..");
let ok = true;
function expect(name, cond, extra) { console.log((cond ? "PASS" : "FAIL") + " - " + name + (cond ? "" : " :: " + JSON.stringify(extra))); if (!cond) ok = false; }
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto("file://" + path.join(root, "present.html"));
  await page.waitForTimeout(500);
  const sizeBefore = await page.evaluate(() => { render({ type: "verse", ref: "Wahyu 2:5", text: "x" }); return parseFloat(getComputedStyle(document.getElementById("ref")).fontSize); });
  const data = {
    type: "verse", ref: "Wahyu 2:5; 1 Tesalonika 2:5; Matius 28:19",
    texts: [{ label: "IND-RCV", text: "a" }],
    groups: [
      { ref: "Wahyu 2:5", texts: [{ label: "IND-RCV", text: "Sebab itu ingatlah" }, { label: "ENG-RCV", text: "Remember therefore" }] },
      { ref: "1 Tesalonika 2:5", texts: [{ label: "IND-RCV", text: "Karena seperti" }, { label: "ENG-RCV", text: "For neither were" }] },
      { ref: "Matius 28:19", texts: [{ label: "IND-RCV", text: "Karena itu, pergilah" }, { label: "ENG-RCV", text: "Go therefore" }] }
    ]
  };
  const res = await page.evaluate((d) => {
    render(d);
    const groups = Array.from(document.querySelectorAll("#text .verse-group"));
    return {
      n: groups.length,
      heads: groups.map((g) => g.querySelector(".verse-group-ref") && g.querySelector(".verse-group-ref").textContent),
      tags: groups.map((g) => Array.from(g.querySelectorAll(".verse-version-tag")).map((t) => t.textContent)),
      refText: document.getElementById("ref").textContent,
      refHidden: document.getElementById("ref").hidden,
      refIsVerse: document.getElementById("ref").classList.contains("ref-verse"),
      size: parseFloat(getComputedStyle(document.getElementById("ref")).fontSize)
    };
  }, data);
  expect("3 kelompok ayat", res.n === 3, res);
  expect("nama ayat di tiap kelompok", JSON.stringify(res.heads) === JSON.stringify(["Wahyu 2:5", "1 Tesalonika 2:5", "Matius 28:19"]), res.heads);
  expect("tiap ayat berpasangan IND lalu ENG", res.tags.every((t) => t[0] === "IND-RCV" && t[1] === "ENG-RCV"), res.tags);
  expect("nama gabungan di paling atas DISEMBUNYIKAN kalau tiap ayat punya nama sendiri (tidak dobel)", res.refHidden === true && res.refText === "", res);
  expect("nama kitab ayat memakai kelas ref-verse & lebih besar dari 16px", res.refIsVerse && res.size > 16, res);
  // tanpa nama ayat per blok (centang dimatikan)
  const noHead = await page.evaluate((d) => { const c = JSON.parse(JSON.stringify(d)); c.groups.forEach((g) => { g.ref = ""; }); render(c); return { n: document.querySelectorAll("#text .verse-group-ref").length, hidden: document.getElementById("ref").hidden, top: document.getElementById("ref").textContent }; }, data);
  expect("tanpa nama ayat per blok kalau dimatikan", noHead.n === 0, noHead);
  expect("nama gabungan di paling atas TAMPIL kalau nama per ayat dimatikan", noHead.hidden === false && /Wahyu 2:5; 1 Tesalonika/.test(noHead.top), noHead);
  // tema: ukuran & warna
  const t = await page.evaluate(() => {
    render({ type: "verse", ref: "Yoh 3:16", text: "x" });
    const a = parseFloat(getComputedStyle(document.getElementById("ref")).fontSize);
    applyTheme({ refScale: 3, refColor: "#ff7aa8" });
    const b = parseFloat(getComputedStyle(document.getElementById("ref")).fontSize);
    const color = getComputedStyle(document.getElementById("ref")).color;
    applyTheme({ refColor: "" });
    const color2 = getComputedStyle(document.getElementById("ref")).color;
    return { a, b, color, color2 };
  });
  expect("refScale 300% membesarkan nama kitab ~2x dibanding 150%", t.b > t.a * 1.7, t);
  expect("refColor merah muda diterapkan", t.color === "rgb(255, 122, 168)", t);
  expect("refColor kosong kembali ke warna bawaan", t.color2 !== "rgb(255, 122, 168)", t);
  const kid = await page.evaluate(() => { render({ type: "kidung", ref: "K001", bait: [{ noBait: 1, teks: "a" }] }); return document.getElementById("ref").classList.contains("ref-verse"); });
  expect("judul kidung TIDAK memakai gaya nama kitab", kid === false, kid);

  // v63 -- nomor ayat subscript berwarna (tema gelap kuning, tema terang kontras != warna tulisan)
  const vn = await page.evaluate(() => {
    const t4 = "17 Ketika melihat Dia mereka menyembah-Nya, tetapi beberapa orang ragu-ragu. 18 Yesus mendekati mereka dan berkata: Kepada-Ku telah diberikan segala kuasa. 19 Karena itu pergilah, 20 dan ajarlah mereka.";
    applyTheme({ bgColor: "#05070c", ink: "#f5f2e8" });
    render({ type: "verse", ref: "Matius 28:17-20", texts: [{ label: "ITB", text: t4 }] });
    const spans = Array.from(document.querySelectorAll("#text .vnum"));
    const dark = spans.length ? getComputedStyle(spans[0]).color : "";
    const va = spans.length ? getComputedStyle(spans[0]).verticalAlign : "";
    applyTheme({ bgColor: "#ffffff", ink: "#111111" });
    const light = getComputedStyle(document.querySelector("#text .vnum")).color;
    const ink = getComputedStyle(document.getElementById("text")).color;
    render({ type: "verse", ref: "Efesus 6:1", text: "12 orang itu pergi dan 3 kali kembali." });
    const single = document.querySelectorAll("#text .vnum").length;
    render({ type: "verse", ref: "Gabungan", text: "1 Pada mulanya 2 Allah\n\n16 Karena begitu" });
    const comb = Array.from(document.querySelectorAll("#text .vnum")).map((x) => x.textContent);
    return { nums: spans.map((x) => x.textContent), dark, va, light, ink, single, comb };
  });
  expect("nomor ayat 17,18,19,20 dibungkus .vnum (angka lain tidak)", JSON.stringify(vn.nums) === JSON.stringify(["17", "18", "19", "20"]), vn);
  expect("tema gelap: nomor ayat kuning", vn.dark === "rgb(255, 216, 74)", vn.dark);
  expect("nomor ayat superscript (di atas baris)", vn.va === "super", vn.va);
  expect("tema putih: nomor ayat biru kontras & beda dari warna tulisan", vn.light === "rgb(29, 78, 216)" && vn.light !== vn.ink, vn);
  expect("teks 1 ayat berawalan angka biasa TIDAK dianggap nomor ayat", vn.single === 0, vn.single);
  expect("gabungan beda kitab: 1,2 dan 16 ikut bernomor", JSON.stringify(vn.comb) === JSON.stringify(["1", "2", "16"]), vn.comb);
  await browser.close();
  console.log(ok ? "SEMUA LULUS" : "ADA YANG GAGAL");
  process.exit(ok ? 0 : 1);
})();
