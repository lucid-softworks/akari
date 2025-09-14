import type { NotificationChannel } from '@/utils/notifications';

const mockSetBadgeCountAsync = jest.fn();
const mockGetBadgeCountAsync = jest.fn();
const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockGetExpoPushTokenAsync = jest.fn();
const mockGetDevicePushTokenAsync = jest.fn();
const mockSetNotificationChannelAsync = jest.fn();
const mockScheduleNotificationAsync = jest.fn();
const mockCancelScheduledNotificationAsync = jest.fn();
const mockCancelAllScheduledNotificationsAsync = jest.fn();
const mockGetAllScheduledNotificationsAsync = jest.fn();
const mockDismissAllNotificationsAsync = jest.fn();
const mockGetPresentedNotificationsAsync = jest.fn();

const mockConstants = {
  expoConfig: { extra: { eas: { projectId: 'test-project' } } },
  easConfig: { projectId: 'test-project' },
};

let mockIsDevice = true;

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: mockGetPermissionsAsync,
  requestPermissionsAsync: mockRequestPermissionsAsync,
  getExpoPushTokenAsync: mockGetExpoPushTokenAsync,
  getDevicePushTokenAsync: mockGetDevicePushTokenAsync,
  setNotificationChannelAsync: mockSetNotificationChannelAsync,
  scheduleNotificationAsync: mockScheduleNotificationAsync,
  cancelScheduledNotificationAsync: mockCancelScheduledNotificationAsync,
  cancelAllScheduledNotificationsAsync: mockCancelAllScheduledNotificationsAsync,
  getAllScheduledNotificationsAsync: mockGetAllScheduledNotificationsAsync,
  setBadgeCountAsync: mockSetBadgeCountAsync,
  getBadgeCountAsync: mockGetBadgeCountAsync,
  dismissAllNotificationsAsync: mockDismissAllNotificationsAsync,
  getPresentedNotificationsAsync: mockGetPresentedNotificationsAsync,
  AndroidImportance: { DEFAULT: 'default', HIGH: 'high', LOW: 'low' },
}));

jest.mock('expo-device', () => ({
  get isDevice() {
    return mockIsDevice;
  },
  __setIsDevice(value: boolean) {
    mockIsDevice = value;
  },
}));
jest.mock('expo-constants', () => mockConstants);
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

