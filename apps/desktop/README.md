# Desktop — Windows (React + Tauri)

React + TypeScript + Vite (**Phase 05**) đóng gói thành ứng dụng Windows thật bằng **Tauri 2**
(**Phase 06**). Installer `.exe`/`.msi` thật sự chưa làm — đó là **Phase 32**; Phase 06 chỉ dừng ở
`tauri dev` chạy được và `cargo build` cho ra `.exe` debug.

Dùng chung `packages/ui`, `packages/types`, `packages/api-client`, `packages/shared`,
`packages/hooks` với `apps/web` (Phase 33) — không viết lại UI riêng cho từng app.

## Stack

- React 19 + TypeScript
- Vite 6
- Tailwind CSS v4 (`@tailwindcss/vite`, CSS-first — theme định nghĩa tại
  [`packages/ui/src/styles/theme.css`](../../packages/ui/src/styles/theme.css), import lại qua
  `@stm/ui/theme.css`)
- Tauri 2 (`src-tauri/`) — Rust + WebView2 (Windows). `identifier`:
  `com.smarttaskmanager.desktop`.

## Yêu cầu hệ thống (Windows)

|                                      | Bắt buộc | Ghi chú                                                                                                                  |
| ------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| Node.js + npm                        | Có       | dùng cho Vite/React                                                                                                      |
| Rust (rustup/cargo)                  | Có       | cài qua `winget install Rustlang.Rustup` hoặc https://rustup.rs — **không có sẵn mặc định trên Windows**, phải cài riêng |
| MSVC Build Tools (C++) + Windows SDK | Có       | qua Visual Studio Installer, workload "Desktop development with C++"                                                     |
| WebView2 Runtime                     | Có       | Windows 11 đã có sẵn; Windows 10 có thể cần cài thêm                                                                     |

## Chạy (web thường, không cửa sổ native)

```bash
npm install                # ở repo root — cài cho toàn bộ workspaces
npm run dev:desktop         # http://localhost:5173
npm run build:desktop        # production build vào apps/desktop/dist
npm run typecheck --workspace=apps/desktop
```

## Chạy như ứng dụng Desktop thật (Tauri)

```bash
npm run dev:tauri     # tự chạy `npm run dev` (Vite) rồi mở cửa sổ Windows native
npm run build:tauri     # build release + bundle (.exe/.msi) — xem apps/desktop/src-tauri/target
```

`npm run dev:tauri` tự chạy `beforeDevCommand`/`devUrl` khai báo trong
`src-tauri/tauri.conf.json` (hiện là `npm run dev` / `http://localhost:5173`) — **không tự chạy
`npm run dev:desktop` song song**, việc đó sẽ chiếm cổng 5173 và khiến Tauri kết nối nhầm dev
server (đã gặp lỗi này thật khi verify Phase 06 — xem ghi chú trong `docs/roadmap/ROADMAP.md`).

## Application Shell (Phase 07)

```
src/app/routes.ts     APP_ROUTES — nguồn duy nhất cho 12 route (path/label/group/phase/icon)
src/app/router.tsx     createHashRouter (KHÔNG dùng createBrowserRouter — xem lý do dưới)
src/app/AppShell.tsx   layout thật: Sidebar + Topbar (packages/ui) + <Outlet/>
src/pages/PlaceholderPage.tsx   1 component dùng chung cho mọi route chưa có trang thật
```

**Vì sao `createHashRouter` chứ không phải `createBrowserRouter`:** ứng dụng Tauri đóng gói không
có server để trả `index.html` cho mọi path (SPA fallback) — deep-link hoặc refresh vào ví dụ
`/tasks` với history-API routing sẽ lỗi. Route dạng hash (`#/tasks`) luôn load đúng document bất
kể serve thế nào, cả lúc dev lẫn sau khi đóng gói.

Mỗi route hiện render `PlaceholderPage` — Phase 09+ thay `element` trong `router.tsx` bằng trang
thật, path/label/group/icon trong `routes.ts` giữ nguyên. `router.tsx` giữ một map `PAGE_BY_PATH`
(path → element); Dashboard (`/`, Phase 09) và Today (`/today`, Phase 10) đã có trong map này —
Inbox và các route còn lại chỉ cần thêm một dòng vào map khi tới lượt, không sửa gì khác.

