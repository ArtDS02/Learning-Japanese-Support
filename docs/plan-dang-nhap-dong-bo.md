# Plan: Đăng nhập tài khoản & đồng bộ tiến độ (PC ↔ điện thoại)

> Ngày soạn: 2026-11-08 · Người triển khai: Claude · Người hỗ trợ setup: chủ dự án
>
> Mục tiêu: người dùng **có thể** đăng nhập để tiến độ học đi theo tài khoản và tự đồng bộ giữa các máy.
> **Không đăng nhập thì app chạy y như hiện tại**: không tải thêm code Firebase, không gọi mạng, không đổi hành vi.

## Trạng thái (2026-11-08)

**Đã triển khai bước 1–6, đã kiểm tra bằng Firebase Emulator.** Còn lại các bước setup của chủ dự án (mục 4: D, H, E, F, G).

Mã nguồn chính:

| File | Vai trò |
|---|---|
| [src/lib/storage.js](../src/lib/storage.js) | Một cửa cho mọi lần ghi (`writeJSON`, `writeRaw`, `removeKey`, `onLocalWrite`) |
| [src/lib/dataKeys.js](../src/lib/dataKeys.js) | Danh sách khoá, khoá không đồng bộ, khoá "cộng dồn" |
| [src/lib/merge.js](../src/lib/merge.js) | `mergeValue` (SRS so `last` trước `reps`, Minna theo từng bài) |
| [src/lib/cloud/syncCore.js](../src/lib/cloud/syncCore.js) | Lõi đồng bộ thuần, test ở `syncCore.test.js` (`npm test`) |
| [src/lib/cloud/store.js](../src/lib/cloud/store.js) | Trạng thái UI, theo dõi ghi, hẹn giờ — nạp ngay, không chứa Firebase |
| [src/lib/cloud/engine.js](../src/lib/cloud/engine.js) | Firebase Auth + Firestore lite — chunk lazy (~70KB gz) |
| [src/components/common/AccountButton.jsx](../src/components/common/AccountButton.jsx) | Nút trên header; hộp thoại ở `AccountPanel.jsx` (lazy) |
| [firestore.rules](../firestore.rules) | Mỗi người chỉ đọc/ghi `users/{uid}/kv/*`, kiểm tra định dạng |

Đã kiểm tra trên emulator (hai dev server khác cổng đóng vai hai máy):
- không đăng nhập: không tải chunk Firebase, không có request ra ngoài;
- đăng nhập lần đầu: tài khoản trống → đẩy lên; cả hai có tiến độ → hỏi, "Gộp" ra đúng kết quả;
- đồng bộ dần: bỏ đánh dấu ở máy B → máy A cũng mất đánh dấu (không "hồi sinh");
- xung đột SRS hai máy cùng sửa → gộp đủ thẻ, đẩy bản gộp lên;
- "Xoá toàn bộ" khi đang đăng nhập → lan sang máy kia; màn hình tự vẽ lại không cần tải lại;
- đăng xuất: đẩy nốt thay đổi chờ rồi mới thoát, tuỳ chọn xoá dữ liệu trên máy;
- xoá tài khoản: xoá sạch dữ liệu + tài khoản trên server, giữ tiến độ trên máy;
- rules: người khác / chưa đăng nhập không đọc/ghi được; field lạ, đường dẫn lạ bị chặn;
- giao diện ở bề rộng 375px không tràn ngang.

Thay đổi so với plan ban đầu:
- **authDomain nên là `japanese-learning-23d11.web.app`** (cùng origin với app) thay vì `…firebaseapp.com`. Khi test, đăng nhập kiểu chuyển trang thất bại im lặng nếu trang auth khác site với app (trình duyệt phân vùng lưu trữ) — đúng lỗi mà Safari/iOS gặp. Cần bước H ở mục 4.
- Chạy dạng PWA "thêm vào màn hình chính" thì luôn dùng chuyển trang thay cho popup.
- Hộp thoại tài khoản tách thành chunk lazy; bundle chính chỉ tăng ~2,5KB gz.

---

## 1. Quyết định kiến trúc

