import type { Priority, Task } from '@stm/types';

/**
 * Mirrors the Settings > Smart Engine toggles (packages/types' Settings
 * interface) — passed down from each page's SettingsContext so the
 * compute functions in this package can actually change behavior when a
 * toggle is off, instead of the toggles being dead UI.
 */
export interface SmartEngineOptions {
  /** "Smart Score Enabled" — false falls back to a plain priority/due-date sort and hides the score badge. */
  smartScoreEnabled?: boolean;
  /** "Explain Recommendations" — false hides the recommendedAction badge/text wherever it would otherwise show. */
  explainRecommendations?: boolean;
  /** "Schedule Overload Warning" — false suppresses the "today is overloaded" insight. */
  scheduleOverloadWarning?: boolean;
  /** "Goal Alignment Enabled" — false suppresses at-risk-goal alerts. */
  goalAlignmentEnabled?: boolean;
}

const PRIORITY_WEIGHT: Record<Priority, number> = {
  Critical: 5,
  Urgent: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

function dueSortValue(dueDate: string | null): number {
  if (!dueDate) return Number.MAX_SAFE_INTEGER;
  const time = new Date(dueDate).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

export function resolveSmartEngineOptions(options?: SmartEngineOptions): Required<SmartEngineOptions> {
  return {
    smartScoreEnabled: options?.smartScoreEnabled ?? true,
    explainRecommendations: options?.explainRecommendations ?? true,
    scheduleOverloadWarning: options?.scheduleOverloadWarning ?? true,
    goalAlignmentEnabled: options?.goalAlignmentEnabled ?? true,
  };
}

/**
 * The ranking used everywhere a task list is "sorted by importance" —
 * SmartScore desc, due date asc as a tiebreaker. When Settings > Smart
 * Engine > "Smart Score Enabled" is off, falls back to priority desc,
 * due date asc instead, so the toggle changes real ordering rather than
 * being a dead switch.
 */
export function compareBySmartRank(a: Task, b: Task, smartScoreEnabled: boolean): number {
  const primaryDiff = smartScoreEnabled
    ? (b.smartScore ?? 0) - (a.smartScore ?? 0)
    : (PRIORITY_WEIGHT[b.priority] ?? 0) - (PRIORITY_WEIGHT[a.priority] ?? 0);
  if (primaryDiff !== 0) return primaryDiff;
  return dueSortValue(a.dueDate) - dueSortValue(b.dueDate);
}

/**
 * Strips `smartScore`/`recommendedAction` off a DTO per the resolved
 * Smart Engine options, so a page that only ever renders fields it was
 * handed (e.g. TaskCard's conditional badges) automatically stops
 * showing them when the matching toggle is off — no per-page branching
 * needed at render time.
 */
export function applySmartVisibility<T extends { smartScore?: number; recommendedAction?: string }>(
  value: T,
  options: Required<SmartEngineOptions>,
): T {
  return {
    ...value,
    smartScore: options.smartScoreEnabled ? value.smartScore : undefined,
    recommendedAction: options.explainRecommendations ? value.recommendedAction : undefined,
  };
}
