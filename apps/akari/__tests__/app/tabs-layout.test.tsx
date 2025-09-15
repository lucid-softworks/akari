import { render } from '@testing-library/react-native';
import React from 'react';
import TabLayout from '@/app/(tabs)/_layout';
import { ActivityIndicator } from 'react-native';

import { useAuthStatus } from '@/hooks/queries/useAuthStatus';
import { useUnreadMessagesCount } from '@/hooks/queries/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '@/hooks/queries/useUnreadNotificationsCount';
import { useResponsive } from '@/hooks/useResponsive';
import { useColorScheme } from '@/hooks/useColorScheme';
import { TabBadge } from '@/components/TabBadge';

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
jest.mock('@/hooks/useColorScheme');
jest.mock('@/hooks/usePushNotifications');

jest.mock('@/components/HapticTab', () => {
  const React = require('react');
  return { HapticTab: ({ children }: { children: React.ReactNode }) => <>{children}</> };
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

const mockUseAuthStatus = useAuthStatus as jest.Mock;
const mockUseUnreadMessagesCount = useUnreadMessagesCount as jest.Mock;
const mockUseUnreadNotificationsCount = useUnreadNotificationsCount as jest.Mock;
const mockUseResponsive = useResponsive as jest.Mock;
const mockUseColorScheme = useColorScheme as jest.Mock;
const mockTabBadge = TabBadge as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseColorScheme.mockReturnValue('light');
  mockUseUnreadMessagesCount.mockReturnValue({ data: 0 });
  mockUseUnreadNotificationsCount.mockReturnValue({ data: 0 });
  mockUseResponsive.mockReturnValue({ isLargeScreen: false });
});

describe('TabLayout', () => {
  it('shows loading indicator while auth status is loading', () => {
    mockUseAuthStatus.mockReturnValue({ data: null, isLoading: true });
    const { UNSAFE_getByType } = render(<TabLayout />);
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
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
    expect(names).toEqual(['index', 'search', 'messages', 'notifications', 'profile', 'settings']);
  });

  it('renders mobile tabs with badges', () => {
    mockUseAuthStatus.mockReturnValue({ data: { isAuthenticated: true }, isLoading: false });
    mockUseResponsive.mockReturnValue({ isLargeScreen: false });
    mockUseUnreadMessagesCount.mockReturnValue({ data: 2 });
    mockUseUnreadNotificationsCount.mockReturnValue({ data: 3 });
    render(<TabLayout />);
    const TabsModule = require('expo-router');
    // Invoke tabBarIcon functions to ensure badge rendering
    const messagesOptions = (TabsModule.Tabs.Screen as jest.Mock).mock.calls[2][0].options;
    const notificationsOptions = (TabsModule.Tabs.Screen as jest.Mock).mock.calls[3][0].options;
    render(messagesOptions.tabBarIcon({ color: 'red' }));
    render(notificationsOptions.tabBarIcon({ color: 'red' }));
    expect(mockTabBadge.mock.calls[0][0].count).toBe(2);
    expect(mockTabBadge.mock.calls[1][0].count).toBe(3);
    expect(TabsModule.Tabs.mock.calls[0][0].screenOptions.tabBarShowLabel).toBe(false);
    const names = (TabsModule.Tabs.Screen as jest.Mock).mock.calls.map((c: any[]) => c[0].name);
    expect(names).toEqual(['index', 'search', 'messages', 'notifications', 'profile', 'settings']);
  });
});

