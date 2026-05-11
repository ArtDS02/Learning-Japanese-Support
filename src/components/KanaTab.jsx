import { useState } from "react";
import kanaData from "../data/kana.json";

export default function KanaTab() {
  const [mode, setMode] = useState("hiragana"); // hiragana | katakana | katakana-words
  const [quizMode, setQuizMode] = useState(false);
  const [quizCard, setQuizCard] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);

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
            onClick={() => { setMode(m.id); setQuizMode(false); }}
          >
            {m.label}
          </button>
        ))}
        {mode !== "katakana-words" && (
          <button
            style={{
              marginLeft: "auto", background: quizMode ? "var(--accent-green)" : "rgba(255,255,255,0.06)",
              border: "1px solid var(--bg-border)", color: quizMode ? "#0a0b0f" : "var(--text-secondary)",
              padding: "6px 16px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)",
              transition: "all var(--transition)"
            }}
            onClick={quizMode ? () => setQuizMode(false) : startQuiz}
          >
            {quizMode ? "✕ Thoát Quiz" : "🎯 Quiz mode"}
          </button>
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
      {mode !== "katakana-words" && !quizMode && (
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
