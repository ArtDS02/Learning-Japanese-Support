// Thao tác nhỏ trên meta đồng bộ (xem syncCore.js) — tách riêng để store.js,
// vốn nạp ngay lúc mở app, không kéo theo mergeValue và phần còn lại của lõi.

import { SYNCED_KEYS } from "../dataKeys.js";

const SYNCED = new Set(SYNCED_KEYS);
export const isSyncedKey = (key) => SYNCED.has(key);

/** Các khoá đang chờ đẩy lên. */
export function dirtyKeys(meta) {
  return Object.entries(meta?.keys || {})
    .filter(([key, e]) => e?.dirty && isSyncedKey(key))
    .map(([key]) => key);
}

/**
 * Cập nhật meta sau khi đẩy thành công. Chỉ hết dirty nếu khoá KHÔNG bị sửa
 * thêm trong lúc chờ mạng (so `t` lúc gửi).
 * @param {object} meta
 * @param {Record<string, number>} sent  { key: t đã gửi }
 */
export function afterPush(meta, sent) {
  const keys = { ...(meta.keys || {}) };
  for (const [key, t] of Object.entries(sent)) {
    const e = keys[key] || {};
    keys[key] = { ...e, base: t, dirty: e.t !== t ? !!e.dirty : false };
  }
  return { ...meta, keys };
}

/** Ghi nhận một lần sửa trên máy. */
export function markDirty(meta, key, now) {
  if (!isSyncedKey(key)) return meta;
  const keys = { ...(meta.keys || {}) };
  const e = keys[key] || { base: null };
  // Đảm bảo t tăng ngặt — hai lần sửa trong cùng 1ms vẫn phân biệt được.
  const t = Math.max(now, (e.t || 0) + 1);
  keys[key] = { ...e, t, dirty: true };
  return { ...meta, keys };
}
