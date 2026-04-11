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
import { typography } from '@/typography';

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
  const content = (
    <View style={[styles.pageInner, contentStyle]}>
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
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.bgCard,
          borderColor: theme.border,
          shadowColor: theme.textPrimary,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Heading({
  eyebrow,
  title,
  subtitle,
  action,
  align = 'center',
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  align?: 'left' | 'center';
}) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const scale = width >= 900 ? 1.08 : width >= 700 ? 1.04 : 1;
  return (
    <View style={[styles.headingRow, align === 'center' && styles.headingCentered]}>
      <View style={{ flex: 1, gap: spacing.xs, alignItems: align === 'center' ? 'center' : 'flex-start' }}>
        {eyebrow ? <Text style={[styles.eyebrow, { color: theme.accent, fontSize: 11 * scale }, align === 'center' && { textAlign: 'center' }]}>{eyebrow}</Text> : null}
        <Text style={[styles.title, { color: theme.textPrimary, fontSize: 22 * scale }, align === 'center' && { textAlign: 'center' }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: theme.textMuted, fontSize: 13 * scale }, align === 'center' && { textAlign: 'center' }]}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  const { theme } = useTheme();
  const background =
    variant === 'primary'
      ? theme.accent
      : variant === 'secondary'
        ? theme.blue
        : variant === 'danger'
      ? theme.red
          : 'transparent';
  const color = variant === 'ghost' ? theme.textPrimary : variant === 'primary' ? theme.accentText : '#ffffff';
  const borderColor = variant === 'ghost' ? theme.border : 'transparent';
  const isSmall = size === 'sm';

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
      style={({ pressed }) => [
        styles.button,
        {
          minHeight: isSmall ? 40 : 48,
          width: fullWidth ? '100%' : undefined,
          backgroundColor: background,
          borderColor,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          shadowColor: variant === 'ghost' ? 'transparent' : theme.textPrimary,
          shadowOpacity: variant === 'ghost' ? 0 : 0.08,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: variant === 'ghost' ? 0 : 2,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? theme.accent : '#ffffff'} />
      ) : (
        <Text style={[styles.buttonLabel, { color, fontSize: isSmall ? 13 : 15 }]}>{label}</Text>
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
  const { theme } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.textPrimary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        textContentType={textContentType}
        inputMode={inputMode}
        style={[
          styles.input,
          { color: theme.textPrimary, borderColor: error ? theme.red : theme.border, backgroundColor: theme.bgCardAlt },
          multiline && styles.textArea,
        ]}
      />
      {error ? <Text style={[styles.hint, { color: theme.red }]}>{error}</Text> : hint ? <Text style={[styles.hint, { color: theme.textMuted }]}>{hint}</Text> : null}
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
  const { theme } = useTheme();
  return (
    <View style={[styles.segment, { borderColor: theme.border, backgroundColor: theme.pillBg }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.segmentItem,
              selected && { backgroundColor: theme.bgCard, borderColor: theme.borderActive },
            ]}
          >
            <Text style={[styles.segmentLabel, { color: selected ? theme.textPrimary : theme.textMuted }]}>{option.label}</Text>
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
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: selected ? theme.accent : theme.border, backgroundColor: selected ? `${theme.accent}22` : theme.bgCardAlt },
      ]}
    >
      <Text style={[styles.chipLabel, { color: selected ? theme.accent : theme.textMuted }]}>{label}</Text>
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
  const { theme } = useTheme();
  const toneColor = tone === 'primary' ? theme.accent : tone === 'secondary' ? theme.blue : tone === 'success' ? theme.green : theme.accent;
  const toneBg = `${toneColor}22`;
  return (
    <View style={[styles.stat, { backgroundColor: toneBg, borderColor: theme.border }]}>
      <Text style={[styles.statLabel, { color: theme.textMuted, textAlign: 'center' }]}>{label}</Text>
      <Text style={[styles.statValue, { color: toneColor, textAlign: 'center' }]}>{value}</Text>
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
  const { theme } = useTheme();
  return (
    <View style={[styles.empty, { backgroundColor: theme.bgCardAlt, borderColor: theme.border }]}>
      <Text style={[styles.emptyTitle, { color: theme.textPrimary, textAlign: 'center' }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: theme.textMuted, textAlign: 'center' }]}>{body}</Text>
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
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }: any) => [
        styles.entryCard,
        { backgroundColor: theme.bgCard, borderColor: theme.border, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={[styles.entryTitle, { color: theme.textPrimary }]}>{title}</Text>
        <Text style={[styles.entrySubtitle, { color: theme.textMuted }]}>{subtitle}</Text>
        {notes ? (
          <Text style={[styles.entryNotes, { color: theme.textMuted }]} numberOfLines={2}>
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
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  headingCentered: {
    justifyContent: 'center',
  },
  eyebrow: {
    ...typography.sectionLabel,
    textTransform: 'uppercase',
  },
  title: {
    ...typography.heroName,
    lineHeight: 36,
  },
  subtitle: {
    ...typography.body,
    lineHeight: 20,
  },
  button: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  buttonLabel: {
    ...typography.pill,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  field: {
    gap: 8,
  },
  label: {
    ...typography.statLabel,
    fontWeight: '700',
  },
  input: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...typography.body,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  hint: {
    ...typography.detail,
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
    ...typography.pill,
    fontWeight: '800',
  },
  chip: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipLabel: {
    ...typography.pill,
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
    ...typography.statLabel,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  statValue: {
    ...typography.statValue,
    fontWeight: '800',
  },
  empty: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  emptyTitle: {
    ...typography.sectionTitle,
    fontWeight: '800',
  },
  emptyBody: {
    ...typography.body,
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
    ...typography.sectionTitle,
    fontSize: 16,
    fontWeight: '800',
  },
  entrySubtitle: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '700',
  },
  entryNotes: {
    ...typography.detail,
    lineHeight: 19,
  },
});
