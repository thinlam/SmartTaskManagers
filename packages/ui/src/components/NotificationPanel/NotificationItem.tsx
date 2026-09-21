import { AlertTriangle, Ban, CalendarClock, Flame, RefreshCw } from 'lucide-react';
import type { AppNotification, NotificationType } from '@stm/types';
import { cn } from '../../lib/cn';

export interface NotificationItemProps {
  notification: AppNotification;
  onClick?: (notification: AppNotification) => void;
}

const ICON_BY_TYPE: Record<NotificationType, typeof AlertTriangle> = {
  TaskOverdue: AlertTriangle,
  TaskDueSoon: CalendarClock,
  HabitStreakAtRisk: Flame,
  GoalAtRisk: Ban,
  SyncFailed: RefreshCw,
};

const TONE_BY_TYPE: Record<NotificationType, string> = {
  TaskOverdue: 'text-danger bg-danger-soft',
  TaskDueSoon: 'text-warning bg-warning-soft',
  HabitStreakAtRisk: 'text-warning bg-warning-soft',
  GoalAtRisk: 'text-danger bg-danger-soft',
  SyncFailed: 'text-info bg-info-soft',
};

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

/** One row in NotificationPanel — Frame 02's design-tokens.md names this "NotificationItem" (Phase 30 is the first real implementation). */
export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const Icon = ICON_BY_TYPE[notification.type];

  return (
    <button
      type="button"
      onClick={() => onClick?.(notification)}
      className={cn(
        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-secondary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
        !notification.isRead && 'bg-primary-light/40',
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          TONE_BY_TYPE[notification.type],
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-ink-primary">
            {notification.title}
          </span>
          {!notification.isRead && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          )}
        </span>
        <span className="line-clamp-2 text-sm text-ink-secondary">{notification.message}</span>
        <span className="text-xs text-ink-muted">{relativeTime(notification.createdAt)}</span>
      </span>
    </button>
  );
}
