import React, { useState, useEffect } from 'react';
import { View, Text, Alert, ScrollView, Pressable } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, Heading, Page, SectionHeader, Segment, ColorSwatch } from '@/components/ui';
import { ThemeVariantGrid, ThemePreview, HexColorInput, ThemeSurfaceSelector } from '@/components/ThemeCustomizer';
import { BackgroundPhotoSelector } from '@/components/BackgroundPhotoSelector';
import { DataImporter } from '@/components/DataImporter';
import { spacing } from '@/theme';
import { getAppSettings, updateAppSettings } from '@/lib/storage';
import { useLocale } from '@/context/LocaleContext';

export default function ThemeSettings() {
  const { t } = useLocale();
  const {
    colors,
    theme,
    paletteMode,
    themeMode,
    themeVariant,
    themeStyle,
    backgroundPhotoUri,
    setThemeVariant,
    setThemeStyle,
    setBackgroundPhotoUri,
    setCustomTheme,
    toggleTheme,
  } = useTheme();
  const { setThemeMode } = useAuth();

  const [customPrimary, setCustomPrimary] = useState('');
  const [customSecondary, setCustomSecondary] = useState('');
  const [customBackgroundAlt, setCustomBackgroundAlt] = useState('');
  const [settings, setSettings] = useState<any>({});
  const [isCustomThemeEnabled, setIsCustomThemeEnabled] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [presetColor, setPresetColor] = useState('#4d7c6b');

  useEffect(() => {
    void (async () => {
      const appSettings = await getAppSettings();
      setSettings(appSettings);
      setCustomPrimary(appSettings.customTheme?.primary || '');
      setCustomSecondary(appSettings.customTheme?.secondary || '');
      setCustomBackgroundAlt(appSettings.customTheme?.backgroundAlt || '');
      setIsCustomThemeEnabled(appSettings.customTheme?.enabled || false);
    })();
  }, []);

  const handlePhotoSelected = async (uri: string) => {
    try {
      setUploadingPhoto(true);
      await updateAppSettings({ backgroundPhotoUri: uri });
      await setBackgroundPhotoUri(uri);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save photo');
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
      Alert.alert('Error', error.message || 'Failed to remove photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleApplyCustomTheme = async () => {
    const customTheme = {
      enabled: !isCustomThemeEnabled,
      primary: customPrimary || settings.customTheme?.primary,
      secondary: customSecondary || settings.customTheme?.secondary,
      backgroundAlt: customBackgroundAlt || settings.customTheme?.backgroundAlt,
    };
    const nextSettings = await updateAppSettings({ customTheme });
    setSettings(nextSettings);
    await setCustomTheme(customTheme);
    setIsCustomThemeEnabled(!isCustomThemeEnabled);
  };

  return (
    <Page>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24, gap: 12 }}>
        <Heading eyebrow="Personalization" title="Theme & Design" subtitle="Customize colors, palette, visual style, and background" />

        <Card>
          <SectionHeader title="Light/Dark Mode" />
          <Segment
            value={themeMode}
            onChange={(value) => setThemeMode(value as any)}
            options={[
              { label: 'System', value: 'system' },
              { label: 'Light', value: 'light' },
              { label: 'Dark', value: 'dark' },
            ]}
          />
          <Button label={paletteMode === 'nuit' ? 'Switch to Light' : 'Switch to Dark'} onPress={() => void toggleTheme()} variant="ghost" fullWidth />
        </Card>

        <Card>
          <SectionHeader title="Color Palette" />
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17, marginBottom: spacing.md }}>
            Choose from our curated color palettes, each designed for a specific mood
          </Text>
          <ThemeVariantGrid value={themeVariant} onChange={async (variant) => setThemeVariant(variant)} />
        </Card>

        <Card>
          <SectionHeader title="Visual Style" />
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17, marginBottom: spacing.md }}>
            Select how backgrounds and cards appear
          </Text>
          <ThemeSurfaceSelector value={themeStyle} onChange={async (surface) => setThemeStyle(surface)} />
        </Card>

        <BackgroundPhotoSelector currentPhotoUri={backgroundPhotoUri} onPhotoSelected={handlePhotoSelected} onPhotoRemoved={handlePhotoRemoved} isLoading={uploadingPhoto} />

        <Card>
          <SectionHeader title="Live Preview" />
          <ThemePreview />
        </Card>

        <Card>
          <SectionHeader title="Advanced Colors" />
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17, marginBottom: spacing.md }}>
            Pick a base color or fine-tune with HEX values.
          </Text>
          <View style={{ gap: spacing.md }}>
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800' }}>Quick palette</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {['#4d7c6b', '#c18f54', '#2f7d57', '#8eb5ea', '#d08ba0', '#1d4e89'].map((color) => (
                  <Pressable
                    key={color}
                    onPress={() => setPresetColor(color)}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 999,
                      backgroundColor: color,
                      borderWidth: presetColor === color ? 3 : 1,
                      borderColor: presetColor === color ? colors.text : colors.border,
                    }}
                  />
                ))}
              </View>
            </View>
            <View style={{ gap: spacing.md }}>
              <HexColorInput label="Primary accent color" value={customPrimary || presetColor} onChange={setCustomPrimary} placeholder="e.g., #4d7c6b" />
              <HexColorInput label="Secondary accent color" value={customSecondary} onChange={setCustomSecondary} placeholder="e.g., #c18f54" />
              <HexColorInput label="Card background color" value={customBackgroundAlt} onChange={setCustomBackgroundAlt} placeholder="e.g., #eef4ef" />
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.md, justifyContent: 'center', flexWrap: 'wrap', paddingVertical: spacing.md }}>
              {customPrimary ? <ColorSwatch color={customPrimary} label="Primary" /> : null}
              {customSecondary ? <ColorSwatch color={customSecondary} label="Secondary" /> : null}
              {customBackgroundAlt ? <ColorSwatch color={customBackgroundAlt} label="Background" /> : null}
            </View>
            <Button label={isCustomThemeEnabled ? 'Disable Custom Theme' : 'Apply Custom Theme'} onPress={handleApplyCustomTheme} variant={isCustomThemeEnabled ? 'secondary' : 'primary'} fullWidth />
          </View>
        </Card>

        <DataImporter />

        <Card>
          <Text style={{ color: theme.textPrimary, fontWeight: '700', marginBottom: spacing.sm }}>Tips for best results</Text>
          <Text style={{ color: theme.textMuted, fontSize: 12, lineHeight: 18 }}>
            {"• Hex colors should be in format #RRGGBB\n• Test custom themes in both light and dark modes\n• Use complementary colors for better contrast\n• Background photo works with all styles\n• Import JSON with feeds, diapers, or sleep data"}
          </Text>
        </Card>
      </ScrollView>
    </Page>
  );
}
