import type { Project } from '@stm/types';

/**
 * Seed data for Projects' local demo state (Phase 13) — same pattern as
 * Tasks (Phase 12): loaded into useProjects() as initial state, mutated
 * only in memory. Some tasks in apps/desktop/src/mock/tasks.ts reference
 * these ids via `projectId` — keep both files in sync.
 *
 * Deliberately covers a spread of computed health outcomes (via
 * computeProjectMetrics/computeProjectHealth in @stm/shared) rather than
 * hand-set health values, since health is always derived, never stored:
 * PRJ-0001 lands "Attention" (1 critical task), PRJ-0002 and PRJ-0003
 * land "At Risk" (each has one overdue task), PRJ-0004 has no linked
 * tasks yet and lands "Healthy" by default.
 */
export const MOCK_PROJECTS: Project[] = [
  {
    id: 'PRJ-0001',
    name: 'Portfolio Website',
    area: 'Career',
    targetDate: '2026-10-15',
    description:
      'Rebuild the personal portfolio site and publish the Smart Task Manager case study.',
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-19T10:42:00.000Z',
  },
  {
    id: 'PRJ-0002',
    name: 'Language Learning',
    area: 'Learning',
    targetDate: '2026-09-30',
    description: 'Daily vocabulary and grammar practice, working toward conversational fluency.',
    createdAt: '2026-09-05T08:00:00.000Z',
    updatedAt: '2026-09-14T08:00:00.000Z',
  },
  {
    id: 'PRJ-0003',
    name: 'Home Admin',
    area: 'Personal Admin',
    targetDate: null,
    description: 'Recurring household paperwork: bills, renewals, and other admin chores.',
    createdAt: '2026-09-08T08:00:00.000Z',
    updatedAt: '2026-09-16T08:00:00.000Z',
  },
  {
    id: 'PRJ-0004',
    name: 'Fitness Reset',
    area: 'Health',
    targetDate: '2026-12-01',
    description: 'Get back into a regular workout routine before the end of the year.',
    createdAt: '2026-09-17T08:00:00.000Z',
    updatedAt: '2026-09-17T08:00:00.000Z',
  },
];
