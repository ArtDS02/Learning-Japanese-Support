import { useState, useMemo, useEffect } from "react";
import { todayOverview, buildTodaySession } from "../lib/session";
import { DECKS, deckMeta, getForecast, allDeckStats } from "../lib/srs";
import {
  loadProgress,
  getStreak,
  studiedToday,
  reviewsToday,
  totalReviews,
  accuracyOverall,
  recentActivity,
} from "../lib/progress";
import { loadSettings, saveSettings } from "../lib/userdata";
import { nextLesson, lessonsOverview } from "../lib/lessons";
import StudyRunner from "./common/StudyRunner";
import "../styles/tabs/home.css";
// Ô cài đặt ở đây dùng .qh__chip của quiz.css. Tab này không render QuizHub nên
// phải tự import, nếu không mở thẳng trang chủ là các nút hiện ra không style.
import "../styles/common/quiz.css";

const DECK_TAB = Object.fromEntries(DECKS.map((d) => [d.id, d.tab]));

/**
 * Trang chủ "Học hôm nay".
 * Trước đây mở app là rơi vào tab cũ với 580 từ trước mặt và tự quyết định học gì.
 * Ở đây có đúng một việc cần làm: bấm bắt đầu, phiên trộn mọi deck theo lịch SRS.
 */
