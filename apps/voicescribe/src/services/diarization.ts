import { TranscriptionError } from '../types/transcription.js';
import type { RawSpeakerSegment } from '../types/diarization.js';

const SIDECAR_URL = process.env.DIARIZATION_SERVICE_URL ?? 'http://127.0.0.1:8008';

export interface DiarizeOptions {
  audio: Buffer;
  fileName: string;
  /** Optional hint to the model — improves accuracy when the exact speaker count is known. */
  numSpeakers?: number;
  signal?: AbortSignal;
}

interface SidecarResponse {
  segments: RawSpeakerSegment[];
  speakerCount: number;
}

/**
 * Calls the local Python diarization sidecar (main.py, pyannote/
 * speaker-diarization-3.1 — there is no hosted API for this model, see
 * the Bước 3 research). Not reachable means the sidecar isn't running;
 * mapped to a clear, user-safe error rather than a raw ECONNREFUSED.
 */
export async function diarizeAudio(options: DiarizeOptions): Promise<RawSpeakerSegment[]> {
  const form = new FormData();
  form.append('audio', new Blob([Uint8Array.from(options.audio)]), options.fileName);
  if (options.numSpeakers !== undefined) {
    form.append('num_speakers', String(options.numSpeakers));
  }

  let response: Response;
  try {
    response = await fetch(`${SIDECAR_URL}/diarize`, {
      method: 'POST',
      body: form,
      signal: options.signal,
    });
  } catch {
    throw new TranscriptionError(
      'Không kết nối được tới dịch vụ nhận dạng người nói (diarization service chưa chạy?).',
    );
  }

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // response wasn't JSON — keep the generic HTTP status message
    }
    throw new TranscriptionError(`Lỗi nhận dạng người nói: ${detail}`);
  }

  const data = (await response.json()) as SidecarResponse;
  return data.segments;
}
