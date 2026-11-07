import { Component } from "react";

// Lỗi kiểu này nghĩa là trình duyệt đang chạy bản app CŨ và đòi một chunk đã bị
// xoá sau lần deploy mới — tải lại trang (lấy index.html mới) là hết.
const CHUNK_ERROR = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Unexpected token '<'|MIME type/i;
const RELOAD_FLAG = "chunk-reload-at";

function isChunkError(error) {
  return CHUNK_ERROR.test(String(error?.message || error));
}

/**
 * Chặn lỗi render trong MỘT tab: trước đây không có boundary nào, một lỗi bất kỳ
 * (hoặc thiếu chunk sau deploy) làm trắng toàn bộ app.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    if (!isChunkError(error)) return;
    // Tự tải lại một lần; nếu vừa tải lại < 30 giây mà vẫn lỗi thì dừng, tránh vòng lặp.
    try {
      const last = Number(sessionStorage.getItem(RELOAD_FLAG) || 0);
      if (Date.now() - last > 30000) {
        sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
        window.location.reload();
      }
    } catch {
      /* sessionStorage bị chặn — để người dùng tự bấm nút tải lại */
    }
  }

  componentDidUpdate(prev) {
    // Đổi sang tab khác thì thử render lại.
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const chunk = isChunkError(error);
    return (
      <div className="err-box" role="alert">
        <div className="err-box__icon">{chunk ? "🔄" : "⚠️"}</div>
        <div className="err-box__title">
          {chunk ? "App vừa được cập nhật" : "Phần này gặp lỗi khi hiển thị"}
        </div>
        <p className="err-box__text">
          {chunk
            ? "Trình duyệt đang giữ bản cũ. Tải lại trang để dùng bản mới — tiến độ học không bị mất."
            : "Tiến độ học của bạn vẫn an toàn. Thử tải lại trang hoặc chuyển sang tab khác."}
        </p>
        <button className="err-box__btn" onClick={() => window.location.reload()}>
          Tải lại trang
        </button>
      </div>
    );
  }
}
