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
PHASE 10  Today                                                                ✅ DONE (mock data)
PHASE 11  Inbox                                                                ✅ DONE (local CRUD)
PHASE 12  Tasks                                                                ✅ DONE (click-tested thật)
PHASE 13  Projects                                                             ✅ DONE (click-tested thật)
PHASE 14  Goals                                                                ✅ DONE (click-tested thật)
PHASE 15  Habits                                                               ✅ DONE (chưa click-test — xem ghi chú)
PHASE 16  Calendar                                                             ✅ DONE (chưa click-test — xem ghi chú)
PHASE 17  Kanban                                                               ✅ DONE (chưa click-test — xem ghi chú)
PHASE 18  Analytics (Reports)                                                 ✅ DONE (chưa click-test — xem ghi chú)
PHASE 19  Settings                                                             ✅ DONE (chưa click-test — xem ghi chú)
PHASE 20  Backend architecture (ASP.NET Core, Clean Architecture skeleton)     ✅ DONE (build+run verify thật)
PHASE 21  Database (EF Core + SQL Server, migrations, schema từ Tasks/Projects/Goals/Habits)   ✅ DONE (áp migration thật lên SQL Server Express)
PHASE 22  Authentication (JWT; sau này + Google/Microsoft)                     ✅ DONE (curl thật cả luồng register/login/protected)
PHASE 23  Tasks API                                                             ✅ DONE (curl thật cả 9 trường hợp CRUD)
PHASE 24  Projects API                                                          ✅ DONE (curl thật, xác nhận cascade clear xuyên entity)
PHASE 25  Goals API                                                             ✅ DONE (curl thật, xác nhận cascade clear Tasks.GoalId)
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

Phase 10 đã thực hiện: cùng cách làm với Phase 09 — đọc thật `computeTodayData_()` trong
`apps/google-sheets/src/07_Today.gs` trước khi code, giữ đúng 5 KPI (Due Today/Overdue/Focus
Load/Completed/Quick Wins), Best Next Action, 3 nhóm task (Do Now/Scheduled/Quick Wins,
mỗi nhóm accent màu khác nhau qua `writeTodaySection_()`), End-of-Day Review.

