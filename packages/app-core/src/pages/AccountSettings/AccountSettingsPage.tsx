import { UserCog } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@stm/ui';
import { useAuthContext } from '../../state/AuthContext';

const fieldClasses =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-primary';
const readOnlyFieldClasses =
  'w-full rounded-md border border-border bg-surface-secondary px-3 py-2 text-sm text-ink-secondary';
const labelClasses = 'text-xs font-semibold uppercase tracking-wide text-ink-muted';
const sectionCardClasses =
  'grid grid-cols-1 gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:grid-cols-2';

/**
 * Reached only via the Topbar's account menu (Sign Out neighbor) — never
 * a Sidebar nav item. Deliberately separate from the general Settings
 * page (workspace/task-defaults/focus/Smart Engine): this page is about
 * the account itself, so it holds the two preferences the backend already
 * persists per-User (Language, Theme) rather than app-wide behavior.
 */
export function AccountSettingsPage() {
  const { t, i18n } = useTranslation();
  const { email, setLanguage, theme, setTheme } = useAuthContext();

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

      <section className="flex flex-col gap-3">
        <div className={sectionCardClasses}>
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
              className={fieldClasses}
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
    </div>
  );
}
