# Design Tokens — trích xuất từ Canva

Nguồn: [Canva — Smart Task Manager Design System](https://www.canva.com/design/DAHVMpQT8lU/LGRSvF-3CM36hOsQTm3mzg/edit)
(Frame 01 — Design System, Frame 02 — Component Library, Frame 18 — UI/UX Design Spec, đọc trực
tiếp qua Canva MCP ngày 2026-09-19, 19 frame tổng cộng).

Đối chiếu với `apps/google-sheets/docs/claude/UI_UX_MASTER_PROMPT.md` (bản Google Sheets đã tinh
chỉnh sau Canva và đang chạy production) — hai nguồn lệch nhẹ vài giá trị text color; **bản
`UI_UX_MASTER_PROMPT.md` được coi là bản chốt cuối** (superset, không mâu thuẫn hướng thiết kế
Canva) cho `packages/ui/tokens/colors.ts` ở Phase 04.

## Color tokens

| Token               | Hex                          | Dùng cho                          |
| ------------------- | ---------------------------- | --------------------------------- |
| `primary`           | `#4F46E5`                    | Nút chính, active state, link     |
| `primary-hover`     | `#4338CA`                    | Hover                             |
| `primary-light`     | `#EEF2FF`                    | Nền nhấn nhẹ, active sidebar item |
| `success`           | `#16A34A`                    | Completed, Healthy, Low risk      |
| `success-soft`      | `#ECFDF5`                    | Nền badge success                 |
| `warning`           | `#D97706` (Canva: `#F59E0B`) | On Hold, Attention, High priority |
| `warning-soft`      | `#FFF7ED`                    | Nền badge warning                 |
| `danger`            | `#DC2626`                    | Blocked, Critical, Overdue        |
| `danger-soft`       | `#FEF2F2`                    | Nền badge danger                  |
| `info`              | `#2563EB`                    | In Progress                       |
| `info-soft`         | `#EFF6FF`                    | Nền badge info                    |
| `background`        | `#F8FAFC`                    | App background                    |
| `surface`           | `#FFFFFF`                    | Card/panel nền                    |
| `surface-secondary` | `#F1F5F9`                    | Nền phụ, table header             |
| `text-primary`      | `#0F172A`                    | Chữ chính (Canva gốc: `#1E293B`)  |
| `text-secondary`    | `#475569`                    | Chữ phụ (Canva gốc: `#64748B`)    |
| `text-muted`        | `#94A3B8`                    | Timestamp, caption                |
| `border`            | `#E2E8F0`                    | Viền card/input                   |
| `border-strong`     | `#CBD5E1`                    | Viền nhấn                         |
| `dark-header`       | `#172033`                    | Header tối (nếu dùng)             |

## Semantic — Status

Frame 02 originally showed 8 team statuses (Not Started/To Do/In Progress/Review/Blocked/On
Hold/Completed/Cancelled). Personal Mode's real Status enum
(`apps/google-sheets/src/00_Constants.gs` → `LOOKUP_LISTS.Status`, matching `TaskStatus` in
`packages/types`) only has 5 — **Inbox / To Do / In Progress / Waiting / Completed** — discovered
and corrected while building Phase 12 (Tasks). `Inbox` and `Waiting` reuse Frame 01's hex for the
closest team equivalent (Not Started → gray-blue `#94A3B8`; On Hold → amber `#F59E0B`):

Inbox — gray-blue (`#94A3B8`) · To Do — slate (`#64748B`) · In Progress — indigo (`#2563EB`)
· Waiting — amber (`#F59E0B`) · Completed — green (`#16A34A`).

## Semantic — Priority (5)

Critical (`#DC2626`) · Urgent (`#EA580C`) · High (`#F59E0B`) · Medium (`#2563EB`) · Low (`#64748B`).

## Semantic — Risk / Project Health (thang chung 4 mức)

Low / Healthy (`#16A34A`) · Medium / Attention (`#F59E0B`) · High / At Risk (`#EA580C`)
· Critical (`#DC2626`).

## Typography (Inter)

| Level            | Size / Weight            |
| ---------------- | ------------------------ |
| Page Title       | 28px Bold                |
| Section Title    | 18px SemiBold            |
| Card Value (KPI) | 32px Bold                |
| Card Label       | 12px Medium, UPPERCASE   |
| Body             | 14px Regular             |
| Small / Caption  | 12px Regular, muted      |
| Table Header     | 12px SemiBold, UPPERCASE |
| Badge Text       | 11px SemiBold, UPPERCASE |

## Spacing scale

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40` px.

## Radius

`sm 8px` (small controls) · `md 12px` (inputs ~9–10px làm tròn lên md) · `lg 16px` (card) ·
`xl 20px` · `pill 999px` (badge).

## Component inventory (Frame 02 + màn hình thật Frame 03–15)

`Button` (Primary/Secondary/Ghost/Disabled) · `IconButton` · `Input`/`Select`/`Textarea`/
`Checkbox`/`Switch` · `Card`/`StatCard`(KPI)/`TaskCard`/`ProjectCard`/`GoalCard`/`HabitCard` ·
`Badge` → `StatusBadge`/`PriorityBadge`/`RiskBadge` · `Progress`/`ProgressRing` · `Modal`/`Dialog`/
`Drawer`/`Dropdown`/`Tooltip` · `EmptyState`/`LoadingState`/`ErrorState` · `PageHeader`/
`SectionHeader`/`Sidebar`/`Topbar` · `SmartInsightCard` · `NotificationItem`.

## Sidebar (Personal Mode — đã bỏ "Members")

```
⚡ SMART TASK
Overview   Dashboard · Today · Inbox
Planning   Tasks · Projects · Calendar · Kanban
Personal   Goals · Habits
Insights   Analytics · Smart Assistant
System     Settings
```

Canva gốc (Frame 03–15) có mục "Members" (team/workload/ops score) — **quyết định đã chốt: bỏ
hoàn toàn** khỏi Desktop/Web ở giai đoạn hiện tại vì xung đột với Personal Mode. Giữ Frame 13 làm
tham khảo nếu sau này mở multi-user.

## Frame không map trực tiếp vào UI (chỉ là tài liệu)

- Frame 16 — Excel Implementation Mapping
- Frame 17 — Google Sheets Implementation Mapping (khớp với `apps/google-sheets/docs/claude/`)
- Frame 19 — Final Design Review (tất cả mục PASS; tự ghi gate "không code trước khi được duyệt" —
  đúng tinh thần audit-trước-code đã thực hiện ở Phase 00)
