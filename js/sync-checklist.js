// ============================================================
//  🔄 Sinkronkan ulang -- CHECKLIST (menu ⋮)
//  Menggantikan 3 tombol lama (Alkitab / daftar pengguna / Kidung Anak).
//  Saat dibuka: tiap bagian DICEK dulu (ada yang baru atau tidak), lalu
//  pengguna memilih bagian mana yang mau disinkronkan dan apakah jalan
//  "di belakang layar" (pil kecil di bawah, app tetap bisa dipakai) atau
//  dengan layar progres penuh.
//
//  Cara cek "ada yang baru":
//   - Daftar pengguna & Kidung Anak : CSV-nya kecil, diunduh sebentar lalu
//     dibandingkan sidik-jarinya (hash) dengan sinkron terakhir.
//   - Alkitab & Kidung : ukurannya besar, TIDAK bisa dicek tanpa mengunduh
//     ulang -- ditampilkan kapan terakhir sinkron saja. (Edit ayat oleh
//     administrator sudah masuk otomatis, tidak perlu sinkron ulang.)
// ============================================================
(function () {
  "use strict";

  function hashText_(t) {
    let h = 5381;
    for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
    return String(h) + ":" + t.length;
  }
  async function getMeta_(k) { try { return await LocalDB.getMeta(k); } catch (e) { return null; } }
  async function setMeta_(k, v) { try { await LocalDB.setMeta(k, v); } catch (e) { /* diabaikan */ } }

  function ago_(iso) {
    if (!iso) return "belum pernah";
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (d <= 0) return "hari ini";
    if (d === 1) return "kemarin";
    return d + " hari lalu";
  }

  async function fetchHash_(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return hashText_(await res.text());
  }

  // Definisi tiap baris checklist.
  function buildItems_(guest) {
    const items = [];
    items.push({
      key: "bible", label: "📖 Alkitab (semua bahasa + Pokok Kitab/Garis Besar/Peta)",
      check: async () => {
        const last = await getMeta_("lastSync");
        if (!last) return { state: "new", note: "Belum pernah diunduh" };
        return { state: "unknown", note: "Terakhir sinkron " + ago_(last) + ". Tidak bisa dicek otomatis (unduhan besar); teks Alkitab jarang berubah, edit ayat admin masuk otomatis." };
      },
    });
    if (typeof resyncKidungSheet === "function" && !guest) {
      items.push({
        key: "kidung", label: "🎵 Kidung (Kidung + Suplemen)",
        check: async () => {
          const last = await getMeta_("kidungLastSync");
          if (!last) return { state: "new", note: "Belum pernah diunduh" };
          const days = (Date.now() - new Date(last).getTime()) / 86400000;
          return { state: days > 14 ? "unknown-old" : "unknown", note: "Terakhir sinkron " + ago_(last) + ". Tidak dicek otomatis." };
        },
      });
    }
    if (window.KidungAnak && KidungAnak.sheetUrl && !guest) {
      items.push({
        key: "kidungAnak", label: "👶 Kidung Anak",
        check: async () => {
          const h = await fetchHash_(KidungAnak.sheetUrl);
          const prev = await getMeta_("kidungAnakHash");
          const last = await getMeta_("kidungAnakSyncedAt");
          const state = prev === h ? "same" : "new";
          return { state, hash: h, note: state === "same" ? "Sudah terbaru (sinkron " + ago_(last) + ")" : prev ? "Ada perubahan" : "Sinkron sekali untuk menandai versi saat ini" };
        },
        after: (r) => r && r.hash && setMeta_("kidungAnakHash", r.hash),
      });
    }
    if (!guest && typeof CONFIG !== "undefined" && CONFIG.USERS_SHEET_CSV_URL) {
      items.push({
        key: "users", label: "👥 Daftar pengguna (tipe premium & level)",
        check: async () => {
          const h = await fetchHash_(CONFIG.USERS_SHEET_CSV_URL);
          const prev = await getMeta_("userListHash");
          const last = await getMeta_("lastUserSync");
          const state = prev === h ? "same" : "new";
          return { state, hash: h, note: state === "same" ? "Sudah terbaru (sinkron " + ago_(last) + ")" : prev ? "Ada perubahan" : "Sinkron sekali untuk menandai versi saat ini" };
        },
        after: (r) => r && r.hash && setMeta_("userListHash", r.hash),
      });
    }
    if (typeof SoundFX !== "undefined" && SoundFX.LIST && SoundFX.LIST.some((i) => i.src)) {
      items.push({
        key: "sounds", label: "🔊 Efek Suara \"Efek Panggung\" (~1,1 MB, opsional)",
        check: async () => ({ state: "optional", note: "Opsional — untuk dipakai offline" }),
      });
    }
    return items;
  }

  const BADGE = {
    checking: ["⏳", "Memeriksa…"],
    new: ["🆕", ""],
    same: ["✅", ""],
    unknown: ["ℹ️", ""],
    "unknown-old": ["🕒", ""],
    optional: ["➕", ""],
    error: ["⚠️", ""],
  };

  async function runUsers_() {
    await syncUsersFromServer();
    if (currentUser) await resolveCurrentUserLevels(currentUser);
    updateStatusPanel();
    if (typeof _aiChatState !== "undefined") { _aiChatState.historySessions = null; _aiChatState.historyError = ""; }
    if (el("aiChatPanel") && !el("aiChatPanel").hidden && typeof renderAiChatPanel === "function") renderAiChatPanel();
  }

  async function open() {
    if (navigator.onLine === false) { alert("Tidak ada sambungan internet saat ini. Coba lagi setelah tersambung."); return; }
    const guest = typeof Guest !== "undefined" && Guest.isGuest();
    const items = buildItems_(guest);

    let overlay = document.getElementById("syncChecklistOverlay");
    if (overlay) overlay.remove();
    overlay = document.createElement("div");
    overlay.id = "syncChecklistOverlay";
    overlay.className = "announcement-big-overlay";
    const box = document.createElement("div");
    box.className = "announcement-big-box";
    overlay.appendChild(box);

    const title = document.createElement("div");
    title.className = "announcement-big-title";
    title.textContent = "🔄 Sinkronkan ulang";
    box.appendChild(title);
    const intro = document.createElement("div");
    intro.className = "announcement-big-text";
    intro.textContent = "Aplikasi memeriksa dulu mana yang ada pembaruan. Centang bagian yang mau disinkronkan.";
    box.appendChild(intro);

    const list = document.createElement("div");
    list.className = "more-menu-checkbox-list";
    box.appendChild(list);

    const rows = items.map((it) => {
      const row = document.createElement("label");
      row.className = "more-menu-checkbox-row";
      row.innerHTML = '<input type="checkbox" /> <span></span>';
      list.appendChild(row);
      const cb = row.querySelector("input");
      const span = row.querySelector("span");
      const render = (state, note) => {
        const b = BADGE[state] || BADGE.unknown;
        span.innerHTML = "";
        const strong = document.createElement("strong");
        strong.textContent = it.label;
        span.appendChild(strong);
        span.appendChild(document.createElement("br"));
        const small = document.createElement("small");
        small.textContent = b[0] + " " + (note || b[1]);
        span.appendChild(small);
      };
      render("checking");
      cb.disabled = true;
      return { it, cb, render, result: null };
    });

    const modeBox = document.createElement("div");
    modeBox.className = "dlpick-box";
    modeBox.innerHTML =
      '<div class="dlpick-title">Cara menjalankan:</div>' +
      '<label class="more-menu-checkbox-row"><input type="radio" name="syncMode" value="bg" checked /> <span>🕶️ <strong>Di belakang layar</strong> — app tetap bisa dipakai, progres di pil kecil di bawah</span></label>' +
      '<label class="more-menu-checkbox-row"><input type="radio" name="syncMode" value="fg" /> <span>📺 <strong>Tampilkan layar progres</strong> — tunggu sampai selesai</span></label>';
    box.appendChild(modeBox);

    const btnRow = document.createElement("div");
    btnRow.className = "round-media-row";
    btnRow.style.marginTop = "12px";
    const cancel = document.createElement("button");
    cancel.className = "chip-btn small";
    cancel.textContent = "Batal";
    cancel.addEventListener("click", () => overlay.remove());
    const go = document.createElement("button");
    go.className = "chip-btn primary";
    go.disabled = true;
    go.textContent = "Memeriksa…";
    btnRow.appendChild(cancel);
    btnRow.appendChild(go);
    box.appendChild(btnRow);
    document.body.appendChild(overlay);

    function refreshGo_() {
      const n = rows.filter((r) => r.cb.checked).length;
      go.disabled = n === 0;
      go.textContent = n === 0 ? "Belum ada yang dipilih" : "🔄 Sinkronkan (" + n + " bagian)";
    }
    rows.forEach((r) => r.cb.addEventListener("change", refreshGo_));

    // Cek semua bagian secara paralel.
    await Promise.all(rows.map(async (r) => {
      try {
        r.result = await r.it.check();
        r.render(r.result.state, r.result.note);
        r.cb.checked = r.result.state === "new" || r.result.state === "unknown-old";
      } catch (e) {
        r.result = { state: "error" };
        r.render("error", "Gagal memeriksa (" + (e.message || e) + ") — tetap bisa disinkronkan manual");
      }
      r.cb.disabled = false;
    }));
    refreshGo_();
    if (!rows.some((r) => r.cb.checked)) intro.textContent = "✅ Tidak terdeteksi pembaruan pada bagian yang bisa dicek. Kamu tetap bisa mencentang bagian mana pun untuk disinkronkan paksa.";

    go.addEventListener("click", async () => {
      const chosen = rows.filter((r) => r.cb.checked);
      const bg = overlay.querySelector('input[name="syncMode"]:checked').value === "bg";
      overlay.remove();
      const has = (k) => chosen.some((r) => r.it.key === k);
      const problems = [];
      const say = (t) => { if (bg) bgSyncPillShow_(t); };
      _bgSync = false;

      if (has("users")) {
        say("🔄 Menyinkronkan daftar pengguna…");
        try { await runUsers_(); await chosen.find((r) => r.it.key === "users").it.after(chosen.find((r) => r.it.key === "users").result); }
        catch (e) { problems.push("Daftar pengguna: " + e.message); }
      }
      if (has("kidungAnak")) {
        say("🔄 Menyinkronkan Kidung Anak…");
        try {
          const r = await KidungAnak.resyncQuiet();
          if (r && r.ok) { const c = chosen.find((x) => x.it.key === "kidungAnak"); await c.it.after(c.result); }
          else problems.push("Kidung Anak: " + (r && r.error && r.error.message ? r.error.message : (r && r.error) || "gagal"));
        } catch (e) { problems.push("Kidung Anak: " + e.message); }
      }
      if (problems.length) {
        if (bg) bgSyncPillShow_("⚠️ " + problems.join(" | "), 8000); else alert("Sebagian gagal disinkronkan:\n- " + problems.join("\n- "));
      } else if (bg && !has("bible") && !has("kidung") && !has("sounds")) {
        bgSyncPillShow_("✅ Sinkron selesai", 3500);
      }

      if (has("bible") || has("kidung") || has("sounds")) {
        await syncFromServer(!bibleData.length, {
          bible: has("bible"), kidung: has("kidung"), sounds: has("sounds"),
        }, { background: bg });
      } else if (!bg && !problems.length) {
        alert("Sinkron selesai.");
      }
    });
  }

  function wire_() {
    const btn = document.getElementById("syncAllBtn");
    if (!btn || btn.dataset.scWired) return;
    btn.dataset.scWired = "1";
    btn.addEventListener("click", () => {
      const m = document.getElementById("moreMenu");
      if (m) m.hidden = true;
      open();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire_); else wire_();
  window.SyncChecklist = { open };
})();
