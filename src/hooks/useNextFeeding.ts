import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { useLocale } from '@/context/LocaleContext';

export type FeedingStatus = 'possible' | 'soon' | 'waiting';

function localeTag(language: string) {
  if (language === 'es') return 'es-ES';
  if (language === 'en') return 'en-US';
  if (language === 'nl') return 'nl-BE';
  return 'fr-FR';
}

function getNextFeedingState(lastOccurredAt?: string | null, locale: string = 'fr-FR') {
  if (!lastOccurredAt) {
    return { status: 'possible' as FeedingStatus, minutesAgo: 0, lastTime: null as string | null };
  }

  const diff = (Date.now() - new Date(lastOccurredAt).getTime()) / 60000;
  const lastTime = new Date(lastOccurredAt).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (diff >= 180) return { status: 'possible' as FeedingStatus, minutesAgo: Math.floor(diff), lastTime };
  if (diff >= 150) return { status: 'soon' as FeedingStatus, minutesAgo: Math.floor(diff), lastTime };
  return { status: 'waiting' as FeedingStatus, minutesAgo: Math.floor(diff), lastTime };
}

export function useNextFeeding() {
  const { entries } = useAppData();
  const { language } = useLocale();
  const lastFeed = useMemo(() => entries.find((entry) => entry.type === 'feed'), [entries]);
  const [minutesAgo, setMinutesAgo] = useState(0);
  const [status, setStatus] = useState<FeedingStatus>('waiting');
  const [lastTime, setLastTime] = useState<string | null>(null);

  useEffect(() => {
    const calculate = () => {
      const next = getNextFeedingState(lastFeed?.occurredAt, localeTag(language));
      setMinutesAgo(next.minutesAgo);
      setStatus(next.status);
      setLastTime(next.lastTime);
    };

    calculate();
    const interval = setInterval(calculate, 30000);
    return () => clearInterval(interval);
  }, [language, lastFeed?.occurredAt]);

  const hoursAgo = (minutesAgo / 60).toFixed(1);
  return { status, minutesAgo, hoursAgo, lastTime, lastFeed };
}
