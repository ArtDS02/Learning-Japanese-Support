// Dữ liệu do chính người học tạo ra: ghi chú riêng, thẻ tự thêm, cài đặt.
//
//   notes_v1        { "vocab:g1": "cách nhớ của tôi…", "kanji:k1": "…" }
//   custom_cards_v1 [ { id, japanese, kanji, romaji, meaning, note, example } ]
//   settings_v1     { dailyGoal, reminderOn, reminderTime, autoSpeak, showFurigana }

import { readJSON, writeJSON } from "./storage";

const NOTES_KEY = "notes_v1";
const CARDS_KEY = "custom_cards_v1";
const SETTINGS_KEY = "settings_v1";

const listeners = new Set();
export function subscribeUserData(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const notify = () => listeners.forEach((fn) => fn());

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

/** Chuẩn hoá thẻ tự tạo về đúng shape của từ vựng để dùng chung mọi UI. */
export function customAsWords() {
  return loadCustomCards().map((c) => ({
    ...c,
    categoryId: "my-cards",
    categoryLabel: "Thẻ của tôi",
    categoryColor: "#f472b6",
    isCustom: true,
  }));
}

// ── Cài đặt ──────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  dailyGoal: 30, // số lượt ôn mục tiêu mỗi ngày
  newPerDay: 10, // số thẻ mới mỗi ngày trong phiên "Học hôm nay"
  reminderOn: false,
  reminderTime: "20:00",
  autoSpeak: false, // tự đọc khi lật thẻ
  showFurigana: true,
};

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
