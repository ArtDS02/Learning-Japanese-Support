// Tìm kiếm toàn cục + liên kết chéo giữa các tab.
//
// Trước đây mỗi tab có ô tìm kiếm riêng ⇒ muốn tra một từ phải đoán nó nằm ở
// tab nào. Ở đây gom mọi nội dung vào một chỉ mục phẳng, dựng một lần rồi cache.
//
// Liên kết chéo: 9 tab đang là 9 ốc đảo — từ 学校 không dẫn tới kanji 学 / 校,
// kanji không dẫn ngược về từ vựng. `crossLinks()` xử lý việc đó.

import vocabData from "../data/vocabulary.json";
import kanjiData from "../data/kanji.json";
import grammarData from "../data/grammar.json";
import numbersData from "../data/numbers.json";
import kanaData from "../data/kana.json";
import { customAsWords } from "./userdata";

const KANJI_RE = /[一-鿿]/;
const norm = (s) => String(s || "").toLowerCase();

/**
 * Romaji trong data dùng dấu macron (gakkō, ohayō) nhưng người dùng gõ ASCII
 * (gakkou / gakkoo / gakko). Thêm sẵn mọi biến thể vào chuỗi tìm kiếm để cả ba
 * cách gõ đều ra kết quả.
 */
function romajiVariantsText(s) {
  const raw = String(s || "");
  if (!/[āīūēō]/i.test(raw)) return raw;
  const out = new Set();
  const expand = (list, ch, reps) => {
    const next = [];
    for (const f of list) {
      if (!f.includes(ch)) next.push(f);
      else for (const r of reps) next.push(f.split(ch).join(r));
    }
    return [...new Set(next)].slice(0, 16);
  };
  let forms = [raw.toLowerCase()];
  forms = expand(forms, "ā", ["a", "aa"]);
  forms = expand(forms, "ī", ["i", "ii"]);
  forms = expand(forms, "ū", ["u", "uu"]);
  forms = expand(forms, "ē", ["e", "ee"]);
  forms = expand(forms, "ō", ["o", "ou", "oo"]);
  forms.forEach((f) => out.add(f));
  return [raw, ...out].join(" ");
}

/** Bỏ macron khỏi truy vấn để khớp với các biến thể ASCII đã dựng ở trên. */
function foldQuery(s) {
  return norm(s)
    .replace(/ā/g, "a")
    .replace(/ī/g, "i")
    .replace(/ū/g, "u")
    .replace(/ē/g, "e")
    .replace(/ō/g, "o");
}

let cache = null;

