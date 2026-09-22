# Phase 33 — Web Deployment (`apps/web`) — Design

Ngày: 2026-09-22

## Bối cảnh

`apps/desktop` (React 19 + Vite 6 + Tailwind v4, đóng gói qua Tauri 2) đã hoàn
thiện và verify thật (Phase 05–32), gọi backend ASP.NET Core + MySQL trên
Railway. Roadmap gốc (`docs/roadmap/ROADMAP.md`) đặt Phase 33 là "Web
deployment (`apps/web`, dùng chung `packages/*`) — không viết lại
Dashboard/UI lần thứ hai".

Audit xác nhận `apps/desktop/src/` **không dùng bất kỳ Tauri API nào**
(`@tauri-apps/api`, `window.__TAURI__`) — toàn bộ là React thuần, Tauri chỉ
là lớp đóng gói native. Vì vậy phần lớn `src/` có thể tái sử dụng nguyên vẹn
cho web, chỉ khác lớp bootstrap/build.

## Mục tiêu

- Deploy được bản web thật của Smart Task Manager lên Vercel, gọi cùng
  backend Railway hiện có, không viết lại UI/business logic lần hai.
- Sửa 1 nơi (`packages/app-core`) thì cả desktop lẫn web cùng được cập nhật.
- Không phá vỡ `apps/desktop` đang chạy ổn định.

## Ngoài phạm vi

- Không tối ưu responsive/mobile riêng cho web (dùng nguyên layout desktop
  hiện có — Phase sau nếu cần).
- Không tự thực hiện việc deploy trên Vercel dashboard/kết nối domain thật —
  phiên này không có quyền truy cập tài khoản Vercel của người dùng.
- Không đổi business logic/API contract của backend.
- Không bỏ tính năng LAN server-override (`lib/serverUrl.ts`) dù ít liên quan
  hơn với web — giữ nguyên, vô hại, YAGNI để xoá.

## Thiết kế

### A. Tách code dùng chung — `packages/app-core`

Package mới `@stm/app-core`, chuyển nguyên trạng từ `apps/desktop/src/`:

- `app/` (`AppShell.tsx`, `router.tsx`, `routes.ts`)
- `components/*` (5 Detail Drawer + QuickCaptureInput)
- `pages/**` (toàn bộ 24 file trong 12 thư mục con)
- `state/**` (6 Context: Auth/Tasks/Projects/Goals/Habits/Settings)
- `config/api.ts`
- `lib/*` (`reportError.ts`, `serverUrl.ts`)
- `mock/*` (`settings.ts` — mock còn sót lại cho Settings, ngoài phạm vi
  Phase 33 để dọn)
- `App.tsx` (root component, export default)

Package export: `export { default as App } from './App'` (giữ đúng tên
export mà `main.tsx` hiện dùng, chỉ đổi nguồn import).

**Giữ riêng mỗi app** (không chuyển vào `app-core`): `main.tsx`,
`index.css`, `vite-env.d.ts`, `vite.config.ts`, `index.html`,
`tsconfig.json`, `package.json`. Lý do: mỗi app có `@source` Tailwind path
tương đối khác nhau, dep khác nhau (desktop có Tauri, web không) — gộp các
file này vào package dùng chung tạo phụ thuộc đường dẫn tương đối dễ vỡ mà
không có lợi ích tương ứng.

`apps/desktop/src/main.tsx` đổi import từ `./App` sang `@stm/app-core`,
không đổi logic bootstrap (`configureApiClient(...)` + `getStoredServerUrl()`
giữ nguyên, chỉ là `App`/context/pages giờ nằm ở package khác).

### B. Scaffold `apps/web`

Cấu trúc tương tự `apps/desktop` hiện tại, bỏ phần Tauri:

```
apps/web/
├── package.json          # @stm/web — deps: @stm/app-core, @stm/hooks,
│                          # @stm/shared, @stm/types, @stm/ui, react,
│                          # react-dom, react-router-dom, lucide-react
│                          # (KHÔNG có @tauri-apps/*)
├── vite.config.ts         # react() + tailwindcss(), giống hệt desktop
├── index.html
├── tsconfig.json           # extend base, reference app-core + ui/types/hooks/shared
├── .env.development        # VITE_API_BASE_URL=http://localhost:5277
├── .env.production         # VITE_API_BASE_URL=https://smarttaskmanagers-production.up.railway.app
├── .gitignore              # kế thừa root .gitignore's .env rules — không cần riêng
├── README.md                # thay README placeholder hiện có, ghi hướng dẫn Vercel
└── src/
    ├── main.tsx             # bootstrap: configureApiClient + render App từ @stm/app-core
    ├── index.css            # @import tailwindcss + @stm/ui/theme.css + @source '../../../packages/ui/src'
    └── vite-env.d.ts
```

