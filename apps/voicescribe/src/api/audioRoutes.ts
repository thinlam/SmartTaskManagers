import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { Router } from 'express';
import { verifyToken } from '../auth/token.js';
import type { AppConfig } from '../config/env.js';
import type { Db } from '../db/pool.js';
import { isUuid } from '../utils/validation.js';

function contentTypeFor(basename: string): string {
  switch (basename.toLowerCase().split('.').pop()) {
    case 'mp3':
      return 'audio/mpeg';
    case 'm4a':
    case 'mp4':
      return 'audio/mp4';
    case 'wav':
      return 'audio/wav';
    case 'webm':
      return 'audio/webm';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Streams a completed recording's original audio for in-app playback.
 * Mounted WITHOUT the normal `Authorization: Bearer` middleware — a plain
 * <audio src> cannot send custom headers, so the same JWT is passed as
 * ?token= instead for this one route.
 */
export function createAudioRouter(config: AppConfig, db: Db): Router {
  const router = Router();

  router.get('/:id/audio', async (req, res) => {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    const userId = token ? verifyToken(token, config.jwtSecret) : null;
    if (!userId) {
      res.status(401).json({ error: 'Bạn cần đăng nhập.' });
      return;
    }
    if (!isUuid(req.params.id)) {
      res.status(404).json({ error: 'Không tìm thấy bản ghi.' });
      return;
    }

    const { rows } = await db.query<{ audio_path: string | null }>(
      'SELECT audio_path FROM recordings WHERE id = $1 AND user_id = $2',
      [req.params.id, userId],
    );
    const audioPath = rows[0]?.audio_path;
    if (!audioPath) {
      res.status(404).json({ error: 'Không còn file âm thanh gốc cho bản ghi này.' });
      return;
    }

    const absolutePath = join(config.audioStorageDir, audioPath);
    let size: number;
    try {
      size = (await stat(absolutePath)).size;
    } catch {
      res.status(404).json({ error: 'File âm thanh không còn trên máy chủ.' });
      return;
    }

    const contentType = contentTypeFor(audioPath);
    const range = req.headers.range;
    if (!range) {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': size,
        'Accept-Ranges': 'bytes',
      });
      createReadStream(absolutePath).pipe(res);
      return;
    }

    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    const start = match?.[1] ? Number.parseInt(match[1], 10) : 0;
    const end = match?.[2] ? Number.parseInt(match[2], 10) : size - 1;
    if (!match || Number.isNaN(start) || Number.isNaN(end) || start > end || end >= size) {
      res.status(416).set('Content-Range', `bytes */${size}`).end();
      return;
    }

    res.writeHead(206, {
      'Content-Type': contentType,
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': end - start + 1,
      'Accept-Ranges': 'bytes',
    });
    createReadStream(absolutePath, { start, end }).pipe(res);
  });

  return router;
}
