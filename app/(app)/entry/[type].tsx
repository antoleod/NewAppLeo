import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Button, Card, Heading, Input, Page, Segment } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAppData } from '@/context/AppDataContext';
import { useLocale } from '@/context/LocaleContext';
import { clamp } from '@/utils/date';
import { BreastSide, EntryPayload, EntryType } from '@/types';
import { TimerWidget } from '@/components/TimerWidget';
import { QuantityPicker } from '@/components/QuantityPicker';
import { DateTimeField } from '@/components/DateTimeField';
import { getAppSettings } from '@/lib/storage';
import * as ImagePicker from 'expo-image-picker';

const typeLabels: Record<EntryType, string> = {
  feed: 'Feed',
  sleep: 'Sleep',
  diaper: 'Diaper',
  pump: 'Pump',
  measurement: 'Measurement',
  medication: 'Medication',
  milestone: 'Milestone',
  symptom: 'Symptom',
};

const symptomOptions = [
  { label: 'Irritable', value: 'irritable' },
  { label: 'Cry', value: 'cry' },
  { label: 'Green stool', value: 'green stool' },
  { label: 'Colic', value: 'colic' },
];

function typeSubtitle(type: EntryType) {
  switch (type) {
    case 'feed':
      return 'Track breast or bottle sessions with a timer or quick amount picker.';
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

  const titleLabel = useMemo(() => (editing ? `Edit ${typeLabels[editing.type]}` : `New ${typeLabels[type]}`), [editing, type]);

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

  const copy = {
    title: editing
      ? language === 'fr'
        ? `Modifier ${typeLabels[editing.type]}`
        : `Edit ${typeLabels[editing.type]}`
      : language === 'fr'
        ? `Nouvelle entree ${typeLabels[type]}`
        : `New ${typeLabels[type]}`,
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
      <Heading eyebrow={language === 'fr' ? 'Composer' : 'Composer'} title={copy.title} subtitle={copy.subtitle} />
      <Card>
        <DateTimeField label={language === 'fr' ? 'Quand' : 'When'} value={occurredAt} onChange={setOccurredAt} />

        {type === 'feed' ? (
          <View style={{ gap: 16 }}>
            <Segment
              value={mode}
              onChange={(value) => setMode(value as 'breast' | 'bottle')}
              options={[
                { label: 'Bottle', value: 'bottle' },
                { label: 'Breast', value: 'breast' },
              ]}
            />
            {mode === 'bottle' ? (
              <QuantityPicker value={Number(amountMl) || 0} onChange={(value) => setAmountMl(String(value))} largeTouchMode={largeTouchMode} />
            ) : (
              <>
                <TimerWidget
                  label={language === 'fr' ? 'Session sein' : 'Breast session'}
                  valueMinutes={Number(durationMin) || 0}
                  onChangeMinutes={(minutes) => setDurationMin(String(minutes))}
                  allowSides
                  side={side as 'left' | 'right' | 'both'}
                  onSideChange={(nextSide) => setSide(nextSide)}
                  largeTouchMode={largeTouchMode}
                />
                <QuantityPicker label={language === 'fr' ? 'Ml estimes' : 'Estimated ml'} value={Number(amountMl) || 0} onChange={(value) => setAmountMl(String(value))} largeTouchMode={largeTouchMode} />
              </>
            )}
          </View>
        ) : null}

        {type === 'sleep' ? <Input label={language === 'fr' ? 'Duree (min)' : 'Duration (min)'} value={durationMin} onChangeText={setDurationMin} keyboardType="numeric" inputMode="numeric" /> : null}

        {type === 'diaper' ? (
          <View style={{ gap: 16 }}>
            <Input label={language === 'fr' ? 'Pipi' : 'Pee'} value={pee} onChangeText={setPee} keyboardType="numeric" inputMode="numeric" />
            <Input label={language === 'fr' ? 'Caca' : 'Poop'} value={poop} onChangeText={setPoop} keyboardType="numeric" inputMode="numeric" />
            <Input label={language === 'fr' ? 'Vomi' : 'Vomit'} value={vomit} onChangeText={setVomit} keyboardType="numeric" inputMode="numeric" />
          </View>
        ) : null}

        {type === 'pump' ? (
          <View style={{ gap: 16 }}>
            <TimerWidget label={language === 'fr' ? 'Session tire-lait' : 'Pump session'} valueMinutes={Number(durationMin) || 0} onChangeMinutes={(minutes) => setDurationMin(String(minutes))} largeTouchMode={largeTouchMode} />
            <QuantityPicker value={Number(amountMl) || 0} onChange={(value) => setAmountMl(String(value))} largeTouchMode={largeTouchMode} />
          </View>
        ) : null}

        {type === 'measurement' ? (
          <View style={{ gap: 16 }}>
            <Input label={language === 'fr' ? 'Poids (kg)' : 'Weight (kg)'} value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" inputMode="decimal" />
            <Input label={language === 'fr' ? 'Taille (cm)' : 'Height (cm)'} value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" inputMode="decimal" />
            <Input label={language === 'fr' ? 'Perimetre cranien (cm)' : 'Head circumference (cm)'} value={headCircCm} onChangeText={setHeadCircCm} keyboardType="decimal-pad" inputMode="decimal" />
            <Input label={language === 'fr' ? 'Temperature (C)' : 'Temperature (C)'} value={tempC} onChangeText={setTempC} keyboardType="decimal-pad" inputMode="decimal" />
          </View>
        ) : null}

        {type === 'medication' ? (
          <View style={{ gap: 16 }}>
            <Input label={language === 'fr' ? 'Nom du medicament' : 'Medication name'} value={name} onChangeText={setName} />
            <Input label={language === 'fr' ? 'Dose' : 'Dosage'} value={dosage} onChangeText={setDosage} />
          </View>
        ) : null}

        {type === 'milestone' ? (
          <View style={{ gap: 16 }}>
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
          <View style={{ gap: 10 }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16, textAlign: 'center' }}>{language === 'fr' ? 'Tags' : 'Tags'}</Text>
            <Segment
              value={symptoms[0] ?? 'irritable'}
              onChange={(value) => setSymptoms((current) => Array.from(new Set([value, ...current])).slice(0, 4))}
              options={symptomOptions}
            />
          </View>
        ) : null}

        <Pressable onPress={() => setNotesOpen((current) => !current)} style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.primary, fontWeight: '800', textAlign: 'center' }}>{notesOpen ? '- Masquer la note' : '+ Ajouter une note'}</Text>
        </Pressable>
        {notesOpen ? <Input label={language === 'fr' ? 'Notes' : 'Notes'} value={notes} onChangeText={setNotes} multiline placeholder={language === 'fr' ? 'Details optionnels' : 'Optional details'} /> : null}

        <Button label={editing ? (language === 'fr' ? 'Mettre a jour' : 'Update entry') : language === 'fr' ? 'Enregistrer' : 'Save entry'} onPress={handleSave} loading={saving} />
        {editing ? <Button label={language === 'fr' ? 'Supprimer' : 'Delete entry'} onPress={handleDelete} variant="danger" /> : null}
      </Card>
    </Page>
  );
}
