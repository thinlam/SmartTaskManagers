import { InferenceClient, InferenceClientProviderApiError } from '@huggingface/inference';
import {
  CancelledError,
  TranscriptionError,
  type TranscriptSegment,
  type TranscriptWord,
  type TranscriptionResult,
} from '../types/transcription.js';

/** A word ends a sentence/clause worth splitting a segment at. */
const SENTENCE_END = /[.?!…]$/;
/** Gap between two words' timestamps past which they're treated as separate segments (seconds). */
const SEGMENT_GAP_SEC = 0.7;

/**
 * Splits a flat run of words into segments by sentence-ending punctuation or a
 * pause between words — this REPLACES Whisper's own chunk-level segmentation,
 * which isn't returned when requesting word-level timestamps (see the
 * `return_timestamps: 'word'` attempt below). Approximate by design: a real
 * ASR segmenter this is not, just "good enough to split into readable blocks".
 */
function segmentWords(words: TranscriptWord[]): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  let current: TranscriptWord[] = [];
  for (const word of words) {
    const prev = current[current.length - 1];
    if (prev && word.start - prev.end > SEGMENT_GAP_SEC) {
      segments.push(toSegment(current));
      current = [];
    }
    current.push(word);
    if (SENTENCE_END.test(word.text.trim())) {
      segments.push(toSegment(current));
      current = [];
    }
  }
  if (current.length) segments.push(toSegment(current));
  return segments;
}

function toSegment(words: TranscriptWord[]): TranscriptSegment {
  return {
    text: words.map((w) => w.text).join(' ').trim(),
    start: words[0]!.start,
    end: words[words.length - 1]!.end,
    words,
  };
}

/**
 * Fallback when the provider didn't actually return word-level timestamps (see
 * `wordLevel` detection below): splits the segment's own text into words and
 * distributes its [start, end] duration across them proportionally by
 * character length. This is an APPROXIMATION, not real alignment — documented
 * as such in the plan (docs/project/plans/2026-11-09-voicescribe-xoa-doan-moc-tung-tu.md,
 * "Hướng đi / cách làm" → Việc B) because true forced alignment would need new
 * infrastructure disproportionate to this task.
 */
function interpolateWords(text: string, start: number, end: number): TranscriptWord[] {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const totalChars = tokens.reduce((sum, t) => sum + t.length, 0) || 1;
  const duration = Math.max(0, end - start);
  let cursor = start;
  return tokens.map((t) => {
    const share = (t.length / totalChars) * duration;
    const wordStart = cursor;
    const wordEnd = tokens.length === 1 ? end : Math.min(end, cursor + share);
    cursor = wordEnd;
    return { text: t, start: wordStart, end: wordEnd };
  });
}

/**
 * Known Whisper hallucination phrases — stock sentences the model "makes up"
 * from its training data (YouTube subtitles) when a chunk is mostly silence
 * or noise instead of returning empty text. Pre-normalized (lowercase, no
 * trailing punctuation). Add more here as new cases are found.
 */
const KNOWN_HALLUCINATIONS = [
  'cảm ơn các bạn đã theo dõi',
  'cảm ơn các bạn đã xem video',
  'cảm ơn đã xem video',
  'cảm ơn mọi người đã theo dõi',
  'hãy đăng ký kênh',
  'nhớ like và subscribe',
  'đừng quên đăng ký kênh',
  'phụ đề được thực hiện bởi',
  'thanks for watching',
  'thank you for watching',
  'please subscribe',
  "don't forget to subscribe",
  'subscribe to my channel',
];

function normalizeForHallucinationCheck(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.!?…]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isHallucinatedPhrase(text: string): boolean {
  const normalized = normalizeForHallucinationCheck(text);
  return KNOWN_HALLUCINATIONS.includes(normalized);
}

const MODEL = 'openai/whisper-large-v3';
const MAX_RETRIES = 4;
const RETRY_BASE_DELAY_MS = 2000;
// Rate limits, provider hiccups and cold-starting models are all worth another try.
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Maps a raw error from the Inference Providers call to a short,
 * user-safe Vietnamese message. The real error (with stack trace) stays
 * in the thrown TranscriptionError's `cause_` for server-side logging —
 * callers must never print `cause_` to an end user.
 */
function toUserMessage(err: unknown): string {
  if (err instanceof InferenceClientProviderApiError) {
    const status = err.httpResponse.status;
    switch (status) {
      case 400:
        return 'File âm thanh không hợp lệ hoặc định dạng không được hỗ trợ.';
      case 401:
        return 'Token Hugging Face không hợp lệ hoặc đã hết hạn.';
      case 403:
        return 'Không có quyền truy cập model này (có thể cần chấp nhận điều khoản sử dụng trên Hugging Face).';
      case 404:
        return 'Không tìm thấy model hoặc nhà cung cấp dịch vụ.';
      case 408:
        return 'Yêu cầu bị timeout, vui lòng thử lại.';
      case 413:
        return 'File âm thanh quá lớn.';
      case 429:
        return 'Đã vượt giới hạn số lượng yêu cầu, vui lòng thử lại sau.';
      case 500:
        return 'Lỗi từ máy chủ xử lý âm thanh, vui lòng thử lại sau.';
      case 503:
        return 'Model đang khởi động, vui lòng thử lại sau ít phút.';
      default:
        return `Lỗi không xác định từ máy chủ (mã ${status}).`;
    }
  }
  if (err instanceof Error && err.name === 'AbortError') {
    return 'Yêu cầu bị timeout, vui lòng thử lại.';
  }
  if (err instanceof SyntaxError) {
    return 'Máy chủ trả về dữ liệu không hợp lệ (JSON lỗi).';
  }
  return 'Đã xảy ra lỗi không xác định khi xử lý âm thanh.';
}

