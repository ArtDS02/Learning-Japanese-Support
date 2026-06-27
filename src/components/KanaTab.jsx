import { useState, useRef, useEffect } from "react";
import kanaData from "../data/kana.json";
import { recordReview } from "../lib/progress";
import "../styles/tabs/kana.css";

// Chấp nhận thêm các biến thể romaji kiểu kunrei (si=shi, tu=tsu, ...)
const ROMAJI_ALIASES = {
  shi: ["si"],
  chi: ["ti"],
  tsu: ["tu"],
  fu: ["hu"],
  ji: ["zi", "di"],
  zu: ["du"],
  n: ["nn"],
};

function isRomajiMatch(input, answer) {
  const v = input.trim().toLowerCase().replace(/[^a-z]/g, "");
  const a = answer.trim().toLowerCase();
  if (!v) return false;
  if (v === a) return true;
  return (ROMAJI_ALIASES[a] || []).includes(v);
}

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function KanaTab() {
  const [mode, setMode] = useState("hiragana"); // hiragana | katakana | katakana-words
  const [quizMode, setQuizMode] = useState(false);
  const [quizCard, setQuizCard] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [fillMode, setFillMode] = useState(false);

  const rows = [
    ["a", "i", "u", "e", "o"],
    ["ka", "ki", "ku", "ke", "ko"],
    ["sa", "shi", "su", "se", "so"],
    ["ta", "chi", "tsu", "te", "to"],
    ["na", "ni", "nu", "ne", "no"],
    ["ha", "hi", "fu", "he", "ho"],
    ["ma", "mi", "mu", "me", "mo"],
    ["ya", "", "yu", "", "yo"],
    ["ra", "ri", "ru", "re", "ro"],
    ["wa", "", "", "", "wo"],
    ["n", "", "", "", ""],
  ];

  const basicChars = mode === "hiragana"
    ? kanaData.hiragana.basic
    : kanaData.katakana.basic;

  const dakuten = kanaData.hiragana.dakuten;

  const startQuiz = () => {
    const chars = basicChars.filter(c => c.char && c.romaji);
    const pick = chars[Math.floor(Math.random() * chars.length)];
    setQuizCard(pick);
    setShowAnswer(false);
    setQuizMode(true);
  };

  const nextCard = () => {
    const chars = basicChars.filter(c => c.char && c.romaji);
    const pick = chars[Math.floor(Math.random() * chars.length)];
    setQuizCard(pick);
    setShowAnswer(false);
  };

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">🔤 Bảng chữ cái</h2>
        <p className="section-desc">Hiragana & Katakana — nền tảng đầu tiên cần thuộc lòng</p>
      </div>

      {/* Mode Selector */}
      <div className="filter-bar">
        <span className="filter-label">Loại:</span>
        {[
          { id: "hiragana", label: "あ Hiragana", color: "#22d3ee" },
          { id: "katakana", label: "ア Katakana", color: "#a78bfa" },
          { id: "katakana-words", label: "🌏 Từ Katakana", color: "#f97316" },
        ].map(m => (
          <button
            key={m.id}
            className={`filter-btn ${mode === m.id ? "filter-btn--active" : ""}`}
            style={mode === m.id ? { background: m.color, color: "#0a0b0f" } : {}}
            onClick={() => { setMode(m.id); setQuizMode(false); setFillMode(false); }}
          >
            {m.label}
          </button>
        ))}
        {mode !== "katakana-words" && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button
              style={{
                background: fillMode ? "var(--accent-violet)" : "rgba(255,255,255,0.06)",
                border: "1px solid var(--bg-border)", color: fillMode ? "#0a0b0f" : "var(--text-secondary)",
                padding: "6px 16px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)",
                transition: "all var(--transition)"
              }}
              onClick={() => { setFillMode((v) => !v); setQuizMode(false); }}
            >
              {fillMode ? "✕ Thoát" : "✍️ Điền romaji"}
            </button>
            <button
              style={{
                background: quizMode ? "var(--accent-green)" : "rgba(255,255,255,0.06)",
                border: "1px solid var(--bg-border)", color: quizMode ? "#0a0b0f" : "var(--text-secondary)",
                padding: "6px 16px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)",
                transition: "all var(--transition)"
              }}
              onClick={quizMode ? () => setQuizMode(false) : () => { startQuiz(); setFillMode(false); }}
            >
              {quizMode ? "✕ Thoát Quiz" : "🎯 Quiz nhanh"}
            </button>
          </div>
        )}
      </div>

      {/* Quiz Mode */}
      {quizMode && quizCard && (
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "var(--radius-xl)",
          padding: 40, textAlign: "center", marginBottom: 28, animation: "fade-up 0.3s ease"
        }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>
            {mode === "hiragana" ? "Hiragana này đọc là gì?" : "Katakana này đọc là gì?"}
          </div>
          <div style={{ fontSize: 100, lineHeight: 1, marginBottom: 32, color: mode === "hiragana" ? "var(--accent-cyan)" : "var(--accent-violet)" }}>
            {quizCard.char}
          </div>
          {!showAnswer ? (
            <button
              onClick={() => setShowAnswer(true)}
              style={{ background: "var(--gradient-primary)", border: "none", color: "#fff", padding: "12px 32px", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: 16, fontFamily: "var(--font-body)", fontWeight: 600 }}
            >
              Xem đáp án
            </button>
          ) : (
            <div style={{ animation: "fade-up 0.3s ease" }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: "var(--accent-green)", fontFamily: "var(--font-mono)", marginBottom: 20 }}>
                {quizCard.romaji}
              </div>
              <button
                onClick={nextCard}
                style={{ background: "var(--accent-cyan)", border: "none", color: "#0a0b0f", padding: "10px 28px", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: 15, fontFamily: "var(--font-body)", fontWeight: 700 }}
              >
                Tiếp theo →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Fill romaji mode */}
      {fillMode && mode !== "katakana-words" && (
        <FillRomaji
          chars={basicChars}
          mode={mode}
          color={mode === "hiragana" ? "#22d3ee" : "#a78bfa"}
        />
      )}

      {/* Katakana Words */}
      {mode === "katakana-words" && (
        <div>
          <div style={{ marginBottom: 16, padding: 14, background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: "var(--radius-md)", fontSize: 13, color: "var(--accent-orange)" }}>
            💡 Katakana chủ yếu dùng để viết từ ngoại lai (từ mượn tiếng Anh/Pháp/...). Học những từ này rất dễ vì bạn đã biết nghĩa rồi!
          </div>
          <div className="cards-grid">
            {kanaData.commonKatakanaWords.map((w, i) => (
              <div key={i} className="word-card" style={{ "--card-color": "#a78bfa", animationDelay: `${i * 40}ms` }}>
                <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{w.katakana}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>{w.romaji}</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{w.meaning}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>← {w.origin}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bảng chữ cái */}
      {mode !== "katakana-words" && !quizMode && !fillMode && (
        <>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, marginBottom: 12, color: mode === "hiragana" ? "var(--accent-cyan)" : "var(--accent-violet)" }}>
              {mode === "hiragana" ? "あ Bảng Hiragana cơ bản" : "ア Bảng Katakana cơ bản"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
              {basicChars.map((c, i) => (
                <div
                  key={i}
                  style={{
                    background: c.char ? "var(--bg-card)" : "transparent",
                    border: c.char ? "1px solid var(--bg-border)" : "1px solid transparent",
                    borderRadius: "var(--radius-md)", padding: "12px 8px", textAlign: "center",
                    transition: "all var(--transition)", cursor: c.char ? "default" : "default",
                    animationDelay: `${i * 20}ms`,
                  }}
                  className={c.char ? "kanji-card" : ""}
                >
                  {c.char && (
                    <>
                      <div style={{ fontSize: 28, marginBottom: 4, color: mode === "hiragana" ? "var(--accent-cyan)" : "var(--accent-violet)" }}>{c.char}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)" }}>{c.romaji}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dakuten - only for hiragana */}
          {mode === "hiragana" && (
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, marginBottom: 12, color: "var(--accent-orange)" }}>
                ゛Hàng biến âm (Dakuten & Handakuten)
              </div>
              <div style={{ marginBottom: 12, fontSize: 13, color: "var(--text-secondary)", padding: "10px 14px", background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: "var(--radius-sm)" }}>
                💡 Thêm ゛(dakuten) để đổi k→g, s→z, t→d, h→b · Thêm ゜(handakuten) để đổi h→p
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                {dakuten.map((c, i) => (
                  <div key={i} className="kanji-card" style={{ animationDelay: `${i * 20}ms` }}>
                    <div style={{ fontSize: 26, marginBottom: 4, color: "var(--accent-orange)" }}>{c.char}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)" }}>{c.romaji}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Điền romaji ──────────────────────────────────────────────────────────────
function FillRomaji({ chars, mode, color }) {
  const pool = chars.filter((c) => c.char && c.romaji);
  const [deck, setDeck] = useState(() => shuffleArr(pool));
  const [i, setI] = useState(0);
  const [value, setValue] = useState("");
  const [status, setStatus] = useState(null); // null | "correct" | "wrong"
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [done, setDone] = useState(false);
  const inputRef = useRef(null);

  const cur = deck[i];

  // Tự focus ô nhập mỗi khi sang thẻ mới
  useEffect(() => {
    if (!done) inputRef.current?.focus();
  }, [i, done]);

  const restart = () => {
    setDeck(shuffleArr(pool));
    setI(0);
    setValue("");
    setStatus(null);
    setScore({ correct: 0, wrong: 0 });
    setDone(false);
  };

  const goNext = () => {
    if (i + 1 >= deck.length) {
      setDone(true);
    } else {
      setI((p) => p + 1);
      setValue("");
      setStatus(null);
    }
  };

  const submit = () => {
    if (status) {
      // đã chấm rồi → Enter để sang thẻ tiếp
      goNext();
      return;
    }
    if (!value.trim()) return;
    const ok = isRomajiMatch(value, cur.romaji);
    setStatus(ok ? "correct" : "wrong");
    setScore((s) => ({
      correct: s.correct + (ok ? 1 : 0),
      wrong: s.wrong + (ok ? 0 : 1),
    }));
    recordReview(1);
    if (ok) setTimeout(goNext, 650); // đúng → tự chuyển
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  if (pool.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">🔤</div>
        <p className="empty-state__text">Không có chữ cái để luyện.</p>
      </div>
    );
  }

  // Màn hình tổng kết
  if (done) {
    const total = score.correct + score.wrong;
    const pct = total ? Math.round((score.correct / total) * 100) : 0;
    return (
      <div className="flashcard-wrapper">
        <div className="flash-summary">
          <div style={{ fontSize: 54, marginBottom: 8 }}>
            {pct === 100 ? "🎉" : pct >= 70 ? "👏" : "💪"}
          </div>
          <h3 className="flash-summary__title">Hoàn thành!</h3>
          <p className="flash-summary__sub">
            Đúng {score.correct}/{total} chữ · {pct}%
          </p>
          <div className="flash-summary__stats">
            <div className="flash-stat" style={{ "--c": "#34d399" }}>
              <div className="flash-stat__n">{score.correct}</div>
              <div className="flash-stat__l">✓ Đúng</div>
            </div>
            <div className="flash-stat" style={{ "--c": "#f87171" }}>
              <div className="flash-stat__n">{score.wrong}</div>
              <div className="flash-stat__l">✗ Sai</div>
            </div>
          </div>
          <button className="flash-restart-btn" onClick={restart}>
            🔀 Xáo lại & học tiếp
          </button>
        </div>
      </div>
    );
  }

  const progress = Math.round((i / deck.length) * 100);

  return (
    <div className="fill-quiz">
      <div className="fill-quiz__bar">
        <div className="fill-quiz__top">
          <span className="fill-quiz__count">
            {i + 1} / {deck.length}
          </span>
          <span className="fill-quiz__score">
            <span style={{ color: "#34d399" }}>✓ {score.correct}</span>
            <span style={{ color: "#f87171", marginLeft: 8 }}>✗ {score.wrong}</span>
          </span>
          <button className="fill-quiz__shuffle" onClick={restart} title="Xáo lại từ đầu">
            🔀
          </button>
        </div>
        <div className="flash-track">
          <div className="flash-track__fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="fill-quiz__prompt">
        {mode === "hiragana" ? "Hiragana" : "Katakana"} này đọc là gì? (gõ romaji)
      </div>

      <div className="fill-quiz__char" style={{ color }}>
        {cur.char}
      </div>

      <input
        ref={inputRef}
        className={`fill-quiz__input ${status ? `is-${status}` : ""}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Gõ romaji rồi Enter…"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        disabled={status === "correct"}
      />

      <div className="fill-quiz__feedback">
        {status === "correct" && <span className="is-correct">✓ Chính xác!</span>}
        {status === "wrong" && (
          <span className="is-wrong">
            ✗ Đáp án: <strong>{cur.romaji}</strong> — Enter để tiếp
          </span>
        )}
        {!status && <span className="hint">Enter để kiểm tra</span>}
      </div>

      <button className="fill-quiz__next" onClick={submit}>
        {status ? "Tiếp theo →" : "Kiểm tra"}
      </button>
    </div>
  );
}
