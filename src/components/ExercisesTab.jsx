import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  examSets,
  getQuestionIds,
  getQuestions,
  loadExam,
  answerQuestion,
  resetExam,
  resetSection,
  startExam,
  setExamMode,
  saveElapsed,
  scoreExam,
  submitExam,
  mistakeEntries,
  loadHistory,
  clearHistory,
  N5_SCORING,
} from "../lib/examStore";
import { recordReview } from "../lib/progress";
import { mistakeCard } from "../lib/session";
import { speakSequence, ttsSupported, hasJaVoice } from "../lib/tts";
import { loadSettings } from "../lib/userdata";
import StudyRunner from "./common/StudyRunner";
import SpeakButton from "./common/SpeakButton";
import Ruby from "./common/Ruby";
import "../styles/tabs/exercises.css";
import "../styles/tabs/exercises-extra.css";
// Dùng .qh__close và .qh__chip của quiz.css nhưng không render QuizHub — không
// import thì hai nút đó mất sạch style khi vào thẳng tab này.
import "../styles/common/quiz.css";

const scriptLines = (script) =>
  Array.isArray(script) ? script : String(script || "").split(/\n+/).filter(Boolean);

/* =========================================================
 * TIMER — chế độ luyện: theo từng phần · chế độ thi: một đồng hồ tổng
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

/** Đồng hồ tổng cho chế độ thi thật — chạy liên tục, lưu lại khi F5. */
function ExamTimer({ examId, totalMinutes, initialElapsed, onTimeUp, paused }) {
  const [elapsed, setElapsed] = useState(initialElapsed || 0);
  const firedRef = useRef(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [paused]);

  // Lưu mỗi 5 giây để reload không mất thời gian đã làm.
  useEffect(() => {
    if (elapsed % 5 === 0) saveElapsed(examId, elapsed);
  }, [elapsed, examId]);

  const total = totalMinutes * 60;
  const left = Math.max(0, total - elapsed);

  useEffect(() => {
    if (left === 0 && !firedRef.current) {
      firedRef.current = true;
      onTimeUp?.();
    }
  }, [left, onTimeUp]);

  const hh = Math.floor(left / 3600);
  const mm = String(Math.floor((left % 3600) / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const pct = total ? (elapsed / total) * 100 : 0;

  return (
    <div className={`exm-timer ${left <= 300 ? "is-danger" : ""}`}>
      <div className="exm-timer__time">
        {left === 0 ? "⏰ HẾT GIỜ" : `⏱ ${hh > 0 ? `${hh}:` : ""}${mm}:${ss}`}
      </div>
      <div className="exm-timer__track">
        <div className="exm-timer__fill" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <div className="exm-timer__total">/ {totalMinutes} phút</div>
    </div>
  );
}

/* =========================================================
 * CÂU HỎI
 * =======================================================*/
function QuestionCard({ q, delay = 0, chosen, onAnswer, testMode, furigana, num }) {
  const revealed = !testMode && chosen != null;
  const isCorrect = chosen === q.answer;
  const audible = ttsSupported() && hasJaVoice();
  const isListening = !!q.script;
  const [showScript, setShowScript] = useState(false);
  const [playingIdx, setPlayingIdx] = useState(-1);
  const stopRef = useRef(null);

  useEffect(() => () => stopRef.current?.(), []);

  const lines = useMemo(() => scriptLines(q.script), [q.script]);

  const playScript = () => {
    stopRef.current?.();
    stopRef.current = speakSequence(lines, {
      onLine: setPlayingIdx,
      onEnd: () => setPlayingIdx(-1),
    });
  };

  const handleSelect = (choice) => {
    if (chosen != null) return;
    onAnswer(q.id, choice);
  };

  const getChoiceClass = (choice) => {
    if (testMode) return `choice-btn ${chosen === choice ? "choice-btn--picked" : ""}`;
    if (!revealed) return "choice-btn";
    if (choice === q.answer) return "choice-btn choice-btn--correct";
    if (choice === chosen && !isCorrect) return "choice-btn choice-btn--wrong";
    return "choice-btn choice-btn--revealed";
  };

  return (
    <div className="question-card" style={{ animationDelay: `${delay}ms` }}>
      {num != null && <div className="question-num">Câu {num}</div>}

      {/* Câu nghe: chỉ có nút phát, script ẩn cho tới khi được phép xem */}
      {isListening ? (
        <div className="lsn-box">
          {audible ? (
            <>
              <div className="lsn-controls">
                <button className="lsn-play" onClick={playScript}>
                  🔊 Phát hội thoại
                </button>
                <button
                  className="lsn-script-toggle"
                  onClick={() => setShowScript((v) => !v)}
                  disabled={testMode && chosen == null}
                  title={
                    testMode && chosen == null
                      ? "Chế độ thi: chọn đáp án trước đã"
                      : "Xem lời hội thoại"
                  }
                >
                  {showScript ? "🙈 Ẩn lời" : "📄 Xem lời"}
                </button>
              </div>
              {playingIdx >= 0 && (
                <div className="lsn-now">Đang đọc dòng {playingIdx + 1}/{lines.length}</div>
              )}
            </>
          ) : (
            <div className="lsn-novoice">
              ⚠️ Máy này không có giọng đọc tiếng Nhật — hiện lời hội thoại để đọc thay.
            </div>
          )}

          {(showScript || revealed || !audible) && (
            <div className="lsn-script">
              {lines.map((line, i) => (
                <div key={i} className={`lsn-line ${playingIdx === i ? "is-playing" : ""}`}>
                  <Ruby text={line} on={furigana} />
                  <SpeakButton text={line} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Đề bài */}
      {(q.sentence || q.question) && (
        <div className="question-text">
          <Ruby text={q.sentence || q.question} on={furigana} />
          {!isListening && (q.sentence || q.question) && (
            <SpeakButton text={(q.sentence || q.question).replace(/＿+|_+|（\s*）/g, "")} size="sm" />
          )}
        </div>
      )}

      {/* Lựa chọn */}
      <div className="choices-grid">
        {q.choices.map((choice, i) => (
          <button
            key={i}
            className={getChoiceClass(choice)}
            onClick={() => handleSelect(choice)}
            disabled={chosen != null}
          >
            <span className="choice-letter">{String.fromCharCode(65 + i)}.</span>
            {choice}
          </button>
        ))}
      </div>

      {/* Kết quả — chế độ thi thì im lặng cho tới khi nộp bài */}
      {revealed && (
        <div
          className={`answer-reveal ${isCorrect ? "answer-reveal--correct" : "answer-reveal--wrong"}`}
        >
          <div className="answer-reveal__head">
            {isCorrect ? "✅ Chính xác!" : `❌ Sai rồi! Đáp án đúng: ${q.answer}`}
          </div>
          {q.explanation && <div>{q.explanation}</div>}
          {q.fullSentence && (
            <div className="answer-reveal__full">
              📝 <Ruby text={q.fullSentence} on={furigana} />
              {q.translation && ` — ${q.translation}`}
            </div>
          )}
          {!q.fullSentence && q.translation && (
            <div className="answer-reveal__full">📝 {q.translation}</div>
          )}
        </div>
      )}

      {testMode && chosen != null && (
        <div className="exm-picked">Đã chọn: <strong>{chosen}</strong> · chấm điểm khi nộp bài</div>
      )}
    </div>
  );
}

/* =========================================================
 * BÀI ĐỌC
 * =======================================================*/
function ReadingPassage({ passage, answers, onAnswer, testMode, furigana, numberOf }) {
  return (
    <div className="reading-passage">
      <div className="reading-box">
        <h4 className="reading-box__title">
          📖 {passage.title}
          <SpeakButton text={passage.text} size="sm" />
        </h4>
        <div className="reading-box__text">
          <Ruby text={passage.text} on={furigana} />
        </div>
        {passage.translation && (
          <details className="reading-box__transwrap">
            <summary>🇻🇳 Xem bản dịch</summary>
            <div className="reading-box__trans">{passage.translation}</div>
          </details>
        )}
      </div>

      <div>
        {passage.questions.map((q, idx) => (
          <QuestionCard
            key={q.id}
            q={q}
            num={numberOf(q.id)}
            delay={idx * 60}
            chosen={answers[q.id]}
            onAnswer={onAnswer}
            testMode={testMode}
            furigana={furigana}
          />
        ))}
      </div>
    </div>
  );
}

/* =========================================================
 * MỘT PHẦN THI
 * =======================================================*/
function SectionBlock({ section, startDelay = 0, answers, onAnswer, onResetSection, testMode, furigana, numberOf }) {
  const qids = useMemo(() => getQuestionIds(section), [section]);
  const questions = useMemo(() => getQuestions(section), [section]);
  const questionCount = qids.length;

  const answered = qids.filter((id) => answers[id] != null).length;
  const correct = questions.filter((q) => answers[q.id] === q.answer).length;
  const allDone = questionCount > 0 && answered === questionCount;
  const pct = answered > 0 ? Math.round((correct / answered) * 100) : 0;
  const isReading = !!section.passages;

  return (
    <div className="exercise-set">
      <div className="exercise-set__header">
        <span className="exercise-set__icon">{section.icon}</span>
        <h3 className="exercise-set__title" style={{ "--c": section.color }}>
          {section.title}
        </h3>
        <div className="exercise-set__tools">
          {!testMode && <SectionTimer minutes={section.timeLimit} />}
          <span className={`sec-score-chip ${answered && !testMode ? (pct >= 60 ? "is-good" : "is-bad") : ""}`}>
            {testMode ? `✍️ ${answered}` : `✓ ${correct}/${answered || 0}`}
            <span className="sec-score-chip__total"> · {questionCount} câu</span>
          </span>
        </div>
      </div>

      <div className="sec-progress">
        <div className="sec-progress__track">
          <div
            className="sec-progress__fill"
            style={{ width: `${(answered / (questionCount || 1)) * 100}%`, "--c": section.color }}
          />
        </div>
        <span className="sec-progress__txt">Đã làm {answered}/{questionCount}</span>
      </div>

      <button className="reset-btn" onClick={() => onResetSection(qids)}>
        🔄 Làm lại phần này
      </button>

      <div>
        {!isReading &&
          section.questions?.map((q, idx) => (
            <QuestionCard
              key={q.id}
              q={q}
              num={numberOf(q.id)}
              delay={startDelay + idx * 80}
              chosen={answers[q.id]}
              onAnswer={onAnswer}
              testMode={testMode}
              furigana={furigana}
            />
          ))}

        {isReading &&
          section.passages.map((passage) => (
            <ReadingPassage
              key={passage.id}
              passage={passage}
              answers={answers}
              onAnswer={onAnswer}
              testMode={testMode}
              furigana={furigana}
              numberOf={numberOf}
            />
          ))}
      </div>

      {allDone && !testMode && (
        <div className={`sec-result ${pct >= 60 ? "sec-result--good" : "sec-result--bad"}`}>
          {pct >= 60 ? "🎯" : "📌"} Phần này: đúng <strong>{correct}/{questionCount}</strong> ({pct}%)
        </div>
      )}
    </div>
  );
}

/* =========================================================
 * MỘT ĐỀ THI
 * =======================================================*/
function ExamCard({ exam, globalMode, furigana }) {
  const [expanded, setExpanded] = useState(true);
  const [state, setState] = useState(() => loadExam(exam.id));
  const [result, setResult] = useState(null);

  const testMode = state.mode === "test" && !state.submitted;
  const totalMinutes = exam.sections.reduce((a, s) => a + (s.timeLimit || 0), 0);

  const numbering = useMemo(() => {
    const map = new Map();
    let n = 0;
    exam.sections.forEach((s) => getQuestionIds(s).forEach((id) => map.set(id, ++n)));
    return map;
  }, [exam]);
  const numberOf = useCallback((id) => numbering.get(id), [numbering]);

  // Đồng bộ khi người dùng đổi chế độ ở thanh trên.
  useEffect(() => {
    if (globalMode && globalMode !== state.mode && !Object.keys(state.answers).length) {
      setState(setExamMode(exam.id, globalMode));
    }
  }, [globalMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const scored = useMemo(() => scoreExam(exam, state.answers), [exam, state.answers]);

  const onAnswer = (qid, choice) => {
    const ok = answerQuestion(exam.id, qid, choice);
    // Ở chế độ luyện tập, mỗi câu tính là một lượt ôn (vào streak + độ chính xác).
    if (!testMode) recordReview(1, ok);
    setState(loadExam(exam.id));
  };

  const onResetSection = (qids) => setState(resetSection(exam.id, qids));

  const doSubmit = useCallback(() => {
    const r = submitExam(exam);
    // Nộp bài mới ghi nhận lượt ôn của chế độ thi (tránh nhắc streak khi đang thi).
    if (state.mode === "test") recordReview(r.answered || 0, undefined);
    setResult(r);
    setState(loadExam(exam.id));
  }, [exam, state.mode]);

  const doStart = (mode) => {
    setResult(null);
    setState(startExam(exam.id, mode));
    setExpanded(true);
  };

  const doReset = () => {
    resetExam(exam.id);
    setResult(null);
    setState(loadExam(exam.id));
  };

  const answeredCount = Object.keys(state.answers).length;
  const shown = result || (state.submitted ? scored : null);

  return (
    <div className="exam-card">
      <div className="exam-card__head">
        <div>
          <div className="exam-card__label">
            JLPT MOCK EXAM · {state.mode === "test" ? "CHẾ ĐỘ THI THẬT" : "CHẾ ĐỘ LUYỆN TẬP"}
          </div>
          <h2 className="exam-card__title">🎌 {exam.title}</h2>
        </div>

        <div className="exam-card__actions">
          <div className="filter-btn">📝 {scored.total} câu</div>
          {answeredCount > 0 && (
            <div className="filter-btn exm-saved" title="Tiến độ được lưu tự động, F5 không mất">
              💾 đã lưu {answeredCount}/{scored.total}
            </div>
          )}
          <button className="filter-btn" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "📕 Thu gọn" : "📖 Mở đề"}
          </button>
        </div>
      </div>

      {/* Tiếp tục đề đang làm dở */}
      {!expanded && answeredCount > 0 && !state.submitted && (
        <div className="exm-resume">
          ⏭ Đề này đang làm dở — <strong>{answeredCount}/{scored.total}</strong> câu.
          <button className="exm-resume__btn" onClick={() => setExpanded(true)}>Tiếp tục</button>
        </div>
      )}

      {expanded && (
        <>
          {/* Bảng điều khiển chế độ */}
          <div className="exm-modebar">
            <div className="exm-modebar__group">
              <button
                className={`exm-modebtn ${state.mode === "practice" ? "is-on" : ""}`}
                onClick={() => setState(setExamMode(exam.id, "practice"))}
              >
                📚 Luyện tập
                <span>Hiện đáp án + giải thích ngay</span>
              </button>
              <button
                className={`exm-modebtn ${state.mode === "test" ? "is-on" : ""}`}
                onClick={() => doStart("test")}
              >
                ⏱ Thi thử
                <span>Ẩn đáp án · {totalMinutes} phút · chấm thang 180</span>
              </button>
            </div>

            {testMode && (
              <ExamTimer
                examId={exam.id}
                totalMinutes={totalMinutes}
                initialElapsed={state.elapsed}
                paused={state.submitted}
                onTimeUp={doSubmit}
              />
            )}
          </div>

          {/* Bảng điểm */}
          {shown ? (
            <ExamResult
              result={shown}
              exam={exam}
              answers={state.answers}
              onRetry={() => doStart(state.mode)}
              onReview={() => setResult(null)}
            />
          ) : (
            answeredCount > 0 &&
            !testMode && <PracticeSummary scored={scored} />
          )}

          {/* Nộp bài ở chế độ thi */}
          {testMode && (
            <button
              className="exm-submit"
              onClick={doSubmit}
              disabled={answeredCount === 0}
              title={answeredCount === 0 ? "Hãy làm ít nhất 1 câu" : "Nộp bài và chấm điểm"}
            >
              ✅ Nộp bài & chấm điểm ({answeredCount}/{scored.total})
            </button>
          )}

          <div className="exam-card__sections">
            {exam.sections.map((section, idx) => (
              <SectionBlock
                key={section.id}
                section={section}
                startDelay={idx * 80}
                answers={state.answers}
                onAnswer={onAnswer}
                onResetSection={onResetSection}
                testMode={testMode}
                furigana={furigana}
                numberOf={numberOf}
              />
            ))}
          </div>

          <button className="reset-btn exm-resetall" onClick={doReset}>
            🗑 Xoá toàn bộ bài làm của đề này
          </button>
        </>
      )}
    </div>
  );
}

/** Tóm tắt nhanh ở chế độ luyện tập. */
function PracticeSummary({ scored }) {
  const pct = scored.answered ? Math.round((scored.raw / scored.answered) * 100) : 0;
  return (
    <div className="exam-summary">
      <div className="exam-summary__score">
        <div className="exam-summary__big">
          {scored.raw}
          <span className="exam-summary__total">/{scored.answered}</span>
        </div>
        <div className="exam-summary__cap">đúng trên số câu đã làm · {pct}%</div>
      </div>
      <div className="exam-summary__barwrap">
        <div className="exam-summary__bar">
          <div
            className={`exam-summary__barfill ${pct >= 60 ? "is-pass" : "is-fail"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="exam-summary__hint">
          Còn {scored.total - scored.answered} câu · chuyển sang <strong>Thi thử</strong> để chấm theo thang 180 điểm thật
        </div>
      </div>
    </div>
  );
}

/** Kết quả chấm theo thang JLPT thật, có kiểm điểm sàn từng phần. */
function ExamResult({ result, exam, answers, onRetry, onReview }) {
  const wrong = useMemo(() => {
    const out = [];
    exam.sections.forEach((s) =>
      getQuestions(s).forEach((q) => {
        const chosen = answers[q.id];
        if (chosen != null && chosen !== q.answer) out.push({ q, section: s, chosen });
      }),
    );
    return out;
  }, [exam, answers]);

  return (
    <div className={`exm-result ${result.pass ? "is-pass" : "is-fail"}`}>
      <div className="exm-result__top">
        <div className="exm-result__verdict">
          {result.pass ? "✅ ƯỚC TÍNH ĐẠT" : "❌ ƯỚC TÍNH CHƯA ĐẠT"}
        </div>
        <div className="exm-result__score">
          {result.score}
          <span>/{result.maxScore}</span>
        </div>
        <div className="exm-result__need">
          Cần ≥ {result.passTotal} điểm tổng · đúng {result.raw}/{result.total} câu
        </div>
      </div>

      <div className="exm-groups">
        {Object.entries(result.groups)
          .filter(([, g]) => g.total > 0)
          .map(([key, g]) => (
            <div key={key} className={`exm-group ${g.floorOk ? "is-ok" : "is-no"}`}>
              <div className="exm-group__name">{g.label}</div>
              <div className="exm-group__score">
                {g.score}<span>/{g.max}</span>
              </div>
              <div className="exm-group__track">
                <div className="exm-group__fill" style={{ width: `${(g.score / g.max) * 100}%` }} />
                <div
                  className="exm-group__floor"
                  style={{ left: `${(g.floor / g.max) * 100}%` }}
                  title={`Điểm sàn ${g.floor}`}
                />
              </div>
              <div className="exm-group__meta">
                đúng {g.correct}/{g.total} · sàn {g.floor}
                {g.floorOk ? " ✓" : " ✗ chưa đạt sàn"}
              </div>
            </div>
          ))}
      </div>

      {!result.floorsOk && (
        <div className="exm-result__warn">
          ⚠️ Tổng điểm có thể đủ nhưng <strong>chưa đạt điểm sàn</strong> của một phần — JLPT thật sẽ tính là không đậu.
        </div>
      )}

      {wrong.length > 0 && (
        <div className="exm-wrong">
          <div className="exm-wrong__head">
            📕 {wrong.length} câu sai đã được đưa vào <strong>Sổ tay lỗi</strong> để ôn lại theo lịch
          </div>
          <div className="exm-wrong__list">
            {wrong.slice(0, 8).map(({ q, chosen }) => (
              <div key={q.id} className="exm-wrong__row">
                <span className="exm-wrong__q">{q.sentence || q.question || "(câu nghe)"}</span>
                <span className="exm-wrong__a">
                  bạn chọn <s>{chosen}</s> → đúng là <strong>{q.answer}</strong>
                </span>
              </div>
            ))}
            {wrong.length > 8 && (
              <div className="exm-wrong__more">…và {wrong.length - 8} câu nữa</div>
            )}
          </div>
        </div>
      )}

      <div className="exm-result__actions">
        <button className="exm-btn" onClick={onReview}>👀 Xem lại bài làm</button>
        <button className="exm-btn exm-btn--primary" onClick={onRetry}>🔁 Làm lại đề này</button>
      </div>
    </div>
  );
}

/* =========================================================
 * SỔ TAY LỖI
 * =======================================================*/
function MistakeNotebook({ onBack }) {
  const [entries, setEntries] = useState(() => mistakeEntries());
  const [running, setRunning] = useState(false);
  const [onlyDue, setOnlyDue] = useState(true);

  const pool = onlyDue ? entries.filter((e) => e.due) : entries;
  const items = useMemo(() => pool.map(mistakeCard), [pool]);

  if (running) {
    return (
      <StudyRunner
        items={items}
        title="📕 Ôn câu sai"
        subtitle="Trả lời đúng nhiều lần thì câu sẽ rời khỏi sổ tay"
        color="#ff4757"
        onExit={() => {
          setEntries(mistakeEntries());
          setRunning(false);
        }}
      />
    );
  }

  return (
    <div className="mst">
      <div className="mst__head">
        <div>
          <div className="mst__title">📕 Sổ tay lỗi</div>
          <div className="mst__sub">
            Mọi câu trả lời sai trong bộ đề tự động vào đây và được ôn lại theo lịch giãn cách.
            Trả lời đúng đủ số lần thì câu rời khỏi sổ tay.
          </div>
        </div>
        <button className="qh__close" onClick={onBack}>✕ Đóng</button>
      </div>

      <div className="mst__stats">
        <div className="mst__stat" style={{ "--c": "#ff4757" }}>
          <div className="mst__stat-n">{entries.length}</div>
          <div className="mst__stat-l">câu đang trong sổ</div>
        </div>
        <div className="mst__stat" style={{ "--c": "#22d3ee" }}>
          <div className="mst__stat-n">{entries.filter((e) => e.due).length}</div>
          <div className="mst__stat-l">tới hạn ôn hôm nay</div>
        </div>
        <div className="mst__stat" style={{ "--c": "#facc15" }}>
          <div className="mst__stat-n">
            {entries.reduce((a, e) => a + (e.card.lapses || 0), 0)}
          </div>
          <div className="mst__stat-l">tổng số lần sai</div>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">🎉</div>
          <p className="empty-state__text">
            Sổ tay lỗi đang trống. Làm bộ đề đi — câu nào sai sẽ tự vào đây.
          </p>
        </div>
      ) : (
        <>
          <div className="mst__bar">
            <button
              className={`qh__chip ${onlyDue ? "is-on" : ""}`}
              onClick={() => setOnlyDue(true)}
            >
              📅 Tới hạn ({entries.filter((e) => e.due).length})
            </button>
            <button
              className={`qh__chip ${!onlyDue ? "is-on" : ""}`}
              onClick={() => setOnlyDue(false)}
            >
              📚 Tất cả ({entries.length})
            </button>
            <button
              className="mst__start"
              onClick={() => setRunning(true)}
              disabled={items.length === 0}
            >
              🎯 Ôn ngay {items.length} câu
            </button>
          </div>

          <div className="mst__list">
            {pool.slice(0, 40).map((e) => (
              <div key={e.qid} className="mst__row" style={{ "--c": e.sectionColor }}>
                <div className="mst__row-top">
                  <span className="mst__row-tag">{e.sectionIcon} {e.examId}</span>
                  <span className="mst__row-meta">
                    sai {e.card.lapses || 1}× · L{e.card.box}
                    {e.due ? " · 📅 tới hạn" : ""}
                  </span>
                </div>
                <div className="mst__row-q">
                  {e.q.sentence || e.q.question || scriptLines(e.q.script)[0] || "(câu nghe)"}
                </div>
                <div className="mst__row-a">✔ {e.q.answer}</div>
              </div>
            ))}
            {pool.length > 40 && (
              <div className="mst__more">…và {pool.length - 40} câu nữa</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================================
 * LỊCH SỬ THI THỬ
 * =======================================================*/
function ExamHistory({ onBack }) {
  const [rows, setRows] = useState(() => loadHistory());

  return (
    <div className="mst">
      <div className="mst__head">
        <div>
          <div className="mst__title">📈 Lịch sử thi thử</div>
          <div className="mst__sub">Theo dõi điểm qua từng lần thi để thấy mình có tiến bộ thật không.</div>
        </div>
        <button className="qh__close" onClick={onBack}>✕ Đóng</button>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📈</div>
          <p className="empty-state__text">Chưa có lần thi nào. Chọn một đề và bấm “⏱ Thi thử”.</p>
        </div>
      ) : (
        <>
          <div className="hist__list">
            {rows.map((r, i) => (
              <div key={i} className={`hist__row ${r.pass ? "is-pass" : "is-fail"}`}>
                <div className="hist__when">
                  {new Date(r.at).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className="hist__exam">{r.examId}</div>
                <div className="hist__score">
                  {r.score}<span>/{r.maxScore}</span>
                </div>
                <div className="hist__raw">đúng {r.raw}/{r.total}</div>
                <div className="hist__verdict">{r.pass ? "✅ Đạt" : "❌ Chưa đạt"}</div>
              </div>
            ))}
          </div>
          <button
            className="reset-btn"
            onClick={() => {
              if (window.confirm("Xoá toàn bộ lịch sử thi thử?")) {
                clearHistory();
                setRows([]);
              }
            }}
          >
            🗑 Xoá lịch sử
          </button>
        </>
      )}
    </div>
  );
}

/* =========================================================
 * TAB CHÍNH
 * =======================================================*/
export default function ExercisesTab() {
  const [activeExam, setActiveExam] = useState("all");
  const [activeSectionType, setActiveSectionType] = useState("all");
  const [view, setView] = useState("exams"); // exams | mistakes | history
  const [globalMode, setGlobalMode] = useState(null);
  const [furigana, setFurigana] = useState(() => loadSettings().showFurigana);

  const mistakes = mistakeEntries();
  const dueMistakes = mistakes.filter((m) => m.due).length;

  const filteredExams =
    activeExam === "all" ? examSets : examSets.filter((e) => e.id === activeExam);

  const finalExams = filteredExams
    .map((exam) => {
      let sections = exam.sections;
      if (activeSectionType !== "all") {
        sections = sections.filter((section) => {
          const title = section.title.toLowerCase();
          if (activeSectionType === "vocab") return title.includes("語彙") || title.includes("từ vựng");
          if (activeSectionType === "grammar") return title.includes("文法") || title.includes("ngữ pháp");
          if (activeSectionType === "reading") return title.includes("読解") || title.includes("đọc hiểu");
          if (activeSectionType === "listening")
            return section.type === "listening" || title.includes("聴解") || title.includes("nghe");
          return true;
        });
      }
      return { ...exam, sections };
    })
    .filter((exam) => exam.sections.length > 0);

  if (view === "mistakes") return <MistakeNotebook onBack={() => setView("exams")} />;
  if (view === "history") return <ExamHistory onBack={() => setView("exams")} />;

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">✏️ Bộ đề JLPT</h2>
        <p className="section-desc">
          Luyện đề theo format thật · Bài làm được <strong>lưu tự động</strong> (F5 không mất) ·
          Câu sai tự vào Sổ tay lỗi để ôn lại
        </p>
      </div>

      {/* Điều hướng nhanh */}
      <div className="ex-navbar">
        <button
          className={`ex-navbtn ${dueMistakes > 0 ? "has-due" : ""}`}
          onClick={() => setView("mistakes")}
        >
          📕 Sổ tay lỗi
          {mistakes.length > 0 && <span className="ex-navbtn__n">{mistakes.length}</span>}
          {dueMistakes > 0 && <span className="ex-navbtn__due">{dueMistakes} tới hạn</span>}
        </button>
        <button className="ex-navbtn" onClick={() => setView("history")}>
          📈 Lịch sử thi thử
        </button>
        <button
          className={`ex-navbtn ${furigana ? "is-on" : ""}`}
          onClick={() => setFurigana((v) => !v)}
          title="Hiện cách đọc cho những cụm kanji có trong dữ liệu"
        >
          ふ Furigana
        </button>
        <div className="ex-navbar__spacer" />
        <button
          className={`ex-navbtn ${globalMode === "practice" ? "is-on" : ""}`}
          onClick={() => setGlobalMode("practice")}
          title="Áp dụng cho các đề chưa bắt đầu"
        >
          📚 Mặc định: Luyện tập
        </button>
        <button
          className={`ex-navbtn ${globalMode === "test" ? "is-on" : ""}`}
          onClick={() => setGlobalMode("test")}
          title="Áp dụng cho các đề chưa bắt đầu"
        >
          ⏱ Mặc định: Thi thử
        </button>
      </div>

      {/* Chọn bộ đề */}
      <div className="filter-bar exam-tab">
        <span className="filter-label">Bộ đề:</span>
        <button
          className={`filter-btn ${activeExam === "all" ? "filter-btn--active" : ""}`}
          style={{ "--c": "#a78bfa" }}
          onClick={() => setActiveExam("all")}
        >
          🌐 Tất cả
        </button>
        {examSets.map((exam) => (
          <button
            key={exam.id}
            className={`filter-btn ${activeExam === exam.id ? "filter-btn--active" : ""}`}
            onClick={() => setActiveExam(exam.id)}
          >
            🎌 {exam.id}
          </button>
        ))}
      </div>

      {/* Chọn phần thi */}
      <div className="filter-bar ex-filter-gap">
        <span className="filter-label">Phần thi:</span>
        {[
          { id: "all", label: "🌐 Tất cả", c: "#94a3b8" },
          { id: "vocab", label: "📖 Từ vựng", c: "#22d3ee" },
          { id: "grammar", label: "⚙️ Ngữ pháp", c: "#a78bfa" },
          { id: "reading", label: "📰 Đọc hiểu", c: "#34d399" },
          { id: "listening", label: "🎧 Nghe", c: "#f97316" },
        ].map((t) => (
          <button
            key={t.id}
            className={`filter-btn ${activeSectionType === t.id ? "filter-btn--active" : ""}`}
            style={{ "--c": t.c }}
            onClick={() => setActiveSectionType(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {finalExams.map((exam) => (
          <ExamCard key={exam.id} exam={exam} globalMode={globalMode} furigana={furigana} />
        ))}
      </div>

      {finalExams.length === 0 && (
        <div className="ex-empty">
          <div className="ex-empty__icon">😢</div>
          <div className="ex-empty__text">Không có dữ liệu phù hợp</div>
        </div>
      )}

      <div className="ex-footer">
        <div className="ex-footer__emoji">🎌</div>
        <div className="ex-footer__jp">がんばってください！</div>
        <div className="ex-footer__sub">
          Điểm đậu N5: tổng ≥ {N5_SCORING.passTotal}/180 · Ngôn ngữ ≥ {N5_SCORING.language.floor}/120 ·
          Nghe ≥ {N5_SCORING.listening.floor}/60
        </div>
      </div>
    </div>
  );
}
