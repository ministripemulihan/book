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

// ============================================================
//  PARSER CSV BERTAHAP (chunked / non-blocking)
// ============================================================
//  Sama seperti parseCSV() di atas, tapi dipakai khusus untuk file
//  CSV yang SANGAT BESAR (ratusan ribu baris, puluhan MB — seperti
//  data Alkitab lengkap dengan banyak bahasa).
//
//  Masalah pada parseCSV() biasa: fungsi itu berjalan SEKALIGUS tanpa
//  jeda dari awal sampai akhir. Untuk file kecil ini tidak masalah,
//  tapi untuk file besar, browser "membeku" total selama proses itu
//  berjalan (tidak bisa update tampilan/progress bar sama sekali,
//  bahkan kadang tab jadi "Not Responding" atau crash di HP dengan
//  RAM terbatas).
//
//  parseCSVChunked() memproses file sedikit demi sedikit (per
//  `batchSize` baris), lalu setiap kali satu kelompok baris selesai:
//    1) memanggil onBatch(batchRows) — supaya baris itu bisa langsung
//       diproses/disimpan sementara batch berikutnya belum diproses
//    2) memberi jeda sesaat ke browser (setTimeout 0ms) supaya bisa
//       menggambar ulang layar & progress bar, sebelum lanjut ke
//       kelompok baris berikutnya.
//  Hasilnya: proses total mungkin makan waktu yang mirip, TAPI
//  browser tetap responsif dan progress bar benar-benar akurat,
//  bukan diam lama lalu tiba-tiba lompat.
// ============================================================
async function parseCSVChunked(text, { batchSize = 3000, onBatch, onProgress } = {}) {
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const totalLen = text.length;
  const firstLineEnd = text.indexOf("\n");
  const firstLine = firstLineEnd === -1 ? text : text.slice(0, firstLineEnd);
  const delimiter = detectDelimiter(firstLine);

  let i = 0;
  let field = "";
  let row = [];
  let inQuotes = false;
  let header = null;
  let batch = [];
  let totalRows = 0;

  function finishField() {
    row.push(field);
    field = "";
  }
  function finishRow() {
    finishField();
    if (header === null) {
      header = row.map((h) => h.trim().toLowerCase());
    } else if (!row.every((v) => v.trim() === "")) {
      const obj = {};
      header.forEach((h, idx) => {
        obj[h] = (row[idx] || "").trim();
      });
      batch.push(obj);
      totalRows++;
    }
    row = [];
  }

  while (i < totalLen) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i += 2;
      } else if (c === '"') {
        inQuotes = false;
        i++;
      } else {
        field += c;
        i++;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
        i++;
      } else if (c === delimiter) {
        finishField();
        i++;
      } else if (c === "\n") {
        finishRow();
        i++;
        if (batch.length >= batchSize) {
          if (onProgress) onProgress(i, totalLen);
          if (onBatch) await onBatch(batch);
          batch = [];
          // jeda sesaat: beri kesempatan browser menggambar ulang UI & bernapas
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        continue;
      } else {
        field += c;
        i++;
      }
    }
  }
  // baris terakhir (kalau file tidak diakhiri baris baru)
  if (field.length > 0 || row.length > 0) finishRow();
  if (batch.length > 0) {
    if (onProgress) onProgress(totalLen, totalLen);
    if (onBatch) await onBatch(batch);
  }
  return totalRows;
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
// Selain Username/Password/Nama/Level, sheet ini (mengikuti contoh "Login
// awal" yang dikirim) boleh punya kolom tambahan seputar rencana baca &
// data jemaat -- disimpan apa adanya di `extra` (tidak dipakai wajib oleh
// aplikasi, tapi tersedia untuk fitur berikutnya tanpa perlu ubah csv.js
// lagi): Plan, Start_Date, Last_Read_Day, Bahasa, Language, No Efata ID,
// Saudara/i, Digembalakan, PB_Aktif, PB_Tanggal_Mulai, PB_Bahasa,
// PB_History, PL_Aktif, PL_Tanggal_Mulai, PL_Bahasa, PL_History.
//
// Kolom "Tipe" (BARU): dipakai untuk membedakan pengguna "premium" dari
// pengguna biasa -- SENGAJA ditambahkan sebagai kolom BARU di Sheet
// Pengguna yang SAMA (bukan Sheet terpisah), supaya status premium tidak
// tersebar di 2 tempat berbeda. Isi kolom ini dengan "premium" untuk
// pengguna yang boleh melihat Riwayat AI Chat (lihat js/aichat.js dan
// apps-script/AiChatCode.gs); kosong / nilai lain = pengguna biasa.
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
    // .trim() (BARU) -- CSV publikasi Google Sheets kadang menyisipkan
    // spasi/​whitespace tak terlihat di sekitar nilai sel; tanpa trim ini,
    // login bisa gagal "password salah" padahal terlihat sama persis di
    // Sheet maupun yang diketik pengguna.
    password: (get("password", "sandi", "kata sandi") || "").trim(),
    levels: parseLevelsField(get("level", "levels", "jenjang", "jabatan")),
    userType: parseUserTypeField(get("tipe", "tipe user", "tipe pengguna", "type", "user type", "membership", "paket")),
    // Kolom BARU "Approved"/"TanggalDaftar" -- dipakai fitur "Daftar Akun
    // Baru" + persetujuan administrator (lihat js/signup.js). Kosong /
    // kolom belum ada sama sekali = dianggap approved=true (akun LAMA
    // sebelum fitur ini ada TIDAK terkunci) -- lihat parseApprovedField().
    approved: parseApprovedField(get("approved", "disetujui", "status approval")),
    signupDate: (get("tanggaldaftar", "tanggal daftar", "signupdate", "createdat", "created_at") || "").trim(),
    extra: {
      plan: get("plan"),
      startDate: get("start_date", "start date", "tanggal mulai"),
      lastReadDay: get("last_read_day", "last read day", "pembacaan terakhir"),
      bahasa: get("bahasa"),
      language: get("language"),
      efataId: get("no efata id", "efata id", "no_efata_id"),
      saudara: get("saudara/i", "saudara", "saudara i"),
      digembalakan: get("digembalakan"),
      pbAktif: get("pb_aktif", "pb aktif"),
      pbTanggalMulai: get("pb_tanggal_mulai", "pb tanggal mulai"),
      pbBahasa: get("pb_bahasa", "pb bahasa"),
      pbHistory: get("pb_history", "pb history"),
      plAktif: get("pl_aktif", "pl aktif"),
      plTanggalMulai: get("pl_tanggal_mulai", "pl tanggal mulai"),
      plBahasa: get("pl_bahasa", "pl bahasa"),
      plHistory: get("pl_history", "pl history"),
    },
  };
}

