import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import Preloader from "./components/common/Preloader";
import ErrorBoundary from "./components/common/ErrorBoundary";
import TabLoader from "./components/common/TabLoader";
import AccountButton from "./components/common/AccountButton";
import { startReminder } from "./lib/reminder";
import { applyFontScale, subscribeUserData } from "./lib/userdata";
import { writeRaw, readJSON, writeJSON } from "./lib/storage";

// Áp cỡ chữ ngay khi nạp module (trước lần vẽ đầu) để không thấy chữ nhảy cỡ.
applyFontScale();

// Tìm kiếm toàn cục cũng lazy: chỉ mục của nó đọc mọi file data, để import tĩnh
// là kéo toàn bộ JSON vào bundle đầu tiên — đúng thứ vừa tách ra.
const GlobalSearch = lazy(() => import("./components/common/GlobalSearch"));

// Mỗi tab là một chunk riêng: mở app không phải tải toàn bộ ~830KB JSON của
// cả 11 tab nữa, chỉ tải phần đang xem.
const HomeTab = lazy(() => import("./components/HomeTab"));
const VocabularyTab = lazy(() => import("./components/VocabularyTab"));
const GrammarTab = lazy(() => import("./components/GrammarTab"));
const MinnaTab = lazy(() => import("./components/MinnaTab"));
const KanjiTab = lazy(() => import("./components/KanjiTab"));
const KanaTab = lazy(() => import("./components/KanaTab"));
const NumbersTab = lazy(() => import("./components/NumbersTab"));
const ModifiersTab = lazy(() => import("./components/ModifiersTab"));
const ListeningTab = lazy(() => import("./components/ListeningTab"));
const TipsTab = lazy(() => import("./components/TipsTab"));
const ExercisesTab = lazy(() => import("./components/ExercisesTab"));
const StudyPlanTab = lazy(() => import("./components/StudyPlanTab"));
const ProgressTab = lazy(() => import("./components/ProgressTab"));

// Admin chỉ có ở chế độ dev (npm run dev). Bản build production không kèm.
const IS_DEV = import.meta.env.DEV;
const AdminTab = IS_DEV ? lazy(() => import("./components/admin/AdminTab")) : null;

// `short`: nhãn rút gọn cho hàng tab con trên điện thoại. Chỉ khai báo khi
// nhãn đầy đủ quá dài — còn lại dùng chung `label`. Thứ tự ở đây = thứ tự hiện
// trong từng nhóm (xem GROUPS).
const TABS = [
  { id: "home",       icon: "🔥", label: "Học hôm nay", short: "Hôm nay" },
  { id: "minna",      icon: "📗", label: "Minna no Nihongo 1", short: "Minna 1" },
  { id: "studyplan",  icon: "🗓️", label: "Lộ trình" },
  { id: "kana",       icon: "あ", label: "Kana" },
  { id: "vocabulary", icon: "📖", label: "Từ vựng" },
  { id: "kanji",      icon: "漢", label: "Kanji" },
  { id: "grammar",    icon: "🧱", label: "Ngữ pháp" },
  { id: "numbers",    icon: "🔢", label: "Số đếm" },
  { id: "modifiers",  icon: "🏷️", label: "Từ bổ nghĩa", short: "Bổ nghĩa" },
  { id: "exercises",  icon: "✏️", label: "Bài tập" },
  { id: "listening",  icon: "🎧", label: "Nghe" },
  { id: "tips",       icon: "💡", label: "Mẹo thi" },
  { id: "progress",   icon: "📊", label: "Tiến độ" },
  // Admin không thuộc nhóm nào — mở bằng nút 🛠️ trên header (chỉ bản dev).
  ...(IS_DEV ? [{ id: "admin", icon: "🛠️", label: "Admin" }] : []),
];

/**
 * 13 tab gom thành 5 nhóm. Màn rộng: hàng trên là nhóm, hàng dưới là tab con
 * của nhóm đang chọn. Điện thoại: nhóm thành thanh dưới đáy màn hình (ngón cái
 * với tới), tab con là một hàng chip trên cùng. Nhóm chỉ có một tab thì bấm là
 * mở thẳng, không có hàng con.
 */
