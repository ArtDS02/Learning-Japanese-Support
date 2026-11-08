// Phần thực thi đồng bộ — chứa Firebase SDK nên CHỈ được nạp qua import()
// (store.js → loadEngine). Mọi quyết định "lấy bản nào" nằm ở syncCore.js.

import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  reauthenticateWithPopup,
  signOut as fbSignOut,
  deleteUser,
  connectAuthEmulator,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore/lite";

import { firebaseConfig, useEmulator } from "./config";
import { SYNCED_KEYS } from "../dataKeys";
import { invalidateSrs } from "../srs";
import { invalidateRuns } from "../runstate";
import { wipeAll } from "../backup";
import { resolvePull, firstLoginCase, planFirstLogin, dirtyKeys, afterPush } from "./syncCore";
import {
  getCloudState,
  setCloudState,
  loadMeta,
  saveMeta,
  saveSession,
  markRedirectPending,
  startTracking,
  stopTracking,
  friendlyError,
  isRedirectPending,
} from "./store";

const MAX_DOC_CHARS = 900000; // Firestore giới hạn 1MB/document — chừa chỗ cho field khác
const MAX_BATCH = 400; // Firestore cho tối đa 500 thao tác/batch

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
if (useEmulator) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

const kvCol = (uid) => collection(db, "users", uid, "kv");

// ── Tiện ích ─────────────────────────────────────────────────────────────────

function newDeviceId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }
}

