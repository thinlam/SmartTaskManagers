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
PHASE 26  Habits API                                                            ✅ DONE (curl thật, xác nhận check-in idempotent 3 lần/ngày)
PHASE 27  Desktop ↔ Backend integration (api-client thật, bỏ mock)
PHASE 28  Google Sheets ↔ Backend Sync
PHASE 29  Smart Engine (port apps/google-sheets/src/05_SmartEngine.gs → C#)
PHASE 30  Notifications
PHASE 31  Windows build
PHASE 32  Installer (.exe / .msi qua Tauri bundler)
PHASE 33  Web deployment (apps/web, dùng chung packages/*)                    ✅ DONE (build+typecheck+lint sạch — chưa test tương tác thật do không có MySQL local, xem ghi chú)
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

- salt ngẫu nhiên, **không** kéo theo toàn bộ ASP.NET Core Identity framework, hợp với luồng gọn nhẹ
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

Phase 26 đã thực hiện — cùng khuôn Tasks/Projects/Goals API: `HabitContracts`/`IHabitRepository`/
`HabitService` (`SmartTask.Application`), `HabitRepository` (`SmartTask.Persistence`),
`HabitsController` (`SmartTask.Api`, `[Authorize]`, 6 route: CRUD + `POST .../check-in`).

**Khác Projects/Goals:** `Habits` đứng riêng hoàn toàn, không có quan hệ xuyên-entity nào để verify
cascade clear — grep xác nhận không có `Task.HabitId` nào cả (giống kết luận đã có từ Phase 15
frontend). `CreateHabitRequest`/`UpdateHabitRequest` không có `Streak`/`CompletedCount`/
`LastCompletedDate` — 3 field này chỉ đổi qua action `check-in` riêng, đúng
`HabitDetailDrawer`/`useHabits` bên frontend Phase 15. `CheckInAsync` port trực tiếp logic
`checkInHabit()` frontend: +1 Streak, +1 CompletedCount, LastCompletedDate = hôm nay, **no-op nếu
hôm nay đã check-in rồi**.

Verify thật, đầy đủ luồng — không chỉ build: không token (401), có token danh sách rỗng (200), tạo
habit (201, streak/completedCount=0), PATCH đổi targetCount, **check-in 3 lần liên tiếp cùng
ngày** — lần 1 tăng đúng (streak=1/completedCount=1/lastCompletedDate=hôm nay), lần 2 và lần 3 trả
về **y hệt lần 1** kể cả `updatedAt` không đổi, xác nhận no-op thật chứ không chỉ đọc code — id
không tồn tại (404), xoá (204), lấy lại sau xoá (404). Dữ liệu test đã xoá sạch. Sự cố thật gặp
giữa chừng: process `SmartTask.Api` cũ từ lần test Swagger UI trước còn giữ khoá DLL khiến
`dotnet build` lỗi `MSB3027` — `Stop-Process` rồi build lại mới qua. Vulnerability scan vẫn sạch.

Phase 27 đã thực hiện — Desktop ↔ Backend thật, bỏ toàn bộ mock data. `packages/api-client` từ chỗ
placeholder rỗng thành package thật: `httpClient.ts` (fetch wrapper, `ApiError`, Bearer token qua
module-level `setAuthToken()`), `authApi`/`taskApi`/`projectApi`/`goalApi`/`habitApi` (mỗi entity 1
file, map `Dto` ↔ shape frontend). `packages/hooks`'s 4 hook (`useTasks`/`useProjects`/`useGoals`/
`useHabits`) viết lại hoàn toàn: không còn nhận `initialX` (mock seed), tự fetch qua `useEffect` khi
mount, mọi mutator giờ `async` gọi API thật, thêm `isLoading`/`error` vào return shape. 4 file
`apps/desktop/src/mock/{tasks,projects,goals,habits}.ts` bị xoá hẳn (Dashboard/Today's
`mock/{dashboard,today}.ts` và `mock/settings.ts` vẫn giữ — xem quyết định phạm vi bên dưới).

**Bug thật phát hiện khi build `taskApi.ts`:** enum C# không chứa được khoảng trắng
(`PersonalAdmin`, `ToDo`, `InProgress`, `OnTrack`, `AtRisk`) nhưng union TS phía frontend giữ
nguyên chuỗi gốc từ Sheets có khoảng trắng (`'Personal Admin'`, `'To Do'`, `'In Progress'`,
`'On Track'`, `'At Risk'`) — 2 tầng lệch shape thật sự, không phải giả thuyết: verify bằng curl gửi
thẳng `"area":"Personal Admin"` bị 400 `"The JSON value could not be converted to
SmartTask.Domain.Enums.AreaType"`, gửi `"PersonalAdmin"` mới qua. Vá bằng
`packages/api-client/src/enumMappings.ts` — bảng tra 2 chiều tường minh cho Area/TaskStatus/
GoalStatus (`xToFrontend`/`xToBackend`), áp trong mỗi `fromDto()`/`toWriteBody()`. Priority/Risk/
HabitFrequency không lệch (không khoảng trắng cả 2 phía) nên không cần map.

Auth thật: `AuthContext` (`localStorage` key `stm.auth`, check `expiresAt`) + `LoginPage` (combined
login/register) + `App.tsx` gate — chưa đăng nhập chỉ render `LoginPage` (không Sidebar/Topbar/
router), đăng nhập xong mới mount 4 entity Provider + `RouterProvider`. Topbar's nút Account trước
giờ không làm gì (từ Phase 08) nay có chức năng thật: sign out (`onAccountClick`/`accountLabel` mới
trên `TopbarProps`, nối qua `AppShell` tới `useAuthContext().logout`).

Loading/error UX: 5 trang CRUD chính (`TasksPage`/`InboxPage`/`ProjectsPage`/`GoalsPage`/
`HabitsPage`) thêm early-return `isLoading` guard (tránh flash "No X yet" trước khi fetch đầu tiên
xong). 4 Detail Drawer (`TaskDetailDrawer`/`ProjectDetailDrawer`/`GoalDetailDrawer`/
`HabitDetailDrawer`) thêm `isSubmitting`/`error` state, `handleSubmit`/`handleDelete` giờ `async`,
chỉ đóng drawer khi thành công, hiện lỗi API thật bằng dòng đỏ trong form. Hành động nhanh không có
form (Complete/Delete/Check-in ở row, QuickCaptureInput) dùng `apps/desktop/src/lib/reportError.ts`
— `console.error` tối giản, ghi rõ là giải pháp tạm, toast/notification thật để dành phase sau.

**Quyết định phạm vi cần nói rõ, không chỉ chôn trong commit message:** Dashboard và Today **không**
được nối dây thật trong Phase 27 này, dù README của Phase 15/18 từng ghi "nối dây thật là Phase 27".
Lý do: Dashboard/Today cần một tầng tính toán KPI hoàn toàn mới (tương đương công việc port logic
một lần nữa, như Calendar/Kanban đã từng là phase riêng) — gộp vào cùng Phase 27 với toàn bộ api-
client + 4 hook + auth + 5 trang + 4 drawer sẽ vượt xa phạm vi hợp lý của một phase. Cả hai vẫn dùng
`mock/dashboard.ts`/`mock/today.ts` tĩnh như cũ; việc này để dành cho phase riêng sau.

CORS: `Program.cs` thêm `AddCors`/`UseCors` policy tên `DesktopClient`, cho phép
`http://localhost:5173` (Vite dev) + `tauri://localhost`/`http://tauri.localhost` (Tauri packaged).
**Sự cố thật gặp giữa chừng:** lần đầu chỉ gọi `AddCors` (đăng ký policy) mà quên gọi `app.UseCors()`
trong pipeline — verify bằng curl `OPTIONS` preflight vẫn trả `405 Method Not Allowed` thay vì `204`
kèm `Access-Control-Allow-*` header; thêm `app.UseCors(DesktopCorsPolicy)` (đặt sau
`UseHttpsRedirection`, trước `UseAuthentication` — preflight `OPTIONS` không mang `Authorization`
header nên CORS phải được xử lý trước khi auth middleware có cơ hội từ chối nó) mới qua.

Verify thật, đầy đủ luồng — không chỉ build: `npm run typecheck`/`lint`/`format` sạch trên toàn bộ
file Phase 27 (sau khi `prettier --write` 10 file lệch format); `dotnet build` backend sạch;
`npm run build --workspace=apps/desktop` (production Vite build) sạch. Chạy backend thật + `curl`
thật (không dùng Tauri/browser tương tác — môi trường không có công cụ điều khiển trình duyệt trong
phiên này, nói rõ giới hạn thay vì nhận là đã test UI): `OPTIONS` preflight từ origin
`localhost:5173` → `204` kèm đúng `Access-Control-Allow-Origin`; register user test thật
(`phase27-test@example.com`) → `200` kèm JWT; login lấy token; tạo task với enum kiểu backend
(`"PersonalAdmin"`/`"ToDo"`) → `201`; PATCH đổi status → `200`; complete → `200`; delete → `204`;
list lại → `[]` xác nhận cleanup sạch. Riêng test enum kiểu frontend (`"Personal Admin"` có khoảng
trắng) cố ý gửi thẳng không qua `enumMappings.ts` để chứng minh bug thật tồn tại ở tầng API (400),
đúng lý do package `enumMappings.ts` cần tồn tại. Không đụng 2 user có sẵn (`taska@example.com`/
`taskb@example.com`).

Phase 28 đã thực hiện — Google Sheets ↔ Backend Sync, 2 chiều, Last-Write-Wins theo `UpdatedAt`
(quyết định cùng người dùng trước khi code: 2 chiều thay vì 1 chiều Sheets→Backend, thủ công + time
trigger 15 phút thay vì chỉ thủ công — xem trao đổi đầu Phase 28).

**Backend:** `POST /api/sync/push` + `GET /api/sync/pull?since=` (`SyncController`,
`SmartTask.Application/Sync/{SyncContracts,ISyncService,SyncService}.cs`). Dùng lại nguyên cột
`SyncStatus`/`LastSyncedAt`/`Version` đã có từ Phase 21 (`SyncableEntity`), thêm mới `ExternalId`
(mã hiển thị Sheets, migration `AddSyncExternalId`, unique filtered index `WHERE ExternalId IS NOT
NULL` — filtered vì Task/Project/Goal/Habit tạo thẳng qua API/Desktop không có mã Sheets nào).

**2 bug thật tìm thấy khi verify (không phải giả thuyết, cả 2 đều fix rồi verify lại bằng curl):**
(1) đối chiếu chỉ theo `ExternalId` khiến 1 entity tạo qua Desktop, `pull` về Sheets lần đầu
(`ExternalId` backend vẫn `null`), rồi Sheets gán mã mới và `push` lại → backend tạo **trùng** thay
vì cập nhật — sửa bằng thêm field `Id` (optional) vào contract, ưu tiên tra theo `Id` trước
`ExternalId`, backfill `ExternalId` khi tìm thấy theo `Id`. (2) `SaveChangesAsync` lỗi ở 1 item
trong batch push khiến MỌI item sau đó trong cùng lần push cũng báo lỗi dù hợp lệ — do entity hỏng
còn nằm trong EF Core change tracker, các lần save sau cố lưu lại nó — sửa bằng
`DiscardTracking()` (`dbContext.ChangeTracker.Clear()`) trong mỗi `catch`, cô lập lỗi đúng từng item.

**Apps Script (`apps/google-sheets/src/15_Sync.gs`, mới):** 1 engine (`syncAll_()`) dùng chung cho
cả menu **Sync Now** (thủ công) lẫn time-driven trigger 15 phút (tự động) — không lặp logic.
`onEdit(e)` (simple trigger) tự đánh dấu `SyncStatus = NotSynced` cho dòng vừa sửa ở 1 trong 4 sheet
dữ liệu, kể cả sửa tay trực tiếp (Goals/Habits không có dialog UI riêng) — guard bằng kiểm tra dải
cột bị sửa có nằm gọn trong 4 cột sync cuối hay không, để chính lần ghi-lại của sync engine không
tự đánh dấu dirty vô hạn. `LockService` chống chạy chồng, `fetchWithRetry_` retry 3 lần backoff
1s/2s/4s cho lỗi 5xx/network (không retry 4xx). Bảng ánh xạ enum `SYNC_ENUM_TO_BACKEND`/
`SYNC_ENUM_TO_SHEET` (Area/Status/GoalStatus) giải đúng bài toán khoảng trắng đã gặp ở Phase 27
(`enumMappings.ts`), lần này ở phía Apps Script. `ActivityLog` ghi lại mỗi lần sync
(`EntityType=Sync`, `Action=Success/PartialFailure/Failed/Skipped`) — không cần sheet SyncLog riêng.

**Quyết định phạm vi ghi rõ:** xoá không đồng bộ 2 chiều (xoá Sheets không xoá backend, xoá qua
API/Desktop không xoá Sheets — `pull` chỉ hỏi "gì đã đổi", không biết "gì đã mất"; cần tombstone
thật, ngoài phạm vi phase này). `DependencyTaskId` chỉ resolve đúng nếu task được phụ thuộc đã từng
sync trước đó — 2 task hoàn toàn mới với liên kết phụ thuộc mới tạo, sync cùng 1 lần, sẽ trống field
này tới chu kỳ sau.

Verify thật, đầy đủ luồng — không chỉ build: `dotnet build` sạch, `dotnet list package
--vulnerable --include-transitive` sạch cả 5 project, migration áp thật + verify độc lập qua
`sqlcmd`. `curl` thật: push tạo mới/skip-vì-cũ-hơn/update-vì-mới-hơn (Version tăng đúng), pull xác
nhận đúng bản mới nhất, cô lập lỗi per-item, chống trùng qua `Id`. Payload sinh thật từ
`taskRowToSyncItem_()` (chạy qua Node `vm` với GAS API giả lập tối thiểu — không có môi trường Apps
Script thật trong phiên này) gửi thẳng tới `/api/sync/push` thật, xác nhận khớp JSON 2 đầu. Toàn bộ
enum mapping round-trip (Area/Status/GoalStatus qua lại) verify bằng harness riêng, tất cả khớp.
**Chưa test qua Apps Script Editor/Sheets UI thật** (menu Sync Now/Connect to Backend/Auto-Sync
click thật) — môi trường phiên này không triển khai `clasp push` lên 1 spreadsheet thật; nói rõ giới
hạn này thay vì nhận đã kiểm tra. Nên tự `clasp push`, mở Sheet thật, Connect to Backend, Sync Now,
và xác nhận tạo/sửa task cả 2 phía trước khi coi Phase 28 là xong hẳn về mặt vận hành thật. Dữ liệu
test backend đã xoá sạch, không đụng 2 user có sẵn.

Phase 29 đã thực hiện — Smart Engine, port 1:1 từ `apps/google-sheets/src/05_SmartEngine.gs` sang
`SmartTask.Application/SmartEngine/` (`SmartWeights.cs` + `SmartEngineService.cs`). Không đổi 1 con
số/1 rule nào — mọi nhánh trace được về đúng dòng gốc bên Apps Script (urgency/impact/effort
fit/goal alignment/task age cộng dồn thành `SmartScore`, risk points cộng dồn rồi bucket hoá thành
`Risk`, `recommendAction_()` port nguyên if/else chain thành `RecommendAction`).

Nối vào đúng những chỗ bản gốc gọi `computeSmartFields_()`: `TaskService.CreateAsync`/`UpdateAsync`/
`CompleteAsync` (khớp `createTask_()`/`updateTask_()`), và `SyncService.PushTaskAsync` (Phase 28) —
nếu bỏ sót chỗ này, 1 task tạo thuần qua sync sẽ có Smart fields `null` cho tới lần recalculate-all
kế tiếp, không khớp hành vi "luôn tính lại mỗi lần đổi" của bản gốc.

`POST /api/smart-engine/recalculate-all` (thủ công, tương đương menu "Recalculate Smart Score") +
`DailySmartRecalcHostedService` (`BackgroundService`, port `ensureDailyRecalcTrigger_()`'s trigger
06:00 UTC hằng ngày — chọn vòng lặp in-process `Task.Delay` vì dự án chưa có hạ tầng scheduler/cron
riêng, đúng quy mô Personal Mode 1 instance; 1 lần chạy lỗi được log, không crash vòng lặp).

**Quyết định phạm vi ghi rõ:** `DueSoonDays` hard-code `= 2` thay vì đọc từ Settings — backend chưa
có bảng Settings nào (`apps/desktop`'s Settings vẫn mock tĩnh từ Phase 19), nối Settings API thật là
phase riêng sau.

Verify thật, đầy đủ luồng — không chỉ đọc code khớp dòng: `curl` thật qua 7 kịch bản, mỗi kịch bản
tính tay trước rồi so khớp response thật — overdue+Critical (`63`, risk `High`, `"Overdue - do
now"`), due-today+estimate lớn (`"Break down"`), blocked (`"Review blocked task"`), Completed
(`0`/`Low`/`"Completed"`), quick win (`"Quick win"`), dependency chưa xong (`"Waiting for
dependency"`), goal-linked (`26` = đúng cộng dồn `GoalAlignment=15`) — tất cả khớp 100%.
`recalculate-all` chạy thật trả đúng số lượng. `TimeUntilNextRun()` verify độc lập qua
`dotnet-script`, 4 mốc biên (trước/đúng/sau 6h, gần nửa đêm) đều đúng. **Task age/stalled logic**
(phụ thuộc nhiều ngày trôi qua thật) chỉ verify bằng đọc code đối chiếu từng dòng với bản gốc, không
có kịch bản thật kéo dài ngày nào trong phiên này — nói rõ giới hạn này, không nhận đã test đủ.
Build + `dotnet list package --vulnerable --include-transitive` sạch cả 5 project. Dữ liệu test đã
xoá sạch, không đụng 2 user có sẵn.

Phase 30 đã thực hiện — Notifications, hoàn toàn mới (không có tiền lệ Sheets — grep xác nhận
không notif/email/reminder nào cả). Thiết kế chốt cùng người dùng trước khi code: 4 quy tắc trigger
(task overdue/due-soon, habit streak at risk, goal at-risk, sync push thất bại) + lưu bảng thật có
Read/Unread, không tính live mỗi lần gọi.

Backend: `Notification` entity mới (migration `AddNotifications`), `NotificationService` đọc field
đã có sẵn trên Task/Habit/Goal (không thêm cột nghiệp vụ nào), chống spam bằng kiểm tra đã có
notification **chưa đọc** cùng `(Type, EntityId)` chưa trước khi tạo. `SyncFailed` nối trực tiếp
vào `SyncService` (Phase 28) — mỗi item `Outcome=Error` giờ tạo 1 notification thật, không chỉ nằm
im trong response JSON. `AppDefaults.DueSoonDays` tách ra dùng chung giữa `NotificationService` và
`SmartEngineService` (Phase 29) để 2 nơi không lệch hằng số. `NotificationGenerationHostedService`
(`PeriodicTimer` 30 phút) tự động quét — cùng tinh thần `DailySmartRecalcHostedService`.

Frontend nối đầy đủ luôn trong phase này (không để dở như Phase 27's Dashboard/Today): `packages/
types`'s `AppNotification` (đặt tên tránh đụng `Notification` built-in của trình duyệt),
`notificationApi.ts`, `useNotifications` (poll 60 giây — không có websocket/SSE, khớp nhịp sinh
notification nền 30 phút), `NotificationPanel`/`NotificationItem` (packages/ui — tên đã ghi sẵn
trong `design-tokens.md` từ lâu, giờ mới có code thật). Topbar's nút chuông (từ Phase 08, chưa từng
làm gì) giờ mở dropdown panel thật, click → mark-read + điều hướng đúng trang nguồn.

Verify thật, đầy đủ luồng — không chỉ build: migration áp thật + verify độc lập qua `sqlcmd`. `curl`
thật dựng đủ 4 kịch bản trigger (dùng `sqlcmd` chỉnh `Streak`/`LastCompletedDate` 1 habit để mô
phỏng "chưa check-in hôm nay" — API bình thường không back-date được) → `generate` tạo đúng 4
notification, message khớp từng loại; gọi lại lần 2 → `0` (dedupe đúng); mark-read/mark-all-read
đúng; push sync lỗi FK → `SyncFailed` notification thật xuất hiện. `npm run typecheck`/`lint`/
`format` sạch, production Vite build sạch, `dotnet build` + vulnerability scan sạch cả 5 project.
**Chưa test UI tương tác thật** (không có công cụ điều khiển trình duyệt trong phiên này) — nói rõ
giới hạn. Dữ liệu test đã xoá sạch (kể cả notification rows qua `sqlcmd`, không có endpoint xoá —
đúng thiết kế giữ lịch sử), không đụng 2 user có sẵn.

**Sau Phase 30 — Dashboard/Today nối dữ liệu thật** (không phải phase số riêng, làm theo yêu cầu
người dùng ngay sau Phase 30, vì Smart Engine + Notifications giờ đã cho đủ dữ liệu thật để làm 2
trang này đúng nghĩa). Quyết định chốt cùng người dùng: dùng `SmartScore`/`Risk`/`RecommendedAction`
có sẵn từ API, **không** port lại thuật toán Smart Engine sang TypeScript (tránh 2 nơi tính lệch
nhau theo thời gian).

`packages/shared` thêm `computeDashboardData`/`computeTodayData` — port trực tiếp từ
`computeDashboardData_()`/`computeTodayData_()` (`06_Dashboard.gs`/`07_Today.gs`): cùng 5 KPI mỗi
trang, Focus Now/My Areas/Smart Insights, Do Now/Scheduled/Quick Wins/Best Next Action/End-of-Day
Review — chi tiết đầy đủ + các khác biệt có chủ đích xem `packages/shared/README.md`.
`DashboardPage.tsx`/`TodayPage.tsx` đọc `tasks`/`habits` thật từ Context (backend-backed từ Phase 27) qua `useMemo`, có `isLoading` guard. `Task` (`packages/types`) thêm field `dueTime` — trước đó
bị bỏ sót khi map response dù backend luôn trả về, Today's Scheduled section cần nó. Xoá
`mock/dashboard.ts`/`mock/today.ts` — không còn trang nào dùng mock.

Verify thật, không chỉ đọc code khớp dòng: dựng fixture `Task`/`Habit` thật, chạy trực tiếp qua
`tsx` (không phải test suite chính thức, nhưng chạy code thật với input thật) — xác nhận KPI đếm
đúng, Focus Now/Do Now sort đúng theo SmartScore, Scheduled label format đúng ("2:30 PM"), và xác
nhận đúng hành vi "Do Now chiếm chỗ trước Scheduled" khi cả 2 đều đủ điều kiện due hôm nay (kịch
bản overflow riêng: 6 task lấp đầy Do Now, task thứ 7 due hôm nay có giờ mới rớt xuống Scheduled) —
khớp đúng thứ tự ưu tiên hàm gốc, phát hiện qua chạy thật chứ không phải giả định. `npm run
typecheck`/`lint`/`format` sạch, production Vite build sạch. **Chưa test UI tương tác thật trên
Desktop app** — môi trường phiên này không có công cụ điều khiển trình duyệt/Tauri, nói rõ giới hạn
này thay vì nhận đã kiểm tra.

**Sau Phase 30 — Smart Assistant** (không phải phase số riêng, theo yêu cầu người dùng). `/assistant`
chỉ là chỗ trống trong nav từ Phase 04 ("Phase 29+ (Smart Engine)"), chưa từng build — không có tiền
lệ Sheets nào cả. Phạm vi chốt cùng người dùng: trang khuyến nghị rule-based thật, **không phải**
chat/LLM (cần tích hợp AI thật, quyết định lớn hơn nhiều, chưa làm).

`packages/shared` thêm `computeSmartAssistantData` — nhóm mọi task mở theo `recommendedAction`
(đúng priority chain của Smart Engine), risk count 4 mức, cảnh báo Project (tái dùng
`computeProjectMetrics`/`computeProjectHealth`/`getProjectNextAction`, Phase 13)/Goal (`Status =
At Risk`)/Habit (khớp `NotificationService.GenerateHabitNotificationsAsync`'s HabitStreakAtRisk,
Phase 30, tính lại phía client). `SmartAssistantPage.tsx` đọc 4 Context thật (backend-backed từ
Phase 27). `packages/ui` thêm `RiskBadge` (tên đã ghi sẵn trong `design-tokens.md` từ lâu, giờ mới
có code thật).

Verify thật: dựng fixture Task/Project/Goal/Habit thật, chạy `computeSmartAssistantData` qua `tsx`
— 7 assertion đều pass (risk count đúng, thứ tự sort theo risk rồi SmartScore, thứ tự action group
đúng priority chain, lọc đúng Project Healthy/Goal On Track/Habit Weekly bị loại). `npm run
typecheck`/`lint`/`format` sạch, production Vite build sạch. **Chưa test UI tương tác thật** — môi
trường phiên này không có công cụ điều khiển trình duyệt/Tauri, nói rõ giới hạn này.

Phase 31 đã thực hiện — Windows release build thật. `npm run build:tauri` build `app.exe` release
(Rust `--release`, tối ưu hoá, không dính dev server) — thành công, cộng 2 bundle cài đặt sinh ra
như tác dụng phụ của `bundle.targets: "all"` (`.msi` qua WiX, `.exe` setup qua NSIS) — tinh chỉnh
sâu trải nghiệm cài đặt để dành Phase 32, phase này chỉ xác nhận bản build gốc chạy độc lập được
thật.

**Sự cố thật gặp khi verify:** cửa sổ mặc định `800×600` (từ Phase 06) quá chật cho layout Sidebar

- Topbar + nội dung thật (Kanban/Calendar/Timeline cần nhiều chỗ). Sửa lên `1280×800` mặc định,
  thêm `minWidth: 1024`/`minHeight: 640` trong `src-tauri/tauri.conf.json`.

Verify thật, không chỉ build: chạy `dotnet run` (backend thật) song song, chạy trực tiếp `app.exe`
(không qua `dev:tauri`, xác nhận không có Vite dev server nào chạy nền qua
`Get-NetTCPConnection -LocalPort 5173` rỗng) → process `Responding: True`, ổn định, không crash,
log rỗng. Verify kích thước cửa sổ thật bằng Win32 `GetWindowRect` qua PowerShell — đúng ~1280×800
(phần dư là viền/titlebar Windows), không chỉ tin cấu hình ghi đúng trên giấy. CORS's
`tauri://localhost` origin (đã có từ Phase 27) verify lại vẫn đúng, không cần sửa. **Chưa test click
tương tác thật trong `app.exe`** — môi trường phiên này không có công cụ điều khiển GUI, chỉ verify
được ở mức process/window (chạy, không crash, đúng kích thước), không phải toàn bộ UX — nói rõ giới
hạn này.

Phase 32 đã thực hiện — Installer .exe (NSIS)/.msi (WiX) thật. `bundle` trong `tauri.conf.json`
thêm metadata thật (`publisher`/`copyright`/`category`/`shortDescription`/`longDescription`, hiện
đúng trong Apps & Features) và `bundle.windows.nsis` (`installMode: "currentUser"` — không cần
Admin, `startMenuFolder`).

**3 phát hiện thật khi verify vòng đời cài đặt đầy đủ (không chỉ build ra file):**

1. `setup.exe /S` qua Git Bash lần đầu **không** chạy im lặng — MSYS tự dịch `/S` thành path Windows
   (`C:/Program Files/Git/S`), phá đối số dòng lệnh. Sửa bằng `MSYS_NO_PATHCONV=1`.
2. `.msi` cài đặt thất bại thật (exit `1603`, lỗi `1925` "insufficient privileges") khi không có
   quyền Admin — đặc tính vốn có của WiX (per-machine, cần elevation), Tauri's `WixConfig` không có
   option "cài cho user hiện tại" như NSIS, cần custom `.wxs` mới đổi được — ngoài phạm vi phase
   này. Verify bằng chạy nâng quyền thật (`-Verb RunAs`) → thành công. **Khuyến nghị: dùng bản
   `.exe` (NSIS) cho người dùng cuối, `.msi` chỉ dành triển khai doanh nghiệp qua Group Policy.**
3. Publisher hiện lỗi font khi đọc registry qua terminal Git Bash (`l�m Nguy�n Th�n`) — verify bằng
   ghi UTF-8 ra file riêng xác nhận giá trị lưu thật đúng ("lâm Nguyên Thìn"), chỉ là lỗi hiển thị
   codepage terminal, không phải bug installer thật.

Verify thật, đầy đủ vòng đời — không chỉ build: **NSIS** cài (`/S`, không Admin) → xác nhận thư mục
cài/Start Menu shortcut/registry entry thật → mở app **qua chính shortcut vừa cài** → `Responding:
True` → gỡ (`uninstall.exe /S`) → xác nhận sạch hoàn toàn. **MSI** cài/gỡ nâng quyền (`-Verb RunAs`)
→ verify file/registry đúng cả 2 chiều, exit code `0`. **Chưa test:** click tương tác thật bên
trong app sau khi cài — không có công cụ điều khiển GUI trong phiên này, chỉ verify được mức
process/window/file-system.

Phase 33 đã thực hiện — Web deployment (`apps/web`), dùng chung 100% code với `apps/desktop`.

**Task 1 — trích xuất `packages/app-core`.** Toàn bộ `app/`, `components/`, `pages/`, `state/`,
`config/`, `lib/`, `mock/`, và `App.tsx` được `git mv` từ `apps/desktop/src` sang
`packages/app-core/src` (không sửa import nào — toàn bộ import trong cây đã moved đều là relative
nội bộ, không đổi đường dẫn). Lý do: `apps/web` (Task 4) và `apps/desktop` cần dùng chung một bản
UI/business logic thay vì copy-paste hoặc duy trì 2 bản lệch nhau theo thời gian — đúng tinh thần
`packages/*` đã theo từ Phase 02.

**Task 2 — `apps/desktop` dùng `@stm/app-core`.** `apps/desktop/src` giờ chỉ còn `main.tsx` +
`index.css`, import `App` từ `@stm/app-core` thay vì file cục bộ.

**Task 3 — CORS config-driven.** `Program.cs` đổi từ `WithOrigins(...)` cứng trong code sang đọc
`Cors:AllowedOrigins` từ configuration. Lý do: domain Vercel thật cho `apps/web` chưa tồn tại tại
thời điểm này (chưa tạo project Vercel) — origins giờ cấu hình được qua biến môi trường
`Cors__AllowedOrigins__2` trên Railway, thêm domain Vercel thật sau này **không cần sửa code hay
deploy lại backend**. `appsettings.Development.json` khai 3 origin cũ + `:5174` (cổng dự phòng của
`apps/web` khi `apps/desktop` đã chiếm `:5173`) để hành vi dev local không đổi.

**Task 4 — scaffold `apps/web`.** App Vite + React 19 + Tailwind v4 mới, cùng stack với
`apps/desktop`, entry point chỉ có `main.tsx` + `index.css` riêng, còn lại toàn bộ page/component/
state đều import từ `@stm/app-core` — **không có page hay component nào bị duplicate** giữa 2 app.
`apps/web/README.md` ghi sẵn hướng dẫn deploy Vercel.

**Lỗi CSS `@source` thật phát hiện khi verify Task 1→4:** sau khi di chuyển code sang
`packages/app-core`, Tailwind v4 (dùng `@source` để quét class thay vì `content` config cũ) không
còn tìm thấy class nào trong `packages/app-core/src` vì `index.css` của cả `apps/desktop` lẫn
`apps/web` mới chỉ khai `@source` cho `packages/ui/src` chứ chưa khai cho `packages/app-core/src`
— toàn bộ UI sẽ mất style dù build/lint/typecheck vẫn xanh (Tailwind không báo lỗi, chỉ lặng lẽ bỏ
qua class không match). Sửa bằng cách thêm dòng `@source '../../../packages/app-core/src';` vào cả
2 file (`apps/desktop/src/index.css` và `apps/web/src/index.css`), đứng cạnh dòng `@source` có sẵn
cho `packages/ui/src`.

**Task 5 (task này) — verify thật những gì làm được, ghi rõ giới hạn phần còn lại:**

- `npm run build --workspace=apps/desktop` chạy sạch, exit 0 (tsc -b + vite build) — xác nhận Task
  1/2's tái cấu trúc `@stm/app-core` không làm hỏng build `apps/desktop`. Build/typecheck/lint sạch
  toàn repo (bao gồm `apps/web`) đã được Task 1/2/4 tự verify khi implement, task này không chạy
  lại từ đầu.
- **Backend không khởi động được cục bộ** — máy này không có MySQL local reachable (đã xác nhận lại
  từ ghi chú của Task 3): `dotnet user-secrets list` cho `SmartTask.Api` chỉ có `Jwt:Secret`, không
  có `ConnectionStrings:DefaultConnection`. Chạy thật `dotnet run` xác nhận crash ngay khi khởi động
  với `InvalidOperationException: Missing 'ConnectionStrings:DefaultConnection'` (ném từ
  `SmartTask.Persistence.DependencyInjection.AddPersistence`) — không phải giả định, mà lỗi thật
  quan sát được. Không tạo connection string giả để né lỗi này (đã có sibling task từng làm vậy rồi
  phải dọn lại).
- **`claude-in-chrome` cũng không khả dụng** trong phiên này — `tabs_context_mcp` trả về "Browser
  extension is not connected". Vậy cả 2 điều kiện cần cho Step 4 (backend sống + browser tool có
  sẵn) đều thiếu, không chỉ một.
- Do đó **Steps 1/2/4/5(dev server)/6 của brief bị bỏ qua theo đúng nhánh "known environment
  constraint"**: không dựng được `dotnet run` local, không dựng dev server `apps/web` để click-test
  qua backend thật, không có browser click-test thật (Login → Dashboard → ít nhất 2 trang khác) như
  các Phase trước (12/13/14) đã từng làm được khi có công cụ. Đây là cùng dạng giới hạn môi trường
  đã ghi nhận trung thực ở Phase 15–19, 30, 31, 32 — không nhận đã test những gì chưa test được.

**Việc còn lại người dùng tự làm** (theo `apps/web/README.md`'s phần "Deploy lên Vercel"):

1. Tạo project Vercel mới, trỏ **Root Directory** = `apps/web`.
2. Đặt Build Command thủ công (`cd ../.. && npm install && npm run build --workspace=apps/web`,
   Output Directory `dist`) vì đây là npm workspaces monorepo, Vercel không tự đoán đúng.
3. Thêm biến môi trường `VITE_API_BASE_URL` trỏ tới backend Railway thật.
4. Sau khi có domain Vercel thật, thêm domain đó vào `Cors__AllowedOrigins__2` trên Railway (service
   `SmartTaskManagers`) — không cần sửa code hay deploy lại backend, đúng mục đích Task 3's thay đổi.
   Dùng index `2` chứ không phải `0`: base `appsettings.json` giờ định nghĩa sẵn index `0`/`1` cho 2
   origin Tauri, và ASP.NET Core's env-var config provider merge mảng theo index với layer bên dưới
   (base `appsettings.json`) chứ không append — `__0` sẽ ghi đè mất origin Tauri đầu tiên.
5. Khi có MySQL local reachable hoặc công cụ điều khiển trình duyệt trong phiên sau, nên chạy lại
   đầy đủ Steps 1–6 của task brief này (click-test thật Login/Dashboard/Tasks/Projects trên
   `apps/web`) — chưa làm được trong phiên này.

i18n (VI/EN) đã thực hiện — phạm vi là `packages/app-core` (toàn bộ page/component dưới
`packages/app-core/src`), 8 task tuần tự. **Chưa bao phủ toàn bộ ứng dụng**: `packages/ui` (tiêu đề
nhóm Sidebar, "New Task"/"Sign out"/"Signed in as…" của Topbar, "Mark all read" của
NotificationPanel, chuỗi trong HabitCard/GoalCard/ProjectCard) và `packages/shared` (nhãn/subtitle
KPI của Dashboard/Today, tiêu đề lane Kanban, `formatDueLabel`'s "Due today"/"Overdue N days" — hiển
thị trên mọi task row toàn app) vẫn còn chuỗi tiếng Anh hard-code, chưa dịch — ghi nhận là việc còn
lại (follow-up), không thuộc phạm vi 8 task đã làm.

**Task 1 — backend, cột `Language` + endpoint đổi ngôn ngữ.** Thêm cột `Language` (`varchar`, mặc
định `"vi"`) vào entity `User`/bảng tương ứng qua migration EF Core mới, cùng
`PATCH /api/auth/language` (yêu cầu JWT hợp lệ, body `{ language: "vi" | "en" }`) để client lưu lựa
chọn ngôn ngữ của user vào DB thay vì chỉ giữ ở localStorage — mục đích là ngôn ngữ theo user, đăng
nhập máy khác vẫn giữ đúng lựa chọn.

**Task 2 — bootstrap `react-i18next` trong `packages/app-core`.** Thêm `i18next` +
`react-i18next`, cấu hình 2 namespace ngôn ngữ `vi`/`en`, `vi` làm mặc định (đúng đối tượng người
dùng chính của app), khởi tạo ở entrypoint `App.tsx` để toàn bộ cây component dùng chung 1 instance
`t()`.

**Task 3 — Settings language switcher nối thật vào i18n + backend.** Trường ngôn ngữ ở trang
Settings (trước đó đã có UI nhưng chưa làm gì thật) giờ gọi `i18n.changeLanguage()` (đổi UI ngay lập
tức, không cần reload) song song với gọi `PATCH /api/auth/language` (lưu xuống DB qua Task 1) —
đổi ngôn ngữ là 1 hành động, không phải 2 bước rời nhau.

**Tasks 4–7 — dịch toàn bộ page/component dưới `packages/app-core/src`.** Tuần tự theo nhóm:
Dashboard/Today/Inbox (Task 4); Tasks/Projects/Goals/Habits + các drawer chi tiết tương ứng (Task
5); Calendar/Kanban/Analytics/Smart Assistant/trang placeholder (Task 6); Settings (nốt phần còn
lại chưa dịch ở Task 3) (Task 7). Mỗi string UI tĩnh thay bằng `t('...')`, thêm key tương ứng vào
2 file namespace `vi`/`en`.

**2 loại trừ phạm vi có chủ đích, phát hiện trong lúc rollout (không phải thiếu sót bỏ quên):**

1. Các lệnh format ngày (`toLocaleDateString`/tương tự) trong `TodayPage.tsx` và `HabitRow.tsx` vẫn
   hard-code locale `'en-US'` — **chưa dịch, để lại có chủ đích** (deferred), không phải lỗi string
   bị bỏ sót; đây là vấn đề định dạng ngày theo locale, khác bản chất với dịch string UI.
2. Mẫu hình dịch **giá trị hiển thị** (label) tách khỏi **giá trị lưu trữ/so sánh** (giữ nguyên
   tiếng Anh, dùng để filter/persist/so sánh logic) cho các mảng enum hiển thị (task status/priority,
   area của Goals, frequency/weekday của Habits) **mới chỉ áp dụng ở `SettingsPage.tsx` (Task 7)**.
   `TaskDetailDrawer.tsx`, `TaskFilters.tsx`, `GoalDetailDrawer.tsx`, `HabitDetailDrawer.tsx`, và
   `ProjectDetailDrawer.tsx` vẫn render nguyên giá trị enum tiếng Anh chưa dịch (ví dụ cùng status
   "In Progress" hiển thị tiếng Việt ở Settings nhưng tiếng Anh ở Task detail drawer, trong cùng
   phiên) — có chủ đích để không phá vỡ filter/logic đang dựa vào giá trị enum cố định, nhưng việc mở
   rộng mẫu hình này sang các drawer/filter còn lại vẫn là việc còn lại (follow-up); các key dịch
   `settings.status*`/`settings.priority*` đã có sẵn và có thể promote sang namespace dùng chung cho
   follow-up đó.

**Task 8 (task này) — verify end-to-end, ghi rõ đã test gì / chưa test được gì:**

- **Step 0** — 2 file doc tiền nhiệm (`docs/superpowers/plans/2026-09-22-i18n-implementation.md`,
  `docs/superpowers/specs/2026-09-22-i18n-design.md`) chưa từng qua Prettier từ trước, không liên
  quan tới các task dịch — chạy `prettier --write` sửa riêng, commit riêng trước khi chạy
  `npm run format` ở Step 1 để không lẫn nợ định dạng cũ vào phạm vi task này.
- `npm run typecheck`, `npm run lint`, `npm run format`, `npm run build --workspace=apps/desktop`,
  `npm run build --workspace=apps/web` — cả 5 lệnh chạy sạch, exit 0.
- `dotnet build -c Release` (từ `backend/`) — `Build succeeded. 0 Warning(s). 0 Error(s).`
- Grep heuristic tìm text JSX tiếng Anh hard-code còn sót (`>[A-Z][a-z]* [a-z]` trong
  `packages/app-core/src/pages`/`components`, loại trừ `t('...')`) — **0 kết quả**, kể cả khi nới
  pattern rộng hơn (`[A-Z][a-zA-Z]* [a-zA-Z]`) để giảm rủi ro bỏ sót — không có gì cần sửa thêm ở
  bước này.
- **Click-test thật trong browser — không thực hiện được, nêu rõ lý do thay vì nhận đã test:**
  `claude-in-chrome` tool nạp được (`tabs_context_mcp` gọi thành công) nhưng trả về "Browser
  extension is not connected" — không có browser tool điều khiển được trong phiên này. Về phía
  backend, khác với Task 1/3 (không có MySQL local reachable), lần này
  `Test-NetConnection -Port 3306` xác nhận cổng MySQL cục bộ **có** mở, nhưng `dotnet user-secrets list` cho `SmartTask.Api`
  chỉ có `Jwt:Secret`, không có `ConnectionStrings:DefaultConnection` — tức là không có credential
  nào được biết để kết nối DB thật. Không tự bịa connection string/mật khẩu để né việc này (đã có
  sibling task từng làm vậy và phải dọn lại). Do thiếu browser tool (điều kiện bắt buộc để click-test
  UI), toàn bộ Step 4 (login VI mặc định → đổi English không reload → đổi lại VI → logout/login lại
  xác nhận backend round-trip) **chưa được verify bằng trải nghiệm thật**, chỉ verify được ở mức
  build/lint/typecheck/grep như trên. Đây là cùng dạng giới hạn môi trường đã ghi nhận trung thực ở
  các Phase 15–19, 30–33.
- **Việc còn lại khi có đủ công cụ (browser control tool + MySQL local reachable với credential
  hợp lệ) trong phiên sau:** chạy lại Step 4 đầy đủ — xác nhận UI mặc định tiếng Việt, chuyển tiếng
  Anh cập nhật toàn bộ nav/trang hiện tại/Settings ngay lập tức không reload, chuyển lại tiếng Việt,
  đăng xuất/đăng nhập lại xác nhận lựa chọn ngôn ngữ persist đúng qua `PATCH /api/auth/language`
  (Task 1).

Mỗi Phase kế tiếp sẽ được trình bày riêng theo format: Mục tiêu → File tạo/sửa → Full code →
Command → Cách chạy → Cách test → Expected Result → Checklist → Git commit đề xuất.
