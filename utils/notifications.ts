import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationToken {
  expoPushToken: string;
  devicePushToken?: string;
}

export interface NotificationChannel {
  id: string;
  name: string;
  description?: string;
  importance: Notifications.AndroidImportance;
  sound?: string;
  vibrationPattern?: number[];
  lightColor?: string;
}

/**
 * Request notification permissions and return the status
 */
export async function requestNotificationPermissions(): Promise<Notifications.PermissionStatus> {
  if (!Device.isDevice) {
    throw new Error('Push notifications are only supported on physical devices');
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus;
}

/**
 * Register for push notifications and return the tokens
 */
export async function registerForPushNotifications(): Promise<PushNotificationToken | null> {
  try {
    // Check if device supports push notifications
    if (!Device.isDevice) {
      console.log('Push notifications are only supported on physical devices');
      return null;
    }

    // Request permissions
    const permissionStatus = await requestNotificationPermissions();
    if (permissionStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    // Get project ID from EAS config
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId) {
      throw new Error('Project ID not found in EAS configuration');
    }

    // Get Expo push token
    const expoPushToken = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    // Get device push token (platform-specific)
    let devicePushToken: string | undefined;
    if (Platform.OS === 'android') {
      const deviceToken = await Notifications.getDevicePushTokenAsync();
      devicePushToken = deviceToken.data;
    }

    return {
      expoPushToken: expoPushToken.data,
      devicePushToken,
    };
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Create Android notification channels
 */
export async function createNotificationChannels(channels: NotificationChannel[]): Promise<void> {
  if (Platform.OS !== 'android') return;

  for (const channel of channels) {
    await Notifications.setNotificationChannelAsync(channel.id, {
      name: channel.name,
      description: channel.description,
      importance: channel.importance,
      sound: channel.sound,
      vibrationPattern: channel.vibrationPattern,
      lightColor: channel.lightColor,
    });
  }
}

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  trigger?: Notifications.NotificationTriggerInput,
): Promise<string> {
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: trigger || null, // null means show immediately
  });

  return notificationId;
}

/**
 * Cancel a scheduled notification
 */
export async function cancelScheduledNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Set the application badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Get the current application badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Clear the application badge
 */
export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

/**
 * Dismiss all presented notifications
 */
export async function dismissAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}

/**
 * Get all presented notifications
 */
export async function getPresentedNotifications(): Promise<Notifications.Notification[]> {
  return await Notifications.getPresentedNotificationsAsync();
}

/**
 * Default notification channels for Android
 */
export const DEFAULT_NOTIFICATION_CHANNELS: NotificationChannel[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Default notification channel',
    importance: Notifications.AndroidImportance.DEFAULT,
  },
  {
    id: 'high',
    name: 'High Priority',
    description: 'High priority notifications',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  },
  {
    id: 'messages',
    name: 'Messages',
    description: 'Direct messages and replies',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
  },
  {
    id: 'mentions',
    name: 'Mentions',
    description: 'When someone mentions you',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  },
  {
    id: 'likes',
    name: 'Likes & Reposts',
    description: 'When someone likes or reposts your content',
    importance: Notifications.AndroidImportance.LOW,
  },
  {
    id: 'follows',
    name: 'Follows',
    description: 'When someone follows you',
    importance: Notifications.AndroidImportance.DEFAULT,
  },
];
