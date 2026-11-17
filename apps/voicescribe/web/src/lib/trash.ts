import type { LabeledSegment, TrashedSegment } from '../types';

/** Reserved roster key for a restored segment whose original speaker no longer exists. */
export const UNASSIGNED_SPEAKER_KEY = '__unassigned__';
export const UNASSIGNED_SPEAKER_NAME = 'Chưa xác định';

/** How long a trashed segment sits before it's eligible for the auto-purge reminder. */
export const TRASH_AUTO_PURGE_DAYS = 30;

/** Wraps a segment as a fresh trash entry (used by "chuyển vào thùng rác"). */
export function toTrashItem(segment: LabeledSegment): TrashedSegment {
  return { id: crypto.randomUUID(), segment, deletedAt: new Date().toISOString() };
}

/**
 * Inserts a segment back into `segments` at the position its `start` time
 * sorts into — "đưa về đúng vị trí cũ theo thời gian" in the plan. Sorting
 * by time (rather than trying to recall the original array index) is what
 * stays correct even if the recording was edited a lot in between (merges,
 * splits, other deletes) — there is no "original index" left to trust.
 */
export function insertByTime(segments: LabeledSegment[], segment: LabeledSegment): LabeledSegment[] {
  const index = segments.findIndex((s) => s.start > segment.start);
  if (index === -1) return [...segments, segment];
  return [...segments.slice(0, index), segment, ...segments.slice(index)];
}

/**
 * Restores one trashed segment: reinserts it by time, and if its original
 * speaker key was itself deleted from the roster in the meantime, reassigns
 * it to a reserved "Chưa xác định" entry (created on the roster if this is
 * the first time it's needed) rather than silently resurrecting a deleted
 * speaker or failing the restore.
 */
export function restoreTrashItem(
  segments: LabeledSegment[],
  speakerRoster: string[],
  speakerNames: Record<string, string>,
  item: TrashedSegment,
): { segments: LabeledSegment[]; speakerRoster: string[]; speakerNames: Record<string, string> } {
  const speakerStillExists = speakerRoster.includes(item.segment.speaker);
  const segment = speakerStillExists
    ? item.segment
    : { ...item.segment, speaker: UNASSIGNED_SPEAKER_KEY };
  const needsUnassignedEntry = !speakerStillExists && !speakerRoster.includes(UNASSIGNED_SPEAKER_KEY);
  return {
    segments: insertByTime(segments, segment),
    speakerRoster: needsUnassignedEntry ? [...speakerRoster, UNASSIGNED_SPEAKER_KEY] : speakerRoster,
    speakerNames: needsUnassignedEntry
      ? { ...speakerNames, [UNASSIGNED_SPEAKER_KEY]: UNASSIGNED_SPEAKER_NAME }
      : speakerNames,
  };
}

/** Whether a trashed item is at or past the auto-purge age, as of `now` (defaults to real now — injectable for tests). */
export function isPastAutoPurgeAge(item: TrashedSegment, now: Date = new Date()): boolean {
  const deletedAt = new Date(item.deletedAt).getTime();
  const ageMs = now.getTime() - deletedAt;
  return ageMs >= TRASH_AUTO_PURGE_DAYS * 24 * 60 * 60 * 1000;
}
