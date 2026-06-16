import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { confirmAction, alertInfo } from '@/utils/confirm';
import { spacing, radii } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { typography } from '@/typography';
import { Card, SectionHeader, ButtonGroup } from '@/components/shared';

export interface BackgroundPhotoSelectorProps {
  currentPhotoUri?: string;
  onPhotoSelected: (uri: string) => void;
  onPhotoRemoved?: () => void;
  isLoading?: boolean;
}

/**
 * On web, expo-image-picker returns `URL.createObjectURL(file)` — a `blob:` URL
 * that is session-scoped and becomes invalid as soon as the page reloads. If we
 * stored that, the background would vanish on the next app open. So on web we
 * downscale the picked image and re-encode it as a `data:` URI, which is a
 * self-contained string that persists in AsyncStorage (localStorage). Native
 * URIs (`file://`) are already persistent, so we pass them through untouched.
 */
async function toStorableUri(uri: string): Promise<string> {
  if (Platform.OS !== 'web') return uri;
  try {
    // Keep the encoded string light: a full-screen backdrop sits behind a
    // gradient overlay, so 1280px @ 0.7 quality looks fine while keeping the
    // data: URI small (~100–250KB). A heavier image bloats localStorage and is
    // slow to decode on every page, which made applying feel sluggish.
    return await downscaleToDataUri(uri, 1280, 0.7);
  } catch {
    return uri;
  }
}

function downscaleToDataUri(srcUri: string, maxSize: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Failed to load picked image'));
    img.src = srcUri;
  });
}

export function BackgroundPhotoSelector({
  currentPhotoUri,
  onPhotoSelected,
  onPhotoRemoved,
  isLoading = false,
}: BackgroundPhotoSelectorProps) {
  const { theme, colors } = useTheme();
  const { t } = useTranslation();
  const [selecting, setSelecting] = useState(false);

  const handlePickPhoto = async () => {
    try {
      // On web the picker is an <input type=file> that must be opened within
      // the click's user-gesture. Awaiting a permission request first breaks
      // that gesture chain (browser blocks the file dialog) — and web needs no
      // media-library permission anyway. So only request it on native.
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          alertInfo(t('dataIO.bgPermissionTitle'), t('dataIO.bgPermissionMsg'));
          return;
        }
      }

      setSelecting(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        // No forced aspect: the backdrop is shown full-screen with `cover`, so a
        // 16:9 pre-crop just fought the screen ratio and looked over-zoomed.
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        const storableUri = await toStorableUri(result.assets[0].uri);
        onPhotoSelected(storableUri);
        alertInfo(t('dataIO.successTitle'), t('dataIO.bgUpdated'));
      }
    } catch (error: any) {
      alertInfo(t('dataIO.errorTitle'), error.message || t('dataIO.bgPickFailed'));
    } finally {
      setSelecting(false);
    }
  };

  const handleRemovePhoto = async () => {
    const ok = await confirmAction({
      title: t('dataIO.bgRemoveTitle'),
      message: t('dataIO.bgRemoveMsg'),
      confirmLabel: t('dataIO.bgRemoveConfirm'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    onPhotoRemoved?.();
    alertInfo(t('dataIO.successTitle'), t('dataIO.bgRemoved'));
  };

  return (
    <Card>
      <SectionHeader title={t('dataIO.bgTitle')} />
      <Text style={[typography.body, { color: colors.muted, marginBottom: spacing.md }]}>
        {t('dataIO.bgSubtitle')}
      </Text>

      {/* Preview Section */}
      <View
        style={{
          borderRadius: radii.lg,
          overflow: 'hidden',
          height: 180,
          borderWidth: 1,
          borderColor: theme.border,
          marginBottom: spacing.md,
          backgroundColor: theme.bgCardAlt,
        }}
      >
        {currentPhotoUri ? (
          <Image
            source={{ uri: currentPhotoUri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              flex: 1,
              backgroundColor: theme.bgCard,
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
            }}
          >
            <Text style={[typography.sectionLabel, { color: theme.accent }]}>
              {t('dataIO.bgNoCustom')}
            </Text>
            <Text style={[typography.detail, { color: colors.muted }]}>
              {t('dataIO.bgDefaultUsed')}
            </Text>
          </View>
        )}
      </View>

      {/* Info Badge */}
      {currentPhotoUri && (
        <View
          style={{
            backgroundColor: `${theme.green}11`,
            borderColor: theme.green,
            borderWidth: 1,
            borderRadius: radii.md,
            padding: spacing.sm,
            marginBottom: spacing.md,
          }}
        >
          <Text style={[typography.detail, { color: theme.green, fontWeight: '600' }]}>
            {t('dataIO.bgActive')}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <ButtonGroup
        buttons={[
          {
            label: selecting ? t('dataIO.bgSelecting') : t('dataIO.bgChoose'),
            onPress: handlePickPhoto,
            variant: 'primary',
          },
          ...(currentPhotoUri
            ? [
                {
                  label: t('dataIO.bgRemoveConfirm'),
                  onPress: handleRemovePhoto,
                  variant: 'ghost' as const,
                },
              ]
            : []),
        ]}
        direction="column"
      />

      {/* Tips */}
      <View
        style={{
          backgroundColor: theme.bgCardAlt,
          borderRadius: radii.md,
          padding: spacing.md,
          marginTop: spacing.md,
          gap: spacing.xs,
        }}
      >
        <Text style={[typography.sectionLabel, { color: theme.accent }]}>
          {t('dataIO.bgTips')}
        </Text>
        <Text style={[typography.detail, { color: theme.textMuted, lineHeight: 18 }]}>
          {t('dataIO.bgTipsBody')}
        </Text>
      </View>

      {isLoading && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: radii.lg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      )}
    </Card>
  );
}

export function QuickBackgroundToggle({
  hasCustomBackground,
  onToggleDefault,
}: {
  hasCustomBackground: boolean;
  onToggleDefault: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onToggleDefault}
      style={{
        backgroundColor: theme.bgCard,
        borderColor: theme.border,
        borderWidth: 1,
        borderRadius: radii.lg,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View>
        <Text style={[typography.pill, { color: theme.textPrimary, fontWeight: '700' }]}>
          {hasCustomBackground ? t('dataIO.bgCustomLabel') : t('dataIO.bgDefaultLabel')}
        </Text>
        <Text style={[typography.detail, { color: theme.textMuted, marginTop: 2 }]}>
          {t('dataIO.bgTapToggle')}
        </Text>
      </View>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radii.pill,
          backgroundColor: `${theme.accent}22`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 20 }}>
          {hasCustomBackground ? '📸' : '🎨'}
        </Text>
      </View>
    </Pressable>
  );
}
