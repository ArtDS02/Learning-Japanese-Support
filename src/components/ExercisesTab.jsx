import { useMemo, useState, useEffect, useRef } from "react";
import data from "../data/jlpt-sets.json";
import "../styles/tabs/exercises.css";

const { examSets } = data;

/* Lấy tất cả id câu hỏi trong một section (kể cả trong passage đọc hiểu) */
function getQuestionIds(section) {
  const ids = [];
  if (section.questions) section.questions.forEach((q) => ids.push(q.id));
  if (section.passages)
    section.passages.forEach((p) => p.questions.forEach((q) => ids.push(q.id)));
  return ids;
}

/* =========================================================
 * SECTION TIMER — đếm ngược theo phút
 * =======================================================*/
function SectionTimer({ minutes }) {
  const [left, setLeft] = useState(minutes * 60);
  const [running, setRunning] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          clearInterval(ref.current);
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, [running]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const danger = left <= 60;
  const over = left === 0;

  const reset = () => {
    setRunning(false);
    setLeft(minutes * 60);
  };

  return (
    <div className={`sec-timer ${danger ? "sec-timer--danger" : ""}`}>
      <span className="sec-timer__time">{over ? "⏰ Hết giờ" : `⏱ ${mm}:${ss}`}</span>
      {!over && (
        <button className="sec-timer__btn" onClick={() => setRunning((r) => !r)}>
          {running ? "⏸" : "▶"}
        </button>
      )}
      <button className="sec-timer__btn" onClick={reset} title="Đặt lại đồng hồ">
        ↺
      </button>
    </div>
  );
}

/* =========================================================
 * QUESTION CARD
 * =======================================================*/
