
import { Alert, Platform } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';

import { NotificationSettings } from '@/components/NotificationSettings';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

jest.mock('@/hooks/usePushNotifications');
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');
jest.mock('@/components/ui/IconSymbol', () => ({ IconSymbol: () => null }));
jest.mock('@/components/NotificationTest', () => ({ NotificationTest: () => null }));

const mockUsePushNotifications = usePushNotifications as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;

const originalOS = Platform.OS;
const originalDev = (global as any).__DEV__;

describe('NotificationSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColor.mockReturnValue('#000');
    mockUseTranslation.mockReturnValue({ t: (key: string) => key });
    Object.defineProperty(Platform, 'OS', { value: originalOS });
    (global as any).__DEV__ = originalDev ?? false;
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS });
    (global as any).__DEV__ = originalDev;
  });

  it('enables push notifications successfully', async () => {
    const initialize = jest.fn().mockResolvedValue(true);
    const onSettingsChange = jest.fn();
    mockUsePushNotifications.mockReturnValue({
      permissionStatus: 'denied',
      expoPushToken: null,
      isLoading: false,
      error: null,
      initialize,
      clearBadge: jest.fn(),
    });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getAllByRole } = render(
      <NotificationSettings onSettingsChange={onSettingsChange} />,
    );
    const toggle = getAllByRole('switch')[0];
    await act(async () => {
      fireEvent(toggle, 'valueChange', true);
    });

    expect(initialize).toHaveBeenCalled();
    expect(onSettingsChange).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'notifications.permissionsGranted',
      'notifications.youWillReceiveNotifications',
      [{ text: 'OK' }],
    );
  });

  it('disables push notifications', async () => {
    const initialize = jest.fn();
    const onSettingsChange = jest.fn();
    mockUsePushNotifications.mockReturnValue({
      permissionStatus: 'granted',
      expoPushToken: null,
      isLoading: false,
      error: null,
      initialize,
      clearBadge: jest.fn(),
    });

    const { getAllByRole } = render(
      <NotificationSettings onSettingsChange={onSettingsChange} />,
    );
    const toggle = getAllByRole('switch')[0];
    await act(async () => {
      fireEvent(toggle, 'valueChange', false);
    });

    expect(initialize).not.toHaveBeenCalled();
    expect(onSettingsChange).toHaveBeenCalled();
  });

  it('prompts to open settings on initialization failure (iOS)', async () => {
    const initialize = jest.fn().mockResolvedValue(false);
    mockUsePushNotifications.mockReturnValue({
      permissionStatus: 'denied',
      expoPushToken: null,
      isLoading: false,
      error: null,
      initialize,
      clearBadge: jest.fn(),
    });
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getAllByRole } = render(<NotificationSettings />);
    const toggle = getAllByRole('switch')[0];
    await act(async () => {
      fireEvent(toggle, 'valueChange', true);
    });

    const settingsButton = alertSpy.mock.calls[0][2][1];
    act(() => settingsButton.onPress());

    expect(alertSpy.mock.calls[1][0]).toBe('notifications.openSettings');
    expect(alertSpy.mock.calls[1][1]).toBe(
      'notifications.iosSettingsInstructions',
    );
  });

  it('prompts to open settings on initialization failure (Android)', async () => {
    const initialize = jest.fn().mockResolvedValue(false);
    mockUsePushNotifications.mockReturnValue({
      permissionStatus: 'denied',
      expoPushToken: null,
      isLoading: false,
      error: null,
      initialize,
      clearBadge: jest.fn(),
    });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getAllByRole } = render(<NotificationSettings />);
    const toggle = getAllByRole('switch')[0];
    await act(async () => {
      fireEvent(toggle, 'valueChange', true);
    });

    const settingsButton = alertSpy.mock.calls[0][2][1];
    Object.defineProperty(Platform, 'OS', { value: 'android' });
    act(() => settingsButton.onPress());

    expect(alertSpy.mock.calls[1][1]).toBe(
      'notifications.androidSettingsInstructions',
    );
  });

  it('handles initialization errors', async () => {
    const initialize = jest.fn().mockRejectedValue(new Error('fail'));
    mockUsePushNotifications.mockReturnValue({
      permissionStatus: 'denied',
      expoPushToken: null,
      isLoading: false,
      error: null,
      initialize,
      clearBadge: jest.fn(),
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getAllByRole } = render(<NotificationSettings />);
    const toggle = getAllByRole('switch')[0];
    await act(async () => {
      fireEvent(toggle, 'valueChange', true);
    });

    expect(consoleSpy).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'notifications.error',
      'notifications.failedToEnable',
      [{ text: 'OK' }],
    );
  });

  it('toggles individual notification settings', () => {
    const onSettingsChange = jest.fn();
    mockUsePushNotifications.mockReturnValue({
      permissionStatus: 'granted',
      expoPushToken: null,
      isLoading: false,
      error: null,
      initialize: jest.fn(),
      clearBadge: jest.fn(),
    });

    const { getAllByRole } = render(
      <NotificationSettings onSettingsChange={onSettingsChange} />,
    );
    const toggles = getAllByRole('switch');
    act(() => {
      fireEvent(toggles[1], 'valueChange', false);
      fireEvent(toggles[2], 'valueChange', false);
      fireEvent(toggles[3], 'valueChange', false);
    });

    expect(onSettingsChange).toHaveBeenCalledTimes(3);
  });

  it('clears badge when action pressed', async () => {
    const clearBadge = jest.fn().mockResolvedValue(undefined);
    mockUsePushNotifications.mockReturnValue({
      permissionStatus: 'granted',
      expoPushToken: null,
      isLoading: false,
      error: null,
      initialize: jest.fn(),
      clearBadge,
    });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getByText } = render(<NotificationSettings />);
    const button = getByText('notifications.clearBadge');
    await act(async () => {
      fireEvent.press(button);
    });

    expect(clearBadge).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'notifications.badgeCleared',
      'notifications.badgeClearedMessage',
      [{ text: 'OK' }],
    );
  });

  it('handles clear badge errors', async () => {
    const clearBadge = jest.fn().mockRejectedValue(new Error('fail'));
    mockUsePushNotifications.mockReturnValue({
      permissionStatus: 'granted',
      expoPushToken: null,
      isLoading: false,
      error: null,
      initialize: jest.fn(),
      clearBadge,
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { getByText } = render(<NotificationSettings />);
    const button = getByText('notifications.clearBadge');
    await act(async () => {
      fireEvent.press(button);
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to clear badge:',
      expect.any(Error),
    );
  });

  it.each([
    ['granted', 'notifications.permissionGranted'],
    ['denied', 'notifications.permissionDenied'],
    ['undetermined', 'notifications.permissionUndetermined'],
    ['unknown', 'notifications.permissionUnknown'],
  ])('shows correct status text for %s', (status, expected) => {
    mockUsePushNotifications.mockReturnValue({
      permissionStatus: status,
      expoPushToken: null,
      isLoading: false,
      error: null,
      initialize: jest.fn(),
      clearBadge: jest.fn(),
    });

    const { getByText } = render(<NotificationSettings />);
    expect(getByText(expected)).toBeTruthy();
  });

  it('renders expo push token and error message', () => {
    (global as any).__DEV__ = true;
    mockUsePushNotifications.mockReturnValue({
      permissionStatus: 'granted',
      expoPushToken: 'token-123',
      isLoading: false,
      error: 'boom',
      initialize: jest.fn(),
      clearBadge: jest.fn(),
    });

    const { getByText } = render(<NotificationSettings />);
    expect(getByText('token-123')).toBeTruthy();
    expect(getByText('boom')).toBeTruthy();
  });
});
