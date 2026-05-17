import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import {
  getVariantSwatches,
  themeVariantDescriptions,
  type ThemeStyle,
  type ThemeVariant,
} from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, Page, Segment, useToast } from '@/components/shared';
import { ICON_PACK_LIST, useIconPackController } from '@/components/icons/IconPackContext';
import { GLYPH_TONES } from '@/components/icons/IconPack';
import { HomeTabIcon, HistoryTabIcon, InsightsTabIcon, ProfileTabIcon } from '@/components/navigation';
import { BackgroundPhotoSelector , SettingsImporter , DataExporter } from '@/components/profile';


import { defaultAppearanceSettings, getAppSettings, setAppSettings, type FeedingSettings } from '@/lib/storage';
import { useFeedingSettings, saveFeedingSettings } from '@/hooks/useFeedingSettings';
import { uploadBackgroundPhoto, deleteBackgroundPhoto } from '@/lib/photoStorage';
import { useTranslation } from '@/hooks/useTranslation';
import { confirmAction } from '@/lib/confirm';
import { haptics } from '@/lib/haptics';

const VARIANT_KEYS: readonly ThemeVariant[] = ['sage', 'mint', 'coral', 'plum', 'rose', 'navy', 'sand'];

const SLIDER_HEIGHT = 44;
const THUMB_SIZE = 28;

function clampOpacity(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0.2, Math.min(1, n)) : 1;
}

