# Tài liệu chức năng: Dashboard Admin bằng Git-based CMS

> Đặc tả chức năng & chi tiết triển khai cho việc thêm **dashboard quản trị** cho phép admin thêm/chỉnh sửa kiến thức của từng tab (kana, kanji, vocabulary, grammar, numbers, tips, study plan, JLPT sets).
>
> Phương án đã chốt: **Tầng 1 — Git-based CMS** (xem [phuong-an-trien-khai-chi-phi-thap.md](./phuong-an-trien-khai-chi-phi-thap.md), mục 8).
>
> Ngày soạn: 2026-07-17

---

## 1. Mục tiêu & phạm vi

**Mục tiêu:** cung cấp cho admin một giao diện web dạng form để **thêm / sửa / xoá** nội dung học tập của từng tab, mà **không cần biết code hay Git**, đồng thời **giữ nguyên** mô hình static hosting chi phí ~0đ.

**Trong phạm vi:**
- Trang admin (`/admin`) chạy ngay trong chính site tĩnh.
- Đăng nhập bằng GitHub OAuth.
- CRUD nội dung cho tất cả các tab dựa trên `src/data/*.json`.
- Sau khi lưu: tự động commit → CI rebuild → nội dung mới lên CDN.

**Ngoài phạm vi (không làm ở giai đoạn này):**
- Không có backend server, không database, không Lambda/DynamoDB.
- Không phân quyền theo vai trò chi tiết (chỉ có "là collaborator repo = có quyền admin").
- Không cập nhật tức thì không-qua-rebuild (chấp nhận độ trễ build ~1–3 phút, giống Builder).

---

## 2. Quyết định kiến trúc

| Hạng mục | Lựa chọn | Lý do |
|---|---|---|
| Tầng giải pháp | **Git-based CMS** | Giữ "database = Git repo", $0, không server |
| Công cụ CMS | **Sveltia CMS** (thay thế drop-in cho Decap CMS) | Cùng định dạng `config.yml` với Decap nhưng UI nhanh hơn, i18n tốt, đang được bảo trì tích cực, hợp cặp GitHub + Cloudflare |
| Host | **Cloudflare Pages** (theo Phương án A) | CDN + CI/CD sẵn, $0 |
| Repo backend | **GitHub** | CMS commit trực tiếp qua GitHub API |
| Xác thực | **GitHub OAuth** qua **OAuth proxy** (Cloudflare Worker) | Cloudflare Pages không có sẵn Identity như Netlify ⇒ cần 1 proxy nhỏ (miễn phí) |

> **Ghi chú:** Nếu sau này đổi host sang **Netlify**, có thể dùng **Netlify Identity + Git Gateway** để bỏ luôn OAuth proxy. Nhưng vì ta đã chốt Cloudflare Pages, tài liệu này đi theo hướng OAuth proxy.
>
> **Phương án thay thế công cụ:** **Decap CMS** (cùng `config.yml`) hoặc **TinaCMS** (UI đẹp hơn nhưng có phụ thuộc dịch vụ cloud riêng). Cấu hình trong tài liệu này tương thích cả Decap lẫn Sveltia.

---

## 3. Kiến trúc luồng ghi (end-to-end)

```
   Admin (trình duyệt)
        │  1. đăng nhập
        ▼
   /admin  ──►  Sveltia/Decap CMS (chạy client-side trong site tĩnh)
        │
        │  2. OAuth: xin quyền GitHub
        ▼
   OAuth proxy (Cloudflare Worker)  ◄──►  GitHub OAuth
        │
        │  3. có token → CMS thao tác repo qua GitHub API
        ▼
   Admin sửa form → Save/Publish
        │
        │  4. CMS tạo commit (hoặc Pull Request) vào repo
        ▼
   GitHub repo (src/data/*.json thay đổi)
        │
        │  5. push lên main → webhook
        ▼
   Cloudflare Pages CI  ──►  npm run build  ──►  deploy dist/ lên CDN
        │
        │  ~1–3 phút
        ▼
   Nội dung mới hiển thị cho người học
```

**Đối chiếu với Builder:** đây đúng là "luồng ghi" của Builder, nhưng mỗi thành phần được thay bằng bản miễn phí/không-vận-hành:

