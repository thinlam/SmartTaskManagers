import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { AppNotification } from '@stm/types';
import { useNotifications } from '@stm/hooks';
import { Sidebar, Topbar, type SidebarGroup } from '@stm/ui';
import { APP_ROUTES, NAV_GROUP_ORDER } from './routes';
import { useTasksContext } from '../state/TasksContext';
import { useAuthContext } from '../state/AuthContext';
import { reportError } from '../lib/reportError';
import { TaskDetailDrawer } from '../components/TaskDetailDrawer';
import { ProjectDetailDrawer } from '../components/ProjectDetailDrawer';
import { GoalDetailDrawer } from '../components/GoalDetailDrawer';
import { HabitDetailDrawer } from '../components/HabitDetailDrawer';

/** Where a notification's entity lives — clicking one navigates there. */
const ENTITY_TYPE_PATH: Record<NonNullable<AppNotification['entityType']>, string> = {
  Task: '/tasks',
  Habit: '/habits',
  Goal: '/goals',
};

const NAV_LABEL_KEYS: Record<string, string> = {
  '/': 'nav.dashboard',
  '/today': 'nav.today',
  '/inbox': 'nav.inbox',
  '/tasks': 'nav.tasks',
  '/projects': 'nav.projects',
  '/calendar': 'nav.calendar',
  '/kanban': 'nav.kanban',
  '/goals': 'nav.goals',
  '/habits': 'nav.habits',
  '/analytics': 'nav.analytics',
  '/assistant': 'nav.assistant',
  '/settings': 'nav.settings',
};

/**
 * Real Sidebar + Topbar (Phase 08), replacing Phase 07's temporary <nav>.
 * Both components are presentational and router-agnostic (live in
 * packages/ui so apps/web can reuse them later) — this file is the only
 * place that knows about react-router: it computes `active` from the
 * current location and builds hrefs from APP_ROUTES.
 *
 * TaskDetailDrawer is rendered here, once, regardless of route — Topbar's
 * "+ New Task" must work from any page (Phase 12, step 2), which only
 * works if the drawer isn't nested inside a single page like TasksPage.
 */
export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const { openCreateDrawer } = useTasksContext();
  const { email, logout } = useAuthContext();
  const {
    notifications,
    isLoading: notificationsLoading,
    markRead,
    markAllRead,
  } = useNotifications();

  function handleNotificationClick(notification: AppNotification) {
    if (!notification.isRead) {
      markRead(notification.id).catch(reportError);
    }
    if (notification.entityType) {
      navigate(ENTITY_TYPE_PATH[notification.entityType]);
    }
  }

  const groups: SidebarGroup[] = NAV_GROUP_ORDER.map((groupLabel) => ({
    label: groupLabel,
    items: APP_ROUTES.filter((route) => route.group === groupLabel).map((route) => {
      const Icon = route.icon;
      const isRoot = route.path === '/';
      return {
        key: route.path,
        label: t(NAV_LABEL_KEYS[route.path] ?? route.label),
        href: `#${route.path}`,
        icon: <Icon className="h-4 w-4" aria-hidden="true" />,
        active: isRoot ? location.pathname === '/' : location.pathname.startsWith(route.path),
      };
    }),
  }));

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        groups={groups}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          onNewTask={openCreateDrawer}
          onAccountSettingsClick={() => navigate('/account-settings')}
          onSignOutClick={logout}
          accountLabel={email ?? undefined}
          accountSettingsLabel={t('auth.accountSettings')}
          signOutLabel={t('auth.signOut')}
          notifications={notifications}
          notificationsLoading={notificationsLoading}
          onNotificationClick={handleNotificationClick}
          onMarkAllNotificationsRead={() => markAllRead().catch(reportError)}
        />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <TaskDetailDrawer />
      <ProjectDetailDrawer />
      <GoalDetailDrawer />
      <HabitDetailDrawer />
    </div>
  );
}
