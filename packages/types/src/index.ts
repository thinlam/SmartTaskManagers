/**
 * Domain enums, matching apps/google-sheets/src/00_Constants.gs
 * LOOKUP_LISTS — single source of truth for these value sets, shared by
 * mock data, packages/ui components, and (later) the API client and
 * backend DTOs. Full entity shapes (Task, Project, Goal, Habit) land here
 * as each Phase actually needs them (Tasks: Phase 12, Projects: Phase 13,
 * ...) rather than being modeled speculatively ahead of time.
 */
export type Area = 'Career' | 'Learning' | 'Health' | 'Personal' | 'Personal Admin';
export type Priority = 'Critical' | 'Urgent' | 'High' | 'Medium' | 'Low';
export type TaskStatus = 'Inbox' | 'To Do' | 'In Progress' | 'Waiting' | 'Completed';
export type Risk = 'Low' | 'Medium' | 'High' | 'Critical';

/**
 * The reduced shape a `TaskCard` (packages/ui) needs to render one task —
 * not the full Task entity (that lands with Phase 12). Shared here because
 * Dashboard's Focus Now (Phase 09) and Today's Do Now/Scheduled/Quick Wins
 * (Phase 10) both produce lists of exactly this shape; defining it twice
 * in each page's mock data would drift the moment one changes.
 */
export interface TaskSummary {
  id: string;
  title: string;
  area: Area;
  priority: Priority;
  dueLabel: string;
  /** Smart Engine output (Phase 29) — omit rather than fabricate until real. */
  smartScore?: number;
  /** Smart Engine output (Phase 29) — omit rather than fabricate until real. */
  recommendedAction?: string;
}
