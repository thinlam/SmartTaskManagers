import { describe, expect, it } from 'vitest';
import { parseNotes, parseSegments, parseSpeakerNames, parseSpeakerRoster, parseTrash } from './recordingsRoutes.js';

describe('parseSegments', () => {
  const valid = () => [{ text: 'Xin chào', speaker: 'Người nói 1', start: 0, end: 1 }];

  it('accepts a well-formed segments array', () => {
    expect(parseSegments(valid())).toEqual([
      { text: 'Xin chào', speaker: 'Người nói 1', start: 0, end: 1 },
    ]);
  });

  it('rejects when any one segment has blank text — this IS the validator that triggered "Danh sách đoạn hội thoại không hợp lệ"', () => {
    expect(parseSegments([...valid(), { text: '   ', speaker: 'Người nói 1', start: 1, end: 2 }])).toBeNull();
  });

  it('rejects a blank speaker', () => {
    expect(parseSegments([{ text: 'Có nội dung', speaker: '', start: 0, end: 1 }])).toBeNull();
  });

  it('rejects non-finite timing', () => {
    expect(
      parseSegments([{ text: 'Có nội dung', speaker: 'Người nói 1', start: 0, end: Number.NaN }]),
    ).toBeNull();
  });

  it('clamps end to at least start (never produces a negative-length segment)', () => {
    const result = parseSegments([{ text: 'x', speaker: 'Người nói 1', start: 5, end: 2 }]);
    expect(result?.[0]?.end).toBe(5);
  });

  it('rejects not-an-array, and an array past the size cap', () => {
    expect(parseSegments('not an array')).toBeNull();
    expect(parseSegments(Array.from({ length: 5001 }, () => valid()[0]))).toBeNull();
  });
});

describe('parseTrash', () => {
  const deletedAt = new Date().toISOString();
  const validItem = () => ({
    id: 'trash-1',
    deletedAt,
    segment: { text: 'Đã xóa', speaker: 'Người nói 1', start: 0, end: 1 },
  });

  it('accepts a well-formed trash array', () => {
    expect(parseTrash([validItem()])).toEqual([
      {
        id: 'trash-1',
        segment: { text: 'Đã xóa', speaker: 'Người nói 1', start: 0, end: 1 },
        deletedAt,
      },
    ]);
  });

  it('rejects a missing/empty id', () => {
    expect(parseTrash([{ ...validItem(), id: '' }])).toBeNull();
    expect(parseTrash([{ ...validItem(), id: undefined }])).toBeNull();
  });

  it('rejects an invalid deletedAt', () => {
    expect(parseTrash([{ ...validItem(), deletedAt: 'not-a-date' }])).toBeNull();
  });

  it('rejects when the embedded segment itself is invalid (e.g. blank text)', () => {
    expect(
      parseTrash([{ ...validItem(), segment: { text: '  ', speaker: 'x', start: 0, end: 1 } }]),
    ).toBeNull();
  });
});

describe('parseSpeakerRoster', () => {
  it('accepts a unique, well-sized list', () => {
    expect(parseSpeakerRoster(['Người nói 1', 'Người nói 2'])).toEqual(['Người nói 1', 'Người nói 2']);
  });

  it('rejects a duplicate key', () => {
    expect(parseSpeakerRoster(['Người nói 1', 'Người nói 1'])).toBeNull();
  });

  it('rejects a blank key', () => {
    expect(parseSpeakerRoster(['Người nói 1', '   '])).toBeNull();
  });
});

describe('parseSpeakerNames', () => {
  it('accepts a plain string map', () => {
    expect(parseSpeakerNames({ raw1: 'Chú' })).toEqual({ raw1: 'Chú' });
  });

  it('rejects an array (must be a plain object)', () => {
    expect(parseSpeakerNames(['Chú'])).toBeNull();
  });

  it('rejects a blank display name', () => {
    expect(parseSpeakerNames({ raw1: '   ' })).toBeNull();
  });
});

describe('parseNotes', () => {
  it('accepts a well-formed notes array, generating an id when absent', () => {
    const result = parseNotes([{ text: 'Ghi chú' }]);
    expect(result?.[0]?.text).toBe('Ghi chú');
    expect(typeof result?.[0]?.id).toBe('string');
  });

  it('rejects a blank note', () => {
    expect(parseNotes([{ text: '   ' }])).toBeNull();
  });
});
