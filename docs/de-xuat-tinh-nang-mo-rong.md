# Đề xuất tính năng mở rộng — hỗ trợ học tốt hơn & thuận tiện hơn

> ✅ **Toàn bộ đề xuất trong tài liệu này đã được triển khai (2026-08-13).**
> Xem kết quả và danh sách tính năng mới ở [tinh-nang-moi-da-trien-khai.md](tinh-nang-moi-da-trien-khai.md).
>
> Soạn ngày: 2026-08-13 · Căn cứ: đọc toàn bộ `src/` (9 tab, ~4.900 dòng JSX, ~830KB data JSON)
>
> Tài liệu này **bổ sung** cho `docs/Update_instructions.md` (tài liệu đó tập trung UI/UX & responsive).
> Ở đây tập trung vào **tính năng học tập** — cái gì làm người học nhớ lâu hơn, và cái gì làm việc học tiện hơn.

---

## 0. Hiện trạng (căn cứ để đề xuất)

**Đã có và chạy tốt — không đề xuất làm lại:**

| Thành phần | Trạng thái |
|---|---|
| SRS Leitner (`src/lib/srs.js`) | box 0–5, 3 mức đánh giá, `orderForStudy` ưu tiên thẻ tới hạn — dùng cho **vocab** + **kanji** |
| Streak & hoạt động ngày (`src/lib/progress.js`) | biểu đồ 14 ngày, streak hiện tại + dài nhất |
| Flashcard | lật thẻ, phím tắt, tổng kết phiên (Vocabulary, Kanji) |
| Kanji stroke order | SVG path player, 103 kanji đều có `strokes` |
| Kana | Quiz thẻ lật (2 chế độ) + Điền romaji, có `isRomajiMatch` xử lý biến thể kunrei |
| Bộ đề JLPT | 6 đề × 3 phần = **450 câu**, có `explanation` + `translation` |
| Data | 580 từ (36 chủ đề), 103 kanji, 84 mục ngữ pháp, số đếm, kana |
| Admin CMS | JSON editor dev-only qua Vite plugin |

**Khoảng trống lớn nhất (đây là nơi các đề xuất bên dưới nhắm vào):**

1. **Không có phần Nghe** — 聴解 chiếm ~1/3 kỳ thi N5 (30 phút, ~25 câu, sàn 19/60). App hiện **không có một file audio hay một lần gọi TTS nào**; 6 bộ đề cũng chỉ có vocab/grammar/reading, thiếu hẳn section 聴解.
2. **Bài tập không được lưu** — `ExercisesTab` giữ `answers` trong React state; F5 là mất sạch. Tệ hơn: nó chỉ lưu `true/false`, **không lưu đáp án đã chọn**, và không gọi `recordReview` → làm 450 câu không tính vào streak, không vào Progress, **không có cơ chế gặp lại câu sai**.
3. **Kana không có SRS** — `KanaTab` chỉ gọi `recordReview`, không gọi `rateCard`; độ thuộc từng chữ reset mỗi phiên (chỉ lưu cấu hình hàng chữ đã chọn).
4. **Numbers / Grammar / Tips / StudyPlan chỉ để đọc** — trong khi đây là nội dung *dễ luyện nhất*.
5. **Flashcard chỉ một chiều** (nhìn JP → nghĩa). Không có chiều VN→JP, không có gõ đáp án → thiếu *active recall* (production), là kiểu ôn hiệu quả nhất.
6. **Không có điểm bắt đầu** — mở app là rơi vào tab cũ với 580 từ trước mặt; không có "hôm nay học gì".
7. **Tiến độ chỉ nằm trong localStorage một máy** — không export/import, không đồng bộ, xoá cache là mất hết.
8. **Chưa có offline/PWA** dù 830KB data đã nằm sẵn trong bundle — rất phù hợp học trên xe bus/tàu.

---

## 1. Đòn bẩy cao nhất: sinh bài luyện **từ data đã có** (không phải soạn nội dung mới)

Điểm mạnh bị bỏ quên: data hiện tại đã được markup sẵn đủ để **tự sinh** hàng trăm câu luyện.

