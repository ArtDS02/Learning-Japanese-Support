import { useState } from "react";
import { getNote, setNote } from "../../lib/userdata";

/**
 * Ghi chú / mẹo nhớ do người học tự viết, gắn vào một thẻ bất kỳ.
 * Mẹo tự nghĩ ra là thứ nhớ lâu nhất — nên nó được lưu ngay, không cần nút Lưu.
 */
export default function NoteBox({ kind, id, placeholder }) {
  const [value, setValue] = useState(() => getNote(kind, id));
  const [open, setOpen] = useState(() => !!getNote(kind, id));
  const [saved, setSaved] = useState(false);

  // Đổi sang thẻ khác (StudyRunner dùng lại cùng một NoteBox) → nạp ghi chú của
  // thẻ mới ngay trong lúc render, thay cho effect gọi setState.
  const ident = `${kind}:${id}`;
  const [shownFor, setShownFor] = useState(ident);
  if (shownFor !== ident) {
    const next = getNote(kind, id);
    setShownFor(ident);
    setValue(next);
    setOpen(!!next);
    setSaved(false);
  }

  const commit = (v) => {
    setValue(v);
    setNote(kind, id, v);
    setSaved(true);
  };

  if (!open) {
    return (
      <button
        type="button"
        className="note-add"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        ✏️ Thêm ghi chú của tôi
      </button>
    );
  }

  return (
    <div className="note-box" onClick={(e) => e.stopPropagation()}>
      <div className="note-box__head">
        <span className="note-box__label">✏️ Ghi chú của tôi</span>
        {saved && <span className="note-box__saved">đã lưu</span>}
      </div>
      <textarea
        className="note-box__input"
        value={value}
        rows={2}
        placeholder={placeholder || "Cách nhớ riêng, ví dụ tự đặt, lưu ý khi dùng…"}
        onChange={(e) => commit(e.target.value)}
      />
    </div>
  );
}
