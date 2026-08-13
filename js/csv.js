// ============================================================
//  PARSER CSV  — mendeteksi otomatis pemisah kolom (koma/titik koma/tab)
//  dan menangani nilai yang dibungkus tanda kutip (bisa berisi koma/baris baru)
// ============================================================
function detectDelimiter(sampleLine) {
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = -1;
  candidates.forEach((d) => {
    const count = sampleLine.split(d).length;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  });
  return best;
}

function parseCSV(text) {
  // normalisasi akhir baris
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const firstLineEnd = text.indexOf("\n");
  const firstLine = firstLineEnd === -1 ? text : text.slice(0, firstLineEnd);
  const delimiter = detectDelimiter(firstLine);

  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === delimiter) {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
    }
  }
  // baris terakhir
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // buang baris kosong di akhir
  while (rows.length && rows[rows.length - 1].every((v) => v.trim() === "")) {
    rows.pop();
  }

  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const records = [];
  for (let r = 1; r < rows.length; r++) {
    const rowArr = rows[r];
    if (rowArr.every((v) => v.trim() === "")) continue;
    const obj = {};
    header.forEach((h, idx) => {
      obj[h] = (rowArr[idx] || "").trim();
    });
    records.push(obj);
  }
  return records;
}

// Membersihkan markup teknis yang kadang terselip di teks sumber
// (mis. nomor Strong {H430}, {(G5590)}, atau penanda catatan kaki <FR><sup>..</sup><Fr>)
// supaya ayat tampil bersih untuk dibaca.
function cleanVerseText(t) {
  if (!t) return t;
  return t
    .replace(/<FR>\s*<sup>[^<]*<\/sup>\s*<Fr>/gi, "")
    .replace(/<\/?(FR|Fr|sup)>/gi, "")
    .replace(/\{\(?[HG]\d+\)?\}/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

// Mengubah baris CSV mentah menjadi objek ayat yang rapi.
// Mendukung variasi nama kolom: "verse id"/"verse_id", "book name", dst.
// Mendukung banyak bahasa sekaligus lewat kolom "Bahasa" (mis. ind, kjv, eng, chs, jawa, rvind, rveng, chssmp).
function normalizeVerseRecord(rec) {
  const get = (...keys) => {
    for (const k of keys) {
      if (rec[k] !== undefined) return rec[k];
    }
    return "";
  };
  const lang = (get("bahasa", "language", "lang") || "ind").trim();
  const verseId = get("verse id", "verse_id", "verseid", "id");
  return {
    id: lang + "_" + verseId, // kunci unik: bahasa + verse id (verse id bisa berulang antar bahasa)
    lang,
    verseId,
    bookName: get("book name", "book_name", "bookname"),
    bookNumber: parseInt(get("book number", "book_number", "booknumber"), 10) || 0,
    chapter: parseInt(get("chapter", "pasal"), 10) || 0,
    verse: parseInt(get("verse", "ayat"), 10) || 0,
    text: cleanVerseText(get("text", "teks", "isi")),
    note: cleanVerseText(get("note", "catatan")),
  };
}

// Mengubah baris CSV dari Google Sheet PENGGUNA (username/password) menjadi objek akun.
function normalizeUserRecord(rec) {
  const get = (...keys) => {
    for (const k of keys) {
      if (rec[k] !== undefined) return rec[k];
    }
    return "";
  };
  const rawUsername = (get("username", "user", "nama pengguna", "pengguna") || "").trim();
  return {
    username: rawUsername.toLowerCase(), // kunci pencocokan tidak peka huruf besar/kecil
    displayName: (get("nama", "name", "display name", "nama tampilan") || rawUsername).trim(),
    password: get("password", "sandi", "kata sandi"),
  };
}
