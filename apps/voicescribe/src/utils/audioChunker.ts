import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const CHUNK_LENGTH_SEC = 30;
export const CHUNK_OVERLAP_SEC = 2;
const CHUNK_STEP_SEC = CHUNK_LENGTH_SEC - CHUNK_OVERLAP_SEC;

export interface AudioChunk {
  /** Offset of this chunk's start within the original audio, in seconds. */
  startSec: number;
  data: Buffer;
}

/**
 * Reads total audio duration in seconds via ffprobe. Throws a plain
 * Error (caller maps it to a user-safe message) if ffprobe isn't
 * available or the file can't be read.
 */
export async function getAudioDurationSec(filePath: string): Promise<number> {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    filePath,
  ]);
  const duration = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`ffprobe trả về thời lượng không hợp lệ: "${stdout.trim()}"`);
  }
  return duration;
}

/**
 * Splits an audio file into ~CHUNK_LENGTH_SEC segments with
 * CHUNK_OVERLAP_SEC overlap between consecutive chunks, re-encoded to
 * 16kHz mono WAV (the format Whisper expects internally, and avoids
 * any container/codec edge cases from re-cutting compressed formats
 * like mp3/m4a mid-frame). Each chunk is transcribed independently by
 * the caller; mergeChunkSegments() below removes the duplicated
 * overlap region afterward.
 */
export async function splitAudioIntoChunks(filePath: string): Promise<AudioChunk[]> {
  const durationSec = await getAudioDurationSec(filePath);

  if (durationSec <= CHUNK_LENGTH_SEC + 5) {
    const data = await readFile(filePath);
    return [{ startSec: 0, data }];
  }

  const tmpDir = await mkdtemp(join(tmpdir(), 'voicescribe-chunks-'));
  try {
    const chunks: AudioChunk[] = [];
    let startSec = 0;
    let index = 0;
    // Stop once less than a second of audio remains: a sliver that small
    // adds nothing to the transcript, and seeking ffmpeg to within ~1s of
    // EOF on VBR mp3 intermittently trips the decoder ("Header missing",
    // empty output) instead of just yielding a short clip.
    while (startSec < durationSec - 1) {
      const outPath = join(tmpDir, `chunk-${index}.wav`);
      await execFileAsync('ffmpeg', [
        '-y',
        '-ss',
        String(startSec),
        '-t',
        String(CHUNK_LENGTH_SEC),
        '-i',
        filePath,
        '-ac',
        '1',
        '-ar',
        '16000',
        '-c:a',
        'pcm_s16le',
        outPath,
      ]);
      const data = await readFile(outPath);
      chunks.push({ startSec, data });
      startSec += CHUNK_STEP_SEC;
      index += 1;
    }
    return chunks;
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}
