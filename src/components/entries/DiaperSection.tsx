import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { DiaperLevelPicker } from '@/components/home';
import { haptics } from '@/lib/haptics';
import { useIconPack } from '@/components/icons/IconPackContext';

export type PoopColor = 'yellow' | 'brown' | 'green' | 'dark' | 'red';
export type PoopConsistency = 'liquid' | 'soft' | 'normal' | 'hard';

type Props = {
  pee: string;
  setPee: (v: string) => void;
  poop: string;
  setPoop: (v: string) => void;
  vomit: string;
  setVomit: (v: string) => void;
  poopColor: PoopColor | null;
  setPoopColor: (v: PoopColor | null) => void;
  poopConsistency: PoopConsistency | null;
  setPoopConsistency: (v: PoopConsistency | null) => void;
  diaperLeaked: boolean;
  setDiaperLeaked: (v: boolean) => void;
  minutesSinceLast?: number | null;
};

const fmt = (n: number) => (n > 3 ? String(n) : n === 3 ? '3+' : String(n));

const POOP_COLORS: Array<{ value: PoopColor; emoji: string; tint: string; tKey: string }> = [
  { value: 'yellow', emoji: '🟡', tint: '#F0B85A', tKey: 'diaper.poopColorYellow' },
  { value: 'brown',  emoji: '🟤', tint: '#8B6F47', tKey: 'diaper.poopColorBrown' },
  { value: 'green',  emoji: '🟢', tint: '#56D364', tKey: 'diaper.poopColorGreen' },
  { value: 'dark',   emoji: '⚫', tint: '#3A3A3A', tKey: 'diaper.poopColorDark' },
  { value: 'red',    emoji: '🔴', tint: '#E74C3C', tKey: 'diaper.poopColorRed' },
];

const POOP_CONSISTENCIES: Array<{ value: PoopConsistency; emoji: string; tKey: string }> = [
  { value: 'liquid', emoji: '🌊', tKey: 'diaper.consistencyLiquid' },
  { value: 'soft',   emoji: '💧', tKey: 'diaper.consistencySoft' },
  { value: 'normal', emoji: '🟫', tKey: 'diaper.consistencyNormal' },
  { value: 'hard',   emoji: '🥜', tKey: 'diaper.consistencyHard' },
];

