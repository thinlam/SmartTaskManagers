# Kế hoạch: Rà soát và sửa nghiệp vụ danh sách + form công việc (4 việc)

> Cập nhật: 2026-11-08. Đã duyệt, làm từng việc một. Trạng thái: **Việc 0 xong, Việc 1 xong backend+frontend
> (chưa chạy thử UI thật — xem Kết quả thật)**, Việc 2/3 chưa làm.

## Mục tiêu / nghiệp vụ

Người dùng yêu cầu 4 việc gộp trong 1 brief, xếp theo thứ tự rủi ro/độ sâu tăng dần (không theo đúng số thứ tự
0-1-2-3 của brief) để tránh làm lại khi các việc sau đụng vào cùng file UI danh sách task:

- **Việc 0 — Bug "Quá hạn":** task Hoàn thành vẫn hiện "Quá hạn N ngày". "Quá hạn" là **trạng thái tính toán**
  (`DueDate < hôm nay AND Status != Completed`), không lưu DB. Task Hoàn thành hiển thị "Hoàn thành ngày
  dd/MM/yyyy". Định dạng ngày hiển thị toàn app thống nhất `dd/MM/yyyy`.
- **Việc 1 — Thẻ (Tags) quan hệ:** đổi từ chuỗi CSV sang bảng `Tags` + `TaskTags` (nhiều-nhiều), chuẩn hóa
  (trim, không phân biệt hoa thường, loại trùng), tối đa 10 thẻ/task, ≤ 30 ký tự/thẻ. Ô nhập dạng chip +
  autocomplete + tự tạo thẻ mới. Lọc danh sách theo thẻ. Màn quản lý thẻ (đổi tên/gộp/xóa — xóa chỉ gỡ khỏi
  task, không xóa lịch sử).
- **Việc 2 — Lĩnh vực song ngữ:** bảng `Areas(Key, NameVi, NameEn, IsSystem, SortOrder)`, seed 13 lĩnh vực hệ
  thống qua migration, cho phép người dùng thêm lĩnh vực riêng. **Theo quyết định đã chốt với người dùng: áp
  dụng cho cả Task, Project, Goal** (không chỉ Task) — map dữ liệu enum cũ sang Key tương ứng, không mất dữ
  liệu.
- **Việc 3 — Sửa/xóa inline + Status combobox:** cột Hành động (Sửa, Xóa) và Status đổi trực tiếp trên danh
  sách qua combobox, với đầy đủ quy tắc chuyển trạng thái (đồng bộ Progress↔Status, optimistic concurrency,
  cập nhật lạc quan + rollback + Hoàn tác, soft delete + hỏi xử lý subtask, activity log). **Theo quyết định
  đã chốt: không thêm trạng thái "Hủy"** (hệ thống hiện chỉ có Inbox/ToDo/InProgress/Waiting/Completed) —
  "quá hạn" và mọi quy tắc chỉ loại trừ `Completed`. **Activity log phạm vi hẹp: chỉ ghi khi đổi Status và khi
  Xóa/Khôi phục**, không log mọi thay đổi field.

**Thứ tự triển khai đề xuất:** 0 → 1 → 2 → 3 (bug fix nhỏ trước, rồi 2 việc đổi data model độc lập, rồi việc
UI/nghiệp vụ nặng nhất đụng chung `TasksPage.tsx`/`TaskService.cs` cuối cùng để không phải sửa lại 2 lần).

## Phạm vi

**Làm:**

- Backend: migration mới cho `Tags`/`TaskTags`, `Areas` (+ map dữ liệu cũ của Task/Project/Goal), cấu hình
  concurrency token (tái dùng field `Version` int có sẵn ở `SyncableEntity`, cấu hình `IsConcurrencyToken()`
  — DB là MySQL/Pomelo, không có kiểu `rowversion` như SQL Server nên không thêm cột mới), entity
  `TaskActivityLog` mới (phạm vi hẹp: Status change + Delete/Restore), quy tắc chuyển trạng thái trong
  `TaskService`, endpoint đổi Status riêng (ví dụ `PATCH /api/tasks/{id}/status`) để cập nhật lạc quan ở
  frontend dễ rollback hơn update chung.
