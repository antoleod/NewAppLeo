import { Alert, Platform } from 'react-native';

export type ConfirmActionOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
};

export function confirmAction(options: ConfirmActionOptions): Promise<boolean> {
  const { title, message, confirmLabel, cancelLabel, destructive } = options;

  if (Platform.OS === 'web') {
    const accepted = typeof window !== 'undefined' && typeof window.confirm === 'function'
      ? window.confirm(`${title}\n\n${message}`)
      : false;
    return Promise.resolve(accepted);
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/**
 * Show a one-button informational message cross-platform. `Alert.alert` does
 * not render on react-native-web, so on web we fall back to `window.alert`.
 */
export function alertInfo(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    return;
  }
  Alert.alert(title, message);
}
