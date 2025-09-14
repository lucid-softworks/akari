import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

import { usePushNotifications } from '@/hooks/usePushNotifications';
import {
  createNotificationChannels,
  DEFAULT_NOTIFICATION_CHANNELS,
  registerForPushNotifications,
  requestNotificationPermissions,
} from '@/utils/notifications';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
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

const mockUseRouter = useRouter as jest.Mock;
const mockCreateNotificationChannels = createNotificationChannels as jest.Mock;
const mockRegisterForPushNotifications = registerForPushNotifications as jest.Mock;
const mockRequestNotificationPermissions = requestNotificationPermissions as jest.Mock;
const mockAddNotificationReceivedListener = Notifications.addNotificationReceivedListener as jest.Mock;
const mockAddNotificationResponseReceivedListener = Notifications.addNotificationResponseReceivedListener as jest.Mock;
const mockGetPermissionsAsync = Notifications.getPermissionsAsync as jest.Mock;
const mockGetBadgeCountAsync = Notifications.getBadgeCountAsync as jest.Mock;
const mockSetBadgeCountAsync = Notifications.setBadgeCountAsync as jest.Mock;

const originalOS = Platform.OS;

describe('usePushNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: jest.fn() });
    mockAddNotificationReceivedListener.mockReturnValue({ remove: jest.fn() });
    mockAddNotificationResponseReceivedListener.mockReturnValue({ remove: jest.fn() });
    Object.defineProperty(Platform, 'OS', { value: 'android' });
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS });
  });

  it('initializes notification channels on Android', async () => {
    renderHook(() => usePushNotifications());

    await waitFor(() => {
      expect(mockCreateNotificationChannels).toHaveBeenCalledWith(
        DEFAULT_NOTIFICATION_CHANNELS,
      );
    });
  });

  it('requests permissions successfully', async () => {
    mockRequestNotificationPermissions.mockResolvedValue('granted');

    const { result } = renderHook(() => usePushNotifications());

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

    const { result } = renderHook(() => usePushNotifications());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.requestPermissions();
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('fail');
    expect(result.current.isLoading).toBe(false);
  });

  it('registers for push notifications successfully', async () => {
    mockRegisterForPushNotifications.mockResolvedValue({
      expoPushToken: 'expo-token',
      devicePushToken: 'device-token',
    });

    const { result } = renderHook(() => usePushNotifications());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.register();
    });

    expect(success).toBe(true);
    expect(result.current.expoPushToken).toBe('expo-token');
    expect(result.current.devicePushToken).toBe('device-token');
    expect(result.current.error).toBeNull();
  });

  it('handles failed registration', async () => {
    mockRegisterForPushNotifications.mockResolvedValue(null);

    const { result } = renderHook(() => usePushNotifications());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.register();
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Failed to register for push notifications');
  });

  it('handles registration errors', async () => {
    mockRegisterForPushNotifications.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => usePushNotifications());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.register();
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('boom');
  });

  it('initializes push notifications when permissions are granted', async () => {
    mockRequestNotificationPermissions.mockResolvedValue('granted');
    mockRegisterForPushNotifications.mockResolvedValue({
      expoPushToken: 'expo-token',
    });

    const { result } = renderHook(() => usePushNotifications());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.initialize();
    });

    expect(success).toBe(true);
    expect(mockRequestNotificationPermissions).toHaveBeenCalled();
    expect(mockRegisterForPushNotifications).toHaveBeenCalled();
  });

  it('does not register when permissions are denied', async () => {
    mockRequestNotificationPermissions.mockResolvedValue('denied');

    const { result } = renderHook(() => usePushNotifications());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.initialize();
    });

    expect(success).toBe(false);
    expect(mockRegisterForPushNotifications).not.toHaveBeenCalled();
  });

  it('checks permission status', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'denied' });

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.checkPermissionStatus();
    });

    expect(result.current.permissionStatus).toBe('denied');
  });

  it('returns badge count', async () => {
    mockGetBadgeCountAsync.mockResolvedValue(3);

    const { result } = renderHook(() => usePushNotifications());

    let count = 0;
    await act(async () => {
      count = await result.current.getBadgeCount();
    });

    expect(count).toBe(3);
  });

  it('handles badge count errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetBadgeCountAsync.mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => usePushNotifications());

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

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.setBadgeCount(5);
    });

    expect(mockSetBadgeCountAsync).toHaveBeenCalledWith(5);
  });

  it('handles set badge count errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSetBadgeCountAsync.mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.setBadgeCount(5);
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('clears badge', async () => {
    mockSetBadgeCountAsync.mockResolvedValue(undefined);

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.clearBadge();
    });

    expect(mockSetBadgeCountAsync).toHaveBeenCalledWith(0);
  });
});
