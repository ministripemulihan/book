// ============================================================
//  DIALOG "🎧 AUDIO LATAR" -- pilihan SUMBER audio per slide
//  (BARU 20 Sep 2026, tahap 1). Dimuat SETELAH js/bg-audio.js dan
//  SEBELUM js/presentation-studio.js (urutan <script> di index.html).
//
//  Cara pakai (dipanggil dari bg-audio.js -> openBgAudioDialog_()):
//    BgAudioDialog.open({ title, existing, item, kidungMeta, onSave,
//                         guessKind, isManagedKind, extractYoutubeId })
//    -> onSave(bgAudio | null)   (null = audio slide ini dilepas)
//
//  Dialog terdiri dari 3 bagian:
//    1) "Sumber audio" -- radio: sumber-sumber yang terdaftar + 2 bawaan
//       "↩️ Lanjutkan dari slide sebelumnya" dan "🚫 Tanpa audio".
//    2) Panel milik sumber yang dipilih.
//    3) "Pengaturan pemutaran" (kapan mulai, ulang, nama singkat) --
//       sama untuk semua sumber.
//
//  MENAMBAH SUMBER BARU (tahap 2 "Dari kidung ini", tahap 3 "Dari
//  upload" memakai jalur ini -- berkasnya terpisah supaya tidak perlu
//  menyentuh dialog ini lagi):
//    BgAudioDialog.registerSource({
//      key: "kidung", label: "🎼 Dari kidung ini", order: 20,
//      isAvailable(ctx) { return true/false },       // tampil / tidak
//      build(ctx) {                                   // ctx: lihat buildCtx_()
//        const el = document.createElement("div");
//        ...
//        return {
//          el,                                        // panel (disembunyikan otomatis kalau tidak aktif)
//          getKind() { return "mp3"|"mp4"|"yt"|"sc"|"midi" },
//          getValue() {                               // hasil pilihan:
//            return { url, kind, label, source, mediaId?, extra? } // lengkap
//              // atau { empty: true }  -> anggap "tanpa audio"
//              // atau false            -> ada masalah (alert sudah ditampilkan), dialog TETAP terbuka
//          },
//        };
//      },
//    });
//  Panel boleh memanggil ctx.onKindChange() kalau jenis (getKind) berubah,
//  supaya pilihan "Ulang Semua" (khusus YouTube) ikut menyesuaikan.
//
//  Bentuk hasil (bgAudio) & aturan penyimpanan: lihat normalizeBgAudio()
//  di js/collections.js. Dialog SELALU menandai hasilnya `managed: true`.
// ============================================================
(function (global) {
  "use strict";

  const sources = [];
  // Jenis yang bisa dipilih manual di sumber "Link". tahap 4 menambah ["midi", ...].
  const linkKinds = [["mp3", "🎵 MP3"], ["mp4", "🎬 MP4 (Drive)"], ["yt", "📺 YouTube"], ["sc", "🎧 SoundCloud"]];
  let seq = 0;

  function registerSource(def) {
    if (!def || !def.key) return;
    const i = sources.findIndex((x) => x.key === def.key);
    if (i >= 0) sources[i] = def; else sources.push(def);
    sources.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  function mk(tag, props, css) {
    const e = document.createElement(tag);
    if (props) Object.assign(e, props);
    if (css) e.style.cssText = css;
    return e;
  }

  function radioLabel(name, value, text, checked) {
    const wrap = mk("label", null, "display:inline-flex; align-items:center; gap:4px; margin-right:12px; margin-bottom:4px; cursor:pointer;");
    const r = mk("input", { type: "radio", name, value });
    r.checked = !!checked;
    wrap.appendChild(r);
    wrap.appendChild(document.createTextNode(" " + text));
    return { wrap, radio: r };
  }

  // ---------------- sumber bawaan: 🔗 Link ----------------
  function buildLinkSource(ctx) {
    const existing = ctx.existing;
    const el = mk("div");
    const hint = mk("p", { className: "simple-dialog-hint" });
    hint.textContent = "Tempel SATU link: MP3 (link langsung / Google Drive), MP4 (video Google Drive -- gambarnya TIDAK ditampilkan, cuma suaranya), YouTube, atau SoundCloud (link biasa maupun link pendek on.soundcloud.com).";
    el.appendChild(hint);

    const urlField = mk("div", { className: "simple-dialog-field" });
    urlField.appendChild(mk("label", { textContent: "Link audio:" }));
    const urlInput = mk("input", { type: "text", placeholder: "https://... (SoundCloud / YouTube / MP3 / link Google Drive)" }, "width:100%;");
    urlInput.value = (existing && existing.source !== "kidung" && existing.source !== "upload" && existing.url) || "";
    urlField.appendChild(urlInput);
    el.appendChild(urlField);

    const kindField = mk("div", { className: "simple-dialog-field" });
    kindField.appendChild(mk("label", { textContent: "Jenis link:" }));
    const kindRow = mk("div", { className: "ps-btn-row" });
    const name = "psBgKind_" + ctx.index;
    const existingKind = existing && existing.url ? existing.kind : "mp3";
    const kindInputs = linkKinds.map(([val, label]) => {
      const { wrap, radio } = radioLabel(name, val, label, existingKind === val);
      kindRow.appendChild(wrap);
      radio.addEventListener("change", () => ctx.onKindChange());
      return radio;
    });
    kindField.appendChild(kindRow);
    el.appendChild(kindField);

    // Jenis ikut otomatis kalau linknya jelas YouTube/SoundCloud/MIDI (operator
    // sering lupa mengganti radio); link Drive/lain TIDAK mengubah pilihan.
    urlInput.addEventListener("input", () => {
      const guessed = ctx.guessKind(urlInput.value);
      if (guessed && guessed !== "mp3") {
        const r = kindInputs.find((x) => x.value === guessed);
        if (r) { r.checked = true; ctx.onKindChange(); }
      }
    });

    const getKind = () => { const r = kindInputs.find((x) => x.checked); return r ? r.value : "mp3"; };
    return {
      el,
      getKind,
      getValue() {
        const url = urlInput.value.trim();
        if (!url) return { empty: true };
        return { url, kind: getKind(), label: "", source: "link" };
      },
    };
  }

  function buildNoteSource(text) {
    return function () {
      const el = mk("div");
      el.appendChild(mk("p", { className: "simple-dialog-hint", textContent: text }));
      return { el, getKind: () => "mp3", getValue: () => ({ empty: true }) };
    };
  }

  function baseSources() {
    return [
      { key: "link", label: "🔗 Link", order: 10, isAvailable: () => true, build: buildLinkSource },
      { key: "continue", label: "↩️ Lanjutkan dari slide sebelumnya", order: 80, isAvailable: () => true,
        build: buildNoteSource("Slide ini TIDAK memulai maupun menghentikan apa pun: audio yang sedang main dari slide sebelumnya dibiarkan jalan terus (kalau ada). Cocok untuk slide 2, 3, dst yang satu lagu dengan slide pertama.") },
      { key: "none", label: "🚫 Tanpa audio", order: 90, isAvailable: () => true,
        build: buildNoteSource("Slide ini tidak punya audio sendiri. Kalau ada audio yang sedang main dari slide sebelumnya, akan meredup lalu berhenti saat slide ini tayang. Menyimpan dengan pilihan ini MELEPAS audio yang sekarang menempel di slide ini.") },
    ];
  }

  function open(opts) {
    if (typeof showSimpleDialog !== "function") return; // showSimpleDialog() milik js/app.js
    const existing = (opts && opts.existing) || null;
    const index = ++seq;
    const guessKind = (opts && opts.guessKind) || (() => "mp3");
    const extractYoutubeId = (opts && opts.extractYoutubeId) || (() => null);

    showSimpleDialog((opts && opts.title) || "🎧 Audio Latar", (box) => {
      const ctx = {
        existing, item: opts && opts.item, kidungMeta: opts && opts.kidungMeta, index,
        guessKind, extractYoutubeId, isManagedKind: opts && opts.isManagedKind,
        opts, onKindChange: () => syncSettings(),
      };
      // Sumber yang tersedia = terdaftar + bawaan (tanpa duplikat key).
      const defs = baseSources();
      sources.forEach((d) => { const i = defs.findIndex((x) => x.key === d.key); if (i >= 0) defs[i] = d; else defs.push(d); });
      const avail = defs.filter((d) => { try { return d.isAvailable(ctx); } catch (e) { return false; } }).sort((a, b) => (a.order || 0) - (b.order || 0));

      let activeKey = "link";
      if (existing && existing.continuePrev) activeKey = "continue";
      else if (existing && existing.url && (existing.source === "kidung" || existing.source === "upload") && avail.some((d) => d.key === existing.source)) activeKey = existing.source;

      // ---- 1) Sumber audio ----
      const srcField = mk("div", { className: "simple-dialog-field" });
      srcField.appendChild(mk("label", { textContent: "Sumber audio slide ini:" }));
      const srcRow = mk("div", { className: "ps-btn-row bg-audio-source-row" });
      const srcName = "psBgSource_" + index;
      const srcRadios = avail.map((d) => {
        const { wrap, radio } = radioLabel(srcName, d.key, d.label, d.key === activeKey);
        srcRow.appendChild(wrap);
        radio.addEventListener("change", () => { activeKey = d.key; syncPanels(); });
        return radio;
      });
      srcField.appendChild(srcRow);
      box.appendChild(srcField);

      // ---- 2) Panel per sumber ----
      const built = {};
      avail.forEach((d) => {
        let b;
        try { b = d.build(ctx); } catch (e) { console.error("BgAudioDialog: gagal membangun sumber", d.key, e); b = buildNoteSource("(Sumber ini gagal dimuat: " + (e && e.message) + ")")(); }
        built[d.key] = b;
        b.el.hidden = d.key !== activeKey;
        box.appendChild(b.el);
      });

      // ---- 3) Pengaturan pemutaran ----
      const settings = mk("div", { className: "simple-dialog-field" }, "border:1px solid rgba(128,128,128,.35); border-radius:8px; padding:10px 12px; margin-top:6px;");
      settings.appendChild(mk("label", { textContent: "⚙️ Pengaturan pemutaran:" }, "font-weight:600; display:block; margin-bottom:4px;"));

      const labelRow = mk("div", null, "margin:4px 0 8px;");
      labelRow.appendChild(mk("label", { textContent: "Nama singkat (opsional, tampil di kontrol Play):" }, "display:block;"));
      const labelInput = mk("input", { type: "text", placeholder: "mis. Instrumen pembuka" }, "width:100%;");
      labelInput.value = (existing && existing.label) || "";
      labelRow.appendChild(labelInput);
      settings.appendChild(labelRow);

      const startMode0 = existing && existing.armStart ? "arrow" : (existing && existing.autoplay ? "auto" : (existing && existing.url ? "manual" : "arrow"));
      const startName = "psBgStart_" + index;
      settings.appendChild(mk("div", { textContent: "Kapan mulai main:" }, "margin-top:2px;"));
      const startRadios = [
        ["arrow", "🎬 Tunggu klik panah SEKALI LAGI (disarankan)"],
        ["auto", "▶️ Otomatis begitu slide ini muncul"],
        ["manual", "⏸ Manual saja (operator tekan ▶ Play sendiri)"],
      ].map(([val, text]) => {
        const { wrap, radio } = radioLabel(startName, val, text, startMode0 === val);
        wrap.style.display = "flex";
        settings.appendChild(wrap);
        return radio;
      });

      const loopRow = mk("div", null, "display:flex; align-items:center; gap:8px; margin-top:6px;");
      loopRow.appendChild(mk("label", { textContent: "Setelah selesai:" }));
      const loopSelect = mk("select");
      [["once", "▶️ Berhenti (1x saja)"], ["one", "🔁 Ulang lagu ini terus"], ["all", "🔁🔁 Ulang Semua (paket beberapa video YouTube)"]].forEach(([v, t]) => {
        loopSelect.appendChild(mk("option", { value: v, textContent: t }));
      });
      const loopAllOption = Array.from(loopSelect.options).find((o) => o.value === "all");
      loopSelect.value = existing && existing.loopAll ? "all" : (existing && existing.loopFile ? "one" : "once");
      loopRow.appendChild(loopSelect);
      settings.appendChild(loopRow);

      const pkgField = mk("div", { className: "simple-dialog-field" }, "margin-top:8px; padding-top:8px; border-top:1px dashed rgba(128,128,128,.4);");
      pkgField.appendChild(mk("label", { textContent: "🎞 Video LAIN dalam paket ini (urut mainnya, 1 link per baris):" }));
      const pkgTextarea = mk("textarea", { rows: 3, placeholder: "https://youtu.be/videoKedua\nhttps://youtu.be/videoKetiga\n..." }, "width:100%; font-family:inherit; font-size:13px;");
      pkgTextarea.value = Array.isArray(existing && existing.extraUrls) ? existing.extraUrls.join("\n") : "";
      pkgField.appendChild(pkgTextarea);
      pkgField.appendChild(mk("p", { className: "simple-dialog-hint", textContent: "Video di kotak \"Link\" main duluan; video di sini menyusul urut dari atas ke bawah, lalu kembali ke video pertama." }));
      settings.appendChild(pkgField);
      box.appendChild(settings);

      function currentKind() {
        const b = built[activeKey];
        return b && b.getKind ? b.getKind() : "mp3";
      }
      function syncSettings() {
        const isYt = currentKind() === "yt";
        if (loopAllOption) { loopAllOption.hidden = !isYt; loopAllOption.disabled = !isYt; }
        if (!isYt && loopSelect.value === "all") loopSelect.value = "one"; // "paket" hanya YouTube
        pkgField.hidden = !(isYt && loopSelect.value === "all");
      }
      function syncPanels() {
        avail.forEach((d) => { built[d.key].el.hidden = d.key !== activeKey; });
        settings.hidden = activeKey === "continue" || activeKey === "none";
        syncSettings();
      }
      loopSelect.addEventListener("change", syncSettings);
      syncPanels();

      // ---- hasil ----
      const EMPTY = { url: "", label: "", kind: "mp3", source: "link", managed: false, autoplay: false, armStart: false, continuePrev: false, loopFile: false, loopAll: false, extraUrls: [], mediaId: "" };
      return () => {
        if (activeKey === "none") return EMPTY;
        if (activeKey === "continue") return Object.assign({}, EMPTY, { continuePrev: true, managed: true });
        const v = built[activeKey].getValue();
        if (v === false || v === undefined) return null; // ada masalah -- dialog tetap terbuka
        if (v.empty || !v.url) return EMPTY;
        const kind = v.kind || "mp3";
        const startMode = (startRadios.find((r) => r.checked) || {}).value || "manual";
        let loopMode = loopSelect.value;
        if (kind !== "yt" && loopMode === "all") loopMode = "one";
        let extraUrls = [];
        if (kind === "yt" && loopMode === "all") {
          const lines = pkgTextarea.value.split("\n").map((s) => s.trim()).filter(Boolean);
          for (let i = 0; i < lines.length; i++) {
            if (!extractYoutubeId(lines[i])) {
              alert(`Link video ke-${i + 2} di paket "Ulang Semua" tidak dikenali (baris ke-${i + 1} kotak paket):\n${lines[i]}\n\nPeriksa lagi linknya, lalu Simpan ulang.`);
              return null;
            }
          }
          extraUrls = lines;
        }
        return {
          url: v.url, kind,
          label: labelInput.value.trim() || v.label || "",
          source: v.source || "link", mediaId: v.mediaId || "",
          applyToGroup: !!v.applyToGroup, // hanya dipakai pemanggil (mis. "terapkan ke semua slide kidung ini"); TIDAK ikut disimpan
          managed: true,
          autoplay: startMode === "auto", armStart: startMode === "arrow", continuePrev: false,
          loopFile: loopMode === "one", loopAll: loopMode === "all", extraUrls,
        };
      };
    }, (val) => {
      const isEmpty = !val || (!val.url && !val.continuePrev);
      if (opts && typeof opts.onSave === "function") opts.onSave(isEmpty ? null : val);
    }, "Simpan");
  }

  // Jenis yang SUDAH bisa diputar Layar 2. Modul pemutar baru (mis. MIDI, tahap 4)
  // menambahkan jenisnya di sini; sumber "Dari kidung ini" menyembunyikan kolom yang jenisnya belum ada di daftar.
  const playableKinds = ["mp3", "mp4", "yt", "sc"];
  global.BgAudioDialog = { open, registerSource, linkKinds, playableKinds };
})(typeof window !== "undefined" ? window : globalThis);
