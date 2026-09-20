# Architecture

## Nguyên tắc

- Windows Desktop và Web đều là **client**, không phải nguồn dữ liệu chính.
- Google Sheets tiếp tục là client chính thức, sẽ đồng bộ hai chiều với backend ở Phase 28.
- Personal Mode: không Team/Member/Owner/Department/Approval Workflow, trừ khi được yêu cầu lại
  (đã xác nhận với người dùng — xem `docs/audit/PHASE_00_AUDIT_REPORT.md`, mục G).
- UI Desktop/Web bám theo Canva Design System (`docs/design-system/design-tokens.md`) làm nguồn
  visual chính thức — không tự sáng tác style khác vì thư viện có default khác.
- Không maintain UI 3 lần: Desktop/Web dùng chung `packages/ui`, `packages/types`,
  `packages/api-client`, `packages/shared`, `packages/hooks`.

## Kiến trúc tổng thể

```
                         USER
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
   Windows App           Web App         Google Sheets
   React/Tauri            React           Apps Script
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
                  ASP.NET Core API
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
     Authentication    Smart Engine    Notifications
          │                │                │
          └────────────────┼────────────────┘
                           │
                           ▼
                    SQL Server Database
```

Sau này: `Android/iOS → cùng API` (Capacitor, research-only ở Phase 34).

## Monorepo

```
SmartTaskManagers/
├── apps/
│   ├── google-sheets/   Production — không đụng
│   ├── excel/            Frozen — không code
│   ├── desktop/           React + Tauri (Windows), bắt đầu Phase 05
│   └── web/               React, bắt đầu Phase 33, dùng chung packages/*
├── packages/
│   ├── ui/               Design tokens + component library
│   ├── types/             Task/Project/Goal/Habit/User/Notification/CalendarEvent
│   ├── api-client/         taskApi/projectApi/goalApi/habitApi/authApi
│   ├── shared/              utils, date logic, Smart Score (port từ 05_SmartEngine.gs)
│   ├── hooks/                useTasks/useProjects/...
│   └── config/                eslint/tsconfig/tailwind dùng chung
├── backend/                ASP.NET Core, Clean Architecture, bắt đầu Phase 20
│   ├── SmartTask.Api/
│   ├── SmartTask.Application/
│   ├── SmartTask.Domain/
│   ├── SmartTask.Infrastructure/
│   └── SmartTask.Persistence/
└── docs/
    ├── audit/ · architecture/ · design-system/ · roadmap/
```

## Windows Desktop

```
React Application
       │
       ▼
Tauri Desktop Shell
       │
       ▼
Windows
```

Tauri: native window, system integration, notification, auto-update (sau), installer
(`.exe`/`.msi`). UI vẫn 100% React, dùng chung `packages/ui`.

Đã cài đặt thật (Phase 06): Tauri 2.11, `identifier: com.smarttaskmanager.desktop`,
`src-tauri/tauri.conf.json` trỏ `devUrl` → Vite dev server, `frontendDist` → `apps/desktop/dist`.
`Cargo.lock` trong `src-tauri/` **được commit** (ứng dụng, không phải thư viện — cần reproducible
build, khác với `package-lock.json` cũng được commit nhưng vì lý do tương tự). Yêu cầu hệ thống
(Rust toolchain, MSVC Build Tools + Windows SDK, WebView2 Runtime) liệt kê tại
`apps/desktop/README.md`.

## Frontend stack (đã cài đặt thật, Phase 05)

|                 | Đã chọn                                                | Ghi chú                                                                                                                                                                                                             |
| --------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework       | React 19                                               |                                                                                                                                                                                                                     |
| Build tool      | Vite 6                                                 | `apps/desktop`                                                                                                                                                                                                      |
| Styling         | Tailwind CSS v4 (`@tailwindcss/vite`)                  | CSS-first — không có `tailwind.config.js`; theme khai báo bằng CSS custom properties trong `packages/ui/src/styles/theme.css` (`@theme { --color-primary: ...; }`), tự sinh utility (`bg-primary`, `rounded-md`...) |
| Variant styling | `class-variance-authority` + `clsx` + `tailwind-merge` | trong `packages/ui`                                                                                                                                                                                                 |