Đúc kết đáng chú ý: đây là lần thứ 2 cần "shape 1 task hiển thị trên card" (Dashboard's Focus Now,
giờ thêm Today's 3 nhóm) — thay vì định nghĩa `TodayTask` riêng trong `apps/desktop/src/mock/
today.ts`, chuyển thẳng thành `TaskSummary` dùng chung trong `packages/types` (kèm sửa lại
`apps/desktop/src/mock/dashboard.ts` để dùng chung type này thay vì `FocusTask` cũ). `EmptyState`
(đã hứa từ Phase 04 nhưng chưa cần) được xây thật ở Phase này — Do Now/Scheduled/Quick Wins đều có
thể rỗng và cần trạng thái rỗng rõ ràng theo đúng nguyên tắc UI_UX_MASTER_PROMPT.md §15.

`router.tsx` refactor nhỏ: chuyển từ ternary đơn thành map `PAGE_BY_PATH` để mở rộng route thật
không phình to chuỗi if/else.

Verify thật: `npm run typecheck`/`lint`/`format` pass sạch; `npm run build:desktop` build production
thành công (CSS 16.72KB → 17.6KB), grep xác nhận "Best Next Action"/"Do Now"/"Scheduled"/"Quick
Wins"/"End-of-Day Review" có trong bundle. `npm run dev:tauri` mở cửa sổ Windows thật, ổn định.
Vẫn chưa xác nhận bằng mắt — không có công cụ chụp màn hình trong session.

Phase 11 đã thực hiện: khác với Phase 09/10, **không có** Frame Canva hay view Google Sheets nào
cho Inbox — kiểm tra kỹ trước khi code và xác nhận đây là màn hình mới thuần từ roadmap gốc, dựng
trên phần data model đã thật (`Status = 'Inbox'` là default mà Quick Add gán, xem
`apps/google-sheets/src/10_QuickAdd.gs`). Theo đúng gợi ý của người dùng, đây là màn hình đầu tiên
có **CRUD tương tác thật** thay vì chỉ hiển thị: `QuickCaptureInput` (Create), nút Complete/Delete
trên mỗi `InboxTaskRow` (Update/Delete) — tất cả qua `useState`, cố ý **không** dùng `localStorage`
để tránh tạo ấn tượng sai là đã persist; refresh app sẽ mất hết, persistence thật là Phase 27.

`packages/ui` thêm `IconButton` (đã hứa từ Phase 04, giờ mới có nhu cầu thật) — ép `aria-label`
bắt buộc ở kiểu dữ liệu (không phải quy ước bằng lời) vì nút chỉ-icon không có cách nào khác để
screen reader biết chức năng. `InboxTaskRow` ghép `TaskCard` (đã có) với 2 `IconButton` mới —
không viết lại UI hiển thị task lần thứ 3.

Verify thật: `npm run typecheck`/`lint`/`format` pass sạch; `npm run build:desktop` build production
thành công (CSS 17.6KB → 17.91KB), grep xác nhận text Inbox có trong bundle. `npm run dev:tauri` mở
cửa sổ Windows thật, ổn định. **Chưa tự tay click thử thêm/complete/xóa task** — không có công cụ
trình duyệt/chụp màn hình trong session để thao tác hoặc xác nhận bằng mắt; logic đã qua typecheck
và code review thủ công nhưng hành vi tương tác thật (click handler, re-render list) chưa được
click-test trực tiếp. Bạn nên tự thử 3 thao tác này trên máy trước khi coi Phase 11 là xong hẳn.

Phase 12 (bước 1/2 — Tasks list) đã thực hiện: trước khi code, đọc thật `computeTaskCounts_()`
trong `apps/google-sheets/src/08_Tasks.gs` (Active = không phải Inbox và không phải Completed) và
xác nhận Frame 05 của Canva (bản team, có cột Owner) cần bỏ Owner cho Personal Mode.

Vì đây là màn đầu tiên cần **entity Task đầy đủ** (không phải `TaskSummary` rút gọn), Phase này mở
rộng theo nhiều lớp:

- `packages/types`: thêm `Task` (tập con thực dụng của 27 cột `TASK_HEADERS`, ngày tháng là chuỗi
  ISO, không phải `Date`, để không đổi shape khi qua ranh giới API ở Phase 27).
- `packages/hooks`: `useTasks` — hook thật đầu tiên, store cục bộ (`useState` bên trong) nhưng
  public API (`tasks` + `addTask`/`updateTask`/`deleteTask`/`completeTask`) cố ý giống hệt hình
  dạng một hook nối API thật, để trang gọi nó không cần sửa khi Phase 27 tới.
- `packages/shared`: `formatDueLabel` — hàm thật đầu tiên, tính nhãn hạn tương đối từ `dueDate`
  ISO (không port 1:1 `todayDueLabel_()` của Sheets vì hàm đó bỏ số ngày để vừa ô hẹp).
- `packages/ui`: `TaskCard` mở rộng thêm `status?`/`progress?` (tùy chọn, không phá vỡ 2 nơi đang
  dùng) — vẫn 1 component cho 3 ngữ cảnh (Focus Now, Focus Today, Tasks list) thay vì viết row-card
  lần thứ 4. `StatusBadge` mới, cùng mẫu với `PriorityBadge`.
- `apps/desktop`: `QuickCaptureInput` (trước ở `pages/Inbox/`) chuyển lên `src/components/` vì giờ
  Inbox lẫn Tasks cùng dùng.

**Sự cố thật phát hiện khi xây `StatusBadge`:** token màu Status (`packages/ui/src/tokens/colors.ts`,
`theme.css`, `docs/design-system/design-tokens.md`) từ Phase 04 lấy nguyên 8 trạng thái Canva Frame
02 (bản team) — nhưng `TaskStatus` thật của Personal Mode (`00_Constants.gs`) chỉ có 5 giá trị khác
tên (Inbox/To Do/In Progress/Waiting/Completed). Đã sửa cả 3 file cho khớp domain thật — đây là lỗi
tồn tại từ Phase 04 đến giờ mới bị phát hiện vì chưa có component nào thật sự cần hiển thị Status.

**Quyết định tách Phase 12 thành 2 bước:** bước này chỉ có Tasks list (summary, filter, search,
Create qua quick-add title-only, Complete/Delete theo dòng) — **chưa có** sửa Area/Priority/
Deadline/Project/Tag/Description (cần form đủ chỗ, không hợp inline trong list) và **chưa nối**
nút "+ New Task" ở Topbar (đợi Task Detail thật để mở, không phải form tạm này). Bước 2 (Task
Detail) sẽ làm tiếp theo.

Verify thật: `npm run typecheck`/`lint`/`format` pass sạch ngay từ đầu (không phát sinh lỗi type
nào dù thêm nhiều package cùng lúc); `npm run build:desktop` build production thành công (CSS
17.91KB → 19.49KB), grep xác nhận cả 5 token `status-*` mới và text Tasks ("Manage, prioritize",
"Search tasks by name", "All statuses"/"All priorities") có trong bundle. `npm run dev:tauri` mở
cửa sổ Windows thật, ổn định. Chưa tự tay click-test filter/search/complete/xóa/thêm — không có
công cụ trình duyệt trong session.

Phase 12 (bước 2/2 — Task Detail) đã thực hiện. Vấn đề kiến trúc phải giải quyết **trước khi
code**: nút "+ New Task" ở Topbar là toàn cục (mọi trang), nhưng `useTasks()` (bước 1) gọi cục bộ
trong `TasksPage` — mỗi lần mount lại mất state, Topbar không có cách ghi vào đúng danh sách đang
hiển thị. Giải quyết bằng `TasksProvider` (React Context, `apps/desktop/src/state/TasksContext.tsx`)
bọc quanh `<RouterProvider/>` trong `App.tsx`, gọi `useTasks(MOCK_TASKS)` một lần duy nhất cho toàn
app. Nhân tiện phát hiện và sửa luôn: Inbox (Phase 11) có mock tách biệt hoàn toàn khỏi Tasks —
complete một task ở Inbox không phản ánh sang Tasks và ngược lại. Đã gộp Inbox vào cùng
`TasksContext` (Inbox = `tasks.filter(status==='Inbox')`), xoá `mock/inbox.ts`.

`packages/ui` thêm `Drawer` (panel phải + backdrop, Escape/backdrop để đóng; **chưa có focus trap
đầy đủ** — ghi nhận rõ, không giấu). `apps/desktop/src/components/TaskDetailDrawer.tsx` là 1 form
dùng chung cho cả Create (từ Topbar, mọi trang) và Edit (từ dòng task, Tasks/Inbox) — phân biệt
qua `editingTask` (`null` = tạo mới) trong context. `useTasks`'s `NewTaskInput` mở rộng thêm
`description`/`status`/`startDate`/`progress`/`tags` để tạo task đầy đủ field trong 1 lệnh gọi,
không cần tạo-rồi-vá. Chưa có Project field trong form (Projects là Phase 13, chưa có gì để chọn).

**Verify bằng tương tác thật lần đầu tiên trong toàn bộ project:** công cụ `claude-in-chrome` khả
dụng trở lại trong phiên này (trước đó, ở Phase 05, người dùng đã chọn tiếp tục không cần công cụ
trình duyệt). Đã mở `npm run dev:desktop` trong Chrome thật và click qua toàn bộ luồng: mở Edit
Drawer trên task có sẵn (dữ liệu hiện đúng) → đổi Priority/Status/Progress → Save (dòng trong list
cập nhật đúng) → mở "+ New Task" từ Topbar tại trang Tasks (form trống, mặc định hợp lý) → tạo task
mới (xuất hiện đúng ở cả Tasks lẫn Inbox, xác nhận context dùng chung hoạt động) → Complete (biến
mất khỏi Inbox) → Delete (biến mất khỏi Tasks, `EmptyState` hiện đúng) → search "gym" (lọc đúng).
KPI summary cập nhật chính xác sau mỗi thao tác. **Không phát hiện lỗi nào** trong toàn bộ luồng —
mọi thứ hoạt động đúng thiết kế ngay từ lần thử đầu. Cũng xác nhận lại `npm run dev:tauri` (cửa sổ
native) vẫn mở ổn định sau khi test qua trình duyệt.

Phase 13 đã thực hiện: đọc thật `computeProjectMetrics_()`/`computeProjectHealth_()`/
`getProjectTopFocusText_()`/`getProjectNextAction_()`/`getProjectTargetLabel_()` trong
`apps/google-sheets/src/14_Projects.gs` trước khi code — port đầy đủ sang `packages/shared`, giữ
nguyên trọng số (`PROJECT_HEALTH_WEIGHTS`), ngưỡng bucket, và câu chữ khuyến nghị. Health **không
lưu trên entity Project** — luôn tính trực tiếp từ task liên kết (tránh dữ liệu cũ/lệch, khác cách
Sheets cache lại giá trị Health vào cột).

`packages/types` thêm `Project` + `ProjectHealth` (type riêng, không dùng chung `Risk` dù cùng
thang màu — tránh lẫn risk của Task với health của Project trong type system). `packages/ui` thêm
`ProjectCard` (port layout 6 dòng từ `writeProjectCard_()`) và `ProjectHealthBadge` (dùng thẳng
token `risk-*`, không tạo bộ token trùng — đúng tinh thần Frame 01 §5 "dùng chung 1 thang màu").
`packages/hooks` thêm `useProjects`, cùng pattern `useTasks`, có ghi nhận rõ giới hạn: xoá project
không dọn `projectId` của task liên kết (chấp nhận được cho local demo, backend thật Phase 27 cần
xử lý đúng).

Đúng như đã hứa cuối Phase 12: `TaskDetailDrawer` giờ có field **Project** thật (đọc từ
`ProjectsContext` mới, độc lập với `TasksContext`, cả hai cùng mount trong `App.tsx`). Đây là lần
đầu 2 context riêng biệt cùng được một trang đọc (`ProjectsPage` đọc cả `useProjectsContext()` lẫn
`useTasksContext()` để tính metrics theo task thật).

Verify thật: `npm run typecheck`/`lint`/`format` pass sạch ngay từ đầu dù thêm rất nhiều file cùng
lúc (types/shared/ui/hooks/desktop). `npm run build:desktop` build production thành công. Verify
bằng **click-test thật** (claude-in-chrome): cả 4 project mock tính đúng health khớp tính tay
trước khi code (Attention/At Risk/At Risk/Healthy); gán task "Water the plants" vào project rỗng
"Fitness Reset" qua field Project mới → xác nhận card cập nhật Open 1, health tự chuyển
HEALTHY→ATTENTION, Top Focus/Next đổi đúng theo thời gian thực; tạo/xoá project qua quick-add, KPI
cập nhật đúng mỗi lần. **Không phát hiện lỗi nào** trong toàn bộ luồng.

Phase 14 đã thực hiện: trước khi code, kiểm tra kỹ phía Sheets và xác nhận Goals **không có** view
engine tương đương `14_Projects.gs` (không có `15_Goals.gs`) — chỉ có CRUD thô (`GOAL_HEADERS`,
`createGoal_()`/`getAllGoals_()` trong `00_Constants.gs`/`03_Data.gs`) cộng với link một chiều từ
Task (`TASK_HEADERS`'s `GoalId`, đã dùng ở Quick Add và Task Details phía Sheets). Đây là khác biệt
quan trọng nhất so với Phase 13: `Goal.progress`/`Goal.status` là field người dùng **nhập tay**
(`createGoal_()` chỉ set mặc định `Progress: 0, Status: "On Track"` rồi để nguyên), không tính từ
task liên kết — nên Phase này **không thêm hàm nào vào `packages/shared`** (tái dùng thẳng
`formatTargetLabel` từ Phase 13 cho `targetDate`).

`packages/types` thêm `Goal` + `GoalStatus`, và `Task.goalId` (link 1 chiều, cùng cơ chế
`projectId`). `packages/ui` thêm `GoalStatusBadge` (dùng thẳng tone chung `info`/`warning`/`success`
của `Badge` — Goals không có bộ token màu riêng như Status/Priority/Risk vì không có Frame team gốc
nào để lệch ra khỏi) và `GoalCard` (đơn giản hơn hẳn `ProjectCard` có chủ đích: không có health
score/top focus/next action để hiển thị, chỉ tên/badge/area/target/progress/số task liên kết —
số task liên kết là phép đếm thẳng trên `Task.goalId`, không phải metrics engine). `packages/hooks`
thêm `useGoals`, cùng pattern `useProjects` kể cả giới hạn đã ghi nhận (xoá goal không dọn `goalId`
của task liên kết).

`apps/desktop` thêm `GoalsProvider` + `GoalDetailDrawer` (form Create/Edit **có** Status select và
Progress range — khác `ProjectDetailDrawer` không có field Health) + trang Goals (`GoalsPage`/
`GoalRow`, KPI Total/On Track/At Risk/Avg Progress là rollup trực tiếp từ field đã lưu). Đúng như
đã hứa ở Phase 13's field Project: `TaskDetailDrawer` giờ có thêm field **Goal** (đọc từ
`GoalsContext` mới, độc lập, cùng cơ chế field Project).

Verify thật: `npm run typecheck`/`lint`/`format` pass sạch ngay từ đầu. `npm run build:desktop`
build production thành công. Verify bằng **click-test thật** (claude-in-chrome): 3 goal mock hiển
thị đúng status/progress/target/số task liên kết (1/2/0); sửa status 1 goal từ On Track sang At
Risk qua Edit Drawer → card và KPI cập nhật ngay; tạo task mới gán Goal = "Run a 5K" từ Task Detail
→ quay lại Goals, card "Run a 5K" đổi từ "No tasks linked yet" sang "1 task linked" theo thời gian
thực (xác nhận liên kết Task→Goal qua 2 context riêng biệt hoạt động đúng); tạo/xoá goal qua
quick-add, KPI cập nhật đúng mỗi lần. **Không phát hiện lỗi nào** trong toàn bộ luồng.

Phase 15 đã thực hiện: trước khi code, grep toàn bộ `apps/google-sheets/src` để xác nhận Habits
**đứng riêng hoàn toàn** — không có `HabitId` nào trên `TASK_HEADERS` (khác `projectId`/`goalId`),
và cũng không có hàm hoàn thành habit nào để port (`createHabit_()`/`getAllHabits_()` là toàn bộ
những gì tồn tại phía Sheets). Vì vậy Phase này **không sửa `TaskDetailDrawer`** — không có field
Habit nào để thêm.

`packages/types` thêm `Habit` + `HabitFrequency`, khớp `HABIT_HEADERS`. `packages/shared` **không
thêm hàm nào** (giống Phase 14) — nhãn "last done" của Habit không có khái niệm hạn/quá hạn để
đáng tách hàm dùng chung, viết thẳng trong `HabitRow.tsx`. `packages/ui` thêm `HabitCard` (tên,
`Badge` tần suất, icon `Flame` + số streak không kèm đơn vị — đúng comment "consecutive days/weeks"
của cột `Streak`, Frequency quyết định đơn vị nào chứ card không đoán — thanh progress chỉ hiện
khi có target, nút "Check in today"). `packages/hooks` thêm `useHabits`, thêm hàm `checkInHabit`
— thiết kế hợp lý tối thiểu (không phải port): +1 streak, +1 completedCount, set
`lastCompletedDate` = hôm nay, no-op nếu hôm nay đã check-in rồi; cố ý không có logic reset streak
khi bỏ lỡ ngày vì không có tham chiếu Sheets nào để verify công thức đó.

`apps/desktop` thêm `HabitsProvider` + `HabitDetailDrawer` (chỉ Name/Frequency/Target count — không
sửa tay Streak/CompletedCount/LastCompletedDate) + trang Habits (`HabitsPage`/`HabitRow`, KPI Total/
Checked In Today/Best Streak/Total Check-ins — "Best Streak" mô phỏng đúng `getBestHabitStreak_()`
trong `apps/google-sheets/src/06_Dashboard.gs`, tham chiếu Sheets thật duy nhất cho Habits dù đó là
KPI của Dashboard). Dashboard's KPI "Streak" tĩnh (Phase 09) **chưa được nối** sang dữ liệu Habit
thật — để dành Phase sau, ngoài phạm vi Phase này.

Verify thật: `npm run typecheck`/`lint`/`format` pass sạch ngay từ đầu. `npm run build:desktop`
build production thành công. **Chưa click-test tương tác thật** — công cụ `claude-in-chrome` không
kết nối được trong phiên làm việc này (môi trường `E:\SmartTaskManager`, khác phiên trước dùng
`D:\SmartTaskManagers`), kể cả sau khi thử lại — có vẻ là sự cố phía extension, không phải thiếu
công cụ. Nên tự thử trên máy trước khi coi Phase 15 là xong hẳn, đặc biệt luồng "Check in today".

**Cài đặt lại môi trường Windows native cho máy này** (theo yêu cầu người dùng "xem đã cài hết môi
trường chưa và chưa cài giúp tui hết đi và test lại"): kiểm tra thật trước khi cài (đúng nguyên tắc
không giả định, giống Phase 06) — phát hiện MSVC Build Tools (VS 2022 Community,
`E:\Program Files\...`), Windows SDK và WebView2 Runtime đã có sẵn; chỉ thiếu Rust hoàn toàn (không
có cả thư mục `.cargo`). Cài qua
`winget install --id Rustlang.Rustup --source winget --accept-source-agreements --accept-package-agreements --silent`,
ra Rust 1.98.1 — khớp đúng bản đã dùng ở Phase 06 trên máy `D:\SmartTaskManagers`. Verify thật:
`cargo check` trong `apps/desktop/src-tauri` pass sạch (biên dịch toàn bộ crate Tauri +
webview2-com, ~1 phút lần đầu); `npm run dev:tauri` build và chạy `app.exe` thật — cửa sổ Windows
native mở, process ổn định (`Get-Process app` → `Responding: True` sau vài giây, không crash).
Xác nhận app chạy đúng ở tầng native, không chỉ qua `npm run dev:desktop`/trình duyệt. Đã thử lại
`claude-in-chrome` sau khi cài xong — vẫn không kết nối được, nên click-test tương tác thật cho
Phase 15 vẫn còn treo, không phải do thiếu môi trường build.

Phase 16 đã thực hiện: đọc thật `computeCalendarData_()`/`writeCalendarKpis_()`/
`calendarTaskSort_()`/`getCalendarTaskTone_()`/`getCalendarGridStart_()` trong
`apps/google-sheets/src/12_Calendar.gs` (file lớn nhất từ trước đến giờ, ~3660 dòng, vì render
trực tiếp lên lưới ô spreadsheet) trước khi code — port công thức, không port cách vẽ ô Sheets.

`packages/shared` thêm `calendarMetrics.ts`: `computeCalendarMonthData` (cùng 4 bộ lọc KPI —
Scheduled/Due Today/Overdue/Completed — cùng lưới 6 tuần bắt đầu Thứ Hai, cùng agenda quá hạn+sắp
tới), `sortCalendarTasks` (open trước completed, rồi priority, rồi SmartScore — y hệt
`calendarTaskSort_`), `getCalendarTaskTone` (Completed > quá hạn > Critical/Urgent > High > mặc
định — y hệt `getCalendarTaskTone_`, chỉ đổi hex thành tên tone chung). `days` (mảng 42 ô) thay cho
`tasksByDate` (map) trong bản gốc, vì đó là thứ lưới React cần render trực tiếp.

`apps/desktop` thêm trang Calendar (`CalendarPage`/`CalendarGrid`/`CalendarDayCell`/
`CalendarAgenda`) — **không context/store mới, không component `packages/ui` mới**: Calendar chỉ
đọc `useTasksContext()` và tái dùng `TaskDetailDrawer` sẵn có (click 1 task trong ô ngày hoặc dòng
Agenda mở đúng Edit Drawer, giống `openSelectedCalendarTask_()` phía Sheets); lưới tháng là bố cục
đặc thù 1 màn hình nên ở lại `apps/desktop`, Agenda tái dùng thẳng `TaskCard`. Prefix ký hiệu
✓/!/◆/• (để vừa ô hẹp Sheets) thay bằng icon Lucide thật (`Check`/`TriangleAlert`/`Diamond`/
`Circle`) — desktop có đủ chỗ hiển thị icon SVG.

**Sự cố thật gặp khi build:** `noUncheckedIndexedAccess` khiến `tasksByDate[key].sort(...)` sau
`Object.keys()` báo lỗi possibly-undefined dù logic đảm bảo key luôn tồn tại — sửa bằng
`Object.values(tasksByDate).forEach(...)`.

Verify thật: `npm run typecheck`/`lint`/`format` pass sạch (sau khi sửa lỗi trên). `npm run
build:desktop` build production thành công — grep trực tiếp bundle xác nhận text Calendar thật có
mặt, không phải code chết. `npm run dev:tauri` mở `app.exe` thật, ổn định. **Chưa click-test tương
tác thật** — `claude-in-chrome` vẫn không kết nối được dù đã thử lại nhiều lần trong phiên này (môi
trường build native đã xác nhận đầy đủ ở Phase 15). Nên tự thử trên máy trước khi coi Phase 16 là
xong hẳn: chuyển tháng, click task mở đúng Edit Drawer, kiểm tra "+N more" khi 1 ngày quá 4 task.

Phase 17 đã thực hiện: đọc thật `computeKanbanData_()`/`getKanbanLaneSubtitle_()`/
`getKanbanEmptyText_()`/`getKanbanProgressTone_()`/`getKanbanScoreTone_()`/`getKanbanDueTone_()`/
`getKanbanLaneTone_()` trong `apps/google-sheets/src/11_Kanban.gs` (3192 dòng) trước khi code —
port công thức 5 lane/sort/tone/WIP-limit, không port cách vẽ ô Sheets.

`packages/shared` thêm `kanbanMetrics.ts`: `computeKanbanBoardData` (5 lane đúng thứ tự
`TaskStatus`, mỗi lane sort riêng — Completed theo `completedDate` mới nhất trước, lane khác theo
SmartScore giảm dần rồi due date tăng dần — cùng 4 KPI Open/Due Today/Overdue/Completed và
`focusTask`), cộng các hàm tone/label cho Due/Progress/Score/lane subtitle/empty-text, tất cả giữ
đúng ngưỡng và câu chữ gốc. Khác biệt có chủ đích duy nhất: bỏ ký tự `\n` literal trong empty-text
(chỉ để vừa ô Sheets hẹp) thành câu liền.

`apps/desktop` thêm trang Kanban (`KanbanPage`/`KanbanLane`/`KanbanCard`) — **không context/store
mới, không component `packages/ui` mới** (cùng nguyên tắc Calendar): đọc `useTasksContext()` (click
card mở Edit Drawer, giống `openSelectedKanbanTask_()`) và thêm `useProjectsContext()` để tra
`projectId` ra tên Project cho dòng meta của card. `KanbanCard` tái dùng `PriorityBadge` có sẵn thay
vì port riêng dải màu priority. Lane "In Progress" cảnh báo tone danger khi vượt WIP limit (>3),
banner "Top Focus" hiển thị task SmartScore cao nhất còn mở — đúng vị trí/nội dung bản gốc.

**Sự cố thật gặp khi build:** mảng `const parts = [task.area]` bị TypeScript suy luận kiểu `Area[]`
khiến `push()` tên Project (chuỗi) báo lỗi — sửa bằng khai kiểu tường minh `string[]`.

Verify thật: `npm run typecheck`/`lint`/`format` pass sạch (sau khi sửa lỗi trên). `npm run
build:desktop` build production thành công — grep trực tiếp bundle xác nhận text Kanban thật có
mặt. `npm run dev:tauri` mở `app.exe` thật, ổn định. **Chưa click-test tương tác thật** —
`claude-in-chrome` vẫn không kết nối được dù đã thử lại (môi trường build native đã xác nhận đầy đủ
từ Phase 15). Nên tự thử trên máy trước khi coi Phase 17 là xong hẳn: click card mở đúng Edit
Drawer, kiểm tra "+N more" khi lane quá 7 task, kiểm tra cảnh báo WIP khi In Progress quá 3 task.

Phase 18 đã thực hiện: kiểm tra kỹ trước khi code (đúng nguyên tắc audit-trước-code) và xác nhận
`apps/google-sheets/docs/claude/MODULE_PROMPTS.md` §10 chỉ **đặc tả** `15_Reports.gs` — file đó
**chưa từng được build thật** (liệt kê toàn bộ 15 file `.gs` production xác nhận không tồn tại).
Yêu cầu duy nhất còn giá trị từ đặc tả là nguyên tắc, không phải code có sẵn để port: "Chỉ sử dụng
dữ liệu thực. Không bịa analytics. Không thêm team metrics."

`packages/shared` thêm `analyticsMetrics.ts` — phần lớn là thiết kế mới tối thiểu (summary/priority
distribution/weekly trend/insights), chỉ đếm/tổng hợp trực tiếp trên field Task/Project thật, không
điểm số hay suy luận nào như Smart Engine. Ngoại lệ: `getAreaProgress` **có port thật** từ
`getAreaProgress_()` trong `06_Dashboard.gs` (hàm có thật dù Dashboard chưa gọi nó — vẫn là mock
tĩnh Phase 09, nối dây thật là Phase 27, ngoài phạm vi ở đây); `getProjectProgressList` tái dùng
thẳng `computeProjectMetrics` (Phase 13).

`apps/desktop` thêm trang Analytics (`AnalyticsPage`/`WeeklyTrendChart`) — không thêm thư viện
chart nào, `WeeklyTrendChart` là bar chart CSS thuần, đúng tinh thần "professional, minimal, không
biến thành dashboard quá nhiều chart" của đặc tả gốc. Có `EmptyState` khi chưa có task nào, không để
KPI toàn số 0 vô nghĩa (đúng UI_UX_MASTER_PROMPT.md §15).

Verify thật: `npm run typecheck`/`lint`/`format` pass sạch ngay từ lần đầu. `npm run build:desktop`
build production thành công — grep trực tiếp bundle xác nhận text Analytics thật có mặt. `npm run
dev:tauri` mở `app.exe` thật, ổn định. **Chưa click-test tương tác thật** — `claude-in-chrome` vẫn
không kết nối được dù đã thử lại. Nên tự thử trên máy trước khi coi Phase 18 là xong hẳn: xác nhận
các con số khớp đúng dữ liệu task thật đang có, Weekly Trend đếm đúng theo `completedDate`.

Phase 19 đã thực hiện: đọc thật `DEFAULT_SETTINGS`/`getSetting_()` trong `00_Constants.gs`/
`01_Utils.gs` trước khi code, và grep toàn bộ `apps/google-sheets/src` để biết chính xác key nào
**thật sự được đọc** ở đâu đó — chỉ 5/18 key (`DefaultStatus`/`DefaultPriority`/
`DefaultEstimateMinutes` dùng bởi `createTask_()`/Quick Add, `DueSoonDays`/`DailyFocusLimitHours`
dùng bởi Dashboard/Today) có consumer thật; 13 key còn lại được định nghĩa nhưng chưa hàm nào đọc.
Sheets cũng không có hàm ghi settings nào (`getSetting_()` chỉ đọc) — Settings được sửa bằng tay
trực tiếp trên sheet.

`packages/types` thêm `Settings` — 1 object duy nhất khớp 1:1 18 key/4 category của
`DEFAULT_SETTINGS`, không phải entity list (khác Task/Project/Goal/Habit). `packages/hooks` thêm
`useSettings` — đơn giản hơn các hook trước, chỉ `settings` + `updateSettings(patch)`, không
add/delete. `packages/ui` thêm `Switch` (đã hứa từ Phase 04, giờ mới có nhu cầu thật cho 4 toggle
Smart Engine).

`apps/desktop` thêm `SettingsProvider` + trang Settings — form sửa tại chỗ (không Drawer, không nút
Save riêng, mỗi field cập nhật ngay khi đổi, giống settings screen app native). **Cố ý không nối**
Settings vào nơi tiêu thụ thật nào (default khi tạo Task, dữ liệu thật Dashboard/Today) — cùng mức
kiềm chế đã áp dụng cho KPI Streak của Dashboard ở Phase 15, để dành Phase sau.

**Sự cố thật gặp khi viết code:** JSDoc comment chứa chuỗi `FocusDays*/` — `*/` xuất hiện tình cờ
trong văn bản đóng khối comment sớm, gây lỗi cú pháp dây chuyền ở `tsc`. Sửa bằng viết lại câu.

Verify thật: `npm run typecheck`/`lint`/`format` pass sạch (sau khi sửa lỗi trên). `npm run
build:desktop` build production thành công — grep trực tiếp bundle xác nhận text Settings thật có
mặt. `npm run dev:tauri` mở `app.exe` thật, ổn định. **Chưa click-test tương tác thật** —
`claude-in-chrome` vẫn không kết nối được dù đã thử lại. Nên tự thử trên máy trước khi coi Phase 19
là xong hẳn: đổi từng loại field và xác nhận cập nhật đúng ngay lập tức.

Phase 20 đã thực hiện — bước ngoặt: lần đầu tiên rời khỏi `apps/desktop` (React/TS), chuyển sang
`backend/` (C#/.NET). Kiểm tra máy trước khi cài (đúng nguyên tắc không giả định) — .NET SDK
10.0.301 đã có sẵn, không cần cài gì thêm. Dựng skeleton Clean Architecture 5 project đúng như
`docs/architecture/ARCHITECTURE.md`/`backend/README.md` đã đặc tả từ Phase 01: `SmartTask.Domain`
(`dotnet new classlib`, target `net10.0`) ← `SmartTask.Application` ← `SmartTask.Infrastructure`/
`SmartTask.Persistence` ← `SmartTask.Api` (`dotnet new webapi --use-controllers`), nối đúng chiều
tham chiếu bằng `dotnet add reference`, gom vào `SmartTask.slnx` (định dạng solution XML mới của
SDK hiện tại, không phải `.sln` cũ).

Verify thật, không chỉ build: `Domain` xác nhận **0 package reference** nào (`dotnet list package`)
— đúng nguyên tắc entity thuần không phụ thuộc framework. Viết 1 vertical slice thật xuyên suốt cả
4 lớp để chứng minh composition root hoạt động, không phải chỉ "5 project rỗng build được": Domain
có `Entity` base class; Application định nghĩa `IDateTimeProvider` + DTO `ApiHealthReport`;
Infrastructure implement `SystemDateTimeProvider` + `AddInfrastructure()`; Persistence có
`AppDbContext` **rỗng** (chưa `DbSet` nào — schema thật là Phase 21) + `AddPersistence()` đọc
connection string SQL Server LocalDB từ `appsettings.json`; Api có `HealthController` inject
`IDateTimeProvider` qua DI. Chạy thật `dotnet run --project SmartTask.Api` rồi `curl
http://localhost:5299/api/health` → nhận JSON thật `{"status":"Healthy","serverTimeUtc":"..."}` —
xác nhận DI xuyên 4 lớp hoạt động đúng, kể cả khi **chưa có SQL Server thật nào đang chạy** (EF Core
không kết nối ngay lúc đăng ký DI). `GET /openapi/v1.json` cũng verify sinh đúng document.

**Sự cố bảo mật thật gặp phải:** template `webapi` mặc định kéo `Microsoft.AspNetCore.OpenApi
10.0.9` → transitively `Microsoft.OpenApi 2.0.0`, bản có lỗ hổng mức cao đã công bố
(GHSA-v5pm-xwqc-g5wc). Thử ghim thẳng lên `Microsoft.OpenApi 3.10.2` (bản mới nhất) thì build lỗi
thật — `IOpenApiMediaType.Example` đổi từ ghi được sang chỉ đọc giữa nhánh 2.x/3.x, phá vỡ source
generator của `Microsoft.AspNetCore.OpenApi 10.0.9`. Sửa đúng bằng cách ghim `2.12.2` — bản vá mới
nhất **cùng nhánh 2.x** — build lại sạch. Verify lại bằng `dotnet list package --vulnerable
--include-transitive` trên cả 5 project: không còn cảnh báo nào.

Phase 21 đã thực hiện — người dùng đã tự đổi connection string trong `appsettings.json` từ LocalDB
(Phase 20) sang SQL Server Express thật đang chạy sẵn trên máy (`DESKTOP-CKNT19A\SQLEXPRESS`); đã
xác nhận service `MSSQL$SQLEXPRESS` đang `Running` và kết nối được thật (`dotnet ef dbcontext info`)
trước khi bắt đầu, cập nhật `dotnet-ef` (10.0.8 → 10.0.12) khớp runtime.

Đọc lại đầy đủ `TASK_HEADERS`/`PROJECT_HEADERS`/`GOAL_HEADERS`/`HABIT_HEADERS` và `LOOKUP_LISTS`
trong `00_Constants.gs` trước khi model entity. `SmartTask.Domain` thêm `SyncableEntity` (cột đồng
bộ `SyncStatus`/`LastSyncedAt`/`Version` cộng `Id` UUID có sẵn từ Phase 20), 10 enum khớp
`LOOKUP_LISTS`, và 4 entity `TaskItem`/`Project`/`Goal`/`Habit` khớp headers — có ghi rõ 4 khác biệt
có chủ đích: khoá chính dùng UUID thay vì mã hiển thị kiểu Sheets, `Project.Health` được lưu thật
(khác frontend cố ý không lưu), enum lưu dạng chuỗi thay vì int mặc định của EF Core, `Tags` giữ 1
cột chuỗi phân tách dấu phẩy đúng cách Sheets lưu. `SmartTask.Persistence` thêm
`Configurations/` (Fluent API) + cập nhật `AppDbContext` với 4 `DbSet` thật.

**Sự cố thật gặp khi migrate — không chỉ giả định sẽ chạy:** `dotnet ef database update` lần đầu
thất bại thật với lỗi SQL Server "Introducing FOREIGN KEY constraint ... may cause cycles or
multiple cascade paths" trên `Tasks.DependencyTaskId` (tự tham chiếu, cấu hình `SetNull` ban đầu).
Sửa bằng đổi sang `DeleteBehavior.Restrict`, `migrations remove` rồi sinh lại migration, áp lại —
thành công.

Verify thật, nhiều lớp: đọc lại nội dung file migration sinh ra (đúng 4 bảng/kiểu cột/FK trước khi
áp); `dotnet ef database update` áp thật vào SQL Server Express; **xác nhận độc lập bằng `sqlcmd`**
(không chỉ tin CLI của EF) — `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES` trả đúng 5 bảng
(`Goals`/`Habits`/`Projects`/`Tasks`/`__EFMigrationsHistory`); `dotnet run --project SmartTask.Api`
sau khi có schema thật vẫn chạy tốt, `GET /api/health` vẫn trả JSON đúng — xác nhận thêm schema
không phá vỡ vertical slice đã verify ở Phase 20.

Phase 22 đã thực hiện — Personal Mode's Sheets app không có khái niệm user/auth nào cả (1
spreadsheet, 1 chủ sở hữu), nên `User` (`SmartTask.Domain/Users/User.cs`) là thiết kế mới hoàn
toàn, không port từ đâu; không phải `SyncableEntity` vì User không nằm trong phạm vi sync Phase 28.

