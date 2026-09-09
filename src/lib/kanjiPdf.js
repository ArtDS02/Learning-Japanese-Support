/**
 * Xuất file PDF tập viết Kanji — TẢI THẲNG về máy, không cần thao tác in.
 *
 * Vì sao vẽ bằng Canvas 2D chứ không rasterize SVG-qua-<img>:
 *  - SVG nạp qua <img> KHÔNG làm font-fallback theo từng ký tự, nên dấu tiếng
 *    Việt (ữ, ế, ạ…) bị mất khi font chính (Nhật) không có glyph. Canvas 2D
 *    `fillText` fallback đầy đủ y như trình duyệt render HTML → dấu hiển thị đúng.
 *  - Nét kanji vẫn vẽ bằng Path2D từ chính path KanjiVG → vector, sắc nét.
 *
 * Quy trình (giữ nguyên tắc 0 dependency):
 *  1. Vẽ từng trang A4 lên <canvas> (toạ độ mm, scale lên ~180dpi).
 *  2. Xuất mỗi trang ra JPEG.
 *  3. Tự đóng gói các JPEG thành một file PDF hợp lệ (không cần jsPDF).
 */

// Font cho chữ Nhật (kanji mẫu). Ưu tiên Mincho kiểu sách, lùi về Gothic/Noto.
const FONT_JP =
  "'Yu Mincho','MS Mincho','Hiragino Mincho ProN','Yu Gothic','Meiryo'," +
  "'Noto Serif JP','Noto Sans JP',serif";
// Font cho chữ Latin/tiếng Việt (nghĩa, Hán-Việt, nhãn). Có đủ dấu tiếng Việt,
// và fallback sang font Nhật cho phần kana lẫn trong dòng cách đọc.
const FONT_VN =
  "'Segoe UI','Arial','Roboto','Noto Sans','Yu Gothic','Meiryo'," +
  "'Noto Sans JP',sans-serif";

// ─── Kích thước trang (đơn vị mm) ────────────────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 10;
const COLS = 10;
const GAP = 1.5; // khoảng cách giữa các ô luyện
const HEAD = 20; // cạnh ô mẫu/ô số nét (mm)
const HEAD_GAP = 3;
const HEAD_TO_ROWS = 2.5;
const ROW_GAP = 1.5;
const BLOCK_PAD = 4; // đệm dưới mỗi khối
const SCALE = 7; // pixel / mm khi vẽ (~178dpi)

const CELL = (PAGE_W - 2 * MARGIN - (COLS - 1) * GAP) / COLS; // ~17.65mm

function blockHeight(rows) {
  return HEAD + HEAD_TO_ROWS + rows * CELL + (rows - 1) * ROW_GAP + BLOCK_PAD;
}

// ─── Vẽ các thành phần lên canvas (toạ độ mm, ctx đã scale sẵn) ──────────────

function drawGridCell(ctx, x, y, s) {
  ctx.setLineDash([]);
  ctx.strokeStyle = "#c8c8c8";
  ctx.lineWidth = 0.3;
  ctx.strokeRect(x, y, s, s);

  ctx.strokeStyle = "#e2e2e2";
  ctx.lineWidth = 0.2;
  ctx.setLineDash([1, 0.8]);
  ctx.beginPath();
  ctx.moveTo(x + s / 2, y);
  ctx.lineTo(x + s / 2, y + s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y + s / 2);
  ctx.lineTo(x + s, y + s / 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawStrokes(ctx, x, y, s, strokes, { numbers = false, faint = false } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 109, s / 109); // hệ toạ độ KanjiVG 0..109 → ô mm
  ctx.strokeStyle = faint ? "rgba(0,0,0,0.16)" : "#333";
  ctx.lineWidth = 3.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const d of strokes) ctx.stroke(new Path2D(d));

  if (numbers) {
    for (let i = 0; i < strokes.length; i++) {
      const m = /M\s*([\d.]+)[,\s]+([\d.]+)/.exec(strokes[i]);
      if (!m) continue;
      const cx = +m[1];
      const cy = +m[2];
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#e23";
      ctx.stroke();
      ctx.fillStyle = "#e23";
      ctx.font = "700 9px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), cx, cy);
    }
  }
  ctx.restore();
}

