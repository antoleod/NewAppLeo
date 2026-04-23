import { EntryRecord, UserProfile } from '@/types';

export function getMeanFeedingInterval(entries: EntryRecord[]) {
  const feeds = entries
    .filter((entry) => entry.type === 'feed')
    .map((entry) => new Date(entry.occurredAt).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  if (feeds.length < 2) return null;

  const intervals = feeds.slice(1).map((value, index) => value - feeds[index]);
  return intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
}

export interface SmartAlert {
  id: string;
  title: string;
  body: string;
  icon: 'nutrition-outline' | 'moon-outline' | 'medical-outline';
  value: string;
  statusLabel: string;
  tone: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  actionLabel?: string;
  targetType?: EntryRecord['type'];
}

function hoursSince(timestamp?: string) {
  if (!timestamp) return null;
  return (Date.now() - new Date(timestamp).getTime()) / 36e5;
}

export function buildSmartAlerts(entries: EntryRecord[], profile?: UserProfile | null): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const sorted = [...entries].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  const lastFeed = sorted.find((entry) => entry.type === 'feed');
  const lastSleep = sorted.find((entry) => entry.type === 'sleep');
  const lastMedication = sorted.find((entry) => entry.type === 'medication');

  const feedHours = hoursSince(lastFeed?.occurredAt);
  if (feedHours !== null && feedHours >= 3) {
    alerts.push({
      id: 'feed-due',
      title: 'Next feeding',
      body: `Last feed was ${Math.round(feedHours * 10) / 10}h ago.`,
      icon: 'nutrition-outline',
      value: formatCompactHours(feedHours),
      statusLabel: 'Due now',
      tone: feedHours >= 4 ? 'danger' : 'warning',
      actionLabel: 'Log feed',
      targetType: 'feed',
    });
  }

  const sleepHours = hoursSince(lastSleep?.occurredAt);
  if (sleepHours !== null && sleepHours >= 6) {
    alerts.push({
      id: 'sleep-due',
      title: 'Nap window',
      body: profile?.babyName ? `${profile.babyName} has been awake for a while.` : 'Baby may be ready for a nap.',
      icon: 'moon-outline',
      value: formatCompactHours(sleepHours),
      statusLabel: 'Awake time',
      tone: 'secondary',
      actionLabel: 'Log sleep',
      targetType: 'sleep',
    });
  }

  const medicationHours = hoursSince(lastMedication?.occurredAt);
  if (medicationHours !== null && medicationHours >= 6) {
    alerts.push({
      id: 'med-due',
      title: 'Medication',
      body: 'Check if the next dose or follow-up is due.',
      icon: 'medical-outline',
      value: formatCompactHours(medicationHours),
      statusLabel: 'Review due',
      tone: 'danger',
      actionLabel: 'Log medication',
      targetType: 'medication',
    });
  }

  return alerts.slice(0, 3);
}

function formatCompactHours(hours: number) {
  const totalMinutes = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
}