`SmartTask.Application` thêm `IUserRepository`/`IPasswordHasher`/`IJwtTokenGenerator` (abstraction)
và `AuthService` (use case thật — chỉ điều phối qua 3 abstraction trên, không đụng EF Core/JWT
library trực tiếp, đúng vai trò "Application" trong Clean Architecture). `SmartTask.Infrastructure`
implement `PasswordHasherAdapter` (bọc `Microsoft.AspNetCore.Identity`'s `PasswordHasher<T>` — PBKDF2
+ salt ngẫu nhiên, **không** kéo theo toàn bộ ASP.NET Core Identity framework, hợp với luồng gọn nhẹ
cho Personal Mode hơn) và `JwtTokenGenerator`. `SmartTask.Persistence` thêm `UserRepository` +
migration `AddUsers` (bảng `Users`, unique index trên `Email`, không có cột đồng bộ). `SmartTask.Api`
thêm `AuthController` (`POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` có
`[Authorize]`) và cấu hình JWT bearer validation trong `Program.cs`.

**Bảo mật khoá ký JWT:** tạo secret ngẫu nhiên thật (`openssl rand -base64 48`), lưu bằng `dotnet
user-secrets` (nằm ngoài repo hoàn toàn, `%APPDATA%\Microsoft\UserSecrets\...`) — đã verify `git
status` không thấy gì nhạy cảm. `appsettings.json` chỉ chứa Issuer/Audience/ExpiryMinutes, không
chứa secret. Thiếu secret → app ném lỗi rõ ràng, không âm thầm ký bằng khoá rỗng.

