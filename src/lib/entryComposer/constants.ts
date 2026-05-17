import type { Ionicons } from '@expo/vector-icons';
import type { EntryType } from '@/types';

export type MealTimeValue = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export const typeLabelsI18n: Record<EntryType, Record<string, string>> = {
  feed:        { fr: 'Biberon',    en: 'Feed',        es: 'Biberón',    nl: 'Voeding'  },
  food:        { fr: 'Repas',      en: 'Food',        es: 'Comida',     nl: 'Eten'     },
  sleep:       { fr: 'Sommeil',    en: 'Sleep',       es: 'Sueño',      nl: 'Slaap'    },
  diaper:      { fr: 'Couche',     en: 'Diaper',      es: 'Pañal',      nl: 'Luier'    },
  pump:        { fr: 'Tirage',     en: 'Pump',        es: 'Extracción', nl: 'Kolven'   },
  measurement: { fr: 'Mesure',     en: 'Measurement', es: 'Medición',   nl: 'Meting'   },
  medication:  { fr: 'Médicament', en: 'Medication',  es: 'Medicamento',nl: 'Medicijn' },
  milestone:   { fr: 'Étape',      en: 'Milestone',   es: 'Hito',       nl: 'Mijlpaal' },
  symptom:     { fr: 'Symptôme',   en: 'Symptom',     es: 'Síntoma',    nl: 'Symptoom' },
  temperature: { fr: 'Température',en: 'Temperature', es: 'Temperatura',nl: 'Temperatuur'},
  vaccine:     { fr: 'Vaccin',     en: 'Vaccine',     es: 'Vacuna',     nl: 'Vaccin'   },
};

export const symptomOptions = [
  { label: 'Irritable', value: 'irritable' },
  { label: 'Cry', value: 'cry' },
  { label: 'Green stool', value: 'green stool' },
  { label: 'Colic', value: 'colic' },
];

export const vaccinePresets = ['BCG', 'Hepatitis B', 'DTP', 'Polio', 'MMR', 'Varicella', 'Rotavirus', 'PCV'];

export const foodPresets = [
  { icon: '🥣', value: 'puree', labels: { fr: 'Purée', en: 'Purée', es: 'Puré', nl: 'Puree' } },
  { icon: '🍎', value: 'fruit', labels: { fr: 'Fruit', en: 'Fruit', es: 'Fruta', nl: 'Fruit' } },
  { icon: '🌾', value: 'cereals', labels: { fr: 'Céréales', en: 'Cereals', es: 'Cereales', nl: 'Granen' } },
  { icon: '🥛', value: 'yogurt', labels: { fr: 'Yaourt', en: 'Yogurt', es: 'Yogur', nl: 'Yoghurt' } },
  { icon: '🥕', value: 'vegetables', labels: { fr: 'Légumes', en: 'Veggies', es: 'Verduras', nl: 'Groenten' } },
  { icon: '💧', value: 'water', labels: { fr: 'Eau', en: 'Water', es: 'Agua', nl: 'Water' } },
];

export const mealTimes: {
  value: MealTimeValue;
  labels: Record<string, string>;
  startHour: number;
  endHour: number;
}[] = [
  { value: 'breakfast', labels: { fr: '🌅 Petit-déj', en: '🌅 Breakfast', es: '🌅 Desayuno', nl: '🌅 Ontbijt' }, startHour: 6, endHour: 10 },
  { value: 'lunch',     labels: { fr: '🌞 Déjeuner',  en: '🌞 Lunch',     es: '🌞 Almuerzo', nl: '🌞 Lunch' },  startHour: 11, endHour: 14 },
  { value: 'snack',     labels: { fr: '🍪 Goûter',    en: '🍪 Snack',     es: '🍪 Merienda', nl: '🍪 Snack' },  startHour: 15, endHour: 17 },
  { value: 'dinner',    labels: { fr: '🌙 Dîner',     en: '🌙 Dinner',    es: '🌙 Cena',      nl: '🌙 Diner' },  startHour: 18, endHour: 21 },
];

export const foodDefaultQuantities: Record<string, number> = {
  puree: 50,
  fruit: 40,
  cereals: 30,
  yogurt: 80,
  vegetables: 60,
  water: 100,
};

export type TypeMeta = {
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
  toneSoft: string;
};

export const typeMeta: Record<EntryType, TypeMeta> = {
  feed:        { icon: 'water-outline',        tone: '#C9A227', toneSoft: 'rgba(201,162,39,0.16)' },
  food:        { icon: 'restaurant-outline',   tone: '#F0B85A', toneSoft: 'rgba(240,184,90,0.16)' },
  sleep:       { icon: 'moon-outline',         tone: '#58A6FF', toneSoft: 'rgba(88,166,255,0.16)' },
  diaper:      { icon: 'happy-outline',        tone: '#E74C3C', toneSoft: 'rgba(231,76,60,0.16)'  },
  pump:        { icon: 'water',                tone: '#F778BA', toneSoft: 'rgba(247,120,186,0.16)'},
  measurement: { icon: 'resize-outline',       tone: '#A371F7', toneSoft: 'rgba(163,113,247,0.16)'},
  medication:  { icon: 'medkit-outline',       tone: '#7CC2FF', toneSoft: 'rgba(124,194,255,0.16)'},
  milestone:   { icon: 'sparkles-outline',     tone: '#D9B97D', toneSoft: 'rgba(217,185,125,0.16)'},
  symptom:     { icon: 'pulse-outline',        tone: '#8EB5EA', toneSoft: 'rgba(142,181,234,0.16)'},
  temperature: { icon: 'thermometer-outline',  tone: '#FF8A4C', toneSoft: 'rgba(255,138,76,0.16)' },
  vaccine:     { icon: 'medical-outline',      tone: '#3FB950', toneSoft: 'rgba(63,185,80,0.16)'  },
};
