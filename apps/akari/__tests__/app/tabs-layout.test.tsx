import { act, render } from '@testing-library/react-native';
import React from 'react';
import TabLayout from '@/app/(tabs)/_layout';
import { ActivityIndicator } from 'react-native';

import { useAuthStatus } from '@/hooks/queries/useAuthStatus';
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
jest.mock('@/hooks/useResponsive');
jest.mock('@/hooks/useBorderColor');
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/usePushNotifications');

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

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return ({ name, color, size }: any) => (
    <Text name={name} color={color} size={size}>
      {name}
    </Text>
  );
});

jest.mock('@/utils/tabScrollRegistry', () => ({
  tabScrollRegistry: {
    handleTabPress: jest.fn(),
  },
}));

const mockUseAuthStatus = useAuthStatus as jest.Mock;
const mockUseResponsive = useResponsive as jest.Mock;
const mockUseBorderColor = useBorderColor as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;
const { tabScrollRegistry } = require('@/utils/tabScrollRegistry');
const mockHandleTabPress = tabScrollRegistry.handleTabPress as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseResponsive.mockReturnValue({ isLargeScreen: false });
  mockUseBorderColor.mockReturnValue('#ccc');
  mockUseThemeColor.mockImplementation(
    (props: { light?: string; dark?: string }) => props?.light ?? props?.dark ?? '#000',
  );
  mockHandleTabPress.mockClear();
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
    const screenProps = (require('expo-router').Tabs.Screen as jest.Mock).mock.calls.map(
      (call: any[]) => call[0],
    );
    const visibleScreens = screenProps.filter((screen: any) => screen.options?.tabBarAccessibilityLabel);

    expect(visibleScreens.map((screen: any) => screen.name)).toEqual([
      'index',
      'search',
      'messages',
      'notifications',
      'profile',
      'settings',
    ]);
  });

  it('renders mobile tabs with native tab bar configuration', () => {
    mockUseAuthStatus.mockReturnValue({ data: { isAuthenticated: true }, isLoading: false });
    mockUseResponsive.mockReturnValue({ isLargeScreen: false });
    render(<TabLayout />);
    const TabsModule = require('expo-router');
    const tabOptions = TabsModule.Tabs.mock.calls[0][0];
    expect(tabOptions).toMatchObject({
      screenOptions: expect.objectContaining({
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#7C8CF9',
        tabBarInactiveTintColor: '#6B7280',
      }),
    });
    const screens = (TabsModule.Tabs.Screen as jest.Mock).mock.calls.map((call: any[]) => call[0]);
    const visibleScreens = screens.filter((screen: any) => screen.options?.tabBarAccessibilityLabel);

    expect(visibleScreens.map((screen: any) => screen.name)).toEqual([
      'index',
      'search',
      'messages',
      'notifications',
      'profile',
      'settings',
    ]);

    const homeScreen = visibleScreens.find((screen: any) => screen.name === 'index');
    expect(typeof homeScreen?.options?.tabBarIcon).toBe('function');
    const renderedIcon = homeScreen?.options?.tabBarIcon?.({ color: '#fff', size: 20 });
    expect(React.isValidElement(renderedIcon)).toBe(true);
    expect(renderedIcon?.props.name).toBe('home');
    expect(renderedIcon?.props.color).toBe('#fff');
    expect(renderedIcon?.props.size).toBe(20);
  });

  it('uses default tint colors when theme hooks return fallbacks', () => {
    mockUseAuthStatus.mockReturnValue({ data: { isAuthenticated: true }, isLoading: false });
    render(<TabLayout />);
    const TabsModule = require('expo-router');
    const tabOptions = TabsModule.Tabs.mock.calls[0][0];
    expect(tabOptions.screenOptions.tabBarInactiveTintColor).toBe('#6B7280');
  });

  it('emits scroll-to-top events when a tab is pressed twice', () => {
    mockUseAuthStatus.mockReturnValue({ data: { isAuthenticated: true }, isLoading: false });
    render(<TabLayout />);

    const TabsModule = require('expo-router');
    const screens = (TabsModule.Tabs.Screen as jest.Mock).mock.calls
      .map((call: any[]) => call[0])
      .filter((screen: any) => screen.options?.tabBarAccessibilityLabel);
    const homeScreen = screens.find((screen: any) => screen.name === 'index');
    expect(homeScreen).toBeTruthy();

    const navigation = {
      getState: jest
        .fn()
        .mockReturnValue({
          routeNames: ['index', 'search', 'messages', 'notifications', 'profile', 'settings'],
          index: 0,
        }),
    } as any;

    const listeners = homeScreen?.listeners?.({ navigation });
    listeners?.tabPress?.({} as any);
    listeners?.tabPress?.({} as any);

    expect(mockHandleTabPress).toHaveBeenCalledWith('index');
    expect(mockHandleTabPress).toHaveBeenCalledTimes(1);
  });
});

