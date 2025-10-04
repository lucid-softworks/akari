import { act, render } from '@testing-library/react-native';
import React from 'react';
import TabLayout from '@/app/(tabs)/_layout';
import { ActivityIndicator } from 'react-native';

import { useAuthStatus } from '@/hooks/queries/useAuthStatus';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useUnreadMessagesCount } from '@/hooks/queries/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '@/hooks/queries/useUnreadNotificationsCount';
import { useResponsive } from '@/hooks/useResponsive';
import { TabBadge } from '@/components/TabBadge';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';

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

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(),
}));

jest.mock('@/hooks/queries/useAuthStatus');
jest.mock('@/hooks/queries/useCurrentAccount');
jest.mock('@/hooks/queries/useUnreadMessagesCount');
jest.mock('@/hooks/queries/useUnreadNotificationsCount');
jest.mock('@/hooks/useResponsive');
jest.mock('@/hooks/useBorderColor');
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/usePushNotifications');

jest.mock('@/components/HapticTab', () => {
  const React = require('react');
  const MockHapticTab = jest.fn(({ children }: { children?: React.ReactNode }) => <>{children}</>);
  return { HapticTab: MockHapticTab };
});

jest.mock('@/components/AccountSwitcherSheet', () => {
  const React = require('react');
  return { AccountSwitcherSheet: jest.fn(() => null) };
});

jest.mock('@/components/Sidebar', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Sidebar: () => <Text>Sidebar</Text> };
});

jest.mock('@/components/TabBadge', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { TabBadge: jest.fn(({ count }: { count: number }) => <Text>badge{count}</Text>) };
});

jest.mock('@/components/ThemedView', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { ThemedView: ({ children, ...props }: any) => <View {...props}>{children}</View> };
});

jest.mock('@/components/ui/IconSymbol', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { IconSymbol: ({ name }: { name: string }) => <Text>{name}</Text> };
});

jest.mock('@/components/ui/TabBarBackground', () => {
  const React = require('react');
  return () => <></>;
});

jest.mock('@/utils/tabScrollRegistry', () => ({
  tabScrollRegistry: {
    handleTabPress: jest.fn(),
  },
}));

const mockUseAuthStatus = useAuthStatus as jest.Mock;
const mockUseCurrentAccount = useCurrentAccount as jest.Mock;
const mockUseUnreadMessagesCount = useUnreadMessagesCount as jest.Mock;
const mockUseUnreadNotificationsCount = useUnreadNotificationsCount as jest.Mock;
const mockUseResponsive = useResponsive as jest.Mock;
const mockUseBorderColor = useBorderColor as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;
const mockTabBadge = TabBadge as unknown as jest.Mock;
const mockUseSafeAreaInsets = useSafeAreaInsets as jest.Mock;
const mockHandleTabPress = tabScrollRegistry.handleTabPress as jest.Mock;

