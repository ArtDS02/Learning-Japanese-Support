// Lõi đồng bộ tài khoản — CHỈ gồm hàm thuần: nhận trạng thái, trả về kế hoạch.
// Không đụng localStorage, không đụng Firebase, nên test được bằng `node --test`
// (xem syncCore.test.js). Phần thực thi nằm ở sync.js.
//
// Mô hình:
//   · Trên máy: localStorage là nguồn chính. `meta.keys[key]` ghi lại
//       { t: lúc sửa trên máy (ms), base: `t` của bản remote đã thấy/đã đẩy gần nhất,
//         dirty: còn thay đổi chưa đẩy lên }
//   · Trên Firestore: users/{uid}/kv/{key} = { v: chuỗi thô | null, t, st, dev }
//       v = null là "khoá đã bị xoá" (tombstone).

import { mergeValue } from "../merge.js";
import { MERGEABLE_KEYS, SYNCED_KEYS } from "../dataKeys.js";

import { isSyncedKey } from "./metaOps.js";

// Các thao tác nhỏ trên meta nằm ở metaOps.js (store.js nạp ngay lúc mở app,
// không cần kéo theo mergeValue). Xuất lại ở đây cho tiện.
export { isSyncedKey, dirtyKeys, afterPush, markDirty } from "./metaOps.js";

/** Khoá thể hiện "máy này đã thực sự học" — dùng để quyết định có phải hỏi khi đăng nhập lần đầu. */
const MEANINGFUL_KEYS = [
  "srs_state_v1",
  "progress_v1",
  "exam_state_v1",
  "exam_history_v1",
  "notes_v1",
  "custom_cards_v1",
  "vocab_marked_ids",
  "kanji_marked",
  "minna1_v1",
  "studyplan_checks_v1",
];

function parse(raw) {
  if (raw == null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw; // chuỗi thuần không phải JSON
  }
}

function isEmptyValue(v) {
  if (v == null) return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") {
    return Object.values(v).every((x) => isEmptyValue(x) || x === 0);
  }
  return false;
}

/** Bộ dữ liệu ({ key: raw }) có tiến độ học thật không. */
export function hasMeaningfulData(map) {
  return MEANINGFUL_KEYS.some((k) => !isEmptyValue(parse(map[k])));
}

/**
 * Gộp hai chuỗi thô của cùng một khoá. Trả về chuỗi thô mới (hoặc null nếu cả
 * hai đều trống).
 */
export function mergeRaw(key, localRaw, remoteRaw) {
  if (localRaw == null) return remoteRaw ?? null;
  if (remoteRaw == null) return localRaw;
  if (localRaw === remoteRaw) return localRaw;
  const merged = mergeValue(key, parse(localRaw), parse(remoteRaw));
  return typeof merged === "string" ? merged : JSON.stringify(merged);
}

/**
 * Quyết định xử lý MỘT document remote khi kéo về.
 *
 * @param {object} p
 * @param {string} p.key
 * @param {string|null} p.localRaw  giá trị đang có trên máy
 * @param {{t:number, base:number|null, dirty:boolean}|undefined} p.entry  meta của khoá
 * @param {{v:string|null, t:number, dev?:string}} p.remote
 * @returns {{type:"skip"} |
 *           {type:"apply", raw:string|null, base:number} |
 *           {type:"keep", base:number} |
 *           {type:"merge", raw:string|null, base:number}}
 *   apply = ghi bản remote xuống máy, hết dirty
 *   keep  = giữ bản trên máy, vẫn dirty (sẽ đẩy đè lên)
 *   merge = ghi bản gộp xuống máy, vẫn dirty (sẽ đẩy bản gộp lên)
 */
export function resolvePull({ key, localRaw, entry, remote }) {
  if (!isSyncedKey(key) || !remote || typeof remote.t !== "number") return { type: "skip" };
  const base = entry?.base ?? null;

  // Đã thấy đúng bản này rồi (kể cả tiếng vọng của chính máy mình vừa đẩy).
  if (base !== null && remote.t === base) return { type: "skip" };

  if (!entry?.dirty) {
    if (remote.v === localRaw) return { type: "apply", raw: localRaw, base: remote.t };
    return { type: "apply", raw: remote.v, base: remote.t };
  }

  // Cả hai phía cùng đổi kể từ lần đồng bộ trước → xung đột.
  if (MERGEABLE_KEYS.has(key) && localRaw != null && remote.v != null) {
    return { type: "merge", raw: mergeRaw(key, localRaw, remote.v), base: remote.t };
  }
  // Bản sửa sau cùng thắng.
  if (remote.t > (entry.t || 0)) return { type: "apply", raw: remote.v, base: remote.t };
  return { type: "keep", base: remote.t };
}

/**
 * Kiểu lần đăng nhập đầu tiên trên máy này.
 *   "push"  tài khoản chưa có gì → đẩy dữ liệu máy lên
 *   "pull"  máy chưa học gì → kéo về (gộp lặng lẽ với vài cài đặt lặt vặt)
 *   "ask"   cả hai đều có tiến độ → hỏi người dùng
 */
export function firstLoginCase(localMap, remoteMap) {
  const remoteRaw = Object.fromEntries(Object.entries(remoteMap).map(([k, d]) => [k, d?.v ?? null]));
  const localHas = hasMeaningfulData(localMap);
  const remoteHas = hasMeaningfulData(remoteRaw);
  if (!remoteHas) return "push";
  if (!localHas) return "pull";
  return "ask";
}

/**
 * Kế hoạch cho lần đăng nhập đầu tiên.
 *
 * @param {Record<string,string|null>} localMap   { key: raw } trên máy (chỉ khoá đồng bộ)
 * @param {Record<string,{v:string|null,t:number}>} remoteMap  document remote theo khoá
 * @param {"merge"|"remote"|"local"} choice
 * @param {number} now
 * @returns {{ local: Record<string,string|null>, push: string[], keys: Record<string,{t:number,base:number|null,dirty:boolean}> }}
 *   local = giá trị phải ghi xuống máy (null = xoá); chỉ chứa khoá có thay đổi
 *   push  = khoá phải đẩy lên (giá trị lấy từ máy sau khi đã áp `local`)
 *   keys  = meta mới cho mọi khoá đồng bộ
 */
export function planFirstLogin(localMap, remoteMap, choice, now) {
  const local = {};
  const push = [];
  const keys = {};

  for (const key of SYNCED_KEYS) {
    const mine = localMap[key] ?? null;
    const doc = remoteMap[key];
    const theirs = doc ? doc.v : null;
    const remoteT = doc ? doc.t : null;

    let next;
    if (choice === "remote") next = theirs;
    else if (choice === "local") next = mine;
    else next = mergeRaw(key, mine, theirs);

    if (next !== mine) local[key] = next;
    const needPush = next !== theirs && !(next == null && !doc);
    if (needPush) push.push(key);
    keys[key] = { t: now, base: remoteT, dirty: needPush };
  }
  return { local, push, keys };
}
