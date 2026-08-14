import { useMemo, useRef, useState } from "react";
import vocabData from "../data/vocabulary.json";
import kanjiData from "../data/kanji.json";
import {
  DECKS,
  deckMeta,
  getStats,
  resetDeck,
  getForecast,
  getHardest,
  allDeckStats,
  totalReps,
} from "../lib/srs";
import {
  loadProgress,
  getStreak,
  totalReviews,
  reviewsToday,
  studiedToday,
  recentActivity,
  accuracyTrend,
  accuracyOverall,
} from "../lib/progress";
import { deckPoolStats, describeCard, buildHardSession, kanaPool } from "../lib/session";
import { loadSettings } from "../lib/userdata";
import { loadHistory, mistakeEntries } from "../lib/examStore";
import { noteCount, loadCustomCards } from "../lib/userdata";
import { downloadBackup, importFromFile, wipeAll, OWNED_KEYS } from "../lib/backup";
import StudyRunner from "./common/StudyRunner";
import "../styles/tabs/progress.css";
import "../styles/tabs/progress-extra.css";

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

export default function ProgressTab({ onGoTo }) {
  const [tick, force] = useState(0);
  const [hardSession, setHardSession] = useState(null);
  const [importMsg, setImportMsg] = useState(null);
  const fileRef = useRef(null);

  const settings = loadSettings();
  const p = useMemo(() => loadProgress(), [tick]);
  const streak = getStreak(p);
  const total = totalReviews(p);
  const today = studiedToday(p);
  const doneToday = reviewsToday(p);
  const activity = useMemo(() => recentActivity(14, p), [p]);
  const maxAct = Math.max(1, ...activity.map((a) => a.count));
  const accTrend = useMemo(() => accuracyTrend(14, p), [p]);
  const acc30 = accuracyOverall(30, p);

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

  const vocabStats = useMemo(() => getStats("vocab", allVocabIds), [allVocabIds, tick]);
  const kanjiStats = useMemo(() => getStats("kanji", allKanjiIds), [allKanjiIds, tick]);
  const kanaStats = useMemo(() => getStats("kana", kanaPool().map((c) => c.char)), [tick]);
  const deckStats = useMemo(() => allDeckStats(), [tick]);
  const forecast = useMemo(() => getForecast(7), [tick]);
  const hardest = useMemo(() => getHardest(20, 1), [tick]);
  const history = useMemo(() => loadHistory(), [tick]);
  const mistakes = useMemo(() => mistakeEntries(), [tick]);

  const masteredAll = Object.values(deckStats).reduce((a, s) => a + s.mastered, 0);
  const dueAll = Object.values(deckStats).reduce((a, s) => a + s.due, 0);

  const hardItems = useMemo(
    () => (hardSession ? buildHardSession(hardSession, mistakes) : []),
    [hardSession, mistakes],
  );

  const resetAll = () => {
    if (!window.confirm("Xoá toàn bộ tiến độ học (SRS, streak, bài làm, ghi chú)? Không thể hoàn tác.")) return;
    wipeAll();
    force((n) => n + 1);
  };

  const resetOneDeck = (deck) => {
    const meta = deckMeta(deck);
    if (!window.confirm(`Xoá tiến độ SRS của "${meta.label}"?`)) return;
    resetDeck(deck);
    force((n) => n + 1);
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const mode = window.confirm(
      "Nhấn OK để GỘP với tiến độ hiện tại (giữ tiến độ cao hơn).\nNhấn Cancel để GHI ĐÈ toàn bộ.",
    )
      ? "merge"
      : "replace";
    const res = await importFromFile(file, mode);
    e.target.value = "";
    if (res.ok) {
      setImportMsg(`✅ Đã nhập ${res.keys.length} mục (${mode === "merge" ? "gộp" : "ghi đè"}). Tải lại trang để áp dụng…`);
      setTimeout(() => window.location.reload(), 1200);
    } else {
      setImportMsg(`❌ ${res.error}`);
    }
  };

  if (hardSession) {
    return (
      <StudyRunner
        items={hardItems}
        title="🔥 Ôn thẻ hay quên nhất"
        subtitle="Những thẻ bạn rớt nhiều lần nhất — ôn tập trung vào đây hiệu quả hơn ôn dàn trải"
        color="#ff4757"
        onExit={() => {
          setHardSession(null);
          force((n) => n + 1);
        }}
      />
    );
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">📊 Tiến độ học tập</h2>
        <p className="section-desc">
          Toàn bộ {DECKS.length} phần học, dự báo thẻ tới hạn, điểm yếu cần ôn và sao lưu tiến độ
        </p>
      </div>

      {/* ── Chỉ số chính ── */}
      <div className="prog-stats-grid">
        <StatCard
          icon={today ? "🔥" : "🌱"}
          value={`${streak} ngày`}
          label="Chuỗi học liên tiếp"
          color="#f97316"
          sub={
            today
              ? `Hôm nay ${doneToday}/${settings.dailyGoal} lượt ✓`
              : "Học hôm nay để giữ chuỗi!"
          }
        />
        <StatCard icon="🏆" value={`${p.best || 0} ngày`} label="Chuỗi dài nhất" color="#facc15" />
        <StatCard
          icon="✅"
          value={masteredAll}
          label="Đã thuộc (mọi phần)"
          color="#34d399"
          sub={`${vocabStats.mastered} từ · ${kanjiStats.mastered} kanji · ${kanaStats.mastered} kana`}
        />
        <StatCard
          icon="📅"
          value={dueAll}
          label="Cần ôn hôm nay"
          color="#22d3ee"
          sub={forecast.overdue > 0 ? `${forecast.overdue} thẻ đang quá hạn` : "Không có thẻ quá hạn"}
        />
        <StatCard
          icon="🎯"
          value={acc30.pct != null ? `${acc30.pct}%` : "—"}
          label="Độ chính xác 30 ngày"
          color="#a78bfa"
          sub={acc30.total ? `${acc30.ok} đúng / ${acc30.total} lượt` : "Chưa có dữ liệu"}
        />
        <StatCard
          icon="🔁"
          value={total}
          label="Tổng lượt ôn"
          color="#60a5fa"
          sub={`${totalReps()} lượt được ghi vào SRS`}
        />
      </div>

      {/* ── Mọi deck ── */}
      <div className="prog-block">
        <div className="prog-block__head">
          <h3>🗂 Tất cả phần học</h3>
          <span className="prog-block__meta">
            Mỗi phần có lịch ôn riêng nhưng dùng chung một engine SRS
          </span>
        </div>
        <div className="pgx-decks">
          {DECKS.map((d) => {
            const s = deckStats[d.id];
            const pool = ["vocab", "kanji", "kana"].includes(d.id) ? deckPoolStats(d.id) : null;
            const totalCards = pool ? pool.total : s.seen;
            const pct = totalCards ? Math.round((s.mastered / totalCards) * 100) : 0;
            return (
              <div key={d.id} className="pgx-deck" style={{ "--c": d.color }}>
                <div className="pgx-deck__top">
                  <span className="pgx-deck__name">
                    {d.icon} {d.label}
                  </span>
                  <span className="pgx-deck__pct">{pct}%</span>
                </div>
                <div className="pgx-deck__track">
                  <div className="pgx-deck__fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="pgx-deck__nums">
                  ✅ {s.mastered} · 📚 {s.learning}
                  {totalCards ? ` / ${totalCards}` : ""}
                  {s.due > 0 && <em> · 📅 {s.due} tới hạn</em>}
                </div>
                <div className="pgx-deck__acts">
                  {onGoTo && (
                    <button className="pgx-mini" onClick={() => onGoTo(d.tab)}>
                      Mở →
                    </button>
                  )}
                  {s.seen > 0 && (
                    <button className="pgx-mini pgx-mini--danger" onClick={() => resetOneDeck(d.id)}>
                      Xoá tiến độ
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Dự báo ── */}
      <div className="prog-block">
        <div className="prog-block__head">
          <h3>📅 Dự báo 7 ngày tới</h3>
          <span className="prog-block__meta">
            Nhìn trước để không bị dồn thẻ vào một ngày
          </span>
        </div>
        <div className="pgx-forecast">
          {forecast.buckets.map((b, i) => {
            const max = Math.max(1, ...forecast.buckets.map((x) => x.count));
            return (
              <div key={b.date} className="pgx-fc" title={`${b.date}: ${b.count} thẻ`}>
                <div className="pgx-fc__wrap">
                  <div
                    className={`pgx-fc__bar ${i === 0 ? "is-today" : ""}`}
                    style={{ height: `${b.count === 0 ? 3 : 10 + (b.count / max) * 85}%` }}
                  />
                </div>
                <div className="pgx-fc__n">{b.count}</div>
                <div className="pgx-fc__d">{i === 0 ? "Hôm nay" : b.date.slice(5)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Điểm yếu ── */}
      <div className="prog-block">
        <div className="prog-block__head">
          <h3>🔥 Thẻ hay quên nhất</h3>
          <span className="prog-block__meta">
            {hardest.length > 0
              ? `${hardest.length} thẻ từng rớt — ôn đúng chỗ yếu hiệu quả hơn ôn dàn trải`
              : "Chưa có thẻ nào bị rớt. Tốt!"}
          </span>
        </div>

        {hardest.length > 0 ? (
          <>
            <div className="pgx-hard">
              {hardest.map(({ deck, id, card }) => {
                const info = describeCard(deck, id, mistakes);
                const meta = deckMeta(deck);
                return (
                  <div key={`${deck}:${id}`} className="pgx-hardrow" style={{ "--c": meta.color }}>
                    <span className="pgx-hardrow__deck">{meta.icon}</span>
                    <span className="pgx-hardrow__title">{info?.title || id}</span>
                    <span className="pgx-hardrow__sub">{info?.sub || meta.label}</span>
                    <span className="pgx-hardrow__lapses">✗ {card.lapses}× · L{card.box}</span>
                  </div>
                );
              })}
            </div>
            <button className="pgx-hardbtn" onClick={() => setHardSession(hardest)}>
              🎯 Ôn ngay {hardest.length} thẻ khó nhất
            </button>
          </>
        ) : (
          <div className="prog-note prog-note--plain">
            Khi bạn chấm một thẻ là “😟 Quên”, thẻ đó được đếm vào đây. Danh sách này chính là
            danh sách việc cần làm để lên điểm nhanh nhất.
          </div>
        )}
      </div>

      {/* ── Sổ tay lỗi & lịch sử thi ── */}
      {(mistakes.length > 0 || history.length > 0) && (
        <div className="prog-block">
          <div className="prog-block__head">
            <h3>📕 Bài tập &amp; thi thử</h3>
            <span className="prog-block__meta">
              {mistakes.length} câu trong sổ tay lỗi · {history.length} lần thi thử
            </span>
          </div>
          <div className="pgx-exam">
            <div className="pgx-examstat">
              <div className="pgx-examstat__n">{mistakes.filter((m) => m.due).length}</div>
              <div className="pgx-examstat__l">câu sai tới hạn ôn</div>
            </div>
            <div className="pgx-examstat">
              <div className="pgx-examstat__n">
                {history.length ? Math.max(...history.map((h) => h.score || 0)) : "—"}
              </div>
              <div className="pgx-examstat__l">điểm thi thử cao nhất /180</div>
            </div>
            <div className="pgx-examstat">
              <div className="pgx-examstat__n">{history.filter((h) => h.pass).length}</div>
              <div className="pgx-examstat__l">lần ước tính ĐẠT</div>
            </div>
            {onGoTo && (
              <button className="pgx-hardbtn pgx-hardbtn--inline" onClick={() => onGoTo("exercises")}>
                Mở tab Bài tập →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Từ vựng theo chủ đề ── */}
      <div className="prog-block">
        <div className="prog-block__head">
          <h3>📖 Từ vựng theo chủ đề</h3>
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
                  <div className="prog-cat__fill" style={{ width: `${pct}%`, "--c": c.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Hoạt động & độ chính xác ── */}
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

        <div className="pgx-acc">
          <div className="pgx-acc__label">Độ chính xác từng ngày</div>
          <div className="pgx-acc__row">
            {accTrend.map((a) => (
              <div
                key={a.date}
                className="pgx-acc__cell"
                title={
                  a.pct == null
                    ? `${a.date}: chưa có dữ liệu`
                    : `${a.date}: ${a.pct}% (${a.ok}/${a.ok + a.no})`
                }
              >
                <div
                  className={`pgx-acc__dot ${
                    a.pct == null ? "is-none" : a.pct >= 80 ? "is-good" : a.pct >= 60 ? "is-mid" : "is-bad"
                  }`}
                />
                <span className="pgx-acc__d">{a.date.slice(8)}</span>
              </div>
            ))}
          </div>
          <div className="pgx-acc__legend">
            <span><i className="pgx-acc__dot is-good" /> ≥80%</span>
            <span><i className="pgx-acc__dot is-mid" /> 60–79%</span>
            <span><i className="pgx-acc__dot is-bad" /> &lt;60%</span>
            <span><i className="pgx-acc__dot is-none" /> chưa học</span>
          </div>
        </div>
      </div>

      {/* ── Sao lưu ── */}
      <div className="prog-block pgx-backup">
        <div className="prog-block__head">
          <h3>💾 Sao lưu &amp; chuyển máy</h3>
          <span className="prog-block__meta">
            Tiến độ chỉ nằm trong trình duyệt này — xoá cache là mất hết
          </span>
        </div>
        <div className="pgx-backup__body">
          <div className="pgx-backup__info">
            Một file JSON mang theo toàn bộ: SRS mọi deck, streak, bài làm &amp; lịch sử thi,
            {noteCount() > 0 ? ` ${noteCount()} ghi chú,` : ""}
            {loadCustomCards().length > 0 ? ` ${loadCustomCards().length} thẻ tự tạo,` : ""} cài đặt.
            <div className="pgx-backup__keys">{OWNED_KEYS.length} nhóm dữ liệu được sao lưu</div>
          </div>
          <div className="pgx-backup__btns">
            <button className="pgx-btn pgx-btn--primary" onClick={downloadBackup}>
              ⬇ Xuất file sao lưu
            </button>
            <button className="pgx-btn" onClick={() => fileRef.current?.click()}>
              ⬆ Nhập từ file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={onImportFile}
              hidden
            />
          </div>
        </div>
        {importMsg && <div className="pgx-backup__msg">{importMsg}</div>}
      </div>

      {/* ── Giải thích + xoá ── */}
      <div className="prog-note">
        <strong>Cách hoạt động:</strong> Mọi phần học (từ vựng, kanji, kana, ngữ pháp, số đếm, nghe,
        câu sai trong đề) đều dùng chung một engine SRS. Chấm thẻ
        <span className="tone-forget"> 😟 Quên</span> /
        <span className="tone-vague"> 🤔 Mơ hồ</span> /
        <span className="tone-remember"> 😎 Nhớ</span>; trả lời đúng nhiều lần thì thẻ lên cấp
        (L1→L5) và giãn dần thời gian ôn — đạt <strong>L4</strong> trở lên tính là <em>đã thuộc</em>.
        Câu trắc nghiệm đúng/sai được chấm tự động. Tiến độ lưu ngay trên trình duyệt này.
      </div>
      <button className="prog-reset" onClick={resetAll}>
        🗑 Xoá toàn bộ dữ liệu học
      </button>
    </div>
  );
}
