# Smart Task Manager — Module UI Prompts

> File này chứa các prompt ngắn để dùng khi muốn Claude sửa **một màn cụ thể**.
>
> Trước mỗi yêu cầu, Claude phải tuân theo:
>
> `docs/claude/UI_UX_MASTER_PROMPT.md`

---

# Cách dùng nhanh

Trong Claude Code / Claude có quyền đọc repository, chỉ cần nói:

```text
Đọc docs/claude/UI_UX_MASTER_PROMPT.md trước.

Sau đó dùng yêu cầu trong docs/claude/MODULE_PROMPTS.md
cho module Projects.

Review source hiện tại trước và ghi FULL CODE.
```

Hoặc copy prompt module tương ứng bên dưới.

---

# 1. Dashboard — `06_Dashboard.gs`

```text
Đọc docs/claude/UI_UX_MASTER_PROMPT.md và tuân thủ toàn bộ Design System.

Bây giờ review và refactor:

06_Dashboard.gs — Dashboard

Mục tiêu:
- nhìn giống Personal Productivity Dashboard thực tế
- hierarchy rõ
- chỉ giữ KPI thực sự quan trọng
- Focus Now nổi bật
- Smart Insights dễ đọc
- My Areas / workload rõ
- giảm visual noise
- tránh quá nhiều màu
- spacing rộng và chuyên nghiệp
- dữ liệu phải lấy từ source of truth
- không hard-code dữ liệu giả
- giữ nguyên business logic đúng

Nếu UI vẫn nhìn giống Google Sheet được tô màu thì chưa đạt.

Đọc source trước, sau đó GHI FULL 06_Dashboard.gs.
```

---

# 2. Today — `07_Today.gs`

```text
Đọc docs/claude/UI_UX_MASTER_PROMPT.md trước.

Review và refactor:

07_Today.gs — Today

Tôi muốn Today trở thành màn execution chính cho cá nhân.

Cần làm rõ:
- Best Next Action
- Due Today
- Overdue
- Do Now
- Scheduled
- Quick Wins
- Capacity / workload
- End-of-Day Review nếu dữ liệu hỗ trợ

Yêu cầu:
- hierarchy mạnh
- dễ scan trong vài giây
- task quan trọng nhất phải nổi bật
- semantic color thống nhất
- ít visual noise
- không nhét quá nhiều dữ liệu vào một row
- empty state đẹp
- không bịa insight

Giữ business logic đúng và GHI FULL 07_Today.gs.
```

---

# 3. Tasks — `08_Tasks.gs`

```text
Đọc docs/claude/UI_UX_MASTER_PROMPT.md trước.

Review và refactor:

08_Tasks.gs — Tasks

Mục tiêu:
- bảng task vẫn là source of truth
- nhìn sạch và chuyên nghiệp hơn
- header rõ
- filter dễ dùng
- Status / Priority / Risk dùng semantic color chung
- overdue dễ nhận biết nhưng không quá chói
- summary area gọn
- không phá CRUD
- không map sai physical row khi có blank row
- không làm filter bỏ sót task mới append

Không biến Tasks thành dashboard quá nặng.

GHI FULL 08_Tasks.gs.
```

---

# 4. Task Details — `09_TaskDetails.gs`

```text
Đọc docs/claude/UI_UX_MASTER_PROMPT.md trước.

Review và refactor:

09_TaskDetails.gs — Task Details

Mục tiêu:
- sidebar nhìn như application thật
- task name và status rõ nhất
- Priority / Due / Progress / Smart Score dễ scan
- form section có spacing tốt
- button hierarchy rõ
- Complete / Delete không đặt ngang hàng về mức độ thị giác
- professional validation/error state
- dùng shared HTML Design System nếu có
- không duplicate CSS
- responsive tốt trong Google Sheets sidebar

Giữ toàn bộ update/complete/delete behavior đúng.

GHI FULL FILE và các HTML liên quan nếu cần.
```

---

# 5. Quick Add — `10_QuickAdd.gs`

```text
Đọc docs/claude/UI_UX_MASTER_PROMPT.md trước.

Review và refactor:

10_QuickAdd.gs — Quick Add Task

Mục tiêu:
- capture task cực nhanh
- Task Name là field chính
- Advanced fields không gây ngợp
- Priority / Area / Project / Due / Estimate rõ
- keyboard UX tốt
- validation rõ
- success state đẹp
- Ctrl/Cmd + Enter nếu hiện tại có thì giữ
- không tạo duplicate task
- dùng shared HTML style
- không nested template literal gây Apps Script syntax error

Đây là Personal Mode, không thêm assignee/team.

GHI FULL CODE.
```

---

# 6. Kanban — `11_Kanban.gs`

