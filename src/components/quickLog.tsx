import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

export function FloatingGlassFooter({
  primaryLabel,
  onPrimary,
  disabled,
  loading,
  secondaryLabel = 'Cancel',
  onSecondary,
  dangerLabel,
  onDanger,
}: {
  primaryLabel: string;
  onPrimary: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  dangerLabel?: string;
  onDanger?: () => void | Promise<void>;
}) {
  return (
    <View style={quickStyles.footerWrap} pointerEvents="box-none">
      <View style={quickStyles.footerGlass}>
        <Pressable
          onPress={disabled || loading ? undefined : onPrimary}
          accessibilityRole="button"
          accessibilityLabel={primaryLabel}
          style={({ pressed }) => [quickStyles.primaryCta, (pressed || loading) && quickStyles.primaryPressed, disabled && quickStyles.disabled]}
        >
          <Text style={quickStyles.primaryCtaText}>{loading ? 'Saving...' : primaryLabel}</Text>
        </Pressable>
        <View style={quickStyles.secondaryRow}>
          {onSecondary ? (
            <Pressable onPress={onSecondary} hitSlop={8} style={({ pressed }) => [quickStyles.secondaryButton, pressed && quickStyles.pressed]}>
              <Text style={quickStyles.secondaryText}>{secondaryLabel}</Text>
            </Pressable>
          ) : null}
          {dangerLabel && onDanger ? (
            <Pressable onPress={onDanger} hitSlop={8} style={({ pressed }) => [quickStyles.secondaryButton, pressed && quickStyles.pressed]}>
              <Text style={quickStyles.dangerText}>{dangerLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function QuickActionCard({
  label,
  detail,
  icon,
  color,
  active,
  onPress,
}: {
  label: string;
  detail?: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        quickStyles.actionCard,
        { borderColor: active ? `${color}AA` : `${color}44`, backgroundColor: active ? `${color}24` : `${color}12` },
        pressed && quickStyles.pressed,
      ]}
    >
      <View style={[quickStyles.actionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={22} color="#071026" />
      </View>
      <Text style={quickStyles.actionLabel}>{label}</Text>
      {detail ? <Text style={quickStyles.actionDetail}>{detail}</Text> : null}
    </Pressable>
  );
}

export function LevelPicker({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  color: string;
}) {
  return (
    <View style={quickStyles.levelBlock}>
      <Text style={quickStyles.levelLabel}>{label}</Text>
      <View style={quickStyles.levelRow}>
        {[0, 1, 2, 3].map((level) => {
          const selected = value === level;
          const filled = level > 0 && level <= value;
          return (
            <Pressable
              key={level}
              onPress={() => onChange(level)}
              style={({ pressed }) => [
                quickStyles.levelSegment,
                { backgroundColor: filled ? color : 'rgba(255,255,255,0.06)', borderColor: selected ? color : 'rgba(255,255,255,0.10)' },
                pressed && quickStyles.pressed,
              ]}
            >
              <Text style={[quickStyles.levelText, { color: filled ? '#071026' : '#DCE6FF' }]}>{level}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function LiveTimerPill({
  label,
  minutes,
  running,
}: {
  label: string;
  minutes: number;
  running?: boolean;
}) {
  const display = formatQuickDuration(minutes);
  return (
    <View style={[quickStyles.timerCard, running && quickStyles.timerCardActive]}>
      <Text style={quickStyles.timerLabel}>{label}</Text>
      <Text style={quickStyles.timerValue}>{display}</Text>
      <Text style={quickStyles.timerMeta}>{running ? 'Running' : 'Ready'}</Text>
    </View>
  );
}

export function QuickNoteToggle({ open, onPress }: { open: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [quickStyles.noteButton, pressed && quickStyles.pressed]}>
      <Text style={quickStyles.noteText}>{open ? '- Note' : '+ Note'}</Text>
    </Pressable>
  );
}

export function formatQuickDuration(minutes: number) {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  if (!hours) return `${mins}m`;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

const quickStyles = StyleSheet.create({
  footerWrap: {
    marginTop: 'auto',
    paddingTop: 10,
  },
  footerGlass: {
    borderRadius: 24,
    padding: 10,
    gap: 5,
    backgroundColor: 'rgba(7, 11, 18, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        boxShadow: '0px -8px 26px rgba(0,0,0,0.18)',
      } as any,
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.16,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: -6 },
      },
      android: {
        elevation: 6,
      },
    }),
  },
  primaryCta: {
    minHeight: 62,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#879DFF',
  },
  primaryPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  primaryCtaText: {
    color: '#071026',
    fontSize: 19,
    fontWeight: '900',
  },
  secondaryRow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  secondaryButton: {
    minHeight: 30,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  secondaryText: {
    color: '#9AA8D0',
    fontSize: 13,
    fontWeight: '800',
  },
  dangerText: {
    color: '#F08A9A',
    fontSize: 13,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  actionCard: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 106,
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'center',
    gap: 4,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  actionLabel: {
    color: '#F7FAFF',
    fontSize: 17,
    fontWeight: '900',
  },
  actionDetail: {
    color: '#AAB8DF',
    fontSize: 12,
    fontWeight: '800',
  },
  levelBlock: {
    gap: 6,
  },
  levelLabel: {
    color: '#F7FAFF',
    fontSize: 15,
    fontWeight: '900',
  },
  levelRow: {
    flexDirection: 'row',
    gap: 6,
  },
  levelSegment: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '900',
  },
  timerCard: {
    minHeight: 136,
    borderRadius: 22,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: 'rgba(96, 125, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(137, 171, 255, 0.26)',
  },
  timerCardActive: {
    backgroundColor: 'rgba(124, 101, 255, 0.22)',
    borderColor: 'rgba(174, 158, 255, 0.56)',
  },
  timerLabel: {
    color: '#AAB8DF',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  timerValue: {
    color: '#FFFFFF',
    fontSize: 52,
    lineHeight: 58,
    fontWeight: '900',
  },
  timerMeta: {
    color: '#9EADD4',
    fontSize: 12,
    fontWeight: '800',
  },
  noteButton: {
    alignSelf: 'flex-start',
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  noteText: {
    color: '#DCE6FF',
    fontSize: 13,
    fontWeight: '900',
  },
});
