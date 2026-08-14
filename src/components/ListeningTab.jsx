import { useState, useMemo, useEffect } from "react";
import vocabData from "../data/vocabulary.json";
import { getStats } from "../lib/srs";
import { quizSetsFor, buildQuiz } from "../lib/quizgen";
import {
  ttsSupported,
  hasJaVoice,
  jaVoiceName,
  onVoicesReady,
  loadTtsCfg,
  saveTtsCfg,
} from "../lib/tts";
import { examSets, getQuestions } from "../lib/examStore";
import QuizHub from "./common/QuizHub";
import SpeakButton from "./common/SpeakButton";
import Ruby from "./common/Ruby";
import "../styles/tabs/listening.css";

const RATES = [
  { v: 0.6, label: "0.6× rất chậm" },
  { v: 0.75, label: "0.75× chậm" },
  { v: 0.9, label: "0.9× vừa" },
  { v: 1, label: "1× bình thường" },
];

/**
 * Tab Nghe — phần thi chiếm ~1/3 điểm N5 nhưng trước đây app không có gì.
 * Toàn bộ câu nghe được sinh từ 580 từ + 580 câu ví dụ có sẵn và phát bằng
 * giọng đọc tiếng Nhật của hệ điều hành (Web Speech API), nên không cần file audio.
 */
