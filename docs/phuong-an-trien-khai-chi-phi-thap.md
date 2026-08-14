# Phương án triển khai trang tự học N5 với chi phí gần như bằng 0

> Phân tích dựa trên bài blog *"Use Case: Engineering Blog với chi phí gần như bằng 0"* (Builder — Classmethod Đà Nẵng) và áp dụng vào chính dự án `n5-learning-web` này.
>
> Ngày soạn: 2026-07-17

---

## 1. Kết luận nhanh (TL;DR)

**Có, hướng đi trong bài blog rất phù hợp — nhưng bạn chỉ cần đúng MỘT nửa của nó, và nửa đó với bạn còn đơn giản hơn cả Builder.**

- Kiến trúc Builder gồm 2 nửa: **luồng đọc** (S3 + CloudFront) và **luồng ghi** (Auth0 + API Gateway + Lambda + DynamoDB + SQS + dashboard WYSIWYG).
- App của bạn **đã là static hoàn toàn**, không có backend/DB/auth. Nội dung là các file JSON trong repo (`src/data/*.json`), do chính bạn soạn rồi `git push`.
- ⇒ **Toàn bộ nửa "luồng ghi"** (phần phức tạp & tốn công nhất của Builder, sinh ra chỉ để tác giả không-rành-Git đăng bài qua giao diện) — **bạn KHÔNG cần.**
- ⇒ Bạn chỉ cần nửa "luồng đọc": build ra static rồi đẩy lên CDN. Chi phí ~0đ, gần như không phải vận hành.

**Khuyến nghị:** dùng một **static host có sẵn CI/CD** (Cloudflare Pages / GitHub Pages / Netlify) thay vì tự dựng S3 + CloudFront. Cùng kết quả (CDN toàn cầu, HTTPS free, $0), nhưng tiết kiệm cho bạn ~5–7 dịch vụ AWS phải cấu hình và bảo trì.

---

## 2. Đối chiếu: kiến trúc Builder vs nhu cầu thực tế của app này

| Thành phần trong bài blog | Mục đích trong Builder | App N5 của bạn có cần? |
|---|---|---|
| **S3 + CloudFront** (luồng đọc) | Phục vụ HTML/asset tĩnh qua CDN | ✅ **Cần** — đây chính là thứ bạn muốn |
| **GitHub Actions build** | Tự động build & deploy static | ✅ **Cần** — tự động hoá `vite build` + deploy |
| Route53 + ACM (SSL) | Domain + chứng chỉ HTTPS | ⚠️ Tuỳ chọn — chỉ khi bạn muốn domain riêng |
| Auth0 (xác thực tác giả) | Đăng nhập cho người viết bài | ❌ **Không cần** — không có nhiều tác giả |
| API Gateway + Lambda (luồng ghi) | Nhận request lưu bài từ dashboard | ❌ **Không cần** — bạn sửa JSON trong repo |
| DynamoDB (2 bảng) | Lưu nháp & bài đã xuất bản | ❌ **Không cần** — dữ liệu nằm trong Git |
| SQS + build bất đồng bộ | Tách việc build khỏi thao tác tác giả | ❌ **Không cần** — build ngay khi push là đủ |
| Dashboard WYSIWYG | Giao diện soạn bài cho non-dev | ❌ **Không cần** — bạn là dev, sửa code trực tiếp |

**Điểm mấu chốt:** Builder phải xây dựng cả một hệ CMS serverless vì tác giả của họ đăng bài qua giao diện, không đụng vào Git. Còn với bạn, "hệ thống soạn thảo" chính là **editor + Git** — vốn đã miễn phí và bạn đã dùng hằng ngày. Nghịch lý thú vị: mô hình Jekyll/Hugo mà bài blog coi là "nút thắt cổ chai" (buộc phải rành Git) lại chính là điểm **mạnh** trong trường hợp của bạn.

---

## 3. Hiện trạng dự án (để làm căn cứ)

- **Stack:** React 19 + Vite + TypeScript, SPA thuần client-side.
- **Routing:** không dùng router; chuyển tab bằng `useState` + `localStorage` (`src/App.jsx`). ⇒ chỉ có **một** `index.html`, không có deep-link route ⇒ hosting cực kỳ đơn giản, không cần cấu hình SPA fallback phức tạp.
- **Dữ liệu:** `src/data/*.json` (grammar, kana, kanji, numbers, vocabulary, jlpt-sets, tips-exercises) — ~824K, bundle thẳng vào app.
- **Build output:** `dist/` (~840K) — `index.html` + `assets/` + `favicon.svg` + `icons.svg`. Tất cả tĩnh.
- **Backend:** không có. Không DB, không API, không auth.

