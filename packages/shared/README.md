# packages/shared

Utils, formatters, date logic dùng chung.

## Trạng thái

- ✅ `formatDueLabel` (Phase 12): chuyển `dueDate` ISO thành nhãn tương đối ("Due today", "Due
  tomorrow", "Overdue 2 days", "Due in 3 days", "No due date") — khớp cách viết đã dùng trong mock
  data Dashboard/Today/Inbox và bảng Tasks ở Canva Frame 05 (có số ngày). **Không** port 1:1
  `todayDueLabel_()` trong `apps/google-sheets/src/07_Today.gs` — hàm đó bỏ số ngày ("Overdue",
  "Tomorrow") để vừa 1 ô spreadsheet hẹp; desktop có đủ chỗ hiển thị số ngày.
- ⏳ Smart Score / Risk / RecommendedAction (`apps/google-sheets/src/05_SmartEngine.gs`) —
  **chưa port** — đó là Phase 29 (Smart Engine), không làm sớm.

## Test

```bash
npm run typecheck
```
