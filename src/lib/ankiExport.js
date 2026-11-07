// Xuất thẻ ra file văn bản để nhập vào Anki (hoặc app flashcard khác).
//
// TẠI SAO LÀ FILE TSV MÀ KHÔNG PHẢI .apkg: .apkg là SQLite nén zip, phải kéo thêm
// thư viện nặng chỉ để đóng gói. Anki nhập thẳng file văn bản phân cách bằng tab,
// và dòng chỉ thị "#…" ở đầu file cho Anki tự hiểu cách tách cột — người học chỉ
// cần File → Import, không phải chỉnh gì.
//
// Có BOM UTF-8 ở đầu: thiếu nó, Excel trên Windows đọc file theo bảng mã ANSI và
// tiếng Nhật / tiếng Việt thành ký tự rác. Anki bỏ qua BOM nên không ảnh hưởng.

import { vocabPool, kanjiPool } from "./session";
import { modifierWords } from "./modifiers";
import { getCard, getStatus } from "./srs";
import { loadNotes, noteKey } from "./userdata";
import { readJSON, dayKey } from "./storage";

export const ANKI_DECKS = [
  { id: "vocab", label: "Từ vựng", icon: "📖", markKey: "vocab_marked_ids" },
  { id: "kanji", label: "Kanji", icon: "🈳", markKey: "kanji_marked" },
  // Từ bổ nghĩa không có tính năng đánh dấu ⭐ ⇒ không có markKey.
  { id: "modifiers", label: "Từ bổ nghĩa", icon: "🎨", markKey: null },
];

export const ANKI_FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "seen", label: "Đã học (đang học + đã thuộc)" },
  { id: "marked", label: "Đã đánh dấu ⭐" },
];

export const ANKI_COLUMNS = ["Mặt trước", "Mặt sau", "Cách đọc", "Ví dụ (JP)", "Ví dụ (VN)", "Ghi chú của tôi", "Tags"];

/**
 * Một ô dữ liệu an toàn cho TSV: tab / xuống dòng trong nội dung sẽ làm lệch cột
 * hoặc tách đôi một thẻ ⇒ thay bằng khoảng trắng. Không bọc ngoặc kép kiểu CSV vì
 * Anki với #html:false hiểu ngoặc kép theo luật riêng, dễ lỗi hơn là có lợi.
 */
const cell = (v) =>
  String(v ?? "")
    .replace(/[\t\r\n]+/g, " ")
    .trim();

/** Tag Anki không được chứa khoảng trắng (khoảng trắng = tách tag). */
const tag = (v) => String(v || "").trim().replace(/\s+/g, "_");

// ── Chuyển từng loại dữ liệu thành dòng 7 cột ────────────────────────────────

function vocabRow(w, note) {
  return [
    w.kanji || w.japanese,
    [w.meaning, w.note].filter(Boolean).join(" · "),
    // Mặt trước đã là kanji thì cần cả cách đọc kana; không thì romaji là đủ.
    [w.kanji ? w.japanese : null, w.romaji].filter(Boolean).join(" · "),
    w.example?.jp,
    w.example?.vn,
    note,
    ["jlpt-n5", "vocab", tag(w.categoryId)].join(" "),
  ];
}

function kanjiRow(k, note) {
  const ex = k.examples?.[0];
  return [
    k.char,
    k.hanviet ? `${k.meaning} (${k.hanviet})` : k.meaning,
    `On: ${k.on || "—"} · Kun: ${k.kun || "—"}`,
    ex ? `${ex.word}（${ex.reading}）` : "",
    ex?.meaning,
    note,
    ["jlpt-n5", "kanji", tag(k.category)].join(" "),
  ];
}

function modifierRow(w, note) {
  return [
    w.jp,
    w.vn,
    [w.hira && w.hira !== w.jp ? w.hira : null, w.romaji].filter(Boolean).join(" · "),
    w.ex?.jp,
    w.ex?.vn,
    note,
    ["jlpt-n5", "modifiers", tag(w.groupId)].join(" "),
  ];
}

const SOURCES = {
  vocab: { items: vocabPool, row: vocabRow },
  kanji: { items: kanjiPool, row: kanjiRow },
  modifiers: { items: modifierWords, row: modifierRow },
};

/** Danh sách mục sẽ xuất (đã lọc) — tách riêng để UI hiện trước được số thẻ. */
export function ankiItems(deck, filter = "all") {
  const src = SOURCES[deck];
  if (!src) return [];
  let items = src.items();
  if (filter === "seen") {
    items = items.filter((it) => getStatus(getCard(deck, it.id)) !== "new");
  } else if (filter === "marked") {
    const markKey = ANKI_DECKS.find((d) => d.id === deck)?.markKey;
    const marked = new Set((markKey && readJSON(markKey, [])) || []);
    items = items.filter((it) => marked.has(it.id));
  }
  return items;
}

/** Nội dung file TSV hoàn chỉnh (kèm BOM + chỉ thị Anki). */
export function buildAnkiTsv(deck, filter = "all") {
  const src = SOURCES[deck];
  const notes = loadNotes();
  const lines = [
    "#separator:tab",
    "#html:false",
    "#tags column:7",
    // Không thêm dòng tên cột: Anki chỉ hiểu chỉ thị dạng "#khoá:giá trị", một
    // dòng tiêu đề lạ có thể bị nhập thành thẻ rác. Tên cột hiện ở hướng dẫn trong UI.
  ];
  ankiItems(deck, filter).forEach((it) => {
    lines.push(src.row(it, notes[noteKey(deck, it.id)] || "").map(cell).join("\t"));
  });
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** Tải file về máy. Tên file có ngày để không ghi đè lần xuất trước. */
export function downloadAnki(deck, filter = "all") {
  const blob = new Blob([buildAnkiTsv(deck, filter)], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `anki-jlpt-n5-${deck}${filter === "all" ? "" : `-${filter}`}-${dayKey()}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
