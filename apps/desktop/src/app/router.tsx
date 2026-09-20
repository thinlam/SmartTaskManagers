import type { ReactNode } from 'react';
import { createHashRouter } from 'react-router-dom';
import { AppShell } from './AppShell';
import { PlaceholderPage } from '../pages/PlaceholderPage';
import { DashboardPage } from '../pages/Dashboard/DashboardPage';
import { TodayPage } from '../pages/Today/TodayPage';
import { APP_ROUTES } from './routes';

/**
 * Each route gets a real page as its Phase lands; until then it falls
 * back to PlaceholderPage. routes.ts's path/label/group/icon never
 * change when a route graduates from placeholder to real — only this
 * map does.
 */
const PAGE_BY_PATH: Record<string, ReactNode> = {
  '/': <DashboardPage />,
  '/today': <TodayPage />,
};

/**
 * HashRouter, not BrowserRouter: the packaged Tauri app has no server to
 * fall back arbitrary paths to index.html, so a deep link or a refresh on
 * e.g. /tasks would 404 with history-API routing. Hash routes (#/tasks)
 * always resolve to the same loaded document regardless of how it's
 * served, in dev and in the packaged build alike.
 */
export const router = createHashRouter([
  {
    element: <AppShell />,
    children: APP_ROUTES.map((route) => ({
      path: route.path,
      element: PAGE_BY_PATH[route.path] ?? (
        <PlaceholderPage title={route.label} phase={route.phase} />
      ),
    })),
  },
]);
