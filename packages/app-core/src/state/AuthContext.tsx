import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi, setAuthToken } from '@stm/api-client';
import i18n from '../i18n';

const STORAGE_KEY = 'stm.auth';

interface StoredAuth {
  token: string;
  email: string;
  expiresAt: string;
  language: string;
  theme: string;
  avatarDataUrl: string | null;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  email: string | null;
  theme: string | null;
  avatarDataUrl: string | null;
  /** True only while reading localStorage on first mount — not for login/register's own in-flight state, that's each form's own concern. */
  isHydrating: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  setLanguage: (language: 'vi' | 'en') => Promise<void>;
  setTheme: (theme: 'light' | 'dark') => Promise<void>;
  setAvatar: (avatarBase64: string, contentType: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuth;
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function applyTheme(theme: string) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    const stored = readStoredAuth();
    if (stored) {
      setAuthToken(stored.token);
      setAuth(stored);
      void i18n.changeLanguage(stored.language);
      applyTheme(stored.theme);
    }
    setIsHydrating(false);
  }, []);

  function persist(next: StoredAuth) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    localStorage.setItem('stm.language', next.language);
    localStorage.setItem('stm.theme', next.theme);
    setAuthToken(next.token);
    setAuth(next);
    void i18n.changeLanguage(next.language);
    applyTheme(next.theme);
  }

  async function login(email: string, password: string) {
    const result = await authApi.login(email, password);
    persist({
      token: result.token,
      email: result.email,
      expiresAt: result.expiresAt,
      language: result.language,
      theme: result.theme,
      avatarDataUrl: result.avatarDataUrl,
    });
  }

  async function register(email: string, password: string, displayName?: string) {
    const result = await authApi.register(email, password, displayName);
    persist({
      token: result.token,
      email: result.email,
      expiresAt: result.expiresAt,
      language: result.language,
      theme: result.theme,
      avatarDataUrl: result.avatarDataUrl,
    });
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch (error) {
      // A failed revoke call must never trap the user in a "logged in"
      // UI they can't leave — log it and proceed with local sign-out
      // regardless.
      console.error('Failed to revoke session on logout:', error);
    }
    // Deliberately leaves the `dark` class / stm.theme in place — the
    // login screen keeps the last-used theme (LoginPage's own fallback
    // reads stm.theme), and persist() re-applies the next user's real
    // theme on their next login.
    localStorage.removeItem(STORAGE_KEY);
    setAuthToken(null);
    setAuth(null);
  }

  async function setLanguage(language: 'vi' | 'en') {
    try {
      await authApi.updateLanguage(language);
    } catch (error) {
      console.error('Failed to persist language preference:', error);
      throw error;
    }
    void i18n.changeLanguage(language);
    if (auth) {
      persist({ ...auth, language });
    }
  }

  async function setTheme(theme: 'light' | 'dark') {
    try {
      await authApi.updateTheme(theme);
    } catch (error) {
      console.error('Failed to persist theme preference:', error);
      throw error;
    }
    applyTheme(theme);
    if (auth) {
      persist({ ...auth, theme });
    }
  }

  async function setAvatar(avatarBase64: string, contentType: string) {
    await authApi.updateAvatar(avatarBase64, contentType);
    const avatarDataUrl = `data:${contentType};base64,${avatarBase64}`;
    if (auth) {
      persist({ ...auth, avatarDataUrl });
    }
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: auth !== null,
        email: auth?.email ?? null,
        theme: auth?.theme ?? null,
        avatarDataUrl: auth?.avatarDataUrl ?? null,
        isHydrating,
        login,
        register,
        logout,
        setLanguage,
        setTheme,
        setAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
