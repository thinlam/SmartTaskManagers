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

## Goals (Phase 14)

```
src/mock/goals.ts                   MOCK_GOALS — 1 số task trong mock/tasks.ts tham chiếu id ở đây qua goalId
src/state/GoalsContext.tsx           GoalsProvider + useGoalsContext() — cùng pattern TasksContext/ProjectsContext
src/components/GoalDetailDrawer.tsx  form Create/Edit Goal — CÓ field Status + Progress (khác Project)
src/pages/Goals/GoalsPage.tsx        KPI row + quick add + grid GoalCard
src/pages/Goals/GoalRow.tsx          đếm task liên kết (goalId) + ghép GoalCard + Edit/Delete
```

**Khác biệt quan trọng với Projects (Phase 13):** Goals không có view/metrics engine nào ở phía
Sheets (không có `15_Goals.gs`) — chỉ có CRUD thô (`GOAL_HEADERS`, `createGoal_()`/`getAllGoals_()`
trong `00_Constants.gs`/`03_Data.gs`). `Progress`/`Status` là field người dùng **nhập tay**, không
tính từ task liên kết — vì vậy `GoalDetailDrawer` có thêm Status select + Progress range (giống
Task Detail), khác hẳn `ProjectDetailDrawer` (không có field Health vì Health luôn tính). KPI row
của `GoalsPage` (Total/On Track/At Risk/Avg Progress) chỉ là rollup trực tiếp từ field đã lưu, không
gọi `@stm/shared` nào — Phase này không thêm hàm nào vào `packages/shared` (xem
`packages/shared/README.md`).

`GoalRow` hiển thị số task liên kết bằng cách đếm thẳng `allTasks.filter(t => t.goalId === goal.id)`
— một phép đếm đơn giản trên dữ liệu thật (`Task.goalId`), không phải điểm số Smart Engine nào.
`TaskDetailDrawer` (Phase 12) giờ có thêm field **Goal** (đọc `useGoalsContext().goals`), đặt cạnh
Priority — cùng cơ chế field Project ở Phase 13, đọc từ context riêng, độc lập với TasksContext.

**Verify bằng tương tác thật (claude-in-chrome):** mở Goals, xác nhận 3 goal mock hiển thị đúng
status/progress/target/số task liên kết (1/2/0); sửa "Learn Conversational English" từ On Track
sang At Risk qua Edit Drawer → Save, xác nhận card đổi badge và KPI (On Track 1→0, At Risk 1→2)
cập nhật ngay; mở "+ New Task", chọn Goal = "Run a 5K", Add task → quay lại Goals, xác nhận card
"Run a 5K" đổi từ "No tasks linked yet" sang "1 task linked" theo thời gian thực; tạo goal mới qua
quick-add (mặc định Personal/On Track/0%/không target date đúng, KPI cập nhật đúng); xoá goal đó
(quay lại số liệu cũ đúng). **Không phát hiện lỗi nào** — `npm run typecheck`/`lint`/`format` cũng
pass sạch ngay từ lần đầu.

## Habits (Phase 15)

```
src/mock/habits.ts                   MOCK_HABITS — đứng riêng, không task nào tham chiếu (xem @stm/types's Habit)
src/state/HabitsContext.tsx           HabitsProvider + useHabitsContext() — cùng pattern các context trước
src/components/HabitDetailDrawer.tsx  form Create/Edit Habit — CHỈ Name/Frequency/Target count
src/pages/Habits/HabitsPage.tsx       KPI row + quick add + grid HabitCard
src/pages/Habits/HabitRow.tsx         tính lastDoneLabel/checkedInToday + ghép HabitCard + Edit/Delete
```

