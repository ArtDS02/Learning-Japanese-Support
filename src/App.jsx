import { useState, useEffect } from "react";
import VocabularyTab from "./components/VocabularyTab";
import GrammarTab from "./components/GrammarTab";
import KanjiTab from "./components/KanjiTab";
import KanaTab from "./components/KanaTab";
import NumbersTab from "./components/NumbersTab";
import TipsTab from "./components/TipsTab";
import ExercisesTab from "./components/ExercisesTab";
import StudyPlanTab from "./components/StudyPlanTab";
import "./styles/global.css";

const TABS = [
  { id: "vocabulary", label: "📖 Từ vựng" },
  { id: "grammar", label: "⚙️ Ngữ pháp" },
  { id: "kanji", label: "🈳 Kanji" },
  { id: "kana", label: "🔤 Kana" },
  { id: "numbers", label: "🔢 Số đếm" },
  { id: "tips", label: "💡 Mẹo thi" },
  { id: "exercises", label: "✏️ Bài tập" },
  { id: "studyplan", label: "🗓️ Lộ trình" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("jlpt-active-tab") || "vocabulary";
  });
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);
  
  useEffect(() => {
    localStorage.setItem("jlpt-active-tab", activeTab);
  }, [activeTab]);

  const renderTab = () => {
    switch (activeTab) {
      case "vocabulary":
        return <VocabularyTab />;
      case "grammar":
        return <GrammarTab />;
      case "kanji":
        return <KanjiTab />;
      case "kana":
        return <KanaTab />;
      case "numbers":
        return <NumbersTab />;
      case "tips":
        return <TipsTab />;
      case "exercises":
        return <ExercisesTab />;
      case "studyplan":
        return <StudyPlanTab />;
      default:
        return null;
    }
  };

  return (
    <div className={`app ${mounted ? "app--mounted" : ""}`}>
      <div className="bg-orbs">
        <div className="bg-orb bg-orb--1" />
        <div className="bg-orb bg-orb--2" />
        <div className="bg-orb bg-orb--3" />
      </div>
      <header className="header">
        <div className="header__inner">
          <div className="header__logo">
            <span className="header__flag">🇯🇵</span>
            <div>
              <h1 className="header__title">JLPT N5</h1>
              <p className="header__subtitle">Tổng hợp kiến thức đầy đủ</p>
            </div>
          </div>
          <div className="header__badge">N5 Ready</div>
        </div>
      </header>
      <nav className="tab-nav">
        <div className="tab-nav__inner">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? "tab-btn--active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
      <main className="main-content">{renderTab()}</main>
      <footer className="footer">
        <p>🎌 がんばってください！ · Chúc bạn thi JLPT N5 thành công!</p>
      </footer>
    </div>
  );
}
