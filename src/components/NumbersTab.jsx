import { useState, useMemo, useEffect } from "react";
import data from "../data/numbers.json";
import { kanaToRomaji } from "../lib/romaji";
import { getStats, orderForStudy } from "../lib/srs";
import { shuffle } from "../lib/random";
import { quizSetsFor, buildQuiz } from "../lib/quizgen";
import QuizHub from "./common/QuizHub";
import StudyRunner from "./common/StudyRunner";
import SpeakButton from "./common/SpeakButton";
import "../styles/tabs/numbers.css";

const SECTIONS = [
  { id: "numbers", label: "🔢 Số cơ bản", color: "#facc15" },
  { id: "counters", label: "📦 Bộ đếm", color: "#22d3ee" },
  { id: "time", label: "⏰ Giờ & Phút", color: "#f472b6" },
  { id: "calendar", label: "📅 Tháng & Ngày", color: "#a78bfa" },
  { id: "weekdays", label: "🗓️ Thứ", color: "#60a5fa" },
  { id: "rules", label: "💡 Quy tắc & Mẹo", color: "#34d399" },
];

const COMBO_NUMBERS = [
  { n: "11", jp: "十一", hira: "じゅういち" },
  { n: "20", jp: "二十", hira: "にじゅう" },
  { n: "35", jp: "三十五", hira: "さんじゅうご" },
  { n: "100", jp: "百", hira: "ひゃく" },
  { n: "200", jp: "二百", hira: "にひゃく" },
  { n: "300", jp: "三百", hira: "さんびゃく ⚠️" },
  { n: "600", jp: "六百", hira: "ろっぴゃく ⚠️" },
  { n: "1000", jp: "千", hira: "せん" },
  { n: "3000", jp: "三千", hira: "さんぜん ⚠️" },
  { n: "8000", jp: "八千", hira: "はっせん ⚠️" },
  { n: "10000", jp: "一万", hira: "いちまん" },
  { n: "50000", jp: "五万", hira: "ごまん" },
];

const TIME_PHRASES = [
  { jp: "3時15分", read: "さんじ じゅうごふん", vn: "3 giờ 15 phút" },
  { jp: "7時半", read: "しちじ はん", vn: "7 giờ rưỡi (半 = rưỡi)" },
  { jp: "午前9時", read: "ごぜん くじ", vn: "9 giờ sáng (午前 = AM)" },
  { jp: "午後6時", read: "ごご ろくじ", vn: "6 giờ chiều (午後 = PM)" },
  { jp: "今何時ですか", read: "いま なんじ ですか", vn: "Bây giờ mấy giờ?" },
];

const TIME_EXPR = [
  { jp: "今日", hira: "きょう", vn: "hôm nay" },
  { jp: "明日", hira: "あした", vn: "ngày mai" },
  { jp: "昨日", hira: "きのう", vn: "hôm qua" },
  { jp: "今週", hira: "こんしゅう", vn: "tuần này" },
  { jp: "来週", hira: "らいしゅう", vn: "tuần sau" },
  { jp: "先週", hira: "せんしゅう", vn: "tuần trước" },
  { jp: "今月", hira: "こんげつ", vn: "tháng này" },
  { jp: "来月", hira: "らいげつ", vn: "tháng sau" },
  { jp: "先月", hira: "せんげつ", vn: "tháng trước" },
  { jp: "今年", hira: "ことし", vn: "năm nay" },
  { jp: "来年", hira: "らいねん", vn: "năm sau" },
  { jp: "去年", hira: "きょねん", vn: "năm ngoái" },
  { jp: "毎日", hira: "まいにち", vn: "mỗi ngày" },
  { jp: "毎週", hira: "まいしゅう", vn: "mỗi tuần" },
  { jp: "毎月", hira: "まいつき", vn: "mỗi tháng" },
  { jp: "毎年", hira: "まいとし", vn: "mỗi năm" },
];

/* ── Thẻ lật ──────────────────────────────────────────────────────────────────
   Id thẻ CỐ Ý trùng id câu hỏi của lib/quizgen.js (num: / cnt: / hour: / month: /
   date: / wd:): cùng một kiến thức thì dùng chung một thẻ SRS, nên học flashcard
   và làm quiz cộng dồn vào cùng tiến độ. Các bộ chỉ có ở bảng (ghép số, cách nói
   giờ, biểu thức thời gian, từ để hỏi) dùng tiền tố riêng.
*/

