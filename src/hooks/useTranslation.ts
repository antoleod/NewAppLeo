import { useLocale } from '@/context/LocaleContext';
import { getTranslation, formatTranslation } from '@/lib/i18n';

/**
 * Hook to access translations in components
 * @example const t = useTranslation()
 * @example t('food.history')
 * @example t('greeting.morning')
 */
export function useTranslation() {
  const { language } = useLocale();

  return {
    /**
     * Get single translation
     */
    t: (key: string, defaultValue?: string) => getTranslation(language, key, defaultValue),

    /**
     * Format translation with variables
     */
    format: (key: string, variables?: Record<string, string | number>) =>
      formatTranslation(language, key, variables),

    /**
     * Get multiple translations at once
     */
    batch: (keys: string[]) => {
      return keys.reduce(
        (acc, key) => {
          acc[key] = getTranslation(language, key);
          return acc;
        },
        {} as Record<string, string>
      );
    },

    /**
     * Current language
     */
    language,
  };
}
