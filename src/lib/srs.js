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

// Mọi deck đang dùng trong app — Progress & phiên học trộn đọc từ danh sách này.
export const DECKS = [
  { id: "vocab", label: "Từ vựng", icon: "📖", color: "#22d3ee", tab: "vocabulary" },
  { id: "kanji", label: "Kanji", icon: "🈳", color: "#a78bfa", tab: "kanji" },
  { id: "kana", label: "Kana", icon: "🔤", color: "#34d399", tab: "kana" },
  { id: "grammar", label: "Ngữ pháp", icon: "⚙️", color: "#f472b6", tab: "grammar" },
  { id: "numbers", label: "Số đếm", icon: "🔢", color: "#facc15", tab: "numbers" },
  { id: "modifiers", label: "Từ bổ nghĩa", icon: "🎨", color: "#22d3ee", tab: "modifiers" },
  { id: "listening", label: "Nghe", icon: "🎧", color: "#f97316", tab: "listening" },
  { id: "exam", label: "Câu sai (đề thi)", icon: "📕", color: "#ff4757", tab: "exercises" },
];

export const deckMeta = (id) =>
  DECKS.find((d) => d.id === id) || { id, label: id, icon: "🗂", color: "#8b90a0" };

function emptyCard() {
  return { box: 0, due: null, reps: 0, lapses: 0, last: null };
}

// ── Cache ────────────────────────────────────────────────────────────────────
// ProgressTab gọi getStats() hàng chục lần trong một lần render (36 chủ đề từ
// vựng); parse lại JSON mỗi lần là lãng phí. Giữ một bản trong bộ nhớ và chỉ
// đọc lại localStorage khi state bị ghi (hoặc tab khác ghi).

let cache = null;
const listeners = new Set();

export function loadSrs() {
  if (cache == null) cache = readJSON(KEY, {});
  return cache;
}

function saveSrs(state) {
  cache = state;
  writeJSON(KEY, state);
  listeners.forEach((fn) => fn());
}

/**
 * Bỏ bản sao trong bộ nhớ — gọi sau khi localStorage bị ghi từ bên ngoài
 * (xoá toàn bộ, nhập file sao lưu). Không bỏ thì lượt ôn kế tiếp ghi đè dữ liệu
 * cũ trở lại.
 */
export function invalidateSrs() {
  cache = null;
  listeners.forEach((fn) => fn());
}

/** Đăng ký nhận thông báo khi SRS thay đổi. Trả về hàm hủy đăng ký. */
export function subscribeSrs(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

if (typeof window !== "undefined") {
  // Đồng bộ khi người dùng học ở tab khác của cùng trình duyệt.
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      cache = null;
      listeners.forEach((fn) => fn());
    }
  });
}

export function getCard(deck, id) {
  return loadSrs()[deck]?.[String(id)] ?? emptyCard();
}

