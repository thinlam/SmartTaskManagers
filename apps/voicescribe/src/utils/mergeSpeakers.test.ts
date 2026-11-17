import { describe, expect, it } from 'vitest';
import { mergeTranscriptWithSpeakers } from './mergeSpeakers.js';
import type { TranscriptSegment } from '../types/transcription.js';
import type { RawSpeakerSegment } from '../types/diarization.js';

/**
 * Regression tests for the root cause behind "Danh sách đoạn hội thoại
 * không hợp lệ" when naming a speaker: Whisper can return a segment whose
 * text is blank/whitespace-only (silence/noise), and until this fix it was
 * stored as-is — the first segments-touching edit afterwards (most often:
 * assigning a newly created speaker) then failed because the WHOLE array
 * is re-validated and that one pre-existing blank segment is invalid.
 */
describe('mergeTranscriptWithSpeakers', () => {
  it('drops a blank-text segment entirely — it must never reach the stored segments array', () => {
    const transcript: TranscriptSegment[] = [
      { text: 'Xin chào', start: 0, end: 1 },
      { text: '   ', start: 1, end: 2 }, // whitespace-only — e.g. a silence chunk
      { text: '', start: 2, end: 3 }, // outright empty
      { text: 'Tạm biệt', start: 3, end: 4 },
    ];
    const { segments } = mergeTranscriptWithSpeakers(transcript, []);
    expect(segments.map((s) => s.text)).toEqual(['Xin chào', 'Tạm biệt']);
    expect(segments.every((s) => s.text.trim().length > 0)).toBe(true);
  });

  it('keeps every segment when none are blank (no regression on the normal path)', () => {
    const transcript: TranscriptSegment[] = [
      { text: 'Một', start: 0, end: 1 },
      { text: 'Hai', start: 1, end: 2 },
      { text: 'Ba', start: 2, end: 3 },
    ];
    const { segments } = mergeTranscriptWithSpeakers(transcript, []);
    expect(segments).toHaveLength(3);
  });

  it('does not let a blank segment consume a "Người nói N" number or distort first-seen order', () => {
    const transcript: TranscriptSegment[] = [
      { text: '  ', start: 0, end: 1 }, // blank, overlaps speaker B first — must not "claim" Người nói 1
      { text: 'Chào bạn', start: 1, end: 2 },
      { text: 'Chào anh', start: 2, end: 3 },
    ];
    const speakers: RawSpeakerSegment[] = [
      { speaker: 'SPEAKER_B', start: 0, end: 1 },
      { speaker: 'SPEAKER_A', start: 1, end: 2 },
      { speaker: 'SPEAKER_B', start: 2, end: 3 },
    ];
    const { segments } = mergeTranscriptWithSpeakers(transcript, speakers);
    expect(segments).toHaveLength(2);
    // First real (non-blank) segment is SPEAKER_A — it should be "Người nói 1".
    expect(segments[0]!.speaker).toBe('Người nói 1');
    expect(segments[1]!.speaker).toBe('Người nói 2');
  });

  it('drops a blank segment\'s words too, so no word is left orphaned by a segment that no longer exists', () => {
    const transcript: TranscriptSegment[] = [
      {
        text: '   ',
        start: 0,
        end: 1,
        words: [{ text: 'uh', start: 0, end: 0.3 }],
      },
      { text: 'Nội dung thật', start: 1, end: 2, words: [{ text: 'Nội dung thật', start: 1, end: 2 }] },
    ];
    const { segments, words } = mergeTranscriptWithSpeakers(transcript, []);
    expect(segments).toHaveLength(1);
    expect(words).toHaveLength(1);
    expect(words[0]!.text).toBe('Nội dung thật');
  });

  it('every produced segment satisfies the server-side segment validity rules (non-empty text/speaker, finite timing)', () => {
    const transcript: TranscriptSegment[] = [
      { text: '', start: 0, end: 1 },
      { text: 'Có nội dung', start: 1, end: 2 },
    ];
    const { segments } = mergeTranscriptWithSpeakers(transcript, []);
    for (const seg of segments) {
      expect(seg.text.trim().length).toBeGreaterThan(0);
      expect(seg.speaker.trim().length).toBeGreaterThan(0);
      expect(Number.isFinite(seg.start)).toBe(true);
      expect(Number.isFinite(seg.end)).toBe(true);
    }
  });
});
