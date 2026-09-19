# backend

ASP.NET Core, Clean Architecture. Chưa có code — khởi tạo ở **Phase 20**.

```
SmartTask.Api/             Controllers / minimal API, auth, DI composition root
SmartTask.Application/     Use cases, DTOs, validation
SmartTask.Domain/          Entities thuần, không phụ thuộc framework
SmartTask.Infrastructure/  EF Core, external services (email, sync...)
SmartTask.Persistence/     DbContext, migrations, repository implementations
```

Database: **SQL Server** (quyết định — xem [`docs/architecture/ARCHITECTURE.md`](../docs/architecture/ARCHITECTURE.md)).
