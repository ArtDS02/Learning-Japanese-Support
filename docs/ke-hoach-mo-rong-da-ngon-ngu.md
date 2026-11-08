# Kế hoạch mở rộng: từ "JLPT N5" thành web học tiếng Nhật + tiếng Anh

> Soạn ngày 2026-11-08, trên nhánh `feat/grouped-tab-nav` (commit `76aa84e`).
> Căn cứ: đọc `src/lib/*` (srs, storage, dataKeys, cloud/*, session, tts, userdata,
> migrate), `StudyRunner.jsx`, `App.jsx`, `firestore.rules`, `vite.config.ts`, `public/sw.js`.
>
> Tài liệu này nối tiếp cách viết của `docs/plan-tinh-nang-moi.md`: **mỗi mục (M1…M15)
> đủ nhỏ để một session làm trọn**. Phần 1 của file đó (kiến trúc, quy ước bắt buộc,
> định nghĩa "xong") **vẫn áp dụng nguyên vẹn** ở đây.

---

## 0. Tóm tắt & cách dùng file này

**Kết luận:** làm được, và nên làm theo hướng **"khoá học" (course) cắm vào một lõi
dùng chung**. Lõi hiện tại (SRS, tiến độ, đồng bộ tài khoản, StudyRunner, quizgen,
sao lưu, PWA) gần như không phụ thuộc tiếng Nhật. Thứ phụ thuộc là **nội dung, tên
trường dữ liệu, TTS, và tên khoá lưu trữ**.

**Nguyên tắc số 1:** người đang học tiếng Nhật **không được thấy bất kỳ thay đổi nào**
và **không mất một lượt ôn nào**, kể cả khi họ còn một máy chạy bản cũ.

Gửi cho session mới câu lệnh mẫu:

```text
Đọc docs/plan-tinh-nang-moi.md phần 1 (quy ước), rồi docs/ke-hoach-mo-rong-da-ngon-ngu.md
phần 1–3 và mục M2. Triển khai M2 đúng phạm vi, chạy test + lint + build, kiểm tra trên
preview, rồi đánh dấu M2 là "✅ Đã xong" trong bảng dưới.
```

| ID | Hạng mục | Giai đoạn | Công sức | Trạng thái |
|---|---|---|---|---|
| M1 | Sổ đăng ký khoá học + khoá lưu trữ theo khoá học | 1 · Nền móng | M | ⬜ Chưa làm |
| M2 | Đồng bộ: danh sách khoá động + kéo lại toàn bộ khi bộ khoá đổi | 1 · Nền móng | M | ⬜ Chưa làm |
| M3 | Áp khoá theo khoá học vào các module lưu trữ | 1 · Nền móng | M | ⬜ Chưa làm |
| M4 | TTS đa ngôn ngữ | 1 · Nền móng | S–M | ⬜ Chưa làm |
| M5 | Lớp chuyển đổi thẻ + StudyRunner không gắn tiếng Nhật | 1 · Nền móng | M–L | ⬜ Chưa làm |
| M6 | Deck & menu điều hướng đọc từ manifest | 1 · Nền móng | M | ⬜ Chưa làm |
| M7 | Chọn khoá học (lần đầu + đổi), tiêu đề/`lang` động | 2 · Khung tiếng Anh | S–M | ⬜ Chưa làm |
| M8 | Schema dữ liệu tiếng Anh + Admin + bộ mẫu | 2 · Khung tiếng Anh | M | ⬜ Chưa làm |
| M9 | Tab Từ vựng tiếng Anh (danh sách + flashcard + quiz) | 2 · Khung tiếng Anh | M | ⬜ Chưa làm |
| M10 | Trang chủ & Tiến độ theo khoá học | 2 · Khung tiếng Anh | M | ⬜ Chưa làm |
| M11 | Phát âm: bảng IPA + cặp âm dễ nhầm | 3 · Đặc thù tiếng Anh | M | ⬜ Chưa làm |
| M12 | Động từ bất quy tắc + chia thì | 3 · Đặc thù tiếng Anh | M | ⬜ Chưa làm |
| M13 | Ngữ pháp theo chủ điểm (đọc + luyện) | 3 · Đặc thù tiếng Anh | M–L | ⬜ Chưa làm |
| M14 | Nghe chép chính tả | 3 · Đặc thù tiếng Anh | M | ⬜ Chưa làm |
| M15 | Bộ đề luyện thi tiếng Anh | 3 · Đặc thù tiếng Anh | L | ⬜ Chưa làm |

S ≈ một buổi ngắn · M ≈ một buổi · L ≈ nhiều buổi / rủi ro cao.
Giai đoạn 4 (mở rộng xa hơn) ở **phần 8**, chưa chia mục.

---

## 1. Hiện trạng: cái gì dùng lại được, cái gì đang gắn tiếng Nhật

### 1.1 Dùng lại nguyên vẹn

| Thành phần | File | Vì sao dùng lại được |
|---|---|---|
| Engine SRS Leitner | `lib/srs.js` | Chỉ biết `deck` + `id`; không đọc nội dung thẻ |
| Streak, hoạt động ngày, độ chính xác | `lib/progress.js` | Chỉ đếm lượt ôn |
| Đồng bộ tài khoản | `lib/cloud/*`, `firestore.rules` | Lưu dạng key–value `users/{uid}/kv/{key}`; rules không giới hạn tên khoá ⇒ **không phải sửa rules** |
| Bộ chạy phiên | `StudyRunner.jsx` | Item chung `{ deck, id, kind: flash/choice/type }` (trừ vài chỗ ở 1.2) |
| Bộ sinh câu hỏi, QuizHub | `lib/quizgen.js`, `QuizHub.jsx` | Khung `QUIZ_SETS` + `buildQuiz` dùng lại; chỉ nguồn dữ liệu là tiếng Nhật |
| Sao lưu / nhập / gộp | `lib/backup.js`, `lib/merge.js` | Chạy theo danh sách khoá |
| Ghi chú, thẻ tự tạo, cài đặt | `lib/userdata.js` | Dạng chung (trừ trường `japanese` của thẻ tự tạo) |
| Thi thử, lưu đáp án, sổ câu sai | `lib/examStore.js` | Khung đề dùng lại; dữ liệu đề riêng |
| PWA / offline | `public/sw.js` | Cache theo asset băm tên, không phụ thuộc nội dung |
| Điều hướng nhóm + tab lazy | `App.jsx` | Chỉ cần đổi nguồn của `GROUPS` và bảng tab |

### 1.2 Đang gắn tiếng Nhật (đo trên `src/`)

| Điểm gắn | Mức độ | Ghi chú |
|---|---|---|
| Khoá `localStorage` chung, không tách theo ngôn ngữ | **Cao** | `srs_state_v1` chứa mọi deck; id thẻ như `g1` dễ trùng giữa hai ngôn ngữ |
| Trường `.japanese` | 9 file | `session.js`, `quizgen.js`, `searchIndex.js`, `ankiExport.js`, `userdata.js`, `furigana.js`, Vocabulary/Kanji/Listening tab |
| `romaji` | 24 file | Phần lớn nằm ở tab riêng tiếng Nhật; trong lõi thì có `StudyRunner` (`matchesKana`) |
| TTS chỉ chọn giọng `ja` | 5 file dùng `hasJaVoice` | `lib/tts.js` có danh sách `PREFERRED` toàn giọng Nhật |
| `Ruby` / furigana trong thẻ | 6 + 14 file | `StudyRunner` luôn vẽ `Ruby` |
| `DECKS` (srs.js), `GROUPS` (App.jsx) viết cứng | Trung bình | Danh sách deck và menu là của tiếng Nhật |
| Thương hiệu "JLPT N5" | 10 file + `index.html`, `manifest.webmanifest`, `sw.js` (`CACHE_VERSION`) | |
| Admin whitelist | `vite.config.ts` `DATA_FILES` + `AdminTab.jsx` `FILES` | Đường dẫn phẳng trong `src/data/` |

---

## 2. Kiến trúc đích

### 2.1 Khái niệm

- **Khoá học (course)** = một ngôn ngữ đích: `ja` (tiếng Nhật), `en` (tiếng Anh).
  **Cấp độ** (N5/N4, A1/A2) **không** phải là khoá học riêng mà là trường `level`
  trong dữ liệu + bộ lọc. Nhờ đó sau này thêm N4 không phải tách tiến độ.
- **Lõi (core)** không import dữ liệu của khoá học nào. Mọi thứ đặc thù đi qua
  **manifest** của khoá học.

### 2.2 Cấu trúc thư mục

```
src/
  courses/
    index.js          ← sổ đăng ký: [{ id, label, flag, load: () => import("./ja/manifest") }]
                        CHỈ metadata nhẹ, không import JSON
    ja/manifest.js    ← decks, groups, tabs (lazy), ttsLang, card adapter, matcher, tính năng
    en/manifest.js
  lib/course.js       ← khoá học đang chọn + ck() (đặt tên khoá lưu trữ)
  data/               ← giữ NGUYÊN các file tiếng Nhật ở đây (tránh xáo trộn import, Admin)
  data/en/            ← dữ liệu tiếng Anh
```

Việc dời dữ liệu tiếng Nhật vào `data/ja/` có thể làm sau. Đó là việc máy móc, không
đem lại giá trị cho người dùng.

### 2.3 Manifest của một khoá học (hình dạng)

```js
export default {
  id: "en",
  label: "Tiếng Anh",
  htmlLang: "en",              // gắn lên nội dung học (không phải <html>, vốn là "vi")
  ttsLang: "en-US",
  hasReading: false,           // true với tiếng Nhật → StudyRunner vẽ Ruby/furigana
  decks: [ { id: "vocab", label: "Từ vựng", icon: "📖", color: "#22d3ee", tab: "vocabulary" }, … ],
  groups: [ { id: "learn", icon: "📚", label: "Kiến thức", tabs: ["vocabulary", "pronunciation"] }, … ],
  tabs: { vocabulary: () => import("./tabs/EnVocabularyTab"), … },
  toCard: (word) => ({ id, term, reading, meaning, example, exampleMeaning, audioText }),
  matchAnswer: (typed, expected) => boolean,   // ja: matchesKana; en: so khớp chuẩn hoá
};
```

### 2.4 Đổi khoá học = tải lại trang (giai đoạn đầu)

Nhiều module đọc khoá lưu trữ vào **hằng số cấp module** và giữ **cache trong bộ nhớ**
(`srs.js` có `cache`, `userdata.js` có `customCache`…). Nếu đổi khoá học "nóng" thì
phải xoá mọi cache, đăng ký lại mọi listener, dựng lại mọi màn. Rủi ro cao.

⇒ **Khuyến nghị:** `setCourse(id)` ghi `active_course` rồi `location.reload()`.
`ck()` đọc khoá học **đồng bộ một lần lúc nạp module**, nên mọi hằng số
`const KEY = ck("srs_state_v1")` đều đúng. Nhờ PWA cache nên tải lại chỉ mất khoảng
một giây. Đổi khoá học không cần tải lại để ở **giai đoạn 4**.

---

## 3. Lưu trữ & đồng bộ: quyết định quan trọng nhất

### 3.1 Giữ nguyên khoá tiếng Nhật, chỉ thêm tiền tố cho khoá học mới

```js
// lib/course.js
export const ck = (base) => (COURSE === "ja" ? base : `${COURSE}:${base}`);
//   ja → "srs_state_v1"      (y hệt hiện tại)
//   en → "en:srs_state_v1"
```

Vì sao **không** đổi tên mọi khoá thành `ja:…` cho "đẹp":

1. **Không cần di trú**: không có bước chép dữ liệu nào có thể hỏng giữa chừng.
2. **Máy chạy bản cũ vẫn đúng**: người dùng có điện thoại chưa cập nhật service worker
   sẽ tiếp tục đọc/ghi `srs_state_v1`. Nếu đổi tên, hai máy sẽ ghi hai khoá khác nhau
   và tiến độ "tách đôi" trên tài khoản.
3. Bản cũ **bỏ qua** khoá `en:*` khi kéo về, vì `resolvePull` trả `skip` với khoá ngoài
   `SYNCED_KEYS` (`syncCore.js:87`). Nhờ vậy không có xung đột.

Khoá có dấu `:` hợp lệ làm document id trên Firestore (đã có tiền lệ `kana:quiz:cfg`).

### 3.2 Phân loại khoá: dùng chung hay theo khoá học

| Khoá hiện có | Phạm vi | Lý do |
|---|---|---|
| `srs_state_v1`, `daily_new_v1`, `exam_state_v1`, `exam_history_v1`, `notes_v1`, `custom_cards_v1`, `run_progress_v1`, `vocab_marked_ids` | **Theo khoá học** | Nội dung khác nhau, id có thể trùng |
| `jlpt-active-tab`, `jlpt-nav-last` | **Theo khoá học** | Tab của hai khoá học khác nhau |
| `progress_v1` | **Dùng chung** (đề xuất, xem phần 9) | Học ngôn ngữ nào cũng giữ streak; đỡ một nguồn sự thật |
| `settings_v1` | **Tách đôi** | Chung: `reminderOn/Time`, `fontScale`. Theo khoá học: `dailyGoal`, `newPerDay`, `examDate`, `autoNewPerDay`, `autoSpeak`, `showFurigana` |
| `tts_cfg_v1` | Dùng chung, đổi cấu trúc thành `{ ja: {…}, en: {…} }` | Không đồng bộ (giọng đọc khác nhau giữa máy) |
| `kanji_*`, `kana:quiz:cfg`, `minna1_v1`, `studyplan_checks_v1`, `n5.numbers.counterView`, `swipe_hint_seen_v1`, `migrations_done_v1` | Chỉ của tiếng Nhật / chỉ của máy | Giữ nguyên tên |
| `active_course` (**mới**) | Dùng chung, **không đồng bộ** | Mỗi máy có thể đang học một khoá |

Tách `settings_v1`: thêm `ck("course_settings_v1")` cho phần theo khoá học. Bước di trú
(cờ trong `migrations_done_v1`) **chép** (không chuyển) các trường theo khoá học của
`settings_v1` sang `course_settings_v1` của `ja`. Bản cũ vẫn đọc được `settings_v1`.

### 3.3 Bẫy đồng bộ phải xử lý trong M2: con trỏ đã vượt qua khoá mới

`pullOnce` chỉ kéo các document có `st > meta.cursor` (`engine.js:181`). Kịch bản lỗi:

1. Máy A (bản mới) học tiếng Anh, đẩy lên `en:srs_state_v1` lúc T1.
2. Máy B (bản cũ) đồng bộ lúc T2 > T1. Document `en:*` bị **bỏ qua**, nhưng `cursor`
   **vẫn tiến tới T2**.
3. Máy B cập nhật lên bản mới. `pullOnce` hỏi "`st > T2`" nên **không bao giờ thấy**
   `en:srs_state_v1`. Tiến độ tiếng Anh trên máy B trống, và lần ghi đầu tiên ở B sẽ
   **đè mất** tiến độ của A.

**Cách sửa:** lưu `keyset` (mã băm của danh sách `SYNCED_KEYS`) trong meta đồng bộ.
Khi khởi động thấy `keyset` khác thì chạy một lần **kéo toàn bộ** (bỏ `cursor`) trước
khi cho đẩy. Viết test cho kịch bản trên trong `syncCore.test.js`.

### 3.4 Dung lượng

- Mỗi khoá là một document, giới hạn khoảng 900 KB (`MAX_DOC_CHARS`, `engine.js:47`).
  Một thẻ SRS khoảng 70 byte JSON. 3.000 từ tiếng Anh + 1.000 thẻ Nhật ≈ 280 KB **nếu
  dồn chung một khoá**. Tách theo khoá học thì mỗi document còn khoảng một nửa và
  không bao giờ chạm trần.
- Bundle: dữ liệu tiếng Nhật hiện khoảng 830 KB JSON. Dữ liệu tiếng Anh phải nằm trong
  chunk riêng của khoá `en`, chia theo cấp độ/chủ đề để **không chunk nào vượt 500 KB**
  (định nghĩa "xong" hiện tại).

---

## 4. Thứ tự triển khai & khả năng chạy song song

| ID | File chính sẽ sửa | Phụ thuộc |
|---|---|---|
| M1 | `lib/course.js` (mới), `courses/index.js` (mới), `courses/ja/manifest.js` (mới), `lib/dataKeys.js`, test mới | — |
| M2 | `lib/cloud/engine.js`, `lib/cloud/syncCore.js`, `lib/cloud/store.js`, `syncCore.test.js` | M1 |
| M3 | `lib/srs.js`, `lib/userdata.js`, `lib/examStore.js`, `lib/runstate.js`, `lib/migrate.js`, `lib/backup.js`, `App.jsx` (khoá tab) | M1 |
| M4 | `lib/tts.js`, `SpeakButton.jsx`, `ListeningTab.jsx`, các chỗ gọi `hasJaVoice` | M1 |
| M5 | `StudyRunner.jsx`, `lib/session.js`, `lib/searchIndex.js`, `lib/ankiExport.js`, `lib/userdata.js` (thẻ tự tạo) | M1, M4 |
| M6 | `App.jsx` (`GROUPS`, bảng tab), `lib/srs.js` (`DECKS`), `courses/ja/manifest.js` | M1, M3 |
| M7 | `AccountPanel.jsx` hoặc header, `App.jsx`, `index.html`, `lib/course.js` | M6 |
| M8 | `src/data/en/*` (mới), `src/data/en/SCHEMA.md`, `vite.config.ts`, `AdminTab.jsx` | M1 |
| M9 | `courses/en/*` (mới) | M5, M6, M8 |
| M10 | `HomeTab.jsx`, `ProgressTab.jsx`, `lib/sessionExtra.js` | M6 |
| M11–M15 | `courses/en/*`, `src/data/en/*`, `lib/quizgen.js` (nguồn mới) | M9 |

Các đợt (trong một đợt, các mục không đụng cùng file nên chạy song song được):

- **Đợt 1:** M1
- **Đợt 2:** M2 ‖ M4 ‖ M8 (M2 chỉ sửa `cloud/*`, M4 sửa TTS, M8 chỉ thêm dữ liệu)
- **Đợt 3:** M3 → M6 (cùng sửa `srs.js` nên làm lần lượt)
- **Đợt 4:** M5
- **Đợt 5:** M7 ‖ M10 ‖ M9
- **Đợt 6:** M11 ‖ M12 ‖ M14 (đều thêm nguồn vào `quizgen.js`: **gộp lần lượt** phần sửa file đó)
- **Đợt 7:** M13, M15 (nặng về soạn nội dung)

**Mốc phát hành:** hết đợt 4 là phát hành được ngay, vì người dùng không thấy thay
đổi gì nhưng nền đã sẵn sàng. Tiếng Anh chỉ hiện ra cho người dùng từ M7. Có thể ẩn sau
cờ `?course=en` cho tới khi đủ nội dung.

---

## 5. Giai đoạn 1: Nền móng (giao diện tiếng Nhật không đổi một pixel)

### M1. Sổ đăng ký khoá học + khoá lưu trữ theo khoá học

- **Làm:**
  - `lib/course.js`: `COURSE` (đọc `active_course` đồng bộ lúc nạp, mặc định `"ja"`,
    giá trị lạ thì về `"ja"`), `ck(base)`, `setCourse(id)` (ghi + reload),
    `courseKeys(id)`.
  - `courses/index.js`: danh sách khoá học (metadata nhẹ). `courses/ja/manifest.js`
    ban đầu chỉ có `id`, `label`, `ttsLang: "ja-JP"`, `hasReading: true`.
  - `lib/dataKeys.js`: tách `GLOBAL_KEYS` và `COURSE_KEYS` (base). Sinh `OWNED_KEYS`,
    `SYNCED_KEYS`, `MERGEABLE_KEYS` cho **mọi** khoá học trong sổ, **không chỉ khoá đang
    chọn**: đang học tiếng Nhật vẫn phải đồng bộ và sao lưu tiến độ tiếng Anh.
    `active_course` thêm vào `SYNC_EXCLUDE`.
- **Test:** khi chỉ có `ja` trong sổ, `OWNED_KEYS`/`SYNCED_KEYS` **bằng đúng** danh sách
  hiện tại (test so sánh tường minh). Thêm `en` thì xuất hiện thêm `en:srs_state_v1`…
- **Xong khi:** test xanh; app chạy y như cũ.

### M2. Đồng bộ: danh sách khoá động + kéo lại toàn bộ khi bộ khoá đổi

- **Làm:** xử lý bẫy ở **3.3** (`keyset` trong meta → kéo toàn bộ một lần). Kiểm tra lại
  `planFirstLogin` (`syncCore.js`), `dirtyKeys` (`metaOps.js`), `summarize`
  (`engine.js`, hiện chỉ đếm thẻ từ `srs_state_v1`) để cộng cả khoá `en:*` khi hỏi người dùng "giữ bản nào".
- **Test** (`syncCore.test.js`): kịch bản 3 bước ở 3.3; đăng nhập lần đầu có cả khoá
  `ja` và `en`.
- **Kiểm tra tay:** emulator (`npm run emulators`), hai cửa sổ trình duyệt.

### M3. Áp khoá theo khoá học vào các module lưu trữ

- **Làm:** thay hằng số khoá bằng `ck(...)` theo bảng 3.2 trong `srs.js` (`KEY`,
  `NEW_KEY`), `userdata.js`, `examStore.js`, `runstate.js`, khoá tab trong `App.jsx`.
  Tách `settings_v1`, thêm di trú chép sang `course_settings_v1`. `tts_cfg_v1` đổi
  sang dạng theo ngôn ngữ (đọc được cả dạng cũ).
  Listener `storage` trong các module so khớp với khoá **đã qua `ck()`**.
- **Xong khi:** với `ja` mọi khoá giữ nguyên tên (kiểm tra bằng DevTools → localStorage
  trước/sau); nhập lại một file sao lưu cũ vẫn khôi phục đủ.

### M4. TTS đa ngôn ngữ

- **Làm:** `speak(text, { lang })` với `lang` mặc định lấy từ manifest. Chọn giọng theo
  `lang`, mỗi ngôn ngữ có danh sách `PREFERRED` riêng (tiếng Anh ưu tiên giọng
  "Google US English", "Microsoft Aria/Jenny", "Samantha"). `hasVoice(lang)` thay
  `hasJaVoice()` (giữ `hasJaVoice` làm bí danh để không phải sửa hết một lượt).
  Thông báo "máy chưa có giọng…" ở `ListeningTab.jsx:97` lấy tên ngôn ngữ từ manifest.
- **Xong khi:** tiếng Nhật đọc như cũ; gọi thử `speak("Hello", { lang: "en-US" })`
  trong console ra giọng Anh.

### M5. Lớp chuyển đổi thẻ + StudyRunner không gắn tiếng Nhật

- **Làm:**
  - Định nghĩa **dạng thẻ chuẩn** `{ id, term, reading?, meaning, example?,
    exampleMeaning?, audioText? }`. `courses/ja/manifest.js` có `toCard(word)` ánh xạ
    từ `japanese/kanji/romaji` hiện có. **Không đổi tên trường trong JSON tiếng Nhật**
    (đỡ phải sửa Admin, Minna, các tab riêng).
  - `StudyRunner`: chỉ vẽ `Ruby` khi `course.hasReading`; ô gõ đáp án dùng
    `course.matchAnswer` thay `matchesKana`; `lang` của phần chữ học lấy từ
    `course.htmlLang` (font CJK chỉ áp cho `:lang(ja)`).
  - `session.js` (`vocabPool`, `vocabCard`), `searchIndex.js`, `ankiExport.js`, thẻ tự
    tạo (`userdata.js`) đọc qua `toCard`.
- **Lưu ý:** `session.js` nằm trong chunk đầu nên **không** được import manifest có tab
  lazy hoặc JSON. Chia manifest thành phần nhẹ (`toCard`, `matchAnswer`, `decks`) và
  phần nặng (`tabs`).
- **Xong khi:** "Học hôm nay", flashcard từ vựng/kanji/kana, ô gõ đáp án, tìm kiếm toàn
  cục, xuất Anki đều cho kết quả y như trước (so sánh trước/sau trên cùng dữ liệu).

### M6. Deck & menu điều hướng đọc từ manifest

- **Làm:** chuyển `DECKS` (srs.js) và `GROUPS` + bảng tab lazy (App.jsx) sang
  `courses/ja/manifest.js`. `deckMeta()` vẫn giữ fallback cho deck lạ.
- **Xong khi:** menu, Tiến độ, phiên hôm nay không đổi; build không phát sinh chunk lớn.

---

## 6. Giai đoạn 2: Khung tiếng Anh

### M7. Chọn khoá học

- **Làm:** nút chọn khoá học (🇯🇵 / 🇬🇧) trên header hoặc trong `AccountPanel`. Lần đầu
  mở app (chưa có `active_course` **và** chưa có dữ liệu học) thì hiện màn chọn. Người dùng
  cũ (đã có `srs_state_v1`) mặc định `ja`, không bị hỏi. Đặt `document.title` theo
  khoá học. Thương hiệu chung chờ quyết định ở phần 9.
- **Xong khi:** đổi qua lại không mất dữ liệu bên nào; phiên đang dở của mỗi bên vẫn
  "học tiếp" được.

### M8. Schema dữ liệu tiếng Anh + Admin + bộ mẫu

- **Làm:** `src/data/en/vocabulary.json` (chia theo cấp độ nếu lớn), `SCHEMA.md`:

  ```json
  { "id": "en-a1-food-apple", "term": "apple", "ipa": "/ˈæp.əl/", "pos": "noun",
    "meaning": "quả táo", "example": "I eat an apple every day.",
    "exampleMeaning": "Tôi ăn một quả táo mỗi ngày.", "level": "A1", "topic": "food" }
  ```

  **Id theo nội dung** (giống quy ước `contentKey()`), không theo vị trí.
  Thêm `en/...` vào whitelist ở **cả hai chỗ** (`vite.config.ts`, `AdminTab.jsx`).
  Bộ mẫu khoảng 100 từ A1, 4–5 chủ đề, đủ để làm M9.
- **Quy ước nội dung** (tương đương quy ước "không tự bịa tiếng Nhật"): mọi IPA, nghĩa,
  ví dụ phải được người soạn duyệt. Bản nháp do AI gợi ý thì đánh dấu
  `"reviewed": false` và **không hiển thị** cho tới khi duyệt.

### M9. Tab Từ vựng tiếng Anh

- **Làm:** `courses/en/tabs/EnVocabularyTab.jsx`: lọc theo cấp độ/chủ đề, danh sách
  có nút loa, flashcard + chọn nghĩa + gõ từ (qua StudyRunner), tất cả ghi vào deck `vocab`
  của khoá `en`. **Không** cố biến `VocabularyTab.jsx` (697 dòng, nhiều logic kanji)
  thành generic. Tab mới gọn hơn và chỉ dùng lõi.
- `matchAnswer` tiếng Anh: không phân biệt hoa thường, bỏ dấu câu và khoảng trắng thừa,
  chấp nhận dạng viết tắt (`don't` = `do not`), và chấp nhận đáp án thay thế khai báo
  trong dữ liệu (`alt: ["colour"]`).

### M10. Trang chủ & Tiến độ theo khoá học

- **Làm:** `HomeTab`, `ProgressTab`, `sessionExtra.js` đọc deck từ manifest; ẩn các khối
  chỉ của tiếng Nhật (Minna, lộ trình 12 tuần, kanji) khi ở khoá `en`. Streak dùng chung
  (theo quyết định ở phần 9) nên hiển thị như cũ; biểu đồ độ chính xác lọc theo khoá học
  là phần cộng thêm.

---

## 7. Giai đoạn 3: Tính năng đặc thù tiếng Anh

| ID | Nội dung | Tái dùng từ phần tiếng Nhật |
|---|---|---|
| **M11** Phát âm | Bảng IPA 44 âm (bấm nghe từ ví dụ), luyện **cặp âm dễ nhầm** với người Việt: /ɪ/–/iː/ (ship/sheep), /æ/–/e/, /θ/–/s/, âm cuối /t/–/d/–/s/ | Engine cặp âm F3 (`minimal-pairs.json` + `quizgen`) |
| **M12** Động từ bất quy tắc & chia thì | Drill V1→V2→V3, chia theo ngôi/thì | Cùng mẫu drill chia động từ `verb-groups` |
| **M13** Ngữ pháp | Các thì, so sánh, câu điều kiện, bị động… Mỗi chủ điểm có công thức, ví dụ, lỗi thường gặp, cloze | Cùng cấu trúc `GrammarPoint` của Minna (công thức, sai/đúng) |
| **M14** Nghe chép chính tả | TTS đọc câu, người học gõ lại, chấm từng từ | StudyRunner `kind: "type"` + `matchAnswer` |
| **M15** Luyện thi | Bộ đề tự soạn theo dạng TOEIC Part 5/7 hoặc CEFR A2 (theo quyết định ở phần 9), lưu đáp án, sổ câu sai | `examStore.js`, `ExercisesTab` |

Có thể thêm sau: **Shadowing** (F4 trong `plan-tinh-nang-moi.md`). Nếu F4 được làm với
tham số `lang` ngay từ đầu thì tiếng Anh có luôn. Web Speech Recognition nhận tiếng Anh
tốt hơn tiếng Nhật trên hầu hết trình duyệt, nhưng Firefox không hỗ trợ.

---

## 8. Giai đoạn 4: Mở rộng xa hơn (chưa chia mục)

- **Nội dung tải động** (Firestore/Storage hoặc file JSON tĩnh tải theo yêu cầu) khi tổng
  dữ liệu vượt vài MB. Admin trên production với phân quyền. Hiện Admin chỉ chạy khi
  `npm run dev`.
- **Đổi khoá học không cần tải lại trang:** mọi module có `invalidate…()` + đăng ký lại
  listener theo khoá học.
- **Thêm cấp độ** (JLPT N4, CEFR B1) bằng trường `level`. Nếu bước 2.1 làm đúng thì
  không cần sửa lõi.
- **Thống kê gộp nhiều khoá học**, mục tiêu ngày chung.
- **Dời dữ liệu tiếng Nhật vào `src/data/ja/`** cho cân xứng.

---

## 9. Quyết định cần người dùng chốt (điền khi đã quyết)

| # | Câu hỏi | Đề xuất | Đã chốt |
|---|---|---|---|
| Q1 | Tên thương hiệu chung (thay "JLPT N5" ở `index.html`, `manifest.webmanifest`, `sw.js`) | Một tên trung tính về ngôn ngữ; đổi tên PWA sẽ khiến người đã cài thấy tên mới sau lần cập nhật | |
| Q2 | Đổi khoá học có tải lại trang không | **Có** ở giai đoạn đầu (2.4) | |
| Q3 | Streak chung hay riêng từng khoá học | **Chung** (`progress_v1` giữ nguyên); mục tiêu ngày riêng | |
| Q4 | Chuẩn nội dung tiếng Anh | **CEFR A1–A2** trước (nền tảng cho người mới), TOEIC sau | |
| Q5 | Anh-Mỹ hay Anh-Anh (IPA + giọng TTS) | **Anh-Mỹ**: giọng TTS có sẵn trên mọi hệ điều hành; từ điển phát âm mở CMU là Anh-Mỹ | |
| Q6 | Nguồn nội dung & giấy phép | **Tự soạn + duyệt** (giữ quy tắc hiện tại: không dùng dữ liệu buộc ghi công/share-alike như Tatoeba). Nếu chấp nhận ghi công thì cân nhắc NGSL (CC BY-SA). Oxford 3000 chỉ để tham khảo, không chép. CMU Pronouncing Dictionary giấy phép kiểu BSD. **Kiểm tra lại giấy phép từng nguồn trước khi dùng** | |
| Q7 | Ẩn tiếng Anh sau cờ cho tới khi đủ nội dung | **Có** (`?course=en`), mở công khai khi xong M9 + M11 | |

---

## 10. Rủi ro & cách giảm

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Người học tiếng Nhật mất tiến độ | Cao | Giữ nguyên tên khoá (3.1); test "khoá sinh ra = danh sách cũ" (M1); kiểm tra file sao lưu cũ (M3) |
| Tiến độ tiếng Anh bị đè khi máy cũ cập nhật | Cao | Kéo toàn bộ khi `keyset` đổi (3.3, M2) |
| Chunk đầu phình vì import manifest | Trung bình | Tách manifest nhẹ/nặng (M5); kiểm tra kích thước chunk khi build |
| Nội dung tiếng Anh sai (IPA, nghĩa) | Trung bình | Cờ `reviewed`; chỉ hiển thị nội dung đã duyệt (M8) |
| Bản quyền nội dung | Trung bình | Q6; không chép giáo trình. Lưu ý thêm: dữ liệu Minna no Nihongo hiện có cũng là nội dung có bản quyền nếu web mở công khai |
| Sức soạn nội dung không theo kịp code | Cao | Code chỉ là khoảng 30% công sức của giai đoạn 2–3. Lên kế hoạch soạn nội dung song song từ M8 |
| Thị trường tiếng Anh cạnh tranh mạnh | — | Khác biệt bằng giải thích tiếng Việt, lộ trình theo bài, một tài khoản học nhiều ngôn ngữ, offline miễn phí |
