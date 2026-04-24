import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Button, Card, Input, Page, Segment } from '@/components/ui';
import { MedicationPicker } from '@/components/MedicationPicker';
import { useTheme } from '@/context/ThemeContext';
import { useAppData } from '@/context/AppDataContext';
import { useLocale } from '@/context/LocaleContext';
import { useAuth } from '@/context/AuthContext';
import { clamp, isSameDay } from '@/utils/date';
import { BreastSide, EntryPayload, EntryRecord, EntryType } from '@/types';
import { TimerWidget } from '@/components/TimerWidget';
import { QuantityPicker } from '@/components/QuantityPicker';
import { DateTimeField } from '@/components/DateTimeField';
import {
  getAppSettings,
  getMedicationPresetsBySymptom,
  getSavedMedicines,
  getSavedMedicinesRanked,
  recordMedicineUse,
  upsertSavedMedicine,
  updateAppSettings,
  type AppSettings,
  type MedicationPreset,
  type SavedMedicine,
} from '@/lib/storage';
import { getCareStagePolicy, getSickChildStatus } from '@/lib/careGuidance';
import { triggerHaptic } from '@/lib/mobile';
import { getMedicationTimelineStatus } from '@/utils/entries';
import * as ImagePicker from 'expo-image-picker';

const typeLabels: Record<EntryType, string> = {
  feed: 'Feed',
  food: 'Food',
  sleep: 'Sleep',
  diaper: 'Diaper',
  pump: 'Pump',
  measurement: 'Measurement',
  medication: 'Medication',
  milestone: 'Milestone',
  symptom: 'Symptom',
};

const entryCopy = {
  en: {
    close: 'Close',
    composer: 'Composer',
    whenItHappened: 'When it happened',
    when: 'When',
    feedFlow: 'FEED FLOW',
    breastOrBottle: 'Breast or bottle',
    bottle: 'Bottle',
    breast: 'Breast',
    sessionBreast: 'Breast session',
    estimatedMl: 'Estimated ml',
    foodFlow: 'FOOD FLOW',
    mealsAndPortions: 'Meals and portions',
    foodName: 'Food name',
    quantity: 'Quantity',
    sleepFlow: 'SLEEP FLOW',
    durationAndRest: 'Duration and rest',
    sleep: 'Sleep',
    duration: 'Duration',
    nightNap: 'Night / nap',
    durationMin: 'Duration (min)',
    diaperFlow: 'DIAPER FLOW',
    quickCounts: 'Quick counts',
    pee: 'Pee',
    poop: 'Poop',
    vomit: 'Vomit',
    pumpFlow: 'PUMP FLOW',
    timerAmount: 'Timer + amount',
    pump: 'Pump',
    timer: 'Timer',
    amount: 'Amount',
    sessionPump: 'Pump session',
    measureFlow: 'MEASURE FLOW',
    growthAndSize: 'Growth and size',
    weightKg: 'Weight (kg)',
    heightCm: 'Height (cm)',
    headCirc: 'Head circumference (cm)',
    temperature: 'Temperature (C)',
    medicineFlow: 'MEDICINE FLOW',
    nameDosageContext: 'Name, dosage and context',
    savedMedicines: 'Saved medicines',
    noSavedMedicine: 'No saved medicine yet.',
    savePreset: 'Save as preset',
    medicationName: 'Medication name',
    usualDose: 'Usual dose',
    dosage: 'Dosage',
    milestoneFlow: 'MILESTONE FLOW',
    milestoneAndPhoto: 'Milestone and photo',
    title: 'Title',
    replacePhoto: 'Replace photo',
    attachPhoto: 'Attach photo',
    photoAttached: 'Photo attached.',
    symptomFlow: 'SYMPTOM FLOW',
    tagsAndNotes: 'Tags and notes',
    tags: 'Tags',
    addNote: '+ Add note',
    hideNote: '- Hide note',
    notes: 'Notes',
    optionalDetails: 'Optional details',
    updateEntry: 'Update entry',
    saveEntry: 'Save entry',
    deleteEntry: 'Delete entry',
    saveFailed: 'Save failed',
    saveFailedBody: 'Could not save this record.',
    edit: 'Edit',
    newEntry: 'New',
  },
  fr: {
    close: 'Fermer',
    composer: 'Composer',
    whenItHappened: 'Quand cela a eu lieu',
    when: 'Quand',
    feedFlow: 'FLUX TÉTÉE',
    breastOrBottle: 'Sein ou biberon',
    bottle: 'Biberon',
    breast: 'Sein',
    sessionBreast: 'Session sein',
    estimatedMl: 'Ml estimés',
    foodFlow: 'FLUX REPAS',
    mealsAndPortions: 'Repas et portions',
    foodName: "Nom de l'aliment",
    quantity: 'Quantité',
    sleepFlow: 'FLUX SOMMEIL',
    durationAndRest: 'Durée et repos',
    sleep: 'Sommeil',
    duration: 'Durée',
    nightNap: 'Nuit / sieste',
    durationMin: 'Durée (min)',
    diaperFlow: 'FLUX COUCHE',
    quickCounts: 'Comptages rapides',
    pee: 'Pipi',
    poop: 'Caca',
    vomit: 'Vomi',
    pumpFlow: 'FLUX TIRE-LAIT',
    timerAmount: 'Minuteur + quantité',
    pump: 'Tire-lait',
    timer: 'Minuteur',
    amount: 'Quantité',
    sessionPump: 'Session tire-lait',
    measureFlow: 'FLUX MESURE',
    growthAndSize: 'Croissance et taille',
    weightKg: 'Poids (kg)',
    heightCm: 'Taille (cm)',
    headCirc: 'Périmètre crânien (cm)',
    temperature: 'Température (C)',
    medicineFlow: 'FLUX MÉDICAMENT',
    nameDosageContext: 'Nom, dose et contexte',
    savedMedicines: 'Médicaments sauvegardés',
    noSavedMedicine: 'Aucun modèle gardé.',
    savePreset: 'Sauver en modèle',
    medicationName: 'Nom du médicament',
    usualDose: 'Dose habituelle',
    dosage: 'Dose',
    milestoneFlow: 'FLUX ÉTAPE',
    milestoneAndPhoto: 'Étape et photo',
    title: 'Titre',
    replacePhoto: 'Remplacer la photo',
    attachPhoto: 'Ajouter une photo',
    photoAttached: 'Photo jointe.',
    symptomFlow: 'FLUX SYMPTÔME',
    tagsAndNotes: 'Tags et notes',
    tags: 'Tags',
    addNote: '+ Ajouter une note',
    hideNote: '- Masquer la note',
    notes: 'Notes',
    optionalDetails: 'Détails optionnels',
    updateEntry: 'Mettre à jour',
    saveEntry: 'Enregistrer',
    deleteEntry: 'Supprimer',
    saveFailed: 'Échec de l’enregistrement',
    saveFailedBody: 'Impossible d’enregistrer cette entrée.',
    edit: 'Modifier',
    newEntry: 'Nouvelle',
  },
  es: {
    close: 'Cerrar',
    composer: 'Componer',
    whenItHappened: 'Cuándo ocurrió',
    when: 'Cuándo',
    feedFlow: 'FLUJO DE TOMA',
    breastOrBottle: 'Pecho o biberón',
    bottle: 'Biberón',
    breast: 'Pecho',
    sessionBreast: 'Sesión de pecho',
    estimatedMl: 'Ml estimados',
    foodFlow: 'FLUJO DE COMIDA',
    mealsAndPortions: 'Comidas y porciones',
    foodName: 'Nombre del alimento',
    quantity: 'Cantidad',
    sleepFlow: 'FLUJO DE SUEÑO',
    durationAndRest: 'Duración y descanso',
    sleep: 'Sueño',
    duration: 'Duración',
    nightNap: 'Noche / siesta',
    durationMin: 'Duración (min)',
    diaperFlow: 'FLUJO DE PAÑAL',
    quickCounts: 'Conteos rápidos',
    pee: 'Pipi',
    poop: 'Caca',
    vomit: 'Vómito',
    pumpFlow: 'FLUJO DE SACALECHE',
    timerAmount: 'Temporizador + cantidad',
    pump: 'Sacaleche',
    timer: 'Temporizador',
    amount: 'Cantidad',
    sessionPump: 'Sesión de sacaleche',
    measureFlow: 'FLUJO DE MEDICIÓN',
    growthAndSize: 'Crecimiento y tamaño',
    weightKg: 'Peso (kg)',
    heightCm: 'Altura (cm)',
    headCirc: 'Perímetro cefálico (cm)',
    temperature: 'Temperatura (C)',
    medicineFlow: 'FLUJO DE MEDICACIÓN',
    nameDosageContext: 'Nombre, dosis y contexto',
    savedMedicines: 'Medicamentos guardados',
    noSavedMedicine: 'Aún no hay medicamentos guardados.',
    savePreset: 'Guardar como modelo',
    medicationName: 'Nombre del medicamento',
    usualDose: 'Dosis habitual',
    dosage: 'Dosis',
    milestoneFlow: 'FLUJO DE HITO',
    milestoneAndPhoto: 'Hito y foto',
    title: 'Título',
    replacePhoto: 'Reemplazar foto',
    attachPhoto: 'Adjuntar foto',
    photoAttached: 'Foto adjuntada.',
    symptomFlow: 'FLUJO DE SÍNTOMA',
    tagsAndNotes: 'Etiquetas y notas',
    tags: 'Etiquetas',
    addNote: '+ Añadir nota',
    hideNote: '- Ocultar nota',
    notes: 'Notas',
    optionalDetails: 'Detalles opcionales',
    updateEntry: 'Actualizar entrada',
    saveEntry: 'Guardar entrada',
    deleteEntry: 'Eliminar entrada',
    saveFailed: 'Error al guardar',
    saveFailedBody: 'No se pudo guardar este registro.',
    edit: 'Editar',
    newEntry: 'Nuevo',
  },
  nl: {
    close: 'Sluiten',
    composer: 'Opstellen',
    whenItHappened: 'Wanneer het gebeurde',
    when: 'Wanneer',
    feedFlow: 'VOEDINGSSTROOM',
    breastOrBottle: 'Borstvoeding of fles',
    bottle: 'Fles',
    breast: 'Borstvoeding',
    sessionBreast: 'Borstvoedingssessie',
    estimatedMl: 'Geschatte ml',
    foodFlow: 'VOEDINGSSTROOM',
    mealsAndPortions: 'Maaltijden en porties',
    foodName: 'Voedingsnaam',
    quantity: 'Hoeveelheid',
    sleepFlow: 'SLAAPSTROOM',
    durationAndRest: 'Duur en rust',
    sleep: 'Slaap',
    duration: 'Duur',
    nightNap: 'Nacht / dutje',
    durationMin: 'Duur (min)',
    diaperFlow: 'LUIERSTROOM',
    quickCounts: 'Snelle tellingen',
    pee: 'Plas',
    poop: 'Poep',
    vomit: 'Braken',
    pumpFlow: 'KOLFSTROOM',
    timerAmount: 'Timer + hoeveelheid',
    pump: 'Kolf',
    timer: 'Timer',
    amount: 'Hoeveelheid',
    sessionPump: 'Kolfsessie',
    measureFlow: 'METINGSTROOM',
    growthAndSize: 'Groei en grootte',
    weightKg: 'Gewicht (kg)',
    heightCm: 'Lengte (cm)',
    headCirc: 'Hoofdomtrek (cm)',
    temperature: 'Temperatuur (C)',
    medicineFlow: 'MEDICATIESTROOM',
    nameDosageContext: 'Naam, dosering en context',
    savedMedicines: 'Opgeslagen medicijnen',
    noSavedMedicine: 'Nog geen opgeslagen medicijn.',
    savePreset: 'Opslaan als preset',
    medicationName: 'Medicijnnaam',
    usualDose: 'Gebruikelijke dosis',
    dosage: 'Dosering',
    milestoneFlow: 'MIJLPAALSTROOM',
    milestoneAndPhoto: 'Mijlpaal en foto',
    title: 'Titel',
    replacePhoto: 'Foto vervangen',
    attachPhoto: 'Foto toevoegen',
    photoAttached: 'Foto toegevoegd.',
    symptomFlow: 'SYMPTOMENSTROOM',
    tagsAndNotes: 'Tags en notities',
    tags: 'Tags',
    addNote: '+ Notitie toevoegen',
    hideNote: '- Notitie verbergen',
    notes: 'Notities',
    optionalDetails: 'Optionele details',
    updateEntry: 'Item bijwerken',
    saveEntry: 'Item opslaan',
    deleteEntry: 'Item verwijderen',
    saveFailed: 'Opslaan mislukt',
    saveFailedBody: 'Kon dit record niet opslaan.',
    edit: 'Bewerken',
    newEntry: 'Nieuw',
  },
} as const;

