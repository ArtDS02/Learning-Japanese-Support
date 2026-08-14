// Sinh câu luyện tập TỪ DATA ĐÃ CÓ — không cần soạn thêm nội dung.
//
// Data trong src/data đã được markup sẵn đủ để tự dựng bài tập:
//   · grammar.json  · trợ từ: mọi ví dụ đều đánh dấu trợ từ trong <…>
//                   · mẫu câu: mọi ví dụ đều có mảng `highlights`
//                   · bảng chia động từ / tính từ đầy đủ các dạng
//   · vocabulary.json · 580/580 từ đều có câu ví dụ
//   · numbers.json    · bộ đếm / giờ / tháng / ngày / thứ kèm cách đọc
//   · kanji.json      · nghĩa + âm On/Kun + từ ghép
//
// Mọi phương án nhiễu đều lấy từ chính data (không tự bịa tiếng Nhật), nên
// không có nguy cơ sinh ra câu sai ngữ pháp.
//
// Định dạng một câu hỏi:
//   { id, deck, kind: "choice" | "type", prompt, question, sub?, choices?,
//     answer, accept?, explanation?, translation?, speak?, tag }

import vocabData from "../data/vocabulary.json";
import grammarData from "../data/grammar.json";
import numbersData from "../data/numbers.json";
import kanjiData from "../data/kanji.json";
import kanaData from "../data/kana.json";
import { shuffle } from "./random";

export const BLANK = "＿＿";

// Giữ lại export cho các chỗ đang import shuffle từ đây.
export { shuffle };

// ── Helper ───────────────────────────────────────────────────────────────────

/** Lấy n phần tử khác `answer` (so sánh theo chuỗi) làm phương án nhiễu. */
function distractors(pool, answer, n, keyOf = (x) => x) {
  const seen = new Set([String(answer)]);
  const out = [];
  for (const item of shuffle(pool)) {
    const k = String(keyOf(item));
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(item);
    if (out.length >= n) break;
  }
  return out;
}

/** Ghép đáp án + nhiễu rồi xáo. */
function mcChoices(answer, wrong) {
  return shuffle([answer, ...wrong]);
}

const clean = (s) => String(s || "").replace(/[<>]/g, "");
const stripWarn = (s) => String(s || "").replace(/\s*⚠️/g, "").trim();

const cat = (id) => grammarData.categories.find((c) => c.id === id);
const allVocab = vocabData.categories.flatMap((c) =>
  c.words.map((w) => ({ ...w, categoryId: c.id, categoryLabel: c.label })),
);

// ── Ngữ pháp: điền trợ từ ────────────────────────────────────────────────────

export function particleCloze() {
  const c = cat("particles");
  if (!c) return [];
  const all = c.items;
  const out = [];

  all.forEach((item) => {
    item.examples.forEach((ex, i) => {
      const m = ex.jp.match(/<([^>]+)>/);
      if (!m || m[1] !== item.particle) return; // chỉ dùng ví dụ có đánh dấu đúng
      const full = clean(ex.jp);
      const question = ex.jp.replace(/<[^>]+>/, BLANK).replace(/[<>]/g, "");
      const wrong = distractors(
        all.filter((p) => p.particle !== item.particle),
        item.particle,
        3,
        (p) => p.particle,
      ).map((p) => p.particle);
      if (wrong.length < 2) return;

      out.push({
        id: `${item.id}#${i}`,
        deck: "grammar",
        kind: "choice",
        prompt: "Điền trợ từ thích hợp vào chỗ trống",
        question,
        sub: ex.romaji ? clean(ex.romaji).replace(item.romaji, "___") : null,
        choices: mcChoices(item.particle, wrong),
        answer: item.particle,
        explanation: `${item.particle} (${item.romaji}) — ${item.function}. ${item.detail}`,
        translation: ex.vn,
        speak: full,
        tag: `Trợ từ ${item.particle}`,
      });
    });
  });
  return out;
}

// ── Ngữ pháp: điền mẫu câu (cloze theo `highlights`) ─────────────────────────

