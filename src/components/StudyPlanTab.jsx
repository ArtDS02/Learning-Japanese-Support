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
      <div className="sp-methods-head">
        <h3 className="sp-heading sp-heading--20 sp-heading--mb20" style={{ "--c": "var(--accent-violet)" }}>
          🧠 Phương pháp học hiệu quả
        </h3>
      </div>

      <div className="study-methods">
        {studyPlan.methods.map((m, i) => (
          <div
            key={m.id}
            className="method-card"
            style={{ "--card-color": m.color, animationDelay: `${i * 80}ms` }}
          >
            <span className="method-icon">{m.icon}</span>
            <div className="method-title">{m.title}</div>
            <div className="method-desc">{m.description}</div>

            <div className="method-tools-label">Công cụ đề xuất</div>
            <div className="method-tools">
              {m.tools.map((t, ti) => (
                <div key={ti} className="method-tool">
                  {t}
                </div>
              ))}
            </div>

            <div className="method-howto">{m.howTo}</div>
          </div>
        ))}
      </div>

      {/* Schedule */}
      <div className="sp-schedule-head">
        <h3 className="sp-heading sp-heading--20" style={{ "--c": "var(--accent-cyan)" }}>
          📅 Lộ trình 3 tháng (12 tuần)
        </h3>
        <p className="sp-schedule-sub">
          Bắt đầu từ con số 0, đủ để thi N5 trong 12 tuần nếu học đều đặn
        </p>
      </div>

      <div className="sp-schedule-box">
        <div className="schedule-timeline">
          {studyPlan.schedule.map((item, i) => (
            <div
              key={i}
              className="schedule-item"
              style={{ "--c": item.color, animationDelay: `${i * 60}ms` }}
            >
              <div className="schedule-item__dot" />
              <div className="schedule-item__week">{item.week}</div>
              <div className="schedule-item__body">
                <div className="schedule-item__focus">{item.focus}</div>
                <div className="schedule-item__goal">{item.goal}</div>
                <div className="schedule-item__daily">⏱ {item.daily}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily routine suggestion */}
      <div className="sp-box sp-box--green">
        <h3 className="sp-heading sp-heading--18 sp-heading--mb16" style={{ "--c": "var(--accent-green)" }}>
          ☀️ Thói quen học hàng ngày (45 phút)
        </h3>
        <div className="sp-daily-list">
          {[
            { time: "5 phút", task: "Ôn Anki (flashcard từ vựng/kanji cũ)", color: "#facc15" },
            { time: "10 phút", task: "Học từ mới (10 từ/ngày theo chủ đề)", color: "#22d3ee" },
            { time: "10 phút", task: "Luyện ngữ pháp (1-2 cấu trúc mới)", color: "#a78bfa" },
            { time: "10 phút", task: "Nghe tiếng Nhật (podcast/anime N5)", color: "#f97316" },
            { time: "10 phút", task: "Viết câu ví dụ hoặc nhật ký ngắn", color: "#34d399" },
          ].map((r, i) => (
            <div key={i} className="sp-daily" style={{ "--c": r.color }}>
              <span className="sp-daily__time">{r.time}</span>
              <span className="sp-daily__task">{r.task}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Resources */}
      <div className="sp-box sp-box--yellow">
        <h3 className="sp-heading sp-heading--18 sp-heading--mb16" style={{ "--c": "var(--accent-yellow)" }}>
          📚 Tài nguyên học tập miễn phí
        </h3>
        <div className="sp-res-grid">
          {[
            { name: "Anki", desc: "Flashcard SRS miễn phí, tốt nhất cho từ vựng/kanji", icon: "🃏", color: "#60a5fa" },
            { name: "NHK Web Easy", desc: "Tin tức tiếng Nhật đơn giản, kèm furigana", icon: "📰", color: "#34d399" },
            { name: "Jisho.org", desc: "Từ điển Nhật-Anh tốt nhất, tra kanji được", icon: "🔍", color: "#a78bfa" },
            { name: "JLPT.jp", desc: "Đề thi mẫu chính thức từ Ban tổ chức JLPT", icon: "📝", color: "#f97316" },
            { name: "Tae Kim's Guide", desc: "Giáo trình ngữ pháp miễn phí, rất chi tiết", icon: "📖", color: "#f472b6" },
            { name: "WaniKani", desc: "Học kanji theo phương pháp SRS (có phí)", icon: "🦀", color: "#facc15" },
          ].map((r, i) => (
            <div key={i} className="sp-res" style={{ "--c": r.color }}>
              <div className="sp-res__icon">{r.icon}</div>
              <div className="sp-res__name">{r.name}</div>
              <div className="sp-res__desc">{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Closing motivation */}
      <div className="sp-closing">
        <div className="sp-closing__emoji">🎌</div>
        <div className="sp-closing__jp">がんばってください！</div>
        <div className="sp-closing__sub">Chúc bạn đạt điểm cao trong kỳ thi JLPT N5!</div>
        <div className="sp-closing__note">継続は力なり — Kiên trì là sức mạnh</div>
      </div>
    </div>
  );
}
