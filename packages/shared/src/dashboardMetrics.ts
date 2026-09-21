import type { Area, Habit, Priority, Task } from '@stm/types';
import { formatDueLabel } from './formatDueLabel';
import { getAreaProgress, type AreaProgress } from './analyticsMetrics';

/**
 * Ported from computeDashboardData_() in apps/google-sheets/src/
 * 06_Dashboard.gs — same 5 KPIs (Due Today, Overdue, Focus Time, Weekly
 * Progress, Streak), same Focus Now (top 6 open tasks by SmartScore, tie-
 * broken by due date) / My Areas (reuses getAreaProgress from
 * analyticsMetrics.ts — same formula, same source function) / Smart
 * Insights sections. `smartScore`/`recommendedAction` come from the
 * backend's real Smart Engine (Phase 29) already attached to each Task —
 * this file never recomputes them, only sorts/reads what's there.
 *
 * `dailyFocusLimitHours` is hard-coded to match DEFAULT_SETTINGS in
 * 00_Constants.gs — no Settings API exists yet on either end (see
 * apps/desktop/README.md's Settings section), so this uses the same
 * literal default rather than reading a store that doesn't exist.
 * `computeDashboardData_()` also fetches `DueSoonDays` but never actually
 * uses it (confirmed by reading the full function) — not ported here
 * either, matching the source exactly rather than adding a use it never
 * had.
 */

const FOCUS_MAX_ROWS = 6;
const INSIGHT_MAX_ITEMS = 3;
const DAILY_FOCUS_LIMIT_HOURS = 4;

export interface DashboardKpi {
  label: string;
  value: string;
  sub: string;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

export interface DashboardFocusTask {
  id: string;
  title: string;
  area: Area;
  priority: Priority;
  dueLabel: string;
  smartScore?: number;
  recommendedAction?: string;
}

export interface DashboardInsight {
  tone: 'danger' | 'warning' | 'success' | 'info';
  text: string;
}

export interface DashboardData {
  greeting: string;
  summary: string;
  kpis: DashboardKpi[];
  focusNow: DashboardFocusTask[];
  areas: AreaProgress[];
  insights: DashboardInsight[];
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function getWeekRange(date: Date): { start: Date; end: Date } {
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(date);
  start.setDate(start.getDate() + diffToMonday);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

function formatMinutes(totalMinutes: number): string {
  const minutes = Math.max(0, totalMinutes);
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (hours === 0) return `${rem}m`;
  if (rem === 0) return `${hours}h`;
  return `${hours}h ${rem}m`;
}

function countHighImpact(tasks: Task[]): number {
  return tasks.filter(
    (t) => t.priority === 'High' || t.priority === 'Urgent' || t.priority === 'Critical',
  ).length;
}

function compareDueDates(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return new Date(a).getTime() - new Date(b).getTime();
}

function toFocusTask(task: Task, referenceDate: Date): DashboardFocusTask {
  return {
    id: task.id,
    title: task.title,
    area: task.area,
    priority: task.priority,
    dueLabel: formatDueLabel(task.dueDate, referenceDate),
    smartScore: task.smartScore,
    recommendedAction: task.recommendedAction,
  };
}

function buildGreeting(referenceDate: Date): string {
  const hour = referenceDate.getHours();
  const period = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  return `Good ${period}. Here is what matters today.`;
}

export function computeDashboardData(
  tasks: Task[],
  habits: Habit[],
  referenceDate: Date = new Date(),
): DashboardData {
  const today = startOfDay(referenceDate);
  const week = getWeekRange(today);

  const openTasks = tasks.filter((t) => t.status !== 'Completed');
  const todayTasks = openTasks.filter(
    (t) => t.dueDate && startOfDay(new Date(t.dueDate)).getTime() === today.getTime(),
  );
  const overdueTasks = openTasks.filter(
    (t) => t.dueDate && daysBetween(today, startOfDay(new Date(t.dueDate))) < 0,
  );
  const weekTasks = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const d = startOfDay(new Date(t.dueDate)).getTime();
    return d >= week.start.getTime() && d <= week.end.getTime();
  });
  const weekCompleted = weekTasks.filter((t) => t.status === 'Completed');

  const focusMinutesToday = todayTasks.reduce((sum, t) => sum + (t.estimateMinutes ?? 0), 0);
  const focusCapacityMinutes = DAILY_FOCUS_LIMIT_HOURS * 60;
  const focusLoadPercent =
    focusCapacityMinutes > 0 ? Math.round((focusMinutesToday / focusCapacityMinutes) * 100) : 0;

