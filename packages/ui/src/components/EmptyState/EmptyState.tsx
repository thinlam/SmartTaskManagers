import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface EmptyStateProps {
  message: string;
  icon?: ReactNode;
  className?: string;
}

/**
 * Every list must handle this, not just the happy path (project rule —
 * see apps/google-sheets/docs/claude/UI_UX_MASTER_PROMPT.md §15: empty
 * state must be clear, never an empty area with no explanation).
 */
export function EmptyState({ message, icon, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface-secondary/40 p-6 text-center',
        className,
      )}
    >
      {icon}
      <p className="text-sm text-ink-secondary">{message}</p>
    </div>
  );
}
