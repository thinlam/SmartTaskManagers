import type { Db } from '../db/pool.js';
import type { LabeledSegment } from '../types/diarization.js';

export type RecordingStatus = 'processing' | 'done' | 'failed';

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
  status: RecordingStatus;
  progress_done: number;
  progress_total: number;
  error: string | null;
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
    status: r.status,
    progressDone: r.progress_done,
    progressTotal: r.progress_total,
    error: r.error,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export interface PendingRecording {
  userId: string;
  folderId: string | null;
  title: string;
  fileName: string;
}

/** Creates the library entry up front so the user sees it (as "processing") while the job runs. */
export async function insertPendingRecording(
  db: Db,
  input: PendingRecording,
): Promise<RecordingRow> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO recordings (user_id, folder_id, title, file_name, status)
     VALUES ($1, $2, $3, $4, 'processing')
     RETURNING id`,
    [input.userId, input.folderId, input.title, input.fileName],
  );
  const created = await db.query<RecordingRow>(`${RECORDING_SELECT} WHERE r.id = $1`, [
    rows[0]!.id,
  ]);
  return created.rows[0]!;
}

export interface CompletedRecording {
  text: string;
  segments: LabeledSegment[];
  processingMs: number;
  diarizationError: string | null;
}

export async function completeRecording(
  db: Db,
  id: string,
  done: CompletedRecording,
): Promise<void> {
  const durationSec = done.segments.reduce((max, s) => Math.max(max, s.end), 0);
  await db.query(
    `UPDATE recordings
        SET status = 'done', text = $2, segments = $3, duration_sec = $4, processing_ms = $5,
            diarization_error = $6, error = NULL, progress_done = progress_total, updated_at = now()
      WHERE id = $1`,
    [
      id,
      done.text,
      JSON.stringify(done.segments),
      durationSec,
      Math.round(done.processingMs),
      done.diarizationError,
    ],
  );
}

export async function failRecording(db: Db, id: string, message: string): Promise<void> {
  await db.query(
    `UPDATE recordings SET status = 'failed', error = $2, updated_at = now()
      WHERE id = $1 AND status = 'processing'`,
    [id, message],
  );
}

export async function setProgress(db: Db, id: string, done: number, total: number): Promise<void> {
  await db.query(
    `UPDATE recordings SET progress_done = $2, progress_total = $3
      WHERE id = $1 AND status = 'processing'`,
    [id, done, total],
  );
}
