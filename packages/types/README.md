# packages/types

Types dùng chung: `Task`, `Project`, `Goal`, `Habit`, `User`, `Notification`, `CalendarEvent`.
Một nguồn duy nhất — không định nghĩa lại Task interface khác nhau cho mỗi màn hình.

## Trạng thái

- ✅ Enum domain (Phase 09): `Area`, `Priority`, `TaskStatus`, `Risk` — khớp 1:1 với
  `LOOKUP_LISTS` trong `apps/google-sheets/src/00_Constants.gs` (nguồn dữ liệu thật duy nhất cho
  các tập giá trị này). Dùng bởi `packages/ui` (`PriorityBadge`) và mock data của `apps/desktop`.
- ✅ `TaskSummary` (Phase 09, dùng lại ở Phase 10): shape rút gọn mà `TaskCard` cần để render 1
  task — không phải `Task` đầy đủ. Dashboard's Focus Now và Today's Do Now/Scheduled/Quick Wins
  đều dùng chung interface này thay vì mỗi mock data tự định nghĩa lại.
- ✅ `Task` (Phase 12): entity đầy đủ dùng cho CRUD thật ở Tasks list — chỉ là tập con thực dụng
  của 27 cột trong `TASK_HEADERS` (`00_Constants.gs`), không port 1:1. Bỏ qua đến khi màn hình nào
  cần thật: `Category`, `Tags` dạng phức tạp hơn `string[]`, `Energy`, `Context`,
  `RecurringType`, `DependencyTaskId`, `LastStatusChangedAt`, `Notes`. Ngày tháng là chuỗi ISO
  8601 (`string | null`), không phải `Date` — để shape này không đổi khi vượt qua ranh giới API ở
  Phase 27. `goalId` thêm ở Phase 14.
- ✅ `Project` + `ProjectHealth` (Phase 13): entity khớp `PROJECT_HEADERS` (`00_Constants.gs`) trừ
  `Health` — Health **luôn tính trực tiếp** từ task liên kết qua `computeProjectHealth()`
  (`@stm/shared`), không lưu trên entity để tránh dữ liệu cũ/lệch. `ProjectHealth` là type riêng,
  không dùng chung `Risk` — dù 2 thang màu giống nhau (Frame 01 §5), tách để type-system không lẫn
  risk của Task với health của Project.
- ✅ `Goal` + `GoalStatus` (Phase 14): entity khớp `GOAL_HEADERS` (`00_Constants.gs`). **Khác
  `Project`**: `progress`/`status` là field người dùng nhập trực tiếp, không tính từ task liên kết
  — Goals không có "view engine" tương đương `14_Projects.gs` ở phía Sheets (`createGoal_()` trong
  `03_Data.gs` mặc định `Progress: 0, Status: "On Track"` rồi để nguyên, không có hàm
  `computeGoalHealth_()` nào cả). `Task.goalId` (Phase 14) là link 1 chiều từ Task sang Goal, khớp
  `GoalId` trong `TASK_HEADERS` — giống hệt cơ chế `projectId`.
- ✅ `Habit` + `HabitFrequency` (Phase 15): entity khớp `HABIT_HEADERS` (`00_Constants.gs`).
  **Đứng riêng** — không có `Task.habitId` nào cả (grep toàn bộ `apps/google-sheets/src` xác nhận
  `HabitId` chỉ xuất hiện làm khoá chính của chính `Habit`, không phải cột nào trên `TASK_HEADERS`
  — khác hẳn `projectId`/`goalId`). `streak`/`completedCount`/`lastCompletedDate` là field, Sheets
  cũng không có hàm hoàn thành habit nào để port (`createHabit_()` chỉ set mặc định
  `0`/`0`/`''`) — hành vi "check in hôm nay" ở `useHabits` (`@stm/hooks`) là thiết kế hợp lý tối
  thiểu cho app, không phải port.
- ✅ `Settings` (Phase 19): khớp 1:1 `DEFAULT_SETTINGS` (`00_Constants.gs`, 18 key/4 category). Là
  **1 object duy nhất**, không phải entity list — Sheets lưu dạng hàng Key/Value/Category vì
  spreadsheet không có khái niệm "1 dòng settings" tự nhiên, ở đây dùng object có kiểu thay vì port
  đúng hình dạng hàng đó. Trong 18 key chỉ có 5 key thật sự được đọc ở đâu đó phía Sheets
  (`defaultStatus`/`defaultPriority`/`defaultEstimateMinutes` dùng bởi `createTask_()`/Quick Add,
  `dueSoonDays`/`dailyFocusLimitHours` dùng bởi Dashboard/Today — cả hai vẫn còn là mock tĩnh Phase
  09/10) — 13 key còn lại được định nghĩa nhưng chưa hàm nào đọc tới. Phase này làm cả 18 key thật
  và sửa được; nối các nơi tiêu thụ (default khi tạo Task, dữ liệu thật cho Dashboard/Today) cố ý để
  dành Phase sau, cùng mức độ kiềm chế đã áp dụng cho KPI Streak của Dashboard ở Phase 15.
- ⏳ `User`, `Notification`, `CalendarEvent` — chưa làm, sẽ thêm khi Phase tương ứng cần đến, không
  model trước khi chưa có yêu cầu cụ thể.

## Test

```bash
npm run typecheck
```
