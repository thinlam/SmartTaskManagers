import type { Priority, TaskStatus } from '@stm/types';
import { PriorityBadge, StatusBadge } from '../Badge';
import { Progress } from '../Progress';

export interface TaskCardProps {
  title: string;
  /** e.g. "Career", "Website Redesign" — Area or Project label. */
  meta: string;
  dueLabel: string;
  priority: Priority;
  /** Omit in "focus" contexts (Dashboard/Today) where status is implied by the section. */
  status?: TaskStatus;
  /** 0–100. Renders a thin progress bar under the row when provided. */
  progress?: number;
  /**
   * SmartScore / RecommendedAction are Smart Engine output (Phase 29) —
   * optional because most contexts before then have nothing real to show.
   */
  smartScore?: number;
  recommendedAction?: string;
}

/**
 * Row-style task card — the "Focus Today" / "Focus Now" treatment repeated
 * across Dashboard (Phase 09) and Today (Phase 10) in both Canva and the
 * existing Google Sheets client, extended at Phase 12 with optional
 * `status`/`progress` for the Tasks list (a 3rd, denser context) without
 * changing how it renders anywhere `status`/`progress` are omitted.
 * Distinct from a Kanban tile, which may get its own component later if
 * the visual needs diverge (Phase 17).
 */
export function TaskCard({
  title,
  meta,
  dueLabel,
  priority,
  status,
  progress,
  smartScore,
  recommendedAction,
}: TaskCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-sm font-medium text-ink-primary">{title}</span>
          <span className="text-xs text-ink-secondary">
            {meta} · {dueLabel}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {status && <StatusBadge status={status} />}
          <PriorityBadge priority={priority} />
          {typeof smartScore === 'number' && (
            <span className="text-sm font-semibold text-ink-primary" title="Smart Score">
              {smartScore}
            </span>
          )}
          {recommendedAction && (
            <span className="text-xs font-semibold text-primary">→ {recommendedAction}</span>
          )}
        </div>
      </div>
      {typeof progress === 'number' && <Progress value={progress} />}
    </div>
  );
}
