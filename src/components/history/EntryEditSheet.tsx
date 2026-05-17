import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { Button, Input , DateTimeField } from '@/components/shared';

import { useTheme } from '@/context/ThemeContext';
import { haptics } from '@/lib/haptics';
import { spacing } from '@/theme';
import type { EntryRecord } from '@/types';

interface EntryEditSheetProps {
  entry: EntryRecord;
  onSave: (updated: EntryRecord) => Promise<void>;
  onClose: () => void;
  onDelete?: (id: string) => Promise<void>;
  bottomSheetModalRef: React.RefObject<BottomSheetModal>;
}

function isoStringToDate(iso: string): Date {
  if (!iso) return new Date();
  return new Date(iso);
}

function dateToIsoString(date: Date): string {
  return date.toISOString();
}

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function EntryEditSheet({ entry, onSave, onClose, onDelete, bottomSheetModalRef }: EntryEditSheetProps) {
  const { colors } = useTheme();
  const snapPoints = useMemo(() => ['80%'], []);
  const [date, setDate] = useState<Date>(isoStringToDate(entry.occurredAt));
  const [weight, setWeight] = useState(entry.payload.weightKg ? String(entry.payload.weightKg) : '');
  const [height, setHeight] = useState(entry.payload.heightCm ? String(entry.payload.heightCm) : '');
  const [headCirc, setHeadCirc] = useState(entry.payload.headCircCm ? String(entry.payload.headCircCm) : '');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    haptics.medium();
    setSaving(true);
    try {
      await onSave({
        ...entry,
        occurredAt: dateToIsoString(date),
        payload: {
          ...entry.payload,
          weightKg: parseNumber(weight),
          heightCm: parseNumber(height),
          headCircCm: parseNumber(headCirc),
        },
      });
      haptics.success();
      bottomSheetModalRef.current?.dismiss();
      onClose();
    } catch (error) {
      haptics.error();
      console.error('Error saving entry:', error);
    } finally {
      setSaving(false);
    }
  }, [entry, date, weight, height, headCirc, onSave, bottomSheetModalRef, onClose]);

  const handleDelete = useCallback(async () => {
    if (!onDelete) return;
    haptics.warning();
    setSaving(true);
    try {
      await onDelete(entry.id);
      haptics.success();
      bottomSheetModalRef.current?.dismiss();
      onClose();
    } catch (error) {
      haptics.error();
      console.error('Error deleting entry:', error);
    } finally {
      setSaving(false);
    }
  }, [entry.id, onDelete, bottomSheetModalRef, onClose]);

  const handleClose = useCallback(() => {
    haptics.light();
    bottomSheetModalRef.current?.dismiss();
    onClose();
  }, [bottomSheetModalRef, onClose]);

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={snapPoints}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
      backgroundStyle={{ backgroundColor: colors.bgCard }}
    >
      <BottomSheetView style={{ flex: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>
            Edit Measurement
          </Text>
          <Pressable onPress={handleClose} hitSlop={12} style={{ padding: 4 }}>
            <Text style={{ color: colors.textMuted, fontSize: 22, lineHeight: 24 }}>✕</Text>
          </Pressable>
        </View>

        <DateTimeField
          label="Date"
          value={date}
          onChange={setDate}
        />

        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginTop: spacing.lg, marginBottom: spacing.sm }}>
          Measurements
        </Text>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Input
              label="Weight (kg)"
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              inputMode="decimal"
              placeholder="0.0"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Height (cm)"
              value={height}
              onChangeText={setHeight}
              keyboardType="decimal-pad"
              inputMode="decimal"
              placeholder="0.0"
            />
          </View>
        </View>

        <Input
          label="Head circumference (cm)"
          value={headCirc}
          onChangeText={setHeadCirc}
          keyboardType="decimal-pad"
          inputMode="decimal"
          placeholder="0.0"
        />

        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
          <View style={{ flex: 1 }}>
            <Button
              label="Save"
              onPress={handleSave}
              loading={saving}
              disabled={saving}
              variant="primary"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Cancel"
              onPress={handleClose}
              disabled={saving}
              variant="secondary"
            />
          </View>
        </View>

        {onDelete && (
          <Button
            label="Delete"
            onPress={handleDelete}
            disabled={saving}
            variant="danger"
            style={{ marginTop: spacing.md }}
          />
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
}