## Sidebar + Topbar (Phase 08)

`AppShell.tsx` dùng `Sidebar`/`Topbar` thật từ `@stm/ui` (xem `packages/ui/README.md` để biết vì
sao 2 component này không phụ thuộc `react-router-dom`). File này là nơi **duy nhất** tính
`active` (từ `useLocation()`) và ghép `href` dạng hash (`#/tasks`) — `routes.ts` chỉ giữ path thật
(`/tasks`), không tự thêm `#`.

Nút "+ New Task" trên Topbar (Phase 12, bước 2) mở `TaskDetailDrawer` ở chế độ tạo mới — hoạt
động từ **mọi trang**, không chỉ Tasks, vì cả hai đều đọc/ghi `TasksContext` dùng chung (xem mục
Tasks bên dưới).

## Lưu ý quan trọng khi thêm package mới dùng Tailwind class

Tailwind v4 tự động quét file nguồn trong project, nhưng **bỏ qua `node_modules`** — mà
`@stm/ui` (và sau này `packages/types`/`packages/hooks` nếu có JSX) được resolve qua symlink
workspace trong `node_modules`. Vì vậy `src/index.css` phải khai báo:

```css
@source '../../../packages/ui/src';
```

Thiếu dòng này, class Tailwind dùng bên trong component của `packages/ui` (ví dụ `bg-primary`
trong `Button`) sẽ bị Tailwind bỏ qua, sinh CSS thiếu — không có lỗi build, chỉ là style không
xuất hiện. Đã verify: build ra `apps/desktop/dist/assets/*.css` có chứa `--color-primary:#4f46e5`
và `.bg-primary`.

## Dashboard (Phase 09)

```
src/mock/dashboard.ts             MOCK_DASHBOARD_DATA — dữ liệu tĩnh, thay bằng API thật ở Phase 27
src/pages/Dashboard/DashboardPage.tsx   KPI row · Focus Now · My Areas · Smart Insights
```

Cấu trúc bám theo `computeDashboardData_()` trong
`apps/google-sheets/src/06_Dashboard.gs` (bản Personal Mode đã có, không vẽ lại từ Canva gốc vốn
có Owner/Team Capacity) — 5 KPI giống hệt (Due Today/Overdue/Focus Time/Weekly Progress/Streak),
"My Areas" thay cho "Project Health"+"Team Capacity" của bản team. `smartScore`/`recommendedAction`
trong mock data là **giá trị tĩnh, không phải tính toán thật** — Smart Engine (thuật toán tính các
giá trị này) là Phase 29, chưa làm.

## Today (Phase 10)

```
src/mock/today.ts                       MOCK_TODAY_DATA — dữ liệu tĩnh, thay bằng API thật ở Phase 27
src/pages/Today/TodayPage.tsx            lắp ráp toàn bộ trang
src/pages/Today/BestNextActionCard.tsx   1 khuyến nghị nổi bật, hoặc trạng thái "đã xong hết"
src/pages/Today/TaskListSection.tsx      Do Now / Scheduled / Quick Wins — cùng 1 component, khác tone
src/pages/Today/EndOfDayReview.tsx       tóm tắt tiến độ cuối ngày
```

Bám theo `computeTodayData_()` trong `apps/google-sheets/src/07_Today.gs` — 5 KPI giống hệt (Due
Today/Overdue/Focus Load/Completed/Quick Wins), Best Next Action, 3 nhóm task, End-of-Day Review.
`TaskListSection` và `BestNextActionCard` đều dùng lại `TaskCard`/`EmptyState` từ `@stm/ui` —
**không** viết lại UI task row lần thứ hai. `TaskSummary` (kiểu dữ liệu cho 1 task trong các danh
sách này) chuyển sang `packages/types` ở Phase này vì Dashboard và Today giờ cùng cần đúng shape
đó — tránh định nghĩa lại 2 lần rồi lệch nhau.

