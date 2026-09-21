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
    14_Projects.gs       view Projects
    15_Sync.gs           Phase 28 — sync engine (push/pull, retry, lock, trigger, onEdit dirty-marking)
```

### Menu "⚡ Smart Task"

```
Smart Task
├── Navigation          Dashboard · Today · Tasks · Kanban · Calendar · Timeline
├── Task Actions        Quick Add Task · Open Selected Task
├── Calendar View       Previous / Current / Next Month · Refresh Calendar
├── Timeline View       Previous / Current / Next 4 Weeks · Refresh Timeline
├── Refresh             Everything · Dashboard · Today · Tasks · Kanban · Calendar · Timeline
├── Workspace           Set Up / Repair Workspace
└── Sync                Sync Now · Connect to Backend... · Enable/Disable Auto-Sync (Phase 28)
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

## Sync với Backend (Phase 28)

Đồng bộ **2 chiều**, **Last-Write-Wins theo `UpdatedAt`**, giữa spreadsheet này và
`SmartTask.Api` (ASP.NET Core + SQL Server, Phase 20–27). `Tasks`/`Projects`/`Goals`/`Habits` mỗi
sheet có thêm 4 cột cuối: `BackendId` (UUID sau khi sync lần đầu), `SyncStatus`
(`NotSynced`/`Synced`/`Conflict`), `LastSyncedAt`, `Version`.

### Kết nối lần đầu

Menu → **⚡ Smart Task → Sync → Connect to Backend...** → nhập URL API (mặc định
`http://localhost:5277`) → nhập email/password tài khoản backend (từ `POST /api/auth/register` nếu
chưa có). Chỉ JWT token + thời hạn được lưu lại (qua `PropertiesService`, script-scoped) — **mật
khẩu không bao giờ được lưu**.

### Chạy sync

- **Thủ công:** Menu → **Sync → Sync Now** — chạy ngay, hiện toast tóm tắt kết quả.
- **Tự động:** Menu → **Sync → Enable Auto-Sync (every 15 min)** — tạo 1 time-driven trigger chạy
  `runScheduledSync_()` mỗi 15 phút. Bấm lại không tạo trùng trigger (xoá-rồi-tạo-lại, đảm bảo luôn
  đúng 1 trigger). **Disable Auto-Sync** xoá trigger.

Cả 2 đường vào đều gọi chung `syncAll_()` (`15_Sync.gs`) — không có logic nghiệp vụ nào bị lặp giữa
thủ công và tự động.

### Cách hoạt động

1. **Đánh dấu dirty:** `onEdit(e)` (simple trigger) tự set `SyncStatus = NotSynced` cho bất kỳ dòng
   nào bị sửa ở 1 trong 4 sheet dữ liệu — kể cả sửa tay trực tiếp trên ô (Goals/Habits không có
   dialog UI riêng, luôn sửa tay), không chỉ khi đi qua `createTask_()`/`updateProject_()`.
2. **Push:** gom mọi dòng `SyncStatus != Synced`, map sang JSON đúng shape backend (kể cả bảng ánh
   xạ enum `SYNC_ENUM_TO_BACKEND`/`SYNC_ENUM_TO_SHEET` cho `Area`/`Status`/`GoalStatus` — 3 enum này
   lệch giữa chuỗi hiển thị của Sheets có khoảng trắng và tên enum C# không được có khoảng trắng,
   xem `00_Constants.gs`), POST 1 lần duy nhất tới `/api/sync/push`. Backend áp Last-Write-Wins theo
   `updatedAt`; ghi lại đúng 4 cột sync (không đụng cột nghiệp vụ nào) từ kết quả trả về.
3. **Pull:** GET `/api/sync/pull?since=<lần pull thành công gần nhất>` — mang về mọi thay đổi từ
   phía backend (kể cả tạo/sửa qua Desktop app) chưa có ở Sheets. Áp Last-Write-Wins ngược lại: chỉ
   ghi đè dòng Sheets khi bản backend mới hơn thật sự.
4. **Khoá đồng thời:** `LockService.getScriptLock()` — nếu 1 lần sync đang chạy, lần gọi thứ 2 (vd
   bấm Sync Now trong lúc trigger tự động đang chạy) bị bỏ qua có ghi log, không chạy chồng.
5. **Retry:** lỗi mạng/5xx được thử lại tối đa 3 lần, backoff 1s/2s/4s (`fetchWithRetry_`). Lỗi 4xx
   (token hết hạn, dữ liệu sai) không thử lại — báo lỗi ngay.
6. **An toàn dữ liệu:** mọi ghi đè vào sheet chỉ xảy ra SAU KHI có response HTTP thành công — một
   request thất bại giữa chừng không bao giờ xoá/ghi đè dữ liệu Sheets hợp lệ đang có. Dòng lỗi
   (`Outcome = Error`, ví dụ ProjectId tham chiếu không tồn tại) giữ nguyên `SyncStatus = NotSynced`
   để tự thử lại ở lần sync kế tiếp, không rớt mất thay đổi.
7. **Log:** mỗi lần `syncAll_()` chạy đều ghi 1 dòng vào `ActivityLog` (`EntityType = Sync`,
   `Action = Success/PartialFailure/Failed/Skipped`, `NewValue` = tóm tắt push/pull) — theo dõi lịch
   sử sync ngay trong sheet có sẵn, không cần sheet riêng.

### Giới hạn đã biết (quyết định phạm vi, không phải bug)

- **Xoá không đồng bộ 2 chiều.** Xoá 1 dòng trong Sheets chỉ xoá cục bộ; dòng tương ứng trên backend
  vẫn còn. Xoá qua API/Desktop app cũng không kéo theo xoá dòng Sheets — `pull` chỉ hỏi "cái gì đã
  đổi", một dòng đã bị xoá thì không còn gì để báo cáo nữa. Cần cơ chế tombstone thật để làm đúng,
  ngoài phạm vi Phase 28.
- Một dòng vừa được `pull` ghi vào sẽ gần như chắc chắn bị `onEdit` đánh dấu dirty lại (ghi cột
  nghiệp vụ nên `onEdit` không phân biệt được với sửa tay thật) và bị push lại ở chu kỳ sau — vô
  hại (server thấy `updatedAt` bằng nhau, coi là no-op) nhưng tốn 1 request thừa mỗi dòng vừa pull.
- `DependencyTaskId` chỉ resolve đúng khi task được phụ thuộc đã từng sync trước đó. Hai task hoàn
  toàn mới có liên kết phụ thuộc, sync cùng 1 lần push, sẽ có field này rỗng cho tới chu kỳ kế tiếp.

## Phát triển tiếp

- View `Projects` và `Reports` (đang là placeholder)
- Goals ↔ Task alignment scoring, Habit streak tracking
- Sidebar Settings
- Notifications (email/điều khiển qua trigger)