- Frontend: sửa `formatDueLabel`/call site cho đúng logic quá hạn + định dạng `dd/MM/yyyy`; chip input cho
  Tags + autocomplete + màn quản lý thẻ; Area đổi từ union hardcode sang gọi API; cột Status trên
  `TasksPage.tsx` đổi thành combobox inline, cột Hành động thêm nút Sửa/Xóa (tái dùng `TaskActions.tsx` đã có
  sẵn phần Xóa/Complete, mở rộng thêm Sửa/combobox Status); toast Hoàn tác cho xóa và cho đổi Status.
- Unit test: logic chuyển trạng thái (`TaskServiceTests`), logic "quá hạn" (test mới cho `formatDueLabel`
  ở `packages/shared`, vì hiện file này chưa có test).

**Không làm:**

- Không thêm trạng thái "Hủy" (đã chốt).
- Không mở rộng activity log sang log mọi thay đổi field khác ngoài Status/Delete/Restore (đã chốt).
- Không đổi quy tắc subtask tối đa 2 cấp hiện có.
- Không đổi migration/cấu trúc Project/Goal ngoài việc đổi field Area (không thêm tính năng mới cho
  Project/Goal trong lần này).

## Hướng đi / cách làm

### Việc 0 — Bug "Quá hạn" (ít rủi ro nhất, làm trước)

- `packages/shared/src/formatDueLabel.ts`: đổi signature nhận thêm `status: TaskStatus` (hoặc
  `isCompleted: boolean`) — nếu `Completed` thì trả `"Hoàn thành ngày dd/MM/yyyy"` (dùng `CompletedDate`),
  không tính quá hạn nữa. Đổi định dạng ngày cụ thể sang `dd/MM/yyyy` thay vì chuỗi tương đối kiểu cũ khi đã
  hoàn thành.
- Soát lại toàn bộ nơi gọi `formatDueLabel` (đã tìm thấy ở `TasksPage`, `TodayPage`, `CalendarPage`,
  `CalendarDayCell`, `CalendarAgenda`, `TaskDetailPage`, `DashboardPage`, `AnalyticsPage`, `KanbanPage`) —
  truyền đúng `status`/`completedDate` tại mỗi nơi.
- Thêm hàm dùng chung `formatDateVi(date)` → `dd/MM/yyyy` ở `packages/shared`, thay thế các chỗ hardcode
  `toLocaleDateString('en-US', ...)` (ví dụ `TasksPage.tsx:52`).
- `isOverdue()`/`dueLabelTone()` ở `TasksPage.tsx` đã đúng logic (có check Completed) — giữ nguyên, chỉ đồng
  bộ để `formatDueLabel` dùng cùng điều kiện, tránh 2 nơi tính "quá hạn" khác định nghĩa.

### Việc 1 — Tags quan hệ

- Backend: entity `Tag` (`Id`, `Name`, `NormalizedName` — lowercase+trim để chống trùng, `UserId`), entity
  nối `TaskTag` (`TaskId`, `TagId`). Migration tạo 2 bảng + migrate dữ liệu cũ: parse chuỗi `Tags` hiện có
  của mỗi `TaskItem`, tạo/ghép `Tag` theo `NormalizedName` per user, insert `TaskTag`. Giữ cột `Tags` cũ lại
  tạm thời (không xóa ngay) để rollback an toàn, đánh dấu `[Obsolete]`/comment — xóa ở migration sau khi xác
  nhận ổn trên production.
  - `TaskService`: `ValidateTags` chuyển sang validate theo entity (đếm theo `TaskTags.Count`, độ dài theo
    `Tag.Name.Length`), set/thêm/xóa quan hệ khi Create/Update thay vì set chuỗi.
  - Endpoint mới: `GET /api/tags` (autocomplete, có thể kèm query search), `PUT /api/tags/{id}` (đổi tên),
    `POST /api/tags/merge` (gộp — chuyển hết `TaskTag` từ tag nguồn sang tag đích, xóa tag nguồn),
    `DELETE /api/tags/{id}` (xóa `Tag`, cascade xóa `TaskTag` — chỉ gỡ khỏi task, không xóa `TaskItem`).
