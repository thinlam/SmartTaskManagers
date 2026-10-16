/**
 * Reads required environment variables and fails fast with a clear
 * message if any are missing, instead of letting a later network call
 * fail with a confusing 401.
 */
export interface AppConfig {
  hfToken: string;
}

export function loadConfig(): AppConfig {
  const hfToken = process.env.HF_TOKEN;
  if (!hfToken) {
    throw new Error(
      'Thiếu biến môi trường HF_TOKEN. Tạo file .env (xem .env.example) với HF_TOKEN=hf_...',
    );
  }
  return { hfToken };
}
