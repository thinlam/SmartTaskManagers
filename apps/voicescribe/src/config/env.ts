/**
 * Reads required environment variables and fails fast with a clear
 * message if any are missing, instead of letting a later network call
 * fail with a confusing 401.
 */
export interface AppConfig {
  hfToken: string;
  port: number;
  maxUploadMb: number;
  /** Shared secret required on /api when set; see api/accessKey.ts. */
  accessKey: string | undefined;
}

export function loadConfig(): AppConfig {
  const hfToken = process.env.HF_TOKEN;
  if (!hfToken) {
    throw new Error(
      'Thiếu biến môi trường HF_TOKEN. Tạo file .env (xem .env.example) với HF_TOKEN=hf_...',
    );
  }
  const port = Number.parseInt(process.env.PORT ?? '3001', 10);
  const maxUploadMb = Number.parseInt(process.env.MAX_UPLOAD_MB ?? '100', 10);
  const accessKey = process.env.ACCESS_KEY?.trim() || undefined;
  return { hfToken, port, maxUploadMb, accessKey };
}
