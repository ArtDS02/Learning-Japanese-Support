import { useState, useMemo, useEffect } from "react";
import { getStats, orderForStudy } from "../lib/srs";
import { modifierWords, modifierGroups, posMeta, confusables } from "../lib/modifiers";
import { shuffle } from "../lib/random";
import StudyRunner from "./common/StudyRunner";
import SpeakButton from "./common/SpeakButton";
import NoteBox from "./common/NoteBox";
import FilterRow from "./common/FilterRow";
import "../styles/tabs/modifiers.css";

/* ── Tại sao có tab riêng ──────────────────────────────────────────────────────
   "Từ bổ nghĩa" không phải một chủ đề từ vựng (như Ẩm thực, Gia đình) mà là một
   NHÓM CHỨC NĂNG NGỮ PHÁP cắt ngang mọi chủ đề: とても bổ nghĩa tính từ, うえ là
   danh từ vị trí, この là 連体詞, だけ là trợ từ. Nhồi chúng vào vocabulary.json
   sẽ mất đúng thứ quan trọng nhất — TỪ LOẠI và ĐỐI TƯỢNG ĐƯỢC BỔ NGHĨA — vì mô
   hình thẻ từ vựng ở đó không có hai trường này.
   Nên: data riêng + bảng riêng có đủ cột, nhưng vẫn dùng chung engine SRS,
   StudyRunner và tìm kiếm toàn cục của app.
*/

const VIEWS = [
  { id: "table", label: "📋 Bảng tra" },
  { id: "cards", label: "🃏 Thẻ chi tiết" },
  { id: "confuse", label: "⚠️ Từ dễ nhầm" },
  { id: "sheet", label: "📝 Cheat sheet" },
];

const LEVELS = [
  { id: "all", label: "Tất cả" },
  { id: "N5", label: "N5" },
  { id: "N4", label: "N4" },
];

/* Quy tắc biến từ thành dạng bổ nghĩa — thứ hay bị nhớ lộn nhất khi mới học. */
const ADV_RULES = [
  { from: "い形容詞", to: "〜く", ex: "はやい → はやく 起きる", color: "#facc15" },
  { from: "な形容詞", to: "〜に", ex: "しずかな → しずかに して", color: "#f472b6" },
  { from: "名詞", to: "〜で / 〜に", ex: "ひとり → ひとりで 行く", color: "#a78bfa" },
  { from: "連体詞", to: "đứng trước N", ex: "この 本 (không chia, không thêm の/な)", color: "#34d399" },
  { from: "助詞", to: "đứng sau N", ex: "水だけ 飲む (không đứng trước)", color: "#f97316" },
];

const GROUPS = modifierGroups();
const ALL_WORDS = modifierWords();
const GROUP_BY_ID = Object.fromEntries(GROUPS.map((g) => [g.id, g]));
const CONFUSABLES = confusables();

/** Cách đọc dùng cho TTS: bỏ ngoặc và chỉ lấy biến thể đầu ở các mục "A・B". */
const sayable = (w) => String(w.hira || w.jp).replace(/[（）()]/g, "").split("・")[0].trim();

const posOf = posMeta;

/** Thẻ lật: mặt trước là từ tiếng Nhật, mặt sau là nghĩa + từ loại + đối tượng bổ nghĩa. */
function flashOf(w, { reverse = false } = {}) {
  const p = posOf(w.pos);
  const base = {
    deck: "modifiers",
    kind: "flash",
    id: w.id,
    tab: "modifiers",
    tag: `${w.groupIcon} ${w.groupLabel} · ${p.short}`,
    color: w.groupColor,
    noteKind: "modifiers",
    example: { jp: w.ex.jp, vn: w.ex.vn },
    extra: [
      `${p.jp}（${p.kana}）${w.posNote ? ` — ${w.posNote}` : ""}`,
      `Bổ nghĩa cho: ${w.modifies}`,
      ...(w.note ? [`💡 ${w.note}`] : []),
    ],
  };

  if (reverse) {
    return {
      ...base,
      front: w.vn,
      frontSub: `${w.groupLabel} · ${p.short}`,
      back: w.jp,
      backSub: w.jp === w.hira ? w.romaji : `${w.hira} · ${w.romaji}`,
      speakBack: sayable(w), // nghe trước khi lật là lộ đáp án
    };
  }

  return {
    ...base,
    front: w.jp,
    frontSub: w.jp === w.hira ? w.romaji : `${w.hira} · ${w.romaji}`,
    back: w.vn,
    backSub: `${p.jp} · bổ nghĩa cho ${w.modifies}`,
    speak: sayable(w), // cách đọc KHÔNG phải đáp án nên nghe trước được
  };
}

