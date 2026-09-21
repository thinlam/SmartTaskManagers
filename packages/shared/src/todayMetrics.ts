import type { Area, Priority, Task } from '@stm/types';
import { formatDueLabel } from './formatDueLabel';

/**
 * Ported from computeTodayData_() in apps/google-sheets/src/07_Today.gs —
 * same 5 KPIs (Due Today, Overdue, Focus Load, Completed, Quick Wins),
 * same Best Next Action / Do Now / Scheduled / Quick Wins / End-of-Day
 * Review sections, same tie-break rule (todayByScoreDesc_: SmartScore
 * desc, then earliest due date, undated last). `smartScore`/
 * `recommendedAction` come from the backend's real Smart Engine (Phase
 * 29) already attached to each Task — nothing here recomputes them.
 * `dailyFocusLimitHours` hard-coded — see dashboardMetrics.ts's identical
 * doc comment for why.
 */

const DO_NOW_MAX_ROWS = 6;
const SCHEDULED_MAX_ROWS = 6;
const QUICK_WINS_MAX_ROWS = 6;
const DAILY_FOCUS_LIMIT_HOURS = 4;

export interface TodayKpi {
  label: string;
  value: string;
  sub: string;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

export interface TodayTask {
  id: string;
  title: string;
  area: Area;
  priority: Priority;
  dueLabel: string;
  smartScore?: number;
  recommendedAction?: string;
}

export interface TodayTaskSection {
  subtitle: string;
  emptyText: string;
  tasks: TodayTask[];
}

export interface TodayReview {
  completedCount: number;
  completionRate: number;
  plannedCount: number;
}

export interface TodayData {
  subtitle: string;
  kpis: TodayKpi[];
  bestNext: TodayTask | null;
  doNow: TodayTaskSection;
  scheduled: TodayTaskSection;
  quickWins: TodayTaskSection;
  review: TodayReview;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function formatMinutes(totalMinutes: number): string {
  const minutes = Math.max(0, totalMinutes);
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (hours === 0) return `${rem}m`;
  if (rem === 0) return `${hours}h`;
  return `${hours}h ${rem}m`;
}

/** todayByScoreDesc_: SmartScore desc, tie-break by earliest due date, undated tasks sort last. */
function byScoreDesc(a: Task, b: Task): number {
  const diff = (b.smartScore ?? 0) - (a.smartScore ?? 0);
  if (diff !== 0) return diff;
  if (!a.dueDate && !b.dueDate) return 0;
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
}

function toTodayTask(task: Task, referenceDate: Date, dueLabelOverride?: string): TodayTask {
  return {
    id: task.id,
    title: task.title,
    area: task.area,
    priority: task.priority,
    dueLabel: dueLabelOverride ?? formatDueLabel(task.dueDate, referenceDate),
    smartScore: task.smartScore,
    recommendedAction: task.recommendedAction,
  };
}

/** "14:30:00" -> "2:30 PM" — HH:mm:ss (backend's TimeOnly serialization) to a 12-hour clock label. */
function formatTimeLabel(dueTime: string): string {
  const [hourStr, minuteStr] = dueTime.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

export function computeTodayData(tasks: Task[], referenceDate: Date = new Date()): TodayData {
  const today = startOfDay(referenceDate);

  const openTasks = tasks.filter((t) => t.status !== 'Completed');
  const todayTasks = openTasks.filter(
    (t) => t.dueDate && startOfDay(new Date(t.dueDate)).getTime() === today.getTime(),
  );
  const overdueTasks = openTasks.filter(
    (t) => t.dueDate && daysBetween(today, startOfDay(new Date(t.dueDate))) < 0,
  );

  const urgentPool = [...todayTasks, ...overdueTasks];
  const seen = new Set<string>();

  const doNowSource = urgentPool
    .filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    })
    .filter((t) => {
      const diff = t.dueDate ? daysBetween(today, startOfDay(new Date(t.dueDate))) : null;
      const urgent = diff !== null && diff <= 0;
      return urgent && t.status !== 'Waiting';
    })
    .sort(byScoreDesc)
    .slice(0, DO_NOW_MAX_ROWS);

