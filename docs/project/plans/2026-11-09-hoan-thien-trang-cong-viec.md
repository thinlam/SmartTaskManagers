# Kế hoạch: Hoàn thiện trang Công việc + form "Công việc mới" (5 mục người dùng yêu cầu)

> Ngày: 2026-11-09. Theo quy tắc 3 bước ở `CLAUDE.md`.

## Mục tiêu / nghiệp vụ

Người dùng gửi brief 5 mục cho trang Công việc. Khảo sát code cho thấy **mục 1 (phần UI), 2, 3 đã làm
xong** ở 2 plan trước (`2026-11-08-status-inline-va-nut-sua-xoa-ro.md`,
`2026-11-08-ra-soat-danh-sach-form-cong-viec.md`) — nhưng **phạm vi đã bị rút gọn**, bỏ hẳn phần nghiệp vụ
server-side mà brief lần này yêu cầu lại đầy đủ (RowVersion, activity log, hỏi xử lý subtask, đồng bộ
Progress/Status ở server). Plan này làm phần **còn thiếu**, không làm lại phần đã xong.

## Phạm vi

**Làm trong lần này:**

1. **Backend — hoàn thiện nghiệp vụ đổi trạng thái** (phần UI combobox đã có, phần server-side chưa):
   - `UpdateAsync`/`CompleteAsync` áp đúng quy tắc: → Hoàn thành thì Progress=100/CompletedAt=now, hủy
     reminder chưa kích hoạt, sinh lần lặp kế nếu có; có subtask chưa xong thì trả về cần xác nhận (client
     hỏi "Hoàn thành luôn việc con?"). Mở lại từ Hoàn thành: CompletedAt=null, Progress trả về mức trước đó
     (lưu `ProgressBeforeComplete` khi hoàn thành, không có thì về 0). → Đang thực hiện: StartDate=hôm nay
     nếu chưa có. Đồng bộ 2 chiều Progress↔Status theo đúng 4 quy tắc trong brief.
   - Thêm `RowVersion` (byte[], concurrency token EF) vào `TaskItem`, migration thêm cột.
   - Thêm bảng `TaskActivityLogs` (TaskId, Action, OldValue, NewValue, At) — ghi mỗi lần đổi Status.
   - Xóa: có subtask thì trả thông tin cho client hỏi "xóa cả subtask hay chuyển lên cấp trên" (client gọi
     lại với lựa chọn).
   - Dọn dữ liệu sai hiện có: task nào `Status != Completed` mà `Progress == 100` hoặc `CompletedAt != null`
     thì sửa lại (migration data-fix một lần, không phải mỗi lần chạy).
2. **Mục 4 — bảng `TaskAreas` song ngữ** (không đụng `ProjectFieldType`, tên khác nhau, đã xác nhận không
   trùng): entity mới + migration seed 14 dòng hệ thống theo đúng key/tên trong brief; map dữ liệu cũ từ
   enum `AreaType` hiện tại sang key tương ứng (Career→career, Learning→learning, Health→health,
   Personal→personal, PersonalAdmin→other — không có "Nhà cửa/Gia đình..." trong enum cũ nên các giá trị cũ
   chỉ rơi vào 4 key đầu + other, không mất dữ liệu). CRUD lĩnh vực tùy chỉnh (IsSystem=false): thêm/đổi
   tên/xóa (xóa khi còn task thì bắt chọn lĩnh vực chuyển sang). Frontend: `TaskDetailDrawer`'s mảng
   `AREAS` hardcode (dòng ~13) đổi sang gọi API thật, có mục "+ Thêm lĩnh vực mới" trong combobox.
3. **Mục 5 — định dạng ngày dd/MM/yyyy cho input, bố cục form/bảng còn thiếu**: input ngày/giờ hiện dùng
   native `type="date"`/`datetime-local` theo locale trình duyệt (sai mm/dd/yyyy) — đổi sang hiển thị
   dd/MM/yyyy nhất quán (dùng thư viện date-picker nhẹ có sẵn phù hợp React, hoặc input text có mask + parse
   — sẽ chọn cụ thể khi code, ưu tiên ít phụ thuộc mới). Ngày bắt đầu/đến hạn đặt cạnh nhau + validate ngay
   tại ô. Bảng: thêm cột Rủi ro nếu chưa có, chip thẻ dưới tiêu đề (bấm lọc) nếu chưa có, responsive ẩn cột
   phụ khi hẹp màn hình — review lại những phần UI mục 5 còn thiếu so với bố cục đã làm ở 2 plan trước.

