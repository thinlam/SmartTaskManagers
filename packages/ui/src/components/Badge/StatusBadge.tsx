import type { TaskStatus } from '@stm/types';
import { Badge } from './Badge';

/**
 * Uses the dedicated status-* color tokens (packages/ui/src/tokens/colors.ts
 * → statusColors) — Personal Mode's real 5-value Status enum, not Frame
 * 02's original 8-value team list (see the comment in colors.ts).
 */
const STATUS_CLASSES: Record<TaskStatus, string> = {
  Inbox: 'bg-status-inbox/10 text-status-inbox',
  'To Do': 'bg-status-to-do/10 text-status-to-do',
  'In Progress': 'bg-status-in-progress/10 text-status-in-progress',
  Waiting: 'bg-status-waiting/10 text-status-waiting',
  Completed: 'bg-status-completed/10 text-status-completed',
};

export interface StatusBadgeProps {
  status: TaskStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge className={STATUS_CLASSES[status]}>{status}</Badge>;
}
