import { useEffect, useMemo, useRef, useState } from 'react';
import { UserCog, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authApi, ApiError, type SessionResponse } from '@stm/api-client';
import { Switch, PasswordStrengthChecklist } from '@stm/ui';
import { useAuthContext } from '../../state/AuthContext';
import { PASSWORD_RULES } from '../../lib/passwordRules';

const fieldClasses =
  'w-full rounded-md border border-border bg-surface px-3 py-2 pr-10 text-sm text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-primary';
const plainFieldClasses =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-primary';
const readOnlyFieldClasses =
  'w-full rounded-md border border-border bg-surface-secondary px-3 py-2 text-sm text-ink-secondary';
const labelClasses = 'text-xs font-semibold uppercase tracking-wide text-ink-muted';
const sectionCardClasses = 'flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm';

const MAX_AVATAR_BYTES = 1_500_000;
const AVATAR_CANVAS_SIZE = 256;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Draws `file` onto a square canvas (center-cropped, resized to AVATAR_CANVAS_SIZE) and returns a base64 JPEG — keeps every upload small regardless of the source photo's size. */
async function resizeAvatarToBase64(file: File): Promise<string> {
  const imageBitmap = await createImageBitmap(file);
  const side = Math.min(imageBitmap.width, imageBitmap.height);
  const sx = (imageBitmap.width - side) / 2;
  const sy = (imageBitmap.height - side) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_CANVAS_SIZE;
  canvas.height = AVATAR_CANVAS_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');
  ctx.drawImage(imageBitmap, sx, sy, side, side, 0, 0, AVATAR_CANVAS_SIZE, AVATAR_CANVAS_SIZE);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  return dataUrl.split(',')[1] ?? '';
}