const GROUPS = [
  { id: "today",    icon: "🔥", label: "Hôm nay",   tabs: ["home"] },
  { id: "course",   icon: "🗺️", label: "Theo bài",  tabs: ["minna", "studyplan"] },
  { id: "learn",    icon: "📚", label: "Kiến thức", tabs: ["kana", "vocabulary", "kanji", "grammar", "numbers", "modifiers"] },
  { id: "practice", icon: "🎯", label: "Luyện thi", tabs: ["exercises", "listening", "tips"] },
  { id: "me",       icon: "📊", label: "Tiến độ",   tabs: ["progress"] },
];

const TAB_BY_ID = Object.fromEntries(TABS.map((t) => [t.id, t]));
const GROUP_OF = Object.fromEntries(GROUPS.flatMap((g) => g.tabs.map((id) => [id, g])));

// Tab con mở lần trước của từng nhóm: quay lại "Kiến thức" là về đúng Kanji
// đang học dở, không bị đẩy về Kana. Chỉ là trạng thái giao diện của máy này.
const NAV_LAST_KEY = "jlpt-nav-last";

const VALID = new Set(TABS.map((t) => t.id));

// Preloader thương hiệu chỉ chạy MỘT LẦN mỗi phiên trình duyệt. App này để học
// hằng ngày, mở lại chục lần một buổi — lần nào cũng bắt ngồi xem 2,7 giây thì
// nó thành vật cản chứ không còn là ấn tượng. Đổi thành `false` nếu muốn chạy
// lại ở mọi lần tải trang.
const PRELOADER_ONCE_PER_SESSION = true;
const PRELOADER_KEY = "artds-preloader-seen";

function shouldPreload() {
  if (!PRELOADER_ONCE_PER_SESSION) return true;
  try {
    return !sessionStorage.getItem(PRELOADER_KEY);
  } catch {
    return true; // chế độ riêng tư chặn sessionStorage — cứ chạy như bình thường
  }
}

/**
 * Ẩn thanh điều hướng khi cuộn xuống, hiện lại khi cuộn lên — đọc nội dung dài
 * (danh sách từ, kanji, bài ngữ pháp) thì có trọn màn hình, cần đổi tab thì chỉ
 * cần vuốt ngược một chút.
 *
 * Dùng quãng cuộn *tích luỹ* cùng chiều thay vì từng sự kiện: vuốt rung tay vài
 * pixel ngược chiều không làm thanh nhấp nháy. Luôn hiện khi ở gần đầu trang và
 * khi chạm cuối trang (đọc xong thường là lúc muốn sang tab khác).
 */
const NAV_SHOW_TOP = 96; // px: gần đầu trang hơn mức này thì luôn hiện
const NAV_HIDE_AFTER = 24; // px cuộn xuống liên tục mới ẩn
const NAV_SHOW_AFTER = 40; // px cuộn lên liên tục mới hiện

function useHideOnScroll() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = Math.max(0, window.scrollY);
    let acc = 0;
    let ticking = false;

    const update = () => {
      ticking = false;
      const doc = document.documentElement;
      const y = Math.max(0, window.scrollY); // iOS kéo nảy quá đầu trang → âm
      const dy = y - lastY;
      lastY = y;
      if (!dy) return;

      const atEnd = y + window.innerHeight >= doc.scrollHeight - 2;
      if (y < NAV_SHOW_TOP || atEnd) {
        acc = 0;
        setHidden(false);
        return;
      }
      acc = Math.sign(dy) === Math.sign(acc) ? acc + dy : dy;
      if (acc > NAV_HIDE_AFTER) setHidden(true);
      else if (acc < -NAV_SHOW_AFTER) setHidden(false);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return [hidden, setHidden];
}

/**
 * Thanh điều hướng hai tầng (xem GROUPS).
 *
 * Hàng tab con vẫn có thể tràn trên điện thoại (nhóm Kiến thức có 6 tab), nên
 * giữ cách báo phần tràn: mờ dần hai mép, mũi tên cho người dùng chuột, và tab
 * đang chọn luôn tự trượt vào tầm nhìn.
 */
