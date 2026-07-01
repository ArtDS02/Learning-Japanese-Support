import { useMemo, useState } from "react";
import vocabData from "../data/vocabulary.json";
import kanjiData from "../data/kanji.json";
import { getStats, resetDeck } from "../lib/srs";
import {
  loadProgress,
  getStreak,
  totalReviews,
  studiedToday,
  recentActivity,
} from "../lib/progress";
import "../styles/tabs/progress.css";

function Segments({ mastered, learning, neu }) {
  const total = mastered + learning + neu || 1;
  return (
    <div className="seg-bar" title={`Đã thuộc ${mastered} · Đang học ${learning} · Mới ${neu}`}>
      <div className="seg seg--mastered" style={{ width: `${(mastered / total) * 100}%` }} />
      <div className="seg seg--learning" style={{ width: `${(learning / total) * 100}%` }} />
      <div className="seg seg--new" style={{ width: `${(neu / total) * 100}%` }} />
    </div>
  );
}

function StatCard({ icon, value, label, color, sub }) {
  return (
    <div className="prog-stat" style={{ "--c": color }}>
      <div className="prog-stat__icon">{icon}</div>
      <div className="prog-stat__value">{value}</div>
      <div className="prog-stat__label">{label}</div>
      {sub != null && <div className="prog-stat__sub">{sub}</div>}
    </div>
  );
}

export default function ProgressTab() {
  const [, force] = useState(0);

  const vocabCats = useMemo(
    () =>
      vocabData.categories.map((c) => ({
        id: c.id,
        label: c.label,
        icon: c.icon,
        color: c.color,
        ids: c.words.map((w) => w.id),
      })),
    [],
  );

  const allVocabIds = useMemo(() => vocabCats.flatMap((c) => c.ids), [vocabCats]);
  const allKanjiIds = useMemo(() => kanjiData.kanji.map((k) => k.id), []);

  const vocabStats = getStats("vocab", allVocabIds);
  const kanjiStats = getStats("kanji", allKanjiIds);

  const p = loadProgress();
  const streak = getStreak(p);
  const total = totalReviews(p);
  const today = studiedToday(p);
  const activity = recentActivity(14, p);
  const maxAct = Math.max(1, ...activity.map((a) => a.count));

  const masteredAll = vocabStats.mastered + kanjiStats.mastered;
  const dueAll = vocabStats.due + kanjiStats.due;

  const resetAll = () => {
    if (!window.confirm("Xoá toàn bộ tiến độ học (SRS, streak)? Không thể hoàn tác.")) return;
    resetDeck("vocab");
    resetDeck("kanji");
    try {
      localStorage.removeItem("progress_v1");
    } catch {
      /* ignore */
    }
    force((n) => n + 1);
  };

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">📊 Tiến độ học tập</h2>
        <p className="section-desc">
          Theo dõi từ vựng &amp; kanji đã thuộc, chuỗi ngày học và lượng ôn tập mỗi ngày
        </p>
      </div>

      {/* Top stats */}
      <div className="prog-stats-grid">
        <StatCard
          icon={today ? "🔥" : "🌱"}
          value={`${streak} ngày`}
          label="Chuỗi học liên tiếp"
          color="#f97316"
          sub={today ? "Hôm nay đã học ✓" : "Học hôm nay để giữ chuỗi!"}
        />
        <StatCard
          icon="🏆"
          value={`${p.best || 0} ngày`}
          label="Chuỗi dài nhất"
          color="#facc15"
        />
        <StatCard
          icon="✅"
          value={masteredAll}
          label="Đã thuộc (từ + kanji)"
          color="#34d399"
          sub={`${vocabStats.mastered} từ · ${kanjiStats.mastered} kanji`}
        />
        <StatCard
          icon="📅"
          value={dueAll}
          label="Cần ôn hôm nay"
          color="#22d3ee"
          sub={total > 0 ? `Tổng ${total} lượt ôn` : "Chưa có lượt ôn nào"}
        />
      </div>

      {/* Vocabulary breakdown */}
      <div className="prog-block">
        <div className="prog-block__head">
          <h3>📖 Từ vựng</h3>
          <span className="prog-block__meta">
            {vocabStats.mastered}/{vocabStats.total} đã thuộc
          </span>
        </div>
        <Segments
          mastered={vocabStats.mastered}
          learning={vocabStats.learning}
          neu={vocabStats.new}
        />
        <div className="prog-cat-list">
          {vocabCats.map((c) => {
            const s = getStats("vocab", c.ids);
            const pct = Math.round((s.mastered / (s.total || 1)) * 100);
            return (
              <div key={c.id} className="prog-cat">
                <div className="prog-cat__top">
                  <span className="prog-cat__name">
                    {c.icon} {c.label}
                  </span>
                  <span className="prog-cat__num" style={{ "--c": c.color }}>
                    {s.mastered}/{s.total}
                  </span>
                </div>
                <div className="prog-cat__track">
                  <div
                    className="prog-cat__fill"
                    style={{ width: `${pct}%`, "--c": c.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Kanji breakdown */}
      <div className="prog-block">
        <div className="prog-block__head">
          <h3>🈳 Kanji</h3>
          <span className="prog-block__meta">
            {kanjiStats.mastered}/{kanjiStats.total} đã thuộc
          </span>
        </div>
        <Segments
          mastered={kanjiStats.mastered}
          learning={kanjiStats.learning}
          neu={kanjiStats.new}
        />
        <div className="prog-legend">
          <span><i className="dot dot--mastered" /> Đã thuộc {kanjiStats.mastered}</span>
          <span><i className="dot dot--learning" /> Đang học {kanjiStats.learning}</span>
          <span><i className="dot dot--new" /> Chưa học {kanjiStats.new}</span>
        </div>
      </div>

      {/* Activity chart */}
      <div className="prog-block">
        <div className="prog-block__head">
          <h3>🗓️ Hoạt động 14 ngày qua</h3>
          <span className="prog-block__meta">{total} lượt ôn tổng cộng</span>
        </div>
        <div className="prog-chart">
          {activity.map((a) => (
            <div key={a.date} className="prog-chart__col" title={`${a.date}: ${a.count} lượt`}>
              <div
                className={`prog-chart__bar ${a.count === 0 ? "is-empty" : ""} ${a.offset === 0 ? "is-today" : ""}`}
                style={{ height: `${a.count === 0 ? 3 : 8 + (a.count / maxAct) * 80}%` }}
              />
              <div className="prog-chart__day">{a.date.slice(8)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works + reset */}
      <div className="prog-note">
        <strong>Cách hoạt động:</strong> Khi học flashcard, chấm thẻ
        <span className="tone-forget"> 😟 Quên</span> /
        <span className="tone-vague"> 🤔 Mơ hồ</span> /
        <span className="tone-remember"> 😎 Nhớ</span>. Thẻ trả lời đúng nhiều lần
        sẽ lên cấp (L1→L5) và giãn dần thời gian ôn; đạt <strong>L4</strong> trở lên được
        tính là <em>đã thuộc</em>. Mọi tiến độ lưu ngay trên trình duyệt này.
      </div>
      <button className="prog-reset" onClick={resetAll}>
        🗑 Xoá toàn bộ tiến độ
      </button>
    </div>
  );
}
