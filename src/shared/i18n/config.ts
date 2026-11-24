import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { LOCALES, type Locale } from '@/shared/lib/format';
import { en } from './resources/en';
import { ru } from './resources/ru';

export const LOCALE_STORAGE_KEY = 'portfolio-terminal:locale';

export const resources = { en: { translation: en }, ru: { translation: ru } } as const;

export function isLocale(value: unknown): value is Locale {
  return LOCALES.some((locale) => locale === value);
}

/** Сохранённый выбор, иначе язык браузера: `ru*` → ru, всё остальное → en. */
export function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // localStorage недоступен — определяем по браузеру.
  }
  const browser = typeof navigator === 'undefined' ? '' : navigator.language;
  return browser.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

function syncDocumentLanguage(locale: string): void {
  if (typeof document !== 'undefined') document.documentElement.lang = locale;
}

i18n.on('languageChanged', syncDocumentLanguage);

void i18n.use(initReactI18next).init({
  resources,
  lng: detectLocale(),
  fallbackLng: 'en',
  supportedLngs: [...LOCALES],
  interpolation: { escapeValue: false },
  returnNull: false,
  initAsync: false,
});
syncDocumentLanguage(i18n.language);

export async function changeLocale(locale: Locale): Promise<void> {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Выбор не переживёт перезагрузку, но язык сменится.
  }
  await i18n.changeLanguage(locale);
}

export { i18n };