| Builder | Bản Git-CMS của bạn |
|---|---|
| Dashboard WYSIWYG tự viết | CMS admin dựng sẵn (Sveltia/Decap) |
| Auth0 | GitHub OAuth |
| API Gateway + Lambda | GitHub API (CMS gọi trực tiếp) |
| DynamoDB | File JSON trong Git repo |
| SQS + build bất đồng bộ | Webhook → Cloudflare Pages CI |

---

## 4. Các thành phần cần thêm vào dự án

1. **Trang admin tĩnh** — thư mục `public/admin/` gồm:
   - `public/admin/index.html` — nạp CMS (script Sveltia/Decap).
   - `public/admin/config.yml` — khai báo backend + toàn bộ collection (xem mục 6–7).
   > Đặt trong `public/` để Vite copy nguyên trạng vào `dist/admin/`, truy cập tại `https://<site>/admin/`.

2. **OAuth proxy** — 1 Cloudflare Worker nhỏ (dùng dự án có sẵn như `sveltia-cms-auth` hoặc `decap-proxy`), cấu hình `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`.

3. **GitHub OAuth App** — tạo trong GitHub Developer Settings, callback trỏ về OAuth proxy.

4. *(Giai đoạn 2 — tuỳ chọn)* **Script assembly** — gộp nhiều file nhỏ thành định dạng JSON mà app đang đọc (xem mục 5).

> **App React gần như không phải sửa** ở Giai đoạn 1 — CMS chỉ ghi lại đúng các file `src/data/*.json` mà app đang import.

---

## 5. Chiến lược dữ liệu (điểm kỹ thuật quan trọng nhất)

Dữ liệu hiện tại không đồng nhất, nên chia làm **2 giai đoạn**:

### Giai đoạn 1 — File collections trên chính JSON hiện có (làm trước, nhanh nhất)

Trỏ CMS thẳng vào từng file `src/data/*.json`, khai báo cấu trúc bằng **widget `object` + `list` lồng nhau**.

- ✅ **Ưu:** không migrate dữ liệu, **app không đổi một dòng nào**, dựng admin nhanh.
- ⚠️ **Nhược:** mỗi lần lưu commit lại **cả file** (diff lớn hơn, dễ đụng nếu 2 người sửa cùng file); form của tab lớn (vocabulary 36 nhóm, jlpt 6 đề × 25 câu) khá dài.

→ **Phù hợp để ship bản đầu tiên** và cho mức độ chỉnh sửa vừa phải.

### Giai đoạn 2 — Folder collections + script gộp (khi dữ liệu phình to)

Tách các tab "nặng & hay thêm mới" thành **mỗi mục một file** trong thư mục `content/`, rồi một script `prebuild` gộp lại thành đúng định dạng `src/data/*.json` mà app đang đọc.

```
content/kanji/mizu.json      ┐
content/kanji/hi.json        ├─► npm run assemble ─► src/data/kanji.json ─► app đọc như cũ
content/kanji/yama.json      ┘
```

- ✅ **Ưu:** thêm 1 kanji = tạo 1 file nhỏ (diff gọn, gần như không đụng độ); form ngắn; dễ tìm.
- ⚠️ **Nhược:** cần viết script gộp + thêm bước `assemble` vào `prebuild`.
- 💡 **App vẫn không đổi**, vì định dạng runtime giữ nguyên — chỉ khác nguồn sinh ra nó.

→ **Nâng lên khi** một tab vượt ~vài trăm mục hoặc có nhiều người cùng sửa.

### Bảng phân loại từng tab

| Tab / file | Cấu trúc hiện tại | Giai đoạn 1 | Nên tách folder (GĐ2)? |
|---|---|---|---|
| `kanji.json` | mảng phẳng 103 mục | file collection + list | ✅ Nên (hay thêm mới, growing) |
| `vocabulary.json` | 36 categories → words | file collection, list lồng | ✅ Nên (mỗi từ / mỗi category 1 file) |
| `jlpt-sets.json` | 6 đề → sections → questions | file collection, list lồng sâu | ✅ Nên (mỗi đề 1 file) |
| `grammar.json` | 8 categories → items | file collection, list lồng | ⚠️ Tuỳ (mỗi category 1 file) |
| `kana.json` | dữ liệu cố định (bảng chữ) | file collection | ❌ Không cần (ít khi đổi) |
| `numbers.json` | nhiều mảng cố định | file collection | ❌ Không cần |
| `tips-exercises.json` | tips + studyPlan | file collection | ❌ Không cần |

