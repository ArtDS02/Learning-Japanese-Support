/* JLPT N5 — Service worker cho phép học offline.
 *
 * Viết tay, không phụ thuộc plugin nào. Vì Vite băm tên file asset khi build
 * (index-abc123.js) nên không precache theo danh sách cố định được; ở đây dùng:
 *   · navigation  → network-first, offline thì trả index.html đã cache (SPA shell)
 *   · asset same-origin → cache-first (file đã băm tên nên không bao giờ "cũ")
 *
 * CACHE_VERSION được plugin trong vite.config.ts thay bằng mã build mỗi lần
 * `npm run build` → bản mới kích hoạt là dọn sạch cache của bản cũ (trước đây
 * phiên bản cố định nên cache phình mãi qua mỗi lần deploy).
 */

const CACHE_VERSION = "jlpt-n5-__BUILD_ID__";
const SHELL = "./index.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll([SHELL, "./"]))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") self.skipWaiting();
});

/**
 * Chỉ cache phản hồi THẬT của asset. Hosting kiểu SPA (Firebase rewrite "**")
 * trả index.html với mã 200 cho file không tồn tại — chunk của bản cũ đã bị xoá
 * sau deploy chẳng hạn. Cache nhầm cái HTML đó thay cho file JS là tab đó hỏng
 * vĩnh viễn, nên phải loại theo Content-Type.
 */
function cacheable(request, res) {
  if (!res || res.status !== 200 || res.type !== "basic") return false;
  const type = res.headers.get("content-type") || "";
  if (type.includes("text/html")) return false;
  if (/\.(m?js)$/.test(new URL(request.url).pathname) && !/javascript/.test(type)) return false;
  return true;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // font Google… để trình duyệt tự xử lý

  // Điều hướng trang: ưu tiên mạng, mất mạng thì dùng shell đã cache.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(SHELL, copy)).catch(() => undefined);
          }
          return res;
        })
        .catch(() => caches.match(SHELL).then((r) => r || Response.error())),
    );
    return;
  }

  // Asset: có trong cache thì trả ngay, đồng thời nạp về cache khi lấy từ mạng.
  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request)
        .then((res) => {
          if (cacheable(request, res)) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(request, copy)).catch(() => undefined);
          }
          return res;
        })
        .catch(() => Response.error());
    }),
  );
});