export function patternCloze() {
  const cats = [cat("patterns"), cat("patterns-extra")].filter(Boolean);
  const out = [];
  const pool = cats.flatMap((c) =>
    c.items.flatMap((i) => (i.examples || []).flatMap((e) => e.highlights || [])),
  );

  cats.forEach((c) => {
    c.items.forEach((item) => {
      (item.examples || []).forEach((ex, i) => {
        const hl = (ex.highlights || [])[0];
        if (!hl) return;
        const full = clean(ex.jp);
        if (!full.includes(hl)) return;
        const question = full.replace(hl, BLANK);
        // Nhiễu: không được là chuỗi đã xuất hiện trong câu (tránh trùng hiển thị)
        const wrong = distractors(
          pool.filter((h) => h !== hl && !full.includes(h) && h.length <= hl.length + 3),
          hl,
          3,
        );
        if (wrong.length < 2) return;

        out.push({
          id: `${item.id}#${i}`,
          deck: "grammar",
          kind: "choice",
          prompt: "Chọn cách điền đúng vào chỗ trống",
          question,
          sub: `Mẫu: ${item.pattern}`,
          choices: mcChoices(hl, wrong),
          answer: hl,
          explanation: `${item.pattern} — ${item.meaning}. ${item.explanation || ""}`,
          translation: ex.vn,
          speak: full,
          tag: item.pattern,
        });
      });
    });
  });
  return out;
}

// ── Ngữ pháp: nhận dạng dạng chia (động từ & tính từ) ────────────────────────
// Phương án nhiễu là CÁC DẠNG KHÁC của chính từ đó → bài tập phân biệt dạng,
// dữ liệu 100% lấy từ bảng chia có sẵn.

const VERB_FORMS = [
  { key: "masu", label: "ます (hiện tại lịch sự)" },
  { key: "masen", label: "ません (phủ định)" },
  { key: "mashita", label: "ました (quá khứ)" },
  { key: "te", label: "て形 (thể て)" },
];

const ADJ_FORMS = [
  { key: "present", label: "hiện tại (です)" },
  { key: "negative", label: "phủ định" },
  { key: "past", label: "quá khứ" },
  { key: "te", label: "thể て" },
];

function conjugationItems(categoryId, forms, deck, tagPrefix) {
  const c = cat(categoryId);
  if (!c) return [];
  const out = [];

  c.items.forEach((group) => {
    (group.conjugations || []).forEach((row, ri) => {
      const dictKana = String(row.dict || "").split(" ")[0];
      forms.forEach((f) => {
        const answer = row[f.key];
        if (!answer) return;
        const others = forms
          .filter((o) => o.key !== f.key && row[o.key] && row[o.key] !== answer)
          .map((o) => String(row[o.key]).split(" ")[0]);
        if (others.length < 2) return;

        out.push({
          id: `${group.id}#${ri}#${f.key}`,
          deck,
          kind: "choice",
          prompt: `Chia sang dạng ${f.label}`,
          question: row.dict,
          sub: row.meaning,
          choices: mcChoices(String(answer).split(" ")[0], others.slice(0, 3)),
          answer: String(answer).split(" ")[0],
          accept: [answer],
          explanation: `${group.title} · ${group.rule || ""}`.trim(),
          speak: dictKana,
          tag: `${tagPrefix} · ${f.label}`,
        });
      });
    });
  });
  return out;
}

export function verbConjugation() {
  return conjugationItems("verb-groups", VERB_FORMS, "grammar", "Chia động từ");
}

export function adjConjugation() {
  return conjugationItems("adjectives", ADJ_FORMS, "grammar", "Chia tính từ");
}

/** Gõ dạng chia của động từ (đáp án toàn kana nên gõ được không cần IME kanji). */
export function verbConjugationTyping() {
  const c = cat("verb-groups");
  if (!c) return [];
  const out = [];
  c.items.forEach((group) => {
    (group.conjugations || []).forEach((row, ri) => {
      VERB_FORMS.forEach((f) => {
        const answer = row[f.key];
        if (!answer || /[一-鿿]/.test(answer)) return; // chỉ lấy dạng thuần kana
        out.push({
          id: `type:${group.id}#${ri}#${f.key}`,
          deck: "grammar",
          kind: "type",
          prompt: `Gõ dạng ${f.label}`,
          question: row.dict,
          sub: row.meaning,
          answer,
          explanation: `${group.title} · ${group.rule || ""}`.trim(),
          speak: answer,
          tag: `Gõ ${f.label}`,
        });
      });
    });
  });
  return out;
}

// ── Từ vựng: điền từ vào câu ví dụ ───────────────────────────────────────────