## Inbox (Phase 11, refactor ở Phase 12 bước 2)

```
src/pages/Inbox/InboxPage.tsx         đọc TasksContext, lọc status === 'Inbox'
src/components/QuickCaptureInput.tsx  form thêm task nhanh (chỉ title) — dùng chung với Tasks
src/pages/Inbox/InboxTaskRow.tsx      TaskCard + 3 IconButton (Edit/Complete/Delete)
```

Inbox **không có** Frame Canva hay view Google Sheets nào để bám theo — đây là màn hình mới hoàn
toàn từ roadmap gốc, dựng trên một phần thật của data model: `Status = 'Inbox'` vốn đã là status
mặc định mà Quick Add gán cho task mới (`apps/google-sheets/src/10_QuickAdd.gs`).

**Phase 12 bước 2 đã gộp Inbox vào `TasksContext` dùng chung** — Phase 11 cho Inbox một mock
(`MOCK_INBOX_TASKS`, kiểu `TaskSummary`) hoàn toàn tách biệt khỏi Tasks list, nghĩa là complete
một task ở Inbox không phản ánh sang Tasks và ngược lại: hai danh sách "task của bạn" không đồng
bộ trong cùng một app đang chạy. Đã sửa: Inbox giờ chỉ là `tasks.filter(t => t.status === 'Inbox')`
từ đúng store mà Tasks/Topbar dùng. `src/mock/inbox.ts` đã xoá — không cần seed riêng nữa.

Không có `localStorage`, không persistence nào — refresh app là mất hết (kể cả các thay đổi làm ở
Tasks/Inbox/Topbar). Persistence thật chỉ có ở **Phase 27**.

## Tasks (Phase 12 — cả 2 bước: list + Task Detail)

```
src/mock/tasks.ts                     MOCK_TASKS — seed DUY NHẤT cho TasksProvider (không phải per-page nữa)
src/state/TasksContext.tsx             TasksProvider + useTasksContext() — store dùng chung toàn app
src/components/TaskDetailDrawer.tsx    1 form cho cả Create và Edit, mở từ Topbar HOẶC từ dòng task
src/pages/Tasks/TasksPage.tsx          đọc TasksContext + filter + summary + quick add
src/pages/Tasks/TaskFilters.tsx        search + select Status/Priority (native <select>)
src/pages/Tasks/TaskRow.tsx            TaskCard (status+progress) + 3 IconButton (Edit/Complete/Delete)
```

**Bước 1 (list):** summary count (Inbox/Active/Overdue/Completed, khớp `computeTaskCounts_()` trong
`apps/google-sheets/src/08_Tasks.gs`), filter theo tên/Status/Priority, quick-add title-only,
Complete/Delete theo dòng.

**Bước 2 (Task Detail) — vấn đề kiến trúc phải giải quyết trước khi code:** nút "+ New Task" ở
Topbar là **toàn cục** (hiện trên mọi trang), nhưng `useTasks()` gọi cục bộ trong `TasksPage`
(bước 1) nghĩa là mỗi lần mount lại mất state — Topbar không có cách nào ghi vào đúng danh sách
Tasks đang hiển thị. Giải quyết bằng `TasksProvider` (React Context) bọc quanh `<RouterProvider/>`
trong `App.tsx`, gọi `useTasks(MOCK_TASKS)` **một lần duy nhất** cho toàn app; `TasksPage`,
`InboxPage`, `AppShell` (Topbar) đều đọc `useTasksContext()` thay vì tự gọi hook. `TaskDetailDrawer`
render một lần trong `AppShell` (không lồng trong `TasksPage`) — `editingTask` (từ context) `null`
= chế độ tạo, có giá trị = chế độ sửa; cùng 1 `<form>` cho cả hai, cùng nút Save/Cancel/Delete.

`Drawer` (component mới trong `packages/ui`) — panel bên phải + backdrop, đóng bằng Escape hoặc
click backdrop. **Giới hạn a11y đã ghi nhận, không giấu:** chưa có focus trap đầy đủ bên trong
panel — đủ dùng cho Phase này, không phải bỏ sót âm thầm.

