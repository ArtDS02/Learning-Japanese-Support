import vocabData from "../data/vocabulary.json";
import { useState, useMemo, useEffect } from "react";

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
            <span style={{ marginLeft: 8, color: "#facc15" }}>
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
          style={
            activeCategory === "all"
              ? { background: "#a78bfa", color: "#0a0b0f" }
              : {}
          }
          onClick={() => setActiveCategory("all")}
        >
          🌐 Tất cả ({allWords.length})
        </button>
        {vocabData.categories.map((cat) => (
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
            {cat.icon} {cat.label} ({cat.words.length})
          </button>
        ))}
      </div>

      {/* Results count */}
      {search && (
        <p
          style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}
        >
          Tìm thấy {filtered.length} kết quả cho "{search}"
        </p>
      )}

      {/* Flash card controls */}
      {!flashMode ? (
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 12,
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div className="flash-box">
            <button
              className="filter-btn"
              style={{ background: "#27272a", color: "#fff", border: "none" }}
              onClick={() => enterFlash("all")}
            >
              🎴 Học Flash Card (tất cả · {filtered.length})
            </button>
            <button
              className="filter-btn"
              style={{
                background: markedWords.length > 0 ? "#713f12" : "#1c1c1f",
                color: markedWords.length > 0 ? "#facc15" : "#666",
                border:
                  markedWords.length > 0
                    ? "1px solid #854d0e"
                    : "1px solid #333",
                cursor: markedWords.length > 0 ? "pointer" : "not-allowed",
                opacity: markedWords.length > 0 ? 1 : 0.5,
              }}
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
                className="filter-btn"
                style={{
                  background: "transparent",
                  color: "#f87171",
                  border: "1px solid #7f1d1d",
                }}
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
        <div style={{ marginBottom: 12 }}>
          <button
            className="filter-btn"
            style={{ background: "#facc15", color: "#000", border: "none" }}
            onClick={exitFlash}
          >
            ✕ Thoát Flash Card
          </button>
          <span
            style={{
              marginLeft: 12,
              fontSize: 13,
              color: "var(--text-muted)",
            }}
          >
            Đang học:{" "}
            <strong
              style={{ color: flashScope === "marked" ? "#facc15" : "#a78bfa" }}
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <button
            className="filter-btn"
            style={{
              background: hideMeanings ? "#312e81" : "#1e1b4b",
              color: hideMeanings ? "#c4b5fd" : "#818cf8",
              border: "1px solid #3730a3",
              fontSize: 18,
            }}
            onClick={() => setHideMeanings((v) => !v)}
          >
            {hideMeanings
              ? "👀 Hiện tất cả định nghĩa"
              : "🙈 Ẩn tất cả định nghĩa"}
          </button>
          {/* {hideMeanings && (
            <span
              style={{
                fontSize: 18,
                color: "var(--text-muted)",
                fontStyle: "italic",
              }}
            >
              Nhấn vào từng card để xem định nghĩa riêng
            </span>
          )} */}
          <button
            className="filter-btn"
            style={{
              background: markAll ? "#312e81" : "#1e1b4b",
              color: markAll ? "#b5d4fd" : "#818cf8",
              border: "1px solid #3730a3",
              fontSize: 18,
            }}
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
        position: "relative",
      }}
      onClick={onToggle}
    >
      {/* Top row: category tag + actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 20,
            background: `${word.categoryColor}22`,
            color: word.categoryColor,
            fontWeight: 600,
            fontFamily: "var(--font-mono)",
          }}
        >
          {word.categoryLabel}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Per-card meaning toggle */}
          <button
            onClick={handleRevealToggle}
            title={meaningHidden ? "Hiện định nghĩa" : "Ẩn định nghĩa"}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              lineHeight: 1,
              padding: 0,
              opacity: 0.85,
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.55)}
          >
            {meaningHidden ? "👀" : "🙈"}
          </button>
          {/* Bookmark */}
          <button
            onClick={onToggleMark}
            title={marked ? "Bỏ đánh dấu" : "Đánh dấu để học riêng"}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
              padding: 0,
              opacity: marked ? 1 : 0.3,
              transition: "opacity 0.15s, transform 0.15s",
              transform: marked ? "scale(1.15)" : "scale(1)",
            }}
          >
            ⭐
          </button>
          <span style={{ fontSize: 16, opacity: 0.5 }}>
            {expanded ? "▲" : "▼"}
          </span>
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
        <span
          className="word-card__type-badge"
          style={{
            background: isIAdj
              ? "rgba(250,204,21,0.15)"
              : "rgba(52,211,153,0.15)",
            color: isIAdj ? "var(--accent-yellow)" : "var(--accent-green)",
            border: `1px solid ${isIAdj ? "rgba(250,204,21,0.3)" : "rgba(52,211,153,0.3)"}`,
          }}
        >
          {isIAdj ? "い-tính từ" : "な-tính từ"}
        </span>
      )}

      {/* Meaning — hideable */}
      {meaningHidden ? (
        <div
          style={{
            marginTop: 6,
            marginBottom: 4,
            fontSize: 13,
            color: "var(--text-muted)",
            fontStyle: "italic",
            userSelect: "none",
          }}
        >
          ∙∙∙ nhấn 👁 để xem nghĩa
        </div>
      ) : (
        <div className="word-card__meaning">{word.meaning}</div>
      )}

      {/* Conjugation for adjectives */}
      {expanded && !meaningHidden && (isIAdj || isNaAdj) && (
        <div
          style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}
        >
          <span
            style={{
              fontSize: 12,
              color: "var(--accent-red)",
              fontFamily: "var(--font-mono)",
            }}
          >
            ✗ {word.negative}
          </span>
          <span
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            ⏪ {word.past}
          </span>
        </div>
      )}

      {/* Note */}
      {word.note && !meaningHidden && (
        <div className="word-card__note">{word.note}</div>
      )}

      {/* Example — shown when expanded */}
      {expanded && !meaningHidden && word.example && (
        <div className="word-card__example">
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              marginBottom: 6,
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Ví dụ
          </div>
          <div className="word-card__example-jp">{word.example.jp}</div>
          <div className="word-card__example-romaji">{word.example.romaji}</div>
          <div className="word-card__example-vn">→ {word.example.vn}</div>
        </div>
      )}

      {!expanded && !meaningHidden && (
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: "var(--text-muted)",
            fontStyle: "italic",
          }}
        >
          Nhấn để xem ví dụ
        </div>
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

