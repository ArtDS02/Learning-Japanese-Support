import { useMemo } from "react";
import { annotate } from "../../lib/furigana";

/**
 * Hiện câu tiếng Nhật kèm furigana — CHỈ cho những cụm có cách đọc thật trong
 * data (xem src/lib/furigana.js). Cụm không tra được thì hiện nguyên văn thay vì
 * đoán sai.
 */
export default function Ruby({ text, on = true, className = "" }) {
  const segs = useMemo(() => (on ? annotate(text) : null), [text, on]);

  if (!on || !segs) return <span className={className}>{text}</span>;

  return (
    <span className={`jp-ruby ${className}`}>
      {segs.map((seg, i) =>
        seg.r ? (
          <ruby key={i}>
            {seg.t}
            <rp>(</rp>
            <rt>{seg.r}</rt>
            <rp>)</rp>
          </ruby>
        ) : (
          <span key={i}>{seg.t}</span>
        ),
      )}
    </span>
  );
}
