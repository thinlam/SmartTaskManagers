import { Link } from 'react-router-dom';
import { Button } from '@stm/ui';
import type { AppEntry } from '../data/apps';
import { AppIcon } from './AppIcon';
import { InstallButton } from './InstallButton';
import { StatusBadge } from './StatusBadge';

function DetailLink({ app }: { app: AppEntry }) {
  const hasDownload = app.platforms.some((p) => p.downloadUrl);
  return (
    <Link to={`/apps/${app.id}`} className="block">
      <Button variant={hasDownload ? 'primary' : 'secondary'} className="w-full">
        {hasDownload ? 'Tải về' : 'Xem chi tiết'}
      </Button>
    </Link>
  );
}

export function AppCard({ app }: { app: AppEntry }) {
  const version = app.platforms.find((p) => p.installer)?.installer?.version;

  return (
    <div className="group flex flex-col rounded-xl border border-border bg-surface p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        <AppIcon id={app.id} badge={app.badge} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              to={`/apps/${app.id}`}
              className="truncate font-semibold text-ink-primary hover:text-primary"
            >
              {app.name}
            </Link>
            {app.status !== 'ready' && <StatusBadge status={app.status} />}
          </div>
          <p className="mt-0.5 text-xs text-ink-muted">
            {app.category}
            {version ? ` · v${version}` : ''}
          </p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-ink-secondary">{app.shortDesc}</p>

      <div className="mt-auto pt-4">
        {app.status === 'soon' ? (
          <Button variant="secondary" disabled className="w-full">
            Sắp ra mắt
          </Button>
        ) : (
          <InstallButton app={app} className="w-full" fallback={<DetailLink app={app} />} />
        )}
      </div>
    </div>
  );
}
