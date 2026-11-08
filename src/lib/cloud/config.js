// Cấu hình Firebase đọc từ biến môi trường lúc build (.env.local — xem .env.example).
// Thiếu bất kỳ giá trị nào thì tính năng đăng nhập/đồng bộ ẩn hẳn, app chạy
// offline như trước.
//
// VITE_FIREBASE_AUTH_DOMAIN nên là chính tên miền app đang chạy trên Firebase
// Hosting (japanese-learning-23d11.web.app): Hosting tự phục vụ /__/auth/handler
// nên trang đăng nhập cùng origin với app. Khác origin (…firebaseapp.com) thì
// Safari chặn lưu trữ bên thứ ba và làm hỏng đăng nhập kiểu chuyển trang — đúng
// trường hợp PWA trên iOS. Đổi sang .web.app cần thêm
// https://japanese-learning-23d11.web.app/__/auth/handler vào "Authorized redirect
// URIs" của OAuth client trong Google Cloud Console (xem docs/plan-dang-nhap-dong-bo.md).

const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const cloudEnabled = Object.values(firebaseConfig).every(
  (v) => typeof v === "string" && v.trim() !== "",
);

/** Dev: nối tới Firebase Emulator (npm run emulators) thay vì project thật. */
export const useEmulator = env.DEV && env.VITE_USE_EMULATOR === "1";
