import type { NextFunction, Request, Response } from 'express';

/**
 * Small in-memory limiter for the credential endpoints. Per-process, which is
 * fine for a single Railway instance; use a shared store if this ever scales out.
 */
export function rateLimit(max: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = req.ip ?? 'unknown';
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      res.status(429).json({ error: 'Thử quá nhiều lần. Vui lòng đợi vài phút rồi thử lại.' });
      return;
    }
    recent.push(now);
    hits.set(key, recent);
    next();
  };
}
