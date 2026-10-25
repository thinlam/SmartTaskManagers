import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { api, getToken, setToken, setUnauthorizedHandler } from '../lib/api';
import { errorText } from '../lib/format';
import type { AppConfig, User } from '../types';

interface AuthState {
  user: User | null;
  /** True while a stored token is being verified on startup. */
  loading: boolean;
  config: AppConfig | null;
  setUser: (user: User) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, fullName: string, password: string, signupCode?: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const DEFAULT_CONFIG: AppConfig = {
  signupCodeRequired: false,
  diarizationEnabled: false,
  maxUploadMb: 100,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(getToken()));
  const [config, setConfig] = useState<AppConfig | null>(null);

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    api
      .config()
      .then(setConfig)
      .catch(() => setConfig(DEFAULT_CONFIG));
    if (!getToken()) return;
    api.auth
      .me()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      config,
      setUser,
      signOut,
      signIn: async (email, password) => {
        const result = await api.auth.login(email, password);
        setToken(result.token);
        setUser(result.user);
      },
      signUp: async (email, fullName, password, signupCode) => {
        const result = await api.auth.register(email, fullName, password, signupCode);
        setToken(result.token);
        setUser(result.user);
      },
    }),
    [user, loading, config, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

interface ToastItem {
  id: number;
  kind: 'success' | 'error';
  message: string;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((kind: ToastItem['kind'], message: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const api_ = useMemo<ToastApi>(
    () => ({ success: (m) => push('success', m), error: (m) => push('error', m) }),
    [push],
  );

  return (
    <ToastContext.Provider value={api_}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col gap-2"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-lg"
          >
            {t.kind === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

/** Runs `load` on mount and whenever `deps` change; `reload()` re-runs it. */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    load()
      .then((value) => {
        if (!active) return;
        setData(value);
        setError(null);
      })
      .catch((err: unknown) => active && setError(errorText(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, error, loading, setData, reload: () => setTick((n) => n + 1) };
}
