// Phần "luôn nạp" của tính năng tài khoản: trạng thái cho UI, theo dõi các lần
// ghi dữ liệu, hẹn giờ đồng bộ. CỐ Ý không import Firebase — engine.js (chứa
// SDK, ~vài chục KB) chỉ được nạp bằng import() khi người dùng bấm đăng nhập
// hoặc máy này đã đăng nhập từ trước.

import { useSyncExternalStore } from "react";
import { onLocalWrite } from "../storage";
import { cloudEnabled } from "./config";
import { markDirty, dirtyKeys, isSyncedKey } from "./metaOps";

export const SESSION_KEY = "cloud_session_v1"; // { uid, email, name, photo } — máy này đang đăng nhập
export const META_KEY = "sync_meta_v1"; // { uid, deviceId, cursor, keys: {…} } — xem syncCore.js
const REDIRECT_KEY = "cloud_redirect_pending";

const PUSH_DELAY_MS = 5000; // gom các lần chấm thẻ liên tiếp thành một lần ghi
const PULL_MIN_GAP_MS = 60000; // quay lại tab: kéo về tối đa mỗi phút một lần

// ── localStorage riêng của lớp đồng bộ (không đi qua writeJSON: không phải dữ liệu học) ──

function readLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeLocal(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export const loadMeta = () => readLocal(META_KEY, null);
export const saveMeta = (meta) => writeLocal(META_KEY, meta);
export const loadSession = () => readLocal(SESSION_KEY, null);
export const saveSession = (s) => writeLocal(SESSION_KEY, s);
export const markRedirectPending = (on) => writeLocal(REDIRECT_KEY, on ? 1 : null);
export const isRedirectPending = () => !!readLocal(REDIRECT_KEY, null);

// ── Trạng thái cho UI ────────────────────────────────────────────────────────

/**
 * status: "off"       chưa đăng nhập
 *         "starting"  đang khôi phục phiên / đang đăng nhập
 *         "syncing"   đang đồng bộ
 *         "idle"      đã đồng bộ
 *         "pending"   có thay đổi chưa đẩy lên
 *         "offline"   mất mạng — sẽ tự đồng bộ khi có mạng
 *         "error"     lỗi (xem `error`)
 * choice: khác null khi lần đăng nhập đầu cần người dùng chọn cách gộp.
 */
let state = {
  enabled: cloudEnabled,
  user: cloudEnabled ? loadSession() : null,
  status: "off",
  lastSyncAt: readLocal(META_KEY, null)?.lastSyncAt || null,
  error: null,
  choice: null,
};
if (state.user) state.status = dirtyKeys(loadMeta()).length ? "pending" : "idle";

const listeners = new Set();

export function getCloudState() {
  return state;
}

export function setCloudState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useCloud() {
  return useSyncExternalStore(subscribe, getCloudState, getCloudState);
}

// ── Nạp engine (Firebase) khi cần ────────────────────────────────────────────

let enginePromise = null;
export function loadEngine() {
  if (!enginePromise) {
    enginePromise = import("./engine").catch((e) => {
      enginePromise = null; // mất mạng lúc tải chunk → lần sau thử lại
      throw e;
    });
  }
  return enginePromise;
}

async function withEngine(fn) {
  try {
    const eng = await loadEngine();
    return await fn(eng);
  } catch (e) {
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    setCloudState({
      status: offline ? "offline" : "error",
      error: offline ? null : friendlyError(e),
    });
    return undefined;
  }
}

export function friendlyError(e) {
  const code = e?.code || "";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return "Đã đóng cửa sổ đăng nhập.";
  }
  if (code === "auth/network-request-failed" || code === "unavailable") {
    return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
  }
  if (code === "resource-exhausted") {
    return "Máy chủ đồng bộ tạm hết hạn mức hôm nay — tiến độ vẫn lưu trên máy và sẽ đồng bộ sau.";
  }
  if (code === "permission-denied") return "Không có quyền truy cập dữ liệu (phiên đăng nhập hết hạn?).";
  if (code === "auth/unauthorized-domain") return "Tên miền này chưa được phép đăng nhập (Firebase → Authorized domains).";
  return e?.message ? String(e.message) : "Đã có lỗi khi đồng bộ.";
}

// ── Theo dõi thay đổi & hẹn giờ ──────────────────────────────────────────────

let unTrack = null;
let pushTimer = null;
let lastPullAt = 0;

function onWrite(key) {
  if (!isSyncedKey(key) || !state.user) return;
  const meta = loadMeta();
  if (!meta || meta.uid !== state.user.uid) return;
  saveMeta(markDirty(meta, key, Date.now()));
  if (state.status !== "syncing") setCloudState({ status: "pending" });
  schedulePush();
}

export function schedulePush(delay = PUSH_DELAY_MS) {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    withEngine((eng) => eng.push());
  }, delay);
}

/** Bắt đầu theo dõi các lần ghi (gọi khi đã có phiên đăng nhập). */
export function startTracking() {
  if (!unTrack) unTrack = onLocalWrite(onWrite);
}

export function stopTracking() {
  unTrack?.();
  unTrack = null;
  clearTimeout(pushTimer);
  pushTimer = null;
}

function onVisibility() {
  if (!state.user) return;
  if (document.visibilityState === "hidden") {
    // Rời app: đẩy ngay phần còn chờ. Không kịp thì meta vẫn giữ dirty, lần mở
    // sau sẽ đẩy tiếp.
    if (dirtyKeys(loadMeta()).length) {
      clearTimeout(pushTimer);
      withEngine((eng) => eng.push());
    }
  } else if (Date.now() - lastPullAt > PULL_MIN_GAP_MS) {
    syncNow();
  }
}

// ── API cho UI ───────────────────────────────────────────────────────────────

export function syncNow() {
  lastPullAt = Date.now();
  return withEngine((eng) => eng.sync());
}

export function signIn() {
  setCloudState({ status: "starting", error: null });
  return withEngine((eng) => eng.signIn());
}

export function resolveFirstLogin(choice) {
  return withEngine((eng) => eng.resolveFirstLogin(choice));
}

/** @param {{ wipeLocal?: boolean }} opts */
export function signOut(opts = {}) {
  return withEngine((eng) => eng.signOut(opts));
}

export function deleteAccount() {
  return withEngine((eng) => eng.deleteAccount());
}

/**
 * Gọi một lần khi app khởi động. Không đăng nhập → không làm gì (không tải
 * Firebase, không gọi mạng).
 */
export function initCloud() {
  if (!cloudEnabled || typeof window === "undefined") return;
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("online", () => state.user && syncNow());

  const hasSession = !!state.user;
  if (hasSession) startTracking();
  if (!hasSession && !isRedirectPending()) return;

  // Đợi app vẽ xong rồi mới tải Firebase — không giành băng thông với tab đầu tiên.
  const kick = () => {
    lastPullAt = Date.now();
    withEngine((eng) => eng.start());
  };
  if ("requestIdleCallback" in window) window.requestIdleCallback(kick, { timeout: 3000 });
  else setTimeout(kick, 1500);
}
