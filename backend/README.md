# backend

ASP.NET Core, Clean Architecture. Skeleton dựng ở **Phase 20**, schema thật + migration dựng ở
**Phase 21**, JWT Authentication (email/password) dựng ở **Phase 22**, Tasks CRUD API dựng ở
**Phase 23** — cả bốn đều verify bằng chạy thật, không chỉ build.

```
SmartTask.Api/             Controllers, DI composition root (Program.cs), JWT bearer validation
SmartTask.Application/     Use cases, DTOs, abstraction cho Infrastructure implement (IDateTimeProvider, IPasswordHasher, IJwtTokenGenerator, ITaskRepository, IUserRepository)
SmartTask.Domain/          Entity thuần — build KHÔNG có package reference nào (verify: dotnet list package)
SmartTask.Infrastructure/  Implement abstraction của Application (SystemDateTimeProvider, PasswordHasherAdapter, JwtTokenGenerator)
SmartTask.Persistence/     AppDbContext + Configurations/ (EF Core Fluent API), Repositories/, Migrations/
```

Target framework: **net10.0** (bản .NET mới nhất tại thời điểm cài, khớp tinh thần "dùng bản stable
mới nhất" đã áp dụng cho React 19/Vite 6/Tailwind v4/Tauri 2 ở frontend).

Database: **SQL Server** (quyết định — xem [`docs/architecture/ARCHITECTURE.md`](../docs/architecture/ARCHITECTURE.md)).
Connection string trong `SmartTask.Api/appsettings.json` trỏ tới SQL Server Express thật trên máy
dev (`DESKTOP-CKNT19A\SQLEXPRESS`, đổi từ LocalDB mặc định lúc Phase 20 sang instance thật đang chạy
sẵn trên máy).

## Chạy thử

```bash
cd backend
dotnet build                                # build cả 5 project qua SmartTask.slnx
dotnet ef database update `
  --project SmartTask.Persistence --startup-project SmartTask.Api   # áp migration (idempotent)
dotnet run --project SmartTask.Api
curl http://localhost:5299/api/health       # {"status":"Healthy","serverTimeUtc":"..."}
```

`GET /openapi/v1.json` (chỉ bật ở Development) cũng đã verify sinh đúng OpenAPI document.

## Schema (Phase 21)

4 bảng, khớp `TASK_HEADERS`/`PROJECT_HEADERS`/`GOAL_HEADERS`/`HABIT_HEADERS` trong
`apps/google-sheets/src/00_Constants.gs` (`SmartTask.Domain/{Tasks,Projects,Goals,Habits}/`), cộng
3 cột đồng bộ trên mọi bảng (`SmartTask.Domain/Common/SyncableEntity.cs`: `SyncStatus`,
`LastSyncedAt`, `Version` — `Id` UUID đã có từ `Entity` ở Phase 20) chuẩn bị cho Phase 28, và cột
`SmartScore`/`Risk`/`RecommendedAction` trên `Tasks` chuẩn bị cho Phase 29 — **chưa có logic tính
toán nào**, chỉ có cột.

Khác biệt có chủ đích so với `TASK_HEADERS`/`PROJECT_HEADERS` gốc:

- **Khóa chính là UUID** (`Entity.Id`), không phải mã hiển thị kiểu `TASK-0001`/`PRJ-0001` của
  Sheets — mã đó chỉ tồn tại vì spreadsheet không có khái niệm surrogate key; không port sang quan
  hệ vì không cần, và không model trước một cột tham chiếu ngược để đối chiếu Sheets khi Phase 28
  chưa tới.
- `Project.Health` **được lưu thật** (khác `packages/types`'s `Project` ở frontend, cố ý không lưu
  vì demo store không có job nền để giữ giá trị luôn mới) — backend là nơi hợp lý để cache giá trị
  này và tính lại khi ghi, nhưng logic tính (`computeProjectHealth()` port sang C#) **chưa làm**,
  cột mặc định `Healthy` và không tự đổi.
- Enum lookup (`Area`/`Priority`/`Status`/`Risk`/`Energy`/`Context`/`RecurringType`/
  `ProjectHealth`/`GoalStatus`/`HabitFrequency`, khớp `LOOKUP_LISTS`) lưu dạng chuỗi
  (`HasConversion<string>()`), không phải `int` mặc định của EF Core — để DB dễ đọc và so khớp
  trực tiếp với giá trị chuỗi bên Sheets khi Phase 28 cần.
- `Tags` giữ nguyên dạng 1 cột chuỗi phân tách bằng dấu phẩy, đúng cách Sheets lưu — không chuẩn hoá
  thành bảng riêng vì nguồn dữ liệu gốc cũng không có cấu trúc đó.

**Ràng buộc khoá ngoại (`Tasks.ProjectId`/`Tasks.GoalId`):** xoá Project/Goal thì chỉ gỡ tham chiếu
trên Task (`ON DELETE SET NULL`), không xoá Task theo — đúng hành vi "cascade clear" đã ghi trong
README của `packages/hooks` (`useProjects`/`useGoals`) là cách backend thật cần làm.

**Sự cố thật gặp khi tạo migration:** `Tasks.DependencyTaskId` (tự tham chiếu tới chính `Tasks`)
dùng `ON DELETE SET NULL` bị SQL Server từ chối thật khi áp migration — lỗi "may cause cycles or
multiple cascade paths". Sửa bằng đổi sang `ON DELETE NO ACTION` (`DeleteBehavior.Restrict`) —
xoá 1 task mà task khác đang phụ thuộc sẽ bị chặn ở tầng DB cho đến khi ứng dụng tự gỡ tham chiếu.

## Verify thật đã làm (không chỉ build)

- `dotnet ef migrations add InitialSchema` sinh migration — đã đọc lại file migration sinh ra, xác
  nhận đúng 4 bảng, đúng kiểu cột, đúng FK.
- `dotnet ef database update` áp migration thật vào SQL Server Express đang chạy trên máy dev — lần
  đầu thất bại thật (lỗi FK ở trên), sửa Fluent API, xoá migration cũ (`migrations remove`), sinh
  lại, áp lại — thành công.
- Xác nhận độc lập bằng `sqlcmd -S "DESKTOP-CKNT19A\SQLEXPRESS" -d SmartTask -E -C -Q "SELECT
  TABLE_NAME FROM INFORMATION_SCHEMA.TABLES..."` — thấy đúng 5 bảng (`Goals`/`Habits`/`Projects`/
  `Tasks`/`__EFMigrationsHistory`), không chỉ tin vào output của chính EF CLI.
