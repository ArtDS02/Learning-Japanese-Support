import { useState } from "react";
import grammarData from "../data/grammar.json";
import { getStats } from "../lib/srs";
import { quizSetsFor, buildQuiz } from "../lib/quizgen";
import QuizHub from "./common/QuizHub";
import SpeakButton from "./common/SpeakButton";
import "../styles/tabs/grammar.css";

// Highlights specific text within a sentence
function HighlightedText({ text, highlights = [], color }) {
  if (!highlights.length) return <span>{text}</span>;

  // Build regex from all highlight strings
  const escaped = highlights.map((h) =>
    h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const regex = new RegExp(`(${escaped.join("|")})`, "g");
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, i) =>
        highlights.includes(part) ? (
          <mark key={i} className="highlight" style={{ "--c": color }}>
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

const PARTICLE_LEVEL_COLOR = { N5: "#34d399", N4: "#38bdf8" };

const NOTE_META = {
  warn: { icon: "⚠️", label: "Dễ sai" },
  compare: { icon: "⚖️", label: "Phân biệt" },
  tip: { icon: "💡", label: "Mẹo" },
};

/**
 * Tô sáng ĐÚNG chỗ được đánh dấu 〈…〉 trong data, không phải mọi lần trợ từ xuất
 * hiện: 「にちようびに…」chỉ tô chữ に làm trợ từ, không tô に trong にちようび.
 */
function MarkedText({ text, color }) {
  const parts = text.split(/<([^>]+)>/); // vị trí lẻ = phần được đánh dấu
  return (
    <span>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="highlight" style={{ "--c": color }}>
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

/** Một câu ví dụ của trợ từ — dùng cho cả ví dụ cơ bản và ví dụ trong từng cách dùng. */
function ParticleExample({ ex, particle, color }) {
  const jp = ex.jp.replace(/<|>/g, "");
  const marked = /<[^>]+>/.test(ex.jp);
  return (
    <div className="particle-example">
      <div className="particle-example__jp">
        {marked ? (
          <MarkedText text={ex.jp} color={color} />
        ) : (
          <HighlightedText text={jp} highlights={[particle]} color={color} />
        )}
        <SpeakButton text={jp} size="sm" />
      </div>
      {ex.romaji && (
        <div className="particle-example__romaji">{ex.romaji.replace(/<|>/g, "")}</div>
      )}
      <div className="particle-example__vn">→ {ex.vn}</div>
    </div>
  );
}

/**
 * Phần kiến thức sâu của một trợ từ: từng chức năng (theo Minna no Nihongo) và
 * những điểm dễ sai. Mặc định gập lại để lưới thẻ còn dễ quét; lọc còn một trợ
 * từ thì mở sẵn vì lúc đó người học đang muốn đọc kỹ đúng trợ từ đó.
 */
function ParticleDeep({ item, open, onToggle }) {
  const uses = item.uses || [];
  const notes = item.notes || [];
  if (!uses.length && !notes.length) return null;

  return (
    <>
      {/* Không có onToggle = đang mở bắt buộc (lọc còn một trợ từ) → khỏi cần nút. */}
      {onToggle && (
        <button
          className="pt-more"
          style={{ "--c": item.color }}
          onClick={onToggle}
          aria-expanded={open}
        >
          {open
            ? "▴ Thu gọn"
            : `▾ ${uses.length} cách dùng · ${notes.length} điểm cần lưu ý`}
        </button>
      )}

      {open && (
        <div className="pt-deep">
          {uses.length > 0 && (
            <div className="pt-block">
              <div className="pt-block__title">📚 Các cách dùng</div>
              {uses.map((u, i) => (
                <div className="pt-use" key={i} style={{ "--c": item.color }}>
                  <div className="pt-use__head">
                    <span className="pt-use__n">{i + 1}</span>
                    <span className="pt-use__label">{u.label}</span>
                    {u.level && <span className="pt-use__tag pt-use__tag--lv">{u.level}</span>}
                    {u.minna && <span className="pt-use__tag">Minna · {u.minna}</span>}
                  </div>
                  {u.pattern && <div className="pt-use__pattern">{u.pattern}</div>}
                  {u.detail && <div className="pt-use__detail">{u.detail}</div>}
                  <div className="particle-examples">
                    {u.examples.map((ex, j) => (
                      <ParticleExample key={j} ex={ex} particle={item.particle} color={item.color} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {notes.length > 0 && (
            <div className="pt-block">
              <div className="pt-block__title">🎯 Điểm cần lưu ý khi dùng</div>
              <div className="pt-notes">
                {notes.map((n, i) => {
                  const meta = NOTE_META[n.kind] || NOTE_META.tip;
                  return (
                    <div className={`pt-note is-${n.kind || "tip"}`} key={i}>
                      <span className="pt-note__icon" title={meta.label}>{meta.icon}</span>
                      <span className="pt-note__text">{n.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ParticlesSection({ category }) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeLevel, setActiveLevel] = useState("all");
  const [opened, setOpened] = useState(() => new Set());

  const levels = [...new Set(category.items.map((p) => p.level).filter(Boolean))];

  const pool =
    activeLevel === "all"
      ? category.items
      : category.items.filter((p) => p.level === activeLevel);

  const filtered =
    activeFilter === "all" ? pool : pool.filter((p) => p.id === activeFilter);

  /** Đổi cấp độ: trợ từ đang chọn có thể không thuộc cấp mới → bỏ lọc riêng. */
  const pickLevel = (lv) => {
    setActiveLevel(lv);
    if (activeFilter === "all") return;
    const next =
      lv === "all" ? category.items : category.items.filter((p) => p.level === lv);
    if (!next.some((p) => p.id === activeFilter)) setActiveFilter("all");
  };

  return (
    <div className="grammar-section">
      <div className="grammar-section__title" style={{ "--c": category.color }}>
        <span className="gs-icon">{category.icon}</span>
        <span className="gs-label">{category.label}</span>
      </div>

      {levels.length > 1 && (
        <div className="filter-bar gs-filter">
          <span className="filter-label">Cấp độ:</span>
          <button
            className={`filter-btn ${activeLevel === "all" ? "filter-btn--active" : ""}`}
            style={{ "--c": category.color }}
            onClick={() => pickLevel("all")}
          >
            Tất cả ({category.items.length})
          </button>
          {levels.map((lv) => (
            <button
              key={lv}
              className={`filter-btn ${activeLevel === lv ? "filter-btn--active" : ""}`}
              style={{ "--c": PARTICLE_LEVEL_COLOR[lv] || category.color }}
              onClick={() => pickLevel(lv)}
            >
              {lv} ({category.items.filter((p) => p.level === lv).length})
            </button>
          ))}
        </div>
      )}

      {/* Particle quick-filter */}
      <div className="filter-bar gs-filter">
        <span className="filter-label">Lọc:</span>
        <button
          className={`filter-btn ${activeFilter === "all" ? "filter-btn--active" : ""}`}
          style={{ "--c": category.color }}
          onClick={() => setActiveFilter("all")}
        >
          Tất cả
        </button>
        {pool.map((item) => (
          <button
            key={item.id}
            className={`filter-btn ${activeFilter === item.id ? "filter-btn--active" : ""}`}
            style={{ "--c": item.color }}
            onClick={() =>
              setActiveFilter(item.id === activeFilter ? "all" : item.id)
            }
          >
            {item.particle}
          </button>
        ))}
      </div>

      <div className="particle-grid">
        {filtered.map((item, idx) => {
          // Lọc còn đúng một trợ từ → mở sẵn phần kiến thức sâu.
          const forced = filtered.length === 1;
          const open = forced || opened.has(item.id);
          return (
          <div
            key={item.id}
            className={`particle-card ${open ? "is-open" : ""}`}
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            {item.level && (
              <span
                className="particle-level"
                style={{ "--lc": PARTICLE_LEVEL_COLOR[item.level] || item.color }}
              >
                {item.level}
              </span>
            )}

            {/* Particle chip */}
            <div className="particle-chip" style={{ "--c": item.color }}>
              {item.particle}
            </div>

            {/* Romaji */}
            <div className="gs-romaji">/ {item.romaji} /</div>

            <div className="particle-function">{item.function}</div>
            <div className="particle-detail">{item.detail}</div>

            {/* Examples */}
            <div className="particle-examples">
              {item.examples.map((ex, i) => (
                <ParticleExample key={i} ex={ex} particle={item.particle} color={item.color} />
              ))}
            </div>

            <ParticleDeep
              item={item}
              open={open}
              onToggle={
                forced
                  ? null
                  : () =>
                setOpened((prev) => {
                  const next = new Set(prev);
                  if (next.has(item.id)) next.delete(item.id);
                  else next.add(item.id);
                  return next;
                })
              }
            />
          </div>
          );
        })}
      </div>
    </div>
  );
}

function VerbGroupsSection({ category }) {
  return (
    <div className="grammar-section">
      <div className="grammar-section__title" style={{ "--c": category.color }}>
        <span className="gs-icon">{category.icon}</span>
        <span className="gs-label">{category.label}</span>
      </div>

      {category.items.map((group, gi) => (
        <div
          key={group.id}
          className="word-card gs-group"
          style={{ "--c": group.color, animationDelay: `${gi * 100}ms` }}
        >
          <div className="gs-group__titlerow">
            <span className="gs-group__title">{group.title}</span>
          </div>
          <div className="gs-group__sub">{group.subtitle}</div>
          <div className="gs-rule">📌 Quy tắc: {group.rule}</div>

          <div className="verb-table-wrapper">
            <table className="verb-table">
              <thead>
                <tr>
                  <th>Từ điển</th>
                  <th>Nghĩa</th>
                  <th className="th-cyan">ます</th>
                  <th className="th-red">ません</th>
                  <th className="th-green">ました</th>
                  <th className="th-yellow">て形</th>
                </tr>
              </thead>
              <tbody>
                {group.conjugations.map((v, i) => (
                  <tr key={i}>
                    <td className="verb-dict">{v.dict}</td>
                    <td className="verb-meaning">{v.meaning}</td>
                    <td className="verb-masu">{v.masu}</td>
                    <td className="verb-masen">{v.masen}</td>
                    <td className="verb-mashita">{v.mashita}</td>
                    <td className="verb-te">{v.te}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function ExpressionsSection({ category }) {
  return (
    <div className="grammar-section">
      <div className="grammar-section__title" style={{ "--c": category.color }}>
        <span className="gs-icon">{category.icon}</span>
        <span className="gs-label">{category.label}</span>
      </div>

      <div className="cards-grid">
        {category.items.map((item, idx) => (
          <div
            key={item.id}
            className="word-card"
            style={{
              "--card-color": item.color,
              animationDelay: `${idx * 80}ms`,
            }}
          >
            <div className="gs-expr-head">
              <div>
                <div className="word-card__jp gs-expr__jp">{item.title}</div>
                <div className="word-card__kanji gs-expr__sub">{item.subtitle}</div>
              </div>
              <div className="word-card__type-badge gs-badge">Mẫu câu</div>
            </div>

            <div className="word-card__meaning">{item.meaning}</div>
            <div className="word-card__note">{item.note}</div>

            <div className="gs-expr-examples">
              {item.examples.map((ex, i) => (
                <div key={i} className="word-card__example">
                  <div className="word-card__example-jp">{ex.jp}</div>
                  <div className="word-card__example-vn">{ex.vn}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PatternsSection({ category }) {
  const [search, setSearch] = useState("");
  const filtered = category.items.filter(
    (p) =>
      !search ||
      p.pattern.toLowerCase().includes(search.toLowerCase()) ||
      p.meaning.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="grammar-section">
      <div className="grammar-section__title" style={{ "--c": category.color }}>
        <span className="gs-icon">{category.icon}</span>
        <span className="gs-label">{category.label}</span>
      </div>

      <div className="search-box gs-search">
        <span className="search-box__icon">🔍</span>
        <input
          type="text"
          placeholder="Tìm cấu trúc ngữ pháp..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.map((item, idx) => (
        <div
          key={item.id}
          className="pattern-card"
          style={{
            "--card-color": item.color,
            animationDelay: `${idx * 80}ms`,
          }}
        >
          <div className="gs-pattern-head">
            <span className="pattern-chip" style={{ "--c": item.color }}>
              {item.pattern}
            </span>
            <span
              className={`pattern-level ${item.level === "Cơ bản" ? "is-basic" : "is-adv"}`}
            >
              {item.level}
            </span>
          </div>

          <div className="pattern-meaning">{item.meaning}</div>
          <div className="pattern-explanation">{item.explanation}</div>

          <div className="pattern-examples">
            {item.examples.map((ex, i) => (
              <div key={i} className="pattern-example">
                <div className="pattern-example__jp">
                  {ex.highlights ? (
                    <HighlightedText
                      text={ex.jp.replace(/<|>/g, "")}
                      highlights={ex.highlights || []}
                      color={item.color}
                    />
                  ) : (
                    ex.jp
                  )}
                </div>
                <div className="pattern-example__vn">→ {ex.vn}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tính từ い・な ──────────────────────────────────────────────
function AdjectivesSection({ category }) {
  return (
    <div className="grammar-section">
      <div className="grammar-section__title" style={{ "--c": category.color }}>
        <span className="gs-icon">{category.icon}</span>
        <span className="gs-label">{category.label}</span>
      </div>

      {category.items.map((group, gi) => (
        <div
          key={group.id}
          className="word-card gs-group"
          style={{ "--c": group.color, animationDelay: `${gi * 100}ms` }}
        >
          <div className="gs-group__titlerow">
            <span className="gs-group__title">{group.title}</span>
          </div>
          <div className="gs-group__sub">{group.subtitle}</div>
          <div className="gs-rule">📌 Quy tắc: {group.rule}</div>

          <div className="verb-table-wrapper">
            <table className="verb-table">
              <thead>
                <tr>
                  <th>Từ điển</th>
                  <th>Nghĩa</th>
                  <th className="th-cyan">Hiện tại</th>
                  <th className="th-red">Phủ định</th>
                  <th className="th-green">Quá khứ</th>
                  <th className="th-yellow">+ Danh từ</th>
                  <th className="th-violet">Thể て</th>
                </tr>
              </thead>
              <tbody>
                {group.conjugations.map((v, i) => (
                  <tr key={i}>
                    <td className="verb-dict">{v.dict}</td>
                    <td className="verb-meaning">{v.meaning}</td>
                    <td className="verb-masu">{v.present}</td>
                    <td className="verb-masen">{v.negative}</td>
                    <td className="verb-mashita">{v.past}</td>
                    <td className="verb-noun">{v.noun}</td>
                    <td className="verb-te">{v.te}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Từ để hỏi ──────────────────────────────────────────────────
function QuestionWordsSection({ category }) {
  return (
    <div className="grammar-section">
      <div className="grammar-section__title" style={{ "--c": category.color }}>
        <span className="gs-icon">{category.icon}</span>
        <span className="gs-label">{category.label}</span>
      </div>

      <div className="particle-grid">
        {category.items.map((item, idx) => (
          <div
            key={item.id}
            className="particle-card"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <div
              className="particle-chip particle-chip--word"
              style={{ "--c": item.color }}
            >
              {item.word}
            </div>
            <div className="gs-romaji">/ {item.romaji} /</div>
            <div className="particle-function">{item.meaning}</div>
            <div className="particle-detail">{item.note}</div>

            <div className="particle-examples">
              {item.examples.map((ex, i) => (
                <div key={i} className="particle-example">
                  <div className="particle-example__jp">
                    <HighlightedText
                      text={ex.jp}
                      highlights={[item.word.split(" / ")[0]]}
                      color={item.color}
                    />
                  </div>
                  <div className="particle-example__vn">→ {ex.vn}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Số đếm & Lượng từ ──────────────────────────────────────────
function CountersSection({ category }) {
  return (
    <div className="grammar-section">
      <div className="grammar-section__title" style={{ "--c": category.color }}>
        <span className="gs-icon">{category.icon}</span>
        <span className="gs-label">{category.label}</span>
      </div>

      {category.items.map((group, gi) => (
        <div
          key={group.id}
          className="word-card gs-group"
          style={{ "--c": group.color, animationDelay: `${gi * 100}ms` }}
        >
          <div className="gs-group__titlerow">
            <span className="gs-group__title">{group.title}</span>
          </div>
          <div className="gs-group__sub">{group.subtitle}</div>
          {group.note && (
            <div className="gs-rule gs-rule--plain">💡 {group.note}</div>
          )}

          {/* Lượng từ thông dụng */}
          {group.counters && (
            <div className="verb-table-wrapper">
              <table className="verb-table">
                <thead>
                  <tr>
                    <th>Lượng từ</th>
                    <th>Dùng cho</th>
                    <th>Ví dụ</th>
                  </tr>
                </thead>
                <tbody>
                  {group.counters.map((c, i) => (
                    <tr key={i}>
                      <td className="verb-dict vt-accent">{c.kanji}</td>
                      <td className="verb-meaning">{c.use}</td>
                      <td className="vt-sm">{c.examples}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Biến âm bất quy tắc */}
          {group.special_readings && (
            <div className="gs-special">
              {group.special_readings.map((r, i) => (
                <div key={i} className="gs-special__item">
                  <span className="gs-special__counter">{r.counter}</span>
                  <span className="gs-special__irregular">{r.irregular}</span>
                </div>
              ))}
            </div>
          )}

          {/* Biểu thức thời gian */}
          {group.time_expressions && (
            <div className="verb-table-wrapper">
              <table className="verb-table">
                <thead>
                  <tr>
                    <th>Cụm từ</th>
                    <th>Nghĩa</th>
                    <th>Ví dụ</th>
                  </tr>
                </thead>
                <tbody>
                  {group.time_expressions.map((t, i) => (
                    <tr key={i}>
                      <td className="verb-dict vt-accent">{t.jp}</td>
                      <td className="verb-meaning">{t.meaning}</td>
                      <td className="vt-sm-mono">{t.ex}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Tổng quan luyện tập ngữ pháp — số câu sinh được và tiến độ SRS. */
function GrammarPracticeBar({ open, onToggle }) {
  const sets = quizSetsFor("grammar");
  const totalQ = sets.reduce((a, s) => a + buildQuiz(s.id).length, 0);
  const allIds = sets.flatMap((s) => buildQuiz(s.id).map((q) => q.id));
  const stats = getStats("grammar", allIds);

  return (
    <div className="pbar">
      <div className="pbar__info">
        <div className="pbar__title">🎯 Luyện tập ngữ pháp</div>
        <div className="pbar__sub">
          {totalQ} câu được sinh tự động từ chính dữ liệu trong tab này — điền trợ từ, điền mẫu câu,
          nhận dạng &amp; gõ dạng chia động từ/tính từ.
        </div>
        <div className="pbar__stats">
          <span style={{ color: "#34d399" }}>✅ {stats.mastered} thuộc</span>
          <span style={{ color: "#facc15" }}>📚 {stats.learning} đang học</span>
          {stats.due > 0 && <span style={{ color: "#22d3ee" }}>📅 {stats.due} tới hạn</span>}
        </div>
      </div>
      <button className={`pbar__btn ${open ? "is-on" : ""}`} onClick={onToggle}>
        {open ? "✕ Đóng" : "Bắt đầu luyện →"}
      </button>
    </div>
  );
}

/** Tìm phần chứa mục khớp từ khoá — dùng khi mở từ tìm kiếm toàn cục. */
function sectionOf(term) {
  if (!term) return null;
  const t = String(term).toLowerCase();
  for (const cat of grammarData.categories) {
    const hit = cat.items.some((i) =>
      [i.particle, i.pattern, i.word, i.title].some((v) => v && String(v).toLowerCase() === t),
    );
    if (hit) return cat.id;
  }
  return null;
}

export default function GrammarTab({ initialSearch }) {
  const [activeSection, setActiveSection] = useState(
    () => sectionOf(initialSearch) || "particles",
  );
  const [showQuiz, setShowQuiz] = useState(false);

  const sectionMap = {
    particles: (cat) => <ParticlesSection key={cat.id} category={cat} />,
    "verb-groups": (cat) => <VerbGroupsSection key={cat.id} category={cat} />,
    patterns: (cat) => <PatternsSection key={cat.id} category={cat} />,
    expressions: (cat) => <ExpressionsSection key={cat.id} category={cat} />,
    adjectives: (cat) => <AdjectivesSection key={cat.id} category={cat} />,
    "question-words": (cat) => (
      <QuestionWordsSection key={cat.id} category={cat} />
    ),
    counters: (cat) => <CountersSection key={cat.id} category={cat} />,
    "patterns-extra": (cat) => <PatternsSection key={cat.id} category={cat} />,
  };

  const sections = grammarData.categories;

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">⚙️ Ngữ pháp N5</h2>
        <p className="section-desc">
          {grammarData.meta.total} mục · phần Trợ từ đã phủ cả N5 lẫn N4, mỗi trợ từ có đủ các cách
          dùng theo Minna no Nihongo kèm điểm cần lưu ý (bấm “cách dùng” trên thẻ để mở) — và luyện
          tập ngay trên chính dữ liệu này
        </p>
      </div>

      <GrammarPracticeBar open={showQuiz} onToggle={() => setShowQuiz((v) => !v)} />
      {showQuiz && <QuizHub tab="grammar" color="#f472b6" onClose={() => setShowQuiz(false)} />}

      {/* Section selector */}
      <div className="filter-bar gs-section-nav">
        <span className="filter-label">Phần:</span>
        {sections.map((sec) => (
          <button
            key={sec.id}
            className={`filter-btn ${activeSection === sec.id ? "filter-btn--active" : ""}`}
            style={{ "--c": sec.color }}
            onClick={() => setActiveSection(sec.id)}
          >
            {sec.icon} {sec.label}
          </button>
        ))}
      </div>

      {sections
        .filter((s) => s.id === activeSection)
        .map((cat) => sectionMap[cat.id]?.(cat))}
    </div>
  );
}
