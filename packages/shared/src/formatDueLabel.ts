/** `packages/shared` has no i18n access — callers with a real `useTranslation()` `t` pass it in for a translated label; omitting it falls back to English (keeps this function usable/testable with no i18n setup). */
export type DueLabelTranslate = (key: string, options?: Record<string, unknown>) => string;

/**
 * Turns an ISO due date into the same relative labels used across the
 * app ("Due today", "Due tomorrow", "Overdue 2 days", "Due in 3 days",
 * "No due date") — matches Frame 05 (Tasks table)'s day-count wording
 * and the phrasing already used in apps/desktop's Dashboard/Today/Inbox
 * mock data, so a value computed here reads identically to those
 * hand-written strings. Not a 1:1 port of
 * apps/google-sheets/src/07_Today.gs's todayDueLabel_() — that function
 * deliberately drops the day count ("Overdue", "Tomorrow") to fit a
 * narrower spreadsheet cell; a desktop list has room for the count.
 */
export function formatDueLabel(
  dueDate: string | null,
  referenceDate: Date = new Date(),
  t?: DueLabelTranslate,
): string {
  if (!dueDate) return t ? t('common.noDueDate') : 'No due date';

  const due = stripToCalendarDate(new Date(dueDate));
  const today = stripToCalendarDate(referenceDate);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0) {
    const days = Math.abs(diffDays);
    return t
      ? t('common.overdueDays', { count: days })
      : `Overdue ${days} day${days === 1 ? '' : 's'}`;
  }
  if (diffDays === 0) return t ? t('common.dueToday') : 'Due today';
  if (diffDays === 1) return t ? t('common.dueTomorrow') : 'Due tomorrow';
  return t ? t('common.dueInDays', { count: diffDays }) : `Due in ${diffDays} days`;
}

function stripToCalendarDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
