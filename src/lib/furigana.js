// Furigana (ruby) cho câu tiếng Nhật.
//
// NGUYÊN TẮC QUAN TRỌNG: chỉ hiện cách đọc CÓ THẬT trong data, tuyệt đối không
// suy đoán. Ghép âm On/Kun theo cảm tính sẽ tạo ra cách đọc sai — với người mới
// học thì sai còn tệ hơn là không có.
//
// Nguồn cách đọc đáng tin cậy đang có sẵn:
//   · vocabulary.json — 386 từ có cả dạng kanji (`kanji`) và dạng kana (`japanese`)
//   · kanji.json      — mỗi kanji kèm từ ghép { word, reading }
//   · numbers.json    — tháng / ngày / thứ / số kèm cách đọc
//
// Cụm nào không có trong từ điển này thì để nguyên, không gắn ruby.

import vocabData from "../data/vocabulary.json";
import kanjiData from "../data/kanji.json";
import numbersData from "../data/numbers.json";

const HAS_KANJI = /[一-鿿]/;

let dict = null; // Map<dạng kanji, cách đọc kana>
let maxLen = 0;

function put(map, form, reading) {
  const f = String(form || "").trim();
  const r = String(reading || "").replace(/\s*⚠️/g, "").trim();
  if (!f || !r || f === r) return;
  if (!HAS_KANJI.test(f)) return; // chỉ cần ruby cho cụm có kanji
  if (/[（(]/.test(f)) return; // bỏ các mục có chú thích trong ngoặc
  // Ưu tiên bản ghi ngắn gọn đầu tiên; không ghi đè để giữ tính ổn định.
  if (!map.has(f)) {
    map.set(f, r);
    if (f.length > maxLen) maxLen = f.length;
  }
}

function buildDict() {
  const map = new Map();

  // Từ ghép trong kanji.json là nguồn chính xác nhất (do người soạn ghi rõ reading).
  kanjiData.kanji.forEach((k) => {
    (k.examples || []).forEach((e) => put(map, e.word, e.reading));
  });

  // Từ vựng có cả dạng kanji và dạng kana.
  vocabData.categories.forEach((c) => {
    c.words.forEach((w) => {
      if (w.kanji) put(map, w.kanji, w.japanese);
    });
  });

  // Số / thời gian.
  numbersData.months.forEach((m) => put(map, m.jp, m.read));
  numbersData.dates.forEach((d) => put(map, d.jp, d.read));
  numbersData.weekdays.forEach((d) => put(map, d.jp, d.hira));
  numbersData.numbers.forEach((n) => put(map, n.kanji, n.hira));
  numbersData.hours.forEach((h) => put(map, `${h.n}時`, h.read));

  // Một kanji đơn lẻ vẫn được gắn ruby nếu có từ ghép chỉ gồm chính nó.
  kanjiData.kanji.forEach((k) => {
    const solo = (k.examples || []).find((e) => e.word === k.char);
    if (solo) put(map, k.char, solo.reading);
  });

  return map;
}

function getDict() {
  if (!dict) dict = buildDict();
  return dict;
}

/**
 * Cắt `text` thành các đoạn để render ruby.
 * Trả về [{ t: "学校", r: "がっこう" }, { t: "は" }, …]
 * Đoạn không có `r` là đoạn hiển thị nguyên văn.
 */
export function annotate(text) {
  const s = String(text || "");
  if (!s || !HAS_KANJI.test(s)) return [{ t: s }];
  const map = getDict();
  const out = [];
  let plain = "";
  let i = 0;

  const flush = () => {
    if (plain) {
      out.push({ t: plain });
      plain = "";
    }
  };

  while (i < s.length) {
    if (!HAS_KANJI.test(s[i])) {
      plain += s[i++];
      continue;
    }
    // Khớp cụm dài nhất trước (学校 trước 学).
    let hit = null;
    for (let len = Math.min(maxLen, s.length - i); len >= 1; len--) {
      const sub = s.substr(i, len);
      const reading = map.get(sub);
      if (reading) {
        hit = { t: sub, r: reading };
        break;
      }
    }
    if (hit) {
      flush();
      out.push(hit);
      i += hit.t.length;
    } else {
      plain += s[i++];
    }
  }
  flush();
  return out;
}

/** Có gắn được ruby nào cho đoạn text này không (để ẩn nút bật/tắt khi vô nghĩa). */
export function hasFurigana(text) {
  return annotate(text).some((seg) => seg.r);
}

/** Số cụm trong từ điển cách đọc — hiện trong phần cài đặt cho minh bạch. */
export function furiganaDictSize() {
  return getDict().size;
}
