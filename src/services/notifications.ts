import { EntryRecord } from '@/types';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getMeanFeedingInterval } from '@/lib/patterns';

export function buildDailySummary(entries: EntryRecord[]) {
  const feeds = entries.filter((entry) => entry.type === 'feed').length;
  const sleep = entries
    .filter((entry) => entry.type === 'sleep')
    .reduce((sum, entry) => sum + (entry.payload.durationMin ?? 0), 0);
  const diapers = entries.filter((entry) => entry.type === 'diaper').length;
  return `Today: ${feeds} feeds, ${sleep} min sleep, ${diapers} diapers.`;
}

export function buildAdaptiveReminder(entries: EntryRecord[]) {
  const interval = getMeanFeedingInterval(entries);
  if (!interval) return 'Log a few feeds to predict the next one.';
  return `Next feed in about ${Math.max(1, Math.round(interval / 36e5))}h.`;
}


export async function requestNotificationPermissions() {
  if (Platform.OS === 'web') {
    return 'granted';
  }
  const result = await Notifications.requestPermissionsAsync();
  return result.status;
}


export async function scheduleMedicationReminder(
  entry: EntryRecord,
  babyName: string = 'Baby',
  intervalHours: number = 24,
) {
  try {
    if (Platform.OS === 'web') return;
    const nextDoseTime = new Date(entry.occurredAt).getTime() + Math.max(1, intervalHours) * 60 * 60 * 1000;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${entry.payload.name} - Next dose due`,
        body: `${entry.payload.dosage} for ${babyName}`,
        data: { type: 'medication', entryId: entry.id },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(nextDoseTime),
      },
    });
  } catch (error) {
    console.error('Failed to schedule medication reminder:', error);
  }
}

export async function scheduleVaccineReminder(vaccineName: string, nextDueDate: string, babyName: string = 'Baby') {
  try {
    if (Platform.OS === 'web') return;
    const dueDate = new Date(nextDueDate);
    const reminderDate = new Date(dueDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days before

    if (reminderDate > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${vaccineName} vaccine reminder`,
          body: `${babyName} is due for their ${vaccineName} vaccination in 7 days`,
          data: { type: 'vaccine', vaccineName },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderDate,
        },
      });
    }
  } catch (error) {
    console.error('Failed to schedule vaccine reminder:', error);
  }
}

export async function scheduleFeverAlert(tempC: number, babyName: string = 'Baby') {
  try {
    if (Platform.OS === 'web') return;
    if (tempC >= 38.0) {
      // Send immediate notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 Fever Detected',
          body: `${babyName}'s temperature is ${tempC.toFixed(1)}°C. Monitor and contact doctor if persists.`,
          data: { type: 'fever', temperature: tempC },
          sound: 'default',
        },
        trigger: null, // Send immediately
      });
    }
  } catch (error) {
    console.error('Failed to send fever alert:', error);
  }
}

export async function cancelAllReminders() {
  try {
    if (Platform.OS === 'web') return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Failed to cancel reminders:', error);
  }
}

export async function getAllScheduledNotifications() {
  try {
    if (Platform.OS === 'web') return [];
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Failed to get scheduled notifications:', error);
    return [];
  }
}
