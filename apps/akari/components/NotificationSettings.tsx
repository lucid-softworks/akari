import React, { useState } from 'react';
import { Alert, Platform, StyleSheet, Switch, View } from 'react-native';

import { spacing, radius, fontSize, fontWeight, opacity, semanticColors } from '@/constants/tokens';
import { NotificationTest } from '@/components/NotificationTest';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useToast } from '@/contexts/ToastContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type NotificationSettingsProps = {
  onSettingsChange?: () => void;
};

export function NotificationSettings({ onSettingsChange }: NotificationSettingsProps) {
  const { t } = useTranslation();
  const { permissionStatus, expoPushToken, isLoading, error, initialize, clearBadge } = usePushNotifications();
  const { showToast } = useToast();

  const [localSettings, setLocalSettings] = useState({
    pushEnabled: permissionStatus === 'granted',
    soundEnabled: true,
    vibrationEnabled: true,
    badgeEnabled: true,
  });

  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');

  const handlePermissionToggle = async () => {
    if (localSettings.pushEnabled) {
      // Disable notifications
      setLocalSettings((prev) => ({ ...prev, pushEnabled: false }));
      onSettingsChange?.();
    } else {
      // Enable notifications
      try {
        const success = await initialize();
        if (success) {
          setLocalSettings((prev) => ({ ...prev, pushEnabled: true }));
          onSettingsChange?.();

          // Show success message
          Alert.alert(t('notifications.permissionsGranted'), t('notifications.youWillReceiveNotifications'), [
            { text: 'OK' },
          ]);
        } else {
          // Show error message
          Alert.alert(t('notifications.permissionsDenied'), t('notifications.pleaseEnableInSettings'), [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => openAppSettings() },
          ]);
        }
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
        Alert.alert(t('notifications.error'), t('notifications.failedToEnable'), [{ text: 'OK' }]);
      }
    }
  };

  const openAppSettings = () => {
    if (Platform.OS === 'ios') {
      // For iOS, we can't directly open settings, but we can show instructions
      Alert.alert(t('notifications.openSettings'), t('notifications.iosSettingsInstructions'), [{ text: 'OK' }]);
    } else {
      // For Android, we can try to open settings
      // This would require additional setup with expo-linking
      Alert.alert(t('notifications.openSettings'), t('notifications.androidSettingsInstructions'), [{ text: 'OK' }]);
    }
  };

  const handleSettingToggle = (setting: keyof typeof localSettings) => {
    setLocalSettings((prev) => ({ ...prev, [setting]: !prev[setting] }));
    onSettingsChange?.();
  };

  const handleClearBadge = async () => {
    try {
      await clearBadge();
      Alert.alert(t('notifications.badgeCleared'), t('notifications.badgeClearedMessage'), [{ text: 'OK' }]);
    } catch (error) {
      console.error('Failed to clear badge:', error);
      showToast({
        type: 'error',
        title: t('notifications.clearBadge'),
        message: t('common.somethingWentWrong'),
      });
    }
  };

  const getPermissionStatusText = () => {
    switch (permissionStatus) {
      case 'granted':
        return t('notifications.permissionGranted');
      case 'denied':
        return t('notifications.permissionDenied');
      case 'undetermined':
        return t('notifications.permissionUndetermined');
      default:
        return t('notifications.permissionUnknown');
    }
  };

  const getPermissionStatusColor = () => {
    switch (permissionStatus) {
      case 'granted':
        return '#34C759';
      case 'denied':
        return '#FF3B30';
      case 'undetermined':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconSymbol name="bell" size={24} color={textColor} />
        <ThemedText style={styles.headerTitle}>{t('notifications.pushNotifications')}</ThemedText>
      </View>

      {/* Permission Status */}
      <View style={[styles.section, { borderBottomColor: borderColor }]}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <ThemedText style={styles.settingTitle}>{t('notifications.permissionStatus')}</ThemedText>
            <ThemedText style={styles.settingDescription}>{getPermissionStatusText()}</ThemedText>
          </View>
          <View style={[styles.statusIndicator, { backgroundColor: getPermissionStatusColor() }]} />
        </View>
      </View>

      {/* Main Toggle */}
      <View style={[styles.section, { borderBottomColor: borderColor }]}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <ThemedText style={styles.settingTitle}>{t('notifications.enablePushNotifications')}</ThemedText>
            <ThemedText style={styles.settingDescription}>
              {localSettings.pushEnabled
                ? t('notifications.pushNotificationsEnabled')
                : t('notifications.pushNotificationsDisabled')}
            </ThemedText>
          </View>
          <Switch
            value={localSettings.pushEnabled}
            onValueChange={handlePermissionToggle}
            disabled={isLoading}
            trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
            thumbColor={localSettings.pushEnabled ? '#FFFFFF' : '#FFFFFF'}
          />
        </View>
      </View>

      {/* Notification Preferences */}
      {localSettings.pushEnabled && (
        <>
          <View style={[styles.section, { borderBottomColor: borderColor }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>{t('notifications.sound')}</ThemedText>
                <ThemedText style={styles.settingDescription}>{t('notifications.playSoundForNotifications')}</ThemedText>
              </View>
              <Switch
                value={localSettings.soundEnabled}
                onValueChange={() => handleSettingToggle('soundEnabled')}
                trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                thumbColor={localSettings.soundEnabled ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>
          </View>

          <View style={[styles.section, { borderBottomColor: borderColor }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>{t('notifications.vibration')}</ThemedText>
                <ThemedText style={styles.settingDescription}>{t('notifications.vibrateForNotifications')}</ThemedText>
              </View>
              <Switch
                value={localSettings.vibrationEnabled}
                onValueChange={() => handleSettingToggle('vibrationEnabled')}
                trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                thumbColor={localSettings.vibrationEnabled ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>
          </View>

          <View style={[styles.section, { borderBottomColor: borderColor }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>{t('notifications.badge')}</ThemedText>
                <ThemedText style={styles.settingDescription}>{t('notifications.showBadgeOnAppIcon')}</ThemedText>
              </View>
              <Switch
                value={localSettings.badgeEnabled}
                onValueChange={() => handleSettingToggle('badgeEnabled')}
                trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                thumbColor={localSettings.badgeEnabled ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>
          </View>
        </>
      )}

      {/* Token Information (for debugging) */}
      {__DEV__ && expoPushToken && (
        <View style={[styles.section, { borderBottomColor: borderColor }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText style={styles.settingTitle}>{t('ui.expoPushToken')}</ThemedText>
              <ThemedText style={styles.settingDescription} numberOfLines={2}>
                {expoPushToken}
              </ThemedText>
            </View>
          </View>
        </View>
      )}

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      )}

      {/* Actions */}
      {localSettings.pushEnabled && (
        <View style={styles.actionsContainer}>
          <ThemedText style={styles.actionButton} onPress={handleClearBadge}>
            {t('notifications.clearBadge')}
          </ThemedText>
        </View>
      )}

      {/* Test Notifications */}
      {localSettings.pushEnabled && <NotificationTest />}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
    marginLeft: spacing.md,
  },
  section: {
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.lg,
  },
  settingTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  settingDescription: {
    fontSize: fontSize.base,
    opacity: opacity.secondary,
    lineHeight: 18,
  },
  statusIndicator: {
    width: spacing.md,
    height: spacing.md,
    borderRadius: spacing.md / 2,
  },
  errorContainer: {
    backgroundColor: '#FFE5E5',
    padding: spacing.md,
    borderRadius: radius.sm,
    marginTop: spacing.lg,
  },
  errorText: {
    color: semanticColors.like,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  actionsContainer: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  actionButton: {
    color: semanticColors.systemBlue,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
});