export function vocabCloze() {
  const out = [];
  allVocab.forEach((w) => {
    const jp = w.example?.jp;
    if (!jp) return;
    // Chỉ dùng khi từ xuất hiện nguyên văn trong câu ví dụ.
    const target = jp.includes(w.japanese) ? w.japanese : w.kanji && jp.includes(w.kanji) ? w.kanji : null;
    if (!target) return;

    const sameCat = allVocab.filter(
      (o) => o.categoryId === w.categoryId && o.japanese !== w.japanese,
    );
    const wrong = distractors(
      (sameCat.length >= 3 ? sameCat : allVocab).filter((o) => !jp.includes(o.japanese)),
      target,
      3,
      (o) => o.japanese,
    ).map((o) => o.japanese);
    if (wrong.length < 2) return;

    out.push({
      id: w.id,
      deck: "vocab",
      kind: "choice",
      prompt: "Chọn từ đúng để hoàn thành câu",
      question: jp.replace(target, BLANK),
      sub: w.categoryLabel,
      choices: mcChoices(target, wrong),
      answer: target,
      explanation: `${w.japanese}${w.kanji ? ` (${w.kanji})` : ""} — ${w.meaning}`,
      translation: w.example.vn,
      speak: jp,
      tag: w.categoryLabel,
    });
  });
  return out;
}

/** Nghĩa tiếng Việt → chọn từ tiếng Nhật (chiều sản xuất, khó hơn nhận biết). */
export function vocabMeaningToWord() {
  return allVocab.map((w) => {
    const sameCat = allVocab.filter(
      (o) => o.categoryId === w.categoryId && o.japanese !== w.japanese,
    );
    const wrong = distractors(sameCat.length >= 3 ? sameCat : allVocab, w.japanese, 3, (o) => o.japanese)
      .map((o) => o.japanese);
    return {
      id: w.id,
      deck: "vocab",
      kind: "choice",
      prompt: "Từ tiếng Nhật nào mang nghĩa này?",
      question: w.meaning,
      sub: w.categoryLabel,
      choices: mcChoices(w.japanese, wrong),
      answer: w.japanese,
      explanation: `${w.japanese}${w.kanji ? ` (${w.kanji})` : ""} · ${w.romaji}`,
      translation: w.example?.vn,
      speak: w.japanese,
      tag: w.categoryLabel,
    };
  }).filter((q) => q.choices.length >= 3);
}

/** Nghĩa tiếng Việt → gõ từ tiếng Nhật (recall chủ động mạnh nhất). */
export function vocabTyping() {
  return allVocab.map((w) => ({
    id: `type:${w.id}`,
    deck: "vocab",
    kind: "type",
    prompt: "Gõ từ tiếng Nhật (kana hoặc romaji)",
    question: w.meaning,
    sub: w.categoryLabel,
    answer: w.japanese,
    accept: [w.kanji, w.romaji].filter(Boolean),
    explanation: `${w.japanese}${w.kanji ? ` (${w.kanji})` : ""} · ${w.romaji} — ${w.meaning}`,
    translation: w.example?.vn,
    speak: w.japanese,
    tag: w.categoryLabel,
  }));
}

// ── Số đếm: cách đọc bộ đếm, giờ, tháng, ngày, thứ ───────────────────────────

export function counterReadings() {
  const out = [];
  numbersData.counters.forEach((c) => {
    const readings = c.readings.map((r) => ({ ...r, read: stripWarn(r.read) }));
    readings.forEach((r) => {
      const wrong = distractors(
        readings.filter((o) => o.read !== r.read),
        r.read,
        3,
        (o) => o.read,
      ).map((o) => o.read);
      if (wrong.length < 2) return;
      const suffix = c.suffix.replace("〜", "");
      out.push({
        id: `cnt:${c.id}:${r.n}`,
        deck: "numbers",
        kind: "choice",
        prompt: `Bộ đếm ${c.suffix} — ${c.use}`,
        question: `${r.n}${suffix}`,
        sub: "Đọc thế nào?",
        choices: mcChoices(r.read, wrong),
        answer: r.read,
        explanation: c.note ? `${c.use} · ${c.note}` : c.use,
        translation: c.example,
        speak: r.read,
        tag: `Bộ đếm ${c.suffix}`,
      });
    });
  });
  return out;
}

function readingSet({ rows, idPrefix, deck, prompt, tag, questionOf, answerOf, subOf }) {
  const answers = rows.map((r) => stripWarn(answerOf(r)));
  return rows
    .map((r, i) => {
      const answer = stripWarn(answerOf(r));
      const wrong = distractors(answers.filter((a) => a !== answer), answer, 3);
      if (wrong.length < 2) return null;
      return {
        id: `${idPrefix}:${i}`,
        deck,
        kind: "choice",
        prompt,
        question: questionOf(r),
        sub: subOf ? subOf(r) : "Đọc thế nào?",
        choices: mcChoices(answer, wrong),
        answer,
        speak: answer,
        tag,
      };
    })
    .filter(Boolean);
}