| Hạng mục | Chọn | Lý do |
|---|---|---|
| Backend | **Firebase Auth + Cloud Firestore**, dùng project sẵn có `japanese-learning-23d11` (gói Spark miễn phí) | App đã deploy trên Firebase Hosting. Gói Spark không gắn thẻ nên không bao giờ phát sinh phí. |
| Đăng nhập | **Google** (giai đoạn 1). Email/mật khẩu là tuỳ chọn ở giai đoạn sau. | Người dùng Việt Nam hầu như ai cũng có tài khoản Google. Không phải tự xử lý mật khẩu hay quên mật khẩu. |
| SDK | `firebase/auth` + **`firebase/firestore/lite`** | Bản lite nhỏ hơn nhiều (~30KB gz so với ~100KB). App không cần tính năng offline hay realtime của Firestore, vì localStorage đã là nơi lưu offline. |
| Nạp SDK | **Lazy `import()`**: chỉ nạp khi người dùng bấm "Đăng nhập", hoặc khi máy này đã từng đăng nhập | Người không đăng nhập không phải tải thêm byte nào. |
| Mô hình dữ liệu | **Local-first**: localStorage vẫn là nguồn chính, Firestore chỉ là bản đồng bộ | Offline vẫn học được. Mất mạng hay Firestore hết hạn mức thì app vẫn chạy. |
| Đồng bộ | Đẩy lên theo đợt (debounce) + kéo về khi mở app hoặc quay lại tab. **Không dùng realtime listener.** | Ít lượt đọc/ghi, dư sức nằm trong hạn mức miễn phí. |

### Cấu trúc trên Firestore

```
users/{uid}/kv/{storageKey}
  v   : string | null   // JSON.stringify(giá trị); null = khoá đã bị xoá (tombstone)
  t   : number          // thời điểm sửa trên máy (ms) — dùng để phân xử xung đột
  st  : timestamp       // serverTimestamp() — dùng làm con trỏ "kéo phần thay đổi"
  dev : string          // id ngẫu nhiên của máy ghi — bỏ qua "tiếng vọng" của chính mình
```

- Mỗi khoá localStorage là một document, nên chỉ ghi lại đúng khoá vừa đổi và không chạm trần 1MB/document.
- `v` lưu dạng **chuỗi JSON** vì Firestore không chấp nhận mảng lồng mảng, và key object không bị giới hạn ký tự.

### Khoá được đồng bộ

Lấy từ `OWNED_KEYS` trong [backup.js](../src/lib/backup.js), **trừ** các khoá chỉ có nghĩa trên từng máy:

| Không đồng bộ | Lý do |
|---|---|
| `jlpt-active-tab` | Tab đang mở là trạng thái giao diện của từng máy |
| `tts_cfg_v1` | Danh sách giọng đọc khác nhau giữa điện thoại và PC |
| `run_progress_v1` | Ghi sau mỗi lượt chấm, đồng bộ sẽ tốn lượt ghi. Nguồn sự thật đã là SRS. |
| `migrations_done_v1` | Cờ di trú dữ liệu chạy riêng trên từng máy |

Danh sách này khai báo ở một chỗ (`SYNC_EXCLUDE`), cạnh `OWNED_KEYS`.

---

## 2. Thuật toán đồng bộ

Trên máy lưu thêm `sync_meta_v1` (khoá này **không** đồng bộ):

```
{ uid, deviceId, lastPullAt, keys: { [key]: { localT, remoteT, dirty } } }
```

**Ghi local** (mọi chỗ gọi `writeJSON` / `removeKey`):
- Đánh `dirty = true`, `localT = Date.now()`.
- Hẹn đẩy lên sau 5 giây (debounce).

**Đẩy lên** (push), chạy khi hết debounce, khi `visibilitychange → hidden`, khi `pagehide`, hoặc khi bấm "Đồng bộ ngay":
- Gom mọi khoá dirty vào một `writeBatch`.
- Ghi xong thì `dirty = false` và `remoteT = t`.

**Kéo về** (pull), chạy khi mở app, khi tab hiện lại (tối đa 60 giây một lần), hoặc khi bấm "Đồng bộ ngay":
- Query các document có `st > lastPullAt`.
- Với mỗi document đến từ máy khác, xử lý theo bảng:

| Trên máy | Remote | Xử lý |
|---|---|---|
| Không dirty | Mới hơn `remoteT` | Lấy bản remote |
| Dirty | Không đổi kể từ lần sync trước | Giữ local (sẽ được đẩy lên) |
| Dirty | Cũng đã đổi | **Xung đột**, xem bên dưới |

**Khi xung đột:**
- **Khoá "cộng dồn"** (`srs_state_v1`, `progress_v1`, `exam_history_v1`, `minna1_v1`): gộp bằng `mergeValue()`, rồi đánh dirty để đẩy bản gộp lên.
- **Mọi khoá còn lại** (đánh dấu từ, ghi chú, thẻ tự tạo, cài đặt…): bản nào có `t` mới hơn thì thắng (last-write-wins).
  - Không dùng phép hợp mảng như lúc nhập file sao lưu, vì như vậy bỏ đánh dấu hay xoá thẻ trên máy A sẽ bị máy B "hồi sinh" lại.

