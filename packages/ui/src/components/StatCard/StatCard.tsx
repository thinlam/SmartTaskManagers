import { cn } from '../../lib/cn';

export interface StatCardProps {
  /** Rendered uppercase — matches the `cardLabel` typography token. */
  label: string;
  /** Rendered large/bold — matches the `cardValue` typography token (32px). */
  value: string;
  sub?: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  /** Frame 03's red-bordered Overdue tile — a highlighted border/background for a card that needs immediate attention, distinct from `tone` (which only colors the `sub` text). */
  emphasize?: boolean;
}

const TONE_TEXT: Record<NonNullable<StatCardProps['tone']>, string> = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
};

/** Frame 02 (Component Library → Cards, "TOTAL TASKS 128 +12% tuần này"). */
export function StatCard({
  label,
  value,
  sub,
  tone = 'primary',
  emphasize = false,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-lg border bg-surface p-4',
        emphasize ? 'border-danger bg-danger-soft' : 'border-border',
      )}
    >
      <span
        className={cn(
          'text-xs font-medium uppercase tracking-wide',
          emphasize ? 'text-danger' : 'text-ink-muted',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'text-[32px] font-bold leading-[38px]',
          emphasize ? 'text-danger' : 'text-ink-primary',
        )}
      >
        {value}
      </span>
      {sub && (
        <span className={cn('text-xs', emphasize ? 'text-danger' : TONE_TEXT[tone])}>{sub}</span>
      )}
    </div>
  );
}
