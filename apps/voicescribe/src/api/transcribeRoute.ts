import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { transcribeLongAudio } from '../services/longAudioTranscription.js';
import { TranscriptionError } from '../types/transcription.js';
import type { AppConfig } from '../config/env.js';

const ALLOWED_EXTENSIONS = new Set(['mp3', 'm4a', 'wav', 'mp4', 'webm']);

function extensionOf(fileName: string): string {
  return fileName.toLowerCase().split('.').pop() ?? '';
}

export function createTranscribeRouter(config: AppConfig): Router {
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

  router.post('/transcribe', (req: Request, res: Response) => {
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

      try {
        const result = await transcribeLongAudio({
          hfToken: config.hfToken,
          audio: req.file.buffer,
          fileName: req.file.originalname,
        });
        res.status(200).json({
          text: result.text,
          segments: result.segments,
          processingTimeMs: result.processingTimeMs,
        });
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