function addDays(key, n) {
  const d = new Date(key + "T00:00:00");
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

// ── Giới hạn thẻ mới mỗi ngày ────────────────────────────────────────────────
// "Thẻ mới/ngày" phải đếm theo NGÀY, không theo phiên: trước đây học xong 10 thẻ
// mới, bấm bắt đầu lại là có thêm 10 thẻ nữa — phiên hôm nay không bao giờ xong.

const NEW_KEY = "daily_new_v1";
// Chỉ đếm những deck có thẻ mới trong phiên "Học hôm nay".
const NEW_TRACKED = new Set(["vocab", "kanji", "kana"]);

/** Số thẻ mới (box 0 → đã học) đã mở hôm nay. */
export function newIntroducedToday() {
  const rec = readJSON(NEW_KEY, null);
  return rec && rec.day === dayKey() ? rec.count || 0 : 0;
}

function bumpNewToday() {
  writeJSON(NEW_KEY, { day: dayKey(), count: newIntroducedToday() + 1 });
}

/**
 * Chấm một thẻ. rating: "forget" | "vague" | "remember".
 *
 * Luật chống "học dồn rồi coi như thuộc":
 *  · Thẻ chỉ LÊN BOX khi đã tới hạn, và tối đa một lần mỗi ngày. Ôn lại thẻ chưa
 *    tới hạn (học lại từ đầu, làm quiz trắc nghiệm cùng thẻ, thẻ sai được đưa lại
 *    cuối phiên) vẫn tính là luyện tập nhưng không đẩy lịch đi xa hơn.
 *  · Quên thì luôn rớt về box 1 — đó là tín hiệu thật. Nhưng quên nhiều lần
 *    trong CÙNG một ngày chỉ tính là một lần rớt.
 *  · Thẻ vừa quên hôm nay rồi nhớ lại ngay trong phiên → hẹn ôn lại ngày mai.
 */
export function rateCard(deck, id, rating) {
  const state = loadSrs();
  if (!state[deck]) state[deck] = {};
  const prev = state[deck][String(id)] ?? emptyCard();
  const today = dayKey();
  const isNew = !prev.box;
  const reviewedToday = prev.last === today;
  const dueNow = isNew || !prev.due || dayDiff(today, prev.due) >= 0;

  let box = prev.box || 0;
  let due = prev.due;
  let lapses = prev.lapses || 0;
  let lapseDay = prev.lapseDay || null;

  if (rating === "forget") {
    box = 1;
    due = today; // gặp lại ngay trong phiên
    if (lapseDay !== today) {
      lapses += 1;
      lapseDay = today;
    }
  } else if (rating === "vague") {
    box = Math.max(1, box); // giữ nguyên độ khó, vẫn tính là đang học
    due = addDays(today, 1);
  } else if (isNew) {
    box = 1;
    due = addDays(today, BOX_INTERVALS[1]);
  } else if (reviewedToday || !dueNow) {
    // Ôn sớm / ôn lần hai trong ngày: không lên box. Thẻ đang tới hạn ngay hôm
    // nay (vừa quên trong phiên) thì dời sang ngày mai thay vì để lặp mãi.
    if (dueNow) due = addDays(today, 1);
  } else {
    box = Math.min(MAX_BOX, box + 1);
    due = addDays(today, BOX_INTERVALS[box]);
  }

  const next = {
    box,
    due,
    reps: (prev.reps || 0) + 1,
    lapses,
    last: today,
  };
  if (lapseDay) next.lapseDay = lapseDay;

  if (isNew && NEW_TRACKED.has(deck)) bumpNewToday();
  state[deck][String(id)] = next;
  saveSrs(state);
  return next;
}

export function getStatus(card) {
  if (!card || !card.box) return "new";
  return card.box >= MASTERED_BOX ? "mastered" : "learning";
}

/**
 * Thẻ ĐÃ HỌC này có cần ôn hôm nay không. Thẻ "đã thuộc" vẫn phải ôn khi tới hạn
 * — bỏ qua chúng là người học quên dần mà app vẫn báo "đã thuộc". Riêng deck
 * "exam" (Sổ tay lỗi): đạt box thuộc nghĩa là câu đã RỜI sổ, không ôn nữa.
 */
export function needsReview(deck, card, today = dayKey()) {
  if (!card || !card.box) return false;
  if (deck === "exam" && card.box >= MASTERED_BOX) return false;
  return isDue(card, today);
}

export function isDue(card, today = dayKey()) {
  if (!card || !card.box) return true; // thẻ mới luôn sẵn sàng học
  if (!card.due) return true;
  return dayDiff(today, card.due) >= 0;
}

/**
 * Thống kê cho một danh sách id thuộc cùng deck.
 *
 *   due   = thẻ ĐÃ HỌC (đang học hoặc đã thuộc) và tới hạn ôn — không tính thẻ mới
 *   ready = due + thẻ mới, tức tổng số thẻ có thể học ngay
 *
 * Phân biệt hai con số này là cần thiết: nếu tính cả thẻ mới vào `due` thì người
 * học mới mở app sẽ thấy "580 thẻ tới hạn" — vừa sai nghĩa vừa gây choáng.
 */
export function getStats(deck, ids) {
  const bag = loadSrs()[deck] || {};
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
    if (needsReview(deck, card, today)) due += 1;
  }
  return { new: neu, learning, mastered, due, ready: due + neu, total: ids.length };
}

