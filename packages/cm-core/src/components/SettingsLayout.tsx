import { useState, type ElementType, type ReactNode } from 'react';
import { cn } from '../lib/format';
import { Card, PageHeader } from './ui';

export interface SettingsTab {
  id: string;
  label: string;
  icon: ElementType;
  render: () => ReactNode;
}

/** Vertical section nav on desktop, horizontal scrolling tabs on mobile. */
export function SettingsLayout({
  title,
  subtitle,
  tabs,
}: {
  title: string;
  subtitle: string;
  tabs: SettingsTab[];
}) {
  const [active, setActive] = useState(tabs[0]!.id);
  const tab = tabs.find((t) => t.id === active) ?? tabs[0]!;

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <nav
          aria-label={title}
          className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0"
        >
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-current={id === active ? 'page' : undefined}
              onClick={() => setActive(id)}
              className={cn(
                'flex h-10 shrink-0 cursor-pointer items-center gap-2.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors',
                id === active
                  ? 'bg-brand-soft text-brand'
                  : 'text-ink-2 hover:bg-sunken hover:text-ink',
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </button>
          ))}
        </nav>
        <div className="max-w-3xl min-w-0 space-y-5">{tab.render()}</div>
      </div>
    </>
  );
}

export function Section({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card>
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-base font-bold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-2">{description}</p>}
      </div>
      <div className="px-5 py-5">{children}</div>
      {footer && (
        <div className="flex justify-end gap-2 rounded-b-lg border-t border-line bg-canvas/60 px-5 py-3">
          {footer}
        </div>
      )}
    </Card>
  );
}