`packages/ui/src/styles/theme.css` là bản CSS canonical song song với `packages/ui/src/tokens/*.ts`
(bản TS canonical cho consumer không phải Tailwind) — Tailwind v4 không đọc được object JS, nên
hai file này phải giữ đồng bộ thủ công mỗi khi đổi token. Mọi app dùng `@stm/ui` phải:

```css
@import 'tailwindcss';
@import '@stm/ui/theme.css';
@source '../../../packages/ui/src'; /* bắt buộc — xem apps/desktop/README.md */
```

## Backend

ASP.NET Core, Clean Architecture 4 lớp (**skeleton dựng thật ở Phase 20** — xem `backend/README.md`
cho chi tiết verify: build sạch, 1 vertical slice thật `GET /api/health` chạy qua đủ 4 lớp, không
lỗ hổng bảo mật nào trong `dotnet list package --vulnerable`):

- `Domain` — entity thuần, không phụ thuộc framework (Phase 20 mới có base `Entity`, entity thật
  Task/Project/Goal/Habit là Phase 21).
- `Application` — use case, DTO, validation.
- `Infrastructure` — EF Core, service ngoài (email, sync).
- `Api` — controller/minimal API, auth, composition root.

(`Persistence` là project riêng, không gộp vào `Infrastructure` — xem cây thư mục `backend/` bên
dưới; `AppDbContext` hiện rỗng, chưa có `DbSet` nào, đợi Phase 21.)

Trách nhiệm: Authentication/Authorization/Users, Tasks/Projects/Goals/Habits/Calendar CRUD,
Settings, Sync, Notifications; sau này: Smart Engine (port từ `05_SmartEngine.gs`), AI Integration.

## Database — quyết định: SQL Server

Đã hỏi và người dùng chọn **SQL Server** thay vì đề xuất mặc định PostgreSQL. Lý do cân nhắc:

| Tiêu chí       | SQL Server (đã chọn)                                                                                                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Môi trường dev | Người dùng phát triển trên Windows — SQL Server tích hợp tự nhiên (SSMS, Visual Studio, LocalDB cho dev).                                                                                       |
| Hệ sinh thái   | ASP.NET Core + EF Core + SQL Server là tổ hợp phổ biến, tài liệu/tooling Microsoft đầy đủ.                                                                                                      |
| Triển khai     | Azure SQL sẵn có nếu sau này deploy lên Azure; Docker image `mssql-server` vẫn chạy được trên Linux nếu cần cross-platform sau này.                                                             |
| Cân nhắc       | Chi phí license khi scale ngoài Express/Developer edition; kém linh hoạt hơn PostgreSQL nếu sau này deploy đa nền tảng/đa cloud — ghi nhận làm rủi ro theo dõi, không chặn quyết định hiện tại. |

EF Core (`Microsoft.EntityFrameworkCore.SqlServer`) làm ORM chính. Schema khởi tạo từ
`TASK_HEADERS`/`PROJECT_HEADERS`/`GOAL_HEADERS`/`HABIT_HEADERS` trong
`apps/google-sheets/src/00_Constants.gs` (Phase 21), cộng thêm cột đồng bộ (`Id` UUID,
`SyncStatus`, `LastSyncedAt`, `Version`) chuẩn bị cho Phase 28.

## Smart Engine

Chưa làm ngay (SmartScore/RiskLevel/RecommendedAction để Phase 29), nhưng data model backend
phải có sẵn các cột này ngay từ Phase 21 để không phải migration phá vỡ sau. Thuật toán tham chiếu
1:1 từ `apps/google-sheets/src/05_SmartEngine.gs` (`SMART_WEIGHTS`, rule-based, có tên, giải
thích được) — không đổi logic khi port sang C#, trừ khi được yêu cầu.

## Sync (Phase 28, chưa làm ngay)

```
Google Sheets ↔ Apps Script ↔ ASP.NET Core API ↔ SQL Server ↔ Windows
```

Cột chuẩn bị trước trong Apps Script data model (không thêm ngay, chỉ ghi nhận): `Id` (UUID),
`SyncStatus`, `LastSyncedAt`, `Version`.

## Auth

Sau này: Email + Google + Microsoft. Không làm Auth trước khi có UI cần đến (Phase 22).
