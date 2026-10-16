import type { TranscriptSegment } from '../types/transcription.js';
import type { LabeledSegment, RawSpeakerSegment } from '../types/diarization.js';

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
): LabeledSegment[] {
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

  return transcriptSegments.map((seg) => ({
    text: seg.text,
    start: seg.start,
    end: seg.end,
    speaker: bestSpeakerFor(seg),
  }));
}
