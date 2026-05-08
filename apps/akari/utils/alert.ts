import { Alert, Platform } from 'react-native';

type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type AlertOptions = {
  cancelable?: boolean;
  onDismiss?: () => void;
};

type ShowAlertParams = {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  options?: AlertOptions;
};

/**
 * Cross-platform alert utility that mimics Alert.alert signature
 * Uses Alert.alert on mobile and window.confirm on web
 *
 * @param params - Alert configuration object
 *
 * @example
 * ```typescript
 * // Simple alert
 * showAlert({ title: 'Success', message: 'Operation completed successfully' });
 *
 * // Alert with buttons
 * showAlert({
 *   title: 'Confirm Action',
 *   message: 'Are you sure?',
 *   buttons: [
 *     { text: 'Cancel', style: 'cancel' },
 *     { text: 'OK', onPress: () => console.log('Confirmed') }
 *   ]
 * });
 * ```
 */
export function showAlert({ title, message, buttons, options }: ShowAlertParams): void {
  if (Platform.OS === 'web') {
    // Web implementation using window.confirm
    const confirmed = window.confirm(message ? `${title}\n\n${message}` : title);

    if (buttons && buttons.length > 0) {
      // Find the primary action (first non-cancel button, or first button if all are cancel)
      const primaryButton = buttons.find((btn) => btn.style !== 'cancel') || buttons[0];

      if (confirmed && primaryButton?.onPress) {
        primaryButton.onPress();
      } else if (!confirmed) {
        // Find cancel button and call its onPress
        const cancelButton = buttons.find((btn) => btn.style === 'cancel');
        if (cancelButton?.onPress) {
          cancelButton.onPress();
        }
      }
    }
  } else {
    // Mobile implementation using Alert.alert
    Alert.alert(title, message, buttons, options);
  }
}

