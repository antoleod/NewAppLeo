import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { Button, Input } from '@/components/ui';
import { DateTimeField } from '@/components/DateTimeField';
import { useTheme } from '@/context/ThemeContext';
import { haptics } from '@/lib/haptics';
import { spacing } from '@/theme';

export interface BabyProfile {
  id: string;
  name: string;
  birthDate: string;
  sex?: 'female' | 'male' | 'unspecified';
  birthWeightKg?: number;
  currentWeightKg?: number;
  heightCm?: number;
}

interface BabyEditSheetProps {
  baby: BabyProfile;
  onSave: (updated: BabyProfile) => Promise<void>;
  onClose: () => void;
  bottomSheetModalRef: React.RefObject<BottomSheetModal>;
}

function isoStringToDate(iso: string): Date {
  if (!iso) return new Date();
  return new Date(iso + 'T00:00:00.000Z');
}

function dateToIsoString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function BabyEditSheet({ baby, onSave, onClose, bottomSheetModalRef }: BabyEditSheetProps) {
  const { colors } = useTheme();
  const snapPoints = useMemo(() => ['85%'], []);
  const [name, setName] = useState(baby.name);
  const [birthDate, setBirthDate] = useState<Date>(isoStringToDate(baby.birthDate));
  const [birthWeight, setBirthWeight] = useState(baby.birthWeightKg ? String(baby.birthWeightKg) : '');
  const [currentWeight, setCurrentWeight] = useState(baby.currentWeightKg ? String(baby.currentWeightKg) : '');
  const [height, setHeight] = useState(baby.heightCm ? String(baby.heightCm) : '');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    haptics.medium();
    setSaving(true);
    try {
      await onSave({
        ...baby,
        name: name.trim(),
        birthDate: dateToIsoString(birthDate),
        birthWeightKg: parseNumber(birthWeight),
        currentWeightKg: parseNumber(currentWeight),
        heightCm: parseNumber(height),
      });
      haptics.success();
      bottomSheetModalRef.current?.dismiss();
      onClose();
    } catch (error) {
      haptics.error();
      console.error('Error saving baby:', error);
    } finally {
      setSaving(false);
    }
  }, [baby, name, birthDate, birthWeight, currentWeight, height, onSave, bottomSheetModalRef, onClose]);

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
            Edit {baby.name}
          </Text>
          <Pressable onPress={handleClose} hitSlop={12} style={{ padding: 4 }}>
            <Text style={{ color: colors.textMuted, fontSize: 22, lineHeight: 24 }}>✕</Text>
          </Pressable>
        </View>

        <Input
          label="Baby name"
          value={name}
          onChangeText={setName}
          placeholder="Enter baby name"
        />

        <DateTimeField
          label="Birth date"
          value={birthDate}
          onChange={setBirthDate}
        />

        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginTop: spacing.lg, marginBottom: spacing.sm }}>
          Measurements
        </Text>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Input
              label="Birth weight (kg)"
              value={birthWeight}
              onChangeText={setBirthWeight}
              keyboardType="decimal-pad"
              inputMode="decimal"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Current weight (kg)"
              value={currentWeight}
              onChangeText={setCurrentWeight}
              keyboardType="decimal-pad"
              inputMode="decimal"
            />
          </View>
        </View>

        <Input
          label="Height (cm)"
          value={height}
          onChangeText={setHeight}
          keyboardType="decimal-pad"
          inputMode="decimal"
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
      </BottomSheetView>
    </BottomSheetModal>
  );
}