function readRaw(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Ghi dữ liệu từ tài khoản xuống máy rồi báo cho các màn hình đang mở. Ghi
 * thẳng localStorage (không qua writeJSON) để không bị tính là "máy này vừa sửa".
 * Các module (srs, progress, userdata, minna, đánh dấu từ/kanji…) vốn đã nghe sự
 * kiện `storage` để đồng bộ giữa các tab — phát sự kiện giả là chúng tự đọc lại.
 */
function applyLocal(changes) {
  const keys = Object.keys(changes);
  if (!keys.length) return;
  for (const key of keys) {
    const raw = changes[key];
    try {
      if (raw == null) localStorage.removeItem(key);
      else localStorage.setItem(key, raw);
    } catch {
      /* hết dung lượng — bỏ qua khoá này */
    }
  }
  invalidateSrs();
  invalidateRuns();
  for (const key of keys) {
    try {
      window.dispatchEvent(
        new StorageEvent("storage", { key, newValue: changes[key], storageArea: localStorage }),
      );
    } catch {
      /* trình duyệt cũ không dựng được StorageEvent */
    }
  }
}

const tsToCursor = (ts) => (ts ? { s: ts.seconds, ns: ts.nanoseconds } : null);
const laterCursor = (a, b) => {
  if (!a) return b;
  if (!b) return a;
  return b.s > a.s || (b.s === a.s && b.ns > a.ns) ? b : a;
};

function docsToMap(snap) {
  const map = {};
  let cursor = null;
  snap.forEach((d) => {
    const data = d.data();
    map[d.id] = { v: data.v ?? null, t: data.t, dev: data.dev };
    cursor = laterCursor(cursor, tsToCursor(data.st));
  });
  return { map, cursor };
}

/**
 * Dùng đăng nhập kiểu chuyển trang thay cho popup:
 *   · app chạy dạng PWA "thêm vào màn hình chính" — popup ở đó (nhất là iOS)
 *     hay bị chặn hoặc mở ra cửa sổ không quay về được;
 *   · dev + emulator, khi bật cờ `dev_auth_redirect` trong localStorage (để test
 *     luồng này trên trình duyệt không mở được popup).
 */
function preferRedirect() {
  try {
    if (window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone) return true;
    return useEmulator && localStorage.getItem("dev_auth_redirect") === "1";
  } catch {
    return false;
  }
}

function userInfo(u) {
  return { uid: u.uid, email: u.email || "", name: u.displayName || "", photo: u.photoURL || "" };
}

// Mọi thao tác mạng chạy nối tiếp nhau — không bao giờ có hai lần đẩy/kéo chồng chéo.
let chain = Promise.resolve();
function serial(fn) {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
}

async function guarded(fn) {
  setCloudState({ status: "syncing", error: null });
  try {
    await fn();
    const meta = loadMeta();
    const lastSyncAt = Date.now();
    if (meta) saveMeta({ ...meta, lastSyncAt });
    setCloudState({
      status: dirtyKeys(loadMeta()).length ? "pending" : "idle",
      lastSyncAt,
      error: null,
    });
  } catch (e) {
    const offline = navigator.onLine === false || e?.code === "unavailable";
    setCloudState({ status: offline ? "offline" : "error", error: offline ? null : friendlyError(e) });
    throw e;
  }
}

// ── Kéo về / đẩy lên ─────────────────────────────────────────────────────────

async function pullOnce(uid) {
  const meta = loadMeta();
  const col = kvCol(uid);
  const q = meta.cursor
    ? query(col, where("st", ">", new Timestamp(meta.cursor.s, meta.cursor.ns)))
    : col;
  const { map, cursor } = docsToMap(await getDocs(q));

  // Đọc lại meta: người dùng có thể vừa chấm thêm thẻ trong lúc chờ mạng.
  const fresh = loadMeta();
  const keys = { ...fresh.keys };
  const changes = {};
  for (const [key, remote] of Object.entries(map)) {
    const localRaw = readRaw(key);
    const r = resolvePull({ key, localRaw, entry: keys[key], remote });
    if (r.type === "skip") continue;
    const e = keys[key] || { t: 0 };
    if (r.type === "apply") {
      if (r.raw !== localRaw) changes[key] = r.raw;
      keys[key] = { ...e, base: r.base, dirty: false };
    } else if (r.type === "merge") {
      if (r.raw !== localRaw) changes[key] = r.raw;
      keys[key] = { ...e, t: Math.max(Date.now(), (e.t || 0) + 1), base: r.base, dirty: true };
    } else {
      keys[key] = { ...e, base: r.base, dirty: true };
    }
  }
  saveMeta({ ...fresh, keys, cursor: laterCursor(fresh.cursor, cursor) });
  applyLocal(changes);
}

async function pushOnce(uid) {
  const meta = loadMeta();
  const keys = dirtyKeys(meta);
  if (!keys.length) return;
  for (let i = 0; i < keys.length; i += MAX_BATCH) {
    const batch = writeBatch(db);
    const sent = {};
    for (const key of keys.slice(i, i + MAX_BATCH)) {
      const raw = readRaw(key);
      if (raw != null && raw.length > MAX_DOC_CHARS) {
        console.warn(`[sync] "${key}" quá lớn để đồng bộ (${raw.length} ký tự) — bỏ qua.`);
        continue;
      }
      const t = meta.keys[key].t;
      batch.set(doc(db, "users", uid, "kv", key), {
        v: raw,
        t,
        st: serverTimestamp(),
        dev: meta.deviceId,
      });
      sent[key] = t;
    }
    if (!Object.keys(sent).length) continue;
    await batch.commit();
    saveMeta(afterPush(loadMeta(), sent));
  }
}

// ── Đăng nhập lần đầu trên máy này ───────────────────────────────────────────

let pendingFirst = null; // { uid, remoteMap, cursor }

function summarize(map) {
  const parse = (k) => {
    try {
      return JSON.parse(map[k] ?? "null");
    } catch {
      return null;
    }
  };
  const srs = parse("srs_state_v1") || {};
  const cards = Object.values(srs).reduce(
    (n, bag) => n + Object.values(bag || {}).filter((c) => (c?.box || 0) > 0).length,
    0,
  );
  const days = Object.keys(parse("progress_v1")?.daily || {}).length;
  const exams = (parse("exam_history_v1") || []).length;
  return { cards, days, exams };
}

async function beginFirstLogin(uid) {
  const { map: remoteMap, cursor } = docsToMap(await getDocs(kvCol(uid)));
  const localMap = Object.fromEntries(SYNCED_KEYS.map((k) => [k, readRaw(k)]));
  const kind = firstLoginCase(localMap, remoteMap);
  if (kind === "ask") {
    pendingFirst = { uid, remoteMap, cursor };
    const remoteRaw = Object.fromEntries(Object.entries(remoteMap).map(([k, d]) => [k, d.v]));
    setCloudState({
      status: "starting",
      choice: { local: summarize(localMap), remote: summarize(remoteRaw) },
    });
    return; // chờ người dùng chọn → resolveFirstLogin()
  }
  await finishFirstLogin(uid, remoteMap, cursor, "merge");
}

async function finishFirstLogin(uid, remoteMap, cursor, choice) {
  const localMap = Object.fromEntries(SYNCED_KEYS.map((k) => [k, readRaw(k)]));
  const plan = planFirstLogin(localMap, remoteMap, choice, Date.now());
  const prev = loadMeta();
  saveMeta({
    uid,
    deviceId: prev?.deviceId || newDeviceId(),
    cursor,
    keys: plan.keys,
  });
  applyLocal(plan.local);
  startTracking();
  await pushOnce(uid);
}

// ── API (được store.js gọi qua loadEngine) ───────────────────────────────────

async function adoptUser(u) {
  const info = userInfo(u);
  saveSession(info);
  setCloudState({ user: info });
  const meta = loadMeta();
  if (!meta || meta.uid !== u.uid) {
    await serial(() => guarded(() => beginFirstLogin(u.uid)));
  } else {
    startTracking();
    await sync();
  }
}

/** Khởi động khi máy đã đăng nhập từ trước (hoặc vừa quay về từ trang đăng nhập redirect). */
export async function start() {
  // Chỉ hỏi kết quả redirect khi thật sự vừa đi đăng nhập kiểu chuyển trang:
  // getRedirectResult phải tải iframe của trang auth — tốn một lượt mạng vô ích.
  if (isRedirectPending()) {
    try {
      await getRedirectResult(auth);
    } catch (e) {
      setCloudState({ error: friendlyError(e) });
    }
    markRedirectPending(false);
  }
  await auth.authStateReady();
  const u = auth.currentUser;
  if (!u) {
    // Phiên hết hạn / bị thu hồi ở nơi khác: quay về chế độ không đăng nhập.
    // Tiến độ vẫn nằm nguyên trên máy.
    if (getCloudState().user) setCloudState({ error: "Phiên đăng nhập đã hết hạn — đăng nhập lại để tiếp tục đồng bộ." });
    stopTracking();
    saveSession(null);
    setCloudState({ user: null, status: "off" });
    return;
  }
  await adoptUser(u);
}

export async function signIn() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  let cred;
  if (preferRedirect()) {
    markRedirectPending(true);
    await signInWithRedirect(auth, provider);
    return;
  }
  try {
    cred = await signInWithPopup(auth, provider);
  } catch (e) {
    // Trình duyệt chặn popup (một số webview / PWA trên iOS) → chuyển trang.
    if (e?.code === "auth/popup-blocked" || e?.code === "auth/operation-not-supported-in-this-environment") {
      markRedirectPending(true);
      await signInWithRedirect(auth, provider);
      return;
    }
    setCloudState({ status: getCloudState().user ? "idle" : "off", error: friendlyError(e) });
    return;
  }
  await adoptUser(cred.user);
}

