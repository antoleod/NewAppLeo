import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { haptics } from '@/lib/haptics';

type Props = {
  emoji: string;
  label: string;
  value: number;
  onChange: (next: number) => void;
  color: string;
};

const OPTIONS = [0, 1, 2, 3] as const;

export const DiaperLevelPicker = React.memo(function DiaperLevelPicker({
  emoji, label, value, onChange, color,
}: Props) {
  const { theme } = useTheme();
  const displayValue = value > 3 ? value : value;
  const selectedOpt = value > 3 ? 3 : OPTIONS.includes(value as any) ? value : 0;

  return (
    <View
      accessible={false}
      accessibilityLabel={`${label}: ${displayValue}`}
      style={{ gap: 8 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text accessibilityElementsHidden style={{ fontSize: 22, minWidth: 26 }}>{emoji}</Text>
        <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '700', flex: 1 }} numberOfLines={1}>
          {label}
        </Text>
        <Text style={{ color, fontSize: 18, fontWeight: '900', minWidth: 32, textAlign: 'right' }}>
          {value > 3 ? value : selectedOpt === 3 ? '3+' : selectedOpt}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {OPTIONS.map((opt) => {
          const selected = selectedOpt === opt;
          const optLabel = opt === 3 ? '3+' : String(opt);
          return (
            <Pressable
              key={opt}
              onPress={() => {
                if (selectedOpt !== opt) haptics.selection();
                onChange(opt);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label} ${optLabel}`}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 44,
                borderRadius: 10,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? color : theme.border,
                backgroundColor: selected
                  ? `${color}22`
                  : (pressed ? theme.bgCardAlt : theme.bgCard),
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <Text style={{
                color: selected ? color : theme.textPrimary,
                fontSize: 16,
                fontWeight: '800',
              }}>
                {optLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});