⇒ Đây là **trường hợp static-hosting đơn giản nhất có thể**. Không cần bất kỳ luồng động nào.

---

## 4. Hai phương án triển khai

### 🟢 Phương án A — Managed static host (khuyến nghị)

Dùng nền tảng static hosting có sẵn CI/CD. Đơn giản nhất, đúng tinh thần "chi phí ~0, vận hành ~0" của bài blog nhưng bỏ được toàn bộ việc ghép nối AWS.

**Lựa chọn (đều free, đều có CDN toàn cầu + HTTPS tự động + git-push-to-deploy):**

| Nền tảng | Ưu điểm | Lưu ý |
|---|---|---|
| **Cloudflare Pages** | CDN mạnh nhất, băng thông không giới hạn, build free 500 lần/tháng | Khuyến nghị hàng đầu |
| **GitHub Pages** | Ngay trong GitHub, không cần tài khoản mới | Không tự set cache header linh hoạt; cần cấu hình `base` của Vite nếu deploy vào `user.github.io/repo` |
| **Netlify / Vercel** | DX tốt, preview deploy cho mỗi PR | Có giới hạn băng thông ở gói free (100GB/tháng) — thừa sức cho app học tập |

**Cách hoạt động:** kết nối repo → mỗi lần push lên `main`, nền tảng tự chạy `npm run build` → deploy `dist/` lên CDN. Không cần viết workflow, không cần AWS credentials.

**Các bước (ví dụ Cloudflare Pages):**
1. Đăng nhập Cloudflare → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Chọn repo, cấu hình build:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`
3. Save & Deploy. Xong — mỗi push lên `main` tự deploy.
4. (Tuỳ chọn) Gắn domain riêng ở tab **Custom domains**; HTTPS tự cấp.

---

### 🔵 Phương án B — Bám sát bài blog: AWS S3 + CloudFront

Nếu bạn muốn học/thực hành đúng kiến trúc AWS như bài blog (hoặc muốn ở trong hệ sinh thái AWS), đây là bản rút gọn — **chỉ lấy nửa read-path**:

```
  git push (main)
        │
        ▼
  GitHub Actions ──► npm run build ──► aws s3 sync dist/ s3://<bucket>
        │                                        │
        │                                        ▼
        └──────────────► aws cloudfront create-invalidation (xoá cache)
                                                 │
                                                 ▼
                          CloudFront (CDN) ──► người dùng
