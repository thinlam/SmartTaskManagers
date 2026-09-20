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
  cần thật: `Category`, `Tags` dạng phức tạp hơn `string[]`, `Energy`, `Context`, `GoalId`,
  `RecurringType`, `DependencyTaskId`, `LastStatusChangedAt`, `Notes`. Ngày tháng là chuỗi ISO
  8601 (`string | null`), không phải `Date` — để shape này không đổi khi vượt qua ranh giới API ở
  Phase 27.
- ✅ `Project` + `ProjectHealth` (Phase 13): entity khớp `PROJECT_HEADERS` (`00_Constants.gs`) trừ
  `Health` — Health **luôn tính trực tiếp** từ task liên kết qua `computeProjectHealth()`
  (`@stm/shared`), không lưu trên entity để tránh dữ liệu cũ/lệch. `ProjectHealth` là type riêng,
  không dùng chung `Risk` — dù 2 thang màu giống nhau (Frame 01 §5), tách để type-system không lẫn
  risk của Task với health của Project.
- ⏳ `Goal`, `Habit`, `User`, `Notification`, `CalendarEvent` — chưa làm, sẽ thêm khi Phase tương
  ứng cần đến (Goals: Phase 14, ...), không model trước khi chưa có yêu cầu cụ thể.

## Test

```bash
npm run typecheck
```
