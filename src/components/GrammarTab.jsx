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
          <mark
            key={i}
            className="highlight"
            style={{
              background: `${color}33`,
              color: color,
              border: `1px solid ${color}55`,
            }}
          >
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
      <div className="grammar-section__title">
        <span style={{ fontSize: 22 }}>{category.icon}</span>
        <span style={{ color: category.color }}>{category.label}</span>
      </div>

      {/* Particle quick-filter */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <span className="filter-label">Lọc:</span>
        <button
          className={`filter-btn ${activeFilter === "all" ? "filter-btn--active" : ""}`}
          style={
            activeFilter === "all"
              ? { background: category.color, color: "#0a0b0f" }
              : {}
          }
          onClick={() => setActiveFilter("all")}
        >
          Tất cả
        </button>
        {category.items.map((item) => (
          <button
            key={item.id}
            className={`filter-btn ${activeFilter === item.id ? "filter-btn--active" : ""}`}
            style={
              activeFilter === item.id
                ? {
                    background: item.color,
                    color: "#0a0b0f",
                    fontWeight: 700,
                    fontSize: 16,
                  }
                : {}
            }
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
            <div
              className="particle-chip"
              style={{
                background: `${item.color}22`,
                color: item.color,
                border: `1px solid ${item.color}44`,
              }}
            >
              {item.particle}
            </div>

            {/* Romaji */}
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text-muted)",
                marginBottom: 8,
              }}
            >
              / {item.romaji} /
            </div>

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
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--text-muted)",
                      margin: "2px 0",
                    }}
                  >
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
      <div className="grammar-section__title">
        <span style={{ fontSize: 22 }}>{category.icon}</span>
        <span style={{ color: category.color }}>{category.label}</span>
      </div>

      {category.items.map((group, gi) => (
        <div
          key={group.id}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--bg-border)",
            borderRadius: "var(--radius-lg)",
            padding: 24,
            marginBottom: 16,
            borderLeft: `3px solid ${group.color}`,
            animationDelay: `${gi * 100}ms`,
          }}
          className="word-card"
        >
          <div style={{ marginBottom: 4 }}>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 17,
                fontWeight: 700,
                color: group.color,
              }}
            >
              {group.title}
            </span>
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              marginBottom: 8,
            }}
          >
            {group.subtitle}
          </div>
          <div
            style={{
              fontSize: 13,
              padding: "8px 14px",
              background: `${group.color}15`,
              border: `1px solid ${group.color}33`,
              borderRadius: "var(--radius-sm)",
              color: group.color,
              marginBottom: 16,
              fontFamily: "var(--font-mono)",
            }}
          >
            📌 Quy tắc: {group.rule}
          </div>

          <div className="verb-table-wrapper">
            <table className="verb-table">
              <thead>
                <tr>
                  <th>Từ điển</th>
                  <th>Nghĩa</th>
                  <th style={{ color: "var(--accent-cyan)" }}>ます</th>
                  <th style={{ color: "var(--accent-red)" }}>ません</th>
                  <th style={{ color: "var(--accent-green)" }}>ました</th>
                  <th style={{ color: "var(--accent-yellow)" }}>て形</th>
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
      <div className="grammar-section__title">
        <span style={{ fontSize: 22 }}>{category.icon}</span>
        <span style={{ color: category.color }}>{category.label}</span>
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <div>
                <div className="word-card__jp" style={{ fontSize: 22 }}>
                  {item.title}
                </div>
                <div className="word-card__kanji" style={{ color: item.color }}>
                  {item.subtitle}
                </div>
              </div>
              <div
                className="word-card__type-badge"
                style={{ background: `${item.color}22`, color: item.color }}
              >
                Mẫu câu
              </div>
            </div>

            <div className="word-card__meaning">{item.meaning}</div>
            <div className="word-card__note">{item.note}</div>

            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
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
      <div className="grammar-section__title">
        <span style={{ fontSize: 22 }}>{category.icon}</span>
        <span style={{ color: category.color }}>{category.label}</span>
      </div>

      <div className="search-box" style={{ marginBottom: 20 }}>
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
          <div
            style={{
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span
              className="pattern-chip"
              style={{
                background: `${item.color}22`,
                color: item.color,
                border: `1px solid ${item.color}44`,
              }}
            >
              {item.pattern}
            </span>
            <span
              className="pattern-level"
              style={{
                background:
                  item.level === "Cơ bản"
                    ? "rgba(52,211,153,0.15)"
                    : "rgba(167,139,250,0.15)",
                color:
                  item.level === "Cơ bản"
                    ? "var(--accent-green)"
                    : "var(--accent-violet)",
              }}
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
      <div className="grammar-section__title">
        <span style={{ fontSize: 22 }}>{category.icon}</span>
        <span style={{ color: category.color }}>{category.label}</span>
      </div>

      {category.items.map((group, gi) => (
        <div
          key={group.id}
          className="word-card"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--bg-border)",
            borderRadius: "var(--radius-lg)",
            padding: 24,
            marginBottom: 16,
            borderLeft: `3px solid ${group.color}`,
            animationDelay: `${gi * 100}ms`,
          }}
        >
          <div style={{ marginBottom: 4 }}>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 17,
                fontWeight: 700,
                color: group.color,
              }}
            >
              {group.title}
            </span>
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              marginBottom: 8,
            }}
          >
            {group.subtitle}
          </div>
          <div
            style={{
              fontSize: 13,
              padding: "8px 14px",
              background: `${group.color}15`,
              border: `1px solid ${group.color}33`,
              borderRadius: "var(--radius-sm)",
              color: group.color,
              marginBottom: 16,
              fontFamily: "var(--font-mono)",
            }}
          >
            📌 Quy tắc: {group.rule}
          </div>

          <div className="verb-table-wrapper">
            <table className="verb-table">
              <thead>
                <tr>
                  <th>Từ điển</th>
                  <th>Nghĩa</th>
                  <th style={{ color: "var(--accent-cyan)" }}>Hiện tại</th>
                  <th style={{ color: "var(--accent-red)" }}>Phủ định</th>
                  <th style={{ color: "var(--accent-green)" }}>Quá khứ</th>
                  <th style={{ color: "var(--accent-yellow)" }}>+ Danh từ</th>
                  <th style={{ color: "var(--accent-violet)" }}>Thể て</th>
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
                    <td style={{ fontFamily: "var(--font-jp)", fontSize: 13 }}>
                      {v.noun}
                    </td>
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
      <div className="grammar-section__title">
        <span style={{ fontSize: 22 }}>{category.icon}</span>
        <span style={{ color: category.color }}>{category.label}</span>
      </div>

      <div className="particle-grid">
        {category.items.map((item, idx) => (
          <div
            key={item.id}
            className="particle-card"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <div
              className="particle-chip"
              style={{
                background: `${item.color}22`,
                color: item.color,
                border: `1px solid ${item.color}44`,
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              {item.word}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text-muted)",
                marginBottom: 8,
              }}
            >
              / {item.romaji} /
            </div>
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
      <div className="grammar-section__title">
        <span style={{ fontSize: 22 }}>{category.icon}</span>
        <span style={{ color: category.color }}>{category.label}</span>
      </div>

      {category.items.map((group, gi) => (
        <div
          key={group.id}
          className="word-card"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--bg-border)",
            borderRadius: "var(--radius-lg)",
            padding: 24,
            marginBottom: 16,
            borderLeft: `3px solid ${group.color}`,
            animationDelay: `${gi * 100}ms`,
          }}
        >
          <div style={{ marginBottom: 4 }}>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 17,
                fontWeight: 700,
                color: group.color,
              }}
            >
              {group.title}
            </span>
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              marginBottom: 8,
            }}
          >
            {group.subtitle}
          </div>
          {group.note && (
            <div
              style={{
                fontSize: 13,
                padding: "8px 14px",
                background: `${group.color}15`,
                border: `1px solid ${group.color}33`,
                borderRadius: "var(--radius-sm)",
                color: group.color,
                marginBottom: 16,
              }}
            >
              💡 {group.note}
            </div>
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
                      <td className="verb-dict" style={{ color: group.color }}>
                        {c.kanji}
                      </td>
                      <td className="verb-meaning">{c.use}</td>
                      <td
                        style={{ fontSize: 12, color: "var(--text-secondary)" }}
                      >
                        {c.examples}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Biến âm bất quy tắc */}
          {group.special_readings && (
            <div style={{ display: "grid", gap: 8 }}>
              {group.special_readings.map((r, i) => (
                <div
                  key={i}
                  style={{
                    padding: "10px 14px",
                    background: "var(--bg-surface)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--bg-border)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-jp)",
                      color: group.color,
                      fontWeight: 600,
                      marginRight: 10,
                    }}
                  >
                    {r.counter}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {r.irregular}
                  </span>
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
                      <td className="verb-dict" style={{ color: group.color }}>
                        {t.jp}
                      </td>
                      <td className="verb-meaning">{t.meaning}</td>
                      <td
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {t.ex}
                      </td>
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
      <div className="filter-bar" style={{ marginBottom: 28 }}>
        <span className="filter-label">Phần:</span>
        {sections.map((sec) => (
          <button
            key={sec.id}
            className={`filter-btn ${activeSection === sec.id ? "filter-btn--active" : ""}`}
            style={
              activeSection === sec.id
                ? { background: sec.color, color: "#0a0b0f" }
                : {}
            }
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