const stripWarn = (s) => String(s || "").replace(/\s*⚠️/g, "").trim();

const flash = (card) => ({
  deck: "numbers",
  kind: "flash",
  noteKind: "numbers",
  color: "#facc15",
  ...card,
});

/**
 * Thẻ có đáp án LÀ cách đọc: chỉ cho nghe sau khi lật (`speakBack`), chứ nút
 * loa ở mặt trước thì bấm một cái là xong bài.
 */
const flashRead = ({ read, ...card }) => flash({ ...card, speakBack: read });

function digitCards() {
  return data.numbers.map((n, i) =>
    flashRead({
      id: `num:${i}`,
      front: n.kanji,
      frontSub: n.num.toLocaleString(),
      back: n.hira,
      backSub: n.romaji,
      read: n.hira.split("/")[0], // "し/よん" đọc máy nghe rất lạ — lấy cách đọc đầu
      tag: "Số cơ bản",
    }),
  );
}

function comboCards() {
  return COMBO_NUMBERS.map((ex, i) => {
    const hira = stripWarn(ex.hira);
    return flashRead({
      id: `combo:${i}`,
      front: ex.jp,
      frontSub: ex.n,
      back: hira,
      backSub: ex.hira.includes("⚠️") ? `${kanaToRomaji(hira)} · ⚠️ biến âm` : kanaToRomaji(hira),
      read: hira,
      tag: "Ghép số",
    });
  });
}

/** Nhận danh sách bộ đếm để dùng được cho cả nút flashcard trên từng bộ đếm. */
function counterCards(counters) {
  return counters.flatMap((c) =>
    c.readings.map((r) => {
      const read = stripWarn(r.read);
      return flashRead({
        id: `cnt:${c.id}:${r.n}`,
        front: `${r.n}${c.suffix.replace("〜", "")}`,
        frontSub: c.use,
        back: read,
        backSub: kanaToRomaji(read),
        extra: [c.example, c.note].filter(Boolean),
        read,
        tag: `Bộ đếm ${c.suffix}`,
        color: c.color,
      });
    }),
  );
}

function hourCards() {
  return data.hours.map((h, i) => {
    const read = stripWarn(h.read);
    return flashRead({
      id: `hour:${i}`,
      front: `${h.n}時`,
      frontSub: `${h.n} giờ`,
      back: read,
      backSub: h.read.includes("⚠️") ? `${h.romaji} · ⚠️ giờ đặc biệt` : h.romaji,
      read,
      tag: "Giờ 〜時",
      color: "#f472b6",
    });
  });
}

function timePhraseCards() {
  return TIME_PHRASES.map((ex, i) =>
    flashRead({
      id: `tphrase:${i}`,
      front: ex.jp,
      back: ex.vn,
      backSub: ex.read,
      read: ex.read,
      tag: "Cách nói giờ",
      color: "#f472b6",
    }),
  );
}

function monthCards() {
  return data.months.map((m, i) => {
    const read = stripWarn(m.read);
    return flashRead({
      id: `month:${i}`,
      front: m.jp,
      frontSub: `tháng ${m.n}`,
      back: read,
      backSub: m.read.includes("⚠️")
        ? `${kanaToRomaji(read)} · ⚠️ biến âm`
        : kanaToRomaji(read),
      read,
      tag: "Tháng 〜月",
      color: "#a78bfa",
    });
  });
}

function dateCards() {
  return data.dates.map((d, i) =>
    flashRead({
      id: `date:${i}`,
      front: d.jp,
      frontSub: `ngày ${d.n}`,
      back: d.read,
      backSub: d.special
        ? `${kanaToRomaji(d.read)} · ⚠️ bất quy tắc, học thuộc lòng`
        : kanaToRomaji(d.read),
      read: d.read,
      tag: "Ngày 〜日",
      color: d.special ? "#f472b6" : "#facc15",
    }),
  );
}

function weekdayCards() {
  return data.weekdays.map((d, i) =>
    flashRead({
      id: `wd:${i}`,
      front: d.jp,
      back: d.vn,
      backSub: `${d.hira} · ${d.romaji} · ${d.kanji_meaning}`,
      read: d.hira,
      tag: "Thứ trong tuần",
      color: d.color,
    }),
  );
}

