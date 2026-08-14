import { useMemo, useState } from "react";
import { quizSetsFor, buildQuiz, shuffle } from "../../lib/quizgen";
import { orderForStudy, getStats } from "../../lib/srs";
import StudyRunner from "./StudyRunner";
import "../../styles/common/quiz.css";

const SIZES = [10, 20, 50, 0]; // 0 = tất cả

/**
 * Khối "Luyện tập" dùng chung cho các tab có nội dung sinh được bài tập.
 * Bài tập được sinh từ chính data trong src/data (xem lib/quizgen.js), nên không
 * cần soạn thêm nội dung và không có nguy cơ sai ngữ pháp.
 */
export default function QuizHub({ tab, color = "#a78bfa", onClose }) {
  const sets = useMemo(() => quizSetsFor(tab), [tab]);
  const [setId, setSetId] = useState(null);
  const [size, setSize] = useState(20);
  const [srsFirst, setSrsFirst] = useState(true);
  const [runToken, setRunToken] = useState(0);

  // Đếm số câu mỗi bộ (sinh một lần để hiện lên thẻ chọn).
  const counts = useMemo(() => {
    const out = {};
    sets.forEach((s) => {
      out[s.id] = buildQuiz(s.id).length;
    });
    return out;
  }, [sets]);

  const activeSet = sets.find((s) => s.id === setId) || null;

  const items = useMemo(() => {
    if (!activeSet) return [];
    void runToken; // đổi token = dựng lại phiên mới
    const all = buildQuiz(activeSet.id);
    const ordered = srsFirst
      ? orderForStudy(all, activeSet.deck, (q) => q.id)
      : shuffle(all);
    return size > 0 ? ordered.slice(0, size) : ordered;
  }, [activeSet, size, srsFirst, runToken]);

  if (activeSet) {
    return (
      <StudyRunner
        items={items}
        title={`${activeSet.icon} ${activeSet.label}`}
        subtitle={srsFirst ? "Ưu tiên câu tới hạn ôn & câu mới" : "Thứ tự ngẫu nhiên"}
        color={color}
        onExit={() => setSetId(null)}
      />
    );
  }

  return (
    <div className="qh" style={{ "--c": color }}>
      <div className="qh__head">
        <div>
          <div className="qh__title">🎯 Luyện tập</div>
          <div className="qh__sub">
            Bài tập được sinh tự động từ dữ liệu của app — mỗi lần vào là một đợt câu khác nhau
          </div>
        </div>
        {onClose && (
          <button className="qh__close" onClick={onClose}>✕ Đóng</button>
        )}
      </div>

      <div className="qh__opts">
        <span className="qh__optlabel">Số câu mỗi lượt:</span>
        {SIZES.map((n) => (
          <button
            key={n}
            className={`qh__chip ${size === n ? "is-on" : ""}`}
            onClick={() => setSize(n)}
          >
            {n === 0 ? "Tất cả" : n}
          </button>
        ))}
        <button
          className={`qh__chip qh__chip--mode ${srsFirst ? "is-on" : ""}`}
          onClick={() => setSrsFirst((v) => !v)}
          title="Ưu tiên những câu tới hạn ôn theo lịch giãn cách"
        >
          {srsFirst ? "🧠 Ôn thông minh" : "🔀 Ngẫu nhiên"}
        </button>
      </div>

      <div className="qh__grid">
        {sets.map((s) => {
          const total = counts[s.id] || 0;
          const stats = total ? getStats(s.deck, buildQuiz(s.id).map((q) => q.id)) : null;
          return (
            <button
              key={s.id}
              className="qh__card"
              disabled={!total}
              onClick={() => {
                setRunToken((t) => t + 1);
                setSetId(s.id);
              }}
            >
              <span className="qh__card-icon">{s.icon}</span>
              <span className="qh__card-title">{s.label}</span>
              <span className="qh__card-desc">{s.desc}</span>
              <span className="qh__card-foot">
                <span className="qh__card-n">{total} câu</span>
                {stats && stats.due > 0 && (
                  <span className="qh__card-due">📅 {stats.due} tới hạn</span>
                )}
                {stats && stats.mastered > 0 && (
                  <span className="qh__card-ok">✅ {stats.mastered}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
