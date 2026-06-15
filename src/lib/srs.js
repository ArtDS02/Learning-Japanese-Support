// Spaced-repetition (Leitner) engine, shared by every deck (vocab, kanji, ...).
// State lives in localStorage under one key, namespaced by deck.
//
//   { vocab: { "<id>": { box, due, reps, lapses, last } }, kanji: { ... } }
//
// box 0 = chưa học (new). box 1..5 = đang học → đã thuộc.

import { readJSON, writeJSON, dayKey, dayDiff } from "./storage";

const KEY = "srs_state_v1";

// Khoảng cách ôn lại (ngày) sau khi trả lời "Nhớ" ở mỗi box.
const BOX_INTERVALS = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 };
export const MAX_BOX = 5;
export const MASTERED_BOX = 4; // box >= 4 coi như "đã thuộc"

function emptyCard() {
  return { box: 0, due: null, reps: 0, lapses: 0, last: null };
}

export function loadSrs() {
  return readJSON(KEY, {});
}

function saveSrs(state) {
  writeJSON(KEY, state);
}

export function getCard(deck, id) {
  const state = loadSrs();
  return state[deck]?.[String(id)] ?? emptyCard();
}

function addDays(key, n) {
  const d = new Date(key + "T00:00:00");
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

// rating: "forget" | "vague" | "remember"
export function rateCard(deck, id, rating) {
  const state = loadSrs();
  if (!state[deck]) state[deck] = {};
  const prev = state[deck][String(id)] ?? emptyCard();
  const today = dayKey();

  let box = prev.box;
  let lapses = prev.lapses;

  if (rating === "remember") {
    box = Math.min(MAX_BOX, (box || 0) + 1);
  } else if (rating === "vague") {
    box = Math.max(1, box || 1); // giữ nguyên độ khó, vẫn tính là đang học
  } else {
    // forget — rớt về đầu
    box = 1;
    lapses += 1;
  }

  const interval = rating === "remember" ? BOX_INTERVALS[box] : rating === "vague" ? 1 : 0;

  const next = {
    box,
    due: addDays(today, interval),
    reps: prev.reps + 1,
    lapses,
    last: today,
  };

  state[deck][String(id)] = next;
  saveSrs(state);
  return next;
}

export function getStatus(card) {
  if (!card || !card.box) return "new";
  return card.box >= MASTERED_BOX ? "mastered" : "learning";
}

export function isDue(card, today = dayKey()) {
  if (!card || !card.box) return true; // thẻ mới luôn sẵn sàng học
  if (!card.due) return true;
  return dayDiff(today, card.due) >= 0;
}

// Thống kê cho một danh sách id thuộc cùng deck.
export function getStats(deck, ids) {
  const state = loadSrs();
  const bag = state[deck] || {};
  const today = dayKey();
  let neu = 0;
  let learning = 0;
  let mastered = 0;
  let due = 0;
  for (const id of ids) {
    const card = bag[String(id)];
    const status = getStatus(card);
    if (status === "new") neu += 1;
    else if (status === "mastered") mastered += 1;
    else learning += 1;
    if (status !== "mastered" && isDue(card, today)) due += 1;
  }
  return { new: neu, learning, mastered, due, total: ids.length };
}

// Sắp xếp danh sách thẻ theo độ ưu tiên ôn tập (SRS mode):
// thẻ tới hạn & box thấp trước, rồi thẻ mới, rồi phần còn lại theo ngày đến hạn.
export function orderForStudy(items, deck, idOf) {
  const state = loadSrs();
  const bag = state[deck] || {};
  const today = dayKey();

  const rank = (it) => {
    const card = bag[String(idOf(it))];
    if (!card || !card.box) return { tier: 1, key: 0 }; // mới
    const overdue = dayDiff(today, card.due || today);
    if (overdue >= 0) return { tier: 0, key: card.box * 1000 - overdue }; // tới hạn: box thấp + quá hạn lâu lên trước
    return { tier: 2, key: -overdue }; // chưa tới hạn
  };

  return [...items].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra.tier !== rb.tier) return ra.tier - rb.tier;
    return ra.key - rb.key;
  });
}

export function resetDeck(deck) {
  const state = loadSrs();
  delete state[deck];
  saveSrs(state);
}
