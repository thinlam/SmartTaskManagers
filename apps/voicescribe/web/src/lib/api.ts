import type {
  AppConfig,
  Folder,
  Paged,
  Recording,
  RecordingNote,
  RecordingStats,
  RecordingSummary,
  User,
} from '../types';

const TOKEN_KEY = 'voicescribe.token';
const SERVER_KEY = 'voicescribe.serverUrl';

/** Set only for the desktop build (see .env.desktop); empty in the browser = same origin. */
const DEFAULT_SERVER = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

export const isDesktopBuild = DEFAULT_SERVER !== '';

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the value just is not remembered.
  }
}

export const getDefaultServerUrl = (): string => DEFAULT_SERVER;
export const getServerUrl = (): string => readStorage(SERVER_KEY) || DEFAULT_SERVER;

export function setServerUrl(url: string): void {
  const clean = url.trim().replace(/\/+$/, '');
  writeStorage(SERVER_KEY, clean && clean !== DEFAULT_SERVER ? clean : null);
}

export const getToken = (): string | null => readStorage(TOKEN_KEY);
export const setToken = (token: string | null): void => writeStorage(TOKEN_KEY, token);

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

function errorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'error' in body) return String((body as { error: unknown }).error);
  return `Lỗi máy chủ (${status}).`;
}

interface RequestOptions {
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`${getServerUrl()}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(`Không kết nối được máy chủ (${getServerUrl() || window.location.origin}).`, 0);
  }

  if (response.status === 204) return undefined as T;
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON error page from a proxy: fall through to the status message.
  }
  if (!response.ok) {
    if (response.status === 401 && token) {
      setToken(null);
      onUnauthorized?.();
    }
    throw new ApiError(errorMessage(body, response.status), response.status);
  }
  return body as T;
}

interface AuthResult {
  token: string;
  user: User;
}

export const api = {
  config: () => request<AppConfig>('GET', '/api/config'),

  auth: {
    login: (email: string, password: string) =>
      request<AuthResult>('POST', '/api/auth/login', { body: { email, password } }),
    register: (email: string, fullName: string, password: string, signupCode?: string) =>
      request<AuthResult>('POST', '/api/auth/register', {
        body: { email, fullName, password, signupCode },
      }),
    me: () => request<User>('GET', '/api/auth/me'),
    updateMe: (fullName: string) => request<User>('PUT', '/api/auth/me', { body: { fullName } }),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<void>('PUT', '/api/auth/password', { body: { currentPassword, newPassword } }),
  },

  folders: {
    list: () => request<Folder[]>('GET', '/api/folders'),
    create: (name: string) => request<Folder>('POST', '/api/folders', { body: { name } }),
    rename: (id: string, name: string) => request<Folder>('PUT', `/api/folders/${id}`, { body: { name } }),
    remove: (id: string) => request<void>('DELETE', `/api/folders/${id}`),
  },

  recordings: {
    list: (query: { q?: string; folderId?: string; page?: number; pageSize?: number }) =>
      request<Paged<RecordingSummary>>('GET', '/api/recordings', { query }),
    stats: () => request<RecordingStats>('GET', '/api/recordings/stats'),
    get: (id: string) => request<Recording>('GET', `/api/recordings/${id}`),
    update: (
      id: string,
      patch: {
        title?: string;
        folderId?: string | null;
        speakerNames?: Record<string, string>;
        notes?: Pick<RecordingNote, 'text'>[] | RecordingNote[];
      },
    ) => request<Recording>('PATCH', `/api/recordings/${id}`, { body: patch }),
    remove: (id: string) => request<void>('DELETE', `/api/recordings/${id}`),
  },
};

export interface TranscribeOptions {
  numSpeakers?: number;
  folderId?: string;
  title?: string;
}

/**
 * Uses XMLHttpRequest (not fetch) specifically for its upload.onprogress
 * event — this is how the UI's progress bar reflects real upload
 * progress. There is no equivalent event for the server-side
 * transcription work itself (the backend is synchronous), so progress
 * after 100% upload is shown as an indeterminate "processing" state,
 * not a fake percentage. The server saves the result and returns it.
 */
export function transcribeFile(
  file: File,
  options: TranscribeOptions,
  onUploadProgress: (percent: number) => void,
  signal?: AbortSignal,
): Promise<Recording> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${getServerUrl()}/api/transcribe`);
    const token = getToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onUploadProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      let body: unknown;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error('Máy chủ trả về dữ liệu không hợp lệ.'));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as Recording);
        return;
      }
      if (xhr.status === 401) {
        setToken(null);
        onUnauthorized?.();
      }
      reject(new ApiError(errorMessage(body, xhr.status), xhr.status));
    };

    xhr.onerror = () => reject(new Error('Không kết nối được tới máy chủ.'));
    xhr.onabort = () => reject(new DOMException('Đã hủy', 'AbortError'));
    signal?.addEventListener('abort', () => xhr.abort());

    const form = new FormData();
    form.append('audio', file, file.name);
    if (options.numSpeakers !== undefined) form.append('num_speakers', String(options.numSpeakers));
    if (options.folderId) form.append('folder_id', options.folderId);
    if (options.title) form.append('title', options.title);
    xhr.send(form);
  });
}
