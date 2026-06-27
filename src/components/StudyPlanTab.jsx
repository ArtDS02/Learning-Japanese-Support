import data from "../data/tips-exercises.json";
import "../styles/tabs/studyplan.css";

const { studyPlan } = data;

export default function StudyPlanTab() {
  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">🗓️ Lộ trình & Phương pháp</h2>
        <p className="section-desc">
          Kế hoạch học 3 tháng + phương pháp học hiệu quả nhất
        </p>
      </div>

      {/* Methods */}
      <div style={{ marginBottom: 12 }}>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 700,
            marginBottom: 20,
            color: "var(--accent-violet)",
          }}
        >
          🧠 Phương pháp học hiệu quả
        </h3>
      </div>

      <div className="study-methods">
        {studyPlan.methods.map((m, i) => (
          <div
            key={m.id}
            className="method-card"
            style={{
              "--card-color": m.color,
              animationDelay: `${i * 80}ms`,
              borderLeft: `3px solid ${m.color}`,
            }}
          >
            <span className="method-icon">{m.icon}</span>
            <div className="method-title" style={{ color: m.color }}>
              {m.title}
            </div>
            <div className="method-desc">{m.description}</div>

            <div
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              Công cụ đề xuất
            </div>
            <div className="method-tools">
              {m.tools.map((t, ti) => (
                <div key={ti} className="method-tool" style={{ color: m.color }}>
                  {t}
                </div>
              ))}
            </div>

            <div className="method-howto">{m.howTo}</div>
          </div>
        ))}
      </div>

      {/* Schedule */}
      <div style={{ marginTop: 40, marginBottom: 20 }}>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 700,
            color: "var(--accent-cyan)",
          }}
        >
          📅 Lộ trình 3 tháng (12 tuần)
        </h3>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
          Bắt đầu từ con số 0, đủ để thi N5 trong 12 tuần nếu học đều đặn
        </p>
      </div>

      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--bg-border)",
          borderRadius: "var(--radius-lg)",
          padding: "8px 24px",
        }}
      >
        <div className="schedule-timeline">
          {studyPlan.schedule.map((item, i) => (
            <div
              key={i}
              className="schedule-item"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div
                className="schedule-item__dot"
                style={{ background: item.color, boxShadow: `0 0 8px ${item.color}66` }}
              />
              <div className="schedule-item__week">{item.week}</div>
              <div style={{ flex: 1 }}>
                <div className="schedule-item__focus" style={{ color: item.color }}>
                  {item.focus}
                </div>
                <div className="schedule-item__goal">{item.goal}</div>
                <div className="schedule-item__daily">⏱ {item.daily}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily routine suggestion */}
      <div
        style={{
          marginTop: 32,
          padding: 24,
          background: "var(--bg-card)",
          border: "1px solid rgba(52,211,153,0.2)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            fontWeight: 700,
            color: "var(--accent-green)",
            marginBottom: 16,
          }}
        >
          ☀️ Thói quen học hàng ngày (45 phút)
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { time: "5 phút", task: "Ôn Anki (flashcard từ vựng/kanji cũ)", color: "#facc15" },
            { time: "10 phút", task: "Học từ mới (10 từ/ngày theo chủ đề)", color: "#22d3ee" },
            { time: "10 phút", task: "Luyện ngữ pháp (1-2 cấu trúc mới)", color: "#a78bfa" },
            { time: "10 phút", task: "Nghe tiếng Nhật (podcast/anime N5)", color: "#f97316" },
            { time: "10 phút", task: "Viết câu ví dụ hoặc nhật ký ngắn", color: "#34d399" },
          ].map((r, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "10px 14px",
                background: "rgba(255,255,255,0.02)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--bg-border)",
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  fontWeight: 700,
                  color: r.color,
                  minWidth: 60,
                }}
              >
                {r.time}
              </span>
              <span style={{ fontSize: 14, color: "var(--text-primary)" }}>{r.task}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Resources */}
      <div
        style={{
          marginTop: 24,
          padding: 24,
          background: "var(--bg-card)",
          border: "1px solid rgba(250,204,21,0.2)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            fontWeight: 700,
            color: "var(--accent-yellow)",
            marginBottom: 16,
          }}
        >
          📚 Tài nguyên học tập miễn phí
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {[
            { name: "Anki", desc: "Flashcard SRS miễn phí, tốt nhất cho từ vựng/kanji", icon: "🃏", color: "#60a5fa" },
            { name: "NHK Web Easy", desc: "Tin tức tiếng Nhật đơn giản, kèm furigana", icon: "📰", color: "#34d399" },
            { name: "Jisho.org", desc: "Từ điển Nhật-Anh tốt nhất, tra kanji được", icon: "🔍", color: "#a78bfa" },
            { name: "JLPT.jp", desc: "Đề thi mẫu chính thức từ Ban tổ chức JLPT", icon: "📝", color: "#f97316" },
            { name: "Tae Kim's Guide", desc: "Giáo trình ngữ pháp miễn phí, rất chi tiết", icon: "📖", color: "#f472b6" },
            { name: "WaniKani", desc: "Học kanji theo phương pháp SRS (có phí)", icon: "🦀", color: "#facc15" },
          ].map((r, i) => (
            <div
              key={i}
              style={{
                padding: "14px 16px",
                background: `${r.color}0d`,
                border: `1px solid ${r.color}30`,
                borderRadius: "var(--radius-md)",
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 6 }}>{r.icon}</div>
              <div style={{ fontWeight: 600, color: r.color, marginBottom: 4, fontSize: 15 }}>
                {r.name}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {r.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Closing motivation */}
      <div
        style={{
          marginTop: 32,
          textAlign: "center",
          padding: 32,
          background: "linear-gradient(135deg, rgba(255,71,87,0.08), rgba(167,139,250,0.08))",
          border: "1px solid rgba(167,139,250,0.2)",
          borderRadius: "var(--radius-xl)",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎌</div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 28,
            fontWeight: 800,
            background: "linear-gradient(135deg, #ff4757, #a78bfa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: 8,
          }}
        >
          がんばってください！
        </div>
        <div style={{ color: "var(--text-secondary)", fontSize: 16 }}>
          Chúc bạn đạt điểm cao trong kỳ thi JLPT N5!
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>
          継続は力なり — Kiên trì là sức mạnh
        </div>
      </div>
    </div>
  );
}
