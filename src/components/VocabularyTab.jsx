import vocabData from "../data/vocabulary.json";
import { useState, useMemo, useEffect } from "react";
import { getCard, getStatus, orderForStudy, getStats } from "../lib/srs";
import { vocabCard } from "../lib/session";
import { lessons, lessonProgress, nextLesson, lessonsOverview, LESSON_SIZE } from "../lib/lessons";
import {
  customAsWords,
  addCustomCard,
  removeCustomCard,
  loadCustomCards,
} from "../lib/userdata";
import { invalidateSearchIndex, kanjiInText } from "../lib/searchIndex";
import { shuffle } from "../lib/random";
import StudyRunner from "./common/StudyRunner";
import QuizHub from "./common/QuizHub";
import SpeakButton from "./common/SpeakButton";
import NoteBox from "./common/NoteBox";
import Ruby from "./common/Ruby";
import "../styles/tabs/vocabulary.css";
import "../styles/tabs/vocabulary-extra.css";

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

const STATUS_META = {
  new: { label: "🆕", title: "Chưa học", color: "#60a5fa" },
  learning: { label: "📚", title: "Đang học", color: "#facc15" },
  mastered: { label: "✅", title: "Đã thuộc", color: "#34d399" },
};

export default function VocabularyTab({ initialSearch }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState(initialSearch || "");
  const [expandedCard, setExpandedCard] = useState(null);
  const [markedIds, setMarkedIds] = useState(() => loadMarked());
  const [hideMeanings, setHideMeanings] = useState(false);
  const [view, setView] = useState("cards"); // cards | lessons
  const [study, setStudy] = useState(null); // { words, label, reverse }
  const [showQuiz, setShowQuiz] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [customTick, setCustomTick] = useState(0);

  // Khi mở từ tìm kiếm toàn cục.
  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
      setActiveCategory("all");
      setView("cards");
      setStudy(null);
      setShowQuiz(false);
    }
  }, [initialSearch]);

  const custom = useMemo(() => customAsWords(), [customTick]);

  const allWords = useMemo(
    () => [
      ...vocabData.categories.flatMap((cat) =>
        cat.words.map((w) => ({
          ...w,
          categoryId: cat.id,
          categoryColor: cat.color,
          categoryLabel: cat.label,
        })),
      ),
      ...custom,
    ],
    [custom],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allWords.filter((w) => {
      const matchCat = activeCategory === "all" || w.categoryId === activeCategory;
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

  const stats = useMemo(() => getStats("vocab", allWords.map((w) => w.id)), [allWords]);

  const toggleMark = (id, e) => {
    e?.stopPropagation();
    setMarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveMarked(next);
      return next;
    });
  };

  const allFilteredMarked = filtered.length > 0 && filtered.every((w) => markedIds.has(w.id));

  const toggleMarkAll = () => {
    setMarkedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredMarked) filtered.forEach((w) => next.delete(w.id));
      else filtered.forEach((w) => next.add(w.id));
      saveMarked(next);
      return next;
    });
  };

  const clearAllMarked = () => {
    setMarkedIds(new Set());
    saveMarked(new Set());
  };

  const startStudy = (words, label, opts = {}) => {
    if (!words.length) return;
    setStudy({
      label,
      reverse: !!opts.reverse,
      words: opts.random ? shuffle(words) : orderForStudy(words, "vocab", (w) => w.id),
    });
  };

  const studyItems = useMemo(
    () => (study ? study.words.map((w) => vocabCard(w, { reverse: study.reverse })) : []),
    [study],
  );

  // ── Phiên học ──
  if (study) {
    return (
      <StudyRunner
        items={studyItems}
        title={`🎴 ${study.label}`}
        subtitle={study.reverse ? "Chiều Việt → Nhật (recall chủ động)" : "Chiều Nhật → Việt"}
        color="#22d3ee"
        onExit={() => setStudy(null)}
      />
    );
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">📖 Từ vựng N5</h2>
        <p className="section-desc">
          {allWords.length} từ · {vocabData.categories.length} chủ đề
          {custom.length > 0 && ` · ⭐ ${custom.length} thẻ của tôi`}
          <span className="voc-stat-inline">
            <span style={{ color: "#34d399" }}>✅ {stats.mastered} thuộc</span>
            <span style={{ color: "#facc15" }}>📚 {stats.learning} đang học</span>
            {stats.due > 0 && <span style={{ color: "#22d3ee" }}>📅 {stats.due} tới hạn</span>}
            {markedIds.size > 0 && <span style={{ color: "#f59e0b" }}>⭐ {markedIds.size} đánh dấu</span>}
          </span>
        </p>
      </div>

      {/* Hành động học */}
      <div className="voc-actions">
        <button
          className="voc-act voc-act--primary"
          style={{ "--c": "#22d3ee" }}
          onClick={() => startStudy(filtered, `Flashcard (${filtered.length} từ)`)}
        >
          <span className="voc-act__icon" aria-hidden="true">🎴</span>
          <span className="voc-act__body">
            <span className="voc-act__title">Học flashcard</span>
            <span className="voc-act__sub">{filtered.length} từ · ưu tiên thẻ tới hạn</span>
          </span>
        </button>
        <button
          className="voc-act"
          style={{ "--c": "#a78bfa" }}
          title="Học theo chiều Việt → Nhật"
          onClick={() => startStudy(filtered, `Chiều ngược (${filtered.length} từ)`, { reverse: true })}
        >
          <span className="voc-act__icon" aria-hidden="true">🔁</span>
          <span className="voc-act__body">
            <span className="voc-act__title">Việt → Nhật</span>
            <span className="voc-act__sub">Recall chủ động, khó hơn</span>
          </span>
        </button>
        <button
          className="voc-act"
          style={{ "--c": "#f59e0b" }}
          disabled={markedWords.length === 0}
          title="Học lại những từ bạn đã đánh dấu"
          onClick={() => startStudy(markedWords, `Từ đã đánh dấu (${markedWords.length})`)}
        >
          <span className="voc-act__icon" aria-hidden="true">⭐</span>
          <span className="voc-act__body">
            <span className="voc-act__title">Đã đánh dấu</span>
            <span className="voc-act__sub">
              {markedWords.length > 0 ? `${markedWords.length} từ` : "Chưa đánh dấu từ nào"}
            </span>
          </span>
        </button>
        <button
          className={`voc-act ${showQuiz ? "is-on" : ""}`}
          style={{ "--c": "#f472b6" }}
          aria-pressed={showQuiz}
          onClick={() => setShowQuiz((v) => !v)}
        >
          <span className="voc-act__icon" aria-hidden="true">🎯</span>
          <span className="voc-act__body">
            <span className="voc-act__title">Luyện tập</span>
            <span className="voc-act__sub">Điền từ vào câu · gõ đáp án</span>
          </span>
        </button>
      </div>

      {showQuiz && <QuizHub tab="vocabulary" color="#22d3ee" onClose={() => setShowQuiz(false)} />}

      {/* Tìm kiếm */}
      <div className="search-box">
        <span className="search-box__icon">🔍</span>
        <input
          type="text"
          placeholder="Tìm kiếm từ vựng (tiếng Nhật, romaji, nghĩa tiếng Việt)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Lọc chủ đề */}
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
        {custom.length > 0 && (
          <button
            className={`filter-btn ${activeCategory === "my-cards" ? "filter-btn--active" : ""}`}
            style={{ "--c": "#f472b6" }}
            onClick={() => setActiveCategory("my-cards")}
          >
            ⭐ Thẻ của tôi ({custom.length})
          </button>
        )}
      </div>

      {/* Chế độ xem + công cụ */}
      <div className="voc-viewbar">
        <div className="voc-viewswitch">
          <button
            className={`voc-viewbtn ${view === "cards" ? "is-on" : ""}`}
            onClick={() => setView("cards")}
          >
            🗂 Thẻ
          </button>
          <button
            className={`voc-viewbtn ${view === "lessons" ? "is-on" : ""}`}
            onClick={() => setView("lessons")}
          >
            📚 Bài học ({LESSON_SIZE} từ/bài)
          </button>
        </div>

        <div className="voc-tools">
          <button
            className={`filter-btn vocab-toggle-btn ${hideMeanings ? "is-on" : ""}`}
            onClick={() => setHideMeanings((v) => !v)}
          >
            {hideMeanings ? "👀 Hiện định nghĩa" : "🙈 Ẩn định nghĩa"}
          </button>
          <button className="filter-btn vocab-toggle-btn" onClick={toggleMarkAll}>
            {allFilteredMarked ? "❌ Hủy đánh dấu" : "✅ Đánh dấu tất cả"}
          </button>
          {markedIds.size > 0 && (
            <button className="filter-btn vocab-clear-btn" onClick={clearAllMarked}>
              🗑 Hủy tất cả ({markedIds.size})
            </button>
          )}
          <button
            className={`filter-btn vocab-toggle-btn ${showAdd ? "is-on" : ""}`}
            onClick={() => setShowAdd((v) => !v)}
          >
            ➕ Thẻ của tôi
          </button>
        </div>
      </div>

      {showAdd && (
        <CustomCardManager
          cards={loadCustomCards()}
          onChanged={() => {
            invalidateSearchIndex();
            setCustomTick((t) => t + 1);
          }}
        />
      )}

      {search && (
        <p className="vocab-results">
          Tìm thấy {filtered.length} kết quả cho "{search}"
        </p>
      )}

      {/* Nội dung */}
      {view === "lessons" ? (
        <LessonList onStudy={startStudy} />
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">🔍</div>
          <p className="empty-state__text">Không tìm thấy từ nào. Thử từ khóa khác!</p>
        </div>
      ) : (
        <div className="cards-grid">
          {filtered.map((word, idx) => (
            <WordCard
              key={word.id}
              word={word}
              delay={Math.min(idx, 30) * 40}
              expanded={expandedCard === word.id}
              onToggle={() => setExpandedCard(expandedCard === word.id ? null : word.id)}
              marked={markedIds.has(word.id)}
              onToggleMark={(e) => toggleMark(word.id, e)}
              hideMeanings={hideMeanings}
              onDeleteCustom={
                word.isCustom
                  ? () => {
                      removeCustomCard(word.id);
                      invalidateSearchIndex();
                      setCustomTick((t) => t + 1);
                    }
                  : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Thẻ từ ─────────────────────────────────────────────────────────────── */

function WordCard({
  word,
  delay,
  expanded,
  onToggle,
  marked,
  onToggleMark,
  hideMeanings,
  onDeleteCustom,
}) {
  const isIAdj = word.type === "i-adj";
  const isNaAdj = word.type === "na-adj";
  const [localRevealed, setLocalRevealed] = useState(null);

  useEffect(() => {
    setLocalRevealed(null);
  }, [hideMeanings]);

  const meaningHidden = localRevealed !== null ? !localRevealed : hideMeanings;
  const status = getStatus(getCard("vocab", word.id));
  const meta = STATUS_META[status];
  const linkedKanji = expanded ? kanjiInText(`${word.kanji || ""}${word.japanese}`) : [];

  const handleRevealToggle = (e) => {
    e.stopPropagation();
    setLocalRevealed((prev) => (prev === null ? !!hideMeanings : !prev));
  };

  return (
    <div
      className="word-card"
      style={{ "--card-color": word.categoryColor, animationDelay: `${delay}ms` }}
      onClick={onToggle}
    >
      <div className="wc-top">
        <span className="wc-cat">{word.categoryLabel}</span>
        <div className="wc-actions">
          <span className="wc-status" title={meta.title} style={{ "--c": meta.color }}>
            {meta.label}
          </span>
          <SpeakButton text={word.japanese} size="sm" />
          <button
            className="wc-iconbtn"
            onClick={handleRevealToggle}
            title={meaningHidden ? "Hiện định nghĩa" : "Ẩn định nghĩa"}
          >
            {meaningHidden ? "👀" : "🙈"}
          </button>
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

      <div className="word-card__jp">{word.japanese}</div>
      {word.kanji ? (
        <div className="word-card__kanji">漢字: {word.kanji}</div>
      ) : (
        <div className="word-card__kanji"></div>
      )}

      <div className="word-card__romaji">{word.romaji}</div>

      {(isIAdj || isNaAdj) && (
        <span className={`word-card__type-badge ${isIAdj ? "is-i" : "is-na"}`}>
          {isIAdj ? "い-tính từ" : "な-tính từ"}
        </span>
      )}

      {meaningHidden ? (
        <div className="wc-hidden">∙∙∙ nhấn 👀 để xem nghĩa</div>
      ) : (
        <div className="word-card__meaning">{word.meaning}</div>
      )}

      {expanded && !meaningHidden && (isIAdj || isNaAdj) && (
        <div className="wc-conj">
          <span className="wc-conj__neg">✗ {word.negative}</span>
          <span className="wc-conj__past">⏪ {word.past}</span>
        </div>
      )}

      {word.note && !meaningHidden && <div className="word-card__note">{word.note}</div>}

      {expanded && !meaningHidden && word.example && (
        <div className="word-card__example">
          <div className="wc-ex-label">
            Ví dụ
            <SpeakButton text={word.example.jp} size="sm" />
          </div>
          <div className="word-card__example-jp">
            <Ruby text={word.example.jp} />
          </div>
          {word.example.romaji && (
            <div className="word-card__example-romaji">{word.example.romaji}</div>
          )}
          <div className="word-card__example-vn">→ {word.example.vn}</div>
        </div>
      )}

      {/* Liên kết chéo sang Kanji */}
      {expanded && linkedKanji.length > 0 && (
        <div className="wc-links">
          <span className="wc-links__label">Kanji trong từ:</span>
          {linkedKanji.map((k) => (
            <span key={k.id} className="wc-link" title={`${k.meaning} · On: ${k.on} · Kun: ${k.kun}`}>
              {k.char} <em>{k.meaning}</em>
            </span>
          ))}
        </div>
      )}

      {expanded && <NoteBox kind="vocab" id={word.id} />}

      {expanded && onDeleteCustom && (
        <button
          className="wc-del"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`Xoá thẻ "${word.japanese}"?`)) onDeleteCustom();
          }}
        >
          🗑 Xoá thẻ này
        </button>
      )}

      {!expanded && !meaningHidden && (word.example || isIAdj || isNaAdj) && (
        <div className="wc-hint">Nhấn để xem ví dụ</div>
      )}
    </div>
  );
}

/* ── Bài học 10 từ ──────────────────────────────────────────────────────── */

function LessonList({ onStudy }) {
  const list = useMemo(() => lessons(), []);
  const overview = lessonsOverview();
  const next = nextLesson();

  return (
    <div className="les-wrap">
      <div className="les-overview">
        <div className="les-overview__main">
          <div className="les-overview__title">
            📚 {overview.total} bài · mỗi bài {LESSON_SIZE} từ
          </div>
          <div className="les-overview__meta">
            ✅ {overview.done} bài xong · 📚 {overview.started} đang học · ⬜ {overview.untouched} chưa mở
          </div>
        </div>
        {next && (
          <button
            className="les-overview__btn"
            onClick={() =>
              onStudy(next.lesson.words, `Bài ${next.lesson.index} · ${next.lesson.categoryLabel}`)
            }
          >
            ▶ Học tiếp: Bài {next.lesson.index}
          </button>
        )}
      </div>

      <div className="les-grid">
        {list.map((lesson) => {
          const p = lessonProgress(lesson);
          return (
            <button
              key={lesson.id}
              className={`les-card ${p.done ? "is-done" : p.started ? "is-doing" : ""}`}
              style={{ "--c": lesson.color }}
              onClick={() => onStudy(lesson.words, `Bài ${lesson.index} · ${lesson.categoryLabel}`)}
            >
              <div className="les-card__top">
                <span className="les-card__n">Bài {lesson.index}</span>
                <span className="les-card__state">
                  {p.done ? "✅" : p.started ? `${p.pct}%` : "⬜"}
                </span>
              </div>
              <div className="les-card__cat">
                {lesson.categoryIcon} {lesson.categoryLabel}
                {lesson.parts ? ` (${lesson.part}/${lesson.parts})` : ""}
              </div>
              <div className="les-card__words">
                {lesson.words.slice(0, 4).map((w) => w.japanese).join("・")}
                {lesson.words.length > 4 ? "…" : ""}
              </div>
              <div className="les-card__track">
                <div className="les-card__fill" style={{ width: `${p.pct}%` }} />
              </div>
              <div className="les-card__meta">
                {p.mastered}/{p.total} đã thuộc
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Thẻ tự tạo ─────────────────────────────────────────────────────────── */

const EMPTY_FORM = { japanese: "", kanji: "", romaji: "", meaning: "", exampleJp: "", exampleVn: "" };

function CustomCardManager({ cards, onChanged }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.japanese.trim() || !form.meaning.trim()) {
      setError("Cần ít nhất từ tiếng Nhật và nghĩa.");
      return;
    }
    if (addCustomCard(form)) {
      setForm(EMPTY_FORM);
      setError("");
      onChanged();
    }
  };

  return (
    <div className="cc">
      <div className="cc__head">
        <div className="cc__title">⭐ Thẻ của tôi</div>
        <div className="cc__sub">
          Từ gặp ngoài app (anime, lớp học, công việc). Thẻ tự tạo dùng chung lịch ôn SRS với từ vựng N5.
        </div>
      </div>

      <form className="cc__form" onSubmit={submit}>
        <input className="cc__in" placeholder="Từ tiếng Nhật (kana) *" value={form.japanese} onChange={set("japanese")} />
        <input className="cc__in" placeholder="Kanji (tuỳ chọn)" value={form.kanji} onChange={set("kanji")} />
        <input className="cc__in" placeholder="Romaji (tuỳ chọn)" value={form.romaji} onChange={set("romaji")} />
        <input className="cc__in" placeholder="Nghĩa tiếng Việt *" value={form.meaning} onChange={set("meaning")} />
        <input className="cc__in" placeholder="Câu ví dụ (tiếng Nhật)" value={form.exampleJp} onChange={set("exampleJp")} />
        <input className="cc__in" placeholder="Nghĩa câu ví dụ" value={form.exampleVn} onChange={set("exampleVn")} />
        <button className="cc__submit" type="submit">➕ Thêm thẻ</button>
      </form>

      {error && <div className="cc__err">{error}</div>}

      {cards.length > 0 && (
        <div className="cc__list">
          {cards.map((c) => (
            <div key={c.id} className="cc__row">
              <span className="cc__row-jp">{c.japanese}</span>
              <span className="cc__row-mean">{c.meaning}</span>
              <SpeakButton text={c.japanese} size="sm" />
              <button
                className="cc__row-del"
                onClick={() => {
                  removeCustomCard(c.id);
                  onChanged();
                }}
                title="Xoá thẻ"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