---

## 6. Đặc tả collection cho từng tab

Mỗi collection = 1 mục trong sidebar của dashboard admin. Với Giai đoạn 1 dùng **file collection** (một file, nhiều field).

| Collection (sidebar) | File nguồn | Field chính | Widget dùng |
|---|---|---|---|
| **Kana** | `src/data/kana.json` | meta, hiragana{basic,dakuten,yoon}, katakana{...}, commonKatakanaWords | object + list(char, romaji, meaning, origin) |
| **Kanji** | `src/data/kanji.json` | meta, categories, kanji[] | list(char, on, kun, meaning, stroke, category, examples, mnemonic…) |
| **Từ vựng** | `src/data/vocabulary.json` | meta, categories[]→words[] | list lồng list |
| **Ngữ pháp** | `src/data/grammar.json` | meta, categories[]→items[]→examples[] | list lồng list |
| **Số đếm** | `src/data/numbers.json` | numbers, counters, hours, months, dates, questionWords, rules, weekdays | nhiều list |
| **Mẹo & Lộ trình** | `src/data/tips-exercises.json` | tips.sections[], studyPlan.methods[], studyPlan.schedule[] | object + list |
| **Đề JLPT** | `src/data/jlpt-sets.json` | examSets[]→sections[]→questions[] | list lồng 3 tầng |

**Kiểu widget theo kiểu dữ liệu:**
- Chuỗi ngắn (char, romaji, meaning) → `string`
- Đoạn dài (detail, explanation, mnemonic) → `text` hoặc `markdown`
- Số (stroke, num, timeLimit) → `number`
- Boolean (special) → `boolean`
- Màu (color) → `string` (hoặc `color` widget nếu bản CMS hỗ trợ)
- Icon → `string` (khớp id trong `icons.svg`)
- Mảng con (examples, words, questions) → `list` với `fields`
- Đối tượng con (meta, example) → `object` với `fields`

---

## 7. Chức năng của dashboard

| # | Chức năng | Mô tả | Ghi chú |
|---|---|---|---|
| F1 | **Đăng nhập** | GitHub OAuth; chỉ collaborator của repo mới thao tác được | Bắt buộc, chặn ghi trái phép |
| F2 | **Xem danh sách** | Duyệt nội dung theo từng collection/tab | |
| F3 | **Thêm mục** | Tạo kanji / từ vựng / câu hỏi… mới qua form | GĐ2 = tạo file mới; GĐ1 = thêm vào list |
| F4 | **Sửa mục** | Chỉnh field của mục có sẵn | |
| F5 | **Xoá mục** | Xoá khỏi list/xoá file | Có xác nhận |
| F6 | **Kiểm tra dữ liệu (validation)** | Bắt buộc field quan trọng (`char`, `meaning`…), đúng kiểu số/boolean | Khai báo `required`, `pattern` trong config |
| F7 | **Upload media** | Nếu sau này thêm ảnh minh hoạ | `media_folder: public/uploads` |
| F8 | **Preview** | Xem trước nội dung trước khi lưu | Preview mặc định của CMS |
| F9 | **Quy trình duyệt (tuỳ chọn)** | `publish_mode: editorial_workflow` → mỗi thay đổi tạo **Pull Request** thay vì commit thẳng | Mô phỏng "draft → publish" của Builder; nên bật nếu có nhiều người sửa |
| F10 | **Tự động deploy** | Sau khi lưu/merge → CI rebuild → CDN | ~1–3 phút |

---

## 8. Xác thực & phân quyền

- **Cơ chế:** GitHub OAuth. Người dùng bấm "Login with GitHub" trên `/admin`, CMS đổi lấy access token qua OAuth proxy.
- **Phân quyền:** ai là **collaborator** (hoặc thành viên có quyền write) của repo GitHub thì ghi được; người ngoài không có token hợp lệ ⇒ không commit được.
- **Bảo mật bắt buộc:**
  - `GITHUB_CLIENT_SECRET` chỉ nằm trong biến môi trường của Worker, **không** đưa vào code client.
  - Trang `/admin` có thể public (bản thân CMS không lộ gì), nhưng **quyền ghi** được bảo vệ hoàn toàn bởi GitHub — không có token = không sửa được repo.
  - Cân nhắc bật **branch protection** cho `main` + dùng editorial workflow (PR) để có bước review.

