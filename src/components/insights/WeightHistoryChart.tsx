import React, { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { useAppData } from '@/context/AppDataContext';
import { EmptyState } from '@/components/shared';
import { spacing } from '@/theme';
import type { EntryRecord } from '@/types';

interface WeightHistoryChartProps {
  limit?: number;
  onEditEntry?: (entry: EntryRecord) => void;
}

export function WeightHistoryChart({ limit = 10, onEditEntry }: WeightHistoryChartProps) {
  const { colors, gradients } = useTheme();
  const { entries } = useAppData();

  const weightEntries = useMemo(() => {
    return entries
      .filter((e) => e.type === 'measurement' && e.payload.weightKg)
      .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())
      .slice(-limit);
  }, [entries, limit]);

  if (!weightEntries.length) {
    return (
      <EmptyState
        icon="scale-outline"
        title="No weight records"
        body="Weight measurements will appear here once you log them."
      />
    );
  }

  const minWeight = Math.min(...weightEntries.map((e) => e.payload.weightKg || 0));
  const maxWeight = Math.max(...weightEntries.map((e) => e.payload.weightKg || 0));
  const range = maxWeight - minWeight || 1;

  return (
    <View style={{ gap: spacing.md }}>
      {weightEntries.map((entry) => {
        const weight = entry.payload.weightKg || 0;
        const normalized = (weight - minWeight) / range;
        const barWidth = Math.max(30, normalized * 100);
        const date = new Date(entry.occurredAt);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return (
          <Pressable
            key={entry.id}
            onPress={() => onEditEntry?.(entry)}
            style={({ pressed }) => ({
              gap: 4,
              opacity: pressed ? 0.7 : 1,
              paddingVertical: 4,
              paddingHorizontal: 8,
              borderRadius: 8,
              backgroundColor: pressed ? colors.backgroundAlt : 'transparent',
            })}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{dateStr}</Text>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{weight.toFixed(1)} kg</Text>
            </View>
            <LinearGradient
              colors={[colors.primary, colors.accent || colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                height: 6,
                borderRadius: 3,
                width: `${barWidth}%`,
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
