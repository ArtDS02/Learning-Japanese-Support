# Tính năng mới đã triển khai

> Ngày: 2026-08-13 · Triển khai toàn bộ đề xuất trong [de-xuat-tinh-nang-mo-rong.md](de-xuat-tinh-nang-mo-rong.md)
>
> Build ✅ · Lint ✅ · Đã kiểm thử thực tế trên dev server và bản production (service worker + offline cache).

---

## Tóm tắt

| Hạng mục | Trước | Sau |
|---|---|---|
| Số tab | 9 | **11** (thêm 🔥 Học hôm nay, 🎧 Nghe) |
| Deck SRS | 2 (vocab, kanji) | **7** (+ kana, grammar, numbers, listening, exam) |
| Câu luyện tập | 450 (chỉ trong bộ đề) | **450 + 4.223 câu sinh tự động** |
| Câu nghe | 0 | **1.844 sinh tự động + 36 câu 聴解 trong bộ đề** |
| Bài làm khi F5 | mất sạch | **lưu tự động, có "tiếp tục làm"** |
| Câu sai | không có cách gặp lại | **Sổ tay lỗi theo lịch SRS** |
| Chấm điểm đề | % câu đúng thô | **thang 180 + kiểm điểm sàn từng phần** |
| JS tải lần đầu | 766 KB (1 chunk) | **~200 KB + chunk theo tab** |
| Offline | không | **PWA, cài được, học không cần mạng** |
| Sao lưu tiến độ | không | **xuất/nhập file JSON (gộp hoặc ghi đè)** |

---

## 1. 🔥 Tab "Học hôm nay" (mới)

Trang chủ mới, giải quyết vấn đề "mở app không biết bắt đầu từ đâu".

- **Một nút duy nhất**: *"Hôm nay: N thẻ · X tới hạn · Y thẻ mới · ~Z phút"* → phiên **trộn mọi deck** (từ vựng + kanji + kana + câu sai trong đề) theo đúng thứ tự ưu tiên SRS. Thẻ mới được rải đều vào giữa cho khỏi nhàm.
- Nút phụ **"Chỉ ôn N thẻ tới hạn"** (không nạp thẻ mới) và chip **học riêng từng phần**.
- **Vòng tiến độ mục tiêu ngày** + streak. Mục tiêu, số thẻ mới/ngày, furigana mặc định, nhắc học đều cấu hình được.
- Thẻ **"học tiếp từ đâu"**: câu sai cần ôn · đề đang làm dở · bài từ vựng kế tiếp · luyện nghe.
- **Dự báo 7 ngày tới** và **hoạt động 7 ngày qua**.
- Nhắc học qua Notification API — *giới hạn thật: chỉ chạy khi trang đang mở, app không có server đẩy thông báo.*

## 2. 🎧 Tab "Nghe" (mới) + phát âm toàn app

Phần 聴解 chiếm ~1/3 điểm N5 (sàn 19/60) trước đây hoàn toàn trống.

- **Nút loa 🔊 ở mọi nơi**: word card, flashcard, câu ví dụ, ô kana, bảng bộ đếm, câu hỏi trong đề, hội thoại phần nghe. Dùng Web Speech API `ja-JP` — miễn phí, không tốn dung lượng.
- **1.844 câu nghe sinh tự động**: nghe từ → chọn nghĩa (580) · nghe câu → chọn bản dịch (580) · nghe → chép lại chính tả (580) · nghe kana (104).
- **Shadowing**: danh sách câu theo chủ đề, bấm nghe rồi đọc to nhắc lại.
- **Tốc độ đọc** 0.6× / 0.75× / 0.9× / 1× (lưu lại).
- **Xử lý đàng hoàng khi máy không có giọng Nhật**: nút loa tự ẩn, tab Nghe hiện hướng dẫn cài giọng cho Windows / Android / macOS-iOS, câu nghe trong đề chuyển sang hiện lời thoại để đọc.

## 3. 📕 Sổ tay lỗi + lưu bài làm (tab Bài tập)

- **Lưu tự động** đáp án đã chọn theo từng đề → F5 không mất; chip `💾 đã lưu N/81`; banner **"Tiếp tục"** cho đề làm dở.
- Mỗi câu trả lời tính là một lượt ôn → **vào streak và độ chính xác** (trước đây làm 450 câu không được tính gì).
- **Sổ tay lỗi**: câu sai tự vào deck SRS `exam`, có màn ôn riêng theo lịch giãn cách, lọc "tới hạn / tất cả", đếm số lần sai. Trả lời đúng đủ số lần thì câu rời khỏi sổ.
- **Hai chế độ**:
  - 📚 *Luyện tập* — hiện đáp án + giải thích ngay (như cũ).
  - ⏱ *Thi thử* — ẩn đáp án đến khi nộp, **một đồng hồ tổng** (lưu lại khi F5, hết giờ tự nộp), chấm **thang 180** và **kiểm điểm sàn từng phần**.
- **Lịch sử thi thử** (50 lần gần nhất) để thấy đường tiến bộ.
- Số thứ tự câu, bản dịch bài đọc thu gọn được, toggle **furigana**.

