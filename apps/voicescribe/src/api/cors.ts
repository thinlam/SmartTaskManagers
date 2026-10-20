import type { NextFunction, Request, Response } from 'express';

// The browser build is same-origin; only the Tauri desktop shell calls this
// API cross-origin (WebView2 uses http://tauri.localhost, macOS/Linux tauri://localhost).
const DESKTOP_ORIGINS = new Set([
  'http://tauri.localhost',
  'https://tauri.localhost',
  'tauri://localhost',
]);

export function allowDesktopOrigins(req: Request, res: Response, next: NextFunction): void {
  const origin = req.header('origin');
  if (origin && DESKTOP_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'x-access-key, content-type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
  }
  next();
}
