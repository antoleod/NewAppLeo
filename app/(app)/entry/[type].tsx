import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Button, Card, Input, Page, Segment } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAppData } from '@/context/AppDataContext';
import { useLocale } from '@/context/LocaleContext';
import { clamp } from '@/utils/date';
import { BreastSide, EntryPayload, EntryType } from '@/types';
import { TimerWidget } from '@/components/TimerWidget';
import { QuantityPicker } from '@/components/QuantityPicker';
import { DateTimeField } from '@/components/DateTimeField';
import { getAppSettings, getSavedMedicines, upsertSavedMedicine, type SavedMedicine } from '@/lib/storage';
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
  { label: 'Irritable', value: 'irritable' },
  { label: 'Cry', value: 'cry' },
  { label: 'Green stool', value: 'green stool' },
  { label: 'Colic', value: 'colic' },
];

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
    tone: '#3FB950',
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

export default function EntryComposerScreen() {
  const { colors } = useTheme();
  const { language } = useLocale();
  const copy = entryCopy[language as keyof typeof entryCopy] ?? entryCopy.en;
  const params = useLocalSearchParams<{ type?: string; id?: string; presetAmount?: string; presetMode?: string; presetSide?: string }>();
  const { addEntry, updateEntry, deleteEntry, entryById } = useAppData();
  const type = (params.type as EntryType) || 'feed';
  const editing = params.id ? entryById(String(params.id)) : undefined;
  const presetAmount = typeof params.presetAmount === 'string' ? Number(params.presetAmount) : undefined;
  const presetMode = typeof params.presetMode === 'string' ? (params.presetMode as 'breast' | 'bottle') : undefined;
  const presetSide = typeof params.presetSide === 'string' ? params.presetSide : undefined;

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
  const meta = typeMeta[type];

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
      setSavedMedicines(await getSavedMedicines());
    })();
  }, []);

  useEffect(() => {
    if (editing) return;
    if (presetAmount && Number.isFinite(presetAmount)) setAmountMl(String(presetAmount));
    if (presetMode) setMode(presetMode);
    if (presetSide) setSide(presetSide);
  }, [editing, presetAmount, presetMode, presetSide]);

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
        return { name, dosage, notes };
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

  async function handleSave() {
    setSaving(true);
    try {
      const timestamp = occurredAt.toISOString();
      const payload = buildPayload();
      const titleValue = buildTitle();

      if (editing) {
        await updateEntry(editing.id, { type, title: titleValue, notes, occurredAt: timestamp, payload } as any);
      } else {
        await addEntry({ type, title: titleValue, notes, occurredAt: timestamp, payload });
      }
      if (type === 'medication' && name.trim()) {
        setSavedMedicines(await upsertSavedMedicine({ name, dosage }));
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
                    ? 'Nom, dosage et contexte.'
                    : 'Save the medication name, dosage, and any context.'
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
          <Text style={[styles.sectionLabel, { color: meta.tone }]}>{meta.eyebrow}</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{copy.whenItHappened}</Text>
          <Text style={[styles.sectionBody, { color: colors.muted }]}>{meta.details[0]}</Text>
          <DateTimeField label={copy.when} value={occurredAt} onChange={setOccurredAt} />
        </View>

        {type === 'feed' ? (
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionLabel, { color: meta.tone }]}>{copy.feedFlow}</Text>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{copy.breastOrBottle}</Text>
            <Text style={[styles.sectionBody, { color: colors.muted }]}>{meta.details[1]}</Text>
            <Segment
              value={mode}
              onChange={(value) => setMode(value as 'breast' | 'bottle')}
              options={[
                { label: copy.bottle, value: 'bottle' },
                { label: copy.breast, value: 'breast' },
              ]}
            />
            <View style={styles.chipRow}>
              <Pressable onPress={() => router.push('/entry/feed?presetMode=bottle&presetAmount=150')} style={styles.smallChip}>
                <Text style={styles.smallChipText}>+150 ml</Text>
              </Pressable>
              <Pressable onPress={() => setMode('breast')} style={styles.smallChip}>
                <Text style={styles.smallChipText}>{copy.timer}</Text>
              </Pressable>
              <Pressable onPress={() => setMode('bottle')} style={styles.smallChip}>
                <Text style={styles.smallChipText}>{typeLabels.feed}</Text>
              </Pressable>
            </View>
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
        ) : null}

        {type === 'food' ? (
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionLabel, { color: meta.tone }]}>{language === 'fr' ? 'FOOD FLOW' : 'FOOD FLOW'}</Text>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{language === 'fr' ? 'Repas et portions' : 'Meals and portions'}</Text>
            <Text style={[styles.sectionBody, { color: colors.muted }]}>{meta.details[0]}</Text>
            <Input label={copy.foodName} value={foodName} onChangeText={setFoodName} placeholder={language === 'fr' ? 'Pomme, riz, puree...' : 'Apple, rice, puree...'} />
            <Input label={copy.quantity} value={quantity} onChangeText={setQuantity} placeholder="250 ml / 120 g / 1 portion" />
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
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionLabel, { color: meta.tone }]}>{language === 'fr' ? 'MEDICINE FLOW' : 'MEDICINE FLOW'}</Text>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{language === 'fr' ? 'Nom, dose et contexte' : 'Name, dosage and context'}</Text>
            <Text style={[styles.sectionBody, { color: colors.muted }]}>{meta.details[0]}</Text>
            <View style={styles.chipRow}>
              <Pressable onPress={() => setName('Paracetamol')} style={styles.smallChip}>
                <Text style={styles.smallChipText}>Med</Text>
              </Pressable>
              <Pressable onPress={() => setDosage('1 dose')} style={styles.smallChip}>
                <Text style={styles.smallChipText}>Dose</Text>
              </Pressable>
              <Pressable onPress={() => setNotesOpen(true)} style={styles.smallChip}>
                <Text style={styles.smallChipText}>Time</Text>
              </Pressable>
            </View>
            <View style={styles.savedWrap}>
              <Text style={[styles.savedLabel, { color: colors.muted }]}>{language === 'fr' ? 'Medicaments sauvegardes' : 'Saved medicines'}</Text>
              <View style={styles.savedRow}>
                {savedMedicines.length ? (
                  savedMedicines.slice(0, 8).map((medicine) => (
                    <Pressable
                      key={`${medicine.name}-${medicine.dosage ?? ''}`}
                      onPress={() => {
                        setName(medicine.name);
                        if (medicine.dosage) setDosage(medicine.dosage);
                      }}
                      style={styles.savedChip}
                    >
                      <Text style={styles.savedChipTitle}>{medicine.name}</Text>
                      {medicine.dosage ? <Text style={styles.savedChipSubtitle}>{medicine.dosage}</Text> : null}
                    </Pressable>
                  ))
                ) : (
                  <Text style={[styles.sectionBody, { color: colors.muted }]}>{language === 'fr' ? 'Aucun modele garde.' : 'No saved medicine yet.'}</Text>
                )}
              </View>
              {name.trim() ? (
                <Pressable onPress={async () => setSavedMedicines(await upsertSavedMedicine({ name, dosage }))} style={styles.savePresetButton}>
                  <Text style={styles.savePresetText}>{language === 'fr' ? 'Sauver en modele' : 'Save as preset'}</Text>
                </Pressable>
              ) : null}
            </View>
            <Input label={language === 'fr' ? 'Nom du medicament' : 'Medication name'} value={name} onChangeText={setName} />
            <View style={styles.savedRow}>
              {savedMedicines
                .filter((medicine) => medicine.name.toLowerCase() === name.trim().toLowerCase())
                .map((medicine) => (
                  <Pressable key={`${medicine.name}-${medicine.dosage ?? ''}`} onPress={() => medicine.dosage && setDosage(medicine.dosage)} style={styles.smallChip}>
                    <Text style={styles.smallChipText}>{medicine.dosage || 'Usual dose'}</Text>
                  </Pressable>
                ))}
            </View>
            <Input label={language === 'fr' ? 'Dose' : 'Dosage'} value={dosage} onChangeText={setDosage} />
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
            <Text style={[styles.sectionBody, { color: colors.muted }]}>{meta.details[0]}</Text>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16, textAlign: 'center' }}>{language === 'fr' ? 'Tags' : 'Tags'}</Text>
            <Segment
              value={symptoms[0] ?? 'irritable'}
              onChange={(value) => setSymptoms((current) => Array.from(new Set([value, ...current])).slice(0, 4))}
              options={symptomOptions}
            />
          </View>
        ) : null}

        <View style={styles.notesToggleWrap}>
          <Pressable onPress={() => setNotesOpen((current) => !current)} style={styles.notesToggle}>
            <Text style={{ color: colors.primary, fontWeight: '800', textAlign: 'center' }}>{notesOpen ? '- Masquer la note' : '+ Ajouter une note'}</Text>
          </Pressable>
        </View>
        {notesOpen ? <Input label={language === 'fr' ? 'Notes' : 'Notes'} value={notes} onChangeText={setNotes} multiline placeholder={language === 'fr' ? 'Details optionnels' : 'Optional details'} /> : null}

        <View style={styles.actions}>
          <Button label={editing ? (language === 'fr' ? 'Mettre a jour' : 'Update entry') : language === 'fr' ? 'Enregistrer' : 'Save entry'} onPress={handleSave} loading={saving} />
          {editing ? <Button label={language === 'fr' ? 'Supprimer' : 'Delete entry'} onPress={handleDelete} variant="danger" /> : null}
        </View>
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
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
    color: '#3FB950',
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
