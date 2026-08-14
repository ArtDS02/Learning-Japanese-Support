import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { runMigrations } from './lib/migrate'
import './styles/base.css'
// modal.css định nghĩa vỏ .ovl; các file sau nó chỉ chỉnh phần trang trí riêng
// của từng hộp thoại, nên phải nạp trước ui.css và trước CSS của các tab.
import './styles/common/modal.css'
// ui.css phải nằm SAU base.css để thắng cascade (xem ghi chú trong file).
import './styles/common/ui.css'

// Chuyển dữ liệu người dùng sang mô hình tiến độ mới (nếu cần) trước khi render.
runMigrations()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Service worker: cho phép học offline (bản build production).
// Dev không đăng ký để không cache mất HMR.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* offline là tính năng phụ — thất bại thì app vẫn chạy bình thường */
    })
  })
}
