import express from 'express';
import { loadConfig } from './config/env.js';
import { createTranscribeRouter } from './api/transcribeRoute.js';

const config = loadConfig();
const app = express();

app.use('/api', createTranscribeRouter(config));

app.listen(config.port, () => {
  console.log(`VoiceScribe backend listening on http://localhost:${config.port}`);
});
