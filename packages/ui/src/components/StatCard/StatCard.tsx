import { cn } from '../../lib/cn';

export interface StatCardProps {
  /** Rendered uppercase — matches the `cardLabel` typography token. */
  label: string;
  /** Rendered large/bold — matches the `cardValue` typography token (32px). */
  value: string;
  sub?: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

const TONE_TEXT: Record<NonNullable<StatCardProps['tone']>, string> = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
};

/** Frame 02 (Component Library → Cards, "TOTAL TASKS 128 +12% tuần này"). */
export function StatCard({ label, value, sub, tone = 'primary' }: StatCardProps) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4">
      <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</span>
      <span className="text-[32px] font-bold leading-[38px] text-ink-primary">{value}</span>
      {sub && <span className={cn('text-xs', TONE_TEXT[tone])}>{sub}</span>}
    </div>
  );
}
