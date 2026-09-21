import type { Area, Goal, Habit, Priority, Project, ProjectHealth, Risk, Task } from '@stm/types';
import { formatDueLabel } from './formatDueLabel';
import {
  computeProjectHealth,
  computeProjectMetrics,
  getProjectNextAction,
} from './projectMetrics';

/**
 * Smart Assistant — no Sheets precedent (this screen was placeholder-only
 * since Phase 04's nav scaffold, "Phase 29+ (Smart Engine)"; grepping
 * apps/google-sheets/src confirms no assistant/recommendation view was
 * ever built there). Scope confirmed with the user before building: a
 * real rule-based recommendation page (not a chat/LLM assistant — that
 * would need real AI integration, a separate, much larger decision this
 * app hasn't made yet). Every section here reads fields the backend's
 * Smart Engine (Phase 29) already computed, or a plain rule over Task/
 * Project/Goal/Habit fields already loaded by the app — nothing here is
 * invented or scored a second time.
 *
 * Deeper than Dashboard's Focus Now (capped at 6, one flat list): this
 * groups every open task by its RecommendedAction, and adds Project/
 * Goal/Habit-level alerts Dashboard doesn't surface at all. The habit
 * rule mirrors NotificationService.GenerateHabitNotificationsAsync's
 * HabitStreakAtRisk (Phase 30) exactly, computed client-side instead of
 * read from the notification feed, since this page is about "what to do
 * next", not "what already happened".
 */

const CRITICAL_TASKS_MAX = 10;

/** Display order — most urgent action first. Matches SmartEngineService.RecommendAction's own priority chain (Program.cs), not alphabetical. */
const ACTION_ORDER = [
  'Overdue - do now',
  'Review blocked task',
  'Waiting for dependency',
  'Do now',
  'Break down',
  'Quick win',
  'Schedule',
  'Defer',
];

export interface AssistantTask {
  id: string;
  title: string;
  area: Area;
  priority: Priority;
  dueLabel: string;
  smartScore?: number;
  risk?: Risk;
}

export interface AssistantActionGroup {
  action: string;
  tasks: AssistantTask[];
}

export interface AssistantProjectAlert {
  projectId: string;
  name: string;
  health: Exclude<ProjectHealth, 'Healthy'>;
  nextAction: string;
}

export interface AssistantGoalAlert {
  goalId: string;
  name: string;
  progress: number;
}

export interface AssistantHabitAlert {
  habitId: string;
  name: string;
  streak: number;
}

export interface SmartAssistantData {
  summary: string;
  riskCounts: Record<Risk, number>;
  criticalTasks: AssistantTask[];
  actionGroups: AssistantActionGroup[];
  projectAlerts: AssistantProjectAlert[];
  goalAlerts: AssistantGoalAlert[];
  habitAlerts: AssistantHabitAlert[];
}

function toAssistantTask(task: Task, referenceDate: Date): AssistantTask {
  return {
    id: task.id,
    title: task.title,
    area: task.area,
    priority: task.priority,
    dueLabel: formatDueLabel(task.dueDate, referenceDate),
    smartScore: task.smartScore,
    risk: task.risk,
  };
}

function isSameCalendarDay(isoA: string, isoB: Date): boolean {
  const a = new Date(isoA);
  return (
    a.getFullYear() === isoB.getFullYear() &&
    a.getMonth() === isoB.getMonth() &&
    a.getDate() === isoB.getDate()
  );
}

export function computeSmartAssistantData(
  tasks: Task[],
  projects: Project[],
  goals: Goal[],
  habits: Habit[],
  referenceDate: Date = new Date(),
): SmartAssistantData {
  const openTasks = tasks.filter((t) => t.status !== 'Completed');

  const riskCounts: Record<Risk, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  for (const task of openTasks) {
    if (task.risk) riskCounts[task.risk] += 1;
  }

  const criticalTasks = openTasks
    .filter((t) => t.risk === 'Critical' || t.risk === 'High')
    .slice()
    .sort((a, b) => (b.smartScore ?? 0) - (a.smartScore ?? 0))
    .slice(0, CRITICAL_TASKS_MAX)
    .map((t) => toAssistantTask(t, referenceDate));

  const byAction = new Map<string, Task[]>();
  for (const task of openTasks) {
    if (!task.recommendedAction) continue;
    const list = byAction.get(task.recommendedAction) ?? [];
    list.push(task);
    byAction.set(task.recommendedAction, list);
  }

  const actionGroups: AssistantActionGroup[] = ACTION_ORDER.filter((action) =>
    byAction.has(action),
  ).map((action) => ({
    action,
    tasks: (byAction.get(action) ?? [])
      .slice()
      .sort((a, b) => (b.smartScore ?? 0) - (a.smartScore ?? 0))
      .map((t) => toAssistantTask(t, referenceDate)),
  }));

  const projectAlerts: AssistantProjectAlert[] = projects
    .map((project) => {
      const metrics = computeProjectMetrics(project, tasks);
      const health = computeProjectHealth(metrics);
      return { project, health, metrics };
    })
    .filter(({ health }) => health !== 'Healthy')
    .sort((a, b) => {
      const order = { Critical: 0, 'At Risk': 1, Attention: 2, Healthy: 3 };
      return order[a.health] - order[b.health];
    })
    .map(({ project, health, metrics }) => ({
      projectId: project.id,
      name: project.name,
      // Already filtered out 'Healthy' above — narrow the type to match.
      health: health as Exclude<ProjectHealth, 'Healthy'>,
      nextAction: getProjectNextAction(metrics),
    }));

  const goalAlerts: AssistantGoalAlert[] = goals
    .filter((goal) => goal.status === 'At Risk')
    .map((goal) => ({ goalId: goal.id, name: goal.name, progress: goal.progress }));

  const habitAlerts: AssistantHabitAlert[] = habits
    .filter(
      (habit) =>
        habit.frequency === 'Daily' &&
        habit.streak > 0 &&
        !(habit.lastCompletedDate && isSameCalendarDay(habit.lastCompletedDate, referenceDate)),
    )
    .map((habit) => ({ habitId: habit.id, name: habit.name, streak: habit.streak }));

  const summaryParts: string[] = [];
  if (criticalTasks.length > 0) {
    summaryParts.push(
      `${criticalTasks.length} high-risk task${criticalTasks.length === 1 ? '' : 's'}`,
    );
  }
  if (projectAlerts.length > 0) {
    summaryParts.push(
      `${projectAlerts.length} project${projectAlerts.length === 1 ? '' : 's'} need attention`,
    );
  }
  if (goalAlerts.length > 0) {
    summaryParts.push(`${goalAlerts.length} goal${goalAlerts.length === 1 ? '' : 's'} at risk`);
  }
  if (habitAlerts.length > 0) {
    summaryParts.push(
      `${habitAlerts.length} habit${habitAlerts.length === 1 ? '' : 's'} losing streak`,
    );
  }
  const summary =
    summaryParts.length > 0 ? summaryParts.join(' · ') : 'Nothing needs attention right now.';

  return {
    summary,
    riskCounts,
    criticalTasks,
    actionGroups,
    projectAlerts,
    goalAlerts,
    habitAlerts,
  };
}
