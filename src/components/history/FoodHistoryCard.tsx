import React, { Fragment, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocale } from '@/context/LocaleContext';
import { haptics } from '@/lib/haptics';
import { EntryRecord, FoodCategory } from '@/types';
import { useIconPack } from '@/components/icons/IconPackContext';
import { inferCategoryFromName } from '@/lib/food-suggestions';
import { mealTones } from '@/lib/entryComposer';

type MealKind = 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'other';

// Per-food emoji so each row reads at a glance — without this every food at
// the same meal time would share one identical meal-time icon.
const CATEGORY_EMOJI: Record<FoodCategory, string> = {
  puree: '🥣',
  fruit: '🍎',
  cereals: '🌾',
  yogurt: '🥛',
  vegetables: '🥕',
  water: '💧',
  other: '🍽️',
};

function getMealKind(value?: string): MealKind {
  if (value === 'breakfast' || value === 'lunch' || value === 'snack' || value === 'dinner') return value;
  return 'other';
}

const MEAL_TONE: Record<MealKind, string> = mealTones;

function localeTag(language: string) {
  if (language === 'es') return 'es-ES';
  if (language === 'en') return 'en-US';
  if (language === 'nl') return 'nl-BE';
  return 'fr-FR';
}

function formatClock(timestamp: string | undefined, locale: string) {
  if (!timestamp) return '--:--';
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp));
}

type FoodSummary = {
  recent: EntryRecord[];
  mostCommon: { name: string; count: number } | null;
  totalUnique: number;
  totalGramsToday: number;
  mealsToday: number;
};

function getFoodSummary(entries: EntryRecord[]): FoodSummary {
  const empty: FoodSummary = { recent: [], mostCommon: null, totalUnique: 0, totalGramsToday: 0, mealsToday: 0 };
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const foodEntries: EntryRecord[] = [];
  const counts = new Map<string, number>();
  let totalGramsToday = 0;
  let mealsToday = 0;

  for (const entry of entries) {
    if (entry.type !== 'food') continue;
    foodEntries.push(entry);
    const name = entry.payload?.foodName?.toLowerCase();
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    if (new Date(entry.occurredAt).getTime() >= startOfDay) {
      mealsToday++;
      totalGramsToday += entry.payload?.quantityGrams ?? 0;
    }
  }

  if (foodEntries.length === 0) return empty;

  foodEntries.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  let mostCommonName: string | null = null;
  let maxCount = 0;
  counts.forEach((count, name) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommonName = name;
    }
  });

  return {
    recent: foodEntries.slice(0, 8),
    mostCommon: mostCommonName ? { name: mostCommonName, count: maxCount } : null,
    totalUnique: counts.size,
    totalGramsToday,
    mealsToday,
  };
}

type RowTokens = { text: string; muted: string; soft: string; gold: string; red: string; border: string; card: string };

type FoodHistoryRowProps = {
  entry: EntryRecord;
  locale: string;
  isToday: boolean;
  mealLabel: string;
  moreLabel: (n: number) => string;
  tokens: RowTokens;
  onPress: (id: string) => void;
};

