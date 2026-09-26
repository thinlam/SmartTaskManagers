import type { ProjectHealth } from '@stm/types';
import { Badge } from './Badge';

/**
 * Reuses the risk-* color tokens directly (not a separate health-*
 * set) — Frame 01 §5 states Risk and Project Health share one 4-level
 * severity scale (Low/Healthy, Medium/Attention, High/At Risk,
 * Critical), so a second token set with the same hex values would just
 * be duplication.
 */
const HEALTH_CLASSES: Record<ProjectHealth, string> = {
  Healthy: 'bg-risk-low/10 text-risk-low',
  Attention: 'bg-risk-medium/10 text-risk-medium',
  'At Risk': 'bg-risk-high/10 text-risk-high',
  Critical: 'bg-risk-critical/10 text-risk-critical',
};

export interface ProjectHealthBadgeProps {
  health: ProjectHealth;
  /** Translated display text — falls back to the raw enum value when omitted (this package has no i18n access). */
  label?: string;
}

export function ProjectHealthBadge({ health, label }: ProjectHealthBadgeProps) {
  return <Badge className={HEALTH_CLASSES[health]}>{label ?? health}</Badge>;
}
