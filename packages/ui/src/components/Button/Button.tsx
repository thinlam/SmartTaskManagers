import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

/**
 * Frame 02 (Component Library → Buttons): Primary / Secondary / Disabled.
 * "+" is not a separate variant — it's a Primary button with a leading
 * icon (see `leadingIcon`), used throughout Canva as "+ New Task".
 *
 * Class names reference semantic Tailwind tokens (bg-primary, text-ink-*,
 * ...) that Phase 05 wires up for real — see packages/ui/README.md.
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 font-medium transition-colors',
    'disabled:pointer-events-none disabled:opacity-40',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-primary-hover',
        secondary: 'bg-surface text-ink-primary border border-border hover:bg-surface-secondary',
        ghost: 'bg-transparent text-ink-primary hover:bg-surface-secondary',
      },
      size: {
        sm: 'h-8 px-3 text-sm rounded-sm',
        md: 'h-10 px-4 text-sm rounded-md',
        lg: 'h-12 px-5 text-base rounded-md',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** e.g. a Lucide `<Plus />` for the "+ New Task" pattern used across every screen. */
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, leadingIcon, trailingIcon, children, ...props }, ref) => {
    return (
      <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props}>
        {leadingIcon}
        {children}
        {trailingIcon}
      </button>
    );
  },
);

Button.displayName = 'Button';
