import { httpClient } from './httpClient';

export interface AuthResponse {
  userId: string;
  email: string;
  token: string;
  expiresAt: string;
  language: string;
  theme: string;
  avatarDataUrl: string | null;
}

export interface SessionResponse {
  id: string;
  deviceLabel: string;
  ipAddress: string | null;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

/** Matches SmartTask.Api's AuthController exactly. */
export const authApi = {
  register: (email: string, password: string, displayName?: string): Promise<AuthResponse> =>
    httpClient.post<AuthResponse>('/api/auth/register', { email, password, displayName }),
  login: (email: string, password: string): Promise<AuthResponse> =>
    httpClient.post<AuthResponse>('/api/auth/login', { email, password }),
  updateLanguage: (language: 'vi' | 'en'): Promise<void> =>
    httpClient.patch<void>('/api/auth/language', { language }),
  updateTheme: (theme: 'light' | 'dark'): Promise<void> =>
    httpClient.patch<void>('/api/auth/theme', { theme }),
  updateAvatar: (avatarBase64: string, contentType: string): Promise<void> =>
    httpClient.patch<void>('/api/auth/avatar', { avatarBase64, contentType }),
  changePassword: (currentPassword: string, newPassword: string): Promise<void> =>
    httpClient.patch<void>('/api/auth/password', { currentPassword, newPassword }),
  listSessions: (): Promise<SessionResponse[]> => httpClient.get<SessionResponse[]>('/api/auth/sessions'),
  revokeSession: (id: string): Promise<void> => httpClient.delete(`/api/auth/sessions/${id}`),
  revokeOtherSessions: (): Promise<void> =>
    httpClient.post<void>('/api/auth/sessions/revoke-others', undefined),
  logout: (): Promise<void> => httpClient.post<void>('/api/auth/logout', undefined),
};
