import { useState, useMemo, useRef, useEffect } from "react";
import kanjiData from "../data/kanji.json";
import { getCard, getStatus, getStats, orderForStudy, rateCard, MASTERED_BOX } from "../lib/srs";
import { kanjiCard } from "../lib/session";
import { vocabWithKanji } from "../lib/searchIndex";
import { shuffle } from "../lib/random";
import StudyRunner from "./common/StudyRunner";
import QuizHub from "./common/QuizHub";
import SpeakButton from "./common/SpeakButton";
import NoteBox from "./common/NoteBox";
import WritePad from "./common/WritePad";
import Modal from "./common/Modal";
import "../styles/tabs/kanji.css";
import "../styles/tabs/kanji-extra.css";

const MARKED_KEY = "kanji_marked";

/**
 * "Đã học" nay được SUY RA từ SRS (box >= MASTERED_BOX) thay vì là một set đánh
 * dấu tay riêng — trước đây hai nguồn này có thể mâu thuẫn nhau. Set cũ
 * `kanji_learned` đã được chuyển vào SRS lúc khởi động (xem lib/migrate.js).
 */
export default function KanjiTab({ initialSearch }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState(initialSearch || "");
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [marked, setMarked] = useState(() => {
    try {
      const saved = localStorage.getItem(MARKED_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [study, setStudy] = useState(null); // { list, label }
  const [showQuiz, setShowQuiz] = useState(false);
  const [tick, setTick] = useState(0); // buộc render lại sau khi SRS đổi

  useEffect(() => {
    try {
      localStorage.setItem(MARKED_KEY, JSON.stringify([...marked]));
    } catch {
      /* quota */
    }
  }, [marked]);

  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
      setActiveCategory("all");
      setStudy(null);
      setShowQuiz(false);
    }
  }, [initialSearch]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return kanjiData.kanji.filter((k) => {
      const matchCat = activeCategory === "all" || k.category === activeCategory;
      const matchSearch =
        !q ||
        k.char.includes(q) ||
        k.meaning.toLowerCase().includes(q) ||
        k.on.toLowerCase().includes(q) ||
        k.kun.toLowerCase().includes(q) ||
        k.on_romaji?.toLowerCase().includes(q) ||
        k.kun_romaji?.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [activeCategory, search]);

  const catColor = (id) =>
    kanjiData.categories.find((c) => c.id === id)?.color || "#a78bfa";

  const stats = useMemo(
    () => getStats("kanji", kanjiData.kanji.map((k) => k.id)),
    [tick],
  );

  const toggleMark = (id) => {
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const markedList = kanjiData.kanji.filter((k) => marked.has(k.id));
  const allFilteredMarked = filtered.length > 0 && filtered.every((k) => marked.has(k.id));

  const markAll = () =>
    setMarked((prev) => {
      const next = new Set(prev);
      filtered.forEach((k) => next.add(k.id));
      return next;
    });

  const unmarkAll = () =>
    setMarked((prev) => {
      const next = new Set(prev);
      filtered.forEach((k) => next.delete(k.id));
      return next;
    });

  const startStudy = (list, label, { random = false } = {}) => {
    if (!list.length) return;
    setStudy({
      label,
      list: random ? shuffle(list) : orderForStudy(list, "kanji", (k) => k.id),
    });
  };

  const studyItems = useMemo(
    () => (study ? study.list.map(kanjiCard) : []),
    [study],
  );

  // Điều hướng bàn phím trong modal (Esc do <Modal> lo).
  useEffect(() => {
    if (selectedIdx === null) return;
    const handler = (e) => {
      // Đang gõ ghi chú thì mũi tên phải là di chuyển con trỏ, không phải đổi chữ.
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        setSelectedIdx((i) => Math.max(i - 1, 0));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIdx, filtered.length]);

  if (study) {
    return (
      <StudyRunner
        items={studyItems}
        title={`🃏 ${study.label}`}
        subtitle="Chấm 3 mức: Quên · Mơ hồ · Nhớ — thẻ lên L4 là tính đã thuộc"
        color="#a78bfa"
        onExit={() => {
          setStudy(null);
          setTick((t) => t + 1);
        }}
      />
    );
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">🈳 Kanji N5</h2>
        <p className="section-desc">
          {kanjiData.kanji.length} kanji · Nhấn vào kanji để xem chi tiết, nét viết và tập viết
          <span className="voc-stat-inline">
            <span style={{ color: "#34d399" }}>✅ {stats.mastered} thuộc</span>
            <span style={{ color: "#facc15" }}>📚 {stats.learning} đang học</span>
            {stats.due > 0 && <span style={{ color: "#22d3ee" }}>📅 {stats.due} tới hạn</span>}
            {marked.size > 0 && <span style={{ color: "#f59e0b" }}>★ {marked.size} đánh dấu</span>}
          </span>
        </p>
      </div>

      {/* Hành động học */}
      <div className="voc-actions">
        <button
          className="voc-act voc-act--primary"
          style={{ "--c": "#a78bfa" }}
          onClick={() => startStudy(filtered, `Flashcard (${filtered.length} kanji)`)}
        >
          <span className="voc-act__icon" aria-hidden="true">🃏</span>
          <span className="voc-act__body">
            <span className="voc-act__title">Học flashcard</span>
            <span className="voc-act__sub">{filtered.length} kanji · ưu tiên thẻ tới hạn</span>
          </span>
        </button>
        <button
          className="voc-act"
          style={{ "--c": "#f59e0b" }}
          disabled={markedList.length === 0}
          title="Học lại những chữ bạn đã đánh dấu"
          onClick={() => startStudy(markedList, `Kanji đã đánh dấu (${markedList.length})`)}
        >
          <span className="voc-act__icon" aria-hidden="true">★</span>
          <span className="voc-act__body">
            <span className="voc-act__title">Đã đánh dấu</span>
            <span className="voc-act__sub">
              {markedList.length > 0 ? `${markedList.length} kanji` : "Chưa đánh dấu chữ nào"}
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
            <span className="voc-act__sub">Nghĩa → Kanji · cách đọc → Kanji</span>
          </span>
        </button>
      </div>

      {showQuiz && <QuizHub tab="kanji" color="#a78bfa" onClose={() => setShowQuiz(false)} />}

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
          const count = kanjiData.kanji.filter((k) => k.category === cat.id).length;
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

      <div className="k-toolbar">
        {!allFilteredMarked ? (
          <button className="k-markbtn" onClick={markAll}>★ Đánh dấu tất cả</button>
        ) : (
          <button className="k-markbtn is-on" onClick={unmarkAll}>☆ Bỏ đánh dấu tất cả</button>
        )}
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
          Đã thuộc (SRS đạt L{MASTERED_BOX})
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">🈳</div>
          <p className="empty-state__text">Không tìm thấy kanji nào.</p>
        </div>
      ) : (
        <div className="kanji-grid">
          {filtered.map((k, idx) => {
            const status = getStatus(getCard("kanji", k.id));
            return (
              <div
                key={k.id}
                className={`kanji-card kj-${status}`}
                style={{
                  "--card-color": catColor(k.category),
                  animationDelay: `${Math.min(idx, 30) * 30}ms`,
                }}
                onClick={() => setSelectedIdx(idx)}
              >
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
                {status === "mastered" && <div className="k-card__learned">✓</div>}
                {status === "learning" && <div className="k-card__learning">📚</div>}
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
            );
          })}
        </div>
      )}

      {selectedIdx !== null && filtered[selectedIdx] && (
        <KanjiModal
          kanji={filtered[selectedIdx]}
          idx={selectedIdx}
          total={filtered.length}
          onClose={() => {
            setSelectedIdx(null);
            setTick((t) => t + 1);
          }}
          onPrev={() => setSelectedIdx((i) => Math.max(i - 1, 0))}
          onNext={() => setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1))}
          catColor={catColor(filtered[selectedIdx].category)}
          isMarked={marked.has(filtered[selectedIdx].id)}
          onToggleMark={() => toggleMark(filtered[selectedIdx].id)}
          onRated={() => setTick((t) => t + 1)}
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
          <svg className="k-stroke__grid" viewBox="0 0 168 168">
            <line x1="84" y1="0" x2="84" y2="168" stroke={catColor} strokeWidth="1" strokeDasharray="5 4" />
            <line x1="0" y1="84" x2="168" y2="84" stroke={catColor} strokeWidth="1" strokeDasharray="5 4" />
            <line x1="0" y1="0" x2="168" y2="168" stroke={catColor} strokeWidth="0.5" strokeDasharray="3 5" />
            <line x1="168" y1="0" x2="0" y2="168" stroke={catColor} strokeWidth="0.5" strokeDasharray="3 5" />
          </svg>
          <svg viewBox="0 0 109 109" xmlns="http://www.w3.org/2000/svg" className="k-stroke__svg">
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
  idx,
  total,
  onClose,
  onPrev,
  onNext,
  catColor,
  isMarked,
  onToggleMark,
  onRated,
}) {
  const [tab, setTab] = useState("info"); // info | write
  const card = getCard("kanji", kanji.id);
  const status = getStatus(card);
  const related = useMemo(() => vocabWithKanji(kanji.char), [kanji.char]);

  const rate = (rating) => {
    rateCard("kanji", kanji.id, rating);
    onRated?.();
  };

  return (
    <Modal
      onClose={onClose}
      label={`Chi tiết kanji ${kanji.char} — ${kanji.meaning}`}
      className="kanji-modal-overlay"
      panelClassName="kanji-modal"
      panelStyle={{ "--c": catColor }}
    >
        <button className="kanji-modal__close" onClick={onClose} aria-label="Đóng">✕</button>

        <div className="kanji-character">
          <div className="km-cat-row">
            <span className="km-cat">
              {kanjiData.categories.find((c) => c.id === kanji.category)?.icon}{" "}
              {kanjiData.categories.find((c) => c.id === kanji.category)?.label}
            </span>
            <span className="km-pos">{idx + 1}/{total}</span>
          </div>

          <div className="kanji-modal__char">{kanji.char}</div>
          <div className="kanji-modal__meaning">{kanji.meaning}</div>

          <div className="stroke-number">
            <span>Số nét: {kanji.stroke}</span>
            <span className={`km-srs km-srs--${status}`}>
              {status === "new" ? "🆕 Chưa học" : status === "mastered" ? "✅ Đã thuộc" : `📚 Đang học · L${card.box}`}
            </span>
          </div>

          {/* Chuyển giữa xem nét mẫu và tự tập viết */}
          <div className="km-tabs">
            <button className={`km-tab ${tab === "info" ? "is-on" : ""}`} onClick={() => setTab("info")}>
              ✍️ Nét mẫu
            </button>
            <button className={`km-tab ${tab === "write" ? "is-on" : ""}`} onClick={() => setTab("write")}>
              🖊 Tập viết
            </button>
          </div>

          {tab === "info" ? (
            <StrokeOrderAnimator strokes={kanji.strokes} catColor={catColor} />
          ) : (
            <WritePad strokes={kanji.strokes} char={kanji.char} color={catColor} />
          )}

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
          {kanji.mnemonic && <div className="kanji-modal__mnemonic">{kanji.mnemonic}</div>}

          <div className="km-examples-label">Ví dụ từ ghép</div>
          <div className="kanji-modal__examples">
            {kanji.examples.map((ex, i) => (
              <div key={i} className="kanji-modal__example">
                <div>
                  <div className="kanji-modal__example-word">
                    {ex.word}
                    <SpeakButton text={ex.reading} size="sm" />
                  </div>
                  <div className="kanji-modal__example-reading">{ex.reading}</div>
                </div>
                <div className="kanji-modal__example-meaning">{ex.meaning}</div>
              </div>
            ))}
          </div>

          {/* Liên kết chéo: từ vựng N5 dùng kanji này */}
          {related.length > 0 && (
            <div className="km-related">
              <div className="km-examples-label">Từ vựng N5 có chữ {kanji.char}</div>
              <div className="km-related__list">
                {related.map((w) => (
                  <span key={w.id} className="km-related__item" title={w.meaning}>
                    <strong>{w.kanji || w.japanese}</strong>
                    <em>{w.meaning}</em>
                  </span>
                ))}
              </div>
            </div>
          )}

          <NoteBox kind="kanji" id={kanji.id} placeholder="Cách nhớ riêng của bạn cho chữ này…" />

          {/* Chấm thẳng vào SRS — 3 mức như mọi deck khác */}
          <div className="km-rate">
            <div className="km-rate__label">Bạn nhớ chữ này tới đâu?</div>
            <div className="km-rate__btns">
              <button className="km-rate__btn is-forget" onClick={() => rate("forget")}>😟 Quên</button>
              <button className="km-rate__btn is-vague" onClick={() => rate("vague")}>🤔 Mơ hồ</button>
              <button className="km-rate__btn is-remember" onClick={() => rate("remember")}>😎 Nhớ</button>
            </div>
          </div>

          <div className="km-actions">
            <button
              className={`km-actbtn km-actbtn--mark ${isMarked ? "is-on" : ""}`}
              onClick={onToggleMark}
            >
              {isMarked ? "★ Bỏ đánh dấu" : "☆ Đánh dấu"}
            </button>
          </div>

          <div className="km-nav">
            <button className="km-navbtn" onClick={onPrev} disabled={idx === 0}>‹ Trước</button>
            <span className="km-nav__hint">← → chuyển chữ · Esc đóng</span>
            <button className="km-navbtn" onClick={onNext} disabled={idx >= total - 1}>Tiếp ›</button>
          </div>
        </div>
    </Modal>
  );
}
