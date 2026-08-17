import { useEffect, useRef, useState } from "react";
// Bản 512px của artds_logo.png (bản gốc 1254px giữ nguyên, không đụng tới).
// Logo hiển thị to nhất 240px nên 512px đã dư cho màn Retina, mà nhẹ hơn bản
// gốc 3,6 lần — preloader cần nó xong trước mốc 1,23s, tải 515KB thì không kịp.
// Thay logo mới thì nhớ tạo lại bản này (xem docs/preloader.md).
import logoUrl from "../../assets/artds_logo-512.png";

/**
 * Preloader "Code to Art" — CODE → COMPILE → PARTICLES → LOGO → SHIMMER → VÀO WEB.
 *
 * Toàn bộ animation chạy trên MỘT vòng requestAnimationFrame duy nhất: mốc thời
 * gian tính từ `performance.now()` chứ không xâu chuỗi setTimeout, nên các pha
 * không trôi lệch nhau khi máy giật một nhịp. Vòng lặp chỉ làm hai việc:
 *   1. Vẽ hạt lên <canvas> (thứ duy nhất cần cập nhật từng khung hình).
 *   2. Đổi `data-phase` trên thẻ gốc — mọi chuyển động còn lại là CSS thuần.
 * Muốn chỉnh nhịp thì sửa bảng T bên dưới, không phải lần trong JSX/CSS.
 */

// ── Bảng thời gian (ms tính từ lúc mount) ─────────────────────────────────
const T = {
  typeStart: 60, // bắt đầu gõ chữ
  typeEnd: 800, // gõ xong dòng lệnh
  dissolve: 820, // chữ nhoè đi, hạt sinh ra ĐÚNG từ nét chữ
  logoIn: 1230, // logo bắt đầu hiện hình dưới đám hạt
  flightEnd: 1520, // hạt chạm đích (hội tụ là cả đoạn dissolve → đây)
  dustOut: 1720, // hạt tan hết
  shine: 1770, // vệt sáng quét qua mặt kim loại (một lần duy nhất)
  // Cú nảy nằm trong keyframe `pl-logo` (mốc 82%), KHÔNG do hằng số này điều
  // khiển — đây chỉ là chỗ nút "bỏ qua" nhảy tới, đặt đúng lúc logo nảy.
  pulse: 2250,
  portal: 2330, // quầng teal mềm loang ra, preloader mờ dần
  end: 2690, // trả quyền hiển thị cho trang chủ
};

const CODE = 'const experience = build("ARTDS");';

// Nhãn HUD theo từng pha. Pha nào không có tên riêng thì giữ nhãn của pha trước.
const HUD = {
  code: ["INITIALIZING CREATIVITY", "INITIALIZING"],
  compile: ["COMPILING EXPERIENCE", "COMPILING"],
  form: ["ASSEMBLING IDENTITY", "IDENTITY"],
  shine: ["FINALIZING", "FINALIZING"],
  exit: ["ENTER EXPERIENCE", "READY"],
};

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Quét một vùng canvas, trả về những điểm có alpha đủ đậm.
 * `step` càng nhỏ thì hạt càng dày — cũng là nút vặn chi phí duy nhất ở đây.
 */
function scanAlpha(ctx, w, h, step, threshold, map, out) {
  const data = ctx.getImageData(0, 0, w, h).data;
  for (let y = 0; y < h; y += step) {
    const row = y * w;
    for (let x = 0; x < w; x += step) {
      if (data[(row + x) * 4 + 3] > threshold) out.push(map(x, y));
    }
  }
}

/** Lấy mẫu nét chữ đang hiển thị của một phần tử → toạ độ theo viewport (px CSS). */
function pointsFromText(el, step, out) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const w = Math.ceil(r.width);
  const h = Math.ceil(r.height);
  if (w < 2 || h < 2 || w > 2000) return;

  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const c = cv.getContext("2d", { willReadFrequently: true });
  const cs = getComputedStyle(el);
  // Thiếu font-family thì cả chuỗi `font` thành sai cú pháp và canvas âm thầm
  // giữ mặc định 10px sans-serif — hạt sẽ nhóm thành một cục bé xíu chứ không
  // theo nét chữ. Nên luôn có đường lui.
  c.font = `${cs.fontWeight || 400} ${cs.fontSize || "16px"} ${cs.fontFamily || "monospace"}`;
  // Chrome hỗ trợ letterSpacing trên canvas, Safari/Firefox thì chưa — thiếu nó
  // hạt chỉ hụt vài px so với chữ thật, mà lúc đó chữ đang nhoè nên không thấy.
  if ("letterSpacing" in c) c.letterSpacing = cs.letterSpacing;
  c.textBaseline = "middle";
  c.fillStyle = "#fff";
  c.fillText(el.textContent, 0, h / 2);

  scanAlpha(c, w, h, step, 130, (x, y) => ({ x: r.left + x, y: r.top + y }), out);
}

