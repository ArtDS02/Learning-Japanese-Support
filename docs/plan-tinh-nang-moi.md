# Kế hoạch triển khai tính năng mới (đợt 2)

> Soạn ngày 2026-11-08, sau đợt sửa 27 lỗi (commit `8df05f6`, nhánh `fix/review-bugs`).
> Gồm **11 tính năng** đã đề xuất. Không gồm "Đồng bộ nhiều thiết bị" (để riêng).
>
> Mọi tính năng đều **miễn phí và không dính bản quyền**: chỉ dùng dữ liệu có sẵn
> trong `src/data`, API có sẵn trong trình duyệt, hoặc thư viện mã nguồn mở giấy
> phép MIT. Không dùng dữ liệu trọng âm (OJAD/NHK), câu ví dụ Tatoeba hay JMdict.

---

## 0. Cách dùng file này

Mỗi tính năng (F1…F11) được viết để **một session làm trọn một mục**. Mở session
mới rồi gửi câu lệnh mẫu:

```text
Đọc docs/plan-tinh-nang-moi.md — phần 1 (bối cảnh & quy ước) và mục F2. Triển khai F2 đúng
phạm vi, chạy lint + build, kiểm tra trên preview, rồi đánh dấu F2 là "✅ Đã xong" trong file plan.
```

Thứ tự và những mục chạy song song được ở **phần 2**. Hai session cùng sửa một
file (xem cột "File chính") thì phải chạy **lần lượt**, không chạy cùng lúc.

Trạng thái:

| ID | Tính năng | Công sức | Trạng thái |
|---|---|---|---|
| F1 | Lịch ôn FSRS | L | ⬜ Chưa làm |
| F2 | Đếm ngược ngày thi + tự gợi ý số thẻ mới/ngày | S | ✅ Đã xong |
| F3 | Luyện nghe cặp âm dễ nhầm (trường âm, っ) | M | ⬜ Chưa làm |
| F4 | Shadowing có chấm điểm bằng nhận giọng nói | M | ⬜ Chưa làm |
| F5 | Luyện kanji dễ nhầm theo bộ thủ | M | ✅ Đã xong |
| F6 | Kiểm tra thứ tự & hướng nét khi tập viết | M–L | ⬜ Chưa làm |
| F7 | Phát hiện thẻ "khó nhớ dai dẳng" (leech) | S–M | ⬜ Chưa làm |
| F8 | Vuốt thẻ trên điện thoại + chỉnh cỡ chữ | S | ⬜ Chưa làm |
| F9 | Lịch hoạt động cả năm + huy hiệu thành tích | M | ⬜ Chưa làm |
| F10 | Bảng điểm yếu tổng hợp | M | ⬜ Chưa làm |
| F11 | Xuất CSV để nhập vào Anki | S | ✅ Đã xong |

S ≈ một buổi ngắn · M ≈ một buổi · L ≈ nhiều buổi / rủi ro cao.

---

## 1. Bối cảnh codebase & quy ước chung (session nào cũng phải đọc)

### 1.1 Kiến trúc

- **Vite + React 19, JS/JSX thuần**, không có backend. Dữ liệu học ở `src/data/*.json`,
  tiến độ người dùng ở `localStorage`. Deploy: Firebase Hosting (chỉ file tĩnh).
- **13 tab**, mỗi tab một chunk lazy (`src/App.jsx`). Mỗi tab bọc trong `ErrorBoundary`.
- **Engine SRS dùng chung** `src/lib/srs.js` (Leitner box 0–5, `MASTERED_BOX = 4`).
  - Deck hiện có (`DECKS`): `vocab, kanji, kana, grammar, numbers, modifiers, listening, exam`.
  - API chính: `rateCard(deck, id, "forget" | "vague" | "remember")`, `getCard`,
    `getStatus`, `needsReview`, `dueItems`, `newItems`, `getStats`, `getForecast`,
    `getHardest`, `newIntroducedToday`, `invalidateSrs`, `subscribeSrs`.
  - Luật hiện tại: chỉ lên box khi tới hạn và tối đa 1 lần/ngày; quên nhiều lần trong
    ngày tính 1 lapse (`lapseDay`); thẻ đã thuộc vẫn ôn khi tới hạn (trừ deck `exam`).
