// Lưu trạng thái làm đề + Sổ tay lỗi + Lịch sử thi thử.
//
// Trước đây ExercisesTab giữ đáp án trong React state ⇒ F5 là mất sạch, và chỉ
// lưu đúng/sai nên không thể xem lại mình đã chọn gì. Ở đây lưu hẳn LỰA CHỌN
// của người dùng theo từng đề:
//
//   exam_state_v1   { [examId]: { answers: {qid: "<đáp án đã chọn>"},
//                                 mode, startedAt, submitted, elapsed } }
//   exam_history_v1 [ { examId, at, mode, raw, total, score, pass, groups } ]
//
// Câu sai được đẩy vào deck SRS "exam" ⇒ ôn lại theo lịch giãn cách như mọi deck khác.

import { readJSON, writeJSON, dayKey } from "./storage";
import { rateCard, loadSrs, getStatus, isDue } from "./srs";
import data from "../data/jlpt-sets.json";

const STATE_KEY = "exam_state_v1";
const HISTORY_KEY = "exam_history_v1";

export const { examSets } = data;

// Mốc điểm JLPT N5 thật: tổng 180 (Ngôn ngữ+Đọc 120, Nghe 60);
// đậu khi tổng ≥ 80 VÀ từng phần đạt điểm sàn.
export const N5_SCORING = {
  language: { max: 120, floor: 38, label: "Ngôn ngữ · Đọc hiểu" },
  listening: { max: 60, floor: 19, label: "Nghe" },
  passTotal: 80,
};

/** Section thuộc nhóm điểm nào. */
export function sectionGroup(section) {
  return section.type === "listening" || /聴解|nghe/i.test(section.title)
    ? "listening"
    : "language";
}

/** Mọi id câu hỏi trong một section (kể cả câu trong bài đọc). */
export function getQuestionIds(section) {
  const ids = [];
  if (section.questions) section.questions.forEach((q) => ids.push(q.id));
  if (section.passages)
    section.passages.forEach((p) => p.questions.forEach((q) => ids.push(q.id)));
  return ids;
}

/** Mọi câu hỏi trong một section, phẳng. */
export function getQuestions(section) {
  const out = [];
  if (section.questions) out.push(...section.questions);
  if (section.passages) section.passages.forEach((p) => out.push(...p.questions));
  return out;
}

// ── Chỉ mục qid → câu hỏi (dùng cho Sổ tay lỗi) ──────────────────────────────

let index = null;

export function questionIndex() {
  if (index) return index;
  index = new Map();
  examSets.forEach((exam) => {
    exam.sections.forEach((section) => {
      getQuestions(section).forEach((q) => {
        index.set(q.id, {
          q,
          examId: exam.id,
          examTitle: exam.title,
          sectionId: section.id,
          sectionTitle: section.title,
          sectionIcon: section.icon,
          sectionColor: section.color,
          group: sectionGroup(section),
        });
      });
    });
  });
  return index;
}

export const findQuestion = (qid) => questionIndex().get(qid) || null;

export function totalQuestionCount() {
  return questionIndex().size;
}

// ── Trạng thái làm đề ────────────────────────────────────────────────────────

function loadAll() {
  return readJSON(STATE_KEY, {});
}

export function loadExam(examId) {
  const all = loadAll();
  const s = all[examId];
  return {
    answers: s?.answers || {},
    mode: s?.mode || "practice",
    startedAt: s?.startedAt || null,
    submitted: !!s?.submitted,
    elapsed: s?.elapsed || 0,
    clock: s?.clock || null,
  };
}

function writeExam(examId, patch) {
  const all = loadAll();
  all[examId] = { ...loadExam(examId), ...patch };
  writeJSON(STATE_KEY, all);
  return all[examId];
}

/** Sổ tay lỗi: sai → vào deck SRS "exam"; đúng → nâng cấp thẻ (nếu đã từng sai). */
function rateMistake(qid, ok) {
  if (!ok) rateCard("exam", qid, "forget");
  else if (loadSrs().exam?.[qid]) rateCard("exam", qid, "remember");
}

