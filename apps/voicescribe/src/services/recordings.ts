import type { Db } from '../db/pool.js';
import type { LabeledSegment } from '../types/diarization.js';

export interface RecordingNote {
  id: string;
  text: string;
  createdAt: string;
}

export interface RecordingRow {
  id: string;
  user_id: string;
  folder_id: string | null;
  folder_name: string | null;
  title: string;
  file_name: string;
  duration_sec: number;
  text: string;
  segments: LabeledSegment[];
  speaker_names: Record<string, string>;
  notes: RecordingNote[];
  processing_ms: number;
  diarization_error: string | null;
  created_at: Date;
  updated_at: Date;
}

/** Row joined with its folder name; every read goes through this so the DTO is always complete. */
export const RECORDING_SELECT = `
  SELECT r.*, f.name AS folder_name
  FROM recordings r
  LEFT JOIN folders f ON f.id = r.folder_id`;

export function toDetailDto(r: RecordingRow) {
  return {
    id: r.id,
    folderId: r.folder_id,
    folderName: r.folder_name,
    title: r.title,
    fileName: r.file_name,
    durationSec: r.duration_sec,
    text: r.text,
    segments: r.segments,
    speakerNames: r.speaker_names,
    notes: r.notes,
    processingTimeMs: r.processing_ms,
    diarizationError: r.diarization_error,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export interface NewRecording {
  userId: string;
  folderId: string | null;
  title: string;
  fileName: string;
  text: string;
  segments: LabeledSegment[];
  processingMs: number;
  diarizationError: string | null;
}

export async function insertRecording(db: Db, input: NewRecording): Promise<RecordingRow> {
  const durationSec = input.segments.reduce((max, s) => Math.max(max, s.end), 0);
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO recordings
       (user_id, folder_id, title, file_name, duration_sec, text, segments, processing_ms, diarization_error)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      input.userId,
      input.folderId,
      input.title,
      input.fileName,
      durationSec,
      input.text,
      JSON.stringify(input.segments),
      Math.round(input.processingMs),
      input.diarizationError,
    ],
  );
  const created = await db.query<RecordingRow>(`${RECORDING_SELECT} WHERE r.id = $1`, [rows[0]!.id]);
  return created.rows[0]!;
}
