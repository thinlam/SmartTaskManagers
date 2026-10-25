import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from './token.js';

/** Id of the authenticated user; only valid behind requireAuth. */
export function userIdOf(res: Response): string {
  return res.locals.userId as string;
}

export function requireAuth(jwtSecret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.header('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const userId = token ? verifyToken(token, jwtSecret) : null;
    if (!userId) {
      res.status(401).json({ error: 'Bạn cần đăng nhập.' });
      return;
    }
    res.locals.userId = userId;
    next();
  };
}
