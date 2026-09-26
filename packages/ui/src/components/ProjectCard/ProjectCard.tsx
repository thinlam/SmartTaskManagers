import type { ProjectHealth } from '@stm/types';
import { ProjectHealthBadge } from '../Badge';
import { Progress } from '../Progress';
import { cn } from '../../lib/cn';

export interface ProjectCardMetricChip {
  label: string;
  value: number;
  tone: 'info' | 'success' | 'danger' | 'warning' | 'neutral';
}

export interface ProjectCardProps {
  name: string;
  area: string;
  targetLabel: string;
  health: ProjectHealth;
  /** Translated health text — falls back to the raw enum value when omitted. */
  healthLabel?: string;
  progress: number;
  /** Translated "N% complete" text — falls back to English when omitted. */
  progressLabel?: string;
  chips: ProjectCardMetricChip[];
  topFocusText: string;
  /** Translated "Top focus" section label — falls back to English when omitted. */
  topFocusLabel?: string;
  hasTopTask: boolean;
  nextActionText: string;
  /** Translated "Next" section label — falls back to English when omitted. */
  nextLabel?: string;
}

const STRIPE_CLASSES: Record<ProjectHealth, string> = {
  Healthy: 'bg-risk-low',
  Attention: 'bg-risk-medium',
  'At Risk': 'bg-risk-high',
  Critical: 'bg-risk-critical',
};

const NEXT_LABEL_CLASSES: Record<ProjectHealth, string> = {
  Healthy: 'bg-risk-low/10 text-risk-low',
  Attention: 'bg-risk-medium/10 text-risk-medium',
  'At Risk': 'bg-risk-high/10 text-risk-high',
  Critical: 'bg-risk-critical/10 text-risk-critical',
};

const CHIP_TONE_CLASSES: Record<ProjectCardMetricChip['tone'], string> = {
  info: 'bg-info-soft text-info',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  neutral: 'bg-surface-secondary text-ink-secondary',
};

/**
 * Ported layout from writeProjectCard_() in
 * apps/google-sheets/src/14_Projects.gs — health-colored left stripe,
 * name + health badge, area/target + progress%, progress bar, 4 metric
 * chips (Open/Done/Overdue/Waiting), "Top Focus" and "Next" rows. All
 * text (topFocusText/nextActionText/chip values) is computed by the
 * caller via packages/shared's computeProjectMetrics()/
 * getProjectTopFocusText()/getProjectNextAction() — this component only
 * renders.
 */
export function ProjectCard({
  name,
  area,
  targetLabel,
  health,
  healthLabel,
  progress,
  progressLabel,
  chips,
  topFocusText,
  topFocusLabel = 'Top focus',
  hasTopTask,
  nextActionText,
  nextLabel = 'Next',
}: ProjectCardProps) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-border bg-surface">
      <div className={cn('w-1.5 shrink-0', STRIPE_CLASSES[health])} aria-hidden="true" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="text-sm font-semibold text-ink-primary">{name}</span>
          <ProjectHealthBadge health={health} label={healthLabel} />
        </div>

        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-ink-secondary">
            {area} · {targetLabel}
          </span>
          <span className="shrink-0 font-semibold text-ink-primary">
            {progressLabel ?? `${progress}% complete`}
          </span>
        </div>

        <Progress value={progress} />

        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip.label}
              className={cn(
                'rounded-md px-2 py-1 text-xs font-medium',
                CHIP_TONE_CLASSES[chip.tone],
              )}
            >
              {chip.label} {chip.value}
            </span>
          ))}
        </div>

        <div className="flex items-start gap-2 text-xs">
          <span className="shrink-0 rounded-md bg-primary-light px-2 py-0.5 font-semibold uppercase tracking-wide text-primary">
            {topFocusLabel}
          </span>
          <span className={hasTopTask ? 'font-medium text-ink-primary' : 'text-ink-muted'}>
            {topFocusText}
          </span>
        </div>

        <div className="flex items-start gap-2 text-xs">
          <span
            className={cn(
              'shrink-0 rounded-md px-2 py-0.5 font-semibold uppercase tracking-wide',
              NEXT_LABEL_CLASSES[health],
            )}
          >
            {nextLabel}
          </span>
          <span className="text-ink-secondary">{nextActionText}</span>
        </div>
      </div>
    </div>
  );
}
