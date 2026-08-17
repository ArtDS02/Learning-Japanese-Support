# Prompt: Preloader "Code to Art"

> Prompt tái sử dụng cho dự án khác. Thay `{BRAND}` bằng tên thương hiệu, `{LOGO_PATH}` bằng
> đường dẫn file logo. Phần **Bẫy bắt buộc xử lý** là quan trọng nhất — đó là những chỗ một bản
> implement "trông có vẻ đúng" sẽ hỏng, và không tự lộ ra khi test qua loa.

---

Tạo một preloader thương hiệu cho website này, concept:

**CODE → COMPILE → PARTICLES → LOGO → SHIMMER → VÀO TRANG**

Cảm giác cần đạt: technology + creative developer + premium + minimal + futuristic. Luxury nhưng
không phô trương. Người xem phải đọc ra một quá trình:

> "Một developer đang viết code" → "code đang được compile" → "code đang biến thành hình thái" →
> "hình thái đó trở thành {BRAND}" → "tôi đang bước vào chính sản phẩm vừa được tạo ra."

Đây là **brand experience**, không phải loading spinner. Nếu phải chọn giữa "nhiều hiệu ứng" và "ít
hiệu ứng nhưng premium", chọn phương án thứ hai. Ưu tiên **độ mượt và sự liền mạch giữa các pha**
hơn số lượng hiệu ứng.

---

## 1. Bảng thời gian

Tổng **2,5–2,7 giây**. Các pha được phép chồng nhẹ lên nhau để liền mạch.

| Mốc (ms) | Xảy ra gì |
| --- | --- |
| 60 → 800 | Typewriter gõ `const experience = build("{BRAND}");`, con trỏ nhấp nháy |
| 820 | Chữ nhoè + lùi lại; hạt sinh ra **đúng từ nét chữ**; HUD đổi sang COMPILING |
| 820 → 1520 | Hạt bung ra rồi hội tụ về tâm theo quỹ đạo cong |
| 1230 | Vành logo được vẽ; mặt kim loại hiện dần: dark graphite → graphite → bạc → metallic |
| 1520 → 1720 | Hạt chạm đích rồi tan, đúng lúc logo hiện rõ |
| 1770 → 2330 | Vệt sáng quét chéo qua mặt kim loại — **một lần**, không lặp |
| ~2300 | Logo nảy rất nhẹ: `scale(1)` → `scale(1.025)` |
| 2330 | Quầng sáng teal mềm loang ra từ tâm logo; preloader mờ dần |
| 2690 | Trang chủ hiện lên (800ms) |

Toàn bộ mốc thời gian phải nằm trong **một object hằng số duy nhất** ở đầu file, để chỉnh nhịp sau
này không phải lần trong JSX/CSS.

---

## 2. Kiến trúc bắt buộc

**Một vòng `requestAnimationFrame` duy nhất.** Mốc tính từ `performance.now()`, **không** xâu chuỗi
`setTimeout` (chuỗi timeout trôi lệch dần khi máy giật một nhịp, và không thể tua/bỏ qua).

Vòng lặp chỉ làm đúng hai việc:

1. Vẽ hạt lên `<canvas>` — thứ duy nhất cần cập nhật từng khung hình.
2. Đổi thuộc tính `data-phase` trên thẻ gốc.

Mọi chuyển động còn lại (logo hiện hình, vệt sáng, nảy, quầng sáng) là **CSS animation/transition**
ăn theo `data-phase`. Không animate bằng JS những gì CSS làm được.

Trạng thái nhỏ (typewriter, bộ đếm %) ghi **thẳng vào DOM** qua ref, không đẩy qua state của
framework — 44 lần re-render trong 740ms là lãng phí vô ích.

Không thêm dependency mới. Nếu dự án đã có GSAP thì dùng GSAP Timeline; chưa có thì vanilla JS +
CSS là đủ, **đừng cài thêm thư viện chỉ để làm preloader**.

---

## 3. Logo — quy tắc bắt buộc

Logo trong preloader phải là **chính file logo thương hiệu** (`{LOGO_PATH}`), **không vẽ lại, không
giả lập bằng text HTML, không tự thiết kế logo thay thế**.

