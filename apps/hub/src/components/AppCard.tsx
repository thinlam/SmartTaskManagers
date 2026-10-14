import { Link } from 'react-router-dom';
import { Button } from '@stm/ui';
import type { AppEntry } from '../data/apps';
import { StatusBadge } from './StatusBadge';
import { InstallButton } from './InstallButton';

function primaryActionLabel(app: AppEntry): string {
  if (app.status === 'soon') return 'Sắp ra mắt';
  if (app.status === 'beta') return 'Dùng thử Beta';
  return 'Tải về';
}

export function AppCard({ app }: { app: AppEntry }) {
  const hasDownload = app.platforms.some((p) => p.downloadUrl);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-light text-sm font-bold text-primary">
          {app.badge}
        </span>
        <StatusBadge status={app.status} />
      </div>

      <div>
        <Link to={`/apps/${app.id}`} className="text-base font-semibold text-ink-primary hover:underline">
          {app.name}
        </Link>
        <p className="mt-1 text-sm text-ink-secondary">{app.shortDesc}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {app.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-surface-secondary px-2 py-1 text-xs font-medium text-ink-secondary"
          >
            {tag}
          </span>
        ))}
      </div>

      {app.status === 'soon' ? (
        <Button variant="secondary" disabled className="mt-auto w-full">
          {primaryActionLabel(app)}
        </Button>
      ) : app.id === 'smart-task-manager' ? (
        <InstallButton
          app={app}
          className="mt-auto w-full"
          fallback={
            <Link to={`/apps/${app.id}`}>
              <Button
                variant={app.status === 'beta' ? 'secondary' : 'primary'}
                className="w-full"
              >
                {hasDownload ? primaryActionLabel(app) : 'Xem chi tiết'}
              </Button>
            </Link>
          }
        />
      ) : (
        <Link to={`/apps/${app.id}`} className="mt-auto">
          <Button variant={app.status === 'beta' ? 'secondary' : 'primary'} className="w-full">
            {hasDownload ? primaryActionLabel(app) : 'Xem chi tiết'}
          </Button>
        </Link>
      )}
    </div>
  );
}
