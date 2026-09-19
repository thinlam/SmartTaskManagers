# Phase 00 — Project Audit Report

Ngày audit: 2026-09-19. Audit thực hiện trên repo trước khi có bất kỳ thay đổi kiến trúc nào
(đọc trực tiếp source `google-sheets/` khi còn ở root và toàn bộ 19 frame Canva Design).

## A. Trạng thái ban đầu (trước Phase 01)

```
SmartTaskManagers/
├── README.md
└── google-sheets/
    ├── .clasp.json
    ├── docs/claude/{README.md, UI_UX_MASTER_PROMPT.md, NEW_MODULE_PROMPT.md, MODULE_PROMPTS.md}
    └── src/
        ├── appsscript.json
        ├── 00_Constants.gs … 14_Projects.gs, 98_AppDialog.gs, Dialog_Error.html
        (~29.250 dòng Apps Script, 15 module file)
```

Không có Excel source, không có `.gitignore`, không có Node/.NET project, không có test/CI.

## B. Đang hoạt động tốt (giữ nguyên)

- Data model đầy đủ: `Tasks` (27 cột), `Projects`, `Goals`, `Habits`, `Settings` (18 key), `Lists`, `ActivityLog`.
- Smart Engine rule-based, trọng số đặt tên rõ trong `SMART_WEIGHTS` (`05_SmartEngine.gs`).
- 6 view hoạt động đầy đủ (Dashboard, Today, Tasks, Kanban, Calendar, Timeline), tất cả chỉ đọc từ
  `Tasks` — không lưu bản sao dữ liệu nghiệp vụ.
- Setup idempotent (`setupSmartTask()`), trigger tự tính lại Smart Score hằng ngày.
- Menu, sidebar (Quick Add / Task Details), dialog lỗi/thành công chuyên nghiệp (không dùng alert mặc định).
- `docs/claude/UI_UX_MASTER_PROMPT.md` đã tự định nghĩa Design System khớp gần như y hệt token Canva
  → Google Sheets đã được xây bám Canva từ đầu.
- Personal Mode đã chốt rõ ràng trong code lẫn docs (không Owner/Member/Team/Department).

## C. Chưa hoàn thiện

- `Reports` — chỉ là placeholder sheet, chưa có `15_Reports.gs`.
- Goals/Habits — có data sheet + header đầy đủ nhưng **chưa có view/CRUD UI riêng**.
- Goal↔Task alignment scoring, Habit streak tracking, Sidebar Settings, Notifications — chưa làm.
- Không có `.gitignore` (đã bổ sung ở Phase 01).

## D. Giữ nguyên tuyệt đối

Toàn bộ `apps/google-sheets/src/*.gs`, `.clasp.json`, `appsscript.json`, `docs/claude/*.md`.
Không rewrite, không refactor trong Phase 00–01.

## E. Cần refactor sau (không phải bây giờ)

Data model Tasks/Projects/Goals/Habits hiện chưa có cột đồng bộ (`Id` dạng UUID, `SyncStatus`,
`LastSyncedAt`, `Version`) — sẽ bổ sung ở **Phase 28 (Sync)**, ghi nhận trước để không thiết kế bí.

## F. Excel

Repo không có source Excel nào tồn tại. Canva Frame 16 ("Excel Implementation Mapping") chỉ là
tài liệu mapping thiết kế → Excel, không phải code.

```
Excel
Status: NOT STARTED / FROZEN BY DEFAULT
```

Giữ `apps/excel/` làm chỗ trống + README, không code cho đến khi Desktop + Backend + Web ổn định.

## G. Rủi ro & quyết định đã xử lý ở Phase 01

| Rủi ro | Xử lý |
|---|---|
| `git mv google-sheets → apps/google-sheets` làm hỏng clasp | `.clasp.json` dùng `rootDir` tương đối, không phụ thuộc vị trí trong repo — đã move nguyên khối, cấu hình không đổi. **Chưa verify được `clasp push` thật** trong sandbox này (không có `clasp` cài + không có clasp credentials) — cần bạn tự chạy `clasp push` sau khi pull branch này để xác nhận trước khi merge. |
| Canva Frame 13 (Members/team) xung đột Personal Mode | **Quyết định (đã hỏi người dùng): bỏ qua hoàn toàn** Frame 13 khỏi roadmap Desktop/Web hiện tại. Giữ lại làm tham khảo nếu sau này mở multi-user. |
| Chọn Database | **Quyết định (đã hỏi người dùng): SQL Server** (không dùng PostgreSQL dù đó là đề xuất mặc định ban đầu — xem lý do trong `docs/architecture/ARCHITECTURE.md`). |

## H. Đề xuất kiến trúc & roadmap

Xem [`docs/architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md) và
[`docs/roadmap/ROADMAP.md`](../roadmap/ROADMAP.md).
