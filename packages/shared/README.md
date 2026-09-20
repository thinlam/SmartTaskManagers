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
- ✅ `computeCalendarMonthData`/`sortCalendarTasks`/`getCalendarTaskTone`/`calendarDateKey` (Phase
  16): port trực tiếp từ `computeCalendarData_()`/`calendarTaskSort_()`/`getCalendarTaskTone_()`/
  `calendarDateKey_()`/`getCalendarGridStart_()` trong `apps/google-sheets/src/12_Calendar.gs` —
  cùng cách nhóm task theo `dueDate`, cùng 4 bộ lọc KPI (scheduledThisMonth/dueToday/overdue/
  completedThisMonth), cùng logic lưới 6 tuần bắt đầu từ Thứ Hai (khớp `WeekStart: 'Monday'` trong
  `00_Constants.gs`), cùng thứ tự sort (open trước completed, rồi priority, rồi SmartScore) và cùng
  thứ tự ưu tiên tone (Completed > quá hạn > Critical/Urgent > High > mặc định). Khác biệt duy nhất
  có chủ đích: `getCalendarTaskTone` trả về tên tone chung (`success`/`danger`/`warning`/`neutral`)
  thay vì hex `CALENDAR_THEME` — cùng cách thay thế `ProjectCard`/`GoalCard` đã làm; `days` (mảng 42
  ô) thay cho `tasksByDate` (map) vì đó là thứ lưới React thực sự cần render.
- ⏳ Smart Score / Risk / RecommendedAction (`apps/google-sheets/src/05_SmartEngine.gs`) —
  **chưa port** — đó là Phase 29 (Smart Engine), không làm sớm.

## Test

```bash
npm run typecheck
```