function timeExprCards() {
  return TIME_EXPR.map((ex, i) =>
    flashRead({
      id: `texpr:${i}`,
      front: ex.jp,
      back: ex.vn,
      backSub: `${ex.hira} · ${kanaToRomaji(ex.hira)}`,
      read: ex.hira,
      tag: "Biểu thức thời gian",
      color: "#60a5fa",
    }),
  );
}

function qwordCards() {
  return data.questionWords.map((q, i) =>
    flash({
      id: `qw:${i}`,
      front: q.q,
      frontSub: kanaToRomaji(q.q),
      back: q.use,
      speak: q.q.split(" / ")[0],
      tag: "Từ để hỏi",
      color: "#34d399",
    }),
  );
}

/** Bộ thẻ của từng phần — khớp với id trong SECTIONS. */
const FLASH_SETS = {
  numbers: () => [...digitCards(), ...comboCards()],
  counters: () => counterCards(data.counters),
  time: () => [...hourCards(), ...timePhraseCards()],
  calendar: () => [...monthCards(), ...dateCards()],
  weekdays: () => [...weekdayCards(), ...timeExprCards()],
  rules: () => qwordCards(),
};

/**
 * Phần đáp án ẩn được. Khi bật "Ẩn đáp án", nội dung thay bằng ••• và chỉ hiện
 * khi nhấn — tự kiểm tra ngay trên bảng, không cần vào phiên flashcard.
 * Tắt rồi bật lại nút ẩn để che lại toàn bộ.
 */
function Answer({ hidden, children }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    setShown(false);
  }, [hidden]);

  if (!hidden || shown) return <>{children}</>;

  return (
    <button
      type="button"
      className="num-mask"
      title="Nhấn để xem đáp án"
      onClick={(e) => {
        e.stopPropagation();
        setShown(true);
      }}
    >
      •••
    </button>
  );
}

/** Thanh luyện tập số đếm — sinh câu từ chính bảng cách đọc trong tab này. */
function NumbersPracticeBar({ open, onToggle }) {
  const sets = quizSetsFor("numbers");
  const totalQ = sets.reduce((a, s) => a + buildQuiz(s.id).length, 0);
  const allIds = sets.flatMap((s) => buildQuiz(s.id).map((q) => q.id));
  const stats = getStats("numbers", allIds);

  return (
    <div className="pbar pbar--yellow">
      <div className="pbar__info">
        <div className="pbar__title">🎯 Luyện cách đọc</div>
        <div className="pbar__sub">
          {totalQ} câu sinh từ bảng bộ đếm, giờ, tháng, ngày và thứ — bao gồm toàn bộ các trường hợp
          biến âm bất quy tắc (⚠️).
        </div>
        <div className="pbar__stats">
          <span style={{ color: "#34d399" }}>✅ {stats.mastered} thuộc</span>
          <span style={{ color: "#facc15" }}>📚 {stats.learning} đang học</span>
          {stats.due > 0 && <span style={{ color: "#22d3ee" }}>📅 {stats.due} tới hạn</span>}
        </div>
      </div>
      <button className={`pbar__btn ${open ? "is-on" : ""}`} onClick={onToggle}>
        {open ? "✕ Đóng" : "Bắt đầu luyện →"}
      </button>
    </div>
  );
}