export function hourReadings() {
  return readingSet({
    rows: numbersData.hours,
    idPrefix: "hour",
    deck: "numbers",
    prompt: "Giờ này đọc thế nào?",
    tag: "Giờ 〜時",
    questionOf: (h) => `${h.n}時`,
    answerOf: (h) => h.read,
  });
}

export function monthReadings() {
  return readingSet({
    rows: numbersData.months,
    idPrefix: "month",
    deck: "numbers",
    prompt: "Tháng này đọc thế nào?",
    tag: "Tháng 〜月",
    questionOf: (m) => m.jp,
    answerOf: (m) => m.read,
  });
}

export function dateReadings() {
  return readingSet({
    rows: numbersData.dates,
    idPrefix: "date",
    deck: "numbers",
    prompt: "Ngày này đọc thế nào? (phần bất quy tắc nhất của N5)",
    tag: "Ngày 〜日",
    questionOf: (d) => d.jp,
    answerOf: (d) => d.read,
    subOf: (d) => `ngày ${d.n}`,
  });
}

export function weekdayReadings() {
  const rows = numbersData.weekdays;
  return rows.map((d, i) => {
    const wrong = distractors(
      rows.filter((o) => o.vn !== d.vn),
      d.vn,
      3,
      (o) => o.vn,
    ).map((o) => o.vn);
    return {
      id: `wd:${i}`,
      deck: "numbers",
      kind: "choice",
      prompt: "Thứ mấy?",
      question: d.jp,
      sub: d.hira,
      choices: mcChoices(d.vn, wrong),
      answer: d.vn,
      explanation: d.kanji_meaning,
      speak: d.hira,
      tag: "Thứ trong tuần",
    };
  });
}

export function numberReadings() {
  return readingSet({
    rows: numbersData.numbers,
    idPrefix: "num",
    deck: "numbers",
    prompt: "Số này đọc thế nào?",
    tag: "Số cơ bản",
    questionOf: (n) => n.kanji,
    answerOf: (n) => n.hira,
    subOf: (n) => String(n.num.toLocaleString?.() ?? n.num),
  });
}

// ── Kanji: đảo chiều ─────────────────────────────────────────────────────────

const kanjiPool = kanjiData.kanji;

function kanjiSiblings(k) {
  const same = kanjiPool.filter((o) => o.category === k.category && o.id !== k.id);
  return same.length >= 3 ? same : kanjiPool.filter((o) => o.id !== k.id);
}

export function kanjiMeaningToChar() {
  return kanjiPool.map((k) => ({
    id: k.id,
    deck: "kanji",
    kind: "choice",
    prompt: "Kanji nào mang nghĩa này?",
    question: k.meaning,
    sub: `${k.stroke} nét`,
    choices: mcChoices(k.char, distractors(kanjiSiblings(k), k.char, 3, (o) => o.char).map((o) => o.char)),
    answer: k.char,
    explanation: `${k.char} — On: ${k.on} · Kun: ${k.kun}${k.mnemonic ? ` · ${k.mnemonic}` : ""}`,
    speak: k.examples?.[0]?.reading,
    tag: "Nghĩa → Kanji",
  }));
}

export function kanjiCharToMeaning() {
  return kanjiPool.map((k) => ({
    id: k.id,
    deck: "kanji",
    kind: "choice",
    prompt: "Kanji này nghĩa là gì?",
    question: k.char,
    sub: `${k.stroke} nét`,
    choices: mcChoices(
      k.meaning,
      distractors(kanjiSiblings(k), k.meaning, 3, (o) => o.meaning).map((o) => o.meaning),
    ),
    answer: k.meaning,
    explanation: `On: ${k.on} · Kun: ${k.kun}`,
    tag: "Kanji → Nghĩa",
  }));
}

