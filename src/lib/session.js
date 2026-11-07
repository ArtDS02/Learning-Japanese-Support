// Phiên "Học hôm nay" — trộn mọi deck thành một hàng đợi duy nhất.
//
// Vấn đề trước đó: mở app là rơi vào tab cũ với 580 từ trước mặt, không biết
// bắt đầu từ đâu. Ở đây gom lại theo đúng nguyên tắc SRS:
//
//   1. Thẻ tới hạn (mọi deck) — ưu tiên cao nhất
//   2. Câu sai trong Sổ tay lỗi đã tới hạn
//   3. Thẻ mới, giới hạn theo cài đặt `newPerDay` (hoặc con số tự tính theo ngày
//      thi khi bật `autoNewPerDay`) — tính theo NGÀY (đã mở bao nhiêu thẻ mới
//      hôm nay thì trừ đi), không phải theo từng phiên.
//   4. Thẻ tới hạn của ngữ pháp / số đếm / nghe / từ bổ nghĩa — dựng ở
//      lib/sessionExtra.js (nặng) và được phía gọi truyền vào qua `extra`.
//
// Mọi phần tử đều theo shape chung của StudyRunner: kind "flash" | "choice" | "type".

import vocabData from "../data/vocabulary.json";
import kanjiData from "../data/kanji.json";
import kanaData from "../data/kana.json";
import { dueItems, newItems, getCard, getStatus, newIntroducedToday } from "./srs";
import { loadSettings, customAsWords } from "./userdata";
import { dayKey, dayDiff } from "./storage";
import { shuffle } from "./random";

// Chủ ý KHÔNG import examStore ở đây: file đó kéo theo ~186KB dữ liệu 6 bộ đề,
// mà module này lại được trang chủ dùng ngay khi mở app. Câu sai (mistakes) được
// truyền vào từ phía gọi, nơi đã nạp examStore sẵn.

// ── Nguồn thẻ của từng deck ──────────────────────────────────────────────────

export function vocabPool() {
  return [
    ...vocabData.categories.flatMap((c) =>
      c.words.map((w) => ({
        ...w,
        categoryId: c.id,
        categoryLabel: c.label,
        categoryColor: c.color,
      })),
    ),
    ...customAsWords(),
  ];
}

export function kanaPool() {
  const out = [];
  const push = (rows, script) => {
    (rows || []).forEach((c) => {
      if (c.char && c.romaji) out.push({ ...c, script });
    });
  };
  push(kanaData.hiragana?.basic, "hiragana");
  push(kanaData.hiragana?.dakuten, "hiragana");
  push(kanaData.hiragana?.yoon, "hiragana");
  push(kanaData.katakana?.basic, "katakana");
  push(kanaData.katakana?.dakuten, "katakana");
  push(kanaData.katakana?.yoon, "katakana");
  push(kanaData.katakana?.extended, "katakana");
  return out;
}

export const kanjiPool = () => kanjiData.kanji;

// ── Chuẩn hoá về thẻ học ─────────────────────────────────────────────────────

/**
 * `reverse` = chiều sản xuất (nghĩa tiếng Việt → từ tiếng Nhật). Nhớ ra được từ
 * khó hơn nhận ra nghĩa, nên đây là chiều ôn hiệu quả hơn khi đã quen thẻ.
 */
export function vocabCard(w, { reverse = false } = {}) {
  const base = {
    deck: "vocab",
    id: w.id,
    kind: "flash",
    tab: "vocabulary",
    example: w.example || null,
    speak: w.japanese,
    tag: w.categoryLabel,
    color: w.categoryColor,
    noteKind: "vocab",
  };
  if (reverse) {
    return {
      ...base,
      front: w.meaning,
      frontSub: w.categoryLabel,
      back: w.japanese,
      backSub: [w.kanji, w.romaji].filter(Boolean).join(" · ") || null,
      speak: null, // không đọc trước khi lật, kẻo lộ đáp án
    };
  }
  return {
    ...base,
    front: w.japanese,
    frontSub: [w.kanji, w.romaji].filter(Boolean).join(" · "),
    back: w.meaning,
    backSub: w.note || null,
  };
}

