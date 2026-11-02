# 2. Cách vận hành

> Cập nhật: 2026-11-01. Không ghi giá trị bí mật nào trong tài liệu này. Chỉ ghi **tên** biến môi trường.

## 1. Sơ đồ chạy thật

```
Người dùng
  ├─ Windows (Tauri .exe/.msi)  ┐
  ├─ Web                        ├─►  Backend trên Railway ─► Cơ sở dữ liệu trên Railway
  └─ Android (Capacitor APK)    ┘
App Hub (Windows) ─► đọc apps-manifest.json từ GitHub main ─► tải installer từ GitHub Releases
Codemagic ─► build APK (và iOS khi cần) từ GitHub main
```

| App                | Backend (thư mục)                      | Cơ sở dữ liệu | Chạy ở                      |
| ------------------ | -------------------------------------- | ------------- | --------------------------- |
| Smart Task Manager | `backend/SmartTask.Api` (.NET 10)      | MySQL 8       | Railway                     |
| Content Manager    | `backend/ContentManager.Api` (.NET 10) | PostgreSQL    | Railway                     |
| VoiceScribe        | `apps/voicescribe` (Node.js)           | PostgreSQL    | Railway (Docker, có ffmpeg) |

Frontend dùng chung: `packages/app-core`, `packages/ui`, `packages/shared`, `packages/api-client`
(Smart Task Manager) và `packages/cm-core` (Content Manager). VoiceScribe có UI riêng ở `apps/voicescribe/web`.

## 2. Biến môi trường (chỉ tên)

**Thiết lập trên Railway, không đưa vào Git:**

| App                | Biến                                                                                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Smart Task Manager | `ConnectionStrings__DefaultConnection`, cấu hình `Jwt__*` (khóa ký token)                                                                                |
| Content Manager    | `DATABASE_URL`, `Jwt__Secret` (tối thiểu 32 ký tự; thiếu là backend không khởi động)                                                                     |
| VoiceScribe        | `DATABASE_URL`, `JWT_SECRET`, `HF_TOKEN`, tùy chọn `SIGNUP_CODE`, `MAX_UPLOAD_MB`, `MAX_CONCURRENT_JOBS`, `CHUNK_CONCURRENCY`, `DIARIZATION_SERVICE_URL` |

**Khi build giao diện (địa chỉ công khai, không phải bí mật):**

| App                | Biến                | Nơi đặt                                                             |
| ------------------ | ------------------- | ------------------------------------------------------------------- |
| Smart Task Manager | `VITE_API_BASE_URL` | `.env.development` (cục bộ, bị `.gitignore`); `codemagic.yaml` (CI) |
| Content Manager    | `VITE_CM_API_URL`   | `apps/content-desktop/.env.production`; `codemagic.yaml` (CI)       |
| VoiceScribe        | `VITE_API_URL`      | `apps/voicescribe/web/.env.desktop`; `codemagic.yaml` (CI)          |

> Bài học (2026-11-01): `.env.development` không có trên CI, nên APK Smart Task Manager build bằng
> Codemagic bị màn hình trắng do thiếu `VITE_API_BASE_URL`. Biến này nay được khai trong `codemagic.yaml`.

## 3. Chạy khi phát triển

Yêu cầu: Node 20+, .NET SDK 10, Rust (cho Tauri), MySQL (Smart Task Manager) hoặc PostgreSQL (hai app còn lại).

```bash
npm install                      # cài toàn bộ workspace
npm run typecheck                # kiểm tra kiểu cho mọi app
npm run lint                     # ESLint
npm run format                   # Prettier --check
```

Các lệnh build nằm trong `package.json` gốc, ví dụ `build:web`, `build:tauri` (Smart Task Manager desktop),
`build:cm-tauri`, `build:vs-tauri`, `build:hub-tauri`. Backend .NET: `dotnet run` trong thư mục API tương ứng.

## 4. Quy trình phát hành bản desktop (Windows)

Ví dụ cho Smart Task Manager 0.1.1 (đã làm ngày 2026-11-01):

1. **Nâng phiên bản:** sửa `version` trong `apps/<app>/src-tauri/tauri.conf.json` và `Cargo.toml`
   (`Cargo.lock` tự đổi). Commit dạng `chore(app): bump desktop to X.Y.Z`.
2. **Build:** chạy `npx tauri build` trong thư mục app. Kết quả nằm ở
   `src-tauri/target/release/bundle/nsis/*.exe` và `bundle/msi/*.msi`.