// Sắp xếp danh sách thẻ theo độ ưu tiên ôn tập (SRS mode):
// thẻ tới hạn & box thấp trước, rồi thẻ mới, rồi phần còn lại theo ngày đến hạn.
export function orderForStudy(items, deck, idOf) {
  const bag = loadSrs()[deck] || {};
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

// ── Bổ sung: chọn thẻ cho phiên học, phân tích, migrate, import ──────────────

/**
 * Lọc ra các thẻ đã học và đang tới hạn ôn — dùng cho phiên "Học hôm nay".
 * `items` là mảng bất kỳ, `idOf` lấy id của phần tử.
 */
export function dueItems(items, deck, idOf) {
  const bag = loadSrs()[deck] || {};
  const today = dayKey();
  return items.filter((it) => {
    // thẻ mới không tính là "tới hạn"
    return needsReview(deck, bag[String(idOf(it))], today);
  });
}

/** Các thẻ chưa từng học (box 0) — nguồn "từ mới" cho phiên học. */
export function newItems(items, deck, idOf) {
  const bag = loadSrs()[deck] || {};
  return items.filter((it) => !bag[String(idOf(it))]?.box);
}

/** Số thẻ tới hạn của một deck, tính trên toàn bộ thẻ đã có trong state. */
export function deckDueCount(deck) {
  const bag = loadSrs()[deck] || {};
  const today = dayKey();
  let n = 0;
  for (const card of Object.values(bag)) {
    if (needsReview(deck, card, today)) n += 1;
  }
  return n;
}

/** Tổng quan mọi deck: {deck: {learning, mastered, due, seen}} */
export function allDeckStats() {
  const state = loadSrs();
  const today = dayKey();
  const out = {};
  for (const { id } of DECKS) {
    const bag = state[id] || {};
    let learning = 0;
    let mastered = 0;
    let due = 0;
    for (const card of Object.values(bag)) {
      const st = getStatus(card);
      if (st === "mastered") mastered += 1;
      else learning += 1;
      if (needsReview(id, card, today)) due += 1;
    }
    out[id] = { learning, mastered, due, seen: Object.keys(bag).length };
  }
  return out;
}

/**
 * Dự báo số thẻ đến hạn trong `days` ngày tới (gồm cả hôm nay + phần quá hạn).
 * Giúp người học thấy trước ngày bị dồn thẻ.
 */
export function getForecast(days = 7) {
  const state = loadSrs();
  const today = dayKey();
  const buckets = Array.from({ length: days }, (_, i) => ({
    date: addDays(today, i),
    offset: i,
    count: 0,
  }));
  let overdue = 0;

  for (const { id } of DECKS) {
    for (const card of Object.values(state[id] || {})) {
      if (!card.box || (id === "exam" && card.box >= MASTERED_BOX)) continue;
      const diff = dayDiff(card.due || today, today); // >0 = còn n ngày nữa
      if (diff <= 0) {
        overdue += 1;
        buckets[0].count += 1;
      } else if (diff < days) {
        buckets[diff].count += 1;
      }
    }
  }
  return { buckets, overdue };
}

/**
 * Những thẻ hay quên nhất — sắp theo số lần rớt (`lapses`) rồi box thấp trước.
 * Trả về [{deck, id, card}] để phía UI tự tra nội dung.
 */
export function getHardest(limit = 20, minLapses = 1) {
  const state = loadSrs();
  const rows = [];
  for (const { id: deck } of DECKS) {
    for (const [id, card] of Object.entries(state[deck] || {})) {
      if ((card.lapses || 0) >= minLapses) rows.push({ deck, id, card });
    }
  }
  rows.sort(
    (a, b) => b.card.lapses - a.card.lapses || (a.card.box || 0) - (b.card.box || 0),
  );
  return rows.slice(0, limit);
}

/** Tổng số lượt ôn đã ghi trong SRS (dùng cho thống kê). */
export function totalReps() {
  const state = loadSrs();
  let n = 0;
  for (const { id } of DECKS) {
    for (const card of Object.values(state[id] || {})) n += card.reps || 0;
  }
  return n;
}

/**
 * Đưa một loạt id vào deck ở box chỉ định — chỉ áp dụng cho thẻ CHƯA có dữ liệu,
 * để không ghi đè tiến độ thật. Dùng khi migrate `kanji_learned` (đánh dấu tay)
 * sang SRS làm nguồn sự thật duy nhất.
 */
export function seedCards(deck, ids, box = MASTERED_BOX) {
  const state = loadSrs();
  if (!state[deck]) state[deck] = {};
  const today = dayKey();
  let added = 0;
  for (const raw of ids) {
    const id = String(raw);
    if (state[deck][id]?.box) continue;
    state[deck][id] = {
      box,
      due: addDays(today, BOX_INTERVALS[box] ?? 1),
      reps: 1,
      lapses: 0,
      last: today,
    };
    added += 1;
  }
  if (added) saveSrs(state);
  return added;
}

/** Ghi đè toàn bộ state (dùng khi nhập file backup). */
export function replaceState(state) {
  saveSrs(state && typeof state === "object" ? state : {});
}

export function srsStorageKey() {
  return KEY;
}
