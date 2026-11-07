import JpExample from "./JpText";

/** Mẹo nhớ — dùng chung cho thẻ ngữ pháp, phản hồi đáp án và sổ câu sai. */
export function MemoryTip({ gp, compact = false }) {
  if (gp?.memoryTip) {
    const t = gp.memoryTip;
    return (
      <div className={`mn-tip ${compact ? "mn-tip--sm" : ""}`}>
        <div className="mn-tip__label">🧠 Mẹo nhớ</div>
        <div className="mn-tip__hook">
          <span aria-hidden="true">{t.emoji}</span> {t.hook}
        </div>
        <div className="mn-tip__meaning">{t.meaning}</div>
      </div>
    );
  }
  if (gp?.keyword) {
    return (
      <div className={`mn-tip mn-tip--kw ${compact ? "mn-tip--sm" : ""}`}>
        <div className="mn-tip__label">🔑 Từ khoá</div>
        <div className="mn-tip__hook">{gp.keyword}</div>
      </div>
    );
  }
  return null;
}

function Block({ icon, title, children, tone }) {
  return (
    <section className={`mn-blk ${tone ? `mn-blk--${tone}` : ""}`}>
      <h4 className="mn-blk__title">
        <span aria-hidden="true">{icon}</span> {title}
      </h4>
      {children}
    </section>
  );
}

/**
 * Một grammar point đầy đủ 10 phần: tên · ý nghĩa · tại sao · khi nào · công
 * thức · mẹo nhớ · ví dụ (kèm giải thích) · lỗi thường gặp · bổ sung · bài tập.
 */
export default function GrammarPoint({ gp, index, total, prefs, exCount, onPractice }) {
  return (
    <article className="mn-gp">
      <header className="mn-gp__head">
        <span className="mn-gp__n">
          {index + 1}/{total}
        </span>
        <h3 className="mn-gp__title" lang="ja">{gp.title}</h3>
        <p className="mn-gp__meaning">= {gp.meaning}</p>
      </header>

      <div className="mn-gp__cols">
        <Block icon="🤔" title="Tại sao cần?">
          <p className="mn-p">{gp.why}</p>
        </Block>
        <Block icon="📍" title="Khi nào dùng?">
          <ul className="mn-ul">
            {gp.when.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </Block>
      </div>

      <Block icon="🧩" title="Công thức">
        <pre className="mn-formula" lang="ja">{gp.formula}</pre>
        {gp.parts?.length > 0 && (
          <div className="mn-parts">
            {gp.parts.map((p, i) => (
              <div className="mn-part" key={i}>
                <span className="mn-part__k" lang="ja">{p.part}</span>
                <span className="mn-part__v">{p.role}</span>
              </div>
            ))}
          </div>
        )}
      </Block>

      <MemoryTip gp={gp} />

      <Block icon="💬" title={`Ví dụ (${gp.examples.length})`}>
        <div className="mn-exs">
          {gp.examples.map((ex, i) => (
            <JpExample key={i} ex={ex} romaji={prefs.romaji} furigana={prefs.furigana} />
          ))}
        </div>
      </Block>

      {gp.mistakes?.length > 0 && (
        <Block icon="⚠️" title="Dễ nhầm" tone="warn">
          <div className="mn-mis">
            {gp.mistakes.map((m, i) => (
              <div className="mn-mis__item" key={i}>
                {m.wrong && (
                  <div className="mn-mis__row is-bad">
                    <span aria-label="Sai">✗</span> <span lang="ja">{m.wrong}</span>
                  </div>
                )}
                {m.right && (
                  <div className="mn-mis__row is-good">
                    <span aria-label="Đúng">✓</span> <span lang="ja">{m.right}</span>
                  </div>
                )}
                <div className="mn-mis__why">{m.explain}</div>
              </div>
            ))}
          </div>
        </Block>
      )}

      {gp.extra?.map((x, i) => (
        <section className="mn-blk mn-blk--extra" key={i}>
          <h4 className="mn-blk__title">{x.title?.startsWith("📌") ? x.title : `📌 ${x.title || "Kiến thức bổ sung"}`}</h4>
          <p className="mn-p">{x.text}</p>
          {x.examples?.length > 0 && (
            <div className="mn-exs">
              {x.examples.map((ex, j) => (
                <JpExample key={j} ex={ex} romaji={prefs.romaji} furigana={prefs.furigana} />
              ))}
            </div>
          )}
          <div className="mn-extra-note">Phần mở rộng — không phải ngữ pháp chính của bài.</div>
        </section>
      ))}

      {exCount > 0 && (
        <div className="mn-gp__practice">
          <span>✏️ Bài tập liên quan: {exCount} câu</span>
          <button className="mn-btn mn-btn--ghost" onClick={onPractice}>
            Luyện riêng mẫu này →
          </button>
        </div>
      )}
    </article>
  );
}
