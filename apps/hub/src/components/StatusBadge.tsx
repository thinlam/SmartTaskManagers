import type { AppStatus } from '../data/apps';

const STATUS_CLASSES: Record<AppStatus, string> = {
  ready: 'bg-success-soft text-success',
  beta: 'bg-warning-soft text-warning',
  soon: 'bg-surface-secondary text-ink-secondary',
};

const STATUS_LABELS: Record<AppStatus, string> = {
  ready: 'SẴN SÀNG',
  beta: 'BETA',
  soon: 'SẮP RA MẮT',
};

export function StatusBadge({ status }: { status: AppStatus }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
