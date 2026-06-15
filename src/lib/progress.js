// Hoạt động học theo ngày + chuỗi ngày liên tiếp (streak).
//
//   { daily: { "YYYY-MM-DD": <số lượt ôn> }, best: <streak dài nhất> }

import { readJSON, writeJSON, dayKey, dayDiff } from "./storage";

const KEY = "progress_v1";

export function loadProgress() {
  return readJSON(KEY, { daily: {}, best: 0 });
}

function save(p) {
  writeJSON(KEY, p);
}

// Ghi nhận n lượt ôn cho hôm nay, cập nhật streak tốt nhất.
export function recordReview(n = 1) {
  const p = loadProgress();
  const today = dayKey();
  p.daily[today] = (p.daily[today] || 0) + n;
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