Verify thật, đầy đủ luồng — không chỉ build: chạy `dotnet run` thật, `curl` thật theo đúng thứ tự
và xác nhận đúng cả 6 trường hợp: đăng ký (200 + token) → đăng ký lại cùng email (409) → đăng nhập
đúng mật khẩu (200 + token mới) → đăng nhập sai mật khẩu (401) → gọi endpoint được bảo vệ không kèm
token (401) → gọi lại kèm `Authorization: Bearer <token>` (200, đúng `userId`/`email` giải mã từ
claim JWT). Migration `AddUsers` áp thật vào SQL Server Express, xác nhận độc lập bằng `sqlcmd` (6
bảng, có `Users`). Dữ liệu test đã xoá khỏi DB thật sau khi verify xong. `dotnet list package
--vulnerable --include-transitive` vẫn sạch trên cả 5 project sau khi thêm các package auth mới.

Phase 23 đã thực hiện — CRUD API thật đầu tiên trên schema Phase 21, có `[Authorize]` (yêu cầu
token thật từ Phase 22). `Tasks` không chia theo user (không cột `OwnerId`) — khớp `TASK_HEADERS`
gốc (không có Owner) và đúng nguyên tắc Personal Mode; `[Authorize]` chỉ có nghĩa "cần token hợp
lệ", không phải phân vùng dữ liệu theo user.

