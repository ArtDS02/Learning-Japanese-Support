import { useState, useEffect, useCallback } from "react";
import { loadData, saveData } from "../../lib/adminApi";
import { Node } from "./JsonEditor";
import "../../styles/tabs/admin.css";

// Phải khớp danh sách DATA_FILES trong vite.config.ts (whitelist phía server).
const FILES = [
  { id: "vocabulary",     icon: "📖", label: "Từ vựng" },
  { id: "grammar",        icon: "⚙️", label: "Ngữ pháp" },
  { id: "kanji",          icon: "🈳", label: "Kanji" },
  { id: "kanji-strokes",  icon: "✍️", label: "Nét kanji" },
  { id: "kana",           icon: "🔤", label: "Kana" },
  { id: "numbers",        icon: "🔢", label: "Số đếm" },
  { id: "modifiers",      icon: "🎨", label: "Từ bổ nghĩa" },
  { id: "tips-exercises", icon: "💡", label: "Mẹo & Lộ trình" },
  { id: "jlpt-sets",      icon: "📝", label: "Đề JLPT" },
  { id: "minimal-pairs",  icon: "👂", label: "Cặp âm dễ nhầm" },
  { id: "minna-no-nihongo-1/index", icon: "🎌", label: "Minna · mục lục" },
];

const MINNA = Array.from({ length: 25 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return { id: `minna-no-nihongo-1/lesson-${n}`, icon: "🎌", label: `Minna · Bài ${i + 1}` };
});

const ALL = [...FILES, ...MINNA];

export default function AdminTab() {
  const [file, setFile] = useState(FILES[0].id);
  const [data, setData] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Tải file khi đổi file / bấm "Tải lại". Mọi setState nằm trong callback của
  // promise — phần đặt `loading` do nơi kích hoạt (chọn file, tải lại) lo.
  useEffect(() => {
    let alive = true;
    loadData(file)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setDirty(false);
      })
      .catch((e) => {
        if (!alive) return;
        setData(null);
        setStatus({ type: "err", msg: e.message });
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [file, reloadKey]);

  const openFile = useCallback(
    (id) => {
      if (dirty && !confirm("Bạn có thay đổi chưa lưu. Chuyển sang file khác?")) return;
      setStatus({ type: "", msg: "" });
      setLoading(true);
      setFile(id);
      setReloadKey((k) => k + 1);
    },
    [dirty],
  );

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

  const current = ALL.find((f) => f.id === file) || FILES[0];
  const minnaOn = file.startsWith("minna-no-nihongo-1/lesson-");

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
            onClick={() => openFile(f.id)}
          >
            {f.icon} {f.label}
          </button>
        ))}
        <select
          className={`adm-filebtn ${minnaOn ? "is-active" : ""}`}
          value={minnaOn ? file : ""}
          onChange={(e) => e.target.value && openFile(e.target.value)}
          aria-label="Chọn bài Minna no Nihongo"
        >
          <option value="">🎌 Minna · chọn bài…</option>
          {MINNA.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Thanh hành động */}
      <div className="adm-bar">
        <div className="adm-bar__title">
          {current.icon} {current.label}
          {dirty && <span className="adm-dot" title="Chưa lưu">●</span>}
        </div>
        <div className="adm-bar__actions">
          <button
            className="adm-btn adm-btn--ghost"
            onClick={() => openFile(file)}
            disabled={loading || saving}
          >
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
