import { createHashRouter } from 'react-router-dom';
import { AppShell } from './AppShell';
import { PlaceholderPage } from '../pages/PlaceholderPage';
import { DashboardPage } from '../pages/Dashboard/DashboardPage';
import { APP_ROUTES } from './routes';

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
      // Each route gets a real page as its Phase lands; until then it
      // falls back to PlaceholderPage. routes.ts's path/label/group/icon
      // never change when a route graduates from placeholder to real.
      element:
        route.path === '/' ? (
          <DashboardPage />
        ) : (
          <PlaceholderPage title={route.label} phase={route.phase} />
        ),
    })),
  },
]);