```text
Đọc docs/claude/UI_UX_MASTER_PROMPT.md trước.

Review và refactor:

11_Kanban.gs — Kanban

Kanban hiện tại phải nhìn giống một Personal Productivity Kanban thực tế.

Yêu cầu:
- lane header rõ
- Inbox / To Do / In Progress / Waiting / Completed
- semantic color đúng
- task card hierarchy rõ
- Task Name nổi bật
- Priority / Due / Smart Score dễ scan
- spacing tốt
- empty lane đẹp
- Completed giảm visual weight
- không biến board thành một bảng đầy ô màu
- không imply drag/drop nếu chưa implement thật
- TaskId vẫn dùng để mở Task Details
- source of truth vẫn là Tasks

GHI FULL 11_Kanban.gs.
```

---

# 7. Calendar — `12_Calendar.gs`

```text
Đọc docs/claude/UI_UX_MASTER_PROMPT.md trước.

Review và refactor:

12_Calendar.gs — Calendar

Mục tiêu:
- monthly calendar chuyên nghiệp
- Today nổi bật rõ nhưng không chói
- Due / scheduled tasks dễ scan
- ngày quá tải dễ nhận biết
- weekend có visual distinction nhẹ
- task status dùng semantic colors
- month navigation rõ
- legend gọn
- empty days không gây nhiễu
- không nhét quá nhiều text vào một date cell
- Open Selected Task vẫn hoạt động

Không làm giống calendar spreadsheet thô.

GHI FULL 12_Calendar.gs.
```

---

# 8. Timeline / Gantt — `13_Timeline.gs`

```text
Đọc docs/claude/UI_UX_MASTER_PROMPT.md trước.

Review và refactor:

13_Timeline.gs — Timeline / Gantt

Tôi muốn Timeline nhìn giống một professional planning application.

Yêu cầu:
- Start → Due rõ
- Today marker rất dễ nhận biết
- progress bar dễ hiểu
- Completed / In Progress / Waiting / Overdue có semantic color rõ
- legend rõ
- không có ô màu khó hiểu
- không quá nhiều whitespace
- KPI gọn
- Planning Health rõ
- Planning Insights hữu ích
- tránh merge qua frozen/non-frozen boundary
- getRange không bao giờ có numCols = 0
- Completed phải hiển thị logic nhất quán với progress

Giữ source of truth ở Tasks.

GHI FULL 13_Timeline.gs.
```

---

# 9. Projects — `14_Projects.gs`

```text
Đọc docs/claude/UI_UX_MASTER_PROMPT.md trước.

Review và refactor:

14_Projects.gs — Projects

Tôi muốn Projects nhìn giống một Personal Project Dashboard thực tế.

Kiến trúc hiện tại:
- A:H = Projects CRUD data
- J:X = dashboard overlay
- không clear / overwrite A:H

Mục tiêu:
- Project Portfolio rõ ràng
- 4 KPI quan trọng
- project card chuyên nghiệp
- Project Name / Health / Progress / workload / Top Focus / Next Action có hierarchy
- spacing tốt
- không quá nhiều màu
- health/risk semantic rõ
- không render blank project
- project chỉ hợp lệ khi có ProjectId hoặc ProjectName
- task có Project = '' không được match project rỗng
- không xảy ra lỗi '' === ''
- progress phải dựa trên task thuộc đúng project
- empty state chuyên nghiệp

Nếu nhìn vẫn giống bảng Sheets được trang trí thì tiếp tục refactor.

GHI FULL 14_Projects.gs.
```

---

# 10. Reports — `15_Reports.gs`

```text
Đọc docs/claude/UI_UX_MASTER_PROMPT.md trước.

Thiết kế và implement:

15_Reports.gs — Reports

Mục tiêu:
- Personal productivity analytics
- professional, minimal
- không biến thành dashboard quá nhiều chart
- ưu tiên insight hữu ích

Có thể gồm:
- Completion Rate
- Completed Tasks
- Overdue Rate
- Priority distribution
- Area distribution
- Project progress
- weekly trend
- meaningful insights

Chỉ sử dụng dữ liệu thực.
Không bịa analytics.
Không thêm team metrics.

Trước khi code phải đọc data model hiện tại.

GHI FULL FILE.
```

---

# Prompt chung cho bất kỳ module mới nào

```text
Đọc toàn bộ:
docs/claude/UI_UX_MASTER_PROMPT.md

Sau đó review module:

[MODULE NAME]
[FILE NAME]

Trước khi code:
1. đọc source hiện tại
2. đọc dependencies
3. xác định source of truth
4. xác định business logic cần giữ
5. review UI hiện tại

Sau đó refactor theo Smart Task Manager Design System.

Yêu cầu cuối:
- professional
- modern
- clean
- premium
- rõ ràng
- semantic colors
- strong visual hierarchy
- reusable components
- ít visual noise
- giống productivity application hơn Google Sheet

Không chỉ làm cho chạy được.

Nếu nhìn vẫn giống một Google Sheet được tô màu thì chưa đạt.

GHI FULL CODE.
```
