import Ruby from "../common/Ruby";
import SpeakButton from "../common/SpeakButton";

// Hội thoại hỏi–đáp trong data viết chung một chuỗi, ngăn bằng " …".
const splitTurns = (s) =>
  String(s || "")
    .split(/\s*…\s*/)
    .map((x) => x.trim())
    .filter(Boolean);

/** Một dòng tiếng Nhật: furigana tuỳ chọn + nút nghe. */
export function JpLine({ text, furigana, speak = true, className = "" }) {
  return (
    <div className={`mn-jp ${className}`}>
      <Ruby text={text} on={furigana} />
      {speak && <SpeakButton text={text.replace(/＿＿/g, "")} size="sm" />}
    </div>
  );
}

/**
 * Ví dụ chuẩn của module: 🇯🇵 tiếng Nhật (chính) · 🔤 romaji (bật/tắt) · 🇻🇳 nghĩa,
 * kèm giải thích từng thành phần nếu data có.
 */
export default function JpExample({ ex, romaji, furigana }) {
  const jp = splitTurns(ex.jp);
  const ro = splitTurns(ex.romaji);
  return (
    <div className="mn-ex">
      {ex.context && <span className="mn-ex__ctx">{ex.context}</span>}
      <div className="mn-ex__turns">
        {jp.map((line, i) => (
          <div className="mn-ex__turn" key={i}>
            <JpLine text={i > 0 ? `…${line}` : line} furigana={furigana} />
            {romaji && ro[i] && <div className="mn-ro">{i > 0 ? `…${ro[i]}` : ro[i]}</div>}
          </div>
        ))}
      </div>
      <div className="mn-vi">🇻🇳 {ex.vi}</div>
      {ex.breakdown?.length > 0 && (
        <div className="mn-ex__bd">
          <span className="mn-ex__bd-label">💡</span>
          {ex.breakdown.map((b, i) => (
            <span className="mn-bd" key={i}>
              <b lang="ja">{b.jp}</b> = {b.vi}
            </span>
          ))}
        </div>
      )}
      {ex.note && <div className="mn-ex__note">{ex.note}</div>}
    </div>
  );
}
