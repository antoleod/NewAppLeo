import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, Page, Segment } from '@/components/ui';
import { BackgroundPhotoSelector } from '@/components/BackgroundPhotoSelector';
import { DataImporter } from '@/components/DataImporter';
import { spacing } from '@/theme';
import { getAppSettings, updateAppSettings, type ThemeVariant } from '@/lib/storage';
import { BabyFlowIcon } from '@/components/BabyFlowIcon';

const quickPalette = [
  { key: 'sage', color: '#4d7c6b' },
  { key: 'gold', color: '#c18f54' },
  { key: 'forest', color: '#2f7d57' },
  { key: 'sky', color: '#8eb5ea' },
  { key: 'rose', color: '#d08ba0' },
  { key: 'navy', color: '#1d4e89' },
  { key: 'sand', color: '#e6b566' },
  { key: 'ocean', color: '#4a6fa5' },
];

const themeVariants: Array<{ label: string; value: ThemeVariant; description: string }> = [
  { label: 'Sage', value: 'sage', description: 'Soft green and wellness tones' },
  { label: 'Rose', value: 'rose', description: 'Warm and caring accents' },
  { label: 'Navy', value: 'navy', description: 'Deep calm and high clarity' },
  { label: 'Sand', value: 'sand', description: 'Warm neutral softness' },
];

