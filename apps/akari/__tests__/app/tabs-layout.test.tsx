import { act, render } from '@testing-library/react-native';
import React from 'react';
import TabLayout from '@/app/(tabs)/_layout';
import { ActivityIndicator } from 'react-native';

import { useAuthStatus } from '@/hooks/queries/useAuthStatus';
import { useUnreadMessagesCount } from '@/hooks/queries/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '@/hooks/queries/useUnreadNotificationsCount';
import { useResponsive } from '@/hooks/useResponsive';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';

jest.mock('expo-router', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Tabs = jest.fn(({ children }: { children: React.ReactNode }) => <>{children}</>);
  const Screen = jest.fn(() => null);
  // @ts-ignore
  Tabs.Screen = Screen;
  const Redirect = ({ href }: { href: string }) => <Text>redirect:{href}</Text>;
  return { Tabs, Redirect };
});

jest.mock('@/hooks/queries/useAuthStatus');
jest.mock('@/hooks/queries/useUnreadMessagesCount');
jest.mock('@/hooks/queries/useUnreadNotificationsCount');
jest.mock('@/hooks/useResponsive');
jest.mock('@/hooks/useBorderColor');
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/usePushNotifications');

jest.mock('@/components/AccountSwitcherSheet', () => {
  const React = require('react');
  return { AccountSwitcherSheet: jest.fn(() => null) };
});

jest.mock('@/components/Sidebar', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Sidebar: () => <Text>Sidebar</Text> };
});

jest.mock('@/components/ThemedView', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { ThemedView: ({ children, ...props }: any) => <View {...props}>{children}</View> };
});

jest.mock('@/components/CustomTabBar', () => {
  const React = require('react');
  return { CustomTabBar: jest.fn(() => null) };
});

const mockUseAuthStatus = useAuthStatus as jest.Mock;
const mockUseUnreadMessagesCount = useUnreadMessagesCount as jest.Mock;
const mockUseUnreadNotificationsCount = useUnreadNotificationsCount as jest.Mock;
const mockUseResponsive = useResponsive as jest.Mock;
const mockUseBorderColor = useBorderColor as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;
const { AccountSwitcherSheet } = require('@/components/AccountSwitcherSheet');
const mockAccountSwitcherSheet = AccountSwitcherSheet as jest.Mock;
const { CustomTabBar } = require('@/components/CustomTabBar');
const mockCustomTabBar = CustomTabBar as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseUnreadMessagesCount.mockReturnValue({ data: 0 });
  mockUseUnreadNotificationsCount.mockReturnValue({ data: 0 });
  mockUseResponsive.mockReturnValue({ isLargeScreen: false });
  mockUseBorderColor.mockReturnValue('#ccc');
  mockUseThemeColor.mockImplementation(
    (props: { light?: string; dark?: string }) => props?.light ?? props?.dark ?? '#000',
  );
  mockAccountSwitcherSheet.mockClear();
});

