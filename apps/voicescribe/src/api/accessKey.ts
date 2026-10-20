import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Optional shared-secret gate for /api. Every transcription spends the
 * owner's Hugging Face quota, so a public deployment should set ACCESS_KEY.
 * Unset (local dev) leaves the API open.
 */
export function requireAccessKey(accessKey: string | undefined) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!accessKey) {
      next();
      return;
    }
    const provided = req.header('x-access-key') ?? '';
    if (!safeEqual(provided, accessKey)) {
      res.status(401).json({ error: 'Thiếu hoặc sai khóa truy cập.' });
      return;
    }
    next();
  };
}
