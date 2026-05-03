/**
 * WHO Growth Standards - Recomendaciones de peso y talla por edad
 * Basado en datos de la OMS para bebés sanos
 * Incluye percentiles 50 (mediana) para proporcionar referencias amigables
 */

export interface WHORecommendation {
  ageMonths: number;
  ageLabel: string;
  weight: {
    min: number; // Percentil 5
    median: number; // Percentil 50
    max: number; // Percentil 95
  };
  height: {
    min: number; // Percentil 5
    median: number; // Percentil 50
    max: number; // Percentil 95
  };
  positiveMessage: string;
}

const WHO_DATA: WHORecommendation[] = [
  {
    ageMonths: 0,
    ageLabel: 'Recién nacido',
    weight: { min: 2.5, median: 3.3, max: 4.3 },
    height: { min: 46.5, median: 49.5, max: 52.0 },
    positiveMessage: '¡Bienvenida! Cada bebé es único 💚',
  },
  {
    ageMonths: 1,
    ageLabel: '1 mes',
    weight: { min: 3.3, median: 4.3, max: 5.4 },
    height: { min: 50.0, median: 53.5, max: 56.5 },
    positiveMessage: '¡Crecimiento rápido! Tu bebé está hermoso 💚',
  },
  {
    ageMonths: 2,
    ageLabel: '2 meses',
    weight: { min: 4.0, median: 5.1, max: 6.3 },
    height: { min: 53.0, median: 56.7, max: 59.9 },
    positiveMessage: '¡Qué rápido crece! Estás haciendo un trabajo increíble 💚',
  },
  {
    ageMonths: 3,
    ageLabel: '3 meses',
    weight: { min: 4.5, median: 5.9, max: 7.2 },
    height: { min: 55.5, median: 59.2, max: 62.4 },
    positiveMessage: 'Desarrollo perfecto, ¡sigue así! 💚',
  },
  {
    ageMonths: 4,
    ageLabel: '4 meses',
    weight: { min: 5.1, median: 6.6, max: 8.0 },
    height: { min: 57.8, median: 61.6, max: 64.9 },
    positiveMessage: '¡A la mitad del primer semestre! Increíble progreso 💚',
  },
  {
    ageMonths: 5,
    ageLabel: '5 meses',
    weight: { min: 5.6, median: 7.2, max: 8.6 },
    height: { min: 59.9, median: 63.7, max: 67.0 },
    positiveMessage: 'Cada día es una bendición, ¡tu bebé es perfecto! 💚',
  },
  {
    ageMonths: 6,
    ageLabel: '6 meses',
    weight: { min: 6.0, median: 7.8, max: 9.2 },
    height: { min: 61.9, median: 65.7, max: 68.9 },
    positiveMessage: '¡Medio año! Mira cuánto ha crecido tu bebé 💚',
  },
  {
    ageMonths: 9,
    ageLabel: '9 meses',
    weight: { min: 6.7, median: 8.7, max: 10.3 },
    height: { min: 66.7, median: 70.6, max: 73.8 },
    positiveMessage: '¡Casi el primer año! Eres una mamá/papá maravilloso 💚',
  },
  {
    ageMonths: 12,
    ageLabel: '12 meses',
    weight: { min: 7.0, median: 9.3, max: 11.0 },
    height: { min: 69.9, median: 73.7, max: 77.0 },
    positiveMessage: '¡Un año! Celebra todo lo que has logrado juntos 💚',
  },
  {
    ageMonths: 18,
    ageLabel: '18 meses',
    weight: { min: 7.8, median: 10.5, max: 12.5 },
    height: { min: 75.3, median: 79.0, max: 82.4 },
    positiveMessage: 'Desarrollo increíble, ¡tu amor lo rodea! 💚',
  },
  {
    ageMonths: 24,
    ageLabel: '24 meses',
    weight: { min: 8.5, median: 11.8, max: 14.0 },
    height: { min: 80.0, median: 83.9, max: 87.2 },
    positiveMessage: '¡Dos años! Qué viaje maravilloso junto a tu bebé 💚',
  },
  {
    ageMonths: 36,
    ageLabel: '3 años',
    weight: { min: 9.9, median: 13.8, max: 16.5 },
    height: { min: 88.3, median: 92.4, max: 96.1 },
    positiveMessage: '¡3 años! Un pequeñín increíblemente especial 💚',
  },
];

export function getAgeInMonths(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());

  // Ajustar si el día del mes aún no ha llegado
  if (today.getDate() < birth.getDate()) {
    months--;
  }

  return Math.max(0, months);
}

export function getWHORecommendation(birthDate: string): WHORecommendation | null {
  const ageMonths = getAgeInMonths(birthDate);

  // Buscar recomendación exacta o la más cercana
  if (ageMonths <= 0) return WHO_DATA[0];
  if (ageMonths >= 36) return WHO_DATA[WHO_DATA.length - 1];

  // Encontrar la recomendación más cercana
  let closest = WHO_DATA[0];
  for (const rec of WHO_DATA) {
    if (rec.ageMonths <= ageMonths && rec.ageMonths > closest.ageMonths) {
      closest = rec;
    }
  }

  return closest;
}

export function getWeightCategory(weight: number, birthDate: string): {
  category: 'low' | 'healthy' | 'high';
  message: string;
  emoji: string;
} {
  const rec = getWHORecommendation(birthDate);
  if (!rec) {
    return { category: 'healthy', message: 'Cada bebé es único', emoji: '💚' };
  }

  if (weight < rec.weight.min) {
    return {
      category: 'low',
      message: `Un poquito más bajo de lo esperado para su edad. Consulta con tu pediatra si tienes preocupaciones 💙`,
      emoji: '👶',
    };
  } else if (weight > rec.weight.max) {
    return {
      category: 'high',
      message: `Un poquito más alto de lo esperado para su edad. Normal en bebés muy activos 💪`,
      emoji: '🎉',
    };
  } else {
    return {
      category: 'healthy',
      message: `¡Perfecto! Tu bebé está en un rango muy saludable 💚`,
      emoji: '✨',
    };
  }
}

export function getHeightCategory(height: number, birthDate: string): {
  category: 'low' | 'healthy' | 'high';
  message: string;
  emoji: string;
} {
  const rec = getWHORecommendation(birthDate);
  if (!rec) {
    return { category: 'healthy', message: 'Cada bebé es único', emoji: '💚' };
  }

  if (height < rec.height.min) {
    return {
      category: 'low',
      message: `Un poquito más bajito de lo esperado para su edad. Consulta con tu pediatra si tienes preocupaciones 💙`,
      emoji: '👶',
    };
  } else if (height > rec.height.max) {
    return {
      category: 'high',
      message: `¡Qué niño/a tan alto/a! Tendrá un gran futuro 🏀`,
      emoji: '🎉',
    };
  } else {
    return {
      category: 'healthy',
      message: `¡Perfecto! Tu bebé está creciendo hermosamente 💚`,
      emoji: '✨',
    };
  }
}

export function getSuggestedValues(birthDate: string): {
  weight: { value: number; min: number; max: number };
  height: { value: number; min: number; max: number };
  message: string;
} {
  const rec = getWHORecommendation(birthDate);
  if (!rec) {
    return {
      weight: { value: 0, min: 0, max: 0 },
      height: { value: 0, min: 0, max: 0 },
      message: 'Edad desconocida',
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
    message: rec.positiveMessage,
  };
}

export const WHO_RECOMMENDATIONS = WHO_DATA;
