# packages/ui

Design tokens + component library dùng chung cho Desktop và Web.

Nguồn thiết kế: Canva Design System (xem
[`docs/design-system/design-tokens.md`](../../docs/design-system/design-tokens.md)).

## Trạng thái

- ✅ `tokens/` — `colors.ts` · `spacing.ts` · `typography.ts` · `radius.ts` · `shadows.ts`
  (Phase 04). `shadows.ts` là giá trị mặc định hợp lý, **không** trích xuất trực tiếp từ Canva
  (Frame 01 không định nghĩa shadow token) — xem comment trong file.
- ✅ `lib/cn.ts` — helper merge class Tailwind (`clsx` + `tailwind-merge`).
- ✅ `components/Button` — variant `primary`/`secondary`/`ghost`, size `sm`/`md`/`lg`,
  `leadingIcon`/`trailingIcon` (Phase 04).
- ✅ `components/Sidebar` — nhóm nav (group/items), collapse, active/hover state, badge (chưa có
  dữ liệu thật để gắn số) (Phase 08).
- ✅ `components/Topbar` — search box, nút notification, nút "+ New Task" (dùng `Button`), avatar
  (Phase 08).
- ✅ `components/Badge` — `Badge` (tone chung) + `PriorityBadge` (dùng token `priority-*` riêng,
  không phải tone chung — xem comment trong file) (Phase 09).
- ✅ `components/Progress` — thanh progress ngang, `value` 0–100, `tone` (Phase 09).
- ✅ `components/StatCard` — KPI card (label/value/sub/tone), dùng cho Dashboard/Analytics (Phase 09).
- ✅ `components/TaskCard` — dạng row-card "Focus Now"/"Focus Today" (title, meta, due, priority,
  smartScore?, recommendedAction?) — dùng chung thật cho Dashboard (Phase 09) **và** Today
  (Phase 10, không sửa gì thêm khi tái dùng) (Phase 09).
- ✅ `components/SmartInsightCard` — dòng insight có icon Sparkles + màu theo tone (Phase 09).
- ✅ `components/EmptyState` — dùng ở Today cho các section Do Now/Scheduled/Quick Wins khi rỗng
  (Phase 10).
- ⏳ `Card`/`Modal`/`Dropdown`/`Tooltip`/... — chưa làm, theo sau khi các màn hình cần đến.

## Sidebar/Topbar — router-agnostic theo thiết kế

`Sidebar` **không** import `react-router-dom` — mỗi nav item chỉ nhận `href` (string) và `active`
(boolean) đã tính sẵn, do consumer (hiện tại là `apps/desktop/src/app/AppShell.tsx`) tính toán từ
router thật của app đó. Lý do: `packages/ui` phải dùng lại được ở `apps/web` (Phase 33), nơi có
thể dùng router khác hoặc scheme URL khác (`apps/desktop` dùng hash route `#/tasks` vì lý do nêu ở
`apps/desktop/README.md`; `apps/web` nhiều khả năng dùng path thật `/tasks`).

`Sidebar`/`Topbar` chưa có Tooltip component riêng — khi collapsed, dùng thuộc tính HTML `title`
làm tooltip tạm (đủ dùng, không cần thêm dependency); sẽ thay bằng component `Tooltip` thật nếu
sau này packages/ui có (chưa nằm trong scope hiện tại).

## Quy ước Tailwind (đã verify thật từ Phase 05)

Component trong package này dùng tên class ngữ nghĩa, **không hard-code hex**:

```
bg-primary · bg-primary-hover · bg-primary-light
bg-success / -soft · bg-warning / -soft · bg-danger / -soft · bg-info / -soft
bg-background · bg-surface · bg-surface-secondary
border-border · border-border-strong
text-ink-primary · text-ink-secondary · text-ink-muted
bg-status-{not-started|to-do|in-progress|review|blocked|on-hold|completed|cancelled}
bg-priority-{critical|urgent|high|medium|low}
bg-risk-{low|medium|high|critical}
rounded-sm(8px) / -md(12px) / -lg(16px) / -xl(20px) / -pill(9999px)
```

Nguồn thật của các tên này: `packages/ui/src/styles/theme.css` (Tailwind v4 `@theme`, xem
`docs/architecture/ARCHITECTURE.md`). Không đổi tên, không tạo token trùng lặp khác — nếu cần màu
mới, thêm vào `tokens/colors.ts` **và** `styles/theme.css` cùng lúc.

## Icon

Dùng **Lucide** (`lucide-react`) theo đúng yêu cầu thiết kế (#40 — không dùng emoji khi Canva
dùng icon SVG chuyên nghiệp). Tên icon phải verify trực tiếp trong bản `lucide-react` đã cài
(`grep` type declaration) trước khi dùng — một số tên đã đổi giữa các phiên bản (ví dụ `BarChart3`
cũ đã đổi thành `ChartColumn` ở bản đang dùng trong repo này).

## Dependency dùng chung — cẩn thận trùng bản

`react`/`react-dom`/`@types/react`/`@types/react-dom` **chỉ khai báo ở root `package.json`**
(devDependencies) và ở từng app/package thật sự cần (`react`/`react-dom` là dependency/peer, không
phải `@types/*`). Lý do: khai báo `@types/react` riêng ở cả `packages/ui` lẫn `apps/desktop` từng
khiến npm cài **2 bản riêng biệt** (không hoist về root) — hậu quả thật gặp phải: type của
`lucide-react` (cụ thể là `LucideProps`, vốn extend `SVGProps` từ `react`) bị TypeScript coi là
thiếu `className` vì việc resolve `'react'` từ bên trong `lucide-react` không tìm thấy bản types
hoisted duy nhất. Đã sửa bằng cách gom `@types/react*` về root — không lặp lại lỗi này khi thêm
dependency mới cần kiểu React.

## Test

```bash
npm run typecheck
npm run lint
```

Xem trực quan thật (không chỉ build): `npm run dev:tauri` ở `apps/desktop` (hoặc `npm run
dev:desktop` rồi mở trình duyệt).

## Phụ thuộc `@stm/types`

Từ Phase 09, `packages/ui` phụ thuộc `@stm/types` (ví dụ `PriorityBadge` cần type `Priority`).
Đây là phụ thuộc chỉ-type (không runtime), hợp lý cho một component library cần biết hình dạng dữ
liệu domain để render đúng — không tạo vòng phụ thuộc vì `@stm/types` không phụ thuộc lại
`@stm/ui`.
