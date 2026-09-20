# packages/shared

Utils, formatters, date logic dùng chung.

## Trạng thái

- ✅ `formatDueLabel` (Phase 12): chuyển `dueDate` ISO thành nhãn tương đối ("Due today", "Due
  tomorrow", "Overdue 2 days", "Due in 3 days", "No due date") — khớp cách viết đã dùng trong mock
  data Dashboard/Today/Inbox và bảng Tasks ở Canva Frame 05 (có số ngày). **Không** port 1:1
  `todayDueLabel_()` trong `apps/google-sheets/src/07_Today.gs` — hàm đó bỏ số ngày ("Overdue",
  "Tomorrow") để vừa 1 ô spreadsheet hẹp; desktop có đủ chỗ hiển thị số ngày.
- ✅ `computeProjectMetrics`/`computeProjectHealth`/`getProjectTopFocusText`/`getProjectNextAction`/
  `formatTargetLabel` (Phase 13): port trực tiếp từ `computeProjectMetrics_()`,
  `computeProjectHealth_()`, `getProjectTopFocusText_()`, `getProjectNextAction_()`,
  `getProjectTargetLabel_()` trong `apps/google-sheets/src/14_Projects.gs` — cùng công thức, cùng
  trọng số (`PROJECT_HEALTH_WEIGHTS`), cùng ngưỡng bucket, cùng câu chữ khuyến nghị. Health luôn
  tính lại từ task liên kết mỗi lần gọi, không cache.
- **Phase 14 (Goals) không thêm hàm nào ở đây.** `formatTargetLabel` (Phase 13) đủ dùng lại
  nguyên vẹn cho `Goal.targetDate` — cùng shape `string | null`, cùng cách hiển thị nhãn tương đối
  mong muốn. Không có `computeGoalMetrics`/`computeGoalHealth` vì Sheets không có view engine nào
  cho Goals để port (`progress`/`status` là field nhập tay, xem `@stm/types`'s `Goal`).
- **Phase 15 (Habits) cũng không thêm hàm nào ở đây.** "Last done" label của Habit được viết trực
  tiếp trong `apps/desktop/src/pages/Habits/HabitRow.tsx` (không phải hàm dùng chung) — khác
  `formatDueLabel`/`formatTargetLabel`, nhãn này không có khái niệm "quá hạn"/khẩn cấp nào để lặp
  lại logic tương tự, nên chưa đủ lý do tách thành hàm `@stm/shared` riêng.
- ⏳ Smart Score / Risk / RecommendedAction (`apps/google-sheets/src/05_SmartEngine.gs`) —
  **chưa port** — đó là Phase 29 (Smart Engine), không làm sớm.

## Test

```bash
npm run typecheck
```
