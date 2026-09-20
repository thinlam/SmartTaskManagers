import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

const iconButtonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center rounded-md transition-colors',
    'disabled:pointer-events-none disabled:opacity-40',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary',
  ].join(' '),
  {
    variants: {
      variant: {
        ghost: 'text-ink-secondary hover:bg-surface-secondary hover:text-ink-primary',
        danger: 'text-danger hover:bg-danger-soft',
      },
      size: {
        sm: 'h-8 w-8',
        md: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'ghost', size: 'md' },
  },
);

export interface IconButtonProps
  extends
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'>,
    VariantProps<typeof iconButtonVariants> {
  icon: ReactNode;
  /**
   * Required, not optional — an icon-only button has no visible text, so
   * this is the only accessible name a screen reader has to announce it.
   */
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, icon, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    >
      {icon}
    </button>
  ),
);

IconButton.displayName = 'IconButton';
