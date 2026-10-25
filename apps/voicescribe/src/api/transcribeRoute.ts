import { writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { userIdOf } from '../auth/middleware.js';
import type { AppConfig } from '../config/env.js';
import type { Db } from '../db/pool.js';
import { UPLOAD_DIR, type TranscriptionJobs } from '../services/jobs.js';
import { insertPendingRecording, toDetailDto } from '../services/recordings.js';
import { TranscriptionError } from '../types/transcription.js';
import { fixFilenameEncoding } from '../utils/filename.js';
import { isUuid } from '../utils/validation.js';

const ALLOWED_EXTENSIONS = new Set(['mp3', 'm4a', 'wav', 'mp4', 'webm']);
/** Recordings one user may have in "processing" at once. */
const MAX_ACTIVE_PER_USER = 3;

function extensionOf(fileName: string): string {
  return fileName.toLowerCase().split('.').pop() ?? '';
}

export function createTranscribeRouter(config: AppConfig, db: Db, jobs: TranscriptionJobs): Router {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.maxUploadMb * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      if (!ALLOWED_EXTENSIONS.has(extensionOf(file.originalname))) {
        callback(
          new TranscriptionError(
            `Định dạng không được hỗ trợ. Chỉ chấp nhận: ${[...ALLOWED_EXTENSIONS].join(', ')}.`,
          ),
        );
        return;
      }
      callback(null, true);
    },
  });

  const router = Router();

  /**
   * Accepts the upload and returns 202 right away with the new library entry
   * (status "processing"); transcription continues in the background and the
   * client polls GET /api/recordings/:id for progress.
   */
  router.post('/', (req: Request, res: Response) => {
    upload.single('audio')(req, res, async (uploadErr: unknown) => {
      if (uploadErr) {
        if (uploadErr instanceof TranscriptionError) {
          res.status(400).json({ error: uploadErr.message });
          return;
        }
        if (uploadErr instanceof multer.MulterError && uploadErr.code === 'LIMIT_FILE_SIZE') {
          res
            .status(413)
            .json({ error: `File vượt quá dung lượng tối đa ${config.maxUploadMb}MB.` });
          return;
        }
        res.status(400).json({ error: 'Không đọc được file tải lên.' });
        return;
      }

      const uploaded = req.file;
      if (!uploaded) {
        res.status(400).json({ error: 'Thiếu file âm thanh (field "audio").' });
        return;
      }
      const file = { ...uploaded, originalname: fixFilenameEncoding(uploaded.originalname) };

      try {
        const userId = userIdOf(res);

        const folderRaw = req.body.folder_id;
        let folderId: string | null = null;
        if (typeof folderRaw === 'string' && folderRaw.trim() !== '') {
          const owns = isUuid(folderRaw)
            ? await db.query('SELECT 1 FROM folders WHERE id = $1 AND user_id = $2', [
                folderRaw,
                userId,
              ])
            : null;
          if (!owns?.rowCount) {
            res.status(400).json({ error: 'Thư mục không tồn tại.' });
            return;
          }
          folderId = folderRaw;
        }

        const active = await db.query<{ count: string }>(
          `SELECT count(*) AS count FROM recordings WHERE user_id = $1 AND status = 'processing'`,
          [userId],
        );
        if (Number(active.rows[0]!.count) >= MAX_ACTIVE_PER_USER) {
          res.status(429).json({
            error: `Bạn đang có ${MAX_ACTIVE_PER_USER} bản ghi đang xử lý. Vui lòng đợi một bản hoàn tất rồi tải thêm.`,
          });
          return;
        }

        const numSpeakersRaw = req.body.num_speakers;
        const parsedSpeakers =
          typeof numSpeakersRaw === 'string' && numSpeakersRaw.trim() !== ''
            ? Number.parseInt(numSpeakersRaw, 10)
            : undefined;
        const numSpeakers =
          parsedSpeakers !== undefined && Number.isFinite(parsedSpeakers) && parsedSpeakers > 0
            ? parsedSpeakers
            : undefined;

        const titleRaw = typeof req.body.title === 'string' ? req.body.title.trim() : '';
        const title = (titleRaw || file.originalname.replace(/\.[^.]+$/, '') || 'Bản ghi').slice(
          0,
          200,
        );

        const pending = await insertPendingRecording(db, {
          userId,
          folderId,
          title,
          fileName: file.originalname,
        });
        const audioPath = join(
          UPLOAD_DIR,
          `${randomUUID()}${extname(file.originalname).toLowerCase()}`,
        );
        await writeFile(audioPath, file.buffer);
        jobs.enqueue({
          recordingId: pending.id,
          audioPath,
          fileName: file.originalname,
          numSpeakers,
        });

        res.status(202).json(toDetailDto(pending));
      } catch (err) {
        console.error('[POST /api/transcribe] unexpected error:', err);
        res.status(500).json({ error: 'Không nhận được file tải lên. Vui lòng thử lại.' });
      }
    });
  });

  return router;
}
