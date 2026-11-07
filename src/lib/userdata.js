// Dữ liệu do chính người học tạo ra: ghi chú riêng, thẻ tự thêm, cài đặt.
//
//   notes_v1        { "vocab:g1": "cách nhớ của tôi…", "kanji:k1": "…" }
//   custom_cards_v1 [ { id, japanese, kanji, romaji, meaning, note, example } ]
//   settings_v1     { dailyGoal, newPerDay, reminderOn, reminderTime, autoSpeak,
//                     showFurigana, examDate, autoNewPerDay }

import { readJSON, writeJSON, dayKey, dayDiff } from "./storage";

const NOTES_KEY = "notes_v1";
const CARDS_KEY = "custom_cards_v1";
const SETTINGS_KEY = "settings_v1";

const listeners = new Set();
export function subscribeUserData(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
let customCache = null; // customAsWords() — giữ nguyên mảng giữa hai lần dữ liệu đổi
const notify = () => {
  customCache = null;
  listeners.forEach((fn) => fn());
};

if (typeof window !== "undefined") {
  // Ghi chú / thẻ tự tạo / cài đặt đổi ở tab khác → vẽ lại.
  window.addEventListener("storage", (e) => {
    if ([NOTES_KEY, CARDS_KEY, SETTINGS_KEY].includes(e.key)) notify();
  });
}

// ── Ghi chú cá nhân ──────────────────────────────────────────────────────────
// Mẹo nhớ do chính mình nghĩ ra là thứ nhớ lâu nhất — nên cho phép gắn vào
// bất kỳ thẻ nào (từ vựng, kanji, ngữ pháp…).

export const noteKey = (kind, id) => `${kind}:${id}`;

export function loadNotes() {
  return readJSON(NOTES_KEY, {});
}

export function getNote(kind, id) {
  return loadNotes()[noteKey(kind, id)] || "";
}

export function setNote(kind, id, text) {
  const all = loadNotes();
  const k = noteKey(kind, id);
  const val = String(text || "").trim();
  if (val) all[k] = val;
  else delete all[k];
  writeJSON(NOTES_KEY, all);
  notify();
  return val;
}

export function noteCount() {
  return Object.keys(loadNotes()).length;
}

/** Mọi ghi chú của một loại, kèm id — dùng để liệt kê trong Tiến độ. */
export function notesOf(kind) {
  const prefix = `${kind}:`;
  return Object.entries(loadNotes())
    .filter(([k]) => k.startsWith(prefix))
    .map(([k, text]) => ({ id: k.slice(prefix.length), text }));
}

// ── Thẻ tự tạo ───────────────────────────────────────────────────────────────
// Từ gặp ngoài app (anime, lớp học, công việc) cũng cần chỗ để học.
// Thẻ tự tạo dùng chung deck SRS "vocab" nên vào luôn phiên ôn hằng ngày.

export function loadCustomCards() {
  const list = readJSON(CARDS_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function addCustomCard(card) {
  const list = loadCustomCards();
  const id = `c${Date.now().toString(36)}${Math.floor(Math.random() * 1e3).toString(36)}`;
  const next = {
    id,
    japanese: String(card.japanese || "").trim(),
    kanji: String(card.kanji || "").trim(),
    romaji: String(card.romaji || "").trim(),
    meaning: String(card.meaning || "").trim(),
    note: String(card.note || "").trim(),
    example:
      card.exampleJp || card.exampleVn
        ? { jp: String(card.exampleJp || "").trim(), vn: String(card.exampleVn || "").trim() }
        : null,
    createdAt: Date.now(),
  };
  if (!next.japanese || !next.meaning) return null;
  list.push(next);
  writeJSON(CARDS_KEY, list);
  notify();
  return next;
}

export function updateCustomCard(id, patch) {
  const list = loadCustomCards().map((c) => (c.id === id ? { ...c, ...patch } : c));
  writeJSON(CARDS_KEY, list);
  notify();
}

export function removeCustomCard(id) {
  writeJSON(
    CARDS_KEY,
    loadCustomCards().filter((c) => c.id !== id),
  );
  notify();
}

/**
 * Chuẩn hoá thẻ tự tạo về đúng shape của từ vựng để dùng chung mọi UI.
 * Trả về CÙNG một mảng cho tới khi dữ liệu người dùng đổi — component dùng nó
 * làm dependency của useMemo mà không phải tự giữ biến "tick".
 */
export function customAsWords() {
  if (customCache) return customCache;
  customCache = loadCustomCards().map((c) => ({
    ...c,
    categoryId: "my-cards",
    categoryLabel: "Thẻ của tôi",
    categoryColor: "#f472b6",
    isCustom: true,
  }));
  return customCache;
}

// ── Cài đặt ──────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  dailyGoal: 30, // số lượt ôn mục tiêu mỗi ngày
  newPerDay: 10, // số thẻ mới mỗi ngày trong phiên "Học hôm nay"
  reminderOn: false,
  reminderTime: "20:00",
  autoSpeak: false, // tự đọc khi lật thẻ
  showFurigana: true,
  examDate: "", // "YYYY-MM-DD" — trống = chưa đặt ngày thi
  autoNewPerDay: false, // true = số thẻ mới/ngày tự tính theo ngày thi (lib/session.js examPlan)
};

/**
 * Hai mốc thi JLPT gần nhất (tính từ ngày mai): JLPT tổ chức vào Chủ nhật đầu
 * tiên của tháng 7 và tháng 12. Tính bằng code thay vì ghi cứng để không bao
 * giờ "hết hạn"; đây chỉ là gợi ý, người học vẫn tự chọn ngày khác được.
 */
export function suggestedExamDates(today = dayKey()) {
  const year = Number(today.slice(0, 4));
  const out = [];
  for (let y = year; y <= year + 1; y += 1) {
    for (const month of [6, 11]) {
      const d = new Date(y, month, 1);
      d.setDate(1 + ((7 - d.getDay()) % 7)); // getDay() 0 = Chủ nhật
      const key = dayKey(d);
      if (dayDiff(key, today) > 0) out.push(key);
    }
  }
  return out.slice(0, 2);
}

export function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...readJSON(SETTINGS_KEY, {}) };
}

export function saveSettings(patch) {
  const next = { ...loadSettings(), ...patch };
  writeJSON(SETTINGS_KEY, next);
  notify();
  return next;
}

export function userDataKeys() {
  return [NOTES_KEY, CARDS_KEY, SETTINGS_KEY];
}
