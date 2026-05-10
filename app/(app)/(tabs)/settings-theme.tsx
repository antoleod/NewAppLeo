import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, Page, Segment } from '@/components/ui';
import { BackgroundPhotoSelector } from '@/components/BackgroundPhotoSelector';
import { SettingsImporter } from '@/components/SettingsImporter';
import { DataExporter } from '@/components/DataExporter';
import { getAppSettings, setAppSettings } from '@/lib/storage';
import { useTranslation } from '@/hooks/useTranslation';

export default function ThemeSettings() {
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const {
    theme,
    themeMode,
    themeVariant,
    themeStyle,
    backgroundPhotoUri,
    buttonOpacity,
    buttonTransparency,
    setThemeVariant,
    setThemeStyle,
    setBackgroundPhotoUri,
    setButtonOpacity,
    setButtonTransparency,
  } = useTheme();
  const { setThemeMode } = useAuth();

  const normalizeOpacity = (opacity: unknown) => {
    const numericOpacity = Number(opacity);
    return Number.isFinite(numericOpacity) ? Math.max(0.2, Math.min(1, numericOpacity)) : 1;
  };

  const [opacityValue, setOpacityValue] = useState(() => normalizeOpacity(buttonOpacity));
  const [opacityTrackWidth, setOpacityTrackWidth] = useState(0);
  const opacityPercent = ((opacityValue - 0.2) / 0.8) * 100;
  const [transparencyValue, setTransparencyValue] = useState(() => normalizeOpacity(buttonTransparency));
  const [transparencyTrackWidth, setTransparencyTrackWidth] = useState(0);
  const transparencyPercent = ((transparencyValue - 0.2) / 0.8) * 100;

  const themes = [
    {
      key: 'sage',
      title: 'Bright Light',
      description: 'Perfect for daytime with strong readability on a light background.',
      swatches: ['#E5E5E5', '#1F5EDC', '#1A1A1A'],
    },
    {
      key: 'navy',
      title: 'Custom Ocean',
      description: 'Deep marine tones with bright accents.',
      swatches: ['#13294B', '#00C2E0', '#00E5FF'],
    },
    {
      key: 'rose',
      title: 'Elegant Purple',
      description: 'Golden accents over violet for a premium look.',
      swatches: ['#2B124C', '#F5C518', '#6D28D9'],
    },
    {
      key: 'sand',
      title: 'Sophisticated Night',
      description: 'Elegant dark mode with warm highlights.',
      swatches: ['#121212', '#FF6A00', '#FF7A1A'],
    },
  ] as const;

  const surfaceStyles = [
    { key: 'default', label: t('settings.frosted'), description: t('settings.frostedDesc') },
    { key: 'photo',   label: t('settings.vivid'),   description: t('settings.vividDesc') },
    { key: 'classic', label: t('settings.solid'),   description: t('settings.solidDesc') },
  ] as const;

  useEffect(() => {
    setOpacityValue(normalizeOpacity(buttonOpacity));
  }, [buttonOpacity]);

  useEffect(() => {
    setTransparencyValue(normalizeOpacity(buttonTransparency));
  }, [buttonTransparency]);

  async function updateButtonOpacity(value: number, persist: boolean) {
    const nextOpacity = normalizeOpacity(value);
    setOpacityValue(nextOpacity);
    if (persist) {
      await setButtonOpacity(nextOpacity);
    }
  }

  function updateOpacityFromEvent(event: GestureResponderEvent, persist: boolean) {
    if (!opacityTrackWidth) return;
    const locationX = Number(event.nativeEvent.locationX);
    if (!Number.isFinite(locationX)) return;
    const ratio = Math.max(0, Math.min(1, locationX / opacityTrackWidth));
    const nextOpacity = Math.round((0.2 + ratio * 0.8) * 100) / 100;
    void updateButtonOpacity(nextOpacity, persist);
  }

  async function updateButtonTransparency(value: number, persist: boolean) {
    const nextOpacity = normalizeOpacity(value);
    setTransparencyValue(nextOpacity);
    if (persist) {
      await setButtonTransparency(nextOpacity);
    }
  }

  function updateTransparencyFromEvent(event: GestureResponderEvent, persist: boolean) {
    if (!transparencyTrackWidth) return;
    const locationX = Number(event.nativeEvent.locationX);
    if (!Number.isFinite(locationX)) return;
    const ratio = Math.max(0, Math.min(1, locationX / transparencyTrackWidth));
    const nextOpacity = Math.round((0.2 + ratio * 0.8) * 100) / 100;
    void updateButtonTransparency(nextOpacity, persist);
  }

  async function handleResetRecommended() {
    Alert.alert(
      t('settings.restoreRecommended'),
      '',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.ok'),
          style: 'default',
          onPress: async () => {
            try {
              const current = await getAppSettings();
              const next = {
                ...current,
                themeVariant: 'sage' as const,
                themeStyle: 'default' as const,
                buttonOpacity: 1,
                buttonTransparency: 1,
                customTheme: { ...current.customTheme, enabled: false },
              };
              await setAppSettings(next);
              await setThemeVariant('sage');
              await setThemeStyle('default');
              await setBackgroundPhotoUri('');
              await setButtonOpacity(1);
              await setButtonTransparency(1);
              await setThemeMode('system');
            } catch (error: any) {
              Alert.alert(t('settings.appearanceTitle'), error?.message ?? 'Could not restore.');
            }
          },
        },
      ]
    );
  }

  return (
    <Page>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{t('settings.appearanceTitle')}</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>{t('settings.appearanceSubtitle')}</Text>

        {/* Theme palette */}
        <Card>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('settings.themeLabel')}</Text>
          <Text style={[styles.sectionBody, { color: theme.textMuted }]}>{t('settings.themeBody')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={Math.min(320, Math.max(250, width - 70)) + 12}
            decelerationRate="fast"
            contentContainerStyle={styles.carouselTrack}
          >
            {themes.map((item) => {
              const active = themeVariant === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => void setThemeVariant(item.key as any)}
                  style={[
                    styles.themeCard,
                    { width: Math.min(320, Math.max(250, width - 70)) },
                    { borderColor: active ? theme.accent : theme.border, backgroundColor: theme.bgCardAlt },
                  ]}
                >
                  <View style={styles.swatches}>
                    {item.swatches.map((color) => (
                      <View key={color} style={[styles.swatch, { backgroundColor: color }]} />
                    ))}
                  </View>
                  <Text style={[styles.themeTitle, { color: theme.textPrimary }]}>{item.title}</Text>
                  <Text style={[styles.themeBody, { color: theme.textMuted }]}>{item.description}</Text>
                  <Text style={[styles.themeState, { color: active ? theme.accent : theme.textMuted }]}>
                    {active ? t('settings.applied') : t('settings.tapToApply')}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.carouselDots}>
            {themes.map((item) => {
              const active = themeVariant === item.key;
              return (
                <View
                  key={`dot-${item.key}`}
                  style={[
                    styles.carouselDot,
                    { backgroundColor: active ? theme.accent : theme.border, width: active ? 16 : 7 },
                  ]}
                />
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
                  onPress={() => void setThemeStyle(item.key as any)}
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
                  {active && (
                    <View style={[styles.styleChipDot, { backgroundColor: theme.accent }]} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Color mode */}
        <Card>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('profile.themeModeLabel')}</Text>
          <Text style={[styles.sectionBody, { color: theme.textMuted }]}>{t('settings.modeBody')}</Text>
          <Segment
            value={themeMode}
            onChange={(value) => setThemeMode(value as any)}
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
            onPhotoSelected={(uri) => void setBackgroundPhotoUri(uri)}
            onPhotoRemoved={() => void setBackgroundPhotoUri('')}
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
            onResponderGrant={(event) => updateOpacityFromEvent(event, true)}
            onResponderMove={(event) => updateOpacityFromEvent(event, false)}
            onResponderRelease={(event) => updateOpacityFromEvent(event, true)}
            style={[styles.opacityTrack, { backgroundColor: theme.bgCardAlt, borderColor: theme.border }]}
          >
            <View style={[styles.opacityFill, { width: `${opacityPercent}%`, backgroundColor: theme.accent }]} />
            <View style={[styles.opacityThumb, { left: `${opacityPercent}%`, backgroundColor: theme.accent, borderColor: theme.bgCard }]} />
          </View>
          <View style={styles.opacityScale}>
            <Text style={[styles.opacityScaleText, { color: theme.textMuted }]}>20%</Text>
            <Text style={[styles.opacityScaleText, { color: theme.accent, fontWeight: '800' }]}>{Math.round(opacityValue * 100)}%</Text>
            <Text style={[styles.opacityScaleText, { color: theme.textMuted }]}>100%</Text>
          </View>

          <Text style={[styles.controlLabel, { color: theme.textPrimary }]}>{t('settings.buttonTransparencyTitle')}</Text>
          <Text style={[styles.sectionBody, { color: theme.textMuted }]}>{t('settings.buttonTransparencyBody')}</Text>
          <View
            onLayout={(event) => setTransparencyTrackWidth(event.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(event) => updateTransparencyFromEvent(event, true)}
            onResponderMove={(event) => updateTransparencyFromEvent(event, false)}
            onResponderRelease={(event) => updateTransparencyFromEvent(event, true)}
            style={[styles.opacityTrack, { backgroundColor: theme.bgCardAlt, borderColor: theme.border }]}
          >
            <View style={[styles.opacityFill, { width: `${transparencyPercent}%`, backgroundColor: theme.accent }]} />
            <View style={[styles.opacityThumb, { left: `${transparencyPercent}%`, backgroundColor: theme.accent, borderColor: theme.bgCard }]} />
          </View>
          <View style={styles.opacityScale}>
            <Text style={[styles.opacityScaleText, { color: theme.textMuted }]}>20%</Text>
            <Text style={[styles.opacityScaleText, { color: theme.accent, fontWeight: '800' }]}>{Math.round(transparencyValue * 100)}%</Text>
            <Text style={[styles.opacityScaleText, { color: theme.textMuted }]}>100%</Text>
          </View>

          {/* Live preview — uses the same Button component that reads these settings */}
          <Text style={[styles.controlLabel, { color: theme.textMuted }]}>{t('settings.livePreview')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <View style={{ flex: 1 }}>
              <Button label="Primary" onPress={() => {}} variant="primary" />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Secondary" onPress={() => {}} variant="secondary" />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Ghost" onPress={() => {}} variant="ghost" />
            </View>
          </View>
        </Card>

        <Card>
          <Button label={t('settings.restoreRecommended')} onPress={() => void handleResetRecommended()} variant="secondary" />
        </Card>

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
  themeCard: { borderWidth: 1, borderRadius: 14, padding: 12 },
  swatches: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  swatch: { width: 18, height: 18, borderRadius: 999 },
  themeTitle: { fontSize: 14, fontWeight: '800' },
  themeBody: { fontSize: 12, marginTop: 4 },
  themeState: { fontSize: 12, fontWeight: '800', marginTop: 8 },
  styleChip: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 10, alignItems: 'center', gap: 2, position: 'relative' },
  styleChipLabel: { fontSize: 13, fontWeight: '700' },
  styleChipDesc: { fontSize: 11, textAlign: 'center' },
  styleChipDot: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
  opacityTrack: { height: 34, borderRadius: 999, borderWidth: 1, justifyContent: 'center', overflow: 'hidden', position: 'relative' },
  opacityFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  opacityThumb: { position: 'absolute', width: 22, height: 22, marginLeft: -11, borderRadius: 999, borderWidth: 3 },
  opacityScale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  opacityScaleText: { fontSize: 11, fontWeight: '700' },
  controlLabel: { fontSize: 12, fontWeight: '800', marginTop: 16, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
});
