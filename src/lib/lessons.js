// Chia 580 từ vựng thành các "bài" nhỏ ~10 từ.
//
// Một lưới 580 từ không phải là đơn vị học được: không biết bắt đầu từ đâu,
// không có cảm giác hoàn thành. Ở đây cắt theo đúng thứ tự chủ đề có sẵn thành
// các bài ngắn, và suy trạng thái hoàn thành từ SRS (không lưu thêm state).

import vocabData from "../data/vocabulary.json";
import { getCard, getStatus } from "./srs";

export const LESSON_SIZE = 10;

let cache = null;

/** Danh sách bài học, mỗi bài ~LESSON_SIZE từ, không trộn lẫn chủ đề. */
export function lessons(size = LESSON_SIZE) {
  if (cache && cache.size === size) return cache.list;
  const list = [];
  vocabData.categories.forEach((cat) => {
    for (let i = 0; i < cat.words.length; i += size) {
      const words = cat.words.slice(i, i + size).map((w) => ({
        ...w,
        categoryId: cat.id,
        categoryLabel: cat.label,
        categoryColor: cat.color,
      }));
      list.push({
        id: `L${list.length + 1}`,
        index: list.length + 1,
        categoryId: cat.id,
        categoryLabel: cat.label,
        categoryIcon: cat.icon,
        color: cat.color,
        part: cat.words.length > size ? Math.floor(i / size) + 1 : null,
        parts: cat.words.length > size ? Math.ceil(cat.words.length / size) : null,
        words,
      });
    }
  });
  cache = { size, list };
  return list;
}

/** Tiến độ một bài: đã thuộc / đang học / chưa học + phần trăm. */
export function lessonProgress(lesson) {
  let mastered = 0;
  let learning = 0;
  lesson.words.forEach((w) => {
    const st = getStatus(getCard("vocab", w.id));
    if (st === "mastered") mastered += 1;
    else if (st === "learning") learning += 1;
  });
  const total = lesson.words.length;
  return {
    mastered,
    learning,
    new: total - mastered - learning,
    total,
    pct: total ? Math.round((mastered / total) * 100) : 0,
    done: total > 0 && mastered === total,
    started: mastered + learning > 0,
  };
}

/** Bài đang học dở đầu tiên (hoặc bài chưa bắt đầu kế tiếp) — "học tiếp từ đây". */
export function nextLesson(size = LESSON_SIZE) {
  const list = lessons(size);
  const withProgress = list.map((l) => ({ lesson: l, prog: lessonProgress(l) }));
  return (
    withProgress.find((x) => x.prog.started && !x.prog.done) ||
    withProgress.find((x) => !x.prog.started) ||
    withProgress[withProgress.length - 1] ||
    null
  );
}

/** Tổng quan toàn bộ chương trình từ vựng. */
export function lessonsOverview(size = LESSON_SIZE) {
  const list = lessons(size);
  let done = 0;
  let started = 0;
  list.forEach((l) => {
    const p = lessonProgress(l);
    if (p.done) done += 1;
    else if (p.started) started += 1;
  });
  return { total: list.length, done, started, untouched: list.length - done - started };
}
