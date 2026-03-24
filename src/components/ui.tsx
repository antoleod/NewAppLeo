import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing, radii } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

export function Page({
  children,
  scroll = true,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: any;
}) {
  const { colors, gradients } = useTheme();
  const { width } = useWindowDimensions();
  const maxWidth = width >= 1080 ? 1120 : width >= 768 ? 920 : '100%';
  const content = (
    <View style={[styles.pageInner, { maxWidth }, contentStyle]}>
      {children}
    </View>
  );

  return (
    <LinearGradient colors={gradients.page as [string, string, ...string[]]} style={[styles.page, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {scroll ? (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {content}
          </ScrollView>
        ) : (
          <View style={styles.scroll}>{content}</View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  const { colors } = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }, style]}>{children}</View>;
}

export function Heading({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.headingRow}>
      <View style={{ flex: 1, gap: spacing.xs }}>
        {eyebrow ? <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow}</Text> : null}
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  fullWidth = true,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  fullWidth?: boolean;
}) {
  const { colors } = useTheme();
  const background =
    variant === 'primary'
      ? colors.primary
      : variant === 'secondary'
        ? colors.secondary
        : variant === 'danger'
          ? colors.danger
          : 'transparent';
  const color = variant === 'ghost' ? colors.text : '#ffffff';
  const borderColor = variant === 'ghost' ? colors.border : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.button,
        {
          width: fullWidth ? '100%' : undefined,
          backgroundColor: background,
          borderColor,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? colors.primary : '#ffffff'} />
      ) : (
        <Text style={[styles.buttonLabel, { color }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Input({
  label,
  hint,
  error,
  multiline,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry,
  autoCapitalize = 'none',
  textContentType,
  inputMode,
}: {
  label: string;
  hint?: string;
  error?: string;
  multiline?: boolean;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: any;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  textContentType?: any;
  inputMode?: any;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        textContentType={textContentType}
        inputMode={inputMode}
        style={[
          styles.input,
          { color: colors.text, borderColor: error ? colors.danger : colors.border, backgroundColor: colors.backgroundAlt },
          multiline && styles.textArea,
        ]}
      />
      {error ? <Text style={[styles.hint, { color: colors.danger }]}>{error}</Text> : hint ? <Text style={[styles.hint, { color: colors.muted }]}>{hint}</Text> : null}
    </View>
  );
}

export function Segment({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.segment, { borderColor: colors.border, backgroundColor: colors.backgroundAlt }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.segmentItem,
              selected && { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.segmentLabel, { color: selected ? colors.text : colors.muted }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primarySoft : colors.backgroundAlt },
      ]}
    >
      <Text style={[styles.chipLabel, { color: selected ? colors.primary : colors.muted }]}>{label}</Text>
    </Pressable>
  );
}

export function StatPill({
  label,
  value,
  tone = 'primary',
}: {
  label: string;
  value: string;
  tone?: 'primary' | 'secondary' | 'success' | 'warning';
}) {
  const { colors } = useTheme();
  const toneColor = tone === 'primary' ? colors.primary : tone === 'secondary' ? colors.secondary : tone === 'success' ? colors.success : colors.warning;
  const toneBg = tone === 'primary' ? colors.primarySoft : tone === 'secondary' ? colors.secondarySoft : tone === 'success' ? colors.successSoft : colors.warningSoft;
  return (
    <View style={[styles.stat, { backgroundColor: toneBg, borderColor: colors.border }]}>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: toneColor }]}>{value}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.empty, { backgroundColor: colors.backgroundAlt, borderColor: colors.border }]}>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: colors.muted }]}>{body}</Text>
      {action}
    </View>
  );
}

export function EntryCard({
  title,
  subtitle,
  notes,
  right,
  onPress,
}: {
  title: string;
  subtitle: string;
  notes?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }: any) => [
        styles.entryCard,
        { backgroundColor: colors.surface, borderColor: colors.cardBorder, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={[styles.entryTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.entrySubtitle, { color: colors.muted }]}>{subtitle}</Text>
        {notes ? (
          <Text style={[styles.entryNotes, { color: colors.muted }]} numberOfLines={2}>
            {notes}
          </Text>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  pageInner: {
    width: '100%',
    alignSelf: 'center',
    gap: spacing.lg,
  },
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    lineHeight: 16,
  },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radii.pill,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    borderRadius: radii.pill,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  chip: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  stat: {
    flexBasis: '48%',
    minWidth: 145,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 6,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  empty: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  entryCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  entrySubtitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  entryNotes: {
    fontSize: 13,
    lineHeight: 19,
  },
});
