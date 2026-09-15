# Smart Task Manager — Personal Mode (Google Sheets)

Bước hiện tại: **Setup + Data Model**. Chưa có Smart Engine (SmartScore/Risk/RecommendedAction
vẫn để trống '' khi tạo task) và chưa có Dashboard/Today UI thật — các bước đó làm sau.

## Cấu trúc

```
src/
  appsscript.json     manifest
  00_Constants.gs      tên sheet, headers, lookup lists, ID prefix, design tokens
  01_Utils.gs          batch read/write, sinh ID, ghi ActivityLog, đọc Settings
  02_Setup.gs          setupSmartTask() — idempotent, tạo toàn bộ sheet + validation + CF
  03_Data.gs           CRUD: Tasks / Projects / Goals / Habits
  04_Menu.gs           menu "⚡ Smart Task" + Quick Add Task (prompt tạm thời)
```

## Deploy bằng clasp

```bash
npm install -g @google/clasp
clasp login
```

Tạo Google Sheet mới (trống) → Extensions → Apps Script → lấy Script ID (Project Settings).

```bash
cp .clasp.json.example .clasp.json
# dán scriptId vào .clasp.json
clasp push
```

Mở lại Google Sheet → reload trang → menu **⚡ Smart Task** sẽ xuất hiện.

## Việc đầu tiên cần làm trong Sheet

Menu → **⚡ Smart Task → Set Up / Repair Workspace**

Hàm này tạo (nếu chưa có):
- 4 sheet dữ liệu: `Tasks`, `Projects`, `Goals`, `Habits` — đúng header theo data model cá nhân (Area/Project/Category/Tags/Priority/Status/Dates/Progress/Estimate/Energy/Context/GoalId + Smart fields)
- `Settings` — key/value, seed 18 giá trị mặc định (không ghi đè nếu bạn đã sửa)
- `Lists` — bảng tham chiếu các dropdown (Area, Priority, Status, Risk, Energy, Context...)
- `ActivityLog` — log mọi thay đổi
- 6 tab view rỗng (`Dashboard/Today/Calendar/Kanban/Timeline/Reports`) — placeholder, dựng UI ở bước sau
- Data Validation dropdown cho Area/Priority/Status/Energy/Context/RecurringType trên sheet Tasks
- Conditional Formatting: màu theo Status/Priority/Risk, DueDate quá hạn tự bôi đỏ

**Chạy lại bao nhiêu lần cũng an toàn** — không tạo trùng sheet, không đè Settings người dùng đã đổi,
không nhân đôi Conditional Formatting/Validation rule.

## Test nhanh

Menu → **Quick Add Task…** → gõ tên task → task được tạo vào `Tasks` với `Status = Inbox`,
`Priority` = giá trị mặc định trong Settings, có `TaskId` dạng `TASK-0001` tự sinh, và một dòng
`Created` xuất hiện trong `ActivityLog`.

Hoặc mở Apps Script Editor, chạy thử trực tiếp trong console:

```javascript
setupSmartTask();
createTask_({ TaskName: 'Finish portfolio case study', Area: 'Career', Priority: 'Critical', DueDate: new Date() });
```

## Bước tiếp theo (chưa làm trong lần này)

- **Smart Engine**: `calculateSmartScore_()`, `calculateRisk_()`, `calculateRecommendedAction_()`
- **Dashboard/Today UI**: dựng layout thật trên các tab view đã tạo sẵn
- **Quick Add Sidebar** thay cho prompt tạm thời (đúng Frame 07)
- **Goals ↔ Task alignment scoring**, **Habit streak tracking**
