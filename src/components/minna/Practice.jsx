import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BLANK,
  TYPE_LABEL,
  checkAnswer,
  correctText,
  fullSentence,
  romajiMatches,
  prepare,
  recordAnswer,
  finishLessonRun,
} from "../../lib/minna";
import { recordReview } from "../../lib/progress";
import SpeakButton from "../common/SpeakButton";
import { JpLine } from "./JpText";
import { MemoryTip } from "./GrammarPoint";

const JP_RE = /[぀-ヿ一-鿿]/;
// Các dạng mà câu tiếng Nhật đầy đủ đã hiện ngay ở đề bài — phản hồi khỏi lặp lại.
const PROMPT_SHOWS = new Set(["particle", "fill", "jp-vi", "identify"]);

/** Câu tiếng Nhật có chỗ trống — tô chỗ trống cho dễ thấy. */
function BlankSentence({ text, fill }) {
  const [a, b] = text.split(BLANK);
  return (
    <div className="mn-q__jp" lang="ja">
      {a}
      <span className={`mn-blank ${fill ? "is-filled" : ""}`}>{fill || "？"}</span>
      {b}
      {fill && <SpeakButton text={text.replace(BLANK, fill)} size="sm" />}
    </div>
  );
}

function Prompt({ ex, prefs, answered }) {
  const showRo = prefs.romaji && ex.romaji;
  const hasBlank = ex.jp?.includes(BLANK);
  return (
    <div className="mn-q__prompt">
      <div className="mn-q__type">{TYPE_LABEL[ex.type] || ex.type}</div>
      <div className="mn-q__text">{ex.question}</div>
      {ex.jp &&
        (hasBlank ? (
          <BlankSentence text={ex.jp} fill={answered ? ex.answer : null} />
        ) : (
          <div className={`mn-q__jpbox ${ex.type === "fix" ? "is-wrong" : ""}`}>
            {ex.type === "fix" && <span className="mn-q__flag">✗ Câu sai</span>}
            <JpLine text={ex.jp} furigana={prefs.furigana} className="mn-q__jp" />
          </div>
        ))}
      {showRo && ex.type !== "vi-jp" && <div className="mn-ro">{ex.romaji}</div>}
      {/* Nghĩa tiếng Việt thường là thứ phân định đáp án (VD 「chỉ… thôi」 → だけ),
          nên hiện ngay — trừ dạng dịch Nhật→Việt, nơi nghĩa chính là đáp án. */}
      {ex.vi && ex.type !== "jp-vi" && (
        <div className="mn-q__vi">🇻🇳 {ex.vi}</div>
      )}
    </div>
  );
}

function ChoiceInput({ ex, picked, answered, onPick }) {
  return (
    <div className={`mn-opts ${ex.shuffled.some((o) => o.length > 18) ? "is-long" : ""}`}>
      {ex.shuffled.map((opt, i) => {
        const isAns = opt === ex.answer;
        const cls = answered
          ? isAns
            ? "is-right"
            : opt === picked
              ? "is-wrong"
              : "is-dim"
          : "";
        return (
          <button
            key={opt}
            className={`mn-opt ${cls}`}
            lang={JP_RE.test(opt) ? "ja" : undefined}
            disabled={answered}
            onClick={() => onPick(opt)}
          >
            <span className="mn-opt__k">{i + 1}</span>
            <span className="mn-opt__t">{opt}</span>
          </button>
        );
      })}
    </div>
  );
}

function FillInput({ ex, answered, onSubmit }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    // Không tự focus trên cảm ứng: bàn phím ảo bật lên che mất câu hỏi.
    if (!answered && window.matchMedia?.("(pointer: fine)").matches) ref.current?.focus();
  }, [answered]);
  return (
    <form
      className="mn-fill"
      onSubmit={(e) => {
        e.preventDefault();
        if (!answered && val.trim()) onSubmit(val.trim());
      }}
    >
      <input
        ref={ref}
        className="mn-fill__in"
        value={val}
        disabled={answered}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Gõ kana hoặc romaji…"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        lang="ja"
        aria-label="Câu trả lời"
      />
      {!answered && (
        <div className="mn-fill__btns">
          <button className="mn-btn" type="submit" disabled={!val.trim()}>
            Kiểm tra
          </button>
          <button className="mn-btn mn-btn--ghost" type="button" onClick={() => onSubmit("")}>
            Không biết
          </button>
        </div>
      )}
      {ex.hint && !answered && <div className="mn-fill__hint">💡 Gợi ý: {ex.hint}</div>}
    </form>
  );
}

