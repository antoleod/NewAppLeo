import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/shared';
import { useIconPack } from '@/components/icons/IconPackContext';
import { useTheme } from '@/context/ThemeContext';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { useTranslation } from '@/hooks/useTranslation';
import { typeMeta, foodPresets, mealTimes, getRecommendedMealTime } from '@/lib/entryComposer';
import { suggestFoodQuantities, inferCategoryFromName, type QuantityChip } from '@/lib/food-suggestions';
import type { FoodCategory } from '@/types';

type Props = {
  editing: boolean;
  foodName: string;
  setFoodName: (v: string) => void;
  quantityGrams: string;
  setQuantityGrams: (v: string) => void;
  mealTime: 'breakfast' | 'lunch' | 'snack' | 'dinner' | '';
  setMealTime: (v: 'breakfast' | 'lunch' | 'snack' | 'dinner' | '') => void;
  foodAllergies: string[];
  setFoodAllergies: (v: string[]) => void;
  foodMoreOpen: boolean;
  setFoodMoreOpen: (next: (prev: boolean) => boolean) => void;
};

// Distinct tone per meal so the four times read apart at a glance —
// a warm-to-cool progression across the day.
const MEAL_GLYPH_TONES: Record<string, string> = {
  breakfast: '#F5C26B',
  lunch: '#F0A030',
  snack: '#C98A5E',
  dinner: '#A371F7',
};
const MORE_LABEL: Record<string, string> = { fr: 'Réaction, allergie…', en: 'Reaction, allergy…', es: 'Reacción, alergia…', nl: 'Reactie, allergie…' };
const LESS_LABEL: Record<string, string> = { fr: 'Masquer', en: 'Hide', es: 'Ocultar', nl: 'Verbergen' };

const REACTION_OPTIONS: { emoji: string; value: string; labels: Record<string, string> }[] = [
  { emoji: '🤧', value: 'allergy',     labels: { fr: 'Allergie',     en: 'Allergy',     es: 'Alergia',     nl: 'Allergie'     } },
  { emoji: '😬', value: 'intolerance', labels: { fr: 'Intolérance',  en: 'Intolerance', es: 'Intolerancia',nl: 'Intolerantie' } },
  { emoji: '🔴', value: 'rash',        labels: { fr: 'Éruption',     en: 'Rash',        es: 'Erupción',    nl: 'Uitslag'      } },
  { emoji: '🤮', value: 'vomit',       labels: { fr: 'Vomissement',  en: 'Vomit',       es: 'Vómito',      nl: 'Braken'       } },
  { emoji: '💩', value: 'diarrhea',    labels: { fr: 'Diarrhée',     en: 'Diarrhea',    es: 'Diarrea',     nl: 'Diarree'      } },
];

