# packages/types

Types dùng chung: `Task`, `Project`, `Goal`, `Habit`, `User`, `Notification`, `CalendarEvent`.
Một nguồn duy nhất — không định nghĩa lại Task interface khác nhau cho mỗi màn hình.

## Trạng thái

- ✅ Enum domain (Phase 09): `Area`, `Priority`, `TaskStatus`, `Risk` — khớp 1:1 với
  `LOOKUP_LISTS` trong `apps/google-sheets/src/00_Constants.gs` (nguồn dữ liệu thật duy nhất cho
  các tập giá trị này). Dùng bởi `packages/ui` (`PriorityBadge`) và mock data của `apps/desktop`.
- ⏳ Full entity (`Task`, `Project`, `Goal`, `Habit`, `User`, `Notification`, `CalendarEvent`) —
  chưa làm, sẽ thêm khi Phase tương ứng cần đến (Tasks: Phase 12, Projects: Phase 13, ...), không
  model trước khi chưa có yêu cầu cụ thể.

## Test

```bash
npm run typecheck
```
