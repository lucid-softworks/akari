import { act, render } from '@testing-library/react-native';
import React from 'react';
import TabLayout from '@/app/(tabs)/_layout';
import { ActivityIndicator } from 'react-native';

import { useAuthStatus } from '@/hooks/queries/useAuthStatus';
import { useUnreadMessagesCount } from '@/hooks/queries/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '@/hooks/queries/useUnreadNotificationsCount';
import { useResponsive } from '@/hooks/useResponsive';
import { TabBadge } from '@/components/TabBadge';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useNavigationState } from '@react-navigation/native';
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

jest.mock('@react-navigation/native', () => ({
  useNavigationState: jest.fn(),
}));

jest.mock('@/hooks/queries/useAuthStatus');
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
const mockUseUnreadMessagesCount = useUnreadMessagesCount as jest.Mock;
const mockUseUnreadNotificationsCount = useUnreadNotificationsCount as jest.Mock;
const mockUseResponsive = useResponsive as jest.Mock;
const mockUseBorderColor = useBorderColor as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;
const mockTabBadge = TabBadge as unknown as jest.Mock;
const mockUseNavigationState = useNavigationState as jest.Mock;
const mockHandleTabPress = tabScrollRegistry.handleTabPress as jest.Mock;

const { HapticTab } = require('@/components/HapticTab');
const mockHapticTab = HapticTab as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseUnreadMessagesCount.mockReturnValue({ data: 0 });
  mockUseUnreadNotificationsCount.mockReturnValue({ data: 0 });
  mockUseResponsive.mockReturnValue({ isLargeScreen: false });
  mockUseBorderColor.mockReturnValue('#ccc');
  mockUseThemeColor.mockImplementation(
    (props: { light?: string; dark?: string }) => props?.light ?? props?.dark ?? '#000',
  );
  mockUseNavigationState.mockImplementation((selector: (state: any) => any) => {
    const defaultState = {
      index: 0,
      routes: [{ name: 'index' }],
    };
    return selector ? selector(defaultState) : defaultState;
  });
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
    expect(names).toEqual(['index', 'search', 'messages', 'notifications', 'bookmarks', 'profile', 'settings']);
  });

  it('renders mobile tabs with badges', () => {
    mockUseAuthStatus.mockReturnValue({ data: { isAuthenticated: true }, isLoading: false });
    mockUseResponsive.mockReturnValue({ isLargeScreen: false });
    mockUseUnreadMessagesCount.mockReturnValue({ data: 2 });
    mockUseUnreadNotificationsCount.mockReturnValue({ data: 3 });
    render(<TabLayout />);
    const TabsModule = require('expo-router');
    const screens = (TabsModule.Tabs.Screen as jest.Mock).mock.calls.map((call: any[]) => call[0]);
    const screensWithIcons = screens.filter((screen) => typeof screen.options?.tabBarIcon === 'function');
    const [indexOptions, searchOptions, messagesOptions, notificationsOptions, profileOptions, settingsOptions] =
      screensWithIcons.map((screen) => screen.options);
    // Invoke tabBarIcon functions to ensure badge rendering
    render(indexOptions.tabBarIcon({ color: 'red' }));
    render(searchOptions.tabBarIcon({ color: 'red' }));
    render(messagesOptions.tabBarIcon({ color: 'red' }));
    render(notificationsOptions.tabBarIcon({ color: 'red' }));
    render(profileOptions.tabBarIcon({ color: 'red' }));
    render(settingsOptions.tabBarIcon({ color: 'red' }));
    expect(mockTabBadge.mock.calls[0][0].count).toBe(2);
    expect(mockTabBadge.mock.calls[1][0].count).toBe(3);
    expect(TabsModule.Tabs.mock.calls[0][0].screenOptions.tabBarShowLabel).toBe(false);
    const names = (TabsModule.Tabs.Screen as jest.Mock).mock.calls.map((c: any[]) => c[0].name);
    expect(names).toEqual(['index', 'search', 'messages', 'notifications', 'bookmarks', 'profile', 'settings']);
  });

  it('uses default tint and badge counts when data is unavailable', () => {
    mockUseAuthStatus.mockReturnValue({ data: { isAuthenticated: true }, isLoading: false });
    mockUseUnreadMessagesCount.mockReturnValue({});
    mockUseUnreadNotificationsCount.mockReturnValue({});
    render(<TabLayout />);
    const TabsModule = require('expo-router');
    const screenOptions = TabsModule.Tabs.mock.calls[0][0].screenOptions;
    expect(screenOptions.tabBarActiveTintColor).toBe('#7C8CF9');
    const messagesOptions = (TabsModule.Tabs.Screen as jest.Mock).mock.calls[2][0].options;
    const notificationsOptions = (TabsModule.Tabs.Screen as jest.Mock).mock.calls[3][0].options;
    render(messagesOptions.tabBarIcon({ color: 'blue' }));
    render(notificationsOptions.tabBarIcon({ color: 'blue' }));
    expect(mockTabBadge.mock.calls[0][0].count).toBe(0);
    expect(mockTabBadge.mock.calls[1][0].count).toBe(0);
  });
});