**KHÔNG làm trong lần này** (nêu rõ để không hiểu lầm là bỏ sót):

- Không làm lại phần đã xong (combobox trạng thái ở UI, nút Sửa/Xóa hiện chữ, bỏ nút tích — giữ nguyên).
- Không đổi gì ở `ProjectFieldType`/lĩnh vực của Dự án.
- Test hiệu suất/tải lớn, phân trang bảng — ngoài phạm vi brief.

## Hướng đi / cách làm

- **Backend thứ tự:** (a) migration data-fix dữ liệu Progress/CompletedAt sai trước — chạy độc lập, an
  toàn, không phụ thuộc code mới; (b) thêm `RowVersion` + `TaskActivityLogs` + entity `TaskAreas`, 1 migration
  tổng hợp theo đúng convention `AddTagsRelational` (seed bằng SQL thuần trong migration, không recursive
  CTE — bài học Railway MySQL không hỗ trợ `WITH RECURSIVE`, xem `05-quy-tac-du-an.md` + log 04 2026-11-08);
  (c) viết lại `UpdateAsync` theo đúng bảng quy tắc chuyển trạng thái, có unit test cho từng nhánh; (d) API
  trả về **409 kèm payload chi tiết** khi cần xác nhận subtask (hoàn thành hoặc xóa) — đã chốt với người
  dùng; client bắt 409, hiện hộp hỏi, gọi lại kèm flag xác nhận.
- **Frontend:** `AreasContext`/`useAreas` mới (giống `useTags`), `TaskDetailDrawer` dùng API thật thay mảng
  cứng; trang quản lý lĩnh vực **riêng tại `/areas`** (đã chốt), theo đúng mẫu `TagsManagementPage` đã có.
- **Ngày dd/MM/yyyy:** thêm thư viện date-picker nhẹ (đã chốt, ví dụ `react-day-picker`) thay cho input
  mask tự viết, để giảm rủi ro bug parse/accessibility.

## Rủi ro

| Rủi ro                                                                                        | Mức        | Giảm thiểu                                                                                   |
| --------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| Migration seed `TaskAreas` + map dữ liệu cũ chạy trên Railway MySQL thật lỗi (như sự cố Tags) | Cao        | Dùng SQL thuần không recursive CTE, test kỹ câu lệnh, theo đúng mẫu đã sửa ở `846134e`.      |
| Thêm `RowVersion` vào bảng Tasks đang có dữ liệu thật                                         | Trung bình | EF tự thêm cột mới với default, không cần giá trị cũ hợp lệ như enum — rủi ro thấp hơn Tags. |
| Đổi nghiệp vụ đồng bộ Progress/Status có thể phá flow người dùng đang quen (nếu có)           | Trung bình | Giữ API cũ tương thích, chỉ thêm ràng buộc đúng theo brief, test kỹ trước khi push.          |
| Đổi input ngày sang không-native có thể lỗi bàn phím/accessibility nếu chọn sai thư viện      | Trung bình | Ưu tiên giải pháp đơn giản, test bàn phím trước khi coi là xong.                             |
| Phạm vi lớn, 3 mục backend/data/frontend — dễ sót test                                        | Trung bình | Làm lần lượt từng mục con, build+test sau mỗi mục như brief yêu cầu.                         |

## Kiểm chứng

- Backend: `dotnet build` sạch, unit test mới cho bảng chuyển trạng thái + đồng bộ Progress/Status + migration
  map lĩnh vực (theo đúng yêu cầu "Chất lượng" trong brief).
- Frontend: `npm run typecheck`, `npx eslint`, `npm test`, `npm run build:web`.
- Chạy thật qua Chrome: đổi trạng thái qua lại (đặc biệt Hoàn thành → Cần làm xem Progress đúng chưa), xóa
  task có subtask, thêm/xóa lĩnh vực tùy chỉnh, nhập ngày xem hiển thị dd/MM/yyyy.
- Không tự chạy migration trên dữ liệu thật — theo đúng quy tắc dự án (không sửa DB thật); Railway tự chạy
  khi deploy, cần người dùng theo dõi sau khi push.

## Kết quả thật

### Mục 1 — Backend (xong 2026-11-09)

- **Khác dự kiến:** không thêm cột `RowVersion` mới — tái dùng cột `Version` (int) đã có sẵn từ
  `SyncableEntity`, cấu hình `IsConcurrencyToken()` trong `TaskItemConfiguration`, tăng `task.Version++`
  mỗi lần sửa. Không cần đổi schema cho phần này (chỉ là metadata EF), giảm rủi ro migration so với dự kiến.
