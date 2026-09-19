# packages/ui

Design tokens + component library dùng chung cho Desktop và Web.

Nguồn thiết kế: Canva Design System (xem
[`docs/design-system/design-tokens.md`](../../docs/design-system/design-tokens.md)).

## Trạng thái

- ✅ `tokens/` — `colors.ts` · `spacing.ts` · `typography.ts` · `radius.ts` · `shadows.ts`
  (Phase 04). `shadows.ts` là giá trị mặc định hợp lý, **không** trích xuất trực tiếp từ Canva
  (Frame 01 không định nghĩa shadow token) — xem comment trong file.
- ✅ `lib/cn.ts` — helper merge class Tailwind (`clsx` + `tailwind-merge`).
- ✅ `components/Button` — variant `primary`/`secondary`/`ghost`, size `sm`/`md`/`lg`, `leadingIcon`/`trailingIcon` (Phase 04).
- ⏳ `Card`/`Badge`/`Progress`/`Modal`/`Dropdown`/`Tooltip`/`EmptyState`/... — chưa làm, theo sau khi các màn hình cần đến.

## Quy ước Tailwind (áp dụng thật ở Phase 05)

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

Đây là danh sách tên tham chiếu — **chưa** có Tailwind config/preset thật nào định nghĩa các tên
này ở Phase 04 (chưa cài Tailwind trong repo để verify version/API thật). Phase 05, khi
`apps/desktop` cài Tailwind thật, phải map đúng các tên này tới giá trị trong
`packages/ui/src/tokens/colors.ts` và `radius.ts` — không đổi tên, không tạo token trùng lặp khác.

## Test hiện tại

Vì chưa có Vite/Tailwind nào chạy trong repo, package này **chỉ verify được bằng
typecheck/lint**, chưa render được để xem bằng mắt — việc đó chờ Phase 05/09.

```bash
npm run typecheck
npm run lint
```