export const FoodSection = React.memo(function FoodSection({
  editing,
  foodName, setFoodName,
  quantityGrams, setQuantityGrams,
  mealTime, setMealTime,
  foodAllergies, setFoodAllergies,
  foodMoreOpen, setFoodMoreOpen,
}: Props) {
  const { colors } = useTheme();
  const iconPack = useIconPack();
  const MEAL_GLYPHS_LOCAL: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
    breakfast: iconPack.MealMorning,
    lunch: iconPack.MealMidday,
    snack: iconPack.MealSnack,
    dinner: iconPack.MealEvening,
  };
  const { t } = useTranslation();
  const { language } = useLocale();
  const { entries } = useAppData();
  const { profile } = useAuth();
  const meta = typeMeta.food;
  const lang = language as 'fr' | 'en' | 'es' | 'nl';

  const recentFoodEntries = useMemo(
    () => entries.filter((e) => e.type === 'food' && typeof e.payload?.foodName === 'string').slice(0, 4),
    [entries],
  );

  const todayFoodEntries = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return entries
      .filter((e) => e.type === 'food' && new Date(e.occurredAt) >= startOfDay)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }, [entries]);

  const foodPreferencesMap = useMemo(() => {
    const map: Record<string, { liked: number; neutral: number; disliked: number }> = {};
    entries
      .filter((e) => e.type === 'food' && e.payload?.foodName)
      .forEach((e) => {
        const fn = e.payload?.foodName;
        if (!fn) return;
        const liked = e.payload?.foodLiked;
        if (!map[fn]) map[fn] = { liked: 0, neutral: 0, disliked: 0 };
        if (liked === 'yes') map[fn].liked++;
        else if (liked === 'neutral') map[fn].neutral++;
        else if (liked === 'no') map[fn].disliked++;
      });
    return map;
  }, [entries]);

  const selectedPreset = foodPresets.find(
    (p) => p.value === foodName || Object.values(p.labels).includes(foodName),
  );
  const isFirstTry = foodName.trim().length > 0 && !foodPreferencesMap[foodName];
  const resolvedCategory: FoodCategory = selectedPreset
    ? (selectedPreset.value as FoodCategory)
    : inferCategoryFromName(foodName);

  const suggestion = suggestFoodQuantities({
    entries,
    babyBirthDate: profile?.babyBirthDate ?? null,
    category: resolvedCategory,
    foodName,
    mealTime: mealTime || undefined,
  });

  const chipKindLabel: Record<QuantityChip['kind'], string> = {
    last: t('food.chipLast'),
    usual: t('food.chipUsual'),
    less: t('food.chipLess'),
    more: t('food.chipMore'),
    baseline: t('food.chipUsual'),
    discovery: t('food.chipDiscovery'),
  };

  const suggestionRationale =
    suggestion.source === 'foodName'
      ? t('food.suggestionFromFood')
      : suggestion.source === 'category'
        ? t('food.suggestionFromHistory')
        : suggestion.source === 'categoryMeal'
          ? t('food.suggestionFromMeal')
          : suggestion.source === 'categoryNewFood'
            ? t('food.suggestionDiscovery')
            : suggestion.source === 'age'
              ? t('food.suggestionFromAge')
              : '';

  const activeMealTime = mealTime || getRecommendedMealTime();
  const qtyStep = suggestion.unit === 'ml' ? 10 : 5;
  const getFoodLabel = (preset: typeof foodPresets[number]) => preset.labels[lang] ?? preset.labels.en;

  return (
    <View style={styles.sectionCard}>
      {!editing ? (
        <View style={{ marginBottom: 6 }}>
          <View style={[styles.todayCountBadge, { backgroundColor: `${meta.tone}18`, borderColor: `${meta.tone}40`, alignSelf: 'flex-start' }]}>
            <Text style={{ color: meta.tone, fontSize: 11, fontWeight: '700' }}>
              {todayFoodEntries.length === 0
                ? t('food.firstMeal')
                : `${todayFoodEntries.length} ${todayFoodEntries.length > 1 ? t('food.mealsCount') : t('food.mealCountOne')}`}
            </Text>
          </View>
        </View>
      ) : null}

      <Text style={styles.smallLabel}>{t('food.mealLabel')}</Text>
      <View style={styles.mealRow}>
        {mealTimes.map((meal) => {
          const active = activeMealTime === meal.value;
          const fullLabel = meal.labels[lang] ?? meal.labels.en;
          const Glyph = MEAL_GLYPHS_LOCAL[meal.value];
          const tone = MEAL_GLYPH_TONES[meal.value] ?? meta.tone;
          return (
            <Pressable
              key={meal.value}
              onPress={() => setMealTime(mealTime === meal.value ? '' : meal.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={fullLabel}
              style={({ pressed }) => ({
                flex: 1, paddingHorizontal: 6, paddingVertical: 9,
                borderRadius: 10, minHeight: 50,
                alignItems: 'center', justifyContent: 'center', gap: 3,
                borderWidth: active ? 2 : 1,
                borderColor: active ? tone : colors.border,
                backgroundColor: active ? `${tone}1A` : pressed ? `${colors.card}88` : 'transparent',
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
            >
              {Glyph ? <Glyph size={18} color={tone} /> : null}
              <Text style={{ fontSize: 10, fontWeight: active ? '800' : '500', color: active ? tone : colors.muted, textAlign: 'center' }}>
                {fullLabel.replace(/^\S+\s*/, '')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isFirstTry ? (
        <Text style={{ color: meta.tone, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>{t('food.firstTry')}</Text>
      ) : null}
      <Input
        label={t('food.foodLabel2')}
        value={foodName}
        onChangeText={setFoodName}
        placeholder={lang === 'fr' ? 'Pomme, compote, quinoa…' : lang === 'es' ? 'Manzana, compota…' : lang === 'nl' ? 'Appel, compote…' : 'Apple, compote, quinoa…'}
      />

      <View style={styles.presetGrid}>
        {foodPresets.map((preset) => {
          const active = selectedPreset?.value === preset.value;
          return (
            <Pressable
              key={preset.value}
              onPress={() => setFoodName(active ? '' : preset.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={getFoodLabel(preset)}
              style={[
                styles.presetPill,
                { borderColor: colors.border, backgroundColor: colors.card },
                active && { backgroundColor: meta.toneSoft, borderColor: meta.tone, borderWidth: 2 },
              ]}
            >
              <Text style={{ fontSize: 14 }}>{preset.icon}</Text>
              <Text style={[styles.presetLabel, { color: colors.text }, active && { color: meta.tone, fontWeight: '800' }]}>
                {getFoodLabel(preset)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {recentFoodEntries.length > 0 ? (
        <View style={styles.recentRow}>
          {recentFoodEntries.map((entry) => {
            const fn = entry.payload?.foodName ?? '';
            const prefs = foodPreferencesMap[fn];
            const heart = prefs && prefs.liked > prefs.disliked + prefs.neutral ? '❤️ ' : '';
            const active = foodName === fn;
            return (
              <Pressable
                key={entry.id}
                onPress={() => setFoodName(fn)}
                accessibilityRole="button"
                accessibilityLabel={fn}
                style={[
                  styles.recentChip,
                  { borderColor: colors.border, backgroundColor: colors.card },
                  active && { backgroundColor: meta.toneSoft, borderColor: meta.tone },
                ]}
              >
                <Text style={[styles.recentChipText, { color: colors.text }, active && { color: meta.tone }]}>
                  {heart}{fn}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={{ marginTop: 14 }}>
        <View style={styles.qtyHeader}>
          <Text style={styles.smallLabel}>{t('food.quantityLabel2')}</Text>
          {suggestionRationale ? (
            <Text style={styles.qtyRationale} numberOfLines={1}>{suggestionRationale}</Text>
          ) : null}
        </View>
        <View style={styles.qtyChipRow}>
          {suggestion.chips.map((chip) => {
            const active = quantityGrams === String(chip.value);
            const showKind = chip.kind !== 'baseline' && (
              suggestion.source === 'foodName' ||
              suggestion.source === 'category' ||
              suggestion.source === 'categoryMeal' ||
              suggestion.source === 'categoryNewFood'
            );
            return (
              <Pressable
                key={`${chip.kind}-${chip.value}`}
                onPress={() => setQuantityGrams(active ? '' : String(chip.value))}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${chipKindLabel[chip.kind]} ${chip.value}${chip.unit}`}
                style={[
                  styles.qtyChip,
                  { borderColor: colors.border, backgroundColor: colors.card, paddingVertical: 8 },
                  active && { backgroundColor: meta.toneSoft, borderColor: meta.tone, borderWidth: 2 },
                ]}
              >
                {showKind ? (
                  <Text style={{ fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: active ? meta.tone : colors.muted, marginBottom: 1 }}>
                    {chipKindLabel[chip.kind]}
                  </Text>
                ) : null}
                <Text style={[styles.qtyChipText, { color: colors.text }, active && { color: meta.tone, fontWeight: '800' }]}>
                  {chip.value}{chip.unit}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.stepRow}>
          <Pressable
            onPress={() => setQuantityGrams(String(Math.max(0, (Number(quantityGrams) || 0) - qtyStep)))}
            accessibilityRole="button"
            accessibilityLabel={`−${qtyStep} ${suggestion.unit}`}
            style={[styles.stepBtn, { backgroundColor: `${meta.tone}14`, borderColor: `${meta.tone}50` }]}
          >
            <Text style={[styles.stepBtnText, { color: meta.tone }]}>−</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Input
              label=""
              value={quantityGrams}
              onChangeText={setQuantityGrams}
              placeholder={suggestion.usualAmount ? String(suggestion.usualAmount) : suggestion.unit === 'ml' ? '100' : '50'}
              keyboardType="number-pad"
              inputMode="numeric"
            />
          </View>
          <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '700', minWidth: 14 }}>{suggestion.unit}</Text>
          <Pressable
            onPress={() => setQuantityGrams(String((Number(quantityGrams) || 0) + qtyStep))}
            accessibilityRole="button"
            accessibilityLabel={`+${qtyStep} ${suggestion.unit}`}
            style={[styles.stepBtn, { backgroundColor: `${meta.tone}14`, borderColor: `${meta.tone}50` }]}
          >
            <Text style={[styles.stepBtnText, { color: meta.tone }]}>+</Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        onPress={() => setFoodMoreOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={foodMoreOpen ? (LESS_LABEL[lang] ?? LESS_LABEL.en) : (MORE_LABEL[lang] ?? MORE_LABEL.en)}
        style={styles.moreToggle}
      >
        <Ionicons name={foodMoreOpen ? 'chevron-up-outline' : 'chevron-down-outline'} size={13} color={foodAllergies.length > 0 ? '#E74C3C' : colors.muted} />
        <Text style={{ color: foodAllergies.length > 0 ? '#E74C3C' : colors.muted, fontSize: 12, fontWeight: foodAllergies.length > 0 ? '700' : '400' }}>
          {foodMoreOpen
            ? (LESS_LABEL[lang] ?? LESS_LABEL.en)
            : foodAllergies.length > 0
              ? `⚠️ ${foodAllergies.length}`
              : (MORE_LABEL[lang] ?? MORE_LABEL.en)}
        </Text>
      </Pressable>
      {foodMoreOpen ? (
        <View style={styles.reactionRow}>
          {REACTION_OPTIONS.map(({ emoji, value, labels }) => {
            const active = foodAllergies.includes(value);
            return (
              <Pressable
                key={value}
                onPress={() => setFoodAllergies(active ? foodAllergies.filter((a) => a !== value) : [...foodAllergies, value])}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                accessibilityLabel={labels[lang] ?? labels.en}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  paddingHorizontal: 10, paddingVertical: 8,
                  borderRadius: 20, minHeight: 36,
                  borderWidth: active ? 2 : 1,
                  borderColor: active ? '#E74C3C' : colors.border,
                  backgroundColor: active ? 'rgba(231,76,60,0.12)' : 'transparent',
                }}
              >
                <Text style={{ fontSize: 13 }}>{emoji}</Text>
                <Text style={{ color: active ? '#E74C3C' : colors.muted, fontSize: 12, fontWeight: active ? '700' : '400' }}>
                  {labels[lang] ?? labels.en}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  sectionCard: { borderRadius: 14, padding: 14, gap: 6 },
  smallLabel: { color: '#888', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  mealRow: { flexDirection: 'row', gap: 5, marginBottom: 14 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  presetPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, minHeight: 36 },
  presetLabel: { fontSize: 12, fontWeight: '600' },
  recentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  recentChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, minHeight: 36, justifyContent: 'center' },
  recentChipText: { fontSize: 12, fontWeight: '600' },
  todayCountBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  qtyHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 },
  qtyRationale: { color: '#888', fontSize: 10, fontStyle: 'italic', flexShrink: 1, textAlign: 'right', marginLeft: 8 },
  qtyChipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  qtyChip: { paddingHorizontal: 13, borderRadius: 999, borderWidth: 1, minHeight: 36, justifyContent: 'center', alignItems: 'center' },
  qtyChipText: { fontSize: 12, fontWeight: '600' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 22, fontWeight: '700' },
  moreToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingVertical: 8 },
  reactionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
});