- Đã làm: `TaskItem.ProgressBeforeComplete`; entity `TaskActivityLog` + bảng `TaskActivityLogs` (ghi mỗi lần
  đổi Status, qua `UpdateAsync` và `CompleteAsync`); `TaskService.UpdateAsync` viết lại hoàn chỉnh theo đúng
  5 quy tắc đồng bộ Progress/Status trong brief (Progress=100→Hoàn thành, Progress>0 từ Hộp thư
  đến/Cần làm→Đang thực hiện, mở lại từ Hoàn thành→Progress trả về `ProgressBeforeComplete` hoặc 0, Progress
  rớt dưới 100 khi đang Hoàn thành→tự mở lại, →Đang thực hiện mà chưa có StartDate→gán hôm nay); hủy
  `ReminderAt` chưa tới giờ khi hoàn thành; subtask chưa xong khi hoàn thành/xóa → ném
  `TaskActionRequiresConfirmationException` → controller trả **409** kèm `action`/`message`/`subtaskIds`,
  client gọi lại với `confirmCompleteSubtasks=true` (complete) hoặc `cascadeSubtasks=true/false` (delete).
  `CompleteAsync` giờ idempotent (gọi lại khi đã Completed không đổi gì, không lỗi). Migration
  `AddTaskActivityLogAndProgressTracking` (thêm `ProgressBeforeComplete`, bảng `TaskActivityLogs`, dọn
  `CompletedDate` còn sót sai ở task không-Hoàn thành bằng SQL thuần, không recursive CTE).
- **Chưa làm trong mục 1:** dọn dữ liệu `Progress=100` sai (chỉ dọn `CompletedDate` sai, không tự sửa
  `Progress` vì không có cách suy luận an toàn giá trị đúng ngược từ dữ liệu cũ — nêu rõ trong comment
  migration); chưa nối phần 409 subtask-confirm và `cascadeSubtasks` vào frontend (`TasksPage`/`TaskActions`/
  `TaskDetailDrawer`/`useTasks`) — sẽ làm ở lượt kế tiếp.
- Kiểm chứng thật: `dotnet build` backend 0 lỗi/0 cảnh báo; `dotnet test` 51/51 qua (38 cũ + 13 test mới cho
  đồng bộ Progress/Status, mở lại, hủy reminder, xác nhận subtask khi hoàn thành/xóa, cascade/promote khi
  xóa, idempotent complete). **Chưa chạy thật qua API/trình duyệt**, chưa chạy migration trên dữ liệu thật.

### Mục 1 — Frontend (xong 2026-11-09)

- `ApiError` (`@stm/api-client`) thêm `confirmAction`/`subtaskIds` đọc từ payload 409 mới.
  `taskApi.complete(id, confirmCompleteSubtasks?)` và `taskApi.remove(id, cascadeSubtasks?)` nối tham số
  qua query string; `useTasks().completeTask`/`deleteTask` nhận thêm tham số tương ứng, `refetch()` sau khi
  xác nhận (vì subtask bị đổi ở server không nằm trong response gốc).
  `TasksPage.tsx`: bắt `ApiError.confirmAction === 'complete'` → hỏi qua `ConfirmDialog` có sẵn (nhị phân);
  `=== 'delete'` → hộp thoại 3 nút tự viết (Hủy / Chuyển việc con lên cấp trên / Xóa cả việc con), gọi lại
  `deleteTask(id, false|true)`. Thêm 5 key i18n (`completeSubtasksConfirm*`, `deleteSubtasks*`) cả vi/en.
- **Chưa làm:** `TaskDetailDrawer`'s nút Xóa (trong form sửa) chưa có hộp thoại 3 nút riêng — khi gặp 409
  subtask, nó chỉ hiện nguyên câu lỗi từ backend qua `applyError` (đã đủ thông tin, không gãy, nhưng UX kém
  hơn trang danh sách) — ghi nhận để làm sau nếu cần.
- Kiểm chứng thật: `npm run typecheck --workspace=apps/web` sạch, `npm run build:web` qua, `npm test`
  (Vitest) 26/26 qua, `npx eslint` sạch các file đã sửa. **Chưa chạy thật qua trình duyệt** (chưa có backend
  local chạy, chưa cấu hình connection string cho máy này).

### Mục 4 — Lĩnh vực song ngữ (xong 2026-11-09)

