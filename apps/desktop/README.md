# Desktop — Windows (React + Tauri)

React + TypeScript + Vite, khởi tạo ở **Phase 05**. Tauri (đóng gói thành `.exe`/`.msi`) chưa làm
— đó là **Phase 06**. Hiện tại đây chỉ là một trang web bình thường chạy qua `vite dev`/`vite build`.

Dùng chung `packages/ui`, `packages/types`, `packages/api-client`, `packages/shared`,
`packages/hooks` với `apps/web` (Phase 33) — không viết lại UI riêng cho từng app.

## Stack

- React 19 + TypeScript
- Vite 6
- Tailwind CSS v4 (`@tailwindcss/vite`, CSS-first — theme định nghĩa tại
  [`packages/ui/src/styles/theme.css`](../../packages/ui/src/styles/theme.css), import lại qua
  `@stm/ui/theme.css`)

## Chạy

```bash
npm install                # ở repo root — cài cho toàn bộ workspaces
npm run dev:desktop         # http://localhost:5173
npm run build:desktop        # production build vào apps/desktop/dist
npm run typecheck --workspace=apps/desktop
```

`src/App.tsx` hiện là **trang smoke-test tạm thời** (render các variant của `Button` từ
`@stm/ui`) để verify Vite + Tailwind + `packages/ui` nối đúng dây — sẽ bị thay thế hoàn toàn bởi
Application Shell thật ở **Phase 07**.

## Lưu ý quan trọng khi thêm package mới dùng Tailwind class

Tailwind v4 tự động quét file nguồn trong project, nhưng **bỏ qua `node_modules`** — mà
`@stm/ui` (và sau này `packages/types`/`packages/hooks` nếu có JSX) được resolve qua symlink
workspace trong `node_modules`. Vì vậy `src/index.css` phải khai báo:

```css
@source '../../../packages/ui/src';
```

Thiếu dòng này, class Tailwind dùng bên trong component của `packages/ui` (ví dụ `bg-primary`
trong `Button`) sẽ bị Tailwind bỏ qua, sinh CSS thiếu — không có lỗi build, chỉ là style không
xuất hiện. Đã verify: build ra `apps/desktop/dist/assets/*.css` có chứa `--color-primary:#4f46e5`
và `.bg-primary`.
