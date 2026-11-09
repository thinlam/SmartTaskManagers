import { diffArrays } from 'diff';
import type { LabeledSegment, Word } from '../types';
import type { Block } from './transcript';

/** Gap between two consecutive words past which playback must skip rather than play through
 * (e.g. text pasted in from a far-away part of the recording) — see RecordingDetailPage's
 * "đoạn có phần âm thanh không liên tục" notice. */
const CONTIGUOUS_GAP_SEC = 2;
/** Small head/tail padding so playback doesn't clip the first/last word. */
export const PLAYBACK_PAD_SEC = 0.1;

const tokensOf = (text: string): string[] => text.trim().split(/\s+/).filter(Boolean);

export function wordsOf(words: Word[], seg: LabeledSegment): Word[] {
  if (!seg.wordIds || !words) return [];
  const byId = new Map(words.map((w) => [w.id, w] as const));
  const found = seg.wordIds.map((id) => byId.get(id));
  return found.every((w): w is Word => !!w) ? (found as Word[]) : [];
}

/**
 * Contiguous [start, end] playback ranges for a segment, split wherever two of
 * its words are more than CONTIGUOUS_GAP_SEC apart. Falls back to the
 * segment's own [start, end] when it has no (usable) word-level data — the
 * pre-Việc-B behavior, unchanged. Padding is only added to the very first and
 * very last edge, never at an internal gap-split (that boundary is real).
 */
export function playbackRanges(
  words: Word[],
  seg: LabeledSegment,
  pad = PLAYBACK_PAD_SEC,
): { start: number; end: number }[] {
  const segWords = wordsOf(words, seg);
  if (segWords.length === 0) {
    return [{ start: Math.max(0, seg.start - pad), end: seg.end + pad }];
  }
  const ranges: { start: number; end: number }[] = [];
  let rangeStart = segWords[0]!.start;
  let rangeEnd = segWords[0]!.end;
  for (let i = 1; i < segWords.length; i++) {
    const w = segWords[i]!;
    if (w.start - rangeEnd > CONTIGUOUS_GAP_SEC) {
      ranges.push({ start: rangeStart, end: rangeEnd });
      rangeStart = w.start;
    }
    rangeEnd = w.end;
  }
  ranges.push({ start: rangeStart, end: rangeEnd });
  const first = ranges[0]!;
  const last = ranges[ranges.length - 1]!;
  first.start = Math.max(0, first.start - pad);
  last.end += pad;
  return ranges;
}

/** Which word (by id) is playing right now, for per-word highlighting. */
export function activeWordId(words: Word[], seg: LabeledSegment, time: number): string | null {
  if (!seg.wordIds) return null;
  const byId = new Map(words.map((w) => [w.id, w] as const));
  for (const id of seg.wordIds) {
    const w = byId.get(id);
    if (w && time >= w.start && time < w.end) return id;
  }
  return null;
}

/** Interpolates a timestamp for a brand-new word inserted between two known neighbors (or at an edge). */
function interpolatedSpan(before: Word | undefined, after: Word | undefined): { start: number; end: number } {
  if (before && after) {
    const mid = (before.end + after.start) / 2;
    return { start: Math.min(before.end, mid), end: Math.max(mid, after.start) };
  }
  if (before) return { start: before.end, end: before.end };
  if (after) return { start: after.start, end: after.start };
  return { start: 0, end: 0 };
}

/**
 * Re-syncs a segment's `wordIds` after its text was hand-edited to `newText`.
 * Diffs the old and new text at word granularity: unchanged words keep their
 * original id + real timestamp; a newly typed/corrected word gets a new id
 * with a timestamp interpolated from its surviving neighbors — this is the
 * mechanism behind "sửa lỗi chính tả không làm lệch mốc các từ khác" in the plan.
 * Segments without word-level data (`seg.wordIds` absent) are left exactly as
 * `replaceBlockText` already did — this function only kicks in when there's
 * something to keep in sync.
 */
export function syncWordsOnEdit(
  words: Word[],
  seg: LabeledSegment,
  newText: string,
): { segment: LabeledSegment; words: Word[] } {
  const oldWords = wordsOf(words, seg);
  if (oldWords.length === 0) {
    // No word-level data for this segment — behave like the pre-Việc-B edit.
    return { segment: { ...seg, text: newText }, words };
  }
  const oldTokens = oldWords.map((w) => w.text);
  const newTokens = tokensOf(newText);
  const changes = diffArrays(oldTokens, newTokens);

  const nextWordIds: string[] = [];
  const addedWords: Word[] = [];
  let oldIdx = 0;
  for (let c = 0; c < changes.length; c++) {
    const change = changes[c]!;
    if (change.removed) {
      oldIdx += change.value.length;
      continue;
    }
    if (change.added) {
      // Interpolate against the nearest surviving word before/after this run.
      const before = oldWords[oldIdx - 1];
      const after = oldWords[oldIdx];
      for (const text of change.value) {
        const span = interpolatedSpan(before, after);
        const w: Word = { id: crypto.randomUUID(), text, ...span };
        addedWords.push(w);
        nextWordIds.push(w.id);
      }
      continue;
    }
    // Unchanged run: carry the original words through as-is.
    for (let i = 0; i < change.value.length; i++) {
      const w = oldWords[oldIdx + i]!;
      nextWordIds.push(w.id);
    }
    oldIdx += change.value.length;
  }

  const allWords = addedWords.length ? [...words, ...addedWords] : words;
  const kept = nextWordIds.map((id) => allWords.find((w) => w.id === id)!);
  const segment: LabeledSegment = {
    ...seg,
    text: newText,
    wordIds: nextWordIds,
    start: kept.length ? kept[0]!.start : seg.start,
    end: kept.length ? kept[kept.length - 1]!.end : seg.end,
  };
  return { segment, words: allWords };
}

