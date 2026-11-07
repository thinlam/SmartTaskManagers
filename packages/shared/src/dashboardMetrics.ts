import type { Area, Habit, Priority, Risk, Task } from '@stm/types';
import { formatDueLabel, type DueLabelTranslate } from './formatDueLabel';
import { getAreaProgress, type AreaProgress } from './analyticsMetrics';
import {
  applySmartVisibility,
  compareBySmartRank,
  resolveSmartEngineOptions,
  type SmartEngineOptions,
} from './smartEngineOptions';

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
const ATTENTION_MAX_ROWS = 8;
const INSIGHT_MAX_ITEMS = 3;
const DAILY_FOCUS_LIMIT_HOURS = 4;
const DEFAULT_DUE_SOON_DAYS = 3;

export type DashboardKpiKey =
  | 'totalTasks'
  | 'completed'
  | 'inProgress'
  | 'overdue'
  | 'dueToday'
  | 'dueSoon'
  | 'waiting'
  | 'completionRate';

export interface DashboardKpi {
  /**
   * Identifies which of the 8 fixed KPIs this is (Frame 03's status-count
   * tiles, adapted to this app's real 5-value TaskStatus — there is no
   * "Blocked" status here, "waiting" is the closest real equivalent) —
   * `packages/shared` has no i18n access, so `label`/`sub` below are
   * English fallbacks only; the real UI (DashboardPage) translates by
   * switching on `key` and the raw numeric fields below instead of using
   * `label`/`sub` directly.
   */
  key: DashboardKpiKey;
  label: string;
  value: string;
  sub: string;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  /** True only for Overdue when its count is > 0 — DashboardPage renders this one with a highlighted border, matching Frame 03. */
  emphasize?: boolean;
  /** Populated only for the KPI whose key matches — the raw number(s) a translated `sub` needs. */
  highPriorityCount?: number;
  overdueCount?: number;
  totalCount?: number;
  openCount?: number;
  completedCount?: number;
  completionRatePercent?: number;
  dueSoonDaysWindow?: number;
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

export interface DashboardAttentionTask {
  id: string;
  title: string;
  projectId?: string;
  priority: Priority;
  dueLabel: string;
  risk?: Risk;
  smartScore?: number;
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
  attentionTasks: DashboardAttentionTask[];
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

function toFocusTask(task: Task, referenceDate: Date, t?: DueLabelTranslate): DashboardFocusTask {
  return {
    id: task.id,
    title: task.title,
    area: task.area,
    priority: task.priority,
    dueLabel: formatDueLabel(task.dueDate, referenceDate, t, task),
    smartScore: task.smartScore,
    recommendedAction: task.recommendedAction,
  };
}

function buildGreeting(referenceDate: Date): string {
  const hour = referenceDate.getHours();
  const period = hour < 12 ? 'buổi sáng' : hour < 18 ? 'buổi chiều' : 'buổi tối';
  return `Chào ${period}. Đây là những việc đáng chú ý hôm nay.`;
}

export function computeDashboardData(
  tasks: Task[],
  habits: Habit[],
  referenceDate: Date = new Date(),
  t?: DueLabelTranslate,
  smartOptions?: SmartEngineOptions,
  dueSoonDays: number = DEFAULT_DUE_SOON_DAYS,
): DashboardData {
  const smart = resolveSmartEngineOptions(smartOptions);
  const today = startOfDay(referenceDate);
  const week = getWeekRange(today);

  const openTasks = tasks.filter((t) => t.status !== 'Completed');
  const completedTasks = tasks.filter((t) => t.status === 'Completed');
  const inProgressTasks = tasks.filter((t) => t.status === 'In Progress');
  const waitingTasks = tasks.filter((t) => t.status === 'Waiting');
  const todayTasks = openTasks.filter(
    (t) => t.dueDate && startOfDay(new Date(t.dueDate)).getTime() === today.getTime(),
  );
  const overdueTasks = openTasks.filter(
    (t) => t.dueDate && daysBetween(today, startOfDay(new Date(t.dueDate))) < 0,
  );
  const dueSoonTasks = openTasks.filter((t) => {
    if (!t.dueDate) return false;
    const diff = daysBetween(today, startOfDay(new Date(t.dueDate)));
    return diff > 0 && diff <= dueSoonDays;
  });
  const weekTasks = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const d = startOfDay(new Date(t.dueDate)).getTime();
    return d >= week.start.getTime() && d <= week.end.getTime();
  });

