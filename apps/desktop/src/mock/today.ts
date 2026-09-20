import type { TaskSummary } from '@stm/types';

export interface TodayKpi {
  label: string;
  value: string;
  sub: string;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

export interface TodayTaskSection {
  subtitle: string;
  emptyText: string;
  tasks: TaskSummary[];
}

export interface TodayReview {
  completedCount: number;
  completionRate: number;
  plannedCount: number;
}

export interface TodayData {
  subtitle: string;
  kpis: TodayKpi[];
  bestNext: TaskSummary | null;
  doNow: TodayTaskSection;
  scheduled: TodayTaskSection;
  quickWins: TodayTaskSection;
  review: TodayReview;
}

/**
 * Mock fixture. Shape mirrors computeTodayData_() in
 * apps/google-sheets/src/07_Today.gs: the same 5 KPIs (Due Today,
 * Overdue, Focus Load, Completed, Quick Wins), the same Best Next Action
 * / Do Now / Scheduled / Quick Wins / End-of-Day Review sections.
 *
 * Every number here is a static placeholder, not computed — replaced by
 * a real API call in Phase 27. smartScore/recommendedAction on each
 * TaskSummary are Smart Engine output (Phase 29) and must never be
 * treated as real until then.
 */
export const MOCK_TODAY_DATA: TodayData = {
  subtitle: 'Focus on what matters most today.',
  kpis: [
    { label: 'Due Today', value: '3', sub: '1 high priority', tone: 'primary' },
    { label: 'Overdue', value: '1', sub: 'Needs attention', tone: 'danger' },
    { label: 'Focus Load', value: '2h 15m', sub: '56% of 4h capacity', tone: 'info' },
    { label: 'Completed', value: '2', sub: '40% completion rate', tone: 'success' },
    { label: 'Quick Wins', value: '2', sub: '15 min or less', tone: 'primary' },
  ],
  bestNext: {
    id: 'TASK-0001',
    title: 'Finish portfolio case study',
    area: 'Career',
    priority: 'Critical',
    dueLabel: 'Due today',
    smartScore: 94,
    recommendedAction: 'Do now',
  },
  doNow: {
    subtitle: 'Your most important work right now',
    emptyText: 'Nothing urgent right now. You have breathing room.',
    tasks: [
      {
        id: 'TASK-0001',
        title: 'Finish portfolio case study',
        area: 'Career',
        priority: 'Critical',
        dueLabel: 'Due today',
        smartScore: 94,
        recommendedAction: 'Do now',
      },
      {
        id: 'TASK-0004',
        title: 'Pay electricity bill',
        area: 'Personal Admin',
        priority: 'High',
        dueLabel: 'Overdue 1 day',
        smartScore: 82,
        recommendedAction: 'Do now',
      },
    ],
  },
  scheduled: {
    subtitle: 'Time-specific tasks for today',
    emptyText: 'No time-blocked tasks scheduled today.',
    tasks: [
      {
        id: 'TASK-0005',
        title: 'Call dentist for appointment',
        area: 'Health',
        priority: 'Medium',
        dueLabel: '2:00 PM',
        smartScore: 55,
        recommendedAction: 'Schedule',
      },
    ],
  },
  quickWins: {
    subtitle: 'Small tasks you can finish fast',
    emptyText: 'No quick wins available right now.',
    tasks: [
      {
        id: 'TASK-0006',
        title: 'Reply to landlord email',
        area: 'Personal Admin',
        priority: 'Low',
        dueLabel: 'No due date',
        smartScore: 40,
        recommendedAction: 'Quick win',
      },
      {
        id: 'TASK-0007',
        title: 'Water the plants',
        area: 'Personal',
        priority: 'Low',
        dueLabel: 'No due date',
        smartScore: 35,
        recommendedAction: 'Quick win',
      },
    ],
  },
  review: {
    completedCount: 2,
    completionRate: 40,
    plannedCount: 5,
  },
};
