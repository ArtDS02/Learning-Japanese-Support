/* JLPT N5 — Service worker cho phép học offline.
 *
 * Viết tay, không phụ thuộc plugin nào. Vì Vite băm tên file asset khi build
 * (index-abc123.js) nên không precache theo danh sách cố định được; ở đây dùng:
 *   · navigation  → network-first, offline thì trả index.html đã cache (SPA shell)
 *   · asset same-origin → cache-first (file đã băm tên nên không bao giờ "cũ")
 * Bump CACHE_VERSION khi muốn dọn cache cũ.
 */

const CACHE_VERSION = "jlpt-n5-v1";
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
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(SHELL, copy)).catch(() => undefined);
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
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(request, copy)).catch(() => undefined);
          }
          return res;
        })
        .catch(() => hit || Response.error());
    }),
  );
});
