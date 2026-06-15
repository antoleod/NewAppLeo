import React from 'react';
import {
  ImageBackground,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

export function Page({
  children,
  scroll = true,
  contentStyle,
  refreshControl,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: any;
  refreshControl?: React.ComponentProps<typeof ScrollView>['refreshControl'];
}) {
  const { width } = useWindowDimensions();
  const { colors, gradients, themeStyle, backgroundPhotoUri } = useTheme();
  const isDesktopWeb = Platform.OS === 'web' && width >= 1100;
  const pageMaxWidth = isDesktopWeb ? 980 : width >= 1100 ? 1040 : 1100;
  const usePhotoBackdrop = themeStyle !== 'classic';
  const backdropSource = backgroundPhotoUri
    ? ({ uri: backgroundPhotoUri } as const)
    : require('../../../../assets/img/baby1.f57cad83ec056a25eac37625af9c68fb.jpg');
  const backdropBlur = themeStyle === 'photo' ? 2 : Platform.OS === 'web' ? 0 : 12;
  const content = (
    <View style={[styles.pageInner, { maxWidth: pageMaxWidth }, contentStyle]}>
      {children}
    </View>
  );

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      {usePhotoBackdrop ? (
        <ImageBackground
          source={backdropSource}
          resizeMode="cover"
          blurRadius={backdropBlur}
          style={styles.photoBackdrop}
          imageStyle={[
            styles.photoBackdropImage,
            themeStyle === 'photo' ? styles.photoBackdropImagePunch : null,
            Platform.OS === 'web' ? ({ objectPosition: 'center center' } as any) : null,
          ]}
        >
          <LinearGradient colors={gradients.page as [string, string, ...string[]]} style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={themeStyle === 'photo'
              ? ['rgba(0,0,0,0.34)', 'rgba(0,0,0,0.48)', 'rgba(0,0,0,0.58)']
              : ['rgba(0,0,0,0.18)', 'rgba(0,0,0,0.30)', 'rgba(0,0,0,0.38)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </ImageBackground>
      ) : (
        <LinearGradient colors={gradients.page as [string, string, ...string[]]} style={StyleSheet.absoluteFill} />
      )}
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        {scroll ? (
          <GestureScrollView
            contentContainerStyle={[styles.scroll, isDesktopWeb && styles.scrollDesktop]}
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
          >
            {content}
          </GestureScrollView>
        ) : (
          <View style={[styles.scrollStatic, isDesktopWeb && styles.scrollDesktop]}>{content}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  photoBackdrop: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  photoBackdropImage: { opacity: 1 },
  photoBackdropImagePunch: { opacity: 0.98, transform: [{ scale: 1.06 }] },
  safe: { flex: 1, zIndex: 1 },
  scroll: { paddingHorizontal: spacing.sm, paddingBottom: spacing.xxl, flexGrow: 1 },
  scrollStatic: { flex: 1 },
  scrollDesktop: { paddingHorizontal: spacing.lg },
  pageInner: { flex: 1, width: '100%', maxWidth: 1100, alignSelf: 'center' },
});
