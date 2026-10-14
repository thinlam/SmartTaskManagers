import { Link, useParams } from 'react-router-dom';
import { Button } from '@stm/ui';
import { getAppById } from '../data/apps';
import { StatusBadge } from '../components/StatusBadge';
import { openExternal } from '../lib/openExternal';

export function AppDetailPage() {
  const { id } = useParams<{ id: string }>();
  const app = id ? getAppById(id) : undefined;

  if (!app) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-ink-secondary">Không tìm thấy ứng dụng.</p>
        <Link to="/" className="mt-4 inline-block text-primary hover:underline">
          ← Quay lại App Hub
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link to="/" className="text-sm text-primary hover:underline">
        ← Quay lại App Hub
      </Link>

      <div className="mt-4 flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary-light text-base font-bold text-primary">
          {app.badge}
        </span>
        <div>
          <h1 className="text-3xl font-bold text-ink-primary">{app.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={app.status} />
            {app.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-surface-secondary px-2 py-1 text-xs font-medium text-ink-secondary"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-6 max-w-3xl text-ink-secondary">{app.longDesc}</p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          {app.features && app.features.length > 0 && (
            <div className="rounded-lg border border-border bg-surface p-6">
              <h2 className="text-lg font-semibold text-ink-primary">Tính năng chính</h2>
              <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                {app.features.map((f) => (
                  <div key={f.title}>
                    <p className="font-medium text-ink-primary">{f.title}</p>
                    <p className="mt-1 text-sm text-ink-secondary">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {app.installSteps && app.installSteps.length > 0 && (
            <div className="rounded-lg border border-border bg-surface p-6">
              <h2 className="text-lg font-semibold text-ink-primary">Cài đặt</h2>
              <ol className="mt-4 flex flex-col gap-4">
                {app.installSteps.map((step, i) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="text-sm text-ink-primary">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-lg border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold text-ink-primary">Chọn phiên bản để tải</h2>
            <div className="mt-4 flex flex-col gap-3">
              {app.platforms.length === 0 && (
                <p className="text-sm text-ink-secondary">Chưa có bản tải cho ứng dụng này.</p>
              )}
              {app.platforms.map((platform) => (
                <div
                  key={platform.label}
                  className={
                    platform.downloadUrl
                      ? 'rounded-md border border-primary/30 bg-primary-light/40 p-4'
                      : 'rounded-md border border-border p-4'
                  }
                >
                  <p className="font-medium text-ink-primary">{platform.label}</p>
                  <p className="mt-1 text-xs text-ink-secondary">{platform.note}</p>
                  {platform.downloadUrl ? (
                    <Button
                      className="mt-3 w-full"
                      onClick={() => openExternal(platform.downloadUrl!)}
                    >
                      {platform.actionLabel}
                    </Button>
                  ) : (
                    <Button variant="secondary" disabled className="mt-3 w-full">
                      {platform.actionLabel}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