| Nguồn có sẵn | Số lượng | Sinh được bài gì |
|---|---|---|
| `grammar.json` → particles, ví dụ dạng `わたし<は>がくせいです。` | **30 ví dụ, 100% có dấu `<>`** | Điền trợ từ vào chỗ trống (15 trợ từ làm phương án nhiễu) |
| `grammar.json` → patterns + patterns-extra, mỗi ví dụ có `highlights` | **118 ví dụ** | Cloze mẫu câu: che phần `highlights`, chọn/gõ lại |
| `grammar.json` → verb-groups `{dict, masu, masen, mashita, te}` | 12 động từ × 4 dạng | Drill chia động từ (cho từ điển → gõ ます/ません/ました/て) |
| `grammar.json` → adjectives `{present, negative, past, noun, te}` | 8 tính từ × 5 dạng | Drill chia tính từ い/な |
| `numbers.json` → counters/hours/months/dates | 12 bộ đếm, 12 giờ, 13 ngày | Drill "3時 đọc là gì?", "六百 → ろっぴゃく" (các mục biến âm đã được đánh dấu `⚠️`) |
| `vocabulary.json` → **580/580 từ đều có `example`** | 580 câu | Cloze từ vựng: che từ trong câu ví dụ |
| `vocabulary.json` → 386 từ có `kanji`, 103 kanji có `examples` | — | Quiz đọc kanji ↔ từ vựng, liên kết chéo |

> **Ý nghĩa:** thêm được ~750 câu luyện mới mà **không cần soạn thêm một dòng nội dung nào**. Chỉ cần một lớp `src/lib/quizgen.js` sinh câu hỏi + phương án nhiễu từ JSON hiện có, rồi tái dùng UI `QuestionCard` (đã có trong `ExercisesTab`) và engine `srs.js`.

### 1.1 · `quizgen.js` + tab luyện cho Ngữ pháp và Số đếm
- **Đề xuất:** module sinh câu hỏi từ 6 nguồn ở bảng trên; mỗi tab tĩnh có thêm nút "🎯 Luyện tập" giống Kana đã làm.
- **Lợi ích:** Ngữ pháp và Số đếm từ "đọc rồi quên" thành "luyện đến thuộc"; trợ từ và bộ đếm chính là 2 chỗ người học N5 mất điểm nhiều nhất.
- **Phức tạp:** Trung bình (logic sinh nhiễu cần cẩn thận: nhiễu phải cùng loại, không trùng đáp án).

---

## 2. Phần Nghe & Phát âm — khoảng trống lớn nhất về nội dung

### 2.1 · Nút loa phát âm ở mọi nơi (Web Speech API, `ja-JP`)
- **Đề xuất:** helper `src/lib/tts.js` dùng `speechSynthesis` với `lang="ja-JP"`; nút 🔊 trên word card, flashcard, ô kana, ví dụ câu, bảng số đếm.
- **Lợi ích:** miễn phí, không cần thu âm, không tốn dung lượng; nghe được cả 580 từ + 580 câu ví dụ ngay lập tức.
- **Lưu ý thật:** chất lượng giọng phụ thuộc OS (Windows/macOS/Android có giọng ja tốt; một số máy Linux không có → cần fallback ẩn nút khi `getVoices()` không có `ja`). iOS Safari yêu cầu phát trong user gesture. Với nội dung cốt lõi (46 kana + số đếm) có thể thu/bundle audio thật sau.
- **Phức tạp:** Thấp.

### 2.2 · Chế độ luyện nghe tự sinh
- **Đề xuất:** 3 dạng dựng từ data có sẵn: **nghe → chọn nghĩa**, **nghe → gõ romaji/kana**, **nghe câu → chọn bản dịch**. Chấm vào SRS deck `listening`.
- **Lợi ích:** phủ được phần thi đang trống hoàn toàn, vẫn không cần thu âm.
- **Phức tạp:** Trung bình.

### 2.3 · Bổ sung section 聴解 cho 6 bộ đề
- **Đề xuất:** thêm loại section `listening` vào `jlpt-sets.json` (script đọc bằng TTS thay vì hiện chữ; chỉ hiện transcript sau khi trả lời).
- **Lợi ích:** đề thi thử mới đúng format thật (hiện chỉ có 2/3 kỳ thi).
- **Phức tạp:** Trung bình–Cao (phải soạn script mới — đây là hạng mục *duy nhất* trong tài liệu này cần viết nội dung mới).

