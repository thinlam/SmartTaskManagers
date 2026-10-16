import { InferenceClient, InferenceClientProviderApiError } from '@huggingface/inference';
import { TranscriptionError, type TranscriptionResult } from '../types/transcription.js';

const MODEL = 'openai/whisper-large-v3';
const MAX_503_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 2000;

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
}

export async function transcribeAudio(options: TranscribeOptions): Promise<TranscriptionResult> {
  const client = new InferenceClient(options.hfToken);
  const mimeType = inferMimeType(options.fileName);
  const blob = new Blob([Uint8Array.from(options.audio)], { type: mimeType });

  const startedAt = Date.now();
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_503_RETRIES; attempt++) {
    try {
      const output = await client.automaticSpeechRecognition({
        model: MODEL,
        inputs: blob,
        parameters: { return_timestamps: true },
      });

      const processingTimeMs = Date.now() - startedAt;

      if (!output.text || output.text.trim().length === 0) {
        throw new TranscriptionError('Kết quả nhận dạng trống — không phát hiện lời nói trong file âm thanh.');
      }

      const segments = (output.chunks ?? []).map((chunk) => {
        const [start, end] = chunk.timestamp;
        return {
          text: chunk.text,
          start: start ?? 0,
          end: end ?? start ?? 0,
        };
      });

      return { text: output.text, segments, processingTimeMs };
    } catch (err) {
      lastError = err;
      const is503 =
        err instanceof InferenceClientProviderApiError && err.httpResponse.status === 503;
      if (is503 && attempt < MAX_503_RETRIES) {
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
        continue;
      }
      if (err instanceof TranscriptionError) throw err;
      throw new TranscriptionError(toUserMessage(err), err);
    }
  }

  // Unreachable in practice (loop always returns or throws), satisfies TS control-flow analysis.
  throw new TranscriptionError(toUserMessage(lastError), lastError);
}
