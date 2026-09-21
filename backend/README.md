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
dotnet run --project SmartTask.Api          # mặc định http://localhost:5277 (xem Properties/launchSettings.json)
curl http://localhost:5277/api/health       # {"status":"Healthy","serverTimeUtc":"..."}
```

`GET /openapi/v1.json` (chỉ bật ở Development) cũng đã verify sinh đúng OpenAPI document.

## Test bằng tay qua Swagger UI

Mở **http://localhost:5277/swagger** khi `dotnet run` đang chạy (chỉ bật ở Development, giống
`/openapi/v1.json`). Dùng `Swashbuckle.AspNetCore.SwaggerUI` (chỉ phần UI — bản thân OpenAPI
document vẫn do `Microsoft.AspNetCore.OpenApi`'s `AddOpenApi()`/`MapOpenApi()` sinh ra, không đổi
sang Swashbuckle's generator).

Để gọi được các route có `[Authorize]` (Tasks/Projects/Goals): mở `POST /api/auth/register` hoặc
`/api/auth/login`, "Try it out" để lấy `token` từ response → bấm nút **Authorize** (góc trên phải
trang Swagger) → dán đúng giá trị `token` (không cần gõ chữ `Bearer` trước, Swagger UI tự thêm) →
Authorize → Close. Sau đó mọi request "Try it out" từ Swagger UI sẽ tự kèm header
`Authorization: Bearer <token>`.

Đã verify thật: `GET /openapi/v1.json` có đúng `components.securitySchemes.Bearer` (kiểu `http`/
`bearer`/`JWT`) và `security: [{ "Bearer": [] }]` ở gốc document — xác nhận nút Authorize hoạt động
đúng, không chỉ hiện ra cho có. `curl http://localhost:5277/swagger/index.html` trả `200` thật.

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

## Projects API (Phase 24)

Cùng khuôn với Tasks API (Phase 23), CRUD trên `Projects`:

```
GET    /api/projects           [Authorize] → 200 [ProjectResponse...]
GET    /api/projects/{id}      [Authorize] → 200 ProjectResponse | 404
POST   /api/projects           [Authorize] → 201 ProjectResponse
PATCH  /api/projects/{id}      [Authorize] → 200 ProjectResponse | 404
DELETE /api/projects/{id}      [Authorize] → 204 | 404
```

