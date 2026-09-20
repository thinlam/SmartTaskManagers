# packages/hooks

React hooks dùng chung: `useTasks`, `useProjects`, `useGoals`, `useHabits`, `useAuth`...

## Trạng thái

- ✅ `useTasks` (Phase 12): store task cục bộ — `tasks` + `addTask`/`updateTask`/`deleteTask`/
  `completeTask`, tất cả chỉ đổi React state (`useState`), không gọi `@stm/api-client`, không
  persist. Cố ý thiết kế public API giống hệt hình dạng một hook nối API thật sẽ có (`tasks` +
  4 hàm mutate) — khi Phase 27 nối `@stm/api-client` thật, trang gọi `useTasks()` không cần sửa,
  chỉ cần sửa bên trong hook. `addTask`'s `NewTaskInput` mở rộng ở Phase 12 bước 2 (thêm
  `description`/`status`/`startDate`/`progress`/`tags`, tất cả optional) để form Task Detail tạo
  task mới không cần tạo-rồi-vá-ngay bằng `updateTask` — 1 lệnh gọi đủ cho mọi field.
  `useTasks()` **không tự quyết định được gọi ở đâu** — Phase 12 bước 2 phát hiện gọi nó cục bộ
  trong từng page (như `TasksPage` ban đầu) khiến state không dùng chung được giữa các trang; xem
  `apps/desktop/src/state/TasksContext.tsx` cho cách bọc 1 instance duy nhất dùng chung toàn app.
- ✅ `useProjects` (Phase 13): cùng pattern với `useTasks` — `projects` +
  `addProject`/`updateProject`/`deleteProject`, cục bộ, không persist. **Giới hạn đã ghi nhận:**
  `deleteProject` không dọn `projectId` của các task đang tham chiếu project đó — chấp nhận được
  cho store demo cục bộ, nhưng backend thật (Phase 27) cần xử lý ràng buộc tham chiếu đúng cách
  (cascade clear, hoặc chặn xoá khi còn task liên kết).
- ⏳ `useGoals`/`useHabits`/`useAuth` — chưa làm, thêm khi Phase tương ứng cần (Goals: Phase 14, ...).

## Test

```bash
npm run typecheck
```
