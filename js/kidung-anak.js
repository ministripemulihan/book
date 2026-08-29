// ============================================================
//  KIDUNG ANAK — modul TERPISAH, ditambahkan di atas app yang
//  sudah ada TANPA mengubah js/kidung.js, js/kidung-ui.js, atau
//  css/style.css. Dipasang lewat 1 tombol baru "👶 Kidung Anak"
//  di renderKidungHome() (lihat baris tambahan di js/kidung-ui.js).
//
//  ASAL: seluruh mesin render (notasi angka, kunci+lirik, kunci+
//  notasi+lirik gabungan, transpose kunci) dipindah APA ADANYA dari
//  app standalone "Kidung Anak-Anak" (index.html) yang sudah jalan
//  di kidungindo.blogspot.com/p/lagu-anak-anak.html, cuma dibungkus
//  supaya bisa nempel di dalam #kidungPanel alih-alih halaman sendiri.
//
//  SUMBER DATA: publish-to-web CSV dari Google Sheet, LANGSUNG
//  fetch() dari browser -- SAMA PERSIS pola resyncKidungSheet() di
//  js/kidung.js. TIDAK lewat Apps Script (Code.gs) sama sekali,
//  karena sifatnya baca-saja (edit lagu = edit langsung di Sheet).
//
//  STATUS (versi pertama / MVP -- lihat README.md bagian
//  "KIDUNG ANAK" untuk daftar lengkap yang BELUM dikerjakan):
//  SUDAH: cari+kategori, kartu lagu accordion, 8 tab (Syair, Kunci+
//  Lirik, Notasi Angka, Kunci+Notasi+Lirik, Video, MP3, Pengarang,
//  Gambar Referensi), transpose kunci, ukuran teks (zoom), salin ke
//  clipboard, tema terang/gelap KHUSUS AREA INI, lebar HP/Komputer,
//  tombol kembali ke menu Kidung Umum.
//  BELUM (menyusul, lihat README): lightbox gambar/video/MP3 penuh
//  (pinch-zoom, wake lock, mode putar berantai), Layar Penuh per-tab,
//  Pratinjau & Cetak PDF, cache offline (IndexedDB) untuk data ini.
// ============================================================

