import { getAgeInMonths } from './who-recommendations';
import foodPortionsData from '@/data/food-portions.json';

export interface FoodPortionRecommendation {
  ageRange: string;
  ageMonths: string;
  maxMonths: number;
  description: string;
  daily_servings: number;
  serving_size_grams: number;
  notes: string;
  food_recommendations: Record<string, number>;
}

function getFoodRecommendationByAge(birthDate: string): FoodPortionRecommendation | null {
  const ageMonths = getAgeInMonths(birthDate);

  // Return null if baby is less than 6 months (no solid foods yet)
  if (ageMonths < 6) {
    return null;
  }

  // Find the appropriate recommendation based on age
  const recommendations = foodPortionsData.portions as FoodPortionRecommendation[];

  // Find the closest matching recommendation
  let closest = recommendations[0];
  for (const rec of recommendations) {
    if (rec.maxMonths <= ageMonths && rec.maxMonths > closest.maxMonths) {
      closest = rec;
    }
  }

  return closest;
}

export function getRecommendedQuantity(birthDate: string, foodType: string): number {
  const recommendation = getFoodRecommendationByAge(birthDate);

  if (!recommendation) {
    // Default quantities if no recommendation found
    const defaults: Record<string, number> = {
      puree: 50,
      fruit: 40,
      cereals: 30,
      yogurt: 80,
      vegetables: 60,
      water: 100,
    };
    return defaults[foodType] || 50;
  }

  return recommendation.food_recommendations[foodType] || 50;
}

export function getFoodRecommendation(birthDate: string): FoodPortionRecommendation | null {
  return getFoodRecommendationByAge(birthDate);
}

export function getFoodRecommendationMessage(birthDate: string): string {
  const ageMonths = getAgeInMonths(birthDate);

  if (ageMonths < 6) {
    return 'Solo leche materna o fórmula (< 6 meses)';
  }

  const recommendation = getFoodRecommendationByAge(birthDate);
  if (!recommendation) {
    return 'Edad desconocida';
  }

  return `${recommendation.ageRange}: ${recommendation.description}`;
}
