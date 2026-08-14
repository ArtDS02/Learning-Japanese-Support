import { useEffect, useRef, useState } from "react";

/**
 * Bảng tập viết kanji: vẽ tay lên ô kẻ, có thể bật nét mẫu mờ để tô theo.
 *
 * Cố ý KHÔNG tự động cho điểm nét viết — chấm hình dạng nét bằng heuristic sẽ
 * báo sai và gây mất niềm tin. Ở đây người học tự so với nét mẫu (bật/tắt được),
 * đúng như cách luyện viết trên giấy kẻ ô.
 */
export default function WritePad({ strokes = [], char, color = "#a78bfa", size = 240 }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [guide, setGuide] = useState(true);
  const [numbers, setNumbers] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Canvas theo devicePixelRatio để nét không bị rỗ trên màn hình retina.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#e8eaf0";
  }, [size]);

  const pos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * size,
      y: ((e.clientY - rect.top) / rect.height) * size,
    };
  };

  const start = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const p = pos(e);
    drawing.current = true;
    setDirty(true);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const end = () => {
    drawing.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDirty(false);
  };

  return (
    <div className="wp" style={{ "--c": color }}>
      <div className="wp__head">
        ✍️ Tập viết
        <span className="wp__hint">Viết bằng chuột hoặc ngón tay</span>
      </div>

      <div className="wp__stage" style={{ width: size, height: size }}>
        {/* Ô kẻ */}
        <svg className="wp__grid" viewBox="0 0 100 100" aria-hidden="true">
          <rect x="0" y="0" width="100" height="100" fill="none" stroke="currentColor" strokeWidth="0.6" />
          <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 3" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 3" />
        </svg>

        {/* Nét mẫu mờ để tô theo */}
        {guide && strokes.length > 0 && (
          <svg className="wp__guide" viewBox="0 0 109 109" aria-hidden="true">
            {strokes.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={color}
                strokeOpacity="0.28"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {numbers &&
              strokes.map((d, i) => {
                // Đặt số thứ tự ở điểm bắt đầu của mỗi nét (lấy từ lệnh M đầu tiên).
                const m = /M\s*([\d.]+)[,\s]+([\d.]+)/.exec(d);
                if (!m) return null;
                return (
                  <text
                    key={`n${i}`}
                    x={Number(m[1])}
                    y={Number(m[2])}
                    className="wp__num"
                    dx="-2"
                    dy="-2"
                  >
                    {i + 1}
                  </text>
                );
              })}
          </svg>
        )}

        {guide && strokes.length === 0 && char && (
          <div className="wp__ghost" aria-hidden="true">{char}</div>
        )}

        <canvas
          ref={canvasRef}
          className="wp__canvas"
          style={{ width: size, height: size }}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
        />
      </div>

      <div className="wp__btns">
        <button className="wp__btn" onClick={clear} disabled={!dirty}>🧹 Xoá</button>
        <button className={`wp__btn ${guide ? "is-on" : ""}`} onClick={() => setGuide((v) => !v)}>
          {guide ? "👁 Ẩn nét mẫu" : "👁 Hiện nét mẫu"}
        </button>
        {strokes.length > 0 && (
          <button className={`wp__btn ${numbers ? "is-on" : ""}`} onClick={() => setNumbers((v) => !v)}>
            🔢 Số nét
          </button>
        )}
      </div>
    </div>
  );
}