export default function ListeningTab({ onGoTo }) {
  const [ready, setReady] = useState(hasJaVoice());
  const [cfg, setCfg] = useState(() => loadTtsCfg());
  const [showQuiz, setShowQuiz] = useState(true);
  const [shadowCat, setShadowCat] = useState(vocabData.categories[0].id);

  useEffect(() => onVoicesReady(() => setReady(hasJaVoice())), []);

  const sets = quizSetsFor("listening");
  const totalQ = useMemo(
    () => sets.reduce((a, s) => a + buildQuiz(s.id).length, 0),
    [sets],
  );
  const stats = useMemo(
    () => getStats("listening", sets.flatMap((s) => buildQuiz(s.id).map((q) => q.id))),
    [sets],
  );

  // Số câu nghe trong 6 bộ đề (nếu đã soạn section 聴解).
  const examListening = useMemo(() => {
    let n = 0;
    examSets.forEach((e) =>
      e.sections.forEach((s) => {
        if (s.type === "listening" || /聴解/.test(s.title)) n += getQuestions(s).length;
      }),
    );
    return n;
  }, []);

  const shadowWords = useMemo(() => {
    const cat = vocabData.categories.find((c) => c.id === shadowCat);
    return (cat?.words || []).filter((w) => w.example?.jp);
  }, [shadowCat]);

  if (!ttsSupported()) {
    return (
      <div>
        <div className="section-header">
          <h2 className="section-title">🎧 Luyện nghe</h2>
        </div>
        <div className="lst-warn">
          ❌ Trình duyệt này không hỗ trợ Web Speech API nên không phát được tiếng Nhật.
          Hãy thử Chrome, Edge hoặc Safari bản mới.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">🎧 Luyện nghe</h2>
        <p className="section-desc">
          Phần 聴解 chiếm ~1/3 điểm JLPT N5 (điểm sàn 19/60). {totalQ} câu nghe được sinh tự động từ
          từ vựng &amp; câu ví dụ có sẵn.
          <span className="voc-stat-inline">
            <span style={{ color: "#34d399" }}>✅ {stats.mastered} thuộc</span>
            <span style={{ color: "#facc15" }}>📚 {stats.learning} đang học</span>
            {stats.due > 0 && <span style={{ color: "#22d3ee" }}>📅 {stats.due} tới hạn</span>}
          </span>
        </p>
      </div>

      {/* Trạng thái giọng đọc */}
      {!ready ? (
        <div className="lst-warn">
          ⚠️ Máy này chưa có giọng đọc tiếng Nhật (ja-JP) nên chưa phát được câu nghe.
          <div className="lst-warn__how">
            Cách bổ sung: <strong>Windows</strong> → Settings › Time &amp; language › Language &amp;
            region › thêm 日本語 (kèm Speech). <strong>Android</strong> → cài giọng tiếng Nhật cho
            Google Text-to-Speech. <strong>macOS/iOS</strong> → Settings › Accessibility › Spoken
            Content › Voices › Japanese.
          </div>
        </div>
      ) : (
        <div className="lst-voice">
          <span className="lst-voice__ok">🔊 Giọng đang dùng: <strong>{jaVoiceName()}</strong></span>
          <span className="lst-voice__rate">
            Tốc độ:
            {RATES.map((r) => (
              <button
                key={r.v}
                className={`lst-rate ${Math.abs(cfg.rate - r.v) < 0.01 ? "is-on" : ""}`}
                onClick={() => setCfg(saveTtsCfg({ rate: r.v }))}
              >
                {r.label}
              </button>
            ))}
          </span>
        </div>
      )}

      {/* Bộ luyện nghe */}
      {ready && (
        <>
          <div className="pbar pbar--orange">
            <div className="pbar__info">
              <div className="pbar__title">🎯 Bài luyện nghe</div>
              <div className="pbar__sub">
                Nghe từ → chọn nghĩa · Nghe câu → chọn bản dịch · Nghe → chép lại · Nghe kana.
                Kết quả vào lịch ôn SRS như mọi deck khác.
              </div>
            </div>
            <button className={`pbar__btn ${showQuiz ? "is-on" : ""}`} onClick={() => setShowQuiz((v) => !v)}>
              {showQuiz ? "✕ Đóng" : "Bắt đầu luyện →"}
            </button>
          </div>

          {showQuiz && <QuizHub tab="listening" color="#f97316" onClose={() => setShowQuiz(false)} />}

          {/* Đề nghe trong bộ đề JLPT */}
          <div className="lst-examlink">
            <div>
              <div className="lst-examlink__title">🎌 Phần 聴解 trong bộ đề JLPT</div>
              <div className="lst-examlink__sub">
                {examListening > 0
                  ? `${examListening} câu nghe theo format đề thi thật (4 dạng câu hỏi N5), nằm trong tab Bài tập.`
                  : "Chưa có câu nghe nào trong bộ đề."}
              </div>
            </div>
            {examListening > 0 && onGoTo && (
              <button className="lst-examlink__btn" onClick={() => onGoTo("exercises")}>
                Mở bộ đề →
              </button>
            )}
          </div>

          {/* Shadowing — nghe & nhắc lại theo câu */}
          <div className="lst-shadow">
            <div className="lst-shadow__head">
              <div>
                <div className="lst-shadow__title">🗣 Nghe &amp; nhắc lại (shadowing)</div>
                <div className="lst-shadow__sub">
                  Bấm loa, nghe rồi đọc to nhắc lại. Đây là cách nhanh nhất để tai quen với nhịp và
                  ngữ điệu tiếng Nhật.
                </div>
              </div>
            </div>

            <div className="filter-bar">
              <span className="filter-label">Chủ đề:</span>
              {vocabData.categories.map((c) => (
                <button
                  key={c.id}
                  className={`filter-btn ${shadowCat === c.id ? "filter-btn--active" : ""}`}
                  style={{ "--c": c.color }}
                  onClick={() => setShadowCat(c.id)}
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>

            <div className="lst-lines">
              {shadowWords.map((w) => (
                <div key={w.id} className="lst-line">
                  <SpeakButton text={w.example.jp} size="md" />
                  <div className="lst-line__body">
                    <div className="lst-line__jp">
                      <Ruby text={w.example.jp} />
                    </div>
                    <div className="lst-line__vn">{w.example.vn}</div>
                  </div>
                  <div className="lst-line__word" title={w.meaning}>
                    {w.japanese}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