**Áp dữ liệu remote vào app đang chạy:**
- Ghi thẳng localStorage (không đánh dirty).
- Gọi `invalidateSrs()` / `invalidateRuns()`.
- Phát `StorageEvent` giả cho từng khoá. Các module (srs, progress, userdata, minna…) vốn đã lắng nghe sự kiện `storage` để đồng bộ giữa các tab, nên màn hình tự vẽ lại mà không phải sửa từng module.

**Sửa `mergeValue` cho SRS:**
- So `last` (ngày ôn gần nhất) trước, rồi mới đến `reps`.
- Hiện tại chỉ so `reps`, nên một thẻ vừa trả lời sai (bị hạ box) trên máy này có thể bị bản cũ hơn nhưng nhiều lượt ôn hơn ghi đè.

### Lần đầu đăng nhập trên một máy

| Tình huống | Xử lý |
|---|---|
| Tài khoản trống | Đẩy toàn bộ dữ liệu trên máy lên |
| Máy trống (máy mới) | Kéo toàn bộ về |
| Cả hai đều có dữ liệu | Hỏi người dùng: **Gộp (khuyên dùng)** / Dùng dữ liệu trên tài khoản / Dùng dữ liệu máy này. "Gộp" chạy `mergeValue` cho mọi khoá (một lần duy nhất). |

### Đăng xuất / xoá
- **Đăng xuất:** đẩy nốt phần dirty rồi mới thoát. Có tuỳ chọn "Xoá tiến độ trên máy này", dùng cho máy dùng chung.
- **"Xoá toàn bộ dữ liệu"** ở tab Tiến độ khi đang đăng nhập: thông báo rõ là sẽ xoá cả trên tài khoản (ghi tombstone `v: null`).
- **"Xoá tài khoản"** (yêu cầu của luật bảo vệ dữ liệu cá nhân): xoá mọi document `users/{uid}/kv/*` rồi gọi `deleteUser()`. Nếu Firebase báo phiên đăng nhập đã cũ thì yêu cầu đăng nhập lại.

### Giới hạn đã biết (chấp nhận được)
- `progress_v1.daily`: khi gộp, mỗi ngày lấy **max** chứ không lấy tổng. Nếu cùng một ngày học trên cả hai máy, số lượt ôn hiển thị sẽ thấp hơn thực tế, nhưng streak vẫn đúng.
- Đồng hồ hai máy lệch nhau vài giây chỉ ảnh hưởng khi sửa cùng một khoá gần như cùng lúc.

---

## 3. Các bước triển khai

### Bước 0: Setup (chủ dự án làm, xem mục 4)

### Bước 1: Gom mọi chỗ ghi localStorage về một cửa (không đổi hành vi)
- Trong [storage.js](../src/lib/storage.js):
  - Thêm `writeRaw(key, str)` và `removeKey(key)`.
  - Thêm một registry nhẹ `onLocalWrite(fn)`. Registry này **không import Firebase**.
  - `writeJSON`, `writeRaw`, `removeKey` gọi registry sau khi ghi.
- Sửa các chỗ đang gọi `localStorage.setItem/removeItem` trực tiếp:
  - [App.jsx:265](../src/App.jsx:265)
  - [VocabularyTab.jsx:35](../src/components/VocabularyTab.jsx:35)
  - [KanjiTab.jsx:55](../src/components/KanjiTab.jsx:55)
  - [StudyRunner.jsx:663](../src/components/common/StudyRunner.jsx:663)
  - [backup.js](../src/lib/backup.js), ở `importData` và `wipeAll`
- Thêm `SYNC_EXCLUDE` và `SYNCED_KEYS` vào backup.js.
- Sửa `mergeValue` của SRS để so `last` trước `reps`.

### Bước 2: Lõi đồng bộ thuần (không phụ thuộc Firebase), có test
- Tạo `src/lib/cloud/syncCore.js`. Đây là các hàm thuần:
  - `planPull(localMeta, remoteDocs)`: quyết định từng khoá áp remote, giữ local hay gộp.
  - `planPush(meta)`
  - `firstLoginPlan(localData, remoteData, choice)`
- Test bằng `node --test` (có sẵn trong Node 22, không thêm dependency), file `src/lib/cloud/syncCore.test.js`. Các ca cần test:
  - máy mới
  - tài khoản trống
  - xung đột khoá cộng dồn
  - last-write-wins
  - tombstone
  - bỏ qua tiếng vọng của chính máy mình
  - khoá bị loại trừ