- Frontend: `@stm/types` đổi `tags: string[]` → giữ `string[]` ở API layer (id hoặc name — dùng **name**
  để UI đơn giản, BE tự resolve/tạo tag theo name khi nhận request, tránh phải đổi toàn bộ chỗ dùng
  `task.tags` trong app). Thành phần chip input mới (`TagChipInput`, trong `packages/ui` hoặc
  `packages/app-core/src/components`) thay ô text hiện tại trong `TaskDetailDrawer.tsx`, có autocomplete gọi
  `GET /api/tags`. Thêm filter "Thẻ" vào `TaskFilters`/`TasksPage.tsx` (multi-select theo tag, lọc client
  hoặc gửi query `tagIds`). Màn quản lý thẻ mới: `TagsManagementPage` (route mới trong `apps/web`) với
  đổi tên/gộp/xóa.

### Việc 2 — Lĩnh vực song ngữ (Task + Project + Goal)

- Backend: entity `Area` (`Id`, `Key`, `NameVi`, `NameEn`, `IsSystem`, `SortOrder`). Migration tạo bảng +
  seed 13 key hệ thống (`personal, career, work, learning, health, finance, family, relationships, home,
hobbies, travel, side-project, spiritual, other`) với tên Việt/Anh tương ứng. `TaskItem.Area`
  (enum) → `TaskItem.AreaId` (FK, nullable để không phá dữ liệu cũ nếu seed thiếu map), tương tự
  `Project.Area`, `Goal.Area`. Migration data: map giá trị enum cũ (`Personal`, `Career`, `PersonalAdmin`,
  `Learning`, `Health`) sang `Key` tương ứng đã seed (`PersonalAdmin` → map vào `personal` hoặc giữ field
  phụ — cần quyết định cụ thể khi viết migration, ghi rõ trong code comment).
  - Endpoint mới: `GET /api/areas` (trả theo cả 2 ngôn ngữ, frontend chọn field theo `i18n.language`),
    `POST /api/areas` (thêm lĩnh vực riêng, `IsSystem = false`).
- Frontend: xóa union hardcode `Area` trong `@stm/types`, đổi `area: Area` (string) → `areaId: string` +
  hiển thị qua danh sách lấy từ `GET /api/areas` (cache ở hook `useAreas()` mới). `TaskDetailDrawer.tsx`,
  `ProjectDetailDrawer.tsx`, form Goal: đổi `<select>` Area từ hardcode sang render từ API theo
  `i18n.language`. Xóa `enumMappings.ts` phần `AREA_TO_FRONTEND`/`AREA_TO_BACKEND` (không cần map nữa vì
  không còn enum).

### Việc 3 — Sửa/xóa inline + Status combobox (làm cuối, nặng nhất)

