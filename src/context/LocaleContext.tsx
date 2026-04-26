import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { AppLanguage } from '@/types';
import { translate } from '@/lib/translations';
import { getAppSettings, updateAppSettings } from '@/lib/storage';

interface LocaleContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;
  t: (key: string, fallback?: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, guestMode, saveProfile } = useAuth();
  const [localLanguage, setLocalLanguage] = useState<AppLanguage>('en');

  const normalizeLanguage = (candidate: string | undefined | null): AppLanguage => (
    candidate === 'fr' || candidate === 'es' || candidate === 'en' || candidate === 'nl' ? candidate : 'en'
  );

  useEffect(() => {
    let mounted = true;
    const loadLanguage = async () => {
      const settings = await getAppSettings();
      const candidate = normalizeLanguage((profile?.language ?? settings.language ?? 'en') as AppLanguage);
      if (!mounted) return;
      setLocalLanguage(candidate);
    };
    void loadLanguage();
    return () => {
      mounted = false;
    };
  }, [profile?.language]);

  useEffect(() => {
    const nextLanguage = normalizeLanguage(profile?.language);
    if (profile?.language && nextLanguage !== localLanguage) {
      setLocalLanguage(nextLanguage);
    }
  }, [localLanguage, profile?.language]);

  const language = localLanguage;

  const value = useMemo<LocaleContextValue>(
    () => ({
      language,
      setLanguage: async (nextLanguage) => {
        const normalizedLanguage = normalizeLanguage(nextLanguage);
        if (normalizedLanguage === language) return;

        setLocalLanguage(normalizedLanguage);

        try {
          await updateAppSettings({ language: normalizedLanguage });
          if (user || guestMode) {
            await saveProfile({ language: normalizedLanguage });
          }
        } catch (error) {
          console.warn('Failed to persist selected language:', error);
        }
      },
      t: (key, fallback) => translate(language, key, fallback),
    }),
    [guestMode, language, saveProfile, user],
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