---

## 3. Không để mất dữ liệu học — và tận dụng 450 câu đã có

### 3.1 · Lưu trạng thái bài tập + Sổ tay lỗi (ưu tiên cao nhất trong nhóm này)
- **Vấn đề:** làm hết 1 đề (~75 câu), F5 → mất sạch; sai câu nào cũng không có đường quay lại; không tính vào streak.
- **Đề xuất:**
  1. Lưu `{examId: {qid: chosenChoice}}` vào localStorage (lưu **đáp án đã chọn**, không chỉ đúng/sai) + nút "Tiếp tục đề này".
  2. Gọi `recordReview()` khi trả lời → bài tập vào streak & Progress.
  3. **Sổ tay lỗi:** mọi câu sai tự vào deck SRS `exam`; thêm màn "Ôn câu sai (N)" — ôn theo lịch SRS đến khi thuộc.
- **Lợi ích:** 450 câu hiện dùng một lần rồi bỏ → thành nguồn ôn lặp lại. Học từ lỗi là cơ chế tăng điểm nhanh nhất.
- **Phức tạp:** Trung bình.

### 3.2 · Chế độ "Thi thử thật" song song với "Luyện tập"
- **Vấn đề:** hiện chọn xong là hiện đáp án ngay (tốt cho luyện, sai hoàn toàn cho thi thử); đồng hồ theo từng phần, bấm tay, không ràng buộc; `N5_PASS_RATIO = 0.44` tính trên **số câu thô**, và UI có ghi "đạt điểm sàn từng phần" nhưng code chưa kiểm điểm sàn.
- **Đề xuất:** toggle 2 chế độ. Chế độ thi: một đồng hồ tổng (Ngôn ngữ 105' + Nghe 30'), ẩn đáp án đến khi submit, chấm quy về thang 180 + **kiểm điểm sàn từng phần** (Ngôn ngữ 38/120, Nghe 19/60), lưu **lịch sử các lần thi** để thấy đường tiến bộ.
- **Lợi ích:** biết mình *thật sự* đang ở đâu so với mốc đậu; giảm sốc phòng thi.
- **Phức tạp:** Trung bình.

### 3.3 · Export / Import tiến độ
- **Vấn đề:** localStorage là điểm chết duy nhất — xoá cache, đổi máy, đổi trình duyệt là mất toàn bộ SRS + streak. Không có backup.
- **Đề xuất:** nút Xuất/Nhập file JSON trong tab Tiến độ (gộp `srs_state_v1`, `progress_v1`, các set marked, cấu hình). Nâng cao (nếu muốn học trên cả điện thoại + laptop): sync qua Cloudflare D1/KV — khớp với hướng deploy Cloudflare Pages đã chốt.
- **Lợi ích:** an toàn dữ liệu; học liên tục giữa nhiều thiết bị.
- **Phức tạp:** Thấp (export/import) · Trung bình (sync).

---

## 4. Học đúng cách hơn — chất lượng ôn tập

### 4.1 · Hai chiều + gõ đáp án (active recall)
- **Vấn đề:** flashcard chỉ *nhận biết* (JP→VN). Nhận ra nghĩa ≠ nói/viết ra được từ.
- **Đề xuất:** toggle chiều **VN→JP**, và **chế độ gõ** (hiện nghĩa → gõ kana/romaji). Tái dùng `isRomajiMatch` (`KanaTab`) + `kanaToRomaji` (`lib/romaji.js`) đã có để chấm linh hoạt.
- **Lợi ích:** recall chủ động nhớ lâu hơn recognition rõ rệt; đồng thời luyện chính tả kana.
- **Phức tạp:** Thấp–Trung bình.

