import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { configureApiClient } from '@stm/api-client';
import { getStoredServerUrl } from './lib/serverUrl';
import App from './App';
import './index.css';

// Every @stm/api-client call reads this module-level base URL.
// getStoredServerUrl() reads what the user set on LoginPage (persisted
// across restarts), falling back to VITE_API_BASE_URL (config/api.ts,
// build-time — required, fails loudly if unset) — see lib/serverUrl.ts's
// doc comment for why the runtime layer exists on top of the build-time
// config instead of using it directly everywhere.
configureApiClient({ baseUrl: getStoredServerUrl() });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
