import type { Area, TaskSummary } from '@stm/types';

export interface DashboardKpi {
  label: string;
  value: string;
  sub: string;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

export interface AreaProgress {
  area: Area;
  progress: number;
  completed: number;
  open: number;
  total: number;
}

export interface SmartInsight {
  tone: 'danger' | 'warning' | 'success' | 'info';
  text: string;
}

export interface DashboardData {
  greeting: string;
  summary: string;
  kpis: DashboardKpi[];
  focusNow: TaskSummary[];
  areas: AreaProgress[];
  insights: SmartInsight[];
}

/**
 * Mock fixture. Shape mirrors computeDashboardData_() in
 * apps/google-sheets/src/06_Dashboard.gs (the same 5 KPIs — Due Today,
 * Overdue, Focus Time, Weekly Progress, Streak — the same Focus Now /
 * My Areas / Smart Insights sections), adapted to Personal Mode: no
 * Owner/Team Capacity, Area replaces per-member grouping.
 *
 * Every number here is a static placeholder, not computed — this file is
 * replaced by a real API call in Phase 27 (Desktop <-> Backend
 * integration). SmartScore and RecommendedAction specifically are Smart
 * Engine output (Phase 29) and must never be treated as real until then.
 */
export const MOCK_DASHBOARD_DATA: DashboardData = {
  greeting: 'Good morning. Here is what matters today.',
  summary: '4 open tasks · 2 due today · 3 of 6 completed this week',
  kpis: [
    { label: 'Due Today', value: '2', sub: '1 high priority', tone: 'primary' },
    { label: 'Overdue', value: '1', sub: 'Needs attention', tone: 'danger' },
    { label: 'Focus Time', value: '1h 30m', sub: '38% of daily capacity', tone: 'info' },
    { label: 'Weekly Progress', value: '50%', sub: '3 of 6 completed', tone: 'primary' },
    { label: 'Streak', value: '4', sub: 'days planning streak', tone: 'warning' },
  ],
  focusNow: [
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
      id: 'TASK-0002',
      title: 'Review English vocabulary set',
      area: 'Learning',
      priority: 'High',
      dueLabel: 'Overdue 1 day',
      smartScore: 88,
      recommendedAction: 'Break down',
    },
    {
      id: 'TASK-0003',
      title: 'Renew gym membership',
      area: 'Health',
      priority: 'Medium',
      dueLabel: 'Due in 2 days',
      smartScore: 61,
      recommendedAction: 'Schedule',
    },
  ],
  areas: [
    { area: 'Career', progress: 72, completed: 8, open: 3, total: 11 },
    { area: 'Learning', progress: 60, completed: 6, open: 4, total: 10 },
    { area: 'Health', progress: 45, completed: 3, open: 4, total: 7 },
    { area: 'Personal', progress: 30, completed: 1, open: 3, total: 4 },
  ],
  insights: [
    { tone: 'danger', text: '1 overdue task needs attention before taking on more work.' },
    { tone: 'warning', text: 'Today is close to your daily focus capacity.' },
    { tone: 'success', text: 'Weekly completion rate is on track at 50%.' },
  ],
};
