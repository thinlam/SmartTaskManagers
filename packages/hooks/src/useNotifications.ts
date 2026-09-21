import { useCallback, useEffect, useState } from 'react';
import type { AppNotification } from '@stm/types';
import { notificationApi } from '@stm/api-client';

const POLL_INTERVAL_MS = 60_000;

export interface UseNotificationsResult {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Real backend store (Phase 30) — notifications are generated server-side
 * (NotificationGenerationHostedService, every 30 minutes) rather than
 * created by this app, so a one-time fetch on mount would go stale the
 * moment a new one appears. Polls every 60s instead of a one-shot
 * useEffect — no websocket/SSE infrastructure exists in this project, and
 * Personal Mode's single-user scale doesn't need one.
 */
export function useNotifications(): UseNotificationsResult {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const [list, count] = await Promise.all([
        notificationApi.getAll(),
        notificationApi.getUnreadCount(),
      ]);
      setNotifications(list);
      setUnreadCount(count);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications.');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      await refresh();
      if (!cancelled) setIsLoading(false);
    }
    void load();

    const interval = setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [refresh]);

  const markRead = useCallback(async (id: string): Promise<void> => {
    const updated = await notificationApi.markRead(id);
    setNotifications((previous) => previous.map((n) => (n.id === id ? updated : n)));
    setUnreadCount((previous) => Math.max(0, previous - 1));
  }, []);

  const markAllRead = useCallback(async (): Promise<void> => {
    await notificationApi.markAllRead();
    setNotifications((previous) => previous.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  return { notifications, unreadCount, isLoading, error, markRead, markAllRead, refresh };
}