- **Bộ chạy phiên dùng chung** `src/components/common/StudyRunner.jsx`. Item có dạng
  `{ deck, id, kind: "flash" | "choice" | "type", front/back… | question/choices/answer… }`.
  Xem `lib/session.js` (vocabCard, kanjiCard, kanaCard, mistakeCard) và `lib/quizgen.js`.
  - `StudyRunner` coi **mỗi mảng `items` mới là một phiên mới** (key theo định danh
    mảng) ⇒ phía gọi **bắt buộc memo hoá / giữ trong state** mảng `items`.
- **Phiên "Học hôm nay"**: `lib/session.js` (vocab/kanji/kana/câu sai) +
  `lib/sessionExtra.js` (thẻ tới hạn của các deck còn lại, nạp động).
  `session.js` được trang chủ dùng ngay khi mở app ⇒ **không import JSON nặng vào đó**.
- **Bộ sinh câu hỏi** `lib/quizgen.js` + danh mục `QUIZ_SETS` (UI `QuizHub` đọc từ đây).
  Gọi qua `buildQuiz(setId)` (tự gắn hậu tố cho id trùng). Id thẻ **dựa theo nội dung**
  (`contentKey()`), không theo vị trí mảng.
- **Vẽ lại theo dữ liệu**: hook `useDataVersion()` (`lib/useDataVersion.js`) — component
  gọi hook này tự vẽ lại khi SRS / tiến độ / dữ liệu người dùng đổi.
- **Dữ liệu người dùng khác**: `lib/progress.js` (streak, `daily`, `acc`),
  `lib/userdata.js` (ghi chú, thẻ tự tạo, cài đặt `settings_v1`), `lib/examStore.js`.
- **Sao lưu** `lib/backup.js`: danh sách `OWNED_KEYS` + luật gộp `mergeValue()`.
- **TTS** `lib/tts.js` (Web Speech `ja-JP`), nút `SpeakButton`.
- **Nét kanji** (KanjiVG, CC BY-SA 3.0) ở `src/data/kanji-strokes.json`, nạp lười qua
  `lib/kanjiStrokes.js` (`loadStrokes`, `strokesOf`, `useKanjiStrokes`).
- **Admin** (chỉ khi `npm run dev`): whitelist file ở **hai chỗ** — `DATA_FILES` trong
  `vite.config.ts` và `FILES` trong `src/components/admin/AdminTab.jsx`.

### 1.2 Quy ước bắt buộc

1. **Comment tiếng Việt giải thích *tại sao***, giống phong cách hiện có.
2. **Không tự bịa tiếng Nhật.** Câu hỏi, phương án nhiễu, cách đọc… chỉ lấy từ data có
   sẵn hoặc data người dùng soạn qua Admin. Không chắc đúng thì không hiển thị.
3. **Khoá `localStorage` mới** ⇒ thêm vào `OWNED_KEYS` trong `lib/backup.js`, và thêm
   luật gộp trong `mergeValue()` nếu là mảng object không có `id` hoặc cần "giữ giá trị cao hơn".
4. **Module giữ cache trong bộ nhớ** ⇒ phải có hàm `invalidate…()` và được gọi trong
   `dropCaches()` của `backup.js` (nếu không, xoá/nhập dữ liệu sẽ bị ghi đè ngược).
5. **Deck SRS mới** ⇒ thêm vào `DECKS` (srs.js), xử lý trong `sessionExtra.js` (để vào
   phiên hôm nay), và `describeCard` (session.js) nếu cần hiện trong "thẻ hay quên".
6. **Không setState đồng bộ trong effect, không ghi `ref.current` trong render.**
   Dùng mẫu "so sánh giá trị trước" trong render hoặc key để dựng lại component.
7. **Ô nhập bắt Enter** ⇒ bỏ qua khi `e.nativeEvent.isComposing || e.keyCode === 229` (IME).
8. **Hành động xoá/ghi đè** ⇒ `window.confirm` có nội dung rõ ràng, nút Huỷ không bao giờ gây mất dữ liệu.
9. **Dữ liệu nặng** ⇒ `import()` động; không kéo JSON lớn vào chunk đầu.
10. **Thư viện mới**: chỉ giấy phép MIT/BSD/Apache, ghim **phiên bản chính xác** trong
    `package.json`, ghi lý do trong commit.
11. File trong repo dùng CRLF ở working copy (`core.autocrlf=true`) — giữ nguyên kiểu xuống dòng khi sửa.

