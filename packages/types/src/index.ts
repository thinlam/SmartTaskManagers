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

/**
 * The full Task entity (Phase 12) — a working subset of the 27 columns in
 * apps/google-sheets/src/00_Constants.gs's TASK_HEADERS, not a 1:1 port.
 * Left out for now, added only once a screen needs them: Category, Tags
 * beyond a plain list, Energy, Context, GoalId, RecurringType,
 * DependencyTaskId, LastStatusChangedAt, Notes. Dates are ISO 8601
 * strings (`null` = not set), not `Date`, so this shape survives crossing
 * the Phase 27 API boundary unchanged.
 */
export interface Task {
  id: string;
  title: string;
  description: string;
  area: Area;
  /** References a Project's id — Projects land in Phase 13. */
  projectId: string | null;
  tags: string[];
  priority: Priority;
  status: TaskStatus;
  startDate: string | null;
  dueDate: string | null;
  completedDate: string | null;
  /** 0–100. */
  progress: number;
  estimateMinutes: number | null;
  /** Smart Engine output (Phase 29) — omit rather than fabricate until real. */
  smartScore?: number;
  /** Smart Engine output (Phase 29) — omit rather than fabricate until real. */
  risk?: Risk;
  /** Smart Engine output (Phase 29) — omit rather than fabricate until real. */
  recommendedAction?: string;
  createdAt: string;
  updatedAt: string;
}