- Thêm script `"test": "node --test src"` vào package.json.

### Bước 3: Lớp Firebase (lazy)
- `src/lib/cloud/config.js`: đọc `import.meta.env.VITE_FIREBASE_*`. Nếu thiếu cấu hình thì `cloudEnabled = false` và toàn bộ tính năng ẩn đi.
- `src/lib/cloud/firebase.js`: **chỉ được nạp qua `import()`**.
  - `initializeApp`, `getAuth`, `getFirestore` (bản lite).
  - Khi chạy dev có `VITE_USE_EMULATOR=1` thì nối tới emulator.
  - (Không đặt tên `src/firebase.js` vì tên đó đang nằm trong `.gitignore`.)
- `src/lib/cloud/auth.js`:
  - Dùng `signInWithPopup(GoogleAuthProvider)`. Khi app chạy ở chế độ PWA standalone (`display-mode: standalone`, đặc biệt trên iOS) thì dùng `signInWithRedirect`.
  - Có `signOut` và `deleteAccount`.
- `src/lib/cloud/sync.js`:
  - Dùng các kế hoạch từ syncCore để thực thi.
  - Lo debounce, các sự kiện visibility/pagehide/online, và trạng thái `idle | syncing | error | offline` (kèm `lastSyncAt`).
  - Lỗi mạng hoặc hết hạn mức thì chỉ đổi trạng thái, **không** ném lỗi ra UI học.
- Trong [main.jsx](../src/main.jsx): nếu `cloudEnabled` **và** `localStorage.cloud_session_v1` cho biết máy đã đăng nhập, thì `import()` lớp cloud sau lần render đầu, rồi pull.

### Bước 4: Giao diện
- Hook `useCloud()` dùng `useSyncExternalStore`, trả về `{ enabled, user, status, lastSyncAt }`.
- **Header** ([App.jsx](../src/App.jsx), trong `header__right`):
  - Chưa đăng nhập thì hiện nút "Đăng nhập".
  - Đã đăng nhập thì hiện avatar hoặc chữ cái đầu, kèm chấm trạng thái đồng bộ.
  - Nút này chỉ hiện khi `cloudEnabled`.
- **Modal tài khoản** (dùng lại [Modal.jsx](../src/components/common/Modal.jsx)):
  - Email, lần đồng bộ gần nhất
  - Nút: Đồng bộ ngay / Đăng xuất (có tuỳ chọn xoá dữ liệu trên máy) / Xoá tài khoản
  - Link tới chính sách quyền riêng tư
- **Hộp thoại "lần đầu đăng nhập"**: Gộp / Dùng tài khoản / Dùng máy này.
- **Tab Tiến độ, khối sao lưu**: thêm một dòng trạng thái đồng bộ, và đổi câu xác nhận "Xoá toàn bộ" khi đang đăng nhập.
- **Chính sách quyền riêng tư**: một modal ngắn, nói rõ app lưu gì (email, tên, tiến độ học), lưu ở đâu (Google Firebase), và cách xoá.
- CSS theo đúng quy ước file trong `src/styles/`. Kiểm tra ở bề rộng điện thoại và cả hai giao diện sáng/tối.

### Bước 5: Hạ tầng
- **Service worker** ([sw.js](../public/sw.js)): bỏ qua các đường dẫn `/__/` (trang `/__/auth/handler` của Firebase).
  - Lý do: hiện mọi request điều hướng đều được cache **đè lên index.html**. Sau một lần đăng nhập bằng redirect, bản offline của app sẽ thành trang auth.
- Tạo **`firestore.rules`** (commit vào repo):
  - Chỉ cho `request.auth.uid == uid` đọc/ghi `users/{uid}/kv/{key}`.
  - Chỉ chấp nhận các field `v, t, st, dev`.
  - `v` là chuỗi dưới 900KB hoặc `null`.
  - `t` là số.
  - `st == request.time`.
- Thêm `"firestore": { "rules": "firestore.rules" }` và cấu hình emulator vào `firebase.json`. Lưu ý file này đang bị gitignore nên chỉ sửa ở máy local.
- Tạo **`.env.example`** liệt kê các biến `VITE_FIREBASE_*` (đã được gitignore cho phép). Giá trị thật để trong `.env.local`.
- Cập nhật README: cách bật tính năng, chạy emulator, deploy rules.

### Bước 6: Kiểm tra
1. `npm run lint`, `npm test`, `npm run build`.
   - So kích thước bundle: chunk chính **không được tăng**, vì Firebase phải nằm ở chunk lazy riêng.
