import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import kanjiData from "../data/kanji.json";
import { rateCard } from "../lib/srs";
import { recordReview } from "../lib/progress";
import "../styles/tabs/kanji.css";

export default function KanjiTab() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(null); // index in `filtered`
  const [marked, setMarked] = useState(() => {
    try {
      const saved = localStorage.getItem("kanji_marked");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  }); // Set of kanji ids
  const [learned, setLearned] = useState(() => {
    try {
      const saved = localStorage.getItem("kanji_learned");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  }); // Set of kanji ids that user marked as "đã học"
  const [mode, setMode] = useState("browse"); // "browse" | "flashcard"

  // Persist marked to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("kanji_marked", JSON.stringify([...marked]));
    } catch {}
  }, [marked]);

  // Persist learned to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("kanji_learned", JSON.stringify([...learned]));
    } catch {}
  }, [learned]);

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

  const markAll = () => {
    setMarked((prev) => {
      const next = new Set(prev);
      filtered.forEach((k) => next.add(k.id));
      return next;
    });
  };

  const unmarkAll = () => {
    setMarked((prev) => {
      const next = new Set(prev);
      filtered.forEach((k) => next.delete(k.id));
      return next;
    });
  };

  const toggleLearn = (id) => {
    setLearned((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearAllLearned = () => setLearned(new Set());

  const allFilteredMarked =
    filtered.length > 0 && filtered.every((k) => marked.has(k.id));

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
        learned={learned}
        onToggleLearn={toggleLearn}
        onClearLearned={clearAllLearned}
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
            <span className="k-count-mark">· ★ {marked.size} đã đánh dấu</span>
          )}
          {learned.size > 0 && (
            <span className="k-count-learn">· ✓ {learned.size} đã học</span>
          )}
        </p>
      </div>

      {/* Toolbar */}
      <div className="k-toolbar">
        <button className="k-flashbtn" onClick={() => setMode("flashcard")}>
          🃏 Flashcard{" "}
          {markedList.length > 0
            ? `(★ ${markedList.length})`
            : `(${filtered.length})`}
        </button>

        {/* Mark all / Unmark all cho filtered hiện tại */}
        {!allFilteredMarked ? (
          <button
            className="k-markbtn"
            onClick={markAll}
            title={`Đánh dấu tất cả ${filtered.length} kanji đang hiển thị`}
          >
            ★ Đánh dấu tất cả
          </button>
        ) : (
          <button
            className="k-markbtn is-on"
            onClick={unmarkAll}
            title={`Bỏ đánh dấu tất cả ${filtered.length} kanji đang hiển thị`}
          >
            ☆ Bỏ đánh dấu tất cả
          </button>
        )}

        {/* Xóa tất cả đánh dấu đã học */}
        {learned.size > 0 && (
          <button
            className="k-clearbtn"
            onClick={clearAllLearned}
            title="Xóa tất cả đánh dấu đã học"
          >
            ✓ Xóa đã học ({learned.size})
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
          style={{ "--c": "#a78bfa" }}
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
              style={{ "--c": cat.color }}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.icon} {cat.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="k-legend">
        <span className="k-legend__item">
          <span className="k-legend__sq" style={{ "--c": "var(--accent-yellow)" }}>■</span>
          Âm On (Hán-Nhật)
        </span>
        <span className="k-legend__item">
          <span className="k-legend__sq" style={{ "--c": "var(--accent-cyan)" }}>■</span>
          Âm Kun (thuần Nhật)
        </span>
        <span className="k-legend__item">
          <span className="k-legend__sym" style={{ "--c": "#f59e0b" }}>★</span>
          Đã đánh dấu
        </span>
        <span className="k-legend__item">
          <span className="k-legend__sym" style={{ "--c": "#22c55e" }}>✓</span>
          Đã học
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
              }}
              onClick={() => setSelectedIdx(idx)}
            >
              {/* Mark button */}
              <button
                className={`k-card__mark ${marked.has(k.id) ? "is-on" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMark(k.id);
                }}
                title={marked.has(k.id) ? "Bỏ đánh dấu" : "Đánh dấu"}
              >
                ★
              </button>
              {/* Learned badge */}
              {learned.has(k.id) && <div className="k-card__learned">✓</div>}
              {/* <span className="kanji-stroke">{k.stroke}nét</span> */}
              <span className="kanji-char">{k.char}</span>
              <div className="kanji-meaning">{k.meaning}</div>
              <div className="kanji-readings">
                <span className="kanji-on">On: {k.on}</span>
                <span className="kanji-kun">Kun: {k.kun}</span>
              </div>
              <div className="kanji-readings k-readings--romaji">
                <span className="k-romaji">{k.on_romaji}</span>
                <span className="k-romaji">{k.kun_romaji}</span>
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
          isLearned={learned.has(filtered[selectedIdx].id)}
          onToggleLearn={() => toggleLearn(filtered[selectedIdx].id)}
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
    <div className="k-stroke" style={{ "--c": catColor }}>
      <div className="k-stroke__title">
        ✍️ Thứ tự nét viết
        <span className="k-stroke__count">
          {current}/{strokes.length} nét
        </span>
      </div>
      <div className="k-stroke__body">
        <div className="k-stroke__canvas">
          <svg className="k-stroke__grid"
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
            className="k-stroke__svg"
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
        <div className="k-stroke__dots">
          {strokes.map((_, i) => (
            <div key={i} className={`k-stroke__dot ${i < current ? "is-done" : ""}`}>
              {i + 1}
            </div>
          ))}
        </div>
        <div className="k-stroke__btns">
          <button className="k-stroke__play" onClick={animate} disabled={isPlaying}>
            {isPlaying ? "⏳ Đang vẽ..." : "▶ Vẽ lại"}
          </button>
          <button className="k-stroke__all" onClick={showAll} disabled={isPlaying}>
            Xem tất cả
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function KanjiModal({
  kanji,
  onClose,
  catColor,
  isMarked,
  onToggleMark,
  isLearned,
  onToggleLearn,
}) {
  return (
    <div className="kanji-modal-overlay" onClick={onClose}>
      <div
        className="kanji-modal"
        style={{ "--c": catColor }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="kanji-modal__close" onClick={onClose}>
          ✕
        </button>

        <div className="kanji-character">
          <div className="km-cat-row">
            <span className="km-cat">
              {kanjiData.categories.find((c) => c.id === kanji.category)?.icon}{" "}
              {kanjiData.categories.find((c) => c.id === kanji.category)?.label}
            </span>
          </div>

          <div className="kanji-modal__char">{kanji.char}</div>
          <div className="kanji-modal__meaning">{kanji.meaning}</div>

          <div className="stroke-number">
            <span>Số nét: {kanji.stroke}</span>
          </div>

          <StrokeOrderAnimator strokes={kanji.strokes} catColor={catColor} />

          <div className="kanji-modal__readings">
            <div className="kanji-modal__reading-group">
              <div className="kanji-modal__reading-label">Âm On</div>
              <div className="kanji-modal__reading-value km-on">{kanji.on}</div>
              <div className="km-reading-romaji">{kanji.on_romaji}</div>
            </div>
            <div className="km-divider" />
            <div className="kanji-modal__reading-group">
              <div className="kanji-modal__reading-label">Âm Kun</div>
              <div className="kanji-modal__reading-value km-kun">{kanji.kun}</div>
              <div className="km-reading-romaji">{kanji.kun_romaji}</div>
            </div>
          </div>
        </div>
        <div className="kanji-evidence">
          {kanji.mnemonic && (
            <div className="kanji-modal__mnemonic">{kanji.mnemonic}</div>
          )}

          <div className="km-examples-label">Ví dụ từ ghép</div>
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

          {/* Action buttons: Mark + Learned */}
          <div className="km-actions">
            <button
              className={`km-actbtn km-actbtn--mark ${isMarked ? "is-on" : ""}`}
              onClick={onToggleMark}
            >
              {isMarked ? "★ Bỏ đánh dấu" : "☆ Đánh dấu"}
            </button>
            <button
              className={`km-actbtn km-actbtn--learn ${isLearned ? "is-on" : ""}`}
              onClick={onToggleLearn}
            >
              {isLearned ? "✓ Đã học rồi" : "○ Đánh dấu đã học"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Flashcard Mode ───────────────────────────────────────────────────────────
// (Style cho .fc-* nằm trong styles/tabs/kanji.css)

function FlashcardMode({
  deck,
  catColor,
  onExit,
  isMarkedOnly,
  learned,
  onToggleLearn,
  onClearLearned,
}) {
  const [showIntro, setShowIntro] = useState(true); // màn hình chào khi vừa vào
  const [order, setOrder] = useState(() => deck.map((_, i) => i));
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState({}); // { orderIdx: "know"|"again" }
  const [done, setDone] = useState(false);
  const [slideDir, setSlideDir] = useState("right"); // "right" | "left"
  const [animKey, setAnimKey] = useState(0); // bump to retrigger slide anim

  const shuffleDeck = useCallback(() => {
    setOrder([...deck.map((_, i) => i)].sort(() => Math.random() - 0.5));
    setCardIdx(0);
    setFlipped(false);
    setResults({});
    setDone(false);
    setShowIntro(false); // học lại thì không show intro nữa
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

      // Flip card
      if (
        e.key === " " ||
        e.key === "Enter" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown"
      ) {
        e.preventDefault();

        if (!flipped) {
          setFlipped(true); // <-- FIX
        } else {
          handleAnswer("know");
        }

        return;
      }

      // Next
      if (e.key === "ArrowRight") {
        e.preventDefault();

        if (flipped) {
          handleAnswer("know");
        } else {
          goNext();
        }

        return;
      }

      // Prev / Again
      if (e.key === "ArrowLeft") {
        e.preventDefault();

        if (flipped) {
          handleAnswer("again");
        } else {
          goPrev();
        }

        return;
      }

      // Shortcuts
      if (e.key === "1" && flipped) {
        handleAnswer("again");
      }

      if (e.key === "2" && flipped) {
        handleAnswer("know");
      }
    };

    window.addEventListener("keydown", handler);

    return () => {
      window.removeEventListener("keydown", handler);
    };
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

  // ── Intro screen ─────────────────────────────────────────────────────────
  if (showIntro) {
    const learnedInDeck = deck.filter((k) => learned.has(k.id)).length;
    const unlearnedCount = deck.length - learnedInDeck;
    return (
      <div className="kfc-center">
        <div className="kfc-emoji-lg">🃏</div>
        <h2 className="kfc-title">
          {isMarkedOnly ? "Ôn kanji đã đánh dấu" : "Ôn tất cả kanji"}
        </h2>
        <p className="kfc-sub">
          {deck.length} thẻ sẽ được xáo ngẫu nhiên
          {learnedInDeck > 0 && (
            <span className="kfc-sub-learned">
              ✓ {learnedInDeck} đã học · {unlearnedCount} còn lại
            </span>
          )}
        </p>

        {/* Stats nhanh */}
        <div className="kfc-stats">
          <div className="kfc-stat" style={{ "--c": "#a78bfa" }}>
            <div className="kfc-stat__n">{deck.length}</div>
            <div className="kfc-stat__l">Tổng thẻ</div>
          </div>
          {learnedInDeck > 0 && (
            <div className="kfc-stat" style={{ "--c": "#22c55e" }}>
              <div className="kfc-stat__n">{learnedInDeck}</div>
              <div className="kfc-stat__l">Đã học</div>
            </div>
          )}
        </div>

        <div className="kfc-actions">
          <button className="kfc-btn-primary" onClick={() => setShowIntro(false)}>
            🚀 Bắt đầu học
          </button>
          <button className="kfc-btn-ghost" onClick={onExit}>
            ← Quay lại
          </button>
        </div>

        {learnedInDeck > 0 && (
          <button className="kfc-btn-clear" onClick={onClearLearned}>
            Xóa {learnedInDeck} đánh dấu đã học
          </button>
        )}
      </div>
    );
  }

  // ── Done screen ───────────────────────────────────────────────────────────
  if (done) {
    const pct = Math.round((knowCount / order.length) * 100);
    return (
      <div className="kfc-done">
        <div className="kfc-emoji-xl">
          {pct === 100 ? "🎉" : pct >= 70 ? "👏" : "💪"}
        </div>
        <h2 className="kfc-title kfc-title--done">Hoàn thành!</h2>
        <p className="kfc-sub">
          Bạn đã ôn {order.length} kanji · đạt {pct}%
        </p>
        <div className="kfc-stats">
          <div className="kfc-dstat" style={{ "--c": "#22c55e" }}>
            <div className="kfc-dstat__n">{knowCount}</div>
            <div className="kfc-dstat__l">Đã nhớ ✓</div>
          </div>
          <div className="kfc-dstat" style={{ "--c": "#f59e0b" }}>
            <div className="kfc-dstat__n">{againCount}</div>
            <div className="kfc-dstat__l">Cần ôn lại</div>
          </div>
        </div>
        <div className="kfc-actions kfc-actions--done">
          <button className="kfc-btn-primary" onClick={shuffleDeck}>
            🔀 Học lại (ngẫu nhiên)
          </button>
          <button className="kfc-btn-ghost" onClick={onExit}>
            ← Quay lại
          </button>
        </div>
        {learned.size > 0 && (
          <button className="kfc-btn-clear" onClick={onClearLearned}>
            Xóa tất cả {learned.size} đánh dấu đã học
          </button>
        )}
      </div>
    );
  }

  const slideClass =
    slideDir === "right" ? "fc-slide-enter" : "fc-slide-enter-left";

  return (
    <div>
      {/* Header */}
      <div className="kfc-header">
        <button className="kfc-header__back" onClick={onExit}>
          ← Quay lại
        </button>
        <div className="kfc-header__center">
          <div>{isMarkedOnly ? "★ Đã đánh dấu" : "Tất cả"}</div>
          <div className="kfc-header__pos">
            {cardIdx + 1} / {order.length}
          </div>
        </div>
        <button className="kfc-header__shuffle" onClick={shuffleDeck} title="Xáo bài">
          🔀
        </button>
      </div>

      {/* Progress bar */}
      <div className="kfc-progress" style={{ "--c": color }}>
        <div className="kfc-progress__fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Card with flip animation — wrapped in slide container */}
      <div key={animKey} className={`${slideClass} kfc-slide`} style={{ "--c": color }}>
        <div className="fc-scene">
          <div
            className={`fc-card${flipped ? " is-flipped" : ""}`}
            onClick={() => setFlipped((f) => !f)}
          >
            {/* Front */}
            <div className="fc-face fc-face--front">
              {/* Learned badge top-right */}
              <button
                className={`kfc-learn-toggle ${learned.has(current.id) ? "is-on" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLearn(current.id);
                }}
                title={
                  learned.has(current.id)
                    ? "Bỏ đánh dấu đã học"
                    : "Đánh dấu đã học"
                }
              >
                {learned.has(current.id) ? "✓ Đã học" : "○ Đã học"}
              </button>
              <div className="kfc-char-front">{current.char}</div>
              <div className="kfc-tap">Nhấn để xem đáp án</div>
              <div className="fc-kbd-hint">
                <kbd>Space</kbd> lật thẻ
              </div>
            </div>

            {/* Back */}
            <div className="fc-face fc-face--back">
              <div className="kfc-back-inner">
                <div className="kfc-char-back">{current.char}</div>
                <div className="kfc-meaning">{current.meaning}</div>

                <div className="kfc-readings">
                  <div className="kfc-reading">
                    <div className="kfc-reading__label">Âm On</div>
                    <div className="kfc-reading__on">{current.on}</div>
                    <div className="kfc-reading__romaji">{current.on_romaji}</div>
                  </div>
                  <div className="kfc-vdivider" />
                  <div className="kfc-reading">
                    <div className="kfc-reading__label">Âm Kun</div>
                    <div className="kfc-reading__kun">{current.kun}</div>
                    <div className="kfc-reading__romaji">{current.kun_romaji}</div>
                  </div>
                </div>

                {current.mnemonic && (
                  <div className="kfc-mnemonic">💡 {current.mnemonic}</div>
                )}

                <div className="kfc-examples">
                  {current.examples.map((ex, i) => (
                    <div key={i} className="kfc-example">
                      <div className="kfc-example__word">{ex.word}</div>
                      <div className="kfc-example__sub">
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
      <div className="kfc-controls" style={{ "--c": color }}>
        <button
          className="fc-btn-nav"
          onClick={goPrev}
          disabled={cardIdx === 0}
          title="Trước (←)"
        >
          ‹
        </button>

        {flipped ? (
          <div className="kfc-answers">
            <button
              className="fc-answer-btn fc-answer-btn--again"
              onClick={() => handleAnswer("again")}
              title="Ôn lại (← hoặc 1)"
            >
              😅 Ôn lại
            </button>
            <button
              className="fc-answer-btn fc-answer-btn--know"
              onClick={() => handleAnswer("know")}
              title="Đã nhớ (→ hoặc 2)"
            >
              ✓ Đã nhớ
            </button>
          </div>
        ) : (
          <button
            className="kfc-flip-btn"
            onClick={() => setFlipped(true)}
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
      <div className="kfc-hints">
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
      <div className="kfc-scoreboard">
        <span className="kfc-score-know">✓ {knowCount}</span>
        <span className="kfc-score-dot">·</span>
        <span className="kfc-score-again">↺ {againCount}</span>
        <span className="kfc-score-dot">·</span>
        <span className="kfc-score-left">còn {order.length - cardIdx - 1}</span>
      </div>
    </div>
  );
}
