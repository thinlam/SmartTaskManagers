import { useEffect, useRef, useState } from 'react';
import { Bell, CircleUserRound, Plus, Search } from 'lucide-react';
import type { AppNotification } from '@stm/types';
import { Button } from '../Button';
import { NotificationPanel } from '../NotificationPanel';
import { cn } from '../../lib/cn';

export interface TopbarProps {
  onNewTask?: () => void;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Phase 30 — real notifications, generated server-side (see NotificationPanel). */
  notifications?: AppNotification[];
  notificationsLoading?: boolean;
  onNotificationClick?: (notification: AppNotification) => void;
  onMarkAllNotificationsRead?: () => void;
  /**
   * Phase 27 — the account button now does something: signs out of the
   * real session. `accountLabel` (usually the signed-in email) shows as
   * a native tooltip on hover; there's no account menu/settings page
   * behind this yet, just the one real action available.
   */
  onAccountClick?: () => void;
  accountLabel?: string;
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
  notifications = [],
  notificationsLoading = false,
  onNotificationClick,
  onMarkAllNotificationsRead,
  onAccountClick,
  accountLabel,
}: TopbarProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    if (!isPanelOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsPanelOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPanelOpen]);

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

      <div className="relative" ref={containerRef}>
        <button
          type="button"
          aria-label={unreadCount > 0 ? `${unreadCount} notifications` : 'Notifications'}
          onClick={() => setIsPanelOpen((open) => !open)}
          className={cn(
            'relative rounded-md p-2 text-ink-secondary transition-colors hover:bg-surface-secondary hover:text-ink-primary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          )}
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" />
          )}
        </button>

        {isPanelOpen && (
          <div className="absolute right-0 top-full z-20 mt-2">
            <NotificationPanel
              notifications={notifications}
              isLoading={notificationsLoading}
              onItemClick={(notification) => {
                onNotificationClick?.(notification);
                setIsPanelOpen(false);
              }}
              onMarkAllRead={onMarkAllNotificationsRead}
            />
          </div>
        )}
      </div>

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
        aria-label={accountLabel ? `Sign out (${accountLabel})` : 'Sign out'}
        title={accountLabel ? `Signed in as ${accountLabel} — click to sign out` : 'Sign out'}
        onClick={onAccountClick}
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
