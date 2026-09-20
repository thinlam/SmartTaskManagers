import { cn } from '@stm/ui';
import { NavLink, Outlet, type NavLinkRenderProps } from 'react-router-dom';
import { APP_ROUTES } from './routes';

/**
 * Phase 07 structural shell only. The <nav> below is a temporary stand-in
 * for the real Sidebar — Phase 08 replaces it with a proper component
 * (grouped headers, icons, collapse, active/hover states per Canva) built
 * from this exact same APP_ROUTES data, so nothing here is throwaway
 * beyond the markup itself.
 */
export function AppShell() {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-56 shrink-0 border-r border-border bg-surface p-4">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          ⚡ Smart Task
        </p>
        <nav className="flex flex-col gap-1">
          {APP_ROUTES.map((route) => (
            <NavLink
              key={route.path}
              to={route.path}
              end={route.path === '/'}
              className={({ isActive }: NavLinkRenderProps) =>
                cn(
                  'rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary-light text-primary'
                    : 'text-ink-secondary hover:bg-surface-secondary',
                )
              }
            >
              {route.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
