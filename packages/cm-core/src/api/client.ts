import type {
  Activity,
  AuthResult,
  Campaign,
  CampaignInput,
  Content,
  ContentInput,
  ContentQuery,
  Dashboard,
  MediaAsset,
  Paged,
  ReportSummary,
  Role,
  User,
  Workspace,
} from './types';

const SERVER_KEY = 'cm.serverUrl';
const TOKEN_KEY = 'cm.token';

const DEFAULT_URL =
  (import.meta.env.VITE_CM_API_URL as string | undefined)?.replace(/\/+$/, '') ??
  'http://localhost:5290';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode) — value only lives for this session.
  }
}

// The backend address is fixed at build time (VITE_CM_API_URL); users cannot change it, so a
// stray edit can never leave the app pointing at the wrong server. Drop any value an older
// version saved.
write(SERVER_KEY, null);
const baseUrl = DEFAULT_URL;
let token = read(TOKEN_KEY);
let onUnauthorized: (() => void) | null = null;

export const getServerUrl = () => baseUrl;
export const setToken = (t: string | null) => {
  token = t;
  write(TOKEN_KEY, t);
};
export const getToken = () => token;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};
export const mediaUrl = (id: string) => `${baseUrl}/api/media/${id}/file`;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

async function request<T>(
  method: string,
  path: string,
  opts: { body?: unknown; query?: Query; form?: FormData } = {},
): Promise<T> {
  const url = new URL(baseUrl + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(url, { method, headers, body });
  } catch {
    throw new ApiError('Không kết nối được máy chủ. Hãy kiểm tra kết nối mạng và thử lại.', 0);
  }
  if (res.status === 401 && token) {
    setToken(null);
    onUnauthorized?.();
  }
  if (!res.ok) {
    let message = `Lỗi ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* non-JSON error body */
    }
    if (res.status === 403) message = 'Bạn không có quyền thực hiện thao tác này.';
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const get = <T>(path: string, query?: Query) => request<T>('GET', path, { query });
const send = <T>(method: string, path: string, body?: unknown) =>
  request<T>(method, path, { body });

export const api = {
  auth: {
    login: (email: string, password: string) =>
      send<AuthResult>('POST', '/api/auth/login', { email, password }),
    register: (email: string, fullName: string, password: string) =>
      send<AuthResult>('POST', '/api/auth/register', { email, fullName, password }),
    me: () => get<User>('/api/auth/me'),
    updateMe: (fullName: string) => send<User>('PUT', '/api/auth/me', { fullName }),
    changePassword: (currentPassword: string, newPassword: string) =>
      send<void>('PUT', '/api/auth/password', { currentPassword, newPassword }),
  },
  workspace: {
    get: () => get<Workspace>('/api/workspace'),
    rename: (name: string) => send<void>('PUT', '/api/workspace', { name }),
  },
  contents: {
    list: (q: ContentQuery = {}) => get<Paged<Content>>('/api/contents', { ...q }),
    get: (id: string) => get<Content>(`/api/contents/${id}`),
    create: (input: ContentInput) => send<Content>('POST', '/api/contents', input),
    update: (id: string, input: ContentInput) => send<Content>('PUT', `/api/contents/${id}`, input),
    setStatus: (id: string, status: Content['status']) =>
      send<Content>('PATCH', `/api/contents/${id}/status`, { status }),
    remove: (id: string) => send<void>('DELETE', `/api/contents/${id}`),
    bulkDelete: (ids: string[]) =>
      send<{ deleted: number }>('POST', '/api/contents/bulk-delete', { ids }),
  },
  campaigns: {
    list: () => get<Campaign[]>('/api/campaigns'),
    create: (input: CampaignInput) => send<Campaign>('POST', '/api/campaigns', input),
    update: (id: string, input: CampaignInput) =>
      send<Campaign>('PUT', `/api/campaigns/${id}`, input),
    remove: (id: string) => send<void>('DELETE', `/api/campaigns/${id}`),
  },
  members: {
    list: () => get<User[]>('/api/members'),
    create: (input: { email: string; fullName: string; password: string; role: Role }) =>
      send<User>('POST', '/api/members', input),
    setRole: (id: string, role: Role) => send<User>('PUT', `/api/members/${id}/role`, { role }),
    remove: (id: string) => send<void>('DELETE', `/api/members/${id}`),
  },
  media: {
    list: (q?: { q?: string; type?: 'image' | 'video' }) => get<MediaAsset[]>('/api/media', q),
    usage: () => get<{ usedBytes: number; limitBytes: number }>('/api/media/usage'),
    upload: (files: File[]) => {
      const form = new FormData();
      files.forEach((f) => form.append('files', f));
      return request<MediaAsset[]>('POST', '/api/media', { form });
    },
    remove: (id: string) => send<void>('DELETE', `/api/media/${id}`),
  },
  dashboard: (q: { range: 'week' | 'month'; channel?: string; assigneeId?: string }) =>
    get<Dashboard>('/api/dashboard', { ...q, tzOffset: -new Date().getTimezoneOffset() }),
  reports: (q: { from?: string; to?: string }) => get<ReportSummary>('/api/reports/summary', q),
  activities: (take = 20) => get<Activity[]>('/api/activities', { take }),
};
