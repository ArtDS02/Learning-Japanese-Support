# Data — Minna no Nihongo I (Bài 1–25)

Mỗi bài là một file `lesson-XX.json` (XX = 01…25). App nạp từng file theo nhu cầu
(`import.meta.glob` lazy trong `src/lib/minna.js`), nên thêm bài 26+ chỉ cần thêm
file `lesson-26.json` và một dòng trong `index.json`.

## Lesson

```jsonc
{
  "lesson": 1,
  "title": "Giới thiệu bản thân",          // tên bài (tiếng Việt, ngắn)
  "titleJp": "はじめまして",                 // tên/chủ đề tiếng Nhật
  "topic": "Chào hỏi, nghề nghiệp, quốc tịch",
  "description": "1–2 câu: học xong bài này làm được gì.",
  "objectives": ["Mục tiêu 1", "..."],
  "keyPoints": ["Kiến thức cần nhớ 1", "..."],
  "grammarPoints": [GrammarPoint],
  "quickReview": [{ "pattern": "N1 は N2 です", "meaning": "N1 là N2", "example": "わたしは 学生です。" }],
  "exercises": [Exercise],
  "meta": { "jlpt": "N5", "vocabLesson": 1 }  // chỗ mở rộng: audio, kanji, flashcard…
}
```

## GrammarPoint

```jsonc
{
  "id": "L01-G1",                 // duy nhất toàn bộ data: L<bài 2 chữ số>-G<n>
  "title": "N1 は N2 です",
  "meaning": "N1 là N2",
  "why": "Tại sao cần ngữ pháp này (1–2 câu, tiếng Việt đơn giản).",
  "when": ["Tình huống dùng 1", "..."],
  "formula": "N1 は N2 です",
  "parts": [{ "part": "は", "role": "vai trò của thành phần" }],
  "memoryTip": { "emoji": "🗣️", "hook": "Câu nhớ cực ngắn", "meaning": "→ ý nghĩa thật" },  // hoặc null
  "keyword": "Từ khoá ngắn khi không có mẹo tự nhiên",   // tuỳ chọn
  "examples": [Example],          // ≥ 3
  "mistakes": [{ "wrong": "câu sai", "right": "câu đúng", "explain": "vì sao" }],  // wrong/right tuỳ chọn
  "extra": [{ "title": "📌 Kiến thức bổ sung", "text": "...", "examples": [Example] }]  // tuỳ chọn
}
```

## Example

```jsonc
{
  "jp": "わたしは 学生です。",
  "romaji": "Watashi wa gakusei desu.",
  "vi": "Tôi là sinh viên.",
  "context": "Trường học",                       // tuỳ chọn — tình huống
  "breakdown": [{ "jp": "わたし", "vi": "tôi" }], // tuỳ chọn — giải thích từng phần
  "note": "Giải thích thêm (tuỳ chọn)"
}
```

Hội thoại hỏi–đáp viết trong một ví dụ, ngăn bằng ` …` : `"jp": "学生ですか。 …はい、学生です。"`.

## Exercise

Trường chung: `id` (`L01-E01`), `type`, `grammarPoint` (id của GrammarPoint), `question`
(đề bài tiếng Việt), `explanation` (giải thích đáp án, ngắn gọn), và tuỳ loại:
`jp` (câu tiếng Nhật hiển thị), `romaji`, `vi` (nghĩa, hiện sau khi trả lời).

| type        | Hiển thị                               | Trường riêng                         |
|-------------|----------------------------------------|--------------------------------------|
| `choice`    | Chọn đáp án đúng                        | `options[]`, `answer`                |
| `particle`  | Chọn trợ từ điền vào `＿＿` trong `jp`   | `options[]`, `answer`                |
| `fill`      | Gõ vào `＿＿` (kana hoặc romaji)         | `answer`, `accept[]?`, `hint?`       |
| `order`     | Sắp xếp các mảnh thành câu             | `tokens[]` (đúng thứ tự), `accept[][]?` |
| `jp-vi`     | Dịch câu `jp` sang tiếng Việt           | `options[]`, `answer`                |
| `vi-jp`     | Dịch câu `vi` sang tiếng Nhật           | `options[]`, `answer`                |
| `pattern`   | Chọn mẫu ngữ pháp phù hợp              | `options[]`, `answer`                |
| `identify`  | Câu `jp` dùng grammar point nào?        | `options[]`, `answer`                |
| `fix`       | Câu `jp` bị sai → chọn câu sửa đúng     | `options[]`, `answer`                |
| `situation` | Tình huống thực tế → chọn câu nói đúng  | `options[]`, `answer`                |

Quy tắc: `answer` phải nằm trong `options`; `order` không cần `options` (mảnh được xáo khi
chạy); `fill` chỉ khoét MỘT chỗ `＿＿`. Thứ tự `options` không quan trọng (app tự xáo).

## Quy ước Romaji

Hepburn, dấu macron cho nguyên âm dài (`ō`, `ū`, `ā`; `えい` → `ei`, `いい` → `ii`),
trợ từ は → `wa`, へ → `e`, を → `o`; `ん` trước nguyên âm/`y` → `n'`; tên riêng viết hoa,
hậu tố nối gạch: `Mirā-san`, `Nihon-jin`, `nan-ji`. Viết hoa chữ đầu câu, có dấu câu.