### 1.3 Định nghĩa "xong" cho mọi mục

- `npm run lint` → 0 lỗi, 0 cảnh báo.
- `npm run build` → thành công, không có chunk mới > 500 KB.
- Chạy preview (`.claude/launch.json`, cấu hình `dev`) và kiểm tra luồng chính của tính
  năng + không có lỗi console ở các tab liên quan. Kiểm tra cả màn hình điện thoại (375px).
- Dữ liệu cũ của người dùng không bị mất (nếu đổi cấu trúc → có di trú, cờ trong
  `migrations_done_v1`).
- Cập nhật trạng thái mục đó trong bảng ở phần 0.

---

## 2. Thứ tự triển khai & khả năng chạy song song

| ID | File chính sẽ sửa |
|---|---|
| F1 | `lib/srs.js`, `lib/backup.js`, `lib/migrate.js`, `package.json`, `ProgressTab.jsx` (giải thích) |
| F2 | `lib/userdata.js`, `lib/session.js`, `HomeTab.jsx`, `styles/tabs/home.css` |
| F3 | `src/data/minimal-pairs.json` (mới), `lib/quizgen.js`, `ListeningTab.jsx`, `vite.config.ts`, `AdminTab.jsx` |
| F4 | `lib/speech.js` (mới), `ListeningTab.jsx`, `styles/tabs/listening.css` |
| F5 | `lib/kanjiSimilar.js` (mới), `lib/quizgen.js`, `KanjiTab.jsx` |
| F6 | `components/common/WritePad.jsx`, `lib/strokeCheck.js` (mới), CSS WritePad |
| F7 | `lib/srs.js`, `StudyRunner.jsx`, `ProgressTab.jsx`, `lib/userdata.js` |
| F8 | `StudyRunner.jsx`, `lib/userdata.js`, `HomeTab.jsx` (ô cài đặt), `styles/base.css`, `runner.css` |
| F9 | `lib/achievements.js` (mới), `ProgressTab.jsx`, `App.jsx` (toast), `lib/backup.js` |
| F10 | `lib/reviewLog.js` (mới), `StudyRunner.jsx` (ghi log), `ProgressTab.jsx`, `lib/backup.js` |
| F11 | `lib/ankiExport.js` (mới), `ProgressTab.jsx` (nút) |

Các đợt đề xuất (trong một đợt, các mục **không** đụng cùng file nên chạy song song được):

- **Đợt 1 — độc lập, rủi ro thấp:** F2 · F4 · F6 · F11
  (F11 chỉ thêm một nút vào `ProgressTab.jsx`; nếu chạy song song với mục khác cũng
  sửa ProgressTab thì để F11 sau.)
- **Đợt 2:** F3 → F5 (cùng `quizgen.js`, làm **lần lượt** hoặc gộp một session) · F8
- **Đợt 3:** F7 → F10 → F9 (cùng `StudyRunner.jsx` / `ProgressTab.jsx`, làm lần lượt)
- **Đợt 4:** F1 (đổi lõi lịch ôn — làm cuối để không xung đột với F7/F10, và để có
  dữ liệu `review_log` của F10 nếu muốn tối ưu tham số).

---

## F1. Lịch ôn FSRS

**Mục tiêu.** Thay Leitner 5 box bằng thuật toán **FSRS** (Free Spaced Repetition
Scheduler) — dự đoán thời điểm sắp quên cho từng thẻ, cùng số lượt ôn mà nhớ lâu hơn.

**Nguồn / thư viện.** `ts-fsrs` (nhóm open-spaced-repetition, giấy phép MIT). Ghim phiên
bản chính xác khi cài. Không cần server, tính toán hoàn toàn trên máy.

**Thiết kế.**
- Giữ nguyên **API công khai** của `srs.js` (`rateCard`, `getCard`, `getStatus`,
  `needsReview`, `dueItems`, `getStats`, `getForecast`, `getHardest`…) để không phải sửa
  các tab. Ánh xạ đánh giá: `forget → Again`, `vague → Hard`, `remember → Good`
  (cân nhắc thêm nút `Easy` sau — không bắt buộc trong mục này).
- Mỗi thẻ lưu thêm trạng thái FSRS (`stability`, `difficulty`, `state`, `due` dạng ngày,
  `reps`, `lapses`, `last`). Vẫn **suy ra `box`** để UI cũ (L1…L5, "đã thuộc") hoạt động:
  ví dụ `box` theo ngưỡng stability (1 / 3 / 7 / 21 / 60 ngày) — ghi rõ bảng ngưỡng trong code.
