import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View, GestureResponderEvent } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Button, Card, Input, Page, Segment } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAppData } from '@/context/AppDataContext';
import { useLocale } from '@/context/LocaleContext';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { clamp } from '@/utils/date';
import { BreastSide, EntryPayload, EntryType } from '@/types';
import { TimerWidget } from '@/components/TimerWidget';
import { QuantityPicker } from '@/components/QuantityPicker';
import { DateTimeField } from '@/components/DateTimeField';
import { getAppSettings, getSavedMedicines, upsertSavedMedicine, type SavedMedicine } from '@/lib/storage';
import * as ImagePicker from 'expo-image-picker';
import { scheduleVaccineReminder } from '@/lib/notifications';
import { getSuggestedValues, getWeightCategory, getHeightCategory } from '@/lib/who-recommendations';

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
  temperature: 'Temperature',
  vaccine: 'Vaccine',
};

const symptomOptions = [
  { label: 'Irritable', value: 'irritable' },
  { label: 'Cry', value: 'cry' },
  { label: 'Green stool', value: 'green stool' },
  { label: 'Colic', value: 'colic' },
];

const vaccinePresets = ['BCG', 'Hepatitis B', 'DTP', 'Polio', 'MMR', 'Varicella', 'Rotavirus', 'PCV'];

const typeMeta: Record<
  EntryType,
  {
    icon: string;
    tone: string;
    toneSoft: string;
  }
> = {
  feed: {
    icon: '🍼',
    tone: '#C9A227',
    toneSoft: 'rgba(201,162,39,0.16)',
  },
  food: {
    icon: '🍲',
    tone: '#F0B85A',
    toneSoft: 'rgba(240,184,90,0.16)',
  },
  sleep: {
    icon: '😴',
    tone: '#58A6FF',
    toneSoft: 'rgba(88,166,255,0.16)',
  },
  diaper: {
    icon: '🧷',
    tone: '#E74C3C',
    toneSoft: 'rgba(231,76,60,0.16)',
  },
  pump: {
    icon: '🍼',
    tone: '#3FB950',
    toneSoft: 'rgba(63,185,80,0.16)',
  },
  measurement: {
    icon: '⚖️',
    tone: '#A371F7',
    toneSoft: 'rgba(163,113,247,0.16)',
  },
  medication: {
    icon: '💊',
    tone: '#7CC2FF',
    toneSoft: 'rgba(124,194,255,0.16)',
  },
  milestone: {
    icon: '✨',
    tone: '#D9B97D',
    toneSoft: 'rgba(217,185,125,0.16)',
  },
  symptom: {
    icon: '💬',
    tone: '#8EB5EA',
    toneSoft: 'rgba(142,181,234,0.16)',
  },
  temperature: {
    icon: '🌡️',
    tone: '#E74C3C',
    toneSoft: 'rgba(231,76,60,0.16)',
  },
  vaccine: {
    icon: '💉',
    tone: '#3FB950',
    toneSoft: 'rgba(63,185,80,0.16)',
  },
};

interface DiaperVolumeSliderProps {
  emoji: string;
  value: number;
  onChange: (value: number) => void;
  color: string;
}

function DiaperVolumeSlider({ emoji, value, onChange, color }: DiaperVolumeSliderProps) {
  function handleSlide(e: GestureResponderEvent) {
    const x = e.nativeEvent.locationX;
    const containerWidth = 280;
    const percentage = Math.max(0, Math.min(1, x / containerWidth));
    const newValue = Math.round(percentage * 9);
    onChange(newValue);
  }

  return (
    <View style={styles.diaperMinimal}>
      <Text style={styles.diaperMinimalEmoji}>{emoji}</Text>
      <Pressable onPress={handleSlide} style={[styles.diaperMinimalBar, { backgroundColor: color + '15', borderColor: color }]}>
        <View style={[styles.diaperMinimalFill, { width: `${(value / 9) * 100}%`, backgroundColor: color }]} />
      </Pressable>
      <Text style={[styles.diaperMinimalValue, { color }]}>{value}</Text>
    </View>
  );
}

