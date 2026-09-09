/**
 * Sinh trang tập viết Kanji để IN / lưu PDF.
 *
 * Vì sao mở cửa sổ mới + window.print() thay vì jsPDF/pdf-lib:
 *  - Nét mẫu đã có sẵn dạng path SVG (KanjiVG, viewBox 0 0 109 109) trong
 *    kanji.json, nên vẽ thẳng bằng SVG cho chất lượng VECTOR, in khổ nào cũng nét.
 *  - Không thêm dependency, không phải nhúng font tiếng Nhật nặng vài MB.
 *  - Trình duyệt nào cũng có "Lưu thành PDF" trong hộp thoại in.
 *
 * Cửa sổ in là một tài liệu HTML ĐỘC LẬP (CSS riêng), nên hoàn toàn cách ly với
 * CSS của app — tránh mọi rủi ro cascade khi in.
 */

// Font kiểu sách giáo khoa (Mincho) nếu máy có, không thì lùi về sans có kanji.
const JP_FONT =
  "'Yu Mincho','Hiragino Mincho ProN','MS Mincho','Noto Serif JP'," +
  "'Yu Gothic','Hiragino Sans','Meiryo','Noto Sans JP',sans-serif";

const ESC = (s = "") =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** Ô kẻ vuông + đường chấm chữ thập (canh nét). `inner` là lớp phủ chữ/nét. */
function cell(inner = "", extraClass = "") {
  return (
    `<div class="cell ${extraClass}">` +
    `<svg class="grid" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">` +
    `<rect x="1.5" y="1.5" width="97" height="97" fill="none" stroke="#c8c8c8" stroke-width="1.2"/>` +
    `<line x1="50" y1="2" x2="50" y2="98" stroke="#e0e0e0" stroke-width="0.9" stroke-dasharray="3.5 3"/>` +
    `<line x1="2" y1="50" x2="98" y2="50" stroke="#e0e0e0" stroke-width="0.9" stroke-dasharray="3.5 3"/>` +
    `</svg>` +
    inner +
    `</div>`
  );
}

/** Lớp phủ = ký tự bằng font (đậm hoặc mờ để tô). */
function charOverlay(char, faint = false) {
  return `<span class="ch${faint ? " faint" : ""}">${ESC(char)}</span>`;
}

