import { useState, type FormEvent } from 'react';
import { Button } from '@stm/ui';
import { ApiError, configureApiClient } from '@stm/api-client';
import { useAuthContext } from '../../state/AuthContext';
import { getStoredServerUrl, setStoredServerUrl } from '../../lib/serverUrl';

const fieldClasses =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-primary';
const labelClasses = 'text-xs font-semibold uppercase tracking-wide text-ink-muted';

/**
 * The one screen that exists outside AppShell entirely (Phase 27) — App.tsx
 * renders this instead of the router when there's no session, so there's
 * no Sidebar/Topbar to navigate away with. One form toggles between
 * Register and Login rather than being two routes, since there's nothing
 * else on this screen to route between.
 */
export function LoginPage() {
  const { login, register } = useAuthContext();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState(() => getStoredServerUrl());
  const [showServerField, setShowServerField] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const trimmedUrl = serverUrl.trim().replace(/\/+$/, '');
      configureApiClient({ baseUrl: trimmedUrl });
      setStoredServerUrl(trimmedUrl);
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, displayName || undefined);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not reach the server. Is the backend running?',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-lg border border-border bg-surface p-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-ink-primary">Smart Task</h1>
          <p className="text-sm text-ink-secondary">
            {mode === 'login' ? 'Sign in to your workspace.' : 'Create your workspace.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setShowServerField((current) => !current)}
              className="self-start text-xs font-medium text-ink-muted hover:text-ink-secondary hover:underline"
            >
              {showServerField ? 'Hide server address' : 'Connecting to a shared server?'}
            </button>
            {showServerField && (
              <div className="flex flex-col gap-1">
                <label htmlFor="login-server-url" className={labelClasses}>
                  Server URL
                </label>
                <input
                  id="login-server-url"
                  type="text"
                  placeholder="http://192.168.1.10:5277"
                  value={serverUrl}
                  onChange={(event) => setServerUrl(event.target.value)}
                  className={fieldClasses}
                />
                <p className="text-xs text-ink-muted">
                  Leave as-is if the backend runs on this same computer.
                </p>
              </div>
            )}
          </div>

          {mode === 'register' && (
            <div className="flex flex-col gap-1">
              <label htmlFor="login-display-name" className={labelClasses}>
                Name (optional)
              </label>
              <input
                id="login-display-name"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className={fieldClasses}
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="login-email" className={labelClasses}>
              Email
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={fieldClasses}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="login-password" className={labelClasses}>
              Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={fieldClasses}
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setMode((current) => (current === 'login' ? 'register' : 'login'));
          }}
          className="text-sm text-primary hover:underline"
        >
          {mode === 'login'
            ? "Don't have an account? Create one"
            : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