/** Nhãn từ loại — dùng ở cả bảng tra và thẻ, nên tách ra một chỗ. */
function PosBadge({ pos, note }) {
  const p = posOf(pos);
  return (
    <span className="mod-pos" style={{ "--c": p.color }} title={`${p.jp}（${p.kana}）— ${p.vn}`}>
      <span className="mod-pos__jp">{p.jp}</span>
      <span className="mod-pos__vn">{p.vn}</span>
      {note && <span className="mod-pos__note">{note}</span>}
    </span>
  );
}

function PracticeBar({ words, onStart, onReverse }) {
  const stats = getStats("modifiers", ALL_WORDS.map((w) => w.id));
  return (
    <div className="pbar pbar--yellow">
      <div className="pbar__info">
        <div className="pbar__title">🎴 Học {words.length} từ đang lọc</div>
        <div className="pbar__sub">
          Mặt sau thẻ hiện đủ nghĩa, <strong>từ loại thật</strong> và <strong>đối tượng được bổ
          nghĩa</strong> — nhớ từ mà không nhớ nó bổ nghĩa cho gì thì vào câu vẫn sai.
        </div>
        <div className="pbar__stats">
          <span style={{ color: "#34d399" }}>✅ {stats.mastered} thuộc</span>
          <span style={{ color: "#facc15" }}>📚 {stats.learning} đang học</span>
          {stats.due > 0 && <span style={{ color: "#22d3ee" }}>📅 {stats.due} tới hạn</span>}
        </div>
      </div>
      <div className="mod-pbar__acts">
        <button className="pbar__btn" onClick={onStart} disabled={!words.length}>
          Nhật → Việt →
        </button>
        <button className="mod-revbtn" onClick={onReverse} disabled={!words.length}>
          🔄 Việt → Nhật
        </button>
      </div>
    </div>
  );
}

