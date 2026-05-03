import frJson from '@/locales/fr.json';
import esJson from '@/locales/es.json';
import enJson from '@/locales/en.json';
import nlJson from '@/locales/nl.json';
import { AppLanguage } from '@/types';

type Translations = Record<string, any>;

const translations: Record<AppLanguage, Translations> = {
  fr: frJson,
  es: esJson,
  en: enJson,
  nl: nlJson,
};

/**
 * Get translation value using dot notation
 * @example t('food.history') => 'HISTORIAL DE COMIDAS'
 * @example t('common.save') => 'Guardar'
 */
export function getTranslation(language: AppLanguage, key: string, defaultValue?: string): string {
  const keys = key.split('.');
  let current: any = translations[language] || translations.en;

  for (const k of keys) {
    current = current?.[k];
    if (!current) {
      return defaultValue || key;
    }
  }

  return typeof current === 'string' ? current : key;
}

/**
 * Helper to get all translations for a language
 */
export function getLanguageTranslations(language: AppLanguage): Translations {
  return translations[language] || translations.en;
}

/**
 * Batch get multiple translations
 * @example t(['food.history', 'common.save'])
 */
export function getTranslations(language: AppLanguage, keys: string[]): Record<string, string> {
  return keys.reduce(
    (acc, key) => {
      acc[key] = getTranslation(language, key);
      return acc;
    },
    {} as Record<string, string>
  );
}

/**
 * Format string with variables
 * @example t('greeting', { name: 'John' }) => 'Hello John'
 */
export function formatTranslation(
  language: AppLanguage,
  key: string,
  variables?: Record<string, string | number>
): string {
  let text = getTranslation(language, key);

  if (variables) {
    Object.entries(variables).forEach(([varKey, value]) => {
      text = text.replace(`{${varKey}}`, String(value));
    });
  }

  return text;
}
