// ============================================================
//  SUMBER AUDIO "📁 Dari upload" (BARU 20 Sep 2026, tahap 3)
//  Mendaftar ke dialog lewat BgAudioDialog.registerSource(). Dimuat
//  SETELAH js/bg-audio-library.js & js/bg-audio-dialog.js.
//
//  Menampilkan berkas audio yang sudah pernah diunggah di perangkat ini
//  (pustaka: js/bg-audio-library.js), tombol "⬆ Unggah audio baru", dan
//  tombol hapus. Pilihan disimpan sebagai:
//     { url: "upload:<id>", kind: "mp3" | "midi", source: "upload", mediaId: <id> }
//  Nama pengguna diberikan pemanggil lewat opts.username (Studio).
// ============================================================
(function (global) {
  "use strict";
  if (!global.BgAudioDialog) return;

  global.BgAudioDialog.registerSource({
    key: "upload",
    label: "📁 Dari upload",
    order: 30,
    isAvailable() { return !!global.BgAudioLibrary; },
    build(ctx) {
      const Lib = global.BgAudioLibrary;
      const username = ctx.opts && ctx.opts.username;
      const ex = ctx.existing;
      const el = document.createElement("div");

      const hint = document.createElement("p");
      hint.className = "simple-dialog-hint";
      hint.textContent = `Berkas disimpan di PERANGKAT INI saja (tidak ikut tersinkron ke perangkat lain). Batas ${Lib.fmtSize(Lib.MAX_BYTES)} per berkas.`;
      el.appendChild(hint);

      const listBox = document.createElement("div");
      listBox.style.cssText = "max-height:180px; overflow:auto; margin:6px 0;";
      listBox.textContent = "Memuat daftar…";
      el.appendChild(listBox);

      const note = document.createElement("div");
      note.style.cssText = "font-size:12px; margin:4px 0; min-height:1em;";
      el.appendChild(note);

      const pick = document.createElement("input");
      pick.type = "file";
      pick.accept = "audio/*,.mp3,.m4a,.aac,.ogg,.wav,.flac" + (global.BgAudioDialog.playableKinds.indexOf("midi") >= 0 ? ",.mid,.midi" : "");
      pick.style.display = "none";
      const upBtn = document.createElement("button");
      upBtn.type = "button";
      upBtn.className = "chip-btn small";
      upBtn.textContent = "⬆ Unggah audio baru";
      upBtn.addEventListener("click", () => pick.click());
      el.appendChild(upBtn);
      el.appendChild(pick);

      let entries = [];
      let selectedId = ex && ex.source === "upload" ? ex.mediaId : "";
      const radioName = "psBgUploadPick_" + ctx.index;

      function selectedEntry() { return entries.find((e) => e.id === selectedId) || null; }
      function setNote(msg, bad) { note.textContent = msg || ""; note.style.color = bad ? "#c0392b" : ""; }

      function render() {
        listBox.textContent = "";
        if (!entries.length) {
          listBox.textContent = "Belum ada berkas. Klik \"⬆ Unggah audio baru\".";
        }
        entries.forEach((e) => {
          const row = document.createElement("div");
          row.style.cssText = "display:flex; align-items:center; gap:6px; margin:3px 0;";
          const lab = document.createElement("label");
          lab.style.cssText = "display:flex; align-items:center; gap:6px; flex:1; cursor:pointer;";
          const r = document.createElement("input");
          r.type = "radio"; r.name = radioName; r.value = e.id; r.checked = e.id === selectedId;
          r.addEventListener("change", () => { selectedId = e.id; ctx.onKindChange(); });
          const txt = document.createElement("span");
          txt.textContent = `${e.kind === "midi" ? "🎹" : "🎵"} ${e.name} (${Lib.fmtSize(e.size)})`;
          lab.appendChild(r); lab.appendChild(txt);
          const del = document.createElement("button");
          del.type = "button"; del.className = "chip-btn small danger"; del.textContent = "🗑"; del.title = "Hapus berkas ini dari perangkat";
          del.addEventListener("click", async () => {
            if (!confirm(`Hapus "${e.name}" dari perangkat ini?\n\nSlide lain yang memakai berkas ini tidak akan berbunyi lagi sampai dipilihkan audio baru.`)) return;
            try { await Lib.remove(username, e.id); } catch (err) { setNote("Gagal menghapus: " + (err && err.message), true); return; }
            if (selectedId === e.id) selectedId = "";
            await refresh();
          });
          row.appendChild(lab); row.appendChild(del);
          listBox.appendChild(row);
        });
        if (ex && ex.source === "upload" && ex.mediaId && !entries.some((e) => e.id === ex.mediaId)) {
          setNote("⚠️ Berkas yang dipilih sebelumnya tidak ada di perangkat ini (diunggah dari perangkat lain / sudah dihapus). Pilih atau unggah berkas lagi.", true);
        }
      }

      async function refresh() {
        entries = await Lib.list(username);
        render();
        ctx.onKindChange();
      }

      pick.addEventListener("change", async () => {
        const f = pick.files && pick.files[0];
        pick.value = "";
        if (!f) return;
        setNote("⏳ Menyimpan " + f.name + "…");
        upBtn.disabled = true;
        try {
          const entry = await Lib.add(username, f, { allowMidi: global.BgAudioDialog.playableKinds.indexOf("midi") >= 0 });
          selectedId = entry.id;
          setNote("✅ Tersimpan: " + entry.name);
          await refresh();
        } catch (err) {
          setNote("⚠️ " + ((err && err.message) || err), true);
        } finally {
          upBtn.disabled = false;
        }
      });

      refresh();

      return {
        el,
        getKind() { const e = selectedEntry(); return e ? e.kind : "mp3"; },
        getValue() {
          const e = selectedEntry();
          if (!e) { alert("Pilih salah satu berkas, atau unggah berkas audio dulu."); return false; }
          return { url: Lib.uploadUrl(e.id), kind: e.kind, label: e.name, source: "upload", mediaId: e.id };
        },
      };
    },
  });
})(typeof window !== "undefined" ? window : globalThis);
