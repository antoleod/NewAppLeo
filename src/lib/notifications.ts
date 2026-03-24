import { EntryRecord } from '@/types';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getMeanFeedingInterval } from './patterns';

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

function parseTime(value: string) {
  const [hourRaw, minuteRaw] = value.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  return {
    hour: Number.isFinite(hour) ? Math.min(23, Math.max(0, hour)) : 22,
    minute: Number.isFinite(minute) ? Math.min(59, Math.max(0, minute)) : 0,
  };
}

export async function requestNotificationPermissions() {
  if (Platform.OS === 'web') {
    return 'granted';
  }
  const result = await Notifications.requestPermissionsAsync();
  return result.status;
}

export async function scheduleDailySummary(time = '22:00', summary = 'Daily summary will appear here.') {
  if (Platform.OS === 'web') {
    return { scheduled: true, time, platform: 'web' };
  }

  const status = await requestNotificationPermissions();
  if (status !== 'granted') {
    throw new Error('Notification permissions were not granted.');
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-summary', {
      name: 'Daily summary',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { hour, minute } = parseTime(time);
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'App Leo',
      body: summary,
      sound: true,
    },
    trigger: { hour, minute, repeats: true } as any,
  });

  return { scheduled: true, time, id };
}
