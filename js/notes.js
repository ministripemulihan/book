// ============================================================
//  CATATAN PRIBADI PER AYAT
// ============================================================
//  Setiap pengguna bisa menulis catatan sendiri pada ayat mana pun
//  (muncul saat ayat itu diklik). Tersimpan lokal secara instan, dan
//  disinkronkan ke Google Sheet (lewat js/sync.js) di latar belakang
//  supaya bisa dibuka dari perangkat lain juga.
// ============================================================
function notesStorageKey(username) {
  return "bible_notes_v1_" + (username || "guest");
}

function loadLocalNotes(username) {
  try {
    const raw = localStorage.getItem(notesStorageKey(username));
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveLocalNotes(username, notesObj) {
  localStorage.setItem(notesStorageKey(username), JSON.stringify(notesObj));
}

function getPersonalNote(username, verseId) {
  const notes = loadLocalNotes(username);
  return notes[verseId] ? notes[verseId].note : "";
}

// Menyimpan catatan pribadi: langsung ke lokal (instan), lalu kirim ke
// Google Sheet di latar belakang (best-effort, tidak memblokir UI).
function setPersonalNote(username, verseId, noteText) {
  const notes = loadLocalNotes(username);
  const trimmed = (noteText || "").trim();
  const updatedAt = new Date().toISOString();
  if (trimmed) {
    notes[verseId] = { note: trimmed, updatedAt };
  } else {
    delete notes[verseId];
  }
  saveLocalNotes(username, notes);
  if (typeof Sync !== "undefined") Sync.pushNote(username, verseId, trimmed);
}

// Menarik catatan dari Google Sheet dan menggabungkannya dengan data
// lokal (yang lebih baru / updatedAt terbaru yang menang), dipanggil
// sekali secara diam-diam setelah login / setiap kali app dibuka.
async function refreshNotesFromRemote(username) {
  if (typeof Sync === "undefined" || !Sync.enabled()) return;
  const remote = await Sync.pullNotes(username);
  if (!remote || Object.keys(remote).length === 0) return;
  const local = loadLocalNotes(username);
  Object.keys(remote).forEach((verseId) => {
    const r = remote[verseId];
    const l = local[verseId];
    if (!l || new Date(r.updatedAt) > new Date(l.updatedAt)) {
      local[verseId] = { note: r.note, updatedAt: r.updatedAt };
    }
  });
  saveLocalNotes(username, local);
}
