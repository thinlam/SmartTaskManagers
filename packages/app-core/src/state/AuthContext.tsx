import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi, setAuthToken } from '@stm/api-client';

const STORAGE_KEY = 'stm.auth';

interface StoredAuth {
  token: string;
  email: string;
  expiresAt: string;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  email: string | null;
  /** True only while reading localStorage on first mount — not for login/register's own in-flight state, that's each form's own concern. */
  isHydrating: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
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

/**
 * New in Phase 27 — the desktop app talks to a real backend now
 * (SmartTask.Api, Phase 22), so it needs a real session instead of
 * opening straight into the app shell. Token persists in
 * `localStorage` (not React state alone) so closing and reopening the
 * Tauri window doesn't force a re-login every time; `@stm/api-client`'s
 * module-level `authToken` (set via `setAuthToken`) is what every other
 * API call actually reads, this context is just the React-facing wrapper
 * around it plus the login/register forms.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    const stored = readStoredAuth();
    if (stored) {
      setAuthToken(stored.token);
      setAuth(stored);
    }
    setIsHydrating(false);
  }, []);

  function persist(next: StoredAuth) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setAuthToken(next.token);
    setAuth(next);
  }

  async function login(email: string, password: string) {
    const result = await authApi.login(email, password);
    persist({ token: result.token, email: result.email, expiresAt: result.expiresAt });
  }

  async function register(email: string, password: string, displayName?: string) {
    const result = await authApi.register(email, password, displayName);
    persist({ token: result.token, email: result.email, expiresAt: result.expiresAt });
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setAuthToken(null);
    setAuth(null);
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: auth !== null,
        email: auth?.email ?? null,
        isHydrating,
        login,
        register,
        logout,
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