function inferMimeType(filePath: string): string {
  const ext = filePath.toLowerCase().split('.').pop();
  switch (ext) {
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'm4a':
      return 'audio/mp4';
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'audio/webm';
    default:
      return 'application/octet-stream';
  }
}

export interface TranscribeOptions {
  hfToken: string;
  audio: Buffer;
  /** Used only to infer the MIME type from the extension. */
  fileName: string;
  signal?: AbortSignal;
  /**
   * Return an empty result instead of throwing when no speech is detected. Needed for
   * chunked long audio, where a silent 30s stretch must not fail the whole file.
   */
  allowEmpty?: boolean;
}

export async function transcribeAudio(options: TranscribeOptions): Promise<TranscriptionResult> {
  const client = new InferenceClient(options.hfToken);
  const mimeType = inferMimeType(options.fileName);
  const blob = new Blob([Uint8Array.from(options.audio)], { type: mimeType });

  const startedAt = Date.now();
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (options.signal?.aborted) throw new CancelledError();
    try {
      // `return_timestamps: 'word'` is not in the official parameter type (only `boolean`
      // is) — it's the HF Transformers ASR pipeline's own word-granularity option, which
      // may or may not be honored depending on which Inference Provider actually serves
      // this request. Detected below rather than trusted; see interpolateWords() for the
      // fallback when it isn't honored.
      const output = await client.automaticSpeechRecognition({
        model: MODEL,
        inputs: blob,
        parameters: { return_timestamps: 'word' as unknown as true },
      });

      const processingTimeMs = Date.now() - startedAt;

      if (!output.text || output.text.trim().length === 0) {
        if (options.allowEmpty) return { text: '', segments: [], processingTimeMs };
        throw new TranscriptionError(
          'Kết quả nhận dạng trống — không phát hiện lời nói trong file âm thanh.',
        );
      }

      const chunks = output.chunks ?? [];
      // Heuristic: if every non-empty chunk's trimmed text has no internal
      // whitespace, the provider gave us one chunk per word — genuine word-level
      // timestamps. A provider that ignored the 'word' parameter instead returns
      // the usual multi-word sentence chunks, caught by this same check.
      const wordLevel =
        chunks.length > 0 && chunks.every((c) => !c.text.trim().includes(' ') || !c.text.trim());

      let segments: TranscriptSegment[];
      if (wordLevel) {
        const words: TranscriptWord[] = chunks
          .filter((c) => c.text.trim())
          .map((c) => {
            const [start, end] = c.timestamp;
            return { text: c.text.trim(), start: start ?? 0, end: end ?? start ?? 0 };
          });
        segments = segmentWords(words);
      } else {
        segments = chunks.map((chunk) => {
          const [start, end] = chunk.timestamp;
          const segStart = start ?? 0;
          const segEnd = end ?? segStart;
          return {
            text: chunk.text,
            start: segStart,
            end: segEnd,
            words: interpolateWords(chunk.text, segStart, segEnd),
          };
        });
      }

      const filteredSegments = segments.filter((s) => !isHallucinatedPhrase(s.text));
      const filteredText = filteredSegments.map((s) => s.text).join(' ').trim();
      if (filteredSegments.length === 0 && segments.length > 0) {
        // The whole chunk was hallucinated text (e.g. a silent/noisy tail) — treat it
        // the same as a chunk with no speech at all.
        if (options.allowEmpty) return { text: '', segments: [], processingTimeMs };
        throw new TranscriptionError(
          'Kết quả nhận dạng trống — không phát hiện lời nói trong file âm thanh.',
        );
      }
      return { text: filteredText, segments: filteredSegments, processingTimeMs };
    } catch (err) {
      lastError = err;
      if (err instanceof TranscriptionError || err instanceof CancelledError) throw err;
      const retryable =
        err instanceof InferenceClientProviderApiError
          ? RETRYABLE_STATUSES.has(err.httpResponse.status)
          : // Network-level failures (reset connection, DNS) surface as plain errors, not API errors.
            err instanceof TypeError || (err instanceof Error && err.name === 'AbortError');
      if (retryable && attempt < MAX_RETRIES) {
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
        continue;
      }
      throw new TranscriptionError(toUserMessage(err), err);
    }
  }

  // Unreachable in practice (loop always returns or throws), satisfies TS control-flow analysis.
  throw new TranscriptionError(toUserMessage(lastError), lastError);
}
