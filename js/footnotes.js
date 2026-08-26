// ============================================================
//  CATATAN KAKI PER-KATA (Alkitab Recovery Version) 
// ------------------------------------------------------------
//  Beberapa bahasa (mis. rvind/rveng) menyimpan tanda catatan kaki
//  DI DALAM teks ayat itu sendiri, menempel ke kata tertentu, mis.:
//    "Inilah <FR><sup>1a</sup><Fr>daftar nenek moyang <FR><sup>2</sup><Fr>Yesus..."
//  Sebelumnya (lihat cleanVerseText() di js/csv.js) tanda ini SELALU
//  dibuang total supaya teks ayat bersih untuk disalin/dicari/dibacakan
//  TTS -- akibatnya pembaca tidak pernah tahu kata mana saja yang
//  sebenarnya punya catatan penjelasan, walau catatannya sendiri ADA
//  di kolom Note.
//
//  File ini menambahkan JALUR TAMPILAN KEDUA (tanpa mengubah v.text
//  yang sudah bersih, supaya salin/cari/TTS tidak terpengaruh sama
//  sekali): v.markedText menyimpan teks yang sama tapi tanda catatan
//  kakinya diubah jadi PENANDA (dipisah karakter U+0001) yang lalu
//  dibangun jadi elemen <sup class="footnote-marker"> yang bisa
//  ditekan (lihat renderVerseTextWithFootnotes()).
// ============================================================

// Dipanggil dari normalizeVerseRecord() (js/csv.js) -- BEDA dari
// cleanVerseText() yang membuang tanda sepenuhnya, fungsi ini
// menyimpan tanda ("1a", "2", "3b", dst) sebagai penanda tersembunyi
// supaya nanti bisa dibangun jadi tombol superskrip.
function extractFootnoteMarkedText(t) {
  if (!t) return t;
  return t
    .replace(/<FR>\s*<sup>([^<]*)<\/sup>\s*<Fr>/gi, (m, marker) => "\u0001" + marker.trim() + "\u0001")
    .replace(/<\/?(FR|Fr|sup)>/gi, "")
    .replace(/\{\(?[HG]\d+\)?\}/g, "")
    .trim();
}

// Membangun isi <div class="verse-text-wrap"> dengan tanda catatan kaki
// sebagai elemen <sup> yang bisa ditekan -- dipakai buildVerseBlock()
// (js/app.js) sebagai pengganti `textWrap.textContent = v.text` biasa,
// KHUSUS untuk ayat yang punya v.markedText (mengandung penanda U+0001).
// Kalau tidak ada penanda sama sekali, hasilnya sama persis dengan teks
// polos biasa (aman dipakai untuk semua bahasa, bukan cuma rvind/rveng).
function renderVerseTextWithFootnotes(wrap, markedText) {
  wrap.innerHTML = "";
  const raw = String(markedText || "");
  if (raw.indexOf("\u0001") === -1) {
    wrap.textContent = raw;
    return;
  }
  const parts = raw.split("\u0001");
  let lastMarkerKey = null;
  parts.forEach((part, i) => {
    if (i % 2 === 0) {
      // Bagian teks biasa. Kalau bagian SEBELUMNYA barusan sebuah tanda
      // catatan kaki (i>0), kata PERTAMA di sini (sampai spasi/tanda baca
      // berikutnya) ikut diwarnai biru & bisa ditekan juga -- supaya area
      // sentuh/klik tidak cuma superskrip kecil, sesuai contoh aplikasi
      // Recovery Version resminya (satu kata sebelum spasi berikutnya yang
      // dipakai, bukan cuma tandanya sendiri).
      if (lastMarkerKey && part) {
        const m = part.match(/^(\S+)([\s\S]*)$/);
        if (m) {
          const wordSpan = document.createElement("span");
          wordSpan.className = "footnote-marker-word";
          wordSpan.textContent = m[1];
          wordSpan.dataset.fnKey = lastMarkerKey;
          wordSpan.setAttribute("role", "button");
          wordSpan.tabIndex = 0;
          wordSpan.title = "Tekan untuk membaca catatan " + lastMarkerKey + " — tekan lagi untuk menutup";
          wrap.appendChild(wordSpan);
          if (m[2]) wrap.appendChild(document.createTextNode(m[2]));
        } else {
          wrap.appendChild(document.createTextNode(part));
        }
      } else if (part) {
        wrap.appendChild(document.createTextNode(part));
      }
      lastMarkerKey = null;
    } else {
      const marker = part.trim();
      if (!marker) { lastMarkerKey = null; return; }
      const sup = document.createElement("sup");
      sup.className = "footnote-marker";
      sup.textContent = marker;
      sup.dataset.fnKey = marker;
      sup.setAttribute("role", "button");
      sup.tabIndex = 0;
      sup.title = "Tekan untuk membaca catatan " + marker + " — tekan lagi untuk menutup";
      wrap.appendChild(sup);
      lastMarkerKey = marker;
    }
  });
}

