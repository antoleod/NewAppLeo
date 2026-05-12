import React, { useEffect } from 'react';
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
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing, radii } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { typography } from '@/typography';
import { shadow } from '@/lib/shadow';

function withColorOpacity(color: string, opacity: number) {
  const alpha = Math.max(0, Math.min(1, opacity));
  const hex = color.trim().match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const value = hex[1];
    const red = parseInt(value.slice(0, 2), 16);
    const green = parseInt(value.slice(2, 4), 16);
    const blue = parseInt(value.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  const rgb = color.trim().match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const channels = rgb[1].split(',').slice(0, 3).map((part) => part.trim());
    return `rgba(${channels.join(', ')}, ${alpha})`;
  }

  return color;
}

export function Page({
  children,
  scroll = true,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: any;
}) {
  const { width } = useWindowDimensions();
  const { colors, gradients, themeStyle, backgroundPhotoUri } = useTheme();
  const isDesktopWeb = Platform.OS === 'web' && width >= 1100;
  const pageMaxWidth = isDesktopWeb ? 980 : width >= 1100 ? 1040 : 1100;
  const usePhotoBackdrop = themeStyle !== 'classic';
  const backdropSource = backgroundPhotoUri
    ? ({ uri: backgroundPhotoUri } as const)
    : require('../../../assets/img/baby1.f57cad83ec056a25eac37625af9c68fb.jpg');
  const backdropBlur = themeStyle === 'photo' ? 2 : Platform.OS === 'web' ? 0 : 12;
  const content = (
    <View style={[styles.pageInner, { maxWidth: pageMaxWidth }, contentStyle]}>
      {children}
    </View>
  );

  // Always set a dark/themed background so iOS overscroll bounce never exposes white
  const pageBackground = usePhotoBackdrop ? colors.background : colors.background;

  return (
    <View style={[styles.page, { backgroundColor: pageBackground }]}>
      {usePhotoBackdrop ? (
        <ImageBackground
          source={backdropSource}
          resizeMode="cover"
          blurRadius={backdropBlur}
          style={styles.photoBackdrop}
          imageStyle={[
            styles.photoBackdropImage,
            themeStyle === 'photo' ? styles.photoBackdropImagePunch : null,
            Platform.OS === 'web' ? ({ objectPosition: 'center center' } as any) : null,
          ]}
        >
          <LinearGradient colors={gradients.page as [string, string, ...string[]]} style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={themeStyle === 'photo'
              ? ['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.28)']
              : ['rgba(0,0,0,0.04)', 'rgba(0,0,0,0.14)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </ImageBackground>
      ) : (
        <LinearGradient colors={gradients.page as [string, string, ...string[]]} style={StyleSheet.absoluteFill} />
      )}
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        {scroll ? (
          <ScrollView contentContainerStyle={[styles.scroll, isDesktopWeb && styles.scrollDesktop]} showsVerticalScrollIndicator={false}>
            {content}
          </ScrollView>
        ) : (
          <View style={[styles.scrollStatic, isDesktopWeb && styles.scrollDesktop]}>{content}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const isDesktopWeb = Platform.OS === 'web' && width >= 1100;
  return (
    <View
      style={[
        styles.card,
        isDesktopWeb && styles.cardDesktop,
        {
          backgroundColor: theme.bgCard,
          borderColor: theme.border,
          ...shadow(theme.textPrimary, 0.04, 10, 0, 6),
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
  const { theme, themeStyle, mode } = useTheme();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 1100;
  const scale = isDesktopWeb ? 0.9 : width >= 900 ? 0.98 : 1;
  const isCenter = align === 'center';
  const isDark = mode === 'dark';

  const iconName: keyof typeof Ionicons.glyphMap =
    pathname.includes('settings-theme') ? 'color-palette-outline' :
    pathname.includes('/profile') ? 'person-circle-outline' :
    pathname.includes('/history') ? 'time-outline' :
    pathname.includes('/insights') ? 'analytics-outline' :
    pathname.includes('/home') ? 'home-outline' :
    pathname.includes('/onboarding') ? 'sparkles-outline' :
    'ellipse-outline';

  // Stops adapt to themeStyle AND to dark/light so the heading sits well on each surface mode.
  // Light mode needs richer accent + a slightly tinted (not white) base so it doesn't wash out;
  // dark mode keeps subtler stops because the dark surface naturally grounds the gradient.
  const stops =
    themeStyle === 'photo'
      ? { strong: 0.26, soft: 0.10, fadeBase: 0.18, fadeEnd: 0 }
      : themeStyle === 'classic'
        ? isDark
          ? { strong: 0.16, soft: 0.06, fadeBase: 0.5, fadeEnd: 0.18 }
          : { strong: 0.22, soft: 0.10, fadeBase: 0.55, fadeEnd: 0.22 }
        : isDark
          ? { strong: 0.18, soft: 0.06, fadeBase: 0.28, fadeEnd: 0 }
          : { strong: 0.26, soft: 0.12, fadeBase: 0.14, fadeEnd: 0 };

  // Light mode uses bgCardAlt (slightly tinted) instead of bgCard (pure white) so the
  // heading reads a touch darker / more grounded against the page.
  const fadeSurface = isDark ? theme.bgCard : theme.bgCardAlt;
  const cardBase = withColorOpacity(fadeSurface, stops.fadeBase);
  const cardEnd = stops.fadeEnd > 0 ? withColorOpacity(fadeSurface, stops.fadeEnd) : 'transparent';
  const accentStrong = withColorOpacity(theme.accent, stops.strong);
  const accentSoft = withColorOpacity(theme.accent, stops.soft);

  const gradientColors = [accentStrong, accentSoft, cardBase, cardEnd] as const;

  const containerBorder = withColorOpacity(theme.accent, isDark ? 0.28 : 0.28);
  const innerHighlight = withColorOpacity('#ffffff', isDark ? 0.06 : 0.22);
  const eyebrowBg = withColorOpacity(theme.accent, isDark ? 0.18 : 0.18);
  const eyebrowBorder = withColorOpacity(theme.accent, isDark ? 0.4 : 0.38);
  const accentRibbon = withColorOpacity(theme.accent, isDark ? 0.7 : 0.8);

  return (
    <View
      style={{
        marginHorizontal: -2,
        marginBottom: 2,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: containerBorder,
        ...shadow(theme.accent, themeStyle === 'classic' ? 0.06 : 0.04, 12, 0, 6),
      }}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: isCenter ? 0.5 : 0, y: 0 }}
        end={{ x: isCenter ? 0.5 : 1, y: 1 }}
        style={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 14,
          alignItems: isCenter ? 'center' : 'flex-start',
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: 1,
            backgroundColor: innerHighlight,
          }}
        />
        {!isCenter ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              top: 14,
              bottom: 14,
              width: 3,
              borderTopRightRadius: 3,
              borderBottomRightRadius: 3,
              backgroundColor: accentRibbon,
            }}
          />
        ) : null}

        {eyebrow ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginBottom: 10,
              backgroundColor: eyebrowBg,
              borderWidth: 1,
              borderColor: eyebrowBorder,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 20,
              alignSelf: isCenter ? 'center' : 'flex-start',
            }}
          >
            <Ionicons name={iconName} size={11} color={theme.accent} />
            <Text
              style={{
                color: theme.accent,
                fontSize: Math.round(10 * scale),
                fontWeight: '700',
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              }}
            >
              {eyebrow}
            </Text>
          </View>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: isCenter ? 'center' : 'space-between',
            gap: 10,
            alignSelf: 'stretch',
          }}
        >
          <Text
            style={{
              color: theme.textPrimary,
              fontSize: Math.round(24 * scale),
              fontWeight: '800',
              letterSpacing: -0.5,
              lineHeight: Math.round(30 * scale),
              textAlign: isCenter ? 'center' : 'left',
              flex: 1,
            }}
          >
            {title}
          </Text>
          {action ?? null}
        </View>

        {subtitle ? (
          <Text
            style={{
              color: theme.textMuted,
              fontSize: Math.round(13 * scale),
              fontWeight: '500',
              marginTop: 6,
              lineHeight: Math.round(18 * scale),
              textAlign: isCenter ? 'center' : 'left',
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </LinearGradient>
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
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: any;
}) {
  const { width } = useWindowDimensions();
  const { theme, buttonOpacity, buttonTransparency } = useTheme();
  const isDesktopWeb = Platform.OS === 'web' && width >= 1100;
  const solidOpacity = disabled ? 0.45 : buttonOpacity;
  const backgroundOpacity = disabled ? 0.45 : buttonTransparency;
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
  const transparentBackground = withColorOpacity(background, backgroundOpacity);
  const transparentBorder = variant === 'ghost' ? borderColor : withColorOpacity(background, Math.min(1, backgroundOpacity + 0.18));
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
          minHeight: isDesktopWeb ? (isSmall ? 36 : 44) : isSmall ? 40 : 48,
          width: fullWidth ? '100%' : undefined,
          backgroundColor: transparentBackground,
          borderColor: transparentBorder,
          opacity: pressed ? Math.min(solidOpacity, 0.85) : solidOpacity,
          ...shadow(theme.textPrimary, variant === 'ghost' || disabled ? 0 : 0.08 * backgroundOpacity, 14, 0, 8),
          elevation: variant === 'ghost' ? 0 : 2,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? theme.accent : '#ffffff'} />
      ) : (
        <Text style={[styles.buttonLabel, { color, fontSize: isDesktopWeb ? (isSmall ? 12 : 14) : isSmall ? 13 : 15 }]}>{label}</Text>
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
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const isDesktopWeb = Platform.OS === 'web' && width >= 1280;
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
          isDesktopWeb && styles.inputDesktop,
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
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const shouldStack = width < 520;
  return (
    <View style={[styles.segment, shouldStack && styles.segmentStack, { borderColor: theme.border, backgroundColor: theme.pillBg }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.segmentItem,
              shouldStack && styles.segmentItemStack,
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
  icon,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.empty, { backgroundColor: theme.bgCardAlt, borderColor: theme.border }]}>
      {icon ? (
        <View
          style={[
            styles.emptyIcon,
            { backgroundColor: `${theme.accent}1A`, borderColor: `${theme.accent}33` },
          ]}
        >
          <Ionicons name={icon} size={32} color={theme.accent} />
        </View>
      ) : null}
      <Text style={[styles.emptyTitle, { color: theme.textPrimary, textAlign: 'center' }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: theme.textMuted, textAlign: 'center' }]}>{body}</Text>
      {action}
    </View>
  );
}

export function Skeleton({
  width,
  height = 16,
  radius = 8,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: any;
}) {
  const { theme } = useTheme();
  const shimmer = useSharedValue(0.5);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: (width as any) ?? '100%',
          height,
          borderRadius: radius,
          backgroundColor: theme.bgCardAlt,
          borderWidth: 1,
          borderColor: theme.border,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.bgCard,
          borderColor: theme.border,
          ...shadow(theme.textPrimary, 0.04, 10, 0, 6),
          gap: 10,
        },
      ]}
    >
      <Skeleton width="60%" height={18} />
      {Array.from({ length: lines }).map((_, idx) => (
        <Skeleton key={idx} width={idx === lines - 1 ? '40%' : '100%'} height={12} />
      ))}
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
            transform: [{ translateX: value ? 22 : 2 }],
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
            ...shadow(color, 0.2, 6, 0, 3),
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
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  scrollStatic: {
    flex: 1,
  },
  scrollDesktop: {
    paddingHorizontal: spacing.lg,
  },
  pageInner: {
    flex: 1,
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    elevation: 1,
  },
  cardDesktop: {
    borderRadius: 20,
    padding: spacing.md,
    gap: spacing.sm,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  headingStacked: {
    flexDirection: 'column',
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
  inputDesktop: {
    minHeight: 44,
    paddingVertical: 10,
    fontSize: 13,
    lineHeight: 18,
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
    flexWrap: 'nowrap',
    borderWidth: 1,
    borderRadius: radii.pill,
    padding: 4,
    gap: 4,
  },
  segmentStack: {
    flexDirection: 'column',
    borderRadius: radii.lg,
  },
  segmentItem: {
    flex: 1,
    borderRadius: radii.pill,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  segmentItemStack: {
    flex: 0,
    width: '100%',
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
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
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
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    height: 48,
    gap: spacing.md,
  },
  toggleThumb: {
    width: 24,
    height: 24,
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
    width: 48,
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    elevation: 2,
  },
  swatchLabel: {
    ...typography.detail,
    fontSize: 11,
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




