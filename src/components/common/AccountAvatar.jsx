import { useState } from "react";

export const STATUS_TEXT = {
  off: "Chưa đăng nhập",
  starting: "Đang kết nối…",
  syncing: "Đang đồng bộ…",
  idle: "Đã đồng bộ",
  pending: "Có thay đổi chờ đồng bộ",
  offline: "Mất mạng — sẽ tự đồng bộ khi có mạng",
  error: "Lỗi đồng bộ",
};

export default function Avatar({ user, size = "sm" }) {
  const [broken, setBroken] = useState(false);
  const initial = (user.name || user.email || "?").trim().charAt(0).toUpperCase();
  if (user.photo && !broken) {
    return (
      <img
        className={`acct-avatar acct-avatar--${size}`}
        src={user.photo}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    );
  }
  return <span className={`acct-avatar acct-avatar--${size} acct-avatar--txt`}>{initial}</span>;
}