2. **Không cấu hình Firebase**: app chạy y như cũ, không có nút đăng nhập, không có request ra ngoài.
3. **Có cấu hình nhưng chưa đăng nhập**: không nạp chunk Firebase, không có request tới googleapis.
4. **Với Firebase Emulator** (Auth + Firestore chạy ở localhost, dùng tài khoản giả):
   - Giả lập hai máy bằng hai tab hoặc hai profile trình duyệt: đăng nhập, học ở máy A, sang máy B kéo về thì thấy tiến độ.
   - Bỏ đánh dấu ở A thì B cũng mất đánh dấu.
   - Xung đột SRS được gộp đúng.
   - Đăng xuất / xoá tài khoản xoá sạch dữ liệu trên emulator.
   - Thử rules: user khác không đọc được dữ liệu.
5. **Offline**: tắt mạng, học, bật lại mạng thì dữ liệu tự đẩy lên.
6. Chủ dự án tự kiểm tra cuối với tài khoản Google thật trên PC và điện thoại (mục 4, bước F).

### Ước lượng
Khoảng 1,5–2 ngày công: bước 1–2 mất ~0,5 ngày, bước 3 ~0,5 ngày, bước 4 ~0,5 ngày, bước 5–6 ~0,5 ngày.

---

## 4. Phần chủ dự án cần làm

Claude không làm được các bước dưới đây vì cần tài khoản Google / Firebase của bạn.

Trạng thái: A, B, C ✅ đã xong · D, H, E, F, G còn lại.

| # | Việc | Khi nào |
|---|---|---|
| H | **Google Cloud Console** → chọn project *japanese-learning-23d11* → **APIs & Services → Credentials** → mở OAuth client *"Web client (auto created by Google Service)"* → **Authorized redirect URIs** → thêm `https://japanese-learning-23d11.web.app/__/auth/handler` → Save. Sau đó đổi `VITE_FIREBASE_AUTH_DOMAIN=japanese-learning-23d11.web.app` trong `.env.local` (Claude đổi giúp được). | Trước khi build & deploy |
| A | [Firebase Console](https://console.firebase.google.com) → project **japanese-learning-23d11** → **Authentication** → Get started → **Sign-in method** → bật **Google** (chọn email hỗ trợ). | Trước bước 3 |
| B | **Firestore Database** → Create database → **Production mode** → region **asia-southeast1 (Singapore)**. Region không đổi được sau khi tạo. | Trước bước 3 |
| C | **Project settings** → *Your apps* → nếu chưa có Web app thì *Add app* (Web) → copy khối `firebaseConfig` (apiKey, authDomain, projectId, appId) gửi cho Claude, hoặc tự dán vào `.env.local` theo mẫu `.env.example`. Config web không phải bí mật, bảo mật nằm ở Firestore rules. | Trước bước 3 |
| D | **Authentication → Settings → Authorized domains**: kiểm tra đã có `japanese-learning-23d11.web.app` và `localhost`. Nếu dùng domain riêng thì thêm vào. | Trước bước 6 |
| E | Deploy: `firebase deploy --only firestore:rules,hosting`. Claude có thể chạy giúp nếu Firebase CLI trên máy đã đăng nhập (`firebase login`); việc đăng nhập CLI là bạn làm. | Sau bước 6 |
| F | Kiểm tra cuối bằng tài khoản Google thật: đăng nhập trên PC, học vài thẻ, mở điện thoại (cả trình duyệt lẫn bản "thêm vào màn hình chính"), xác nhận tiến độ đã sang. | Sau khi deploy |
| G | (Tuỳ chọn) Xác nhận nội dung chính sách quyền riêng tư và tên app hiển thị trên màn hình đăng nhập Google (Auth → Settings → *Public-facing name*). | Bất kỳ lúc nào |

Máy hiện đã có sẵn Node 22, Java 17 và Firebase CLI 15, đủ để chạy emulator. Bạn không cần cài thêm gì.

---

## 5. Ngoài phạm vi giai đoạn này
- Đăng nhập bằng email/mật khẩu hoặc email link (thêm sau nếu có người không dùng Google).
- Đồng bộ realtime khi hai máy mở cùng lúc (hiện tại sẽ đồng bộ khi chuyển tab hoặc mở lại app).
- Tách `settings_v1` thành phần chung và phần riêng từng máy (ví dụ cỡ chữ trên điện thoại khác PC).
- App Check, thống kê người dùng, bảng xếp hạng.