> ⚠️ **Không** hard-code token, client secret, hay để callback URL trỏ sai. Đây là bề mặt bảo mật chính của tính năng.

---

## 9. Các bước triển khai (theo giai đoạn)

### Giai đoạn 0 — Nền tảng hosting (nếu chưa làm)
- [ ] Hoàn tất Phương án A: deploy lên Cloudflare Pages, build `npm run build` → `dist`.

### Giai đoạn 1 — Dashboard admin cơ bản (JSON hiện có)
1. [ ] Tạo **GitHub OAuth App** (Settings → Developer settings → OAuth Apps).
2. [ ] Deploy **OAuth proxy** (Cloudflare Worker `sveltia-cms-auth`), set `GITHUB_CLIENT_ID/SECRET`.
3. [ ] Cập nhật callback URL của OAuth App trỏ về Worker.
4. [ ] Thêm `public/admin/index.html` (nạp Sveltia CMS).
5. [ ] Viết `public/admin/config.yml`: khai báo `backend` (github + `base_url` = Worker) và **file collections** cho từng tab (mục 6–7).
6. [ ] Deploy, truy cập `/admin`, đăng nhập, thử **sửa 1 mục** → xác nhận có commit → CI chạy → nội dung đổi trên site.
7. [ ] Bật `required`/validation cho các field trọng yếu.

### Giai đoạn 2 — Tối ưu khi dữ liệu phình (tuỳ chọn)
8. [ ] Tách tab nặng (kanji/vocabulary/jlpt) thành `content/<tab>/*.json` (folder collections).
9. [ ] Viết script `scripts/assemble.mjs` gộp `content/**` → `src/data/*.json`.
10. [ ] Thêm vào `package.json`: `"prebuild": "node scripts/assemble.mjs"` để build luôn dùng dữ liệu mới.
11. [ ] Cập nhật `config.yml` sang folder collections cho các tab đã tách.

### Giai đoạn 3 — Kiện toàn (tuỳ chọn)
12. [ ] Bật `publish_mode: editorial_workflow` (duyệt qua PR).
13. [ ] Bật branch protection cho `main`.
14. [ ] Viết `README` ngắn hướng dẫn admin dùng dashboard.

---

## 9b. Bản LOCAL đã dựng — admin NATIVE (không dùng Decap ✅)

> **Cập nhật hướng triển khai:** ban đầu tài liệu dựng theo Decap CMS (mục 2–9). Sau khi cân nhắc, đã **chuyển sang admin native** — viết bằng chính React/JSX + CSS như các màn hình học, thay vì widget CMS bên ngoài. Vẫn giữ triết lý Tier‑1 (dữ liệu sống trong Git, sửa local rồi push); chỉ khác ở chỗ giao diện & cơ chế ghi là **code của mình**, khớp phong cách app và dễ tuỳ biến. Các mục Decap phía trên (config.yml, OAuth proxy…) giữ lại làm tham chiếu cho phương án thay thế.

### Kiến trúc bản native
- **Endpoint dev-only** trong `vite.config.ts` (plugin `admin-data-api`): `GET/POST /api/admin?file=<name>` đọc/ghi `src/data/<name>.json`. Chỉ chạy khi `vite` (dev); có **whitelist** 7 file chống path traversal; validate JSON trước khi ghi; lưu dạng `JSON.stringify(…, null, 2)`.
- **Tab "Admin"** trong app, **chỉ hiện ở chế độ dev** (`import.meta.env.DEV`) và được `lazy()` — bản build production **không kèm** admin (đã xác nhận: build không sinh chunk admin).

### File đã thêm/sửa
- `vite.config.ts` — plugin endpoint đọc/ghi file (dev-only).
- `src/lib/adminApi.js` — helper `loadData` / `saveData`.
- `src/components/admin/JsonEditor.jsx` — **editor đệ quy** render mọi cấu trúc JSON (object/array/string/number/boolean): mảng gập/mở, thêm/xoá/di chuyển item, tóm tắt từng item.
- `src/components/admin/AdminTab.jsx` — màn hình chính: chọn file, Tải lại, Lưu, báo trạng thái, cảnh báo chưa lưu.
- `src/styles/tabs/admin.css` — style khớp bảng màu app (biến từ `base.css`).
- `src/App.jsx` — thêm tab Admin (dev-only, lazy).
- Đã **gỡ** Decap: xoá `public/admin/`, `public/uploads/`, script `cms`, devDependency `decap-server`.

