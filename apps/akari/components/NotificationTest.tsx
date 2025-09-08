import React, { useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { scheduleLocalNotification } from '@/utils/notifications';

interface NotificationTestProps {
  onNotificationSent?: () => void;
}

export function NotificationTest({ onNotificationSent }: NotificationTestProps) {
  const { t } = useTranslation();
  const [isSending, setIsSending] = useState(false);

  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');

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
    <ThemedView style={[styles.container, { borderColor }]}>
      <View style={styles.header}>
        <IconSymbol name="bell.badge" size={20} color={textColor} />
        <ThemedText style={styles.headerTitle}>{t('notifications.testNotifications')}</ThemedText>
      </View>

      <ThemedText style={styles.description}>{t('notifications.testNotificationsDescription')}</ThemedText>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: backgroundColor, borderColor }]}
          onPress={handleTestNotification}
          disabled={isSending}
        >
          <IconSymbol name="bell" size={16} color={textColor} />
          <ThemedText style={[styles.buttonText, { color: textColor }]}>
            {isSending ? t('notifications.sending') : t('notifications.sendTest')}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: backgroundColor, borderColor }]}
          onPress={handleTestDelayedNotification}
          disabled={isSending}
        >
          <IconSymbol name="clock" size={16} color={textColor} />
          <ThemedText style={[styles.buttonText, { color: textColor }]}>
            {isSending ? t('notifications.scheduling') : t('notifications.scheduleTest')}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 16,
    lineHeight: 18,
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
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
});
