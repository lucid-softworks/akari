import React, { useState } from 'react';
import { Alert, Platform, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';

import { NotificationTest } from '@/components/NotificationTest';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { SIDEBAR_PALETTE } from '@/constants/palette';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useTranslation } from '@/hooks/useTranslation';

interface NotificationSettingsProps {
  onSettingsChange?: () => void;
}

const palette = SIDEBAR_PALETTE;

export function NotificationSettings({ onSettingsChange }: NotificationSettingsProps) {
  const { t } = useTranslation();
  const { permissionStatus, expoPushToken, isLoading, error, initialize, clearBadge } = usePushNotifications();

  const [localSettings, setLocalSettings] = useState({
    pushEnabled: permissionStatus === 'granted',
    soundEnabled: true,
    vibrationEnabled: true,
    badgeEnabled: true,
  });

  const showTokenInfo = __DEV__ && !!expoPushToken;

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
      <View style={styles.header}>
        <IconSymbol name="bell" size={24} color={palette.highlight} />
        <ThemedText style={styles.headerTitle}>{t('notifications.pushNotifications')}</ThemedText>
      </View>

      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <ThemedText style={styles.settingTitle}>{t('notifications.permissionStatus')}</ThemedText>
            <ThemedText style={styles.settingDescription}>{getPermissionStatusText()}</ThemedText>
          </View>
          <View style={[styles.statusIndicator, { backgroundColor: getPermissionStatusColor() }]} />
        </View>
      </View>

      <View
        style={[
          styles.section,
          !localSettings.pushEnabled && !showTokenInfo && styles.sectionLast,
        ]}
      >
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
            trackColor={{ false: palette.border, true: palette.highlight }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {localSettings.pushEnabled ? (
        <>
          <View style={styles.section}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>{t('notifications.sound')}</ThemedText>
                <ThemedText style={styles.settingDescription}>{t('notifications.playSoundForNotifications')}</ThemedText>
              </View>
              <Switch
                value={localSettings.soundEnabled}
                onValueChange={() => handleSettingToggle('soundEnabled')}
                trackColor={{ false: palette.border, true: palette.highlight }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>{t('notifications.vibration')}</ThemedText>
                <ThemedText style={styles.settingDescription}>{t('notifications.vibrateForNotifications')}</ThemedText>
              </View>
              <Switch
                value={localSettings.vibrationEnabled}
                onValueChange={() => handleSettingToggle('vibrationEnabled')}
                trackColor={{ false: palette.border, true: palette.highlight }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <View style={[styles.section, !showTokenInfo && styles.sectionLast]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>{t('notifications.badge')}</ThemedText>
                <ThemedText style={styles.settingDescription}>{t('notifications.showBadgeOnAppIcon')}</ThemedText>
              </View>
              <Switch
                value={localSettings.badgeEnabled}
                onValueChange={() => handleSettingToggle('badgeEnabled')}
                trackColor={{ false: palette.border, true: palette.highlight }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </>
      ) : null}

      {showTokenInfo ? (
        <View style={[styles.section, styles.sectionLast]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText style={styles.settingTitle}>Expo Push Token</ThemedText>
              <ThemedText style={styles.settingDescription} numberOfLines={2}>
                {expoPushToken}
              </ThemedText>
            </View>
          </View>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      ) : null}

      {localSettings.pushEnabled ? (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.clearBadgeButton}
            onPress={handleClearBadge}
          >
            <ThemedText style={styles.clearBadgeButtonText}>{t('notifications.clearBadge')}</ThemedText>
          </TouchableOpacity>
        </View>
      ) : null}

      {localSettings.pushEnabled ? <NotificationTest /> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: palette.textPrimary,
  },
  section: {
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  sectionLast: {
    borderBottomWidth: 0,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    color: palette.textPrimary,
  },
  settingDescription: {
    fontSize: 14,
    color: palette.textSecondary,
    lineHeight: 18,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  errorContainer: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f87171',
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    textAlign: 'center',
  },
  actionsContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  clearBadgeButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.highlight,
    backgroundColor: palette.activeBackground,
  },
  clearBadgeButtonText: {
    color: palette.highlight,
    fontSize: 15,
    fontWeight: '700',
  },
});
