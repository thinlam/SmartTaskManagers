# Kế hoạch: Đổi cột Điểm thành cột chọn Trạng thái inline + nút Sửa/Xóa hiện chữ

> Cập nhật: 2026-11-08. Đã duyệt phạm vi rút gọn với người dùng (không làm đủ bộ quy tắc nặng của Việc 3
> trong [`plans/2026-11-08-ra-soat-danh-sach-form-cong-viec.md`](2026-11-08-ra-soat-danh-sach-form-cong-viec.md)
> — không concurrency token, không activity log, không hỏi xử lý subtask khi xóa).

## Mục tiêu / nghiệp vụ

Trên trang Công việc (`TasksPage.tsx`), người dùng muốn:

1. Bỏ cột "Điểm" (smartScore, chỉ hiện ở màn hình rộng `xl`), thay bằng một cột cho phép **chọn/đổi
   Trạng thái trực tiếp trên bảng** (không phải mở form sửa mới đổi được Trạng thái). Vẫn giữ nguyên bộ lọc
   "Trạng thái" phía trên (không đổi `TaskFilters`) và giữ nguyên cột "Trạng thái" hiện có (badge tĩnh) —
   cột mới thay thế vị trí cột Điểm, không gộp hay xóa cột badge cũ.
2. Nút Sửa/Xóa ở cột Hành động hiện đang chỉ là icon, ẩn mặc định (chỉ hiện khi hover/focus hàng) — người
   dùng muốn 2 nút này **luôn hiển thị rõ ràng với người dùng** (có chữ "Sửa"/"Xóa", không chỉ icon ẩn).

Hiểu theo đúng ý nghiệp vụ: đây là cải thiện UX thao tác nhanh trên danh sách, không phải đổi quy tắc
nghiệp vụ chuyển trạng thái (không có khái niệm trạng thái mới, không đổi logic Complete/Progress).

## Phạm vi

**Làm:**

- `TasksPage.tsx`: xóa cột "Điểm" (`colScore`, `task.smartScore`), thêm cột mới ngay vị trí đó là một
  `<select>` đổi trạng thái, gọi `updateTask(task.id, { status })` (hook `useTasks` đã có sẵn, dùng đúng
  API update hiện có — không thêm endpoint mới).
  - Cập nhật lạc quan đơn giản: đổi UI ngay, nếu lỗi thì `reportError` (toast đỏ có sẵn) — **không** rollback
    phức tạp/không chặn double-submit (đồng ý ở mức rủi ro thấp vì đây là thao tác đơn người dùng, tần suất
    thấp).
  - Danh sách trạng thái dùng lại mảng `STATUSES` đã có ở `TaskFilters.tsx` (export thêm để dùng chung,
    tránh định nghĩa trùng).
- `TaskActions.tsx`: đổi 2 nút Sửa/Xóa từ `IconButton` ẩn-khi-hover sang nút luôn hiện có nhãn chữ (giữ icon
  kèm chữ cho dễ nhận, dùng component nút chữ sẵn có trong `@stm/ui` nếu có, không thì `<button>` thường theo
  style hệ thống). Bỏ class `opacity-0 ... group-hover:opacity-100`.
- Thêm key i18n nếu cần cho nhãn nút ("Sửa"/"Xóa" — có thể đã có `tasks.editAriaLabel`/`deleteAriaLabel`
  dạng aria-label, cần thêm nhãn hiển thị riêng nếu khác nội dung).

**Không làm (đã chốt với người dùng):**

- Không thêm optimistic concurrency token/409 handling.
- Không thêm `TaskActivityLog`.
- Không hỏi xử lý subtask khi xóa (giữ nguyên hành vi xóa mềm hiện có).
- Không đổi quy tắc đồng bộ Progress↔Status ở backend (giữ nguyên `TaskService` hiện tại).
- Không đổi `TaskFilters.tsx` (bộ lọc Trạng thái giữ nguyên như cũ).
- Không xóa cột "Trạng thái" badge hiện có.

## Hướng đi / cách làm

- Frontend-only, không đổi backend/schema. Dùng API `PUT`/update task hiện có qua `useTasks().updateTask`.
- File đổi: `packages/app-core/src/pages/Tasks/TasksPage.tsx`, `packages/app-core/src/pages/Tasks/TaskActions.tsx`,
  `packages/app-core/src/pages/Tasks/TaskFilters.tsx` (export `STATUSES`), i18n `vi.json`/`en.json` nếu thêm
  key mới.

## Rủi ro

| Rủi ro                                                                                           | Mức        | Giảm thiểu                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Đổi trạng thái qua combobox không đồng bộ `Progress` (ví dụ chọn Completed nhưng Progress < 100) | Trung bình | Backend `TaskService.UpdateAsync` đã có logic đồng bộ Progress↔Status sẵn (nếu có) — kiểm tra lại khi test; nếu chưa có, chấp nhận lệch nhẹ ở lần này vì đã chốt không làm quy tắc nặng |
| Nút Sửa/Xóa luôn hiện làm bảng rối mắt hơn trên màn hình hẹp                                     | Thấp       | Dùng cỡ chữ/nút nhỏ, theo đúng style hệ thống hiện có; xem lại trên trình duyệt sau khi làm                                                                                             |
| Xóa cột Điểm mất khả năng sắp xếp theo điểm nếu người dùng vẫn cần                               | Thấp       | Nút sắp xếp "Điểm thông minh" ở `TaskFilters`/sort option không đổi — vẫn sắp xếp được, chỉ không hiển thị số trong bảng                                                                |

