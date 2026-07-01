import { useState } from "react";
import data from "../data/tips-exercises.json";
import "../styles/tabs/tips.css";

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
          style={{ "--c": "#a78bfa" }}
          onClick={() => setActiveSection("all")}
        >
          🌐 Tất cả
        </button>
        {tips.sections.map((sec) => (
          <button
            key={sec.id}
            className={`filter-btn ${activeSection === sec.id ? "filter-btn--active" : ""}`}
            style={{ "--c": sec.color }}
            onClick={() => setActiveSection(sec.id)}
          >
            {sec.icon} {sec.title.replace("Mẹo phần ", "")}
          </button>
        ))}
      </div>

      {/* Tip sections */}
      <div className="tips-sections">
        {filtered.map((sec, si) => (
          <div key={sec.id} className="tips-section" style={{ "--c": sec.color }}>
            {/* Section header */}
            <div className="tips-section__header">
              <span className="tips-section__icon">{sec.icon}</span>
              <div>
                <div className="tips-section__title">{sec.title}</div>
              </div>
            </div>

            {/* Tips list */}
            <div className="tips-list">
              {sec.items.map((item, i) => (
                <div
                  key={i}
                  className="tip-item"
                  style={{ animationDelay: `${si * 100 + i * 60}ms` }}
                >
                  <span className="tip-item__num">{i + 1}</span>
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
      <div className="tips-quickref">
        <div className="tips-quickref__title">⏱️ Phân bổ thời gian thi JLPT N5</div>
        <div className="tips-timegrid">
          {[
            { section: "Từ vựng (語彙)", time: "~25 phút", questions: "25 câu", color: "#22d3ee" },
            { section: "Ngữ pháp (文法)", time: "~50 phút", questions: "~40 câu", color: "#a78bfa" },
            { section: "Đọc hiểu (読解)", time: "Chung với Ngữ pháp", questions: "~10 câu", color: "#34d399" },
            { section: "Nghe (聴解)", time: "~30 phút", questions: "~25 câu", color: "#f97316" },
          ].map((s, i) => (
            <div key={i} className="tips-timecard" style={{ "--c": s.color }}>
              <div className="tips-timecard__name">{s.section}</div>
              <div className="tips-timecard__time">⏱ {s.time}</div>
              <div className="tips-timecard__q">{s.questions}</div>
            </div>
          ))}
        </div>

        <div className="tips-passnote">
          💡 Điểm đậu N5: Cần đạt tối thiểu <strong className="tips-hl">80/180 điểm tổng</strong> và đạt điểm sàn từng phần
          (Ngôn ngữ: 38/120, Nghe: 19/60).
        </div>
      </div>
    </div>
  );
}
