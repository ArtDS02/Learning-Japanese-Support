// Ghi nhớ tiến độ một phiên học đang dở (StudyRunner): mở lại là học tiếp chỗ cũ
// chứ không phải lật lại từ thẻ đầu.
//
// Chỉ lưu ID thẻ đã chấm + điểm phiên, KHÔNG lưu nội dung thẻ — payload nhỏ, ghi
// một lần mỗi lượt chấm nên không nặng hơn cú ghi SRS vẫn đang chạy cùng lúc.
//
//   { "<sessionKey>": { graded: ["vocab:12", …], missed: [...], stats: {...}, at } }
//
// Khoá phiên = số thẻ + hash của TẬP id (đã sắp, nên không phụ thuộc thứ tự): phiên
// dựng lại từ cùng một bộ thẻ vẫn nhận ra nhau dù SRS đã đổi thứ tự ưu tiên.

import { readJSON, writeJSON } from "./storage";

const KEY = "run_progress_v1";
const TTL_MS = 2 * 24 * 60 * 60 * 1000; // quá 2 ngày thì học lại từ đầu hợp lý hơn
const MAX_SESSIONS = 6;

export const cardKey = (item) => `${item.deck || "-"}:${item.id}`;

/** FNV-1a trên tập id đã sắp — một lượt duyệt, gọi một lần cho mỗi phiên. */
export function sessionKey(items) {
  const ids = items.map(cardKey).sort();
  let h = 2166136261;
  for (const s of ids) {
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  }
  return `${items.length}.${(h >>> 0).toString(36)}`;
}

// Giữ một bản trong bộ nhớ để không parse lại JSON sau mỗi lượt chấm. Tab khác ghi
// thì bản này cũ — chấp nhận được, tiến độ phiên không phải nguồn sự thật (SRS mới là).
let cache = null;

function readAll() {
  if (cache == null) {
    const raw = readJSON(KEY, {});
    cache = raw && typeof raw === "object" ? raw : {};
  }
  return cache;
}

function writeAll(all) {
  cache = all;
  writeJSON(KEY, all);
}

export function loadRun(key) {
  const row = readAll()[key];
  if (!row || Date.now() - (row.at || 0) > TTL_MS) return null;
  return row;
}

export function saveRun(key, { graded, missed, stats }) {
  const all = { ...readAll(), [key]: { graded, missed, stats, at: Date.now() } };
  // Dọn bản hết hạn & bản cũ nhất: mỗi bộ lọc người dùng từng học là một khoá riêng.
  const live = Object.keys(all)
    .filter((k) => Date.now() - (all[k].at || 0) <= TTL_MS)
    .sort((a, b) => (all[b].at || 0) - (all[a].at || 0))
    .slice(0, MAX_SESSIONS);
  writeAll(Object.fromEntries(live.map((k) => [k, all[k]])));
}

export function clearRun(key) {
  const all = readAll();
  if (!(key in all)) return;
  const next = { ...all };
  delete next[key];
  writeAll(next);
}
