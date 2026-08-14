// Xuất / nhập toàn bộ tiến độ học.
//
// Mọi thứ app lưu đều nằm trong localStorage của MỘT trình duyệt: xoá cache,
// đổi máy hay đổi trình duyệt là mất hết. Đây là lớp sao lưu tối thiểu nhưng
// đủ dùng: một file JSON mang theo được.

import { readJSON, writeJSON } from "./storage";

export const APP_TAG = "jlpt-n5-learning";
export const BACKUP_VERSION = 1;

// Danh sách khoá app sở hữu. Thêm tính năng mới nhớ khai báo ở đây.
export const OWNED_KEYS = [
  "srs_state_v1", // tiến độ SRS mọi deck
  "progress_v1", // streak + hoạt động ngày + độ chính xác
  "exam_state_v1", // đáp án đang làm dở của từng đề
  "exam_history_v1", // lịch sử thi thử
  "notes_v1", // ghi chú cá nhân
  "custom_cards_v1", // thẻ tự tạo
  "settings_v1", // mục tiêu ngày, nhắc học…
  "tts_cfg_v1", // cấu hình giọng đọc
  "vocab_marked_ids", // từ đã đánh dấu
  "kanji_marked", // kanji đã đánh dấu
  "kanji_learned", // (cũ) kanji đánh dấu tay — giữ để không mất dữ liệu người dùng
  "kana:quiz:cfg", // cấu hình quiz kana
  "jlpt-active-tab",
];

/** Gói toàn bộ dữ liệu học thành một object có thể tải về. */
export function exportData() {
  const data = {};
  for (const key of OWNED_KEYS) {
    const val = readJSON(key, undefined);
    if (val !== undefined) data[key] = val;
    else {
      // Một số khoá lưu chuỗi thuần (không phải JSON) — vẫn mang theo.
      try {
        const raw = localStorage.getItem(key);
        if (raw != null) data[key] = raw;
      } catch {
        /* ignore */
      }
    }
  }
  return {
    app: APP_TAG,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

/** Tên file gợi ý khi tải về. */
export function backupFilename() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `jlpt-n5-tien-do-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.json`;
}

/** Tải file backup xuống máy. */
export function downloadBackup() {
  const blob = new Blob([JSON.stringify(exportData(), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = backupFilename();
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Nhập dữ liệu từ object đã parse.
 * mode: "replace" (ghi đè) | "merge" (gộp — giữ tiến độ cao hơn).
 * Trả về { ok, keys, error }.
 */
export function importData(payload, mode = "replace") {
  if (!payload || typeof payload !== "object" || !payload.data) {
    return { ok: false, error: "File không đúng định dạng sao lưu của app." };
  }
  if (payload.app && payload.app !== APP_TAG) {
    return { ok: false, error: `File thuộc app khác (${payload.app}).` };
  }

  const keys = [];
  for (const [key, value] of Object.entries(payload.data)) {
    if (!OWNED_KEYS.includes(key)) continue; // chỉ nhận khoá đã biết
    try {
      if (mode === "merge") {
        writeJSON(key, mergeValue(key, readJSON(key, undefined), value));
      } else if (typeof value === "string") {
        localStorage.setItem(key, value);
      } else {
        writeJSON(key, value);
      }
      keys.push(key);
    } catch {
      /* bỏ qua khoá lỗi, không làm hỏng cả lần nhập */
    }
  }
  return { ok: true, keys };
}

/** Gộp hai giá trị của cùng một khoá — ưu tiên tiến độ cao hơn / dữ liệu nhiều hơn. */
function mergeValue(key, current, incoming) {
  if (current == null) return incoming;
  if (incoming == null) return current;

  if (key === "srs_state_v1") {
    const out = { ...current };
    for (const [deck, bag] of Object.entries(incoming)) {
      out[deck] = { ...(out[deck] || {}) };
      for (const [id, card] of Object.entries(bag)) {
        const mine = out[deck][id];
        // Thẻ nào có nhiều lượt ôn hơn thì giữ (coi như mới hơn).
        if (!mine || (card.reps || 0) > (mine.reps || 0)) out[deck][id] = card;
      }
    }
    return out;
  }

  if (key === "progress_v1") {
    const out = { daily: { ...(current.daily || {}) }, acc: { ...(current.acc || {}) }, best: 0 };
    for (const [d, n] of Object.entries(incoming.daily || {})) {
      out.daily[d] = Math.max(out.daily[d] || 0, n);
    }
    for (const [d, a] of Object.entries(incoming.acc || {})) {
      const mine = out.acc[d] || { ok: 0, no: 0 };
      out.acc[d] = { ok: Math.max(mine.ok, a.ok || 0), no: Math.max(mine.no, a.no || 0) };
    }
    out.best = Math.max(current.best || 0, incoming.best || 0);
    return out;
  }

  // Mảng id (đánh dấu) → hợp
  if (Array.isArray(current) && Array.isArray(incoming)) {
    const seen = new Set();
    return [...current, ...incoming].filter((x) => {
      const k = typeof x === "object" ? x?.id : x;
      if (k == null || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  if (typeof current === "object" && typeof incoming === "object") {
    return { ...current, ...incoming };
  }
  return incoming;
}

/** Đọc file người dùng chọn rồi nhập. */
export function importFromFile(file, mode = "replace") {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(importData(JSON.parse(String(reader.result)), mode));
      } catch (e) {
        resolve({ ok: false, error: `Không đọc được JSON: ${String(e.message || e)}` });
      }
    };
    reader.onerror = () => resolve({ ok: false, error: "Không đọc được file." });
    reader.readAsText(file);
  });
}

/** Xoá sạch dữ liệu app (giữ nguyên các khoá không thuộc app). */
export function wipeAll() {
  for (const key of OWNED_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}
