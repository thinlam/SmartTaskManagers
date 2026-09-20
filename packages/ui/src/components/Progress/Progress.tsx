import { cn } from '../../lib/cn';

export interface ProgressProps {
  /** 0–100. Values outside this range are clamped. */
  value: number;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const TONE_BG: Record<NonNullable<ProgressProps['tone']>, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

export function Progress({ value, tone = 'primary', className }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-2 w-full overflow-hidden rounded-pill bg-surface-secondary', className)}
    >
      <div
        className={cn('h-full rounded-pill transition-[width] duration-300', TONE_BG[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
