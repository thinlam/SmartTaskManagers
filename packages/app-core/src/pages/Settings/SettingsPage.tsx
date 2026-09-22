import type { Priority, TaskStatus } from '@stm/types';
import { Switch } from '@stm/ui';
import { useTranslation } from 'react-i18next';
import { useSettingsContext } from '../../state/SettingsContext';
import { useAuthContext } from '../../state/AuthContext';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const STATUSES: TaskStatus[] = ['Inbox', 'To Do', 'In Progress', 'Waiting', 'Completed'];
const PRIORITIES: Priority[] = ['Critical', 'Urgent', 'High', 'Medium', 'Low'];

const fieldClasses =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-primary';
const labelClasses = 'text-xs font-semibold uppercase tracking-wide text-ink-muted';

/**
 * A 1:1 typed form over DEFAULT_SETTINGS (apps/google-sheets/src/
 * 00_Constants.gs), grouped into the same 4 categories (General/Task
 * Defaults/Focus & Schedule/Smart Engine). No Create/Edit distinction or
 * Save button like the other entity drawers — Settings is a single
 * object, so every field updates `SettingsContext` immediately on
 * change, the same way a native app's settings screen behaves.
 */
export function SettingsPage() {
  const { settings, updateSettings } = useSettingsContext();
  const { t, i18n } = useTranslation();
  const { setLanguage } = useAuthContext();

  const STATUS_LABELS: Record<TaskStatus, string> = {
    Inbox: t('settings.statusInbox'),
    'To Do': t('settings.statusToDo'),
    'In Progress': t('settings.statusInProgress'),
    Waiting: t('settings.statusWaiting'),
    Completed: t('settings.statusCompleted'),
  };
  const PRIORITY_LABELS: Record<Priority, string> = {
    Critical: t('settings.priorityCritical'),
    Urgent: t('settings.priorityUrgent'),
    High: t('settings.priorityHigh'),
    Medium: t('settings.priorityMedium'),
    Low: t('settings.priorityLow'),
  };
  const WEEKDAY_LABELS: Record<string, string> = {
    Monday: t('settings.weekdayMonday'),
    Tuesday: t('settings.weekdayTuesday'),
    Wednesday: t('settings.weekdayWednesday'),
    Thursday: t('settings.weekdayThursday'),
    Friday: t('settings.weekdayFriday'),
    Saturday: t('settings.weekdaySaturday'),
    Sunday: t('settings.weekdaySunday'),
  };

  return (
    <div className="flex flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">
          {t('settings.title')}
        </h1>
        <p className="text-sm text-ink-secondary">{t('settings.subtitle')}</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink-primary">{t('settings.sectionGeneral')}</h2>
        <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="settings-workspace-name" className={labelClasses}>
              {t('settings.fieldWorkspaceName')}
            </label>
            <input
              id="settings-workspace-name"
              type="text"
              value={settings.workspaceName}
              onChange={(event) => updateSettings({ workspaceName: event.target.value })}
              className={fieldClasses}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="settings-language" className={labelClasses}>
              {t('settings.language')}
            </label>
            <select
              id="settings-language"
              value={i18n.language}
              onChange={(event) => void setLanguage(event.target.value as 'vi' | 'en')}
              className={fieldClasses}
            >
              <option value="vi">{t('settings.languageVi')}</option>
              <option value="en">{t('settings.languageEn')}</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="settings-week-start" className={labelClasses}>
              {t('settings.fieldWeekStart')}
            </label>
            <select
              id="settings-week-start"
              value={settings.weekStart}
              onChange={(event) => updateSettings({ weekStart: event.target.value })}
              className={fieldClasses}
            >
              {WEEKDAYS.map((day) => (
                <option key={day} value={day}>
                  {WEEKDAY_LABELS[day]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="settings-date-format" className={labelClasses}>
              {t('settings.fieldDateFormat')}
            </label>
            <input
              id="settings-date-format"
              type="text"
              value={settings.dateFormat}
              onChange={(event) => updateSettings({ dateFormat: event.target.value })}
              className={fieldClasses}
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink-primary">
          {t('settings.sectionTaskDefaults')}
        </h2>
        <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="settings-default-status" className={labelClasses}>
              {t('settings.fieldDefaultStatus')}
            </label>
            <select
              id="settings-default-status"
              value={settings.defaultStatus}
              onChange={(event) =>
                updateSettings({ defaultStatus: event.target.value as TaskStatus })
              }
              className={fieldClasses}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="settings-default-priority" className={labelClasses}>
              {t('settings.fieldDefaultPriority')}
            </label>
            <select
              id="settings-default-priority"
              value={settings.defaultPriority}
              onChange={(event) =>
                updateSettings({ defaultPriority: event.target.value as Priority })
              }
              className={fieldClasses}
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="settings-default-estimate" className={labelClasses}>
              {t('settings.fieldDefaultEstimate')}
            </label>
            <input
              id="settings-default-estimate"
              type="number"
              min={0}
              value={settings.defaultEstimateMinutes}
              onChange={(event) =>
                updateSettings({ defaultEstimateMinutes: Number(event.target.value) })
              }
              className={fieldClasses}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="settings-due-soon-days" className={labelClasses}>
              {t('settings.fieldDueSoonDays')}
            </label>
            <input
              id="settings-due-soon-days"
              type="number"
              min={0}
              value={settings.dueSoonDays}
              onChange={(event) => updateSettings({ dueSoonDays: Number(event.target.value) })}
              className={fieldClasses}
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink-primary">
          {t('settings.sectionFocusSchedule')}
        </h2>
        <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="settings-focus-days-start" className={labelClasses}>
              {t('settings.fieldFocusDaysStart')}
            </label>
            <select
              id="settings-focus-days-start"
              value={settings.focusDaysStart}
              onChange={(event) => updateSettings({ focusDaysStart: event.target.value })}
              className={fieldClasses}
            >
              {WEEKDAYS.map((day) => (
                <option key={day} value={day}>
                  {WEEKDAY_LABELS[day]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="settings-focus-days-end" className={labelClasses}>
              {t('settings.fieldFocusDaysEnd')}
            </label>
            <select
              id="settings-focus-days-end"
              value={settings.focusDaysEnd}
              onChange={(event) => updateSettings({ focusDaysEnd: event.target.value })}
              className={fieldClasses}
            >
              {WEEKDAYS.map((day) => (
                <option key={day} value={day}>
                  {WEEKDAY_LABELS[day]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="settings-focus-window-start" className={labelClasses}>
              {t('settings.fieldFocusWindowStart')}
            </label>
            <input
              id="settings-focus-window-start"
              type="time"
              value={settings.focusWindowStart}
              onChange={(event) => updateSettings({ focusWindowStart: event.target.value })}
              className={fieldClasses}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="settings-focus-window-end" className={labelClasses}>
              {t('settings.fieldFocusWindowEnd')}
            </label>
            <input
              id="settings-focus-window-end"
              type="time"
              value={settings.focusWindowEnd}
              onChange={(event) => updateSettings({ focusWindowEnd: event.target.value })}
              className={fieldClasses}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="settings-daily-focus-limit" className={labelClasses}>
              {t('settings.fieldDailyFocusLimit')}
            </label>
            <input
              id="settings-daily-focus-limit"
              type="number"
              min={0}
              value={settings.dailyFocusLimitHours}
              onChange={(event) =>
                updateSettings({ dailyFocusLimitHours: Number(event.target.value) })
              }
              className={fieldClasses}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="settings-weekend" className={labelClasses}>
              {t('settings.fieldWeekend')}
            </label>
            <select
              id="settings-weekend"
              value={settings.weekend}
              onChange={(event) => updateSettings({ weekend: event.target.value })}
              className={fieldClasses}
            >
              {WEEKDAYS.map((day) => (
                <option key={day} value={day}>
                  {WEEKDAY_LABELS[day]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink-primary">
          {t('settings.sectionSmartEngine')}
        </h2>
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
          <SettingsToggleRow
            label={t('settings.toggleSmartScoreLabel')}
            description={t('settings.toggleSmartScoreDescription')}
            checked={settings.smartScoreEnabled}
            onCheckedChange={(checked) => updateSettings({ smartScoreEnabled: checked })}
          />
          <SettingsToggleRow
            label={t('settings.toggleGoalAlignmentLabel')}
            description={t('settings.toggleGoalAlignmentDescription')}
            checked={settings.goalAlignmentEnabled}
            onCheckedChange={(checked) => updateSettings({ goalAlignmentEnabled: checked })}
          />
          <SettingsToggleRow
            label={t('settings.toggleScheduleOverloadLabel')}
            description={t('settings.toggleScheduleOverloadDescription')}
            checked={settings.scheduleOverloadWarning}
            onCheckedChange={(checked) => updateSettings({ scheduleOverloadWarning: checked })}
          />
          <SettingsToggleRow
            label={t('settings.toggleExplainRecommendationsLabel')}
            description={t('settings.toggleExplainRecommendationsDescription')}
            checked={settings.explainRecommendations}
            onCheckedChange={(checked) => updateSettings({ explainRecommendations: checked })}
          />
        </div>
        <p className="text-xs text-ink-muted">{t('settings.smartEngineHelperText')}</p>
      </section>
    </div>
  );
}

interface SettingsToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function SettingsToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: SettingsToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-ink-primary">{label}</span>
        <span className="text-xs text-ink-muted">{description}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}