const FoodHistoryRow = React.memo(function FoodHistoryRow({
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
  // Icon = the food itself (distinct per row); meal time = the tint behind it.
  const category: FoodCategory = (p.foodCategory as FoodCategory | undefined) ?? inferCategoryFromName(p.foodName ?? '');
  const foodEmoji = CATEGORY_EMOJI[category] ?? CATEGORY_EMOJI.other;
  const AmountG = ae === 'all' ? pack.AmountAll : ae === 'half' ? pack.AmountHalf : ae === 'little' ? pack.AmountLittle : ae === 'none' ? pack.AmountNone : null;
  const FaceG = liked === 'yes' ? pack.FaceHappy : liked === 'no' ? pack.FaceSad : null;
  const faceTone = liked === 'yes' ? '#56D364' : '#E07A7A';

  return (
    <Pressable
      onPress={() => onPress(entry.id)}
      accessibilityRole="button"
      accessibilityLabel={`${mealLabel} · ${name}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 10,
        marginBottom: 2,
        backgroundColor: pressed
          ? (hasAllergy ? 'rgba(231,76,60,0.10)' : tokens.gold + '22')
          : (isToday ? (hasAllergy ? 'rgba(231,76,60,0.08)' : tokens.gold + '14') : 'transparent'),
        borderLeftWidth: isToday ? 3 : 0,
        borderLeftColor: isToday ? (hasAllergy ? tokens.red : tokens.gold) : 'transparent',
      })}
    >
      <View
        style={{
          width: 34, height: 34, borderRadius: 17,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: mealTone + '22',
          borderWidth: 1, borderColor: mealTone + '40',
        }}
        accessibilityLabel={mealLabel}
      >
        <Text style={{ fontSize: 17 }}>{foodEmoji}</Text>
        <View
          style={{
            position: 'absolute', right: -3, bottom: -3,
            width: 17, height: 17, borderRadius: 9,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: tokens.card,
            borderWidth: 1, borderColor: tokens.border,
          }}
        >
          <MealG size={11} color={mealTone} />
        </View>
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

type FoodHistoryCardProps = {
  entries: EntryRecord[];
  showSeeAll?: boolean;
  onSeeAll?: () => void;
};

export function FoodHistoryCard({ entries, showSeeAll = true, onSeeAll }: FoodHistoryCardProps) {
  const { theme } = useTheme();
  const { t, format } = useTranslation();
  const { language } = useLocale();
  const locale = localeTag(language);

  const CARD = theme.bgCard;
  const BORDER = theme.border;
  const BORDER_SOFT = theme.bgCardAlt;
  const TEXT = theme.textPrimary;
  const MUTED = theme.textMuted;
  const SOFT = theme.textMuted;
  const GOLD = theme.accent;
  const ACCENT = theme.accent;
  const RED = theme.red;

  const summary = useMemo(() => getFoodSummary(entries), [entries]);
  const { recent: foodHistory, mealsToday, totalGramsToday, mostCommon: foodMostCommon } = summary;

  if (foodHistory.length === 0) return null;

  const rowTokens: RowTokens = { text: TEXT, muted: MUTED, soft: SOFT, gold: GOLD, red: RED, border: BORDER, card: CARD };
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const mealLabelFor = (kind: MealKind) => t(`food.meal${kind.charAt(0).toUpperCase() + kind.slice(1)}` as any);
  const moreLabel = (n: number) => format('food.moreCount', { count: n });

  const goToEdit = (id: string) => {
    haptics.selection();
    router.push({ pathname: '/entry/[type]', params: { type: 'food', id } });
  };
  const goToAdd = () => {
    haptics.selection();
    router.push('/entry/food');
  };
  const goToHistory = onSeeAll ?? (() => router.push('/history'));

  type Group = { key: string; label: string; items: EntryRecord[] };
  const groups: Group[] = [];
  const pushTo = (key: string, label: string, item: EntryRecord) => {
    let g = groups.find((x) => x.key === key);
    if (!g) { g = { key, label, items: [] }; groups.push(g); }
    g.items.push(item);
  };
  for (const food of foodHistory) {
    const ts = new Date(food.occurredAt).getTime();
    if (ts >= startOfToday) pushTo('today', t('food.dayToday'), food);
    else if (ts >= startOfYesterday) pushTo('yesterday', t('food.dayYesterday'), food);
    else {
      const d = new Date(food.occurredAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const label = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
      pushTo(key, label, food);
    }
  }

  return (
    <Animated.View entering={FadeInDown.duration(260).delay(120)}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 4 }}>{t('food.history')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={{ color: TEXT, fontSize: 22, fontWeight: '700', letterSpacing: -0.3 }}>{mealsToday}</Text>
              <Text style={{ color: SOFT, fontSize: 13, fontWeight: '500' }}>{t('food.today')}</Text>
              {totalGramsToday > 0 ? (
                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: GOLD + '22' }}>
                  <Text style={{ color: GOLD, fontSize: 11, fontWeight: '700' }}>{totalGramsToday}g</Text>
                </View>
              ) : null}
            </View>
            {foodMostCommon ? (
              <Text style={{ color: MUTED, fontSize: 11, fontWeight: '500', marginTop: 4 }} numberOfLines={1}>
                <Text style={{ color: MUTED, fontWeight: '600' }}>{t('food.favorite')}</Text>
                <Text style={{ color: TEXT, fontWeight: '600' }}>{foodMostCommon.name}</Text>
                <Text style={{ color: SOFT }}> · {foodMostCommon.count}×</Text>
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={goToAdd}
            accessibilityRole="button"
            accessibilityLabel={t('food.addEntry')}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 36, height: 36, borderRadius: 18,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: pressed ? GOLD + '33' : GOLD + '1A',
              borderWidth: 1, borderColor: GOLD + '33',
            })}
          >
            <Ionicons name="add" size={20} color={GOLD} />
          </Pressable>
        </View>

        <View style={{ gap: 2 }}>
          {groups.map((group, gi) => (
            <Fragment key={group.key}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: gi === 0 ? 0 : 8, marginBottom: 4 }}>
                <Text style={{ color: MUTED, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>{group.label}</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: BORDER_SOFT }} />
              </View>
              {group.items.map((food) => (
                <FoodHistoryRow
                  key={food.id}
                  entry={food}
                  locale={locale}
                  isToday={group.key === 'today'}
                  mealLabel={mealLabelFor(getMealKind(food.payload?.mealTime))}
                  moreLabel={moreLabel}
                  tokens={rowTokens}
                  onPress={goToEdit}
                />
              ))}
            </Fragment>
          ))}
        </View>

        {showSeeAll ? (
          <Pressable
            onPress={goToHistory}
            accessibilityRole="button"
            accessibilityLabel={t('food.seeAll')}
            style={({ pressed }) => ({
              marginTop: 10,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
              backgroundColor: pressed ? BORDER_SOFT : 'transparent',
            })}
          >
            <Text style={{ color: ACCENT, fontSize: 12, fontWeight: '700', letterSpacing: 0.3 }}>{t('food.seeAll')}</Text>
            <Ionicons name="chevron-forward" size={14} color={ACCENT} />
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}