function isDarkHex(hex: string) {
  const safe = hex.replace('#', '');
  if (safe.length !== 6) return false;
  const r = parseInt(safe.slice(0, 2), 16);
  const g = parseInt(safe.slice(2, 4), 16);
  const b = parseInt(safe.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance < 0.5;
}

export default function ThemeSettings() {
  const {
    colors,
    theme,
    paletteMode,
    themeMode,
    themeVariant,
    themeStyle,
    backgroundPhotoUri,
    highContrastMode,
    themeSyncError,
    setThemeVariant,
    setThemeStyle,
    setBackgroundPhotoUri,
    setHighContrastMode,
    toggleTheme,
  } = useTheme();
  const { setThemeMode } = useAuth();

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingVariant, setSavingVariant] = useState<ThemeVariant | null>(null);

  useEffect(() => {
    void getAppSettings();
  }, []);

  const solidCardStyle = useMemo(
    () => ({
      backgroundColor: colors.surface,
      borderColor: paletteMode === 'nuit' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    }),
    [colors.surface, paletteMode],
  );

  const previewAccentText = isDarkHex(theme.accent) ? '#FFFFFF' : '#101418';

  const handlePhotoSelected = async (uri: string) => {
    try {
      setUploadingPhoto(true);
      await updateAppSettings({ backgroundPhotoUri: uri });
      await setBackgroundPhotoUri(uri);
    } catch (error: any) {
      Alert.alert('Theme saved locally', error?.message ?? 'Photo could not sync right now. The screen will keep working with local settings.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoRemoved = async () => {
    try {
      setUploadingPhoto(true);
      await updateAppSettings({ backgroundPhotoUri: '' });
      await setBackgroundPhotoUri('');
    } catch (error: any) {
      Alert.alert('Theme saved locally', error?.message ?? 'Background removal could not sync right now.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <Page>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]} contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={[styles.stickyHeader, { backgroundColor: colors.background }]}>
          <Card style={[styles.headerCard, solidCardStyle]}>
            <View style={styles.headerTop}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={[styles.eyebrow, { color: theme.accent }]}>Personalization</Text>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Theme & Design</Text>
                <Text style={[styles.headerSubtitle, { color: colors.muted }]}>Readable, solid, mobile-first customization with safe sync fallback.</Text>
              </View>
              <View style={[styles.previewMini, { backgroundColor: theme.bgCardAlt, borderColor: solidCardStyle.borderColor }]}>
                <View style={[styles.previewMiniAccent, { backgroundColor: theme.accent }]} />
                <View style={[styles.previewMiniLine, { backgroundColor: colors.text }]} />
                <View style={[styles.previewMiniSubline, { backgroundColor: colors.muted }]} />
              </View>
            </View>
            {themeSyncError ? (
              <View style={styles.toast}>
                <Text style={styles.toastTitle}>{themeSyncError === 'no-permission' ? 'No Firebase permission' : 'Sync unavailable'}</Text>
                <Text style={styles.toastBody}>Using local theme settings. The screen stays fully usable.</Text>
              </View>
            ) : null}
          </Card>
        </View>

        <View style={styles.content}>
          <Animated.View entering={FadeInDown.duration(220)}>
            <Card style={[styles.sectionCard, solidCardStyle]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Mode</Text>
              <Text style={[styles.sectionBody, { color: colors.muted }]}>Choose the reading mode first. Active options stay clearly filled.</Text>
              <Segment
                value={themeMode}
                onChange={(value) => setThemeMode(value as any)}
                options={[
                  { label: 'System', value: 'system' },
                  { label: 'Light', value: 'light' },
                  { label: 'Dark', value: 'dark' },
                ]}
              />
              <Button label={paletteMode === 'nuit' ? 'Switch to Light Now' : 'Switch to Dark Now'} onPress={() => void toggleTheme()} variant="secondary" />
              <View style={styles.switchRow}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.switchTitle, { color: colors.text }]}>High Contrast Mode</Text>
                  <Text style={[styles.switchBody, { color: colors.muted }]}>Boost readability and keep contrast strong on every surface.</Text>
                </View>
                <Switch value={highContrastMode} onValueChange={(value) => void setHighContrastMode(value)} />
              </View>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(220).delay(50)}>
            <Card style={[styles.sectionCard, solidCardStyle]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Palette</Text>
              <Text style={[styles.sectionBody, { color: colors.muted }]}>Swipe horizontally and pick a palette chip. Selected state is scaled, bordered, and checked.</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paletteRail}>
                {quickPalette.map((item) => {
                  const selected = theme.accent.toLowerCase() === item.color.toLowerCase();
                  return (
                    <View
                      key={item.key}
                      style={[
                        styles.paletteChip,
                        {
                          backgroundColor: item.color,
                          borderColor: selected ? colors.text : 'transparent',
                          transform: [{ scale: selected ? 1.06 : 1 }],
                        },
                      ]}
                    >
                      {selected ? <Text style={styles.checkMark}>✓</Text> : null}
                    </View>
                  );
                })}
              </ScrollView>

              <View style={{ gap: 10 }}>
                {themeVariants.map((item) => {
                  const active = item.value === themeVariant;
                  return (
                    <Button
                      key={item.value}
                      label={savingVariant === item.value ? `Saving ${item.label}...` : `${item.label}  ${active ? '• Active' : ''}`}
                      onPress={async () => {
                        setSavingVariant(item.value);
                        try {
                          await setThemeVariant(item.value);
                        } finally {
                          setSavingVariant(null);
                        }
                      }}
                      variant={active ? 'primary' : 'ghost'}
                    />
                  );
                })}
              </View>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(220).delay(90)}>
            <Card style={[styles.sectionCard, solidCardStyle]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Visual Style</Text>
              <Text style={[styles.sectionBody, { color: colors.muted }]}>No transparency required. Use solid surfaces that stay readable everywhere.</Text>
              <Segment
                value={themeStyle}
                onChange={(value) => void setThemeStyle(value as any)}
                options={[
                  { label: 'Classic', value: 'classic' },
                  { label: 'Default', value: 'default' },
                  { label: 'Photo', value: 'photo' },
                ]}
              />
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(220).delay(120)}>
            <Card style={[styles.sectionCard, solidCardStyle]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Live Preview</Text>
              <Text style={[styles.sectionBody, { color: colors.muted }]}>A real preview block with title, supporting text, button, and secondary card.</Text>
              <View style={[styles.previewBlock, { backgroundColor: theme.bgCardAlt, borderColor: solidCardStyle.borderColor }]}>
                <Text style={[styles.previewTitle, { color: colors.text }]}>Tonight routine</Text>
                <Text style={[styles.previewCopy, { color: colors.muted }]}>Everything remains readable even if cloud sync fails or contrast mode is enabled.</Text>
                <View style={[styles.previewButton, { backgroundColor: theme.accent }]}>
                  <Text style={[styles.previewButtonText, { color: previewAccentText }]}>Primary action</Text>
                </View>
                <View style={[styles.previewInnerCard, { backgroundColor: colors.surface, borderColor: solidCardStyle.borderColor }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <BabyFlowIcon name="insights" active bare />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.previewInnerTitle, { color: colors.text }]}>Secondary card</Text>
                      <Text style={[styles.previewInnerBody, { color: colors.muted }]}>Readable text, solid card, safe border.</Text>
                    </View>
                  </View>
                </View>
              </View>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(220).delay(150)}>
            <BackgroundPhotoSelector currentPhotoUri={backgroundPhotoUri} onPhotoSelected={handlePhotoSelected} onPhotoRemoved={handlePhotoRemoved} isLoading={uploadingPhoto} />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(220).delay(180)}>
            <DataImporter />
          </Animated.View>
        </View>
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  stickyHeader: {
    paddingHorizontal: 6,
    paddingTop: 2,
    paddingBottom: 10,
    zIndex: 2,
  },
  headerCard: {
    padding: 18,
    borderWidth: 1,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  headerTop: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  headerSubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  previewMini: {
    width: 86,
    minHeight: 86,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'center',
    gap: 8,
  },
  previewMiniAccent: {
    height: 12,
    borderRadius: 999,
  },
  previewMiniLine: {
    height: 8,
    borderRadius: 999,
    opacity: 0.92,
  },
  previewMiniSubline: {
    height: 8,
    width: '70%',
    borderRadius: 999,
    opacity: 0.6,
  },
  toast: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFF1D6',
    gap: 2,
  },
  toastTitle: {
    color: '#6B4D00',
    fontSize: 13,
    fontWeight: '800',
  },
  toastBody: {
    color: '#765B1A',
    fontSize: 12,
    lineHeight: 17,
  },
  content: {
    paddingHorizontal: 6,
    gap: 12,
  },
  sectionCard: {
    padding: 18,
    borderWidth: 1,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  switchBody: {
    fontSize: 12,
    lineHeight: 17,
  },
  paletteRail: {
    gap: 12,
    paddingRight: 10,
  },
  paletteChip: {
    width: 52,
    height: 52,
    borderRadius: 999,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  previewBlock: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  previewCopy: {
    fontSize: 13,
    lineHeight: 19,
  },
  previewButton: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  previewInnerCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  previewInnerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  previewInnerBody: {
    fontSize: 12,
    lineHeight: 17,
  },
});