Cách làm: đặt file logo làm **silhouette qua SVG `<mask>`**, rồi tô các lớp hiệu ứng bên trong mask:

```
mặt kim loại (linear-gradient chải, sáng–tối xen kẽ theo đường chéo)  ─┐
ánh teal hắt lên mép trên–phải (opacity rất thấp)                      ├─ đều bị cắt theo mask
lớp phủ tối tan dần (graphite → bạc → metallic)                        │
vệt sáng quét chéo                                                    ─┘
lớp màu thương hiệu gốc, opacity ~0.5, saturate(.7) brightness(.9)
```

Lớp cuối để logo vẫn nhận ra được là thương hiệu, nhưng không chói. Đặt độ đậm của nó thành **CSS
variable** để chỉnh sau (0 = kim loại thuần, 1 = màu gốc).

> ### ⚠️ `mask-type: alpha` là BẮT BUỘC
> SVG `<mask>` mặc định cắt theo **độ sáng (luminance)**. Logo nào có mảng tối, vệt lốm đốm hay
> phần viền màu đậm sẽ bị cắt mất, ra mặt kim loại loang lổ. Phải khai báo `mask-type: alpha` trên
> phần tử `<mask>`. Safari < 15.4 không hiểu và rơi về luminance — chấp nhận được, logo vẫn nhận ra.

Thứ tự hiện hình: **particles → outline → metallic surface → complete logo**. Outline làm bằng một
`<circle>`/`<path>` stroke chạy `stroke-dashoffset` (đặt **ngoài** mask để nếu ảnh chưa tải kịp thì
vẫn có gì đó hiện ra).

Chuyển graphite → bạc bằng **lớp phủ tối fade opacity**, không dùng `filter: brightness()` — phía
trên đã có `<mask>`, chồng thêm filter là thêm một lớp raster mỗi khung hình.

**Không dùng:** rainbow gradient · neon mạnh · excessive bloom · chrome quá bóng · flash trắng.

---

## 4. Hệ hạt — quy tắc bắt buộc

Hạt **không được là bụi ngẫu nhiên bay vào giữa**. Cả điểm đi lẫn điểm đến phải lấy mẫu từ pixel
thật:

- **Nguồn**: rasterise chính các thẻ chữ đang hiển thị lên canvas tạm (dùng `getComputedStyle` để
  lấy đúng font/size/letter-spacing), quét kênh alpha → hạt bật ra từ đúng nét chữ vừa gõ.
- **Đích**: rasterise chính file logo trong đúng hộp hiển thị của nó, quét alpha → hạt tụ lại thành
  đúng hình logo.

Nhờ vậy "code vỡ thành hạt rồi tụ thành logo" là đúng nghĩa đen, không phải ẩn dụ mờ.

Chi tiết:

- Quỹ đạo = nội suy tuyến tính + độ cong theo pháp tuyến (biên độ ngẫu nhiên, đạt đỉnh giữa đường
  bay) + cú hất tung lúc chữ vỡ, tắt dần theo `(1-t)²`. **Không mô phỏng vật lý** — nội suy có
  easing rẻ hơn và tất định.
- **Trộn ngẫu nhiên mảng điểm đích** trước khi ghép cặp. Ghép theo thứ tự quét thì hạt bay thành
  từng dải song song, trông như thanh trượt chứ không như bụi dữ liệu.
- Lấy mẫu nguồn/đích theo **bước nhảy đều** (`arr[floor(i * arr.length / count)]`), không cắt đầu
  mảng — cắt đầu thì chỉ nửa trái dòng chữ sinh ra hạt.
- Số hạt co theo viewport (gợi ý: ~340 dưới 640px, ~820 trở lên). Vẽ bằng `fillRect` (rẻ hơn `arc`
  ở kích thước ≤ 2px) với `globalCompositeOperation = 'lighter'`.
