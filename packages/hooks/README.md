# packages/hooks

React hooks dùng chung: `useTasks`, `useProjects`, `useGoals`, `useHabits`, `useAuth`...

## Trạng thái

- ✅ `useTasks` (Phase 12): store task cục bộ — `tasks` + `addTask`/`updateTask`/`deleteTask`/
  `completeTask`, tất cả chỉ đổi React state (`useState`), không gọi `@stm/api-client`, không
  persist. Cố ý thiết kế public API giống hệt hình dạng một hook nối API thật sẽ có (`tasks` +
  4 hàm mutate) — khi Phase 27 nối `@stm/api-client` thật, trang gọi `useTasks()` không cần sửa,
  chỉ cần sửa bên trong hook.
- ⏳ `useProjects`/`useGoals`/`useHabits`/`useAuth` — chưa làm, thêm khi Phase tương ứng cần
  (Projects: Phase 13, ...).

## Test

```bash
npm run typecheck
```
