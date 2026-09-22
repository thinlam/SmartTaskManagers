# packages/app-core

React app shell dùng chung — pages, components, state/contexts, routing, config —
extract nguyên trạng từ `apps/desktop/src/` ở Phase 33, khi `apps/web` được thêm
vào và cần dùng lại toàn bộ UI/business logic đó thay vì viết lại lần thứ hai.

## Export

`src/index.ts` là mặt tiếp xúc duy nhất ra bên ngoài:

```ts
export { default as App } from './App';
export { getStoredServerUrl } from './lib/serverUrl';
```

`App` là component gốc (routes + providers + layout); `getStoredServerUrl` đọc
giá trị backend URL đã lưu ở `localStorage` (xem `apps/desktop/README.md`'s mục
"Cài trên nhiều máy") để dùng làm giá trị khởi tạo cho `configureApiClient()`
lúc app khởi động.

## `main`/`types` trỏ thẳng vào TypeScript nguồn — không build riêng

`package.json`:

```json
"main": "./src/index.ts",
"types": "./src/index.ts"
```

Package này **không** có bước build/publish riêng (không `dist/`, không
`vite build` của chính nó) — mỗi consumer (`apps/desktop`, `apps/web`) tự bundle
nó qua Vite build của chính app đó, y hệt cách 2 app này đã bundle
`packages/ui`/`packages/hooks`/... Đây là chủ đích, không phải thiếu sót: package
chỉ tồn tại trong npm workspace nội bộ, không bao giờ publish ra ngoài, nên build
riêng chỉ thêm 1 bước trung gian không cần thiết.

## Vì sao `main.tsx`/`index.css`/`vite-env.d.ts`/build config vẫn ở lại từng app

Khi extract ở Phase 33, các file này **cố ý không** chuyển vào `app-core` cùng
với `App.tsx`/pages/components/state:

- `main.tsx` — entry point thật khác nhau giữa 2 app (Tauri webview vs. trình
  duyệt thường); mỗi app tự gọi `configureApiClient()` rồi `createRoot(...)` với
  cấu hình riêng của mình.
- `index.css` — mỗi app có Tailwind `@source` trỏ theo đường dẫn tương đối khác
  nhau tới `packages/ui/src`/`packages/app-core/src` (phụ thuộc độ sâu thư mục
  của từng app), nên không thể dùng chung 1 file.
- `vite-env.d.ts` — khai báo `ImportMetaEnv` cho `VITE_API_BASE_URL`; giữ per-app
  vì mỗi app có `.env.development`/`.env.production` riêng.
- Build config (`vite.config.ts`, `tsconfig.json`, v.v.) — mỗi app build/deploy
  độc lập (Tauri packaged app vs. Vercel static site), runtime environment khác
  hẳn nhau, nên cấu hình build không dùng chung được.

## Trạng thái

- ✅ Phase 33: `git mv` nguyên trạng `apps/desktop/src/{app,components,pages,state,config,lib,mock,App.tsx}`
  sang `packages/app-core/src/`, giữ lịch sử git. `apps/desktop` sau đó chỉ còn
  `main.tsx`/`index.css`/`vite-env.d.ts` + import `App`/`getStoredServerUrl` từ
  `@stm/app-core`. `apps/web` (mới, cùng Phase) import y hệt, không sửa gì bên
  trong `app-core`.
