import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { AppLanguage } from '@/types';
import { translate } from '@/lib/translations';

interface LocaleContextValue {
  language: AppLanguage;
  t: (key: string, fallback?: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const language = (profile?.language ?? 'fr') as AppLanguage;

  const value = useMemo<LocaleContextValue>(
    () => ({
      language,
      t: (key, fallback) => translate(language, key, fallback),
    }),
    [language],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used inside LocaleProvider');
  }
  return context;
}
