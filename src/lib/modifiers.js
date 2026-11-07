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

/** Cách đọc dùng cho TTS: bỏ ngoặc và chỉ lấy biến thể đầu ở các mục "A・B". */
export const sayable = (w) => String(w.hira || w.jp).replace(/[（）()]/g, "").split("・")[0].trim();

/** Thẻ lật: mặt trước là từ tiếng Nhật, mặt sau là nghĩa + từ loại + đối tượng bổ nghĩa. */
export function modifierCard(w, { reverse = false } = {}) {
  const p = posMeta(w.pos);
  const base = {
    deck: "modifiers",
    kind: "flash",
    id: w.id,
    tab: "modifiers",
    tag: `${w.groupIcon} ${w.groupLabel} · ${p.short}`,
    color: w.groupColor,
    noteKind: "modifiers",
    example: { jp: w.ex.jp, vn: w.ex.vn },
    extra: [
      `${p.jp}（${p.kana}）${w.posNote ? ` — ${w.posNote}` : ""}`,
      `Bổ nghĩa cho: ${w.modifies}`,
      ...(w.note ? [`💡 ${w.note}`] : []),
    ],
  };

  if (reverse) {
    return {
      ...base,
      front: w.vn,
      frontSub: `${w.groupLabel} · ${p.short}`,
      back: w.jp,
      backSub: w.jp === w.hira ? w.romaji : `${w.hira} · ${w.romaji}`,
      speakBack: sayable(w), // nghe trước khi lật là lộ đáp án
    };
  }

  return {
    ...base,
    front: w.jp,
    frontSub: w.jp === w.hira ? w.romaji : `${w.hira} · ${w.romaji}`,
    back: w.vn,
    backSub: `${p.jp} · bổ nghĩa cho ${w.modifies}`,
    speak: sayable(w), // cách đọc KHÔNG phải đáp án nên nghe trước được
  };
}
