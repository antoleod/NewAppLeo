import { EntryRecord, UserProfile } from '@/types';
import { getEntrySubtitle, getEntryTitle } from '@/utils/entries';

export interface WidgetSnapshot {
  babyName: string;
  headline: string;
  subheadline: string;
  lastFeedLabel: string;
  lastDiaperLabel: string;
  sleepLabel: string;
  updatedAt: string;
}

function findLatestEntry(entries: EntryRecord[], type: EntryRecord['type']) {
  return entries.find((entry) => entry.type === type);
}

export function buildWidgetSnapshot({
  babyName,
  entries,
  summary,
  profile,
}: {
  babyName?: string;
  entries: EntryRecord[];
  summary: { today: { feedCount: number; bottleMl: number; sleepMinutes: number; diaperCount: number } };
  profile?: UserProfile | null;
}): WidgetSnapshot {
  const lastFeed = findLatestEntry(entries, 'feed');
  const lastDiaper = findLatestEntry(entries, 'diaper');
  const name = babyName ?? profile?.babyName ?? 'Baby';

  return {
    babyName: name,
    headline: `${summary.today.bottleMl} ml today`,
    subheadline: `${summary.today.feedCount} feeds, ${summary.today.diaperCount} diapers, ${summary.today.sleepMinutes} min sleep`,
    lastFeedLabel: lastFeed ? `${getEntryTitle(lastFeed)} · ${getEntrySubtitle(lastFeed)}` : 'No feed logged yet',
    lastDiaperLabel: lastDiaper ? `${getEntryTitle(lastDiaper)} · ${getEntrySubtitle(lastDiaper)}` : 'No diaper logged yet',
    sleepLabel: summary.today.sleepMinutes ? `${summary.today.sleepMinutes} min sleep today` : 'No sleep logged yet',
    updatedAt: new Date().toISOString(),
  };
}

export function formatWidgetLines(snapshot: WidgetSnapshot) {
  return [
    snapshot.babyName,
    snapshot.headline,
    snapshot.subheadline,
    snapshot.lastFeedLabel,
    snapshot.lastDiaperLabel,
    snapshot.sleepLabel,
  ];
}
