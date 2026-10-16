/** Raw output from the Python diarization sidecar — speaker label is the model's own ID (e.g. "SPEAKER_00"). */
export interface RawSpeakerSegment {
  speaker: string;
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
}
