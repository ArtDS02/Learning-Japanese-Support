import { useState, useMemo } from "react";
import data from "../data/tips-exercises.json";
import { readJSON, writeJSON } from "../lib/storage";
import { deckPoolStats } from "../lib/session";
import { loadHistory } from "../lib/examStore";
import { lessonsOverview } from "../lib/lessons";
import { getStreak, totalReviews } from "../lib/progress";
import "../styles/tabs/studyplan.css";
import "../styles/tabs/studyplan-extra.css";

const { studyPlan } = data;
const CHECK_KEY = "studyplan_checks_v1";

/**
 * Các mốc lấy TỪ TIẾN ĐỘ THẬT (không phải tự khai).
 * Lộ trình 12 tuần bên dưới vẫn cần người học tự tick vì data không map tuần →
 * nội dung cụ thể; nhưng 4 mốc này thì đo được nên đo thẳng từ SRS.
 */
function useMilestones() {
  return useMemo(() => {
    const kana = deckPoolStats("kana");
    const vocab = deckPoolStats("vocab");
    const kanji = deckPoolStats("kanji");
    const history = loadHistory();
    const bestScore = history.reduce((a, h) => Math.max(a, h.score || 0), 0);
    const passed = history.filter((h) => h.pass).length;

    return [
      {
        id: "kana",
        icon: "🔤",
        label: "Thuộc bảng chữ cái",
        color: "#34d399",
        done: kana.mastered,
        total: kana.total,
        note: "Nền tảng — nên xong trong 2 tuần đầu",
      },
      {
        id: "vocab",
        icon: "📖",
        label: "Từ vựng đã thuộc",
        color: "#22d3ee",
        done: vocab.mastered,
        total: vocab.total,
        note: "N5 thật cần ~800 từ; app đang có bộ cốt lõi",
      },
      {
        id: "kanji",
        icon: "🈳",
        label: "Kanji đã thuộc",
        color: "#a78bfa",
        done: kanji.mastered,
        total: kanji.total,
        note: "N5 yêu cầu ~100 chữ",
      },
      {
        id: "exam",
        icon: "🎌",
        label: "Đề thi thử đã đạt",
        color: "#f97316",
        done: passed,
        total: Math.max(6, history.length || 6),
        note: bestScore
          ? `Điểm cao nhất: ${bestScore}/180 (cần ≥ 80)`
          : "Chưa thi thử lần nào",
      },
    ];
  }, []);
}