function formatRelativeTime(iso: string, activeNowLabel: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 2 * 60 * 1000) return activeNowLabel;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function AccountSettingsPage() {
  const { t, i18n } = useTranslation();
  const { email, avatarDataUrl, setAvatar, setLanguage, theme, setTheme } = useAuthContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const passwordRuleResults = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, met: rule.test(newPassword) })),
    [newPassword],
  );
  const isNewPasswordValid = passwordRuleResults.every((rule) => rule.met);
  const passwordsMatch = newPassword === confirmNewPassword;
  const canSubmitPassword =
    currentPassword.length > 0 && isNewPasswordValid && passwordsMatch && !isChangingPassword;

  async function loadSessions() {
    setSessionsLoading(true);
    try {
      const list = await authApi.listSessions();
      setSessions(list);
    } finally {
      setSessionsLoading(false);
    }
  }

  useEffect(() => {
    void loadSessions();
  }, []);

  async function handleAvatarFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setAvatarError(null);
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setAvatarError(t('accountSettings.avatarInvalidType'));
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const base64 = await resizeAvatarToBase64(file);
      const byteLength = Math.ceil((base64.length * 3) / 4);
      if (byteLength > MAX_AVATAR_BYTES) {
        setAvatarError(t('accountSettings.avatarTooLarge'));
        return;
      }
      await setAvatar(base64, 'image/jpeg');
    } catch (error) {
      setAvatarError(error instanceof ApiError ? error.message : t('accountSettings.avatarTooLarge'));
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    setIsChangingPassword(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      void loadSessions();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setPasswordError(t('accountSettings.wrongCurrentPassword'));
      } else {
        setPasswordError(error instanceof ApiError ? error.message : t('auth.genericError'));
      }
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleRevoke(id: string) {
    await authApi.revokeSession(id);
    void loadSessions();
  }

  async function handleRevokeOthers() {
    await authApi.revokeOtherSessions();
    void loadSessions();
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white">
          <UserCog className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">
            {t('accountSettings.title')}
          </h1>
          <p className="text-sm text-ink-secondary">{t('accountSettings.subtitle')}</p>
        </div>
      </header>

      {/* Profile */}
      <section className={sectionCardClasses}>
        <div className="flex items-center gap-4">
          {avatarDataUrl ? (
            <img
              src={avatarDataUrl}
              alt=""
              className="h-16 w-16 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-white">
              {(email ?? '?').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="self-start text-sm font-medium text-primary hover:underline disabled:opacity-50"
            >
              {t('accountSettings.changePhoto')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => void handleAvatarFileChange(event)}
              className="hidden"
            />
            {avatarError && <p className="text-xs text-danger">{avatarError}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label htmlFor="account-settings-email" className={labelClasses}>
              {t('accountSettings.emailLabel')}
            </label>
            <input
              id="account-settings-email"
              type="email"
              value={email ?? ''}
              readOnly
              className={readOnlyFieldClasses}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="account-settings-language" className={labelClasses}>
              {t('settings.language')}
            </label>
            <select
              id="account-settings-language"
              value={i18n.language}
              onChange={(event) => void setLanguage(event.target.value as 'vi' | 'en')}
              className={plainFieldClasses}
            >
              <option value="vi">{t('settings.languageVi')}</option>
              <option value="en">{t('settings.languageEn')}</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="account-settings-dark-mode" className={labelClasses}>
              {t('settings.darkMode')}
            </label>
            <div className="flex items-center gap-2 pt-1">
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => void setTheme(checked ? 'dark' : 'light')}
                aria-label={t('settings.darkMode')}
              />
              <span className="text-sm text-ink-secondary">
                {theme === 'dark' ? t('settings.darkModeOn') : t('settings.darkModeOff')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className={sectionCardClasses}>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-ink-primary">{t('accountSettings.securityTitle')}</h2>
          <p className="text-sm text-ink-secondary">{t('accountSettings.securitySubtitle')}</p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="account-settings-current-password" className={labelClasses}>
              {t('accountSettings.currentPasswordLabel')}
            </label>
            <div className="relative">
              <input
                id="account-settings-current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className={fieldClasses}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((current) => !current)}
                aria-label={showCurrentPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-muted hover:text-ink-secondary"
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="account-settings-new-password" className={labelClasses}>
              {t('accountSettings.newPasswordLabel')}
            </label>
            <div className="relative">
              <input
                id="account-settings-new-password"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className={fieldClasses}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((current) => !current)}
                aria-label={showNewPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-muted hover:text-ink-secondary"
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <PasswordStrengthChecklist
            results={passwordRuleResults.map((rule) => ({
              key: rule.key,
              label: t(rule.labelKey),
              met: rule.met,
            }))}
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="account-settings-confirm-new-password" className={labelClasses}>
              {t('accountSettings.confirmNewPasswordLabel')}
            </label>
            <input
              id="account-settings-confirm-new-password"
              type={showNewPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              className={plainFieldClasses}
            />
            {confirmNewPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs text-danger">{t('auth.passwordMismatch')}</p>
            )}
          </div>

          {passwordError && <p className="text-sm text-danger">{passwordError}</p>}
          {passwordSuccess && <p className="text-sm text-success">{t('accountSettings.passwordUpdated')}</p>}

          <button
            type="submit"
            disabled={!canSubmitPassword}
            className="self-start rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {t('accountSettings.updatePasswordButton')}
          </button>
        </form>
      </section>

      {/* Active Sessions */}
      <section className={sectionCardClasses}>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-ink-primary">{t('accountSettings.sessionsTitle')}</h2>
          <p className="text-sm text-ink-secondary">{t('accountSettings.sessionsSubtitle')}</p>
        </div>

        {!sessionsLoading && (
          <div className="flex flex-col divide-y divide-border">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-ink-primary">
                    {session.deviceLabel}
                    {session.ipAddress ? ` · ${session.ipAddress}` : ''}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {formatRelativeTime(session.lastActiveAt, t('accountSettings.activeNow'))}
                  </span>
                </div>
                {session.isCurrent ? (
                  <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-primary">
                    {t('accountSettings.thisDevice')}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleRevoke(session.id)}
                    className="text-sm font-medium text-danger hover:underline"
                  >
                    {t('accountSettings.revoke')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {sessions.some((s) => !s.isCurrent) && (
          <button
            type="button"
            onClick={() => void handleRevokeOthers()}
            className="self-start text-sm font-medium text-danger hover:underline"
          >
            {t('accountSettings.revokeOthers')}
          </button>
        )}
      </section>
    </div>
  );
}