- `getStatus`: "mastered" khi stability ≥ 21 ngày (tương đương box 4 hiện nay).
- Giữ luật hiện có: quên nhiều lần trong ngày chỉ tính 1 lapse; deck `exam` rời sổ khi "thuộc".
- **Di trú** (cờ `migrations_done_v1.fsrs`): thẻ Leitner cũ → khởi tạo FSRS với stability
  ước từ box (`BOX_INTERVALS`) và giữ nguyên `due`, `reps`, `lapses`.
- Cài đặt (tuỳ chọn): "Độ nhớ mong muốn" (desired retention) 0.85 / 0.9 / 0.95, mặc định 0.9.
- Sao lưu: cấu trúc mới nằm trong `srs_state_v1` — cập nhật `mergeValue` nếu cần
  (vẫn "thẻ nhiều reps hơn thì giữ").

**Các bước.** (1) Viết lớp chuyển đổi Leitner ↔ FSRS + test bằng script node (như các
test đã làm trong đợt sửa lỗi). (2) Thay `rateCard` bên trong. (3) Di trú. (4) Cập nhật
phần giải thích "Cách hoạt động" ở `ProgressTab.jsx` và `getForecast`.

**Tiêu chí xong.** Dữ liệu cũ di trú không mất thẻ; thẻ chưa tới hạn chấm "Nhớ" không bị
đẩy lịch xa bất thường; thống kê/dự báo vẫn đúng; test script so sánh khoảng ôn hợp lý.

**Rủi ro.** Đổi lõi ⇒ ảnh hưởng mọi tab. Làm sau cùng, commit riêng, dễ revert.

---

## F2. Đếm ngược ngày thi + tự gợi ý số thẻ mới/ngày

> ✅ **Đã xong** (2026-11-08). `examPlan()` / `newPerDayFor()` / `AUTO_NEW_CAP = 40` ở
> `lib/session.js`; `suggestedExamDates()` ở `lib/userdata.js`; thẻ `ExamCountdown` + ô
> cài đặt ở `HomeTab.jsx`. Ngày thi = hôm nay hoặc đã qua ⇒ ẩn đếm ngược, về `newPerDay`.
> Thẻ chưa học tính theo đầu ngày (cộng `newIntroducedToday()`) để hạn mức không tụt khi đang học.

**Mục tiêu.** Người học đặt ngày thi; app cho biết còn bao nhiêu ngày và **cần học bao
nhiêu thẻ mới mỗi ngày** để kịp học hết trước ngày thi (chừa thời gian ôn).

**Thiết kế.**
- Thêm `examDate` (YYYY-MM-DD, mặc định trống) và `autoNewPerDay` (bool) vào `settings_v1`.
  Gợi ý sẵn hai mốc JLPT: **Chủ nhật đầu tiên của tháng 7 và tháng 12** gần nhất (tính bằng
  code, người dùng vẫn sửa được).
- Công thức: `cần = ceil(thẻ_chưa_học / max(1, số_ngày_còn − ngày_dự_phòng_ôn))`, trong đó
  `ngày_dự_phòng_ôn = min(14, 20% số ngày còn)`. Thẻ chưa học = vocab + kanji + kana
  (cùng tập mà phiên hôm nay dùng).
- Trang chủ: thẻ "⏳ Còn N ngày tới kỳ thi · cần ~X thẻ mới/ngày". Nếu `autoNewPerDay`
  bật thì `newQuotaLeft()` (session.js) dùng con số này thay cho `newPerDay` (có trần, ví dụ 40).
- Ô cài đặt trong `GoalSettings` (HomeTab): chọn ngày, bật/tắt tự điều chỉnh.

**Tiêu chí xong.** Đổi ngày thi → con số cập nhật ngay; tắt tự điều chỉnh → về `newPerDay`;
ngày thi đã qua → ẩn thẻ đếm ngược, không chia cho 0.

---

## F3. Luyện nghe cặp âm dễ nhầm (trường âm, âm ngắt っ)

**Mục tiêu.** Luyện tai phân biệt độ dài nguyên âm và っ — lỗi phổ biến nhất của người
Việt (おばさん/おばあさん, きて/きって, ビル/ビール).

