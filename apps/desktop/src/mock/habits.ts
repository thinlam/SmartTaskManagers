import type { Habit } from '@stm/types';

/**
 * Seed data for Habits' local demo state (Phase 15) — same pattern as
 * Goals (Phase 14): loaded into useHabits() as initial state, mutated
 * only in memory. Habits are standalone — no task in mock/tasks.ts
 * references these ids (there's no Task→Habit link in the real data
 * model; see the `Habit` type doc comment in @stm/types).
 *
 * Deliberately covers a spread of card states: HAB-0001 has a target and
 * hasn't checked in today (streak can still grow); HAB-0002 already
 * checked in today (demonstrates the disabled "Checked in today" state);
 * HAB-0003 is Weekly with a target; HAB-0004 has never been checked in
 * (streak 0, no last-done date).
 */
export const MOCK_HABITS: Habit[] = [
  {
    id: 'HAB-0001',
    name: 'Morning meditation',
    frequency: 'Daily',
    streak: 12,
    targetCount: 30,
    completedCount: 18,
    lastCompletedDate: '2026-09-19',
    createdAt: '2026-08-01T07:00:00.000Z',
    updatedAt: '2026-09-19T07:15:00.000Z',
  },
  {
    id: 'HAB-0002',
    name: 'Read before bed',
    frequency: 'Daily',
    streak: 5,
    targetCount: 0,
    completedCount: 5,
    lastCompletedDate: '2026-09-20',
    createdAt: '2026-09-10T21:00:00.000Z',
    updatedAt: '2026-09-20T21:30:00.000Z',
  },
  {
    id: 'HAB-0003',
    name: 'Weekly meal prep',
    frequency: 'Weekly',
    streak: 3,
    targetCount: 12,
    completedCount: 3,
    lastCompletedDate: '2026-09-14',
    createdAt: '2026-08-03T10:00:00.000Z',
    updatedAt: '2026-09-14T10:00:00.000Z',
  },
  {
    id: 'HAB-0004',
    name: 'Floss daily',
    frequency: 'Daily',
    streak: 0,
    targetCount: 0,
    completedCount: 0,
    lastCompletedDate: null,
    createdAt: '2026-09-18T08:00:00.000Z',
    updatedAt: '2026-09-18T08:00:00.000Z',
  },
];
