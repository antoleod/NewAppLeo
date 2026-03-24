import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Button, Card, Heading, Input, Page, Segment } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAppData } from '@/context/AppDataContext';
import { clamp } from '@/utils/date';
import { BreastSide, EntryPayload, EntryType } from '@/types';
import { TimerWidget } from '@/components/TimerWidget';
import { QuantityPicker } from '@/components/QuantityPicker';
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
  const [tempC, setTempC] = useState('');
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('sparkles');
  const [photoUri, setPhotoUri] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 16));
  const [saving, setSaving] = useState(false);
  const [largeTouchMode, setLargeTouchMode] = useState(false);

  const fieldCardStyle = { gap: 16 } as const;

  useEffect(() => {
    if (!editing) return;
    setOccurredAt(editing.occurredAt.slice(0, 16));
    setNotes(editing.notes ?? '');

    switch (editing.type) {
      case 'feed':
        setMode(editing.payload.mode ?? 'bottle');
        if (editing.payload.mode === 'bottle') {
          setAmountMl(String(editing.payload.amountMl ?? 150));
        } else {
          setSide(editing.payload.side ?? 'left');
          setDurationMin(String(editing.payload.durationMin ?? 30));
        }
        break;
      case 'sleep':
      case 'pump':
        setDurationMin(String(editing.payload.durationMin ?? 30));
        if (editing.type === 'pump') {
          setAmountMl(String(editing.payload.amountMl ?? 120));
        }
        break;
      case 'diaper':
        setPee(String(editing.payload.pee ?? 0));
        setPoop(String(editing.payload.poop ?? 0));
        setVomit(String(editing.payload.vomit ?? 0));
        break;
      case 'measurement':
        setWeightKg(editing.payload.weightKg ? String(editing.payload.weightKg) : '');
        setHeightCm(editing.payload.heightCm ? String(editing.payload.heightCm) : '');
        setTempC(editing.payload.tempC ? String(editing.payload.tempC) : '');
        break;
      case 'medication':
        setName(editing.payload.name ?? '');
        setDosage(editing.payload.dosage ?? '');
        break;
      case 'milestone':
        setTitle(editing.payload.title ?? '');
        setIcon(editing.payload.icon ?? 'sparkles');
        setPhotoUri(editing.payload.photoUri ?? '');
        break;
      case 'symptom':
        setSymptoms((editing.payload as any).tags ?? ((editing.payload.notes ?? '') as string).split(',').map((value) => value.trim()).filter(Boolean));
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
    if (presetAmount && Number.isFinite(presetAmount)) {
      setAmountMl(String(presetAmount));
    }
    if (presetMode) {
      setMode(presetMode);
    }
    if (presetSide) {
      setSide(presetSide);
    }
  }, [editing, presetAmount, presetMode, presetSide]);

  const titleLabel = editing ? `Edit ${typeLabels[editing.type]}` : `New ${typeLabels[type]}`;

  function buildPayload(): EntryPayload {
    switch (type) {
      case 'feed':
        return mode === 'bottle'
          ? { mode: 'bottle', amountMl: Number(amountMl) || 0, notes }
          : { mode: 'breast', side: side as BreastSide, durationMin: Number(durationMin) || 0, notes };
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
      const timestamp = new Date(occurredAt).toISOString();
      const payload = buildPayload();
      const titleValue = buildTitle();

      if (editing) {
        await updateEntry(editing.id, {
          type,
          title: titleValue,
          notes,
          occurredAt: timestamp,
          payload,
        } as any);
      } else {
        await addEntry({
          type,
          title: titleValue,
          notes,
          occurredAt: timestamp,
          payload,
        });
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

  return (
      <Page>
      <Heading eyebrow="Composer" title={titleLabel} subtitle={typeSubtitle(type)} />
      <Card>
        <Input label="When" value={occurredAt} onChangeText={setOccurredAt} hint="Use YYYY-MM-DD HH:mm" />

        {type === 'feed' ? (
          <View style={fieldCardStyle}>
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
                  label="Breast session"
                  valueMinutes={Number(durationMin) || 0}
                  onChangeMinutes={(minutes) => setDurationMin(String(minutes))}
                  allowSides
                  side={side as 'left' | 'right' | 'both'}
                  onSideChange={(nextSide) => setSide(nextSide)}
                  largeTouchMode={largeTouchMode}
                />
              </>
            )}
          </View>
        ) : null}

        {type === 'sleep' ? (
          <Input label="Duration (min)" value={durationMin} onChangeText={setDurationMin} keyboardType="numeric" inputMode="numeric" />
        ) : null}

        {type === 'diaper' ? (
          <View style={fieldCardStyle}>
            <Input label="Pee" value={pee} onChangeText={setPee} keyboardType="numeric" inputMode="numeric" />
            <Input label="Poop" value={poop} onChangeText={setPoop} keyboardType="numeric" inputMode="numeric" />
            <Input label="Vomit" value={vomit} onChangeText={setVomit} keyboardType="numeric" inputMode="numeric" />
          </View>
        ) : null}

        {type === 'pump' ? (
          <View style={fieldCardStyle}>
            <TimerWidget label="Pump session" valueMinutes={Number(durationMin) || 0} onChangeMinutes={(minutes) => setDurationMin(String(minutes))} largeTouchMode={largeTouchMode} />
            <QuantityPicker value={Number(amountMl) || 0} onChange={(value) => setAmountMl(String(value))} largeTouchMode={largeTouchMode} />
          </View>
        ) : null}

        {type === 'measurement' ? (
          <View style={fieldCardStyle}>
            <Input label="Weight (kg)" value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" inputMode="decimal" />
            <Input label="Height (cm)" value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" inputMode="decimal" />
            <Input label="Temperature (C)" value={tempC} onChangeText={setTempC} keyboardType="decimal-pad" inputMode="decimal" />
          </View>
        ) : null}

        {type === 'medication' ? (
          <View style={fieldCardStyle}>
            <Input label="Medication name" value={name} onChangeText={setName} />
            <Input label="Dosage" value={dosage} onChangeText={setDosage} />
          </View>
        ) : null}

        {type === 'milestone' ? (
          <View style={fieldCardStyle}>
            <Input label="Title" value={title} onChangeText={setTitle} />
            <Input label="Icon" value={icon} onChangeText={setIcon} />
            <Button
              label={photoUri ? 'Replace photo' : 'Attach photo'}
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
            {photoUri ? <Text style={{ color: colors.muted }}>Photo attached.</Text> : null}
          </View>
        ) : null}

        {type === 'symptom' ? (
          <View style={{ gap: 10 }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>Tags</Text>
            <Segment
              value={symptoms[0] ?? 'irritable'}
              onChange={(value) => setSymptoms((current) => Array.from(new Set([value, ...current])).slice(0, 4))}
              options={symptomOptions}
            />
          </View>
        ) : null}

        <Input label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Optional details" />
        <Button label={editing ? 'Update entry' : 'Save entry'} onPress={handleSave} loading={saving} />
        {editing ? <Button label="Delete entry" onPress={handleDelete} variant="danger" /> : null}
      </Card>
    </Page>
  );
}