**Khác biệt với Goals/Projects:** Habits **đứng riêng hoàn toàn** — không có `Task.habitId` nào để
link 2 chiều (grep toàn bộ `apps/google-sheets/src` xác nhận `HabitId` chỉ là khoá chính của Habit,
không xuất hiện trên `TASK_HEADERS`), nên `TaskDetailDrawer` **không** có field Habit — khác Project
(Phase 13) và Goal (Phase 14). Sheets cũng không có hàm hoàn thành habit nào để port
(`createHabit_()`/`getAllHabits_()` là toàn bộ những gì tồn tại) — `HabitDetailDrawer` vì vậy chỉ
có Name/Frequency/Target count; `streak`/`completedCount`/`lastCompletedDate` đổi qua action riêng
"Check in today" trên `HabitCard` (`useHabits().checkInHabit`), không sửa tay trong form.

`checkInHabit` là thiết kế hợp lý tối thiểu, không phải port: +1 streak, +1 completedCount, set
`lastCompletedDate` = hôm nay, no-op nếu hôm nay đã check-in — cố ý không có logic "reset streak
khi bỏ lỡ ngày" vì không có tham chiếu Sheets nào để verify công thức đó đúng.

KPI row của `HabitsPage` (Total/Checked In Today/Best Streak/Total Check-ins) là rollup trực tiếp
từ field đã lưu — "Best Streak" mô phỏng đúng `getBestHabitStreak_()` trong
`apps/google-sheets/src/06_Dashboard.gs` (max `Streak` trong tất cả habit), tình cờ là tham chiếu
Sheets thật duy nhất tồn tại cho Habits, dù nó là KPI của Dashboard chứ không phải trang Habits.
**Chưa nối** Dashboard's KPI "Streak" (hiện vẫn là giá trị tĩnh từ Phase 09) sang dữ liệu Habit
thật — để dành cho Phase sau, ngoài phạm vi Phase này.

**Chưa verify bằng tương tác thật lần này** — công cụ `claude-in-chrome` không kết nối được trong
phiên làm việc này (môi trường mới, `E:\SmartTaskManager`, khác phiên trước dùng `D:\...`; đã thử
lại sau khi cài Rust, extension vẫn không kết nối — có vẻ là sự cố phía extension/connector, không
phải thiếu công cụ). Đã verify bằng `npm run typecheck`/`lint`/`format` (pass sạch ngay từ lần đầu)
và `npm run build:desktop` (build production thành công). **Môi trường Windows native cũng đã được
kiểm tra và cài đủ trong phiên này:** máy `E:\SmartTaskManager` ban đầu thiếu hẳn Rust (MSVC Build
Tools + Windows SDK + WebView2 Runtime đã có sẵn từ trước) — đã cài qua
`winget install --id Rustlang.Rustup` (ra Rust 1.98.1, khớp bản dùng ở Phase 06). `cargo check`
trong `src-tauri/` pass sạch (biên dịch toàn bộ crate Tauri, ~1 phút lần đầu); `npm run dev:tauri`
build và chạy `app.exe` thật, cửa sổ Windows native mở ổn định, process `Responding: True` sau vài
giây — xác nhận app chạy đúng cả ở tầng native, không chỉ web. Nên tự click-test trên máy trước khi
coi Phase này là xong hẳn — đặc biệt luồng "Check in today" (streak/completedCount tăng đúng, nút
disable đúng khi đã check-in hôm nay, không tăng 2 lần cùng ngày).

## Calendar (Phase 16)

```
packages/shared/src/calendarMetrics.ts   port từ 12_Calendar.gs — grid 6 tuần, 4 KPI, agenda, sort/tone task
src/pages/Calendar/CalendarPage.tsx      state anchor (tháng đang xem, local) + KPI row + nav + grid + agenda
src/pages/Calendar/CalendarGrid.tsx      header thứ (Mon→Sun) + 42 ô CalendarDayCell
src/pages/Calendar/CalendarDayCell.tsx   1 ô ngày: header + tối đa 4 task chip (icon+tone) + footer "N tasks/+N more"
src/pages/Calendar/CalendarAgenda.tsx    danh sách quá hạn + sắp tới, tái dùng TaskCard
```

