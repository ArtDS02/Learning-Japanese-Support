import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import kanjiData from "../data/kanji.json";
import { rateCard } from "../lib/srs";
import { recordReview } from "../lib/progress";

export default function KanjiTab() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(null); // index in `filtered`
  const [marked, setMarked] = useState(new Set()); // Set of kanji ids
  const [mode, setMode] = useState("browse"); // "browse" | "flashcard"

  const filtered = useMemo(() => {
    return kanjiData.kanji.filter((k) => {
      const matchCat =
        activeCategory === "all" || k.category === activeCategory;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        k.char.includes(q) ||
        k.meaning.toLowerCase().includes(q) ||
        k.on.toLowerCase().includes(q) ||
        k.kun.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [activeCategory, search]);

  const catColor = (id) =>
    kanjiData.categories.find((c) => c.id === id)?.color || "#a78bfa";

  const toggleMark = (id) => {
    setMarked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const markedList = kanjiData.kanji.filter((k) => marked.has(k.id));

  // Keyboard navigation in modal
  useEffect(() => {
    if (selectedIdx === null) return;
    const handler = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Escape") {
        setSelectedIdx(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIdx, filtered.length]);

  if (mode === "flashcard") {
    return (
      <FlashcardMode
        deck={markedList.length > 0 ? markedList : filtered}
        catColor={catColor}
        onExit={() => setMode("browse")}
        isMarkedOnly={markedList.length > 0}
      />
    );
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">🈳 Kanji N5</h2>
        <p className="section-desc">
          {kanjiData.kanji.length} kanji · Nhấn vào kanji để xem chi tiết
          {marked.size > 0 && (
            <span style={{ marginLeft: 8, color: "#f59e0b", fontWeight: 700 }}>
              · ★ {marked.size} đã đánh dấu
            </span>
          )}
        </p>
      </div>

      {/* Toolbar */}
      <div
        style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}
      >
        <button
          onClick={() => setMode("flashcard")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: 20,
            border: "1.5px solid #a78bfa",
            background: "#a78bfa22",
            color: "#a78bfa",
            fontSize: 20,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
          }}
        >
          🃏 Flashcard{" "}
          {markedList.length > 0
            ? `(★ ${markedList.length})`
            : `(${filtered.length})`}
        </button>
        {marked.size > 0 && (
          <button
            onClick={() => setMarked(new Set())}
            style={{
              padding: "8px 14px",
              borderRadius: 20,
              border: "1.5px solid #f59e0b44",
              background: "transparent",
              color: "#f59e0b",
              fontSize: 20,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
            }}
          >
            Bỏ tất cả ★
          </button>
        )}
      </div>

      <div className="search-box">
        <span className="search-box__icon">🔍</span>
        <input
          type="text"
          placeholder="Tìm kanji (chữ, nghĩa, cách đọc)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="filter-bar">
        <span className="filter-label">Nhóm:</span>
        <button
          className={`filter-btn ${activeCategory === "all" ? "filter-btn--active" : ""}`}
          style={
            activeCategory === "all"
              ? { background: "#a78bfa", color: "#0a0b0f" }
              : {}
          }
          onClick={() => setActiveCategory("all")}
        >
          🌐 Tất cả ({kanjiData.kanji.length})
        </button>
        {kanjiData.categories.map((cat) => {
          const count = kanjiData.kanji.filter(
            (k) => k.category === cat.id,
          ).length;
          return (
            <button
              key={cat.id}
              className={`filter-btn ${activeCategory === cat.id ? "filter-btn--active" : ""}`}
              style={
                activeCategory === cat.id
                  ? { background: cat.color, color: "#0a0b0f" }
                  : {}
              }
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.icon} {cat.label} ({count})
            </button>
          );
        })}
      </div>

      <div
        style={{ display: "flex", gap: 20, marginBottom: 20, flexWrap: "wrap" }}
      >
        <span
          style={{
            fontSize: 20,
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              color: "var(--accent-yellow)",
              fontFamily: "var(--font-mono)",
              fontSize: 20,
            }}
          >
            ■
          </span>
          Âm On (Hán-Nhật)
        </span>
        <span
          style={{
            fontSize: 20,
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              color: "var(--accent-cyan)",
              fontFamily: "var(--font-mono)",
              fontSize: 20,
            }}
          >
            ■
          </span>
          Âm Kun (thuần Nhật)
        </span>
        <span
          style={{
            fontSize: 20,
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ color: "#f59e0b", fontSize: 20 }}>★</span>
          Đã đánh dấu
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">🈳</div>
          <p className="empty-state__text">Không tìm thấy kanji nào.</p>
        </div>
      ) : (
        <div className="kanji-grid">
          {filtered.map((k, idx) => (
            <div
              key={k.id}
              className="kanji-card"
              style={{
                "--card-color": catColor(k.category),
                animationDelay: `${idx * 30}ms`,
                position: "relative",
              }}
              onClick={() => setSelectedIdx(idx)}
            >
              {/* Mark button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMark(k.id);
                }}
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 40,
                  lineHeight: 1,
                  padding: 2,
                  color: marked.has(k.id) ? "#f59e0b" : "var(--text-muted)",
                  opacity: marked.has(k.id) ? 1 : 0.4,
                  transition: "all 0.2s",
                  zIndex: 100,
                }}
                title={marked.has(k.id) ? "Bỏ đánh dấu" : "Đánh dấu"}
              >
                ★
              </button>
              {/* <span className="kanji-stroke">{k.stroke}nét</span> */}
              <span className="kanji-char">{k.char}</span>
              <div className="kanji-meaning">{k.meaning}</div>
              <div className="kanji-readings">
                <span className="kanji-on">On: {k.on}</span>
                <span className="kanji-kun">Kun: {k.kun}</span>
              </div>
              <div className="kanji-readings" style={{ marginTop: 2 }}>
                <span
                  style={{
                    fontSize: 20,
                    color: "var(--text-muted)",
                    fontStyle: "italic",
                  }}
                >
                  {k.on_romaji}
                </span>
                <span
                  style={{
                    fontSize: 20,
                    color: "var(--text-muted)",
                    fontStyle: "italic",
                  }}
                >
                  {k.kun_romaji}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedIdx !== null && (
        <KanjiModal
          kanji={filtered[selectedIdx]}
          idx={selectedIdx}
          total={filtered.length}
          onClose={() => setSelectedIdx(null)}
          onPrev={() => setSelectedIdx((i) => Math.max(i - 1, 0))}
          onNext={() =>
            setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1))
          }
          catColor={catColor(filtered[selectedIdx].category)}
          isMarked={marked.has(filtered[selectedIdx].id)}
          onToggleMark={() => toggleMark(filtered[selectedIdx].id)}
        />
      )}
    </div>
  );
}

// ─── Stroke Animator ──────────────────────────────────────────────────────────

function StrokeOrderAnimator({ strokes, catColor }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const pathRefs = useRef([]);
  const timersRef = useRef([]);
  const STROKE_MS = 550;
  const GAP_MS = 120;

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }
  function getLen(el) {
    try {
      return el.getTotalLength();
    } catch {
      return 100;
    }
  }

  function animate() {
    clearTimers();
    setIsPlaying(true);
    setCurrent(0);
    pathRefs.current.forEach((el) => {
      if (!el) return;
      el.style.transition = "none";
      const len = getLen(el);
      el.setAttribute("stroke-dasharray", len);
      el.setAttribute("stroke-dashoffset", len);
      el.setAttribute("stroke", "rgba(180,180,180,0.25)");
      el.setAttribute("stroke-width", "3");
    });
    strokes.forEach((_, i) => {
      const t1 = setTimeout(
        () => {
          setCurrent(i + 1);
          const el = pathRefs.current[i];
          if (!el) return;
          const len = getLen(el);
          el.setAttribute("stroke", catColor);
          el.setAttribute("stroke-width", "4.5");
          el.style.transition = `stroke-dashoffset ${STROKE_MS}ms cubic-bezier(0.3,0,0.2,1)`;
          el.setAttribute("stroke-dashoffset", "0");
          const t2 = setTimeout(() => {
            el.setAttribute("stroke", catColor + "bb");
            el.setAttribute("stroke-width", "3.5");
            el.style.transition = "stroke 300ms, stroke-width 300ms";
          }, STROKE_MS + 60);
          timersRef.current.push(t2);
        },
        i * (STROKE_MS + GAP_MS),
      );
      timersRef.current.push(t1);
    });
    const done = strokes.length * (STROKE_MS + GAP_MS) + STROKE_MS + 200;
    const tEnd = setTimeout(() => {
      setIsPlaying(false);
      setCurrent(strokes.length);
    }, done);
    timersRef.current.push(tEnd);
  }

  function showAll() {
    clearTimers();
    setIsPlaying(false);
    setCurrent(strokes.length);
    pathRefs.current.forEach((el) => {
      if (!el) return;
      const len = getLen(el);
      el.style.transition = "none";
      el.setAttribute("stroke-dasharray", len);
      el.setAttribute("stroke-dashoffset", "0");
      el.setAttribute("stroke", catColor + "bb");
      el.setAttribute("stroke-width", "3.5");
    });
  }

  useEffect(() => {
    if (strokes && strokes.length > 0) {
      const t = setTimeout(animate, 200);
      return () => {
        clearTimeout(t);
        clearTimers();
      };
    }
  }, [strokes]);

  if (!strokes || strokes.length === 0) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 20,
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        ✍️ Thứ tự nét viết
        <span
          style={{
            fontSize: 20,
            background: `${catColor}22`,
            color: catColor,
            borderRadius: 20,
            padding: "2px 8px",
            fontWeight: 700,
          }}
        >
          {current}/{strokes.length} nét
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 168,
            height: 168,
            borderRadius: 16,
            border: `2px solid ${catColor}44`,
            background: `${catColor}09`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <svg
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              opacity: 0.12,
            }}
            viewBox="0 0 168 168"
          >
            <line
              x1="84"
              y1="0"
              x2="84"
              y2="168"
              stroke={catColor}
              strokeWidth="1"
              strokeDasharray="5 4"
            />
            <line
              x1="0"
              y1="84"
              x2="168"
              y2="84"
              stroke={catColor}
              strokeWidth="1"
              strokeDasharray="5 4"
            />
            <line
              x1="0"
              y1="0"
              x2="168"
              y2="168"
              stroke={catColor}
              strokeWidth="0.5"
              strokeDasharray="3 5"
            />
            <line
              x1="168"
              y1="0"
              x2="0"
              y2="168"
              stroke={catColor}
              strokeWidth="0.5"
              strokeDasharray="3 5"
            />
          </svg>
          <svg
            viewBox="0 0 109 109"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: "100%", height: "100%", display: "block" }}
          >
            {strokes.map((d, i) => (
              <path
                key={i}
                ref={(el) => (pathRefs.current[i] = el)}
                d={d}
                fill="none"
                stroke="rgba(180,180,180,0.25)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="999"
                strokeDashoffset="999"
              />
            ))}
          </svg>
        </div>
        <div
          style={{
            display: "flex",
            gap: 5,
            flexWrap: "wrap",
            justifyContent: "center",
            maxWidth: 200,
          }}
        >
          {strokes.map((_, i) => (
            <div
              key={i}
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: i < current ? catColor : `${catColor}22`,
                color: i < current ? "#0a0b0f" : catColor,
                fontSize: 10,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-mono)",
                transition: "background 0.3s, color 0.3s",
                border: `1.5px solid ${catColor}55`,
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={animate}
            disabled={isPlaying}
            style={{
              padding: "7px 16px",
              borderRadius: 20,
              border: `1.5px solid ${catColor}`,
              background: isPlaying ? `${catColor}22` : catColor,
              color: isPlaying ? catColor : "#0a0b0f",
              fontSize: 20,
              fontWeight: 700,
              cursor: isPlaying ? "not-allowed" : "pointer",
              fontFamily: "var(--font-mono)",
              transition: "all 0.2s",
            }}
          >
            {isPlaying ? "⏳ Đang vẽ..." : "▶ Vẽ lại"}
          </button>
          <button
            onClick={showAll}
            disabled={isPlaying}
            style={{
              padding: "7px 16px",
              borderRadius: 20,
              border: `1.5px solid ${catColor}55`,
              background: "transparent",
              color: catColor,
              fontSize: 20,
              fontWeight: 700,
              cursor: isPlaying ? "not-allowed" : "pointer",
              fontFamily: "var(--font-mono)",
              opacity: isPlaying ? 0.5 : 1,
              transition: "all 0.2s",
            }}
          >
            Xem tất cả
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function KanjiModal({ kanji, onClose, catColor }) {
  return (
    <div className="kanji-modal-overlay" onClick={onClose}>
      <div className="kanji-modal" onClick={(e) => e.stopPropagation()}>
        <button className="kanji-modal__close" onClick={onClose}>
          ✕
        </button>

        <div className="kanji-character">
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <span
              style={{
                fontSize: 15,
                padding: "3px 10px",
                borderRadius: 20,
                background: `${catColor}22`,
                color: catColor,
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
              }}
            >
              {kanjiData.categories.find((c) => c.id === kanji.category)?.icon}{" "}
              {kanjiData.categories.find((c) => c.id === kanji.category)?.label}
            </span>
          </div>

          <div className="kanji-modal__char" style={{ color: catColor }}>
            {kanji.char}
          </div>
          <div className="kanji-modal__meaning">{kanji.meaning}</div>

          <div className="stroke-number">
            <span>Số nét: {kanji.stroke}</span>
          </div>

          <StrokeOrderAnimator strokes={kanji.strokes} catColor={catColor} />

          <div className="kanji-modal__readings">
            <div className="kanji-modal__reading-group">
              <div className="kanji-modal__reading-label">Âm On</div>
              <div
                className="kanji-modal__reading-value"
                style={{ color: "var(--accent-yellow)" }}
              >
                {kanji.on}
              </div>
              <div
                style={{
                  fontSize: 15,
                  color: "var(--text-muted)",
                  fontStyle: "italic",
                  marginTop: 3,
                }}
              >
                {kanji.on_romaji}
              </div>
            </div>
            <div
              style={{
                width: 1,
                background: "var(--bg-border)",
                margin: "0 8px",
              }}
            />
            <div className="kanji-modal__reading-group">
              <div className="kanji-modal__reading-label">Âm Kun</div>
              <div
                className="kanji-modal__reading-value"
                style={{ color: "var(--accent-cyan)" }}
              >
                {kanji.kun}
              </div>
              <div
                style={{
                  fontSize: 15,
                  color: "var(--text-muted)",
                  fontStyle: "italic",
                  marginTop: 3,
                }}
              >
                {kanji.kun_romaji}
              </div>
            </div>
          </div>
        </div>
        <div className="kanji-evidence">
          {kanji.mnemonic && (
            <div className="kanji-modal__mnemonic">{kanji.mnemonic}</div>
          )}

          <div
            style={{
              fontSize: 20,
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 10,
            }}
          >
            Ví dụ từ ghép
          </div>
          <div className="kanji-modal__examples">
            {kanji.examples.map((ex, i) => (
              <div key={i} className="kanji-modal__example">
                <div>
                  <div className="kanji-modal__example-word">{ex.word}</div>
                  <div className="kanji-modal__example-reading">
                    {ex.reading}
                  </div>
                </div>
                <div className="kanji-modal__example-meaning">{ex.meaning}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Flashcard Mode ───────────────────────────────────────────────────────────

// CSS injected once for flip animation
const FLIP_STYLE = `
  .fc-scene { perspective: 1000px; width: 100%; }
  .fc-card {
    position: relative; width: 100%; min-height: 300px;
    transform-style: preserve-3d;
    transition: transform 0.52s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
  }
  .fc-card.is-flipped { transform: rotateY(180deg); }
  .fc-face {
    position: absolute; inset: 0; border-radius: 24px;
    backface-visibility: hidden; -webkit-backface-visibility: hidden;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 32px 24px; overflow: hidden;
  }
  .fc-face--back { transform: rotateY(180deg); }
 
  .fc-slide-enter  { animation: fc-slide-in  0.28s cubic-bezier(0.4,0,0.2,1) both; }
  .fc-slide-leave  { animation: fc-slide-out 0.22s cubic-bezier(0.4,0,0.2,1) both; }
  @keyframes fc-slide-in  { from { opacity:0; transform:translateX(48px); } to { opacity:1; transform:translateX(0); } }
  @keyframes fc-slide-out { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(-48px); } }
  .fc-slide-enter-left { animation: fc-slide-in-left 0.28s cubic-bezier(0.4,0,0.2,1) both; }
  @keyframes fc-slide-in-left { from { opacity:0; transform:translateX(-48px); } to { opacity:1; transform:translateX(0); } }
 
  .fc-btn-nav {
    display:flex; align-items:center; justify-content:center;
    width:44px; height:44px; border-radius:50%;
    border:1.5px solid var(--bg-border);
    background:transparent; cursor:pointer;
    font-size:18px; font-weight:700; color:var(--text-muted);
    transition:all 0.15s; flex-shrink:0;
  }
  .fc-btn-nav:hover:not(:disabled) { border-color:currentColor; color:var(--text-primary); background:var(--bg-card); }
  .fc-btn-nav:disabled { opacity:0.25; cursor:not-allowed; }
 
  .fc-answer-btn {
    flex:1; padding:14px; border-radius:16px;
    font-size:14px; font-weight:700; cursor:pointer; transition:all 0.15s;
    border:1.5px solid transparent;
  }
  .fc-answer-btn:hover { filter:brightness(1.15); transform:translateY(-1px); }
  .fc-answer-btn:active { transform:translateY(0); }
 
  .fc-kbd-hint {
    display:inline-flex; align-items:center; gap:3px;
    font-size:10px; color:var(--text-muted); opacity:0.6;
    font-family:var(--font-mono);
  }
  .fc-kbd-hint kbd {
    background:var(--bg-card); border:1px solid var(--bg-border);
    border-radius:4px; padding:1px 5px; font-size:9px;
  }
`;

function FlashcardMode({ deck, catColor, onExit, isMarkedOnly }) {
  const [order, setOrder] = useState(() => deck.map((_, i) => i));
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState({}); // { orderIdx: "know"|"again" }
  const [done, setDone] = useState(false);
  const [slideDir, setSlideDir] = useState("right"); // "right" | "left"
  const [animKey, setAnimKey] = useState(0); // bump to retrigger slide anim

  // Inject CSS once
  useEffect(() => {
    if (document.getElementById("fc-styles")) return;
    const el = document.createElement("style");
    el.id = "fc-styles";
    el.textContent = FLIP_STYLE;
    document.head.appendChild(el);
  }, []);

  const shuffleDeck = useCallback(() => {
    setOrder([...deck.map((_, i) => i)].sort(() => Math.random() - 0.5));
    setCardIdx(0);
    setFlipped(false);
    setResults({});
    setDone(false);
    setSlideDir("right");
    setAnimKey((k) => k + 1);
  }, [deck]);

  useEffect(() => {
    shuffleDeck();
  }, [deck]);

  // ── Keyboard handler ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (done) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!flipped) setFlipped(true);
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        if (flipped) {
          handleAnswer("know");
        } else {
          goNext();
        }
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        if (flipped) {
          handleAnswer("again");
        } else {
          goPrev();
        }
      } else if (e.key === "1") {
        if (flipped) handleAnswer("again");
      } else if (e.key === "2") {
        if (flipped) handleAnswer("know");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flipped, cardIdx, order, done]);

  const current = deck[order[cardIdx]];
  const color = current ? catColor(current.category) : "#a78bfa";

  const knowCount = Object.values(results).filter((r) => r === "know").length;
  const againCount = Object.values(results).filter((r) => r === "again").length;
  const answered = Object.keys(results).length;
  const progress = order.length > 0 ? (answered / order.length) * 100 : 0;

  function goNext() {
    if (cardIdx >= order.length - 1) return;
    setSlideDir("right");
    setAnimKey((k) => k + 1);
    setCardIdx((i) => i + 1);
    setFlipped(false);
  }

  function goPrev() {
    if (cardIdx <= 0) return;
    setSlideDir("left");
    setAnimKey((k) => k + 1);
    setCardIdx((i) => i - 1);
    setFlipped(false);
  }

  function handleAnswer(result) {
    // Ghi nhận vào SRS + tiến độ: "know" = Nhớ, "again" = Quên
    if (current) {
      rateCard("kanji", current.id, result === "know" ? "remember" : "forget");
      recordReview(1);
    }
    const newResults = { ...results, [cardIdx]: result };
    setResults(newResults);
    if (cardIdx + 1 >= order.length) {
      setDone(true);
    } else {
      setSlideDir("right");
      setAnimKey((k) => k + 1);
      setCardIdx((i) => i + 1);
      setFlipped(false);
    }
  }

  // ── Done screen ───────────────────────────────────────────────────────────
  if (done) {
    const pct = Math.round((knowCount / order.length) * 100);
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>
          {pct === 100 ? "🎉" : pct >= 70 ? "👏" : "💪"}
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          Hoàn thành!
        </h2>
        <p
          style={{ color: "var(--text-muted)", marginBottom: 28, fontSize: 14 }}
        >
          Bạn đã ôn {order.length} kanji · đạt {pct}%
        </p>
        <div
          style={{
            display: "flex",
            gap: 16,
            justifyContent: "center",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              textAlign: "center",
              padding: "16px 28px",
              borderRadius: 16,
              background: "#22c55e22",
              border: "1.5px solid #22c55e55",
            }}
          >
            <div style={{ fontSize: 30, fontWeight: 800, color: "#22c55e" }}>
              {knowCount}
            </div>
            <div
              style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}
            >
              Đã nhớ ✓
            </div>
          </div>
          <div
            style={{
              textAlign: "center",
              padding: "16px 28px",
              borderRadius: 16,
              background: "#f59e0b22",
              border: "1.5px solid #f59e0b55",
            }}
          >
            <div style={{ fontSize: 30, fontWeight: 800, color: "#f59e0b" }}>
              {againCount}
            </div>
            <div
              style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}
            >
              Cần ôn lại
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={shuffleDeck}
            style={{
              padding: "10px 22px",
              borderRadius: 20,
              border: "1.5px solid #a78bfa",
              background: "#a78bfa",
              color: "#0a0b0f",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            🔀 Học lại (ngẫu nhiên)
          </button>
          <button
            onClick={onExit}
            style={{
              padding: "10px 22px",
              borderRadius: 20,
              border: "1.5px solid var(--bg-border)",
              background: "transparent",
              color: "var(--text-muted)",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ← Quay lại
          </button>
        </div>
      </div>
    );
  }

  const slideClass =
    slideDir === "right" ? "fc-slide-enter" : "fc-slide-enter-left";

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <button
          onClick={onExit}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          ← Quay lại
        </button>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
            textAlign: "center",
          }}
        >
          <div>{isMarkedOnly ? "★ Đã đánh dấu" : "Tất cả"}</div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {cardIdx + 1} / {order.length}
          </div>
        </div>
        <button
          onClick={shuffleDeck}
          title="Xáo bài"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            fontSize: 18,
          }}
        >
          🔀
        </button>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 5,
          borderRadius: 5,
          background: "var(--bg-border)",
          marginBottom: 20,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 5,
            background: `linear-gradient(90deg, ${color}, ${color}cc)`,
            width: `${progress}%`,
            transition: "width 0.5s ease",
          }}
        />
      </div>

      {/* Card with flip animation — wrapped in slide container */}
      <div key={animKey} className={slideClass} style={{ marginBottom: 16 }}>
        <div className="fc-scene">
          <div
            className={`fc-card${flipped ? " is-flipped" : ""}`}
            onClick={() => setFlipped((f) => !f)}
          >
            {/* Front */}
            <div
              className="fc-face fc-face--front"
              style={{
                border: `2px solid ${color}44`,
                background: `${color}09`,
              }}
            >
              <div
                style={{
                  fontSize: 88,
                  lineHeight: 1,
                  color,
                  fontWeight: 400,
                  marginBottom: 12,
                }}
              >
                {current.char}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                  marginBottom: 6,
                }}
              >
                Nhấn để xem đáp án
              </div>
              <div className="fc-kbd-hint">
                <kbd>Space</kbd> lật thẻ
              </div>
            </div>

            {/* Back */}
            <div
              className="fc-face fc-face--back"
              style={{
                border: `2px solid ${color}66`,
                background: `${color}12`,
              }}
            >
              <div style={{ textAlign: "center", width: "100%" }}>
                <div
                  style={{
                    fontSize: 54,
                    lineHeight: 1,
                    color,
                    marginBottom: 8,
                  }}
                >
                  {current.char}
                </div>
                <div
                  style={{ fontSize: 22, fontWeight: 700, marginBottom: 14 }}
                >
                  {current.meaning}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    justifyContent: "center",
                    marginBottom: 14,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text-muted)",
                        marginBottom: 2,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Âm On
                    </div>
                    <div
                      style={{
                        color: "var(--accent-yellow)",
                        fontWeight: 700,
                        fontSize: 16,
                      }}
                    >
                      {current.on}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        fontStyle: "italic",
                      }}
                    >
                      {current.on_romaji}
                    </div>
                  </div>
                  <div style={{ width: 1, background: "var(--bg-border)" }} />
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text-muted)",
                        marginBottom: 2,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Âm Kun
                    </div>
                    <div
                      style={{
                        color: "var(--accent-cyan)",
                        fontWeight: 700,
                        fontSize: 16,
                      }}
                    >
                      {current.kun}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        fontStyle: "italic",
                      }}
                    >
                      {current.kun_romaji}
                    </div>
                  </div>
                </div>

                {current.mnemonic && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      fontStyle: "italic",
                      background: "var(--bg-card)",
                      borderRadius: 10,
                      padding: "8px 14px",
                      marginBottom: 10,
                      textAlign: "left",
                    }}
                  >
                    💡 {current.mnemonic}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    justifyContent: "center",
                  }}
                >
                  {current.examples.map((ex, i) => (
                    <div
                      key={i}
                      style={{
                        background: `${color}18`,
                        borderRadius: 10,
                        padding: "6px 12px",
                        fontSize: 12,
                        textAlign: "left",
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{ex.word}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: 11 }}>
                        {ex.reading} · {ex.meaning}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls row: prev | answer buttons | next */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <button
          className="fc-btn-nav"
          onClick={goPrev}
          disabled={cardIdx === 0}
          title="Trước (←)"
        >
          ‹
        </button>

        {flipped ? (
          <div style={{ flex: 1, display: "flex", gap: 10 }}>
            <button
              className="fc-answer-btn"
              onClick={() => handleAnswer("again")}
              style={{
                border: "1.5px solid #f59e0b66",
                background: "#f59e0b22",
                color: "#f59e0b",
              }}
              title="Ôn lại (← hoặc 1)"
            >
              😅 Ôn lại
            </button>
            <button
              className="fc-answer-btn"
              onClick={() => handleAnswer("know")}
              style={{
                border: "1.5px solid #22c55e66",
                background: "#22c55e22",
                color: "#22c55e",
              }}
              title="Đã nhớ (→ hoặc 2)"
            >
              ✓ Đã nhớ
            </button>
          </div>
        ) : (
          <button
            onClick={() => setFlipped(true)}
            style={{
              flex: 1,
              padding: "13px",
              borderRadius: 16,
              border: `1.5px solid ${color}`,
              background: color,
              color: "#0a0b0f",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            title="Lật thẻ (Space)"
          >
            Lật thẻ
          </button>
        )}

        <button
          className="fc-btn-nav"
          onClick={goNext}
          disabled={cardIdx >= order.length - 1}
          title="Tiếp (→)"
        >
          ›
        </button>
      </div>

      {/* Keyboard hints */}
      <div
        style={{
          display: "flex",
          gap: 14,
          justifyContent: "center",
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        {!flipped ? (
          <span className="fc-kbd-hint">
            <kbd>Space</kbd> lật thẻ &nbsp;·&nbsp; <kbd>←</kbd>
            <kbd>→</kbd> chuyển
          </span>
        ) : (
          <span className="fc-kbd-hint">
            <kbd>←</kbd> ôn lại &nbsp;·&nbsp; <kbd>→</kbd> đã nhớ &nbsp;·&nbsp;{" "}
            <kbd>1</kbd> / <kbd>2</kbd>
          </span>
        )}
      </div>

      {/* Mini scoreboard */}
      <div
        style={{
          display: "flex",
          gap: 16,
          justifyContent: "center",
          padding: "10px 0",
          borderTop: "1px solid var(--bg-border)",
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: "#22c55e",
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
          }}
        >
          ✓ {knowCount}
        </span>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>·</span>
        <span
          style={{
            fontSize: 12,
            color: "#f59e0b",
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
          }}
        >
          ↺ {againCount}
        </span>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>·</span>
        <span
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          còn {order.length - cardIdx - 1}
        </span>
      </div>
    </div>
  );
}