```

**Dịch vụ cần dùng:** S3 (host static), CloudFront (CDN + HTTPS), ACM (chứng chỉ SSL, free), Route53 (nếu dùng domain, ~0.5 USD/tháng/hosted zone), GitHub Actions (CI, free tier 2.000 phút/tháng).

**Các bước tóm tắt:**
1. Tạo **S3 bucket** (private), bật static website / dùng OAC cho CloudFront.
2. Tạo **CloudFront distribution** trỏ về bucket; cấu hình **Default root object** = `index.html`.
3. Thêm **custom error response**: 403/404 → trả `/index.html` (200) để SPA hoạt động (dù app hiện tại 1 page nên ít cần, nhưng nên có để an toàn khi mở rộng route).
4. Xin chứng chỉ **ACM** (region `us-east-1` cho CloudFront), gắn domain.
5. Viết **GitHub Actions workflow** dùng **OIDC** (không lưu access key tĩnh — an toàn hơn) để `s3 sync` + `cloudfront create-invalidation`.

> **Đánh giá:** Phương án B mạnh và "đúng bài" nhưng cần cấu hình 4–5 dịch vụ AWS + IAM/OIDC. Với một app học tập cá nhân, đây là công sức thừa so với Phương án A trừ khi mục tiêu là *thực hành AWS*.

---

## 5. Ước tính chi phí

| Hạng mục | Phương án A (Cloudflare/GitHub Pages) | Phương án B (AWS) |
|---|---|---|
| Hosting + CDN + HTTPS | **0đ** | ~0 USD (trong Free Tier CloudFront: 1TB + 10 triệu req/tháng) |
| CI/CD build | **0đ** | 0 USD (GitHub Actions free 2.000 phút/tháng) |
| Domain riêng (tuỳ chọn) | ~10–15 USD/năm tiền domain | + ~0.5 USD/tháng (Route53 hosted zone) + tiền domain |
| Vận hành/bảo trì | Gần như 0 | Thấp, nhưng cần theo dõi IAM/cache |

Với lượng truy cập của một app học tập cá nhân, **cả hai phương án thực tế đều ~0đ/tháng** (chưa tính domain). Khác biệt chính là **công sức thiết lập & bảo trì**, không phải tiền.

---

## 6. Một lưu ý quan trọng: SEO (điểm app bạn KHÁC Builder)

Bài blog nhấn mạnh SEO tốt vì Builder **pre-render bài viết thành HTML tĩnh** (bot đọc được ngay, không cần chạy JS).

App của bạn hiện là **SPA client-rendered**: `index.html` chỉ có `<div id="root">` rỗng, mọi nội dung do JS render sau. ⇒ Bot tìm kiếm sẽ thấy trang gần như trống trước khi JS chạy.

- Nếu app chỉ để **bạn/nhóm bạn tự học** (không cần Google index) → **bỏ qua**, không vấn đề gì.
- Nếu sau này muốn được tìm thấy trên Google → cân nhắc **pre-render / SSG**. Với Vite có thể dùng `vite-plugin-ssr` / `vite-plugin-prerender`, hoặc chuyển sang framework SSG. Đây là việc riêng, **không liên quan** đến việc chọn nơi host.

---

## 7. Checklist triển khai (khuyến nghị đi Phương án A)

- [ ] Xác nhận `npm run build` chạy sạch, `dist/` mở được bằng `npm run preview`.
- [ ] Chọn nền tảng (đề xuất: **Cloudflare Pages**).
- [ ] Kết nối repo Git, cấu hình build command `npm run build`, output `dist`.
- [ ] Kiểm tra bản deploy đầu tiên trên URL tạm của nền tảng (`*.pages.dev` / `*.github.io`).
- [ ] (Tuỳ chọn) Gắn domain riêng + verify HTTPS.
- [ ] Kiểm tra `localStorage` (tab đang chọn) & asset (`icons.svg`, `favicon.svg`) load đúng trên production.
- [ ] (Nếu cần SEO về sau) Lập kế hoạch pre-render — xem mục 6.

---

## 8. Dashboard admin để sửa nội dung — ĐÃ CHỐT: Tầng 1 (Git-based CMS)

> ✅ **Quyết định:** dùng **Tầng 1 — Git-based CMS** cho dashboard admin. Đặc tả chức năng & chi tiết triển khai nằm trong tài liệu riêng: **[tai-lieu-chuc-nang-admin-cms.md](./tai-lieu-chuc-nang-admin-cms.md)**.
>
> Phần dưới đây giữ lại bối cảnh so sánh 3 tầng để lý giải vì sao chọn Tầng 1.

> Khi bạn thêm dashboard cho admin thêm/chỉnh sửa kiến thức từng tab, bạn đang **thêm lại đúng "luồng ghi"** mà ở mục 2 ta đã cố tình bỏ. Nhưng bạn KHÔNG phải nhảy thẳng lên full-Builder — có một dải lựa chọn từ nhẹ đến nặng.

### 8.1. Ba câu hỏi quyết định kiến trúc

Trả lời 3 câu này trước, chúng quyết định bạn nên đi tầng nào:

1. **Sửa xong cần hiện NGAY, hay chờ rebuild ~1–3 phút được?**
   Builder chấp nhận chờ ~3 phút (build bất đồng bộ). App học tập thường **chờ được** ⇒ mở ra các lựa chọn tĩnh & rẻ. Nếu bắt buộc hiện tức thì ⇒ phải đọc dữ liệu động lúc runtime (Tầng 2/3).
2. **"Database" nằm ở đâu — vẫn trong Git, hay DB thật?**
   Ít admin, nội dung sửa không quá thường xuyên ⇒ **giữ trong Git vẫn ổn** (Tầng 1). Nhiều bản ghi, quan hệ phức tạp, sửa liên tục ⇒ cần DB thật (Tầng 2/3).
3. **Ai là người sửa?**
   Chỉ mình bạn (dev) ⇒ nhẹ nhất. Có cộng tác viên non-dev ⇒ cần UI thân thiện + đăng nhập (auth).

### 8.2. Ba tầng lựa chọn

#### 🟢 Tầng 1 — Git-based CMS (khuyến nghị mặc định)

Ví dụ: **Decap CMS** (trước là Netlify CMS), **Sveltia CMS** (bản viết lại hiện đại, nhanh), **TinaCMS**.

- Bạn được **dashboard admin dạng form**, đăng nhập bằng **GitHub OAuth**.
- Khi Save → CMS **commit thẳng vào file JSON trong repo** → CI (Phương án A) tự rebuild + deploy.
- **"Database" = chính Git repo. "Build trigger" = git commit. Không server, không DB, vẫn $0.**

```
Admin ──► CMS dashboard (form) ──► commit JSON vào repo
                                          │
                                          ▼
                              CI build (Cloudflare Pages) ──► CDN
