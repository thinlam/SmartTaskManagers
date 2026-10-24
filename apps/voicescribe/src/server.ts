import { existsSync } from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { loadConfig } from './config/env.js';
import { createPool } from './db/pool.js';
import { migrate } from './db/migrate.js';
import { requireAuth } from './auth/middleware.js';
import { allowDesktopOrigins } from './api/cors.js';
import { createAuthRouter } from './api/authRoutes.js';
import { createFoldersRouter } from './api/foldersRoutes.js';
import { createRecordingsRouter } from './api/recordingsRoutes.js';
import { createTranscribeRouter } from './api/transcribeRoute.js';
import { TranscriptionJobs } from './services/jobs.js';

const config = loadConfig();
const db = createPool(config.databaseUrl);
await migrate(db);
const jobs = new TranscriptionJobs(config, db);
await jobs.recoverInterrupted();

const app = express();
// Railway terminates TLS in front of the container; trust it so req.ip is the client.
app.set('trust proxy', 1);

app.get('/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'database unavailable' });
  }
});

const api = express.Router();
api.use(allowDesktopOrigins);
api.use(express.json({ limit: '256kb' }));
api.use(createAuthRouter(config, db));

const auth = requireAuth(config.jwtSecret);
api.use('/transcribe', auth, createTranscribeRouter(config, db, jobs));
api.use('/recordings', auth, createRecordingsRouter(db, jobs));
api.use('/folders', auth, createFoldersRouter(db));
api.use((_req, res) => {
  res.status(404).json({ error: 'Không tìm thấy.' });
});
app.use('/api', api);

// In production the built web app (web/dist) is served by this same process,
// so the browser talks to one origin and `/api` needs no CORS or proxy.
const webDist = path.resolve(import.meta.dirname, '../web/dist');
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

// Keep API failures as JSON (Express would otherwise answer with an HTML stack trace).
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[unhandled]', err);
  if (res.headersSent) return;
  const malformed = err instanceof SyntaxError;
  res.status(malformed ? 400 : 500).json({
    error: malformed ? 'Dữ liệu gửi lên không hợp lệ.' : 'Đã xảy ra lỗi máy chủ.',
  });
});

app.listen(config.port, () => {
  console.log(`VoiceScribe backend listening on http://localhost:${config.port}`);
  if (config.signupCode === undefined) {
    console.warn('SIGNUP_CODE is not set: anyone who can reach this server can register.');
  }
});
