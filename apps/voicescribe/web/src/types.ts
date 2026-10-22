export interface LabeledSegment {
  text: string;
  start: number;
  end: number;
  speaker: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
}

export interface AppConfig {
  signupCodeRequired: boolean;
  diarizationEnabled: boolean;
  maxUploadMb: number;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: string;
  recordingCount: number;
}

export interface RecordingSummary {
  id: string;
  title: string;
  fileName: string;
  folderId: string | null;
  folderName: string | null;
  durationSec: number;
  speakerCount: number;
  preview: string;
  createdAt: string;
}

export interface RecordingNote {
  id: string;
  text: string;
  createdAt: string;
}

export interface Recording {
  id: string;
  folderId: string | null;
  folderName: string | null;
  title: string;
  fileName: string;
  durationSec: number;
  text: string;
  segments: LabeledSegment[];
  speakerNames: Record<string, string>;
  notes: RecordingNote[];
  processingTimeMs: number;
  diarizationError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RecordingStats {
  count: number;
  totalDurationSec: number;
}

export type Route =
  | { page: 'new' }
  | { page: 'library'; folderId?: string }
  | { page: 'detail'; id: string }
  | { page: 'folders' }
  | { page: 'settings' };

export type PageName = Route['page'];