> Đã kiểm: đúng hết → 180/180 ĐẠT · đúng 50% → 91/180 ĐẠT · đúng hết phần ngôn ngữ nhưng sai hết phần nghe → 120/180 nhưng **CHƯA ĐẠT** vì Nghe 0/60 < sàn 19. Đây chính là lỗi của cách chấm cũ.

## 4. 🎯 4.223 câu luyện tập sinh tự động (không soạn thêm nội dung)

| Bộ | Số câu | Nguồn |
|---|---|---|
| Điền trợ từ | 30 | ví dụ có đánh dấu `<は>` trong grammar.json |
| Điền mẫu câu | 116 | ví dụ có `highlights` |
| Nhận dạng / gõ dạng chia động từ | 48 + 48 | bảng chia động từ |
| Chia tính từ い/な | 32 | bảng chia tính từ |
| Cách đọc bộ đếm | 120 | 12 bộ đếm × 10 số (gồm mọi biến âm ⚠️) |
| Ngày / giờ / tháng / thứ / số | 57 | numbers.json |
| Điền từ vào câu · nghĩa→từ · nghĩa→gõ từ | 459 + 580 + 580 | 580 câu ví dụ từ vựng |
| Kanji: nghĩa→chữ, chữ→nghĩa, cách đọc→chữ | 103 × 3 | kanji.json |
| Nghe (4 dạng) | 1.844 | từ vựng + câu ví dụ + kana |

Mọi phương án nhiễu **lấy từ chính data**, không tự bịa tiếng Nhật. Riêng bài chia động từ/tính từ, các phương án nhiễu là **các dạng khác của chính từ đó** → thành bài phân biệt dạng, luôn chỉ có một đáp án đúng.

Đã kiểm tự động toàn bộ 4.223 câu: **0 lỗi** (đáp án luôn nằm trong lựa chọn, không có lựa chọn trùng, không lọt ký hiệu `<>`).

## 5. Ôn tập đúng cách hơn

- **Một bộ chạy phiên dùng chung** (`StudyRunner`) cho cả 3 loại: thẻ lật · chọn đáp án · gõ đáp án. Nhờ vậy mọi tab, phiên trộn và sổ tay lỗi đều cùng luồng và cùng ghi SRS.
- **Chiều ngược Việt → Nhật** cho flashcard từ vựng (recall chủ động).
- **Chế độ gõ đáp án**: chấp nhận kana, katakana, romaji Hepburn, romaji có macron (`jūgofun`), và biến thể kunrei (`si`/`shi`, `tu`/`tsu`, `hu`/`fu`, `zi`/`ji`), cả `shimbun`/`shinbun`.
- **Kana vào SRS**: mỗi chữ là một thẻ có lịch ôn riêng (trước đây độ thuộc reset mỗi phiên). Bảng chữ hiện viền trạng thái từng ô; chip chọn hàng trong quiz hiện `đã thuộc/tổng`.
- **Kanji hợp nhất một nguồn sự thật**: bỏ set `kanji_learned` đánh dấu tay, "đã học" suy từ SRS (box ≥ 4). Kanji dùng đủ **3 mức** Quên/Mơ hồ/Nhớ. Có **migration** tự chuyển dữ liệu cũ sang box "đã thuộc" để người dùng hiện tại không thấy tiến độ bị reset.
- Tổng kết cuối phiên có **"điểm cần ôn thêm"** nhóm theo tag và nút **ôn lại riêng các thẻ vừa sai**.

## 6. 📊 Tiến độ: phân tích điểm yếu + sao lưu

- **Cả 7 deck** đều xuất hiện (trước chỉ vocab + kanji), mỗi deck có % thuộc và nút xoá tiến độ riêng.
- **🔥 Thẻ hay quên nhất** — xếp theo `lapses` (dữ liệu SRS đã ghi từ trước nhưng chưa bao giờ được dùng), kèm nút *"Ôn ngay N thẻ khó nhất"*.
- **Dự báo 7 ngày** để không bị dồn thẻ.
- **Độ chính xác theo ngày** (dải ô màu 14 ngày) và độ chính xác 30 ngày.
- Panel **bài tập & thi thử**: câu sai tới hạn, điểm thi thử cao nhất, số lần ĐẠT.
- **💾 Xuất / nhập file JSON** — mang toàn bộ SRS, streak, bài làm, lịch sử thi, ghi chú, thẻ tự tạo, cài đặt sang máy khác. Nhập có 2 chế độ **gộp** (giữ tiến độ cao hơn) hoặc **ghi đè**.
- Sửa luôn chỗ đếm sai: `getStats` giờ phân biệt `due` (đang học & tới hạn) với `ready` (gồm cả thẻ mới) — trước đây mở app mới thấy *"580 thẻ tới hạn"*, vừa sai nghĩa vừa gây choáng.

## 7. Tiện lợi hằng ngày

