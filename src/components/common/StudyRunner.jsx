import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { rateCard, getCard, getStatus } from "../../lib/srs";
import { recordReview } from "../../lib/progress";
import { matchesKana } from "../../lib/romaji";
import { loadSettings } from "../../lib/userdata";
import { speak, ttsSupported, hasJaVoice } from "../../lib/tts";
import SpeakButton from "./SpeakButton";
import NoteBox from "./NoteBox";
import Ruby from "./Ruby";
import "../../styles/common/runner.css";

/**
 * Bộ chạy phiên học DÙNG CHUNG cho mọi loại bài: flashcard, chọn đáp án, gõ đáp án.
 * Nhờ vậy Từ vựng, Kanji, Kana, Ngữ pháp, Số đếm, Nghe, Sổ tay lỗi và phiên
 * "Học hôm nay" đều đi qua một luồng duy nhất và cùng ghi vào SRS.
 *
 * Mỗi phần tử `items` có dạng:
 *   { deck, id, kind: "flash" | "choice" | "type", ... }  (xem lib/session.js & lib/quizgen.js)
 *
 * `items` cần được memo hoá ở phía gọi để phiên không bị dựng lại mỗi lần render.
 */
export default function StudyRunner({
  items,
  title,
  subtitle,
  onExit,
  srs = true,
  color = "#a78bfa",
}) {
  const settings = loadSettings();
  const [queue, setQueue] = useState(items);
  const [pos, setPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState(null);
  const [typed, setTyped] = useState("");
  const [typeOk, setTypeOk] = useState(null);
  const [done, setDone] = useState(false);
  const [stats, setStats] = useState({ ok: 0, no: 0, vague: 0 });
  const [missed, setMissed] = useState([]);
  const [autoPlay, setAutoPlay] = useState(true);
  const [furigana, setFurigana] = useState(settings.showFurigana);
  const requeued = useRef(new Map());
  const inputRef = useRef(null);

  const item = queue[pos];
  const audible = ttsSupported() && hasJaVoice();

  // Dựng lại phiên khi bộ thẻ đổi.
  useEffect(() => {
    setQueue(items);
    setPos(0);
    setRevealed(false);
    setSelected(null);
    setTyped("");
    setTypeOk(null);
    setDone(false);
    setStats({ ok: 0, no: 0, vague: 0 });
    setMissed([]);
    requeued.current = new Map();
  }, [items]);

  // Câu nghe: tự phát khi sang thẻ mới.
  useEffect(() => {
    if (!item?.audio || !autoPlay || !audible) return;
    const t = setTimeout(() => speak(item.audio), 220);
    return () => clearTimeout(t);
  }, [item, autoPlay, audible]);

  // Câu gõ đáp án: tự focus ô nhập.
  useEffect(() => {
    if (item?.kind === "type" && !revealed) inputRef.current?.focus();
  }, [item, revealed]);

  const advance = useCallback(
    (wrongItem) => {
      // Mọi quyết định tính TRƯỚC khi gọi setState: React StrictMode gọi hàm
      // updater hai lần, nên không được đặt setState/side-effect bên trong updater.
      let requeue = false;
      if (wrongItem) {
        // Thẻ sai được đưa lại cuối hàng đợi (tối đa 2 lần) để gặp lại trong phiên.
        const key = `${wrongItem.deck}:${wrongItem.id}`;
        const n = requeued.current.get(key) || 0;
        if (n < 2) {
          requeued.current.set(key, n + 1);
          requeue = true;
        }
      }

      const nextLength = queue.length + (requeue ? 1 : 0);
      if (requeue) setQueue((q) => [...q, wrongItem]);
      if (pos + 1 >= nextLength) setDone(true);
      else setPos(pos + 1);

      setRevealed(false);
      setSelected(null);
      setTyped("");
      setTypeOk(null);
    },
    [queue, pos],
  );

  const commit = useCallback(
    (rating, { ok, autoAdvance = true } = {}) => {
      if (!item) return;
      if (srs && item.deck) rateCard(item.deck, item.id, rating);
      recordReview(1, typeof ok === "boolean" ? ok : rating !== "forget");
      setStats((s) => ({
        ok: s.ok + (rating === "remember" ? 1 : 0),
        no: s.no + (rating === "forget" ? 1 : 0),
        vague: s.vague + (rating === "vague" ? 1 : 0),
      }));
      if (rating === "forget") setMissed((m) => (m.some((x) => x.id === item.id) ? m : [...m, item]));
      if (autoAdvance) advance(rating === "forget" ? item : null);
    },
    [item, srs, advance],
  );

  // ── Trả lời ────────────────────────────────────────────────────────────────

  const pickChoice = (choice) => {
    if (revealed || !item) return;
    setSelected(choice);
    setRevealed(true);
    const ok = choice === item.answer;
    if (srs && item.deck) rateCard(item.deck, item.id, ok ? "remember" : "forget");
    recordReview(1, ok);
    setStats((s) => ({ ...s, ok: s.ok + (ok ? 1 : 0), no: s.no + (ok ? 0 : 1) }));
    if (!ok) setMissed((m) => (m.some((x) => x.id === item.id) ? m : [...m, item]));
  };

  const checkTyped = () => {
    if (!item) return;
    if (revealed) {
      advance(typeOk === false ? item : null);
      return;
    }
    if (!typed.trim()) return;
    const ok = matchesKana(typed, item.answer, item.accept || []);
    setTypeOk(ok);
    setRevealed(true);
    if (srs && item.deck) rateCard(item.deck, item.id, ok ? "remember" : "forget");
    recordReview(1, ok);
    setStats((s) => ({ ...s, ok: s.ok + (ok ? 1 : 0), no: s.no + (ok ? 0 : 1) }));
    if (!ok) setMissed((m) => (m.some((x) => x.id === item.id) ? m : [...m, item]));
  };

  const nextAfterReveal = () => {
    if (!item) return;
    const wasWrong =
      item.kind === "choice" ? selected !== item.answer : item.kind === "type" ? typeOk === false : false;
    advance(wasWrong ? item : null);
  };

  const restart = (only) => {
    const base = only === "missed" && missed.length ? missed : items;
    setQueue(base);
    setPos(0);
    setRevealed(false);
    setSelected(null);
    setTyped("");
    setTypeOk(null);
    setDone(false);
    setStats({ ok: 0, no: 0, vague: 0 });
    setMissed([]);
    requeued.current = new Map();
  };

  // ── Phím tắt ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (done || !item) return;
      const tag = e.target?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";

      if (e.key === "Escape") {
        onExit?.();
        return;
      }
      if (item.kind === "type") {
        if (e.key === "Enter" && typing) {
          e.preventDefault();
          checkTyped();
        }
        return;
      }
      if (typing) return;

      if (item.kind === "flash") {
        // e.code phòng trường hợp layout/IME báo e.key khác " "
        if (e.key === " " || e.code === "Space" || e.key === "Enter") {
          e.preventDefault();
          setRevealed((v) => !v);
        } else if (revealed && ["1", "2", "3"].includes(e.key)) {
          e.preventDefault();
          commit(e.key === "1" ? "forget" : e.key === "2" ? "vague" : "remember");
        }
        return;
      }

      if (item.kind === "choice") {
        if (!revealed) {
          const n = Number(e.key);
          if (n >= 1 && n <= (item.choices?.length || 0)) {
            e.preventDefault();
            pickChoice(item.choices[n - 1]);
          }
        } else if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") {
          e.preventDefault();
          nextAfterReveal();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── Tổng kết ───────────────────────────────────────────────────────────────

  const answered = stats.ok + stats.no + stats.vague;
  const acc = stats.ok + stats.no ? Math.round((stats.ok / (stats.ok + stats.no)) * 100) : null;

  const missedByTag = useMemo(() => {
    const map = new Map();
    missed.forEach((m) => {
      const k = m.tag || "Khác";
      map.set(k, (map.get(k) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [missed]);

  if (!items.length) {
    return (
      <div className="run-empty">
        <div className="run-empty__icon">🎉</div>
        <p className="run-empty__text">Không có thẻ nào cần học ở đây.</p>
        <button className="run-btn" onClick={onExit}>← Quay lại</button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="run-summary" style={{ "--c": color }}>
        <div className="run-summary__emoji">
          {acc === 100 ? "🎉" : acc != null && acc >= 70 ? "👏" : "💪"}
        </div>
        <h3 className="run-summary__title">Hoàn thành phiên học!</h3>
        <p className="run-summary__sub">
          {answered} lượt trả lời{acc != null ? ` · độ chính xác ${acc}%` : ""}
        </p>

        <div className="run-summary__stats">
          <div className="run-stat" style={{ "--c": "#34d399" }}>
            <div className="run-stat__n">{stats.ok}</div>
            <div className="run-stat__l">✓ Đúng / Nhớ</div>
          </div>
          {stats.vague > 0 && (
            <div className="run-stat" style={{ "--c": "#facc15" }}>
              <div className="run-stat__n">{stats.vague}</div>
              <div className="run-stat__l">🤔 Mơ hồ</div>
            </div>
          )}
          <div className="run-stat" style={{ "--c": "#f87171" }}>
            <div className="run-stat__n">{stats.no}</div>
            <div className="run-stat__l">✗ Sai / Quên</div>
          </div>
        </div>

        {missedByTag.length > 0 && (
          <div className="run-weak">
            <div className="run-weak__title">📌 Điểm cần ôn thêm</div>
            <div className="run-weak__list">
              {missedByTag.map(([tag, n]) => (
                <span key={tag} className="run-weak__chip">
                  {tag} <strong>×{n}</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="run-summary__actions">
          {missed.length > 0 && (
            <button className="run-btn run-btn--primary" onClick={() => restart("missed")}>
              🎯 Ôn lại {missed.length} thẻ sai
            </button>
          )}
          <button className="run-btn" onClick={() => restart()}>🔁 Học lại từ đầu</button>
          <button className="run-btn run-btn--ghost" onClick={onExit}>← Quay lại</button>
        </div>
      </div>
    );
  }

  if (!item) return null;

  const card = srs && item.deck ? getCard(item.deck, item.id) : null;
  const status = card ? getStatus(card) : null;
  const pct = Math.round((pos / queue.length) * 100);

  return (
    <div className="runner" style={{ "--c": item.color || color }}>
      {/* Thanh trên */}
      <div className="run-top">
        <button className="run-exit" onClick={onExit} title="Thoát (Esc)">✕</button>
        <div className="run-top__mid">
          <div className="run-top__title">{title}</div>
          {subtitle && <div className="run-top__sub">{subtitle}</div>}
        </div>
        <div className="run-top__right">
          <span className="run-count">{pos + 1}/{queue.length}</span>
        </div>
      </div>

      <div className="run-track">
        <div className="run-track__fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="run-toolbar">
        <span className="run-score">
          <span className="ok">✓ {stats.ok}</span>
          <span className="no">✗ {stats.no}</span>
        </span>
        <span className="run-toolbar__right">
          {status && (
            <span className={`run-badge run-badge--${status}`}>
              {status === "new" ? "🆕 Mới" : status === "mastered" ? "✅ Đã thuộc" : `📚 L${card.box}`}
            </span>
          )}
          {item.audio && audible && (
            <button
              className={`run-mini ${autoPlay ? "is-on" : ""}`}
              onClick={() => setAutoPlay((v) => !v)}
              title="Tự phát khi sang câu mới"
            >
              {autoPlay ? "🔁 Tự phát" : "⏸ Tự phát"}
            </button>
          )}
          {item.kind !== "flash" && (
            <button
              className={`run-mini ${furigana ? "is-on" : ""}`}
              onClick={() => setFurigana((v) => !v)}
              title="Hiện/ẩn furigana (chỉ hiện cách đọc có trong dữ liệu)"
            >
              ふ Furigana
            </button>
          )}
        </span>
      </div>

      {/* Nội dung */}
      {item.kind === "flash" && (
        <FlashBody
          item={item}
          revealed={revealed}
          onFlip={() => setRevealed((v) => !v)}
          furigana={furigana}
        />
      )}

      {item.kind === "choice" && (
        <ChoiceBody
          item={item}
          revealed={revealed}
          selected={selected}
          onPick={pickChoice}
          furigana={furigana}
          audible={audible}
        />
      )}

      {item.kind === "type" && (
        <TypeBody
          item={item}
          revealed={revealed}
          typed={typed}
          setTyped={setTyped}
          typeOk={typeOk}
          onSubmit={checkTyped}
          inputRef={inputRef}
          furigana={furigana}
          audible={audible}
        />
      )}

      {/* Điều khiển */}
      {item.kind === "flash" && (
        revealed ? (
          <div className="run-rate">
            <button className="run-rate__btn is-forget" onClick={() => commit("forget")}>
              😟 Quên <kbd>1</kbd>
            </button>
            <button className="run-rate__btn is-vague" onClick={() => commit("vague")}>
              🤔 Mơ hồ <kbd>2</kbd>
            </button>
            <button className="run-rate__btn is-remember" onClick={() => commit("remember")}>
              😎 Nhớ <kbd>3</kbd>
            </button>
          </div>
        ) : (
          <div className="run-hint">
            <kbd>Space</kbd> lật thẻ · <kbd>1</kbd>/<kbd>2</kbd>/<kbd>3</kbd> chấm nhớ · <kbd>Esc</kbd> thoát
          </div>
        )
      )}

      {item.kind === "choice" && revealed && (
        <button className="run-next" onClick={nextAfterReveal}>
          Tiếp theo → <kbd>Enter</kbd>
        </button>
      )}

      {item.kind === "type" && (
        <button className="run-next" onClick={checkTyped}>
          {revealed ? "Tiếp theo →" : "Kiểm tra"} <kbd>Enter</kbd>
        </button>
      )}

      {item.noteKind && revealed && (
        <div className="run-note">
          <NoteBox kind={item.noteKind} id={item.id} />
        </div>
      )}
    </div>
  );
}

// ── Thẻ lật ──────────────────────────────────────────────────────────────────

function FlashBody({ item, revealed, onFlip, furigana }) {
  return (
    <div className={`run-card ${revealed ? "is-revealed" : ""}`} onClick={onFlip}>
      {!revealed ? (
        <div className="run-card__face">
          <div className="run-card__label">{item.tag || "Thẻ"}</div>
          <div className="run-card__front">{item.front}</div>
          {item.frontSub && <div className="run-card__frontsub">{item.frontSub}</div>}
          {item.speak && <SpeakButton text={item.speak} size="lg" />}
          <div className="run-card__tap">Nhấn để xem đáp án</div>
        </div>
      ) : (
        <div className="run-card__face">
          <div className="run-card__label">Đáp án</div>
          <div className="run-card__frontsmall">
            {item.front}
            {item.speak && <SpeakButton text={item.speak} />}
          </div>
          <div className="run-card__back">{item.back}</div>
          {item.backSub && <div className="run-card__backsub">{item.backSub}</div>}
          {item.mnemonic && <div className="run-card__mnemonic">💡 {item.mnemonic}</div>}
          {item.example && (
            <div className="run-card__example">
              <div className="run-card__example-jp">
                <Ruby text={item.example.jp} on={furigana} />
                <SpeakButton text={item.example.jp} />
              </div>
              {item.example.romaji && (
                <div className="run-card__example-rm">{item.example.romaji}</div>
              )}
              <div className="run-card__example-vn">→ {item.example.vn}</div>
            </div>
          )}
          {item.extra?.length > 0 && (
            <div className="run-card__extra">
              {item.extra.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Chọn đáp án ──────────────────────────────────────────────────────────────

function ChoiceBody({ item, revealed, selected, onPick, furigana, audible }) {
  const isCorrect = selected === item.answer;
  const cls = (choice) => {
    if (!revealed) return "run-choice";
    if (choice === item.answer) return "run-choice is-correct";
    if (choice === selected) return "run-choice is-wrong";
    return "run-choice is-dim";
  };

  return (
    <div className="run-q">
      {item.prompt && <div className="run-q__prompt">{item.prompt}</div>}

      {item.audio ? (
        <AudioPrompt item={item} revealed={revealed} audible={audible} furigana={furigana} />
      ) : (
        <>
          <div className="run-q__text">
            <Ruby text={item.question} on={furigana} />
            {item.speak && <SpeakButton text={item.speak} />}
          </div>
          {item.sub && <div className="run-q__sub">{item.sub}</div>}
        </>
      )}

      <div className="run-choices">
        {(item.choices || []).map((choice, i) => (
          <button
            key={i}
            className={cls(choice)}
            onClick={() => onPick(choice)}
            disabled={revealed}
          >
            <span className="run-choice__k">{i + 1}</span>
            <span className="run-choice__t">{choice}</span>
          </button>
        ))}
      </div>

      {revealed && (
        <div className={`run-reveal ${isCorrect ? "is-ok" : "is-no"}`}>
          <div className="run-reveal__head">
            {isCorrect ? "✅ Chính xác!" : `❌ Đáp án đúng: ${item.answer}`}
          </div>
          {item.reveal && (
            <div className="run-reveal__jp">
              <Ruby text={item.reveal} on={furigana} />
              <SpeakButton text={item.audio || item.reveal} />
            </div>
          )}
          {item.explanation && <div className="run-reveal__ex">{item.explanation}</div>}
          {item.translation && <div className="run-reveal__vn">📝 {item.translation}</div>}
        </div>
      )}
    </div>
  );
}

// ── Gõ đáp án ────────────────────────────────────────────────────────────────

function TypeBody({ item, revealed, typed, setTyped, typeOk, onSubmit, inputRef, furigana, audible }) {
  return (
    <div className="run-q">
      {item.prompt && <div className="run-q__prompt">{item.prompt}</div>}

      {item.audio ? (
        <AudioPrompt item={item} revealed={revealed} audible={audible} furigana={furigana} />
      ) : (
        <>
          <div className="run-q__text">
            <Ruby text={item.question} on={furigana} />
          </div>
          {item.sub && <div className="run-q__sub">{item.sub}</div>}
        </>
      )}

      <input
        ref={inputRef}
        className={`run-input ${revealed ? (typeOk ? "is-ok" : "is-no") : ""}`}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder="Gõ kana hoặc romaji rồi Enter…"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        disabled={revealed}
      />

      {revealed && (
        <div className={`run-reveal ${typeOk ? "is-ok" : "is-no"}`}>
          <div className="run-reveal__head">
            {typeOk ? "✅ Chính xác!" : `❌ Đáp án: ${item.answer}`}
          </div>
          {item.accept?.length > 0 && !typeOk && (
            <div className="run-reveal__ex">Cũng được tính đúng: {item.accept.join(" · ")}</div>
          )}
          {item.explanation && <div className="run-reveal__ex">{item.explanation}</div>}
          {item.translation && <div className="run-reveal__vn">📝 {item.translation}</div>}
        </div>
      )}
    </div>
  );
}

// ── Câu hỏi dạng nghe ────────────────────────────────────────────────────────

function AudioPrompt({ item, revealed, audible, furigana }) {
  if (!audible) {
    return (
      <div className="run-audio run-audio--off">
        ⚠️ Máy này không có giọng đọc tiếng Nhật nên không phát được câu nghe.
        <div className="run-audio__fallback">{item.audio}</div>
      </div>
    );
  }
  return (
    <div className="run-audio">
      <SpeakButton text={item.audio} size="xl" label="Phát lại" />
      <div className="run-audio__hint">
        {revealed ? (
          <span className="run-audio__script">
            <Ruby text={item.reveal || item.audio} on={furigana} />
          </span>
        ) : (
          "Nghe rồi chọn đáp án — bấm loa để nghe lại"
        )}
      </div>
    </div>
  );
}
