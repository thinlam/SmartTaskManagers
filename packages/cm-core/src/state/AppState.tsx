import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from '../api/client';
import type { Campaign, User } from '../api/types';
import { CheckCircle2, XCircle } from 'lucide-react';

/* ───────────── Auth ───────────── */

interface AuthValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, fullName: string, password: string) => Promise<void>;
  signOut: () => void;
  setUser: (u: User) => void;
}

const AuthCtx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!getToken());

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    api.auth
      .me()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      setUser,
      signOut,
      signIn: async (email, password) => {
        const r = await api.auth.login(email, password);
        setToken(r.token);
        setUser(r.user);
      },
      signUp: async (email, fullName, password) => {
        const r = await api.auth.register(email, fullName, password);
        setToken(r.token);
        setUser(r.user);
      },
    }),
    [user, loading, signOut],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(AuthCtx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}

/* ───────────── Lookups (members + campaigns) ───────────── */

interface LookupValue {
  members: User[];
  campaigns: Campaign[];
  refresh: () => Promise<void>;
}

const LookupCtx = createContext<LookupValue | null>(null);

export function LookupProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<User[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const refresh = useCallback(async () => {
    const [m, c] = await Promise.all([api.members.list(), api.campaigns.list()]);
    setMembers(m);
    setCampaigns(c);
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const value = useMemo(() => ({ members, campaigns, refresh }), [members, campaigns, refresh]);
  return <LookupCtx.Provider value={value}>{children}</LookupCtx.Provider>;
}

export function useLookups(): LookupValue {
  const v = useContext(LookupCtx);
  if (!v) throw new Error('useLookups must be used inside <LookupProvider>');
  return v;
}

/* ───────────── Toasts ───────────── */

interface Toast {
  id: number;
  kind: 'success' | 'error';
  message: string;
}
const ToastCtx = createContext<{ success: (m: string) => void; error: (m: string) => void } | null>(
  null,
);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: Toast['kind'], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const value = useMemo(
    () => ({ success: (m: string) => push('success', m), error: (m: string) => push('error', m) }),
    [push],
  );

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-20 right-4 z-[60] flex max-w-[calc(100vw-2rem)] flex-col gap-2 lg:bottom-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-center gap-2 rounded-md border border-line bg-surface px-4 py-3 text-sm font-medium shadow-pop"
          >
            {t.kind === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0 text-bad" />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const v = useContext(ToastCtx);
  if (!v) throw new Error('useToast must be used inside <ToastProvider>');
  return v;
}

/* ───────────── Data fetching hook ───────────── */

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    setLoading(true);
    fn()
      .then((d) => {
        if (live) {
          setData(d);
          setError(null);
        }
      })
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : 'Đã xảy ra lỗi.'))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [...deps, tick]);

  return { data, error, loading, reload: () => setTick((t) => t + 1), setData };
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Đã xảy ra lỗi.');
