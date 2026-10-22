/**
 * Reads required environment variables and fails fast with a clear
 * message if any are missing, instead of letting a later network call
 * fail with a confusing 401.
 */
export interface AppConfig {
  hfToken: string;
  port: number;
  maxUploadMb: number;
  databaseUrl: string;
  jwtSecret: string;
  /** When set, registering requires this invite code (keeps strangers from spending the HF quota). */
  signupCode: string | undefined;
}

const DEV_JWT_SECRET = 'voicescribe-dev-only-secret-change-before-deploying';

export function loadConfig(): AppConfig {
  const hfToken = process.env.HF_TOKEN;
  if (!hfToken) {
    throw new Error(
      'Thiếu biến môi trường HF_TOKEN. Tạo file .env (xem .env.example) với HF_TOKEN=hf_...',
    );
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'Thiếu biến môi trường DATABASE_URL (PostgreSQL). Xem .env.example và docker-compose.voicescribe.yml.',
    );
  }

  const production = process.env.NODE_ENV === 'production';
  let jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    if (production) {
      throw new Error('Thiếu biến môi trường JWT_SECRET (chuỗi ngẫu nhiên, tối thiểu 32 ký tự).');
    }
    jwtSecret = DEV_JWT_SECRET;
  } else if (production && jwtSecret.length < 32) {
    throw new Error('JWT_SECRET phải dài tối thiểu 32 ký tự.');
  }

  const port = Number.parseInt(process.env.PORT ?? '3001', 10);
  const maxUploadMb = Number.parseInt(process.env.MAX_UPLOAD_MB ?? '100', 10);
  const signupCode = process.env.SIGNUP_CODE?.trim() || undefined;
  return { hfToken, port, maxUploadMb, databaseUrl, jwtSecret, signupCode };
}
