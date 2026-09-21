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
- ✅ `computeKanbanBoardData`/`getKanbanLaneSubtitle`/`getKanbanEmptyText`/`getKanbanProgressTone`/
  `getKanbanScoreTone`/`getKanbanDueTone`/`getKanbanDueLabel` (Phase 17): port trực tiếp từ
  `computeKanbanData_()`/`getKanbanLaneSubtitle_()`/`getKanbanEmptyText_()`/
  `getKanbanProgressTone_()`/`getKanbanScoreTone_()`/`getKanbanDueTone_()`/`kanbanDueLabel_()`
  trong `apps/google-sheets/src/11_Kanban.gs` — cùng 5 lane theo đúng thứ tự `TaskStatus`, cùng sort
  mỗi lane (Completed: `completedDate` mới nhất trước; lane khác: SmartScore giảm dần rồi due date
  tăng dần, không hạn sinks xuống cuối — khớp `kanbanDueSortValue_`), cùng ngưỡng tone Progress/
  Score/Due, cùng câu chữ subtitle/empty-text từng lane, cùng WIP limit cảnh báo (In Progress > 3 →
  tone danger). Khác biệt có chủ đích: `getKanbanEmptyText` bỏ ký tự xuống dòng `\n` literal (chỉ
  để vừa ô Sheets hẹp) thành 1 câu liền — desktop có đủ chỗ.
- ✅ `computeAnalyticsSummary`/`getPriorityDistribution`/`getAreaProgress`/`getProjectProgressList`/
  `getWeeklyCompletionTrend`/`getAnalyticsInsights` (Phase 18): **không có gì để port** —
  `apps/google-sheets/docs/claude/MODULE_PROMPTS.md` §10 đặc tả `15_Reports.gs` nhưng file đó
  **chưa từng được build thật** trong app Sheets production (xác nhận bằng cách liệt kê toàn bộ
  file `.gs` thật có). Yêu cầu duy nhất còn giá trị từ spec đó vẫn được tuân thủ: chỉ dùng dữ liệu
  thực, không bịa analytics, không thêm team metrics. Ngoại lệ: `getAreaProgress` **có port thật**
  — từ `getAreaProgress_()` trong `apps/google-sheets/src/06_Dashboard.gs` — và nay được Dashboard
  thật sự dùng (xem mục Dashboard/Today bên dưới).
  `getProjectProgressList` tái dùng thẳng `computeProjectMetrics` (Phase 13), không tính lại công
  thức progress. Các hàm còn lại (summary/priority distribution/weekly trend/insights) là thiết kế
  mới tối thiểu, chỉ đếm/tổng hợp trực tiếp trên field thật — không có điểm số hay suy luận nào như
  Smart Engine.
- ✅ `computeDashboardData`/`computeTodayData` (sau Phase 30): port trực tiếp từ
  `computeDashboardData_()` (`06_Dashboard.gs`) và `computeTodayData_()` (`07_Today.gs`) — cùng 5
  KPI mỗi trang, cùng Focus Now (top 6 open task theo SmartScore, tie-break theo due date) / My
  Areas (tái dùng `getAreaProgress` — không định nghĩa lại) / Smart Insights, cùng Do Now (urgent
  pool trừ Waiting, sort theo `todayByScoreDesc_`) / Scheduled (task due hôm nay có `dueTime`, trừ
  những task đã rơi vào Do Now) / Quick Wins / Best Next Action / End-of-Day Review.
  **Không tính lại SmartScore/Risk/RecommendedAction** — 2 hàm này chỉ đọc field đã có sẵn trên
  `Task` (do backend's Smart Engine, Phase 29, tính và trả về qua API), khớp quyết định đã chốt
  cùng người dùng: "dùng giá trị có sẵn từ API, không port lại thuật toán sang TypeScript" (tránh 2
  nơi tính lệch nhau theo thời gian). `dailyFocusLimitHours` hard-code `= 4` — khớp
  `DEFAULT_SETTINGS`, chưa có Settings API ở cả 2 đầu (xem `apps/desktop/README.md`).
  `computeDashboardData_()`'s `DueSoonDays` không được port — đọc kỹ hàm gốc xác nhận nó được lấy
  ra nhưng chưa từng dùng tới, port đúng những gì hàm gốc THẬT SỰ làm, không thêm cái nó chưa từng
  làm. `Task.dueTime` (mới, `packages/types`) — trước đây bị bỏ sót khi map từ backend response dù
  backend luôn trả về field này; Today's Scheduled section cần nó nên bổ sung ở đây.
  Verify thật bằng fixture data + `tsx` (không chỉ đọc code khớp dòng): KPI đếm đúng, Focus
  Now/doNow sort đúng thứ tự SmartScore, Scheduled label format đúng "2:30 PM"/"9:15 AM", và xác
  nhận đúng hành vi "doNow chiếm chỗ trước Scheduled" khi cả hai đều đủ điều kiện due hôm nay —
  đúng y hệt hành vi hàm gốc, không phải giả định.

- ✅ `computeSmartAssistantData` (Smart Assistant, post-Phase-30): **không có tiền lệ Sheets** —
  route `/assistant` chỉ là chỗ trống trong nav từ Phase 04 ("Phase 29+ (Smart Engine)"), chưa từng
  có phase build thật; grep `apps/google-sheets/src` xác nhận không view/recommendation nào tương
  tự từng tồn tại. Phạm vi chốt cùng người dùng: trang khuyến nghị rule-based thật, **không phải**
  chat/LLM (cần tích hợp AI thật — quyết định kỹ thuật lớn hơn nhiều, chưa làm).
  Sâu hơn Dashboard's Focus Now (giới hạn 6, 1 danh sách phẳng): nhóm **mọi** task mở theo
  `recommendedAction` (thứ tự hiển thị khớp đúng priority chain của `SmartEngineService.
RecommendAction`, không phải alphabet), cộng thêm cảnh báo cấp Project/Goal/Habit mà Dashboard
  không hiển thị. Quy tắc habit-streak-at-risk khớp y hệt `NotificationService.
GenerateHabitNotificationsAsync` (Phase 30) nhưng tính lại phía client (trang này nói về "nên làm
  gì tiếp theo", không phải đọc lại notification feed). Project alert tái dùng thẳng
  `computeProjectMetrics`/`computeProjectHealth`/`getProjectNextAction` (Phase 13) — không định
  nghĩa lại công thức health.
  Verify thật bằng fixture data + `tsx`: risk count đúng (loại task Completed), thứ tự
  criticalTasks theo risk rồi SmartScore, thứ tự actionGroups đúng priority chain, project/goal/
  habit alert lọc đúng điều kiện (project Healthy bị loại, goal On Track bị loại, habit Weekly/đã
  check-in hôm nay bị loại) — cả 7 assertion đều pass với dữ liệu dựng thật, không chỉ đọc code.

## Test

```bash
npm run typecheck
```