export function kanjiReadingToChar() {
  return kanjiPool
    .map((k) => {
      const reading = (k.on || k.kun || "").split(/[、,]/)[0].trim();
      if (!reading) return null;
      // Loại các kanji cùng chia sẻ cách đọc này ra khỏi nhiễu (tránh 2 đáp án đúng).
      const pool = kanjiSiblings(k).filter(
        (o) => !`${o.on} ${o.kun}`.includes(reading.replace(/\(.*\)/, "")),
      );
      const wrong = distractors(pool, k.char, 3, (o) => o.char).map((o) => o.char);
      if (wrong.length < 2) return null;
      return {
        id: `read:${k.id}`,
        deck: "kanji",
        kind: "choice",
        prompt: "Kanji nào có cách đọc này?",
        question: reading,
        sub: k.on === reading ? "Âm On" : "Âm Kun",
        choices: mcChoices(k.char, wrong),
        answer: k.char,
        explanation: `${k.char} — ${k.meaning} · On: ${k.on} · Kun: ${k.kun}`,
        tag: "Cách đọc → Kanji",
      };
    })
    .filter(Boolean);
}

// ── Nghe (sinh từ chính data — dùng TTS thay vì file audio) ──────────────────

export function listenWordToMeaning() {
  return allVocab.map((w) => {
    const sameCat = allVocab.filter(
      (o) => o.categoryId === w.categoryId && o.meaning !== w.meaning,
    );
    const wrong = distractors(sameCat.length >= 3 ? sameCat : allVocab, w.meaning, 3, (o) => o.meaning)
      .map((o) => o.meaning);
    return {
      id: `lw:${w.id}`,
      deck: "listening",
      kind: "choice",
      prompt: "Nghe và chọn nghĩa đúng",
      question: null, // ẩn chữ — chỉ được nghe
      audio: w.japanese,
      reveal: `${w.japanese}${w.kanji ? ` (${w.kanji})` : ""} · ${w.romaji}`,
      choices: mcChoices(w.meaning, wrong),
      answer: w.meaning,
      explanation: `${w.japanese} — ${w.meaning}`,
      tag: `Nghe từ · ${w.categoryLabel}`,
    };
  }).filter((q) => q.choices.length >= 3);
}

export function listenSentenceToMeaning() {
  const rows = allVocab.filter((w) => w.example?.jp && w.example?.vn);
  return rows.map((w) => {
    const wrong = distractors(
      rows.filter((o) => o.example.vn !== w.example.vn),
      w.example.vn,
      3,
      (o) => o.example.vn,
    ).map((o) => o.example.vn);
    return {
      id: `ls:${w.id}`,
      deck: "listening",
      kind: "choice",
      prompt: "Nghe câu và chọn bản dịch đúng",
      question: null,
      audio: w.example.jp,
      reveal: w.example.jp,
      choices: mcChoices(w.example.vn, wrong),
      answer: w.example.vn,
      explanation: w.example.romaji || "",
      tag: "Nghe câu",
    };
  }).filter((q) => q.choices.length >= 3);
}

export function listenWordTyping() {
  return allVocab.map((w) => ({
    id: `lt:${w.id}`,
    deck: "listening",
    kind: "type",
    prompt: "Nghe rồi gõ lại (kana hoặc romaji)",
    question: null,
    audio: w.japanese,
    reveal: `${w.japanese} · ${w.romaji}`,
    answer: w.japanese,
    accept: [w.romaji].filter(Boolean),
    explanation: `${w.japanese} — ${w.meaning}`,
    tag: "Nghe · chép chính tả",
  }));
}

export function listenKana() {
  const rows = [
    ...(kanaData.hiragana?.basic || []),
    ...(kanaData.hiragana?.dakuten || []),
    ...(kanaData.hiragana?.yoon || []),
  ].filter((c) => c.char && c.romaji);
  return rows.map((c) => ({
    id: `lk:${c.char}`,
    deck: "listening",
    kind: "type",
    prompt: "Nghe âm và gõ romaji",
    question: null,
    audio: c.char,
    reveal: `${c.char} · ${c.romaji}`,
    answer: c.char,
    accept: [c.romaji],
    explanation: `${c.char} = ${c.romaji}`,
    tag: "Nghe kana",
  }));
}

// ── Danh mục bộ luyện tập (UI đọc từ đây) ────────────────────────────────────