describe('notifications utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const Device = require('expo-device');
    Device.__setIsDevice(true);
    const { Platform } = require('react-native');
    Platform.OS = 'ios';
    mockConstants.expoConfig.extra.eas.projectId = 'test-project';
    mockConstants.easConfig.projectId = 'test-project';
  });

  it('sets badge count', async () => {
    const { setBadgeCount } = require('@/utils/notifications');
    await setBadgeCount(5);
    expect(mockSetBadgeCountAsync).toHaveBeenCalledWith(5);
  });

  it('gets badge count', async () => {
    mockGetBadgeCountAsync.mockResolvedValueOnce(7);
    const { getBadgeCount } = require('@/utils/notifications');
    const count = await getBadgeCount();
    expect(mockGetBadgeCountAsync).toHaveBeenCalled();
    expect(count).toBe(7);
  });

  it('clears badge', async () => {
    const { clearBadge } = require('@/utils/notifications');
    await clearBadge();
    expect(mockSetBadgeCountAsync).toHaveBeenCalledWith(0);
  });

  describe('requestNotificationPermissions', () => {
    it('throws when not on a physical device', async () => {
      const Device = require('expo-device');
      Device.__setIsDevice(false);
      const { requestNotificationPermissions } = require('@/utils/notifications');
      await expect(requestNotificationPermissions()).rejects.toThrow(
        'Push notifications are only supported on physical devices',
      );
    });

    it('returns existing status when already granted', async () => {
      mockGetPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
      const { requestNotificationPermissions } = require('@/utils/notifications');
      const status = await requestNotificationPermissions();
      expect(status).toBe('granted');
      expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('requests permission when not granted', async () => {
      mockGetPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
      mockRequestPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
      const { requestNotificationPermissions } = require('@/utils/notifications');
      const status = await requestNotificationPermissions();
      expect(mockRequestPermissionsAsync).toHaveBeenCalled();
      expect(status).toBe('granted');
    });
  });

  describe('registerForPushNotifications', () => {
    it('returns null when not a device', async () => {
      const Device = require('expo-device');
      Device.__setIsDevice(false);
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const { registerForPushNotifications } = require('@/utils/notifications');
      const result = await registerForPushNotifications();
      expect(logSpy).toHaveBeenCalledWith('Push notifications are only supported on physical devices');
      expect(result).toBeNull();
      logSpy.mockRestore();
    });

    it('returns null when permission is denied', async () => {
      mockGetPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
      mockRequestPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const { registerForPushNotifications } = require('@/utils/notifications');
      const result = await registerForPushNotifications();
      expect(logSpy).toHaveBeenCalledWith('Failed to get push token for push notification!');
      expect(result).toBeNull();
      logSpy.mockRestore();
    });

    it('returns tokens on android when granted', async () => {
      mockGetPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
      const { Platform } = require('react-native');
      Platform.OS = 'android';
      mockGetExpoPushTokenAsync.mockResolvedValueOnce({ data: 'expo-token' });
      mockGetDevicePushTokenAsync.mockResolvedValueOnce({ data: 'device-token' });
      const { registerForPushNotifications } = require('@/utils/notifications');
      const result = await registerForPushNotifications();
      expect(mockGetExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'test-project' });
      expect(mockGetDevicePushTokenAsync).toHaveBeenCalled();
      expect(result).toEqual({ expoPushToken: 'expo-token', devicePushToken: 'device-token' });
    });

    it('returns null when project id is missing', async () => {
      mockGetPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
      mockConstants.expoConfig.extra.eas.projectId = undefined;
      mockConstants.easConfig.projectId = undefined;
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { registerForPushNotifications } = require('@/utils/notifications');
      const result = await registerForPushNotifications();
      expect(errorSpy).toHaveBeenCalled();
      expect(result).toBeNull();
      errorSpy.mockRestore();
    });
  });

  describe('createNotificationChannels', () => {
    it('does nothing on non-android', async () => {
      const channels: NotificationChannel[] = [
        { id: '1', name: 'test', importance: 'high' as any },
      ];
      const { createNotificationChannels } = require('@/utils/notifications');
      await createNotificationChannels(channels);
      expect(mockSetNotificationChannelAsync).not.toHaveBeenCalled();
    });

    it('creates channels on android', async () => {
      const { Platform } = require('react-native');
      Platform.OS = 'android';
      const channels: NotificationChannel[] = [
        { id: '1', name: 'c1', importance: 'high' as any },
        { id: '2', name: 'c2', importance: 'default' as any },
      ];
      const { createNotificationChannels } = require('@/utils/notifications');
      await createNotificationChannels(channels);
      expect(mockSetNotificationChannelAsync).toHaveBeenCalledTimes(2);
      for (const channel of channels) {
        expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith(
          channel.id,
          expect.objectContaining({ name: channel.name }),
        );
      }
    });
  });

  it('schedules a local notification', async () => {
    mockScheduleNotificationAsync.mockResolvedValueOnce('id-1');
    const { scheduleLocalNotification } = require('@/utils/notifications');
    const id = await scheduleLocalNotification('Title', 'Body');
    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith({
      content: { title: 'Title', body: 'Body', data: undefined, sound: true },
      trigger: null,
    });
    expect(id).toBe('id-1');
  });

  it('cancels a scheduled notification', async () => {
    const { cancelScheduledNotification } = require('@/utils/notifications');
    await cancelScheduledNotification('abc');
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith('abc');
  });

  it('cancels all scheduled notifications', async () => {
    const { cancelAllScheduledNotifications } = require('@/utils/notifications');
    await cancelAllScheduledNotifications();
    expect(mockCancelAllScheduledNotificationsAsync).toHaveBeenCalled();
  });

  it('gets scheduled notifications', async () => {
    const scheduled = [{ id: '1' }];
    mockGetAllScheduledNotificationsAsync.mockResolvedValueOnce(scheduled as any);
    const { getScheduledNotifications } = require('@/utils/notifications');
    const result = await getScheduledNotifications();
    expect(mockGetAllScheduledNotificationsAsync).toHaveBeenCalled();
    expect(result).toEqual(scheduled);
  });

  it('dismisses all notifications', async () => {
    const { dismissAllNotifications } = require('@/utils/notifications');
    await dismissAllNotifications();
    expect(mockDismissAllNotificationsAsync).toHaveBeenCalled();
  });

  it('gets presented notifications', async () => {
    const presented = [{ id: 'p1' }];
    mockGetPresentedNotificationsAsync.mockResolvedValueOnce(presented as any);
    const { getPresentedNotifications } = require('@/utils/notifications');
    const result = await getPresentedNotifications();
    expect(mockGetPresentedNotificationsAsync).toHaveBeenCalled();
    expect(result).toBe(presented);
  });
});

