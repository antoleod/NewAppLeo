import { useMemo } from 'react';
import { useLocale } from '@/context/LocaleContext';
import { getTranslation, formatTranslation } from '@/lib/i18n';

/**
 * Hook to access translations in components
 * @example const { t } = useTranslation()
 * @example t('food.history')
 * @example t('greeting.morning')
 *
 * Memoized on `language` so `t`/`format` keep a stable identity across renders
 * — that lets callers safely list them in effect/callback dependency arrays
 * (they only change when the language changes, which should re-run those).
 */
export function useTranslation() {
  const { language } = useLocale();

  return useMemo(
    () => ({
      /** Get single translation */
      t: (key: string, defaultValue?: string) => getTranslation(language, key, defaultValue),

      /** Format translation with variables */
      format: (key: string, variables?: Record<string, string | number>) =>
        formatTranslation(language, key, variables),

      /** Get multiple translations at once */
      batch: (keys: string[]) =>
        keys.reduce(
          (acc, key) => {
            acc[key] = getTranslation(language, key);
            return acc;
          },
          {} as Record<string, string>,
        ),

      /** Current language */
      language,
    }),
    [language],
  );
}