/**
 * Ghi lựa chọn của người dùng cho một câu. Trả về true nếu đúng.
 * `rate` = false ở chế độ thi thử: chỉ lưu lựa chọn (còn đổi được), việc chấm
 * vào Sổ tay lỗi để lúc nộp bài — trước đây chấm cả lúc chọn lẫn lúc nộp nên mỗi
 * câu sai bị tính hai lần quên.
 */
export function answerQuestion(examId, qid, choice, { rate = true } = {}) {
  const state = loadExam(examId);
  const answers = { ...state.answers, [qid]: choice };
  writeExam(examId, { answers, startedAt: state.startedAt || Date.now() });

  const found = findQuestion(qid);
  const ok = !!found && choice === found.q.answer;
  if (found && rate) rateMistake(qid, ok);
  return ok;
}

/** Số giây đã trôi qua kể từ lúc bắt đầu thi (theo đồng hồ thật, không dừng). */
export function examElapsed(state, now = Date.now()) {
  if (!state?.startedAt) return state?.elapsed || 0;
  return Math.max(0, Math.floor((now - state.startedAt) / 1000));
}

export function setExamMode(examId, mode) {
  return writeExam(examId, { mode, submitted: false });
}

export function startExam(examId, mode = "test") {
  const all = loadAll();
  all[examId] = {
    answers: {},
    mode,
    startedAt: Date.now(),
    submitted: false,
    elapsed: 0,
    clock: "wall",
  };
  writeJSON(STATE_KEY, all);
  return all[examId];
}

/**
 * Đề thi thử bắt đầu từ bản cũ dùng đồng hồ "đếm giây khi đang mở" (dừng khi thu
 * gọn đề / đổi tab). Chuyển sang đồng hồ thật mà KHÔNG tính khoảng thời gian app
 * đóng trước đó: lùi mốc bắt đầu đúng bằng số giây đã làm.
 */
export function ensureWallClock(examId) {
  const s = loadExam(examId);
  if (s.mode !== "test" || s.submitted || s.clock === "wall") return s;
  return writeExam(examId, { startedAt: Date.now() - (s.elapsed || 0) * 1000, clock: "wall" });
}

export function resetExam(examId) {
  const all = loadAll();
  delete all[examId];
  writeJSON(STATE_KEY, all);
}

export function resetSection(examId, qids) {
  const state = loadExam(examId);
  const answers = { ...state.answers };
  qids.forEach((id) => delete answers[id]);
  return writeExam(examId, { answers, submitted: false });
}

/** Đề nào đang làm dở (có đáp án nhưng chưa nộp/chưa xong). */
export function inProgressExams() {
  const all = loadAll();
  return examSets
    .map((exam) => {
      const s = all[exam.id];
      if (!s) return null;
      const answered = Object.keys(s.answers || {}).length;
      const total = exam.sections.reduce((a, sec) => a + getQuestionIds(sec).length, 0);
      if (!answered || answered >= total) return null;
      return { examId: exam.id, title: exam.title, answered, total, mode: s.mode };
    })
    .filter(Boolean);
}

// ── Chấm điểm ────────────────────────────────────────────────────────────────

/**
 * Chấm một đề theo thang JLPT thật.
 * Trả về { raw, total, groups: {language:{...}, listening:{...}}, score, pass, done }
 */
