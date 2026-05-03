import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, Page, Segment } from '@/components/ui';
import { BackgroundPhotoSelector } from '@/components/BackgroundPhotoSelector';
import { SettingsImporter } from '@/components/SettingsImporter';
import { getAppSettings, setAppSettings } from '@/lib/storage';

export default function ThemeSettings() {
  const { width } = useWindowDimensions();
  const {
    theme,
    themeMode,
    themeVariant,
    backgroundPhotoUri,
    buttonOpacity,
    setThemeVariant,
    setThemeStyle,
    setBackgroundPhotoUri,
    setButtonOpacity,
  } = useTheme();
  const { setThemeMode } = useAuth();
  const [opacityValue, setOpacityValue] = useState(buttonOpacity);
  const [opacityTrackWidth, setOpacityTrackWidth] = useState(0);

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
    setOpacityValue(buttonOpacity);
  }, [buttonOpacity]);

  async function handleButtonOpacityChange(value: number) {
    const nextOpacity = Math.max(0.2, Math.min(1, value));
    setOpacityValue(nextOpacity);
    await setButtonOpacity(nextOpacity);
  }

  function handleOpacityTrackPress(event: any) {
    if (!opacityTrackWidth) return;
    const ratio = Math.max(0, Math.min(1, event.nativeEvent.locationX / opacityTrackWidth));
    const nextOpacity = Math.round((0.2 + ratio * 0.8) * 100) / 100;
    void handleButtonOpacityChange(nextOpacity);
  }

  async function handleResetRecommended() {
    try {
      const current = await getAppSettings();
      const next = {
        ...current,
        themeVariant: 'sage' as const,
        themeStyle: 'default' as const,
        buttonOpacity: 1,
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
          <Text style={[styles.sectionBody, { color: theme.textMuted }]}>Adjust how solid primary app buttons look, from 20% to 100%.</Text>
          <Pressable
            onPress={handleOpacityTrackPress}
            onLayout={(event) => setOpacityTrackWidth(event.nativeEvent.layout.width)}
            style={({ pressed }) => [
              styles.opacityTrack,
              {
                backgroundColor: theme.bgCardAlt,
                borderColor: pressed ? theme.accent : theme.border,
              },
            ]}
          >
            <View
              style={[
                styles.opacityFill,
                {
                  width: `${((opacityValue - 0.2) / 0.8) * 100}%`,
                  backgroundColor: theme.accent,
                },
              ]}
            />
            <View
              style={[
                styles.opacityThumb,
                {
                  left: `${((opacityValue - 0.2) / 0.8) * 100}%`,
                  backgroundColor: theme.accent,
                  borderColor: theme.bgCard,
                },
              ]}
            />
          </Pressable>
          <View style={styles.opacityScale}>
            <Text style={[styles.opacityScaleText, { color: theme.textMuted }]}>20%</Text>
            <Text style={[styles.opacityScaleText, { color: theme.textMuted }]}>100%</Text>
          </View>
          <View style={styles.previewRow}>
            <Button label="Preview" onPress={() => {}} fullWidth={false} style={{ opacity: opacityValue }} />
            <Text style={[styles.previewText, { color: theme.textMuted }]}>{Math.round(opacityValue * 100)}%</Text>
          </View>
        </Card>

        <Card>
          <Button label="Restore Recommended" onPress={() => void handleResetRecommended()} variant="secondary" />
        </Card>

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
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  previewText: { fontSize: 12, fontWeight: '700' },
});
