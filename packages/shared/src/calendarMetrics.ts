import type { Task } from '@stm/types';

/** Matches CALENDAR_LAYOUT.maxTasksPerDay in apps/google-sheets/src/12_Calendar.gs. */
export const CALENDAR_MAX_TASKS_PER_DAY = 4;
/** Matches CALENDAR_LAYOUT.agendaMaxRows. */
export const CALENDAR_AGENDA_MAX_ROWS = 12;

function stripTime(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function today(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Ported from calendarDateKey_() — used to group tasks by due date. */
export function calendarDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Ported from getCalendarGridStart_() — the grid's first cell is always
 * the Monday of the week containing the 1st of the month (matches
 * DEFAULT_SETTINGS's WeekStart: 'Monday' in 00_Constants.gs), even when
 * that Monday falls in the previous month.
 */
function getCalendarGridStart(monthStart: Date): Date {
  const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate());
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function priorityWeight(priority: Task['priority']): number {
  switch (priority) {
    case 'Critical':
      return 5;
    case 'Urgent':
      return 4;
    case 'High':
      return 3;
    case 'Medium':
      return 2;
    case 'Low':
      return 1;
    default:
      return 0;
  }
}

/**
 * Ported from calendarTaskSort_() — open tasks before completed, then by
 * priority (Critical highest), then by SmartScore descending.
 */
export function sortCalendarTasks(a: Task, b: Task): number {
  const aCompleted = a.status === 'Completed';
  const bCompleted = b.status === 'Completed';
  if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;

  const priorityDiff = priorityWeight(b.priority) - priorityWeight(a.priority);
  if (priorityDiff !== 0) return priorityDiff;

  return (b.smartScore ?? 0) - (a.smartScore ?? 0);
}

export type CalendarTaskTone = 'success' | 'danger' | 'warning' | 'neutral';

/**
 * Ported from getCalendarTaskTone_() — same severity order (Completed >
 * overdue > Critical/Urgent > High > default), collapsed to this app's
 * named semantic tones (bg-success/-danger/-warning + neutral) instead of
 * the literal hex CALENDAR_THEME used, the same substitution
 * ProjectCard/GoalCard already make elsewhere for tone.
 */
export function getCalendarTaskTone(task: Task, referenceDate: Date): CalendarTaskTone {
  if (task.status === 'Completed') return 'success';

  const due = stripTime(task.dueDate);
  if (due && due.getTime() < referenceDate.getTime()) return 'danger';
  if (task.priority === 'Critical' || task.priority === 'Urgent') return 'danger';
  if (task.priority === 'High') return 'warning';
  return 'neutral';
}

export interface CalendarDay {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  /** Tasks due this day, sorted by sortCalendarTasks(). */
  tasks: Task[];
  /** This day is in the past and has open (non-Completed) tasks. */
  hasOverdue: boolean;
}

export interface CalendarMonthData {
  anchor: Date;
  monthStart: Date;
  monthEnd: Date;
  gridStart: Date;
  gridEnd: Date;
  today: Date;
  /** Always 42 entries (6 weeks × 7 days) — matches CALENDAR_LAYOUT.weeks. */
  days: CalendarDay[];
  scheduledThisMonth: Task[];
  dueToday: Task[];
  overdue: Task[];
  completedThisMonth: Task[];
  unscheduled: Task[];
  /** Overdue + upcoming within the visible grid, capped at CALENDAR_AGENDA_MAX_ROWS. */
  agenda: Task[];
}

/**
 * Ported from computeCalendarData_() — same grouping, same KPI filters
 * (scheduledThisMonth/dueToday/overdue/completedThisMonth/unscheduled),
 * same agenda selection and sort. `days` replaces the Sheets version's
 * separate `tasksByDate` map with the 42-cell grid pre-built, since
 * that's what a React grid actually renders from.
 */
export function computeCalendarMonthData(anchor: Date, allTasks: Task[]): CalendarMonthData {
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const gridStart = getCalendarGridStart(monthStart);
  const gridEnd = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + 41);
  const referenceDate = today();

  const tasksByDate: Record<string, Task[]> = {};
  for (const task of allTasks) {
    const due = stripTime(task.dueDate);
    if (!due) continue;
    const key = calendarDateKey(due);
    if (!tasksByDate[key]) tasksByDate[key] = [];
    tasksByDate[key].push(task);
  }
  for (const dayTasks of Object.values(tasksByDate)) {
    dayTasks.sort(sortCalendarTasks);
  }

  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    const dateKey = calendarDateKey(date);
    const tasks = tasksByDate[dateKey] ?? [];
    const isCurrentMonth =
      date.getMonth() === anchor.getMonth() && date.getFullYear() === anchor.getFullYear();
    const isToday = date.getTime() === referenceDate.getTime();
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const openCount = tasks.filter((task) => task.status !== 'Completed').length;
    const hasOverdue = date.getTime() < referenceDate.getTime() && openCount > 0;

    days.push({ date, dateKey, isCurrentMonth, isToday, isWeekend, tasks, hasOverdue });
  }

  const inRange = (value: string | null, start: Date, end: Date): boolean => {
    const date = stripTime(value);
    if (!date) return false;
    return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
  };

  const openTasks = allTasks.filter((task) => task.status !== 'Completed');

  const scheduledThisMonth = openTasks.filter((task) =>
    inRange(task.dueDate, monthStart, monthEnd),
  );

  const dueToday = openTasks.filter((task) => {
    const due = stripTime(task.dueDate);
    return due !== null && due.getTime() === referenceDate.getTime();
  });

  const completedThisMonth = allTasks.filter(
    (task) => task.status === 'Completed' && inRange(task.completedDate, monthStart, monthEnd),
  );

  const overdue = openTasks.filter((task) => {
    const due = stripTime(task.dueDate);
    return due !== null && due.getTime() < referenceDate.getTime();
  });

  const unscheduled = openTasks.filter((task) => stripTime(task.dueDate) === null);

  const agenda = openTasks
    .filter((task) => {
      const due = stripTime(task.dueDate);
      if (!due) return false;
      return (
        due.getTime() < referenceDate.getTime() ||
        (due.getTime() >= gridStart.getTime() && due.getTime() <= gridEnd.getTime())
      );
    })
    .sort((a, b) => {
      const aDue = stripTime(a.dueDate);
      const bDue = stripTime(b.dueDate);
      if (aDue && bDue && aDue.getTime() !== bDue.getTime()) {
        return aDue.getTime() - bDue.getTime();
      }
      return sortCalendarTasks(a, b);
    })
    .slice(0, CALENDAR_AGENDA_MAX_ROWS);

  return {
    anchor,
    monthStart,
    monthEnd,
    gridStart,
    gridEnd,
    today: referenceDate,
    days,
    scheduledThisMonth,
    dueToday,
    overdue,
    completedThisMonth,
    unscheduled,
    agenda,
  };
}