window.KidungAnak = (function () {

  // ---------- KONFIGURASI SUMBER DATA (Sheet Kidung Anak) ----------
  const SHEET_ID = "1tC9iSgQB34X94dBp8ZjB0PqP2mjVyWUdCGNB8DglfVg";
  const SHEET_NAME = "KidungAnakIndo";
  const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

  let SONGS = [];
  let dataLoaded = false;
  let currentCategory = "Semua";
  const keyState = {};       // id lagu -> { baseIdx, activeIdx, useFlat, isMinor }
  const zoomState = {};      // "<id>_<panel>" -> level zoom (1 = 100%)
  let deviceMode = localStorage.getItem("kaDeviceMode") || "pc";
  let themeMode = localStorage.getItem("kaTheme") || "light";
  let onBackCallback = null; // dipanggil saat tombol "Kembali" ditekan
  let rootPanelEl = null;    // elemen #kidungPanel, dipakai taruh class tema/device

  // ---------- helper kecil ----------
  function escapeHtml(s) {
    return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function slug(str) {
    return (str || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  // ---------- CSV PARSER (RFC4180-ish, sama persis dgn app aslinya) ----------
  function parseCSV(text) {
    const rows = [];
    let row = [], field = "", inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i], next = text[i + 1];
      if (inQuotes) {
        if (c === '"' && next === '"') { field += '"'; i++; }
        else if (c === '"') { inQuotes = false; }
        else { field += c; }
      } else {
        if (c === '"') { inQuotes = true; }
        else if (c === ",") { row.push(field); field = ""; }
        else if (c === "\r") { /* skip */ }
        else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
        else { field += c; }
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    if (!rows.length) return [];
    const header = rows[0];
    return rows.slice(1).filter((r) => r.some((v) => v && v.trim() !== "")).map((r) => {
      const obj = {};
      header.forEach((h, idx) => (obj[h.trim()] = (r[idx] || "").trim()));
      return obj;
    });
  }

  // ---------- TRANSPOSE KUNCI ----------
  const SHARP_KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const FLAT_KEYS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  const FLAT_TO_SHARP = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#", Cb: "B", Fb: "E", "E#": "F", "B#": "C" };
  function noteIndex(note) {
    let n = note;
    if (FLAT_TO_SHARP[n]) n = FLAT_TO_SHARP[n];
    return SHARP_KEYS.indexOf(n);
  }
  function shiftNote(note, semitones, useFlat) {
    const idx = noteIndex(note);
    if (idx === -1) return note;
    const newIdx = ((idx + semitones) % 12 + 12) % 12;
    return (useFlat ? FLAT_KEYS : SHARP_KEYS)[newIdx];
  }
  function transposeChordSymbol(chord, semitones, useFlat) {
    if (!semitones) return chord;
    return chord.split("/").map((part) => {
      const m = part.match(/^([A-Ga-g])(#|b)?(.*)$/);
      if (!m) return part;
      const root = m[1].toUpperCase() + (m[2] || "");
      return shiftNote(root, semitones, useFlat) + (m[3] || "");
    }).join("/");
  }
  function transposeLyricsWithChords(text, semitones, useFlat) {
    return text.replace(/\[([^\]]+)\]/g, (m, chord) => `[${transposeChordSymbol(chord, semitones, useFlat)}]`);
  }
  function parseKeyName(raw) {
    const fallback = { index: 0, useFlat: false, isMinor: false };
    if (!raw) return fallback;
    let s = raw.trim();
    if (!s) return fallback;
    let isMinor = false;
    const minorMatch = s.match(/^([A-Ga-g])(#|b)?m$/i);
    if (minorMatch) { isMinor = true; s = minorMatch[1] + (minorMatch[2] || ""); }
    const m = s.match(/^([A-Ga-g])(#|b)?$/);
    if (!m) return { ...fallback, isMinor };
    const useFlat = (m[2] || "").toLowerCase() === "b";
    const root = m[1].toUpperCase() + (m[2] ? (useFlat ? "b" : "#") : "");
    const idx = noteIndex(root);
    return { index: idx === -1 ? 0 : idx, useFlat, isMinor };
  }
  function keyList(useFlat) { return useFlat ? FLAT_KEYS : SHARP_KEYS; }
  function keyLabel(index, useFlat, isMinor) {
    const i = ((index % 12) + 12) % 12;
    return keyList(useFlat)[i] + (isMinor ? "m" : "");
  }

  // ---------- YOUTUBE ----------
  function extractYoutubeId(input) {
    if (!input) return "";
    input = input.trim();
    if (/^[a-zA-Z0-9_-]{6,15}$/.test(input) && input.indexOf("http") === -1) return input;
    const m = input.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{6,15})/);
    return m ? m[1] : input;
  }

  // ---------- LABEL BAGIAN LAGU (VERSE/REFF/dst) ----------
  const SECTION_LABELS = ["VERSE", "REFF", "REFRAIN", "CHORUS", "BRIDGE", "INTRO", "CODA", "INTERLUDE", "VERSE 1", "VERSE 2", "VERSE 3", "REFF 1", "REFF 2"];
  const DIRECTIVE_RE = /^(D\.?\s?C\.?|DA\s+CAPO)(\s+AL\s+FINE)?$|^(D\.?\s?S\.?|DAL\s+SEGNO)(\s+AL\s+FINE)?$|^FINE$/i;
  function isSectionLabel(line) {
    const t = line.trim().toUpperCase();
    return SECTION_LABELS.includes(t) || DIRECTIVE_RE.test(t);
  }

  // ---------- NOTASI ANGKA ----------
  const NOTE_TOKEN_RE = /^(x)?(?:([0-7])\*)?([0-7])(#|b|n)?('{1,2}|,{1,2})?(_|=)?(\.)?(\^)?$/;
  function parseNoteToken(tok) {
    const m = tok.match(NOTE_TOKEN_RE);
    if (!m) return null;
    const mark = m[5] || "";
    return {
      strike: !!m[1], grace: m[2] || "", digit: m[3], accidental: m[4] || "",
      dotsUp: mark.indexOf("'") !== -1 ? mark.length : 0,
      dotsDown: mark.indexOf(",") !== -1 ? mark.length : 0,
      underline: m[6] === "_" ? 1 : m[6] === "=" ? 2 : 0,
      afterDot: !!m[7], fermata: !!m[8],
    };
  }
  function digitClass(p) {
    const cls = ["ka-digit"];
    if (p.digit === "0") cls.push("ka-rest");
    if (p.underline === 1) cls.push("ka-underline1");
    if (p.underline === 2) cls.push("ka-underline2");
    if (p.strike) cls.push("ka-strike");
    return cls.join(" ");
  }
  function renderNoteDigitHtml(p) {
    let html = `<span class="${digitClass(p)}">`;
    if (p.grace) html += `<span class="ka-grace">${escapeHtml(p.grace)}</span>`;
    html += escapeHtml(p.digit);
    if (p.accidental) html += `<span class="ka-accidental">${p.accidental === "b" ? "♭" : p.accidental === "n" ? "♮" : "♯"}</span>`;
    if (p.afterDot) html += '<span class="ka-after-dot"></span>';
    if (p.fermata) html += '<span class="ka-fermata">⌒</span>';
    html += "</span>";
    return html;
  }
  const KEY_DECL_RE = /^(\d{1,2})\s*\/\s*(\d{1,2})\s+do\s*=\s*([A-Ga-g](?:#|b)?m?)\s*$/i;
  function parseKeyDecl(line) {
    const m = line.trim().match(KEY_DECL_RE);
    if (!m) return null;
    return { numerator: parseInt(m[1], 10) || 4, denominator: m[2], keyRaw: m[3] };
  }
  function buildNotTokHtml(digitHtml, dotsUp, dotsDown, beatLabel) {
    const up = dotsUp > 0 ? `<div class="ka-dots-up">${'<span class="ka-dot"></span>'.repeat(dotsUp)}</div>` : '<div class="ka-dots-up"></div>';
    const down = dotsDown > 0 ? `<div class="ka-dots-down">${'<span class="ka-dot"></span>'.repeat(dotsDown)}</div>` : '<div class="ka-dots-down"></div>';
    return `<div class="ka-not-tok">${up}<div class="ka-digit-slot">${digitHtml}</div>${down}<div class="ka-beat">${beatLabel || ""}</div></div>`;
  }
  function renderNotasiAngka(text, birama, semitones, useFlat) {
    if (!text || !text.trim()) return '<p class="ka-empty-note">Notasi angka belum tersedia untuk lagu ini.</p>';
    semitones = semitones || 0;
    let numerator = parseInt((birama || "4/4").split("/")[0], 10) || 4;
    let html = "";
    text.split("\n").forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) return;
      const decl = parseKeyDecl(line);
      if (decl) {
        numerator = decl.numerator;
        const pk = parseKeyName(decl.keyRaw);
        const label = keyLabel(pk.index + semitones, pk.useFlat, pk.isMinor);
        html += `<div class="ka-notasi-line ka-section"><span class="ka-key-decl">${escapeHtml(decl.numerator + "/" + decl.denominator)} Do = ${escapeHtml(label)}</span></div>`;
        return;
      }
      if (isSectionLabel(line)) {
        html += `<div class="ka-notasi-line ka-section"><span class="ka-section-label">${escapeHtml(line.toUpperCase())}</span></div>`;
        return;
      }
      const tokens = line.split(/\s+/).filter(Boolean);
      let beat = 0;
      let rowHtml = '<div class="ka-notasi-line">';
      tokens.forEach((tok) => {
        if (tok === "||") { rowHtml += '<div class="ka-bar ka-double"></div>'; beat = 0; return; }
        if (tok === "|:" || tok === "||:") { rowHtml += '<div class="ka-bar ka-repeat-start"></div>'; beat = 0; return; }
        if (tok === ":|" || tok === ":||") { rowHtml += '<div class="ka-bar ka-repeat-end"></div>'; beat = 0; return; }
        if (tok === "|") { rowHtml += '<div class="ka-bar"></div>'; beat = 0; return; }
        if (tok === "-") { beat = (beat % numerator) + 1; rowHtml += buildNotTokHtml('<span class="ka-hold">–</span>', 0, 0, beat); return; }
        if (tok === ".") { beat = (beat % numerator) + 1; rowHtml += buildNotTokHtml('<span class="ka-main-dot"></span>', 0, 0, beat); return; }
        const p = parseNoteToken(tok);
        if (!p) { rowHtml += buildNotTokHtml(`<span class="ka-digit">${escapeHtml(tok)}</span>`, 0, 0, ""); return; }
        beat = (beat % numerator) + 1;
        rowHtml += buildNotTokHtml(renderNoteDigitHtml(p), p.dotsUp, p.dotsDown, beat);
      });
      rowHtml += "</div>";
      html += rowHtml;
    });
    return html;
  }

  // ---------- KUNCI + LIRIK (kunci di atas kata) ----------
  function renderLyricsWithChords(text) {
    if (!text || !text.trim()) return '<p class="ka-empty-note">Kunci/kord belum tersedia untuk lagu ini.</p>';
    let html = '<div class="ka-chordsheet">';
    text.split("\n").forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) { html += '<div style="height:8px"></div>'; return; }
      if (isSectionLabel(line)) { html += `<span class="ka-section-label">${escapeHtml(line.toUpperCase())}</span>`; return; }
      let row = '<div class="ka-chordline">';
      line.split(/\s+/).filter(Boolean).forEach((tok) => {
        const m = tok.match(/^\[([^\]]+)\](.*)$/);
        const chord = m ? m[1] : "";
        const word = m ? m[2] : tok;
        row += `<div class="ka-word-unit"><span class="ka-chord-row">${chord ? escapeHtml(chord) : ""}</span><span class="ka-lyric-row">${escapeHtml(word)}</span></div>`;
      });
      row += "</div>";
      html += row;
    });
    html += "</div>";
    return html;
  }

  // ---------- KUNCI + NOTASI + LIRIK GABUNGAN ----------
  function parseComboToken(tok) {
    if (tok === "-" || tok === ".") return { chord: "", note: tok, word: "" };
    const m = tok.match(/^\[([^|\]]*)(?:\|([^\]]*))?\](.*)$/);
    if (m) return { chord: m[1] || "", note: m[2] || "", word: m[3] || "" };
    return { chord: "", note: "", word: tok };
  }
  function renderComboNote(note) {
    const up = (n) => (n > 0 ? `<div class="ka-dots-up">${'<span class="ka-dot"></span>'.repeat(n)}</div>` : '<div class="ka-dots-up"></div>');
    const down = (n) => (n > 0 ? `<div class="ka-dots-down">${'<span class="ka-dot"></span>'.repeat(n)}</div>` : '<div class="ka-dots-down"></div>');
    if (!note) return `${up(0)}<div class="ka-digit-slot"></div>${down(0)}`;
    if (note === "-") return `${up(0)}<div class="ka-digit-slot"><span class="ka-hold">–</span></div>${down(0)}`;
    if (note === ".") return `${up(0)}<div class="ka-digit-slot"><span class="ka-main-dot"></span></div>${down(0)}`;
    const p = parseNoteToken(note);
    if (!p) return `${up(0)}<div class="ka-digit-slot"><span class="ka-digit">${escapeHtml(note)}</span></div>${down(0)}`;
    return `${up(p.dotsUp)}<div class="ka-digit-slot">${renderNoteDigitHtml(p)}</div>${down(p.dotsDown)}`;
  }
  function renderComboSheet(text, semitones, useFlat) {
    if (!text || !text.trim()) return '<p class="ka-empty-note">Kunci + notasi + lirik belum tersedia untuk lagu ini.</p>';
    let html = '<div class="ka-combosheet">';
    text.split("\n").forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) { html += '<div style="height:8px"></div>'; return; }
      const decl = parseKeyDecl(line);
      if (decl) {
        const pk = parseKeyName(decl.keyRaw);
        const label = keyLabel(pk.index + semitones, pk.useFlat, pk.isMinor);
        html += `<span class="ka-key-decl">${escapeHtml(decl.numerator + "/" + decl.denominator)} Do = ${escapeHtml(label)}</span>`;
        return;
      }
      if (isSectionLabel(line)) { html += `<span class="ka-section-label">${escapeHtml(line.toUpperCase())}</span>`; return; }
      let row = '<div class="ka-combo-line">';
      line.split(/\s+/).filter(Boolean).forEach((tok) => {
        if (tok === "||") { row += '<div class="ka-combo-bar ka-double"></div>'; return; }
        if (tok === "|:" || tok === "||:") { row += '<div class="ka-combo-bar ka-repeat-start"></div>'; return; }
        if (tok === ":|" || tok === ":||") { row += '<div class="ka-combo-bar ka-repeat-end"></div>'; return; }
        if (tok === "|") { row += '<div class="ka-combo-bar"></div>'; return; }
        const { chord, note, word } = parseComboToken(tok);
        const chordOut = chord ? transposeChordSymbol(chord, semitones, useFlat) : "";
        const lyricLines = word.split("/").map((w) => `<span class="ka-lyric-row">${escapeHtml(w)}</span>`).join("");
        row += `<div class="ka-combo-tok"><span class="ka-chord-row">${escapeHtml(chordOut)}</span><span class="ka-note-row">${renderComboNote(note)}</span>${lyricLines}</div>`;
      });
      row += "</div>";
      html += row;
    });
    html += "</div>";
    return html;
  }
  function buildComboCopyText(song, semitones, useFlat) {
    const out = [];
    (song.KunciNotasiLirik || "").split("\n").forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) { out.push(""); return; }
      if (isSectionLabel(line)) { out.push(line.toUpperCase()); return; }
      const tokens = line.split(/\s+/).filter(Boolean);
      const chordCells = [], noteCells = [], wordCells = [];
      tokens.forEach((tok) => {
        if (["|", "||", "|:", ":|", "||:", ":||"].includes(tok)) { chordCells.push(tok); noteCells.push(tok); wordCells.push(tok); return; }
        const { chord, note, word } = parseComboToken(tok);
        const chordTxt = chord ? transposeChordSymbol(chord, semitones, useFlat) : "";
        const width = Math.max(chordTxt.length, note.length, word.length, 1) + 1;
        chordCells.push(chordTxt.padEnd(width)); noteCells.push(note.padEnd(width)); wordCells.push(word.padEnd(width));
      });
      out.push(chordCells.join("").trimEnd()); out.push(noteCells.join("").trimEnd()); out.push(wordCells.join("").trimEnd());
    });
    return out.join("\n");
  }

  function buildComboLyricsOnly(song) {
    return (song.KunciNotasiLirik || "").split("\n").map((rawLine) => {
      const line = rawLine.trim();
      if (!line) return "";
      if (isSectionLabel(line)) return line.toUpperCase();
      return line.split(/\s+/).filter(Boolean)
        .filter((t) => !["|", "||", "|:", ":|", "||:", ":||"].includes(t))
        .map((t) => parseComboToken(t).word)
        .filter(Boolean)
        .join(" ");
    }).join("\n");
  }
  function buildComboRawCode(song) {
    return (song.KunciNotasiLirik || "").trim();
  }
  function buildComboNotasiOnly(song) {
    return (song.KunciNotasiLirik || "").split("\n").map((rawLine) => {
      const line = rawLine.trim();
      if (!line) return "";
      if (parseKeyDecl(line)) return line;
      if (isSectionLabel(line)) return line.toUpperCase();
      const out = [];
      line.split(/\s+/).filter(Boolean).forEach((tok) => {
        if (["|", "||", "|:", ":|", "||:", ":||"].includes(tok)) { out.push(tok); return; }
        const { note } = parseComboToken(tok);
        if (note) out.push(note);
      });
      return out.join(" ");
    }).join("\n");
  }

  function renderPlainLyrics(text) {
    if (!text || !text.trim()) return '<p class="ka-empty-note">Syair belum tersedia untuk lagu ini.</p>';
    return text.split("\n").map((line) => (isSectionLabel(line) ? `<span class="ka-section-label">${escapeHtml(line.trim().toUpperCase())}</span>` : escapeHtml(line))).join("\n");
  }

  // ---------- GAMBAR REFERENSI (Google Drive share-link -> link gambar langsung) ----------
  function driveImageUrl(url) {
    if (!url) return url;
    const m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
    if (m && m[1]) return `https://lh3.googleusercontent.com/d/${m[1]}=s1600`;
    return url;
  }
  function parseImageList(raw) {
    if (!raw) return [];
    return raw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean).map(driveImageUrl);
  }

  // ---------- MP3 (link langsung ATAU Google Drive) ----------
  function driveFileId(url) {
    if (!url) return null;
    const m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
    return m && m[1] ? m[1] : null;
  }
  function isDriveMp3(url) { return !!driveFileId(url); }
  function driveAudioPreviewUrl(url) {
    const id = driveFileId(url);
    return id ? `https://drive.google.com/file/d/${id}/preview` : null;
  }

  // ---------- MUAT DATA ----------
  async function loadData(statusEl) {
    if (statusEl) { statusEl.textContent = "Memuat data dari Google Sheet..."; statusEl.className = "ka-status-line"; }
    try {
      const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      const data = parseCSV(text);
      if (!data.length) throw new Error("Sheet kosong atau kolom tidak sesuai");
      SONGS = data;
      dataLoaded = true;
      if (statusEl) { statusEl.textContent = `Berhasil memuat ${data.length} lagu dari Google Sheet.`; statusEl.className = "ka-status-line ka-ok"; }
    } catch (err) {
      console.error("[KidungAnak] gagal memuat sheet:", err);
      if (statusEl) { statusEl.textContent = 'Gagal memuat data. Periksa koneksi, lalu tekan "↻ Muat ulang data".'; statusEl.className = "ka-status-line ka-err"; }
    }
  }

  // ---------- ZOOM (ukuran teks per panel per lagu) ----------
  const ZOOM_MIN = 0.5, ZOOM_MAX = 3.0;
  function zoomKey(id, panel) { return id + "_" + panel; }
  function getZoom(id, panel) { return zoomState[zoomKey(id, panel)] || 1; }
  function nextZoomValue(z, dir) {
    const step = Math.max(0.05, +(z * 0.12).toFixed(2));
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(z + dir * step).toFixed(2)));
  }
  const ZOOM_TARGET_SELECTOR = { syair: '[data-ka-role="syair-content"]', kunci: '[data-ka-role="kunci-content"]', notasi: '[data-ka-role="notasi-content"]', combo: '[data-ka-role="combo-content"]' };
  function applyZoom(cardEl, id, panel) {
    const z = getZoom(id, panel);
    const target = cardEl.querySelector(ZOOM_TARGET_SELECTOR[panel]);
    if (target) target.style.zoom = z;
    const pctEl = cardEl.querySelector(`.ka-zoom-row[data-ka-zoom-panel="${panel}"] .ka-zoom-pct`);
    if (pctEl) pctEl.textContent = Math.round(z * 100) + "%";
  }

  function copyToClipboard(text, btnEl) {
    navigator.clipboard.writeText(text).then(() => {
      if (!btnEl) return;
      const original = btnEl.textContent;
      btnEl.textContent = "Tersalin!";
      btnEl.classList.add("ka-copied");
      setTimeout(() => { btnEl.textContent = original; btnEl.classList.remove("ka-copied"); }, 1600);
    }).catch(() => alert("Gagal menyalin otomatis. Salin manual:\n\n" + text));
  }

  function buildNotasiFrontendText(song, st) {
    const keyName = keyLabel(st.activeIdx, st.useFlat, st.isMinor);
    const text = song.NotAngka || "";
    let numerator = parseInt((song.Birama || "4/4").split("/")[0], 10) || 4;
    const out = [`${song.Judul} (Do = ${keyName}, Birama ${song.Birama || "4/4"})`, ""];
    let beat = 0;
    text.split("\n").forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) { out.push(""); return; }
      const decl = parseKeyDecl(line);
      if (decl) {
        numerator = decl.numerator;
        const pk = parseKeyName(decl.keyRaw);
        const semis = st.activeIdx - st.baseIdx;
        const label = keyLabel(pk.index + semis, pk.useFlat, pk.isMinor);
        out.push(`${decl.numerator}/${decl.denominator} Do = ${label}`);
        beat = 0;
        return;
      }
      if (isSectionLabel(line)) { out.push(line.toUpperCase()); beat = 0; return; }
      const tokens = line.split(/\s+/).filter(Boolean);
      const noteCells = [], beatCells = [];
      tokens.forEach((tok) => {
        if (tok === "|" || tok === "||") { noteCells.push(tok); beatCells.push(" ".repeat(tok.length)); beat = 0; return; }
        beat = (beat % numerator) + 1;
        const width = Math.max(tok.length, String(beat).length) + 1;
        noteCells.push(tok.padEnd(width)); beatCells.push(String(beat).padEnd(width));
      });
      out.push(noteCells.join("").trimEnd());
      out.push(beatCells.join("").trimEnd());
    });
    return out.join("\n");
  }
  function buildChordText(song, st) {
    const semis = st.activeIdx - st.baseIdx;
    const transposed = transposeLyricsWithChords(song.SyairKunci || "", semis, st.useFlat);
    const keyName = keyLabel(st.activeIdx, st.useFlat, st.isMinor);
    return `${song.Judul} (Kunci: ${keyName}, Birama ${song.Birama || "4/4"})\n\n${transposed.trim()}`;
  }

  // ---------- KARTU LAGU (accordion, 8 tab -- sama seperti index.html asli) ----------
  function buildSongCard(song) {
    const id = slug(song.Judul) + "-" + (song.No || Math.random().toString(36).slice(2, 6));
    const parsedKey = parseKeyName(song.KunciDasar || "C");
    if (!keyState[id]) keyState[id] = { baseIdx: parsedKey.index, activeIdx: parsedKey.index, useFlat: parsedKey.useFlat, isMinor: parsedKey.isMinor };

    const card = document.createElement("div");
    card.className = "ka-song";
    card.dataset.id = id;
    card.dataset.songNo = String(song.No || "");

    const ytId = extractYoutubeId(song.YoutubeID);
    const hasVideo = !!ytId;
    const hasMp3 = !!(song.MP3URL || "").trim();
    const hasChords = !!(song.SyairKunci || "").trim();
    const hasNotasi = !!(song.NotAngka || "").trim();
    const hasCombo = !!(song.KunciNotasiLirik || "").trim();
    const hasPengarang = !!(song.Pengarang || "").trim();
    const gambarList = parseImageList(song.GambarReferensi);
    const hasGambar = gambarList.length > 0;

    card.innerHTML = `
      <div class="ka-song-head">
        <span class="ka-song-num">${escapeHtml(song.No || "")}</span>
        <div class="ka-song-title-wrap">
          <h3>${escapeHtml(song.Judul || "Tanpa Judul")}</h3>
          <div class="ka-song-meta">
            ${song.Kategori ? `<span class="ka-badge">${escapeHtml(song.Kategori)}</span>` : ""}
            <span class="ka-badge ka-key" data-ka-role="key-badge">Do = ${keyLabel(keyState[id].activeIdx, keyState[id].useFlat, keyState[id].isMinor)}</span>
            ${song.Birama ? `<span class="ka-badge">${escapeHtml(song.Birama)}</span>` : ""}
          </div>
        </div>
        <span class="ka-chevron">⌄</span>
      </div>
      <div class="ka-song-body">
        <div class="ka-panel" data-ka-panel="syair">
          <div class="ka-zoom-row" data-ka-zoom-panel="syair">
            <span class="ka-label">Ukuran teks:</span>
            <button class="ka-zoom-btn" data-ka-zoom-action="dec">A−</button>
            <span class="ka-zoom-pct">100%</span>
            <button class="ka-zoom-btn" data-ka-zoom-action="inc">A+</button>
          </div>
          <p class="ka-lyrics" data-ka-role="syair-content">${renderPlainLyrics(song.Syair)}</p>
          <div class="ka-action-row">
            <button class="ka-action-btn ka-ghost" data-ka-action="copy-syair">📋 Salin Syair</button>
            <button class="ka-action-btn ka-ghost" data-ka-action="fs-syair">⛶ Layar Penuh</button>
          </div>
        </div>

        <div class="ka-panel" data-ka-panel="kunci">
          <div class="ka-key-row" data-ka-role="key-row-kunci">
            <span class="ka-label">Ganti Kunci:</span>
            ${keyList(keyState[id].useFlat).map((k, i) => `<button class="ka-key-btn" data-ka-key-idx="${i}">${k}</button>`).join("")}
          </div>
          <div class="ka-zoom-row" data-ka-zoom-panel="kunci">
            <span class="ka-label">Ukuran teks:</span>
            <button class="ka-zoom-btn" data-ka-zoom-action="dec">A−</button>
            <span class="ka-zoom-pct">100%</span>
            <button class="ka-zoom-btn" data-ka-zoom-action="inc">A+</button>
          </div>
          <p class="ka-lyrics" data-ka-role="kunci-content"></p>
          <div class="ka-action-row">
            <button class="ka-action-btn" data-ka-action="copy-kunci">📋 Salin Syair + Kunci</button>
            <button class="ka-action-btn ka-ghost" data-ka-action="fs-kunci">⛶ Layar Penuh</button>
          </div>
        </div>

        <div class="ka-panel" data-ka-panel="notasi">
          <div class="ka-key-row" data-ka-role="key-row-notasi">
            <span class="ka-label">Do =</span>
            ${keyList(keyState[id].useFlat).map((k, i) => `<button class="ka-key-btn" data-ka-key-idx="${i}">${k}</button>`).join("")}
          </div>
          <div class="ka-zoom-row" data-ka-zoom-panel="notasi">
            <span class="ka-label">Ukuran teks:</span>
            <button class="ka-zoom-btn" data-ka-zoom-action="dec">A−</button>
            <span class="ka-zoom-pct">100%</span>
            <button class="ka-zoom-btn" data-ka-zoom-action="inc">A+</button>
          </div>
          <div class="ka-notasi-wrap" data-ka-role="notasi-content"></div>
          <div class="ka-action-row">
            <button class="ka-action-btn" data-ka-action="copy-notasi">📋 Salin Notasi Angka</button>
            <button class="ka-action-btn ka-ghost" data-ka-action="fs-notasi">⛶ Layar Penuh</button>
          </div>
        </div>

        <div class="ka-panel" data-ka-panel="combo">
          <div class="ka-key-row" data-ka-role="key-row-combo">
            <span class="ka-label">Ganti Kunci:</span>
            ${keyList(keyState[id].useFlat).map((k, i) => `<button class="ka-key-btn" data-ka-key-idx="${i}">${k}</button>`).join("")}
          </div>
          <div class="ka-zoom-row" data-ka-zoom-panel="combo">
            <span class="ka-label">Ukuran teks:</span>
            <button class="ka-zoom-btn" data-ka-zoom-action="dec">A−</button>
            <span class="ka-zoom-pct">100%</span>
            <button class="ka-zoom-btn" data-ka-zoom-action="inc">A+</button>
          </div>
          <div class="ka-notasi-wrap" data-ka-role="combo-content"></div>
          <div class="ka-action-row">
            <button class="ka-action-btn" data-ka-action="copy-combo-all">📋 Salin Semua</button>
            <button class="ka-action-btn ka-ghost" data-ka-action="copy-combo-lirik">📋 Salin Lirik Saja</button>
            <button class="ka-action-btn ka-ghost" data-ka-action="copy-combo-raw">📋 Salin Kode Asli</button>
            <button class="ka-action-btn ka-ghost" data-ka-action="copy-combo-notasi">📋 Salin untuk Notasi Angka</button>
            <button class="ka-action-btn ka-ghost" data-ka-action="fs-combo">⛶ Layar Penuh</button>
          </div>
        </div>

        <div class="ka-panel" data-ka-panel="video">
          ${hasVideo ? `<div class="ka-media-frame"><iframe width="100%" height="280" src="https://www.youtube.com/embed/${escapeHtml(ytId)}" frameborder="0" allowfullscreen></iframe></div>` : '<p class="ka-empty-note">Video belum tersedia.</p>'}
        </div>

        <div class="ka-panel" data-ka-panel="mp3">
          ${hasMp3
            ? (isDriveMp3(song.MP3URL)
                ? `<iframe src="${escapeHtml(driveAudioPreviewUrl(song.MP3URL))}" width="100%" height="90" style="border:0;border-radius:10px;" allow="autoplay" title="Pemutar MP3"></iframe>`
                : `<audio controls style="width:100%"><source src="${escapeHtml(song.MP3URL)}" type="audio/mpeg">Browser tidak mendukung audio.</audio>`)
            : '<p class="ka-empty-note">MP3 belum tersedia.</p>'}
        </div>

        <div class="ka-panel" data-ka-panel="pengarang">
          ${hasPengarang ? `<div class="ka-pengarang-card">${song.FotoPengarang ? `<img src="${escapeHtml(song.FotoPengarang)}" alt="">` : ""}<strong>${escapeHtml(song.Pengarang)}</strong></div>` : '<p class="ka-empty-note">Informasi pengarang belum tersedia.</p>'}
        </div>

        <div class="ka-panel" data-ka-panel="gambar">
          ${hasGambar ? `<div class="ka-gambar-grid">${gambarList.map((url) => `<a class="ka-gambar-thumb" href="${escapeHtml(url)}" target="_blank" rel="noopener"><img src="${escapeHtml(url)}" alt="" loading="lazy"></a>`).join("")}</div><p class="ka-empty-note" style="margin-top:8px;">Ketuk gambar untuk membuka ukuran penuh di tab baru.</p>` : '<p class="ka-empty-note">Gambar referensi belum tersedia.</p>'}
        </div>

        <div class="ka-bottombar">
          <button class="ka-iconbtn ka-tabbtn ka-active" data-ka-tab="syair" title="Syair">📜</button>
          <button class="ka-iconbtn ka-tabbtn" data-ka-tab="kunci" title="Kunci + Lirik" ${hasChords ? "" : "disabled"}>🎸</button>
          <button class="ka-iconbtn ka-tabbtn" data-ka-tab="notasi" title="Notasi Angka" ${hasNotasi ? "" : "disabled"}>🎼</button>
          <button class="ka-iconbtn ka-tabbtn" data-ka-tab="combo" title="Kunci + Notasi + Lirik" ${hasCombo ? "" : "disabled"}>🎹</button>
          <button class="ka-iconbtn ka-tabbtn" data-ka-tab="video" title="Video" ${hasVideo ? "" : "disabled"}>🎥</button>
          <button class="ka-iconbtn ka-tabbtn" data-ka-tab="mp3" title="MP3" ${hasMp3 ? "" : "disabled"}>🎶</button>
          <button class="ka-iconbtn ka-tabbtn" data-ka-tab="pengarang" title="Pengarang" ${hasPengarang ? "" : "disabled"}>👤</button>
          <button class="ka-iconbtn ka-tabbtn" data-ka-tab="gambar" title="Gambar Referensi" ${hasGambar ? "" : "disabled"}>🖼️</button>
        </div>
        <div class="ka-nav-row">
          <button class="ka-iconbtn ka-nav-btn" data-ka-nav="prev" title="Kidung sebelumnya (atau geser ke kanan)">◀</button>
          <span class="ka-nav-label">No. ${escapeHtml(song.No || "")}</span>
          <button class="ka-iconbtn ka-nav-btn" data-ka-nav="next" title="Kidung selanjutnya (atau geser ke kiri)">▶</button>
        </div>
      </div>
    `;

    // expand/collapse
    card.querySelector(".ka-song-head").addEventListener("click", () => {
      const wasOpen = card.classList.contains("ka-open");
      card.classList.toggle("ka-open");
      if (!wasOpen && !card.dataset.tabInit) { activateTab(card, "syair"); card.dataset.tabInit = "1"; }
    });
    // tabs
    card.querySelectorAll(".ka-tabbtn").forEach((btn) => {
      btn.addEventListener("click", (e) => { e.stopPropagation(); if (!btn.disabled) activateTab(card, btn.dataset.kaTab); });
    });
    // transpose kunci (3 baris kunci saling sinkron)
    card.querySelectorAll(".ka-key-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => { e.stopPropagation(); keyState[id].activeIdx = parseInt(btn.dataset.kaKeyIdx, 10); updateKeyUI(card, id, song); });
    });
    // zoom
    card.querySelectorAll(".ka-zoom-row").forEach((row) => {
      const panelName = row.dataset.kaZoomPanel;
      row.querySelectorAll(".ka-zoom-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const key = zoomKey(id, panelName);
          zoomState[key] = nextZoomValue(zoomState[key] || 1, btn.dataset.kaZoomAction === "inc" ? 1 : -1);
          applyZoom(card, id, panelName);
        });
      });
    });
    ["syair", "kunci", "notasi", "combo"].forEach((p) => applyZoom(card, id, p));
    // copy
    card.querySelector('[data-ka-action="copy-syair"]')?.addEventListener("click", (e) => { e.stopPropagation(); copyToClipboard(`${song.Judul}\n\n${(song.Syair || "").trim()}`, e.target); });
    card.querySelector('[data-ka-action="copy-kunci"]')?.addEventListener("click", (e) => { e.stopPropagation(); copyToClipboard(buildChordText(song, keyState[id]), e.target); });
    card.querySelector('[data-ka-action="copy-combo-all"]')?.addEventListener("click", (e) => {
      e.stopPropagation();
      const st = keyState[id]; const semis = st.activeIdx - st.baseIdx;
      copyToClipboard(`${song.Judul} (Kunci: ${keyLabel(st.activeIdx, st.useFlat, st.isMinor)})\n\n` + buildComboCopyText(song, semis, st.useFlat), e.target);
    });
    card.querySelector('[data-ka-action="copy-notasi"]')?.addEventListener("click", (e) => { e.stopPropagation(); copyToClipboard(buildNotasiFrontendText(song, keyState[id]), e.target); });
    card.querySelector('[data-ka-action="copy-combo-lirik"]')?.addEventListener("click", (e) => { e.stopPropagation(); copyToClipboard(buildComboLyricsOnly(song), e.target); });
    card.querySelector('[data-ka-action="copy-combo-raw"]')?.addEventListener("click", (e) => { e.stopPropagation(); copyToClipboard(buildComboRawCode(song), e.target); });
    card.querySelector('[data-ka-action="copy-combo-notasi"]')?.addEventListener("click", (e) => { e.stopPropagation(); copyToClipboard(buildComboNotasiOnly(song), e.target); });
    // layar penuh (baca besar) -- untuk 4 tab berbasis teks
    card.querySelector('[data-ka-action="fs-syair"]')?.addEventListener("click", (e) => { e.stopPropagation(); openFullscreen(song, id, "syair"); });
    card.querySelector('[data-ka-action="fs-kunci"]')?.addEventListener("click", (e) => { e.stopPropagation(); openFullscreen(song, id, "kunci"); });
    card.querySelector('[data-ka-action="fs-notasi"]')?.addEventListener("click", (e) => { e.stopPropagation(); openFullscreen(song, id, "notasi"); });
    card.querySelector('[data-ka-action="fs-combo"]')?.addEventListener("click", (e) => { e.stopPropagation(); openFullscreen(song, id, "combo"); });

    card.querySelector('[data-ka-nav="prev"]')?.addEventListener("click", (e) => { e.stopPropagation(); stepSong(song, -1); });
    card.querySelector('[data-ka-nav="next"]')?.addEventListener("click", (e) => { e.stopPropagation(); stepSong(song, 1); });
    // geser kiri = lanjut, geser kanan = kembali (khusus versi HP/sentuh)
    attachSwipeNav(card.querySelector(".ka-song-body"), () => stepSong(song, 1), () => stepSong(song, -1));

    updateKeyUI(card, id, song);
    return card;
  }
  function activateTab(card, tabName) {
    card.querySelectorAll(".ka-tabbtn").forEach((b) => b.classList.toggle("ka-active", b.dataset.kaTab === tabName));
    card.querySelectorAll(".ka-panel").forEach((p) => p.classList.toggle("ka-active", p.dataset.kaPanel === tabName));
  }
  function updateKeyUI(card, id, song) {
    const st = keyState[id];
    const semis = st.activeIdx - st.baseIdx;
    const label = keyLabel(st.activeIdx, st.useFlat, st.isMinor);
    card.querySelectorAll('[data-ka-role^="key-row"] .ka-key-btn').forEach((b) => b.classList.toggle("ka-active", parseInt(b.dataset.kaKeyIdx, 10) === st.activeIdx));
    const keyBadge = card.querySelector('[data-ka-role="key-badge"]');
    if (keyBadge) keyBadge.textContent = "Do = " + label;
    const kunciContent = card.querySelector('[data-ka-role="kunci-content"]');
    if (kunciContent) kunciContent.innerHTML = renderLyricsWithChords(transposeLyricsWithChords(song.SyairKunci || "", semis, st.useFlat));
    const notasiContent = card.querySelector('[data-ka-role="notasi-content"]');
    if (notasiContent) notasiContent.innerHTML = `<div class="ka-do-label">Do = <b>${label}</b> · Birama ${escapeHtml(song.Birama || "4/4")}</div>` + renderNotasiAngka(song.NotAngka, song.Birama, semis, st.useFlat);
    const comboContent = card.querySelector('[data-ka-role="combo-content"]');
    if (comboContent) comboContent.innerHTML = `<div class="ka-do-label">Do = <b>${label}</b> · Birama ${escapeHtml(song.Birama || "4/4")}</div>` + renderComboSheet(song.KunciNotasiLirik || "", semis, st.useFlat);
  }

  // ---------- LIST + FILTER ----------
  let renderGen = 0;
  function renderList(container, searchInput, categoryChipsEl) {
    const myGen = ++renderGen;
    const q = (searchInput.value || "").toLowerCase();
    const filtered = SONGS.filter((s) => {
      const matchCat = currentCategory === "Semua" || s.Kategori === currentCategory;
      const matchQ = !q || (s.Judul || "").toLowerCase().includes(q);
      return matchCat && matchQ;
    });
    if (myGen !== renderGen) return;
    container.innerHTML = "";
    if (!filtered.length) { container.innerHTML = '<p class="ka-empty-note" style="padding:24px 0;text-align:center;">Tidak ada lagu yang cocok.</p>'; return; }
    filtered.forEach((song) => container.appendChild(buildSongCard(song)));
  }
  function buildCategoryChips(wrap, onChange) {
    const cats = ["Semua", ...new Set(SONGS.map((s) => s.Kategori).filter(Boolean))];
    wrap.innerHTML = "";
    cats.forEach((cat) => {
      const chip = document.createElement("button");
      chip.className = "ka-chip" + (cat === currentCategory ? " ka-active" : "");
      chip.textContent = cat;
      chip.addEventListener("click", () => { currentCategory = cat; buildCategoryChips(wrap, onChange); onChange(); });
      wrap.appendChild(chip);
    });
  }

  // ---------- TEMA & LEBAR TAMPILAN (khusus area Kidung Anak) ----------
  function applyDeviceMode() {
    if (!rootPanelEl) return;
    rootPanelEl.classList.toggle("ka-device-hp", deviceMode === "hp");
    rootPanelEl.classList.toggle("ka-device-pc", deviceMode !== "hp");
  }
  function applyThemeMode() {
    if (!rootPanelEl) return;
    rootPanelEl.classList.toggle("ka-theme-dark", themeMode === "dark");
  }

  // ---------- LAYAR PENUH (baca besar) ----------
  // Overlay 1 buah dipakai ulang untuk semua tab (syair/kunci/notasi/combo),
  // dibuat sekali & ditempel ke <body> (bukan di dalam #kidungPanel) supaya
  // benar-benar menutupi seluruh layar. z-index sengaja 10000, di atas semua
  // z-index yang sudah dipakai app besar (dicek: tertinggi 9999 di style.css).
  const MODE_TITLE_FS = { syair: "📜 Syair", kunci: "🎸 Kunci + Lirik", notasi: "🎼 Notasi Angka", combo: "🎹 Kunci + Notasi + Lirik" };
  let fsOverlayEl = null;
  function ensureFsOverlay() {
    if (fsOverlayEl) return fsOverlayEl;
    fsOverlayEl = document.createElement("div");
    fsOverlayEl.id = "kaFsOverlay";
    fsOverlayEl.className = "ka-root ka-fs-overlay";
    fsOverlayEl.innerHTML = `
      <div class="ka-fs-top">
        <h3 class="ka-fs-title" id="kaFsTitle"></h3>
        <button type="button" class="ka-fs-close" id="kaFsCloseBtn">✕</button>
      </div>
      <div class="ka-fs-toolbar" id="kaFsToolbar"></div>
      <div class="ka-fs-body" id="kaFsBody"></div>
    `;
    document.body.appendChild(fsOverlayEl);
    fsOverlayEl.querySelector("#kaFsCloseBtn").addEventListener("click", closeFullscreen);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && fsOverlayEl.classList.contains("ka-open")) closeFullscreen(); });
    return fsOverlayEl;
  }
  function closeFullscreen() {
    if (fsOverlayEl) fsOverlayEl.classList.remove("ka-open");
  }
  function openFullscreen(song, id, mode) {
    const overlay = ensureFsOverlay();
    overlay.classList.toggle("ka-theme-dark", themeMode === "dark");
    overlay.classList.toggle("ka-device-hp", deviceMode === "hp");
    overlay.classList.toggle("ka-device-pc", deviceMode !== "hp");
    overlay.querySelector("#kaFsTitle").textContent = `${song.Judul} — ${MODE_TITLE_FS[mode] || ""}`;
    const st = keyState[id];
    const fsZoomKey = zoomKey(id, "fs_" + mode);
    const toolbarEl = overlay.querySelector("#kaFsToolbar");
    const bodyEl = overlay.querySelector("#kaFsBody");

    function draw() {
      const semis = st.activeIdx - st.baseIdx;
      const label = keyLabel(st.activeIdx, st.useFlat, st.isMinor);
      const z = zoomState[fsZoomKey] || 1;
      let toolbarHtml = "";
      if (mode !== "syair") {
        toolbarHtml += `<span class="ka-fs-toolbar-group"><span class="ka-label">${mode === "notasi" ? "Do =" : "Kunci:"}</span>${keyList(st.useFlat).map((k, i) => `<button class="ka-key-btn${i === st.activeIdx ? " ka-active" : ""}" data-ka-fs-key="${i}">${k}</button>`).join("")}</span>`;
      }
      toolbarHtml += `<span class="ka-fs-toolbar-group"><span class="ka-label">Teks:</span><button class="ka-zoom-btn" data-ka-fs-zoom="dec">A−</button><span class="ka-zoom-pct">${Math.round(z * 100)}%</span><button class="ka-zoom-btn" data-ka-fs-zoom="inc">A+</button></span>`;
      toolbarEl.innerHTML = toolbarHtml;

      let bodyHtml = "";
      if (mode === "syair") bodyHtml = `<div class="ka-zoom-target"><p class="ka-lyrics">${renderPlainLyrics(song.Syair)}</p></div>`;
      else if (mode === "kunci") bodyHtml = `<div class="ka-zoom-target"><p class="ka-lyrics">${renderLyricsWithChords(transposeLyricsWithChords(song.SyairKunci || "", semis, st.useFlat))}</p></div>`;
      else if (mode === "notasi") bodyHtml = `<div class="ka-zoom-target"><div class="ka-notasi-wrap"><div class="ka-do-label">Do = <b>${label}</b> · Birama ${escapeHtml(song.Birama || "4/4")}</div>${renderNotasiAngka(song.NotAngka, song.Birama, semis, st.useFlat)}</div></div>`;
      else bodyHtml = `<div class="ka-zoom-target"><div class="ka-notasi-wrap"><div class="ka-do-label">Do = <b>${label}</b> · Birama ${escapeHtml(song.Birama || "4/4")}</div>${renderComboSheet(song.KunciNotasiLirik || "", semis, st.useFlat)}</div></div>`;
      bodyEl.innerHTML = bodyHtml;
      const target = bodyEl.querySelector(".ka-zoom-target");
      if (target) target.style.zoom = z;

      toolbarEl.querySelectorAll("[data-ka-fs-key]").forEach((b) => {
        b.addEventListener("click", () => {
          st.activeIdx = parseInt(b.dataset.kaFsKey, 10);
          const cardEl = document.querySelector(`.ka-song[data-id="${id}"]`);
          if (cardEl) updateKeyUI(cardEl, id, song);
          draw();
        });
      });
      toolbarEl.querySelectorAll("[data-ka-fs-zoom]").forEach((b) => {
        b.addEventListener("click", () => {
          zoomState[fsZoomKey] = nextZoomValue(zoomState[fsZoomKey] || 1, b.dataset.kaFsZoom === "inc" ? 1 : -1);
          draw();
        });
      });
    }
    draw();
    overlay.classList.add("ka-open");
  }

  // ---------- ENTRY POINT ----------
  // Dipanggil dari js/kidung-ui.js: KidungAnak.renderHome(panelEl, onBack)
  async function renderHome(panelEl, onBack) {
    rootPanelEl = panelEl;
    onBackCallback = onBack;
    panelEl.classList.add("ka-root");
    applyDeviceMode();
    applyThemeMode();
    panelEl.innerHTML = "";

    const topRow = document.createElement("div");
    topRow.className = "ka-top-row";
    const backBtn = document.createElement("button");
    backBtn.type = "button";
    backBtn.className = "chip-btn small";
    backBtn.textContent = "← Kembali ke Kidung";
    backBtn.addEventListener("click", () => { if (typeof onBackCallback === "function") onBackCallback(); });
    topRow.appendChild(backBtn);

    const themeBtn = document.createElement("button");
    themeBtn.type = "button";
    themeBtn.className = "chip-btn small";
    themeBtn.textContent = themeMode === "dark" ? "☀️" : "🌙";
    themeBtn.title = "Tema terang/gelap (khusus tampilan Kidung Anak)";
    themeBtn.addEventListener("click", () => {
      themeMode = themeMode === "dark" ? "light" : "dark";
      localStorage.setItem("kaTheme", themeMode);
      applyThemeMode();
      themeBtn.textContent = themeMode === "dark" ? "☀️" : "🌙";
    });
    topRow.appendChild(themeBtn);
    panelEl.appendChild(topRow);

    const title = document.createElement("h2");
    title.textContent = "👶 Kidung Anak-Anak";
    panelEl.appendChild(title);

    const toolbar = document.createElement("div");
    toolbar.className = "ka-toolbar";
    toolbar.innerHTML = `
      <div class="ka-search-box"><span class="ka-search-icon">🔍</span><input type="text" id="kaSearchInput" placeholder="Cari judul lagu…"></div>
      <div class="ka-device-toggle">
        <button class="ka-device-btn" data-ka-device="hp">📱 HP</button>
        <button class="ka-device-btn" data-ka-device="pc">🖥️ Komputer</button>
      </div>
      <button class="chip-btn small" id="kaReloadBtn">↻ Muat ulang</button>
    `;
    panelEl.appendChild(toolbar);
    toolbar.querySelectorAll(".ka-device-btn").forEach((b) => {
      b.classList.toggle("ka-active", b.dataset.kaDevice === deviceMode);
      b.addEventListener("click", () => {
        deviceMode = b.dataset.kaDevice;
        localStorage.setItem("kaDeviceMode", deviceMode);
        applyDeviceMode();
        toolbar.querySelectorAll(".ka-device-btn").forEach((x) => x.classList.toggle("ka-active", x.dataset.kaDevice === deviceMode));
      });
    });

    const chipsWrap = document.createElement("div");
    chipsWrap.className = "ka-chips";
    panelEl.appendChild(chipsWrap);

    const statusLine = document.createElement("p");
    statusLine.className = "ka-status-line";
    statusLine.textContent = "Memuat data…";
    panelEl.appendChild(statusLine);

    const listEl = document.createElement("div");
    listEl.className = "ka-song-list";
    panelEl.appendChild(listEl);

    const searchInput = toolbar.querySelector("#kaSearchInput");
    searchInput.addEventListener("input", () => renderList(listEl, searchInput, chipsWrap));
    toolbar.querySelector("#kaReloadBtn").addEventListener("click", async () => {
      await loadData(statusLine);
      buildCategoryChips(chipsWrap, () => renderList(listEl, searchInput, chipsWrap));
      renderList(listEl, searchInput, chipsWrap);
    });

    if (!dataLoaded) await loadData(statusLine);
    else { statusLine.textContent = `${SONGS.length} lagu (data tersimpan sesi ini).`; statusLine.className = "ka-status-line ka-ok"; }
    buildCategoryChips(chipsWrap, () => renderList(listEl, searchInput, chipsWrap));
    renderList(listEl, searchInput, chipsWrap);
  }

  // ================================================================
  //  NAVIGASI ◀ ▶ LINTAS-BUKU: KIDUNG UMUM <-> KIDUNG ANAK
  //  ----------------------------------------------------------------
  //  js/kidung.js dan js/kidung-ui.js TIDAK diedit filenya sama sekali
  //  untuk fitur ini. Sebagai gantinya, 2 fungsi globalnya DITIMPA saat
  //  RUNTIME (bukan diedit di file aslinya):
  //    - findAdjacentKidungCrossBook(buku, no, arah) -- aslinya cuma
  //      berputar di antara buku-buku Kidung Umum (Kidung/Suplemen/dst).
  //      Ditimpa supaya menyisipkan "Kidung Anak" sebagai 1 buku
  //      tambahan dalam putaran itu, PERSIS logika round-robin aslinya
  //      (lihat komentar asli di js/kidung.js baris ~213), cuma daftar
  //      bukunya + 1.
  //    - openKidungReader(buku, no) -- aslinya cuma tahu cara buka
  //      buku Kidung Umum (ambil bait dari IndexedDB). Ditimpa supaya
  //      kalau buku yang dituju = "Kidung Anak", dialihkan ke daftar
  //      lagu anak (bukan bikin fungsi aslinya bingung/error karena
  //      buku itu tidak ada di IndexedDB-nya Kidung Umum).
  //  Kalau KEDUA fungsi asli itu ternyata tidak ada (mis. urutan file
  //  di index.html berubah di kemudian hari), penimpaan ini otomatis
  //  dilewati (dicek dengan typeof) -- jadi TIDAK PERNAH bikin error,
  //  paling buruk cuma fitur loncat-buku ini yang tidak aktif.
  // ================================================================
  const KA_BUKU_MARKER = "Kidung Anak"; // nama ini juga yang tampil di tooltip ◀/▶ Kidung Umum (dibentuk otomatis oleh kode asli, tidak perlu diubah)

  function getSortedSongs() {
    return [...SONGS].sort((a, b) => (parseInt(a.No, 10) || 0) - (parseInt(b.No, 10) || 0));
  }

  // Cari lagu anak berikutnya/sebelumnya berdasarkan nomor; kalau sudah
  // di ujung (lagu pertama/terakhir), loncat KELUAR ke Kidung Umum:
  // buku pertama (kalau maju) atau buku terakhir (kalau mundur), nomor
  // pertama/terakhir di buku itu -- inilah yang bikin "kidung anak habis
  // -> balik ke No.1 Kidung Umum" (asalkan getKidungBooksOrdered()
  // menaruh buku utama "Kidung" di urutan pertama, seperti lazimnya).
  async function findAdjacentInKidungAnakOrJumpOut(noInt, direction) {
    if (!dataLoaded) await loadData();
    const sorted = getSortedSongs();
    const idx = sorted.findIndex((s) => parseInt(s.No, 10) === noInt);
    if (idx === -1) return null;
    const nextIdx = idx + direction;
    if (nextIdx >= 0 && nextIdx < sorted.length) return { buku: KA_BUKU_MARKER, no: sorted[nextIdx].No };
    if (typeof getKidungBooksOrdered !== "function" || typeof getKidungList !== "function") return null;
    const books = await getKidungBooksOrdered();
    if (!books.length) return null;
    const targetBuku = direction > 0 ? books[0] : books[books.length - 1];
    const list = await getKidungList(targetBuku);
    const nums = list.map((k) => parseInt(k.noKidung, 10)).filter((n) => !isNaN(n)).sort((a, b) => a - b);
    if (!nums.length) return null;
    const targetNo = direction > 0 ? nums[0] : nums[nums.length - 1];
    return { buku: targetBuku, no: targetNo };
  }

  if (typeof window.findAdjacentKidungCrossBook === "function" && !window.__kaCrossBookPatched) {
    const ORIG_findAdjacentKidungCrossBook = window.findAdjacentKidungCrossBook;
    window.findAdjacentKidungCrossBook = async function (buku, noInt, direction) {
      if (buku === KA_BUKU_MARKER) return findAdjacentInKidungAnakOrJumpOut(noInt, direction);
      // buku Kidung Umum biasa -- coba nomor sebelah dulu di buku yang sama
      // (persis langkah pertama fungsi aslinya)
      if (typeof findAdjacentKidungNo === "function") {
        const sameBookNo = await findAdjacentKidungNo(buku, noInt, direction).catch(() => null);
        if (sameBookNo != null) return { buku, no: sameBookNo };
      }
      if (typeof getKidungBooksOrdered !== "function" || typeof getKidungList !== "function") {
        return ORIG_findAdjacentKidungCrossBook(buku, noInt, direction);
      }
      const realBooks = await getKidungBooksOrdered();
      const extended = [...realBooks, KA_BUKU_MARKER]; // <- satu-satunya bedanya dari logika asli
      const idx = extended.indexOf(buku);
      if (idx === -1) return ORIG_findAdjacentKidungCrossBook(buku, noInt, direction);
      for (let step = 1; step <= extended.length; step++) {
        const nextIdx = ((idx + step * direction) % extended.length + extended.length) % extended.length;
        if (nextIdx === idx) break;
        const candidate = extended[nextIdx];
        if (candidate === KA_BUKU_MARKER) {
          if (!dataLoaded) await loadData();
          if (!SONGS.length) continue;
          const sorted = getSortedSongs();
          const target = direction > 0 ? sorted[0] : sorted[sorted.length - 1];
          return { buku: KA_BUKU_MARKER, no: target.No };
        }
        const list = await getKidungList(candidate);
        const nums = list.map((k) => parseInt(k.noKidung, 10)).filter((n) => !isNaN(n)).sort((a, b) => a - b);
        if (!nums.length) continue;
        const targetNo = direction > 0 ? nums[0] : nums[nums.length - 1];
        return { buku: candidate, no: targetNo };
      }
      return null;
    };
    window.__kaCrossBookPatched = true;
  }

  if (typeof window.openKidungReader === "function" && !window.__kaOpenReaderPatched) {
    const ORIG_openKidungReader = window.openKidungReader;
    window.openKidungReader = async function (buku, no) {
      if (buku === KA_BUKU_MARKER) { await openReaderInList(String(no)); return; }
      return ORIG_openKidungReader(buku, no);
    };
    window.__kaOpenReaderPatched = true;
  }

  // Pindah ke kartu lagu tertentu (dipanggil ◀/▶ Kidung Umum saat
  // mendarat di "Kidung Anak", ATAU oleh ◀/▶ di dalam kartu lagu anak
  // sendiri). Menampilkan daftar (kalau panel belum menampilkannya),
  // mereset filter cari/kategori supaya lagu yang dituju pasti ketemu,
  // lalu membuka & scroll ke kartunya.
  async function openReaderInList(noStr) {
    const panel = document.getElementById("kidungPanel");
    if (!panel) return;
    const alreadyShowing = panel.classList.contains("ka-root") && panel.querySelector(".ka-song-list");
    if (!alreadyShowing) {
      await renderHome(panel, typeof window.renderKidungHome === "function" ? window.renderKidungHome : null);
    }
    const listEl = panel.querySelector(".ka-song-list");
    const searchInput = panel.querySelector("#kaSearchInput");
    const chipsWrap = panel.querySelector(".ka-chips");
    if (listEl && searchInput && chipsWrap) {
      currentCategory = "Semua";
      searchInput.value = "";
      buildCategoryChips(chipsWrap, () => renderList(listEl, searchInput, chipsWrap));
      renderList(listEl, searchInput, chipsWrap);
    }
    requestAnimationFrame(() => {
      const target = [...panel.querySelectorAll(".ka-song")].find((c) => c.dataset.songNo === String(noStr));
      if (!target) return;
      panel.querySelectorAll(".ka-song.ka-open").forEach((c) => { if (c !== target) c.classList.remove("ka-open"); });
      target.classList.add("ka-open");
      if (!target.dataset.tabInit) { activateTab(target, "syair"); target.dataset.tabInit = "1"; }
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // Dipanggil oleh tombol ◀/▶ & swipe di dalam kartu lagu anak
  async function stepSong(song, direction) {
    const target = await findAdjacentInKidungAnakOrJumpOut(parseInt(song.No, 10), direction);
    if (target && typeof window.openKidungReader === "function") window.openKidungReader(target.buku, String(target.no));
  }

  // Geser kiri = lanjut (seperti membalik halaman ke depan), geser
  // kanan = kembali -- ambang batas 60px, dan gerakan harus lebih
  // condong mendatar daripada tegak (supaya tidak bentrok dgn scroll
  // biasa ke atas/bawah).
  function attachSwipeNav(targetEl, onSwipeLeft, onSwipeRight) {
    if (!targetEl) return;
    let sx = 0, sy = 0, tracking = false;
    targetEl.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1) { tracking = false; return; }
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; tracking = true;
    }, { passive: true });
    targetEl.addEventListener("touchend", (e) => {
      if (!tracking) return;
      tracking = false;
      if (!e.changedTouches || !e.changedTouches.length) return;
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      const TH = 60;
      if (Math.abs(dx) > TH && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) onSwipeLeft(); else onSwipeRight();
      }
    }, { passive: true });
  }

  return { renderHome };
})();
