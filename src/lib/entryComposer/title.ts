import type { EntryType } from '@/types';

type T = (key: string, defaultValue?: string) => string;

export type BuildTitleArgs = {
  type: EntryType;
  t: T;
  feedMode?: 'breast' | 'bottle';
  foodName?: string;
  medicationName?: string;
  milestoneTitle?: string;
  temperatureValue?: string;
  vaccineName?: string;
};

export function buildEntryTitle({
  type, t, feedMode, foodName, medicationName, milestoneTitle, temperatureValue, vaccineName,
}: BuildTitleArgs): string {
  switch (type) {
    case 'feed':
      return feedMode === 'bottle' ? t('entry.titleFeedBottle') : t('entry.titleFeedBreast');
    case 'food':
      return foodName || t('entry.titleFoodDefault');
    case 'sleep':
      return t('entry.titleSleep');
    case 'diaper':
      return t('diaper.title');
    case 'pump':
      return t('entry.titlePump');
    case 'measurement':
      return t('entry.measurement');
    case 'medication':
      return medicationName || t('entry.medicine');
    case 'milestone':
      return milestoneTitle || t('entry.titleMilestone');
    case 'symptom':
      return t('entry.symptoms');
    case 'temperature':
      return temperatureValue ? `${t('entry.temperature')}: ${temperatureValue}°C` : t('entry.titleTemperatureReading');
    case 'vaccine':
      return vaccineName || t('entry.vaccine');
  }
}
