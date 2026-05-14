import { mealTimes, type MealTimeValue } from './constants';

/** Returns the meal time bucket for the current hour, defaulting to `lunch`. */
export function getRecommendedMealTime(): MealTimeValue {
  const hour = new Date().getHours();
  const meal = mealTimes.find((m) => hour >= m.startHour && hour < m.endHour);
  return meal?.value ?? 'lunch';
}
