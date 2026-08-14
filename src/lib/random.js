// Tiện ích xáo trộn — để riêng một module cực nhỏ.
//
// Trước đây `shuffle` nằm trong quizgen.js; mọi file import nó (session.js,
// VocabularyTab, KanjiTab) vô tình kéo theo toàn bộ data JSON mà quizgen import,
// làm phình lần tải đầu tiên.

/** Fisher–Yates: trả về mảng mới đã xáo, không đổi mảng gốc. */
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