/** Lớp phủ = nét mẫu vẽ bằng path + (tuỳ chọn) số thứ tự nét. */
function strokeOverlay(strokes = [], { numbers = false } = {}) {
  const paths = strokes
    .map(
      (d) =>
        `<path d="${ESC(d)}" fill="none" stroke="#333" stroke-width="3.4" ` +
        `stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join("");
  let nums = "";
  if (numbers) {
    nums = strokes
      .map((d, i) => {
        const m = /M\s*([\d.]+)[,\s]+([\d.]+)/.exec(d);
        if (!m) return "";
        return (
          `<circle cx="${+m[1]}" cy="${+m[2]}" r="7" fill="#fff" stroke="#e23" stroke-width="1"/>` +
          `<text x="${+m[1]}" y="${+m[2]}" class="snum">${i + 1}</text>`
        );
      })
      .join("");
  }
  return (
    `<svg class="strokes" viewBox="0 0 109 109" aria-hidden="true">${paths}${nums}</svg>`
  );
}

/** Một khối luyện cho 1 kanji: header (mẫu + số nét + thông tin) và các hàng ô. */
function kanjiBlock(k, opt) {
  const strokes = Array.isArray(k.strokes) ? k.strokes : [];

  // ── Header ──
  const head = [];
  if (opt.showSample) {
    head.push(cell(charOverlay(k.char), "cell--head"));
  }
  if (opt.showNumbered && strokes.length) {
    head.push(cell(strokeOverlay(strokes, { numbers: true }), "cell--head"));
  }
  if (opt.showInfo) {
    const readings = [];
    if (k.on) readings.push(`On: ${ESC(k.on)}`);
    if (k.kun) readings.push(`Kun: ${ESC(k.kun)}`);
    head.push(
      `<div class="info">` +
        `<div class="info__mean">${ESC(k.meaning || "")}</div>` +
        (k.hanviet ? `<div class="info__hv">Hán-Việt: ${ESC(k.hanviet)}</div>` : "") +
        (readings.length ? `<div class="info__rd">${readings.join(" · ")}</div>` : "") +
        `<div class="info__meta">${ESC(k.level || "")} · ${k.stroke || strokes.length} nét</div>` +
        `</div>`,
    );
  }

  // ── Các hàng ô luyện ──
  const rows = [];
  const cols = opt.cols;
  let faintLeft = opt.showFaint ? opt.faintCount : 0;
  for (let r = 0; r < opt.rows; r++) {
    const cells = [];
    for (let c = 0; c < cols; c++) {
      if (faintLeft > 0) {
        cells.push(
          cell(strokes.length ? strokeFaint(strokes) : charOverlay(k.char, true)),
        );
        faintLeft--;
      } else {
        cells.push(cell(""));
      }
    }
    rows.push(`<div class="prow" style="--cols:${cols}">${cells.join("")}</div>`);
  }

  return (
    `<section class="kblock">` +
    `<div class="khead">${head.join("")}</div>` +
    rows.join("") +
    `</section>`
  );
}

/** Nét mẫu mờ để tô (dùng lại path, opacity thấp). */
function strokeFaint(strokes) {
  const paths = strokes
    .map(
      (d) =>
        `<path d="${ESC(d)}" fill="none" stroke="#000" stroke-opacity="0.16" ` +
        `stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join("");
  return `<svg class="strokes" viewBox="0 0 109 109" aria-hidden="true">${paths}</svg>`;
}

const CSS = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: ${JP_FONT}; color: #111; background: #fff; }
  @page { size: A4 portrait; margin: 12mm 10mm; }

  .doc-title { text-align: center; font-size: 15pt; font-weight: 700; margin: 0 0 2mm; }
  .doc-sub { text-align: center; font-size: 9pt; color: #666; margin: 0 0 5mm; }

  .kblock {
    break-inside: avoid; page-break-inside: avoid;
    padding: 3mm 0 4mm; border-bottom: 0.4mm dashed #ccc; margin-bottom: 3mm;
  }
  .khead { display: flex; align-items: stretch; gap: 3mm; margin-bottom: 2.5mm; }

  .prow { display: grid; grid-template-columns: repeat(var(--cols), 1fr); gap: 1.5mm; }
  .prow + .prow { margin-top: 1.5mm; }

  .cell { position: relative; width: 100%; aspect-ratio: 1 / 1; }
  .cell--head { width: 20mm; height: 20mm; flex: 0 0 auto; }
  .grid { position: absolute; inset: 0; width: 100%; height: 100%; }

  .ch {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    font-size: 15mm; line-height: 1; font-weight: 600;
  }
  .cell:not(.cell--head) .ch { font-size: 0.8em; }
  .prow .ch { font-size: 11mm; }
  .ch.faint { color: #000; opacity: 0.16; font-weight: 500; }

  .strokes { position: absolute; inset: 6%; width: 88%; height: 88%; }
  .snum { font-size: 9px; fill: #e23; text-anchor: middle; dominant-baseline: central;
          font-family: Arial, sans-serif; font-weight: 700; }

  .info { flex: 1 1 auto; display: flex; flex-direction: column; justify-content: center; gap: 1mm; }
  .info__mean { font-size: 13pt; font-weight: 700; }
  .info__hv { font-size: 10pt; color: #b45309; }
  .info__rd { font-size: 9.5pt; color: #333; }
  .info__meta { font-size: 8.5pt; color: #888; }

  .toolbar {
    position: sticky; top: 0; background: #fff; padding: 8px; text-align: center;
    border-bottom: 1px solid #eee; z-index: 9;
  }
  .toolbar button {
    font-size: 14px; padding: 8px 18px; margin: 0 4px; cursor: pointer;
    border: 1px solid #a78bfa; background: #a78bfa; color: #fff; border-radius: 8px; font-weight: 600;
  }
  .toolbar button.ghost { background: #fff; color: #a78bfa; }
  @media print { .toolbar { display: none; } }
`;

/**
 * Mở cửa sổ in với danh sách kanji đã chọn.
 * @param {Array} list  mảng object kanji (cần .char, .strokes, ...)
 * @param {Object} opt  tuỳ chọn bố cục
 */
export function buildKanjiSheetHTML(list, opt = {}) {
  const options = {
    cols: 10,
    rows: 2,
    faintCount: 4,
    showSample: true,
    showNumbered: true,
    showInfo: true,
    showFaint: true,
    title: "Tập viết Kanji",
    date: "",
    ...opt,
  };

  const blocks = list.map((k) => kanjiBlock(k, options)).join("");
  return (
    `<!doctype html><html lang="vi"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>${ESC(options.title)}</title><style>${CSS}</style></head><body>` +
    `<div class="toolbar">` +
    `<button onclick="window.print()">🖨️ In / Lưu PDF</button>` +
    `<button class="ghost" onclick="window.close()">Đóng</button>` +
    `</div>` +
    `<h1 class="doc-title">${ESC(options.title)}</h1>` +
    `<p class="doc-sub">${list.length} kanji · ${ESC(options.date)} · Nét mẫu theo KanjiVG (CC BY-SA)</p>` +
    blocks +
    `</body></html>`
  );
}

export function openKanjiPracticeSheet(list, opt = {}) {
  if (!Array.isArray(list) || list.length === 0) {
    alert("Chưa chọn kanji nào để xuất.");
    return;
  }

  const html = buildKanjiSheetHTML(list, {
    date: new Date().toLocaleDateString("vi-VN"),
    ...opt,
  });

  // Blob URL mở tab mới ổn định hơn document.write, và cho phép trình duyệt tự
  // đặt tên file khi lưu PDF.
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const win = window.open(url, "_blank");
  if (!win) {
    // Pop-up bị chặn: điều hướng ngay trong tab hiện tại để không mất kết quả.
    URL.revokeObjectURL(url);
    const fallback = window.open("", "_blank");
    if (fallback) {
      fallback.document.open();
      fallback.document.write(html);
      fallback.document.close();
    } else {
      alert("Trình duyệt chặn cửa sổ bật lên. Hãy cho phép pop-up cho trang này để xuất tập viết.");
    }
    return;
  }
  // Giải phóng blob sau khi tab con đã tải xong.
  win.addEventListener?.("load", () => URL.revokeObjectURL(url));
}
