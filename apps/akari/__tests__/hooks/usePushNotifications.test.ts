import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';

import { useRegisterPushSubscription } from '@/hooks/mutations/useRegisterPushSubscription';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import {
  createNotificationChannels,
  DEFAULT_NOTIFICATION_CHANNELS,
  registerForPushNotifications,
  requestNotificationPermissions,
} from '@/utils/notifications';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(() => '/index'),
  router: { push: jest.fn() },
}));

jest.mock('@/utils/navigation', () => ({
  useNavigateToPost: () =>
    jest.fn(({ actor, rKey }) => {
      const { useRouter } = require('expo-router');
      const { push } = useRouter();
      push(`/(tabs)/index/user-profile/${encodeURIComponent(actor)}/post/${encodeURIComponent(rKey)}`);
    }),
  useNavigateToProfile: () =>
    jest.fn(({ actor }) => {
      const { useRouter } = require('expo-router');
      const { push } = useRouter();
      push(`/(tabs)/index/user-profile/${encodeURIComponent(actor)}`);
    }),
}));

jest.mock('expo-notifications', () => ({
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  getPermissionsAsync: jest.fn(),
  getBadgeCountAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
}));

jest.mock('@/utils/notifications', () => ({
  createNotificationChannels: jest.fn().mockResolvedValue(undefined),
  DEFAULT_NOTIFICATION_CHANNELS: [{ id: 'default', name: 'Default', importance: 3 }],
  registerForPushNotifications: jest.fn(),
  requestNotificationPermissions: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/hooks/mutations/useRegisterPushSubscription', () => ({
  useRegisterPushSubscription: jest.fn(),
}));

const mockUseRouter = useRouter as jest.Mock;
const mockCreateNotificationChannels = createNotificationChannels as jest.Mock;
const mockRegisterForPushNotifications = registerForPushNotifications as jest.Mock;
const mockRequestNotificationPermissions = requestNotificationPermissions as jest.Mock;
const mockUseCurrentAccount = useCurrentAccount as jest.Mock;
const mockUseRegisterPushSubscription = useRegisterPushSubscription as jest.Mock;
let mockRegisterPushSubscription: jest.Mock;
const mockAddNotificationReceivedListener = Notifications.addNotificationReceivedListener as jest.Mock;
const mockAddNotificationResponseReceivedListener = Notifications.addNotificationResponseReceivedListener as jest.Mock;
const mockGetPermissionsAsync = Notifications.getPermissionsAsync as jest.Mock;
const mockGetBadgeCountAsync = Notifications.getBadgeCountAsync as jest.Mock;
const mockSetBadgeCountAsync = Notifications.setBadgeCountAsync as jest.Mock;

const originalOS = Platform.OS;

const createNotificationResponse = (data: Record<string, unknown>) =>
  ({
    notification: {
      request: {
        content: {
          data,
        },
      },
    },
  } as unknown as Notifications.NotificationResponse);

const renderPushNotificationsHook = async () => {
  const rendered = renderHook(() => usePushNotifications());
  await act(async () => {
    await Promise.resolve();
  });
  return rendered;
};

