// Uji MODE NEMPEL (book168): node tests/pinyin-ruby.test.js
"use strict";
const P = require("../js/pinyin-ruby.js");
let ok = true;
const expect = (n, c, x) => { console.log((c ? "PASS" : "FAIL") + " - " + n + (c ? "" : " :: " + JSON.stringify(x))); if (!c) ok = false; };

const han = "我所親愛、所想念的弟兄們，你們就是我的喜樂，我的冠冕。我親愛的弟兄，你們應當靠主站立得穩。";
const py = "wǒ suǒ qīn ài, suǒ xiǎng niàn de dì xiōng men, nǐ men jiù shì wǒ de xǐ lè, wǒ de guān miǎn. wǒ qīn ài de dì xiōng, nǐ men yīng dāng kào zhǔ zhàn lì dé wěn.";
const c = P.align(han, py);
expect("Filipi 4:1 sejajar 1:1", c && c.length === 39 && c[0].han === "我" && c[0].py === "wǒ", c && c.length);
expect("tanda baca ikut karakter sebelumnya (愛、 -> ài)", c && c[3].han === "愛、" && c[3].py === "ài", c && c[3]);
expect("kalimat 2", (() => { const a = P.align("我勸友阿爹和循都基，要在主裡同心。", "wǒ quàn yǒu ā diē hé xún dōu jī, yào zài zhǔ lǐ tóng xīn."); return a && a.length === 15 && a[8].han === "基，" && a[14].han === "心。"; })(), null);
expect("tanda pembuka ikut karakter BERIKUTNYA", (() => { const a = P.align("「神」說", "shén shuō"); return a && a[0].han === "「神」" && a[1].han === "說"; })(), null);
expect("jumlah tidak sama -> null (tidak menebak)", P.align("我所親愛", "wǒ suǒ qīn") === null && P.align("我所親愛", "wǒ suǒ qīn ài de") === null, null);
expect("pinyin tanpa spasi setelah koma", (P.syllables("wǒ,nǐ men") || []).join("|") === "wǒ|nǐ|men", P.syllables("wǒ,nǐ men"));
expect("apostrof dipisah (xiān'ér)", P.syllables("xiān'ér").length === 2, null);
expect("kosong -> null", P.align("", "") === null && P.align("abc", "") === null, null);
expect("pasangan bahasa", P.pairCode("chs") === "chs_pinyin" && P.pairCode("chssmp") === "chssmp_pinyin" && P.pairCode("ind") === "", null);
expect("isPinyinCode", P.isPinyinCode("chs_pinyin") && !P.isPinyinCode("chs"), null);
const g = P.align("耶和華神所造的，惟有蛇比田野一切的活物更狡猾。蛇對女人說：神豈是真說不許你們吃園中所有樹上的果子麼？", "yē hé huá shén suǒ zào de, wéi yǒu shé bǐ tián yě yī qiè de huó wù gèng jiǎo huá. shé duì nǚ rén shuō: shén qǐ shì zhēn shuō bù xǔ nǐ men chī yuán zhōng suǒ yǒu shù shàng de guǒ zi me?");
expect("Kejadian 3:1 sejajar", g && g.length === 46 && g[45].han === "麼？", g && g.length);

// ---- book169: Studio Presentasi (mergeTexts / mergeGroups / alignVerseText) ----
const mt = P.mergeTexts([
  { code: "ind", label: "ITB", text: "Kitab silsilah" },
  { code: "chs", label: "MDR", text: "1 我所愛 2 你們好。" },
  { code: "chs_pinyin", label: "MDR-PINYIN", text: "1 wǒ suǒ ài 2 nǐ men hǎo." },
]);
expect("mergeTexts: IND tetap, Mandarin+pinyin jadi 1 entri", mt.length === 2 && mt[0].code === "ind" && mt[1].ruby && mt[1].label === "MDR + MDR-PINYIN", mt);
expect("nomor ayat jadi num pada karakter berikutnya, bukan karakter", mt[1].ruby.length === 6 && mt[1].ruby[0].num === "1" && mt[1].ruby[3].num === "2" && mt[1].ruby[2].han === "愛", mt[1].ruby);
const bad = P.mergeTexts([{ code: "chs", label: "MDR", text: "我所愛" }, { code: "chs_pinyin", label: "P", text: "wǒ suǒ" }]);
expect("jumlah beda -> TIDAK digabung (tetap 2 blok biasa)", bad.length === 2 && !bad[0].ruby, bad);
const only = P.mergeTexts([{ code: "chs", label: "MDR", text: "我" }]);
expect("tanpa pinyin -> apa adanya", only.length === 1 && !only[0].ruby, only);
const sm = P.mergeTexts([{ code: "chssmp", label: "MDR-S", text: "我" }, { code: "chssmp_pinyin", label: "MDR-S-PINYIN", text: "wǒ" }, { code: "chs", label: "MDR", text: "我" }, { code: "chs_pinyin", label: "MDR-PINYIN", text: "wǒ" }]);
expect("Sederhana & Tradisional sekaligus: 2 pasangan terpisah", sm.length === 2 && sm[0].label === "MDR-S + MDR-S-PINYIN" && sm[1].label === "MDR + MDR-PINYIN", sm);
const mg = P.mergeGroups([
  { ref: "Matius 1:1", texts: [{ code: "chs", label: "MDR", text: "我" }, { code: "chs_pinyin", label: "MDR-PINYIN", text: "wǒ" }, { code: "ind", label: "ITB", text: "a" }] },
  { ref: "Matius 1:2", texts: [{ code: "chs", label: "MDR", text: "你" }, { code: "chs_pinyin", label: "MDR-PINYIN", text: "nǐ" }, { code: "ind", label: "ITB", text: "b" }] },
]);
expect("label Mandarin+Pinyin hanya di ayat paling atas", mg[0].texts[0].label === "MDR + MDR-PINYIN" && mg[1].texts[0].label === "" && mg[1].texts[0].ruby, mg);
expect("label bahasa lain (ITB) tetap di tiap ayat", mg[0].texts[1].label === "ITB" && mg[1].texts[1].label === "ITB", mg);
console.log(ok ? "\nALL PASS" : "\nSOME FAIL"); process.exit(ok ? 0 : 1);
