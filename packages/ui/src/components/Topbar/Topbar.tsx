import { useEffect, useRef, useState } from 'react';
import { Bell, LogOut, Menu, Plus, Search, Settings } from 'lucide-react';
import type { AppNotification } from '@stm/types';
import { Button } from '../Button';
import { NotificationPanel } from '../NotificationPanel';
import { cn } from '../../lib/cn';

export interface TopbarProps {
  onNewTask?: () => void;
  newTaskLabel?: string;
  /** Shown only on small screens (a hamburger button, `md:hidden`) — opens the mobile Sidebar drawer. Omit to render no hamburger button at all (e.g. on desktop-only surfaces). */
  onMenuClick?: () => void;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Phase 30 — real notifications, generated server-side (see NotificationPanel). */
  notifications?: AppNotification[];
  notificationsLoading?: boolean;
  onNotificationClick?: (notification: AppNotification) => void;
  onMarkAllNotificationsRead?: () => void;
  notificationsTitle?: string;
  markAllNotificationsReadLabel?: string;
  notificationsLoadingLabel?: string;
  noNotificationsLabel?: string;
  /**
   * The account button opens a small menu (signed-in email, Settings,
   * Sign out) instead of signing out on click directly — a single
   * misclick used to end the session with no confirmation.
   */
  onAccountSettingsClick?: () => void;
  onSignOutClick?: () => void;
  /** Usually the signed-in email — also used to derive the avatar initials. */
  accountLabel?: string;
  /** The signed-in account's avatar image, if one is set — shows in place of the initials fallback wherever the account button/menu renders. */
  avatarUrl?: string | null;
  accountSettingsLabel?: string;
  signOutLabel?: string;
}

/** First 1-2 letters of the email's local part, e.g. "thin@x.io" → "TH". */
function initialsFromLabel(label: string | undefined): string {
  if (!label) return '?';
  const localPart = label.split('@')[0] ?? label;
  const letters = localPart.replace(/[^a-zA-Z]/g, '');
  return (letters.slice(0, 2) || localPart.slice(0, 2) || '?').toUpperCase();
}

/**
 * Global utility bar shared by every screen (search, notifications, quick
 * add, account) — matches the header row that repeats identically across
 * every Canva frame. Page title/subtitle are NOT here: those vary per
 * screen and belong to each page's own header, built alongside that page.
 */
export function Topbar({
  onNewTask,
  newTaskLabel = 'New Task',
  onMenuClick,
  onSearchChange,
  searchPlaceholder = 'Search tasks...',
  notifications = [],
  notificationsLoading = false,
  onNotificationClick,
  onMarkAllNotificationsRead,
  notificationsTitle,
  markAllNotificationsReadLabel,
  notificationsLoadingLabel,
  noNotificationsLabel,
  onAccountSettingsClick,
  onSignOutClick,
  accountLabel,
  avatarUrl,
  accountSettingsLabel = 'Account Settings',
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
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-surface px-3 sm:gap-3 sm:px-6">
      {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className={cn(
            'shrink-0 rounded-md p-2 text-ink-secondary transition-colors hover:bg-surface-secondary hover:text-ink-primary md:hidden',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          )}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      )}

      <div
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2 rounded-md bg-surface-secondary px-3 py-2',
          'focus-within:ring-2 focus-within:ring-primary',
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
        <input
          type="search"
          placeholder={searchPlaceholder}
          onChange={(event) => onSearchChange?.(event.target.value)}
          className="w-full min-w-0 bg-transparent text-sm text-ink-primary outline-none placeholder:text-ink-muted"
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
              title={notificationsTitle}
              markAllReadLabel={markAllNotificationsReadLabel}
              loadingLabel={notificationsLoadingLabel}
              emptyMessage={noNotificationsLabel}
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
        <span className="hidden sm:inline">{newTaskLabel}</span>
      </Button>

      <div className="relative" ref={accountMenuRef}>
        <button
          type="button"
          aria-label={accountLabel ? `Account menu (${accountLabel})` : 'Account menu'}
          title={accountLabel ?? undefined}
          onClick={() => setIsAccountMenuOpen((open) => !open)}
          className={cn(
            'relative flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white transition-opacity hover:opacity-90',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          )}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            initialsFromLabel(accountLabel)
          )}
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-success" />
        </button>

        {isAccountMenuOpen && (
          <div
            className={cn(
              'absolute right-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-surface shadow-lg',
            )}
          >
            {accountLabel && (
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    initialsFromLabel(accountLabel)
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-success" />
                </span>
                <span className="truncate text-sm text-ink-secondary">{accountLabel}</span>
              </div>
            )}
            <div className="flex flex-col gap-0.5 p-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsAccountMenuOpen(false);
                  onAccountSettingsClick?.();
                }}
                className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm text-ink-primary transition-colors hover:bg-surface-secondary"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-secondary">
                  <Settings className="h-4 w-4" aria-hidden="true" />
                </span>
                {accountSettingsLabel}
              </button>
            </div>
            <div className="border-t border-border p-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsAccountMenuOpen(false);
                  onSignOutClick?.();
                }}
                className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm font-medium text-danger transition-colors hover:bg-danger-soft"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-danger-soft">
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </span>
                {signOutLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
