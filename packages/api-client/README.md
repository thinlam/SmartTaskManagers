# packages/api-client

`httpClient` (fetch wrapper), `authApi`/`taskApi`/`projectApi`/`goalApi`/`habitApi`/
`notificationApi` — real code since **Phase 27** (Desktop ↔ Backend integration), calling
`SmartTask.Api` (Phases 20–30). Each `*Api.ts` maps its backend `*Dto` shape to `@stm/types`'
frontend entity shape, including the enum mapping fixes documented in `enumMappings.ts` (Area/
TaskStatus/GoalStatus values that contain spaces on the frontend but can't in a C# enum member
name).

This package is deliberately framework-agnostic — it never reads `import.meta.env` itself (that's
a Vite-ism `apps/desktop` has, this package doesn't assume any bundler). The caller configures the
base URL once via `configureApiClient({ baseUrl })` before making any request; `httpClient.ts` has
**no hard-coded default** — calling any `httpClient.*` method before `configureApiClient()` throws
a clear `ApiError` instead of silently targeting `localhost` (a real bug found and fixed after
deploying the backend to Railway — a production Desktop build kept defaulting to
`localhost:5277`). `apps/desktop`'s `src/config/api.ts`/`src/lib/serverUrl.ts` are what actually
call `configureApiClient()` — see `apps/desktop/README.md`'s "API base URL (env-based, không
hard-code)" section for the full `VITE_API_BASE_URL`/`.env.development`/`.env.production` setup.
