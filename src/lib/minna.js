// Minna no Nihongo I — nạp data từng bài, tiến độ học và sổ câu sai.
//
// Data mỗi bài là một file JSON riêng (src/data/minna-no-nihongo-1/lesson-XX.json,
// xem SCHEMA.md) và được nạp LAZY: mở tab chỉ tải index.json (vài KB), bấm vào
// bài nào mới tải bài đó. Đừng import file bài học vào session.js/furigana.js —
// sẽ kéo cả 25 bài vào lần tải đầu của app.
//
// Tiến độ lưu ở một khoá localStorage duy nhất:
//
//   minna1_v1 {
//     lessons: { "<n>": { viewed: [gpId], attempts, correct, wrong, best, last,
//                         doneAt, updatedAt } },
//     wrong:   { "<exId>": { lesson, gp, user, count, ts } },  // câu cần ôn
//     prefs:   { romaji: true, furigana: false }
//   }

import { useSyncExternalStore } from "react";
import index from "../data/minna-no-nihongo-1/index.json";
import { readJSON, writeJSON } from "./storage";
import { shuffle } from "./random";
import { matchesKana, normalizeKana } from "./romaji";

export const KEY = "minna1_v1";
export const LESSONS = index.lessons;
export const PASS_PCT = 80; // điểm cao nhất ≥ ngưỡng này + đã xem hết ngữ pháp = hoàn thành

// ── Nạp data ────────────────────────────────────────────────────────────────

const loaders = import.meta.glob("../data/minna-no-nihongo-1/lesson-*.json", {
  import: "default",
});
const cache = new Map();

const fileOf = (n) => `../data/minna-no-nihongo-1/lesson-${String(n).padStart(2, "0")}.json`;

export function hasLesson(n) {
  return !!loaders[fileOf(n)];
}

/** Lấy bài đã nạp (đồng bộ) — null nếu chưa nạp. */
export function cachedLesson(n) {
  return cache.get(n) || null;
}

export function loadLesson(n) {
  if (cache.has(n)) return Promise.resolve(cache.get(n));
  const load = loaders[fileOf(n)];
  if (!load) return Promise.reject(new Error(`Chưa có dữ liệu bài ${n}`));
  return load().then((data) => {
    cache.set(n, data);
    return data;
  });
}

export function loadLessons(nums) {
  return Promise.all(nums.filter(hasLesson).map(loadLesson));
}

// ── Store tiến độ ────────────────────────────────────────────────────────────

const EMPTY = { lessons: {}, wrong: {}, prefs: { romaji: true, furigana: false } };
let state = null;
const listeners = new Set();

function read() {
  const raw = readJSON(KEY, null);
  const s = raw && typeof raw === "object" ? raw : {};
  return {
    lessons: s.lessons && typeof s.lessons === "object" ? s.lessons : {},
    wrong: s.wrong && typeof s.wrong === "object" ? s.wrong : {},
    prefs: { ...EMPTY.prefs, ...(s.prefs || {}) },
  };
}

function get() {
  if (!state) state = read();
  return state;
}

function commit(next) {
  state = next;
  writeJSON(KEY, next);
  listeners.forEach((fn) => fn());
}

