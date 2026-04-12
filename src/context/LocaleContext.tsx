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
  const [localLanguage, setLocalLanguage] = useState<AppLanguage>('fr');

  useEffect(() => {
    let mounted = true;
    const loadLanguage = async () => {
      const settings = await getAppSettings();
      const candidate = (profile?.language ?? settings.language ?? 'en') as AppLanguage;
      if (!mounted) return;
      setLocalLanguage(candidate === 'fr' || candidate === 'es' || candidate === 'en' || candidate === 'nl' ? candidate : 'en');
    };
    void loadLanguage();
    return () => {
      mounted = false;
    };
  }, []);

  const language = (profile?.language ?? localLanguage ?? 'fr') as AppLanguage;

  const value = useMemo<LocaleContextValue>(
    () => ({
      language,
      setLanguage: async (nextLanguage) => {
        if (nextLanguage === language) return;
        await updateAppSettings({ language: nextLanguage });
        setLocalLanguage(nextLanguage);
        if (user || guestMode) {
          await saveProfile({ language: nextLanguage });
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