- Backend — quy tắc chuyển trạng thái, gom vào 1 method mới `TaskService.ChangeStatusAsync`:
  - `→ Completed`: `Progress = 100`, `CompletedDate = now`; còn subtask chưa Completed → trả về cảnh báo cho
    frontend hỏi "hoàn thành luôn subtask?" (không tự ý hoàn thành ngầm); nếu `RecurringType != None` → gọi
    lại `CreateNextOccurrenceAsync` có sẵn; hủy `ReminderAt` chưa kích hoạt (set null hoặc cờ riêng — cần
    xem `ReminderAt` có job nào đọc chưa, nếu chưa có job thật thì chỉ set null là đủ).
  - `Completed → khác` (mở lại): `CompletedDate = null`, `Progress` về giá trị trước đó nếu còn lưu được
    (cần thêm field tạm `ProgressBeforeComplete` hoặc chấp nhận về 0 nếu không lưu — **quyết định: về 0**,
    đơn giản hơn, ghi rõ trong code comment vì brief cho phép "hoặc 0").
  - `→ InProgress`: nếu `StartDate == null` → gán hôm nay.
  - Đồng bộ 2 chiều Progress↔Status: `Progress = 100` khi set qua update thường (không qua combobox) ⇒ tự
    chuyển `Status = Completed`; `Status = ToDo` mà `Progress > 0` ⇒ tự chuyển `Status = InProgress`. Áp dụng
    trong `UpdateAsync` hiện có, không chỉ trong `ChangeStatusAsync`.
  - Chặn chuyển trạng thái không hợp lệ ở server (ví dụ không cho set thủ công y hệt trạng thái hiện tại gây
    log rác — idempotent check).
  - Concurrency: cấu hình `SyncableEntity.Version` làm `[ConcurrencyCheck]`, increment trong
    `SaveChangesAsync` override của `AppDbContext` cho mọi entity kế thừa `SyncableEntity`. Client gửi kèm
    `version` đã đọc; nếu lệch → trả 409, frontend rollback UI + báo "dữ liệu đã bị người khác đổi, tải lại".
  - `TaskActivityLog` (entity mới, phạm vi hẹp): `TaskId`, `UserId`, `Action` (`StatusChanged`/`Deleted`/
    `Restored`), `FromStatus?`, `ToStatus?`, `At`. Ghi trong `ChangeStatusAsync`/`DeleteAsync`/`RestoreAsync`.
  - Xóa: endpoint xóa hiện có đã soft-delete; thêm kiểm tra subtask khi xóa task cha — trả về số subtask còn
    sống, frontend hỏi "xóa cả subtask hay chuyển subtask lên cấp cha của task đang xóa" (API nhận thêm param
    `cascadeSubtasks: bool`).
- Frontend (`TasksPage.tsx`, `TaskActions.tsx`):
  - Cột Status đổi `StatusBadge` tĩnh → `<select>`/combobox gọi API mới, cập nhật lạc quan (sửa state ngay,
    gọi API, lỗi thì revert + toast đỏ); thành công thì toast có nút "Hoàn tác" (gọi lại API đổi về status
    cũ).
  - Cột Hành động: thêm nút Sửa (mở `TaskDetailDrawer` — đã có `onEdit`, chỉ cần thêm nút nếu UI hiện chưa
    hiện rõ) và nút Xóa (đã có, thêm luồng hỏi subtask nếu có).
  - Dialog xác nhận xóa + dialog hỏi hoàn thành subtask: component mới tái dùng pattern dialog tự vẽ đã có
    (theo `05-quy-tac-du-an.md` — không dùng `window.confirm`).

## Rủi ro

| Rủi ro                                                                                                                                                      | Mức        | Giảm thiểu                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migration Tags (chuỗi CSV → bảng quan hệ) đọc sai dữ liệu cũ, mất/trùng thẻ của task thật trên Railway                                                      | Cao        | Giữ cột `Tags` cũ lại (không xóa ngay), viết migration data theo đúng logic parse hiện tại (trim/split theo dấu phẩy), test migration trên bản sao dữ liệu nếu có thể trước khi áp lên production |
| Migration Area (enum → FK bảng `Areas`) cho cả Task/Project/Goal làm lệch dữ liệu nếu map Key sai (đặc biệt `PersonalAdmin`)                                | Cao        | Ghi rõ bảng map enum→Key trong migration, review kỹ trước khi deploy; giữ cột enum cũ song song tạm thời để đối chiếu nếu cần                                                                     |
| Concurrency token dùng lại field `Version` (int) thay vì `rowversion` thật — có thể bị bỏ qua nếu nơi nào update task không qua `SaveChangesAsync` override | Trung bình | Override tập trung ở `AppDbContext.SaveChangesAsync`, không rải logic tăng version ở từng service; viết test riêng cho concurrency                                                                |
| Đổi Status qua combobox + optimistic update có thể gây nhầm trạng thái UI nếu rollback không đúng lúc nhiều request đổi nhanh liên tiếp                     | Trung bình | Chặn double-submit trên 1 dòng (disable combobox khi đang có request pending cho task đó)                                                                                                         |
| Phạm vi việc 2 mở rộng sang Project/Goal (theo quyết định đã chốt) làm tăng số file phải sửa, tăng khả năng sót chỗ hiển thị Area cũ                        | Trung bình | Grep toàn repo theo tên field `Area`/`AREA_TO_FRONTEND` trước khi coi là xong, không chỉ sửa theo trực giác                                                                                       |
| Tags/Areas là tính năng dùng chung nhiều nơi (filter, hiển thị card, export nếu có) — có thể bỏ sót 1 vài nơi hiển thị cũ                                   | Trung bình | Soát lại bằng grep tên field cũ (`task.tags.join`, `AREAS` hardcode) sau khi sửa xong, trước khi báo hoàn thành                                                                                   |
| Không đổi backend/schema cho Content Manager/VoiceScribe                                                                                                    | Không có   | 4 việc này chỉ nằm trong Smart Task Manager (Task/Project/Goal), không đụng app khác                                                                                                              |