## Kiểm chứng (dự kiến)

- `npm run typecheck` sạch toàn repo.
- `npx eslint` sạch các file đã sửa.
- Chạy thật qua Chrome: đổi trạng thái 1 task qua combobox mới, xem cập nhật đúng (cả badge cột Trạng thái
  cũ và backend); bấm nút Sửa/Xóa thấy luôn hiển thị chữ rõ ràng không cần hover.

## Kết quả thật

**Đã làm theo kế hoạch, cộng thêm 1 lần đổi hướng nhỏ sau phản hồi người dùng khi xem thử trên trình duyệt
(xem mục "Đổi hướng" bên dưới):**

- `packages/app-core/src/pages/Tasks/TaskFilters.tsx`: export `STATUSES` (trước đó chỉ dùng nội bộ) để dùng
  chung cho combobox mới, tránh định nghĩa trùng danh sách trạng thái.
- `packages/app-core/src/pages/Tasks/TasksPage.tsx`: xóa cột "Điểm" (`task.smartScore`), thay bằng cột
  "Đổi trạng thái" chứa `<select>` gọi `updateTask(task.id, { status })` (hàm có sẵn từ `useTasksContext()`,
  không thêm endpoint mới) cho mọi trạng thái **trừ** "Hoàn thành" — chọn "Hoàn thành" gọi `completeTask(id)`
  thay vì `updateTask` (xem lý do ở mục Đổi hướng); lỗi thì `reportError` (toast đỏ có sẵn), không
  rollback/chặn double-submit — đúng như đã chốt phạm vi rút gọn.
- `packages/app-core/src/pages/Tasks/TaskActions.tsx`: đổi nút Sửa/Xóa từ `IconButton` ẩn-khi-hover
  (`opacity-0 ... group-hover:opacity-100`) sang `Button variant="ghost" size="sm"` luôn hiển thị, có icon +
  chữ ("Sửa"/"Xóa"), nút Xóa thêm `text-danger`. **Bỏ hẳn nút tích (✓) Hoàn thành nhanh** (theo yêu cầu
  người dùng sau khi xem bản demo — hoàn thành giờ chỉ làm qua cột "Đổi trạng thái"), bỏ luôn prop
  `onComplete` khỏi `TaskActionsProps`.

### Đổi hướng so với dự kiến ban đầu (phát hiện khi test, sửa lại trước khi báo xong)

Kế hoạch ban đầu chỉ dự tính xóa cột Điểm + đổi nút Sửa/Xóa; nút tích "Hoàn thành nhanh" ở cột Hành động
được giữ nguyên. Sau khi người dùng xem demo và yêu cầu bỏ nút tích (hoàn thành chỉ qua cột Trạng thái),
kiểm tra lại `TaskService.UpdateAsync` (backend) thì phát hiện **`UpdateAsync` không làm những việc mà
`CompleteAsync` làm**: không set `Progress = 100`, không set `CompletedDate`, không tự tạo bản sao kế tiếp
cho task lặp lại (`RecurringType != None`). Nếu để combobox trạng thái gọi thẳng `updateTask(status:
'Completed')` rồi bỏ nút tích, sẽ mất 3 hành vi nghiệp vụ đó khi hoàn thành qua danh sách — không đúng ý
nghiệp vụ. **Sửa lại:** trong `onChange` của combobox, nếu trạng thái mới là `'Completed'` thì gọi
`completeTask(task.id)` (đúng API hoàn thành cũ, giữ nguyên toàn bộ logic đồng bộ Progress/CompletedDate/
tạo lại task lặp); các trạng thái khác vẫn gọi `updateTask`. Không đổi gì ở backend.

- i18n: thêm `tasks.colChangeStatus`, `tasks.changeStatusAriaLabel`, `tasks.editButtonLabel`,
  `tasks.deleteButtonLabel` ở cả `vi.json`/`en.json`; xóa key `tasks.colScore` (không còn dùng).

**Đã kiểm chứng:** `npm run typecheck` (toàn bộ monorepo, mọi workspace) sạch, không lỗi. `npx eslint` trên
3 file đã sửa (`TasksPage.tsx`, `TaskActions.tsx`, `TaskFilters.tsx`) sạch, không cảnh báo.

**Chưa kiểm chứng:** chưa chạy thử thật qua trình duyệt (combobox đổi trạng thái, nút Sửa/Xóa hiện chữ) —
đã khởi động `npm run dev:web` cục bộ và mở `http://localhost:5173/tasks`, nhưng bước tạo tài khoản test để
đăng nhập bị chính công cụ trình duyệt tự động của Claude Code chặn (lý do nội bộ "Modify Shared Resources"),
nên dừng lại, không cố lách qua. Cần người dùng tự đăng nhập/tạo tài khoản rồi thử: đổi trạng thái 1 task
qua cột mới xem có cập nhật đúng không, và xác nhận nút Sửa/Xóa hiện rõ chữ không cần hover.