const symptomOptions = [
  { label: 'Fever', value: 'fever' },
  { label: 'Pain', value: 'pain' },
  { label: 'Cough', value: 'cough' },
  { label: 'Congestion', value: 'congestion' },
  { label: 'Colic', value: 'colic' },
  { label: 'Rash', value: 'rash' },
  { label: 'Diarrhea', value: 'diarrhea' },
  { label: 'Vomiting', value: 'vomiting' },
  { label: 'Irritability', value: 'irritability' },
];

function normalizeSymptom(value: string) {
  return value.trim().toLowerCase();
}

function toggleListItem(items: string[], value: string) {
  const normalized = normalizeSymptom(value);
  return items.includes(normalized) ? items.filter((item) => item !== normalized) : [...items, normalized];
}

const typeMeta: Record<
  EntryType,
  {
    icon: string;
    eyebrow: string;
    tone: string;
    toneSoft: string;
    details: string[];
    badges: string[];
  }
> = {
  feed: {
    icon: '🍼',
    eyebrow: 'Feeding session',
    tone: '#C9A227',
    toneSoft: 'rgba(201,162,39,0.16)',
    details: ['Timer', 'Quick amount', 'Breast or bottle'],
    badges: ['🍼 Feed', '⏱ Timer', '⚡ Fast log'],
  },
  food: {
    icon: '🍲',
    eyebrow: 'Food tracking',
    tone: '#F0B85A',
    toneSoft: 'rgba(240,184,90,0.16)',
    details: ['Food name', 'Quantity', 'Optional notes'],
    badges: ['🍲 Meal', '🥄 Quantity', '📝 Notes'],
  },
  sleep: {
    icon: '😴',
    eyebrow: 'Sleep session',
    tone: '#58A6FF',
    toneSoft: 'rgba(88,166,255,0.16)',
    details: ['Duration first', 'Calm layout', 'Minimal taps'],
    badges: ['😴 Sleep', '⏱ Duration', '🌙 Quiet flow'],
  },
  diaper: {
    icon: '🧷',
    eyebrow: 'Diaper log',
    tone: '#E74C3C',
    toneSoft: 'rgba(231,76,60,0.16)',
    details: ['Pee, poop, vomit', 'Quick count', 'Short note'],
    badges: ['🧷 Diaper', '💧 Count', '📝 Note'],
  },
  pump: {
    icon: '🍼',
    eyebrow: 'Pump session',
    tone: '#B88A2A',
    toneSoft: 'rgba(63,185,80,0.16)',
    details: ['Timer + output', 'Milk amount', 'Focused save flow'],
    badges: ['🍼 Pump', '⏱ Timer', '📦 ml output'],
  },
  measurement: {
    icon: '📏',
    eyebrow: 'Measurement',
    tone: '#A371F7',
    toneSoft: 'rgba(163,113,247,0.16)',
    details: ['Weight, height, temp', 'Growth friendly', 'Fast entry'],
    badges: ['📏 Measure', '⚖️ Weight', '🌡 Temp'],
  },
  medication: {
    icon: '💊',
    eyebrow: 'Medication',
    tone: '#7CC2FF',
    toneSoft: 'rgba(124,194,255,0.16)',
    details: ['Name + dosage', 'Clean text input', 'Add context'],
    badges: ['💊 Med', '🧾 Dose', '🕒 Time'],
  },
  milestone: {
    icon: '✨',
    eyebrow: 'Milestone',
    tone: '#D9B97D',
    toneSoft: 'rgba(217,185,125,0.16)',
    details: ['Title + icon', 'Optional photo', 'Memory log'],
    badges: ['✨ Milestone', '🖼 Photo', '📝 Memory'],
  },
  symptom: {
    icon: '💬',
    eyebrow: 'Symptom log',
    tone: '#8EB5EA',
    toneSoft: 'rgba(142,181,234,0.16)',
    details: ['Tags + note', 'Observations first', 'Review later'],
    badges: ['💬 Symptom', '🏷 Tags', '📝 Context'],
  },
};

function typeSubtitle(type: EntryType) {
  switch (type) {
    case 'feed':
      return 'Track breast or bottle sessions with a timer or quick amount picker.';
    case 'food':
      return 'Log meals with a name, quantity, and optional notes.';
    case 'sleep':
      return 'Capture a nap or overnight block with a simple duration.';
    case 'diaper':
      return 'Log pee, poop, and vomit together with a short note.';
    case 'pump':
      return 'Record a pumping session and the extracted amount.';
    case 'measurement':
      return 'Add weight, height, or temperature in one pass.';
    case 'medication':
      return 'Save the medication name, dosage, and any context.';
    case 'milestone':
      return 'Mark a new milestone and optionally attach a photo.';
    case 'symptom':
      return 'Capture qualitative signs or discomfort for later review.';
  }
}