Root `package.json`: thêm `"apps/web"` vào `workspaces`, thêm script
`dev:web`/`build:web` (mirror `dev:desktop`/`build:desktop`), thêm
`apps/web` vào `typecheck` script pattern nếu cần (theo cách
`apps/desktop` hiện được gộp).

Root `tsconfig.json`: KHÔNG cần thêm `apps/web` vào `references` (cùng lý do
`apps/desktop` hiện tại không nằm trong đó — leaf project, tự typecheck qua
script riêng).

### C. Backend CORS — đọc origin từ config thay vì hard-code

`SmartTask.Api/Program.cs` hiện tại:

```csharp
policy.WithOrigins("http://localhost:5173", "tauri://localhost", "http://tauri.localhost")
```

Đổi thành đọc từ `builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()`,
fallback về mảng rỗng nếu thiếu (không throw — CORS thiếu origin chỉ chặn
browser gọi, không phải lỗi khởi động nghiêm trọng như thiếu connection
string/JWT secret).

`appsettings.Development.json` thêm:
```json
"Cors": { "AllowedOrigins": ["http://localhost:5173", "tauri://localhost", "http://tauri.localhost", "http://localhost:5174"] }
```
(`localhost:5174` dự phòng cho `apps/web`'s dev server nếu Vite chọn port
khác do desktop đã chiếm 5173 khi chạy song song.)

Production (Railway): không set gì thêm ngay bây giờ (chưa có domain
Vercel) — tài liệu hoá trong README rằng sau khi có domain thật, người
dùng tự thêm biến môi trường `Cors__AllowedOrigins__0=https://<domain>.vercel.app`
trên Railway dashboard, không cần sửa code hay redeploy lại từ session này.

### D. Deploy + Verify

**Verify tự làm được trong phiên này (thật, không giả định):**
- `npm run typecheck` / `npm run lint` / `npm run format` — toàn repo, sau
  khi tách `app-core` và thêm `apps/web`.
- `npm run build --workspace=apps/web` — production Vite build sạch.
- `dotnet build -c Release` (backend) sau khi đổi CORS.
- `curl -H "Origin: http://localhost:5173" -X OPTIONS ...` xác nhận header
  `Access-Control-Allow-Origin` đúng cho origin được whitelist và bị chặn
  cho origin lạ.
- Chạy `npm run dev --workspace=apps/web` thật, dùng `claude-in-chrome`
  (nếu server kết nối được) để click-test thật luồng Login → Dashboard
  trong trình duyệt — nếu không kết nối được, nói rõ giới hạn như các phase
  trước thay vì nhận đã test.
- Xác nhận `apps/desktop` vẫn build/chạy đúng sau khi tách `app-core`
  (không hồi quy) — `npm run build:tauri` hoặc tối thiểu
  `npm run build --workspace=apps/desktop`.

**Việc thuộc về người dùng (ngoài khả năng truy cập của phiên này):**
- Tạo project Vercel thật, kết nối repo GitHub, set Root Directory =
  `apps/web`, set biến môi trường `VITE_API_BASE_URL` trên Vercel dashboard.
- Sau khi có domain Vercel thật: thêm vào `Cors__AllowedOrigins` trên
  Railway backend.
- Xác nhận bản deploy thật trên Vercel gọi được backend Railway (tôi không
  có quyền truy cập Vercel/domain thật để tự curl kiểm tra).

## Rủi ro / lưu ý

- Tách `app-core` là refactor xuyên suốt `apps/desktop` — cần đảm bảo
  desktop không hồi quy, verify bằng build thật sau khi tách trước khi coi
  Phase 33 xong.
- `mock/settings.ts` vẫn còn dùng trong Settings — không thuộc phạm vi
  Phase 33 để dọn, chỉ di chuyển nguyên trạng cùng package.
- CORS đổi từ hard-code sang config là thay đổi hành vi nhỏ (list rỗng nếu
  thiếu config thay vì 3 origin cố định) — `appsettings.Development.json`
  bù lại bằng cách khai báo tường minh 4 origin, không mất origin nào so
  với hiện tại cho local dev.
