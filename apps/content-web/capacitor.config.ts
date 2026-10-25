import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Wraps the same `apps/content-web` build into native Android/iOS shells
 * (HashRouter, so no server is needed behind the WebView). The backend URL
 * is entered on the login screen ("Máy chủ"); on an Android emulator the
 * host machine's localhost is http://10.0.2.2:5290.
 */
const config: CapacitorConfig = {
  appId: 'com.contentmanager.app',
  appName: 'Content Manager',
  webDir: 'dist',
  server: { androidScheme: 'https', cleartext: true },
};

export default config;
