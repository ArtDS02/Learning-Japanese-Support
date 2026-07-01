import { useState } from "react";
import grammarData from "../data/grammar.json";
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

function ParticlesSection({ category }) {
  const [activeFilter, setActiveFilter] = useState("all");

  const filtered =
    activeFilter === "all"
      ? category.items
      : category.items.filter((p) => p.id === activeFilter);

  return (
    <div className="grammar-section">
      <div className="grammar-section__title" style={{ "--c": category.color }}>
        <span className="gs-icon">{category.icon}</span>
        <span className="gs-label">{category.label}</span>
      </div>

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
        {category.items.map((item) => (
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
        {filtered.map((item, idx) => (
          <div
            key={item.id}
            className="particle-card"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
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
                <div key={i} className="particle-example">
                  <div className="particle-example__jp">
                    <HighlightedText
                      text={ex.jp.replace(/<|>/g, "")}
                      highlights={[item.particle]}
                      color={item.color}
                    />
                  </div>
                  <div className="particle-example__romaji">
                    {ex.romaji.replace(/<|>/g, "")}
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

export default function GrammarTab() {
  const [activeSection, setActiveSection] = useState("particles");

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
          Trợ từ, nhóm động từ, cấu trúc câu quan trọng
        </p>
      </div>

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
