import { type MealTimeValue } from './constants';

/**
 * Returns the meal-time bucket for the current hour. Buckets are contiguous
 * and cover all 24 hours so no hour (e.g. 10:30, 17:30, late night) falls
 * into a gap and gets mis-bucketed.
 */
export function getRecommendedMealTime(): MealTimeValue {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 14) return 'lunch';
  if (hour >= 14 && hour < 18) return 'snack';
  return 'dinner';
}
