import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { transcribeLongAudio } from '../services/longAudioTranscription.js';
import { diarizeAudio } from '../services/diarization.js';
import { mergeTranscriptWithSpeakers } from '../utils/mergeSpeakers.js';
import { TranscriptionError } from '../types/transcription.js';
import type { AppConfig } from '../config/env.js';
import type { Db } from '../db/pool.js';
import { userIdOf } from '../auth/middleware.js';
import { insertRecording, toDetailDto } from '../services/recordings.js';
import { isUuid } from '../utils/validation.js';

const ALLOWED_EXTENSIONS = new Set(['mp3', 'm4a', 'wav', 'mp4', 'webm']);

function extensionOf(fileName: string): string {
  return fileName.toLowerCase().split('.').pop() ?? '';
}

export function createTranscribeRouter(config: AppConfig, db: Db): Router {
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

  router.post('/', (req: Request, res: Response) => {
    upload.single('audio')(req, res, async (uploadErr: unknown) => {
      if (uploadErr) {
        if (uploadErr instanceof TranscriptionError) {
          res.status(400).json({ error: uploadErr.message });
          return;
        }
        if (uploadErr instanceof multer.MulterError && uploadErr.code === 'LIMIT_FILE_SIZE') {
          res.status(413).json({ error: `File vượt quá dung lượng tối đa ${config.maxUploadMb}MB.` });
          return;
        }
        res.status(400).json({ error: 'Không đọc được file tải lên.' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'Thiếu file âm thanh (field "audio").' });
        return;
      }

      const numSpeakersRaw = req.body.num_speakers;
      const numSpeakers =
        typeof numSpeakersRaw === 'string' && numSpeakersRaw.trim() !== ''
          ? Number.parseInt(numSpeakersRaw, 10)
          : undefined;

      // Validate the destination folder before spending the (slow, quota-metered) transcription.
      const userId = userIdOf(res);
      const folderRaw = req.body.folder_id;
      let folderId: string | null = null;
      if (typeof folderRaw === 'string' && folderRaw.trim() !== '') {
        const owns = isUuid(folderRaw)
          ? await db.query('SELECT 1 FROM folders WHERE id = $1 AND user_id = $2', [folderRaw, userId])
          : null;
        if (!owns?.rowCount) {
          res.status(400).json({ error: 'Thư mục không tồn tại.' });
          return;
        }
        folderId = folderRaw;
      }
      const titleRaw = typeof req.body.title === 'string' ? req.body.title.trim() : '';
      const title = (titleRaw || req.file.originalname.replace(/\.[^.]+$/, '') || 'Bản ghi').slice(0, 200);

      try {
        const result = await transcribeLongAudio({
          hfToken: config.hfToken,
          audio: req.file.buffer,
          fileName: req.file.originalname,
        });

        // Diarization is best-effort: a sidecar that isn't running (or
        // fails for this file) shouldn't block the transcript the user
        // actually asked for — fall back to a single "Người nói 1"
        // label and report the failure separately instead.
        let diarizationError: string | null = null;
        let labeledSegments;
        if (!config.diarizationEnabled) {
          labeledSegments = result.segments.map((seg) => ({ ...seg, speaker: 'Người nói 1' }));
        } else {
          try {
            const speakerSegments = await diarizeAudio({
              audio: req.file.buffer,
              fileName: req.file.originalname,
              numSpeakers,
            });
            labeledSegments = mergeTranscriptWithSpeakers(result.segments, speakerSegments);
          } catch (err) {
            diarizationError =
              err instanceof TranscriptionError
                ? err.message
                : 'Lỗi không xác định khi nhận dạng người nói.';
            labeledSegments = result.segments.map((seg) => ({ ...seg, speaker: 'Người nói 1' }));
          }
        }

        const saved = await insertRecording(db, {
          userId,
          folderId,
          title,
          fileName: req.file.originalname,
          text: result.text,
          segments: labeledSegments,
          processingMs: result.processingTimeMs,
          diarizationError,
        });
        res.status(201).json(toDetailDto(saved));
      } catch (err) {
        if (err instanceof TranscriptionError) {
          res.status(502).json({ error: err.message });
          return;
        }
        console.error('[POST /api/transcribe] unexpected error:', err);
        res.status(500).json({ error: 'Đã xảy ra lỗi không xác định khi xử lý âm thanh.' });
      }
    });
  });

  return router;
}
