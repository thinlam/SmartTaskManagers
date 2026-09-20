import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar, Topbar, type SidebarGroup } from '@stm/ui';
import { APP_ROUTES, NAV_GROUP_ORDER } from './routes';

/**
 * Real Sidebar + Topbar (Phase 08), replacing Phase 07's temporary <nav>.
 * Both components are presentational and router-agnostic (live in
 * packages/ui so apps/web can reuse them later) — this file is the only
 * place that knows about react-router: it computes `active` from the
 * current location and builds hrefs from APP_ROUTES.
 */
export function AppShell() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const groups: SidebarGroup[] = NAV_GROUP_ORDER.map((groupLabel) => ({
    label: groupLabel,
    items: APP_ROUTES.filter((route) => route.group === groupLabel).map((route) => {
      const Icon = route.icon;
      const isRoot = route.path === '/';
      return {
        key: route.path,
        label: route.label,
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
          onNewTask={() => {
            // Quick Add doesn't exist yet — real dialog lands with Phase 12 (Tasks).
            console.info('Quick Add chưa được xây — sẽ làm ở Phase 12 (Tasks).');
          }}
        />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