export default function ThemeSettings() {
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const toast = useToast();
  const {
    theme,
    themeMode,
    themeVariant,
    themeStyle,
    paletteMode,
    backgroundPhotoUri,
    buttonOpacity,
    buttonTransparency,
    customTheme,
    setThemeVariant,
    setThemeStyle,
    setBackgroundPhotoUri,
    setButtonOpacity,
    setButtonTransparency,
    setCustomTheme,
  } = useTheme();
  const { setThemeMode, user, guestMode } = useAuth();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePhotoSelected = async (localUri: string) => {
    if (user && !guestMode) {
      setUploadingPhoto(true);
      try {
        const downloadUrl = await uploadBackgroundPhoto(user.uid, localUri);
        await setBackgroundPhotoUri(downloadUrl);
      } catch {
        // Upload failed — fall back to local URI so the feature still works
        await setBackgroundPhotoUri(localUri);
      } finally {
        setUploadingPhoto(false);
      }
    } else {
      await setBackgroundPhotoUri(localUri);
    }
  };

  const handlePhotoRemoved = async () => {
    if (user && !guestMode && backgroundPhotoUri?.startsWith('https://firebasestorage')) {
      void deleteBackgroundPhoto(user.uid);
    }
    await setBackgroundPhotoUri('');
  };

  const [opacityValue, setOpacityValue] = useState(() => clampOpacity(buttonOpacity));
  const [opacityTrackWidth, setOpacityTrackWidth] = useState(0);
  const opacityPercent = ((opacityValue - 0.2) / 0.8) * 100;
  const [transparencyValue, setTransparencyValue] = useState(() => clampOpacity(buttonTransparency));
  const [transparencyTrackWidth, setTransparencyTrackWidth] = useState(0);
  const transparencyPercent = ((transparencyValue - 0.2) / 0.8) * 100;
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

  const carouselScrollRef = useRef<ScrollView>(null);
  const cardWidth = Math.min(300, Math.max(230, width - 78));
  const snapInterval = cardWidth + 12;

  // Reads the live theme.ts tokens — no more drift risk from hardcoded duplication.
  const themes = useMemo(
    () =>
      VARIANT_KEYS.map((key) => ({
        key,
        title: themeVariantDescriptions[key].label,
        description: themeVariantDescriptions[key].description,
        swatches: getVariantSwatches(key, paletteMode),
      })),
    [paletteMode],
  );

  const surfaceStyles = useMemo(
    () =>
      (
        [
          { key: 'default', labelKey: 'settings.frosted', descKey: 'settings.frostedDesc' },
          { key: 'photo', labelKey: 'settings.vivid', descKey: 'settings.vividDesc' },
          { key: 'classic', labelKey: 'settings.solid', descKey: 'settings.solidDesc' },
        ] as const
      ).map((item) => ({
        key: item.key as ThemeStyle,
        label: t(item.labelKey),
        description: t(item.descKey),
      })),
    [t],
  );

  useEffect(() => {
    setOpacityValue(clampOpacity(buttonOpacity));
  }, [buttonOpacity]);

  useEffect(() => {
    setTransparencyValue(clampOpacity(buttonTransparency));
  }, [buttonTransparency]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const checkInstalled = () => {
      const standalone = typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches;
      setIsPwaInstalled(Boolean(standalone));
    };
    checkInstalled();

    if ((window as any).__pwaInstallPrompt) {
      setInstallPromptEvent((window as any).__pwaInstallPrompt);
    }

    const handleBeforeInstallPrompt = (event: any) => {
      event.preventDefault();
      (window as any).__pwaInstallPrompt = event;
      setInstallPromptEvent(event);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any);
    window.addEventListener('appinstalled', checkInstalled as any);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any);
      window.removeEventListener('appinstalled', checkInstalled as any);
    };
  }, []);

  async function handleInstallPwa() {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice?.catch(() => null);
    (window as any).__pwaInstallPrompt = null;
    setInstallPromptEvent(null);
    if (choice?.outcome === 'accepted') {
      toast.success(t('settings.pwaInstallSuccess'));
    } else if (choice?.outcome === 'dismissed') {
      toast.info(t('settings.pwaInstallDismissed'));
    }
  }

  async function updateButtonOpacity(value: number, persist: boolean) {
    const next = clampOpacity(value);
    setOpacityValue(next);
    if (persist) {
      await setButtonOpacity(next);
      haptics.selection();
    }
  }

  function updateOpacityFromEvent(event: GestureResponderEvent, persist: boolean) {
    if (!opacityTrackWidth) return;
    const locationX = Number(event.nativeEvent.locationX);
    if (!Number.isFinite(locationX)) return;
    const ratio = Math.max(0, Math.min(1, locationX / opacityTrackWidth));
    const next = Math.round((0.2 + ratio * 0.8) * 100) / 100;
    void updateButtonOpacity(next, persist);
  }

  async function updateButtonTransparency(value: number, persist: boolean) {
    const next = clampOpacity(value);
    setTransparencyValue(next);
    if (persist) {
      await setButtonTransparency(next);
      haptics.selection();
    }
  }

  function updateTransparencyFromEvent(event: GestureResponderEvent, persist: boolean) {
    if (!transparencyTrackWidth) return;
    const locationX = Number(event.nativeEvent.locationX);
    if (!Number.isFinite(locationX)) return;
    const ratio = Math.max(0, Math.min(1, locationX / transparencyTrackWidth));
    const next = Math.round((0.2 + ratio * 0.8) * 100) / 100;
    void updateButtonTransparency(next, persist);
  }

  async function handleSelectVariant(key: ThemeVariant) {
    haptics.selection();
    await setThemeVariant(key);
  }

  async function handleSelectStyle(key: ThemeStyle) {
    haptics.selection();
    await setThemeStyle(key);
  }

  async function handleSelectMode(value: 'system' | 'light' | 'dark') {
    haptics.selection();
    await setThemeMode(value);
  }

  async function handleDisableCustomTheme() {
    await setCustomTheme({ enabled: false });
    haptics.success();
    toast.success(t('settings.customThemeDisable'));
  }

  async function handleResetRecommended() {
    const ok = await confirmAction({
      title: t('settings.restoreRecommended'),
      message: t('settings.restoreRecommendedBody'),
      confirmLabel: t('common.ok'),
      cancelLabel: t('common.cancel'),
    });
    if (!ok) return;
    try {
      // Atomic disk write first, then sync React state via context setters.
      // Setters do persist again but their writes are idempotent — the bulk
      // write above guarantees a consistent on-disk snapshot regardless.
      const current = await getAppSettings();
      await setAppSettings({ ...current, ...defaultAppearanceSettings });
      await setThemeVariant(defaultAppearanceSettings.themeVariant);
      await setThemeStyle(defaultAppearanceSettings.themeStyle);
      await setBackgroundPhotoUri(defaultAppearanceSettings.backgroundPhotoUri);
      await setButtonOpacity(defaultAppearanceSettings.buttonOpacity);
      await setButtonTransparency(defaultAppearanceSettings.buttonTransparency);
      await setCustomTheme(defaultAppearanceSettings.customTheme);
      await setThemeMode('system');
      haptics.success();
    } catch (error: any) {
      toast.error(error?.message ?? t('settings.appearanceTitle'));
    }
  }

  function scrollCarouselToIndex(index: number) {
    carouselScrollRef.current?.scrollTo({ x: index * snapInterval, animated: true });
  }

  return (
    <Page>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{t('settings.appearanceTitle')}</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>{t('settings.appearanceSubtitle')}</Text>

        {customTheme?.enabled ? (
          <Card style={{ borderColor: theme.accent, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="color-wand" size={18} color={theme.accent} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '700' }}>
                  {t('settings.customThemeActive')}
                </Text>
                <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>
                  {t('settings.customThemeActiveBody')}
                </Text>
              </View>
            </View>
            <Button
              label={t('settings.customThemeDisable')}
              onPress={() => void handleDisableCustomTheme()}
              variant="secondary"
            />
          </Card>
        ) : null}

        {/* Theme palette */}
        <Card>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('settings.themeLabel')}</Text>
          <Text style={[styles.sectionBody, { color: theme.textMuted }]}>{t('settings.themeBody')}</Text>
          <ScrollView
            ref={carouselScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={snapInterval}
            decelerationRate="fast"
            contentContainerStyle={styles.carouselTrack}
          >
            {themes.map((item) => {
              const active = themeVariant === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => void handleSelectVariant(item.key)}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.themeCard,
                    { width: cardWidth },
                    { borderColor: active ? item.swatches[2] : theme.border, backgroundColor: theme.bgCardAlt },
                  ]}
                >
                  <View style={[styles.swatchHero, { backgroundColor: item.swatches[0], borderColor: active ? item.swatches[2] : theme.border }]}>
                    {item.swatches.map((color, idx) => (
                      <View key={`${item.key}-sw-${idx}`} style={[styles.swatch, { backgroundColor: color, width: idx === 2 ? 34 : 22 }]} />
                    ))}
                  </View>
                  <Text style={[styles.themeTitle, { color: theme.textPrimary }]}>{item.title}</Text>
                  <Text style={[styles.themeBody, { color: theme.textMuted }]}>{item.description}</Text>
                  {active ? (
                    <View
                      style={[
                        styles.statusRow,
                        { backgroundColor: `${item.swatches[2]}1A`, borderColor: item.swatches[2] },
                      ]}
                    >
                      <Ionicons name="checkmark-circle" size={14} color={item.swatches[2]} />
                      <Text style={[styles.statusLabel, { color: item.swatches[2] }]}>{t('settings.applied')}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.tapHint, { color: theme.textMuted }]}>{t('settings.tapToApply')}</Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.carouselDots}>
            {themes.map((item, idx) => {
              const active = themeVariant === item.key;
              return (
                <Pressable
                  key={`dot-${item.key}`}
                  onPress={() => scrollCarouselToIndex(idx)}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                  hitSlop={8}
                >
                  <View
                    style={[
                      styles.carouselDot,
                      { backgroundColor: active ? item.swatches[2] : theme.border, width: active ? 16 : 7 },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Surface style */}
        <Card>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('settings.surfaceStyle')}</Text>
          <Text style={[styles.sectionBody, { color: theme.textMuted }]}>{t('settings.surfaceStyleBody')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {surfaceStyles.map((item) => {
              const active = themeStyle === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => void handleSelectStyle(item.key)}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.styleChip,
                    {
                      borderColor: active ? theme.accent : theme.border,
                      backgroundColor: active ? `${theme.accent}18` : theme.bgCardAlt,
                    },
                  ]}
                >
                  <Text style={[styles.styleChipLabel, { color: active ? theme.accent : theme.textPrimary }]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.styleChipDesc, { color: theme.textMuted }]}>{item.description}</Text>
                  {active && <View style={[styles.styleChipDot, { backgroundColor: theme.accent }]} />}
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Icon pack — visual identity of all glyphs across the app */}
        <IconPackPickerCard />

        {/* Color mode */}
        <Card>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('profile.themeModeLabel')}</Text>
          <Text style={[styles.sectionBody, { color: theme.textMuted }]}>{t('settings.modeBody')}</Text>
          <Segment
            value={themeMode}
            onChange={(value) => void handleSelectMode(value as 'system' | 'light' | 'dark')}
            options={[
              { label: t('profile.themeSystem'), value: 'system' },
              { label: t('profile.themeLight'), value: 'light' },
              { label: t('profile.themeDark2'), value: 'dark' },
            ]}
          />
        </Card>

        {/* Background photo */}
        <Card>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('settings.backgroundPhotoTitle')}</Text>
          <Text style={[styles.sectionBody, { color: theme.textMuted }]}>{t('settings.backgroundPhotoBody')}</Text>
          <BackgroundPhotoSelector
            currentPhotoUri={backgroundPhotoUri}
            onPhotoSelected={(uri) => void handlePhotoSelected(uri)}
            onPhotoRemoved={() => void handlePhotoRemoved()}
            isLoading={uploadingPhoto}
          />
        </Card>

        {/* Opacity sliders */}
        <Card>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('settings.buttonOpacityTitle')}</Text>
          <Text style={[styles.sectionBody, { color: theme.textMuted }]}>{t('settings.buttonOpacityBody')}</Text>
          <View
            onLayout={(event) => setOpacityTrackWidth(event.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(event) => updateOpacityFromEvent(event, false)}
            onResponderMove={(event) => updateOpacityFromEvent(event, false)}
            onResponderRelease={(event) => updateOpacityFromEvent(event, true)}
            accessibilityRole="adjustable"
            accessibilityLabel={t('settings.buttonOpacityTitle')}
            accessibilityValue={{ now: Math.round(opacityValue * 100), min: 20, max: 100 }}
            style={[styles.opacityTrack, { backgroundColor: theme.bgCardAlt, borderColor: theme.border }]}
          >
            <View style={[styles.opacityFill, { width: `${opacityPercent}%`, backgroundColor: theme.accent }]} />
            <View
              pointerEvents="none"
              style={[
                styles.opacityThumb,
                {
                  left: `${Math.max(0, Math.min(100, opacityPercent))}%`,
                  backgroundColor: theme.accent,
                  borderColor: theme.bgCard,
                  transform: [{ translateX: -THUMB_SIZE / 2 }],
                },
              ]}
            />
          </View>
          <View style={styles.opacityScale}>
            <Text style={[styles.opacityScaleText, { color: theme.textMuted }]}>20%</Text>
            <Text style={[styles.opacityScaleText, { color: theme.accent, fontWeight: '800' }]}>
              {Math.round(opacityValue * 100)}%
            </Text>
            <Text style={[styles.opacityScaleText, { color: theme.textMuted }]}>100%</Text>
          </View>

          <Text style={[styles.controlLabel, { color: theme.textPrimary }]}>{t('settings.buttonTransparencyTitle')}</Text>
          <Text style={[styles.sectionBody, { color: theme.textMuted }]}>{t('settings.buttonTransparencyBody')}</Text>
          <View
            onLayout={(event) => setTransparencyTrackWidth(event.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(event) => updateTransparencyFromEvent(event, false)}
            onResponderMove={(event) => updateTransparencyFromEvent(event, false)}
            onResponderRelease={(event) => updateTransparencyFromEvent(event, true)}
            accessibilityRole="adjustable"
            accessibilityLabel={t('settings.buttonTransparencyTitle')}
            accessibilityValue={{ now: Math.round(transparencyValue * 100), min: 20, max: 100 }}
            style={[styles.opacityTrack, { backgroundColor: theme.bgCardAlt, borderColor: theme.border }]}
          >
            <View style={[styles.opacityFill, { width: `${transparencyPercent}%`, backgroundColor: theme.accent }]} />
            <View
              pointerEvents="none"
              style={[
                styles.opacityThumb,
                {
                  left: `${Math.max(0, Math.min(100, transparencyPercent))}%`,
                  backgroundColor: theme.accent,
                  borderColor: theme.bgCard,
                  transform: [{ translateX: -THUMB_SIZE / 2 }],
                },
              ]}
            />
          </View>
          <View style={styles.opacityScale}>
            <Text style={[styles.opacityScaleText, { color: theme.textMuted }]}>20%</Text>
            <Text style={[styles.opacityScaleText, { color: theme.accent, fontWeight: '800' }]}>
              {Math.round(transparencyValue * 100)}%
            </Text>
            <Text style={[styles.opacityScaleText, { color: theme.textMuted }]}>100%</Text>
          </View>

          {/* Live preview — uses the actual Button component so the sliders affect what you see */}
          <Text style={[styles.controlLabel, { color: theme.textMuted }]}>{t('settings.livePreview')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <View style={{ flex: 1 }}>
              <Button label={t('settings.previewPrimary')} onPress={() => {}} variant="primary" />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={t('settings.previewSecondary')} onPress={() => {}} variant="secondary" />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={t('settings.previewGhost')} onPress={() => {}} variant="ghost" />
            </View>
          </View>
        </Card>

        <Card>
          <Button
            label={t('settings.restoreRecommended')}
            onPress={() => void handleResetRecommended()}
            variant="secondary"
          />
        </Card>

        {Platform.OS === 'web' ? (
          <Card>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('settings.pwaTitle')}</Text>
            <Text style={[styles.sectionBody, { color: theme.textMuted }]}>{t('settings.pwaBody')}</Text>
            {isPwaInstalled ? (
              <View style={[styles.pwaInstalledBadge, { borderColor: theme.border, backgroundColor: theme.bgCardAlt }]}>
                <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>{t('settings.pwaInstalled')}</Text>
              </View>
            ) : installPromptEvent ? (
              <Button
                label={t('settings.pwaInstallNow')}
                onPress={() => void handleInstallPwa()}
                variant="primary"
              />
            ) : (
              <View style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 12 }}>
                <Text style={{ color: theme.textMuted, fontSize: 12, lineHeight: 20 }}>
                  {t('settings.pwaManualHelp')}
                </Text>
              </View>
            )}
          </Card>
        ) : null}

        <FeedingSettingsCard />
        <DataExporter />
        <SettingsImporter />
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: '900' },
  subtitle: { fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  sectionBody: { fontSize: 12, marginBottom: 10 },
  carouselTrack: { gap: 12, paddingRight: 4 },
  carouselDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 10 },
  carouselDot: { height: 7, borderRadius: 999 },
  themeCard: { borderWidth: 1, borderRadius: 14, padding: 12, minHeight: 148 },
  swatchHero: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10, borderWidth: 1, borderRadius: 12, padding: 8 },
  swatch: { height: 22, borderRadius: 999 },
  themeTitle: { fontSize: 14, fontWeight: '800' },
  themeBody: { fontSize: 12, marginTop: 4 },
  statusRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusLabel: { fontSize: 12, fontWeight: '800' },
  tapHint: { marginTop: 10, fontSize: 11, fontStyle: 'italic' },
  styleChip: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 10, alignItems: 'center', gap: 2, position: 'relative' },
  styleChipLabel: { fontSize: 13, fontWeight: '700' },
  styleChipDesc: { fontSize: 11, textAlign: 'center' },
  styleChipDot: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
  opacityTrack: {
    height: SLIDER_HEIGHT,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  opacityFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  opacityThumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 999,
    borderWidth: 3,
  },
  opacityScale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  opacityScaleText: { fontSize: 11, fontWeight: '700' },
  controlLabel: { fontSize: 12, fontWeight: '800', marginTop: 16, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  pwaInstalledBadge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' },
  footerPreview: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});

