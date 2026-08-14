import { useState } from "react";

/* ─── Helpers ─────────────────────────────────────────────── */

// Tạo bản trống cùng "hình dạng" với mẫu (để nút "Thêm" sinh item mới).
function blankLike(sample) {
  if (Array.isArray(sample)) return [];
  if (sample && typeof sample === "object") {
    const o = {};
    for (const k of Object.keys(sample)) o[k] = blankLike(sample[k]);
    return o;
  }
  if (typeof sample === "number") return 0;
  if (typeof sample === "boolean") return false;
  return "";
}

// Chuỗi tóm tắt cho 1 item (hiển thị ở tiêu đề khi thu gọn).
const SUMMARY_KEYS = [
  "char", "japanese", "particle", "title", "label", "word", "katakana",
  "jp", "q", "question", "suffix", "week", "read", "kanji", "id",
];
function summarize(v) {
  if (Array.isArray(v)) return `${v.length} mục`;
  if (v && typeof v === "object") {
    for (const k of SUMMARY_KEYS) {
      if (typeof v[k] === "string" && v[k].trim()) return v[k];
    }
    for (const k of Object.keys(v)) {
      if (typeof v[k] === "string" && v[k].trim()) return v[k];
    }
    return "{…}";
  }
  return String(v);
}

const LABELS = {
  meta: "Meta", title: "Tiêu đề", description: "Mô tả", total: "Tổng",
  totalWords: "Tổng số từ", categories: "Nhóm", label: "Nhãn", icon: "Icon",
  color: "Màu", char: "Chữ", on: "Âm On", kun: "Âm Kun", meaning: "Nghĩa",
  stroke: "Số nét", category: "Nhóm (id)", examples: "Ví dụ", mnemonic: "Mẹo nhớ",
  strokes: "Nét SVG", on_romaji: "On (romaji)", kun_romaji: "Kun (romaji)",
  words: "Từ vựng", japanese: "Tiếng Nhật", romaji: "Romaji", note: "Ghi chú",
  example: "Ví dụ", jp: "Câu Nhật", vn: "Dịch Việt", items: "Mục", particle: "Cấu trúc",
  function: "Chức năng", detail: "Chi tiết", highlight: "Nhấn mạnh", numbers: "Số",
  num: "Số", kanji: "Kanji", hira: "Hiragana", counters: "Bộ đếm", suffix: "Hậu tố",
  use: "Công dụng", readings: "Cách đọc", read: "Đọc", hours: "Giờ", months: "Tháng",
  dates: "Ngày", special: "Đặc biệt", questionWords: "Từ hỏi", q: "Từ hỏi",
  rules: "Quy tắc", weekdays: "Thứ", kanji_meaning: "Nghĩa kanji", tips: "Mẹo",
  sections: "Phần", studyPlan: "Lộ trình", methods: "Phương pháp", tools: "Công cụ",
  howTo: "Cách làm", schedule: "Lịch học", focus: "Trọng tâm", goal: "Mục tiêu",
  daily: "Mỗi ngày", examSets: "Bộ đề", timeLimit: "Thời gian (phút)",
  questions: "Câu hỏi", choices: "Lựa chọn", answer: "Đáp án",
  explanation: "Giải thích", translation: "Bản dịch",
};
const label = (k) => LABELS[k] || k;

/* ─── Node đệ quy ─────────────────────────────────────────── */

export function Node({ value, onChange, name, depth = 0 }) {
  if (Array.isArray(value))
    return <ArrayNode value={value} onChange={onChange} name={name} depth={depth} />;
  if (value !== null && typeof value === "object")
    return <ObjectNode value={value} onChange={onChange} depth={depth} />;
  return <PrimitiveNode value={value} onChange={onChange} name={name} />;
}

