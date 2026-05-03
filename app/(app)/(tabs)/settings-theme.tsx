import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, Page, Segment } from '@/components/ui';
import { BackgroundPhotoSelector } from '@/components/BackgroundPhotoSelector';
import { ThemeVariantGrid, ThemePreview, HexColorInput, ThemeSurfaceSelector } from '@/components/ThemeCustomizer';
import { getAppSettings, updateAppSettings } from '@/lib/storage';

export default function ThemeSettings() {
  const { theme, paletteMode, themeMode, themeVariant, themeStyle, setThemeVariant, setThemeStyle, setCustomTheme, toggleTheme } = useTheme();
  const { setThemeMode } = useAuth();
  const [customPrimary, setCustomPrimary] = useState('');
  const [customSecondary, setCustomSecondary] = useState('');
  const [customBackgroundAlt, setCustomBackgroundAlt] = useState('');
  const [customEnabled, setCustomEnabled] = useState(false);

  const paletteCards = [
    { key: 'sage', title: 'Bright Light', body: 'Perfect for daytime with strong readability on a light background.', swatches: ['#E5E5E5', '#1F5EDC', '#1A1A1A'] },
    { key: 'navy', title: 'Custom Ocean', body: 'Deep marine tones with bright accents.', swatches: ['#13294B', '#00C2E0', '#00E5FF'] },
    { key: 'rose', title: 'Elegant Purple', body: 'Golden accents over violet for a premium look.', swatches: ['#2B124C', '#F5C518', '#6D28D9'] },
    { key: 'sand', title: 'Sophisticated Night', body: 'Elegant dark mode with warm highlights.', swatches: ['#121212', '#FF6A00', '#FF7A1A'] },
  ] as const;

  useEffect(() => {
    (async () => {
      const settings = await getAppSettings();
      setCustomPrimary(settings.customTheme?.primary ?? '');
      setCustomSecondary(settings.customTheme?.secondary ?? '');
      setCustomBackgroundAlt(settings.customTheme?.backgroundAlt ?? '');
      setCustomEnabled(Boolean(settings.customTheme?.enabled));
    })();
  }, []);

  async function handleApplyCustomTheme() {
    try {
      const nextEnabled = !customEnabled;
      const settings = await getAppSettings();
      const customTheme = {
        enabled: nextEnabled,
        primary: customPrimary || settings.customTheme?.primary,
        secondary: customSecondary || settings.customTheme?.secondary,
        backgroundAlt: customBackgroundAlt || settings.customTheme?.backgroundAlt,
      };
      await updateAppSettings({ customTheme });
      await setCustomTheme(customTheme);
      setCustomEnabled(nextEnabled);
    } catch (error: any) {
      Alert.alert('Theme', error?.message ?? 'Could not update theme');
    }
  }

  return (
    <Page>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Theme & Design</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>Minimal, modern, and consistent across the app.</Text>

        <Card>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Mode</Text>
          <Segment value={themeMode} onChange={(value) => setThemeMode(value as any)} options={[{ label: 'System', value: 'system' }, { label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]} />
          <View style={{ marginTop: 10 }}>
            <Button label={paletteMode === 'nuit' ? 'Switch to Light' : 'Switch to Dark'} onPress={() => void toggleTheme()} variant="secondary" />
          </View>
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Color Palettes</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted, marginBottom: 10 }]}>Explore visual styles. Swipe to see how each theme changes the app colors.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paletteRow}>
            {paletteCards.map((item) => {
              const active = themeVariant === item.key;
              return (
                <Pressable key={item.key} onPress={() => void setThemeVariant(item.key as any)} style={[styles.paletteCard, { borderColor: active ? theme.accent : theme.border, backgroundColor: theme.bgCardAlt }]}>
                  <View style={styles.swatches}>{item.swatches.map((color) => <View key={color} style={[styles.swatch, { backgroundColor: color }]} />)}</View>
                  <Text style={[styles.paletteTitle, { color: theme.textPrimary }]}>{item.title}</Text>
                  <Text style={[styles.paletteBody, { color: theme.textMuted }]}>{item.body}</Text>
                  <Text style={[styles.paletteCta, { color: active ? theme.accent : theme.textMuted }]}>{active ? 'Active' : 'Tap to apply'}</Text>
                  {active ? <Text style={[styles.paletteNow, { color: theme.accent }]}>Selected now</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Palette Grid</Text>
          <ThemeVariantGrid value={themeVariant} onChange={(variant) => void setThemeVariant(variant as any)} />
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Surface</Text>
          <ThemeSurfaceSelector value={themeStyle} onChange={(surface) => void setThemeStyle(surface as any)} />
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Custom Builder</Text>
          <HexColorInput label="Primary" value={customPrimary} onChange={setCustomPrimary} placeholder="#4d7c6b" />
          <HexColorInput label="Secondary" value={customSecondary} onChange={setCustomSecondary} placeholder="#c18f54" />
          <HexColorInput label="Background Alt" value={customBackgroundAlt} onChange={setCustomBackgroundAlt} placeholder="#eef4ef" />
          <View style={{ marginTop: 10 }}>
            <Button label={customEnabled ? 'Disable Custom' : 'Apply Custom'} onPress={() => void handleApplyCustomTheme()} />
          </View>
        </Card>

        <ThemePreview />
        <BackgroundPhotoSelector />
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: '900' },
  subtitle: { fontSize: 13, marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  paletteRow: { gap: 10, paddingRight: 8 },
  paletteCard: { width: 250, borderWidth: 1, borderRadius: 14, padding: 12 },
  swatches: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  swatch: { width: 24, height: 24, borderRadius: 999 },
  paletteTitle: { fontSize: 15, fontWeight: '800' },
  paletteBody: { fontSize: 12, marginTop: 4, minHeight: 34 },
  paletteCta: { fontSize: 12, fontWeight: '800', marginTop: 8 },
  paletteNow: { fontSize: 11, fontWeight: '700', marginTop: 2 },
});