/**
 * Card with one tappable preview per icon pack. Each preview renders 5
 * representative glyphs from the pack so the user can compare visual styles
 * at a glance instead of guessing what "Soft" vs "Outline" will look like.
 */
function IconPackPickerCard() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { packId, setPackId } = useIconPackController();

  return (
    <Card>
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('iconPack.cardTitle')}</Text>
      <Text style={[styles.sectionBody, { color: theme.textMuted }]}>{t('iconPack.cardBody')}</Text>
      <View style={{ gap: 10 }}>
        {ICON_PACK_LIST.map((pack) => {
          const active = packId === pack.id;
          const { MealMorning, FaceHappy, DropPee, AmountAll, SleepCalm } = pack;
          return (
            <Pressable
              key={pack.id}
              onPress={() => { haptics.selection(); setPackId(pack.id); }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t(pack.nameKey)}
              style={({ pressed }) => ({
                borderRadius: 14,
                borderWidth: active ? 2 : 1,
                borderColor: active ? theme.accent : theme.border,
                backgroundColor: active ? `${theme.accent}10` : pressed ? theme.bgCardAlt : theme.bgCard,
                paddingHorizontal: 14,
                paddingVertical: 12,
                gap: 10,
              })}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '800' }}>{t(pack.nameKey)}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>{t(pack.descKey)}</Text>
                </View>
                {active ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.accent} />
                    <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '700' }}>{t('settings.applied')}</Text>
                  </View>
                ) : null}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4, paddingBottom: 2 }}>
                <MealMorning size={26} color={GLYPH_TONES.mealMorning} />
                <FaceHappy size={26} color={GLYPH_TONES.faceHappy} />
                <DropPee size={26} color={GLYPH_TONES.dropPee} />
                <AmountAll size={26} color={GLYPH_TONES.amountAll} />
                <SleepCalm size={26} color={GLYPH_TONES.sleepCalm} />
              </View>
              <View style={[styles.footerPreview, { borderColor: theme.border, backgroundColor: theme.bgCardAlt }]}>
                <HomeTabIcon size={20} color={theme.accent} focused iconStyle={pack.id} />
                <HistoryTabIcon size={20} color={theme.textMuted} iconStyle={pack.id} />
                <InsightsTabIcon size={20} color={theme.textMuted} iconStyle={pack.id} />
                <ProfileTabIcon size={20} color={theme.textMuted} iconStyle={pack.id} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

