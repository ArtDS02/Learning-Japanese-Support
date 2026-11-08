// Gộp hai bản dữ liệu của cùng một khoá (nhập file sao lưu ở chế độ "gộp",
// đồng bộ tài khoản khi hai máy cùng sửa). Hàm thuần — không đụng localStorage.

/** Gộp hai giá trị của cùng một khoá — ưu tiên tiến độ cao hơn / dữ liệu nhiều hơn. */
export function mergeValue(key, current, incoming) {
  if (current == null) return incoming;
  if (incoming == null) return current;

  if (key === "srs_state_v1") {
    const out = { ...current };
    for (const [deck, bag] of Object.entries(incoming)) {
      out[deck] = { ...(out[deck] || {}) };
      for (const [id, card] of Object.entries(bag || {})) {
        if (newerCard(card, out[deck][id])) out[deck][id] = card;
      }
    }
    return out;
  }

  if (key === "progress_v1") {
    const out = { daily: { ...(current.daily || {}) }, acc: { ...(current.acc || {}) }, best: 0 };
    for (const [d, n] of Object.entries(incoming.daily || {})) {
      out.daily[d] = Math.max(out.daily[d] || 0, n);
    }
    for (const [d, a] of Object.entries(incoming.acc || {})) {
      const mine = out.acc[d] || { ok: 0, no: 0 };
      out.acc[d] = { ok: Math.max(mine.ok, a.ok || 0), no: Math.max(mine.no, a.no || 0) };
    }
    out.best = Math.max(current.best || 0, incoming.best || 0);
    return out;
  }

  if (key === "minna1_v1") return mergeMinna(current, incoming);

  // Lịch sử thi thử: các lần thi không có id — khoá theo (đề, thời điểm) rồi sắp
  // mới → cũ. Lọc theo `id` như mảng thường sẽ vứt sạch toàn bộ lịch sử.
  if (key === "exam_history_v1" && Array.isArray(current) && Array.isArray(incoming)) {
    const seen = new Set();
    return [...current, ...incoming]
      .filter((r) => {
        if (!r || typeof r !== "object") return false;
        const k = `${r.examId}|${r.at}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .sort((a, b) => (b.at || 0) - (a.at || 0))
      .slice(0, 50);
  }

  // Mảng (id đánh dấu, thẻ tự tạo…) → hợp. Phần tử object không có id thì so
  // khớp theo nội dung — không bao giờ âm thầm bỏ đi.
  if (Array.isArray(current) && Array.isArray(incoming)) {
    const seen = new Set();
    return [...current, ...incoming].filter((x) => {
      const k = x && typeof x === "object" ? (x.id ?? JSON.stringify(x)) : x;
      if (k == null || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  if (typeof current === "object" && typeof incoming === "object") {
    return { ...current, ...incoming };
  }
  return incoming;
}


/**
 * Thẻ `a` có mới hơn `b` không. So NGÀY ÔN GẦN NHẤT trước (`last`, dạng
 * "YYYY-MM-DD" nên so chuỗi là đúng), rồi mới tới số lượt ôn. Chỉ so `reps` thì
 * một thẻ vừa trả lời sai (bị hạ box) có thể bị bản cũ hơn nhưng nhiều lượt hơn
 * từ máy khác ghi đè.
 */
function newerCard(a, b) {
  if (!b) return true;
  if (!a) return false;
  const la = a.last || "";
  const lb = b.last || "";
  if (la !== lb) return la > lb;
  return (a.reps || 0) > (b.reps || 0);
}

/**
 * Minna: mỗi bài lấy bản có `updatedAt` mới hơn, và sổ câu sai của bài đó đi
 * theo đúng bản thắng — câu đã trả lời đúng (bị gỡ khỏi sổ) ở máy này không bị
 * máy kia nhét lại.
 */
function mergeMinna(current, incoming) {
  const curLessons = current.lessons || {};
  const incLessons = incoming.lessons || {};
  const lessons = {};
  const fromIncoming = new Set();
  for (const n of new Set([...Object.keys(curLessons), ...Object.keys(incLessons)])) {
    const a = curLessons[n];
    const b = incLessons[n];
    if (b && (!a || (b.updatedAt || 0) > (a.updatedAt || 0))) {
      lessons[n] = b;
      fromIncoming.add(String(n));
    } else {
      lessons[n] = a;
    }
  }
  const wrong = {};
  for (const [id, w] of Object.entries(current.wrong || {})) {
    if (!fromIncoming.has(String(w?.lesson))) wrong[id] = w;
  }
  for (const [id, w] of Object.entries(incoming.wrong || {})) {
    if (fromIncoming.has(String(w?.lesson)) || !(String(w?.lesson) in lessons)) wrong[id] = w;
  }
  return { ...current, ...incoming, lessons, wrong, prefs: { ...(current.prefs || {}), ...(incoming.prefs || {}) } };
}