**Dữ liệu (không bịa từ).**
- Tạo `src/data/minimal-pairs.json`: `{ "pairs": [ { "id", "a": {jp, kana, vn}, "b": {…}, "kind": "long-vowel" | "sokuon" | "other" } ] }`.
- Khởi tạo bằng các cặp **có thật trong `vocabulary.json`** (quét tự động lúc soạn, đã
  kiểm tra có 11 nhóm: ビール/ビル, カレー/かれ, いいえ/いえ, ほしい/ほし, こうこう/ここ,
  ええ/え, あのう/あの, おじいさん/おじさん, おばあさん/おばさん, カード/かど,
  もっていきます/もってきます). Lấy nghĩa tiếng Việt từ chính `vocabulary.json`.
- Thêm file vào whitelist Admin (cả `vite.config.ts` và `AdminTab.jsx`) để người học
  tự bổ sung cặp mới.

**Thiết kế.**
- Bộ câu hỏi `listen-pairs` trong `QUIZ_SETS` (deck `listening`, id `mp:<contentKey(a.kana+b.kana)>:<a|b>`):
  phát một từ (TTS, `item.audio`) → chọn đúng cách viết giữa hai từ trong cặp; sau khi
  trả lời hiện nghĩa của cả hai.
- Chỉ 2 lựa chọn ⇒ hiện rõ "đúng/sai" và cho **nghe lại cả hai từ** để so sánh.
- Cần ra quyết định với người dùng trước khi làm (ghi vào phần "Quyết định" bên dưới khi
  đã chốt): có thêm chế độ "nghe → chọn cách viết" với phương án **không phải từ có thật**
  (ví dụ そこ/そうこ) hay không. Mặc định: **không**, chỉ dùng cặp có thật.

**Tiêu chí xong.** Bộ câu hiện trong tab Nghe và QuizHub; điểm vào SRS deck `listening`;
máy không có giọng Nhật thì hiện thông báo như các bộ nghe khác.

---

## F4. Shadowing có chấm điểm bằng nhận giọng nói

**Mục tiêu.** Người học đọc to câu mẫu, app nhận giọng nói và chấm mức khớp — luyện nói,
phần app đang thiếu.

**Công nghệ.** Web Speech API `SpeechRecognition` / `webkitSpeechRecognition`, `lang = "ja-JP"`.
Miễn phí; **chạy trên Chrome/Edge** (Safari hỗ trợ một phần). **Lưu ý quyền riêng tư:**
Chrome gửi âm thanh lên máy chủ nhận dạng của Google ⇒ hiện dòng thông báo trước lần dùng
đầu tiên, chỉ bật khi người dùng bấm.

**Thiết kế.**
- `lib/speech.js`: `recognitionSupported()`, `listenOnce({ lang, onResult, onError })`
  trả về hàm huỷ; xử lý lỗi `not-allowed`, `no-speech`, `network`.
- Chấm điểm: chuẩn hoá cả câu mẫu và kết quả (bỏ dấu câu/khoảng trắng, katakana→hiragana
  bằng `normalizeKana`), so **theo ký tự** bằng khoảng cách Levenshtein → % khớp. Kết quả
  nhận dạng có thể là kanji trong khi câu mẫu là kana (hoặc ngược lại) ⇒ so cả hai dạng
  nếu câu mẫu có trường đọc kana; nếu không có, chấm theo dạng hiển thị và ghi chú giới hạn.
- Hiện từng ký tự khớp/thiếu (tô màu), nút "Nghe mẫu" → "Thu âm" → điểm.
- Đặt trong phần Shadowing của `ListeningTab.jsx`. Trình duyệt không hỗ trợ ⇒ ẩn nút,
  giữ chế độ shadowing cũ.
- Không lưu âm thanh. Có thể ghi điểm cao nhất mỗi câu vào `shadow_best_v1` (thêm vào `OWNED_KEYS`).

**Tiêu chí xong.** Chrome: đọc câu → ra điểm và phần tô màu; từ chối quyền micro → thông
báo rõ ràng; Firefox (không hỗ trợ) → không hiện nút, không lỗi console.

---

## F5. Luyện kanji dễ nhầm theo bộ thủ

