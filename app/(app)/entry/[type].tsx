import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, GestureResponderEvent } from 'react-native';
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
          <View style={[styles.heroIcon, { backgroundColor: meta.toneSoft, borderColor: meta.tone }]}>
            <Text style={styles.heroIconText}>{meta.icon}</Text>
          </View>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <Text style={styles.closeButtonLabel}>✕</Text>
          </Pressable>
        </View>
        <Text style={styles.heroTitle}>{typeLabels[type]}</Text>
      </View>

      <Card>
        {showDateTime && (
          <View style={styles.sectionCard}>
            <DateTimeField label={language === 'fr' ? 'Quand' : 'When'} value={occurredAt} onChange={setOccurredAt} />
          </View>
        )}
        {type === 'diaper' && (
          <View style={styles.sectionCard}>
            <DateTimeField label={language === 'fr' ? 'Quand' : 'When'} value={occurredAt} onChange={setOccurredAt} />
          </View>
        )}

        {type === 'feed' && (
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{language === 'fr' ? 'Type' : 'Type'}</Text>
            <Segment
              value={mode}
              onChange={(value) => setMode(value as 'breast' | 'bottle')}
              options={[
                { label: language === 'fr' ? 'Sein' : 'Breast', value: 'breast' },
                { label: language === 'fr' ? 'Biberon' : 'Bottle', value: 'bottle' },
              ]}
            />
            {mode === 'bottle' ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>{language === 'fr' ? 'Quantité' : 'Amount'}</Text>
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
                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>{language === 'fr' ? 'Durée' : 'Duration'}</Text>
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
            <Input label={language === 'fr' ? 'Aliment' : 'Food'} value={foodName} onChangeText={setFoodName} placeholder={language === 'fr' ? 'Pomme, riz...' : 'Apple, rice...'} />
            <Input label={language === 'fr' ? 'Quantité' : 'Quantity'} value={quantity} onChangeText={setQuantity} placeholder="250ml, 100g..." />
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
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{language === 'fr' ? 'Durée' : 'Duration'}</Text>
            <TimerWidget label={language === 'fr' ? 'Session (min)' : 'Session (min)'} valueMinutes={Number(durationMin) || 0} onChangeMinutes={(minutes) => setDurationMin(String(minutes))} largeTouchMode={largeTouchMode} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>{language === 'fr' ? 'Quantité' : 'Amount'}</Text>
            <QuantityPicker value={Number(amountMl) || 0} onChange={(value) => setAmountMl(String(value))} largeTouchMode={largeTouchMode} />
          </View>
        )}

        {type === 'measurement' && (
          <View style={styles.sectionCard}>
            <Input label={language === 'fr' ? 'Poids (kg)' : 'Weight (kg)'} value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" placeholder="5.2" />
            <Input label={language === 'fr' ? 'Taille (cm)' : 'Height (cm)'} value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" placeholder="52" />
            <Input label={language === 'fr' ? 'PC (cm)' : 'Head circ (cm)'} value={headCircCm} onChangeText={setHeadCircCm} keyboardType="decimal-pad" placeholder="35" />
            <Input label={language === 'fr' ? 'Température' : 'Temperature'} value={tempC} onChangeText={setTempC} keyboardType="decimal-pad" placeholder="37.5" />
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
            <Input label={language === 'fr' ? 'Nom' : 'Name'} value={name} onChangeText={setName} />
            <Input label={language === 'fr' ? 'Dosage' : 'Dosage'} value={dosage} onChangeText={setDosage} />
            {name.trim() && (
              <Pressable onPress={async () => setSavedMedicines(await upsertSavedMedicine({ name, dosage }))} style={[styles.savePresetButton, { marginTop: 8 }]}>
                <Text style={styles.savePresetText}>💾 {language === 'fr' ? 'Sauver' : 'Save'}</Text>
              </Pressable>
            )}
          </View>
        )}

        {type === 'milestone' && (
          <View style={styles.sectionCard}>
            <Input label={language === 'fr' ? 'Titre' : 'Title'} value={title} onChangeText={setTitle} placeholder={language === 'fr' ? 'Premier sourire...' : 'First smile...'} />
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
            <View style={styles.chipRow}>
              {vaccinePresets.map((preset) => (
                <Pressable
                  key={preset}
                  onPress={() => setVaccineName(preset)}
                  style={[styles.vaccineChip, vaccineName === preset && { backgroundColor: meta.toneSoft, borderColor: meta.tone }]}
                >
                  <Text style={[styles.vaccineChipText, vaccineName === preset && { color: meta.tone, fontWeight: '900' }]}>{preset}</Text>
                </Pressable>
              ))}
            </View>
            <Input label={language === 'fr' ? 'Nom' : 'Name'} value={vaccineName} onChangeText={setVaccineName} />
            <Input label={language === 'fr' ? 'Dose' : 'Dose'} value={vaccineDose} onChangeText={setVaccineDose} keyboardType="number-pad" placeholder="1" />
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 12 }]}>{language === 'fr' ? 'Prochaine dose' : 'Next dose'}</Text>
            <DateTimeField label={language === 'fr' ? 'Quand' : 'When'} value={vaccineNextDueDate} onChange={setVaccineNextDueDate} />
          </View>
        )}

        <View style={styles.notesToggleWrap}>
          <Pressable onPress={() => setNotesOpen((current) => !current)} style={styles.notesToggle}>
            <Text style={{ color: colors.primary, fontWeight: '800', textAlign: 'center' }}>{notesOpen ? '- ' : '+ '}{language === 'fr' ? 'Notes' : 'Notes'}</Text>
          </Pressable>
        </View>
        {notesOpen && <Input label={language === 'fr' ? 'Notes' : 'Notes'} value={notes} onChangeText={setNotes} multiline placeholder={language === 'fr' ? 'Optionnel...' : 'Optional...'} />}

        <View style={styles.actions}>
          <Button label={editing ? (language === 'fr' ? 'Mettre à jour' : 'Update') : language === 'fr' ? 'Enregistrer' : 'Save'} onPress={handleSave} loading={saving} />
          {editing && <Button label={language === 'fr' ? 'Supprimer' : 'Delete'} onPress={handleDelete} variant="danger" />}
        </View>
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#21262D',
    backgroundColor: '#161B22',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  heroIconText: {
    fontSize: 20,
  },
  heroTitle: {
    color: '#F0F6FC',
    fontSize: 20,
    fontWeight: '900',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C2128',
    borderWidth: 1,
    borderColor: '#21262D',
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
  vaccineChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#21262D',
    backgroundColor: '#1C2128',
  },
  vaccineChipText: {
    color: '#F0F6FC',
    fontSize: 10,
    fontWeight: '700',
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
