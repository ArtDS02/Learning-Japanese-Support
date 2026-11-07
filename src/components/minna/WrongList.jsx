import { useEffect, useMemo, useState } from "react";
import { TYPE_LABEL, clearWrong, correctText, loadLessons, cachedLesson } from "../../lib/minna";
import { MemoryTip } from "./GrammarPoint";

/**
 * Sổ câu sai: câu hỏi · đáp án của người học · đáp án đúng · giải thích ·
 * grammar point liên quan · mẹo nhớ. `entries` lấy từ wrongOf(store, n).
 */
export default function WrongList({ entries, prefs, onPractice, showLesson = false }) {
  const lessonNums = useMemo(() => [...new Set(entries.map((e) => e.lesson))].sort((a, b) => a - b), [entries]);
  const [ready, setReady] = useState(() => lessonNums.every((n) => cachedLesson(n)));
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    loadLessons(lessonNums)
      .then(() => alive && setReady(true))
      .catch((e) => alive && setError(String(e.message || e)));
    return () => {
      alive = false;
    };
  }, [lessonNums]);

  const rows = useMemo(() => {
    if (!ready) return [];
    return entries
      .map((w) => {
        const l = cachedLesson(w.lesson);
        const ex = l?.exercises.find((x) => x.id === w.id);
        const gp = l?.grammarPoints.find((g) => g.id === (ex?.grammarPoint || w.gp));
        return ex ? { ...w, ex, gp } : null;
      })
      .filter(Boolean);
  }, [entries, ready]);

  if (!entries.length) {
    return (
      <div className="mn-card mn-empty">
        <div className="mn-empty__icon">🎉</div>
        <p>Không có câu sai nào cần ôn. Câu nào bạn trả lời sai khi luyện tập sẽ được lưu ở đây.</p>
      </div>
    );
  }
  if (error) return <div className="mn-card mn-empty">Không tải được dữ liệu: {error}</div>;
  if (!ready) return <div className="tab-loading">Đang tải…</div>;

  return (
    <div className="mn-wrong">
      <div className="mn-wrong__head">
        <div>
          <b>{rows.length}</b> câu cần ôn · trả lời đúng khi luyện lại thì câu sẽ tự rời khỏi sổ
        </div>
        <button className="mn-btn" onClick={() => onPractice(rows.map((r) => r.ex))}>
          🔁 Luyện lại tất cả
        </button>
      </div>

      {rows.map((r) => (
        <div className="mn-card mn-wcard" key={r.id}>
          <div className="mn-wcard__tags">
            {showLesson && <span className="mn-tag">Bài {r.lesson}</span>}
            <span className="mn-tag">{TYPE_LABEL[r.ex.type]}</span>
            {r.count > 1 && <span className="mn-tag mn-tag--bad">Sai {r.count} lần</span>}
            <button
              className="mn-wcard__rm"
              onClick={() => clearWrong([r.id])}
              title="Bỏ câu này khỏi sổ câu sai"
              aria-label="Bỏ khỏi sổ câu sai"
            >
              ✕
            </button>
          </div>
          <div className="mn-wcard__q">{r.ex.question}</div>
          {r.ex.jp && <div className="mn-wcard__jp" lang="ja">{r.ex.jp}</div>}
          {r.ex.type === "vi-jp" && r.ex.vi && <div className="mn-vi">🇻🇳 {r.ex.vi}</div>}
          <div className="mn-wcard__ans">
            <div className="mn-bad">
              Bạn trả lời: <b lang="ja">{r.user || "(bỏ qua)"}</b>
            </div>
            <div className="mn-good">
              Đáp án đúng: <b lang="ja">{correctText(r.ex)}</b>
            </div>
          </div>
          <p className="mn-wcard__exp">{r.ex.explanation}</p>
          {prefs.romaji && r.ex.romaji && <div className="mn-ro">{r.ex.romaji}</div>}
          {r.gp && (
            <div className="mn-wcard__gp">
              Ngữ pháp liên quan: <b lang="ja">{r.gp.title}</b> — {r.gp.meaning}
            </div>
          )}
          {r.gp && <MemoryTip gp={r.gp} compact />}
        </div>
      ))}
    </div>
  );
}
