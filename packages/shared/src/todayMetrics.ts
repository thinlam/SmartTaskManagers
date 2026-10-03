import type { Area, Priority, Task } from '@stm/types';
import { formatDueLabel, type DueLabelTranslate } from './formatDueLabel';
import {
  applySmartVisibility,
  compareBySmartRank,
  resolveSmartEngineOptions,
  type SmartEngineOptions,
} from './smartEngineOptions';

/**
 * Ported from computeTodayData_() in apps/google-sheets/src/07_Today.gs,
 * then redesigned per Frame 04 — KPI row now matches the mockup's 4
 * status-count tiles (Due Today, Overdue, In Progress, Completed Today)
 * instead of the Sheets original's 5 (dropped Focus Load/Quick Wins as
 * KPI cards; Quick Wins survives as its own task-list section below).
 * Same tie-break rule throughout (compareBySmartRank: SmartScore desc,
 * then earliest due date, undated last). `smartScore`/`recommendedAction`
 * come from the backend's real Smart Engine (Phase 29) already attached
 * to each Task — nothing here recomputes them.
 */

const DO_NOW_MAX_ROWS = 6;
const SCHEDULED_MAX_ROWS = 6;
const QUICK_WINS_MAX_ROWS = 6;
const TOP_FOCUS_MAX_ROWS = 3;
const OVERDUE_MAX_ROWS = 6;
const HIGH_PRIORITY_MAX_ROWS = 6;
const COMPLETED_TODAY_MAX_ROWS = 8;

export type TodayKpiKey = 'dueToday' | 'overdue' | 'inProgress' | 'completed';

export interface TodayKpi {
  /**
   * Identifies which of the 4 fixed KPIs this is (Frame 04's status-count
   * tiles) — `packages/shared` has no i18n access, so `label`/`sub` below
   * are English fallbacks only; the real UI (TodayPage) translates by
   * switching on `key` and the raw numeric fields below instead of using
   * `label`/`sub` directly.
   */
  key: TodayKpiKey;
  label: string;
  value: string;
  sub: string;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  /** True only for Overdue when its count is > 0 — TodayPage renders this one with a highlighted border, matching Frame 04. */
  emphasize?: boolean;
  /** Populated only for the KPI whose key matches — the raw number(s) a translated `sub` needs. */
  highPriorityCount?: number;
  overdueCount?: number;
  completionRate?: number;
}

export interface TodayTask {
  id: string;
  title: string;
  area: Area;
  priority: Priority;
  dueLabel: string;
  /** References a Project's id — the UI resolves it to a name (same pattern as Dashboard's attentionTasks). */
  projectId?: string;
  /** 0–100, the task's real progress field. */
  progress: number;
  smartScore?: number;
  recommendedAction?: string;
}

export interface TodayTaskSection {
  subtitle: string;
  emptyText: string;
  tasks: TodayTask[];
}

export interface TodayCompletedTask {
  id: string;
  title: string;
  projectId?: string;
  /** Full ISO timestamp (real CompletedDate from the backend, not just a date) — the UI formats it to a time-of-day label. */
  completedAtIso: string;
}

export interface TodayHourlyActivity {
  /** 0–23. */
  hour: number;
  /** Tasks actually completed in this hour today (real CompletedDate). */
  completedCount: number;
  /** Open tasks due today with a dueTime in this hour — not yet completed. */
  scheduledCount: number;
}

export interface TodayReview {
  completedCount: number;
  completionRate: number;
  plannedCount: number;
}

