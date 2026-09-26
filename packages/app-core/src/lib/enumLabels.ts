import type {
  GoalStatus,
  HabitFrequency,
  Priority,
  ProjectHealth,
  Risk,
  TaskStatus,
} from '@stm/types';

/**
 * `packages/ui` has no i18n access by design (presentational-only, no
 * dependency on `packages/app-core`) — so every Badge/Card there renders
 * whatever string it's given verbatim. These take a `t` function
 * (from `useTranslation()`) and return the translated label for a raw
 * enum value, so every page that renders a Task/Project/Goal/Habit card
 * translates the same way instead of leaving the raw English enum value
 * on screen when the app is set to Vietnamese.
 */
type Translate = (key: string) => string;

export function translatePriority(t: Translate, priority: Priority): string {
  const key: Record<Priority, string> = {
    Critical: 'settings.priorityCritical',
    Urgent: 'settings.priorityUrgent',
    High: 'settings.priorityHigh',
    Medium: 'settings.priorityMedium',
    Low: 'settings.priorityLow',
  };
  return t(key[priority]);
}

export function translateTaskStatus(t: Translate, status: TaskStatus): string {
  const key: Record<TaskStatus, string> = {
    Inbox: 'settings.statusInbox',
    'To Do': 'settings.statusToDo',
    'In Progress': 'settings.statusInProgress',
    Waiting: 'settings.statusWaiting',
    Completed: 'settings.statusCompleted',
  };
  return t(key[status]);
}

export function translateRisk(t: Translate, risk: Risk): string {
  const key: Record<Risk, string> = {
    Low: 'enums.riskLow',
    Medium: 'enums.riskMedium',
    High: 'enums.riskHigh',
    Critical: 'enums.riskCritical',
  };
  return t(key[risk]);
}

export function translateProjectHealth(t: Translate, health: ProjectHealth): string {
  const key: Record<ProjectHealth, string> = {
    Healthy: 'enums.healthHealthy',
    Attention: 'enums.healthAttention',
    'At Risk': 'enums.healthAtRisk',
    Critical: 'enums.healthCritical',
  };
  return t(key[health]);
}

export function translateGoalStatus(t: Translate, status: GoalStatus): string {
  const key: Record<GoalStatus, string> = {
    'On Track': 'enums.goalStatusOnTrack',
    'At Risk': 'enums.goalStatusAtRisk',
    Completed: 'enums.goalStatusCompleted',
  };
  return t(key[status]);
}

export function translateHabitFrequency(t: Translate, frequency: HabitFrequency): string {
  const key: Record<HabitFrequency, string> = {
    Daily: 'enums.frequencyDaily',
    Weekly: 'enums.frequencyWeekly',
    Custom: 'enums.frequencyCustom',
  };
  return t(key[frequency]);
}
