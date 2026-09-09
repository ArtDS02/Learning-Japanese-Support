import { useRef, useState, useLayoutEffect, useCallback } from "react";

/**
 * Một hàng lọc trong bảng .filters: [nhãn] + [cụm chip] (+ tools tuỳ chọn).
 *
 * Khi cụm chip vượt quá `collapsedLines` dòng (mặc định 2), hàng tự kẹp lại còn
 * đúng số dòng đó và hiện nút "▾ Xem thêm / ▴ Thu gọn" — giống lối thu gọn của
 * bộ thủ Kanji, nhưng đo chiều cao THẬT lúc chạy nên đúng cho cả điện thoại lẫn
 * PC (cỡ chip, vùng chạm và bề rộng khác nhau đều tự thích ứng).
 *
 * Chỉ hiện nút khi thật sự tràn — ít lựa chọn (vừa ≤2 dòng) thì hiện hết, không
 * có nút thừa.
 */
export default function FilterRow({
  label,
  children,
  tools = null,
  className = "",
  collapsedLines = 2,
}) {
  const chipsRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [overflow, setOverflow] = useState(false);
  const [clampH, setClampH] = useState(0);

  const measure = useCallback(() => {
    const el = chipsRef.current;
    if (!el) return;
    const first = el.firstElementChild;
    const chipH = first ? first.offsetHeight : 0;
    if (!chipH) {
      setOverflow(false);
      return;
    }
    const cs = getComputedStyle(el);
    const gap = parseFloat(cs.rowGap || cs.gap) || 8;
    const h = Math.round(chipH * collapsedLines + gap * (collapsedLines - 1));
    // Dung sai 1px để một dòng lẻ do làm tròn không bị tính nhầm là tràn.
    setClampH(h);
    setOverflow(el.scrollHeight > h + 1);
  }, [collapsedLines]);

  // Đo lại sau mỗi lần render (số chip có thể đổi khi lọc cấp độ/nhóm). Rẻ vì
  // chỉ đọc layout; state chỉ đổi khi giá trị khác nên không gây render thừa.
  useLayoutEffect(() => {
    measure();
  });

  // Bề rộng đổi (xoay máy, kéo cửa sổ) không luôn kéo theo render React — nên
  // theo dõi riêng bằng ResizeObserver. CHỈ đo lại khi bề rộng đổi (số chip mỗi
  // dòng thay đổi), bỏ qua lúc chính ta kẹp chiều cao — tránh vòng lặp resize.
  useLayoutEffect(() => {
    const el = chipsRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let lastW = el.clientWidth;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      if (w === lastW) return;
      lastW = w;
      measure();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const collapsed = overflow && !expanded;

  return (
    <div className={`filter-row ${className}`.trim()}>
      {label != null && <span className="filter-label">{label}</span>}
      <div className={`filter-col ${collapsed ? "is-collapsed" : ""}`}>
        <div
          className="filter-chips"
          ref={chipsRef}
          style={collapsed ? { maxHeight: clampH } : undefined}
        >
          {children}
        </div>
        {overflow && (
          <button
            type="button"
            className="filter-more"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "▴ Thu gọn" : "▾ Xem thêm"}
          </button>
        )}
      </div>
      {tools}
    </div>
  );
}
