import type { GoalStatus } from '@stm/types';
import { Badge } from './Badge';

/**
 * GoalStatus has no dedicated color-token family (unlike Status/Priority/
 * Risk) — Goals have no equivalent of Frame 02's team status list to
 * diverge from, so this reuses the generic semantic tones straight from
 * `Badge`'s `tone` variant: info (actively tracking) / warning (needs
 * attention) / success (done).
 */
const STATUS_TONE: Record<GoalStatus, 'info' | 'warning' | 'success'> = {
  'On Track': 'info',
  'At Risk': 'warning',
  Completed: 'success',
};

export interface GoalStatusBadgeProps {
  status: GoalStatus;
}

export function GoalStatusBadge({ status }: GoalStatusBadgeProps) {
  return <Badge tone={STATUS_TONE[status]}>{status}</Badge>;
}
