import type { ComponentType } from 'react';
import {
  Calendar,
  CalendarCheck,
  ChartColumn,
  FolderKanban,
  Inbox as InboxIcon,
  Kanban,
  LayoutDashboard,
  ListChecks,
  Repeat,
  Settings,
  Sparkles,
  Target,
  type LucideProps,
} from 'lucide-react';

/**
 * Personal-Mode navigation taxonomy, decided at Phase 04
 * (docs/design-system/design-tokens.md → "Sidebar (Personal Mode)").
 * This is the single source of truth for the real Sidebar (Phase 08) and
 * the router (Phase 07) — grouped the same way, driven from the same
 * array, so there is exactly one place that defines "what screens exist,
 * how they're grouped, and what icon represents them".
 */
export type NavGroup = 'Overview' | 'Planning' | 'Personal' | 'Insights' | 'System';

export const NAV_GROUP_ORDER: NavGroup[] = [
  'Overview',
  'Planning',
  'Personal',
  'Insights',
  'System',
];

export interface AppRoute {
  path: string;
  label: string;
  group: NavGroup;
  /** Which roadmap Phase implements this screen for real. */
  phase: string;
  icon: ComponentType<LucideProps>;
}

export const APP_ROUTES: AppRoute[] = [
  { path: '/', label: 'Dashboard', group: 'Overview', phase: 'Phase 09', icon: LayoutDashboard },
  { path: '/today', label: 'Today', group: 'Overview', phase: 'Phase 10', icon: CalendarCheck },
  { path: '/inbox', label: 'Inbox', group: 'Overview', phase: 'Phase 11', icon: InboxIcon },

  { path: '/tasks', label: 'Tasks', group: 'Planning', phase: 'Phase 12', icon: ListChecks },
  {
    path: '/projects',
    label: 'Projects',
    group: 'Planning',
    phase: 'Phase 13',
    icon: FolderKanban,
  },
  { path: '/calendar', label: 'Calendar', group: 'Planning', phase: 'Phase 16', icon: Calendar },
  { path: '/kanban', label: 'Kanban', group: 'Planning', phase: 'Phase 17', icon: Kanban },

  { path: '/goals', label: 'Goals', group: 'Personal', phase: 'Phase 14', icon: Target },
  { path: '/habits', label: 'Habits', group: 'Personal', phase: 'Phase 15', icon: Repeat },

  {
    path: '/analytics',
    label: 'Analytics',
    group: 'Insights',
    phase: 'Phase 18',
    icon: ChartColumn,
  },
  {
    path: '/assistant',
    label: 'Smart Assistant',
    group: 'Insights',
    phase: 'Post-Phase 30',
    icon: Sparkles,
  },

  { path: '/settings', label: 'Settings', group: 'System', phase: 'Phase 19', icon: Settings },
];