function drawChar(ctx, x, y, s, char, faint = false) {
  ctx.fillStyle = faint ? "rgba(0,0,0,0.16)" : "#111";
  ctx.font = `600 ${s * 0.74}px ${FONT_JP}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(char, x + s / 2, y + s / 2);
}

function drawInfo(ctx, x, y, k, strokes) {
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  let yy = y + 4.8;

  ctx.fillStyle = "#111";
  ctx.font = `700 4.6px ${FONT_VN}`;
  ctx.fillText(k.meaning || "", x, yy);

  if (k.hanviet) {
    yy += 5;
    ctx.fillStyle = "#b45309";
    ctx.font = `400 3.6px ${FONT_VN}`;
    ctx.fillText(`Hán-Việt: ${k.hanviet}`, x, yy);
  }

  const rd = [];
  if (k.on) rd.push(`On: ${k.on}`);
  if (k.kun) rd.push(`Kun: ${k.kun}`);
  if (rd.length) {
    yy += 4.6;
    ctx.fillStyle = "#333";
    ctx.font = `400 3.4px ${FONT_VN}`;
    ctx.fillText(rd.join("   ·   "), x, yy);
  }

  yy += 4.4;
  ctx.fillStyle = "#888";
  ctx.font = `400 3.1px ${FONT_VN}`;
  ctx.fillText(`${k.level || ""} · ${k.stroke || strokes.length} nét`, x, yy);
}

/** Vẽ 1 khối kanji tại (MARGIN, top). */
function drawBlock(ctx, k, top, opt) {
  const strokes = Array.isArray(k.strokes) ? k.strokes : [];
  const x0 = MARGIN;

  // Header: ô mẫu, ô số nét, thông tin
  let hx = x0;
  if (opt.showSample) {
    drawGridCell(ctx, hx, top, HEAD);
    drawChar(ctx, hx, top, HEAD, k.char);
    hx += HEAD + HEAD_GAP;
  }
  if (opt.showNumbered && strokes.length) {
    drawGridCell(ctx, hx, top, HEAD);
    drawStrokes(ctx, hx, top, HEAD, strokes, { numbers: true });
    hx += HEAD + HEAD_GAP;
  }
  if (opt.showInfo) {
    drawInfo(ctx, hx + 1, top, k, strokes);
  }

  // Các hàng ô luyện
  const rowsY = top + HEAD + HEAD_TO_ROWS;
  let faintLeft = opt.showFaint ? opt.faintCount : 0;
  for (let r = 0; r < opt.rows; r++) {
    const cy = rowsY + r * (CELL + ROW_GAP);
    for (let c = 0; c < COLS; c++) {
      const cx = x0 + c * (CELL + GAP);
      drawGridCell(ctx, cx, cy, CELL);
      if (faintLeft > 0) {
        if (strokes.length) drawStrokes(ctx, cx, cy, CELL, strokes, { faint: true });
        else drawChar(ctx, cx, cy, CELL, k.char, true);
        faintLeft--;
      }
    }
  }
}

/** Chia kanji thành các trang; mỗi trang là {withTitle, items:[{k, top}]}. */
function layoutPages(list, opt) {
  const bH = blockHeight(opt.rows);
  const blockGap = 3;
  const pages = [];
  let items = [];
  let y = opt.headerFirst ? 16 : MARGIN;
  let first = true;

  for (const k of list) {
    if (y + bH > PAGE_H - MARGIN && items.length) {
      pages.push({ withTitle: first, items });
      first = false;
      items = [];
      y = MARGIN;
    }
    items.push({ k, top: y });
    y += bH + blockGap;
  }
  if (items.length) pages.push({ withTitle: first, items });
  return pages;
}

/** Vẽ một trang ra canvas → trả về JPEG dataURL. */
function renderPage(page, list, opt) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(PAGE_W * SCALE);
  canvas.height = Math.round(PAGE_H * SCALE);
  const ctx = canvas.getContext("2d");

  // Nền trắng (JPEG không có kênh alpha).
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.scale(SCALE, SCALE); // từ đây vẽ theo mm

  if (page.withTitle) {
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#111";
    ctx.font = `700 6px ${FONT_VN}`;
    ctx.fillText(opt.title, PAGE_W / 2, 8);
    ctx.fillStyle = "#888";
    ctx.font = `400 3.2px ${FONT_VN}`;
    ctx.fillText(
      `${list.length} kanji · ${opt.date} · Nét mẫu theo KanjiVG (CC BY-SA)`,
      PAGE_W / 2,
      13,
    );
  }

  for (const it of page.items) drawBlock(ctx, it.k, it.top, opt);

  return canvas.toDataURL("image/jpeg", 0.82);
}

// ─── Đóng gói các JPEG thành PDF (không cần thư viện) ────────────────────────

function latin1(str) {
  const u = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) u[i] = str.charCodeAt(i) & 0xff;
  return u;
}

function jpegBytes(dataUrl) {
  const bin = atob(dataUrl.split(",")[1]);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

/** items: [{ jpeg: Uint8Array, w, h }] (w,h = kích thước ảnh px). */
function assemblePdf(items) {
  const PT_W = (PAGE_W / 25.4) * 72; // A4 rộng theo point
  const PT_H = (PAGE_H / 25.4) * 72;

  const chunks = [];
  let length = 0;
  const put = (data) => {
    const u = typeof data === "string" ? latin1(data) : data;
    chunks.push(u);
    length += u.length;
  };

  const nObj = 2 + items.length * 3; // Catalog + Pages + (img,content,page)*n
  const offsets = new Array(nObj + 1).fill(0);
  const startObj = (n) => {
    offsets[n] = length;
  };

  put("%PDF-1.3\n%\xE2\xE3\xCF\xD3\n");

  startObj(1);
  put("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  const pageIds = items.map((_, k) => 5 + k * 3);
  startObj(2);
  put(
    `2 0 obj\n<< /Type /Pages /Count ${items.length} /Kids [${pageIds
      .map((id) => `${id} 0 R`)
      .join(" ")}] >>\nendobj\n`,
  );

  items.forEach((it, k) => {
    const imgId = 3 + k * 3;
    const contentId = 4 + k * 3;
    const pageId = 5 + k * 3;

    startObj(imgId);
    put(
      `${imgId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${it.w} /Height ${it.h} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${it.jpeg.length} >>\nstream\n`,
    );
    put(it.jpeg);
    put("\nendstream\nendobj\n");

    const content = `q\n${PT_W.toFixed(2)} 0 0 ${PT_H.toFixed(2)} 0 0 cm\n/Im0 Do\nQ\n`;
    startObj(contentId);
    put(`${contentId} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`);

    startObj(pageId);
    put(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PT_W.toFixed(2)} ${PT_H.toFixed(
        2,
      )}] ` +
        `/Resources << /XObject << /Im0 ${imgId} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`,
    );
  });

  const xrefStart = length;
  let xref = `xref\n0 ${nObj + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= nObj; i++) {
    xref += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  }
  put(xref);
  put(`trailer\n<< /Size ${nObj + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);

  return new Blob(chunks, { type: "application/pdf" });
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Sinh và TẢI VỀ file PDF tập viết.
 * @param {Array} list  danh sách kanji
 * @param {Object} opt  tuỳ chọn bố cục / tiêu đề
 * @returns {Promise<{pages:number}>}
 */
export async function exportKanjiPdf(list, opt = {}) {
  const options = {
    rows: 2,
    faintCount: 4,
    showSample: true,
    showNumbered: true,
    showInfo: true,
    showFaint: true,
    headerFirst: true,
    title: "Tập viết Kanji N5 & N4",
    date: new Date().toLocaleDateString("vi-VN"),
    filename: "",
    ...opt,
  };
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("Danh sách kanji rỗng");
  }

  // Đảm bảo font (kể cả webfont Noto của app) đã tải xong trước khi vẽ.
  try {
    await document.fonts.ready;
  } catch {
    /* trình duyệt cũ không có Font Loading API */
  }

  const pages = layoutPages(list, options);
  const w = Math.round(PAGE_W * SCALE);
  const h = Math.round(PAGE_H * SCALE);
  const items = pages.map((p) => ({ jpeg: jpegBytes(renderPage(p, list, options)), w, h }));

  const blob = assemblePdf(items);
  const name = options.filename || `tap-viet-kanji-${list.length}-chu.pdf`;
  triggerDownload(blob, name);
  return { pages: pages.length };
}