- **Khác dự kiến (cố ý, không phải bỏ sót):** không thay hẳn cột `Area` (enum) bằng `AreaId` — giữ `Area`
  làm cột lịch sử, đánh dấu `[Obsolete("Use AreaId instead.")]` (bọc `#pragma warning disable/restore
CS0618` ở mọi nơi còn đọc/ghi, như `SyncService` — Phase 28 sync chưa cập nhật resolve qua
  `ITaskAreaRepository`), còn `AreaId`/`TaskArea` là nguồn thật mới. Lý do: thay hẳn một lượt sẽ ảnh hưởng
  dashboard/CSV export/filter/SmartEngine đang đọc `Area` — đi theo đúng tiền lệ migration Tags CSV→quan hệ
  đã làm trước đây (`LegacyTagsCsv`), an toàn hơn cho dữ liệu Railway thật.
- Backend: entity `TaskArea` (NameVi/NameEn/IsSystem/SortOrder, `UserId == null` là lĩnh vực hệ thống dùng
  chung, khác `UserId` của người dùng là lĩnh vực tùy chỉnh); `ITaskAreaRepository`/`TaskAreaRepository`,
  `ITaskAreaService`/`TaskAreaService`, `TaskAreasController` (GET/POST/PATCH/DELETE `/api/task-areas`); xóa
  lĩnh vực còn task dùng → `TaskAreaInUseException` → controller trả 409 `{ action: "reassign", taskCount
}`, gọi lại kèm `replacementAreaId` để chuyển task trước khi xóa. Migration
  `AddTaskAreasRelational`: thêm `Tasks.AreaId` (FK `SetNull`), bảng `TaskAreas`, seed đúng 14 dòng hệ thống
  (GUID cố định) theo tên đã chốt trong brief, cộng SQL thuần (không recursive CTE) backfill `AreaId` từ
  `Area` cũ theo map Career/Learning/Health/Personal → key tương ứng, còn lại → "other" (không mất dữ liệu).
- Frontend: `areaApi`/`useAreas`/`AreasProvider` (mẫu giống `useTags`/`TagsProvider`), trang quản lý riêng
  `AreasManagementPage` tại route `/areas` (đã chốt với người dùng) — đổi tên/xóa/thêm lĩnh vực tùy chỉnh,
  lĩnh vực hệ thống hiển thị chỉ-đọc, xóa khi còn task thì hiện hộp chọn lĩnh vực chuyển sang. `
TaskDetailDrawer`'s mảng `AREAS` hardcode (dòng ~13 cũ) đổi hẳn sang đọc `useAreasContext()` — combobox
  hiện tên song ngữ theo `i18n.language`, có lựa chọn cuối "+ Thêm lĩnh vực mới" mở form nhập 2 tên (Việt/Anh)
  ngay trong drawer, không rời form, lưu xong tự chọn lĩnh vực mới tạo. `FormState.area` (enum) đổi thành
  `FormState.areaId` (Guid dạng string, `''` = chưa chọn); `NewTaskInput.area`/`taskApi.create`'s tham số
  `area` bắt buộc đổi thành tùy chọn (backend tự mặc định `Personal` nếu bỏ trống, không cần frontend gửi
  nữa khi đã dùng `areaId`).
- Kiểm chứng thật: backend `dotnet build` (toàn solution, gồm Api) 0 lỗi/0 cảnh báo; `dotnet test` 56/56 qua
  (thêm 5 test mới cho `TaskAreaService`). Frontend: `npm run typecheck` (toàn repo, mọi app) sạch,
  `npm run build:web` qua, `npx eslint` sạch các file đã sửa (`TaskDetailDrawer.tsx`,
  `AreasManagementPage.tsx`, `AreasContext.tsx`, `useAreas.ts`, `useTasks.ts`, `areaApi.ts`, `taskApi.ts`,
  `index.ts`, `App.tsx`, `router.tsx`, `types/index.ts`). **Chưa chạy thật qua trình duyệt** (chưa có backend
  local chạy với migration mới áp dụng trên máy này) — cần kiểm tra bằng tay trước khi coi UX là hoàn tất:
  combobox hiện đúng tên theo ngôn ngữ, thêm lĩnh vực mới không rời form, hộp thoại xóa-cần-chuyển hoạt động.
  Chưa chạy migration trên dữ liệu Railway thật — theo đúng quy tắc dự án, Railway tự chạy khi deploy.

### Mục 5

_(Mục 5 — định dạng ngày dd/MM/yyyy, rà soát bố cục còn thiếu — chưa làm, tiếp theo.)_
