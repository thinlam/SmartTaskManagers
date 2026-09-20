import type { Task } from '@stm/types';
import type { CalendarMonthData } from '@stm/shared';
import { CalendarDayCell } from './CalendarDayCell';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface CalendarGridProps {
  data: CalendarMonthData;
  onSelectTask: (task: Task) => void;
}

/** Ported layout from writeCalendarWeekdays_()/writeCalendarGrid_() — Monday-start weekday header + the 42-cell (6×7) grid. */
export function CalendarGrid({ data, onSelectTask }: CalendarGridProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-surface-secondary">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="px-2 py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-ink-secondary"
          >
            {weekday}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {data.days.map((day) => (
          <CalendarDayCell
            key={day.dateKey}
            day={day}
            today={data.today}
            onSelectTask={onSelectTask}
          />
        ))}
      </div>
    </div>
  );
}