// ------------------------------------------------------------
//  MEM-PARSE kolom Note (satu blok HTML berisi banyak <p>...</p>,
//  lihat contoh_isi_alkitab.xlsx) menjadi potongan-potongan per
//  penanda (nomor & huruf), supaya waktu tanda "3b" di teks ditekan,
//  HANYA bagian catatan no. 3 (komentar) + huruf b (rujukan silang)
//  saja yang ditampilkan -- bukan seluruh isi catatan ayat sekaligus.
//
//  Pola yang dikenali di AWAL tiap <p>:
//    "(1)(a)..."  -> gabungan nomor 1 + huruf a dalam SATU paragraf
//    "(2)..."     -> nomor saja (komentar/penjelasan)
//    "(b)..." / "(C)..." -> huruf saja (rujukan silang Alkitab)
//  Paragraf TANPA salah satu pola di atas dianggap SAMBUNGAN dari
//  entri sebelumnya (mis. daftar rujukan lanjutan / komentar panjang
//  yang dipecah jadi beberapa <p>).
// ------------------------------------------------------------
function parseFootnoteEntries(noteHtml) {
  if (!noteHtml) return [];
  const paras = [...noteHtml.matchAll(/<p>([\s\S]*?)<\/p>/gi)]
    .map((m) => m[1].trim())
    .filter(Boolean);
  const entries = []; // { num: "1"|null, letter: "a"|null, parts: [htmlParagraf, ...] }
  let current = null;
  const startPattern = /^\s*\(\s*(\d+)\s*\)\s*\(\s*([A-Za-z])\s*\)|^\s*\(\s*(\d+)\s*\)|^\s*\(\s*([A-Za-z])\s*\)/;
  paras.forEach((p) => {
    const m = p.match(startPattern);
    if (m) {
      const num = m[1] || m[3] || null;
      const letterRaw = m[2] || m[4] || null;
      current = { num, letter: letterRaw ? letterRaw.toLowerCase() : null, parts: [p] };
      entries.push(current);
    } else if (current) {
      current.parts.push(p);
    } else {
      current = { num: null, letter: null, parts: [p] };
      entries.push(current);
    }
  });
  return entries;
}

// Mengambil catatan (HTML, digabung jadi satu string <p>...</p>) untuk
// SATU tanda tertentu di teks ayat (mis. "1a", "2", "3b") -- digabung
// dari entri bernomor (komentar) + entri berhuruf (rujukan silang)
// sesuai urutan aslinya di kolom Note.
function getFootnoteContentForMarker(noteHtml, marker) {
  const entries = parseFootnoteEntries(noteHtml);
  if (!entries.length) return "";
  const m = String(marker || "").match(/^(\d+)?\s*([A-Za-z])?$/);
  const num = m ? m[1] : null;
  const letter = m && m[2] ? m[2].toLowerCase() : null;
  if (!num && !letter) return "";
  const matched = entries.filter((e) => (num && e.num === num) || (letter && e.letter === letter));
  if (!matched.length) return "";
  const htmlParts = [];
  matched.forEach((e) => e.parts.forEach((p) => htmlParts.push("<p>" + p + "</p>")));
  return htmlParts.join("");
}

// ------------------------------------------------------------
//  Membangun HTML catatan LENGKAP satu ayat (SEMUA nomor & huruf
//  sekaligus, tidak dipotong-potong), tapi tiap entri dibungkus
//  <div class="footnote-entry" data-fn-num=".." data-fn-letter="..">
//  supaya nanti bisa DILOMPATI & disorot sebagian saja saat salah satu
//  tanda di teks ayat ditekan (lihat setupFootnoteMarkerHandlers() di
//  bawah) -- TANPA membuat kotak ringkasan terpisah yang isinya dobel
//  dengan catatan lengkap ini (itu cara LAMA, sudah dilepas).
//  Dipanggil dari buildInlineNoteCardEl() di js/app.js untuk mengisi
//  "adminText" (catatan Alkitab lengkap yang tampil di panel sebaris).
// ------------------------------------------------------------
function buildFootnoteEntriesHtml(noteHtml, bookNumber, chapter) {
  const clean = typeof sanitizeNoteHtml === "function" ? sanitizeNoteHtml : (h) => h || "";
  const link = typeof linkifyOsisReferences === "function" ? linkifyOsisReferences : (h) => h;
  const entries = parseFootnoteEntries(noteHtml);
  if (!entries.length) {
    // Catatan tanpa pola "(1)"/"(a)" yang dikenali (mis. teks bebas tanpa
    // tanda kaki sama sekali) -- tampilkan apa adanya, tidak bisa dilompati
    // per tanda karena memang tidak ada tandanya.
    return link(clean(noteHtml || ""), bookNumber, chapter);
  }
  return entries
    .map((entry) => {
      const raw = entry.parts.map((p) => "<p>" + p + "</p>").join("");
      const safe = link(clean(raw), bookNumber, chapter);
      let attrs = ' class="footnote-entry"';
      if (entry.num) attrs += ' data-fn-num="' + entry.num + '"';
      if (entry.letter) attrs += ' data-fn-letter="' + entry.letter + '"';
      return "<div" + attrs + ">" + safe + "</div>";
    })
    .join("");
}

