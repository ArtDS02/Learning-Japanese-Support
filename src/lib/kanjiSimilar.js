// Tìm kanji "trông giống nhau" để luyện phân biệt (休/体, 大/犬/太, 住/注/主).
//
// Chỉ dùng dữ liệu có sẵn trong kanji.json: `radical` (bộ thủ + vị trí) và
// `components` (thành phần, trích từ KanjiVG). Không có dữ liệu hình dạng nét
// nên KHÔNG đoán được các cặp giống nhau mà không chung thành phần (日/目) —
// chấp nhận bỏ sót còn hơn ghép bừa hai chữ chẳng liên quan.
//
// Điểm giống nhau giữa hai chữ:
//   + 1    mỗi thành phần chung (kể cả thành phần của thành phần: 体 = 亻+本,
//          本 chứa 木 ⇒ 体 cũng "chứa" 木, nên 休/体 chung cả 亻 lẫn 木)
//   + 0.5  nếu thành phần đó là bộ thủ của cả hai, cùng vị trí
//   + 0.5  nếu thành phần đó nằm cùng vị trí trong cả hai chữ (trái/phải/trên…)
//   + 0.5  nếu một chữ chính là thành phần của chữ kia (大 trong 犬, 白 trong 百)
//   + 0.5 / 0.25  nếu số nét chênh ≤ 1 / ≤ 2
// Hai chữ chênh quá MAX_STROKE_DIFF nét thì coi như không giống (一 nằm trong
// rất nhiều chữ, nhưng 一 và 画 không ai nhầm).

import kanjiData from "../data/kanji.json";

export const MIN_SCORE = 2;
const MAX_STROKE_DIFF = 4;

const pool = kanjiData.kanji;
const byChar = new Map(pool.map((k) => [k.char, k]));
const byId = new Map(pool.map((k) => [String(k.id), k]));

/** Thành phần trực tiếp: char → vị trí (null nếu dữ liệu không ghi). */
function directParts(k) {
  const out = new Map();
  (k.components || []).forEach((c) => out.set(c.char, c.position || null));
  if (k.radical?.char && k.radical.char !== k.char) {
    if (!out.has(k.radical.char)) out.set(k.radical.char, k.radical.position || null);
  }
  return out;
}

/** Thành phần trực tiếp + thành phần cấp 2 (không có vị trí) + chính chữ đó. */
function allParts(k) {
  const out = new Map(directParts(k));
  for (const c of directParts(k).keys()) {
    const sub = byChar.get(c);
    if (!sub) continue;
    for (const s of directParts(sub).keys()) if (!out.has(s)) out.set(s, null);
  }
  out.set(k.char, null);
  return out;
}

let partsCache = null;
const partsOf = (k) => {
  if (!partsCache) partsCache = new Map(pool.map((x) => [x.id, allParts(x)]));
  return partsCache.get(k.id);
};

export function similarityScore(a, b) {
  if (a.id === b.id) return 0;
  const strokeDiff = Math.abs((a.stroke || 0) - (b.stroke || 0));
  if (strokeDiff > MAX_STROKE_DIFF) return 0;
  const pa = partsOf(a);
  const pb = partsOf(b);
  let s = 0;
  for (const [c, pos] of pa) {
    if (!pb.has(c)) continue;
    let w = 1;
    const sameRadical =
      a.radical?.char === c && b.radical?.char === c && (a.radical.position || null) === (b.radical.position || null);
    if (sameRadical) w += 0.5;
    if (pos && pos === pb.get(c)) w += 0.5;
    if (c === a.char || c === b.char) w += 0.5;
    s += w;
  }
  if (s === 0) return 0;
  return s + (strokeDiff <= 1 ? 0.5 : strokeDiff <= 2 ? 0.25 : 0);
}

const simCache = new Map();

/**
 * n chữ giống `id` nhất, chỉ lấy chữ đạt MIN_SCORE (có thể ít hơn n, hoặc rỗng).
 * Trả về [{ kanji, score }], sắp giảm dần theo điểm.
 */
export function similarKanji(id, n = 3) {
  const key = String(id);
  if (!simCache.has(key)) {
    const k = byId.get(key);
    const list = k
      ? pool
          .map((o) => ({ kanji: o, score: similarityScore(k, o) }))
          .filter((x) => x.score >= MIN_SCORE)
          .sort((x, y) => y.score - x.score || x.kanji.stroke - y.kanji.stroke)
      : [];
    simCache.set(key, list);
  }
  return simCache.get(key).slice(0, n);
}
