// Danh sách khoá localStorage mà app sở hữu, và cách từng khoá được sao lưu /
// đồng bộ. File thuần (không import gì) để cả app lẫn test Node dùng chung.

// Danh sách khoá app sở hữu. Thêm tính năng mới nhớ khai báo ở đây.
export const OWNED_KEYS = [
  "srs_state_v1", // tiến độ SRS mọi deck
  "progress_v1", // streak + hoạt động ngày + độ chính xác
  "exam_state_v1", // đáp án đang làm dở của từng đề
  "exam_history_v1", // lịch sử thi thử
  "notes_v1", // ghi chú cá nhân
  "custom_cards_v1", // thẻ tự tạo
  "settings_v1", // mục tiêu ngày, nhắc học…
  "tts_cfg_v1", // cấu hình giọng đọc
  "vocab_marked_ids", // từ đã đánh dấu
  "kanji_marked", // kanji đã đánh dấu
  "kanji_learned", // (cũ) kanji đánh dấu tay — giữ để không mất dữ liệu người dùng
  "kana:quiz:cfg", // cấu hình quiz kana
  "minna1_v1", // Minna no Nihongo 1: tiến độ từng bài, câu sai, romaji/furigana
  "studyplan_checks_v1", // checklist lộ trình 12 tuần
  "run_progress_v1", // phiên học đang dở (học tiếp chỗ cũ)
  "daily_new_v1", // số thẻ mới đã mở trong ngày (giới hạn thẻ mới/ngày)
  "n5.numbers.counterView", // cách xem bảng bộ đếm
  "migrations_done_v1", // cờ di trú dữ liệu — mang theo để không di trú lại
  "swipe_hint_seen_v1", // đã xem gợi ý vuốt thẻ (để máy mới khỏi hiện lại)
  "jlpt-active-tab",
  "jlpt-nav-last", // tab con mở lần trước của từng nhóm trên thanh điều hướng
];

// Khoá lưu CHUỖI THUẦN (không phải JSON) — phải ghi lại đúng dạng chuỗi, nếu
// không "home" thành "\"home\"" và app không nhận ra nữa.
export const RAW_STRING_KEYS = new Set(["jlpt-active-tab"]);

// Khoá KHÔNG đồng bộ lên tài khoản — chỉ có nghĩa trên từng máy.
//   · jlpt-active-tab     tab đang mở là trạng thái giao diện của máy đó
//   · tts_cfg_v1          danh sách giọng đọc khác nhau giữa điện thoại và PC
//   · run_progress_v1     ghi sau MỖI lượt chấm → tốn lượt ghi; SRS mới là nguồn sự thật
//   · migrations_done_v1  di trú dữ liệu chạy riêng trên từng máy
export const SYNC_EXCLUDE = new Set([
  "jlpt-active-tab",
  "jlpt-nav-last",
  "tts_cfg_v1",
  "run_progress_v1",
  "migrations_done_v1",
]);

export const SYNCED_KEYS = OWNED_KEYS.filter((k) => !SYNC_EXCLUDE.has(k));

// Khoá "cộng dồn": hai máy cùng sửa thì GỘP bằng mergeValue (không mất lượt ôn
// nào). Mọi khoá còn lại dùng bản sửa sau cùng — gộp kiểu hợp mảng sẽ làm từ đã
// bỏ đánh dấu / thẻ đã xoá trên máy này bị máy kia "hồi sinh".
export const MERGEABLE_KEYS = new Set([
  "srs_state_v1",
  "progress_v1",
  "exam_history_v1",
  "minna1_v1",
]);
