import React from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Platform,
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
  const { colors, gradients, themeStyle, backgroundPhotoUri } = useTheme();
  const usePhotoBackdrop = themeStyle !== 'classic';
  const backdropSource = backgroundPhotoUri
    ? ({ uri: backgroundPhotoUri } as const)
    : require('../../assets/img/baby1.f57cad83ec056a25eac37625af9c68fb.jpg');
  const backdropBlur = themeStyle === 'photo' ? 0 : Platform.OS === 'web' ? 0 : 4;
  const content = (
    <View style={[styles.pageInner, contentStyle]}>
      {children}
    </View>
  );

  return (
    <View style={[styles.page, { backgroundColor: usePhotoBackdrop ? 'transparent' : colors.background }]}>
      {usePhotoBackdrop ? (
        <ImageBackground
          source={backdropSource}
          resizeMode="cover"
          blurRadius={backdropBlur}
          style={styles.photoBackdrop}
          imageStyle={[
            styles.photoBackdropImage,
            themeStyle === 'photo' ? null : styles.photoBackdropImageMuted,
            themeStyle === 'photo' ? styles.photoBackdropImagePunch : null,
            Platform.OS === 'web' ? ({ objectPosition: 'center center' } as any) : null,
          ]}
        >
          <LinearGradient colors={gradients.page as [string, string, ...string[]]} style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={themeStyle === 'photo' ? ['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.22)'] : ['rgba(0,0,0,0.10)', 'rgba(0,0,0,0.28)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: themeStyle === 'photo' ? 'rgba(6, 8, 12, 0.00)' : 'rgba(8, 10, 14, 0.05)' },
            ]}
          />
        </ImageBackground>
      ) : (
        <LinearGradient colors={gradients.page as [string, string, ...string[]]} style={StyleSheet.absoluteFill} />
      )}
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {scroll ? (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {content}
          </ScrollView>
        ) : (
          <View style={styles.scroll}>{content}</View>
        )}
      </SafeAreaView>
    </View>
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
  const scale = width >= 900 ? 1.08 : width >= 700 ? 1.04 : 1.12;
  return (
    <View style={[styles.headingRow, align === 'center' && styles.headingCentered]}>
      <View style={{ flex: 1, gap: spacing.xs, alignItems: align === 'center' ? 'center' : 'flex-start' }}>
        {eyebrow ? <Text style={[styles.eyebrow, { color: theme.accent, fontSize: 13 * scale }, align === 'center' && { textAlign: 'center' }]}>{eyebrow}</Text> : null}
        <Text style={[styles.title, { color: theme.textPrimary, fontSize: 27 * scale }, align === 'center' && { textAlign: 'center' }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: theme.textMuted, fontSize: 16 * scale }, align === 'center' && { textAlign: 'center' }]}>{subtitle}</Text> : null}
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
  style,
}: {
  label: string;
  onPress: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: any;
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
          minHeight: isSmall ? 50 : 62,
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
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? theme.accent : '#ffffff'} />
      ) : (
        <Text style={[styles.buttonLabel, { color, fontSize: isSmall ? 16 : 19 }]}>{label}</Text>
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
  rightAccessory,
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
  rightAccessory?: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.textPrimary }]}>{label}</Text>
      <View
        style={[
          styles.inputShell,
          { borderColor: error ? theme.red : theme.border, backgroundColor: theme.bgCardAlt },
          multiline && styles.textArea,
        ]}
      >
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
            { color: theme.textPrimary },
            multiline && styles.textAreaInput,
            !!rightAccessory && styles.inputWithAccessory,
          ]}
        />
        {rightAccessory ? <View style={styles.inputAccessory}>{rightAccessory}</View> : null}
      </View>
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

export function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={[
        styles.toggleContainer,
        {
          backgroundColor: value ? theme.accent : theme.pillBg,
          borderColor: value ? theme.accent : theme.border,
        },
      ]}
    >
      <View
        style={[
          styles.toggleThumb,
          {
            backgroundColor: value ? theme.accentText : theme.textMuted,
            transform: [{ translateX: value ? 26 : 2 }],
          },
        ]}
      />
      {label ? (
        <Text style={[styles.toggleLabel, { color: value ? theme.accentText : theme.textPrimary }]}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function ColorSwatch({
  color,
  label,
}: {
  color: string;
  label?: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.swatchContainer}>
      <View
        style={[
          styles.swatch,
          {
            backgroundColor: color,
            borderColor: theme.border,
            shadowColor: color,
          },
        ]}
      />
      {label ? (
        <Text style={[styles.swatchLabel, { color: theme.textMuted }]}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.sectionHeaderContainer}>
      <Text style={[styles.sectionHeaderTitle, { color: theme.textPrimary }]}>
        {title}
      </Text>
      {action}
    </View>
  );
}

export function ButtonGroup({
  buttons,
  direction = 'row',
}: {
  buttons: Array<{ label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' }>;
  direction?: 'row' | 'column';
}) {
  return (
    <View style={[styles.buttonGroup, { flexDirection: direction }]}>
      {buttons.map((btn, idx) => (
        <View key={idx} style={{ flex: direction === 'row' ? 1 : undefined }}>
          <Button
            label={btn.label}
            onPress={btn.onPress}
            variant={btn.variant}
            size={btn.size}
            fullWidth
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  photoBackdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  photoBackdropImage: {
    opacity: 1,
  },
  photoBackdropImagePunch: {
    opacity: 0.98,
    transform: [{ scale: 1.06 }],
  },
  photoBackdropImageMuted: {
    opacity: 0.9,
  },
  safe: { flex: 1, zIndex: 1 },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  pageInner: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    gap: spacing.lg,
  },
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.md,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
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
    lineHeight: 42,
  },
  subtitle: {
    ...typography.body,
    lineHeight: 24,
  },
  button: {
    minHeight: 62,
    paddingHorizontal: spacing.xl,
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
    gap: 10,
  },
  label: {
    ...typography.statLabel,
    fontWeight: '700',
  },
  inputShell: {
    minHeight: 62,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    minHeight: 62,
    paddingHorizontal: spacing.md,
    paddingVertical: 16,
    flex: 1,
    ...typography.body,
  },
  inputWithAccessory: {
    paddingRight: 8,
  },
  inputAccessory: {
    paddingRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textArea: {
    minHeight: 132,
    alignItems: 'flex-start',
  },
  textAreaInput: {
    minHeight: 132,
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
    padding: 5,
    gap: 6,
  },
  segmentItem: {
    flex: 1,
    borderRadius: radii.pill,
    paddingVertical: 13,
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
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipLabel: {
    ...typography.pill,
    fontWeight: '700',
  },
  stat: {
    flexBasis: '48%',
    minWidth: 170,
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
    fontSize: 20,
    fontWeight: '800',
  },
  entrySubtitle: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '700',
  },
  entryNotes: {
    ...typography.detail,
    lineHeight: 19,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    height: 60,
    gap: spacing.md,
  },
  toggleThumb: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
  },
  toggleLabel: {
    ...typography.pill,
    fontWeight: '700',
  },
  swatchContainer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  swatch: {
    width: 58,
    height: 58,
    borderRadius: radii.md,
    borderWidth: 1,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  swatchLabel: {
    ...typography.detail,
    fontSize: 13,
    textAlign: 'center',
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionHeaderTitle: {
    ...typography.sectionTitle,
    fontWeight: '800',
  },
  buttonGroup: {
    gap: spacing.md,
  },
});
