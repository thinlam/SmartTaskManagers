import type { ReactNode } from 'react';
import { Loader2, X } from 'lucide-react';
import { Button } from '@stm/ui';
import type { AppEntry } from '../data/apps';
import { useInstallState } from '../lib/installManager';

export function InstallButton({
  app,
  fallback,
  className,
}: {
  app: AppEntry;
  fallback: ReactNode;
  className?: string;
}) {
  const controller = useInstallState(app);

  if (!controller) return <>{fallback}</>;

  const { status } = controller;

  if (status.kind === 'not-installed') {
    return (
      <Button className={className} onClick={controller.install}>
        Tải về
      </Button>
    );
  }

  if (status.kind === 'downloading') {
    return (
      <div className={className}>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-secondary">
          <div
            className="h-full bg-primary transition-[width]"
            style={{ width: `${status.percent}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-ink-secondary">
          <span>{status.percent}%</span>
          <button onClick={controller.cancel} className="font-medium text-danger hover:underline">
            Hủy
          </button>
        </div>
      </div>
    );
  }

  if (status.kind === 'installing') {
    return (
      <Button
        className={className}
        disabled
        leadingIcon={<Loader2 className="h-4 w-4 animate-spin" />}
      >
        Đang cài đặt...
      </Button>
    );
  }

  if (status.kind === 'installed') {
    return (
      <Button className={className} onClick={controller.open}>
        Mở
      </Button>
    );
  }

  if (status.kind === 'update-available') {
    return (
      <Button className={className} variant="secondary" onClick={controller.install}>
        Cập nhật
      </Button>
    );
  }

  return (
    <div className={className}>
      <p className="mb-2 flex items-center gap-1 text-xs text-danger">
        <X className="h-3.5 w-3.5" /> {status.message}
      </p>
      <Button className="w-full" variant="secondary" onClick={controller.retry}>
        Thử lại
      </Button>
    </div>
  );
}
