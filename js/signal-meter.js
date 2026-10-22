// ============================================================
//  📶 INDIKATOR SINYAL 4 GARIS (book184) -- seperti ikon sinyal HP/Wi‑Fi.
//  Tujuan: operator bisa melihat APAKAH lambatnya video YouTube di Pustaka
//  Media karena koneksi (garis sedikit/merah) atau memang bukan (garis penuh
//  tapi video belum muncul). Cara kerja: mengukur waktu jawab server YouTube
//  (permintaan kecil "generate_204", tanpa unduhan besar) + membaca info
//  jaringan HP (navigator.connection) bila ada.
//    4 garis  < 0,4 dtk  Sangat baik     2 garis  < 2 dtk   Lambat
//    3 garis  < 0,9 dtk  Baik            1 garis  < 8 dtk   Sangat lambat
//    0 garis  gagal/terblokir (garis merah)
//  Juga: watchIframe() menghitung berapa detik video sudah "memuat" dan
//  menyarankan "Buka di YouTube" kalau terlalu lama.
//  Mandiri: hanya menambah elemen kecil; tidak mengubah isi Alkitab/Kidung.
// ============================================================
const SignalMeter = (function () {
  "use strict";
  const PING_URL = "https://www.youtube.com/generate_204";
  const LABELS = ["Tidak ada koneksi / diblokir", "Sangat lambat", "Lambat", "Baik", "Sangat baik"];
  const state = { level: -1, ms: null, last: 0, busy: false, listeners: [] };
  let timer = null;

  function ensureStyle() {
    if (document.getElementById("smStyle")) return;
    const st = document.createElement("style");
    st.id = "smStyle";
    st.textContent = `
.sm-wrap{display:inline-flex;align-items:flex-end;gap:2px;height:18px;padding:0 4px;cursor:pointer;vertical-align:middle;background:none;border:0}
.sm-bar{width:4px;border-radius:1px;background:#c9ced6;transition:background .3s}
.sm-bar:nth-child(1){height:5px}.sm-bar:nth-child(2){height:9px}.sm-bar:nth-child(3){height:13px}.sm-bar:nth-child(4){height:17px}
.sm-lv4 .sm-bar,.sm-lv3 .sm-bar:nth-child(-n+3){background:#1fa85a}
.sm-lv3 .sm-bar:nth-child(-n+3){background:#7bbf2a}
.sm-lv2 .sm-bar:nth-child(-n+2){background:#f0a500}
.sm-lv1 .sm-bar:nth-child(1){background:#e03e3e}
.sm-lv0 .sm-bar{background:#e03e3e;opacity:.45}
.sm-wrap.sm-busy .sm-bar{animation:smPulse 1s ease-in-out infinite alternate}
@keyframes smPulse{from{opacity:.4}to{opacity:1}}
.sm-pop{position:fixed;z-index:2147483100;background:#fff;color:#222;border:1px solid #bbb;border-radius:10px;padding:8px 12px;font:13px/1.4 system-ui,sans-serif;box-shadow:0 4px 16px #0005;max-width:min(86vw,300px)}
.ml-load-stat{font:13px/1.35 system-ui,sans-serif;padding:4px 10px;color:#555}
.ml-load-stat.sm-slow{color:#b35c00;font-weight:600}
`;
    document.head.appendChild(st);
  }

  function netInfo() {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return c ? { type: c.effectiveType || "", downlink: c.downlink, rtt: c.rtt, saveData: !!c.saveData } : null;
  }
  function levelFor(ms, ok) {
    if (!ok) return 0;
    let lv = ms < 400 ? 4 : ms < 900 ? 3 : ms < 2000 ? 2 : 1;
    const n = netInfo();
    if (n) {
      if (n.type === "slow-2g" || n.type === "2g") lv = Math.min(lv, 1);
      else if (n.type === "3g") lv = Math.min(lv, 2);
    }
    return lv;
  }
  async function measure() {
    if (state.busy) return state;
    state.busy = true; notify();
    const t0 = performance.now();
    let ok = false;
    try {
      const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
      const to = setTimeout(() => { if (ctl) ctl.abort(); }, 8000);
      await fetch(PING_URL + "?t=" + Date.now(), { mode: "no-cors", cache: "no-store", signal: ctl ? ctl.signal : undefined });
      clearTimeout(to);
      ok = true;
    } catch (e) { ok = false; }
    state.ms = Math.round(performance.now() - t0);
    state.level = levelFor(state.ms, ok);
    state.last = Date.now();
    state.busy = false;
    notify();
    return state;
  }
  function notify() { state.listeners.slice().forEach((f) => { try { f(state); } catch (e) { /* abaikan */ } }); }
  function detail() {
    if (state.level < 0) return "Belum diukur.";
    const n = netInfo();
    let t = "Sinyal ke YouTube: " + LABELS[state.level] + (state.level ? " (" + state.ms + " ms)" : "");
    if (n && n.type) t += " · jaringan " + n.type + (n.downlink ? ", ±" + n.downlink + " Mbps" : "") + (n.saveData ? " · mode hemat data aktif" : "");
    return t;
  }

  // Pasang 4 garis di `container`. Mengukur sekarang & tiap 20 dtk selama elemen terpasang.
  function mount(container) {
    if (!container) return null;
    ensureStyle();
    let el = container.querySelector(".sm-wrap");
    if (!el) {
      el = document.createElement("button");
      el.type = "button";
      el.className = "sm-wrap sm-lv-1";
      el.innerHTML = '<span class="sm-bar"></span><span class="sm-bar"></span><span class="sm-bar"></span><span class="sm-bar"></span>';
      container.appendChild(el);
      el.addEventListener("click", async (ev) => {
        ev.stopPropagation();
        await measure();
        showPop(el);
      });
      const paint = () => {
        el.className = "sm-wrap" + (state.level >= 0 ? " sm-lv" + state.level : "") + (state.busy ? " sm-busy" : "");
        el.title = detail();
        el.setAttribute("aria-label", detail());
      };
      state.listeners.push(paint);
      paint();
    }
    start();
    return el;
  }
  function showPop(anchor) {
    document.querySelectorAll(".sm-pop").forEach((p) => p.remove());
    const pop = document.createElement("div");
    pop.className = "sm-pop";
    const slow = state.level <= 2;
    pop.textContent = detail() + (slow ? " — koneksi sedang lambat, video bisa lama muncul. Coba pindah ke Wi‑Fi/sinyal lebih kuat, atau tekan ▶ Buka di YouTube." : " — koneksi bagus. Kalau video tetap lama, penyebabnya kemungkinan di sisi YouTube/HP, bukan jaringan.");
    (document.fullscreenElement || document.body).appendChild(pop);
    const r = anchor.getBoundingClientRect();
    pop.style.top = Math.min(window.innerHeight - pop.offsetHeight - 8, r.bottom + 6) + "px";
    pop.style.left = Math.max(8, Math.min(window.innerWidth - pop.offsetWidth - 8, r.left - pop.offsetWidth + r.width)) + "px";
    setTimeout(() => pop.remove(), 7000);
    document.addEventListener("click", () => pop.remove(), { once: true });
  }
  function start() {
    if (timer) return;
    if (Date.now() - state.last > 8000) measure();
    timer = setInterval(() => {
      if (document.hidden) return;
      if (!document.querySelector(".sm-wrap")) { clearInterval(timer); timer = null; return; }
      measure();
    }, 20000);
  }

  // Pantau iframe pemutar: tampilkan detik memuat; sarankan buka di YouTube bila lama.
  function watchIframe(iframe, statusEl, opts) {
    if (!iframe || !statusEl) return function () {};
    ensureStyle();
    const o = opts || {};
    const t0 = Date.now();
    let done = false;
    statusEl.hidden = false;
    statusEl.className = "ml-load-stat";
    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(iv);
      statusEl.className = "ml-load-stat";
      statusEl.textContent = "✅ Pemutar siap dalam " + Math.round((Date.now() - t0) / 1000) + " dtk.";
      setTimeout(() => { if (statusEl.textContent.indexOf("✅") === 0) statusEl.hidden = true; }, 4000);
    };
    iframe.addEventListener("load", finish, { once: true });
    const iv = setInterval(() => {
      if (!iframe.isConnected) { done = true; clearInterval(iv); statusEl.hidden = true; return; }
      const s = Math.round((Date.now() - t0) / 1000);
      let t = "⏳ Memuat video… " + s + " dtk";
      if (s >= 12) {
        statusEl.classList.add("sm-slow");
        const net = state.level >= 0 ? (state.level <= 2 ? " Sinyal ke YouTube: " + LABELS[state.level] + "." : " Sinyal ke YouTube bagus, jadi lambatnya bukan dari jaringan.") : "";
        t += " — lama." + net + " Bisa tekan ▶ Buka di YouTube.";
      }
      statusEl.textContent = t;
    }, 1000);
    statusEl.textContent = "⏳ Memuat video… 0 dtk";
    return function stop() { done = true; clearInterval(iv); };
  }

  // Otomatis pasang di header Pustaka Media saat dibuka.
  function autoMountMediaLibrary() {
    const ov = document.getElementById("mediaLibraryOverlay");
    const slot = document.getElementById("mlSignalSlot");
    if (!ov || !slot) return;
    const sync = () => { if (!ov.hidden) mount(slot); };
    sync();
    try { new MutationObserver(sync).observe(ov, { attributes: true, attributeFilter: ["hidden"] }); } catch (e) { /* abaikan */ }
  }

  return { mount, measure, watchIframe, detail, state, autoMountMediaLibrary };
})();
if (typeof window !== "undefined") {
  window.SignalMeter = SignalMeter;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => SignalMeter.autoMountMediaLibrary());
  else SignalMeter.autoMountMediaLibrary();
}
