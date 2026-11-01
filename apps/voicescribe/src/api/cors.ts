import type { NextFunction, Request, Response } from 'express';

// The browser build is same-origin; only the native shells call this API cross-origin:
// Tauri (WebView2 uses http://tauri.localhost, macOS/Linux tauri://localhost) and the
// Capacitor Android app (https://localhost with androidScheme "https").
const DESKTOP_ORIGINS = new Set([
  'http://tauri.localhost',
  'https://tauri.localhost',
  'tauri://localhost',
  'https://localhost',
  'capacitor://localhost',
]);

export function allowDesktopOrigins(req: Request, res: Response, next: NextFunction): void {
  const origin = req.header('origin');
  if (origin && DESKTOP_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
  }
  next();
}
