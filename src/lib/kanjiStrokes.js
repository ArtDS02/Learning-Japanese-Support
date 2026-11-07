// Nét viết kanji (path SVG theo KanjiVG, CC BY-SA 3.0) — tách khỏi kanji.json.
//
// Nét chiếm hơn nửa dung lượng kanji.json (~200KB), mà kanji.json lại được trang
// chủ, tìm kiếm và furigana dùng ngay khi mở app. Tách ra đây để chỉ tải khi mở
// chi tiết một kanji hoặc xuất tập viết.

import { useEffect, useState } from "react";

let data = null; // { [kanjiId]: string[] }
let pending = null;

/** Nạp toàn bộ nét (một lần). */
export function loadStrokes() {
  if (data) return Promise.resolve(data);
  pending ??= import("../data/kanji-strokes.json").then((m) => {
    data = (m.default || m).strokes || {};
    return data;
  });
  return pending;
}

/** Nét của một kanji nếu đã nạp; chưa nạp thì trả mảng rỗng. */
export function strokesOf(id) {
  return data?.[id] || [];
}

export const strokesReady = () => !!data;

/** Gắn `strokes` vào danh sách kanji (dùng khi xuất tập viết / PDF). */
export function withStrokes(list) {
  return list.map((k) => ({ ...k, strokes: strokesOf(k.id) }));
}

/** Hook: nét của một kanji, tự vẽ lại khi dữ liệu nét nạp xong. */
export function useKanjiStrokes(id) {
  const [, setLoaded] = useState(!!data);
  useEffect(() => {
    if (data) return undefined;
    let alive = true;
    loadStrokes().then(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);
  return strokesOf(id);
}
