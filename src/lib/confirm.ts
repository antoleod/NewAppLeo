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
