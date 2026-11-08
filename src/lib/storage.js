// Safe localStorage helpers — never throw, work in private mode / SSR.
//
// MỌI lần ghi dữ liệu học phải đi qua writeJSON / writeRaw / removeKey ở đây:
// lớp đồng bộ tài khoản (lib/cloud) nghe các lần ghi này để biết khoá nào cần
// đẩy lên. Gọi localStorage.setItem trực tiếp là thay đổi đó sẽ không bao giờ
// sang được máy khác.

const writeListeners = new Set();

/**
 * Đăng ký nhận thông báo mỗi khi app ghi / xoá một khoá. Trả về hàm huỷ.
 * File này cố ý không import gì của Firebase: người không đăng nhập không phải
 * tải thêm byte nào.
 */
export function onLocalWrite(fn) {
  writeListeners.add(fn);
  return () => writeListeners.delete(fn);
}

function emit(key) {
  writeListeners.forEach((fn) => {
    try {
      fn(key);
    } catch {
      /* lỗi ở lớp đồng bộ không được làm hỏng thao tác học */
    }
  });
}

export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** Ghi chuỗi thô. Không đổi gì so với giá trị đang có thì bỏ qua (không báo). */
export function writeRaw(key, str) {
  try {
    if (localStorage.getItem(key) === str) return;
    localStorage.setItem(key, str);
  } catch {
    return; /* quota or unavailable — ignore */
  }
  emit(key);
}

export function writeJSON(key, value) {
  let str;
  try {
    str = JSON.stringify(value);
  } catch {
    return;
  }
  // Nhiều chỗ ghi lại nguyên giá trị cũ (effect chạy lúc mount…). Bỏ qua để lớp
  // đồng bộ không tưởng là "vừa sửa" rồi đè mất thay đổi từ máy khác.
  writeRaw(key, str);
}

export function removeKey(key) {
  try {
    if (localStorage.getItem(key) == null) return;
    localStorage.removeItem(key);
  } catch {
    return;
  }
  emit(key);
}

// Local-date key "YYYY-MM-DD" (not UTC, so streaks match the user's day).
export function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Difference in whole days between two "YYYY-MM-DD" keys (a - b).
export function dayDiff(a, b) {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((da - db) / 86400000);
}