**Không có field `Health` ở `CreateProjectRequest`/`UpdateProjectRequest`** — đúng sự kiềm chế
`ProjectDetailDrawer` bên frontend đã áp dụng từ Phase 13: Health luôn được tính, không nhập tay.
Ở backend, cột `Health` có lưu thật (khác frontend, xem mục Schema) nhưng **chưa có gì tính nó cả**
— nếu để client tự set qua API thì phá vỡ đúng ngay ý nghĩa "computed" khi logic tính (port
`computeProjectHealth()` sang C#) thật sự làm sau này. `ProjectService` cùng pattern `TaskService`/
`AuthService` — chỉ điều phối qua `IProjectRepository`/`IDateTimeProvider`.

**Verify thật, đầy đủ luồng — không chỉ build:** chạy `dotnet run` thật, `curl` thật: `GET
/api/projects` không token (401) → có token (200, rỗng) → tạo project (201, `health` mặc định
`"Healthy"`) → lấy theo id (200) → `PATCH` đổi description (200, `UpdatedAt` cập nhật đúng).
**Verify xuyên-entity quan trọng nhất:** tạo 1 task thật có `projectId` trỏ vào project vừa tạo →
xoá project (204) → gọi lại task đó, xác nhận `projectId` đã tự về `null` (task **không** bị xoá
theo) — đúng hành vi "cascade clear" của FK `ON DELETE SET NULL` đã cấu hình ở Phase 21, giờ mới có
API thật để chứng minh nó hoạt động đúng, không chỉ đọc migration bằng mắt. Project sau khi xoá trả
404 khi gọi lại. Dữ liệu test đã xoá sạch khỏi SQL Server thật, không đụng 2 user có sẵn trong DB.
`dotnet list package --vulnerable --include-transitive` vẫn sạch.

## Goals API (Phase 25)

Cùng khuôn Tasks/Projects API, CRUD trên `Goals`:

```
GET    /api/goals              [Authorize] → 200 [GoalResponse...]
GET    /api/goals/{id}         [Authorize] → 200 GoalResponse | 404
POST   /api/goals              [Authorize] → 201 GoalResponse
PATCH  /api/goals/{id}         [Authorize] → 200 GoalResponse | 404
DELETE /api/goals/{id}         [Authorize] → 204 | 404
```

**Khác Projects (Phase 24) ở đúng 1 điểm có chủ đích:** `CreateGoalRequest`/`UpdateGoalRequest`
**CÓ** field `Progress`/`Status` — vì Goal không có khái niệm "computed" nào để bảo vệ: Sheets
không có view engine nào cho Goals (không như Project có `14_Projects.gs`), nên `Progress`/`Status`
luôn là field người dùng nhập trực tiếp cả ở Sheets, frontend (`GoalDetailDrawer`, Phase 14) lẫn
backend — không có gì mâu thuẫn khi cho client set qua API. `GoalService` cùng pattern
`ProjectService`/`TaskService`.

**Verify thật, đầy đủ luồng — không chỉ build:** `GET /api/goals` không token (401) → có token
(200, rỗng) → tạo goal với `progress`/`status` tự chọn (201, đúng giá trị gửi lên — khác Project's
`health` luôn mặc định) → lấy theo id (200) → `PATCH` đổi progress+status (200, `UpdatedAt` cập
nhật đúng) → id không tồn tại (404). **Verify xuyên-entity:** tạo 1 task thật có `goalId` trỏ vào
goal vừa tạo → xoá goal (204) → gọi lại task, xác nhận `goalId` tự về `null`, task không bị xoá
theo — xác nhận `Tasks.GoalId`'s `ON DELETE SET NULL` (Phase 21) hoạt động đúng y hệt
`Tasks.ProjectId` ở Phase 24. Goal sau khi xoá trả 404. Dữ liệu test đã xoá sạch, không đụng 2 user
có sẵn trong DB. `dotnet list package --vulnerable --include-transitive` vẫn sạch.

## Habits API (Phase 26)

Cùng khuôn Tasks/Projects/Goals API, CRUD trên `Habits` — cộng 1 action riêng:

```
GET    /api/habits                [Authorize] → 200 [HabitResponse...]
GET    /api/habits/{id}           [Authorize] → 200 HabitResponse | 404
POST   /api/habits                [Authorize] → 201 HabitResponse (Streak/CompletedCount=0, LastCompletedDate=null)
PATCH  /api/habits/{id}           [Authorize] → 200 HabitResponse | 404
POST   /api/habits/{id}/check-in  [Authorize] → 200 HabitResponse (+1 Streak, +1 CompletedCount, LastCompletedDate=hôm nay) | 404
DELETE /api/habits/{id}           [Authorize] → 204 | 404
```

**Không có quan hệ xuyên-entity nào** — khác Projects (Phase 24)/Goals (Phase 25), `Habits` đứng
riêng hoàn toàn: không có `Task.HabitId` nào cả (đã grep `apps/google-sheets/src` xác nhận từ Phase
15 phía frontend, giờ đúng y hệt ở backend), nên không có FK nào để verify cascade clear.
`CreateHabitRequest`/`UpdateHabitRequest` **không có** `Streak`/`CompletedCount`/
`LastCompletedDate` — 3 field này chỉ đổi qua `POST .../check-in`, không sửa tay được, đúng
`HabitDetailDrawer` bên frontend (Phase 15).

`CheckInAsync` (`HabitService`) là port trực tiếp logic `checkInHabit()` của `useHabits` bên
frontend (Phase 15, bản thân nó cũng không phải port từ Sheets — Sheets không có hàm hoàn thành
habit nào): +1 `Streak`, +1 `CompletedCount`, `LastCompletedDate` = hôm nay (tính theo
`IDateTimeProvider.UtcNow`, không phải `DateTime.UtcNow` trực tiếp — dễ test hơn sau này). **No-op
nếu hôm nay đã check-in rồi** — gọi endpoint này nhiều lần trong 1 ngày không tăng số lần thứ 2 trở
đi.

**Verify thật, đầy đủ luồng — không chỉ build:** `GET /api/habits` không token (401) → có token
(200, rỗng) → tạo habit (201, `streak`/`completedCount` = 0, `lastCompletedDate` = `null`) → `PATCH`
đổi `targetCount` → **check-in lần 1** (200, `streak`=1/`completedCount`=1/`lastCompletedDate`=hôm
nay) → **check-in lần 2 cùng ngày** (200, y hệt lần 1 — `updatedAt` không đổi, xác nhận no-op thật
chứ không chỉ đọc code) → **check-in lần 3 cùng ngày** (vẫn y hệt) → id không tồn tại (404) → xoá
(204) → lấy lại sau xoá (404). Dữ liệu test đã xoá sạch, không đụng 2 user có sẵn trong DB. `dotnet
list package --vulnerable --include-transitive` vẫn sạch — và một sự cố thật gặp giữa chừng: 1
process `SmartTask.Api` cũ (từ lần chạy Swagger UI trước) còn giữ khoá file DLL khiến `dotnet build`
lỗi thật `MSB3027`; `Stop-Process` process đó rồi build lại mới qua.

## CORS (Phase 27)

`Program.cs` có policy tên `DesktopClient` (`AddCors`/`UseCors`), cho phép origin
`http://localhost:5173` (Vite dev server) + `tauri://localhost`/`http://tauri.localhost` (cửa sổ
Tauri packaged) gọi API — không `AllowAnyOrigin`, API này không định cho website bất kỳ gọi.
`UseCors` đặt **trước** `UseAuthentication` trong pipeline: request `OPTIONS` preflight của trình
duyệt không mang header `Authorization`, nên CORS phải được xử lý trước khi middleware auth có cơ
hội từ chối nó. Sự cố thật gặp giữa chừng khi build phase này: lần đầu chỉ gọi `AddCors` (đăng ký
policy) mà quên `app.UseCors()` trong pipeline — verify bằng `curl -X OPTIONS` xác nhận vẫn trả
`405 Method Not Allowed` thay vì `204` kèm `Access-Control-Allow-Origin`; thêm dòng `UseCors` mới
qua, verify lại thấy đúng header.

## Sync (Phase 28)

```
POST /api/sync/push   [Authorize]  { tasks[], projects[], goals[], habits[] }  →  per-item outcome (Created/Updated/SkippedOlder/Error)
GET  /api/sync/pull   [Authorize]  ?since=<ISO timestamp>                      →  { serverTime, tasks[], projects[], goals[], habits[] } changed after `since`
```

Bidirectional, **Last-Write-Wins theo `UpdatedAt`**, đối chiếu qua Phase 21's cột
`ExternalId`/`SyncStatus`/`LastSyncedAt`/`Version` (đã có sẵn trên `SyncableEntity`, giờ mới thật sự
dùng). `ExternalId` là mã hiển thị phía Sheets (`TASK-0001`...) — Phase 21 cố tình không dùng nó
làm khoá chính; migration này (`AddSyncExternalId`) thêm nó như 1 cột riêng, unique có điều kiện
(`WHERE ExternalId IS NOT NULL`, filtered index) để không phá vỡ những Task/Project/Goal/Habit tạo
thẳng qua API/Desktop app mà không có mã Sheets nào cả.

**Đối chiếu theo `Id` trước, `ExternalId` sau — không chỉ `ExternalId`.** Mỗi `SyncXItem` có thêm
field `Id` (optional): khi Sheets đã biết `BackendId` của 1 dòng (cột `BackendId` của nó, ghi lại từ
lần sync trước hoặc từ 1 lần `pull` mang một entity tạo thẳng qua Desktop app về Sheets lần đầu — lúc
đó `ExternalId` trên backend vẫn `null`), `SyncService` ưu tiên tìm theo `Id` này thay vì
`ExternalId`. **Bug thật tìm thấy khi verify:** ban đầu chỉ đối chiếu theo `ExternalId`; test thật
(tạo task qua API bình thường, `pull` nó vào Sheets — lúc đó `ExternalId` backend vẫn `null` — rồi
Sheets gán 1 mã mới và `push` lại) cho thấy backend **tạo trùng 1 dòng mới** thay vì cập nhật dòng
cũ, vì tìm theo `ExternalId` không ra (backend chưa từng biết mã đó). Sửa bằng thêm field `Id` vào
contract, ưu tiên tra theo `Id` khi có, đồng thời backfill `ExternalId` lên entity đã tìm thấy — verify
lại bằng đúng kịch bản trên: `curl` tạo → `pull` (thấy `externalId: null`) → `push` lại với `id` +
`externalId` mới → `Outcome: Updated` (không phải `Created`) → `GET /api/tasks` xác nhận **chỉ 1
dòng**, không trùng.

**Cô lập lỗi từng item, không rớt cả batch.** Mỗi item trong 1 lần `push` có `SaveChangesAsync`
riêng, bọc try/catch riêng — 1 item lỗi (vd `ProjectId` tham chiếu không tồn tại) trả `Outcome:
Error` chỉ cho item đó, các item hợp lệ khác trong cùng batch vẫn `Created`/`Updated` bình thường.
**Bug thật tìm thấy khi verify:** ban đầu, sau 1 item lỗi, MỌI item sau đó trong cùng batch cũng báo
`Error` dù dữ liệu hợp lệ — nguyên nhân: `SaveChangesAsync` thất bại vẫn để entity bị lỗi nằm lại
trong EF Core's change tracker của `DbContext` (dùng chung suốt vòng lặp), khiến lần `SaveChangesAsync`
kế tiếp cố lưu lại luôn cả entity hỏng đó và thất bại theo. Sửa bằng `DiscardTracking()` (mới, gọi
`dbContext.ChangeTracker.Clear()`) trong mỗi `catch`, verify lại bằng batch 2 item (1 lỗi + 1 hợp
lệ) → item hợp lệ trả đúng `Created`.

Verify thật, đầy đủ luồng — không chỉ build: migration `AddSyncExternalId` áp thật vào SQL Server
Express, verify độc lập bằng `sqlcmd`. `curl` thật: push tạo mới (`Created`), push lại với
`updatedAt` cũ hơn (`SkippedOlder`, không ghi đè), push lại với `updatedAt` mới hơn (`Updated`,
`Version` tăng), `pull` xác nhận thấy đúng bản mới nhất. Kịch bản trùng lặp qua `Id` và kịch bản cô
lập lỗi per-item ở trên đều verify bằng `curl` thật, không chỉ đọc code. Payload sinh thật từ
`taskRowToSyncItem_()` (Apps Script, chạy qua Node `vm` harness với GAS API giả lập tối thiểu) được
gửi thẳng tới `/api/sync/push` thật — xác nhận đúng khớp JSON shape 2 đầu, không chỉ khớp trên giấy.
Dữ liệu test đã xoá sạch, không đụng 2 user có sẵn trong DB.

## Smart Engine (Phase 29)

Port 1:1 từ `apps/google-sheets/src/05_SmartEngine.gs` — `SmartTask.Application/SmartEngine/`
(`SmartWeights.cs` giữ nguyên mọi con số từ `SMART_WEIGHTS`, `SmartEngineService.cs` port
`computeSmartFields_()` và toàn bộ helper của nó: `urgencyScore_`, `effortFitScore_`, `isStalled_`,
`riskBucket_`, `recommendAction_`, `isDependencyCompleted_`). Không đổi 1 con số/1 rule nào so với
bản gốc — mọi nhánh trong `SmartEngineService` trace được về đúng dòng tương ứng bên Apps Script.

`TaskService.CreateAsync`/`UpdateAsync`/`CompleteAsync` đều gọi Smart Engine trước khi lưu — đúng y
hệt `createTask_()`/`updateTask_()` gọi `computeSmartFields_()` mỗi lần ở Sheets, không để
`SmartScore`/`Risk`/`RecommendedAction` bị cũ giữa các lần sửa. `SyncService`'s `PushTaskAsync` (Phase 28) cũng gọi Smart Engine khi tạo/sửa task qua sync — nếu không, 1 task tạo thuần qua sync sẽ có
Smart fields `null`/cũ cho tới lần recalculate-all kế tiếp.

```
POST /api/smart-engine/recalculate-all   [Authorize]   →  { updatedCount: <n> }
```

Tương đương `recalculateAllSmartFields_()` (menu action) — gọi thủ công, không cần chờ tới 06:00.

**Daily auto-recalc thật:** `DailySmartRecalcHostedService` (`BackgroundService`, đăng ký qua
`AddHostedService`) — port của `ensureDailyRecalcTrigger_()`'s time-driven trigger (06:00 UTC mỗi
ngày). Không có scheduler/cron riêng trong dự án nên chọn vòng lặp in-process (`Task.Delay` tới lần
chạy kế tiếp) thay vì hạ tầng phân tán — đúng quy mô Personal Mode, 1 instance. 1 lần chạy lỗi
(exception) được log lại, không làm crash vòng lặp — lần kế tiếp vẫn chạy đúng giờ.

