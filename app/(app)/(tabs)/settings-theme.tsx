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

  const opacityOptions = [
    { label: '100%', value: 1 },
    { label: '90%', value: 0.9 },
    { label: '80%', value: 0.8 },
    { label: '70%', value: 0.7 },
  ];

  useEffect(() => {
    setOpacityValue(buttonOpacity);
  }, [buttonOpacity]);

  async function handleButtonOpacityChange(value: string) {
    const nextOpacity = Number(value);
    setOpacityValue(nextOpacity);
    await setButtonOpacity(nextOpacity);
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
          <Text style={[styles.sectionBody, { color: theme.textMuted }]}>Adjust how solid primary app buttons look.</Text>
          <Segment
            value={String(opacityValue)}
            onChange={(value) => void handleButtonOpacityChange(value)}
            options={opacityOptions.map((item) => ({ label: item.label, value: String(item.value) }))}
          />
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
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  previewText: { fontSize: 12, fontWeight: '700' },
});