```

Đây chính là **UX của Builder nhưng ở ~1/10 độ phức tạp**, giữ nguyên tinh thần "chi phí ~0, vận hành ~0".

**Lưu ý thực tế:** dữ liệu hiện tại là **mảng lớn nằm trong 1 file JSON mỗi tab** (`vocabulary.json`, `kanji.json`…). Git-CMS edit mượt nhất khi mỗi mục là một bản ghi/tệp trong một *collection*. Nên cân nhắc tách cấu trúc dữ liệu (ví dụ mỗi từ vựng là 1 entry) trước khi gắn CMS — đây là công việc chuẩn bị chính.

#### 🟡 Tầng 2 — Headless CMS / BaaS quản lý sẵn

Ví dụ: **Supabase** / **Firebase** (BaaS), **Sanity** / **Contentful** / **Strapi** / **Directus** (headless CMS).

- Có ngay **admin UI + auth + database + API** ở free tier — **không phải viết backend.**
- App có thể lấy dữ liệu **lúc build** (giữ site tĩnh, cần rebuild khi đổi nội dung) hoặc **lúc runtime** (fetch trực tiếp — sửa là hiện ngay, nhưng app không còn thuần-tĩnh).
- Điểm giữa tốt khi mô hình "Git làm DB" bắt đầu chật: nhiều bản ghi, cần tìm kiếm/lọc, nhiều người sửa.

> Với app này, **Supabase** đáng cân nhắc nhất ở tầng này: có sẵn table editor (đóng vai admin thô), Auth, và API tự sinh — dựng nhanh mà không viết dòng backend nào.

#### 🔵 Tầng 3 — Tự dựng serverless đúng như Builder

API Gateway + Lambda + DynamoDB + Auth0/Cognito + trigger rebuild (SQS/GitHub Actions) — **chính là kiến trúc "luồng ghi" của bài blog.**

**Chỉ nên chọn khi:** bạn thực sự vượt quá Tầng 1 & 2 (nhiều editor, quan hệ dữ liệu phức tạp, cần logic nghiệp vụ riêng, muốn toàn quyền kiểm soát) — hoặc mục tiêu là *thực hành/chứng minh năng lực AWS* như Classmethod đã làm.

### 8.3. Bảng chọn nhanh

| Nhu cầu của bạn | Nên chọn |
|---|---|
| Chỉ mình bạn (hoặc vài admin) sửa, chờ rebuild vài phút OK | 🟢 **Tầng 1 — Git-based CMS** |
| Nhiều người sửa, cần cập nhật tức thì, cần tìm kiếm/lọc dữ liệu | 🟡 **Tầng 2 — Supabase/Headless CMS** |
| Cần logic nghiệp vụ phức tạp, hoặc muốn thực hành AWS đúng bài | 🔵 **Tầng 3 — Serverless tự dựng** |

### 8.4. Khuyến nghị & quyết định

✅ **Đã chốt: đi Tầng 1 (Git-based CMS).** Nó cho bạn đúng thứ bạn mô tả — *"admin thêm/sửa kiến thức từng tab"* — mà **không phá vỡ** chi phí ~0đ và mô hình static hosting ở Phương án A. Đây là bước nâng cấp nhỏ nhất giải quyết đúng bài toán.

→ **Chi tiết triển khai:** xem [tai-lieu-chuc-nang-admin-cms.md](./tai-lieu-chuc-nang-admin-cms.md) (công cụ, luồng ghi, đặc tả collection từng tab, các bước, rủi ro, nghiệm thu).

Chỉ nâng lên Tầng 2 khi gặp một trong các dấu hiệu: có nhiều cộng tác viên, cần nội dung cập nhật tức thì không qua rebuild, hoặc dữ liệu lớn/quan hệ phức tạp khiến JSON-trong-Git trở nên khó quản. Và chỉ chạm tới Tầng 3 khi thực sự cần — hoặc khi bạn *muốn* xây nó để học.

> **Lưu ý về auth:** mọi tầng đều yêu cầu đăng nhập cho trang admin (GitHub OAuth ở Tầng 1; Supabase/Firebase/Auth0 ở Tầng 2/3). Đây là phần bắt buộc để bảo vệ quyền ghi — đừng để trang admin công khai không xác thực.

---

## 9. Tóm tắt một câu

> Bài blog đúng hướng cho bạn, nhưng bạn nên **chỉ lấy phần "static + CDN"** và **bỏ toàn bộ phần CMS serverless** (Lambda/DynamoDB/Auth0/SQS) — vì nội dung của bạn sống trong Git chứ không qua giao diện. Cách nhanh và rẻ nhất để đạt đúng kết quả bài blog hướng tới là đẩy `dist/` lên một static host miễn phí như **Cloudflare Pages**.