export function kanjiCard(k) {
  return {
    deck: "kanji",
    id: k.id,
    kind: "flash",
    tab: "kanji",
    front: k.char,
    frontSub: `${k.stroke} nét`,
    back: k.hanviet ? `${k.meaning} (${k.hanviet})` : k.meaning,
    backSub: `On: ${k.on} · Kun: ${k.kun}`,
    extra: (k.examples || []).map((e) => `${e.word} (${e.reading}) — ${e.meaning}`),
    mnemonic: k.mnemonic,
    speak: k.examples?.[0]?.reading || null,
    tag: "Kanji",
    noteKind: "kanji",
  };
}

export function kanaCard(c) {
  return {
    deck: "kana",
    id: c.char,
    kind: "flash",
    tab: "kana",
    front: c.char,
    frontSub: c.script === "katakana" ? "Katakana" : "Hiragana",
    back: c.romaji,
    speak: c.char,
    tag: "Kana",
    noteKind: "kana",
  };
}

/** Câu sai trong đề → item dạng chọn đáp án, dùng lại đúng dữ liệu câu hỏi gốc. */
export function mistakeCard(entry) {
  const q = entry.q;
  return {
    deck: "exam",
    id: entry.qid,
    kind: "choice",
    tab: "exercises",
    prompt: `Câu sai · ${entry.sectionTitle}`,
    question: q.sentence || q.question || q.script,
    choices: q.choices,
    answer: q.answer,
    explanation: q.explanation,
    translation: q.translation || q.fullSentence,
    speak: q.sentence || q.script || null,
    tag: entry.examId,
    color: entry.sectionColor,
  };
}

// ── Dựng phiên ───────────────────────────────────────────────────────────────

// ── Đếm ngược ngày thi ───────────────────────────────────────────────────────

// Trần của số thẻ mới tự tính: ngày thi quá gần mà còn nhiều thẻ thì công thức có
// thể ra vài trăm thẻ/ngày — mở chừng đó là ngày mai ngập thẻ ôn, phản tác dụng.
export const AUTO_NEW_CAP = 40;

/** Số thẻ chưa học của đúng tập mà phiên hôm nay mở thẻ mới (vocab + kanji + kana). */
function unlearnedCount() {
  return (
    newItems(vocabPool(), "vocab", (w) => w.id).length +
    newItems(kanjiPool(), "kanji", (k) => k.id).length +
    newItems(kanaPool(), "kana", (c) => c.char).length
  );
}

/**
 * Kế hoạch theo ngày thi: còn bao nhiêu ngày, cần mở bao nhiêu thẻ mới mỗi ngày.
 * Trả về null khi chưa đặt ngày thi hoặc ngày thi đã tới / đã qua (khỏi hiện
 * đếm ngược, và không bao giờ chia cho 0).
 *
 *   cần = ceil(thẻ_chưa_học / max(1, ngày_còn − ngày_dự_phòng_ôn))
 *   ngày_dự_phòng_ôn = min(14, 20% ngày_còn)  — mấy ngày cuối chỉ ôn, không học mới.
 *
 * `ngày_còn` tính cả hôm nay (thi ngày mai ⇒ còn 1 ngày học là hôm nay).
 * Thẻ chưa học lấy theo ĐẦU NGÀY (cộng lại số thẻ đã mở hôm nay): nếu không, học
 * xong vài thẻ là con số "cần/ngày" tụt theo và hạn mức hôm nay bị tính hụt.
 * `unlearned` cho phép phía gọi truyền số đã đếm sẵn để khỏi duyệt pool lần nữa.
 */
export function examPlan(settings = loadSettings(), unlearned = unlearnedCount()) {
  const examDate = settings.examDate;
  if (!examDate || !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) return null;
  const daysLeft = dayDiff(examDate, dayKey());
  if (!(daysLeft > 0)) return null; // NaN (ngày hỏng) cũng rơi vào đây
  const buffer = Math.min(14, Math.floor(daysLeft * 0.2));
  const learnDays = Math.max(1, daysLeft - buffer);
  const perDay = Math.ceil((unlearned + newIntroducedToday()) / learnDays);
  return {
    examDate,
    daysLeft,
    buffer,
    learnDays,
    unlearned,
    perDay,
    quota: Math.min(AUTO_NEW_CAP, perDay),
    capped: perDay > AUTO_NEW_CAP,
  };
}

