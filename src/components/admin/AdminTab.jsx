import { useState, useEffect, useCallback } from "react";
import { loadData, saveData } from "../../lib/adminApi";
import { Node } from "./JsonEditor";
import "../../styles/tabs/admin.css";

const FILES = [
  { id: "vocabulary",     icon: "📖", label: "Từ vựng" },
  { id: "grammar",        icon: "⚙️", label: "Ngữ pháp" },
  { id: "kanji",          icon: "🈳", label: "Kanji" },
  { id: "kana",           icon: "🔤", label: "Kana" },
  { id: "numbers",        icon: "🔢", label: "Số đếm" },
  { id: "tips-exercises", icon: "💡", label: "Mẹo & Lộ trình" },
  { id: "jlpt-sets",      icon: "📝", label: "Đề JLPT" },
];

export default function AdminTab() {
  const [file, setFile] = useState(FILES[0].id);
  const [data, setData] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchFile = useCallback(async (f) => {
    setLoading(true);
    setStatus({ type: "", msg: "" });
    try {
      const d = await loadData(f);
      setData(d);
      setDirty(false);
    } catch (e) {
      setData(null);
      setStatus({ type: "err", msg: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFile(file); }, [file, fetchFile]);

  const onSave = async () => {
    setSaving(true);
    setStatus({ type: "", msg: "" });
    try {
      await saveData(file, data);
      setDirty(false);
      setStatus({ type: "ok", msg: "✓ Đã lưu vào file. Trang học sẽ tự cập nhật." });
    } catch (e) {
      setStatus({ type: "err", msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  const current = FILES.find((f) => f.id === file);

  return (
    <div className="adm">
      <div className="section-header">
        <h2 className="section-title">🛠️ Quản trị nội dung</h2>
        <p className="section-desc">
          Thêm / sửa / xoá kiến thức từng tab. Lưu là ghi thẳng vào <code>src/data/*.json</code> — chỉ hoạt động khi chạy <code>npm run dev</code>.
        </p>
      </div>

      {/* Chọn file */}
      <div className="adm-files">
        {FILES.map((f) => (
          <button
            key={f.id}
            className={`adm-filebtn ${file === f.id ? "is-active" : ""}`}
            onClick={() => {
              if (dirty && !confirm("Bạn có thay đổi chưa lưu. Chuyển sang file khác?")) return;
              setFile(f.id);
            }}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {/* Thanh hành động */}
      <div className="adm-bar">
        <div className="adm-bar__title">
          {current.icon} {current.label}
          {dirty && <span className="adm-dot" title="Chưa lưu">●</span>}
        </div>
        <div className="adm-bar__actions">
          <button className="adm-btn adm-btn--ghost" onClick={() => fetchFile(file)} disabled={loading || saving}>
            ↺ Tải lại
          </button>
          <button className="adm-btn adm-btn--primary" onClick={onSave} disabled={!dirty || saving || loading || !data}>
            {saving ? "Đang lưu…" : "💾 Lưu"}
          </button>
        </div>
      </div>

      {status.msg && (
        <div className={`adm-status adm-status--${status.type}`}>{status.msg}</div>
      )}

      {/* Editor */}
      {loading ? (
        <div className="adm-loading">Đang tải…</div>
      ) : data ? (
        <div className="adm-editor">
          <Node
            value={data}
            depth={0}
            onChange={(nv) => { setData(nv); setDirty(true); }}
          />
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state__icon">⚠️</div>
          <p className="empty-state__text">Không tải được dữ liệu. Đảm bảo đang chạy <code>npm run dev</code>.</p>
        </div>
      )}
    </div>
  );
}
