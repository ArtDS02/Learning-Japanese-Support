// Xuất / nhập toàn bộ tiến độ học.
//
// Mọi thứ app lưu đều nằm trong localStorage của MỘT trình duyệt: xoá cache,
// đổi máy hay đổi trình duyệt là mất hết. Đây là lớp sao lưu tối thiểu nhưng
// đủ dùng: một file JSON mang theo được.

import { readJSON, writeJSON, writeRaw, removeKey } from "./storage";
import { OWNED_KEYS, RAW_STRING_KEYS } from "./dataKeys";
import { mergeValue } from "./merge";

export { OWNED_KEYS, mergeValue };
import { invalidateSrs } from "./srs";
import { invalidateRuns } from "./runstate";

export const APP_TAG = "jlpt-n5-learning";
export const BACKUP_VERSION = 1;

/**
 * Các module giữ bản sao dữ liệu trong bộ nhớ (SRS, phiên học dở). Ghi thẳng
 * localStorage mà không bỏ bản sao này thì lượt ôn kế tiếp sẽ ghi ĐÈ dữ liệu
 * cũ trở lại — đúng lỗi "xoá rồi mà tiến độ sống lại".
 */
function dropCaches() {
  invalidateSrs();
  invalidateRuns();
}

/** Gói toàn bộ dữ liệu học thành một object có thể tải về. */
export function exportData() {
  const data = {};
  for (const key of OWNED_KEYS) {
    let raw = null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      /* ignore */
    }
    if (raw == null) continue;
    if (RAW_STRING_KEYS.has(key)) {
      data[key] = raw;
      continue;
    }
    const val = readJSON(key, undefined);
    // Một số khoá lưu chuỗi thuần (không phải JSON) — vẫn mang theo.
    data[key] = val !== undefined ? val : raw;
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

/** Kiểm tra sơ bộ một object đã parse có phải file sao lưu của app không. */
export function validateBackup(payload) {
  if (!payload || typeof payload !== "object" || !payload.data || typeof payload.data !== "object") {
    return "File không đúng định dạng sao lưu của app.";
  }
  if (payload.app && payload.app !== APP_TAG) return `File thuộc app khác (${payload.app}).`;
  return null;
}

/**
 * Nhập dữ liệu từ object đã parse.
 * mode: "replace" (ghi đè) | "merge" (gộp — giữ tiến độ cao hơn).
 * Trả về { ok, keys, error }.
 */
export function importData(payload, mode = "replace") {
  const error = validateBackup(payload);
  if (error) return { ok: false, error };

  const keys = [];
  for (const [key, value] of Object.entries(payload.data)) {
    if (!OWNED_KEYS.includes(key)) continue; // chỉ nhận khoá đã biết
    try {
      const next =
        mode === "merge" && !RAW_STRING_KEYS.has(key)
          ? mergeValue(key, readJSON(key, undefined), value)
          : value;
      if (typeof next === "string" && RAW_STRING_KEYS.has(key)) writeRaw(key, next);
      else writeJSON(key, next);
      keys.push(key);
    } catch {
      /* bỏ qua khoá lỗi, không làm hỏng cả lần nhập */
    }
  }
  dropCaches();
  return { ok: true, keys };
}

/** Đọc file người dùng chọn → object đã parse (chưa nhập). */
export function readBackupFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result));
        const error = validateBackup(payload);
        resolve(error ? { ok: false, error } : { ok: true, payload });
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
    // Giữ cờ di trú: không có lý do gì để chạy lại di trú trên dữ liệu đã xoá.
    if (key === "migrations_done_v1") continue;
    removeKey(key);
  }
  dropCaches();
}
