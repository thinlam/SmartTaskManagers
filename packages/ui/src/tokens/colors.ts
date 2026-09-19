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

/** 8 Task statuses (Frame 02 — Badges). */
export const statusColors = {
  notStarted: '#94A3B8',
  toDo: '#64748B',
  inProgress: '#2563EB',
  review: '#7C3AED',
  blocked: '#DC2626',
  onHold: '#F59E0B',
  completed: '#16A34A',
  cancelled: '#475569',
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