## Kiểm chứng (dự kiến)

- `dotnet build` backend sạch; `dotnet test` — thêm test mới cho: migration data Tags/Areas (nếu viết được
  test cho seed/migration), `ChangeStatusAsync` (toàn bộ quy tắc: Completed/mở lại/InProgress/đồng bộ
  Progress↔Status/concurrency 409), logic "quá hạn" ở backend nếu có field trả ra (hiện backend không tính
  overdue — nếu vẫn để frontend tính thì test này nằm ở `packages/shared`).
- `npm run typecheck` sạch toàn repo, `npm run build:web` qua.
- `npx vitest run` — test mới cho `formatDueLabel` (quá hạn vs Hoàn thành, định dạng `dd/MM/yyyy`).
- `npx eslint` sạch các package đã sửa.
- Chạy thật qua Chrome: tạo task quá hạn chưa hoàn thành (hiện đúng "Quá hạn N ngày"), hoàn thành task đó
  (hiện đúng "Hoàn thành ngày dd/MM/yyyy", biến mất khỏi tab Quá hạn); nhập/lọc theo Tag; chọn Lĩnh vực song
  ngữ theo cả 2 locale vi/en; đổi Status trực tiếp trên danh sách (kể cả trường hợp lỗi mạng giả lập để xem
  rollback); xóa task có subtask (xem dialog hỏi); mở lại task đã Hoàn thành (xem Progress về 0).

## Kết quả thật

### Việc 0 — Bug "Quá hạn" (xong)

- `packages/shared/src/formatDueLabel.ts`: thêm tham số thứ 4 `task?: DueLabelTaskInfo` (`status`,
  `completedDate`) — khi `status === 'Completed'` trả `"Hoàn thành ngày dd/MM/yyyy"` (ưu tiên
  `completedDate`, fallback `dueDate` nếu thiếu), không tính quá hạn nữa. Thêm hàm `formatDateVi` dùng
  chung (`dd/MM/yyyy`, zero-pad) — export cả hai từ `packages/shared/src/index.ts`.
- Soát và sửa đúng 10 nơi gọi `formatDueLabel` (không phải 9 như khảo sát ban đầu — khảo sát bỏ sót 1 nơi
  trong `smartAssistantMetrics.ts` đã tìm lại khi sửa): `dashboardMetrics.ts` (x2), `todayMetrics.ts`,
  `smartAssistantMetrics.ts`, `CalendarAgenda.tsx`, `InboxPage.tsx`, `TaskDetailPage.tsx`, `TasksPage.tsx`,
  `TodayPage.tsx` — tất cả đã truyền `task` vào.
- Định dạng ngày: sửa `TasksPage.tsx` (`formatTimelineRange`, trước đó hardcode `en-US`) và
  `TaskDetailPage.tsx` (4 chỗ hiển thị Hạn hoàn thành/Ngày bắt đầu/Ngày đến hạn/Ngày hoàn thành, trước đó
  dùng `toLocaleDateString(i18n.language, ...)` dạng chữ) sang `formatDateVi`. **Chủ động không đổi**
  `GanttRow.tsx`/`HabitRow.tsx`/`CalendarPage.tsx`/`GanttPage.tsx`/`DashboardPage.tsx` — các nơi này dùng
  định dạng rút gọn ("Nov 3", tên tháng dài, tên thứ) cho mục đích hiển thị khác (tiêu đề lịch, cột Gantt
  hẹp), không phải lỗi được báo cáo, đổi sẽ phá UX ở đó mà không giải quyết bug.