// Mengubah isi kolom "Tipe" jadi "premium" atau "" (biasa). Longgar terhadap
// variasi tulisan (huruf besar/kecil, spasi berlebih, mis. "Premium",
// " PREMIUM ") -- nilai lain (kosong, "biasa", "reguler", dst.) semuanya
// dianggap pengguna biasa (bukan error, cukup dianggap tidak premium).
function parseUserTypeField(raw) {
  const v = (raw || "").trim().toLowerCase();
  return v === "premium" ? "premium" : "";
}

// Kolom "Approved" (BARU) -- kosong = akun lama sebelum kolom ini ada,
// tetap dianggap disetujui (true) supaya tidak ada yang tiba-tiba
// terkunci gara-gara pembaruan ini. Hanya isi eksplisit "FALSE"/"belum"/
// "pending"/"tidak"/"0"/"no" yang dianggap BELUM disetujui -- ini yang
// ditulis otomatis oleh signupUser_() di apps-script/Code.gs saat ada
// pendaftaran baru lewat menu "📝 Daftar Akun Baru".
function parseApprovedField(raw) {
  const v = String(raw || "").trim().toLowerCase();
  if (!v) return true;
  return !["false", "belum", "pending", "tidak", "0", "no"].includes(v);
}

// Mengubah isi kolom "Level" (boleh lebih dari satu, dipisah koma / titik
// koma / garis miring / " dan ") menjadi larik key level yang baku (sesuai
// CONFIG.LEVEL_DEFINITIONS). Nilai yang tidak dikenali diabaikan (jangan
// sampai typo di sheet membuat orang salah dapat hak akses). Kosong -> [].
function parseLevelsField(raw) {
  const text = (raw || "").trim();
  if (!text) return [];
  const defs = (typeof CONFIG !== "undefined" && CONFIG.LEVEL_DEFINITIONS) || [];
  const parts = text
    .split(/[,;/]|(?:\bdan\b)/i)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  const out = [];
  parts.forEach((p) => {
    const norm = p.replace(/\s+/g, " ");
    const match = defs.find((d) => d.key === norm || d.label.toLowerCase() === norm);
    if (match && !out.includes(match.key)) out.push(match.key);
  });
  return out;
}