export default function NumbersTab() {
  const [section, setSection] = useState("numbers");
  const [showQuiz, setShowQuiz] = useState(false);
  const [hideAnswers, setHideAnswers] = useState(false);
  const [study, setStudy] = useState(null); // { label, cards }

  const sectionCards = useMemo(() => FLASH_SETS[section](), [section]);
  const allCards = useMemo(() => Object.values(FLASH_SETS).flatMap((build) => build()), []);
  const current = SECTIONS.find((s) => s.id === section);
  const sectionStats = getStats("numbers", sectionCards.map((c) => c.id));

  const startStudy = (cards, label, { random = false } = {}) => {
    if (!cards.length) return;
    setStudy({
      label,
      cards: random ? shuffle(cards) : orderForStudy(cards, "numbers", (c) => c.id),
    });
  };

  if (study) {
    return (
      <StudyRunner
        items={study.cards}
        title={`🎴 ${study.label}`}
        subtitle="Space lật thẻ · chấm Quên / Mơ hồ / Nhớ — thẻ lên L4 là tính đã thuộc"
        color="#facc15"
        onExit={() => setStudy(null)}
      />
    );
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">🔢 Số đếm & Bộ đếm</h2>
        <p className="section-desc">Số đếm, bộ đếm, giờ, ngày tháng và quy tắc đọc số</p>
      </div>

      <NumbersPracticeBar open={showQuiz} onToggle={() => setShowQuiz((v) => !v)} />
      {showQuiz && <QuizHub tab="numbers" color="#facc15" onClose={() => setShowQuiz(false)} />}

      <div className="filter-bar">
        <span className="filter-label">Phần:</span>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            className={`filter-btn ${section === s.id ? "filter-btn--active" : ""}`}
            style={section === s.id ? { background: s.color, color: "#0a0b0f" } : {}}
            onClick={() => setSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Học phần đang xem: thẻ lật & tự kiểm tra ngay trên bảng */}
      <div className="num-tools">
        <button
          className="num-tool num-tool--go"
          style={{ "--c": current.color }}
          onClick={() => startStudy(sectionCards, `${current.label} · ${sectionCards.length} thẻ`)}
        >
          🎴 Học flashcard ({sectionCards.length} thẻ)
        </button>
        <button
          className="num-tool"
          title="Trộn thẻ của cả 6 phần vào một phiên"
          onClick={() => startStudy(allCards, `Trộn tất cả · ${allCards.length} thẻ`, { random: true })}
        >
          🔀 Trộn tất cả ({allCards.length})
        </button>
        <button
          className={`num-tool num-tool--mask ${hideAnswers ? "is-on" : ""}`}
          aria-pressed={hideAnswers}
          title="Che cách đọc & nghĩa trong bảng — nhấn ••• ở từng ô để tự kiểm tra"
          onClick={() => setHideAnswers((v) => !v)}
        >
          {hideAnswers ? "👀 Hiện đáp án" : "🙈 Ẩn đáp án"}
        </button>
        <span className="num-tools__stat">
          ✅ {sectionStats.mastered} thuộc · 📚 {sectionStats.learning} đang học
          {sectionStats.due > 0 ? ` · 📅 ${sectionStats.due} tới hạn` : ""}
        </span>
      </div>

      {/* Numbers */}
      {section === "numbers" && (
        <div>
          <div className="num-note">
            💡 Số 4 và 7 có 2 cách đọc: し/よん và しち/なな. Tùy ngữ cảnh mà chọn cách đọc phù hợp!
          </div>
          <div className="num-grid num-grid--digits">
            {data.numbers.map((n, i) => (
              <div key={i} className="word-card num-cell" style={{ "--card-color": "#facc15", "--c": "#facc15", animationDelay: `${i * 40}ms` }}>
                <div className="num-cell__jp">{n.kanji}</div>
                <div className="num-cell__num">{n.num.toLocaleString()}</div>
                <Answer hidden={hideAnswers}>
                  <div className="num-cell__hira">{n.hira}</div>
                  <div className="num-cell__romaji">{n.romaji}</div>
                </Answer>
              </div>
            ))}
          </div>

          <div className="num-panel">
            <div className="num-panel__title">🔗 Ghép số — Ví dụ</div>
            <div className="num-grid num-grid--ex">
              {COMBO_NUMBERS.map((ex, i) => {
                const warn = ex.hira.includes("⚠️");
                const hira = ex.hira.replace(" ⚠️", "");
                return (
                  <div key={i} className="num-ex num-ex--row">
                    <div>
                      <div className="num-ex__jp">{ex.jp}</div>
                      <Answer hidden={hideAnswers}>
                        <div className={`num-ex__hira ${warn ? "is-warn" : ""}`}>{hira}</div>
                      </Answer>
                    </div>
                    <div className="num-ex__n">{ex.n}</div>
                  </div>
                );
              })}
            </div>
            <div className="num-note num-note--inline" style={{ "--c": "#f97316" }}>
              ⚠️ Chú ý biến âm: 三百=さんびゃく, 六百=ろっぴゃく, 八百=はっぴゃく, 三千=さんぜん, 八千=はっせん
            </div>
          </div>
        </div>
      )}

      {/* Counters */}
      {section === "counters" && (
        <div>
          <div className="num-note" style={{ "--c": "#22d3ee" }}>
            💡 Tiếng Nhật có nhiều "bộ đếm" (counter) khác nhau tùy theo loại vật đếm. Đây là điểm khó nhưng rất quan trọng!
          </div>
          <div className="num-counters-list">
            {data.counters.map((counter, ci) => (
              <div key={counter.id} className="word-card" style={{ "--card-color": counter.color, "--c": counter.color, animationDelay: `${ci * 80}ms` }}>
                <div className="num-counter__head">
                  <span className="num-counter__suffix">{counter.suffix}</span>
                  <div className="num-counter__use">{counter.use}</div>
                  <button
                    className="num-counter__go"
                    title={`Học riêng ${counter.readings.length} cách đọc của bộ đếm này`}
                    onClick={() =>
                      startStudy(counterCards([counter]), `Bộ đếm ${counter.suffix} · ${counter.use}`)
                    }
                  >
                    🎴 {counter.readings.length} thẻ
                  </button>
                </div>
                {counter.note && <div className="num-counter__note">{counter.note}</div>}
                <div className="num-grid num-grid--reading">
                  {counter.readings.map((r, i) => {
                    const warn = r.read.includes("⚠️");
                    const read = r.read.replace(" ⚠️", "");
                    return (
                      <div key={i} className={`num-reading ${warn ? "num-reading--warn" : ""}`}>
                        <div className="num-reading__n">{r.n}</div>
                        <Answer hidden={hideAnswers}>
                          <div className="num-reading__read">{read}</div>
                          <div className="num-reading__romaji">{kanaToRomaji(read)}</div>
                        </Answer>
                        <div className="num-reading__spk">
                          <SpeakButton text={read} size="sm" />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="num-counter__example">📝 {counter.example}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time: hours & minutes */}
      {section === "time" && (
        <div>
          <div className="num-note" style={{ "--c": "#f472b6" }}>
            💡 Giờ dùng 〜時 (じ), phút dùng 〜分 (ふん/ぷん — xem chi tiết ở mục 📦 Bộ đếm). Chú ý các giờ đặc biệt: 4時=よじ, 7時=しちじ, 9時=くじ.
          </div>

          <div className="num-subtitle" style={{ "--c": "#f472b6" }}>🕐 Giờ (〜時)</div>
          <div className="num-grid num-grid--hours">
            {data.hours.map((h, i) => {
              const warn = h.read.includes("⚠️");
              return (
                <div key={i} className="word-card num-cell" style={{ "--card-color": "#f472b6", "--c": "#f472b6", animationDelay: `${i * 30}ms` }}>
                  <div className="num-cell__jp">{h.n}時</div>
                  <Answer hidden={hideAnswers}>
                    <div className={`num-cell__read ${warn ? "is-warn" : ""}`}>{h.read.replace(" ⚠️", "")}</div>
                    <div className="num-cell__romaji">{h.romaji}</div>
                  </Answer>
                </div>
              );
            })}
          </div>

          <div className="num-panel num-panel--tight">
            <div className="num-panel__title" style={{ "--c": "#f472b6" }}>🧩 Cách nói giờ đầy đủ</div>
            <div className="num-grid num-grid--ex">
              {TIME_PHRASES.map((ex, i) => (
                <div key={i} className="num-ex">
                  <div className="num-ex__jp">
                    {ex.jp}
                    <SpeakButton text={ex.read} size="sm" />
                  </div>
                  <Answer hidden={hideAnswers}>
                    <div className="num-ex__read">{ex.read}</div>
                    <div className="num-ex__vn">{ex.vn}</div>
                  </Answer>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Calendar: months & dates */}
      {section === "calendar" && (
        <div>
          <div className="num-note" style={{ "--c": "#a78bfa" }}>
            💡 Tháng = số + 月 (がつ) — khá dễ. Nhưng <strong>ngày trong tháng</strong> (mùng 1–10, 20) đọc rất bất quy tắc — đây là phần khó nhất, cần học thuộc lòng!
          </div>

          <div className="num-subtitle" style={{ "--c": "#a78bfa" }}>📅 Tháng (〜月)</div>
          <div className="num-grid num-grid--cal">
            {data.months.map((m, i) => {
              const warn = m.read.includes("⚠️");
              const read = m.read.replace(" ⚠️", "");
              return (
                <div key={i} className="word-card num-cell" style={{ "--card-color": "#a78bfa", "--c": "#a78bfa", animationDelay: `${i * 25}ms` }}>
                  <div className="num-cell__jp">{m.jp}</div>
                  <Answer hidden={hideAnswers}>
                    <div className={`num-cell__read ${warn ? "is-warn" : ""}`}>{read}</div>
                    <div className="num-cell__romaji">{kanaToRomaji(read)}</div>
                  </Answer>
                </div>
              );
            })}
          </div>

          <div className="num-subtitle num-subtitle--gap" style={{ "--c": "#f97316" }}>🗓️ Ngày trong tháng (〜日)</div>
          <div className="num-note" style={{ "--c": "#f97316" }}>
            ⚠️ Mùng 1–10, 14, 20, 24 đọc đặc biệt (tô hồng). Các ngày còn lại = số + にち. VD: 15日 = じゅうごにち, 25日 = にじゅうごにち.
          </div>
          <div className="num-grid num-grid--cal">
            {data.dates.map((d, i) => (
              <div
                key={i}
                className={`word-card num-cell ${d.special ? "num-cell--warn" : ""}`}
                style={{ "--card-color": d.special ? "#f472b6" : "#facc15", "--c": d.special ? "#f472b6" : "#facc15", animationDelay: `${i * 25}ms` }}
              >
                <div className="num-cell__sub">ngày {d.n}</div>
                <div className="num-cell__jp">{d.jp}</div>
                <Answer hidden={hideAnswers}>
                  <div className={`num-cell__read ${d.special ? "is-warn" : ""}`}>{d.read}</div>
                  <div className="num-cell__romaji">{kanaToRomaji(d.read)}</div>
                </Answer>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rules & tips */}
      {section === "rules" && (
        <div>
          <div className="num-grid num-grid--rules">
            {data.rules.map((r, i) => (
              <div key={i} className="word-card num-rule" style={{ "--card-color": r.color, "--c": r.color, animationDelay: `${i * 50}ms` }}>
                <div className="num-rule__head">
                  <span className="num-rule__icon">{r.icon}</span>
                  <span className="num-rule__title">{r.title}</span>
                </div>
                <div className="num-rule__detail">{r.detail}</div>
              </div>
            ))}
          </div>

          <div className="num-panel">
            <div className="num-panel__title" style={{ "--c": "#34d399" }}>❓ Từ để hỏi số lượng (なん〜 / いく〜)</div>
            <div className="num-grid num-grid--qwords">
              {data.questionWords.map((q, i) => (
                <div key={i} className="num-qword">
                  <div className="num-qword__main">
                    <div className="num-qword__q">{q.q}</div>
                    <div className="num-qword__romaji">{kanaToRomaji(q.q)}</div>
                  </div>
                  <Answer hidden={hideAnswers}>
                    <span className="num-qword__use">{q.use}</span>
                  </Answer>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Weekdays */}
      {section === "weekdays" && (
        <div>
          <div className="num-note" style={{ "--c": "#a78bfa" }}>
            💡 7 ngày trong tuần dùng tên 7 nguyên tố: Trăng (月), Lửa (火), Nước (水), Cây (木), Vàng (金), Đất (土), Mặt trời (日). Rất dễ nhớ!
          </div>
          <div className="num-grid num-grid--week">
            {data.weekdays.map((d, i) => (
              <div key={i} className="word-card num-cell" style={{ "--card-color": d.color, "--c": d.color, animationDelay: `${i * 60}ms` }}>
                <div className="num-cell__jp">{d.jp}</div>
                <Answer hidden={hideAnswers}>
                  <div className="num-cell__hira">{d.hira}</div>
                  <div className="num-cell__romaji">{d.romaji}</div>
                  <div className="num-cell__vn">{d.vn}</div>
                </Answer>
                <div className="num-week__tag">{d.kanji_meaning}</div>
              </div>
            ))}
          </div>

          <div className="num-panel">
            <div className="num-panel__title" style={{ "--c": "#a78bfa" }}>📅 Biểu thức thời gian hay dùng</div>
            <div className="num-grid num-grid--ex">
              {TIME_EXPR.map((ex, i) => (
                <div key={i} className="num-ex">
                  <div className="num-ex__jp num-ex__jp--lg">{ex.jp}</div>
                  <Answer hidden={hideAnswers}>
                    <div className="num-ex__read">{ex.hira}</div>
                    <div className="num-ex__vn">{ex.vn}</div>
                  </Answer>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