### Cách chạy (chỉ 1 terminal)
```bash
npm run dev
```
Mở app → bấm tab **🛠️ Admin** (cuối thanh nav, chỉ thấy ở dev) → chọn file → sửa trong form → **💾 Lưu**. Ghi thẳng vào `src/data/*.json`, Vite HMR tự nạp lại. Sửa xong thì `git commit` + `push` như thường.

### Đã kiểm thử (pass)
- ✅ Build production compile sạch và **loại admin** khỏi bundle (guard `IS_DEV`).
- ✅ `npm run lint` sạch (0 lỗi); 0 lỗi console khi render.
- ✅ Endpoint E2E: GET đọc đúng, POST ghi `{ok:true}`, **dữ liệu nguyên vẹn**, file lạ (`../package`) bị chặn 400.
- ✅ UI: tab Admin hiện đúng (dev), bộ chọn 7 file, editor nạp data (vd Từ vựng: 36 nhóm), mở/gập + thêm/xoá/di chuyển hoạt động, render nhẹ (lazy theo mục).

> **Ưu điểm so với Decap:** không CDN, không proxy, không OAuth, 1 lệnh `npm run dev`; giao diện đúng phong cách app; toàn bộ là code trong repo, tuỳ biến thoải mái. Diff khi lưu cũng gọn (giữ nguyên thứ tự key JS, indent 2 space) — không bị "xáo key" như Decap.

> **Bảo mật:** admin là **local-dev-only** nên không cần đăng nhập (không ai truy cập được endpoint ghi từ ngoài máy bạn). Nếu sau này muốn admin chạy trên **production** (không qua git push), sẽ cần backend + auth — lúc đó quay lại cân nhắc Tầng 2 (Supabase…) hoặc phương án Decap ở trên.

---

## 10. Rủi ro & lưu ý

| Rủi ro | Ảnh hưởng | Cách giảm thiểu |
|---|---|---|
| **Đụng độ commit** (2 người sửa cùng file JSON) | Merge conflict | GĐ2 tách file nhỏ; hoặc quy ước 1 người sửa/lần |
| **Sai schema** (CMS ghi khác cấu trúc app đọc) | App lỗi khi render | Khai báo `config.yml` khớp 100% cấu trúc; test sau mỗi thay đổi; cân nhắc validate JSON trong CI |
| **Trễ hiển thị** (~1–3 phút build) | Không "tức thì" | Chấp nhận (giống Builder); nếu cần tức thì → cân nhắc Tầng 2 |
| **Cạn build minutes** | CI ngừng chạy | Cloudflare Pages free 500 build/tháng — thừa; gộp nhiều sửa đổi vào ít commit |
| **Lộ client secret** | Chiếm quyền ghi repo | Secret chỉ trong Worker env; không đưa ra client |
| **Xoá nhầm nội dung** | Mất dữ liệu | Có Git history để khôi phục; bật editorial workflow để review trước khi merge |

---

## 11. Tiêu chí nghiệm thu (Acceptance)

- [ ] Truy cập `/admin`, đăng nhập GitHub thành công.
- [ ] Thêm 1 kanji mới → xuất hiện commit trong repo → sau build, kanji hiển thị ở tab Kanji.
- [ ] Sửa nghĩa 1 từ vựng → nội dung cập nhật đúng trên site.
- [ ] Xoá 1 mục thử → biến mất khỏi site sau build.
- [ ] Người **không** có quyền repo **không** commit được.
- [ ] App vẫn build & chạy bình thường, không lỗi schema.

---

## 12. Tóm tắt

Dashboard admin được dựng bằng **Git-based CMS (Sveltia/Decap)** đặt tại `/admin`, xác thực qua **GitHub OAuth**, ghi thẳng vào `src/data/*.json`, và tự động deploy qua **Cloudflare Pages CI**. Bắt đầu ở **Giai đoạn 1** (trỏ CMS vào JSON hiện có, app không đổi), nâng lên **Giai đoạn 2** (tách file + script gộp) khi dữ liệu lớn dần. Toàn bộ giữ nguyên chi phí ~0đ và tinh thần "không vận hành server" của phương án gốc — chính là "luồng ghi" của Builder được thay bằng các mảnh miễn phí.
