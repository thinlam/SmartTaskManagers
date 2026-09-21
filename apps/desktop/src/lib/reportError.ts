import { ApiError } from '@stm/api-client';

/**
 * Phase 27 — quick actions (Complete/Delete/Check-in) fire the API call
 * directly from a row's onClick, with no form/drawer around them to show
 * an inline error message in. This is the minimal real handling for
 * that case: log it so it's visible, not swallowed silently. A toast/
 * notification system would be the real fix — not built this phase,
 * this is the documented gap.
 */
export function reportError(err: unknown): void {
  console.error(err instanceof ApiError ? `${err.status}: ${err.message}` : err);
}
