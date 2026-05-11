import { useState, useCallback } from "react";
import data from "../data/tips-exercises.json";

const { exercises } = data;

function QuestionCard({ q, delay }) {
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const handleSelect = (choice) => {
    if (revealed) return;
    setSelected(choice);
    setRevealed(true);
  };

  const isCorrect = selected === q.answer;

  const getChoiceStyle = (choice) => {
    if (!revealed) return {};
    if (choice === q.answer) return { /* correct */ };
    if (choice === selected && !isCorrect) return { /* wrong */ };
    return {};
  };

  const getChoiceClass = (choice) => {
    let cls = "choice-btn";
    if (!revealed) return cls;
    if (choice === q.answer) return cls + " choice-btn--correct";
    if (choice === selected && !isCorrect) return cls + " choice-btn--wrong";
    return cls + " choice-btn--revealed";
  };

  return (
    <div className="question-card" style={{ animationDelay: `${delay}ms` }}>
      {/* Question text */}
      <div className="question-text">
        {q.sentence || q.question}
      </div>

      {/* Choices */}
      <div className="choices-grid">
        {q.choices.map((choice, i) => (
          <button
            key={i}
            className={getChoiceClass(choice)}
            onClick={() => handleSelect(choice)}
            disabled={revealed}
          >
            <span style={{ fontFamily: "var(--font-mono)", marginRight: 8, opacity: 0.5 }}>
              {String.fromCharCode(65 + i)}.
            </span>
            {choice}
          </button>
        ))}
      </div>

      {/* Feedback */}
      {revealed && (
        <div className={`answer-reveal ${isCorrect ? "answer-reveal--correct" : "answer-reveal--wrong"}`}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            {isCorrect ? "✅ Chính xác!" : `❌ Sai rồi! Đáp án đúng: ${q.answer}`}
          </div>
          <div>{q.explanation}</div>
          {q.fullSentence && (
            <div className="answer-reveal__full">
              📝 {q.fullSentence} — {q.translation}
            </div>
          )}
          {q.translation && !q.fullSentence && (
            <div className="answer-reveal__full">
              📝 {q.translation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExerciseSet({ set, startDelay = 0 }) {
  const [key, setKey] = useState(0); // remount to reset

  return (
    <div className="exercise-set">
      <div className="exercise-set__header">
        <span style={{ fontSize: 24 }}>{set.icon}</span>
        <h3
          className="exercise-set__title"
          style={{ color: set.color }}
        >
          {set.title}
        </h3>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--text-muted)",
            background: "var(--bg-card)",
            padding: "4px 12px",
            borderRadius: 20,
            border: "1px solid var(--bg-border)",
          }}
        >
          {set.questions.length} câu
        </span>
      </div>

      <button
        className="reset-btn"
        onClick={() => setKey((k) => k + 1)}
        title="Làm lại từ đầu"
      >
        🔄 Làm lại
      </button>

      <div key={key}>
        {set.questions.map((q, idx) => (
          <QuestionCard key={q.id} q={q} delay={startDelay + idx * 80} />
        ))}
      </div>
    </div>
  );
}

export default function ExercisesTab() {
  const [activeSet, setActiveSet] = useState("all");
  const [globalKey, setGlobalKey] = useState(0);

  const filtered =
    activeSet === "all"
      ? exercises.sets
      : exercises.sets.filter((s) => s.id === activeSet);

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">✏️ Bài tập luyện tập</h2>
        <p className="section-desc">
          Chọn đáp án và nhận giải thích ngay lập tức · Nhấn "Làm lại" để reset bài
        </p>
      </div>

      {/* Filter */}
      <div className="filter-bar">
        <span className="filter-label">Loại bài:</span>
        <button
          className={`filter-btn ${activeSet === "all" ? "filter-btn--active" : ""}`}
          style={activeSet === "all" ? { background: "#a78bfa", color: "#0a0b0f" } : {}}
          onClick={() => { setActiveSet("all"); setGlobalKey((k) => k + 1); }}
        >
          🌐 Tất cả
        </button>
        {exercises.sets.map((set) => (
          <button
            key={set.id}
            className={`filter-btn ${activeSet === set.id ? "filter-btn--active" : ""}`}
            style={activeSet === set.id ? { background: set.color, color: "#0a0b0f" } : {}}
            onClick={() => { setActiveSet(set.id); setGlobalKey((k) => k + 1); }}
          >
            {set.icon} {set.title}
          </button>
        ))}
      </div>

      {/* Total reset */}
      {activeSet === "all" && (
        <button
          className="reset-btn"
          onClick={() => setGlobalKey((k) => k + 1)}
        >
          🔄 Reset tất cả bài tập
        </button>
      )}

      {/* Exercise sets */}
      <div key={globalKey}>
        {filtered.map((set, si) => (
          <ExerciseSet key={set.id} set={set} startDelay={si * 60} />
        ))}
      </div>

      {/* Bottom encouragement */}
      <div
        style={{
          marginTop: 32,
          padding: 24,
          background: "var(--bg-card)",
          border: "1px solid rgba(34,211,238,0.2)",
          borderRadius: "var(--radius-lg)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 12 }}>🎌</div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 700,
            color: "var(--accent-cyan)",
            marginBottom: 8,
          }}
        >
          がんばってください！
        </div>
        <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Luyện tập mỗi ngày, dù chỉ 15 phút — đó là bí quyết thành công!
        </div>
      </div>
    </div>
  );
}
