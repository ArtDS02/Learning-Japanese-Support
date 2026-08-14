// Hoạt động học theo ngày + chuỗi ngày liên tiếp (streak).
//
//   {
//     daily: { "YYYY-MM-DD": <số lượt ôn> },
//     acc:   { "YYYY-MM-DD": { ok, no } },   // độ chính xác theo ngày
//     best:  <streak dài nhất>
//   }
//
// `acc` được thêm sau; dữ liệu cũ (chỉ có `daily`) vẫn đọc được bình thường.

import { readJSON, writeJSON, dayKey, dayDiff } from "./storage";

const KEY = "progress_v1";

const listeners = new Set();

export function loadProgress() {
  const p = readJSON(KEY, { daily: {}, best: 0 });
  if (!p.daily) p.daily = {};
  if (!p.acc) p.acc = {};
  return p;
}

function save(p) {
  writeJSON(KEY, p);
  listeners.forEach((fn) => fn());
}

/** Đăng ký nhận thông báo khi tiến độ thay đổi. Trả về hàm hủy đăng ký. */
export function subscribeProgress(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Ghi nhận n lượt ôn cho hôm nay, cập nhật streak tốt nhất.
 * `ok` (tùy chọn): true = trả lời đúng, false = sai — dùng cho thống kê độ chính xác.
 */
export function recordReview(n = 1, ok) {
  const p = loadProgress();
  const today = dayKey();
  p.daily[today] = (p.daily[today] || 0) + n;
  if (typeof ok === "boolean") {
    const a = p.acc[today] || { ok: 0, no: 0 };
    if (ok) a.ok += n;
    else a.no += n;
    p.acc[today] = a;
  }
  const streak = getStreak(p);
  if (streak > (p.best || 0)) p.best = streak;
  save(p);
  return p;
}

// Streak hiện tại: số ngày liên tiếp có hoạt động, tính đến hôm nay
// (hoặc hôm qua — chưa học hôm nay thì streak chưa bị đứt).
export function getStreak(p = loadProgress()) {
  const today = dayKey();
  let cursor = today;
  // Nếu hôm nay chưa học, bắt đầu đếm từ hôm qua.
  if (!p.daily[today]) {
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() - 1);
    cursor = dayKey(d);
  }
  let streak = 0;
  while (p.daily[cursor]) {
    streak += 1;
    const d = new Date(cursor + "T00:00:00");
    d.setDate(d.getDate() - 1);
    cursor = dayKey(d);
  }
  return streak;
}

export function studiedToday(p = loadProgress()) {
  return !!p.daily[dayKey()];
}

export function reviewsToday(p = loadProgress()) {
  return p.daily[dayKey()] || 0;
}

export function totalReviews(p = loadProgress()) {
  return Object.values(p.daily).reduce((a, b) => a + b, 0);
}

// Hoạt động n ngày gần nhất (cũ → mới) để vẽ biểu đồ mini.
export function recentActivity(days = 14, p = loadProgress()) {
  const out = [];
  const today = dayKey();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    out.push({ date: k, count: p.daily[k] || 0, offset: dayDiff(today, k) });
  }
  return out;
}

/**
 * Độ chính xác theo từng ngày trong n ngày gần nhất (cũ → mới).
 * Ngày chưa có dữ liệu `acc` trả về pct = null (không vẽ cột).
 */
export function accuracyTrend(days = 14, p = loadProgress()) {
  const out = [];
  const today = dayKey();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    const a = p.acc?.[k];
    const total = a ? a.ok + a.no : 0;
    out.push({
      date: k,
      ok: a?.ok || 0,
      no: a?.no || 0,
      pct: total ? Math.round((a.ok / total) * 100) : null,
    });
  }
  return out;
}

/** Độ chính xác tổng của n ngày gần nhất. */
export function accuracyOverall(days = 30, p = loadProgress()) {
  const rows = accuracyTrend(days, p);
  const ok = rows.reduce((a, r) => a + r.ok, 0);
  const no = rows.reduce((a, r) => a + r.no, 0);
  return { ok, no, total: ok + no, pct: ok + no ? Math.round((ok / (ok + no)) * 100) : null };
}

export function progressStorageKey() {
  return KEY;
}
