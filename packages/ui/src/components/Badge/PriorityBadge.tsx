import type { Priority } from '@stm/types';
import { Badge } from './Badge';

/**
 * Uses the dedicated priority-* color tokens (packages/ui/src/tokens/colors.ts
 * → priorityColors), not the generic semantic tones — those have slightly
 * different hex values (e.g. generic `warning` #D97706 vs `priority-high`
 * #F59E0B) and Priority must stay visually distinct from Status/Risk.
 * `/10` is Tailwind's opacity modifier — a soft tint of the same color,
 * avoiding a separate "-soft" token per priority level.
 */
const PRIORITY_CLASSES: Record<Priority, string> = {
  Critical: 'bg-priority-critical/10 text-priority-critical',
  Urgent: 'bg-priority-urgent/10 text-priority-urgent',
  High: 'bg-priority-high/10 text-priority-high',
  Medium: 'bg-priority-medium/10 text-priority-medium',
  Low: 'bg-priority-low/10 text-priority-low',
};

export interface PriorityBadgeProps {
  priority: Priority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return <Badge className={PRIORITY_CLASSES[priority]}>{priority}</Badge>;
}
