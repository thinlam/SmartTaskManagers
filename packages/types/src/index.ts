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
 * beyond a plain list, Energy, Context, RecurringType, DependencyTaskId,
 * LastStatusChangedAt, Notes. Dates are ISO 8601 strings (`null` = not
 * set), not `Date`, so this shape survives crossing the Phase 27 API
 * boundary unchanged.
 */
export interface Task {
  id: string;
  title: string;
  description: string;
  area: Area;
  /** References a Project's id — Projects land in Phase 13. */
  projectId: string | null;
  /** References a Goal's id (Phase 14) — matches GoalId in TASK_HEADERS. */
  goalId: string | null;
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

/**
 * Project Health shares the same 4-level severity scale as Risk (Frame
 * 01, section 5: Low/Healthy, Medium/Attention, High/At Risk, Critical)
 * but uses Project-specific labels — kept a distinct type rather than
 * reusing Risk so a Task's risk and a Project's health can't be mixed up
 * by the type system. `packages/ui`'s ProjectHealthBadge reuses the
 * `risk-*` color tokens directly for this reason.
 */
export type ProjectHealth = 'Healthy' | 'Attention' | 'At Risk' | 'Critical';

/**
 * The Project entity (Phase 13) — matches PROJECT_HEADERS in
 * apps/google-sheets/src/00_Constants.gs, minus `Health`: that column is
 * a cached/recalculated value there, but here it's always derived live
 * from linked tasks via computeProjectHealth() (packages/shared) —
 * storing it on the entity risks it going stale.
 */
export interface Project {
  id: string;
  name: string;
  area: Area;
  targetDate: string | null;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type GoalStatus = 'On Track' | 'At Risk' | 'Completed';

/**
 * The Goal entity (Phase 14) — matches GOAL_HEADERS in
 * apps/google-sheets/src/00_Constants.gs. Unlike Project, Goals have no
 * computed-metrics engine on the Sheets side (no equivalent of
 * `14_Projects.gs`) — `progress`/`status` are plain fields the user sets
 * directly (see `createGoal_()` in `apps/google-sheets/src/03_Data.gs`,
 * which defaults them to `0`/`'On Track'`), not derived from linked
 * tasks.
 */
export interface Goal {
  id: string;
  name: string;
  area: Area;
  targetDate: string | null;
  /** 0–100, entered directly. */
  progress: number;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

export type HabitFrequency = 'Daily' | 'Weekly' | 'Custom';

/**
 * The Habit entity (Phase 15) — matches HABIT_HEADERS in
 * apps/google-sheets/src/00_Constants.gs. Standalone, unlike Goal/Project:
 * grepping the whole Sheets source found no `HabitId` column anywhere on
 * `TASK_HEADERS`, so unlike `projectId`/`goalId` there is no Task→Habit
 * link to model. `streak`/`completedCount`/`lastCompletedDate` are plain
 * fields (`createHabit_()` in `apps/google-sheets/src/03_Data.gs` defaults
 * them to `0`/`0`/`''`) — Sheets has no habit-completion function to port
 * either, so the desktop app's own "check in today" action
 * (`packages/hooks`'s `useHabits`) is a reasonable minimal design, not a
 * port.
 */
export interface Habit {
  id: string;
  name: string;
  frequency: HabitFrequency;
  streak: number;
  /** 0 = no target set (matches createHabit_()'s default). */
  targetCount: number;
  completedCount: number;
  lastCompletedDate: string | null;
  createdAt: string;
  updatedAt: string;
}
