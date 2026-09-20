import type { Task, TaskStatus } from '@stm/types';

/** Matches KANBAN_LAYOUT.maxCardsPerLane in apps/google-sheets/src/11_Kanban.gs. */
export const KANBAN_MAX_CARDS_PER_LANE = 7;
/** Matches KANBAN_LAYOUT.inProgressWipLimit. */
export const KANBAN_IN_PROGRESS_WIP_LIMIT = 3;

/** Ported from getKanbanStatuses_() — same order as LOOKUP_LISTS.Status. */
export const KANBAN_LANES: TaskStatus[] = ['Inbox', 'To Do', 'In Progress', 'Waiting', 'Completed'];

function stripTime(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function today(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Ported from kanbanDueSortValue_() — no due date sinks to the bottom of a lane. */
function dueSortValue(value: string | null): number {
  const date = stripTime(value);
  return date ? date.getTime() : Number.MAX_SAFE_INTEGER;
}

/**
 * Ported from computeKanbanData_()'s per-lane sort: Completed sorts by
 * completedDate descending (newest first); every other lane sorts by
 * SmartScore descending, then by due date ascending (earliest first,
 * unscheduled last).
 */
function sortLaneTasks(status: TaskStatus): (a: Task, b: Task) => number {
  return (a, b) => {
    if (status === 'Completed') {
      const aDate = a.completedDate ? new Date(a.completedDate).getTime() : 0;
      const bDate = b.completedDate ? new Date(b.completedDate).getTime() : 0;
      return bDate - aDate;
    }

    const scoreDiff = (b.smartScore ?? 0) - (a.smartScore ?? 0);
    if (scoreDiff !== 0) return scoreDiff;

    return dueSortValue(a.dueDate) - dueSortValue(b.dueDate);
  };
}

/** Ported from getKanbanLaneSubtitle_() — same wording per lane. */
export function getKanbanLaneSubtitle(status: TaskStatus, count: number): string {
  switch (status) {
    case 'Inbox':
      return 'Capture first, organize later';
    case 'To Do':
      return 'Ready when you are';
    case 'In Progress':
      return `${count} / ${KANBAN_IN_PROGRESS_WIP_LIMIT} recommended WIP`;
    case 'Waiting':
      return 'Paused or waiting on something';
    case 'Completed':
      return 'Recently finished work';
    default:
      return 'Workflow stage';
  }
}

/** Ported from getKanbanEmptyText_() — same wording per lane. */
export function getKanbanEmptyText(status: TaskStatus): string {
  switch (status) {
    case 'Inbox':
      return 'Inbox is clear. New captures will appear here.';
    case 'To Do':
      return 'Nothing queued. Choose intentionally what comes next.';
    case 'In Progress':
      return 'No active task. Start one important thing.';
    case 'Waiting':
      return 'Nothing is waiting. No blockers right now.';
    case 'Completed':
      return 'Finished tasks will appear here.';
    default:
      return 'No tasks in this stage.';
  }
}

export type KanbanTone = 'success' | 'primary' | 'warning' | 'danger' | 'neutral';

/** Ported from getKanbanProgressTone_() — same thresholds. */
export function getKanbanProgressTone(progress: number): KanbanTone {
  if (progress >= 100) return 'success';
  if (progress >= 60) return 'primary';
  if (progress > 0) return 'warning';
  return 'neutral';
}

/**
 * Ported from getKanbanScoreTone_() — same thresholds. Cosmetic only:
 * SmartScore itself is still Smart Engine placeholder data (Phase 29),
 * this just reproduces how Sheets would color a score if one exists.
 */
export function getKanbanScoreTone(score: number): KanbanTone {
  if (score >= 85) return 'danger';
  if (score >= 65) return 'warning';
  if (score >= 40) return 'primary';
  return 'success';
}

/** Ported from getKanbanDueTone_() — same thresholds, Completed always reads success. */
export function getKanbanDueTone(
  dueDate: string | null,
  status: TaskStatus,
  referenceDate: Date,
): KanbanTone {
  if (status === 'Completed') return 'success';

  const due = stripTime(dueDate);
  if (!due) return 'neutral';

  const diffDays = Math.round((due.getTime() - referenceDate.getTime()) / 86_400_000);
  if (diffDays < 0) return 'danger';
  if (diffDays <= 1) return 'warning';
  return 'success';
}

/** Ported from kanbanDueLabel_() — same terse wording, "Done" override for Completed. */
export function getKanbanDueLabel(
  dueDate: string | null,
  status: TaskStatus,
  referenceDate: Date,
): string {
  if (status === 'Completed') return 'Done';

  const due = stripTime(dueDate);
  if (!due) return 'No date';

  const diffDays = Math.round((due.getTime() - referenceDate.getTime()) / 86_400_000);
  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export interface KanbanLaneData {
  status: TaskStatus;
  /** Full sorted list for this lane — the caller slices to KANBAN_MAX_CARDS_PER_LANE. */
  tasks: Task[];
  subtitle: string;
  emptyText: string;
  /** Only ever true for the In Progress lane, when count exceeds the WIP limit. */
  isOverWip: boolean;
}

export interface KanbanBoardData {
  today: Date;
  lanes: KanbanLaneData[];
  openCount: number;
  completedCount: number;
  dueTodayCount: number;
  overdueCount: number;
  /** Highest-SmartScore open task, or null — matches computeKanbanData_()'s focusTask. */
  focusTask: Task | null;
}

/**
 * Ported from computeKanbanData_() — groups by status (unknown statuses
 * would fall back to Inbox in Sheets; this app's TaskStatus type makes
 * that case unreachable, so it's not modeled here), sorts each lane, and
 * computes the same 4 KPIs plus focusTask.
 */
export function computeKanbanBoardData(allTasks: Task[]): KanbanBoardData {
  const referenceDate = today();

  const lanes: KanbanLaneData[] = KANBAN_LANES.map((status) => {
    const tasks = allTasks.filter((task) => task.status === status).sort(sortLaneTasks(status));
    return {
      status,
      tasks,
      subtitle: getKanbanLaneSubtitle(status, tasks.length),
      emptyText: getKanbanEmptyText(status),
      isOverWip: status === 'In Progress' && tasks.length > KANBAN_IN_PROGRESS_WIP_LIMIT,
    };
  });

  const openTasks = allTasks.filter((task) => task.status !== 'Completed');
  const completedTasks = allTasks.filter((task) => task.status === 'Completed');

  const dueTodayCount = openTasks.filter((task) => {
    const due = stripTime(task.dueDate);
    return due !== null && due.getTime() === referenceDate.getTime();
  }).length;

  const overdueCount = openTasks.filter((task) => {
    const due = stripTime(task.dueDate);
    return due !== null && due.getTime() < referenceDate.getTime();
  }).length;

  const focusTask =
    openTasks.slice().sort((a, b) => (b.smartScore ?? 0) - (a.smartScore ?? 0))[0] ?? null;

  return {
    today: referenceDate,
    lanes,
    openCount: openTasks.length,
    completedCount: completedTasks.length,
    dueTodayCount,
    overdueCount,
    focusTask,
  };
}