/* ── Bảng tra ────────────────────────────────────────────────────────────────
   6 cột đúng như một bảng tra cần có. Trên điện thoại thì CSS gập mỗi <tr>
   thành một khối xếp dọc và lấy nhãn cột từ `data-l` — bảng 6 cột mà cuộn ngang
   trên máy 375px thì tra cứu rất khổ.
*/
function Table({ words, onPick }) {
  return (
    <div className="mod-tablewrap">
      <table className="mod-table">
        <thead>
          <tr>
            <th>Từ</th>
            <th>Hiragana</th>
            <th>Nghĩa tiếng Việt</th>
            <th>Từ loại</th>
            <th>Bổ nghĩa cho</th>
            <th>Ví dụ</th>
          </tr>
        </thead>
        <tbody>
          {words.map((w) => (
            <tr key={w.id} style={{ "--c": w.groupColor }} onClick={() => onPick(w)}>
              <td data-l="Từ" className="mod-td-jp">
                <span className="mod-td-jp__t">{w.jp}</span>
                <SpeakButton text={sayable(w)} size="sm" />
                {w.key && <span className="mod-star" title="Từ then chốt, có trong cheat sheet">★</span>}
              </td>
              <td data-l="Hiragana" className="mod-td-hira">
                {w.hira}
                <em>{w.romaji}</em>
              </td>
              <td data-l="Nghĩa" className="mod-td-vn">
                {w.vn}
                <span className="mod-lv">{w.level}</span>
              </td>
              <td data-l="Từ loại">
                <PosBadge pos={w.pos} note={w.posNote} />
              </td>
              <td data-l="Bổ nghĩa cho" className="mod-td-mod">{w.modifies}</td>
              <td data-l="Ví dụ" className="mod-td-ex">
                <span className="mod-td-ex__jp">{w.ex.jp}</span>
                <span className="mod-td-ex__vn">→ {w.ex.vn}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WordCard({ w, open, onToggle }) {
  return (
    <div
      className={`word-card mod-card ${open ? "is-open" : ""}`}
      style={{ "--card-color": w.groupColor, "--c": w.groupColor }}
      onClick={onToggle}
    >
      <div className="mod-card__head">
        <div className="mod-card__jp">
          {w.jp}
          <SpeakButton text={sayable(w)} size="md" />
        </div>
        <span className="mod-card__lv">{w.level}</span>
      </div>
      <div className="mod-card__hira">
        {w.hira} · <em>{w.romaji}</em>
      </div>
      <div className="mod-card__vn">{w.vn}</div>

      <div className="mod-card__meta">
        <PosBadge pos={w.pos} note={w.posNote} />
        <span className="mod-card__mod">→ bổ nghĩa cho: <strong>{w.modifies}</strong></span>
      </div>

      <div className="mod-card__ex">
        <div className="mod-card__ex-jp">
          {w.ex.jp}
          <SpeakButton text={w.ex.jp} size="sm" />
        </div>
        <div className="mod-card__ex-vn">→ {w.ex.vn}</div>
      </div>

      {w.note && <div className="mod-card__note">💡 {w.note}</div>}

      {w.also?.length > 0 && (
        <div className="mod-card__also">
          🔀 Còn dùng ở nhóm: {w.also.map((a) => GROUP_BY_ID[a]?.label || a).join(", ")}
        </div>
      )}

      {open && (
        <div onClick={(e) => e.stopPropagation()}>
          <NoteBox kind="modifiers" id={w.id} placeholder={`Mẹo nhớ ${w.jp} của tôi…`} />
        </div>
      )}
    </div>
  );
}

function Confusables({ q }) {
  const needle = q.trim().toLowerCase();
  const list = needle
    ? CONFUSABLES.filter((c) =>
        [c.title, c.detail, c.level, ...c.items.flatMap((i) => [i.w, i.pos, i.vn])]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(needle)),
      )
    : CONFUSABLES;

  return (
    <div className="mod-cf-list">
      <div className="mod-note" style={{ "--c": "#ff4757" }}>
        ⚠️ {needle ? `${list.length}/${CONFUSABLES.length}` : CONFUSABLES.length} cặp/nhóm từ gần
        nghĩa hay bị dùng lẫn. Câu có dấu <span className="mod-x">✗</span> là câu SAI kèm lý do —
        phần này ra đề thi rất nhiều.
      </div>
      {list.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__icon">🔍</div>
          <div className="empty-state__text">
            Không có cặp từ dễ nhầm nào khớp “{q.trim()}”. Xoá ô tìm kiếm để xem cả
            {" "}{CONFUSABLES.length} cặp.
          </div>
        </div>
      )}
      {list.map((c) => (
        <div key={c.id} className="mod-cf" style={{ "--c": c.color }}>
          <div className="mod-cf__head">
            <span className="mod-cf__title">{c.title}</span>
            <span className="mod-cf__lv">{c.level}</span>
          </div>
          <div className="mod-cf__grid">
            {c.items.map((it, i) => (
              <div key={i} className="mod-cf__item">
                <div className="mod-cf__w">
                  {it.w}
                  <SpeakButton text={String(it.w).replace(/[（）()]|〜ない|〜/g, "").split("・")[0]} size="sm" />
                </div>
                <div className="mod-cf__pos">{it.pos}</div>
                <div className="mod-cf__vn">{it.vn}</div>
              </div>
            ))}
          </div>
          <div className="mod-cf__detail">{c.detail}</div>
          <div className="mod-cf__exs">
            {c.ex.map((e, i) => (
              <div key={i} className={`mod-cf__ex ${e.ok === false ? "is-bad" : "is-ok"}`}>
                <span className="mod-cf__mark">{e.ok === false ? "✗" : "✓"}</span>
                <span className="mod-cf__exjp">
                  {e.jp}
                  {e.ok !== false && <SpeakButton text={e.jp} size="sm" />}
                </span>
                <span className="mod-cf__exvn">{e.vn}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Cheat sheet ─────────────────────────────────────────────────────────────
   Bản tổng hợp ngắn để ôn nhanh: mỗi nhóm chỉ giữ những từ then chốt (`key`
   trong data) kèm nghĩa tiếng Việt, cộng hai bảng quy tắc mà học viên hay quên.
*/
function CheatSheet({ onGoWord }) {
  // Danh sách "bắt buộc đi với phủ định" suy ra ngay từ data, không khai báo lại
  // ở đây — thêm/sửa từ trong JSON là bảng này tự đúng theo.
  const negWords = ALL_WORDS.filter((w) => /phủ định/i.test(w.vn));

  return (
    <div className="mod-sheet">
      <div className="mod-note" style={{ "--c": "#34d399" }}>
        📝 Bản tổng hợp ngắn: mỗi nhóm chỉ còn những từ quan trọng nhất
        ({ALL_WORDS.filter((w) => w.key).length}/{ALL_WORDS.length} từ, đánh dấu ★ trong bảng tra).
        Nhấn vào từ để xem thẻ chi tiết.
      </div>

      <div className="mod-sheet__rules">
        <div className="mod-sheet__rulehead">🔧 Quy tắc biến thành dạng bổ nghĩa</div>
        <div className="mod-rules">
          {ADV_RULES.map((r, i) => (
            <div key={i} className="mod-rule" style={{ "--c": r.color }}>
              <div className="mod-rule__top">
                <span className="mod-rule__from">{r.from}</span>
                <span className="mod-rule__arrow">→</span>
                <span className="mod-rule__to">{r.to}</span>
              </div>
              <div className="mod-rule__ex">{r.ex}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mod-sheet__rules">
        <div className="mod-sheet__rulehead" style={{ "--c": "#ff4757" }}>
          🚫 Bắt buộc đi với động từ/tính từ PHỦ ĐỊNH
        </div>
        <div className="mod-negs">
          {negWords.map((w) => (
            <button key={w.id} className="mod-neg" onClick={() => onGoWord(w)}>
              <strong>{w.jp}</strong> {w.vn.replace(/\s*\(.*?\)\s*/g, "")}
            </button>
          ))}
        </div>
      </div>

      {GROUPS.map((g) => {
        const keys = g.words.filter((w) => w.key);
        if (!keys.length) return null;
        return (
          <div key={g.id} className="mod-sheetgrp" style={{ "--c": g.color }}>
            <div className="mod-sheetgrp__head">
              <span className="mod-sheetgrp__name">
                {g.icon} {g.label}
              </span>
              <span className="mod-sheetgrp__jp">{g.jp}</span>
              <span className="mod-sheetgrp__n">{keys.length} từ cốt lõi</span>
            </div>
            <div className="mod-sheetgrp__rows">
              {keys.map((w) => (
                <button
                  key={w.id}
                  className="mod-sheetrow"
                  onClick={() => onGoWord(w)}
                  title={`${posOf(w.pos).jp} · bổ nghĩa cho ${w.modifies}`}
                >
                  <span className="mod-sheetrow__jp">{w.jp}</span>
                  <span className="mod-sheetrow__vn">{w.vn}</span>
                  <span className="mod-sheetrow__pos">{posOf(w.pos).short}</span>
                </button>
              ))}
            </div>
            {g.tips?.[0] && <div className="mod-sheetgrp__tip">💡 {g.tips[0]}</div>}
          </div>
        );
      })}
    </div>
  );
}

export default function ModifiersTab({ initialSearch }) {
  const [view, setView] = useState("table");
  const [group, setGroup] = useState("all");
  const [pos, setPos] = useState("all");
  const [level, setLevel] = useState("all");
  const [search, setSearch] = useState(initialSearch || "");
  const [openCard, setOpenCard] = useState(null);
  const [study, setStudy] = useState(null); // { cards, label }

  // Khi mở từ tìm kiếm toàn cục: về bảng tra, bỏ mọi bộ lọc đang bật.
  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
      // Kết quả tìm kiếm có thể là một CẶP từ dễ nhầm ("だけ vs しか") — chuỗi đó
      // không khớp từ nào trong bảng tra, nên phải mở đúng mục Từ dễ nhầm.
      setView(CONFUSABLES.some((c) => c.title === initialSearch) ? "confuse" : "table");
      setGroup("all");
      setPos("all");
      setLevel("all");
    }
  }, [initialSearch]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ALL_WORDS.filter((w) => {
      if (group !== "all" && w.groupId !== group && !(w.also || []).includes(group)) return false;
      if (pos !== "all" && w.pos !== pos) return false;
      if (level !== "all" && w.level !== level) return false;
      if (!q) return true;
      return [w.jp, w.hira, w.romaji, w.vn, w.modifies, w.note, w.groupLabel, posOf(w.pos).jp]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q));
    });
  }, [group, pos, level, search]);

  // Chỉ những từ loại thật sự có trong bộ data mới lên chip — tránh chip rỗng.
  const posChips = useMemo(() => {
    const count = {};
    ALL_WORDS.forEach((w) => (count[w.pos] = (count[w.pos] || 0) + 1));
    return [...new Set(ALL_WORDS.map((w) => w.pos))]
      .map((id) => ({ id, meta: posOf(id), n: count[id] }))
      .sort((a, b) => b.n - a.n);
  }, []);

  const startStudy = (reverse) => {
    const cards = filtered.map((w) => flashOf(w, { reverse }));
    if (!cards.length) return;
    setStudy({
      cards: orderForStudy(cards, "modifiers", (c) => c.id),
      label: `${reverse ? "Việt → Nhật" : "Nhật → Việt"} · ${cards.length} thẻ`,
    });
  };

  // Từ cheat sheet nhảy sang thẻ chi tiết của đúng từ đó.
  const goWord = (w) => {
    setView("cards");
    setGroup("all");
    setPos("all");
    setLevel("all");
    setSearch(w.jp);
    setOpenCard(w.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (study) {
    return (
      <StudyRunner
        items={study.cards}
        title={`🎨 Từ bổ nghĩa · ${study.label}`}
        subtitle="Space lật thẻ · chấm Quên / Mơ hồ / Nhớ — mặt sau có cả từ loại và đối tượng bổ nghĩa"
        color="#22d3ee"
        onExit={() => setStudy(null)}
      />
    );
  }

  const g = group === "all" ? null : GROUP_BY_ID[group];

  return (
    <div className="mod-tab">
      <div className="section-header">
        <h2 className="section-title">🎨 Từ bổ nghĩa N5–N4</h2>
        <p className="section-desc">
          {ALL_WORDS.length} từ dùng để bổ nghĩa cho động từ, tính từ, danh từ hoặc cả câu — chia
          theo {GROUPS.length} nhóm chức năng, ghi rõ <strong>từ loại thật</strong> của từng từ.
        </p>
      </div>

      <div className="mod-note mod-note--intro" style={{ "--c": "#22d3ee" }}>
        ⚠️ Nhóm này <strong>không phải toàn bộ là 副詞</strong>: 上/前 là 名詞, この/こんな là 連体詞,
        だけ/しか là 助詞, きれいに là な形容詞＋に, はやく là 形容詞＋く. Biết từ loại mới đặt được
        đúng vị trí và đúng trợ từ trong câu.
      </div>

      <PracticeBar words={filtered} onStart={() => startStudy(false)} onReverse={() => startStudy(true)} />

      <div className="filters">
        <div className="search-box">
          <span className="search-box__icon">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm từ bổ nghĩa: とても, ue, rất, danh từ vị trí…"
          />
        </div>

        <FilterRow label="Xem">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              className={`filter-btn ${view === v.id ? "filter-btn--active" : ""}`}
              style={{ "--c": "#22d3ee" }}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </FilterRow>

        <FilterRow label="Nhóm">
          <button
            className={`filter-btn ${group === "all" ? "filter-btn--active" : ""}`}
            onClick={() => setGroup("all")}
          >
            🌐 Tất cả ({ALL_WORDS.length})
          </button>
          {GROUPS.map((it) => (
            <button
              key={it.id}
              className={`filter-btn ${group === it.id ? "filter-btn--active" : ""}`}
              style={{ "--c": it.color }}
              onClick={() => setGroup(it.id)}
            >
              {it.icon} {it.label} ({it.words.length})
            </button>
          ))}
        </FilterRow>

        <FilterRow label="Từ loại">
          <button
            className={`filter-btn ${pos === "all" ? "filter-btn--active" : ""}`}
            onClick={() => setPos("all")}
          >
            Tất cả
          </button>
          {posChips.map(({ id, meta, n }) => (
            <button
              key={id}
              className={`filter-btn ${pos === id ? "filter-btn--active" : ""}`}
              style={{ "--c": meta.color }}
              onClick={() => setPos(id)}
              title={`${meta.jp}（${meta.kana}）— ${meta.vn}`}
            >
              {meta.jp} · {meta.vn} ({n})
            </button>
          ))}
        </FilterRow>

        <FilterRow label="Cấp độ">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              className={`filter-btn ${level === l.id ? "filter-btn--active" : ""}`}
              style={{ "--c": l.id === "N4" ? "#f472b6" : "#34d399" }}
              onClick={() => setLevel(l.id)}
            >
              {l.label}
            </button>
          ))}
        </FilterRow>
      </div>

      {/* Mô tả + mẹo của nhóm đang chọn — chỉ hiện khi đã lọc một nhóm cụ thể. */}
      {g && view !== "confuse" && view !== "sheet" && (
        <div className="mod-grouphead" style={{ "--c": g.color }}>
          <div className="mod-grouphead__title">
            {g.icon} {g.label} <em>（{g.jp}）</em>
          </div>
          <div className="mod-grouphead__desc">{g.desc}</div>
          {g.tips?.map((t, i) => (
            <div key={i} className="mod-grouphead__tip">💡 {t}</div>
          ))}
        </div>
      )}

      {view === "confuse" && <Confusables q={search} />}
      {view === "sheet" && <CheatSheet onGoWord={goWord} />}

      {(view === "table" || view === "cards") && (
        <>
          <div className="mod-count">
            Đang hiện <strong>{filtered.length}</strong> / {ALL_WORDS.length} từ
            {group !== "all" && GROUP_BY_ID[group] ? ` · nhóm ${GROUP_BY_ID[group].label}` : ""}
            {pos !== "all" ? ` · ${posOf(pos).jp}` : ""}
            {level !== "all" ? ` · ${level}` : ""}
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">🔍</div>
              <div className="empty-state__text">Không tìm thấy từ nào khớp bộ lọc.</div>
            </div>
          ) : view === "table" ? (
            <Table words={filtered} onPick={goWord} />
          ) : (
            <div className="cards-grid mod-grid">
              {filtered.map((w) => (
                <WordCard
                  key={w.id}
                  w={w}
                  open={openCard === w.id}
                  onToggle={() => setOpenCard((prev) => (prev === w.id ? null : w.id))}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
