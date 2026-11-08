// Nội dung hộp thoại tài khoản — nạp lazy khi người dùng mở, để bundle đầu
// chỉ chứa mỗi nút trên header.

import { useState } from "react";
import Modal from "./Modal";
import Avatar, { STATUS_TEXT } from "./AccountAvatar";
import { signIn, signOut, syncNow, deleteAccount, resolveFirstLogin } from "../../lib/cloud/store";

const MIN_SPIN_MS = 900;

function timeAgo(ms) {
  if (!ms) return null;
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 45) return "vừa xong";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} phút trước`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return new Date(ms).toLocaleString("vi-VN");
}

function Privacy() {
  return (
    <details className="acct-privacy">
      <summary>Chính sách quyền riêng tư</summary>
      <ul>
        <li>
          Khi đăng nhập, app lưu <strong>email, tên, ảnh đại diện</strong> (do Google cung cấp) và{" "}
          <strong>tiến độ học</strong> (thẻ SRS, chuỗi ngày học, bài thi, ghi chú, thẻ tự tạo, cài đặt)
          trên dịch vụ Google Firebase.
        </li>
        <li>Dữ liệu chỉ dùng để đồng bộ giữa các thiết bị của chính bạn. Không chia sẻ, không bán, không quảng cáo.</li>
        <li>Chỉ tài khoản của bạn mới đọc/ghi được dữ liệu của bạn.</li>
        <li>
          Bạn có thể xoá toàn bộ dữ liệu trên máy chủ bất cứ lúc nào bằng nút <em>Xoá tài khoản</em>. Không
          đăng nhập thì mọi thứ chỉ nằm trong trình duyệt này.
        </li>
      </ul>
    </details>
  );
}

function SignedOut({ cloud }) {
  const busy = cloud.status === "starting";
  return (
    <>
      <h2 className="acct-title">☁️ Đồng bộ tiến độ</h2>
      <p className="acct-lead">
        Đăng nhập để tiến độ học đi theo tài khoản: học trên máy tính, mở điện thoại là học tiếp đúng chỗ.
      </p>
      <ul className="acct-points">
        <li>Thẻ SRS, chuỗi ngày học, bài thi, ghi chú, thẻ tự tạo, cài đặt</li>
        <li>Tiến độ hiện có trên máy này được giữ lại và gộp vào tài khoản</li>
        <li>Vẫn học được khi mất mạng — có mạng lại sẽ tự đồng bộ</li>
      </ul>
      <button className="acct-google" onClick={signIn} disabled={busy}>
        <svg viewBox="0 0 48 48" aria-hidden="true" className="acct-google__g">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        {busy ? "Đang đăng nhập…" : "Đăng nhập với Google"}
      </button>
      {cloud.error && <p className="acct-error">⚠️ {cloud.error}</p>}
      <p className="acct-note">Không đăng nhập vẫn dùng đầy đủ mọi tính năng — tiến độ chỉ lưu trên trình duyệt này.</p>
      <Privacy />
    </>
  );
}

function SignedIn({ cloud }) {
  const { user } = cloud;
  const [leaving, setLeaving] = useState(false);
  const [wipeLocal, setWipeLocal] = useState(false);
  // Đồng bộ thật thường xong trong tích tắc → nút chớp một cái là thôi, người
  // dùng không thấy gì xảy ra. Giữ vòng xoay tối thiểu ~0,9 s cho có cảm giác.
  const [spinning, setSpinning] = useState(false);
  const syncing = spinning || cloud.status === "syncing";
  const busy = syncing || cloud.status === "starting";

  const onSync = async () => {
    setSpinning(true);
    try {
      await Promise.all([syncNow(), new Promise((r) => setTimeout(r, MIN_SPIN_MS))]);
    } finally {
      setSpinning(false);
    }
  };

  const onDelete = async () => {
    if (
      !window.confirm(
        "Xoá tài khoản sẽ XOÁ VĨNH VIỄN toàn bộ tiến độ đã lưu trên máy chủ và đăng xuất ở mọi thiết bị.\n" +
          "Tiến độ trên máy này vẫn được giữ. Tiếp tục?",
      )
    )
      return;
    await deleteAccount();
  };

  return (
    <>
      <div className="acct-user">
        <Avatar user={user} size="lg" />
        <div className="acct-user__txt">
          <div className="acct-user__name">{user.name || "Tài khoản Google"}</div>
          <div className="acct-user__mail">{user.email}</div>
        </div>
      </div>

      <div className={`acct-status acct-status--${cloud.status}`}>
        <span className="acct-status__dot" />
        <span>{STATUS_TEXT[cloud.status] || cloud.status}</span>
        {cloud.lastSyncAt && cloud.status !== "syncing" && (
          <span className="acct-status__ago">· lần cuối {timeAgo(cloud.lastSyncAt)}</span>
        )}
      </div>
      {cloud.error && <p className="acct-error">⚠️ {cloud.error}</p>}

      {!leaving ? (
        <div className="acct-actions">
          <button
            className={`acct-btn-act acct-btn-act--primary ${syncing ? "is-syncing" : ""}`}
            onClick={onSync}
            disabled={busy}
            aria-busy={syncing}
          >
            {syncing ? <span className="acct-spinner" aria-hidden="true" /> : "🔄 "}
            {syncing ? "Đang đồng bộ…" : "Đồng bộ ngay"}
          </button>
          <button className="acct-btn-act" onClick={() => setLeaving(true)} disabled={busy}>
            Đăng xuất
          </button>
        </div>
      ) : (
        <div className="acct-leave">
          <label className="acct-check">
            <input type="checkbox" checked={wipeLocal} onChange={(e) => setWipeLocal(e.target.checked)} />
            <span>
              Xoá tiến độ trên máy này <small>(dùng cho máy dùng chung — dữ liệu vẫn còn trên tài khoản)</small>
            </span>
          </label>
          <div className="acct-actions">
            <button className="acct-btn-act acct-btn-act--primary" onClick={() => signOut({ wipeLocal })}>
              Đăng xuất
            </button>
            <button className="acct-btn-act" onClick={() => setLeaving(false)}>
              Huỷ
            </button>
          </div>
        </div>
      )}

      <p className="acct-note">
        Tiến độ tự đồng bộ vài giây sau mỗi lần học, khi rời app và khi mở lại app.
      </p>
      <Privacy />
      <button className="acct-danger" onClick={onDelete} disabled={busy}>
        Xoá tài khoản &amp; dữ liệu trên máy chủ
      </button>
    </>
  );
}

function SummaryCol({ label, s }) {
  return (
    <div className="acct-cmp__col">
      <div className="acct-cmp__label">{label}</div>
      <div><strong>{s.cards}</strong> thẻ đã học</div>
      <div><strong>{s.days}</strong> ngày có học</div>
      <div><strong>{s.exams}</strong> lần thi thử</div>
    </div>
  );
}

export function FirstLoginDialog({ choice }) {
  return (
    <Modal
      onClose={() => resolveFirstLogin("cancel")}
      label="Gộp tiến độ khi đăng nhập"
      className="acct-overlay"
      panelClassName="acct-panel"
    >
      <h2 className="acct-title">🔀 Máy này và tài khoản đều có tiến độ</h2>
      <p className="acct-lead">Bạn muốn xử lý thế nào?</p>
      <div className="acct-cmp">
        <SummaryCol label="💻 Trên máy này" s={choice.local} />
        <SummaryCol label="☁️ Trên tài khoản" s={choice.remote} />
      </div>
      <div className="acct-choices">
        <button className="acct-btn-act acct-btn-act--primary" onClick={() => resolveFirstLogin("merge")}>
          🔀 Gộp cả hai <small>(khuyên dùng — không mất gì)</small>
        </button>
        <button className="acct-btn-act" onClick={() => resolveFirstLogin("remote")}>
          ☁️ Dùng tiến độ trên tài khoản <small>(bỏ tiến độ của máy này)</small>
        </button>
        <button className="acct-btn-act" onClick={() => resolveFirstLogin("local")}>
          💻 Dùng tiến độ của máy này <small>(ghi đè tài khoản)</small>
        </button>
        <button className="acct-link" onClick={() => resolveFirstLogin("cancel")}>
          Huỷ đăng nhập
        </button>
      </div>
    </Modal>
  );
}


export function AccountDialog({ cloud, onClose }) {
  return (
    <Modal onClose={onClose} label="Tài khoản & đồng bộ" className="acct-overlay" panelClassName="acct-panel">
      <button className="acct-close" onClick={onClose} aria-label="Đóng">
        ✕
      </button>
      {cloud.user ? <SignedIn cloud={cloud} /> : <SignedOut cloud={cloud} />}
    </Modal>
  );
}
