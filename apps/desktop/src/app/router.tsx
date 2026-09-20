import { createHashRouter } from 'react-router-dom';
import { AppShell } from './AppShell';
import { PlaceholderPage } from '../pages/PlaceholderPage';
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
      element: <PlaceholderPage title={route.label} phase={route.phase} />,
    })),
  },
]);
