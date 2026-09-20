import type { ReactNode } from 'react';
import { PanelLeftClose, PanelLeftOpen, Zap } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface SidebarNavItem {
  key: string;
  label: string;
  /**
   * A real href, not an onClick handler — lets the browser/webview handle
   * navigation natively (keyboard, middle-click, screen readers) instead
   * of Sidebar re-implementing link semantics. The consumer decides the
   * scheme (e.g. `#/tasks` for hash routing); Sidebar renders it verbatim.
   */
  href: string;
  icon: ReactNode;
  active?: boolean;
  /** Not populated by any screen yet — no real counts exist before their data phase. */
  badge?: number;
}

export interface SidebarGroup {
  label: string;
  items: SidebarNavItem[];
}

export interface SidebarProps {
  groups: SidebarGroup[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

/**
 * Personal Mode navigation (Frame 03–15 sidebar, minus "Members" — see
 * docs/design-system/design-tokens.md). Grouping/order comes entirely
 * from `groups`; this component only renders.
 */
export function Sidebar({ groups, collapsed = false, onToggleCollapse }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-screen shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-150',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className="flex h-16 items-center justify-between px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="text-sm font-semibold text-ink-primary">Smart Task</span>
          </div>
        )}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface-secondary hover:text-ink-primary',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              collapsed && 'mx-auto',
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {groups.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed && (
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {group.label}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <a
                  key={item.key}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  aria-current={item.active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    item.active
                      ? 'bg-primary-light font-medium text-primary'
                      : 'text-ink-secondary hover:bg-surface-secondary hover:text-ink-primary',
                    collapsed && 'justify-center px-2',
                  )}
                >
                  <span className="shrink-0">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && item.badge ? (
                    <span className="ml-auto rounded-full bg-danger px-1.5 text-xs font-semibold text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </a>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