function TabNav({ activeTab, onSelect }) {
  const group = GROUP_OF[activeTab] || null;
  const subs = group && group.tabs.length > 1 ? group.tabs : [];
  const listRef = useRef(null);
  const [edge, setEdge] = useState({ left: false, right: false });
  const [hidden, setHidden] = useHideOnScroll();

  // Vừa đổi tab (trang cuộn về đầu) thì hiện lại ngay, khỏi chờ sự kiện cuộn.
  useEffect(() => setHidden(false), [activeTab, setHidden]);

  const lastRef = useRef(null);
  if (lastRef.current === null) {
    const saved = readJSON(NAV_LAST_KEY, {});
    lastRef.current = saved && typeof saved === "object" ? saved : {};
  }
  useEffect(() => {
    if (!group || lastRef.current[group.id] === activeTab) return;
    lastRef.current = { ...lastRef.current, [group.id]: activeTab };
    writeJSON(NAV_LAST_KEY, lastRef.current);
  }, [activeTab, group]);

  const openGroup = (g) => {
    // Bấm lại nhóm đang mở = về đầu trang của tab hiện tại (như app di động).
    if (g === group) return onSelect(activeTab);
    const last = lastRef.current[g.id];
    return onSelect(g.tabs.includes(last) ? last : g.tabs[0]);
  };

  const measure = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // Ngưỡng 1px: bù phần lẻ do trình duyệt làm tròn, tránh mũi tên nhấp nháy.
    setEdge({ left: el.scrollLeft > 1, right: el.scrollLeft < max - 1 });
  }, []);

  // Hàng tab con mount/unmount theo nhóm → gắn lại bộ đo mỗi lần đổi nhóm.
  const groupId = subs.length ? group.id : null;
  useEffect(() => {
    const el = listRef.current;
    if (!el) return undefined;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // Font chữ tải bất đồng bộ: chữ đổi thì bề rộng tab đổi theo, mà đổi bề
    // rộng *nội dung* thì ResizeObserver trên khung ngoài không hề hay biết.
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [measure, groupId]);

  // Kéo tab đang chọn vào tầm nhìn — kể cả khi mở lại app và khôi phục tab đã
  // lưu. Lần đầu nhảy thẳng, những lần sau mới trượt mượt.
  const firstRun = useRef(true);
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-tab="${activeTab}"]`);
    if (el) {
      el.scrollIntoView({
        inline: "center",
        block: "nearest",
        behavior: firstRun.current ? "instant" : "smooth",
      });
    }
    firstRun.current = false;
  }, [activeTab]);

  const nudge = (dir) => {
    const el = listRef.current;
    if (el) el.scrollBy({ left: dir * Math.max(180, el.clientWidth * 0.7), behavior: "smooth" });
  };

  // Mũi tên ←/→ đi giữa các mục trong cùng một hàng (chuẩn tablist).
  const arrowStep = (e) => (e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0);

  const onGroupKey = (e) => {
    const step = arrowStep(e);
    if (!step) return;
    e.preventDefault();
    const i = Math.max(0, GROUPS.indexOf(group));
    const next = GROUPS[(i + step + GROUPS.length) % GROUPS.length];
    openGroup(next);
    e.currentTarget.querySelector(`[data-grp="${next.id}"]`)?.focus();
  };

  const onSubKey = (e) => {
    const step = arrowStep(e);
    if (!step) return;
    e.preventDefault();
    const i = subs.indexOf(activeTab);
    const next = subs[(i + step + subs.length) % subs.length];
    onSelect(next);
    listRef.current?.querySelector(`[data-tab="${next}"]`)?.focus();
  };

  // Hàng nhóm vẽ hai lần: một trong thanh trên (màn rộng), một ở thanh đáy
  // (điện thoại). CSS ẩn hẳn bản không dùng bằng display:none nên lúc nào cũng
  // chỉ một bản nằm trong cây trợ năng. id `tab-*` chỉ gắn ở bản trên để không
  // trùng — aria-labelledby vẫn đọc được tên từ phần tử bị ẩn.
  const groupRow = (where) => (
    <div className={`gnav gnav--${where}`} role="tablist" aria-label="Nhóm nội dung" onKeyDown={onGroupKey}>
      {GROUPS.map((g, i) => {
        const on = g === group;
        const solo = g.tabs.length === 1;
        return (
          <button
            key={g.id}
            data-grp={g.id}
            id={where === "top" && solo ? `tab-${g.tabs[0]}` : undefined}
            role="tab"
            aria-selected={on}
            aria-controls={solo ? "tabpanel" : undefined}
            tabIndex={on || (!group && i === 0) ? 0 : -1}
            className={`gnav__btn ${on ? "gnav__btn--on" : ""}`}
            onClick={() => openGroup(g)}
          >
            <span className="gnav__icon" aria-hidden="true">{g.icon}</span>
            <span className="gnav__label">{g.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <nav
        className={`tab-nav ${subs.length ? "" : "tab-nav--solo"} ${hidden ? "is-hidden" : ""}`}
        aria-label="Khu vực học"
      >
        {groupRow("top")}

        {subs.length > 0 && (
          <div className={`tab-nav__wrap ${edge.left ? "is-l" : ""} ${edge.right ? "is-r" : ""}`}>
            <button
              className="tab-nav__arrow tab-nav__arrow--l"
              onClick={() => nudge(-1)}
              tabIndex={-1}
              aria-hidden="true"
            >
              ‹
            </button>

            <div
              className="tab-nav__inner"
              ref={listRef}
              role="tablist"
              aria-label={group.label}
              onKeyDown={onSubKey}
            >
              {subs.map((id) => {
                const tab = TAB_BY_ID[id];
                const on = activeTab === id;
                return (
                  <button
                    key={id}
                    data-tab={id}
                    id={`tab-${id}`}
                    role="tab"
                    aria-selected={on}
                    aria-controls="tabpanel"
                    tabIndex={on ? 0 : -1}
                    className={`tab-btn ${on ? "tab-btn--active" : ""}`}
                    onClick={() => onSelect(id)}
                    title={tab.label}
                  >
                    {/* Hai nhãn thay nhau bằng `display: none` nên lúc nào cũng
                        đúng một cái nằm trong cây trợ năng. */}
                    <span className="tab-btn__icon" aria-hidden="true">{tab.icon}</span>
                    <span className="tab-btn__label">{tab.label}</span>
                    <span className="tab-btn__short">{tab.short || tab.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              className="tab-nav__arrow tab-nav__arrow--r"
              onClick={() => nudge(1)}
              tabIndex={-1}
              aria-hidden="true"
            >
              ›
            </button>
          </div>
        )}
      </nav>

      <nav className={`bnav ${hidden ? "is-hidden" : ""}`} aria-label="Khu vực học">
        {groupRow("bottom")}
      </nav>
    </>
  );
}

/**
 * Nút lên đầu trang. Tab Từ vựng/Kanji dài vài trăm thẻ, mà bộ lọc và ô tìm
 * kiếm đều nằm trên cùng — cuộn tay ngược lên mỗi lần đổi lọc rất mệt.
 */
function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      className="to-top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Lên đầu trang"
      title="Lên đầu trang"
    >
      ↑
    </button>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    let saved = null;
    try {
      saved = localStorage.getItem("jlpt-active-tab");
    } catch {
      /* chế độ riêng tư chặn localStorage */
    }
    return saved && VALID.has(saved) ? saved : "home";
  });
  const [mounted, setMounted] = useState(false);
  const [preloading, setPreloading] = useState(shouldPreload);
  const [revealing, setRevealing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // Khi mở một kết quả từ tìm kiếm toàn cục: nhảy tab + mang theo từ khoá.
  const [jump, setJump] = useState(null); // { tab, q, n }

  // Trang chỉ hiện sau khi preloader xong. Nó chạy đè lên trên nên trong lúc đó
  // các tab vẫn tải bình thường ở dưới — hết preloader là nội dung đã sẵn sàng.
  useEffect(() => {
    if (preloading) return undefined;
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, [preloading]);

  const onPreloaded = useCallback(() => {
    try {
      sessionStorage.setItem(PRELOADER_KEY, "1");
    } catch {
      /* không lưu được thì phiên sau xem lại — không đáng để chặn app */
    }
    setPreloading(false);
    setRevealing(true);
  }, []);

  // Gỡ class ngay khi hiệu ứng nâng nội dung chạy xong: nó dùng transform, mà
  // transform còn bám lại thì .header/.footer thành containing block vô ích.
  useEffect(() => {
    if (!revealing) return undefined;
    const t = setTimeout(() => setRevealing(false), 950);
    return () => clearTimeout(t);
  }, [revealing]);

  useEffect(() => {
    writeRaw("jlpt-active-tab", activeTab);
  }, [activeTab]);

  // Nhắc học chạy ở cấp App để hoạt động dù đang mở tab nào.
  useEffect(() => startReminder(), []);

  // Cài đặt đổi (ô cỡ chữ ở trang chủ, tab trình duyệt khác, nhập sao lưu) → áp lại cỡ chữ.
  useEffect(() => subscribeUserData(() => applyFontScale()), []);

  // Ctrl/⌘ + K mở tìm kiếm toàn cục ở bất kỳ tab nào.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const goTo = useCallback((tab) => {
    if (!VALID.has(tab)) return;
    setJump(null);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const onJump = useCallback((row) => {
    setJump((prev) => ({ tab: row.tab, q: row.title, n: (prev?.n || 0) + 1 }));
    setActiveTab(row.tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const jumped = jump && jump.tab === activeTab;
  const initialSearch = jumped ? jump.q : undefined;

  const renderTab = () => {
    switch (activeTab) {
      case "home":       return <HomeTab onGoTo={goTo} />;
      case "vocabulary": return <VocabularyTab initialSearch={initialSearch} />;
      case "grammar":    return <GrammarTab initialSearch={initialSearch} />;
      case "minna":      return <MinnaTab />;
      case "kanji":      return <KanjiTab initialSearch={initialSearch} />;
      case "kana":       return <KanaTab />;
      case "numbers":    return <NumbersTab />;
      case "modifiers":  return <ModifiersTab initialSearch={initialSearch} />;
      case "listening":  return <ListeningTab onGoTo={goTo} />;
      case "tips":       return <TipsTab />;
      case "exercises":  return <ExercisesTab />;
      case "studyplan":  return <StudyPlanTab onGoTo={goTo} />;
      case "progress":   return <ProgressTab onGoTo={goTo} />;
      case "admin":      return IS_DEV && AdminTab ? <AdminTab /> : null;
      default:           return null;
    }
  };

  return (
    <>
      {preloading && <Preloader onDone={onPreloaded} />}

      <div className={`app ${mounted ? "app--mounted" : ""} ${revealing ? "app--reveal" : ""}`}>
        <a className="skip-link" href="#tabpanel">Bỏ qua thanh điều hướng</a>

        <div className="bg-orbs">
          <div className="bg-orb bg-orb--1" />
          <div className="bg-orb bg-orb--2" />
          <div className="bg-orb bg-orb--3" />
        </div>

        <header className="header">
          <div className="header__inner">
            <button
              className="header__logo header__logo--btn"
              onClick={() => goTo("home")}
              title="Về trang Học hôm nay"
            >
              <span className="header__flag">🇯🇵</span>
              <div>
                <h1 className="header__title">JLPT N5</h1>
                <p className="header__subtitle">Tổng hợp kiến thức</p>
              </div>
            </button>

            <div className="header__right">
              <button
                className="gs-trigger"
                onClick={() => setSearchOpen(true)}
                aria-label="Tìm kiếm toàn bộ nội dung"
              >
                🔍 <span className="gs-trigger__t">Tìm mọi nơi</span>
                <kbd>Ctrl K</kbd>
              </button>
              {IS_DEV && (
                <button className="gs-trigger" onClick={() => goTo("admin")} title="Admin (chỉ bản dev)" aria-label="Admin">
                  🛠️
                </button>
              )}
              <AccountButton />
              <a href="https://portfolio-5728c.web.app/" className="header__badge">ArtDS02</a>
            </div>
          </div>
        </header>

        <TabNav activeTab={activeTab} onSelect={goTo} />

        <main
          className="main-content"
          id="tabpanel"
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          tabIndex={-1}
        >
          <ErrorBoundary resetKey={activeTab}>
            <Suspense fallback={<TabLoader label={TAB_BY_ID[activeTab]?.label} />}>
              <div key={`${activeTab}:${jumped ? jump.n : 0}`}>{renderTab()}</div>
            </Suspense>
          </ErrorBoundary>
        </main>

        {searchOpen && (
          <ErrorBoundary>
            <Suspense fallback={null}>
              <GlobalSearch open onClose={() => setSearchOpen(false)} onJump={onJump} />
            </Suspense>
          </ErrorBoundary>
        )}

        <BackToTop />

        <footer className="footer">
          <p>🎌 がんばってください！ · Chúc bạn thi JLPT N5 thành công!</p>
          <p>Copyright by ARTDS02</p>
        </footer>
      </div>
    </>
  );
}