**Không có Context/store riêng nào mới** — khác Projects/Goals/Habits, Calendar chỉ **đọc**
`useTasksContext()` (không CRUD task nào riêng cho Calendar) và tái dùng `TaskDetailDrawer` đã có
sẵn: click vào 1 task (trong ô ngày hoặc dòng Agenda) gọi `openEditDrawer(task)` y hệt cách Tasks
list mở form Edit — đúng tinh thần `openSelectedCalendarTask_()` phía Sheets (click cell mở Task
Details). Tháng đang xem (`anchor`) là `useState` cục bộ trong `CalendarPage`, không phải context
dùng chung — đúng theo cách Sheets lưu nó (script Property riêng cho sheet Calendar, không màn hình
nào khác đọc).

**Không thêm component mới vào `packages/ui`** — khác các Phase trước (ProjectCard/GoalCard/
HabitCard), lưới tháng và ô ngày là bố cục đặc thù riêng cho 1 màn hình (không tái dùng ở đâu khác),
nên ở lại `apps/desktop/src/pages/Calendar/` — đúng nguyên tắc đã áp dụng cho `TaskFilters`/
`ProjectRow`/`GoalRow`/`HabitRow`. Agenda list tái dùng thẳng `TaskCard` (không viết row thứ 4).

Prefix ký hiệu ✓/!/◆/• của Sheets (để vừa 1 ô hẹp) được thay bằng icon Lucide thật
(`Check`/`TriangleAlert`/`Diamond`/`Circle`) trong `CalendarDayCell` — desktop có đủ chỗ hiển thị
icon SVG, giống cách `formatDueLabel` (Phase 12) đã khác `todayDueLabel_()` vì lý do tương tự.

**Sự cố thật gặp phải khi build:** `tsconfig` bật `noUncheckedIndexedAccess`, khiến
`tasksByDate[key].sort(...)` sau vòng lặp `Object.keys()` báo lỗi "Object is possibly undefined" dù
logic đảm bảo key luôn tồn tại — sửa bằng `Object.values(tasksByDate).forEach(...)` thay vì index
lại bằng key, để TypeScript tự suy luận đúng không cần ép kiểu.

Verify thật: `npm run typecheck`/`lint`/`format` pass sạch (sau khi sửa lỗi `noUncheckedIndexedAccess`
ở trên). `npm run build:desktop` build production thành công — đã grep trực tiếp bundle xác nhận
text "Scheduled"/"Due Today"/"Agenda"/subtitle Calendar thật có trong file JS build ra, không phải
code chết. `npm run dev:tauri` mở `app.exe` thật, ổn định, không crash. **Chưa click-test tương tác
thật** — `claude-in-chrome` vẫn không kết nối được trong phiên này (đã thử lại nhiều lần). Nên tự
thử trên máy trước khi coi Phase 16 là xong hẳn: chuyển tháng (prev/next/Today), click 1 task trong
ô ngày và trong Agenda để xác nhận Edit Drawer mở đúng task, kiểm tra "+N more" khi 1 ngày có >4
task.

## Kanban (Phase 17)

```
packages/shared/src/kanbanMetrics.ts   port từ 11_Kanban.gs — 5 lane, sort/tone per lane, 4 KPI, Top Focus
src/pages/Kanban/KanbanPage.tsx        KPI row + Top Focus banner + 5 lane cuộn ngang
src/pages/Kanban/KanbanLane.tsx        header lane (count, cảnh báo WIP) + tối đa 7 card + "+N more"/empty text
src/pages/Kanban/KanbanCard.tsx        1 thẻ task: title, PriorityBadge + meta, action/description, 3 chip Due/Progress/Score
```

**Cùng nguyên tắc với Calendar (Phase 16):** không context/store mới — chỉ đọc `useTasksContext()`
(tasks + click-to-edit) và **thêm** `useProjectsContext()` để tra `projectId` ra tên Project cho
dòng meta của card (`task.Project` bên Sheets vốn chỉ là chuỗi tên, còn ở đây `Project` là entity
thật nên phải tra bằng id — giống cách `ProjectsPage`/`ProjectRow` đã đọc song song 2 context ở
Phase 13). Click vào 1 card mở `TaskDetailDrawer` (Edit) có sẵn, giống `openSelectedKanbanTask_()`
phía Sheets. Không component `packages/ui` mới — lane/card là bố cục đặc thù Kanban, chỉ dùng ở 1
màn hình, nên ở lại `apps/desktop` (đúng quyết định đã áp dụng cho Calendar); `KanbanCard` tái dùng
`PriorityBadge` có sẵn cho priority thay vì port riêng 1 dải màu priority như bản Sheets.

