# Preloader "Code to Art"

Màn hình mở đầu thương hiệu ARTDS: **CODE → COMPILE → PARTICLES → LOGO → SHIMMER → VÀO TRANG**.
Tổng thời lượng **2,69 giây**, không dùng thư viện animation nào (không GSAP).

| File | Vai trò |
| --- | --- |
| `src/components/common/Preloader.jsx` | Bảng thời gian, hệ hạt trên canvas, SVG logo |
| `src/styles/common/preloader.css` | Toàn bộ chuyển động CSS + hiệu ứng hiện trang chủ |
| `src/assets/artds_logo-512.png` | Bản 512px của logo (bản gốc 1254px giữ nguyên) |

---

## Cách nó chạy

`Preloader.jsx` chạy **một vòng `requestAnimationFrame` duy nhất**. Vòng lặp chỉ làm hai việc:

1. Vẽ hạt lên `<canvas>` — thứ duy nhất cần cập nhật từng khung hình.
2. Đổi thuộc tính `data-phase` trên thẻ `.pl`.

Mọi chuyển động còn lại (logo hiện hình, vệt sáng, nảy, quầng sáng) là **CSS animation** ăn theo
`data-phase`. Không xâu chuỗi `setTimeout` nên các pha không trôi lệch khi máy giật một nhịp.

### Bảng thời gian

Sửa nhịp ở hằng số `T` đầu file `Preloader.jsx`, không phải trong JSX hay CSS:

| Mốc (ms) | Xảy ra gì |
| --- | --- |
| `typeStart` 60 → `typeEnd` 800 | Gõ `const experience = build("ARTDS");` |
| `dissolve` 820 | Chữ nhoè + lùi lại; hạt sinh ra **đúng từ nét chữ**, HUD đổi sang COMPILING |
| `logoIn` 1230 | Vành logo được vẽ, mặt kim loại hiện dần từ graphite |
| `flightEnd` 1520 | Hạt chạm đích trên hình logo (hội tụ là cả đoạn `dissolve` → đây) |
| `dustOut` 1720 | Hạt tan hết |
| `shine` 1770 | Vệt sáng quét chéo — **một lần**, không lặp |
| `pulse` 2250 | Logo nảy 2,5%. Nằm trong keyframe `pl-logo` mốc 82%, **không** do hằng số này điều khiển — nó chỉ là chỗ nút "bỏ qua" nhảy tới |
| `portal` 2330 | Quầng teal mềm loang ra, `.pl` mờ dần |
| `end` 2690 | Gọi `onDone` → trang chủ hiện lên trong 800ms |

CSS animation nào cũng phải gắn vào bộ chọn **phủ nhiều pha** (`:not([data-phase='code'])`,
`:is(...)`). Tách mỗi pha một bộ chọn thì `animation-name` đổi giữa chừng và animation **chạy lại từ
đầu** ngay giữa hiệu ứng.

---

## Hệ hạt

Hạt không phải bụi ngẫu nhiên — cả điểm đi lẫn điểm đến đều lấy mẫu từ thứ có thật trên màn hình:

- **Nguồn**: rasterise chính hai thẻ `.pl__prompt` + `.pl__code` (dùng font đang hiển thị) rồi quét
  alpha → hạt bật ra từ đúng nét chữ vừa gõ.
- **Đích**: rasterise chính file logo trong hộp `.pl__logo` rồi quét alpha → hạt tụ lại thành đúng
  hình logo.

Quỹ đạo là nội suy có pháp tuyến cong (`arc`) cộng cú hất tung tắt dần (`ex/ey`), không phải mô phỏng
vật lý — rẻ và tất định. Số hạt tự co theo màn: **340** dưới 640px, **820** trở lên; vẽ bằng
`fillRect` với `globalCompositeOperation = 'lighter'`.

Ảnh logo chưa tải kịp thì đích rơi về một vòng tròn (`pointsFromRing`) — không bao giờ đứng hình.

---

## Logo

Logo là `<svg>`, dùng **chính file PNG thương hiệu** làm silhouette qua `<mask>`:

```
mặt kim loại (gradient chải)  ─┐
ánh teal hắt góc trên–phải     ├─ đều bị cắt theo mask lấy từ artds_logo-512.png
lớp phủ tối tan dần            │
vệt sáng quét chéo            ─┘
lớp màu thương hiệu (opacity 0.5, saturate .7)
```

