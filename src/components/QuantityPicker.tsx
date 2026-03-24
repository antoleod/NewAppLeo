import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export function QuantityPicker({
  label = 'Amount',
  value,
  onChange,
  presets = [100, 130, 150, 180],
  largeTouchMode = false,
}: {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  presets?: number[];
  largeTouchMode?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <Pressable
          onPress={() => onChange(Math.max(0, value - 10))}
          style={{
            width: largeTouchMode ? 52 : 44,
            height: largeTouchMode ? 52 : 44,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.backgroundAlt,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900' }}>-</Text>
        </Pressable>

        <View
            style={{
              minWidth: 86,
            paddingHorizontal: largeTouchMode ? 18 : 16,
            paddingVertical: largeTouchMode ? 14 : 12,
              borderRadius: 16,
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900' }}>{value} ml</Text>
        </View>

        <Pressable
          onPress={() => onChange(value + 10)}
          style={{
            width: largeTouchMode ? 52 : 44,
            height: largeTouchMode ? 52 : 44,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.backgroundAlt,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900' }}>+</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {presets.map((preset) => {
          const selected = preset === value;
          return (
            <Pressable
              key={preset}
              onPress={() => onChange(preset)}
              style={{
                paddingHorizontal: largeTouchMode ? 14 : 12,
                paddingVertical: largeTouchMode ? 10 : 8,
                borderRadius: 999,
                backgroundColor: selected ? colors.primarySoft : colors.backgroundAlt,
                borderWidth: 1,
                borderColor: selected ? colors.primary : colors.border,
              }}
            >
              <Text style={{ color: selected ? colors.primary : colors.muted, fontWeight: '700' }}>{preset} ml</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
