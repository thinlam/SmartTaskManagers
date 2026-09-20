import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

/**
 * Frame 02 (Component Library → Badges). Uses the `badgeText` typography
 * token (11px SemiBold uppercase) from packages/ui/src/tokens/typography.ts.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1 whitespace-nowrap rounded-pill px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-secondary text-ink-secondary',
        primary: 'bg-primary-light text-primary',
        success: 'bg-success-soft text-success',
        warning: 'bg-warning-soft text-warning',
        danger: 'bg-danger-soft text-danger',
        info: 'bg-info-soft text-info',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
