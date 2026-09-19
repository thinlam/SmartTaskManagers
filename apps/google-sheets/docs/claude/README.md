# Claude Design Docs

Thư mục này lưu **prompt và quy chuẩn UI/UX dành cho Claude** khi phát triển Smart Task Manager.

## Files

### `UI_UX_MASTER_PROMPT.md`

Quy chuẩn chung cho toàn project:

- Design System
- semantic colors
- page layout
- typography
- cards
- KPI
- data integrity
- Google Sheets safety rules
- source of truth
- code quality
- review checklist

Claude nên đọc file này **trước khi sửa bất kỳ UI module nào**.

### `MODULE_PROMPTS.md`

Các prompt ngắn cho từng màn:

- Dashboard
- Today
- Tasks
- Task Details
- Quick Add
- Kanban
- Calendar
- Timeline
- Projects
- Reports

---

## Cách dùng với Claude Code

Ví dụ muốn sửa Projects:

```text
Đọc docs/claude/UI_UX_MASTER_PROMPT.md trước.

Sau đó đọc mục Projects trong docs/claude/MODULE_PROMPTS.md.

Review source hiện tại của 14_Projects.gs và các dependencies liên quan.
Giữ business logic đúng, refactor UI và ghi FULL CODE.
```

Ví dụ muốn sửa Timeline:

```text
Đọc docs/claude/UI_UX_MASTER_PROMPT.md trước.

Sau đó dùng prompt Timeline trong docs/claude/MODULE_PROMPTS.md.

Review 13_Timeline.gs rồi refactor theo Design System chung.
Ghi FULL CODE.
```

---

## Cách dùng trong Claude Chat

Nếu Claude Chat không có quyền truy cập repository:

1. upload `UI_UX_MASTER_PROMPT.md`
2. upload file source cần sửa
3. gửi prompt module tương ứng trong `MODULE_PROMPTS.md`

---

## Nguyên tắc

Không copy lại toàn bộ master prompt mỗi lần.

Chỉ cần:

```text
Đọc docs/claude/UI_UX_MASTER_PROMPT.md trước.
Sau đó sửa [MODULE] theo prompt tương ứng trong MODULE_PROMPTS.md.
```

Như vậy các màn sẽ giữ cùng một Design System lâu dài.