export default function StudyPlanTab({ onGoTo }) {
  const [checks, setChecks] = useState(() => readJSON(CHECK_KEY, {}));
  const milestones = useMilestones();
  const lessons = lessonsOverview();
  const streak = getStreak();
  const reviews = totalReviews();

  const toggle = (i) => {
    const next = { ...checks, [i]: !checks[i] };
    setChecks(next);
    writeJSON(CHECK_KEY, next);
  };

  const checkedCount = studyPlan.schedule.filter((_, i) => checks[i]).length;

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">🗓️ Lộ trình & Phương pháp</h2>
        <p className="section-desc">
          Kế hoạch học 3 tháng + phương pháp học hiệu quả nhất — nay gắn với tiến độ thật của bạn
        </p>
      </div>

      {/* ── Mốc đo được từ tiến độ thật ── */}
      <div className="spx-milestones">
        <div className="spx-head">
          <h3 className="spx-head__title">🎯 Bạn đang ở đâu (số liệu thật từ SRS)</h3>
          <span className="spx-head__meta">
            🔥 {streak} ngày liên tiếp · {reviews} lượt ôn · 📚 {lessons.done}/{lessons.total} bài từ vựng xong
          </span>
        </div>
        <div className="spx-grid">
          {milestones.map((m) => {
            const pct = m.total ? Math.round((m.done / m.total) * 100) : 0;
            return (
              <div key={m.id} className="spx-card" style={{ "--c": m.color }}>
                <div className="spx-card__top">
                  <span className="spx-card__icon">{m.icon}</span>
                  <span className="spx-card__pct">{pct}%</span>
                </div>
                <div className="spx-card__label">{m.label}</div>
                <div className="spx-card__nums">
                  {m.done}<span>/{m.total}</span>
                </div>
                <div className="spx-card__track">
                  <div className="spx-card__fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="spx-card__note">{m.note}</div>
              </div>
            );
          })}
        </div>
        {onGoTo && (
          <div className="spx-cta">
            <button className="spx-cta__btn" onClick={() => onGoTo("home")}>
              ▶ Mở phiên học hôm nay
            </button>
            <button className="spx-cta__btn spx-cta__btn--ghost" onClick={() => onGoTo("exercises")}>
              🎌 Thi thử một đề
            </button>
          </div>
        )}
      </div>

      {/* Methods */}
      <div className="sp-methods-head">
        <h3 className="sp-heading sp-heading--20 sp-heading--mb20" style={{ "--c": "var(--accent-violet)" }}>
          🧠 Phương pháp học hiệu quả
        </h3>
      </div>

      <div className="study-methods">
        {studyPlan.methods.map((m, i) => (
          <div
            key={m.id}
            className="method-card"
            style={{ "--card-color": m.color, animationDelay: `${i * 80}ms` }}
          >
            <span className="method-icon">{m.icon}</span>
            <div className="method-title">{m.title}</div>
            <div className="method-desc">{m.description}</div>

            <div className="method-tools-label">Công cụ đề xuất</div>
            <div className="method-tools">
              {m.tools.map((t, ti) => (
                <div key={ti} className="method-tool">
                  {t}
                </div>
              ))}
            </div>

            <div className="method-howto">{m.howTo}</div>
          </div>
        ))}
      </div>

      {/* Schedule */}
      <div className="sp-schedule-head">
        <h3 className="sp-heading sp-heading--20" style={{ "--c": "var(--accent-cyan)" }}>
          📅 Lộ trình 3 tháng (12 tuần)
        </h3>
        <p className="sp-schedule-sub">
          Bắt đầu từ con số 0, đủ để thi N5 trong 12 tuần nếu học đều đặn ·
          <strong> đã đánh dấu xong {checkedCount}/{studyPlan.schedule.length} giai đoạn</strong>
        </p>
      </div>

      <div className="sp-schedule-box">
        <div className="schedule-timeline">
          {studyPlan.schedule.map((item, i) => (
            <div
              key={i}
              className={`schedule-item ${checks[i] ? "spx-done" : ""}`}
              style={{ "--c": item.color, animationDelay: `${i * 60}ms` }}
            >
              <div className="schedule-item__dot" />
              <div className="schedule-item__week">{item.week}</div>
              <div className="schedule-item__body">
                <div className="schedule-item__focus">{item.focus}</div>
                <div className="schedule-item__goal">{item.goal}</div>
                <div className="schedule-item__daily">⏱ {item.daily}</div>
              </div>
              <button
                className={`spx-check ${checks[i] ? "is-on" : ""}`}
                onClick={() => toggle(i)}
                title={checks[i] ? "Bỏ đánh dấu hoàn thành" : "Đánh dấu đã hoàn thành"}
                aria-pressed={!!checks[i]}
              >
                {checks[i] ? "✓ Xong" : "Đánh dấu xong"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Daily routine suggestion */}
      <div className="sp-box sp-box--green">
        <h3 className="sp-heading sp-heading--18 sp-heading--mb16" style={{ "--c": "var(--accent-green)" }}>
          ☀️ Thói quen học hàng ngày (45 phút)
        </h3>
        <div className="sp-daily-list">
          {[
            { time: "5 phút", task: "Ôn Anki (flashcard từ vựng/kanji cũ)", color: "#facc15" },
            { time: "10 phút", task: "Học từ mới (10 từ/ngày theo chủ đề)", color: "#22d3ee" },
            { time: "10 phút", task: "Luyện ngữ pháp (1-2 cấu trúc mới)", color: "#a78bfa" },
            { time: "10 phút", task: "Nghe tiếng Nhật (podcast/anime N5)", color: "#f97316" },
            { time: "10 phút", task: "Viết câu ví dụ hoặc nhật ký ngắn", color: "#34d399" },
          ].map((r, i) => (
            <div key={i} className="sp-daily" style={{ "--c": r.color }}>
              <span className="sp-daily__time">{r.time}</span>
              <span className="sp-daily__task">{r.task}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Resources */}
      <div className="sp-box sp-box--yellow">
        <h3 className="sp-heading sp-heading--18 sp-heading--mb16" style={{ "--c": "var(--accent-yellow)" }}>
          📚 Tài nguyên học tập miễn phí
        </h3>
        <div className="sp-res-grid">
          {[
            { name: "Anki", desc: "Flashcard SRS miễn phí, tốt nhất cho từ vựng/kanji", icon: "🃏", color: "#60a5fa" },
            { name: "NHK Web Easy", desc: "Tin tức tiếng Nhật đơn giản, kèm furigana", icon: "📰", color: "#34d399" },
            { name: "Jisho.org", desc: "Từ điển Nhật-Anh tốt nhất, tra kanji được", icon: "🔍", color: "#a78bfa" },
            { name: "JLPT.jp", desc: "Đề thi mẫu chính thức từ Ban tổ chức JLPT", icon: "📝", color: "#f97316" },
            { name: "Tae Kim's Guide", desc: "Giáo trình ngữ pháp miễn phí, rất chi tiết", icon: "📖", color: "#f472b6" },
            { name: "WaniKani", desc: "Học kanji theo phương pháp SRS (có phí)", icon: "🦀", color: "#facc15" },
          ].map((r, i) => (
            <div key={i} className="sp-res" style={{ "--c": r.color }}>
              <div className="sp-res__icon">{r.icon}</div>
              <div className="sp-res__name">{r.name}</div>
              <div className="sp-res__desc">{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Closing motivation */}
      <div className="sp-closing">
        <div className="sp-closing__emoji">🎌</div>
        <div className="sp-closing__jp">がんばってください！</div>
        <div className="sp-closing__sub">Chúc bạn đạt điểm cao trong kỳ thi JLPT N5!</div>
        <div className="sp-closing__note">継続は力なり — Kiên trì là sức mạnh</div>
      </div>
    </div>
  );
}
