import type { TaskSummary } from '@stm/types';

/**
 * Seed data for Inbox's local demo state (Phase 11) — Inbox is the first
 * screen with real Create/Update/Delete interactions, but they only
 * touch component state; nothing survives a reload until Phase 27 wires
 * up the real API + database. smartScore/recommendedAction are omitted
 * (not just placeholder-zero) — a freshly captured, untriaged task has
 * no Smart Engine output yet, computed or otherwise.
 */
export const MOCK_INBOX_TASKS: TaskSummary[] = [
  {
    id: 'TASK-INBOX-1',
    title: 'Renew passport before it expires',
    area: 'Personal Admin',
    priority: 'Medium',
    dueLabel: 'No due date',
  },
  {
    id: 'TASK-INBOX-2',
    title: 'Look into an online TypeScript course',
    area: 'Learning',
    priority: 'Low',
    dueLabel: 'No due date',
  },
  {
    id: 'TASK-INBOX-3',
    title: 'Book a dentist check-up',
    area: 'Health',
    priority: 'Medium',
    dueLabel: 'No due date',
  },
];
