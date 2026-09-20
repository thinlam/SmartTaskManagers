# backend

ASP.NET Core, Clean Architecture. Skeleton dựng ở **Phase 20**: 5 project, tham chiếu đúng chiều
(`Domain ← Application ← Infrastructure/Persistence ← Api`), build sạch, verify bằng 1 vertical
slice thật (`GET /api/health`) — chưa có entity/schema/migration nào (đó là **Phase 21**).

```
SmartTask.Api/             Controllers, DI composition root (Program.cs)
SmartTask.Application/     Use cases, DTOs, abstraction cho Infrastructure implement (ví dụ IDateTimeProvider)
SmartTask.Domain/          Entity thuần — build KHÔNG có package reference nào (verify: dotnet list package)
SmartTask.Infrastructure/  Implement abstraction của Application (SystemDateTimeProvider), external service sau này
SmartTask.Persistence/     AppDbContext (rỗng — chưa có DbSet), EF Core + SQL Server wiring
```

Target framework: **net10.0** (bản .NET mới nhất tại thời điểm cài, khớp tinh thần "dùng bản stable
mới nhất" đã áp dụng cho React 19/Vite 6/Tailwind v4/Tauri 2 ở frontend).

Database: **SQL Server** (quyết định — xem [`docs/architecture/ARCHITECTURE.md`](../docs/architecture/ARCHITECTURE.md)).
Connection string mặc định trong `SmartTask.Api/appsettings.json` trỏ tới LocalDB
(`(localdb)\mssqllocaldb`) — dev trên Windows có sẵn, không cần cài SQL Server riêng. EF Core
**không** kết nối ngay khi đăng ký DI, chỉ khi thật sự dùng `DbContext` — nên app chạy được kể cả
chưa có SQL Server thật, đã verify.

## Chạy thử

```bash
cd backend
dotnet build              # build cả 5 project qua SmartTask.slnx
dotnet run --project SmartTask.Api
curl http://localhost:5299/api/health   # {"status":"Healthy","serverTimeUtc":"..."}
```

`GET /openapi/v1.json` (chỉ bật ở Development) cũng đã verify sinh đúng OpenAPI document.

## Sự cố thật gặp phải khi dựng skeleton

Template `webapi` mặc định kéo theo `Microsoft.AspNetCore.OpenApi 10.0.9`, phiên bản này lại kéo
transitively `Microsoft.OpenApi 2.0.0` — bản có lỗ hổng bảo mật mức cao đã công bố
([GHSA-v5pm-xwqc-g5wc](https://github.com/advisories/GHSA-v5pm-xwqc-g5wc)). Đã ghim thẳng
`Microsoft.OpenApi` lên `2.12.2` (bản vá mới nhất **trong cùng nhánh 2.x**, không phải 3.x) —
thử ghim `3.10.2` trước thì build lỗi thật (`IOpenApiMediaType.Example` đổi từ ghi được sang chỉ
đọc giữa 2.x và 3.x, phá vỡ source generator của `Microsoft.AspNetCore.OpenApi 10.0.9`). Đã verify
lại: `dotnet list package --vulnerable --include-transitive` sạch trên cả 5 project sau khi ghim.