> **`mask-type: alpha` là bắt buộc** (đặt trong `.pl__cut`). `<mask>` mặc định cắt theo *độ sáng*;
> logo có mảng tối và vệt lốm đốm nên cắt theo độ sáng sẽ ra mặt kim loại loang lổ và mất hẳn phần
> vành xanh đậm. Cắt theo alpha đo được IoU 0,93 so với file gốc, không sót pixel nào.

### Chỉnh sắc độ

| Nút vặn | Ở đâu | Mặc định |
| --- | --- | --- |
| Độ đậm màu thương hiệu | `--pl-brand` trong `.pl` | `0.5` (0 = kim loại thuần, 1 = màu gốc) |
| Màu nhấn | `--pl-teal` | `#4fd6c0` |
| Nền | `--pl-bg` | `#05070a` |
| Sắc kim loại | gradient `#pl-metal` trong JSX | graphite → bạc → graphite |

---

## Thay logo mới

Bản 512px là bản preloader thực sự dùng. Logo hiển thị to nhất 240px nên 512px đã dư cho màn Retina,
mà nhẹ hơn bản gốc **3,6 lần** (143KB so với 515KB) — preloader cần ảnh xong trước mốc 1,23s, tải
515KB thì mạng chậm không kịp.

Thay logo thì tạo lại bản 512px (PowerShell, không cần cài gì):

```powershell
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile("D:\Project\src\assets\artds_logo.png")
$dst = New-Object System.Drawing.Bitmap 512, 512, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($dst)
$g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($src, (New-Object System.Drawing.Rectangle 0, 0, 512, 512))
$g.Dispose()
$dst.Save("D:\Project\src\assets\artds_logo-512.png", [System.Drawing.Imaging.ImageFormat]::Png)
$dst.Dispose(); $src.Dispose()
```

Logo phải là **PNG nền trong suốt** — mask ăn theo kênh alpha.

---

## Tần suất chạy

Mặc định **một lần mỗi phiên trình duyệt** (`sessionStorage`), khai báo ở đầu `src/App.jsx`:

```js
const PRELOADER_ONCE_PER_SESSION = true;
```

App này để học hằng ngày, mở lại chục lần một buổi — lần nào cũng bắt xem 2,7 giây thì nó thành vật
cản. Đổi thành `false` là chạy lại ở mọi lần tải trang.

Người dùng **bấm/chạm/gõ phím bất kỳ** để bỏ qua: đồng hồ nhảy thẳng tới pha kết, phần đuôi (nảy →
quầng sáng → mờ dần) vẫn chạy đủ nên không bị cắt cụt thô bạo.

---

## Những chỗ dễ vấp

- **Tab mở nền treo `requestAnimationFrame`.** Có `setTimeout` lưới an toàn ở `T.end + 300ms`, nếu
  không thì người mở link bằng Ctrl+click quay lại chỉ thấy màn hình đen vĩnh viễn.
- **Không đặt `transform` lên `.app`** khi cho trang chủ hiện ra. `.app` có transform thì mọi con
  `position: fixed` (nút lên đầu trang, lớp phủ, `.bg-orbs`) sẽ bám vào `.app` cao bằng cả trang thay
  vì bám viewport. Hiệu ứng nâng nội dung vì thế chỉ đặt lên `.header__inner`, `.main-content`,
  `.footer`, và class `.app--reveal` bị gỡ ngay khi animation xong.
- **`preloader.css` phải nạp sau `base.css`** (đã đặt đúng trong `main.jsx`) vì nó chỉnh lại `.app`.
- **Bề rộng ô lệnh do `.pl__ghost` giữ** — một bản sao vô hình của cả dòng lệnh. Đo bằng `ch` thì lúc
  JetBrains Mono tải xong bề rộng sẽ nhảy một nhịp ngay giữa lúc đang gõ.
- **`prefers-reduced-motion`**: JS bỏ hẳn canvas và vệt sáng, chỉ hiện logo tĩnh ~1,3 giây rồi vào
  trang. Không chỉ dựa vào khối `@media` trong `base.css`.