export default function EntryComposerScreen() {
  const { colors } = useTheme();
  const { language } = useLocale();
  const { t } = useTranslation();
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
  const [vaccineTemp, setVaccineTemp] = useState('');
  const [vaccineName, setVaccineName] = useState('');
  const [vaccineDose, setVaccineDose] = useState('1');
  const [vaccineNextDueDate, setVaccineNextDueDate] = useState(new Date());
  const [showReminderFlow, setShowReminderFlow] = useState(false);
  const [reminderStep, setReminderStep] = useState<'vaccine' | 'date'>('vaccine');
  const [reminderVaccineName, setReminderVaccineName] = useState('');
  const [reminderVaccineDate, setReminderVaccineDate] = useState(new Date());
  const [showMedicationReminderFlow, setShowMedicationReminderFlow] = useState(false);
  const [reminderMedicationName, setReminderMedicationName] = useState('');
  const [reminderMedicationDate, setReminderMedicationDate] = useState(new Date());
  const [foodAllergies, setFoodAllergies] = useState<string[]>([]);
  const meta = typeMeta[type];
  const { profile } = useAuth();

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
        setFoodAllergies((editing.payload?.foodAllergies as string[]) ?? []);
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
      case 'temperature':
        setVaccineTemp(editing.payload?.tempC ? String(editing.payload.tempC) : '');
        break;
      case 'vaccine':
        setVaccineName(editing.payload?.vaccineName ?? '');
        setVaccineDose(String(editing.payload?.vaccineDose ?? 1));
        if (editing.payload?.vaccineNextDueDate) {
          setVaccineNextDueDate(new Date(editing.payload.vaccineNextDueDate));
        }
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
        return { foodName, quantity, foodAllergies: foodAllergies.length > 0 ? foodAllergies : undefined, notes };
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
      case 'temperature':
        return { tempC: vaccineTemp ? Number(vaccineTemp) : undefined, notes };
      case 'vaccine':
        return {
          vaccineName,
          vaccineDose: Number(vaccineDose) || 1,
          vaccineNextDueDate: vaccineNextDueDate.toISOString(),
          notes,
        };
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
      case 'temperature':
        return vaccineTemp ? `Temperature: ${vaccineTemp}°C` : 'Temperature reading';
      case 'vaccine':
        return vaccineName || 'Vaccine record';
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
      Alert.alert('Save failed', error?.message ?? 'Could not save this record.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveReminder() {
    if (!reminderVaccineName.trim()) {
      Alert.alert(
        language === 'fr' ? 'Vaccin requis' : 'Vaccine required',
        language === 'fr' ? 'Sélectionnez ou entrez un nom de vaccin.' : 'Please select or enter a vaccine name.'
      );
      return;
    }

    setSaving(true);
    try {
      const timestamp = reminderVaccineDate.toISOString();
      const payload = {
        vaccineName: reminderVaccineName,
        vaccineDose: 1,
        vaccineNextDueDate: reminderVaccineDate.toISOString(),
        hasReminder: true,
      };

      await addEntry({
        type: 'vaccine',
        title: reminderVaccineName,
        occurredAt: timestamp,
        payload,
      });

      // Schedule the reminder notification
      try {
        await scheduleVaccineReminder(reminderVaccineName, reminderVaccineDate.toISOString(), profile?.babyName ?? 'Baby');
      } catch (error) {
        console.error('Failed to schedule vaccine reminder:', error);
      }

      Alert.alert(
        language === 'fr' ? 'Rappel créé!' : 'Reminder created!',
        language === 'fr'
          ? `${reminderVaccineName} - Vous recevrez un rappel 7 jours avant.`
          : `${reminderVaccineName} - You'll get a reminder 7 days before.`
      );

      setShowReminderFlow(false);
      setReminderStep('vaccine');
      setReminderVaccineName('');
      setReminderVaccineDate(new Date());
      router.back();
    } catch (error: any) {
      Alert.alert('Save failed', error?.message ?? 'Could not save this record.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    await deleteEntry(editing.id);
    router.back();
  }

  const showDateTime = type !== 'diaper';

  return (
    <Page>
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroLeftContent}>
            <View style={[styles.heroIcon, { backgroundColor: meta.toneSoft, borderColor: meta.tone }]}>
              <Text style={styles.heroIconText}>{meta.icon}</Text>
            </View>
            <Text style={styles.heroEyebrow}>Composer</Text>
            <Text style={styles.heroTitle}>{typeLabels[type]}</Text>
          </View>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <Text style={styles.closeButtonLabel}>✕</Text>
          </Pressable>
        </View>
      </View>

      <Card>
        {showDateTime && (
          <View style={styles.sectionCard}>
            <DateTimeField label={t('entry.when')} value={occurredAt} onChange={setOccurredAt} />
          </View>
        )}
        {type === 'diaper' && (
          <View style={styles.sectionCard}>
            <DateTimeField label={t('entry.when')} value={occurredAt} onChange={setOccurredAt} />
          </View>
        )}

        {type === 'feed' && (
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('entry.type')}</Text>
            <Segment
              value={mode}
              onChange={(value) => setMode(value as 'breast' | 'bottle')}
              options={[
                { label: t('entry.breast'), value: 'breast' },
                { label: t('entry.bottle'), value: 'bottle' },
              ]}
            />
            {mode === 'bottle' ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>{t('entry.amount')}</Text>
                <View style={styles.chipRow}>
                  <Pressable onPress={() => setAmountMl('150')} style={[styles.quickChip, amountMl === '150' && { backgroundColor: meta.toneSoft, borderColor: meta.tone }]}>
                    <Text style={[styles.quickChipText, amountMl === '150' && { color: meta.tone, fontWeight: '900' }]}>150</Text>
                  </Pressable>
                  <Pressable onPress={() => setAmountMl('180')} style={[styles.quickChip, amountMl === '180' && { backgroundColor: meta.toneSoft, borderColor: meta.tone }]}>
                    <Text style={[styles.quickChipText, amountMl === '180' && { color: meta.tone, fontWeight: '900' }]}>180</Text>
                  </Pressable>
                  <Pressable onPress={() => setAmountMl('240')} style={[styles.quickChip, amountMl === '240' && { backgroundColor: meta.toneSoft, borderColor: meta.tone }]}>
                    <Text style={[styles.quickChipText, amountMl === '240' && { color: meta.tone, fontWeight: '900' }]}>240</Text>
                  </Pressable>
                </View>
                <QuantityPicker value={Number(amountMl) || 0} onChange={(value) => setAmountMl(String(value))} largeTouchMode={largeTouchMode} />
              </>
            ) : (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>{t('entry.duration')}</Text>
                <TimerWidget
                  label={language === 'fr' ? 'Durée (min)' : 'Duration (min)'}
                  valueMinutes={Number(durationMin) || 0}
                  onChangeMinutes={(minutes) => setDurationMin(String(minutes))}
                  allowSides
                  side={side as 'left' | 'right' | 'both'}
                  onSideChange={(nextSide) => setSide(nextSide)}
                  largeTouchMode={largeTouchMode}
                />
                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>{language === 'fr' ? 'Montant estimé' : 'Estimated amount'}</Text>
                <QuantityPicker value={Number(amountMl) || 0} onChange={(value) => setAmountMl(String(value))} largeTouchMode={largeTouchMode} />
              </>
            )}
          </View>
        )}

        {type === 'food' && (
          <View style={styles.sectionCard}>
            <View style={{ marginBottom: 12 }}>
              <Input
                label={t('food.foodLabel')}
                value={foodName}
                onChangeText={setFoodName}
                placeholder={language === 'fr' ? 'Pomme, riz, purée...' : 'Apple, rice, puree...'}
              />
            </View>

            <View>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 10 }]}>
                {t('entry.amount')}
              </Text>
              <View style={styles.chipRow}>
                <Pressable
                  onPress={() => setQuantity('peu')}
                  style={[styles.quickChip, quantity === 'peu' && { backgroundColor: meta.toneSoft, borderColor: meta.tone }]}
                >
                  <Text style={[styles.quickChipText, quantity === 'peu' && { color: meta.tone, fontWeight: '900' }]}>
                    {language === 'fr' ? 'Peu' : 'Little'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setQuantity('moyen')}
                  style={[styles.quickChip, quantity === 'moyen' && { backgroundColor: meta.toneSoft, borderColor: meta.tone }]}
                >
                  <Text style={[styles.quickChipText, quantity === 'moyen' && { color: meta.tone, fontWeight: '900' }]}>
                    {language === 'fr' ? 'Moyen' : 'Medium'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setQuantity('beaucoup')}
                  style={[styles.quickChip, quantity === 'beaucoup' && { backgroundColor: meta.toneSoft, borderColor: meta.tone }]}
                >
                  <Text style={[styles.quickChipText, quantity === 'beaucoup' && { color: meta.tone, fontWeight: '900' }]}>
                    {language === 'fr' ? 'Beaucoup' : 'Lots'}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={{ marginTop: 16 }}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 10 }]}>
                {language === 'fr' ? 'Réaction?' : 'Any reaction?'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {[
                  { label: language === 'fr' ? 'Allergie' : 'Allergy', value: 'allergy' },
                  { label: language === 'fr' ? 'Intolérance' : 'Intolerance', value: 'intolerance' },
                  { label: language === 'fr' ? 'Éruption' : 'Rash', value: 'rash' },
                  { label: language === 'fr' ? 'Vomissements' : 'Vomit', value: 'vomit' },
                  { label: language === 'fr' ? 'Diarrhée' : 'Diarrhea', value: 'diarrhea' },
                ].map(({ label, value }) => (
                  <Pressable
                    key={value}
                    onPress={() => {
                      if (foodAllergies.includes(value)) {
                        setFoodAllergies(foodAllergies.filter((a) => a !== value));
                      } else {
                        setFoodAllergies([...foodAllergies, value]);
                      }
                    }}
                    style={[
                      styles.reactionChip,
                      foodAllergies.includes(value) && { backgroundColor: meta.toneSoft, borderColor: meta.tone },
                    ]}
                  >
                    <Text style={[{ color: foodAllergies.includes(value) ? meta.tone : colors.muted, fontWeight: '600', fontSize: 12 }]}>
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}

        {type === 'sleep' && (
          <View style={styles.sectionCard}>
            <TimerWidget label={language === 'fr' ? 'Durée (min)' : 'Duration (min)'} valueMinutes={Number(durationMin) || 0} onChangeMinutes={(minutes) => setDurationMin(String(minutes))} largeTouchMode={largeTouchMode} />
            {durationMin && (
              <View style={[styles.infoStrip, { marginTop: 12 }]}>
                <Text style={styles.infoStripText}>😴 {Math.floor(Number(durationMin) / 60)}h {Number(durationMin) % 60}m</Text>
              </View>
            )}
          </View>
        )}

        {type === 'diaper' && (
          <View style={styles.sectionCard}>
            <View style={styles.diaperMinimalStack}>
              <DiaperVolumeSlider emoji="💧" value={Number(pee)} onChange={(val) => setPee(String(val))} color="#58A6FF" />
              <DiaperVolumeSlider emoji="💩" value={Number(poop)} onChange={(val) => setPoop(String(val))} color="#A371F7" />
              <DiaperVolumeSlider emoji="🤢" value={Number(vomit)} onChange={(val) => setVomit(String(val))} color="#F0B85A" />
            </View>
          </View>
        )}

        {type === 'pump' && (
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('entry.duration')}</Text>
            <TimerWidget label={language === 'fr' ? 'Session (min)' : 'Session (min)'} valueMinutes={Number(durationMin) || 0} onChangeMinutes={(minutes) => setDurationMin(String(minutes))} largeTouchMode={largeTouchMode} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>{t('entry.amount')}</Text>
            <QuantityPicker value={Number(amountMl) || 0} onChange={(value) => setAmountMl(String(value))} largeTouchMode={largeTouchMode} />
          </View>
        )}

        {type === 'measurement' && (
          <View style={styles.sectionCard}>
            {(() => {
              const suggested = profile?.babyBirthDate ? getSuggestedValues(profile.babyBirthDate) : null;
              const weightCat = weightKg && profile?.babyBirthDate ? getWeightCategory(Number(weightKg), profile.babyBirthDate) : null;
              const heightCat = heightCm && profile?.babyBirthDate ? getHeightCategory(Number(heightCm), profile.babyBirthDate) : null;

              return (
                <>
                  {suggested && (
                    <View style={[styles.whoSuggestedBox, { borderColor: meta.tone, backgroundColor: `${meta.tone}10` }]}>
                      <Text style={[styles.whoSuggestedTitle, { color: meta.tone }]}>💡 {language === 'fr' ? 'Suggestion selon OMS' : 'WHO Suggested Range'}</Text>
                      <Text style={[styles.whoSuggestedMessage, { color: colors.text }]}>{suggested.message}</Text>
                      <View style={styles.whoSuggestedRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.whoSuggestedLabel, { color: colors.muted }]}>
                            {t('entry.weight')}
                          </Text>
                          <Text style={[styles.whoSuggestedValue, { color: meta.tone }]}>
                            {suggested.weight.value.toFixed(1)} kg
                          </Text>
                          <Text style={[styles.whoSuggestedRange, { color: colors.muted }]}>
                            {suggested.weight.min.toFixed(1)} - {suggested.weight.max.toFixed(1)} kg
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.whoSuggestedLabel, { color: colors.muted }]}>
                            {t('entry.height')}
                          </Text>
                          <Text style={[styles.whoSuggestedValue, { color: meta.tone }]}>
                            {suggested.height.value.toFixed(1)} cm
                          </Text>
                          <Text style={[styles.whoSuggestedRange, { color: colors.muted }]}>
                            {suggested.height.min.toFixed(1)} - {suggested.height.max.toFixed(1)} cm
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  <View style={{ marginTop: suggested ? 12 : 0 }}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>📏 {language === 'fr' ? 'Mesures actuelles' : 'Current Measurements'}</Text>

                    <View style={{ marginTop: 12 }}>
                      <Input
                        label={language === 'fr' ? 'Poids (kg)' : 'Weight (kg)'}
                        value={weightKg}
                        onChangeText={setWeightKg}
                        keyboardType="decimal-pad"
                        placeholder={suggested ? suggested.weight.value.toFixed(1) : '5.2'}
                      />
                      {weightCat && (
                        <Text style={[styles.whoFeedback, { color: weightCat.category === 'healthy' ? '#3FB950' : '#F2C86F', marginTop: 8 }]}>
                          {weightCat.emoji} {weightCat.message}
                        </Text>
                      )}
                    </View>

                    <View style={{ marginTop: 12 }}>
                      <Input
                        label={language === 'fr' ? 'Taille (cm)' : 'Height (cm)'}
                        value={heightCm}
                        onChangeText={setHeightCm}
                        keyboardType="decimal-pad"
                        placeholder={suggested ? suggested.height.value.toFixed(1) : '52'}
                      />
                      {heightCat && (
                        <Text style={[styles.whoFeedback, { color: heightCat.category === 'healthy' ? '#3FB950' : '#F2C86F', marginTop: 8 }]}>
                          {heightCat.emoji} {heightCat.message}
                        </Text>
                      )}
                    </View>

                    <Input label={t('entry.headCirc')} value={headCircCm} onChangeText={setHeadCircCm} keyboardType="decimal-pad" placeholder="35" />
                    <Input label={language === 'fr' ? 'Température' : 'Temperature'} value={tempC} onChangeText={setTempC} keyboardType="decimal-pad" placeholder="37.5" />
                  </View>
                </>
              );
            })()}
          </View>
        )}

        {type === 'medication' && (
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{language === 'fr' ? 'Médicament' : 'Medication'}</Text>
            {savedMedicines.length > 0 && (
              <View style={styles.savedWrap}>
                <View style={styles.savedRow}>
                  {savedMedicines.slice(0, 4).map((med) => (
                    <Pressable
                      key={`${med.name}-${med.dosage}`}
                      onPress={() => {
                        setName(med.name);
                        if (med.dosage) setDosage(med.dosage);
                      }}
                      style={[styles.savedChip, name === med.name && { borderColor: meta.tone }]}
                    >
                      <Text style={styles.savedChipTitle}>{med.name}</Text>
                      {med.dosage && <Text style={styles.savedChipSubtitle}>{med.dosage}</Text>}
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
            <Input label={t('entry.medicationName')} value={name} onChangeText={setName} />
            <Input label={t('entry.dosage')} value={dosage} onChangeText={setDosage} />
            {name.trim() && (
              <Pressable onPress={async () => setSavedMedicines(await upsertSavedMedicine({ name, dosage }))} style={[styles.savePresetButton, { marginTop: 8 }]}>
                <Text style={styles.savePresetText}>💾 {language === 'fr' ? 'Sauver' : 'Save'}</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => setShowMedicationReminderFlow(true)}
              style={[
                styles.reminderToggle,
                { borderColor: meta.tone, backgroundColor: meta.toneSoft, marginTop: 12 },
              ]}
            >
              <Text style={[styles.reminderToggleCheckbox, { color: meta.tone }]}>+</Text>
              <Text style={[styles.reminderToggleLabel, { color: meta.tone }]}>
                {language === 'fr' ? 'Rappel pour la prochaine dose' : 'Reminder for next dose'}
              </Text>
            </Pressable>
          </View>
        )}

        {type === 'milestone' && (
          <View style={styles.sectionCard}>
            <Input label={t('entry.titleLabel')} value={title} onChangeText={setTitle} placeholder={language === 'fr' ? 'Premier sourire...' : 'First smile...'} />
            <Input label="Icon" value={icon} onChangeText={setIcon} placeholder="✨" />
            <Button
              label={photoUri ? (language === 'fr' ? '📸 Remplacer' : '📸 Replace') : language === 'fr' ? '📸 Ajouter' : '📸 Add'}
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
          </View>
        )}

        {type === 'symptom' && (
          <View style={styles.sectionCard}>
            <View style={styles.chipRow}>
              {symptomOptions.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() =>
                    setSymptoms((current) => {
                      const newSymptoms = current.includes(option.value)
                        ? current.filter((s) => s !== option.value)
                        : Array.from(new Set([option.value, ...current])).slice(0, 4);
                      return newSymptoms;
                    })
                  }
                  style={[styles.symptomChip, symptoms.includes(option.value) && { backgroundColor: meta.toneSoft, borderColor: meta.tone }]}
                >
                  <Text style={[styles.symptomChipText, symptoms.includes(option.value) && { color: meta.tone, fontWeight: '900' }]}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {type === 'temperature' && (
          <View style={styles.sectionCard}>
            <View style={styles.tempPresets}>
              <Pressable onPress={() => setVaccineTemp('36.5')} style={[styles.tempPreset, vaccineTemp === '36.5' && { backgroundColor: meta.toneSoft, borderColor: meta.tone }]}>
                <Text style={[styles.tempPresetText, vaccineTemp === '36.5' && { color: meta.tone, fontWeight: '900' }]}>36.5</Text>
              </Pressable>
              <Pressable onPress={() => setVaccineTemp('37.5')} style={[styles.tempPreset, vaccineTemp === '37.5' && { backgroundColor: meta.toneSoft, borderColor: meta.tone }]}>
                <Text style={[styles.tempPresetText, vaccineTemp === '37.5' && { color: meta.tone, fontWeight: '900' }]}>37.5</Text>
              </Pressable>
              <Pressable onPress={() => setVaccineTemp('38.5')} style={[styles.tempPreset, vaccineTemp === '38.5' && { backgroundColor: meta.toneSoft, borderColor: meta.tone }]}>
                <Text style={[styles.tempPresetText, vaccineTemp === '38.5' && { color: meta.tone, fontWeight: '900' }]}>38.5</Text>
              </Pressable>
            </View>

            <View style={styles.tempInputRow}>
              <Pressable
                onPress={() => {
                  const current = Number(vaccineTemp) || 37.5;
                  setVaccineTemp((Math.max(35, current - 0.1)).toFixed(1));
                }}
                style={styles.tempButton}
              >
                <Text style={styles.tempButtonText}>−</Text>
              </Pressable>

              <View style={{ flex: 1 }}>
                <Input
                  label="°C"
                  value={vaccineTemp}
                  onChangeText={(text) => {
                    const cleanText = text.replace(/[^0-9.]/g, '');
                    if (cleanText === '' || /^\d*\.?\d{0,2}$/.test(cleanText)) {
                      setVaccineTemp(cleanText);
                    }
                  }}
                  placeholder="37.5"
                  keyboardType="decimal-pad"
                  inputMode="decimal"
                />
              </View>

              <Pressable
                onPress={() => {
                  const current = Number(vaccineTemp) || 37.5;
                  setVaccineTemp((Math.min(42, current + 0.1)).toFixed(1));
                }}
                style={styles.tempButton}
              >
                <Text style={styles.tempButtonText}>+</Text>
              </Pressable>
            </View>

            {vaccineTemp && (
              <View style={styles.tempStatusContainer}>
                {Number(vaccineTemp) < 37.5 ? (
                  <View style={[styles.tempStatus, { backgroundColor: 'rgba(63,185,80,0.16)', borderColor: '#3FB950' }]}>
                    <Text style={[styles.tempStatusText, { color: '#3FB950' }]}>✓ {language === 'fr' ? 'Normal' : 'Normal'}</Text>
                  </View>
                ) : Number(vaccineTemp) < 38 ? (
                  <View style={[styles.tempStatus, { backgroundColor: 'rgba(242,200,111,0.16)', borderColor: '#F2C86F' }]}>
                    <Text style={[styles.tempStatusText, { color: '#F2C86F' }]}>⚠ {language === 'fr' ? 'Febrícula' : 'Mild fever'}</Text>
                  </View>
                ) : (
                  <View style={[styles.tempStatus, { backgroundColor: 'rgba(231,76,60,0.16)', borderColor: '#E74C3C' }]}>
                    <Text style={[styles.tempStatusText, { color: '#E74C3C' }]}>🚨 {language === 'fr' ? 'Fievre' : 'Fever'}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {type === 'vaccine' && (
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{language === 'fr' ? 'Vaccin' : 'Vaccine'}</Text>

            <Text style={[styles.sectionBody, { color: colors.muted, marginBottom: 10 }]}>{language === 'fr' ? 'Choisir un vaccin:' : 'Choose a vaccine:'}</Text>
            <View style={styles.vaccinePresetsGrid}>
              {vaccinePresets.map((preset) => (
                <Pressable
                  key={preset}
                  onPress={() => setVaccineName(preset)}
                  style={[styles.vaccinePresetBtn, vaccineName === preset && { backgroundColor: meta.toneSoft, borderColor: meta.tone }]}
                >
                  <Text style={[styles.vaccinePresetText, vaccineName === preset && { color: meta.tone, fontWeight: '900' }]}>{preset}</Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setVaccineName('')}
                style={[styles.vaccinePresetBtn, styles.vaccineAddBtnInGrid, { borderColor: meta.tone }]}
              >
                <Text style={[styles.vaccinePresetText, { color: meta.tone, fontSize: 20 }]}>+</Text>
              </Pressable>
            </View>

            {vaccineName === '' && (
              <>
                <Text style={[styles.sectionBody, { color: colors.muted, marginBottom: 10, marginTop: 12 }]}>{language === 'fr' ? 'Nom du vaccin' : 'Vaccine name'}</Text>
                <Input
                  label=""
                  value={vaccineName}
                  onChangeText={setVaccineName}
                  placeholder={language === 'fr' ? 'Entrez le nom du vaccin...' : 'Enter vaccine name...'}
                />
              </>
            )}

            {vaccineName && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>{language === 'fr' ? 'Numero de dose' : 'Dose number'}</Text>
                <View style={styles.vaccineInputRow}>
                  <Pressable
                    onPress={() => setVaccineDose(String(Math.max(1, Number(vaccineDose) - 1)))}
                    style={styles.vaccineDoseButton}
                  >
                    <Text style={styles.vaccineDoseButtonText}>−</Text>
                  </Pressable>

                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={[styles.vaccineDoseDisplay, { color: meta.tone }]}>
                      {language === 'fr' ? 'Dose ' : 'Dose '}{vaccineDose}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => setVaccineDose(String(Math.min(5, Number(vaccineDose) + 1)))}
                    style={styles.vaccineDoseButton}
                  >
                    <Text style={styles.vaccineDoseButtonText}>+</Text>
                  </Pressable>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>{language === 'fr' ? 'Prochaine dose' : 'Next dose scheduled'}</Text>
                <Text style={[styles.sectionBody, { color: colors.muted, marginBottom: 8 }]}>{language === 'fr' ? 'Date prevue pour la prochaine dose' : 'When is the next dose scheduled'}</Text>
                <DateTimeField label={t('entry.when')} value={vaccineNextDueDate} onChange={setVaccineNextDueDate} />
              </>
            )}

            <Pressable
              onPress={() => setShowReminderFlow(true)}
              style={[
                styles.reminderToggle,
                { borderColor: meta.tone, backgroundColor: meta.toneSoft },
              ]}
            >
              <Text style={[styles.reminderToggleCheckbox, { color: meta.tone }]}>+</Text>
              <Text style={[styles.reminderToggleLabel, { color: meta.tone }]}>
                {language === 'fr' ? 'Ajouter un rappel pour plus tard' : 'Add reminder for later'}
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.notesToggleWrap}>
          <Pressable onPress={() => setNotesOpen((current) => !current)} style={styles.notesToggle}>
            <Text style={{ color: colors.primary, fontWeight: '800', textAlign: 'center' }}>{notesOpen ? '- ' : '+ '}{language === 'fr' ? 'Notes' : 'Notes'}</Text>
          </Pressable>
        </View>
        {notesOpen && <Input label={language === 'fr' ? 'Notes' : 'Notes'} value={notes} onChangeText={setNotes} multiline placeholder={language === 'fr' ? 'Optionnel...' : 'Optional...'} />}
      </Card>

      {/* Sticky Footer Actions */}
      <View style={[styles.actionsStickyContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <View style={styles.actions}>
          <Button label={editing ? (language === 'fr' ? 'Mettre à jour' : 'Update') : language === 'fr' ? 'Enregistrer' : 'Save'} onPress={handleSave} loading={saving} />
          {editing && <Button label={language === 'fr' ? 'Supprimer' : 'Delete'} onPress={handleDelete} variant="danger" />}
        </View>
      </View>

      {/* Medication Reminder Flow Modal */}
      {type === 'medication' && (
        <Modal visible={showMedicationReminderFlow} transparent animationType="slide" onRequestClose={() => setShowMedicationReminderFlow(false)}>
          <View style={styles.reminderModalOverlay}>
            <View style={styles.reminderModalContent}>
              <View style={styles.reminderModalHeader}>
                <Text style={styles.reminderModalTitle}>{language === 'fr' ? 'Rappel médicament' : 'Medication Reminder'}</Text>
                <Text style={[styles.reminderModalSubtitle, { color: colors.muted }]}>
                  {language === 'fr' ? 'Prochaine dose' : 'Next dose'}
                </Text>
              </View>

              <View style={styles.reminderCustomSection}>
                <Text style={[styles.reminderLabel, { color: colors.muted }]}>
                  {language === 'fr' ? 'Médicament:' : 'Medication:'}
                </Text>
                {savedMedicines.length > 0 && (
                  <View style={styles.reminderModalGrid}>
                    {savedMedicines.map((med) => (
                      <Pressable
                        key={`${med.name}-${med.dosage}`}
                        onPress={() => setReminderMedicationName(med.name)}
                        style={[
                          styles.reminderPresetBtn,
                          reminderMedicationName === med.name && { backgroundColor: meta.toneSoft, borderColor: meta.tone },
                        ]}
                      >
                        <Text style={[styles.reminderPresetText, reminderMedicationName === med.name && { color: meta.tone, fontWeight: '900' }]}>
                          {med.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                <Input
                  label=""
                  value={reminderMedicationName}
                  onChangeText={setReminderMedicationName}
                  placeholder={language === 'fr' ? 'Nom du médicament...' : 'Medication name...'}
                />
              </View>

              <View style={styles.reminderDateSection}>
                <Text style={[styles.reminderLabel, { color: colors.muted, marginBottom: 12 }]}>
                  {language === 'fr' ? 'Prochaine prise:' : 'Next dose at:'}
                </Text>
                <DateTimeField
                  label={language === 'fr' ? 'Date et heure' : 'Date and time'}
                  value={reminderMedicationDate}
                  onChange={setReminderMedicationDate}
                />
              </View>

              <View style={styles.reminderSummary}>
                <Text style={[styles.reminderSummaryTitle, { color: colors.text }]}>
                  {language === 'fr' ? 'Récapitulatif' : 'Summary'}
                </Text>
                <View style={styles.reminderSummaryItem}>
                  <Text style={{ color: colors.muted }}>💊 {language === 'fr' ? 'Médicament:' : 'Medication:'}</Text>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{reminderMedicationName}</Text>
                </View>
                <View style={styles.reminderSummaryItem}>
                  <Text style={{ color: colors.muted }}>⏰ {language === 'fr' ? 'Prochaine prise:' : 'Next dose:'}</Text>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>
                    {reminderMedicationDate.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')} {reminderMedicationDate.toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>

              <View style={styles.reminderActions}>
                <Button
                  label={language === 'fr' ? 'Créer le rappel' : 'Create reminder'}
                  onPress={() => {
                    if (!reminderMedicationName.trim()) {
                      Alert.alert(
                        language === 'fr' ? 'Médicament requis' : 'Medication required',
                        language === 'fr' ? 'Entrez le nom du médicament.' : 'Please enter medication name.'
                      );
                      return;
                    }
                    // Schedule reminder (24h before)
                    const reminderTime = new Date(reminderMedicationDate.getTime() - 24 * 60 * 60 * 1000);
                    Alert.alert(
                      language === 'fr' ? 'Rappel créé!' : 'Reminder created!',
                      language === 'fr'
                        ? `${reminderMedicationName} - Rappel programmé pour ${reminderTime.toLocaleDateString('fr-FR')}`
                        : `${reminderMedicationName} - Reminder set for ${reminderTime.toLocaleDateString('en-US')}`
                    );
                    setShowMedicationReminderFlow(false);
                    setReminderMedicationName('');
                    setReminderMedicationDate(new Date());
                  }}
                />
                <Button
                  label={language === 'fr' ? 'Annuler' : 'Cancel'}
                  variant="ghost"
                  onPress={() => setShowMedicationReminderFlow(false)}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Vaccine Reminder Flow Modal */}
      {type === 'vaccine' && (
        <Modal visible={showReminderFlow} transparent animationType="slide" onRequestClose={() => setShowReminderFlow(false)}>
          <View style={styles.reminderModalOverlay}>
            <View style={styles.reminderModalContent}>
              {reminderStep === 'vaccine' && (
                <>
                  <View style={styles.reminderModalHeader}>
                    <Text style={styles.reminderModalTitle}>{language === 'fr' ? 'Rappel de vaccin' : 'Vaccine Reminder'}</Text>
                    <Text style={[styles.reminderModalSubtitle, { color: colors.muted }]}>
                      {language === 'fr' ? '1/2 - Choisir le vaccin' : '1/2 - Choose vaccine'}
                    </Text>
                  </View>

                  <View style={styles.reminderModalGrid}>
                    {vaccinePresets.map((preset) => (
                      <Pressable
                        key={preset}
                        onPress={() => setReminderVaccineName(preset)}
                        style={[
                          styles.reminderPresetBtn,
                          reminderVaccineName === preset && { backgroundColor: meta.toneSoft, borderColor: meta.tone },
                        ]}
                      >
                        <Text style={[styles.reminderPresetText, reminderVaccineName === preset && { color: meta.tone, fontWeight: '900' }]}>
                          {preset}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <View style={styles.reminderCustomSection}>
                    <Text style={[styles.reminderLabel, { color: colors.muted }]}>
                      {language === 'fr' ? 'Ou saisir un autre nom:' : 'Or enter another name:'}
                    </Text>
                    <Input
                      label=""
                      value={reminderVaccineName}
                      onChangeText={setReminderVaccineName}
                      placeholder={language === 'fr' ? 'Nom du vaccin...' : 'Vaccine name...'}
                    />
                  </View>

                  <View style={styles.reminderActions}>
                    <Button
                      label={language === 'fr' ? 'Continuer' : 'Continue'}
                      onPress={() => setReminderStep('date')}
                      disabled={!reminderVaccineName.trim()}
                    />
                    <Button
                      label={language === 'fr' ? 'Annuler' : 'Cancel'}
                      variant="ghost"
                      onPress={() => setShowReminderFlow(false)}
                    />
                  </View>
                </>
              )}

              {reminderStep === 'date' && (
                <>
                  <View style={styles.reminderModalHeader}>
                    <Text style={styles.reminderModalTitle}>{language === 'fr' ? 'Rappel de vaccin' : 'Vaccine Reminder'}</Text>
                    <Text style={[styles.reminderModalSubtitle, { color: colors.muted }]}>
                      {language === 'fr' ? '2/2 - Choisir la date' : '2/2 - Choose date'}
                    </Text>
                  </View>

                  <View style={styles.reminderDateSection}>
                    <Text style={[styles.reminderLabel, { color: colors.muted, marginBottom: 12 }]}>
                      {language === 'fr' ? 'Quand sera la prochaine dose?' : 'When will the next dose be?'}
                    </Text>
                    <DateTimeField
                      label={language === 'fr' ? 'Date et heure' : 'Date and time'}
                      value={reminderVaccineDate}
                      onChange={setReminderVaccineDate}
                    />
                  </View>

                  <View style={styles.reminderSummary}>
                    <Text style={[styles.reminderSummaryTitle, { color: colors.text }]}>
                      {language === 'fr' ? 'Récapitulatif' : 'Summary'}
                    </Text>
                    <View style={styles.reminderSummaryItem}>
                      <Text style={{ color: colors.muted }}>💉 {language === 'fr' ? 'Vaccin:' : 'Vaccine:'}</Text>
                      <Text style={{ color: colors.text, fontWeight: '700' }}>{reminderVaccineName}</Text>
                    </View>
                    <View style={styles.reminderSummaryItem}>
                      <Text style={{ color: colors.muted }}>📅 {language === 'fr' ? 'Date:' : 'Date:'}</Text>
                      <Text style={{ color: colors.text, fontWeight: '700' }}>
                        {reminderVaccineDate.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.reminderActions}>
                    <Button
                      label={language === 'fr' ? 'Créer le rappel' : 'Create reminder'}
                      onPress={handleSaveReminder}
                      loading={saving}
                    />
                    <Button
                      label={language === 'fr' ? 'Retour' : 'Back'}
                      variant="ghost"
                      onPress={() => setReminderStep('vaccine')}
                    />
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#21262D',
    backgroundColor: '#161B22',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  heroIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  heroIconText: {
    fontSize: 18,
  },
  heroEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#8B949E',
    flexShrink: 0,
  },
  heroTitle: {
    color: '#F0F6FC',
    fontSize: 16,
    fontWeight: '900',
    flexShrink: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C2128',
    borderWidth: 1,
    borderColor: '#21262D',
    flexShrink: 0,
  },
  closeButtonLabel: {
    color: '#F0F6FC',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionCard: {
    gap: 10,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  stack: {
    gap: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#21262D',
    backgroundColor: '#1C2128',
  },
  quickChipText: {
    color: '#F0F6FC',
    fontSize: 11,
    fontWeight: '700',
  },
  symptomChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#21262D',
    backgroundColor: '#1C2128',
  },
  symptomChipText: {
    color: '#F0F6FC',
    fontSize: 12,
    fontWeight: '600',
  },
  vaccinePresetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  vaccinePresetBtn: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#21262D',
    backgroundColor: '#1C2128',
    alignItems: 'center',
  },
  vaccinePresetText: {
    color: '#F0F6FC',
    fontSize: 11,
    fontWeight: '700',
  },
  vaccineAddBtnInGrid: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  vaccineInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  vaccineDoseButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#1C2128',
    borderWidth: 1,
    borderColor: '#21262D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaccineDoseButtonText: {
    color: '#F0F6FC',
    fontSize: 20,
    fontWeight: '700',
  },
  vaccineDoseDisplay: {
    fontSize: 16,
    fontWeight: '900',
  },
  reminderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    marginTop: 16,
  },
  reminderToggleCheckbox: {
    fontSize: 18,
    fontWeight: '700',
    width: 24,
    textAlign: 'center',
  },
  reminderToggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  reminderModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  reminderModalContent: {
    backgroundColor: '#0D1117',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  reminderModalHeader: {
    marginBottom: 24,
  },
  reminderModalTitle: {
    color: '#F0F6FC',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  reminderModalSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  reminderModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  reminderPresetBtn: {
    flex: 1,
    minWidth: '31%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#21262D',
    backgroundColor: '#1C2128',
    alignItems: 'center',
  },
  reminderPresetText: {
    color: '#F0F6FC',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  reminderCustomSection: {
    marginBottom: 20,
  },
  reminderLabel: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '600',
  },
  reminderDateSection: {
    marginBottom: 20,
  },
  reminderSummary: {
    backgroundColor: 'rgba(201, 162, 39, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(201, 162, 39, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 20,
    gap: 10,
  },
  reminderSummaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  reminderSummaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderActions: {
    gap: 8,
  },
  actionsStickyContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#21262D',
    gap: 8,
  },
  reactionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#21262D',
    backgroundColor: '#1C2128',
  },
  whoSuggestedBox: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  whoSuggestedTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  whoSuggestedMessage: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
    fontWeight: '500',
  },
  whoSuggestedRow: {
    flexDirection: 'row',
    gap: 12,
  },
  whoSuggestedLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  whoSuggestedValue: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  whoSuggestedRange: {
    fontSize: 10,
    fontWeight: '500',
  },
  whoFeedback: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  sectionBody: {
    fontSize: 12,
    lineHeight: 16,
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
  tempPresets: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tempPreset: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#21262D',
    backgroundColor: '#1C2128',
    alignItems: 'center',
  },
  tempPresetText: {
    color: '#F0F6FC',
    fontSize: 13,
    fontWeight: '700',
  },
  tempInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tempButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#1C2128',
    borderWidth: 1,
    borderColor: '#21262D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tempButtonText: {
    color: '#F0F6FC',
    fontSize: 22,
    fontWeight: '700',
  },
  tempStatusContainer: {
    marginTop: 12,
  },
  tempStatus: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  tempStatusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  diaperMinimalStack: {
    gap: 16,
  },
  diaperMinimal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  diaperMinimalEmoji: {
    fontSize: 32,
    minWidth: 40,
  },
  diaperMinimalBar: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  diaperMinimalFill: {
    height: '100%',
    borderRadius: 9,
  },
  diaperMinimalValue: {
    fontSize: 22,
    fontWeight: '900',
    minWidth: 35,
    textAlign: 'right',
  },
  savedWrap: {
    gap: 8,
    marginBottom: 8,
  },
  savedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  savedChip: {
    minHeight: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#21262D',
    backgroundColor: '#1A2029',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 2,
  },
  savedChipTitle: {
    color: '#F0F6FC',
    fontSize: 11,
    fontWeight: '700',
  },
  savedChipSubtitle: {
    color: '#8B949E',
    fontSize: 9,
    fontWeight: '600',
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
    fontWeight: '700',
  },
  notesToggleWrap: {
    alignItems: 'center',
    marginVertical: 8,
  },
  notesToggle: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actions: {
    gap: 10,
    marginTop: 8,
  },
});
