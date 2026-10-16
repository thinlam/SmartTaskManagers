import { writeFile, rm, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { transcribeAudio } from './transcription.js';
import {
  CHUNK_OVERLAP_SEC,
  splitAudioIntoChunks,
  type AudioChunk,
} from '../utils/audioChunker.js';
import type { TranscriptSegment, TranscriptionResult } from '../types/transcription.js';

export interface TranscribeLongAudioOptions {
  hfToken: string;
  audio: Buffer;
  /** Original filename, used only to pick a temp-file extension for ffprobe/ffmpeg. */
  fileName: string;
  /** Called after each chunk finishes, with how many of `total` are done. */
  onProgress?: (done: number, total: number) => void;
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
 * Transcribes audio of any length: short files go straight to
 * transcribeAudio(); long files are split into overlapping ~30s chunks
 * (see audioChunker.ts), transcribed independently, and merged back
 * into one segment list with absolute timestamps.
 */
export async function transcribeLongAudio(
  options: TranscribeLongAudioOptions,
): Promise<TranscriptionResult> {
  const startedAt = Date.now();
  const tmpDir = await mkdtemp(join(tmpdir(), 'voicescribe-input-'));
  const inputPath = join(tmpDir, `input.${extensionFor(options.fileName)}`);

  try {
    await writeFile(inputPath, options.audio);
    const chunks: AudioChunk[] = await splitAudioIntoChunks(inputPath);

    const chunkResults: { startSec: number; result: TranscriptionResult }[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk) continue;
      const result = await transcribeAudio({
        hfToken: options.hfToken,
        audio: chunk.data,
        fileName: 'chunk.wav',
      });
      chunkResults.push({ startSec: chunk.startSec, result });
      options.onProgress?.(i + 1, chunks.length);
    }

    const segments = mergeChunkSegments(chunkResults);
    const text = chunkResults.map((c) => c.result.text).join(' ').replace(/\s+/g, ' ').trim();

    return {
      text,
      segments,
      processingTimeMs: Date.now() - startedAt,
    };
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}
