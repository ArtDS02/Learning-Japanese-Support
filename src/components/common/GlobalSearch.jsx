import { useState, useEffect, useRef, useMemo } from "react";
import Modal from "./Modal";
import { search } from "../../lib/searchIndex";

const KIND_LABEL = {
  vocab: "Từ vựng",
  kanji: "Kanji",
  grammar: "Ngữ pháp",
  numbers: "Số đếm",
  kana: "Kana",
};

/**
 * Bảng tìm kiếm toàn cục (Ctrl/⌘ + K).
 * Tra được từ vựng, kanji, trợ từ, mẫu câu, bảng chia, bộ đếm, giờ/ngày/thứ…
 * mà không cần biết nội dung nằm ở tab nào.
 */
export default function GlobalSearch({ open, onClose, onJump }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const results = useMemo(
    () => (q.trim() ? search(q, { limit: 40, kinds: kind === "all" ? undefined : [kind] }) : []),
    [q, kind],
  );

  useEffect(() => {
    if (open) {
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
    setQ("");
  }, [open]);

  useEffect(() => setActive(0), [q, kind]);

  useEffect(() => {
    if (!open) return;
    // Esc do <Modal> lo. Ở đây chỉ còn phần điều hướng trong danh sách kết quả.
    const onKey = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[active]) {
        e.preventDefault();
        onJump(results[active]);
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, active, onClose, onJump]);

  // Giữ mục đang chọn trong tầm nhìn khi dùng bàn phím.
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  return (
    <Modal
      onClose={onClose}
      label="Tìm kiếm toàn cục"
      className="gs-overlay"
      panelClassName="gs-panel"
      placement="top"
    >
      <div className="gs-inputrow">
        <span className="gs-inputrow__icon">🔍</span>
        <input
          ref={inputRef}
          className="gs-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm mọi nơi: từ vựng, kanji, trợ từ, mẫu câu, bộ đếm…"
          autoComplete="off"
          spellCheck={false}
        />
        <kbd className="gs-esc">Esc</kbd>
      </div>

      <div className="gs-filters">
        {["all", "vocab", "kanji", "grammar", "numbers", "kana"].map((k) => (
          <button
            key={k}
            className={`gs-filter ${kind === k ? "is-on" : ""}`}
            onClick={() => setKind(k)}
          >
            {k === "all" ? "🌐 Tất cả" : KIND_LABEL[k]}
          </button>
        ))}
      </div>

      <div className="gs-results" ref={listRef}>
        {!q.trim() && (
          <div className="gs-empty">
            Gõ tiếng Nhật, romaji hay tiếng Việt đều được.
            <div className="gs-empty__kbd">
              <kbd>↑</kbd><kbd>↓</kbd> chọn · <kbd>Enter</kbd> mở · <kbd>Esc</kbd> đóng
            </div>
          </div>
        )}
        {q.trim() && results.length === 0 && (
          <div className="gs-empty">Không tìm thấy “{q}”.</div>
        )}
        {results.map((row, i) => (
          <button
            key={`${row.kind}-${row.id}-${i}`}
            data-idx={i}
            className={`gs-row ${i === active ? "is-active" : ""}`}
            style={{ "--c": row.color || "#a78bfa" }}
            onMouseEnter={() => setActive(i)}
            onClick={() => {
              onJump(row);
              onClose();
            }}
          >
            <span className="gs-row__icon">{row.icon}</span>
            <span className="gs-row__main">
              <span className="gs-row__title">{row.title}</span>
              {row.sub && <span className="gs-row__sub">{row.sub}</span>}
            </span>
            <span className="gs-row__meaning">{row.meaning}</span>
            {row.badge && <span className="gs-row__badge">{row.badge}</span>}
          </button>
        ))}
      </div>
    </Modal>
  );
}