function ObjectNode({ value, onChange, depth }) {
  return (
    <div className={`adm-obj ${depth > 0 ? "adm-obj--nested" : ""}`}>
      {Object.entries(value).map(([k, v]) => {
        const isBox = v !== null && typeof v === "object";
        return (
          <div key={k} className={`adm-field ${isBox ? "adm-field--box" : ""}`}>
            <label className="adm-label">{label(k)}</label>
            <Node
              value={v}
              name={k}
              depth={depth + 1}
              onChange={(nv) => onChange({ ...value, [k]: nv })}
            />
          </div>
        );
      })}
    </div>
  );
}

function ArrayNode({ value, onChange, name, depth }) {
  const [open, setOpen] = useState(depth <= 0);
  const primitive = value.length === 0 || typeof value[0] !== "object" || value[0] === null;

  const addItem = () =>
    onChange([...value, value.length ? blankLike(value[0]) : ""]);
  const removeAt = (i) => onChange(value.filter((_, j) => j !== i));
  const setAt = (i, nv) => onChange(value.map((it, j) => (j === i ? nv : it)));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const copy = [...value];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  };

  return (
    <div className="adm-arr">
      <button type="button" className="adm-arr__head" onClick={() => setOpen((o) => !o)}>
        <span className={`adm-caret ${open ? "is-open" : ""}`}>▶</span>
        <span className="adm-arr__name">{label(name)}</span>
        <span className="adm-badge">{value.length}</span>
      </button>

      {open && (
        <div className="adm-arr__body">
          {primitive
            ? value.map((it, i) => (
                <div key={i} className="adm-prim-row">
                  <PrimitiveNode value={it} name={name} onChange={(nv) => setAt(i, nv)} />
                  <button type="button" className="adm-icnbtn adm-del" title="Xoá" onClick={() => removeAt(i)}>✕</button>
                </div>
              ))
            : value.map((it, i) => (
                <ArrayItem
                  key={i}
                  item={it}
                  index={i}
                  total={value.length}
                  depth={depth}
                  onChange={(nv) => setAt(i, nv)}
                  onRemove={() => removeAt(i)}
                  onMove={(dir) => move(i, dir)}
                />
              ))}
          <button type="button" className="adm-addbtn" onClick={addItem}>+ Thêm {label(name).toLowerCase()}</button>
        </div>
      )}
    </div>
  );
}

function ArrayItem({ item, index, total, depth, onChange, onRemove, onMove }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`adm-item ${open ? "is-open" : ""}`}>
      <div className="adm-item__head">
        <button type="button" className="adm-item__toggle" onClick={() => setOpen((o) => !o)}>
          <span className={`adm-caret ${open ? "is-open" : ""}`}>▶</span>
          <span className="adm-item__idx">#{index + 1}</span>
          <span className="adm-item__sum">{summarize(item)}</span>
        </button>
        <div className="adm-item__actions">
          <button type="button" className="adm-icnbtn" title="Lên" disabled={index === 0} onClick={() => onMove(-1)}>↑</button>
          <button type="button" className="adm-icnbtn" title="Xuống" disabled={index === total - 1} onClick={() => onMove(1)}>↓</button>
          <button type="button" className="adm-icnbtn adm-del" title="Xoá" onClick={onRemove}>✕</button>
        </div>
      </div>
      {open && (
        <div className="adm-item__body">
          <Node value={item} onChange={onChange} depth={depth + 1} />
        </div>
      )}
    </div>
  );
}

function PrimitiveNode({ value, onChange, name }) {
  if (typeof value === "boolean") {
    return (
      <label className="adm-check">
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
        <span>{value ? "Có" : "Không"}</span>
      </label>
    );
  }
  if (typeof value === "number") {
    return (
      <input
        className="adm-input"
        type="number"
        value={value}
        onChange={(e) => {
          const n = e.target.valueAsNumber;
          onChange(Number.isNaN(n) ? value : n);
        }}
      />
    );
  }
  // string
  const long = typeof value === "string" && (value.length > 60 || value.includes("\n") || name === "strokes" || name === "detail" || name === "explanation" || name === "howTo" || name === "description");
  return long ? (
    <textarea className="adm-input adm-textarea" rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
  ) : (
    <input className="adm-input" type="text" value={value} onChange={(e) => onChange(e.target.value)} />
  );
}