> ✅ **Đã xong** (2026-11-08). `lib/kanjiSimilar.js` (`similarityScore`, `similarKanji`,
> `MIN_SCORE = 2`, chênh tối đa 4 nét; thành phần mở rộng 2 cấp nên 休/体 chung cả 亻 lẫn 木).
> Bộ `kanji-confusable` (132 câu, id `conf:<kanjiId>`, bỏ nhiễu trùng nghĩa) trong `quizgen.js`;
> mục "⚠️ Dễ nhầm với" trong modal kanji, bấm mở được cả chữ đang bị bộ lọc ẩn.
> Kiểm tra mọi `QUIZ_SETS`: 0 lỗi. Giới hạn: cặp không chung thành phần (日/目) không phát hiện được.

**Mục tiêu.** Phân biệt các chữ trông giống nhau (休/体, 見/貝, 未/末, 土/士) thay vì chỉ
nhận mặt chữ.

**Dữ liệu.** Có sẵn trong `kanji.json`: 287 chữ đều có `radical`, 243 chữ có `components`
(trích từ KanjiVG). Không cần dữ liệu ngoài.

**Thiết kế.**
- `lib/kanjiSimilar.js`: điểm giống nhau giữa hai chữ = số thành phần chung (trọng số cao
  cho bộ thủ cùng vị trí) + chênh lệch số nét nhỏ. `similarKanji(id, n=3)` trả về các chữ
  giống nhất (ngưỡng tối thiểu để tránh "giống" gượng ép).
- Bộ câu `kanji-confusable` trong `QUIZ_SETS` (deck `kanji`, id `conf:<kanjiId>`):
  hiện nghĩa + âm Hán Việt → chọn đúng chữ trong 4 chữ, **3 phương án nhiễu là chữ giống nhất**.
- Trong modal kanji (`KanjiTab.jsx`) thêm mục "⚠️ Dễ nhầm với": các chữ giống nhất, bấm để mở.

**Tiêu chí xong.** Mọi câu có đủ ≥ 2 phương án nhiễu; không có lựa chọn trùng; chạy lại
script kiểm tra quiz (0 lỗi); mục "Dễ nhầm với" ẩn khi không có chữ đủ giống.

---

## F6. Kiểm tra thứ tự & hướng nét khi tập viết

**Mục tiêu.** Sau khi viết, app cho biết **từng nét đúng thứ tự, đúng hướng chưa** —
không chấm "đẹp/xấu" (đã cố ý không làm vì heuristic hình dạng dễ chấm sai).

**Dữ liệu.** Nét mẫu KanjiVG (path SVG, toạ độ 0..109) qua `useKanjiStrokes` / `strokesOf`.

**Thiết kế.**
- `WritePad.jsx` hiện chỉ vẽ lên canvas ⇒ thêm việc **ghi lại điểm của từng nét**
  (pointerdown → pointermove → pointerup), quy về hệ toạ độ 109×109.
- `lib/strokeCheck.js`:
  - Lấy điểm đầu/cuối mỗi nét mẫu bằng `SVGPathElement.getPointAtLength` (tạo path ẩn)
    hoặc phân tích lệnh `M…` đầu path và điểm cuối.
  - So nét thứ i của người viết với nét mẫu thứ i: khoảng cách điểm đầu, điểm cuối, và góc
    vectơ đầu→cuối. Sai thứ tự = nét viết khớp tốt hơn với một nét mẫu khác.
  - Kết quả mỗi nét: ✅ đúng · ↩️ ngược hướng · 🔀 sai thứ tự · ❓ không khớp. Báo thêm
    "thiếu/thừa N nét".
- Nút "Kiểm tra nét" sau khi viết; tô màu nét mẫu tương ứng; ngưỡng dung sai rộng, ghi rõ
  trong code là chỉ kiểm tra thứ tự/hướng.
- Không lưu tiến độ (hoặc tuỳ chọn: chấm đúng hết → `rateCard("kanji", id, "remember")`
  — cần hỏi người dùng trước khi làm).

**Tiêu chí xong.** Thử trên 一 (1 nét), 十 (2 nét), 口 (3 nét), 人 (2 nét): viết đúng → toàn
✅; viết ngược hướng một nét → báo đúng nét đó; viết đảo thứ tự → báo 🔀. Hoạt động với
chuột và cảm ứng.

---

## F7. Phát hiện thẻ "khó nhớ dai dẳng" (leech)

