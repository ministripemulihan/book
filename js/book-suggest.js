// ============================================================
//  SARAN OTOMATIS NAMA KITAB (book-name autocomplete)
//  ------------------------------------------------------------
//  BARU (14 Sep 2026, permintaan operator) -- dipakai di 2 kotak
//  ketik referensi Alkitab:
//    1. Kotak pencarian utama (#searchInput, index.html)
//    2. Kotak "Ayat Cepat" Studio Presentasi (#psQuickRef)
//
//  Perilaku:
//   - Begitu bagian yang sedang diketik cocok dengan AWALAN salah
//     satu dari 66 nama/alias kitab (lihat BOOKS/BOOK_ALIAS_INDEX,
//     js/books.js), muncul daftar saran berisi NAMA LENGKAP kitab
//     saja (bukan singkatan, bukan yang lain) -- mis. ketik "yeh"
//     -> saran "Yehezkiel" (bukan "Yeremia" muncul duluan karena
//     alias "yeh" cuma cocok dgn Yehezkiel; "ye" akan memunculkan
//     keduanya, diurutkan sesuai nomor kitab).
//   - TIDAK PERNAH langsung mengubah isi kotak hanya karena
//     mengetik -- kotak baru terisi lengkap kalau operator secara
//     EKSPLISIT memilih:
//       * Tab di keyboard komputer (langsung isi lengkap), atau
//       * tap/klik langsung pada salah satu saran di daftar --
//         inilah cara HP menerima pilihan (keyboard virtual HP
//         umumnya tidak mengirim tombol Tab, jadi otomatis tidak
//         akan pernah "tiba-tiba berubah sendiri" saat mengetik).
//   - Hanya berlaku untuk NAMA KITAB DI AWAL referensi/kelompok --
//     begitu ada angka pasal, atau posisi sedang di token ke-2+
//     dalam 1 grup psQuickRef (dipisah koma, kitab tidak
//     "menular"), saran otomatis disembunyikan.
// ============================================================
(function () {
  const MIN_CHARS = 2;
  const MAX_SUGGESTIONS = 8;

  function normalize(s) {
    return String(s || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/\./g, "");
  }

  // Ambil bagian "nama kitab yang sedang diketik" dari 1 potongan teks
  // (caller sudah memastikan ini awal grup/referensi baru). Kembalikan
  // "" begitu bagian itu sudah masuk ke pasal/ayat (ada angka DI LUAR
  // pola ordinal kitab "1/2/3 <kitab>", mis. "1 samuel", "2 tim").
  function extractBookPrefix(segment) {
    const q = normalize(segment).trim();
    if (!q) return "";
    if (/^[123]\s*[a-z-]*$/.test(q)) return q; // ordinal kitab, msh boleh
    if (/\d/.test(q)) return ""; // sudah masuk pasal/ayat -- stop saran
    return q;
  }

  function matchBooks(prefix) {
    if (!prefix || prefix.length < MIN_CHARS) return [];
    if (typeof BOOK_ALIAS_INDEX === "undefined") return [];
    const seen = new Set();
    const out = [];
    Object.keys(BOOK_ALIAS_INDEX).forEach((alias) => {
      if (alias.indexOf(prefix) === 0) {
        const book = BOOK_ALIAS_INDEX[alias];
        if (book && !seen.has(book.num)) { seen.add(book.num); out.push(book); }
      }
    });
    out.sort((a, b) => a.num - b.num);
    return out.slice(0, MAX_SUGGESTIONS);
  }

  // opts.getRange(value, caret) -> {start, end, prefix} | null
  // opts.context -> "search" | "studio" (dipakai cuma utk styling)
  function attach(input, opts) {
    if (!input) return;

    const list = document.createElement("div");
    list.className = "book-suggest-list";
    list.dataset.context = opts.context || "search";
    list.hidden = true;
    document.body.appendChild(list);

    let currentMatches = [];
    let currentRange = null;
    let activeIndex = 0;

    function hide() {
      list.hidden = true;
      list.innerHTML = "";
      currentMatches = [];
      currentRange = null;
    }

    function reposition() {
      const rect = input.getBoundingClientRect();
      list.style.left = rect.left + "px";
      list.style.top = (rect.bottom + 2) + "px";
      list.style.width = rect.width + "px";
    }

    function renderList() {
      list.innerHTML = currentMatches
        .map((b, i) => `<div class="book-suggest-item${i === activeIndex ? " active" : ""}" data-idx="${i}">${b.name}</div>`)
        .join("");
      list.hidden = currentMatches.length === 0;
    }

    function applyChoice(idx) {
      const book = currentMatches[idx];
      if (!book || !currentRange) return;
      const val = input.value;
      const before = val.slice(0, currentRange.start);
      const after = val.slice(currentRange.end);
      const insertion = book.name + " ";
      input.value = before + insertion + after;
      const caretPos = before.length + insertion.length;
      input.setSelectionRange(caretPos, caretPos);
      hide();
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    }

    function update() {
      const caret = input.selectionStart || 0;
      const range = opts.getRange(input.value, caret);
      if (!range || !range.prefix || range.prefix.length < MIN_CHARS) { hide(); return; }
      const matches = matchBooks(range.prefix);
      if (!matches.length) { hide(); return; }
      currentMatches = matches;
      currentRange = range;
      activeIndex = 0;
      reposition();
      renderList();
    }

    input.addEventListener("input", update);
    input.addEventListener("click", update);
    input.addEventListener("keydown", (e) => {
      if (list.hidden) return;
      if (e.key === "Tab") {
        // SATU-SATUNYA jalur "langsung isi lengkap" -- khusus keyboard
        // fisik komputer (lihat catatan perilaku di atas file ini).
        e.preventDefault();
        applyChoice(activeIndex);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, currentMatches.length - 1);
        renderList();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        renderList();
      } else if (e.key === "Escape") {
        hide();
      }
    });
    // mousedown (bukan click) supaya pilihan diproses SEBELUM kotak
    // kehilangan fokus (blur) -- ini jalur tap-pilih di HP.
    list.addEventListener("mousedown", (e) => {
      const itemEl = e.target.closest(".book-suggest-item");
      if (!itemEl) return;
      e.preventDefault();
      applyChoice(parseInt(itemEl.dataset.idx, 10));
    });
    input.addEventListener("blur", () => { setTimeout(hide, 150); });
    window.addEventListener("resize", () => { if (!list.hidden) reposition(); });
  }

  // ------------------------------------------------------------
  // Kotak #1: Pencarian utama (index.html) -- 1 referensi saja,
  // seluruh isi kotak (dari awal sampai posisi kursor) 1 grup.
  // ------------------------------------------------------------
  function rangeForSearchInput(value, caret) {
    const prefix = extractBookPrefix(value.slice(0, caret));
    if (!prefix) return null;
    return { start: 0, end: caret, prefix };
  }

  // ------------------------------------------------------------
  // Kotak #2: Ayat Cepat Studio Presentasi (#psQuickRef) -- boleh
  // banyak grup dipisah ";"/baris baru; nama kitab CUMA muncul di
  // token PERTAMA tiap grup (sebelum koma pertama dalam grup itu).
  // ------------------------------------------------------------
  function rangeForQuickRef(value, caret) {
    const upToCaret = value.slice(0, caret);
    const lastDelim = Math.max(upToCaret.lastIndexOf(";"), upToCaret.lastIndexOf("\n"));
    const groupStart = lastDelim + 1;
    const group = value.slice(groupStart, caret);
    if (group.indexOf(",") !== -1) return null; // sudah lewat token pertama grup ini
    const leadingWs = group.match(/^\s*/)[0].length;
    const segStart = groupStart + leadingWs;
    const prefix = extractBookPrefix(value.slice(segStart, caret));
    if (!prefix) return null;
    return { start: segStart, end: caret, prefix };
  }

  function init() {
    const searchInput = document.getElementById("searchInput");
    if (searchInput) attach(searchInput, { getRange: rangeForSearchInput, context: "search" });
    const quickRef = document.getElementById("psQuickRef");
    if (quickRef) attach(quickRef, { getRange: rangeForQuickRef, context: "studio" });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