function formatClockTime(value?: string | null) {
  if (!value) return '--';
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function formatRelativeDose(value?: string | null) {
  if (!value) return '';
  const diffMs = Date.now() - new Date(value).getTime();
  const totalMinutes = Math.max(0, Math.round(diffMs / 60000));
  if (totalMinutes < 60) return `${totalMinutes} min ago`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m ago` : `${hours}h ago`;
}

function medicationTimingState(nextAllowedAt?: string | null) {
  if (!nextAllowedAt) {
    return { label: 'No rule', tone: '#8B949E', bg: 'rgba(139,148,158,0.14)' };
  }
  const diff = new Date(nextAllowedAt).getTime() - Date.now();
  if (diff <= 0) {
    return { label: 'Due', tone: '#E74C3C', bg: 'rgba(231,76,60,0.16)' };
  }
  if (diff <= 60 * 60000) {
    return { label: 'Soon', tone: '#C9A227', bg: 'rgba(201,162,39,0.16)' };
  }
  return { label: 'OK', tone: '#58A6FF', bg: 'rgba(88,166,255,0.16)' };
}

function payloadOf(entry?: EntryRecord | null) {
  return entry?.payload ?? {};
}

export default function EntryComposerScreen() {
  const { colors } = useTheme();
  const { language } = useLocale();
  const { profile } = useAuth();
  const copy = entryCopy[language as keyof typeof entryCopy] ?? entryCopy.en;
  const params = useLocalSearchParams<{ type?: string; id?: string; presetAmount?: string; presetMode?: string; presetSide?: string; symptom?: string }>();
  const { addEntry, updateEntry, deleteEntry, entryById, entries } = useAppData();
  const type = (params.type as EntryType) || 'feed';
  const editing = params.id ? entryById(String(params.id)) : undefined;
  const presetAmount = typeof params.presetAmount === 'string' ? Number(params.presetAmount) : undefined;
  const presetMode = typeof params.presetMode === 'string' ? (params.presetMode as 'breast' | 'bottle') : undefined;
  const presetSide = typeof params.presetSide === 'string' ? params.presetSide : undefined;
  const presetSymptom = typeof params.symptom === 'string' ? normalizeSymptom(params.symptom) : undefined;

  const [mode, setMode] = useState<'breast' | 'bottle'>('bottle');
  const [side, setSide] = useState('left');
  const [amountMl, setAmountMl] = useState('150');
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [durationMin, setDurationMin] = useState('30');
  const [pee, setPee] = useState('1');
  const [poop, setPoop] = useState('0');
  const [vomit, setVomit] = useState('0');
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [headCircCm, setHeadCircCm] = useState('');
  const [tempC, setTempC] = useState('');
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('sparkles');
  const [photoUri, setPhotoUri] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [largeTouchMode, setLargeTouchMode] = useState(false);
  const [savedMedicines, setSavedMedicines] = useState<SavedMedicine[]>([]);
  const [medicationSearch, setMedicationSearch] = useState('');
  const [selectedMedicationSymptoms, setSelectedMedicationSymptoms] = useState<string[]>(presetSymptom ? [presetSymptom] : []);
  const [selectedMedicationMeta, setSelectedMedicationMeta] = useState<Partial<SavedMedicine> | Partial<MedicationPreset>>({});
  const [intervalHours, setIntervalHours] = useState('');
  const [alternatingEnabled, setAlternatingEnabled] = useState(false);
  const [alternatingMedicineA, setAlternatingMedicineA] = useState('');
  const [alternatingMedicineAInterval, setAlternatingMedicineAInterval] = useState('');
  const [alternatingMedicineB, setAlternatingMedicineB] = useState('');
  const [alternatingMedicineBInterval, setAlternatingMedicineBInterval] = useState('');
  const [alternatingNotes, setAlternatingNotes] = useState('');
  const [medicationConfirmKey, setMedicationConfirmKey] = useState('');
  const [customActions, setCustomActions] = useState([
    { id: 'para', name: 'Paracetamol', dose: '5ml', color: '#58A6FF' },
    { id: 'nuro', name: 'Nurofen', dose: '2.5ml', color: '#E74C3C' },
    { id: 'ors', name: 'ORS', dose: '10ml', color: '#3FB950' },
  ]);

  const handleCustomActionPress = useCallback(async (action: any) => {
    if (action.id === 'custom') {
      // For "Custom", we use the existing form fields but focus them or show them
      setNotesOpen(true);
      setName('');
      setDosage('');
      // In a real app, we might use a dedicated prompt here
      const customName = prompt('Medication Name:', '');
      const customDose = prompt('Dosage (e.g. 5ml):', '');
      if (customName && customDose) {
        void quickLogMedication({ name: customName, dosage: customDose, intervalHours: 6 });
      }
      return;
    }

    // Long press logic or edit mode could go here for Para/Nuro/ORS
    void quickLogMedication({ name: action.name, dosage: action.dose, intervalHours: 6 });
  }, [quickLogMedication]);

  const handleCustomActionLongPress = useCallback((action: any) => {
    if (action.id === 'custom') return;
    const newName = prompt(`Edit name for ${action.name}:`, action.name);
    const newDose = prompt(`Edit dose for ${action.name}:`, action.dose);
    if (newName || newDose) {
      setCustomActions(prev => prev.map(a => a.id === action.id ? { ...a, name: newName || a.name, dose: newDose || a.dose } : a));
    }
  }, []);

  const meta = typeMeta[type];
  const babyAgeMonths = useMemo(() => {
    if (!profile?.babyBirthDate) return 0;
    const ageMs = Date.now() - new Date(profile.babyBirthDate).getTime();
    return Math.max(0, ageMs / (30.4375 * 24 * 3600000));
  }, [profile?.babyBirthDate]);

  const careStage = useMemo(() => getCareStagePolicy(profile), [profile]);
  const sickChild = useMemo(() => getSickChildStatus(entries), [entries]);
  const medicationTimeline = useMemo(() => getMedicationTimelineStatus(entries, { medicationAlternatingPlan: {
    enabled: alternatingEnabled,
    medicines: [
      alternatingMedicineA.trim() && alternatingMedicineAInterval ? { name: alternatingMedicineA.trim(), intervalHours: Number(alternatingMedicineAInterval) || 0 } : null,
      alternatingMedicineB.trim() && alternatingMedicineBInterval ? { name: alternatingMedicineB.trim(), intervalHours: Number(alternatingMedicineBInterval) || 0 } : null,
    ].filter((item): item is { name: string; intervalHours: number } => Boolean(item && item.intervalHours > 0)),
    notes: alternatingNotes.trim(),
  } } as AppSettings), [entries, alternatingEnabled, alternatingMedicineA, alternatingMedicineAInterval, alternatingMedicineB, alternatingMedicineBInterval, alternatingNotes]);

  const dosageReferences = useMemo(() => {
    if (babyAgeMonths < 3) return { paracetamol: '60mg (2.5ml)', ibuprofen: 'Not recommended < 3m' };
    if (babyAgeMonths < 6) return { paracetamol: '60-120mg (2.5-5ml)', ibuprofen: '50mg (2.5ml)' };
    if (babyAgeMonths < 12) return { paracetamol: '120mg (5ml)', ibuprofen: '50-100mg (2.5-5ml)' };
    return { paracetamol: '120-250mg (5-10ml)', ibuprofen: '100mg (5ml)' };
  }, [babyAgeMonths]);

  const recentMedicationEntries = useMemo(
    () => entries.filter((entry) => entry.type === 'medication' && entry.payload?.name).slice(0, 8),
    [entries],
  );
  const medicationState = useMemo(() => medicationTimingState(medicationTimeline.nextAllowedAt), [medicationTimeline.nextAllowedAt]);

  useEffect(() => {
    if (!editing) return;
    setOccurredAt(new Date(editing.occurredAt));
    setNotes(editing.notes ?? '');
    setNotesOpen(Boolean(editing.notes));

    switch (editing.type) {
      case 'feed':
        setMode(editing.payload?.mode ?? 'bottle');
        setAmountMl(String(editing.payload?.amountMl ?? 150));
        setSide(editing.payload?.side ?? 'left');
        setDurationMin(String(editing.payload?.durationMin ?? 30));
        break;
      case 'food':
        setFoodName(editing.payload?.foodName ?? '');
        setQuantity(editing.payload?.quantity ?? '');
        break;
      case 'sleep':
      case 'pump':
        setDurationMin(String(editing.payload?.durationMin ?? 30));
        if (editing.type === 'pump') {
          setAmountMl(String(editing.payload?.amountMl ?? 120));
        }
        break;
      case 'diaper':
        setPee(String(editing.payload?.pee ?? 0));
        setPoop(String(editing.payload?.poop ?? 0));
        setVomit(String(editing.payload?.vomit ?? 0));
        break;
      case 'measurement':
        setWeightKg(editing.payload?.weightKg ? String(editing.payload.weightKg) : '');
        setHeightCm(editing.payload?.heightCm ? String(editing.payload.heightCm) : '');
        setHeadCircCm(editing.payload?.headCircCm ? String(editing.payload.headCircCm) : '');
        setTempC(editing.payload?.tempC ? String(editing.payload.tempC) : '');
        break;
      case 'medication':
        setName(editing.payload?.name ?? '');
        setDosage(editing.payload?.dosage ?? '');
        setIntervalHours(editing.payload?.intervalHours ? String(editing.payload.intervalHours) : '');
        setSelectedMedicationSymptoms((editing.payload?.tags ?? []).map(normalizeSymptom));
        break;
      case 'milestone':
        setTitle(editing.payload?.title ?? '');
        setIcon(editing.payload?.icon ?? 'sparkles');
        setPhotoUri(editing.payload?.photoUri ?? '');
        break;
      case 'symptom':
        setSymptoms((editing.payload as any)?.tags ?? ((editing.payload?.notes ?? '') as string).split(',').map((value) => value.trim()).filter(Boolean));
        break;
    }
  }, [editing]);

  useEffect(() => {
    (async () => {
      const settings = await getAppSettings();
      setLargeTouchMode(settings.largeTouchMode);
      setAlternatingEnabled(settings.medicationAlternatingPlan?.enabled ?? false);
      setAlternatingMedicineA(settings.medicationAlternatingPlan?.medicines?.[0]?.name ?? '');
      setAlternatingMedicineAInterval(settings.medicationAlternatingPlan?.medicines?.[0]?.intervalHours ? String(settings.medicationAlternatingPlan.medicines[0].intervalHours) : '');
      setAlternatingMedicineB(settings.medicationAlternatingPlan?.medicines?.[1]?.name ?? '');
      setAlternatingMedicineBInterval(settings.medicationAlternatingPlan?.medicines?.[1]?.intervalHours ? String(settings.medicationAlternatingPlan.medicines[1].intervalHours) : '');
      setAlternatingNotes(settings.medicationAlternatingPlan?.notes ?? '');
      setSavedMedicines(await getSavedMedicines());
    })();
  }, []);

  useEffect(() => {
    if (editing) return;
    if (presetAmount && Number.isFinite(presetAmount)) setAmountMl(String(presetAmount));
    if (presetMode) setMode(presetMode);
    if (presetSide) setSide(presetSide);
  }, [editing, presetAmount, presetMode, presetSide]);

  useEffect(() => {
    if (type !== 'medication') return;
    if (presetSymptom) {
      setSelectedMedicationSymptoms((current) => (current.includes(presetSymptom) ? current : [presetSymptom, ...current]));
      return;
    }
    const lastSymptomEntry = entries.find((entry) => entry.type === 'symptom');
    const inferredTags = (lastSymptomEntry?.payload?.tags ?? []).map(normalizeSymptom).filter(Boolean);
    if (inferredTags.length) {
      setSelectedMedicationSymptoms((current) => (current.length ? current : inferredTags.slice(0, 3)));
    }
  }, [entries, presetSymptom, type]);

  const rankedSavedMedicines = useMemo(
    () => getSavedMedicinesRanked(savedMedicines, selectedMedicationSymptoms),
    [savedMedicines, selectedMedicationSymptoms],
  );

  const recommendedPresets = useMemo(
    () => getMedicationPresetsBySymptom(selectedMedicationSymptoms)
      .filter((item) => {
        const ageMatch = !item.minAgeMonths || babyAgeMonths >= item.minAgeMonths;
        const symptomMatch = !selectedMedicationSymptoms.length || item.symptomTags.some((tag) => selectedMedicationSymptoms.includes(tag));
        return ageMatch && symptomMatch;
      })
      .slice(0, 8),
    [selectedMedicationSymptoms, babyAgeMonths],
  );

  const medicationQuery = medicationSearch.trim().toLowerCase();

  const filteredSavedMedicines = useMemo(() => {
    if (!medicationQuery) return rankedSavedMedicines;
    return rankedSavedMedicines.filter((medicine) => {
      const haystack = [medicine.name, medicine.dosage, ...(medicine.symptomTags ?? []), ...(medicine.commonFor ?? [])].join(' ').toLowerCase();
      return haystack.includes(medicationQuery);
    });
  }, [medicationQuery, rankedSavedMedicines]);

  const filteredPresets = useMemo(() => {
    const presets = getMedicationPresetsBySymptom(selectedMedicationSymptoms);
    if (!medicationQuery) return presets;
    return presets.filter((preset) => {
      const haystack = [preset.name, preset.dosage, preset.notes, ...preset.symptomTags, ...preset.commonFor].join(' ').toLowerCase();
      return haystack.includes(medicationQuery);
    });
  }, [medicationQuery, selectedMedicationSymptoms]);

  const mostUsedMedicines = filteredSavedMedicines.filter((medicine) => medicine.useCount > 0).slice(0, 4);
  const recommendedSavedMedicines = filteredSavedMedicines
    .filter((medicine) => (medicine.symptomTags ?? []).some((tag) => selectedMedicationSymptoms.includes(tag)))
    .slice(0, 4);

  function buildPayload(): EntryPayload {
    switch (type) {
      case 'feed':
        return mode === 'bottle'
          ? { mode: 'bottle', amountMl: Number(amountMl) || 0, notes }
          : { mode: 'breast', side: side as BreastSide, durationMin: Number(durationMin) || 0, amountMl: Number(amountMl) || 0, notes };
      case 'food':
        return { foodName, quantity, notes };
      case 'sleep':
        return { durationMin: Number(durationMin) || 0, notes };
      case 'diaper':
        return {
          pee: clamp(Number(pee) || 0, 0, 9),
          poop: clamp(Number(poop) || 0, 0, 9),
          vomit: clamp(Number(vomit) || 0, 0, 9),
          notes,
        };
      case 'pump':
        return { durationMin: Number(durationMin) || 0, amountMl: Number(amountMl) || 0, notes };
      case 'measurement':
        return {
          weightKg: weightKg ? Number(weightKg) : undefined,
          heightCm: heightCm ? Number(heightCm) : undefined,
          headCircCm: headCircCm ? Number(headCircCm) : undefined,
          tempC: tempC ? Number(tempC) : undefined,
          notes,
        };
      case 'medication':
        return {
          name,
          dosage,
          intervalHours: intervalHours ? Number(intervalHours) : undefined,
          intervalLabel: intervalHours ? `Every ${intervalHours}h` : undefined,
          notes,
          tags: selectedMedicationSymptoms,
        };
      case 'milestone':
        return { title: title || 'Milestone', icon, photoUri: photoUri || undefined, notes };
      case 'symptom':
        return { notes, tags: symptoms };
    }
  }

  function buildTitle() {
    switch (type) {
      case 'feed':
        return mode === 'bottle' ? 'Bottle feed' : 'Breast feed';
      case 'food':
        return foodName || 'Food log';
      case 'sleep':
        return 'Sleep session';
      case 'diaper':
        return 'Diaper log';
      case 'pump':
        return 'Pump session';
      case 'measurement':
        return 'Measurement';
      case 'medication':
        return name || 'Medication';
      case 'milestone':
        return title || 'Milestone';
      case 'symptom':
        return 'Symptom log';
    }
  }

  function applyMedicationSelection(medicine: {
    name: string;
    dosage?: string;
    intervalHours?: number | null;
    symptomTags?: string[];
    commonFor?: string[];
    minAgeMonths?: number | null;
    notes?: string;
    isCustom?: boolean;
  }) {
    setName(medicine.name);
    if (medicine.dosage) setDosage(medicine.dosage);
    if (medicine.intervalHours) setIntervalHours(String(medicine.intervalHours));
    const medicineSymptoms = medicine.symptomTags ?? [];
    if (medicineSymptoms.length) {
      setSelectedMedicationSymptoms((current) => Array.from(new Set([...current, ...medicineSymptoms.map(normalizeSymptom)])));
    }
    setSelectedMedicationMeta(medicine);
    if (medicine.notes && !notes.trim()) {
      setNotes(medicine.notes);
    }
  }

  function inferMedicationIntervalHours(medicineName: string, medicineMeta?: Partial<SavedMedicine> | Partial<MedicationPreset>) {
    if (medicineMeta && 'intervalHours' in medicineMeta && typeof medicineMeta.intervalHours === 'number' && Number.isFinite(medicineMeta.intervalHours)) {
      return medicineMeta.intervalHours;
    }
    const normalized = medicineName.trim().toLowerCase();
    const sameMedicine = recentMedicationEntries.find((entry) => entry.payload?.name?.trim().toLowerCase() === normalized);
    if (typeof sameMedicine?.payload?.intervalHours === 'number' && Number.isFinite(sameMedicine.payload.intervalHours)) {
      return sameMedicine.payload.intervalHours;
    }
    const planItem = [alternatingMedicineA, alternatingMedicineB]
      .map((item, index) => ({
        name: item.trim().toLowerCase(),
        intervalHours: index === 0 ? Number(alternatingMedicineAInterval) : Number(alternatingMedicineBInterval),
      }))
      .find((item) => item.name === normalized && item.intervalHours > 0);
    return planItem?.intervalHours;
  }

  async function quickLogMedication(medicine: {
    name: string;
    dosage?: string;
    intervalHours?: number | null;
    symptomTags?: string[];
    notes?: string;
    isCustom?: boolean;
  }) {
    const medicineName = medicine.name.trim();
    if (!medicineName) return;

    const timestamp = new Date().toISOString();
    const interval = medicine.intervalHours ?? inferMedicationIntervalHours(medicineName, medicine);
    const payload = {
      name: medicineName,
      dosage: medicine.dosage ?? '',
      intervalHours: typeof interval === 'number' && Number.isFinite(interval) ? interval : undefined,
      intervalLabel: typeof interval === 'number' && Number.isFinite(interval) ? `Every ${interval}h` : undefined,
      notes: medicine.notes ?? '',
      tags: medicine.symptomTags?.length ? medicine.symptomTags : selectedMedicationSymptoms,
    };

    setSaving(true);
    try {
      await addEntry({
        type: 'medication',
        title: medicineName,
        notes: payload.notes,
        occurredAt: timestamp,
        payload,
      });
      setSavedMedicines(
        await recordMedicineUse({
          name: medicineName,
          dosage: payload.dosage,
          usedAt: timestamp,
          intervalHours: payload.intervalHours ?? null,
          intervalLabel: payload.intervalLabel,
          symptomTags: payload.tags,
          commonFor: (selectedMedicationMeta.commonFor as string[] | undefined) ?? [],
          minAgeMonths: selectedMedicationMeta.minAgeMonths ?? null,
          notes: medicine.notes ?? notes,
          isCustom: medicine.isCustom ?? false,
        }),
      );
      setName(medicineName);
      setDosage(payload.dosage);
      setIntervalHours(payload.intervalHours ? String(payload.intervalHours) : '');
      setSelectedMedicationMeta(medicine);
      setMedicationConfirmKey(`${medicineName}-${timestamp}`);
      void triggerHaptic('success');
      setTimeout(() => {
        setMedicationConfirmKey((current) => (current === `${medicineName}-${timestamp}` ? '' : current));
      }, 1200);
    } catch (error: any) {
      Alert.alert(copy.saveFailed, error?.message ?? copy.saveFailedBody);
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (type === 'food' && careStage.foodEntryLocked) {
        Alert.alert('Food locked', careStage.foodEntryReason ?? 'Food logging is not available yet for this age.');
        return;
      }
      const timestamp = occurredAt.toISOString();
      const payload = buildPayload();
      const titleValue = buildTitle();
      const alternatingMedicines = [
        alternatingMedicineA.trim() && alternatingMedicineAInterval ? { name: alternatingMedicineA.trim(), intervalHours: Number(alternatingMedicineAInterval) || 0 } : null,
        alternatingMedicineB.trim() && alternatingMedicineBInterval ? { name: alternatingMedicineB.trim(), intervalHours: Number(alternatingMedicineBInterval) || 0 } : null,
      ].filter((item): item is { name: string; intervalHours: number } => Boolean(item && item.intervalHours > 0));

      if (editing) {
        await updateEntry(editing.id, { type, title: titleValue, notes, occurredAt: timestamp, payload } as any);
      } else {
        await addEntry({ type, title: titleValue, notes, occurredAt: timestamp, payload });
      }
      if (type === 'medication' && name.trim()) {
        await updateAppSettings({
          medicationAlternatingPlan: {
            enabled: alternatingEnabled && alternatingMedicines.length === 2,
            medicines: alternatingMedicines,
            notes: alternatingNotes.trim(),
          },
        } as Partial<AppSettings>);
        setSavedMedicines(
          await recordMedicineUse({
            name,
            dosage,
            usedAt: timestamp,
            intervalHours: intervalHours ? Number(intervalHours) : null,
            intervalLabel: intervalHours ? `Every ${intervalHours}h` : undefined,
            symptomTags: selectedMedicationSymptoms,
            commonFor: (selectedMedicationMeta.commonFor as string[] | undefined) ?? [],
            minAgeMonths: selectedMedicationMeta.minAgeMonths ?? null,
            notes: selectedMedicationMeta.notes ?? notes,
            isCustom: selectedMedicationMeta.isCustom ?? true,
          }),
        );
      }
      router.back();
    } catch (error: any) {
      Alert.alert(copy.saveFailed, error?.message ?? copy.saveFailedBody);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    await deleteEntry(editing.id);
    router.back();
  }

  const screenCopy = {
    title: editing
      ? `${copy.edit} ${typeLabels[editing.type]}`
      : `${copy.newEntry} ${typeLabels[type]}`,
    subtitle:
      type === 'feed'
        ? language === 'fr'
          ? 'Suivez sein ou biberon avec minuteur ou quantite rapide.'
          : 'Track breast or bottle sessions with a timer or quick amount picker.'
        : type === 'sleep'
          ? language === 'fr'
            ? 'Capturez une sieste ou une nuit avec une duree simple.'
            : 'Capture a nap or overnight block with a simple duration.'
          : type === 'diaper'
            ? language === 'fr'
              ? 'Enregistrez pipi, caca et vomi avec une note courte.'
              : 'Log pee, poop, and vomit together with a short note.'
            : type === 'pump'
              ? language === 'fr'
                ? 'Enregistrez tire-lait et quantite.'
                : 'Record a pumping session and the extracted amount.'
              : type === 'measurement'
                ? language === 'fr'
                  ? 'Ajoutez poids, taille, perimetre cranien et temperature.'
                  : 'Add weight, height, head circumference, or temperature.'
                 : type === 'medication'
                   ? language === 'fr'
                     ? 'Nom, dose, heure et contexte de securite.'
                     : 'Save the medication name, timing rule, and safety context.'
                   : type === 'milestone'
                    ? language === 'fr'
                      ? 'Ajoutez une etape avec photo si besoin.'
                      : 'Mark a new milestone and optionally attach a photo.'
                    : language === 'fr'
                      ? 'Capturez des signes qualitatifs pour revue plus tard.'
                      : 'Capture qualitative signs or discomfort for later review.',
  };

  return (
    <Page>
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={[styles.heroIcon, { backgroundColor: meta.toneSoft, borderColor: meta.tone }]}>
            <Text style={styles.heroIconText}>{meta.icon}</Text>
          </View>
          <Pressable onPress={() => router.back()} style={styles.closeButton} accessibilityRole="button" accessibilityLabel={copy.close}>
            <Text style={styles.closeButtonLabel}>X</Text>
          </Pressable>
        </View>

        <View style={styles.heroCopy}>
          <Text style={[styles.heroEyebrow, { color: meta.tone }]}>{copy.composer}</Text>
          <Text style={styles.heroTitle}>{screenCopy.title}</Text>
          <Text style={styles.heroSubtitle}>{screenCopy.subtitle}</Text>
        </View>
        <View style={styles.badgeRow}>
          {meta.badges.map((badge) => (
            <View key={badge} style={[styles.badge, { borderColor: meta.tone, backgroundColor: meta.toneSoft }]}>
              <Text style={[styles.badgeText, { color: meta.tone }]}>{badge}</Text>
            </View>
          ))}
        </View>
      </View>
      <Card>
        <View style={styles.sectionCard}>
          <Text style={[styles.sectionLabel, { color: meta.tone }]}>BELGIAN GUIDANCE</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{careStage.ageLabel}</Text>
          <Text style={[styles.sectionBody, { color: colors.muted }]}>{careStage.waterGuidance}</Text>
          <Text style={[styles.sectionBody, { color: colors.muted }]}>{careStage.foodGuidance}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionLabel, { color: meta.tone }]}>{meta.eyebrow}</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{copy.whenItHappened}</Text>
          <Text style={[styles.sectionBody, { color: colors.muted }]}>{meta.details[0]}</Text>
          <DateTimeField label={copy.when} value={occurredAt} onChange={setOccurredAt} />
        </View>

        {type === 'feed' ? (
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionLabel, { color: meta.tone }]}>{copy.feedFlow}</Text>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>{language === 'fr' ? 'Démarrer la tétée' : 'Start Feed'}</Text>
            
            <View style={styles.quickActionsGrid}>
              {[
                { id: 'left', label: language === 'fr' ? 'Sein gauche' : 'Left breast', icon: '🤱', mode: 'breast' as const, side: 'left' },
                { id: 'right', label: language === 'fr' ? 'Sein droit' : 'Right breast', icon: '🤱', mode: 'breast' as const, side: 'right' },
                { id: 'both', label: language === 'fr' ? 'Les deux' : 'Both', icon: '🤱🤱', mode: 'breast' as const, side: 'both' },
                { id: 'bottle', label: language === 'fr' ? 'Biberon' : 'Biberon', icon: '🍼', mode: 'bottle' as const, side: 'left' },
              ].map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    setMode(opt.mode);
                    setSide(opt.side);
                    void triggerHaptic('light');
                  }}
                  style={({ pressed }) => [
                    styles.feedQuickButton,
                    { 
                      borderColor: (mode === opt.mode && (opt.mode === 'bottle' || side === opt.side)) ? meta.tone : 'transparent',
                      backgroundColor: (mode === opt.mode && (opt.mode === 'bottle' || side === opt.side)) ? 'rgba(255,255,255,0.05)' : colors.bgCardAlt,
                      opacity: pressed ? 0.7 : 1 
                    }
                  ]}
                >
                  <Text style={styles.feedQuickIcon}>{opt.icon}</Text>
                  <Text style={[styles.feedQuickLabel, { color: colors.text }]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={{ marginTop: 20 }}>
              {mode === 'bottle' ? (
                <QuantityPicker value={Number(amountMl) || 0} onChange={(value) => setAmountMl(String(value))} largeTouchMode={largeTouchMode} />
              ) : (
                <View style={styles.stack}>
                  <TimerWidget
                    label={copy.sessionBreast}
                    valueMinutes={Number(durationMin) || 0}
                    onChangeMinutes={(minutes) => setDurationMin(String(minutes))}
                    allowSides
                    side={side as 'left' | 'right' | 'both'}
                    onSideChange={(nextSide) => setSide(nextSide)}
                    largeTouchMode={largeTouchMode}
                  />
                  <QuantityPicker label={copy.estimatedMl} value={Number(amountMl) || 0} onChange={(value) => setAmountMl(String(value))} largeTouchMode={largeTouchMode} />
                </View>
              )}
            </View>
          </View>
        ) : null}

        {type === 'food' ? (
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionLabel, { color: meta.tone }]}>{language === 'fr' ? 'FOOD FLOW' : 'FOOD FLOW'}</Text>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{language === 'fr' ? 'Repas et portions' : 'Meals and portions'}</Text>
            <Text style={[styles.sectionBody, { color: colors.muted }]}>
              {careStage.foodEntryLocked
                ? careStage.foodEntryReason
                : careStage.stage === 'solids_intro'
                  ? 'Start with simple solids, small water sips around meals, and iron-focused foods.'
                  : 'Meals are open. Keep water visible daily and log broader meal patterns.'}
            </Text>
            {careStage.foodEntryLocked ? (
              <Pressable onPress={() => router.replace('/entry/feed')} style={styles.savePresetButton}>
                <Text style={styles.savePresetText}>Open milk flow instead</Text>
              </Pressable>
            ) : (
              <>
                <View style={styles.savedRow}>
                  {(careStage.stage === 'solids_intro'
                    ? ['Iron-rich puree', 'Vegetable puree', 'Fruit', 'Small water sips']
                    : ['Breakfast', 'Lunch', 'Snack', 'Dinner']).map((item) => (
                    <Pressable key={item} onPress={() => setFoodName(item)} style={styles.smallChip}>
                      <Text style={styles.smallChipText}>{item}</Text>
                    </Pressable>
                  ))}
                </View>
                <Input label={copy.foodName} value={foodName} onChangeText={setFoodName} placeholder={language === 'fr' ? 'Pomme, riz, puree...' : 'Apple, rice, puree...'} />
                <Input label={copy.quantity} value={quantity} onChangeText={setQuantity} placeholder="250 ml / 120 g / 1 portion" />
              </>
            )}
          </View>
        ) : null}

        {type === 'sleep' ? (
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionLabel, { color: meta.tone }]}>{language === 'fr' ? 'SLEEP FLOW' : 'SLEEP FLOW'}</Text>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{language === 'fr' ? 'Duree et repos' : 'Duration and rest'}</Text>
            <Text style={[styles.sectionBody, { color: colors.muted }]}>{meta.details[1]}</Text>
            <View style={styles.infoStrip}>
              <Text style={styles.infoStripText}>😴 {language === 'fr' ? 'Sommeil' : 'Sleep'}</Text>
              <Text style={styles.infoStripText}>⏱ {language === 'fr' ? 'Durée' : 'Duration'}</Text>
              <Text style={styles.infoStripText}>🌙 {language === 'fr' ? 'Nuit / sieste' : 'Night / nap'}</Text>
            </View>
            <TimerWidget label={copy.durationMin} valueMinutes={Number(durationMin) || 0} onChangeMinutes={(minutes) => setDurationMin(String(minutes))} largeTouchMode={largeTouchMode} />
          </View>
        ) : null}

        {type === 'diaper' ? (
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionLabel, { color: meta.tone }]}>{language === 'fr' ? 'DIAPER FLOW' : 'DIAPER FLOW'}</Text>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{language === 'fr' ? 'Compteurs rapides' : 'Quick counts'}</Text>
            <Text style={[styles.sectionBody, { color: colors.muted }]}>{meta.details[0]}</Text>
            <View style={styles.stack}>
              <Input label={language === 'fr' ? 'Pipi' : 'Pee'} value={pee} onChangeText={setPee} keyboardType="numeric" inputMode="numeric" />
              <Input label={language === 'fr' ? 'Caca' : 'Poop'} value={poop} onChangeText={setPoop} keyboardType="numeric" inputMode="numeric" />
              <Input label={language === 'fr' ? 'Vomi' : 'Vomit'} value={vomit} onChangeText={setVomit} keyboardType="numeric" inputMode="numeric" />
            </View>
          </View>
        ) : null}

        {type === 'pump' ? (
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionLabel, { color: meta.tone }]}>{copy.pumpFlow}</Text>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{copy.timerAmount}</Text>
            <Text style={[styles.sectionBody, { color: colors.muted }]}>{meta.details[0]}</Text>
            <View style={styles.infoStrip}>
              <Text style={styles.infoStripText}>🍼 {copy.pump}</Text>
              <Text style={styles.infoStripText}>⏱ {copy.timer}</Text>
              <Text style={styles.infoStripText}>💧 {copy.amount}</Text>
            </View>
            <TimerWidget label={copy.sessionPump} valueMinutes={Number(durationMin) || 0} onChangeMinutes={(minutes) => setDurationMin(String(minutes))} largeTouchMode={largeTouchMode} />
            <QuantityPicker value={Number(amountMl) || 0} onChange={(value) => setAmountMl(String(value))} largeTouchMode={largeTouchMode} />
          </View>
        ) : null}

        {type === 'measurement' ? (
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionLabel, { color: meta.tone }]}>{language === 'fr' ? 'MEASURE FLOW' : 'MEASURE FLOW'}</Text>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{language === 'fr' ? 'Croissance et taille' : 'Growth and size'}</Text>
            <Text style={[styles.sectionBody, { color: colors.muted }]}>{meta.details[0]}</Text>
            <View style={styles.stack}>
              <Input label={language === 'fr' ? 'Poids (kg)' : 'Weight (kg)'} value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" inputMode="decimal" />
              <Input label={language === 'fr' ? 'Taille (cm)' : 'Height (cm)'} value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" inputMode="decimal" />
              <Input label={language === 'fr' ? 'Perimetre cranien (cm)' : 'Head circumference (cm)'} value={headCircCm} onChangeText={setHeadCircCm} keyboardType="decimal-pad" inputMode="decimal" />
              <Input label={language === 'fr' ? 'Temperature (C)' : 'Temperature (C)'} value={tempC} onChangeText={setTempC} keyboardType="decimal-pad" inputMode="decimal" />
            </View>
          </View>
        ) : null}

        {type === 'medication' ? (
          <View style={styles.babyFlowContainer}>
            {/* Header: BabyFlow Brand & Profile */}
            <View style={styles.babyFlowHeader}>
              <View>
                <Text style={styles.brandTitle}>BabyFlow</Text>
                <Text style={styles.brandSubtitle}>Care Assistant</Text>
              </View>
              <View style={styles.profileCircle}>
                <Text style={styles.profileEmoji}>👶</Text>
              </View>
            </View>

            {/* Main Status Card (Glassmorphism) */}
            <View style={[styles.glassCard, { backgroundColor: medicationState.bg }]}>
              <View style={styles.glassHeader}>
                <View style={[styles.statusIndicator, { backgroundColor: medicationState.tone }]} />
                <Text style={[styles.statusTextLarge, { color: colors.text }]}>
                  {medicationState.label === 'Due' ? 'Dose Required' : medicationState.label === 'Soon' ? 'Upcoming Dose' : 'Everything OK'}
                </Text>
              </View>

              <View style={styles.medicationHighlight}>
                {medicationTimeline.lastMedicine ? (
                  <View style={styles.lastMedFocus}>
                    <Text style={styles.focusLabel}>LAST ADMINISTERED</Text>
                    <Text style={styles.focusValue}>{payloadOf(medicationTimeline.lastMedicine).name}</Text>
                    <Text style={styles.focusMeta}>
                      {payloadOf(medicationTimeline.lastMedicine).dosage} • {formatClockTime(medicationTimeline.lastMedicine.occurredAt)}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.noMedText}>No medication logged today</Text>
                )}

                {medicationTimeline.nextAllowedAt && (
                  <View style={styles.countdownContainer}>
                    <Text style={styles.focusLabel}>NEXT ALLOWED</Text>
                    <Text style={styles.countdownValue}>{formatClockTime(medicationTimeline.nextAllowedAt)}</Text>
                  </View>
                )}
              </View>

              <Pressable 
                onPress={() => setNotesOpen(true)}
                style={({ pressed }) => [
                  styles.primaryGiveButton,
                  { backgroundColor: medicationState.tone, opacity: pressed ? 0.8 : 1 }
                ]}
              >
                <Text style={styles.primaryGiveButtonText}>Give Medication</Text>
              </Pressable>
              <Button label={language === 'fr' ? 'Annuler' : 'Cancel'} onPress={() => router.back()} variant="ghost" />
            </View>

            {/* Health Snapshot (Sick Mode) */}
            <View style={styles.healthSnapshot}>
              <Pressable onPress={() => router.push('/entry/measurement')} style={styles.snapshotItem}>
                <View style={styles.snapshotIconWrap}><Text style={styles.snapshotEmoji}>🌡️</Text></View>
                <Text style={styles.snapshotVal}>{entries.find(e => e.type === 'measurement' && e.payload?.tempC)?.payload?.tempC ?? '--'}°</Text>
                <Text style={styles.snapshotLabel}>Temp</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/entry/feed')} style={styles.snapshotItem}>
                <View style={styles.snapshotIconWrap}><Text style={styles.snapshotEmoji}>💧</Text></View>
                <Text style={styles.snapshotVal}>{entries.filter(e => isSameDay(e.occurredAt, new Date()) && (e.type === 'feed' || e.type === 'food')).length}</Text>
                <Text style={styles.snapshotLabel}>Hydration</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/entry/feed')} style={styles.snapshotItem}>
                <View style={styles.snapshotIconWrap}><Text style={styles.snapshotEmoji}>🍼</Text></View>
                <Text style={styles.snapshotVal}>{entries.filter(e => isSameDay(e.occurredAt, new Date()) && e.type === 'feed').length}</Text>
                <Text style={styles.snapshotLabel}>Feeding</Text>
              </Pressable>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActionsSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>QUICK LOG</Text>
                <Text style={styles.editHint}>Hold to edit</Text>
              </View>
              <View style={styles.quickActionsGrid}>
                {customActions.map((action) => (
                  <Pressable
                    key={action.id}
                    onPress={() => handleCustomActionPress(action)}
                    onLongPress={() => handleCustomActionLongPress(action)}
                    style={({ pressed }) => [
                      styles.premiumActionButton,
                      { borderColor: action.color, opacity: pressed ? 0.7 : 1 }
                    ]}
                  >
                    <Text style={[styles.actionBtnTitle, { color: colors.text }]}>{action.name}</Text>
                    <Text style={styles.actionBtnDose}>{action.dose}</Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => handleCustomActionPress({ id: 'custom' })}
                  style={({ pressed }) => [
                    styles.premiumActionButton,
                    { borderColor: '#A371F7', opacity: pressed ? 0.7 : 1 }
                  ]}
                >
                  <Text style={[styles.actionBtnTitle, { color: colors.text }]}>Custom</Text>
                  <Text style={styles.actionBtnDose}>Log new</Text>
                </Pressable>
              </View>
            </View>

            {/* Vertical Timeline */}
            <View style={styles.babyFlowTimeline}>
              <Text style={styles.sectionHeading}>TIMELINE</Text>
              <View style={styles.timelineList}>
                {recentMedicationEntries.length > 0 ? recentMedicationEntries.slice(0, 5).map((entry, index) => (
                  <View key={entry.id} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <Text style={styles.timelineTime}>{formatClockTime(entry.occurredAt)}</Text>
                      {index !== recentMedicationEntries.slice(0, 5).length - 1 && <View style={styles.timelineLine} />}
                    </View>
                    <View style={styles.timelineRight}>
                      <View style={styles.timelineCard}>
                        <View style={styles.timelineCardHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.timelineMedName}>{payloadOf(entry).name}</Text>
                            <Text style={styles.timelineMedDose}>{payloadOf(entry).dosage}</Text>
                          </View>
                          <Pressable onPress={() => router.push(`/entry/medication?id=${entry.id}`)}>
                            <Text style={[styles.timelineActionText, { color: colors.primary }]}>EDIT</Text>
                          </Pressable>
                        </View>
                        
                        <View style={styles.timelineCardActions}>
                          <Pressable 
                            onPress={() => {
                              setOccurredAt(new Date(entry.occurredAt));
                              setNotesOpen(true);
                              router.push(`/entry/medication?id=${entry.id}`);
                            }}
                            style={styles.timelineMiniAction}
                          >
                            <Text style={styles.timelineMiniActionText}>🕒 Time</Text>
                          </Pressable>
                          <Pressable 
                            onPress={async () => {
                              if (confirm('Delete this entry?')) {
                                await deleteEntry(entry.id);
                                void triggerHaptic('light');
                              }
                            }}
                            style={[styles.timelineMiniAction, { backgroundColor: 'rgba(231,76,60,0.1)' }]}
                          >
                            <Text style={[styles.timelineMiniActionText, { color: '#E74C3C' }]}>🗑️ Delete</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </View>
                )) : (
                  <Text style={styles.emptyTimelineText}>No recent activity</Text>
                )}
              </View>
            </View>
          </View>
        ) : null}

        {type === 'milestone' ? (
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionLabel, { color: meta.tone }]}>{language === 'fr' ? 'MILESTONE FLOW' : 'MILESTONE FLOW'}</Text>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{language === 'fr' ? 'Etape et photo' : 'Milestone and photo'}</Text>
            <Text style={[styles.sectionBody, { color: colors.muted }]}>{meta.details[1]}</Text>
            <Input label={language === 'fr' ? 'Titre' : 'Title'} value={title} onChangeText={setTitle} />
            <Input label="Icon" value={icon} onChangeText={setIcon} />
            <Button
              label={photoUri ? (language === 'fr' ? 'Remplacer la photo' : 'Replace photo') : language === 'fr' ? 'Ajouter une photo' : 'Attach photo'}
              onPress={async () => {
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  quality: 0.7,
                });
                if (!result.canceled && result.assets[0]?.uri) {
                  setPhotoUri(result.assets[0].uri);
                }
              }}
              variant="ghost"
            />
            {photoUri ? <Text style={{ color: colors.muted, textAlign: 'center' }}>{language === 'fr' ? 'Photo jointe.' : 'Photo attached.'}</Text> : null}
          </View>
        ) : null}

        {type === 'symptom' ? (
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionLabel, { color: meta.tone }]}>{language === 'fr' ? 'SYMPTOM FLOW' : 'SYMPTOM FLOW'}</Text>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{language === 'fr' ? 'Tags et notes' : 'Tags and notes'}</Text>
            <Text style={[styles.sectionBody, { color: colors.muted }]}>
              {sickChild.enabled
                ? 'Fever or illness context is active. Prioritize temperature, hydration, diapers, stool, vomiting, and behavior.'
                : meta.details[0]}
            </Text>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16, textAlign: 'center' }}>{language === 'fr' ? 'Tags' : 'Tags'}</Text>
            <View style={styles.savedRow}>
              {symptomOptions.map((symptom) => {
                const selected = symptoms.includes(symptom.value);
                return (
                  <Pressable
                    key={symptom.value}
                    onPress={() => setSymptoms((current) => toggleListItem(current, symptom.value))}
                    style={[styles.smallChip, selected && styles.smallChipSelected]}
                  >
                    <Text style={styles.smallChipText}>{symptom.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {symptoms.length ? (
              <View style={styles.stack}>
                <Pressable onPress={() => router.push(`/entry/medication?symptom=${encodeURIComponent(symptoms[0])}`)} style={styles.savePresetButton}>
                  <Text style={styles.savePresetText}>Open medication suggestions</Text>
                </Pressable>
                {symptoms.includes('fever') ? (
                  <View style={styles.savedRow}>
                    {[
                      { label: 'Hydration', href: '/entry/feed' },
                      { label: 'Diapers', href: '/entry/diaper' },
                      { label: 'Temperature', href: '/entry/measurement' },
                      { label: 'Behavior', href: '/entry/symptom' },
                    ].map((item) => (
                      <Pressable key={item.label} onPress={() => router.push(item.href as any)} style={styles.smallChip}>
                        <Text style={styles.smallChipText}>{item.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.notesToggleWrap}>
          <Pressable onPress={() => setNotesOpen((current) => !current)} style={styles.notesToggle}>
            <Text style={{ color: colors.primary, fontWeight: '800', textAlign: 'center' }}>{notesOpen ? '- Masquer la note' : '+ Ajouter une note'}</Text>
          </Pressable>
        </View>
        {notesOpen ? <Input label={language === 'fr' ? 'Notes' : 'Notes'} value={notes} onChangeText={setNotes} multiline placeholder={language === 'fr' ? 'Details optionnels' : 'Optional details'} /> : null}

        {type !== 'medication' ? (
          <View style={styles.actions}>
            <Button label={editing ? (language === 'fr' ? 'Mettre a jour' : 'Update entry') : language === 'fr' ? 'Enregistrer' : 'Save entry'} onPress={handleSave} loading={saving} />
            <Button label={language === 'fr' ? 'Annuler' : 'Cancel'} onPress={() => router.back()} variant="ghost" />
            {editing ? <Button label={language === 'fr' ? 'Supprimer' : 'Delete entry'} onPress={handleDelete} variant="danger" /> : null}
          </View>
        ) : null}
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  babyFlowContainer: {
    gap: 20,
    paddingBottom: 40,
  },
  babyFlowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#F0F6FC',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#8B949E',
    fontWeight: '600',
  },
  profileCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: '#30363D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileEmoji: {
    fontSize: 24,
  },
  glassCard: {
    borderRadius: 32,
    padding: 24,
    gap: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  glassHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusTextLarge: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  medicationHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMedFocus: {
    flex: 1,
    gap: 4,
  },
  countdownContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  focusLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
  },
  focusValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
  },
  focusMeta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  countdownValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
  },
  noMedText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  primaryGiveButton: {
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  primaryGiveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  healthSnapshot: {
    flexDirection: 'row',
    gap: 12,
  },
  snapshotItem: {
    flex: 1,
    backgroundColor: '#161B22',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#21262D',
  },
  snapshotIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  snapshotEmoji: {
    fontSize: 16,
  },
  snapshotVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
  },
  snapshotLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8B949E',
    textTransform: 'uppercase',
  },
  quickActionsSection: {
    gap: 16,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '900',
    color: '#8B949E',
    letterSpacing: 1.5,
    marginLeft: 4,
  },
  editHint: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  premiumActionButton: {
    flexBasis: '48%',
    flexGrow: 1,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#161B22',
    borderWidth: 1.5,
    padding: 16,
    justifyContent: 'center',
    gap: 2,
  },
  actionBtnTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  actionBtnDose: {
    fontSize: 12,
    color: '#8B949E',
    fontWeight: '700',
  },
  feedQuickButton: {
    flexBasis: '48%',
    flexGrow: 1,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#161B22',
    borderWidth: 1.5,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  feedQuickIcon: {
    fontSize: 20,
  },
  feedQuickLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  babyFlowTimeline: {
    gap: 16,
  },
  timelineList: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 16,
    minHeight: 80,
  },
  timelineLeft: {
    width: 50,
    alignItems: 'center',
  },
  timelineTime: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8B949E',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#21262D',
    marginVertical: 8,
    borderRadius: 1,
  },
  timelineRight: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineCard: {
    backgroundColor: '#161B22',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#21262D',
    gap: 12,
  },
  timelineCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  timelineActionText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  timelineCardActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 10,
  },
  timelineMiniAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  timelineMiniActionText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8B949E',
  },
  timelineMedName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F0F6FC',
  },
  timelineMedDose: {
    fontSize: 13,
    color: '#8B949E',
    fontWeight: '600',
  },
  emptyTimelineText: {
    fontSize: 14,
    color: '#8B949E',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  compactStatusCard: {
    borderRadius: 22,
    padding: 14,
    gap: 8,
  },
  statusRowMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfoGroup: {
    gap: 2,
  },
  statusTag: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statusMainValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  statusTimeGroup: {
    alignItems: 'flex-end',
    gap: 2,
  },
  statusLabelSmall: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusTimeValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  lastMedSimple: {
    fontSize: 12,
    fontWeight: '600',
  },
  suggestionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 10,
    borderRadius: 14,
    marginTop: 4,
  },
  suggestionTextSmall: {
    fontSize: 13,
    flex: 1,
  },
  miniLogButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  miniLogButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  sickModeMinimal: {
    marginTop: -4,
  },
  sickGridCompact: {
    flexDirection: 'row',
    gap: 8,
  },
  sickItemMini: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 14,
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: '#21262D',
  },
  sickEmoji: {
    fontSize: 14,
  },
  sickVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  actionsGridCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButtonCompact: {
    flex: 1,
    minWidth: '45%',
    height: 48,
    borderRadius: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  actionNameMini: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  actionMetaMini: {
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.8,
  },
  dynamicEditor: {
    padding: 12,
    borderRadius: 20,
    gap: 10,
  },
  editorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  editorActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  saveButtonMini: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonTextMini: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  deleteButtonMini: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(231,76,60,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonTextMini: {
    color: '#E74C3C',
    fontSize: 10,
    fontWeight: '900',
  },
  shortcutButtonMini: {
    paddingHorizontal: 12,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutTextMini: {
    fontSize: 11,
    fontWeight: '900',
  },
  historyMini: {
    gap: 8,
  },
  historyListMini: {
    gap: 6,
  },
  historyItemMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#161B22',
  },
  historyNameMini: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  historyTimeMini: {
    fontSize: 12,
    opacity: 0.6,
  },
  editLinkMini: {
    fontSize: 11,
    fontWeight: '800',
  },
  timelineContainer: {
    gap: 16,
    marginVertical: 10,
  },
  timelineStatusCard: {
    borderRadius: 24,
    padding: 16,
    gap: 12,
  },
  timelineStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineStatusLabel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  lastMedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  lastMedInfo: {
    flex: 1,
    gap: 4,
  },
  lastMedTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  lastMedTime: {
    fontSize: 13,
    fontWeight: '600',
  },
  nextAllowedInfo: {
    alignItems: 'flex-end',
    gap: 2,
  },
  nextAllowedLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  nextAllowedTime: {
    fontSize: 18,
    fontWeight: '900',
  },
  sickModeContainer: {
    gap: 10,
  },
  sickModeTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#E74C3C',
    letterSpacing: 1.2,
  },
  sickModeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  sickModeCard: {
    flex: 1,
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#21262D',
  },
  sickModeIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  sickModeLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  sickModeValue: {
    fontSize: 13,
    fontWeight: '900',
  },
  quickActionsTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#8B949E',
    letterSpacing: 1.2,
  },
  quickActionButton: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 64,
    borderRadius: 18,
    padding: 12,
    justifyContent: 'center',
    borderWidth: 1,
  },
  quickActionName: {
    fontSize: 15,
    fontWeight: '900',
  },
  quickActionDose: {
    fontSize: 11,
    fontWeight: '600',
  },
  planSuggestionBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planSuggestionText: {
    fontSize: 13,
  },
  planStatusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  setupPlanButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupPlanText: {
    fontSize: 14,
    fontWeight: '800',
  },
  ageReference: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  addLink: {
    fontSize: 12,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  heroCard: {
    gap: 10,
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#21262D',
    backgroundColor: '#161B22',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  heroIconText: {
    fontSize: 22,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#F0F6FC',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 26,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusBadge: {
    minWidth: 76,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  statusDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 6,
  },
  timelineLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  timelineValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  timelineSubvalue: {
    fontSize: 13,
    lineHeight: 18,
  },
  quickMedicationStack: {
    gap: 10,
    marginTop: 4,
  },
  quickMedicationButton: {
    minHeight: 58,
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#21262D',
    backgroundColor: '#161B22',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickMedicationButtonSuccess: {
    borderColor: '#58A6FF',
    backgroundColor: 'rgba(88,166,255,0.14)',
  },
  quickMedicationTitle: {
    color: '#F0F6FC',
    fontSize: 17,
    fontWeight: '800',
  },
  quickMedicationSubtitle: {
    color: '#8B949E',
    fontSize: 12,
  },
  quickMedicationPlus: {
    color: '#58A6FF',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 26,
  },
  mobileChecklistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  checklistCard: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 82,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#21262D',
    backgroundColor: '#161B22',
    padding: 12,
    gap: 4,
  },
  checklistCardDone: {
    borderColor: '#58A6FF',
    backgroundColor: 'rgba(88,166,255,0.10)',
  },
  checklistIcon: {
    color: '#58A6FF',
    fontSize: 16,
    fontWeight: '900',
  },
  checklistTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  checklistDetail: {
    fontSize: 11,
    lineHeight: 15,
  },
  timelineDoseRow: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#21262D',
    backgroundColor: '#161B22',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timelineDoseName: {
    color: '#F0F6FC',
    fontSize: 14,
    fontWeight: '800',
  },
  timelineDoseMeta: {
    color: '#8B949E',
    fontSize: 12,
  },
  timelineDoseTime: {
    color: '#8B949E',
    fontSize: 13,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: '#8B949E',
    fontSize: 12,
    lineHeight: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: '#21262D',
  },
  closeButtonLabel: {
    color: '#F0F6FC',
    fontSize: 16,
    lineHeight: 16,
    fontWeight: '800',
  },
  sectionCard: {
    gap: 10,
    paddingVertical: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 21,
    textAlign: 'left',
  },
  sectionBody: {
    fontSize: 12,
    lineHeight: 16,
  },
  stack: {
    gap: 10,
  },
  infoStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  infoStripText: {
    color: '#F0F6FC',
    fontSize: 10,
    fontWeight: '800',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#21262D',
    backgroundColor: '#1C2128',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  smallChip: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#21262D',
    backgroundColor: '#1C2128',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallChipSelected: {
    backgroundColor: 'rgba(124,194,255,0.2)',
    borderColor: '#7CC2FF',
  },
  smallChipText: {
    color: '#F0F6FC',
    fontSize: 10,
    fontWeight: '800',
  },
  savedWrap: {
    gap: 8,
  },
  savedLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  savedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  savedChip: {
    minHeight: 36,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#21262D',
    backgroundColor: '#1A2029',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  savedChipTitle: {
    color: '#F0F6FC',
    fontSize: 12,
    fontWeight: '800',
  },
  savedChipSubtitle: {
    color: '#8B949E',
    fontSize: 10,
    fontWeight: '700',
  },
  savePresetButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2B7A55',
    backgroundColor: 'rgba(63,185,80,0.12)',
  },
  savePresetText: {
    color: '#B88A2A',
    fontSize: 10,
    fontWeight: '800',
  },
  notesToggleWrap: {
    alignItems: 'center',
  },
  notesToggle: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actions: {
    gap: 12,
  },
});