**Quyết định phạm vi ghi rõ:** `DueSoonDays` (đọc từ Settings sheet ở bản gốc) bị **hard-code = 2**
— backend chưa có bảng Settings nào cả (`apps/desktop`'s trang Settings cũng vẫn là mock tĩnh từ
Phase 19), nên đọc từ 1 store không tồn tại là không thể; nối Settings API thật là phase riêng sau,
không gộp vào đây.

Verify thật, đầy đủ luồng — không chỉ đọc code khớp dòng: `curl` thật qua 7 kịch bản, mỗi kịch bản
tính tay trước rồi so khớp response — overdue+Critical (`63` = `30+25+8+0+0`, risk `50`→`High`,
action `"Overdue - do now"`), due-today+estimate lớn (`"Break down"`), blocked/Waiting
(`"Review blocked task"`), Completed (`0`/`Low`/`"Completed"`), quick win (estimate 10 phút →
`"Quick win"`), dependency chưa xong (`"Waiting for dependency"`), goal-linked (`26` =
`3+8+15+0+0`, verify đúng cộng dồn `GoalAlignment`). `POST /api/smart-engine/recalculate-all` chạy
thật, trả đúng số task đã update. `DailySmartRecalcHostedService`'s `TimeUntilNextRun()` verify
độc lập qua `dotnet-script` — trước 6h/đúng 6h/sau 6h/gần nửa đêm, cả 4 case đều tính đúng thời điểm
chạy kế tiếp. Task age/stalled logic (phụ thuộc thời gian nhiều ngày trôi qua thật) verify bằng đọc
code đối chiếu từng dòng với bản gốc — **không** verify bằng kịch bản thật kéo dài nhiều ngày trong
phiên này, nói rõ giới hạn thay vì nhận đã test full. Dữ liệu test đã xoá sạch, không đụng 2 user có
sẵn trong DB.

