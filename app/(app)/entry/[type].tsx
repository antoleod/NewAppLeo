import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Button, Card, Heading, Input, Page, Segment } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAppData } from '@/context/AppDataContext';
import { clamp } from '@/utils/date';
import { EntryType } from '@/types';

const typeLabels: Record<EntryType, string> = {
  feed: 'Feed',
  sleep: 'Sleep',
  diaper: 'Diaper',
  pump: 'Pump',
  measurement: 'Measurement',
  medication: 'Medication',
  milestone: 'Milestone',
};

export default function EntryComposerScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ type?: string; id?: string }>();
  const { addEntry, updateEntry, deleteEntry, entryById } = useAppData();
  const type = (params.type as EntryType) || 'feed';
  const editing = params.id ? entryById(String(params.id)) : undefined;

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
  const [notes, setNotes] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 16));
  const [saving, setSaving] = useState(false);

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
        break;
    }
  }, [editing]);

  const titleLabel = editing ? `Edit ${typeLabels[editing.type]}` : `New ${typeLabels[type]}`;

  async function handleSave() {
    setSaving(true);
    try {
      const timestamp = new Date(occurredAt).toISOString();
      let payload: any;
      let titleValue = titleLabel;

      switch (type) {
        case 'feed':
          if (mode === 'bottle') {
            payload = { mode: 'bottle', amountMl: Number(amountMl) || 0, notes };
            titleValue = 'Bottle feed';
          } else {
            payload = { mode: 'breast', side, durationMin: Number(durationMin) || 0, notes };
            titleValue = 'Breast feed';
          }
          break;
        case 'sleep':
          payload = { durationMin: Number(durationMin) || 0, notes };
          titleValue = 'Sleep session';
          break;
        case 'diaper':
          payload = {
            pee: clamp(Number(pee) || 0, 0, 9),
            poop: clamp(Number(poop) || 0, 0, 9),
            vomit: clamp(Number(vomit) || 0, 0, 9),
            notes,
          };
          titleValue = 'Diaper log';
          break;
        case 'pump':
          payload = { durationMin: Number(durationMin) || 0, amountMl: Number(amountMl) || 0, notes };
          titleValue = 'Pump session';
          break;
        case 'measurement':
          payload = {
            weightKg: weightKg ? Number(weightKg) : undefined,
            heightCm: heightCm ? Number(heightCm) : undefined,
            tempC: tempC ? Number(tempC) : undefined,
            notes,
          };
          titleValue = 'Measurement';
          break;
        case 'medication':
          payload = { name, dosage, notes };
          titleValue = name || 'Medication';
          break;
        case 'milestone':
          payload = { title: title || 'Milestone', icon, notes };
          titleValue = title || 'Milestone';
          break;
      }

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
      <Heading eyebrow="Composer" title={titleLabel} subtitle="One clean form replaces the legacy modal maze." />
      <Card>
        <Input label="When" value={occurredAt} onChangeText={setOccurredAt} hint="Use YYYY-MM-DD HH:mm" />

        {type === 'feed' ? (
          <>
            <Segment
              value={mode}
              onChange={(value) => setMode(value as 'breast' | 'bottle')}
              options={[
                { label: 'Bottle', value: 'bottle' },
                { label: 'Breast', value: 'breast' },
              ]}
            />
            {mode === 'bottle' ? (
              <Input label="Amount (ml)" value={amountMl} onChangeText={setAmountMl} keyboardType="numeric" inputMode="numeric" />
            ) : (
              <>
                <Segment
                  value={side}
                  onChange={setSide}
                  options={[
                    { label: 'Left', value: 'left' },
                    { label: 'Right', value: 'right' },
                    { label: 'Both', value: 'both' },
                  ]}
                />
                <Input label="Duration (min)" value={durationMin} onChangeText={setDurationMin} keyboardType="numeric" inputMode="numeric" />
              </>
            )}
          </>
        ) : null}

        {type === 'sleep' ? <Input label="Duration (min)" value={durationMin} onChangeText={setDurationMin} keyboardType="numeric" inputMode="numeric" /> : null}

        {type === 'diaper' ? (
          <>
            <Input label="Pee" value={pee} onChangeText={setPee} keyboardType="numeric" inputMode="numeric" />
            <Input label="Poop" value={poop} onChangeText={setPoop} keyboardType="numeric" inputMode="numeric" />
            <Input label="Vomit" value={vomit} onChangeText={setVomit} keyboardType="numeric" inputMode="numeric" />
          </>
        ) : null}

        {type === 'pump' ? (
          <>
            <Input label="Duration (min)" value={durationMin} onChangeText={setDurationMin} keyboardType="numeric" inputMode="numeric" />
            <Input label="Amount (ml)" value={amountMl} onChangeText={setAmountMl} keyboardType="numeric" inputMode="numeric" />
          </>
        ) : null}

        {type === 'measurement' ? (
          <>
            <Input label="Weight (kg)" value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" inputMode="decimal" />
            <Input label="Height (cm)" value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" inputMode="decimal" />
            <Input label="Temperature (C)" value={tempC} onChangeText={setTempC} keyboardType="decimal-pad" inputMode="decimal" />
          </>
        ) : null}

        {type === 'medication' ? (
          <>
            <Input label="Medication name" value={name} onChangeText={setName} />
            <Input label="Dosage" value={dosage} onChangeText={setDosage} />
          </>
        ) : null}

        {type === 'milestone' ? (
          <>
            <Input label="Title" value={title} onChangeText={setTitle} />
            <Input label="Icon" value={icon} onChangeText={setIcon} />
          </>
        ) : null}

        <Input label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Optional details" />
        <Button label={editing ? 'Update entry' : 'Save entry'} onPress={handleSave} loading={saving} />
        {editing ? <Button label="Delete entry" onPress={handleDelete} variant="danger" /> : null}
      </Card>
    </Page>
  );
}
