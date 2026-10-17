# Content Manager

Ứng dụng quản lý nội dung (Dashboard, Danh sách, Kanban, Lịch đăng, Media, Chiến dịch, Báo cáo,
Thành viên). Thiết kế theo các mockup trong `docs/design-system/references/1-5.png`.

| Thành phần         | Vị trí                           | Công nghệ                                  |
| ------------------ | -------------------------------- | ------------------------------------------ |
| Backend API        | `backend/ContentManager.Api`     | ASP.NET Core 10, EF Core + PostgreSQL, JWT |
| Code UI dùng chung | `packages/cm-core` (`@cm/core`)  | React 19, Tailwind v4, Recharts            |
| Web + Mobile       | `apps/content-web`               | Vite; Capacitor (Android/iOS)              |
| Desktop            | `apps/content-desktop`           | Tauri 2 (Windows)                          |
| Hub                | `apps-manifest.json`, `apps/hub` | mục "Content Manager" (Beta)               |

## Chạy local

```bash
npm install
npm run cm:up            # PostgreSQL (5433) + API (http://localhost:5290) trong Docker
npm run dev:cm-web       # http://localhost:5180
npm run dev:cm-tauri     # desktop (cần Rust)
```

Dữ liệu demo được seed khi `Seed__Demo=true` (mặc định trong compose):
`admin@contentmanager.local` / `Demo@1234` (các thành viên demo cùng mật khẩu).
Tắt bằng `CM_SEED_DEMO=false`. Đổi `CM_JWT_SECRET`, `CM_DB_PASSWORD` trước khi deploy thật.

Chạy API ngoài Docker: `docker compose -f docker-compose.content-manager.yml up -d db`, rồi
`dotnet run --project backend/ContentManager.Api` (môi trường Development, DB ở cổng 5433).

Migration: `dotnet ef migrations add <Name> --project backend/ContentManager.Api`
(áp dụng tự động khi API khởi động).

## Mobile

`npm run cm:android-open` (cần Android Studio; lần đầu chạy `npx cap add android` trong
`apps/content-web`). Trên emulator, nhập máy chủ `http://10.0.2.2:5290` ở màn hình đăng nhập.

## Hub

Mục `content-manager` trong `apps-manifest.json` ở trạng thái **Beta**, chưa có `downloadUrl`.
Khi phát hành bộ cài (`npm run build:cm-tauri`), thêm URL GitHub Release, `sha256`,
`installerType`, `silentArgs`, `startMenuShortcut` (`Content Manager\content-manager.lnk`) giống
mục Smart Task Manager.
