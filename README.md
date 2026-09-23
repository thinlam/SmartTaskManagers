# Smart Task Manager — Personal Productivity Ecosystem

Hệ thống quản lý Tasks, Projects, Goals, Habits và Notifications cho **một cá nhân** (Personal
Mode — không có Team/Member/Owner/Department), dùng chung một backend, một Design System và một
bộ code frontend (`packages/*`) trên nhiều nền tảng: Windows Desktop, Web, và Google Sheets.

## Nền tảng

| Platform                            | Trạng thái       | Ghi chú                                                                |
| ----------------------------------- | ---------------- | ---------------------------------------------------------------------- |
| **Backend** (ASP.NET Core + MySQL)  | ✅ Production    | `backend/` — deploy trên Railway, JWT auth, per-account data isolation |
| **Windows Desktop** (React + Tauri) | ✅ Production    | `apps/desktop` — `.msi`/`.exe` installer, `npm run build:tauri`        |
| **Web** (React)                     | ✅ Production    | `apps/web` — dùng chung `packages/*` với Desktop                       |
| **Google Sheets + Apps Script**     | ✅ Production    | `apps/google-sheets` — bản gốc trước khi có backend, vẫn đồng bộ được  |
| **Android / iOS**                   | 🔜 Research only | Capacitor, chưa code                                                   |
| **Excel**                           | ⏸ Frozen         | `apps/excel` — chưa bắt đầu, giữ chỗ                                   |

## Tính năng chính

- **Đăng ký / Đăng nhập** với JWT, mật khẩu có ràng buộc ký tự (chữ hoa, chữ thường, số, tối
  thiểu 8 ký tự) và xác nhận lại mật khẩu khi đăng ký.
- **Cách ly dữ liệu theo tài khoản** — mỗi account chỉ thấy Task/Project/Goal/Habit/Notification
  của chính mình, thực thi bằng EF Core global query filter ở tầng database.
- **Đa ngôn ngữ** Việt/Anh, chuyển đổi tức thì và lưu theo từng tài khoản.
- **Dark mode** theo tài khoản, không giật hình (FOUC) khi mở app.
- **Smart Engine** — tự động tính `SmartScore`/`Risk`/`RecommendedAction` cho từng task mỗi ngày.
- **Notifications** — cảnh báo task quá hạn/sắp hạn, habit sắp mất streak, goal có rủi ro, tự
  sinh theo từng tài khoản mỗi 30 phút.
- **Đồng bộ 2 chiều với Google Sheets** — cho ai vẫn muốn dùng bản Sheets song song với app.

## Kiến trúc

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
                   ASP.NET Core API (Clean Architecture)
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
     Authentication     Smart Engine     Notifications
     (JWT, per-user)    (daily recalc)   (per-user)
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
                            ▼
                    MySQL Database (Railway)
```

Windows, Web và Google Sheets đều là **client** của cùng một backend — không client nào là nguồn
dữ liệu chính. Chi tiết đầy đủ: [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md).

## Cấu trúc repo

```
SmartTaskManagers/
├── apps/
│   ├── google-sheets/    Apps Script + clasp — bản gốc, vẫn đồng bộ với backend
│   ├── excel/             Frozen — chưa code, chỉ giữ chỗ
│   ├── desktop/            React + Tauri (Windows) — build ra .exe/.msi
│   └── web/                React (Web) — dùng chung packages/* với Desktop
├── packages/               Code dùng chung giữa desktop/web
│   ├── ui/                 Design tokens + component library (nguồn: Canva)
│   ├── app-core/            Pages, routing, state (AuthContext, i18n, TasksContext...)
│   ├── types/                Task/Project/Goal/Habit/User/Notification...
│   ├── api-client/            taskApi/projectApi/goalApi/habitApi/authApi
│   ├── shared/                 utils, date logic, Smart Score (port từ Apps Script)
│   ├── hooks/                   useTasks, useProjects, useNotifications...
│   └── config/                   eslint/tsconfig/tailwind dùng chung
├── backend/                 ASP.NET Core (Clean Architecture)
│   ├── SmartTask.Api/         Controllers, Program.cs, BackgroundServices
│   ├── SmartTask.Application/  Services, contracts, use cases
│   ├── SmartTask.Domain/        Entities (framework-free)
│   ├── SmartTask.Infrastructure/ JWT, password hashing, ICurrentUserContext
│   └── SmartTask.Persistence/    EF Core, migrations, MySQL
└── docs/
    ├── audit/               Báo cáo audit Phase 00
    ├── architecture/        Quyết định kiến trúc
    ├── design-system/       Token trích xuất từ Canva
    ├── roadmap/              Roadmap đầy đủ theo Phase + các hạng mục ngoài Phase
    └── superpowers/           Spec/plan cho các hạng mục lớn (i18n, dark mode, auth, ...)
```

## Design System

Nguồn thiết kế chính thức: [Canva — Smart Task Manager Design System](https://www.canva.com/design/DAHVMpQT8lU/LGRSvF-3CM36hOsQTm3mzg/edit).
Token đã trích xuất tại [`docs/design-system/design-tokens.md`](docs/design-system/design-tokens.md).
Mọi UI mới (Desktop/Web) phải bám theo token này, không tự sáng tác style khác.

## Roadmap

Xem đầy đủ tại [`docs/roadmap/ROADMAP.md`](docs/roadmap/ROADMAP.md).

## Bắt đầu

### Yêu cầu hệ thống

- **Node.js + npm** — luôn cần, cho mọi phần frontend.
- **.NET 10 SDK** — cần cho `backend/` (xem [`backend/README.md`](backend/README.md)).
- **MySQL** (local hoặc Docker) — cần nếu chạy backend ở máy, hoặc dùng thẳng backend đã deploy
  trên Railway.
- **Rust + MSVC Build Tools + Windows SDK + WebView2 Runtime** — chỉ cần cho `dev:tauri`/
  `build:tauri`, xem chi tiết tại
  [`apps/desktop/README.md`](apps/desktop/README.md#yêu-cầu-hệ-thống-windows).

### Cài đặt

```bash
npm install                 # ở repo root — cài cho toàn bộ npm workspaces (apps/*, packages/*)
```

### Backend

```bash
cd backend
dotnet run --project SmartTask.Api   # mặc định http://localhost:5277
```

Chi tiết cấu hình connection string, JWT secret, migrations: [`backend/README.md`](backend/README.md).

### Desktop / Web

```bash
npm run dev:desktop         # apps/desktop tại http://localhost:5173 (chạy như web thường)
npm run build:desktop       # production build vào apps/desktop/dist

npm run dev:tauri           # mở apps/desktop như cửa sổ Windows native (Tauri)
npm run build:tauri         # build release + bundle .exe/.msi

npm run dev:web              # apps/web tại http://localhost:5174
npm run build:web            # production build vào apps/web/dist
```

### Dev tooling

```bash
npm run typecheck           # tsc -b (packages/*) + typecheck riêng của apps/desktop, apps/web
npm run lint                 # eslint . (không lint apps/google-sheets, apps/excel)
npm run format                 # prettier --check .
npm run format:write            # prettier --write .
```

### Google Sheets

Xem [`apps/google-sheets/README.md`](apps/google-sheets/README.md).
