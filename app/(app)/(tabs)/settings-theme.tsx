import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, Page, Segment } from '@/components/ui';
import { BackgroundPhotoSelector } from '@/components/BackgroundPhotoSelector';
import { SettingsImporter } from '@/components/SettingsImporter';
import { DataExporter } from '@/components/DataExporter';
import { getAppSettings, setAppSettings } from '@/lib/storage';

export default function ThemeSettings() {
  const { width } = useWindowDimensions();
  const {
    theme,
    themeMode,
    themeVariant,
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
    try {
      const current = await getAppSettings();
      const next = {
        ...current,
        themeVariant: 'sage' as const,
        themeStyle: 'default' as const,
        buttonOpacity: 1,
        buttonTransparency: 1,
        customTheme: {
          ...current.customTheme,
          enabled: false,
        },
      };
      await setAppSettings(next);
      await setThemeVariant('sage');
      await setThemeStyle('default');
      await setBackgroundPhotoUri('');
      await setButtonOpacity(1);
      await setButtonTransparency(1);
      await setThemeMode('system');
      Alert.alert('Appearance', 'Recommended appearance restored.');
    } catch (error: any) {
      Alert.alert('Appearance', error?.message ?? 'Could not restore recommended appearance.');
    }
  }

  return (
    <Page>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Appearance</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>Simple and clear for daily use.</Text>

        <Card>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Theme</Text>
          <Text style={[styles.sectionBody, { color: theme.textMuted }]}>Pick the look you prefer.</Text>
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
                  <Text style={[styles.themeState, { color: active ? theme.accent : theme.textMuted }]}>{active ? 'Applied' : 'Tap to apply'}</Text>
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
                    {
                      backgroundColor: active ? theme.accent : theme.border,
                      width: active ? 16 : 7,
                    },
                  ]}
                />
              );
            })}
          </View>
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Mode</Text>
          <Text style={[styles.sectionBody, { color: theme.textMuted }]}>Choose light, dark, or automatic.</Text>
          <Segment
            value={themeMode}
            onChange={(value) => setThemeMode(value as any)}
            options={[
              { label: 'Automatic', value: 'system' },
              { label: 'Light', value: 'light' },
              { label: 'Dark', value: 'dark' },
            ]}
          />
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Background Photo</Text>
          <Text style={[styles.sectionBody, { color: theme.textMuted }]}>Optional. You can keep it simple with no photo.</Text>
          <BackgroundPhotoSelector
            currentPhotoUri={backgroundPhotoUri}
            onPhotoSelected={(uri) => void setBackgroundPhotoUri(uri)}
            onPhotoRemoved={() => void setBackgroundPhotoUri('')}
          />
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Button Opacity</Text>
          <Text style={[styles.sectionBody, { color: theme.textMuted }]}>Adjust the whole button, including text and icons.</Text>
          <View
            onLayout={(event) => setOpacityTrackWidth(event.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(event) => updateOpacityFromEvent(event, true)}
            onResponderMove={(event) => updateOpacityFromEvent(event, false)}
            onResponderRelease={(event) => updateOpacityFromEvent(event, true)}
            style={[
              styles.opacityTrack,
              {
                backgroundColor: theme.bgCardAlt,
                borderColor: theme.border,
              },
            ]}
          >
            <View
              style={[
                styles.opacityFill,
                {
                  width: `${opacityPercent}%`,
                  backgroundColor: theme.accent,
                },
              ]}
            />
            <View
              style={[
                styles.opacityThumb,
                {
                  left: `${opacityPercent}%`,
                  backgroundColor: theme.accent,
                  borderColor: theme.bgCard,
                },
              ]}
            />
          </View>
          <View style={styles.opacityScale}>
            <Text style={[styles.opacityScaleText, { color: theme.textMuted }]}>20%</Text>
            <Text style={[styles.opacityScaleText, { color: theme.textMuted }]}>100%</Text>
          </View>
          <Text style={[styles.controlLabel, { color: theme.textPrimary }]}>Button Transparency</Text>
          <Text style={[styles.sectionBody, { color: theme.textMuted }]}>Adjust only the button background. Text stays readable.</Text>
          <View
            onLayout={(event) => setTransparencyTrackWidth(event.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(event) => updateTransparencyFromEvent(event, true)}
            onResponderMove={(event) => updateTransparencyFromEvent(event, false)}
            onResponderRelease={(event) => updateTransparencyFromEvent(event, true)}
            style={[
              styles.opacityTrack,
              {
                backgroundColor: theme.bgCardAlt,
                borderColor: theme.border,
              },
            ]}
          >
            <View
              style={[
                styles.opacityFill,
                {
                  width: `${transparencyPercent}%`,
                  backgroundColor: theme.accent,
                },
              ]}
            />
            <View
              style={[
                styles.opacityThumb,
                {
                  left: `${transparencyPercent}%`,
                  backgroundColor: theme.accent,
                  borderColor: theme.bgCard,
                },
              ]}
            />
          </View>
          <View style={styles.opacityScale}>
            <Text style={[styles.opacityScaleText, { color: theme.textMuted }]}>20%</Text>
            <Text style={[styles.opacityScaleText, { color: theme.textMuted }]}>100%</Text>
          </View>
          <View style={styles.previewRow}>
            <Button label="Preview" onPress={() => {}} fullWidth={false} />
            <Text style={[styles.previewText, { color: theme.textMuted }]}>
              {Math.round(opacityValue * 100)}% / {Math.round(transparencyValue * 100)}%
            </Text>
          </View>
        </Card>

        <Card>
          <Button label="Restore Recommended" onPress={() => void handleResetRecommended()} variant="secondary" />
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
  opacityTrack: { height: 34, borderRadius: 999, borderWidth: 1, justifyContent: 'center', overflow: 'hidden', position: 'relative' },
  opacityFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  opacityThumb: { position: 'absolute', width: 22, height: 22, marginLeft: -11, borderRadius: 999, borderWidth: 3 },
  opacityScale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  opacityScaleText: { fontSize: 11, fontWeight: '700' },
  controlLabel: { fontSize: 12, fontWeight: '800', marginTop: 16, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  previewText: { fontSize: 12, fontWeight: '700' },
});
