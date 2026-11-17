import { randomUUID } from 'node:crypto';
import type { TranscriptSegment } from '../types/transcription.js';
import type { LabeledSegment, RawSpeakerSegment, Word } from '../types/diarization.js';

function overlapSeconds(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

/**
 * Assigns each Whisper transcript segment to the diarization speaker
 * whose turn overlaps it the most (by duration). If a segment doesn't
 * overlap any speaker turn at all (gaps happen at chunk/silence
 * boundaries), falls back to the nearest turn by midpoint distance.
 *
 * Raw speaker IDs from the model (e.g. "SPEAKER_00") are renumbered to
 * "Người nói 1", "Người nói 2", ... in order of first appearance in the
 * transcript, which is the stable, renamable label the UI will show.
 */
export function mergeTranscriptWithSpeakers(
  transcriptSegments: TranscriptSegment[],
  speakerSegments: RawSpeakerSegment[],
): { segments: LabeledSegment[]; words: Word[] } {
  const labelByRawSpeaker = new Map<string, string>();
  let nextSpeakerNumber = 1;

  function labelFor(rawSpeaker: string): string {
    let label = labelByRawSpeaker.get(rawSpeaker);
    if (!label) {
      label = `Người nói ${nextSpeakerNumber}`;
      nextSpeakerNumber += 1;
      labelByRawSpeaker.set(rawSpeaker, label);
    }
    return label;
  }

  function bestSpeakerFor(seg: TranscriptSegment): string {
    if (speakerSegments.length === 0) return 'Người nói 1';

    let bestOverlap = 0;
    let bestSpeaker: RawSpeakerSegment | null = null;
    for (const spk of speakerSegments) {
      const overlap = overlapSeconds(seg.start, seg.end, spk.start, spk.end);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestSpeaker = spk;
      }
    }
    if (bestSpeaker) return labelFor(bestSpeaker.speaker);

    // No overlap at all — fall back to the closest turn by midpoint distance.
    const midpoint = (seg.start + seg.end) / 2;
    let nearest = speakerSegments[0]!;
    let nearestDistance = Math.abs((nearest.start + nearest.end) / 2 - midpoint);
    for (const spk of speakerSegments) {
      const distance = Math.abs((spk.start + spk.end) / 2 - midpoint);
      if (distance < nearestDistance) {
        nearest = spk;
        nearestDistance = distance;
      }
    }
    return labelFor(nearest.speaker);
  }

  const words: Word[] = [];
  const segments: LabeledSegment[] = [];
  for (const seg of transcriptSegments) {
    const text = seg.text.trim();
    // Whisper can emit a segment with blank/whitespace-only text for pure
    // silence or noise (no words at all) — storing it unfiltered leaves an
    // invalid segment sitting in the recording from the very start, which
    // trips the server's own validator (parseSegments in recordingsRoutes.ts)
    // the first time ANY segments-touching edit re-sends the whole array
    // (most commonly: naming a speaker). Drop it here instead, at the
    // source, so the stored data is never invalid in the first place —
    // this is the actual bug behind the "Danh sách đoạn hội thoại không
    // hợp lệ" error users saw when adding a speaker.
    if (!text) continue;
    const wordIds = seg.words?.map((w) => {
      const id = randomUUID();
      words.push({ id, text: w.text, start: w.start, end: w.end });
      return id;
    });
    segments.push({
      text,
      start: seg.start,
      end: seg.end,
      speaker: bestSpeakerFor(seg),
      ...(wordIds && wordIds.length ? { wordIds } : {}),
    });
  }
  return { segments, words };
}
