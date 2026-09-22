# Web (React)

Vite + React 19 + Tailwind v4, same stack as `apps/desktop`, sharing all
page/component/state code via `@stm/app-core` (Phase 33) — no UI or
business logic is duplicated between the two apps.

## Chạy local

```bash
npm run dev --workspace=apps/web
```

Mặc định gọi backend tại `http://localhost:5277` (xem `.env.development`).
Nếu `apps/desktop` đang chạy dev server cùng lúc và chiếm cổng `5173`, Vite
sẽ tự chuyển `apps/web` sang `5174` — cổng này đã được thêm sẵn vào CORS
`Cors:AllowedOrigins` phía backend (`appsettings.Development.json`).

## Build

```bash
npm run build --workspace=apps/web
```

## Deploy lên Vercel

1. Kết nối repo GitHub với Vercel, tạo project mới.
2. Trong Project Settings → General → Root Directory, chọn `apps/web`.
3. Build Command: `cd ../.. && npm install && npm run build --workspace=apps/web`
   Output Directory: `dist`
   (Vercel tự nhận diện Vite qua `vite.config.ts` nếu Root Directory đúng;
   chỉ cần chỉnh Build Command thủ công vì đây là npm workspaces monorepo.)
4. Environment Variables → thêm `VITE_API_BASE_URL` = URL backend Railway
   thật (giá trị giống `.env.production` ở đây).
5. Sau khi deploy xong và có domain thật (vd. `https://smarttask.vercel.app`),
   thêm domain đó vào biến môi trường `Cors__AllowedOrigins__2` trên Railway
   (service `SmartTaskManagers`) — không cần sửa code hay deploy lại backend.
   Dùng index `2`, không phải `0`: base `appsettings.json` đã định nghĩa sẵn
   index `0`/`1` cho 2 origin Tauri (`tauri://localhost`/`http://tauri.localhost`),
   và ASP.NET Core's environment-variable config provider merge mảng **theo
   index** với layer bên dưới (base `appsettings.json`) chứ không append —
   dùng `__0` sẽ ghi đè mất origin Tauri đầu tiên thay vì thêm domain Vercel mới.
