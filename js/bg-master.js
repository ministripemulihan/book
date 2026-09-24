// ============================================================
// 🌄 LATAR MASTER (gambar & video) -- modul "Game Offline" (kontrak:
// window.PSCore & window.GameOffline di js/presentation-studio.js).
// Model "papan tombol" seperti Efek Suara: tiap latar = 1 kotak.
//
// LAYER di Layar 2 (present.html), dari paling BELAKANG ke depan:
//   1. #bgMaster  <- latar master dari daftar di bawah (file ini)
//   2. #camBg / #imgBg <- Kamera / Gambar Latar UPLOAD user (yang
//      sudah ada) -- otomatis di DEPAN latar master
//   3. teks ayat/kidung/pengumuman (#stage)
//
// CARA MENAMBAH LATAR BARU: taruh file di assets/backgrounds/, lalu
// tambah 1 baris di BG_MASTER_LIST. Selesai -- tidak ada file lain.
//   { id (unik), label, kind:"image"|"video", src, thumb }
// Payload ke Layar 2: { type:"bgmaster", on, kind, url }
// ============================================================
(function () {
  const BG_MASTER_LIST = [
    { id: "alam_3", label: "Takhta di Awan", kind: "image", src: "assets/backgrounds/alam_3.jpg", thumb: "assets/backgrounds/alam_3-thumb.jpg" },
    { id: "alam_1", label: "Alam (Video)", kind: "video", src: "assets/backgrounds/alam_1.mp4", thumb: "assets/backgrounds/alam_1-thumb.jpg" },
  ];
  window.BG_MASTER_LIST = BG_MASTER_LIST;
  const KEY = "bgMasterSelected";
  let selected = null;

  function send() {
    const it = BG_MASTER_LIST.find((x) => x.id === selected);
    window.PSCore.rawPost({ type: "bgmaster", on: !!it, kind: it ? it.kind : null, url: it ? it.src : null });
  }

  function render() {
    const box = document.getElementById("psBgMasterGrid");
    if (!box) return;
    box.innerHTML = "";
    const mk = (id, label, thumb, badge) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip-btn small";
      b.style.cssText = "display:flex;flex-direction:column;gap:4px;align-items:center;padding:6px;width:104px;" +
        (selected === id ? "outline:2px solid #4caf50;" : "");
      b.innerHTML = (thumb
        ? '<img src="' + thumb + '" style="width:92px;height:52px;object-fit:cover;border-radius:6px;" alt="">'
        : '<div style="width:92px;height:52px;display:flex;align-items:center;justify-content:center;font-size:22px;">⛔</div>') +
        '<span style="font-size:11px;line-height:1.2;">' + (badge || "") + label + "</span>";
      b.addEventListener("click", () => {
        selected = (id === selected || id === null) ? null : id;
        try { selected ? localStorage.setItem(KEY, selected) : localStorage.removeItem(KEY); } catch (e) {}
        render(); send();
      });
      return b;
    };
    box.appendChild(mk(null, "Tanpa latar", null, ""));
    BG_MASTER_LIST.forEach((it) => box.appendChild(mk(it.id, it.label, it.thumb, it.kind === "video" ? "🎬 " : "🖼️ ")));
  }

  function wireTab() {
    try { selected = localStorage.getItem(KEY) || null; } catch (e) {}
    if (!BG_MASTER_LIST.some((x) => x.id === selected)) selected = null;
    render();
  }
  function handleMessage(data) {
    // Layar 2 baru dibuka/dimuat ulang -> kirim ulang latar yang sedang dipilih
    if (data && data.source === "bibleAppPresenter" && data.type === "present_ready" && selected) send();
  }
  window.GameOffline.register({ id: "bg-master", label: "🌄 Latar Master", wireTab, handleMessage });
})();
