# Roadmap

```
PHASE 00  Audit repository                                              ✅ DONE
PHASE 01  Kiến trúc mới + Monorepo strategy                             ✅ DONE (tài liệu này)
PHASE 02  Frontend foundation (workspaces, tsconfig/eslint dùng chung)
PHASE 03  Canva Design Analysis                                         ✅ DONE (docs/design-system)
PHASE 04  Design System (packages/ui)
PHASE 05  React + TypeScript + Vite setup (apps/desktop)
PHASE 06  Tauri Desktop setup
PHASE 07  Application Shell
PHASE 08  Sidebar + Topbar + Navigation (Personal Mode — không có Members)
PHASE 09  Dashboard
PHASE 10  Today
PHASE 11  Inbox
PHASE 12  Tasks
PHASE 13  Projects
PHASE 14  Goals
PHASE 15  Habits
PHASE 16  Calendar
PHASE 17  Kanban
PHASE 18  Analytics (Reports)
PHASE 19  Settings
PHASE 20  Backend architecture (ASP.NET Core, Clean Architecture skeleton)
PHASE 21  Database (EF Core + SQL Server, migrations, schema từ Tasks/Projects/Goals/Habits)
PHASE 22  Authentication (JWT; sau này + Google/Microsoft)
PHASE 23  Tasks API
PHASE 24  Projects API
PHASE 25  Goals API
PHASE 26  Habits API
PHASE 27  Desktop ↔ Backend integration (api-client thật, bỏ mock)
PHASE 28  Google Sheets ↔ Backend Sync
PHASE 29  Smart Engine (port apps/google-sheets/src/05_SmartEngine.gs → C#)
PHASE 30  Notifications
PHASE 31  Windows build
PHASE 32  Installer (.exe / .msi qua Tauri bundler)
PHASE 33  Web deployment (apps/web, dùng chung packages/*)
PHASE 34  Mobile research (Capacitor — chỉ nghiên cứu, không code)
```

Phase 00–01 đã thực hiện (audit + di chuyển `google-sheets/` vào `apps/`, `.gitignore`, README
gốc, cấu trúc thư mục monorepo, docs). Phase 03 (Canva analysis) được gộp thực hiện cùng lúc vì
dữ liệu đã đọc trực tiếp từ Canva trong quá trình audit — kết quả tại
[`docs/design-system/design-tokens.md`](../design-system/design-tokens.md).

Mỗi Phase kế tiếp sẽ được trình bày riêng theo format: Mục tiêu → File tạo/sửa → Full code →
Command → Cách chạy → Cách test → Expected Result → Checklist → Git commit đề xuất.