function OrderInput({ ex, answered, onSubmit }) {
  const [chosen, setChosen] = useState([]); // index trong ex.shuffled
  const used = new Set(chosen);
  const all = chosen.length === ex.shuffled.length;
  return (
    <div className="mn-order">
      <div className={`mn-order__line ${chosen.length ? "" : "is-empty"}`} lang="ja">
        {chosen.length === 0 && <span className="mn-order__ph">Chạm vào các mảnh bên dưới theo đúng thứ tự</span>}
        {chosen.map((k, i) => (
          <button
            key={k}
            className="mn-tok is-on"
            disabled={answered}
            onClick={() => setChosen((c) => c.filter((_, j) => j !== i))}
          >
            {ex.shuffled[k].t}
          </button>
        ))}
      </div>
      {!answered && (
        <>
          <div className="mn-order__bank" lang="ja">
            {ex.shuffled.map((tok, k) => (
              <button
                key={k}
                className="mn-tok"
                disabled={used.has(k)}
                onClick={() => setChosen((c) => [...c, k])}
              >
                {tok.t}
              </button>
            ))}
          </div>
          <div className="mn-fill__btns">
            <button
              className="mn-btn"
              disabled={!all}
              onClick={() => onSubmit(chosen.map((k) => ex.shuffled[k].t))}
            >
              Kiểm tra
            </button>
            <button className="mn-btn mn-btn--ghost" disabled={!chosen.length} onClick={() => setChosen([])}>
              Xếp lại
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Feedback({ ex, ok, user, gp, prefs, isLast, onNext }) {
  const btn = useRef(null);
  useEffect(() => {
    btn.current?.focus({ preventScroll: true });
  }, []);
  const sentence = fullSentence(ex);
  const userText = Array.isArray(user) ? user.join(" ") : user;
  return (
    <div className={`mn-fb ${ok ? "is-ok" : "is-no"}`} role="status">
      <div className="mn-fb__head">{ok ? "✅ Chính xác!" : "❌ Chưa đúng."}</div>
      {!ok && (
        <div className="mn-fb__ans">
          {userText ? (
            <div>
              Bạn trả lời: <b lang="ja">{userText}</b>
            </div>
          ) : (
            <div>Bạn chưa trả lời câu này.</div>
          )}
          <div>
            Đáp án đúng: <b lang="ja" className="mn-good">{correctText(ex)}</b>
          </div>
        </div>
      )}
      <p className="mn-fb__why">{ex.explanation}</p>
      {sentence && JP_RE.test(sentence) && !PROMPT_SHOWS.has(ex.type) && (
        <div className="mn-fb__sent">
          <div className="mn-jp" lang="ja">
            {sentence}
            <SpeakButton text={sentence} size="sm" />
          </div>
          {prefs.romaji && romajiMatches(ex) && <div className="mn-ro">{ex.romaji}</div>}
          {ex.vi && <div className="mn-vi">→ {ex.vi}</div>}
        </div>
      )}
      {!ok && gp && <MemoryTip gp={gp} compact />}
      {gp && <div className="mn-fb__gp">Ngữ pháp: <span lang="ja">{gp.title}</span></div>}
      <button ref={btn} className="mn-btn mn-fb__next" onClick={onNext}>
        {isLast ? "Xem kết quả →" : "Câu tiếp →"} <kbd>Enter</kbd>
      </button>
    </div>
  );
}

function Result({ log, title, lessonNo, gpIndex, onRestart, onRetryWrong, onExit }) {
  const ok = log.filter((x) => x.ok).length;
  const total = log.length;
  const pct = total ? Math.round((ok / total) * 100) : 0;
  const wrong = log.filter((x) => !x.ok);
  const msg =
    pct === 100 ? "Tuyệt đối! 🎉" : pct >= 80 ? "Rất tốt! 👏" : pct >= 50 ? "Khá rồi, ôn thêm chút nữa 💪" : "Xem lại ngữ pháp rồi thử lại nhé 📚";
  return (
    <div className="mn-res">
      <div className="mn-res__score" style={{ "--p": pct }}>
        <span>{pct}%</span>
      </div>
      <div className="mn-res__title">{title} — Kết quả</div>
      <div className="mn-res__msg">{msg}</div>
      <div className="mn-res__stats">
        <span className="mn-good">Đúng: {ok}</span>
        <span className="mn-bad">Sai: {total - ok}</span>
        <span>Tổng: {total}</span>
      </div>
      {lessonNo && pct >= 80 && (
        <div className="mn-res__note">Điểm ≥ 80% — xem đủ các mẫu ngữ pháp là bài được tính “Đã hoàn thành”.</div>
      )}

      {wrong.length > 0 && (
        <div className="mn-res__wrong">
          <div className="mn-res__wtitle">Những câu cần xem lại</div>
          {wrong.map(({ ex, user }) => (
            <div className="mn-res__witem" key={ex.id}>
              <div className="mn-res__wq">{ex.question}</div>
              {ex.jp && <div className="mn-res__wjp" lang="ja">{ex.jp}</div>}
              <div className="mn-res__wa">
                <span className="mn-bad" lang="ja">✗ {(Array.isArray(user) ? user.join(" ") : user) || "(bỏ qua)"}</span>
                <span className="mn-good" lang="ja">✓ {correctText(ex)}</span>
              </div>
              <div className="mn-res__wexp">{ex.explanation}</div>
              {gpIndex[ex.grammarPoint]?.memoryTip && (
                <div className="mn-res__wtip">🧠 {gpIndex[ex.grammarPoint].memoryTip.hook}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mn-res__btns">
        <button className="mn-btn" onClick={onRestart}>🔄 Làm lại</button>
        {wrong.length > 0 && (
          <button className="mn-btn mn-btn--alt" onClick={() => onRetryWrong(wrong.map((w) => w.ex))}>
            🔁 Luyện lại {wrong.length} câu sai
          </button>
        )}
        <button className="mn-btn mn-btn--ghost" onClick={onExit}>← Quay lại</button>
      </div>
    </div>
  );
}

/**
 * Bộ chạy bài tập của module Minna.
 *
 * `build()` trả về danh sách câu (chưa xáo phương án) — gọi lại mỗi lần “Làm
 * lại” để có đợt câu mới. `lessonNo` có giá trị thì kết quả được tính vào điểm
 * của bài đó; ôn tổng hợp / ôn câu sai thì không.
 */
export default function Practice({ build, title, lessonNo = null, gpIndex = {}, prefs, onExit }) {
  const [round, setRound] = useState(() => ({ items: build().map(prepare), key: 1 }));
  const [idx, setIdx] = useState(0);
  const [log, setLog] = useState([]); // { ex, ok, user }
  const [current, setCurrent] = useState(null); // { ok, user } sau khi trả lời
  const top = useRef(null);

  const items = round.items;
  const ex = items[idx];
  const done = idx >= items.length;
  const okCount = log.filter((x) => x.ok).length;

  const start = useCallback((list) => {
    setRound((r) => ({ items: list.map(prepare), key: r.key + 1 }));
    setIdx(0);
    setLog([]);
    setCurrent(null);
  }, []);

  const answer = useCallback(
    (user) => {
      if (!ex || current) return;
      const ok = checkAnswer(ex, user);
      recordAnswer(ex, ok, Array.isArray(user) ? user.join(" ") : user);
      recordReview(1, ok); // góp vào streak + độ chính xác chung của app
      setCurrent({ ok, user });
      setLog((l) => [...l, { ex, ok, user }]);
    },
    [ex, current],
  );

  const next = useCallback(() => {
    const last = idx + 1 >= items.length;
    if (last && lessonNo) finishLessonRun(lessonNo, log.filter((x) => x.ok).length, log.length);
    setCurrent(null);
    setIdx((i) => i + 1);
  }, [idx, items.length, lessonNo, log]);

  // Câu mới → đưa khung luyện tập về tầm nhìn (trên điện thoại phản hồi dài).
  useEffect(() => {
    if (idx > 0) top.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [idx]);

  // Phím tắt: 1–9 chọn phương án, Enter sang câu tiếp.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.("input, textarea") || e.ctrlKey || e.metaKey || e.altKey) return;
      if (current && e.key === "Enter") {
        if (document.activeElement?.classList.contains("mn-fb__next")) return; // nút tự xử lý
        e.preventDefault();
        next();
        return;
      }
      if (!current && ex?.shuffled && ex.type !== "order") {
        const n = Number(e.key);
        if (n >= 1 && n <= ex.shuffled.length) answer(ex.shuffled[n - 1]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, ex, answer, next]);

  const gp = ex ? gpIndex[ex.grammarPoint] : null;
  const pct = useMemo(() => (items.length ? (idx / items.length) * 100 : 0), [idx, items.length]);

  if (!items.length) {
    return (
      <div className="mn-card mn-empty">
        <p>Chưa có câu hỏi nào trong phạm vi này.</p>
        <button className="mn-btn mn-btn--ghost" onClick={onExit}>← Quay lại</button>
      </div>
    );
  }

  return (
    <div className="mn-run" ref={top}>
      <div className="mn-run__bar">
        <div className="mn-run__title">{title}</div>
        <button className="mn-btn mn-btn--ghost mn-btn--sm" onClick={onExit}>✕ Thoát</button>
      </div>

      {done ? (
        <Result
          log={log}
          title={title}
          lessonNo={lessonNo}
          gpIndex={gpIndex}
          onRestart={() => start(build())}
          onRetryWrong={(list) => start(list)}
          onExit={onExit}
        />
      ) : (
        <>
          <div className="mn-run__meta">
            <span>
              Câu <b>{idx + 1}</b> / {items.length}
            </span>
            <span className="mn-good">Đúng: {okCount}</span>
            <span className="mn-bad">Sai: {log.length - okCount}</span>
          </div>
          <div className="mn-prog" aria-hidden="true">
            <div className="mn-prog__fill" style={{ width: `${pct}%` }} />
          </div>

          <div className="mn-q" key={`${round.key}:${idx}`}>
            <Prompt ex={ex} prefs={prefs} answered={!!current} />
            {ex.type === "fill" ? (
              <FillInput ex={ex} answered={!!current} onSubmit={answer} />
            ) : ex.type === "order" ? (
              <OrderInput ex={ex} answered={!!current} onSubmit={answer} />
            ) : (
              <ChoiceInput ex={ex} picked={current?.user} answered={!!current} onPick={answer} />
            )}
            {current && (
              <Feedback
                ex={ex}
                ok={current.ok}
                user={current.user}
                gp={gp}
                prefs={prefs}
                isLast={idx + 1 >= items.length}
                onNext={next}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