**Mục tiêu.** Thẻ quên đi quên lại (≥ 4 lần) cần **cách học khác**, không phải ôn thêm.
App nhắc người học tự viết mẹo nhớ — tận dụng tính năng ghi chú có sẵn.

**Thiết kế.**
- `srs.js`: `isLeech(card)` = `lapses ≥ LEECH_LAPSES` (mặc định 4, chỉnh được trong cài đặt).
  `getLeeches()` trả về `[{deck, id, card}]`.
- `StudyRunner.jsx`: khi thẻ hiện tại là leech → dải cảnh báo "🧩 Thẻ này bạn đã quên N lần —
  thử viết mẹo nhớ riêng" và **tự mở `NoteBox`** nếu thẻ chưa có ghi chú.
- Tuỳ chọn **tạm hoãn** thẻ (`suspended: true` trong card): `needsReview`, `newItems`,
  `dueItems` bỏ qua thẻ bị hoãn; có nút "Bỏ hoãn" trong Tiến độ.
- `ProgressTab.jsx`: mục "🧩 Thẻ khó dai dẳng" — danh sách, trạng thái đã có ghi chú chưa,
  nút ôn riêng / hoãn / bỏ hoãn.

**Tiêu chí xong.** Thẻ có lapses ≥ 4 hiện cảnh báo trong phiên; thẻ bị hoãn không vào phiên
hôm nay và không được đếm "tới hạn"; sao lưu/nhập giữ cờ `suspended`.

---

## F8. Vuốt thẻ trên điện thoại + chỉnh cỡ chữ

**Mục tiêu.** Ôn bằng một tay trên điện thoại; người mắt kém / màn nhỏ phóng to chữ Nhật.

**Thiết kế.**
- `StudyRunner.jsx` (`FlashBody`): pointer events — chạm để lật; **sau khi lật**: vuốt
  trái = Quên, vuốt phải = Nhớ, vuốt lên = Mơ hồ. Ngưỡng ~60px, thẻ nghiêng/trượt theo
  ngón tay, nhả tay chưa đủ ngưỡng thì bật về. Không ảnh hưởng chuột/bàn phím hiện có.
  Lần đầu hiện gợi ý ngắn (ghi nhớ đã xem bằng `localStorage`, bọc try/catch).
- Cỡ chữ: `settings_v1.fontScale` (0.9 / 1 / 1.15 / 1.3) → biến CSS `--jp-scale` trên
  `:root`, áp vào các lớp chữ Nhật lớn (thẻ lật, câu hỏi, ô kanji, bảng kana). Ô chỉnh trong
  `GoalSettings` (HomeTab). Áp ngay khi app khởi động (`App.jsx`).

**Tiêu chí xong.** Màn 375px: vuốt chấm đúng mức, không cuộn trang khi vuốt ngang thẻ;
đổi cỡ chữ áp dụng toàn app và giữ sau khi tải lại.

---

## F9. Lịch hoạt động cả năm + huy hiệu thành tích

**Mục tiêu.** Giữ động lực: thấy được cả năm học, mở khoá huy hiệu theo cột mốc thật.

**Thiết kế.**
- Lịch kiểu GitHub (53 tuần × 7 ngày) từ `progress_v1.daily`, màu theo số lượt ôn (4–5
  mức), tooltip ngày + số lượt, ở `ProgressTab.jsx`. Cuộn ngang được trên điện thoại.
- `lib/achievements.js`: danh sách huy hiệu **tính từ dữ liệu có sẵn**, ví dụ:
  chuỗi 7 / 30 / 100 ngày · thuộc hết hiragana / katakana · 100 / 300 / toàn bộ từ vựng ·
  50 / 103 kanji N5 · lần đầu ĐẠT thi thử · 1.000 / 10.000 lượt ôn · Sổ tay lỗi trống.
- Lưu thời điểm mở khoá ở `achievements_v1` (`{ [id]: isoDate }`) → thêm vào `OWNED_KEYS`,
  luật gộp "giữ ngày sớm hơn".
- Toast nhỏ khi mở khoá (component ở `App.jsx`, lắng nghe `subscribeSrs`/`subscribeProgress`).

**Tiêu chí xong.** Lịch đúng với dữ liệu `daily`; huy hiệu mở khoá đúng lúc và không mở lại
lần hai; xoá toàn bộ dữ liệu thì huy hiệu cũng bị xoá.

---

## F10. Bảng điểm yếu tổng hợp

