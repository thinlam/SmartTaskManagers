import type { Area, Priority, Project, Task } from '@stm/types';
import { computeProjectMetrics } from './projectMetrics';

/**
 * Analytics (Phase 18) has no Sheets precedent to port — the spec for it
 * (`apps/google-sheets/docs/claude/MODULE_PROMPTS.md` §10, "Reports —
 * `15_Reports.gs`") was written but that file was never actually built
 * in the production Sheets app (confirmed by listing every real .gs
 * file). Its own instructions still apply here since they're the only
 * real requirement that exists for this screen: "Chỉ sử dụng dữ liệu
 * thực. Không bịa analytics. Không thêm team metrics." (real data only,
 * no fabricated analytics, no team metrics) — every function below is a
 * plain aggregation over real Task/Project fields, nothing scored or
 * inferred like Smart Engine (Phase 29).
 */

export interface AnalyticsSummary {
  totalTasks: number;
  completedTasks: number;
  /** 0–100, completedTasks / totalTasks. */
  completionRate: number;
  openTasks: number;
  overdueTasks: number;
  /** 0–100, overdueTasks / openTasks. */
  overdueRate: number;
}

export function computeAnalyticsSummary(tasks: Task[]): AnalyticsSummary {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === 'Completed').length;
  const openTasks = totalTasks - completedTasks;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueTasks = tasks.filter((task) => {
    if (task.status === 'Completed' || !task.dueDate) return false;
    return new Date(task.dueDate).getTime() < today.getTime();
  }).length;

  return {
    totalTasks,
    completedTasks,
    completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    openTasks,
    overdueTasks,
    overdueRate: openTasks > 0 ? Math.round((overdueTasks / openTasks) * 100) : 0,
  };
}

export interface PriorityDistributionItem {
  priority: Priority;
  count: number;
  /** 0–100, share of totalTasks. */
  percentage: number;
}

const PRIORITY_ORDER: Priority[] = ['Critical', 'Urgent', 'High', 'Medium', 'Low'];

export function getPriorityDistribution(tasks: Task[]): PriorityDistributionItem[] {
  const total = tasks.length;
  return PRIORITY_ORDER.map((priority) => {
    const count = tasks.filter((task) => task.priority === priority).length;
    return { priority, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0 };
  });
}

export interface AreaProgress {
  area: Area;
  /** 0–100, average of this area's tasks' progress (Completed counts as its own progress value, not forced to 100). */
  progress: number;
  completed: number;
  open: number;
  total: number;
}

/**
 * Ported from getAreaProgress_() in apps/google-sheets/src/06_Dashboard.gs
 * — real function, even though Dashboard itself doesn't call it yet
 * (still Phase 09's static mock; wiring it up is Phase 27, out of scope
 * here). Sorted by progress descending, same as the original.
 */
export function getAreaProgress(tasks: Task[]): AreaProgress[] {
  const byArea = new Map<Area, { sum: number; count: number; completed: number; open: number }>();

  for (const task of tasks) {
    const entry = byArea.get(task.area) ?? { sum: 0, count: 0, completed: 0, open: 0 };
    entry.sum += task.progress;
    entry.count += 1;
    if (task.status === 'Completed') entry.completed += 1;
    else entry.open += 1;
    byArea.set(task.area, entry);
  }

  return Array.from(byArea.entries())
    .map(([area, entry]) => ({
      area,
      progress: Math.round(entry.sum / entry.count),
      completed: entry.completed,
      open: entry.open,
      total: entry.count,
    }))
    .sort((a, b) => b.progress - a.progress);
}

export interface ProjectProgressItem {
  projectId: string;
  name: string;
  progress: number;
  taskCount: number;
}

/** Reuses computeProjectMetrics() (Phase 13) — no new progress formula, just a summary list. */
export function getProjectProgressList(
  projects: Project[],
  allTasks: Task[],
): ProjectProgressItem[] {
  return projects
    .map((project) => {
      const metrics = computeProjectMetrics(project, allTasks);
      return {
        projectId: project.id,
        name: project.name,
        progress: metrics.progress,
        taskCount: metrics.taskCount,
      };
    })
    .sort((a, b) => b.progress - a.progress);
}

export interface WeeklyTrendDay {
  dateKey: string;
  label: string;
  completedCount: number;
}

/** Last 7 days (including today), counting tasks by completedDate. No Sheets precedent — a plain daily count, nothing inferred. */
export function getWeeklyCompletionTrend(
  tasks: Task[],
  referenceDate: Date = new Date(),
): WeeklyTrendDay[] {
  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );

  const days: WeeklyTrendDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const dateKey = date.toISOString().slice(0, 10);
    const completedCount = tasks.filter(
      (task) => task.completedDate && task.completedDate.slice(0, 10) === dateKey,
    ).length;
    days.push({
      dateKey,
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      completedCount,
    });
  }
  return days;
}

/**
 * Plain derived facts only — no scoring, no prediction. Each line states
 * a real number that's already computed above; this just picks which
 * ones are worth surfacing as a sentence, matching the spec's "ưu tiên
 * insight hữu ích" (prioritize useful insight) without inventing
 * anything beyond what the data actually says.
 */
export interface AnalyticsInsight {
  tone: 'danger' | 'warning' | 'success' | 'info';
  text: string;
}

export function getAnalyticsInsights(
  summary: AnalyticsSummary,
  areaProgress: AreaProgress[],
  priorityDistribution: PriorityDistributionItem[],
): AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = [];

  if (summary.overdueTasks > 0) {
    insights.push({
      tone: 'danger',
      text: `${summary.overdueTasks} open task${summary.overdueTasks === 1 ? '' : 's'} overdue — that's ${summary.overdueRate}% of everything still open.`,
    });
  } else if (summary.openTasks > 0) {
    insights.push({ tone: 'success', text: 'No overdue tasks — everything open is on track.' });
  }

  const topArea = areaProgress[0];
  if (topArea) {
    insights.push({
      tone: 'info',
      text: `${topArea.area} has the highest average progress at ${topArea.progress}% (${topArea.total} task${topArea.total === 1 ? '' : 's'}).`,
    });
  }

  const topPriority = priorityDistribution
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)[0];
  if (topPriority) {
    insights.push({
      tone: 'warning',
      text: `Most tasks are ${topPriority.priority} priority (${topPriority.count}, ${topPriority.percentage}% of all tasks).`,
    });
  }

  return insights;
}
