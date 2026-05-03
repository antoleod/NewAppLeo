import seasonalFoodsData from '@/data/seasonal-foods.json';

export interface SeasonalFood {
  name: string;
  en: string;
  icon: string;
}

export interface SeasonData {
  months: number[];
  season_es: string;
  season_en: string;
  season_fr: string;
  emoji: string;
  fruits: SeasonalFood[];
  vegetables: SeasonalFood[];
  benefits: string;
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

function getCurrentSeason(): Season {
  const month = new Date().getMonth() + 1; // getMonth() returns 0-11, we need 1-12

  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

function getSeasonByMonth(month: number): Season {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

export function getSeasonalRecommendations(season?: Season): SeasonData | null {
  const targetSeason = season || getCurrentSeason();
  const seasons = seasonalFoodsData.seasons as Record<Season, SeasonData>;
  return seasons[targetSeason] || null;
}

export function getCurrentSeasonalRecommendations(): SeasonData | null {
  return getSeasonalRecommendations();
}

export function getSeasonLabel(language: 'es' | 'en' | 'fr' = 'en', season?: Season): string {
  const targetSeason = season || getCurrentSeason();
  const rec = getSeasonalRecommendations(targetSeason);
  if (!rec) return '';

  switch (language) {
    case 'es':
      return rec.season_es;
    case 'fr':
      return rec.season_fr;
    default:
      return rec.season_en;
  }
}

export function getRandomSeasonalFruit(season?: Season): SeasonalFood | null {
  const rec = getSeasonalRecommendations(season);
  if (!rec || rec.fruits.length === 0) return null;
  return rec.fruits[Math.floor(Math.random() * rec.fruits.length)];
}

export function getRandomSeasonalVegetable(season?: Season): SeasonalFood | null {
  const rec = getSeasonalRecommendations(season);
  if (!rec || rec.vegetables.length === 0) return null;
  return rec.vegetables[Math.floor(Math.random() * rec.vegetables.length)];
}

export function getAllSeasonalFruits(season?: Season): SeasonalFood[] {
  const rec = getSeasonalRecommendations(season);
  return rec?.fruits || [];
}

export function getAllSeasonalVegetables(season?: Season): SeasonalFood[] {
  const rec = getSeasonalRecommendations(season);
  return rec?.vegetables || [];
}

export function getSeasonBenefits(language: 'es' | 'en' | 'fr' = 'en', season?: Season): string {
  const rec = getSeasonalRecommendations(season);
  return rec?.benefits || '';
}

export function getSeasonEmoji(season?: Season): string {
  const rec = getSeasonalRecommendations(season);
  return rec?.emoji || '';
}

export function isSeasonalFood(foodName: string, season?: Season): boolean {
  const rec = getSeasonalRecommendations(season);
  if (!rec) return false;

  const allFoods = [
    ...rec.fruits.map((f) => f.name.toLowerCase()),
    ...rec.vegetables.map((v) => v.name.toLowerCase()),
  ];

  return allFoods.includes(foodName.toLowerCase());
}
