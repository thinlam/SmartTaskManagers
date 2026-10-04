import type { Priority, Task, TaskStatus } from '@stm/types';

export type GanttScale = 'day' | 'week' | 'month';

/** Day-column width in px, and how many day-columns are visible, per zoom level — matches Frame 10's "Week" zoom showing two 7-day weeks (14 columns). */
export const GANTT_SCALE_CONFIG: Record<GanttScale, { dayWidth: number; dayCount: number }> = {
  day: { dayWidth: 120, dayCount: 7 },
  week: { dayWidth: 70, dayCount: 14 },
  month: { dayWidth: 36, dayCount: 30 },
};

function stripTime(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function stripDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date): Date {
  const stripped = stripDate(date);
  const day = stripped.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  stripped.setDate(stripped.getDate() + diff);
  return stripped;
}

function addDays(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
}

export interface GanttVisibleRange {
  start: Date;
  end: Date;
  dayCount: number;
  dayWidth: number;
  days: Date[];
}

/**
 * The visible window of day-columns for a given zoom level, anchored to
 * `anchor` — Day/Week scales start at the Monday of `anchor`'s week
 * (matches Frame 10's "WEEK 37 · SEP 7–13" style headers); Month scale
 * starts at the 1st of `anchor`'s month and covers that real month's
 * day count (28–31), not a padded 42-cell grid like the Calendar page.
 */
export function getGanttVisibleRange(anchor: Date, scale: GanttScale): GanttVisibleRange {
  const { dayWidth, dayCount } = GANTT_SCALE_CONFIG[scale];
  const start = scale === 'month' ? new Date(anchor.getFullYear(), anchor.getMonth(), 1) : startOfWeek(anchor);
  const resolvedDayCount =
    scale === 'month' ? new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate() : dayCount;
  const days = Array.from({ length: resolvedDayCount }, (_, i) => addDays(start, i));
  const end = addDays(start, resolvedDayCount - 1);
  return { start, end, dayCount: resolvedDayCount, dayWidth, days };
}

/** Steps the anchor forward/backward by one visible window (Month scale steps by a real calendar month). */
export function stepGanttAnchor(anchor: Date, scale: GanttScale, direction: 1 | -1): Date {
  if (scale === 'month') {
    return new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1);
  }
  const { dayCount } = GANTT_SCALE_CONFIG[scale];
  return addDays(anchor, direction * dayCount);
}

export type GanttTaskHealth = 'onTrack' | 'atRisk' | 'delayed';

/**
 * Per-task schedule health for the Gantt KPI row — delayed (overdue,
 * still open), at risk (due today, or status Waiting = blocked), on
 * track (everything else). Completed tasks are excluded by the caller
 * before this is reached (a finished task has no schedule risk left).
 */
export function getGanttTaskHealth(task: Task, referenceDate: Date): GanttTaskHealth {
  const due = stripTime(task.dueDate);
  const today = stripDate(referenceDate);
  if (due && due.getTime() < today.getTime()) return 'delayed';
  if (task.status === 'Waiting') return 'atRisk';
  if (due && due.getTime() === today.getTime()) return 'atRisk';
  return 'onTrack';
}

export interface GanttKpis {
  onTrack: number;
  atRisk: number;
  delayed: number;
  avgProgress: number;
  scheduledCount: number;
}

/**
 * Scoped to open, schedulable tasks (status !== Completed, has a due
 * date) — an unscheduled task can't appear as a Gantt bar at all, so it
 * doesn't count toward "visible tasks" here either.
 */
export function computeGanttKpis(tasks: Task[], referenceDate: Date): GanttKpis {
  const scheduled = tasks.filter((task) => task.status !== 'Completed' && task.dueDate);
  let onTrack = 0;
  let atRisk = 0;
  let delayed = 0;
  for (const task of scheduled) {
    const health = getGanttTaskHealth(task, referenceDate);
    if (health === 'onTrack') onTrack += 1;
    else if (health === 'atRisk') atRisk += 1;
    else delayed += 1;
  }
  const avgProgress =
    scheduled.length > 0
      ? Math.round(scheduled.reduce((sum, task) => sum + task.progress, 0) / scheduled.length)
      : 0;
  return { onTrack, atRisk, delayed, avgProgress, scheduledCount: scheduled.length };
}

export interface GanttBarPosition {
  /** Day offset from the visible range's start — can be negative (bar starts before the visible window). */
  startOffsetDays: number;
  /** Bar length in days — always >= 1. */
  spanDays: number;
  /** True when the task's due date is in the past and it isn't Completed. */
  isDelayed: boolean;
}

/**
 * Where a task's bar sits relative to a visible range's start — in day
 * units, not pixels, so the caller multiplies by its own dayWidth.
 * Returns null for a task with no due date (nothing to draw) or whose
 * range doesn't overlap the visible window at all.
 */
export function getGanttBarPosition(
  task: Task,
  range: GanttVisibleRange,
  referenceDate: Date,
): GanttBarPosition | null {
  const due = stripTime(task.dueDate);
  if (!due) return null;
  const start = stripTime(task.startDate) ?? due;
  const barStart = start.getTime() <= due.getTime() ? start : due;
  const barEnd = due;

  const dayMs = 86_400_000;
  const rangeStartMs = range.start.getTime();
  const rangeEndMs = range.end.getTime();
  if (barEnd.getTime() < rangeStartMs || barStart.getTime() > rangeEndMs) return null;

  const startOffsetDays = Math.round((barStart.getTime() - rangeStartMs) / dayMs);
  const spanDays = Math.max(1, Math.round((barEnd.getTime() - barStart.getTime()) / dayMs) + 1);
  const isDelayed = task.status !== 'Completed' && barEnd.getTime() < stripDate(referenceDate).getTime();

  return { startOffsetDays, spanDays, isDelayed };
}

const STATUS_COLOR_ORDER: TaskStatus[] = ['Inbox', 'To Do', 'In Progress', 'Waiting', 'Completed'];

export function sortGanttTasks(a: Task, b: Task): number {
  const statusDiff = STATUS_COLOR_ORDER.indexOf(a.status) - STATUS_COLOR_ORDER.indexOf(b.status);
  if (statusDiff !== 0) return statusDiff;
  const aDue = stripTime(a.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const bDue = stripTime(b.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return aDue - bDue;
}

/** Priority-weighted filter helper, mirroring the Priority-order convention used by Tasks/Kanban's filter bars. */
export const GANTT_PRIORITIES: Priority[] = ['Critical', 'Urgent', 'High', 'Medium', 'Low'];