## Notifications (Phase 30)

Hoàn toàn mới — grep `apps/google-sheets/src` xác nhận không có logic notif/email/reminder nào cả
(`docs/audit/PHASE_00_AUDIT_REPORT.md` đã ghi sẵn "Notifications — chưa làm" từ Phase 00). Thiết kế
chốt cùng người dùng trước khi code: 4 quy tắc trigger + lưu bảng thật có Read/Unread (không tính
live mỗi lần gọi).

```
GET  /api/notifications                [Authorize]  →  danh sách 100 gần nhất, mới nhất trước
GET  /api/notifications/unread-count   [Authorize]  →  { unreadCount }
POST /api/notifications/{id}/read      [Authorize]  →  đánh dấu 1 cái đã đọc
POST /api/notifications/read-all       [Authorize]  →  đánh dấu tất cả đã đọc
POST /api/notifications/generate       [Authorize]  →  chạy quét thủ công (không cần chờ 30 phút)
```

4 quy tắc (`SmartTask.Application/Notifications/NotificationService.cs`), tất cả đọc field đã có
sẵn, không thêm cột mới ở Task/Habit/Goal: **TaskOverdue**/**TaskDueSoon** (dựa `DueDate` +
`AppDefaults.DueSoonDays`, cùng hằng số Smart Engine Phase 29 đang dùng — tách ra
`SmartTask.Application/Abstractions/AppDefaults.cs` để 2 service không lệch nhau), **HabitStreakAtRisk**
(Habit `Frequency=Daily` + `Streak>0` + `LastCompletedDate != hôm nay`), **GoalAtRisk**
(`Goal.Status=AtRisk`), **SyncFailed** (mỗi item `Outcome=Error` trong `POST /api/sync/push` —
Phase 28 — giờ tạo 1 notification thật, không chỉ nằm trong response JSON).

**Chống spam:** trước khi tạo 1 notification, kiểm tra đã có notification **chưa đọc** cùng
`(Type, EntityId)` chưa (SyncFailed không có `EntityId` nên đối chiếu theo `Title` thay thế) — 1
điều kiện còn đúng qua nhiều lần quét không tạo thêm bản sao; đánh dấu đã đọc rồi mà điều kiện vẫn
còn đúng thì lần quét sau sẽ tạo lại (đúng ý "nhắc lại nếu chưa xử lý").

**Tự động:** `NotificationGenerationHostedService` (`BackgroundService`, `PeriodicTimer` 30 phút,
chạy ngay lúc khởi động rồi lặp) — không có scheduler/cron riêng, đúng tinh thần
`DailySmartRecalcHostedService` (Phase 29). 1 lần chạy lỗi được log, không crash vòng lặp.

Verify thật, đầy đủ luồng — không chỉ build: migration `AddNotifications` áp thật + verify độc lập
qua `sqlcmd`. `curl` thật tạo đủ 4 kịch bản trigger (dùng `sqlcmd` chỉnh trực tiếp `Streak`/
`LastCompletedDate` của 1 habit để mô phỏng "chưa check-in hôm nay" — API không cho phép back-date
qua check-in bình thường) → `POST /api/notifications/generate` tạo đúng 4 notification, message
đúng nội dung mong đợi cho từng loại. Gọi `generate` lần 2 → `createdCount: 0` (dedupe hoạt động
đúng). Mark 1 cái đã đọc → `unreadCount` giảm đúng 1. `read-all` → `unreadCount` về `0`. Push 1
task sync với `ProjectId` sai → `SyncFailed` notification xuất hiện thật với đúng `Title`/`Message`.
Dữ liệu test đã xoá sạch (kể cả notification rows, qua `sqlcmd` — không có endpoint xoá, đúng thiết
kế "lưu lịch sử", không cần cho use case thật).

Frontend: `packages/types`'s `AppNotification` (đặt tên vậy, không phải `Notification`, để không
đụng type `Notification` có sẵn của trình duyệt), `packages/api-client/src/notificationApi.ts`,
`packages/hooks/src/useNotifications.ts` (poll mỗi 60 giây — không có hạ tầng websocket/SSE nào
trong dự án, và notification được sinh nền mỗi 30 phút nên polling là đủ), `packages/ui`'s
`NotificationPanel`/`NotificationItem` (tên khớp `design-tokens.md` đã ghi "NotificationItem" từ
trước, giờ mới có code thật), Topbar's nút chuông (có từ Phase 08, chưa từng làm gì) giờ mở dropdown
panel thật, click 1 notification → mark-read + điều hướng đúng trang (Task/Habit/Goal). Verify:
`npm run typecheck`/`lint`/`format` sạch, production Vite build sạch. **Chưa test UI tương tác thật**
(môi trường phiên này không có công cụ điều khiển trình duyệt) — nói rõ giới hạn, không nhận đã test.

## Cài trên nhiều máy, dùng chung 1 backend (sau Phase 32)

Người dùng hỏi thật: "máy khác thì cài sao?" — trước đó **chưa có hướng dẫn nào cả**. Quyết định
chốt cùng người dùng: **1 backend chạy trên 1 máy, nhiều máy khác chỉ cài Desktop app rồi trỏ tới
backend đó qua mạng LAN** (không phải mỗi máy tự chạy backend + SQL Server riêng).

**Backend (máy chạy `dotnet run`):**

- `Properties/launchSettings.json`'s `http` profile đổi `applicationUrl` từ `http://localhost:5277`
  sang `http://0.0.0.0:5277` — lắng nghe trên mọi network interface, không chỉ loopback. **Chỉ máy
  chạy backend cần đổi** — SQL Server không cần cấu hình gì thêm, vì chỉ có tiến trình
  `SmartTask.Api` trên chính máy đó nói chuyện trực tiếp với SQL Server; các máy Desktop khác chỉ
  gọi HTTP tới `SmartTask.Api`, không bao giờ chạm SQL Server trực tiếp.
- **Windows Firewall cần 1 rule inbound cho cổng 5277** — máy chạy backend phải tự mở, phiên làm
  việc này không có đủ quyền elevation để tự tạo rule (thử `New-NetFirewallRule` cả không và có
  `-Verb RunAs` đều báo "Access is denied" — khác hẳn `msiexec -Verb RunAs` ở Phase 32 chạy được).
  Chạy lệnh sau **với quyền Administrator** trên máy chạy backend, 1 lần duy nhất:
  ```powershell
  New-NetFirewallRule -DisplayName "SmartTask.Api (5277)" -Direction Inbound -Protocol TCP -LocalPort 5277 -Action Allow -Profile Private
  ```
  Cố ý giới hạn `-Profile Private` (mạng nhà/tin cậy), không phải `Public` — không mở cổng ra mạng
  công cộng.
- **Chỉ HTTP, không HTTPS** — đúng cho mạng LAN nhà tin cậy, **không dùng để expose ra Internet
  công cộng** (không có cert, không mã hoá). Nếu sau này cần truy cập từ xa thật (ngoài LAN), cần
  thêm TLS + domain + cert — ngoài phạm vi hiện tại.
- CORS (`tauri://localhost`, Phase 27) **không cần sửa gì** — CORS xác thực Origin của bên gọi
  (luôn là `tauri://localhost` dù backend chạy ở đâu), không phải địa chỉ đích, nên chạy backend
  trên máy khác không ảnh hưởng gì tới CORS.

**Desktop app (mọi máy, kể cả máy chạy backend):** cài `.exe` (NSIS, Phase 32) như bình thường,
không cần build riêng cho mỗi máy. Lần đầu mở app, ở màn hình đăng nhập bấm "Connecting to a shared
server?" → nhập `http://<IP-LAN-của-máy-chạy-backend>:5277` (ví dụ `http://192.168.1.249:5277`) →
đăng nhập bằng tài khoản đã tạo (hoặc tạo tài khoản mới — `[Authorize]` chỉ xác thực "có token hợp
lệ", mọi tài khoản đều thấy chung 1 bộ dữ liệu, xem doc comment `TasksController`). Giá trị URL
này lưu trong `localStorage` của từng máy (`packages/api-client`'s `configureApiClient`, qua
`apps/desktop/src/lib/serverUrl.ts` mới) — chỉ cần nhập 1 lần, nhớ cho lần mở app sau.

Verify thật: bind `0.0.0.0:5277` xác nhận qua `Get-NetTCPConnection -LocalPort 5277 -State Listen`
(`LocalAddress: 0.0.0.0`, không còn `127.0.0.1`), `curl` thật tới địa chỉ LAN thật của máy
(`192.168.1.249`, không phải `localhost`) — `GET /api/health` → `200`, `POST /api/auth/login` → JWT
thật, round-trip đầy đủ qua LAN IP, không chỉ qua loopback. `npm run typecheck`/`lint`/`format`
sạch, production Vite build sạch. **Chưa test thật từ 1 máy vật lý/VM thứ 2** — môi trường phiên
này chỉ có 1 máy, nên chỉ verify được ở mức "server lắng nghe đúng interface + reachable qua chính
địa chỉ LAN của nó", chưa phải kết nối từ máy khác thật. Firewall rule cũng **chưa verify được** vì
không tự tạo được (thiếu quyền) — người dùng cần tự chạy lệnh trên và tự xác nhận từ máy thứ 2.

## Docker

`Dockerfile` (multi-stage: `mcr.microsoft.com/dotnet/sdk:10.0` để build/publish, chuyển sang
`mcr.microsoft.com/dotnet/aspnet:10.0` — runtime nhẹ hơn nhiều, không kéo theo SDK — cho image
cuối) — khớp đúng `net10.0` của mọi `.csproj` trong solution (bản nháp người dùng đưa ban đầu dùng
`dotnet/sdk:8.0`, sai target framework thật của dự án). Build context là `backend/` (khớp layout
5 project ngang hàng qua `SmartTask.slnx`, không phải 1 project phẳng) — `dotnet restore` chỉ cần
gọi trên `SmartTask.Api.csproj`, tự kéo theo restore cả `Application`/`Infrastructure`/
`Persistence`/`Domain` qua `ProjectReference`.

`.dockerignore` loại `bin/`/`obj/`/`.vs/` — thiếu file này, build context nặng **118MB** (kéo theo
build artifact cục bộ đã có sẵn trên máy dev); thêm vào giảm còn **8.2KB** thật, verify lại bằng so
sánh dòng "transferring context" giữa 2 lần build.

`ENV ASPNETCORE_URLS=http://0.0.0.0:5277` + `EXPOSE 5277` — khớp đúng cách backend đã cấu hình lắng
nghe mọi interface từ mục "Cài trên nhiều máy" ở trên, để port map ra ngoài container hoạt động
đúng (không chỉ bind loopback bên trong container, vô dụng khi map port).

**Không có gì baked vào image cả** — `ConnectionStrings__DefaultConnection`/`Jwt__Secret` phải
truyền qua biến môi trường lúc `docker run` (ASP.NET Core tự đọc biến môi trường dạng
`Section__Key`, ghi đè `appsettings.json`), đúng nguyên tắc đã áp dụng từ Phase 22 (JWT secret
không bao giờ nằm trong repo).

Verify thật, không chỉ build image xong là coi như đúng: `docker build` thật thành công (Docker
Desktop cài sẵn trên máy dev, xác nhận qua `docker manifest inspect` cả 2 image tag `dotnet/sdk:10.0`
và `dotnet/aspnet:10.0` đều tồn tại thật trên registry trước khi build). `docker run` thật với biến
môi trường override kết nối SQL Server giả (cố ý sai để verify riêng phần "app tự khởi động đúng"
tách khỏi phần "kết nối DB đúng") → log xác nhận app bind đúng `http://0.0.0.0:5277`, container
`docker ps` hiện `Up`, port map `5278->5277` hoạt động → `curl` thật từ host tới
`http://localhost:5278/api/health` (endpoint không cần DB) → `200` — xác nhận image chạy được thật,
không chỉ build xong không lỗi. Lỗi SQL login (do cố ý dùng credential giả) xuất hiện đúng như dự
kiến, không phải bug. Image + container test đã dọn sạch (`docker rm`/`docker rmi`).

**Chưa test:** `docker run` với connection string SQL Server thật (migration + dữ liệu thật) — môi
trường phiên này không có SQL Server nào chạy trong Docker network cùng container để nối vào; nên
tự thử `docker run` trỏ `ConnectionStrings__DefaultConnection` vào SQL Server thật (kể cả SQL Server
chạy ngay trên host qua `host.docker.internal`) trước khi coi Docker image là dùng được cho triển
khai thật.

## Sự cố thật gặp phải khi dựng skeleton (Phase 20)

Template `webapi` mặc định kéo theo `Microsoft.AspNetCore.OpenApi 10.0.9`, phiên bản này lại kéo
transitively `Microsoft.OpenApi 2.0.0` — bản có lỗ hổng bảo mật mức cao đã công bố
([GHSA-v5pm-xwqc-g5wc](https://github.com/advisories/GHSA-v5pm-xwqc-g5wc)). Đã ghim thẳng
`Microsoft.OpenApi` lên `2.12.2` (bản vá mới nhất **trong cùng nhánh 2.x**, không phải 3.x) —
thử ghim `3.10.2` trước thì build lỗi thật (`IOpenApiMediaType.Example` đổi từ ghi được sang chỉ
đọc giữa 2.x và 3.x, phá vỡ source generator của `Microsoft.AspNetCore.OpenApi 10.0.9`). Đã verify
lại: `dotnet list package --vulnerable --include-transitive` sạch trên cả 5 project sau khi ghim.
