import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * Số hộp thoại đang mở. Nhiều lớp chồng nhau vẫn chỉ khoá/mở nền đúng một lần.
 */
let openCount = 0;

function lockScroll() {
  if (openCount++ > 0) return;
  // Bù đúng bề rộng thanh cuộn để trang nền không "giật" ngang khi khoá.
  const gap = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.overflow = "hidden";
  if (gap > 0) document.body.style.paddingRight = `${gap}px`;
}

function unlockScroll() {
  if (--openCount > 0) return;
  openCount = 0;
  document.body.style.overflow = "";
  document.body.style.paddingRight = "";
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Vỏ chung cho mọi hộp thoại nổi.
 *
 * Vì sao phải portal ra <body>: `.main-content` có `z-index` nên tự tạo một
 * stacking context. Modal đặt bên trong đó dù để z-index bao nhiêu cũng vẫn bị
 * header và thanh tab (z-index ở gốc trang) phủ lên — nút đóng nằm ngay dưới
 * thanh tab và bấm không được. Đưa ra <body> thì modal mới cùng tầng với header
 * và z-index mới có ý nghĩa.
 *
 * Kèm luôn phần việc mà mọi modal đều cần: khoá cuộn nền, Esc để đóng, giữ
 * tiêu điểm bên trong, trả tiêu điểm về chỗ cũ khi đóng.
 *
 * @param {() => void} props.onClose   đóng hộp thoại
 * @param {string}     props.label     nhãn cho trình đọc màn hình
 * @param {string}     props.className thêm class cho lớp phủ
 * @param {string}     props.panelClassName thêm class cho khung nội dung
 * @param {"center"|"top"|"bottom"} props.placement vị trí khung khi còn chỗ trống
 */
export default function Modal({
  onClose,
  label,
  className = "",
  panelClassName = "",
  panelStyle,
  placement = "center",
  children,
}) {
  const panelRef = useRef(null);
  const restoreRef = useRef(null);
  // Chỉ đóng khi cả nhấn xuống lẫn nhả chuột đều ở nền: kéo bôi đen chữ trong
  // khung rồi nhả tay ra ngoài thì không bị đóng oan.
  const downOnBackdrop = useRef(false);

  useEffect(() => {
    restoreRef.current = document.activeElement;
    lockScroll();
    const t = setTimeout(() => {
      const panel = panelRef.current;
      if (panel && !panel.contains(document.activeElement)) panel.focus();
    }, 0);

    return () => {
      clearTimeout(t);
      unlockScroll();
      restoreRef.current?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
        return;
      }
      if (e.key !== "Tab") return;

      // Giữ Tab quẩn trong hộp thoại, không chạy lạc xuống trang nền.
      const panel = panelRef.current;
      if (!panel) return;
      const items = [...panel.querySelectorAll(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null || el === panel,
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className={`ovl ovl--${placement} ${className}`}
      onMouseDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (downOnBackdrop.current && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        className={`ovl__panel ${panelClassName}`}
        style={panelStyle}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
