import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export type HapticKind = 'selection' | 'success' | 'warning' | 'error' | 'light' | 'medium';

export async function triggerHaptic(kind: HapticKind = 'selection') {
  if (Platform.OS === 'web') return;

  try {
    if (kind === 'selection') {
      await Haptics.selectionAsync();
      return;
    }
    if (kind === 'success') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    if (kind === 'warning') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (kind === 'error') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    await Haptics.impactAsync(
      kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    );
  } catch {
  }
}