describe('usePushNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: jest.fn() });
    mockAddNotificationReceivedListener.mockReturnValue({ remove: jest.fn() });
    mockAddNotificationResponseReceivedListener.mockReturnValue({ remove: jest.fn() });
    mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
    mockUseCurrentAccount.mockReturnValue({ data: { did: 'did:example:123' } });
    mockRegisterPushSubscription = jest.fn().mockResolvedValue(undefined);
    mockUseRegisterPushSubscription.mockReturnValue({
      mutateAsync: mockRegisterPushSubscription,
    });
    Object.defineProperty(Platform, 'OS', { value: 'android' });
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS });
  });

  it('initializes notification channels on Android', async () => {
    await renderPushNotificationsHook();

    await waitFor(() => {
      expect(mockCreateNotificationChannels).toHaveBeenCalledWith(DEFAULT_NOTIFICATION_CHANNELS);
    });
  });

  it('does not initialize notification channels on non-Android platforms', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });

    await renderPushNotificationsHook();

    expect(mockCreateNotificationChannels).not.toHaveBeenCalled();
  });

  it('logs an error if creating notification channels fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('channels failed');
    mockCreateNotificationChannels.mockRejectedValueOnce(failure);

    await renderPushNotificationsHook();

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to create notification channels:', failure);
    });

    consoleSpy.mockRestore();
  });

  it('requests permissions successfully', async () => {
    mockRequestNotificationPermissions.mockResolvedValue('granted');

    const { result } = await renderPushNotificationsHook();

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.requestPermissions();
    });

    expect(success).toBe(true);
    expect(result.current.permissionStatus).toBe('granted');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles request permission errors', async () => {
    mockRequestNotificationPermissions.mockRejectedValue(new Error('fail'));

    const { result } = await renderPushNotificationsHook();

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.requestPermissions();
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('fail');
    expect(result.current.isLoading).toBe(false);
  });

  it('returns false when permissions are not granted', async () => {
    mockRequestNotificationPermissions.mockResolvedValue('denied');

    const { result } = await renderPushNotificationsHook();

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.requestPermissions();
    });

    expect(success).toBe(false);
    expect(result.current.permissionStatus).toBe('denied');
  });

  it('handles non-Error permission rejections', async () => {
    mockRequestNotificationPermissions.mockRejectedValue('nope');

    const { result } = await renderPushNotificationsHook();

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.requestPermissions();
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Failed to request permissions');
  });

  it('registers for push notifications successfully', async () => {
    mockRegisterForPushNotifications.mockResolvedValue({
      expoPushToken: 'expo-token',
      devicePushToken: 'device-token',
    });

    const { result } = await renderPushNotificationsHook();

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.register();
    });

    expect(success).toBe(true);
    expect(result.current.expoPushToken).toBe('expo-token');
    expect(result.current.devicePushToken).toBe('device-token');
    expect(result.current.error).toBeNull();
    expect(mockRegisterPushSubscription).toHaveBeenCalledWith({
      did: 'did:example:123',
      expoPushToken: 'expo-token',
      devicePushToken: 'device-token',
      platform: 'android',
    });
  });

  it('handles failed registration', async () => {
    mockRegisterForPushNotifications.mockResolvedValue(null);

    const { result } = await renderPushNotificationsHook();

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.register();
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Failed to register for push notifications');
    expect(mockRegisterPushSubscription).not.toHaveBeenCalled();
  });

  it('handles registration errors', async () => {
    mockRegisterForPushNotifications.mockRejectedValue(new Error('boom'));

    const { result } = await renderPushNotificationsHook();

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.register();
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('boom');
  });

  it('handles registry registration errors', async () => {
    mockRegisterForPushNotifications.mockResolvedValue({
      expoPushToken: 'expo-token',
    });
    const failure = new Error('registry failed');
    mockRegisterPushSubscription.mockRejectedValue(failure);

    const { result } = await renderPushNotificationsHook();

    await act(async () => {
      await result.current.register();
    });

    expect(result.current.error).toBe('registry failed');
  });

  it('sets a null device token when not provided', async () => {
    mockRegisterForPushNotifications.mockResolvedValue({
      expoPushToken: 'expo-token',
    });

    const { result } = await renderPushNotificationsHook();

    await act(async () => {
      await result.current.register();
    });

    expect(result.current.devicePushToken).toBeNull();
    expect(mockRegisterPushSubscription).toHaveBeenCalledWith({
      did: 'did:example:123',
      expoPushToken: 'expo-token',
      devicePushToken: undefined,
      platform: 'android',
    });
  });

  it('handles registration errors with non-Error values', async () => {
    mockRegisterForPushNotifications.mockRejectedValue('kaboom');

    const { result } = await renderPushNotificationsHook();

    await act(async () => {
      await result.current.register();
    });

    expect(result.current.error).toBe('Failed to register for push notifications');
  });

  it('initializes push notifications when permissions are granted', async () => {
    mockRequestNotificationPermissions.mockResolvedValue('granted');
    mockRegisterForPushNotifications.mockResolvedValue({
      expoPushToken: 'expo-token',
    });

    const { result } = await renderPushNotificationsHook();

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.initialize();
    });

    expect(success).toBe(true);
    expect(mockRequestNotificationPermissions).toHaveBeenCalled();
    expect(mockRegisterForPushNotifications).toHaveBeenCalled();
    expect(mockRegisterPushSubscription).toHaveBeenCalled();
  });

  it('does not register when permissions are denied', async () => {
    mockRequestNotificationPermissions.mockResolvedValue('denied');

    const { result } = await renderPushNotificationsHook();

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.initialize();
    });

    expect(success).toBe(false);
    expect(mockRegisterForPushNotifications).not.toHaveBeenCalled();
  });

  it('returns false when initialization fails during registration', async () => {
    mockRequestNotificationPermissions.mockResolvedValue('granted');
    mockRegisterForPushNotifications.mockResolvedValue(null);

    const { result } = await renderPushNotificationsHook();

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.initialize();
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Failed to register for push notifications');
  });

  it('sets up notification listeners and cleans them up on unmount', async () => {
    const removeNotification = jest.fn();
    const removeResponse = jest.fn();
    let notificationHandler: (notification: Notifications.Notification) => void = () => {};
    let responseHandler: (response: Notifications.NotificationResponse) => void = () => {};

    mockAddNotificationReceivedListener.mockImplementation((handler) => {
      notificationHandler = handler;
      return { remove: removeNotification };
    });
    mockAddNotificationResponseReceivedListener.mockImplementation((handler) => {
      responseHandler = handler;
      return { remove: removeResponse };
    });

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const { unmount } = await renderPushNotificationsHook();

    await waitFor(() => {
      expect(mockAddNotificationReceivedListener).toHaveBeenCalled();
      expect(mockAddNotificationResponseReceivedListener).toHaveBeenCalled();
    });

    act(() => {
      notificationHandler({} as Notifications.Notification);
      responseHandler(createNotificationResponse({}));
    });

    expect(consoleSpy).toHaveBeenCalledWith('Notification received:', expect.any(Object));
    expect(consoleSpy).toHaveBeenCalledWith(
      'Notification response:',
      expect.objectContaining({ notification: expect.any(Object) }),
    );

    unmount();

    expect(removeNotification).toHaveBeenCalled();
    expect(removeResponse).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('cleans up safely when listeners are not registered', async () => {
    mockAddNotificationReceivedListener.mockImplementation(() => null);
    mockAddNotificationResponseReceivedListener.mockImplementation(() => null);

    const { unmount } = await renderPushNotificationsHook();

    expect(() => {
      unmount();
    }).not.toThrow();
  });

  it('navigates to the correct route based on notification type', async () => {
    const push = jest.fn();
    mockUseRouter.mockReturnValue({ push });

    let responseHandler: (response: Notifications.NotificationResponse) => void = () => {};
    mockAddNotificationResponseReceivedListener.mockImplementation((handler) => {
      responseHandler = handler;
      return { remove: jest.fn() };
    });

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await renderPushNotificationsHook();

    await waitFor(() => {
      expect(mockAddNotificationResponseReceivedListener).toHaveBeenCalled();
    });

    const scenarios = [
      { type: 'post', id: 'abc def', expected: '/(tabs)/index/user-profile/undefined/post/abc%20def' },
      { type: 'profile', id: 'user', expected: '/(tabs)/index/user-profile/user' },
      { type: 'conversation', id: '42', expected: '/messages/42' },
      { type: 'notification', id: 'any', expected: '/notifications' },
      { type: 'unknown', id: '??', expected: '/notifications' },
    ];

    for (const scenario of scenarios) {
      act(() => {
        responseHandler(
          createNotificationResponse({
            type: scenario.type,
            id: scenario.id,
          }),
        );
      });

      expect(push).toHaveBeenLastCalledWith(scenario.expected);
    }

    consoleSpy.mockRestore();
  });

  it('ignores notification responses without both type and id', async () => {
    const push = jest.fn();
    mockUseRouter.mockReturnValue({ push });

    let responseHandler: (response: Notifications.NotificationResponse) => void = () => {};
    mockAddNotificationResponseReceivedListener.mockImplementation((handler) => {
      responseHandler = handler;
      return { remove: jest.fn() };
    });

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await renderPushNotificationsHook();

    await waitFor(() => {
      expect(mockAddNotificationResponseReceivedListener).toHaveBeenCalled();
    });

    act(() => {
      responseHandler(createNotificationResponse({ type: 'post' }));
    });

    expect(push).not.toHaveBeenCalled();

    act(() => {
      responseHandler(createNotificationResponse({ id: '123' }));
    });

    expect(push).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('checks permission status', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'denied' });

    const { result } = await renderPushNotificationsHook();

    await act(async () => {
      await result.current.checkPermissionStatus();
    });

    expect(result.current.permissionStatus).toBe('denied');
  });

  it('handles permission status errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('status failed');
    mockGetPermissionsAsync.mockRejectedValue(failure);

    const { result } = await renderPushNotificationsHook();

    await act(async () => {
      await result.current.checkPermissionStatus();
    });

    expect(consoleSpy).toHaveBeenCalledWith('Failed to check permission status:', failure);
    consoleSpy.mockRestore();
  });

  it('returns badge count', async () => {
    mockGetBadgeCountAsync.mockResolvedValue(3);

    const { result } = await renderPushNotificationsHook();

    let count = 0;
    await act(async () => {
      count = await result.current.getBadgeCount();
    });

    expect(count).toBe(3);
  });

  it('handles badge count errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetBadgeCountAsync.mockRejectedValue(new Error('fail'));

    const { result } = await renderPushNotificationsHook();

    let count = 0;
    await act(async () => {
      count = await result.current.getBadgeCount();
    });

    expect(count).toBe(0);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('sets badge count', async () => {
    mockSetBadgeCountAsync.mockResolvedValue(undefined);

    const { result } = await renderPushNotificationsHook();

    await act(async () => {
      await result.current.setBadgeCount(5);
    });

    expect(mockSetBadgeCountAsync).toHaveBeenCalledWith(5);
  });

  it('handles set badge count errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSetBadgeCountAsync.mockRejectedValue(new Error('fail'));

    const { result } = await renderPushNotificationsHook();

    await act(async () => {
      await result.current.setBadgeCount(5);
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('handles clear badge errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSetBadgeCountAsync.mockRejectedValue(new Error('clear failed'));

    const { result } = await renderPushNotificationsHook();

    await expect(
      act(async () => {
        await result.current.clearBadge();
      }),
    ).rejects.toThrow('clear failed');

    expect(consoleSpy).toHaveBeenCalledWith('Failed to clear badge:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('clears badge', async () => {
    mockSetBadgeCountAsync.mockResolvedValue(undefined);

    const { result } = await renderPushNotificationsHook();

    await act(async () => {
      await result.current.clearBadge();
    });

    expect(mockSetBadgeCountAsync).toHaveBeenCalledWith(0);
  });

  it('disables push notification features on web', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web' });

    const { result } = await renderPushNotificationsHook();

    expect(result.current.error).toBe('Push notifications are not supported on web');
    expect(mockAddNotificationReceivedListener).not.toHaveBeenCalled();
    expect(mockAddNotificationResponseReceivedListener).not.toHaveBeenCalled();
    expect(mockGetPermissionsAsync).not.toHaveBeenCalled();

    let permissionGranted = true;
    await act(async () => {
      permissionGranted = await result.current.requestPermissions();
    });

    expect(permissionGranted).toBe(false);
    expect(mockRequestNotificationPermissions).not.toHaveBeenCalled();

    let registrationResult = true;
    await act(async () => {
      registrationResult = await result.current.register();
    });

    expect(registrationResult).toBe(false);
    expect(mockRegisterForPushNotifications).not.toHaveBeenCalled();

    let initialized = true;
    await act(async () => {
      initialized = await result.current.initialize();
    });

    expect(initialized).toBe(false);

    await act(async () => {
      await result.current.checkPermissionStatus();
    });

    expect(mockGetPermissionsAsync).not.toHaveBeenCalled();

    let badgeCount = -1;
    await act(async () => {
      badgeCount = await result.current.getBadgeCount();
    });

    expect(badgeCount).toBe(0);
    expect(mockGetBadgeCountAsync).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.setBadgeCount(5);
    });

    expect(mockSetBadgeCountAsync).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.clearBadge();
    });

    expect(mockSetBadgeCountAsync).not.toHaveBeenCalled();
  });
});
