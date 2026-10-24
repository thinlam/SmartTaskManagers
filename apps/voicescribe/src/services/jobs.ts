import { mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AppConfig } from '../config/env.js';
import type { Db } from '../db/pool.js';
import { CancelledError, TranscriptionError } from '../types/transcription.js';
import { diarizeAudio } from './diarization.js';
import { transcribeLongAudio } from './longAudioTranscription.js';
import { completeRecording, failRecording, setProgress } from './recordings.js';
import { mergeTranscriptWithSpeakers } from '../utils/mergeSpeakers.js';

export const UPLOAD_DIR = join(tmpdir(), 'voicescribe-uploads');

export interface TranscriptionJob {
  recordingId: string;
  /** Path of the uploaded audio on local disk; deleted when the job finishes. */
  audioPath: string;
  fileName: string;
  numSpeakers: number | undefined;
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
    try {
      const audio = await readFile(job.audioPath);
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
      let segments;
      if (!this.config.diarizationEnabled) {
        segments = result.segments.map((seg) => ({ ...seg, speaker: 'Người nói 1' }));
      } else {
        try {
          const speakerSegments = await diarizeAudio({
            audio,
            fileName: job.fileName,
            numSpeakers: job.numSpeakers,
          });
          segments = mergeTranscriptWithSpeakers(result.segments, speakerSegments);
        } catch (err) {
          diarizationError =
            err instanceof TranscriptionError
              ? err.message
              : 'Lỗi không xác định khi nhận dạng người nói.';
          segments = result.segments.map((seg) => ({ ...seg, speaker: 'Người nói 1' }));
        }
      }

      if (controller.signal.aborted) return;
      await completeRecording(this.db, job.recordingId, {
        text: result.text,
        segments,
        processingMs: result.processingTimeMs,
        diarizationError,
      });
    } catch (err) {
      if (err instanceof CancelledError) return;
      const message =
        err instanceof TranscriptionError
          ? err.message
          : 'Đã xảy ra lỗi không xác định khi xử lý âm thanh.';
      if (!(err instanceof TranscriptionError)) console.error('[jobs] unexpected error:', err);
      await failRecording(this.db, job.recordingId, message).catch((e: unknown) =>
        console.error('[jobs] could not record failure:', e),
      );
    } finally {
      this.active.delete(job.recordingId);
      await rm(job.audioPath, { force: true });
      this.pump();
    }
  }
}
