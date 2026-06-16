import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useIconPack } from '@/components/icons/IconPackContext';
import { EntryRecord } from '@/types';
import { mealTones } from '@/lib/entryComposer';
import { formatClock, getMealKind, type MealKind } from '@/utils/homeHelpers';

const MEAL_TONE: Record<MealKind, string> = mealTones;

type FoodHistoryRowProps = {
  entry: EntryRecord;
  locale: string;
  isToday: boolean;
  mealLabel: string;
  moreLabel: (n: number) => string;
  tokens: { text: string; muted: string; soft: string; gold: string; red: string; border: string };
  onPress: (id: string) => void;
};

export const FoodHistoryRow = React.memo(function FoodHistoryRow({
  entry, locale, isToday, mealLabel, moreLabel, tokens, onPress,
}: FoodHistoryRowProps) {
  const p = entry.payload ?? {};
  const kind = getMealKind(p.mealTime);
  const ae = p.amountEaten;
  const liked = p.foodLiked;
  const allergies: string[] = Array.isArray(p.foodAllergies) ? p.foodAllergies : [];
  const hasAllergy = allergies.length > 0;
  const grams = p.quantityGrams;
  const name = p.foodName || '—';
  const pack = useIconPack();
  const mealMap = { breakfast: pack.MealMorning, lunch: pack.MealMidday, snack: pack.MealSnack, dinner: pack.MealEvening, other: pack.MealOther } as const;
  const MealG = mealMap[kind];
  const mealTone = MEAL_TONE[kind];
  const AmountG = ae === 'all' ? pack.AmountAll : ae === 'half' ? pack.AmountHalf : ae === 'little' ? pack.AmountLittle : ae === 'none' ? pack.AmountNone : null;
  const FaceG = liked === 'yes' ? pack.FaceHappy : liked === 'no' ? pack.FaceSad : null;
  const faceTone = liked === 'yes' ? '#56D364' : '#E07A7A';

  return (
    <Pressable
      onPress={() => onPress(entry.id)}
      accessibilityRole="button"
      accessibilityLabel={`${mealLabel} · ${name}`}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingVertical: 10, paddingHorizontal: 10, borderRadius: 14, marginBottom: 2,
        backgroundColor: pressed
          ? (hasAllergy ? 'rgba(231,76,60,0.10)' : tokens.gold + '22')
          : (isToday ? (hasAllergy ? 'rgba(231,76,60,0.08)' : tokens.gold + '14') : 'transparent'),
        borderLeftWidth: isToday ? 3 : 0,
        borderLeftColor: isToday ? (hasAllergy ? tokens.red : tokens.gold) : 'transparent',
      })}
    >
      <View style={{ width: 24, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={mealLabel}>
        <MealG size={20} color={mealTone} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: tokens.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{name}</Text>
        {(grams || hasAllergy) ? (
          <Text style={{ color: hasAllergy ? tokens.red : tokens.muted, fontSize: 11, marginTop: 2, fontWeight: hasAllergy ? '600' : '500' }} numberOfLines={2}>
            {grams ? `${grams}g` : ''}
            {grams && hasAllergy ? ' · ' : ''}
            {hasAllergy ? `⚠️ ${allergies[0]}${allergies.length > 1 ? ` ${moreLabel(allergies.length - 1)}` : ''}` : ''}
          </Text>
        ) : null}
      </View>
      <View style={{ width: 96, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
        {AmountG ? <AmountG size={14} /> : null}
        {FaceG ? <FaceG size={14} color={faceTone} /> : null}
        <Text style={{ color: tokens.soft, fontSize: 11, fontWeight: '600', minWidth: 38, textAlign: 'right' }}>
          {formatClock(entry.occurredAt, locale)}
        </Text>
      </View>
    </Pressable>
  );
});