### 4.2 · Đưa Kana vào SRS + hợp nhất tiến độ Kanji
- **Vấn đề:** (a) Kana quiz không lưu độ thuộc từng chữ; (b) Kanji có **hai** nguồn sự thật — set thủ công `kanji_learned` và box SRS — có thể mâu thuẫn; (c) Kanji flashcard chỉ 2 mức (know/again), mất tầng "mơ hồ" mà `srs.js` đã hỗ trợ.
- **Đề xuất:** deck `kana` trong SRS (khoá theo `char`); lấy SRS làm nguồn sự thật duy nhất cho "đã học", suy ra badge từ box ≥ 4; Kanji dùng đủ 3 mức như Vocabulary.
- **Lợi ích:** một mô hình tiến độ nhất quán; lịch ôn kana thông minh thay vì xáo lại từ đầu.
- **Phức tạp:** Thấp–Trung bình (cần migrate `kanji_learned` cũ sang box SRS để không mất dữ liệu người dùng).

### 4.3 · "Học hôm nay" — một nút, trộn mọi deck
- **Vấn đề:** không có điểm khởi đầu. Mở app là 580 từ trước mặt và tự quyết định.
- **Đề xuất:** trang chủ/khối đầu trang: *"Hôm nay: 23 thẻ đến hạn · 10 từ mới · ~12 phút"* + một nút bắt đầu phiên trộn (vocab + kanji + kana + câu sai) theo mục tiêu ngày người dùng đặt. `orderForStudy` và `isDue` đã có sẵn, chỉ cần gộp nhiều deck.
- **Lợi ích:** xoá bỏ quyết định "học gì hôm nay" — yếu tố khiến người học bỏ ngang nhiều nhất; giữ streak dễ hơn.
- **Phức tạp:** Trung bình.

### 4.4 · Phân tích điểm yếu (data đã có, chưa dùng)
- **Vấn đề:** `srs.js` đã ghi `reps`, `lapses`, `due` cho từng thẻ nhưng Progress không hề dùng — chỉ hiện đếm tổng.
- **Đề xuất:** "🔥 20 thẻ hay quên nhất" (sort theo `lapses`, một nút ôn riêng nhóm này); **dự báo 7 ngày tới** (đếm theo `due` — giúp không bị dồn 200 thẻ một ngày); độ chính xác theo tuần; "trợ từ / bộ đếm bạn hay sai" khi có §1.
- **Lợi ích:** ôn đúng chỗ yếu thay vì ôn dàn trải; giá trị/công sức rất cao vì dữ liệu đã nằm sẵn trong localStorage.
- **Phức tạp:** Thấp.

### 4.5 · Chia bài học nhỏ + gắn Lộ trình vào tiến độ thật
- **Vấn đề:** `StudyPlanTab` là văn bản tĩnh, hoàn toàn không nối với tiến độ thực. 580 từ là một lưới dài.
- **Đề xuất:** chia thành "bài" ~10 từ (theo chủ đề sẵn có), có trạng thái hoàn thành; lộ trình 12 tuần thành checklist tự tick theo SRS.
- **Lợi ích:** cảm giác hoàn thành theo từng bước nhỏ; lộ trình thành công cụ thật, không phải bài viết.
- **Phức tạp:** Trung bình.

---

## 5. Tiện lợi hằng ngày

| # | Tính năng | Vấn đề hiện tại | Phức tạp |
|---|---|---|---|
| 5.1 | **PWA + offline** | Chưa có manifest/service worker, dù 830KB data đã bundle sẵn — cài về máy học không cần mạng là rất khả thi và đúng use case "học trên xe bus" | Thấp–TB |
| 5.2 | **Tìm kiếm toàn cục (Ctrl+K)** | Tìm kiếm nằm riêng trong từng tab; muốn tra một từ phải đoán nó thuộc tab nào | Trung bình |
| 5.3 | **Liên kết chéo dữ liệu** | 9 tab là 9 ốc đảo: từ 学校 không dẫn tới kanji 学/校, kanji không dẫn ngược về từ vựng, mẫu câu không dẫn tới câu thi liên quan. Có thể build index lúc runtime bằng cách quét ký tự kanji | Trung bình |
| 5.4 | **Ghi chú / mnemonic cá nhân** | Không thể tự thêm cách nhớ riêng cho từ/kanji — thứ giúp nhớ nhất lại là mẹo *tự mình* nghĩ ra | Thấp |
| 5.5 | **Thẻ & bộ thẻ tự tạo** | Chỉ có danh sách "đã đánh dấu"; không thêm được từ gặp ngoài app (anime, lớp học, công việc) | Trung bình |
| 5.6 | **Mục tiêu ngày + nhắc học** | Streak hiện chỉ cần *1* lượt ôn là giữ được → dễ tự lừa. Nên có mục tiêu (VD 30 thẻ/ngày) + vòng tiến độ, và Notification API nhắc giờ học | Thấp |
| 5.7 | **Lazy-load theo tab** | `App.jsx` import tĩnh cả 9 tab → toàn bộ 830KB JSON nằm trong bundle đầu tiên, kể cả khi chỉ xem 1 tab. Chỉ `AdminTab` đang lazy | Thấp |
| 5.8 | **Furigana / hiện cách đọc** | Đoạn văn đọc hiểu trong đề thi không có furigana lẫn romaji — người mới N5 dễ tắc. Cần toggle hiện cách đọc | TB–Cao (cần data reading) |

