// Phát âm tiếng Nhật bằng Web Speech API (SpeechSynthesis) — miễn phí, không
// cần thu âm, không tốn dung lượng bundle.
//
// Giới hạn thực tế cần biết:
//  · Chất lượng & sự tồn tại của giọng `ja` phụ thuộc hệ điều hành. Máy không có
//    giọng Nhật thì `hasJaVoice()` trả false → UI nên ẩn nút loa.
//  · Safari/iOS chỉ cho phát trong một user gesture (click) — mọi chỗ gọi speak()
//    trong app này đều nằm trong onClick nên hợp lệ.
//  · Danh sách giọng của Chrome nạp bất đồng bộ ⇒ có `onVoicesReady`.

import { readJSON, writeJSON } from "./storage";

const CFG_KEY = "tts_cfg_v1";
const synth = typeof window !== "undefined" ? window.speechSynthesis : null;

let voices = [];
let jaVoice = null;
const readyListeners = new Set();

// Ưu tiên các giọng Nhật chất lượng tốt thường có trên từng hệ điều hành.
const PREFERRED = [
  "Google 日本語",
  "Microsoft Nanami",
  "Microsoft Ayumi",
  "Microsoft Haruka",
  "Kyoko",
  "Otoya",
  "O-ren",
];

function pickJaVoice(list) {
  const ja = list.filter((v) => /^ja(-|_|$)/i.test(v.lang));
  if (!ja.length) return null;
  for (const name of PREFERRED) {
    const hit = ja.find((v) => v.name.includes(name));
    if (hit) return hit;
  }
  return ja.find((v) => v.localService) || ja[0];
}

function refreshVoices() {
  if (!synth) return;
  voices = synth.getVoices() || [];
  jaVoice = pickJaVoice(voices);
  if (voices.length) readyListeners.forEach((fn) => fn());
}

if (synth) {
  refreshVoices();
  // Chrome nạp voices sau một nhịp — nghe sự kiện để cập nhật.
  if ("onvoiceschanged" in synth) synth.onvoiceschanged = refreshVoices;
  // Một số bản Chrome không bắn onvoiceschanged; thử lại vài lần cho chắc.
  let tries = 0;
  const t = setInterval(() => {
    if (voices.length || tries++ > 10) clearInterval(t);
    else refreshVoices();
  }, 300);
}

/** Trình duyệt có hỗ trợ SpeechSynthesis hay không. */
export function ttsSupported() {
  return !!synth && typeof window.SpeechSynthesisUtterance === "function";
}

/** Máy có giọng tiếng Nhật để phát hay không. */
export function hasJaVoice() {
  return !!jaVoice;
}

export function jaVoiceName() {
  return jaVoice?.name || null;
}

/** Gọi lại khi danh sách giọng đã nạp xong (để UI hiện/ẩn nút loa). */
export function onVoicesReady(fn) {
  readyListeners.add(fn);
  return () => readyListeners.delete(fn);
}

// ── Cấu hình người dùng (tốc độ đọc) ────────────────────────────────────────

export function loadTtsCfg() {
  const c = readJSON(CFG_KEY, {});
  return { rate: typeof c.rate === "number" ? c.rate : 0.9, enabled: c.enabled !== false };
}

export function saveTtsCfg(patch) {
  const next = { ...loadTtsCfg(), ...patch };
  writeJSON(CFG_KEY, next);
  return next;
}

// ── Phát âm ─────────────────────────────────────────────────────────────────

/**
 * Đọc `text` bằng giọng Nhật.
 * opts: { rate, onEnd, onStart } — rate mặc định lấy từ cấu hình người dùng.
 * Trả về true nếu đã phát được.
 */
export function speak(text, opts = {}) {
  if (!ttsSupported() || !text) return false;
  const cfg = loadTtsCfg();
  if (!cfg.enabled) return false;

  // Bỏ ký hiệu chỉ dùng cho phần hiển thị: <trợ từ>, ⚠️, dấu ngoặc chú thích.
  const clean = String(text)
    .replace(/[<>]/g, "")
    .replace(/⚠️/g, "")
    .replace(/[（(][^)）]*[)）]/g, " ")
    .trim();
  if (!clean) return false;

  synth.cancel(); // luôn cắt câu đang đọc để bấm liên tục không bị dồn
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = "ja-JP";
  if (jaVoice) u.voice = jaVoice;
  u.rate = opts.rate ?? cfg.rate;
  u.pitch = 1;
  if (opts.onEnd) {
    u.onend = opts.onEnd;
    u.onerror = opts.onEnd;
  }
  if (opts.onStart) u.onstart = opts.onStart;
  synth.speak(u);
  return true;
}

export function stopSpeaking() {
  if (synth) synth.cancel();
}

/** Đọc lần lượt nhiều câu, cách nhau `gap` ms (dùng cho hội thoại phần Nghe). */
export function speakSequence(lines, { rate, gap = 450, onEnd, onLine } = {}) {
  const list = (lines || []).filter(Boolean);
  if (!ttsSupported() || !list.length) return () => {};
  let i = 0;
  let cancelled = false;
  let timer = null;

  const next = () => {
    if (cancelled) return;
    if (i >= list.length) {
      onEnd?.();
      return;
    }
    const idx = i++;
    onLine?.(idx);
    speak(list[idx], {
      rate,
      onEnd: () => {
        if (cancelled) return;
        timer = setTimeout(next, gap);
      },
    });
  };
  next();

  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
    stopSpeaking();
  };
}

export function ttsStorageKey() {
  return CFG_KEY;
}
