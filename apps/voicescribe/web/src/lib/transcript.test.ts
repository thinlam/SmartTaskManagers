import { describe, expect, it } from 'vitest';
import type { LabeledSegment } from '../types';
import {
  assignBlockSpeaker,
  buildBlocks,
  deleteBlock,
  findSpeakerByName,
  mergeSpeakers,
  mergeWithNeighbor,
  nextSpeakerKey,
  validateSpeakerName,
} from './transcript';

const seg = (speaker: string, text: string, start: number, end: number): LabeledSegment => ({
  speaker,
  text,
  start,
  end,
});

/** Việc 1 repro list: thêm "Chú", thêm "Sếp", thêm liên tiếp, thêm tên trùng, thêm tên có dấu. */
describe('validateSpeakerName', () => {
  const roster = ['Người nói 1'];
  const names = { 'Người nói 1': 'Người nói 1' };

  it('accepts a fresh Vietnamese-diacritic name like "Chú"', () => {
    expect(validateSpeakerName('Chú', roster, names)).toBeNull();
  });

  it('accepts a second fresh name like "Sếp" added right after the first', () => {
    const afterChu = { roster: ['Người nói 1', 'raw2'], names: { ...names, raw2: 'Chú' } };
    expect(validateSpeakerName('Sếp', afterChu.roster, afterChu.names)).toBeNull();
  });

  it('rejects an empty or whitespace-only name with a specific message', () => {
    expect(validateSpeakerName('', roster, names)).toBe('Tên không được để trống.');
    expect(validateSpeakerName('   ', roster, names)).toBe('Tên không được để trống.');
  });

  it('rejects a name that is too long', () => {
    expect(validateSpeakerName('a'.repeat(61), roster, names)).toMatch(/quá dài/);
  });

  it('rejects a duplicate name case/space-insensitively', () => {
    expect(validateSpeakerName('  người NÓI 1  ', roster, names)).toMatch(/đã được dùng/);
  });

  it('allows renaming a speaker to its own current name (excepted from the duplicate check)', () => {
    expect(validateSpeakerName('Người nói 1', roster, names, 'Người nói 1')).toBeNull();
  });
});

describe('nextSpeakerKey', () => {
  it('produces a fresh key not already in the roster, repeatable across additions', () => {
    let roster: string[] = [];
    const a = nextSpeakerKey(roster);
    roster = [...roster, a];
    const b = nextSpeakerKey(roster);
    expect(a).not.toBe(b);
    expect(roster).not.toContain(b);
  });
});

describe('add-speaker-then-assign (Việc 1 repro)', () => {
  it('creating a speaker never touches existing segments, and assigning it afterwards only changes the targeted block', () => {
    const segments = [seg('Người nói 1', 'Xin chào', 0, 1), seg('Người nói 1', 'Tạm biệt', 1, 2)];
    const roster = ['Người nói 1'];
    const raw = nextSpeakerKey(roster);
    // Adding "Chú" to the roster must not touch segments at all.
    expect(segments).toHaveLength(2);
    const block = buildBlocks(segments, false)[1]!;
    const reassigned = assignBlockSpeaker(segments, block, raw);
    expect(reassigned[0]!.speaker).toBe('Người nói 1');
    expect(reassigned[1]!.speaker).toBe(raw);
  });
});

describe('regression audit of other segment-touching operations (must never produce a blank segment)', () => {
  it('deleteBlock never leaves an empty-text segment behind', () => {
    const segments = [seg('A', 'Một', 0, 1), seg('A', 'Hai', 1, 2), seg('A', 'Ba', 2, 3)];
    const block = buildBlocks(segments, false)[1]!;
    const result = deleteBlock(segments, block);
    expect(result.every((s) => s.text.trim().length > 0)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it('mergeWithNeighbor keeps combined text non-empty', () => {
    const segments = [seg('A', 'Một', 0, 1), seg('A', 'Hai', 1, 2)];
    const block = buildBlocks(segments, false)[1]!;
    const result = mergeWithNeighbor(segments, block, 'prev');
    expect(result).toHaveLength(1);
    expect(result[0]!.text.trim().length).toBeGreaterThan(0);
  });

  it('mergeSpeakers (rename-everywhere via merge) reassigns every segment of the old speaker without altering text', () => {
    const segments = [seg('raw1', 'Một', 0, 1), seg('raw2', 'Hai', 1, 2)];
    const result = mergeSpeakers(segments, 'raw1', 'raw2');
    expect(result.every((s) => s.speaker === 'raw2')).toBe(true);
    expect(result.map((s) => s.text)).toEqual(['Một', 'Hai']);
  });

  it('findSpeakerByName is case/space-insensitive, matching the add-speaker duplicate check', () => {
    expect(findSpeakerByName(['raw1'], { raw1: 'Chú' }, '  chú  ')).toBe('raw1');
    expect(findSpeakerByName(['raw1'], { raw1: 'Chú' }, 'Sếp')).toBeNull();
  });
});
