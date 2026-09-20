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

Mỗi Phase kế tiếp sẽ được trình bày riêng theo format: Mục tiêu → File tạo/sửa → Full code →
Command → Cách chạy → Cách test → Expected Result → Checklist → Git commit đề xuất.
