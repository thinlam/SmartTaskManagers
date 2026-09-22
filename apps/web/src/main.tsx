import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { configureApiClient } from '@stm/api-client';
import { App, getStoredServerUrl } from '@stm/app-core';
import './index.css';

configureApiClient({ baseUrl: getStoredServerUrl() });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