  const doNowIds = new Set(doNowSource.map((t) => t.id));

  const scheduledSource = todayTasks
    .filter((t) => t.dueTime && !doNowIds.has(t.id))
    .sort((a, b) => (a.dueTime ?? '').localeCompare(b.dueTime ?? ''))
    .slice(0, SCHEDULED_MAX_ROWS);

  const scheduledIds = new Set(scheduledSource.map((t) => t.id));

  const quickWinsSource = openTasks
    .filter((t) => {
      const minutes = t.estimateMinutes ?? 0;
      return minutes > 0 && minutes <= 15 && !doNowIds.has(t.id) && !scheduledIds.has(t.id);
    })
    .sort(byScoreDesc)
    .slice(0, QUICK_WINS_MAX_ROWS);

  const bestNextSource =
    urgentPool.slice().sort(byScoreDesc)[0] ?? openTasks.slice().sort(byScoreDesc)[0] ?? null;

  const focusMinutes = todayTasks.reduce((sum, t) => sum + (t.estimateMinutes ?? 0), 0);

  const completedToday = tasks.filter(
    (t) =>
      t.status === 'Completed' &&
      t.completedDate &&
      startOfDay(new Date(t.completedDate)).getTime() === today.getTime(),
  );

  const focusLimitMinutes = DAILY_FOCUS_LIMIT_HOURS * 60;
  const capacityPercent =
    focusLimitMinutes > 0 ? Math.round((focusMinutes / focusLimitMinutes) * 100) : 0;

  const plannedTodayCount = todayTasks.length + completedToday.length;
  const completionRate =
    plannedTodayCount > 0 ? Math.round((completedToday.length / plannedTodayCount) * 100) : 0;

  const kpis: TodayKpi[] = [
    {
      label: 'Due Today',
      value: String(todayTasks.length),
      sub: `${todayTasks.filter((t) => t.priority === 'High' || t.priority === 'Urgent' || t.priority === 'Critical').length} high priority`,
      tone: todayTasks.length > 0 ? 'primary' : 'success',
    },
    {
      label: 'Overdue',
      value: String(overdueTasks.length),
      sub: overdueTasks.length > 0 ? 'Needs attention' : 'All clear',
      tone: overdueTasks.length > 0 ? 'danger' : 'success',
    },
    {
      label: 'Focus Load',
      value: formatMinutes(focusMinutes),
      sub: `${Math.min(capacityPercent, 999)}% of ${DAILY_FOCUS_LIMIT_HOURS}h capacity`,
      tone: capacityPercent > 100 ? 'warning' : 'info',
    },
    {
      label: 'Completed',
      value: String(completedToday.length),
      sub: `${completionRate}% completion rate`,
      tone: 'success',
    },
    {
      label: 'Quick Wins',
      value: String(quickWinsSource.length),
      sub: '15 min or less',
      tone: 'primary',
    },
  ];

  return {
    subtitle: 'Focus on what matters most today.',
    kpis,
    bestNext: bestNextSource ? toTodayTask(bestNextSource, referenceDate) : null,
    doNow: {
      subtitle: 'Your most important work right now',
      emptyText: 'Nothing urgent right now. You have breathing room.',
      tasks: doNowSource.map((t) => toTodayTask(t, referenceDate)),
    },
    scheduled: {
      subtitle: 'Time-specific tasks for today',
      emptyText: 'No time-blocked tasks scheduled today.',
      tasks: scheduledSource.map((t) =>
        toTodayTask(t, referenceDate, t.dueTime ? formatTimeLabel(t.dueTime) : undefined),
      ),
    },
    quickWins: {
      subtitle: 'Small tasks you can finish fast',
      emptyText: 'No quick wins available right now.',
      tasks: quickWinsSource.map((t) => toTodayTask(t, referenceDate)),
    },
    review: {
      completedCount: completedToday.length,
      completionRate,
      plannedCount: plannedTodayCount,
    },
  };
}
