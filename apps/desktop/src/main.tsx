import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { configureApiClient } from '@stm/api-client';
import App from './App';
import './index.css';

// Phase 27 — every @stm/api-client call reads this module-level base URL;
// VITE_API_URL lets a different machine/port override the default
// (backend/SmartTask.Api's own default, see Properties/launchSettings.json)
// without a code change.
configureApiClient({ baseUrl: import.meta.env.VITE_API_URL as string | undefined });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
