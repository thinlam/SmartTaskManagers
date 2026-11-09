import { copyFile, mkdir, readFile, rename, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import type { AppConfig } from '../config/env.js';
import type { Db } from '../db/pool.js';
import { CancelledError, TranscriptionError } from '../types/transcription.js';
import { diarizeAudio } from './diarization.js';
import { transcribeLongAudio } from './longAudioTranscription.js';
import { completeRecording, failRecording, setProgress } from './recordings.js';
import { denoiseAudio, type DenoiseLevel } from '../utils/audioChunker.js';
import { mergeTranscriptWithSpeakers } from '../utils/mergeSpeakers.js';

export const UPLOAD_DIR = join(tmpdir(), 'voicescribe-uploads');

/**
 * Moves the uploaded file out of UPLOAD_DIR into persistent storage so it
 * survives after the job finishes (kept for in-app playback). Falls back to
 * copy+delete when the two directories are on different filesystems
 * (rename() fails with EXDEV in that case, e.g. tmp on tmpfs vs. a mounted volume).
 */
async function moveToAudioStorage(src: string, dest: string): Promise<void> {
  try {
    await rename(src, dest);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EXDEV') throw err;
    await copyFile(src, dest);
    await rm(src, { force: true });
  }
}

export interface TranscriptionJob {
  recordingId: string;
  /** Path of the uploaded audio on local disk; deleted when the job finishes. */
  audioPath: string;
  fileName: string;
  numSpeakers: number | undefined;
  denoiseLevel: DenoiseLevel;
}

/**
 * In-process background queue. Uploads return immediately and the slow part
 * (chunking + Hugging Face calls) runs here, a bounded number of recordings at
 * a time so memory and provider load stay predictable. Jobs do not survive a
 * restart; `recoverInterrupted` marks them failed so they never hang as
 * "processing" forever.
 */
export class TranscriptionJobs {
  private readonly queue: TranscriptionJob[] = [];
  private readonly active = new Map<string, AbortController>();

  constructor(
    private readonly config: AppConfig,
    private readonly db: Db,
  ) {}

  /** Call once at startup, before accepting requests. */
  async recoverInterrupted(): Promise<void> {
    await rm(UPLOAD_DIR, { recursive: true, force: true });
    await mkdir(UPLOAD_DIR, { recursive: true });
    const { rowCount } = await this.db.query(
      `UPDATE recordings
          SET status = 'failed',
              error = 'Máy chủ khởi động lại khi đang xử lý. Vui lòng tải file lên lại.',
              updated_at = now()
        WHERE status = 'processing'`,
    );
    if (rowCount) console.warn(`[jobs] marked ${rowCount} interrupted recording(s) as failed`);
  }

  enqueue(job: TranscriptionJob): void {
    this.queue.push(job);
    this.pump();
  }

  /** Stops a queued or running job (used when its recording is deleted). */
  cancel(recordingId: string): void {
    const queuedAt = this.queue.findIndex((j) => j.recordingId === recordingId);
    if (queuedAt >= 0) {
      const [job] = this.queue.splice(queuedAt, 1);
      if (job) void rm(job.audioPath, { force: true });
    }
    this.active.get(recordingId)?.abort();
  }

  private pump(): void {
    while (this.active.size < this.config.maxConcurrentJobs) {
      const job = this.queue.shift();
      if (!job) return;
      void this.run(job);
    }
  }

  private async run(job: TranscriptionJob): Promise<void> {
    const controller = new AbortController();
    this.active.set(job.recordingId, controller);
    // Set once a denoised temp file exists, so `finally` can always clean it up —
    // whether the job goes on to succeed (after it's moved to persistent storage,
    // this is a harmless no-op) or fails partway through.
    let filteredTempPath: string | null = null;
    try {
      let audio = await readFile(job.audioPath);
      if (job.denoiseLevel !== 'off') {
        try {
          filteredTempPath = `${job.audioPath}.denoised.wav`;
          await denoiseAudio(job.audioPath, filteredTempPath, job.denoiseLevel);
          audio = await readFile(filteredTempPath);
        } catch (err) {
          // Best-effort: transcribe from the original audio instead of losing the job.
          console.error(
            `[jobs] denoise failed for recording ${job.recordingId}, using original audio:`,
            err,
          );
          filteredTempPath = null;
        }
      }
      const result = await transcribeLongAudio({
        hfToken: this.config.hfToken,
        audio,
        fileName: job.fileName,
        concurrency: this.config.chunkConcurrency,
        signal: controller.signal,
        onProgress: (done, total) => {
          void setProgress(this.db, job.recordingId, done, total).catch(() => undefined);
        },
      });

      // Diarization is best-effort: a sidecar that is not running (or fails for
      // this file) must not lose the transcript. Fall back to one speaker label
      // and record why.
      let diarizationError: string | null = null;
      // mergeTranscriptWithSpeakers() with an empty speaker list already assigns
      // everything to "Người nói 1" (see its bestSpeakerFor), so this also covers
      // "diarization disabled" and "diarization failed" — one path builds the
      // word-id-assigned segments + recording-level word list either way.
      let speakerSegments: Awaited<ReturnType<typeof diarizeAudio>> = [];
      if (this.config.diarizationEnabled) {
        try {
          speakerSegments = await diarizeAudio({
            audio,
            fileName: job.fileName,
            numSpeakers: job.numSpeakers,
          });
        } catch (err) {
          diarizationError =
            err instanceof TranscriptionError
              ? err.message
              : 'Lỗi không xác định khi nhận dạng người nói.';
        }
      }
      const { segments, words } = mergeTranscriptWithSpeakers(result.segments, speakerSegments);

      if (controller.signal.aborted) return;

      // Best-effort: keep the original audio for playback, but a failure here
      // must not lose the transcript — just leave this recording without audio.
      let audioPath: string | null = null;
      try {
        const basename = `${job.recordingId}${extname(job.audioPath).toLowerCase()}`;
        await mkdir(this.config.audioStorageDir, { recursive: true });
        await moveToAudioStorage(job.audioPath, join(this.config.audioStorageDir, basename));
        audioPath = basename;
      } catch (err) {
        console.error(`[jobs] could not keep audio for recording ${job.recordingId}:`, err);
      }

      let filteredAudioPath: string | null = null;
      if (filteredTempPath) {
        try {
          const basename = `${job.recordingId}-filtered.wav`;
          await moveToAudioStorage(filteredTempPath, join(this.config.audioStorageDir, basename));
          filteredAudioPath = basename;
          filteredTempPath = null; // moved — nothing left for `finally` to clean up
        } catch (err) {
          console.error(
            `[jobs] could not keep filtered audio for recording ${job.recordingId}:`,
            err,
          );
        }
      }

      await completeRecording(this.db, job.recordingId, {
        text: result.text,
        segments,
        words,
        processingMs: result.processingTimeMs,
        diarizationError,
        audioPath,
        filteredAudioPath,
        denoiseLevel: job.denoiseLevel,
      });
    } catch (err) {
      if (err instanceof CancelledError) return;
      const message =
        err instanceof TranscriptionError
          ? err.message
          : 'Đã xảy ra lỗi không xác định khi xử lý âm thanh.';
      // Always log the underlying cause (TranscriptionError hides it from the user message).
      console.error(
        `[jobs] recording ${job.recordingId} failed:`,
        err instanceof TranscriptionError ? (err.cause_ ?? err.message) : err,
      );
      await failRecording(this.db, job.recordingId, message).catch((e: unknown) =>
        console.error('[jobs] could not record failure:', e),
      );
    } finally {
      this.active.delete(job.recordingId);
      await rm(job.audioPath, { force: true });
      if (filteredTempPath) await rm(filteredTempPath, { force: true });
      this.pump();
    }
  }
}
