import type { Goal } from '@stm/types';

/**
 * Seed data for Goals' local demo state (Phase 14) — same pattern as
 * Projects (Phase 13): loaded into useGoals() as initial state, mutated
 * only in memory. Some tasks in apps/desktop/src/mock/tasks.ts reference
 * these ids via `goalId` — keep both files in sync.
 *
 * Unlike Projects, `progress`/`status` here are hand-set values, not
 * derived — Goals have no computed-metrics engine on the Sheets side
 * (see the `Goal` type doc comment in @stm/types). The spread of
 * statuses (On Track/At Risk/Completed) is a deliberate seed choice, not
 * a computed outcome.
 */
export const MOCK_GOALS: Goal[] = [
  {
    id: 'GOAL-0001',
    name: 'Learn Conversational English',
    area: 'Learning',
    targetDate: '2027-03-01',
    progress: 45,
    status: 'On Track',
    createdAt: '2026-08-20T08:00:00.000Z',
    updatedAt: '2026-09-14T08:00:00.000Z',
  },
  {
    id: 'GOAL-0002',
    name: 'Launch Personal Portfolio',
    area: 'Career',
    targetDate: '2026-10-31',
    progress: 70,
    status: 'At Risk',
    createdAt: '2026-08-25T08:00:00.000Z',
    updatedAt: '2026-09-19T10:42:00.000Z',
  },
  {
    id: 'GOAL-0003',
    name: 'Run a 5K',
    area: 'Health',
    targetDate: null,
    progress: 100,
    status: 'Completed',
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-08-30T08:00:00.000Z',
  },
];
