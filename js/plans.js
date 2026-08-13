// ============================================================
//  RENCANA BACA — definisi paket, pembuatan jadwal, dan
//  penyimpanan progres per pengguna (lokal, tersimpan di perangkat)
// ============================================================

// Tambahkan/ubah paket rencana baca di sini kapan saja.
// scope: "ALL" (seluruh Alkitab), "PL" (Perjanjian Lama), "PB" (Perjanjian Baru)
const PLAN_DEFINITIONS = [
  { id: "full_1m", label: "Seluruh Alkitab dalam 1 bulan", scope: "ALL", days: 30 },
  { id: "nt_1m", label: "Perjanjian Baru dalam 1 bulan", scope: "PB", days: 30 },
  { id: "ot_2y", label: "Perjanjian Lama dalam 2 tahun", scope: "PL", days: 730 },
  { id: "nt_1y", label: "Perjanjian Baru dalam 1 tahun", scope: "PB", days: 365 },
];

function formatRange(bookNum, start, end) {
  const book = BOOKS.find((b) => b.num === bookNum);
  const name = book ? book.name : "";
  return start === end ? `${name} ${start}` : `${name} ${start}-${end}`;
}

// Mengubah daftar {bookNum, chapter} berurutan jadi teks ringkas,
// mis. "Kejadian 1-3; Mazmur 1"
function formatDayReading(items) {
  if (!items || items.length === 0) return "Tidak ada bacaan (hari istirahat)";
  const parts = [];
  let curBook = null, rangeStart = null, rangeEnd = null;
  items.forEach((it) => {
    if (curBook === it.bookNum && it.chapter === rangeEnd + 1) {
      rangeEnd = it.chapter;
    } else {
      if (curBook !== null) parts.push(formatRange(curBook, rangeStart, rangeEnd));
      curBook = it.bookNum;
      rangeStart = it.chapter;
      rangeEnd = it.chapter;
    }
  });
  if (curBook !== null) parts.push(formatRange(curBook, rangeStart, rangeEnd));
  return parts.join("; ");
}

// Membagi rata daftar pasal ke sejumlah hari (selisih paling banyak 1 pasal antar hari).
function distributeIntoDays(items, days) {
  const n = items.length;
  const schedule = [];
  for (let d = 0; d < days; d++) {
    const start = Math.floor((d * n) / days);
    const end = Math.floor(((d + 1) * n) / days);
    schedule.push(items.slice(start, end));
  }
  return schedule;
}

// ---------------- Penyimpanan progres per pengguna (localStorage) ----------------
// Progres rencana baca tersimpan LOKAL di perangkat ini, terikat ke username yang
// sedang login. Cocok untuk "baca kapan siapnya" karena tidak terikat tanggal —
// pengguna sendiri yang menandai hari mana yang sudah selesai.
function planStorageKey(username) {
  return "bible_plan_v1_" + (username || "guest");
}

function loadPlan(username) {
  try {
    const raw = localStorage.getItem(planStorageKey(username));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function savePlan(username, plan) {
  plan.updatedAt = new Date().toISOString();
  localStorage.setItem(planStorageKey(username), JSON.stringify(plan));
  if (typeof Sync !== "undefined") Sync.pushProgress(username, plan);
}

function clearPlan(username) {
  localStorage.removeItem(planStorageKey(username));
  if (typeof Sync !== "undefined") Sync.pushProgress(username, { planId: "", label: "", days: 0, startDate: "", schedule: [], completed: [] });
}

// Menarik progres rencana baca dari Google Sheet dan menggabungkannya
// dengan data lokal — yang paling baru (updatedAt) yang dipakai.
// Dipanggil diam-diam setelah login, dan setiap kali panel rencana dibuka.
async function refreshPlanFromRemote(username) {
  if (typeof Sync === "undefined" || !Sync.enabled()) return;
  const remote = await Sync.pullProgress(username);
  if (!remote || !remote.planId) return;
  const local = loadPlan(username);
  if (!local || !local.updatedAt || new Date(remote.updatedAt) > new Date(local.updatedAt)) {
    localStorage.setItem(planStorageKey(username), JSON.stringify(remote));
  }
}
