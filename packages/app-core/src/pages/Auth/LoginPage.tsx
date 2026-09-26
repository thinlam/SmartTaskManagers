import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, ListChecks } from 'lucide-react';
import { Button, PasswordStrengthChecklist } from '@stm/ui';
import { ApiError, configureApiClient } from '@stm/api-client';
import { useAuthContext } from '../../state/AuthContext';
import { getStoredServerUrl } from '../../lib/serverUrl';
import { PASSWORD_RULES } from '../../lib/passwordRules';
import i18n from '../../i18n';

const fieldClasses =
  'w-full rounded-md border border-border bg-surface px-3 py-2 pr-10 text-sm text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-primary';
const plainFieldClasses =
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
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverUrl] = useState(() => getStoredServerUrl());
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const storedLanguage = localStorage.getItem('stm.language');
    if (storedLanguage === 'vi' || storedLanguage === 'en') {
      void i18n.changeLanguage(storedLanguage);
    }
    const storedTheme = localStorage.getItem('stm.theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      document.documentElement.classList.toggle('dark', storedTheme === 'dark');
    }
  }, []);

  const passwordRuleResults = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, met: rule.test(password) })),
    [password],
  );
  const isPasswordValid = passwordRuleResults.every((rule) => rule.met);
  const passwordsMatch = password === confirmPassword;
  const isRegisterValid = mode === 'login' || (isPasswordValid && passwordsMatch);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const trimmedUrl = serverUrl.trim().replace(/\/+$/, '');
      configureApiClient({ baseUrl: trimmedUrl });
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, displayName || undefined);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-primary-light/40 p-8">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border border-border bg-surface p-8 shadow-lg">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white">
            <ListChecks className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold text-ink-primary">{t('auth.appName')}</h1>
            <p className="text-sm text-ink-secondary">
              {mode === 'login' ? t('auth.signInSubtitle') : t('auth.registerSubtitle')}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <div className="flex flex-col gap-1">
              <label htmlFor="login-display-name" className={labelClasses}>
                {t('auth.displayNameLabel')}
              </label>
              <input
                id="login-display-name"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className={plainFieldClasses}
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="login-email" className={labelClasses}>
              {t('auth.emailLabel')}
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={plainFieldClasses}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="login-password" className={labelClasses}>
              {t('auth.passwordLabel')}
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={fieldClasses}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-muted hover:text-ink-secondary"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <>
              <PasswordStrengthChecklist
                results={passwordRuleResults.map((rule) => ({
                  key: rule.key,
                  label: t(rule.labelKey),
                  met: rule.met,
                }))}
              />

              <div className="flex flex-col gap-1">
                <label htmlFor="login-confirm-password" className={labelClasses}>
                  {t('auth.confirmPasswordLabel')}
                </label>
                <div className="relative">
                  <input
                    id="login-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className={fieldClasses}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    aria-label={
                      showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')
                    }
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-muted hover:text-ink-secondary"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-xs text-danger">{t('auth.passwordMismatch')}</p>
                )}
              </div>
            </>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" variant="primary" disabled={isSubmitting || !isRegisterValid}>
            {isSubmitting
              ? t('auth.submitting')
              : mode === 'login'
                ? t('auth.signInButton')
                : t('auth.registerButton')}
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
          {mode === 'login' ? t('auth.switchToRegister') : t('auth.switchToLogin')}
        </button>
      </div>
    </div>
  );
}