  const weeklyPercent =
    weekTasks.length > 0 ? Math.round((weekCompleted.length / weekTasks.length) * 100) : 0;

  const streak = habits.reduce((max, h) => Math.max(max, h.streak), 0);

  const kpis: DashboardKpi[] = [
    {
      label: 'Due Today',
      value: String(todayTasks.length),
      sub: `${countHighImpact(todayTasks)} high priority`,
      tone: todayTasks.length > 0 ? 'primary' : 'success',
    },
    {
      label: 'Overdue',
      value: String(overdueTasks.length),
      sub: overdueTasks.length > 0 ? 'Needs attention' : 'All clear',
      tone: overdueTasks.length > 0 ? 'danger' : 'success',
    },
    {
      label: 'Focus Time',
      value: formatMinutes(focusMinutesToday),
      sub: `${Math.min(focusLoadPercent, 999)}% of daily capacity`,
      tone: focusLoadPercent > 100 ? 'warning' : 'info',
    },
    {
      label: 'Weekly Progress',
      value: weekTasks.length > 0 ? `${weeklyPercent}%` : '—',
      sub:
        weekTasks.length > 0
          ? `${weekCompleted.length} of ${weekTasks.length} completed`
          : 'No tasks due this week',
      tone: weeklyPercent >= 70 ? 'success' : 'primary',
    },
    {
      label: 'Streak',
      value: String(streak),
      sub: streak === 1 ? 'day planning streak' : 'days planning streak',
      tone: streak > 0 ? 'warning' : 'primary',
    },
  ];

  const focusNow = openTasks
    .slice()
    .sort((a, b) => {
      const diff = (b.smartScore ?? 0) - (a.smartScore ?? 0);
      if (diff !== 0) return diff;
      return compareDueDates(a.dueDate, b.dueDate);
    })
    .slice(0, FOCUS_MAX_ROWS)
    .map((t) => toFocusTask(t, referenceDate));

  const areas = getAreaProgress(tasks);

  const insights: DashboardInsight[] = [];

  if (overdueTasks.length > 0) {
    const quick = overdueTasks.filter(
      (t) => (t.estimateMinutes ?? 0) > 0 && (t.estimateMinutes ?? 0) <= 20,
    );
    insights.push(
      quick.length > 0
        ? {
            tone: 'danger',
            text: `${overdueTasks.length} overdue task(s). ${quick.length} can be cleared in 20 minutes or less.`,
          }
        : {
            tone: 'danger',
            text: `${overdueTasks.length} overdue task(s) need attention before taking on more work.`,
          },
    );
  }

  if (focusMinutesToday > focusCapacityMinutes) {
    insights.push({
      tone: 'warning',
      text: `Today is overloaded by ${formatMinutes(focusMinutesToday - focusCapacityMinutes)}. Consider moving a lower-priority task.`,
    });
  } else if (todayTasks.length > 0) {
    insights.push({
      tone: 'success',
      text: `Today uses ${formatMinutes(focusMinutesToday)} of your ${DAILY_FOCUS_LIMIT_HOURS}h focus capacity.`,
    });
  }

  // The source uses a 'primary' tone here and for "Best next move" below;
  // SmartInsightCard (packages/ui) only implements danger/warning/
  // success/info, so both map to 'info' instead — a real, deliberate
  // divergence from the .gs source, not a missed port.
  if (weekTasks.length > 0) {
    insights.push({
      tone: weeklyPercent >= 70 ? 'success' : 'info',
      text: `Weekly completion is ${weeklyPercent}% — ${weekCompleted.length} of ${weekTasks.length} scheduled tasks completed.`,
    });
  }

  const topFocusTask = focusNow[0];
  if (insights.length < INSIGHT_MAX_ITEMS && topFocusTask) {
    insights.push({
      tone: 'info',
      text: `Best next move: "${topFocusTask.title}"${topFocusTask.recommendedAction ? ` — ${topFocusTask.recommendedAction}` : '.'}`,
    });
  }

  const summary = `${openTasks.length} open tasks · ${todayTasks.length} due today · ${weekCompleted.length} of ${weekTasks.length} completed this week`;

  return {
    greeting: buildGreeting(referenceDate),
    summary,
    kpis,
    focusNow,
    areas,
    insights: insights.slice(0, INSIGHT_MAX_ITEMS),
  };
}
