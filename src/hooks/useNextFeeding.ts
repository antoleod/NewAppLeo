import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { EntryRecord } from '@/types';
import { useFeedingSettings } from '@/hooks/useFeedingSettings';

export type FeedingStatus = 'possible' | 'soon' | 'waiting';

function localeTag(language: string) {
  if (language === 'es') return 'es-ES';
  if (language === 'en') return 'en-US';
  if (language === 'nl') return 'nl-BE';
  return 'fr-FR';
}

function formatDuration(totalMinutes: number): string {
  if (totalMinutes < 1) return '< 1 min';
  if (totalMinutes < 60) return `${Math.round(totalMinutes)} min`;
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h00`;
}

// Mean interval from last N feeds, filtering obvious outliers
function calcMeanIntervalMin(feedEntries: EntryRecord[]): number | null {
  const times = feedEntries
    .slice(0, 20)
    .map((e) => new Date(e.occurredAt).getTime())
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);

  if (times.length < 3) return null;

  const intervals = times.slice(1).map((t, i) => (t - times[i]) / 60000);
  const valid = intervals.filter((d) => d >= 30 && d <= 720); // 30 min – 12 h
  if (valid.length < 2) return null;

  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

// Age-appropriate OMS/WHO recommendation for formula-fed babies
function whoRecommendation(babyBirthDate?: string | null): { totalMlDay: number; perFeedMl: number; feedsPerDay: number } | null {
  if (!babyBirthDate) return null;
  const ageMonths =
    (Date.now() - new Date(babyBirthDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44);

  if (ageMonths < 1) return { totalMlDay: 450, perFeedMl: 60, feedsPerDay: 8 };
  if (ageMonths < 2) return { totalMlDay: 600, perFeedMl: 90, feedsPerDay: 7 };
  if (ageMonths < 4) return { totalMlDay: 750, perFeedMl: 120, feedsPerDay: 6 };
  if (ageMonths < 6) return { totalMlDay: 800, perFeedMl: 150, feedsPerDay: 5 };
  if (ageMonths < 9) return { totalMlDay: 650, perFeedMl: 170, feedsPerDay: 4 };  // solids starting
  if (ageMonths < 12) return { totalMlDay: 550, perFeedMl: 180, feedsPerDay: 3 };
  return { totalMlDay: 400, perFeedMl: 180, feedsPerDay: 2 };
}

// Suggest amount based on recent history, with OMS sanity-check
function calcRecommendedAmount(
  feedEntries: EntryRecord[],
  who: ReturnType<typeof whoRecommendation>,
): { min: number; max: number; avg: number } | null {
  const recent = feedEntries
    .slice(0, 8)
    .map((e) => e.payload?.amountMl ?? 0)
    .filter((ml) => ml > 20);

  if (recent.length < 2) {
    if (!who) return null;
    return { min: Math.round(who.perFeedMl * 0.8), max: Math.round(who.perFeedMl * 1.2), avg: who.perFeedMl };
  }

  const avg = recent.reduce((s, v) => s + v, 0) / recent.length;
  return {
    min: Math.round((avg * 0.85) / 10) * 10,
    max: Math.round((avg * 1.15) / 10) * 10,
    avg: Math.round(avg),
  };
}

export function useNextFeeding() {
  const { entries } = useAppData();
  const { profile } = useAuth();
  const { language } = useLocale();
  const locale = localeTag(language);
  const feedingCfg = useFeedingSettings();

  const feedEntries = useMemo(
    () => entries.filter((e) => e.type === 'feed').sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [entries],
  );

  // Food entries reset the countdown only when the parent has enabled the option
  const lastConsumed = useMemo(() => {
    const types = feedingCfg.foodCountsAsFeeding ? ['feed', 'food'] : ['feed'];
    const candidates = entries
      .filter((e) => types.includes(e.type))
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    return candidates[0] ?? null;
  }, [entries, feedingCfg.foodCountsAsFeeding]);

  const lastFeed = lastConsumed;

  const meanIntervalMin = useMemo(() => calcMeanIntervalMin(feedEntries), [feedEntries]);

  const who = useMemo(
    () => whoRecommendation(profile?.babyBirthDate),
    [profile?.babyBirthDate],
  );

  const recommendedAmount = useMemo(
    () => calcRecommendedAmount(feedEntries, who),
    [feedEntries, who],
  );

  const [minutesAgo, setMinutesAgo] = useState(0);
  const [status, setStatus] = useState<FeedingStatus>('waiting');
  const [lastTime, setLastTime] = useState<string | null>(null);
  const [nextFeedInMin, setNextFeedInMin] = useState<number | null>(null);

  useEffect(() => {
    const calculate = () => {
      if (!lastFeed?.occurredAt) {
        setStatus('possible');
        setMinutesAgo(0);
        setLastTime(null);
        setNextFeedInMin(null);
        return;
      }

      const diff = (Date.now() - new Date(lastFeed.occurredAt).getTime()) / 60000;
      const time = new Date(lastFeed.occurredAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

      setMinutesAgo(Math.floor(diff));
      setLastTime(time);

      // Base interval: custom override > learned mean > WHO recommendation.
      const whoIntervalMin = who ? Math.round((24 * 60) / who.feedsPerDay) : 180;
      const baseInterval = feedingCfg.customIntervalMin ?? meanIntervalMin ?? whoIntervalMin;
      let interval = baseInterval;

      if (lastFeed.type === 'food') {
        // Compare grams consumed to ml of an average bottle — same scale, same formula.
        //
        // actualGrams = grams served × how much was eaten:
        //   all=1.0, half=0.5, little=0.25, none=0.05
        //
        // refMl = running avg bottle (or WHO recommendation if no history).
        //
        // ratio = actualGrams / refMl  →  same [0.4, 1.5] clamp as bottles.
        //   160 g eaten, avg bottle 160 ml → ratio 1.0 → same wait as a full bottle.
        //    80 g eaten, avg bottle 160 ml → ratio 0.5 → half the wait.
        //     0 g eaten                   → ratio 0.05 → almost no delay (min 30 min).
        const eatFractions: Record<string, number> = { all: 1.0, half: 0.5, little: 0.25, none: 0.05 };
        const amountEaten = lastFeed.payload?.amountEaten as string | undefined;
        const eatFraction = amountEaten != null ? (eatFractions[amountEaten] ?? 0.6) : 0.6;
        const grams = (lastFeed.payload?.quantityGrams as number | undefined) ?? 0;
        const actualGrams = grams > 0 ? grams * eatFraction : 0;

        const refMl = feedingCfg.referenceMealGrams > 0
          ? feedingCfg.referenceMealGrams
          : (recommendedAmount?.avg ?? who?.perFeedMl ?? 150);
        if (actualGrams > 0) {
          const ratio = Math.min(1.5, Math.max(0.4, actualGrams / refMl));
          interval = Math.max(30, baseInterval * ratio);
        } else {
          // Only amountEaten known, no gram data — use fraction directly
          interval = Math.max(30, baseInterval * Math.min(1.5, Math.max(0.4, eatFraction)));
        }
      } else {
        // Bottle: scale interval by how full the feed was vs the running average.
        //  • Small feed (60ml when avg is 160ml) → ratio 0.4 → next feed sooner.
        //  • Large feed (220ml when avg is 160ml) → ratio 1.4 → wait longer.
        const lastAmount = lastFeed.payload?.amountMl ?? 0;
        if (lastAmount > 0 && recommendedAmount?.avg) {
          const ratio = Math.min(1.5, Math.max(0.4, lastAmount / recommendedAmount.avg));
          interval = baseInterval * ratio;
        }
      }

      const remaining = interval - diff;
      setNextFeedInMin(remaining);

      const pct = diff / interval;
      if (pct >= 1.0) setStatus('possible');
      else if (pct >= 0.82) setStatus('soon');
      else setStatus('waiting');
    };

    calculate();
    const timer = setInterval(calculate, 30000);
    return () => clearInterval(timer);
  }, [language, lastFeed?.occurredAt, lastFeed?.type, lastFeed?.payload?.amountMl, lastFeed?.payload?.amountEaten, lastFeed?.payload?.quantityGrams, locale, meanIntervalMin, recommendedAmount, who, feedingCfg]);

  // "1h55" style instead of "1.9 h"
  const hoursAgo = formatDuration(minutesAgo);

  // Countdown string: "dans 1h45" or "maintenant"
  const nextFeedLabel =
    nextFeedInMin === null
      ? null
      : nextFeedInMin <= 0
        ? null  // overdue — show "possible"
        : formatDuration(nextFeedInMin);

  return {
    status,
    minutesAgo,
    hoursAgo,
    lastTime,
    lastFeed,
    lastConsumedType: lastConsumed?.type ?? null,
    meanIntervalMin,
    nextFeedInMin,
    nextFeedLabel,
    recommendedAmount,
    who,
  };
}
