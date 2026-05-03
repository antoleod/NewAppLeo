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

