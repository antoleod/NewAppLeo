import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { spacing, radii } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { typography } from '@/typography';
import { shadow } from '@/utils/shadow';
import { withColorOpacity } from './_utils';
import { Button } from './primitives';

export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const isDesktopWeb = Platform.OS === 'web' && width >= 1100;
  return (
    <View
      style={[
        styles.card,
        isDesktopWeb && styles.cardDesktop,
        { backgroundColor: theme.bgCard, borderColor: theme.border, ...shadow(theme.textPrimary, 0.04, 10, 0, 6) },
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

  const stops =
    themeStyle === 'photo'
      ? isDark
        ? { strong: 0.42, soft: 0.22, fadeBase: 0.72, fadeEnd: 0.48 }
        : { strong: 0.36, soft: 0.20, fadeBase: 0.78, fadeEnd: 0.55 }
      : themeStyle === 'classic'
        ? isDark
          ? { strong: 0.16, soft: 0.06, fadeBase: 0.5, fadeEnd: 0.18 }
          : { strong: 0.22, soft: 0.10, fadeBase: 0.55, fadeEnd: 0.22 }
        : isDark
          ? { strong: 0.18, soft: 0.06, fadeBase: 0.28, fadeEnd: 0 }
          : { strong: 0.26, soft: 0.12, fadeBase: 0.14, fadeEnd: 0 };

  const fadeSurface = theme.bgCard;
  const cardBase = withColorOpacity(fadeSurface, stops.fadeBase);
  const cardEnd = stops.fadeEnd > 0 ? withColorOpacity(fadeSurface, stops.fadeEnd) : 'transparent';
  const accentStrong = withColorOpacity(theme.accent, stops.strong);
  const accentSoft = withColorOpacity(theme.accent, stops.soft);
  const gradientColors = [accentStrong, accentSoft, cardBase, cardEnd] as const;
  const containerBorder = withColorOpacity(theme.accent, themeStyle === 'photo' ? 0.42 : isDark ? 0.28 : 0.32);
  const innerHighlight = withColorOpacity('#ffffff', themeStyle === 'photo' ? 0.38 : isDark ? 0.06 : 0.22);
  const eyebrowBg = withColorOpacity(theme.accent, themeStyle === 'photo' ? 0.28 : isDark ? 0.18 : 0.2);
  const eyebrowBorder = withColorOpacity(theme.accent, themeStyle === 'photo' ? 0.58 : isDark ? 0.4 : 0.42);
  const accentRibbon = withColorOpacity(theme.accent, isDark ? 0.7 : 0.8);
  const headingTitleColor = themeStyle === 'photo' && !isDark ? '#111111' : theme.textPrimary;
  const headingShadow = themeStyle === 'photo'
    ? { textShadowColor: 'rgba(255,255,255,0.42)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }
    : null;

  return (
    <View
      style={{
        marginHorizontal: -2, marginBottom: 2, borderRadius: 18, overflow: 'hidden',
        borderWidth: 1, borderColor: containerBorder,
        backgroundColor: withColorOpacity(fadeSurface, themeStyle === 'photo' ? 0.72 : 0.18),
        ...shadow(theme.accent, themeStyle === 'classic' ? 0.06 : themeStyle === 'photo' ? 0.12 : 0.05, 14, 0, 7),
      }}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: isCenter ? 0.5 : 0, y: 0 }}
        end={{ x: isCenter ? 0.5 : 1, y: 1 }}
        style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, alignItems: isCenter ? 'center' : 'flex-start' }}
      >
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1, backgroundColor: innerHighlight }} />
        {!isCenter ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 14, bottom: 14, width: 3, borderTopRightRadius: 3, borderBottomRightRadius: 3, backgroundColor: accentRibbon }} />
        ) : null}
        {eyebrow ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, backgroundColor: eyebrowBg, borderWidth: 1, borderColor: eyebrowBorder, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: isCenter ? 'center' : 'flex-start' }}>
            <Ionicons name={iconName} size={11} color={theme.accent} />
            <Text style={{ color: theme.accent, fontSize: Math.round(10 * scale), fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase' }}>{eyebrow}</Text>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: isCenter ? 'center' : 'space-between', gap: 10, alignSelf: 'stretch' }}>
          <Text style={{ color: headingTitleColor, fontSize: Math.round(24 * scale), fontWeight: '900', letterSpacing: -0.5, lineHeight: Math.round(30 * scale), textAlign: isCenter ? 'center' : 'left', flex: 1, ...(headingShadow as any) }}>
            {title}
          </Text>
          {action ?? null}
        </View>
        {subtitle ? (
          <Text style={{ color: theme.textMuted, fontSize: Math.round(13 * scale), fontWeight: '500', marginTop: 6, lineHeight: Math.round(18 * scale), textAlign: isCenter ? 'center' : 'left' }}>
            {subtitle}
          </Text>
        ) : null}
      </LinearGradient>
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={styles.sectionHeaderContainer}>
      <Text style={[styles.sectionHeaderTitle, { color: theme.textPrimary }]}>{title}</Text>
      {action}
    </View>
  );
}

export function ButtonGroup({
  buttons,
  direction = 'row',
}: {
  buttons: { label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' }[];
  direction?: 'row' | 'column';
}) {
  return (
    <View style={[styles.buttonGroup, { flexDirection: direction }]}>
      {buttons.map((btn, idx) => (
        <View key={idx} style={{ flex: direction === 'row' ? 1 : undefined }}>
          <Button label={btn.label} onPress={btn.onPress} variant={btn.variant} size={btn.size} fullWidth />
        </View>
      ))}
    </View>
  );
}

export function EntryCard({
  title, subtitle, notes, right, onPress,
}: {
  title: string; subtitle: string; notes?: string; right?: React.ReactNode; onPress?: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }: any) => [styles.entryCard, { backgroundColor: theme.bgCard, borderColor: theme.border, opacity: pressed ? 0.92 : 1 }]}
    >
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={[styles.entryTitle, { color: theme.textPrimary }]}>{title}</Text>
        <Text style={[styles.entrySubtitle, { color: theme.textMuted }]}>{subtitle}</Text>
        {notes ? <Text style={[styles.entryNotes, { color: theme.textMuted }]} numberOfLines={2}>{notes}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border, ...shadow(theme.textPrimary, 0.04, 10, 0, 6), gap: 10 }]}>
      <SkeletonLine width="60%" height={18} />
      {Array.from({ length: lines }).map((_, idx) => (
        <SkeletonLine key={idx} width={idx === lines - 1 ? '40%' : '100%'} height={12} />
      ))}
    </View>
  );
}

// Internal helper — not exported. Skeleton (animated) is in feedback.tsx; SkeletonCard only needs static bars.
function SkeletonLine({ width, height = 16 }: { width?: number | `${number}%`; height?: number }) {
  const { theme } = useTheme();
  return <View style={{ width: (width as any) ?? '100%', height, borderRadius: 8, backgroundColor: theme.bgCardAlt, borderWidth: 1, borderColor: theme.border }} />;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md, elevation: 1 },
  cardDesktop: { borderRadius: 20, padding: spacing.md, gap: spacing.sm },
  sectionHeaderContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  sectionHeaderTitle: { ...typography.sectionTitle, fontWeight: '800' },
  buttonGroup: { gap: spacing.md },
  entryCard: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, flexDirection: 'row', gap: spacing.md },
  entryTitle: { ...typography.sectionTitle, fontSize: 16, fontWeight: '800' },
  entrySubtitle: { ...typography.body, fontSize: 13, fontWeight: '700' },
  entryNotes: { ...typography.detail, lineHeight: 19 },
});