`SmartTask.Application` thêm `TaskContracts` (`TaskResponse`/`CreateTaskRequest`/
`UpdateTaskRequest`), `ITaskRepository`, `TaskService` (use case — chỉ điều phối qua
`ITaskRepository`/`IDateTimeProvider`, cùng pattern `AuthService`). `PATCH` là cập nhật từng phần
có giới hạn ghi rõ: không phân biệt được "bỏ qua field" với "gửi null để xoá field" cho cột nullable
— chấp nhận được, JSON Patch thật để sau. `SmartTask.Persistence` thêm `TaskRepository`.
`SmartTask.Api` thêm `TasksController` (5 route: GET all/GET by id/POST/PATCH/POST complete/DELETE)
và đăng ký `JsonStringEnumConverter` toàn cục trong `Program.cs` — enum serialize/bind dạng chuỗi,
khớp quyết định lưu string trong DB từ Phase 21.

Verify thật, đầy đủ luồng — không chỉ build: chạy `dotnet run` thật, `curl` thật theo đúng thứ tự,
xác nhận đúng cả 9 trường hợp: không token (401) → có token, danh sách rỗng (200) → tạo task (201,
enum trả chuỗi đúng) → lấy theo id (200) → id không tồn tại (404) → PATCH đổi progress+status (200,
`UpdatedAt`/`LastStatusChangedAt` cập nhật đúng) → tạo với FK sai (400) → complete (200, đúng
Status/Progress/CompletedDate) → xoá (204) → lấy/xoá lại sau khi xoá (404 cả hai). Dữ liệu test đã
xoá sạch, không đụng 2 user thật đã có sẵn trong DB (không phải do phiên này tạo). Vulnerability
scan vẫn sạch trên cả 5 project.

