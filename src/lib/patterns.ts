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
  const lastDiaper = sorted.find((entry) => entry.type === 'diaper');
  const lastMeasurement = sorted.find((entry) => entry.type === 'measurement');

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

  // Medication next-dose alert — works even without dosage field
  const recentMeds = sorted.filter((e) => {
    const h = hoursSince(e.occurredAt);
    return e.type === 'medication' && h !== null && h <= 36;
  });
  if (recentMeds.length > 0) {
    const latestMed = recentMeds[0];
    const medName = (latestMed.payload?.name ?? '').trim();
    const interval = getMedInterval(medName);
    const sinceHours = hoursSince(latestMed.occurredAt);
    if (sinceHours !== null && sinceHours >= interval * 0.85) {
      const remainMin = Math.max(0, Math.round((interval - sinceHours) * 60));
      const isOverdue = sinceHours >= interval;
      alerts.push({
        id: 'med-due',
        title: medName || 'Medication',
        body: isOverdue
          ? `Dose overdue by ${Math.round(sinceHours - interval)}h.`
          : `Next dose in ${remainMin} min.`,
        icon: '💊',
        value: isOverdue ? 'Overdue' : `${remainMin}m`,
        statusLabel: isOverdue ? 'overdue' : 'soon',
        tone: isOverdue ? 'danger' : 'warning',
        actionLabel: 'Log medication',
        targetType: 'medication',
      });
    }
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

  // Constipation alert - no poop in 24h+
  if (lastDiaper) {
    const lastPoopEntry = sorted.find((entry) => entry.type === 'diaper' && (entry.payload?.poop ?? 0) > 0);
    const poopHours = hoursSince(lastPoopEntry?.occurredAt);
    if (poopHours !== null && poopHours >= 24) {
      alerts.push({
        id: 'constipation-alert',
        title: 'No bowel movement',
        body: `No poop recorded in ${Math.floor(poopHours)}h. Monitor and ensure hydration.`,
        icon: '💚',
        value: `${Math.floor(poopHours)}h`,
        statusLabel: 'pending',
        tone: 'warning',
        actionLabel: 'Log diaper',
        targetType: 'diaper',
      });
    }
  }

  // Diarrhea alert - multiple poops in short time
  const diaperEntries24h = sorted.filter((entry) => {
    const hours = hoursSince(entry.occurredAt);
    return entry.type === 'diaper' && hours !== null && hours <= 24 && (entry.payload?.poop ?? 0) > 0;
  });
  if (diaperEntries24h.length >= 4) {
    alerts.push({
      id: 'diarrhea-alert',
      title: 'Frequent bowel movements',
      body: `${diaperEntries24h.length} bowel movements in last 24h. Monitor for dehydration.`,
      icon: '⚠️',
      value: `${diaperEntries24h.length}x`,
      statusLabel: 'pending',
      tone: 'warning',
      actionLabel: 'Log diaper',
      targetType: 'diaper',
    });
  }

  // Persistent symptom alert - same symptom >2 times in 7 days
  const symptomEntries7d = sorted.filter((entry) => {
    const days = hoursSince(entry.occurredAt) ?? 0;
    return entry.type === 'symptom' && days <= 168;
  });
  if (symptomEntries7d.length >= 2) {
    const symptomsCount: Record<string, number> = {};
    symptomEntries7d.forEach((entry) => {
      const tags = (entry.payload?.tags as string[]) ?? [];
      tags.forEach((tag) => {
        symptomsCount[tag] = (symptomsCount[tag] ?? 0) + 1;
      });
    });
    const persistentSymptom = Object.entries(symptomsCount).find(([, count]) => count >= 2);
    if (persistentSymptom) {
      alerts.push({
        id: 'persistent-symptom',
        title: 'Recurring symptom',
        body: `"${persistentSymptom[0]}" recorded ${persistentSymptom[1]} times in 7 days.`,
        icon: '🩺',
        value: `${persistentSymptom[1]}x`,
        statusLabel: 'pending',
        tone: 'secondary',
        actionLabel: 'View',
        targetType: 'symptom',
      });
    }
  }

  // Growth warning - weight/height outside WHO percentiles
  if (lastMeasurement?.payload?.weightKg) {
    const weightKg = lastMeasurement.payload.weightKg;
    const babyBirthDate = profile?.babyBirthDate;
    if (babyBirthDate) {
      const ageMonths = calculateAgeMonths(babyBirthDate);
      // Simple check: if weight is extremely low or high for age (very basic)
      const expectedMin = ageMonths < 6 ? 3.5 : ageMonths < 12 ? 6 : 8;
      const expectedMax = ageMonths < 6 ? 8 : ageMonths < 12 ? 11 : 14;
      if (weightKg < expectedMin) {
        alerts.push({
          id: 'weight-low',
          title: 'Low weight',
          body: `Weight is ${weightKg}kg, which is below expected range for age.`,
          icon: '📏',
          value: `${weightKg}kg`,
          statusLabel: 'attention',
          tone: 'warning',
          actionLabel: 'Log measurement',
          targetType: 'measurement',
        });
      } else if (weightKg > expectedMax) {
        alerts.push({
          id: 'weight-high',
          title: 'High weight',
          body: `Weight is ${weightKg}kg, which is above expected range for age.`,
          icon: '📏',
          value: `${weightKg}kg`,
          statusLabel: 'attention',
          tone: 'secondary',
          actionLabel: 'Log measurement',
          targetType: 'measurement',
        });
      }
    }
  }

  return alerts.slice(0, 3);
}

const MED_INTERVALS: Record<string, number> = {
  nurofen: 6,
  ibuprofen: 6,
  advil: 6,
  perdolan: 6,
  pardolan: 6,
  paracetamol: 6,
  doliprane: 6,
  efferalgan: 6,
  amoxicilline: 8,
  amoxicillin: 8,
  augmentin: 8,
  balso: 12,
  toplexil: 12,
};

function getMedInterval(name: string): number {
  const lower = name.toLowerCase();
  for (const [key, hours] of Object.entries(MED_INTERVALS)) {
    if (lower.includes(key)) return hours;
  }
  return 8;
}

function calculateAgeMonths(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  return (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
}

function formatCompactHours(hours: number) {
  const totalMinutes = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
}
