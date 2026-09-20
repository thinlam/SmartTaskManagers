import type { Project, ProjectHealth, Task } from '@stm/types';

export interface ProjectMetrics {
  taskCount: number;
  openCount: number;
  completedCount: number;
  overdueCount: number;
  blockedCount: number;
  criticalCount: number;
  /** 0–100, average of linked tasks' progress (Completed counts as 100). */
  progress: number;
  topTask: Task | null;
}

/**
 * Ported from computeProjectMetrics_() in
 * apps/google-sheets/src/14_Projects.gs — same rules, same field names
 * translated to this app's camelCase Task/Project shape. Linking is by
 * `task.projectId === project.id` only; Sheets also falls back to
 * matching by project *name* for legacy rows, which has no equivalent
 * here since projectId has always been a real id in this data model.
 */
export function computeProjectMetrics(project: Project, allTasks: Task[]): ProjectMetrics {
  const tasks = allTasks.filter((task) => task.projectId === project.id);
  const openTasks = tasks.filter((task) => task.status !== 'Completed');
  const completedTasks = tasks.filter((task) => task.status === 'Completed');

  const today = stripToCalendarDate(new Date());
  const overdueTasks = openTasks.filter((task) => {
    if (!task.dueDate) return false;
    return stripToCalendarDate(new Date(task.dueDate)).getTime() < today.getTime();
  });
  const blockedTasks = openTasks.filter((task) => task.status === 'Waiting');
  const criticalTasks = openTasks.filter(
    (task) => task.priority === 'Critical' || task.priority === 'Urgent',
  );

  const progress =
    tasks.length > 0
      ? Math.round(
          tasks.reduce((total, task) => {
            const value =
              task.status === 'Completed' ? 100 : Math.max(0, Math.min(100, task.progress));
            return total + value;
          }, 0) / tasks.length,
        )
      : 0;

  const topTask =
    openTasks.slice().sort((a, b) => (b.smartScore ?? 0) - (a.smartScore ?? 0))[0] ?? null;

  return {
    taskCount: tasks.length,
    openCount: openTasks.length,
    completedCount: completedTasks.length,
    overdueCount: overdueTasks.length,
    blockedCount: blockedTasks.length,
    criticalCount: criticalTasks.length,
    progress,
    topTask,
  };
}

/** Same weights and bucket thresholds as PROJECT_HEALTH_WEIGHTS in 14_Projects.gs. */
const PROJECT_HEALTH_WEIGHTS = {
  perOverdueTask: 15,
  perBlockedTask: 8,
  perCriticalTask: 10,
  lowProgressPenalty: 10,
  buckets: { critical: 40, atRisk: 25, attention: 10 },
};

export function computeProjectHealth(metrics: ProjectMetrics): ProjectHealth {
  let points = 0;
  points += metrics.overdueCount * PROJECT_HEALTH_WEIGHTS.perOverdueTask;
  points += metrics.blockedCount * PROJECT_HEALTH_WEIGHTS.perBlockedTask;
  points += metrics.criticalCount * PROJECT_HEALTH_WEIGHTS.perCriticalTask;
  if (metrics.taskCount > 0 && metrics.progress < 30) {
    points += PROJECT_HEALTH_WEIGHTS.lowProgressPenalty;
  }

  if (points >= PROJECT_HEALTH_WEIGHTS.buckets.critical) return 'Critical';
  if (points >= PROJECT_HEALTH_WEIGHTS.buckets.atRisk) return 'At Risk';
  if (points >= PROJECT_HEALTH_WEIGHTS.buckets.attention) return 'Attention';
  return 'Healthy';
}

/** Ported from getProjectTopFocusText_() — same three cases, same wording. */
export function getProjectTopFocusText(metrics: ProjectMetrics): string {
  if (metrics.topTask) {
    const score = metrics.topTask.smartScore;
    return metrics.topTask.title + (score ? `  •  Score ${score}` : '');
  }
  if (metrics.taskCount === 0) return 'No tasks linked yet';
  return 'Nothing open right now';
}

/** Ported from getProjectNextAction_() — same priority order, same wording. */
export function getProjectNextAction(metrics: ProjectMetrics): string {
  if (metrics.overdueCount > 0) {
    return 'Resolve overdue work first before adding more tasks.';
  }
  if (metrics.criticalCount > 0) {
    return 'Reduce risk by focusing on critical tasks now.';
  }
  if (metrics.blockedCount > 0) {
    return 'Review waiting tasks and remove blockers.';
  }
  if (metrics.topTask) {
    return `Continue with "${metrics.topTask.title}".`;
  }
  if (metrics.taskCount === 0) {
    return 'Add the first actionable task for this project.';
  }
  if (metrics.progress >= 100) {
    return 'Project work is complete — review and close it.';
  }
  return 'Review this project and define the next concrete action.';
}

/**
 * Ported from getProjectTargetLabel_() — deliberately different wording
 * from formatDueLabel() ("Target ..." vs "Due ..."/"Overdue ..."), since
 * that's what the real reference uses for a project's target date versus
 * a task's due date.
 */
export function formatTargetLabel(
  targetDate: string | null,
  referenceDate: Date = new Date(),
): string {
  if (!targetDate) return 'No target date';

  const target = stripToCalendarDate(new Date(targetDate));
  const today = stripToCalendarDate(referenceDate);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  const formatted = target.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  if (diffDays < 0) return `Target ${formatted} • OVERDUE`;
  if (diffDays === 0) return 'Target today';
  if (diffDays === 1) return 'Target tomorrow';
  return `Target ${formatted}`;
}

function stripToCalendarDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