Phase 24 đã thực hiện — cùng khuôn Tasks API (Phase 23): `ProjectContracts`/`IProjectRepository`/
`ProjectService` (`SmartTask.Application`), `ProjectRepository` (`SmartTask.Persistence`),
`ProjectsController` (`SmartTask.Api`, `[Authorize]`, 5 route GET all/GET by id/POST/PATCH/DELETE).

**Quyết định đáng chú ý:** `CreateProjectRequest`/`UpdateProjectRequest` **không có field `Health`**
— đúng sự kiềm chế `ProjectDetailDrawer` bên frontend đã áp dụng từ Phase 13 (Health luôn tính,
không nhập tay); cột `Health` phía backend có lưu thật (Phase 21) nhưng chưa có gì tính, nên để
client tự set qua API sẽ phá vỡ đúng ý nghĩa "computed" khi logic tính thật (port
`computeProjectHealth()` sang C#) được làm sau này.

Verify thật, đầy đủ luồng — không chỉ build: `curl` thật xác nhận không token (401), có token danh
sách rỗng (200), tạo project (201, `health` mặc định `"Healthy"`), lấy theo id, PATCH đổi
description (`UpdatedAt` cập nhật đúng). **Verify xuyên-entity quan trọng nhất:** tạo 1 task thật
trỏ `projectId` vào project vừa tạo → xoá project (204) → gọi lại task, xác nhận `projectId` tự về
`null` và task không bị xoá theo — lần đầu có API thật để chứng minh hành vi "cascade clear"
(`ON DELETE SET NULL`) cấu hình từ Phase 21 hoạt động đúng, không chỉ đọc migration bằng mắt như
trước. Dữ liệu test đã xoá sạch, không đụng 2 user có sẵn trong DB. Vulnerability scan vẫn sạch.

Phase 25 đã thực hiện — cùng khuôn Tasks/Projects API: `GoalContracts`/`IGoalRepository`/
`GoalService` (`SmartTask.Application`), `GoalRepository` (`SmartTask.Persistence`),
`GoalsController` (`SmartTask.Api`, `[Authorize]`, 5 route CRUD).

**Khác Projects (Phase 24) ở đúng 1 điểm có chủ đích:** `CreateGoalRequest`/`UpdateGoalRequest` CÓ
field `Progress`/`Status` — Goal không có khái niệm "computed" để bảo vệ như Project's Health, vì
Sheets không có view engine nào cho Goals; `Progress`/`Status` luôn là field nhập tay trực tiếp cả
3 tầng (Sheets, frontend `GoalDetailDrawer` Phase 14, backend), nên cho client set qua API là đúng,
không mâu thuẫn gì.

Verify thật, đầy đủ luồng — không chỉ build: `curl` thật xác nhận không token (401), có token danh
sách rỗng (200), tạo goal với `progress`/`status` tự chọn (201, đúng giá trị gửi lên — khác
Project's `health` luôn mặc định "Healthy"), lấy theo id, PATCH đổi progress+status (`UpdatedAt`
cập nhật đúng), id không tồn tại (404). **Verify xuyên-entity:** tạo 1 task thật trỏ `goalId` vào
goal vừa tạo → xoá goal (204) → gọi lại task, xác nhận `goalId` tự về `null` và task không bị xoá
theo — xác nhận `Tasks.GoalId`'s `ON DELETE SET NULL` hoạt động đúng y hệt `Tasks.ProjectId` ở
Phase 24. Dữ liệu test đã xoá sạch, không đụng 2 user có sẵn trong DB. Vulnerability scan vẫn sạch.

Mỗi Phase kế tiếp sẽ được trình bày riêng theo format: Mục tiêu → File tạo/sửa → Full code →
Command → Cách chạy → Cách test → Expected Result → Checklist → Git commit đề xuất.
