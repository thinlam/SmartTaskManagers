# Smart Task Manager — Personal Productivity Ecosystem

Quản lý Tasks, Projects, Goals, Habits, Calendar và Productivity của **một cá nhân** (Personal
Mode — không có Team/Member/Owner/Department) trên nhiều nền tảng dùng chung một Design System
và (dần dần) một backend/data layer duy nhất.

## Nền tảng

| Platform | Trạng thái | Ghi chú |
|---|---|---|
| **Google Sheets + Apps Script** | ✅ Production | `apps/google-sheets` — client chính thức hiện tại, không đụng |
| **Windows Desktop** (React + Tauri) | 🟢 Ưu tiên hiện tại | `apps/desktop` — build ra `.exe` / `.msi` |
| **Backend** (ASP.NET Core) | 🟡 Sắp tới (Phase 20+) | `backend/` |
| **Web** (React) | 🟡 Sắp tới (Phase 33) | `apps/web` — dùng chung `packages/*` với Desktop |
| **Android / iOS** | 🔜 Research only | Capacitor, chưa code |
| **Excel** | ⏸ Frozen | `apps/excel` — chưa bắt đầu, giữ chỗ |

## Kiến trúc mục tiêu

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

Windows và Web đều là **client**, không phải nguồn dữ liệu chính. Google Sheets sẽ đồng bộ hai
chiều với backend ở giai đoạn Sync (xem roadmap). Chi tiết đầy đủ: [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md).

## Cấu trúc repo

```
SmartTaskManagers/
├── apps/
│   ├── google-sheets/   Production — Apps Script + clasp (xem README riêng trong thư mục)
│   ├── excel/            Frozen — chưa code, chỉ giữ chỗ
│   ├── desktop/           React + Tauri (Windows) — bắt đầu từ Phase 05
│   └── web/               React (Web) — bắt đầu từ Phase 33
├── packages/              Code dùng chung giữa desktop/web
│   ├── ui/                Design tokens + component library (nguồn: Canva)
│   ├── types/              Task/Project/Goal/Habit/User/Notification...
│   ├── api-client/         taskApi/projectApi/goalApi/habitApi/authApi
│   ├── shared/              utils, date logic, Smart Score (port từ Apps Script)
│   ├── hooks/                useTasks, useProjects...
│   └── config/                eslint/tsconfig/tailwind dùng chung
├── backend/                ASP.NET Core (Clean Architecture) — bắt đầu từ Phase 20
│   ├── SmartTask.Api/
│   ├── SmartTask.Application/
│   ├── SmartTask.Domain/
│   ├── SmartTask.Infrastructure/
│   └── SmartTask.Persistence/
└── docs/
    ├── audit/              Báo cáo audit Phase 00
    ├── architecture/       Quyết định kiến trúc
    ├── design-system/      Token trích xuất từ Canva
    ├── roadmap/             Roadmap đầy đủ theo Phase
    └── claude/              (bên trong apps/google-sheets) quy chuẩn UI/UX cho Apps Script
```

## Design System

Nguồn thiết kế chính thức: [Canva — Smart Task Manager Design System](https://www.canva.com/design/DAHVMpQT8lU/LGRSvF-3CM36hOsQTm3mzg/edit).
Token đã trích xuất tại [`docs/design-system/design-tokens.md`](docs/design-system/design-tokens.md).
Mọi UI mới (Desktop/Web) phải bám theo token này, không tự sáng tác style khác.

## Roadmap

Xem đầy đủ tại [`docs/roadmap/ROADMAP.md`](docs/roadmap/ROADMAP.md) (Phase 00 → 34).

## Bắt đầu

- **Google Sheets**: xem [`apps/google-sheets/README.md`](apps/google-sheets/README.md).
- **Desktop / Web / Backend**: chưa có code, sẽ được bổ sung theo từng Phase — mỗi Phase có
  command, cách chạy và cách test riêng khi được thực hiện.
