import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** 'md' (default, max-w-md) for simple forms; 'lg' (max-w-2xl) for richer forms like Quick Add Task's pill selectors + live preview. */
  size?: 'md' | 'lg';
}

const SIZE_CLASS: Record<NonNullable<DrawerProps['size']>, string> = {
  md: 'max-w-md',
  lg: 'max-w-2xl',
};

/**
 * Centered modal dialog + backdrop, used for Task/Project/Goal/Habit
 * Detail (create+edit). Was a right-anchored slide-in panel through
 * Phase 27; moved to center-of-screen because every Add/Edit flow in the
 * app shares this component, so centering it here centers all of them at
 * once instead of needing a per-page fix. Closes on Escape or backdrop
 * click. Simplified accessibility: sets role="dialog"/aria-modal and
 * handles Escape, but does NOT trap focus inside the panel — a full focus
 * trap needs more machinery than this phase's scope justifies. Called out
 * here rather than silently skipped; revisit if a screen reader /
 * keyboard-only pass finds it insufficient.
 */
export function Drawer({ open, onClose, title, children, footer, size = 'md' }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-primary/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative flex max-h-[90vh] w-full flex-col rounded-xl bg-surface shadow-lg',
          SIZE_CLASS[size],
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-ink-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface-secondary hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && <div className="shrink-0 border-t border-border px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
