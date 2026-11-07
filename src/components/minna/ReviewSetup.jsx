import { useState } from "react";
import { LESSONS, hasLesson, loadLessons, pickExercises } from "../../lib/minna";

const SIZES = [10, 20, 30];

/** Ôn ngẫu nhiên: chọn phạm vi bài + số câu → trộn câu hỏi của các bài đó. */
export default function ReviewSetup({ currentLesson, onStart }) {
  const scopes = [
    { id: "cur", label: `Bài hiện tại (Bài ${currentLesson})`, range: [currentLesson, currentLesson] },
    { id: "5", label: "Bài 1–5", range: [1, 5] },
    { id: "10", label: "Bài 1–10", range: [1, 10] },
    { id: "15", label: "Bài 1–15", range: [1, 15] },
    { id: "25", label: "Bài 1–25", range: [1, 25] },
  ];
  const [scope, setScope] = useState("10");
  const [size, setSize] = useState(20);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const sel = scopes.find((s) => s.id === scope);
  const nums = LESSONS.map((l) => l.lesson).filter(
    (n) => n >= sel.range[0] && n <= sel.range[1] && hasLesson(n),
  );
  const available = LESSONS.filter((l) => nums.includes(l.lesson)).reduce((a, l) => a + l.exCount, 0);

  const start = async () => {
    setBusy(true);
    setErr(null);
    try {
      const data = await loadLessons(nums);
      const gpIndex = Object.fromEntries(data.flatMap((l) => l.grammarPoints.map((g) => [g.id, g])));
      onStart({
        title: sel.id === "cur" ? `Bài ${currentLesson} – Ôn ngẫu nhiên` : `Ôn tổng hợp ${sel.label}`,
        build: () => pickExercises(data, size),
        gpIndex,
        lessonNo: null,
      });
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mn-card mn-review">
      <h3 className="mn-h3">🎲 Ôn tập ngẫu nhiên</h3>
      <p className="mn-p mn-muted">
        Trộn câu hỏi của nhiều bài, đủ mọi dạng bài tập — cách tốt để kiểm tra mình còn nhớ bài cũ không.
      </p>

      <fieldset className="mn-radio">
        <legend className="mn-label">Phạm vi</legend>
        {scopes.map((s) => (
          <label key={s.id} className={`mn-radio__opt ${scope === s.id ? "is-on" : ""}`}>
            <input
              type="radio"
              name="mn-scope"
              value={s.id}
              checked={scope === s.id}
              onChange={() => setScope(s.id)}
            />
            <span>{s.label}</span>
          </label>
        ))}
      </fieldset>

      <div className="mn-row">
        <span className="mn-label">Số câu</span>
        {SIZES.map((n) => (
          <button
            key={n}
            className={`filter-btn ${size === n ? "filter-btn--active" : ""}`}
            onClick={() => setSize(n)}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="mn-review__foot">
        <span className="mn-muted">
          {nums.length} bài có dữ liệu · {available} câu trong ngân hàng
        </span>
        <button className="mn-btn" disabled={busy || !nums.length} onClick={start}>
          {busy ? "Đang tải…" : "Bắt đầu ôn →"}
        </button>
      </div>
      {err && <div className="mn-bad">{err}</div>}
    </div>
  );
}
