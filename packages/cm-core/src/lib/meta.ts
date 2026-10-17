import type { Channel, ContentStatus, Priority, Role, CampaignStatus } from '../api/types';

export const STATUS_META: Record<ContentStatus, { label: string; badge: string; dot: string }> = {
  Idea: { label: 'Ý tưởng', badge: 'bg-violet-soft text-violet', dot: 'bg-violet' },
  Drafting: { label: 'Đang soạn', badge: 'bg-brand-soft text-brand', dot: 'bg-brand' },
  Review: { label: 'Chờ duyệt', badge: 'bg-warn-soft text-warn', dot: 'bg-warn' },
  Approved: { label: 'Đã duyệt', badge: 'bg-ok-soft text-ok', dot: 'bg-ok' },
  Scheduled: { label: 'Đã lên lịch', badge: 'bg-ok-soft text-ok', dot: 'bg-ok' },
  Published: { label: 'Đã đăng', badge: 'bg-sunken text-ink-2', dot: 'bg-ink-3' },
};

export const PRIORITY_META: Record<Priority, { label: string; badge: string; ring: string }> = {
  High: { label: 'Cao', badge: 'bg-bad-soft text-bad', ring: 'border-bad text-bad' },
  Medium: { label: 'Trung bình', badge: 'bg-warn-soft text-warn', ring: 'border-warn text-warn' },
  Low: { label: 'Thấp', badge: 'bg-ok-soft text-ok', ring: 'border-ok text-ok' },
};

export const CHANNEL_META: Record<Channel, { label: string; color: string }> = {
  Facebook: { label: 'Facebook', color: '#1877f2' },
  TikTok: { label: 'TikTok', color: '#111827' },
  YouTube: { label: 'YouTube', color: '#ff0000' },
  Website: { label: 'Website', color: '#7c3aed' },
  Zalo: { label: 'Zalo', color: '#0068ff' },
};

export const ROLE_LABEL: Record<Role, string> = {
  Admin: 'Quản trị viên',
  Editor: 'Biên tập viên',
  Viewer: 'Người xem',
};

export const CAMPAIGN_STATUS: Record<CampaignStatus, { label: string; badge: string }> = {
  Planned: { label: 'Dự kiến', badge: 'bg-warn-soft text-warn' },
  Active: { label: 'Đang chạy', badge: 'bg-ok-soft text-ok' },
  Done: { label: 'Hoàn tất', badge: 'bg-sunken text-ink-2' },
};
