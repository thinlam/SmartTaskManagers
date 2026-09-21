import type { AppNotification } from '@stm/types';
import { EmptyState } from '../EmptyState';
import { NotificationItem } from './NotificationItem';

export interface NotificationPanelProps {
  notifications: AppNotification[];
  isLoading?: boolean;
  onItemClick?: (notification: AppNotification) => void;
  onMarkAllRead?: () => void;
}

/**
 * Dropdown body Topbar's bell button opens (Phase 30 — the bell existed
 * since Phase 08 with no panel behind it, `notificationCount` always 0).
 * Positioning/open-state lives in Topbar, which knows where its own
 * button is; this component only renders the panel's contents.
 */
export function NotificationPanel({
  notifications,
  isLoading,
  onItemClick,
  onMarkAllRead,
}: NotificationPanelProps) {
  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div className="flex max-h-[28rem] w-96 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-ink-primary">Notifications</h2>
        {hasUnread && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="p-4 text-sm text-ink-muted">Loading…</p>
        ) : notifications.length === 0 ? (
          <EmptyState message="No notifications yet." className="border-none" />
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={onItemClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