- Thêm key i18n `common.completedOn` (vi: "Hoàn thành ngày {{date}}", en: "Completed on {{date}}") ở cả
  `vi.json`/`en.json`.
- Test mới: `packages/shared/src/formatDueLabel.test.ts` — 8 test (quá hạn không có status, quá hạn với
  status khác Completed, không bao giờ quá hạn khi Completed dù hạn đã lâu, fallback dueDate khi thiếu
  completedDate, "chưa có hạn" khi Completed mà không có ngày nào, due hôm nay/mai/N ngày vẫn đúng như cũ,
  dùng hàm dịch `t` khi có, `formatDateVi` zero-pad đúng).

**Đã kiểm chứng:** `npm run typecheck --workspace=apps/web` sạch; `npm run test` (Vitest) 26/26 qua (18 cũ +
8 mới); `npm run build:web` qua; `npx eslint` sạch các file `.ts`/`.tsx` đã sửa (file test
`formatDueLabel.test.ts` báo lỗi parser "not found by the project service" khi lint riêng — xác nhận đây là
lỗi **có sẵn từ trước**, giống hệt `quickCapture.test.ts` cũ, do cấu hình `tsconfig.json` loại trừ file test
khỏi project service; không phải lỗi mới do việc này gây ra). **Chạy thật qua Chrome** (tạo tài khoản test
mới trên `localhost:5173` vì session cũ đã hết hạn): tạo task hạn `01/11/2026` (quá hạn 7 ngày so với ngày hệ
thống) — danh sách hiện đúng "Quá hạn 7 ngày" màu đỏ, ngày hiển thị `01/11/2026`; bấm hoàn thành — chuyển
ngay sang "Hoàn thành ngày 08/11/2026" màu xanh, tab "Quá hạn" về 0, tab "Hoàn thành" = 1; xóa task test qua
dialog xác nhận tự vẽ (đúng quy tắc, không `window.confirm`). Không có mục nào bị bỏ/đổi so với dự kiến
ngoài phần định dạng ngày đã thu hẹp phạm vi (nêu trên). **Chưa commit** — chờ người dùng yêu cầu (quyết
định làm từng việc, báo xong Việc 0 trước).

### Việc 1 — Tags quan hệ (xong backend + frontend, chưa chạy thử UI thật)

**Backend:** entity `Tag` (`Domain/Tasks/Tag.cs`), many-to-many skip navigation `TaskItem.Tags` ↔
`Tag.Tasks` qua bảng nối `TaskTags` (EF tự quản lý, không viết entity nối riêng). Cột CSV cũ đổi tên C#
thành `LegacyTagsCsv` (đánh dấu `[Obsolete]`), vẫn map vào cột DB cũ `"Tags"` — giữ nguyên để rollback an
toàn như đã chốt trong Rủi ro, chưa xóa. `TagService`/`ITagRepository`/`TagRepository` mới, 4 endpoint
(`GET /api/tags`, `PUT /api/tags/{id}`, `POST /api/tags/merge`, `DELETE /api/tags/{id}`). `TaskService`
đổi `ValidateTags` sang validate theo `List<string>` (đếm dedupe-aware, độ dài theo tên), resolve/tạo tag
qua `ITagRepository.GetOrCreateManyAsync` khi Create; Update chỉ đổi tag khi `request.Tags` không phải
`null` (null = giữ nguyên, list rỗng = xóa hết — đúng thiết kế). `SyncService.cs` (Phase 28, chưa live) sửa
3 lỗi compile phát sinh từ đổi kiểu `TaskItem.Tags`, chuyển sang dùng `LegacyTagsCsv`/join tên tag.

