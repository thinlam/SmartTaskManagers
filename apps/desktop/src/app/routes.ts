/**
 * Personal-Mode navigation taxonomy, decided at Phase 04
 * (docs/design-system/design-tokens.md → "Sidebar (Personal Mode)").
 * This is the single source of truth for both the temporary nav in
 * AppShell (Phase 07) and the real Sidebar (Phase 08) — grouped the same
 * way, driven from the same array, so there is exactly one place that
 * defines "what screens exist and how they're grouped".
 */
export type NavGroup = 'Overview' | 'Planning' | 'Personal' | 'Insights' | 'System';

export interface AppRoute {
  path: string;
  label: string;
  group: NavGroup;
  /** Which roadmap Phase implements this screen for real. */
  phase: string;
}

export const APP_ROUTES: AppRoute[] = [
  { path: '/', label: 'Dashboard', group: 'Overview', phase: 'Phase 09' },
  { path: '/today', label: 'Today', group: 'Overview', phase: 'Phase 10' },
  { path: '/inbox', label: 'Inbox', group: 'Overview', phase: 'Phase 11' },

  { path: '/tasks', label: 'Tasks', group: 'Planning', phase: 'Phase 12' },
  { path: '/projects', label: 'Projects', group: 'Planning', phase: 'Phase 13' },
  { path: '/calendar', label: 'Calendar', group: 'Planning', phase: 'Phase 16' },
  { path: '/kanban', label: 'Kanban', group: 'Planning', phase: 'Phase 17' },

  { path: '/goals', label: 'Goals', group: 'Personal', phase: 'Phase 14' },
  { path: '/habits', label: 'Habits', group: 'Personal', phase: 'Phase 15' },

  { path: '/analytics', label: 'Analytics', group: 'Insights', phase: 'Phase 18' },
  {
    path: '/assistant',
    label: 'Smart Assistant',
    group: 'Insights',
    phase: 'Phase 29+ (Smart Engine)',
  },

  { path: '/settings', label: 'Settings', group: 'System', phase: 'Phase 19' },
];