describe('CustomTabButton', () => {
  const renderTabBarButton = () => {
    mockUseAuthStatus.mockReturnValue({ data: { isAuthenticated: true }, isLoading: false });
    render(<TabLayout />);
    const TabsModule = require('expo-router');
    const TabBarButton = TabsModule.Tabs.mock.calls[0][0].screenOptions.tabBarButton as React.ComponentType<any>;
    render(<TabBarButton />);
    return (mockHapticTab.mock.calls[0][0].onTabPress as () => void) ?? (() => {});
  };

  afterEach(() => {
    jest.useRealTimers();
  });

  it('triggers tab scroll when the same tab is pressed consecutively', () => {
    jest.useFakeTimers();
    const navigationState = {
      index: 0,
      routes: [{ name: 'messages' }],
    };
    mockUseNavigationState.mockImplementation((selector: (state: typeof navigationState) => any) =>
      selector(navigationState),
    );

    const onTabPress = renderTabBarButton();

    act(() => {
      onTabPress();
      jest.advanceTimersByTime(50);
    });
    expect(mockHandleTabPress).not.toHaveBeenCalled();

    act(() => {
      onTabPress();
      jest.advanceTimersByTime(50);
    });
    expect(mockHandleTabPress).toHaveBeenCalledTimes(1);
    expect(mockHandleTabPress).toHaveBeenCalledWith('messages');
  });

  it('updates the tracked tab without triggering scroll when switching tabs', () => {
    jest.useFakeTimers();
    const navigationState = {
      index: 0,
      routes: [{ name: 'messages' }, { name: 'settings' }],
    };
    mockUseNavigationState.mockImplementation((selector: (state: typeof navigationState) => any) =>
      selector(navigationState),
    );

    const onTabPress = renderTabBarButton();

    act(() => {
      onTabPress();
      jest.advanceTimersByTime(50);
    });
    expect(mockHandleTabPress).not.toHaveBeenCalled();

    navigationState.index = 1;

    act(() => {
      onTabPress();
      jest.advanceTimersByTime(50);
    });
    expect(mockHandleTabPress).not.toHaveBeenCalled();

    act(() => {
      onTabPress();
      jest.advanceTimersByTime(50);
    });
    expect(mockHandleTabPress).toHaveBeenCalledTimes(1);
    expect(mockHandleTabPress).toHaveBeenCalledWith('settings');
  });

  it('ignores presses when the current route cannot be determined', () => {
    jest.useFakeTimers();
    const navigationState = {
      index: 2,
      routes: [{ name: 'messages' }],
    };
    mockUseNavigationState.mockImplementation((selector: (state: typeof navigationState) => any) =>
      selector(navigationState),
    );

    const onTabPress = renderTabBarButton();

    act(() => {
      onTabPress();
      jest.advanceTimersByTime(100);
    });

    expect(mockHandleTabPress).not.toHaveBeenCalled();
  });
});

