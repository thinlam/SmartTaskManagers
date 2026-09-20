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

Nút "+ New Task" trên Topbar hiện chỉ `console.info` — Quick Add thật (dialog/sidebar tạo task
nhanh, theo mẫu `10_QuickAdd.gs` bên Google Sheets) chưa tồn tại, sẽ xây ở **Phase 12**.

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
