import { useState } from "react";
import data from "../data/tips-exercises.json";

const { tips } = data;

export default function TipsTab() {
  const [activeSection, setActiveSection] = useState("all");

  const filtered =
    activeSection === "all"
      ? tips.sections
      : tips.sections.filter((s) => s.id === activeSection);

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">💡 Mẹo làm bài thi</h2>
        <p className="section-desc">
          Chiến thuật thực chiến cho từng phần thi JLPT N5
        </p>
      </div>

      {/* Filter */}
      <div className="filter-bar">
        <span className="filter-label">Phần thi:</span>
        <button
          className={`filter-btn ${activeSection === "all" ? "filter-btn--active" : ""}`}
          style={activeSection === "all" ? { background: "#a78bfa", color: "#0a0b0f" } : {}}
          onClick={() => setActiveSection("all")}
        >
          🌐 Tất cả
        </button>
        {tips.sections.map((sec) => (
          <button
            key={sec.id}
            className={`filter-btn ${activeSection === sec.id ? "filter-btn--active" : ""}`}
            style={activeSection === sec.id ? { background: sec.color, color: "#0a0b0f" } : {}}
            onClick={() => setActiveSection(sec.id)}
          >
            {sec.icon} {sec.title.replace("Mẹo phần ", "")}
          </button>
        ))}
      </div>

      {/* Tip sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {filtered.map((sec, si) => (
          <div key={sec.id} className="tips-section">
            {/* Section header */}
            <div
              className="tips-section__header"
              style={{
                background: `${sec.color}18`,
                border: `1px solid ${sec.color}33`,
                borderBottom: "none",
              }}
            >
              <span style={{ fontSize: 24 }}>{sec.icon}</span>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 17,
                    color: sec.color,
                  }}
                >
                  {sec.title}
                </div>
              </div>
            </div>

            {/* Tips list */}
            <div className="tips-list" style={{ border: `1px solid ${sec.color}22` }}>
              {sec.items.map((item, i) => (
                <div
                  key={i}
                  className="tip-item"
                  style={{ animationDelay: `${si * 100 + i * 60}ms` }}
                >
                  <span
                    className="tip-item__num"
                    style={{
                      background: `${sec.color}22`,
                      color: sec.color,
                    }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <div className="tip-item__title">{item.title}</div>
                    <div className="tip-item__detail">{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Quick reference box */}
      <div
        style={{
          marginTop: 32,
          padding: 24,
          background: "var(--bg-card)",
          border: "1px solid rgba(250,204,21,0.2)",
          borderRadius: "var(--radius-lg)",
          borderLeft: "3px solid var(--accent-yellow)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 17,
            fontWeight: 700,
            color: "var(--accent-yellow)",
            marginBottom: 14,
          }}
        >
          ⏱️ Phân bổ thời gian thi JLPT N5
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {[
            { section: "Từ vựng (語彙)", time: "~25 phút", questions: "25 câu", color: "#22d3ee" },
            { section: "Ngữ pháp (文法)", time: "~50 phút", questions: "~40 câu", color: "#a78bfa" },
            { section: "Đọc hiểu (読解)", time: "Chung với Ngữ pháp", questions: "~10 câu", color: "#34d399" },
            { section: "Nghe (聴解)", time: "~30 phút", questions: "~25 câu", color: "#f97316" },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                padding: "12px 16px",
                background: `${s.color}10`,
                border: `1px solid ${s.color}30`,
                borderRadius: "var(--radius-md)",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, color: s.color, marginBottom: 4 }}>
                {s.section}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>⏱ {s.time}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                {s.questions}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 16,
            fontSize: 13,
            color: "var(--text-secondary)",
            padding: "10px 14px",
            background: "rgba(255,255,255,0.03)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          💡 Điểm đậu N5: Cần đạt tối thiểu <strong style={{ color: "var(--accent-yellow)" }}>80/180 điểm tổng</strong> và đạt điểm sàn từng phần
          (Ngôn ngữ: 38/120, Nghe: 19/60).
        </div>
      </div>
    </div>
  );
}