export const QUIZ_SETS = [
  // Ngữ pháp
  { id: "particles", tab: "grammar", deck: "grammar", icon: "🔗", label: "Điền trợ từ", desc: "Chọn trợ từ đúng cho câu — sinh từ 30 ví dụ có sẵn", gen: particleCloze },
  { id: "patterns", tab: "grammar", deck: "grammar", icon: "🧩", label: "Điền mẫu câu", desc: "Cloze theo phần được tô sáng trong 116 ví dụ mẫu câu", gen: patternCloze },
  { id: "verb-conj", tab: "grammar", deck: "grammar", icon: "🔄", label: "Nhận dạng chia động từ", desc: "Phân biệt ます / ません / ました / て của cùng một động từ", gen: verbConjugation },
  { id: "verb-type", tab: "grammar", deck: "grammar", icon: "⌨️", label: "Gõ dạng chia động từ", desc: "Tự gõ dạng chia — recall chủ động", gen: verbConjugationTyping },
  { id: "adj-conj", tab: "grammar", deck: "grammar", icon: "🎨", label: "Chia tính từ い/な", desc: "Phân biệt các dạng của tính từ", gen: adjConjugation },

  // Số đếm
  { id: "counters", tab: "numbers", deck: "numbers", icon: "📦", label: "Cách đọc bộ đếm", desc: "12 bộ đếm × 10 số — gồm mọi trường hợp biến âm", gen: counterReadings },
  { id: "dates", tab: "numbers", deck: "numbers", icon: "🗓️", label: "Ngày trong tháng", desc: "Phần bất quy tắc nhất — mùng 1–10, 14, 20, 24", gen: dateReadings },
  { id: "hours", tab: "numbers", deck: "numbers", icon: "⏰", label: "Giờ 〜時", desc: "Chú ý 4時 / 7時 / 9時", gen: hourReadings },
  { id: "months", tab: "numbers", deck: "numbers", icon: "📅", label: "Tháng 〜月", desc: "12 tháng", gen: monthReadings },
  { id: "weekdays", tab: "numbers", deck: "numbers", icon: "🗓", label: "Thứ trong tuần", desc: "7 thứ theo tên nguyên tố", gen: weekdayReadings },
  { id: "digits", tab: "numbers", deck: "numbers", icon: "🔢", label: "Số cơ bản", desc: "Cách đọc các số nền tảng", gen: numberReadings },

  // Từ vựng
  { id: "vocab-cloze", tab: "vocabulary", deck: "vocab", icon: "✏️", label: "Điền từ vào câu", desc: "Sinh từ 459 câu ví dụ có chứa chính từ đó", gen: vocabCloze },
  { id: "vocab-vn-jp", tab: "vocabulary", deck: "vocab", icon: "🔁", label: "Nghĩa → chọn từ", desc: "Chiều ngược, khó hơn nhận biết", gen: vocabMeaningToWord },
  { id: "vocab-type", tab: "vocabulary", deck: "vocab", icon: "⌨️", label: "Nghĩa → gõ từ", desc: "Recall chủ động, chấp nhận kana hoặc romaji", gen: vocabTyping },

  // Kanji
  { id: "kanji-mean-char", tab: "kanji", deck: "kanji", icon: "🔎", label: "Nghĩa → chọn Kanji", desc: "Đảo chiều so với flashcard", gen: kanjiMeaningToChar },
  { id: "kanji-char-mean", tab: "kanji", deck: "kanji", icon: "🈳", label: "Kanji → chọn nghĩa", desc: "Kiểm tra nhanh 103 kanji", gen: kanjiCharToMeaning },
  { id: "kanji-read-char", tab: "kanji", deck: "kanji", icon: "🔉", label: "Cách đọc → chọn Kanji", desc: "Luyện âm On/Kun", gen: kanjiReadingToChar },

  // Nghe
  { id: "listen-word", tab: "listening", deck: "listening", icon: "🎧", label: "Nghe từ → chọn nghĩa", desc: "580 từ, phát bằng giọng đọc tiếng Nhật", gen: listenWordToMeaning },
  { id: "listen-sentence", tab: "listening", deck: "listening", icon: "💬", label: "Nghe câu → chọn nghĩa", desc: "580 câu ví dụ", gen: listenSentenceToMeaning },
  { id: "listen-type", tab: "listening", deck: "listening", icon: "📝", label: "Nghe → chép lại", desc: "Chính tả: gõ lại từ vừa nghe", gen: listenWordTyping },
  { id: "listen-kana", tab: "listening", deck: "listening", icon: "🔤", label: "Nghe kana", desc: "Nhận âm từng chữ kana", gen: listenKana },
];

export const quizSetsFor = (tab) => QUIZ_SETS.filter((s) => s.tab === tab);
export const quizSetById = (id) => QUIZ_SETS.find((s) => s.id === id);

/** Sinh câu hỏi cho một bộ; trả về [] nếu bộ không tồn tại. */
export function buildQuiz(setId) {
  const set = quizSetById(setId);
  if (!set) return [];
  try {
    return set.gen() || [];
  } catch {
    return [];
  }
}
