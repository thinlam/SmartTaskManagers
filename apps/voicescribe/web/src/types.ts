export interface LabeledSegment {
  text: string;
  start: number;
  end: number;
  speaker: string;
}

export interface TranscribeResult {
  text: string;
  segments: LabeledSegment[];
  processingTimeMs: number;
  diarizationError: string | null;
}

export type TranscriptionState =
  | { kind: 'idle' }
  | { kind: 'uploading'; percent: number; fileName: string }
  | { kind: 'processing'; fileName: string }
  | { kind: 'done'; fileName: string; result: TranscribeResult }
  | { kind: 'error'; message: string };

export type Page = 'new' | 'library' | 'detail' | 'folders' | 'settings';