function buildIndex() {
  const rows = [];
  const add = (row) =>
    rows.push({
      ...row,
      meaning: row.meaning || "",
      hay: norm(romajiVariantsText(row.hay || Object.values(row).join(" "))),
    });

  // ── Từ vựng ──
  vocabData.categories.forEach((c) => {
    c.words.forEach((w) => {
      add({
        kind: "vocab",
        icon: "📖",
        id: w.id,
        tab: "vocabulary",
        title: w.japanese,
        sub: [w.kanji, w.romaji].filter(Boolean).join(" · "),
        meaning: w.meaning,
        badge: c.label,
        color: c.color,
        hay: [w.japanese, w.kanji, w.romaji, w.meaning, c.label, w.note].filter(Boolean).join(" "),
      });
    });
  });

  customAsWords().forEach((w) => {
    add({
      kind: "vocab",
      icon: "⭐",
      id: w.id,
      tab: "vocabulary",
      title: w.japanese,
      sub: [w.kanji, w.romaji].filter(Boolean).join(" · "),
      meaning: w.meaning,
      badge: "Thẻ của tôi",
      color: "#f472b6",
      hay: [w.japanese, w.kanji, w.romaji, w.meaning].filter(Boolean).join(" "),
    });
  });

  // ── Kanji ──
  kanjiData.kanji.forEach((k) => {
    const c = kanjiData.categories.find((x) => x.id === k.category);
    add({
      kind: "kanji",
      icon: "🈳",
      id: k.id,
      tab: "kanji",
      title: k.char,
      sub: `On: ${k.on} · Kun: ${k.kun}`,
      meaning: k.hanviet ? `${k.meaning} · Hán Việt: ${k.hanviet}` : k.meaning,
      badge: [k.level, c?.label].filter(Boolean).join(" · "),
      color: c?.color,
      hay: [k.char, k.on, k.kun, k.on_romaji, k.kun_romaji, k.meaning, k.hanviet, k.level, k.mnemonic,
        ...(k.examples || []).flatMap((e) => [e.word, e.reading, e.meaning])].filter(Boolean).join(" "),
    });
  });

  // ── Ngữ pháp ──
  grammarData.categories.forEach((cat) => {
    cat.items.forEach((item) => {
      if (item.particle) {
        add({
          kind: "grammar", icon: "🔗", id: item.id, tab: "grammar",
          title: item.particle, sub: `/ ${item.romaji} /`, meaning: item.function,
          badge: cat.label, color: item.color,
          hay: [item.particle, item.romaji, item.function, item.detail].join(" "),
        });
      } else if (item.pattern) {
        add({
          kind: "grammar", icon: "🧩", id: item.id, tab: "grammar",
          title: item.pattern, sub: item.level, meaning: item.meaning,
          badge: cat.label, color: item.color,
          hay: [item.pattern, item.meaning, item.explanation].filter(Boolean).join(" "),
        });
      } else if (item.word) {
        add({
          kind: "grammar", icon: "❓", id: item.id, tab: "grammar",
          title: item.word, sub: `/ ${item.romaji} /`, meaning: item.meaning,
          badge: cat.label, color: item.color,
          hay: [item.word, item.romaji, item.meaning, item.note].filter(Boolean).join(" "),
        });
      } else if (item.title) {
        add({
          kind: "grammar", icon: "⚙️", id: item.id, tab: "grammar",
          title: item.title, sub: item.subtitle,
          meaning: item.meaning || item.rule || item.note || item.subtitle || "",
          badge: cat.label, color: item.color,
          hay: [item.title, item.subtitle, item.meaning, item.rule, item.note].filter(Boolean).join(" "),
        });
        // Từng dòng trong bảng chia cũng nên tra được
        (item.conjugations || []).forEach((v, i) => {
          add({
            kind: "grammar", icon: "🔄", id: `${item.id}#${i}`, tab: "grammar",
            title: v.dict, sub: [v.masu, v.present].filter(Boolean).join(" · "),
            meaning: v.meaning, badge: item.title, color: item.color,
            hay: Object.values(v).join(" "),
          });
        });
      }
    });
  });

  // ── Số đếm ──
  numbersData.counters.forEach((c) => {
    add({
      kind: "numbers", icon: "📦", id: c.id, tab: "numbers",
      title: c.suffix, sub: c.readings.slice(0, 3).map((r) => r.read).join(" · "),
      meaning: c.use, badge: "Bộ đếm", color: c.color,
      hay: [c.suffix, c.use, c.note, c.example, ...c.readings.map((r) => r.read)].filter(Boolean).join(" "),
    });
  });
  numbersData.weekdays.forEach((d, i) => {
    add({
      kind: "numbers", icon: "🗓", id: `wd${i}`, tab: "numbers",
      title: d.jp, sub: d.hira, meaning: d.vn, badge: "Thứ", color: d.color,
      hay: [d.jp, d.hira, d.romaji, d.vn, d.kanji_meaning].join(" "),
    });
  });
  numbersData.months.forEach((m, i) =>
    add({
      kind: "numbers", icon: "📅", id: `mo${i}`, tab: "numbers",
      title: m.jp, sub: m.read, meaning: `tháng ${m.n}`, badge: "Tháng", color: "#a78bfa",
      hay: [m.jp, m.read, `thang ${m.n}`].join(" "),
    }),
  );
  numbersData.dates.forEach((d, i) =>
    add({
      kind: "numbers", icon: "🗓️", id: `dt${i}`, tab: "numbers",
      title: d.jp, sub: d.read, meaning: `ngày ${d.n}`, badge: "Ngày", color: "#facc15",
      hay: [d.jp, d.read, `ngay ${d.n}`].join(" "),
    }),
  );
  numbersData.hours.forEach((h, i) =>
    add({
      kind: "numbers", icon: "⏰", id: `hr${i}`, tab: "numbers",
      title: `${h.n}時`, sub: h.read, meaning: `${h.n} giờ`, badge: "Giờ", color: "#f472b6",
      hay: [`${h.n}時`, h.read, h.romaji, `${h.n} gio`].join(" "),
    }),
  );

  // ── Kana ──
  (kanaData.commonKatakanaWords || []).forEach((w, i) =>
    add({
      kind: "kana", icon: "🔤", id: `kw${i}`, tab: "kana",
      title: w.katakana, sub: w.romaji, meaning: w.meaning, badge: "Từ katakana", color: "#a78bfa",
      hay: [w.katakana, w.romaji, w.meaning, w.origin].filter(Boolean).join(" "),
    }),
  );

  return rows;
}

