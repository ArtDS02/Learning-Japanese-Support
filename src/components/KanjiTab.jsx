import { useState, useMemo } from "react";
import kanjiData from "../data/kanji.json";

export default function KanjiTab() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedKanji, setSelectedKanji] = useState(null);

  const filtered = useMemo(() => {
    return kanjiData.kanji.filter((k) => {
      const matchCat = activeCategory === "all" || k.category === activeCategory;
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

  const catColor = (id) => kanjiData.categories.find((c) => c.id === id)?.color || "#a78bfa";

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">🈳 Kanji N5</h2>
        <p className="section-desc">
          {kanjiData.kanji.length} kanji · Nhấn vào kanji để xem chi tiết, ví dụ và cách ghi nhớ
        </p>
      </div>

      {/* Search */}
      <div className="search-box">
        <span className="search-box__icon">🔍</span>
        <input
          type="text"
          placeholder="Tìm kanji (chữ, nghĩa, cách đọc)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Category filter */}
      <div className="filter-bar">
        <span className="filter-label">Nhóm:</span>
        <button
          className={`filter-btn ${activeCategory === "all" ? "filter-btn--active" : ""}`}
          style={activeCategory === "all" ? { background: "#a78bfa", color: "#0a0b0f" } : {}}
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
              style={activeCategory === cat.id ? { background: cat.color, color: "#0a0b0f" } : {}}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.icon} {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "var(--accent-yellow)", fontFamily: "var(--font-mono)", fontSize: 13 }}>■</span>
          Âm On (Hán-Nhật)
        </span>
        <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "var(--accent-cyan)", fontFamily: "var(--font-mono)", fontSize: 13 }}>■</span>
          Âm Kun (thuần Nhật)
        </span>
        <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 11 }}>①</span>
          Số nét
        </span>
      </div>

      {/* Grid */}
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
              onClick={() => setSelectedKanji(k)}
            >
              <span className="kanji-stroke">{k.stroke}nét</span>
              <span className="kanji-char">{k.char}</span>
              <div className="kanji-meaning">{k.meaning}</div>
              <div className="kanji-readings">
                <span className="kanji-on">On: {k.on}</span>
                <span className="kanji-kun">Kun: {k.kun}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedKanji && (
        <KanjiModal kanji={selectedKanji} onClose={() => setSelectedKanji(null)} catColor={catColor(selectedKanji.category)} />
      )}
    </div>
  );
}

function KanjiModal({ kanji, onClose, catColor }) {
  return (
    <div className="kanji-modal-overlay" onClick={onClose}>
      <div className="kanji-modal" onClick={(e) => e.stopPropagation()}>
        <button className="kanji-modal__close" onClick={onClose}>✕</button>

        {/* Category tag */}
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <span style={{
            fontSize: 11, padding: "3px 10px", borderRadius: 20,
            background: `${catColor}22`, color: catColor,
            fontFamily: "var(--font-mono)", fontWeight: 700
          }}>
            {kanjiData.categories.find(c => c.id === kanji.category)?.icon}{" "}
            {kanjiData.categories.find(c => c.id === kanji.category)?.label}
          </span>
        </div>

        <div className="kanji-modal__char" style={{ color: catColor }}>{kanji.char}</div>
        <div className="kanji-modal__meaning">{kanji.meaning}</div>

        {/* Stroke count */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
            Số nét: {kanji.stroke}
          </span>
        </div>

        {/* Readings */}
        <div className="kanji-modal__readings">
          <div className="kanji-modal__reading-group">
            <div className="kanji-modal__reading-label">Âm On</div>
            <div className="kanji-modal__reading-value" style={{ color: "var(--accent-yellow)" }}>
              {kanji.on}
            </div>
          </div>
          <div style={{ width: 1, background: "var(--bg-border)", margin: "0 8px" }} />
          <div className="kanji-modal__reading-group">
            <div className="kanji-modal__reading-label">Âm Kun</div>
            <div className="kanji-modal__reading-value" style={{ color: "var(--accent-cyan)" }}>
              {kanji.kun}
            </div>
          </div>
        </div>

        {/* Mnemonic */}
        {kanji.mnemonic && (
          <div className="kanji-modal__mnemonic">{kanji.mnemonic}</div>
        )}

        {/* Examples */}
        <div style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
          Ví dụ từ ghép
        </div>
        <div className="kanji-modal__examples">
          {kanji.examples.map((ex, i) => (
            <div key={i} className="kanji-modal__example">
              <div>
                <div className="kanji-modal__example-word">{ex.word}</div>
                <div className="kanji-modal__example-reading">{ex.reading}</div>
              </div>
              <div className="kanji-modal__example-meaning">{ex.meaning}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