function QuestionCard({ q, delay = 0, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const handleSelect = (choice) => {
    if (revealed) return;

    setSelected(choice);
    setRevealed(true);
    onAnswer?.(q.id, choice === q.answer);
  };

  const isCorrect = selected === q.answer;

  const getChoiceClass = (choice) => {
    let cls = "choice-btn";

    if (!revealed) return cls;

    if (choice === q.answer) {
      return cls + " choice-btn--correct";
    }

    if (choice === selected && !isCorrect) {
      return cls + " choice-btn--wrong";
    }

    return cls + " choice-btn--revealed";
  };

  return (
    <div className="question-card" style={{ animationDelay: `${delay}ms` }}>
      {/* QUESTION */}
      <div className="question-text">{q.sentence || q.question}</div>

      {/* CHOICES */}
      <div className="choices-grid">
        {q.choices.map((choice, i) => (
          <button
            key={i}
            className={getChoiceClass(choice)}
            onClick={() => handleSelect(choice)}
            disabled={revealed}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                marginRight: 8,
                opacity: 0.5,
              }}
            >
              {String.fromCharCode(65 + i)}.
            </span>

            {choice}
          </button>
        ))}
      </div>

      {/* RESULT */}
      {revealed && (
        <div
          className={`answer-reveal ${
            isCorrect ? "answer-reveal--correct" : "answer-reveal--wrong"
          }`}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            {isCorrect
              ? "✅ Chính xác!"
              : `❌ Sai rồi! Đáp án đúng: ${q.answer}`}
          </div>

          {q.explanation && <div>{q.explanation}</div>}

          {q.fullSentence && (
            <div className="answer-reveal__full">
              📝 {q.fullSentence}
              {q.translation && ` — ${q.translation}`}
            </div>
          )}

          {!q.fullSentence && q.translation && (
            <div className="answer-reveal__full">📝 {q.translation}</div>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
 * READING PASSAGE
 * =======================================================*/
function ReadingPassage({ passage, onAnswer }) {
  return (
    <div className="reading-passage">
      <div
        style={{
          marginBottom: 20,
          padding: 20,
          background: "var(--bg-card)",
          border: "1px solid var(--bg-border)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <h4
          style={{
            marginBottom: 12,
            fontSize: 20,
            fontWeight: 700,
          }}
        >
          📖 {passage.title}
        </h4>

        <div
          style={{
            lineHeight: 1.9,
            fontSize: 17,
            marginBottom: 16,
          }}
        >
          {passage.text}
        </div>

        {passage.translation && (
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: "rgba(255,255,255,0.04)",
              color: "var(--text-secondary)",
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            🇻🇳 {passage.translation}
          </div>
        )}
      </div>

      <div>
        {passage.questions.map((q, idx) => (
          <QuestionCard key={q.id} q={q} delay={idx * 60} onAnswer={onAnswer} />
        ))}
      </div>
    </div>
  );
}

/* =========================================================
 * SECTION
 * =======================================================*/
function SectionBlock({ section, startDelay = 0, answers, onAnswer, onResetSection }) {
  const [key, setKey] = useState(0);

  const isReading = !!section.passages;
  const qids = useMemo(() => getQuestionIds(section), [section]);
  const questionCount = qids.length;

  const answered = qids.filter((id) => id in answers).length;
  const correct = qids.filter((id) => answers[id] === true).length;
  const allDone = questionCount > 0 && answered === questionCount;
  const pct = answered > 0 ? Math.round((correct / answered) * 100) : 0;

  const handleReset = () => {
    onResetSection(qids);
    setKey((k) => k + 1);
  };

  return (
    <div className="exercise-set">
      {/* HEADER */}
      <div className="exercise-set__header">
        <span style={{ fontSize: 24 }}>{section.icon}</span>

        <h3 className="exercise-set__title" style={{ color: section.color }}>
          {section.title}
        </h3>

        <div className="exercise-set__tools">
          <SectionTimer minutes={section.timeLimit} />
          <span
            className="sec-score-chip"
            style={{
              color: answered ? (pct >= 60 ? "#34d399" : "#f87171") : "var(--text-muted)",
            }}
          >
            ✓ {correct}/{answered || 0}
            <span style={{ color: "var(--text-muted)" }}> · {questionCount} câu</span>
          </span>
        </div>
      </div>

      {/* SCORE BAR */}
      <div className="sec-progress">
        <div className="sec-progress__track">
          <div
            className="sec-progress__fill"
            style={{
              width: `${(answered / (questionCount || 1)) * 100}%`,
              background: section.color,
            }}
          />
        </div>
        <span className="sec-progress__txt">
          Đã làm {answered}/{questionCount}
        </span>
      </div>

      {/* RESET */}
      <button className="reset-btn" onClick={handleReset}>
        🔄 Làm lại phần này
      </button>

      {/* CONTENT */}
      <div key={key}>
        {/* NORMAL QUESTIONS */}
        {!isReading && section.questions && (
          <div>
            {section.questions.map((q, idx) => (
              <QuestionCard
                key={q.id}
                q={q}
                delay={startDelay + idx * 80}
                onAnswer={onAnswer}
              />
            ))}
          </div>
        )}

        {/* READING */}
        {isReading && (
          <div>
            {section.passages.map((passage, idx) => (
              <ReadingPassage
                key={passage.id}
                passage={passage}
                delay={idx * 100}
                onAnswer={onAnswer}
              />
            ))}
          </div>
        )}
      </div>

      {/* RESULT */}
      {allDone && (
        <div className={`sec-result ${pct >= 60 ? "sec-result--good" : "sec-result--bad"}`}>
          {pct >= 60 ? "🎯" : "📌"} Phần này: đúng <strong>{correct}/{questionCount}</strong> ({pct}%)
        </div>
      )}
    </div>
  );
}

/* =========================================================
 * EXAM CARD
 * =======================================================*/
const N5_PASS_RATIO = 0.44; // ~80/180 điểm sàn JLPT N5

function ExamCard({ exam }) {
  const [expanded, setExpanded] = useState(true);
  const [answers, setAnswers] = useState({});

  const allQids = useMemo(
    () => exam.sections.flatMap((s) => getQuestionIds(s)),
    [exam],
  );
  const totalQuestions = allQids.length;

  const answeredAll = allQids.filter((id) => id in answers).length;
  const correctAll = allQids.filter((id) => answers[id] === true).length;
  const finished = totalQuestions > 0 && answeredAll === totalQuestions;
  const pctTotal = totalQuestions > 0 ? Math.round((correctAll / totalQuestions) * 100) : 0;
  const pass = correctAll / (totalQuestions || 1) >= N5_PASS_RATIO;

  const onAnswer = (qid, ok) => setAnswers((a) => ({ ...a, [qid]: ok }));
  const onResetSection = (qids) =>
    setAnswers((a) => {
      const n = { ...a };
      qids.forEach((id) => delete n[id]);
      return n;
    });

  return (
    <div
      style={{
        marginBottom: 48,
        border: "1px solid var(--bg-border)",
        borderRadius: "var(--radius-xl)",
        overflow: "hidden",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      {/* EXAM HEADER */}
      <div
        style={{
          padding: 24,
          borderBottom: "1px solid var(--bg-border)",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              opacity: 0.6,
              letterSpacing: 1.2,
              marginBottom: 6,
            }}
          >
            JLPT MOCK EXAM
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            🎌 {exam.title}
          </h2>
        </div>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div className="filter-btn">📝 {totalQuestions} câu</div>

          <button className="filter-btn" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "📕 Thu gọn" : "📖 Mở đề"}
          </button>
        </div>
      </div>

      {/* SCORE SUMMARY */}
      {expanded && answeredAll > 0 && (
        <div className="exam-summary">
          <div className="exam-summary__score">
            <div className="exam-summary__big">
              {correctAll}
              <span className="exam-summary__total">/{totalQuestions}</span>
            </div>
            <div className="exam-summary__cap">câu đúng · {pctTotal}% tổng đề</div>
          </div>

          <div className="exam-summary__barwrap">
            <div className="exam-summary__bar">
              <div
                className="exam-summary__barfill"
                style={{
                  width: `${pctTotal}%`,
                  background: pass ? "var(--accent-green)" : "var(--accent-red)",
                }}
              />
              <div className="exam-summary__threshold" style={{ left: `${N5_PASS_RATIO * 100}%` }}>
                <span>sàn N5</span>
              </div>
            </div>
            <div className="exam-summary__hint">
              Mức đậu N5 ≈ 80/180 (~44% tổng điểm) + đạt điểm sàn từng phần
            </div>
          </div>

          <div
            className={`exam-summary__verdict ${
              finished ? (pass ? "is-pass" : "is-fail") : "is-progress"
            }`}
          >
            {finished
              ? pass
                ? "✅ Ước tính ĐẠT"
                : "❌ Ước tính CHƯA ĐẠT"
              : `Còn ${totalQuestions - answeredAll} câu`}
          </div>
        </div>
      )}

      {/* SECTIONS */}
      {expanded && (
        <div style={{ padding: 24 }}>
          {exam.sections.map((section, idx) => (
            <SectionBlock
              key={section.id}
              section={section}
              startDelay={idx * 80}
              answers={answers}
              onAnswer={onAnswer}
              onResetSection={onResetSection}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
 * MAIN COMPONENT
 * =======================================================*/
export default function ExercisesTab() {
  const [activeExam, setActiveExam] = useState("all");
  const [activeSectionType, setActiveSectionType] = useState("all");
  const [globalKey, setGlobalKey] = useState(0);

  /* =========================================================
   * FILTER EXAMS
   * =======================================================*/
  const filteredExams =
    activeExam === "all"
      ? examSets
      : examSets.filter((e) => e.id === activeExam);

  /* =========================================================
   * FILTER SECTIONS
   * =======================================================*/
  const finalExams = filteredExams
    .map((exam) => {
      let sections = exam.sections;

      if (activeSectionType !== "all") {
        sections = sections.filter((section) => {
          const title = section.title.toLowerCase();

          if (activeSectionType === "vocab") {
            return title.includes("語彙") || title.includes("từ vựng");
          }

          if (activeSectionType === "grammar") {
            return title.includes("文法") || title.includes("ngữ pháp");
          }

          if (activeSectionType === "reading") {
            return title.includes("読解") || title.includes("đọc hiểu");
          }

          return true;
        });
      }

      return {
        ...exam,
        sections,
      };
    })
    .filter((exam) => exam.sections.length > 0);

  return (
    <div>
      {/* HEADER */}
      <div className="section-header">
        <h2 className="section-title">✏️ Bộ đề JLPT</h2>

        <p className="section-desc">
          Luyện đề JLPT theo format thật · Chọn đáp án để xem giải thích ngay
          lập tức
        </p>
      </div>

      {/* =====================================================
       * EXAM FILTER
       * ===================================================*/}
      <div className="filter-bar exam-tab">
        <span className="filter-label">Bộ đề:</span>

        <button
          className={`filter-btn ${
            activeExam === "all" ? "filter-btn--active" : ""
          }`}
          style={
            activeExam === "all"
              ? {
                  background: "#a78bfa",
                  color: "#0a0b0f",
                }
              : {}
          }
          onClick={() => {
            setActiveExam("all");
            setGlobalKey((k) => k + 1);
          }}
        >
          🌐 Tất cả
        </button>

        {examSets.map((exam) => (
          <button
            key={exam.id}
            className={`filter-btn ${
              activeExam === exam.id ? "filter-btn--active" : ""
            }`}
            onClick={() => {
              setActiveExam(exam.id);
              setGlobalKey((k) => k + 1);
            }}
          >
            🎌 {exam.id}
          </button>
        ))}
      </div>

      {/* =====================================================
       * SECTION TYPE FILTER
       * ===================================================*/}
      <div className="filter-bar" style={{ marginTop: 12 }}>
        <span className="filter-label">Phần thi:</span>

        {/* ALL */}
        <button
          className={`filter-btn ${
            activeSectionType === "all" ? "filter-btn--active" : ""
          }`}
          style={
            activeSectionType === "all"
              ? {
                  background: "#94a3b8",
                  color: "#0a0b0f",
                }
              : {}
          }
          onClick={() => {
            setActiveSectionType("all");
            setGlobalKey((k) => k + 1);
          }}
        >
          🌐 Tất cả
        </button>

        {/* VOCAB */}
        <button
          className={`filter-btn ${
            activeSectionType === "vocab" ? "filter-btn--active" : ""
          }`}
          style={
            activeSectionType === "vocab"
              ? {
                  background: "#22d3ee",
                  color: "#0a0b0f",
                }
              : {}
          }
          onClick={() => {
            setActiveSectionType("vocab");
            setGlobalKey((k) => k + 1);
          }}
        >
          📖 Từ vựng
        </button>

        {/* GRAMMAR */}
        <button
          className={`filter-btn ${
            activeSectionType === "grammar" ? "filter-btn--active" : ""
          }`}
          style={
            activeSectionType === "grammar"
              ? {
                  background: "#a78bfa",
                  color: "#0a0b0f",
                }
              : {}
          }
          onClick={() => {
            setActiveSectionType("grammar");
            setGlobalKey((k) => k + 1);
          }}
        >
          ⚙️ Ngữ pháp
        </button>

        {/* READING */}
        <button
          className={`filter-btn ${
            activeSectionType === "reading" ? "filter-btn--active" : ""
          }`}
          style={
            activeSectionType === "reading"
              ? {
                  background: "#34d399",
                  color: "#0a0b0f",
                }
              : {}
          }
          onClick={() => {
            setActiveSectionType("reading");
            setGlobalKey((k) => k + 1);
          }}
        >
          📰 Đọc hiểu
        </button>
      </div>

      {/* RESET */}
      <button className="reset-btn" onClick={() => setGlobalKey((k) => k + 1)}>
        🔄 Reset toàn bộ đề
      </button>

      {/* EXAMS */}
      <div key={globalKey}>
        {finalExams.map((exam) => (
          <ExamCard key={exam.id} exam={exam} />
        ))}
      </div>

      {/* EMPTY */}
      {finalExams.length === 0 && (
        <div
          style={{
            marginTop: 40,
            padding: 40,
            textAlign: "center",
            border: "1px solid var(--bg-border)",
            borderRadius: "var(--radius-lg)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div style={{ fontSize: 42 }}>😢</div>

          <div
            style={{
              marginTop: 12,
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            Không có dữ liệu phù hợp
          </div>
        </div>
      )}

      {/* FOOTER */}
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

        <div
          style={{
            color: "var(--text-secondary)",
            fontSize: 14,
          }}
        >
          Luyện tập mỗi ngày, dù chỉ 15 phút — đó là bí quyết thành công!
        </div>
      </div>
    </div>
  );
}
