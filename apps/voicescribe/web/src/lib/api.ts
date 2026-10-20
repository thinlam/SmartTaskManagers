import type { TranscribeResult } from '../types';

const ACCESS_KEY_STORAGE = 'voicescribe.accessKey';

function readAccessKey(): string {
  try {
    return localStorage.getItem(ACCESS_KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

function saveAccessKey(key: string): void {
  try {
    localStorage.setItem(ACCESS_KEY_STORAGE, key);
  } catch {
    // Storage unavailable: the key is just asked again next time.
  }
}

/**
 * Uses XMLHttpRequest (not fetch) specifically for its upload.onprogress
 * event — this is how the UI's progress bar reflects real upload
 * progress. There is no equivalent event for the server-side
 * transcription+diarization work itself (the backend is synchronous),
 * so progress after 100% upload is shown as an indeterminate
 * "processing" state, not a fake percentage.
 */
export function transcribeFile(
  file: File,
  numSpeakers: number | undefined,
  onUploadProgress: (percent: number) => void,
  signal?: AbortSignal,
  retriedWithKey = false,
): Promise<TranscribeResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/transcribe');
    const accessKey = readAccessKey();
    if (accessKey) xhr.setRequestHeader('x-access-key', accessKey);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onUploadProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      // The server is gated by ACCESS_KEY: ask once, remember it, and retry.
      if (xhr.status === 401 && !retriedWithKey) {
        const entered = window.prompt('Nhập khóa truy cập VoiceScribe:');
        if (entered) {
          saveAccessKey(entered.trim());
          transcribeFile(file, numSpeakers, onUploadProgress, signal, true).then(resolve, reject);
          return;
        }
      }
      let body: unknown;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error('Máy chủ trả về dữ liệu không hợp lệ.'));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as TranscribeResult);
      } else {
        const message =
          body && typeof body === 'object' && 'error' in body
            ? String((body as { error: unknown }).error)
            : `Lỗi máy chủ (${xhr.status}).`;
        reject(new Error(message));
      }
    };

    xhr.onerror = () => reject(new Error('Không kết nối được tới máy chủ.'));
    xhr.onabort = () => reject(new DOMException('Đã hủy', 'AbortError'));

    if (signal) {
      signal.addEventListener('abort', () => xhr.abort());
    }

    const form = new FormData();
    form.append('audio', file, file.name);
    if (numSpeakers !== undefined) {
      form.append('num_speakers', String(numSpeakers));
    }
    xhr.send(form);
  });
}