---

## 6. Kanji chuyên sâu (đã có nền tốt, mở rộng rẻ)

- **6.1 Canvas tập viết:** đã có `strokes` (SVG path) cho cả 103 kanji + animator. Thêm canvas cho người dùng viết theo, so sánh với path mẫu (hoặc đơn giản: chế độ tô mờ theo nét). Viết tay là cách nhớ kanji hiệu quả nhất. — *Trung bình*
- **6.2 Quiz đảo chiều:** nghĩa → chọn kanji; cách đọc → chọn kanji; tìm theo số nét (`stroke` đã có sẵn trong data). — *Thấp*

---

## 7. Thứ tự triển khai đề xuất

| Đợt | Mục tiêu | Hạng mục |
|---|---|---|
| **1** | Không mất dữ liệu + tận dụng thứ đã có | 3.1 Lưu bài tập + Sổ tay lỗi · 3.3 Export/Import · 4.4 Phân tích điểm yếu · 5.7 Lazy-load |
| **2** | Bù khoảng trống nội dung lớn nhất | 2.1 Nút phát âm · 2.2 Luyện nghe tự sinh · 1.1 `quizgen.js` cho Ngữ pháp & Số đếm |
| **3** | Ôn đúng cách + có điểm bắt đầu | 4.1 Hai chiều & gõ đáp án · 4.2 Kana vào SRS + hợp nhất Kanji · 4.3 "Học hôm nay" |
| **4** | Tiện lợi & chiều sâu | 5.1 PWA · 5.2 Tìm kiếm toàn cục · 5.4 Ghi chú cá nhân · 3.2 Chế độ thi thật · 6.1 Tập viết |
| **5** | Cần soạn nội dung mới | 2.3 Section 聴解 cho 6 bộ đề · 5.8 Furigana · 5.5 Thẻ tự tạo |

**Nếu chỉ làm được 5 việc**, đề xuất chọn: **3.1** (sổ tay lỗi) → **2.1** (phát âm) → **1.1** (quiz tự sinh) → **4.3** ("Học hôm nay") → **5.1** (PWA). Năm việc này chạm vào cả 3 mục tiêu: không mất dữ liệu, phủ kín kỹ năng, và giảm ma sát mỗi ngày.

---

## 8. Ghi chú kỹ thuật khi triển khai

- **Tái dùng, đừng viết mới:** `srs.js` đã đủ tổng quát cho mọi deck (`deck` là string bất kỳ) — chỉ cần thêm `kana`, `grammar`, `numbers`, `exam`, `listening`. `QuestionCard` trong `ExercisesTab` đã là component quiz dùng chung được. `isRomajiMatch` + `kanaToRomaji` đã giải quyết bài toán chấm romaji.
- **Điểm cần tránh:** `srs.js` đọc/ghi cả cây state mỗi lần `getCard` (`ProgressTab` gọi `getStats` nhiều lần trong một render) — khi thêm nhiều deck nên cache state trong một context/hook thay vì đọc localStorage lặp lại.
- **Migrate dữ liệu:** khi hợp nhất `kanji_learned` vào SRS (4.2), phải chuyển set cũ sang box ≥ 4 để người dùng hiện tại không thấy tiến độ bị reset.
- **Bám nguyên tắc data-driven sẵn có:** mọi tính năng mới nên đọc từ `src/data/*.json` để Admin CMS hiện có vẫn quản được nội dung.