export default function HomeTab({ onGoTo }) {
  const [session, setSession] = useState(null);
  const [tick, setTick] = useState(0);
  const [settings, setSettings] = useState(() => loadSettings());
  const [showSettings, setShowSettings] = useState(false);

  // Dữ liệu 6 bộ đề nặng ~186KB; nạp SAU khi màn hình đầu đã vẽ để mở app nhanh.
  const [exam, setExam] = useState({ open: [], mistakes: [] });
  useEffect(() => {
    let alive = true;
    import("../lib/examStore").then((m) => {
      if (!alive) return;
      setExam({ open: m.inProgressExams(), mistakes: m.mistakeEntries() });
    });
    return () => {
      alive = false;
    };
  }, [tick]);
  const openExams = exam.open;
  const mistakes = exam.mistakes;

  const overview = useMemo(
    () => todayOverview({ mistakes: exam.mistakes }),
    [tick, settings.newPerDay, exam.mistakes],
  );
  const progress = useMemo(() => loadProgress(), [tick]);
  const streak = getStreak(progress);
  const today = studiedToday(progress);
  const doneToday = reviewsToday(progress);
  const goal = settings.dailyGoal || 30;
  const goalPct = Math.min(100, Math.round((doneToday / goal) * 100));
  const acc = accuracyOverall(30, progress);
  const forecast = useMemo(() => getForecast(7), [tick]);
  const deckStats = useMemo(() => allDeckStats(), [tick]);
  const activity = useMemo(() => recentActivity(7, progress), [progress]);
  const lesson = useMemo(() => nextLesson(), [tick]);
  const lessonsInfo = useMemo(() => lessonsOverview(), [tick]);

  const items = useMemo(() => (session ? session : []), [session]);

  const start = (opts) => {
    const queue = buildTodaySession({ ...opts, mistakes: exam.mistakes });
    if (queue.length) setSession(queue);
  };

  // Nhắc học: chỉ chạy được khi trang đang mở (không có push server).
  useEffect(() => {
    if (!settings.reminderOn || typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    const check = () => {
      const [h, m] = String(settings.reminderTime || "20:00").split(":").map(Number);
      const now = new Date();
      if (now.getHours() === h && now.getMinutes() === m && !studiedToday()) {
        new Notification("JLPT N5 — đến giờ học rồi!", {
          body: `Hôm nay bạn còn ${overview.total} thẻ cần ôn. Giữ chuỗi ${streak} ngày nhé!`,
        });
      }
    };
    const t = setInterval(check, 60000);
    return () => clearInterval(t);
  }, [settings.reminderOn, settings.reminderTime, overview.total, streak]);

  if (session) {
    return (
      <StudyRunner
        items={items}
        title="🔥 Phiên học hôm nay"
        subtitle="Trộn từ vựng · kanji · kana · câu sai theo lịch ôn"
        color="#f97316"
        onExit={() => {
          setSession(null);
          setTick((t) => t + 1);
        }}
      />
    );
  }

  return (
    <div className="hm">
      {/* ── Khối chính: hôm nay học gì ── */}
      <div className="hm-hero">
        <div className="hm-hero__left">
          <div className="hm-hero__label">HÔM NAY</div>
          <div className="hm-hero__big">
            {overview.total > 0 ? (
              <>
                {overview.total}
                <span> thẻ</span>
              </>
            ) : (
              <>
                🎉<span> xong hết</span>
              </>
            )}
          </div>
          <div className="hm-hero__meta">
            {overview.total > 0 ? (
              <>
                📅 {overview.due} tới hạn ôn · 🆕 {overview.new} thẻ mới · ⏱ ~{overview.minutes} phút
              </>
            ) : (
              <>Không còn thẻ nào tới hạn. Học thêm thẻ mới hoặc luyện đề nhé!</>
            )}
          </div>

          <div className="hm-hero__actions">
            <button
              className="hm-start"
              onClick={() => start({})}
              disabled={overview.total === 0}
            >
              ▶ Bắt đầu học
            </button>
            {overview.due > 0 && (
              <button className="hm-start hm-start--ghost" onClick={() => start({ includeNew: false })}>
                Chỉ ôn {overview.due} thẻ tới hạn
              </button>
            )}
          </div>

          {/* Phân bổ theo deck */}
          <div className="hm-breakdown">
            {Object.entries(overview.breakdown).map(([deck, b]) => {
              const meta = deckMeta(deck);
              if (!b.due && !b.new) return null;
              return (
                <button
                  key={deck}
                  className="hm-chip"
                  style={{ "--c": meta.color }}
                  onClick={() => start({ decks: [deck] })}
                  title={`Chỉ học ${meta.label}`}
                >
                  {meta.icon} {meta.label}
                  <span className="hm-chip__n">
                    {/* 🆕 = số thẻ chưa học CÒN LẠI của phần đó. Mỗi phiên chỉ
                        lấy tối đa `newPerDay` thẻ mới cho toàn bộ phiên. */}
                    {b.due > 0 && `📅${b.due}`}
                    {b.due > 0 && b.new > 0 && " "}
                    {b.new > 0 && `🆕${b.new}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Vòng tiến độ mục tiêu ngày */}
        <div className="hm-hero__right">
          <div className="hm-ring" style={{ "--pct": goalPct }}>
            <div className="hm-ring__inner">
              <div className="hm-ring__n">{doneToday}</div>
              <div className="hm-ring__of">/ {goal}</div>
            </div>
          </div>
          <div className="hm-goal">
            <div className={`hm-streak ${today ? "is-on" : ""}`}>
              {today ? "🔥" : "🌱"} {streak} ngày liên tiếp
            </div>
            <div className="hm-goal__meta">
              {goalPct >= 100
                ? "✅ Đã đạt mục tiêu hôm nay!"
                : `Còn ${Math.max(0, goal - doneToday)} lượt nữa là đạt mục tiêu`}
            </div>
            <button className="hm-goal__btn" onClick={() => setShowSettings((v) => !v)}>
              ⚙️ Mục tiêu &amp; nhắc học
            </button>
          </div>
        </div>
      </div>

      {showSettings && (
        <GoalSettings
          settings={settings}
          onChange={(patch) => setSettings(saveSettings(patch))}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* ── Học tiếp từ đâu ── */}
      <div className="hm-grid">
        {mistakes.filter((m) => m.due).length > 0 && (
          <div className="hm-card hm-card--alert">
            <div className="hm-card__icon">📕</div>
            <div className="hm-card__title">
              {mistakes.filter((m) => m.due).length} câu sai cần ôn lại
            </div>
            <div className="hm-card__sub">
              Sổ tay lỗi đang giữ {mistakes.length} câu từ các bộ đề bạn đã làm.
            </div>
            <button className="hm-card__btn" onClick={() => onGoTo("exercises")}>
              Mở Sổ tay lỗi →
            </button>
          </div>
        )}

        {openExams.map((e) => (
          <div key={e.examId} className="hm-card">
            <div className="hm-card__icon">✏️</div>
            <div className="hm-card__title">Đề {e.examId} đang làm dở</div>
            <div className="hm-card__sub">
              Đã làm {e.answered}/{e.total} câu · {e.mode === "test" ? "chế độ thi thử" : "chế độ luyện tập"}
            </div>
            <button className="hm-card__btn" onClick={() => onGoTo("exercises")}>
              Tiếp tục làm →
            </button>
          </div>
        ))}

        {lesson && (
          <div className="hm-card">
            <div className="hm-card__icon">📚</div>
            <div className="hm-card__title">
              Bài {lesson.lesson.index} · {lesson.lesson.categoryLabel}
            </div>
            <div className="hm-card__sub">
              {lesson.prog.mastered}/{lesson.prog.total} từ đã thuộc · toàn bộ chương trình{" "}
              {lessonsInfo.done}/{lessonsInfo.total} bài xong
            </div>
            <button className="hm-card__btn" onClick={() => onGoTo("vocabulary")}>
              Mở bài học →
            </button>
          </div>
        )}

        <div className="hm-card">
          <div className="hm-card__icon">🎧</div>
          <div className="hm-card__title">Luyện nghe</div>
          <div className="hm-card__sub">
            Phần 聴解 chiếm ~1/3 điểm N5 · nghe từ, nghe câu, chép chính tả
          </div>
          <button className="hm-card__btn" onClick={() => onGoTo("listening")}>
            Vào luyện nghe →
          </button>
        </div>
      </div>

      {/* ── Dự báo 7 ngày ── */}
      <div className="hm-panel">
        <div className="hm-panel__head">
          <h3>📅 Dự báo 7 ngày tới</h3>
          <span className="hm-panel__meta">
            {forecast.overdue > 0
              ? `${forecast.overdue} thẻ đang quá hạn`
              : "Không có thẻ quá hạn"}
          </span>
        </div>
        <div className="hm-forecast">
          {forecast.buckets.map((b, i) => {
            const max = Math.max(1, ...forecast.buckets.map((x) => x.count));
            return (
              <div key={b.date} className="hm-fc" title={`${b.date}: ${b.count} thẻ`}>
                <div className="hm-fc__barwrap">
                  <div
                    className={`hm-fc__bar ${i === 0 ? "is-today" : ""}`}
                    style={{ height: `${b.count === 0 ? 3 : 10 + (b.count / max) * 85}%` }}
                  />
                </div>
                <div className="hm-fc__n">{b.count}</div>
                <div className="hm-fc__d">{i === 0 ? "Nay" : b.date.slice(8)}</div>
              </div>
            );
          })}
        </div>
        <div className="hm-panel__note">
          Nhìn trước để không bị dồn thẻ: ngày nào cột cao thì hôm nay ôn thêm một ít.
        </div>
      </div>

      {/* ── Tổng quan mọi deck ── */}
      <div className="hm-panel">
        <div className="hm-panel__head">
          <h3>🗂 Tình hình các phần</h3>
          <span className="hm-panel__meta">
            {totalReviews(progress)} lượt ôn tổng cộng
            {acc.pct != null && ` · độ chính xác 30 ngày ${acc.pct}%`}
          </span>
        </div>
        <div className="hm-decks">
          {DECKS.map((d) => {
            const s = deckStats[d.id];
            if (!s || s.seen === 0) return null;
            return (
              <button
                key={d.id}
                className="hm-deck"
                style={{ "--c": d.color }}
                onClick={() => onGoTo(DECK_TAB[d.id])}
              >
                <span className="hm-deck__icon">{d.icon}</span>
                <span className="hm-deck__name">{d.label}</span>
                <span className="hm-deck__nums">
                  ✅ {s.mastered} · 📚 {s.learning}
                  {s.due > 0 && <em> · 📅 {s.due}</em>}
                </span>
              </button>
            );
          })}
        </div>
        {Object.values(deckStats).every((s) => s.seen === 0) && (
          <div className="hm-panel__note">
            Chưa có dữ liệu học. Bấm <strong>Bắt đầu học</strong> ở trên để mở phiên đầu tiên.
          </div>
        )}
      </div>

      {/* ── 7 ngày qua ── */}
      <div className="hm-panel">
        <div className="hm-panel__head">
          <h3>🗓️ 7 ngày qua</h3>
        </div>
        <div className="hm-week">
          {activity.map((a) => {
            const max = Math.max(1, ...activity.map((x) => x.count));
            return (
              <div key={a.date} className="hm-day" title={`${a.date}: ${a.count} lượt`}>
                <div className="hm-day__barwrap">
                  <div
                    className={`hm-day__bar ${a.count === 0 ? "is-empty" : ""} ${a.offset === 0 ? "is-today" : ""}`}
                    style={{ height: `${a.count === 0 ? 4 : 12 + (a.count / max) * 85}%` }}
                  />
                </div>
                <div className="hm-day__d">{a.date.slice(8)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Cài đặt mục tiêu & nhắc học ─────────────────────────────────────────── */

function GoalSettings({ settings, onChange, onClose }) {
  const [notifState, setNotifState] = useState(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );

  const askNotif = async () => {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setNotifState(p);
    if (p === "granted") onChange({ reminderOn: true });
  };

  return (
    <div className="hm-settings">
      <div className="hm-settings__head">
        <span>⚙️ Mục tiêu &amp; nhắc học</span>
        <button className="hm-settings__close" onClick={onClose}>✕</button>
      </div>

      <div className="hm-settings__row">
        <label htmlFor="goal">Mục tiêu mỗi ngày (số lượt ôn)</label>
        <div className="hm-settings__chips">
          {[10, 20, 30, 50, 100].map((n) => (
            <button
              key={n}
              className={`qh__chip ${settings.dailyGoal === n ? "is-on" : ""}`}
              onClick={() => onChange({ dailyGoal: n })}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="hm-settings__row">
        <label>Số thẻ mới mỗi ngày</label>
        <div className="hm-settings__chips">
          {[5, 10, 15, 20, 30].map((n) => (
            <button
              key={n}
              className={`qh__chip ${settings.newPerDay === n ? "is-on" : ""}`}
              onClick={() => onChange({ newPerDay: n })}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="hm-settings__hint">
          Thêm nhiều thẻ mới hôm nay = nhiều thẻ phải ôn trong những ngày tới. 10–15 là nhịp bền.
        </div>
      </div>

      <div className="hm-settings__row">
        <label>Hiện furigana mặc định</label>
        <div className="hm-settings__chips">
          <button
            className={`qh__chip ${settings.showFurigana ? "is-on" : ""}`}
            onClick={() => onChange({ showFurigana: true })}
          >
            Bật
          </button>
          <button
            className={`qh__chip ${!settings.showFurigana ? "is-on" : ""}`}
            onClick={() => onChange({ showFurigana: false })}
          >
            Tắt
          </button>
        </div>
        <div className="hm-settings__hint">
          Chỉ hiện cách đọc có thật trong dữ liệu — không tự suy đoán, nên không bao giờ hiện sai.
        </div>
      </div>

      <div className="hm-settings__row">
        <label>Nhắc học hằng ngày</label>
        {notifState === "unsupported" ? (
          <div className="hm-settings__hint">Trình duyệt này không hỗ trợ thông báo.</div>
        ) : notifState !== "granted" ? (
          <button className="hm-goal__btn" onClick={askNotif}>
            🔔 Cho phép thông báo
          </button>
        ) : (
          <>
            <div className="hm-settings__chips">
              <button
                className={`qh__chip ${settings.reminderOn ? "is-on" : ""}`}
                onClick={() => onChange({ reminderOn: !settings.reminderOn })}
              >
                {settings.reminderOn ? "Đang bật" : "Đang tắt"}
              </button>
              <input
                type="time"
                className="hm-settings__time"
                value={settings.reminderTime}
                onChange={(e) => onChange({ reminderTime: e.target.value })}
              />
            </div>
            <div className="hm-settings__hint">
              Lưu ý thật: nhắc học chỉ chạy khi trang web đang mở (app không có server đẩy thông báo).
              Muốn chắc chắn hơn thì cài app ra màn hình chính và mở mỗi ngày.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
