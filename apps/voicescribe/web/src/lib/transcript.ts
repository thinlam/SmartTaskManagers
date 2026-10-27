import type { LabeledSegment, Recording } from '../types';

/** A run of consecutive segments by one speaker, shown as a single paragraph. */
export interface Block {
  speaker: string;
  start: number;
  end: number;
  text: string;
  /** Inclusive index range into the recording's segments. */
  from: number;
  to: number;
}

/** Longest merged block, so a long monologue still gets timestamps along the way. */
const MAX_BLOCK_CHARS = 800;

export function buildBlocks(segments: LabeledSegment[], merge: boolean): Block[] {
  const blocks: Block[] = [];
  segments.forEach((seg, i) => {
    const text = seg.text.trim();
    const last = blocks[blocks.length - 1];
    if (merge && last && last.speaker === seg.speaker && last.text.length + text.length < MAX_BLOCK_CHARS) {
      last.text = `${last.text} ${text}`;
      last.end = seg.end;
      last.to = i;
      return;
    }
    blocks.push({ speaker: seg.speaker, start: seg.start, end: seg.end, text, from: i, to: i });
  });
  return blocks;
}

export function speakerOrderOf(segments: LabeledSegment[]): string[] {
  const seen: string[] = [];
  for (const seg of segments) if (!seen.includes(seg.speaker)) seen.push(seg.speaker);
  return seen;
}

export function displayName(names: Record<string, string>, raw: string): string {
  return names[raw] ?? raw;
}

/** The single-paragraph version: the stored text, or the segments joined if it is empty. */
export function paragraphOf(rec: Pick<Recording, 'text' | 'segments'>): string {
  const text = rec.text.trim();
  return text || rec.segments.map((s) => s.text.trim()).join(' ');
}

/** Replaces segments[from..to] with one merged segment carrying the edited text. */
export function replaceBlockText(
  segments: LabeledSegment[],
  block: Block,
  text: string,
): LabeledSegment[] {
  const merged: LabeledSegment = {
    speaker: block.speaker,
    start: block.start,
    end: block.end,
    text,
  };
  return [...segments.slice(0, block.from), merged, ...segments.slice(block.to + 1)];
}

export function assignBlockSpeaker(
  segments: LabeledSegment[],
  block: Block,
  speaker: string,
): LabeledSegment[] {
  return segments.map((seg, i) => (i >= block.from && i <= block.to ? { ...seg, speaker } : seg));
}

/** Smallest unused "Người nói N" key. */
export function nextSpeakerKey(existing: string[]): string {
  let n = existing.length + 1;
  while (existing.includes(`Người nói ${n}`)) n += 1;
  return `Người nói ${n}`;
}

export function clock(seconds: number): string {
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
