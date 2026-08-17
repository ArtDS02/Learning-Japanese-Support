import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import Preloader from "./components/common/Preloader";

// Tìm kiếm toàn cục cũng lazy: chỉ mục của nó đọc mọi file data, để import tĩnh
// là kéo toàn bộ JSON vào bundle đầu tiên — đúng thứ vừa tách ra.
const GlobalSearch = lazy(() => import("./components/common/GlobalSearch"));

// Mỗi tab là một chunk riêng: mở app không phải tải toàn bộ ~830KB JSON của
// cả 11 tab nữa, chỉ tải phần đang xem.
const HomeTab = lazy(() => import("./components/HomeTab"));
const VocabularyTab = lazy(() => import("./components/VocabularyTab"));
const GrammarTab = lazy(() => import("./components/GrammarTab"));
const KanjiTab = lazy(() => import("./components/KanjiTab"));
const KanaTab = lazy(() => import("./components/KanaTab"));
const NumbersTab = lazy(() => import("./components/NumbersTab"));
const ListeningTab = lazy(() => import("./components/ListeningTab"));
const TipsTab = lazy(() => import("./components/TipsTab"));
const ExercisesTab = lazy(() => import("./components/ExercisesTab"));
const StudyPlanTab = lazy(() => import("./components/StudyPlanTab"));
const ProgressTab = lazy(() => import("./components/ProgressTab"));

// Admin chỉ có ở chế độ dev (npm run dev). Bản build production không kèm.
const IS_DEV = import.meta.env.DEV;
const AdminTab = IS_DEV ? lazy(() => import("./components/admin/AdminTab")) : null;

// `short`: nhãn rút gọn dùng cho thanh tab trên điện thoại. Chỉ khai báo khi
// nhãn đầy đủ quá dài — còn lại dùng chung `label`.
const TABS = [
  { id: "home",       icon: "🔥", label: "Học hôm nay", short: "Hôm nay" },
  { id: "vocabulary", icon: "📖", label: "Từ vựng" },
  { id: "grammar",    icon: "⚙️", label: "Ngữ pháp" },
  { id: "kanji",      icon: "🈳", label: "Kanji" },
  { id: "kana",       icon: "🔤", label: "Kana" },
  { id: "numbers",    icon: "🔢", label: "Số đếm" },
  { id: "listening",  icon: "🎧", label: "Nghe" },
  { id: "tips",       icon: "💡", label: "Mẹo thi" },
  { id: "exercises",  icon: "✏️", label: "Bài tập" },
  { id: "studyplan",  icon: "🗓️", label: "Lộ trình" },
  { id: "progress",   icon: "📊", label: "Tiến độ" },
  ...(IS_DEV ? [{ id: "admin", icon: "🛠️", label: "Admin" }] : []),
];

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
 * Thanh chuyển tab.
 *
 * 12 tab không bao giờ vừa một hàng trên điện thoại, nên phần tràn phải *nhìn
 * ra được* thay vì bị cắt cụt im lặng: mờ dần hai mép để báo còn nội dung, nút
 * mũi tên cho người dùng chuột, và tab đang chọn luôn tự trượt vào tầm nhìn.
 * Từ 769px trở lên thì cho xuống dòng — còn chỗ thì hiện hết, khỏi cuộn.
 */
function TabNav({ activeTab, onSelect }) {
  const listRef = useRef(null);
  const [edge, setEdge] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // Ngưỡng 1px: bù phần lẻ do trình duyệt làm tròn, tránh mũi tên nhấp nháy.
    setEdge({ left: el.scrollLeft > 1, right: el.scrollLeft < max - 1 });
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
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
  }, [measure]);

  // Kéo tab đang chọn vào tầm nhìn — kể cả khi mở lại app và khôi phục tab đã
  // lưu, lúc đó nó có thể nằm tít bên phải ngoài màn hình.
  const firstRun = useRef(true);
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-tab="${activeTab}"]`);
    if (!el) return;
    // Lần đầu thì nhảy thẳng: vừa mở app đã thấy thanh tab tự trượt một đoạn
    // dài trông như lỗi. Những lần đổi tab sau mới trượt mượt.
    el.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: firstRun.current ? "instant" : "smooth",
    });
    firstRun.current = false;
  }, [activeTab]);

  const nudge = (dir) => {
    const el = listRef.current;
    if (el) el.scrollBy({ left: dir * Math.max(180, el.clientWidth * 0.7), behavior: "smooth" });
  };

  // Mũi tên ←/→ đi giữa các tab khi tiêu điểm đang ở trong thanh (chuẩn tablist).
  const onKeyDown = (e) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const i = TABS.findIndex((t) => t.id === activeTab);
    const next = TABS[(i + step + TABS.length) % TABS.length];
    onSelect(next.id);
    listRef.current?.querySelector(`[data-tab="${next.id}"]`)?.focus();
  };

  return (
    <nav className="tab-nav" aria-label="Khu vực học">
      <div className={`tab-nav__wrap ${edge.left ? "is-l" : ""} ${edge.right ? "is-r" : ""}`}>
        <button
          className="tab-nav__arrow tab-nav__arrow--l"
          onClick={() => nudge(-1)}
          tabIndex={-1}
          aria-hidden="true"
        >
          ‹
        </button>

        <div className="tab-nav__inner" ref={listRef} role="tablist" onKeyDown={onKeyDown}>
          {TABS.map((tab) => {
            const on = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-tab={tab.id}
                id={`tab-${tab.id}`}
                role="tab"
                aria-selected={on}
                aria-controls="tabpanel"
                tabIndex={on ? 0 : -1}
                className={`tab-btn ${on ? "tab-btn--active" : ""}`}
                onClick={() => onSelect(tab.id)}
                title={tab.label}
              >
                {/* Chỉ icon mới aria-hidden. Hai nhãn thay nhau bằng
                    `display: none` nên lúc nào cũng đúng một cái nằm trong cây
                    trợ năng — tên nút vì thế luôn có, không phải nhờ `title`. */}
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
    </nav>
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
    const saved = localStorage.getItem("jlpt-active-tab");
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
    localStorage.setItem("jlpt-active-tab", activeTab);
  }, [activeTab]);

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
      case "kanji":      return <KanjiTab initialSearch={initialSearch} />;
      case "kana":       return <KanaTab />;
      case "numbers":    return <NumbersTab />;
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
          <Suspense fallback={<div className="tab-loading">Đang tải…</div>}>
            <div key={`${activeTab}:${jumped ? jump.n : 0}`}>{renderTab()}</div>
          </Suspense>
        </main>

        {searchOpen && (
          <Suspense fallback={null}>
            <GlobalSearch open onClose={() => setSearchOpen(false)} onJump={onJump} />
          </Suspense>
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
