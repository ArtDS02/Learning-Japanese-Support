import { useEffect, useRef, useState } from "react";
import {
  LESSONS,
  hasLesson,
  loadLesson,
  cachedLesson,
  lessonStatus,
  overview,
  setPref,
  useMinnaStore,
  wrongOf,
  pickExercises,
  loadLessons,
  lessonOfId,
} from "../lib/minna";
import LessonView from "./minna/LessonView";
import TabLoader from "./common/TabLoader";
import ReviewSetup from "./minna/ReviewSetup";
import Practice from "./minna/Practice";
import WrongList from "./minna/WrongList";
import "../styles/tabs/minna.css";

const STATUS_TEXT = { new: "Chưa học", learning: "Đang học", done: "Đã hoàn thành" };

/** Danh sách Bài 1–25: cột trái trên PC, dải cuộn ngang trên điện thoại. */
function LessonList({ store, active, mode, onPick }) {
  const listRef = useRef(null);
  useEffect(() => {
    const el = listRef.current?.querySelector(".is-active");
    // Chỉ cuộn TRONG dải bài học (không kéo cả trang theo).
    if (el && listRef.current) {
      const box = listRef.current;
      if (box.scrollWidth > box.clientWidth) {
        box.scrollLeft = el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2;
      }
    }
  }, [active]);

  return (
    <ol className="mn-list" ref={listRef} aria-label="Danh sách bài">
      {LESSONS.map((m) => {
        const st = lessonStatus(store, m);
        const ready = hasLesson(m.lesson);
        const on = mode === "lesson" && active === m.lesson;
        return (
          <li key={m.lesson}>
            <button
              className={`mn-li is-${st.status} ${on ? "is-active" : ""}`}
              onClick={() => onPick(m.lesson)}
              disabled={!ready}
              aria-current={on ? "true" : undefined}
              title={`Bài ${m.lesson}: ${m.title} — ${STATUS_TEXT[st.status]}`}
            >
              <span className="mn-li__n">{st.status === "done" ? "✓" : m.lesson}</span>
              <span className="mn-li__body">
                <span className="mn-li__t">Bài {m.lesson}</span>
                <span className="mn-li__s">{ready ? m.title : "Đang soạn"}</span>
              </span>
              <span className="mn-li__p">
                {st.status === "new" ? "—" : `${st.pct}%`}
              </span>
              <span className="mn-li__bar" style={{ width: `${st.pct}%` }} aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function GlobalWrong({ store, prefs, onPractice }) {
  const entries = wrongOf(store);
  return (
    <div>
      <h3 className="mn-h3">🔁 Tất cả câu sai cần ôn</h3>
      <WrongList entries={entries} prefs={prefs} onPractice={onPractice} showLesson />
    </div>
  );
}

export default function MinnaTab() {
  const store = useMinnaStore();
  const prefs = store.prefs;
  const [lessonNo, setLessonNo] = useState(() => {
    const n = Number(prefs.lastLesson);
    return n && hasLesson(n) ? n : 1;
  });
  const [mode, setMode] = useState("lesson"); // lesson | review | wrong
  const [data, setData] = useState(() => cachedLesson(lessonNo));
  const [error, setError] = useState(null);
  const [run, setRun] = useState(null); // lượt ôn tổng hợp / ôn câu sai toàn module
  const mainRef = useRef(null);

  useEffect(() => {
    let alive = true;
    loadLesson(lessonNo)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError(null);
      })
      .catch((e) => alive && setError(String(e.message || e)));
    return () => {
      alive = false;
    };
  }, [lessonNo]);

  const scrollToMain = () => {
    // Trên điện thoại danh sách bài nằm trên — đổi bài thì đưa nội dung vào tầm nhìn.
    const el = mainRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const pick = (n) => {
    setMode("lesson");
    setRun(null);
    if (n !== lessonNo) {
      setData(cachedLesson(n));
      setLessonNo(n);
      setPref("lastLesson", n);
    }
    scrollToMain();
  };

  const ov = overview(store);
  const meta = LESSONS.find((l) => l.lesson === lessonNo);

  const startGlobalWrong = async (list) => {
    const nums = [...new Set(list.map((e) => lessonOfId(e.id)))];
    const ls = await loadLessons(nums);
    const gpIndex = Object.fromEntries(ls.flatMap((l) => l.grammarPoints.map((g) => [g.id, g])));
    setRun({ id: Date.now(), title: "Ôn câu sai – tất cả bài", build: () => pickExercises([{ exercises: list }], 0), gpIndex, lessonNo: null });
  };

  const body = () => {
    if (run) {
      return (
        <Practice
          key={run.id}
          build={run.build}
          title={run.title}
          lessonNo={run.lessonNo}
          gpIndex={run.gpIndex}
          prefs={prefs}
          onExit={() => setRun(null)}
        />
      );
    }
    if (mode === "review") {
      return <ReviewSetup currentLesson={lessonNo} onStart={(cfg) => setRun({ id: Date.now(), ...cfg })} />;
    }
    if (mode === "wrong") return <GlobalWrong store={store} prefs={prefs} onPractice={startGlobalWrong} />;
    if (error) return <div className="mn-card mn-empty">Không tải được bài {lessonNo}: {error}</div>;
    if (!data || data.lesson !== lessonNo) return <TabLoader label={`bài ${lessonNo}`} />;
    return <LessonView key={lessonNo} data={data} meta={meta} store={store} prefs={prefs} />;
  };

  return (
    <div className="mn">
      <div className="section-header">
        <h2 className="section-title">🎌 Minna no Nihongo 1</h2>
        <p className="section-desc">
          Ngữ pháp Bài 1–25 · đọc là hiểu → nhìn mẹo là nhớ → xem ví dụ là biết dùng → làm bài là thuộc
        </p>
      </div>

      <div className="mn-layout">
        <aside className="mn-side">
          <div className="mn-side__sum">
            <div className="mn-side__big">
              <b>{ov.done}</b>/{ov.total} <span>bài hoàn thành</span>
            </div>
            <div className="mn-side__mini">
              <span>{ov.learning} đang học</span>
              <span>Chính xác {ov.accuracy == null ? "—" : `${ov.accuracy}%`}</span>
            </div>
          </div>

          <div className="mn-side__modes">
            <button
              className={`mn-mode ${mode === "review" ? "is-on" : ""}`}
              onClick={() => {
                setRun(null);
                setMode("review");
                scrollToMain();
              }}
            >
              🎲 Ôn ngẫu nhiên
            </button>
            <button
              className={`mn-mode ${mode === "wrong" ? "is-on" : ""}`}
              onClick={() => {
                setRun(null);
                setMode("wrong");
                scrollToMain();
              }}
            >
              🔁 Câu sai {ov.toReview > 0 && <span className="mn-count">{ov.toReview}</span>}
            </button>
          </div>

          <LessonList store={store} active={lessonNo} mode={mode} onPick={pick} />
        </aside>

        <div className="mn-main" ref={mainRef}>
          <div className="mn-toolbar">
            <label className="mn-switch">
              <input
                type="checkbox"
                checked={!!prefs.romaji}
                onChange={(e) => setPref("romaji", e.target.checked)}
              />
              <span className="mn-switch__ui" aria-hidden="true" />
              Romaji
            </label>
            <label className="mn-switch">
              <input
                type="checkbox"
                checked={!!prefs.furigana}
                onChange={(e) => setPref("furigana", e.target.checked)}
              />
              <span className="mn-switch__ui" aria-hidden="true" />
              Furigana
            </label>
          </div>
          {body()}
        </div>
      </div>
    </div>
  );
}
