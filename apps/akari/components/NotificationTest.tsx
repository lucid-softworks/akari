import React, { useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { SIDEBAR_PALETTE } from '@/constants/palette';
import { useTranslation } from '@/hooks/useTranslation';
import { scheduleLocalNotification } from '@/utils/notifications';

interface NotificationTestProps {
  onNotificationSent?: () => void;
}

const palette = SIDEBAR_PALETTE;

export function NotificationTest({ onNotificationSent }: NotificationTestProps) {
  const { t } = useTranslation();
  const [isSending, setIsSending] = useState(false);

  const handleTestNotification = async () => {
    setIsSending(true);

    try {
      const notificationId = await scheduleLocalNotification(
        'Test Notification',
        'This is a test notification from Akari v2!',
        { type: 'test', timestamp: new Date().toISOString() },
      );

      Alert.alert('Test Notification Sent', `Notification ID: ${notificationId}`, [{ text: 'OK' }]);

      onNotificationSent?.();
    } catch (error) {
      console.error('Failed to send test notification:', error);
      Alert.alert('Error', 'Failed to send test notification. Please check your notification permissions.', [
        { text: 'OK' },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleTestDelayedNotification = async () => {
    setIsSending(true);

    try {
      const notificationId = await scheduleLocalNotification(
        'Delayed Test Notification',
        'This notification was scheduled to appear 5 seconds later!',
        { type: 'test', timestamp: new Date().toISOString() },
      );

      Alert.alert(
        'Delayed Notification Scheduled',
        `Notification ID: ${notificationId}\n\nThis notification will appear in 5 seconds.`,
        [{ text: 'OK' }],
      );

      onNotificationSent?.();
    } catch (error) {
      console.error('Failed to schedule delayed notification:', error);
      Alert.alert('Error', 'Failed to schedule delayed notification. Please check your notification permissions.', [
        { text: 'OK' },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <IconSymbol name="bell.badge" size={20} color={palette.highlight} />
        <ThemedText style={styles.headerTitle}>{t('notifications.testNotifications')}</ThemedText>
      </View>

      <ThemedText style={styles.description}>{t('notifications.testNotificationsDescription')}</ThemedText>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.testButton, isSending && styles.testButtonDisabled]}
          onPress={handleTestNotification}
          disabled={isSending}
        >
          <IconSymbol name="bell" size={16} color={palette.textPrimary} />
          <ThemedText style={styles.buttonText}>
            {isSending ? t('notifications.sending') : t('notifications.sendTest')}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, isSending && styles.testButtonDisabled]}
          onPress={handleTestDelayedNotification}
          disabled={isSending}
        >
          <IconSymbol name="clock" size={16} color={palette.textPrimary} />
          <ThemedText style={styles.buttonText}>
            {isSending ? t('notifications.scheduling') : t('notifications.scheduleTest')}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.activeBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.textPrimary,
  },
  description: {
    fontSize: 14,
    color: palette.textSecondary,
    marginBottom: 18,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  testButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.headerBackground,
  },
  testButtonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    color: palette.textPrimary,
  },
});