5 lane khớp đúng thứ tự `TaskStatus` (Inbox/To Do/In Progress/Waiting/Completed) — không có lane
"không xác định" nào cần fallback về Inbox như bản Sheets, vì kiểu `TaskStatus` của app đã đảm bảo
task luôn có 1 trong 5 giá trị hợp lệ. Lane "In Progress" hiện cảnh báo (badge + subtitle màu danger)
khi vượt WIP limit khuyến nghị (>3), đúng `getKanbanLaneTone_()`. Banner "Top Focus" (task có
SmartScore cao nhất còn mở) đặt dưới header, đúng vị trí/nội dung `TOP FOCUS • {tên} • Score {N}`
của bản gốc.

Verify thật: `npm run typecheck`/`lint`/`format` pass sạch (1 lỗi type thật gặp phải: mảng
`parts = [task.area]` bị TypeScript suy luận kiểu `Area[]` nên `push()` chuỗi Project name báo lỗi
— sửa bằng khai kiểu tường minh `const parts: string[] = [...]`). `npm run build:desktop` build
production thành công — grep trực tiếp bundle xác nhận text "Kanban"/"Open Tasks"/"TOP FOCUS"/
"recommended WIP" thật có mặt. `npm run dev:tauri` mở `app.exe` thật, ổn định, `Responding: True`.
**Chưa click-test tương tác thật** — `claude-in-chrome` vẫn không kết nối được (đã thử lại). Nên tự
thử trên máy trước khi coi Phase 17 là xong hẳn: click card trong từng lane mở đúng Edit Drawer,
kiểm tra "+N more" khi 1 lane có >7 task, kiểm tra cảnh báo WIP khi In Progress có >3 task.

## Analytics (Phase 18)

```
packages/shared/src/analyticsMetrics.ts   không port gì thật — 15_Reports.gs chưa từng được build
src/pages/Analytics/AnalyticsPage.tsx      KPI row + Priority/Area distribution + Weekly trend + Project progress + Insights
src/pages/Analytics/WeeklyTrendChart.tsx   bar chart CSS thuần, không thêm thư viện chart
```

**Không có gì để port lần này** — kiểm tra kỹ trước khi code (đúng nguyên tắc audit-trước) và xác
nhận `apps/google-sheets/docs/claude/MODULE_PROMPTS.md` §10 chỉ là **đặc tả** cho `15_Reports.gs`,
chưa từng được viết thật (liệt kê toàn bộ file `.gs` production xác nhận không tồn tại). Yêu cầu
duy nhất còn giá trị từ đặc tả đó là nguyên tắc, không phải code: "Chỉ sử dụng dữ liệu thực. Không
bịa analytics. Không thêm team metrics." — Analytics chỉ đọc `useTasksContext()`/
`useProjectsContext()`, mọi con số đều tổng hợp trực tiếp từ field thật, không có điểm số/suy luận
nào như Smart Engine (Phase 29).

Ngoại lệ đáng chú ý: `getAreaProgress` **có port thật** từ `getAreaProgress_()` trong
`06_Dashboard.gs` — hàm có thật dù Dashboard chưa gọi nó (Dashboard vẫn là mock tĩnh từ Phase 09,
nối dây thật là Phase 27, ngoài phạm vi ở đây); bố cục hiển thị (Progress bar + completed/open/total)
cố ý giống hệt "My Areas" của Dashboard cho nhất quán. `getProjectProgressList` tái dùng thẳng
`computeProjectMetrics` (Phase 13), không tính lại công thức. Không thêm thư viện chart nào —
`WeeklyTrendChart` là bar chart CSS thuần (div với `height` theo %), đúng tinh thần "professional,
minimal, không biến thành dashboard quá nhiều chart" của đặc tả gốc.