export function searchIndexRows() {
  if (!cache) cache = buildIndex();
  return cache;
}

/** Dựng lại chỉ mục (gọi sau khi thêm/xoá thẻ tự tạo). */
export function invalidateSearchIndex() {
  cache = null;
}

/**
 * Tìm kiếm toàn cục. Trả về tối đa `limit` kết quả, xếp theo độ khớp.
 */
export function search(query, { limit = 30, kinds } = {}) {
  const q = foldQuery(query).trim();
  if (q.length < 1) return [];
  const rows = searchIndexRows();

  const scored = [];
  for (const row of rows) {
    if (kinds && !kinds.includes(row.kind)) continue;
    if (!row.hay.includes(q)) continue;
    const title = norm(row.title);
    const meaning = norm(row.meaning);
    let score;
    if (title === q) score = 100;
    else if (title.startsWith(q)) score = 80;
    else if (title.includes(q)) score = 60;
    else if (meaning.startsWith(q)) score = 40;
    else if (meaning.includes(q)) score = 30;
    else score = 10;
    scored.push({ ...row, score });
    if (scored.length > 600) break; // chặn chi phí với truy vấn quá chung
  }
  scored.sort((a, b) => b.score - a.score || a.title.length - b.title.length);
  return scored.slice(0, limit);
}

// ── Liên kết chéo ────────────────────────────────────────────────────────────

let kanjiByChar = null;
function charMap() {
  if (!kanjiByChar) kanjiByChar = new Map(kanjiData.kanji.map((k) => [k.char, k]));
  return kanjiByChar;
}

/** Các kanji (có trong bộ N5 + N4 của app) xuất hiện trong một chuỗi. */
export function kanjiInText(text) {
  const map = charMap();
  const seen = new Set();
  const out = [];
  for (const ch of String(text || "")) {
    if (!KANJI_RE.test(ch) || seen.has(ch)) continue;
    seen.add(ch);
    const k = map.get(ch);
    if (k) out.push(k);
  }
  return out;
}

let vocabAll = null;
function allVocabFlat() {
  if (!vocabAll) {
    vocabAll = vocabData.categories.flatMap((c) =>
      c.words.map((w) => ({ ...w, categoryLabel: c.label, categoryColor: c.color })),
    );
  }
  return vocabAll;
}

/** Các từ vựng N5 có chứa một kanji cụ thể. */
export function vocabWithKanji(char, limit = 12) {
  if (!char) return [];
  return allVocabFlat()
    .filter((w) => (w.kanji && w.kanji.includes(char)) || w.japanese.includes(char))
    .slice(0, limit);
}

/**
 * Liên kết chéo cho một thẻ:
 *  · từ vựng → các kanji cấu thành
 *  · kanji  → các từ vựng dùng nó
 */
export function crossLinks({ kind, word, kanji }) {
  if (kind === "vocab") {
    return { kanji: kanjiInText(`${kanji || ""}${word || ""}`), vocab: [] };
  }
  if (kind === "kanji") {
    return { kanji: [], vocab: vocabWithKanji(word) };
  }
  return { kanji: [], vocab: [] };
}
