import { useEffect, useState } from "react";

/**
 * Màn hình chờ khi tải tab / tải dữ liệu.
 *
 * Hai phần:
 *  - Thanh tiến trình mảnh bám dưới thanh tab. Thanh này thuần CSS
 *    (`.app:has(.tl) .tab-nav::after` trong ui.css): component không phải với
 *    tới DOM của thanh tab, và lần tải đầu — khi thanh tab chưa gắn vào DOM —
 *    vẫn có thanh chạy.
 *  - Vòng tròn đỏ/tím xoay quanh một chữ kana đổi liên tục + một mẹo học ngẫu
 *    nhiên, để vài trăm mili-giây chờ cũng thành một lần ôn nhỏ.
 *
 * Cả khối chỉ hiện sau ~150ms (độ trễ nằm ở CSS `.tl`): chunk lazy thường về
 * nhanh hơn thế, hiện loader ngay sẽ chỉ thành một cái nháy màn hình.
 */

const KANA = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";

// Giữ danh sách ngắn, viết thẳng ở đây: component này nằm trong bundle đầu tiên,
// import tips-exercises.json vào sẽ kéo cả file dữ liệu theo.
const TIPS = [
  "は đọc là “wa” khi làm trợ từ chủ đề.",
  "を đọc là “o” và chỉ dùng làm trợ từ tân ngữ.",
  "へ đọc là “e” khi chỉ hướng di chuyển: 学校へ行きます.",
  "Trường âm: おかあさん kéo dài âm “a”, đừng đọc lướt.",
  "っ nhỏ là âm ngắt — きって (tem) khác きて (đến).",
  "Đếm người: ひとり, ふたり rồi mới đến さんにん.",
  "4 có hai cách đọc: よん và し; 7 là なな hoặc しち.",
  "Ngày 1–10 trong tháng có cách đọc riêng: ついたち, ふつか…",
  "～ます là thể lịch sự, thi N5 gặp nhiều hơn thể từ điển.",
  "Tính từ い đổi sang phủ định: たかい → たかくない.",
  "Tính từ な cần な khi đứng trước danh từ: しずかな へや.",
  "に chỉ thời điểm cụ thể; hôm nay, ngày mai thì không cần に.",
  "で chỉ nơi diễn ra hành động, に chỉ nơi tồn tại.",
  "Bài nghe: đọc lướt các lựa chọn trước khi băng chạy.",
];

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function TabLoader({ label }) {
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  const [ki, setKi] = useState(() => Math.floor(Math.random() * KANA.length));

  useEffect(() => {
    if (reducedMotion()) return undefined;
    const t = setInterval(() => setKi((i) => (i + 1) % KANA.length), 420);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="tl" role="status" aria-live="polite">
      <div className="tl__ring" aria-hidden="true">
        <span className="tl__kana" key={ki}>{KANA[ki]}</span>
      </div>

      <p className="tl__label">
        Đang tải{label ? <> <b>{label}</b></> : null}…
      </p>
      <p className="tl__tip">
        <span className="tl__tip-k">Mẹo</span>
        {tip}
      </p>
    </div>
  );
}
