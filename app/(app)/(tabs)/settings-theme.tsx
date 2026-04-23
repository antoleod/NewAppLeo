import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, Page, Segment } from '@/components/ui';
import { BackgroundPhotoSelector } from '@/components/BackgroundPhotoSelector';
import { DataImporter } from '@/components/DataImporter';
import { themeVariantDescriptions } from '@/theme';
import { getAppSettings, updateAppSettings, type ThemeVariant } from '@/lib/storage';
import { BabyFlowIcon } from '@/components/BabyFlowIcon';

const themeVariants: Array<{ label: string; value: ThemeVariant; description: string; swatches: [string, string, string]; glow?: string }> = [
  { label: 'Light', value: 'light', description: 'Background #E5E5E5, accent #1F5EDC, text #1A1A1A.', swatches: ['#E5E5E5', '#1F5EDC', '#1A1A1A'] },
  { label: 'Custom', value: 'custom', description: 'Background #13294B, accent #00C2E0, border #00E5FF.', swatches: ['#13294B', '#00C2E0', '#00E5FF'] },
  { label: 'Parliament', value: 'parliament', description: 'Background #2B124C, gold accent, violet border.', swatches: ['#2B124C', '#F5C518', '#6D28D9'] },
  { label: 'Noir', value: 'noir', description: 'Background #121212, orange accent, warm premium glow.', swatches: ['#121212', '#FF6A00', '#FF7A1A'], glow: 'rgba(255,106,0,0.6)' },
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
  const { width } = useWindowDimensions();
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
  const carouselRef = useRef<ScrollView | null>(null);
  const [carouselOffset, setCarouselOffset] = useState(0);

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
  const activeVariantLabel = themeVariantDescriptions[themeVariant]?.label ?? themeVariant;
  const carouselCardWidth = Math.min(width - 56, 320);
  const carouselGap = 14;
  const carouselStride = carouselCardWidth + carouselGap;

  useEffect(() => {
    const index = themeVariants.findIndex((item) => item.value === themeVariant);
    if (index < 0) return;
    const offset = index * carouselStride;
    const timeout = setTimeout(() => {
      carouselRef.current?.scrollTo({ x: offset, animated: true });
    }, 80);
    return () => clearTimeout(timeout);
  }, [carouselStride, themeVariant]);

  const handleCarouselScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setCarouselOffset(event.nativeEvent.contentOffset.x);
  };

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
                <Text style={[styles.headerSubtitle, { color: colors.muted }]}>Mobile-first presets with readable colors, clear hierarchy, and safe local fallback.</Text>
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
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Theme Presets</Text>
              <Text style={[styles.sectionBody, { color: colors.muted }]}>Desliza el carrusel para comparar cada preset con su fondo, acento y borde reales. La tarjeta activa queda centrada y más marcada.</Text>
              <ScrollView
                ref={carouselRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={carouselStride}
                snapToAlignment="start"
                contentContainerStyle={styles.carouselContent}
                onScroll={handleCarouselScroll}
                scrollEventThrottle={16}
              >
                {themeVariants.map((item, index) => {
                  const selected = item.value === themeVariant;
                  const cardCenter = index * carouselStride;
                  const distance = Math.min(1, Math.abs(carouselOffset - cardCenter) / carouselStride);
                  const dynamicScale = 1 - distance * 0.08;
                  const dynamicOpacity = 1 - distance * 0.22;
                  const dynamicTranslateY = distance * 10;
                  return (
                    <Pressable
                      key={item.value}
                      onPress={async () => {
                        setSavingVariant(item.value);
                        try {
                          await setThemeVariant(item.value);
                        } finally {
                          setSavingVariant(null);
                        }
                      }}
                      style={[
                        styles.carouselCard,
                        {
                          width: carouselCardWidth,
                          backgroundColor: item.swatches[0],
                          borderColor: selected ? theme.accent : solidCardStyle.borderColor,
                          opacity: dynamicOpacity,
                          transform: [{ scale: selected ? Math.max(dynamicScale, 1.04) : dynamicScale }, { translateY: dynamicTranslateY }],
                          shadowColor: item.glow ?? theme.accent,
                          shadowOpacity: selected ? 0.26 : 0.08 + (1 - distance) * 0.06,
                        },
                      ]}
                    >
                      <View style={styles.carouselHeader}>
                        <View style={{ flex: 1, gap: 6 }}>
                          <Text style={[styles.carouselTitle, { color: isDarkHex(item.swatches[0]) ? '#FFFFFF' : '#111111' }]}>{item.label}</Text>
                          <Text style={[styles.carouselBody, { color: isDarkHex(item.swatches[0]) ? 'rgba(255,255,255,0.78)' : 'rgba(17,17,17,0.72)' }]}>{item.description}</Text>
                        </View>
                        {selected ? (
                          <View style={[styles.carouselBadge, { backgroundColor: item.swatches[1] }]}>
                            <Text style={[styles.carouselBadgeText, { color: isDarkHex(item.swatches[1]) ? '#FFFFFF' : '#101418' }]}>Active</Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.carouselPreview}>
                        <View style={[styles.carouselPreviewPanel, { backgroundColor: item.swatches[0], borderColor: item.swatches[2] }]}>
                          <View style={[styles.carouselPreviewLineLg, { backgroundColor: item.swatches[1] }]} />
                          <View style={styles.carouselPreviewSwatches}>
                            {item.swatches.map((color) => (
                              <View key={color} style={[styles.carouselPreviewSwatch, { backgroundColor: color, borderColor: 'rgba(255,255,255,0.14)' }]} />
                            ))}
                          </View>
                          <View style={[styles.carouselPreviewLineSm, { backgroundColor: isDarkHex(item.swatches[0]) ? 'rgba(255,255,255,0.82)' : 'rgba(17,17,17,0.82)' }]} />
                          <View style={[styles.carouselPreviewLineXs, { backgroundColor: isDarkHex(item.swatches[0]) ? 'rgba(255,255,255,0.52)' : 'rgba(17,17,17,0.45)' }]} />
                        </View>
                      </View>
                      <View style={styles.carouselFooter}>
                        <Text style={[styles.carouselMeta, { color: isDarkHex(item.swatches[0]) ? 'rgba(255,255,255,0.72)' : 'rgba(17,17,17,0.7)' }]}>
                          {selected ? 'Selected now' : 'Tap to apply'}
                        </Text>
                        <View style={styles.carouselDots}>
                          {themeVariants.map((dotItem) => (
                            <View
                              key={dotItem.value}
                              style={[
                                styles.carouselDot,
                                {
                                  backgroundColor: dotItem.value === item.value ? item.swatches[1] : isDarkHex(item.swatches[0]) ? 'rgba(255,255,255,0.22)' : 'rgba(17,17,17,0.18)',
                                },
                              ]}
                            />
                          ))}
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={{ gap: 10 }}>
                {themeVariants.map((item) => {
                  const active = item.value === themeVariant;
                  return (
                    <View
                      key={item.value}
                      style={[
                        styles.themePresetCard,
                        {
                          backgroundColor: active ? colors.surface : theme.bgCardAlt,
                          borderColor: active ? theme.accent : solidCardStyle.borderColor,
                          shadowColor: item.glow ?? theme.accent,
                          shadowOpacity: active && item.glow ? 0.22 : 0.08,
                        },
                      ]}
                    >
                      <View style={styles.themePresetTop}>
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={[styles.themePresetTitle, { color: colors.text }]}>{item.label}</Text>
                          <Text style={[styles.themePresetBody, { color: colors.muted }]}>{item.description}</Text>
                        </View>
                        <View style={styles.themePresetSwatches}>
                          {item.swatches.map((color) => (
                            <View key={color} style={[styles.themePresetSwatch, { backgroundColor: color }]} />
                          ))}
                        </View>
                      </View>
                      <Button
                        label={savingVariant === item.value ? `Saving ${item.label}...` : active ? `${item.label} Active` : `Use ${item.label}`}
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
                    </View>
                  );
                })}
              </View>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(220).delay(90)}>
            <Card style={[styles.sectionCard, solidCardStyle]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Visual Style</Text>
              <Text style={[styles.sectionBody, { color: colors.muted }]}>Classic keeps the preset pure. Default and photo add extra presentation layers when needed.</Text>
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
              <Text style={[styles.sectionBody, { color: colors.muted }]}>Previewing {activeVariantLabel}. The title, supporting text, primary button, and secondary card update together.</Text>
              <View style={[styles.previewBlock, { backgroundColor: theme.bgCardAlt, borderColor: solidCardStyle.borderColor }]}>
                <Text style={[styles.previewTitle, { color: colors.text }]}>Tonight routine</Text>
                <Text style={[styles.previewCopy, { color: colors.muted }]}>Everything remains readable even if cloud sync fails or high contrast mode is enabled.</Text>
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
  carouselContent: {
    gap: 14,
    paddingRight: 12,
  },
  carouselCard: {
    minHeight: 232,
    borderRadius: 24,
    borderWidth: 2,
    padding: 18,
    gap: 16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  carouselHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  carouselTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  carouselBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  carouselBadge: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  carouselPreview: {
    flex: 1,
  },
  carouselPreviewPanel: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 14,
    gap: 12,
    justifyContent: 'center',
  },
  carouselPreviewLineLg: {
    height: 18,
    borderRadius: 999,
  },
  carouselPreviewSwatches: {
    flexDirection: 'row',
    gap: 8,
  },
  carouselPreviewSwatch: {
    width: 36,
    height: 36,
    borderRadius: 14,
    borderWidth: 1,
  },
  carouselPreviewLineSm: {
    height: 10,
    width: '72%',
    borderRadius: 999,
  },
  carouselPreviewLineXs: {
    height: 10,
    width: '48%',
    borderRadius: 999,
  },
  carouselFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  carouselMeta: {
    fontSize: 12,
    fontWeight: '700',
  },
  carouselDots: {
    flexDirection: 'row',
    gap: 6,
  },
  carouselDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  paletteChip: {
    width: 76,
    height: 52,
    borderRadius: 18,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  paletteChipRow: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
  },
  paletteChipBit: {
    flex: 1,
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    position: 'absolute',
  },
  themePresetCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    gap: 12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  themePresetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themePresetTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  themePresetBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  themePresetSwatches: {
    flexDirection: 'row',
    gap: 6,
  },
  themePresetSwatch: {
    width: 18,
    height: 48,
    borderRadius: 999,
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
