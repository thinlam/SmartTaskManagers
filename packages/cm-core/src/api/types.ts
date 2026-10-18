export type Channel = 'Facebook' | 'TikTok' | 'YouTube' | 'Website' | 'Zalo';
export type ContentStatus = 'Idea' | 'Drafting' | 'Review' | 'Approved' | 'Scheduled' | 'Published';
export type Priority = 'Low' | 'Medium' | 'High';
export type Role = 'Admin' | 'Editor' | 'Viewer';
export type CampaignStatus = 'Planned' | 'Active' | 'Done';

export const CHANNELS: Channel[] = ['Facebook', 'TikTok', 'YouTube', 'Website', 'Zalo'];
export const STATUSES: ContentStatus[] = [
  'Idea',
  'Drafting',
  'Review',
  'Approved',
  'Scheduled',
  'Published',
];
export const PRIORITIES: Priority[] = ['High', 'Medium', 'Low'];

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  createdAt: string;
  memberCount: number;
  contentCount: number;
  mediaBytes: number;
}

export interface AuthResult {
  token: string;
  expiresAt: string;
  user: User;
}

export interface UserRef {
  id: string;
  fullName: string;
}

export interface MediaAsset {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  contentId: string | null;
  createdAt: string;
  uploadedBy: string | null;
}

export interface Content {
  id: string;
  code: string;
  title: string;
  description: string | null;
  channel: Channel;
  status: ContentStatus;
  priority: Priority;
  progress: number;
  assignee: UserRef | null;
  campaign: { id: string; name: string } | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  media: MediaAsset[];
}

export interface ContentInput {
  title?: string;
  description?: string;
  channel?: Channel;
  status?: ContentStatus;
  priority?: Priority;
  progress?: number;
  assigneeId?: string | null;
  campaignId?: string | null;
  scheduledAt?: string | null;
  mediaIds?: string[];
}

export interface ContentQuery {
  q?: string;
  status?: ContentStatus;
  channel?: Channel;
  campaignId?: string;
  assigneeId?: string;
  priority?: Priority;
  from?: string;
  to?: string;
  sort?: 'scheduled' | 'title' | 'updated';
  page?: number;
  pageSize?: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: CampaignStatus;
  contentCount: number;
  publishedCount: number;
}

export interface CampaignInput {
  name?: string;
  description?: string;
  startDate?: string | null;
  endDate?: string | null;
  status?: CampaignStatus;
}

export interface Activity {
  id: string;
  action: 'created' | 'updated' | 'status' | 'published' | 'uploaded' | 'deleted';
  subject: string;
  contentId: string | null;
  user: UserRef | null;
  createdAt: string;
}

export interface Kpi {
  value: number;
  deltaPercent: number | null;
}

export interface Dashboard {
  range: 'week' | 'month';
  kpis: {
    total: Kpi;
    published: Kpi;
    drafting: Kpi;
    review: Kpi;
    overdue: Kpi;
    completionRate: Kpi;
  };
  focus: { count: number; items: Content[] };
  upcoming: Content[];
  byChannel: { channel: Channel; count: number }[];
  weekly: { label: string; created: number; published: number }[];
  activities: Activity[];
}

export interface ReportSummary {
  total: number;
  published: number;
  completionRate: number;
  byStatus: { status: ContentStatus; count: number }[];
  byChannel: { channel: Channel; count: number; published: number }[];
  byAssignee: { name: string; count: number; published: number }[];
  byCampaign: { name: string; count: number; published: number }[];
}
