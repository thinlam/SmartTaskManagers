import type { Activity } from '../api/types';

/** Vietnamese sentence for an activity-feed row, e.g. `Minh Anh đã đăng bài "…"`. */
export function activityText(a: Activity): string {
  const who = a.user?.fullName ?? 'Ai đó';
  switch (a.action) {
    case 'created':
      return `${who} đã tạo nội dung "${a.subject}"`;
    case 'updated':
      return `${who} đã cập nhật bài "${a.subject}"`;
    case 'status':
      return `${who} đã cập nhật trạng thái bài "${a.subject}"`;
    case 'published':
      return `${who} đã đăng bài "${a.subject}"`;
    case 'uploaded':
      return `${who} đã tải lên file "${a.subject}"`;
    case 'deleted':
      return `${who} đã xóa bài "${a.subject}"`;
  }
}
