import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, Heading, Page, SectionHeader, Segment, ColorSwatch } from '@/components/ui';
import { ThemeVariantGrid, ThemePreview, HexColorInput, ThemeSurfaceSelector } from '@/components/ThemeCustomizer';
import { BackgroundPhotoSelector } from '@/components/BackgroundPhotoSelector';
import { DataImporter } from '@/components/DataImporter';
import { spacing } from '@/theme';
import { getAppSettings, updateAppSettings } from '@/lib/storage';
import { useToast } from '@/components/Toast';

export default function ThemeSettings() {
  const { colors, paletteMode, themeMode, themeVariant, themeStyle, backgroundPhotoUri, setThemeVariant, setThemeStyle, setBackgroundPhotoUri, setCustomTheme, toggleTheme } = useTheme();
  const { setThemeMode } = useAuth();
  const toast = useToast();

  const [customPrimary, setCustomPrimary] = useState('');
  const [customSecondary, setCustomSecondary] = useState('');
  const [customBackgroundAlt, setCustomBackgroundAlt] = useState('');
  const [settings, setSettings] = useState<any>({});
  const [isCustomThemeEnabled, setIsCustomThemeEnabled] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const appSettings = await getAppSettings();
      setSettings(appSettings);
      setCustomPrimary(appSettings.customTheme?.primary || '');
      setCustomSecondary(appSettings.customTheme?.secondary || '');
      setCustomBackgroundAlt(appSettings.customTheme?.backgroundAlt || '');
      setIsCustomThemeEnabled(appSettings.customTheme?.enabled || false);
    };
    void loadSettings();
  }, []);

  const handlePhotoSelected = async (uri: string) => {
    try {
      setUploadingPhoto(true);
      await updateAppSettings({ backgroundPhotoUri: uri });
      await setBackgroundPhotoUri(uri);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save photo');
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
      toast.error(error.message || 'Failed to remove photo');
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
      <Heading eyebrow="Personalization" title="Theme" subtitle="Minimal and touch-first" />

      <Card>
        <SectionHeader title="Appearance" />
        <Segment
          value={themeMode}
          onChange={(value) => setThemeMode(value as any)}
          options={[
            { label: 'System', value: 'system' },
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
          ]}
        />
        <Button
          label={paletteMode === 'nuit' ? 'Switch to Light' : 'Switch to Dark'}
          onPress={() => void toggleTheme()}
          variant="ghost"
          fullWidth
        />
      </Card>

      <Card>
        <SectionHeader title="Palette" />
        <View style={{ transform: [{ scale: 0.92 }], marginVertical: -10 }}>
          <ThemeVariantGrid value={themeVariant} onChange={(variant) => setThemeVariant(variant as any)} />
        </View>
      </Card>

      <Card>
        <SectionHeader title="Background Style" />
        <View style={{ transform: [{ scale: 0.94 }], marginVertical: -8 }}>
          <ThemeSurfaceSelector
            value={themeStyle}
            onChange={async (surface) => {
              await updateAppSettings({ themeStyle: surface as any });
              await setThemeStyle(surface as any);
            }}
          />
        </View>
      </Card>

      <BackgroundPhotoSelector
        currentPhotoUri={backgroundPhotoUri}
        onPhotoSelected={handlePhotoSelected}
        onPhotoRemoved={handlePhotoRemoved}
        isLoading={uploadingPhoto}
      />

      <Card>
        <SectionHeader title="Custom Colors" />
        <View style={{ gap: spacing.md }}>
          <HexColorInput label="Primary" value={customPrimary} onChange={setCustomPrimary} placeholder="#4d7c6b" />
          <HexColorInput label="Secondary" value={customSecondary} onChange={setCustomSecondary} placeholder="#c18f54" />
          <HexColorInput label="Background" value={customBackgroundAlt} onChange={setCustomBackgroundAlt} placeholder="#eef4ef" />

          <View style={{ flexDirection: 'row', gap: spacing.md, justifyContent: 'center' }}>
            {customPrimary ? <ColorSwatch color={customPrimary} label="Primary" /> : null}
            {customSecondary ? <ColorSwatch color={customSecondary} label="Secondary" /> : null}
            {customBackgroundAlt ? <ColorSwatch color={customBackgroundAlt} label="Background" /> : null}
          </View>

          <Button label={isCustomThemeEnabled ? 'Disable Custom' : 'Apply Custom'} onPress={handleApplyCustomTheme} variant={isCustomThemeEnabled ? 'secondary' : 'primary'} />
        </View>
      </Card>

      <Card>
        <SectionHeader title="Preview" />
        <ThemePreview />
      </Card>

      <DataImporter
        onImportComplete={(count) => {
          toast.success(`${count} entries imported successfully`);
        }}
      />
    </Page>
  );
}
