export interface TranscriptSegment {
  text: string;
  /** Seconds from the start of the audio. */
  start: number;
  /** Seconds from the start of the audio. */
  end: number;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptSegment[];
  /** Wall-clock time the API call took, in milliseconds. */
  processingTimeMs: number;
}

/**
 * A transcription failure already translated into a message safe to show
 * a user (no stack trace, no raw provider JSON) plus the original cause
 * for logging.
 */
export class TranscriptionError extends Error {
  constructor(
    message: string,
    readonly cause_?: unknown,
  ) {
    super(message);
    this.name = 'TranscriptionError';
  }
}
