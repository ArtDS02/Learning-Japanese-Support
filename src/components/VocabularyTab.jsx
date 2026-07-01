import vocabData from "../data/vocabulary.json";
import { useState, useMemo, useEffect } from "react";
import { rateCard, getCard, getStatus, orderForStudy } from "../lib/srs";
import { recordReview } from "../lib/progress";
import "../styles/tabs/vocabulary.css";

const MARKED_KEY = "vocab_marked_ids";

function loadMarked() {
  try {
    return new Set(JSON.parse(localStorage.getItem(MARKED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function saveMarked(set) {
  localStorage.setItem(MARKED_KEY, JSON.stringify([...set]));
}

export default function VocabularyTab() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedCard, setExpandedCard] = useState(null);
  const [flashMode, setFlashMode] = useState(false);
  const [flashScope, setFlashScope] = useState(null); // null | "all" | "marked"
  const [flashIndex, setFlashIndex] = useState(0);
  const [flashFlipped, setFlashFlipped] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [markedIds, setMarkedIds] = useState(() => loadMarked());
  const [hideMeanings, setHideMeanings] = useState(false);
  const [markAll, setMarkAll] = useState(false);

  const allWords = useMemo(() => {
    return vocabData.categories.flatMap((cat) =>
      cat.words.map((w) => ({
        ...w,
        categoryId: cat.id,
        categoryColor: cat.color,
        categoryLabel: cat.label,
      })),
    );
  }, []);

  const filtered = useMemo(() => {
    return allWords.filter((w) => {
      const matchCat =
        activeCategory === "all" || w.categoryId === activeCategory;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        w.japanese?.toLowerCase().includes(q) ||
        w.romaji?.toLowerCase().includes(q) ||
        w.meaning?.toLowerCase().includes(q) ||
        w.kanji?.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [allWords, activeCategory, search]);

  const markedWords = useMemo(
    () => filtered.filter((w) => markedIds.has(w.id)),
    [filtered, markedIds],
  );

  const flashWords = useMemo(() => {
    if (flashScope === "marked") return markedWords;
    return filtered;
  }, [flashScope, filtered, markedWords]);

  const toggleMark = (id, e) => {
    e.stopPropagation();
    setMarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveMarked(next);
      setMarkAll(filtered.length > 0 && filtered.every((w) => next.has(w.id)));

      return next;
    });
  };

  // Đánh dấu tất cả từ trong filtered, hoặc hủy nếu tất cả đã được đánh dấu
  const toggleMarkAll = () => {
    const allFilteredMarked = filtered.every((w) => markedIds.has(w.id));
    setMarkedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredMarked) {
        filtered.forEach((w) => next.delete(w.id));
        setMarkAll(false);
      } else {
        setMarkAll(true);
        filtered.forEach((w) => next.add(w.id));
      }
      saveMarked(next);
      return next;
    });
  };

  const toggleCard = (id) => setExpandedCard(expandedCard === id ? null : id);

  const clearAllMarked = () => {
    setMarkedIds(new Set());
    saveMarked(new Set());
    setMarkAll(false);
  };

  useEffect(() => {
    setFlashIndex(0);
    setFlashFlipped(false);
  }, [activeCategory, search, flashScope]);

  const enterFlash = (scope) => {
    setFlashScope(scope);
    setFlashMode(true);
    setFlashIndex(0);
    setFlashFlipped(false);
  };

  const exitFlash = () => {
    setFlashMode(false);
    setFlashScope(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <h2 className="section-title">📖 Từ vựng N5</h2>
        <p className="section-desc">
          {allWords.length} từ · Phân loại theo {vocabData.categories.length}{" "}
          chủ đề
          {markedIds.size > 0 && (
            <span className="vocab-marked-count">
              · ⭐ {markedIds.size} đã đánh dấu
            </span>
          )}
        </p>
      </div>

      {/* Search */}
      <div className="search-box">
        <span className="search-box__icon">🔍</span>
        <input
          type="text"
          placeholder="Tìm kiếm từ vựng (tiếng Nhật, romaji, nghĩa tiếng Việt)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filter */}
      <div className="filter-bar">
        <span className="filter-label">Chủ đề:</span>
        <button
          className={`filter-btn ${activeCategory === "all" ? "filter-btn--active" : ""}`}
          style={{ "--c": "#a78bfa" }}
          onClick={() => setActiveCategory("all")}
        >
          🌐 Tất cả ({allWords.length})
        </button>
        {vocabData.categories.map((cat) => (
          <button
            key={cat.id}
            className={`filter-btn ${activeCategory === cat.id ? "filter-btn--active" : ""}`}
            style={{ "--c": cat.color }}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.icon} {cat.label} ({cat.words.length})
          </button>
        ))}
      </div>

      {/* Results count */}
      {search && (
        <p className="vocab-results">
          Tìm thấy {filtered.length} kết quả cho "{search}"
        </p>
      )}

      {/* Flash card controls */}
      {!flashMode ? (
        <div className="flash-controls">
          <div className="flash-box">
            <button
              className="filter-btn vocab-flash-btn"
              onClick={() => enterFlash("all")}
            >
              🎴 Học Flash Card (tất cả · {filtered.length})
            </button>
            <button
              className={`filter-btn vocab-marked-btn ${markedWords.length > 0 ? "is-on" : "is-off"}`}
              onClick={() => markedWords.length > 0 && enterFlash("marked")}
              title={
                markedWords.length === 0
                  ? "Đánh dấu ít nhất 1 từ để học"
                  : `Học ${markedWords.length} từ đã đánh dấu`
              }
            >
              ⭐ Học từ đã đánh dấu ({markedWords.length})
            </button>
          </div>

          <div className="unmarked-box">
            {markedIds.size > 0 && (
              <button
                className="filter-btn vocab-clear-btn"
                onClick={() => {
                  clearAllMarked();
                }}
                title="Hủy toàn bộ đánh dấu"
              >
                🗑 Hủy tất cả ({markedIds.size})
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flash-active-bar">
          <button className="filter-btn vocab-exit-btn" onClick={exitFlash}>
            ✕ Thoát Flash Card
          </button>
          <span className="flash-active-bar__label">
            Đang học:{" "}
            <strong
              className="flash-active-bar__scope"
              style={{ "--c": flashScope === "marked" ? "#facc15" : "#a78bfa" }}
            >
              {flashScope === "marked"
                ? `⭐ ${flashWords.length} từ đã đánh dấu`
                : `🌐 ${flashWords.length} từ (tất cả)`}
            </strong>
          </span>
        </div>
      )}

      {/* Card view toolbar — hide/show meanings */}
      {!flashMode && filtered.length > 0 && (
        <div className="vocab-view-toolbar">
          <button
            className={`filter-btn vocab-toggle-btn ${hideMeanings ? "is-on" : ""}`}
            onClick={() => setHideMeanings((v) => !v)}
          >
            {hideMeanings
              ? "👀 Hiện tất cả định nghĩa"
              : "🙈 Ẩn tất cả định nghĩa"}
          </button>
          <button
            className={`filter-btn vocab-toggle-btn ${markAll ? "is-on-blue" : ""}`}
            onClick={() => toggleMarkAll((v) => !v)}
          >
            {markAll ? "❌ Hủy đánh dấu tất cả" : "✅ Đánh dấu tất cả"}{" "}
          </button>
        </div>
      )}

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">🔍</div>
          <p className="empty-state__text">
            Không tìm thấy từ nào. Thử từ khóa khác!
          </p>
        </div>
      ) : flashMode ? (
        flashWords.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">⭐</div>
            <p className="empty-state__text">
              Chưa có từ nào được đánh dấu trong bộ lọc này.
            </p>
          </div>
        ) : (
          <FlashCardStudy
            words={flashWords}
            index={flashIndex}
            setIndex={setFlashIndex}
            flipped={flashFlipped}
            setFlipped={setFlashFlipped}
            isShuffling={isShuffling}
            setIsShuffling={setIsShuffling}
            markedIds={markedIds}
            onToggleMark={toggleMark}
          />
        )
      ) : (
        <div className="cards-grid">
          {filtered.map((word, idx) => (
            <WordCard
              key={word.id}
              word={word}
              delay={idx * 40}
              expanded={expandedCard === word.id}
              onToggle={() => toggleCard(word.id)}
              marked={markedIds.has(word.id)}
              onToggleMark={(e) => toggleMark(word.id, e)}
              hideMeanings={hideMeanings}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WordCard({
  word,
  delay,
  expanded,
  onToggle,
  marked,
  onToggleMark,
  hideMeanings,
}) {
  const isIAdj = word.type === "i-adj";
  const isNaAdj = word.type === "na-adj";
  // Per-card meaning override: null = follow global, true = revealed, false = hidden
  const [localRevealed, setLocalRevealed] = useState(null);

  // When global toggle changes, reset per-card override
  useEffect(() => {
    setLocalRevealed(null);
  }, [hideMeanings]);

  const meaningHidden = localRevealed !== null ? !localRevealed : hideMeanings;

  const handleRevealToggle = (e) => {
    e.stopPropagation();
    setLocalRevealed((prev) => {
      if (prev === null) return !hideMeanings ? false : true;
      return !prev;
    });
  };

  return (
    <div
      className="word-card"
      style={{
        "--card-color": word.categoryColor,
        animationDelay: `${delay}ms`,
      }}
      onClick={onToggle}
    >
      {/* Top row: category tag + actions */}
      <div className="wc-top">
        <span className="wc-cat">{word.categoryLabel}</span>
        <div className="wc-actions">
          {/* Per-card meaning toggle */}
          <button
            className="wc-iconbtn"
            onClick={handleRevealToggle}
            title={meaningHidden ? "Hiện định nghĩa" : "Ẩn định nghĩa"}
          >
            {meaningHidden ? "👀" : "🙈"}
          </button>
          {/* Bookmark */}
          <button
            className={`wc-bookmark ${marked ? "is-marked" : ""}`}
            onClick={onToggleMark}
            title={marked ? "Bỏ đánh dấu" : "Đánh dấu để học riêng"}
          >
            ⭐
          </button>
          <span className="wc-caret">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Japanese */}
      <div className="word-card__jp">{word.japanese}</div>
      {word.kanji ? (
        <div className="word-card__kanji">漢字: {word.kanji}</div>
      ) : (
        <div className="word-card__kanji"></div>
      )}

      <div className="word-card__romaji">{word.romaji}</div>

      {/* Type badge for adjectives */}
      {(isIAdj || isNaAdj) && (
        <span className={`word-card__type-badge ${isIAdj ? "is-i" : "is-na"}`}>
          {isIAdj ? "い-tính từ" : "な-tính từ"}
        </span>
      )}

      {/* Meaning — hideable */}
      {meaningHidden ? (
        <div className="wc-hidden">∙∙∙ nhấn 👁 để xem nghĩa</div>
      ) : (
        <div className="word-card__meaning">{word.meaning}</div>
      )}

      {/* Conjugation for adjectives */}
      {expanded && !meaningHidden && (isIAdj || isNaAdj) && (
        <div className="wc-conj">
          <span className="wc-conj__neg">✗ {word.negative}</span>
          <span className="wc-conj__past">⏪ {word.past}</span>
        </div>
      )}

      {/* Note */}
      {word.note && !meaningHidden && (
        <div className="word-card__note">{word.note}</div>
      )}

      {/* Example — shown when expanded */}
      {expanded && !meaningHidden && word.example && (
        <div className="word-card__example">
          <div className="wc-ex-label">Ví dụ</div>
          <div className="word-card__example-jp">{word.example.jp}</div>
          <div className="word-card__example-romaji">{word.example.romaji}</div>
          <div className="word-card__example-vn">→ {word.example.vn}</div>
        </div>
      )}

      {!expanded && !meaningHidden && (
        <div className="wc-hint">Nhấn để xem ví dụ</div>
      )}
    </div>
  );
}

function fisherYates(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const STATUS_META = {
  new: { label: "🆕 Mới", color: "#60a5fa" },
  learning: { label: "📚 Đang học", color: "#facc15" },
  mastered: { label: "✅ Đã thuộc", color: "#34d399" },
};

function buildQueue(words, mode) {
  if (mode === "random") return fisherYates(words);
  return orderForStudy(words, "vocab", (w) => w.id);
}

function FlashCardStudy({ words, markedIds, onToggleMark }) {
  const [mode, setMode] = useState("srs"); // "srs" | "random"
  const [queue, setQueue] = useState(() => buildQueue(words, "srs"));
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [done, setDone] = useState(false);
  const [session, setSession] = useState({ remember: 0, vague: 0, forget: 0 });

  // Dựng lại hàng đợi khi đổi bộ từ hoặc đổi chế độ
  useEffect(() => {
    setQueue(buildQueue(words, mode));
    setPos(0);
    setFlipped(false);
    setDone(false);
    setSession({ remember: 0, vague: 0, forget: 0 });
  }, [words, mode]);

  const word = queue[pos];

  const animateCard = (callback) => {
    setIsShuffling(true);
    setTimeout(() => {
      callback();
      setTimeout(() => setIsShuffling(false), 80);
    }, 180);
  };

  const advance = (nextQueue = queue) => {
    if (pos + 1 >= nextQueue.length) {
      setDone(true);
    } else {
      setPos((p) => p + 1);
      setFlipped(false);
    }
  };

  const rate = (rating) => {
    if (!word) return;
    rateCard("vocab", word.id, rating);
    recordReview(1);
    setSession((s) => ({ ...s, [rating]: s[rating] + 1 }));

    animateCard(() => {
      // "Quên" trong chế độ SRS → đẩy lại thẻ vào cuối hàng đợi để gặp lại
      if (rating === "forget" && mode === "srs") {
        const nq = [...queue, word];
        setQueue(nq);
        advance(nq);
      } else {
        advance();
      }
    });
  };

  const skipNext = () =>
    animateCard(() => {
      setPos((p) => (p + 1) % queue.length);
      setFlipped(false);
    });

  const prevCard = () =>
    animateCard(() => {
      setPos((p) => (p - 1 + queue.length) % queue.length);
      setFlipped(false);
    });

  const restart = () =>
    animateCard(() => {
      setQueue(buildQueue(words, mode));
      setPos(0);
      setFlipped(false);
      setDone(false);
      setSession({ remember: 0, vague: 0, forget: 0 });
    });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat || done) return;
      switch (e.key) {
        case "ArrowRight":
          skipNext();
          break;
        case "ArrowLeft":
          prevCard();
          break;
        case "ArrowUp":
        case "ArrowDown":
        case " ":
          e.preventDefault();
          animateCard(() => setFlipped((prev) => !prev));
          break;
        case "1":
          if (flipped) rate("forget");
          break;
        case "2":
          if (flipped) rate("vague");
          break;
        case "3":
          if (flipped) rate("remember");
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flipped, queue, pos, done, mode]);

  // ── Màn hình hoàn thành phiên ──
  if (done || !word) {
    const total = session.remember + session.vague + session.forget;
    return (
      <div className="flashcard-wrapper">
        <div className="flash-summary">
          <div className="flash-summary__emoji">
            {session.forget === 0 ? "🎉" : session.remember >= session.forget ? "👏" : "💪"}
          </div>
          <h3 className="flash-summary__title">Hoàn thành phiên học!</h3>
          <p className="flash-summary__sub">Bạn đã ôn {total} lượt thẻ</p>
          <div className="flash-summary__stats">
            <div className="flash-stat" style={{ "--c": "#34d399" }}>
              <div className="flash-stat__n">{session.remember}</div>
              <div className="flash-stat__l">😎 Nhớ</div>
            </div>
            <div className="flash-stat" style={{ "--c": "#facc15" }}>
              <div className="flash-stat__n">{session.vague}</div>
              <div className="flash-stat__l">🤔 Mơ hồ</div>
            </div>
            <div className="flash-stat" style={{ "--c": "#f87171" }}>
              <div className="flash-stat__n">{session.forget}</div>
              <div className="flash-stat__l">😟 Quên</div>
            </div>
          </div>
          <button className="flash-restart-btn" onClick={restart}>
            🔁 Học lại đợt mới
          </button>
        </div>
      </div>
    );
  }

  const isMarked = markedIds.has(word.id);
  const card = getCard("vocab", word.id);
  const status = getStatus(card);
  const meta = STATUS_META[status];
  const progress = Math.round((pos / queue.length) * 100);

  return (
    <div className="flashcard-wrapper">
      {/* Mode switch */}
      <div className="flash-mode-switch">
        <button
          className={`flash-mode-btn ${mode === "srs" ? "is-active" : ""}`}
          onClick={() => setMode("srs")}
          title="Ưu tiên thẻ khó & tới hạn ôn"
        >
          🧠 Ôn thông minh
        </button>
        <button
          className={`flash-mode-btn ${mode === "random" ? "is-active" : ""}`}
          onClick={() => setMode("random")}
          title="Xáo trộn ngẫu nhiên"
        >
          🔀 Ngẫu nhiên
        </button>
      </div>

      {/* Progress bar */}
      <div className="flash-track">
        <div className="flash-track__fill" style={{ width: `${progress}%` }} />
      </div>

      <div
        className={`flashcard ${isShuffling ? "flashcard--shuffle" : ""}`}
        onClick={() => animateCard(() => setFlipped(!flipped))}
      >
        {/* SRS status badge */}
        <span className="flash-status-badge" style={{ "--c": meta.color }}>
          {meta.label}
          {status === "learning" && card?.box ? ` · L${card.box}` : ""}
        </span>

        {/* Bookmark button on flashcard */}
        <button
          className={`flash-bookmark ${isMarked ? "is-marked" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleMark(word.id, e);
          }}
          title={isMarked ? "Bỏ đánh dấu" : "Đánh dấu từ này"}
        >
          ⭐
        </button>

        {!flipped ? (
          <div className="flashcard-front">
            <div className="flashcard-label">Japanese</div>
            <div className="flashcard-jp">{word.japanese}</div>
            {word.kanji ? (
              <div className="flashcard-kanji">{word.kanji}</div>
            ) : (
              <div className="flashcard-kanji"></div>
            )}
            <div className="flashcard-romaji">{word.romaji}</div>
            <div className="flashcard-hint">Click để xem nghĩa</div>
          </div>
        ) : (
          <div className="flashcard-back">
            <div className="flashcard-label">Meaning</div>
            <div className="flashcard-meaning">{word.meaning}</div>
            {word.example && (
              <div className="flashcard-example">
                <div>{word.example.jp}</div>
                <div>{word.example.vn}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rating buttons — chỉ hiện khi đã lật để xem nghĩa */}
      {flipped ? (
        <div className="flash-rate">
          <button className="flash-rate__btn flash-rate__btn--forget" onClick={() => rate("forget")}>
            😟 Quên <kbd>1</kbd>
          </button>
          <button className="flash-rate__btn flash-rate__btn--vague" onClick={() => rate("vague")}>
            🤔 Mơ hồ <kbd>2</kbd>
          </button>
          <button className="flash-rate__btn flash-rate__btn--remember" onClick={() => rate("remember")}>
            😎 Nhớ <kbd>3</kbd>
          </button>
        </div>
      ) : (
        <div className="flashcard-keyboard-hint">
          ⌨ Space lật · ← → đổi thẻ · 1 / 2 / 3 chấm nhớ
        </div>
      )}

      <div className="flashcard-progress">
        {pos + 1} / {queue.length}
        <span className="flashcard-progress__ok">✓ {session.remember}</span>
        <span className="flashcard-progress__no">✗ {session.forget}</span>
      </div>

      <div className="flashcard-actions">
        <button onClick={prevCard}>⬅ Trước</button>
        <button onClick={restart} title="Bắt đầu lại phiên">↺ Làm lại</button>
        <button onClick={skipNext}>Bỏ qua ➡</button>
      </div>
    </div>
  );
}
