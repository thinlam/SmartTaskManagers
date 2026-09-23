import { useEffect, useRef, useState } from 'react';
import { Bell, CircleUserRound, LogOut, Plus, Search, Settings } from 'lucide-react';
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
   * The account button opens a small menu (signed-in email, Settings,
   * Sign out) instead of signing out on click directly — a single
   * misclick used to end the session with no confirmation.
   */
  onSettingsClick?: () => void;
  onSignOutClick?: () => void;
  accountLabel?: string;
  settingsLabel?: string;
  signOutLabel?: string;
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
  onSettingsClick,
  onSignOutClick,
  accountLabel,
  settingsLabel = 'Settings',
  signOutLabel = 'Sign out',
}: TopbarProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!isAccountMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAccountMenuOpen]);

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

      <div className="relative" ref={accountMenuRef}>
        <button
          type="button"
          aria-label={accountLabel ? `Account menu (${accountLabel})` : 'Account menu'}
          title={accountLabel ?? undefined}
          onClick={() => setIsAccountMenuOpen((open) => !open)}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full bg-surface-secondary text-ink-secondary transition-colors hover:text-ink-primary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          )}
        >
          <CircleUserRound className="h-5 w-5" aria-hidden="true" />
        </button>

        {isAccountMenuOpen && (
          <div
            className={cn(
              'absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-md border border-border bg-surface shadow-lg',
            )}
          >
            {accountLabel && (
              <div className="truncate border-b border-border px-3 py-2 text-xs text-ink-muted">
                {accountLabel}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setIsAccountMenuOpen(false);
                onSettingsClick?.();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-primary transition-colors hover:bg-surface-secondary"
            >
              <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />
              {settingsLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAccountMenuOpen(false);
                onSignOutClick?.();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-surface-secondary"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              {signOutLabel}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
