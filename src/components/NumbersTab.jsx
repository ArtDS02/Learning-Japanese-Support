import { useState } from "react";
import data from "../data/numbers.json";
import { kanaToRomaji } from "../lib/romaji";
import { getStats } from "../lib/srs";
import { quizSetsFor, buildQuiz } from "../lib/quizgen";
import QuizHub from "./common/QuizHub";
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
                <div className="num-cell__hira">{n.hira}</div>
                <div className="num-cell__romaji">{n.romaji}</div>
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
                      <div className={`num-ex__hira ${warn ? "is-warn" : ""}`}>{hira}</div>
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
                </div>
                {counter.note && <div className="num-counter__note">{counter.note}</div>}
                <div className="num-grid num-grid--reading">
                  {counter.readings.map((r, i) => {
                    const warn = r.read.includes("⚠️");
                    const read = r.read.replace(" ⚠️", "");
                    return (
                      <div key={i} className={`num-reading ${warn ? "num-reading--warn" : ""}`}>
                        <div className="num-reading__n">{r.n}</div>
                        <div className="num-reading__read">{read}</div>
                        <div className="num-reading__romaji">{kanaToRomaji(read)}</div>
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
                  <div className={`num-cell__read ${warn ? "is-warn" : ""}`}>{h.read.replace(" ⚠️", "")}</div>
                  <div className="num-cell__romaji">{h.romaji}</div>
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
                  <div className="num-ex__read">{ex.read}</div>
                  <div className="num-ex__vn">{ex.vn}</div>
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
                  <div className={`num-cell__read ${warn ? "is-warn" : ""}`}>{read}</div>
                  <div className="num-cell__romaji">{kanaToRomaji(read)}</div>
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
                <div className={`num-cell__read ${d.special ? "is-warn" : ""}`}>{d.read}</div>
                <div className="num-cell__romaji">{kanaToRomaji(d.read)}</div>
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
                  <span className="num-qword__use">{q.use}</span>
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
                <div className="num-cell__hira">{d.hira}</div>
                <div className="num-cell__romaji">{d.romaji}</div>
                <div className="num-cell__vn">{d.vn}</div>
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
                  <div className="num-ex__read">{ex.hira}</div>
                  <div className="num-ex__vn">{ex.vn}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