/** Lấy mẫu chính file logo → hạt hội tụ đúng vào hình logo, không phải hình đoán. */
function pointsFromImage(img, box, step, out) {
  const size = Math.min(320, Math.max(64, Math.round(box.width)));
  const cv = document.createElement("canvas");
  cv.width = size;
  cv.height = size;
  const c = cv.getContext("2d", { willReadFrequently: true });

  // Khớp với preserveAspectRatio="xMidYMid meet" của <image> trong SVG: ảnh
  // không vuông thì phải chừa viền hai bên, nếu không hạt sẽ lệch khỏi logo.
  const iw = img.naturalWidth || 1;
  const ih = img.naturalHeight || 1;
  const k = Math.min(size / iw, size / ih);
  const dw = iw * k;
  const dh = ih * k;
  c.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);

  const s = box.width / size;
  scanAlpha(c, size, size, step, 110, (x, y) => ({ x: box.left + x * s, y: box.top + y * s }), out);
}

/** Dự phòng khi ảnh logo chưa kịp tải: hạt tụ thành một vòng tròn. */
function pointsFromRing(box, count, out) {
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  const r = box.width * 0.33;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const rr = r * (0.94 + Math.random() * 0.12);
    out.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
  }
}

export default function Preloader({ onDone }) {
  const promptRef = useRef(null);
  const codeRef = useRef(null);
  const canvasRef = useRef(null);
  const logoRef = useRef(null);
  const pctRef = useRef(null);
  const doneRef = useRef(false);

  const [phase, setPhase] = useState("code");

  // onDone đi qua ref: effect chỉ được chạy đúng một lần, không phụ thuộc vào
  // việc hàm callback có ổn định giữa các lần render hay không.
  const doneCb = useRef(onDone);
  doneCb.current = onDone;

  useEffect(() => {
    const canvas = canvasRef.current;
    const codeEl = codeRef.current;
    const pctEl = pctRef.current;

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      doneCb.current?.();
    };

    // Người dùng tắt hiệu ứng chuyển động: bỏ hẳn canvas + vệt sáng, chỉ hiện
    // logo tĩnh một nhịp ngắn rồi vào trang.
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      if (codeEl) codeEl.textContent = CODE;
      if (pctEl) pctEl.textContent = "100";
      setPhase("form");
      const t1 = setTimeout(() => setPhase("exit"), 620);
      const t2 = setTimeout(finish, 980);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    const ctx = canvas.getContext("2d");
    let w = 0;
    let h = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      // Trần DPR ở 2: màn 3x chỉ tốn thêm pixel chứ mắt không phân biệt được.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Tải ảnh logo song song với pha gõ chữ — tới mốc 820ms mới cần đến nó.
    const img = new Image();
    let imgReady = false;
    img.onload = () => {
      imgReady = true;
    };
    img.src = logoUrl;

    let dust = null;

    /** Sinh đám hạt: nguồn là nét chữ vừa gõ, đích là hình logo. */
    const buildDust = () => {
      const src = [];
      const step = w < 640 ? 3 : 2;
      pointsFromText(promptRef.current, step, src);
      pointsFromText(codeEl, step, src);

      const box = logoRef.current.getBoundingClientRect();
      const tgt = [];
      if (imgReady) pointsFromImage(img, box, w < 640 ? 4 : 3, tgt);
      if (tgt.length < 60) pointsFromRing(box, 420, tgt);
      if (!src.length) return null;

      // Trộn đích: ghép theo thứ tự quét thì hạt bay thành từng dải song song,
      // trông như thanh trượt chứ không như bụi dữ liệu.
      for (let i = tgt.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const t = tgt[i];
        tgt[i] = tgt[j];
        tgt[j] = t;
      }

      const cap = w < 640 ? 340 : 820;
      const count = Math.min(cap, Math.max(src.length, tgt.length));
      const list = new Array(count);

      for (let i = 0; i < count; i++) {
        // Lấy mẫu theo bước nhảy đều thay vì cắt đầu mảng: giữ được toàn bộ bề
        // ngang dòng chữ kể cả khi số hạt ít hơn số điểm quét được.
        const a = src[Math.floor((i * src.length) / count) % src.length];
        const b = tgt[Math.floor((i * tgt.length) / count) % tgt.length];

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const ang = Math.random() * Math.PI * 2;
        const r = Math.random();

        list[i] = {
          ax: a.x,
          ay: a.y,
          bx: b.x,
          by: b.y,
          // Pháp tuyến của đoạn bay + biên độ ngẫu nhiên: quỹ đạo cong thành
          // hình vòng cung, không phải đường thẳng nối hai điểm.
          nx: -dy / len,
          ny: dx / len,
          arc: (Math.random() - 0.5) * 190,
          // Cú hất tung lúc chữ vỡ ra, tắt dần khi hạt bắt đầu hội tụ.
          ex: Math.cos(ang) * (18 + Math.random() * 74),
          ey: Math.sin(ang) * (18 + Math.random() * 74),
          delay: Math.random() * 0.2,
          size: 0.7 + Math.random() * 1.15,
          // 89% teal · 8% ánh bạc · 3% ánh vàng ấm. Đủ để đám hạt có sắc độ,
          // chưa tới mức thành pháo hoa nhiều màu.
          tint: r > 0.97 ? 2 : r > 0.89 ? 1 : 0,
        };
      }
      return list;
    };

    const TINTS = ["79,214,192", "205,219,216", "198,170,116"];

    const drawDust = (now) => {
      ctx.clearRect(0, 0, w, h);
      if (!dust) return;

      const flight = clamp01((now - T.dissolve) / (T.flightEnd - T.dissolve));
      // Hạt mờ dần đúng lúc logo hiện hình → mắt đọc thành "hạt hoá thành logo".
      const fade = 1 - clamp01((now - (T.flightEnd - 120)) / (T.dustOut - T.flightEnd + 120));
      if (fade <= 0) return;

      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < dust.length; i++) {
        const p = dust[i];
        const t = clamp01((flight - p.delay) / (1 - p.delay));
        const e = easeInOutCubic(t);
        const bump = Math.sin(Math.PI * t); // cong nhất ở giữa đường bay
        const spread = (1 - t) * (1 - t);

        const x = p.ax + (p.bx - p.ax) * e + p.nx * p.arc * bump + p.ex * spread;
        const y = p.ay + (p.by - p.ay) * e + p.ny * p.arc * bump + p.ey * spread;

        // Sáng nhất giữa đường bay rồi dịu lại khi chạm đích — tránh loé.
        const a = fade * (0.2 + 0.55 * bump + 0.25 * e) * 0.85;
        ctx.fillStyle = `rgba(${TINTS[p.tint]},${a})`;
        const s = p.size * (1 + 0.35 * bump);
        ctx.fillRect(x, y, s, s);
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const start = performance.now();
    let raf = 0;
    let phaseName = "code";
    let lastPct = -1;

    // Bấm/chạm/gõ phím để bỏ qua: đẩy đồng hồ tới thẳng pha kết, phần đuôi
    // (nảy → quầng sáng → mờ dần) vẫn chạy đủ nên không bị cắt cụt thô bạo.
    let jump = 0;
    const skip = () => {
      const now = performance.now() - start + jump;
      if (now < T.pulse) jump += T.pulse - now;
    };
    window.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);

    const frame = (ts) => {
      const now = ts - start + jump;

      // ── Pha 1: gõ chữ ──
      if (now < T.dissolve) {
        const n = Math.round(clamp01((now - T.typeStart) / (T.typeEnd - T.typeStart)) * CODE.length);
        const next = CODE.slice(0, n);
        if (codeEl.textContent !== next) codeEl.textContent = next;
      }

      // ── Đổi pha (chỉ chạm React khi thật sự đổi) ──
      const next =
        now >= T.portal ? "exit"
        : now >= T.shine ? "shine"
        : now >= T.logoIn ? "form"
        : now >= T.dissolve ? "compile"
        : "code";
      if (next !== phaseName) {
        phaseName = next;
        setPhase(next);
      }

      // ── Pha 2–3: sinh hạt rồi vẽ ──
      if (now >= T.dissolve && now < T.dustOut) {
        if (!dust) dust = buildDust() || [];
        drawDust(now);
      } else if (dust && now >= T.dustOut) {
        ctx.clearRect(0, 0, w, h);
        dust = null;
      }

      // Bộ đếm góc HUD — cập nhật thẳng vào DOM, không kéo React render lại.
      const pct = Math.round(clamp01(easeOutCubic(clamp01(now / T.portal))) * 100);
      if (pct !== lastPct) {
        lastPct = pct;
        if (pctEl) pctEl.textContent = String(pct).padStart(3, "0");
      }

      if (now < T.end) {
        raf = requestAnimationFrame(frame);
      } else {
        finish();
      }
    };
    raf = requestAnimationFrame(frame);

    // Lưới an toàn bằng đồng hồ thật. Tab mở nền (Ctrl+click) thì trình duyệt
    // treo hẳn requestAnimationFrame — không có cái này, preloader đứng im mãi
    // và người dùng quay lại chỉ thấy màn hình đen. setTimeout vẫn chạy, nên nó
    // luôn trả được quyền hiển thị cho trang chủ.
    const guard = setTimeout(finish, T.end + 300);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(guard);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
      img.onload = null;
      dust = null;
    };
  }, []);

  const [status, hud] = HUD[phase] || HUD.code;

  return (
    <div className="pl" data-phase={phase} role="presentation" aria-hidden="true">
      <div className="pl__grid" />

      <div className="pl__hud">
        <span className="pl__hud-i pl__hud-i--tl">ARTDS / SYSTEM 01</span>
        <span className="pl__hud-i pl__hud-i--tr">BUILD 001</span>
        <span className="pl__hud-i pl__hud-i--bl">{hud}</span>
        <span className="pl__hud-i pl__hud-i--br">
          <b ref={pctRef}>000</b> %
        </span>
      </div>

      <div className="pl__term">
        <div className="pl__line">
          <span className="pl__prompt" ref={promptRef}>
            &gt;
          </span>
          <span className="pl__type">
            <span className="pl__ghost">{CODE}</span>
            <span className="pl__live">
              <span className="pl__code" ref={codeRef} />
              <i className="pl__caret" />
            </span>
          </span>
        </div>
        <div className="pl__status">{status}</div>
      </div>

      <canvas className="pl__canvas" ref={canvasRef} />

      <div className="pl__logo" ref={logoRef}>
        <svg className="pl__mark" viewBox="0 0 120 120" role="img" aria-label="ARTDS">
          <defs>
            {/* Kim loại chải: sáng–tối xen kẽ theo đường chéo, không phải một
                dải chuyển màu đều — đó là thứ tạo cảm giác bề mặt có hướng. */}
            <linearGradient id="pl-metal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#2a3335" />
              <stop offset="0.18" stopColor="#7d8c8a" />
              <stop offset="0.34" stopColor="#dfe9e6" />
              <stop offset="0.47" stopColor="#6d7b79" />
              <stop offset="0.62" stopColor="#c3d3d0" />
              <stop offset="0.78" stopColor="#55625f" />
              <stop offset="1" stopColor="#323d3e" />
            </linearGradient>

            {/* Ánh teal hắt lên mép trên–phải, giữ ở mức rất thấp. */}
            <linearGradient id="pl-tealcast" x1="0.15" y1="1" x2="0.9" y2="0">
              <stop offset="0" stopColor="#4fd6c0" stopOpacity="0" />
              <stop offset="0.55" stopColor="#4fd6c0" stopOpacity="0.16" />
              <stop offset="1" stopColor="#8ff0e0" stopOpacity="0.3" />
            </linearGradient>

            {/* Vệt sáng quét: trong suốt → trắng dịu → teal → trong suốt. */}
            <linearGradient id="pl-shine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.34" stopColor="#fff" stopOpacity="0.5" />
              <stop offset="0.5" stopColor="#eafffb" stopOpacity="0.8" />
              <stop offset="0.68" stopColor="#4fd6c0" stopOpacity="0.42" />
              <stop offset="1" stopColor="#4fd6c0" stopOpacity="0" />
            </linearGradient>

            {/* Silhouette lấy thẳng từ file logo: mặt kim loại và vệt sáng đều
                bị cắt đúng theo hình thật, không phải một khối hình vẽ lại. */}
            <mask
              id="pl-shape"
              className="pl__cut"
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="120"
              height="120"
            >
              <image
                href={logoUrl}
                x="0"
                y="0"
                width="120"
                height="120"
                preserveAspectRatio="xMidYMid meet"
              />
            </mask>
          </defs>

          {/* Nét viền chạy quanh vành logo — pha "outline" trước khi bề mặt hiện. */}
          <circle className="pl__ring" cx="60" cy="60" r="40" pathLength="100" />

          <g className="pl__surface" mask="url(#pl-shape)">
            <rect x="0" y="0" width="120" height="120" fill="url(#pl-metal)" />
            <rect x="0" y="0" width="120" height="120" fill="url(#pl-tealcast)" />
            {/* Lớp phủ tối tan dần: graphite → bạc → kim loại. Nằm DƯỚI vệt
                sáng để lúc hai hiệu ứng chồng nhau, vệt sáng không bị dìm. */}
            <rect className="pl__dim" x="0" y="0" width="120" height="120" fill="#080d0f" />
            <rect className="pl__shine" x="-70" y="-30" width="52" height="180" fill="url(#pl-shine)" />
          </g>

          {/* Lớp màu thương hiệu, để rất nhẹ: đủ nhận ra ARTDS mà không chói. */}
          <image
            className="pl__brand"
            href={logoUrl}
            x="0"
            y="0"
            width="120"
            height="120"
            preserveAspectRatio="xMidYMid meet"
          />
        </svg>

        <span className="pl__tag">CODE TO ART</span>
      </div>

      <div className="pl__portal" />
    </div>
  );
}
