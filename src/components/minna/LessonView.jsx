import { useEffect, useMemo, useRef, useState } from "react";
import { markViewed, pickExercises, wrongOf, lessonStatus, PASS_PCT, TYPE_LABEL } from "../../lib/minna";
import GrammarPoint from "./GrammarPoint";
import Practice from "./Practice";
import WrongList from "./WrongList";

const SECTIONS = [
  { id: "overview", icon: "🎯", label: "Tổng quan" },
  { id: "grammar", icon: "📘", label: "Ngữ pháp" },
  { id: "quick", icon: "⚡", label: "Ôn nhanh" },
  { id: "practice", icon: "✏️", label: "Luyện tập" },
  { id: "wrong", icon: "🔁", label: "Câu sai" },
];

const PRACTICE_SIZE = 20;

function Overview({ data, meta, st, onGo }) {
  return (
    <div className="mn-ov">
      <div className="mn-card">
        <div className="mn-ov__topic">{data.topic}</div>
        <p className="mn-p">{data.description}</p>
      </div>

      <div className="mn-ov__grid">
        <div className="mn-card">
          <h4 className="mn-blk__title">🎯 Mục tiêu học</h4>
          <ul className="mn-ul mn-ul--check">
            {data.objectives.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </div>
        <div className="mn-card">
          <h4 className="mn-blk__title">📘 Ngữ pháp chính ({data.grammarPoints.length})</h4>
          <ol className="mn-ov__gps">
            {data.grammarPoints.map((g, i) => (
              <li key={g.id}>
                <button className="mn-link" onClick={() => onGo("grammar", i)}>
                  <span lang="ja">{g.title}</span>
                  <span className="mn-muted"> — {g.meaning}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mn-card mn-ov__keys">
        <h4 className="mn-blk__title">📝 Kiến thức cần nhớ</h4>
        <ul className="mn-ul">
          {data.keyPoints.map((k, i) => (
            <li key={i}>{k}</li>
          ))}
        </ul>
      </div>

      <div className="mn-card mn-ov__prog">
        <div>
          <b>Tiến độ bài:</b> đã xem {st.viewed}/{meta.gpCount} mẫu ngữ pháp · điểm cao nhất{" "}
          {st.best == null ? "—" : `${st.best}%`}
          {st.attempts > 0 && ` · ${st.attempts} lượt luyện`}
        </div>
        <div className="mn-muted">
          Hoàn thành bài = xem hết các mẫu ngữ pháp + đạt ≥ {PASS_PCT}% trong một lượt luyện tập.
        </div>
      </div>

      <div className="mn-flow">
        <button className="mn-btn" onClick={() => onGo("grammar", 0)}>
          Bắt đầu học ngữ pháp →
        </button>
      </div>
    </div>
  );
}

function QuickReview({ data, onGo }) {
  return (
    <div>
      <p className="mn-p mn-muted">Xem lại nhanh trước khi làm bài — bấm vào thẻ để mở lại phần giải thích đầy đủ.</p>
      <div className="mn-quick">
        {data.quickReview.map((q, i) => {
          const gi = data.grammarPoints.findIndex((g) => g.title === q.pattern);
          return (
            <button
              key={i}
              className="mn-qcard"
              onClick={() => onGo("grammar", gi >= 0 ? gi : Math.min(i, data.grammarPoints.length - 1))}
            >
              <span className="mn-qcard__p" lang="ja">{q.pattern}</span>
              <span className="mn-qcard__m">→ {q.meaning}</span>
              {q.example && <span className="mn-qcard__ex" lang="ja">{q.example}</span>}
            </button>
          );
        })}
      </div>
      <div className="mn-quick__tips">
        {data.grammarPoints
          .filter((g) => g.memoryTip)
          .map((g) => (
            <div className="mn-quick__tip" key={g.id}>
              <span aria-hidden="true">{g.memoryTip.emoji}</span> {g.memoryTip.hook}
            </div>
          ))}
      </div>
      <div className="mn-flow">
        <button className="mn-btn" onClick={() => onGo("practice")}>
          ✏️ Làm bài tập →
        </button>
      </div>
    </div>
  );
}

function PracticeIntro({ data, st, wrongCount, onStart, onWrong }) {
  const types = [...new Set(data.exercises.map((e) => e.type))];
  const n = Math.min(PRACTICE_SIZE, data.exercises.length);
  return (
    <div className="mn-card mn-pintro">
      <h3 className="mn-h3">✏️ Bài {data.lesson} – Luyện tập</h3>
      <p className="mn-p">
        {n} câu ngẫu nhiên từ ngân hàng {data.exercises.length} câu, phủ đủ {data.grammarPoints.length} mẫu ngữ pháp
        của bài. Mỗi câu đều có giải thích đáp án.
      </p>
      <div className="mn-pintro__types">
        {types.map((t) => (
          <span className="mn-tag" key={t}>{TYPE_LABEL[t]}</span>
        ))}
      </div>
      <div className="mn-pintro__stats">
        <span>Điểm cao nhất: <b>{st.best == null ? "—" : `${st.best}%`}</b></span>
        <span>Lần gần nhất: <b>{st.attempts ? `${st.last ?? "—"}%` : "—"}</b></span>
        <span>Đúng/Sai: <b className="mn-good">{st.correct}</b> / <b className="mn-bad">{st.wrong}</b></span>
      </div>
      <div className="mn-flow">
        <button className="mn-btn" onClick={() => onStart()}>Bắt đầu luyện tập →</button>
        {wrongCount > 0 && (
          <button className="mn-btn mn-btn--alt" onClick={onWrong}>🔁 Ôn {wrongCount} câu sai</button>
        )}
      </div>
    </div>
  );
}

/** Một bài Minna: Tổng quan → Ngữ pháp → Ôn nhanh → Luyện tập → Câu sai. */
export default function LessonView({ data, meta, store, prefs }) {
  const [section, setSection] = useState("overview");
  const [gpIdx, setGpIdx] = useState(0);
  const [run, setRun] = useState(null); // { title, build, lessonNo }
  const gpNavRef = useRef(null);

  const gpIndex = useMemo(
    () => Object.fromEntries(data.grammarPoints.map((g) => [g.id, g])),
    [data],
  );
  const st = lessonStatus(store, meta);
  const viewed = store.lessons[data.lesson]?.viewed || [];
  const wrong = wrongOf(store, data.lesson);
  const gp = data.grammarPoints[gpIdx] || data.grammarPoints[0];

  // Đang mở phần Ngữ pháp = đã xem grammar point đó.
  useEffect(() => {
    if (section === "grammar" && gp) markViewed(data.lesson, gp.id);
  }, [section, gp, data.lesson]);

  // Điện thoại: dải chip cuộn ngang — kéo chip đang chọn vào tầm nhìn (chỉ cuộn
  // trong dải, không kéo cả trang).
  useEffect(() => {
    const box = gpNavRef.current;
    const el = box?.querySelector(".is-on");
    if (box && el && box.scrollWidth > box.clientWidth) {
      box.scrollLeft = el.offsetLeft - box.offsetLeft - 16;
    }
  }, [gpIdx, section]);

  const go = (sec, i) => {
    setSection(sec);
    if (typeof i === "number") setGpIdx(i);
    if (sec !== "practice") setRun(null);
  };

  const startLesson = (onlyGp) => {
    const pool = onlyGp ? { ...data, exercises: data.exercises.filter((e) => e.grammarPoint === onlyGp.id) } : data;
    setRun({
      id: Date.now(),
      title: onlyGp ? `Bài ${data.lesson} – ${onlyGp.title}` : `Bài ${data.lesson} – Luyện tập`,
      build: () => pickExercises([pool], onlyGp ? 0 : PRACTICE_SIZE),
      // Chỉ lượt luyện CẢ BÀI mới tính điểm hoàn thành bài.
      lessonNo: onlyGp ? null : data.lesson,
    });
    setSection("practice");
  };

  const startWrong = (list) => {
    setRun({ id: Date.now(), title: `Bài ${data.lesson} – Ôn câu sai`, build: () => pickExercises([{ exercises: list }], 0), lessonNo: null });
    setSection("practice");
  };

  const wrongExercises = () => {
    const ids = new Set(wrong.map((w) => w.id));
    return data.exercises.filter((e) => ids.has(e.id));
  };

  return (
    <div className="mn-lesson">
      <div className="mn-lesson__head">
        <div>
          <div className="mn-lesson__kicker">Bài {data.lesson}</div>
          <h3 className="mn-lesson__title">
            {data.title} <span className="mn-lesson__jp" lang="ja">{data.titleJp}</span>
          </h3>
        </div>
        <span className={`mn-status is-${st.status}`}>
          {st.status === "done" ? "✓ Đã hoàn thành" : st.status === "learning" ? `Đang học · ${st.pct}%` : "Chưa học"}
        </span>
      </div>

      <nav className="mn-secnav" aria-label="Phần của bài">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            className={`mn-secbtn ${section === s.id ? "is-on" : ""}`}
            aria-current={section === s.id ? "true" : undefined}
            onClick={() => go(s.id)}
          >
            <span aria-hidden="true">{s.icon}</span> {s.label}
            {s.id === "wrong" && wrong.length > 0 && <span className="mn-count">{wrong.length}</span>}
          </button>
        ))}
      </nav>

      {section === "overview" && <Overview data={data} meta={meta} st={st} onGo={go} />}

      {section === "grammar" && gp && (
        <div>
          <div className="mn-gpnav" ref={gpNavRef} role="tablist" aria-label="Mẫu ngữ pháp">
            {data.grammarPoints.map((g, i) => (
              <button
                key={g.id}
                role="tab"
                aria-selected={i === gpIdx}
                className={`mn-gpchip ${i === gpIdx ? "is-on" : ""} ${viewed.includes(g.id) ? "is-seen" : ""}`}
                onClick={() => setGpIdx(i)}
                lang="ja"
              >
                {viewed.includes(g.id) && <span className="mn-gpchip__ok" aria-label="đã xem">✓</span>}
                {g.title}
              </button>
            ))}
          </div>
          <GrammarPoint
            key={gp.id}
            gp={gp}
            index={gpIdx}
            total={data.grammarPoints.length}
            prefs={prefs}
            exCount={data.exercises.filter((e) => e.grammarPoint === gp.id).length}
            onPractice={() => startLesson(gp)}
          />
          <div className="mn-flow mn-flow--split">
            <button className="mn-btn mn-btn--ghost" disabled={gpIdx === 0} onClick={() => setGpIdx(gpIdx - 1)}>
              ← Mẫu trước
            </button>
            {gpIdx < data.grammarPoints.length - 1 ? (
              <button className="mn-btn" onClick={() => setGpIdx(gpIdx + 1)}>
                Mẫu tiếp →
              </button>
            ) : (
              <button className="mn-btn" onClick={() => go("quick")}>
                ⚡ Ôn nhanh →
              </button>
            )}
          </div>
        </div>
      )}

      {section === "quick" && <QuickReview data={data} onGo={go} />}

      {section === "practice" &&
        (run ? (
          <Practice
            key={run.id}
            build={run.build}
            title={run.title}
            lessonNo={run.lessonNo}
            gpIndex={gpIndex}
            prefs={prefs}
            onExit={() => setRun(null)}
          />
        ) : (
          <PracticeIntro
            data={data}
            st={st}
            wrongCount={wrong.length}
            onStart={() => startLesson(null)}
            onWrong={() => startWrong(wrongExercises())}
          />
        ))}

      {section === "wrong" && <WrongList entries={wrong} prefs={prefs} onPractice={startWrong} />}
    </div>
  );
}