**Không có Empty State rỗng vô nghĩa** khi chưa có task nào (đúng nguyên tắc UI_UX_MASTER_PROMPT.md
§15) — trang hiện `EmptyState` thay vì KPI toàn số 0.

Verify thật: `npm run typecheck`/`lint`/`format` pass sạch ngay từ lần đầu. `npm run build:desktop`
build production thành công — grep trực tiếp bundle xác nhận text "Analytics"/"Completion Rate"/
"Priority Distribution"/"Weekly Trend" thật có mặt. `npm run dev:tauri` mở `app.exe` thật, ổn định,
`Responding: True`. **Chưa click-test tương tác thật** — `claude-in-chrome` vẫn không kết nối được
(đã thử lại). Nên tự thử trên máy trước khi coi Phase 18 là xong hẳn: xác nhận các con số (Completion
Rate/Overdue Rate/phân bố Priority/Area) khớp đúng với dữ liệu task thật đang có trong app, và
Weekly Trend đếm đúng theo `completedDate`.

## Settings (Phase 19)

```
src/mock/settings.ts             MOCK_SETTINGS — copy 1:1 DEFAULT_SETTINGS (00_Constants.gs)
src/state/SettingsContext.tsx     SettingsProvider + useSettingsContext() — 1 object, không có drawer/editingX
src/pages/Settings/SettingsPage.tsx   form 4 nhóm (General/Task Defaults/Focus & Schedule/Smart Engine)
```

**Không có Create/Edit/Delete** như các entity khác — Settings là **1 object duy nhất**, nên
`SettingsPage` là 1 form sửa tại chỗ: mỗi field gọi `updateSettings(patch)` ngay khi đổi, không có
nút Save riêng — giống cách màn Settings của app native thường hoạt động, không phải thiết kế tuỳ
tiện.

`packages/ui` thêm `Switch` (đã hứa từ Phase 04, giờ mới có nhu cầu thật — 4 toggle nhóm "Smart
Engine": Smart Score Enabled/Goal Alignment Enabled/Schedule Overload Warning/Explain
Recommendations). Có ghi chú rõ trong UI: các toggle này **chưa đổi hành vi gì trong app** — Smart
Engine thật là Phase 29.

**Cố ý không nối Settings vào nơi tiêu thụ nào** — dù Sheets thật có đọc `defaultStatus`/
`defaultPriority`/`defaultEstimateMinutes` khi tạo task (`createTask_()`/Quick Add) và `dueSoonDays`/
`dailyFocusLimitHours` ở Dashboard/Today, việc nối `TaskDetailDrawer`/`useTasks` đọc
`SettingsContext` bị hoãn sang Phase sau — cùng mức độ kiềm chế đã áp dụng cho KPI Streak của
Dashboard ở Phase 15 (không lùi lại sửa các trang đã xong ở Phase trước, chỉ làm trang mới đúng
100% thật ở scope của Phase đó).

**Sự cố thật gặp phải khi viết code:** JSDoc comment cho `Settings` type (trong `@stm/types`) chứa
chuỗi `FocusDays*/` — 2 ký tự `*/` bên trong đoạn văn vô tình đóng khối comment sớm, gây hàng loạt
lỗi cú pháp dây chuyền ở `tsc`. Sửa bằng cách viết lại câu để không có `*/` liền nhau trong nội dung
comment.

Verify thật: `npm run typecheck`/`lint`/`format` pass sạch (sau khi sửa lỗi comment trên). `npm run
build:desktop` build production thành công — grep trực tiếp bundle xác nhận text "Settings"/
"Workspace Name"/"Smart Engine"/"Focus & Schedule" thật có mặt. `npm run dev:tauri` mở `app.exe`
thật, ổn định, `Responding: True`. **Chưa click-test tương tác thật** — `claude-in-chrome` vẫn
không kết nối được (đã thử lại). Nên tự thử trên máy trước khi coi Phase 19 là xong hẳn: đổi từng
loại field (text/select/number/time/switch) và xác nhận giá trị cập nhật đúng ngay lập tức, không
cần bấm Save.
