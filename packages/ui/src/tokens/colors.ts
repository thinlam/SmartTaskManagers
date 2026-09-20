/**
 * Color tokens — extracted from the Canva Design System (Frame 01) and
 * reconciled with apps/google-sheets/docs/claude/UI_UX_MASTER_PROMPT.md
 * (the production Google Sheets client's own design doc, which refines a
 * couple of text colors after Canva). See docs/design-system/design-tokens.md
 * for the full source comparison — this file is the canonical, code-facing
 * version of that document. Never hard-code these hex values elsewhere;
 * import from here (or, once Phase 05 wires up Tailwind, via the matching
 * semantic class names).
 */

export const colors = {
  primary: '#4F46E5',
  primaryHover: '#4338CA',
  primaryLight: '#EEF2FF',

  success: '#16A34A',
  successSoft: '#ECFDF5',
  warning: '#D97706',
  warningSoft: '#FFF7ED',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  info: '#2563EB',
  infoSoft: '#EFF6FF',

  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',

  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',

  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  darkHeader: '#172033',
} as const;

/**
 * Task statuses. Frame 02's Badge component originally showed 8 (team)
 * statuses — Not Started/To Do/In Progress/Review/Blocked/On Hold/
 * Completed/Cancelled. Personal Mode's real Status enum
 * (apps/google-sheets/src/00_Constants.gs LOOKUP_LISTS.Status, matching
 * packages/types' TaskStatus) only has 5: Inbox/To Do/In Progress/
 * Waiting/Completed — discovered while building Phase 12 (Tasks), which
 * needed a StatusBadge and found this file still modeled the unused
 * 8-value team list. `inbox`/`waiting` reuse the same hex Frame 01 used
 * for the closest team equivalent (Not Started / On Hold).
 */
export const statusColors = {
  inbox: '#94A3B8',
  toDo: '#64748B',
  inProgress: '#2563EB',
  waiting: '#F59E0B',
  completed: '#16A34A',
} as const;

/** 5 Priority levels (Frame 02 — Badges). */
export const priorityColors = {
  critical: '#DC2626',
  urgent: '#EA580C',
  high: '#F59E0B',
  medium: '#2563EB',
  low: '#64748B',
} as const;

/**
 * Risk / Project Health share one 4-level severity scale (Frame 01, section 5):
 * Low = Healthy, Medium = Attention, High = At Risk, Critical = Critical.
 */
export const riskColors = {
  low: '#16A34A',
  medium: '#F59E0B',
  high: '#EA580C',
  critical: '#DC2626',
} as const;

export type ColorToken = keyof typeof colors;
export type StatusToken = keyof typeof statusColors;
export type PriorityToken = keyof typeof priorityColors;
export type RiskToken = keyof typeof riskColors;
