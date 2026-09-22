import type { Settings } from '@stm/types';

/**
 * Seed data for Settings (Phase 19) — a 1:1 copy of DEFAULT_SETTINGS in
 * apps/google-sheets/src/00_Constants.gs, converted from its Key/Value/
 * Category row shape into a typed object. Loaded into useSettings() as
 * initial state; mutated only in memory until Phase 27.
 */
export const MOCK_SETTINGS: Settings = {
  workspaceName: 'My Smart Task',
  language: 'English',
  weekStart: 'Monday',
  dateFormat: 'DD MMM YYYY',
  defaultStatus: 'Inbox',
  defaultPriority: 'Medium',
  defaultEstimateMinutes: 30,
  dueSoonDays: 2,
  focusDaysStart: 'Monday',
  focusDaysEnd: 'Saturday',
  focusWindowStart: '09:00',
  focusWindowEnd: '21:30',
  dailyFocusLimitHours: 4,
  weekend: 'Sunday',
  smartScoreEnabled: true,
  goalAlignmentEnabled: true,
  scheduleOverloadWarning: true,
  explainRecommendations: true,
};