`formatDueLabel` (`@stm/shared`) tính nhãn hạn từ `dueDate` ISO thật — khác các Phase trước dùng
chuỗi `dueLabel` viết tay trong mock.

**Sự cố phát hiện khi xây `StatusBadge`:** token màu Status (`packages/ui/src/tokens/colors.ts`,
`theme.css`) từ Phase 04 lấy theo Canva Frame 02 bản team (8 trạng thái: Not Started/To Do/In
Progress/Review/Blocked/On Hold/Completed/Cancelled) — nhưng `TaskStatus` thật (Personal Mode,
`00_Constants.gs`) chỉ có 5: Inbox/To Do/In Progress/Waiting/Completed. Đã sửa token cho khớp domain
thật (xem `packages/ui/README.md`).

**Verify bằng tương tác thật (claude-in-chrome, lần đầu trong toàn bộ project):** mở
`npm run dev:desktop` trong Chrome thật, click qua toàn bộ luồng — mở Edit Drawer trên 1 task có
sẵn (form hiện đúng dữ liệu), đổi Priority/Status/Progress rồi Save (dòng trong list cập nhật
đúng), mở "+ New Task" từ Topbar ở trang Tasks (form trống, mặc định hợp lý), tạo task mới (xuất
hiện đúng ở cả Tasks lẫn Inbox — xác nhận `TasksContext` dùng chung hoạt động), Complete (biến mất
khỏi Inbox), Delete (biến mất khỏi Tasks, `EmptyState` hiện đúng), search "gym" (lọc đúng 1 kết
quả), KPI summary cập nhật đúng sau mỗi thao tác. **Không phát hiện lỗi nào** — toàn bộ hoạt động
đúng như thiết kế ngay từ lần thử đầu tiên.

## Projects (Phase 13)

```
src/mock/projects.ts                  MOCK_PROJECTS — 1 số task trong mock/tasks.ts tham chiếu id ở đây
src/state/ProjectsContext.tsx          ProjectsProvider + useProjectsContext() — cùng pattern TasksContext
src/components/ProjectDetailDrawer.tsx form Create/Edit Project (không có field Health — luôn tính, không nhập tay)
src/pages/Projects/ProjectsPage.tsx     KPI row + quick add + grid ProjectCard
src/pages/Projects/ProjectRow.tsx        tính metrics/health qua @stm/shared, ghép với ProjectCard + Edit/Delete
```

Bám `writeProjectsKpis_()`/`writeProjectCard_()` trong `apps/google-sheets/src/14_Projects.gs` —
4 KPI (Total/Active/At Risk/Avg Progress), card có dải màu health, badge health, progress, 4 metric
chip, Top Focus, Next. `TaskDetailDrawer` (Phase 12) giờ có field **Project** thật (đọc
`useProjectsContext().projects`) — đúng như đã hứa ở cuối Phase 12.

`ProjectsPage`/`ProjectRow` đọc **cả hai** context (`useProjectsContext()` cho danh sách project,
`useTasksContext()` cho task để tính metrics) — 2 context độc lập, page đọc từ cả hai, không cần
context nào biết về context kia.

**Verify bằng tương tác thật (claude-in-chrome):** mở Projects, xác nhận cả 4 project mock tính
đúng health (Attention/At Risk/At Risk/Healthy — khớp tính tay trước khi code) và đúng Top
Focus/Next text; mở Edit Drawer trên project rỗng (dữ liệu đúng); gán task "Water the plants" (vốn
chưa có project) vào "Fitness Reset" qua field Project mới trong Task Detail → quay lại Projects,
xác nhận thẻ "Fitness Reset" cập nhật Open 1, health tự chuyển HEALTHY→ATTENTION, Top Focus/Next
đổi đúng — xác nhận việc gán Task→Project và tính toán lại theo thời gian thực hoạt động đúng qua
2 context riêng biệt; tạo project mới qua quick-add (KPI cập nhật đúng); xoá project (quay lại số
liệu cũ đúng). **Không phát hiện lỗi nào.**