/**
 * Số thẻ mới mỗi ngày đang áp dụng: con số tự tính theo ngày thi nếu bật
 * `autoNewPerDay` và có ngày thi hợp lệ, ngược lại là `newPerDay` người học chọn.
 */
export function newPerDayFor(settings = loadSettings(), plan) {
  if (settings.autoNewPerDay) {
    const p = plan === undefined ? examPlan(settings) : plan;
    if (p) return p.quota;
  }
  return settings.newPerDay || 0;
}

/** Số thẻ mới còn được mở trong hôm nay. */
export function newQuotaLeft(settings = loadSettings(), plan) {
  return Math.max(0, newPerDayFor(settings, plan) - newIntroducedToday());
}

/**
 * Tổng quan hôm nay — dùng cho khối "Học hôm nay" ở trang chủ.
 * Không dựng hàng đợi, chỉ đếm (nhẹ, gọi được mỗi lần render).
 * `mistakes` là kết quả examStore.mistakeEntries(), `extra` là
 * sessionExtra.extraDueCards() — cả hai do phía gọi truyền vào.
 */
export function todayOverview({ mistakes = [], extra = [] } = {}) {
  const s = loadSettings();
  const vocab = vocabPool();
  const kanji = kanjiPool();
  const kana = kanaPool();

  const dueVocab = dueItems(vocab, "vocab", (w) => w.id).length;
  const dueKanji = dueItems(kanji, "kanji", (k) => k.id).length;
  const dueKana = dueItems(kana, "kana", (c) => c.char).length;
  const dueMistakes = mistakes.filter((m) => m.due).length;

  const newVocab = newItems(vocab, "vocab", (w) => w.id).length;
  const newKanji = newItems(kanji, "kanji", (k) => k.id).length;
  const newKana = newItems(kana, "kana", (c) => c.char).length;

  const breakdown = {
    vocab: { due: dueVocab, new: newVocab },
    kanji: { due: dueKanji, new: newKanji },
    kana: { due: dueKana, new: newKana },
    exam: { due: dueMistakes, new: 0 },
  };
  extra.forEach((c) => {
    breakdown[c.deck] ??= { due: 0, new: 0 };
    breakdown[c.deck].due += 1;
  });

  const due = dueVocab + dueKanji + dueKana + dueMistakes + extra.length;
  const plan = examPlan(s, newVocab + newKanji + newKana);
  const fresh = Math.min(newQuotaLeft(s, plan), newVocab + newKanji + newKana);

  return {
    due,
    new: fresh,
    total: due + fresh,
    breakdown,
    plan, // examPlan() — null khi chưa đặt ngày thi / ngày thi đã qua
    newPerDay: newPerDayFor(s, plan),
    // ~6 giây/thẻ là nhịp trung bình của một phiên flashcard
    minutes: Math.max(1, Math.round(((due + fresh) * 6) / 60)),
  };
}

/**
 * Dựng hàng đợi cho phiên học hôm nay.
 * opts: { includeNew, newLimit, decks: ["vocab","kanji",…] (bỏ trống = mọi deck),
 *         max, mistakes, extra }
 */