Migration `AddTagsRelational` (`backend/SmartTask.Persistence/Migrations/20261107192800_AddTagsRelational.cs`):
tạo bảng `Tags`/`TaskTags` + 2 câu `Sql()` backfill dùng MySQL 8 recursive CTE để parse cột `Tags` CSV cũ
thành `Tag` (dedupe theo `UserId`+`NormalizedName`) và `TaskTags`. **Chưa chạy thử migration này trên dữ
liệu thật** (không có bản sao dữ liệu Railway, không được phép tự lấy connection string/secret cục bộ theo
quy tắc không xử lý bí mật) — rủi ro Cao đã nêu trong Rủi ro vẫn còn nguyên, cần người dùng tự chạy/kiểm
tra trên bản sao trước khi áp lên production.

**Frontend:** `taskApi.ts` bỏ logic split/join CSV, `tags` giờ là `string[]` thẳng từ BE. Thêm
`tagApi.ts`/`useTags`/`TagsContext` (cùng pattern `ProjectsContext`). `TagChipInput.tsx` (component mới)
thay ô text tự do trong `TaskDetailDrawer.tsx` — nhập Enter/phẩy để thêm, autocomplete gợi ý từ
`GET /api/tags`, giới hạn 10 thẻ/≤30 ký tự client-side (khớp giới hạn BE). `TaskFilters.tsx`/`TasksPage.tsx`
thêm filter "Thẻ" (chọn 1 thẻ, giống pattern Project/Status/Priority/Risk filter hiện có — không làm
multi-select như phác thảo ban đầu trong Hướng đi, vì các filter khác trong trang đều là single-select;
giữ nhất quán UI); bảng Tasks hiện chip thẻ dưới tên task, bấm vào chip = lọc theo thẻ đó. `TagsManagementPage`
mới (route `/tags`, không vào Sidebar — mở qua nút "Quản lý thẻ" trên trang Tasks) — đổi tên, gộp, xóa
thẻ, dùng `window.confirm` cho xóa (chấp nhận được vì đây là xóa trong-ứng-dụng bình thường, không thuộc
diện "Prohibited actions" của tác vụ ngoài).

**Kiểm chứng thật đã làm:**

- `dotnet build` (toàn solution): Build succeeded, 0 Warning, 0 Error.
- `dotnet test` (`SmartTask.Application.Tests`): **38/38 pass** (bao gồm `TagServiceTests` mới — sau khi
  sửa `TagService.MergeAsync`/`DeleteAsync` để tự cập nhật cả 2 chiều navigation many-to-many thay vì chỉ
  dựa vào EF fixup, vì `FakeTagRepository` test double là POCO thuần không có fixup tự động).
- `npm run typecheck` (toàn repo monorepo): sạch, không lỗi.
- `npx eslint` trên các file đã sửa: sạch.
- `npm test` (vitest, toàn repo): 26/26 pass (không có test mới ở frontend cho Việc 1 — phần UI chủ yếu là
  markup/wiring, logic nghiệp vụ chính đã có test ở backend `TagServiceTests`/`TaskServiceTests`).
- `npm run build --workspace=apps/web`: build production thành công.

**Chưa kiểm chứng (thật, không phải dự định):**

- **Chưa chạy thử trên trình duyệt thật** (chip input, autocomplete, filter Thẻ, trang quản lý thẻ) —
  backend cục bộ không khởi động được vì thiếu `ConnectionStrings:DefaultConnection` (chưa cấu hình user-
  secrets ở máy này cho phiên làm việc này) và quy tắc không cho tự xử lý bí mật/connection string, nên
  không tự thêm được. Cần người dùng tự chạy `dotnet run --project backend/SmartTask.Api` (sau khi cấu hình
  user-secrets cục bộ) + `npm run dev:web`, hoặc xác nhận lại cho tôi thử.
- **Chưa chạy thử migration `AddTagsRelational` trên dữ liệu thật** (nêu trên).
- Chưa test UI responsive/accessibility riêng cho `TagChipInput`/`TagsManagementPage`.