function formatSinceLast(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

type QuickPreset = 'pee' | 'poop' | 'mixed' | 'empty';

export const DiaperSection = React.memo(function DiaperSection({
  pee, setPee, poop, setPoop, vomit, setVomit,
  poopColor, setPoopColor,
  poopConsistency, setPoopConsistency,
  diaperLeaked, setDiaperLeaked,
  minutesSinceLast,
}: Props) {
  const { theme, colors } = useTheme();
  const { DropPee, DropPoop, DropVomit, MealEvening } = useIconPack();
  const { t } = useTranslation();
  const peeN = Number(pee) || 0;
  const poopN = Number(poop) || 0;
  const vomitN = Number(vomit) || 0;
  const total = peeN + poopN + vomitN;

  // Reset poop sub-fields when poop is cleared.
  useEffect(() => {
    if (poopN === 0) {
      if (poopColor !== null) setPoopColor(null);
      if (poopConsistency !== null) setPoopConsistency(null);
    }
  }, [poopN, poopColor, poopConsistency, setPoopColor, setPoopConsistency]);

  const applyQuick = (preset: QuickPreset) => {
    haptics.selection();
    switch (preset) {
      case 'pee':   setPee('1'); setPoop('0'); setVomit('0'); break;
      case 'poop':  setPee('0'); setPoop('1'); setVomit('0'); break;
      case 'mixed': setPee('1'); setPoop('1'); setVomit('0'); break;
      case 'empty': setPee('0'); setPoop('0'); setVomit('0'); break;
    }
  };

  const isQuick = (preset: QuickPreset): boolean => {
    if (preset === 'pee')   return peeN === 1 && poopN === 0 && vomitN === 0;
    if (preset === 'poop')  return peeN === 0 && poopN === 1 && vomitN === 0;
    if (preset === 'mixed') return peeN === 1 && poopN === 1 && vomitN === 0;
    return total === 0;
  };

  const QUICK_PRESETS: Array<{ key: QuickPreset; glyph: React.ReactNode; tKey: string; tint: string }> = [
    { key: 'pee',   glyph: <DropPee size={22} color="#58A6FF" />,                                              tKey: 'diaper.quickPee',   tint: '#58A6FF' },
    { key: 'poop',  glyph: <DropPoop size={22} color="#A371F7" />,                                             tKey: 'diaper.quickPoop',  tint: '#A371F7' },
    { key: 'mixed', glyph: (
      <View style={{ flexDirection: 'row', gap: -4 }}>
        <DropPee size={18} color="#58A6FF" />
        <DropPoop size={18} color="#A371F7" />
      </View>
    ), tKey: 'diaper.quickMixed', tint: '#F0B85A' },
    { key: 'empty', glyph: <MealEvening size={22} color={theme.textMuted} />,                                  tKey: 'diaper.quickEmpty', tint: theme.textMuted },
  ];

  return (
    <View style={styles.sectionCard}>
      {/* Header: summary + total + since-last */}
      <Animated.View entering={FadeIn.duration(220)} style={styles.summaryRow}>
        <View style={styles.summaryTextWrap}>
          {total === 0 ? (
            <Text style={[styles.summaryText, { color: theme.textMuted, fontWeight: '500' }]}>
              {t('diaper.emptyHint')}
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {peeN > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <DropPee size={16} color="#58A6FF" />
                  <Text style={[styles.summaryText, { color: colors.text }]}>{fmt(peeN)}</Text>
                </View>
              ) : null}
              {poopN > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <DropPoop size={16} color="#A371F7" />
                  <Text style={[styles.summaryText, { color: colors.text }]}>{fmt(poopN)}</Text>
                </View>
              ) : null}
              {vomitN > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <DropVomit size={16} color="#F0B85A" />
                  <Text style={[styles.summaryText, { color: colors.text }]}>{fmt(vomitN)}</Text>
                </View>
              ) : null}
            </View>
          )}
          {minutesSinceLast != null && minutesSinceLast > 0 ? (
            <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 }}>
              {t('diaper.sinceLast')} {formatSinceLast(minutesSinceLast)}
            </Text>
          ) : null}
        </View>
        {total > 0 ? (
          <View style={[styles.totalChip, { backgroundColor: `${colors.primary}1A`, borderColor: `${colors.primary}55` }]}>
            <Text style={[styles.totalChipText, { color: colors.primary }]}>{total}</Text>
          </View>
        ) : null}
      </Animated.View>

      {/* Quick preset row */}
      <View style={styles.quickRow}>
        {QUICK_PRESETS.map((preset) => {
          const active = isQuick(preset.key);
          return (
            <Pressable
              key={preset.key}
              onPress={() => applyQuick(preset.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t(preset.tKey)}
              style={({ pressed }) => ({
                flex: 1, minHeight: 56,
                paddingHorizontal: 4, paddingVertical: 6,
                borderRadius: 12,
                alignItems: 'center', justifyContent: 'center', gap: 2,
                borderWidth: active ? 2 : 1,
                borderColor: active ? preset.tint : theme.border,
                backgroundColor: active
                  ? `${preset.tint}1F`
                  : pressed ? theme.bgCardAlt : theme.bgCard,
              })}
            >
              {preset.glyph}
              <Text
                style={{
                  fontSize: 10, fontWeight: active ? '800' : '600',
                  color: active ? preset.tint : theme.textMuted,
                  textAlign: 'center',
                }}
                numberOfLines={1}
              >
                {t(preset.tKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Counter rows (with subtle row tint when value > 0) */}
      <View style={styles.stack}>
        <Animated.View
          entering={FadeInDown.duration(260).delay(60)}
          style={[styles.row, peeN > 0 && { backgroundColor: 'rgba(88,166,255,0.06)', borderColor: 'rgba(88,166,255,0.25)' }]}
        >
          <DiaperLevelPicker glyph={<DropPee size={24} color="#58A6FF" />} label={t('diaper.pee')}
            value={peeN} onChange={(v) => setPee(String(v))} color="#58A6FF" />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(260).delay(140)}
          style={[styles.row, poopN > 0 && { backgroundColor: 'rgba(163,113,247,0.06)', borderColor: 'rgba(163,113,247,0.25)' }]}
        >
          <DiaperLevelPicker glyph={<DropPoop size={24} color="#A371F7" />} label={t('diaper.poop')}
            value={poopN} onChange={(v) => setPoop(String(v))} color="#A371F7" />

          {poopN > 0 ? (
            <Animated.View entering={FadeIn.duration(220)} style={{ gap: 10, marginTop: 12 }}>
              {/* Color */}
              <View>
                <Text style={[styles.subLabel, { color: theme.textMuted }]}>{t('diaper.poopColor')}</Text>
                <View style={styles.optionRow}>
                  {POOP_COLORS.map((opt) => {
                    const active = poopColor === opt.value;
                    const isAlert = opt.value === 'red' || opt.value === 'dark';
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => {
                          haptics.selection();
                          setPoopColor(active ? null : opt.value);
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={t(opt.tKey)}
                        style={({ pressed }) => ({
                          flex: 1, minHeight: 44,
                          borderRadius: 10,
                          alignItems: 'center', justifyContent: 'center', gap: 2,
                          paddingVertical: 4,
                          borderWidth: active ? 2 : 1,
                          borderColor: active ? opt.tint : theme.border,
                          backgroundColor: active ? `${opt.tint}22` : pressed ? theme.bgCardAlt : 'transparent',
                        })}
                      >
                        <Text style={{ fontSize: 14 }}>{opt.emoji}</Text>
                        <Text
                          style={{
                            fontSize: 9, fontWeight: active ? '800' : '600',
                            color: active ? opt.tint : theme.textMuted,
                            textAlign: 'center',
                          }}
                          numberOfLines={1}
                        >
                          {t(opt.tKey)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {(poopColor === 'red' || poopColor === 'dark') ? (
                  <Text style={{ color: '#E74C3C', fontSize: 11, fontWeight: '700', marginTop: 4 }}>
                    {t('diaper.colorAlert')}
                  </Text>
                ) : null}
              </View>

              {/* Consistency */}
              <View>
                <Text style={[styles.subLabel, { color: theme.textMuted }]}>{t('diaper.consistency')}</Text>
                <View style={styles.optionRow}>
                  {POOP_CONSISTENCIES.map((opt) => {
                    const active = poopConsistency === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => {
                          haptics.selection();
                          setPoopConsistency(active ? null : opt.value);
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={t(opt.tKey)}
                        style={({ pressed }) => ({
                          flex: 1, minHeight: 44,
                          borderRadius: 10,
                          alignItems: 'center', justifyContent: 'center', gap: 2,
                          paddingVertical: 4,
                          borderWidth: active ? 2 : 1,
                          borderColor: active ? '#A371F7' : theme.border,
                          backgroundColor: active ? 'rgba(163,113,247,0.18)' : pressed ? theme.bgCardAlt : 'transparent',
                        })}
                      >
                        <Text style={{ fontSize: 14 }}>{opt.emoji}</Text>
                        <Text
                          style={{
                            fontSize: 9, fontWeight: active ? '800' : '600',
                            color: active ? '#A371F7' : theme.textMuted,
                            textAlign: 'center',
                          }}
                          numberOfLines={1}
                        >
                          {t(opt.tKey)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </Animated.View>
          ) : null}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(260).delay(220)}
          style={[styles.row, vomitN > 0 && { backgroundColor: 'rgba(240,184,90,0.07)', borderColor: 'rgba(240,184,90,0.30)' }]}
        >
          <DiaperLevelPicker glyph={<DropVomit size={24} color="#F0B85A" />} label={t('diaper.vomit')}
            value={vomitN} onChange={(v) => setVomit(String(v))} color="#F0B85A" />
        </Animated.View>
      </View>

      {/* Leak toggle */}
      {total > 0 ? (
        <Pressable
          onPress={() => { haptics.selection(); setDiaperLeaked(!diaperLeaked); }}
          accessibilityRole="switch"
          accessibilityState={{ checked: diaperLeaked }}
          accessibilityLabel={t('diaper.leaked')}
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', gap: 8,
            paddingHorizontal: 12, paddingVertical: 10,
            borderRadius: 10, borderWidth: 1,
            borderColor: diaperLeaked ? '#E74C3C' : theme.border,
            backgroundColor: diaperLeaked
              ? 'rgba(231,76,60,0.10)'
              : pressed ? theme.bgCardAlt : 'transparent',
          })}
        >
          <Text style={{ fontSize: 16 }}>{diaperLeaked ? '⚠️' : '○'}</Text>
          <Text
            style={{
              flex: 1,
              color: diaperLeaked ? '#E74C3C' : theme.textPrimary,
              fontSize: 13, fontWeight: '700',
            }}
          >
            {t('diaper.leaked')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  sectionCard: { borderRadius: 14, padding: 14, gap: 12 },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4, paddingHorizontal: 4 },
  summaryTextWrap: { flex: 1 },
  summaryText: { fontSize: 14, fontWeight: '700' },
  totalChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  totalChipText: { fontSize: 11, fontWeight: '800' },
  quickRow: { flexDirection: 'row', gap: 6 },
  stack: { gap: 12 },
  row: { borderRadius: 12, borderWidth: 1, borderColor: 'transparent', padding: 10 },
  subLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  optionRow: { flexDirection: 'row', gap: 6 },
});