- `dotnet run --project SmartTask.Api` sau khi có schema thật vẫn chạy tốt, `GET /api/health` vẫn
  trả JSON đúng.

## Authentication (Phase 22)

JWT, email/password — Google/Microsoft (roadmap gốc) để sau, chưa làm. Personal Mode's Sheets app
**không có khái niệm user/auth nào cả** (1 spreadsheet, 1 chủ sở hữu) nên `User` là thiết kế mới
hoàn toàn, không port từ đâu — xem doc comment trong `SmartTask.Domain/Users/User.cs`.

```
POST /api/auth/register   { email, password, displayName? } → { userId, email, token, expiresAt }
POST /api/auth/login      { email, password }                → { userId, email, token, expiresAt } | 401
GET  /api/auth/me         [Authorize] Bearer <token>          → { userId, email } | 401
```

Kiến trúc: `AuthService` (use case thật) nằm trong `SmartTask.Application`, không phải
`Infrastructure` — nó chỉ điều phối qua 3 abstraction (`IUserRepository`/`IPasswordHasher`/
`IJwtTokenGenerator`), không đụng trực tiếp EF Core hay thư viện JWT nào, đúng nghĩa "Application:
use case" trong `docs/architecture/ARCHITECTURE.md`. Mật khẩu băm bằng
`Microsoft.AspNetCore.Identity`'s `PasswordHasher<T>` (PBKDF2 + salt ngẫu nhiên) — **không** kéo
theo toàn bộ ASP.NET Core Identity (DbContext/store/SignInManager riêng của nó); Personal Mode hợp
với luồng User + JWT gọn nhẹ tự viết hơn là một framework dựng cho multi-tenant/team.

**Khóa ký JWT không nằm trong repo:** `Jwt:Secret` được tạo ngẫu nhiên thật
(`openssl rand -base64 48`) và lưu bằng `dotnet user-secrets` (`SmartTask.Api`, file nằm ở
`%APPDATA%\Microsoft\UserSecrets\<id>\secrets.json`, ngoài thư mục repo hoàn toàn — đã verify `git
status` không thấy gì). `appsettings.json` chỉ có `Jwt:Issuer`/`Jwt:Audience`/`Jwt:ExpiryMinutes`
(không nhạy cảm). Thiếu `Jwt:Secret` → app ném rõ `InvalidOperationException` khi phát hành hoặc xác
thực token, không âm thầm ký bằng khoá rỗng.

Máy dev khác cần chạy:

```bash
cd backend/SmartTask.Api
dotnet user-secrets set "Jwt:Secret" "<chuỗi ngẫu nhiên dài, tự tạo>"
```

**Verify thật đã làm — luồng đầy đủ, không chỉ build:** chạy `dotnet run` thật, gọi `curl` thật theo
thứ tự: đăng ký (200, nhận token) → đăng ký lại cùng email (409) → đăng nhập đúng mật khẩu (200,
token mới) → đăng nhập sai mật khẩu (401) → gọi `/api/auth/me` không kèm token (401) → gọi lại kèm
`Authorization: Bearer <token>` (200, đúng `userId`/`email` giải mã từ claim JWT). Cả 6 trường hợp
đều đúng như kỳ vọng. Dữ liệu test (`demo@example.com`) đã xoá khỏi SQL Server thật sau khi verify
xong, không để lại rác trong DB.