**Mục tiêu.** Biết chính xác cần ôn gì: mẫu ngữ pháp nào, chủ đề từ vựng nào, phần thi nào
đang yếu nhất.

**Thiết kế.**
- `lib/reviewLog.js`: nhật ký trả lời dạng vòng (tối đa ~3.000 dòng gần nhất) ở
  `review_log_v1`: `{ t, deck, id, tag, ok }`. Ghi trong `StudyRunner` (mỗi lượt chấm) và
  `ExercisesTab` (mỗi câu luyện tập / lúc nộp bài thi). Thêm vào `OWNED_KEYS`
  (gộp: hợp hai mảng theo `t+deck+id`, giữ 3.000 dòng mới nhất). Có `invalidate…` nếu cache.
- Nhóm theo `tag` có sẵn trên item (ví dụ "Trợ từ は", "Bộ đếm 〜本", chủ đề từ vựng, phần
  thi) → độ chính xác 30 ngày, số lượt, xu hướng so với 30 ngày trước.
- `ProgressTab.jsx`: mục "🎯 Điểm yếu" — 5–10 nhóm yếu nhất (đủ tối thiểu ~8 lượt mới tính),
  nút "Luyện ngay nhóm này" dựng phiên từ các thẻ thuộc nhóm (giữ mảng items trong state).
- Kết hợp thêm dữ liệu sẵn có khi chưa đủ log: thẻ nhiều `lapses` theo nhóm, Sổ tay lỗi theo phần thi.

**Tiêu chí xong.** Làm vài phiên có sai → nhóm tương ứng xuất hiện với % đúng; nút luyện mở
đúng thẻ của nhóm; log không phình quá giới hạn.

---

## F11. Xuất CSV để nhập vào Anki

> ✅ **Đã xong** (2026-11-08). `lib/ankiExport.js` (`buildAnkiTsv`, `ankiItems`, `downloadAnki`),
> khối "🃏 Xuất thẻ sang Anki" trong "Sao lưu & chuyển máy" (`ProgressTab.jsx`). File `.txt`
> (TSV, BOM, CRLF). Không thêm dòng tên cột vì Anki chỉ hiểu chỉ thị `#khoá:giá trị`; tên cột
> nằm trong hướng dẫn trên UI. Từ bổ nghĩa không có đánh dấu ⭐ ⇒ nút lọc đó bị tắt.

**Mục tiêu.** Người học muốn ôn tiếp ở Anki (hoặc app khác) có thể mang thẻ đi.

**Thiết kế.**
- `lib/ankiExport.js`: tạo file **TSV UTF-8 có BOM** (Anki nhập file văn bản trực tiếp,
  không cần định dạng `.apkg`). Cột: Mặt trước · Mặt sau · Cách đọc · Ví dụ (JP) · Ví dụ (VN)
  · Ghi chú của tôi · Tags (`jlpt-n5 vocab <chủ đề>`). Dòng đầu là chỉ thị Anki
  (`#separator:tab`, `#html:false`, `#tags column:7`).
- Chọn bộ: Từ vựng (gồm thẻ tự tạo) · Kanji · Từ bổ nghĩa; lọc tuỳ chọn "chỉ thẻ đang học /
  chỉ thẻ đánh dấu". Không xuất nét KanjiVG.
- Nút trong khối "Sao lưu & chuyển máy" của `ProgressTab.jsx`, kèm hướng dẫn 3 bước nhập vào Anki.

**Tiêu chí xong.** File mở đúng tiếng Nhật trong Excel/Anki; tab/xuống dòng trong nội dung
được thay an toàn; tên file có ngày.

---

## Quyết định cần người dùng chốt (điền khi đã quyết)

| Mục | Câu hỏi | Mặc định nếu chưa chốt |
|---|---|---|
| F1 | Thêm `ts-fsrs` (MIT) làm dependency? Có cho chọn "độ nhớ mong muốn"? | Có thêm; có ô chọn, mặc định 0.9 |
| F3 | Có chế độ phương án nhiễu không phải từ có thật (そこ/そうこ)? | Không |
| F4 | Chấp nhận Chrome gửi âm thanh lên máy chủ Google để nhận dạng? | Có, kèm thông báo trước lần đầu |
| F6 | Viết đúng hết nét có tính là ôn thẻ kanji ("Nhớ") không? | Không |
| F7 | Ngưỡng leech | 4 lần quên |
