import type { GoalStatus } from '@stm/types';
import { GoalStatusBadge } from '../Badge';
import { Progress } from '../Progress';

export interface GoalCardProps {
  name: string;
  area: string;
  targetLabel: string;
  status: GoalStatus;
  progress: number;
  /** Count of tasks linked via Task.goalId — plain count, not a metrics engine. */
  linkedTaskCount: number;
}

/**
 * Simpler than ProjectCard by design: `apps/google-sheets/src/14_Projects.gs`
 * has a full computed-metrics engine (health score, top focus, next
 * action) for Projects, but Goals have no equivalent view on the Sheets
 * side — `progress`/`status` are plain fields the user sets directly
 * (see the `Goal` type in `@stm/types`). This card only renders what's
 * real: no fabricated health score or recommended action.
 */
export function GoalCard({
  name,
  area,
  targetLabel,
  status,
  progress,
  linkedTaskCount,
}: GoalCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-semibold text-ink-primary">{name}</span>
        <GoalStatusBadge status={status} />
      </div>

      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-ink-secondary">
          {area} · {targetLabel}
        </span>
        <span className="shrink-0 font-semibold text-ink-primary">{progress}% complete</span>
      </div>

      <Progress value={progress} />

      <span className="text-xs text-ink-muted">
        {linkedTaskCount === 0
          ? 'No tasks linked yet'
          : `${linkedTaskCount} task${linkedTaskCount === 1 ? '' : 's'} linked`}
      </span>
    </div>
  );
}
