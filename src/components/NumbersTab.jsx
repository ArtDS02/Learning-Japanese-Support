import { useState } from "react";
import data from "../data/numbers.json";

export default function NumbersTab() {
  const [section, setSection] = useState("numbers");

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">🔢 Số đếm & Bộ đếm</h2>
        <p className="section-desc">Số đếm Nhật Bản, bộ đếm (counter), ngày trong tuần</p>
      </div>

      <div className="filter-bar">
        <span className="filter-label">Phần:</span>
        {[
          { id: "numbers", label: "🔢 Số cơ bản", color: "#facc15" },
          { id: "counters", label: "📦 Bộ đếm", color: "#22d3ee" },
          { id: "weekdays", label: "📅 Ngày trong tuần", color: "#a78bfa" },
        ].map(s => (
          <button key={s.id} className={`filter-btn ${section === s.id ? "filter-btn--active" : ""}`}
            style={section === s.id ? { background: s.color, color: "#0a0b0f" } : {}}
            onClick={() => setSection(s.id)}>{s.label}</button>
        ))}
      </div>

      {/* Numbers */}
      {section === "numbers" && (
        <div>
          <div style={{ padding: 14, background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.2)", borderRadius: "var(--radius-md)", fontSize: 13, color: "var(--accent-yellow)", marginBottom: 20 }}>
            💡 Số 4 và 7 có 2 cách đọc: し/よん và しち/なな. Tùy ngữ cảnh mà chọn cách đọc phù hợp!
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {data.numbers.map((n, i) => (
              <div key={i} className="word-card" style={{ "--card-color": "var(--accent-yellow)", textAlign: "center", animationDelay: `${i * 40}ms` }}>
                <div style={{ fontSize: 42, fontWeight: 800, color: "var(--accent-yellow)", marginBottom: 4 }}>{n.kanji}</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{n.num.toLocaleString()}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent-cyan)", marginBottom: 2 }}>{n.hira}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>{n.romaji}</div>
              </div>
            ))}
          </div>

          {/* Combination examples */}
          <div style={{ marginTop: 28, background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "var(--radius-lg)", padding: 24 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, marginBottom: 16, color: "var(--accent-yellow)" }}>
              🔗 Ghép số — Ví dụ
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
              {[
                { n: "11", jp: "十一", hira: "じゅういち" },
                { n: "20", jp: "二十", hira: "にじゅう" },
                { n: "35", jp: "三十五", hira: "さんじゅうご" },
                { n: "100", jp: "百", hira: "ひゃく" },
                { n: "200", jp: "二百", hira: "にひゃく" },
                { n: "300", jp: "三百", hira: "さんびゃく ⚠️" },
                { n: "600", jp: "六百", hira: "ろっぴゃく ⚠️" },
                { n: "1000", jp: "千", hira: "せん" },
                { n: "3000", jp: "三千", hira: "さんぜん ⚠️" },
                { n: "8000", jp: "八千", hira: "はっせん ⚠️" },
                { n: "10000", jp: "一万", hira: "いちまん" },
                { n: "50000", jp: "五万", hira: "ごまん" },
              ].map((ex, i) => (
                <div key={i} style={{ padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{ex.jp}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)" }}>{ex.hira}</div>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent-yellow)", fontWeight: 700 }}>{ex.n}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, fontSize: 12, color: "var(--accent-orange)", padding: "8px 12px", background: "rgba(249,115,22,0.08)", borderRadius: "var(--radius-sm)" }}>
              ⚠️ Chú ý biến âm: 三百=さんびゃく, 六百=ろっぴゃく, 八百=はっぴゃく, 三千=さんぜん, 八千=はっせん
            </div>
          </div>
        </div>
      )}

      {/* Counters */}
      {section === "counters" && (
        <div>
          <div style={{ padding: 14, background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)", borderRadius: "var(--radius-md)", fontSize: 13, color: "var(--accent-cyan)", marginBottom: 20 }}>
            💡 Tiếng Nhật có nhiều "bộ đếm" (counter) khác nhau tùy theo loại vật đếm. Đây là điểm khó nhưng rất quan trọng!
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {data.counters.map((counter, ci) => (
              <div key={counter.id} className="word-card" style={{ "--card-color": counter.color, animationDelay: `${ci * 80}ms` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 800, color: counter.color, padding: "4px 12px", background: `${counter.color}22`, border: `1px solid ${counter.color}44`, borderRadius: "var(--radius-sm)" }}>{counter.suffix}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{counter.use}</div>
                  </div>
                </div>
                {counter.note && (
                  <div style={{ fontSize: 12, color: "var(--accent-orange)", padding: "6px 10px", background: "rgba(249,115,22,0.08)", borderRadius: "var(--radius-sm)", marginBottom: 12 }}>
                    {counter.note}
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginBottom: 12 }}>
                  {counter.readings.map((r, i) => (
                    <div key={i} style={{ textAlign: "center", padding: "8px 4px", background: r.read.includes("⚠️") ? `${counter.color}20` : "rgba(255,255,255,0.03)", border: `1px solid ${r.read.includes("⚠️") ? counter.color + "44" : "var(--bg-border)"}`, borderRadius: "var(--radius-sm)" }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>{r.n}</div>
                      <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: r.read.includes("⚠️") ? counter.color : "var(--text-primary)", fontWeight: r.read.includes("⚠️") ? 700 : 400 }}>
                        {r.read.replace(" ⚠️", "")}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius-sm)", borderLeft: `2px solid ${counter.color}` }}>
                  📝 {counter.example}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekdays */}
      {section === "weekdays" && (
        <div>
          <div style={{ padding: 14, background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: "var(--radius-md)", fontSize: 13, color: "var(--accent-violet)", marginBottom: 20 }}>
            💡 7 ngày trong tuần dùng tên 7 nguyên tố: Trăng (月), Lửa (火), Nước (水), Cây (木), Vàng (金), Đất (土), Mặt trời (日). Rất dễ nhớ!
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {data.weekdays.map((d, i) => (
              <div key={i} className="word-card" style={{ "--card-color": d.color, textAlign: "center", animationDelay: `${i * 60}ms` }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: d.color, marginBottom: 6 }}>{d.jp}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--accent-cyan)", marginBottom: 2 }}>{d.hira}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>{d.romaji}</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{d.vn}</div>
                <div style={{ fontSize: 12, padding: "4px 10px", background: `${d.color}20`, color: d.color, borderRadius: 20, display: "inline-block" }}>
                  {d.kanji_meaning}
                </div>
              </div>
            ))}
          </div>

          {/* Time expressions */}
          <div style={{ marginTop: 28, background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "var(--radius-lg)", padding: 24 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, marginBottom: 16, color: "var(--accent-violet)" }}>
              📅 Biểu thức thời gian hay dùng
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
              {[
                { jp: "今日", hira: "きょう", vn: "hôm nay" },
                { jp: "明日", hira: "あした", vn: "ngày mai" },
                { jp: "昨日", hira: "きのう", vn: "hôm qua" },
                { jp: "今週", hira: "こんしゅう", vn: "tuần này" },
                { jp: "来週", hira: "らいしゅう", vn: "tuần sau" },
                { jp: "先週", hira: "せんしゅう", vn: "tuần trước" },
                { jp: "今月", hira: "こんげつ", vn: "tháng này" },
                { jp: "来月", hira: "らいげつ", vn: "tháng sau" },
                { jp: "先月", hira: "せんげつ", vn: "tháng trước" },
                { jp: "今年", hira: "ことし", vn: "năm nay" },
                { jp: "来年", hira: "らいねん", vn: "năm sau" },
                { jp: "去年", hira: "きょねん", vn: "năm ngoái" },
                { jp: "毎日", hira: "まいにち", vn: "mỗi ngày" },
                { jp: "毎週", hira: "まいしゅう", vn: "mỗi tuần" },
                { jp: "毎月", hira: "まいつき", vn: "mỗi tháng" },
                { jp: "毎年", hira: "まいとし", vn: "mỗi năm" },
              ].map((ex, i) => (
                <div key={i} style={{ padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius-sm)", border: "1px solid var(--bg-border)" }}>
                  <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 2 }}>{ex.jp}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent-cyan)", marginBottom: 2 }}>{ex.hira}</div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{ex.vn}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
