/** Raw output from the Python diarization sidecar — speaker label is the model's own ID (e.g. "SPEAKER_00"). */
export interface RawSpeakerSegment {
  speaker: string;
  start: number;
  end: number;
}

/**
 * One word with its own timestamp, kept at the recording level (`Recording.words`)
 * so cutting/pasting text between segments carries the word — and its real
 * timestamp — with it, instead of being stuck with the segment's old start/end.
 * Seconds, same unit as everywhere else in this app (not ms).
 */
export interface Word {
  id: string;
  text: string;
  start: number;
  end: number;
}

/** A transcript segment after being assigned a stable, human-facing speaker label. */
export interface LabeledSegment {
  text: string;
  start: number;
  end: number;
  /** "Người nói 1", "Người nói 2", ... — stable per-transcript numbering, renamable by the UI later. */
  speaker: string;
  /**
   * Ordered ids into the recording's `words` list. When present, `start`/`end`
   * are kept in sync with the first/last referenced word (recomputed on every
   * edit, never trusted as independently-authoritative). Absent for recordings
   * predating word-level timestamps, or when the ASR provider didn't actually
   * return word-level timestamps for this recording — `start`/`end` alone is
   * the fallback source of truth in that case, exactly as before.
   */
  wordIds?: string[];
}