export interface TodayData {
  subtitle: string;
  kpis: TodayKpi[];
  /** Top 3 ranked tasks for the "Today's Focus" section (01/02/03) — same pool/ranking `bestNext` used to pick its single pick from. */
  topFocus: TodayTask[];
  bestNext: TodayTask | null;
  overdueTasks: TodayTask[];
  highPriorityTasks: TodayTask[];
  doNow: TodayTaskSection;
  scheduled: TodayTaskSection;
  quickWins: TodayTaskSection;
  completedToday: TodayCompletedTask[];
  hourlyActivity: TodayHourlyActivity[];
  review: TodayReview;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function toTodayTask(
  task: Task,
  referenceDate: Date,
  dueLabelOverride?: string,
  t?: DueLabelTranslate,
): TodayTask {
  return {
    id: task.id,
    title: task.title,
    area: task.area,
    priority: task.priority,
    dueLabel: dueLabelOverride ?? formatDueLabel(task.dueDate, referenceDate, t),
    projectId: task.projectId ?? undefined,
    progress: task.progress,
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

export function computeTodayData(
  tasks: Task[],
  referenceDate: Date = new Date(),
  t?: DueLabelTranslate,
  smartOptions?: SmartEngineOptions,
): TodayData {
  const smart = resolveSmartEngineOptions(smartOptions);
  const today = startOfDay(referenceDate);

  const openTasks = tasks.filter((t) => t.status !== 'Completed');
  const inProgressTasks = tasks.filter((t) => t.status === 'In Progress');
  const todayTasks = openTasks.filter(
    (t) => t.dueDate && startOfDay(new Date(t.dueDate)).getTime() === today.getTime(),
  );
  const overdueTasks = openTasks.filter(
    (t) => t.dueDate && daysBetween(today, startOfDay(new Date(t.dueDate))) < 0,
  );

  const urgentPool = [...todayTasks, ...overdueTasks];
  const seen = new Set<string>();
  const smartRank = (a: Task, b: Task) => compareBySmartRank(a, b, smart.smartScoreEnabled);

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
    .sort(smartRank)
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
    .sort(smartRank)
    .slice(0, QUICK_WINS_MAX_ROWS);

  const rankedPool = (urgentPool.length > 0 ? urgentPool : openTasks).slice().sort(smartRank);
  const topFocusSource = rankedPool.slice(0, TOP_FOCUS_MAX_ROWS);
  const bestNextSource = rankedPool[0] ?? null;

  const overdueSource = overdueTasks.slice().sort(smartRank).slice(0, OVERDUE_MAX_ROWS);

  const highPrioritySource = openTasks
    .filter(
      (t) =>
        (t.priority === 'Critical' || t.priority === 'Urgent' || t.priority === 'High') &&
        !overdueTasks.includes(t),
    )
    .sort(smartRank)
    .slice(0, HIGH_PRIORITY_MAX_ROWS);

  const completedTodaySource = tasks
    .filter(
      (t) =>
        t.status === 'Completed' &&
        t.completedDate &&
        startOfDay(new Date(t.completedDate)).getTime() === today.getTime(),
    )
    .sort((a, b) => new Date(b.completedDate!).getTime() - new Date(a.completedDate!).getTime());

  const plannedTodayCount = todayTasks.length + completedTodaySource.length;
  const completionRate =
    plannedTodayCount > 0 ? Math.round((completedTodaySource.length / plannedTodayCount) * 100) : 0;

  const todayHighPriorityCount = todayTasks.filter(
    (t) => t.priority === 'High' || t.priority === 'Urgent' || t.priority === 'Critical',
  ).length;

  const hourlyActivity: TodayHourlyActivity[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    completedCount: completedTodaySource.filter(
      (t) => new Date(t.completedDate!).getHours() === hour,
    ).length,
    scheduledCount: todayTasks.filter((t) => {
      if (!t.dueTime) return false;
      return Number(t.dueTime.split(':')[0]) === hour;
    }).length,
  })).filter((h) => h.completedCount > 0 || h.scheduledCount > 0);

  const kpis: TodayKpi[] = [
    {
      key: 'dueToday',
      label: 'Due Today',
      value: String(todayTasks.length),
      sub: `${todayHighPriorityCount} high priority`,
      tone: todayTasks.length > 0 ? 'primary' : 'success',
      highPriorityCount: todayHighPriorityCount,
    },
    {
      key: 'overdue',
      label: 'Overdue',
      value: String(overdueTasks.length),
      sub: overdueTasks.length > 0 ? 'Needs attention' : 'All clear',
      tone: overdueTasks.length > 0 ? 'danger' : 'success',
      emphasize: overdueTasks.length > 0,
      overdueCount: overdueTasks.length,
    },
    {
      key: 'inProgress',
      label: 'In Progress',
      value: String(inProgressTasks.length),
      sub: 'Currently active',
      tone: 'primary',
    },
    {
      key: 'completed',
      label: 'Completed Today',
      value: String(completedTodaySource.length),
      sub: `${completionRate}% of today's plan`,
      tone: 'success',
      completionRate,
    },
  ];

  return {
    subtitle: 'Focus on what matters most today.',
    kpis,
    topFocus: topFocusSource.map((task) =>
      applySmartVisibility(toTodayTask(task, referenceDate, undefined, t), smart),
    ),
    bestNext: bestNextSource
      ? applySmartVisibility(toTodayTask(bestNextSource, referenceDate, undefined, t), smart)
      : null,
    overdueTasks: overdueSource.map((task) =>
      applySmartVisibility(toTodayTask(task, referenceDate, undefined, t), smart),
    ),
    highPriorityTasks: highPrioritySource.map((task) =>
      applySmartVisibility(toTodayTask(task, referenceDate, undefined, t), smart),
    ),
    doNow: {
      subtitle: 'Your most important work right now',
      emptyText: 'Nothing urgent right now. You have breathing room.',
      tasks: doNowSource.map((task) =>
        applySmartVisibility(toTodayTask(task, referenceDate, undefined, t), smart),
      ),
    },
    scheduled: {
      subtitle: 'Time-specific tasks for today',
      emptyText: 'No time-blocked tasks scheduled today.',
      tasks: scheduledSource.map((task) =>
        applySmartVisibility(
          toTodayTask(
            task,
            referenceDate,
            task.dueTime ? formatTimeLabel(task.dueTime) : undefined,
            t,
          ),
          smart,
        ),
      ),
    },
    quickWins: {
      subtitle: 'Small tasks you can finish fast',
      emptyText: 'No quick wins available right now.',
      tasks: quickWinsSource.map((task) =>
        applySmartVisibility(toTodayTask(task, referenceDate, undefined, t), smart),
      ),
    },
    completedToday: completedTodaySource.slice(0, COMPLETED_TODAY_MAX_ROWS).map((task) => ({
      id: task.id,
      title: task.title,
      projectId: task.projectId ?? undefined,
      completedAtIso: task.completedDate!,
    })),
    hourlyActivity,
    review: {
      completedCount: completedTodaySource.length,
      completionRate,
      plannedCount: plannedTodayCount,
    },
  };
}
