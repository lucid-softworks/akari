import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { useRegisterPushSubscription } from '@/hooks/mutations/useRegisterPushSubscription';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useNavigateToPost } from '@/utils/navigation';
import {
  createNotificationChannels,
  DEFAULT_NOTIFICATION_CHANNELS,
  registerForPushNotifications,
  requestNotificationPermissions,
} from '@/utils/notifications';

export type PushNotificationState = {
  expoPushToken: string | null;
  devicePushToken: string | null;
  permissionStatus: Notifications.PermissionStatus | null;
  isLoading: boolean;
  error: string | null;
};

export function usePushNotifications() {
  const router = useRouter();
  const { data: currentAccount } = useCurrentAccount();
  const navigateToPost = useNavigateToPost();
  const registerPushSubscriptionMutation = useRegisterPushSubscription();
  const [state, setState] = useState<PushNotificationState>({
    expoPushToken: null,
    devicePushToken: null,
    permissionStatus: null,
    isLoading: false,
    error: null,
  });

  const notificationListener = useRef<Notifications.Subscription>(null);
  const responseListener = useRef<Notifications.Subscription>(null);

  // Initialize notification channels for Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      createNotificationChannels(DEFAULT_NOTIFICATION_CHANNELS).catch((error) => {
        console.error('Failed to create notification channels:', error);
      });
    }
  }, []);

  // Set up notification listeners
  useEffect(() => {
    // Handle navigation based on notification type
    const handleNotificationNavigation = (type: string, id: string) => {
      switch (type) {
        case 'post':
          // Navigate to post in index tab (default for push notifications)
          const uriParts = id.split('/');
          const rKey = uriParts[uriParts.length - 1];
          const actor = uriParts[2]; // Extract actor from AT URI
          navigateToPost({ actor, rKey });
          break;
        case 'profile':
          router.push(`/profile/${encodeURIComponent(id)}`);
          break;
        case 'conversation':
          router.push(`/messages/${encodeURIComponent(id)}`);
          break;
        case 'notification':
          router.push('/notifications');
          break;
        default:
          // Default to notifications screen
          router.push('/notifications');
      }
    };

    // Listen for incoming notifications when app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
      // You can handle foreground notifications here
      // For example, update badge count, show in-app notification, etc.
    });

    // Listen for user interaction with notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response:', response);

      // Handle deep linking based on notification data
      const data = response.notification.request.content.data;
      if (data?.type && data?.id) {
        handleNotificationNavigation(data.type as string, data.id as string);
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [navigateToPost, router]);

  // Request notification permissions
  const requestPermissions = async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const permissionStatus = await requestNotificationPermissions();
      setState((prev) => ({ ...prev, permissionStatus, isLoading: false }));
      return permissionStatus === 'granted';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to request permissions';
      setState((prev) => ({ ...prev, error: errorMessage, isLoading: false }));
      return false;
    }
  };

  // Register for push notifications
  const register = async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const tokens = await registerForPushNotifications();
      if (tokens) {
        if (!currentAccount?.did) {
          console.error('Cannot register push notifications without a current account.');
          throw new Error('Failed to register for push notifications');
        }

        await registerPushSubscriptionMutation.mutateAsync({
          did: currentAccount.did,
          expoPushToken: tokens.expoPushToken,
          devicePushToken: tokens.devicePushToken,
          platform: Platform.OS,
        });

        setState((prev) => ({
          ...prev,
          expoPushToken: tokens.expoPushToken,
          devicePushToken: tokens.devicePushToken || null,
          isLoading: false,
        }));
        return true;
      } else {
        setState((prev) => ({ ...prev, error: 'Failed to register for push notifications', isLoading: false }));
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to register for push notifications';
      setState((prev) => ({ ...prev, error: errorMessage, isLoading: false }));
      return false;
    }
  };

  // Initialize push notifications (request permissions and register)
  const initialize = async (): Promise<boolean> => {
    const hasPermission = await requestPermissions();
    if (hasPermission) {
      return await register();
    }
    return false;
  };

  // Check current permission status
  const checkPermissionStatus = async (): Promise<void> => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setState((prev) => ({ ...prev, permissionStatus: status }));
    } catch (error) {
      console.error('Failed to check permission status:', error);
    }
  };

  // Get current badge count
  const getBadgeCount = async (): Promise<number> => {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Failed to get badge count:', error);
      return 0;
    }
  };

  // Set badge count
  const setBadgeCount = async (count: number): Promise<void> => {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Failed to set badge count:', error);
    }
  };

  // Clear badge
  const clearBadge = async (): Promise<void> => {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Failed to clear badge:', error);
      throw error;
    }
  };

  // Check permission status on mount
  useEffect(() => {
    checkPermissionStatus();
  }, []);

  return {
    ...state,
    requestPermissions,
    register,
    initialize,
    checkPermissionStatus,
    getBadgeCount,
    setBadgeCount,
    clearBadge,
  };
}
