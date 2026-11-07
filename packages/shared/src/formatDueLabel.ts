import type { TaskStatus } from '@stm/types';

/** `packages/shared` has no i18n access — callers with a real `useTranslation()` `t` pass it in for a translated label; omitting it falls back to English (keeps this function usable/testable with no i18n setup). */
export type DueLabelTranslate = (key: string, options?: Record<string, unknown>) => string;

/** "Overdue" is a computed state, never stored: a task counts as overdue only while its
 * status isn't Completed. A completed task must never show "Overdue N days" regardless of
 * how far in the past its due date is. */
export interface DueLabelTaskInfo {
  status?: TaskStatus;
  completedDate?: string | null;
}

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
 *
 * A Completed task short-circuits to "Completed on dd/MM/yyyy" — it never reads as
 * overdue even when its due date is long past.
 */
export function formatDueLabel(
  dueDate: string | null,
  referenceDate: Date = new Date(),
  t?: DueLabelTranslate,
  task?: DueLabelTaskInfo,
): string {
  if (task?.status === 'Completed') {
    const completedOn = task.completedDate ?? dueDate;
    if (!completedOn) return t ? t('common.noDueDate') : 'Chưa có hạn';
    const label = formatDateVi(new Date(completedOn));
    return t ? t('common.completedOn', { date: label }) : `Hoàn thành ngày ${label}`;
  }

  if (!dueDate) return t ? t('common.noDueDate') : 'Chưa có hạn';

  const due = stripToCalendarDate(new Date(dueDate));
  const today = stripToCalendarDate(referenceDate);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0) {
    const days = Math.abs(diffDays);
    return t ? t('common.overdueDays', { count: days }) : `Quá hạn ${days} ngày`;
  }
  if (diffDays === 0) return t ? t('common.dueToday') : 'Đến hạn hôm nay';
  if (diffDays === 1) return t ? t('common.dueTomorrow') : 'Đến hạn ngày mai';
  return t ? t('common.dueInDays', { count: diffDays }) : `Còn ${diffDays} ngày`;
}

function stripToCalendarDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Formats a date as `dd/MM/yyyy` — the single date format used across the app. */
export function formatDateVi(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
