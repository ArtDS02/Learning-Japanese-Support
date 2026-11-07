// Thẻ tới hạn của những deck KHÔNG có sẵn trong lib/session.js: ngữ pháp, số đếm,
// nghe, từ bổ nghĩa, cùng các thẻ quiz riêng của từ vựng/kanji (gõ từ `type:…`,
// cách đọc kanji `read:…`).
//
// Trước đây phiên "Học hôm nay" chỉ trộn vocab/kanji/kana/câu sai, nên thẻ của
// các deck này tới hạn mà không bao giờ được nhắc — trong khi dự báo và thống kê
// vẫn đếm chúng, làm hai con số lệch nhau.
//
// Module này kéo theo quizgen (+ toàn bộ JSON ngữ pháp/số đếm) và modifiers.json,
// nên được trang chủ nạp ĐỘNG sau khi màn hình đầu đã vẽ — giống examStore.

import { QUIZ_SETS, buildQuiz } from "./quizgen";
import { modifierWords, modifierCard } from "./modifiers";
import { loadSrs, needsReview } from "./srs";
import { dayKey } from "./storage";

// Deck mà session.js đã tự dựng thẻ từ pool riêng.
const HANDLED_ELSEWHERE = new Set(["kana", "exam"]);

let index = null;

/** "deck:id" → câu hỏi đã sinh. Sinh một lần cho cả phiên làm việc. */
function quizIndex() {
  if (index) return index;
  index = new Map();
  for (const set of QUIZ_SETS) {
    // buildQuiz tự bắt lỗi sinh câu và trả [] — một bộ hỏng không làm hỏng phiên.
    for (const it of buildQuiz(set.id)) {
      const key = `${it.deck}:${it.id}`;
      if (!index.has(key)) index.set(key, { ...it, tab: it.tab || set.tab });
    }
  }
  return index;
}

/** Mọi thẻ tới hạn hôm nay thuộc các deck kể trên, đã dựng sẵn cho StudyRunner. */
export function extraDueCards() {
  const state = loadSrs();
  const today = dayKey();
  const out = [];
  let idx = null;
  let mods = null;

  for (const [deck, bag] of Object.entries(state)) {
    if (HANDLED_ELSEWHERE.has(deck)) continue;
    for (const [id, card] of Object.entries(bag || {})) {
      if (!needsReview(deck, card, today)) continue;

      if (deck === "modifiers") {
        mods ??= new Map(modifierWords().map((w) => [String(w.id), w]));
        const w = mods.get(id);
        if (w) out.push(modifierCard(w));
        continue;
      }

      // Thẻ gốc của từ vựng/kanji (g1, k1…) do session.js dựng dạng flashcard;
      // ở đây chỉ lấy thẻ quiz có tiền tố riêng (type:g1, read:k1).
      if ((deck === "vocab" || deck === "kanji") && !/^[a-z]+:/.test(id)) continue;

      idx ??= quizIndex();
      const item = idx.get(`${deck}:${id}`);
      if (item) out.push(item);
    }
  }
  return out;
}