const { HapticTab } = require('@/components/HapticTab');
const mockHapticTab = HapticTab as jest.Mock;
const { AccountSwitcherSheet } = require('@/components/AccountSwitcherSheet');
const mockAccountSwitcherSheet = AccountSwitcherSheet as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCurrentAccount.mockReturnValue({
    data: {
      did: 'did:plc:test',
      handle: 'test.user',
      displayName: 'Test User',
      avatar: 'https://avatar.test/img.png',
    },
  });
  mockUseUnreadMessagesCount.mockReturnValue({ data: 0 });
  mockUseUnreadNotificationsCount.mockReturnValue({ data: 0 });
  mockUseResponsive.mockReturnValue({ isLargeScreen: false });
  mockUseBorderColor.mockReturnValue('#ccc');
  mockUseThemeColor.mockImplementation(
    (props: { light?: string; dark?: string }) => props?.light ?? props?.dark ?? '#000',
  );
  mockUseSafeAreaInsets.mockReturnValue({ top: 0, right: 0, bottom: 0, left: 0 });
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
    const names = (require('expo-router').Tabs.Screen as jest.Mock).mock.calls.map((c: any[]) => c[0].name);
    expect(names).toEqual([
      'index',
      'search',
      'messages',
      'notifications',
      'bookmarks',
      'profile',
      'settings',
    ]);
  });

  it('renders mobile tabs with badges', () => {
    mockUseAuthStatus.mockReturnValue({ data: { isAuthenticated: true }, isLoading: false });
    mockUseResponsive.mockReturnValue({ isLargeScreen: false });
    mockUseUnreadMessagesCount.mockReturnValue({ data: 2 });
    mockUseUnreadNotificationsCount.mockReturnValue({ data: 3 });
    render(<TabLayout />);
    const TabsModule = require('expo-router');
    const tabBar = TabsModule.Tabs.mock.calls[0][0].tabBar as (props: any) => React.ReactNode;
    expect(typeof tabBar).toBe('function');

    const navigation = {
      emit: jest.fn(() => ({ defaultPrevented: false })),
      navigate: jest.fn(),
    };

    const state = {
      index: 0,
      routes: [
        { key: 'index-tab', name: 'index' },
        { key: 'search-tab', name: 'search' },
        { key: 'messages-tab', name: 'messages' },
        { key: 'notifications-tab', name: 'notifications' },
        { key: 'bookmarks-tab', name: 'bookmarks' },
        { key: 'profile-tab', name: 'profile' },
        { key: 'settings-tab', name: 'settings' },
      ],
    };

    render(
      tabBar({
        state,
        navigation,
        descriptors: {},
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      } as any),
    );

    expect(mockTabBadge.mock.calls[0][0].count).toBe(2);
    expect(mockTabBadge.mock.calls[1][0].count).toBe(3);
    const names = (TabsModule.Tabs.Screen as jest.Mock).mock.calls.map((c: any[]) => c[0].name);
    expect(names).toEqual([
      'index',
      'search',
      'messages',
      'notifications',
      'bookmarks',
      'profile',
      'settings',
    ]);
  });

  it('uses default tint and badge counts when data is unavailable', () => {
    mockUseAuthStatus.mockReturnValue({ data: { isAuthenticated: true }, isLoading: false });
    mockUseUnreadMessagesCount.mockReturnValue({});
    mockUseUnreadNotificationsCount.mockReturnValue({});
    render(<TabLayout />);
    const TabsModule = require('expo-router');
    const tabBar = TabsModule.Tabs.mock.calls[0][0].tabBar as (props: any) => React.ReactNode;
    const navigation = {
      emit: jest.fn(() => ({ defaultPrevented: false })),
      navigate: jest.fn(),
    };
    const state = {
      index: 0,
      routes: [
        { key: 'index-tab', name: 'index' },
        { key: 'search-tab', name: 'search' },
        { key: 'messages-tab', name: 'messages' },
        { key: 'notifications-tab', name: 'notifications' },
        { key: 'bookmarks-tab', name: 'bookmarks' },
        { key: 'profile-tab', name: 'profile' },
        { key: 'settings-tab', name: 'settings' },
      ],
    };

    render(
      tabBar({
        state,
        navigation,
        descriptors: {},
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      } as any),
    );

    expect(mockTabBadge.mock.calls[0][0].count).toBe(0);
    expect(mockTabBadge.mock.calls[1][0].count).toBe(0);
  });

  it('opens the account switcher when the profile tab is long pressed', () => {
    mockUseAuthStatus.mockReturnValue({ data: { isAuthenticated: true }, isLoading: false });
    render(<TabLayout />);

    const TabsModule = require('expo-router');
    const screenCalls = (TabsModule.Tabs.Screen as jest.Mock).mock.calls;
    const profileScreenCall = screenCalls.find((call: any[]) => call[0].name === 'profile');
    expect(profileScreenCall).toBeTruthy();

    const listeners = profileScreenCall?.[0].listeners;
    expect(typeof listeners).toBe('function');

    const preventDefault = jest.fn();

    act(() => {
      listeners?.({} as any).tabLongPress?.({ preventDefault } as any);
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(mockAccountSwitcherSheet.mock.calls.length).toBeGreaterThanOrEqual(2);
    const latestCall = mockAccountSwitcherSheet.mock.calls.at(-1);
    expect(latestCall?.[0].visible).toBe(true);

    act(() => {
      latestCall?.[0].onClose();
    });

    const closeCall = mockAccountSwitcherSheet.mock.calls.at(-1);
    expect(closeCall?.[0].visible).toBe(false);
  });
});

describe('HardcodedTabBar interactions', () => {
  const buildState = () => ({
    index: 0,
    routes: [
      { key: 'index-tab', name: 'index' },
      { key: 'search-tab', name: 'search' },
      { key: 'messages-tab', name: 'messages' },
      { key: 'notifications-tab', name: 'notifications' },
      { key: 'bookmarks-tab', name: 'bookmarks' },
      { key: 'profile-tab', name: 'profile' },
      { key: 'settings-tab', name: 'settings' },
    ],
  });

  const renderTabBar = () => {
    mockUseAuthStatus.mockReturnValue({ data: { isAuthenticated: true }, isLoading: false });
    render(<TabLayout />);
    const TabsModule = require('expo-router');
    const tabBar = TabsModule.Tabs.mock.calls[0][0].tabBar as (props: any) => React.ReactNode;
    const navigation = {
      emit: jest.fn(() => ({ defaultPrevented: false })),
      navigate: jest.fn(),
    };
    const state = buildState();
    render(
      tabBar({
        state,
        navigation,
        descriptors: {},
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      } as any),
    );
    return { navigation, state };
  };

  it('triggers tab scroll when the active tab is pressed', () => {
    const { navigation } = renderTabBar();
    const onPress = mockHapticTab.mock.calls[0][0].onPress as () => void;

    act(() => {
      onPress();
    });

    expect(mockHandleTabPress).toHaveBeenCalledTimes(1);
    expect(mockHandleTabPress).toHaveBeenCalledWith('index');
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('navigates to a different tab when pressed', () => {
    const { navigation } = renderTabBar();
    const onPress = mockHapticTab.mock.calls[1][0].onPress as () => void;

    act(() => {
      onPress();
    });

    expect(navigation.emit).toHaveBeenCalledWith({
      type: 'tabPress',
      target: 'search-tab',
      canPreventDefault: true,
    });
    expect(navigation.navigate).toHaveBeenCalledWith('search');
    expect(mockHandleTabPress).not.toHaveBeenCalled();
  });

  it('emits tabLongPress events', () => {
    const { navigation } = renderTabBar();
    const onLongPress = mockHapticTab.mock.calls[4][0].onLongPress as () => void;

    act(() => {
      onLongPress();
    });

    expect(navigation.emit).toHaveBeenCalledWith({
      type: 'tabLongPress',
      target: 'profile-tab',
    });
  });
});

