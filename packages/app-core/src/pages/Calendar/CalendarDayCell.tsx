import type { Task } from '@stm/types';
import {
  CALENDAR_MAX_TASKS_PER_DAY,
  getCalendarTaskTone,
  type CalendarDay,
  type CalendarTaskTone,
} from '@stm/shared';
import { Check, Circle, Diamond, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@stm/ui';

const TONE_CLASSES: Record<CalendarTaskTone, string> = {
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger font-semibold',
  warning: 'bg-warning-soft text-warning font-semibold',
  neutral: 'bg-surface-secondary text-ink-secondary',
};

const TONE_ICON: Record<CalendarTaskTone, typeof Check> = {
  success: Check,
  danger: TriangleAlert,
  warning: Diamond,
  neutral: Circle,
};

interface CalendarDayCellProps {
  day: CalendarDay;
  /** CalendarMonthData.today — passed down rather than reading day.date, since a day's own tasks always share its date. */
  today: Date;
  onSelectTask: (task: Task) => void;
}

/**
 * Ported from writeCalendarDayCard_() — date header (dims outside the
 * current month, highlights today, tints red when a past day still has
 * open tasks), up to CALENDAR_MAX_TASKS_PER_DAY task chips (icon+tone
 * from getCalendarTaskTone(), replacing the spreadsheet's ✓/!/◆/• prefix
 * glyphs with Lucide icons — the desktop app has room for real icons, the
 * Sheets version didn't), and a footer text ("No tasks"/"1 task"/"N
 * tasks", "+N more" when truncated).
 */
export function CalendarDayCell({ day, today, onSelectTask }: CalendarDayCellProps) {
  const { t } = useTranslation();
  const visibleTasks = day.tasks.slice(0, CALENDAR_MAX_TASKS_PER_DAY);
  const hiddenCount = Math.max(0, day.tasks.length - visibleTasks.length);

  let footerText = t('calendar.noTasks');
  if (day.tasks.length === 1) footerText = t('calendar.oneTask');
  else if (day.tasks.length > 1) footerText = t('calendar.tasksCount', { count: day.tasks.length });
  if (hiddenCount > 0) footerText += `  •  ${t('calendar.moreCount', { count: hiddenCount })}`;

  return (
    <div
      className={cn(
        'flex min-h-[104px] flex-col gap-1 border border-border p-1.5',
        !day.isCurrentMonth && 'bg-background',
        day.isCurrentMonth && day.isWeekend && 'bg-surface-secondary/40',
        day.isCurrentMonth && !day.isWeekend && 'bg-surface',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between rounded px-1.5 py-0.5 text-xs font-semibold',
          day.isToday && 'bg-primary text-white',
          !day.isToday && day.hasOverdue && 'bg-danger-soft text-danger',
          !day.isToday &&
            !day.hasOverdue &&
            (day.isCurrentMonth ? 'text-ink-primary' : 'text-ink-muted'),
        )}
      >
        <span>{day.date.getDate()}</span>
        {day.isToday && (
          <span className="text-[10px] tracking-wide">{t('calendar.todayBadge')}</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-0.5">
        {visibleTasks.map((task) => {
          const tone = getCalendarTaskTone(task, today);
          const Icon = TONE_ICON[tone];
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => onSelectTask(task)}
              className={cn(
                'flex items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px]',
                TONE_CLASSES[tone],
              )}
              title={task.title}
            >
              <Icon className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{task.title}</span>
            </button>
          );
        })}
      </div>

      <span className="text-[10px] text-ink-muted">{footerText}</span>
    </div>
  );
}
