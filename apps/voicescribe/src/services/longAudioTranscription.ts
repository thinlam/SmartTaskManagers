import { writeFile, rm, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { transcribeAudio } from './transcription.js';
import { CHUNK_OVERLAP_SEC, splitAudioIntoChunks, type AudioChunk } from '../utils/audioChunker.js';
import {
  CancelledError,
  TranscriptionError,
  type TranscriptSegment,
  type TranscriptionResult,
} from '../types/transcription.js';

export interface TranscribeLongAudioOptions {
  hfToken: string;
  audio: Buffer;
  /** Original filename, used only to pick a temp-file extension for ffprobe/ffmpeg. */
  fileName: string;
  /** Called after each chunk finishes, with how many of `total` are done (also once with 0 when the total is known). */
  onProgress?: (done: number, total: number) => void;
  /** How many chunks to send to the provider at once. */
  concurrency?: number;
  signal?: AbortSignal;
}

/**
 * Drops segments that fall entirely inside a chunk's overlap region
 * (shared with the end of the previous chunk), so the same spoken
 * words aren't duplicated in the merged transcript. This is an
 * approximation: it trims by timestamp, not by comparing text, so a
 * segment that straddles the overlap boundary is kept whole (better to
 * keep a slightly-early segment than to cut a sentence in half).
 */
function mergeChunkSegments(
  chunkResults: { startSec: number; result: TranscriptionResult }[],
): TranscriptSegment[] {
  const merged: TranscriptSegment[] = [];
  chunkResults.forEach(({ startSec, result }, index) => {
    for (const seg of result.segments) {
      const isFirstChunk = index === 0;
      if (!isFirstChunk && seg.end <= CHUNK_OVERLAP_SEC) {
        continue;
      }
      merged.push({
        text: seg.text,
        start: startSec + seg.start,
        end: startSec + seg.end,
      });
    }
  });
  return merged;
}

function extensionFor(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  return ext ?? 'bin';
}

/**
 * Transcribes audio of any length: the file is split into overlapping ~30s
 * chunks (see audioChunker.ts), a few chunks are transcribed at a time, and
 * the results are merged back into one segment list with absolute timestamps.
 * A silent chunk yields no text rather than failing the whole file; only a file
 * with no speech at all is an error.
 */
export async function transcribeLongAudio(
  options: TranscribeLongAudioOptions,
): Promise<TranscriptionResult> {
  const startedAt = Date.now();
  const tmpDir = await mkdtemp(join(tmpdir(), 'voicescribe-input-'));
  const inputPath = join(tmpDir, `input.${extensionFor(options.fileName)}`);

  try {
    await writeFile(inputPath, options.audio);
    if (options.signal?.aborted) throw new CancelledError();
    let chunks: AudioChunk[];
    try {
      chunks = await splitAudioIntoChunks(inputPath);
    } catch (err) {
      // Turn ffmpeg/ffprobe failures into messages a user can act on; the raw error
      // stays on TranscriptionError.cause_ for the server log.
      const missingBinary = (err as NodeJS.ErrnoException).code === 'ENOENT';
      throw new TranscriptionError(
        missingBinary
          ? 'Máy chủ thiếu công cụ xử lý âm thanh (ffmpeg). Vui lòng báo quản trị viên.'
          : 'Không đọc được file âm thanh. File có thể bị hỏng hoặc không đúng định dạng.',
        err,
      );
    }

    const total = chunks.length;
    const results: (TranscriptionResult | undefined)[] = new Array(total).fill(undefined);
    let next = 0;
    let done = 0;
    let failure: unknown;
    options.onProgress?.(0, total);

    const worker = async (): Promise<void> => {
      while (failure === undefined) {
        const index = next++;
        const chunk = chunks[index];
        if (!chunk) return;
        if (options.signal?.aborted) {
          failure = new CancelledError();
          return;
        }
        try {
          results[index] = await transcribeAudio({
            hfToken: options.hfToken,
            audio: chunk.data,
            fileName: 'chunk.wav',
            signal: options.signal,
            allowEmpty: true,
          });
          // Free the decoded audio as soon as it has been sent.
          chunk.data = Buffer.alloc(0);
          options.onProgress?.(++done, total);
        } catch (err) {
          failure ??= err;
          return;
        }
      }
    };

    const workers = Math.max(1, Math.min(options.concurrency ?? 3, total));
    await Promise.all(Array.from({ length: workers }, () => worker()));
    if (failure !== undefined) throw failure;

    const chunkResults = chunks.map((chunk, i) => ({
      startSec: chunk.startSec,
      result: results[i] ?? { text: '', segments: [], processingTimeMs: 0 },
    }));
    const segments = mergeChunkSegments(chunkResults);
    const text = chunkResults
      .map((c) => c.result.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) {
      throw new TranscriptionError(
        'Kết quả nhận dạng trống — không phát hiện lời nói trong file âm thanh.',
      );
    }

    return { text, segments, processingTimeMs: Date.now() - startedAt };
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}