const INTERVAL_OPTIONS: { labelMin: number | null; labelKey: string }[] = [
  { labelMin: null,  labelKey: 'settings.feedingIntervalAuto' },
  { labelMin: 120,   labelKey: '2h' },
  { labelMin: 150,   labelKey: '2h30' },
  { labelMin: 180,   labelKey: '3h' },
  { labelMin: 210,   labelKey: '3h30' },
  { labelMin: 240,   labelKey: '4h' },
  { labelMin: 300,   labelKey: '5h' },
];

const REF_MEAL_OPTIONS = [100, 130, 150, 180, 200, 250];

function FeedingSettingsCard() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const cfg = useFeedingSettings();

  async function toggle(field: keyof FeedingSettings, value: boolean | number | null) {
    haptics.selection();
    await saveFeedingSettings({ ...cfg, [field]: value });
  }

  return (
    <Card>
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('settings.feedingTitle')}</Text>
      <Text style={[styles.sectionBody, { color: theme.textMuted }]}>{t('settings.feedingBody')}</Text>

      {/* Toggle: food counts as feeding */}
      <Pressable
        onPress={() => void toggle('foodCountsAsFeeding', !cfg.foodCountsAsFeeding)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}
      >
        <View
          style={{
            width: 44, height: 26, borderRadius: 13,
            backgroundColor: cfg.foodCountsAsFeeding ? theme.accent : theme.border,
            justifyContent: 'center', paddingHorizontal: 2,
          }}
        >
          <View
            style={{
              width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff',
              transform: [{ translateX: cfg.foodCountsAsFeeding ? 18 : 0 }],
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '700' }}>
            {t('settings.feedingFoodToggle')}
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 2 }}>
            {t('settings.feedingFoodToggleDesc')}
          </Text>
        </View>
      </Pressable>

      {/* Reference meal size chips */}
      {cfg.foodCountsAsFeeding ? (
        <>
          <Text style={[styles.controlLabel, { color: theme.textPrimary }]}>{t('settings.feedingRefMeal')}</Text>
          <Text style={[styles.sectionBody, { color: theme.textMuted }]}>{t('settings.feedingRefMealDesc')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {REF_MEAL_OPTIONS.map((g) => {
              const active = cfg.referenceMealGrams === g;
              return (
                <Pressable
                  key={g}
                  onPress={() => void toggle('referenceMealGrams', g)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
                    borderWidth: active ? 2 : 1,
                    borderColor: active ? theme.accent : theme.border,
                    backgroundColor: active ? `${theme.accent}18` : theme.bgCardAlt,
                  }}
                >
                  <Text style={{ color: active ? theme.accent : theme.textPrimary, fontWeight: '700', fontSize: 13 }}>
                    {g}g
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      {/* Custom interval chips */}
      <Text style={[styles.controlLabel, { color: theme.textPrimary }]}>{t('settings.feedingInterval')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {INTERVAL_OPTIONS.map(({ labelMin, labelKey }) => {
          const active = cfg.customIntervalMin === labelMin;
          const label = labelMin === null ? t(labelKey) : labelKey;
          return (
            <Pressable
              key={String(labelMin)}
              onPress={() => void toggle('customIntervalMin', labelMin)}
              style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
                borderWidth: active ? 2 : 1,
                borderColor: active ? theme.accent : theme.border,
                backgroundColor: active ? `${theme.accent}18` : theme.bgCardAlt,
              }}
            >
              <Text style={{ color: active ? theme.accent : theme.textPrimary, fontWeight: '700', fontSize: 13 }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