export function scoreExam(exam, answers) {
  const groups = {
    language: { correct: 0, total: 0, answered: 0 },
    listening: { correct: 0, total: 0, answered: 0 },
  };

  exam.sections.forEach((section) => {
    const g = sectionGroup(section);
    getQuestions(section).forEach((q) => {
      groups[g].total += 1;
      const chosen = answers[q.id];
      if (chosen != null) {
        groups[g].answered += 1;
        if (chosen === q.answer) groups[g].correct += 1;
      }
    });
  });

  let score = 0;
  let floorsOk = true;
  for (const key of ["language", "listening"]) {
    const g = groups[key];
    const cfg = N5_SCORING[key];
    g.max = cfg.max;
    g.floor = cfg.floor;
    g.label = cfg.label;
    g.score = g.total ? Math.round((g.correct / g.total) * cfg.max) : 0;
    // Phần không có câu nào trong đề thì không tính điểm sàn.
    g.floorOk = g.total === 0 || g.score >= cfg.floor;
    if (!g.floorOk) floorsOk = false;
    score += g.score;
  }

  const raw = groups.language.correct + groups.listening.correct;
  const total = groups.language.total + groups.listening.total;
  const answered = groups.language.answered + groups.listening.answered;
  const maxScore = ["language", "listening"].reduce(
    (a, k) => a + (groups[k].total ? N5_SCORING[k].max : 0),
    0,
  );
  const passTotal = Math.round((N5_SCORING.passTotal / 180) * (maxScore || 180));

  return {
    raw,
    total,
    answered,
    groups,
    score,
    maxScore,
    passTotal,
    pass: score >= passTotal && floorsOk,
    floorsOk,
    done: total > 0 && answered === total,
  };
}

// ── Lịch sử thi thử ──────────────────────────────────────────────────────────

export function loadHistory() {
  const h = readJSON(HISTORY_KEY, []);
  return Array.isArray(h) ? h : [];
}

export function pushHistory(entry) {
  const h = loadHistory();
  h.unshift({ ...entry, at: Date.now(), day: dayKey() });
  writeJSON(HISTORY_KEY, h.slice(0, 50));
  return h;
}

export function clearHistory() {
  writeJSON(HISTORY_KEY, []);
}

/**
 * Nộp bài: chấm, lưu lịch sử, đẩy câu sai vào Sổ tay lỗi.
 * `exam` phải là ĐỀ ĐẦY ĐỦ (không lọc phần) — lịch sử thi chỉ so sánh được khi
 * mọi lần thi chấm trên cùng một thang.
 */
export function submitExam(exam) {
  const state = loadExam(exam.id);
  const result = scoreExam(exam, state.answers);
  const isTest = state.mode === "test";

  // Chế độ luyện tập đã chấm từng câu lúc chọn; chế độ thi chấm một lần ở đây.
  if (isTest) {
    exam.sections.forEach((section) => {
      getQuestions(section).forEach((q) => {
        const chosen = state.answers[q.id];
        if (chosen != null) rateMistake(q.id, chosen === q.answer);
      });
    });
  }

  const elapsed = isTest ? examElapsed(state) : state.elapsed;
  writeExam(exam.id, { submitted: true, elapsed });
  pushHistory({
    examId: exam.id,
    title: exam.title,
    mode: state.mode,
    raw: result.raw,
    total: result.total,
    score: result.score,
    maxScore: result.maxScore,
    pass: result.pass,
    elapsed,
    groups: Object.fromEntries(
      Object.entries(result.groups).map(([k, g]) => [k, { correct: g.correct, total: g.total, score: g.score }]),
    ),
  });
  return result;
}

// ── Sổ tay lỗi ───────────────────────────────────────────────────────────────

/** Các câu đang nằm trong sổ tay lỗi (chưa thuộc lại). */
export function mistakeEntries() {
  const bag = loadSrs().exam || {};
  const today = dayKey();
  const out = [];
  for (const [qid, card] of Object.entries(bag)) {
    if (getStatus(card) === "mastered") continue;
    const found = findQuestion(qid);
    if (!found) continue; // câu đã bị xoá khỏi data
    out.push({ ...found, qid, card, due: isDue(card, today) });
  }
  // Ưu tiên câu tới hạn, sai nhiều lần, box thấp.
  out.sort(
    (a, b) =>
      Number(b.due) - Number(a.due) ||
      (b.card.lapses || 0) - (a.card.lapses || 0) ||
      (a.card.box || 0) - (b.card.box || 0),
  );
  return out;
}

export function mistakeCount() {
  return mistakeEntries().length;
}

export function mistakeDueCount() {
  return mistakeEntries().filter((m) => m.due).length;
}

export function examStorageKeys() {
  return [STATE_KEY, HISTORY_KEY];
}