describe('TabLayout', () => {
  it('shows loading indicator while auth status is loading', () => {
    mockUseAuthStatus.mockReturnValue({ data: null, isLoading: true });
    const { UNSAFE_getByType } = render(<TabLayout />);
    const indicator = UNSAFE_getByType(ActivityIndicator);
    expect(indicator).toBeTruthy();
    expect(indicator.props.color).toBe('#7C8CF9');
  });

  it('redirects to signin when not authenticated', () => {
    mockUseAuthStatus.mockReturnValue({ data: { isAuthenticated: false }, isLoading: false });
    const { getByText } = render(<TabLayout />);
    expect(getByText('redirect:/(auth)/signin')).toBeTruthy();
  });

  it('renders large screen layout with sidebar', () => {
    mockUseAuthStatus.mockReturnValue({ data: { isAuthenticated: true }, isLoading: false });
    mockUseResponsive.mockReturnValue({ isLargeScreen: true });
    const { getByText } = render(<TabLayout />);
    expect(getByText('Sidebar')).toBeTruthy();
    const { Tabs } = require('expo-router');
    expect(Tabs.mock.calls[0][0].screenOptions).toEqual({
      headerShown: false,
      tabBarStyle: { display: 'none' },
    });
    const screenCalls = (require('expo-router').Tabs.Screen as jest.Mock).mock.calls;
    const visibleNames = screenCalls.map((call: any[]) => call[0].name);
    expect(screenCalls).toHaveLength(6);
    expect(visibleNames).toEqual(['index', 'search', 'messages', 'notifications', 'profile', 'settings']);
  });

  it('renders mobile tabs with badges', () => {
    mockUseAuthStatus.mockReturnValue({ data: { isAuthenticated: true }, isLoading: false });
    mockUseResponsive.mockReturnValue({ isLargeScreen: false });
    mockUseUnreadMessagesCount.mockReturnValue({ data: 2 });
    mockUseUnreadNotificationsCount.mockReturnValue({ data: 3 });
    render(<TabLayout />);
    const TabsModule = require('expo-router');
    const tabOptions = TabsModule.Tabs.mock.calls[0][0];
    expect(typeof tabOptions.tabBar).toBe('function');
    const tabBarProps = {
      state: { index: 0, routes: [{ key: 'index', name: 'index' }] },
      navigation: { emit: jest.fn(), navigate: jest.fn() },
      descriptors: {},
    } as any;
    act(() => {
      tabOptions.tabBar?.(tabBarProps);
    });
    expect(mockCustomTabBar).toHaveBeenCalledWith(
      expect.objectContaining({
        unreadMessagesCount: 2,
        unreadNotificationsCount: 3,
      }),
      {},
    );
    const screens = (TabsModule.Tabs.Screen as jest.Mock).mock.calls.map((call: any[]) => call[0]);
    expect(screens).toHaveLength(6);
    const visibleNames = screens.map((screen) => screen.name);
    expect(visibleNames).toEqual(['index', 'search', 'messages', 'notifications', 'profile', 'settings']);
  });

  it('uses default tint and badge counts when data is unavailable', () => {
    mockUseAuthStatus.mockReturnValue({ data: { isAuthenticated: true }, isLoading: false });
    mockUseUnreadMessagesCount.mockReturnValue({});
    mockUseUnreadNotificationsCount.mockReturnValue({});
    render(<TabLayout />);
    const TabsModule = require('expo-router');
    const tabOptions = TabsModule.Tabs.mock.calls[0][0];
    const tabBarProps = {
      state: { index: 0, routes: [{ key: 'index', name: 'index' }] },
      navigation: { emit: jest.fn(), navigate: jest.fn() },
      descriptors: {},
    } as any;
    act(() => {
      tabOptions.tabBar?.(tabBarProps);
    });
    expect(mockCustomTabBar).toHaveBeenCalledWith(
      expect.objectContaining({
        unreadMessagesCount: 0,
        unreadNotificationsCount: 0,
      }),
      {},
    );
  });

  it('opens the account switcher when the profile tab is long pressed', () => {
    mockUseAuthStatus.mockReturnValue({ data: { isAuthenticated: true }, isLoading: false });
    render(<TabLayout />);

    const TabsModule = require('expo-router');
    const tabOptions = TabsModule.Tabs.mock.calls[0][0];
    const tabBarProps = {
      state: { index: 0, routes: [{ key: 'index', name: 'index' }] },
      navigation: { emit: jest.fn(), navigate: jest.fn() },
      descriptors: {},
    } as any;

    act(() => {
      tabOptions.tabBar?.(tabBarProps);
    });

    const renderedProps = mockCustomTabBar.mock.calls.at(-1)?.[0];
    expect(typeof renderedProps?.onProfileLongPress).toBe('function');

    act(() => {
      renderedProps?.onProfileLongPress();
    });

    const latestCall = mockAccountSwitcherSheet.mock.calls.at(-1);
    expect(latestCall?.[0].visible).toBe(true);

    act(() => {
      latestCall?.[0].onClose();
    });

    const closeCall = mockAccountSwitcherSheet.mock.calls.at(-1);
    expect(closeCall?.[0].visible).toBe(false);
  });
});

