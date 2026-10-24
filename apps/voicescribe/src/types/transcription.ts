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

/** Thrown when a job is cancelled (e.g. the user deleted the recording while it was processing). */
export class CancelledError extends Error {
  constructor() {
    super('Đã hủy xử lý.');
    this.name = 'CancelledError';
  }
}
