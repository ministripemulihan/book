// ============================================================
//  SUMBER AUDIO "🎼 Dari kidung ini" (BARU 20 Sep 2026, tahap 2)
//  Mendaftar ke dialog lewat BgAudioDialog.registerSource(). Dimuat
//  SETELAH js/bg-audio-dialog.js, sebelum presentation-studio.js.
//
//  Membaca link yang SUDAH ada di Sheet Kidung (lihat js/kidung.js):
//    linkMp3_1, linkMp3_2, linkYoutube, linkSoundcloud (kolom Sheet
//    "link_soundcloud", opsional), linkMidi, linkVideo (MP4).
//  Datanya diberikan pemanggil lewat opts.kidungMeta (objek dari
//  getKidungList()); tidak ada akses database di berkas ini.
//  opts.groupCount = jumlah slide kidung yang SAMA di Kumpulan ini
//  (untuk kotak "Terapkan ke semua slide kidung ini").
//
//  Kolom yang jenisnya belum bisa diputar (MIDI sebelum tahap 4)
//  otomatis disembunyikan lewat BgAudioDialog.playableKinds.
// ============================================================
(function (global) {
  "use strict";

  const OPTIONS = [
    { id: "mp3_1", field: "linkMp3_1", label: "🎵 MP3 / audio 1", kind: "mp3" },
    { id: "mp3_2", field: "linkMp3_2", label: "🎵 MP3 / audio 2", kind: "mp3" },
    { id: "yt", field: "linkYoutube", label: "📺 YouTube", kind: "yt" },
    { id: "sc", field: "linkSoundcloud", label: "🎧 SoundCloud", kind: "sc" },
    { id: "midi", field: "linkMidi", label: "🎹 MIDI", kind: "midi" },
    { id: "video", field: "linkVideo", label: "🎬 Video (hanya suaranya)", kind: "mp4" },
  ];

  function optionsFor(meta, guessKind, playable) {
    if (!meta) return [];
    const out = [];
    OPTIONS.forEach((o) => {
      const url = String(meta[o.field] || "").trim();
      if (!url) return;
      let kind = o.kind;
      // Kolom "MP3/audio" kadang berisi link YouTube/SoundCloud/MIDI: ikuti bentuk linknya.
      if ((kind === "mp3" || kind === "mp4") && typeof guessKind === "function") {
        const g = guessKind(url);
        if (g && g !== "mp3") kind = g;
      }
      if (playable && playable.indexOf(kind) < 0) return; // jenis ini belum bisa diputar
      out.push({ id: o.id, label: o.label, url, kind });
    });
    return out;
  }

  function shorten(u) { return u.length > 60 ? u.slice(0, 57) + "…" : u; }

  global.BgAudioDialog && global.BgAudioDialog.registerSource({
    key: "kidung",
    label: "🎼 Dari kidung ini",
    order: 20,
    isAvailable(ctx) {
      const playable = global.BgAudioDialog.playableKinds;
      return optionsFor(ctx.kidungMeta, ctx.guessKind, playable).length > 0;
    },
    build(ctx) {
      const playable = global.BgAudioDialog.playableKinds;
      const opts = optionsFor(ctx.kidungMeta, ctx.guessKind, playable);
      const el = document.createElement("div");
      const hint = document.createElement("p");
      hint.className = "simple-dialog-hint";
      const meta = ctx.kidungMeta || {};
      hint.textContent = `Pilih audio yang sudah tercatat untuk kidung ini di Sheet${meta.judul ? ` (${meta.buku || "Kidung"} ${meta.noKidung || ""} — ${meta.judul})` : ""}.`;
      el.appendChild(hint);

      const name = "psBgKidungPick_" + ctx.index;
      const ex = ctx.existing;
      let selected = opts.findIndex((o) => ex && ex.url === o.url);
      if (selected < 0) selected = 0;
      const radios = opts.map((o, i) => {
        const row = document.createElement("label");
        row.style.cssText = "display:flex; align-items:flex-start; gap:6px; margin:4px 0; cursor:pointer;";
        const r = document.createElement("input");
        r.type = "radio"; r.name = name; r.value = o.id; r.checked = i === selected;
        r.addEventListener("change", () => ctx.onKindChange());
        const txt = document.createElement("span");
        txt.innerHTML = "<strong></strong><br><small style='opacity:.7; word-break:break-all;'></small>";
        txt.querySelector("strong").textContent = o.label;
        txt.querySelector("small").textContent = shorten(o.url);
        row.appendChild(r); row.appendChild(txt);
        el.appendChild(row);
        return r;
      });

      const groupCount = Number(ctx.opts && ctx.opts.groupCount) || 1;
      let groupCb = null;
      if (groupCount > 1) {
        const gl = document.createElement("label");
        gl.style.cssText = "display:flex; align-items:center; gap:6px; margin-top:8px; cursor:pointer;";
        groupCb = document.createElement("input");
        groupCb.type = "checkbox";
        groupCb.checked = true;
        gl.appendChild(groupCb);
        gl.appendChild(document.createTextNode(` Terapkan juga ke semua ${groupCount} slide kidung ini di Kumpulan (lagu sama, tidak putus antar bait)`));
        el.appendChild(gl);
      }

      const current = () => { const i = radios.findIndex((r) => r.checked); return opts[i >= 0 ? i : 0]; };
      return {
        el,
        getKind: () => current().kind,
        getValue() {
          const o = current();
          if (!o) return { empty: true };
          return { url: o.url, kind: o.kind, label: (meta.judul ? meta.judul + " · " : "") + o.label.replace(/^\S+\s/, ""), source: "kidung", applyToGroup: !!(groupCb && groupCb.checked) };
        },
      };
    },
  });
})(typeof window !== "undefined" ? window : globalThis);
