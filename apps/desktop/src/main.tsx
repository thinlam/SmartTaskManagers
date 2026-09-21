import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { configureApiClient } from '@stm/api-client';
import { getStoredServerUrl } from './lib/serverUrl';
import App from './App';
import './index.css';

// Every @stm/api-client call reads this module-level base URL.
// getStoredServerUrl() reads what the user set on LoginPage (persisted
// across restarts), falling back to VITE_API_URL (build-time) then
// localhost:5277 — see lib/serverUrl.ts's doc comment for why this needs
// to be runtime-configurable, not just a build-time env var.
configureApiClient({ baseUrl: getStoredServerUrl() });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
