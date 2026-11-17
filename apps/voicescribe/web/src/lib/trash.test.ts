import { describe, expect, it } from 'vitest';
import type { LabeledSegment } from '../types';
import {
  insertByTime,
  isPastAutoPurgeAge,
  restoreTrashItem,
  toTrashItem,
  TRASH_AUTO_PURGE_DAYS,
  UNASSIGNED_SPEAKER_KEY,
  UNASSIGNED_SPEAKER_NAME,
} from './trash';

const seg = (speaker: string, text: string, start: number, end: number): LabeledSegment => ({
  speaker,
  text,
  start,
  end,
});

describe('toTrashItem', () => {
  it('wraps a segment with a stable id and a deletedAt timestamp', () => {
    const item = toTrashItem(seg('raw1', 'Xin chào', 0, 1));
    expect(item.id).toBeTruthy();
    expect(item.segment.text).toBe('Xin chào');
    expect(Number.isNaN(Date.parse(item.deletedAt))).toBe(false);
  });

  it('two items get distinct ids', () => {
    const a = toTrashItem(seg('raw1', 'x', 0, 1));
    const b = toTrashItem(seg('raw1', 'y', 1, 2));
    expect(a.id).not.toBe(b.id);
  });
});

describe('insertByTime', () => {
  it('inserts a segment back in chronological order among existing segments', () => {
    const segments = [seg('A', 'Một', 0, 1), seg('A', 'Ba', 2, 3)];
    const restored = seg('A', 'Hai', 1, 2);
    const result = insertByTime(segments, restored);
    expect(result.map((s) => s.text)).toEqual(['Một', 'Hai', 'Ba']);
  });

  it('appends at the end when the restored segment is the latest', () => {
    const segments = [seg('A', 'Một', 0, 1)];
    const result = insertByTime(segments, seg('A', 'Hai', 5, 6));
    expect(result.map((s) => s.text)).toEqual(['Một', 'Hai']);
  });

  it('inserts at the front when the restored segment is the earliest', () => {
    const segments = [seg('A', 'Hai', 5, 6)];
    const result = insertByTime(segments, seg('A', 'Một', 0, 1));
    expect(result.map((s) => s.text)).toEqual(['Một', 'Hai']);
  });
});

describe('restoreTrashItem', () => {
  it('restores a segment whose original speaker still exists, unchanged', () => {
    const item = toTrashItem(seg('raw1', 'Xin chào', 0, 1));
    const result = restoreTrashItem([], ['raw1'], { raw1: 'Chú' }, item);
    expect(result.segments).toEqual([seg('raw1', 'Xin chào', 0, 1)]);
    expect(result.speakerRoster).toEqual(['raw1']);
  });

  it('reassigns to "Chưa xác định" when the original speaker was deleted, and adds that sentinel to the roster once', () => {
    const item = toTrashItem(seg('raw-deleted', 'Xin chào', 0, 1));
    const result = restoreTrashItem([], ['raw1'], { raw1: 'Chú' }, item);
    expect(result.segments[0]!.speaker).toBe(UNASSIGNED_SPEAKER_KEY);
    expect(result.speakerRoster).toContain(UNASSIGNED_SPEAKER_KEY);
    expect(result.speakerNames[UNASSIGNED_SPEAKER_KEY]).toBe(UNASSIGNED_SPEAKER_NAME);
  });

  it('does not add a second sentinel entry if one already exists', () => {
    const item = toTrashItem(seg('raw-deleted', 'Xin chào', 0, 1));
    const result = restoreTrashItem(
      [],
      ['raw1', UNASSIGNED_SPEAKER_KEY],
      { raw1: 'Chú', [UNASSIGNED_SPEAKER_KEY]: UNASSIGNED_SPEAKER_NAME },
      item,
    );
    expect(result.speakerRoster.filter((k) => k === UNASSIGNED_SPEAKER_KEY)).toHaveLength(1);
  });

  it('places the restored segment back in time order relative to current segments', () => {
    const existing = [seg('raw1', 'Một', 0, 1), seg('raw1', 'Ba', 2, 3)];
    const item = toTrashItem(seg('raw1', 'Hai', 1, 2));
    const result = restoreTrashItem(existing, ['raw1'], { raw1: 'Chú' }, item);
    expect(result.segments.map((s) => s.text)).toEqual(['Một', 'Hai', 'Ba']);
  });
});

describe('isPastAutoPurgeAge', () => {
  it('is false for a recently deleted item', () => {
    const item = toTrashItem(seg('raw1', 'x', 0, 1));
    expect(isPastAutoPurgeAge(item)).toBe(false);
  });

  it('is true once past the configured threshold', () => {
    const old = new Date(Date.now() - (TRASH_AUTO_PURGE_DAYS + 1) * 24 * 60 * 60 * 1000).toISOString();
    const item = { id: 'x', segment: seg('raw1', 'x', 0, 1), deletedAt: old };
    expect(isPastAutoPurgeAge(item)).toBe(true);
  });

  it('is false just under the threshold', () => {
    const recent = new Date(Date.now() - (TRASH_AUTO_PURGE_DAYS - 1) * 24 * 60 * 60 * 1000).toISOString();
    const item = { id: 'x', segment: seg('raw1', 'x', 0, 1), deletedAt: recent };
    expect(isPastAutoPurgeAge(item)).toBe(false);
  });
});