- **Ctrl/⌘ + K — tìm kiếm toàn cục**: 855 mục gồm từ vựng, kanji, trợ từ, mẫu câu, bảng chia, bộ đếm, giờ/ngày/thứ, từ katakana. Gõ tiếng Nhật, tiếng Việt hoặc romaji ASCII (`gakkou`, `gakko`, `gakkō` đều ra). Enter để mở đúng tab kèm từ khoá.
- **Liên kết chéo**: thẻ từ vựng hiện các kanji cấu thành; modal kanji hiện các từ N5 dùng chữ đó.
- **Furigana** — bật/tắt được, **chỉ hiện cách đọc có thật trong data** (từ điển 540 cụm dựng từ kanji.json + vocabulary.json + numbers.json). Cụm không tra được thì để nguyên, **không bao giờ đoán** — vì với người mới học, ruby sai còn tệ hơn không có ruby.
- **Ghi chú cá nhân** gắn được vào từ vựng / kanji / thẻ đang ôn, lưu ngay khi gõ.
- **Thẻ tự tạo** ("Thẻ của tôi") — thêm từ gặp ngoài app, dùng chung lịch ôn SRS với từ vựng N5.
- **Bài học 10 từ**: 580 từ chia thành 73 bài theo chủ đề, có % hoàn thành và nút *"Học tiếp: Bài N"*.
- **Tập viết kanji**: canvas vẽ tay trên ô kẻ, bật/tắt nét mẫu mờ và số thứ tự nét. *Cố ý không tự cho điểm nét viết — chấm bằng heuristic sẽ báo sai và gây mất niềm tin.*
- **Lộ trình gắn số liệu thật**: 4 mốc đo từ SRS (kana / từ vựng / kanji / đề đã đạt) + checklist 12 tuần tự tick.

## 8. PWA & hiệu năng

- **Cài được như app** (manifest + icon), **học offline** bằng service worker viết tay (cache-first cho asset đã băm tên, network-first + shell fallback cho điều hướng). Đã kiểm: 17 file trong cache, service worker `activated`.
- **Tách chunk theo tab**: 766 KB một cục → chunk đầu ~200 KB, mỗi tab một chunk riêng.
- Hai tối ưu đường tải quan trọng:
  - `GlobalSearch` chuyển sang lazy (chỉ mục của nó đọc mọi file data).
  - Trang chủ nạp **dữ liệu 6 bộ đề (186 KB) sau khi vẽ xong màn hình đầu**; `shuffle` tách ra `lib/random.js` để `session.js` không kéo theo toàn bộ JSON của `quizgen`.
- `index.html`: `lang="vi"`, title & description thật, theme-color, apple-touch-icon, `viewport-fit=cover`.

---

## Lỗi có sẵn đã sửa nhân đây

1. **`J5G6`, `J5G17`** (jlpt-sets.json) — hai câu có **lựa chọn bị trùng** (`には` × 2, `ている` × 2). Đã thay phương án lặp bằng `とは` / `てみる`; đáp án đúng không đổi.
2. **Chấm điểm đề không kiểm điểm sàn từng phần** — UI có ghi "đạt điểm sàn từng phần" nhưng code chỉ so tổng số câu đúng với 44%. Nay chấm đúng luật.
3. **Bộ đếm phiên nhảy 2 bước** — `setPos` được gọi bên trong updater của `setQueue`; React StrictMode gọi updater hai lần. Đã tính mọi quyết định trước khi gọi setState.
4. **Chấm romaji sai với macron** — `jūgofun` bị cắt thành `jgofun` vì lọc `[^a-z]` chạy trước khi quy đổi nguyên âm dài, mà macron lại đúng là kiểu app đang hiển thị.
5. **Nét chết** trong stroke animator (`const len` không dùng) và một giá trị khởi tạo vô nghĩa trong `searchIndex`.

## Việc còn tồn (cần bạn quyết)

1. **`npm run lint` không lint file `.jsx`.** `eslint.config.js` chỉ khai `files: ['**/*.{ts,tsx}']` — nghĩa là toàn bộ ~5.000 dòng JSX của dự án chưa từng được lint. Tôi đã kiểm code mới bằng config tạm (sạch), nhưng nên mở rộng config chính thức. Chưa làm vì bật lên sẽ lộ một loạt cảnh báo cũ, cần bạn quyết mức độ.
2. **36 câu 聴解 là bộ khởi đầu**, không phải đủ format thật (N5 thật ~24 câu/đề, đây 6 câu/đề nhưng có đủ 4 dạng 課題理解 / ポイント理解 / 発話表現 / 即時応答). Soạn thêm được qua tab Admin.
3. **Thời gian đề thi thử = tổng `timeLimit` các phần trong data** → hiện là 145 phút (25+40+50+30). N5 thật là 105 phút. Sửa bằng cách đổi `timeLimit` trong Admin, code không cần đổi.
4. **Đồng bộ nhiều thiết bị** vẫn là xuất/nhập tay. Muốn tự động thì cần Cloudflare D1/KV — khớp hướng deploy đã chốt nhưng là việc riêng.
5. **`public/index.html`** là file placeholder của Firebase Hosting còn sót, sẽ bị copy vào `dist/`. Nên xoá.
6. **`src/index.css` và `src/App.css`** là rác template Vite, không được import ở đâu.