- Độ sáng hạt đạt đỉnh **giữa** đường bay rồi dịu lại khi chạm đích — tránh loé lúc hội tụ.
- Hạt mờ dần đúng lúc logo hiện hình, để mắt đọc thành "hạt hoá thành logo".
- Sắc độ: ~89% accent · ~8% bạc · ~3% vàng ấm. Đủ để có chiều sâu, chưa tới mức pháo hoa nhiều màu.
- **Dự phòng**: ảnh logo chưa tải kịp thì điểm đích rơi về một vòng tròn. Không bao giờ được đứng hình.

DPR trần ở 2 (`Math.min(devicePixelRatio, 2)`) — màn 3x chỉ tốn pixel chứ mắt không phân biệt được.

---

## 5. Bảng màu

| Vai trò | Gợi ý |
| --- | --- |
| Nền | Obsidian `#05070a`, thêm một radial-gradient rất mờ ở tâm cho đỡ phẳng |
| Accent chính | Teal/cyan dịu `#4fd6c0` |
| Accent phụ | Metallic silver `#c8d3d1`, pha rất ít warm gold |
| Chữ HUD | `rgba(196, 212, 208, .3)` — mờ, không tranh chú ý |

Khai báo hết thành CSS variable trong phạm vi thẻ preloader. **Không tái sử dụng token màu của app**
— preloader là khoảnh khắc thương hiệu, palette riêng.

Chuẩn kiểm chứng: độ sáng trung bình của logo ≈ 160/255, **dưới 5% pixel vượt ngưỡng 204** (không có
vùng cháy sáng). Đó là ranh giới giữa "metallic premium" và "chói".

---

## 6. Vệt sáng & quầng sáng cuối

**Shimmer**: gradient `transparent → soft white → subtle teal → transparent`, quét chéo (~14°) qua
logo, bị cắt theo mask nên trông như **phản chiếu trên bề mặt kim loại**, không phải một thanh trắng
chạy ngang. Chạy **đúng một lần**, không lặp.

**Quầng sáng cuối**: radial-gradient teal mềm (`rgba(190,255,246,.5)` ở tâm, fade về 0 ở ~70%), scale
từ 0.1 → 2.6 trong khi opacity `0 → .9 → 0`.

> **Tuyệt đối không có một khung hình nào trắng toàn màn.** Không flash. Quầng sáng phải là gradient
> fade về trong suốt, không phải một khối màu đặc phóng to.

---

## 7. Hiệu ứng vào trang chủ

`opacity: 0 → 1` + `translateY(25px) → 0`, ~800ms, easing mượt (`cubic-bezier(.16, 1, .3, 1)`).
Trang chủ không được xuất hiện đột ngột.

> ### ⚠️ KHÔNG đặt `transform` lên phần tử gốc của app
> Phần tử có `transform` trở thành containing block cho **mọi con `position: fixed`** bên trong nó.
> Suốt 800ms đó, nút nổi / lớp phủ / background orbs sẽ bám vào thẻ app (cao bằng cả trang) thay vì
> bám viewport, và văng đi đâu mất.
>
> Cách đúng: thẻ gốc **chỉ fade opacity**; hiệu ứng nâng `translateY` đặt lên các khối nội dung
> (header inner, main, footer) — những khối không chứa phần tử `fixed`. Và **gỡ class đó ngay khi
> animation xong** để không còn transform nào bám lại.

---

## 8. Bẫy bắt buộc xử lý

Đây là những chỗ hỏng mà test qua loa không phát hiện ra:

1. **Tab mở nền treo hẳn `requestAnimationFrame`.** Người dùng Ctrl+click mở link ở tab nền → vòng
   lặp không chạy → preloader đứng im vĩnh viễn → quay lại chỉ thấy màn hình đen.
   → Phải có **lưới an toàn bằng `setTimeout`** ở mốc kết thúc + ~300ms. `setTimeout` vẫn chạy trong
   tab nền, nên nó luôn trả được quyền hiển thị cho trang chủ. Hàm kết thúc phải **idempotent**.