  const completionRate =
    tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  const kpis: DashboardKpi[] = [
    {
      key: 'totalTasks',
      label: 'Tổng công việc',
      value: String(tasks.length),
      sub: `${openTasks.length} đang mở`,
      tone: 'primary',
      totalCount: tasks.length,
      openCount: openTasks.length,
    },
    {
      key: 'completed',
      label: 'Đã hoàn thành',
      value: String(completedTasks.length),
      sub: `Tỷ lệ hoàn thành ${completionRate}%`,
      tone: 'success',
      completedCount: completedTasks.length,
      completionRatePercent: completionRate,
    },
    {
      key: 'inProgress',
      label: 'Đang thực hiện',
      value: String(inProgressTasks.length),
      sub: 'Đang triển khai',
      tone: 'primary',
    },
    {
      key: 'overdue',
      label: 'Quá hạn',
      value: String(overdueTasks.length),
      sub: overdueTasks.length > 0 ? 'Cần chú ý' : 'Không có việc trễ',
      tone: overdueTasks.length > 0 ? 'danger' : 'success',
      emphasize: overdueTasks.length > 0,
      overdueCount: overdueTasks.length,
    },
    {
      key: 'dueToday',
      label: 'Đến hạn hôm nay',
      value: String(todayTasks.length),
      sub: `${countHighImpact(todayTasks)} ưu tiên cao`,
      tone: todayTasks.length > 0 ? 'primary' : 'success',
      highPriorityCount: countHighImpact(todayTasks),
    },
    {
      key: 'dueSoon',
      label: 'Sắp đến hạn',
      value: String(dueSoonTasks.length),
      sub: `Trong ${dueSoonDays} ngày tới`,
      tone: 'info',
      dueSoonDaysWindow: dueSoonDays,
    },
    {
      key: 'waiting',
      label: 'Đang chờ',
      value: String(waitingTasks.length),
      sub: 'Bị chặn bởi việc khác',
      tone: waitingTasks.length > 0 ? 'warning' : 'success',
    },
    {
      key: 'completionRate',
      label: 'Tỷ lệ hoàn thành',
      value: `${completionRate}%`,
      sub: `${completedTasks.length}/${tasks.length} đã xong`,
      tone: completionRate >= 70 ? 'success' : 'primary',
      completedCount: completedTasks.length,
      totalCount: tasks.length,
    },
  ];

  const focusNow = openTasks
    .slice()
    .sort((a, b) => compareBySmartRank(a, b, smart.smartScoreEnabled))
    .slice(0, FOCUS_MAX_ROWS)
    .map((task) => applySmartVisibility(toFocusTask(task, referenceDate, t), smart));

  const attentionTasks: DashboardAttentionTask[] = openTasks
    .filter(
      (task) =>
        overdueTasks.includes(task) ||
        dueSoonTasks.includes(task) ||
        task.risk === 'High' ||
        task.risk === 'Critical',
    )
    .sort((a, b) => compareBySmartRank(a, b, smart.smartScoreEnabled))
    .slice(0, ATTENTION_MAX_ROWS)
    .map((task) => ({
      id: task.id,
      title: task.title,
      projectId: task.projectId ?? undefined,
      priority: task.priority,
      dueLabel: formatDueLabel(task.dueDate, referenceDate, t, task),
      risk: task.risk,
      smartScore: smart.smartScoreEnabled ? task.smartScore : undefined,
    }));

  const areas = getAreaProgress(tasks);

  const weekCompleted = weekTasks.filter((t) => t.status === 'Completed');
  const weeklyPercent =
    weekTasks.length > 0 ? Math.round((weekCompleted.length / weekTasks.length) * 100) : 0;
  const focusMinutesToday = todayTasks.reduce((sum, t) => sum + (t.estimateMinutes ?? 0), 0);
  const focusCapacityMinutes = DAILY_FOCUS_LIMIT_HOURS * 60;

  const insights: DashboardInsight[] = [];

  if (overdueTasks.length > 0) {
    const quick = overdueTasks.filter(
      (t) => (t.estimateMinutes ?? 0) > 0 && (t.estimateMinutes ?? 0) <= 20,
    );
    insights.push(
      quick.length > 0
        ? {
            tone: 'danger',
            text: `${overdueTasks.length} việc quá hạn, trong đó ${quick.length} việc xử lý được trong 20 phút.`,
          }
        : {
            tone: 'danger',
            text: `${overdueTasks.length} việc quá hạn cần xử lý trước khi nhận thêm việc mới.`,
          },
    );
  }

  if (smart.scheduleOverloadWarning && focusMinutesToday > focusCapacityMinutes) {
    insights.push({
      tone: 'warning',
      text: `Hôm nay đang quá tải ${formatMinutes(focusMinutesToday - focusCapacityMinutes)}. Hãy dời bớt một việc ít ưu tiên.`,
    });
  } else if (todayTasks.length > 0) {
    insights.push({
      tone: 'success',
      text: `Hôm nay dùng ${formatMinutes(focusMinutesToday)} trên tổng ${DAILY_FOCUS_LIMIT_HOURS} giờ tập trung.`,
    });
  }

  // The source uses a 'primary' tone here and for "Best next move" below;
  // SmartInsightCard (packages/ui) only implements danger/warning/
  // success/info, so both map to 'info' instead — a real, deliberate
  // divergence from the .gs source, not a missed port.
  if (weekTasks.length > 0) {
    insights.push({
      tone: weeklyPercent >= 70 ? 'success' : 'info',
      text: `Tuần này đã hoàn thành ${weeklyPercent}% (${weekCompleted.length}/${weekTasks.length} việc đã lên lịch).`,
    });
  }

  const topFocusTask = focusNow[0];
  if (insights.length < INSIGHT_MAX_ITEMS && topFocusTask) {
    insights.push({
      tone: 'info',
      text: `Nên làm tiếp: "${topFocusTask.title}"${topFocusTask.recommendedAction ? ` — ${topFocusTask.recommendedAction}` : '.'}`,
    });
  }

  const summary = `${openTasks.length} việc đang mở · ${todayTasks.length} đến hạn hôm nay · ${weekCompleted.length}/${weekTasks.length} đã xong tuần này`;

  return {
    greeting: buildGreeting(referenceDate),
    summary,
    kpis,
    focusNow,
    attentionTasks,
    areas,
    insights: insights.slice(0, INSIGHT_MAX_ITEMS),
  };
}
