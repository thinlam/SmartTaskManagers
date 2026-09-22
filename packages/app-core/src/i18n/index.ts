import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import vi from './locales/vi.json';

/**
 * Bundled statically at build time — only 2 languages, no runtime
 * fetch/lazy-load needed. AuthContext calls i18n.changeLanguage() once
 * the user's real preference is known (from the backend, or
 * localStorage before login).
 */
void i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    vi: { translation: vi },
  },
  lng: 'vi',
  fallbackLng: 'vi',
  interpolation: { escapeValue: false },
});

export default i18next;
