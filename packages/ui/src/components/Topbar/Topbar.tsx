import { Bell, CircleUserRound, Plus, Search } from 'lucide-react';
import { Button } from '../Button';
import { cn } from '../../lib/cn';

export interface TopbarProps {
  onNewTask?: () => void;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Not populated by any screen yet — real counts land with Phase 30 (Notifications). */
  notificationCount?: number;
}

/**
 * Global utility bar shared by every screen (search, notifications, quick
 * add, account) — matches the header row that repeats identically across
 * every Canva frame. Page title/subtitle are NOT here: those vary per
 * screen and belong to each page's own header, built alongside that page.
 */
export function Topbar({
  onNewTask,
  onSearchChange,
  searchPlaceholder = 'Search tasks...',
  notificationCount = 0,
}: TopbarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface px-6">
      <div
        className={cn(
          'flex flex-1 items-center gap-2 rounded-md bg-surface-secondary px-3 py-2',
          'focus-within:ring-2 focus-within:ring-primary',
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
        <input
          type="search"
          placeholder={searchPlaceholder}
          onChange={(event) => onSearchChange?.(event.target.value)}
          className="w-full bg-transparent text-sm text-ink-primary outline-none placeholder:text-ink-muted"
        />
      </div>

      <button
        type="button"
        aria-label={notificationCount > 0 ? `${notificationCount} notifications` : 'Notifications'}
        className={cn(
          'relative rounded-md p-2 text-ink-secondary transition-colors hover:bg-surface-secondary hover:text-ink-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        )}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {notificationCount > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" />
        )}
      </button>

      <Button
        variant="primary"
        size="sm"
        leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
        onClick={onNewTask}
      >
        New Task
      </Button>

      <button
        type="button"
        aria-label="Account"
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full bg-surface-secondary text-ink-secondary transition-colors hover:text-ink-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        )}
      >
        <CircleUserRound className="h-5 w-5" aria-hidden="true" />
      </button>
    </header>
  );
}