## Tasks API (Phase 23)

CRUD đầu tiên trên schema thật của Phase 21, có `[Authorize]` (yêu cầu Bearer token thật từ Phase
22). Bảng `Tasks` **không** chia theo user (không có cột `OwnerId`) — khớp đúng `TASK_HEADERS` gốc
vốn cũng không có cột Owner, và đúng nguyên tắc Personal Mode "không Team/Member/Owner" đã áp dụng
xuyên suốt cả frontend lẫn backend. `[Authorize]` ở đây chỉ có nghĩa "phải có token hợp lệ", không
phải "mỗi user thấy dữ liệu riêng" — đúng với 1 instance app cá nhân, không phải giả định multi-tenant.

```
GET    /api/tasks              [Authorize] → 200 [TaskResponse...]
GET    /api/tasks/{id}         [Authorize] → 200 TaskResponse | 404
POST   /api/tasks              [Authorize] → 201 TaskResponse | 400 (sai ProjectId/GoalId/DependencyTaskId)
PATCH  /api/tasks/{id}         [Authorize] → 200 TaskResponse | 404 | 400
POST   /api/tasks/{id}/complete [Authorize] → 200 TaskResponse (Status=Completed, Progress=100, CompletedDate=now) | 404
DELETE /api/tasks/{id}         [Authorize] → 204 | 404
```

`TaskService` (use case thật, `SmartTask.Application`) chỉ điều phối qua `ITaskRepository` +
`IDateTimeProvider` — không đụng EF Core trực tiếp, cùng pattern `AuthService` ở Phase 22.
`PATCH` là **cập nhật từng phần có giới hạn đã ghi rõ**: field nào gửi lên thì áp dụng, field nào bỏ
qua thì giữ nguyên — nhưng vì bind từ JSON object phẳng, **không phân biệt được** "bỏ qua trường
này" với "gửi `null` để xoá trường này" cho các cột nullable của entity (ví dụ không thể tự xoá
`ProjectId` về `null` qua endpoint này) — JSON Patch/Merge Patch thật sẽ giải quyết được, cố ý chưa
làm ở Phase này để giữ DTO đơn giản.

Enum (Area/Priority/Status/...) serialize/bind dạng chuỗi (`"Critical"` không phải `0`) qua
`JsonStringEnumConverter` đăng ký toàn cục trong `Program.cs` — khớp quyết định lưu enum dạng chuỗi
trong DB từ Phase 21, để API và DB nói cùng "ngôn ngữ".

**Verify thật, đầy đủ luồng — không chỉ build:** chạy `dotnet run` thật, `curl` thật theo đúng thứ
tự và xác nhận đúng cả 9 trường hợp: `GET /api/tasks` không token (401) → đăng ký lấy token →
`GET /api/tasks` có token (200, `[]` rỗng) → `POST` tạo task (201, đúng field, enum trả về dạng
chuỗi) → `GET` theo id (200, đúng dữ liệu) → `GET` id không tồn tại (404) → `PATCH` đổi
progress+status (200, `UpdatedAt`/`LastStatusChangedAt` cập nhật đúng vì status đổi thật) → `POST`
tạo task với `ProjectId` không tồn tại (400) → `POST .../complete` (200, đúng
Status=Completed/Progress=100/CompletedDate có giá trị) → `DELETE` (204) → `GET`/`DELETE` lại sau
khi xoá (404 cả hai). Dữ liệu test đã xoá khỏi SQL Server thật sau khi verify xong — không đụng vào
2 user thật (`taska@example.com`/`taskb@example.com`) đã có sẵn trong DB từ trước (không phải do
phiên này tạo ra). `dotnet list package --vulnerable --include-transitive` vẫn sạch.

## Sự cố thật gặp phải khi dựng skeleton (Phase 20)

Template `webapi` mặc định kéo theo `Microsoft.AspNetCore.OpenApi 10.0.9`, phiên bản này lại kéo
transitively `Microsoft.OpenApi 2.0.0` — bản có lỗ hổng bảo mật mức cao đã công bố
([GHSA-v5pm-xwqc-g5wc](https://github.com/advisories/GHSA-v5pm-xwqc-g5wc)). Đã ghim thẳng
`Microsoft.OpenApi` lên `2.12.2` (bản vá mới nhất **trong cùng nhánh 2.x**, không phải 3.x) —
thử ghim `3.10.2` trước thì build lỗi thật (`IOpenApiMediaType.Example` đổi từ ghi được sang chỉ
đọc giữa 2.x và 3.x, phá vỡ source generator của `Microsoft.AspNetCore.OpenApi 10.0.9`). Đã verify
lại: `dotnet list package --vulnerable --include-transitive` sạch trên cả 5 project sau khi ghim.
