// Di trú dữ liệu người dùng khi mô hình tiến độ thay đổi.
// Chạy một lần lúc app khởi động (xem main.jsx).

import { readJSON, writeJSON } from "./storage";
import { seedCards, MASTERED_BOX } from "./srs";

const FLAG_KEY = "migrations_done_v1";

function done() {
  return readJSON(FLAG_KEY, {});
}

function mark(name) {
  writeJSON(FLAG_KEY, { ...done(), [name]: new Date().toISOString() });
}

/**
 * Kanji trước đây có HAI nguồn sự thật: set `kanji_learned` do người dùng bấm
 * tay, và box SRS. Hai cái có thể mâu thuẫn ("kanji này đã học chưa?").
 * Nay SRS là nguồn duy nhất ⇒ chuyển mọi kanji từng được đánh dấu "đã học"
 * thành thẻ ở box "đã thuộc", để người dùng hiện tại KHÔNG thấy tiến độ bị reset.
 */
function migrateKanjiLearned() {
  const name = "kanji_learned_to_srs";
  if (done()[name]) return 0;
  const ids = readJSON("kanji_learned", []);
  const n = Array.isArray(ids) && ids.length ? seedCards("kanji", ids, MASTERED_BOX) : 0;
  mark(name);
  return n;
}

/** Gọi một lần khi app khởi động. Trả về mô tả những gì đã di trú. */
export function runMigrations() {
  const out = {};
  try {
    const kanji = migrateKanjiLearned();
    if (kanji) out.kanjiLearned = kanji;
  } catch {
    /* di trú lỗi thì bỏ qua, không được làm app không mở được */
  }
  return out;
}