// ------------------------------------------------------------
//  Menghubungkan tanda catatan kaki (dibangun oleh
//  renderVerseTextWithFootnotes -- baik superskrip "1a"-nya SENDIRI
//  maupun kata SETELAHNYA yang ikut biru & bisa ditekan) dalam SATU
//  blok ayat dengan panel catatan sebarisnya (notePanel, dibangun oleh
//  buildInlineNoteCardEl() di js/app.js, isinya SUDAH berupa catatan
//  LENGKAP ayat itu -- lihat buildFootnoteEntriesHtml() di atas):
//    - SEKALI TEKAN pada tanda/kata -> BUKA panel catatan (kalau masih
//      tertutup), lalu GULIR & SOROT bagian catatan yang cocok dengan
//      tanda itu di dalam catatan lengkap yang sudah tampil (TIDAK
//      membuat kotak isi dobel lagi seperti versi sebelumnya).
//    - TEKAN LAGI pada tanda YANG SAMA -> TUTUP panel catatan itu
//      sepenuhnya (bukan cuma hilangkan sorotannya) -- sesuai
//      permintaan: "tekan sekali buka, tekan sekali lagi tutup".
//    - Tekan tanda LAIN selagi panel terbuka -> panel TETAP terbuka,
//      sorotan lama hilang, langsung gulir & sorot ke entri tanda yang
//      baru (bukan menutup lalu membuka lagi dari awal).
// ------------------------------------------------------------
function setupFootnoteMarkerHandlers(textWrap, v, block, notePanel) {
  const markers = textWrap.querySelectorAll(".footnote-marker, .footnote-marker-word");
  if (!markers.length) return;
  let activeKey = null;

  const setActiveVisual = (key) => {
    markers.forEach((el) => {
      el.classList.toggle("footnote-marker-active", !!key && el.dataset.fnKey === key);
    });
  };
  const clearEntryHighlight = () => {
    notePanel.querySelectorAll(".footnote-entry-highlight").forEach((el) => {
      el.classList.remove("footnote-entry-highlight");
    });
  };
  // Menutup panel SEPENUHNYA (dipanggil saat tanda yang SAMA ditekan lagi) --
  // beda dari sekadar clearEntryHighlight() yang cuma menghapus sorotan tapi
  // membiarkan panel tetap terbuka.
  const closePanel = () => {
    clearEntryHighlight();
    setActiveVisual(null);
    activeKey = null;
    notePanel.hidden = true;
    block.classList.remove("note-open");
  };

  markers.forEach((sup) => {
    sup.addEventListener("click", (e) => {
      e.stopPropagation();
      const key = sup.dataset.fnKey;
      if (!key) return;
      // Tanda yang SAMA ditekan lagi (dan panel memang masih terbuka
      // karenanya) -> tutup panel sepenuhnya, bukan cuma lepas sorotan.
      if (activeKey === key && !notePanel.hidden) {
        closePanel();
        return;
      }
      if (notePanel.hidden) {
        notePanel.hidden = false;
        block.classList.add("note-open");
      }
      clearEntryHighlight();
      const m = key.match(/^(\d+)?\s*([A-Za-z])?$/);
      const num = m ? m[1] : null;
      const letter = m && m[2] ? m[2].toLowerCase() : null;
      const matched = [...notePanel.querySelectorAll(".footnote-entry")].filter((entryEl) => {
        const eNum = entryEl.dataset.fnNum || null;
        const eLetter = entryEl.dataset.fnLetter || null;
        return (num && eNum === num) || (letter && eLetter === letter);
      });
      matched.forEach((entryEl) => entryEl.classList.add("footnote-entry-highlight"));
      const target = matched.length ? matched[0] : notePanel;
      if (typeof target.scrollIntoView === "function") {
        target.scrollIntoView({ block: matched.length ? "center" : "nearest", behavior: "smooth" });
      }
      setActiveVisual(key);
      activeKey = key;
    });
  });

  // Kalau panel ditutup dari JALUR LAIN (mis. tekan-dua-kali nomor ayat lagi
  // lewat toggleInlineNote() di js/app.js), lepas juga status "aktif" tanda
  // catatan kaki supaya tekan tanda yang sama sesudahnya membuka lagi dari
  // awal (bukan dianggap "tekan kedua kali" yang malah langsung menutup).
  const syncWithPanelVisibility = () => {
    if (notePanel.hidden && activeKey) {
      setActiveVisual(null);
      activeKey = null;
    }
  };
  new MutationObserver(syncWithPanelVisibility).observe(notePanel, { attributes: true, attributeFilter: ["hidden"] });
}
