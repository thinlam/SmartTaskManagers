import type { Area, GoalStatus, ProjectHealth, TaskStatus } from '@stm/types';

/**
 * Real compatibility gap found while wiring this package up (Phase 27):
 * C# enum member names can't contain spaces, so
 * backend/SmartTask.Domain/Enums/Lookups.cs uses PascalCase-no-space
 * identifiers (PersonalAdmin, ToDo, InProgress, OnTrack, AtRisk) while
 * the frontend's Area/TaskStatus/GoalStatus/ProjectHealth unions
 * (packages/types) keep Sheets' own display strings verbatim, spaces
 * included ('Personal Admin', 'To Do', 'In Progress', 'On Track', 'At
 * Risk') — those were never meant to be identical, just equivalent, and
 * this is the one place that translates between them. Priority/Risk/
 * HabitFrequency need no mapping — their values happen to contain no
 * spaces on either side.
 */

const AREA_TO_FRONTEND: Record<string, Area> = {
  Career: 'Career',
  Learning: 'Learning',
  Health: 'Health',
  Personal: 'Personal',
  PersonalAdmin: 'Personal Admin',
};
const AREA_TO_BACKEND: Record<Area, string> = {
  Career: 'Career',
  Learning: 'Learning',
  Health: 'Health',
  Personal: 'Personal',
  'Personal Admin': 'PersonalAdmin',
};

const TASK_STATUS_TO_FRONTEND: Record<string, TaskStatus> = {
  Inbox: 'Inbox',
  ToDo: 'To Do',
  InProgress: 'In Progress',
  Waiting: 'Waiting',
  Completed: 'Completed',
};
const TASK_STATUS_TO_BACKEND: Record<TaskStatus, string> = {
  Inbox: 'Inbox',
  'To Do': 'ToDo',
  'In Progress': 'InProgress',
  Waiting: 'Waiting',
  Completed: 'Completed',
};

const GOAL_STATUS_TO_FRONTEND: Record<string, GoalStatus> = {
  OnTrack: 'On Track',
  AtRisk: 'At Risk',
  Completed: 'Completed',
};
const GOAL_STATUS_TO_BACKEND: Record<GoalStatus, string> = {
  'On Track': 'OnTrack',
  'At Risk': 'AtRisk',
  Completed: 'Completed',
};

const PROJECT_HEALTH_TO_FRONTEND: Record<string, ProjectHealth> = {
  Healthy: 'Healthy',
  Attention: 'Attention',
  AtRisk: 'At Risk',
  Critical: 'Critical',
};

export function areaToFrontend(value: string): Area {
  return AREA_TO_FRONTEND[value] ?? 'Personal';
}
export function areaToBackend(value: Area): string {
  return AREA_TO_BACKEND[value];
}

export function taskStatusToFrontend(value: string): TaskStatus {
  return TASK_STATUS_TO_FRONTEND[value] ?? 'Inbox';
}
export function taskStatusToBackend(value: TaskStatus): string {
  return TASK_STATUS_TO_BACKEND[value];
}

export function goalStatusToFrontend(value: string): GoalStatus {
  return GOAL_STATUS_TO_FRONTEND[value] ?? 'On Track';
}
export function goalStatusToBackend(value: GoalStatus): string {
  return GOAL_STATUS_TO_BACKEND[value];
}

export function projectHealthToFrontend(value: string): ProjectHealth {
  return PROJECT_HEALTH_TO_FRONTEND[value] ?? 'Healthy';
}
