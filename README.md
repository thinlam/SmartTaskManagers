# Smart Task Manager — Personal Mode (Google Sheets)

Hệ thống quản lý công việc cá nhân xây dựng hoàn toàn trên **Google Sheets + Apps Script**.
Không cần backend riêng: toàn bộ dữ liệu nằm trong spreadsheet, giao diện là các **tab view** được
render trực tiếp lên sheet, các thao tác nhanh chạy qua **sidebar**.

## Tính năng

- **Data model đầy đủ** — `Tasks` (26 cột), `Projects`, `Goals`, `Habits`, `Settings`, `Lists`, `ActivityLog`.
- **Smart Engine** — tự động tính `SmartScore`, `Risk`, `RecommendedAction` theo bộ quy tắc minh bạch
  (weights tập trung tại `SMART_WEIGHTS` trong `05_SmartEngine.gs`, dễ chỉnh mà không cần đụng logic).
- **6 view** được render động trên tab riêng, chỉ đọc từ `Tasks` (sheet `Tasks` là nguồn dữ liệu duy nhất):
  - `Dashboard` — KPI, Focus Now, My Areas, Smart Insights
  - `Today` — việc hôm nay, Best Next Action, end-of-day review
  - `Tasks` — workspace với summary panel, tô màu theo Status/Priority/Risk/Progress/SmartScore
  - `Kanban` — board 5 lane: Inbox / To Do / In Progress / Waiting / Completed
  - `Calendar` — lịch tháng, task theo ngày, KPI tháng, điều hướng tháng trước/sau
  - `Timeline` — Gantt 28 ngày, marker trạng thái, planning insights
- **Sidebar** — `Quick Add Task` (tạo task nhanh) và `Task Details` (xem/sửa/hoàn thành/xóa task).
- **Menu đầy đủ** — điều hướng, task actions, điều hướng Calendar/Timeline, refresh từng view, setup workspace.
- **Setup idempotent** — chạy lại `setupSmartTask()` bao nhiêu lần cũng an toàn:
  không tạo trùng sheet, không ghi đè Settings, không nhân đôi validation/conditional formatting.
- **ActivityLog** — ghi lại mọi thay đổi (created / updated / completed / deleted).

## Cấu trúc

```
google-sheets/
  .clasp.json            scriptId + rootDir cho clasp
  src/
    appsscript.json      Apps Script manifest
    00_Constants.gs      tên sheet, headers, lookup lists, ID prefix, design tokens, settings defaults
    01_Utils.gs          batch read/write, sinh ID, ghi ActivityLog, đọc Settings
    02_Setup.gs          setupSmartTask() — tạo toàn bộ workspace + validation + CF (idempotent)
    03_Data.gs           CRUD: Tasks / Projects / Goals / Habits
    04_Menu.gs           menu "⚡ Smart Task" + điều hướng các view
    05_SmartEngine.gs    SmartScore / Risk / RecommendedAction (quy tắc có tên, có thể giải thích)
    06_Dashboard.gs      view Dashboard
    07_Today.gs          view Today
    08_Tasks.gs          workspace Tasks + summary panel + visual states
    09_TaskDetails.gs    sidebar Task Details
    10_QuickAdd.gs       sidebar Quick Add Task
    11_Kanban.gs         view Kanban
    12_Calendar.gs       view Calendar
    13_Timeline.gs       view Timeline / Gantt
```

### Menu "⚡ Smart Task"

```
Smart Task
├── Navigation          Dashboard · Today · Tasks · Kanban · Calendar · Timeline
├── Task Actions        Quick Add Task · Open Selected Task
├── Calendar View       Previous / Current / Next Month · Refresh Calendar
├── Timeline View       Previous / Current / Next 4 Weeks · Refresh Timeline
├── Refresh             Everything · Dashboard · Today · Tasks · Kanban · Calendar · Timeline
└── Workspace           Set Up / Repair Workspace
```

### Nguyên tắc code

- **Single source of truth:** các view (Dashboard/Today/Kanban/Calendar/Timeline) chỉ render và đọc từ sheet `Tasks`,
  không lưu bản sao dữ liệu nghiệp vụ ở đâu khác. Danh tính task luôn dùng `TaskId`.
- **Quy ước đặt tên:** hàm nội bộ kết thúc bằng `_` (ví dụ `getAllTasks_()`); hàm gọi từ `google.script.run`
  hoặc menu KHÔNG được kết thúc bằng `_`.
- **Một file = một module**, đánh số theo thứ tự phụ thuộc (`00` → `13`).

## Cài đặt & triển khai (clasp)

Yêu cầu: Node.js và tài khoản Google.

```bash
npm install -g @google/clasp
clasp login
```

Tạo một Google Sheet mới (trống) → **Extensions → Apps Script** → lấy Script ID trong **Project Settings**.

```bash
cp google-sheets/.clasp.json google-sheets/.clasp.json  # giữ nguyên scriptId đã có, hoặc:
# sửa scriptId trong google-sheets/.clasp.json bằng Script ID của bạn

clasp push --rootDir ./src
```

> Nếu bạn đã có `scriptId` sẵn trong `.clasp.json` (đã commit), chỉ cần `clasp push` là xong.

Sau khi push, mở lại Google Sheet → reload trang → menu **⚡ Smart Task** sẽ xuất hiện.

## Lần chạy đầu tiên

Menu → **⚡ Smart Task → Workspace → Set Up / Repair Workspace**

Hàm này tạo (nếu chưa có) và tự động refresh toàn bộ workspace:

- 4 sheet dữ liệu: `Tasks`, `Projects`, `Goals`, `Habits` — đúng header theo data model
- `Settings` — 18 giá trị mặc định (không ghi đè nếu bạn đã sửa)
- `Lists` — bảng tham chiếu cho các dropdown (Area, Priority, Status, Risk, Energy, Context...)
- `ActivityLog` — log mọi thay đổi
- 6 view: `Dashboard`, `Today`, `Tasks`, `Calendar`, `Kanban`, `Timeline` (+ `Reports` placeholder)
- Data Validation dropdown cho Area/Priority/Status/Energy/Context/RecurringType
- Conditional Formatting: màu theo Status/Priority/Risk, DueDate quá hạn tự bôi đỏ
- Trigger tính lại Smart fields hằng ngày

## Thử nhanh

Menu → **Task Actions → Quick Add Task…** → nhập tên task → task được tạo vào `Tasks` với `Status = Inbox`,
`Priority` theo mặc định trong Settings, `TaskId` tự sinh dạng `TASK-0001`, và một dòng `Created`
xuất hiện trong `ActivityLog`.

Hoặc chạy trực tiếp trong Apps Script Editor (console):

```javascript
setupSmartTask();
createTask_({
  TaskName: 'Finish portfolio case study',
  Area: 'Career',
  Priority: 'Critical',
  DueDate: new Date()
});
```

Sau khi tạo task, mở từng view (Navigation → Dashboard/Today/Kanban/Calendar/Timeline) để xem task
xuất hiện ở tất cả các view; chọn task rồi dùng **Task Actions → Open Selected Task** để mở chi tiết.

## Phát triển tiếp

- View `Projects` và `Reports` (đang là placeholder)
- Goals ↔ Task alignment scoring, Habit streak tracking
- Sidebar Settings
- Notifications (email/điều khiển qua trigger)