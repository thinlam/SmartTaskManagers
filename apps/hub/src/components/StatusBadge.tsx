import type { AppStatus } from '../data/apps';

const STATUS_CLASSES: Record<AppStatus, string> = {
  ready: 'bg-success-soft text-success',
  beta: 'bg-warning-soft text-warning',
  soon: 'bg-surface-secondary text-ink-secondary',
};

const STATUS_LABELS: Record<AppStatus, string> = {
  ready: 'Sẵn sàng',
  beta: 'Beta',
  soon: 'Sắp ra mắt',
};

export function StatusBadge({ status }: { status: AppStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