function subscribe(fn) {
  listeners.add(fn);
  // Tab khác của trình duyệt ghi tiến độ → đọc lại.
  const onStorage = (e) => {
    if (e.key === KEY) {
      state = read();
      fn();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

/** Hook: toàn bộ state tiến độ, tự render lại khi đổi. */
export function useMinnaStore() {
  return useSyncExternalStore(subscribe, get, get);
}

const lessonRec = (s, n) =>
  s.lessons[n] || { viewed: [], attempts: 0, correct: 0, wrong: 0, best: null, last: null };

function patchLesson(n, fn) {
  const s = get();
  const cur = lessonRec(s, n);
  const rec = { ...fn(cur), updatedAt: Date.now() };
  commit({ ...s, lessons: { ...s.lessons, [n]: rec } });
}

export function setPref(key, value) {
  const s = get();
  commit({ ...s, prefs: { ...s.prefs, [key]: value } });
}

/** Đánh dấu đã xem một grammar point. */
export function markViewed(n, gpId) {
  const cur = lessonRec(get(), n);
  if (cur.viewed.includes(gpId)) return;
  patchLesson(n, (r) => ({ ...r, viewed: [...r.viewed, gpId] }));
}

/**
 * Ghi một câu trả lời. Sai → vào sổ câu sai; đúng → gỡ khỏi sổ (đã học được).
 */
export function recordAnswer(ex, ok, userAnswer) {
  const n = lessonOfId(ex.id);
  const s = get();
  const cur = lessonRec(s, n);
  const wrong = { ...s.wrong };
  if (ok) delete wrong[ex.id];
  else {
    wrong[ex.id] = {
      lesson: n,
      gp: ex.grammarPoint,
      user: String(userAnswer ?? ""),
      count: (wrong[ex.id]?.count || 0) + 1,
      ts: Date.now(),
    };
  }
  const rec = {
    ...cur,
    correct: cur.correct + (ok ? 1 : 0),
    wrong: cur.wrong + (ok ? 0 : 1),
    updatedAt: Date.now(),
  };
  commit({ ...s, wrong, lessons: { ...s.lessons, [n]: rec } });
}

/**
 * Kết thúc một lượt luyện tập của MỘT bài → cập nhật số lượt, điểm gần nhất,
 * điểm cao nhất. Lượt ôn tổng hợp nhiều bài không tính vào điểm từng bài.
 */
export function finishLessonRun(n, correct, total) {
  if (!total) return;
  const pct = Math.round((correct / total) * 100);
  patchLesson(n, (r) => ({
    ...r,
    attempts: (r.attempts || 0) + 1,
    last: pct,
    best: r.best == null ? pct : Math.max(r.best, pct),
  }));
}

export function clearWrong(ids) {
  const s = get();
  const wrong = { ...s.wrong };
  ids.forEach((id) => delete wrong[id]);
  commit({ ...s, wrong });
}

export function resetLesson(n) {
  const s = get();
  const lessons = { ...s.lessons };
  delete lessons[n];
  const wrong = Object.fromEntries(Object.entries(s.wrong).filter(([, w]) => w.lesson !== n));
  commit({ ...s, lessons, wrong });
}

export function lessonOfId(id) {
  const m = /^L(\d+)-/.exec(id || "");
  return m ? Number(m[1]) : 0;
}

export function wrongOf(s, n = null) {
  return Object.entries(s.wrong)
    .filter(([, w]) => n == null || w.lesson === n)
    .map(([id, w]) => ({ id, ...w }))
    .sort((a, b) => b.ts - a.ts);
}

/**
 * Trạng thái một bài: "new" (chưa học) | "learning" (đang học) | "done".
 * Hoàn thành = đã xem hết grammar point VÀ điểm luyện tập cao nhất ≥ PASS_PCT.
 */
export function lessonStatus(s, meta) {
  const r = s.lessons[meta.lesson];
  if (!r) return { status: "new", pct: 0, viewed: 0, best: null };
  const viewed = r.viewed?.length || 0;
  const allViewed = meta.gpCount > 0 && viewed >= meta.gpCount;
  const best = r.best ?? null;
  const done = allViewed && best != null && best >= PASS_PCT;
  const started = viewed > 0 || (r.attempts || 0) > 0 || r.correct + r.wrong > 0;
  // % tiến độ: nửa là ngữ pháp đã xem, nửa là điểm luyện tập cao nhất.
  const pct = Math.round(
    (meta.gpCount ? Math.min(1, viewed / meta.gpCount) : 0) * 50 + ((best || 0) / 100) * 50,
  );
  return {
    status: done ? "done" : started ? "learning" : "new",
    pct: done ? Math.max(pct, 100) : pct,
    viewed,
    best,
    attempts: r.attempts || 0,
    correct: r.correct || 0,
    wrong: r.wrong || 0,
  };
}

export function overview(s) {
  let done = 0;
  let learning = 0;
  let correct = 0;
  let wrong = 0;
  LESSONS.forEach((m) => {
    const st = lessonStatus(s, m);
    if (st.status === "done") done += 1;
    else if (st.status === "learning") learning += 1;
    correct += st.correct || 0;
    wrong += st.wrong || 0;
  });
  const total = correct + wrong;
  return {
    done,
    learning,
    total: LESSONS.length,
    correct,
    wrong,
    accuracy: total ? Math.round((correct / total) * 100) : null,
    toReview: Object.keys(s.wrong).length,
  };
}

// ── Engine bài tập ──────────────────────────────────────────────────────────

export const TYPE_LABEL = {
  choice: "Chọn đáp án",
  particle: "Chọn trợ từ",
  fill: "Điền vào chỗ trống",
  order: "Sắp xếp câu",
  "jp-vi": "Dịch Nhật → Việt",
  "vi-jp": "Dịch Việt → Nhật",
  pattern: "Chọn mẫu ngữ pháp",
  identify: "Nhận diện ngữ pháp",
  fix: "Sửa câu sai",
  situation: "Tình huống thực tế",
};

export const BLANK = "＿＿";

/**
 * Chọn `size` câu từ các bài: xoay vòng qua từng grammar point để lượt nào
 * cũng phủ đủ kiến thức, rồi sắp lại để hai câu liền nhau ít khi cùng dạng.
 */
export function pickExercises(lessons, size = 20) {
  const groups = new Map();
  lessons.forEach((l) =>
    (l.exercises || []).forEach((ex) => {
      const k = ex.grammarPoint;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(ex);
    }),
  );
  const queues = shuffle([...groups.values()].map((g) => shuffle(g)));
  const picked = [];
  const limit = size > 0 ? size : Infinity;
  while (picked.length < limit && queues.some((q) => q.length)) {
    for (const q of queues) {
      if (picked.length >= limit) break;
      if (q.length) picked.push(q.shift());
    }
  }
  return spreadTypes(shuffle(picked));
}

/** Sắp lại cho hạn chế hai câu liền nhau cùng dạng / cùng grammar point. */
function spreadTypes(list) {
  const rest = [...list];
  const out = [];
  while (rest.length) {
    const prev = out[out.length - 1];
    let i = rest.findIndex(
      (x) => !prev || (x.type !== prev.type && x.grammarPoint !== prev.grammarPoint),
    );
    if (i < 0) i = rest.findIndex((x) => !prev || x.type !== prev.type);
    if (i < 0) i = 0;
    out.push(rest.splice(i, 1)[0]);
  }
  return out;
}

/** Chuẩn bị một câu cho phiên: xáo phương án / mảnh ghép MỘT lần. */
export function prepare(ex) {
  if (ex.type === "order") {
    let tokens = shuffle(ex.tokens.map((t, i) => ({ t, i })));
    // Tránh trường hợp xáo ra đúng luôn thứ tự gốc.
    if (tokens.length > 1 && tokens.every((x, i) => x.i === i)) tokens = [...tokens].reverse();
    return { ...ex, shuffled: tokens };
  }
  if (Array.isArray(ex.options)) return { ...ex, shuffled: shuffle(ex.options) };
  return ex;
}

// Trợ từ viết một kiểu đọc một kiểu — gõ romaji theo cách ĐỌC cũng phải đúng.
const PARTICLE_READ = { は: ["wa"], へ: ["e"], を: ["o", "wo"] };

const joinJp = (arr) => normalizeKana(arr.join(""));

/** Chấm câu trả lời. `response`: chuỗi (choice/fill) hoặc mảng mảnh (order). */
export function checkAnswer(ex, response) {
  if (ex.type === "order") {
    const got = joinJp(response || []);
    const targets = [ex.tokens, ...(ex.accept || [])];
    return targets.some((t) => joinJp(t) === got);
  }
  if (ex.type === "fill") {
    const raw = String(response || "").trim();
    if (!raw) return false;
    const read = PARTICLE_READ[ex.answer];
    if (read && read.includes(raw.toLowerCase())) return true;
    return matchesKana(raw, ex.answer, ex.accept || []);
  }
  return response === ex.answer;
}

/** Câu trả lời đúng ở dạng hiển thị. */
export function correctText(ex) {
  if (ex.type === "order") return ex.tokens.join(" ").replace(/ ([。、？])/g, "$1");
  return ex.answer;
}

/** Câu tiếng Nhật hoàn chỉnh (điền đáp án vào chỗ trống) — dùng cho phát âm. */
export function fullSentence(ex) {
  if (ex.type === "order") return ex.tokens.join("");
  if ((ex.type === "particle" || ex.type === "fill") && ex.jp) return ex.jp.replace(BLANK, ex.answer);
  // Đáp án là câu tiếng Nhật (dịch Việt→Nhật, sửa câu, tình huống…) → đọc đáp án.
  if (/[぀-ヿ一-鿿]/.test(ex.answer || "") && ex.type !== "particle") return ex.answer;
  return ex.jp || "";
}

/** Romaji trong data ứng với câu nào: chỉ hiện ở phản hồi khi khớp câu đang đọc. */
export function romajiMatches(ex) {
  if (!ex.romaji || ex.romaji.includes("___")) return false;
  return fullSentence(ex) === ex.jp || ex.type === "vi-jp" || ex.type === "order";
}
