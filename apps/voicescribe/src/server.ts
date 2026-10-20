import { existsSync } from 'node:fs';
import path from 'node:path';
import express from 'express';
import { loadConfig } from './config/env.js';
import { createTranscribeRouter } from './api/transcribeRoute.js';
import { requireAccessKey } from './api/accessKey.js';

const config = loadConfig();
const app = express();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', requireAccessKey(config.accessKey), createTranscribeRouter(config));

// In production the built web app (web/dist) is served by this same process,
// so the browser talks to one origin and `/api` needs no CORS or proxy.
const webDist = path.resolve(import.meta.dirname, '../web/dist');
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

app.listen(config.port, () => {
  console.log(`VoiceScribe backend listening on http://localhost:${config.port}`);
  if (!config.accessKey) {
    console.warn('ACCESS_KEY is not set: /api is open to anyone who can reach this server.');
  }
});