export function buildTodaySession(opts = {}) {
  const s = loadSettings();
  const has = (deck) => !opts.decks || opts.decks.includes(deck);
  const newLimit = opts.newLimit ?? newQuotaLeft(s);
  const includeNew = opts.includeNew !== false;
  const mistakes = opts.mistakes || [];
  const extra = opts.extra || [];

  const dueCards = [];
  const newCards = [];

  if (has("vocab")) {
    const pool = vocabPool();
    dueCards.push(...dueItems(pool, "vocab", (w) => w.id).map(vocabCard));
    if (includeNew) newCards.push(...newItems(pool, "vocab", (w) => w.id).map(vocabCard));
  }
  if (has("kanji")) {
    const pool = kanjiPool();
    dueCards.push(...dueItems(pool, "kanji", (k) => k.id).map(kanjiCard));
    if (includeNew) newCards.push(...newItems(pool, "kanji", (k) => k.id).map(kanjiCard));
  }
  if (has("kana")) {
    const pool = kanaPool();
    dueCards.push(...dueItems(pool, "kana", (c) => c.char).map(kanaCard));
    if (includeNew) newCards.push(...newItems(pool, "kana", (c) => c.char).map(kanaCard));
  }
  if (has("exam")) {
    dueCards.push(...mistakes.filter((m) => m.due).map(mistakeCard));
  }
  dueCards.push(...extra.filter((c) => has(c.deck)));

  // Thẻ tới hạn: box thấp & quá hạn lâu lên trước.
  dueCards.sort((a, b) => {
    const ca = getCard(a.deck, a.id);
    const cb = getCard(b.deck, b.id);
    return (ca.box || 0) - (cb.box || 0);
  });

  const fresh = shuffle(newCards).slice(0, Math.max(0, newLimit));
  // Trộn thẻ mới rải rác vào giữa để phiên học không nhàm.
  const queue = interleave(dueCards, fresh);
  return opts.max ? queue.slice(0, opts.max) : queue;
}

/** Rải `b` đều vào `a` (không xáo mất thứ tự ưu tiên của `a`). */
function interleave(a, b) {
  if (!b.length) return a;
  if (!a.length) return b;
  const out = [];
  const step = Math.max(1, Math.floor(a.length / b.length));
  let bi = 0;
  a.forEach((item, i) => {
    out.push(item);
    if (i > 0 && i % step === 0 && bi < b.length) out.push(b[bi++]);
  });
  while (bi < b.length) out.push(b[bi++]);
  return out;
}

/**
 * Phiên chỉ gồm những thẻ hay quên nhất (dùng ở tab Tiến độ).
 * `mistakeList` = examStore.mistakeEntries() do phía gọi truyền vào.
 */
export function buildHardSession(rows, mistakeList = []) {
  const vocab = new Map(vocabPool().map((w) => [String(w.id), w]));
  const kanji = new Map(kanjiPool().map((k) => [String(k.id), k]));
  const kana = new Map(kanaPool().map((c) => [c.char, c]));
  const mistakes = new Map(mistakeList.map((m) => [m.qid, m]));

  return rows
    .map(({ deck, id }) => {
      if (deck === "vocab" && vocab.has(String(id))) return vocabCard(vocab.get(String(id)));
      if (deck === "kanji" && kanji.has(String(id))) return kanjiCard(kanji.get(String(id)));
      if (deck === "kana" && kana.has(String(id))) return kanaCard(kana.get(String(id)));
      if (deck === "exam" && mistakes.has(String(id))) return mistakeCard(mistakes.get(String(id)));
      return null;
    })
    .filter(Boolean);
}

/** Nội dung của một thẻ SRS bất kỳ (để hiện trong danh sách "hay quên nhất"). */
export function describeCard(deck, id, mistakeList = []) {
  if (deck === "vocab") {
    const w = vocabPool().find((x) => String(x.id) === String(id));
    return w ? { title: w.japanese, sub: w.meaning } : null;
  }
  if (deck === "kanji") {
    const k = kanjiPool().find((x) => String(x.id) === String(id));
    return k ? { title: k.char, sub: k.meaning } : null;
  }
  if (deck === "kana") {
    const c = kanaPool().find((x) => x.char === id);
    return c ? { title: c.char, sub: c.romaji } : null;
  }
  if (deck === "exam") {
    const m = mistakeList.find((x) => x.qid === String(id));
    return m ? { title: m.q.sentence || m.q.question || m.qid, sub: m.sectionTitle } : null;
  }
  return null;
}

/** Đếm nhanh trạng thái một deck theo pool tương ứng. */
export function deckPoolStats(deck) {
  const pool =
    deck === "vocab" ? vocabPool() : deck === "kanji" ? kanjiPool() : deck === "kana" ? kanaPool() : [];
  const idOf = deck === "kana" ? (c) => c.char : (x) => x.id;
  let mastered = 0;
  let learning = 0;
  pool.forEach((it) => {
    const st = getStatus(getCard(deck, idOf(it)));
    if (st === "mastered") mastered += 1;
    else if (st === "learning") learning += 1;
  });
  return { total: pool.length, mastered, learning, new: pool.length - mastered - learning };
}
