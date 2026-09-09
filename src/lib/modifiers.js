// Tiện ích cho bộ "Từ bổ nghĩa" (data/modifiers.json).
//
// TẠI SAO LÀ MODULE RIÊNG, KHÔNG NHÉT VÀO lib/session.js:
// session.js được HomeTab dùng ngay khi mở app, nên mọi JSON nó import đều rơi
// vào chunk tải ở lần tải đầu (đó cũng là lý do file đó cố ý không import
// examStore). Bộ từ bổ nghĩa nặng ~80KB mà chỉ cần khi mở tab Từ bổ nghĩa,
// Tiến độ hoặc Tìm kiếm toàn cục — cả ba đều lazy. Tách ra đây thì Rollup xếp
// data này thành chunk riêng, giống cách grammar.json đang được xếp.

import data from "../data/modifiers.json";
import { getCard, getStatus } from "./srs";

let flat = null;

/** Phẳng hoá 11 nhóm thành một danh sách, mỗi từ mang theo thông tin nhóm. */
export function modifierWords() {
  if (!flat) {
    flat = data.groups.flatMap((g) =>
      g.words.map((w) => ({
        ...w,
        groupId: g.id,
        groupLabel: g.label,
        groupColor: g.color,
        groupIcon: g.icon,
      })),
    );
  }
  return flat;
}

export const modifierGroups = () => data.groups;

/** Thông tin từ loại; rơi về "その他" cho giá trị lạ để UI không vỡ. */
export const posMeta = (id) => data.posMeta[id] || data.posMeta.other;

export const confusables = () => data.confusables;

/** Nội dung một thẻ SRS của deck này (dùng cho danh sách "hay quên nhất"). */
export function describeModifier(id) {
  const w = modifierWords().find((x) => String(x.id) === String(id));
  return w ? { title: w.jp, sub: w.vn } : null;
}

/** Đếm trạng thái theo TOÀN BỘ bộ từ, không chỉ những thẻ đã gặp. */
export function modifierPoolStats() {
  const pool = modifierWords();
  let mastered = 0;
  let learning = 0;
  pool.forEach((w) => {
    const st = getStatus(getCard("modifiers", w.id));
    if (st === "mastered") mastered += 1;
    else if (st === "learning") learning += 1;
  });
  return { total: pool.length, mastered, learning, new: pool.length - mastered - learning };
}
