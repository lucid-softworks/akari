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

/**
 * Convenience function for simple confirmation dialogs
 *
 * @param title - The confirmation title
 * @param message - The confirmation message
 * @param onConfirm - Callback when user confirms
 * @param onCancel - Optional callback when user cancels
 *
 * @example
 * ```typescript
 * showConfirm(
 *   'Delete Item',
 *   'Are you sure you want to delete this item?',
 *   () => deleteItem(),
 *   () => console.log('Cancelled')
 * );
 * ```
 */
export function showConfirm(title: string, message: string, onConfirm: () => void, onCancel?: () => void): void {
  showAlert({
    title,
    message,
    buttons: [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: 'OK',
        onPress: onConfirm,
      },
    ],
  });
}

/**
 * Convenience function for destructive confirmation dialogs
 *
 * @param title - The confirmation title
 * @param message - The confirmation message
 * @param confirmText - Text for the confirm button (defaults to 'Delete')
 * @param onConfirm - Callback when user confirms
 * @param onCancel - Optional callback when user cancels
 *
 * @example
 * ```typescript
 * showDestructiveConfirm(
 *   'Remove Account',
 *   'This action cannot be undone. Are you sure?',
 *   'Remove',
 *   () => removeAccount(),
 *   () => console.log('Cancelled')
 * );
 * ```
 */
export function showDestructiveConfirm(
  title: string,
  message: string,
  confirmText: string = 'Delete',
  onConfirm: () => void,
  onCancel?: () => void,
): void {
  showAlert({
    title,
    message,
    buttons: [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: confirmText,
        style: 'destructive',
        onPress: onConfirm,
      },
    ],
  });
}
