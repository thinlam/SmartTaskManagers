import { httpClient } from './httpClient';

export interface AuthResponse {
  userId: string;
  email: string;
  token: string;
  expiresAt: string;
  language: string;
  theme: string;
}

/** Matches SmartTask.Api's AuthController (Phase 22) exactly — POST /api/auth/register, /login, PATCH /language, PATCH /theme. */
export const authApi = {
  register: (email: string, password: string, displayName?: string): Promise<AuthResponse> =>
    httpClient.post<AuthResponse>('/api/auth/register', { email, password, displayName }),
  login: (email: string, password: string): Promise<AuthResponse> =>
    httpClient.post<AuthResponse>('/api/auth/login', { email, password }),
  updateLanguage: (language: 'vi' | 'en'): Promise<void> =>
    httpClient.patch<void>('/api/auth/language', { language }),
  updateTheme: (theme: 'light' | 'dark'): Promise<void> =>
    httpClient.patch<void>('/api/auth/theme', { theme }),
};
