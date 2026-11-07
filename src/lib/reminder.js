// Nhắc học hằng ngày (Notification API).
//
// Giới hạn thật: app không có server đẩy thông báo, nên nhắc chỉ chạy khi trang
// đang mở (ở BẤT KỲ tab nào — trước đây chỉ chạy khi đang đứng ở tab Hôm nay).
//
// Hai lỗi cũ đã sửa ở đây:
//  · So khớp đúng PHÚT bằng setInterval 60s → trình duyệt làm chậm timer của tab
//    nền là lỡ mất phút đó, không bao giờ nhắc. Nay: quá giờ hẹn mà hôm nay chưa
//    học và chưa nhắc → nhắc một lần trong ngày.
//  · new Notification() ném lỗi "Illegal constructor" trên Chrome Android — ở đó
//    bắt buộc dùng ServiceWorkerRegistration.showNotification().

import { loadSettings } from "./userdata";
import { studiedToday, getStreak } from "./progress";
import { readJSON, writeJSON, dayKey } from "./storage";

const FIRED_KEY = "reminder_fired_v1";
const CHECK_MS = 30000;

async function showNotification(title, body) {
  const opts = { body, tag: "jlpt-reminder", icon: "/icon-192.png" };
  try {
    const reg =
      "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg) {
      await reg.showNotification(title, opts);
      return;
    }
  } catch {
    /* rơi xuống cách thứ hai */
  }
  try {
    new Notification(title, opts);
  } catch {
    /* trình duyệt không cho tạo thông báo kiểu này — bỏ qua */
  }
}

function check() {
  const s = loadSettings();
  if (!s.reminderOn || Notification.permission !== "granted") return;
  const today = dayKey();
  if (readJSON(FIRED_KEY, null) === today || studiedToday()) return;
  const [h, m] = String(s.reminderTime || "20:00").split(":").map(Number);
  const now = new Date();
  if (now.getHours() * 60 + now.getMinutes() < h * 60 + (m || 0)) return;
  writeJSON(FIRED_KEY, today);
  const streak = getStreak();
  showNotification(
    "JLPT N5 — đến giờ học rồi!",
    streak > 0 ? `Học vài phút để giữ chuỗi ${streak} ngày nhé!` : "Vài phút ôn thẻ mỗi ngày là đủ.",
  );
}

/** Bắt đầu theo dõi giờ nhắc. Trả về hàm dừng. */
export function startReminder() {
  if (typeof window === "undefined" || typeof Notification === "undefined") return () => {};
  check();
  const t = setInterval(check, CHECK_MS);
  const onVisible = () => {
    if (document.visibilityState === "visible") check();
  };
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    clearInterval(t);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
