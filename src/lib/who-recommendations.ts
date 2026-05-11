/**
 * WHO Growth Standards - Weight and height recommendations by age
 * Based on WHO data for healthy babies
 * Includes 50th percentile (median) to provide friendly references
 */

export interface WHORecommendation {
  ageMonths: number;
  ageLabel: string;
  weight: {
    min: number; // Percentile 5
    median: number; // Percentile 50
    max: number; // Percentile 95
  };
  height: {
    min: number; // Percentile 5
    median: number; // Percentile 50
    max: number; // Percentile 95
  };
  messageKey: string;
}

const WHO_DATA: WHORecommendation[] = [
  {
    ageMonths: 0,
    ageLabel: 'Newborn',
    weight: { min: 2.5, median: 3.3, max: 4.3 },
    height: { min: 46.5, median: 49.5, max: 52.0 },
    messageKey: 'insights.whoNewborn',
  },
  {
    ageMonths: 1,
    ageLabel: '1 month',
    weight: { min: 3.3, median: 4.3, max: 5.4 },
    height: { min: 50.0, median: 53.5, max: 56.5 },
    messageKey: 'insights.who1month',
  },
  {
    ageMonths: 2,
    ageLabel: '2 months',
    weight: { min: 4.0, median: 5.1, max: 6.3 },
    height: { min: 53.0, median: 56.7, max: 59.9 },
    messageKey: 'insights.who2months',
  },
  {
    ageMonths: 3,
    ageLabel: '3 months',
    weight: { min: 4.5, median: 5.9, max: 7.2 },
    height: { min: 55.5, median: 59.2, max: 62.4 },
    messageKey: 'insights.who3months',
  },
  {
    ageMonths: 4,
    ageLabel: '4 months',
    weight: { min: 5.1, median: 6.6, max: 8.0 },
    height: { min: 57.8, median: 61.6, max: 64.9 },
    messageKey: 'insights.who4months',
  },
  {
    ageMonths: 5,
    ageLabel: '5 months',
    weight: { min: 5.6, median: 7.2, max: 8.6 },
    height: { min: 59.9, median: 63.7, max: 67.0 },
    messageKey: 'insights.who5months',
  },
  {
    ageMonths: 6,
    ageLabel: '6 months',
    weight: { min: 6.0, median: 7.8, max: 9.2 },
    height: { min: 61.9, median: 65.7, max: 68.9 },
    messageKey: 'insights.who6months',
  },
  {
    ageMonths: 9,
    ageLabel: '9 months',
    weight: { min: 6.7, median: 8.7, max: 10.3 },
    height: { min: 66.7, median: 70.6, max: 73.8 },
    messageKey: 'insights.who9months',
  },
  {
    ageMonths: 12,
    ageLabel: '12 months',
    weight: { min: 7.0, median: 9.3, max: 11.0 },
    height: { min: 69.9, median: 73.7, max: 77.0 },
    messageKey: 'insights.who12months',
  },
  {
    ageMonths: 18,
    ageLabel: '18 months',
    weight: { min: 7.8, median: 10.5, max: 12.5 },
    height: { min: 75.3, median: 79.0, max: 82.4 },
    messageKey: 'insights.who18months',
  },
  {
    ageMonths: 24,
    ageLabel: '24 months',
    weight: { min: 8.5, median: 11.8, max: 14.0 },
    height: { min: 80.0, median: 83.9, max: 87.2 },
    messageKey: 'insights.who24months',
  },
  {
    ageMonths: 36,
    ageLabel: '3 years',
    weight: { min: 9.9, median: 13.8, max: 16.5 },
    height: { min: 88.3, median: 92.4, max: 96.1 },
    messageKey: 'insights.who36months',
  },
];

export function getAgeInMonths(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());

  if (today.getDate() < birth.getDate()) {
    months--;
  }

  return Math.max(0, months);
}

export function getWHORecommendation(birthDate: string): WHORecommendation | null {
  const ageMonths = getAgeInMonths(birthDate);

  if (ageMonths <= 0) return WHO_DATA[0];
  if (ageMonths >= 36) return WHO_DATA[WHO_DATA.length - 1];

  let closest = WHO_DATA[0];
  for (const rec of WHO_DATA) {
    if (rec.ageMonths <= ageMonths && rec.ageMonths > closest.ageMonths) {
      closest = rec;
    }
  }

  return closest;
}

export function getWeightCategory(weight: number, birthDate: string, t: (key: string) => string): {
  category: 'low' | 'healthy' | 'high';
  message: string;
  emoji: string;
} {
  const rec = getWHORecommendation(birthDate);
  if (!rec) {
    return { category: 'healthy', message: t('insights.whoEachBabyUnique'), emoji: '💚' };
  }

  if (weight < rec.weight.min) {
    return {
      category: 'low',
      message: t('insights.whoWeightLow'),
      emoji: '👶',
    };
  } else if (weight > rec.weight.max) {
    return {
      category: 'high',
      message: t('insights.whoWeightHigh'),
      emoji: '🎉',
    };
  } else {
    return {
      category: 'healthy',
      message: t('insights.whoWeightHealthy'),
      emoji: '✨',
    };
  }
}

export function getHeightCategory(height: number, birthDate: string, t: (key: string) => string): {
  category: 'low' | 'healthy' | 'high';
  message: string;
  emoji: string;
} {
  const rec = getWHORecommendation(birthDate);
  if (!rec) {
    return { category: 'healthy', message: t('insights.whoEachBabyUnique'), emoji: '💚' };
  }

  if (height < rec.height.min) {
    return {
      category: 'low',
      message: t('insights.whoHeightLow'),
      emoji: '👶',
    };
  } else if (height > rec.height.max) {
    return {
      category: 'high',
      message: t('insights.whoHeightHigh'),
      emoji: '🎉',
    };
  } else {
    return {
      category: 'healthy',
      message: t('insights.whoHeightHealthy'),
      emoji: '✨',
    };
  }
}

export function getSuggestedValues(birthDate: string, t: (key: string) => string): {
  weight: { value: number; min: number; max: number };
  height: { value: number; min: number; max: number };
  message: string;
} {
  const rec = getWHORecommendation(birthDate);
  if (!rec) {
    return {
      weight: { value: 0, min: 0, max: 0 },
      height: { value: 0, min: 0, max: 0 },
      message: t('insights.whoUnknownAge'),
    };
  }

  return {
    weight: {
      value: rec.weight.median,
      min: rec.weight.min,
      max: rec.weight.max,
    },
    height: {
      value: rec.height.median,
      min: rec.height.min,
      max: rec.height.max,
    },
    message: t(rec.messageKey),
  };
}

export const WHO_RECOMMENDATIONS = WHO_DATA;
