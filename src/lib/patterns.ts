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
  icon: string;
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
  const lastTemp = sorted.find((entry) => entry.type === 'temperature' || (entry.type === 'measurement' && entry.payload.tempC));

  const feedHours = hoursSince(lastFeed?.occurredAt);
  if (feedHours !== null && feedHours >= 3) {
    alerts.push({
      id: 'feed-due',
      title: 'Feeding due',
      body: `Last feed was ${Math.round(feedHours * 10) / 10}h ago.`,
      icon: '🍼',
      value: formatCompactHours(feedHours),
      statusLabel: 'overdue',
      tone: feedHours >= 4 ? 'danger' : 'warning',
      actionLabel: 'Log feed',
      targetType: 'feed',
    });
  }

  const sleepHours = hoursSince(lastSleep?.occurredAt);
  if (sleepHours !== null && sleepHours >= 6) {
    alerts.push({
      id: 'sleep-due',
      title: 'Nap check',
      body: profile?.babyName ? `${profile.babyName} has been awake for a while.` : 'Baby may be ready for a nap.',
      icon: '😴',
      value: 'Awake',
      statusLabel: 'active',
      tone: 'secondary',
      actionLabel: 'Log sleep',
      targetType: 'sleep',
    });
  }

  const medicationHours = hoursSince(lastMedication?.occurredAt);
  if (medicationHours !== null && medicationHours >= 6) {
    alerts.push({
      id: 'med-due',
      title: 'Medication review',
      body: 'Check if the next dose or follow-up is due.',
      icon: '💊',
      value: 'Due',
      statusLabel: 'pending',
      tone: 'danger',
      actionLabel: 'Log medication',
      targetType: 'medication',
    });
  }

  // Fever alert
  const tempC = lastTemp?.payload?.tempC;
  if (tempC !== undefined && tempC >= 38.0) {
    alerts.push({
      id: 'fever-alert',
      title: 'Fever detected',
      body: `Temperature is ${tempC.toFixed(1)}°C. Monitor closely and consult doctor if persists.`,
      icon: '🌡️',
      value: `${tempC.toFixed(1)}°C`,
      statusLabel: 'urgent',
      tone: 'danger',
      actionLabel: 'Log temperature',
      targetType: 'temperature',
    });
  }

  // Vaccine due alert
  const nextVaccine = sorted.find((entry) => entry.type === 'vaccine' && entry.payload.vaccineNextDueDate);
  if (nextVaccine?.payload?.vaccineNextDueDate) {
    const daysUntilDue = Math.ceil((new Date(nextVaccine.payload.vaccineNextDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilDue <= 7 && daysUntilDue > 0) {
      alerts.push({
        id: 'vaccine-due',
        title: 'Vaccine due soon',
        body: `${nextVaccine.payload.vaccineName} is due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}.`,
        icon: '💉',
        value: `In ${daysUntilDue}d`,
        statusLabel: 'upcoming',
        tone: 'warning',
        actionLabel: 'Schedule',
        targetType: 'vaccine',
      });
    } else if (daysUntilDue <= 0) {
      alerts.push({
        id: 'vaccine-overdue',
        title: 'Vaccine overdue',
        body: `${nextVaccine.payload.vaccineName} is overdue. Contact clinic to schedule.`,
        icon: '💉',
        value: 'Overdue',
        statusLabel: 'critical',
        tone: 'danger',
        actionLabel: 'Update',
        targetType: 'vaccine',
      });
    }
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