/** Maps a character offset in a segment's rendered text to a token (word) index. */
function tokenIndexAtChar(text: string, charOffset: number): number {
  let index = 0;
  let i = 0;
  const re = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (charOffset <= match.index + match[0].length) return i;
    index = i;
    i++;
  }
  return index;
}

/**
 * Moves the words covered by [selStart, selEnd) (character offsets into the
 * block's text) to the start of the previous segment, or the end of the next
 * one — "Chuyển lên đoạn trước" / "Chuyển xuống đoạn sau" in the plan. Word
 * timestamps travel with their words untouched. Returns null if there's
 * nothing selected or no such neighbor.
 */
export function moveSelectionToNeighbor(
  segments: LabeledSegment[],
  words: Word[],
  block: Block,
  selStart: number,
  selEnd: number,
  direction: 'prev' | 'next',
): LabeledSegment[] | null {
  if (selStart === selEnd) return null;
  const neighborIndex = direction === 'prev' ? block.from - 1 : block.from + 1;
  const neighbor = segments[neighborIndex];
  const seg = segments[block.from];
  if (!neighbor || !seg) return null;

  const tokens = tokensOf(seg.text);
  const i0 = tokenIndexAtChar(seg.text, selStart);
  const i1 = Math.min(tokens.length - 1, tokenIndexAtChar(seg.text, Math.max(selStart, selEnd - 1)));
  if (i1 < i0) return null;

  const movedTokens = tokens.slice(i0, i1 + 1);
  const remainingTokens = [...tokens.slice(0, i0), ...tokens.slice(i1 + 1)];
  const segWordIds = seg.wordIds;
  const movedWordIds = segWordIds?.slice(i0, i1 + 1);
  const remainingWordIds = segWordIds
    ? [...segWordIds.slice(0, i0), ...segWordIds.slice(i1 + 1)]
    : undefined;

  const byId = new Map(words.map((w) => [w.id, w] as const));
  const rangeOf = (ids: string[] | undefined, fallback: { start: number; end: number }) => {
    if (!ids || ids.length === 0) return fallback;
    const ws = ids.map((id) => byId.get(id)).filter((w): w is Word => !!w);
    if (ws.length !== ids.length) return fallback;
    return { start: ws[0]!.start, end: ws[ws.length - 1]!.end };
  };

  const updatedSeg: LabeledSegment = {
    ...seg,
    text: remainingTokens.join(' '),
    ...(remainingWordIds ? { wordIds: remainingWordIds } : {}),
    ...rangeOf(remainingWordIds, { start: seg.start, end: seg.end }),
  };

  const neighborTokens = tokensOf(neighbor.text);
  const neighborNewTokens =
    direction === 'prev' ? [...neighborTokens, ...movedTokens] : [...movedTokens, ...neighborTokens];
  const neighborWordIds = neighbor.wordIds;
  const neighborNewWordIds =
    neighborWordIds && movedWordIds
      ? direction === 'prev'
        ? [...neighborWordIds, ...movedWordIds]
        : [...movedWordIds, ...neighborWordIds]
      : undefined;
  const updatedNeighbor: LabeledSegment = {
    ...neighbor,
    text: neighborNewTokens.join(' '),
    ...(neighborNewWordIds ? { wordIds: neighborNewWordIds } : {}),
    ...rangeOf(neighborNewWordIds, { start: neighbor.start, end: neighbor.end }),
  };

  const result = [...segments];
  result[block.from] = updatedSeg;
  result[neighborIndex] = updatedNeighbor;
  return result;
}

/**
 * Splits a segment into two at a character offset (cursor position) — "Tách
 * đoạn tại vị trí con trỏ" in the plan. Both halves keep their own words/timestamps.
 */
export function splitSegmentAtCursor(
  segments: LabeledSegment[],
  words: Word[],
  block: Block,
  cursor: number,
): LabeledSegment[] | null {
  const seg = segments[block.from];
  if (!seg) return null;
  const tokens = tokensOf(seg.text);
  if (tokens.length < 2) return null;
  const splitAt = Math.min(tokens.length - 1, Math.max(1, tokenIndexAtChar(seg.text, cursor)));

  const byId = new Map(words.map((w) => [w.id, w] as const));
  const rangeOf = (ids: string[] | undefined, fallback: { start: number; end: number }) => {
    if (!ids || ids.length === 0) return fallback;
    const ws = ids.map((id) => byId.get(id)).filter((w): w is Word => !!w);
    if (ws.length !== ids.length) return fallback;
    return { start: ws[0]!.start, end: ws[ws.length - 1]!.end };
  };

  const firstWordIds = seg.wordIds?.slice(0, splitAt);
  const secondWordIds = seg.wordIds?.slice(splitAt);
  const first: LabeledSegment = {
    ...seg,
    text: tokens.slice(0, splitAt).join(' '),
    ...(firstWordIds ? { wordIds: firstWordIds } : {}),
    ...rangeOf(firstWordIds, { start: seg.start, end: seg.end }),
  };
  const second: LabeledSegment = {
    ...seg,
    text: tokens.slice(splitAt).join(' '),
    ...(secondWordIds ? { wordIds: secondWordIds } : {}),
    ...rangeOf(secondWordIds, { start: seg.start, end: seg.end }),
  };
  return [...segments.slice(0, block.from), first, second, ...segments.slice(block.from + 1)];
}