export async function resolveFirstLogin(choice) {
  const p = pendingFirst;
  if (!p) return;
  if (choice === "cancel") {
    pendingFirst = null;
    setCloudState({ choice: null });
    await signOut({});
    return;
  }
  pendingFirst = null;
  setCloudState({ choice: null });
  await serial(() => guarded(() => finishFirstLogin(p.uid, p.remoteMap, p.cursor, choice)));
}

export function sync() {
  const u = auth.currentUser;
  if (!u) return Promise.resolve();
  return serial(() =>
    guarded(async () => {
      if (loadMeta()?.uid !== u.uid) return;
      await pullOnce(u.uid);
      await pushOnce(u.uid);
    }),
  );
}

export function push() {
  const u = auth.currentUser;
  if (!u || loadMeta()?.uid !== u.uid) return Promise.resolve();
  return serial(() => guarded(() => pushOnce(u.uid)));
}

function forgetSession() {
  stopTracking();
  saveSession(null);
  saveMeta(null);
  setCloudState({ user: null, status: "off", choice: null, lastSyncAt: null });
}

/** @param {{ wipeLocal?: boolean }} opts */
export async function signOut({ wipeLocal = false } = {}) {
  // Đẩy nốt phần chưa đồng bộ trước khi thoát — không thì mất trên tài khoản.
  try {
    if (auth.currentUser && dirtyKeys(loadMeta()).length) await push();
  } catch {
    /* mất mạng: phần chưa đẩy vẫn còn trên máy (trừ khi xoá), lần đăng nhập sau sẽ gộp lại */
  }
  await fbSignOut(auth).catch(() => {});
  forgetSession();
  if (wipeLocal) {
    wipeAll();
    window.location.reload();
  }
}

/** Xoá toàn bộ dữ liệu trên tài khoản và chính tài khoản. Tiến độ trên máy giữ nguyên. */
export async function deleteAccount() {
  const u = auth.currentUser;
  if (!u) return;
  setCloudState({ status: "syncing", error: null });
  try {
    const snap = await getDocs(kvCol(u.uid));
    const refs = snap.docs.map((d) => d.ref);
    for (let i = 0; i < refs.length; i += MAX_BATCH) {
      const batch = writeBatch(db);
      refs.slice(i, i + MAX_BATCH).forEach((r) => batch.delete(r));
      await batch.commit();
    }
    try {
      await deleteUser(u);
    } catch (e) {
      if (e?.code !== "auth/requires-recent-login") throw e;
      await reauthenticateWithPopup(u, new GoogleAuthProvider());
      await deleteUser(u);
    }
    forgetSession();
  } catch (e) {
    setCloudState({ status: "error", error: friendlyError(e) });
    throw e;
  }
}
