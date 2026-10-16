import type { Task } from '@stm/types';
import type { CalendarDay } from '@stm/shared';
import { useTranslation } from 'react-i18next';
import { CalendarDayCell } from './CalendarDayCell';

const WEEKDAY_KEYS = [
  'weekdayMon',
  'weekdayTue',
  'weekdayWed',
  'weekdayThu',
  'weekdayFri',
  'weekdaySat',
  'weekdaySun',
] as const;

interface CalendarWeekGridProps {
  /** Exactly 7 consecutive CalendarDay entries (Monday–Sunday) — the week containing the selected day. */
  weekDays: CalendarDay[];
  today: Date;
  selectedDateKey: string;
  onSelectDay: (day: CalendarDay) => void;
  onSelectTask: (task: Task) => void;
}

/**
 * The Week tab (Frame 09) — same CalendarDayCell used by the Month grid,
 * just one row instead of six, so a day's tasks aren't truncated to 4
 * chips the way a packed month view needs to.
 */
export function CalendarWeekGrid({
  weekDays,
  today,
  selectedDateKey,
  onSelectDay,
  onSelectTask,
}: CalendarWeekGridProps) {
  const { t } = useTranslation();

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-surface-secondary">
        {WEEKDAY_KEYS.map((weekdayKey) => (
          <div
            key={weekdayKey}
            className="px-2 py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-ink-secondary"
          >
            {t(`calendar.${weekdayKey}`)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weekDays.map((day) => (
          <CalendarDayCell
            key={day.dateKey}
            day={day}
            today={today}
            isSelected={day.dateKey === selectedDateKey}
            onSelectDay={onSelectDay}
            onSelectTask={onSelectTask}
          />
        ))}
      </div>
    </div>
  );
}
