// ============================================================
//  📝 BANDINGKAN NOTES — Indonesia (Recovery) vs Inggris (Recovery)
//  (BARU, book182) Tambahan untuk menu "🔎 Verifikasi Bahasa Ayat".
//  Memindai SEMUA ayat yang punya catatan (kolom Note) di rvind & rveng,
//  lalu menandai ayat yang notes-nya KIRA-KIRA TIDAK SEPADAN. Bukan
//  terjemahan -- hanya info "ayat mana yang perlu dicek". Semua jalan lokal.
//
//  Jenis temuan:
//   kosong-id   : Inggris ada notes, Indonesia KOSONG (kasus Bilangan 1:1)
//   kosong-en   : Indonesia ada notes, Inggris kosong
//   pendek-id   : notes Indonesia jauh lebih pendek (sebagian terpotong / ringkas)
//   panjang-id  : notes Indonesia jauh lebih panjang dari Inggris
//   jumlah-beda : jumlah entri catatan ((1),(2),(a)...) berbeda
//   rujukan-beda: angka rujukan ayat/pasal (25, 2:9, 3:16...) banyak yang tidak sama
//   bahasa-salah: notes Indonesia ternyata berbahasa Inggris (atau sebaliknya)
//  Heuristik, bukan 100% akurat.
// ============================================================
const NotesCompare = (function () {
  const KIND_LABEL = {
    "kosong-id": "Indonesia KOSONG (Inggris ada)",
    "kosong-en": "Inggris KOSONG (Indonesia ada)",
    "pendek-id": "Indonesia jauh lebih pendek",
    "panjang-id": "Indonesia jauh lebih panjang",
    "jumlah-beda": "Jumlah entri catatan beda",
    "rujukan-beda": "Angka rujukan banyak beda",
    "bahasa-salah": "Bahasa notes tertukar",
  };
  const KIND_SEVERITY = { "kosong-id": 1, "kosong-en": 1, "bahasa-salah": 1, "pendek-id": 2, "jumlah-beda": 2, "rujukan-beda": 3, "panjang-id": 3 };

  let state = { flagged: [], summary: null, filterKind: "__all__", filterBook: "", scanned: false, limit: 200 };

  function esc_(s) {
    return typeof escapeHtml === "function"
      ? escapeHtml(s)
      : String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function plain_(html) {
    const t = String(html || "")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/[ \t]+/g, " ")
      .trim();
    return isPlaceholder_(t) ? "" : t;
  }
  // BARU (book183): teks pengisi seperti "Tidak ada catatan" / "-" dianggap
  // KOSONG, bukan notes sungguhan. Tanpa ini, Bilangan 1:1 yang notes
  // Indonesia-nya cuma berisi pengisi tidak dihitung "kosong".
  function isPlaceholder_(t) {
    return /^(tidak ada (catatan|notes?)|belum ada (catatan|notes?)|no notes?|n\/a|[-–—.]+)\.?$/i.test(String(t || "").trim());
  }
  function entryCount_(html) {
    if (typeof parseFootnoteEntries !== "function") return 0;
    return parseFootnoteEntries(html).length;
  }
  // Angka rujukan: "25", "2:9", "3:16", "26:15" -> set string. Angka pendek 1 digit diabaikan (terlalu umum).
  function refNumbers_(text) {
    const m = String(text || "").match(/\d+(?::\d+)?(?:-\d+)?/g) || [];
    return new Set(m.filter((x) => x.length >= 2 || x.indexOf(":") !== -1));
  }

  function classify_(idNote, enNote) {
    const idT = plain_(idNote);
    const enT = plain_(enNote);
    const out = [];
    if (!idT && !enT) return out;
    if (!idT && enT) { out.push({ kind: "kosong-id", detail: `Inggris ${enT.length} huruf, Indonesia 0` }); return out; }
    if (idT && !enT) { out.push({ kind: "kosong-en", detail: `Indonesia ${idT.length} huruf, Inggris 0` }); return out; }

    // bahasa tertukar (pakai pendeteksi di langcheck.js)
    if (typeof lcDetectFamily === "function") {
      const di = lcDetectFamily(idT);
      const de = lcDetectFamily(enT);
      if (di.confidence !== "rendah" && di.family === "en") out.push({ kind: "bahasa-salah", detail: "notes Indonesia terbaca berbahasa Inggris" });
      else if (de.confidence !== "rendah" && de.family === "id") out.push({ kind: "bahasa-salah", detail: "notes Inggris terbaca berbahasa Indonesia" });
    }

    // panjang: Indonesia biasanya 0,9-1,4x Inggris. Abaikan notes sangat pendek (<60 huruf).
    const big = Math.max(idT.length, enT.length);
    if (big >= 60) {
      const ratio = idT.length / enT.length;
      if (ratio < 0.5) out.push({ kind: "pendek-id", detail: `Indonesia ${idT.length} vs Inggris ${enT.length} huruf (${Math.round(ratio * 100)}%)` });
      else if (ratio > 2.0) out.push({ kind: "panjang-id", detail: `Indonesia ${idT.length} vs Inggris ${enT.length} huruf (${Math.round(ratio * 100)}%)` });
    }

    const ci = entryCount_(idNote);
    const ce = entryCount_(enNote);
    if (ci !== ce && Math.abs(ci - ce) >= 1 && Math.max(ci, ce) >= 2) {
      out.push({ kind: "jumlah-beda", detail: `entri Indonesia ${ci} vs Inggris ${ce}` });
    }

    const ni = refNumbers_(idT);
    const ne = refNumbers_(enT);
    if (ne.size >= 3) {
      let common = 0;
      ne.forEach((x) => { if (ni.has(x)) common++; });
      if (common / ne.size < 0.5) out.push({ kind: "rujukan-beda", detail: `angka rujukan sama ${common} dari ${ne.size}` });
    }
    return out;
  }

  async function scan(onProgress) {
    const idMap = new Map();
    const enMap = new Map();
    const src = typeof bibleData !== "undefined" ? bibleData : [];
    const total = src.length;
    const batch = 5000;
    for (let i = 0; i < total; i += batch) {
      const end = Math.min(i + batch, total);
      for (let j = i; j < end; j++) {
        const v = src[j];
        if (v.lang !== "rvind" && v.lang !== "rveng") continue;
        const key = v.bookNumber + ":" + v.chapter + ":" + v.verse;
        const rec = { v, note: v.note || "" };
        if (v.lang === "rvind") idMap.set(key, rec); else enMap.set(key, rec);
      }
      if (onProgress) onProgress(end, total);
      await new Promise((r) => setTimeout(r, 0));
    }
    const keys = new Set([...idMap.keys(), ...enMap.keys()]);
    const flagged = [];
    const counts = { verses: 0, bothHave: 0 };
    keys.forEach((k) => {
      const a = idMap.get(k);
      const b = enMap.get(k);
      const idNote = a ? a.note : "";
      const enNote = b ? b.note : "";
      if (!plain_(idNote) && !plain_(enNote)) return;
      counts.verses++;
      if (plain_(idNote) && plain_(enNote)) counts.bothHave++;
      const kinds = classify_(idNote, enNote);
      if (!kinds.length) return;
      const ref = (a || b).v;
      flagged.push({
        bookNumber: ref.bookNumber, chapter: ref.chapter, verse: ref.verse,
        bookName: (a && a.v.bookName) || (b && b.v.bookName) || "",
        kinds, idNote, enNote,
        severity: Math.min(...kinds.map((x) => KIND_SEVERITY[x.kind] || 9)),
      });
    });
    flagged.sort((x, y) => x.severity - y.severity || x.bookNumber - y.bookNumber || x.chapter - y.chapter || x.verse - y.verse);
    const per = {};
    flagged.forEach((f) => f.kinds.forEach((k) => { per[k.kind] = (per[k.kind] || 0) + 1; }));
    return { flagged, summary: { ...counts, per, noRvind: idMap.size === 0, noRveng: enMap.size === 0 } };
  }

  function csv_(list) {
    const esc = (v) => { const s = String(v == null ? "" : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const lines = [["Kitab", "Pasal", "Ayat", "Jenis", "Detail", "Notes Indonesia", "Notes Inggris"].join(",")];
    list.forEach((f) => lines.push([f.bookName, f.chapter, f.verse, f.kinds.map((k) => KIND_LABEL[k.kind]).join(" + "), f.kinds.map((k) => k.detail).join(" | "), plain_(f.idNote), plain_(f.enNote)].map(esc).join(",")));
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `bandingkan-notes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function renderResults_(wrap) {
    wrap.innerHTML = "";
    const s = state.summary;
    if (!s) return;
    if (s.noRvind || s.noRveng) {
      const p = document.createElement("p");
      p.className = "media-empty";
      p.textContent = "Data " + (s.noRvind ? "Indonesia (Recovery)" : "Inggris (Recovery)") + " belum tersimpan di perangkat ini. Unduh dulu lewat ⋮ → Unduh Data Alkitab.";
      wrap.appendChild(p);
      return;
    }
    const sum = document.createElement("p");
    sum.className = "log-count";
    sum.innerHTML = `Ayat yang punya notes di salah satu bahasa: <b>${s.verses.toLocaleString("id-ID")}</b> · keduanya ada: <b>${s.bothHave.toLocaleString("id-ID")}</b> · ditandai: <b>${state.flagged.length.toLocaleString("id-ID")}</b><br>` +
      Object.keys(KIND_LABEL).filter((k) => s.per[k]).map((k) => `${esc_(KIND_LABEL[k])}: <b>${s.per[k].toLocaleString("id-ID")}</b>`).join(" · ");
    wrap.appendChild(sum);

    let list = state.flagged;
    if (state.filterKind !== "__all__") list = list.filter((f) => f.kinds.some((k) => k.kind === state.filterKind));
    if (state.filterBook) list = list.filter((f) => `${f.bookName} ${f.chapter}:${f.verse}`.toLowerCase().indexOf(state.filterBook) !== -1);
    const cnt = document.createElement("p");
    cnt.className = "log-count";
    cnt.textContent = `${list.length.toLocaleString("id-ID")} ayat sesuai filter.`;
    wrap.appendChild(cnt);
    if (!list.length) {
      const p = document.createElement("p");
      p.className = "media-empty";
      p.textContent = state.flagged.length ? "Tidak ada yang cocok dengan filter." : "Tidak ada perbedaan mencolok. 🎉";
      wrap.appendChild(p);
      return;
    }
    const shown = list.slice(0, state.limit);
    const table = document.createElement("table");
    table.className = "log-table";
    table.innerHTML = "<thead><tr><th>Ayat</th><th>Temuan</th><th>Cuplikan Indonesia</th><th>Cuplikan Inggris</th><th></th></tr></thead><tbody>" +
      shown.map((f) => {
        const sn = (h) => { const t = plain_(h); return t ? esc_(t.slice(0, 110)) + (t.length > 110 ? "…" : "") : "<em>(kosong)</em>"; };
        return `<tr><td>${esc_(f.bookName)} ${f.chapter}:${f.verse}</td>
          <td>${f.kinds.map((k) => `<div><b>${esc_(KIND_LABEL[k.kind])}</b><br><small>${esc_(k.detail)}</small></div>`).join("")}</td>
          <td class="lc-snippet">${sn(f.idNote)}</td><td class="lc-snippet">${sn(f.enNote)}</td>
          <td><button type="button" class="chip-btn small nc-view-btn">Lihat ayat</button></td></tr>`;
      }).join("") + "</tbody>";
    wrap.appendChild(table);
    if (list.length > shown.length) {
      const n = document.createElement("p");
      n.className = "media-empty";
      n.textContent = `Menampilkan ${shown.length} dari ${list.length}. `;
      const more = document.createElement("button");
      more.type = "button"; more.className = "chip-btn small";
      more.textContent = "Tampilkan 200 lagi";
      more.addEventListener("click", () => { state.limit += 200; renderResults_(wrap); });
      n.appendChild(more);
      wrap.appendChild(n);
    }
    table.querySelectorAll("tbody tr").forEach((tr, i) => {
      const f = shown[i];
      tr.querySelector(".nc-view-btn").addEventListener("click", () => {
        if (typeof currentLang !== "undefined") currentLang = "rvind";
        if (typeof langSelectEl === "function" && langSelectEl()) langSelectEl().value = "rvind";
        if (typeof renderChapter === "function") renderChapter(f.bookNumber, f.chapter, f.verse);
      });
    });
    wrap._csvList = list;
  }

  // ------------------------------------------------------------
  // BARU (book183) -- 🔎 CEK 1 AYAT (administrator). Ketik mis. "Bilangan 1:1":
  // tampilkan notes Indonesia & Inggris berdampingan per entri, apakah data
  // ayatnya ADA di perangkat ini, dan hasil pemeriksaan otomatis (kenapa
  // ditandai / kenapa lolos). Tidak perlu pindai semua ayat dulu.
  // ------------------------------------------------------------
  function findVerseRecs_(bookNumber, chapter, verse) {
    const out = { rvind: null, rveng: null, ind: 0, eng: 0 };
    const src = typeof bibleData !== "undefined" ? bibleData : [];
    for (let i = 0; i < src.length; i++) {
      const v = src[i];
      if (v.lang === "rvind") out.ind++; else if (v.lang === "rveng") out.eng++;
      if ((v.lang === "rvind" || v.lang === "rveng") && Number(v.bookNumber) === bookNumber && Number(v.chapter) === chapter && Number(v.verse) === verse) {
        out[v.lang] = v;
      }
    }
    return out;
  }
  function entryList_(html) {
    if (typeof parseFootnoteEntries !== "function") return [];
    return parseFootnoteEntries(html).map((e) => plain_((e.parts || []).map((x) => "<p>" + x + "</p>").join("")));
  }
  function checkOneVerse_(query, out) {
    out.innerHTML = "";
    const add = (html, cls) => { const d = document.createElement("div"); if (cls) d.className = cls; d.innerHTML = html; out.appendChild(d); return d; };
    const ref = typeof parseReference === "function" ? parseReference(query) : null;
    if (!ref || !ref.verseStart) { add('<p class="media-empty">Tulis seperti: <b>Bilangan 1:1</b></p>'); return; }
    const recs = findVerseRecs_(ref.book.num, ref.chapter, ref.verseStart);
    const title = `${esc_(ref.book.name)} ${ref.chapter}:${ref.verseStart}`;
    if (!recs.ind || !recs.eng) {
      add(`<p class="media-empty"><b>${title}</b> — data belum lengkap di perangkat ini: Indonesia (Recovery) ${recs.ind} baris, Inggris (Recovery) ${recs.eng} baris. ` +
        `Unduh dulu lewat ⋮ → Unduh Data Alkitab.</p>`);
      if (!recs.ind && !recs.eng) return;
    }
    const idNote = recs.rvind ? recs.rvind.note || "" : "";
    const enNote = recs.rveng ? recs.rveng.note || "" : "";
    const lines = [];
    lines.push(`Baris ayat Indonesia: <b>${recs.rvind ? "ada" : "TIDAK ADA"}</b> · Inggris: <b>${recs.rveng ? "ada" : "TIDAK ADA"}</b>`);
    lines.push(`Notes Indonesia: <b>${plain_(idNote).length}</b> huruf, ${entryCount_(idNote)} entri · Notes Inggris: <b>${plain_(enNote).length}</b> huruf, ${entryCount_(enNote)} entri`);
    const kinds = classify_(idNote, enNote);
    lines.push(kinds.length
      ? "Hasil: <b>DITANDAI</b> — " + kinds.map((k) => `${esc_(KIND_LABEL[k.kind])} (${esc_(k.detail)})`).join("; ")
      : (plain_(idNote) || plain_(enNote)
        ? "Hasil: <b>lolos</b> — panjang, jumlah entri, dan angka rujukan masih dianggap mirip. Kalau isinya tetap terlihat salah, bandingkan manual di bawah (pemeriksa otomatis tidak membaca makna)."
        : "Hasil: kedua notes kosong, jadi tidak ada yang dibandingkan."));
    add(`<p><b>${title}</b></p><p class="log-count">${lines.join("<br>")}</p>`);
    const a = entryList_(idNote), b = entryList_(enNote);
    const n = Math.max(a.length, b.length);
    if (n) {
      let rows = "";
      for (let i = 0; i < n; i++) {
        const ra = a[i] ? [...refNumbers_(a[i])] : [], rb = b[i] ? [...refNumbers_(b[i])] : [];
        const same = ra.filter((x) => rb.indexOf(x) !== -1).length;
        rows += `<tr><td>${i + 1}</td><td class="lc-snippet">${a[i] ? esc_(a[i]) : "<em>(tidak ada)</em>"}</td>` +
          `<td class="lc-snippet">${b[i] ? esc_(b[i]) : "<em>(tidak ada)</em>"}</td>` +
          `<td><small>angka rujukan sama ${same} dari ${Math.max(ra.length, rb.length)}</small></td></tr>`;
      }
      add(`<div class="log-table-wrap"><table class="log-table"><thead><tr><th>#</th><th>Indonesia</th><th>Inggris</th><th>Rujukan</th></tr></thead><tbody>${rows}</tbody></table></div>`);
    } else if (plain_(idNote) || plain_(enNote)) {
      add(`<div class="log-table-wrap"><table class="log-table"><thead><tr><th>Indonesia</th><th>Inggris</th></tr></thead><tbody><tr><td class="lc-snippet">${esc_(plain_(idNote)) || "<em>(kosong)</em>"}</td><td class="lc-snippet">${esc_(plain_(enNote)) || "<em>(kosong)</em>"}</td></tr></tbody></table></div>`);
    }
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "chip-btn small"; btn.textContent = "Buka ayat ini";
    btn.addEventListener("click", () => {
      if (typeof currentLang !== "undefined") currentLang = "rvind";
      if (typeof langSelectEl === "function" && langSelectEl()) langSelectEl().value = "rvind";
      if (typeof renderChapter === "function") renderChapter(ref.book.num, ref.chapter, ref.verseStart);
    });
    out.appendChild(btn);
  }

  // Dipanggil dari renderLangCheckPanel() (js/langcheck.js). Mengembalikan blok UI siap pasang.
  function buildSection() {
    const box = document.createElement("div");
    box.className = "nc-section";
    box.innerHTML = `
      <h3>📝 Bandingkan Notes: Indonesia (Recovery) vs Inggris (Recovery)</h3>
      <p class="media-empty">Mencari ayat yang notes-nya <b>kosong di satu bahasa</b> atau <b>jauh berbeda</b> panjang, jumlah entri, dan angka rujukannya.
      Tidak diterjemahkan — hanya info ayat mana yang perlu dicek di Google Sheet. Heuristik, bukan 100% akurat.</p>
      <div class="log-controls">
        <label>🔎 Cek 1 ayat: <input type="text" class="nc-one" placeholder="mis. Bilangan 1:1" /></label>
        <button type="button" class="chip-btn nc-one-btn">Cek</button>
      </div>
      <div class="log-table-wrap nc-one-out"></div>
      <div class="log-controls">
        <button type="button" class="chip-btn primary nc-scan">🔍 Bandingkan Notes</button>
        <label>Temuan: <select class="columns-lang-select nc-kind"><option value="__all__">Semua</option>${Object.keys(KIND_LABEL).map((k) => `<option value="${k}">${esc_(KIND_LABEL[k])}</option>`).join("")}</select></label>
        <label>Cari ayat: <input type="text" class="nc-book" placeholder="mis. Bilangan" /></label>
        <button type="button" class="chip-btn nc-csv">💾 Simpan CSV</button>
      </div>
      <div class="log-table-wrap nc-results"><p class="media-empty">Tekan "🔍 Bandingkan Notes" untuk memulai.</p></div>`;
    const wrap = box.querySelector(".nc-results");
    const oneIn = box.querySelector(".nc-one"), oneOut = box.querySelector(".nc-one-out");
    const runOne = () => checkOneVerse_(oneIn.value, oneOut);
    box.querySelector(".nc-one-btn").addEventListener("click", runOne);
    oneIn.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); runOne(); } });
    const kindSel = box.querySelector(".nc-kind");
    kindSel.value = state.filterKind;
    if (state.scanned) renderResults_(wrap);
    box.querySelector(".nc-scan").addEventListener("click", async () => {
      wrap.innerHTML = `<p class="media-empty nc-prog">Memindai…</p><div class="progress-track"><div class="progress-fill nc-fill"></div></div>`;
      const prog = wrap.querySelector(".nc-prog"), fill = wrap.querySelector(".nc-fill");
      const r = await scan((d, t) => { prog.textContent = `Memindai ${d.toLocaleString("id-ID")} / ${t.toLocaleString("id-ID")}…`; fill.style.width = Math.round((d / (t || 1)) * 100) + "%"; });
      state.flagged = r.flagged; state.summary = r.summary; state.scanned = true;
      renderResults_(wrap);
    });
    kindSel.addEventListener("change", () => { state.filterKind = kindSel.value; if (state.scanned) renderResults_(wrap); });
    box.querySelector(".nc-book").addEventListener("input", (e) => { state.filterBook = e.target.value.trim().toLowerCase(); if (state.scanned) renderResults_(wrap); });
    box.querySelector(".nc-csv").addEventListener("click", () => {
      if (!state.flagged.length) { alert('Belum ada hasil. Tekan "🔍 Bandingkan Notes" dahulu.'); return; }
      csv_(wrap._csvList || state.flagged);
    });
    return box;
  }

  return { buildSection, scan, classify_ };
})();
