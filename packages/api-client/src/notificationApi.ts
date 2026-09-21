import type { AppNotification, NotificationType } from '@stm/types';
import { httpClient } from './httpClient';

/** Raw shape SmartTask.Api's NotificationResponse serializes to (Phase 30) — no enum mapping needed, NotificationType has no spaces on either side. */
interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
}

function fromDto(dto: NotificationDto): AppNotification {
  return {
    id: dto.id,
    type: dto.type as NotificationType,
    title: dto.title,
    message: dto.message,
    entityType: (dto.entityType as AppNotification['entityType']) ?? undefined,
    entityId: dto.entityId ?? undefined,
    isRead: dto.isRead,
    createdAt: dto.createdAt,
  };
}

/** Matches SmartTask.Api's NotificationsController (Phase 30). */
export const notificationApi = {
  getAll: async (): Promise<AppNotification[]> =>
    (await httpClient.get<NotificationDto[]>('/api/notifications')).map(fromDto),
  getUnreadCount: async (): Promise<number> =>
    (await httpClient.get<{ unreadCount: number }>('/api/notifications/unread-count')).unreadCount,
  markRead: async (id: string): Promise<AppNotification> =>
    fromDto(await httpClient.post<NotificationDto>(`/api/notifications/${id}/read`)),
  markAllRead: (): Promise<void> => httpClient.post<void>('/api/notifications/read-all'),
};