function FlashCardStudy({ words, markedIds, onToggleMark }) {
  const [deck, setDeck] = useState(words);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);

  // Khi words bên ngoài thay đổi (đổi scope/filter), reset deck
  useEffect(() => {
    setDeck(words);
    setIndex(0);
    setFlipped(false);
    setIsShuffled(false);
  }, [words]);

  const word = deck[index];

  const animateCard = (callback) => {
    setIsShuffling(true);
    setTimeout(() => {
      callback();
      setTimeout(() => setIsShuffling(false), 80);
    }, 180);
  };

  const nextCard = () =>
    animateCard(() => {
      setIndex((prev) => (prev + 1) % deck.length);
      setFlipped(false);
    });

  const prevCard = () =>
    animateCard(() => {
      setIndex((prev) => (prev - 1 + deck.length) % deck.length);
      setFlipped(false);
    });

  const shuffleDeck = () =>
    animateCard(() => {
      setDeck((prev) => fisherYates(prev));
      setIndex(0);
      setFlipped(false);
      setIsShuffled(true);
    });

  const resetDeck = () =>
    animateCard(() => {
      setDeck(words);
      setIndex(0);
      setFlipped(false);
      setIsShuffled(false);
    });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return;
      switch (e.key) {
        case "ArrowRight":
          nextCard();
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
        default:
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flipped, deck.length]);

  const isMarked = markedIds.has(word.id);

  return (
    <div className="flashcard-wrapper">
      <div
        className={`flashcard ${isShuffling ? "flashcard--shuffle" : ""}`}
        onClick={() => animateCard(() => setFlipped(!flipped))}
        style={{ position: "relative" }}
      >
        {/* Bookmark button on flashcard */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleMark(word.id, e);
          }}
          title={isMarked ? "Bỏ đánh dấu" : "Đánh dấu từ này"}
          style={{
            position: "absolute",
            top: 12,
            right: 14,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 20,
            opacity: isMarked ? 1 : 0.25,
            transition: "opacity 0.15s, transform 0.15s",
            transform: isMarked ? "scale(1.2)" : "scale(1)",
            zIndex: 10,
          }}
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

      <div className="flashcard-keyboard-hint">⌨ ← → đổi card · ↑ ↓ flip</div>

      <div className="flashcard-progress">
        {index + 1} / {deck.length}
        {isShuffled && (
          <span style={{ marginLeft: 8, fontSize: 11, color: "#a78bfa" }}>
            🔀 Đã xáo trộn
          </span>
        )}
      </div>

      <div className="flashcard-actions">
        <button onClick={prevCard}>⬅ Prev</button>
        <button onClick={shuffleDeck} title="Xáo trộn thứ tự toàn bộ deck">
          🔀 Shuffle
        </button>
        {isShuffled && (
          <button onClick={resetDeck} title="Khôi phục thứ tự gốc">
            ↺ Reset
          </button>
        )}
        <button onClick={nextCard}>Next ➡</button>
      </div>
    </div>
  );
}