3. **Push** `main` lên GitHub (chỉ khi chủ dự án cho phép).
4. **Tạo GitHub Release** thủ công trên GitHub, đặt tag đúng quy ước (xem mục 5), đính kèm cả `.exe` và `.msi`.
5. **Kiểm tra file trên Release:** so dung lượng và SHA-256 với bản vừa build
   (`curl https://api.github.com/repos/thinlam/SmartTaskManagers/releases/tags/<tag>`).
6. **Cập nhật Hub:** sửa **cả** `apps-manifest.json` **và** `apps/hub/src/data/apps.ts`: link tải, phiên bản,
   SHA-256 cho cả exe và msi. Commit `feat(hub): update <App> to X.Y.Z`, rồi push.
7. Hub đọc manifest từ `main`, nên người dùng chỉ thấy bản mới sau bước push này.

### Tag Release

| App                | Quy ước tag hiện dùng                     | Ví dụ                      |
| ------------------ | ----------------------------------------- | -------------------------- |
| Smart Task Manager | `smart-task-manager_X.Y.Z` (cũ: `vX.Y.Z`) | `smart-task-manager_0.1.1` |
| Content Manager    | `content-manager-vX.Y.Z`                  | `content-manager-v0.1.3`   |
| VoiceScribe        | `voicescribe-vX.Y.Z`                      | `voicescribe-v0.2.5`       |

## 5. Quy trình build APK (Codemagic)

File cấu hình: `codemagic.yaml` ở gốc repo. Các workflow Android:

| Workflow                       | Thư mục build          | Ghi chú                        |
| ------------------------------ | ---------------------- | ------------------------------ |
| `Smart Task Manager - Android` | `apps/web`             | Gói `com.smarttaskmanager.app` |
| `Content Manager - Android`    | `apps/content-web`     | Gói `com.contentmanager.app`   |
| `VoiceScribe - Android`        | `apps/voicescribe/web` | Gói `com.voicescribe.app`      |

Cách chạy: Codemagic → app `SmartTaskManagers` → **Start new build** → nhánh `main` → chọn đúng workflow.
Codemagic chỉ build code **đã push** lên GitHub. APK là bản **debug**, kết quả ở mục Artifacts và gửi qua email.
Workflow iOS có cho Smart Task Manager và Content Manager (cần chứng chỉ Apple); VoiceScribe chưa có iOS.

## 6. Triển khai backend

- Railway tự build từ Dockerfile (`backend/Dockerfile`, `backend/ContentManager.Api/Dockerfile`,
  `apps/voicescribe/Dockerfile`). Thao tác trên dashboard Railway do chủ dự án thực hiện.
- Smart Task Manager tự áp migration khi khởi động (xem `Program.cs`, mục "DATABASE MIGRATION").
- **Quan trọng:** sửa CORS hay logic backend chỉ có hiệu lực **sau khi redeploy** trên Railway. Ví dụ: bản
  VoiceScribe Android cần backend cho phép nguồn `https://localhost` (đã sửa trong code ngày 2026-11-01).
- Kiểm tra sức khỏe: Smart Task Manager có `HealthController` và health checks.

## 7. Việc hằng ngày của hệ thống

| Việc                                | Tần suất        | Thành phần                            |
| ----------------------------------- | --------------- | ------------------------------------- |
| Tính lại điểm thông minh và rủi ro  | Mỗi ngày        | `DailySmartRecalcHostedService`       |
| Sinh thông báo theo tài khoản       | Mỗi 30 phút     | `NotificationGenerationHostedService` |
| Xử lý ghi âm chạy nền (VoiceScribe) | Khi có file mới | `services/jobs.ts`                    |

## 8. Khi có sự cố

| Triệu chứng                                  | Nguyên nhân hay gặp                                        | Cách xử lý                                      |
| -------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------- |
| APK mở ra màn hình trắng                     | Thiếu `VITE_API_BASE_URL` lúc build                        | Kiểm tra `codemagic.yaml`, build lại            |
| APK đăng nhập báo không kết nối              | Thiếu `VITE_CM_API_URL` (Content Manager) hoặc backend ngủ | Kiểm tra biến, mở backend trên Railway          |
| Android: thanh tab dưới bị nút điều hướng đè | Capacitor 7 không cấp vùng an toàn                         | Đã xử lý trong `MainActivity.java` (2026-11-01) |
| VoiceScribe bị chặn CORS                     | Backend chưa redeploy bản mới                              | Redeploy VoiceScribe trên Railway               |
| Hub không thấy bản mới                       | Chưa push `apps-manifest.json` lên `main`                  | Push `main`                                     |
| Backend Content Manager không khởi động      | `Jwt__Secret` thiếu hoặc dưới 32 ký tự                     | Đặt lại biến trên Railway                       |
