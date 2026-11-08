import { useState, lazy, Suspense } from "react";
import Avatar, { STATUS_TEXT } from "./AccountAvatar";
import { useCloud } from "../../lib/cloud/store";
import "../../styles/common/account.css";

/**
 * Nút tài khoản trên header. Hộp thoại tài khoản và hộp thoại chọn cách gộp
 * khi đăng nhập lần đầu nằm ở AccountPanel (nạp lazy). Ẩn hẳn khi chưa cấu
 * hình Firebase (.env.local).
 */

const AccountDialog = lazy(() => import("./AccountPanel").then((m) => ({ default: m.AccountDialog })));
const FirstLoginDialog = lazy(() =>
  import("./AccountPanel").then((m) => ({ default: m.FirstLoginDialog })),
);

export default function AccountButton() {
  const cloud = useCloud();
  const [open, setOpen] = useState(false);
  if (!cloud.enabled) return null;

  const { user } = cloud;
  return (
    <>
      <button
        className={`acct-trigger ${user ? "acct-trigger--in" : ""}`}
        onClick={() => setOpen(true)}
        aria-label={user ? `Tài khoản: ${user.email} — ${STATUS_TEXT[cloud.status]}` : "Đăng nhập để đồng bộ tiến độ"}
        title={user ? `${user.email} · ${STATUS_TEXT[cloud.status]}` : "Đăng nhập để đồng bộ tiến độ"}
      >
        {user ? (
          <>
            <Avatar user={user} />
            <span className={`acct-trigger__dot acct-status--${cloud.status}`} />
          </>
        ) : (
          <>
            <span aria-hidden="true">👤</span>
            <span className="acct-trigger__t">Đăng nhập</span>
          </>
        )}
      </button>

      <Suspense fallback={null}>
        {open && <AccountDialog cloud={cloud} onClose={() => setOpen(false)} />}
        {cloud.choice && <FirstLoginDialog choice={cloud.choice} />}
      </Suspense>
    </>
  );
}
