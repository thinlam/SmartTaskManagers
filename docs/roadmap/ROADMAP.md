# Roadmap

```
PHASE 00  Audit repository                                              ✅ DONE
PHASE 01  Kiến trúc mới + Monorepo strategy                             ✅ DONE (tài liệu này)
PHASE 02  Frontend foundation (workspaces, tsconfig/eslint dùng chung)          ✅ DONE
PHASE 03  Canva Design Analysis                                         ✅ DONE (docs/design-system)
PHASE 04  Design System (packages/ui)                                          ✅ DONE (partial)
PHASE 05  React + TypeScript + Vite setup (apps/desktop)                       ✅ DONE
PHASE 06  Tauri Desktop setup                                                  ✅ DONE
PHASE 07  Application Shell                                                    ✅ DONE
PHASE 08  Sidebar + Topbar + Navigation (Personal Mode — không có Members)      ✅ DONE
PHASE 09  Dashboard                                                            ✅ DONE (mock data)
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

Phase 02 đã thực hiện: root `package.json` (npm workspaces cho `packages/*`), TypeScript project
references (`tsconfig.json` gốc + `packages/config/tsconfig.base.json`), ESLint 9 flat config
(`packages/config/eslint.config.mjs`, root `eslint.config.mjs` chỉ thêm ignore + project service),
Prettier (`packages/config/prettier.config.mjs`, `.prettierignore` loại trừ `apps/google-sheets`
và `apps/excel` — không bao giờ để tooling Node đụng vào Apps Script). Mỗi package trong
`packages/*` đã có `package.json` (scope `@stm/*`), `tsconfig.json` riêng extend base, và
`src/index.ts` placeholder để `tsc -b`/`eslint`/`prettier --check` chạy sạch ngay từ đầu — đã
verify thật bằng `npm install && npm run typecheck && npm run lint && npm run format`, cả 3 đều
pass. `apps/desktop` sẽ được thêm vào mảng `workspaces` khi tạo ở Phase 05.

Phase 04 đã thực hiện (một phần — component library còn tiếp tục theo từng Phase sau, không làm
hết một lần): `packages/ui/src/tokens/{colors,spacing,typography,radius,shadows}.ts` trích xuất
từ `docs/design-system/design-tokens.md`; `lib/cn.ts` (clsx + tailwind-merge); component đầu tiên
`components/Button` (variant primary/secondary/ghost, size sm/md/lg, dùng tên class Tailwind ngữ
nghĩa thay vì hex cứng). **Chưa verify được bằng mắt** — chưa có Tailwind/Vite nào chạy trong repo
để render; chỉ verify bằng `npm run typecheck` + `npm run lint`, cả hai pass. Việc nối dây Tailwind
thật (chọn version, cấu hình theme) và xác nhận UI khớp Canva bằng mắt dời sang Phase 05/09.
Còn lại: `Card`/`Badge`/`Progress`/`Modal`/`Dropdown`/`Tooltip`/`EmptyState`/... sẽ bổ sung dần khi
các màn hình cụ thể cần đến (không dựng hết component trước khi có màn hình dùng).

Phase 05 đã thực hiện: `apps/desktop` (Vite + React 19 + TypeScript), Tailwind v4 qua
`@tailwindcss/vite` (CSS-first, không có `tailwind.config.js`) — theme canonical đặt tại
`packages/ui/src/styles/theme.css` (map các token trong `packages/ui/src/tokens/*.ts` sang CSS
custom properties `--color-*`/`--radius-*`/`--shadow-*`/`--font-sans`), `apps/desktop/src/index.css`
import lại qua `@stm/ui/theme.css` + khai báo `@source '../../../packages/ui/src'` (bắt buộc —
Tailwind v4 mặc định bỏ qua `node_modules` khi quét class, mà `@stm/ui` được resolve qua workspace
symlink). `src/App.tsx` là trang smoke-test tạm (render các variant `Button`), sẽ bị thay bởi
Application Shell thật ở Phase 07.

Quyết định kỹ thuật đáng chú ý: `apps/desktop` là leaf project (`composite: false, noEmit: true`)
— không nằm trong `references` của `tsconfig.json` gốc (khác với `packages/*`, vốn đều
`composite: true` để có thể được project khác reference); nó tự typecheck qua script riêng
(`npm run typecheck --workspace=apps/desktop`), được gộp vào script `typecheck` gốc.

Verify thật (không giả định): `npm run typecheck`, `npm run lint`, `npm run format` pass sạch;
`npm run build:desktop` build production thành công, và đã kiểm tra trực tiếp nội dung CSS sinh ra
chứa đúng `--color-primary:#4f46e5` và utility `.bg-primary` — xác nhận token Canva → Tailwind →
Button hoạt động đúng đường dây. `npm run dev:desktop` (`localhost:5173`) đã chạy được, nhưng
**chưa xác nhận bằng mắt trong trình duyệt thật** (không có công cụ trình duyệt trong session này).

Còn lại của Phase 04 (`Card`/`Badge`/`Progress`/`Modal`/...) tiếp tục bổ sung dần khi các màn hình
Phase 09+ cần đến, không dựng hết component trước.

Phase 06 đã thực hiện: kiểm tra máy trước khi cài (theo đúng nguyên tắc không giả định) — phát
hiện MSVC Build Tools (VS 2022 Community, `D:\Program Files\...`), Windows SDK 10.0.26100.0 (trên
ổ D) và WebView2 Runtime đã có sẵn; chỉ thiếu Rust, cài qua
`winget install --id Rustlang.Rustup --source winget --accept-source-agreements --accept-package-agreements --silent`
(ra Rust 1.98.1). Cài `@tauri-apps/cli` + `@tauri-apps/api` vào `apps/desktop`, chạy
`tauri init --ci` sinh `apps/desktop/src-tauri/` (Tauri 2.11), chỉnh `identifier` thành
`com.smarttaskmanager.desktop` (giá trị mặc định `com.tauri.dev` không nên dùng thật), dọn
`Cargo.toml` (bỏ placeholder `authors`, sửa `description`).

Quyết định: `Cargo.lock` trong `src-tauri/` **được commit** (khác với dự định ban đầu ở Phase 01
`.gitignore` là loại trừ nó) — vì đây là ứng dụng, không phải thư viện, cần lockfile reproducible;
đã sửa `.gitignore` cho đúng.

Verify thật, không chỉ typecheck: `cargo check` (3 phút, biên dịch toàn bộ crate Tauri +
webview2-com) pass; `cargo build` cho ra `apps/desktop/src-tauri/target/debug/app.exe` (~12MB)
thật; `npm run dev:tauri` chạy thật, mở cửa sổ Windows native (`app.exe` xuất hiện trong
`tasklist`, Vite dev server đúng cổng 5173 theo `devUrl` trong `tauri.conf.json`) — log sạch,
không lỗi. Gặp và xử lý một lỗi thật giữa chừng: chạy `tauri dev` trong khi dev server Phase 05 cũ
(`npm run dev:desktop`) vẫn còn sống ở cổng 5173 khiến Vite mới bật lên cổng 5174 thay vì 5173,
lệch với `devUrl` cấu hình cứng — phải dừng hẳn server cũ rồi chạy lại một lần sạch. **Vẫn chưa
xác nhận bằng mắt** cửa sổ hiển thị đúng UI (không có công cụ chụp màn hình trong session) — người
dùng có thể tự nhìn thấy cửa sổ thật đang mở trên máy khi chạy.

Phase 07 đã thực hiện: `apps/desktop/src/app/routes.ts` — mảng `APP_ROUTES` là nguồn duy nhất cho
toàn bộ 12 route theo đúng taxonomy Personal Mode đã chốt ở Phase 04 (Overview: Dashboard/Today/
Inbox · Planning: Tasks/Projects/Calendar/Kanban · Personal: Goals/Habits · Insights: Analytics/
Smart Assistant · System: Settings), mỗi route có `phase` ghi rõ khi nào được xây thật. `router.tsx`
dùng `createHashRouter` (không phải `createBrowserRouter`) — ứng dụng Tauri đóng gói không có
server để SPA fallback khi deep-link/refresh vào path bất kỳ, hash route (`#/tasks`) luôn resolve
đúng bất kể cách serve. `AppShell.tsx` là layout tạm (nav trái + `<Outlet/>`) dùng chính
`APP_ROUTES` — Phase 08 thay `<nav>` này bằng Sidebar thật (group header, icon, collapse) nhưng
tái dùng nguyên data, không viết lại danh sách route. `PlaceholderPage.tsx` là 1 component dùng
chung cho cả 12 route thay vì 12 file gần giống nhau. `App.tsx` (Phase 05 smoke-test Button) được
thay hoàn toàn bằng `<RouterProvider router={router} />`.

Verify thật: gặp lỗi TypeScript thật (`NavLink`'s `className` render-prop có tham số `isActive`
bị suy luận `any` — sửa bằng type `NavLinkRenderProps` export sẵn từ `react-router-dom`, không
phải `any`/ép kiểu tuỳ tiện). Sau khi sửa: `npm run typecheck`/`lint`/`format` pass sạch;
`npm run build:desktop` build production ra bundle chứa đủ text cả 12 route (đã grep trực tiếp
file JS build ra để xác nhận, không đoán); `npm run dev:tauri` mở cửa sổ Windows thật
(`app.exe` sống ổn định, không crash sau khi chạy vài giây), log sạch. Vẫn chưa xác nhận bằng mắt
việc click điều hướng giữa các trang hiển thị đúng nội dung — không có công cụ chụp màn hình.

Phase 08 đã thực hiện: `packages/ui/src/components/Sidebar` và `.../Topbar` — component thật, bám
Canva (group header uppercase, icon Lucide, active/hover state, collapse). Cả hai **router-agnostic**
(không import `react-router-dom`): `Sidebar` chỉ nhận `href`/`active` đã tính sẵn từ consumer, để
tái dùng được ở `apps/web` (Phase 33) dù router/scheme URL có khác. `apps/desktop/src/app/routes.ts`
thêm field `icon` (component Lucide, verify tên thật bằng cách grep type declaration đã cài — vài
tên đã đổi giữa các bản, ví dụ `BarChart3` cũ nay là `ChartColumn`). `AppShell.tsx` giờ dùng
`Sidebar`/`Topbar` thật thay `<nav>` tạm của Phase 07, tự tính `active` từ `useLocation()`.
Nút "+ New Task" trong `Topbar` hiện chỉ `console.info` — Quick Add thật chưa tồn tại, đó là Phase 12.

Sự cố kỹ thuật thật gặp phải và cách sửa: `@types/react`/`@types/react-dom` từng được khai báo
riêng ở cả `packages/ui` lẫn `apps/desktop`, khiến npm cài **2 bản không hoist về root** — hậu quả:
TypeScript báo lỗi `LucideProps` (type của `lucide-react`, vốn kế thừa `SVGProps` từ `react`)
"thiếu" `className`, vì việc resolve `'react'` từ bên trong `lucide-react` không tìm ra bản types
hoisted duy nhất. Sửa bằng cách gom `@types/react*` về đúng 1 chỗ — root `package.json`
devDependencies — áp dụng nguyên tắc đã rút ra từ lỗi trùng bản `react` thật ở Phase 05.

Verify thật: sau khi sửa, `npm run typecheck`/`lint`/`format` pass sạch; `npm run build:desktop`
build production thành công (1924 module do lucide-react có icon riêng từng module — bundle
358KB/gzip 113KB, chưa tối ưu tree-shaking sâu, không phải trọng tâm Phase 08); đã grep trực tiếp
CSS/JS build ra xác nhận `bg-primary-light`, `bg-danger`, text "Smart Task"/"Overview"/"Planning"/
"Insights"/"Search tasks..." đều có mặt. `npm run dev:tauri` mở cửa sổ Windows thật, ổn định không
crash. Vẫn chưa xác nhận bằng mắt Sidebar/Topbar hiển thị đúng theo Canva — không có công cụ chụp
màn hình trong session; bạn có thể tự xem trực tiếp trên máy.

Phase 09 đã thực hiện: trước khi code, đọc thật `computeDashboardData_()` trong
`apps/google-sheets/src/06_Dashboard.gs` (bản Personal Mode đã tồn tại và được vetted) thay vì vẽ
lại từ Canva Frame 03 gốc (bản team, có Owner/Team Capacity) — giữ đúng 5 KPI (Due Today/Overdue/
Focus Time/Weekly Progress/Streak), Focus Now, và đổi "Project Health"+"Team Capacity" (team)
thành "My Areas" (theo `getAreaProgress_()`, nhóm theo Area thay vì theo người).

`packages/types/src/index.ts` có nội dung thật đầu tiên: `Area`/`Priority`/`TaskStatus`/`Risk`,
khớp `LOOKUP_LISTS` trong `00_Constants.gs`. `packages/ui` thêm 5 component mới:
`Badge`/`PriorityBadge` (dùng token `priority-*` riêng, không phải tone chung — 2 bộ giá trị hex
khác nhau), `Progress`, `StatCard`, `TaskCard` (dùng chung dự kiến cho cả Today, Phase 10),
`SmartInsightCard`. `packages/ui` giờ phụ thuộc `@stm/types` (chỉ phụ thuộc kiểu, không runtime).
`apps/desktop/src/mock/dashboard.ts` là dữ liệu tĩnh — `smartScore`/`recommendedAction` **không
phải tính toán thật**, chỉ là placeholder chờ Smart Engine (Phase 29); ghi rõ trong comment để
không ai nhầm là số thật.

Verify thật: `npm run typecheck`/`lint`/`format` pass sạch ngay từ lần đầu (không phát sinh lỗi
mới); `npm run build:desktop` build production thành công, CSS tăng từ 12.4KB → 16.72KB, đã grep
trực tiếp xác nhận `priority-critical`/`priority-high`/`priority-medium` và toàn bộ text Dashboard
("Focus Now", "My Areas", "Smart Insights", "Finish portfolio case study"...) có trong bundle.
`npm run dev:tauri` mở cửa sổ Windows thật, ổn định. Vẫn chưa xác nhận bằng mắt layout/màu hiển thị
đúng theo Canva — không có công cụ chụp màn hình trong session.

Mỗi Phase kế tiếp sẽ được trình bày riêng theo format: Mục tiêu → File tạo/sửa → Full code →
Command → Cách chạy → Cách test → Expected Result → Checklist → Git commit đề xuất.