2. **CSS animation chạy lại từ đầu giữa chừng.** Nếu mỗi pha một bộ chọn riêng
   (`[data-phase="form"] .logo { animation: … }`, `[data-phase="shine"] .logo { animation: … }`) thì
   khi đổi pha, `animation-name` đổi và animation **khởi động lại** ngay giữa hiệu ứng.
   → Gắn animation vào bộ chọn **phủ nhiều pha**: `:not([data-phase="code"]):not([data-phase="compile"])`
   hoặc `:is([data-phase="shine"], [data-phase="exit"])`. Giá trị `animation` giữ nguyên → animation
   chạy tiếp liền mạch.

3. **Khung dòng lệnh nhảy bề rộng khi webfont tải xong.** Đo bằng `ch` hoặc để khung co theo chữ đang
   gõ thì khung dịch trái/phải liên tục giữa lúc typing.
   → Đặt một **bản sao vô hình của cả dòng lệnh** (`visibility: hidden`) giữ sẵn đúng bề rộng cuối
   cùng; phần chữ đang gõ + con trỏ đặt `position: absolute` chồng lên nó.

4. **Dòng lệnh lệch trục với logo.** Cho khung một bề rộng cố định kiểu `600px` rồi căn chữ sang trái
   thì chữ nằm lệch hẳn sang trái so với logo ở giữa — mà hạt bay từ chữ tới logo, lệch trục là thấy ngay.
   → Khung **co đúng bằng dòng chữ** (nhờ bản sao ở mục 3) rồi để layout căn giữa.

5. **`getComputedStyle` trả chuỗi rỗng khi phần tử đã bị gỡ khỏi DOM.** Nếu đọc font sau khi remove,
   chuỗi `ctx.font` thành sai cú pháp và canvas **âm thầm** giữ mặc định `10px sans-serif` — hạt sẽ
   nhóm thành một cục bé xíu thay vì theo nét chữ.
   → Đọc style khi phần tử còn gắn, và luôn có giá trị dự phòng trong chuỗi font.

6. **File logo quá nặng.** Preloader cần ảnh xong trước mốc ~1,2s. Logo gốc thường 500KB–1MB nhưng
   chỉ hiển thị ở ~240px.
   → Tạo bản **~2× kích thước hiển thị** (thường 512px là đủ cho Retina), giữ nguyên file gốc.
   Kiểm tra alpha còn nguyên và silhouette không đổi.

7. **`prefers-reduced-motion` phải xử lý trong JS, không chỉ CSS.** Chỉ tắt animation bằng `@media`
   thì canvas vẫn khởi tạo và vòng lặp hạt vẫn chạy.
   → Nhánh riêng trong JS: bỏ hẳn canvas và vệt sáng, hiện logo tĩnh ~1,3 giây rồi vào trang.

8. **Cleanup.** Huỷ `requestAnimationFrame`, xoá `setTimeout`, gỡ mọi event listener, thả tham chiếu
   mảng hạt, unmount hẳn preloader khi xong. Không để lại animation loop hay listener nào.

---

## 9. Hành vi

- **Chạy một lần mỗi phiên trình duyệt** (`sessionStorage`), khai báo bằng một hằng số ở đầu file để
  đổi được trong một dòng. Website dùng hằng ngày mà lần nào mở cũng bắt xem 2,7 giây thì nó thành
  vật cản chứ không còn là ấn tượng. Bọc `try/catch` — chế độ riêng tư có thể chặn `sessionStorage`.
- **Bấm/chạm/gõ phím bất kỳ để bỏ qua**: đẩy đồng hồ tới thẳng pha kết, phần đuôi (nảy → quầng sáng
  → mờ dần) vẫn chạy đủ. Không cắt cụt thô bạo.
- Nếu app render qua JS: thêm `background` màu nền vào `<style>` inline trong `<head>` để khung hình
  đầu tiên không loé trắng trước khi CSS chính tải xong.

---

## 10. Responsive

- Desktop: dòng lệnh cỡ chữ `clamp(0.875rem, 1.45vw, 1.3125rem)`; logo ~240px.
- Mobile: cỡ chữ cố định nhỏ hơn, logo ~180px, HUD siết padding và bỏ bớt mục ở màn rất hẹp.
- Cửa sổ dẹt (`max-height`): thu logo lại kẻo chạm mép trên–dưới.
- Canvas `position: fixed; inset: 0`, thẻ gốc `overflow: hidden` → **không bao giờ sinh scrollbar**.
- Đừng khoá scroll của body: fixed overlay đã che hết rồi, mà khoá scroll thì mất thanh cuộn và
  layout giật một nhịp.

---

## 11. Tích hợp vào dự án có sẵn

Trước khi viết dòng nào:

1. Đọc cấu trúc project, xác định entry point và nơi mount app.
2. Xác định kiến trúc CSS (file nào nạp trước, có thang z-index chung không, convention đặt tên gì).
3. Kiểm tra project đã có thư viện animation nào chưa — tái sử dụng, đừng cài thêm.
4. Xem comment trong file CSS/JS gốc: dự án lâu năm thường đã ghi lại sẵn những cái bẫy của chính nó.

Khi viết:

- Đặt file theo đúng cấu trúc và convention đặt tên sẵn có, **không dựng architecture mới**.
- z-index lấy từ thang có sẵn (thêm một biến mới vào thang nếu cần), không đặt số rời rạc.
- Comment bằng đúng ngôn ngữ của codebase.
- **Không** đổi layout / typography / spacing / responsive của trang chủ.
- **Không** đụng vào component không liên quan.
- Chỉ thêm đúng những gì preloader cần.
- Nếu file CSS mới phải đè lên style có sẵn, đặt nó **sau** file gốc trong thứ tự nạp và ghi chú lý do.

---

## 12. Acceptance criteria

Chỉ coi là xong khi:

**Chuyển động**
- [ ] Typing mượt, con trỏ nhấp nháy tự nhiên
- [ ] Code → particle rõ ràng: hạt sinh ra từ chính nét chữ, không phải bụi ngẫu nhiên
- [ ] Particle → logo có cảm giác morph/materialize, hạt tụ đúng vào hình logo
- [ ] Logo có bề mặt metallic thật (gradient chải), không phải một khối màu phẳng
- [ ] Shimmer chạy đúng một lần, không quá sáng
- [ ] Logo nảy rất nhẹ, không giật
- [ ] Không có khung hình trắng nào; quầng teal fade tự nhiên về 0
- [ ] Trang chủ hiện mượt, không đột ngột
- [ ] Tổng 2,5–2,7 giây

**Kỹ thuật**
- [ ] Không lỗi JavaScript, lint và build sạch
- [ ] Không sinh scrollbar ngang/dọc
- [ ] Sau khi xong: không còn `transform` sót trên thẻ app, các phần tử `position: fixed` vẫn bám
      viewport đúng
- [ ] Preloader unmount hẳn, không còn loop/listener/timer nào
- [ ] Chạy được khi tab đang ở chế độ nền (kiểm bằng cách mở link bằng Ctrl+click rồi quay lại)
- [ ] `prefers-reduced-motion` cho ra bản rút gọn không canvas
- [ ] Responsive trên desktop / tablet / mobile / cửa sổ dẹt
- [ ] Layout trang chủ không đổi một pixel nào so với trước

**Cách tự kiểm chứng** (đừng chỉ nhìn bằng mắt):
- So sánh vùng logo đã render với kênh alpha của file gốc → **IoU > 0,9** và không sót pixel nào.
  Đây là cách duy nhất phát hiện mask cắt sai.
- Đo histogram độ sáng trên vùng logo → trung bình ~160, dưới 5% vượt 204.
- Đối chiếu danh sách class trong markup với class trong CSS → không được lệch tên nào.
- Ép từng giá trị `data-phase` rồi đọc `animationName` của từng lớp → đúng animation chạy ở đúng pha,
  và **tên animation không đổi** khi chuyển giữa các pha liên tiếp.

---

## 13. Thứ tự ưu tiên thị giác

```
LOGO  >  PARTICLES / SHIMMER  >  CODE  >  HUD
```

HUD (`{BRAND} / SYSTEM 01`, `BUILD 001`, nhãn pha, bộ đếm %) chỉ là supporting element ở bốn góc,
cỡ chữ ~9px, màu rất mờ. Nếu HUD hút mắt hơn logo là sai.
